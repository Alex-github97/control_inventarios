"""Pruebas del núcleo contable: lo que no puede fallar en silencio.

Cada prueba de acá corresponde a una forma conocida de perder plata o de quedar
mal ante la DIAN. No se prueba que el código «funcione»: se prueba que cuando
algo está mal, **se detiene** en vez de guardar un documento sin contabilidad,
que es la manera más cara de fallar porque no se nota hasta el cierre.

Se corre contra un PostgreSQL de verdad y no contra SQLite: los consecutivos usan
`FOR UPDATE` y `substring(... from ...)`, la auditoría usa jsonb, y nada de eso
se comporta igual en otro motor. Una prueba que pasa en SQLite y falla en
producción es peor que no tener prueba.
"""
import asyncio
import os
from datetime import date, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Se importa la aplicación entera aunque acá solo se usen los modelos del ERP.
# SQLAlchemy resuelve las relaciones por nombre al arrancar los mapeadores: si
# falta una clase —`Estiba` apunta a `MantenimientoEstiba`, que no está en el
# `__init__` de modelos— fallan TODOS los mapeadores, no solo el suyo. Cargar lo
# mismo que carga producción también hace que estas pruebas avisen si alguien
# rompe el grafo de modelos, aunque sea en otro módulo.
import app.main  # noqa: F401
from app.core import erp_impuestos, erp_motor, erp_semilla
from app.core.database import Base
from app.core.erp_motor import ErrorContable, Linea
from app.infrastructure.models.erp import (
    EstadoComprobante, ERPComprobante, ERPComprobanteLinea, ERPEmpresa,
    ERPPlanCuenta, TipoComprobante,
)
from app.infrastructure.models.erp_nucleo import (
    ERPParametroFiscal, ERPPeriodo, ERPReglaContable, ERPReglaImpuesto, ERPTercero,
)

URL = os.environ["URL_PRUEBAS"]

# El año de las pruebas se fija; usar el año en curso haría que la batería
# empezara a fallar sola cada enero, y una prueba que falla por la fecha enseña a
# ignorar los fallos.
ANIO = 2025
FECHA = date(ANIO, 6, 15)


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
    """Una sesión por prueba, sobre una base recién barrida.

    Se barre en vez de usar transacciones anidadas porque el motor hace `flush` y
    lee lo que acaba de escribir —los consecutivos—, y eso no funciona igual
    dentro de un SAVEPOINT.
    """
    async with motor.begin() as cx:
        await cx.execute(text(
            "TRUNCATE erp_comprobante_lineas, erp_comprobantes, erp_auditoria, "
            "erp_periodos, erp_reglas_contables, erp_reglas_impuesto, "
            "erp_parametros_fiscales, erp_eventos_contables, erp_terceros, "
            "erp_plan_cuentas, erp_empresas RESTART IDENTITY CASCADE"))

    fabrica = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    async with fabrica() as sesion:
        yield sesion
        await sesion.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def empresa(db) -> ERPEmpresa:
    emp = ERPEmpresa(nit="900123456", razon_social="Pruebas SAS", pais="Colombia")
    db.add(emp)
    await db.flush()
    await erp_semilla.sembrar_parametros(db)
    await erp_semilla.sembrar_empresa(db, emp.id)
    await db.flush()
    return emp


async def _cuenta(db, empresa_id: int, codigo: str) -> ERPPlanCuenta:
    return (await db.execute(select(ERPPlanCuenta).where(
        ERPPlanCuenta.empresa_id == empresa_id,
        ERPPlanCuenta.codigo == codigo))).scalar_one()


async def _venta(db, empresa, fecha=FECHA, neto="1000000", iva="190000"):
    """Una venta cuadrada, que es el asiento más común del sistema."""
    return await erp_motor.asentar(
        db, empresa_id=empresa.id, evento="VENTA_FACTURA",
        tipo=TipoComprobante.DIARIO, fecha=fecha,
        concepto="Factura de venta",
        lineas=[
            Linea("cartera", debito=Decimal(neto) + Decimal(iva)),
            Linea("ingreso", credito=neto),
            Linea("iva_generado", credito=iva),
        ],
        usuario="prueba")


# ─── El asiento no cuadra ─────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_descuadre_levanta_error_no_devuelve_none(db, empresa):
    """Un asiento descuadrado tumba la operación; no se guarda a medias.

    El código anterior devolvía `None` y el documento quedaba guardado sin
    asiento. Eso es lo que se está previniendo.
    """
    with pytest.raises(ErrorContable) as exc:
        await erp_motor.asentar(
            db, empresa_id=empresa.id, evento="VENTA_FACTURA",
            tipo=TipoComprobante.DIARIO, fecha=FECHA, concepto="Descuadrada",
            lineas=[Linea("cartera", debito="1190000"),
                    Linea("ingreso", credito="1000000")],
            usuario="prueba")

    assert "no cuadra" in exc.value.mensaje
    # El detalle trae las líneas: sin eso hay que reproducir la cuenta a mano.
    assert exc.value.detail["lineas"]
    assert (await db.execute(select(ERPComprobante))).first() is None


@pytest.mark.asyncio(loop_scope="session")
async def test_un_centavo_de_diferencia_se_rechaza(db, empresa):
    """La tolerancia es medio centavo, no un peso.

    Con tolerancia de $1 se podía colar un descuadre por documento; mil facturas
    son mil pesos que no cuadran contra el extracto y nadie sabe de dónde salen.
    """
    with pytest.raises(ErrorContable):
        await erp_motor.asentar(
            db, empresa_id=empresa.id, evento="VENTA_FACTURA",
            tipo=TipoComprobante.DIARIO, fecha=FECHA, concepto="Un centavo",
            lineas=[Linea("cartera", debito="1000000.01"),
                    Linea("ingreso", credito="1000000.00")],
            usuario="prueba")


@pytest.mark.asyncio(loop_scope="session")
async def test_asiento_sin_importe_se_rechaza(db, empresa):
    with pytest.raises(ErrorContable) as exc:
        await erp_motor.asentar(
            db, empresa_id=empresa.id, evento="VENTA_FACTURA",
            tipo=TipoComprobante.DIARIO, fecha=FECHA, concepto="Vacía",
            lineas=[Linea("cartera", debito=0), Linea("ingreso", credito=0)],
            usuario="prueba")
    assert "no tiene ninguna línea con importe" in exc.value.mensaje


# ─── Períodos ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_periodo_cerrado_rechaza_el_asiento(db, empresa):
    """Contabilizar en un mes cerrado cambia una declaración ya presentada."""
    await _venta(db, empresa)  # crea el período abierto

    periodo = (await db.execute(select(ERPPeriodo).where(
        ERPPeriodo.empresa_id == empresa.id,
        ERPPeriodo.anio == ANIO, ERPPeriodo.mes == 6))).scalar_one()
    periodo.estado = "CERRADO"
    await db.flush()

    with pytest.raises(ErrorContable) as exc:
        await _venta(db, empresa)
    assert "cerrado" in exc.value.mensaje.lower()


@pytest.mark.asyncio(loop_scope="session")
async def test_otro_mes_sigue_abierto_con_uno_cerrado(db, empresa):
    """Cerrar junio no puede bloquear julio."""
    await _venta(db, empresa)
    periodo = (await db.execute(select(ERPPeriodo).where(
        ERPPeriodo.empresa_id == empresa.id, ERPPeriodo.mes == 6))).scalar_one()
    periodo.estado = "CERRADO"
    await db.flush()

    comp = await _venta(db, empresa, fecha=date(ANIO, 7, 1))
    assert comp.periodo == f"{ANIO}-07"


# ─── Consecutivos ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_consecutivo_corre_sin_huecos(db, empresa):
    numeros = [(await _venta(db, empresa)).numero for _ in range(3)]
    assert numeros == [f"CD-{ANIO}-000001", f"CD-{ANIO}-000002", f"CD-{ANIO}-000003"]


@pytest.mark.asyncio(loop_scope="session")
async def test_consecutivo_se_reinicia_cada_ano(db, empresa):
    a = await _venta(db, empresa, fecha=date(ANIO, 6, 15))
    b = await _venta(db, empresa, fecha=date(ANIO + 1, 1, 10))
    assert a.numero == f"CD-{ANIO}-000001"
    assert b.numero == f"CD-{ANIO + 1}-000001"


@pytest.mark.asyncio(loop_scope="session")
async def test_dos_transacciones_simultaneas_no_repiten_numero(motor, db, empresa):
    """La carrera de verdad: dos sesiones numerando a la vez.

    `count(*) + 1` pasa esta prueba en serie y la falla acá, que es exactamente
    el caso que se da en producción con cuatro workers.
    """
    await db.commit()
    fabrica = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)

    async def vender():
        async with fabrica() as s:
            comp = await _venta(s, empresa)
            await s.commit()
            return comp.numero

    uno, dos = await asyncio.gather(vender(), vender())
    assert uno != dos, f"dos comprobantes con el mismo número: {uno}"


# ─── Reglas contables ─────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_papel_sin_regla_falla_diciendo_que_configurar(db, empresa):
    """Antes esto creaba la cuenta al vuelo: un tipeo producía una cuenta nueva."""
    with pytest.raises(ErrorContable) as exc:
        await erp_motor.asentar(
            db, empresa_id=empresa.id, evento="VENTA_FACTURA",
            tipo=TipoComprobante.DIARIO, fecha=FECHA, concepto="Papel inventado",
            lineas=[Linea("cartera", debito="100"),
                    Linea("papel_que_no_existe", credito="100")],
            usuario="prueba")

    assert "papel_que_no_existe" in exc.value.mensaje
    assert "Reglas contables" in exc.value.mensaje
    # Falla ANTES de escribir: no queda medio comprobante.
    assert (await db.execute(select(ERPComprobante))).first() is None


@pytest.mark.asyncio(loop_scope="session")
async def test_la_regla_de_la_condicion_manda_sobre_la_general(db, empresa):
    """Una venta de exportación va a otra cuenta de ingreso que una nacional."""
    exportacion = await _cuenta(db, empresa.id, "417505")
    db.add(ERPReglaContable(
        empresa_id=empresa.id, evento="VENTA_FACTURA", papel="ingreso",
        condicion="EXPORTACION", cuenta_id=exportacion.id, naturaleza="CREDITO",
        activa=True))
    await db.flush()

    comp = await erp_motor.asentar(
        db, empresa_id=empresa.id, evento="VENTA_FACTURA",
        tipo=TipoComprobante.DIARIO, fecha=FECHA, concepto="Exportación",
        lineas=[Linea("cartera", debito="500000"),
                Linea("ingreso", credito="500000", condicion="EXPORTACION")],
        usuario="prueba")

    lineas = (await db.execute(select(ERPComprobanteLinea).where(
        ERPComprobanteLinea.comprobante_id == comp.id))).scalars().all()
    assert exportacion.id in {ln.cuenta_id for ln in lineas}


@pytest.mark.asyncio(loop_scope="session")
async def test_regla_desactivada_no_se_usa(db, empresa):
    regla = (await db.execute(select(ERPReglaContable).where(
        ERPReglaContable.empresa_id == empresa.id,
        ERPReglaContable.evento == "VENTA_FACTURA",
        ERPReglaContable.papel == "ingreso"))).scalar_one()
    regla.activa = False
    await db.flush()

    with pytest.raises(ErrorContable):
        await _venta(db, empresa)


# ─── Anulación ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_reversar_crea_el_contrario_y_no_borra(db, empresa):
    original = await _venta(db, empresa)
    reverso = await erp_motor.reversar(db, original.id, "prueba", "Factura mal emitida")

    assert original.estado == EstadoComprobante.ANULADO
    assert reverso.id != original.id
    assert reverso.total_debito == original.total_debito

    izq = (await db.execute(select(ERPComprobanteLinea).where(
        ERPComprobanteLinea.comprobante_id == original.id))).scalars().all()
    der = (await db.execute(select(ERPComprobanteLinea).where(
        ERPComprobanteLinea.comprobante_id == reverso.id))).scalars().all()

    # Cada cuenta queda en cero: el par original + reverso no mueve saldos.
    saldos = {}
    for ln in list(izq) + list(der):
        saldos[ln.cuenta_id] = saldos.get(ln.cuenta_id, Decimal(0)) + ln.debito - ln.credito
    assert all(v == 0 for v in saldos.values()), saldos


@pytest.mark.asyncio(loop_scope="session")
async def test_anular_sin_motivo_se_rechaza(db, empresa):
    comp = await _venta(db, empresa)
    with pytest.raises(ErrorContable) as exc:
        await erp_motor.reversar(db, comp.id, "prueba", "   ")
    assert "motivo" in exc.value.mensaje.lower()


@pytest.mark.asyncio(loop_scope="session")
async def test_no_se_anula_dos_veces(db, empresa):
    comp = await _venta(db, empresa)
    await erp_motor.reversar(db, comp.id, "prueba", "Error de digitación")
    with pytest.raises(ErrorContable):
        await erp_motor.reversar(db, comp.id, "prueba", "Otra vez")


# ─── Impuestos ────────────────────────────────────────────────────────────────

async def _regla_impuesto(db, empresa, **campos):
    base = dict(empresa_id=empresa.id, impuesto="RETEFUENTE",
                concepto="Compras generales", tarifa="2.5", base_minima_uvt="0",
                base_minima_pesos=0, vigente_desde=date(ANIO, 1, 1),
                vigente_hasta=None, papel="retefuente", activa=True)
    base.update(campos)
    regla = ERPReglaImpuesto(**base)
    db.add(regla)
    await db.flush()
    return regla


async def _tercero(db, empresa, **campos):
    base = dict(empresa_id=empresa.id, numero_identificacion="900999888",
                razon_social="Tercero de prueba", tipo_identificacion="NIT")
    base.update(campos)
    t = ERPTercero(**base)
    db.add(t)
    await db.flush()
    return t


@pytest.mark.asyncio(loop_scope="session")
async def test_tarifa_vigente_es_la_del_documento_no_la_de_hoy(db, empresa):
    """Recontabilizar una factura de marzo debe dar lo que se declaró en marzo."""
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa, tarifa="2.5",
                          vigente_desde=date(ANIO, 1, 1),
                          vigente_hasta=date(ANIO, 5, 31))
    await _regla_impuesto(db, empresa, tarifa="3.5",
                          vigente_desde=date(ANIO, 6, 1))

    marzo = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="1000000", fecha=date(ANIO, 3, 10))
    julio = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="1000000", fecha=date(ANIO, 7, 10))

    assert marzo.valor == Decimal("25000.00")
    assert julio.valor == Decimal("35000.00")


@pytest.mark.asyncio(loop_scope="session")
async def test_base_menor_al_minimo_no_retiene_y_dice_por_que(db, empresa):
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa, base_minima_uvt="27")

    uvt = await erp_impuestos.uvt_de(db, ANIO)
    assert uvt > 0, "la UVT de la prueba debe estar sembrada"

    chica = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="100000", fecha=FECHA)
    grande = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="5000000", fecha=FECHA)

    assert chica.valor == 0
    assert "no alcanza el mínimo" in chica.motivo
    assert grande.valor == Decimal("125000.00")


@pytest.mark.asyncio(loop_scope="session")
async def test_sin_uvt_del_ano_se_bloquea_en_vez_de_retener_de_mas(db, empresa):
    """Mínimo desconocido no es mínimo cero.

    Tratarlo como cero hace retener sobre una compra de diez mil pesos, y el
    documento sale bien formado, así que nadie lo nota.
    """
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await db.execute(text("DELETE FROM erp_parametros_fiscales"))
    await _regla_impuesto(db, empresa, base_minima_uvt="27")

    r = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="10000", fecha=FECHA)

    assert r.valor == 0
    assert r.bloqueado is True
    assert "UVT" in r.motivo

    with pytest.raises(ErrorContable):
        await erp_impuestos.liquidar_documento(
            db, empresa_id=empresa.id, fecha=FECHA, base_gravada="10000",
            concepto="Compras generales", impuestos=["RETEFUENTE"])


@pytest.mark.asyncio(loop_scope="session")
async def test_autorretenedor_no_se_le_retiene(db, empresa):
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa, excluye_autorretenedor=True)
    auto = await _tercero(db, empresa, autorretenedor=True,
                          razon_social="Grande SA")

    r = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="5000000", fecha=FECHA, tercero=auto)

    assert r.valor == 0
    assert "autorretenedor" in r.motivo
    assert r.bloqueado is False   # es una respuesta, no una falla


@pytest.mark.asyncio(loop_scope="session")
async def test_exento_de_retencion_no_se_le_retiene(db, empresa):
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa)
    exento = await _tercero(db, empresa, exento_retencion=True,
                            razon_social="Entidad Pública")

    r = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Compras generales", base="5000000", fecha=FECHA, tercero=exento)
    assert r.valor == 0
    assert "exento" in r.motivo


@pytest.mark.asyncio(loop_scope="session")
async def test_ica_del_municipio_gana_sobre_el_general(db, empresa):
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa, impuesto="RETEICA", concepto="General",
                          tarifa="0.414", papel="reteica")
    await _regla_impuesto(db, empresa, impuesto="RETEICA", concepto="General",
                          tarifa="0.966", papel="reteica", codigo_municipio="05001")

    medellin = await _tercero(db, empresa, codigo_municipio="05001")
    otro = await _tercero(db, empresa, numero_identificacion="800111222",
                          codigo_municipio="76001")

    r1 = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEICA", concepto="General",
        base="10000000", fecha=FECHA, tercero=medellin,
        codigo_municipio="05001")
    r2 = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEICA", concepto="General",
        base="10000000", fecha=FECHA, tercero=otro, codigo_municipio="76001")

    assert r1.tarifa == Decimal("0.97")   # 0.966 redondeado a centavo
    assert r2.tarifa == Decimal("0.41")


@pytest.mark.asyncio(loop_scope="session")
async def test_sin_regla_el_cero_dice_que_no_hay_regla(db, empresa):
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    r = await erp_impuestos.calcular(
        db, empresa_id=empresa.id, impuesto="RETEFUENTE",
        concepto="Concepto inexistente", base="5000000", fecha=FECHA)
    assert r.valor == 0
    assert "No hay regla vigente" in r.motivo


@pytest.mark.asyncio(loop_scope="session")
async def test_retencion_va_sobre_la_base_gravada_no_sobre_el_total(db, empresa):
    """Retener sobre el total mete el IVA en la base: error clásico y caro."""
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa, impuesto="IVA", concepto="General 19%",
                          tarifa="19.0", papel="iva_generado")
    await _regla_impuesto(db, empresa, impuesto="RETEFUENTE",
                          concepto="General 19%", tarifa="2.5", papel="retefuente")

    liq = await erp_impuestos.liquidar_documento(
        db, empresa_id=empresa.id, fecha=FECHA, base_gravada="1000000",
        concepto="General 19%", impuestos=["IVA", "RETEFUENTE"])

    assert liq["total_impuestos"] == "190000.00"
    # 2.5% de 1.000.000 = 25.000. Sobre el total (1.190.000) daría 29.750.
    assert liq["total_retenciones"] == "25000.00"
    assert liq["neto_a_pagar"] == "1165000.00"


@pytest.mark.asyncio(loop_scope="session")
async def test_reteiva_se_calcula_sobre_el_iva(db, empresa):
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await _regla_impuesto(db, empresa, impuesto="IVA", concepto="General 19%",
                          tarifa="19.0", papel="iva_generado")
    await _regla_impuesto(db, empresa, impuesto="RETEIVA", concepto="General 19%",
                          tarifa="15.0", papel="reteiva")

    liq = await erp_impuestos.liquidar_documento(
        db, empresa_id=empresa.id, fecha=FECHA, base_gravada="1000000",
        concepto="General 19%", impuestos=["IVA", "RETEIVA"])

    # 15% de 190.000 = 28.500, no 15% de 1.000.000.
    assert liq["total_retenciones"] == "28500.00"


# ─── Dígito de verificación ───────────────────────────────────────────────────

@pytest.mark.parametrize("nit,dv", [
    ("890903938", "8"),   # Bancolombia
    ("800197268", "4"),   # DIAN
    ("899999068", "1"),   # Ecopetrol
])
def test_digito_de_verificacion(nit, dv):
    assert erp_motor.digito_verificacion(nit) == dv


def test_dv_de_un_nit_invalido_es_nulo():
    assert erp_motor.digito_verificacion("no-es-un-nit") is None
    assert erp_motor.digito_verificacion("") is None


# ─── El balance cuadra ────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_balance_de_comprobacion_cuadra(db, empresa):
    """La comprobación que resume todas las demás: débitos == créditos."""
    await _venta(db, empresa, neto="1000000", iva="190000")
    await _venta(db, empresa, neto="2500000", iva="475000")
    await erp_motor.asentar(
        db, empresa_id=empresa.id, evento="PAGO_PROVEEDOR",
        tipo=TipoComprobante.EGRESO, fecha=FECHA, concepto="Pago a proveedor",
        lineas=[Linea("proveedor", debito="800000"),
                Linea("banco", credito="800000")],
        usuario="prueba")

    comp = await _venta(db, empresa, neto="300000", iva="57000")
    await erp_motor.reversar(db, comp.id, "prueba", "Anulada por el cliente")
    await db.flush()

    total = (await db.execute(text(
        "SELECT coalesce(sum(l.debito), 0), coalesce(sum(l.credito), 0) "
        "FROM erp_comprobante_lineas l "
        "JOIN erp_comprobantes c ON c.id = l.comprobante_id "
        "WHERE c.empresa_id = :e"), {"e": empresa.id})).first()

    assert total[0] == total[1], f"el libro no cuadra: {total[0]} vs {total[1]}"
    assert total[0] > 0


# ─── La siembra ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_sembrar_dos_veces_no_duplica(db, empresa):
    """Se llama en cada arranque y hay cuatro workers: tiene que ser idempotente."""
    antes = (await db.execute(text(
        "SELECT count(*) FROM erp_plan_cuentas WHERE empresa_id = :e"),
        {"e": empresa.id})).scalar()

    segunda = await erp_semilla.sembrar_empresa(db, empresa.id)
    await db.flush()

    despues = (await db.execute(text(
        "SELECT count(*) FROM erp_plan_cuentas WHERE empresa_id = :e"),
        {"e": empresa.id})).scalar()

    assert segunda["cuentas"] == 0
    assert antes == despues


@pytest.mark.asyncio(loop_scope="session")
async def test_la_siembra_no_pisa_lo_que_alguien_cambio(db, empresa):
    cuenta = await _cuenta(db, empresa.id, "130505")
    cuenta.nombre = "Clientes — nombre propio de la empresa"
    await db.flush()

    await erp_semilla.sembrar_empresa(db, empresa.id)
    await db.flush()
    await db.refresh(cuenta)

    assert cuenta.nombre == "Clientes — nombre propio de la empresa"


@pytest.mark.asyncio(loop_scope="session")
async def test_solo_las_subcuentas_aceptan_movimiento(db, empresa):
    """Mover una cuenta agrupadora hace que el balance no cuadre consigo mismo."""
    filas = (await db.execute(select(ERPPlanCuenta).where(
        ERPPlanCuenta.empresa_id == empresa.id))).scalars().all()
    for c in filas:
        if len(c.codigo) < 6:
            assert not c.acepta_movimientos, f"{c.codigo} agrupadora acepta movimiento"


@pytest.mark.asyncio(loop_scope="session")
async def test_no_se_inventa_la_uvt_de_un_ano_desconocido(db, empresa):
    """Una UVT inventada desplaza en silencio todas las retenciones."""
    assert await erp_impuestos.uvt_de(db, 2100) == 0


# ─── Auditoría ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_cada_asiento_deja_rastro(db, empresa):
    comp = await _venta(db, empresa)
    await erp_motor.reversar(db, comp.id, "carolina", "Error en el valor")
    await db.flush()

    filas = (await db.execute(text(
        "SELECT accion, usuario, observaciones FROM erp_auditoria "
        "WHERE empresa_id = :e ORDER BY id"), {"e": empresa.id})).all()

    acciones = [f[0] for f in filas]
    assert "CONTABILIZAR" in acciones
    assert "ANULAR" in acciones
    anulacion = next(f for f in filas if f[0] == "ANULAR")
    assert anulacion[1] == "carolina"
    assert anulacion[2] == "Error en el valor"


# ─── Los documentos que ya existían ───────────────────────────────────────────

# (evento, papeles) tal como los usan los endpoints de `erp.py`. Un papel mal
# escrito acá no falla al importar ni al arrancar: falla el día que alguien emite
# la factura. Esta prueba lo adelanta al momento de escribirlo.
PAPELES_DE_LOS_DOCUMENTOS = [
    ("VENTA_FACTURA", ["cartera", "ingreso", "iva_generado"]),
    ("COMPRA_FACTURA", ["gasto", "iva_descontable", "retefuente", "proveedor"]),
    ("RECAUDO_CLIENTE", ["banco", "cartera"]),
    ("PAGO_PROVEEDOR", ["proveedor", "banco"]),
    ("ACTIVO_DEPRECIACION", ["gasto_depreciacion", "depreciacion_acumulada"]),
]


@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("evento,papeles", PAPELES_DE_LOS_DOCUMENTOS)
async def test_los_documentos_existentes_encuentran_su_cuenta(db, empresa, evento, papeles):
    for papel in papeles:
        regla = await erp_motor.cuenta_para(db, empresa.id, evento, papel)
        assert regla.cuenta_id, f"{evento}/{papel} sin cuenta"


@pytest.mark.asyncio(loop_scope="session")
async def test_el_iva_de_una_compra_es_descontable_y_va_al_debito(db, empresa):
    """El IVA que uno paga es un derecho contra la DIAN, no un ingreso.

    El código anterior lo mandaba a 240805 —IVA generado, la cuenta de lo que uno
    DEBE— al débito. El saldo del renglón de IVA quedaba mal en los dos sentidos.
    """
    comp = await erp_motor.asentar(
        db, empresa_id=empresa.id, evento="COMPRA_FACTURA",
        tipo=TipoComprobante.DIARIO, fecha=FECHA, concepto="Compra",
        lineas=[Linea("gasto", debito="1000000"),
                Linea("iva_descontable", debito="190000"),
                Linea("proveedor", credito="1190000")],
        usuario="prueba")

    descontable = await _cuenta(db, empresa.id, "240810")
    generado = await _cuenta(db, empresa.id, "240805")
    lineas = (await db.execute(select(ERPComprobanteLinea).where(
        ERPComprobanteLinea.comprobante_id == comp.id))).scalars().all()

    iva = next(ln for ln in lineas if ln.cuenta_id == descontable.id)
    assert iva.debito == Decimal("190000.00")
    assert generado.id not in {ln.cuenta_id for ln in lineas}


@pytest.mark.asyncio(loop_scope="session")
async def test_no_se_contabiliza_en_la_empresa_equivocada(db, empresa):
    """Las cuentas se buscan por empresa, no solo por código.

    `_get_or_create_cuenta` filtraba solo por código y devolvía la primera que
    encontrara: con dos empresas, los asientos de una caían en los libros de la
    otra sin que nada avisara.
    """
    otra = ERPEmpresa(nit="900777666", razon_social="Otra SAS", pais="Colombia")
    db.add(otra)
    await db.flush()
    await erp_semilla.sembrar_empresa(db, otra.id)
    await db.flush()

    comp = await _venta(db, otra)
    cuentas_de_otra = {c.id for c in (await db.execute(select(ERPPlanCuenta).where(
        ERPPlanCuenta.empresa_id == otra.id))).scalars().all()}
    lineas = (await db.execute(select(ERPComprobanteLinea).where(
        ERPComprobanteLinea.comprobante_id == comp.id))).scalars().all()

    assert lineas
    for ln in lineas:
        assert ln.cuenta_id in cuentas_de_otra, "el asiento cayó en otra empresa"


@pytest.mark.asyncio(loop_scope="session")
async def test_simular_explica_en_vez_de_negarse(db, empresa):
    """Emitir se detiene; explicar no.

    Son dos preguntas distintas. «Emitir esta factura» con una regla que no se
    puede liquidar debe fallar, porque saldría con una retención que no es la que
    la norma pide. «Qué se retendría» debe responder, y el renglón bloqueado con
    su motivo es justamente la respuesta que se buscaba.
    """
    await db.execute(text("DELETE FROM erp_reglas_impuesto"))
    await db.execute(text("DELETE FROM erp_parametros_fiscales"))
    await _regla_impuesto(db, empresa, base_minima_uvt="27")

    with pytest.raises(ErrorContable):
        await erp_impuestos.liquidar_documento(
            db, empresa_id=empresa.id, fecha=FECHA, base_gravada="10000",
            concepto="Compras generales", impuestos=["RETEFUENTE"])

    explicado = await erp_impuestos.liquidar_documento(
        db, empresa_id=empresa.id, fecha=FECHA, base_gravada="10000",
        concepto="Compras generales", impuestos=["RETEFUENTE"], estricto=False)

    assert Decimal(explicado["total_retenciones"]) == 0
    assert len(explicado["bloqueados"]) == 1
    assert "UVT" in explicado["bloqueados"][0]["motivo"]
