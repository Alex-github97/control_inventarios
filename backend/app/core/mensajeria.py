"""
Envío de informes por Telegram (Bot API) y WhatsApp Business (Cloud API).

  * Telegram: la persona abre `t.me/<bot>?start=<token>` y pulsa «Iniciar». El
    bot no tiene servidor propio escuchando: al revisar vinculaciones se leen
    los mensajes pendientes con getUpdates (desde el último leído) y cada
    «/start <token>» vincula su chat. Así no hace falta un proceso aparte ni una
    dirección pública. (Si el bot tiene un webhook puesto, getUpdates falla: se
    avisa.)
  * WhatsApp: los mensajes que inicia la empresa exigen una PLANTILLA aprobada
    por Meta. Con plantilla se manda el informe como encabezado de documento;
    sin plantilla se intenta como documento suelto, que Meta solo acepta si la
    persona escribió en las últimas 24 horas.
"""
import base64
import hashlib
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings

TELEGRAM = "https://api.telegram.org"
WHATSAPP = "https://graph.facebook.com/v21.0"


class ErrorMensajeria(Exception):
    pass


def _fernet():
    from cryptography.fernet import Fernet
    clave = base64.urlsafe_b64encode(hashlib.sha256(f"mensajeria:{settings.SECRET_KEY}".encode()).digest())
    return Fernet(clave)


def cifrar(texto: Optional[str]) -> Optional[str]:
    return _fernet().encrypt(texto.encode()).decode() if texto else None


def descifrar(texto: Optional[str]) -> Optional[str]:
    if not texto:
        return None
    try:
        return _fernet().decrypt(texto.encode()).decode()
    except Exception:  # noqa: BLE001 — la clave del servidor cambió: hay que volver a ponerlo
        return None


def enmascarar(texto: Optional[str]) -> Optional[str]:
    return f"…{texto[-4:]}" if texto else None


# ─── Telegram ─────────────────────────────────────────────────────────────────

async def _tg(token: str, metodo: str, **kw) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{TELEGRAM}/bot{token}/{metodo}", **kw)
    d = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if not d.get("ok"):
        raise ErrorMensajeria(d.get("description") or f"Telegram respondió {r.status_code}")
    return d["result"]


async def telegram_bot(token: str) -> str:
    """El @usuario del bot; de paso comprueba que el token sirve."""
    return (await _tg(token, "getMe"))["username"]


async def telegram_actualizaciones(token: str, offset: int):
    return await _tg(token, "getUpdates", json={"offset": offset, "timeout": 0, "allowed_updates": ["message"]})


async def telegram_texto(token: str, chat_id: str, texto: str) -> None:
    await _tg(token, "sendMessage", json={"chat_id": chat_id, "text": texto})


async def telegram_documento(token: str, chat_id: str, contenido: bytes, nombre: str, texto: str) -> None:
    await _tg(token, "sendDocument", data={"chat_id": chat_id, "caption": texto[:1000]},
              files={"document": (nombre, contenido)})


# ─── WhatsApp Cloud ───────────────────────────────────────────────────────────

async def _wa(token: str, ruta: str, **kw) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as c:
        r = await c.post(f"{WHATSAPP}/{ruta}", headers={"Authorization": f"Bearer {token}"}, **kw)
    d = r.json() if "json" in r.headers.get("content-type", "") else {}
    if r.status_code >= 300:
        raise ErrorMensajeria((d.get("error") or {}).get("message") or f"WhatsApp respondió {r.status_code}")
    return d


def _numero(telefono: str) -> str:
    n = "".join(ch for ch in telefono if ch.isdigit())
    return f"57{n}" if len(n) == 10 else n      # celular colombiano sin indicativo


async def whatsapp_documento(token: str, numero_id: str, telefono: str, contenido: bytes, nombre: str, tipo: str,
                             texto: str, plantilla: Optional[str], idioma: str = "es") -> None:
    media = await _wa(token, f"{numero_id}/media", data={"messaging_product": "whatsapp", "type": tipo},
                      files={"file": (nombre, contenido, tipo)})
    documento = {"id": media["id"], "filename": nombre}
    if plantilla:
        cuerpo = {"messaging_product": "whatsapp", "to": _numero(telefono), "type": "template",
                  "template": {"name": plantilla, "language": {"code": idioma or "es"}, "components": [
                      {"type": "header", "parameters": [{"type": "document", "document": documento}]},
                      {"type": "body", "parameters": [{"type": "text", "text": texto[:900]}]}]}}
    else:
        cuerpo = {"messaging_product": "whatsapp", "to": _numero(telefono), "type": "document",
                  "document": {**documento, "caption": texto[:900]}}
    await _wa(token, f"{numero_id}/messages", json=cuerpo)
