"""Prueba de humo de los tableros de llantas, con datos de resultado conocido.

Crea llantas con marcas de prueba (prefijo ZZPRUEBA), consulta los tableros
filtrando por esas marcas —así el resto de la empresa no interviene— y compara
contra las cifras de los escenarios de la especificación. Al terminar borra todo
lo que creó, falle o no.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_neumaticos_tableros.py
    docker exec -w /app -e PYTHONPATH=/app -e ESQUEMA=cli_carga ci_backend python tests/humo_neumaticos_tableros.py
"""
import asyncio
import os
import sys
from datetime import date, datetime

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import delete, select, text

import app.main as m
from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.sesiones import token_de_herramienta
from app.infrastructure.models.eam import (
    EAMDanoNeumaticoCatalogo, EAMInspeccionNeumatico, EAMMotivoFinVida, EAMMovimientoNeumatico,
    EAMNeumatico, EAMVidaNeumatico,
)

ESQUEMA = os.environ.get("ESQUEMA", "cli_acme")
A, B = "ZZPRUEBA-A", "ZZPRUEBA-B"


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


m.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso()
m.app.dependency_overrides[require_admin] = lambda: UsuarioFalso()
m.app.dependency_overrides[get_db] = _db
TOKEN = token_de_herramienta(subject=1, esquema=ESQUEMA, usuario="prueba")
API = "/api/v1"

fallos = []


def comprobar(cond, texto):
    print(("  ok  " if cond else "FALLA ") + texto)
    if not cond:
        fallos.append(texto)


async def sembrar(s):
    """Las llantas de los escenarios. Devuelve los ids de los catálogos creados."""
    d1 = EAMDanoNeumaticoCatalogo(codigo="ZZ-COR", nombre="ZZ Corte en costado", activo=True)
    d2 = EAMDanoNeumaticoCatalogo(codigo="ZZ-DES", nombre="ZZ Desgaste normal", activo=True)
    mf = EAMMotivoFinVida(nombre="ZZ Daño irreparable", activo=True)
    s.add_all([d1, d2, mf])
    await s.flush()
    n = 0

    def llanta(marca, ref, estado, reenc, **kw):
        nonlocal n
        n += 1
        x = EAMNeumatico(codigo=f"ZZP-{n:04d}", marca=marca, referencia=ref, medida=kw.pop("medida", "295/80R22.5"),
                         estado=estado, reencauches=reenc, **kw)
        s.add(x)
        return x

    # Pila de descarte de la marca A: 10 bajas, 4 nuevas, 3 con un reencauche,
    # 2 con dos y 1 con tres (I.R. 1,0). Daños: 4 corte, 3 desgaste, 3 sin daño.
    reencs = [0, 0, 0, 0, 1, 1, 1, 2, 2, 3]
    danos = [d1.id] * 4 + [d2.id] * 3 + [None] * 3
    for i, (r, d) in enumerate(zip(reencs, danos)):
        llanta(A, "XA1" if i < 6 else "XA2", "BAJA", r, dano_id=d,
               motivo_fin_vida_id=mf.id if d == d1.id else None,
               fecha_baja=date(2025, 1 if i < 5 else 2, 10), dot="DOT X 2321")
    # Marca B: 2 bajas por corte, una con DOT inválido; referencia «XA1» igual que en A.
    llanta(B, "XA1", "BAJA", 0, dano_id=d1.id, fecha_baja=date(2025, 2, 3), dot="DOT X 6721")
    llanta(B, "XB1", "BAJA", 1, dano_id=d1.id, fecha_baja=date(2025, 2, 4), dot="DOT X 0119")
    # Parque montado de la marca A: 10 montadas, 5 nuevas, 3 con uno y 2 con dos
    # (I.R. 0,7); 2 bajo el mínimo. Una reencauchada en bodega que no cuenta.
    for i, r in enumerate([0, 0, 0, 0, 0, 1, 1, 1, 2, 2]):
        llanta(A, "XA1", "INSTALADO", r, profundidad_actual=2.0 if i < 2 else 12.0, medida="11R22.5" if i == 0 else "295/80R22.5")
    llanta(A, "XA1", "ALMACENADO", 2, profundidad_actual=15.0)
    # Histórico: una llanta con 14 inspecciones y 3 rotaciones (2 de posición y
    # un volteo), de las cuales 5 inspecciones y 1 rotación son de su vida
    # actual, que empezó el 1 de junio. Un desmontaje y un montaje no cuentan.
    hist = llanta(B, "XB1", "INSTALADO", 1, profundidad_actual=10.0)
    nueva = llanta(B, "XB1", "ALMACENADO", 0)
    await s.flush()
    s.add_all([EAMVidaNeumatico(neumatico_id=hist.id, numero_vida=1, tipo="NUEVA", fecha_inicio=datetime(2025, 1, 1),
                                fecha_fin=datetime(2025, 5, 20)),
               EAMVidaNeumatico(neumatico_id=hist.id, numero_vida=2, tipo="REENCAUCHADA", fecha_inicio=datetime(2025, 6, 1))])
    fechas = [datetime(2025, 1 + i // 2, 5 + (i % 2) * 10) for i in range(9)] +              [datetime(2025, 6, 3 + 5 * i) for i in range(5)]   # 9 antes de junio y 5 después
    for f in fechas:
        s.add(EAMInspeccionNeumatico(neumatico_id=hist.id, fecha=f))
    for tipo, mes in (("ROTACION", 3), ("VOLTEO", 4), ("DESMONTAJE", 5), ("INSTALACION", 6), ("ROTACION", 7)):
        s.add(EAMMovimientoNeumatico(neumatico_id=hist.id, tipo_movimiento=tipo, fecha=datetime(2025, mes, 2)))
    s.info["zz_hist"], s.info["zz_nueva"] = hist.id, nueva.id
    await s.commit()
    return d1.id, d2.id, mf.id


async def limpiar(s):
    ids = select(EAMNeumatico.id).where(EAMNeumatico.codigo.like("ZZP-%"))
    await s.execute(delete(EAMInspeccionNeumatico).where(EAMInspeccionNeumatico.neumatico_id.in_(ids)))
    await s.execute(delete(EAMMovimientoNeumatico).where(EAMMovimientoNeumatico.neumatico_id.in_(ids)))
    await s.execute(delete(EAMVidaNeumatico).where(EAMVidaNeumatico.neumatico_id.in_(ids)))
    await s.execute(delete(EAMNeumatico).where(EAMNeumatico.codigo.like("ZZP-%")))
    await s.execute(delete(EAMDanoNeumaticoCatalogo).where(EAMDanoNeumaticoCatalogo.codigo.like("ZZ-%")))
    await s.execute(delete(EAMMotivoFinVida).where(EAMMotivoFinVida.nombre.like("ZZ %")))
    await s.commit()


async def principal():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as s:
        await s.execute(text('SET search_path TO "%s"' % ESQUEMA))
        await limpiar(s)
        try:
            d1, d2, mf = await sembrar(s)
            dot = (await s.execute(select(EAMNeumatico.dot_semana, EAMNeumatico.dot_anio)
                                   .where(EAMNeumatico.codigo == "ZZP-0001"))).one()
            comprobar(tuple(dot) == (23, 2021), f"el DOT se interpreta al guardar ({tuple(dot)})")
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=m.app), base_url="http://local",
                                         headers={"Authorization": "Bearer " + TOKEN}) as c:
                await probar(c, d1, d2, mf)
                await probar_historial(c, s.info["zz_hist"], s.info["zz_nueva"])
                await probar_reglas(c)
        finally:
            await limpiar(s)
    print()
    print(f"Esquema {ESQUEMA}: {len(fallos)} fallas.")
    return 1 if fallos else 0


async def probar(c, d1, d2, mf):
    get = lambda ruta, **p: c.get(API + ruta, params=p)  # noqa: E731

    # ── Opciones de filtro ──
    r = (await get("/eam/neumaticos/reportes/opciones-filtro", alcance="BAJA", marca=[A])).json()
    refs = {o["valor"] for o in r["referencias"]}
    comprobar(refs == {f"{A} · XA1", f"{A} · XA2"}, f"referencias según la marca ({sorted(refs)})")
    comprobar(any(o["valor"] == 0 for o in r["anios"]), "el filtro de año ofrece «Sin DOT válido»")

    # ── Tablero de descarte ──
    t = (await get("/eam/neumaticos/reportes/descarte", marca=[A])).json()
    comprobar(t["total"] == 10, f"descarte de A: 10 bajas ({t['total']})")
    comprobar(t["ir"]["ir"] == 1.0, f"I.R. del descarte = 1,0 ({t['ir']['ir']})")
    dist = {x["reencauches"]: x["cantidad"] for x in t["ir"]["distribucion"]}
    comprobar(dist == {0: 4, 1: 3, 2: 2, 3: 1}, f"distribución 4-3-2-1 ({dist})")
    rep = {x["nombre"]: x["porcentaje"] for x in t["por_dano"]}
    comprobar(rep == {"ZZ Corte en costado": 40.0, "ZZ Desgaste normal": 30.0, "Sin motivo registrado": 30.0},
              f"reparto por daño 40/30/30 con «Sin motivo registrado» ({rep})")
    fin = {x["nombre"]: x["cantidad"] for x in t["por_motivo_fin"]}
    comprobar(fin.get("ZZ Daño irreparable") == 4, f"los dos catálogos se cuentan aparte ({fin})")
    meses = {x["mes"]: x["total"] for x in t["mensual"]}
    comprobar(meses == {"2025-01": 5, "2025-02": 5}, f"serie mensual ({meses})")

    t = (await get("/eam/neumaticos/reportes/descarte", marca=[A, B])).json()
    cortes = {x["categoria"]: x["por_dano"].get(str(d1), 0) for x in t["por_marca"]}
    comprobar(cortes == {A: 4, B: 2}, f"cruce marca × daño ({cortes})")
    refs = {x["categoria"] for x in t["por_referencia"]}
    comprobar({f"{A} · XA1", f"{B} · XA1"} <= refs, "la misma referencia en dos marcas sale separada")

    t = (await get("/eam/neumaticos/reportes/descarte", marca=[B], anio_fabricacion=[0])).json()
    comprobar(t["total"] == 1, f"filtro «Sin DOT válido» (1 = {t['total']})")
    t = (await get("/eam/neumaticos/reportes/descarte", marca=[B], anio_fabricacion=[2019])).json()
    comprobar(t["total"] == 1, f"filtro por año de fabricación 2019 (1 = {t['total']})")

    # ── Del tablero a la lista ──
    r = await get("/eam/neumaticos/descarte", marca=[A], dano_id=d1, limite=5)
    comprobar(r.headers.get("x-total-count") == "4" and len(r.json()) == 4,
              f"la lista de descarte por daño cuadra con el tablero (4 = {r.headers.get('x-total-count')})")
    r = await get("/eam/neumaticos/descarte", marca=[A], dano_id=0)
    comprobar(r.headers.get("x-total-count") == "3", "la lista sin daño registrado cuadra con el tablero")
    r = await get("/eam/neumaticos/descarte", referencia=[f"{B} · XA1"])
    comprobar(r.headers.get("x-total-count") == "1", "la lista por referencia no mezcla marcas")

    # ── Rendimiento con el filtro común ──
    r = (await get("/eam/neumaticos/reportes/rendimiento", marca=[A, B], km_minimo=0)).json()
    comprobar(r["resumen"]["llantas"] == 25, f"rendimiento filtrado por marca: 25 llantas ({r['resumen']['llantas']})")
    dims = {d["clave"]: {g["categoria"] for g in d["grupos"]} for d in r["dimensiones"]}
    comprobar({"marca", "referencia", "medida"} <= set(dims), "rendimiento trae marca, referencia y dimensión a la vez")
    comprobar({f"{A} · XA1", f"{B} · XA1"} <= dims.get("referencia", set()),
              "en rendimiento la referencia se rotula «Marca · Referencia»")
    r = (await get("/eam/neumaticos/reportes/rendimiento", marca=[A], medida=["11R22.5"], km_minimo=0)).json()
    comprobar(r["resumen"]["llantas"] == 1, f"rendimiento filtrado por dimensión ({r['resumen']['llantas']})")

    # ── Parque montado ──
    p = (await get("/eam/neumaticos/reportes/parque", marca=[A])).json()
    comprobar(p["llantas"] == 10, f"parque de A: 10 montadas, la de bodega no cuenta ({p['llantas']})")
    comprobar(p["ir"]["ir"] == 0.7, f"I.R. a piso = 0,7 ({p['ir']['ir']})")
    comprobar(p["bajo_minimo"] == 2, f"2 bajo el mínimo ({p['bajo_minimo']})")
    med = {x["categoria"]: x["llantas"] for x in p["por_medida"]}
    comprobar(med == {"295/80R22.5": 9, "11R22.5": 1}, f"parque por dimensión ({med})")
    p = (await get("/eam/neumaticos/reportes/parque", marca=[A], medida=["11R22.5"])).json()
    comprobar(p["llantas"] == 1 and p["ir"]["ir"] == 0.0, "el filtro de dimensión se aplica a todo el parque")



async def probar_historial(c, hist, nueva):
    h = (await c.get(f"{API}/eam/neumaticos/{hist}/resumen-historial")).json()
    comprobar((h["inspecciones"], h["inspecciones_vida"]) == (14, 5),
              f"14 inspecciones, 5 en esta vida ({h['inspecciones']}, {h['inspecciones_vida']})")
    comprobar((h["rotaciones"], h["rotaciones_vida"]) == (3, 1),
              f"3 rotaciones, 1 en esta vida ({h['rotaciones']}, {h['rotaciones_vida']})")
    comprobar((h["rotaciones_posicion"], h["volteos"]) == (2, 1), "rotaciones: 2 de posición y 1 volteo")
    comprobar(h["ultima_rotacion"] and h["ultima_rotacion"].startswith("2025-07-02"), "fecha de la última rotación")
    h = (await c.get(f"{API}/eam/neumaticos/{nueva}/resumen-historial")).json()
    comprobar(h["inspecciones"] == 0 and h["rotaciones"] == 0 and h["ultima_inspeccion"] is None,
              "llanta nueva: 0 inspecciones y 0 rotaciones, sin fecha")



async def probar_reglas(c):
    r = (await c.get(f"{API}/eam/neumaticos/sugerencias/reglas")).json()
    nombres = {x["nombre"] for x in r}
    comprobar({"Retirar por profundidad mínima", "Ajustar presión", "Revisar alineación o rotar"} <= nombres,
              "la empresa tiene las tres reglas iniciales")
    mala = {"nombre": "ZZ mala", "tipo": "OTRO", "prioridad": 3, "texto": "x",
            "condiciones": [{"campo": "inventado", "operador": "=", "valor": "1"}]}
    r = await c.post(f"{API}/eam/neumaticos/sugerencias/reglas", json=mala)
    comprobar(r.status_code == 422, f"una condición con un campo desconocido se rechaza ({r.status_code})")
    buena = {"nombre": "ZZ Reencauchar", "tipo": "REENCAUCHE", "prioridad": 1,
             "texto": "Programar reencauche de la posición {posicion} ({profundidad} mm)",
             "condiciones": [{"campo": "profundidad_minima", "operador": "<=", "valor": "4"},
                             {"campo": "vida", "operador": "!=", "valor": "r3"}]}
    r = await c.post(f"{API}/eam/neumaticos/sugerencias/vista-previa", json=buena)
    comprobar(r.status_code == 200 and "llantas_cumplen" in r.json(), f"vista previa de la regla ({r.status_code})")
    r = await c.post(f"{API}/eam/neumaticos/sugerencias/reglas", json=buena)
    comprobar(r.status_code == 201 and r.json()["condiciones"][1]["valor"] == "R3", "crear regla (texto en mayúsculas)")
    rid = r.json()["id"]
    r = await c.put(f"{API}/eam/neumaticos/sugerencias/reglas/{rid}", json={**buena, "activa": False})
    comprobar(r.status_code == 200 and r.json()["activa"] is False, "desactivar regla")
    r = await c.delete(f"{API}/eam/neumaticos/sugerencias/reglas/{rid}")
    comprobar(r.status_code == 204, "borrar regla")


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
