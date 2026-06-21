from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum
from app.infrastructure.models.base import Base, TimestampMixin


# ─── Enums ────────────────────────────────────────────────────────────────────

class TipoFabricacionEnum(enum.Enum):
    DISCRETA   = 'DISCRETA'
    PROCESOS   = 'PROCESOS'
    CONTINUA   = 'CONTINUA'
    LOTES      = 'LOTES'
    MAQUILA    = 'MAQUILA'
    REEMPAQUE  = 'REEMPAQUE'
    KITTING    = 'KITTING'

class EstadoOrdenProduccionEnum(enum.Enum):
    PLANEADA      = 'PLANEADA'
    LIBERADA      = 'LIBERADA'
    EN_EJECUCION  = 'EN_EJECUCION'
    SUSPENDIDA    = 'SUSPENDIDA'
    CERRADA       = 'CERRADA'
    CANCELADA     = 'CANCELADA'

class TipoProductoMESEnum(enum.Enum):
    MATERIA_PRIMA     = 'MATERIA_PRIMA'
    SEMIELABORADO     = 'SEMIELABORADO'
    PRODUCTO_TERMINADO = 'PRODUCTO_TERMINADO'
    SUBPRODUCTO       = 'SUBPRODUCTO'
    EMPAQUE           = 'EMPAQUE'
    HERRAMIENTA       = 'HERRAMIENTA'

class TipoBOMEnum(enum.Enum):
    SIMPLE       = 'SIMPLE'
    MULTINIVEL   = 'MULTINIVEL'
    CONFIGURABLE = 'CONFIGURABLE'
    ALTERNATIVA  = 'ALTERNATIVA'

class EstadoLoteMESEnum(enum.Enum):
    ACTIVO    = 'ACTIVO'
    BLOQUEADO = 'BLOQUEADO'
    LIBERADO  = 'LIBERADO'
    CONSUMIDO = 'CONSUMIDO'
    VENCIDO   = 'VENCIDO'
    RECHAZADO = 'RECHAZADO'

class TipoParadaMESEnum(enum.Enum):
    PLANEADA       = 'PLANEADA'
    NO_PLANEADA    = 'NO_PLANEADA'
    CALIDAD        = 'CALIDAD'
    MANTENIMIENTO  = 'MANTENIMIENTO'
    SETUP          = 'SETUP'
    MATERIAL       = 'MATERIAL'

class ResultadoInspeccionMESEnum(enum.Enum):
    APROBADO    = 'APROBADO'
    RECHAZADO   = 'RECHAZADO'
    CONDICIONAL = 'CONDICIONAL'
    PENDIENTE   = 'PENDIENTE'

class TipoScrapMESEnum(enum.Enum):
    NORMAL            = 'NORMAL'
    REPROCESO         = 'REPROCESO'
    DESECHO_PELIGROSO = 'DESECHO_PELIGROSO'
    SUBPRODUCTO       = 'SUBPRODUCTO'

class EstadoEjecucionMESEnum(enum.Enum):
    PENDIENTE   = 'PENDIENTE'
    EN_PROGRESO = 'EN_PROGRESO'
    PAUSADA     = 'PAUSADA'
    COMPLETADA  = 'COMPLETADA'
    CANCELADA   = 'CANCELADA'

class TurnoMESEnum(enum.Enum):
    MANANA   = 'MANANA'
    TARDE    = 'TARDE'
    NOCHE    = 'NOCHE'
    FLEXIBLE = 'FLEXIBLE'

class PrioridadOrdenMESEnum(enum.Enum):
    BAJA    = 'BAJA'
    NORMAL  = 'NORMAL'
    ALTA    = 'ALTA'
    URGENTE = 'URGENTE'
    CRITICA = 'CRITICA'

class TipoInspeccionMESEnum(enum.Enum):
    INICIO_PRODUCCION = 'INICIO_PRODUCCION'
    EN_PROCESO        = 'EN_PROCESO'
    FINAL_LINEA       = 'FINAL_LINEA'
    LIBERACION        = 'LIBERACION'

class TipoMovimientoWIPEnum(enum.Enum):
    ENTRADA      = 'ENTRADA'
    SALIDA       = 'SALIDA'
    TRANSFERENCIA = 'TRANSFERENCIA'
    AJUSTE       = 'AJUSTE'

class NivelAlertaMESEnum(enum.Enum):
    INFO       = 'INFO'
    ADVERTENCIA = 'ADVERTENCIA'
    CRITICA    = 'CRITICA'
    EMERGENCIA = 'EMERGENCIA'


# ─── Models (FK-safe order: parents before children) ─────────────────────────

class MESPlanta(Base, TimestampMixin):
    __tablename__ = 'mes_planta'
    id          = Column(Integer, primary_key=True, index=True)
    codigo      = Column(String(30), unique=True, nullable=False)
    nombre      = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    ciudad      = Column(String(100), nullable=True)
    pais        = Column(String(100), nullable=True)
    tipo_fabricacion = Column(SAEnum(TipoFabricacionEnum), nullable=False, default=TipoFabricacionEnum.DISCRETA)
    activo      = Column(Boolean, default=True, nullable=False)
    lineas      = relationship('MESLinea', back_populates='planta', lazy='dynamic')


class MESLinea(Base, TimestampMixin):
    __tablename__ = 'mes_linea'
    id          = Column(Integer, primary_key=True, index=True)
    planta_id   = Column(Integer, ForeignKey('mes_planta.id'), nullable=False)
    codigo      = Column(String(30), nullable=False)
    nombre      = Column(String(200), nullable=False)
    capacidad_hora = Column(Float, nullable=True)
    unidad_medida  = Column(String(30), nullable=True)
    activo      = Column(Boolean, default=True, nullable=False)
    planta      = relationship('MESPlanta', back_populates='lineas')
    celdas      = relationship('MESCeldaTrabajo', back_populates='linea', lazy='dynamic')


class MESTurno(Base, TimestampMixin):
    __tablename__ = 'mes_turno'
    id          = Column(Integer, primary_key=True, index=True)
    planta_id   = Column(Integer, ForeignKey('mes_planta.id'), nullable=False)
    nombre      = Column(String(100), nullable=False)
    tipo        = Column(SAEnum(TurnoMESEnum), nullable=False, default=TurnoMESEnum.MANANA)
    hora_inicio = Column(String(8), nullable=False)
    hora_fin    = Column(String(8), nullable=False)
    duracion_horas = Column(Float, nullable=False, default=8.0)
    activo      = Column(Boolean, default=True, nullable=False)


class MESCeldaTrabajo(Base, TimestampMixin):
    __tablename__ = 'mes_celda_trabajo'
    id          = Column(Integer, primary_key=True, index=True)
    linea_id    = Column(Integer, ForeignKey('mes_linea.id'), nullable=False)
    codigo      = Column(String(30), nullable=False)
    nombre      = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    activo      = Column(Boolean, default=True, nullable=False)
    linea       = relationship('MESLinea', back_populates='celdas')
    equipos     = relationship('MESEquipo', back_populates='celda', lazy='dynamic')


class MESEquipo(Base, TimestampMixin):
    __tablename__ = 'mes_equipo'
    id          = Column(Integer, primary_key=True, index=True)
    celda_id    = Column(Integer, ForeignKey('mes_celda_trabajo.id'), nullable=True)
    codigo      = Column(String(30), unique=True, nullable=False)
    nombre      = Column(String(200), nullable=False)
    marca       = Column(String(100), nullable=True)
    modelo      = Column(String(100), nullable=True)
    serial      = Column(String(100), nullable=True)
    eam_activo_id = Column(Integer, nullable=True)
    capacidad_hora = Column(Float, nullable=True)
    activo      = Column(Boolean, default=True, nullable=False)
    celda       = relationship('MESCeldaTrabajo', back_populates='equipos')


class MESOperario(Base, TimestampMixin):
    __tablename__ = 'mes_operario'
    id            = Column(Integer, primary_key=True, index=True)
    codigo        = Column(String(30), unique=True, nullable=False)
    nombre        = Column(String(200), nullable=False)
    cedula        = Column(String(30), nullable=True)
    cargo         = Column(String(100), nullable=True)
    planta_id     = Column(Integer, ForeignKey('mes_planta.id'), nullable=True)
    hcm_empleado_id = Column(Integer, nullable=True)
    activo        = Column(Boolean, default=True, nullable=False)
    certificaciones = relationship('MESCertificacion', back_populates='operario', lazy='dynamic')


class MESCertificacion(Base, TimestampMixin):
    __tablename__ = 'mes_certificacion'
    id           = Column(Integer, primary_key=True, index=True)
    operario_id  = Column(Integer, ForeignKey('mes_operario.id'), nullable=False)
    nombre       = Column(String(200), nullable=False)
    entidad      = Column(String(200), nullable=True)
    fecha_emision  = Column(DateTime(timezone=True), nullable=True)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=True)
    activo       = Column(Boolean, default=True, nullable=False)
    operario     = relationship('MESOperario', back_populates='certificaciones')


class MESProducto(Base, TimestampMixin):
    __tablename__ = 'mes_producto'
    id            = Column(Integer, primary_key=True, index=True)
    codigo        = Column(String(50), unique=True, nullable=False)
    nombre        = Column(String(300), nullable=False)
    descripcion   = Column(Text, nullable=True)
    tipo          = Column(SAEnum(TipoProductoMESEnum), nullable=False, default=TipoProductoMESEnum.PRODUCTO_TERMINADO)
    unidad_medida = Column(String(30), nullable=False, default='UN')
    peso_kg       = Column(Float, nullable=True)
    vida_util_dias = Column(Integer, nullable=True)
    requiere_lote = Column(Boolean, default=True, nullable=False)
    activo        = Column(Boolean, default=True, nullable=False)
    boms          = relationship('MESBOM', back_populates='producto', lazy='dynamic')
    recetas       = relationship('MESReceta', back_populates='producto', lazy='dynamic')


class MESBOM(Base, TimestampMixin):
    __tablename__ = 'mes_bom'
    id          = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    version     = Column(String(20), nullable=False, default='1.0')
    tipo        = Column(SAEnum(TipoBOMEnum), nullable=False, default=TipoBOMEnum.SIMPLE)
    descripcion = Column(Text, nullable=True)
    vigente     = Column(Boolean, default=True, nullable=False)
    fecha_vigencia_inicio = Column(DateTime(timezone=True), nullable=True)
    fecha_vigencia_fin    = Column(DateTime(timezone=True), nullable=True)
    producto    = relationship('MESProducto', back_populates='boms')
    detalles    = relationship('MESBOMDetalle', back_populates='bom', lazy='dynamic')


class MESBOMDetalle(Base, TimestampMixin):
    __tablename__ = 'mes_bom_detalle'
    id           = Column(Integer, primary_key=True, index=True)
    bom_id       = Column(Integer, ForeignKey('mes_bom.id'), nullable=False)
    componente_id = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    nivel        = Column(Integer, nullable=False, default=1)
    cantidad     = Column(Float, nullable=False)
    unidad_medida = Column(String(30), nullable=False, default='UN')
    merma_pct    = Column(Float, nullable=False, default=0.0)
    es_critico   = Column(Boolean, default=False, nullable=False)
    bom          = relationship('MESBOM', back_populates='detalles')


class MESReceta(Base, TimestampMixin):
    __tablename__ = 'mes_receta'
    id           = Column(Integer, primary_key=True, index=True)
    producto_id  = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    version      = Column(String(20), nullable=False, default='1.0')
    nombre       = Column(String(200), nullable=False)
    descripcion  = Column(Text, nullable=True)
    rendimiento_pct = Column(Float, nullable=False, default=100.0)
    tiempo_proceso_min = Column(Float, nullable=True)
    temperatura  = Column(Float, nullable=True)
    vigente      = Column(Boolean, default=True, nullable=False)
    producto     = relationship('MESProducto', back_populates='recetas')
    detalles     = relationship('MESRecetaDetalle', back_populates='receta', lazy='dynamic')


class MESRecetaDetalle(Base, TimestampMixin):
    __tablename__ = 'mes_receta_detalle'
    id            = Column(Integer, primary_key=True, index=True)
    receta_id     = Column(Integer, ForeignKey('mes_receta.id'), nullable=False)
    ingrediente_id = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    cantidad      = Column(Float, nullable=False)
    porcentaje    = Column(Float, nullable=True)
    unidad_medida = Column(String(30), nullable=False, default='KG')
    orden         = Column(Integer, nullable=False, default=1)
    es_critico    = Column(Boolean, default=False, nullable=False)
    receta        = relationship('MESReceta', back_populates='detalles')


class MESOperacion(Base, TimestampMixin):
    __tablename__ = 'mes_operacion'
    id            = Column(Integer, primary_key=True, index=True)
    celda_id      = Column(Integer, ForeignKey('mes_celda_trabajo.id'), nullable=True)
    codigo        = Column(String(30), nullable=False)
    nombre        = Column(String(200), nullable=False)
    descripcion   = Column(Text, nullable=True)
    tiempo_std_min = Column(Float, nullable=True)
    requiere_inspeccion = Column(Boolean, default=False, nullable=False)
    activo        = Column(Boolean, default=True, nullable=False)


class MESOrdenProduccion(Base, TimestampMixin):
    __tablename__ = 'mes_orden_produccion'
    id              = Column(Integer, primary_key=True, index=True)
    numero          = Column(String(50), unique=True, nullable=False)
    producto_id     = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    linea_id        = Column(Integer, ForeignKey('mes_linea.id'), nullable=True)
    bom_id          = Column(Integer, ForeignKey('mes_bom.id'), nullable=True)
    receta_id       = Column(Integer, ForeignKey('mes_receta.id'), nullable=True)
    estado          = Column(SAEnum(EstadoOrdenProduccionEnum), nullable=False, default=EstadoOrdenProduccionEnum.PLANEADA)
    prioridad       = Column(SAEnum(PrioridadOrdenMESEnum), nullable=False, default=PrioridadOrdenMESEnum.NORMAL)
    cantidad_planificada = Column(Float, nullable=False)
    cantidad_producida   = Column(Float, nullable=False, default=0.0)
    cantidad_scrap       = Column(Float, nullable=False, default=0.0)
    unidad_medida   = Column(String(30), nullable=False, default='UN')
    fecha_inicio_plan = Column(DateTime(timezone=True), nullable=True)
    fecha_fin_plan    = Column(DateTime(timezone=True), nullable=True)
    fecha_inicio_real = Column(DateTime(timezone=True), nullable=True)
    fecha_fin_real    = Column(DateTime(timezone=True), nullable=True)
    responsable_id  = Column(Integer, ForeignKey('mes_operario.id'), nullable=True)
    observaciones   = Column(Text, nullable=True)
    costo_material  = Column(Float, nullable=False, default=0.0)
    costo_mano_obra = Column(Float, nullable=False, default=0.0)
    costo_indirecto = Column(Float, nullable=False, default=0.0)


class MESOrdenOperacion(Base, TimestampMixin):
    __tablename__ = 'mes_orden_operacion'
    id              = Column(Integer, primary_key=True, index=True)
    orden_id        = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    operacion_id    = Column(Integer, ForeignKey('mes_operacion.id'), nullable=False)
    secuencia       = Column(Integer, nullable=False, default=1)
    estado          = Column(SAEnum(EstadoEjecucionMESEnum), nullable=False, default=EstadoEjecucionMESEnum.PENDIENTE)
    tiempo_std_min  = Column(Float, nullable=True)
    tiempo_real_min = Column(Float, nullable=True)
    cantidad_plan   = Column(Float, nullable=True)
    cantidad_real   = Column(Float, nullable=True)


class MESLote(Base, TimestampMixin):
    __tablename__ = 'mes_lote'
    id             = Column(Integer, primary_key=True, index=True)
    numero_lote    = Column(String(100), unique=True, nullable=False)
    orden_id       = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=True)
    producto_id    = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    estado         = Column(SAEnum(EstadoLoteMESEnum), nullable=False, default=EstadoLoteMESEnum.ACTIVO)
    cantidad       = Column(Float, nullable=False)
    unidad_medida  = Column(String(30), nullable=False, default='UN')
    fecha_fabricacion  = Column(DateTime(timezone=True), nullable=True)
    fecha_vencimiento  = Column(DateTime(timezone=True), nullable=True)
    fecha_liberacion   = Column(DateTime(timezone=True), nullable=True)
    responsable_liberacion = Column(String(200), nullable=True)
    observaciones  = Column(Text, nullable=True)


class MESEjecucion(Base, TimestampMixin):
    __tablename__ = 'mes_ejecucion'
    id               = Column(Integer, primary_key=True, index=True)
    orden_id         = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    orden_operacion_id = Column(Integer, ForeignKey('mes_orden_operacion.id'), nullable=True)
    operario_id      = Column(Integer, ForeignKey('mes_operario.id'), nullable=True)
    equipo_id        = Column(Integer, ForeignKey('mes_equipo.id'), nullable=True)
    turno            = Column(SAEnum(TurnoMESEnum), nullable=False, default=TurnoMESEnum.MANANA)
    estado           = Column(SAEnum(EstadoEjecucionMESEnum), nullable=False, default=EstadoEjecucionMESEnum.PENDIENTE)
    fecha_inicio     = Column(DateTime(timezone=True), nullable=True)
    fecha_fin        = Column(DateTime(timezone=True), nullable=True)
    cantidad_producida = Column(Float, nullable=False, default=0.0)
    cantidad_scrap   = Column(Float, nullable=False, default=0.0)
    observaciones    = Column(Text, nullable=True)
    paradas          = relationship('MESParada', back_populates='ejecucion', lazy='dynamic')


class MESParada(Base, TimestampMixin):
    __tablename__ = 'mes_parada'
    id            = Column(Integer, primary_key=True, index=True)
    ejecucion_id  = Column(Integer, ForeignKey('mes_ejecucion.id'), nullable=False)
    equipo_id     = Column(Integer, ForeignKey('mes_equipo.id'), nullable=True)
    tipo          = Column(SAEnum(TipoParadaMESEnum), nullable=False)
    causa         = Column(String(200), nullable=False)
    descripcion   = Column(Text, nullable=True)
    fecha_inicio  = Column(DateTime(timezone=True), nullable=False)
    fecha_fin     = Column(DateTime(timezone=True), nullable=True)
    duracion_min  = Column(Float, nullable=True)
    ot_mantenimiento_id = Column(Integer, nullable=True)
    ejecucion     = relationship('MESEjecucion', back_populates='paradas')


class MESConsumoMaterial(Base, TimestampMixin):
    __tablename__ = 'mes_consumo_material'
    id            = Column(Integer, primary_key=True, index=True)
    orden_id      = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    producto_id   = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    lote_id       = Column(Integer, ForeignKey('mes_lote.id'), nullable=True)
    cantidad_plan = Column(Float, nullable=False)
    cantidad_real = Column(Float, nullable=False, default=0.0)
    unidad_medida = Column(String(30), nullable=False, default='UN')
    fecha_consumo = Column(DateTime(timezone=True), nullable=True)
    operario_id   = Column(Integer, ForeignKey('mes_operario.id'), nullable=True)


class MESWIP(Base, TimestampMixin):
    __tablename__ = 'mes_wip'
    id            = Column(Integer, primary_key=True, index=True)
    orden_id      = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    celda_id      = Column(Integer, ForeignKey('mes_celda_trabajo.id'), nullable=False)
    producto_id   = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    lote_id       = Column(Integer, ForeignKey('mes_lote.id'), nullable=True)
    tipo_mov      = Column(SAEnum(TipoMovimientoWIPEnum), nullable=False)
    cantidad      = Column(Float, nullable=False)
    unidad_medida = Column(String(30), nullable=False, default='UN')
    fecha_mov     = Column(DateTime(timezone=True), nullable=False)
    observaciones = Column(Text, nullable=True)


class MESInspeccion(Base, TimestampMixin):
    __tablename__ = 'mes_inspeccion'
    id             = Column(Integer, primary_key=True, index=True)
    orden_id       = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    lote_id        = Column(Integer, ForeignKey('mes_lote.id'), nullable=True)
    operario_id    = Column(Integer, ForeignKey('mes_operario.id'), nullable=False)
    tipo           = Column(SAEnum(TipoInspeccionMESEnum), nullable=False)
    resultado      = Column(SAEnum(ResultadoInspeccionMESEnum), nullable=False, default=ResultadoInspeccionMESEnum.PENDIENTE)
    fecha_inspeccion = Column(DateTime(timezone=True), nullable=False)
    muestra_tam    = Column(Integer, nullable=True)
    muestra_defectos = Column(Integer, nullable=False, default=0)
    observaciones  = Column(Text, nullable=True)
    qms_nc_id      = Column(Integer, nullable=True)
    defectos       = relationship('MESDefecto', back_populates='inspeccion', lazy='dynamic')


class MESDefecto(Base, TimestampMixin):
    __tablename__ = 'mes_defecto'
    id             = Column(Integer, primary_key=True, index=True)
    inspeccion_id  = Column(Integer, ForeignKey('mes_inspeccion.id'), nullable=False)
    codigo_defecto = Column(String(50), nullable=False)
    descripcion    = Column(String(300), nullable=False)
    cantidad       = Column(Integer, nullable=False, default=1)
    ubicacion      = Column(String(200), nullable=True)
    causa_raiz     = Column(String(300), nullable=True)
    inspeccion     = relationship('MESInspeccion', back_populates='defectos')


class MESScrap(Base, TimestampMixin):
    __tablename__ = 'mes_scrap'
    id            = Column(Integer, primary_key=True, index=True)
    orden_id      = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    producto_id   = Column(Integer, ForeignKey('mes_producto.id'), nullable=False)
    operario_id   = Column(Integer, ForeignKey('mes_operario.id'), nullable=True)
    tipo          = Column(SAEnum(TipoScrapMESEnum), nullable=False, default=TipoScrapMESEnum.NORMAL)
    causa         = Column(String(200), nullable=False)
    cantidad      = Column(Float, nullable=False)
    unidad_medida = Column(String(30), nullable=False, default='UN')
    costo_unitario = Column(Float, nullable=True)
    costo_total   = Column(Float, nullable=True)
    fecha_registro = Column(DateTime(timezone=True), nullable=False)
    es_reprocesable = Column(Boolean, default=False, nullable=False)
    observaciones = Column(Text, nullable=True)


class MESOEERegistro(Base, TimestampMixin):
    __tablename__ = 'mes_oee_registro'
    id               = Column(Integer, primary_key=True, index=True)
    linea_id         = Column(Integer, ForeignKey('mes_linea.id'), nullable=False)
    equipo_id        = Column(Integer, ForeignKey('mes_equipo.id'), nullable=True)
    fecha            = Column(DateTime(timezone=True), nullable=False)
    turno            = Column(SAEnum(TurnoMESEnum), nullable=False, default=TurnoMESEnum.MANANA)
    tiempo_planificado_min = Column(Float, nullable=False)
    tiempo_paradas_min     = Column(Float, nullable=False, default=0.0)
    tiempo_operativo_min   = Column(Float, nullable=False)
    velocidad_nominal      = Column(Float, nullable=True)
    velocidad_real         = Column(Float, nullable=True)
    produccion_real        = Column(Float, nullable=False)
    produccion_nominal     = Column(Float, nullable=False)
    produccion_buena       = Column(Float, nullable=False)
    disponibilidad   = Column(Float, nullable=True)
    rendimiento      = Column(Float, nullable=True)
    calidad          = Column(Float, nullable=True)
    oee              = Column(Float, nullable=True)


class MESChecklistPlantilla(Base, TimestampMixin):
    __tablename__ = 'mes_checklist_plantilla'
    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    aplica_a    = Column(String(100), nullable=False, default='ORDEN')
    activo      = Column(Boolean, default=True, nullable=False)
    preguntas   = relationship('MESChecklistPregunta', back_populates='plantilla', lazy='dynamic')


class MESChecklistPregunta(Base, TimestampMixin):
    __tablename__ = 'mes_checklist_pregunta'
    id            = Column(Integer, primary_key=True, index=True)
    plantilla_id  = Column(Integer, ForeignKey('mes_checklist_plantilla.id'), nullable=False)
    orden         = Column(Integer, nullable=False, default=1)
    pregunta      = Column(String(500), nullable=False)
    tipo          = Column(String(30), nullable=False, default='SI_NO')
    obligatoria   = Column(Boolean, default=True, nullable=False)
    critica       = Column(Boolean, default=False, nullable=False)
    plantilla     = relationship('MESChecklistPlantilla', back_populates='preguntas')


class MESChecklistEjecucion(Base, TimestampMixin):
    __tablename__ = 'mes_checklist_ejecucion'
    id            = Column(Integer, primary_key=True, index=True)
    orden_id      = Column(Integer, ForeignKey('mes_orden_produccion.id'), nullable=False)
    plantilla_id  = Column(Integer, ForeignKey('mes_checklist_plantilla.id'), nullable=False)
    operario_id   = Column(Integer, ForeignKey('mes_operario.id'), nullable=True)
    fecha         = Column(DateTime(timezone=True), nullable=False)
    estado        = Column(String(30), nullable=False, default='COMPLETO')
    observaciones = Column(Text, nullable=True)


class MESKPIDiario(Base, TimestampMixin):
    __tablename__ = 'mes_kpi_diario'
    id               = Column(Integer, primary_key=True, index=True)
    fecha            = Column(DateTime(timezone=True), nullable=False)
    planta_id        = Column(Integer, ForeignKey('mes_planta.id'), nullable=True)
    ordenes_planeadas = Column(Integer, nullable=False, default=0)
    ordenes_completadas = Column(Integer, nullable=False, default=0)
    oee_promedio     = Column(Float, nullable=True)
    produccion_total = Column(Float, nullable=False, default=0.0)
    scrap_total      = Column(Float, nullable=False, default=0.0)
    scrap_pct        = Column(Float, nullable=True)
    cumplimiento_pct = Column(Float, nullable=True)
    paradas_min      = Column(Float, nullable=False, default=0.0)
    inspecciones     = Column(Integer, nullable=False, default=0)
    rechazos         = Column(Integer, nullable=False, default=0)
    first_pass_yield = Column(Float, nullable=True)
