"""
Las operaciones del asistente de reuniones, compartidas por la API y la cola.

Ninguna función hace commit: lo hace quien la llama (la petición o el
trabajo), para que una operación a medias no deje la reunión en un estado
intermedio.
"""
from __future__ import annotations

import asyncio
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Sequence
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.reuniones import audio, ia
from app.core.reuniones.extraccion import Buscador, Candidato, TramoTexto, emparejar, fecha_valida
from app.infrastructure.models.crm import (
    CRMActividad, CRMCliente, CRMContacto, CRMEjecutivoComercial, CRMInteraccion, CRMOportunidad,
    TipoInteraccionEnum,
)
from app.infrastructure.models.crm_reuniones import (
    CERRADA, FALLIDA, POR_REVISAR, PROCESANDO, CRMReunion, CRMReunionCompromiso, CRMReunionConfig,
    CRMReunionParticipante, CRMReunionTrabajo, CRMReunionTramo,
)
from app.infrastructure.models.usuario import Usuario

BOGOTA = ZoneInfo("America/Bogota")
TRANSCRIPCIONES_SIMULTANEAS = 4


def ahora() -> datetime:
    return datetime.now(timezone.utc)


async def config(db: AsyncSession) -> CRMReunionConfig:
    c = (await db.execute(select(CRMReunionConfig).limit(1))).scalar_one_or_none()
    if c is None:
        c = CRMReunionConfig()
        db.add(c)
        await db.flush()
    return c


async def encolar(db: AsyncSession, reunion_id: Optional[int], tipo: str, en_segundos: int = 0) -> None:
    db.add(CRMReunionTrabajo(reunion_id=reunion_id, tipo=tipo,
                             siguiente_intento=ahora() + timedelta(seconds=en_segundos)))


# ── Contexto de la reunión ─────────────────────────────────────────────────────
async def participantes(db: AsyncSession, reunion_id: int) -> List[CRMReunionParticipante]:
    return list((await db.execute(select(CRMReunionParticipante).where(
        CRMReunionParticipante.reunion_id == reunion_id).order_by(CRMReunionParticipante.id))).scalars())


async def candidatos(db: AsyncSession, reunion_id: int) -> List[Candidato]:
    return [Candidato(p.id, p.nombre, "NUESTRO" if p.usuario_id else "CLIENTE")
            for p in await participantes(db, reunion_id) if p.contacto_id or p.usuario_id]


async def palabras_clave(db: AsyncSession, r: CRMReunion) -> List[str]:
    """El vocabulario del cliente: su nombre, sus contactos y la oportunidad."""
    cliente = await db.get(CRMCliente, r.cliente_id)
    palabras = [cliente.razon_social] if cliente else []
    palabras += list((await db.execute(select(CRMContacto.nombre).where(
        CRMContacto.cliente_id == r.cliente_id, CRMContacto.activo.isnot(False)))).scalars())
    palabras += [p.nombre for p in await participantes(db, r.id)]
    if r.oportunidad_id:
        op = await db.get(CRMOportunidad, r.oportunidad_id)
        if op:
            palabras.append(op.nombre)
    return palabras


async def nombre_empresa(db: AsyncSession, esquema: str) -> Optional[str]:
    try:
        return (await db.execute(text("SELECT nombre FROM public.plataforma_cliente WHERE esquema = :e"),
                                 {"e": esquema})).scalar()
    except Exception:  # noqa: BLE001 — sin registro de clientes (instalación de una sola empresa)
        return None


# ── Transcripción ──────────────────────────────────────────────────────────────
@dataclass
class Segmento:
    """Un tramo de habla que entrega la captura: quién habló y cuándo."""
    nombre_captura: str
    inicio_s: float
    fin_s: float


def participante_de_tramo(inicio: float, fin: float, segmentos: Sequence[Segmento]) -> Optional[str]:
    """El nombre de captura que más habló dentro del tramo (por solapamiento)."""
    tiempo = {}
    for s in segmentos:
        sol = min(fin, s.fin_s) - max(inicio, s.inicio_s)
        if sol > 0:
            tiempo[s.nombre_captura] = tiempo.get(s.nombre_captura, 0) + sol
    return max(tiempo, key=tiempo.get) if tiempo else None


async def transcribir(db: AsyncSession, esquema: str, r: CRMReunion,
                      segmentos: Sequence[Segmento] = ()) -> None:
    """Normaliza, parte en silencios, transcribe cada trozo y guarda los tramos.

    Si la captura trae segmentos por participante (el bot), cada tramo queda
    con quien más habló en él; si no (presencial), queda sin asignar.
    """
    if not r.audio_ruta or not Path(r.audio_ruta).exists():
        raise RuntimeError("La reunión no tiene audio para transcribir.")
    motor = ia.motor()
    base = audio.carpeta(esquema, r.id)
    normal = await asyncio.to_thread(audio.normalizar, Path(r.audio_ruta), base / "normalizado.ogg")
    r.audio_duracion_s = int(await asyncio.to_thread(audio.duracion, normal))
    carpeta_trozos = base / "trozos"
    shutil.rmtree(carpeta_trozos, ignore_errors=True)
    trozos = await asyncio.to_thread(audio.partir, normal, carpeta_trozos)

    claves = await palabras_clave(db, r)
    limite = asyncio.Semaphore(TRANSCRIPCIONES_SIMULTANEAS)

    async def uno(t):
        async with limite:
            return await asyncio.to_thread(motor.transcribir, t.ruta, claves)

    textos = await asyncio.gather(*(uno(t) for t in trozos))

    por_nombre = {}
    if segmentos:
        for p in await participantes(db, r.id):
            por_nombre[p.nombre_captura or p.nombre] = p.id
    await db.execute(delete(CRMReunionTramo).where(CRMReunionTramo.reunion_id == r.id))
    orden = 0
    for t, txt in zip(trozos, textos):
        if not txt:
            continue            # silencio o ruido: no es un tramo
        orden += 1
        quien = participante_de_tramo(t.inicio_s, t.fin_s, segmentos) if segmentos else None
        db.add(CRMReunionTramo(reunion_id=r.id, orden=orden, inicio_s=round(t.inicio_s, 2),
                               fin_s=round(t.fin_s, 2), texto=txt, participante_id=por_nombre.get(quien)))
    shutil.rmtree(carpeta_trozos, ignore_errors=True)
    normal.unlink(missing_ok=True)
    await db.flush()


async def tramos_de(db: AsyncSession, reunion_id: int) -> List[CRMReunionTramo]:
    return list((await db.execute(select(CRMReunionTramo).where(
        CRMReunionTramo.reunion_id == reunion_id).order_by(CRMReunionTramo.orden))).scalars())


# ── Extracción ─────────────────────────────────────────────────────────────────
def _transcripcion_para_modelo(tramos, nombres) -> str:
    lineas = []
    for t in tramos:
        m, s = divmod(int(t.inicio_s), 60)
        quien = nombres.get(t.participante_id)
        lineas.append(f"[{m:02d}:{s:02d}]{' ' + quien + ':' if quien else ''} {t.texto}")
    return "\n".join(lineas)


async def extraer(db: AsyncSession, esquema: str, r: CRMReunion) -> int:
    """Pide la propuesta, la verifica y la deja PROPUESTA. Devuelve cuántos ítems quedaron."""
    tramos = await tramos_de(db, r.id)
    if not tramos:
        raise RuntimeError("La reunión no tiene transcripción.")
    parts = await participantes(db, r.id)
    nombres = {p.id: p.nombre for p in parts}
    cliente = await db.get(CRMCliente, r.cliente_id)
    fecha_r = r.fecha.astimezone(BOGOTA).date()
    resultado = await asyncio.to_thread(ia.motor().extraer, _transcripcion_para_modelo(tramos, nombres), {
        "empresa": await nombre_empresa(db, esquema),
        "cliente": cliente.razon_social if cliente else None,
        "fecha": fecha_r,
        "participantes": [f"{p.nombre} ({'nuestra empresa' if p.usuario_id else 'cliente' if p.contacto_id else 'sin identificar'})"
                          for p in parts],
    })

    buscador = Buscador([TramoTexto(t.inicio_s, t.texto) for t in tramos])
    cands = await candidatos(db, r.id)
    # Una extracción nueva reemplaza la propuesta anterior, pero nunca lo que
    # ya se revisó.
    await db.execute(delete(CRMReunionCompromiso).where(
        CRMReunionCompromiso.reunion_id == r.id, CRMReunionCompromiso.estado == "PROPUESTO"))
    quedaron = 0
    for it in resultado.items:
        minuto = buscador.minuto(it.cita)
        if minuto is None:
            continue            # sin evidencia en la transcripción: no se muestra
        quien = emparejar(it.responsable, cands) if it.tipo == "COMPROMISO" else None
        lado = (quien.lado if quien else it.lado) if it.tipo == "COMPROMISO" else None
        db.add(CRMReunionCompromiso(
            reunion_id=r.id, cliente_id=r.cliente_id, tipo=it.tipo, lado=lado,
            descripcion=it.descripcion.strip()[:2000], responsable_nombre=(it.responsable or None),
            participante_id=quien.participante_id if quien else None,
            fecha_limite=fecha_valida(it.fecha_limite, fecha_r) if it.tipo == "COMPROMISO" else None,
            cita=it.cita.strip(), minuto_s=minuto, estado="PROPUESTO"))
        quedaron += 1
    r.resumen = resultado.resumen.strip()
    await db.flush()
    return quedaron


# ── Revisión ───────────────────────────────────────────────────────────────────
async def _ejecutivo_de(db: AsyncSession, participante_id: Optional[int]) -> Optional[int]:
    if not participante_id:
        return None
    p = await db.get(CRMReunionParticipante, participante_id)
    if not p or not p.usuario_id:
        return None
    return (await db.execute(select(CRMEjecutivoComercial.id).where(
        CRMEjecutivoComercial.usuario_id == p.usuario_id).limit(1))).scalar()


async def aprobar(db: AsyncSession, c: CRMReunionCompromiso, usuario_id: int) -> None:
    """Aprueba. Un compromiso nuestro se vuelve actividad del CRM."""
    r = await db.get(CRMReunion, c.reunion_id)
    if c.tipo == "COMPROMISO" and c.lado == "NUESTRO" and not c.actividad_id:
        responsable = ""
        if c.participante_id:
            p = await db.get(CRMReunionParticipante, c.participante_id)
            responsable = f" (responsable: {p.nombre})" if p else ""
        act = CRMActividad(
            cliente_id=c.cliente_id, oportunidad_id=r.oportunidad_id,
            ejecutivo_id=await _ejecutivo_de(db, c.participante_id),
            tipo="COMPROMISO_REUNION", asunto=c.descripcion[:200],
            descripcion=f"Compromiso de la reunión «{r.titulo}»{responsable}.\nCita: «{c.cita}»\nReunión #{r.id}",
            fecha_vencimiento=(datetime.combine(c.fecha_limite, datetime.min.time(), BOGOTA) + timedelta(hours=18))
            if c.fecha_limite else None,
            completada=False, prioridad="MEDIA")
        db.add(act)
        await db.flush()
        c.actividad_id = act.id
    c.estado, c.revisado_por_id, c.revisado_en = "APROBADO", usuario_id, ahora()


async def cerrar(db: AsyncSession, r: CRMReunion, usuario_id: int) -> CRMInteraccion:
    pendientes = (await db.execute(select(CRMReunionCompromiso.id).where(
        CRMReunionCompromiso.reunion_id == r.id, CRMReunionCompromiso.estado == "PROPUESTO"))).scalars().all()
    if pendientes:
        raise ValueError(f"Faltan {len(pendientes)} puntos por revisar.")
    aprobados = list((await db.execute(select(CRMReunionCompromiso).where(
        CRMReunionCompromiso.reunion_id == r.id, CRMReunionCompromiso.estado == "APROBADO",
        CRMReunionCompromiso.tipo == "COMPROMISO"))).scalars())
    contacto = next((p.contacto_id for p in await participantes(db, r.id) if p.contacto_id), None)
    usuario = await db.get(Usuario, usuario_id)
    ejecutivo = (await db.execute(select(CRMEjecutivoComercial.id).where(
        CRMEjecutivoComercial.usuario_id == usuario_id).limit(1))).scalar() if usuario else None
    proximo = aprobados[0].descripcion[:200] if aprobados else None
    inter = CRMInteraccion(
        cliente_id=r.cliente_id, contacto_id=contacto, oportunidad_id=r.oportunidad_id,
        ejecutivo_id=ejecutivo, tipo=TipoInteraccionEnum.REUNION, asunto=r.titulo[:300],
        descripcion=(r.resumen or "") + f"\n\nReunión #{r.id} — {len(aprobados)} compromisos aprobados.",
        duracion_min=round((r.audio_duracion_s or 0) / 60) or None,
        resultado=f"{len(aprobados)} compromisos"[:200], proximo_paso=proximo, fecha_interaccion=r.fecha)
    db.add(inter)
    await db.flush()
    r.interaccion_id, r.estado, r.cerrada_en = inter.id, CERRADA, ahora()
    return inter


# ── Retención ──────────────────────────────────────────────────────────────────
async def borrar_audio(db: AsyncSession, esquema: str, r: CRMReunion, usuario_id: Optional[int] = None) -> None:
    await asyncio.to_thread(audio.borrar_todo, esquema, r.id)
    r.audio_ruta = None
    r.audio_borrado_en = ahora()
    r.audio_borrado_por_id = usuario_id


async def aplicar_retencion(db: AsyncSession, esquema: str, momento: Optional[datetime] = None) -> int:
    """Borra el audio de las reuniones cuyo plazo venció. Devuelve cuántas."""
    c = await config(db)
    limite = (momento or ahora()) - timedelta(days=c.retencion_audio_dias)
    vencidas = list((await db.execute(select(CRMReunion).where(
        CRMReunion.audio_borrado_en.is_(None), CRMReunion.audio_ruta.isnot(None), CRMReunion.fecha < limite,
        # Lo que todavía se está procesando no se toca: borrarle el audio
        # dejaría la transcripción a medias.
        CRMReunion.estado.notin_([PROCESANDO])))).scalars())
    for r in vencidas:
        await borrar_audio(db, esquema, r)
    return len(vencidas)


async def fallar(r: CRMReunion, motivo: str) -> None:
    r.estado, r.motivo_falla = FALLIDA, motivo[:300]


async def listo_para_revisar(r: CRMReunion) -> None:
    r.estado, r.motivo_falla = POR_REVISAR, None
