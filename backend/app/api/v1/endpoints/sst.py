from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.sst import (
    SstIncidente, SstRiesgo, SstInspeccion, SstEntregaEPP, SstCapacitacion, SstDocumento,
    TipoIncidenteSST, GravedadSST, EstadoIncidenteSST, ClasePeligroSST, NivelRiesgoSST,
    EstadoInspeccionSST, TipoEPP, EstadoCapacitacionSST, TipoDocumentoSST,
)

router = APIRouter(prefix="/sst", tags=["SST"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _gen_numero(db: AsyncSession, model, prefix: str) -> str:
    year = date.today().year
    res = await db.execute(select(func.count(model.id)))
    seq = (res.scalar_one() or 0) + 1
    return f"{prefix}-{year}-{seq:05d}"

def _inc_dict(r: SstIncidente) -> dict:
    return {
        "id": r.id, "numero": r.numero,
        "tipo": r.tipo.value if r.tipo else None,
        "gravedad": r.gravedad.value if r.gravedad else None,
        "estado": r.estado.value if r.estado else None,
        "fecha_evento": r.fecha_evento.isoformat() if r.fecha_evento else None,
        "hora_evento": r.hora_evento, "lugar": r.lugar,
        "trabajador": r.trabajador, "cargo": r.cargo, "area": r.area,
        "descripcion": r.descripcion, "causa_inmediata": r.causa_inmediata,
        "causa_basica": r.causa_basica, "dias_incapacidad": r.dias_incapacidad,
        "acciones_correctivas": r.acciones_correctivas, "investigador": r.investigador,
        "fecha_cierre": r.fecha_cierre.isoformat() if r.fecha_cierre else None,
    }

def _riesgo_dict(r: SstRiesgo) -> dict:
    return {
        "id": r.id, "codigo": r.codigo, "proceso": r.proceso, "area": r.area,
        "actividad": r.actividad,
        "clase_peligro": r.clase_peligro.value if r.clase_peligro else None,
        "descripcion_peligro": r.descripcion_peligro, "efecto_posible": r.efecto_posible,
        "nivel_riesgo": r.nivel_riesgo.value if r.nivel_riesgo else None,
        "probabilidad": r.probabilidad, "impacto": r.impacto,
        "controles_existentes": r.controles_existentes,
        "controles_propuestos": r.controles_propuestos,
        "responsable": r.responsable,
        "fecha_revision": r.fecha_revision.isoformat() if r.fecha_revision else None,
    }

def _insp_dict(r: SstInspeccion) -> dict:
    return {
        "id": r.id, "numero": r.numero, "tipo": r.tipo, "area": r.area,
        "estado": r.estado.value if r.estado else None,
        "fecha_programada": r.fecha_programada.isoformat() if r.fecha_programada else None,
        "fecha_realizacion": r.fecha_realizacion.isoformat() if r.fecha_realizacion else None,
        "inspector": r.inspector, "descripcion": r.descripcion,
        "hallazgos_count": r.hallazgos_count, "puntuacion": r.puntuacion,
        "observaciones": r.observaciones,
    }

def _epp_dict(r: SstEntregaEPP) -> dict:
    return {
        "id": r.id, "numero": r.numero, "trabajador": r.trabajador,
        "cargo": r.cargo, "area": r.area,
        "tipo_epp": r.tipo_epp.value if r.tipo_epp else None,
        "descripcion_epp": r.descripcion_epp, "cantidad": r.cantidad,
        "fecha_entrega": r.fecha_entrega.isoformat() if r.fecha_entrega else None,
        "fecha_vencimiento": r.fecha_vencimiento.isoformat() if r.fecha_vencimiento else None,
        "firma_recibido": r.firma_recibido, "devuelto": r.devuelto,
        "fecha_devolucion": r.fecha_devolucion.isoformat() if r.fecha_devolucion else None,
        "motivo_devolucion": r.motivo_devolucion,
    }

def _cap_dict(r: SstCapacitacion) -> dict:
    return {
        "id": r.id, "codigo": r.codigo, "titulo": r.titulo,
        "tipo": r.tipo, "modalidad": r.modalidad,
        "estado": r.estado.value if r.estado else None,
        "instructor": r.instructor,
        "fecha_inicio": r.fecha_inicio.isoformat() if r.fecha_inicio else None,
        "fecha_fin": r.fecha_fin.isoformat() if r.fecha_fin else None,
        "duracion_horas": r.duracion_horas, "max_participantes": r.max_participantes,
        "participantes": r.participantes, "area_dirigida": r.area_dirigida,
        "descripcion": r.descripcion, "evaluacion_prom": r.evaluacion_prom,
    }

def _doc_dict(r: SstDocumento) -> dict:
    return {
        "id": r.id, "codigo": r.codigo, "titulo": r.titulo,
        "tipo": r.tipo.value if r.tipo else None,
        "version": r.version, "estado": r.estado,
        "area_responsable": r.area_responsable, "responsable": r.responsable,
        "fecha_aprobacion": r.fecha_aprobacion.isoformat() if r.fecha_aprobacion else None,
        "fecha_revision": r.fecha_revision.isoformat() if r.fecha_revision else None,
        "descripcion": r.descripcion,
    }


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_sst_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    year = date.today().year

    incidentes_anio = (await db.execute(select(func.count(SstIncidente.id)))).scalar_one()
    accidentes_at = (await db.execute(
        select(func.count(SstIncidente.id)).where(
            SstIncidente.tipo == TipoIncidenteSST.ACCIDENTE_TRABAJO,
            func.extract('year', SstIncidente.fecha_evento) == year,
        )
    )).scalar_one()
    inspecciones_pendientes = (await db.execute(
        select(func.count(SstInspeccion.id)).where(SstInspeccion.estado == EstadoInspeccionSST.PROGRAMADA)
    )).scalar_one()
    riesgos_criticos = (await db.execute(
        select(func.count(SstRiesgo.id)).where(
            SstRiesgo.nivel_riesgo.in_([NivelRiesgoSST.ALTO, NivelRiesgoSST.INACEPTABLE])
        )
    )).scalar_one()

    last_at = (await db.execute(
        select(SstIncidente.fecha_evento)
        .where(SstIncidente.tipo == TipoIncidenteSST.ACCIDENTE_TRABAJO)
        .order_by(SstIncidente.fecha_evento.desc())
        .limit(1)
    )).scalar_one_or_none()
    dias_sin_accidente = (date.today() - last_at).days if last_at else 0

    return {
        "dias_sin_accidente": dias_sin_accidente,
        "incidentes_anio": incidentes_anio,
        "accidentes_trabajo": accidentes_at,
        "inspecciones_pendientes": inspecciones_pendientes,
        "riesgos_criticos": riesgos_criticos,
    }


# ─── Incidentes ───────────────────────────────────────────────────────────────

class IncidenteCreate(BaseModel):
    tipo: TipoIncidenteSST
    gravedad: Optional[GravedadSST] = None
    fecha_evento: date
    hora_evento: Optional[str] = None
    lugar: Optional[str] = None
    trabajador: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    descripcion: Optional[str] = None
    investigador: Optional[str] = None

@router.get("/incidentes")
async def list_incidentes(
    skip: int = Query(0), limit: int = Query(50),
    estado: Optional[EstadoIncidenteSST] = None,
    tipo: Optional[TipoIncidenteSST] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(SstIncidente)
    if estado: q = q.where(SstIncidente.estado == estado)
    if tipo:   q = q.where(SstIncidente.tipo == tipo)
    q = q.order_by(SstIncidente.fecha_evento.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_inc_dict(r) for r in result.scalars().all()]

@router.post("/incidentes")
async def create_incidente(
    data: IncidenteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    numero = await _gen_numero(db, SstIncidente, "SST-INC")
    obj = SstIncidente(numero=numero, **data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _inc_dict(obj)

@router.patch("/incidentes/{id}/estado")
async def cambiar_estado_incidente(
    id: int, estado: EstadoIncidenteSST,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    obj = (await db.execute(select(SstIncidente).where(SstIncidente.id == id))).scalar_one_or_none()
    if not obj: raise HTTPException(404, "Incidente no encontrado")
    obj.estado = estado
    if estado == EstadoIncidenteSST.CERRADO:
        obj.fecha_cierre = date.today()
    await db.commit()
    return _inc_dict(obj)


# ─── Riesgos (IPER) ───────────────────────────────────────────────────────────

class RiesgoCreate(BaseModel):
    proceso: Optional[str] = None
    area: Optional[str] = None
    actividad: Optional[str] = None
    clase_peligro: Optional[ClasePeligroSST] = None
    descripcion_peligro: Optional[str] = None
    efecto_posible: Optional[str] = None
    nivel_riesgo: Optional[NivelRiesgoSST] = None
    probabilidad: Optional[int] = None
    impacto: Optional[int] = None
    controles_existentes: Optional[str] = None
    controles_propuestos: Optional[str] = None
    responsable: Optional[str] = None
    fecha_revision: Optional[date] = None

@router.get("/riesgos")
async def list_riesgos(
    skip: int = Query(0), limit: int = Query(100),
    nivel: Optional[NivelRiesgoSST] = None,
    clase: Optional[ClasePeligroSST] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(SstRiesgo)
    if nivel: q = q.where(SstRiesgo.nivel_riesgo == nivel)
    if clase: q = q.where(SstRiesgo.clase_peligro == clase)
    q = q.order_by(SstRiesgo.id.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_riesgo_dict(r) for r in result.scalars().all()]

@router.post("/riesgos")
async def create_riesgo(
    data: RiesgoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    codigo = await _gen_numero(db, SstRiesgo, "IPER")
    obj = SstRiesgo(codigo=codigo, **data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _riesgo_dict(obj)


# ─── Inspecciones ─────────────────────────────────────────────────────────────

class InspeccionCreate(BaseModel):
    tipo: str = "PLANEADA"
    area: Optional[str] = None
    fecha_programada: Optional[date] = None
    inspector: Optional[str] = None
    descripcion: Optional[str] = None

@router.get("/inspecciones")
async def list_inspecciones(
    skip: int = Query(0), limit: int = Query(50),
    estado: Optional[EstadoInspeccionSST] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(SstInspeccion)
    if estado: q = q.where(SstInspeccion.estado == estado)
    q = q.order_by(SstInspeccion.fecha_programada.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_insp_dict(r) for r in result.scalars().all()]

@router.post("/inspecciones")
async def create_inspeccion(
    data: InspeccionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    numero = await _gen_numero(db, SstInspeccion, "SST-INSP")
    obj = SstInspeccion(numero=numero, **data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _insp_dict(obj)

@router.patch("/inspecciones/{id}/estado")
async def cambiar_estado_inspeccion(
    id: int, estado: EstadoInspeccionSST,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    obj = (await db.execute(select(SstInspeccion).where(SstInspeccion.id == id))).scalar_one_or_none()
    if not obj: raise HTTPException(404, "Inspección no encontrada")
    obj.estado = estado
    if estado == EstadoInspeccionSST.COMPLETADA:
        obj.fecha_realizacion = date.today()
    await db.commit()
    return _insp_dict(obj)


# ─── EPP ──────────────────────────────────────────────────────────────────────

class EPPCreate(BaseModel):
    trabajador: str
    cargo: Optional[str] = None
    area: Optional[str] = None
    tipo_epp: TipoEPP
    descripcion_epp: Optional[str] = None
    cantidad: int = 1
    fecha_entrega: date
    fecha_vencimiento: Optional[date] = None

@router.get("/epp")
async def list_epp(
    skip: int = Query(0), limit: int = Query(50),
    trabajador: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(SstEntregaEPP)
    if trabajador: q = q.where(SstEntregaEPP.trabajador.ilike(f"%{trabajador}%"))
    q = q.order_by(SstEntregaEPP.fecha_entrega.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_epp_dict(r) for r in result.scalars().all()]

@router.post("/epp")
async def create_epp(
    data: EPPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    numero = await _gen_numero(db, SstEntregaEPP, "EPP")
    obj = SstEntregaEPP(numero=numero, **data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _epp_dict(obj)


# ─── Capacitaciones ───────────────────────────────────────────────────────────

class CapacitacionCreate(BaseModel):
    titulo: str
    tipo: Optional[str] = None
    modalidad: Optional[str] = None
    instructor: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    duracion_horas: Optional[float] = None
    max_participantes: Optional[int] = None
    area_dirigida: Optional[str] = None
    descripcion: Optional[str] = None

@router.get("/capacitaciones")
async def list_capacitaciones(
    skip: int = Query(0), limit: int = Query(50),
    estado: Optional[EstadoCapacitacionSST] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(SstCapacitacion)
    if estado: q = q.where(SstCapacitacion.estado == estado)
    q = q.order_by(SstCapacitacion.fecha_inicio.asc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_cap_dict(r) for r in result.scalars().all()]

@router.post("/capacitaciones")
async def create_capacitacion(
    data: CapacitacionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    codigo = await _gen_numero(db, SstCapacitacion, "CAP-SST")
    obj = SstCapacitacion(codigo=codigo, **data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _cap_dict(obj)


# ─── Documentos ───────────────────────────────────────────────────────────────

class DocumentoCreate(BaseModel):
    titulo: str
    tipo: TipoDocumentoSST
    version: str = "1.0"
    area_responsable: Optional[str] = None
    responsable: Optional[str] = None
    fecha_aprobacion: Optional[date] = None
    fecha_revision: Optional[date] = None
    descripcion: Optional[str] = None

@router.get("/documentos")
async def list_documentos(
    skip: int = Query(0), limit: int = Query(50),
    tipo: Optional[TipoDocumentoSST] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(SstDocumento)
    if tipo: q = q.where(SstDocumento.tipo == tipo)
    q = q.order_by(SstDocumento.id.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_doc_dict(r) for r in result.scalars().all()]

@router.post("/documentos")
async def create_documento(
    data: DocumentoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    codigo = await _gen_numero(db, SstDocumento, "DOC-SST")
    obj = SstDocumento(codigo=codigo, **data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _doc_dict(obj)
