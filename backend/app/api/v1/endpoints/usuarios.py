from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.security import hash_password
from app.infrastructure.repositories.usuario_repository import UsuarioRepository
from app.infrastructure.models.usuario import Usuario
from app.application.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


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
    existing = await repo.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=409, detail="El email ya está registrado")
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
    usuario_id: int, data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    repo = UsuarioRepository(db)
    user = await repo.get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return await repo.update(user, data.model_dump(exclude_unset=True))
