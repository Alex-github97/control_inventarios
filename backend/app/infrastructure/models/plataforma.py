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
    # Quien opera la plataforma: da de alta y suspende a las demás empresas.
    # Va acá, fuera de los esquemas, para que ningún cliente pueda otorgárselo.
    es_operador = Column(Boolean, default=False)
    # Se apaga el acceso sin borrar los datos.
    suspendido_desde = Column(DateTime)


class PlataformaBitacora(Base):
    """Lo que el operador hace sobre las empresas y sus usuarios.

    El operador puede crear usuarios dentro de cualquier empresa y restablecer
    sus claves, que es poder suficiente para entrar a la cuenta de un cliente.
    Ese poder hace falta para dar soporte, pero tiene que dejar rastro: sin esta
    tabla no habría forma de saber, después, quién entró a qué.

    Vive en `public` junto al registro y no dentro del esquema del cliente: si
    estuviera allí, el propio operador podría borrar su rastro con las mismas
    credenciales con las que actuó.
    """

    __tablename__ = "plataforma_bitacora"
    __table_args__ = {"schema": ESQUEMA_PLATAFORMA}

    id      = Column(Integer, primary_key=True, index=True)
    fecha   = Column(DateTime, nullable=False, index=True)
    # Quién actuó: el usuario y la empresa desde la que lo hizo.
    actor           = Column(String(80), nullable=False)
    actor_empresa   = Column(String(40), nullable=False)
    # Qué hizo y sobre qué empresa.
    accion          = Column(String(60), nullable=False, index=True)
    empresa_codigo  = Column(String(40), index=True)
    # Texto libre con lo que distingue a esta acción de otra igual.
    detalle         = Column(String(500))
