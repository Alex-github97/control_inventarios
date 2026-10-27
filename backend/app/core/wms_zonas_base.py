"""
Zonas que todo almacén tiene desde que se crea.

- RECEPCION («Recepción»): donde cae todo lo que se recibe y espera a ser
  distribuido (a una estantería o al cross docking). Es la ubicación por
  defecto de la recepción.
- CROSS_DOCKING («Cross docking»): la bodega de paso. La mercancía que se recibe
  ya vendida o con destino a otra bodega va aquí, sale en una orden de salida o
  en un traslado y viaja por el TMS como cualquier despacho. No se alista para
  otros pedidos ni se vende en el POS.

Se crean al crear el almacén y, para los que ya existían, al arrancar el
servidor (migración idempotente).
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.wms import WMSAlmacen, WMSUbicacion, WMSZona

BASE = (
    # tipo, nombre de la zona, prefijo de zona, código de la ubicación
    ("RECEPCION", "Recepción", "REC", "RECEPCION"),
    ("CROSS_DOCKING", "Cross docking", "XD", "XD"),
)


async def _codigo_libre(db: AsyncSession, modelo, base: str) -> str:
    codigo, n = base, 1
    while (await db.execute(select(modelo.id).where(modelo.codigo == codigo))).first():
        n += 1
        codigo = f"{base}-{n}"
    return codigo


async def asegurar(db: AsyncSession, alm: WMSAlmacen) -> None:
    for tipo, nombre, pre_zona, pre_ubic in BASE:
        z = (await db.execute(select(WMSZona).where(WMSZona.almacen_id == alm.id, WMSZona.tipo == tipo)
                              .order_by(WMSZona.id).limit(1))).scalar()
        if z is None:
            z = WMSZona(almacen_id=alm.id, codigo=await _codigo_libre(db, WMSZona, f"{pre_zona}-{alm.id}"),
                        nombre=nombre, tipo=tipo, activo=True)
            db.add(z)
            await db.flush()
        hay = (await db.execute(select(WMSUbicacion.id).where(WMSUbicacion.zona_id == z.id).limit(1))).first()
        if not hay:
            db.add(WMSUbicacion(zona_id=z.id, codigo=await _codigo_libre(db, WMSUbicacion, f"{pre_ubic}-{alm.id}"),
                                tipo="SUELO", activo=True))
            await db.flush()


async def ubicacion(db: AsyncSession, almacen_id: int, tipo: str) -> Optional[int]:
    """La ubicación de esa zona base (la crea si faltara)."""
    from app.core.wms_inventario import ubicacion_de_zona
    u = await ubicacion_de_zona(db, almacen_id, tipo)
    if u is None:
        alm = await db.get(WMSAlmacen, almacen_id)
        if alm is None:
            return None
        await asegurar(db, alm)
        u = await ubicacion_de_zona(db, almacen_id, tipo)
    return u


async def migrar(conn) -> None:
    """Para los almacenes que ya existían (conexión cruda del arranque)."""
    for tipo, nombre, pre_zona, pre_ubic in BASE:
        await conn.execute(text("""
            INSERT INTO wms_zonas (almacen_id, codigo, nombre, tipo, temperatura_controlada, vendible_pos, activo, created_at, updated_at)
            SELECT a.id, CAST(:pz AS varchar) || '-' || a.id, CAST(:nombre AS varchar), CAST(:tipo AS varchar), false, false, true, now(), now()
            FROM wms_almacenes a
            WHERE NOT EXISTS (SELECT 1 FROM wms_zonas z WHERE z.almacen_id = a.id AND z.tipo = CAST(:tipo AS varchar))
            ON CONFLICT (codigo) DO NOTHING"""), {"pz": pre_zona, "nombre": nombre, "tipo": tipo})
        await conn.execute(text("""
            INSERT INTO wms_ubicaciones (zona_id, codigo, tipo, activo, created_at, updated_at)
            SELECT z.id, CAST(:pu AS varchar) || '-' || z.almacen_id, 'SUELO', true, now(), now()
            FROM wms_zonas z
            WHERE z.tipo = CAST(:tipo AS varchar)
              AND z.id = (SELECT min(z2.id) FROM wms_zonas z2 WHERE z2.almacen_id = z.almacen_id AND z2.tipo = CAST(:tipo AS varchar))
              AND NOT EXISTS (SELECT 1 FROM wms_ubicaciones u WHERE u.zona_id = z.id)
            ON CONFLICT (codigo) DO NOTHING"""), {"pu": pre_ubic, "tipo": tipo})
