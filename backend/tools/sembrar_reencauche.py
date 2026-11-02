"""
Un año de operación de una planta de reencauche, para la empresa de prueba.

    python tools/sembrar_reencauche.py --esquema cli_rtmmasivo --carcasas 24000 --dias 365

No escribe a mano en las tablas: TODO pasa por `reencauche_flujo` y
`reencauche_logistica`, la misma puerta de la API, así que cada llanta cumple
las reglas (orden de la ruta, decisiones, retenciones, insumos por lote desde el
WMS, transformación con la misma serie) y el WMS queda cuadrado. Va dentro del
proceso y no por HTTP solo por tiempo: por HTTP serían cientos de miles de
peticiones.

El reloj se simula: `reencauche_flujo.ahora` devuelve la hora del día que se
está sembrando, así que pasos, ciclos, entregas y reclamos quedan repartidos en
el año y los indicadores por periodo tienen sentido.

Lo que siembra:
- planta (almacén, zonas, estaciones), equipos —dos raspadoras, tres
  autoclaves—, insumos con un lote nuevo por mes, especificaciones de tres
  medidas, recetas aprobadas, tarifas y diez clientes;
- cada día, recepciones de varios clientes; rechazos en todas las inspecciones,
  condicionales con dictamen, raspados fuera de tolerancia que se repiten,
  fugas de vacío, reparaciones; ciclos de autoclave por receta, algunos con
  desviación que retiene todo el ciclo y que calidad libera o rechaza;
- cada semana, entregas por cliente (mostrador o viaje con prueba de entrega),
  disposición de rechazos (devolución o gestor) y liquidaciones;
- reclamos de garantía sobre una fracción de lo entregado.

SOLO para empresas de prueba (`ESQUEMAS_PERMITIDOS`).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import random
import secrets
import sys
import time
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("SQLALCHEMY_ECHO", "0")

from sqlalchemy import select, text  # noqa: E402
from sqlalchemy.exc import DBAPIError  # noqa: E402

import app.main  # noqa: E402,F401 — registra los modelos
from app.core import reencauche_flujo as flujo, reencauche_logistica as logi, reencauche_semilla, reencauche_wms as rwms  # noqa: E402
from app.core import wms_inventario as inv, wms_zonas_base  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.core.wms_operacion import depositante_propio  # noqa: E402
from app.infrastructure.models.reencauche import (  # noqa: E402
    RTMCarcasa, RTMEquipo, RTMEspecificacion, RTMInsumo, RTMMotivoRechazo, RTMOrden, RTMReceta, RTMRetencion,
    RTMRolUsuario, RTMTarifa, RTMLiquidacion, RTMEtapa, RTMDefecto,
)
from app.infrastructure.models.usuario import Usuario  # noqa: E402
from app.infrastructure.models.wms import WMSAlmacen, WMSDepositante, WMSLote, WMSProducto  # noqa: E402

ESQUEMAS_PERMITIDOS = {"cli_rtmmasivo", "cli_rtm"}
# Clave de los operarios sintéticos: de CLAVE_SIEMBRA o una al azar (se imprime al crearlos).
CLAVE_USUARIOS = os.environ.get("CLAVE_SIEMBRA") or secrets.token_urlsafe(12)
BOG = timezone(timedelta(hours=-5))
RELOJ = {"t": datetime.now(timezone.utc)}

MEDIDAS = {  # medida: (diámetro, ancho, banda m, cojín m)
    "295/80 R22.5": (1020, 230, 3.12, 3.10), "11R22.5": (1000, 210, 3.05, 3.02), "275/80 R22.5": (990, 215, 3.00, 2.97)}
BANDAS = [("RTM-M-BDR230", "Banda BDR-HT 230", "BDR-HT 230", 38500), ("RTM-M-BDY250", "Banda BDY 250", "BDY 250", 41000),
          ("RTM-M-BZY220", "Banda BZY 220 tracción", "BZY 220", 36500)]
CLIENTES = ["Transportes del Norte", "Carga Caribe", "Logística Andina", "Expreso Sabana", "Transportes Montaña",
            "Flota Pacífico", "Rápido Ochoa Carga", "Tracto Llanos", "Cementos del Valle", "Distribuidora Costa"]
MARCAS = [("Michelin", 0.30), ("Bridgestone", 0.22), ("Goodyear", 0.18), ("Continental", 0.12), ("Firestone", 0.10), ("Hankook", 0.08)]


def ahora_simulado():
    return RELOJ["t"]


def avanzar(minutos: float):
    RELOJ["t"] = RELOJ["t"] + timedelta(minutes=minutos)


def elegir(r: random.Random, pares):
    x, acum = r.random(), 0.0
    for v, p in pares:
        acum += p
        if x <= acum:
            return v
    return pares[-1][0]


async def sesion(esquema: str):
    s = AsyncSessionLocal(info={"esquema": esquema})
    await s.execute(text(f'SET search_path TO "{esquema}"'))
    return s


# ── Preparación ───────────────────────────────────────────────────────────────

async def preparar(esquema: str) -> SimpleNamespace:
    s = await sesion(esquema)
    try:
        await reencauche_semilla.sembrar(s)
        cfg = await reencauche_semilla.config(s)
        alm = (await s.execute(select(WMSAlmacen).where(WMSAlmacen.codigo == "RTM-PLANTA"))).scalar()
        if alm is None:
            alm = WMSAlmacen(codigo="RTM-PLANTA", nombre="Planta de reencauche", ciudad="Barranquilla",
                             direccion="Vía 40 # 1-23", activo=True)
            s.add(alm)
            await s.flush()
            await wms_zonas_base.asegurar(s, alm)
        await rwms.configurar_planta(s, cfg, alm.id)
        cfg.cargo_inspeccion, cfg.costo_hora_mano_obra = 25000, 18000
        propio = await depositante_propio(s)
        deps = []
        for i, n in enumerate(CLIENTES):
            cod = f"RTMC{i + 1:02d}"
            d = (await s.execute(select(WMSDepositante).where(WMSDepositante.codigo == cod))).scalar()
            if d is None:
                d = WMSDepositante(codigo=cod, nombre=n, nit=f"9001{i:05d}", propio=False, activo=True)
                s.add(d)
                await s.flush()
            deps.append(d.id)
        usuarios = {}
        for u, nombre, rol in (("op1", "Juan Pérez", "OPERADOR_BODEGA"), ("op2", "María Gómez", "OPERADOR_BODEGA"),
                               ("op3", "Carlos Ruiz", "OPERADOR_BODEGA"), ("op4", "Ana Torres", "OPERADOR_BODEGA"),
                               ("tec", "Laura Técnica", "OPERADOR_BODEGA"), ("cal", "Pedro Calidad", "OPERADOR_BODEGA")):
            x = (await s.execute(select(Usuario).where(Usuario.username == u))).scalar()
            if x is None:
                x = Usuario(nombre=nombre.split()[0], apellido=nombre.split()[1], email=f"{u}@planta-prueba.com", username=u,
                            hashed_password=hash_password(CLAVE_USUARIOS), rol=rol, activo=True)
                s.add(x)
                await s.flush()
            usuarios[u] = x
        for u, roles in (("tec", ["TECNICO", "SUPERVISOR"]), ("cal", ["CALIDAD"])):
            for r in roles:
                if not (await s.execute(select(RTMRolUsuario).where(RTMRolUsuario.usuario_id == usuarios[u].id,
                                                                    RTMRolUsuario.rol == r))).first():
                    s.add(RTMRolUsuario(usuario_id=usuarios[u].id, rol=r))
        equipos = {}
        for cod, nombre, tipo, cap in (("INS-1", "Mesa de inspección 1", "INSPECCION", 1), ("INS-2", "Mesa de inspección 2", "INSPECCION", 1),
                                       ("DST-1", "Destalonadora", "DESTALONADORA", 1), ("RAS-1", "Raspadora 1", "RASPADORA", 1),
                                       ("RAS-2", "Raspadora 2", "RASPADORA", 1), ("ESC-1", "Escariado y reparación", "ESCARIADORA", 1),
                                       ("CEM-1", "Cabina de cementado", "CEMENTADORA", 1), ("COR-1", "Cortadora de banda", "CORTADORA", 1),
                                       ("EMB-1", "Embandadora 1", "EMBANDADORA", 1), ("EMB-2", "Embandadora 2", "EMBANDADORA", 1),
                                       ("ENV-1", "Envelopadora", "ENVELOPADORA", 1), ("AC1", "Autoclave 1", "AUTOCLAVE", 12),
                                       ("AC2", "Autoclave 2", "AUTOCLAVE", 12), ("AC3", "Autoclave 3", "AUTOCLAVE", 16),
                                       ("ACA-1", "Acabados y marcación", "ACABADO", 1)):
            e = (await s.execute(select(RTMEquipo).where(RTMEquipo.codigo == cod))).scalar()
            if e is None:
                e = RTMEquipo(codigo=cod, nombre=nombre, tipo=tipo, capacidad=cap, estado="ACTIVO")
                s.add(e)
                await s.flush()
                e.ubicacion_id = await rwms.ubicacion_estacion(s, cfg, e)
            equipos[cod] = e
        prods = {}
        for sku, nombre, ref, costo in BANDAS + [("RTM-M-COJIN", "Cojín de unión 1,5 mm", "COJIN-15", 9000),
                                                 ("RTM-M-CEMENTO", "Cemento vulcanizante", "CEM-01", 52000),
                                                 ("RTM-M-PARCHE", "Parche radial PR-20", "PR-20", 31000)]:
            p = (await s.execute(select(WMSProducto).where(WMSProducto.sku == sku))).scalar()
            if p is None:
                p = WMSProducto(sku=sku, nombre=nombre, referencia=ref, unidad_medida="UNIDAD" if "PARCHE" in sku else
                                ("LITRO" if "CEMENTO" in sku else "METRO"), depositante_id=propio, requiere_lote=True,
                                activo=True, tarifa_iva=19, costo_promedio=0)
                s.add(p)
                await s.flush()
            clase = "BANDA" if "M-B" in sku else sku.split("-")[-1]
            if not (await s.execute(select(RTMInsumo).where(RTMInsumo.producto_id == p.id))).first():
                s.add(RTMInsumo(producto_id=p.id, clase=clase, activo=True))
            prods[sku] = (p.id, costo)
        for medida, (dia, ancho, banda_m, cojin_m) in MEDIDAS.items():
            if not (await s.execute(select(RTMEspecificacion).where(RTMEspecificacion.medida == medida,
                                                                    RTMEspecificacion.banda_producto_id.is_(None)))).first():
                s.add(RTMEspecificacion(medida=medida, longitud_banda_m=banda_m, longitud_cojin_m=cojin_m, cemento_estandar=0.2,
                                        activo=True, limites={"diametro": {"min": dia - 10, "max": dia + 10},
                                                              "ancho": {"min": ancho - 10, "max": ancho + 10},
                                                              "radio": {"min": 600, "max": 1000},
                                                              "longitud_banda": {"min": banda_m - 0.15, "max": banda_m + 0.15},
                                                              "centrado": {"min": 0, "max": 3},
                                                              "profundidad_final": {"min": 14, "max": 22}}))
        for ac in ("AC1", "AC2", "AC3"):
            for sku, *_ in BANDAS:
                cod = f"R-{ac}-{sku[-6:]}"
                if not (await s.execute(select(RTMReceta).where(RTMReceta.codigo == cod))).first():
                    s.add(RTMReceta(codigo=cod, version=1, nombre=f"{ac} · {sku}", equipo_id=equipos[ac].id,
                                    banda_producto_id=prods[sku][0], temperatura_c=98, temperatura_tol=3, presion_bar=6,
                                    presion_tol=0.5, vacio_bar=-0.8, vacio_tol=0.1, tiempo_min=180, tiempo_tol=6,
                                    estado="APROBADA", aprobada_por_id=usuarios["cal"].id, aprobada_en=ahora_simulado()))
        if not (await s.execute(select(RTMTarifa.id).limit(1))).first():
            for medida in MEDIDAS:
                s.add(RTMTarifa(tipo="REENCAUCHE", medida=medida, valor=650000, activo=True))
                s.add(RTMTarifa(tipo="VENTA", medida=medida, valor=1150000, activo=True))
            s.add(RTMTarifa(tipo="REPARACION", tipo_reparacion="PARCHE", valor=45000, activo=True))
            s.add(RTMTarifa(tipo="REENCAUCHE", medida="295/80 R22.5", depositante_id=deps[0], valor=590000, activo=True))
        await s.commit()
        motivos = [m for (m,) in (await s.execute(select(RTMMotivoRechazo.id))).all()]
        defectos = {z: [d for (d,) in (await s.execute(select(RTMDefecto.id).where(RTMDefecto.zona == z))).all()]
                    for z in ("BANDA", "HOMBROS", "COSTADOS", "INTERIOR", "CARCASA_RASPADA")}
        return SimpleNamespace(deps=deps, propio=propio, usuarios=usuarios, equipos={k: v.id for k, v in equipos.items()},
                               prods=prods, motivos=motivos, defectos=defectos)
    finally:
        await s.close()


async def reponer_insumos(s, ctx, mes: str):
    """Un lote nuevo por mes de cada insumo, en la ubicación de su estación."""
    lugares = {"BANDA": "COR-1", "COJIN": "COR-1", "CEMENTO": "CEM-1", "PARCHE": "ESC-1"}
    cantidades = {"BANDA": 4500, "COJIN": 9000, "CEMENTO": 800, "PARCHE": 1200}
    lotes = {}
    for sku, (pid, costo) in ctx.prods.items():
        clase = "BANDA" if "M-B" in sku else sku.split("-")[-1]
        numero = f"{sku[-6:]}-{mes}"
        lote = (await s.execute(select(WMSLote).where(WMSLote.producto_id == pid, WMSLote.numero_lote == numero))).scalar()
        if lote is None:
            lote = WMSLote(producto_id=pid, numero_lote=numero, activo=True)
            s.add(lote)
            await s.flush()
            eq = await s.get(RTMEquipo, ctx.equipos[lugares[clase]])
            await inv.mover(s, tipo="RECEPCION", producto_id=pid, cantidad=cantidades[clase], lote_id=lote.id,
                            destino=eq.ubicacion_id, costo_unitario=costo * random.uniform(0.97, 1.05), referencia="siembra")
        lotes[sku] = numero
    return lotes


# ── Recorrido de una carcasa ──────────────────────────────────────────────────

ESTACION = {"INSP_INICIAL": ("INS-1", "INS-2"), "DESTALONADO": ("DST-1",), "RASPADO": ("RAS-1", "RAS-2"),
            "INSP_RASPADO": ("INS-1", "INS-2"), "ESCARIADO": ("ESC-1",), "CEMENTADO": ("CEM-1",), "PREP_BANDA": ("COR-1",),
            "EMBANDADO": ("EMB-1", "EMB-2"), "ENVELOPADO": ("ENV-1",), "DESENVELOPADO": ("INS-1", "INS-2"),
            "INSP_FINAL": ("INS-1", "INS-2"), "ACABADOS": ("ACA-1",), "MARCACION": ("ACA-1",)}
DURACION = {"INSP_INICIAL": 9, "DESTALONADO": 6, "RASPADO": 14, "INSP_RASPADO": 6, "ESCARIADO": 18, "CEMENTADO": 8,
            "PREP_BANDA": 7, "EMBANDADO": 12, "ENVELOPADO": 6, "DESENVELOPADO": 10, "INSP_FINAL": 8, "ACABADOS": 9, "MARCACION": 4}


async def etapa_de(s, orden_id: int) -> tuple:
    o = await s.get(RTMOrden, orden_id)
    if o.estado != "ABIERTA":
        return o, None
    return o, (await s.get(RTMEtapa, o.etapa_actual_id)).codigo


async def recorrer(s, r: random.Random, ctx, cod_carcasa: str, orden_id: int, lotes, medida: str, hasta_vulc: bool):
    """Lleva la orden por sus etapas hasta la vulcanización (o desde ella hasta el
    final). Devuelve el estado en que queda."""
    c = (await s.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == cod_carcasa))).scalar()
    dia, ancho, banda_m, cojin_m = MEDIDAS[medida]
    for _ in range(30):
        o, etapa = await etapa_de(s, orden_id)
        if etapa is None or (etapa == "VULCANIZACION" and hasta_vulc) or o.retenida or o.decision_pendiente:
            return o
        if etapa == "VULCANIZACION":
            return o
        if etapa in ("DESTALONADO", "ESCARIADO") and r.random() < (0.7 if etapa == "DESTALONADO" else 0.6):
            await flujo.omitir(s, c, r.choice(list(ctx.usuarios.values())[:4]), "No la necesita")
            continue
        op = ctx.usuarios[r.choice(("op1", "op2", "op3", "op4"))]
        eq = await s.get(RTMEquipo, ctx.equipos[r.choice(ESTACION[etapa])])
        avanzar(r.uniform(2, 40))
        paso = await flujo.iniciar(s, c, eq, op)
        avanzar(DURACION[etapa] * r.uniform(0.7, 1.5))
        datos, usuario = {}, op
        if etapa == "INSP_INICIAL":
            x = r.random()
            datos = {"mediciones": {"profundidad_remanente": round(r.uniform(1, 8), 1)},
                     "decision": "RECHAZADA" if x < 0.15 else "CONDICIONAL" if x < 0.18 else "APROBADA"}
            if x < 0.18:
                datos["defectos"] = [{"defecto_id": r.choice(ctx.defectos[r.choice(("COSTADOS", "HOMBROS", "INTERIOR"))]),
                                      "ubicacion": "costado", "tamano_mm": round(r.uniform(5, 60))}]
        elif etapa == "RASPADO":
            fuera = r.random() < 0.03
            datos = {"mediciones": {"diametro": dia - 14 if fuera else dia + r.uniform(-6, 6), "ancho": ancho + r.uniform(-5, 5),
                                    "radio": r.uniform(700, 900)}}
            if fuera:
                datos["accion_fuera"] = "REPETIR"
        elif etapa == "INSP_RASPADO":
            x = r.random()
            datos = {"decision": "RECHAZADA" if x < 0.04 else "APROBADA"}
            if x < 0.04:
                datos["defectos"] = [{"defecto_id": r.choice(ctx.defectos["CARCASA_RASPADA"]), "ubicacion": "corona"}]
        elif etapa == "ESCARIADO":
            n = r.choice((1, 1, 2))
            datos = {"reparaciones": [{"tipo_dano": "CORTE", "ubicacion": r.choice(("CORONA", "HOMBRO")), "tamano_mm": r.uniform(5, 20),
                                       "tipo_reparacion": "PARCHE", "material": "PR-20"} for _ in range(n)],
                     "consumos": [{"producto_id": ctx.prods["RTM-M-PARCHE"][0], "numero_lote": lotes["PARCHE"], "cantidad": n}]}
        elif etapa == "CEMENTADO":
            datos = {"consumos": [{"producto_id": ctx.prods["RTM-M-CEMENTO"][0], "numero_lote": lotes["CEMENTO"],
                                   "cantidad": round(r.uniform(0.18, 0.24), 3)}]}
        elif etapa == "PREP_BANDA":
            sku = next(k for k, v in ctx.prods.items() if v[0] == o.banda_producto_id)
            largo = round(banda_m + r.uniform(-0.05, 0.06), 2)
            datos = {"mediciones": {"longitud_banda": largo},
                     "consumos": [{"producto_id": o.banda_producto_id, "numero_lote": lotes[sku[-6:]], "cantidad": largo},
                                  {"producto_id": ctx.prods["RTM-M-COJIN"][0], "numero_lote": lotes["COJIN"], "cantidad": cojin_m}]}
        elif etapa == "EMBANDADO":
            datos = {"mediciones": {"centrado": round(r.uniform(0, 2.5), 1)}}
        elif etapa == "ENVELOPADO":
            datos = {"mediciones": {"vacio_conforme": r.random() > 0.02}}
        elif etapa == "DESENVELOPADO":
            datos = {"decision": "RECHAZADA" if r.random() < 0.01 else "APROBADA"}
        elif etapa == "INSP_FINAL":
            x = r.random()
            datos = {"mediciones": {"profundidad_final": round(r.uniform(14.5, 19), 1)},
                     "decision": "RECHAZADA" if x < 0.01 else "CORRECCION" if x < 0.03 else "APROBADA"}
        if datos.get("decision") == "RECHAZADA" or datos.get("accion_fuera") == "RECHAZAR":
            datos["motivos"] = [r.choice(ctx.motivos)]
        if etapa == "ESCARIADO":
            usuario = ctx.usuarios["tec"]
        await flujo.terminar(s, paso, usuario, **datos)
    return await s.get(RTMOrden, orden_id)


# ── Un día ────────────────────────────────────────────────────────────────────

async def dia(esquema: str, r: random.Random, ctx, fecha: date, n_carcasas: int, estado: dict):
    s = await sesion(esquema)
    try:
        if fecha.day == 1 or not estado.get("lotes"):
            estado["lotes"] = await reponer_insumos(s, ctx, fecha.strftime("%Y%m"))
        lotes = {**estado["lotes"], **{k[-6:]: v for k, v in estado["lotes"].items()}}
        lotes.update({"PARCHE": estado["lotes"]["RTM-M-PARCHE"], "CEMENTO": estado["lotes"]["RTM-M-CEMENTO"],
                      "COJIN": estado["lotes"]["RTM-M-COJIN"]})
        RELOJ["t"] = datetime(fecha.year, fecha.month, fecha.day, 7, 0, tzinfo=BOG)
        nuevas = []
        # Recepciones del día: varios clientes; algo de la propia planta.
        restantes = n_carcasas
        while restantes > 0:
            dep = ctx.propio if r.random() < 0.05 else r.choice(ctx.deps)
            n = min(restantes, r.randint(4, 30))
            declarada = n + (r.choice((-1, 1)) if r.random() < 0.06 else 0)
            rec = await logi.crear_recepcion(s, ctx.usuarios["op1"], dep, remision=f"REM-{r.randint(1000, 99999)}",
                                             cantidad_declarada=declarada)
            # Algunas llantas vuelven: carcasas entregadas que el cliente manda otra vez.
            for _ in range(n):
                avanzar(r.uniform(0.5, 2))
                medida = elegir(r, [("295/80 R22.5", 0.55), ("11R22.5", 0.30), ("275/80 R22.5", 0.15)])
                banda = r.choice([v[0] for k, v in ctx.prods.items() if "M-B" in k])
                vuelve = estado["entregadas"].pop() if estado["entregadas"] and r.random() < 0.08 else None
                datos = {"carcasa_id": vuelve} if vuelve else {
                    "marca": elegir(r, MARCAS), "medida": medida, "modelo": "XZE", "dot_ilegible": r.random() < 0.1,
                    "dot": None if r.random() < 0.1 else f"{r.randint(1, 52):02d}{r.randint(19, 25)}",
                    "profundidad_mm": round(r.uniform(1, 8), 1), "reencauches": r.choice((0, 0, 0, 1, 1, 2)),
                    "costo_compra": 180000 if dep == ctx.propio else None}
                datos.update({"banda_producto_id": banda, "prioridad": r.choice((2, 3, 3, 3, 4))})
                try:
                    res = await logi.registrar_carcasa(s, rec, ctx.usuarios["op1"], datos)
                except Exception:   # noqa: BLE001 — una carcasa que vuelve con otra medida, etc.
                    continue
                c = await s.get(RTMCarcasa, res["carcasa_id"])
                nuevas.append((c.codigo, res["orden_id"], c.medida))
            await logi.cerrar_recepcion(s, rec, ctx.usuarios["op1"])
            restantes -= n
        # Hasta el autoclave.
        RELOJ["t"] = datetime(fecha.year, fecha.month, fecha.day, 9, 0, tzinfo=BOG)
        pendientes = estado.setdefault("pendientes", [])
        for cod, oid, medida in pendientes + nuevas:
            o = await recorrer(s, r, ctx, cod, oid, lotes, medida, True)
            if o.decision_pendiente == "CONDICIONAL":
                avanzar(r.uniform(10, 60))
                ok = r.random() < 0.7
                await flujo.dictaminar(s, o, ctx.usuarios["tec"], "APROBAR" if ok else "RECHAZAR",
                                       "Daño dentro de límites" if ok else "Separación fuera de límites",
                                       None if ok else [r.choice(ctx.motivos)])
                o = await recorrer(s, r, ctx, cod, oid, lotes, medida, True)
        estado["pendientes"] = []
        # Ciclos por receta y autoclave.
        en_vulc = list((await s.execute(select(RTMOrden, RTMCarcasa).join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id)
                                        .join(RTMEtapa, RTMEtapa.id == RTMOrden.etapa_actual_id)
                                        .where(RTMOrden.estado == "ABIERTA", RTMEtapa.codigo == "VULCANIZACION",
                                               RTMOrden.retenida.is_(False)))).all())
        por_banda = {}
        for o, c in en_vulc:
            por_banda.setdefault(o.banda_producto_id, []).append((o, c))
        autoclaves = ["AC1", "AC2", "AC3"]
        RELOJ["t"] = datetime(fecha.year, fecha.month, fecha.day, 11, 0, tzinfo=BOG)
        terminadas_vulc = []
        i = 0
        for banda, grupo in por_banda.items():
            while grupo:
                ac = await s.get(RTMEquipo, ctx.equipos[autoclaves[i % 3]])
                i += 1
                lote_ciclo, grupo = grupo[:ac.capacidad], grupo[ac.capacidad:]
                ciclo = await flujo.crear_ciclo(s, ac, ctx.usuarios["op2"])
                for o, c in lote_ciclo:
                    await flujo.cargar(s, ciclo, c, ctx.usuarios["op2"])
                await flujo.iniciar_ciclo(s, ciclo, ctx.usuarios["op2"])
                avanzar(181)
                desvio = r.random() < 0.08
                variable = r.choice(("temperatura", "presion", "vacio", "tiempo")) if desvio else None
                reales = {"temperatura": 98 + (6 if variable == "temperatura" else r.uniform(-1.5, 1.5)),
                          "presion": 6 + (-1 if variable == "presion" else r.uniform(-0.3, 0.3)),
                          "vacio": -0.8 + (0.3 if variable == "vacio" else r.uniform(-0.05, 0.05)),
                          "tiempo": 180 + (-12 if variable == "tiempo" else r.uniform(-3, 3))}
                await flujo.cerrar_ciclo(s, ciclo, ctx.usuarios["op2"], reales)
                if desvio:
                    for ret in (await s.execute(select(RTMRetencion).where(RTMRetencion.ciclo_id == ciclo.id,
                                                                           RTMRetencion.estado == "ABIERTA"))).scalars():
                        avanzar(15)
                        if r.random() < 0.9:
                            await flujo.liberar(s, ret, ctx.usuarios["cal"], "Desviación dentro de la tolerancia del fabricante")
                        else:
                            await flujo.rechazar_retenida(s, ret, ctx.usuarios["cal"], "Desviación crítica de vulcanización",
                                                          [r.choice(ctx.motivos)])
                terminadas_vulc += [(c.codigo, o.id, c.medida) for o, c in lote_ciclo]
        # Después del autoclave, hasta el final.
        RELOJ["t"] = datetime(fecha.year, fecha.month, fecha.day, 15, 0, tzinfo=BOG)
        for cod, oid, medida in terminadas_vulc:
            await recorrer(s, r, ctx, cod, oid, lotes, medida, False)
        await s.commit()
        # Semanal: disposición de rechazos, entregas y liquidaciones.
        if fecha.weekday() == 4:
            RELOJ["t"] = datetime(fecha.year, fecha.month, fecha.day, 16, 0, tzinfo=BOG)
            sin_disp = (await s.execute(text(
                "SELECT c.id, c.depositante_id FROM rtm_carcasa c JOIN rtm_orden o ON o.carcasa_id = c.id "
                "WHERE c.estado = 'RECHAZADA' AND o.estado = 'RECHAZADA' "
                "AND o.id = (SELECT max(id) FROM rtm_orden x WHERE x.carcasa_id = c.id) "
                "AND NOT EXISTS (SELECT 1 FROM rtm_disposicion d WHERE d.orden_id = o.id)"))).all()
            gestor = [cid for cid, dep in sin_disp if dep == ctx.propio or r.random() < 0.3]
            devol = [cid for cid, _ in sin_disp if cid not in gestor]
            if gestor:
                await logi.disponer(s, ctx.usuarios["cal"], gestor, "GESTOR", "Ecollantas S.A.S.", f"ACTA-{fecha:%Y%m%d}")
            if devol:
                await logi.disponer(s, ctx.usuarios["cal"], devol, "DEVOLUCION")
            for dep in ctx.deps:
                prop = await logi.propuesta_entrega(s, dep)
                ids = [x["id"] for x in prop["terminadas"] + prop["devoluciones"]]
                if not ids:
                    continue
                avanzar(5)
                e = await logi.crear_entrega(s, ctx.usuarios["op1"], dep, ids, modo="MOSTRADOR")
                await logi.despachar(s, e, ctx.usuarios["op1"], placa=f"T{r.randint(100, 999)}{chr(65 + r.randint(0, 25))}",
                                     recibe_nombre="Conductor del cliente")
                estado["entregadas"] += [x["id"] for x in prop["terminadas"]]
                for cid in [x["id"] for x in prop["terminadas"]]:
                    if r.random() < 0.008:
                        estado["reclamos"].append((cid, fecha + timedelta(days=r.randint(20, 160))))
            if r.random() < 0.25:
                for liq in (await s.execute(select(RTMLiquidacion).where(RTMLiquidacion.estado == "BORRADOR").limit(5))).scalars():
                    await logi.aprobar_liquidacion(s, liq, ctx.usuarios["op1"])
            await s.commit()
        # Reclamos que llegan hoy.
        hoy_rec = [x for x in estado["reclamos"] if x[1] == fecha]
        for cid, _ in hoy_rec:
            c = await s.get(RTMCarcasa, cid)
            if c is None or c.estado != "ENTREGADA":
                continue
            try:
                rc = await logi.crear_reclamo(s, c.codigo, r.choice(logi.FALLAS), r.uniform(5000, 60000), "Operación normal", fecha)
                await logi.avanzar_reclamo(s, rc, ctx.usuarios["tec"], "EN_ANALISIS")
                await logi.avanzar_reclamo(s, rc, ctx.usuarios["tec"], "DICTAMINADO",
                                           "PROCEDE" if r.random() < 0.6 else "NO_PROCEDE", "Defecto de unión",
                                           "Reencauche sin costo", 590000)
            except Exception:   # noqa: BLE001
                await s.rollback()
        await s.commit()
    finally:
        await s.close()


async def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("--esquema", required=True)
    ap.add_argument("--carcasas", type=int, default=24000)
    ap.add_argument("--dias", type=int, default=365)
    ap.add_argument("--semilla", type=int, default=7)
    ap.add_argument("--desde-dia", type=int, default=0, help="Retomar una siembra interrumpida desde ese día")
    a = ap.parse_args()
    if a.esquema not in ESQUEMAS_PERMITIDOS:
        sys.exit(f"Solo para empresas de prueba: {', '.join(sorted(ESQUEMAS_PERMITIDOS))}")
    flujo.ahora = ahora_simulado
    r = random.Random(a.semilla)
    random.seed(a.semilla)
    RELOJ["t"] = datetime.now(BOG) - timedelta(days=a.dias)
    ctx = await preparar(a.esquema)
    estado = {"entregadas": [], "reclamos": [], "lotes": None}
    inicio = date.today() - timedelta(days=a.dias)
    por_dia = a.carcasas / max(1, a.dias * 6 / 7)
    t0 = time.time()
    hechas = 0
    for d in range(a.dias):
        fecha = inicio + timedelta(days=d)
        n = 0 if fecha.weekday() == 6 else max(0, int(r.gauss(por_dia, por_dia * 0.25)))
        if d < a.desde_dia:
            continue
        # Un bloqueo mutuo con otra transacción (la migración del servidor de
        # desarrollo al recargar, las tareas de bodega) deshace solo lo que iba
        # del día: se repite el día.
        for intento in range(3):
            try:
                await dia(a.esquema, r, ctx, fecha, n, estado)
                break
            except DBAPIError as e:
                if "deadlock" not in str(e).lower() or intento == 2:
                    raise
                print(f"{fecha}  bloqueo mutuo, se repite el día", flush=True)
                await asyncio.sleep(5)
        hechas += n
        if d % 7 == 0:
            print(f"{fecha}  {hechas:>6} carcasas  {time.time() - t0:>6.0f} s", flush=True)
    s = await sesion(a.esquema)
    try:
        conc = await rwms.conciliacion(s)
        tot = {k: v for k, v in (await s.execute(text("SELECT estado, count(*) FROM rtm_carcasa GROUP BY estado"))).all()}
    finally:
        await s.close()
    print(f"\nListo en {time.time() - t0:.0f} s. Carcasas por estado: {tot}")
    print("Conciliación con el WMS:", "cuadra" if conc["cuadra"] else f"{conc['diferencias']} diferencias")
    return 0 if conc["cuadra"] else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
