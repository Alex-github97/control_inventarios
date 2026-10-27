"""Prueba de humo del WMS y del TMS, contra la app entera y por HTTP interno.

Sirve de red para el porte de Daily Logistics: se corre antes de aplicar cada
grupo de parches y otra vez después. Solo consulta; no escribe nada, así que se
puede correr contra cualquier esquema sin ensuciarlo.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_wms.py
    docker exec -w /app -e PYTHONPATH=/app -e ESQUEMA=cli_acme ci_backend python tests/humo_wms.py
"""
import asyncio
import os
import sys

os.environ.setdefault("SQLALCHEMY_ECHO", "0")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import text

import app.main as m
from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.security import create_access_token

ESQUEMA = os.environ.get("ESQUEMA", "public")


class UsuarioFalso:
    id = 1
    username = "prueba"
    nombre = "Prueba de humo"
    rol_id = 1
    rol = "ADMINISTRADOR"
    email = "prueba@local"
    activo = True


async def _db():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as s:
        await s.execute(text('SET search_path TO "%s"' % ESQUEMA))
        yield s


TOKEN = create_access_token(subject=1, esquema=ESQUEMA, usuario="prueba")

m.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso()
m.app.dependency_overrides[require_admin] = lambda: UsuarioFalso()
m.app.dependency_overrides[get_db] = _db

API = "/api/v1"

# Las consultas que usan las pantallas principales del WMS y del TMS.
RUTAS = [
    "/wms/almacenes/", "/wms/zonas/", "/wms/ubicaciones/", "/wms/productos/",
    "/wms/lotes/", "/wms/proveedores/", "/wms/clientes/", "/wms/transportadoras/",
    "/wms/ordenes-compra/", "/wms/recepciones/", "/wms/inventario/",
    "/wms/inventario/movimientos/", "/wms/conteos/", "/wms/ordenes-salida/",
    "/wms/picking-tareas/", "/wms/despachos/", "/wms/devoluciones/",
    "/wms/inventario/vencimientos", "/wms/dashboard/kpis", "/wms/dashboard/alertas",
    "/tms/dashboard/kpis", "/tms/alertas", "/tms/config/zonas", "/tms/config/parametros",
    "/tms/config/tipos-servicio", "/tms/vehiculos", "/tms/viajes", "/tms/rutas",
    "/tms/liquidaciones", "/tms/liquidaciones/resumen", "/tms/otif", "/tms/otif/resumen",
    "/tms/costos", "/tms/planeacion", "/tms/documentos/pendientes", "/tms/pod",
]


async def principal():
    fallos = []
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=m.app), base_url="http://local",
        headers={"Authorization": "Bearer " + TOKEN},
    ) as c:
        for ruta in RUTAS:
            r = await c.get(API + ruta)
            ok = r.status_code == 200
            print(("  ok  " if ok else "FALLA ") + ruta + "  ->  " + str(r.status_code))
            if not ok:
                fallos.append(ruta)
                print("        " + r.text[:300])
    print()
    print("Esquema %s: %d de %d rutas responden." % (ESQUEMA, len(RUTAS) - len(fallos), len(RUTAS)))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
