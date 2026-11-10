"""
Hace cumplir qué módulos tiene contratados cada empresa.

Ocultar un módulo en el menú no es control de acceso: quien escriba la URL a
mano entra igual. La comprobación tiene que estar del lado del servidor, y por
eso vive acá y se aplica a toda petición de la API.

El resultado se guarda en memoria por unos segundos porque, si no, cada
petición del portal costaría una consulta extra solo para volver a preguntar lo
mismo. Cuando el operador cambia los módulos de una empresa llama a `olvidar()`,
así que el cambio se ve de inmediato y no dentro de un minuto.
"""
import logging
import re
import time
from typing import Dict, Optional, Set, Tuple

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.modulos import ESENCIALES, POR_CLAVE, modulo_de_ruta
from app.core.permisos_ruta import claves_de_ruta, permitido
from app.core.security import decode_token
from app.core.tenant import ESQUEMA_PLATAFORMA

# código de empresa -> (módulos, momento en que se leyó)
_cache: Dict[str, Tuple[Set[str], float]] = {}
_VIGENCIA = 30.0  # segundos


log = logging.getLogger("uvicorn.error")

# (esquema, id de usuario) -> ((rol, permisos), momento en que se leyó)
_perfiles: Dict[Tuple[str, int], Tuple[Tuple[Optional[str], dict], float]] = {}
_ESQUEMA_VALIDO = re.compile(r"^[a-z0-9_]{1,63}$")


def olvidar_perfiles() -> None:
    """Descarta los perfiles memorizados. Se llama al guardar un perfil o un
    usuario, para que un permiso quitado deje de valer de inmediato en este
    proceso (en los demás, a más tardar en `_VIGENCIA` segundos)."""
    _perfiles.clear()


async def perfil_de(esquema: str, uid: int) -> Tuple[Optional[str], dict]:
    """Rol y permisos del usuario, tal como los lee el portal: de su perfil."""
    clave = (esquema, uid)
    guardado = _perfiles.get(clave)
    if guardado and (time.monotonic() - guardado[1]) < _VIGENCIA:
        return guardado[0]
    if not _ESQUEMA_VALIDO.match(esquema):
        return (None, {})
    async with AsyncSessionLocal() as s:
        fila = (await s.execute(text(
            f'SELECT u.rol, r.permisos FROM "{esquema}".usuarios u '
            f'LEFT JOIN "{esquema}".roles r ON r.id = u.rol_id WHERE u.id = :id'), {"id": uid})).first()
    valor = (str(fila[0]) if fila and fila[0] else None, (fila[1] if fila and isinstance(fila[1], dict) else {}))
    _perfiles[clave] = (valor, time.monotonic())
    return valor


def olvidar(codigo: Optional[str] = None) -> None:
    """Descarta lo memorizado, para que el próximo acceso lo vuelva a leer."""
    if codigo is None:
        _cache.clear()
    else:
        _cache.pop(codigo, None)


async def modulos_de(codigo: str) -> Set[str]:
    """Los módulos activos de una empresa, con los esenciales siempre incluidos."""
    guardado = _cache.get(codigo)
    if guardado and (time.monotonic() - guardado[1]) < _VIGENCIA:
        return guardado[0]

    async with AsyncSessionLocal() as s:
        await s.execute(text(f'SET search_path TO "{ESQUEMA_PLATAFORMA}"'))
        r = await s.execute(text(
            "SELECT m.modulo FROM plataforma_modulo_cliente m "
            "JOIN plataforma_cliente c ON c.id = m.cliente_id "
            "WHERE c.codigo = :c AND m.activo"), {"c": codigo})
        contratados = {fila[0] for fila in r.all()}

        # Una empresa sin ninguna fila es una que se dio de alta antes de que
        # esto existiera. Negarle todo la dejaría fuera de su propia
        # plataforma, así que se le permite todo hasta que se le asigne algo.
        if not contratados:
            r2 = await s.execute(text(
                "SELECT count(*) FROM plataforma_modulo_cliente m "
                "JOIN plataforma_cliente c ON c.id = m.cliente_id WHERE c.codigo = :c"),
                {"c": codigo})
            if not (r2.scalar() or 0):
                contratados = {"*"}

    modulos = set(contratados) | set(ESENCIALES)
    _cache[codigo] = (modulos, time.monotonic())
    return modulos


class ModulosMiddleware(BaseHTTPMiddleware):
    """Corta las peticiones a módulos que la empresa no tiene contratados, y
    las que el perfil del usuario no permite (ver `permisos_ruta.py`)."""

    async def dispatch(self, request: Request, call_next):
        ruta = request.url.path
        if not ruta.startswith("/api/v1"):
            return await call_next(request)

        modulo = modulo_de_ruta(ruta)
        claves = claves_de_ruta(ruta, request.method)
        # Ruta que no pertenece a ningún módulo ni pide permiso: no hay nada que
        # cobrar ni que negar, y `exigir_sesion` ya decide si necesita token.
        if (modulo is None or modulo in ESENCIALES) and not claves:
            return await call_next(request)

        auth = request.headers.get("authorization") or ""
        if not auth.lower().startswith("bearer "):
            return await call_next(request)   # sin sesión: lo resuelve la autenticación
        try:
            datos = decode_token(auth[7:])
        except Exception:
            return await call_next(request)   # token ilegible: lo resuelve la autenticación
        codigo = datos.get("cli")
        if not codigo:
            return await call_next(request)

        if modulo is not None and modulo not in ESENCIALES:
            permitidos = await modulos_de(str(codigo))
            if "*" not in permitidos and modulo not in permitidos:
                nombre = POR_CLAVE[modulo].nombre if modulo in POR_CLAVE else modulo
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"Su empresa no tiene contratado el módulo «{nombre}». "
                                       f"Consúltelo con su administrador."},
                )

        # El perfil de la persona. Solo para sesiones normales: los enlaces
        # firmados (APK) y el portal del depositante tienen sus propias reglas.
        if claves and datos.get("type") == "access" and not datos.get("dep") and datos.get("esq"):
            try:
                rol, permisos = await perfil_de(str(datos["esq"]), int(datos.get("sub")))
            except Exception:   # noqa: BLE001 — sin poder leer el perfil, decide el endpoint
                log.warning("Permisos de perfil: no se pudo leer el perfil de %s", datos.get("sub"))
                return await call_next(request)
            if not permitido(rol, permisos, claves):
                log.warning("Permiso de perfil denegado: usuario=%s empresa=%s %s %s pide %s",
                            datos.get("usr") or datos.get("sub"), codigo, request.method, ruta,
                            "/".join(claves))
                if settings.PERMISOS_PERFIL_MODO != "observar":
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Su perfil no tiene permiso para esta función. "
                                           "Pídale a su administrador que se lo asigne."},
                    )
        return await call_next(request)
