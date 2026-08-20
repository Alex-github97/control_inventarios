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
    EAMBodegaNeumatico, EAMDanoNeumaticoCatalogo, EAMNeumaticoCatalogo, EAMActivo,
    EAMInspeccionNeumatico, EAMReencaucheLote, EAMReencaucheDetalle, EAMNeumaticoConfig,
    EAMRegistroCombustible, EAMGarantia, EAMFMEA,
    EAMCalibracion, EAMKPIDiario,
    EAMZonaNeumatico, EAMBandaReencauche, EAMMotivoFinVida,
    EAMAjusteNeumaticoCatalogo, EAMAjusteNeumatico,
    EAMEsquemaVehiculo, EAMEsquemaAsignacion,
    EAMTrabajoNeumatico, EAMPeriodicidadTrabajoNeumatico, EAMTrabajoRealizadoNeumatico,
    EAMReesculturado, EAMVidaNeumatico,
    EAMCongeladoNeumatico, EAMCongeladoDetalleNeumatico,
    EAMTipoActivo,
    EAMMarcaNeumatico, EAMDimensionNeumatico, EAMReferenciaNeumatico, EAMReferenciaDimension,
)
from app.infrastructure.models.tms import TMSVehiculo
from app.infrastructure.models.flota import FlotaVehiculo
from sqlalchemy.orm import selectinload

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
    layout_llantas: Optional[List[int]] = None
    tiene_repuesto: Optional[bool] = True
    cantidad_repuestos: Optional[int] = 1
    motor_marca: Optional[str] = None
    motor_linea: Optional[str] = None
    motor_cc: Optional[float] = None

class ActivoResponse(ActivoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool
    origen: Optional[str] = "EAM"
    origen_id: Optional[int] = None

class TipoActivoCreate(BaseModel):
    codigo: str
    nombre: str
    usa_llantas: Optional[bool] = False

class TipoActivoResponse(TipoActivoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class VehiculoCombinadoResponse(BaseModel):
    origen: str            # EAM | TMS | FLOTA
    flota: str             # PROPIA | EXTERNA
    id: int                # id en la tabla de origen (eam_activo.id si origen=EAM)
    activo_id: Optional[int] = None   # eam_activo.id ya vinculado, si existe (permite usarlo en Neumáticos sin re-vincular)
    codigo: Optional[str] = None      # código del activo EAM (identifica los que no tienen placa)
    nombre: Optional[str] = None
    placa: Optional[str] = None
    tipo: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    numero_ejes: Optional[int] = None
    layout_llantas: Optional[List[int]] = None   # llantas por eje ya asignadas al activo
    tiene_repuesto: Optional[bool] = None
    capacidad_kg: Optional[float] = None
    estado: Optional[str] = None
    motor_marca: Optional[str] = None
    motor_linea: Optional[str] = None
    motor_cc: Optional[float] = None
    propietario: Optional[str] = None

class VincularExternoRequest(BaseModel):
    origen: str      # TMS | FLOTA
    origen_id: int

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
    tipo_uso: Optional[str] = None            # DIRECCIONAL/TRACCION/REMOLQUE/MULTIPOSICION/REPUESTO
    presion_recomendada: Optional[float] = None
    zona_id: Optional[int] = None
    dot: Optional[str] = None
    tipo_rin: Optional[str] = None
    # Vida con la que entra: VN (vida nueva) o R{n} (n-esimo reencauche).
    # `reencauches` = 0 -> VN; 1..n -> R1..Rn
    reencauches: Optional[int] = 0
    # Llanta que ingresa ya usada: se toman su profundidad y kilometraje reales
    es_usada: Optional[bool] = False
    km_actual: Optional[float] = None

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
    tipo_uso: Optional[str] = None
    presion_recomendada: Optional[float] = None
    zona_id: Optional[int] = None
    motivo_fin_vida_id: Optional[int] = None
    dot: Optional[str] = None
    tipo_rin: Optional[str] = None

class NeumaticResponse(NeumaticCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    km_inicio: float
    km_actual: float
    km_total: float
    reencauches: int
    dano_id: Optional[int] = None
    motivo_baja: Optional[str] = None
    motivo_fin_vida_id: Optional[int] = None
    fecha_baja: Optional[date] = None
    presion_actual: Optional[float] = None
    orientacion: Optional[str] = None
    profundidad_externa: Optional[float] = None
    profundidad_interna: Optional[float] = None

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
    motivo_fin_vida_id: Optional[int] = None   # para BAJA (catálogo estructurado)
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
    numero: Optional[int] = None

# ── Catálogo de atributos de neumático (marca/medida/referencia/vida) ──
class CatalogoNeuCreate(BaseModel):
    tipo: str                 # MARCA / MEDIDA / REFERENCIA / VIDA
    nombre: str
    valor: Optional[float] = None
    activo: bool = True

class CatalogoNeuResponse(CatalogoNeuCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Inspecciones ──
class InspeccionNeuCreate(BaseModel):
    fecha: datetime
    profundidad_izq: Optional[float] = None
    profundidad_centro: Optional[float] = None
    profundidad_der: Optional[float] = None
    presion_psi: Optional[float] = None
    km_odometro: Optional[float] = None
    posicion: Optional[str] = None
    estado_visual: Optional[str] = None      # BUENO/REGULAR/CRITICO
    observaciones: Optional[str] = None
    tecnico: Optional[str] = None

class InspeccionNeuResponse(InspeccionNeuCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    neumatico_id: int
    profundidad_min: Optional[float] = None

# ── Reencauche ──
class ReencaucheLoteCreate(BaseModel):
    codigo: str
    fecha_envio: date
    proveedor: Optional[str] = None
    remision: Optional[str] = None
    observaciones: Optional[str] = None

class ReencaucheLoteResponse(ReencaucheLoteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str

class ReencaucheDetalleCreate(BaseModel):
    neumatico_id: int
    banda: Optional[str] = None       # legacy: texto libre si no viene del catálogo
    banda_id: Optional[int] = None

class ReencaucheDetalleUpdate(BaseModel):
    resultado: str                # REENCAUCHADA/REMANENTE/RECHAZO
    profundidad_nueva: Optional[float] = None
    vida_remanente_km: Optional[float] = None
    costo: Optional[float] = None
    dano_id: Optional[int] = None    # requerido si RECHAZO
    motivo_fin_vida_id: Optional[int] = None   # requerido si RECHAZO

class ReencaucheDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lote_id: int
    neumatico_id: int
    banda: Optional[str] = None
    banda_id: Optional[int] = None
    resultado: str
    profundidad_nueva: Optional[float] = None
    vida_remanente_km: Optional[float] = None
    costo: Optional[float] = None

# ── Configuración global ──
class NeuConfigSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    montaje_estricto: bool = True
    profundidad_minima: float = 3.0
    presion_min: float = 90.0
    presion_max: float = 120.0
    umbral_desalineacion: float = 2.0

# ── Zonas de llantas ──
class ZonaNeumaticoCreate(BaseModel):
    codigo: str
    nombre: str
    activo: bool = True

class ZonaNeumaticoResponse(ZonaNeumaticoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Bandas de reencauche ──
class BandaReencaucheCreate(BaseModel):
    marca: str
    referencia: Optional[str] = None
    dimension: Optional[str] = None
    profundidad_original: Optional[float] = None
    profundidad_minima: Optional[float] = None
    tipo_posicion: Optional[str] = None
    sentido_rotacion: Optional[str] = None
    reesculturable: bool = False
    costo_defecto: Optional[float] = None
    presion_minima: Optional[float] = None
    presion_maxima: Optional[float] = None
    comentarios: Optional[str] = None
    activo: bool = True

class BandaReencaucheResponse(BandaReencaucheCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Motivos de fin de vida ──
class MotivoFinVidaCreate(BaseModel):
    nombre: str
    aplica_descarte: bool = True
    aplica_fin_vida: bool = True
    activo: bool = True

class MotivoFinVidaResponse(MotivoFinVidaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Ajustes de valor ──
class AjusteNeuCatalogoCreate(BaseModel):
    nombre: str
    activo: bool = True

class AjusteNeuCatalogoResponse(AjusteNeuCatalogoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class AjusteNeuCreate(BaseModel):
    motivo_id: int
    fecha: date
    valor: float
    comentarios: Optional[str] = None

class AjusteNeuResponse(AjusteNeuCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    neumatico_id: int

# ── Esquemas de vehículo ──
class EsquemaVehiculoCreate(BaseModel):
    codigo: Optional[str] = None
    nombre: str
    tipo_activo: Optional[str] = None
    numero_ejes: int = 2
    layout: Optional[List[int]] = None   # llantas por eje, en orden; None = patrón clásico
    tiene_repuesto: bool = True
    cantidad_repuestos: int = 1
    observaciones: Optional[str] = None
    activo: bool = True

class EsquemaVehiculoResponse(EsquemaVehiculoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class EsquemaAsignacionCreate(BaseModel):
    activo_id: int
    esquema_id: int
    fecha_vigencia: date
    observaciones: Optional[str] = None

class EsquemaAsignacionResponse(EsquemaAsignacionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ── Trabajos y periodicidad ──
class TrabajoNeumaticoCreate(BaseModel):
    nombre: str
    observaciones: Optional[str] = None
    es_predeterminado: bool = False
    activo: bool = True

class TrabajoNeumaticoResponse(TrabajoNeumaticoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class PeriodicidadTrabajoCreate(BaseModel):
    trabajo_id: int
    tipo_activo: Optional[str] = None
    valor: float
    unidad: str = "KILOMETROS"
    activo: bool = True

class PeriodicidadTrabajoResponse(PeriodicidadTrabajoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class TrabajoRealizadoCreate(BaseModel):
    trabajo_id: int
    fecha: datetime
    km_odometro: Optional[float] = None
    cantidad: int = 1
    costo_unitario: Optional[float] = None
    proveedor: Optional[str] = None
    observaciones: Optional[str] = None

class TrabajoRealizadoResponse(TrabajoRealizadoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    neumatico_id: int

# ── Reesculturado (re-grooving) ──
class ReesculturadoCreate(BaseModel):
    fecha: datetime
    km_odometro: Optional[float] = None
    proveedor: Optional[str] = None
    costo: Optional[float] = None
    profundidad_nueva: float

class ReesculturadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    neumatico_id: int
    fecha: datetime
    km_odometro: Optional[float] = None
    proveedor: Optional[str] = None
    costo: Optional[float] = None
    profundidad_anterior: Optional[float] = None
    profundidad_nueva: Optional[float] = None
    deshecho: bool
    fecha_deshecho: Optional[datetime] = None

# ── Recuperar banda ──
class RecuperarBandaCreate(BaseModel):
    neumatico_destino_id: int
    fecha: datetime
    mm_transferidos: Optional[float] = None
    costo_transferido: Optional[float] = None
    observaciones: Optional[str] = None

# ── Cambiar zona ──
class CambiarZonaCreate(BaseModel):
    zona_id: int
    fecha: datetime
    observaciones: Optional[str] = None

# ── Vidas de la llanta ──
class VidaNeumaticoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    neumatico_id: int
    numero_vida: int
    tipo: str
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    km_inicio: float
    km_fin: Optional[float] = None
    costo: Optional[float] = None
    profundidad_inicial: Optional[float] = None
    profundidad_final: Optional[float] = None
    motivo_cierre_id: Optional[int] = None

# ── Congelar datos (snapshot histórico) ──
class CongeladoCreate(BaseModel):
    descripcion: Optional[str] = None

class CongeladoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: datetime
    descripcion: Optional[str] = None

class CongeladoDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    congelado_id: int
    neumatico_id: int
    codigo: str
    marca: Optional[str] = None
    medida: Optional[str] = None
    estado: Optional[str] = None
    km_total: Optional[float] = None
    costo: Optional[float] = None
    costo_neto: Optional[float] = None
    cpk: Optional[float] = None
    costo_mm: Optional[float] = None
    mm_gastados: Optional[float] = None

# ── Indicadores / alertas ──
class IndicadorNeuResponse(BaseModel):
    neumatico_id: int
    codigo: str
    marca: Optional[str] = None
    medida: Optional[str] = None
    estado: Optional[str] = None
    posicion: Optional[str] = None
    km_total: float
    costo: Optional[float] = None
    ajustes: Optional[float] = None             # total de ajustes (deducciones) aplicados
    costo_neto: Optional[float] = None          # costo - ajustes, usado para cpk/costo_mm
    cpk: Optional[float] = None                 # costo neto por km
    costo_mm: Optional[float] = None            # costo neto por mm gastado
    mm_gastados: Optional[float] = None
    vida_util_km: Optional[float] = None
    km_proyectado: Optional[float] = None       # proyección de vida (km)
    pct_desgaste: Optional[float] = None        # % de desgaste

class AlertaNeuResponse(BaseModel):
    neumatico_id: int
    codigo: str
    tipo: str                 # PROFUNDIDAD / PRESION / DESALINEACION
    severidad: str            # ALTA / MEDIA
    mensaje: str
    posicion: Optional[str] = None
    activo_id: Optional[int] = None

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

@router.get("/vehiculos-combinados", response_model=List[VehiculoCombinadoResponse])
async def list_vehiculos_combinados(
    flota: Optional[str] = None,        # PROPIA | EXTERNA
    usa_llantas: Optional[bool] = None,  # filtra PROPIA por el catálogo de tipos; TMS/Flota siempre son vehículo
    db: AsyncSession = Depends(get_db),
):
    """Tabla unificada de vehículos: flota PROPIA (activos EAM/CMMS con placa)
    + flota EXTERNA (vehículos registrados en TMS y en Gestión de Flotas).
    Los de origen EAM que ya son espejo de uno externo (origen != 'EAM') no se
    repiten como PROPIA — figuran como el externo, con `activo_id` ya resuelto."""
    filas: List[VehiculoCombinadoResponse] = []
    tipos_con_llantas: set = set()
    if usa_llantas:
        r = await db.execute(select(EAMTipoActivo.codigo).where(EAMTipoActivo.usa_llantas == True))
        tipos_con_llantas = {c for c, in r.all()}

    espejos: dict[tuple, EAMActivo] = {}
    if flota in (None, "PROPIA"):
        # Para la vista de flota se exige placa (es un listado de vehículos), pero
        # cuando se piden los que usan llantas el criterio válido es el tipo de
        # activo: un montacargas o equipo de patio lleva llantas y no tiene placa.
        q_propia = select(EAMActivo).where(EAMActivo.activo == True)
        if not usa_llantas:
            q_propia = q_propia.where(EAMActivo.placa.isnot(None))
        res = await db.execute(q_propia)
        for a in res.scalars().all():
            if a.origen and a.origen != "EAM" and a.origen_id:
                espejos[(a.origen, a.origen_id)] = a
                continue   # es espejo de un externo: se representa como TMS/FLOTA, no como PROPIA
            if usa_llantas and a.tipo_activo not in tipos_con_llantas:
                continue
            filas.append(VehiculoCombinadoResponse(
                origen="EAM", flota="PROPIA", id=a.id, activo_id=a.id,
                codigo=a.codigo, nombre=a.nombre, placa=a.placa, tipo=a.tipo_activo,
                marca=a.marca, modelo=a.modelo, anio=a.anio, numero_ejes=a.numero_ejes,
                layout_llantas=a.layout_llantas, tiene_repuesto=a.tiene_repuesto,
                capacidad_kg=a.capacidad_combustible, estado=a.estado,
                motor_marca=a.motor_marca, motor_linea=a.motor_linea, motor_cc=a.motor_cc,
                propietario=a.responsable,
            ))
    if flota in (None, "EXTERNA"):
        res = await db.execute(select(TMSVehiculo).where(TMSVehiculo.deleted_at.is_(None)))
        for v in res.scalars().all():
            espejo = espejos.get(("TMS", v.id))
            filas.append(VehiculoCombinadoResponse(
                origen="TMS", flota="EXTERNA", id=v.id, activo_id=espejo.id if espejo else None,
                placa=v.placa, tipo=v.tipo_vehiculo.value if v.tipo_vehiculo else None,
                marca=v.marca, modelo=v.modelo, anio=v.anio,
                numero_ejes=espejo.numero_ejes if espejo else v.num_ejes,
                layout_llantas=espejo.layout_llantas if espejo else None,
                tiene_repuesto=espejo.tiene_repuesto if espejo else None,
                capacidad_kg=v.capacidad_kg,
                estado=v.estado_operativo.value if v.estado_operativo else None,
                propietario=v.propietario,
            ))
        res = await db.execute(
            select(FlotaVehiculo)
            .options(selectinload(FlotaVehiculo.marca), selectinload(FlotaVehiculo.tipo_vehiculo))
            .where(FlotaVehiculo.deleted_at.is_(None))
        )
        for v in res.scalars().all():
            espejo = espejos.get(("FLOTA", v.id))
            filas.append(VehiculoCombinadoResponse(
                origen="FLOTA", flota="EXTERNA", id=v.id, activo_id=espejo.id if espejo else None,
                placa=v.placa, tipo=v.tipo_vehiculo.nombre if v.tipo_vehiculo else None,
                marca=v.marca.nombre if v.marca else None, modelo=str(v.modelo) if v.modelo else None,
                numero_ejes=espejo.numero_ejes if espejo else None,
                layout_llantas=espejo.layout_llantas if espejo else None,
                tiene_repuesto=espejo.tiene_repuesto if espejo else None,
                estado="BAJA" if v.fecha_baja else "OPERATIVO",
            ))
    return filas


@router.post("/activos/vincular-externo", response_model=ActivoResponse)
async def vincular_activo_externo(data: VincularExternoRequest, db: AsyncSession = Depends(get_db)):
    """Crea (o devuelve, si ya existe) el activo EAM 'espejo' de un vehículo
    registrado originalmente en TMS o en Gestión de Flotas — para poder llevarle
    historial de mantenimiento/neumáticos sin duplicar su registro maestro."""
    origen = data.origen.upper()
    if origen not in ("TMS", "FLOTA"):
        raise HTTPException(400, "Origen inválido, debe ser TMS o FLOTA")

    existente_r = await db.execute(
        select(EAMActivo).where(EAMActivo.origen == origen, EAMActivo.origen_id == data.origen_id)
    )
    existente = existente_r.scalar_one_or_none()
    if existente:
        return existente

    if origen == "TMS":
        fuente = await db.get(TMSVehiculo, data.origen_id)
        if not fuente:
            raise HTTPException(404, "Vehículo TMS no encontrado")
        placa, marca, modelo, numero_ejes = fuente.placa, fuente.marca, fuente.modelo, fuente.num_ejes
    else:
        r = await db.execute(
            select(FlotaVehiculo).options(selectinload(FlotaVehiculo.marca))
            .where(FlotaVehiculo.id == data.origen_id)
        )
        fuente = r.scalar_one_or_none()
        if not fuente:
            raise HTTPException(404, "Vehículo de Flota no encontrado")
        placa = fuente.placa
        marca = fuente.marca.nombre if fuente.marca else None
        modelo = str(fuente.modelo) if fuente.modelo else None
        numero_ejes = None

    codigo = f"{origen}-{placa or data.origen_id}"
    obj = EAMActivo(
        codigo=codigo, nombre=f"Vehículo {placa or data.origen_id}", tipo_activo="VEHICULO",
        placa=placa, marca=marca, modelo=modelo, numero_ejes=numero_ejes,
        origen=origen, origen_id=data.origen_id,
    )
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Catálogo de tipos de activo (jerarquía: qué tipos usan llantas) ──
@router.get("/tipos-activo", response_model=List[TipoActivoResponse])
async def list_tipos_activo(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMTipoActivo).where(EAMTipoActivo.activo == True).order_by(EAMTipoActivo.nombre))
    return r.scalars().all()

@router.post("/tipos-activo", response_model=TipoActivoResponse)
async def crear_tipo_activo(data: TipoActivoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMTipoActivo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/tipos-activo/{tid}", response_model=TipoActivoResponse)
async def actualizar_tipo_activo(tid: int, data: TipoActivoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMTipoActivo, tid)
    if not obj:
        raise HTTPException(404, "Tipo de activo no encontrado")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/tipos-activo/{tid}", status_code=204)
async def desactivar_tipo_activo(tid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMTipoActivo, tid)
    if obj:
        obj.activo = False
        await db.commit()

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

@router.delete("/activos/{activo_id}", status_code=204)
async def delete_activo(activo_id: int, db: AsyncSession = Depends(get_db)):
    """Baja lógica del activo (activo=False): conserva el histórico de órdenes de
    trabajo, movimientos de neumáticos y demás registros que lo referencian.
    Se bloquea si todavía tiene llantas montadas u órdenes de trabajo abiertas,
    para no dejar registros huérfanos apuntando a un activo dado de baja."""
    obj = await db.get(EAMActivo, activo_id)
    if not obj:
        raise HTTPException(404, "Activo no encontrado")

    r = await db.execute(
        select(func.count()).select_from(EAMNeumatico)
        .where(EAMNeumatico.activo_id == activo_id, EAMNeumatico.estado == "INSTALADO")
    )
    montadas = r.scalar() or 0
    if montadas:
        raise HTTPException(409, f"El activo tiene {montadas} llanta(s) montada(s). Desmóntalas antes de darlo de baja.")

    r = await db.execute(
        select(func.count()).select_from(EAMOrdenTrabajo)
        .where(EAMOrdenTrabajo.activo_id == activo_id, EAMOrdenTrabajo.estado.notin_(["CERRADA", "CANCELADA"]))
    )
    ots_abiertas = r.scalar() or 0
    if ots_abiertas:
        raise HTTPException(409, f"El activo tiene {ots_abiertas} orden(es) de trabajo abierta(s). Ciérralas o cancélalas antes de darlo de baja.")

    obj.activo = False
    await db.commit()


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

def _lado_suffixes(n: int) -> List[str]:
    """Sufijos de código para `n` llantas de un mismo lado de un eje, de afuera
    hacia adentro: 1→[''], 2→['-EXT','-INT'], 3→['-EXT','-INT2','-INT'], etc."""
    if n <= 0:
        return []
    if n == 1:
        return [""]
    if n == 2:
        return ["-EXT", "-INT"]
    return ["-EXT"] + [f"-INT{i}" for i in range(2, n)] + ["-INT"]


def _sufijo_label(suf: str) -> str:
    return "" if not suf else " " + suf.lstrip("-").replace("INT", "Int ").replace("EXT", "Ext").strip()


def _generar_posiciones(
    numero_ejes: Optional[int], tiene_repuesto: bool,
    layout: Optional[List[int]] = None, cantidad_repuestos: int = 1,
) -> List[dict]:
    """Layout de posiciones de neumáticos. Si `layout` trae la cantidad de
    llantas por cada eje (ej. [2,4,4]), genera posiciones a la medida de esa
    configuración real (soporta ejes simples, duales o con más llantas por
    lado). Si no, usa el patrón clásico: eje 1 direccional (2 llantas), ejes
    2..N duales (4 llantas) — se mantiene igual por compatibilidad con activos
    ya configurados antes de que existiera `layout`."""
    pos: List[dict] = []
    numero = 0

    def _add(codigo: str, label: str, eje: int, lado: str) -> None:
        nonlocal numero
        numero += 1
        pos.append({"codigo": codigo, "label": f"Pos. {numero} · {label}", "eje": eje, "lado": lado, "numero": numero})

    if layout:
        for eje, cantidad in enumerate(layout, start=1):
            izq = (cantidad + 1) // 2
            der = cantidad - izq
            for suf in _lado_suffixes(izq):
                _add(f"E{eje}-IZQ{suf}", f"Eje {eje} · Izq{_sufijo_label(suf)}", eje, "IZQ")
            for suf in reversed(_lado_suffixes(der)):
                _add(f"E{eje}-DER{suf}", f"Eje {eje} · Der{_sufijo_label(suf)}", eje, "DER")
    else:
        for eje in range(1, (numero_ejes or 0) + 1):
            if eje == 1:
                _add("E1-IZQ", "Eje 1 · Izq", 1, "IZQ")
                _add("E1-DER", "Eje 1 · Der", 1, "DER")
            else:
                _add(f"E{eje}-IZQ-EXT", f"Eje {eje} · Izq Ext", eje, "IZQ")
                _add(f"E{eje}-IZQ-INT", f"Eje {eje} · Izq Int", eje, "IZQ")
                _add(f"E{eje}-DER-INT", f"Eje {eje} · Der Int", eje, "DER")
                _add(f"E{eje}-DER-EXT", f"Eje {eje} · Der Ext", eje, "DER")

    if tiene_repuesto:
        for r in range(max(1, cantidad_repuestos)):
            codigo = "REPUESTO" if r == 0 else f"REPUESTO{r + 1}"
            label = "Repuesto" if r == 0 else f"Repuesto {r + 1}"
            pos.append({"codigo": codigo, "label": label, "eje": 0, "lado": "-", "numero": None})
    return pos


def _eje_de_posicion(posicion: str) -> Optional[int]:
    """Deduce el número de eje a partir del código de posición (E{n}-...)."""
    if not posicion:
        return None
    if posicion.upper().startswith("REPUESTO"):
        return 0
    if posicion.upper().startswith("E"):
        try:
            return int(posicion[1:].split("-")[0])
        except (ValueError, IndexError):
            return None
    return None


def _validar_montaje(tipo_uso: Optional[str], posicion: str) -> Optional[str]:
    """Valida que el tipo de uso de la llanta sea compatible con la posición.
    Regla (montaje estricto): DIRECCIONAL solo en eje 1; TRACCION/REMOLQUE no en eje 1.
    MULTIPOSICION y sin clasificar se permiten en cualquier posición."""
    uso = (tipo_uso or "").upper()
    eje = _eje_de_posicion(posicion)
    if eje is None or eje == 0:      # repuesto o desconocido: permitido
        return None
    if uso == "DIRECCIONAL" and eje != 1:
        return "Una llanta DIRECCIONAL solo puede montarse en el eje 1 (dirección)."
    if uso in ("TRACCION", "REMOLQUE") and eje == 1:
        return f"Una llanta {uso} no puede montarse en el eje 1 (dirección)."
    return None


async def _validar_fecha_movimiento(db: AsyncSession, neu: "EAMNeumatico", fecha) -> Optional[str]:
    """No permite registrar un movimiento con fecha anterior a una inspección o a
    otro movimiento ya registrados para la misma llanta (evita romper el orden
    cronológico del historial)."""
    insp_r = await db.execute(
        select(EAMInspeccionNeumatico.fecha).where(EAMInspeccionNeumatico.neumatico_id == neu.id)
        .order_by(EAMInspeccionNeumatico.fecha.desc()).limit(1)
    )
    ultima_insp = insp_r.scalar_one_or_none()
    if ultima_insp and fecha < ultima_insp:
        return f"Existe una inspección posterior ({ultima_insp:%Y-%m-%d %H:%M}) a la fecha de este movimiento. Corrige la fecha."

    mov_r = await db.execute(
        select(EAMMovimientoNeumatico.fecha).where(EAMMovimientoNeumatico.neumatico_id == neu.id)
        .order_by(EAMMovimientoNeumatico.fecha.desc()).limit(1)
    )
    ultimo_mov = mov_r.scalar_one_or_none()
    if ultimo_mov and fecha < ultimo_mov:
        return f"Existe un movimiento posterior ({ultimo_mov:%Y-%m-%d %H:%M}) registrado para esta llanta. Los movimientos deben registrarse en orden cronológico."
    return None


async def _get_config_neu(db: AsyncSession) -> EAMNeumaticoConfig:
    """Obtiene (o crea) la fila única de configuración del módulo de llantas."""
    cfg = await db.get(EAMNeumaticoConfig, 1)
    if not cfg:
        cfg = EAMNeumaticoConfig(id=1)
        db.add(cfg); await db.commit(); await db.refresh(cfg)
    return cfg


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


# -- Catalogo jerarquico de llantas y bandas ------------------------------------
# marca -> referencia -> (referencia + dimension) -> profundidad inicial.
# `ambito` = LLANTA | BANDA: las bandas de reencauche usan el mismo catalogo con
# sus propias marcas y referencias.

class MarcaNeuCreate(BaseModel):
    nombre: str
    ambito: str = "LLANTA"
    activo: bool = True

class MarcaNeuResponse(MarcaNeuCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class DimensionNeuCreate(BaseModel):
    nombre: str
    ambito: str = "LLANTA"
    activo: bool = True

class DimensionNeuResponse(DimensionNeuCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class ReferenciaNeuCreate(BaseModel):
    marca_id: int
    nombre: str
    ambito: str = "LLANTA"
    tipo_uso: Optional[str] = None
    activo: bool = True

class ReferenciaNeuResponse(ReferenciaNeuCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    marca_nombre: Optional[str] = None

class ReferenciaDimensionCreate(BaseModel):
    referencia_id: int
    dimension_id: int
    profundidad_inicial: float
    profundidad_minima: Optional[float] = None
    vida_util_km: Optional[float] = None
    presion_recomendada: Optional[float] = None
    activo: bool = True

class ReferenciaDimensionResponse(ReferenciaDimensionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dimension_nombre: Optional[str] = None


@router.get("/neumaticos/catalogo/marcas", response_model=List[MarcaNeuResponse])
async def list_marcas_neu(ambito: str = "LLANTA", db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMMarcaNeumatico)
        .where(EAMMarcaNeumatico.ambito == ambito.upper(), EAMMarcaNeumatico.activo == True)
        .order_by(EAMMarcaNeumatico.nombre)
    )
    return r.scalars().all()

@router.post("/neumaticos/catalogo/marcas", response_model=MarcaNeuResponse)
async def crear_marca_neu(data: MarcaNeuCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMMarcaNeumatico(**data.model_dump())
    obj.ambito = obj.ambito.upper()
    obj.nombre = obj.nombre.strip()
    db.add(obj)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(409, "La marca '%s' ya existe en %s" % (data.nombre, obj.ambito))
    await db.refresh(obj)
    return obj

@router.delete("/neumaticos/catalogo/marcas/{mid}", status_code=204)
async def eliminar_marca_neu(mid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMMarcaNeumatico, mid)
    if obj:
        obj.activo = False
        await db.commit()


@router.get("/neumaticos/catalogo/dimensiones", response_model=List[DimensionNeuResponse])
async def list_dimensiones_neu(ambito: str = "LLANTA", db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMDimensionNeumatico)
        .where(EAMDimensionNeumatico.ambito == ambito.upper(), EAMDimensionNeumatico.activo == True)
        .order_by(EAMDimensionNeumatico.nombre)
    )
    return r.scalars().all()

@router.post("/neumaticos/catalogo/dimensiones", response_model=DimensionNeuResponse)
async def crear_dimension_neu(data: DimensionNeuCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMDimensionNeumatico(**data.model_dump())
    obj.ambito = obj.ambito.upper()
    obj.nombre = obj.nombre.strip()
    db.add(obj)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(409, "La dimension '%s' ya existe en %s" % (data.nombre, obj.ambito))
    await db.refresh(obj)
    return obj

@router.delete("/neumaticos/catalogo/dimensiones/{did}", status_code=204)
async def eliminar_dimension_neu(did: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMDimensionNeumatico, did)
    if obj:
        obj.activo = False
        await db.commit()


@router.get("/neumaticos/catalogo/referencias", response_model=List[ReferenciaNeuResponse])
async def list_referencias_neu(
    ambito: str = "LLANTA", marca_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
):
    q = (
        select(EAMReferenciaNeumatico, EAMMarcaNeumatico.nombre)
        .join(EAMMarcaNeumatico, EAMMarcaNeumatico.id == EAMReferenciaNeumatico.marca_id)
        .where(EAMReferenciaNeumatico.ambito == ambito.upper(), EAMReferenciaNeumatico.activo == True)
    )
    if marca_id:
        q = q.where(EAMReferenciaNeumatico.marca_id == marca_id)
    r = await db.execute(q.order_by(EAMReferenciaNeumatico.nombre))
    salida = []
    for ref, marca_nombre in r.all():
        item = ReferenciaNeuResponse.model_validate(ref)
        item.marca_nombre = marca_nombre
        salida.append(item)
    return salida

@router.post("/neumaticos/catalogo/referencias", response_model=ReferenciaNeuResponse)
async def crear_referencia_neu(data: ReferenciaNeuCreate, db: AsyncSession = Depends(get_db)):
    marca = await db.get(EAMMarcaNeumatico, data.marca_id)
    if not marca:
        raise HTTPException(404, "La marca no existe")
    obj = EAMReferenciaNeumatico(**data.model_dump())
    obj.ambito = obj.ambito.upper()
    obj.nombre = obj.nombre.strip()
    db.add(obj)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(409, "La referencia '%s' ya existe para la marca %s" % (data.nombre, marca.nombre))
    await db.refresh(obj)
    return obj

@router.delete("/neumaticos/catalogo/referencias/{rid}", status_code=204)
async def eliminar_referencia_neu(rid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMReferenciaNeumatico, rid)
    if obj:
        obj.activo = False
        await db.commit()


@router.get("/neumaticos/catalogo/referencias/{rid}/dimensiones", response_model=List[ReferenciaDimensionResponse])
async def list_dimensiones_de_referencia(rid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMReferenciaDimension, EAMDimensionNeumatico.nombre)
        .join(EAMDimensionNeumatico, EAMDimensionNeumatico.id == EAMReferenciaDimension.dimension_id)
        .where(EAMReferenciaDimension.referencia_id == rid, EAMReferenciaDimension.activo == True)
        .order_by(EAMDimensionNeumatico.nombre)
    )
    salida = []
    for rd, dim_nombre in r.all():
        item = ReferenciaDimensionResponse.model_validate(rd)
        item.dimension_nombre = dim_nombre
        salida.append(item)
    return salida

@router.post("/neumaticos/catalogo/referencia-dimension", response_model=ReferenciaDimensionResponse)
async def crear_referencia_dimension(data: ReferenciaDimensionCreate, db: AsyncSession = Depends(get_db)):
    if not await db.get(EAMReferenciaNeumatico, data.referencia_id):
        raise HTTPException(404, "La referencia no existe")
    if not await db.get(EAMDimensionNeumatico, data.dimension_id):
        raise HTTPException(404, "La dimension no existe")
    if data.profundidad_inicial is None or data.profundidad_inicial <= 0:
        raise HTTPException(400, "La profundidad inicial debe ser mayor que cero")
    obj = EAMReferenciaDimension(**data.model_dump())
    db.add(obj)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(409, "Esa referencia ya tiene configurada esa dimension")
    await db.refresh(obj)
    return obj

@router.put("/neumaticos/catalogo/referencia-dimension/{rdid}", response_model=ReferenciaDimensionResponse)
async def actualizar_referencia_dimension(rdid: int, data: ReferenciaDimensionCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMReferenciaDimension, rdid)
    if not obj:
        raise HTTPException(404, "Combinacion no encontrada")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/catalogo/referencia-dimension/{rdid}", status_code=204)
async def eliminar_referencia_dimension(rdid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMReferenciaDimension, rdid)
    if obj:
        await db.delete(obj)
        await db.commit()


async def _resolver_catalogo_llanta(
    db: AsyncSession, marca, referencia, medida, ambito: str = "LLANTA",
):
    """Valida marca/referencia/medida contra el catalogo y devuelve la fila de
    referencia+dimension (de donde sale la profundidad inicial). Lanza ValueError
    con un mensaje entendible: quien llama decide si es 409 o error de fila."""
    if not marca or not str(marca).strip():
        raise ValueError("La marca es obligatoria")
    if not medida or not str(medida).strip():
        raise ValueError("La dimension/medida es obligatoria")

    r = await db.execute(select(EAMMarcaNeumatico).where(
        func.lower(EAMMarcaNeumatico.nombre) == str(marca).strip().lower(),
        EAMMarcaNeumatico.ambito == ambito, EAMMarcaNeumatico.activo == True,
    ))
    obj_marca = r.scalar_one_or_none()
    if not obj_marca:
        raise ValueError("La marca '%s' no esta en el catalogo" % marca)

    r = await db.execute(select(EAMDimensionNeumatico).where(
        func.lower(EAMDimensionNeumatico.nombre) == str(medida).strip().lower(),
        EAMDimensionNeumatico.ambito == ambito, EAMDimensionNeumatico.activo == True,
    ))
    obj_dim = r.scalar_one_or_none()
    if not obj_dim:
        raise ValueError("La dimension '%s' no esta en el catalogo" % medida)

    if not referencia or not str(referencia).strip():
        raise ValueError("La referencia es obligatoria")
    r = await db.execute(select(EAMReferenciaNeumatico).where(
        EAMReferenciaNeumatico.marca_id == obj_marca.id,
        func.lower(EAMReferenciaNeumatico.nombre) == str(referencia).strip().lower(),
        EAMReferenciaNeumatico.activo == True,
    ))
    obj_ref = r.scalar_one_or_none()
    if not obj_ref:
        raise ValueError(
            "La referencia '%s' no pertenece a la marca '%s'" % (referencia, obj_marca.nombre)
        )

    r = await db.execute(select(EAMReferenciaDimension).where(
        EAMReferenciaDimension.referencia_id == obj_ref.id,
        EAMReferenciaDimension.dimension_id == obj_dim.id,
        EAMReferenciaDimension.activo == True,
    ))
    obj_rd = r.scalar_one_or_none()
    if not obj_rd:
        raise ValueError(
            "La referencia '%s' no tiene configurada la dimension '%s'"
            % (obj_ref.nombre, obj_dim.nombre)
        )
    return obj_marca, obj_ref, obj_dim, obj_rd


# -- Catalogo de atributos (marca/medida/referencia/vida) --
@router.get("/neumaticos/catalogo", response_model=List[CatalogoNeuResponse])
async def list_catalogo_neumatico(tipo: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(EAMNeumaticoCatalogo)
    if tipo:
        q = q.where(EAMNeumaticoCatalogo.tipo == tipo.upper())
    r = await db.execute(q.order_by(EAMNeumaticoCatalogo.tipo, EAMNeumaticoCatalogo.nombre))
    return r.scalars().all()

@router.post("/neumaticos/catalogo", response_model=CatalogoNeuResponse)
async def create_catalogo_neumatico(data: CatalogoNeuCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMNeumaticoCatalogo(**data.model_dump()); obj.tipo = obj.tipo.upper()
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/catalogo/{cid}", status_code=204)
async def delete_catalogo_neumatico(cid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMNeumaticoCatalogo, cid)
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
    return _generar_posiciones(
        activo.numero_ejes, activo.tiene_repuesto if activo.tiene_repuesto is not None else True,
        layout=activo.layout_llantas, cantidad_repuestos=activo.cantidad_repuestos or 1,
    )


# ── Movimiento (instalación / rotación / desmontaje / reencauche / baja) ──
@router.post("/neumaticos/movimiento", response_model=MovNeumaticoResponse)
async def crear_movimiento_neumatico(data: MovNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, data.neumatico_id)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    tipo = (data.tipo_movimiento or "").upper()
    posicion_origen = neu.posicion

    err_fecha = await _validar_fecha_movimiento(db, neu, data.fecha)
    if err_fecha:
        raise HTTPException(409, err_fecha)

    if tipo == "INSTALACION":
        if neu.estado == "BAJA":
            raise HTTPException(409, f"La llanta {neu.codigo} fue descartada y no se puede montar.")
        if neu.estado == "REENCAUCHE":
            raise HTTPException(409, f"La llanta {neu.codigo} está en proceso de reencauche y no se puede montar.")
        if neu.estado == "INSTALADO" and neu.activo_id and neu.activo_id != data.activo_id:
            raise HTTPException(409, f"La llanta {neu.codigo} ya está instalada en otro vehículo (posición {neu.posicion}). Desmóntala primero.")
        if data.activo_id and data.posicion:
            ocupada_r = await db.execute(
                select(EAMNeumatico).where(
                    EAMNeumatico.activo_id == data.activo_id, EAMNeumatico.posicion == data.posicion,
                    EAMNeumatico.estado == "INSTALADO", EAMNeumatico.id != neu.id,
                )
            )
            ocupante = ocupada_r.scalar_one_or_none()
            if ocupante:
                raise HTTPException(409, f"La posición {data.posicion} ya está ocupada por la llanta {ocupante.codigo}.")
        cfg = await _get_config_neu(db)
        if cfg.montaje_estricto and data.posicion:
            err = _validar_montaje(neu.tipo_uso, data.posicion)
            if err:
                raise HTTPException(409, err)
        neu.estado = "INSTALADO"; neu.activo_id = data.activo_id
        neu.posicion = data.posicion; neu.bodega_id = None
        if data.km_odometro is not None:
            neu.km_actual = data.km_odometro
    elif tipo == "ROTACION":
        if data.activo_id and data.posicion:
            ocupada_r = await db.execute(
                select(EAMNeumatico).where(
                    EAMNeumatico.activo_id == data.activo_id, EAMNeumatico.posicion == data.posicion,
                    EAMNeumatico.estado == "INSTALADO", EAMNeumatico.id != neu.id,
                )
            )
            ocupante = ocupada_r.scalar_one_or_none()
            if ocupante:
                raise HTTPException(409, f"La posición {data.posicion} ya está ocupada por la llanta {ocupante.codigo}. Usa la rotación por intercambio.")
        cfg = await _get_config_neu(db)
        if cfg.montaje_estricto and data.posicion:
            err = _validar_montaje(neu.tipo_uso, data.posicion)
            if err:
                raise HTTPException(409, err)
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
    elif tipo == "VOLTEO":
        # Voltear la llanta en la MISMA posición: invierte el sentido de montaje
        # para emparejar el desgaste irregular entre hombros (interno ↔ externo).
        if neu.estado != "INSTALADO" or not neu.posicion:
            raise HTTPException(409, "Solo se puede voltear una llanta instalada en un vehículo")
        neu.orientacion = "INVERTIDA" if (neu.orientacion or "NORMAL") == "NORMAL" else "NORMAL"
        neu.profundidad_externa, neu.profundidad_interna = neu.profundidad_interna, neu.profundidad_externa
        data.posicion = neu.posicion   # se mantiene en la misma posición
    elif tipo == "BAJA":
        neu.estado = "BAJA"; neu.activo_id = None; neu.posicion = None; neu.bodega_id = None
        neu.dano_id = data.dano_id; neu.motivo_baja = data.motivo
        neu.motivo_fin_vida_id = data.motivo_fin_vida_id
        neu.fecha_baja = data.fecha.date()
        vida_actual = await _vida_abierta(db, neu.id)
        if vida_actual:
            vida_actual.fecha_fin = data.fecha
            vida_actual.km_fin = data.km_odometro if data.km_odometro is not None else neu.km_actual
            vida_actual.profundidad_final = neu.profundidad_actual
            vida_actual.motivo_cierre_id = data.motivo_fin_vida_id
    else:
        raise HTTPException(400, f"Tipo de movimiento inválido: {tipo}")

    mov = EAMMovimientoNeumatico(
        neumatico_id=neu.id, tipo_movimiento=tipo, activo_id=data.activo_id or neu.activo_id,
        posicion_origen=posicion_origen, posicion=data.posicion, bodega_id=data.bodega_id,
        km_odometro=data.km_odometro, fecha=data.fecha,
        observaciones=(data.observaciones or data.motivo or (f"Volteo: orientación → {neu.orientacion}" if tipo == "VOLTEO" else None)),
        tecnico=data.tecnico,
    )
    db.add(mov); await db.commit(); await db.refresh(mov)
    return mov


# ── Descartes masivos (BAJA, carga por archivo plano, referenciando la llanta por código) ──
class BajaBulkItem(BaseModel):
    codigo: str
    fecha: datetime
    dano_id: Optional[int] = None
    motivo_fin_vida_id: Optional[int] = None
    motivo: Optional[str] = None
    km_odometro: Optional[float] = None

class BajaBulkCreate(BaseModel):
    items: List[BajaBulkItem]

@router.post("/neumaticos/baja/bulk")
async def dar_baja_masivo(data: BajaBulkCreate, db: AsyncSession = Depends(get_db)):
    exitosos = 0
    errores = []
    for i, item in enumerate(data.items):
        try:
            async with db.begin_nested():
                r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.codigo == item.codigo))
                neu = r.scalar_one_or_none()
                if not neu:
                    raise ValueError(f"Llanta con código '{item.codigo}' no encontrada")
                if neu.estado == "BAJA":
                    raise ValueError(f"La llanta {item.codigo} ya está dada de baja")
                err_fecha = await _validar_fecha_movimiento(db, neu, item.fecha)
                if err_fecha:
                    raise ValueError(err_fecha)
                posicion_origen = neu.posicion
                activo_id_origen = neu.activo_id
                neu.estado = "BAJA"; neu.activo_id = None; neu.posicion = None; neu.bodega_id = None
                neu.dano_id = item.dano_id; neu.motivo_baja = item.motivo
                neu.motivo_fin_vida_id = item.motivo_fin_vida_id
                neu.fecha_baja = item.fecha.date()
                vida_actual = await _vida_abierta(db, neu.id)
                if vida_actual:
                    vida_actual.fecha_fin = item.fecha
                    vida_actual.km_fin = item.km_odometro if item.km_odometro is not None else neu.km_actual
                    vida_actual.profundidad_final = neu.profundidad_actual
                    vida_actual.motivo_cierre_id = item.motivo_fin_vida_id
                db.add(EAMMovimientoNeumatico(
                    neumatico_id=neu.id, tipo_movimiento="BAJA", activo_id=activo_id_origen,
                    posicion_origen=posicion_origen, posicion=None, bodega_id=None,
                    km_odometro=item.km_odometro, fecha=item.fecha, observaciones=item.motivo,
                ))
            exitosos += 1
        except Exception as e:
            errores.append({"fila": i + 2, "codigo": item.codigo, "mensaje": str(e)})
    await db.commit()
    return {"total": len(data.items), "exitosos": exitosos, "errores": errores}


class RotacionIntercambio(BaseModel):
    neumatico_a_id: int
    neumatico_b_id: int
    fecha: datetime
    km_odometro: Optional[float] = None
    tecnico: Optional[str] = None
    observaciones: Optional[str] = None

@router.post("/neumaticos/rotacion-intercambio")
async def rotacion_intercambio(data: RotacionIntercambio, db: AsyncSession = Depends(get_db)):
    """Intercambia dos llantas instaladas: cada una toma la posición de la otra
    (rotación clásica), validando el montaje estricto para ambas."""
    a = await db.get(EAMNeumatico, data.neumatico_a_id)
    b = await db.get(EAMNeumatico, data.neumatico_b_id)
    if not a or not b:
        raise HTTPException(404, "Neumático no encontrado")
    if a.estado != "INSTALADO" or b.estado != "INSTALADO":
        raise HTTPException(409, "Ambas llantas deben estar instaladas para intercambiarse")
    pos_a, pos_b = a.posicion, b.posicion
    veh_a, veh_b = a.activo_id, b.activo_id
    cfg = await _get_config_neu(db)
    if cfg.montaje_estricto:
        for neu, pos in ((a, pos_b), (b, pos_a)):
            err = _validar_montaje(neu.tipo_uso, pos)
            if err:
                raise HTTPException(409, f"{neu.codigo}: {err}")
    # Intercambio de posiciones (y vehículo, por si son distintos)
    a.posicion, a.activo_id = pos_b, veh_b
    b.posicion, b.activo_id = pos_a, veh_a
    if data.km_odometro is not None:
        a.km_actual = b.km_actual = data.km_odometro
    obs = data.observaciones or f"Intercambio de rotación: {a.codigo} ⇄ {b.codigo}"
    for neu, origen, destino, veh in ((a, pos_a, pos_b, veh_b), (b, pos_b, pos_a, veh_a)):
        db.add(EAMMovimientoNeumatico(
            neumatico_id=neu.id, tipo_movimiento="ROTACION", activo_id=veh,
            posicion_origen=origen, posicion=destino, km_odometro=data.km_odometro,
            fecha=data.fecha, observaciones=obs, tecnico=data.tecnico,
        ))
    await db.commit()
    return {"ok": True, "a": {"codigo": a.codigo, "posicion": a.posicion}, "b": {"codigo": b.codigo, "posicion": b.posicion}}


@router.get("/neumaticos/{nid}/movimientos", response_model=List[MovNeumaticoResponse])
async def list_movimientos_neumatico(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMMovimientoNeumatico).where(EAMMovimientoNeumatico.neumatico_id == nid)
        .order_by(EAMMovimientoNeumatico.fecha.desc())
    )
    return r.scalars().all()


# ── Configuración global del módulo ──
@router.get("/neumaticos/config", response_model=NeuConfigSchema)
async def get_config_neumatico(db: AsyncSession = Depends(get_db)):
    return await _get_config_neu(db)

@router.put("/neumaticos/config", response_model=NeuConfigSchema)
async def update_config_neumatico(data: NeuConfigSchema, db: AsyncSession = Depends(get_db)):
    cfg = await _get_config_neu(db)
    for k, v in data.model_dump().items():
        setattr(cfg, k, v)
    await db.commit(); await db.refresh(cfg)
    return cfg


# ── Zonas de llantas ──
@router.get("/neumaticos/zonas", response_model=List[ZonaNeumaticoResponse])
async def list_zonas_neumatico(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMZonaNeumatico).order_by(EAMZonaNeumatico.nombre))
    return r.scalars().all()

@router.post("/neumaticos/zonas", response_model=ZonaNeumaticoResponse)
async def create_zona_neumatico(data: ZonaNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMZonaNeumatico(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/zonas/{zid}", response_model=ZonaNeumaticoResponse)
async def update_zona_neumatico(zid: int, data: ZonaNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMZonaNeumatico, zid)
    if not obj:
        raise HTTPException(404, "Zona no encontrada")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/zonas/{zid}", status_code=204)
async def delete_zona_neumatico(zid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMZonaNeumatico, zid)
    if obj:
        await db.delete(obj); await db.commit()


# ── Bandas de reencauche ──
@router.get("/neumaticos/bandas-reencauche", response_model=List[BandaReencaucheResponse])
async def list_bandas_reencauche(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMBandaReencauche).order_by(EAMBandaReencauche.marca))
    return r.scalars().all()

@router.post("/neumaticos/bandas-reencauche", response_model=BandaReencaucheResponse)
async def create_banda_reencauche(data: BandaReencaucheCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMBandaReencauche(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/bandas-reencauche/{bid}", response_model=BandaReencaucheResponse)
async def update_banda_reencauche(bid: int, data: BandaReencaucheCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMBandaReencauche, bid)
    if not obj:
        raise HTTPException(404, "Banda no encontrada")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/bandas-reencauche/{bid}", status_code=204)
async def delete_banda_reencauche(bid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMBandaReencauche, bid)
    if obj:
        await db.delete(obj); await db.commit()


# ── Motivos de fin de vida ──
@router.get("/neumaticos/motivos-fin-vida", response_model=List[MotivoFinVidaResponse])
async def list_motivos_fin_vida(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMMotivoFinVida).order_by(EAMMotivoFinVida.nombre))
    return r.scalars().all()

@router.post("/neumaticos/motivos-fin-vida", response_model=MotivoFinVidaResponse)
async def create_motivo_fin_vida(data: MotivoFinVidaCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMMotivoFinVida(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/motivos-fin-vida/{mid}", response_model=MotivoFinVidaResponse)
async def update_motivo_fin_vida(mid: int, data: MotivoFinVidaCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMMotivoFinVida, mid)
    if not obj:
        raise HTTPException(404, "Motivo no encontrado")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/motivos-fin-vida/{mid}", status_code=204)
async def delete_motivo_fin_vida(mid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMMotivoFinVida, mid)
    if obj:
        await db.delete(obj); await db.commit()


# ── Ajustes de valor (catálogo + aplicación por llanta) ──
@router.get("/neumaticos/ajustes-catalogo", response_model=List[AjusteNeuCatalogoResponse])
async def list_ajustes_catalogo(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMAjusteNeumaticoCatalogo).order_by(EAMAjusteNeumaticoCatalogo.nombre))
    return r.scalars().all()

@router.post("/neumaticos/ajustes-catalogo", response_model=AjusteNeuCatalogoResponse)
async def create_ajuste_catalogo(data: AjusteNeuCatalogoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMAjusteNeumaticoCatalogo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/ajustes-catalogo/{aid}", response_model=AjusteNeuCatalogoResponse)
async def update_ajuste_catalogo(aid: int, data: AjusteNeuCatalogoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMAjusteNeumaticoCatalogo, aid)
    if not obj:
        raise HTTPException(404, "Categoría de ajuste no encontrada")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/ajustes-catalogo/{aid}", status_code=204)
async def delete_ajuste_catalogo(aid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMAjusteNeumaticoCatalogo, aid)
    if obj:
        await db.delete(obj); await db.commit()

@router.get("/neumaticos/{nid}/ajustes", response_model=List[AjusteNeuResponse])
async def list_ajustes_neumatico(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMAjusteNeumatico).where(EAMAjusteNeumatico.neumatico_id == nid)
        .order_by(EAMAjusteNeumatico.fecha.desc())
    )
    return r.scalars().all()

@router.post("/neumaticos/{nid}/ajustes", response_model=AjusteNeuResponse)
async def create_ajuste_neumatico(nid: int, data: AjusteNeuCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    obj = EAMAjusteNeumatico(neumatico_id=nid, **data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Esquemas de vehículo (plantillas reutilizables) ──
@router.get("/neumaticos/esquemas", response_model=List[EsquemaVehiculoResponse])
async def list_esquemas_vehiculo(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMEsquemaVehiculo).order_by(EAMEsquemaVehiculo.nombre))
    return r.scalars().all()

@router.post("/neumaticos/esquemas", response_model=EsquemaVehiculoResponse)
async def create_esquema_vehiculo(data: EsquemaVehiculoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMEsquemaVehiculo(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/esquemas/{eid}", response_model=EsquemaVehiculoResponse)
async def update_esquema_vehiculo(eid: int, data: EsquemaVehiculoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMEsquemaVehiculo, eid)
    if not obj:
        raise HTTPException(404, "Esquema no encontrado")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/esquemas/{eid}", status_code=204)
async def delete_esquema_vehiculo(eid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMEsquemaVehiculo, eid)
    if obj:
        await db.delete(obj); await db.commit()

@router.get("/neumaticos/esquemas/asignaciones/{activo_id}", response_model=List[EsquemaAsignacionResponse])
async def list_esquema_asignaciones(activo_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMEsquemaAsignacion).where(EAMEsquemaAsignacion.activo_id == activo_id)
        .order_by(EAMEsquemaAsignacion.fecha_vigencia.desc())
    )
    return r.scalars().all()

@router.post("/neumaticos/esquemas/asignar", response_model=EsquemaAsignacionResponse)
async def asignar_esquema_vehiculo(data: EsquemaAsignacionCreate, db: AsyncSession = Depends(get_db)):
    """Asigna un esquema de llantas a un vehículo: aplica número de ejes/repuesto
    directamente sobre el activo (reutiliza el generador de layout existente) y
    deja registro histórico de la vigencia."""
    activo = await db.get(EAMActivo, data.activo_id)
    if not activo:
        raise HTTPException(404, "Vehículo no encontrado")
    esquema = await db.get(EAMEsquemaVehiculo, data.esquema_id)
    if not esquema:
        raise HTTPException(404, "Esquema no encontrado")
    activo.numero_ejes = esquema.numero_ejes
    activo.layout_llantas = esquema.layout
    activo.tiene_repuesto = esquema.tiene_repuesto
    activo.cantidad_repuestos = esquema.cantidad_repuestos
    obj = EAMEsquemaAsignacion(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Trabajos de llantas y periodicidad ──
@router.get("/neumaticos/trabajos", response_model=List[TrabajoNeumaticoResponse])
async def list_trabajos_neumatico(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMTrabajoNeumatico).order_by(EAMTrabajoNeumatico.nombre))
    return r.scalars().all()

@router.post("/neumaticos/trabajos", response_model=TrabajoNeumaticoResponse)
async def create_trabajo_neumatico(data: TrabajoNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMTrabajoNeumatico(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/trabajos/{tid}", response_model=TrabajoNeumaticoResponse)
async def update_trabajo_neumatico(tid: int, data: TrabajoNeumaticoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMTrabajoNeumatico, tid)
    if not obj:
        raise HTTPException(404, "Trabajo no encontrado")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/trabajos/{tid}", status_code=204)
async def delete_trabajo_neumatico(tid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMTrabajoNeumatico, tid)
    if obj:
        await db.delete(obj); await db.commit()

@router.get("/neumaticos/trabajos/periodicidad", response_model=List[PeriodicidadTrabajoResponse])
async def list_periodicidad_trabajos(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMPeriodicidadTrabajoNeumatico))
    return r.scalars().all()

@router.post("/neumaticos/trabajos/periodicidad", response_model=PeriodicidadTrabajoResponse)
async def create_periodicidad_trabajo(data: PeriodicidadTrabajoCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMPeriodicidadTrabajoNeumatico(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/neumaticos/trabajos/periodicidad/{pid}", status_code=204)
async def delete_periodicidad_trabajo(pid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMPeriodicidadTrabajoNeumatico, pid)
    if obj:
        await db.delete(obj); await db.commit()

@router.get("/neumaticos/{nid}/trabajos", response_model=List[TrabajoRealizadoResponse])
async def list_trabajos_realizados(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMTrabajoRealizadoNeumatico).where(EAMTrabajoRealizadoNeumatico.neumatico_id == nid)
        .order_by(EAMTrabajoRealizadoNeumatico.fecha.desc())
    )
    return r.scalars().all()

@router.post("/neumaticos/{nid}/trabajos", response_model=TrabajoRealizadoResponse)
async def create_trabajo_realizado(nid: int, data: TrabajoRealizadoCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    obj = EAMTrabajoRealizadoNeumatico(neumatico_id=nid, **data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


# ── Ciclo de vida: reesculturado, recuperar banda, cambiar zona, vidas ──

async def _get_or_create_ajuste_motivo(db: AsyncSession, nombre: str) -> EAMAjusteNeumaticoCatalogo:
    r = await db.execute(select(EAMAjusteNeumaticoCatalogo).where(EAMAjusteNeumaticoCatalogo.nombre == nombre))
    obj = r.scalar_one_or_none()
    if not obj:
        obj = EAMAjusteNeumaticoCatalogo(nombre=nombre, activo=True)
        db.add(obj)
        await db.flush()
    return obj

async def _vida_abierta(db: AsyncSession, neumatico_id: int) -> Optional[EAMVidaNeumatico]:
    r = await db.execute(
        select(EAMVidaNeumatico)
        .where(EAMVidaNeumatico.neumatico_id == neumatico_id, EAMVidaNeumatico.fecha_fin.is_(None))
        .order_by(EAMVidaNeumatico.numero_vida.desc())
    )
    return r.scalars().first()

@router.post("/neumaticos/{nid}/reesculturar", response_model=ReesculturadoResponse)
async def reesculturar_neumatico(nid: int, data: ReesculturadoCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    obj = EAMReesculturado(
        neumatico_id=nid, fecha=data.fecha, km_odometro=data.km_odometro,
        proveedor=data.proveedor, costo=data.costo,
        profundidad_anterior=neu.profundidad_actual, profundidad_nueva=data.profundidad_nueva,
    )
    neu.profundidad_actual = data.profundidad_nueva
    if data.costo:
        neu.costo = (neu.costo or 0) + data.costo
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/reesculturado/{resc_id}/deshacer", response_model=ReesculturadoResponse)
async def deshacer_reesculturado(resc_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMReesculturado, resc_id)
    if not obj:
        raise HTTPException(404, "Registro de reesculturado no encontrado")
    if obj.deshecho:
        raise HTTPException(409, "Este reesculturado ya fue deshecho")
    neu = await db.get(EAMNeumatico, obj.neumatico_id)
    if neu:
        neu.profundidad_actual = obj.profundidad_anterior
        if obj.costo:
            neu.costo = max((neu.costo or 0) - obj.costo, 0)
    obj.deshecho = True
    obj.fecha_deshecho = datetime.utcnow()
    await db.commit(); await db.refresh(obj)
    return obj

@router.get("/neumaticos/{nid}/reesculturados", response_model=List[ReesculturadoResponse])
async def list_reesculturados(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMReesculturado).where(EAMReesculturado.neumatico_id == nid)
        .order_by(EAMReesculturado.fecha.desc())
    )
    return r.scalars().all()

@router.post("/neumaticos/{nid}/recuperar-banda")
async def recuperar_banda(nid: int, data: RecuperarBandaCreate, db: AsyncSession = Depends(get_db)):
    """Transfiere la banda en buen estado de una carcasa dañada (origen) hacia
    otra llanta destino: mueve mm/costo proporcional y descarta la llanta origen."""
    origen = await db.get(EAMNeumatico, nid)
    destino = await db.get(EAMNeumatico, data.neumatico_destino_id)
    if not origen or not destino:
        raise HTTPException(404, "Neumático no encontrado")
    if origen.id == destino.id:
        raise HTTPException(400, "El origen y destino deben ser llantas distintas")

    mm = data.mm_transferidos if data.mm_transferidos is not None else origen.profundidad_actual
    costo = data.costo_transferido or 0

    if mm is not None:
        destino.profundidad_actual = mm
        if destino.profundidad_diseño is None or destino.profundidad_diseño < mm:
            destino.profundidad_diseño = mm
    if costo:
        destino.costo = (destino.costo or 0) + costo
        motivo = await _get_or_create_ajuste_motivo(db, "Recuperación de banda")
        db.add(EAMAjusteNeumatico(
            neumatico_id=origen.id, motivo_id=motivo.id, fecha=data.fecha.date(),
            valor=costo, comentarios=data.observaciones or f"Banda recuperada hacia {destino.codigo}",
        ))

    origen.estado = "BAJA"
    origen.motivo_baja = f"Recuperación de banda hacia {destino.codigo}"
    origen.fecha_baja = data.fecha.date()
    origen.activo_id = None; origen.posicion = None

    vida = await _vida_abierta(db, origen.id)
    if vida:
        vida.fecha_fin = data.fecha
        vida.km_fin = origen.km_actual
        vida.profundidad_final = origen.profundidad_actual

    obs = data.observaciones or f"Recuperación de banda: {origen.codigo} → {destino.codigo}"
    db.add(EAMMovimientoNeumatico(neumatico_id=origen.id, tipo_movimiento="RECUPERACION_BANDA", fecha=data.fecha, observaciones=obs))
    db.add(EAMMovimientoNeumatico(neumatico_id=destino.id, tipo_movimiento="RECUPERACION_BANDA", fecha=data.fecha, observaciones=obs))

    await db.commit()
    return {"ok": True, "origen": origen.codigo, "destino": destino.codigo, "mm_transferidos": mm, "costo_transferido": costo}

@router.post("/neumaticos/{nid}/cambiar-zona")
async def cambiar_zona_neumatico(nid: int, data: CambiarZonaCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    zona = await db.get(EAMZonaNeumatico, data.zona_id)
    if not zona:
        raise HTTPException(404, "Zona no encontrada")
    zona_anterior = neu.zona_id
    neu.zona_id = data.zona_id
    db.add(EAMMovimientoNeumatico(
        neumatico_id=nid, tipo_movimiento="CAMBIO_ZONA", fecha=data.fecha,
        observaciones=data.observaciones or f"Cambio de zona → {zona.nombre}",
    ))
    await db.commit()
    return {"ok": True, "zona_id": neu.zona_id, "zona_anterior_id": zona_anterior}

@router.get("/neumaticos/{nid}/vidas", response_model=List[VidaNeumaticoResponse])
async def list_vidas_neumatico(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMVidaNeumatico).where(EAMVidaNeumatico.neumatico_id == nid)
        .order_by(EAMVidaNeumatico.numero_vida.desc())
    )
    return r.scalars().all()


# ── Informe consolidado y Histórico de la llanta ──

@router.get("/neumaticos/{nid}/informe")
async def informe_neumatico(nid: int, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")

    mov_r = await db.execute(
        select(EAMMovimientoNeumatico).where(EAMMovimientoNeumatico.neumatico_id == nid)
        .order_by(EAMMovimientoNeumatico.fecha.asc())
    )
    movimientos = mov_r.scalars().all()

    montajes_rotaciones, ubicaciones, zonas_hist = [], [], []
    km_anterior = None
    for m in movimientos:
        if m.tipo_movimiento in ("INSTALACION", "ROTACION", "DESMONTAJE", "VOLTEO"):
            distancia = None
            if km_anterior is not None and m.km_odometro is not None:
                distancia = max(m.km_odometro - km_anterior, 0)
            if m.km_odometro is not None:
                km_anterior = m.km_odometro
            montajes_rotaciones.append({
                "id": m.id, "tipo": m.tipo_movimiento, "fecha": m.fecha, "activo_id": m.activo_id,
                "posicion_origen": m.posicion_origen, "posicion": m.posicion,
                "km_odometro": m.km_odometro, "distancia_recorrida": distancia,
                "observaciones": m.observaciones, "tecnico": m.tecnico,
            })
        if m.bodega_id:
            ubicaciones.append({"id": m.id, "fecha": m.fecha, "bodega_id": m.bodega_id, "observaciones": m.observaciones})
        if m.tipo_movimiento == "CAMBIO_ZONA":
            zonas_hist.append({"id": m.id, "fecha": m.fecha, "observaciones": m.observaciones})

    insp_r = await db.execute(
        select(EAMInspeccionNeumatico).where(EAMInspeccionNeumatico.neumatico_id == nid)
        .order_by(EAMInspeccionNeumatico.fecha.desc())
    )
    trab_r = await db.execute(
        select(EAMTrabajoRealizadoNeumatico).where(EAMTrabajoRealizadoNeumatico.neumatico_id == nid)
        .order_by(EAMTrabajoRealizadoNeumatico.fecha.desc())
    )

    return {
        "neumatico_id": neu.id, "codigo": neu.codigo,
        "montajes_rotaciones": montajes_rotaciones,
        "ubicaciones": ubicaciones,
        "zonas": zonas_hist,
        "inspecciones": [InspeccionNeuResponse.model_validate(i) for i in insp_r.scalars().all()],
        "trabajos": [TrabajoRealizadoResponse.model_validate(t) for t in trab_r.scalars().all()],
    }

@router.get("/neumaticos/{nid}/historico")
async def historico_neumatico(nid: int, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")

    vidas_r = await db.execute(
        select(EAMVidaNeumatico).where(EAMVidaNeumatico.neumatico_id == nid).order_by(EAMVidaNeumatico.numero_vida)
    )
    vidas = vidas_r.scalars().all()

    resc_r = await db.execute(
        select(EAMReesculturado).where(EAMReesculturado.neumatico_id == nid, EAMReesculturado.deshecho == False)  # noqa: E712
    )
    costo_reesculturados = sum((r.costo or 0) for r in resc_r.scalars().all())

    trab_r = await db.execute(select(EAMTrabajoRealizadoNeumatico).where(EAMTrabajoRealizadoNeumatico.neumatico_id == nid))
    costo_trabajos = sum((t.costo_unitario or 0) * (t.cantidad or 1) for t in trab_r.scalars().all())

    ajustes_r = await db.execute(select(EAMAjusteNeumatico).where(EAMAjusteNeumatico.neumatico_id == nid))
    costo_ajustes = sum(a.valor for a in ajustes_r.scalars().all())

    veh_r = await db.execute(
        select(EAMMovimientoNeumatico.activo_id).where(
            EAMMovimientoNeumatico.neumatico_id == nid, EAMMovimientoNeumatico.activo_id.isnot(None)
        ).distinct()
    )
    vehiculos_ids = [v for (v,) in veh_r.all()]

    costo_nueva = next((v.costo for v in vidas if v.tipo == "NUEVA"), None)
    costo_reencauches = sum((v.costo or 0) for v in vidas if v.tipo == "REENCAUCHADA")

    ubicacion_actual = "—"
    if neu.activo_id:
        ubicacion_actual = f"Vehículo #{neu.activo_id}" + (f" · {neu.posicion}" if neu.posicion else "")
    elif neu.bodega_id:
        bodega = await db.get(EAMBodegaNeumatico, neu.bodega_id)
        ubicacion_actual = bodega.nombre if bodega else f"Bodega #{neu.bodega_id}"

    return {
        "informacion_basica": {
            "id": neu.id, "codigo": neu.codigo, "marca": neu.marca, "referencia": neu.referencia,
            "medida": neu.medida, "estado": neu.estado, "ubicacion_actual": ubicacion_actual,
        },
        "resumen_estadistico": {
            "numero_vidas": len(vidas),
            "numero_reencauches": neu.reencauches,
            "vehiculos_distintos": len(vehiculos_ids),
            "km_total_acumulado": neu.km_total,
            "costo_nueva": costo_nueva,
            "costo_reencauches": round(costo_reencauches, 2) if costo_reencauches else costo_reencauches,
            "costo_reesculturados": round(costo_reesculturados, 2) if costo_reesculturados else costo_reesculturados,
            "costo_trabajos": round(costo_trabajos, 2) if costo_trabajos else costo_trabajos,
            "costo_ajustes": round(costo_ajustes, 2) if costo_ajustes else costo_ajustes,
        },
        "vidas": [VidaNeumaticoResponse.model_validate(v) for v in vidas],
    }


# ── Congelar datos (snapshot histórico para comparación) ──

@router.post("/neumaticos/congelar", response_model=CongeladoResponse)
async def crear_congelado(data: CongeladoCreate, db: AsyncSession = Depends(get_db)):
    cfg = await _get_config_neu(db)
    r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.estado != "BAJA"))
    neumaticos = r.scalars().all()

    ajustes_r = await db.execute(
        select(EAMAjusteNeumatico.neumatico_id, func.sum(EAMAjusteNeumatico.valor))
        .group_by(EAMAjusteNeumatico.neumatico_id)
    )
    ajustes_map = {nid: total or 0 for nid, total in ajustes_r.all()}

    congelado = EAMCongeladoNeumatico(fecha=datetime.utcnow(), descripcion=data.descripcion)
    db.add(congelado)
    await db.flush()

    for n in neumaticos:
        km = n.km_total or 0
        pd_ = n.profundidad_diseño
        pa = n.profundidad_actual
        mm_gastados = (pd_ - pa) if (pd_ is not None and pa is not None) else None
        ajustes = ajustes_map.get(n.id, 0)
        costo_neto = max((n.costo or 0) - ajustes, 0) if (n.costo or ajustes) else None
        cpk = (costo_neto / km) if (costo_neto and km > 0) else None
        costo_mm = (costo_neto / mm_gastados) if (costo_neto and mm_gastados and mm_gastados > 0) else None
        db.add(EAMCongeladoDetalleNeumatico(
            congelado_id=congelado.id, neumatico_id=n.id, codigo=n.codigo, marca=n.marca, medida=n.medida,
            estado=n.estado, km_total=km, costo=n.costo, costo_neto=costo_neto,
            cpk=round(cpk, 2) if cpk else None, costo_mm=round(costo_mm, 2) if costo_mm else None,
            mm_gastados=round(mm_gastados, 1) if mm_gastados is not None else None,
        ))

    await db.commit()
    await db.refresh(congelado)
    return congelado

@router.get("/neumaticos/congelados", response_model=List[CongeladoResponse])
async def list_congelados(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMCongeladoNeumatico).order_by(EAMCongeladoNeumatico.fecha.desc()))
    return r.scalars().all()

@router.get("/neumaticos/congelados/{cid}/detalle", response_model=List[CongeladoDetalleResponse])
async def list_congelado_detalle(cid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMCongeladoDetalleNeumatico).where(EAMCongeladoDetalleNeumatico.congelado_id == cid)
        .order_by(EAMCongeladoDetalleNeumatico.codigo)
    )
    return r.scalars().all()

@router.delete("/neumaticos/congelados/{cid}", status_code=204)
async def delete_congelado(cid: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete as sa_delete
    obj = await db.get(EAMCongeladoNeumatico, cid)
    if obj:
        await db.execute(sa_delete(EAMCongeladoDetalleNeumatico).where(EAMCongeladoDetalleNeumatico.congelado_id == cid))
        await db.delete(obj)
        await db.commit()


# ── Importación y eliminación masiva de llantas ──

class NeumaticoBulkCreate(BaseModel):
    items: List[NeumaticCreate]

class NeumaticoBulkDeleteRequest(BaseModel):
    ids: List[int]
    confirmacion: str

async def _eliminar_neumatico_con_hijos(db: AsyncSession, nid: int) -> None:
    from sqlalchemy import delete as sa_delete
    for modelo in (
        EAMMovimientoNeumatico, EAMInspeccionNeumatico, EAMVidaNeumatico,
        EAMReesculturado, EAMAjusteNeumatico, EAMTrabajoRealizadoNeumatico,
        EAMReencaucheDetalle, EAMCongeladoDetalleNeumatico,
    ):
        await db.execute(sa_delete(modelo).where(modelo.neumatico_id == nid))
    await db.execute(sa_delete(EAMNeumatico).where(EAMNeumatico.id == nid))

def _mensaje_error_fila(e: Exception, codigo: Optional[str] = None) -> str:
    """Traduce los errores de base de datos a algo entendible para el usuario.
    Sin esto, la interfaz mostraba el volcado completo de SQLAlchemy (SQL,
    parámetros y traza) dentro del listado de errores de la carga masiva."""
    texto = str(e)
    if "UniqueViolationError" in texto or "duplicate key value" in texto:
        return f"El código {codigo} ya está registrado." if codigo else "El código ya está registrado."
    if "ForeignKeyViolationError" in texto or "violates foreign key" in texto:
        return "Alguna referencia no existe (bodega, zona o catálogo). Verifica los datos de la fila."
    if "NotNullViolationError" in texto or "null value in column" in texto:
        return "Faltan datos obligatorios en la fila."
    if "invalid input syntax" in texto or "DataError" in texto:
        return "Hay un valor con formato inválido (por ejemplo texto donde se espera un número)."
    # Caso no contemplado: se recorta para no volcar la traza entera en pantalla.
    return texto.splitlines()[0][:200] if texto else "Error al procesar la fila."


@router.post("/neumaticos/bulk")
async def crear_neumaticos_masivo(data: NeumaticoBulkCreate, db: AsyncSession = Depends(get_db)):
    exitosos = 0
    errores = []
    for i, item in enumerate(data.items):
        try:
            valores = await _preparar_neumatico(db, item)
            async with db.begin_nested():
                obj = EAMNeumatico(**valores)
                db.add(obj)
                await db.flush()
                reencauches = obj.reencauches or 0
                db.add(EAMVidaNeumatico(
                    neumatico_id=obj.id,
                    numero_vida=reencauches + 1,
                    tipo="NUEVA" if reencauches == 0 else "REENCAUCHADA",
                    fecha_inicio=datetime.utcnow(), km_inicio=obj.km_inicio or 0,
                    costo=obj.costo, profundidad_inicial=obj.profundidad_diseño,
                ))
            exitosos += 1
        except ValueError as e:
            errores.append({"fila": i + 2, "codigo": item.codigo, "mensaje": str(e)})
        except Exception as e:
            errores.append({"fila": i + 2, "codigo": item.codigo, "mensaje": _mensaje_error_fila(e, item.codigo)})
    await db.commit()
    return {"total": len(data.items), "exitosos": exitosos, "errores": errores}

@router.post("/neumaticos/bulk-delete")
async def eliminar_neumaticos_masivo(data: NeumaticoBulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    if data.confirmacion.strip().upper() != "ELIMINAR":
        raise HTTPException(400, "Debes escribir ELIMINAR para confirmar")
    eliminados = 0
    for nid in data.ids:
        obj = await db.get(EAMNeumatico, nid)
        if obj:
            await _eliminar_neumatico_con_hijos(db, nid)
            eliminados += 1
    await db.commit()
    return {"eliminados": eliminados, "solicitados": len(data.ids)}


# ── Inspecciones ──
def _min_prof(*vals) -> Optional[float]:
    xs = [v for v in vals if v is not None]
    return min(xs) if xs else None

@router.post("/neumaticos/{nid}/inspecciones", response_model=InspeccionNeuResponse)
async def crear_inspeccion(nid: int, data: InspeccionNeuCreate, db: AsyncSession = Depends(get_db)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    obj = EAMInspeccionNeumatico(neumatico_id=nid, **data.model_dump())
    if obj.posicion is None:
        obj.posicion = neu.posicion
    db.add(obj)
    # Actualiza el estado actual del neumático con la última medición.
    # Convención: profundidad_izq = hombro EXTERNO, profundidad_der = hombro INTERNO.
    pmin = _min_prof(data.profundidad_izq, data.profundidad_centro, data.profundidad_der)
    if pmin is not None:
        neu.profundidad_actual = pmin
    if data.profundidad_izq is not None:
        neu.profundidad_externa = data.profundidad_izq
    if data.profundidad_der is not None:
        neu.profundidad_interna = data.profundidad_der
    if data.presion_psi is not None:
        neu.presion_actual = data.presion_psi
    if data.km_odometro is not None:
        neu.km_actual = data.km_odometro
        neu.km_total = max(0.0, (neu.km_actual or 0) - (neu.km_inicio or 0))
    await db.commit(); await db.refresh(obj)
    r = InspeccionNeuResponse.model_validate(obj)
    r.profundidad_min = _min_prof(obj.profundidad_izq, obj.profundidad_centro, obj.profundidad_der)
    return r


# ── Inspecciones masivas (carga por archivo plano, referenciando la llanta por código) ──
class InspeccionBulkItem(BaseModel):
    codigo: str
    fecha: datetime
    profundidad_izq: Optional[float] = None
    profundidad_centro: Optional[float] = None
    profundidad_der: Optional[float] = None
    presion_psi: Optional[float] = None
    km_odometro: Optional[float] = None
    estado_visual: Optional[str] = None
    tecnico: Optional[str] = None
    observaciones: Optional[str] = None

class InspeccionBulkCreate(BaseModel):
    items: List[InspeccionBulkItem]

@router.post("/neumaticos/inspecciones/bulk")
async def crear_inspecciones_masivo(data: InspeccionBulkCreate, db: AsyncSession = Depends(get_db)):
    exitosos = 0
    errores = []
    for i, item in enumerate(data.items):
        try:
            async with db.begin_nested():
                r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.codigo == item.codigo))
                neu = r.scalar_one_or_none()
                if not neu:
                    raise ValueError(f"Llanta con código '{item.codigo}' no encontrada")
                obj = EAMInspeccionNeumatico(
                    neumatico_id=neu.id, posicion=neu.posicion, fecha=item.fecha,
                    profundidad_izq=item.profundidad_izq, profundidad_centro=item.profundidad_centro,
                    profundidad_der=item.profundidad_der, presion_psi=item.presion_psi,
                    km_odometro=item.km_odometro, estado_visual=item.estado_visual,
                    tecnico=item.tecnico, observaciones=item.observaciones,
                )
                db.add(obj)
                pmin = _min_prof(item.profundidad_izq, item.profundidad_centro, item.profundidad_der)
                if pmin is not None:
                    neu.profundidad_actual = pmin
                if item.profundidad_izq is not None:
                    neu.profundidad_externa = item.profundidad_izq
                if item.profundidad_der is not None:
                    neu.profundidad_interna = item.profundidad_der
                if item.presion_psi is not None:
                    neu.presion_actual = item.presion_psi
                if item.km_odometro is not None:
                    neu.km_actual = item.km_odometro
                    neu.km_total = max(0.0, (neu.km_actual or 0) - (neu.km_inicio or 0))
            exitosos += 1
        except Exception as e:
            errores.append({"fila": i + 2, "codigo": item.codigo, "mensaje": str(e)})
    await db.commit()
    return {"total": len(data.items), "exitosos": exitosos, "errores": errores}

@router.get("/neumaticos/{nid}/inspecciones", response_model=List[InspeccionNeuResponse])
async def list_inspecciones(nid: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMInspeccionNeumatico).where(EAMInspeccionNeumatico.neumatico_id == nid)
        .order_by(EAMInspeccionNeumatico.fecha.asc())
    )
    out = []
    for i in r.scalars().all():
        resp = InspeccionNeuResponse.model_validate(i)
        resp.profundidad_min = _min_prof(i.profundidad_izq, i.profundidad_centro, i.profundidad_der)
        out.append(resp)
    return out


# ── Indicadores / CPK ──
@router.get("/neumaticos/indicadores", response_model=List[IndicadorNeuResponse])
async def indicadores_neumaticos(db: AsyncSession = Depends(get_db)):
    cfg = await _get_config_neu(db)
    r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.estado != "BAJA"))
    neumaticos = r.scalars().all()

    ajustes_r = await db.execute(
        select(EAMAjusteNeumatico.neumatico_id, func.sum(EAMAjusteNeumatico.valor))
        .group_by(EAMAjusteNeumatico.neumatico_id)
    )
    ajustes_map = {nid: total or 0 for nid, total in ajustes_r.all()}

    out: List[IndicadorNeuResponse] = []
    for n in neumaticos:
        km = n.km_total or 0
        pd = n.profundidad_diseño
        pa = n.profundidad_actual
        mm_gastados = (pd - pa) if (pd is not None and pa is not None) else None
        usable = (pd - cfg.profundidad_minima) if pd is not None else None
        ajustes = ajustes_map.get(n.id, 0)
        costo_neto = max((n.costo or 0) - ajustes, 0) if (n.costo or ajustes) else None
        cpk = (costo_neto / km) if (costo_neto and km > 0) else None
        costo_mm = (costo_neto / mm_gastados) if (costo_neto and mm_gastados and mm_gastados > 0) else None
        km_proy = None
        if mm_gastados and mm_gastados > 0 and km > 0 and usable and usable > 0:
            km_proy = round(usable * km / mm_gastados, 0)
        pct = round(mm_gastados / usable * 100, 1) if (mm_gastados is not None and usable and usable > 0) else None
        out.append(IndicadorNeuResponse(
            neumatico_id=n.id, codigo=n.codigo, marca=n.marca, medida=n.medida,
            estado=n.estado, posicion=n.posicion, km_total=km, costo=n.costo,
            ajustes=round(ajustes, 2) if ajustes else None,
            costo_neto=round(costo_neto, 2) if costo_neto is not None else None,
            cpk=round(cpk, 2) if cpk else None, costo_mm=round(costo_mm, 2) if costo_mm else None,
            mm_gastados=round(mm_gastados, 1) if mm_gastados is not None else None,
            vida_util_km=n.vida_util_km, km_proyectado=km_proy, pct_desgaste=pct,
        ))
    return out


class UltimaInspeccionResponse(BaseModel):
    neumatico_id: int
    codigo: str
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    estado: Optional[str] = None
    # Ubicacion actual
    activo_id: Optional[int] = None
    vehiculo: Optional[str] = None
    posicion: Optional[str] = None
    # Vida en curso: VN o R{n}
    vida: Optional[str] = None
    # Ultima inspeccion registrada
    fecha_ultima: Optional[datetime] = None
    profundidad_min: Optional[float] = None
    presion_psi: Optional[float] = None
    tecnico: Optional[str] = None
    dias_desde: Optional[int] = None
    # Metricas de la vida actual
    km_vida: Optional[float] = None
    costo_vida: Optional[float] = None
    cpk: Optional[float] = None


@router.get("/neumaticos/inspecciones/ultimas", response_model=List[UltimaInspeccionResponse])
async def ultimas_inspecciones(db: AsyncSession = Depends(get_db)):
    """Una fila por llanta con su ultima inspeccion y los indicadores de la vida
    en curso: profundidad minima medida, kilometraje recorrido en esa vida y CPK.
    Se ordena por fecha de inspeccion descendente; las que nunca se inspeccionaron
    quedan al final."""
    r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.estado != "BAJA"))
    neumaticos = r.scalars().all()
    if not neumaticos:
        return []
    ids = [n.id for n in neumaticos]

    # Ultima inspeccion de cada llanta
    r = await db.execute(
        select(EAMInspeccionNeumatico)
        .where(EAMInspeccionNeumatico.neumatico_id.in_(ids))
        .order_by(EAMInspeccionNeumatico.neumatico_id, EAMInspeccionNeumatico.fecha.desc())
    )
    ultima_por_llanta = {}
    for insp in r.scalars().all():
        if insp.neumatico_id not in ultima_por_llanta:
            ultima_por_llanta[insp.neumatico_id] = insp

    # Vida abierta de cada llanta (para km y costo de esa vida)
    r = await db.execute(
        select(EAMVidaNeumatico)
        .where(EAMVidaNeumatico.neumatico_id.in_(ids), EAMVidaNeumatico.fecha_fin.is_(None))
    )
    vida_por_llanta = {v.neumatico_id: v for v in r.scalars().all()}

    # Nombre del vehiculo donde esta montada
    activos_ids = [n.activo_id for n in neumaticos if n.activo_id]
    vehiculos = {}
    if activos_ids:
        r = await db.execute(select(EAMActivo).where(EAMActivo.id.in_(activos_ids)))
        for a in r.scalars().all():
            vehiculos[a.id] = a.placa or a.codigo

    ahora = datetime.utcnow()
    salida: List[UltimaInspeccionResponse] = []
    for n in neumaticos:
        insp = ultima_por_llanta.get(n.id)
        vida = vida_por_llanta.get(n.id)

        # Con registro de vida se toma el km recorrido desde que inicio esa vida.
        # Las llantas anteriores al registro de vidas no lo tienen: para esas se
        # usa el km acumulado de la llanta, que es la mejor aproximacion y es el
        # mismo criterio que usa el calculo de indicadores.
        if vida is not None and n.km_actual is not None:
            km_vida = max(0.0, (n.km_actual or 0) - (vida.km_inicio or 0))
        else:
            km_vida = n.km_total
        costo_vida = (vida.costo if vida is not None else None) or n.costo
        cpk = (costo_vida / km_vida) if (costo_vida and km_vida and km_vida > 0) else None

        reenc = n.reencauches or 0
        dias = None
        if insp is not None and insp.fecha is not None:
            dias = max(0, (ahora - insp.fecha).days)

        salida.append(UltimaInspeccionResponse(
            neumatico_id=n.id, codigo=n.codigo, marca=n.marca, referencia=n.referencia,
            medida=n.medida, estado=n.estado,
            activo_id=n.activo_id, vehiculo=vehiculos.get(n.activo_id), posicion=n.posicion,
            vida="VN" if reenc == 0 else "R%d" % reenc,
            fecha_ultima=insp.fecha if insp is not None else None,
            profundidad_min=_min_prof(
                insp.profundidad_izq, insp.profundidad_centro, insp.profundidad_der
            ) if insp is not None else n.profundidad_actual,
            presion_psi=insp.presion_psi if insp is not None else n.presion_actual,
            tecnico=insp.tecnico if insp is not None else None,
            dias_desde=dias,
            km_vida=round(km_vida, 1) if km_vida is not None else None,
            costo_vida=costo_vida,
            cpk=round(cpk, 2) if cpk else None,
        ))

    # Mas reciente primero; sin inspeccion al final
    salida.sort(key=lambda x: (x.fecha_ultima is None, -(x.fecha_ultima.timestamp() if x.fecha_ultima else 0)))
    return salida


class InspeccionHistorialResponse(BaseModel):
    id: int
    neumatico_id: int
    codigo: str
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    estado_llanta: Optional[str] = None
    vida: Optional[str] = None
    activo_id: Optional[int] = None
    vehiculo: Optional[str] = None
    posicion: Optional[str] = None
    fecha: Optional[datetime] = None
    profundidad_izq: Optional[float] = None
    profundidad_centro: Optional[float] = None
    profundidad_der: Optional[float] = None
    profundidad_min: Optional[float] = None
    presion_psi: Optional[float] = None
    km_odometro: Optional[float] = None
    estado_visual: Optional[str] = None
    observaciones: Optional[str] = None
    tecnico: Optional[str] = None


@router.get("/neumaticos/inspecciones", response_model=List[InspeccionHistorialResponse])
async def historial_inspecciones(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    activo_id: Optional[int] = None,
    neumatico_id: Optional[int] = None,
    limite: int = 5000,
    db: AsyncSession = Depends(get_db),
):
    """Todas las inspecciones registradas (no solo la ultima de cada llanta),
    de la mas reciente a la mas antigua, con los datos de la llanta y del
    vehiculo donde estaba montada."""
    q = select(EAMInspeccionNeumatico, EAMNeumatico).join(
        EAMNeumatico, EAMNeumatico.id == EAMInspeccionNeumatico.neumatico_id
    )
    if desde is not None:
        q = q.where(EAMInspeccionNeumatico.fecha >= desde)
    if hasta is not None:
        q = q.where(EAMInspeccionNeumatico.fecha <= hasta)
    if activo_id is not None:
        q = q.where(EAMNeumatico.activo_id == activo_id)
    if neumatico_id is not None:
        q = q.where(EAMInspeccionNeumatico.neumatico_id == neumatico_id)
    r = await db.execute(q.order_by(EAMInspeccionNeumatico.fecha.desc()).limit(limite))
    filas = r.all()

    activos_ids = {n.activo_id for _, n in filas if n.activo_id}
    vehiculos = {}
    if activos_ids:
        ra = await db.execute(select(EAMActivo).where(EAMActivo.id.in_(activos_ids)))
        for a in ra.scalars().all():
            vehiculos[a.id] = a.placa or a.codigo

    salida = []
    for insp, n in filas:
        reenc = n.reencauches or 0
        salida.append(InspeccionHistorialResponse(
            id=insp.id, neumatico_id=n.id, codigo=n.codigo, marca=n.marca,
            referencia=n.referencia, medida=n.medida, estado_llanta=n.estado,
            vida="VN" if reenc == 0 else "R%d" % reenc,
            activo_id=n.activo_id, vehiculo=vehiculos.get(n.activo_id),
            posicion=insp.posicion or n.posicion,
            fecha=insp.fecha,
            profundidad_izq=insp.profundidad_izq, profundidad_centro=insp.profundidad_centro,
            profundidad_der=insp.profundidad_der,
            profundidad_min=_min_prof(insp.profundidad_izq, insp.profundidad_centro, insp.profundidad_der),
            presion_psi=insp.presion_psi, km_odometro=insp.km_odometro,
            estado_visual=insp.estado_visual, observaciones=insp.observaciones, tecnico=insp.tecnico,
        ))
    return salida


# -- Reportes de neumaticos ----------------------------------------------------

class LlantaEnPosicionReporte(BaseModel):
    posicion: str
    posicion_label: Optional[str] = None
    numero: Optional[int] = None
    eje: Optional[int] = None
    lado: Optional[str] = None
    neumatico_id: Optional[int] = None
    codigo: Optional[str] = None
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    vida: Optional[str] = None
    profundidad_min: Optional[float] = None
    presion_psi: Optional[float] = None
    fecha_inspeccion: Optional[datetime] = None
    observaciones: Optional[str] = None
    alerta: Optional[str] = None


class VehiculoReporte(BaseModel):
    activo_id: int
    codigo: str
    placa: Optional[str] = None
    nombre: Optional[str] = None
    numero_ejes: Optional[int] = None
    layout: Optional[List[int]] = None
    tiene_repuesto: Optional[bool] = None
    cantidad_repuestos: Optional[int] = None
    odometro: Optional[float] = None
    posiciones: List[LlantaEnPosicionReporte] = []
    observaciones: List[str] = []
    total_posiciones: int = 0
    posiciones_ocupadas: int = 0
    criticas: int = 0


@router.get("/neumaticos/reportes/estado-flota", response_model=List[VehiculoReporte])
async def reporte_estado_flota(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    activo_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Estado actual de la flota: por cada vehiculo, su esquema de posiciones con
    la llanta montada en cada una, la profundidad de su ultima inspeccion dentro
    del periodo y las observaciones registradas."""
    cfg = await _get_config_neu(db)

    q = select(EAMActivo).where(EAMActivo.activo == True, EAMActivo.numero_ejes.isnot(None))
    if activo_id is not None:
        q = q.where(EAMActivo.id == activo_id)
    r = await db.execute(q.order_by(EAMActivo.codigo))
    activos = r.scalars().all()
    if not activos:
        return []

    r = await db.execute(select(EAMNeumatico).where(
        EAMNeumatico.estado == "INSTALADO",
        EAMNeumatico.activo_id.in_([a.id for a in activos]),
    ))
    montadas = r.scalars().all()
    por_activo_pos = {(n.activo_id, n.posicion): n for n in montadas}

    # Ultima inspeccion de cada llanta dentro del periodo pedido
    ultima_insp = {}
    if montadas:
        qi = select(EAMInspeccionNeumatico).where(
            EAMInspeccionNeumatico.neumatico_id.in_([n.id for n in montadas])
        )
        if desde is not None:
            qi = qi.where(EAMInspeccionNeumatico.fecha >= desde)
        if hasta is not None:
            qi = qi.where(EAMInspeccionNeumatico.fecha <= hasta)
        ri = await db.execute(qi.order_by(
            EAMInspeccionNeumatico.neumatico_id, EAMInspeccionNeumatico.fecha.desc()
        ))
        for insp in ri.scalars().all():
            if insp.neumatico_id not in ultima_insp:
                ultima_insp[insp.neumatico_id] = insp

    salida: List[VehiculoReporte] = []
    for a in activos:
        posiciones_layout = _generar_posiciones(
            a.numero_ejes, a.tiene_repuesto if a.tiene_repuesto is not None else True,
            layout=a.layout_llantas, cantidad_repuestos=a.cantidad_repuestos or 1,
        )
        filas: List[LlantaEnPosicionReporte] = []
        observaciones: List[str] = []
        criticas = 0
        ocupadas = 0

        for p in posiciones_layout:
            n = por_activo_pos.get((a.id, p["codigo"]))
            fila = LlantaEnPosicionReporte(
                posicion=p["codigo"], posicion_label=p.get("label"),
                numero=p.get("numero"), eje=p.get("eje"), lado=p.get("lado"),
            )
            if n is not None:
                ocupadas += 1
                insp = ultima_insp.get(n.id)
                prof = None
                if insp is not None:
                    prof = _min_prof(insp.profundidad_izq, insp.profundidad_centro, insp.profundidad_der)
                if prof is None:
                    prof = n.profundidad_actual
                reenc = n.reencauches or 0
                fila.neumatico_id = n.id
                fila.codigo = n.codigo
                fila.marca = n.marca
                fila.referencia = n.referencia
                fila.medida = n.medida
                fila.vida = "VN" if reenc == 0 else "R%d" % reenc
                fila.profundidad_min = prof
                fila.presion_psi = insp.presion_psi if insp is not None else n.presion_actual
                fila.fecha_inspeccion = insp.fecha if insp is not None else None
                fila.observaciones = insp.observaciones if insp is not None else None

                if prof is not None and prof <= cfg.profundidad_minima:
                    fila.alerta = "Profundidad en o bajo el minimo (%s mm)" % cfg.profundidad_minima
                    criticas += 1
                elif insp is None:
                    fila.alerta = "Sin inspeccion en el periodo"

                if fila.observaciones:
                    etiqueta = p.get("label") or p["codigo"]
                    observaciones.append("%s (%s): %s" % (etiqueta, n.codigo, fila.observaciones))
                if fila.alerta:
                    etiqueta = p.get("label") or p["codigo"]
                    observaciones.append("%s (%s): %s" % (etiqueta, n.codigo, fila.alerta))
            filas.append(fila)

        salida.append(VehiculoReporte(
            activo_id=a.id, codigo=a.codigo, placa=a.placa, nombre=a.nombre,
            numero_ejes=a.numero_ejes, layout=a.layout_llantas,
            tiene_repuesto=a.tiene_repuesto, cantidad_repuestos=a.cantidad_repuestos,
            odometro=a.odometro_actual, posiciones=filas, observaciones=observaciones,
            total_posiciones=len(filas), posiciones_ocupadas=ocupadas, criticas=criticas,
        ))
    return salida


class ComposicionItem(BaseModel):
    grupo: str
    valor: str
    cantidad: int
    porcentaje: float


@router.get("/neumaticos/reportes/composicion", response_model=List[ComposicionItem])
async def reporte_composicion(
    solo_montadas: bool = True, db: AsyncSession = Depends(get_db),
):
    """Composicion de las llantas: como se reparte el parque por marca, medida,
    vida (VN/R) y estado. Por defecto solo las que estan a piso (montadas)."""
    q = select(EAMNeumatico).where(EAMNeumatico.estado != "BAJA")
    if solo_montadas:
        q = q.where(EAMNeumatico.estado == "INSTALADO")
    r = await db.execute(q)
    llantas = r.scalars().all()
    total = len(llantas)
    if total == 0:
        return []

    def contar(clave):
        conteo = {}
        for n in llantas:
            v = clave(n) or "Sin dato"
            conteo[v] = conteo.get(v, 0) + 1
        return conteo

    grupos = [
        ("Marca", contar(lambda n: n.marca)),
        ("Medida", contar(lambda n: n.medida)),
        ("Referencia", contar(lambda n: n.referencia)),
        ("Vida", contar(lambda n: "VN" if (n.reencauches or 0) == 0 else "R%d" % n.reencauches)),
        ("Estado", contar(lambda n: n.estado)),
        ("Tipo de uso", contar(lambda n: n.tipo_uso)),
    ]
    salida: List[ComposicionItem] = []
    for nombre, conteo in grupos:
        for valor, cantidad in sorted(conteo.items(), key=lambda kv: -kv[1]):
            salida.append(ComposicionItem(
                grupo=nombre, valor=str(valor), cantidad=cantidad,
                porcentaje=round(cantidad / total * 100, 1),
            ))
    return salida


# -- Alertas (profundidad / presion / desalineacion) --
@router.get("/neumaticos/alertas", response_model=List[AlertaNeuResponse])
async def alertas_neumaticos(db: AsyncSession = Depends(get_db)):
    cfg = await _get_config_neu(db)
    r = await db.execute(select(EAMNeumatico).where(EAMNeumatico.estado != "BAJA"))
    neus = r.scalars().all()
    alertas: List[AlertaNeuResponse] = []
    for n in neus:
        if n.profundidad_actual is not None and n.profundidad_actual <= cfg.profundidad_minima:
            alertas.append(AlertaNeuResponse(
                neumatico_id=n.id, codigo=n.codigo, tipo="PROFUNDIDAD", severidad="ALTA",
                mensaje=f"Profundidad {n.profundidad_actual}mm ≤ mínimo {cfg.profundidad_minima}mm",
                posicion=n.posicion, activo_id=n.activo_id))
        if n.presion_actual is not None and (n.presion_actual < cfg.presion_min or n.presion_actual > cfg.presion_max):
            alertas.append(AlertaNeuResponse(
                neumatico_id=n.id, codigo=n.codigo, tipo="PRESION", severidad="MEDIA",
                mensaje=f"Presión {n.presion_actual}psi fuera de rango [{cfg.presion_min}-{cfg.presion_max}]",
                posicion=n.posicion, activo_id=n.activo_id))
    # Desalineación: por (vehículo, eje) comparar profundidades instaladas
    grupos: dict = {}
    for n in neus:
        if n.estado == "INSTALADO" and n.activo_id and n.profundidad_actual is not None:
            eje = _eje_de_posicion(n.posicion or "")
            if eje and eje > 0:
                grupos.setdefault((n.activo_id, eje), []).append(n)
    for (activo_id, eje), items in grupos.items():
        if len(items) < 2:
            continue
        profs = [i.profundidad_actual for i in items]
        dif = max(profs) - min(profs)
        if dif > cfg.umbral_desalineacion:
            peor = min(items, key=lambda x: x.profundidad_actual)
            alertas.append(AlertaNeuResponse(
                neumatico_id=peor.id, codigo=peor.codigo, tipo="DESALINEACION", severidad="MEDIA",
                mensaje=f"Diferencia de {round(dif,1)}mm en el eje {eje} (umbral {cfg.umbral_desalineacion}mm)",
                posicion=peor.posicion, activo_id=activo_id))
    return alertas


# ── Reencauche (lotes y detalle) ──
@router.get("/neumaticos/reencauche", response_model=List[ReencaucheLoteResponse])
async def list_reencauche_lotes(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMReencaucheLote).order_by(EAMReencaucheLote.fecha_envio.desc()))
    return r.scalars().all()

@router.post("/neumaticos/reencauche", response_model=ReencaucheLoteResponse)
async def create_reencauche_lote(data: ReencaucheLoteCreate, db: AsyncSession = Depends(get_db)):
    obj = EAMReencaucheLote(**data.model_dump(), estado="ABIERTO")
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.get("/neumaticos/reencauche/{lote_id}/detalle", response_model=List[ReencaucheDetalleResponse])
async def list_reencauche_detalle(lote_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(EAMReencaucheDetalle).where(EAMReencaucheDetalle.lote_id == lote_id))
    return r.scalars().all()

@router.post("/neumaticos/reencauche/{lote_id}/detalle", response_model=ReencaucheDetalleResponse)
async def add_reencauche_detalle(lote_id: int, data: ReencaucheDetalleCreate, db: AsyncSession = Depends(get_db)):
    lote = await db.get(EAMReencaucheLote, lote_id)
    if not lote:
        raise HTTPException(404, "Lote no encontrado")
    if lote.estado == "CERRADO":
        raise HTTPException(409, "El lote está cerrado")
    neu = await db.get(EAMNeumatico, data.neumatico_id)
    if not neu:
        raise HTTPException(404, "Neumático no encontrado")
    obj = EAMReencaucheDetalle(
        lote_id=lote_id, neumatico_id=data.neumatico_id,
        banda=data.banda, banda_id=data.banda_id, resultado="PENDIENTE",
    )
    # el neumático pasa a estado REENCAUCHE mientras está en el proceso
    neu.estado = "REENCAUCHE"; neu.activo_id = None; neu.posicion = None
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/neumaticos/reencauche/detalle/{det_id}", response_model=ReencaucheDetalleResponse)
async def procesar_reencauche_detalle(det_id: int, data: ReencaucheDetalleUpdate, db: AsyncSession = Depends(get_db)):
    det = await db.get(EAMReencaucheDetalle, det_id)
    if not det:
        raise HTTPException(404, "Detalle no encontrado")
    neu = await db.get(EAMNeumatico, det.neumatico_id)
    resultado = data.resultado.upper()
    costo = data.costo
    if costo is None and det.banda_id:
        banda = await db.get(EAMBandaReencauche, det.banda_id)
        if banda and banda.costo_defecto:
            costo = banda.costo_defecto
    det.resultado = resultado
    det.profundidad_nueva = data.profundidad_nueva
    det.vida_remanente_km = data.vida_remanente_km
    det.costo = costo
    if neu:
        if resultado == "REENCAUCHADA":
            vida_anterior = await _vida_abierta(db, neu.id)
            if vida_anterior:
                vida_anterior.fecha_fin = datetime.utcnow()
                vida_anterior.km_fin = neu.km_actual
                vida_anterior.profundidad_final = neu.profundidad_actual
            neu.reencauches = (neu.reencauches or 0) + 1
            neu.estado = "ALMACENADO"
            if data.profundidad_nueva is not None:
                neu.profundidad_actual = data.profundidad_nueva
                neu.profundidad_diseño = data.profundidad_nueva
            neu.km_inicio = neu.km_actual or 0     # reinicia el conteo de vida
            neu.km_total = 0
            if costo:
                neu.costo = costo
            db.add(EAMVidaNeumatico(
                neumatico_id=neu.id, numero_vida=(vida_anterior.numero_vida + 1) if vida_anterior else (neu.reencauches + 1),
                tipo="REENCAUCHADA", fecha_inicio=datetime.utcnow(), km_inicio=0,
                costo=costo, profundidad_inicial=data.profundidad_nueva,
            ))
        elif resultado == "REMANENTE":
            neu.estado = "ALMACENADO"
            if data.vida_remanente_km is not None:
                neu.vida_util_km = data.vida_remanente_km
        elif resultado == "RECHAZO":
            neu.estado = "BAJA"; neu.motivo_baja = "Rechazado en reencauche"
            neu.dano_id = data.dano_id
            neu.motivo_fin_vida_id = data.motivo_fin_vida_id
            vida_actual = await _vida_abierta(db, neu.id)
            if vida_actual:
                vida_actual.fecha_fin = datetime.utcnow()
                vida_actual.km_fin = neu.km_actual
                vida_actual.profundidad_final = neu.profundidad_actual
                vida_actual.motivo_cierre_id = data.motivo_fin_vida_id
    await db.commit(); await db.refresh(det)
    return det

@router.put("/neumaticos/reencauche/{lote_id}/cerrar", response_model=ReencaucheLoteResponse)
async def cerrar_reencauche_lote(lote_id: int, db: AsyncSession = Depends(get_db)):
    lote = await db.get(EAMReencaucheLote, lote_id)
    if not lote:
        raise HTTPException(404, "Lote no encontrado")
    lote.estado = "CERRADO"
    await db.commit(); await db.refresh(lote)
    return lote


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

async def _preparar_neumatico(db: AsyncSession, data: "NeumaticCreate") -> dict:
    """Valida contra el catalogo y completa los datos derivados de una llanta:
    profundidad de diseno segun referencia+dimension, profundidad actual segun
    sea nueva o usada, y coherencia del numero de reencauches."""
    _, ref, dim, rd = await _resolver_catalogo_llanta(db, data.marca, data.referencia, data.medida)

    valores = data.model_dump()
    # Se normalizan a los nombres del catalogo (evita duplicados por mayusculas)
    valores["marca"] = (await db.get(EAMMarcaNeumatico, ref.marca_id)).nombre
    valores["referencia"] = ref.nombre
    valores["medida"] = dim.nombre
    # La profundidad inicial la manda el catalogo, no quien captura
    valores["profundidad_diseño"] = rd.profundidad_inicial
    # El tipo de uso es propio del diseno de la llanta: lo define la referencia
    # en el catalogo, no quien registra cada unidad.
    valores["tipo_uso"] = ref.tipo_uso
    if rd.vida_util_km and not valores.get("vida_util_km"):
        valores["vida_util_km"] = rd.vida_util_km
    if rd.presion_recomendada and not valores.get("presion_recomendada"):
        valores["presion_recomendada"] = rd.presion_recomendada

    reencauches = valores.get("reencauches") or 0
    if reencauches < 0:
        raise ValueError("El numero de reencauches no puede ser negativo")
    valores["reencauches"] = reencauches

    es_usada = bool(valores.get("es_usada"))
    prof_actual = valores.get("profundidad_actual")
    if es_usada:
        if prof_actual is None:
            raise ValueError("Una llanta usada requiere la profundidad actual")
        if prof_actual > rd.profundidad_inicial:
            raise ValueError(
                "La profundidad actual (%s mm) no puede superar la inicial de la referencia (%s mm)"
                % (prof_actual, rd.profundidad_inicial)
            )
        if valores.get("km_actual") is None:
            raise ValueError("Una llanta usada requiere el kilometraje actual")
    else:
        # Nueva: arranca con la profundidad de diseno y sin kilometraje recorrido
        valores["profundidad_actual"] = rd.profundidad_inicial
        valores["km_actual"] = valores.get("km_actual") or 0

    km_actual = valores.get("km_actual") or 0
    valores["km_inicio"] = 0
    valores["km_actual"] = km_actual
    valores["km_total"] = km_actual
    return valores


@router.post("/neumaticos", response_model=NeumaticResponse)
async def create_neumatico(data: NeumaticCreate, db: AsyncSession = Depends(get_db)):
    try:
        valores = await _preparar_neumatico(db, data)
    except ValueError as e:
        raise HTTPException(409, str(e))
    obj = EAMNeumatico(**valores)
    db.add(obj); await db.commit(); await db.refresh(obj)
    reencauches = obj.reencauches or 0
    db.add(EAMVidaNeumatico(
        neumatico_id=obj.id,
        numero_vida=reencauches + 1,
        tipo="NUEVA" if reencauches == 0 else "REENCAUCHADA",
        fecha_inicio=datetime.utcnow(), km_inicio=obj.km_inicio or 0,
        costo=obj.costo, profundidad_inicial=obj.profundidad_diseño,
    ))
    await db.commit()
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
