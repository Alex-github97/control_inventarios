"""
TarifaX · comparativo de tarifas de clientes contra SICETAC.

El resto de TarifaX trabaja con archivos compartidos. Esto no: las tarifas que
se negociaron con cada cliente son información comercial de cada empresa, así
que van en su esquema, como cualquier otro dato de negocio.

El cruce contra SICETAC se calcula al cargar (un mes de SICETAC o las
negociaciones) y se guarda: el tablero solo consulta. Calcularlo en cada
consulta obligaría a tener en memoria doce tarifarios de medio millón de filas.
"""
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text

from app.infrastructure.models.base import Base, TimestampMixin


class TarifaxNegociacion(Base, TimestampMixin):
    """Una tarifa negociada con un cliente, tal como viene del consolidado comercial."""
    __tablename__ = "tarifax_negociaciones"
    id                 = Column(Integer, primary_key=True, index=True)
    bp                 = Column(String(40), nullable=True)
    cliente            = Column(String(200), nullable=False, index=True)
    servicio           = Column(String(120), nullable=True)
    origen             = Column(String(120), nullable=False)
    dpto_origen        = Column(String(120), nullable=True)
    destino            = Column(String(120), nullable=False)
    dpto_destino       = Column(String(120), nullable=True)
    tipo_tarifa        = Column(String(120), nullable=True)
    tarifa             = Column(Float, nullable=True)
    # Solo las tarifas por tipo de vehículo son comparables con SICETAC (costo
    # por viaje): para las demás queda vacío.
    categoria_vehiculo = Column(String(60), nullable=True)
    archivo            = Column(String(255), nullable=True)
    # Desde qué mes (AAAA-MM) rige: una carga por cliente y periodo reemplaza
    # las tarifas de ese cliente desde ese mes. Vacío = consolidado general,
    # que rige para todos los meses donde el cliente no tiene una carga propia.
    periodo            = Column(String(7), nullable=True, index=True)
    # Vigencia propia de cada fila del consolidado (AAAA-MM; vacío = sin límite).
    vigencia_desde     = Column(String(7), nullable=True)
    vigencia_hasta     = Column(String(7), nullable=True)


class TarifaxSicetacPeriodo(Base, TimestampMixin):
    """Un mes de SICETAC cargado. El archivo queda guardado (comprimido) para
    poder recalcular el cruce si cambian las negociaciones o las equivalencias."""
    __tablename__ = "tarifax_sicetac_periodos"
    id         = Column(Integer, primary_key=True, index=True)
    periodo    = Column(String(10), nullable=False, unique=True)   # AAAA-MM
    anio       = Column(Integer, nullable=False)
    mes        = Column(Integer, nullable=False)
    archivo    = Column(String(255), nullable=True)
    ruta       = Column(String(500), nullable=False)
    filas      = Column(Integer, nullable=False, default=0)
    rutas      = Column(Integer, nullable=False, default=0)
    usuario    = Column(String(120), nullable=True)
    # Un archivo grande se procesa en segundo plano: PROCESANDO mientras se
    # lee (con las filas que va leyendo), LISTO al terminar, ERROR con el motivo.
    # Varios archivos se procesan de a uno: EN_COLA mientras esperan turno.
    estado        = Column(String(12), nullable=False, default="LISTO", server_default="LISTO")
    mensaje       = Column(Text, nullable=True)
    filas_leidas  = Column(Integer, nullable=True)
    filas_totales = Column(Integer, nullable=True)   # aproximado (lo que el Excel declara); vacío en CSV


class TarifaxComparacion(Base):
    """Una tarifa de cliente frente al costo SICETAC de la misma ruta y vehículo,
    en un periodo y una carrocería. Se recalcula entera por periodo."""
    __tablename__ = "tarifax_comparaciones"
    id                = Column(Integer, primary_key=True)
    periodo           = Column(String(10), nullable=False)          # AAAA-MM o VIGENTE
    negociacion_id    = Column(Integer, ForeignKey("tarifax_negociaciones.id", ondelete="CASCADE"), nullable=False)
    cliente           = Column(String(200), nullable=False)
    servicio          = Column(String(120), nullable=True)
    origen            = Column(String(120), nullable=False)
    destino           = Column(String(120), nullable=False)
    dpto_origen       = Column(String(120), nullable=True)
    dpto_destino      = Column(String(120), nullable=True)
    tipo_tarifa       = Column(String(120), nullable=True)
    categoria         = Column(String(60), nullable=True)           # tipo de vehículo extraído del tipo de tarifa
    tipo_vehiculo     = Column(String(60), nullable=True)           # configuración SICETAC
    carroceria        = Column(String(60), nullable=True)           # vacío = sin referencia
    distancia         = Column(Float, nullable=True)
    tarifa_cliente    = Column(Float, nullable=True)
    costo_sicetac     = Column(Float, nullable=True)
    # Valor de una hora logística según el archivo SICETAC (vacío si no lo
    # trae: entonces se usa el valor por configuración del tablero).
    valor_hora        = Column(Float, nullable=True)
    # Componentes del SICETAC oficial (vacíos en el tarifario vigente, que no
    # los trae): costo_sicetac = costo_mov + horas_sicetac × valor_hora.
    costo_mov         = Column(Float, nullable=True)
    horas_sicetac     = Column(Float, nullable=True)
    tipo_carga        = Column(String(60), nullable=True)          # GENERAL, GRANEL SOLIDO…
    fecha_sicetac     = Column(String(10), nullable=True)          # fecha de publicación (la más reciente del archivo)
    diferencia        = Column(Float, nullable=True)
    variacion_pct     = Column(Float, nullable=True)
    # OK / SIN_RUTA (SICETAC no publica la ruta) / SIN_VEHICULO (la categoría
    # no tiene equivalente SICETAC en el mapeo de vehículos)
    estado            = Column(String(20), nullable=False, default="OK")


Index("ix_tarifax_comp_periodo_carroceria", TarifaxComparacion.periodo, TarifaxComparacion.carroceria)
Index("ix_tarifax_comp_cliente", TarifaxComparacion.cliente)
# Borrar tarifas negociadas revisa sus comparaciones (llave foránea): sin este
# índice, reemplazar 20.000 tarifas recorre la tabla entera 20.000 veces.
Index("ix_tarifax_comp_negociacion", TarifaxComparacion.negociacion_id)


class TarifaxAliasCiudad(Base, TimestampMixin):
    """Equivalencia de nombre de ciudad: cómo la escribe el consolidado comercial
    y cómo la publica SICETAC (BOGOTA → BOGOTA, D.C.)."""
    __tablename__ = "tarifax_alias_ciudades"
    id         = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String(120), nullable=False, unique=True)
    equivale_a = Column(String(120), nullable=False)


class TarifaxHoraLogistica(Base, TimestampMixin):
    """Valor de una hora logística por configuración SICETAC (2, 3S2, 2L3…).
    Se usa cuando el archivo SICETAC del mes no trae ese valor. Las horas que
    se suman las decide quien analiza, en el tablero; el valor sale de acá."""
    __tablename__ = "tarifax_horas_logisticas"
    id            = Column(Integer, primary_key=True, index=True)
    tipo_vehiculo = Column(String(60), nullable=False, unique=True)
    valor_hora    = Column(Float, nullable=False)


class TarifaxAjuste(Base, TimestampMixin):
    """Ajustes sueltos del comparativo. Hoy: con qué equivalencias de vehículo
    se calculó el cruce, para recalcularlo solo si alguien las cambia desde el
    motor de tarifas (la configuración es compartida)."""
    __tablename__ = "tarifax_ajustes"
    id    = Column(Integer, primary_key=True, index=True)
    clave = Column(String(60), nullable=False, unique=True)
    valor = Column(Text, nullable=True)

