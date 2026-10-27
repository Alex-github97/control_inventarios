"""
Compras: solicitudes de cotización a proveedores y su comparación.

    Solicitud (productos a cotizar + proveedores invitados)
      └─ por proveedor: qué productos se le piden (no todos tienen que ir a todos)
           └─ su respuesta: precio, cantidad y plazo por producto, y el archivo
              de la cotización que mandó
      └─ adjudicación: cada producto a un proveedor → una orden de compra por
         proveedor ganador, que sigue a la recepción como siempre.

Las líneas respondidas quedan como historia de precios por proveedor y
producto (la usa la analítica para comparar lo que cotiza cada uno).

También aquí: el registro de correos que envía la empresa (`correo_envios`),
para saber qué se mandó, a quién y si llegó al servidor de correo.
"""
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, LargeBinary, Numeric, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.infrastructure.models.base import Base, TimestampMixin


class WMSSolicitudCotizacion(Base, TimestampMixin):
    __tablename__ = "wms_solicitudes_cotizacion"
    id             = Column(Integer, primary_key=True, index=True)
    numero         = Column(String(40), nullable=False, unique=True, index=True)   # SC-2026-00001
    titulo         = Column(String(200), nullable=True)
    # Almacén que recibirá la mercancía (las órdenes de compra nacen para él).
    almacen_id     = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False, index=True)
    depositante_id = Column(Integer, ForeignKey("wms_depositantes.id"), nullable=True)
    fecha_limite   = Column(Date, nullable=True)          # hasta cuándo se reciben cotizaciones
    fecha_requerida = Column(Date, nullable=True)         # cuándo se necesita la mercancía
    # BORRADOR → ENVIADA → EN_COMPARACION → ADJUDICADA (órdenes generadas) / CANCELADA
    estado         = Column(String(20), nullable=False, default="BORRADOR", index=True)
    notas          = Column(Text, nullable=True)          # lo que leen los proveedores
    notas_internas = Column(Text, nullable=True)
    creada_por_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    adjudicada_en  = Column(DateTime(timezone=True), nullable=True)

    items       = relationship("WMSSolicitudItem", back_populates="solicitud", cascade="all, delete-orphan",
                               order_by="WMSSolicitudItem.orden")
    proveedores = relationship("WMSSolicitudProveedor", back_populates="solicitud", cascade="all, delete-orphan")


class WMSSolicitudItem(Base, TimestampMixin):
    """Un producto a cotizar, con la cantidad que se necesita."""
    __tablename__ = "wms_solicitud_items"
    id            = Column(Integer, primary_key=True, index=True)
    solicitud_id  = Column(Integer, ForeignKey("wms_solicitudes_cotizacion.id", ondelete="CASCADE"), nullable=False, index=True)
    producto_id   = Column(Integer, ForeignKey("wms_productos.id"), nullable=False, index=True)
    cantidad      = Column(Float, nullable=False)
    unidad        = Column(String(20), nullable=False, default="UNIDAD")   # UNIDAD / CAJA / MASTER / ESTIBA
    especificacion = Column(Text, nullable=True)
    orden         = Column(Integer, nullable=False, default=0)

    solicitud = relationship("WMSSolicitudCotizacion", back_populates="items")
    lineas    = relationship("WMSSolicitudLinea", back_populates="item", cascade="all, delete-orphan")


class WMSSolicitudProveedor(Base, TimestampMixin):
    """Un proveedor invitado a la solicitud y su respuesta."""
    __tablename__ = "wms_solicitud_proveedores"
    __table_args__ = (UniqueConstraint("solicitud_id", "proveedor_id", name="uq_solicitud_proveedor"),)
    id              = Column(Integer, primary_key=True, index=True)
    solicitud_id    = Column(Integer, ForeignKey("wms_solicitudes_cotizacion.id", ondelete="CASCADE"), nullable=False, index=True)
    proveedor_id    = Column(Integer, ForeignKey("wms_proveedores.id"), nullable=False, index=True)
    # PENDIENTE (no enviada) → ENVIADA → RESPONDIDA / NO_COTIZA
    estado          = Column(String(20), nullable=False, default="PENDIENTE")
    correo          = Column(String(200), nullable=True)     # a dónde se envió
    enviada_en      = Column(DateTime(timezone=True), nullable=True)
    envios          = Column(Integer, nullable=False, default=0)
    respondida_en   = Column(DateTime(timezone=True), nullable=True)
    plazo_entrega_dias = Column(Integer, nullable=True)
    validez_hasta   = Column(Date, nullable=True)
    forma_pago      = Column(String(120), nullable=True)
    notas           = Column(Text, nullable=True)
    # La cotización que mandó el proveedor (PDF, Excel o imagen), guardada en la base.
    archivo_nombre  = Column(String(200), nullable=True)
    archivo_mime    = Column(String(100), nullable=True)
    archivo         = Column(LargeBinary, nullable=True)
    orden_compra_id = Column(Integer, ForeignKey("wms_ordenes_compra.id"), nullable=True)

    solicitud = relationship("WMSSolicitudCotizacion", back_populates="proveedores")
    lineas    = relationship("WMSSolicitudLinea", back_populates="proveedor_solicitud", cascade="all, delete-orphan")


class WMSSolicitudLinea(Base, TimestampMixin):
    """Producto × proveedor: si se le pide, lo que cotizó y si se le adjudicó."""
    __tablename__ = "wms_solicitud_lineas"
    __table_args__ = (UniqueConstraint("solicitud_proveedor_id", "item_id", name="uq_linea_proveedor_item"),)
    id                     = Column(Integer, primary_key=True, index=True)
    solicitud_proveedor_id = Column(Integer, ForeignKey("wms_solicitud_proveedores.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id                = Column(Integer, ForeignKey("wms_solicitud_items.id", ondelete="CASCADE"), nullable=False, index=True)
    incluido               = Column(Boolean, nullable=False, default=True)
    precio_unitario        = Column(Numeric(18, 4), nullable=True)   # por unidad base, sin IVA
    cantidad_ofrecida      = Column(Float, nullable=True)
    plazo_dias             = Column(Integer, nullable=True)
    notas                  = Column(String(300), nullable=True)
    adjudicado             = Column(Boolean, nullable=False, default=False)
    cantidad_adjudicada    = Column(Float, nullable=True)

    proveedor_solicitud = relationship("WMSSolicitudProveedor", back_populates="lineas")
    item                = relationship("WMSSolicitudItem", back_populates="lineas")


class CorreoEnvio(Base):
    """Cada correo que envía la empresa desde la plataforma."""
    __tablename__ = "correo_envios"
    id             = Column(Integer, primary_key=True, index=True)
    fecha          = Column(DateTime(timezone=True), nullable=False, index=True)
    para           = Column(String(400), nullable=False)
    asunto         = Column(String(300), nullable=False)
    documento_tipo = Column(String(40), nullable=True, index=True)
    documento_id   = Column(Integer, nullable=True)
    adjuntos       = Column(String(400), nullable=True)
    estado         = Column(String(12), nullable=False)        # ENVIADO / ERROR
    error          = Column(Text, nullable=True)
    usuario_id     = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
