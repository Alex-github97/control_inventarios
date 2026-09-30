"""
Cadena de suministro simulada con efectos conocidos, para validar el motor de
APS (`core/aps/motor.py`) y `frontend/tools/probar_aps.cjs`.

Una planta en Bogotá que surte dos centros de distribución (Medellín y Cali),
30 meses de demanda. Lo sembrado:
  - Jugos con estacionalidad (pico en diciembre) → Holt-Winters.
  - Agua con tendencia creciente → Holt.
  - Repuesto de bomba intermitente → Croston o promedio.
  - Tapas compradas con 45 días de entrega y sin stock → orden atrasada.
  - Etiquetas con stock para años → exceso de inventario.
  - La envasadora queda justa: se sobrecarga en el pico de diciembre.
  - Un pronóstico del agua publicado hace seis meses que sobreestimó 10 %:
    la exactitud publicada tiene que dar ~90 % con sesgo +10 %.
  - Cali tiene una bodega pequeña (restricción) y la planta despacha en
    camiones de 12 t (restricción de transporte).

Escribe directo en la base, SOLO para desarrollo local: todo lleva SIM-.

    docker cp backend/tools/simular_planeacion_aps.py ci_backend:/tmp/
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_planeacion_aps.py"
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_planeacion_aps.py --limpiar"
"""
import asyncio
import math
import sys
from datetime import datetime, timezone

import numpy as np
from sqlalchemy import text

import app.main  # noqa: F401 — carga todos los modelos
from app.core.aps.motor import mes_actual, sumar_meses
from app.core.database import AsyncSessionLocal
from app.infrastructure.models.aps import (
    APSDemanda, APSDetallePeriodo, APSParametro, APSProducto, APSPronostico, APSRecurso,
    APSRestriccion, APSRuta, APSUbicacion,
    HorizontePlanAPSEnum, TipoPronosticoAPSEnum, TipoRecursoAPSEnum, TipoRestriccionAPSEnum,
)

rng = np.random.default_rng(41)
MESES = 30
INICIO = mes_actual()

LIMPIAR = [
    "DELETE FROM aps_colaboracion WHERE pronostico_id IN (SELECT id FROM aps_pronostico WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%'))",
    "DELETE FROM aps_detalle_periodo WHERE pronostico_id IN (SELECT id FROM aps_pronostico WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%'))",
    "DELETE FROM aps_pronostico WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM aps_orden_sugerida WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM aps_plan_detalle WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%' OR codigo LIKE 'PRUEBA%')"
    " OR plan_id IN (SELECT id FROM aps_plan_maestro WHERE nombre LIKE 'SIM%' OR nombre LIKE 'PRUEBA-APS%')",
    "DELETE FROM aps_carga_capacidad WHERE recurso_id IN (SELECT id FROM aps_recurso WHERE codigo LIKE 'SIM-%')"
    " OR plan_id IN (SELECT id FROM aps_plan_maestro WHERE nombre LIKE 'SIM%' OR nombre LIKE 'PRUEBA-APS%')",
    "DELETE FROM aps_colaboracion WHERE justificacion LIKE 'PRUEBA-APS%'",
    "DELETE FROM aps_orden_sugerida WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'PRUEBA%')",
    "DELETE FROM aps_plan_maestro WHERE nombre LIKE 'SIM%' OR nombre LIKE 'PRUEBA-APS%'",
    "DELETE FROM aps_resultado_simulacion WHERE simulacion_id IN (SELECT s.id FROM aps_simulacion s JOIN aps_escenario e ON e.id = s.escenario_id WHERE e.nombre LIKE 'PRUEBA-APS%')",
    "DELETE FROM aps_simulacion WHERE escenario_id IN (SELECT id FROM aps_escenario WHERE nombre LIKE 'PRUEBA-APS%')",
    "DELETE FROM aps_escenario WHERE nombre LIKE 'PRUEBA-APS%'",
    "DELETE FROM aps_soip_revision WHERE ciclo_id IN (SELECT id FROM aps_soip_ciclo WHERE nombre LIKE 'PRUEBA-APS%')",
    "DELETE FROM aps_soip_ciclo WHERE nombre LIKE 'PRUEBA-APS%'",
    "DELETE FROM aps_demanda WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%' OR codigo LIKE 'PRUEBA%')",
    "DELETE FROM aps_parametro WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%' OR codigo LIKE 'PRUEBA%')",
    "DELETE FROM aps_ruta WHERE producto_id IN (SELECT id FROM aps_producto WHERE codigo LIKE 'SIM-%' OR codigo LIKE 'PRUEBA%')",
    "DELETE FROM aps_restriccion WHERE nombre LIKE 'SIM%'",
    "DELETE FROM aps_recurso WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM aps_producto WHERE codigo LIKE 'SIM-%' OR codigo LIKE 'PRUEBA%'",
    "UPDATE aps_ubicacion SET abastecida_por_id = NULL WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM aps_ubicacion WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM aps_config",
]


async def limpiar():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        for sql in LIMPIAR:
            await db.execute(text(sql))
        await db.commit()
        print("planeacion simulada borrada")


def _serie(base, meses, estacional=0.0, tendencia=0.0, ruido=0.08, intermitente=False):
    y = []
    for i in range(meses):
        per = sumar_meses(INICIO, i - meses)
        mes = int(per[5:])
        v = base * (1 + tendencia) ** i * (1 + estacional * math.cos(2 * math.pi * (mes - 12) / 12))
        v *= 1 + rng.normal(0, ruido)
        if intermitente:
            v = float(rng.integers(3, 9)) if rng.random() < 0.3 else 0.0
        y.append((per, max(0.0, round(v))))
    return y


async def simular():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        plb = APSUbicacion(codigo="SIM-PLB", nombre="SIM Planta Bogotá", tipo="PLANTA", ciudad="Bogotá")
        db.add(plb); await db.flush()
        cdm = APSUbicacion(codigo="SIM-CDM", nombre="SIM CD Medellín", tipo="CD", ciudad="Medellín", abastecida_por_id=plb.id)
        cdc = APSUbicacion(codigo="SIM-CDC", nombre="SIM CD Cali", tipo="CD", ciudad="Cali", abastecida_por_id=plb.id)
        db.add_all([cdm, cdc]); await db.flush()
        mez = APSRecurso(codigo="SIM-MEZ", nombre="SIM Mezcladora", tipo=TipoRecursoAPSEnum.EQUIPO, ubicacion_id=plb.id,
                         capacidad_diaria=5, unidad_capacidad="horas", eficiencia_pct=85)
        env = APSRecurso(codigo="SIM-ENV", nombre="SIM Envasadora", tipo=TipoRecursoAPSEnum.LINEA, ubicacion_id=plb.id,
                         capacidad_diaria=6, unidad_capacidad="horas", eficiencia_pct=85)
        db.add_all([mez, env]); await db.flush()

        # codigo, nombre, familia, costo, peso, LT, rutas, demanda por ubicación
        productos = [
            ("SIM-JUG1", "SIM Jugo de naranja 1 L", "Bebidas", 2800, 1.1, 10, {mez: 0.004, env: 0.006},
             {plb: dict(base=3000, estacional=0.35), cdm: dict(base=2000, estacional=0.35), cdc: dict(base=1500, estacional=0.35)}),
            ("SIM-JUG2", "SIM Jugo de mango 1 L", "Bebidas", 3000, 1.1, 10, {mez: 0.004, env: 0.006},
             {plb: dict(base=1500, estacional=0.35), cdm: dict(base=900, estacional=0.35)}),
            ("SIM-AGU", "SIM Agua 600 ml", "Bebidas", 900, 0.65, 5, {env: 0.003},
             {plb: dict(base=4000, tendencia=0.03), cdm: dict(base=2500, tendencia=0.03)}),
            ("SIM-SAL", "SIM Salsa de tomate 400 g", "Salsas", 4200, 0.45, 12, {mez: 0.005, env: 0.004},
             {plb: dict(base=2500), cdc: dict(base=1500)}),
            ("SIM-MAY", "SIM Mayonesa 400 g", "Salsas", 5100, 0.45, 12, {mez: 0.005, env: 0.004},
             {plb: dict(base=3000, ruido=0.15)}),
            ("SIM-TAP", "SIM Tapas plásticas (millar)", "Insumos", 38000, 2.0, 45, {}, {plb: dict(base=40)}),
            ("SIM-ETI", "SIM Etiquetas (millar)", "Insumos", 22000, 1.5, 20, {}, {plb: dict(base=30)}),
            ("SIM-REP", "SIM Repuesto de bomba", "Repuestos", 450000, 8.0, 60, {}, {plb: dict(base=1, intermitente=True)}),
        ]
        stock = {"SIM-TAP": {plb: 0}, "SIM-ETI": {plb: 900}}
        for codigo, nombre, familia, costo, peso, lt, rutas, demanda in productos:
            p = APSProducto(codigo=codigo, nombre=nombre, familia=familia, costo_unitario=costo, peso_kg=peso,
                            lead_time_dias=lt, unidad_medida="UN")
            db.add(p); await db.flush()
            for r, h in rutas.items():
                db.add(APSRuta(producto_id=p.id, recurso_id=r.id, horas_por_unidad=h))
            for u, kw in demanda.items():
                serie = _serie(kw.pop("base"), MESES, **kw)
                for per, v in serie:
                    db.add(APSDemanda(producto_id=p.id, ubicacion_id=u.id, periodo=per, cantidad=v))
                media = sum(v for _, v in serie[-3:]) / 3
                db.add(APSParametro(producto_id=p.id, ubicacion_id=u.id, nivel_servicio_pct=95,
                                    stock_actual=stock.get(codigo, {}).get(u, round(media * 0.8)),
                                    lote_produccion=2000 if rutas and u is plb else None,
                                    lote_minimo_compra=None if rutas else 10))
                if codigo == "SIM-AGU" and u is plb:
                    # Publicado hace seis meses con +10 % sobre lo que después pasó.
                    hace6 = sumar_meses(INICIO, -6)
                    pub = APSPronostico(producto_id=p.id, ubicacion_id=u.id, tipo=TipoPronosticoAPSEnum.CONSENSO,
                                        horizonte=HorizontePlanAPSEnum.MENSUAL, version="v1 · SIM", activo=False,
                                        fecha_inicio=datetime(int(hace6[:4]), int(hace6[5:]), 1, tzinfo=timezone.utc),
                                        fecha_fin=datetime(int(INICIO[:4]), int(INICIO[5:]), 1, tzinfo=timezone.utc))
                    db.add(pub); await db.flush()
                    reales = dict(serie)
                    for k in range(6):
                        per = sumar_meses(hace6, k)
                        f = datetime(int(per[:4]), int(per[5:]), 1, tzinfo=timezone.utc)
                        db.add(APSDetallePeriodo(pronostico_id=pub.id, periodo=per, fecha_inicio=f, fecha_fin=f,
                                                 cantidad_pronosticada=round(reales[per] * 1.10)))
        db.add(APSRestriccion(ubicacion_id=cdc.id, tipo=TipoRestriccionAPSEnum.DURA, ambito="BODEGA", nombre="SIM Bodega de Cali",
                              valor_max=3000, descripcion="Capacidad de almacenamiento en unidades"))
        db.add(APSRestriccion(ubicacion_id=plb.id, tipo=TipoRestriccionAPSEnum.DURA, ambito="TRANSPORTE", nombre="SIM Camiones de 12 t",
                              valor_max=12000, descripcion="Capacidad por vehículo desde la planta, kg"))
        await db.commit()
        print("simulado", INICIO)

asyncio.run(limpiar() if "--limpiar" in sys.argv else simular())
