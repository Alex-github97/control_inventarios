"""Escenarios de la spec wms/tareas-picking sobre el motor real, sin dejar
rastro: todo corre en UNA transacción que se deshace al final.

Arma un almacén con una ubicación de reserva y un frente de picking, recorre
el reabastecimiento con aprobación y la tarea dirigida de punta a punta.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_tareas.py
"""
import asyncio
import os
import sys
import time

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from sqlalchemy import func, select, text

import app.main  # noqa: F401 — registra todos los modelos, como la aplicación
from app.core import personal as per
from app.core import wms_inventario as inv
from app.core import wms_reabastecimiento as reab
from app.core import wms_tareas_dirigidas as wtd
from app.core.database import AsyncSessionLocal
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import (
    WMSAlmacen, WMSFrentePicking, WMSInventarioUbicacion, WMSMovimientoInventario, WMSProducto, WMSTarea,
    WMSUbicacion, WMSZona,
)

ESQUEMA = os.environ.get("ESQUEMA", "cli_acme")
X = "HT%d" % (int(time.time()) % 100000)
fallos = []


def ok(cond, nombre, extra=""):
    print(("  ok  " if cond else "FALLA ") + nombre + (("  ->  " + str(extra)) if extra != "" else ""))
    if not cond:
        fallos.append(nombre)


async def stock(db, prod, ubic):
    return float((await db.execute(select(func.coalesce(func.sum(WMSInventarioUbicacion.cantidad_disponible), 0)).where(
        WMSInventarioUbicacion.producto_id == prod, WMSInventarioUbicacion.ubicacion_id == ubic))).scalar())


async def principal():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
        await db.execute(text('SET search_path TO "%s"' % ESQUEMA))
        try:
            alm = WMSAlmacen(codigo=X, nombre="Almacén " + X, activo=True)
            db.add(alm); await db.flush()
            z = WMSZona(almacen_id=alm.id, codigo=X + "-A", nombre="Almacenamiento", tipo="ALMACENAMIENTO", activo=True)
            db.add(z); await db.flush()
            reserva = WMSUbicacion(zona_id=z.id, codigo=X + "-R1", activo=True)
            frente_u = WMSUbicacion(zona_id=z.id, codigo=X + "-F1", activo=True)
            db.add_all([reserva, frente_u]); await db.flush()
            p = WMSProducto(sku=X + "-P", nombre="Producto " + X, activo=True)
            db.add(p); await db.flush()
            await inv.mover(db, tipo="ENTRADA", producto_id=p.id, cantidad=100, destino=reserva.id)
            await inv.mover(db, tipo="ENTRADA", producto_id=p.id, cantidad=2, destino=frente_u.id)
            f = WMSFrentePicking(almacen_id=alm.id, producto_id=p.id, ubicacion_id=frente_u.id, minimo=10, maximo=30)
            db.add(f); await db.flush()
            c = await reab.config(db, alm.id, crear=True)
            c.requiere_aprobacion = True
            await db.flush()

            print("── Frente bajo el mínimo")
            est = (await reab.estado_frentes(db, [f]))[f.id]
            ok(est["actual"] < est["minimo_u"], "El frente se ve bajo el mínimo", est)
            movs_antes = (await db.execute(select(func.count()).select_from(WMSMovimientoInventario).where(
                WMSMovimientoInventario.producto_id == p.id))).scalar()
            await reab.evaluar(db, alm.id)
            tareas = (await db.execute(select(WMSTarea).where(WMSTarea.producto_id == p.id))).scalars().all()
            ok(len(tareas) == 1 and tareas[0].tipo == "REABASTECIMIENTO", "Se propone un reabastecimiento",
               [(t.tipo, t.estado, t.cantidad) for t in tareas])
            t = tareas[0]
            ok(t.cantidad == 28, "Lleva el frente hasta su máximo (30 - 2)", t.cantidad)

            print("── Propuesta no aprobada")
            ok(t.estado == "POR_APROBAR", "Queda por aprobar", t.estado)
            movs = (await db.execute(select(func.count()).select_from(WMSMovimientoInventario).where(
                WMSMovimientoInventario.producto_id == p.id))).scalar()
            ok(movs == movs_antes and await stock(db, p.id, reserva.id) == 100, "No mueve inventario sin aprobar")
            admin = (await db.execute(select(Usuario).where(Usuario.rol == "ADMINISTRADOR", Usuario.activo.is_(True))
                                      .limit(1))).scalar_one()
            libre = await wtd.siguiente(db, admin.id, alm.id)
            ok(libre is None, "Nadie recibe una tarea por aprobar", getattr(libre, "id", None))
            await reab.evaluar(db, alm.id)
            n = (await db.execute(select(func.count()).select_from(WMSTarea).where(WMSTarea.producto_id == p.id))).scalar()
            ok(n == 1, "Evaluar otra vez no la duplica", n)

            print("── Tarea dirigida")
            t.estado, t.aprobada_por_id, t.aprobada_en = "PENDIENTE", admin.id, per.ahora()
            await db.flush()
            mia = await wtd.siguiente(db, admin.id, alm.id)
            ok(mia is not None and mia.id == t.id and mia.estado == "ASIGNADA", "«Tomar siguiente» se la asigna",
               getattr(mia, "estado", None))
            try:
                await wtd.confirmar_origen(db, t, frente_u.codigo)
                ok(False, "Escanear un origen equivocado se rechaza")
            except HTTPException as e:
                ok(e.status_code == 422, "Escanear un origen equivocado se rechaza", e.status_code)
            await wtd.confirmar_origen(db, t, reserva.codigo)
            ok(t.estado == "EN_CURSO" and t.origen_confirmado, "Con el origen correcto queda en curso", t.estado)
            await inv.mover(db, tipo="REABASTECIMIENTO", producto_id=p.id, cantidad=t.cantidad,
                            origen=reserva.id, destino=frente_u.id, tarea_id=t.id)
            await db.flush()   # la sesión no hace autoflush
            en_frente, en_reserva = await stock(db, p.id, frente_u.id), await stock(db, p.id, reserva.id)
            ok(en_frente == 30 and en_reserva == 72, "Al completarla el frente queda en su máximo",
               f"frente {en_frente:g}, reserva {en_reserva:g}")

            print("── Quién recibe tareas (sin WFM)")
            ok(await per.operario_disponible(db, admin.id), "Un administrador activo está disponible")
            sin_wms = (await db.execute(select(Usuario).where(Usuario.rol != "ADMINISTRADOR", Usuario.activo.is_(True))
                                        .limit(1))).scalar_one_or_none()
            if sin_wms is not None:
                print("      (usuario %s, rol %s: disponible=%s)" % (sin_wms.username, sin_wms.rol,
                                                                     await per.operario_disponible(db, sin_wms.id)))
        finally:
            await db.rollback()

    print()
    print("Tareas: %d fallos." % len(fallos))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
