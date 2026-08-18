from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
import os
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router
import app.infrastructure.models  # noqa: F401 — registra todos los modelos
from app.infrastructure.models.rol import Rol, ROLES_DEFECTO
from app.infrastructure.models.usuario import Usuario


async def _seed_roles_and_migrate(db: AsyncSession) -> None:
    # Sembrar roles por defecto si la tabla está vacía
    existing = await db.execute(select(Rol))
    if not existing.scalars().first():
        for r in ROLES_DEFECTO:
            db.add(Rol(**r))
        await db.flush()

    # Construir mapa nombre → id
    roles_result = await db.execute(select(Rol))
    roles_map = {r.nombre: r.id for r in roles_result.scalars().all()}

    # Asignar rol_id a usuarios que aún no lo tienen
    users_result = await db.execute(
        select(Usuario).where(Usuario.rol_id == None, Usuario.activo == True)  # noqa: E711
    )
    for user in users_result.scalars().all():
        enum_name = user.rol.value if user.rol else "CONSULTA"
        if enum_name in roles_map:
            user.rol_id = roles_map[enum_name]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Crear tablas nuevas (incluye la tabla 'roles')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Añadir columna rol_id a usuarios si no existe (safe para BD existentes)
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE usuarios "
            "ADD COLUMN IF NOT EXISTS rol_id INTEGER "
            "REFERENCES roles(id) ON DELETE SET NULL"
        ))
        # Añadir usuario_id a conductores para linkear con login de conductor
        await conn.execute(text(
            "ALTER TABLE conductores "
            "ADD COLUMN IF NOT EXISTS usuario_id INTEGER "
            "REFERENCES usuarios(id) ON DELETE SET NULL"
        ))
        # Catálogos nuevos de llantas: zona, motivo de fin de vida y banda de reencauche
        await conn.execute(text(
            "ALTER TABLE eam_neumatico "
            "ADD COLUMN IF NOT EXISTS zona_id INTEGER "
            "REFERENCES eam_zona_neumatico(id) ON DELETE SET NULL"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_neumatico "
            "ADD COLUMN IF NOT EXISTS motivo_fin_vida_id INTEGER "
            "REFERENCES eam_motivo_fin_vida(id) ON DELETE SET NULL"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_neumatico ADD COLUMN IF NOT EXISTS dot VARCHAR(20)"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_neumatico ADD COLUMN IF NOT EXISTS tipo_rin VARCHAR(30)"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_reencauche_detalle "
            "ADD COLUMN IF NOT EXISTS banda_id INTEGER "
            "REFERENCES eam_banda_reencauche(id) ON DELETE SET NULL"
        ))
        # Jerarquía de activos que usan llantas: cantidad de repuestos en el activo
        # (ya existía numero_ejes/tiene_repuesto) + trazabilidad de espejo cuando
        # el vehículo se creó originalmente en TMS/Flota y se vinculó al CMMS.
        await conn.execute(text(
            "ALTER TABLE eam_activo ADD COLUMN IF NOT EXISTS cantidad_repuestos INTEGER DEFAULT 1"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_activo ADD COLUMN IF NOT EXISTS origen VARCHAR(20) DEFAULT 'EAM'"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_activo ADD COLUMN IF NOT EXISTS origen_id INTEGER"
        ))
        # Catálogo de tipos de activo (jerarquía: qué tipos usan llantas y por lo
        # tanto aparecen como vehículo seleccionable en el módulo de Neumáticos).
        await conn.execute(text("""
            INSERT INTO eam_tipo_activo (codigo, nombre, usa_llantas, activo, created_at, updated_at)
            VALUES
                ('VEHICULO', 'Vehículo', true, true, now(), now()),
                ('REMOLQUE', 'Remolque', true, true, now(), now()),
                ('MOTOCICLETA', 'Motocicleta', true, true, now(), now()),
                ('MONTACARGAS', 'Montacargas', true, true, now(), now()),
                ('EQUIPO_PATIO', 'Equipo de patio', true, true, now(), now()),
                ('EQUIPO_LOGISTICO', 'Equipo logístico', false, true, now(), now()),
                ('MAQUINARIA', 'Maquinaria', false, true, now(), now()),
                ('INFRAESTRUCTURA', 'Infraestructura', false, true, now(), now()),
                ('BODEGA', 'Bodega', false, true, now(), now()),
                ('EDIFICACION', 'Edificación', false, true, now(), now()),
                ('EQUIPO_TECNOLOGICO', 'Equipo tecnológico', false, true, now(), now()),
                ('EQUIPO_INDUSTRIAL', 'Equipo industrial', false, true, now(), now()),
                ('HERRAMIENTA', 'Herramienta', false, true, now(), now()),
                ('ACTIVO_CRITICO', 'Activo crítico', false, true, now(), now()),
                ('OTRO', 'Otro', false, true, now(), now())
            ON CONFLICT (codigo) DO NOTHING
        """))

    # 3. Sembrar roles y migrar usuarios
    async with AsyncSession(engine) as db:
        async with db.begin():
            await _seed_roles_and_migrate(db)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Plataforma avanzada de gestión, control y trazabilidad de estibas (pallets)",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION, "service": settings.PROJECT_NAME}
