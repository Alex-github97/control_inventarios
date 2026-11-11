"""
Mensajería de informes (Telegram y WhatsApp Business), por cuenta.

Cada cuenta pone sus propias credenciales (su bot de Telegram, su número de
WhatsApp Business) y sus destinatarios. Los tokens se guardan cifrados con la
clave del servidor y nunca vuelven a la pantalla completos.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.infrastructure.models.base import Base, TimestampMixin


class MensajeriaConfig(Base, TimestampMixin):
    __tablename__ = "eam_mensajeria_config"
    id                  = Column(Integer, primary_key=True)          # fila única id=1
    telegram_token      = Column(Text)        # cifrado
    telegram_usuario    = Column(String(80))  # @usuario del bot, para el enlace t.me
    telegram_offset     = Column(Integer, default=0)   # último update leído
    whatsapp_token      = Column(Text)        # cifrado
    whatsapp_numero_id  = Column(String(40))  # phone_number_id de la API de WhatsApp Cloud
    whatsapp_plantilla  = Column(String(120)) # plantilla aprobada por Meta con encabezado de documento
    whatsapp_idioma     = Column(String(10), default="es")


class MensajeriaDestinatario(Base, TimestampMixin):
    __tablename__ = "eam_mensajeria_destinatario"
    id               = Column(Integer, primary_key=True, index=True)
    alias            = Column(String(120), nullable=False)
    telefono         = Column(String(30))     # con indicativo: 573001234567
    telegram         = Column(Boolean, default=True)
    whatsapp         = Column(Boolean, default=True)
    # Telegram no permite escribirle a un número: la persona abre el enlace del
    # bot una vez y queda vinculado su chat.
    telegram_chat_id = Column(String(40))
    token_vinculo    = Column(String(40), unique=True, index=True)
    activo           = Column(Boolean, default=True)


class MensajeriaEnvio(Base, TimestampMixin):
    __tablename__ = "eam_mensajeria_envio"
    id              = Column(Integer, primary_key=True, index=True)
    destinatario_id = Column(Integer, index=True)
    alias           = Column(String(120))
    canal           = Column(String(10))      # TELEGRAM | WHATSAPP
    informe         = Column(String(200))
    archivo         = Column(String(200))
    estado          = Column(String(12))      # ENVIADO | ERROR
    error           = Column(String(500))
    enviado_por     = Column(String(120))
    fecha           = Column(DateTime)
