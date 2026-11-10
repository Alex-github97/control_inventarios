"""Pruebas de lubricación: la vida del aceite y la lista de trabajo.

Tres fallos que solo aparecieron con una flota grande, y que estas pruebas fijan:

1. La vida de la carga se contaba solo con las lecturas de sus muestras. Una
   carga recién abierta salía «sin lecturas» aunque el camión tuviera odómetro,
   y así quedaba toda la flota después de cada ronda de cambios.
2. La unidad salía del tipo de compartimento. «Motor diésel» viene en horas, y
   en un tractocamión se lleva por kilómetros: la pantalla decía «15.000 horas».
3. «Por muestrear» miraba si la carga viva tenía muestras. Cada cambio de aceite
   dejaba al compartimento como «nunca muestreado», y la lista traía todos.

Y la regla de datos de siempre: una lectura que retrocede se rechaza, porque se
ve bien formada en la pantalla y arruina la vida del aceite meses después.
"""
import os
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.main  # noqa: F401
from app.api.v1.endpoints import lubricacion_analitica as analitica
from app.api.v1.endpoints import lubricacion_operacion as op
from app.core.database import Base
from app.infrastructure.models.eam import EAMActivo
from app.infrastructure.models.lubricacion import (
    LubeCarga, LubeCompartimento, LubeMuestra, LubeTipoCompartimento,
)

URL = os.environ["URL_PRUEBAS"]
HOY = datetime.utcnow().replace(microsecond=0)
USUARIO = SimpleNamespace(username="pruebas")


# ── Funciones puras ──────────────────────────────────────────────────────────

def test_motor_en_horas_de_un_camion_sin_horometro_se_lleva_en_km():
    assert op.unidad_efectiva("HORAS", odometro=250_000, horometro=0) == "KM"
    assert op.unidad_efectiva("HORAS", odometro=250_000, horometro=None) == "KM"


def test_la_unidad_del_tipo_manda_cuando_el_equipo_tiene_ese_medidor():
    assert op.unidad_efectiva("HORAS", odometro=0, horometro=8_000) == "HORAS"
    assert op.unidad_efectiva("KM", odometro=90_000, horometro=3_000) == "KM"
    assert op.unidad_efectiva("DIAS", odometro=90_000, horometro=0) == "DIAS"
    # Un activo recién creado nace en cero: no hay de dónde deducir nada.
    assert op.unidad_efectiva("HORAS", odometro=0, horometro=0) == "HORAS"


def test_la_vida_usa_el_medidor_del_equipo_aunque_la_carga_no_tenga_muestras():
    carga = SimpleNamespace(medidor_inicio=100_000.0, fecha_llenado=HOY)
    assert op.vida_de_carga(carga, "KM", None, 104_500.0) == 4_500.0


def test_la_vida_toma_la_lectura_mas_alta_conocida():
    carga = SimpleNamespace(medidor_inicio=100_000.0, fecha_llenado=HOY)
    assert op.vida_de_carga(carga, "KM", 106_000.0, 104_500.0) == 6_000.0


def test_una_lectura_por_debajo_del_llenado_se_ignora():
    # Medidor cambiado o dato malo: restar daría una vida negativa.
    carga = SimpleNamespace(medidor_inicio=100_000.0, fecha_llenado=HOY)
    assert op.vida_de_carga(carga, "KM", None, 3_000.0) is None


def test_en_dias_cuenta_el_calendario():
    carga = SimpleNamespace(medidor_inicio=None, fecha_llenado=HOY - timedelta(days=40))
    assert op.vida_de_carga(carga, "DIAS", None, None, ahora=HOY) == 40.0


def test_una_lectura_que_retrocede_se_rechaza():
    with pytest.raises(HTTPException) as e:
        op.validar_lectura(99_000, 100_000, "lectura del equipo", "lectura del llenado")
    assert e.value.status_code == 422
    op.validar_lectura(100_000, 100_000, "lectura del equipo", "lectura del llenado")
    op.validar_lectura(None, 100_000, "lectura del equipo", "lectura del llenado")


def test_una_fecha_futura_se_rechaza():
    with pytest.raises(HTTPException):
        op.validar_fecha(HOY + timedelta(days=3), "fecha de toma")
    op.validar_fecha(HOY, "fecha de toma")


# ── Contra la base ───────────────────────────────────────────────────────────

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
        await cx.execute(text(
            "TRUNCATE eam_lube_resultado, eam_lube_diagnostico, eam_lube_muestra, "
            "eam_lube_relleno, eam_lube_carga, eam_lube_compartimento, "
            "eam_lube_tipo_compartimento, eam_activo RESTART IDENTITY CASCADE"))
    fabrica = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    async with fabrica() as sesion:
        yield sesion
        await sesion.rollback()


async def _camion(db, codigo: str, odometro: float, frecuencia: float = 15_000,
                  llenado: float = 100_000, dias: int = 30) -> LubeCarga:
    """Un tractocamión con su motor «en horas» y una carga viva."""
    tipo = (await db.execute(text(
        "SELECT id FROM eam_lube_tipo_compartimento WHERE codigo = 'MOT'"))).scalar()
    if not tipo:
        t = LubeTipoCompartimento(codigo="MOT", nombre="Motor diésel", unidad_vida="HORAS")
        db.add(t); await db.flush()
        tipo = t.id
    act = EAMActivo(codigo=codigo, nombre=f"Tractocamión {codigo}",
                    odometro_actual=odometro, horometro_actual=0)
    db.add(act); await db.flush()
    comp = LubeCompartimento(activo_id=act.id, tipo_compartimento_id=tipo, codigo="MOT",
                             nombre="Motor", frecuencia_muestreo=frecuencia)
    db.add(comp); await db.flush()
    carga = LubeCarga(compartimento_id=comp.id, fecha_llenado=HOY - timedelta(days=dias),
                      medidor_inicio=llenado, estado="ACTIVA")
    db.add(carga); await db.commit()
    return carga


@pytest.mark.asyncio(loop_scope="session")
async def test_lista_de_compartimentos_trae_vida_en_km(db):
    await _camion(db, "TC-1", odometro=104_000)
    filas = await op.listar_compartimentos(db=db)
    assert len(filas) == 1
    assert filas[0]["unidad_vida"] == "KM"
    assert filas[0]["vida_actual"] == 4_000
    assert filas[0]["medidor_actual"] == 104_000


@pytest.mark.asyncio(loop_scope="session")
async def test_pendientes_distingue_vencido_proximo_y_sin_historia(db):
    vencido = await _camion(db, "TC-V", odometro=116_000)     # 16.000 de 15.000
    await _camion(db, "TC-P", odometro=113_800)               # 13.800: 92 %
    await _camion(db, "TC-N", odometro=101_000)               # nunca muestreado
    al_dia = await _camion(db, "TC-A", odometro=110_000)
    # TC-A y TC-V tienen historia en una carga anterior; TC-A además se muestreó
    # en la carga viva hace poco, así que no le toca.
    for carga, lectura in ((al_dia, 108_000), (vencido, None)):
        anterior = LubeCarga(compartimento_id=carga.compartimento_id,
                             fecha_llenado=HOY - timedelta(days=200),
                             medidor_inicio=80_000, estado="DRENADA")
        db.add(anterior); await db.flush()
        db.add(LubeMuestra(numero=f"VIEJA-{carga.id}", compartimento_id=carga.compartimento_id,
                           carga_id=anterior.id, fecha_toma=HOY - timedelta(days=100),
                           medidor_equipo=90_000, estado="CON_RESULTADO", severidad="NORMAL"))
        if lectura:
            db.add(LubeMuestra(numero=f"NUEVA-{carga.id}", compartimento_id=carga.compartimento_id,
                               carga_id=carga.id, fecha_toma=HOY - timedelta(days=5),
                               medidor_equipo=lectura, estado="CON_RESULTADO", severidad="NORMAL"))
    await db.commit()

    lista = {p["activo"]: p for p in await analitica.pendientes(db=db)}
    assert lista["TC-V"]["estado"] == "VENCIDO"
    assert lista["TC-V"]["unidad"] == "KM"
    assert lista["TC-P"]["estado"] == "PROXIMO"
    assert lista["TC-N"]["estado"] == "SIN_HISTORIA"
    # El cambio de aceite no borra la historia: el que se muestreó antes y
    # lleva poco desde la última toma no está en la lista.
    assert "TC-A" not in lista
    # Lo vencido va primero.
    assert next(iter(lista)) == "TC-V"


@pytest.mark.asyncio(loop_scope="session")
async def test_muestra_con_lectura_menor_al_llenado_se_rechaza(db):
    carga = await _camion(db, "TC-M", odometro=104_000)
    datos = op.MuestraIn(numero="M-1", compartimento_id=carga.compartimento_id,
                         fecha_toma=HOY, medidor_equipo=95_000)
    with pytest.raises(HTTPException) as e:
        await op.crear_muestra(datos, db=db, usuario=USUARIO)
    assert e.value.status_code == 422

    datos.medidor_equipo = 103_500
    r = await op.crear_muestra(datos, db=db, usuario=USUARIO)
    assert r["horas_aceite"] == 3_500


@pytest.mark.asyncio(loop_scope="session")
async def test_cambio_de_aceite_no_puede_retroceder(db):
    carga = await _camion(db, "TC-C", odometro=120_000)
    malo = op.CargaIn(compartimento_id=carga.compartimento_id, fecha_llenado=HOY,
                      medidor_inicio=90_000)
    with pytest.raises(HTTPException):
        await op.abrir_carga(malo, db=db, usuario=USUARIO)

    antes = op.CargaIn(compartimento_id=carga.compartimento_id,
                       fecha_llenado=HOY - timedelta(days=90), medidor_inicio=120_000)
    with pytest.raises(HTTPException):
        await op.abrir_carga(antes, db=db, usuario=USUARIO)

    bueno = op.CargaIn(compartimento_id=carga.compartimento_id, fecha_llenado=HOY,
                       medidor_inicio=115_000)
    nueva = await op.abrir_carga(bueno, db=db, usuario=USUARIO)
    assert nueva["estado"] == "ACTIVA"
    await db.refresh(carga)
    assert carga.estado == "DRENADA" and carga.vida_lograda == 15_000


@pytest.mark.asyncio(loop_scope="session")
async def test_muestras_por_trozos_con_busqueda(db):
    carga = await _camion(db, "TC-B", odometro=104_000)
    for i in range(5):
        db.add(LubeMuestra(numero=f"LUB-{i}", compartimento_id=carga.compartimento_id,
                           carga_id=carga.id, fecha_toma=HOY - timedelta(days=i),
                           estado="CON_RESULTADO",
                           severidad="CRITICO" if i == 0 else "NORMAL"))
    await db.commit()
    respuesta = SimpleNamespace(headers={})
    filas = await op.listar_muestras(respuesta, compartimento_id=None, activo_id=None,
                                     carga_id=None, severidad=None, buscar="TC-B",
                                     limite=2, desplazamiento=0, db=db)
    assert len(filas) == 2 and respuesta.headers["X-Total-Count"] == "5"
    criticas = await op.listar_muestras(respuesta, compartimento_id=None, activo_id=None,
                                        carga_id=None, severidad="CRITICO,ACCION_INMEDIATA",
                                        buscar=None, limite=50, desplazamiento=0, db=db)
    assert [m["numero"] for m in criticas] == ["LUB-0"]


@pytest.mark.asyncio(loop_scope="session")
async def test_cargue_historico_cuelga_cada_muestra_de_la_carga_de_su_fecha(db):
    from app.api.v1.endpoints import lubricacion_importar as imp
    viva = await _camion(db, "TC-H", odometro=130_000, llenado=120_000, dias=10)
    vieja = LubeCarga(compartimento_id=viva.compartimento_id,
                      fecha_llenado=HOY - timedelta(days=120),
                      fecha_drenaje=HOY - timedelta(days=10),
                      medidor_inicio=100_000, estado="DRENADA")
    db.add(vieja); await db.commit()

    fila = {"numero": "HIST-1", "activo": "TC-H", "compartimento": "MOT",
            "fecha_toma": (HOY - timedelta(days=60)).strftime("%Y-%m-%d"),
            "medidor": "110000"}
    r = await imp.importar_muestras(imp.Cargue(filas=[fila]), db=db, usuario=USUARIO)
    assert r.creados == 1, r.errores
    m = (await db.execute(text("SELECT carga_id, horas_aceite FROM eam_lube_muestra "
                               "WHERE numero = 'HIST-1'"))).one()
    assert m.carga_id == vieja.id and m.horas_aceite == 10_000

    # Una lectura por debajo del cambio de aceite de esa fecha es un error de fila.
    malo = {**fila, "numero": "HIST-2", "medidor": "90000"}
    r = await imp.importar_muestras(imp.Cargue(filas=[malo]), db=db, usuario=USUARIO)
    assert r.creados == 0 and "no retrocede" in r.errores[0].motivo
