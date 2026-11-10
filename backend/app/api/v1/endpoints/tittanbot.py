"""
TittanBot — el asistente con IA de la plataforma.

Todo lo de acá exige el permiso de perfil «asistente»; lo hace cumplir el
middleware de `acceso_modulos.py` por el prefijo `/tittanbot`. El motor está en
`core/tittanbot/`.
"""
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.tenant import esquema_actual
from app.core.tittanbot import motor
from app.infrastructure.models.tittanbot import (
    TittanbotConversacion, TittanbotDescarga, TittanbotMensaje,
)
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/tittanbot", tags=["TittanBot"])


class MensajeIn(BaseModel):
    mensaje: str
    conversacion_id: Optional[int] = None


class ConfirmarIn(BaseModel):
    conversacion_id: int
    aceptar: bool = True


def _cabeceras(request: Request) -> dict:
    return {"authorization": request.headers.get("authorization"),
            "x-cliente": request.headers.get("x-cliente")}


async def _empresa(db: AsyncSession) -> str:
    fila = (await db.execute(text("SELECT nombre FROM public.plataforma_cliente WHERE esquema = :e"),
                             {"e": esquema_actual() or "public"})).first()
    return fila[0] if fila else "su empresa"


@router.get("/estado")
async def estado(usuario: Usuario = Depends(get_current_user)):
    return {"activo": motor.configurado(), "modelo": settings.TITTANBOT_MODELO if motor.configurado() else None}


@router.post("/mensaje")
async def mensaje(data: MensajeIn, request: Request, db: AsyncSession = Depends(get_db),
                  usuario: Usuario = Depends(get_current_user)):
    if len(data.mensaje or "") > 4000:
        raise HTTPException(422, "El mensaje es muy largo; resúmalo en menos de 4.000 caracteres.")
    return await motor.responder(db=db, usuario=usuario, esquema=esquema_actual() or "public",
                                 empresa=await _empresa(db), headers=_cabeceras(request),
                                 mensaje=data.mensaje, conversacion_id=data.conversacion_id)


@router.post("/confirmar")
async def confirmar(data: ConfirmarIn, request: Request, db: AsyncSession = Depends(get_db),
                    usuario: Usuario = Depends(get_current_user)):
    return await motor.confirmar(db=db, usuario=usuario, esquema=esquema_actual() or "public",
                                 headers=_cabeceras(request), conversacion_id=data.conversacion_id,
                                 aceptar=data.aceptar)


@router.get("/conversaciones")
async def conversaciones(db: AsyncSession = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    filas = (await db.execute(select(TittanbotConversacion).where(TittanbotConversacion.usuario_id == usuario.id)
                              .order_by(desc(TittanbotConversacion.ultimo_en)).limit(20))).scalars().all()
    return [{"id": c.id, "titulo": c.titulo, "ultimo_en": c.ultimo_en} for c in filas]


@router.get("/conversaciones/{cid}")
async def conversacion(cid: int, db: AsyncSession = Depends(get_db),
                       usuario: Usuario = Depends(get_current_user)):
    c = await db.get(TittanbotConversacion, cid)
    if not c or c.usuario_id != usuario.id:
        raise HTTPException(404, "Conversación no encontrada.")
    msgs = (await db.execute(select(TittanbotMensaje).where(TittanbotMensaje.conversacion_id == cid)
                             .order_by(TittanbotMensaje.id))).scalars().all()
    return {"id": c.id, "titulo": c.titulo,
            "mensajes": [{"rol": m.rol, "texto": m.texto} for m in msgs[-60:]]}


@router.get("/descargas/{token}")
async def descargar(token: str, db: AsyncSession = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    d = (await db.execute(select(TittanbotDescarga).where(TittanbotDescarga.token == token))).scalar_one_or_none()
    if not d or d.usuario_id != usuario.id:
        raise HTTPException(404, "Ese archivo no existe o no es suyo.")
    if d.vence < datetime.utcnow() or not Path(d.ruta).exists():
        raise HTTPException(410, "El enlace venció. Pídale a TittanBot que lo vuelva a generar.")
    return FileResponse(d.ruta, media_type=d.tipo, filename=d.nombre,
                        headers={"Access-Control-Expose-Headers": "Content-Disposition"})
