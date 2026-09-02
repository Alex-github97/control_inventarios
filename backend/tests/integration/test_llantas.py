"""Pruebas del módulo de llantas: lo que no se puede aceptar.

Dos datos imposibles entraban sin que nada avisara: un odómetro que retrocede y
una profundidad que sube. Los dos se ven bien formados en la pantalla, y los dos
arruinan exactamente la cifra por la que existe el módulo —el costo por
kilómetro y el desgaste en mm/km—, meses después de haberse anotado.

Estas pruebas fijan las excepciones legítimas además de las prohibiciones: un
reencauche y un reesculturado SÍ suben la profundidad, y rechazarlos sería tan
malo como aceptar lo imposible.
"""
import asyncio
import os
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.main  # noqa: F401
from app.api.v1.endpoints import eam
from app.core.database import Base
from app.infrastructure.models.eam import (
    EAMActivo, EAMInspeccionNeumatico, EAMNeumatico, EAMNeumaticoConfig,
    EAMReesculturado, EAMVidaNeumatico,
)

URL = os.environ["URL_PRUEBAS"]
AHORA = datetime(2026, 6, 15, 8, 0)


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
            "TRUNCATE eam_inspeccion_neumatico, eam_movimiento_neumatico, "
            "eam_reesculturado_neumatico, eam_vida_neumatico, eam_neumatico, "
            "eam_neumatico_config, eam_activo RESTART IDENTITY CASCADE"))
    fabrica = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    async with fabrica() as sesion:
        yield sesion
        await sesion.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def montada(db):
    """Una llanta nueva montada en un camión, con una primera medición."""
    db.add(EAMNeumaticoConfig(id=1, montaje_estricto=False, profundidad_minima=3.0,
                              tolerancia_profundidad=0.5))
    activo = EAMActivo(codigo="TRK-001", nombre="Tractocamión 001",
                       placa="ABC123", odometro_actual=120_000)
    db.add(activo)
    await db.flush()

    neu = EAMNeumatico(
        codigo="LL-0001", marca="Michelin", medida="295/80R22.5",
        estado="INSTALADO", activo_id=activo.id, posicion="1I",
        km_inicio=100_000, km_actual=120_000,
        profundidad_diseño=16.0, profundidad_actual=12.4,
        profundidad_externa=12.8, profundidad_interna=12.4)
    db.add(neu)
    await db.flush()

    db.add(EAMVidaNeumatico(neumatico_id=neu.id, numero_vida=1, tipo="NUEVA",
                            fecha_inicio=AHORA - timedelta(days=200),
                            km_inicio=100_000, profundidad_inicial=16.0))
    db.add(EAMInspeccionNeumatico(
        neumatico_id=neu.id, fecha=AHORA - timedelta(days=30),
        profundidad_izq=12.8, profundidad_centro=13.0, profundidad_der=12.4,
        km_odometro=118_000, posicion="1I"))
    await db.flush()
    return {"activo": activo, "neu": neu}


class _Datos:
    """Un cuerpo de petición mínimo, con los campos que el endpoint lee."""

    def __init__(self, **campos):
        base = dict(fecha=AHORA, profundidad_izq=None, profundidad_centro=None,
                    profundidad_der=None, presion_psi=None, km_odometro=None,
                    posicion=None, estado_visual=None, observaciones=None,
                    tecnico=None)
        base.update(campos)
        for k, v in base.items():
            setattr(self, k, v)

    def model_dump(self):
        return {k: v for k, v in self.__dict__.items()}


# ─── La lectura no retrocede ──────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_el_odometro_no_puede_ir_hacia_atras(db, montada):
    """Un odómetro no baja. Aceptarlo deja el recorrido de la llanta en cero."""
    error = eam._validar_lectura(
        montada["activo"], montada["neu"], km=119_000, horas=None)
    assert error and "menor que el del equipo" in error


@pytest.mark.asyncio(loop_scope="session")
async def test_la_lectura_se_valida_tambien_al_dar_de_baja(db, montada):
    """La baja CIERRA la vida de la llanta con ese kilometraje.

    Antes solo se validaba al montar y al rotar, así que la baja —el único
    movimiento donde el dato se convierte de inmediato en el recorrido total y
    en el costo por kilómetro— entraba sin comprobar.
    """
    datos = _Datos(tipo_movimiento="BAJA", neumatico_id=montada["neu"].id,
                   activo_id=montada["activo"].id, km_odometro=110_000,
                   horometro=None, bodega_id=None, dano_id=None, motivo="Desgaste",
                   motivo_fin_vida_id=None, posicion=None)
    with pytest.raises(HTTPException) as exc:
        await eam.crear_movimiento_neumatico(data=datos, db=db)
    assert exc.value.status_code == 409
    assert "menor" in str(exc.value.detail)


@pytest.mark.asyncio(loop_scope="session")
async def test_una_baja_con_lectura_hacia_adelante_si_pasa(db, montada):
    datos = _Datos(tipo_movimiento="BAJA", neumatico_id=montada["neu"].id,
                   activo_id=montada["activo"].id, km_odometro=125_000,
                   horometro=None, bodega_id=None, dano_id=None, motivo="Desgaste",
                   motivo_fin_vida_id=None, posicion=None)
    mov = await eam.crear_movimiento_neumatico(data=datos, db=db)
    assert mov.tipo_movimiento == "BAJA"

    vida = (await db.execute(select(EAMVidaNeumatico).where(
        EAMVidaNeumatico.neumatico_id == montada["neu"].id))).scalar_one()
    assert vida.km_fin == 125_000


# ─── La profundidad no crece ──────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_la_profundidad_no_puede_subir(db, montada):
    """El labrado no vuelve a crecer.

    Una llanta que gana milímetros arruina el mm/km con el que se decide cuándo
    bajarla, y apaga la alerta de profundidad mínima.
    """
    with pytest.raises(HTTPException) as exc:
        await eam.crear_inspeccion(
            nid=montada["neu"].id,
            data=_Datos(profundidad_izq=14.0, profundidad_centro=13.0,
                        profundidad_der=12.0, km_odometro=121_000),
            db=db)
    assert exc.value.status_code == 409
    detalle = str(exc.value.detail)
    # El mensaje dice QUÉ surco y contra qué valor, no solo «dato inválido».
    assert "externo" in detalle and "12.8" in detalle
    assert "reencauch" in detalle   # dice cuál es la salida legítima


@pytest.mark.asyncio(loop_scope="session")
async def test_se_compara_surco_por_surco_no_contra_el_minimo(db, montada):
    """Una llanta se desgasta por un hombro: mirar solo el mínimo esconde el error.

    Acá el centro sube y los otros dos bajan. Si se comparara contra el mínimo de
    los tres, el dato equivocado del centro pasaría inadvertido.
    """
    with pytest.raises(HTTPException) as exc:
        await eam.crear_inspeccion(
            nid=montada["neu"].id,
            data=_Datos(profundidad_izq=12.0, profundidad_centro=15.0,
                        profundidad_der=11.5, km_odometro=121_000),
            db=db)
    assert "centro" in str(exc.value.detail)


@pytest.mark.asyncio(loop_scope="session")
async def test_una_variacion_de_medio_milimetro_se_acepta(db, montada):
    """Un profundímetro no da el mismo número dos veces.

    Rechazar cualquier aumento haría rebotar mediciones legítimas, y la gente
    aprendería a rodear la validación escribiendo el valor anterior.
    """
    insp = await eam.crear_inspeccion(
        nid=montada["neu"].id,
        data=_Datos(profundidad_izq=13.1, profundidad_centro=13.2,
                    profundidad_der=12.6, km_odometro=121_000),
        db=db)
    assert insp.profundidad_izq == 13.1


@pytest.mark.asyncio(loop_scope="session")
async def test_no_se_admite_mas_profundidad_que_la_de_diseno(db, montada):
    """Por encima del diseño el error está en la ficha o en la medición.

    Decirlo así ahorra buscarlo en el sitio equivocado.
    """
    with pytest.raises(HTTPException) as exc:
        await eam.crear_inspeccion(
            nid=montada["neu"].id,
            data=_Datos(profundidad_izq=18.0, km_odometro=121_000),
            db=db)
    assert "diseño" in str(exc.value.detail) or "diseno" in str(exc.value.detail)


@pytest.mark.asyncio(loop_scope="session")
async def test_despues_de_un_reesculturado_la_profundidad_si_sube(db, montada):
    """Reesculturar talla surco nuevo: la referencia se corre a esa operación.

    Es la excepción legítima. Bloquearla obligaría a la gente a inventar valores
    para que el sistema los dejara pasar, que es peor que no validar nada.
    """
    db.add(EAMReesculturado(
        neumatico_id=montada["neu"].id, fecha=AHORA - timedelta(days=1),
        profundidad_anterior=12.4, profundidad_nueva=15.0, deshecho=False))
    montada["neu"].profundidad_actual = 15.0
    await db.flush()

    insp = await eam.crear_inspeccion(
        nid=montada["neu"].id,
        data=_Datos(profundidad_izq=14.8, profundidad_centro=15.0,
                    profundidad_der=14.6, km_odometro=121_000),
        db=db)
    assert insp.profundidad_centro == 15.0


# ─── Lo que la pantalla necesita ver ──────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_la_referencia_trae_la_ultima_de_cada_surco(db, montada):
    """El formulario pedía tres números sin decir contra qué.

    Sin ver que la vez pasada iban 12,8 nadie puede saber si 8,5 está bien o le
    faltó un dígito.
    """
    ref = await eam.referencia_profundidad(nid=montada["neu"].id, db=db)

    assert ref.origen == "inspección"
    assert ref.profundidad_izq == 12.8
    assert ref.profundidad_centro == 13.0
    assert ref.profundidad_der == 12.4
    assert ref.profundidad_minima == 3.0
    assert ref.profundidad_diseno == 16.0
    assert ref.km_odometro == 118_000


@pytest.mark.asyncio(loop_scope="session")
async def test_la_referencia_dice_de_donde_sale(db, montada):
    """No es lo mismo comparar contra el mes pasado que contra un reesculturado."""
    db.add(EAMReesculturado(
        neumatico_id=montada["neu"].id, fecha=AHORA - timedelta(days=1),
        profundidad_anterior=12.4, profundidad_nueva=15.0, deshecho=False))
    await db.flush()

    ref = await eam.referencia_profundidad(nid=montada["neu"].id, db=db)
    assert ref.origen == "reesculturado"
    # La inspección vieja ya no es la referencia: es anterior al reesculturado.
    assert ref.profundidad_centro == 15.0
