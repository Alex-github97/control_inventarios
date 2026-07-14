import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, Date
from app.infrastructure.models.base import Base, TimestampMixin


# ─── Enums ────────────────────────────────────────────────────────────────────

class TipoActivoEAMEnum(str, enum.Enum):
    VEHICULO         = "VEHICULO"
    REMOLQUE         = "REMOLQUE"
    MOTOCICLETA      = "MOTOCICLETA"
    MONTACARGAS      = "MONTACARGAS"
    EQUIPO_PATIO     = "EQUIPO_PATIO"
    EQUIPO_LOGISTICO = "EQUIPO_LOGISTICO"
    MAQUINARIA       = "MAQUINARIA"
    INFRAESTRUCTURA  = "INFRAESTRUCTURA"
    BODEGA           = "BODEGA"
    EDIFICACION      = "EDIFICACION"
    EQUIPO_TECNOLOGICO = "EQUIPO_TECNOLOGICO"
    EQUIPO_INDUSTRIAL  = "EQUIPO_INDUSTRIAL"
    HERRAMIENTA        = "HERRAMIENTA"
    ACTIVO_CRITICO     = "ACTIVO_CRITICO"
    OTRO               = "OTRO"

class EstadoActivoEAMEnum(str, enum.Enum):
    OPERATIVO        = "OPERATIVO"
    EN_MANTENIMIENTO = "EN_MANTENIMIENTO"
    FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO"
    DADO_DE_BAJA     = "DADO_DE_BAJA"
    STANDBY          = "STANDBY"
    EN_GARANTIA      = "EN_GARANTIA"

class CriticidadEAMEnum(str, enum.Enum):
    BAJA    = "BAJA"
    MEDIA   = "MEDIA"
    ALTA    = "ALTA"
    CRITICA = "CRITICA"

class TipoOTEAMEnum(str, enum.Enum):
    PREVENTIVA  = "PREVENTIVA"
    CORRECTIVA  = "CORRECTIVA"
    PREDICTIVA  = "PREDICTIVA"
    EMERGENCIA  = "EMERGENCIA"
    CAMPANA     = "CAMPANA"
    CALIBRACION = "CALIBRACION"
    INSPECCION  = "INSPECCION"
    RCA         = "RCA"

class EstadoOTEAMEnum(str, enum.Enum):
    PENDIENTE            = "PENDIENTE"
    ASIGNADA             = "ASIGNADA"
    EN_EJECUCION         = "EN_EJECUCION"
    EN_ESPERA_REPUESTOS  = "EN_ESPERA_REPUESTOS"
    COMPLETADA           = "COMPLETADA"
    CANCELADA            = "CANCELADA"
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"

class TipoPreguntaEAMEnum(str, enum.Enum):
    SI_NO      = "SI_NO"
    ESCALA     = "ESCALA"
    LISTA      = "LISTA"
    NUMERICO   = "NUMERICO"
    FOTOGRAFICO = "FOTOGRAFICO"
    TEXTO      = "TEXTO"

class TipoMantenimientoEAMEnum(str, enum.Enum):
    TIEMPO    = "TIEMPO"
    USO       = "USO"
    CONDICION = "CONDICION"

class UnidadUsoEAMEnum(str, enum.Enum):
    KILOMETROS = "KILOMETROS"
    HORAS      = "HORAS"
    CICLOS     = "CICLOS"
    DIAS       = "DIAS"
    SEMANAS    = "SEMANAS"
    MESES      = "MESES"

class EstadoNeumaticEAMEnum(str, enum.Enum):
    INSTALADO  = "INSTALADO"
    ALMACENADO = "ALMACENADO"
    REENCAUCHE = "REENCAUCHE"
    BAJA       = "BAJA"

class TipoMovNeumaticEAMEnum(str, enum.Enum):
    INSTALACION = "INSTALACION"
    ROTACION    = "ROTACION"
    DESMONTAJE  = "DESMONTAJE"
    REENCAUCHE  = "REENCAUCHE"
    BAJA        = "BAJA"

class EstadoGarantiaEAMEnum(str, enum.Enum):
    VIGENTE   = "VIGENTE"
    VENCIDA   = "VENCIDA"
    RECLAMADA = "RECLAMADA"
    CANCELADA = "CANCELADA"

class ContaminacionAceiteEAMEnum(str, enum.Enum):
    NORMAL   = "NORMAL"
    MODERADA = "MODERADA"
    CRITICA  = "CRITICA"

class EstadoCalibracionEAMEnum(str, enum.Enum):
    VIGENTE  = "VIGENTE"
    VENCIDA  = "VENCIDA"
    PENDIENTE = "PENDIENTE"

class PrioridadOTEAMEnum(str, enum.Enum):
    BAJA    = "BAJA"
    MEDIA   = "MEDIA"
    ALTA    = "ALTA"
    URGENTE = "URGENTE"


# ─── Catálogos maestros ───────────────────────────────────────────────────────

class EAMTipoTrabajo(Base, TimestampMixin):
    __tablename__ = "eam_tipo_trabajo"
    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(100), nullable=False)
    descripcion = Column(Text)
    categoria   = Column(String(50))  # MECANICO, ELECTRICO, HIDRAULICO, CIVIL, etc.
    activo      = Column(Boolean, default=True)


class EAMActividad(Base, TimestampMixin):
    __tablename__ = "eam_actividad"
    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(100), nullable=False)  # Inspeccionar, Lubricar, Reemplazar...
    descripcion = Column(Text)
    activo      = Column(Boolean, default=True)


class EAMRepuesto(Base, TimestampMixin):
    __tablename__ = "eam_repuesto"
    id             = Column(Integer, primary_key=True, index=True)
    codigo         = Column(String(50), unique=True, nullable=False)
    nombre         = Column(String(200), nullable=False)
    descripcion    = Column(Text)
    categoria      = Column(String(100))
    unidad_medida  = Column(String(30))
    costo_unitario = Column(Float, default=0)
    stock_minimo   = Column(Integer, default=0)
    stock_actual   = Column(Integer, default=0)
    proveedor_ppal = Column(String(100))
    activo         = Column(Boolean, default=True)


class EAMFallaCatalogo(Base, TimestampMixin):
    __tablename__ = "eam_falla_catalogo"
    id          = Column(Integer, primary_key=True, index=True)
    codigo      = Column(String(30), unique=True)
    descripcion = Column(String(200), nullable=False)
    tipo_activo = Column(String(50))
    activo      = Column(Boolean, default=True)


class EAMCausaCatalogo(Base, TimestampMixin):
    __tablename__ = "eam_causa_catalogo"
    id          = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(200), nullable=False)
    activo      = Column(Boolean, default=True)


class EAMSolucionCatalogo(Base, TimestampMixin):
    __tablename__ = "eam_solucion_catalogo"
    id          = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(200), nullable=False)
    activo      = Column(Boolean, default=True)


class EAMContratista(Base, TimestampMixin):
    __tablename__ = "eam_contratista"
    id           = Column(Integer, primary_key=True, index=True)
    nombre       = Column(String(200), nullable=False)
    nit          = Column(String(30))
    tipo         = Column(String(50))  # TALLER, PROVEEDOR, TECNICO_EXTERNO, LABORATORIO
    especialidad = Column(String(200))
    contacto     = Column(String(100))
    telefono     = Column(String(30))
    email        = Column(String(100))
    ciudad       = Column(String(100))
    calificacion = Column(Float, default=5.0)
    activo       = Column(Boolean, default=True)


# ─── Maestro de activos ───────────────────────────────────────────────────────

class EAMActivo(Base, TimestampMixin):
    __tablename__ = "eam_activo"
    id                   = Column(Integer, primary_key=True, index=True)
    codigo               = Column(String(50), unique=True, nullable=False)
    nombre               = Column(String(200), nullable=False)
    tipo_activo          = Column(String(50))   # TipoActivoEAMEnum
    estado               = Column(String(30), default="OPERATIVO")
    criticidad           = Column(String(20), default="MEDIA")
    parent_id            = Column(Integer, ForeignKey("eam_activo.id"), nullable=True)
    marca                = Column(String(100))
    modelo               = Column(String(100))
    anio                 = Column(Integer)
    numero_serie         = Column(String(100))
    placa                = Column(String(20))
    color                = Column(String(50))
    fecha_adquisicion    = Column(Date)
    costo_adquisicion    = Column(Float)
    valor_libro          = Column(Float)
    depreciacion_anual   = Column(Float)
    vida_util_anios      = Column(Integer)
    vida_util_km         = Column(Float)
    ubicacion            = Column(String(200))
    sede                 = Column(String(100))
    area                 = Column(String(100))
    responsable          = Column(String(100))
    odometro_actual      = Column(Float, default=0)
    horometro_actual     = Column(Float, default=0)
    tipo_combustible     = Column(String(50))
    capacidad_combustible = Column(Float)
    numero_ejes          = Column(Integer, nullable=True)   # para layout de neumáticos
    tiene_repuesto       = Column(Boolean, default=True)
    imagen_url           = Column(String(500))
    especificaciones     = Column(JSON)
    activo               = Column(Boolean, default=True)


class EAMComponente(Base, TimestampMixin):
    __tablename__ = "eam_componente"
    id           = Column(Integer, primary_key=True, index=True)
    activo_id    = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    nombre       = Column(String(100), nullable=False)
    descripcion  = Column(Text)
    numero_parte = Column(String(100))
    marca        = Column(String(100))
    estado       = Column(String(30), default="BUENO")
    criticidad   = Column(String(20), default="MEDIA")
    vida_util_horas = Column(Float)
    horas_actuales  = Column(Float, default=0)


class EAMDocumentoActivo(Base, TimestampMixin):
    __tablename__ = "eam_documento_activo"
    id                = Column(Integer, primary_key=True, index=True)
    activo_id         = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    tipo              = Column(String(50))  # MANUAL, GARANTIA, POLIZA, CERT_REVISION, SOAT, TECNICO_MECANICA
    nombre            = Column(String(200), nullable=False)
    numero            = Column(String(100))
    fecha_expedicion  = Column(Date)
    fecha_vencimiento = Column(Date)
    url               = Column(String(500))
    activo            = Column(Boolean, default=True)


# ─── Checklists ───────────────────────────────────────────────────────────────

class EAMChecklistPlantilla(Base, TimestampMixin):
    __tablename__ = "eam_checklist_plantilla"
    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200), nullable=False)
    tipo_activo = Column(String(50))
    descripcion = Column(Text)
    activo      = Column(Boolean, default=True)


class EAMChecklistPregunta(Base, TimestampMixin):
    __tablename__ = "eam_checklist_pregunta"
    id             = Column(Integer, primary_key=True, index=True)
    plantilla_id   = Column(Integer, ForeignKey("eam_checklist_plantilla.id"), nullable=False)
    orden          = Column(Integer, default=0)
    seccion        = Column(String(100))
    pregunta       = Column(String(300), nullable=False)
    tipo_respuesta = Column(String(20))  # TipoPreguntaEAMEnum
    opciones       = Column(JSON)
    requiere_foto  = Column(Boolean, default=False)
    requiere_firma = Column(Boolean, default=False)
    critica        = Column(Boolean, default=False)
    activo         = Column(Boolean, default=True)


# ─── Planes de mantenimiento ──────────────────────────────────────────────────

class EAMPlanMantenimiento(Base, TimestampMixin):
    __tablename__ = "eam_plan_mantenimiento"
    id             = Column(Integer, primary_key=True, index=True)
    nombre         = Column(String(200), nullable=False)
    activo_id      = Column(Integer, ForeignKey("eam_activo.id"), nullable=True)
    tipo_activo    = Column(String(50))
    tipo_mant      = Column(String(30))  # TIEMPO, USO, CONDICION
    frecuencia     = Column(Integer)
    unidad         = Column(String(20))  # DIAS, SEMANAS, MESES, KM, HORAS
    tipo_ot        = Column(String(30), default="PREVENTIVA")
    checklist_id   = Column(Integer, ForeignKey("eam_checklist_plantilla.id"), nullable=True)
    descripcion    = Column(Text)
    costo_estimado = Column(Float)
    activo         = Column(Boolean, default=True)


class EAMPlanDetalle(Base, TimestampMixin):
    __tablename__ = "eam_plan_detalle"
    id                = Column(Integer, primary_key=True, index=True)
    plan_id           = Column(Integer, ForeignKey("eam_plan_mantenimiento.id"), nullable=False)
    actividad_id      = Column(Integer, ForeignKey("eam_actividad.id"), nullable=True)
    descripcion       = Column(String(200), nullable=False)
    repuesto_id       = Column(Integer, ForeignKey("eam_repuesto.id"), nullable=True)
    cantidad_repuesto = Column(Float)
    tiempo_estimado   = Column(Float)


# ─── Órdenes de trabajo ───────────────────────────────────────────────────────

class EAMOrdenTrabajo(Base, TimestampMixin):
    __tablename__ = "eam_orden_trabajo"
    id                    = Column(Integer, primary_key=True, index=True)
    numero                = Column(String(30), unique=True, nullable=False)
    activo_id             = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    tipo_ot               = Column(String(30))
    tipo_trabajo_id       = Column(Integer, ForeignKey("eam_tipo_trabajo.id"), nullable=True)
    estado                = Column(String(30), default="PENDIENTE")
    prioridad             = Column(String(20), default="MEDIA")
    descripcion           = Column(Text, nullable=False)
    falla_id              = Column(Integer, ForeignKey("eam_falla_catalogo.id"), nullable=True)
    causa_id              = Column(Integer, ForeignKey("eam_causa_catalogo.id"), nullable=True)
    solucion_id           = Column(Integer, ForeignKey("eam_solucion_catalogo.id"), nullable=True)
    plan_id               = Column(Integer, ForeignKey("eam_plan_mantenimiento.id"), nullable=True)
    contratista_id        = Column(Integer, ForeignKey("eam_contratista.id"), nullable=True)
    tecnico_asignado      = Column(String(100))
    fecha_requerida       = Column(DateTime)
    fecha_inicio          = Column(DateTime)
    fecha_fin             = Column(DateTime)
    odometro              = Column(Float)
    horometro             = Column(Float)
    costo_mano_obra       = Column(Float, default=0)
    costo_repuestos       = Column(Float, default=0)
    costo_servicios       = Column(Float, default=0)
    costo_total           = Column(Float, default=0)
    tiempo_estimado_horas = Column(Float)
    tiempo_real_horas     = Column(Float)
    observaciones         = Column(Text)
    creado_por            = Column(String(100))


class EAMChecklistEjecucion(Base, TimestampMixin):
    __tablename__ = "eam_checklist_ejecucion"
    id            = Column(Integer, primary_key=True, index=True)
    plantilla_id  = Column(Integer, ForeignKey("eam_checklist_plantilla.id"), nullable=False)
    activo_id     = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    ot_id         = Column(Integer, ForeignKey("eam_orden_trabajo.id"), nullable=True)
    ejecutado_por = Column(String(100))
    fecha_inicio  = Column(DateTime)
    fecha_fin     = Column(DateTime)
    estado        = Column(String(30))
    pct_conforme  = Column(Float, default=0)
    observaciones = Column(Text)
    firma_url     = Column(String(500))


class EAMChecklistRespuesta(Base, TimestampMixin):
    __tablename__ = "eam_checklist_respuesta"
    id           = Column(Integer, primary_key=True, index=True)
    ejecucion_id = Column(Integer, ForeignKey("eam_checklist_ejecucion.id"), nullable=False)
    pregunta_id  = Column(Integer, ForeignKey("eam_checklist_pregunta.id"), nullable=False)
    respuesta    = Column(Text)
    conforme     = Column(Boolean)
    observacion  = Column(Text)
    foto_url     = Column(String(500))


class EAMOTMaterial(Base, TimestampMixin):
    __tablename__ = "eam_ot_material"
    id          = Column(Integer, primary_key=True, index=True)
    ot_id       = Column(Integer, ForeignKey("eam_orden_trabajo.id"), nullable=False)
    repuesto_id = Column(Integer, ForeignKey("eam_repuesto.id"), nullable=True)
    descripcion = Column(String(200))
    cantidad    = Column(Float, nullable=False)
    unidad      = Column(String(30))
    costo_unit  = Column(Float)
    costo_total = Column(Float)


class EAMOTManoObra(Base, TimestampMixin):
    __tablename__ = "eam_ot_mano_obra"
    id          = Column(Integer, primary_key=True, index=True)
    ot_id       = Column(Integer, ForeignKey("eam_orden_trabajo.id"), nullable=False)
    tecnico     = Column(String(100), nullable=False)
    actividad   = Column(String(200))
    fecha       = Column(DateTime)
    horas       = Column(Float)
    tarifa_hora = Column(Float)
    costo_total = Column(Float)


# ─── Lubricación ──────────────────────────────────────────────────────────────

class EAMMuestraAceite(Base, TimestampMixin):
    __tablename__ = "eam_muestra_aceite"
    id              = Column(Integer, primary_key=True, index=True)
    activo_id       = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    componente_id   = Column(Integer, ForeignKey("eam_componente.id"), nullable=True)
    numero_muestra  = Column(String(50), unique=True, nullable=False)
    fecha_toma      = Column(DateTime, nullable=False)
    tipo_lubricante = Column(String(100))
    horas_aceite    = Column(Float)
    horas_equipo    = Column(Float)
    odometro        = Column(Float)
    laboratorio     = Column(String(100))
    hierro_ppm      = Column(Float)
    cobre_ppm       = Column(Float)
    aluminio_ppm    = Column(Float)
    silicio_ppm     = Column(Float)
    sodio_ppm       = Column(Float)
    agua_pct        = Column(Float)
    viscosidad_40   = Column(Float)
    viscosidad_100  = Column(Float)
    indice_viscosidad = Column(Float)
    tbn             = Column(Float)
    contaminacion   = Column(String(20), default="NORMAL")
    diagnostico     = Column(Text)
    recomendacion   = Column(Text)
    alerta          = Column(Boolean, default=False)


# ─── Neumáticos ───────────────────────────────────────────────────────────────

class EAMNeumatico(Base, TimestampMixin):
    __tablename__ = "eam_neumatico"
    id               = Column(Integer, primary_key=True, index=True)
    codigo           = Column(String(50), unique=True, nullable=False)
    marca            = Column(String(100))
    referencia       = Column(String(100))
    medida           = Column(String(50))
    tipo             = Column(String(50))
    estado           = Column(String(30), default="ALMACENADO")
    activo_id        = Column(Integer, ForeignKey("eam_activo.id"), nullable=True)
    posicion         = Column(String(30))
    fecha_instalacion = Column(Date)
    km_inicio        = Column(Float, default=0)
    km_actual        = Column(Float, default=0)
    km_total         = Column(Float, default=0)
    vida_util_km     = Column(Float)
    profundidad_diseño = Column(Float)
    profundidad_actual = Column(Float)
    costo            = Column(Float)
    proveedor        = Column(String(100))
    reencauches      = Column(Integer, default=0)
    bodega_id        = Column(Integer, ForeignKey("eam_bodega_neumatico.id"), nullable=True)
    dano_id          = Column(Integer, ForeignKey("eam_dano_neumatico_catalogo.id"), nullable=True)
    motivo_baja      = Column(String(255), nullable=True)
    fecha_baja       = Column(Date, nullable=True)


class EAMMovimientoNeumatico(Base, TimestampMixin):
    __tablename__ = "eam_movimiento_neumatico"
    id              = Column(Integer, primary_key=True, index=True)
    neumatico_id    = Column(Integer, ForeignKey("eam_neumatico.id"), nullable=False)
    tipo_movimiento = Column(String(30))
    activo_id       = Column(Integer, ForeignKey("eam_activo.id"), nullable=True)
    posicion_origen = Column(String(30))
    posicion        = Column(String(30))   # posición destino
    bodega_id       = Column(Integer, ForeignKey("eam_bodega_neumatico.id"), nullable=True)
    km_odometro     = Column(Float)
    fecha           = Column(DateTime)      # fecha y hora del movimiento
    observaciones   = Column(Text)
    tecnico         = Column(String(100))


class EAMBodegaNeumatico(Base, TimestampMixin):
    """Bodega de almacenamiento de neumáticos (fuera de vehículo)."""
    __tablename__ = "eam_bodega_neumatico"
    id        = Column(Integer, primary_key=True, index=True)
    codigo    = Column(String(50), unique=True, nullable=False)
    nombre    = Column(String(150), nullable=False)
    ubicacion = Column(String(200))
    capacidad = Column(Integer, nullable=True)
    activo    = Column(Boolean, default=True)


class EAMDanoNeumaticoCatalogo(Base, TimestampMixin):
    """Catálogo configurable de daños/causas de descarte de neumáticos."""
    __tablename__ = "eam_dano_neumatico_catalogo"
    id          = Column(Integer, primary_key=True, index=True)
    codigo      = Column(String(50), unique=True, nullable=False)
    nombre      = Column(String(150), nullable=False)
    severidad   = Column(String(20), default="MODERADO")   # LEVE/MODERADO/GRAVE
    descripcion = Column(String(300))
    # accion sugerida: REENCAUCHE / DESCARTE / INSPECCION
    accion      = Column(String(30), default="INSPECCION")
    activo      = Column(Boolean, default=True)


# ─── Combustible ──────────────────────────────────────────────────────────────

class EAMRegistroCombustible(Base, TimestampMixin):
    __tablename__ = "eam_registro_combustible"
    id               = Column(Integer, primary_key=True, index=True)
    activo_id        = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    fecha            = Column(DateTime, nullable=False)
    tipo_combustible = Column(String(50))
    litros           = Column(Float, nullable=False)
    precio_litro     = Column(Float)
    costo_total      = Column(Float)
    odometro         = Column(Float)
    horometro        = Column(Float)
    rendimiento      = Column(Float)
    proveedor        = Column(String(100))
    conductor        = Column(String(100))
    tanque_lleno     = Column(Boolean, default=False)
    observaciones    = Column(Text)


# ─── Garantías ────────────────────────────────────────────────────────────────

class EAMGarantia(Base, TimestampMixin):
    __tablename__ = "eam_garantia"
    id              = Column(Integer, primary_key=True, index=True)
    activo_id       = Column(Integer, ForeignKey("eam_activo.id"), nullable=True)
    tipo            = Column(String(50))  # ACTIVO, REPUESTO, SERVICIO
    descripcion     = Column(String(300), nullable=False)
    proveedor       = Column(String(100))
    numero_garantia = Column(String(100))
    fecha_inicio    = Column(Date, nullable=False)
    fecha_fin       = Column(Date, nullable=False)
    condiciones     = Column(Text)
    estado          = Column(String(30), default="VIGENTE")
    valor_cubierto  = Column(Float)
    reclamaciones   = Column(Integer, default=0)
    ultimo_reclamo  = Column(Date)


# ─── FMEA ─────────────────────────────────────────────────────────────────────

class EAMFMEA(Base, TimestampMixin):
    __tablename__ = "eam_fmea"
    id                 = Column(Integer, primary_key=True, index=True)
    activo_id          = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    componente_id      = Column(Integer, ForeignKey("eam_componente.id"), nullable=True)
    funcion            = Column(String(300), nullable=False)
    modo_falla         = Column(String(300), nullable=False)
    efecto_falla       = Column(Text)
    causa_falla        = Column(Text)
    severidad          = Column(Integer)
    ocurrencia         = Column(Integer)
    detectabilidad     = Column(Integer)
    npn                = Column(Integer)
    accion_recomendada = Column(Text)
    responsable        = Column(String(100))
    fecha_accion       = Column(Date)
    estado             = Column(String(30), default="PENDIENTE")
    severidad_post     = Column(Integer)
    ocurrencia_post    = Column(Integer)
    detectabilidad_post = Column(Integer)
    npn_post           = Column(Integer)


# ─── Calibraciones ────────────────────────────────────────────────────────────

class EAMCalibracion(Base, TimestampMixin):
    __tablename__ = "eam_calibracion"
    id                 = Column(Integer, primary_key=True, index=True)
    activo_id          = Column(Integer, ForeignKey("eam_activo.id"), nullable=False)
    tipo_instrumento   = Column(String(100))
    numero_certificado = Column(String(100))
    laboratorio        = Column(String(200))
    acreditacion       = Column(String(100))
    fecha_calibracion  = Column(Date, nullable=False)
    fecha_vencimiento  = Column(Date, nullable=False)
    resultado          = Column(String(50))  # CONFORME, NO_CONFORME
    estado             = Column(String(30), default="VIGENTE")
    incertidumbre      = Column(String(100))
    patron_utilizado   = Column(String(200))
    observaciones      = Column(Text)


# ─── KPIs diarios ─────────────────────────────────────────────────────────────

class EAMKPIDiario(Base, TimestampMixin):
    __tablename__ = "eam_kpi_diario"
    id                     = Column(Integer, primary_key=True, index=True)
    fecha                  = Column(Date, nullable=False, unique=True)
    total_activos          = Column(Integer, default=0)
    activos_operativos     = Column(Integer, default=0)
    activos_mantenimiento  = Column(Integer, default=0)
    activos_fuera_servicio = Column(Integer, default=0)
    disponibilidad_pct     = Column(Float, default=0)
    ots_abiertas           = Column(Integer, default=0)
    ots_completadas        = Column(Integer, default=0)
    ots_vencidas           = Column(Integer, default=0)
    ots_preventivas        = Column(Integer, default=0)
    ots_correctivas        = Column(Integer, default=0)
    ots_predictivas        = Column(Integer, default=0)
    cumplimiento_pm_pct    = Column(Float, default=0)
    mtbf_horas             = Column(Float, default=0)
    mttr_horas             = Column(Float, default=0)
    backlog_horas          = Column(Float, default=0)
    costo_mantenimiento    = Column(Float, default=0)
    costo_combustible      = Column(Float, default=0)
    costo_total            = Column(Float, default=0)
    indice_confiabilidad   = Column(Float, default=0)
    alertas_activas        = Column(Integer, default=0)
