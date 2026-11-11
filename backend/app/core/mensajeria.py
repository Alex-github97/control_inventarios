"""
Envío de informes por los canales de TittanWare: Telegram, WhatsApp Business y
correo. Un solo bot / número / remitente para todos los clientes; las
credenciales vienen de la configuración del servidor (settings).

  * Telegram: un bot no puede escribirle primero a nadie. Cada destinatario
    abre su enlace `t.me/<bot>?start=<cliente>-<token>` y pulsa «Iniciar».
    `ciclo_telegram` lee los mensajes del bot cada pocos segundos (un solo
    proceso a la vez, con candado en Redis), identifica el cliente por el
    prefijo del enlace y guarda el chat en el destinatario de ese cliente.
  * WhatsApp: Meta exige una plantilla aprobada para escribir primero. Con
    plantilla, el informe va como encabezado de documento; sin ella, como
    documento suelto (solo si la persona escribió en las últimas 24 horas).
  * Correo: SMTP con el remitente de TittanWare (no_reply@…), adjunto.
"""
import asyncio
import logging
import re
import smtplib
import ssl
from email.message import EmailMessage
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)
TELEGRAM = "https://api.telegram.org"
WHATSAPP = "https://graph.facebook.com/v21.0"
_bot_usuario: Optional[str] = None


class ErrorMensajeria(Exception):
    pass


def canales() -> Dict[str, bool]:
    return {"TELEGRAM": bool(settings.TELEGRAM_BOT_TOKEN),
            "WHATSAPP": bool(settings.WHATSAPP_TOKEN and settings.WHATSAPP_NUMERO_ID),
            "CORREO": bool(settings.SMTP_HOST and settings.CORREO_REMITENTE)}


# ─── Telegram ─────────────────────────────────────────────────────────────────

async def _tg(metodo: str, **kw) -> Any:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ErrorMensajeria("El bot de Telegram de TittanWare no está configurado")
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{TELEGRAM}/bot{settings.TELEGRAM_BOT_TOKEN}/{metodo}", **kw)
    d = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if not d.get("ok"):
        raise ErrorMensajeria(d.get("description") or f"Telegram respondió {r.status_code}")
    return d["result"]


async def bot_usuario() -> Optional[str]:
    """El @usuario del bot, para armar los enlaces (se pregunta una vez)."""
    global _bot_usuario
    if _bot_usuario is None and settings.TELEGRAM_BOT_TOKEN:
        try:
            _bot_usuario = (await _tg("getMe"))["username"]
        except Exception:  # noqa: BLE001 — sin red o token malo: sin enlace por ahora
            return None
    return _bot_usuario


async def telegram_texto(chat_id: str, texto: str) -> None:
    await _tg("sendMessage", json={"chat_id": chat_id, "text": texto})


async def telegram_documento(chat_id: str, contenido: bytes, nombre: str, texto: str) -> None:
    await _tg("sendDocument", data={"chat_id": chat_id, "caption": texto[:1000]}, files={"document": (nombre, contenido)})


INICIO = re.compile(r"^/start\s+([a-z0-9_]{1,40})-([A-Za-z0-9_-]{8,40})$")


async def _vincular(codigo: str, token: str, chat_id: str) -> Optional[str]:
    """Guarda el chat en el destinatario del cliente indicado. Devuelve el texto
    de bienvenida, o None si el enlace no corresponde a nadie."""
    from sqlalchemy import select, text
    from app.core.database import AsyncSessionLocal
    from app.core.tenant import ESQUEMA_PLATAFORMA
    from app.infrastructure.models.mensajeria import MensajeriaDestinatario
    async with AsyncSessionLocal(info={"esquema": ESQUEMA_PLATAFORMA}) as db:
        fila = (await db.execute(text("SELECT esquema, nombre FROM public.plataforma_cliente WHERE codigo = :c"),
                                 {"c": codigo})).first()
    if not fila:
        return None
    async with AsyncSessionLocal(info={"esquema": fila.esquema}) as db:
        d = (await db.execute(select(MensajeriaDestinatario).where(
            MensajeriaDestinatario.token_vinculo == token))).scalar()
        if d is None:
            return None
        d.telegram_chat_id = chat_id
        alias = d.alias
        await db.commit()
    return f"Listo, {alias}: desde ahora recibirá aquí los informes de llantas de {fila.nombre}."


async def revisar_telegram() -> int:
    """Lee lo pendiente del bot y vincula los «Iniciar». Devuelve cuántos."""
    from app.core.sesiones import _r
    r = _r()
    # Un solo proceso a la vez: getUpdates con dos lectores se pisa.
    if not await r.set("tw:telegram:candado", "1", nx=True, ex=50):
        return 0
    vinculados = 0
    try:
        offset = int(await r.get("tw:telegram:offset") or 0)
        # Espera larga: Telegram responde apenas llega un mensaje o a los 25 s.
        actualizaciones = await _tg("getUpdates", json={"offset": offset, "timeout": 25,
                                                        "allowed_updates": ["message"]})
        for u in actualizaciones:
            await r.set("tw:telegram:offset", u["update_id"] + 1)
            msj = u.get("message") or {}
            chat = str((msj.get("chat") or {}).get("id") or "")
            m = INICIO.match((msj.get("text") or "").strip())
            if not chat:
                continue
            if not m:
                if (msj.get("text") or "").startswith("/start"):
                    await telegram_texto(chat, "Para recibir informes abra el enlace que le compartió su empresa.")
                continue
            bienvenida = await _vincular(m.group(1), m.group(2), chat)
            await telegram_texto(chat, bienvenida or "Ese enlace no corresponde a ningún destinatario. Pida uno nuevo.")
            vinculados += bool(bienvenida)
    finally:
        await r.delete("tw:telegram:candado")
    return vinculados


async def ciclo_telegram() -> None:
    """Corre mientras viva el proceso. Sin token, duerme."""
    while True:
        try:
            if settings.TELEGRAM_BOT_TOKEN:
                await revisar_telegram()
            else:
                await asyncio.sleep(300)
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001 — la red o Telegram fallan a ratos; se reintenta
            log.warning("Telegram: %s", e)
            await asyncio.sleep(30)
        await asyncio.sleep(2)


# ─── WhatsApp Cloud ───────────────────────────────────────────────────────────

async def _wa(ruta: str, **kw) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as c:
        r = await c.post(f"{WHATSAPP}/{ruta}", headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}, **kw)
    d = r.json() if "json" in r.headers.get("content-type", "") else {}
    if r.status_code >= 300:
        raise ErrorMensajeria((d.get("error") or {}).get("message") or f"WhatsApp respondió {r.status_code}")
    return d


def numero_whatsapp(telefono: str) -> str:
    n = "".join(ch for ch in telefono if ch.isdigit())
    return f"57{n}" if len(n) == 10 else n      # celular colombiano sin indicativo


async def whatsapp_documento(telefono: str, contenido: bytes, nombre: str, tipo: str, texto: str) -> None:
    if not canales()["WHATSAPP"]:
        raise ErrorMensajeria("El WhatsApp de TittanWare no está configurado")
    media = await _wa(f"{settings.WHATSAPP_NUMERO_ID}/media", data={"messaging_product": "whatsapp", "type": tipo},
                      files={"file": (nombre, contenido, tipo)})
    documento = {"id": media["id"], "filename": nombre}
    if settings.WHATSAPP_PLANTILLA:
        cuerpo = {"messaging_product": "whatsapp", "to": numero_whatsapp(telefono), "type": "template",
                  "template": {"name": settings.WHATSAPP_PLANTILLA, "language": {"code": settings.WHATSAPP_IDIOMA or "es"},
                               "components": [
                                   {"type": "header", "parameters": [{"type": "document", "document": documento}]},
                                   {"type": "body", "parameters": [{"type": "text", "text": texto[:900]}]}]}}
    else:
        cuerpo = {"messaging_product": "whatsapp", "to": numero_whatsapp(telefono), "type": "document",
                  "document": {**documento, "caption": texto[:900]}}
    await _wa(f"{settings.WHATSAPP_NUMERO_ID}/messages", json=cuerpo)


# ─── Correo ───────────────────────────────────────────────────────────────────

def _correo_sync(para: str, asunto: str, texto: str, contenido: bytes, nombre: str, tipo: str) -> None:
    m = EmailMessage()
    m["From"] = f"{settings.CORREO_NOMBRE} <{settings.CORREO_REMITENTE}>"
    m["To"] = para
    m["Subject"] = asunto
    m.set_content(texto)
    principal, _, sub = (tipo or "application/octet-stream").partition("/")
    m.add_attachment(contenido, maintype=principal, subtype=sub or "octet-stream", filename=nombre)
    contexto = ssl.create_default_context()
    if int(settings.SMTP_PUERTO) == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, 465, context=contexto, timeout=60) as s:
            if settings.SMTP_USUARIO:
                s.login(settings.SMTP_USUARIO, settings.SMTP_CLAVE)
            s.send_message(m)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PUERTO), timeout=60) as s:
            s.starttls(context=contexto)
            if settings.SMTP_USUARIO:
                s.login(settings.SMTP_USUARIO, settings.SMTP_CLAVE)
            s.send_message(m)


async def correo(para: str, asunto: str, texto: str, contenido: bytes, nombre: str, tipo: str) -> None:
    if not canales()["CORREO"]:
        raise ErrorMensajeria("El correo de TittanWare no está configurado")
    try:
        await asyncio.to_thread(_correo_sync, para, asunto, texto, contenido, nombre, tipo)
    except (smtplib.SMTPException, OSError) as e:
        raise ErrorMensajeria(f"El servidor de correo respondió: {e}")
