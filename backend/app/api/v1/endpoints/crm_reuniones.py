"""
Asistente de reuniones del CRM (openspec/changes/asistente-reuniones-crm).

El módulo contratado lo hace cumplir auth_global por el prefijo /crm; aquí se
exige además el permiso de perfil `crm`, que hasta ahora solo ocultaba la
pantalla.

Flujo: crear la reunión → confirmar el aviso → grabar por partes (o subir un
archivo) → la cola transcribe y extrae → el ejecutivo revisa → cerrar.
"""
from __future__ import annotations

import asyncio
import shutil
import subprocess
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_permiso_perfil
from app.core.reuniones import audio, captura, cola, ia, servicio
from app.core.tenant import esquema_actual
from app.infrastructure.models.crm import CRMCliente, CRMContacto, CRMOportunidad
from app.infrastructure.models.crm_reuniones import (
    EN_CURSO, ORIGENES, POR_REVISAR, PROCESANDO, PROGRAMADA, CRMReunion, CRMReunionCompromiso,
    CRMReunionCaptura, CRMReunionParticipante, CRMReunionTramo,
)
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/crm/reuniones", tags=["CRM · Reuniones"])
permiso = require_permiso_perfil("crm")

PLATAFORMAS = {"meet.google.com": "MEET", "teams.microsoft.com": "TEAMS", "teams.live.com": "TEAMS",
               "zoom.us": "ZOOM"}
MAX_PARTE_MB = 20
MAX_ARCHIVO_MB = 1024


def _esquema() -> str:
    return esquema_actual() or "public"


def _es_admin(u: Usuario) -> bool:
    return str(getattr(u.rol, "value", u.rol)).upper() == "ADMINISTRADOR"


async def _reunion(db: AsyncSession, reunion_id: int) -> CRMReunion:
    r = await db.get(CRMReunion, reunion_id)
    if r is None:
        raise HTTPException(404, "Esa reunión no existe.")
    return r


async def _puede_revisar(db: AsyncSession, r: CRMReunion, u: Usuario) -> None:
    if _es_admin(u) or r.creada_por_id == u.id:
        return
    estuvo = (await db.execute(select(CRMReunionParticipante.id).where(
        CRMReunionParticipante.reunion_id == r.id, CRMReunionParticipante.usuario_id == u.id))).first()
    if not estuvo:
        raise HTTPException(403, "Solo quien estuvo en la reunión o un administrador puede revisarla.")


def _plataforma(enlace: Optional[str]) -> Optional[str]:
    if not enlace:
        return None
    e = enlace.lower()
    return next((p for dominio, p in PLATAFORMAS.items() if dominio in e), None)


# ── Esquemas de entrada y salida ───────────────────────────────────────────────
class ParticipanteEntrada(BaseModel):
    contacto_id: Optional[int] = None
    usuario_id: Optional[int] = None


class ReunionEntrada(BaseModel):
    cliente_id: int
    oportunidad_id: Optional[int] = None
    titulo: str = Field(min_length=3, max_length=200)
    origen: str = "PRESENCIAL"
    enlace: Optional[str] = Field(default=None, max_length=500)
    fecha: Optional[datetime] = None
    participantes: List[ParticipanteEntrada] = []


class AvisoEntrada(BaseModel):
    confirmo: bool


class DetenerEntrada(BaseModel):
    # sesión del grabador → cuántas partes envió en ella
    sesiones: Dict[int, int]


class TramoEdicion(BaseModel):
    texto: Optional[str] = None
    participante_id: Optional[int] = None
    quitar_participante: bool = False


class CompromisoEdicion(BaseModel):
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    lado: Optional[str] = None
    participante_id: Optional[int] = None
    fecha_limite: Optional[date] = None
    quitar_fecha: bool = False


class ConfigEntrada(BaseModel):
    aviso_texto: Optional[str] = Field(default=None, min_length=20)
    retencion_audio_dias: Optional[int] = Field(default=None, ge=1, le=3650)
    tope_minutos_mes: Optional[int] = Field(default=None, ge=0)


def _r_dict(r: CRMReunion) -> dict:
    return {
        "id": r.id, "cliente_id": r.cliente_id, "oportunidad_id": r.oportunidad_id, "titulo": r.titulo,
        "origen": r.origen, "plataforma": r.plataforma, "enlace": r.enlace, "fecha": r.fecha,
        "estado": r.estado, "motivo_falla": r.motivo_falla, "fuente_captura": r.fuente_captura,
        "aviso_confirmado": r.aviso_confirmado_en is not None, "aviso_confirmado_en": r.aviso_confirmado_en,
        "aviso_texto": r.aviso_texto, "tiene_audio": bool(r.audio_ruta), "audio_duracion_s": r.audio_duracion_s,
        "audio_borrado_en": r.audio_borrado_en, "resumen": r.resumen, "interaccion_id": r.interaccion_id,
        "cerrada_en": r.cerrada_en,
    }


def _c_dict(c: CRMReunionCompromiso) -> dict:
    hoy = datetime.now(servicio.BOGOTA).date()
    return {
        "id": c.id, "reunion_id": c.reunion_id, "cliente_id": c.cliente_id, "tipo": c.tipo, "lado": c.lado,
        "descripcion": c.descripcion, "responsable_nombre": c.responsable_nombre,
        "participante_id": c.participante_id, "fecha_limite": c.fecha_limite, "cita": c.cita,
        "minuto_s": c.minuto_s, "estado": c.estado, "actividad_id": c.actividad_id,
        "vencido": bool(c.fecha_limite and c.estado == "APROBADO" and c.fecha_limite < hoy),
    }


# ── Configuración ──────────────────────────────────────────────────────────────
@router.get("/config")
async def ver_config(db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    c = await servicio.config(db)
    return {"aviso_texto": c.aviso_texto, "retencion_audio_dias": c.retencion_audio_dias,
            "tope_minutos_mes": c.tope_minutos_mes, "ia_configurada": ia.configurado(),
            "bot_configurado": captura.configurado()}


@router.put("/config")
async def cambiar_config(datos: ConfigEntrada, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    if not _es_admin(u):
        raise HTTPException(403, "Solo un administrador cambia la configuración del asistente.")
    c = await servicio.config(db)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(c, campo, valor)
    return await ver_config(db, u)


# ── Reuniones ──────────────────────────────────────────────────────────────────
@router.get("")
async def listar(cliente_id: Optional[int] = None, estado: Optional[str] = None,
                 db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    q = select(CRMReunion, CRMCliente.razon_social).join(CRMCliente, CRMCliente.id == CRMReunion.cliente_id)
    if cliente_id:
        q = q.where(CRMReunion.cliente_id == cliente_id)
    if estado:
        q = q.where(CRMReunion.estado == estado)
    filas = (await db.execute(q.order_by(CRMReunion.fecha.desc()).limit(300))).all()
    return [{**_r_dict(r), "cliente": nombre} for r, nombre in filas]


@router.post("", status_code=201)
async def crear(datos: ReunionEntrada, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    if datos.origen not in ORIGENES:
        raise HTTPException(422, "El origen debe ser PRESENCIAL o VIRTUAL.")
    # El esquema ya es el de la empresa: un cliente de otra empresa simplemente
    # no está aquí, y eso es lo que se responde.
    cliente = await db.get(CRMCliente, datos.cliente_id)
    if cliente is None:
        raise HTTPException(404, "Ese cliente no existe en su empresa.")
    if datos.oportunidad_id:
        op = await db.get(CRMOportunidad, datos.oportunidad_id)
        if op is None or op.cliente_id != cliente.id:
            raise HTTPException(422, "La oportunidad no es de ese cliente.")
    plataforma = _plataforma(datos.enlace)
    if datos.origen == "VIRTUAL" and datos.enlace and plataforma is None:
        raise HTTPException(422, "Ese enlace no es de una plataforma admitida (Google Meet, Microsoft Teams o Zoom).")

    r = CRMReunion(cliente_id=cliente.id, oportunidad_id=datos.oportunidad_id, titulo=datos.titulo.strip(),
                   origen=datos.origen, plataforma=plataforma, enlace=datos.enlace,
                   fecha=datos.fecha or datetime.now(timezone.utc), estado=PROGRAMADA, creada_por_id=u.id)
    db.add(r)
    await db.flush()

    vistos = set()
    # Quien crea la reunión está en ella: sus compromisos son «nuestros».
    for p in [ParticipanteEntrada(usuario_id=u.id), *datos.participantes]:
        clave = ("c", p.contacto_id) if p.contacto_id else ("u", p.usuario_id)
        if clave in vistos or (not p.contacto_id and not p.usuario_id):
            continue
        vistos.add(clave)
        if p.contacto_id:
            c = await db.get(CRMContacto, p.contacto_id)
            if c is None or c.cliente_id != cliente.id:
                raise HTTPException(422, f"El contacto {p.contacto_id} no es de ese cliente.")
            nombre = c.nombre
        else:
            us = await db.get(Usuario, p.usuario_id)
            if us is None:
                raise HTTPException(422, f"El usuario {p.usuario_id} no existe.")
            nombre = f"{us.nombre} {us.apellido or ''}".strip()
        db.add(CRMReunionParticipante(reunion_id=r.id, contacto_id=p.contacto_id, usuario_id=p.usuario_id,
                                      nombre=nombre))
    await db.flush()
    return await ver(r.id, db, u)


@router.get("/compromisos")
async def seguimiento(cliente_id: Optional[int] = None, lado: Optional[str] = None,
                      solo_vencidos: bool = False, db: AsyncSession = Depends(get_db),
                      u: Usuario = Depends(permiso)):
    """El seguimiento: compromisos aprobados y aún no cumplidos."""
    q = select(CRMReunionCompromiso).where(CRMReunionCompromiso.tipo == "COMPROMISO",
                                           CRMReunionCompromiso.estado == "APROBADO")
    if cliente_id:
        q = q.where(CRMReunionCompromiso.cliente_id == cliente_id)
    if lado:
        q = q.where(CRMReunionCompromiso.lado == lado)
    if solo_vencidos:
        q = q.where(CRMReunionCompromiso.fecha_limite < datetime.now(servicio.BOGOTA).date())
    filas = (await db.execute(q.order_by(CRMReunionCompromiso.fecha_limite.nulls_last()))).scalars()
    return [_c_dict(c) for c in filas]


@router.get("/{reunion_id}")
async def ver(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    cliente = await db.get(CRMCliente, r.cliente_id)
    parts = await servicio.participantes(db, r.id)
    tramos = await servicio.tramos_de(db, r.id)
    comps = (await db.execute(select(CRMReunionCompromiso).where(
        CRMReunionCompromiso.reunion_id == r.id).order_by(CRMReunionCompromiso.minuto_s.nulls_last(),
                                                          CRMReunionCompromiso.id))).scalars()
    return {
        **_r_dict(r), "cliente": cliente.razon_social if cliente else None,
        "participantes": [{"id": p.id, "nombre": p.nombre, "contacto_id": p.contacto_id,
                           "usuario_id": p.usuario_id, "lado": "NUESTRO" if p.usuario_id else
                           ("CLIENTE" if p.contacto_id else None)} for p in parts],
        "tramos": [{"id": t.id, "orden": t.orden, "inicio_s": t.inicio_s, "fin_s": t.fin_s, "texto": t.texto,
                    "texto_original": t.texto_original, "participante_id": t.participante_id} for t in tramos],
        "compromisos": [_c_dict(c) for c in comps],
        "bot": ({"estado": cap.estado_proveedor, "detalle": cap.detalle, "plataforma": cap.plataforma}
                if (cap := await _captura(db, r.id)) else None),
    }


@router.post("/{reunion_id}/aviso")
async def confirmar_aviso(reunion_id: int, datos: AvisoEntrada, db: AsyncSession = Depends(get_db),
                          u: Usuario = Depends(permiso)):
    """Constancia de que se avisó a los asistentes (Ley 1581)."""
    if not datos.confirmo:
        raise HTTPException(422, "Debe confirmar que avisó a los asistentes que la reunión se graba.")
    r = await _reunion(db, reunion_id)
    if r.estado != PROGRAMADA:
        raise HTTPException(409, "El aviso se confirma antes de empezar a grabar.")
    c = await servicio.config(db)
    r.aviso_texto, r.aviso_confirmado_por_id, r.aviso_confirmado_en = c.aviso_texto, u.id, servicio.ahora()
    return _r_dict(r)


def _exigir_aviso(r: CRMReunion) -> None:
    if r.aviso_confirmado_en is None:
        raise HTTPException(409, "Antes de grabar confirme que avisó a los asistentes que la reunión se graba.")


@router.post("/{reunion_id}/iniciar")
async def iniciar(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    _exigir_aviso(r)
    if r.estado not in (PROGRAMADA, EN_CURSO):
        raise HTTPException(409, "Esta reunión ya no se puede grabar.")
    r.estado, r.fuente_captura = EN_CURSO, "grabador_web"
    return _r_dict(r)


@router.put("/{reunion_id}/partes/{sesion}/{numero}", status_code=204)
async def recibir_parte(reunion_id: int, sesion: int, numero: int, request: Request,
                        db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    """Una parte del grabador web. Repetirla no hace daño: se sobrescribe igual."""
    r = await _reunion(db, reunion_id)
    if r.estado != EN_CURSO or r.fuente_captura != "grabador_web":
        raise HTTPException(409, "La reunión no está grabando.")
    if not (1 <= sesion <= 99 and 1 <= numero <= 999999):
        raise HTTPException(422, "Número de parte fuera de rango.")
    destino = audio.ruta_parte(_esquema(), r.id, sesion, numero)
    temporal = destino.with_suffix(".tmp")
    tam = 0
    with temporal.open("wb") as f:
        async for trozo in request.stream():
            tam += len(trozo)
            if tam > MAX_PARTE_MB * 1024 * 1024:
                f.close()
                temporal.unlink(missing_ok=True)
                raise HTTPException(413, "Parte demasiado grande.")
            f.write(trozo)
    if tam == 0:
        temporal.unlink(missing_ok=True)
        raise HTTPException(422, "Parte vacía.")
    temporal.replace(destino)          # atómico: nunca queda una parte a medias
    r.partes_recibidas = (r.partes_recibidas or 0) + 1


@router.post("/{reunion_id}/detener")
async def detener(reunion_id: int, datos: DetenerEntrada, db: AsyncSession = Depends(get_db),
                  u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    if r.estado != EN_CURSO:
        raise HTTPException(409, "La reunión no está grabando.")
    if not datos.sesiones or any(t < 1 for t in datos.sesiones.values()):
        raise HTTPException(422, "No llegó ninguna parte de audio.")
    faltan = audio.partes_faltantes(_esquema(), r.id, datos.sesiones)
    if faltan:
        # El grabador sigue teniendo esas partes en el navegador: las reenvía y
        # vuelve a llamar. Así un corte de red no deja huecos.
        raise HTTPException(409, {"mensaje": "Faltan partes del audio; el grabador debe reenviarlas.",
                                  "faltan": faltan})
    try:
        final = await asyncio.to_thread(audio.unir_partes, _esquema(), r.id, datos.sesiones)
    except audio.ErrorAudio as e:
        raise HTTPException(422, f"No se pudo armar el audio: {e}")
    shutil.rmtree(audio.carpeta_partes(_esquema(), r.id), ignore_errors=True)
    r.audio_ruta, r.estado = str(final), PROCESANDO
    await servicio.encolar(db, r.id, "TRANSCRIBIR")
    return _r_dict(r)


def _tiene_audio(ruta: Path) -> bool:
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
                        "stream=codec_type", "-of", "csv=p=0", str(ruta)], capture_output=True, text=True)
    return "audio" in p.stdout


@router.post("/{reunion_id}/archivo")
async def subir_archivo(reunion_id: int, archivo: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                        u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    _exigir_aviso(r)
    if r.estado not in (PROGRAMADA, EN_CURSO):
        raise HTTPException(409, "Esta reunión ya tiene audio.")
    ext = Path(archivo.filename or "").suffix.lower()
    admitidos = "mp3, mp4, m4a, wav o webm"
    if ext not in audio.FORMATOS:
        raise HTTPException(422, f"Formato no admitido. Suba un archivo {admitidos}.")
    destino = audio.carpeta(_esquema(), r.id) / f"original{ext}"

    def copiar():
        with destino.open("wb") as f:
            shutil.copyfileobj(archivo.file, f, length=1024 * 1024)
        return destino.stat().st_size

    tam = await asyncio.to_thread(copiar)
    if tam > MAX_ARCHIVO_MB * 1024 * 1024 or not await asyncio.to_thread(_tiene_audio, destino):
        destino.unlink(missing_ok=True)
        raise HTTPException(422, f"El archivo no tiene audio legible. Suba un archivo {admitidos}.")
    r.audio_ruta, r.estado, r.fuente_captura = str(destino), PROCESANDO, "carga_archivo"
    await servicio.encolar(db, r.id, "TRANSCRIBIR")
    return _r_dict(r)


@router.post("/{reunion_id}/reintentar")
async def reintentar(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    if r.estado != "FALLIDA":
        raise HTTPException(409, "Solo se reintenta una reunión fallida.")
    try:
        tipo = await cola.reintentar(db, r)
    except ValueError as e:
        raise HTTPException(409, str(e))
    return {**_r_dict(r), "reintento": tipo}


@router.post("/{reunion_id}/reextraer")
async def reextraer(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    """Vuelve a pedir la propuesta sin transcribir de nuevo (p. ej. tras corregir tramos)."""
    r = await _reunion(db, reunion_id)
    await _puede_revisar(db, r, u)
    if r.estado not in (POR_REVISAR, "FALLIDA") or not await servicio.tramos_de(db, r.id):
        raise HTTPException(409, "La reunión no tiene una transcripción lista.")
    r.estado, r.motivo_falla = PROCESANDO, None
    await servicio.encolar(db, r.id, "EXTRAER")
    return _r_dict(r)


@router.delete("/{reunion_id}/audio")
async def borrar_audio(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    if not _es_admin(u):
        raise HTTPException(403, "Solo un administrador borra el audio antes del plazo.")
    r = await _reunion(db, reunion_id)
    if r.estado == PROCESANDO:
        raise HTTPException(409, "Espere a que termine de procesarse.")
    if not r.audio_ruta:
        raise HTTPException(409, "Esta reunión no tiene audio.")
    await servicio.borrar_audio(db, _esquema(), r, u.id)
    return _r_dict(r)


# ── Transcripción: corrección y hablantes ──────────────────────────────────────
@router.put("/tramos/{tramo_id}")
async def editar_tramo(tramo_id: int, datos: TramoEdicion, db: AsyncSession = Depends(get_db),
                       u: Usuario = Depends(permiso)):
    t = await db.get(CRMReunionTramo, tramo_id)
    if t is None:
        raise HTTPException(404, "Ese tramo no existe.")
    await _puede_revisar(db, await _reunion(db, t.reunion_id), u)
    if datos.texto is not None and datos.texto.strip() and datos.texto.strip() != t.texto:
        if t.texto_original is None:
            t.texto_original = t.texto        # se guarda solo lo que dijo la transcripción
        t.texto, t.corregido_por_id = datos.texto.strip(), u.id
    if datos.quitar_participante:
        t.participante_id = None
    elif datos.participante_id is not None:
        p = await db.get(CRMReunionParticipante, datos.participante_id)
        if p is None or p.reunion_id != t.reunion_id:
            raise HTTPException(422, "Ese participante no es de esta reunión.")
        t.participante_id = p.id
    return {"id": t.id, "texto": t.texto, "texto_original": t.texto_original, "participante_id": t.participante_id}


# ── Revisión de compromisos ────────────────────────────────────────────────────
async def _compromiso(db: AsyncSession, cid: int, u: Usuario) -> CRMReunionCompromiso:
    c = await db.get(CRMReunionCompromiso, cid)
    if c is None:
        raise HTTPException(404, "Ese punto no existe.")
    await _puede_revisar(db, await _reunion(db, c.reunion_id), u)
    return c


@router.put("/compromisos/{cid}")
async def editar_compromiso(cid: int, datos: CompromisoEdicion, db: AsyncSession = Depends(get_db),
                            u: Usuario = Depends(permiso)):
    c = await _compromiso(db, cid, u)
    if c.estado != "PROPUESTO":
        raise HTTPException(409, "Solo se edita lo que está por revisar.")
    if datos.tipo is not None:
        if datos.tipo not in ("COMPROMISO", "ACUERDO", "RIESGO"):
            raise HTTPException(422, "Tipo no válido.")
        c.tipo = datos.tipo
    if datos.lado is not None:
        if datos.lado not in ("NUESTRO", "CLIENTE"):
            raise HTTPException(422, "El lado es NUESTRO o CLIENTE.")
        c.lado = datos.lado
    if datos.descripcion is not None and datos.descripcion.strip():
        c.descripcion = datos.descripcion.strip()
    if datos.participante_id is not None:
        p = await db.get(CRMReunionParticipante, datos.participante_id)
        if p is None or p.reunion_id != c.reunion_id:
            raise HTTPException(422, "Ese participante no es de esta reunión.")
        c.participante_id = p.id
        if p.usuario_id or p.contacto_id:
            c.lado = "NUESTRO" if p.usuario_id else "CLIENTE"
    if datos.quitar_fecha:
        c.fecha_limite = None
    elif datos.fecha_limite is not None:
        c.fecha_limite = datos.fecha_limite
    return _c_dict(c)


@router.post("/compromisos/{cid}/aprobar")
async def aprobar(cid: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    c = await _compromiso(db, cid, u)
    if c.estado != "PROPUESTO":
        raise HTTPException(409, "Ese punto ya fue revisado.")
    if c.tipo == "COMPROMISO" and c.lado not in ("NUESTRO", "CLIENTE"):
        raise HTTPException(422, "Indique si el compromiso es nuestro o del cliente antes de aprobarlo.")
    await servicio.aprobar(db, c, u.id)
    return _c_dict(c)


@router.post("/compromisos/{cid}/descartar")
async def descartar(cid: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    c = await _compromiso(db, cid, u)
    if c.estado != "PROPUESTO":
        raise HTTPException(409, "Ese punto ya fue revisado.")
    c.estado, c.revisado_por_id, c.revisado_en = "DESCARTADO", u.id, servicio.ahora()
    return _c_dict(c)


@router.post("/compromisos/{cid}/cumplido")
async def cumplido(cid: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    c = await db.get(CRMReunionCompromiso, cid)
    if c is None or c.estado != "APROBADO":
        raise HTTPException(409, "Solo se marca cumplido un compromiso aprobado.")
    c.estado, c.cumplido_en = "CUMPLIDO", servicio.ahora()
    return _c_dict(c)


@router.post("/{reunion_id}/cerrar")
async def cerrar(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    await _puede_revisar(db, r, u)
    if r.estado != POR_REVISAR:
        raise HTTPException(409, "Solo se cierra una reunión que está por revisar.")
    try:
        await servicio.cerrar(db, r, u.id)
    except ValueError as e:
        raise HTTPException(409, str(e))
    return _r_dict(r)


# ── Bot en reuniones virtuales (fase 2) ────────────────────────────────────────
async def _captura(db: AsyncSession, reunion_id: int):
    return (await db.execute(select(CRMReunionCaptura).where(CRMReunionCaptura.reunion_id == reunion_id)
                             .order_by(CRMReunionCaptura.id.desc()).limit(1))).scalar_one_or_none()


@router.post("/{reunion_id}/bot")
async def enviar_bot(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    r = await _reunion(db, reunion_id)
    _exigir_aviso(r)
    if r.origen != "VIRTUAL" or not r.enlace:
        raise HTTPException(422, "El bot es para reuniones virtuales con su enlace.")
    if r.estado != PROGRAMADA:
        raise HTTPException(409, "Esta reunión ya se está grabando o ya terminó.")
    try:
        destino = captura.destino_de(r.enlace)
    except captura.CapturaNoDisponible as e:
        raise HTTPException(422, str(e))
    if destino.plataforma == "ZOOM":
        # Desde marzo de 2026 Zoom solo deja entrar a un bot externo con la
        # autorización de alguien que conectó su cuenta y está en la reunión.
        raise HTTPException(409, "Para grabar con el bot en Zoom hace falta conectar una cuenta de Zoom de la empresa; "
                                 "esa conexión todavía no está disponible. Grabe desde la aplicación o suba la grabación.")
    if not captura.configurado():
        raise HTTPException(503, "El bot de reuniones no está configurado en este servidor.")
    try:
        prov = captura.proveedor()
        datos = await prov.pedir_bot(destino)
    except captura.CapturaNoDisponible as e:
        raise HTTPException(409, str(e))
    except Exception as e:  # noqa: BLE001 — el servidor del bot caído no debe parecer un error nuestro
        raise HTTPException(502, f"No se pudo contactar al bot de reuniones: {type(e).__name__}.")
    db.add(CRMReunionCaptura(reunion_id=r.id, proveedor=prov.nombre, plataforma=destino.plataforma,
                             id_externo=destino.id_externo, datos=datos, estado_proveedor="requested"))
    r.estado, r.fuente_captura, r.plataforma = EN_CURSO, prov.nombre, destino.plataforma
    await servicio.encolar(db, r.id, "SONDEAR_BOT", en_segundos=10)
    return {**_r_dict(r), "bot": {"estado": "requested"}}


@router.post("/{reunion_id}/bot/retirar")
async def retirar_bot(reunion_id: int, db: AsyncSession = Depends(get_db), u: Usuario = Depends(permiso)):
    """Saca al bot antes de que termine la reunión; lo grabado hasta ahí se procesa igual."""
    r = await _reunion(db, reunion_id)
    cap = await _captura(db, r.id)
    if cap is None or r.estado != EN_CURSO:
        raise HTTPException(409, "No hay un bot en esta reunión.")
    try:
        await captura.proveedor().retirar(cap)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"No se pudo retirar el bot: {type(e).__name__}.")
    cap.estado_proveedor = "stopping"
    return _r_dict(r)


# ── Texto en vivo ──────────────────────────────────────────────────────────────
@router.post("/vivo/credencial")
async def credencial_vivo(u: Usuario = Depends(permiso)):
    """Credencial efímera para que el navegador abra la transcripción en vivo.

    La clave de OpenAI nunca sale del servidor; esta vence en minutos y solo
    sirve para una sesión de transcripción.
    """
    try:
        return await asyncio.to_thread(lambda: ia.motor().credencial_vivo())
    except ia.NoConfigurado as e:
        raise HTTPException(503, str(e))
