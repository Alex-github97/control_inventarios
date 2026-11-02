"""
La planta de reencauche sobre el WMS: un solo inventario físico.

- La planta es un almacén con cinco zonas: recepción de carcasas, producción
  (una ubicación por estación), insumos, producto terminado y rechazos.
- Cada carcasa es 1 unidad del producto «Carcasa ‹medida›» de su dueño, con su
  serie (el código de la carcasa). La existencia del WMS no se parte por serie:
  la ubicación exacta de cada llanta la lleva `rtm_carcasa`, y el WMS cuadra
  cantidades por dueño y zona (`conciliacion`).
- Al terminar, la carcasa sale y entra «Reencauchada ‹medida› · ‹banda›» del
  mismo dueño con la misma serie, igual que en la maquila.
- Lo del cliente no se valoriza ni se contabiliza (depositante no propio). Lo
  de la planta entra a su costo y, si la empresa tiene Finanzas, se asienta.
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import wms_contable, wms_inventario as inv
from app.core.wms_operacion import depositante_propio
from app.infrastructure.models.reencauche import RTMCarcasa, RTMEquipo, RTMPlantaConfig
from app.infrastructure.models.wms import (
    WMSAlmacen, WMSDepositante, WMSInventarioUbicacion, WMSMovimientoInventario, WMSProducto, WMSSerie,
    WMSUbicacion, WMSZona,
)

CAT_CARCASA = "REENCAUCHE-CARCASA"
CAT_REENCAUCHADA = "REENCAUCHE-TERMINADA"

# (atributo de la configuración, tipo de zona del WMS, nombre, prefijo)
ZONAS = [
    ("ubic_recepcion_id", "RECEPCION", "Reencauche · recepción de carcasas", "RTM-REC"),
    ("ubic_produccion_id", "PRODUCCION", "Reencauche · producción", "RTM-PRO"),
    ("ubic_insumos_id", "ALMACENAMIENTO", "Reencauche · insumos", "RTM-INS"),
    ("ubic_terminado_id", "ALMACENAMIENTO", "Reencauche · producto terminado", "RTM-TER"),
    ("ubic_rechazos_id", "CUARENTENA", "Reencauche · rechazos", "RTM-RCH"),
]


async def _codigo_libre(db: AsyncSession, modelo, base: str) -> str:
    codigo, n = base, 1
    while (await db.execute(select(modelo.id).where(modelo.codigo == codigo))).first():
        n += 1
        codigo = f"{base}-{n}"
    return codigo


async def configurar_planta(db: AsyncSession, cfg: RTMPlantaConfig, almacen_id: int) -> RTMPlantaConfig:
    """Elige el almacén y crea las zonas y ubicaciones que falten. Si la
    configuración ya apunta a ubicaciones de ese almacén, las conserva."""
    alm = await db.get(WMSAlmacen, almacen_id)
    if alm is None:
        raise HTTPException(404, "El almacén no existe.")
    for attr, tipo, nombre, pre in ZONAS:
        actual = getattr(cfg, attr)
        if actual and cfg.almacen_id == almacen_id and await inv.almacen_de(db, actual) == almacen_id:
            continue
        zona = (await db.execute(select(WMSZona).where(WMSZona.almacen_id == almacen_id, WMSZona.nombre == nombre)
                                 .limit(1))).scalar()
        if zona is None:
            zona = WMSZona(almacen_id=almacen_id, codigo=await _codigo_libre(db, WMSZona, f"{pre}-{alm.id}"),
                           nombre=nombre, tipo=tipo, activo=True, vendible_pos=False)
            db.add(zona)
            await db.flush()
        ubic = (await db.execute(select(WMSUbicacion).where(WMSUbicacion.zona_id == zona.id)
                                 .order_by(WMSUbicacion.id).limit(1))).scalar()
        if ubic is None:
            ubic = WMSUbicacion(zona_id=zona.id, codigo=await _codigo_libre(db, WMSUbicacion, f"{pre}-{alm.id}"),
                                tipo="SUELO", activo=True)
            db.add(ubic)
            await db.flush()
        setattr(cfg, attr, ubic.id)
    cfg.almacen_id = almacen_id
    await db.flush()
    return cfg


def planta_lista(cfg: RTMPlantaConfig) -> None:
    if not (cfg.almacen_id and cfg.ubic_recepcion_id and cfg.ubic_produccion_id and cfg.ubic_terminado_id
            and cfg.ubic_rechazos_id):
        raise HTTPException(409, "Configure primero la planta: elija el almacén del WMS en Reencauche · Configuración.")


async def ubicacion_estacion(db: AsyncSession, cfg: RTMPlantaConfig, equipo: RTMEquipo) -> int:
    """Una ubicación de la zona de producción para la estación."""
    planta_lista(cfg)
    zona_id = (await db.execute(select(WMSUbicacion.zona_id).where(WMSUbicacion.id == cfg.ubic_produccion_id))).scalar()
    base = re.sub(r"[^A-Z0-9-]", "", f"RTM-EST-{equipo.codigo}".upper())[:26]
    ubic = WMSUbicacion(zona_id=zona_id, codigo=await _codigo_libre(db, WMSUbicacion, base), tipo="ESTANDAR",
                        activo=True)
    db.add(ubic)
    await db.flush()
    return ubic.id


def _clave(texto: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (texto or "").upper())[:24] or "X"


async def _producto(db: AsyncSession, sku: str, nombre: str, categoria: str, depositante_id: int,
                    medida: str) -> WMSProducto:
    p = (await db.execute(select(WMSProducto).where(WMSProducto.sku == sku))).scalar()
    if p is None:
        p = WMSProducto(sku=sku, nombre=nombre[:200], categoria=categoria, referencia=medida[:100],
                        unidad_medida="UNIDAD", requiere_serial=True, depositante_id=depositante_id, activo=True,
                        tarifa_iva=19, costo_promedio=0)
        db.add(p)
        await db.flush()
    return p


async def producto_carcasa(db: AsyncSession, depositante_id: int, medida: str) -> WMSProducto:
    return await _producto(db, f"RTM-C{depositante_id}-{_clave(medida)}", f"Carcasa {medida}", CAT_CARCASA,
                           depositante_id, medida)


async def producto_reencauchada(db: AsyncSession, depositante_id: int, medida: str,
                                banda: Optional[WMSProducto]) -> WMSProducto:
    nombre_banda = (banda.referencia or banda.nombre) if banda else "sin banda"
    sku = f"RTM-R{depositante_id}-{_clave(medida)}-{banda.id if banda else 0}"
    return await _producto(db, sku, f"Reencauchada {medida} · {nombre_banda}", CAT_REENCAUCHADA, depositante_id, medida)


async def es_propia(db: AsyncSession, depositante_id: int) -> bool:
    return depositante_id == await depositante_propio(db)


async def entrar_carcasa(db: AsyncSession, cfg: RTMPlantaConfig, c: RTMCarcasa, usuario_id: Optional[int],
                         usuario: str) -> WMSMovimientoInventario:
    """Entra a recepción como 1 unidad serializada de su dueño."""
    planta_lista(cfg)
    prod = await producto_carcasa(db, c.depositante_id, c.medida)
    serie = (await db.execute(select(WMSSerie).where(WMSSerie.numero_serie == c.codigo))).scalar()
    if serie is None:
        serie = WMSSerie(producto_id=prod.id, numero_serie=c.codigo, estado="DISPONIBLE", activo=True)
        db.add(serie)
        await db.flush()
    else:
        serie.producto_id = prod.id
    propia = await es_propia(db, c.depositante_id)
    costo = Decimal(str(c.costo_compra)) if propia and c.costo_compra is not None else None
    mov = await inv.mover(db, tipo="RECEPCION", producto_id=prod.id, cantidad=1, destino=cfg.ubic_recepcion_id,
                          documento_tipo="RTM_RECEPCION", documento_id=c.recepcion_id, referencia=c.codigo,
                          usuario_id=usuario_id, costo_unitario=costo, serie_id=serie.id)
    c.wms_serie_id, c.wms_producto_id, c.wms_ubicacion_id = serie.id, prod.id, cfg.ubic_recepcion_id
    if propia and costo:
        emp = await wms_contable.empresa(db)
        if emp is not None:
            await db.flush()
            v = wms_contable.valor([mov])
            await wms_contable._asentar(db, emp, "INVENTARIO_ENTRADA", f"Carcasa comprada {c.codigo}", [
                wms_contable.erp_motor.Linea("inventario", debito=v),
                wms_contable.erp_motor.Linea("por_facturar", credito=v)],
                usuario, "rtm_carcasa", c.id, c.codigo, [mov])
    return mov


async def trasladar(db: AsyncSession, c: RTMCarcasa, destino: int, usuario_id: Optional[int],
                    referencia: Optional[str] = None) -> Optional[WMSMovimientoInventario]:
    if not c.wms_producto_id or not c.wms_ubicacion_id or c.wms_ubicacion_id == destino:
        return None
    mov = await inv.mover(db, tipo="TRANSFERENCIA", producto_id=c.wms_producto_id, cantidad=1,
                          origen=c.wms_ubicacion_id, destino=destino, documento_tipo="RTM_PRODUCCION",
                          referencia=referencia or c.codigo, usuario_id=usuario_id, serie_id=c.wms_serie_id)
    c.wms_ubicacion_id = destino
    return mov


async def transformar(db: AsyncSession, cfg: RTMPlantaConfig, c: RTMCarcasa, banda: Optional[WMSProducto],
                      costo_insumos: Decimal, orden_id: int, usuario_id: Optional[int]) -> WMSProducto:
    """Sale la carcasa de producción y entra la reencauchada en producto
    terminado, con la misma serie. Las de la planta se valorizan con el costo
    de la carcasa más los insumos; las del cliente no se valorizan."""
    nuevo = await producto_reencauchada(db, c.depositante_id, c.medida, banda)
    propia = await es_propia(db, c.depositante_id)
    costo_carcasa = Decimal(0)
    if c.wms_producto_id and c.wms_ubicacion_id:
        salida = await inv.mover(db, tipo="TRANSFORMACION", producto_id=c.wms_producto_id, cantidad=1,
                                 origen=c.wms_ubicacion_id, documento_tipo="RTM_ORDEN", documento_id=orden_id,
                                 referencia=c.codigo, usuario_id=usuario_id, serie_id=c.wms_serie_id,
                                 estado_serie="DISPONIBLE", notas="Sale como carcasa para entrar reencauchada")
        costo_carcasa = Decimal(str(salida.costo_unitario or 0))
    costo = (costo_carcasa + Decimal(str(costo_insumos or 0))) if propia else None
    await inv.mover(db, tipo="TRANSFORMACION", producto_id=nuevo.id, cantidad=1, destino=cfg.ubic_terminado_id,
                    documento_tipo="RTM_ORDEN", documento_id=orden_id, referencia=c.codigo, usuario_id=usuario_id,
                    costo_unitario=costo, serie_id=c.wms_serie_id)
    if c.wms_serie_id:
        serie = await db.get(WMSSerie, c.wms_serie_id)
        serie.producto_id = nuevo.id
    c.wms_producto_id, c.wms_ubicacion_id = nuevo.id, cfg.ubic_terminado_id
    return nuevo


async def sacar(db: AsyncSession, c: RTMCarcasa, tipo: str, documento_tipo: str, documento_id: Optional[int],
                usuario_id: Optional[int], estado_serie: Optional[str] = None) -> Optional[WMSMovimientoInventario]:
    if not c.wms_producto_id or not c.wms_ubicacion_id:
        return None
    mov = await inv.mover(db, tipo=tipo, producto_id=c.wms_producto_id, cantidad=1, origen=c.wms_ubicacion_id,
                          documento_tipo=documento_tipo, documento_id=documento_id, referencia=c.codigo,
                          usuario_id=usuario_id, serie_id=c.wms_serie_id, estado_serie=estado_serie)
    c.wms_ubicacion_id = None
    return mov


async def consumir(db: AsyncSession, producto_id: int, lote_id: Optional[int], cantidad, ubicacion_id: int,
                   orden_id: int, referencia: str, usuario_id: Optional[int]) -> WMSMovimientoInventario:
    """Consumo de producción desde la ubicación de la estación. Si no alcanza,
    dice cuánto hay en esa ubicación y ese lote."""
    try:
        return await inv.mover(db, tipo="CONSUMO_PRODUCCION", producto_id=producto_id, cantidad=cantidad,
                               lote_id=lote_id, origen=ubicacion_id, documento_tipo="RTM_ORDEN",
                               documento_id=orden_id, referencia=referencia, usuario_id=usuario_id)
    except inv.StockInsuficiente as e:
        raise HTTPException(409, f"{e} (en la ubicación de la estación{', lote indicado' if lote_id else ''}).")


async def asentar_consumos_cliente(db: AsyncSession, movs: List[WMSMovimientoInventario], orden_codigo: str,
                                   orden_id: int, usuario: str) -> None:
    """Los insumos propios gastados en la llanta de un cliente son costo del
    servicio: salen del inventario contable igual que un despacho."""
    emp = await wms_contable.empresa(db)
    if emp is None or not movs:
        return
    await db.flush()
    v = wms_contable.valor(movs)
    if v > 0:
        await wms_contable._asentar(db, emp, "INVENTARIO_SALIDA", f"Insumos de la orden de reencauche {orden_codigo}", [
            wms_contable.erp_motor.Linea("costo_venta", debito=v), wms_contable.erp_motor.Linea("inventario", credito=v)],
            usuario, "rtm_orden", orden_id, orden_codigo, movs)


async def disponible(db: AsyncSession, producto_id: int, ubicacion_ids: Optional[List[int]] = None,
                     almacen_id: Optional[int] = None) -> Decimal:
    q = (select(func.coalesce(func.sum(WMSInventarioUbicacion.cantidad_disponible), 0))
         .join(WMSUbicacion, WMSUbicacion.id == WMSInventarioUbicacion.ubicacion_id)
         .join(WMSZona, WMSZona.id == WMSUbicacion.zona_id)
         .where(WMSInventarioUbicacion.producto_id == producto_id))
    if ubicacion_ids:
        q = q.where(WMSInventarioUbicacion.ubicacion_id.in_(ubicacion_ids))
    if almacen_id:
        q = q.where(WMSZona.almacen_id == almacen_id)
    return Decimal(str((await db.execute(q)).scalar() or 0))


async def conciliacion(db: AsyncSession) -> Dict:
    """Carcasas por dueño y ubicación según la planta contra las existencias del
    WMS de los productos de reencauche. Una diferencia es un movimiento que se
    hizo por fuera de la planta (o al revés)."""
    planta = {(d, u): n for d, u, n in (await db.execute(
        select(RTMCarcasa.depositante_id, RTMCarcasa.wms_ubicacion_id, func.count())
        .where(RTMCarcasa.wms_ubicacion_id.isnot(None))
        .group_by(RTMCarcasa.depositante_id, RTMCarcasa.wms_ubicacion_id))).all()}
    total = WMSInventarioUbicacion.cantidad_disponible + WMSInventarioUbicacion.cantidad_reservada \
        + WMSInventarioUbicacion.cantidad_bloqueada
    wms = {(d, u): int(round(float(n))) for d, u, n in (await db.execute(
        select(WMSProducto.depositante_id, WMSInventarioUbicacion.ubicacion_id, func.sum(total))
        .join(WMSProducto, WMSProducto.id == WMSInventarioUbicacion.producto_id)
        .where(WMSProducto.categoria.in_((CAT_CARCASA, CAT_REENCAUCHADA)))
        .group_by(WMSProducto.depositante_id, WMSInventarioUbicacion.ubicacion_id))).all() if n}
    claves = sorted(set(planta) | set(wms), key=lambda k: (k[0] or 0, k[1] or 0))
    deps = {i: n for i, n in (await db.execute(select(WMSDepositante.id, WMSDepositante.nombre))).all()}
    ubics = {i: c for i, c in (await db.execute(select(WMSUbicacion.id, WMSUbicacion.codigo).where(
        WMSUbicacion.id.in_([k[1] for k in claves] or [0])))).all()}
    filas = []
    for d, u in claves:
        p, w = planta.get((d, u), 0), wms.get((d, u), 0)
        filas.append({"depositante_id": d, "depositante": deps.get(d), "ubicacion_id": u, "ubicacion": ubics.get(u),
                      "planta": p, "wms": w, "diferencia": w - p})
    return {"filas": filas, "diferencias": sum(1 for f in filas if f["diferencia"]),
            "cuadra": all(f["diferencia"] == 0 for f in filas)}
