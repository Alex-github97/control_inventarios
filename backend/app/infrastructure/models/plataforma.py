"""
Registro de clientes de la plataforma.

Vive en el esquema `public` y no dentro del de cada cliente: hay que poder
consultarlo en el paso previo al login, cuando todavía no se sabe a qué cliente
se está entrando.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.infrastructure.models.base import Base, TimestampMixin
from app.core.tenant import ESQUEMA_PLATAFORMA


class PlataformaCliente(Base, TimestampMixin):
    """Una empresa que usa la plataforma.

    `codigo` es lo que se escribe en la pantalla previa al login y lo que
    determina el esquema donde viven sus datos, así que no se puede cambiar
    después: sus tablas quedarían huérfanas.
    """

    __tablename__ = "plataforma_cliente"
    __table_args__ = {"schema": ESQUEMA_PLATAFORMA}

    id       = Column(Integer, primary_key=True, index=True)
    codigo   = Column(String(40), unique=True, nullable=False, index=True)
    nombre   = Column(String(200), nullable=False)
    esquema  = Column(String(60), unique=True, nullable=False)
    # Identidad visual de cada cliente en su propio portal.
    logo_url = Column(String(400))
    color    = Column(String(20))
    nit      = Column(String(30))
    activo   = Column(Boolean, default=True)
    # Se apaga el acceso sin borrar los datos.
    suspendido_desde = Column(DateTime)
