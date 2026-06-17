from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.infrastructure.repositories.base_repository import BaseRepository
from app.infrastructure.models.usuario import Usuario


class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self, db: AsyncSession):
        super().__init__(Usuario, db)

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        result = await self.db.execute(
            select(Usuario).where(Usuario.email == email, Usuario.activo == True)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[Usuario]:
        result = await self.db.execute(
            select(Usuario).where(Usuario.username == username, Usuario.activo == True)
        )
        return result.scalar_one_or_none()

    async def get_activos(self) -> List[Usuario]:
        result = await self.db.execute(
            select(Usuario).where(Usuario.activo == True).order_by(Usuario.nombre)
        )
        return list(result.scalars().all())
