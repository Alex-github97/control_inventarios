from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_operador
from app.infrastructure.models.manifiesto import Manifiesto, EstadoManifiesto
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/manifiestos", tags=["Manifiestos"])


class ManifiestoCreate(BaseModel):
    numero: str
    vehiculo_id: int
    conductor_id: Optional[int] = None
    origen_id: int
    destino_id: int
    cliente_nombre: Optional[str] = None
    cliente_nit: Optional[str] = None
    fecha_programada: date
    observaciones: Optional[str] = None


class ManifiestoResponse(BaseModel):
    id: int
    numero: str
    vehiculo_id: int
    conductor_id: Optional[int] = None
    origen_id: int
    destino_id: int
    cliente_nombre: Optional[str] = None
    cliente_nit: Optional[str] = None
    fecha_programada: date
    fecha_salida: Optional[datetime] = None
    fecha_llegada: Optional[datetime] = None
    estado: EstadoManifiesto
    total_estibas_cargadas: int
    total_estibas_descargadas: int
    observaciones: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[ManifiestoResponse])
async def listar_manifiestos(
    estado: Optional[EstadoManifiesto] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = select(Manifiesto).offset(skip).limit(limit).order_by(Manifiesto.fecha_programada.desc())
    if estado:
        query = query.where(Manifiesto.estado == estado)
    if fecha_desde:
        query = query.where(Manifiesto.fecha_programada >= fecha_desde)
    if fecha_hasta:
        query = query.where(Manifiesto.fecha_programada <= fecha_hasta)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=ManifiestoResponse, status_code=201)
async def crear_manifiesto(
    data: ManifiestoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    existing = await db.execute(select(Manifiesto).where(Manifiesto.numero == data.numero))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"El manifiesto {data.numero} ya existe")

    manifiesto = Manifiesto(**data.model_dump(), usuario_creacion_id=current_user.id)
    db.add(manifiesto)
    await db.flush()
    await db.refresh(manifiesto)
    return manifiesto


@router.get("/{manifiesto_id}", response_model=ManifiestoResponse)
async def obtener_manifiesto(
    manifiesto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Manifiesto).where(Manifiesto.id == manifiesto_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Manifiesto no encontrado")
    return m


@router.patch("/{manifiesto_id}/estado")
async def cambiar_estado_manifiesto(
    manifiesto_id: int,
    nuevo_estado: EstadoManifiesto,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    result = await db.execute(select(Manifiesto).where(Manifiesto.id == manifiesto_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Manifiesto no encontrado")
    m.estado = nuevo_estado
    await db.flush()
    return {"message": "Estado actualizado", "estado": nuevo_estado}


@router.get("/{manifiesto_id}/estibas")
async def estibas_en_manifiesto(
    manifiesto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from app.infrastructure.repositories.movimiento_repository import MovimientoRepository
    repo = MovimientoRepository(db)
    movimientos = await repo.get_by_manifiesto(manifiesto_id)
    return [
        {
            "estiba_id": m.estiba_id,
            "tipo": m.tipo.value,
            "fecha": m.fecha_movimiento.isoformat(),
        }
        for m in movimientos
    ]
