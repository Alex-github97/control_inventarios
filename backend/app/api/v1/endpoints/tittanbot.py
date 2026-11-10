"""
TittanBot — el asistente con IA de la plataforma.

Todo lo de acá exige el permiso de perfil «asistente»; lo hace cumplir el
middleware de `acceso_modulos.py` por el prefijo `/tittanbot`. El motor está en
`core/tittanbot/`.
"""
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
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
    TittanbotAdjunto, TittanbotConversacion, TittanbotDescarga, TittanbotMensaje,
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


MAX_ADJUNTO = 10 * 1024 * 1024
MAX_FILAS = 20000


def _leer_tabla(nombre: str, contenido: bytes):
    """Encabezados y filas del primer hoja de un Excel, o de un CSV."""
    import csv
    import io
    if nombre.lower().endswith((".xlsx", ".xlsm")):
        from openpyxl import load_workbook
        hoja = load_workbook(io.BytesIO(contenido), read_only=True, data_only=True).worksheets[0]
        filas = [list(f) for f in hoja.iter_rows(values_only=True)]
    elif nombre.lower().endswith((".csv", ".txt")):
        texto = contenido.decode("utf-8-sig", errors="replace")
        separador = ";" if texto.count(";") > texto.count(",") else ","
        filas = [list(f) for f in csv.reader(io.StringIO(texto), delimiter=separador)]
    else:
        raise HTTPException(415, "Adjunte un Excel (.xlsx) o un CSV.")
    from datetime import date, datetime as _dt

    def celda(v):
        # Las fechas se guardan como las escribiría una persona: el importador
        # las lee igual que si vinieran de la pantalla de cargue masivo.
        if isinstance(v, _dt):
            return v.strftime("%Y-%m-%d") if (v.hour, v.minute, v.second) == (0, 0, 0) else v.isoformat()
        if isinstance(v, date):
            return v.isoformat()
        return v

    filas = [[celda(v) for v in f] for f in filas if any(v not in (None, "") for v in f)]
    if len(filas) < 2:
        raise HTTPException(422, "El archivo no tiene filas de datos debajo del encabezado.")
    encabezados = [str(v).strip() if v is not None else "" for v in filas[0]]
    return encabezados, filas[1:]


@router.post("/adjunto")
async def adjuntar(archivo: UploadFile = File(...), conversacion_id: Optional[int] = Form(None),
                   db: AsyncSession = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    """El Excel o CSV que el usuario adjunta en el chat. Se lee una vez acá y
    queda guardado en la conversación para que el bot lo revise y lo importe."""
    import asyncio
    import json
    contenido = await archivo.read()
    if len(contenido) > MAX_ADJUNTO:
        raise HTTPException(413, "El archivo pesa más de 10 MB; divídalo en partes.")
    try:
        encabezados, filas = await asyncio.to_thread(_leer_tabla, archivo.filename or "", contenido)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "No se pudo leer el archivo. ¿Es un Excel o CSV válido?")
    if len(filas) > MAX_FILAS:
        raise HTTPException(413, f"El archivo trae {len(filas)} filas; el máximo por cargue es {MAX_FILAS}.")
    conv = await db.get(TittanbotConversacion, conversacion_id) if conversacion_id else None
    if conv is None or conv.usuario_id != usuario.id:
        conv = TittanbotConversacion(usuario_id=usuario.id, titulo=f"Archivo {archivo.filename}"[:80])
        db.add(conv)
        await db.flush()
    db.add(TittanbotAdjunto(conversacion_id=conv.id, usuario_id=usuario.id, nombre=archivo.filename or "archivo",
                            encabezados=json.dumps(encabezados, ensure_ascii=False),
                            filas=json.dumps(filas, ensure_ascii=False, default=str), total=len(filas)))
    await db.commit()
    return {"conversacion_id": conv.id, "nombre": archivo.filename, "filas": len(filas), "columnas": encabezados}
