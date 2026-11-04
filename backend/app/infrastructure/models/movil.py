"""
App móvil — dispositivos vinculados. Prefijo de tabla: movil_

La sesión del portal se cierra a los 10 minutos sin uso: en el patio, sin
señal, un técnico la perdería a mitad de turno. Por eso el teléfono recibe una
sesión propia de dispositivo que dura 30 días desde el último uso y se puede
revocar. Con ella pide tokens de acceso normales (los mismos del portal), así
que el resto de la API no distingue si la petición viene de la app.

El secreto de renovación nunca se guarda: solo su huella SHA-256. Se rota en
cada renovación; si alguien presenta el anterior (copiado, o un teléfono
clonado), el dispositivo se revoca.
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.infrastructure.models.base import Base, TimestampMixin


class MovilDispositivo(Base, TimestampMixin):
    __tablename__ = "movil_dispositivo"
    id              = Column(Integer, primary_key=True)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre          = Column(String(120), nullable=False)      # «Moto g84 de Laura»
    modelo          = Column(String(120), nullable=True)
    version_app     = Column(String(30), nullable=True)
    huella          = Column(String(64), nullable=False, unique=True)
    huella_anterior = Column(String(64), nullable=True, index=True)
    # Huella corta del hash de la clave al vincular: si la clave cambia, el
    # dispositivo deja de renovar sin depender de que cada pantalla que cambia
    # claves se acuerde de revocarlo.
    huella_clave    = Column(String(16), nullable=False)
    ultimo_uso      = Column(DateTime(timezone=True), nullable=False)
    vence           = Column(DateTime(timezone=True), nullable=False)
    revocado_en     = Column(DateTime(timezone=True), nullable=True)
    motivo          = Column(String(200), nullable=True)
