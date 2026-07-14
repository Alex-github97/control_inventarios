from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.models.eam import (
    EAMTipoTrabajo, EAMActividad, EAMRepuesto, EAMFallaCatalogo,
    EAMCausaCatalogo, EAMSolucionCatalogo, EAMContratista,
    EAMActivo, EAMComponente, EAMDocumentoActivo,
    EAMChecklistPlantilla, EAMChecklistPregunta,
    EAMPlanMantenimiento, EAMPlanDetalle,
    EAMOrdenTrabajo, EAMChecklistEjecucion, EAMChecklistRespuesta,
    EAMOTMaterial, EAMOTManoObra,
    EAMMuestraAceite, EAMNeumatico, EAMMovimientoNeumatico,
    EAMBodegaNeumatico, EAMDanoNeumaticoCatalogo, EAMActivo,
    EAMRegistroCombustible, EAMGarantia, EAMFMEA,
    EAMCalibracion, EAMKPIDiario,
)

router = APIRouter(prefix="/eam", tags=["eam"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class TipoTrabajoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None

class TipoTrabajoResponse(TipoTrabajoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ActividadCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class ActividadResponse(ActividadCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class RepuestoCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    unidad_medida: Optional[str] = None
    costo_unitario: Optional[float] = 0
    stock_minimo: Optional[int] = 0
    stock_actual: Optional[int] = 0
    proveedor_ppal: Optional[str] = None

class RepuestoResponse(RepuestoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class FallaCreate(BaseModel):
    codigo: Optional[str] = None
    descripcion: str
    tipo_activo: Optional[str] = None

class FallaResponse(FallaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class CausaCreate(BaseModel):
    descripcion: str

class CausaResponse(CausaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class SolucionCreate(BaseModel):
    descripcion: str

class SolucionResponse(SolucionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ContratistaCreate(BaseModel):
    nombre: str
    nit: Optional[str] = None
    tipo: Optional[str] = None
    especialidad: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    ciudad: Optional[str] = None
    calificacion: Optional[float] = 5.0

class ContratistaResponse(ContratistaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ActivoCreate(BaseModel):
    codigo: str
    nombre: str
    tipo_activo: Optional[str] = None
    estado: Optional[str] = "OPERATIVO"
    criticidad: Optional[str] = "MEDIA"
    parent_id: Optional[int] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    numero_serie: Optional[str] = None
    placa: Optional[str] = None
    color: Optional[str] = None
    fecha_adquisicion: Optional[date] = None
    costo_adquisicion: Optional[float] = None
    valor_libro: Optional[float] = None
    vida_util_anios: Optional[int] = None
    vida_util_km: Optional[float] = None
    ubicacion: Optional[str] = None
    sede: Optional[str] = None
    area: Optional[str] = None
    responsable: Optional[str] = None
    odometro_actual: Optional[float] = 0
    horometro_actual: Optional[float] = 0
    tipo_combustible: Optional[str] = None
    capacidad_combustible: Optional[float] = None
    numero_ejes: Optional[int] = None
    tiene_repuesto: Optional[bool] = True

class ActivoResponse(ActivoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ComponenteCreate(BaseModel):
    activo_id: int
    nombre: str
    descripcion: Optional[str] = None
    numero_parte: Optional[str] = None
    marca: Optional[str] = None
    estado: Optional[str] = "BUENO"
    criticidad: Optional[str] = "MEDIA"
    vida_util_horas: Optional[float] = None
    horas_actuales: Optional[float] = 0

class ComponenteResponse(ComponenteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class ChecklistPlantillaCreate(BaseModel):
    nombre: str
    tipo_activo: Optional[str] = None
    descripcion: Optional[str] = None

class ChecklistPlantillaResponse(ChecklistPlantillaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ChecklistPreguntaCreate(BaseModel):
    plantilla_id: int
    orden: Optional[int] = 0
    seccion: Optional[str] = None
    pregunta: str
    tipo_respuesta: Optional[str] = "SI_NO"
    requiere_foto: Optional[bool] = False
    requiere_firma: Optional[bool] = False
    critica: Optional[bool] = False

class ChecklistPreguntaResponse(ChecklistPreguntaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class PlanMantenimientoCreate(BaseModel):
    nombre: str
    activo_id: Optional[int] = None
    tipo_activo: Optional[str] = None
    tipo_mant: Optional[str] = "TIEMPO"
    frecuencia: Optional[int] = None
    unidad: Optional[str] = None
    tipo_ot: Optional[str] = "PREVENTIVA"
    checklist_id: Optional[int] = None
    descripcion: Optional[str] = None
    costo_estimado: Optional[float] = None

class PlanMantenimientoResponse(PlanMantenimientoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class OTCreate(BaseModel):
    numero: str
    activo_id: int
    tipo_ot: Optional[str] = "CORRECTIVA"
    tipo_trabajo_id: Optional[int] = None
    estado: Optional[str] = "PENDIENTE"
    prioridad: Optional[str] = "MEDIA"
    descripcion: str
    falla_id: Optional[int] = None
    causa_id: Optional[int] = None
    solucion_id: Optional[int] = None
    plan_id: Optional[int] = None
    contratista_id: Optional[int] = None
    tecnico_asignado: Optional[str] = None
    fecha_requerida: Optional[datetime] = None
    odometro: Optional[float] = None
    horometro: Optional[float] = None
    tiempo_estimado_horas: Optional[float] = None
    observaciones: Optional[str] = None
    creado_por: Optional[str] = None

class OTResponse(OTCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    costo_mano_obra: float
    costo_repuestos: float
    costo_servicios: float
    costo_total: float
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    tiempo_real_horas: Optional[float] = None

class OTEstadoUpdate(BaseModel):
    estado: str
    observaciones: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    tiempo_real_horas: Optional[float] = None

class MuestraAceiteCreate(BaseModel):
    activo_id: int
    componente_id: Optional[int] = None
    numero_muestra: str
    fecha_toma: datetime
    tipo_lubricante: Optional[str] = None
    horas_aceite: Optional[float] = None
    horas_equipo: Optional[float] = None
    odometro: Optional[float] = None
    laboratorio: Optional[str] = None
    hierro_ppm: Optional[float] = None
    cobre_ppm: Optional[float] = None
    aluminio_ppm: Optional[float] = None
    silicio_ppm: Optional[float] = None
    sodio_ppm: Optional[float] = None
    agua_pct: Optional[float] = None
    viscosidad_40: Optional[float] = None
    viscosidad_100: Optional[float] = None
    contaminacion: Optional[str] = "NORMAL"
    diagnostico: Optional[str] = None
    recomendacion: Optional[str] = None
    alerta: Optional[bool] = False

class MuestraAceiteResponse(MuestraAceiteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class NeumaticCreate(BaseModel):
    codigo: str
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    tipo: Optional[str] = None
    estado: Optional[str] = "ALMACENADO"
    activo_id: Optional[int] = None
    posicion: Optional[str] = None
    bodega_id: Optional[int] = None
    vida_util_km: Optional[float] = None
    profundidad_diseño: Optional[float] = None
    profundidad_actual: Optional[float] = None
    costo: Optional[float] = None
    proveedor: Optional[str] = None

class NeumaticUpdate(BaseModel):
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    tipo: Optional[str] = None
    estado: Optional[str] = None
    bodega_id: Optional[int] = None
    posicion: Optional[str] = None
    vida_util_km: Optional[float] = None
    profundidad_diseño: Optional[float] = None
    profundidad_actual: Optional[float] = None
    km_actual: Optional[float] = None
    costo: Optional[float] = None
    proveedor: Optional[str] = None

class NeumaticResponse(NeumaticCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    km_inicio: float
    km_actual: float
    km_total: float
    reencauches: int
    dano_id: Optional[int] = None
    motivo_baja: Optional[str] = None
    fecha_baja: Optional[date] = None

# ── Bodegas de neumáticos ──
class BodegaNeumaticoCreate(BaseModel):
    codigo: str
    nombre: str
    ubicacion: Optional[str] = None
    capacidad: Optional[int] = None
    activo: bool = True

class BodegaNeumaticoResponse(BodegaNeumaticoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Catálogo de daños de neumático ──
class DanoNeumaticoCreate(BaseModel):
    codigo: str
    nombre: str
    severidad: str = "MODERADO"   # LEVE/MODERADO/GRAVE
    descripcion: Optional[str] = None
    accion: str = "INSPECCION"    # REENCAUCHE/DESCARTE/INSPECCION
    activo: bool = True

class DanoNeumaticoResponse(DanoNeumaticoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Movimiento de neumático (rotación/instalación/etc.) ──
class MovNeumaticoCreate(BaseModel):
    neumatico_id: int
    tipo_movimiento: str          # INSTALACION/ROTACION/DESMONTAJE/REENCAUCHE/BAJA/ALMACENAMIENTO
    fecha: datetime               # fecha y hora del movimiento (obligatoria)
    activo_id: Optional[int] = None       # vehículo destino (instalación/rotación)
    posicion: Optional[str] = None        # posición destino
    bodega_id: Optional[int] = None       # bodega destino (desmontaje/almacenamiento)
    km_odometro: Optional[float] = None
    dano_id: Optional[int] = None         # para BAJA/REENCAUCHE
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    tecnico: Optional[str] = None

class MovNeumaticoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    neumatico_id: int
    tipo_movimiento: str
    activo_id: Optional[int] = None
    posicion_origen: Optional[str] = None
    posicion: Optional[str] = None
    bodega_id: Optional[int] = None
    km_odometro: Optional[float] = None
    fecha: Optional[datetime] = None
    observaciones: Optional[str] = None
    tecnico: Optional[str] = None

class PosicionLayout(BaseModel):
    codigo: str
    label: str
    eje: int
    lado: str

class CombustibleCreate(BaseModel):
    activo_id: int
    fecha: datetime
    tipo_combustible: Optional[str] = None
    litros: float
    precio_litro: Optional[float] = None
    costo_total: Optional[float] = None
    odometro: Optional[float] = None
    horometro: Optional[float] = None
    rendimiento: Optional[float] = None
    proveedor: Optional[str] = None
    conductor: Optional[str] = None
    tanque_lleno: Optional[bool] = False
    observaciones: Optional[str] = None

class CombustibleResponse(CombustibleCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class GarantiaCreate(BaseModel):
    activo_id: Optional[int] = None
    tipo: Optional[str] = None
    descripcion: str
    proveedor: Optional[str] = None
    numero_garantia: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    condiciones: Optional[str] = None
    estado: Optional[str] = "VIGENTE"
    valor_cubierto: Optional[float] = None

class GarantiaResponse(GarantiaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reclamaciones: int

class CalibracionCreate(BaseModel):
    activo_id: int
    tipo_instrumento: Optional[str] = None
    numero_certificado: Optional[str] = None
    laboratorio: Optional[str] = None
    acreditacion: Optional[str] = None
    fecha_calibracion: date
    fecha_vencimiento: date
    resultado: Optional[str] = None
    estado: Optional[str] = "VIGENTE"
    incertidumbre: Optional[str] = None
    observaciones: Optional[str] = None

class CalibracionResponse(CalibracionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class ChecklistEjecucionCreate(BaseModel):
    plantilla_id: int
    activo_id: int
    ot_id: Optional[int] = None
    ejecutado_por: Optional[str] = None

class ChecklistEjecucionResponse(ChecklistEjecucionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: Optional[str] = None
    pct_conforme: float
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None


# ─── Dashboard / KPIs ─────────────────────────────────────────────────────────

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(EAMActivo.id)).where(EAMActivo.activo == True))
    operativos = await db.scalar(
        select(func.count(EAMActivo.id)).where(
            and_(EAMActivo.activo == True, EAMActivo.estado == "OPERATIVO")
        )
    )
    en_mant = await db.scalar(
        select(func.count(EAMActivo.id)).where(
            and_(EAMActivo.activo == True, EAMActivo.estado == "EN_MANTENIMIENTO")
        )
    )
    ots_abiertas = await db.scalar(
        select(func.count(EAMOrdenTrabajo.id)).where(
            EAMOrdenTrabajo.estado.in_(["PENDIENTE", "ASIGNADA", "EN_EJECUCION", "EN_ESPERA_REPUESTOS"])
        )
    )
    ots_completadas = await db.scalar(
        select(func.count(EAMOrdenTrabajo.id)).where(EAMOrdenTrabajo.estado == "COMPLETADA")
    )
    garantias_vigentes = await db.scalar(
        select(func.count(EAMGarantia.id)).where(EAMGarantia.estado == "VIGENTE")
    )
    alertas_aceite = await db.scalar(
        select(func.count(EAMMuestraAceite.id)).where(EAMMuestraAceite.alerta == True)
    )
    calibraciones_vencidas = await db.scalar(
        select(func.count(EAMCalibracion.id)).where(EAMCalibracion.estado == "VENCIDA")
    )
    total_s = total or 0
    operativos_s = operativos or 0
    disponibilidad = round((operativos_s / total_s * 100) if total_s > 0 else 0, 1)
    return {
        "total_activos": total_s,
        "activos_operativos": operativos_s,
        "activos_mantenimiento": en_mant or 0,
        "disponibilidad_pct": disponibilidad,
        "ots_abiertas": ots_abiertas or 0,
        "ots_completadas": ots_completadas or 0,
        "garantias_vigentes": garantias_vigentes or 0,
        "alertas_aceite": alertas_aceite or 0,
        "calibraciones_vencidas": calibraciones_vencidas or 0,
    }


# ─── Catálogos ────────────────────────────────────────────────────────────────

@router.get("/catalogos/tipos-trabajo", response_model=List[TipoTrabajoResponse])
async def list_tipos_trabajo(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMTipoTrabajo).where(EAMTipoTrabajo.activo == True))
    return result.scalars().all()

@router.post("/catalogos/tipos-trabajo", response_model=TipoTrabajoResponse)
async def create_tipo_trabajo(data: TipoTrabajoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMTipoTrabajo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/catalogos/actividades", response_model=List[ActividadResponse])
async def list_actividades(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMActividad).where(EAMActividad.activo == True))
    return result.scalars().all()

@router.post("/catalogos/actividades", response_model=ActividadResponse)
async def create_actividad(data: ActividadCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMActividad(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/catalogos/repuestos", response_model=List[RepuestoResponse])
async def list_repuestos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMRepuesto).where(EAMRepuesto.activo == True))
    return result.scalars().all()

@router.post("/catalogos/repuestos", response_model=RepuestoResponse)
async def create_repuesto(data: RepuestoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMRepuesto(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/catalogos/fallas", response_model=List[FallaResponse])
async def list_fallas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMFallaCatalogo).where(EAMFallaCatalogo.activo == True))
    return result.scalars().all()

@router.post("/catalogos/fallas", response_model=FallaResponse)
async def create_falla(data: FallaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMFallaCatalogo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/catalogos/causas", response_model=List[CausaResponse])
async def list_causas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMCausaCatalogo).where(EAMCausaCatalogo.activo == True))
    return result.scalars().all()

@router.post("/catalogos/causas", response_model=CausaResponse)
async def create_causa(data: CausaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMCausaCatalogo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/catalogos/soluciones", response_model=List[SolucionResponse])
async def list_soluciones(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMSolucionCatalogo).where(EAMSolucionCatalogo.activo == True))
    return result.scalars().all()

@router.post("/catalogos/soluciones", response_model=SolucionResponse)
async def create_solucion(data: SolucionCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMSolucionCatalogo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Contratistas ─────────────────────────────────────────────────────────────

@router.get("/contratistas", response_model=List[ContratistaResponse])
async def list_contratistas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMContratista).where(EAMContratista.activo == True))
    return result.scalars().all()

@router.post("/contratistas", response_model=ContratistaResponse)
async def create_contratista(data: ContratistaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMContratista(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Activos ──────────────────────────────────────────────────────────────────

@router.get("/activos", response_model=List[ActivoResponse])
async def list_activos(
    tipo_activo: Optional[str] = None,
    estado: Optional[str] = None,
    criticidad: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(EAMActivo).where(EAMActivo.activo == True)
    if tipo_activo:
        q = q.where(EAMActivo.tipo_activo == tipo_activo)
    if estado:
        q = q.where(EAMActivo.estado == estado)
    if criticidad:
        q = q.where(EAMActivo.criticidad == criticidad)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/activos", response_model=ActivoResponse)
async def create_activo(data: ActivoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMActivo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/activos/{activo_id}", response_model=ActivoResponse)
async def get_activo(activo_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMActivo, activo_id)
    if not obj:
        raise HTTPException(404, "Activo no encontrado")
    return obj

@router.put("/activos/{activo_id}", response_model=ActivoResponse)
async def update_activo(activo_id: int, data: ActivoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMActivo, activo_id)
    if not obj:
        raise HTTPException(404, "Activo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.get("/activos/{activo_id}/componentes", response_model=List[ComponenteResponse])
async def get_componentes_activo(activo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMComponente).where(EAMComponente.activo_id == activo_id))
    return result.scalars().all()

@router.post("/activos/{activo_id}/componentes", response_model=ComponenteResponse)
async def add_componente(activo_id: int, data: ComponenteCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMComponente(**{**data.model_dump(), "activo_id": activo_id})
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Checklists ───────────────────────────────────────────────────────────────

@router.get("/checklists/plantillas", response_model=List[ChecklistPlantillaResponse])
async def list_plantillas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMChecklistPlantilla).where(EAMChecklistPlantilla.activo == True))
    return result.scalars().all()

@router.post("/checklists/plantillas", response_model=ChecklistPlantillaResponse)
async def create_plantilla(data: ChecklistPlantillaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMChecklistPlantilla(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/checklists/plantillas/{plantilla_id}/preguntas", response_model=List[ChecklistPreguntaResponse])
async def list_preguntas(plantilla_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EAMChecklistPregunta)
        .where(and_(EAMChecklistPregunta.plantilla_id == plantilla_id, EAMChecklistPregunta.activo == True))
        .order_by(EAMChecklistPregunta.orden)
    )
    return result.scalars().all()

@router.post("/checklists/plantillas/{plantilla_id}/preguntas", response_model=ChecklistPreguntaResponse)
async def add_pregunta(plantilla_id: int, data: ChecklistPreguntaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMChecklistPregunta(**{**data.model_dump(), "plantilla_id": plantilla_id})
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/checklists/ejecuciones", response_model=List[ChecklistEjecucionResponse])
async def list_ejecuciones(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMChecklistEjecucion).order_by(EAMChecklistEjecucion.id.desc()).limit(100))
    return result.scalars().all()

@router.post("/checklists/ejecuciones", response_model=ChecklistEjecucionResponse)
async def create_ejecucion(data: ChecklistEjecucionCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMChecklistEjecucion(**data.model_dump(), estado="EN_CURSO")
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Planes de mantenimiento ──────────────────────────────────────────────────

@router.get("/planes", response_model=List[PlanMantenimientoResponse])
async def list_planes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EAMPlanMantenimiento).where(EAMPlanMantenimiento.activo == True))
    return result.scalars().all()

@router.post("/planes", response_model=PlanMantenimientoResponse)
async def create_plan(data: PlanMantenimientoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMPlanMantenimiento(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/planes/{plan_id}", response_model=PlanMantenimientoResponse)
async def update_plan(plan_id: int, data: PlanMantenimientoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMPlanMantenimiento, plan_id)
    if not obj:
        raise HTTPException(404, "Plan no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ─── Órdenes de trabajo ───────────────────────────────────────────────────────

@router.get("/ots", response_model=List[OTResponse])
async def list_ots(
    estado: Optional[str] = None,
    tipo_ot: Optional[str] = None,
    activo_id: Optional[int] = None,
    prioridad: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(EAMOrdenTrabajo).order_by(EAMOrdenTrabajo.id.desc())
    if estado:
        q = q.where(EAMOrdenTrabajo.estado == estado)
    if tipo_ot:
        q = q.where(EAMOrdenTrabajo.tipo_ot == tipo_ot)
    if activo_id:
        q = q.where(EAMOrdenTrabajo.activo_id == activo_id)
    if prioridad:
        q = q.where(EAMOrdenTrabajo.prioridad == prioridad)
    result = await db.execute(q.limit(200))
    return result.scalars().all()

@router.post("/ots", response_model=OTResponse)
async def create_ot(data: OTCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMOrdenTrabajo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/ots/{ot_id}", response_model=OTResponse)
async def get_ot(ot_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMOrdenTrabajo, ot_id)
    if not obj:
        raise HTTPException(404, "OT no encontrada")
    return obj

@router.put("/ots/{ot_id}/estado")
async def update_ot_estado(ot_id: int, data: OTEstadoUpdate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMOrdenTrabajo, ot_id)
    if not obj:
        raise HTTPException(404, "OT no encontrada")
    obj.estado = data.estado
    if data.observaciones:
        obj.observaciones = data.observaciones
    if data.fecha_inicio:
        obj.fecha_inicio = data.fecha_inicio
    if data.fecha_fin:
        obj.fecha_fin = data.fecha_fin
    if data.tiempo_real_horas:
        obj.tiempo_real_horas = data.tiempo_real_horas
    await db.commit(); await db.refresh(obj)
    return obj


# ─── Lubricación / Aceites ────────────────────────────────────────────────────

@router.get("/aceite/muestras", response_model=List[MuestraAceiteResponse])
async def list_muestras(activo_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(EAMMuestraAceite).order_by(EAMMuestraAceite.fecha_toma.desc())
    if activo_id:
        q = q.where(EAMMuestraAceite.activo_id == activo_id)
    result = await db.execute(q.limit(200))
    return result.scalars().all()

@router.post("/aceite/muestras", response_model=MuestraAceiteResponse)
async def create_muestra(data: MuestraAceiteCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMMuestraAceite(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Neumáticos ───────────────────────────────────────────────────────────────

def _generar_posiciones(numero_ejes: Optional[int], tiene_repuesto: bool) -> List[dict]:
    """Layout estándar de posiciones de neumáticos según el número de ejes.
    Eje 1 = direccional (2 llantas). Ejes 2..N = duales (4 llantas)."""
    pos: List[dict] = []
    for eje in range(1, (numero_ejes or 0) + 1):
        if eje == 1:
            pos.append({"codigo": "E1-IZQ", "label": "Eje 1 · Izq", "eje": 1, "lado": "IZQ"})
            pos.append({"codigo": "E1-DER", "label": "Eje 1 · Der", "eje": 1, "lado": "DER"})
        else:
            pos.append({"codigo": f"E{eje}-IZQ-EXT", "label": f"Eje {eje} · Izq Ext", "eje": eje, "lado": "IZQ"})
            pos.append({"codigo": f"E{eje}-IZQ-INT", "label": f"Eje {eje} · Izq Int", "eje": eje, "lado": "IZQ"})
            pos.append({"codigo": f"E{eje}-DER-INT", "label": f"Eje {eje} · Der Int", "eje": eje, "lado": "DER"})
            pos.append({"codigo": f"E{eje}-DER-EXT", "label": f"Eje {eje} · Der Ext", "eje": eje, "lado": "DER"})
    if tiene_repuesto:
        pos.append({"codigo": "REPUESTO", "label": "Repuesto", "eje": 0, "lado": "-"})
    return pos


# ── Bodegas de neumáticos ──
@router.get("/neumaticos/bodegas", response_model=List[BodegaNeumaticoResponse])
async def list_bodegas_neumatico(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMBodegaNeumatico).order_by(EAMBodegaNeumatico.nombre))
    return r.scalars().all()

@router.post("/neumaticos/bodegas", response_model=BodegaNeumaticoResponse)
async def create_bodega_neumatico(data: BodegaNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMBodegaNeumatico(**data.model_dump()); db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/bodegas/{bid}", response_model=BodegaNeumaticoResponse)
async def update_bodega_neumatico(bid: int, data: BodegaNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMBodegaNeumatico, bid)
    if not obj: raise HTTPException(404, "Bodega no encontrada")
    for k, v in data.model_dump().items(): setattr(obj, k, v)
    await db.commit(); await db.refresh(obj); return obj

@router.delete("/neumaticos/bodegas/{bid}", status_code=204)
async def delete_bodega_neumatico(bid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMBodegaNeumatico, bid)
    if obj:
        cnt = await db.execute(select(func.count(EAMNeumatico.id)).where(EAMNeumatico.bodega_id == bid))
        if (cnt.scalar() or 0) > 0:
            raise HTTPException(409, "No se puede eliminar: hay neumáticos en esta bodega")
        await db.delete(obj); await db.commit()


# ── Catálogo de daños de neumático ──
@router.get("/neumaticos/danos-catalogo", response_model=List[DanoNeumaticoResponse])
async def list_danos_neumatico(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMDanoNeumaticoCatalogo).order_by(EAMDanoNeumaticoCatalogo.nombre))
    return r.scalars().all()

@router.post("/neumaticos/danos-catalogo", response_model=DanoNeumaticoResponse)
async def create_dano_neumatico(data: DanoNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMDanoNeumaticoCatalogo(**data.model_dump()); db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/danos-catalogo/{did}", response_model=DanoNeumaticoResponse)
async def update_dano_neumatico(did: int, data: DanoNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMDanoNeumaticoCatalogo, did)
    if not obj: raise HTTPException(404, "Daño no encontrado")
    for k, v in data.model_dump().items(): setattr(obj, k, v)
    await db.commit(); await db.refresh(obj); return obj

@router.delete("/neumaticos/danos-catalogo/{did}", status_code=204)
async def delete_dano_neumatico(did: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMDanoNeumaticoCatalogo, did)
    if obj: await db.delete(obj); await db.commit()


# ── Pila de descarte (neumáticos dados de baja) ──
@router.get("/neumaticos/descarte", response_model=List[NeumaticResponse])
async def list_descarte_neumatico(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.estado == "BAJA").order_by(EAMNeumatico.fecha_baja.desc()))
    return r.scalars().all()


class ConfigEjes(BaseModel):
    numero_ejes: int
    tiene_repuesto: bool = True

@router.put("/neumaticos/config-ejes/{activo_id}")
async def config_ejes_vehiculo(activo_id: int, data: ConfigEjes, db: AsyncSession = Depends(get_db)):
    """Configura el número de ejes y repuesto de un vehículo (no destructivo)."""
    activo = await db.get(EAMActivo, activo_id)
    if not activo:
        raise HTTPException(404, "Activo no encontrado")
    if data.numero_ejes < 1 or data.numero_ejes > 6:
        raise HTTPException(400, "El número de ejes debe estar entre 1 y 6")
    activo.numero_ejes = data.numero_ejes
    activo.tiene_repuesto = data.tiene_repuesto
    await db.commit()
    return {"id": activo.id, "numero_ejes": activo.numero_ejes, "tiene_repuesto": activo.tiene_repuesto}


# ── Layout de posiciones por vehículo ──
@router.get("/neumaticos/layout/{activo_id}", response_model=List[PosicionLayout])
async def layout_neumaticos(activo_id: int, db: AsyncSession = Depends(get_db)):
    activo = await db.get(EAMActivo, activo_id)
    if not activo:
        raise HTTPException(404, "Activo no encontrado")
    return _generar_posiciones(activo.numero_ejes, activo.tiene_repuesto if activo.tiene_repuesto is not None else True)


# ── Movimiento (instalación / rotación / desmontaje / reencauche / baja) ──
@router.post("/neumaticos/movimiento", response_model=MovNeumaticoResponse)
async def crear_movimiento_neumatico(data: MovNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, data.neumatico_id)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    tipo = (data.tipo_movimiento or "").upper()
    posicion_origen = neu.posicion
    if tipo in ("INSTALACION", "ROTACION"):
        neu.estado = "INSTALADO"; neu.activo_id = data.activo_id
        neu.posicion = data.posicion; neu.bodega_id = None
        if data.km_odometro is not None:
            neu.km_actual = data.km_odometro
    elif tipo in ("DESMONTAJE", "ALMACENAMIENTO"):
        neu.estado = "ALMACENADO"; neu.activo_id = None; neu.posicion = None
        neu.bodega_id = data.bodega_id
    elif tipo == "REENCAUCHE":
        neu.estado = "REENCAUCHE"; neu.activo_id = None; neu.posicion = None
        neu.bodega_id = data.bodega_id
        neu.reencauches = (neu.reencauches or 0) + 1
        if data.dano_id: neu.dano_id = data.dano_id
    elif tipo == "BAJA":
        neu.estado = "BAJA"; neu.activo_id = None; neu.posicion = None; neu.bodega_id = None
        neu.dano_id = data.dano_id; neu.motivo_baja = data.motivo
        neu.fecha_baja = data.fecha.date()
    else:
        raise HTTPException(400, f"Tipo de movimiento inválido: {tipo}")

    mov = EAMMovimientoNeumatico(
        neumatico_id=neu.id, tipo_movimiento=tipo, activo_id=data.activo_id,
        posicion_origen=posicion_origen, posicion=data.posicion, bodega_id=data.bodega_id,
        km_odometro=data.km_odometro, fecha=data.fecha,
        observaciones=data.observaciones or data.motivo, tecnico=data.tecnico,
    )
    db.add(mov); await db.commit(); await db.refresh(mov)
    return mov


@router.get("/neumaticos/{nid}/movimientos", response_model=List[MovNeumaticoResponse])
async def list_movimientos_neumatico(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMMovimientoNeumatico).where(EAMMovimientoNeumatico.neumatico_id == nid)
        .order_by(EAMMovimientoNeumatico.fecha.desc())
    )
    return r.scalars().all()


@router.get("/neumaticos", response_model=List[NeumaticResponse])
async def list_neumaticos(
    estado: Optional[str] = None,
    activo_id: Optional[int] = None,
    bodega_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(EAMNeumatico)
    if estado:
        q = q.where(EAMNeumatico.estado == estado)
    if activo_id is not None:
        q = q.where(EAMNeumatico.activo_id == activo_id)
    if bodega_id is not None:
        q = q.where(EAMNeumatico.bodega_id == bodega_id)
    result = await db.execute(q.order_by(EAMNeumatico.codigo))
    return result.scalars().all()

@router.post("/neumaticos", response_model=NeumaticResponse)
async def create_neumatico(data: NeumaticCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMNeumatico(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/{nid}", response_model=NeumaticResponse)
async def update_neumatico(nid: int, data: NeumaticUpdate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMNeumatico, nid)
    if not obj:
        raise HTTPException(404, "Neumático no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


# ─── Combustible ──────────────────────────────────────────────────────────────

@router.get("/combustible", response_model=List[CombustibleResponse])
async def list_combustible(activo_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(EAMRegistroCombustible).order_by(EAMRegistroCombustible.fecha.desc())
    if activo_id:
        q = q.where(EAMRegistroCombustible.activo_id == activo_id)
    result = await db.execute(q.limit(200))
    return result.scalars().all()

@router.post("/combustible", response_model=CombustibleResponse)
async def create_combustible(data: CombustibleCreate, db: AsyncSession = Depends(get_db)):
    if data.litros > 0 and data.precio_litro and data.precio_litro > 0:
        data = data.model_copy(update={"costo_total": data.litros * data.precio_litro})
    obj = EAMRegistroCombustible(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Garantías ────────────────────────────────────────────────────────────────

@router.get("/garantias", response_model=List[GarantiaResponse])
async def list_garantias(estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(EAMGarantia)
    if estado:
        q = q.where(EAMGarantia.estado == estado)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/garantias", response_model=GarantiaResponse)
async def create_garantia(data: GarantiaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMGarantia(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── Calibraciones ────────────────────────────────────────────────────────────

@router.get("/calibraciones", response_model=List[CalibracionResponse])
async def list_calibraciones(estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(EAMCalibracion)
    if estado:
        q = q.where(EAMCalibracion.estado == estado)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/calibraciones", response_model=CalibracionResponse)
async def create_calibracion(data: CalibracionCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMCalibracion(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ─── KPIs ─────────────────────────────────────────────────────────────────────

@router.get("/kpis/diarios")
async def list_kpis_diarios(limit: int = 30, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EAMKPIDiario).order_by(EAMKPIDiario.fecha.desc()).limit(limit)
    )
    return result.scalars().all()
