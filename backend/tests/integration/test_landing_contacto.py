"""Pruebas del formulario de contacto de la landing y de la vista de prospectos.

Es la única escritura pública de la API, así que lo que se prueba es sobre todo
lo que debe rechazar: campos faltantes, textos desmedidos, el robot que llena el
campo trampa y la misma conexión enviando en serie. Y del lado de la consola,
que solo quien tiene el permiso ve y mueve las solicitudes.

Se corre contra un PostgreSQL de verdad, como el resto de las de integración:

    URL_PRUEBAS=postgresql+asyncpg://... pytest tests/integration/test_landing_contacto.py
"""
import os
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.main  # noqa: F401 — carga el grafo de modelos completo, como producción
from app.api.v1.endpoints.landing import (
    ENVIOS_POR_IP, SolicitudContacto, recibir_contacto,
)
from app.api.v1.endpoints.soporte import (
    CambioProspecto, cambiar_estado_prospecto, prospectos,
)
from app.core.database import Base
from app.core.permisos_consola import Miembro, exigir
from app.core.roles_consola import permisos_de
from app.infrastructure.models.plataforma import PlataformaCliente
from app.infrastructure.models.prospecto import LandingProspecto
from app.infrastructure.models.soporte import SoporteTicket

URL = os.environ["URL_PRUEBAS"]


# ─── Montaje ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def motor():
    mot = create_async_engine(URL, echo=False)
    async with mot.begin() as cx:
        await cx.run_sync(Base.metadata.create_all)
    yield mot
    await mot.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def db(motor) -> AsyncSession:
    async with motor.begin() as cx:
        await cx.execute(text("TRUNCATE public.landing_prospecto RESTART IDENTITY"))
    fabrica = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    async with fabrica() as sesion:
        yield sesion
        await sesion.rollback()


def _peticion(ip="203.0.113.7"):
    """Lo poco que el endpoint lee de la petición: la IP y el navegador."""
    return SimpleNamespace(
        headers={"x-forwarded-for": ip, "user-agent": "pruebas"},
        client=SimpleNamespace(host=ip))


def _solicitud(**cambios):
    datos = {"nombre": "Ana Pérez", "correo": "ana@empresa.co", "empresa": "Transportes Ana",
             "telefono": "3001234567", "mensaje": "Queremos ver el módulo de mantenimiento.",
             "origen": "/"}
    datos.update(cambios)
    return SolicitudContacto(**datos)


async def _cuantos(db) -> int:
    return (await db.execute(select(func.count(LandingProspecto.id)))).scalar()


SOPORTE = Miembro("soporte1", "SOPORTE", permisos_de("SOPORTE"))
CONSULTA = Miembro("consulta1", "CONSULTA", permisos_de("CONSULTA"))
SIN_PERMISOS = Miembro("nadie", "NINGUNO", ())


# ─── Formulario público ───────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_envio_correcto_queda_como_prospecto_nuevo(db):
    clientes_antes = (await db.execute(select(func.count(PlataformaCliente.id)))).scalar()
    tickets_antes = (await db.execute(select(func.count(SoporteTicket.id)))).scalar()

    assert await recibir_contacto(_solicitud(), _peticion(), db) == {"ok": True}

    p = (await db.execute(select(LandingProspecto))).scalar_one()
    assert (p.nombre, p.correo, p.estado, p.ip) == (
        "Ana Pérez", "ana@empresa.co", "NUEVO", "203.0.113.7")
    # Un prospecto no es un cliente a medio crear ni un ticket.
    assert (await db.execute(select(func.count(PlataformaCliente.id)))).scalar() == clientes_antes
    assert (await db.execute(select(func.count(SoporteTicket.id)))).scalar() == tickets_antes


@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("cambio", [
    {"nombre": "  "}, {"correo": None}, {"correo": "no-es-un-correo"}, {"mensaje": ""},
])
async def test_campos_faltantes_o_invalidos_responden_400(db, cambio):
    with pytest.raises(HTTPException) as e:
        await recibir_contacto(_solicitud(**cambio), _peticion(), db)
    assert e.value.status_code == 400
    assert await _cuantos(db) == 0


@pytest.mark.asyncio(loop_scope="session")
async def test_texto_demasiado_largo_responde_400(db):
    with pytest.raises(HTTPException) as e:
        await recibir_contacto(_solicitud(mensaje="x" * 4001), _peticion(), db)
    assert e.value.status_code == 400
    assert await _cuantos(db) == 0


@pytest.mark.asyncio(loop_scope="session")
async def test_campo_trampa_responde_bien_pero_no_guarda(db):
    r = await recibir_contacto(_solicitud(sitio_web="http://spam.example"), _peticion(), db)
    assert r == {"ok": True}
    assert await _cuantos(db) == 0


@pytest.mark.asyncio(loop_scope="session")
async def test_limite_de_envios_por_ip(db):
    for _ in range(ENVIOS_POR_IP):
        await recibir_contacto(_solicitud(), _peticion("198.51.100.1"), db)
    with pytest.raises(HTTPException) as e:
        await recibir_contacto(_solicitud(), _peticion("198.51.100.1"), db)
    assert e.value.status_code == 429
    assert await _cuantos(db) == ENVIOS_POR_IP
    # Otra conexión no paga por la primera.
    await recibir_contacto(_solicitud(), _peticion("198.51.100.2"), db)
    assert await _cuantos(db) == ENVIOS_POR_IP + 1


# ─── Consola de soporte ───────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_lista_del_mas_reciente_y_filtra_por_estado(db):
    await recibir_contacto(_solicitud(nombre="Primero"), _peticion("192.0.2.1"), db)
    await recibir_contacto(_solicitud(nombre="Segundo"), _peticion("192.0.2.2"), db)
    todos = await prospectos(estado=None, db=db, _=SOPORTE)
    assert [p.nombre for p in todos] == ["Segundo", "Primero"]

    await cambiar_estado_prospecto(todos[1].id, CambioProspecto(estado="contactado"),
                                   db=db, quien=SOPORTE)
    contactados = await prospectos(estado="CONTACTADO", db=db, _=SOPORTE)
    assert [p.nombre for p in contactados] == ["Primero"]
    assert contactados[0].atendido_por == "soporte1"
    assert contactados[0].atendido_en is not None


@pytest.mark.asyncio(loop_scope="session")
async def test_estado_invalido_responde_400_y_no_cambia(db):
    await recibir_contacto(_solicitud(), _peticion(), db)
    p = (await db.execute(select(LandingProspecto))).scalar_one()
    with pytest.raises(HTTPException) as e:
        await cambiar_estado_prospecto(p.id, CambioProspecto(estado="CERRADO"),
                                       db=db, quien=SOPORTE)
    assert e.value.status_code == 400
    await db.refresh(p)
    assert p.estado == "NUEVO"


@pytest.mark.asyncio(loop_scope="session")
async def test_permisos_de_la_consola():
    # Ver: lo tienen soporte y consulta; sin el permiso, 403.
    assert await exigir("soporte.ver")(quien=CONSULTA) is CONSULTA
    with pytest.raises(HTTPException) as e:
        await exigir("soporte.ver")(quien=SIN_PERMISOS)
    assert e.value.status_code == 403
    # Mover el estado: consulta mira pero no cambia.
    assert await exigir("soporte.atender")(quien=SOPORTE) is SOPORTE
    with pytest.raises(HTTPException) as e:
        await exigir("soporte.atender")(quien=CONSULTA)
    assert e.value.status_code == 403
