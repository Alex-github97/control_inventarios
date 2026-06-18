import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.infrastructure.models.base import TimestampMixin, SoftDeleteMixin


class RolUsuario(str, enum.Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    SUPERVISOR_LOGISTICO = "SUPERVISOR_LOGISTICO"
    OPERADOR_BODEGA = "OPERADOR_BODEGA"
    AUDITOR = "AUDITOR"
    CONSULTA = "CONSULTA"


class Usuario(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False, default=RolUsuario.CONSULTA)
    rol_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    telefono = Column(String(20), nullable=True)
    cargo = Column(String(150), nullable=True)
    ultimo_login = Column(DateTime(timezone=True), nullable=True)
    intentos_fallidos = Column(Integer, default=0)
    bloqueado = Column(Boolean, default=False)

    rol_obj = relationship("Rol", back_populates="usuarios", foreign_keys=[rol_id])

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellido}"
