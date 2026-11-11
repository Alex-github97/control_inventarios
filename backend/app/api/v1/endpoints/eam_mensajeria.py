"""
Envío de informes de LLANTAS por WhatsApp, Telegram o correo, con los canales
de TittanWare (un bot / número / remitente para todos los clientes).

Cada cliente registra sus destinatarios (alias, WhatsApp, Telegram, correo):
el administrador o quien tenga el permiso de perfil «mensajeria». Enviar puede
cualquiera con acceso al CMMS. Los informes los arma el generador de TittanBot.
"""
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import mensajeria as m
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.tenant import esquema_actual
from app.infrastructure.models.mensajeria import MensajeriaDestinatario, MensajeriaEnvio
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/eam/mensajeria", tags=["CMMS/EAM · Envío de informes"])

# Solo informes del módulo de llantas, con su nombre en pantalla.
INFORMES = {
    "llantas_flota_pdf": "Estado de llantas de la flota (PDF)",
    "tittanlite_pdf": "Informe TittanLite (PDF)",
    "tittanlite_excel": "Informe TittanLite (Excel)",
    "plan_recambio_excel": "Plan de recambio (Excel)",
    "llantas_rendimiento_pdf": "Rendimiento de llantas (PDF)",
    "disposicion_excel": "Pila de desechos y disposición final (Excel)",
}
CANALES = {"WHATSAPP": "WhatsApp", "TELEGRAM": "Telegram", "CORREO": "Correo"}


def _quien(u: Usuario) -> str:
    return (f"{u.nombre or ''} {u.apellido or ''}".strip() or u.username)[:120]


def _gestiona(u: Usuario) -> bool:
    from app.core.permisos_ruta import permitido
    from app.core.tittanbot.herramientas import rol_de
    return permitido(rol_de(u), getattr(u, "permisos", None) or {}, ("mensajeria",))


def exigir_gestion(u: Usuario = Depends(get_current_user)) -> Usuario:
    if not _gestiona(u):
        raise HTTPException(403, "Su perfil no puede administrar los destinatarios de informes")
    return u


async def _codigo_cliente(db: AsyncSession) -> str:
    fila = (await db.execute(text("SELECT codigo FROM public.plataforma_cliente WHERE esquema = :e"),
                             {"e": esquema_actual() or "public"})).first()
    return fila[0] if fila else "public"


@router.get("/estado")
async def estado(u: Usuario = Depends(get_current_user)):
    """Qué canales tiene encendidos TittanWare y si este usuario administra destinatarios."""
    return {"canales": m.canales(), "bot_telegram": await m.bot_usuario(), "gestiona": _gestiona(u),
            "informes": [{"tipo": k, "nombre": v} for k, v in INFORMES.items()]}


# ─── Destinatarios ────────────────────────────────────────────────────────────

class DestinatarioIn(BaseModel):
    alias: str = Field(min_length=1, max_length=120)
    telefono: Optional[str] = Field(None, max_length=30)
    correo: Optional[str] = Field(None, max_length=160)
    telegram_usuario: Optional[str] = Field(None, max_length=80)
    activo: bool = True
    tipo: str = "PERSONA"          # PERSONA | GRUPO_TELEGRAM


def _dest(d: MensajeriaDestinatario, bot: Optional[str], codigo: str) -> Dict[str, Any]:
    grupo = d.tipo == "GRUPO_TELEGRAM"
    param = "startgroup" if grupo else "start"
    return {"id": d.id, "alias": d.alias, "tipo": d.tipo or "PERSONA", "telefono": d.telefono, "correo": d.correo,
            "telegram_usuario": d.telegram_usuario, "telegram_titulo": d.telegram_titulo, "activo": d.activo,
            "telegram_vinculado": bool(d.telegram_chat_id),
            "enlace_telegram": f"https://t.me/{bot}?{param}={codigo}-{d.token_vinculo}" if bot and d.token_vinculo else None}


def _limpio(data: DestinatarioIn) -> Dict[str, Any]:
    v = data.model_dump()
    v["tipo"] = "GRUPO_TELEGRAM" if (v.get("tipo") or "").upper() == "GRUPO_TELEGRAM" else "PERSONA"
    for k in ("telefono", "correo", "telegram_usuario"):
        v[k] = (v[k] or "").strip() or None
        if v["tipo"] == "GRUPO_TELEGRAM":
            v[k] = None            # un grupo solo recibe por Telegram
    if v["correo"] and "@" not in v["correo"]:
        raise HTTPException(422, "El correo no es válido")
    if v["telegram_usuario"]:
        v["telegram_usuario"] = "@" + v["telegram_usuario"].lstrip("@")
    return v


@router.get("/destinatarios")
async def destinatarios(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    bot, codigo = await m.bot_usuario(), await _codigo_cliente(db)
    filas = (await db.execute(select(MensajeriaDestinatario).order_by(MensajeriaDestinatario.alias))).scalars().all()
    return [_dest(d, bot, codigo) for d in filas]


@router.post("/destinatarios", status_code=201)
async def crear_destinatario(data: DestinatarioIn, db: AsyncSession = Depends(get_db),
                             _: Usuario = Depends(exigir_gestion)):
    d = MensajeriaDestinatario(**_limpio(data), token_vinculo=secrets.token_urlsafe(12))
    db.add(d)
    await db.commit()
    return _dest(d, await m.bot_usuario(), await _codigo_cliente(db))


@router.put("/destinatarios/{did}")
async def editar_destinatario(did: int, data: DestinatarioIn, db: AsyncSession = Depends(get_db),
                              _: Usuario = Depends(exigir_gestion)):
    d = await db.get(MensajeriaDestinatario, did)
    if not d:
        raise HTTPException(404, "Ese destinatario no existe")
    for k, v in _limpio(data).items():
        setattr(d, k, v)
    await db.commit()
    return _dest(d, await m.bot_usuario(), await _codigo_cliente(db))


@router.delete("/destinatarios/{did}", status_code=204)
async def borrar_destinatario(did: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(exigir_gestion)):
    d = await db.get(MensajeriaDestinatario, did)
    if d:
        await db.delete(d)
        await db.commit()


@router.post("/telegram/revisar")
async def revisar_telegram(_: Usuario = Depends(get_current_user)):
    """Fuerza una lectura del bot (normalmente lo hace solo cada pocos segundos)."""
    try:
        return {"vinculados": await m.revisar_telegram()}
    except m.ErrorMensajeria as e:
        raise HTTPException(502, str(e))


# ─── Enviar ───────────────────────────────────────────────────────────────────

class EnviarIn(BaseModel):
    canal: str
    destinatario_ids: List[int] = Field(min_length=1)
    informes: List[Dict[str, Any]] = Field(min_length=1, max_length=6)   # [{"tipo": …, parámetros}]
    mensaje: Optional[str] = None


async def _armar(ctx, informe: Dict[str, Any]):
    from app.core.tittanbot import reportes
    from app.infrastructure.models.tittanbot import TittanbotDescarga
    antes = len(ctx.descargas)
    r = await reportes.generar(ctx, dict(informe))
    if len(ctx.descargas) == antes:
        raise HTTPException(422, f"{INFORMES[informe['tipo']]}: {r.get('resultado') or 'no se pudo generar'}")
    desc_ = (await ctx.db.execute(select(TittanbotDescarga).where(
        TittanbotDescarga.token == ctx.descargas[-1]["token"]))).scalar()
    return Path(desc_.ruta).read_bytes(), desc_.nombre, desc_.tipo or "application/octet-stream"


async def enviar_informes(db: AsyncSession, usuario: Usuario, headers: Dict[str, str], data: EnviarIn) -> Dict[str, Any]:
    from app.api.v1.endpoints.tittanbot import _empresa
    from app.core.tittanbot.herramientas import Contexto
    canal = (data.canal or "").upper()
    if canal not in CANALES:
        raise HTTPException(422, "Canal inválido: WHATSAPP, TELEGRAM o CORREO")
    if not m.canales()[canal]:
        raise HTTPException(409, f"El envío por {CANALES[canal]} todavía no está habilitado en TittanWare")
    for i in data.informes:
        if i.get("tipo") not in INFORMES:
            raise HTTPException(422, "Solo se pueden enviar informes de llantas")
    dests = (await db.execute(select(MensajeriaDestinatario).where(
        MensajeriaDestinatario.id.in_(data.destinatario_ids), MensajeriaDestinatario.activo.is_(True)))).scalars().all()
    if not dests:
        raise HTTPException(422, "Ningún destinatario activo")

    empresa = await _empresa(db)
    ctx = Contexto(db=db, usuario=usuario, esquema=esquema_actual() or "public", headers=headers)
    archivos = [(INFORMES[i["tipo"]], *(await _armar(ctx, i))) for i in data.informes]
    resultados = []
    for d in dests:
        for titulo, contenido, nombre, tipo in archivos:
            texto = (data.mensaje or f"{titulo} de {empresa}, enviado por {_quien(usuario)} desde TittanWare.").strip()
            try:
                if canal == "TELEGRAM":
                    if not d.telegram_chat_id:
                        raise m.ErrorMensajeria("el grupo todavía no está vinculado al bot de Telegram"
                                                if d.tipo == "GRUPO_TELEGRAM" else
                                                "todavía no abrió su enlace del bot de Telegram")
                    try:
                        await m.telegram_documento(d.telegram_chat_id, contenido, nombre, texto)
                    except m.ErrorMensajeria as e:
                        if not e.migrar_a:
                            raise
                        # El grupo pasó a supergrupo: se guarda el id nuevo y se reintenta.
                        d.telegram_chat_id = e.migrar_a
                        await m.telegram_documento(d.telegram_chat_id, contenido, nombre, texto)
                elif canal == "WHATSAPP":
                    if not d.telefono:
                        raise m.ErrorMensajeria("no tiene número de WhatsApp")
                    await m.whatsapp_documento(d.telefono, contenido, nombre, tipo, texto)
                else:
                    if not d.correo:
                        raise m.ErrorMensajeria("no tiene correo")
                    await m.correo(d.correo, f"{titulo} · {empresa}", texto, contenido, nombre, tipo)
                estado, error = "ENVIADO", None
            except m.ErrorMensajeria as e:
                estado, error = "ERROR", str(e)[:400]
            except Exception as e:  # noqa: BLE001 — se registra y se sigue con el resto
                estado, error = "ERROR", str(e)[:400]
            db.add(MensajeriaEnvio(destinatario_id=d.id, alias=d.alias, canal=canal, informe=titulo, archivo=nombre,
                                   estado=estado, error=error, enviado_por=_quien(usuario), fecha=datetime.utcnow()))
            resultados.append({"alias": d.alias, "informe": titulo, "estado": estado, "error": error})
    await db.commit()
    return {"canal": canal, "resultados": resultados, "enviados": sum(1 for x in resultados if x["estado"] == "ENVIADO")}


@router.post("/enviar")
async def enviar(data: EnviarIn, request: Request, db: AsyncSession = Depends(get_db),
                 usuario: Usuario = Depends(get_current_user)):
    headers = {"authorization": request.headers.get("authorization"), "x-cliente": request.headers.get("x-cliente")}
    return await enviar_informes(db, usuario, headers, data)


@router.get("/envios")
async def envios(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    filas = (await db.execute(select(MensajeriaEnvio).order_by(desc(MensajeriaEnvio.id)).limit(100))).scalars().all()
    return [{"fecha": e.fecha, "alias": e.alias, "canal": e.canal, "informe": e.informe, "archivo": e.archivo,
             "estado": e.estado, "error": e.error, "enviado_por": e.enviado_por} for e in filas]
