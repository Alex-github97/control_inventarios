"""Pydantic v2 schemas — GRC Module"""
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.infrastructure.models.grc import (
    TipoRiesgoGRCEnum, PrioridadRiesgoGRCEnum, EstadoRiesgoGRCEnum,
    TratamientoRiesgoGRCEnum, TipoControlGRCEnum, EfectividadControlGRCEnum,
    EstadoPoliticaGRCEnum, TipoObligacionGRCEnum, EstadoCumplimientoGRCEnum,
    TipoAuditoriaGRCEnum, EstadoAuditoriaGRCEnum, SeveridadGRCEnum,
    EstadoHallazgoGRCEnum, TipoTerceroGRCEnum,
)


# ── Comité ──────────────────────────────────────────────────
class GRCComiteCreate(BaseModel):
    nombre: str
    tipo: Optional[str] = None
    presidente: Optional[str] = None
    secretario: Optional[str] = None
    periodicidad: Optional[str] = None
    descripcion: Optional[str] = None

class GRCComiteResponse(GRCComiteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool
    created_at: Optional[datetime] = None


# ── Política ────────────────────────────────────────────────
class GRCPoliticaCreate(BaseModel):
    nombre: str
    tipo: Optional[str] = None
    version: Optional[str] = '1.0'
    estado: Optional[EstadoPoliticaGRCEnum] = EstadoPoliticaGRCEnum.BORRADOR
    propietario: Optional[str] = None
    aprobador: Optional[str] = None
    fecha_aprobacion: Optional[date] = None
    fecha_vigencia: Optional[date] = None
    fecha_revision: Optional[date] = None
    alcance: Optional[str] = None
    dms_documento_id: Optional[int] = None
    aceptaciones_requeridas: bool = False

class GRCPoliticaResponse(GRCPoliticaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    aceptaciones_count: int = 0
    created_at: Optional[datetime] = None


# ── Obligación ──────────────────────────────────────────────
class GRCObligacionCreate(BaseModel):
    nombre: str
    tipo: Optional[TipoObligacionGRCEnum] = None
    pais: Optional[str] = 'Colombia'
    industria: Optional[str] = None
    area: Optional[str] = None
    descripcion: Optional[str] = None
    fuente: Optional[str] = None
    fecha_vigencia: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    responsable: Optional[str] = None

class GRCObligacionResponse(GRCObligacionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    estado_cumplimiento: Optional[EstadoCumplimientoGRCEnum] = None
    created_at: Optional[datetime] = None


# ── Control ─────────────────────────────────────────────────
class GRCControlCreate(BaseModel):
    nombre: str
    tipo: Optional[TipoControlGRCEnum] = None
    descripcion: Optional[str] = None
    proceso: Optional[str] = None
    area: Optional[str] = None
    responsable: Optional[str] = None
    frecuencia: Optional[str] = None
    automatizado: bool = False

class GRCControlUpdate(GRCControlCreate):
    efectividad: Optional[EfectividadControlGRCEnum] = None
    ultima_evaluacion: Optional[date] = None
    proxima_evaluacion: Optional[date] = None

class GRCControlResponse(GRCControlUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    activo: bool = True
    created_at: Optional[datetime] = None


# ── Riesgo ──────────────────────────────────────────────────
class GRCRiesgoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo: Optional[TipoRiesgoGRCEnum] = None
    proceso: Optional[str] = None
    area: Optional[str] = None
    responsable: Optional[str] = None
    probabilidad_inherente: Optional[int] = None
    impacto_inherente: Optional[int] = None
    probabilidad_residual: Optional[int] = None
    impacto_residual: Optional[int] = None
    tratamiento: Optional[TratamientoRiesgoGRCEnum] = None
    apetito_riesgo: Optional[str] = None
    comite_id: Optional[int] = None

class GRCRiesgoUpdate(GRCRiesgoCreate):
    estado: Optional[EstadoRiesgoGRCEnum] = None

class GRCRiesgoResponse(GRCRiesgoUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    nivel_inherente: Optional[int] = None
    nivel_residual: Optional[int] = None
    prioridad: Optional[PrioridadRiesgoGRCEnum] = None
    created_at: Optional[datetime] = None


# ── Tratamiento de Riesgo ───────────────────────────────────
class GRCTratamientoCreate(BaseModel):
    riesgo_id: int
    tipo: Optional[TratamientoRiesgoGRCEnum] = None
    descripcion: Optional[str] = None
    responsable: Optional[str] = None
    fecha_objetivo: Optional[date] = None

class GRCTratamientoResponse(GRCTratamientoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str = 'pendiente'
    avance: int = 0
    created_at: Optional[datetime] = None


# ── Matriz de Cumplimiento ──────────────────────────────────
class GRCMatrizCumplimientoCreate(BaseModel):
    obligacion_id: int
    proceso: Optional[str] = None
    area: Optional[str] = None
    responsable: Optional[str] = None
    puntaje: Optional[int] = None
    evidencias: Optional[str] = None
    observaciones: Optional[str] = None

class GRCMatrizCumplimientoUpdate(GRCMatrizCumplimientoCreate):
    estado: Optional[EstadoCumplimientoGRCEnum] = None
    ultima_evaluacion: Optional[date] = None
    proxima_evaluacion: Optional[date] = None

class GRCMatrizCumplimientoResponse(GRCMatrizCumplimientoUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ── Evidencia ───────────────────────────────────────────────
class GRCEvidenciaCreate(BaseModel):
    nombre: str
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    url: Optional[str] = None
    dms_documento_id: Optional[int] = None
    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    responsable: Optional[str] = None
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[int] = None

class GRCEvidenciaResponse(GRCEvidenciaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activa: bool = True
    created_at: Optional[datetime] = None


# ── Auditoría ───────────────────────────────────────────────
class GRCAuditoriaCreate(BaseModel):
    nombre: str
    tipo: Optional[TipoAuditoriaGRCEnum] = None
    auditor_lider: Optional[str] = None
    equipo_auditor: Optional[str] = None
    auditado: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    fecha_reporte: Optional[date] = None
    alcance: Optional[str] = None
    criterios: Optional[str] = None
    presupuesto: Optional[Decimal] = None

class GRCAuditoriaUpdate(GRCAuditoriaCreate):
    estado: Optional[EstadoAuditoriaGRCEnum] = None
    observaciones: Optional[str] = None

class GRCAuditoriaResponse(GRCAuditoriaUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Hallazgo ────────────────────────────────────────────────
class GRCHallazgoCreate(BaseModel):
    auditoria_id: Optional[int] = None
    titulo: str
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    severidad: Optional[SeveridadGRCEnum] = None
    proceso: Optional[str] = None
    area: Optional[str] = None
    responsable: Optional[str] = None
    fecha_limite: Optional[date] = None
    riesgo_asociado: Optional[str] = None
    impacto: Optional[str] = None
    recomendacion: Optional[str] = None

class GRCHallazgoUpdate(GRCHallazgoCreate):
    estado: Optional[EstadoHallazgoGRCEnum] = None

class GRCHallazgoResponse(GRCHallazgoUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Plan de Acción ──────────────────────────────────────────
class GRCPlanAccionCreate(BaseModel):
    hallazgo_id: int
    accion: str
    responsable: Optional[str] = None
    fecha_objetivo: Optional[date] = None
    evidencia: Optional[str] = None
    observaciones: Optional[str] = None

class GRCPlanAccionUpdate(GRCPlanAccionCreate):
    estado: Optional[str] = None
    avance: Optional[int] = None

class GRCPlanAccionResponse(GRCPlanAccionUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ── Incidente ───────────────────────────────────────────────
class GRCIncidenteCreate(BaseModel):
    titulo: str
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    severidad: Optional[SeveridadGRCEnum] = None
    impacto: Optional[str] = None
    urgencia: Optional[str] = None
    proceso: Optional[str] = None
    area: Optional[str] = None
    reportado_por: Optional[str] = None
    responsable: Optional[str] = None
    fecha_ocurrencia: Optional[datetime] = None

class GRCIncidenteUpdate(GRCIncidenteCreate):
    estado: Optional[str] = None
    fecha_cierre: Optional[datetime] = None
    causa_raiz: Optional[str] = None
    acciones_tomadas: Optional[str] = None
    lecciones_aprendidas: Optional[str] = None

class GRCIncidenteResponse(GRCIncidenteUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Continuidad ─────────────────────────────────────────────
class GRCContinuidadCreate(BaseModel):
    proceso: str
    criticidad: Optional[str] = None
    rto_horas: Optional[int] = None
    rpo_horas: Optional[int] = None
    impacto_financiero_hora: Optional[Decimal] = None
    impacto_operativo: Optional[str] = None
    sistemas_criticos: Optional[str] = None
    dependencias: Optional[str] = None
    responsable: Optional[str] = None
    plan_contingencia: Optional[str] = None

class GRCContinuidadResponse(GRCContinuidadCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado_plan: str = 'activo'
    ultima_revision: Optional[date] = None
    created_at: Optional[datetime] = None


# ── Simulacro ───────────────────────────────────────────────
class GRCSimulacroCreate(BaseModel):
    continuidad_id: Optional[int] = None
    nombre: Optional[str] = None
    fecha: Optional[date] = None
    tipo: Optional[str] = None
    resultado: Optional[str] = None
    participantes: Optional[int] = None
    observaciones: Optional[str] = None
    lecciones: Optional[str] = None

class GRCSimulacroResponse(GRCSimulacroCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ── Tercero ─────────────────────────────────────────────────
class GRCTerceroCreate(BaseModel):
    nombre: str
    nit: Optional[str] = None
    tipo: Optional[TipoTerceroGRCEnum] = None
    pais: Optional[str] = 'Colombia'
    sector: Optional[str] = None
    contacto: Optional[str] = None
    nivel_riesgo: Optional[str] = None

class GRCTerceroResponse(GRCTerceroCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str = 'activo'
    created_at: Optional[datetime] = None


# ── Evaluación Tercero ──────────────────────────────────────
class GRCEvaluacionTerceroCreate(BaseModel):
    tercero_id: int
    periodo: Optional[str] = None
    cumplimiento_legal: Optional[int] = None
    riesgo_reputacional: Optional[int] = None
    solidez_financiera: Optional[int] = None
    seguridad_info: Optional[int] = None
    evaluador: Optional[str] = None
    observaciones: Optional[str] = None

class GRCEvaluacionTerceroResponse(GRCEvaluacionTerceroCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    puntaje_total: Optional[Decimal] = None
    clasificacion: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Dashboard KPIs ──────────────────────────────────────────
class GRCDashboardKPIs(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    riesgos_abiertos: int = 0
    riesgos_criticos: int = 0
    riesgos_mitigados: int = 0
    controles_efectivos_pct: float = 0.0
    controles_total: int = 0
    cumplimiento_general_pct: float = 0.0
    obligaciones_vencidas: int = 0
    hallazgos_abiertos: int = 0
    hallazgos_cerrados: int = 0
    tiempo_promedio_cierre_dias: float = 0.0
    auditorias_en_curso: int = 0
    incidentes_abiertos: int = 0
    politicas_vigentes: int = 0
    politicas_vencidas: int = 0
    terceros_criticos: int = 0
    procesos_criticos_cubiertos: int = 0
    simulacros_realizados: int = 0
