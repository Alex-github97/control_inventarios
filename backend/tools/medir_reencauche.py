"""Mide cada ruta GET de la planta de reencauche contra un set con volumen.

    BASE=http://localhost:8000 python tools/medir_reencauche.py cli_rtmmasivo

Mismo método que `consultas-con-volumen`: se llama cada ruta contra el servidor
de verdad (con sus procesos y su supervisor), con ids y códigos reales tomados
de la base, y se reporta:
- las que tardan más de 5 s (el supervisor de uvicorn mata al proceso que no
  contesta su ping en 5 s: una consulta así tumba a los demás usuarios);
- las que devuelven una lista sin tope: más de 1.000 filas, o una lista que
  crece con la operación y no viene paginada (sin `X-Total-Count`).
"""
import asyncio
import os
import sys
import time
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DEBUG", "false")

import httpx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.core.sesiones import token_de_herramienta  # noqa: E402

BASE = os.environ.get("BASE", "http://localhost:8000")
ESQ = sys.argv[1] if len(sys.argv) > 1 else "cli_rtm"
CLIENTE = ESQ.replace("cli_", "")
LIMITE_S = 5.0
# Catálogos de configuración: su tamaño lo decide quien configura, no la operación.
CATALOGOS = {"/etapas", "/rutas", "/defectos", "/motivos", "/limites", "/especificaciones", "/insumos", "/recetas",
             "/tarifas", "/roles", "/usuarios", "/equipos", "/equipos/tipos", "/almacenes", "/propietarios",
             "/insumos/productos", "/clientes-wms", "/cmms/lotes"}


async def datos_reales():
    async with AsyncSessionLocal(info={"esquema": ESQ}) as s:
        await s.execute(text(f'SET search_path TO "{ESQ}"'))
        uno = lambda q: s.execute(text(q))
        c = (await uno("SELECT c.id, c.codigo FROM rtm_carcasa c JOIN rtm_orden o ON o.carcasa_id = c.id "
                       "GROUP BY c.id ORDER BY count(*) DESC, c.id LIMIT 1")).first()
        lote = (await uno("SELECT l.numero_lote, l.producto_id FROM rtm_consumo x JOIN wms_lotes l ON l.id = x.lote_id "
                          "GROUP BY 1, 2 ORDER BY count(*) DESC LIMIT 1")).first()
        return {
            "carcasa": c, "lote": lote,
            "ciclo": (await uno("SELECT codigo FROM rtm_ciclo WHERE estado = 'CERRADO' ORDER BY id DESC LIMIT 1")).scalar(),
            "equipo": (await uno("SELECT id FROM rtm_equipo WHERE tipo = 'AUTOCLAVE' ORDER BY id LIMIT 1")).scalar(),
            "estacion": (await uno("SELECT codigo FROM rtm_equipo WHERE tipo = 'INSPECCION' ORDER BY id LIMIT 1")).scalar(),
            "autoclave": (await uno("SELECT codigo FROM rtm_equipo WHERE tipo = 'AUTOCLAVE' ORDER BY id LIMIT 1")).scalar(),
            "recepcion": (await uno("SELECT id FROM rtm_recepcion ORDER BY id DESC LIMIT 1")).scalar(),
            "entrega": (await uno("SELECT id FROM rtm_entrega ORDER BY id DESC LIMIT 1")).scalar(),
            "liquidacion": (await uno("SELECT id FROM rtm_liquidacion ORDER BY id DESC LIMIT 1")).scalar(),
            "orden": (await uno("SELECT id FROM rtm_orden ORDER BY id DESC LIMIT 1")).scalar(),
            "deposito": (await uno("SELECT depositante_id FROM rtm_carcasa GROUP BY 1 ORDER BY count(*) DESC LIMIT 1")).scalar(),
            "insumo": (await uno("SELECT producto_id FROM rtm_insumo ORDER BY id LIMIT 1")).scalar(),
            "abierta": (await uno("SELECT c.codigo FROM rtm_carcasa c JOIN rtm_orden o ON o.carcasa_id = c.id "
                                  "WHERE o.estado = 'ABIERTA' LIMIT 1")).scalar(),
        }


def llamadas(d):
    hoy = date.today()
    anio = {"desde": (hoy - timedelta(days=365)).isoformat(), "hasta": hoy.isoformat()}
    c_id, c_cod = d["carcasa"] or (0, "X")
    return [
        ("/planta", {}), ("/almacenes", {}), ("/propietarios", {}), ("/roles", {}), ("/roles/yo", {}), ("/usuarios", {}),
        ("/equipos", {}), ("/equipos/tipos", {}), ("/etapas", {}), ("/rutas", {}), ("/defectos", {}), ("/motivos", {}),
        ("/limites", {}), ("/especificaciones", {}), ("/especificaciones/vigente", {"medida": "295/80 R22.5"}),
        ("/insumos", {}), ("/insumos/productos", {}), (f"/insumos/{d['insumo']}/lotes", {}), ("/recetas", {}), ("/tarifas", {}),
        ("/recepciones", {}), ("/recepciones", {"con_diferencia": "true"}), (f"/recepciones/{d['recepcion']}", {}),
        ("/carcasas", {}), ("/carcasas", {"q": "Transportes"}), ("/carcasas", {"estado": "ENTREGADA"}),
        ("/carcasas/coincidencias", {"codigo": c_cod}), (f"/carcasas/etiqueta/{c_cod}", {}),
        (f"/estaciones/{d['estacion']}", {}), (f"/estaciones/{d['estacion']}/cola", {}), (f"/estaciones/{d['autoclave']}/cola", {}),
        (f"/terminal/{d['estacion']}/{d['abierta'] or c_cod}", {}), (f"/ordenes/{d['orden']}", {}),
        ("/evaluacion", {}), ("/retenciones", {}), ("/retenciones", {"estado": "LIBERADA"}), ("/rechazos", {}),
        ("/rechazos", {"pendientes": "false"}), ("/vulcanizacion/tablero", {}), ("/ciclos", {}),
        ("/recogidas", {}), ("/entregas/propuesta", {"depositante_id": d["deposito"]}), ("/clientes-wms", {}),
        ("/entregas", {}), (f"/entregas/{d['entrega']}", {}), ("/liquidaciones", {}), (f"/liquidaciones/{d['liquidacion']}", {}),
        ("/reclamos", {}), ("/cmms/lotes", {}),
        ("/hoja-de-vida", {"q": c_cod}), (f"/carcasas/{c_id}/hoja-de-vida", {}),
        ("/trazabilidad/lote", {"numero_lote": d["lote"][0], "producto_id": d["lote"][1]} if d["lote"] else {"numero_lote": "X"}),
        ("/trazabilidad/ciclo", {"codigo": d["ciclo"] or "X"}),
        ("/trazabilidad/equipo", {"equipo_id": d["equipo"], **anio}),
        ("/tablero", {}), ("/tablero", {"depositante_id": d["deposito"]}),
        ("/indicadores", anio), ("/indicadores", {**anio, "depositante_id": d["deposito"]}),
        ("/indicadores", {**anio, "equipo_id": d["equipo"]}), ("/indicadores", {**anio, "marca": "Michelin"}),
        ("/conciliacion", {}), ("/insumos/faltantes", {}), ("/novedades", {}),
        ("__/api/v1/tms/recogidas-reencauche", {}),
    ]


async def principal():
    d = await datos_reales()
    tok = token_de_herramienta(subject=1, esquema=ESQ, usuario="admin", cliente=CLIENTE)
    lentas, sin_tope, fallas = [], [], []
    from app.main import app
    declaradas = sorted({r.path for r in app.routes if getattr(r, "methods", None) and "GET" in r.methods
                         and r.path.startswith("/api/v1/reencauche")})
    medidas = set()
    async with httpx.AsyncClient(base_url=BASE, headers={"Authorization": "Bearer " + tok}, timeout=120) as c:
        # La primera petición al proceso paga el arranque (importaciones, caché de módulos): no cuenta.
        await c.get("/api/v1/reencauche/planta")
        for ruta, params in llamadas(d):
            url = ruta[2:] if ruta.startswith("__") else "/api/v1/reencauche" + ruta
            t0 = time.perf_counter()
            r = await c.get(url, params=params)
            dt = time.perf_counter() - t0
            filas = len(r.json()) if r.status_code == 200 and isinstance(r.json(), list) else None
            plantilla = next((p for p in declaradas if _coincide(p, url)), url)
            medidas.add(plantilla)
            marca = "LENTA" if dt > LIMITE_S else "     "
            print(f"{marca} {dt:6.2f} s  {r.status_code}  {url} {params if params else ''}"[:170]
                  + (f"  [{filas} filas{' · paginada' if 'x-total-count' in r.headers else ''}]" if filas is not None else ""))
            if r.status_code >= 400:
                fallas.append((url, r.status_code, r.text[:150]))
            if dt > LIMITE_S:
                lentas.append((url, dt))
            base = ruta.split("?")[0]
            if filas is not None and (filas > 1000 or (base not in CATALOGOS and "x-total-count" not in r.headers and filas > 200)):
                sin_tope.append((url, filas))
    faltan = [p for p in declaradas if p not in medidas and "/archivos/" not in p]
    print(f"\n{len(medidas)} rutas medidas de {len(declaradas)} declaradas.")
    if faltan:
        print("Sin medir:", ", ".join(faltan))
    print(f"Lentas (> {LIMITE_S:g} s): {lentas or 'ninguna'}")
    print(f"Listas sin tope: {sin_tope or 'ninguna'}")
    print(f"Fallas: {fallas or 'ninguna'}")
    return 1 if lentas or sin_tope or fallas else 0


def _coincide(plantilla: str, url: str) -> bool:
    a, b = plantilla.strip("/").split("/"), url.split("?")[0].strip("/").split("/")
    return len(a) == len(b) and all(x == y or x.startswith("{") for x, y in zip(a, b))


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
