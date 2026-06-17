from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, usuarios, estibas, ubicaciones, proveedores,
    vehiculos, manifiestos, movimientos, dashboard, alertas, danos
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(estibas.router)
api_router.include_router(ubicaciones.router)
api_router.include_router(proveedores.router)
api_router.include_router(vehiculos.router)
api_router.include_router(manifiestos.router)
api_router.include_router(movimientos.router)
api_router.include_router(dashboard.router)
api_router.include_router(alertas.router)
api_router.include_router(danos.router)
