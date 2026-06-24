"""
Módulo WMS (Warehouse Management System) — Modelos de base de datos
Prefijo de tabla: wms_
"""
from datetime import datetime, timezone as _tz
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, ForeignKey, Text,
    Date, DateTime, JSON, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from app.infrastructure.models.base import Base, TimestampMixin, SoftDeleteMixin


# ─── Catálogos ─────────────────────────────────────────────────────────────────

class WMSAlmacen(Base, TimestampMixin):
    __tablename__ = "wms_almacenes"
    id        = Column(Integer, primary_key=True, index=True)
    codigo    = Column(String(30), nullable=False, unique=True, index=True)
    nombre    = Column(String(150), nullable=False)
    direccion = Column(String(255), nullable=True)
    ciudad    = Column(String(100), nullable=True)
    pais      = Column(String(80), nullable=True)
    activo    = Column(Boolean, default=True)

    zonas            = relationship("WMSZona", back_populates="almacen")
    ordenes_compra   = relationship("WMSOrdenCompra", back_populates="almacen")
    recepciones      = relationship("WMSRecepcion", back_populates="almacen")
    ordenes_salida   = relationship("WMSOrdenSalida", back_populates="almacen")
    conteos          = relationship("WMSConteoInventario", back_populates="almacen")
    devoluciones     = relationship("WMSDevolucion", back_populates="almacen")
    kpis_diarios     = relationship("WMSKPIDiario", back_populates="almacen")


class WMSZona(Base, TimestampMixin):
    __tablename__ = "wms_zonas"
    id                    = Column(Integer, primary_key=True, index=True)
    almacen_id            = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False)
    codigo                = Column(String(30), nullable=False, unique=True, index=True)
    nombre                = Column(String(150), nullable=False)
    # RECEPCION/ALMACENAMIENTO/DESPACHO/CUARENTENA/CROSS_DOCKING
    tipo                  = Column(String(30), nullable=False, default="ALMACENAMIENTO")
    temperatura_controlada = Column(Boolean, default=False)
    activo                = Column(Boolean, default=True)

    almacen    = relationship("WMSAlmacen", back_populates="zonas")
    ubicaciones = relationship("WMSUbicacion", back_populates="zona")


class WMSUbicacion(Base, TimestampMixin):
    __tablename__ = "wms_ubicaciones"
    id            = Column(Integer, primary_key=True, index=True)
    zona_id       = Column(Integer, ForeignKey("wms_zonas.id"), nullable=False)
    codigo        = Column(String(30), nullable=False, unique=True, index=True)
    pasillo       = Column(String(20), nullable=True)
    estanteria    = Column(String(20), nullable=True)
    nivel         = Column(String(20), nullable=True)
    posicion      = Column(String(20), nullable=True)
    # ESTANDAR/PALLET/SUELO/CAMARA_FRIO/RESTRINGIDA/CUARENTENA
    tipo          = Column(String(30), nullable=False, default="ESTANDAR")
    capacidad_kg  = Column(Float, nullable=True)
    capacidad_m3  = Column(Float, nullable=True)
    activo        = Column(Boolean, default=True)

    zona              = relationship("WMSZona", back_populates="ubicaciones")
    inventarios       = relationship("WMSInventarioUbicacion", back_populates="ubicacion")
    movimientos_origen  = relationship("WMSMovimientoInventario", foreign_keys="WMSMovimientoInventario.ubicacion_origen_id", back_populates="ubicacion_origen")
    movimientos_destino = relationship("WMSMovimientoInventario", foreign_keys="WMSMovimientoInventario.ubicacion_destino_id", back_populates="ubicacion_destino")
    recepciones_detalle = relationship("WMSRecepcionDetalle", back_populates="ubicacion")
    picking_detalles    = relationship("WMSPickingDetalle", back_populates="ubicacion")
    conteos_detalle     = relationship("WMSConteoDetalle", back_populates="ubicacion")
    eventos_trazabilidad = relationship("WMSEventoTrazabilidad", back_populates="ubicacion")


class WMSProducto(Base, TimestampMixin):
    __tablename__ = "wms_productos"
    id                    = Column(Integer, primary_key=True, index=True)
    sku                   = Column(String(80), nullable=False, unique=True, index=True)
    nombre                = Column(String(200), nullable=False)
    descripcion           = Column(Text, nullable=True)
    categoria             = Column(String(100), nullable=True)
    familia               = Column(String(100), nullable=True)
    unidad_medida         = Column(String(30), nullable=False, default="UNIDAD")
    peso_kg               = Column(Float, nullable=True)
    volumen_m3            = Column(Float, nullable=True)
    requiere_refrigeracion = Column(Boolean, default=False)
    requiere_serial       = Column(Boolean, default=False)
    requiere_lote         = Column(Boolean, default=False)
    vida_util_dias        = Column(Integer, nullable=True)
    imagen_url            = Column(String(500), nullable=True)
    activo                = Column(Boolean, default=True)

    lotes               = relationship("WMSLote", back_populates="producto")
    series              = relationship("WMSSerie", back_populates="producto")
    inventarios         = relationship("WMSInventarioUbicacion", back_populates="producto")
    movimientos         = relationship("WMSMovimientoInventario", back_populates="producto")
    recepciones_detalle = relationship("WMSRecepcionDetalle", back_populates="producto")
    oc_detalles         = relationship("WMSOrdenCompraDetalle", back_populates="producto")
    salida_detalles     = relationship("WMSOrdenSalidaDetalle", back_populates="producto")
    picking_detalles    = relationship("WMSPickingDetalle", back_populates="producto")
    despacho_detalles   = relationship("WMSDespachoDetalle", back_populates="producto")
    conteos_detalle     = relationship("WMSConteoDetalle", back_populates="producto")
    devolucion_detalles = relationship("WMSDevolucionDetalle", back_populates="producto")
    eventos_trazabilidad = relationship("WMSEventoTrazabilidad", back_populates="producto")


class WMSLote(Base, TimestampMixin):
    __tablename__ = "wms_lotes"
    id             = Column(Integer, primary_key=True, index=True)
    producto_id    = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    numero_lote    = Column(String(100), nullable=False)
    fecha_fabricacion = Column(Date, nullable=True)
    fecha_vencimiento = Column(Date, nullable=True)
    proveedor_lote = Column(String(150), nullable=True)
    activo         = Column(Boolean, default=True)

    producto            = relationship("WMSProducto", back_populates="lotes")
    series              = relationship("WMSSerie", back_populates="lote")
    inventarios         = relationship("WMSInventarioUbicacion", back_populates="lote")
    movimientos         = relationship("WMSMovimientoInventario", back_populates="lote")
    recepciones_detalle = relationship("WMSRecepcionDetalle", back_populates="lote")
    salida_detalles     = relationship("WMSOrdenSalidaDetalle", back_populates="lote")
    picking_detalles    = relationship("WMSPickingDetalle", back_populates="lote")
    despacho_detalles   = relationship("WMSDespachoDetalle", back_populates="lote")
    conteos_detalle     = relationship("WMSConteoDetalle", back_populates="lote")
    devolucion_detalles = relationship("WMSDevolucionDetalle", back_populates="lote")
    eventos_trazabilidad = relationship("WMSEventoTrazabilidad", back_populates="lote")


class WMSSerie(Base, TimestampMixin):
    __tablename__ = "wms_series"
    id           = Column(Integer, primary_key=True, index=True)
    producto_id  = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    lote_id      = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    numero_serie = Column(String(150), nullable=False, unique=True, index=True)
    # DISPONIBLE/ASIGNADO/DESPACHADO/DEVUELTO/DADO_DE_BAJA
    estado       = Column(String(30), nullable=False, default="DISPONIBLE")
    activo       = Column(Boolean, default=True)

    producto    = relationship("WMSProducto", back_populates="series")
    lote        = relationship("WMSLote", back_populates="series")
    movimientos = relationship("WMSMovimientoInventario", back_populates="serie")


class WMSProveedor(Base, TimestampMixin):
    __tablename__ = "wms_proveedores"
    id       = Column(Integer, primary_key=True, index=True)
    codigo   = Column(String(30), nullable=False, unique=True, index=True)
    nombre   = Column(String(150), nullable=False)
    nit      = Column(String(30), nullable=True)
    contacto = Column(String(100), nullable=True)
    email    = Column(String(120), nullable=True)
    telefono = Column(String(30), nullable=True)
    ciudad   = Column(String(100), nullable=True)
    pais     = Column(String(80), nullable=True)
    activo   = Column(Boolean, default=True)

    ordenes_compra = relationship("WMSOrdenCompra", back_populates="proveedor")
    devoluciones   = relationship("WMSDevolucion", back_populates="proveedor")


class WMSCliente(Base, TimestampMixin):
    __tablename__ = "wms_clientes"
    id       = Column(Integer, primary_key=True, index=True)
    codigo   = Column(String(30), nullable=False, unique=True, index=True)
    nombre   = Column(String(150), nullable=False)
    nit      = Column(String(30), nullable=True)
    contacto = Column(String(100), nullable=True)
    email    = Column(String(120), nullable=True)
    telefono = Column(String(30), nullable=True)
    ciudad   = Column(String(100), nullable=True)
    pais     = Column(String(80), nullable=True)
    segmento = Column(String(60), nullable=True)
    activo   = Column(Boolean, default=True)

    ordenes_salida = relationship("WMSOrdenSalida", back_populates="cliente")
    devoluciones   = relationship("WMSDevolucion", back_populates="cliente")


class WMSTransportadora(Base, TimestampMixin):
    __tablename__ = "wms_transportadoras"
    id       = Column(Integer, primary_key=True, index=True)
    codigo   = Column(String(30), nullable=False, unique=True, index=True)
    nombre   = Column(String(150), nullable=False)
    nit      = Column(String(30), nullable=True)
    contacto = Column(String(100), nullable=True)
    telefono = Column(String(30), nullable=True)
    activo   = Column(Boolean, default=True)

    despachos = relationship("WMSDespacho", back_populates="transportadora")


# ─── Inbound ───────────────────────────────────────────────────────────────────

class WMSOrdenCompra(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "wms_ordenes_compra"
    id             = Column(Integer, primary_key=True, index=True)
    numero_oc      = Column(String(60), nullable=False, unique=True, index=True)
    proveedor_id   = Column(Integer, ForeignKey("wms_proveedores.id"), nullable=False)
    almacen_id     = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False)
    fecha_emision  = Column(Date, nullable=False)
    fecha_esperada = Column(Date, nullable=True)
    # PENDIENTE/PARCIAL/COMPLETA/CANCELADA
    estado         = Column(String(20), nullable=False, default="PENDIENTE")
    notas          = Column(Text, nullable=True)

    proveedor  = relationship("WMSProveedor", back_populates="ordenes_compra")
    almacen    = relationship("WMSAlmacen", back_populates="ordenes_compra")
    detalles   = relationship("WMSOrdenCompraDetalle", back_populates="orden", cascade="all, delete-orphan")
    recepciones = relationship("WMSRecepcion", back_populates="orden_compra")


class WMSOrdenCompraDetalle(Base, TimestampMixin):
    __tablename__ = "wms_ordenes_compra_detalle"
    id                  = Column(Integer, primary_key=True, index=True)
    orden_id            = Column(Integer, ForeignKey("wms_ordenes_compra.id"), nullable=False)
    producto_id         = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    cantidad_solicitada = Column(Float, nullable=False)
    cantidad_recibida   = Column(Float, nullable=False, default=0)
    precio_unitario     = Column(Float, nullable=True)
    unidad_medida       = Column(String(30), nullable=True)

    orden   = relationship("WMSOrdenCompra", back_populates="detalles")
    producto = relationship("WMSProducto", back_populates="oc_detalles")


class WMSRecepcion(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "wms_recepciones"
    id               = Column(Integer, primary_key=True, index=True)
    numero_recepcion = Column(String(60), nullable=False, unique=True, index=True)
    # CONTRA_OC/ASN/CIEGA/PARCIAL/CONSOLIDADA
    tipo             = Column(String(30), nullable=False, default="CONTRA_OC")
    orden_compra_id  = Column(Integer, ForeignKey("wms_ordenes_compra.id"), nullable=True)
    almacen_id       = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False)
    fecha_recepcion  = Column(Date, nullable=False)
    # BORRADOR/EN_PROCESO/COMPLETA/RECHAZADA
    estado           = Column(String(20), nullable=False, default="BORRADOR")
    operario_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas            = Column(Text, nullable=True)

    orden_compra = relationship("WMSOrdenCompra", back_populates="recepciones")
    almacen      = relationship("WMSAlmacen", back_populates="recepciones")
    detalles     = relationship("WMSRecepcionDetalle", back_populates="recepcion", cascade="all, delete-orphan")


class WMSRecepcionDetalle(Base, TimestampMixin):
    __tablename__ = "wms_recepciones_detalle"
    id                = Column(Integer, primary_key=True, index=True)
    recepcion_id      = Column(Integer, ForeignKey("wms_recepciones.id"), nullable=False)
    producto_id       = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    lote_id           = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad_esperada = Column(Float, nullable=True)
    cantidad_recibida = Column(Float, nullable=False, default=0)
    ubicacion_id      = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    # APROBADO/RECHAZADO/CUARENTENA/INSPECCION
    estado_calidad    = Column(String(20), nullable=False, default="APROBADO")
    notas             = Column(Text, nullable=True)

    recepcion = relationship("WMSRecepcion", back_populates="detalles")
    producto  = relationship("WMSProducto", back_populates="recepciones_detalle")
    lote      = relationship("WMSLote", back_populates="recepciones_detalle")
    ubicacion = relationship("WMSUbicacion", back_populates="recepciones_detalle")


# ─── Inventario ────────────────────────────────────────────────────────────────

class WMSInventarioUbicacion(Base, TimestampMixin):
    __tablename__ = "wms_inventario_ubicacion"
    __table_args__ = (
        UniqueConstraint("producto_id", "ubicacion_id", "lote_id", name="uq_inv_prod_ubic_lote"),
    )
    id                  = Column(Integer, primary_key=True, index=True)
    producto_id         = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    ubicacion_id        = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=False)
    lote_id             = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad_disponible = Column(Float, nullable=False, default=0)
    cantidad_reservada  = Column(Float, nullable=False, default=0)
    cantidad_bloqueada  = Column(Float, nullable=False, default=0)
    updated_at          = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    producto  = relationship("WMSProducto", back_populates="inventarios")
    ubicacion = relationship("WMSUbicacion", back_populates="inventarios")
    lote      = relationship("WMSLote", back_populates="inventarios")


class WMSMovimientoInventario(Base, TimestampMixin):
    __tablename__ = "wms_movimientos_inventario"
    id                   = Column(Integer, primary_key=True, index=True)
    # RECEPCION/DESPACHO/AJUSTE/TRANSFERENCIA/DEVOLUCION/CONTEO/CROSS_DOCKING
    tipo                 = Column(String(30), nullable=False)
    producto_id          = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    ubicacion_origen_id  = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    ubicacion_destino_id = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    lote_id              = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    serie_id             = Column(Integer, ForeignKey("wms_series.id"), nullable=True)
    cantidad             = Column(Float, nullable=False)
    referencia_documento = Column(String(100), nullable=True)
    usuario_id           = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas                = Column(Text, nullable=True)

    producto          = relationship("WMSProducto", back_populates="movimientos")
    ubicacion_origen  = relationship("WMSUbicacion", foreign_keys=[ubicacion_origen_id], back_populates="movimientos_origen")
    ubicacion_destino = relationship("WMSUbicacion", foreign_keys=[ubicacion_destino_id], back_populates="movimientos_destino")
    lote              = relationship("WMSLote", back_populates="movimientos")
    serie             = relationship("WMSSerie", back_populates="movimientos")


class WMSConteoInventario(Base, TimestampMixin):
    __tablename__ = "wms_conteos_inventario"
    id              = Column(Integer, primary_key=True, index=True)
    almacen_id      = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False)
    # CICLICO/GENERAL/DIRIGIDO
    tipo            = Column(String(20), nullable=False, default="CICLICO")
    # PROGRAMADO/EN_PROCESO/COMPLETO/CANCELADO
    estado          = Column(String(20), nullable=False, default="PROGRAMADO")
    fecha_programada = Column(Date, nullable=False)
    fecha_inicio    = Column(DateTime(timezone=True), nullable=True)
    fecha_fin       = Column(DateTime(timezone=True), nullable=True)
    operario_id     = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas           = Column(Text, nullable=True)

    almacen  = relationship("WMSAlmacen", back_populates="conteos")
    detalles = relationship("WMSConteoDetalle", back_populates="conteo", cascade="all, delete-orphan")


class WMSConteoDetalle(Base, TimestampMixin):
    __tablename__ = "wms_conteos_detalle"
    id               = Column(Integer, primary_key=True, index=True)
    conteo_id        = Column(Integer, ForeignKey("wms_conteos_inventario.id"), nullable=False)
    producto_id      = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    ubicacion_id     = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=False)
    lote_id          = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad_sistema = Column(Float, nullable=False, default=0)
    cantidad_fisica  = Column(Float, nullable=True)
    diferencia       = Column(Float, nullable=True)   # computed: fisica - sistema
    ajustado         = Column(Boolean, default=False)

    conteo   = relationship("WMSConteoInventario", back_populates="detalles")
    producto  = relationship("WMSProducto", back_populates="conteos_detalle")
    ubicacion = relationship("WMSUbicacion", back_populates="conteos_detalle")
    lote      = relationship("WMSLote", back_populates="conteos_detalle")


# ─── Outbound ──────────────────────────────────────────────────────────────────

class WMSOrdenSalida(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "wms_ordenes_salida"
    id             = Column(Integer, primary_key=True, index=True)
    numero_orden   = Column(String(60), nullable=False, unique=True, index=True)
    cliente_id     = Column(Integer, ForeignKey("wms_clientes.id"), nullable=False)
    almacen_id     = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False)
    fecha_emision  = Column(Date, nullable=False)
    fecha_requerida = Column(Date, nullable=True)
    # PENDIENTE/EN_PICKING/EMPACANDO/DESPACHADO/ENTREGADO/CANCELADO
    estado         = Column(String(20), nullable=False, default="PENDIENTE")
    # BAJA/NORMAL/ALTA/URGENTE
    prioridad      = Column(String(20), nullable=False, default="NORMAL")
    # ECOMMERCE/B2B/RETAIL/TRANSFERENCIA
    canal          = Column(String(30), nullable=True)

    cliente   = relationship("WMSCliente", back_populates="ordenes_salida")
    almacen   = relationship("WMSAlmacen", back_populates="ordenes_salida")
    detalles  = relationship("WMSOrdenSalidaDetalle", back_populates="orden", cascade="all, delete-orphan")
    tareas_picking = relationship("WMSPickingTarea", back_populates="orden")
    despachos = relationship("WMSDespacho", back_populates="orden")
    devoluciones = relationship("WMSDevolucion", back_populates="orden_referencia")


class WMSOrdenSalidaDetalle(Base, TimestampMixin):
    __tablename__ = "wms_ordenes_salida_detalle"
    id                  = Column(Integer, primary_key=True, index=True)
    orden_id            = Column(Integer, ForeignKey("wms_ordenes_salida.id"), nullable=False)
    producto_id         = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    lote_id             = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad_solicitada = Column(Float, nullable=False)
    cantidad_preparada  = Column(Float, nullable=False, default=0)
    cantidad_despachada = Column(Float, nullable=False, default=0)
    precio_unitario     = Column(Float, nullable=True)
    # PENDIENTE/PARCIAL/COMPLETO
    estado              = Column(String(20), nullable=False, default="PENDIENTE")

    orden   = relationship("WMSOrdenSalida", back_populates="detalles")
    producto = relationship("WMSProducto", back_populates="salida_detalles")
    lote     = relationship("WMSLote", back_populates="salida_detalles")


class WMSPickingTarea(Base, TimestampMixin):
    __tablename__ = "wms_picking_tareas"
    id                   = Column(Integer, primary_key=True, index=True)
    orden_id             = Column(Integer, ForeignKey("wms_ordenes_salida.id"), nullable=False)
    operario_id          = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    # SINGLE/BATCH/ZONE/CLUSTER/WAVE
    tipo                 = Column(String(20), nullable=False, default="SINGLE")
    # PENDIENTE/EN_PROGRESO/COMPLETADA/CANCELADA
    estado               = Column(String(20), nullable=False, default="PENDIENTE")
    fecha_asignacion     = Column(DateTime(timezone=True), nullable=True)
    fecha_inicio         = Column(DateTime(timezone=True), nullable=True)
    fecha_fin            = Column(DateTime(timezone=True), nullable=True)
    ubicaciones_visitadas = Column(Integer, nullable=False, default=0)
    items_pickeados      = Column(Integer, nullable=False, default=0)

    orden   = relationship("WMSOrdenSalida", back_populates="tareas_picking")
    detalles = relationship("WMSPickingDetalle", back_populates="tarea", cascade="all, delete-orphan")


class WMSPickingDetalle(Base, TimestampMixin):
    __tablename__ = "wms_picking_detalles"
    id                    = Column(Integer, primary_key=True, index=True)
    tarea_id              = Column(Integer, ForeignKey("wms_picking_tareas.id"), nullable=False)
    producto_id           = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    ubicacion_id          = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=False)
    lote_id               = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad_solicitada   = Column(Float, nullable=False)
    cantidad_pickeada     = Column(Float, nullable=False, default=0)
    confirmado            = Column(Boolean, default=False)
    timestamp_confirmacion = Column(DateTime(timezone=True), nullable=True)

    tarea    = relationship("WMSPickingTarea", back_populates="detalles")
    producto  = relationship("WMSProducto", back_populates="picking_detalles")
    ubicacion = relationship("WMSUbicacion", back_populates="picking_detalles")
    lote      = relationship("WMSLote", back_populates="picking_detalles")


class WMSDespacho(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "wms_despachos"
    id                    = Column(Integer, primary_key=True, index=True)
    numero_despacho       = Column(String(60), nullable=False, unique=True, index=True)
    orden_id              = Column(Integer, ForeignKey("wms_ordenes_salida.id"), nullable=False)
    transportadora_id     = Column(Integer, ForeignKey("wms_transportadoras.id"), nullable=True)
    vehiculo_placa        = Column(String(20), nullable=True)
    conductor_nombre      = Column(String(150), nullable=True)
    fecha_despacho        = Column(Date, nullable=False)
    fecha_entrega_estimada = Column(Date, nullable=True)
    fecha_entrega_real    = Column(Date, nullable=True)
    # PREPARANDO/LISTO/EN_TRANSITO/ENTREGADO/INCIDENCIA
    estado                = Column(String(20), nullable=False, default="PREPARANDO")
    peso_total_kg         = Column(Float, nullable=True)
    volumen_total_m3      = Column(Float, nullable=True)
    notas                 = Column(Text, nullable=True)

    orden          = relationship("WMSOrdenSalida", back_populates="despachos")
    transportadora = relationship("WMSTransportadora", back_populates="despachos")
    detalles       = relationship("WMSDespachoDetalle", back_populates="despacho", cascade="all, delete-orphan")


class WMSDespachoDetalle(Base, TimestampMixin):
    __tablename__ = "wms_despachos_detalle"
    id               = Column(Integer, primary_key=True, index=True)
    despacho_id      = Column(Integer, ForeignKey("wms_despachos.id"), nullable=False)
    producto_id      = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    lote_id          = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad         = Column(Float, nullable=False)
    numero_tracking  = Column(String(100), nullable=True)

    despacho = relationship("WMSDespacho", back_populates="detalles")
    producto  = relationship("WMSProducto", back_populates="despacho_detalles")
    lote      = relationship("WMSLote", back_populates="despacho_detalles")


# ─── Historial de estado WMS ───────────────────────────────────────────────────

class WMSHistorialEstado(Base):
    """Registro inmutable de cada cambio de estado en entidades WMS (Despacho, OrdenSalida)."""
    __tablename__ = "wms_historial_estado"

    id              = Column(Integer, primary_key=True, index=True)
    # DESPACHO / ORDEN_SALIDA
    entidad_tipo    = Column(String(30), nullable=False, index=True)
    entidad_id      = Column(Integer, nullable=False, index=True)
    estado_anterior = Column(String(30), nullable=True)
    estado_nuevo    = Column(String(30), nullable=False)
    # AVANCE / CORRECCION
    tipo_cambio     = Column(String(20), nullable=False, default="AVANCE")
    observacion     = Column(Text, nullable=True)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    fecha           = Column(DateTime(timezone=True), nullable=False,
                             default=lambda: datetime.now(_tz.utc))

    usuario = relationship("Usuario")


# ─── Devoluciones ──────────────────────────────────────────────────────────────

class WMSDevolucion(Base, TimestampMixin):
    __tablename__ = "wms_devoluciones"
    id                 = Column(Integer, primary_key=True, index=True)
    numero_devolucion  = Column(String(60), nullable=False, unique=True, index=True)
    # CLIENTE/PROVEEDOR
    tipo               = Column(String(20), nullable=False)
    orden_referencia_id = Column(Integer, ForeignKey("wms_ordenes_salida.id"), nullable=True)
    cliente_id         = Column(Integer, ForeignKey("wms_clientes.id"), nullable=True)
    proveedor_id       = Column(Integer, ForeignKey("wms_proveedores.id"), nullable=True)
    almacen_id         = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=False)
    fecha_recepcion    = Column(Date, nullable=False)
    # RECIBIDA/INSPECCION/APROBADA/RECHAZADA/REINGRESADA
    estado             = Column(String(20), nullable=False, default="RECIBIDA")
    motivo             = Column(String(255), nullable=True)
    notas              = Column(Text, nullable=True)

    orden_referencia = relationship("WMSOrdenSalida", back_populates="devoluciones")
    cliente          = relationship("WMSCliente", back_populates="devoluciones")
    proveedor        = relationship("WMSProveedor", back_populates="devoluciones")
    almacen          = relationship("WMSAlmacen", back_populates="devoluciones")
    detalles         = relationship("WMSDevolucionDetalle", back_populates="devolucion", cascade="all, delete-orphan")


class WMSDevolucionDetalle(Base, TimestampMixin):
    __tablename__ = "wms_devoluciones_detalle"
    id             = Column(Integer, primary_key=True, index=True)
    devolucion_id  = Column(Integer, ForeignKey("wms_devoluciones.id"), nullable=False)
    producto_id    = Column(Integer, ForeignKey("wms_productos.id"), nullable=False)
    lote_id        = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)
    cantidad       = Column(Float, nullable=False)
    # BUENO/DANO_MENOR/DANO_MAYOR/DESTRUIR
    estado_calidad = Column(String(20), nullable=False, default="BUENO")
    # REINGRESAR/CUARENTENA/DESTRUIR/DEVOLVER_PROVEEDOR
    accion         = Column(String(30), nullable=False, default="REINGRESAR")
    reingresado    = Column(Boolean, default=False)

    devolucion = relationship("WMSDevolucion", back_populates="detalles")
    producto   = relationship("WMSProducto", back_populates="devolucion_detalles")
    lote       = relationship("WMSLote", back_populates="devolucion_detalles")


# ─── Trazabilidad ──────────────────────────────────────────────────────────────

class WMSEventoTrazabilidad(Base, TimestampMixin):
    __tablename__ = "wms_eventos_trazabilidad"
    id               = Column(Integer, primary_key=True, index=True)
    tipo_evento      = Column(String(60), nullable=False)
    entidad_tipo     = Column(String(60), nullable=True)
    entidad_id       = Column(Integer, nullable=True)
    descripcion      = Column(Text, nullable=True)
    datos_adicionales = Column(JSON, nullable=True)
    usuario_id       = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ubicacion_id     = Column(Integer, ForeignKey("wms_ubicaciones.id"), nullable=True)
    producto_id      = Column(Integer, ForeignKey("wms_productos.id"), nullable=True)
    lote_id          = Column(Integer, ForeignKey("wms_lotes.id"), nullable=True)

    ubicacion = relationship("WMSUbicacion", back_populates="eventos_trazabilidad")
    producto  = relationship("WMSProducto", back_populates="eventos_trazabilidad")
    lote      = relationship("WMSLote", back_populates="eventos_trazabilidad")


# ─── KPI Diario ────────────────────────────────────────────────────────────────

class WMSKPIDiario(Base, TimestampMixin):
    __tablename__ = "wms_kpi_diario"
    id                     = Column(Integer, primary_key=True, index=True)
    fecha                  = Column(Date, nullable=False, unique=True, index=True)
    almacen_id             = Column(Integer, ForeignKey("wms_almacenes.id"), nullable=True)
    ordenes_total          = Column(Integer, nullable=False, default=0)
    ordenes_on_time        = Column(Integer, nullable=False, default=0)
    ordenes_in_full        = Column(Integer, nullable=False, default=0)
    ordenes_otif           = Column(Integer, nullable=False, default=0)
    ordenes_perfect        = Column(Integer, nullable=False, default=0)
    fill_rate              = Column(Float, nullable=True)
    inventory_accuracy     = Column(Float, nullable=True)
    cost_per_order         = Column(Float, nullable=True)
    dock_to_stock_minutes  = Column(Float, nullable=True)
    picking_accuracy       = Column(Float, nullable=True)
    shipping_accuracy      = Column(Float, nullable=True)

    almacen = relationship("WMSAlmacen", back_populates="kpis_diarios")
