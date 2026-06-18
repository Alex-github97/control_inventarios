from sqlalchemy import Column, Integer, String, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.infrastructure.models.base import TimestampMixin

MODULOS_SISTEMA = [
    "dashboard", "estibas", "movimientos", "manifiestos", "vehiculos",
    "ubicaciones", "proveedores", "alertas", "danos", "trazabilidad",
    "mantenimiento", "costos", "consultas", "usuarios",
]

ROLES_DEFECTO = [
    {
        "nombre": "ADMINISTRADOR",
        "label": "Administrador",
        "descripcion": "Acceso total al sistema. Puede crear usuarios y ver todos los módulos.",
        "color": "#DC2626",
        "es_sistema": True,
        "permisos": {m: True for m in MODULOS_SISTEMA},
    },
    {
        "nombre": "SUPERVISOR_LOGISTICO",
        "label": "Supervisor Logístico",
        "descripcion": "Gestiona operaciones logísticas y supervisa movimientos y costos.",
        "color": "#D97706",
        "es_sistema": True,
        "permisos": {
            "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
            "manifiestos": True, "vehiculos": True, "ubicaciones": True, "proveedores": True,
            "danos": True, "alertas": True, "usuarios": False, "mantenimiento": True,
            "costos": True, "consultas": True,
        },
    },
    {
        "nombre": "OPERADOR_BODEGA",
        "label": "Operador de Bodega",
        "descripcion": "Registra movimientos, crea estibas y gestiona mantenimientos.",
        "color": "#2563EB",
        "es_sistema": True,
        "permisos": {
            "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
            "manifiestos": False, "vehiculos": False, "ubicaciones": True, "proveedores": False,
            "danos": False, "alertas": True, "usuarios": False, "mantenimiento": True,
            "costos": False, "consultas": False,
        },
    },
    {
        "nombre": "AUDITOR",
        "label": "Auditor",
        "descripcion": "Acceso de lectura a todos los módulos para auditoría y control.",
        "color": "#7C3AED",
        "es_sistema": True,
        "permisos": {
            "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
            "manifiestos": True, "vehiculos": True, "ubicaciones": True, "proveedores": True,
            "danos": True, "alertas": True, "usuarios": False, "mantenimiento": True,
            "costos": True, "consultas": True,
        },
    },
    {
        "nombre": "CONSULTA",
        "label": "Consulta",
        "descripcion": "Solo puede ver el dashboard, estibas y trazabilidad.",
        "color": "#6B7280",
        "es_sistema": True,
        "permisos": {
            "dashboard": True, "estibas": True, "movimientos": False, "trazabilidad": True,
            "manifiestos": False, "vehiculos": False, "ubicaciones": False, "proveedores": False,
            "danos": False, "alertas": False, "usuarios": False, "mantenimiento": False,
            "costos": False, "consultas": False,
        },
    },
]


class Rol(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    label = Column(String(150), nullable=True)
    descripcion = Column(Text, nullable=True)
    color = Column(String(20), default="#6366f1", nullable=False)
    permisos = Column(JSON, nullable=False, default=dict)
    es_sistema = Column(Boolean, default=False, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol_obj", lazy="dynamic")
