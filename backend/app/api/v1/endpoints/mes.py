from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.infrastructure.models.mes import (
    MESPlanta, MESLinea, MESTurno, MESCeldaTrabajo, MESEquipo,
    MESOperario, MESCertificacion, MESProducto, MESBOM, MESBOMDetalle,
    MESReceta, MESRecetaDetalle, MESOperacion, MESOrdenProduccion,
    MESOrdenOperacion, MESLote, MESEjecucion, MESParada,
    MESConsumoMaterial, MESWIP, MESInspeccion, MESDefecto,
    MESScrap, MESOEERegistro, MESChecklistPlantilla, MESChecklistPregunta,
    MESChecklistEjecucion, MESKPIDiario,
    EstadoOrdenProduccionEnum, PrioridadOrdenMESEnum,
)

router = APIRouter(prefix='/mes', tags=['MES'])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class PlantaCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    tipo_fabricacion: str = 'DISCRETA'

class PlantaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; codigo: str; nombre: str; tipo_fabricacion: str
    ciudad: Optional[str] = None; activo: bool

class LineaCreate(BaseModel):
    planta_id: int
    codigo: str
    nombre: str
    capacidad_hora: Optional[float] = None
    unidad_medida: Optional[str] = None

class LineaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; planta_id: int; codigo: str; nombre: str; activo: bool
    capacidad_hora: Optional[float] = None

class TurnoCreate(BaseModel):
    planta_id: int
    nombre: str
    tipo: str = 'MANANA'
    hora_inicio: str
    hora_fin: str
    duracion_horas: float = 8.0

class TurnoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; planta_id: int; nombre: str; tipo: str
    hora_inicio: str; hora_fin: str; duracion_horas: float; activo: bool

class EquipoCreate(BaseModel):
    celda_id: Optional[int] = None
    codigo: str
    nombre: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    capacidad_hora: Optional[float] = None

class EquipoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; codigo: str; nombre: str; activo: bool
    celda_id: Optional[int] = None
    capacidad_hora: Optional[float] = None

class OperarioCreate(BaseModel):
    codigo: str
    nombre: str
    cedula: Optional[str] = None
    cargo: Optional[str] = None
    planta_id: Optional[int] = None

class OperarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; codigo: str; nombre: str; activo: bool
    cargo: Optional[str] = None; planta_id: Optional[int] = None

class ProductoCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: str = 'PRODUCTO_TERMINADO'
    unidad_medida: str = 'UN'
    descripcion: Optional[str] = None
    requiere_lote: bool = True

class ProductoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; codigo: str; nombre: str; tipo: str; unidad_medida: str; activo: bool

class BOMCreate(BaseModel):
    producto_id: int
    version: str = '1.0'
    tipo: str = 'SIMPLE'
    descripcion: Optional[str] = None
    vigente: bool = True

class BOMResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; producto_id: int; version: str; tipo: str; vigente: bool

class BOMDetalleCreate(BaseModel):
    bom_id: int
    componente_id: int
    nivel: int = 1
    cantidad: float
    unidad_medida: str = 'UN'
    merma_pct: float = 0.0

class BOMDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; bom_id: int; componente_id: int; cantidad: float
    unidad_medida: str; merma_pct: float; nivel: int

class RecetaCreate(BaseModel):
    producto_id: int
    version: str = '1.0'
    nombre: str
    rendimiento_pct: float = 100.0
    tiempo_proceso_min: Optional[float] = None
    vigente: bool = True

class RecetaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; producto_id: int; version: str; nombre: str
    rendimiento_pct: float; vigente: bool

class OrdenCreate(BaseModel):
    numero: str
    producto_id: int
    linea_id: Optional[int] = None
    bom_id: Optional[int] = None
    receta_id: Optional[int] = None
    cantidad_planificada: float
    prioridad: str = 'NORMAL'
    fecha_inicio_plan: Optional[datetime] = None
    fecha_fin_plan: Optional[datetime] = None

class OrdenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; numero: str; producto_id: int; estado: str; prioridad: str
    cantidad_planificada: float; cantidad_producida: float; cantidad_scrap: float
    linea_id: Optional[int] = None

class LoteCreate(BaseModel):
    numero_lote: str
    orden_id: Optional[int] = None
    producto_id: int
    cantidad: float
    unidad_medida: str = 'UN'
    fecha_fabricacion: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None

class LoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; numero_lote: str; producto_id: int; estado: str
    cantidad: float; unidad_medida: str

class EjecucionCreate(BaseModel):
    orden_id: int
    operario_id: Optional[int] = None
    equipo_id: Optional[int] = None
    turno: str = 'MANANA'

class EjecucionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; orden_id: int; estado: str; turno: str
    cantidad_producida: float; cantidad_scrap: float

class ParadaCreate(BaseModel):
    ejecucion_id: int
    tipo: str
    causa: str
    descripcion: Optional[str] = None
    equipo_id: Optional[int] = None

class InspeccionCreate(BaseModel):
    orden_id: int
    tipo: str
    operario_id: int
    lote_id: Optional[int] = None
    muestra_tam: Optional[int] = None

class InspeccionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; orden_id: int; tipo: str; resultado: str; operario_id: int
    muestra_tam: Optional[int] = None; muestra_defectos: int

class ScrapCreate(BaseModel):
    orden_id: int
    producto_id: int
    tipo: str = 'NORMAL'
    causa: str
    cantidad: float
    unidad_medida: str = 'UN'
    costo_unitario: Optional[float] = None
    es_reprocesable: bool = False

class ScrapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; orden_id: int; tipo: str; causa: str; cantidad: float
    costo_total: Optional[float] = None; es_reprocesable: bool

class OEECreate(BaseModel):
    linea_id: int
    equipo_id: Optional[int] = None
    turno: str = 'MANANA'
    tiempo_planificado_min: float
    tiempo_paradas_min: float = 0.0
    tiempo_operativo_min: float
    produccion_real: float
    produccion_nominal: float
    produccion_buena: float

class OEEResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; linea_id: int; turno: str
    disponibilidad: Optional[float] = None
    rendimiento: Optional[float] = None
    calidad: Optional[float] = None
    oee: Optional[float] = None


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get('/dashboard/kpis')
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    plantas = await db.scalar(select(func.count(MESPlanta.id)).where(MESPlanta.activo == True))
    lineas  = await db.scalar(select(func.count(MESLinea.id)).where(MESLinea.activo == True))
    productos = await db.scalar(select(func.count(MESProducto.id)).where(MESProducto.activo == True))
    ordenes_activas = await db.scalar(
        select(func.count(MESOrdenProduccion.id)).where(
            MESOrdenProduccion.estado.in_([
                EstadoOrdenProduccionEnum.LIBERADA,
                EstadoOrdenProduccionEnum.EN_EJECUCION,
            ])
        )
    )
    boms = await db.scalar(select(func.count(MESBOM.id)).where(MESBOM.vigente == True))
    operarios = await db.scalar(select(func.count(MESOperario.id)).where(MESOperario.activo == True))
    return {
        'plantas': plantas or 0,
        'lineas': lineas or 0,
        'productos': productos or 0,
        'ordenes_activas': ordenes_activas or 0,
        'boms_vigentes': boms or 0,
        'operarios': operarios or 0,
    }


# ─── Plantas ─────────────────────────────────────────────────────────────────

@router.get('/plantas', response_model=List[PlantaResponse])
async def list_plantas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESPlanta).where(MESPlanta.activo == True))
    return result.scalars().all()

@router.post('/plantas', response_model=PlantaResponse, status_code=201)
async def create_planta(data: PlantaCreate, db: AsyncSession = Depends(get_db)):
    obj = MESPlanta(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Líneas ──────────────────────────────────────────────────────────────────

@router.get('/lineas', response_model=List[LineaResponse])
async def list_lineas(planta_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESLinea).where(MESLinea.activo == True)
    if planta_id:
        q = q.where(MESLinea.planta_id == planta_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post('/lineas', response_model=LineaResponse, status_code=201)
async def create_linea(data: LineaCreate, db: AsyncSession = Depends(get_db)):
    obj = MESLinea(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Turnos ──────────────────────────────────────────────────────────────────

@router.get('/turnos', response_model=List[TurnoResponse])
async def list_turnos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESTurno).where(MESTurno.activo == True))
    return result.scalars().all()

@router.post('/turnos', response_model=TurnoResponse, status_code=201)
async def create_turno(data: TurnoCreate, db: AsyncSession = Depends(get_db)):
    obj = MESTurno(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Equipos ─────────────────────────────────────────────────────────────────

@router.get('/equipos', response_model=List[EquipoResponse])
async def list_equipos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESEquipo).where(MESEquipo.activo == True))
    return result.scalars().all()

@router.post('/equipos', response_model=EquipoResponse, status_code=201)
async def create_equipo(data: EquipoCreate, db: AsyncSession = Depends(get_db)):
    obj = MESEquipo(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Operarios ───────────────────────────────────────────────────────────────

@router.get('/operarios', response_model=List[OperarioResponse])
async def list_operarios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESOperario).where(MESOperario.activo == True))
    return result.scalars().all()

@router.post('/operarios', response_model=OperarioResponse, status_code=201)
async def create_operario(data: OperarioCreate, db: AsyncSession = Depends(get_db)):
    obj = MESOperario(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Productos ───────────────────────────────────────────────────────────────

@router.get('/productos', response_model=List[ProductoResponse])
async def list_productos(tipo: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESProducto).where(MESProducto.activo == True)
    if tipo:
        q = q.where(MESProducto.tipo == tipo)
    result = await db.execute(q)
    return result.scalars().all()

@router.post('/productos', response_model=ProductoResponse, status_code=201)
async def create_producto(data: ProductoCreate, db: AsyncSession = Depends(get_db)):
    obj = MESProducto(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── BOM ─────────────────────────────────────────────────────────────────────

@router.get('/bom', response_model=List[BOMResponse])
async def list_bom(producto_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESBOM).where(MESBOM.vigente == True)
    if producto_id:
        q = q.where(MESBOM.producto_id == producto_id)
    result = await db.execute(q)
    return result.scalars().all()

@router.post('/bom', response_model=BOMResponse, status_code=201)
async def create_bom(data: BOMCreate, db: AsyncSession = Depends(get_db)):
    obj = MESBOM(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get('/bom/{bom_id}/detalles', response_model=List[BOMDetalleResponse])
async def get_bom_detalles(bom_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESBOMDetalle).where(MESBOMDetalle.bom_id == bom_id))
    return result.scalars().all()

@router.post('/bom/{bom_id}/detalles', response_model=BOMDetalleResponse, status_code=201)
async def add_bom_detalle(bom_id: int, data: BOMDetalleCreate, db: AsyncSession = Depends(get_db)):
    obj = MESBOMDetalle(**{**data.model_dump(), 'bom_id': bom_id})
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Recetas ─────────────────────────────────────────────────────────────────

@router.get('/recetas', response_model=List[RecetaResponse])
async def list_recetas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESReceta).where(MESReceta.vigente == True))
    return result.scalars().all()

@router.post('/recetas', response_model=RecetaResponse, status_code=201)
async def create_receta(data: RecetaCreate, db: AsyncSession = Depends(get_db)):
    obj = MESReceta(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Órdenes de Producción ───────────────────────────────────────────────────

@router.get('/ordenes', response_model=List[OrdenResponse])
async def list_ordenes(estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESOrdenProduccion)
    if estado:
        q = q.where(MESOrdenProduccion.estado == estado)
    result = await db.execute(q.order_by(MESOrdenProduccion.created_at.desc()))
    return result.scalars().all()

@router.post('/ordenes', response_model=OrdenResponse, status_code=201)
async def create_orden(data: OrdenCreate, db: AsyncSession = Depends(get_db)):
    obj = MESOrdenProduccion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get('/ordenes/{orden_id}', response_model=OrdenResponse)
async def get_orden(orden_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(MESOrdenProduccion, orden_id)
    if not obj:
        raise HTTPException(404, 'Orden no encontrada')
    return obj

@router.put('/ordenes/{orden_id}/estado')
async def update_orden_estado(orden_id: int, estado: str, db: AsyncSession = Depends(get_db)):
    obj = await db.get(MESOrdenProduccion, orden_id)
    if not obj:
        raise HTTPException(404, 'Orden no encontrada')
    obj.estado = EstadoOrdenProduccionEnum[estado]
    if estado == 'EN_EJECUCION' and not obj.fecha_inicio_real:
        obj.fecha_inicio_real = datetime.utcnow()
    if estado in ('CERRADA', 'CANCELADA') and not obj.fecha_fin_real:
        obj.fecha_fin_real = datetime.utcnow()
    await db.commit()
    return {'ok': True, 'estado': estado}


# ─── Lotes ───────────────────────────────────────────────────────────────────

@router.get('/lotes', response_model=List[LoteResponse])
async def list_lotes(producto_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESLote)
    if producto_id:
        q = q.where(MESLote.producto_id == producto_id)
    result = await db.execute(q.order_by(MESLote.created_at.desc()))
    return result.scalars().all()

@router.post('/lotes', response_model=LoteResponse, status_code=201)
async def create_lote(data: LoteCreate, db: AsyncSession = Depends(get_db)):
    obj = MESLote(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Ejecucion ───────────────────────────────────────────────────────────────

@router.get('/ejecuciones', response_model=List[EjecucionResponse])
async def list_ejecuciones(orden_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESEjecucion)
    if orden_id:
        q = q.where(MESEjecucion.orden_id == orden_id)
    result = await db.execute(q.order_by(MESEjecucion.created_at.desc()))
    return result.scalars().all()

@router.post('/ejecuciones', response_model=EjecucionResponse, status_code=201)
async def create_ejecucion(data: EjecucionCreate, db: AsyncSession = Depends(get_db)):
    obj = MESEjecucion(**data.model_dump(), fecha_inicio=datetime.utcnow(), estado='EN_PROGRESO')
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Paradas ─────────────────────────────────────────────────────────────────

@router.post('/paradas', status_code=201)
async def create_parada(data: ParadaCreate, db: AsyncSession = Depends(get_db)):
    obj = MESParada(**data.model_dump(), fecha_inicio=datetime.utcnow())
    db.add(obj)
    await db.commit()
    return {'ok': True, 'id': obj.id}


# ─── Inspecciones ────────────────────────────────────────────────────────────

@router.get('/inspecciones', response_model=List[InspeccionResponse])
async def list_inspecciones(orden_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESInspeccion)
    if orden_id:
        q = q.where(MESInspeccion.orden_id == orden_id)
    result = await db.execute(q.order_by(MESInspeccion.created_at.desc()))
    return result.scalars().all()

@router.post('/inspecciones', response_model=InspeccionResponse, status_code=201)
async def create_inspeccion(data: InspeccionCreate, db: AsyncSession = Depends(get_db)):
    obj = MESInspeccion(**data.model_dump(), fecha_inspeccion=datetime.utcnow())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Scrap ───────────────────────────────────────────────────────────────────

@router.get('/scrap', response_model=List[ScrapResponse])
async def list_scrap(orden_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESScrap)
    if orden_id:
        q = q.where(MESScrap.orden_id == orden_id)
    result = await db.execute(q.order_by(MESScrap.created_at.desc()))
    return result.scalars().all()

@router.post('/scrap', response_model=ScrapResponse, status_code=201)
async def create_scrap(data: ScrapCreate, db: AsyncSession = Depends(get_db)):
    d = data.model_dump()
    if d.get('costo_unitario') and d.get('cantidad'):
        d['costo_total'] = d['costo_unitario'] * d['cantidad']
    d['fecha_registro'] = datetime.utcnow()
    obj = MESScrap(**d)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── OEE ─────────────────────────────────────────────────────────────────────

@router.get('/oee', response_model=List[OEEResponse])
async def list_oee(linea_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESOEERegistro)
    if linea_id:
        q = q.where(MESOEERegistro.linea_id == linea_id)
    result = await db.execute(q.order_by(MESOEERegistro.created_at.desc()))
    return result.scalars().all()

@router.post('/oee', response_model=OEEResponse, status_code=201)
async def create_oee(data: OEECreate, db: AsyncSession = Depends(get_db)):
    d = data.model_dump()
    tp = d['tiempo_planificado_min']
    to = d['tiempo_operativo_min']
    pn = d['produccion_nominal']
    pr = d['produccion_real']
    pb = d['produccion_buena']
    disp = (to / tp * 100) if tp > 0 else 0
    rend = (pr / pn * 100) if pn > 0 else 0
    cal  = (pb / pr * 100) if pr > 0 else 0
    oee  = (disp * rend * cal / 10000)
    d.update({'disponibilidad': round(disp, 2), 'rendimiento': round(rend, 2),
              'calidad': round(cal, 2), 'oee': round(oee, 2),
              'fecha': datetime.utcnow()})
    obj = MESOEERegistro(**d)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Checklists ──────────────────────────────────────────────────────────────

@router.get('/checklists/plantillas')
async def list_checklist_plantillas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESChecklistPlantilla).where(MESChecklistPlantilla.activo == True))
    return result.scalars().all()

@router.post('/checklists/plantillas', status_code=201)
async def create_checklist_plantilla(nombre: str, aplica_a: str = 'ORDEN', db: AsyncSession = Depends(get_db)):
    obj = MESChecklistPlantilla(nombre=nombre, aplica_a=aplica_a)
    db.add(obj)
    await db.commit()
    return {'ok': True, 'id': obj.id}

@router.post('/checklists/ejecuciones', status_code=201)
async def create_checklist_ejecucion(
    orden_id: int, plantilla_id: int, operario_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    obj = MESChecklistEjecucion(
        orden_id=orden_id, plantilla_id=plantilla_id,
        operario_id=operario_id, fecha=datetime.utcnow()
    )
    db.add(obj)
    await db.commit()
    return {'ok': True, 'id': obj.id}


# ─── KPIs ────────────────────────────────────────────────────────────────────

@router.get('/kpis/diarios')
async def get_kpis_diarios(limit: int = 30, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MESKPIDiario).order_by(MESKPIDiario.fecha.desc()).limit(limit))
    return result.scalars().all()
