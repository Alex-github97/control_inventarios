"""
Riesgos e incidentes simulados con discrepancias conocidas, para validar la
analítica de GRC (`endpoints/grc_analitica.py`) y `frontend/tools/probar_grc_analitica.cjs`.

Lo sembrado:
  - «SIM Almacenamiento»: la matriz dice riesgo moderado (6) pero hay robos
    graves → SUBESTIMADO. Su control «SIM Control de acceso a bodega» está
    marcado EFECTIVO → en duda.
  - «SIM Transporte»: riesgo crítico (20) y muchos incidentes, que además
    suben con el tiempo → coherente, tendencia al alza.
  - «SIM Tecnología»: riesgo crítico (16) sin ningún incidente → sin evidencia.
  - «SIM Compras»: incidentes sin ningún riesgo registrado → sin riesgos.
  - Los críticos se cierran en ~10 días, los bajos en ~40; algunos siguen abiertos.

Escribe directo en la base, SOLO para desarrollo local: todo lleva SIM-.

    docker cp backend/tools/simular_riesgo_grc.py ci_backend:/tmp/
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_riesgo_grc.py"
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_riesgo_grc.py --limpiar"
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import text

import app.main  # noqa: F401 — carga todos los modelos
from app.core.database import AsyncSessionLocal
from app.infrastructure.models.grc import (
    GRCControl, GRCIncidente, GRCRiesgo, GRCRiesgoControl,
    EfectividadControlGRCEnum, SeveridadGRCEnum, TipoControlGRCEnum,
)

rng = np.random.default_rng(31)
random.seed(31)
# Las fechas de grc_incidente no guardan zona: UTC sin zona.
AHORA = datetime.now(timezone.utc).replace(tzinfo=None)
MESES = 24
INICIO = AHORA - timedelta(days=30 * MESES)
DIAS_CIERRE = {"CRITICA": 10, "ALTA": 18, "MEDIA": 28, "BAJA": 40}

LIMPIAR = [
    "DELETE FROM grc_riesgo_control WHERE riesgo_id IN (SELECT id FROM grc_riesgo WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM grc_riesgo WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM grc_control WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM grc_incidente WHERE codigo LIKE 'SIM-%'",
]


async def limpiar():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        for sql in LIMPIAR:
            await db.execute(text(sql))
        await db.commit()
        print("riesgo simulado borrado")


async def simular():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        riesgos = {}
        for k, (proceso, nombre, p, i) in enumerate([
                ("SIM Almacenamiento", "SIM Pérdida de mercancía en bodega", 2, 3),
                ("SIM Transporte", "SIM Accidente de vehículo en ruta", 4, 5),
                ("SIM Tecnología", "SIM Caída del sistema de facturación", 4, 4),
                ("SIM Finanzas", "SIM Error en conciliación bancaria", 2, 4)]):
            r = GRCRiesgo(codigo=f"SIM-R{k}", nombre=nombre, tipo="Operativo", proceso=proceso,
                          probabilidad_inherente=p, impacto_inherente=i, nivel_inherente=p * i,
                          probabilidad_residual=p, impacto_residual=i, nivel_residual=p * i)
            db.add(r); await db.flush(); riesgos[proceso] = r
        c = GRCControl(codigo="SIM-C1", nombre="SIM Control de acceso a bodega", tipo=TipoControlGRCEnum.PREVENTIVO,
                       proceso="SIM Almacenamiento", efectividad=EfectividadControlGRCEnum.EFECTIVO)
        db.add(c); await db.flush()
        db.add(GRCRiesgoControl(riesgo_id=riesgos["SIM Almacenamiento"].id, control_id=c.id, efectividad_sobre_riesgo=80))

        temas = {
            "SIM Almacenamiento": (["Robo de mercancía en bodega principal", "Faltante de mercancía por robo en bodega",
                                    "Hurto de cajas en la bodega principal"], ["ALTA", "CRITICA"], lambda m: 0.5),
            "SIM Transporte": (["Accidente de tránsito del vehículo en ruta", "Choque del vehículo de reparto en ruta",
                                "Vehículo accidentado en la ruta nacional"], ["MEDIA", "ALTA", "BAJA"], lambda m: 0.5 + 2.5 * m / MESES),
            "SIM Compras": (["Proveedor entrega pedido con precio distinto al pactado",
                             "Pedido del proveedor con precio diferente al pactado"], ["BAJA", "MEDIA"], lambda m: 0.4),
            "SIM Finanzas": (["Diferencia menor en conciliación bancaria"], ["BAJA"], lambda m: 0.15),
        }
        n = 0
        for mes in range(MESES):
            ini = INICIO + timedelta(days=30 * mes)
            for proceso, (titulos, severidades, lam) in temas.items():
                for _ in range(int(rng.poisson(lam(mes)))):
                    n += 1
                    f = ini + timedelta(days=float(rng.uniform(0, 30)))
                    sev = random.choice(severidades)
                    dura = float(rng.exponential(DIAS_CIERRE[sev]))
                    cierre = f + timedelta(days=dura)
                    cerrado = cierre < AHORA and rng.random() > 0.05
                    db.add(GRCIncidente(codigo=f"SIM-INC-{n}", titulo=random.choice(titulos), descripcion="SIM",
                                        tipo="seguridad" if proceso == "SIM Almacenamiento" else "operativo",
                                        severidad=SeveridadGRCEnum[sev], proceso=proceso, fecha_ocurrencia=f,
                                        estado="cerrado" if cerrado else "abierto",
                                        fecha_cierre=cierre if cerrado else None))
        await db.commit()
        print("incidentes", n)

asyncio.run(limpiar() if "--limpiar" in sys.argv else simular())
