"""
TittanBot: conversaciones, mensajes, la bitácora de lo que hizo y sus descargas.

Todo vive en el esquema de la empresa: una conversación es de una persona de
una empresa, y su bitácora es parte de la auditoría de esa empresa.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func

from app.infrastructure.models.base import Base, TimestampMixin


class TittanbotConversacion(Base, TimestampMixin):
    __tablename__ = "tittanbot_conversacion"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = Column(String(200))
    ultimo_en = Column(DateTime, server_default=func.now(), index=True)
    # La acción que el bot propuso y espera «Confirmar». Se guarda acá y no se
    # recibe del navegador: lo que se ejecuta es exactamente lo que se mostró.
    pendiente = Column(Text)


class TittanbotMensaje(Base, TimestampMixin):
    """Solo el texto de cada turno. Las llamadas a herramientas de un turno no se
    guardan como historia del modelo: el siguiente turno parte de lo dicho, no de
    lo que el modelo pensó en el anterior."""
    __tablename__ = "tittanbot_mensaje"
    id = Column(Integer, primary_key=True, index=True)
    conversacion_id = Column(Integer, ForeignKey("tittanbot_conversacion.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    rol = Column(String(12), nullable=False)        # usuario | asistente
    texto = Column(Text)


class TittanbotAccion(Base, TimestampMixin):
    """Cada herramienta que el bot ejecutó, con su resultado: quién, qué, cuándo."""
    __tablename__ = "tittanbot_accion"
    id = Column(Integer, primary_key=True, index=True)
    conversacion_id = Column(Integer, ForeignKey("tittanbot_conversacion.id", ondelete="SET NULL"), index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), index=True)
    herramienta = Column(String(60), nullable=False, index=True)
    argumentos = Column(Text)
    confirmada = Column(Boolean, default=False)     # True si fue una acción con tarjeta
    exito = Column(Boolean, default=False)
    resultado = Column(Text)


class TittanbotDescarga(Base, TimestampMixin):
    """Un archivo que el bot armó para el usuario. El enlace lo abre solo su
    dueño y vence; el archivo se borra con los viejos."""
    __tablename__ = "tittanbot_descarga"
    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    nombre = Column(String(200), nullable=False)
    ruta = Column(String(400), nullable=False)
    tipo = Column(String(80), nullable=False)
    vence = Column(DateTime, nullable=False)
