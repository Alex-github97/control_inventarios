"""
Sesiones del lado del servidor (Redis).

POR QUÉ NO BASTA CON EL TOKEN
Un JWT vale hasta que vence: «Salir» solo lo borraba del navegador, y quien lo
hubiera copiado seguía entrando 8 horas. Cambiar la clave tampoco cerraba las
otras sesiones. Ahora cada token lleva un `sid` y la sesión vive aquí:

- Se cierra sola tras SESION_INACTIVIDAD_MIN sin actividad del usuario (OWASP
  ASVS 3.3.2 pide cierre por inactividad en aplicaciones con datos sensibles).
- Tiene un tope absoluto de SESION_MAXIMA_HORAS aunque se use sin parar.
- Salir, cambiar la clave, que un administrador la restablezca o desactive al
  usuario la borran de inmediato.

QUÉ CUENTA COMO ACTIVIDAD
No cualquier petición: las pantallas consultan solas cada tanto y con eso una
pestaña olvidada no se cerraría nunca. El navegador manda `X-Inactividad` con
los segundos desde la última vez que la persona tocó el teclado, el mouse o la
pantalla, y el vencimiento se fija en (última actividad + 10 min). Sin esa
cabecera la petición no extiende la sesión.

Si Redis no responde, se niega el acceso (falla cerrado): una sesión que no se
puede comprobar no se da por buena.
"""
import json
import logging
import secrets
import time
from typing import Optional

import redis.asyncio as redis
from fastapi import HTTPException, status

from app.core.config import settings

log = logging.getLogger(__name__)

_cliente: Optional[redis.Redis] = None
INACTIVIDAD_S = settings.SESION_INACTIVIDAD_MIN * 60
MAXIMA_S = settings.SESION_MAXIMA_HORAS * 3600

MENSAJE_INACTIVIDAD = "Su sesión se cerró por inactividad. Vuelva a ingresar."


def _r() -> redis.Redis:
    global _cliente
    if _cliente is None:
        _cliente = redis.from_url(settings.redis_sesiones_url, decode_responses=True, socket_timeout=2)
    return _cliente


def _k(sid: str) -> str:
    return f"tw:ses:{sid}"


def _k_fin(sid: str) -> str:
    # Por qué se cerró: se guarda una hora para decírselo a quien vuelva con
    # ese token («cerró sesión», «cambió la clave»), en vez de «inactividad».
    return f"tw:ses:fin:{sid}"


def _k_usuario(esquema: str, uid) -> str:
    return f"tw:ses:u:{esquema}:{uid}"


def _no_disponible(e: Exception) -> HTTPException:
    log.error("Redis no disponible para sesiones: %s", e)
    return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No se pudo validar la sesión. Intente de nuevo.")


async def crear(uid: int, esquema: str, cliente: Optional[str]) -> str:
    sid = secrets.token_urlsafe(32)
    ahora = int(time.time())
    try:
        async with _r().pipeline(transaction=True) as p:
            p.set(_k(sid), json.dumps({"uid": str(uid), "esq": esquema, "cli": cliente, "creada": ahora}),
                  ex=INACTIVIDAD_S)
            p.sadd(_k_usuario(esquema, uid), sid)
            p.expire(_k_usuario(esquema, uid), MAXIMA_S)
            await p.execute()
    except redis.RedisError as e:
        raise _no_disponible(e)
    return sid


def _sin_sesion(detalle: str = MENSAJE_INACTIVIDAD) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detalle, headers={"WWW-Authenticate": "Bearer"})


async def validar(payload: dict, inactividad: Optional[str]) -> None:
    """Exige que la sesión del token siga viva y, si hubo actividad, la extiende."""
    sid = payload.get("sid")
    if not sid:
        # Tokens emitidos antes de las sesiones: se vuelve a ingresar.
        raise _sin_sesion("Su sesión venció. Vuelva a ingresar.")
    try:
        crudo = await _r().get(_k(sid))
        if crudo is None:
            raise _sin_sesion(await _r().get(_k_fin(sid)) or MENSAJE_INACTIVIDAD)
        datos = json.loads(crudo)
        # El token y la sesión tienen que ser de la misma persona y empresa.
        if datos.get("uid") != str(payload.get("sub")) or datos.get("esq") != payload.get("esq"):
            raise _sin_sesion("Sesión inválida. Vuelva a ingresar.")
        ahora = int(time.time())
        if ahora - int(datos.get("creada", ahora)) > MAXIMA_S:
            await cerrar(sid, "Su sesión llegó al tiempo máximo. Vuelva a ingresar.")
            raise _sin_sesion("Su sesión llegó al tiempo máximo. Vuelva a ingresar.")
        if inactividad is not None:
            try:
                segundos = min(max(int(float(inactividad)), 0), INACTIVIDAD_S)
            except ValueError:
                segundos = INACTIVIDAD_S
            vence = ahora - segundos + INACTIVIDAD_S
            if vence <= ahora:
                await cerrar(sid)
                raise _sin_sesion()
            # GT: nunca acorta un vencimiento que otra pestaña ya extendió.
            await _r().expireat(_k(sid), vence, gt=True)
    except redis.RedisError as e:
        raise _no_disponible(e)


async def cerrar(sid: Optional[str], motivo: Optional[str] = None) -> None:
    if not sid:
        return
    try:
        async with _r().pipeline(transaction=True) as p:
            p.delete(_k(sid))
            if motivo:
                p.set(_k_fin(sid), motivo, ex=3600)
            await p.execute()
    except redis.RedisError as e:
        log.warning("No se pudo cerrar la sesión: %s", e)


async def cerrar_de_usuario(esquema: str, uid, excepto: Optional[str] = None,
                            motivo: str = "Su acceso cambió. Vuelva a ingresar.") -> int:
    """Cierra todas las sesiones de un usuario (cambio o reseteo de clave,
    desactivación). `excepto` deja viva la de quien hizo el cambio."""
    try:
        sids = await _r().smembers(_k_usuario(esquema, uid))
        cerrar_ = [s for s in sids if s != excepto]
        if cerrar_:
            async with _r().pipeline(transaction=True) as p:
                p.delete(*[_k(s) for s in cerrar_])
                for s in cerrar_:
                    p.set(_k_fin(s), motivo, ex=3600)
                p.srem(_k_usuario(esquema, uid), *cerrar_)
                await p.execute()
        return len(cerrar_)
    except redis.RedisError as e:
        raise _no_disponible(e)


# ─── Freno a la adivinación de claves ────────────────────────────────────────
# OWASP ASVS 2.2.1: limitar los intentos fallidos. Por usuario (frena el ataque
# a una cuenta) y por IP (frena probar una clave en muchas cuentas). No bloquea
# la cuenta para siempre —eso permitiría a cualquiera dejar sin acceso a otro—:
# la pausa dura VENTANA_S y se levanta sola.
MAX_FALLOS_USUARIO = 5
MAX_FALLOS_IP = 20
VENTANA_S = 15 * 60


def _k_fallos(tipo: str, valor: str) -> str:
    return f"tw:login:{tipo}:{valor}"


async def exigir_intentos(cliente: str, usuario: str, ip: str) -> None:
    try:
        n_u, n_ip = await _r().mget(_k_fallos("u", f"{cliente}:{usuario.lower()}"), _k_fallos("ip", ip))
    except redis.RedisError as e:
        raise _no_disponible(e)
    if int(n_u or 0) >= MAX_FALLOS_USUARIO or int(n_ip or 0) >= MAX_FALLOS_IP:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            "Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.",
                            headers={"Retry-After": str(VENTANA_S)})


async def anotar_fallo(cliente: str, usuario: str, ip: str) -> None:
    try:
        async with _r().pipeline(transaction=True) as p:
            for k in (_k_fallos("u", f"{cliente}:{usuario.lower()}"), _k_fallos("ip", ip)):
                p.incr(k)
                p.expire(k, VENTANA_S)
            await p.execute()
    except redis.RedisError as e:
        log.warning("No se pudo anotar el intento fallido: %s", e)


async def limpiar_fallos(cliente: str, usuario: str) -> None:
    try:
        await _r().delete(_k_fallos("u", f"{cliente}:{usuario.lower()}"))
    except redis.RedisError:
        pass


# ─── Herramientas y pruebas ───────────────────────────────────────────────────

def token_de_herramienta(subject, expires_delta=None, cliente: Optional[str] = None,
                         esquema: Optional[str] = None, usuario: Optional[str] = None,
                         depositante: Optional[int] = None) -> str:
    """Token con sesión viva para los guiones de `tools/` y `tests/`.

    Firmar un token a mano ya no basta: sin su sesión en Redis la API lo
    rechaza. Esto la abre (con el cliente síncrono, porque los guiones arman el
    token al importarse) y devuelve el token atado a ella. Solo lo puede usar
    quien ya tiene la SECRET_KEY, o sea, quien corre dentro del servidor.
    """
    import redis as redis_sync
    from app.core.security import create_access_token
    sid = secrets.token_urlsafe(32)
    r = redis_sync.from_url(settings.redis_sesiones_url, decode_responses=True, socket_timeout=2)
    r.set(_k(sid), json.dumps({"uid": str(subject), "esq": esquema, "cli": cliente, "creada": int(time.time())}),
          ex=INACTIVIDAD_S)
    return create_access_token(subject, expires_delta, cliente=cliente, esquema=esquema, usuario=usuario,
                               depositante=depositante, sesion=sid)
