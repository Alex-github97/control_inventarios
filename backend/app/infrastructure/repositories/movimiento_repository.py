from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.infrastructure.repositories.base_repository import BaseRepository
from app.infrastructure.models.movimiento import Movimiento, TipoMovimiento


class MovimientoRepository(BaseRepository[Movimiento]):
    def __init__(self, db: AsyncSession):
        super().__init__(Movimiento, db)

    async def get_by_estiba(self, estiba_id: int, limit: int = 100) -> List[Movimiento]:
        result = await self.db.execute(
            select(Movimiento)
            .where(Movimiento.estiba_id == estiba_id)
            .options(
                selectinload(Movimiento.ubicacion_origen),
                selectinload(Movimiento.ubicacion_destino),
                selectinload(Movimiento.vehiculo),
                selectinload(Movimiento.manifiesto),
                selectinload(Movimiento.usuario),
            )
            .order_by(Movimiento.fecha_movimiento.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_manifiesto(self, manifiesto_id: int) -> List[Movimiento]:
        result = await self.db.execute(
            select(Movimiento)
            .where(Movimiento.manifiesto_id == manifiesto_id)
            .options(selectinload(Movimiento.estiba))
            .order_by(Movimiento.fecha_movimiento)
        )
        return list(result.scalars().all())

    async def count_by_tipo(self, tipo: TipoMovimiento) -> int:
        result = await self.db.execute(
            select(func.count(Movimiento.id)).where(Movimiento.tipo == tipo)
        )
        return result.scalar_one()

    async def get_recientes(self, limit: int = 20) -> List[Movimiento]:
        result = await self.db.execute(
            select(Movimiento)
            .options(
                selectinload(Movimiento.estiba),
                selectinload(Movimiento.usuario),
                selectinload(Movimiento.ubicacion_destino),
            )
            .order_by(Movimiento.fecha_movimiento.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
