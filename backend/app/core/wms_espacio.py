"""
Espacio de una posición: cuánto le cabe (m³ y kg) y cuánto tiene.

- Capacidad: las medidas internas de la ubicación (largo × ancho × alto) o su
  capacidad en m³; el peso, su capacidad en kg. Sin medidas, la posición no
  tiene límite de espacio (se sigue usando solo el máximo del frente).
- Aprovechamiento útil: las cajas nunca llenan el 100 % del volumen; se usa un
  porcentaje configurable por almacén (85 % por defecto).
- Ocupado: lo que hay de TODOS los productos en la posición (disponible,
  reservado y bloqueado), más lo que ya viene en camino en tareas abiertas
  (reabastecer, ubicar, mover) hacia esa posición.
- Medidas de una unidad de producto: las de su empaque UNIDAD o, si no, el
  volumen y peso del maestro. Para el ajuste físico se usan las del empaque en
  que se mide el frente (caja, máster…), con sus giros.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import wms_cubicaje as cub
from app.infrastructure.models.wms import (
    WMSInventarioUbicacion, WMSProducto, WMSProductoEmpaque, WMSTarea, WMSUbicacion,
)

ABIERTAS = ("POR_APROBAR", "PENDIENTE", "ASIGNADA", "EN_CURSO")
APROVECHAMIENTO = 0.85


@dataclass
class Medidas:
    vol_u: Optional[float] = None        # m³ por unidad base
    peso_u: Optional[float] = None       # kg por unidad base
    niveles: Dict[str, Tuple[float, Optional[Tuple[float, float, float]], Optional[float]]] = field(default_factory=dict)
    # nivel → (unidades, (largo, ancho, alto) en cm, peso kg)


@dataclass
class Espacio:
    ubicacion_id: int
    codigo: str
    dims_cm: Optional[Tuple[float, float, float]]
    cap_m3: Optional[float]
    cap_kg: Optional[float]
    aprovechamiento: float
    ocupado_m3: float = 0.0
    ocupado_kg: float = 0.0
    camino_m3: float = 0.0
    camino_kg: float = 0.0
    sin_medidas: List[int] = field(default_factory=list)          # productos en la posición sin medidas
    productos: Dict[int, float] = field(default_factory=dict)      # producto → unidades

    @property
    def util_m3(self) -> Optional[float]:
        return self.cap_m3 * self.aprovechamiento if self.cap_m3 else None

    @property
    def libre_m3(self) -> Optional[float]:
        return None if self.util_m3 is None else self.util_m3 - self.ocupado_m3 - self.camino_m3

    @property
    def libre_kg(self) -> Optional[float]:
        return None if not self.cap_kg else self.cap_kg - self.ocupado_kg - self.camino_kg

    def dict(self) -> dict:
        r = lambda v, d=3: None if v is None else round(v, d)  # noqa: E731
        return {"ubicacion_id": self.ubicacion_id, "codigo": self.codigo, "cap_m3": r(self.cap_m3), "util_m3": r(self.util_m3),
                "cap_kg": r(self.cap_kg, 1), "ocupado_m3": r(self.ocupado_m3), "ocupado_kg": r(self.ocupado_kg, 1),
                "camino_m3": r(self.camino_m3), "camino_kg": r(self.camino_kg, 1),
                "pct_m3": round((self.ocupado_m3 + self.camino_m3) / self.util_m3 * 100, 1) if self.util_m3 else None,
                "pct_kg": round((self.ocupado_kg + self.camino_kg) / self.cap_kg * 100, 1) if self.cap_kg else None,
                "con_medidas": self.cap_m3 is not None, "productos_sin_medidas": len(self.sin_medidas)}


async def medidas(db: AsyncSession, producto_ids: Iterable[int]) -> Dict[int, Medidas]:
    ids = set(producto_ids)
    out = {p: Medidas() for p in ids}
    for p in (await db.execute(select(WMSProducto).where(WMSProducto.id.in_(ids or {0})))).scalars():
        out[p.id].vol_u, out[p.id].peso_u = p.volumen_m3 or None, p.peso_kg or None
    for e in (await db.execute(select(WMSProductoEmpaque).where(WMSProductoEmpaque.producto_id.in_(ids or {0})))).scalars():
        m = out[e.producto_id]
        dims = (e.largo_cm, e.ancho_cm, e.alto_cm) if e.largo_cm and e.ancho_cm and e.alto_cm else None
        m.niveles[e.nivel] = (float(e.unidades or 1), dims, e.peso_kg)
        u = float(e.unidades or 1)
        if dims and (e.nivel == "UNIDAD" or m.vol_u is None):
            m.vol_u = cub.volumen_m3(*dims) / u
        if e.peso_kg and (e.nivel == "UNIDAD" or m.peso_u is None):
            m.peso_u = e.peso_kg / u
    return out


async def espacios(db: AsyncSession, ubicacion_ids: Iterable[int], aprovechamiento: float = APROVECHAMIENTO) -> Dict[int, Espacio]:
    ids = set(ubicacion_ids)
    if not ids:
        return {}
    out: Dict[int, Espacio] = {}
    for u in (await db.execute(select(WMSUbicacion).where(WMSUbicacion.id.in_(ids)))).scalars():
        dims = (u.largo_cm, u.ancho_cm, u.alto_cm) if u.largo_cm and u.ancho_cm and u.alto_cm else None
        out[u.id] = Espacio(u.id, u.codigo, dims, cub.volumen_m3(*dims) if dims else (u.capacidad_m3 or None),
                            u.capacidad_kg or None, aprovechamiento)
    stock = (await db.execute(select(
        WMSInventarioUbicacion.ubicacion_id, WMSInventarioUbicacion.producto_id,
        func.sum(WMSInventarioUbicacion.cantidad_disponible + WMSInventarioUbicacion.cantidad_reservada
                 + WMSInventarioUbicacion.cantidad_bloqueada)).where(
        WMSInventarioUbicacion.ubicacion_id.in_(ids)).group_by(
        WMSInventarioUbicacion.ubicacion_id, WMSInventarioUbicacion.producto_id))).all()
    camino = (await db.execute(select(WMSTarea.ubicacion_sugerida_id, WMSTarea.producto_id, func.sum(WMSTarea.cantidad)).where(
        WMSTarea.ubicacion_sugerida_id.in_(ids), WMSTarea.estado.in_(ABIERTAS),
        WMSTarea.tipo.in_(("REABASTECIMIENTO", "UBICACION", "MOVIMIENTO"))).group_by(
        WMSTarea.ubicacion_sugerida_id, WMSTarea.producto_id))).all()
    med = await medidas(db, {p for _, p, _ in stock} | {p for _, p, _ in camino})
    for uid, pid, q in stock:
        e, m, q = out[uid], med.get(pid), float(q or 0)
        if q <= 0:
            continue
        e.productos[pid] = e.productos.get(pid, 0) + q
        if m and m.vol_u:
            e.ocupado_m3 += q * m.vol_u
        elif pid not in e.sin_medidas:
            e.sin_medidas.append(pid)
        if m and m.peso_u:
            e.ocupado_kg += q * m.peso_u
    for uid, pid, q in camino:
        e, m, q = out[uid], med.get(pid), float(q or 0)
        if m and m.vol_u:
            e.camino_m3 += q * m.vol_u
        if m and m.peso_u:
            e.camino_kg += q * m.peso_u
    return out


def cuantas_caben(e: Espacio, m: Medidas, nivel: str = "UNIDAD") -> Tuple[Optional[float], List[str]]:
    """Unidades base del producto que caben en lo libre de la posición (None =
    sin límite conocido) y por qué se limita: volumen, peso o forma."""
    limites: List[Tuple[float, str]] = []
    if e.libre_m3 is not None and m.vol_u:
        limites.append((max(0.0, e.libre_m3) / m.vol_u, "volumen"))
    if e.libre_kg is not None and m.peso_u:
        limites.append((max(0.0, e.libre_kg) / m.peso_u, "peso"))
    # Forma: cuántos empaques del nivel del frente entran por medidas en la
    # posición vacía, en proporción a lo que queda libre de su volumen útil.
    unidades, dims, _ = m.niveles.get(nivel, (1.0, None, None))
    if e.dims_cm and dims and e.util_m3:
        n, _ = cub.cuantas_caben(e.dims_cm, dims)
        fraccion = max(0.0, (e.libre_m3 or 0) / e.util_m3)
        limites.append((math.floor(n * fraccion) * unidades, "forma"))
    if not limites:
        return None, []
    menor = min(v for v, _ in limites)
    return max(0.0, menor), [t for v, t in limites if v <= menor + 1e-9]
