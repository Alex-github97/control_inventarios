import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, Float, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.infrastructure.models.base import TimestampMixin, SoftDeleteMixin


class EstadoSolicitudSCM(str, enum.Enum):
    BORRADOR = "BORRADOR"
    PENDIENTE = "PENDIENTE"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"
    EN_PROCESO = "EN_PROCESO"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"


class PrioridadSCM(str, enum.Enum):
    BAJA = "BAJA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    URGENTE = "URGENTE"


class EstadoOrdenSCM(str, enum.Enum):
    BORRADOR = "BORRADOR"
    ENVIADA = "ENVIADA"
    CONFIRMADA = "CONFIRMADA"
    EN_TRANSITO = "EN_TRANSITO"
    RECIBIDA_PARCIAL = "RECIBIDA_PARCIAL"
    RECIBIDA = "RECIBIDA"
    CERRADA = "CERRADA"
    CANCELADA = "CANCELADA"


class CategoriaSCM(str, enum.Enum):
    INSUMOS = "INSUMOS"
    SERVICIOS = "SERVICIOS"
    EQUIPOS = "EQUIPOS"
    MATERIALES = "MATERIALES"
    LOGISTICA = "LOGISTICA"
    IT = "IT"
    REPUESTOS = "REPUESTOS"
    PAPELERIA = "PAPELERIA"
    OTROS = "OTROS"


class ClasificacionProveedor(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class RecomendacionProveedor(str, enum.Enum):
    MANTENER = "MANTENER"
    MEJORAR = "MEJORAR"
    REEMPLAZAR = "REEMPLAZAR"
    SUSPENDER = "SUSPENDER"


class ScmSolicitudCompra(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "scm_solicitudes_compra"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(50), unique=True, nullable=False, index=True)
    solicitante_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    aprobador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(Enum(CategoriaSCM), nullable=False, default=CategoriaSCM.OTROS)
    prioridad = Column(Enum(PrioridadSCM), nullable=False, default=PrioridadSCM.MEDIA)
    estado = Column(Enum(EstadoSolicitudSCM), nullable=False, default=EstadoSolicitudSCM.BORRADOR)
    fecha_requerida = Column(Date, nullable=True)
    presupuesto_estimado = Column(Float, nullable=True)
    moneda = Column(String(10), default="COP")
    justificacion = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    fecha_aprobacion = Column(Date, nullable=True)
    motivo_rechazo = Column(Text, nullable=True)

    items = relationship("ScmSolicitudItem", back_populates="solicitud", cascade="all, delete-orphan")
    ordenes = relationship("ScmOrdenCompra", back_populates="solicitud")


class ScmSolicitudItem(Base, TimestampMixin):
    __tablename__ = "scm_solicitud_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("scm_solicitudes_compra.id"), nullable=False)
    descripcion = Column(String(500), nullable=False)
    unidad = Column(String(50), nullable=True)
    cantidad = Column(Float, nullable=False, default=1)
    precio_estimado = Column(Float, nullable=True)
    total_estimado = Column(Float, nullable=True)
    especificaciones = Column(Text, nullable=True)

    solicitud = relationship("ScmSolicitudCompra", back_populates="items")


class ScmOrdenCompra(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "scm_ordenes_compra"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(50), unique=True, nullable=False, index=True)
    solicitud_id = Column(Integer, ForeignKey("scm_solicitudes_compra.id"), nullable=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    aprobado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    estado = Column(Enum(EstadoOrdenSCM), nullable=False, default=EstadoOrdenSCM.BORRADOR)
    categoria = Column(Enum(CategoriaSCM), nullable=False, default=CategoriaSCM.OTROS)
    prioridad = Column(Enum(PrioridadSCM), nullable=False, default=PrioridadSCM.MEDIA)
    fecha_emision = Column(Date, nullable=True)
    fecha_entrega_esperada = Column(Date, nullable=True)
    fecha_entrega_real = Column(Date, nullable=True)
    subtotal = Column(Float, nullable=True, default=0)
    impuestos = Column(Float, nullable=True, default=0)
    total = Column(Float, nullable=True, default=0)
    moneda = Column(String(10), default="COP")
    condiciones_pago = Column(String(200), nullable=True)
    lugar_entrega = Column(String(300), nullable=True)
    notas = Column(Text, nullable=True)
    codigo_sap = Column(String(50), nullable=True)

    items = relationship("ScmOrdenItem", back_populates="orden", cascade="all, delete-orphan")
    solicitud = relationship("ScmSolicitudCompra", back_populates="ordenes")


class ScmOrdenItem(Base, TimestampMixin):
    __tablename__ = "scm_orden_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("scm_ordenes_compra.id"), nullable=False)
    descripcion = Column(String(500), nullable=False)
    codigo_producto = Column(String(100), nullable=True)
    unidad = Column(String(50), nullable=True)
    cantidad = Column(Float, nullable=False, default=1)
    cantidad_recibida = Column(Float, nullable=True, default=0)
    precio_unitario = Column(Float, nullable=False, default=0)
    descuento_pct = Column(Float, nullable=True, default=0)
    total = Column(Float, nullable=True, default=0)
    especificaciones = Column(Text, nullable=True)

    orden = relationship("ScmOrdenCompra", back_populates="items")


class ScmEvaluacionProveedor(Base, TimestampMixin):
    __tablename__ = "scm_evaluaciones_proveedor"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    evaluador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    periodo = Column(String(20), nullable=False)
    calidad = Column(Float, nullable=True)
    tiempo_entrega = Column(Float, nullable=True)
    precio = Column(Float, nullable=True)
    servicio = Column(Float, nullable=True)
    documentacion = Column(Float, nullable=True)
    puntaje_total = Column(Float, nullable=True)
    clasificacion = Column(Enum(ClasificacionProveedor), nullable=True)
    comentarios = Column(Text, nullable=True)
    recomendacion = Column(Enum(RecomendacionProveedor), nullable=True)
