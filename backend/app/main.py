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

# Catálogo estándar de esquemas de ejes/llantas (referencia de la industria del
# transporte de carga). `layout` = cantidad de llantas por cada eje, en orden.
ESQUEMAS_VEHICULO_SEED = """
                ('esq1_2', '2 Ejes, 4 llantas tracción 4 Ruedas (4WD)', 2, '[2, 2]'::json, false, 0, true, now(), now()),
                ('esq1', '2 Ejes, 4 llantas tracción delantera (FWD)', 2, '[2, 2]'::json, false, 0, true, now(), now()),
                ('esq1_1', '2 Ejes, 4 llantas tracción trasera (RWD)', 2, '[2, 2]'::json, false, 0, true, now(), now()),
                ('esq1_3', '2 Ejes, 4 llantas, tracción delantera, dirección trasera', 2, '[2, 2]'::json, false, 0, true, now(), now()),
                ('esq2', '2 Ejes, 6 Llantas', 2, '[2, 4]'::json, false, 0, true, now(), now()),
                ('esq38', '2 Ejes, 6 llantas dirección trasera', 2, '[4, 2]'::json, false, 0, true, now(), now()),
                ('esq4', '3 Ejes, 10 Llantas', 3, '[2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq3', '3 Ejes, 6 Llantas', 3, '[2, 2, 2]'::json, false, 0, true, now(), now()),
                ('esq35', '3 Ejes, 8 Llantas', 3, '[2, 2, 4]'::json, false, 0, true, now(), now()),
                ('esq28', '5 ejes 10 llantas', 5, '[2, 2, 2, 2, 2]'::json, false, 0, true, now(), now()),
                ('esq26', 'Articulado 3 ejes 10 llantas', 3, '[2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq27', 'Biarticulado 4 ejes 14 llantas', 4, '[2, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq31', 'Bus 3 ejes, 8 Llantas', 3, '[2, 2, 4]'::json, false, 0, true, now(), now()),
                ('esq52', 'Bus 4 ejes, 10 llantas', 4, '[2, 2, 2, 4]'::json, false, 0, true, now(), now()),
                ('esq47', 'Cabezote 2 Ejes + Trailer 2 Ejes + Trailer 2 Ejes + Trailer 2 Ejes, 30 llantas', 8, '[2, 4, 4, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq42', 'Cabezote 2 Ejes + Trailer 2 Ejes, 10 llantas', 4, '[2, 2, 2, 4]'::json, false, 0, true, now(), now()),
                ('esq10', 'Cabezote 2 Ejes + Trailer 2 Ejes, 14 llantas', 4, '[2, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq11', 'Cabezote 2 Ejes + Trailer 3 Ejes, 18 llantas', 5, '[2, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq48', 'Cabezote 3 Ejes + Trailer 2 Ejes + Trailer 2 Ejes + Trailer 2 Ejes, 34 llantas', 9, '[2, 4, 4, 4, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq18', 'Cabezote 3 Ejes + Trailer 2 Ejes, 14 llantas', 5, '[2, 3, 3, 3, 3]'::json, false, 0, true, now(), now()),
                ('esq8', 'Cabezote 3 Ejes + Trailer 2 Ejes, 18 llantas', 5, '[2, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq20', 'Cabezote 3 Ejes + Trailer 3 Ejes, 16 llantas', 6, '[2, 2, 2, 2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq9', 'Cabezote 3 Ejes + Trailer 3 Ejes, 22 llantas', 6, '[2, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq17', 'Cabezote 3 Ejes + Trailer 4 Ejes, 26 llantas', 7, '[2, 4, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq45', 'Cabezote 3 Ejes + Trailer 5 Ejes, 30 llantas', 8, '[2, 4, 4, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq43', 'Cabezote 3 Ejes + Trailer 6 Ejes, 34 llantas', 9, '[2, 4, 4, 4, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq44', 'Cabezote 3 ejes, 8 llantas', 3, '[2, 2, 4]'::json, false, 0, true, now(), now()),
                ('esq7', 'Cuatro Direccionales 4 Ejes, 12 Llantas', 4, '[2, 2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq41', 'Grúa 4 ejes, 8 llantas', 4, '[2, 2, 2, 2]'::json, false, 0, true, now(), now()),
                ('esq49', 'Grúa 5 ejes, 14 llantas', 5, '[2, 2, 2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq50', 'Grúa 6 ejes, 18 llantas', 6, '[2, 2, 2, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq22', 'Mixer 4 Ejes, 12 Llantas', 4, '[2, 2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq23', 'Mixer 4 Ejes, 14 Llantas', 4, '[2, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq12', 'Moto 2 Ejes, 2 llantas', 2, '[1, 1]'::json, false, 0, true, now(), now()),
                ('esq14', 'Moto 2 Ejes, 3 llantas', 2, '[1, 2]'::json, false, 0, true, now(), now()),
                ('esq40', 'Moto 2 Ejes, 5 llantas', 2, '[1, 4]'::json, false, 0, true, now(), now()),
                ('esq24', 'Trailer 1 Eje, 4 Llantas', 1, '[4]'::json, false, 0, true, now(), now()),
                ('esq32', 'Trailer 2 ejes, 16 Llantas', 2, '[8, 8]'::json, false, 0, true, now(), now()),
                ('esq15', 'Trailer 2 Ejes, 4 Llantas', 2, '[2, 2]'::json, false, 0, true, now(), now()),
                ('esq5', 'Trailer 2 Ejes, 8 Llantas', 2, '[4, 4]'::json, false, 0, true, now(), now()),
                ('esq51', 'Trailer 3 Ejes, 10 Llantas', 3, '[2, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq6', 'Trailer 3 Ejes, 12 Llantas', 3, '[4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq33', 'Trailer 3 ejes, 24 Llantas', 3, '[8, 8, 8]'::json, false, 0, true, now(), now()),
                ('esq16', 'Trailer 3 Ejes, 6 Llantas', 3, '[2, 2, 2]'::json, false, 0, true, now(), now()),
                ('esq13', 'Trailer 4 Ejes 16 llantas', 4, '[4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq25', 'Trailer 4 Ejes 32 llantas', 4, '[8, 8, 8, 8]'::json, false, 0, true, now(), now()),
                ('esq46', 'Trailer 5 Ejes 20 llantas', 5, '[4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq34', 'Trailer 6 ejes, 48 Llantas', 6, '[8, 8, 8, 8, 8, 8]'::json, false, 0, true, now(), now()),
                ('esq29', 'Trailer Cama Baja 5 Ejes, 20 Llantas', 5, '[4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq30', 'Trailer Cama Baja 6 Ejes, 24 Llantas', 6, '[4, 4, 4, 4, 4, 4]'::json, false, 0, true, now(), now()),
                ('esq19', 'Tranvía de 6 ejes, 12 llantas', 6, '[2, 2, 2, 2, 2, 2]'::json, false, 0, true, now(), now()),
                ('esq21', 'Vibrocompactador, Rodillo frontal 2 ruedas traseras', 1, '[2]'::json, false, 0, true, now(), now())
"""


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
        await conn.execute(text(
            "ALTER TABLE eam_neumatico ADD COLUMN IF NOT EXISTS es_usada BOOLEAN DEFAULT false"
        ))
        # Catálogo jerárquico de llantas/bandas: las marcas, dimensiones y
        # referencias que ya estaban escritas a mano en los registros existentes
        # se suben al catálogo para no perder nada al pasar a listas cerradas.
        await conn.execute(text("""
            INSERT INTO eam_marca_neumatico (nombre, ambito, activo, created_at, updated_at)
            SELECT DISTINCT TRIM(marca), 'LLANTA', true, now(), now()
            FROM eam_neumatico WHERE marca IS NOT NULL AND TRIM(marca) <> ''
            ON CONFLICT (nombre, ambito) DO NOTHING
        """))
        await conn.execute(text("""
            INSERT INTO eam_dimension_neumatico (nombre, ambito, activo, created_at, updated_at)
            SELECT DISTINCT TRIM(medida), 'LLANTA', true, now(), now()
            FROM eam_neumatico WHERE medida IS NOT NULL AND TRIM(medida) <> ''
            ON CONFLICT (nombre, ambito) DO NOTHING
        """))
        await conn.execute(text("""
            INSERT INTO eam_referencia_neumatico (marca_id, nombre, ambito, activo, created_at, updated_at)
            SELECT DISTINCT m.id, TRIM(n.referencia), 'LLANTA', true, now(), now()
            FROM eam_neumatico n
            JOIN eam_marca_neumatico m ON m.nombre = TRIM(n.marca) AND m.ambito = 'LLANTA'
            WHERE n.referencia IS NOT NULL AND TRIM(n.referencia) <> ''
            ON CONFLICT (marca_id, nombre) DO NOTHING
        """))
        # Profundidad inicial por referencia+dimensión, tomada de lo ya registrado
        await conn.execute(text("""
            INSERT INTO eam_referencia_dimension (referencia_id, dimension_id, profundidad_inicial, activo, created_at, updated_at)
            SELECT DISTINCT ON (r.id, d.id) r.id, d.id, n."profundidad_diseño", true, now(), now()
            FROM eam_neumatico n
            JOIN eam_marca_neumatico m ON m.nombre = TRIM(n.marca) AND m.ambito = 'LLANTA'
            JOIN eam_referencia_neumatico r ON r.marca_id = m.id AND r.nombre = TRIM(n.referencia)
            JOIN eam_dimension_neumatico d ON d.nombre = TRIM(n.medida) AND d.ambito = 'LLANTA'
            WHERE n."profundidad_diseño" IS NOT NULL
            ON CONFLICT (referencia_id, dimension_id) DO NOTHING
        """))
        # Mismo criterio para las bandas de reencauche ya registradas
        await conn.execute(text("""
            INSERT INTO eam_marca_neumatico (nombre, ambito, activo, created_at, updated_at)
            SELECT DISTINCT TRIM(marca), 'BANDA', true, now(), now()
            FROM eam_banda_reencauche WHERE marca IS NOT NULL AND TRIM(marca) <> ''
            ON CONFLICT (nombre, ambito) DO NOTHING
        """))
        await conn.execute(text("""
            INSERT INTO eam_dimension_neumatico (nombre, ambito, activo, created_at, updated_at)
            SELECT DISTINCT TRIM(dimension), 'BANDA', true, now(), now()
            FROM eam_banda_reencauche WHERE dimension IS NOT NULL AND TRIM(dimension) <> ''
            ON CONFLICT (nombre, ambito) DO NOTHING
        """))
        # Configuración de llantas por eje (no solo un número global de ejes):
        # cuántas llantas trae cada eje individual, para representar vehículos
        # reales que no siguen el patrón simple "eje1=2, resto=4" (uniformes,
        # combos cabezote+trailer, motos, etc.)
        await conn.execute(text(
            "ALTER TABLE eam_esquema_vehiculo ADD COLUMN IF NOT EXISTS codigo VARCHAR(30)"
        ))
        await conn.execute(text(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_eam_esquema_vehiculo_codigo') THEN "
            "ALTER TABLE eam_esquema_vehiculo ADD CONSTRAINT uq_eam_esquema_vehiculo_codigo UNIQUE (codigo); "
            "END IF; END $$;"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_esquema_vehiculo ADD COLUMN IF NOT EXISTS layout JSON"
        ))
        await conn.execute(text(
            "ALTER TABLE eam_activo ADD COLUMN IF NOT EXISTS layout_llantas JSON"
        ))
        # Catálogo estándar de esquemas de ejes/llantas (referencia de la industria
        # de transporte: uniformes, camiones con eje direccional simple + ejes
        # duales, combos cabezote+trailer, motos, trailers especializados). Los
        # arreglos `layout` son la cantidad de llantas por cada eje, en orden.
        await conn.execute(text(f"""
            INSERT INTO eam_esquema_vehiculo
                (codigo, nombre, numero_ejes, layout, tiene_repuesto, cantidad_repuestos, activo, created_at, updated_at)
            VALUES
{ESQUEMAS_VEHICULO_SEED}
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
