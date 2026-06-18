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
