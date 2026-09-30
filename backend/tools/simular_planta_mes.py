"""
Planta simulada con efectos conocidos, para validar la analítica de MES
(`endpoints/mes_analitica.py`) y su prueba `frontend/tools/probar_mes_analitica.cjs`.

Seis meses, dos líneas, tres turnos al día. Lo que se sembró y la analítica
tiene que encontrar:
  - El operario «SIM Operario 3» desperdicia 1,5 puntos más que el resto.
  - El producto «SIM Producto B» desperdicia 0,8 puntos más.
  - El turno NO influye (se reparte al azar).
  - El equipo SIM-E2 se desgasta: sus paradas no planeadas siguen una Weibull
    con β = 2,5 y η = 200 h. Los demás, tasa constante (β = 1, η = 400 h).
  - En la línea 1, los últimos 30 días el rendimiento cae de 90 % a 80 %: el
    OEE baja y la caída la explica el rendimiento, no la disponibilidad.
  - La primera causa de parada por minutos es «SIM Cambio de referencia».

Escribe directo en la base y SOLO para desarrollo local: todo lleva SIM-.

    docker cp backend/tools/simular_planta_mes.py ci_backend:/tmp/
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_planta_mes.py"
    docker exec -e PYTHONPATH=/app ci_backend sh -c "cd /app && python /tmp/simular_planta_mes.py --limpiar"
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import text

import app.main  # noqa: F401 — carga todos los modelos
from app.core.database import AsyncSessionLocal
from app.infrastructure.models.mes import (
    MESPlanta, MESLinea, MESCeldaTrabajo, MESEquipo, MESOperario, MESProducto, MESOrdenProduccion,
    MESEjecucion, MESParada, MESScrap, MESOEERegistro, MESInspeccion,
    TipoFabricacionEnum, TipoProductoMESEnum, EstadoOrdenProduccionEnum, PrioridadOrdenMESEnum,
    EstadoEjecucionMESEnum, TurnoMESEnum, TipoParadaMESEnum, TipoScrapMESEnum,
    TipoInspeccionMESEnum, ResultadoInspeccionMESEnum,
)

rng = np.random.default_rng(11)
random.seed(11)
AHORA = datetime.now(timezone.utc)
DIAS = 180
INICIO = AHORA - timedelta(days=DIAS)
TURNOS = [(TurnoMESEnum.MANANA, 6), (TurnoMESEnum.TARDE, 14), (TurnoMESEnum.NOCHE, 22)]

LIMPIAR = [
    "DELETE FROM mes_scrap WHERE orden_id IN (SELECT id FROM mes_orden_produccion WHERE numero LIKE 'SIM-%')",
    "DELETE FROM mes_inspeccion WHERE orden_id IN (SELECT id FROM mes_orden_produccion WHERE numero LIKE 'SIM-%')",
    "DELETE FROM mes_parada WHERE equipo_id IN (SELECT id FROM mes_equipo WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM mes_ejecucion WHERE orden_id IN (SELECT id FROM mes_orden_produccion WHERE numero LIKE 'SIM-%')",
    "DELETE FROM mes_oee_registro WHERE linea_id IN (SELECT id FROM mes_linea WHERE codigo LIKE 'SIM-%')",
    "DELETE FROM mes_orden_produccion WHERE numero LIKE 'SIM-%'",
    "DELETE FROM mes_equipo WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM mes_celda_trabajo WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM mes_linea WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM mes_operario WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM mes_producto WHERE codigo LIKE 'SIM-%'",
    "DELETE FROM mes_planta WHERE codigo LIKE 'SIM-%'",
]


async def limpiar():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        for sql in LIMPIAR:
            await db.execute(text(sql))
        await db.commit()
        print("planta simulada borrada")


async def simular():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SET search_path TO public"))
        planta = MESPlanta(codigo="SIM-P", nombre="SIM Planta", tipo_fabricacion=TipoFabricacionEnum.DISCRETA, activo=True)
        db.add(planta); await db.flush()
        lineas, equipos = [], {}
        for li in (1, 2):
            l = MESLinea(planta_id=planta.id, codigo=f"SIM-L{li}", nombre=f"SIM Línea {li}", activo=True)
            db.add(l); await db.flush()
            c = MESCeldaTrabajo(linea_id=l.id, codigo=f"SIM-C{li}", nombre=f"SIM Celda {li}", activo=True)
            db.add(c); await db.flush()
            lineas.append(l)
            equipos[l.id] = []
            for k in range(3):
                n = (li - 1) * 3 + k + 1
                e = MESEquipo(celda_id=c.id, codigo=f"SIM-E{n}", nombre=f"SIM Equipo {n}", activo=True)
                db.add(e); await db.flush()
                equipos[l.id].append(e)
        operarios = []
        for k in range(1, 9):
            o = MESOperario(codigo=f"SIM-O{k}", nombre=f"SIM Operario {k}", planta_id=planta.id, activo=True)
            db.add(o); await db.flush(); operarios.append(o)
        productos = []
        for letra in "ABCD":
            p = MESProducto(codigo=f"SIM-P{letra}", nombre=f"SIM Producto {letra}", unidad_medida="UN",
                            tipo=TipoProductoMESEnum.PRODUCTO_TERMINADO, requiere_lote=False, activo=True)
            db.add(p); await db.flush(); productos.append(p)

        # Paradas no planeadas: proceso de renovación en horas por equipo
        causas_np = ["SIM Falla de motor", "SIM Atasco de banda", "SIM Falla de sensor"]
        paradas_min = {}
        for l in lineas:
            for e in equipos[l.id]:
                b, eta = (2.5, 200) if e.codigo == "SIM-E2" else (1.0, 400)
                t = INICIO + timedelta(hours=float(eta * rng.weibull(b)))
                while t < AHORA:
                    dur = float(rng.lognormal(np.log(45), 0.5))
                    db.add(MESParada(equipo_id=e.id, tipo=TipoParadaMESEnum.NO_PLANEADA, causa=random.choice(causas_np),
                                     fecha_inicio=t, fecha_fin=t + timedelta(minutes=dur), duracion_min=round(dur, 1)))
                    paradas_min.setdefault((l.id, t.date(), (t.hour - 6) % 24 // 8), 0)
                    paradas_min[(l.id, t.date(), (t.hour - 6) % 24 // 8)] += dur
                    t += timedelta(hours=float(eta * rng.weibull(b)))

        n_orden = 0
        for d in range(DIAS):
            dia = INICIO + timedelta(days=d)
            for l in lineas:
                n_orden += 1
                prod = random.choice(productos)
                orden = MESOrdenProduccion(numero=f"SIM-OP-{n_orden}", producto_id=prod.id, linea_id=l.id,
                                           estado=EstadoOrdenProduccionEnum.CERRADA, prioridad=PrioridadOrdenMESEnum.NORMAL,
                                           cantidad_planificada=3000, unidad_medida="UN",
                                           costo_material=0, costo_mano_obra=0, costo_indirecto=0)
                db.add(orden); await db.flush()
                producida_orden = scrap_orden = 0
                for ti, (turno, hora) in enumerate(TURNOS):
                    ini = dia.replace(hour=hora, minute=0, second=0, microsecond=0)
                    fin = ini + timedelta(hours=8)
                    op = random.choice(operarios)
                    eq = random.choice(equipos[l.id])
                    # Setup planeado al comenzar cada turno
                    setup = float(rng.normal(25, 5))
                    db.add(MESParada(equipo_id=eq.id, tipo=TipoParadaMESEnum.SETUP, causa="SIM Cambio de referencia",
                                     fecha_inicio=ini, fecha_fin=ini + timedelta(minutes=setup), duracion_min=round(setup, 1)))
                    tasa = max(0.1, float(rng.normal(2.0, 0.5)) + (1.5 if op.codigo == "SIM-O3" else 0)
                               + (0.8 if prod.codigo == "SIM-PB" else 0)) / 100
                    total = int(rng.normal(1000, 80))
                    scrap = int(rng.binomial(total, tasa))
                    db.add(MESEjecucion(orden_id=orden.id, operario_id=op.id, equipo_id=eq.id, turno=turno,
                                        estado=EstadoEjecucionMESEnum.COMPLETADA, fecha_inicio=ini, fecha_fin=fin,
                                        cantidad_producida=total - scrap, cantidad_scrap=scrap))
                    if scrap:
                        db.add(MESScrap(orden_id=orden.id, producto_id=prod.id, operario_id=op.id,
                                        tipo=TipoScrapMESEnum.NORMAL, es_reprocesable=False,
                                        causa=random.choices(["SIM Rebaba", "SIM Dimensión fuera de tolerancia", "SIM Mancha"],
                                                             [5, 3, 1])[0],
                                        cantidad=scrap, unidad_medida="UN", costo_unitario=1200, costo_total=scrap * 1200,
                                        fecha_registro=fin))
                    producida_orden += total - scrap; scrap_orden += scrap
                    # OEE del turno
                    tp = 480.0
                    caidas = paradas_min.get((l.id, ini.date(), ti), 0) + setup
                    to = max(tp - caidas, 60)
                    ultimos30 = d >= DIAS - 30 and l.codigo == "SIM-L1"
                    rend = float(np.clip(rng.normal(0.80 if ultimos30 else 0.90, 0.03), 0.5, 1.0))
                    nominal = to * 2.4
                    real = nominal * rend
                    buena = real * (1 - tasa)
                    D, R, C = to / tp, real / nominal, buena / real
                    db.add(MESOEERegistro(linea_id=l.id, equipo_id=eq.id, fecha=ini, turno=turno,
                                          tiempo_planificado_min=tp, tiempo_paradas_min=tp - to, tiempo_operativo_min=to,
                                          produccion_real=real, produccion_nominal=nominal, produccion_buena=buena,
                                          disponibilidad=round(D * 100, 2), rendimiento=round(R * 100, 2),
                                          calidad=round(C * 100, 2), oee=round(D * R * C * 100, 2)))
                orden.cantidad_producida = producida_orden
                orden.cantidad_scrap = scrap_orden
                muestra = 50
                defectos = int(rng.binomial(muestra, 0.03))
                db.add(MESInspeccion(orden_id=orden.id, operario_id=random.choice(operarios).id,
                                     tipo=TipoInspeccionMESEnum.FINAL_LINEA,
                                     resultado=ResultadoInspeccionMESEnum.APROBADO if defectos <= 3 else ResultadoInspeccionMESEnum.RECHAZADO,
                                     fecha_inspeccion=dia.replace(hour=20), muestra_tam=muestra, muestra_defectos=defectos))
        # Lo que está pasando ahora: una orden liberada con una ejecución en
        # curso y una parada abierta hace 90 minutos (para el tablero).
        n_orden += 1
        prod = productos[0]
        orden = MESOrdenProduccion(numero=f"SIM-OP-{n_orden}", producto_id=prod.id, linea_id=lineas[0].id,
                                   estado=EstadoOrdenProduccionEnum.EN_EJECUCION, prioridad=PrioridadOrdenMESEnum.ALTA,
                                   cantidad_planificada=3000, cantidad_producida=1200, unidad_medida="UN",
                                   costo_material=0, costo_mano_obra=0, costo_indirecto=0,
                                   fecha_fin_plan=AHORA + timedelta(days=2))
        db.add(orden); await db.flush()
        eq = equipos[lineas[0].id][1]
        ej = MESEjecucion(orden_id=orden.id, operario_id=operarios[0].id, equipo_id=eq.id, turno=TurnoMESEnum.MANANA,
                          estado=EstadoEjecucionMESEnum.EN_PROGRESO, fecha_inicio=AHORA - timedelta(hours=3),
                          cantidad_producida=1200, cantidad_scrap=20)
        db.add(ej); await db.flush()
        db.add(MESParada(ejecucion_id=ej.id, equipo_id=eq.id, tipo=TipoParadaMESEnum.NO_PLANEADA,
                         causa="SIM Falla de motor", descripcion="SIM parada en curso",
                         fecha_inicio=AHORA - timedelta(minutes=90)))
        await db.commit()
        print("ordenes", n_orden)

asyncio.run(limpiar() if "--limpiar" in sys.argv else simular())
