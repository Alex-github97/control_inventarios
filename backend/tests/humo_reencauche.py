"""Prueba de humo de la planta de reencauche, contra la app entera y por HTTP interno.

Recorre los escenarios de las especificaciones de `openspec/changes/planta-reencauche`
sobre una empresa de prueba local que tenga el módulo contratado. ESCRIBE: crea
almacén, insumos, equipos, carcasas, órdenes, ciclos, entregas... Cada corrida
agrega llantas nuevas, así que se puede repetir. No correr contra una empresa
real.

    docker exec -w /app -e PYTHONPATH=/app -e ESQUEMA=cli_rtm ci_backend python tests/humo_reencauche.py

ESQUEMA_SIN_MODULO: un esquema sin el módulo (para el 403). Por defecto cli_acme.
"""
import asyncio
import os
import sys
import time as _time
from datetime import date, datetime, timedelta, timezone

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import func, select, text

import app.main as m
from app.core import reencauche_semilla, wms_inventario as inv, wms_zonas_base
from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user
from app.core.sesiones import token_de_herramienta
from app.infrastructure.models.reencauche import (
    RTMCarcasa, RTMConsumo, RTMEtapa, RTMOrden, RTMRuta, RTMRutaEtapa,
)
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import (
    WMSAlmacen, WMSDepositante, WMSInventarioUbicacion, WMSLote, WMSMovimientoInventario, WMSProducto, WMSSerie,
)

ESQUEMA = os.environ.get("ESQUEMA", "cli_rtm")
SIN_MODULO = os.environ.get("ESQUEMA_SIN_MODULO", "cli_acme")
API = "/api/v1/reencauche"
MEDIDA = "295/80 R22.5"

FALLOS = []
CUENTA = {"ok": 0}


def ok(cond, etiqueta, detalle=""):
    if cond:
        CUENTA["ok"] += 1
        print("  ok   " + etiqueta)
    else:
        FALLOS.append(etiqueta)
        print("FALLA  " + etiqueta + ("  ->  " + str(detalle)[:400] if detalle else ""))


class U:
    def __init__(self, fila):
        self.id, self.username, self.rol, self.nombre, self.apellido = fila.id, fila.username, fila.rol, fila.nombre, fila.apellido
        self.activo, self.email, self.rol_id = True, fila.email, fila.rol_id


ACTUAL = {}


async def _db():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as s:
        await s.execute(text('SET search_path TO "%s"' % ESQUEMA))
        yield s


m.app.dependency_overrides[get_current_user] = lambda: ACTUAL["u"]
m.app.dependency_overrides[get_db] = _db


def como(u):
    ACTUAL["u"] = u


async def sesion():
    s = AsyncSessionLocal(info={"esquema": ESQUEMA})
    await s.execute(text('SET search_path TO "%s"' % ESQUEMA))
    return s


# ── Preparación: datos maestros del WMS (no son del módulo) ───────────────────

async def preparar(c, usuarios):
    s = await sesion()
    try:
        alm = (await s.execute(select(WMSAlmacen).where(WMSAlmacen.codigo == "RTM-PLANTA"))).scalar()
        if alm is None:
            alm = WMSAlmacen(codigo="RTM-PLANTA", nombre="Planta de reencauche", ciudad="Barranquilla",
                             direccion="Vía 40 # 1-23", activo=True)
            s.add(alm)
            await s.flush()
            await wms_zonas_base.asegurar(s, alm)
        deps = {}
        for cod, nombre, nit in (("TNORTE", "Transportes del Norte", "900111222"), ("CARIBE", "Carga Caribe", "900333444")):
            d = (await s.execute(select(WMSDepositante).where(WMSDepositante.codigo == cod))).scalar()
            if d is None:
                d = WMSDepositante(codigo=cod, nombre=nombre, nit=nit, propio=False, activo=True)
                s.add(d)
                await s.flush()
            deps[cod] = d.id
        await s.commit()
        almacen_id = alm.id
    finally:
        await s.close()

    r = await c.put(API + "/planta", json={"almacen_id": almacen_id, "cargo_inspeccion": 25000})
    ok(r.status_code == 200 and r.json()["lista"], "1.4 configurar planta: elegir el almacén crea zonas y ubicaciones", r.text)
    planta = r.json()
    r = await c.get("/api/v1/wms/zonas/")
    nombres = {z["nombre"] for z in r.json()} if r.status_code == 200 else set()
    ok({"Reencauche · recepción de carcasas", "Reencauche · producción", "Reencauche · rechazos"} <= nombres,
       "1.4 las zonas de la planta aparecen en el WMS", r.text[:200])
    r = await c.put(API + "/planta", json={"almacen_id": almacen_id})
    ok(r.json()["ubicaciones"]["recepcion"]["id"] == planta["ubicaciones"]["recepcion"]["id"],
       "1.4 volver a elegir el almacén no duplica zonas")

    # Equipos.
    equipos = [("INS-1", "Mesa de inspección 1", "INSPECCION", 1), ("DST-1", "Destalonadora", "DESTALONADORA", 1),
               ("RAS-2", "Raspadora 2", "RASPADORA", 1), ("ESC-1", "Escariado y reparación", "ESCARIADORA", 1),
               ("CEM-1", "Cabina de cementado", "CEMENTADORA", 1), ("COR-1", "Cortadora de banda", "CORTADORA", 1),
               ("EMB-1", "Embandadora", "EMBANDADORA", 1), ("ENV-1", "Envelopadora", "ENVELOPADORA", 1),
               ("AC1", "Autoclave 1", "AUTOCLAVE", 12), ("AC2", "Autoclave 2", "AUTOCLAVE", 2),
               ("ACA-1", "Acabados y marcación", "ACABADO", 1)]
    existentes = {e["codigo"]: e for e in (await c.get(API + "/equipos")).json()}
    for cod, nombre, tipo, cap in equipos:
        if cod not in existentes:
            r = await c.post(API + "/equipos", json={"codigo": cod, "nombre": nombre, "tipo": tipo, "capacidad": cap})
            assert r.status_code == 201, r.text
            existentes[cod] = r.json()
    if "RAS-SIN" not in existentes:
        r = await c.post(API + "/equipos", json={"codigo": "RAS-SIN", "nombre": "Raspadora sin ubicación",
                                                 "tipo": "RASPADORA", "crear_ubicacion": False})
        existentes["RAS-SIN"] = r.json()
    ok(all(existentes[x[0]]["ubicacion_id"] for x in equipos), "1.4 cada estación queda con su ubicación del WMS")

    # Insumos con lote y existencias en las ubicaciones de las estaciones.
    s = await sesion()
    try:
        propio = (await s.execute(select(WMSDepositante.id).where(WMSDepositante.propio.is_(True)))).scalar()
        if propio is None:
            from app.core.wms_operacion import depositante_propio
            propio = await depositante_propio(s)
        prods = {}
        for sku, nombre, ref, unidad, costo in (
                ("RTM-BDR230", "Banda BDR-HT 230", "BDR-HT 230", "METRO", 38500),
                ("RTM-BDR250", "Banda BDR-HT 250", "BDR-HT 250", "METRO", 41000),
                ("RTM-COJIN", "Cojín de unión 1,5 mm", "COJIN-15", "METRO", 9000),
                ("RTM-CEMENTO", "Cemento vulcanizante", "CEM-01", "LITRO", 52000),
                ("RTM-PARCHE", "Parche radial PR-20", "PR-20", "UNIDAD", 31000)):
            p = (await s.execute(select(WMSProducto).where(WMSProducto.sku == sku))).scalar()
            if p is None:
                p = WMSProducto(sku=sku, nombre=nombre, referencia=ref, unidad_medida=unidad, depositante_id=propio,
                                requiere_lote=True, activo=True, tarifa_iva=19, costo_promedio=0)
                s.add(p)
                await s.flush()
            prods[sku] = (p, costo)
        await s.commit()
    finally:
        await s.close()
    clases = {"RTM-BDR230": "BANDA", "RTM-BDR250": "BANDA", "RTM-COJIN": "COJIN", "RTM-CEMENTO": "CEMENTO",
              "RTM-PARCHE": "PARCHE"}
    for sku, (p, _) in prods.items():
        await c.put(API + "/insumos", json={"producto_id": p.id, "clase": clases[sku]})
    lugares = {"RTM-BDR230": "COR-1", "RTM-BDR250": "COR-1", "RTM-COJIN": "COR-1", "RTM-CEMENTO": "CEM-1",
               "RTM-PARCHE": "ESC-1"}
    lotes = {}
    s = await sesion()
    try:
        for sku, numero, cantidad in (("RTM-BDR230", "L-0915", 400), ("RTM-BDR250", "L-0950", 200),
                                      ("RTM-BDR230", "L-VACIO", 1), ("RTM-COJIN", "C-0420", 400),
                                      ("RTM-CEMENTO", "CM-77", 100), ("RTM-PARCHE", "PR-1", 100)):
            p, costo = prods[sku]
            lote = (await s.execute(select(WMSLote).where(WMSLote.producto_id == p.id, WMSLote.numero_lote == numero))).scalar()
            if lote is None:
                lote = WMSLote(producto_id=p.id, numero_lote=numero, activo=True)
                s.add(lote)
                await s.flush()
            ubic = existentes[lugares[sku]]["ubicacion_id"]
            fila = await inv.fila(s, p.id, ubic, lote.id)
            hay = float(fila.cantidad_disponible) if fila else 0
            falta = cantidad - hay if numero != "L-VACIO" else (1 - hay)
            if falta > 0:
                await inv.mover(s, tipo="RECEPCION", producto_id=p.id, cantidad=falta, lote_id=lote.id, destino=ubic,
                                costo_unitario=costo, referencia="humo_reencauche")
            lotes[numero] = lote.id
        await s.commit()
    finally:
        await s.close()

    banda, banda2 = prods["RTM-BDR230"][0].id, prods["RTM-BDR250"][0].id
    # Especificación de la medida con la banda.
    espec = {"medida": MEDIDA, "banda_producto_id": None, "longitud_banda_m": 3.12, "longitud_cojin_m": 3.1,
             "cemento_estandar": 0.2, "limites": {"diametro": {"min": 1010, "max": 1030}, "ancho": {"min": 220, "max": 240},
                                                   "radio": {"min": 600, "max": 1000}, "longitud_banda": {"min": 3.0, "max": 3.3},
                                                   "centrado": {"min": 0, "max": 3}, "profundidad_final": {"min": 14, "max": 22}}}
    actuales = [e for e in (await c.get(API + "/especificaciones")).json() if e["medida"] == MEDIDA and e["banda_producto_id"] is None]
    if not actuales:
        r = await c.post(API + "/especificaciones", json=espec)
        assert r.status_code == 201, r.text
    # Recetas: AC1 con la banda 230 (aprobada) y AC1 con la 250 (aprobada); AC2 con la 230.
    recetas = (await c.get(API + "/recetas")).json()
    for cod, eq, b in (("REC-230", "AC1", banda), ("REC-250", "AC1", banda2), ("REC-230B", "AC2", banda)):
        if not any(x["codigo"] == cod and x["estado"] == "APROBADA" for x in recetas):
            r = await c.post(API + "/recetas", json={"codigo": cod, "nombre": f"Receta {cod}", "equipo_id": existentes[eq]["id"],
                                                     "banda_producto_id": b, "temperatura_c": 98, "temperatura_tol": 3,
                                                     "presion_bar": 6, "presion_tol": 0.5, "vacio_bar": -0.8, "vacio_tol": 0.1,
                                                     "tiempo_min": 180, "tiempo_tol": 5})
            assert r.status_code == 201, r.text
            rid = r.json()["id"]
            como(usuarios["operario"])
            r2 = await c.post(f"{API}/recetas/{rid}/aprobar")
            ok(r2.status_code == 403, "5.1 solo calidad aprueba una receta (403 a un operario)", r2.status_code)
            como(usuarios["admin"])
            await c.post(f"{API}/recetas/{rid}/aprobar")
    # Tarifas: general y especial de Transportes del Norte.
    tarifas = (await c.get(API + "/tarifas")).json()
    if not any(t["tipo"] == "REENCAUCHE" and t["depositante_id"] is None and t["medida"] == MEDIDA for t in tarifas):
        await c.post(API + "/tarifas", json={"tipo": "REENCAUCHE", "medida": MEDIDA, "valor": 650000})
        await c.post(API + "/tarifas", json={"tipo": "REENCAUCHE", "medida": MEDIDA, "banda_producto_id": banda,
                                             "depositante_id": deps["TNORTE"], "valor": 590000})
        await c.post(API + "/tarifas", json={"tipo": "REPARACION", "tipo_reparacion": "PARCHE", "valor": 45000})
        await c.post(API + "/tarifas", json={"tipo": "VENTA", "medida": MEDIDA, "valor": 1150000})
    # Roles de la planta.
    await c.put(API + "/roles", json={"usuario_id": usuarios["tecnico"].id, "roles": ["TECNICO", "CALIDAD", "SUPERVISOR"]})
    await c.put(API + "/roles", json={"usuario_id": usuarios["operario"].id, "roles": []})
    return {"almacen_id": almacen_id, "deps": deps, "propio": propio, "equipos": existentes, "banda": banda,
            "banda2": banda2, "lotes": lotes, "prods": {k: v[0].id for k, v in prods.items()}, "planta": planta}


# ── Ayudantes del recorrido ───────────────────────────────────────────────────

ESTACION = {"INSP_INICIAL": "INS-1", "DESTALONADO": "DST-1", "RASPADO": "RAS-2", "INSP_RASPADO": "INS-1",
            "ESCARIADO": "ESC-1", "CEMENTADO": "CEM-1", "PREP_BANDA": "COR-1", "EMBANDADO": "EMB-1",
            "ENVELOPADO": "ENV-1", "DESENVELOPADO": "INS-1", "INSP_FINAL": "INS-1", "ACABADOS": "ACA-1",
            "MARCACION": "ACA-1"}


def datos_buenos(etapa, ctx, banda=None):
    banda = banda or ctx["banda"]
    return {
        "INSP_INICIAL": {"mediciones": {"profundidad_remanente": 4.5}, "decision": "APROBADA"},
        "RASPADO": {"mediciones": {"diametro": 1020, "ancho": 230, "radio": 800}},
        "INSP_RASPADO": {"decision": "APROBADA"},
        "CEMENTADO": {"consumos": [{"producto_id": ctx["prods"]["RTM-CEMENTO"], "lote_id": ctx["lotes"]["CM-77"], "cantidad": 0.2}]},
        "PREP_BANDA": {"mediciones": {"longitud_banda": 3.12},
                       "consumos": [{"producto_id": banda, "numero_lote": "L-0915" if banda == ctx["banda"] else "L-0950", "cantidad": 3.12},
                                    {"producto_id": ctx["prods"]["RTM-COJIN"], "numero_lote": "C-0420", "cantidad": 3.1}]},
        "EMBANDADO": {"mediciones": {"centrado": 1}},
        "ENVELOPADO": {"mediciones": {"vacio_conforme": True}},
        "DESENVELOPADO": {"decision": "APROBADA"},
        "INSP_FINAL": {"mediciones": {"profundidad_final": 16}, "decision": "APROBADA"},
    }.get(etapa, {})


async def etapa_de(c, codigo):
    r = await c.get(f"{API}/terminal/INS-1/{codigo}")
    return (r.json().get("etapa") or {}).get("codigo") if r.status_code == 200 else None


async def hacer(c, codigo, etapa, datos):
    r = await c.post(API + "/terminal/iniciar", json={"estacion": ESTACION[etapa], "codigo": codigo})
    if r.status_code != 200:
        return r
    return await c.post(f"{API}/pasos/{r.json()['paso_id']}/terminar", json=datos)


async def avanzar_hasta(c, codigo, hasta, ctx, banda=None, omitir_opcionales=True):
    """Lleva la carcasa con datos conformes hasta que su etapa actual sea `hasta`."""
    for _ in range(20):
        e = await etapa_de(c, codigo)
        if e is None or e == hasta:
            return e
        if e in ("DESTALONADO", "ESCARIADO") and omitir_opcionales:
            r = await c.post(API + "/terminal/omitir", json={"codigo": codigo, "motivo": "No la necesita"})
        elif e == "VULCANIZACION":
            await vulcanizar(c, [codigo], "AC1")
            continue
        else:
            r = await hacer(c, codigo, e, datos_buenos(e, ctx, banda))
        assert r.status_code == 200, (codigo, e, r.text)
    return await etapa_de(c, codigo)


async def vulcanizar(c, codigos, autoclave, reales=None):
    eq = {e["codigo"]: e for e in (await c.get(API + "/equipos")).json()}[autoclave]
    r = await c.post(API + "/ciclos", json={"equipo_id": eq["id"]})
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    for cod in codigos:
        r = await c.post(f"{API}/ciclos/{cid}/cargar", json={"codigo": cod})
        assert r.status_code == 200, r.text
    assert (await c.post(f"{API}/ciclos/{cid}/iniciar")).status_code == 200
    r = await c.post(f"{API}/ciclos/{cid}/cerrar", json=reales or {"temperatura": 98.5, "presion": 6.1, "vacio": -0.82, "tiempo": 181})
    assert r.status_code == 200, r.text
    return cid, r.json()


async def recepcion(c, dep, n, remision=None, declarada=None, **extra):
    r = await c.post(API + "/recepciones", json={"depositante_id": dep, "remision": remision,
                                                 "cantidad_declarada": declarada})
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    codigos = []
    for i in range(n):
        datos = {"marca": extra.get("marca", "Michelin"), "medida": MEDIDA, "modelo": "XZE", "dot": extra.get("dot"),
                 "banda_producto_id": extra.get("banda"), "costo_compra": extra.get("costo_compra")}
        r = await c.post(f"{API}/recepciones/{rid}/carcasas", json=datos)
        assert r.status_code == 201, r.text
        codigos.append(r.json()["codigo"])
    return rid, codigos


async def wms_en(c_ubicacion, producto_id):
    s = await sesion()
    try:
        return float((await s.execute(select(func.coalesce(func.sum(WMSInventarioUbicacion.cantidad_disponible), 0)).where(
            WMSInventarioUbicacion.producto_id == producto_id, WMSInventarioUbicacion.ubicacion_id == c_ubicacion))).scalar())
    finally:
        await s.close()


# ── Escenarios ────────────────────────────────────────────────────────────────

async def base_modulo(c, usuarios):
    print("\n1. Base del módulo")
    r = await c.get(API + "/planta")
    ok(r.status_code == 200, "1.1 empresa con el módulo: 200", r.status_code)
    s = await sesion()
    try:
        ruta = (await s.execute(select(RTMRuta).where(RTMRuta.codigo == "FRIO"))).scalar()
        n = (await s.execute(select(func.count()).select_from(RTMRutaEtapa).where(RTMRutaEtapa.ruta_id == ruta.id))).scalar() if ruta else 0
        ok(ruta is not None and n == 15, "1.3 la empresa queda con la ruta en frío de 15 etapas", n)
        otra = await reencauche_semilla.sembrar(s)
        ok(otra is False, "1.3 la siembra no se repite al reiniciar")
        await s.rollback()
    finally:
        await s.close()


async def sin_modulo():
    tok = token_de_herramienta(subject=1, esquema=SIN_MODULO, usuario="prueba", cliente=SIN_MODULO.replace("cli_", ""))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=m.app), base_url="http://local",
                                 headers={"Authorization": "Bearer " + tok}) as c:
        r = await c.get(API + "/planta")
        ok(r.status_code == 403, f"1.1 empresa sin el módulo ({SIN_MODULO}): 403", r.status_code)


async def recepcion_y_wms(c, ctx, usuarios):
    print("\n2. Recepción y carcasas en el WMS")
    tn = ctx["deps"]["TNORTE"]
    rid, codigos = await recepcion(c, tn, 38, remision="REM-4001", declarada=40, banda=ctx["banda"])
    r = await c.post(f"{API}/recepciones/{rid}/cerrar")
    ok(r.status_code == 200 and r.json()["diferencia"] == -2, "Llegan menos llantas de las remitidas: diferencia −2", r.text)
    r = await c.get(API + "/novedades", params={"depositante_id": tn})
    ok(any(x["diferencia"] == -2 for x in r.json()), "la diferencia aparece en el reporte de novedades del cliente")
    rid2, _ = await recepcion(c, tn, 2)
    r = await c.post(f"{API}/recepciones/{rid2}/cerrar")
    ok(r.json()["cantidad_declarada"] == 2 and r.json()["diferencia"] == 0, "Recepción sin remisión: declarada igual a la contada", r.text)
    ok(codigos[0].startswith("RT-"), "Código generado: consecutivo con prefijo", codigos[0])
    r = await c.post(API + "/recepciones", json={"depositante_id": tn})
    rid3 = r.json()["id"]
    r = await c.post(f"{API}/recepciones/{rid3}/carcasas", json={"codigo": codigos[0], "marca": "X", "medida": MEDIDA, "modelo": "Y"})
    ok(r.status_code == 409 and "Transportes del Norte" in r.text, "Código repetido: se rechaza diciendo de quién es", r.text)
    r = await c.post(f"{API}/recepciones/{rid3}/carcasas", json={"marca": "Bridgestone", "medida": MEDIDA, "modelo": "R268"})
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": r.json()["codigo"]})).json()
    ok(hoja["carcasa"]["dot_ilegible"] is True, "DOT ilegible: queda marcada para los reportes")
    await c.post(f"{API}/recepciones/{rid3}/cerrar")

    # 38 carcasas del cliente en la zona de recepción del WMS, sin tocar la contabilidad.
    s = await sesion()
    try:
        prod = (await s.execute(select(WMSProducto).where(WMSProducto.sku.like(f"RTM-C{tn}-%")))).scalar()
        movs = (await s.execute(select(WMSMovimientoInventario).where(
            WMSMovimientoInventario.documento_tipo == "RTM_RECEPCION", WMSMovimientoInventario.documento_id == rid))).scalars().all()
    finally:
        await s.close()
    hay = await wms_en(ctx["planta"]["ubicaciones"]["recepcion"]["id"], prod.id)
    ok(len(movs) == 38 and all(x.serie_id for x in movs), "2.1 cada entrada queda con su serie en el kárdex", len(movs))
    ok(hay >= 38 and prod.depositante_id == tn, "Carcasa de cliente: el WMS muestra las unidades del depositante en recepción", hay)
    ok(all(x.comprobante_id is None for x in movs) and all(float(x.costo_unitario or 0) == 0 for x in movs),
       "Carcasa de cliente: no se valoriza ni se contabiliza")

    # Carcasa comprada por la planta.
    rid4, compradas = await recepcion(c, ctx["propio"], 2, remision="FC-77", costo_compra=180000, banda=ctx["banda"])
    await c.post(f"{API}/recepciones/{rid4}/cerrar")
    s = await sesion()
    try:
        mov = (await s.execute(select(WMSMovimientoInventario).where(WMSMovimientoInventario.documento_tipo == "RTM_RECEPCION",
                                                                     WMSMovimientoInventario.documento_id == rid4))).scalar()
    finally:
        await s.close()
    ok(mov is not None and float(mov.costo_unitario) == 180000, "Carcasa comprada por la planta: entra valorizada a su costo")
    return {"tn": codigos, "propias": compradas}


async def produccion(c, ctx, usuarios, cods):
    print("\n3. Flujo de producción y terminal")
    a = cods["tn"][0]
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "RAS-2", "codigo": "NO-EXISTE-99"})
    ok(r.status_code == 404 and "recepción" in r.text, "Escanear un código desconocido en una estación", r.text)
    r = await hacer(c, a, "INSP_INICIAL", datos_buenos("INSP_INICIAL", ctx))
    ok(r.status_code == 200, "Inspección inicial aprobada: pasa a la etapa siguiente", r.text)
    ok(await etapa_de(c, a) == "DESTALONADO", "...queda en la cola de la siguiente etapa (destalonado)")
    s = await sesion()
    try:
        c_a = (await s.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == a))).scalar()
        ok(c_a.wms_ubicacion_id == ctx["planta"]["ubicaciones"]["produccion"]["id"],
           "3.5 al aprobar la inicial, en el WMS pasa de recepción a producción")
    finally:
        await s.close()
    r = await c.post(API + "/terminal/omitir", json={"codigo": a, "motivo": "Carcasa sin rebabas"})
    ok(r.status_code == 200, "Etapa opcional: se omite dejando quién lo decidió", r.text)
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "EMB-1", "codigo": a})
    ok(r.status_code == 409 and "Raspado" in r.text, "Saltarse una etapa obligatoria: la estación dice dónde está", r.text)
    r = await c.post(API + "/terminal/omitir", json={"codigo": a})
    ok(r.status_code == 409, "una etapa obligatoria no se omite", r.status_code)
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "RAS-SIN", "codigo": a})
    ok(r.status_code == 409 and "ubicación" in r.text, "1.4 un equipo sin ubicación no se puede usar en la terminal", r.text)

    # Raspado fuera de diámetro: 2 mm por debajo del mínimo.
    como(usuarios["operario"])
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "RAS-2", "codigo": a})
    paso = r.json()["paso_id"]
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={"mediciones": {"diametro": 1008, "ancho": 230, "radio": 800}})
    ok(r.status_code == 422 and "fuera de tolerancia" in r.text, "Raspado fuera de diámetro: no deja cerrar sin decisión", r.text)
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={"mediciones": {"diametro": 1008, "ancho": 230, "radio": 800},
                                                          "accion_fuera": "REPETIR"})
    med = r.json().get("mediciones", [])
    ok(r.status_code == 200 and any(x["clave"] == "diametro" and x["conforme"] is False for x in med),
       "...la medición queda marcada y se puede repetir", r.text)
    ok(await etapa_de(c, a) == "RASPADO", "...repetir deja la carcasa en raspado")
    r = await hacer(c, a, "RASPADO", datos_buenos("RASPADO", ctx))
    ok(r.status_code == 200, "Registro desde la terminal: raspado con la medición", r.text)
    como(usuarios["admin"])
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": a})).json()
    raspados = [p for p in hoja["visitas"][0]["pasos"] if p["etapa_codigo"] == "RASPADO" and p["estado"] == "CERRADO"]
    ok(raspados and raspados[-1]["operario"] == "Juan Pérez" and raspados[-1]["equipo"] == "Raspadora 2"
       and raspados[-1]["inicio"] and raspados[-1]["fin"], "...el paso guarda operario, raspadora, horas y medición")
    ok(await etapa_de(c, a) == "INSP_RASPADO", "...y pasa a la cola de inspección posterior al raspado")
    await hacer(c, a, "INSP_RASPADO", {"decision": "APROBADA"})

    # Reparación fuera de límite.
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "ESC-1", "codigo": a})
    paso = r.json()["paso_id"]
    corte = {"tipo_dano": "CORTE", "ubicacion": "COSTADO", "tamano_mm": 45, "tipo_reparacion": "PARCHE", "material": "PR-20"}
    como(usuarios["operario"])
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={"reparaciones": [corte], "autorizar_reparacion": True})
    ok(r.status_code == 422 and "25 mm" in r.text, "Daño fuera de límite: pide autorización técnica", r.text)
    como(usuarios["tecnico"])
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={
        "reparaciones": [corte], "autorizar_reparacion": True,
        "consumos": [{"producto_id": ctx["prods"]["RTM-PARCHE"], "lote_id": ctx["lotes"]["PR-1"], "cantidad": 1}]})
    ok(r.status_code == 200, "...con la autorización de un técnico se registra", r.text)
    como(usuarios["admin"])
    await hacer(c, a, "CEMENTADO", datos_buenos("CEMENTADO", ctx))

    # Corte de banda: 3,12 m del lote L-0915.
    ubic_cor = ctx["equipos"]["COR-1"]["ubicacion_id"]
    s = await sesion()
    try:
        antes = float((await inv.fila(s, ctx["banda"], ubic_cor, ctx["lotes"]["L-0915"])).cantidad_disponible)
        await s.rollback()
    finally:
        await s.close()
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "COR-1", "codigo": a})
    paso = r.json()["paso_id"]
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={"mediciones": {"longitud_banda": 3.12}, "consumos": [
        {"producto_id": ctx["banda"], "numero_lote": "L-VACIO", "cantidad": 3.12}]})
    ok(r.status_code == 409 and "hay 1" in r.text, "Insumo sin existencia: se rechaza diciendo cuánto hay", r.text)
    r = await c.post(f"{API}/pasos/{paso}/terminar", json=datos_buenos("PREP_BANDA", ctx))
    ok(r.status_code == 200, "Corte de banda registrado", r.text)
    s = await sesion()
    try:
        despues = float((await inv.fila(s, ctx["banda"], ubic_cor, ctx["lotes"]["L-0915"])).cantidad_disponible)
        orden = (await s.execute(select(RTMOrden).join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id)
                                 .where(RTMCarcasa.codigo == a, RTMOrden.estado == "ABIERTA"))).scalar()
        cons = (await s.execute(select(RTMConsumo).where(RTMConsumo.orden_id == orden.id,
                                                         RTMConsumo.producto_id == ctx["banda"]))).scalar()
        mov = await s.get(WMSMovimientoInventario, cons.wms_movimiento_id)
    finally:
        await s.close()
    ok(abs((antes - despues) - 3.12) < 1e-6 and cons.lote_id == ctx["lotes"]["L-0915"],
       "Corte de banda: el inventario de esa banda y lote baja 3,12 m y la carcasa queda con el lote", (antes, despues))
    ok(mov.tipo == "CONSUMO_PRODUCCION" and float(mov.costo_unitario) == 38500 and float(cons.costo) == 120120,
       "Consumo valorizado: 3,12 m × $38.500 = $120.120 en la orden", (mov.costo_unitario, cons.costo))

    # Hasta terminar: embandado, encamisado, vulcanización, inspecciones, acabados.
    await avanzar_hasta(c, a, "VULCANIZACION", ctx)
    await vulcanizar(c, [a], "AC1")
    await avanzar_hasta(c, a, "FIN", ctx)
    s = await sesion()
    try:
        ca = (await s.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == a))).scalar()
        serie = await s.get(WMSSerie, ca.wms_serie_id)
        prod = await s.get(WMSProducto, ca.wms_producto_id)
    finally:
        await s.close()
    ok(ca.estado == "TERMINADA" and prod.nombre.startswith("Reencauchada 295/80 R22.5") and "BDR-HT 230" in prod.nombre
       and serie.producto_id == prod.id and ca.wms_ubicacion_id == ctx["planta"]["ubicaciones"]["terminado"]["id"],
       "Llanta terminada: sale la carcasa y entra la reencauchada con la misma serie en producto terminado", prod.nombre)
    conc = (await c.get(API + "/conciliacion")).json()
    ok(conc["cuadra"], "3.5 las cantidades por zona del WMS cuadran con las carcasas", conc["filas"][:3])
    return a


async def calidad(c, ctx, usuarios, cods):
    print("\n4. Control de calidad")
    rech, cond, ret = cods["tn"][3], cods["tn"][4], cods["tn"][5]
    motivos = (await c.get(API + "/motivos")).json()
    defectos = (await c.get(API + "/defectos")).json()
    cables = next(x for x in motivos if "expuestos" in x["nombre"])
    await avanzar_hasta(c, rech, "INSP_RASPADO", ctx)
    r = await hacer(c, rech, "INSP_RASPADO", {"decision": "RECHAZADA"})
    ok(r.status_code == 422 and "motivo" in r.text, "Rechazo sin motivo: no se guarda", r.text)
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "INS-1", "codigo": rech})
    paso = (await c.get(f"{API}/terminal/INS-1/{rech}")).json()["paso_abierto_id"]
    sep = next(x for x in defectos if x["zona"] == "CARCASA_RASPADA" and "Cables" in x["nombre"])
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={"decision": "RECHAZADA", "motivos": [cables["id"]],
                                                          "defectos": [{"defecto_id": sep["id"], "ubicacion": "corona"}]})
    ok(r.status_code == 200 and r.json()["orden_estado"] == "RECHAZADA", "Rechazo después del raspado: la orden se cierra rechazada", r.text)
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": rech})).json()
    v = hoja["visitas"][0]
    ok(v["etapa_rechazo"] == "Inspección posterior al raspado" and hoja["carcasa"]["ubicacion"].startswith("Rechazos"),
       "...con su motivo en «inspección posterior al raspado» y la carcasa a disposición", v["etapa_rechazo"])
    r = await c.post(f"{API}/ordenes/reabrir/{rech}")
    ok(r.status_code == 409 and "disposición" in r.text, "Intentar reabrir una rechazada: solo ofrece disposición", r.text)
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "INS-1", "codigo": rech})
    ok(r.status_code == 409 and "solo admite disposición" in r.text, "...y la terminal tampoco la deja volver", r.text)

    # Shearografía con separación, con la imagen adjunta.
    await avanzar_hasta(c, cond, "INSP_INICIAL", ctx)
    sepc = next(x for x in defectos if "Separación de cinturones" in x["nombre"])
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "INS-1", "codigo": cond})
    paso = r.json()["paso_id"]
    r = await c.post(f"{API}/pasos/{paso}/terminar", json={
        "mediciones": {"profundidad_remanente": 5}, "decision": "CONDICIONAL",
        "defectos": [{"defecto_id": sepc["id"], "ubicacion": "cinturón 2", "tamano_mm": 30}],
        "pruebas": [{"prueba": "SHEAROGRAFIA", "resultado": "Separación en el cinturón 2", "conforme": False}]})
    ok(r.status_code == 200 and r.json()["decision_pendiente"] == "CONDICIONAL", "Condicional: queda detenida", r.text)
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": cond})).json()
    prueba = next(pr for p in hoja["visitas"][0]["pasos"] for pr in p["pruebas"])
    r = await c.post(f"{API}/pruebas/{prueba['id']}/archivo", files={"archivo": ("shearografia.png", b"\x89PNG\r\n\x1a\nPRUEBA", "image/png")})
    ok(r.status_code == 201, "Shearografía: se adjunta la imagen", r.text)
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": cond})).json()
    paso_ii = next(p for p in hoja["visitas"][0]["pasos"] if p["pruebas"])
    ok(paso_ii["pruebas"][0]["archivos"] and any("cinturones" in d["defecto"] for d in paso_ii["defectos"]),
       "Shearografía con separación: imagen y defecto en la historia de la carcasa")

    # Dictamen.
    ev = (await c.get(API + "/evaluacion")).json()
    ok(any(x["codigo"] == cond for x in ev), "4.3 la condicional aparece en la cola de evaluación técnica")
    como(usuarios["operario"])
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "DST-1", "codigo": cond})
    ok(r.status_code == 409 and "dictamen" in r.text, "Operario intenta avanzar una condicional", r.text)
    orden_id = next(x for x in ev if x["codigo"] == cond)["orden_id"]
    r = await c.post(f"{API}/ordenes/{orden_id}/dictamen", json={"resultado": "APROBAR", "justificacion": "Separación dentro de límites"})
    ok(r.status_code == 403, "4.3 dictaminar sin rol técnico: 403 en la API", r.status_code)
    como(usuarios["tecnico"])
    r = await c.post(f"{API}/ordenes/{orden_id}/dictamen", json={"resultado": "APROBAR",
                                                                "justificacion": "Corte en el hombro reparable con parche"})
    ok(r.status_code == 200, "Dictamen: el técnico la aprueba", r.text)
    como(usuarios["admin"])
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": cond})).json()
    ok(hoja["visitas"][0]["dictamenes"][0]["tecnico"] == "Laura Técnica" and await etapa_de(c, cond) == "DESTALONADO",
       "...sale de la cola, sigue su ruta y el dictamen queda firmado")

    # Retención manual y liberación.
    await avanzar_hasta(c, ret, "RASPADO", ctx)
    r = await c.post(API + "/retenciones", json={"codigo": ret, "motivo": "Revisar presión de la raspadora"})
    rid = r.json()["retencion_id"]
    r = await c.post(API + "/terminal/iniciar", json={"estacion": "RAS-2", "codigo": ret})
    ok(r.status_code == 409 and "retenida" in r.text, "4.4 una retenida no avanza", r.text)
    como(usuarios["operario"])
    r = await c.post(f"{API}/retenciones/{rid}/cerrar", json={"accion": "LIBERAR", "justificacion": "Revisado"})
    ok(r.status_code == 403, "4.4 liberar exige rol de calidad", r.status_code)
    como(usuarios["tecnico"])
    r = await c.post(f"{API}/retenciones/{rid}/cerrar", json={
        "accion": "LIBERAR", "justificacion": "La desviación estuvo dentro de la tolerancia del fabricante"})
    ok(r.status_code == 200 and r.json()["estado"] == "LIBERADA", "Liberar una retención: vuelve a su cola con la justificación", r.text)
    como(usuarios["admin"])
    ok((await c.post(API + "/terminal/iniciar", json={"estacion": "RAS-2", "codigo": ret})).status_code == 200,
       "...y puede seguir")

    # Entrega a gestor: dos rechazadas.
    g1, g2 = cods["tn"][6], cods["tn"][7]
    for g in (g1, g2):
        await avanzar_hasta(c, g, "INSP_INICIAL", ctx)
        r = await hacer(c, g, "INSP_INICIAL", {"mediciones": {"profundidad_remanente": 2}, "decision": "RECHAZADA",
                                               "motivos": [motivos[0]["id"]]})
        assert r.status_code == 200, r.text
    ids = [x["id"] for x in (await c.get(API + "/rechazos", params={"limite": 500})).json() if x["codigo"] in (g1, g2)]
    r = await c.post(API + "/rechazos/disponer", json={"carcasa_ids": ids, "tipo": "GESTOR", "gestor": "Ecollantas"})
    ok(r.status_code == 422, "4.5 el gestor exige el acta", r.status_code)
    r = await c.post(API + "/rechazos/disponer", json={"carcasa_ids": ids, "tipo": "GESTOR", "gestor": "Ecollantas",
                                                       "acta": "2026-114"})
    s = await sesion()
    try:
        est = [x for (x,) in (await s.execute(select(RTMCarcasa.wms_ubicacion_id).where(RTMCarcasa.codigo.in_((g1, g2))))).all()]
        estados = [x for (x,) in (await s.execute(select(RTMCarcasa.estado).where(RTMCarcasa.codigo.in_((g1, g2))))).all()]
    finally:
        await s.close()
    ok(r.status_code == 200 and estados == ["DISPUESTA", "DISPUESTA"] and est == [None, None],
       "Entrega a gestor: quedan con disposición, acta y fuera del inventario", (r.text, estados))
    # La rechazada del raspado queda para devolución.
    rid_rech = next(x["id"] for x in (await c.get(API + "/rechazos", params={"limite": 500})).json() if x["codigo"] == rech)
    r = await c.post(API + "/rechazos/disponer", json={"carcasa_ids": [rid_rech], "tipo": "DEVOLUCION"})
    ok(r.status_code == 200, "4.5 devolución al cliente: sale en la siguiente entrega", r.text)
    return {"cond": cond, "ret": ret, "rech": rech}


async def vulcanizacion(c, ctx, usuarios, cods):
    print("\n5. Vulcanización")
    eq = {e["codigo"]: e for e in (await c.get(API + "/equipos")).json()}
    x1, x2, x3, x4, x5 = cods["tn"][8:13]
    for x in (x1, x2, x3, x4):
        await avanzar_hasta(c, x, "VULCANIZACION", ctx)
    orden_x5 = (await c.get(f"{API}/terminal/INS-1/{x5}")).json()["orden_id"]
    r = await c.put(f"{API}/ordenes/{orden_x5}", json={"banda_producto_id": ctx["banda2"]})
    ok(r.status_code == 200 and "250" in r.json()["banda"], "la banda pedida se cambia mientras no se haya cortado", r.text)
    await avanzar_hasta(c, x5, "VULCANIZACION", ctx, banda=ctx["banda2"])
    # Banda sin receta: AC2 solo tiene receta para la banda 230.
    r = await c.post(API + "/ciclos", json={"equipo_id": eq["AC2"]["id"]})
    c2 = r.json()["id"]
    r = await c.post(f"{API}/ciclos/{c2}/cargar", json={"codigo": x5})
    ok(r.status_code == 409 and "Falta una receta" in r.text, "Banda sin receta: la carga se rechaza", r.text)
    # Capacidad excedida (AC2 tiene capacidad 2).
    await c.post(f"{API}/ciclos/{c2}/cargar", json={"codigo": x1})
    await c.post(f"{API}/ciclos/{c2}/cargar", json={"codigo": x2})
    r = await c.post(f"{API}/ciclos/{c2}/cargar", json={"codigo": x3})
    ok(r.status_code == 409 and "capacidad" in r.text, "Capacidad excedida: la carga se rechaza", r.text)
    # Mezclar recetas en AC1: la 230 y la 250.
    r = await c.post(API + "/ciclos", json={"equipo_id": eq["AC1"]["id"]})
    c1 = r.json()["id"]
    await c.post(f"{API}/ciclos/{c1}/cargar", json={"codigo": x3})
    r = await c.post(f"{API}/ciclos/{c1}/cargar", json={"codigo": x5})
    ok(r.status_code == 409 and "ya está armado con la receta REC-230" in r.text, "Mezclar recetas: la segunda se rechaza", r.text)
    await c.post(f"{API}/ciclos/{c1}/cargar", json={"codigo": x4})
    # Registro manual conforme en AC2.
    await c.post(f"{API}/ciclos/{c2}/iniciar")
    await c.post(f"{API}/ciclos/{c1}/iniciar")
    tab = (await c.get(API + "/vulcanizacion/tablero")).json()
    en_ciclo = {a["codigo"]: a for a in tab["autoclaves"] if a["estado"] == "EN_CICLO"}
    ok({"AC1", "AC2"} <= set(en_ciclo) and en_ciclo["AC1"]["ciclo"]["fin_estimado"] and len(en_ciclo["AC1"]["ciclo"]["carcasas"]) == 2,
       "Tablero de autoclaves: cada uno con su ciclo, llantas y hora de fin", [a["estado"] for a in tab["autoclaves"]])
    r = await c.post(f"{API}/ciclos/{c2}/cerrar", json={"temperatura": 99, "presion": 6.2, "vacio": -0.85, "tiempo": 182})
    ok(r.status_code == 200 and r.json()["conforme"] and all(v["conforme"] for v in r.json()["variables"].values()),
       "Registro manual: cada variable comparada contra la tolerancia de la receta", r.text)
    # Tiempo corto: 8 minutos antes de lo que fija la receta (tolerancia 5).
    r = await c.post(f"{API}/ciclos/{c1}/cerrar", json={"temperatura": 98, "presion": 6, "vacio": -0.8, "tiempo": 172})
    ok(r.status_code == 200 and r.json()["desviadas"] == ["tiempo"], "Tiempo corto: el ciclo queda con desviación de tiempo", r.text)
    ret = (await c.get(API + "/retenciones")).json()
    retenidas = {x["codigo"]: x for x in ret if x["codigo"] in (x3, x4)}
    ok(len(retenidas) == 2 and all("desviación de tiempo" in x["motivo"] and x["origen"] == "CICLO" for x in retenidas.values()),
       "...todas sus carcasas quedan retenidas con el motivo", list(retenidas))
    # Fuga de vacío: no conserva el vacío y queda en encamisado.
    fuga = cods["tn"][13]
    await avanzar_hasta(c, fuga, "ENVELOPADO", ctx)
    r = await hacer(c, fuga, "ENVELOPADO", {"mediciones": {"vacio_conforme": False}})
    ok(r.status_code == 200 and await etapa_de(c, fuga) == "ENVELOPADO", "Fuga de vacío: queda en encamisado", r.text)
    r = await c.post(API + "/ciclos", json={"equipo_id": eq["AC2"]["id"]})
    c3 = r.json()["id"]
    r = await c.post(f"{API}/ciclos/{c3}/cargar", json={"codigo": fuga})
    ok(r.status_code == 409 and "encamisado" in r.text, "...y no se puede cargar al autoclave", r.text)
    r = await hacer(c, fuga, "ENVELOPADO", {"mediciones": {"vacio_conforme": True}})
    r = await c.post(f"{API}/ciclos/{c3}/cargar", json={"codigo": fuga})
    ok(r.status_code == 200, "...hasta que se registre una prueba conforme", r.text)
    await c.post(f"{API}/ciclos/{c3}/iniciar")
    await c.post(f"{API}/ciclos/{c3}/cerrar", json={"temperatura": 98, "presion": 6, "vacio": -0.8, "tiempo": 180})
    # Libera las retenidas por ciclo para que sigan.
    como(usuarios["tecnico"])
    for x in retenidas.values():
        await c.post(f"{API}/retenciones/{x['id']}/cerrar", json={"accion": "LIBERAR",
                                                                 "justificacion": "Tiempo dentro de la tolerancia del fabricante de la banda"})
    como(usuarios["admin"])
    ciclos = (await c.get(API + "/ciclos", params={"equipo_id": eq["AC1"]["id"], "limite": 1})).json()
    return {"x1": x1, "x2": x2, "x3": x3, "x4": x4, "ciclo_ac1": ciclos[0]["codigo"] if ciclos else None}


async def trazabilidad(c, ctx, usuarios, cods, terminada):
    print("\n6. Trazabilidad")
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": terminada})).json()
    pasos = hoja["visitas"][0]["pasos"]
    final = next(p for p in pasos if p["etapa_codigo"] == "INSP_FINAL")
    lote = next(cs for p in pasos for cs in p["consumos"] if cs["lote"] == "L-0915")
    ciclo = next(p["ciclo"] for p in pasos if p["ciclo"])
    ok(final["operario"] and lote and ciclo["conforme"] is True and ciclo["codigo"].startswith("AC1-"),
       "Consulta de una llanta: raspador, lote de banda, ciclo sin desviación y quién aprobó la final")
    # Lote de cojín: todas las carcasas que lo usaron.
    r = await c.get(API + "/trazabilidad/lote", params={"numero_lote": "C-0420", "producto_id": ctx["prods"]["RTM-COJIN"]})
    ok(r.status_code == 200 and r.json()["total"] >= 5 and "en_planta" in r.json(),
       "Lote de cojín defectuoso: las carcasas que lo usaron, en planta y entregadas", r.text[:200])
    hoy = date.today()
    eq = {e["codigo"]: e for e in (await c.get(API + "/equipos")).json()}
    r = await c.get(API + "/trazabilidad/equipo", params={"equipo_id": eq["AC1"]["id"], "desde": (hoy - timedelta(days=1)).isoformat(),
                                                          "hasta": hoy.isoformat()})
    ok(r.status_code == 200 and r.json()["total"] >= 3 and r.headers.get("X-Total-Count"),
       "Autoclave descalibrado: las carcasas vulcanizadas en ese autoclave en esas fechas (paginadas)", r.text[:200])
    # El cliente pregunta por sus llantas.
    t = (await c.get(API + "/tablero", params={"depositante_id": ctx["deps"]["TNORTE"]})).json()
    fila = next(x for x in t["clientes"] if x["depositante_id"] == ctx["deps"]["TNORTE"])
    ok(fila["en_planta"] > 0 and fila["listas"] >= 1 and sum(e["en_cola"] + e["en_proceso"] for e in t["etapas"]) > 0,
       "El cliente pregunta por sus llantas: cuántas hay en cada etapa y cuáles están listas", fila)
    # Corregir una medición.
    raspado = next(p for p in pasos if p["etapa_codigo"] == "RASPADO" and p["estado"] == "CERRADO" and p["decision"] == "APROBADA")
    como(usuarios["operario"])
    r = await c.post(f"{API}/pasos/{raspado['id']}/corregir", json={"mediciones": {"diametro": 1021}, "motivo": "Mal digitado"})
    ok(r.status_code == 403, "6.3 corregir exige rol de supervisor", r.status_code)
    como(usuarios["tecnico"])
    r = await c.post(f"{API}/pasos/{raspado['id']}/corregir", json={"mediciones": {"diametro": 1021}, "motivo": "Diámetro mal digitado"})
    como(usuarios["admin"])
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": terminada})).json()
    orig = next(p for p in hoja["visitas"][0]["pasos"] if p["id"] == raspado["id"])
    nuevo = next(p for p in hoja["visitas"][0]["pasos"] if p["anula_a"] == raspado["id"])
    ok(r.status_code == 201 and orig["anulado_por"] == nuevo["id"] and nuevo["operario"] == "Laura Técnica"
       and any(x["valor"] == 1021 for x in nuevo["mediciones"]),
       "Corregir una medición: se ven el valor anulado y el corregido con sus autores")
    r1 = await c.put(f"{API}/pasos/{raspado['id']}", json={"mediciones": []})
    r2 = await c.delete(f"{API}/pasos/{raspado['id']}")
    ok(r1.status_code >= 400 and r2.status_code >= 400, "6.3 un PUT o DELETE sobre un paso cerrado responde error",
       (r1.status_code, r2.status_code))
    # Conciliación con una diferencia forzada.
    s = await sesion()
    try:
        ca = (await s.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == terminada))).scalar()
        await inv.mover(s, tipo="AJUSTE", producto_id=ca.wms_producto_id, cantidad=1, origen=ca.wms_ubicacion_id,
                        referencia="prueba de conciliación")
        await s.commit()
        conc = (await c.get(API + "/conciliacion")).json()
        ok(not conc["cuadra"] and any(f["diferencia"] == -1 for f in conc["filas"]),
           "6.4 conciliación: una diferencia forzada aparece en el reporte")
        await inv.mover(s, tipo="AJUSTE", producto_id=ca.wms_producto_id, cantidad=1, destino=ca.wms_ubicacion_id,
                        referencia="reversa de la prueba de conciliación")
        await s.commit()
    finally:
        await s.close()
    ok((await c.get(API + "/conciliacion")).json()["cuadra"], "...y al revertirla vuelve a cuadrar")


async def transporte(c, ctx, usuarios, cods, terminada):
    print("\n7. Transporte y despacho")
    tn, ca = ctx["deps"]["TNORTE"], ctx["deps"]["CARIBE"]
    jueves = date.today() + timedelta(days=(3 - date.today().weekday()) % 7 or 7)
    r = await c.post(API + "/recogidas", json={"depositante_id": tn, "sede": "Sede Barranquilla", "ciudad": "Barranquilla",
                                               "direccion": "Cra 38 # 70-20", "fecha_requerida": jueves.isoformat(),
                                               "cantidad_estimada": 40})
    s1 = r.json()
    pend = (await c.get("/api/v1/tms/recogidas-reencauche")).json()
    ok(any(x["id"] == s1["id"] and x["fecha_requerida"] == jueves.isoformat() for x in pend),
       "Cliente pide recogida: pendiente en la planificación del TMS con su sede y fecha", pend[:1])
    r = await c.post(API + "/recogidas", json={"depositante_id": ca, "sede": "Patio Malambo", "ciudad": "Malambo",
                                               "fecha_requerida": jueves.isoformat(), "cantidad_estimada": 12})
    s2 = r.json()
    r = await c.post(API + "/recogidas/programar", json={"solicitud_ids": [s1["id"], s2["id"]],
                                                         "fecha": datetime.now(timezone.utc).isoformat()})
    v = r.json()
    tipos = [p["tipo"] for p in v.get("paradas", [])]
    ok(r.status_code == 201 and len(tipos) == 3 and tipos[-1] == "DESTINO", "Ruta con dos clientes: dos paradas de recogida y la planta como destino", r.text)
    p1 = v["paradas"][0]["id"]
    r = await c.put(f"/api/v1/tms/paradas/{p1}/estado", params={"estado": "COMPLETADA"})
    ok(r.status_code == 422 and "cantidad" in r.text, "...cada parada pide cantidad y remisión al completarse", r.text)
    r = await c.put(f"/api/v1/tms/paradas/{p1}/estado", params={"estado": "COMPLETADA", "cantidad_recogida": 40,
                                                              "remision_recogida": "REM-TN-88"})
    ok(r.status_code == 200, "...con cantidad y remisión la parada se completa", r.text)
    r = await c.put(f"/api/v1/tms/paradas/{v['paradas'][2]['id']}/estado", params={"estado": "COMPLETADA"})
    ok(r.status_code == 200, "7.1 las paradas que no son recogidas se completan como siempre", r.text)
    # Faltante entre recogida y recepción: 40 recogidas, 39 contadas.
    r = await c.post(API + "/recepciones", json={"solicitud_id": s1["id"]})
    rec = r.json()
    ok(rec["cantidad_declarada"] == 40 and rec["remision"] == "REM-TN-88", "7.3 la recepción toma lo recogido como cantidad declarada", rec)
    for _ in range(39):
        await c.post(f"{API}/recepciones/{rec['id']}/carcasas", json={"marca": "Goodyear", "medida": MEDIDA, "modelo": "G686"})
    r = await c.post(f"{API}/recepciones/{rec['id']}/cerrar")
    s = await sesion()
    try:
        ev = (await s.execute(text("SELECT descripcion FROM tms_evento WHERE viaje_id = :v ORDER BY id DESC LIMIT 1"),
                              {"v": v["viaje_id"]})).scalar()
    finally:
        await s.close()
    ok(r.json()["diferencia"] == -1 and ev and "diferencia -1" in ev,
       "Faltante entre recogida y recepción: −1 y la novedad enlazada al viaje", (r.text, ev))

    # Orden de entrega: terminadas y rechazadas por devolver; nunca una retenida.
    prop = (await c.get(API + "/entregas/propuesta", params={"depositante_id": tn})).json()
    term = [x["codigo"] for x in prop["terminadas"]]
    dev = [x["codigo"] for x in prop["devoluciones"]]
    ok(terminada in term and cods["calidad"]["rech"] in dev, "Orden de entrega: propone terminadas y rechazadas para devolución", prop)
    retenida = cods["tn"][14]
    await avanzar_hasta(c, retenida, "RASPADO", ctx)
    await c.post(API + "/retenciones", json={"codigo": retenida, "motivo": "Retenida para prueba de despacho"})
    ids = {x["codigo"]: x["id"] for x in prop["terminadas"] + prop["devoluciones"]}
    s = await sesion()
    try:
        id_ret = (await s.execute(select(RTMCarcasa.id).where(RTMCarcasa.codigo == retenida))).scalar()
    finally:
        await s.close()
    r = await c.post(API + "/entregas", json={"depositante_id": tn, "carcasa_ids": [ids[terminada], id_ret]})
    ok(r.status_code == 409 and "retenida" in r.text, "...y no deja agregar una llanta retenida", r.text)
    r = await c.post(API + "/entregas", json={"depositante_id": tn, "carcasa_ids": list(ids.values()),
                                              "ciudad": "Barranquilla", "direccion": "Cra 38 # 70-20"})
    ent = r.json()
    r = await c.post(f"{API}/entregas/{ent['id']}/despachar", json={})
    ent = r.json()
    ok(r.status_code == 200 and ent["estado"] == "DESPACHADA" and ent["viaje_id"] and ent["wms_despacho_id"],
       "7.4 el despacho crea la orden de salida del WMS y el viaje del TMS", r.text)
    s = await sesion()
    try:
        salidas = (await s.execute(select(func.count()).select_from(WMSMovimientoInventario).where(
            WMSMovimientoInventario.documento_tipo == "DESPACHO", WMSMovimientoInventario.documento_id == ent["wms_despacho_id"],
            WMSMovimientoInventario.serie_id.isnot(None)))).scalar()
    finally:
        await s.close()
    ok(salidas == ent["terminadas"] + ent["devoluciones"], "...con la salida del WMS por serie de cada llanta", salidas)
    r = await c.post("/api/v1/tms/pod", json={"viaje_id": ent["viaje_id"], "receptor_nombre": "Carlos Ruiz",
                                              "fecha_hora": datetime.now(timezone.utc).isoformat()})
    ent2 = (await c.get(f"{API}/entregas/{ent['id']}")).json()
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": terminada})).json()
    ok(r.status_code == 201 and ent2["estado"] == "ENTREGADA" and hoja["carcasa"]["estado"] == "ENTREGADA"
       and hoja["visitas"][0]["entrega"]["recibe"] == "Carlos Ruiz" and hoja["visitas"][0]["entrega"]["viaje"],
       "Prueba de entrega: las llantas quedan entregadas con fecha y quien recibió, visibles en su hoja de vida", r.text)
    # Entrega en mostrador.
    otra = cods["vulc"]["x1"]
    await avanzar_hasta(c, otra, "FIN", ctx)
    s = await sesion()
    try:
        id_otra = (await s.execute(select(RTMCarcasa.id).where(RTMCarcasa.codigo == otra))).scalar()
    finally:
        await s.close()
    r = await c.post(API + "/entregas", json={"depositante_id": tn, "carcasa_ids": [id_otra], "modo": "MOSTRADOR"})
    e3 = r.json()
    r = await c.post(f"{API}/entregas/{e3['id']}/despachar", json={"placa": "TNX123"})
    ok(r.status_code == 422, "7.5 en mostrador exige placa y nombre", r.status_code)
    r = await c.post(f"{API}/entregas/{e3['id']}/despachar", json={"placa": "TNX123", "recibe_nombre": "Pedro Gómez"})
    ok(r.status_code == 200 and r.json()["estado"] == "ENTREGADA" and not r.json()["viaje_id"] and r.json()["placa"] == "TNX123",
       "Entrega en mostrador: se cierra sin viaje con placa y nombre", r.text)
    return {"entrega": ent, "mostrador": e3, "otra": otra}


async def liquidacion_y_posventa(c, ctx, usuarios, cods, terminada, ent):
    print("\n8. Liquidación, garantías y CMMS")
    liq = (await c.get(f"{API}/liquidaciones/{ent['entrega']['liquidacion_id']}")).json()
    reenc = [l for l in liq["lineas"] if l["concepto"] == "REENCAUCHE"]
    cargos = [l for l in liq["lineas"] if l["concepto"] == "CARGO_INSPECCION"]
    rep = [l for l in liq["lineas"] if l["concepto"] == "REPARACION"]
    ok(reenc and all(l["valor_unitario"] == 590000 for l in reenc), "Tarifa especial: el cliente se liquida con su tarifa", reenc[:1])
    ok(cargos and cargos[0]["valor_unitario"] == 25000, "Liquidación: las rechazadas con su cargo de inspección", cargos)
    ok(rep and rep[0]["valor_unitario"] == 45000, "Liquidación: la reparación con su tarifa", rep)
    # Cambio de tarifa con llantas en proceso: la general sube; la ya aprobada conserva su precio.
    caribe = ctx["deps"]["CARIBE"]
    rid, [q1, q2] = await recepcion(c, caribe, 2, banda=ctx["banda"])
    for q in (q1, q2):
        await avanzar_hasta(c, q, "ACABADOS", ctx)
    general = next(t for t in (await c.get(API + "/tarifas")).json() if t["tipo"] == "REENCAUCHE" and t["depositante_id"] is None
                   and t["medida"] == MEDIDA and t["banda_producto_id"] is None)
    q3 = (await recepcion(c, caribe, 1, banda=ctx["banda"]))[1][0]
    await avanzar_hasta(c, q3, "INSP_FINAL", ctx)
    await c.put(f"{API}/tarifas/{general['id']}", json={**{k: general[k] for k in ("tipo", "medida", "depositante_id", "banda_producto_id")},
                                                        "valor": general["valor"] + 50000})
    await avanzar_hasta(c, q3, "ACABADOS", ctx)
    s = await sesion()
    try:
        precios = {cod: float(p) for cod, p in (await s.execute(select(RTMCarcasa.codigo, RTMOrden.precio).join(
            RTMOrden, RTMOrden.carcasa_id == RTMCarcasa.id).where(RTMCarcasa.codigo.in_((q1, q3))))).all()}
    finally:
        await s.close()
    ok(precios[q1] == general["valor"] and precios[q3] == general["valor"] + 50000,
       "Cambio de tarifa con llantas en proceso: la ya aprobada conserva el precio y la nueva usa el nuevo", precios)
    await c.put(f"{API}/tarifas/{general['id']}", json={**{k: general[k] for k in ("tipo", "medida", "depositante_id", "banda_producto_id")},
                                                        "valor": general["valor"]})
    # Aprobar la liquidación factura en el ERP (o deja el aviso si la empresa no tiene Finanzas).
    r = await c.post(f"{API}/liquidaciones/{liq['id']}/aprobar")
    l2 = r.json()
    if ERP["listo"]:
        ok(r.status_code == 200 and l2["estado"] == "FACTURADA" and l2.get("factura"),
           "Liquidar una entrega: factura en el ERP con reencauche, reparaciones y cargos", r.text)
        s = await sesion()
        try:
            n_lineas = (await s.execute(text("SELECT count(*) FROM erp_lineas_factura_cliente WHERE factura_id = :f"),
                                        {"f": l2["factura_id"]})).scalar()
        finally:
            await s.close()
        ok(n_lineas == len(liq["lineas"]), "...una línea de factura por línea de liquidación", n_lineas)
    else:
        ok(r.status_code == 200 and l2["estado"] == "APROBADA" and l2["aviso_factura"],
           "Liquidar una entrega sin Finanzas: queda aprobada con el aviso", r.text)

    # Garantías.
    r = await c.post(API + "/reclamos", json={"codigo": "RT-NO-ENTREGADA", "falla": "DESPRENDIMIENTO", "km": 1000})
    ok(r.status_code == 409 and "entrega" in r.text, "Reclamo de una llanta desconocida: se rechaza", r.text)
    r = await c.post(API + "/reclamos", json={"codigo": terminada, "falla": "DESPRENDIMIENTO", "km": 18000,
                                              "condiciones": "Tracción, carretera"})
    rec = r.json()
    await c.post(f"{API}/reclamos/{rec['id']}/fotos", files={"archivo": ("falla.jpg", b"\xff\xd8\xff\xe0JPEG", "image/jpeg")})
    await c.post(f"{API}/reclamos/{rec['id']}/avanzar", json={"estado": "EN_ANALISIS"})
    como(usuarios["operario"])
    r = await c.post(f"{API}/reclamos/{rec['id']}/avanzar", json={"estado": "DICTAMINADO", "dictamen": "PROCEDE", "causa": "x"})
    ok(r.status_code == 403, "8.4 dictaminar una garantía exige rol técnico", r.status_code)
    como(usuarios["tecnico"])
    r = await c.post(f"{API}/reclamos/{rec['id']}/avanzar", json={"estado": "DICTAMINADO", "dictamen": "PROCEDE",
                                                                  "causa": "Defecto de unión", "compensacion": "Reencauche sin costo",
                                                                  "compensacion_valor": 590000})
    como(usuarios["admin"])
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": terminada})).json()
    tiene_ciclo = any(p["ciclo"] for p in hoja["visitas"][0]["pasos"])
    tiene_cojin = any(cs["lote"] == "C-0420" for p in hoja["visitas"][0]["pasos"] for cs in p["consumos"])
    ok(r.status_code == 200 and r.json()["causa"] == "Defecto de unión" and hoja["reclamos"] and tiene_ciclo and tiene_cojin
       and r.json()["fotos"], "Garantía procedente: causa, compensación y el reclamo junto al ciclo y al lote de cojín", r.text)

    # Segundo reencauche: vuelve la misma llanta.
    coinc = (await c.get(API + "/carcasas/coincidencias", params={"codigo": terminada})).json()
    ok(coinc and coinc[0]["puede_volver"], "Segundo reencauche: se propone la misma carcasa con su historia")
    r = await c.post(API + "/recepciones", json={"depositante_id": ctx["deps"]["TNORTE"], "remision": "REM-2027"})
    rid = r.json()["id"]
    r = await c.post(f"{API}/recepciones/{rid}/carcasas", json={"carcasa_id": coinc[0]["id"]})
    ok(r.status_code == 201 and r.json()["numero_reencauche"] == 2 and not r.json()["nueva"],
       "...su número de reencauche pasa de 1 a 2", r.text)
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": terminada})).json()
    ok(len(hoja["visitas"]) == 2 and hoja["visitas"][1]["numero_reencauche"] == 2,
       "Varias visitas: la hoja de vida separa cada visita con su número de reencauche")

    # Flota con planta propia (CMMS de la misma empresa).
    s = await sesion()
    try:
        from app.infrastructure.models.eam import EAMNeumatico, EAMReencaucheDetalle, EAMReencaucheLote
        sufijo = str(int(_time.time()))[-6:]
        lote = EAMReencaucheLote(codigo=f"LT-{sufijo}", fecha_envio=date.today(), proveedor="Planta propia",
                                 remision=f"RM-{sufijo}", estado="ABIERTO")
        s.add(lote)
        await s.flush()
        neus = []
        for i in range(3):
            n = EAMNeumatico(codigo=f"FL{sufijo}{i}", marca="Continental", referencia="HDR2", medida=MEDIDA,
                             estado="REENCAUCHE", reencauches=0, profundidad_actual=3.0, km_actual=120000)
            s.add(n)
            await s.flush()
            s.add(EAMReencaucheDetalle(lote_id=lote.id, neumatico_id=n.id, resultado="PENDIENTE"))
            neus.append(n.codigo)
        await s.commit()
        lote_id = lote.id
    finally:
        await s.close()
    lotes = (await c.get(API + "/cmms/lotes")).json()
    ok(any(x["id"] == lote_id for x in lotes), "8.5 el lote del CMMS aparece para recibir en la planta")
    r = await c.post(f"{API}/cmms/lotes/{lote_id}/recibir")
    ok(r.status_code == 201 and r.json()["carcasas"] == 3, "Flota con planta propia: la recepción llega con las llantas del lote", r.text)
    flota = neus[0]
    await avanzar_hasta(c, flota, "FIN", ctx)
    s = await sesion()
    try:
        id_f = (await s.execute(select(RTMCarcasa.id, RTMCarcasa.depositante_id).where(RTMCarcasa.codigo == flota))).first()
    finally:
        await s.close()
    r = await c.post(API + "/entregas", json={"depositante_id": id_f[1], "carcasa_ids": [id_f[0]], "modo": "MOSTRADOR"})
    r = await c.post(f"{API}/entregas/{r.json()['id']}/despachar", json={"placa": "INT001", "recibe_nombre": "Taller de flota"})
    s = await sesion()
    try:
        det = (await s.execute(text("SELECT d.resultado, d.profundidad_nueva, n.reencauches FROM eam_reencauche_detalle d "
                                    "JOIN eam_neumatico n ON n.id = d.neumatico_id WHERE n.codigo = :c"), {"c": flota})).first()
    finally:
        await s.close()
    ok(det and det[0] == "REENCAUCHADA" and det[1] == 16 and det[2] == 1,
       "...al entregarlas el lote del CMMS queda con el resultado de cada una", det)

    # Venta de una reencauchada de la planta por la orden de salida: factura en el despacho.
    propia2 = cods["propias"][1]
    await avanzar_hasta(c, propia2, "FIN", ctx)
    s = await sesion()
    try:
        from app.infrastructure.models.wms import WMSCliente
        cli = (await s.execute(select(WMSCliente).where(WMSCliente.codigo == "RTM-COMPRADOR"))).scalar()
        if cli is None:
            cli = WMSCliente(codigo="RTM-COMPRADOR", nombre="Transportes Andinos", nit="900555666", ciudad="Bogotá", activo=True)
            s.add(cli)
            await s.commit()
        cli_id = cli.id
        id_p2 = (await s.execute(select(RTMCarcasa.id).where(RTMCarcasa.codigo == propia2))).scalar()
    finally:
        await s.close()
    r = await c.post(API + "/entregas", json={"depositante_id": ctx["propio"], "carcasa_ids": [id_p2], "modo": "MOSTRADOR"})
    ok(r.status_code == 422 and "comprador" in r.text, "8.3 la venta de una propia pide el cliente comprador", r.text)
    r = await c.post(API + "/entregas", json={"depositante_id": ctx["propio"], "carcasa_ids": [id_p2], "modo": "MOSTRADOR",
                                              "wms_cliente_id": cli_id})
    e_venta = r.json()
    ok(r.status_code == 201 and e_venta["tipo"] == "VENTA" and e_venta["llantas"][0]["precio"] == 1150000,
       "8.3 la entrega de una propia es una venta con el precio de la tarifa de venta", r.text)
    r = await c.post(f"{API}/entregas/{e_venta['id']}/despachar", json={"placa": "ABC123", "recibe_nombre": "Comprador"})
    s = await sesion()
    try:
        fac = (await s.execute(text("SELECT factura_id, aviso_factura FROM wms_despachos WHERE id = :d"),
                               {"d": r.json().get("wms_despacho_id")})).first()
        liq = (await s.execute(text("SELECT count(*) FROM rtm_liquidacion WHERE entrega_id = :e"), {"e": e_venta["id"]})).scalar()
    finally:
        await s.close()
    if ERP["listo"]:
        ok(r.status_code == 200 and fac and fac[0] and liq == 0,
           "Venta por la orden de salida: el despacho se factura como producto y no por liquidación de servicio", (r.text, fac))
    hoja = (await c.get(API + "/hoja-de-vida", params={"q": propia2})).json()
    ok(hoja["carcasa"]["estado"] == "VENDIDA", "...y la llanta queda vendida en su hoja de vida", hoja["carcasa"]["estado"])

    # Venta en punto de venta de una reencauchada de la planta.
    if ERP["listo"] and ERP.get("caja"):
        propia = cods["propias"][0]
        await avanzar_hasta(c, propia, "FIN", ctx)
        cat = (await c.get(f"/api/v1/pos/cajas/{ERP['caja']}/catalogo", params={"q": propia})).json()
        ok(cat and cat[0].get("serie") == propia, "8.3 el POS encuentra la reencauchada por su código", cat)
        await c.post("/api/v1/pos/turnos/abrir", json={"caja_id": ERP["caja"], "base_inicial": 0})
        r = await c.post("/api/v1/pos/ventas", json={"caja_id": ERP["caja"], "lineas": [
            {"producto_id": cat[0]["producto_id"], "cantidad": 1, "serie": propia}],
            "pagos": [{"medio": "EFECTIVO", "monto": cat[0]["precio"]}], "cliente": {"nombre": "Consumidor final"}})
        hoja = (await c.get(API + "/hoja-de-vida", params={"q": propia})).json()
        ok(r.status_code == 201 and hoja["carcasa"]["estado"] == "VENDIDA"
           and any(mv["documento"] == "POS_VENTA" for mv in hoja["movimientos_wms"]),
           "Venta en punto de venta: sale de producto terminado y su hoja de vida registra la venta", r.text)


async def indicadores(c, ctx):
    print("\n9. Indicadores con datos de resultado conocido")
    # Datos construidos a mano en un cliente aparte, para que el resultado sea exacto.
    s = await sesion()
    try:
        cod = "KPI-" + str(int(_time.time()))[-6:]
        d = WMSDepositante(codigo=cod, nombre="Cliente de indicadores " + cod, propio=False, activo=True)
        s.add(d)
        await s.flush()
        etapas = {e.codigo: e.id for e in (await s.execute(select(RTMEtapa))).scalars()}
        ruta = (await s.execute(select(RTMRuta.id).where(RTMRuta.codigo == "FRIO"))).scalar()
        rec = (await s.execute(text("INSERT INTO rtm_recepcion (codigo, depositante_id, estado, created_at, updated_at) "
                                    "VALUES (:c, :d, 'CERRADA', now(), now()) RETURNING id"), {"c": cod, "d": d.id})).scalar()
        ahora = datetime.now(timezone.utc) - timedelta(hours=2)
        # 1.000 carcasas: la inspección inicial aprueba 820 y rechaza 180.
        car_ids = (await s.execute(text(
            "INSERT INTO rtm_carcasa (codigo, depositante_id, marca, medida, modelo, dot_ilegible, reencauches, estado, "
            "recepcion_id, created_at, updated_at) SELECT :c || '-' || g, :d, 'Michelin', :m, 'XZE', true, 0, "
            "CASE WHEN g <= 820 THEN 'ENTREGADA' ELSE 'RECHAZADA' END, :r, now(), now() FROM generate_series(1, 1000) g "
            "RETURNING id"), {"c": cod, "d": d.id, "m": MEDIDA, "r": rec})).scalars().all()
        await s.execute(text(
            "INSERT INTO rtm_orden (codigo, carcasa_id, recepcion_id, ruta_id, numero_reencauche, prioridad, estado, en_proceso, "
            "retenida, primera_pasada, etapa_rechazo_id, recibida_en, terminada_en, costo_insumos, created_at, updated_at) "
            "SELECT c.codigo || '-V1', c.id, :r, :ruta, 1, 3, CASE WHEN c.estado = 'ENTREGADA' THEN 'TERMINADA' ELSE 'RECHAZADA' END, "
            "false, false, true, CASE WHEN c.estado = 'RECHAZADA' THEN CAST(:ii AS int) END, :t, :t, 0, now(), now() "
            "FROM rtm_carcasa c WHERE c.id = ANY(:ids)"), {"r": rec, "ruta": ruta, "ii": etapas["INSP_INICIAL"], "t": ahora,
                                                           "ids": list(car_ids)})
        await s.execute(text(
            "INSERT INTO rtm_paso (orden_id, etapa_id, inicio, fin, estado, decision, omitida, fuera_tolerancia, created_at, updated_at) "
            "SELECT o.id, :ii, :t, :t2, 'CERRADO', CASE WHEN o.estado = 'TERMINADA' THEN 'APROBADA' ELSE 'RECHAZADA' END, "
            "false, false, now(), now() FROM rtm_orden o WHERE o.recepcion_id = :r"),
            {"ii": etapas["INSP_INICIAL"], "t": ahora, "t2": ahora + timedelta(minutes=10), "r": rec})
        # 40 ciclos de un autoclave nuevo, 6 con desviación de presión.
        eq = (await s.execute(text("INSERT INTO rtm_equipo (codigo, nombre, tipo, capacidad, estado, created_at, updated_at) "
                                   "VALUES (:c, 'Autoclave de indicadores', 'AUTOCLAVE', 12, 'ACTIVO', now(), now()) RETURNING id"),
                              {"c": "AK" + cod[-6:]})).scalar()
        for i in range(40):
            desviada = i < 6
            variables = ('{"temperatura": {"conforme": true}, "presion": {"conforme": %s}, "vacio": {"conforme": true}, '
                         '"tiempo": {"conforme": true}}' % ("false" if desviada else "true"))
            await s.execute(text("INSERT INTO rtm_ciclo (codigo, equipo_id, estado, inicio, fin, variables, conforme, created_at, updated_at) "
                                 "VALUES (:c, :e, 'CERRADO', :t, :t2, CAST(:v AS json), :ok, now(), now())"),
                            {"c": f"AK{cod[-6:]}-{i:04d}", "e": eq, "t": ahora, "t2": ahora + timedelta(hours=3), "v": variables,
                             "ok": not desviada})
        # 2.000 llantas entregadas en el semestre y 14 garantías procedentes: se usan las 820 terminadas y
        # 1.180 más entregadas en el periodo.
        await s.execute(text(
            "INSERT INTO rtm_carcasa (codigo, depositante_id, marca, medida, modelo, dot_ilegible, reencauches, estado, recepcion_id, "
            "created_at, updated_at) SELECT :c || '-E' || g, :d, 'Michelin', :m, 'XZE', true, 1, 'ENTREGADA', :r, now(), now() "
            "FROM generate_series(1, 1180) g"), {"c": cod, "d": d.id, "m": MEDIDA, "r": rec})
        ent = (await s.execute(text("INSERT INTO rtm_entrega (codigo, depositante_id, tipo, modo, estado, recibido_en, created_at, updated_at) "
                                    "VALUES (:c, :d, 'SERVICIO', 'MOSTRADOR', 'ENTREGADA', :t, now(), now()) RETURNING id"),
                               {"c": "EN" + cod, "d": d.id, "t": ahora})).scalar()
        orden_ref = (await s.execute(text("SELECT id FROM rtm_orden WHERE recepcion_id = :r AND estado = 'TERMINADA' LIMIT 1"),
                                     {"r": rec})).scalar()
        todas = list((await s.execute(text("SELECT id FROM rtm_carcasa WHERE recepcion_id = :r AND estado = 'ENTREGADA'"),
                                      {"r": rec})).scalars())
        await s.execute(text("INSERT INTO rtm_entrega_carcasa (entrega_id, carcasa_id, orden_id, tipo, created_at, updated_at) "
                             "SELECT :e, x, :o, 'TERMINADA', now(), now() FROM unnest(CAST(:ids AS int[])) x"),
                        {"e": ent, "o": orden_ref, "ids": todas})
        for i, cid in enumerate(todas[:20]):
            await s.execute(text("INSERT INTO rtm_reclamo (codigo, carcasa_id, orden_id, falla, estado, dictamen, fecha, created_at, updated_at) "
                                 "VALUES (:c, :car, :o, 'DESPRENDIMIENTO', 'DICTAMINADO', :dic, :f, now(), now())"),
                            {"c": f"GR{cod}{i}", "car": cid, "o": orden_ref, "dic": "PROCEDE" if i < 14 else "NO_PROCEDE",
                             "f": date.today()})
        await s.commit()
        dep_id = d.id
    finally:
        await s.close()
    hoy = date.today()
    r = await c.get(API + "/indicadores", params={"desde": (hoy - timedelta(days=180)).isoformat(), "hasta": hoy.isoformat(),
                                                  "depositante_id": dep_id})
    k = r.json()
    ok(r.status_code == 200 and k["recepcion"]["recibidas"] == 1000 and k["recepcion"]["aceptacion_inicial_pct"] == 82.0,
       "Aceptación inicial: 820 de 1.000 = 82 %", k.get("recepcion", r.text))
    ok(k["calidad"]["entregadas"] == 2000 and k["calidad"]["garantias_procedentes"] == 14 and k["calidad"]["garantias_por_100"] == 0.7,
       "Garantías por cada 100: 14 de 2.000 = 0,7", k.get("calidad"))
    ok(k["embudo"]["rendimiento_pct"] == 82.0 and k["embudo"]["etapas"][0]["rechazadas"] == 180,
       "Embudo de la planta: rechazos por punto de inspección y rendimiento final", k.get("embudo"))
    r = await c.get(API + "/indicadores", params={"desde": (hoy - timedelta(days=180)).isoformat(), "hasta": hoy.isoformat(),
                                                  "equipo_id": eq})
    ak = next((a for a in r.json()["vulcanizacion"]["autoclaves"] if a["equipo_id"] == eq), None)
    ok(ak and ak["ciclos"] == 40 and ak["desviacion_pct"]["presion"] == 15.0,
       "Desviaciones por autoclave: 6 de 40 ciclos con desviación de presión = 15 %", ak)
    r = await c.get(API + "/indicadores", params={"desde": (hoy - timedelta(days=180)).isoformat(), "hasta": hoy.isoformat(),
                                                  "depositante_id": dep_id, "marca": "Pirelli"})
    ok(r.json()["recepcion"]["recibidas"] == 0, "Filtro por marca: se recalcula solo con esa marca")


# ── ERP (opcional): empresa, resolución y caja para facturar y vender ─────────

ERP = {"listo": False}


async def preparar_erp(c, ctx):
    empresas = (await c.get("/api/v1/erp/empresas")).json() if (await c.get("/api/v1/erp/empresas")).status_code == 200 else []
    if not empresas:
        r = await c.post("/api/v1/erp/empresas", json={"nit": "900123456", "razon_social": "Reencauchadora de Prueba S.A.S.",
                                                       "ciudad": "Barranquilla"})
        if r.status_code != 201:
            print("  (sin ERP: no se pudo crear la empresa)", r.text[:200])
            return
        empresas = [r.json()]
    emp = empresas[0]["id"]
    res = (await c.get("/api/v1/erp/resoluciones")).json() if (await c.get("/api/v1/erp/resoluciones")).status_code == 200 else []
    hoy = date.today()
    for tipo, pref in (("FACTURA_VENTA", "RTMF"), ("POS", "RTMP")):
        if not any(x.get("tipo_documento") == tipo and x.get("activa") for x in res):
            r = await c.post("/api/v1/erp/resoluciones", json={
                "empresa_id": emp, "tipo_documento": tipo, "numero_resolucion": "18760000001", "fecha_resolucion": hoy.isoformat(),
                "prefijo": pref, "desde": 1, "hasta": 100000, "vigencia_desde": (hoy - timedelta(days=1)).isoformat(),
                "vigencia_hasta": (hoy + timedelta(days=365)).isoformat(), "clave_tecnica": "prueba"})
            if r.status_code != 201:
                print("  (sin resolución:", r.text[:200], ")")
                return
    res = (await c.get("/api/v1/erp/resoluciones")).json()
    ERP["listo"] = True
    # Caja POS en el almacén de la planta, con la zona de producto terminado vendible.
    zonas = (await c.get("/api/v1/pos/zonas")).json()
    for z in zonas:
        if z["nombre"] == "Reencauche · producto terminado" and not z.get("vendible_pos"):
            await c.put(f"/api/v1/pos/zonas/{z['id']}", json={"vendible_pos": True})
    listas = (await c.get("/api/v1/pos/listas")).json()
    lista = next((l for l in listas if l["nombre"] == "Planta"), None) or (await c.post("/api/v1/pos/listas", json={"nombre": "Planta"})).json()
    cajas = (await c.get("/api/v1/pos/cajas")).json()
    caja = next((x for x in cajas if x["codigo"] == "RTM1"), None)
    pos_res = next(x["id"] for x in res if x["tipo_documento"] == "POS")
    if caja is None:
        r = await c.post("/api/v1/pos/cajas", json={"codigo": "RTM1", "nombre": "Mostrador planta", "almacen_id": ctx["almacen_id"],
                                                    "lista_id": lista["id"], "empresa_id": emp, "resolucion_id": pos_res})
        caja = r.json() if r.status_code == 201 else None
    ERP["caja"] = caja["id"] if caja else None
    ERP["lista"] = lista["id"]


async def precio_pos_propia(c, ctx, codigo):
    s = await sesion()
    try:
        pid = (await s.execute(select(RTMCarcasa.wms_producto_id).where(RTMCarcasa.codigo == codigo))).scalar()
    finally:
        await s.close()
    await c.put(f"/api/v1/pos/listas/{ERP['lista']}/precios", json=[{"producto_id": pid, "precio": 1150000}])


async def principal():
    s = await sesion()
    try:
        filas = {u.username: U(u) for u in (await s.execute(select(Usuario).where(
            Usuario.username.in_(("admin", "operario", "tecnico"))))).scalars()}
    finally:
        await s.close()
    if len(filas) < 3:
        print("La empresa de prueba necesita los usuarios admin, operario y tecnico.")
        return 2
    como(filas["admin"])
    tok = token_de_herramienta(subject=filas["admin"].id, esquema=ESQUEMA, usuario="admin", cliente=ESQUEMA.replace("cli_", ""))
    t0 = _time.time()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=m.app), base_url="http://local", timeout=120,
                                 headers={"Authorization": "Bearer " + tok}) as c:
        await base_modulo(c, filas)
        await sin_modulo()
        ctx = await preparar(c, filas)
        await preparar_erp(c, ctx)
        cods = await recepcion_y_wms(c, ctx, filas)
        terminada = await produccion(c, ctx, filas, cods)
        cods["calidad"] = await calidad(c, ctx, filas, cods)
        cods["vulc"] = await vulcanizacion(c, ctx, filas, cods)
        await trazabilidad(c, ctx, filas, cods, terminada)
        ent = await transporte(c, ctx, filas, cods, terminada)
        if ERP["listo"] and ERP.get("caja"):
            # La reencauchada propia necesita precio en la lista de la caja.
            await avanzar_hasta(c, cods["propias"][0], "MARCACION", ctx)
            await hacer(c, cods["propias"][0], "MARCACION", {})
            await precio_pos_propia(c, ctx, cods["propias"][0])
        await liquidacion_y_posventa(c, ctx, filas, cods, terminada, ent)
        await indicadores(c, ctx)
    print()
    print("Esquema %s: %d comprobaciones bien, %d fallas (%.0f s)." % (ESQUEMA, CUENTA["ok"], len(FALLOS), _time.time() - t0))
    for f in FALLOS:
        print("  - " + f)
    return 1 if FALLOS else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
