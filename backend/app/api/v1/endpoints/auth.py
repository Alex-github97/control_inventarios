from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db, get_db_plataforma
from app.core.tenant import codigo_valido
from app.infrastructure.models.plataforma import PlataformaCliente
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_password
from app.core.dependencies import get_current_user
from app.infrastructure.repositories.usuario_repository import UsuarioRepository
from app.infrastructure.models.usuario import Usuario, RolUsuario
from app.application.schemas.usuario import (
    LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse, ChangePasswordRequest
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class ClientePublico(BaseModel):
    """Lo que se puede saber de un cliente antes de autenticarse.

    Solo lo necesario para pintar su portal. Nada que sirva para deducir qué
    otros clientes existen.
    """
    model_config = ConfigDict(from_attributes=True)
    codigo: str
    nombre: str
    logo_url: Optional[str] = None
    color: Optional[str] = None


@router.get("/clientes/{codigo}", response_model=ClientePublico)
async def resolver_cliente(codigo: str, db: AsyncSession = Depends(get_db_plataforma)):
    """Paso previo al login: valida el cliente y devuelve su identidad visual.

    No hay endpoint que liste los clientes: quien entra debe saber su código,
    de modo que desde fuera no se pueda averiguar quién más usa la plataforma.
    """
    codigo = (codigo or "").strip().lower()
    if not codigo_valido(codigo):
        raise HTTPException(404, "No existe un cliente con ese código")
    r = await db.execute(
        select(PlataformaCliente).where(PlataformaCliente.codigo == codigo)
    )
    cliente = r.scalar_one_or_none()
    if not cliente:
        raise HTTPException(404, "No existe un cliente con ese código")
    if not cliente.activo:
        raise HTTPException(403, f"El acceso de {cliente.nombre} está suspendido.")
    return ClientePublico.model_validate(cliente)


async def _cliente_de_la_peticion(
    x_cliente: Optional[str], db: AsyncSession,
) -> PlataformaCliente:
    codigo = (x_cliente or "").strip().lower()
    if not codigo:
        raise HTTPException(400, "Indique el cliente antes de iniciar sesión")
    if not codigo_valido(codigo):
        raise HTTPException(404, "No existe un cliente con ese código")
    r = await db.execute(
        select(PlataformaCliente).where(PlataformaCliente.codigo == codigo)
    )
    cliente = r.scalar_one_or_none()
    if not cliente:
        raise HTTPException(404, "No existe un cliente con ese código")
    if not cliente.activo:
        raise HTTPException(403, f"El acceso de {cliente.nombre} está suspendido.")
    return cliente


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    x_cliente: Optional[str] = Header(None, alias="X-Cliente"),
    db: AsyncSession = Depends(get_db),
    db_plataforma: AsyncSession = Depends(get_db_plataforma),
):
    # El usuario se busca dentro del esquema del cliente: dos empresas pueden
    # tener un "admin" cada una y son personas distintas.
    cliente = await _cliente_de_la_peticion(x_cliente, db_plataforma)

    # El esquema se toma del registro, que es la única fuente válida: deducirlo
    # del código mandaría al cliente que ya existía —y vive en "public"— a un
    # esquema que no es el suyo.
    await db.execute(text(f'SET search_path TO "{cliente.esquema}"'))

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
        access_token=create_access_token(
            user.id, cliente=cliente.codigo, esquema=cliente.esquema),
        refresh_token=create_refresh_token(
            user.id, cliente=cliente.codigo, esquema=cliente.esquema),
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
