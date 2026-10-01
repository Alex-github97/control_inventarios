"""
El camino seguro para mover existencias del WMS.

El ajuste que usaban los endpoints viejos (`_ajustar_inventario`) leía la fila
sin bloquearla y truncaba a cero en silencio: dos ventas simultáneas podían
vender la misma unidad, y una salida mayor que la existencia simplemente dejaba
la ubicación en cero sin decir nada. Para un punto de venta eso es inventario
fantasma. Aquí:

- la fila de existencia se lee con `FOR UPDATE`: quien llega segundo espera y
  ve el saldo ya descontado;
- una salida mayor que lo disponible se RECHAZA (`StockInsuficiente`);
- cada movimiento queda en el kárdex con su ubicación de origen o destino y su
  costo unitario;
- las entradas valorizadas recalculan el costo promedio ponderado del producto
  (el producto también se bloquea, para que dos recepciones no se pisen).

Las salidas toman primero lo que vence antes (FEFO) y nunca un lote vencido o
bloqueado.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.wms import (
    WMSInventarioUbicacion, WMSLote, WMSMovimientoInventario, WMSProducto, WMSUbicacion, WMSZona,
)

CUATRO = Decimal("0.0001")


class StockInsuficiente(Exception):
    def __init__(self, producto: str, pedido: Decimal, disponible: Decimal):
        self.producto, self.pedido, self.disponible = producto, pedido, disponible
        super().__init__(f"No hay existencias suficientes de «{producto}»: se piden {pedido:g}, hay {disponible:g}.")


def _d(v) -> Decimal:
    return v if isinstance(v, Decimal) else Decimal(str(v or 0))


async def _fila(db: AsyncSession, producto_id: int, ubicacion_id: int, lote_id: Optional[int],
                crear: bool) -> Optional[WMSInventarioUbicacion]:
    q = select(WMSInventarioUbicacion).where(
        WMSInventarioUbicacion.producto_id == producto_id,
        WMSInventarioUbicacion.ubicacion_id == ubicacion_id,
        # El UNIQUE no ve los NULL: el stock sin lote se busca explícitamente.
        WMSInventarioUbicacion.lote_id.is_(None) if lote_id is None else WMSInventarioUbicacion.lote_id == lote_id,
    ).order_by(WMSInventarioUbicacion.id).limit(1).with_for_update()
    fila = (await db.execute(q)).scalar_one_or_none()
    if fila is None and crear:
        fila = WMSInventarioUbicacion(producto_id=producto_id, ubicacion_id=ubicacion_id, lote_id=lote_id,
                                      cantidad_disponible=0, cantidad_reservada=0, cantidad_bloqueada=0)
        db.add(fila)
        await db.flush()
    return fila


async def existencia_total(db: AsyncSession, producto_id: int) -> Decimal:
    v = (await db.execute(select(func.coalesce(func.sum(
        WMSInventarioUbicacion.cantidad_disponible + WMSInventarioUbicacion.cantidad_reservada
        + WMSInventarioUbicacion.cantidad_bloqueada), 0)).where(
        WMSInventarioUbicacion.producto_id == producto_id))).scalar()
    return _d(v)


async def costear_entrada(db: AsyncSession, producto_id: int, cantidad, costo_unitario) -> Decimal:
    """Promedio ponderado: (existencia × costo actual + entrada × costo de la
    entrada) / existencia nueva. Se llama ANTES de sumar la cantidad."""
    prod = (await db.execute(select(WMSProducto).where(WMSProducto.id == producto_id)
                             .with_for_update())).scalar_one()
    cantidad, costo = _d(cantidad), _d(costo_unitario) if costo_unitario is not None else None
    if costo is None or cantidad <= 0:
        return _d(prod.costo_promedio)
    previa = await existencia_total(db, producto_id)
    actual = _d(prod.costo_promedio)
    total = previa + cantidad
    prod.costo_promedio = ((previa * actual + cantidad * costo) / total).quantize(CUATRO, ROUND_HALF_UP) \
        if total > 0 else costo
    return _d(prod.costo_promedio)


async def entrar(db: AsyncSession, *, producto_id: int, ubicacion_id: int, lote_id: Optional[int],
                 cantidad, tipo: str, referencia: Optional[str], usuario_id: Optional[int],
                 notas: Optional[str] = None, costo_unitario=None) -> WMSMovimientoInventario:
    cantidad = _d(cantidad)
    if cantidad <= 0:
        raise ValueError("La cantidad que entra debe ser mayor que cero.")
    costo = await costear_entrada(db, producto_id, cantidad, costo_unitario) \
        if costo_unitario is not None else _d((await db.get(WMSProducto, producto_id)).costo_promedio)
    fila = await _fila(db, producto_id, ubicacion_id, lote_id, crear=True)
    fila.cantidad_disponible = float(_d(fila.cantidad_disponible) + cantidad)
    mov = WMSMovimientoInventario(tipo=tipo, producto_id=producto_id, ubicacion_destino_id=ubicacion_id,
                                  lote_id=lote_id, cantidad=float(cantidad),
                                  costo_unitario=_d(costo_unitario) if costo_unitario is not None else costo,
                                  referencia_documento=referencia, usuario_id=usuario_id, notas=notas)
    db.add(mov)
    return mov


async def sacar(db: AsyncSession, *, producto_id: int, ubicacion_id: int, lote_id: Optional[int],
                cantidad, tipo: str, referencia: Optional[str], usuario_id: Optional[int],
                notas: Optional[str] = None) -> WMSMovimientoInventario:
    cantidad = _d(cantidad)
    fila = await _fila(db, producto_id, ubicacion_id, lote_id, crear=False)
    disponible = _d(fila.cantidad_disponible) if fila else Decimal(0)
    if fila is None or disponible < cantidad:
        prod = await db.get(WMSProducto, producto_id)
        raise StockInsuficiente(prod.nombre if prod else str(producto_id), cantidad, disponible)
    fila.cantidad_disponible = float(disponible - cantidad)
    prod = await db.get(WMSProducto, producto_id)
    mov = WMSMovimientoInventario(tipo=tipo, producto_id=producto_id, ubicacion_origen_id=ubicacion_id,
                                  lote_id=lote_id, cantidad=float(cantidad), costo_unitario=_d(prod.costo_promedio),
                                  referencia_documento=referencia, usuario_id=usuario_id, notas=notas)
    db.add(mov)
    return mov


@dataclass
class Asignacion:
    ubicacion_id: int
    lote_id: Optional[int]
    cantidad: Decimal


async def ubicaciones_vendibles(db: AsyncSession, almacen_id: int) -> List[int]:
    return list((await db.execute(select(WMSUbicacion.id).join(WMSZona, WMSZona.id == WMSUbicacion.zona_id).where(
        WMSZona.almacen_id == almacen_id, WMSZona.vendible_pos.is_(True), WMSZona.activo.isnot(False),
        WMSUbicacion.activo.isnot(False)))).scalars())


async def disponible_en(db: AsyncSession, producto_ids: Sequence[int], ubicacion_ids: Sequence[int]) -> dict:
    """Disponible vendible por producto (sin lotes vencidos ni bloqueados)."""
    if not producto_ids or not ubicacion_ids:
        return {}
    hoy = date.today()
    filas = (await db.execute(
        select(WMSInventarioUbicacion.producto_id, func.sum(WMSInventarioUbicacion.cantidad_disponible))
        .outerjoin(WMSLote, WMSLote.id == WMSInventarioUbicacion.lote_id)
        .where(WMSInventarioUbicacion.producto_id.in_(producto_ids),
               WMSInventarioUbicacion.ubicacion_id.in_(ubicacion_ids),
               WMSInventarioUbicacion.cantidad_disponible > 0,
               (WMSLote.id.is_(None)) | ((WMSLote.activo.isnot(False)) &
                                         ((WMSLote.fecha_vencimiento.is_(None)) | (WMSLote.fecha_vencimiento >= hoy))))
        .group_by(WMSInventarioUbicacion.producto_id))).all()
    return {pid: _d(n) for pid, n in filas}


async def asignar_fefo(db: AsyncSession, producto_id: int, ubicacion_ids: Sequence[int],
                       cantidad) -> List[Asignacion]:
    """Elige de dónde sale una cantidad: primero lo que vence antes, sin
    lotes vencidos ni bloqueados. Bloquea las filas que va a usar."""
    cantidad = _d(cantidad)
    hoy = date.today()
    filas = (await db.execute(
        select(WMSInventarioUbicacion)
        .outerjoin(WMSLote, WMSLote.id == WMSInventarioUbicacion.lote_id)
        .where(WMSInventarioUbicacion.producto_id == producto_id,
               WMSInventarioUbicacion.ubicacion_id.in_(ubicacion_ids),
               WMSInventarioUbicacion.cantidad_disponible > 0,
               (WMSLote.id.is_(None)) | ((WMSLote.activo.isnot(False)) &
                                         ((WMSLote.fecha_vencimiento.is_(None)) | (WMSLote.fecha_vencimiento >= hoy))))
        .order_by(WMSLote.fecha_vencimiento.asc().nullslast(), WMSInventarioUbicacion.id)
        .with_for_update(of=WMSInventarioUbicacion))).scalars().all()
    faltan, salida = cantidad, []
    for f in filas:
        if faltan <= 0:
            break
        tomar = min(faltan, _d(f.cantidad_disponible))
        salida.append(Asignacion(f.ubicacion_id, f.lote_id, tomar))
        faltan -= tomar
    if faltan > 0:
        prod = await db.get(WMSProducto, producto_id)
        raise StockInsuficiente(prod.nombre if prod else str(producto_id), cantidad, cantidad - faltan)
    return salida
