"""
El motor de TittanBot: un turno de chat, la confirmación de acciones y lo que
queda guardado.

EL BUCLE
Claude recibe el mensaje y las herramientas que el perfil del usuario abre. Las
consultas se ejecutan dentro del bucle y sus resultados vuelven al modelo. La
primera ACCIÓN que pida no se ejecuta: el turno termina, la acción queda guardada
en la conversación y el chat muestra una tarjeta «Confirmar / Cancelar». Solo
`confirmar()` la ejecuta, y ejecuta lo guardado —no lo que mande el navegador—.

LA HISTORIA
Entre turnos se guarda solo el texto. El siguiente turno parte de lo dicho, con
las consultas que haga falta repetir; es más barato que arrastrar los
resultados de herramientas de cada turno anterior, y no reenvía bloques de
razonamiento de turnos viejos.

LA CACHÉ
Herramientas y prompt fijo van primero y sin nada que cambie entre peticiones
(la fecha y el nombre del usuario van en un bloque aparte, después del punto de
caché). Con eso, de la segunda vuelta en adelante se paga una fracción.
"""
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

import anthropic
from fastapi import HTTPException
from sqlalchemy import select

from app.core import sesiones
from app.core.acceso_modulos import perfil_de
from app.core.config import settings
from app.core.tittanbot import ejecutor
from app.core.tittanbot.herramientas import POR_NOMBRE, Contexto, disponibles
from app.infrastructure.models.tittanbot import TittanbotConversacion, TittanbotMensaje

log = logging.getLogger(__name__)

PROMPT = """Eres TittanBot, el asistente de la plataforma TittanWare (software de operación logística y \
mantenimiento de flotas en Colombia). Hablas con una persona de una empresa cliente y actúas en su nombre, \
con sus mismos permisos: solo tienes las herramientas que su perfil permite.

Qué haces:
- Soporte: explicas cómo se hace algo en la plataforma. Para eso consulta guia_de_uso y responde con la ruta \
real del menú; no inventes pantallas ni botones. Si el usuario reporta un error o algo que no puedes resolver, \
ofrécele abrir un ticket con crear_ticket_soporte.
- Su día: con mi_dia le dices qué tiene pendiente (órdenes asignadas, vencidas, muestras de aceite, alertas) y \
por dónde empezar, lo más urgente primero.
- Consultas y reportería del mantenimiento (CMMS): órdenes, equipos, indicadores, lubricación. Las cifras \
vienen calculadas por el servidor: repórtalas tal cual, con su unidad, sin recalcular. Para contar usa el \
`total`, no la muestra. Si piden un Excel, un PDF o «mándame el informe», usa generar_reporte y confirma en \
una frase que quedó listo: el enlace lo ve el usuario en el chat.
- Acciones: crear órdenes, cambiar su estado, abrir tickets. Llama la herramienta en cuanto tengas los datos \
obligatorios: el sistema le muestra al usuario una tarjeta para Confirmar o Cancelar antes de ejecutar nada. \
No pidas confirmación por texto. Pregunta solo lo que falte y sea obligatorio.

Reglas:
- Nunca inventes datos, números de orden ni ids. Para referirte a un equipo, búscalo antes con buscar_activos; \
si hay varias coincidencias, pregunta cuál. Para una orden, consúltala con ver_orden.
- Si una herramienta devuelve un error o falta de permiso, dilo con claridad y propone cómo seguir. Nunca digas \
que algo se hizo si no se hizo.
- Si te piden algo de un módulo para el que no tienes herramientas, dilo: hoy cubres el mantenimiento (CMMS) y \
el soporte general.
- Responde corto, claro y en español de Colombia, tratando al usuario de usted. Usa listas cortas cuando ayuden. \
Cuando algo quede hecho, menciona su número."""


@dataclass
class Persona:
    """El usuario tal como lo ve el bot: con los permisos de su perfil, leídos
    igual que los lee el middleware que protege la API."""
    id: int
    username: str
    nombre_completo: str
    rol: str
    permisos: dict


async def _persona(usuario, esquema: str) -> Persona:
    rol, permisos = await perfil_de(esquema, usuario.id)
    return Persona(id=usuario.id, username=usuario.username,
                   nombre_completo=f"{usuario.nombre} {usuario.apellido}".strip(),
                   rol=rol or str(getattr(usuario, "rol", "")), permisos=permisos or {})


def configurado() -> bool:
    return bool(settings.TITTANBOT_API_KEY)


async def _consumir_cupo(esquema: str, uid: int) -> None:
    hoy = datetime.now().strftime("%Y%m%d")
    try:
        r = sesiones._r()
        por_usuario = await r.incr(f"tw:bot:{esquema}:{uid}:{hoy}")
        por_empresa = await r.incr(f"tw:bot:{esquema}:{hoy}")
        if por_usuario == 1:
            await r.expire(f"tw:bot:{esquema}:{uid}:{hoy}", 36 * 3600)
        if por_empresa == 1:
            await r.expire(f"tw:bot:{esquema}:{hoy}", 36 * 3600)
    except Exception:   # noqa: BLE001 — si Redis falla, no se bloquea el chat
        return
    if por_usuario > settings.TITTANBOT_TOPE_DIA:
        raise HTTPException(429, f"Llegó al límite de {settings.TITTANBOT_TOPE_DIA} mensajes a TittanBot por hoy.")
    if por_empresa > settings.TITTANBOT_TOPE_EMPRESA_DIA:
        raise HTTPException(429, "Su empresa llegó al límite diario de mensajes a TittanBot.")


async def _conversacion(db, uid: int, cid: Optional[int], primer_mensaje: str) -> TittanbotConversacion:
    if cid:
        c = await db.get(TittanbotConversacion, cid)
        if c and c.usuario_id == uid:
            return c
    c = TittanbotConversacion(usuario_id=uid, titulo=primer_mensaje[:80])
    db.add(c)
    await db.flush()
    return c


async def _historia(db, cid: int, limite: int = 20) -> List[dict]:
    filas = (await db.execute(select(TittanbotMensaje).where(TittanbotMensaje.conversacion_id == cid)
                              .order_by(TittanbotMensaje.id.desc()).limit(limite))).scalars().all()
    msgs = [{"role": "assistant" if m.rol == "asistente" else "user", "content": m.texto}
            for m in reversed(filas) if m.texto]
    # La API exige empezar por el usuario y alternar; se funden los seguidos.
    salida: List[dict] = []
    for m in msgs:
        if salida and salida[-1]["role"] == m["role"]:
            salida[-1]["content"] += "\n\n" + m["content"]
        elif salida or m["role"] == "user":
            salida.append(dict(m))
    if salida and salida[-1]["role"] == "user":
        salida.pop()     # el turno nuevo lo agrega `responder`
    return salida


def _sistema(persona: Persona, empresa: str) -> List[dict]:
    hoy = datetime.now()
    return [
        {"type": "text", "text": PROMPT, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": f"Empresa: {empresa}. Usuario: {persona.nombre_completo} "
                                 f"({persona.username}). Hoy es {hoy:%Y-%m-%d %H:%M}, hora de Colombia."},
    ]


# Los modelos que aceptan el respaldo automático del lado de Anthropic (si el
# modelo declina por sus filtros, el servidor reintenta con el recomendado).
# Haiku no lo tiene: con él, una negativa se responde como tal.
CON_RESPALDO = ("claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-fable-5")


def _opciones_modelo() -> dict:
    op = {"model": settings.TITTANBOT_MODELO, "output_config": {"effort": settings.TITTANBOT_ESFUERZO}}
    if settings.TITTANBOT_MODELO in CON_RESPALDO:
        op.update(betas=["server-side-fallback-2026-07-01"], fallbacks="default")
    return op


def _cliente() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.TITTANBOT_API_KEY, timeout=90.0, max_retries=2)


async def responder(*, db, usuario, esquema: str, empresa: str, headers: Dict[str, str],
                    mensaje: str, conversacion_id: Optional[int]) -> dict:
    if not configurado():
        raise HTTPException(503, "TittanBot todavía no está activado en este servidor.")
    mensaje = (mensaje or "").strip()
    if not mensaje:
        raise HTTPException(422, "Escriba su pregunta.")
    await _consumir_cupo(esquema, usuario.id)

    persona = await _persona(usuario, esquema)
    conv = await _conversacion(db, usuario.id, conversacion_id, mensaje)
    conv.pendiente = None     # un mensaje nuevo descarta la tarjeta que hubiera
    historia = await _historia(db, conv.id)
    ctx = Contexto(db=db, usuario=persona, esquema=esquema, headers=headers)

    herramientas = [h.para_modelo() for h in disponibles(persona)]
    if herramientas:
        herramientas[-1] = {**herramientas[-1], "cache_control": {"type": "ephemeral"}}
    mensajes: List[dict] = [*historia, {"role": "user", "content": mensaje}]

    texto, pendiente = "", None
    cliente = _cliente()
    try:
        for _ in range(settings.TITTANBOT_MAX_VUELTAS):
            resp = await cliente.beta.messages.create(
                max_tokens=16000, system=_sistema(persona, empresa), tools=herramientas,
                messages=mensajes, **_opciones_modelo(),
            )
            if resp.stop_reason == "refusal":
                texto = "No puedo ayudarle con eso. Si es un problema de la plataforma, puedo abrir un ticket."
                break
            textos = [b.text for b in resp.content if b.type == "text" and b.text]
            usos = [b for b in resp.content if b.type == "tool_use"]
            if resp.stop_reason != "tool_use" or not usos:
                texto = "\n\n".join(textos)
                break
            accion = next((u for u in usos if POR_NOMBRE.get(u.name) and POR_NOMBRE[u.name].destructiva), None)
            if accion is not None:
                texto = "\n\n".join(textos)
                pendiente = {"herramienta": accion.name, "argumentos": dict(accion.input or {})}
                break
            mensajes.append({"role": "assistant", "content": resp.content})
            resultados = []
            for u in usos:
                h = POR_NOMBRE.get(u.name)
                if h is None:
                    res = {"exito": False, "resultado": f"No existe la herramienta {u.name}."}
                else:
                    res = await ejecutor.consultar(h, dict(u.input or {}), ctx, conv.id)
                resultados.append({"type": "tool_result", "tool_use_id": u.id,
                                   "content": res["resultado"], "is_error": not res["exito"]})
            mensajes.append({"role": "user", "content": resultados})
        else:
            texto = ("Esto me tomó demasiados pasos y me detuve. ¿Puede decirme con más detalle qué necesita?")
    except anthropic.RateLimitError:
        raise HTTPException(503, "TittanBot está muy ocupado en este momento. Intente en un minuto.")
    except anthropic.AuthenticationError:
        log.error("TittanBot: la clave del modelo fue rechazada")
        raise HTTPException(503, "TittanBot no está bien configurado: la clave del modelo fue rechazada.")
    except anthropic.APIStatusError as e:
        log.error("TittanBot: el modelo respondió %s: %s", e.status_code, getattr(e, "message", e))
        raise HTTPException(502, "TittanBot no pudo responder. Intente de nuevo.")
    except anthropic.APIConnectionError:
        raise HTTPException(502, "TittanBot no pudo conectarse con el modelo. Intente de nuevo.")

    resumen = None
    if pendiente:
        h = POR_NOMBRE[pendiente["herramienta"]]
        try:
            resumen = await h.resumir(ctx, pendiente["argumentos"])
        except Exception:   # noqa: BLE001
            resumen = h.descripcion.split(".")[0]
        conv.pendiente = json.dumps({**pendiente, "resumen": resumen}, ensure_ascii=False, default=str)
        texto = texto or "Revise y confirme:"

    db.add(TittanbotMensaje(conversacion_id=conv.id, rol="usuario", texto=mensaje))
    if texto:
        db.add(TittanbotMensaje(conversacion_id=conv.id, rol="asistente",
                                texto=texto + (f"\n\n[Propuesta: {resumen}]" if resumen else "")))
    conv.ultimo_en = datetime.utcnow()
    await db.commit()

    salida = {"conversacion_id": conv.id, "texto": texto, "descargas": ctx.descargas}
    if pendiente:
        salida["accion"] = {"herramienta": pendiente["herramienta"], "resumen": resumen}
    return salida


async def confirmar(*, db, usuario, esquema: str, headers: Dict[str, str],
                    conversacion_id: int, aceptar: bool) -> dict:
    conv = await db.get(TittanbotConversacion, conversacion_id)
    if not conv or conv.usuario_id != usuario.id:
        raise HTTPException(404, "Conversación no encontrada.")
    if not conv.pendiente:
        raise HTTPException(409, "No hay ninguna acción esperando confirmación.")
    pendiente = json.loads(conv.pendiente)
    conv.pendiente = None
    if not aceptar:
        texto = "Listo, no hice nada."
        exito = False
    else:
        h = POR_NOMBRE.get(pendiente["herramienta"])
        if h is None or not h.destructiva:
            raise HTTPException(400, "Esa acción no se puede confirmar.")
        ctx = Contexto(db=db, usuario=await _persona(usuario, esquema), esquema=esquema, headers=headers)
        res = await ejecutor.ejecutar_accion(h, pendiente["argumentos"], ctx, conv.id)
        exito = res["exito"]
        texto = f"Listo. {_detalle_exito(res['resultado'])}" if exito else f"No se pudo: {res['resultado']}"
    db.add(TittanbotMensaje(conversacion_id=conv.id, rol="asistente", texto=texto))
    conv.ultimo_en = datetime.utcnow()
    await db.commit()
    return {"conversacion_id": conv.id, "texto": texto, "exito": exito}


def _detalle_exito(resultado: str) -> str:
    try:
        d = json.loads(resultado)
    except Exception:
        return "Quedó registrado."
    if isinstance(d, dict):
        numero = d.get("numero") or d.get("codigo")
        if numero:
            return f"Quedó registrado con el número {numero}."
    return "Quedó registrado."
