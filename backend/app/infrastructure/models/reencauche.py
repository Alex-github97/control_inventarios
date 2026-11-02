"""
Planta de reencauche (RTM) — modelos. Prefijo de tabla: rtm_

La unidad de trabajo es la CARCASA, no una cantidad: cada llanta tiene su
código, su dueño y una historia que no se edita. El MES cuenta unidades por
orden y estación; aquí cada paso de cada llanta es una fila.

El módulo guarda el PROCESO; las EXISTENCIAS las guarda el WMS. Una carcasa es
1 unidad del producto «Carcasa ‹medida›» de su dueño, con su serie; al terminar
pasa a ser 1 unidad de «Reencauchada ‹medida› · ‹banda›» con la misma serie.

Solo reencauche EN FRÍO (banda precurada y autoclave): decisión del usuario.
"""
from sqlalchemy import (
    JSON, Boolean, Column, Date, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text,
    UniqueConstraint, text,
)

from app.infrastructure.models.base import Base, TimestampMixin


# ─── Configuración ────────────────────────────────────────────────────────────

class RTMPlantaConfig(Base, TimestampMixin):
    """Fila única: dónde vive la planta en el WMS y sus parámetros."""
    __tablename__ = "rtm_planta_config"
    id                  = Column(Integer, primary_key=True)
    almacen_id          = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=True)
    ubic_recepcion_id   = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    ubic_produccion_id  = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    ubic_insumos_id     = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    ubic_terminado_id   = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    ubic_rechazos_id    = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    prefijo_codigo      = Column(String(10), nullable=False, default="RT-")
    consecutivo         = Column(Integer, nullable=False, default=0)
    # Lo que se cobra por inspeccionar una carcasa del cliente que se rechaza.
    # Puede ser cero; una tarifa especial del cliente lo reemplaza.
    cargo_inspeccion    = Column(Numeric(14, 2), nullable=False, default=0)
    # Vender como carcasa no apta las rechazadas que son de la planta.
    permite_venta_rechazo = Column(Boolean, nullable=False, default=False)
    # Para el costo por llanta: las horas registradas en los pasos por este valor.
    costo_hora_mano_obra = Column(Numeric(14, 2), nullable=False, default=0)
    # Dueño de las llantas que llegan del CMMS de la misma empresa: no son
    # inventario para vender, así que no van con el depositante propio.
    depositante_flota_id = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=True)
    # Siembra hecha una vez: si la empresa borra algo, no vuelve.
    sembrado            = Column(Boolean, nullable=False, default=False)


class RTMRolUsuario(Base, TimestampMixin):
    """Quién puede dictaminar (TECNICO), liberar y aprobar recetas (CALIDAD) o
    corregir pasos cerrados (SUPERVISOR). Se comprueba en la API, no solo en la
    pantalla; el ADMINISTRADOR de la empresa puede todo."""
    __tablename__ = "rtm_rol_usuario"
    __table_args__ = (UniqueConstraint("usuario_id", "rol", name="uq_rtm_rol_usuario"),)
    id         = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    rol        = Column(String(15), nullable=False)


class RTMEquipo(Base, TimestampMixin):
    __tablename__ = "rtm_equipo"
    id            = Column(Integer, primary_key=True)
    codigo        = Column(String(30), nullable=False, unique=True)
    nombre        = Column(String(120), nullable=False)
    # RASPADORA / DESTALONADORA / ESCARIADORA / CEMENTADORA / EXTRUSORA /
    # CORTADORA / EMBANDADORA / ENVELOPADORA / AUTOCLAVE / INSPECCION /
    # SHEAROGRAFO / ACABADO / OTRO
    tipo          = Column(String(20), nullable=False)
    capacidad     = Column(Integer, nullable=False, default=1)   # llantas por ciclo
    # Ubicación del WMS de la estación: de ahí salen sus insumos. Sin ella el
    # equipo no se puede usar en la terminal.
    ubicacion_id  = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    eam_activo_id = Column(Integer, ForeignKey("eam_activo.id", ondelete="SET NULL"), nullable=True)
    # ACTIVO / MANTENIMIENTO / INACTIVO
    estado        = Column(String(15), nullable=False, default="ACTIVO")


# ─── Rutas y etapas ───────────────────────────────────────────────────────────

class RTMEtapa(Base, TimestampMixin):
    __tablename__ = "rtm_etapa"
    id           = Column(Integer, primary_key=True)
    codigo       = Column(String(30), nullable=False, unique=True)
    nombre       = Column(String(120), nullable=False)
    # RECEPCION / INSPECCION / PROCESO / VULCANIZACION
    tipo         = Column(String(15), nullable=False, default="PROCESO")
    # Punto de decisión: termina con aprobada / condicional / rechazada.
    decision     = Column(Boolean, nullable=False, default=False)
    # La inspección final admite además retenida y corrección autorizada.
    decision_final = Column(Boolean, nullable=False, default=False)
    # [{clave, nombre, unidad, tipo: NUMERO|SI_NO}] — los límites salen de la
    # especificación de la medida y la banda (rtm_especificacion.limites[clave]).
    mediciones   = Column(JSON, nullable=False, default=list)
    reparaciones = Column(Boolean, nullable=False, default=False)
    # Categorías de insumo que se consumen en la etapa (BANDA, COJIN, ...).
    insumos      = Column(JSON, nullable=False, default=list)
    tipos_equipo = Column(JSON, nullable=False, default=list)
    descripcion  = Column(Text, nullable=True)
    activo       = Column(Boolean, nullable=False, default=True)


class RTMRuta(Base, TimestampMixin):
    __tablename__ = "rtm_ruta"
    id          = Column(Integer, primary_key=True)
    codigo      = Column(String(30), nullable=False, unique=True)
    nombre      = Column(String(120), nullable=False)
    descripcion = Column(Text, nullable=True)
    # La que toman las órdenes nuevas cuando no se elige otra.
    por_defecto = Column(Boolean, nullable=False, default=False)
    activo      = Column(Boolean, nullable=False, default=True)


class RTMRutaEtapa(Base, TimestampMixin):
    __tablename__ = "rtm_ruta_etapa"
    __table_args__ = (UniqueConstraint("ruta_id", "secuencia", name="uq_rtm_ruta_secuencia"),)
    id          = Column(Integer, primary_key=True)
    ruta_id     = Column(Integer, ForeignKey("rtm_ruta.id", ondelete="CASCADE"), nullable=False, index=True)
    etapa_id    = Column(Integer, ForeignKey("rtm_etapa.id"), nullable=False)
    secuencia   = Column(Integer, nullable=False)
    obligatoria = Column(Boolean, nullable=False, default=True)


# ─── Catálogos de calidad ─────────────────────────────────────────────────────

class RTMDefecto(Base, TimestampMixin):
    __tablename__ = "rtm_defecto"
    id     = Column(Integer, primary_key=True)
    codigo = Column(String(30), nullable=False, unique=True)
    nombre = Column(String(150), nullable=False)
    # BANDA / HOMBROS / COSTADOS / TALONES / INTERIOR / CARCASA_RASPADA
    zona   = Column(String(20), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)


class RTMMotivoRechazo(Base, TimestampMixin):
    __tablename__ = "rtm_motivo_rechazo"
    id     = Column(Integer, primary_key=True)
    codigo = Column(String(30), nullable=False, unique=True)
    nombre = Column(String(200), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)


class RTMLimiteReparacion(Base, TimestampMixin):
    """Tamaño máximo reparable por ubicación y tipo de daño. Lo sembrado es
    plantilla: hay que reemplazarlo por los límites del fabricante."""
    __tablename__ = "rtm_limite_reparacion"
    __table_args__ = (UniqueConstraint("ubicacion", "tipo_dano", name="uq_rtm_limite"),)
    id          = Column(Integer, primary_key=True)
    # CORONA / HOMBRO / COSTADO / TALON / INTERIOR
    ubicacion   = Column(String(15), nullable=False)
    tipo_dano   = Column(String(30), nullable=False)
    tamano_max_mm = Column(Float, nullable=False)
    plantilla   = Column(Boolean, nullable=False, default=False)


class RTMEspecificacion(Base, TimestampMixin):
    """Lo que se mide se compara contra esto: por medida y, si aplica, por banda.
    `limites` = {clave_medicion: {min, max}}."""
    __tablename__ = "rtm_especificacion"
    __table_args__ = (UniqueConstraint("medida", "banda_producto_id", name="uq_rtm_especificacion"),)
    id                = Column(Integer, primary_key=True)
    medida            = Column(String(40), nullable=False, index=True)
    banda_producto_id = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    limites           = Column(JSON, nullable=False, default=dict)
    longitud_banda_m  = Column(Float, nullable=True)
    longitud_cojin_m  = Column(Float, nullable=True)
    cemento_estandar  = Column(Float, nullable=True)
    activo            = Column(Boolean, nullable=False, default=True)


class RTMInsumo(Base, TimestampMixin):
    """Qué productos del WMS son insumos de la planta y de qué clase. Las bandas
    se piden en la orden; cojín, cemento, parches y relleno se consumen."""
    __tablename__ = "rtm_insumo"
    id          = Column(Integer, primary_key=True)
    producto_id = Column(Integer, ForeignKey("wms_productos.id"), nullable=False, unique=True)
    # BANDA / COJIN / CEMENTO / PARCHE / RELLENO / COMPUESTO
    clase       = Column(String(15), nullable=False)
    ancho_mm    = Column(Float, nullable=True)
    activo      = Column(Boolean, nullable=False, default=True)


# ─── Recepción y carcasas ─────────────────────────────────────────────────────

class RTMRecepcion(Base, TimestampMixin):
    __tablename__ = "rtm_recepcion"
    id                 = Column(Integer, primary_key=True)
    codigo             = Column(String(30), nullable=False, unique=True)
    depositante_id     = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=False, index=True)
    remision           = Column(String(60), nullable=True)
    cantidad_declarada = Column(Integer, nullable=True)
    # Lo recogido por el conductor, cuando viene de un viaje de recogida.
    solicitud_id       = Column(Integer, ForeignKey("rtm_solicitud_recogida.id"), nullable=True)
    viaje_id           = Column(Integer, ForeignKey("tms_viaje.id"), nullable=True)
    parada_id          = Column(Integer, ForeignKey("tms_parada.id"), nullable=True)
    eam_lote_id        = Column(Integer, ForeignKey("eam_reencauche_lote.id"), nullable=True)
    # Cliente que trae sus llantas: quién y en qué vehículo.
    placa              = Column(String(15), nullable=True)
    entrega_nombre     = Column(String(150), nullable=True)
    # EN_CURSO / CERRADA
    estado             = Column(String(10), nullable=False, default="EN_CURSO")
    contadas           = Column(Integer, nullable=True)
    diferencia         = Column(Integer, nullable=True)
    cerrada_en         = Column(DateTime(timezone=True), nullable=True)
    usuario_id         = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observaciones      = Column(Text, nullable=True)


class RTMCarcasa(Base, TimestampMixin):
    __tablename__ = "rtm_carcasa"
    id                = Column(Integer, primary_key=True)
    codigo            = Column(String(40), nullable=False, unique=True)
    depositante_id    = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=False, index=True)
    marca             = Column(String(80), nullable=False, index=True)
    medida            = Column(String(40), nullable=False, index=True)
    modelo            = Column(String(80), nullable=False)
    dot               = Column(String(20), nullable=True, index=True)
    dot_ilegible      = Column(Boolean, nullable=False, default=False)
    serie             = Column(String(60), nullable=True, index=True)
    profundidad_mm    = Column(Float, nullable=True)
    estado_costados   = Column(String(150), nullable=True)
    reencauches       = Column(Integer, nullable=False, default=0)
    posicion_anterior = Column(String(40), nullable=True)
    observaciones     = Column(Text, nullable=True)
    # Carcasa comprada por la planta: su costo de compra.
    costo_compra      = Column(Numeric(14, 2), nullable=True)
    # EN_PLANTA / TERMINADA / RECHAZADA / ENTREGADA / DISPUESTA / VENDIDA
    estado            = Column(String(12), nullable=False, default="EN_PLANTA", index=True)
    wms_serie_id      = Column(Integer, ForeignKey("wms_series.id"), nullable=True)
    # Dónde está en el WMS y como qué producto: carcasa o reencauchada.
    wms_producto_id   = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    wms_ubicacion_id  = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    eam_neumatico_id  = Column(Integer, ForeignKey("eam_neumatico.id", ondelete="SET NULL"), nullable=True)
    recepcion_id      = Column(Integer, ForeignKey("rtm_recepcion.id"), nullable=True, index=True)


class RTMOrden(Base, TimestampMixin):
    """Una visita de la carcasa a la planta. El estado se guarda explícito
    (etapa, si está en proceso, decisión pendiente) para que las colas filtren
    por índice en vez de recorrer los pasos en cada consulta."""
    __tablename__ = "rtm_orden"
    __table_args__ = (
        Index("uq_rtm_orden_abierta", "carcasa_id", unique=True, postgresql_where=text("estado = 'ABIERTA'")),
        Index("ix_rtm_orden_cola", "estado", "etapa_actual_id", "prioridad"),
    )
    id                  = Column(Integer, primary_key=True)
    codigo              = Column(String(30), nullable=False, unique=True)
    carcasa_id          = Column(Integer, ForeignKey("rtm_carcasa.id"), nullable=False, index=True)
    recepcion_id        = Column(Integer, ForeignKey("rtm_recepcion.id"), nullable=False, index=True)
    ruta_id             = Column(Integer, ForeignKey("rtm_ruta.id"), nullable=False)
    banda_producto_id   = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    numero_reencauche   = Column(Integer, nullable=False, default=1)
    # 1 = urgente ... 5 = baja
    prioridad           = Column(Integer, nullable=False, default=3)
    # ABIERTA / TERMINADA / RECHAZADA
    estado              = Column(String(10), nullable=False, default="ABIERTA", index=True)
    etapa_actual_id     = Column(Integer, ForeignKey("rtm_etapa.id"), nullable=True)
    secuencia_actual    = Column(Integer, nullable=True)
    en_proceso          = Column(Boolean, nullable=False, default=False)
    # CONDICIONAL: espera dictamen técnico.
    decision_pendiente  = Column(String(15), nullable=True)
    retenida            = Column(Boolean, nullable=False, default=False)
    # Para el FPY: algo se repitió, se corrigió o se retuvo.
    primera_pasada      = Column(Boolean, nullable=False, default=True)
    etapa_rechazo_id    = Column(Integer, ForeignKey("rtm_etapa.id"), nullable=True)
    desde_espera        = Column(DateTime(timezone=True), nullable=True)
    recibida_en         = Column(DateTime(timezone=True), nullable=True)
    terminada_en        = Column(DateTime(timezone=True), nullable=True)
    # Precio congelado al aprobar la inspección final.
    precio              = Column(Numeric(14, 2), nullable=True)
    precio_detalle      = Column(JSON, nullable=True)
    costo_insumos       = Column(Numeric(14, 2), nullable=False, default=0)


class RTMPaso(Base, TimestampMixin):
    """Una etapa ejecutada. NO se edita ni se borra: corregir es insertar otro
    paso con `anula_id` apuntando al que reemplaza."""
    __tablename__ = "rtm_paso"
    __table_args__ = (Index("ix_rtm_paso_etapa_fin", "etapa_id", "fin"), Index("ix_rtm_paso_equipo_fin", "equipo_id", "fin"))
    id            = Column(Integer, primary_key=True)
    orden_id      = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False, index=True)
    etapa_id      = Column(Integer, ForeignKey("rtm_etapa.id"), nullable=False)
    equipo_id     = Column(Integer, ForeignKey("rtm_equipo.id"), nullable=True)
    operario_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    inicio        = Column(DateTime(timezone=True), nullable=True)
    fin           = Column(DateTime(timezone=True), nullable=True)
    # Cuánto esperó en la cola antes de empezar (s).
    espera_s      = Column(Integer, nullable=True)
    # [{clave, nombre, valor, unidad, min, max, conforme}]
    mediciones    = Column(JSON, nullable=True)
    fuera_tolerancia = Column(Boolean, nullable=False, default=False)
    # APROBADA / CONDICIONAL / RECHAZADA / RETENIDA / CORRECCION (decisiones);
    # REPETIR / EVALUACION (medida fuera de tolerancia); NO_CONFORME (vacío)
    decision      = Column(String(15), nullable=True)
    # ABIERTO / CERRADO / OMITIDO
    estado        = Column(String(10), nullable=False, default="ABIERTO")
    omitida       = Column(Boolean, nullable=False, default=False)
    ciclo_id      = Column(Integer, ForeignKey("rtm_ciclo.id"), nullable=True, index=True)
    anula_id      = Column(Integer, ForeignKey("rtm_paso.id"), nullable=True)
    motivo_correccion = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)


class RTMPasoDefecto(Base, TimestampMixin):
    __tablename__ = "rtm_paso_defecto"
    id         = Column(Integer, primary_key=True)
    paso_id    = Column(Integer, ForeignKey("rtm_paso.id"), nullable=False, index=True)
    defecto_id = Column(Integer, ForeignKey("rtm_defecto.id"), nullable=False)
    ubicacion  = Column(String(80), nullable=True)
    tamano_mm  = Column(Float, nullable=True)


class RTMPasoMotivo(Base, TimestampMixin):
    __tablename__ = "rtm_paso_motivo"
    id        = Column(Integer, primary_key=True)
    paso_id   = Column(Integer, ForeignKey("rtm_paso.id"), nullable=False, index=True)
    motivo_id = Column(Integer, ForeignKey("rtm_motivo_rechazo.id"), nullable=False)


class RTMPasoPrueba(Base, TimestampMixin):
    """Prueba especial: detector eléctrico, shearografía, rayos X, inflado..."""
    __tablename__ = "rtm_paso_prueba"
    id          = Column(Integer, primary_key=True)
    paso_id     = Column(Integer, ForeignKey("rtm_paso.id"), nullable=False, index=True)
    prueba      = Column(String(30), nullable=False)
    equipo_id   = Column(Integer, ForeignKey("rtm_equipo.id"), nullable=True)
    resultado   = Column(String(200), nullable=False)
    conforme    = Column(Boolean, nullable=True)


class RTMReparacion(Base, TimestampMixin):
    __tablename__ = "rtm_reparacion"
    id              = Column(Integer, primary_key=True)
    paso_id         = Column(Integer, ForeignKey("rtm_paso.id"), nullable=False, index=True)
    tipo_dano       = Column(String(30), nullable=False)
    ubicacion       = Column(String(15), nullable=False)
    tamano_mm       = Column(Float, nullable=False)
    profundidad_mm  = Column(Float, nullable=True)
    tipo_reparacion = Column(String(40), nullable=False)
    material        = Column(String(120), nullable=True)
    fuera_limite    = Column(Boolean, nullable=False, default=False)
    autorizado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)


class RTMConsumo(Base, TimestampMixin):
    __tablename__ = "rtm_consumo"
    __table_args__ = (Index("ix_rtm_consumo_lote", "lote_id"),)
    id               = Column(Integer, primary_key=True)
    paso_id          = Column(Integer, ForeignKey("rtm_paso.id"), nullable=False, index=True)
    orden_id         = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False, index=True)
    producto_id      = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    lote_id          = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad         = Column(Float, nullable=False)
    costo_unitario   = Column(Numeric(18, 4), nullable=False, default=0)
    costo            = Column(Numeric(14, 2), nullable=False, default=0)
    wms_movimiento_id = Column(Integer, ForeignKey("wms_movimientos_inventario.id"), nullable=True)


# ─── Vulcanización ────────────────────────────────────────────────────────────

class RTMReceta(Base, TimestampMixin):
    """Temperatura, presión, vacío y tiempo con sus tolerancias. El sistema no
    trae valores: cada receta la define la planta según el fabricante."""
    __tablename__ = "rtm_receta"
    __table_args__ = (UniqueConstraint("codigo", "version", name="uq_rtm_receta_version"),)
    id                = Column(Integer, primary_key=True)
    codigo            = Column(String(30), nullable=False)
    version           = Column(Integer, nullable=False, default=1)
    nombre            = Column(String(120), nullable=False)
    equipo_id         = Column(Integer, ForeignKey("rtm_equipo.id"), nullable=False)
    banda_producto_id = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    cojin_producto_id = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    temperatura_c     = Column(Float, nullable=False)
    temperatura_tol   = Column(Float, nullable=False)
    presion_bar       = Column(Float, nullable=False)
    presion_tol       = Column(Float, nullable=False)
    vacio_bar         = Column(Float, nullable=False)
    vacio_tol         = Column(Float, nullable=False)
    tiempo_min        = Column(Float, nullable=False)
    tiempo_tol        = Column(Float, nullable=False)
    # BORRADOR / APROBADA / OBSOLETA
    estado            = Column(String(10), nullable=False, default="BORRADOR")
    aprobada_por_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    aprobada_en       = Column(DateTime(timezone=True), nullable=True)


class RTMCiclo(Base, TimestampMixin):
    __tablename__ = "rtm_ciclo"
    __table_args__ = (Index("ix_rtm_ciclo_equipo_inicio", "equipo_id", "inicio"),)
    id             = Column(Integer, primary_key=True)
    codigo         = Column(String(40), nullable=False, unique=True)
    equipo_id      = Column(Integer, ForeignKey("rtm_equipo.id"), nullable=False)
    receta_id      = Column(Integer, ForeignKey("rtm_receta.id"), nullable=True)
    operario_id    = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    # ARMANDO / EN_CURSO / CERRADO
    estado         = Column(String(10), nullable=False, default="ARMANDO", index=True)
    inicio         = Column(DateTime(timezone=True), nullable=True)
    fin_estimado   = Column(DateTime(timezone=True), nullable=True)
    fin            = Column(DateTime(timezone=True), nullable=True)
    # {variable: {real, objetivo, tolerancia, conforme}}
    variables      = Column(JSON, nullable=True)
    conforme       = Column(Boolean, nullable=True)
    # MANUAL / CONTROLADOR
    origen_variables = Column(String(12), nullable=True)


class RTMCicloCarcasa(Base, TimestampMixin):
    __tablename__ = "rtm_ciclo_carcasa"
    __table_args__ = (UniqueConstraint("ciclo_id", "orden_id", name="uq_rtm_ciclo_orden"),)
    id       = Column(Integer, primary_key=True)
    ciclo_id = Column(Integer, ForeignKey("rtm_ciclo.id", ondelete="CASCADE"), nullable=False, index=True)
    orden_id = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False, index=True)


# ─── Retenciones, dictámenes y disposición ────────────────────────────────────

class RTMRetencion(Base, TimestampMixin):
    __tablename__ = "rtm_retencion"
    id             = Column(Integer, primary_key=True)
    orden_id       = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False, index=True)
    # MANUAL / CICLO / INSPECCION_FINAL
    origen         = Column(String(18), nullable=False)
    ciclo_id       = Column(Integer, ForeignKey("rtm_ciclo.id"), nullable=True)
    motivo         = Column(String(300), nullable=False)
    retenida_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    # ABIERTA / LIBERADA / RECHAZADA
    estado         = Column(String(10), nullable=False, default="ABIERTA", index=True)
    cerrada_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    cerrada_en     = Column(DateTime(timezone=True), nullable=True)
    justificacion  = Column(Text, nullable=True)


class RTMDictamen(Base, TimestampMixin):
    __tablename__ = "rtm_dictamen"
    id            = Column(Integer, primary_key=True)
    orden_id      = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False, index=True)
    paso_id       = Column(Integer, ForeignKey("rtm_paso.id"), nullable=True)
    # APROBAR / RECHAZAR
    resultado     = Column(String(10), nullable=False)
    justificacion = Column(Text, nullable=False)
    tecnico_id    = Column(Integer, ForeignKey("usuarios.id"), nullable=False)


class RTMDisposicion(Base, TimestampMixin):
    __tablename__ = "rtm_disposicion"
    id          = Column(Integer, primary_key=True)
    carcasa_id  = Column(Integer, ForeignKey("rtm_carcasa.id"), nullable=False, index=True)
    orden_id    = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False, unique=True)
    # DEVOLUCION / GESTOR / VENTA
    tipo        = Column(String(10), nullable=False)
    gestor      = Column(String(150), nullable=True)
    acta        = Column(String(60), nullable=True)
    valor       = Column(Numeric(14, 2), nullable=True)
    # PENDIENTE (devolución por entregar) / CUMPLIDA
    estado      = Column(String(10), nullable=False, default="PENDIENTE")
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)


# ─── Transporte, entregas y liquidación ───────────────────────────────────────

class RTMSolicitudRecogida(Base, TimestampMixin):
    __tablename__ = "rtm_solicitud_recogida"
    id                = Column(Integer, primary_key=True)
    codigo            = Column(String(30), nullable=False, unique=True)
    depositante_id    = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=False, index=True)
    sede              = Column(String(150), nullable=False)
    ciudad            = Column(String(100), nullable=False)
    direccion         = Column(String(300), nullable=True)
    contacto          = Column(String(150), nullable=True)
    telefono          = Column(String(30), nullable=True)
    fecha_requerida   = Column(Date, nullable=False)
    cantidad_estimada = Column(Integer, nullable=False)
    # PENDIENTE / PROGRAMADA / RECOGIDA / RECIBIDA / CANCELADA
    estado            = Column(String(10), nullable=False, default="PENDIENTE", index=True)
    viaje_id          = Column(Integer, ForeignKey("tms_viaje.id"), nullable=True)
    parada_id         = Column(Integer, ForeignKey("tms_parada.id"), nullable=True, index=True)
    observaciones     = Column(Text, nullable=True)


class RTMEntrega(Base, TimestampMixin):
    __tablename__ = "rtm_entrega"
    id              = Column(Integer, primary_key=True)
    codigo          = Column(String(30), nullable=False, unique=True)
    depositante_id  = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=False, index=True)
    # SERVICIO (llantas del cliente) / VENTA (reencauchadas de la planta)
    tipo            = Column(String(10), nullable=False, default="SERVICIO")
    wms_cliente_id  = Column(Integer, ForeignKey("wms_clientes.id"), nullable=True)
    # VIAJE / MOSTRADOR
    modo            = Column(String(10), nullable=False, default="VIAJE")
    # BORRADOR / DESPACHADA / ENTREGADA / ANULADA
    estado          = Column(String(10), nullable=False, default="BORRADOR", index=True)
    wms_orden_id    = Column(Integer, ForeignKey("wms_ordenes_salida.id"), nullable=True)
    wms_despacho_id = Column(Integer, ForeignKey("wms_despachos.id"), nullable=True, index=True)
    viaje_id        = Column(Integer, ForeignKey("tms_viaje.id"), nullable=True, index=True)
    ciudad          = Column(String(100), nullable=True)
    direccion       = Column(String(300), nullable=True)
    placa           = Column(String(15), nullable=True)
    recibe_nombre   = Column(String(150), nullable=True)
    recibido_en     = Column(DateTime(timezone=True), nullable=True)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=True)


class RTMEntregaCarcasa(Base, TimestampMixin):
    __tablename__ = "rtm_entrega_carcasa"
    __table_args__ = (UniqueConstraint("entrega_id", "carcasa_id", name="uq_rtm_entrega_carcasa"),)
    id          = Column(Integer, primary_key=True)
    entrega_id  = Column(Integer, ForeignKey("rtm_entrega.id", ondelete="CASCADE"), nullable=False, index=True)
    carcasa_id  = Column(Integer, ForeignKey("rtm_carcasa.id"), nullable=False, index=True)
    orden_id    = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False)
    # TERMINADA / DEVOLUCION
    tipo        = Column(String(10), nullable=False)
    precio      = Column(Numeric(14, 2), nullable=True)


class RTMTarifa(Base, TimestampMixin):
    """General (sin depositante) o especial de un cliente.
    REENCAUCHE por medida y banda; REPARACION por tipo; CARGO_INSPECCION."""
    __tablename__ = "rtm_tarifa"
    id                = Column(Integer, primary_key=True)
    depositante_id    = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=True, index=True)
    tipo              = Column(String(18), nullable=False)
    medida            = Column(String(40), nullable=True)
    banda_producto_id = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    tipo_reparacion   = Column(String(40), nullable=True)
    valor             = Column(Numeric(14, 2), nullable=False)
    activo            = Column(Boolean, nullable=False, default=True)


class RTMLiquidacion(Base, TimestampMixin):
    __tablename__ = "rtm_liquidacion"
    id             = Column(Integer, primary_key=True)
    codigo         = Column(String(30), nullable=False, unique=True)
    entrega_id     = Column(Integer, ForeignKey("rtm_entrega.id"), nullable=False, unique=True)
    depositante_id = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=False, index=True)
    # BORRADOR / APROBADA / FACTURADA / ANULADA
    estado         = Column(String(10), nullable=False, default="BORRADOR")
    subtotal       = Column(Numeric(14, 2), nullable=False, default=0)
    iva            = Column(Numeric(14, 2), nullable=False, default=0)
    total          = Column(Numeric(14, 2), nullable=False, default=0)
    factura_id     = Column(Integer, nullable=True)
    aviso_factura  = Column(String(300), nullable=True)
    aprobada_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)


class RTMLiquidacionLinea(Base, TimestampMixin):
    __tablename__ = "rtm_liquidacion_linea"
    id             = Column(Integer, primary_key=True)
    liquidacion_id = Column(Integer, ForeignKey("rtm_liquidacion.id", ondelete="CASCADE"), nullable=False, index=True)
    carcasa_id     = Column(Integer, ForeignKey("rtm_carcasa.id"), nullable=True)
    # REENCAUCHE / REPARACION / CARGO_INSPECCION
    concepto       = Column(String(18), nullable=False)
    descripcion    = Column(String(300), nullable=False)
    cantidad       = Column(Float, nullable=False, default=1)
    valor_unitario = Column(Numeric(14, 2), nullable=False)
    total          = Column(Numeric(14, 2), nullable=False)


class RTMReclamo(Base, TimestampMixin):
    __tablename__ = "rtm_reclamo"
    id              = Column(Integer, primary_key=True)
    codigo          = Column(String(30), nullable=False, unique=True)
    carcasa_id      = Column(Integer, ForeignKey("rtm_carcasa.id"), nullable=False, index=True)
    orden_id        = Column(Integer, ForeignKey("rtm_orden.id"), nullable=False)
    # DESPRENDIMIENTO / SEPARACION / DESGASTE_IRREGULAR / FALLA_PREMATURA / DANO_CARCASA
    falla           = Column(String(20), nullable=False)
    km              = Column(Float, nullable=True)
    condiciones     = Column(Text, nullable=True)
    # RECIBIDO / EN_ANALISIS / DICTAMINADO / CERRADO
    estado          = Column(String(12), nullable=False, default="RECIBIDO", index=True)
    # PROCEDE / NO_PROCEDE / PARCIAL
    dictamen        = Column(String(10), nullable=True)
    causa           = Column(String(200), nullable=True)
    compensacion    = Column(String(200), nullable=True)
    compensacion_valor = Column(Numeric(14, 2), nullable=True)
    dictaminado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    dictaminado_en  = Column(DateTime(timezone=True), nullable=True)
    fecha           = Column(Date, nullable=False)


class RTMArchivo(Base, TimestampMixin):
    """Fotos y adjuntos de pruebas especiales y reclamos."""
    __tablename__ = "rtm_archivo"
    id          = Column(Integer, primary_key=True)
    # PRUEBA / RECLAMO
    entidad     = Column(String(10), nullable=False)
    entidad_id  = Column(Integer, nullable=False, index=True)
    nombre      = Column(String(200), nullable=False)
    ruta        = Column(String(400), nullable=False)
    tipo_mime   = Column(String(80), nullable=True)
    bytes       = Column(Integer, nullable=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
