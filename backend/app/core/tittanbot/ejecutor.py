"""
Ejecuta las herramientas de TittanBot y deja cada una en la bitácora.

LA PIEZA DE SEGURIDAD
Las acciones no escriben en la base: hacen una llamada HTTP interna a la propia
API, en proceso (transporte ASGI, sin red), con el token del usuario. La
sub-petición atraviesa la misma pila que una pantalla del navegador —sesión,
empresa, módulo contratado, permiso de perfil, reglas del endpoint—, así que el
bot no puede hacer nada que el usuario no pueda hacer en pantalla. Encima, el
ejecutor vuelve a verificar el permiso de la herramienta antes de llamar.
"""
import asyncio
import json
import logging
from typing import Any, Dict, Optional

import httpx

from app.core.permisos_ruta import permitido
from app.core.tittanbot.herramientas import Contexto, Herramienta, resultado_corto, rol_de
from app.infrastructure.models.tittanbot import TittanbotAccion

log = logging.getLogger(__name__)


def puede(usuario, h: Herramienta) -> bool:
    return not h.permiso or permitido(rol_de(usuario), getattr(usuario, "permisos", None) or {}, h.permiso)


async def llamar_api(metodo: str, ruta: str, headers: Dict[str, str], cuerpo: Optional[dict] = None,
                     params: Optional[dict] = None) -> httpx.Response:
    """Sub-petición a la propia aplicación, en su propia tarea: así el cambio de
    esquema que hace la petición interna no toca el de la petición del chat."""
    from app.main import app   # diferido: app.main importa el router que importa esto

    cabeceras = {k: v for k, v in {
        "authorization": headers.get("authorization"),
        "x-cliente": headers.get("x-cliente"),
        "x-inactividad": "0",          # el bot no cuenta como actividad ni inactividad
        "content-type": "application/json",
    }.items() if v}

    async def ir() -> httpx.Response:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://tittanbot.interno", timeout=120) as cli:
            return await cli.request(metodo, ruta, headers=cabeceras, json=cuerpo, params=params)

    return await asyncio.create_task(ir())


def _detalle(resp: httpx.Response) -> Any:
    try:
        c = resp.json()
    except Exception:
        return resp.text[:500]
    return c.get("detail", c) if isinstance(c, dict) else c


async def consultar(h: Herramienta, args: dict, ctx: Contexto, conversacion_id: Optional[int]) -> Dict[str, Any]:
    if not puede(ctx.usuario, h):
        res = {"exito": False, "resultado": "El perfil del usuario no tiene permiso para esto."}
    else:
        try:
            datos = await h.consultar(ctx, args or {})
            res = {"exito": "error" not in datos, "resultado": resultado_corto(datos)}
        except Exception as e:   # noqa: BLE001 — se le cuenta al modelo y él se lo explica al usuario
            log.exception("TittanBot: falló la consulta %s", h.nombre)
            try:
                await ctx.db.rollback()
            except Exception:
                pass
            res = {"exito": False, "resultado": f"No se pudo consultar: {type(e).__name__}"}
    await anotar(ctx, conversacion_id, h.nombre, args, res, confirmada=False)
    return res


async def ejecutar_accion(h: Herramienta, args: dict, ctx: Contexto,
                          conversacion_id: Optional[int]) -> Dict[str, Any]:
    if not puede(ctx.usuario, h):
        res = {"exito": False, "resultado": "Su perfil no tiene permiso para esta acción. No se hizo nada."}
        await anotar(ctx, conversacion_id, h.nombre, args, res, confirmada=True)
        return res
    try:
        metodo, ruta, cuerpo = h.construir(args or {})
    except (KeyError, ValueError, TypeError) as e:
        res = {"exito": False, "resultado": f"Faltan datos para la acción: {e}"}
        await anotar(ctx, conversacion_id, h.nombre, args, res, confirmada=True)
        return res
    try:
        resp = await llamar_api(metodo, ruta, ctx.headers, cuerpo)
        ok = 200 <= resp.status_code < 300
        res = {"exito": ok, "resultado": resultado_corto(resp.json() if ok else _detalle(resp), 1500)}
    except Exception as e:   # noqa: BLE001
        log.exception("TittanBot: falló la acción %s", h.nombre)
        res = {"exito": False, "resultado": f"Error ejecutando la acción: {type(e).__name__}"}
    await anotar(ctx, conversacion_id, h.nombre, args, res, confirmada=True)
    return res


async def anotar(ctx: Contexto, conversacion_id, herramienta: str, args, res: dict, confirmada: bool) -> None:
    try:
        ctx.db.add(TittanbotAccion(
            conversacion_id=conversacion_id, usuario_id=ctx.usuario.id, herramienta=herramienta,
            argumentos=json.dumps(args or {}, ensure_ascii=False, default=str)[:2000],
            confirmada=confirmada, exito=bool(res.get("exito")), resultado=str(res.get("resultado", ""))[:2000]))
        await ctx.db.flush()
    except Exception:   # noqa: BLE001 — la bitácora no debe tumbar la acción
        log.warning("TittanBot: no se pudo anotar %s", herramienta)
