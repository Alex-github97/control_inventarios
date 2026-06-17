from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_operador
from app.infrastructure.models.usuario import Usuario
from app.application.services.movimiento_service import MovimientoService
from app.application.schemas.movimiento import (
    MovimientoCreate, RegistrarCargaRequest, RegistrarDescargaRequest, MovimientoResponse,
    MovimientoBulkCreate, MovimientoBulkResponse,
)

router = APIRouter(prefix="/movimientos", tags=["Movimientos"])


@router.post("/", response_model=MovimientoResponse, status_code=201)
async def registrar_movimiento(
    data: MovimientoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    service = MovimientoService(db)
    return await service.registrar_movimiento(data, current_user)


@router.post("/carga-masiva")
async def registrar_carga_masiva(
    data: RegistrarCargaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    service = MovimientoService(db)
    movimientos = await service.registrar_carga_masiva(data, current_user)
    return {"message": f"{len(movimientos)} estibas cargadas exitosamente", "count": len(movimientos)}


@router.post("/descarga-masiva")
async def registrar_descarga_masiva(
    data: RegistrarDescargaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    service = MovimientoService(db)
    movimientos = await service.registrar_descarga_masiva(data, current_user)
    return {"message": f"{len(movimientos)} estibas descargadas exitosamente", "count": len(movimientos)}


@router.post("/bulk", response_model=MovimientoBulkResponse)
async def registrar_movimientos_masivo(
    data: MovimientoBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    service = MovimientoService(db)
    exitosos = 0
    errores = []

    for i, item in enumerate(data.items):
        try:
            async with db.begin_nested():
                await service.registrar_movimiento(item, current_user)
            exitosos += 1
        except HTTPException as e:
            errores.append({"fila": i + 2, "estiba_id": item.estiba_id, "mensaje": e.detail})
        except Exception as e:
            errores.append({"fila": i + 2, "estiba_id": item.estiba_id, "mensaje": str(e)})

    return {"exitosos": exitosos, "errores": errores, "total": len(data.items)}


@router.get("/recientes")
async def movimientos_recientes(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from app.infrastructure.repositories.movimiento_repository import MovimientoRepository
    repo = MovimientoRepository(db)
    movimientos = await repo.get_recientes(limit=limit)
    return [
        {
            "id": m.id, "tipo": m.tipo.value, "estiba_id": m.estiba_id,
            "fecha": m.fecha_movimiento.isoformat(),
            "usuario": m.usuario.nombre_completo if m.usuario else "Sistema",
            "ubicacion_destino": m.ubicacion_destino.nombre if m.ubicacion_destino else None,
        }
        for m in movimientos
    ]
