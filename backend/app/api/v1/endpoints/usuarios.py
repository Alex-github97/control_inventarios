from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.security import hash_password
from app.infrastructure.repositories.usuario_repository import UsuarioRepository
from app.infrastructure.models.usuario import Usuario, RolUsuario
from app.application.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/roles-info")
async def info_roles(current_user: Usuario = Depends(require_admin)):
    return [
        {
            "rol": RolUsuario.ADMINISTRADOR,
            "label": "Administrador",
            "descripcion": "Acceso total al sistema. Puede crear usuarios y ver todos los módulos.",
            "modulos": {
                "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
                "manifiestos": True, "vehiculos": True, "ubicaciones": True, "proveedores": True,
                "danos": True, "alertas": True, "usuarios": True, "mantenimiento": True, "costos": True,
            },
        },
        {
            "rol": RolUsuario.SUPERVISOR_LOGISTICO,
            "label": "Supervisor Logístico",
            "descripcion": "Gestiona operaciones logísticas y supervisa movimientos y costos.",
            "modulos": {
                "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
                "manifiestos": True, "vehiculos": True, "ubicaciones": True, "proveedores": True,
                "danos": True, "alertas": True, "usuarios": False, "mantenimiento": True, "costos": True,
            },
        },
        {
            "rol": RolUsuario.OPERADOR_BODEGA,
            "label": "Operador de Bodega",
            "descripcion": "Registra movimientos, crea estibas y gestiona mantenimientos.",
            "modulos": {
                "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
                "manifiestos": False, "vehiculos": False, "ubicaciones": True, "proveedores": False,
                "danos": False, "alertas": True, "usuarios": False, "mantenimiento": True, "costos": False,
            },
        },
        {
            "rol": RolUsuario.AUDITOR,
            "label": "Auditor",
            "descripcion": "Acceso de lectura a todos los módulos para auditoría y control.",
            "modulos": {
                "dashboard": True, "estibas": True, "movimientos": True, "trazabilidad": True,
                "manifiestos": True, "vehiculos": True, "ubicaciones": True, "proveedores": True,
                "danos": True, "alertas": True, "usuarios": False, "mantenimiento": True, "costos": True,
            },
        },
        {
            "rol": RolUsuario.CONSULTA,
            "label": "Consulta",
            "descripcion": "Solo puede ver el dashboard, estibas y trazabilidad.",
            "modulos": {
                "dashboard": True, "estibas": True, "movimientos": False, "trazabilidad": True,
                "manifiestos": False, "vehiculos": False, "ubicaciones": False, "proveedores": False,
                "danos": False, "alertas": False, "usuarios": False, "mantenimiento": False, "costos": False,
            },
        },
    ]


@router.get("/", response_model=List[UsuarioResponse])
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    repo = UsuarioRepository(db)
    return await repo.get_activos()


@router.post("/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(
    data: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    repo = UsuarioRepository(db)
    if await repo.get_by_email(data.email):
        raise HTTPException(status_code=409, detail="El email ya está registrado")
    if await repo.get_by_username(data.username):
        raise HTTPException(status_code=409, detail="El nombre de usuario ya está en uso")
    user = Usuario(
        nombre=data.nombre, apellido=data.apellido, email=data.email,
        username=data.username, hashed_password=hash_password(data.password),
        rol=data.rol, telefono=data.telefono, cargo=data.cargo,
    )
    return await repo.create(user)


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    repo = UsuarioRepository(db)
    user = await repo.get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    repo = UsuarioRepository(db)
    user = await repo.get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return await repo.update(user, data.model_dump(exclude_unset=True))


@router.put("/{usuario_id}/reset-password", status_code=200)
async def resetear_password(
    usuario_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    nueva_password = payload.get("nueva_password", "")
    if len(nueva_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    repo = UsuarioRepository(db)
    user = await repo.get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await repo.update(user, {"hashed_password": hash_password(nueva_password)})
    return {"detail": "Contraseña actualizada exitosamente"}


@router.delete("/{usuario_id}", status_code=204)
async def desactivar_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    if usuario_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propio usuario")
    repo = UsuarioRepository(db)
    user = await repo.get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await repo.update(user, {"activo": False})
