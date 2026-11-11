"""
Envío de informes del CMMS por Telegram y WhatsApp Business.

La configuración (tokens) y los destinatarios los maneja el administrador de la
cuenta; enviar puede cualquiera con acceso al CMMS. El informe se arma con el
mismo generador de TittanBot, así que se puede mandar cualquiera de los suyos.
"""
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import mensajeria as m
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.tenant import esquema_actual
from app.infrastructure.models.mensajeria import MensajeriaConfig, MensajeriaDestinatario, MensajeriaEnvio
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/eam/mensajeria", tags=["CMMS/EAM · Mensajería"])

# Los informes que se pueden mandar (los de TittanBot), con su nombre en pantalla.
INFORMES = {
    "llantas_flota_pdf": "Estado de llantas de la flota (PDF)",
    "tittanlite_pdf": "Informe TittanLite (PDF)",
    "tittanlite_excel": "Informe TittanLite (Excel)",
    "plan_recambio_excel": "Plan de recambio de llantas (Excel)",
    "llantas_rendimiento_pdf": "Rendimiento de llantas (PDF)",
    "lubricacion_flota_pdf": "Programa de análisis de aceite (PDF)",
    "lubricacion_muestra_pdf": "Análisis de una muestra de aceite (PDF)",
    "ordenes_excel": "Órdenes de trabajo (Excel)",
    "causa_raiz_pdf": "Análisis de causa raíz (PDF)",
}


def _quien(u: Usuario) -> str:
    return (f"{u.nombre or ''} {u.apellido or ''}".strip() or u.username)[:120]


async def _config(db: AsyncSession) -> MensajeriaConfig:
    c = await db.get(MensajeriaConfig, 1)
    if c is None:
        c = MensajeriaConfig(id=1)
        db.add(c)
        await db.flush()
    return c


# ─── Configuración ────────────────────────────────────────────────────────────

class ConfigIn(BaseModel):
    telegram_token: Optional[str] = None       # vacío = no cambiar; "-" = quitar
    whatsapp_token: Optional[str] = None
    whatsapp_numero_id: Optional[str] = None
    whatsapp_plantilla: Optional[str] = None
    whatsapp_idioma: Optional[str] = None


def _salida(c: MensajeriaConfig) -> Dict[str, Any]:
    return {"telegram": {"configurado": bool(c.telegram_token), "token": m.enmascarar(m.descifrar(c.telegram_token)),
                         "bot": c.telegram_usuario},
            "whatsapp": {"configurado": bool(c.whatsapp_token and c.whatsapp_numero_id),
                         "token": m.enmascarar(m.descifrar(c.whatsapp_token)), "numero_id": c.whatsapp_numero_id,
                         "plantilla": c.whatsapp_plantilla, "idioma": c.whatsapp_idioma or "es"}}


@router.get("/config")
async def ver_config(db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    return _salida(await _config(db))


@router.put("/config")
async def guardar_config(data: ConfigIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    c = await _config(db)
    if data.telegram_token:
        if data.telegram_token.strip() == "-":
            c.telegram_token, c.telegram_usuario = None, None
        else:
            token = data.telegram_token.strip()
            try:
                c.telegram_usuario = await m.telegram_bot(token)
            except m.ErrorMensajeria as e:
                raise HTTPException(422, f"Telegram no aceptó el token: {e}")
            except Exception:  # noqa: BLE001
                raise HTTPException(502, "No se pudo contactar a Telegram desde el servidor")
            c.telegram_token, c.telegram_offset = m.cifrar(token), 0
    if data.whatsapp_token:
        c.whatsapp_token = None if data.whatsapp_token.strip() == "-" else m.cifrar(data.whatsapp_token.strip())
    for k in ("whatsapp_numero_id", "whatsapp_plantilla", "whatsapp_idioma"):
        v = getattr(data, k)
        if v is not None:
            setattr(c, k, v.strip() or None)
    await db.commit()
    return _salida(c)


# ─── Destinatarios ────────────────────────────────────────────────────────────

class DestinatarioIn(BaseModel):
    alias: str = Field(min_length=1, max_length=120)
    telefono: Optional[str] = Field(None, max_length=30)
    telegram: bool = True
    whatsapp: bool = True
    activo: bool = True


def _dest(d: MensajeriaDestinatario, bot: Optional[str]) -> Dict[str, Any]:
    return {"id": d.id, "alias": d.alias, "telefono": d.telefono, "telegram": d.telegram, "whatsapp": d.whatsapp,
            "activo": d.activo, "telegram_vinculado": bool(d.telegram_chat_id),
            "enlace_telegram": f"https://t.me/{bot}?start={d.token_vinculo}" if bot and d.token_vinculo else None}


@router.get("/destinatarios")
async def destinatarios(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    c = await _config(db)
    filas = (await db.execute(select(MensajeriaDestinatario).order_by(MensajeriaDestinatario.alias))).scalars().all()
    return [_dest(d, c.telegram_usuario) for d in filas]


@router.post("/destinatarios", status_code=201)
async def crear_destinatario(data: DestinatarioIn, db: AsyncSession = Depends(get_db),
                             _: Usuario = Depends(require_admin)):
    d = MensajeriaDestinatario(**data.model_dump(), token_vinculo=secrets.token_urlsafe(12))
    db.add(d)
    await db.commit()
    return _dest(d, (await _config(db)).telegram_usuario)


@router.put("/destinatarios/{did}")
async def editar_destinatario(did: int, data: DestinatarioIn, db: AsyncSession = Depends(get_db),
                              _: Usuario = Depends(require_admin)):
    d = await db.get(MensajeriaDestinatario, did)
    if not d:
        raise HTTPException(404, "Ese destinatario no existe")
    for k, v in data.model_dump().items():
        setattr(d, k, v)
    await db.commit()
    return _dest(d, (await _config(db)).telegram_usuario)


@router.delete("/destinatarios/{did}", status_code=204)
async def borrar_destinatario(did: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    d = await db.get(MensajeriaDestinatario, did)
    if d:
        await db.delete(d)
        await db.commit()


@router.post("/telegram/revisar")
async def revisar_telegram(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Lee los mensajes pendientes del bot y vincula a quien abrió su enlace."""
    from app.api.v1.endpoints.tittanbot import _empresa
    c = await _config(db)
    token = m.descifrar(c.telegram_token)
    if not token:
        raise HTTPException(409, "Configure primero el bot de Telegram")
    try:
        actualizaciones = await m.telegram_actualizaciones(token, c.telegram_offset or 0)
    except m.ErrorMensajeria as e:
        raise HTTPException(502, f"Telegram: {e}. Si el bot tiene un webhook, quítelo (deleteWebhook).")
    empresa = await _empresa(db)
    vinculados = []
    for u in actualizaciones:
        c.telegram_offset = max(c.telegram_offset or 0, u["update_id"] + 1)
        msj = u.get("message") or {}
        texto = (msj.get("text") or "").strip()
        if not texto.startswith("/start "):
            continue
        d = (await db.execute(select(MensajeriaDestinatario).where(
            MensajeriaDestinatario.token_vinculo == texto.split(" ", 1)[1].strip()))).scalar()
        if d is None:
            continue
        d.telegram_chat_id = str(msj["chat"]["id"])
        vinculados.append(d.alias)
        try:
            await m.telegram_texto(token, d.telegram_chat_id,
                                   f"Listo, {d.alias}: desde ahora recibirá aquí los informes de {empresa}.")
        except m.ErrorMensajeria:
            pass
    await db.commit()
    return {"vinculados": vinculados}


# ─── Enviar ───────────────────────────────────────────────────────────────────

class EnviarIn(BaseModel):
    destinatario_ids: List[int] = Field(min_length=1)
    canales: List[str] = ["TELEGRAM", "WHATSAPP"]
    informe: Dict[str, Any]            # {"tipo": "...", y los parámetros del informe}
    mensaje: Optional[str] = None


@router.get("/informes")
async def informes(_: Usuario = Depends(get_current_user)):
    return [{"tipo": k, "nombre": v} for k, v in INFORMES.items()]


async def enviar_informe(db: AsyncSession, usuario: Usuario, headers: Dict[str, str], data: EnviarIn) -> Dict[str, Any]:
    from app.core.tittanbot import reportes
    from app.core.tittanbot.herramientas import Contexto
    from app.infrastructure.models.tittanbot import TittanbotDescarga
    tipo = (data.informe or {}).get("tipo")
    if tipo not in INFORMES:
        raise HTTPException(422, "Ese informe no se puede enviar")
    c = await _config(db)
    tg, wa = m.descifrar(c.telegram_token), m.descifrar(c.whatsapp_token)
    if not tg and not (wa and c.whatsapp_numero_id):
        raise HTTPException(409, "La cuenta no tiene configurado Telegram ni WhatsApp")
    dests = (await db.execute(select(MensajeriaDestinatario).where(
        MensajeriaDestinatario.id.in_(data.destinatario_ids), MensajeriaDestinatario.activo.is_(True)))).scalars().all()
    if not dests:
        raise HTTPException(422, "Ningún destinatario activo")

    ctx = Contexto(db=db, usuario=usuario, esquema=esquema_actual() or "public", headers=headers)
    r = await reportes.generar(ctx, dict(data.informe))
    if not ctx.descargas:
        raise HTTPException(422, r.get("resultado") or "No se pudo generar el informe")
    desc_ = (await db.execute(select(TittanbotDescarga).where(
        TittanbotDescarga.token == ctx.descargas[-1]["token"]))).scalar()
    contenido = Path(desc_.ruta).read_bytes()
    nombre, mime = desc_.nombre, desc_.tipo or "application/octet-stream"
    texto = (data.mensaje or f"{INFORMES[tipo]} · enviado por {_quien(usuario)}").strip()

    resultados = []
    for d in dests:
        for canal in data.canales:
            if canal == "TELEGRAM" and d.telegram:
                if not tg:
                    estado, error = "ERROR", "Telegram no está configurado"
                elif not d.telegram_chat_id:
                    estado, error = "ERROR", "No ha abierto el enlace del bot (sin vincular)"
                else:
                    try:
                        await m.telegram_documento(tg, d.telegram_chat_id, contenido, nombre, texto)
                        estado, error = "ENVIADO", None
                    except Exception as e:  # noqa: BLE001
                        estado, error = "ERROR", str(e)[:400]
            elif canal == "WHATSAPP" and d.whatsapp:
                if not (wa and c.whatsapp_numero_id):
                    estado, error = "ERROR", "WhatsApp no está configurado"
                elif not d.telefono:
                    estado, error = "ERROR", "Sin número de teléfono"
                else:
                    try:
                        await m.whatsapp_documento(wa, c.whatsapp_numero_id, d.telefono, contenido, nombre, mime, texto,
                                                   c.whatsapp_plantilla, c.whatsapp_idioma or "es")
                        estado, error = "ENVIADO", None
                    except Exception as e:  # noqa: BLE001
                        estado, error = "ERROR", str(e)[:400]
            else:
                continue
            db.add(MensajeriaEnvio(destinatario_id=d.id, alias=d.alias, canal=canal, informe=INFORMES[tipo],
                                   archivo=nombre, estado=estado, error=error, enviado_por=_quien(usuario),
                                   fecha=datetime.utcnow()))
            resultados.append({"alias": d.alias, "canal": canal, "estado": estado, "error": error})
    await db.commit()
    return {"informe": INFORMES[tipo], "archivo": nombre, "resultados": resultados,
            "enviados": sum(1 for x in resultados if x["estado"] == "ENVIADO")}


@router.post("/enviar")
async def enviar(data: EnviarIn, request: Request, db: AsyncSession = Depends(get_db),
                 usuario: Usuario = Depends(get_current_user)):
    headers = {"authorization": request.headers.get("authorization"), "x-cliente": request.headers.get("x-cliente")}
    return await enviar_informe(db, usuario, headers, data)


@router.get("/envios")
async def envios(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    filas = (await db.execute(select(MensajeriaEnvio).order_by(desc(MensajeriaEnvio.id)).limit(100))).scalars().all()
    return [{"fecha": e.fecha, "alias": e.alias, "canal": e.canal, "informe": e.informe, "archivo": e.archivo,
             "estado": e.estado, "error": e.error, "enviado_por": e.enviado_por} for e in filas]
