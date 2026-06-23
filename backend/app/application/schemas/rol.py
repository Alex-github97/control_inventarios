from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime


class RolPermisos(BaseModel):
    # CI — Control de Inventarios
    dashboard: bool = False
    estibas: bool = False
    movimientos: bool = False
    manifiestos: bool = False
    vehiculos: bool = False
    ubicaciones: bool = False
    proveedores: bool = False
    alertas: bool = False
    danos: bool = False
    trazabilidad: bool = False
    mantenimiento: bool = False
    costos: bool = False
    consultas: bool = False
    # Otros módulos del sistema
    tx: bool = False
    ft: bool = False
    gf: bool = False
    ml: bool = False
    wms: bool = False
    gh: bool = False
    tms: bool = False
    dms: bool = False
    qms: bool = False
    grc: bool = False
    lms: bool = False
    crm: bool = False
    eam: bool = False
    mes: bool = False
    aps: bool = False
    # Administración
    usuarios: bool = False


class RolCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    label: Optional[str] = None
    descripcion: Optional[str] = None
    color: str = "#6366f1"
    permisos: RolPermisos


class RolUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    label: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None
    permisos: Optional[RolPermisos] = None


class RolResponse(BaseModel):
    id: int
    nombre: str
    label: Optional[str] = None
    descripcion: Optional[str] = None
    color: str
    permisos: Dict[str, bool]
    es_sistema: bool
    total_usuarios: int = 0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
