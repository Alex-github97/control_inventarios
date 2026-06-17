from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_password
from app.core.dependencies import get_current_user
from app.infrastructure.repositories.usuario_repository import UsuarioRepository
from app.infrastructure.models.usuario import Usuario, RolUsuario
from app.application.schemas.usuario import (
    LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse, ChangePasswordRequest
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    repo = UsuarioRepository(db)
    user = await repo.get_by_username(data.username)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    if user.bloqueado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario bloqueado")

    user.ultimo_login = datetime.now(timezone.utc)
    user.intentos_fallidos = 0
    await db.flush()

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UsuarioResponse.model_validate(user),
    )


@router.get("/me", response_model=UsuarioResponse)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    return UsuarioResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    current_user.hashed_password = hash_password(data.password_nuevo)
    await db.flush()
    return {"message": "Contraseña actualizada exitosamente"}
