"""GRC — Governance, Risk & Compliance API endpoints"""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.infrastructure.models.grc import (
    GRCComite, GRCPolitica, GRCObligacion, GRCControl, GRCRiesgo,
    GRCRiesgoControl, GRCTratamiento, GRCMatrizCumplimiento, GRCEvidencia,
    GRCAuditoria, GRCHallazgo, GRCPlanAccion, GRCIncidente,
    GRCContinuidad, GRCSimulacro, GRCTercero, GRCEvaluacionTercero, GRCKPIDiario,
    EstadoRiesgoGRCEnum, PrioridadRiesgoGRCEnum, EfectividadControlGRCEnum,
    EstadoPoliticaGRCEnum, EstadoCumplimientoGRCEnum, EstadoHallazgoGRCEnum,
)
from app.application.schemas.grc import (
    GRCComiteCreate, GRCComiteResponse,
    GRCPoliticaCreate, GRCPoliticaResponse,
    GRCObligacionCreate, GRCObligacionResponse,
    GRCControlCreate, GRCControlUpdate, GRCControlResponse,
    GRCRiesgoCreate, GRCRiesgoUpdate, GRCRiesgoResponse,
    GRCTratamientoCreate, GRCTratamientoResponse,
    GRCMatrizCumplimientoCreate, GRCMatrizCumplimientoUpdate, GRCMatrizCumplimientoResponse,
    GRCEvidenciaCreate, GRCEvidenciaResponse,
    GRCAuditoriaCreate, GRCAuditoriaUpdate, GRCAuditoriaResponse,
    GRCHallazgoCreate, GRCHallazgoUpdate, GRCHallazgoResponse,
    GRCPlanAccionCreate, GRCPlanAccionUpdate, GRCPlanAccionResponse,
    GRCIncidenteCreate, GRCIncidenteUpdate, GRCIncidenteResponse,
    GRCContinuidadCreate, GRCContinuidadResponse,
    GRCSimulacroCreate, GRCSimulacroResponse,
    GRCTerceroCreate, GRCTerceroResponse,
    GRCEvaluacionTerceroCreate, GRCEvaluacionTerceroResponse,
    GRCDashboardKPIs,
)

router = APIRouter(prefix="/grc", tags=["GRC"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _calc_nivel(prob: Optional[int], imp: Optional[int]) -> Optional[int]:
    if prob and imp:
        return prob * imp
    return None

def _calc_prioridad(nivel: Optional[int]) -> Optional[PrioridadRiesgoGRCEnum]:
    if nivel is None:
        return None
    if nivel >= 15:
        return PrioridadRiesgoGRCEnum.CRITICA
    if nivel >= 10:
        return PrioridadRiesgoGRCEnum.ALTA
    if nivel >= 5:
        return PrioridadRiesgoGRCEnum.MEDIA
    return PrioridadRiesgoGRCEnum.BAJA

async def _next_code(db: AsyncSession, prefix: str, model) -> str:
    year = date.today().year
    result = await db.execute(
        select(func.count()).select_from(model).where(
            model.codigo.like(f"{prefix}-{year}-%")
        )
    )
    count = result.scalar() or 0
    return f"{prefix}-{year}-{count + 1:03d}"

def _clasif_tercero(puntaje: float) -> str:
    if puntaje >= 90:
        return "excelente"
    if puntaje >= 75:
        return "bueno"
    if puntaje >= 60:
        return "regular"
    return "deficiente"


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis", response_model=GRCDashboardKPIs)
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    riesgos_abiertos = (await db.execute(
        select(func.count()).select_from(GRCRiesgo).where(
            GRCRiesgo.estado.in_([EstadoRiesgoGRCEnum.IDENTIFICADO, EstadoRiesgoGRCEnum.EN_ANALISIS, EstadoRiesgoGRCEnum.TRATAMIENTO]),
            GRCRiesgo.deleted_at.is_(None),
        )
    )).scalar() or 0
    riesgos_criticos = (await db.execute(
        select(func.count()).select_from(GRCRiesgo).where(
            GRCRiesgo.prioridad == PrioridadRiesgoGRCEnum.CRITICA,
            GRCRiesgo.deleted_at.is_(None),
        )
    )).scalar() or 0
    riesgos_mitigados = (await db.execute(
        select(func.count()).select_from(GRCRiesgo).where(
            GRCRiesgo.estado == EstadoRiesgoGRCEnum.MITIGADO,
            GRCRiesgo.deleted_at.is_(None),
        )
    )).scalar() or 0
    controles_total = (await db.execute(
        select(func.count()).select_from(GRCControl).where(GRCControl.deleted_at.is_(None))
    )).scalar() or 0
    controles_efectivos = (await db.execute(
        select(func.count()).select_from(GRCControl).where(
            GRCControl.efectividad == EfectividadControlGRCEnum.EFECTIVO,
            GRCControl.deleted_at.is_(None),
        )
    )).scalar() or 0
    controles_pct = round(controles_efectivos / controles_total * 100, 1) if controles_total else 0.0
    obligaciones_vencidas = (await db.execute(
        select(func.count()).select_from(GRCObligacion).where(
            GRCObligacion.fecha_vencimiento <= date.today(),
            GRCObligacion.deleted_at.is_(None),
        )
    )).scalar() or 0
    hallazgos_abiertos = (await db.execute(
        select(func.count()).select_from(GRCHallazgo).where(
            GRCHallazgo.estado == EstadoHallazgoGRCEnum.ABIERTO,
            GRCHallazgo.deleted_at.is_(None),
        )
    )).scalar() or 0
    hallazgos_cerrados = (await db.execute(
        select(func.count()).select_from(GRCHallazgo).where(
            GRCHallazgo.estado == EstadoHallazgoGRCEnum.CERRADO,
            GRCHallazgo.deleted_at.is_(None),
        )
    )).scalar() or 0
    politicas_vigentes = (await db.execute(
        select(func.count()).select_from(GRCPolitica).where(
            GRCPolitica.estado == EstadoPoliticaGRCEnum.PUBLICADA,
            GRCPolitica.deleted_at.is_(None),
        )
    )).scalar() or 0
    politicas_vencidas = (await db.execute(
        select(func.count()).select_from(GRCPolitica).where(
            GRCPolitica.estado == EstadoPoliticaGRCEnum.VENCIDA,
            GRCPolitica.deleted_at.is_(None),
        )
    )).scalar() or 0
    incidentes_abiertos = (await db.execute(
        select(func.count()).select_from(GRCIncidente).where(
            GRCIncidente.estado == "abierto",
            GRCIncidente.deleted_at.is_(None),
        )
    )).scalar() or 0
    cumplimientos = await db.execute(
        select(GRCMatrizCumplimiento.puntaje).where(
            GRCMatrizCumplimiento.puntaje.isnot(None),
            GRCMatrizCumplimiento.deleted_at.is_(None),
        )
    )
    puntajes = [r[0] for r in cumplimientos.all()]
    cumplimiento_pct = round(sum(puntajes) / len(puntajes), 1) if puntajes else 0.0
    simulacros = (await db.execute(
        select(func.count()).select_from(GRCSimulacro).where(GRCSimulacro.deleted_at.is_(None))
    )).scalar() or 0
    procesos_criticos = (await db.execute(
        select(func.count()).select_from(GRCContinuidad).where(
            GRCContinuidad.criticidad.in_(["critica", "alta"]),
            GRCContinuidad.deleted_at.is_(None),
        )
    )).scalar() or 0
    return GRCDashboardKPIs(
        riesgos_abiertos=riesgos_abiertos,
        riesgos_criticos=riesgos_criticos,
        riesgos_mitigados=riesgos_mitigados,
        controles_efectivos_pct=controles_pct,
        controles_total=controles_total,
        cumplimiento_general_pct=cumplimiento_pct,
        obligaciones_vencidas=obligaciones_vencidas,
        hallazgos_abiertos=hallazgos_abiertos,
        hallazgos_cerrados=hallazgos_cerrados,
        auditorias_en_curso=0,
        incidentes_abiertos=incidentes_abiertos,
        politicas_vigentes=politicas_vigentes,
        politicas_vencidas=politicas_vencidas,
        terceros_criticos=0,
        procesos_criticos_cubiertos=procesos_criticos,
        simulacros_realizados=simulacros,
    )


# ── Comités ──────────────────────────────────────────────────────────────────

@router.get("/comites", response_model=List[GRCComiteResponse])
async def list_comites(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCComite).where(GRCComite.deleted_at.is_(None)))
    return r.scalars().all()

@router.post("/comites", response_model=GRCComiteResponse, status_code=status.HTTP_201_CREATED)
async def create_comite(data: GRCComiteCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCComite(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Políticas ─────────────────────────────────────────────────────────────────

@router.get("/politicas", response_model=List[GRCPoliticaResponse])
async def list_politicas(estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCPolitica).where(GRCPolitica.deleted_at.is_(None))
    if estado:
        q = q.where(GRCPolitica.estado == estado)
    r = await db.execute(q.order_by(GRCPolitica.nombre))
    return r.scalars().all()

@router.post("/politicas", response_model=GRCPoliticaResponse, status_code=status.HTTP_201_CREATED)
async def create_politica(data: GRCPoliticaCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCPolitica(**data.model_dump())
    obj.codigo = await _next_code(db, "POL", GRCPolitica)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/politicas/{id}", response_model=GRCPoliticaResponse)
async def update_politica(id: int, data: GRCPoliticaCreate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCPolitica).where(GRCPolitica.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Política no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Obligaciones ──────────────────────────────────────────────────────────────

@router.get("/obligaciones", response_model=List[GRCObligacionResponse])
async def list_obligaciones(tipo: Optional[str] = None, pais: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCObligacion).where(GRCObligacion.deleted_at.is_(None))
    if tipo:
        q = q.where(GRCObligacion.tipo == tipo)
    if pais:
        q = q.where(GRCObligacion.pais == pais)
    r = await db.execute(q.order_by(GRCObligacion.nombre))
    return r.scalars().all()

@router.post("/obligaciones", response_model=GRCObligacionResponse, status_code=status.HTTP_201_CREATED)
async def create_obligacion(data: GRCObligacionCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCObligacion(**data.model_dump())
    obj.codigo = await _next_code(db, "OBL", GRCObligacion)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Controles ─────────────────────────────────────────────────────────────────

@router.get("/controles", response_model=List[GRCControlResponse])
async def list_controles(tipo: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCControl).where(GRCControl.deleted_at.is_(None))
    if tipo:
        q = q.where(GRCControl.tipo == tipo)
    r = await db.execute(q.order_by(GRCControl.nombre))
    return r.scalars().all()

@router.post("/controles", response_model=GRCControlResponse, status_code=status.HTTP_201_CREATED)
async def create_control(data: GRCControlCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCControl(**data.model_dump())
    obj.codigo = await _next_code(db, "CTL", GRCControl)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/controles/{id}", response_model=GRCControlResponse)
async def update_control(id: int, data: GRCControlUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCControl).where(GRCControl.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Control no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Riesgos ──────────────────────────────────────────────────────────────────

@router.get("/riesgos", response_model=List[GRCRiesgoResponse])
async def list_riesgos(tipo: Optional[str] = None, estado: Optional[str] = None, prioridad: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCRiesgo).where(GRCRiesgo.deleted_at.is_(None))
    if tipo:
        q = q.where(GRCRiesgo.tipo == tipo)
    if estado:
        q = q.where(GRCRiesgo.estado == estado)
    if prioridad:
        q = q.where(GRCRiesgo.prioridad == prioridad)
    r = await db.execute(q.order_by(GRCRiesgo.nivel_inherente.desc().nullslast()))
    return r.scalars().all()

@router.post("/riesgos", response_model=GRCRiesgoResponse, status_code=status.HTTP_201_CREATED)
async def create_riesgo(data: GRCRiesgoCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump()
    prob_i = payload.get("probabilidad_inherente")
    imp_i  = payload.get("impacto_inherente")
    prob_r = payload.get("probabilidad_residual")
    imp_r  = payload.get("impacto_residual")
    nivel_i = _calc_nivel(prob_i, imp_i)
    nivel_r = _calc_nivel(prob_r, imp_r)
    obj = GRCRiesgo(**payload)
    obj.codigo         = await _next_code(db, "RSK", GRCRiesgo)
    obj.nivel_inherente = nivel_i
    obj.nivel_residual  = nivel_r
    obj.prioridad       = _calc_prioridad(nivel_r or nivel_i)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/riesgos/{id}", response_model=GRCRiesgoResponse)
async def update_riesgo(id: int, data: GRCRiesgoUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCRiesgo).where(GRCRiesgo.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    payload = data.model_dump(exclude_none=True)
    for k, v in payload.items():
        setattr(obj, k, v)
    obj.nivel_inherente = _calc_nivel(obj.probabilidad_inherente, obj.impacto_inherente)
    obj.nivel_residual  = _calc_nivel(obj.probabilidad_residual, obj.impacto_residual)
    obj.prioridad       = _calc_prioridad(obj.nivel_residual or obj.nivel_inherente)
    await db.commit(); await db.refresh(obj)
    return obj

@router.get("/riesgos/heat-map")
async def get_heat_map(db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(GRCRiesgo.probabilidad_inherente, GRCRiesgo.impacto_inherente, GRCRiesgo.codigo, GRCRiesgo.prioridad).where(
            GRCRiesgo.deleted_at.is_(None),
            GRCRiesgo.probabilidad_inherente.isnot(None),
        )
    )
    cells: dict = {}
    for prob, imp, codigo, prioridad in r.all():
        key = f"{prob}_{imp}"
        if key not in cells:
            cells[key] = {"prob": prob, "imp": imp, "riesgos": []}
        cells[key]["riesgos"].append({"codigo": codigo, "prioridad": prioridad})
    return list(cells.values())


# ── Tratamientos ──────────────────────────────────────────────────────────────

@router.get("/riesgos/{riesgo_id}/tratamientos", response_model=List[GRCTratamientoResponse])
async def list_tratamientos(riesgo_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCTratamiento).where(GRCTratamiento.riesgo_id == riesgo_id, GRCTratamiento.deleted_at.is_(None)))
    return r.scalars().all()

@router.post("/tratamientos", response_model=GRCTratamientoResponse, status_code=status.HTTP_201_CREATED)
async def create_tratamiento(data: GRCTratamientoCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCTratamiento(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Matriz de Cumplimiento ────────────────────────────────────────────────────

@router.get("/cumplimiento", response_model=List[GRCMatrizCumplimientoResponse])
async def list_cumplimiento(estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCMatrizCumplimiento).where(GRCMatrizCumplimiento.deleted_at.is_(None))
    if estado:
        q = q.where(GRCMatrizCumplimiento.estado == estado)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/cumplimiento", response_model=GRCMatrizCumplimientoResponse, status_code=status.HTTP_201_CREATED)
async def create_cumplimiento(data: GRCMatrizCumplimientoCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCMatrizCumplimiento(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/cumplimiento/{id}", response_model=GRCMatrizCumplimientoResponse)
async def update_cumplimiento(id: int, data: GRCMatrizCumplimientoUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCMatrizCumplimiento).where(GRCMatrizCumplimiento.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Evidencias ────────────────────────────────────────────────────────────────

@router.get("/evidencias", response_model=List[GRCEvidenciaResponse])
async def list_evidencias(referencia_tipo: Optional[str] = None, referencia_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCEvidencia).where(GRCEvidencia.deleted_at.is_(None))
    if referencia_tipo:
        q = q.where(GRCEvidencia.referencia_tipo == referencia_tipo)
    if referencia_id:
        q = q.where(GRCEvidencia.referencia_id == referencia_id)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/evidencias", response_model=GRCEvidenciaResponse, status_code=status.HTTP_201_CREATED)
async def create_evidencia(data: GRCEvidenciaCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCEvidencia(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Auditorías ────────────────────────────────────────────────────────────────

@router.get("/auditorias", response_model=List[GRCAuditoriaResponse])
async def list_auditorias(tipo: Optional[str] = None, estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCAuditoria).where(GRCAuditoria.deleted_at.is_(None))
    if tipo:
        q = q.where(GRCAuditoria.tipo == tipo)
    if estado:
        q = q.where(GRCAuditoria.estado == estado)
    r = await db.execute(q.order_by(GRCAuditoria.fecha_inicio.desc().nullslast()))
    return r.scalars().all()

@router.post("/auditorias", response_model=GRCAuditoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_auditoria(data: GRCAuditoriaCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCAuditoria(**data.model_dump())
    obj.codigo = await _next_code(db, "AUD", GRCAuditoria)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/auditorias/{id}", response_model=GRCAuditoriaResponse)
async def update_auditoria(id: int, data: GRCAuditoriaUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCAuditoria).where(GRCAuditoria.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Hallazgos ─────────────────────────────────────────────────────────────────

@router.get("/hallazgos", response_model=List[GRCHallazgoResponse])
async def list_hallazgos(estado: Optional[str] = None, severidad: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCHallazgo).where(GRCHallazgo.deleted_at.is_(None))
    if estado:
        q = q.where(GRCHallazgo.estado == estado)
    if severidad:
        q = q.where(GRCHallazgo.severidad == severidad)
    r = await db.execute(q.order_by(GRCHallazgo.fecha_limite))
    return r.scalars().all()

@router.post("/hallazgos", response_model=GRCHallazgoResponse, status_code=status.HTTP_201_CREATED)
async def create_hallazgo(data: GRCHallazgoCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCHallazgo(**data.model_dump())
    obj.codigo = await _next_code(db, "HAL", GRCHallazgo)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/hallazgos/{id}", response_model=GRCHallazgoResponse)
async def update_hallazgo(id: int, data: GRCHallazgoUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCHallazgo).where(GRCHallazgo.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Planes de Acción ──────────────────────────────────────────────────────────

@router.get("/hallazgos/{hallazgo_id}/planes", response_model=List[GRCPlanAccionResponse])
async def list_planes(hallazgo_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCPlanAccion).where(GRCPlanAccion.hallazgo_id == hallazgo_id, GRCPlanAccion.deleted_at.is_(None)))
    return r.scalars().all()

@router.post("/planes", response_model=GRCPlanAccionResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(data: GRCPlanAccionCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCPlanAccion(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/planes/{id}", response_model=GRCPlanAccionResponse)
async def update_plan(id: int, data: GRCPlanAccionUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCPlanAccion).where(GRCPlanAccion.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Incidentes ────────────────────────────────────────────────────────────────

@router.get("/incidentes", response_model=List[GRCIncidenteResponse])
async def list_incidentes(tipo: Optional[str] = None, estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCIncidente).where(GRCIncidente.deleted_at.is_(None))
    if tipo:
        q = q.where(GRCIncidente.tipo == tipo)
    if estado:
        q = q.where(GRCIncidente.estado == estado)
    r = await db.execute(q.order_by(GRCIncidente.fecha_ocurrencia.desc().nullslast()))
    return r.scalars().all()

@router.post("/incidentes", response_model=GRCIncidenteResponse, status_code=status.HTTP_201_CREATED)
async def create_incidente(data: GRCIncidenteCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCIncidente(**data.model_dump())
    obj.codigo = await _next_code(db, "INC", GRCIncidente)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.patch("/incidentes/{id}", response_model=GRCIncidenteResponse)
async def update_incidente(id: int, data: GRCIncidenteUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCIncidente).where(GRCIncidente.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ── Continuidad ───────────────────────────────────────────────────────────────

@router.get("/continuidad", response_model=List[GRCContinuidadResponse])
async def list_continuidad(criticidad: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCContinuidad).where(GRCContinuidad.deleted_at.is_(None))
    if criticidad:
        q = q.where(GRCContinuidad.criticidad == criticidad)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/continuidad", response_model=GRCContinuidadResponse, status_code=status.HTTP_201_CREATED)
async def create_continuidad(data: GRCContinuidadCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCContinuidad(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Simulacros ────────────────────────────────────────────────────────────────

@router.get("/simulacros", response_model=List[GRCSimulacroResponse])
async def list_simulacros(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCSimulacro).where(GRCSimulacro.deleted_at.is_(None)).order_by(GRCSimulacro.fecha.desc().nullslast()))
    return r.scalars().all()

@router.post("/simulacros", response_model=GRCSimulacroResponse, status_code=status.HTTP_201_CREATED)
async def create_simulacro(data: GRCSimulacroCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCSimulacro(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Terceros ──────────────────────────────────────────────────────────────────

@router.get("/terceros", response_model=List[GRCTerceroResponse])
async def list_terceros(tipo: Optional[str] = None, nivel_riesgo: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(GRCTercero).where(GRCTercero.deleted_at.is_(None))
    if tipo:
        q = q.where(GRCTercero.tipo == tipo)
    if nivel_riesgo:
        q = q.where(GRCTercero.nivel_riesgo == nivel_riesgo)
    r = await db.execute(q.order_by(GRCTercero.nombre))
    return r.scalars().all()

@router.post("/terceros", response_model=GRCTerceroResponse, status_code=status.HTTP_201_CREATED)
async def create_tercero(data: GRCTerceroCreate, db: AsyncSession = Depends(get_db)):
    obj = GRCTercero(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/terceros/{tercero_id}/evaluaciones", response_model=List[GRCEvaluacionTerceroResponse])
async def list_evaluaciones_tercero(tercero_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(GRCEvaluacionTercero).where(GRCEvaluacionTercero.tercero_id == tercero_id, GRCEvaluacionTercero.deleted_at.is_(None)))
    return r.scalars().all()

@router.post("/terceros/evaluaciones", response_model=GRCEvaluacionTerceroResponse, status_code=status.HTTP_201_CREATED)
async def create_evaluacion_tercero(data: GRCEvaluacionTerceroCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump()
    scores  = [payload.get(k) for k in ["cumplimiento_legal", "riesgo_reputacional", "solidez_financiera", "seguridad_info"] if payload.get(k) is not None]
    puntaje = round(sum(scores) / len(scores), 2) if scores else None
    obj = GRCEvaluacionTercero(**payload)
    obj.puntaje_total = puntaje
    obj.clasificacion = _clasif_tercero(puntaje) if puntaje else None
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj
