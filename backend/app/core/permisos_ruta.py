"""
Qué permiso de perfil exige cada ruta de la API.

Hasta acá los perfiles solo ocultaban pantallas: quien armaba la petición a mano
entraba a cualquier módulo contratado por su empresa, tuviera o no el permiso.
Este mapa es la otra mitad del control —la de la persona—, y lo hace cumplir el
mismo middleware que cobra los módulos contratados (`acceso_modulos.py`).

LA REGLA
  · ADMINISTRADOR pasa siempre (igual que en el portal).
  · Para el resto, la ruta pide una de las claves de su prefijo, y el perfil del
    usuario (`usuarios.rol_id → roles.permisos`) tiene que tener al menos una.
  · Las claves son las MISMAS que pide el portal para mostrar la pantalla
    (`ROUTE_PERM_MAP` en `App.tsx`): si el usuario ve la pantalla, la API le
    responde; si no la ve, tampoco.

LOS CRUCES ENTRE MÓDULOS
Algunas pantallas leen datos de otro módulo: el TMS elige conductores de Gestión
Humana, el POS usa las bodegas del WMS y las resoluciones de facturación del ERP.
Se buscaron con un barrido del frontend (noviembre de 2026) y se declaran abajo,
uno por uno. Si aparece otro, el registro del servidor lo dice («Permiso de
perfil denegado») y se agrega acá.
"""
from typing import Optional, Tuple

# Las claves de los módulos de operación: el Command Center resume todos, así
# que lo ve quien tenga cualquiera (es la misma regla del portal).
OPERACION = ("dashboard", "estibas", "movimientos", "manifiestos", "ft", "gf", "ml", "wms", "gh",
             "tms", "dms", "qms", "grc", "lms", "crm", "eam", "mes", "aps", "erp", "scm", "sst", "ags",
             "pos", "reencauche", "mantenimiento", "vehiculos")

# prefijo → claves que lo abren (basta una).
PREFIJOS: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    ("/estibas", ("estibas",)),
    ("/scan-sessions", ("estibas",)),
    ("/movimientos", ("movimientos",)),
    ("/manifiestos", ("manifiestos",)),
    ("/danos", ("danos",)),
    ("/trazabilidad", ("trazabilidad",)),
    ("/dashboard", ("dashboard",)),
    ("/ubicaciones", ("ubicaciones",)),
    ("/consultas", ("consultas",)),
    ("/grc", ("grc",)),
    ("/qms", ("qms",)),
    ("/dms", ("dms",)),
    ("/tms", ("tms",)),
    ("/fletes", ("ft", "tms")),
    ("/eam", ("eam",)),
    ("/lubricacion", ("eam",)),
    ("/movil", ("eam",)),
    # La flota y el mantenimiento viejo quedaron dentro del CMMS.
    ("/flota", ("gf", "eam")),
    ("/mantenimiento", ("mantenimiento", "eam")),
    ("/vehiculos", ("vehiculos", "eam", "tms")),
    ("/ags", ("ags",)),
    ("/pos", ("pos",)),
    ("/wms", ("wms",)),
    ("/reencauche", ("reencauche",)),
    ("/hcm", ("gh",)),
    ("/gh", ("gh",)),
    ("/lms", ("lms",)),
    ("/crm", ("crm",)),
    ("/mes", ("mes",)),
    ("/aps", ("aps",)),
    ("/erp", ("erp",)),
    ("/scm", ("scm",)),
    ("/sst", ("sst",)),
    ("/locative", ("ml",)),
    ("/command-center", OPERACION),
    ("/tittanbot", ("asistente",)),
)

# Cruces: (prefijo, métodos, claves que se suman). `None` = cualquier método.
CRUCES: Tuple[Tuple[str, Optional[Tuple[str, ...]], Tuple[str, ...]], ...] = (
    ("/hcm/conductores", ("GET",), ("tms",)),
    ("/wms/almacenes", ("GET",), ("pos", "reencauche", "eam")),
    ("/erp/resoluciones", None, ("pos",)),
    ("/erp/notas-credito", None, ("pos",)),
    ("/reencauche/recogidas", None, ("tms",)),
    ("/dashboard", ("GET",), ("sst",)),
    ("/eam/vehiculos-combinados", ("GET",), ("tms",)),
)

# Lo que no pide permiso aunque caiga en un prefijo de módulo: la descarga de la
# app móvil (la usa cualquiera con sesión) y su versión.
LIBRES = ("/movil/version", "/movil/enlace-descarga", "/movil/descarga", "/movil/apk/")

# Administración de la propia empresa: leer la lista de usuarios lo necesitan
# muchas pantallas (asignar un técnico, un responsable), pero crear, cambiar o
# borrar usuarios y perfiles es repartir poder.
ADMINISTRACION = ("/usuarios", "/roles")


def _coincide(resto: str, prefijo: str) -> bool:
    return resto == prefijo or resto.startswith(prefijo + "/") or resto.startswith(prefijo + "?")


def claves_de_ruta(ruta: str, metodo: str) -> Optional[Tuple[str, ...]]:
    """Las claves de perfil que abren esta ruta (basta una), o None si no pide ninguna."""
    resto = ruta.split("/api/v1", 1)[-1] if "/api/v1" in ruta else ruta
    metodo = metodo.upper()
    if metodo == "OPTIONS":
        return None
    if any(resto.startswith(l) or resto == l.rstrip("/") for l in LIBRES):
        return None
    if any(_coincide(resto, p) for p in ADMINISTRACION):
        return None if metodo == "GET" else ("usuarios",)

    mejor: Optional[Tuple[str, Tuple[str, ...]]] = None
    for prefijo, claves in PREFIJOS:
        if _coincide(resto, prefijo) and (mejor is None or len(prefijo) > len(mejor[0])):
            mejor = (prefijo, claves)
    if mejor is None:
        return None
    claves = mejor[1]
    for prefijo, metodos, extra in CRUCES:
        if _coincide(resto, prefijo) and (metodos is None or metodo in metodos):
            claves = claves + extra
    return claves


def permitido(rol: Optional[str], permisos: Optional[dict], claves: Tuple[str, ...]) -> bool:
    if (rol or "").upper() == "ADMINISTRADOR":
        return True
    p = permisos or {}
    return any(p.get(c) for c in claves)
