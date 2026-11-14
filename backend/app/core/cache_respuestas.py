"""
Guarda la respuesta de los informes pesados y la repite mientras nada cambie.

POR QUÉ
Con una flota grande, la proyección de llantas o la predicción de fallas tardan
de 5 a 20 s de CPU, y el servidor tiene 2 núcleos: dos o tres personas abriendo
el mismo tablero dejaban lenta la plataforma para todos (medido el 2026-11-14,
`tools/medir_rutas_consulta.py`). El cálculo es el mismo para todos los usuarios
de la empresa y solo cambia cuando alguien registra algo.

LA REGLA
  · Lo guardado es la respuesta TAL COMO SALIÓ: los mismos bytes que FastAPI
    armó la primera vez (JSON, Excel o PDF). No hay segunda serialización que
    pueda diferir de la original.
  · Cada empresa tiene un contador de versión de sus datos. Toda petición que
    escribe (POST, PUT, PATCH, DELETE) y termina bien lo sube, y la versión
    forma parte de la llave: después de cualquier registro, lo guardado deja de
    usarse. No hay «datos de hace diez minutos» por culpa de esta memoria.
  · Además vence a los `minutos` indicados y la llave lleva la fecha: cubre lo
    que cambia sin que nadie escriba (el día, o una tarea de fondo).
  · La sesión y los permisos se comprueban SIEMPRE: la respuesta guardada la
    entrega la propia ruta, después de sus dependencias, no un atajo anterior.
  · Si dos personas piden lo mismo a la vez, se calcula una sola vez y la
    segunda espera ese resultado.
  · Sin Redis, o si falla, se calcula como siempre. Nunca es motivo de error.

CUÁNDO NO USARLO
En rutas cuya respuesta dependa de QUIÉN pregunta (y no solo de la empresa y de
los parámetros): la llave no lleva el usuario. Cuando llegue la restricción por
jerarquía de activos, el alcance del usuario tiene que entrar en la llave.

USO
    @router.get("/plan")
    @en_cache(minutos=10)
    async def plan(meses: int = 6, db: AsyncSession = Depends(get_db)): ...
"""
import asyncio
import dataclasses
import enum
import functools
import hashlib
import inspect
import json
import logging
import time
import zlib
from contextvars import ContextVar
from datetime import date, datetime
from typing import Any, Dict, Optional

import redis.asyncio as redis
from fastapi import BackgroundTasks, Request, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.tenant import esquema_actual

log = logging.getLogger("uvicorn.error")

TOPE_CUERPO = 12 * 1024 * 1024      # sin comprimir; más grande no se guarda
TOPE_GUARDADO = 4 * 1024 * 1024     # comprimido (un Excel ya viene comprimido)
ESPERA_OTRO_PROCESO = 45.0          # s que se espera a que otro proceso termine el mismo cálculo
_NO_REPETIR = {b"content-length", b"content-encoding", b"vary"}

# La petición en curso. El middleware crea la caja y la ruta la llena: es un
# diccionario compartido porque un ContextVar no viaja de la ruta hacia afuera.
_caja: ContextVar[Optional[Dict[str, Any]]] = ContextVar("cache_respuestas_caja", default=None)
_en_curso: Dict[str, asyncio.Event] = {}
_cliente: Optional[redis.Redis] = None
_espacio = {"hay": True, "visto": 0.0}


def _r() -> redis.Redis:
    global _cliente
    if _cliente is None:
        _cliente = redis.from_url(settings.REDIS_URL, socket_timeout=2, socket_connect_timeout=2)
    return _cliente


async def _hay_espacio() -> bool:
    """Las sesiones viven en el mismo Redis: esta memoria no puede llenarlo y
    hacer que expulse a alguien. Pasado el 60 % del tope, deja de guardar."""
    if time.monotonic() - _espacio["visto"] > 30:
        _espacio["visto"] = time.monotonic()
        try:
            info = await _r().info("memory")
            tope = int(info.get("maxmemory") or 0)
            _espacio["hay"] = not tope or int(info.get("used_memory") or 0) < tope * 0.6
        except Exception:  # noqa: BLE001
            _espacio["hay"] = False
    return _espacio["hay"]


class _SinLlave(Exception):
    """Un parámetro que no se sabe describir: esa petición no se guarda."""


def _valor_llave(v: Any):
    if v is None or isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, (list, tuple, set, frozenset)):
        return [_valor_llave(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _valor_llave(x) for k, x in sorted(v.items(), key=lambda kv: str(kv[0]))}
    if dataclasses.is_dataclass(v) and not isinstance(v, type):
        return {"__": type(v).__name__, **_valor_llave(dataclasses.asdict(v))}
    if isinstance(v, BaseModel):
        return {"__": type(v).__name__, **_valor_llave(v.model_dump(mode="json"))}
    if isinstance(v, enum.Enum):
        return _valor_llave(v.value)
    raise _SinLlave(type(v).__name__)


# Lo que una ruta recibe y no describe lo pedido.
_AJENOS = (AsyncSession, Response, Request, BackgroundTasks)


def _llave(funcion, esquema: str, version: str, argumentos: Dict[str, Any]) -> str:
    # Entran TODOS los parámetros, también los que llegan como objeto (los
    # filtros de llanta): dejar uno fuera sería entregar el informe de otro
    # filtro. Si alguno no se puede describir, no se guarda (`_SinLlave`).
    simples = {k: _valor_llave(v) for k, v in sorted(argumentos.items()) if not isinstance(v, _AJENOS)}
    firma = json.dumps(simples, sort_keys=True, ensure_ascii=False)
    resumen = hashlib.sha1(firma.encode()).hexdigest()
    return f"resp:{esquema}:{version}:{date.today().isoformat()}:{funcion.__module__}.{funcion.__qualname__}:{resumen}"


async def version_de(esquema: str) -> str:
    v = await _r().get(f"datosver:{esquema}")
    return v.decode() if v else "0"


async def subir_version(esquema: Optional[str]) -> None:
    """Los datos de la empresa cambiaron: lo guardado hasta ahora ya no sirve."""
    try:
        await _r().incr(f"datosver:{esquema or 'public'}")
    except Exception:  # noqa: BLE001
        pass


def _empacar(cabeceras, cuerpo: bytes) -> bytes:
    cab = json.dumps([[k.decode("latin-1"), v.decode("latin-1")] for k, v in cabeceras
                      if k.lower() not in _NO_REPETIR]).encode()
    return len(cab).to_bytes(4, "big") + cab + zlib.compress(cuerpo, 6)


def _desempacar(dato: bytes) -> Response:
    n = int.from_bytes(dato[:4], "big")
    cabeceras = json.loads(dato[4:4 + n])
    respuesta = Response(content=zlib.decompress(dato[4 + n:]), status_code=200)
    # Las de la respuesta original mandan (tipo de contenido, nombre del archivo,
    # totales de paginación); `Response` solo pone por su cuenta el tamaño.
    del respuesta.headers["content-length"]
    for k, v in cabeceras:
        respuesta.raw_headers.append((k.encode("latin-1"), v.encode("latin-1")))
    respuesta.headers["content-length"] = str(len(respuesta.body))
    respuesta.headers["x-tittan-cache"] = "guardada"
    return respuesta


async def _leer(clave: str) -> Optional[Response]:
    dato = await _r().get(clave)
    return _desempacar(dato) if dato else None


def en_cache(minutos: int = 10):
    """Decorador de una ruta GET `async` cuya respuesta depende solo de la
    empresa y de sus parámetros. Va DEBAJO de `@router.get(...)`."""
    def decorar(funcion):
        if not inspect.iscoroutinefunction(funcion):
            raise TypeError("en_cache solo admite rutas async")

        @functools.wraps(funcion)
        async def envoltura(*args, **kwargs):
            caja = _caja.get()
            if caja is None or caja.get("clave"):
                return await funcion(*args, **kwargs)
            try:
                esquema = esquema_actual() or "public"
                clave = _llave(funcion, esquema, await version_de(esquema), kwargs)
                guardada = await _leer(clave)
                if guardada is None and clave in _en_curso:
                    # Alguien en este mismo proceso ya lo está calculando.
                    try:
                        await asyncio.wait_for(_en_curso[clave].wait(), 120)
                    except asyncio.TimeoutError:
                        pass
                    guardada = await _leer(clave)
                if guardada is None and not await _r().set(f"calc:{clave}", b"1", nx=True, ex=120):
                    # Lo calcula otro proceso: se espera su resultado un rato.
                    limite = time.monotonic() + ESPERA_OTRO_PROCESO
                    while guardada is None and time.monotonic() < limite:
                        await asyncio.sleep(0.4)
                        guardada = await _leer(clave)
                        if guardada is None and not await _r().exists(f"calc:{clave}"):
                            break
                if guardada is not None:
                    return guardada
                if await _hay_espacio():
                    caja.update(clave=clave, vence=minutos * 60, evento=asyncio.Event())
                    _en_curso[clave] = caja["evento"]
            except _SinLlave as e:
                log.warning("cache_respuestas: %s no se guarda, parámetro %s", funcion.__qualname__, e)
            except Exception as e:  # noqa: BLE001
                log.warning("cache_respuestas: sin memoria de respuestas (%s)", e)
            return await funcion(*args, **kwargs)
        return envoltura
    return decorar


class CacheDeRespuestas:
    """Middleware ASGI más interno: guarda la respuesta de las rutas marcadas
    con `en_cache` y sube la versión de los datos cuando una petición escribe.

    Va por dentro de la compresión, para guardar el cuerpo sin comprimir.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        escribe = scope.get("method") not in ("GET", "HEAD", "OPTIONS")
        caja: Dict[str, Any] = {}
        ficha = _caja.set(caja)
        r = {"estado": 0, "cabeceras": [], "trozos": [], "peso": 0, "completa": False}

        async def enviar(mensaje):
            if mensaje["type"] == "http.response.start":
                r["estado"], r["cabeceras"] = mensaje["status"], list(mensaje.get("headers") or [])
                if escribe and r["estado"] < 400:
                    # Antes de contestar: quien reciba el «guardado» y consulte
                    # enseguida ya no puede encontrarse con lo anterior.
                    await subir_version(esquema_actual())
            elif mensaje["type"] == "http.response.body" and caja.get("clave") and r["estado"] == 200:
                cuerpo = mensaje.get("body") or b""
                r["peso"] += len(cuerpo)
                if r["peso"] <= TOPE_CUERPO:
                    r["trozos"].append(cuerpo)
                if not mensaje.get("more_body"):
                    r["completa"] = True
            await send(mensaje)

        try:
            await self.app(scope, receive, enviar)
        finally:
            _caja.reset(ficha)
            if escribe and r["estado"] and r["estado"] < 400:
                # Y otra vez al terminar, por si la transacción se confirmó
                # después de empezar a contestar.
                await subir_version(esquema_actual())
            clave = caja.get("clave")
            if clave:
                try:
                    if r["completa"] and r["peso"] <= TOPE_CUERPO:
                        dato = _empacar(r["cabeceras"], b"".join(r["trozos"]))
                        if len(dato) <= TOPE_GUARDADO:
                            await _r().set(clave, dato, ex=caja["vence"])
                    await _r().delete(f"calc:{clave}")
                except Exception as e:  # noqa: BLE001
                    log.warning("cache_respuestas: no se pudo guardar (%s)", e)
                finally:
                    _en_curso.pop(clave, None)
                    caja["evento"].set()
