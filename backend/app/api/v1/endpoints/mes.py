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
    EstadoEjecucionMESEnum, ResultadoInspeccionMESEnum, EstadoLoteMESEnum,
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
    # Indicadores operativos (sobre registros reales)
    oee_prom = await db.scalar(select(func.avg(MESOEERegistro.oee)))
    producido = await db.scalar(select(func.sum(MESOrdenProduccion.cantidad_producida)))
    scrap_total = await db.scalar(select(func.sum(MESOrdenProduccion.cantidad_scrap)))
    paradas_abiertas = await db.scalar(
        select(func.count(MESParada.id)).where(MESParada.fecha_fin.is_(None))
    )
    insp_pendientes = await db.scalar(
        select(func.count(MESInspeccion.id)).where(
            MESInspeccion.resultado == ResultadoInspeccionMESEnum.PENDIENTE
        )
    )
    total_prod = (producido or 0) + (scrap_total or 0)
    return {
        'plantas': plantas or 0,
        'lineas': lineas or 0,
        'productos': productos or 0,
        'ordenes_activas': ordenes_activas or 0,
        'boms_vigentes': boms or 0,
        'operarios': operarios or 0,
        'oee_promedio': round(oee_prom, 1) if oee_prom else None,
        'unidades_producidas': producido or 0,
        'scrap_rate': round((scrap_total or 0) / total_prod * 100, 2) if total_prod > 0 else 0,
        'paradas_abiertas': paradas_abiertas or 0,
        'inspecciones_pendientes': insp_pendientes or 0,
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

# Máquina de estados (ISO 9001 §8.5.1 — control de producción): solo se admiten
# las transiciones del flujo controlado; todo lo demás responde 409.
TRANSICIONES_ORDEN: dict = {
    'PLANEADA':     {'LIBERADA', 'CANCELADA'},
    'LIBERADA':     {'EN_EJECUCION', 'PLANEADA', 'CANCELADA'},
    'EN_EJECUCION': {'SUSPENDIDA', 'CERRADA', 'CANCELADA'},
    'SUSPENDIDA':   {'EN_EJECUCION', 'CANCELADA'},
    'CERRADA':      set(),
    'CANCELADA':    set(),
}

async def _siguiente_numero_orden(db: AsyncSession) -> str:
    """Numeración controlada de órdenes: OP-YYYYMMDD-#### (consecutivo del día)."""
    hoy = datetime.utcnow().strftime('%Y%m%d')
    prefijo = f'OP-{hoy}-'
    r = await db.execute(
        select(func.count(MESOrdenProduccion.id)).where(MESOrdenProduccion.numero.like(f'{prefijo}%'))
    )
    return f'{prefijo}{(r.scalar() or 0) + 1:04d}'

@router.get('/ordenes/siguiente-numero')
async def get_siguiente_numero(db: AsyncSession = Depends(get_db)):
    return {'numero': await _siguiente_numero_orden(db)}

@router.get('/ordenes', response_model=List[OrdenResponse])
async def list_ordenes(estado: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(MESOrdenProduccion)
    if estado:
        q = q.where(MESOrdenProduccion.estado == estado)
    result = await db.execute(q.order_by(MESOrdenProduccion.created_at.desc()))
    return result.scalars().all()

@router.post('/ordenes', response_model=OrdenResponse, status_code=201)
async def create_orden(data: OrdenCreate, db: AsyncSession = Depends(get_db)):
    d = data.model_dump()
    if not d.get('numero'):
        d['numero'] = await _siguiente_numero_orden(db)
    if d['cantidad_planificada'] is None or d['cantidad_planificada'] <= 0:
        raise HTTPException(422, 'La cantidad planificada debe ser mayor que cero')
    producto = await db.get(MESProducto, d['producto_id'])
    if not producto:
        raise HTTPException(404, 'Producto no encontrado')
    obj = MESOrdenProduccion(**d)
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
    if estado not in EstadoOrdenProduccionEnum.__members__:
        raise HTTPException(422, f'Estado inválido: {estado}')
    actual = obj.estado.value if obj.estado else 'PLANEADA'
    if estado not in TRANSICIONES_ORDEN.get(actual, set()):
        raise HTTPException(409, f'Transición no permitida: {actual} → {estado}')
    # Cierre controlado: no se puede cerrar con ejecuciones abiertas
    if estado == 'CERRADA':
        abiertas = await db.scalar(
            select(func.count(MESEjecucion.id)).where(
                MESEjecucion.orden_id == orden_id,
                MESEjecucion.estado.in_([EstadoEjecucionMESEnum.PENDIENTE, EstadoEjecucionMESEnum.EN_PROGRESO, EstadoEjecucionMESEnum.PAUSADA]),
            )
        )
        if abiertas:
            raise HTTPException(409, f'No se puede cerrar: hay {abiertas} ejecución(es) abierta(s)')
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


class LoteEstado(BaseModel):
    estado: str                              # LIBERADO / BLOQUEADO / RECHAZADO / VENCIDO
    responsable_liberacion: Optional[str] = None
    observaciones: Optional[str] = None

@router.put('/lotes/{lote_id}/estado', response_model=LoteResponse)
async def cambiar_estado_lote(lote_id: int, data: LoteEstado, db: AsyncSession = Depends(get_db)):
    """Disposición del lote. LIBERADO exige responsable (ISO 9001 §8.6:
    la liberación requiere trazabilidad a la persona que autoriza)."""
    obj = await db.get(MESLote, lote_id)
    if not obj:
        raise HTTPException(404, 'Lote no encontrado')
    if data.estado not in EstadoLoteMESEnum.__members__:
        raise HTTPException(422, f'Estado inválido: {data.estado}')
    if obj.estado == EstadoLoteMESEnum.CONSUMIDO:
        raise HTTPException(409, 'El lote ya fue consumido')
    if data.estado == 'LIBERADO':
        if not data.responsable_liberacion:
            raise HTTPException(422, 'La liberación exige indicar el responsable que autoriza')
        # No se libera un lote con inspecciones rechazadas o pendientes de dictamen
        r = await db.execute(select(MESInspeccion).where(MESInspeccion.lote_id == lote_id))
        insps = r.scalars().all()
        if any(i.resultado == ResultadoInspeccionMESEnum.RECHAZADO for i in insps):
            raise HTTPException(409, 'El lote tiene inspecciones RECHAZADAS: no se puede liberar')
        if any(i.resultado == ResultadoInspeccionMESEnum.PENDIENTE for i in insps):
            raise HTTPException(409, 'El lote tiene inspecciones sin dictaminar: no se puede liberar')
        obj.fecha_liberacion = datetime.utcnow()
        obj.responsable_liberacion = data.responsable_liberacion
    obj.estado = EstadoLoteMESEnum[data.estado]
    if data.observaciones:
        obj.observaciones = data.observaciones
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Trazabilidad (expediente de lote — ISO 9001 §8.5.2) ─────────────────────

@router.get('/trazabilidad/lote/{lote_id}')
async def trazabilidad_lote(lote_id: int, db: AsyncSession = Depends(get_db)):
    """Expediente completo del lote: orden, ejecuciones, paradas, inspecciones
    (con defectos), scrap y consumos de material asociados."""
    lote = await db.get(MESLote, lote_id)
    if not lote:
        raise HTTPException(404, 'Lote no encontrado')
    out: dict = {
        'lote': {
            'id': lote.id, 'numero_lote': lote.numero_lote, 'estado': lote.estado.value,
            'cantidad': lote.cantidad, 'unidad_medida': lote.unidad_medida,
            'producto_id': lote.producto_id,
            'fecha_fabricacion': lote.fecha_fabricacion,
            'fecha_vencimiento': lote.fecha_vencimiento,
            'fecha_liberacion': lote.fecha_liberacion,
            'responsable_liberacion': lote.responsable_liberacion,
        },
        'orden': None, 'ejecuciones': [], 'paradas': [], 'inspecciones': [], 'scrap': [], 'consumos': [],
    }
    producto = await db.get(MESProducto, lote.producto_id)
    if producto:
        out['lote']['producto'] = {'codigo': producto.codigo, 'nombre': producto.nombre}
    if lote.orden_id:
        orden = await db.get(MESOrdenProduccion, lote.orden_id)
        if orden:
            out['orden'] = {
                'id': orden.id, 'numero': orden.numero, 'estado': orden.estado.value,
                'cantidad_planificada': orden.cantidad_planificada,
                'cantidad_producida': orden.cantidad_producida,
                'cantidad_scrap': orden.cantidad_scrap,
                'fecha_inicio_real': orden.fecha_inicio_real, 'fecha_fin_real': orden.fecha_fin_real,
                'linea_id': orden.linea_id,
            }
            r = await db.execute(select(MESEjecucion).where(MESEjecucion.orden_id == orden.id))
            ejecuciones = r.scalars().all()
            out['ejecuciones'] = [{
                'id': e.id, 'estado': e.estado.value, 'turno': e.turno.value,
                'operario_id': e.operario_id, 'equipo_id': e.equipo_id,
                'fecha_inicio': e.fecha_inicio, 'fecha_fin': e.fecha_fin,
                'cantidad_producida': e.cantidad_producida, 'cantidad_scrap': e.cantidad_scrap,
            } for e in ejecuciones]
            ids_ej = [e.id for e in ejecuciones]
            if ids_ej:
                r = await db.execute(select(MESParada).where(MESParada.ejecucion_id.in_(ids_ej)))
                out['paradas'] = [{
                    'id': p.id, 'ejecucion_id': p.ejecucion_id, 'tipo': p.tipo.value, 'causa': p.causa,
                    'fecha_inicio': p.fecha_inicio, 'fecha_fin': p.fecha_fin, 'duracion_min': p.duracion_min,
                } for p in r.scalars().all()]
            r = await db.execute(select(MESScrap).where(MESScrap.orden_id == orden.id))
            out['scrap'] = [{
                'id': s.id, 'tipo': s.tipo.value, 'causa': s.causa, 'cantidad': s.cantidad,
                'costo_total': s.costo_total, 'es_reprocesable': s.es_reprocesable,
                'fecha_registro': s.fecha_registro,
            } for s in r.scalars().all()]
            r = await db.execute(select(MESConsumoMaterial).where(MESConsumoMaterial.orden_id == orden.id))
            out['consumos'] = [{
                'id': c.id, 'producto_id': c.producto_id, 'lote_id': c.lote_id,
                'cantidad_plan': c.cantidad_plan, 'cantidad_real': c.cantidad_real,
                'fecha_consumo': c.fecha_consumo,
            } for c in r.scalars().all()]
    # Inspecciones directas del lote (incluye las de la orden si aplican al lote)
    r = await db.execute(select(MESInspeccion).where(
        (MESInspeccion.lote_id == lote_id) | (MESInspeccion.orden_id == (lote.orden_id or -1))
    ))
    insps = r.scalars().all()
    insp_out = []
    for i in insps:
        rd = await db.execute(select(MESDefecto).where(MESDefecto.inspeccion_id == i.id))
        insp_out.append({
            'id': i.id, 'tipo': i.tipo.value, 'resultado': i.resultado.value,
            'operario_id': i.operario_id, 'fecha_inspeccion': i.fecha_inspeccion,
            'muestra_tam': i.muestra_tam, 'muestra_defectos': i.muestra_defectos,
            'observaciones': i.observaciones,
            'defectos': [{
                'codigo_defecto': d.codigo_defecto, 'descripcion': d.descripcion,
                'cantidad': d.cantidad, 'causa_raiz': d.causa_raiz,
            } for d in rd.scalars().all()],
        })
    out['inspecciones'] = insp_out
    return out


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
    orden = await db.get(MESOrdenProduccion, data.orden_id)
    if not orden:
        raise HTTPException(404, 'Orden no encontrada')
    if orden.estado not in (EstadoOrdenProduccionEnum.LIBERADA, EstadoOrdenProduccionEnum.EN_EJECUCION):
        raise HTTPException(409, f'La orden está {orden.estado.value}: debe estar LIBERADA o EN_EJECUCION para registrar ejecuciones')
    obj = MESEjecucion(**data.model_dump(), fecha_inicio=datetime.utcnow(), estado='EN_PROGRESO')
    # Iniciar la primera ejecución pone la orden EN_EJECUCION automáticamente
    if orden.estado == EstadoOrdenProduccionEnum.LIBERADA:
        orden.estado = EstadoOrdenProduccionEnum.EN_EJECUCION
        if not orden.fecha_inicio_real:
            orden.fecha_inicio_real = datetime.utcnow()
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


class EjecucionCierre(BaseModel):
    cantidad_producida: float
    cantidad_scrap: float = 0.0
    observaciones: Optional[str] = None

@router.put('/ejecuciones/{ejecucion_id}/cerrar', response_model=EjecucionResponse)
async def cerrar_ejecucion(ejecucion_id: int, data: EjecucionCierre, db: AsyncSession = Depends(get_db)):
    """Cierra la ejecución con las cantidades reportadas y las acumula en la orden
    (registro de producción trazable — ISO 9001 §8.5.2)."""
    obj = await db.get(MESEjecucion, ejecucion_id)
    if not obj:
        raise HTTPException(404, 'Ejecución no encontrada')
    if obj.estado in (EstadoEjecucionMESEnum.COMPLETADA, EstadoEjecucionMESEnum.CANCELADA):
        raise HTTPException(409, f'La ejecución ya está {obj.estado.value}')
    if data.cantidad_producida < 0 or data.cantidad_scrap < 0:
        raise HTTPException(422, 'Las cantidades no pueden ser negativas')
    # Paradas abiertas se cierran junto con la ejecución
    r = await db.execute(select(MESParada).where(MESParada.ejecucion_id == ejecucion_id, MESParada.fecha_fin.is_(None)))
    ahora = datetime.utcnow()
    for p in r.scalars().all():
        p.fecha_fin = ahora
        if p.fecha_inicio:
            p.duracion_min = round((ahora - p.fecha_inicio.replace(tzinfo=None)).total_seconds() / 60, 1)
    obj.cantidad_producida = data.cantidad_producida
    obj.cantidad_scrap = data.cantidad_scrap
    obj.observaciones = data.observaciones or obj.observaciones
    obj.fecha_fin = ahora
    obj.estado = EstadoEjecucionMESEnum.COMPLETADA
    orden = await db.get(MESOrdenProduccion, obj.orden_id)
    if orden:
        orden.cantidad_producida = (orden.cantidad_producida or 0) + data.cantidad_producida
        orden.cantidad_scrap = (orden.cantidad_scrap or 0) + data.cantidad_scrap
    await db.commit()
    await db.refresh(obj)
    return obj


# ─── Paradas ─────────────────────────────────────────────────────────────────

class ParadaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; ejecucion_id: int; tipo: str; causa: str
    descripcion: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    duracion_min: Optional[float] = None

@router.get('/paradas', response_model=List[ParadaResponse])
async def list_paradas(
    ejecucion_id: Optional[int] = None,
    abiertas: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(MESParada)
    if ejecucion_id:
        q = q.where(MESParada.ejecucion_id == ejecucion_id)
    if abiertas:
        q = q.where(MESParada.fecha_fin.is_(None))
    result = await db.execute(q.order_by(MESParada.fecha_inicio.desc()))
    return result.scalars().all()

@router.post('/paradas', response_model=ParadaResponse, status_code=201)
async def create_parada(data: ParadaCreate, db: AsyncSession = Depends(get_db)):
    ej = await db.get(MESEjecucion, data.ejecucion_id)
    if not ej:
        raise HTTPException(404, 'Ejecución no encontrada')
    if ej.estado in (EstadoEjecucionMESEnum.COMPLETADA, EstadoEjecucionMESEnum.CANCELADA):
        raise HTTPException(409, 'No se pueden registrar paradas en una ejecución cerrada')
    obj = MESParada(**data.model_dump(), fecha_inicio=datetime.utcnow())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put('/paradas/{parada_id}/cerrar', response_model=ParadaResponse)
async def cerrar_parada(parada_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(MESParada, parada_id)
    if not obj:
        raise HTTPException(404, 'Parada no encontrada')
    if obj.fecha_fin:
        raise HTTPException(409, 'La parada ya está cerrada')
    obj.fecha_fin = datetime.utcnow()
    if obj.fecha_inicio:
        obj.duracion_min = round((obj.fecha_fin - obj.fecha_inicio.replace(tzinfo=None)).total_seconds() / 60, 1)
    await db.commit()
    await db.refresh(obj)
    return obj


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
    if not await db.get(MESOrdenProduccion, data.orden_id):
        raise HTTPException(404, 'Orden no encontrada')
    if not await db.get(MESOperario, data.operario_id):
        raise HTTPException(404, 'Operario (inspector) no encontrado')
    obj = MESInspeccion(**data.model_dump(), fecha_inspeccion=datetime.utcnow())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


class InspeccionResultado(BaseModel):
    resultado: str                      # APROBADO / RECHAZADO / CONDICIONAL
    muestra_defectos: Optional[int] = None
    observaciones: Optional[str] = None

@router.put('/inspecciones/{insp_id}/resultado', response_model=InspeccionResponse)
async def registrar_resultado_inspeccion(insp_id: int, data: InspeccionResultado, db: AsyncSession = Depends(get_db)):
    """Dictamina la inspección (registro de calidad — ISO 9001 §8.6 liberación)."""
    obj = await db.get(MESInspeccion, insp_id)
    if not obj:
        raise HTTPException(404, 'Inspección no encontrada')
    if data.resultado not in ResultadoInspeccionMESEnum.__members__ or data.resultado == 'PENDIENTE':
        raise HTTPException(422, f'Resultado inválido: {data.resultado}')
    if obj.resultado != ResultadoInspeccionMESEnum.PENDIENTE:
        raise HTTPException(409, f'La inspección ya fue dictaminada: {obj.resultado.value}')
    obj.resultado = ResultadoInspeccionMESEnum[data.resultado]
    if data.muestra_defectos is not None:
        obj.muestra_defectos = data.muestra_defectos
    if data.observaciones:
        obj.observaciones = data.observaciones
    # Una inspección RECHAZADA sobre un lote lo bloquea automáticamente
    if data.resultado == 'RECHAZADO' and obj.lote_id:
        lote = await db.get(MESLote, obj.lote_id)
        if lote and lote.estado not in (EstadoLoteMESEnum.CONSUMIDO,):
            lote.estado = EstadoLoteMESEnum.BLOQUEADO
    await db.commit()
    await db.refresh(obj)
    return obj


class DefectoCreate(BaseModel):
    codigo_defecto: str
    descripcion: str
    cantidad: int = 1
    ubicacion: Optional[str] = None
    causa_raiz: Optional[str] = None

class DefectoResponse(DefectoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    inspeccion_id: int

@router.get('/inspecciones/{insp_id}/defectos', response_model=List[DefectoResponse])
async def list_defectos(insp_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(MESDefecto).where(MESDefecto.inspeccion_id == insp_id))
    return r.scalars().all()

@router.post('/inspecciones/{insp_id}/defectos', response_model=DefectoResponse, status_code=201)
async def create_defecto(insp_id: int, data: DefectoCreate, db: AsyncSession = Depends(get_db)):
    insp = await db.get(MESInspeccion, insp_id)
    if not insp:
        raise HTTPException(404, 'Inspección no encontrada')
    obj = MESDefecto(inspeccion_id=insp_id, **data.model_dump())
    insp.muestra_defectos = (insp.muestra_defectos or 0) + data.cantidad
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
