"""
TittanLite: inspecciones y disposiciones de llantas hechas en campo «sin
restricciones».

Lite guarda TODO lo que se registra, aunque contradiga el seguimiento de
TittanWare (un odómetro menor, una profundidad que sube, una llanta que allá
está en otro vehículo). Sus informes usan todo. Al sincronizar, cada línea pasa
por las reglas de TittanWare: lo que las cumple entra al seguimiento; lo que no,
se queda en Lite con el motivo, para que un analista lo revise.
"""
from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from app.infrastructure.models.base import Base, TimestampMixin

# Estados de sincronización de una línea (llanta inspeccionada o disposición).
#   PENDIENTE        todavía no se intentó
#   SINCRONIZADA     entró al seguimiento de TittanWare
#   RECHAZADA        TittanWare la rechazó: el motivo dice por qué
#   SIN_SEGUIMIENTO  la llanta no existe en TittanWare: solo vive en Lite


class LiteInspeccion(Base, TimestampMixin):
    __tablename__ = "eam_lite_inspeccion"
    id            = Column(Integer, primary_key=True, index=True)
    # La app genera este identificador antes de enviar: si la conexión se cae y
    # reintenta, la inspección no se duplica.
    uuid          = Column(String(40), unique=True, nullable=False, index=True)
    activo_id     = Column(Integer, ForeignKey("eam_activo.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha         = Column(DateTime, nullable=False, index=True)
    odometro      = Column(Float)
    horometro     = Column(Float)
    inspector     = Column(String(120))
    observaciones = Column(Text)
    usuario_id    = Column(Integer)
    estado_sync   = Column(String(20), default="PENDIENTE", nullable=False)   # resumen de sus líneas
    sincronizada_en = Column(DateTime)


class LiteInspeccionLlanta(Base, TimestampMixin):
    __tablename__ = "eam_lite_inspeccion_llanta"
    id                  = Column(Integer, primary_key=True, index=True)
    inspeccion_id       = Column(Integer, ForeignKey("eam_lite_inspeccion.id", ondelete="CASCADE"),
                                 nullable=False, index=True)
    posicion            = Column(String(30))
    codigo              = Column(String(50), index=True)
    neumatico_id        = Column(Integer, ForeignKey("eam_neumatico.id", ondelete="SET NULL"), nullable=True)
    marca               = Column(String(100))
    referencia          = Column(String(100))
    medida              = Column(String(50))
    reencauches         = Column(Integer)
    profundidad_interna = Column(Float)
    profundidad_central = Column(Float)
    profundidad_externa = Column(Float)
    presion             = Column(Float)
    novedades           = Column(JSON)          # ["BAJA_PRESION", "CORTE", …]
    observacion         = Column(Text)
    sync_estado         = Column(String(20), default="PENDIENTE", nullable=False)
    sync_motivo         = Column(String(400))
    inspeccion_principal_id = Column(Integer)   # la inspección creada en TittanWare


class LiteDisposicion(Base, TimestampMixin):
    __tablename__ = "eam_lite_disposicion"
    id                  = Column(Integer, primary_key=True, index=True)
    uuid                = Column(String(40), unique=True, nullable=False, index=True)
    fecha               = Column(DateTime, nullable=False, index=True)
    codigo              = Column(String(50), nullable=False, index=True)
    activo_id           = Column(Integer, ForeignKey("eam_activo.id", ondelete="SET NULL"), nullable=True)
    dano_id             = Column(Integer, ForeignKey("eam_dano_neumatico_catalogo.id"), nullable=True)
    marca               = Column(String(100))
    referencia          = Column(String(100))
    medida              = Column(String(50))
    dot                 = Column(String(20))
    reencauches         = Column(Integer)
    profundidad_interna = Column(Float)
    profundidad_central = Column(Float)
    profundidad_externa = Column(Float)
    reparaciones        = Column(Integer)
    regrabada           = Column(Boolean, default=False)
    diseno_reencauche   = Column(String(100))
    ubicacion_actual    = Column(String(150))
    observaciones       = Column(Text)
    inspector           = Column(String(120))
    usuario_id          = Column(Integer)
    sync_estado         = Column(String(20), default="PENDIENTE", nullable=False)
    sync_motivo         = Column(String(400))
    disposicion_id      = Column(Integer)       # la disposición creada en TittanWare


class LiteFoto(Base, TimestampMixin):
    __tablename__ = "eam_lite_foto"
    id                 = Column(Integer, primary_key=True, index=True)
    inspeccion_llanta_id = Column(Integer, ForeignKey("eam_lite_inspeccion_llanta.id", ondelete="CASCADE"),
                                  nullable=True, index=True)
    disposicion_id     = Column(Integer, ForeignKey("eam_lite_disposicion.id", ondelete="CASCADE"),
                                nullable=True, index=True)
    tipo               = Column(String(20), default="OTRA")
    archivo            = Column(String(300), nullable=False)
    nombre             = Column(String(200))
    foto_principal_id  = Column(Integer)        # la copia en las fotos de la llanta, si sincronizó
