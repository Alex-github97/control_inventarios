"""
Qué módulos carga ESTE servidor, y qué empresas tienen contratado cada uno.

POR QUÉ
Cada proceso de uvicorn importaba los 21 módulos aunque el servidor solo
atendiera clientes de Gestión de Activos: unos 330 MB por proceso en código que
nadie llamaba (medido el 2026-11-13; 4 procesos = 1,3 GB de 8). Y las tareas de
fondo recorrían todas las empresas cada 10-60 s, tuvieran o no el módulo.

LA REGLA
  · `MODULOS_SERVIDOR` vacío (por omisión) = se cargan todos, como siempre.
  · Con una lista («eam,tarifax») se cargan esos, sus dependencias y «base».
  · Una ruta de un módulo no cargado responde 404 con un mensaje claro (lo
    decide `acceso_modulos.py`), en vez de un 404 mudo.
  · Contratarle a una empresa un módulo que este servidor no carga no lo
    enciende: hay que agregarlo a la variable y reiniciar.
"""
import logging
import time
from typing import Dict, FrozenSet, List, Optional, Tuple

from sqlalchemy import text

from app.core.config import settings
from app.core.modulos import ESENCIALES, POR_CLAVE

log = logging.getLogger(__name__)

# Lo que una pantalla de un módulo lee de otro (ver CRUCES en permisos_ruta.py).
# Cargar el módulo arrastra estos, o la pantalla quedaría a medias.
DEPENDENCIAS: Dict[str, Tuple[str, ...]] = {
    "tms": ("gh",),              # conductores de Gestión Humana
    "pos": ("wms", "erp"),       # bodegas del WMS, resoluciones y notas del ERP
    "reencauche": ("wms", "tms"),  # bodegas y recogidas
}


def _calcular() -> Optional[FrozenSet[str]]:
    crudo = (settings.MODULOS_SERVIDOR or "").strip()
    if not crudo or crudo in ("*", "todos"):
        return None
    pedidos = {p.strip().lower() for p in crudo.split(",") if p.strip()}
    desconocidos = pedidos - set(POR_CLAVE)
    if desconocidos:
        # Mejor arrancar con todo que dejar fuera a un cliente por un error de tipeo.
        log.error("MODULOS_SERVIDOR trae módulos desconocidos %s: se cargan todos.", sorted(desconocidos))
        return None
    pendientes, total = list(pedidos), set(pedidos)
    while pendientes:
        for dep in DEPENDENCIAS.get(pendientes.pop(), ()):
            if dep not in total:
                total.add(dep)
                pendientes.append(dep)
    return frozenset(total | set(ESENCIALES))


_CARGADOS = _calcular()


def cargados() -> Optional[FrozenSet[str]]:
    """Los módulos de este servidor, o None si son todos."""
    return _CARGADOS


def cargado(clave: Optional[str]) -> bool:
    """`None` (rutas sin módulo: auth, plataforma, landing…) siempre está."""
    return clave is None or _CARGADOS is None or clave in _CARGADOS


# ── Empresas que tienen un módulo ───────────────────────────────────────────
_cache: Dict[str, Tuple[List[str], float]] = {}
_VIGENCIA = 60.0


async def esquemas_con(modulo: str) -> List[str]:
    """Esquemas de las empresas activas con `modulo` contratado.

    Una empresa sin ninguna fila de módulos se trata como «todo contratado»,
    igual que en `acceso_modulos.modulos_de`. Siempre incluye `public` (la
    instalación de un solo cliente), que cada tarea descarta si no tiene sus
    tablas. Se recuerda un minuto: las tareas de fondo lo piden en cada vuelta.
    """
    guardado = _cache.get(modulo)
    if guardado and time.monotonic() - guardado[1] < _VIGENCIA:
        return guardado[0]
    from app.core.database import engine
    async with engine.connect() as c:
        if not (await c.execute(text("SELECT to_regclass('public.plataforma_cliente')"))).scalar():
            return ["public"]
        filas = (await c.execute(text("""
            SELECT c.esquema FROM public.plataforma_cliente c
             WHERE c.activo AND c.esquema IS NOT NULL
               AND (EXISTS (SELECT 1 FROM public.plataforma_modulo_cliente m
                             WHERE m.cliente_id = c.id AND m.modulo = :m AND m.activo)
                    OR NOT EXISTS (SELECT 1 FROM public.plataforma_modulo_cliente m
                                    WHERE m.cliente_id = c.id))
             ORDER BY c.esquema"""), {"m": modulo})).all()
    esquemas = list(dict.fromkeys(["public", *[f[0] for f in filas]]))
    _cache[modulo] = (esquemas, time.monotonic())
    return esquemas
