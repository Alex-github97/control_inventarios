"""
Solicitudes de contacto que llegan desde la landing.

Quien escribe todavía no es cliente: no tiene empresa en la plataforma ni
usuario, así que no cabe ni en el registro de clientes ni en la mesa de ayuda,
que cuelgan de una empresa. Vive aparte, en el esquema `public` junto a ellos,
y sin llaves hacia ninguno: un prospecto no es un cliente a medio crear.
"""
import sqlalchemy as sa
from app.infrastructure.models.base import Base, TimestampMixin
from app.core.tenant import ESQUEMA_PLATAFORMA


# Lo que soporte hace con la solicitud. No hay más pasos a propósito: lo que
# sigue después de contactarlo es una conversación comercial, no un flujo.
ESTADOS_PROSPECTO = ("NUEVO", "CONTACTADO", "DESCARTADO")


class LandingProspecto(Base, TimestampMixin):
    """Una solicitud de contacto de alguien que todavía no es cliente."""

    __tablename__ = "landing_prospecto"
    __table_args__ = {"schema": ESQUEMA_PLATAFORMA}

    id       = sa.Column(sa.Integer, primary_key=True, index=True)
    nombre   = sa.Column(sa.String(160), nullable=False)
    correo   = sa.Column(sa.String(200), nullable=False, index=True)
    empresa  = sa.Column(sa.String(200))
    telefono = sa.Column(sa.String(40))
    mensaje  = sa.Column(sa.Text, nullable=False)
    # La página desde la que se envió: la landing o el folleto de un módulo.
    origen   = sa.Column(sa.String(200))

    # Solo para frenar envíos en serie desde un mismo lugar.
    ip         = sa.Column(sa.String(64), index=True)
    user_agent = sa.Column(sa.String(300))

    estado       = sa.Column(sa.String(20), nullable=False, default="NUEVO", index=True)
    atendido_por = sa.Column(sa.String(80))
    atendido_en  = sa.Column(sa.DateTime)
