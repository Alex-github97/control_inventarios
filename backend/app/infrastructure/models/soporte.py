"""
Mesa de ayuda: tickets, conversación y adjuntos.

Vive en el esquema `public` y no dentro del de cada cliente, a diferencia de
todo lo operativo. La razón es la cola: soporte necesita ver de un vistazo lo
de todas las empresas, y si cada ticket viviera en su esquema habría que
recorrer los veinte esquemas en cada consulta para armar una sola lista.

Además, un ticket no es información del cliente sobre su operación: es una
conversación entre él y quien opera la plataforma.
"""
import sqlalchemy as sa
from app.infrastructure.models.base import Base, TimestampMixin
from app.core.tenant import ESQUEMA_PLATAFORMA


# Estados del flujo, en el orden en que ocurren.
ESTADOS = ("NUEVO", "EN_PROGRESO", "ESPERANDO_CLIENTE", "RESUELTO", "CERRADO")

# La criticidad la fija soporte, no quien reporta: todo el mundo cree que lo
# suyo es urgente, y si la decidiera el usuario la cola dejaría de ordenar nada.
CRITICIDADES = ("BAJA", "MEDIA", "ALTA", "CRITICA")

# Lo que sí declara el usuario: cuánto lo afecta. Sirve de punto de partida
# para la criticidad, pero no la determina.
IMPACTOS = ("CONSULTA", "MOLESTIA", "BLOQUEA_TAREA", "OPERACION_DETENIDA")


class SoporteTicket(Base, TimestampMixin):
    """Un requerimiento de soporte."""

    __tablename__ = "soporte_ticket"
    __table_args__ = {"schema": ESQUEMA_PLATAFORMA}

    id     = sa.Column(sa.Integer, primary_key=True, index=True)
    # Consecutivo visible: es lo que la gente cita por teléfono.
    numero = sa.Column(sa.String(24), unique=True, nullable=False, index=True)

    # De qué empresa viene. Se guarda también el código porque el ticket se
    # consulta por él en cada petición del portal.
    cliente_id     = sa.Column(sa.Integer, nullable=False, index=True)
    cliente_codigo = sa.Column(sa.String(40), nullable=False, index=True)

    # Quién lo abrió, dentro de esa empresa.
    autor        = sa.Column(sa.String(80), nullable=False)
    autor_nombre = sa.Column(sa.String(160))
    autor_email  = sa.Column(sa.String(200))

    asunto      = sa.Column(sa.String(200), nullable=False)
    categoria   = sa.Column(sa.String(60))     # Error, Duda, Mejora, Datos…
    modulo      = sa.Column(sa.String(40))     # dónde le pasó
    impacto     = sa.Column(sa.String(30), default="MOLESTIA")

    estado      = sa.Column(sa.String(30), default="NUEVO", index=True)
    criticidad  = sa.Column(sa.String(20), default="MEDIA", index=True)
    asignado_a  = sa.Column(sa.String(80), index=True)

    # Para medir la atención sin depender de la memoria de nadie.
    primera_respuesta_en = sa.Column(sa.DateTime)
    resuelto_en          = sa.Column(sa.DateTime)
    cerrado_en           = sa.Column(sa.DateTime)
    # Se toca con cada mensaje: es por lo que se ordena la cola.
    ultima_actividad     = sa.Column(sa.DateTime, index=True)


class SoporteMensaje(Base):
    """Cada intervención en la conversación de un ticket."""

    __tablename__ = "soporte_mensaje"
    __table_args__ = {"schema": ESQUEMA_PLATAFORMA}

    id        = sa.Column(sa.Integer, primary_key=True, index=True)
    ticket_id = sa.Column(sa.Integer, nullable=False, index=True)

    autor        = sa.Column(sa.String(80), nullable=False)
    autor_nombre = sa.Column(sa.String(160))
    # Distingue quién habla sin tener que cruzar con la tabla de usuarios, que
    # además vive en otro esquema.
    es_soporte   = sa.Column(sa.Boolean, default=False)

    cuerpo = sa.Column(sa.Text, nullable=False)
    # Nota interna del equipo: el cliente no la ve. Sin esto, coordinar entre
    # dos personas de soporte obligaría a salirse de la herramienta.
    interno = sa.Column(sa.Boolean, default=False)

    creado_en = sa.Column(sa.DateTime, nullable=False, index=True)


class SoporteAdjunto(Base):
    """Un archivo del ticket.

    Se guarda la ruta y no el contenido: la base no es lugar para binarios. La
    descarga pasa por un endpoint que comprueba permisos, no por una carpeta
    pública — un pantallazo de soporte puede traer datos de otra empresa.
    """

    __tablename__ = "soporte_adjunto"
    __table_args__ = {"schema": ESQUEMA_PLATAFORMA}

    id         = sa.Column(sa.Integer, primary_key=True, index=True)
    ticket_id  = sa.Column(sa.Integer, nullable=False, index=True)
    mensaje_id = sa.Column(sa.Integer, index=True)

    nombre    = sa.Column(sa.String(255), nullable=False)
    tipo_mime = sa.Column(sa.String(120))
    tamano    = sa.Column(sa.Integer)
    # Ruta relativa dentro de UPLOAD_DIR.
    ruta      = sa.Column(sa.String(400), nullable=False)

    subido_por = sa.Column(sa.String(80))
    creado_en  = sa.Column(sa.DateTime, nullable=False)
