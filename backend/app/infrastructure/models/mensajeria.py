"""
Envío de informes de llantas por WhatsApp, Telegram y correo.

Los bots y el correo son de TittanWare, uno para todos los clientes: sus
credenciales van en la configuración del servidor (settings), no aquí. Cada
cliente solo registra a quién se envía.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.infrastructure.models.base import Base, TimestampMixin


class MensajeriaDestinatario(Base, TimestampMixin):
    __tablename__ = "eam_mensajeria_destinatario"
    id               = Column(Integer, primary_key=True, index=True)
    alias            = Column(String(120), nullable=False)
    telefono         = Column(String(30))     # WhatsApp, con indicativo: 573001234567
    correo           = Column(String(160))
    telegram_usuario = Column(String(80))     # @usuario, solo para reconocerlo en la lista
    # Telegram no deja que un bot le escriba primero a nadie: la persona abre el
    # enlace del bot una vez y queda vinculado su chat.
    telegram_chat_id = Column(String(40))
    token_vinculo    = Column(String(40), unique=True, index=True)
    # PERSONA (chat propio, WhatsApp, correo) o GRUPO_TELEGRAM: el administrador
    # del cliente agrega el bot a su grupo con el enlace `startgroup` y los
    # informes le llegan a todos los integrantes sin que hagan nada.
    tipo             = Column(String(20), default="PERSONA")
    telegram_titulo  = Column(String(160))    # nombre del grupo en Telegram
    activo           = Column(Boolean, default=True)
    # Columnas de la primera versión (canales por destinatario); ya no se usan.
    telegram         = Column(Boolean, default=True)
    whatsapp         = Column(Boolean, default=True)


class MensajeriaEnvio(Base, TimestampMixin):
    __tablename__ = "eam_mensajeria_envio"
    id              = Column(Integer, primary_key=True, index=True)
    destinatario_id = Column(Integer, index=True)
    alias           = Column(String(120))
    canal           = Column(String(10))      # WHATSAPP | TELEGRAM | CORREO
    informe         = Column(String(200))
    archivo         = Column(String(200))
    estado          = Column(String(12))      # ENVIADO | ERROR
    error           = Column(String(500))
    enviado_por     = Column(String(120))
    fecha           = Column(DateTime)
