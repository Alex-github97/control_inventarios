"""
Flota simulada con parámetros Weibull conocidos, para validar la analítica de
EAM (`endpoints/eam_analitica.py`) y su prueba `frontend/tools/probar_eam_analitica.cjs`.

36 camiones con dos años de tanqueos, preventivos cada ~45 días y tres modos de
falla simulados en km: alternador (β=3, η=70.000), pastillas de freno (β=2,2,
η=40.000) y falla electrónica (β=0,9, η=250.000). El ajuste tiene que devolver
algo cercano a eso; si no, el error es del código.

Escribe directo en la base y SOLO para desarrollo local: todo lleva el prefijo
SIM-. Nunca correrlo contra una empresa real.

    docker cp backend/tools/simular_flota_eam.py ci_backend:/tmp/
    docker exec -w /app -e PYTHONPATH=/app ci_backend python /tmp/simular_flota_eam.py
    docker exec -w /app -e PYTHONPATH=/app ci_backend python /tmp/simular_flota_eam.py --limpiar
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy import text

import app.main  # noqa: F401 — carga todos los modelos
from app.core.database import AsyncSessionLocal
from app.infrastructure.models.eam import (
    EAMActivo, EAMOrdenTrabajo, EAMFallaCatalogo, EAMRegistroCombustible,
)

rng = np.random.default_rng(42)
random.seed(42)
MODOS = [("SIM-ALT", "SIM Alternador", 3.0, 70_000, 2_500_000),
         ("SIM-FRN", "SIM Pastillas de freno", 2.2, 40_000, 1_200_000),
         ("SIM-ELE", "SIM Falla electrónica", 0.9, 250_000, 800_000)]
AHORA = datetime.now()
INICIO = AHORA - timedelta(days=730)

LIMPIAR = [
    "DELETE FROM eam_registro_combustible WHERE activo_id IN (SELECT id FROM eam_activo WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM eam_orden_trabajo WHERE numero LIKE 'SIM-%' OR activo_id IN (SELECT id FROM eam_activo WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM eam_activo WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM eam_falla_catalogo WHERE codigo LIKE 'SIM-%'",
]


async def limpiar():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        for sql in LIMPIAR:
            await db.execute(text(sql))
        await db.commit()
        print("flota simulada borrada")


async def simular():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        modos = []
        for cod, desc, b, e, c in MODOS:
            m = EAMFallaCatalogo(codigo=cod, descripcion=desc, tipo_activo="VEHICULO", activo=True)
            db.add(m); await db.flush(); modos.append((m.id, b, e, c, desc))
        n_ot = 0
        for i in range(36):
            ritmo = float(rng.uniform(120, 500))           # km por día
            km0 = float(rng.uniform(50_000, 300_000))
            km_hoy = km0 + ritmo * 730
            a = EAMActivo(codigo=f"SIM-{i:03d}", nombre=f"SIM Camión {i:03d}", tipo_activo="VEHICULO",
                          marca=random.choice(["SIMKW", "SIMVOLVO", "SIMINTL"]), linea="L1",
                          anio=int(rng.integers(2012, 2023)), criticidad=random.choice(["MEDIA", "ALTA", "CRITICA"]),
                          odometro_actual=round(km_hoy), activo=True, estado="OPERATIVO")
            db.add(a); await db.flush()
            fecha_de = lambda km: INICIO + timedelta(days=(km - km0) / ritmo)
            # Tanqueos cada ~5 días, con algunos rendimientos anómalos
            base = float(rng.uniform(6.5, 9.0))
            f, km_prev = INICIO, km0
            while f < AHORA:
                f += timedelta(days=float(rng.uniform(3, 7)))
                km = km0 + ritmo * (f - INICIO).days
                rend = base * float(rng.normal(1, 0.04))
                if rng.random() < 0.01:
                    rend = base * 0.45
                gal = max((km - km_prev) / rend, 1)
                db.add(EAMRegistroCombustible(activo_id=a.id, fecha=f, cantidad=round(gal, 1), unidad="GALON",
                                              tanque_lleno=True, odometro=round(km), km_recorridos=round(km - km_prev),
                                              rendimiento=round(rend, 2), costo_total=round(gal * 15000)))
                km_prev = km
            # Preventivos cada ~45 días
            f = INICIO + timedelta(days=float(rng.uniform(0, 45)))
            while f < AHORA:
                n_ot += 1
                db.add(EAMOrdenTrabajo(numero=f"SIM-OT-{n_ot}", activo_id=a.id, tipo_ot="PREVENTIVO", estado="CERRADA",
                                       descripcion="SIM preventivo", fecha_inicio=f, fecha_fin=f + timedelta(hours=3),
                                       odometro=round(km0 + ritmo * (f - INICIO).days), es_falla=False,
                                       costo_total=round(float(rng.normal(600_000, 80_000))), afecta_disponibilidad=True))
                f += timedelta(days=float(rng.uniform(38, 52)))
            # Fallas: proceso de renovación en km por modo. La pieza ya tenía
            # una edad al empezar el registro.
            for mid, b, e, costo, desc in modos:
                edad = float(rng.uniform(0, e))
                s0 = np.exp(-(edad / e) ** b)
                resto = e * (-np.log(rng.uniform(0, 1) * s0)) ** (1 / b) - edad   # vida residual
                km = km0 + resto
                while km < km_hoy:
                    fecha = fecha_de(km)
                    n_ot += 1
                    c = costo * float(rng.normal(1, 0.15))
                    if rng.random() < 0.03:
                        c *= 6
                    dur = float(rng.lognormal(np.log(8), 0.4))
                    db.add(EAMOrdenTrabajo(numero=f"SIM-OT-{n_ot}", activo_id=a.id, tipo_ot="CORRECTIVO", estado="CERRADA",
                                           descripcion=desc, fecha_inicio=fecha, fecha_fin=fecha + timedelta(hours=dur),
                                           odometro=round(km), es_falla=True, falla_id=mid, costo_total=round(c),
                                           afecta_disponibilidad=True))
                    km += e * float(rng.weibull(b))
        await db.commit()
        print("ordenes", n_ot)

asyncio.run(limpiar() if "--limpiar" in sys.argv else simular())
