from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_operador, require_supervisor
from app.infrastructure.models.usuario import Usuario
from app.application.services.estiba_service import EstibaService
from app.application.schemas.estiba import (
    EstibaCreate, EstibaUpdate, EstibaResponse, EstibaListResponse, EstibaKPIs
)

router = APIRouter(prefix="/estibas", tags=["Estibas"])


@router.get("/kpis", response_model=EstibaKPIs)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    service = EstibaService(db)
    kpis = await service.get_kpis()
    return EstibaKPIs(**kpis)


@router.get("/", response_model=EstibaListResponse)
async def listar_estibas(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    estado: Optional[str] = Query(None),
    tipo_propietario: Optional[str] = Query(None),
    ubicacion_id: Optional[int] = Query(None),
    proveedor_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    service = EstibaService(db)
    return await service.listar_estibas(
        page=page, page_size=page_size, estado=estado,
        tipo_propietario=tipo_propietario, ubicacion_id=ubicacion_id,
        proveedor_id=proveedor_id, search=search,
    )


@router.post("/", response_model=EstibaResponse, status_code=201)
async def crear_estiba(
    data: EstibaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    service = EstibaService(db)
    return await service.crear_estiba(data, current_user)


@router.get("/buscar/{codigo}", response_model=EstibaResponse)
async def buscar_por_codigo(
    codigo: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    service = EstibaService(db)
    return await service.buscar_por_codigo(codigo)


@router.get("/{estiba_id}", response_model=EstibaResponse)
async def obtener_estiba(
    estiba_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    service = EstibaService(db)
    return await service.obtener_estiba(estiba_id)


@router.put("/{estiba_id}", response_model=EstibaResponse)
async def actualizar_estiba(
    estiba_id: int, data: EstibaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    service = EstibaService(db)
    return await service.actualizar_estiba(estiba_id, data)


@router.post("/{estiba_id}/dar-baja")
async def dar_baja(
    estiba_id: int,
    motivo: str = Query(..., min_length=10),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_supervisor),
):
    service = EstibaService(db)
    estiba = await service.dar_de_baja(estiba_id, motivo, current_user)
    return {"message": "Estiba dada de baja exitosamente", "id": estiba.id}


@router.get("/{estiba_id}/trazabilidad")
async def trazabilidad_estiba(
    estiba_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from app.application.services.movimiento_service import MovimientoService
    service = MovimientoService(db)
    return await service.obtener_trazabilidad(estiba_id)
