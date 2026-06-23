from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict
from datetime import datetime


class UsuarioBase(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    username: str
    rol: str = "CONSULTA"
    telefono: Optional[str] = None
    cargo: Optional[str] = None


class UsuarioCreate(UsuarioBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[str] = None
    telefono: Optional[str] = None
    cargo: Optional[str] = None
    activo: Optional[bool] = None


class UsuarioResponse(UsuarioBase):
    id: int
    activo: bool
    ultimo_login: Optional[datetime] = None
    created_at: datetime
    permisos: Dict[str, bool] = {}

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UsuarioResponse


class ChangePasswordRequest(BaseModel):
    password_actual: str
    password_nuevo: str
