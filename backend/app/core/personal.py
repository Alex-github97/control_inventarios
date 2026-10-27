"""
Quién puede recibir tareas de bodega, sin módulo de personal (WFM).

Las tareas dirigidas vienen de Daily Logistics, donde se apoyan en las
«jornadas» de su módulo de personal: la persona marca entrada en una estación
y solo entonces el sistema le entrega tareas, con el almacén, las funciones y
las zonas de esa estación. Aquí no hay ese módulo (Gestión humana lleva la
nómina, no el turno en bodega), así que este archivo ofrece la misma interfaz
con una regla más simple:

- **Está disponible** quien tiene el usuario activo y sin bloquear, y un rol con
  el permiso del WMS (o es administrador): `operario_disponible`.
- **Su jornada** es virtual: no tiene id ni se guarda. El almacén sale del que
  la persona elige en pantalla; si no elige, del de su última tarea, y si la
  empresa tiene un solo almacén, de ese.
- **Su alcance** son todas las funciones del WMS en todas las zonas.

El día que exista el WFM, este archivo es lo único que hay que reemplazar: las
tareas llaman a estas mismas funciones.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.rol import Rol
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import WMSAlmacen, WMSTarea

FUNCIONES_WMS = ("UBICACION", "REABASTECIMIENTO", "MOVIMIENTO")


@dataclass
class JornadaVirtual:
    usuario_id: int
    almacen_id: int
    id: Optional[int] = None
    estado: str = "ACTIVA"
    estacion_id: Optional[int] = None
    funciones: List[str] = field(default_factory=lambda: list(FUNCIONES_WMS))
    zonas: List[int] = field(default_factory=list)
    montacargas: bool = True


def ahora() -> datetime:
    return datetime.now(timezone.utc)


async def operario_disponible(db: AsyncSession, usuario_id: Optional[int]) -> bool:
    """Usuario activo, sin bloquear y con permiso del WMS."""
    if not usuario_id:
        return False
    u = await db.get(Usuario, usuario_id)
    if u is None or not u.activo or u.bloqueado or getattr(u, "deleted_at", None):
        return False
    if (u.rol or "").upper() == "ADMINISTRADOR":
        return True
    rol = await db.get(Rol, u.rol_id) if u.rol_id else None
    return bool(rol and (rol.permisos or {}).get("wms"))


async def _almacen_de(db: AsyncSession, usuario_id: int) -> Optional[int]:
    ultima = (await db.execute(select(WMSTarea.almacen_id).where(WMSTarea.operario_id == usuario_id)
                               .order_by(WMSTarea.id.desc()).limit(1))).scalar()
    if ultima:
        return ultima
    activos = (await db.execute(select(WMSAlmacen.id).where(WMSAlmacen.activo.isnot(False)).limit(2))).scalars().all()
    return activos[0] if len(activos) == 1 else None


async def jornada_abierta(db: AsyncSession, usuario_id: Optional[int],
                          almacen_id: Optional[int] = None) -> Optional[JornadaVirtual]:
    """La «jornada» de la persona si puede recibir tareas; None si no."""
    if not await operario_disponible(db, usuario_id):
        return None
    almacen = almacen_id or await _almacen_de(db, usuario_id)
    if almacen is None:
        return None
    return JornadaVirtual(usuario_id=usuario_id, almacen_id=almacen)


async def alcance(db: AsyncSession, j: JornadaVirtual) -> dict:
    return {"estacion": None, "almacen_id": j.almacen_id, "funciones": list(j.funciones),
            "zonas": list(j.zonas), "montacargas": j.montacargas}


async def cerrar_olvidadas(db: AsyncSession, horas: int = 14) -> int:
    """Sin jornadas no hay nada que cerrar."""
    return 0
