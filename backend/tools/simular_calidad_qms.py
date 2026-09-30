"""
Sistema de calidad simulado con efectos conocidos, para validar la analítica
de QMS (`endpoints/qms_analitica.py`) y `frontend/tools/probar_qms_analitica.cjs`.

Dos años de no conformidades en cinco procesos. Lo sembrado:
  - Las NC de «SIM Despacho» suben con el tiempo; las de los demás, estables.
  - Cinco problemas que se repiten con redacciones distintas. Dos tienen CAPA
    cerrada hace un año: la de estibas NO funcionó (el problema siguió) y la
    de facturación SÍ (no volvió a aparecer).
  - El proveedor «SIM Empaques Norte» cae 1,2 puntos por mes; «SIM Transportes
    Sur» varía mucho pero sin tendencia. Los demás, estables y buenos.

Escribe directo en la base, SOLO para desarrollo local: todo lleva SIM-.

    docker cp backend/tools/simular_calidad_qms.py ci_backend:/tmp/
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_calidad_qms.py"
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_calidad_qms.py --limpiar"
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import text

import app.main  # noqa: F401 — carga todos los modelos
from app.core.database import AsyncSessionLocal
from app.infrastructure.models.qms import (
    QMSCAPA, QMSEvaluacionProveedor, QMSNoConformidad, QMSProceso, QMSQueja,
    ClasificacionNCQMSEnum, EstadoCAPAQMSEnum, EstadoNCQMSEnum, OrigenNCQMSEnum,
    TipoCAPAQMSEnum, TipoProcesoQMSEnum,
)

rng = np.random.default_rng(21)
random.seed(21)
AHORA = datetime.now(timezone.utc)
MESES = 24
INICIO = AHORA - timedelta(days=30 * MESES)

TEMAS = {
    "estiba": ["Mercancía averiada por estiba mal armada", "Daño de producto por estibas inestables en el cargue",
               "Estiba colapsada durante el transporte con daño de mercancía", "Averías por estiba mal armada en bodega"],
    "firma": ["Remisión entregada sin firma del cliente", "Falta firma del cliente en la remisión",
              "Remisiones sin firma de recibido del cliente", "Cumplido de remisión sin firma del cliente"],
    "frio": ["Temperatura fuera de rango en furgón refrigerado", "Furgón refrigerado con temperatura fuera de rango",
             "Registro de temperatura del furgón fuera de rango"],
    "factura": ["Error de valor en la factura electrónica del cliente", "Factura electrónica con valor errado",
                "Cliente reporta factura electrónica con error de valor"],
    "sello": ["Contenedor entregado con sello de seguridad roto", "Sello de seguridad roto al llegar el contenedor",
              "Precinto de seguridad del contenedor roto en destino"],
}
SUELTAS = ["Capacitación vencida de un operario de montacargas", "Extintor sin recarga en el área de despacho",
           "Indicador de rotación sin medir en el trimestre", "Llamada de servicio sin registro en el CRM",
           "Manual de procedimiento desactualizado", "Uniforme incompleto en inspección de seguridad"]

LIMPIAR = [
    "DELETE FROM qms_capa WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM qms_queja WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM qms_no_conformidad WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM qms_evaluacion_proveedor WHERE proveedor_nombre LIKE 'SIM %'",
    "DELETE FROM qms_proceso WHERE codigo LIKE 'SIM-%'",
]


async def limpiar():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        for sql in LIMPIAR:
            await db.execute(text(sql))
        await db.commit()
        print("calidad simulada borrada")


async def simular():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        procesos = {}
        for i, nombre in enumerate(["SIM Despacho", "SIM Bodega", "SIM Transporte", "SIM Facturación", "SIM Talento humano"]):
            p = QMSProceso(codigo=f"SIM-PR{i}", nombre=nombre, tipo=TipoProcesoQMSEnum.MISIONAL)
            db.add(p); await db.flush(); procesos[nombre] = p
        proceso_tema = {"estiba": "SIM Bodega", "firma": "SIM Despacho", "frio": "SIM Transporte",
                        "factura": "SIM Facturación", "sello": "SIM Transporte"}
        n = 0
        ncs_tema = {t: [] for t in TEMAS}
        mitad = INICIO + timedelta(days=30 * 12)
        for mes in range(MESES):
            ini = INICIO + timedelta(days=30 * mes)
            # Despacho sube de 1 a 5 al mes; los demás, estables.
            for nombre, p in procesos.items():
                lam = 1 + 4 * mes / (MESES - 1) if nombre == "SIM Despacho" else 1.5
                for _ in range(int(rng.poisson(lam))):
                    n += 1
                    f = ini + timedelta(days=float(rng.uniform(0, 30)))
                    temas = [t for t, pr in proceso_tema.items() if pr == nombre]
                    tema = random.choice(temas) if temas and rng.random() < 0.7 else None
                    if tema == "factura" and f > mitad:
                        tema = None                   # la CAPA de facturación funcionó
                    titulo = random.choice(TEMAS[tema]) if tema else random.choice(SUELTAS)
                    cerrada = f < AHORA - timedelta(days=45)
                    nc = QMSNoConformidad(codigo=f"SIM-NC-{n}", titulo=titulo, descripcion=titulo + ".",
                                          clasificacion=random.choice(list(ClasificacionNCQMSEnum)[:3]),
                                          estado=EstadoNCQMSEnum.CERRADA if cerrada else EstadoNCQMSEnum.ABIERTA,
                                          origen=random.choice([OrigenNCQMSEnum.OPERACION, OrigenNCQMSEnum.CLIENTE, OrigenNCQMSEnum.AUDITORIA]),
                                          proceso_id=p.id, fecha_deteccion=f,
                                          fecha_cierre=f + timedelta(days=float(rng.uniform(5, 40))) if cerrada else None)
                    db.add(nc); await db.flush()
                    if tema:
                        ncs_tema[tema].append(nc)
            for _ in range(int(rng.poisson(3))):
                n += 1
                db.add(QMSQueja(codigo=f"SIM-Q-{n}", tipo="queja", descripcion="SIM queja de cliente",
                                created_at=ini + timedelta(days=float(rng.uniform(0, 30)))))
        # CAPA de estibas (ineficaz) y de facturación (eficaz), cerradas a mitad del periodo
        for tema, codigo in (("estiba", "SIM-CAPA-EST"), ("factura", "SIM-CAPA-FAC")):
            antes = [x for x in ncs_tema[tema] if x.fecha_deteccion < mitad]
            if antes:
                db.add(QMSCAPA(codigo=codigo, tipo=TipoCAPAQMSEnum.CORRECTIVA, estado=EstadoCAPAQMSEnum.CERRADA,
                               titulo=f"SIM Corregir {tema}", descripcion=f"SIM acción correctiva de {tema}",
                               nc_id=antes[-1].id, fecha_cierre=mitad))
        # Proveedores: 18 meses de evaluación
        for nombre, base, pendiente, ruido in (("SIM Empaques Norte", 88, -1.2, 1.5), ("SIM Transportes Sur", 78, 0, 6),
                                               ("SIM Repuestos Andinos", 90, 0, 1.5), ("SIM Combustibles del Valle", 84, 0, 2)):
            for k in range(18):
                f = AHORA - timedelta(days=30 * (18 - k))
                v = float(np.clip(base + pendiente * k + rng.normal(0, ruido), 0, 100))
                db.add(QMSEvaluacionProveedor(proveedor_nombre=nombre, periodo=f"{f.year}-{f.month:02d}",
                                              puntaje_total=round(v, 2)))
        await db.commit()
        print("nc", n, {t: len(v) for t, v in ncs_tema.items()})

asyncio.run(limpiar() if "--limpiar" in sys.argv else simular())
