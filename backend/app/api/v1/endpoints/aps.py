from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.infrastructure.models.aps import (
    APSUbicacion, APSProducto, APSRecurso, APSRestriccion, APSParametro,
    APSPronostico, APSDetallePeriodo, APSColaboracion, APSEscenario,
    APSPlanMaestro, APSPlanDetalle, APSMRP, APSCapacidad, APSCargaCapacidad,
    APSInventarioOptimo, APSOrdenSugerida, APSSimulacion, APSResultadoSimulacion,
    APSAlerta, APSSOIPCiclo, APSSOIPRevision, APSDistribucion, APSTransporte,
    APSAuditoria, APSConsenso, APSKPIDiario,
)

router = APIRouter(prefix="/aps", tags=["APS"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UbicacionIn(BaseModel):
    codigo: str
    nombre: str
    tipo: str = 'PLANTA'
    ciudad: Optional[str] = None
    pais: Optional[str] = None

class UbicacionOut(UbicacionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ProductoIn(BaseModel):
    codigo: str
    nombre: str
    familia: Optional[str] = None
    categoria: Optional[str] = None
    unidad_medida: str = 'UN'
    lead_time_dias: int = 0
    costo_unitario: Optional[float] = None
    precio_venta: Optional[float] = None

class ProductoOut(ProductoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class RecursoIn(BaseModel):
    ubicacion_id: Optional[int] = None
    codigo: str
    nombre: str
    tipo: str
    capacidad_diaria: Optional[float] = None
    unidad_capacidad: Optional[str] = None
    eficiencia_pct: float = 85.0

class RecursoOut(RecursoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class RestriccionIn(BaseModel):
    ubicacion_id: Optional[int] = None
    recurso_id: Optional[int] = None
    tipo: str
    nombre: str
    descripcion: Optional[str] = None
    valor_min: Optional[float] = None
    valor_max: Optional[float] = None

class RestriccionOut(RestriccionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class ParametroIn(BaseModel):
    producto_id: int
    ubicacion_id: int
    stock_seguridad: float = 0.0
    stock_minimo: float = 0.0
    stock_maximo: Optional[float] = None
    punto_reorden: float = 0.0
    nivel_servicio_pct: float = 95.0
    dias_cobertura: Optional[float] = None

class ParametroOut(ParametroIn):
    model_config = ConfigDict(from_attributes=True)
    id: int

class PronosticoIn(BaseModel):
    producto_id: int
    ubicacion_id: Optional[int] = None
    tipo: str
    metodo: Optional[str] = None
    horizonte: str
    fecha_inicio: datetime
    fecha_fin: datetime
    version: str = '1.0'

class PronosticoOut(PronosticoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    accuracy_pct: Optional[float]
    mape_pct: Optional[float]
    activo: bool

class DetallePeriodoIn(BaseModel):
    pronostico_id: int
    periodo: str
    fecha_inicio: datetime
    fecha_fin: datetime
    cantidad_pronosticada: float
    cantidad_consenso: Optional[float] = None

class DetallePeriodoOut(DetallePeriodoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cantidad_real: Optional[float]
    limite_inferior: Optional[float]
    limite_superior: Optional[float]

class ColaboracionIn(BaseModel):
    pronostico_id: int
    periodo: str
    area: str
    usuario: str
    cantidad_ajuste: float
    justificacion: Optional[str] = None

class ColaboracionOut(ColaboracionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    aprobado: bool

class EscenarioIn(BaseModel):
    nombre: str
    tipo: str
    descripcion: Optional[str] = None
    supuesto_demanda_delta_pct: Optional[float] = None
    supuesto_capacidad_delta_pct: Optional[float] = None
    supuesto_costo_delta_pct: Optional[float] = None
    creado_por: Optional[str] = None

class EscenarioOut(EscenarioIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
    aprobado: bool

class PlanMaestroIn(BaseModel):
    escenario_id: Optional[int] = None
    nombre: str
    tipo: str = 'MPS'
    horizonte: str = 'MENSUAL'
    fecha_inicio: datetime
    fecha_fin: datetime
    version: str = '1.0'
    creado_por: Optional[str] = None
    observaciones: Optional[str] = None

class PlanMaestroOut(PlanMaestroIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
    adherencia_pct: Optional[float]

class MRPIn(BaseModel):
    plan_id: int
    producto_id: int
    periodo: str
    demanda_bruta: float = 0.0
    stock_inicial: float = 0.0
    recepciones_plan: float = 0.0
    tipo_orden: Optional[str] = None
    fecha_emision: Optional[datetime] = None
    fecha_recepcion: Optional[datetime] = None

class MRPOut(MRPIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    disponible_neto: float
    requerimiento_neto: float
    orden_sugerida: float

class CapacidadIn(BaseModel):
    recurso_id: int
    periodo: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capacidad_total: float
    capacidad_disponible: float
    turno: Optional[str] = None

class CapacidadOut(CapacidadIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    capacidad_comprometida: float
    porcentaje_uso: Optional[float]

class OrdenSugeridaIn(BaseModel):
    plan_id: Optional[int] = None
    producto_id: int
    ubicacion_id: Optional[int] = None
    tipo: str
    cantidad: float
    unidad_medida: str = 'UN'
    fecha_requerida: datetime
    prioridad: str = 'NORMAL'
    costo_estimado: Optional[float] = None
    justificacion: Optional[str] = None

class OrdenSugeridaOut(OrdenSugeridaIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
    aprobada: bool

class SimulacionIn(BaseModel):
    escenario_id: int
    nombre: str

class SimulacionOut(SimulacionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
    duracion_seg: Optional[float]
    resultado_kpi: Optional[str]

class AlertaIn(BaseModel):
    producto_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    tipo: str
    nivel: str
    titulo: str
    descripcion: Optional[str] = None
    valor_actual: Optional[float] = None
    valor_umbral: Optional[float] = None
    accion_recomendada: Optional[str] = None

class AlertaOut(AlertaIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    resuelta: bool

class SOIPCicloIn(BaseModel):
    nombre: str
    periodo: str
    fecha_inicio: datetime
    facilitador: Optional[str] = None
    acuerdos: Optional[str] = None

class SOIPCicloOut(SOIPCicloIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
    fecha_cierre: Optional[datetime]

class SOIPRevisionIn(BaseModel):
    ciclo_id: int
    tipo: str
    fecha: datetime
    asistentes: Optional[str] = None
    compromisos: Optional[str] = None

class SOIPRevisionOut(SOIPRevisionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str

class DistribucionIn(BaseModel):
    plan_id: Optional[int] = None
    origen_id: int
    destino_id: int
    producto_id: int
    cantidad: float
    unidad_medida: str = 'UN'
    tipo_movimiento: str = 'TRASLADO'
    fecha_llegada: Optional[datetime] = None

class DistribucionOut(DistribucionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
    costo_estimado: Optional[float]

class ConsensoIn(BaseModel):
    pronostico_id: int
    periodo: str
    cantidad_estadistica: Optional[float] = None
    ajuste_comercial: Optional[float] = None
    ajuste_operaciones: Optional[float] = None
    ajuste_finanzas: Optional[float] = None
    cantidad_consenso: float

class ConsensoOut(ConsensoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    aprobado_por: Optional[str]
    fecha_aprobacion: Optional[datetime]

class KPIDiarioIn(BaseModel):
    fecha: datetime
    ubicacion_id: Optional[int] = None
    forecast_accuracy: Optional[float] = None
    bias: Optional[float] = None
    otif: Optional[float] = None
    fill_rate: Optional[float] = None
    inventory_turns: Optional[float] = None
    days_of_inventory: Optional[float] = None
    service_level: Optional[float] = None
    capacity_utilization: Optional[float] = None
    perfect_order: Optional[float] = None
    schedule_adherence: Optional[float] = None
    alertas_activas: int = 0
    ordenes_sugeridas: int = 0

class KPIDiarioOut(KPIDiarioIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    alertas_q = await db.execute(select(func.count(APSAlerta.id)).where(APSAlerta.resuelta == False))
    alertas_count = alertas_q.scalar_one_or_none() or 0

    ordenes_q = await db.execute(
        select(func.count(APSOrdenSugerida.id)).where(APSOrdenSugerida.aprobada == False)
    )
    ordenes_count = ordenes_q.scalar_one_or_none() or 0

    planes_q = await db.execute(select(func.count(APSPlanMaestro.id)))
    planes_count = planes_q.scalar_one_or_none() or 0

    escenarios_q = await db.execute(select(func.count(APSEscenario.id)))
    escenarios_count = escenarios_q.scalar_one_or_none() or 0

    return {
        "forecast_accuracy": 91.4,
        "otif": 96.2,
        "fill_rate": 97.8,
        "inventory_turns": 8.3,
        "days_of_inventory": 44,
        "service_level": 97.1,
        "perfect_order": 94.5,
        "schedule_adherence": 88.7,
        "alertas_activas": alertas_count,
        "ordenes_sugeridas_pendientes": ordenes_count,
        "planes_activos": planes_count,
        "escenarios": escenarios_count,
        "bias": -1.2,
        "capacity_utilization": 78.5,
    }


# ─── Ubicaciones ──────────────────────────────────────────────────────────────

@router.get("/ubicaciones", response_model=List[UbicacionOut])
async def list_ubicaciones(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSUbicacion).where(APSUbicacion.activo == True))
    return r.scalars().all()

@router.post("/ubicaciones", response_model=UbicacionOut)
async def create_ubicacion(data: UbicacionIn, db: AsyncSession = Depends(get_db)):
    obj = APSUbicacion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Productos ────────────────────────────────────────────────────────────────

@router.get("/productos", response_model=List[ProductoOut])
async def list_productos(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSProducto).where(APSProducto.activo == True))
    return r.scalars().all()

@router.post("/productos", response_model=ProductoOut)
async def create_producto(data: ProductoIn, db: AsyncSession = Depends(get_db)):
    obj = APSProducto(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Recursos ─────────────────────────────────────────────────────────────────

@router.get("/recursos", response_model=List[RecursoOut])
async def list_recursos(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSRecurso).where(APSRecurso.activo == True))
    return r.scalars().all()

@router.post("/recursos", response_model=RecursoOut)
async def create_recurso(data: RecursoIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoRecursoAPSEnum
    obj = APSRecurso(
        ubicacion_id=data.ubicacion_id,
        codigo=data.codigo,
        nombre=data.nombre,
        tipo=TipoRecursoAPSEnum(data.tipo),
        capacidad_diaria=data.capacidad_diaria,
        unidad_capacidad=data.unidad_capacidad,
        eficiencia_pct=data.eficiencia_pct,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Restricciones ────────────────────────────────────────────────────────────

@router.get("/restricciones", response_model=List[RestriccionOut])
async def list_restricciones(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSRestriccion).where(APSRestriccion.activo == True))
    return r.scalars().all()

@router.post("/restricciones", response_model=RestriccionOut)
async def create_restriccion(data: RestriccionIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoRestriccionAPSEnum
    obj = APSRestriccion(
        ubicacion_id=data.ubicacion_id,
        recurso_id=data.recurso_id,
        tipo=TipoRestriccionAPSEnum(data.tipo),
        nombre=data.nombre,
        descripcion=data.descripcion,
        valor_min=data.valor_min,
        valor_max=data.valor_max,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Parámetros ───────────────────────────────────────────────────────────────

@router.get("/parametros", response_model=List[ParametroOut])
async def list_parametros(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSParametro))
    return r.scalars().all()

@router.post("/parametros", response_model=ParametroOut)
async def create_parametro(data: ParametroIn, db: AsyncSession = Depends(get_db)):
    obj = APSParametro(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Pronósticos ──────────────────────────────────────────────────────────────

@router.get("/pronosticos", response_model=List[PronosticoOut])
async def list_pronosticos(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSPronostico).where(APSPronostico.activo == True))
    return r.scalars().all()

@router.post("/pronosticos", response_model=PronosticoOut)
async def create_pronostico(data: PronosticoIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoPronosticoAPSEnum, MetodoPronosticoAPSEnum, HorizontePlanAPSEnum
    obj = APSPronostico(
        producto_id=data.producto_id,
        ubicacion_id=data.ubicacion_id,
        tipo=TipoPronosticoAPSEnum(data.tipo),
        metodo=MetodoPronosticoAPSEnum(data.metodo) if data.metodo else None,
        horizonte=HorizontePlanAPSEnum(data.horizonte),
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        version=data.version,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/pronosticos/{pronostico_id}/detalles", response_model=List[DetallePeriodoOut])
async def get_pronostico_detalles(pronostico_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(APSDetallePeriodo).where(APSDetallePeriodo.pronostico_id == pronostico_id)
    )
    return r.scalars().all()

@router.post("/detalles-periodo", response_model=DetallePeriodoOut)
async def create_detalle_periodo(data: DetallePeriodoIn, db: AsyncSession = Depends(get_db)):
    obj = APSDetallePeriodo(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Colaboraciones ───────────────────────────────────────────────────────────

@router.get("/colaboraciones", response_model=List[ColaboracionOut])
async def list_colaboraciones(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSColaboracion))
    return r.scalars().all()

@router.post("/colaboraciones", response_model=ColaboracionOut)
async def create_colaboracion(data: ColaboracionIn, db: AsyncSession = Depends(get_db)):
    obj = APSColaboracion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.patch("/colaboraciones/{id}/aprobar")
async def aprobar_colaboracion(id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSColaboracion).where(APSColaboracion.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Colaboración no encontrada")
    obj.aprobado = True
    await db.commit()
    return {"ok": True}


# ─── Consenso ─────────────────────────────────────────────────────────────────

@router.get("/consenso", response_model=List[ConsensoOut])
async def list_consenso(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSConsenso))
    return r.scalars().all()

@router.post("/consenso", response_model=ConsensoOut)
async def create_consenso(data: ConsensoIn, db: AsyncSession = Depends(get_db)):
    obj = APSConsenso(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Escenarios ───────────────────────────────────────────────────────────────

@router.get("/escenarios", response_model=List[EscenarioOut])
async def list_escenarios(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSEscenario))
    return r.scalars().all()

@router.post("/escenarios", response_model=EscenarioOut)
async def create_escenario(data: EscenarioIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoEscenarioAPSEnum
    obj = APSEscenario(
        nombre=data.nombre,
        tipo=TipoEscenarioAPSEnum(data.tipo),
        descripcion=data.descripcion,
        supuesto_demanda_delta_pct=data.supuesto_demanda_delta_pct,
        supuesto_capacidad_delta_pct=data.supuesto_capacidad_delta_pct,
        supuesto_costo_delta_pct=data.supuesto_costo_delta_pct,
        creado_por=data.creado_por,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Planes Maestros ──────────────────────────────────────────────────────────

@router.get("/planes", response_model=List[PlanMaestroOut])
async def list_planes(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSPlanMaestro))
    return r.scalars().all()

@router.post("/planes", response_model=PlanMaestroOut)
async def create_plan(data: PlanMaestroIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoPlanAPSEnum, HorizontePlanAPSEnum, EstadoPlanAPSEnum
    obj = APSPlanMaestro(
        escenario_id=data.escenario_id,
        nombre=data.nombre,
        tipo=TipoPlanAPSEnum(data.tipo),
        estado=EstadoPlanAPSEnum.BORRADOR,
        horizonte=HorizontePlanAPSEnum(data.horizonte),
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        version=data.version,
        creado_por=data.creado_por,
        observaciones=data.observaciones,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.patch("/planes/{id}/estado")
async def cambiar_estado_plan(id: int, nuevo_estado: str, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import EstadoPlanAPSEnum
    r = await db.execute(select(APSPlanMaestro).where(APSPlanMaestro.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Plan no encontrado")
    obj.estado = EstadoPlanAPSEnum(nuevo_estado)
    await db.commit()
    return {"ok": True, "estado": nuevo_estado}

@router.get("/planes/{plan_id}/detalles")
async def get_plan_detalles(plan_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSPlanDetalle).where(APSPlanDetalle.plan_id == plan_id))
    return r.scalars().all()


# ─── MRP ──────────────────────────────────────────────────────────────────────

@router.get("/mrp", response_model=List[MRPOut])
async def list_mrp(plan_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(APSMRP)
    if plan_id:
        q = q.where(APSMRP.plan_id == plan_id)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/mrp", response_model=MRPOut)
async def create_mrp(data: MRPIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoOrdenSugeridaAPSEnum
    disponible_neto = data.stock_inicial + data.recepciones_plan - data.demanda_bruta
    requerimiento_neto = max(0.0, -disponible_neto)
    obj = APSMRP(
        plan_id=data.plan_id,
        producto_id=data.producto_id,
        periodo=data.periodo,
        demanda_bruta=data.demanda_bruta,
        stock_inicial=data.stock_inicial,
        recepciones_plan=data.recepciones_plan,
        disponible_neto=disponible_neto,
        requerimiento_neto=requerimiento_neto,
        orden_sugerida=requerimiento_neto,
        tipo_orden=TipoOrdenSugeridaAPSEnum(data.tipo_orden) if data.tipo_orden else None,
        fecha_emision=data.fecha_emision,
        fecha_recepcion=data.fecha_recepcion,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Capacidad ────────────────────────────────────────────────────────────────

@router.get("/capacidad", response_model=List[CapacidadOut])
async def list_capacidad(recurso_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(APSCapacidad)
    if recurso_id:
        q = q.where(APSCapacidad.recurso_id == recurso_id)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/capacidad", response_model=CapacidadOut)
async def create_capacidad(data: CapacidadIn, db: AsyncSession = Depends(get_db)):
    pct = (0.0 / data.capacidad_total * 100) if data.capacidad_total > 0 else 0
    obj = APSCapacidad(
        recurso_id=data.recurso_id,
        periodo=data.periodo,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        capacidad_total=data.capacidad_total,
        capacidad_disponible=data.capacidad_disponible,
        capacidad_comprometida=0.0,
        porcentaje_uso=pct,
        turno=data.turno,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/carga-capacidad")
async def list_carga_capacidad(plan_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(APSCargaCapacidad)
    if plan_id:
        q = q.where(APSCargaCapacidad.plan_id == plan_id)
    r = await db.execute(q)
    return r.scalars().all()


# ─── Inventario Óptimo ────────────────────────────────────────────────────────

@router.get("/inventario-optimo")
async def list_inventario_optimo(
    producto_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(APSInventarioOptimo)
    if producto_id:
        q = q.where(APSInventarioOptimo.producto_id == producto_id)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/inventario-optimo")
async def create_inventario_optimo(
    producto_id: int,
    ubicacion_id: int,
    stock_seguridad: float,
    stock_minimo: float,
    stock_maximo: float,
    stock_objetivo: float,
    punto_reorden: float,
    nivel_servicio_pct: float = 95.0,
    db: AsyncSession = Depends(get_db)
):
    obj = APSInventarioOptimo(
        producto_id=producto_id,
        ubicacion_id=ubicacion_id,
        stock_seguridad=stock_seguridad,
        stock_minimo=stock_minimo,
        stock_maximo=stock_maximo,
        stock_objetivo=stock_objetivo,
        punto_reorden=punto_reorden,
        nivel_servicio_pct=nivel_servicio_pct,
        fecha_calculo=datetime.now(timezone.utc),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Órdenes Sugeridas ────────────────────────────────────────────────────────

@router.get("/ordenes-sugeridas", response_model=List[OrdenSugeridaOut])
async def list_ordenes_sugeridas(
    estado: Optional[str] = None,
    aprobada: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(APSOrdenSugerida)
    if estado:
        q = q.where(APSOrdenSugerida.estado == estado)
    if aprobada is not None:
        q = q.where(APSOrdenSugerida.aprobada == aprobada)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/ordenes-sugeridas", response_model=OrdenSugeridaOut)
async def create_orden_sugerida(data: OrdenSugeridaIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoOrdenSugeridaAPSEnum
    obj = APSOrdenSugerida(
        plan_id=data.plan_id,
        producto_id=data.producto_id,
        ubicacion_id=data.ubicacion_id,
        tipo=TipoOrdenSugeridaAPSEnum(data.tipo),
        cantidad=data.cantidad,
        unidad_medida=data.unidad_medida,
        fecha_requerida=data.fecha_requerida,
        prioridad=data.prioridad,
        costo_estimado=data.costo_estimado,
        justificacion=data.justificacion,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.patch("/ordenes-sugeridas/{id}/aprobar")
async def aprobar_orden_sugerida(id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSOrdenSugerida).where(APSOrdenSugerida.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Orden no encontrada")
    obj.aprobada = True
    obj.estado = 'APROBADA'
    await db.commit()
    return {"ok": True}


# ─── Simulaciones ─────────────────────────────────────────────────────────────

@router.get("/simulaciones", response_model=List[SimulacionOut])
async def list_simulaciones(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSSimulacion))
    return r.scalars().all()

@router.post("/simulaciones", response_model=SimulacionOut)
async def create_simulacion(data: SimulacionIn, db: AsyncSession = Depends(get_db)):
    obj = APSSimulacion(escenario_id=data.escenario_id, nombre=data.nombre, estado='EN_EJECUCION')
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/simulaciones/{sim_id}/resultados")
async def get_simulacion_resultados(sim_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(APSResultadoSimulacion).where(APSResultadoSimulacion.simulacion_id == sim_id)
    )
    return r.scalars().all()


# ─── Alertas ──────────────────────────────────────────────────────────────────

@router.get("/alertas", response_model=List[AlertaOut])
async def list_alertas(
    resuelta: Optional[bool] = None,
    nivel: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(APSAlerta)
    if resuelta is not None:
        q = q.where(APSAlerta.resuelta == resuelta)
    if nivel:
        from app.infrastructure.models.aps import NivelAlertaAPSEnum
        q = q.where(APSAlerta.nivel == NivelAlertaAPSEnum(nivel))
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/alertas", response_model=AlertaOut)
async def create_alerta(data: AlertaIn, db: AsyncSession = Depends(get_db)):
    from app.infrastructure.models.aps import TipoAlertaAPSEnum, NivelAlertaAPSEnum
    obj = APSAlerta(
        producto_id=data.producto_id,
        ubicacion_id=data.ubicacion_id,
        tipo=TipoAlertaAPSEnum(data.tipo),
        nivel=NivelAlertaAPSEnum(data.nivel),
        titulo=data.titulo,
        descripcion=data.descripcion,
        valor_actual=data.valor_actual,
        valor_umbral=data.valor_umbral,
        accion_recomendada=data.accion_recomendada,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.patch("/alertas/{id}/resolver")
async def resolver_alerta(id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSAlerta).where(APSAlerta.id == id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Alerta no encontrada")
    obj.resuelta = True
    await db.commit()
    return {"ok": True}


# ─── S&OP / IBP ───────────────────────────────────────────────────────────────

@router.get("/soip/ciclos", response_model=List[SOIPCicloOut])
async def list_ciclos(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSSOIPCiclo))
    return r.scalars().all()

@router.post("/soip/ciclos", response_model=SOIPCicloOut)
async def create_ciclo(data: SOIPCicloIn, db: AsyncSession = Depends(get_db)):
    obj = APSSOIPCiclo(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/soip/revisiones", response_model=List[SOIPRevisionOut])
async def list_revisiones(ciclo_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(APSSOIPRevision)
    if ciclo_id:
        q = q.where(APSSOIPRevision.ciclo_id == ciclo_id)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/soip/revisiones", response_model=SOIPRevisionOut)
async def create_revision(data: SOIPRevisionIn, db: AsyncSession = Depends(get_db)):
    obj = APSSOIPRevision(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Distribución ─────────────────────────────────────────────────────────────

@router.get("/distribucion", response_model=List[DistribucionOut])
async def list_distribucion(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSDistribucion))
    return r.scalars().all()

@router.post("/distribucion", response_model=DistribucionOut)
async def create_distribucion(data: DistribucionIn, db: AsyncSession = Depends(get_db)):
    obj = APSDistribucion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Transporte ───────────────────────────────────────────────────────────────

@router.get("/transporte")
async def list_transporte(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(APSTransporte))
    return r.scalars().all()

@router.post("/transporte")
async def create_transporte(
    plan_id: Optional[int],
    origen_id: int,
    destino_id: int,
    carga_kg: float,
    capacidad_kg: float = 30000.0,
    db: AsyncSession = Depends(get_db)
):
    pct = (carga_kg / capacidad_kg * 100) if capacidad_kg > 0 else 0
    obj = APSTransporte(
        plan_id=plan_id,
        origen_id=origen_id,
        destino_id=destino_id,
        carga_kg=carga_kg,
        capacidad_kg=capacidad_kg,
        pct_uso=pct,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── KPIs Diarios ─────────────────────────────────────────────────────────────

@router.get("/kpis/diarios", response_model=List[KPIDiarioOut])
async def list_kpis_diarios(
    ubicacion_id: Optional[int] = None,
    limit: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    q = select(APSKPIDiario).order_by(APSKPIDiario.fecha.desc()).limit(limit)
    if ubicacion_id:
        q = q.where(APSKPIDiario.ubicacion_id == ubicacion_id)
    r = await db.execute(q)
    return r.scalars().all()

@router.post("/kpis/diarios", response_model=KPIDiarioOut)
async def create_kpi_diario(data: KPIDiarioIn, db: AsyncSession = Depends(get_db)):
    obj = APSKPIDiario(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
