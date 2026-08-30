"""
Checklists — ejecución, evidencias y tablero.

Acá se llena la inspección. Los catálogos y las plantillas están en
`checklists.py`.

LO QUE HACÍA FALTA Y NO EXISTÍA
El módulo anterior no tenía forma de responder: había endpoints para crear
plantillas y ejecuciones, pero ninguno para guardar una respuesta. Una
inspección se podía abrir y nunca llenar.
"""
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.tenant import esquema_actual, ESQUEMA_POR_DEFECTO
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.eam import EAMActivo, EAMOrdenTrabajo
from app.infrastructure.models.checklist import (
    ChkCategoria, ChkHallazgo, ChkPlantilla, ChkSeccion, ChkItem,
    ChkEjecucion, ChkRespuesta, ChkFoto, ChkProgramacion,
)

router = APIRouter(prefix="/eam/chk", tags=["CMMS/EAM · Checklists"])

EXTENSIONES_FOTO = {".png", ".jpg", ".jpeg", ".webp", ".heic", ".gif", ".bmp", ".pdf"}
MAX_BYTES = 15 * 1024 * 1024


def _quien(u: Usuario) -> str:
    return getattr(u, "username", None) or getattr(u, "nombre", None) or "—"


def _carpeta() -> str:
    esquema = esquema_actual() or ESQUEMA_POR_DEFECTO
    return f"eam_chk/{re.sub(r'[^A-Za-z0-9_]', '_', esquema)}"


def _nombre_seguro(nombre: str) -> str:
    limpio = re.sub(r"[^A-Za-z0-9._ -]", "_", os.path.basename(nombre or "foto"))
    return limpio[:120] or "foto"


# ══════════════════════════════════════════════════════════════════════════════
# EJECUCIÓN
# ══════════════════════════════════════════════════════════════════════════════

class EjecucionIn(BaseModel):
    plantilla_id: int
    activo_id: int
    ot_id: Optional[int] = None
    fecha_inicio: Optional[datetime] = None
    odometro: Optional[float] = None
    horometro: Optional[float] = None
    ubicacion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class RespuestaIn(BaseModel):
    item_id: int
    valor_texto: Optional[str] = None
    valor_numero: Optional[float] = None
    valor_bool: Optional[bool] = None
    conforme: Optional[bool] = None
    observacion: Optional[str] = None
    hallazgo_id: Optional[int] = None
    no_aplica: bool = False


class GuardarRespuestasIn(BaseModel):
    respuestas: List[RespuestaIn]


class CerrarIn(BaseModel):
    observaciones: Optional[str] = None
    firma_nombre: Optional[str] = None
    odometro: Optional[float] = None
    horometro: Optional[float] = None


class EjecucionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero: str
    plantilla_id: int
    plantilla_version: int
    activo_id: int
    ot_id: Optional[int] = None
    ejecutado_por: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    estado: str
    resultado: str
    pct_conforme: Optional[float] = None
    total_items: int = 0
    no_conformes: int = 0
    criticos_no_conformes: int = 0
    odometro: Optional[float] = None
    horometro: Optional[float] = None
    ubicacion: Optional[str] = None
    observaciones: Optional[str] = None
    firma_nombre: Optional[str] = None
    plantilla: Optional[str] = None
    activo_codigo: Optional[str] = None
    activo_nombre: Optional[str] = None
    fotos: Optional[int] = None


async def _numero(db: AsyncSession) -> str:
    """Consecutivo por año: INS-2026-0001."""
    anio = datetime.utcnow().year
    r = await db.execute(select(func.count()).select_from(ChkEjecucion)
                         .where(ChkEjecucion.numero.like(f"INS-{anio}-%")))
    return f"INS-{anio}-{(r.scalar() or 0) + 1:04d}"


@router.get("/ejecuciones", response_model=List[EjecucionOut])
async def listar(activo_id: Optional[int] = None, plantilla_id: Optional[int] = None,
                 estado: Optional[str] = None, resultado: Optional[str] = None,
                 limite: int = Query(200, le=1000),
                 db: AsyncSession = Depends(get_db)):
    q = (select(ChkEjecucion, ChkPlantilla.nombre, EAMActivo.codigo, EAMActivo.nombre)
         .join(ChkPlantilla, ChkPlantilla.id == ChkEjecucion.plantilla_id)
         .join(EAMActivo, EAMActivo.id == ChkEjecucion.activo_id)
         .order_by(desc(ChkEjecucion.fecha_inicio)).limit(limite))
    if activo_id:
        q = q.where(ChkEjecucion.activo_id == activo_id)
    if plantilla_id:
        q = q.where(ChkEjecucion.plantilla_id == plantilla_id)
    if estado:
        q = q.where(ChkEjecucion.estado == estado)
    if resultado:
        q = q.where(ChkEjecucion.resultado == resultado)

    filas = (await db.execute(q)).all()
    ids = [e.id for e, *_ in filas]
    fotos: Dict[int, int] = {}
    if ids:
        r = await db.execute(select(ChkFoto.ejecucion_id, func.count(ChkFoto.id))
                             .where(ChkFoto.ejecucion_id.in_(ids))
                             .group_by(ChkFoto.ejecucion_id))
        fotos = {k: v for k, v in r.all()}

    salida = []
    for e, plantilla, codigo, nombre in filas:
        d = EjecucionOut.model_validate(e).model_dump()
        d.update(plantilla=plantilla, activo_codigo=codigo, activo_nombre=nombre,
                 fotos=fotos.get(e.id, 0))
        salida.append(d)
    return salida


@router.post("/ejecuciones", response_model=EjecucionOut, status_code=201)
async def abrir(data: EjecucionIn, db: AsyncSession = Depends(get_db),
                usuario: Usuario = Depends(get_current_user)):
    plantilla = await db.get(ChkPlantilla, data.plantilla_id)
    if not plantilla:
        raise HTTPException(400, "Esa plantilla no existe")
    activo = await db.get(EAMActivo, data.activo_id)
    if not activo:
        raise HTTPException(400, "Ese activo no existe")

    r = await db.execute(select(func.count()).select_from(ChkItem).where(and_(
        ChkItem.plantilla_id == plantilla.id, ChkItem.activo.is_(True))))
    total = r.scalar() or 0
    if not total:
        raise HTTPException(
            400, "Esa plantilla no tiene preguntas activas: agréguelas antes de usarla")

    obj = ChkEjecucion(
        numero=await _numero(db),
        plantilla_id=plantilla.id,
        # Se congela la versión: si mañana editan la plantilla, esta inspección
        # sigue significando lo mismo.
        plantilla_version=plantilla.version or 1,
        activo_id=data.activo_id, ot_id=data.ot_id,
        ejecutado_por=_quien(usuario),
        fecha_inicio=data.fecha_inicio or datetime.utcnow(),
        odometro=data.odometro, horometro=data.horometro,
        ubicacion=data.ubicacion, latitud=data.latitud, longitud=data.longitud,
        estado="BORRADOR", resultado="PENDIENTE", total_items=total)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return EjecucionOut.model_validate(obj)


@router.get("/ejecuciones/{eid}", response_model=Dict[str, Any])
async def detalle(eid: int, db: AsyncSession = Depends(get_db)):
    """La inspección con su estructura y lo respondido hasta ahora."""
    e = await db.get(ChkEjecucion, eid)
    if not e:
        raise HTTPException(404, "Esa inspección no existe")
    plantilla = await db.get(ChkPlantilla, e.plantilla_id)
    activo = await db.get(EAMActivo, e.activo_id)

    r = await db.execute(select(ChkSeccion).where(and_(
        ChkSeccion.plantilla_id == e.plantilla_id, ChkSeccion.activo.is_(True)))
        .order_by(ChkSeccion.orden, ChkSeccion.id))
    secciones = list(r.scalars().all())

    r = await db.execute(select(ChkItem).where(and_(
        ChkItem.plantilla_id == e.plantilla_id, ChkItem.activo.is_(True)))
        .order_by(ChkItem.orden, ChkItem.id))
    items = list(r.scalars().all())

    r = await db.execute(select(ChkRespuesta).where(ChkRespuesta.ejecucion_id == eid))
    respuestas = {x.item_id: x for x in r.scalars().all()}

    r = await db.execute(select(ChkFoto).where(ChkFoto.ejecucion_id == eid))
    fotos_por_respuesta: Dict[Optional[int], List[Dict[str, Any]]] = {}
    for f in r.scalars().all():
        fotos_por_respuesta.setdefault(f.respuesta_id, []).append(
            {"id": f.id, "nombre": f.nombre, "nota": f.nota,
             "url": f"/api/v1/eam/chk/fotos/{f.id}"})

    def _fila(i: ChkItem) -> Dict[str, Any]:
        resp = respuestas.get(i.id)
        return {
            "item_id": i.id, "pregunta": i.pregunta, "ayuda": i.ayuda,
            "tipo": i.tipo, "opciones": i.opciones, "unidad": i.unidad,
            "valor_min": i.valor_min, "valor_max": i.valor_max,
            "obligatorio": i.obligatorio, "critico": i.critico,
            "requiere_foto": i.requiere_foto,
            "exige_observacion_no_conforme": i.exige_observacion_no_conforme,
            "peso": i.peso,
            "respuesta": None if not resp else {
                "id": resp.id, "valor_texto": resp.valor_texto,
                "valor_numero": resp.valor_numero, "valor_bool": resp.valor_bool,
                "conforme": resp.conforme, "observacion": resp.observacion,
                "hallazgo_id": resp.hallazgo_id, "no_aplica": resp.no_aplica,
                "fotos": fotos_por_respuesta.get(resp.id, []),
            },
        }

    por_seccion: Dict[Optional[int], List[Dict[str, Any]]] = {}
    for i in items:
        por_seccion.setdefault(i.seccion_id, []).append(_fila(i))

    bloques = [{"id": s.id, "nombre": s.nombre, "descripcion": s.descripcion,
                "items": por_seccion.get(s.id, [])} for s in secciones]
    if por_seccion.get(None):
        bloques.append({"id": None, "nombre": "Sin sección", "descripcion": None,
                        "items": por_seccion[None]})

    return {
        "ejecucion": EjecucionOut.model_validate(e).model_dump(),
        "plantilla": {
            "id": plantilla.id, "nombre": plantilla.nombre, "codigo": plantilla.codigo,
            "version_actual": plantilla.version,
            "umbral_aprobacion": plantilla.umbral_aprobacion,
            "critico_reprueba": plantilla.critico_reprueba,
            "requiere_firma": plantilla.requiere_firma,
            "pide_medidor": plantilla.pide_medidor,
            "genera_ot": plantilla.genera_ot,
        } if plantilla else None,
        "activo": {"id": activo.id, "codigo": activo.codigo, "nombre": activo.nombre,
                   "marca": activo.marca, "linea": activo.linea} if activo else None,
        "secciones": bloques,
        "fotos_generales": fotos_por_respuesta.get(None, []),
        # Si la plantilla cambió después de abrir esta inspección, hay que
        # decirlo: explica por qué las preguntas pueden no coincidir con las de
        # una inspección más reciente.
        "version_desactualizada": bool(plantilla and plantilla.version != e.plantilla_version),
    }


def _conformidad_automatica(item: ChkItem, r: RespuestaIn) -> Optional[bool]:
    """Deduce la conformidad cuando el tipo de pregunta la determina sola.

    Un número fuera del rango declarado es no conforme sin que nadie tenga que
    marcarlo, y un «no» en una pregunta de sí/no también. Dejar eso al criterio
    de quien llena la inspección produce datos incoherentes entre inspectores.
    """
    if r.conforme is not None:
        return r.conforme
    if item.tipo == "NUMERO" and r.valor_numero is not None:
        if item.valor_min is not None and r.valor_numero < item.valor_min:
            return False
        if item.valor_max is not None and r.valor_numero > item.valor_max:
            return False
        if item.valor_min is not None or item.valor_max is not None:
            return True
    if item.tipo in ("SI_NO", "CONFORME_NO") and r.valor_bool is not None:
        return r.valor_bool
    return None


@router.put("/ejecuciones/{eid}/respuestas", response_model=Dict[str, Any])
async def guardar_respuestas(eid: int, data: GuardarRespuestasIn,
                             db: AsyncSession = Depends(get_db)):
    """Guarda o actualiza respuestas. Se puede llamar varias veces.

    Guardar parcial es deliberado: una inspección de cuarenta preguntas en un
    patio con mala señal no se puede perder porque falte una.
    """
    e = await db.get(ChkEjecucion, eid)
    if not e:
        raise HTTPException(404, "Esa inspección no existe")
    if e.estado != "BORRADOR":
        raise HTTPException(409, "Esta inspección ya está cerrada y no admite cambios")

    r = await db.execute(select(ChkItem).where(ChkItem.plantilla_id == e.plantilla_id))
    items = {i.id: i for i in r.scalars().all()}

    r = await db.execute(select(ChkRespuesta).where(ChkRespuesta.ejecucion_id == eid))
    existentes = {x.item_id: x for x in r.scalars().all()}

    guardadas = 0
    for fila in data.respuestas:
        item = items.get(fila.item_id)
        if not item:
            continue
        conforme = None if fila.no_aplica else _conformidad_automatica(item, fila)
        obj = existentes.get(fila.item_id)
        if not obj:
            obj = ChkRespuesta(ejecucion_id=eid, item_id=fila.item_id)
            db.add(obj)
        obj.valor_texto = fila.valor_texto
        obj.valor_numero = fila.valor_numero
        obj.valor_bool = fila.valor_bool
        obj.conforme = conforme
        obj.observacion = fila.observacion
        obj.hallazgo_id = fila.hallazgo_id
        obj.no_aplica = fila.no_aplica
        guardadas += 1

    await db.commit()
    return {"guardadas": guardadas, **await _calificar(db, e, persistir=True)}


async def _calificar(db: AsyncSession, e: ChkEjecucion,
                     persistir: bool = False) -> Dict[str, Any]:
    """Calcula el porcentaje ponderado y el resultado de la inspección."""
    plantilla = await db.get(ChkPlantilla, e.plantilla_id)
    r = await db.execute(select(ChkItem).where(and_(
        ChkItem.plantilla_id == e.plantilla_id, ChkItem.activo.is_(True))))
    items = {i.id: i for i in r.scalars().all()}

    r = await db.execute(select(ChkRespuesta).where(ChkRespuesta.ejecucion_id == e.id))
    respuestas = list(r.scalars().all())

    peso_total = 0.0
    peso_conforme = 0.0
    no_conformes = 0
    criticos = 0
    for resp in respuestas:
        item = items.get(resp.item_id)
        if not item or resp.no_aplica or resp.conforme is None:
            # «No aplica» sale del divisor: castigar a un equipo por no tener un
            # componente que nunca debió tener da números que nadie respeta.
            continue
        peso = item.peso or 1
        peso_total += peso
        if resp.conforme:
            peso_conforme += peso
        else:
            no_conformes += 1
            if item.critico:
                criticos += 1

    pct = round(peso_conforme / peso_total * 100, 1) if peso_total else None

    umbral = plantilla.umbral_aprobacion if plantilla else 100
    critico_reprueba = plantilla.critico_reprueba if plantilla else True
    if pct is None:
        resultado = "PENDIENTE"
    elif criticos and critico_reprueba:
        resultado = "RECHAZADO"
    elif pct >= umbral:
        resultado = "APROBADO" if not no_conformes else "APROBADO_CON_OBSERVACIONES"
    else:
        resultado = "RECHAZADO"

    if persistir:
        e.pct_conforme = pct
        e.no_conformes = no_conformes
        e.criticos_no_conformes = criticos
        e.total_items = len(items)
        e.resultado = resultado
        await db.commit()

    return {"pct_conforme": pct, "no_conformes": no_conformes,
            "criticos_no_conformes": criticos, "resultado": resultado,
            "respondidas": len(respuestas), "total_items": len(items)}


@router.post("/ejecuciones/{eid}/cerrar", response_model=Dict[str, Any])
async def cerrar(eid: int, data: Optional[CerrarIn] = None,
                 db: AsyncSession = Depends(get_db),
                 usuario: Usuario = Depends(get_current_user)):
    """Cierra la inspección, la califica y abre una OT si corresponde."""
    # El cuerpo es opcional: una inspección sin firma ni observaciones se
    # cierra igual, y devolver un 422 por venir vacío escondería la validación
    # real —«falta la firma»— detrás de un error de formato.
    data = data or CerrarIn()

    e = await db.get(ChkEjecucion, eid)
    if not e:
        raise HTTPException(404, "Esa inspección no existe")
    if e.estado != "BORRADOR":
        raise HTTPException(409, "Esta inspección ya estaba cerrada")
    plantilla = await db.get(ChkPlantilla, e.plantilla_id)

    # Los obligatorios sin responder impiden cerrar: media inspección firmada es
    # peor que ninguna, porque parece completa.
    r = await db.execute(select(ChkItem).where(and_(
        ChkItem.plantilla_id == e.plantilla_id, ChkItem.activo.is_(True),
        ChkItem.obligatorio.is_(True))))
    obligatorios = {i.id: i for i in r.scalars().all()}
    r = await db.execute(select(ChkRespuesta).where(ChkRespuesta.ejecucion_id == eid))
    respuestas = {x.item_id: x for x in r.scalars().all()}

    faltantes = []
    for iid, item in obligatorios.items():
        resp = respuestas.get(iid)
        if not resp or (resp.conforme is None and not resp.no_aplica
                        and resp.valor_texto in (None, "")
                        and resp.valor_numero is None and resp.valor_bool is None):
            faltantes.append(item.pregunta)
    if faltantes:
        raise HTTPException(
            400, f"Faltan {len(faltantes)} preguntas obligatorias por responder: "
                 + "; ".join(faltantes[:3]) + ("…" if len(faltantes) > 3 else ""))

    # Lo mismo con las observaciones y las fotos exigidas: si la plantilla las
    # pide, cerrarla sin ellas vacía de contenido el hallazgo.
    sin_observacion = []
    for iid, resp in respuestas.items():
        item = obligatorios.get(iid)
        if item is None:
            r2 = await db.get(ChkItem, iid)
            item = r2
        if not item or resp.conforme is not False:
            continue
        if item.exige_observacion_no_conforme and not (resp.observacion or "").strip():
            sin_observacion.append(item.pregunta)
    if sin_observacion:
        raise HTTPException(
            400, f"Hay {len(sin_observacion)} hallazgos sin explicar. La plantilla exige "
                 f"observación cuando algo queda no conforme: "
                 + "; ".join(sin_observacion[:3]) + ("…" if len(sin_observacion) > 3 else ""))

    if plantilla and plantilla.requiere_firma and not (data.firma_nombre or "").strip():
        raise HTTPException(400, "Esta plantilla exige firma de quien inspecciona")

    if data.odometro is not None:
        e.odometro = data.odometro
    if data.horometro is not None:
        e.horometro = data.horometro
    e.observaciones = data.observaciones
    if data.firma_nombre:
        e.firma_nombre = data.firma_nombre
        e.firma_fecha = datetime.utcnow()
    e.fecha_fin = datetime.utcnow()
    e.estado = "COMPLETADA"

    calificacion = await _calificar(db, e, persistir=True)

    # Orden de trabajo automática. Se crea si la plantilla lo pide y hubo
    # hallazgos, o si algún hallazgo del catálogo lo exige por sí solo.
    ot_creada = None
    hallazgos_ot = []
    for resp in respuestas.values():
        if resp.hallazgo_id and resp.conforme is False:
            h = await db.get(ChkHallazgo, resp.hallazgo_id)
            if h and h.genera_ot:
                hallazgos_ot.append(h)

    debe_crear = (plantilla and plantilla.genera_ot
                  and calificacion["no_conformes"] > 0) or bool(hallazgos_ot)
    if debe_crear and not e.ot_id:
        activo = await db.get(EAMActivo, e.activo_id)
        anio = datetime.utcnow().year
        r = await db.execute(select(func.count()).select_from(EAMOrdenTrabajo)
                             .where(EAMOrdenTrabajo.numero.like(f"OT-{anio}-%")))
        numero_ot = f"OT-{anio}-{(r.scalar() or 0) + 1:04d}"
        detalle_hallazgos = "; ".join(h.nombre for h in hallazgos_ot[:5])
        ot = EAMOrdenTrabajo(
            numero=numero_ot, activo_id=e.activo_id, tipo_ot="CORRECTIVO",
            estado="PENDIENTE",
            prioridad="ALTA" if calificacion["criticos_no_conformes"] else "MEDIA",
            descripcion=(
                f"Generada por la inspección {e.numero} "
                f"({plantilla.nombre if plantilla else ''}). "
                f"{calificacion['no_conformes']} hallazgos, "
                f"{calificacion['criticos_no_conformes']} críticos."
                + (f" {detalle_hallazgos}" if detalle_hallazgos else "")),
            fecha_requerida=datetime.utcnow() + timedelta(
                days=1 if calificacion["criticos_no_conformes"] else 7),
            es_falla=bool(calificacion["criticos_no_conformes"]),
            creado_por=_quien(usuario),
            odometro=e.odometro, horometro=e.horometro)
        db.add(ot); await db.flush()
        e.ot_id = ot.id
        ot_creada = {"id": ot.id, "numero": ot.numero, "prioridad": ot.prioridad}

    # Próxima inspección, si la plantilla tiene periodicidad.
    if plantilla and plantilla.periodicidad_dias:
        r = await db.execute(select(ChkProgramacion).where(and_(
            ChkProgramacion.plantilla_id == plantilla.id,
            ChkProgramacion.activo_id == e.activo_id)))
        prog = r.scalar_one_or_none()
        if not prog:
            prog = ChkProgramacion(plantilla_id=plantilla.id, activo_id=e.activo_id)
            db.add(prog)
        prog.ultima_fecha = e.fecha_fin
        prog.ultima_ejecucion_id = e.id
        prog.proxima_fecha = e.fecha_fin + timedelta(days=plantilla.periodicidad_dias)

    await db.commit()
    return {"numero": e.numero, **calificacion, "ot_creada": ot_creada}


@router.post("/ejecuciones/{eid}/anular", response_model=Dict[str, Any])
async def anular(eid: int, motivo: str = Query(..., min_length=5),
                 db: AsyncSession = Depends(get_db)):
    """Anula una inspección. No se borra: queda el rastro de que existió."""
    e = await db.get(ChkEjecucion, eid)
    if not e:
        raise HTTPException(404, "Esa inspección no existe")
    e.estado = "ANULADA"
    e.observaciones = ((e.observaciones or "") + f"\n[Anulada] {motivo}").strip()
    await db.commit()
    return {"id": e.id, "estado": e.estado}


# ══════════════════════════════════════════════════════════════════════════════
# FOTOS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/ejecuciones/{eid}/fotos", response_model=Dict[str, Any], status_code=201)
async def subir_foto(eid: int, archivo: UploadFile = File(...),
                     respuesta_id: Optional[int] = Form(None),
                     nota: Optional[str] = Form(None),
                     db: AsyncSession = Depends(get_db),
                     usuario: Usuario = Depends(get_current_user)):
    e = await db.get(ChkEjecucion, eid)
    if not e:
        raise HTTPException(404, "Esa inspección no existe")

    extension = os.path.splitext(archivo.filename or "")[1].lower()
    if extension not in EXTENSIONES_FOTO:
        raise HTTPException(
            400, f"Formato no admitido. Se aceptan: {', '.join(sorted(EXTENSIONES_FOTO))}")
    contenido = await archivo.read()
    if len(contenido) > MAX_BYTES:
        raise HTTPException(400, f"La imagen pesa más de {MAX_BYTES // (1024*1024)} MB")

    carpeta = os.path.join(settings.UPLOAD_DIR, _carpeta(), str(eid))
    os.makedirs(carpeta, exist_ok=True)
    marca = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    nombre = f"{marca}_{_nombre_seguro(archivo.filename or 'foto')}"
    ruta = os.path.join(carpeta, nombre)
    with open(ruta, "wb") as f:
        f.write(contenido)

    obj = ChkFoto(ejecucion_id=eid, respuesta_id=respuesta_id, archivo=ruta,
                  nombre=archivo.filename, tipo_mime=archivo.content_type,
                  tamano=len(contenido), nota=nota, subido_por=_quien(usuario))
    db.add(obj); await db.commit(); await db.refresh(obj)
    return {"id": obj.id, "nombre": obj.nombre, "tamano": obj.tamano,
            "url": f"/api/v1/eam/chk/fotos/{obj.id}"}


@router.get("/fotos/{fid}")
async def descargar_foto(fid: int, db: AsyncSession = Depends(get_db)):
    """Sirve la imagen por acá y no desde una carpeta pública: una evidencia de
    inspección puede mostrar instalaciones y placas de la empresa."""
    obj = await db.get(ChkFoto, fid)
    if not obj or not os.path.exists(obj.archivo):
        raise HTTPException(404, "Esa imagen no está disponible")
    return FileResponse(obj.archivo, media_type=obj.tipo_mime or "application/octet-stream",
                        filename=obj.nombre or "evidencia")


@router.delete("/fotos/{fid}", status_code=204)
async def borrar_foto(fid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkFoto, fid)
    if not obj:
        raise HTTPException(404, "Esa imagen no existe")
    try:
        if os.path.exists(obj.archivo):
            os.remove(obj.archivo)
    except OSError:
        # Si el archivo ya no está, igual se quita el registro: dejarlo
        # apuntando a la nada es peor.
        pass
    await db.delete(obj); await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# PENDIENTES Y TABLERO
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/pendientes", response_model=List[Dict[str, Any]])
async def pendientes(db: AsyncSession = Depends(get_db)):
    """Inspecciones vencidas o nunca hechas, según la periodicidad."""
    ahora = datetime.utcnow()
    r = await db.execute(
        select(ChkProgramacion, ChkPlantilla.nombre, ChkPlantilla.codigo, EAMActivo.codigo)
        .join(ChkPlantilla, ChkPlantilla.id == ChkProgramacion.plantilla_id)
        .join(EAMActivo, EAMActivo.id == ChkProgramacion.activo_id)
        .where(and_(ChkProgramacion.activo.is_(True),
                    ChkProgramacion.proxima_fecha.isnot(None),
                    ChkProgramacion.proxima_fecha <= ahora + timedelta(days=7))))
    salida = []
    for prog, nombre, codigo, activo in r.all():
        dias = (prog.proxima_fecha - ahora).days
        salida.append({
            "plantilla_id": prog.plantilla_id, "plantilla": nombre, "codigo": codigo,
            "activo_id": prog.activo_id, "activo": activo,
            "proxima_fecha": prog.proxima_fecha, "ultima_fecha": prog.ultima_fecha,
            "dias": dias,
            "estado": "VENCIDA" if dias < 0 else "PROXIMA",
        })
    return sorted(salida, key=lambda x: x["dias"])


@router.get("/analitica", response_model=Dict[str, Any])
async def analitica(dias: int = Query(90, ge=7, le=1095),
                    db: AsyncSession = Depends(get_db)):
    desde = datetime.utcnow() - timedelta(days=dias)

    r = await db.execute(
        select(ChkEjecucion.resultado, func.count(ChkEjecucion.id))
        .where(and_(ChkEjecucion.fecha_inicio >= desde,
                    ChkEjecucion.estado == "COMPLETADA"))
        .group_by(ChkEjecucion.resultado))
    por_resultado = {k: v for k, v in r.all()}
    total = sum(por_resultado.values())

    r = await db.execute(
        select(func.avg(ChkEjecucion.pct_conforme))
        .where(and_(ChkEjecucion.fecha_inicio >= desde,
                    ChkEjecucion.estado == "COMPLETADA",
                    ChkEjecucion.pct_conforme.isnot(None))))
    promedio = r.scalar()

    # Los ítems que más se reprueban: es donde hay que actuar.
    r = await db.execute(
        select(ChkItem.pregunta, ChkItem.critico, func.count(ChkRespuesta.id))
        .join(ChkRespuesta, ChkRespuesta.item_id == ChkItem.id)
        .join(ChkEjecucion, ChkEjecucion.id == ChkRespuesta.ejecucion_id)
        .where(and_(ChkRespuesta.conforme.is_(False),
                    ChkEjecucion.fecha_inicio >= desde))
        .group_by(ChkItem.pregunta, ChkItem.critico)
        .order_by(func.count(ChkRespuesta.id).desc()).limit(12))
    items_criticos = [{"etiqueta": p, "critico": bool(c), "cantidad": n}
                      for p, c, n in r.all()]

    r = await db.execute(
        select(ChkHallazgo.nombre, ChkHallazgo.severidad, func.count(ChkRespuesta.id))
        .join(ChkRespuesta, ChkRespuesta.hallazgo_id == ChkHallazgo.id)
        .join(ChkEjecucion, ChkEjecucion.id == ChkRespuesta.ejecucion_id)
        .where(ChkEjecucion.fecha_inicio >= desde)
        .group_by(ChkHallazgo.nombre, ChkHallazgo.severidad)
        .order_by(func.count(ChkRespuesta.id).desc()).limit(12))
    hallazgos = [{"etiqueta": n, "severidad": s, "cantidad": c} for n, s, c in r.all()]

    async def _por(campo):
        q = (select(campo, func.count(ChkEjecucion.id),
                    func.sum(case((ChkEjecucion.resultado == "RECHAZADO", 1), else_=0)))
             .join(ChkEjecucion, ChkEjecucion.activo_id == EAMActivo.id)
             .where(and_(ChkEjecucion.fecha_inicio >= desde, campo.isnot(None),
                         ChkEjecucion.estado == "COMPLETADA"))
             .group_by(campo).order_by(func.count(ChkEjecucion.id).desc()).limit(12))
        return [{"etiqueta": n, "cantidad": c, "rechazadas": int(k or 0)}
                for n, c, k in (await db.execute(q)).all()]

    return {
        "total": total,
        "por_resultado": por_resultado,
        "promedio_conformidad": round(float(promedio), 1) if promedio is not None else None,
        "rechazadas": por_resultado.get("RECHAZADO", 0),
        "items_mas_reprobados": items_criticos,
        "hallazgos": hallazgos,
        "por_marca": await _por(EAMActivo.marca),
        "por_linea": await _por(EAMActivo.linea),
    }
