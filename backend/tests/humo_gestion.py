"""Prueba de humo de las pantallas de gestión, contra datos con volumen.

Estas rutas no existían o devolvían constantes. Lo que se comprueba acá no es
que respondan 200 —eso ya lo diría cualquier maqueta— sino que las cifras vengan
del mayor: que la ejecución de un centro de costo no sea cero, que el margen de
un proyecto no sea del 100%, que el forecast tenga meses con movimiento.

Se corre contra la base sembrada con volumen; sin datos no probaría nada.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import text

import app.main as m
from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.security import create_access_token

ESQUEMA = os.environ.get("ESQUEMA", "public")


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


TOKEN = create_access_token(subject=1, esquema=ESQUEMA, usuario="prueba")
m.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso()
m.app.dependency_overrides[require_admin] = lambda: UsuarioFalso()
m.app.dependency_overrides[get_db] = _db

API = "/api/v1"
fallos = []


def revisar(nombre, r, comprobar=None, esperado=(200, 201)):
    ok = r.status_code in esperado
    nota = ""
    if ok and comprobar:
        try:
            nota = comprobar(r.json()) or ""
        except Exception as e:                                  # noqa: BLE001
            ok, nota = False, f"{type(e).__name__}: {e}"
        if nota.startswith("¡"):
            ok = False
    print(("  ok  " if ok else "FALLA ") + nombre + "  ->  " + str(r.status_code)
          + ("  " + nota if nota else ""))
    if not ok:
        fallos.append(nombre)
        if r.status_code not in esperado:
            print("        " + r.text[:250])
    return r


async def principal():
    transporte = httpx.ASGITransport(app=m.app)
    async with httpx.AsyncClient(
        transport=transporte, base_url="http://local",
        headers={"Authorization": "Bearer " + TOKEN}, timeout=60.0,
    ) as c:

        eid = (await c.get(API + "/erp/empresas")).json()[0]["id"]
        print(f"empresa {eid}, esquema {ESQUEMA}\n")

        # ── Costeo ──
        def _centros(d):
            centros = d["centros"]
            con_gasto = [x for x in centros if x["ejecutado"] > 0]
            if not con_gasto:
                return "¡ningún centro tiene ejecución: sigue saliendo cero!"
            return (f"{len(con_gasto)}/{len(centros)} con ejecución, "
                    f"total {d['total_ejecutado']:,.0f}")
        revisar("GET  /erp/costeo/centros",
                await c.get(API + "/erp/costeo/centros"), _centros)

        def _inductores(d):
            if not d:
                return "¡no hay inductores sembrados!"
            con_costo = [i for i in d if i["costo_unitario"]]
            return f"{len(d)} inductores, {len(con_costo)} con costo unitario"
        revisar("GET  /erp/costeo/inductores",
                await c.get(API + "/erp/costeo/inductores"), _inductores)

        # ── Proyectos ──
        def _proyectos(d):
            if not d:
                return "sin proyectos"
            medibles = [p for p in d if p["medible"]]
            con_margen = [p for p in d if p["margen_pct"] is not None]
            return (f"{len(d)} proyectos, {len(medibles)} medibles, "
                    f"{len(con_margen)} con margen")
        revisar("GET  /erp/proyectos/rentabilidad-real",
                await c.get(API + "/erp/proyectos/rentabilidad-real"), _proyectos)

        # ── EPM ──
        def _planes(d):
            return f"{len(d)} planes" if d else "¡sin planes: no hay presupuestos!"
        revisar("GET  /erp/epm/planes",
                await c.get(API + "/erp/epm/planes"), _planes)

        def _forecast(d):
            con_dato = [x for x in d if x["ingresos_real"] > 0]
            if not con_dato:
                return "¡ningún mes con ingresos reales!"
            return f"{len(con_dato)}/{len(d)} meses con movimiento"
        revisar("GET  /erp/epm/forecast",
                await c.get(API + "/erp/epm/forecast", params={"meses": 24}),
                _forecast)

        def _simular(d):
            base = d["base"]["ingresos"]
            if base <= 0:
                return "¡la base es cero!"
            return (f"base {base:,.0f}; "
                    + ", ".join(f"{e['nombre']} {e['ebitda_pct']:.1f}%"
                                for e in d["escenarios"]))
        revisar("POST /erp/epm/simular",
                await c.post(API + "/erp/epm/simular", json={
                    "crecimientos": [
                        {"nombre": "Base", "pct": 5},
                        {"nombre": "Optimista", "pct": 15},
                        {"nombre": "Pesimista", "pct": -5},
                    ]}), _simular)

        revisar("GET  /erp/epm/escenarios",
                await c.get(API + "/erp/epm/escenarios"),
                lambda d: f"{len(d)} escenarios guardados")

        # ── Activos ──
        activos = (await c.get(API + "/erp/activos")).json()
        if activos:
            aid = activos[0]["id"]
            def _schedule(d):
                if not d:
                    return "¡cronograma vacío!"
                ultimo = d[-1]
                return (f"{len(d)} cuotas, termina en "
                        f"{ultimo['valor_libro']:,.0f} de valor en libros")
            revisar(f"GET  /erp/activos/{aid}/schedule",
                    await c.get(API + f"/erp/activos/{aid}/schedule"), _schedule)

        # ── Presupuestos ──
        presupuestos = (await c.get(API + "/erp/presupuestos")).json()
        def _pres(d):
            if not d:
                return "sin presupuestos"
            con_ejec = [p for p in d if p.get("total_ejecutado", 0) > 0]
            if not con_ejec:
                return "¡ninguno tiene ejecución: sigue en cero!"
            return f"{len(con_ejec)}/{len(d)} con ejecución real"
        revisar("GET  /erp/presupuestos",
                await c.get(API + "/erp/presupuestos"), _pres)

        if presupuestos:
            pid = presupuestos[0]["id"]
            def _ejec(d):
                con = [l for l in d["lineas"] if l["ejecutado"]]
                return (f"{len(con)}/{len(d['lineas'])} líneas con ejecución; "
                        f"presupuestado {d['total_presupuestado']:,.0f}, "
                        f"ejecutado {d['total_ejecutado']:,.0f}")
            revisar(f"GET  /erp/presupuestos/{pid}/ejecucion",
                    await c.get(API + f"/erp/presupuestos/{pid}/ejecucion"), _ejec)

        # ── Conciliación ──
        cuentas = (await c.get(API + "/erp/tesoreria/cuentas")).json()
        if cuentas:
            cbid = cuentas[0]["id"]
            def _conc(d):
                if d["sin_conciliar"] == 0:
                    return "no hay nada sin conciliar"
                pct = d["con_propuesta"] * 100 // max(1, d["sin_conciliar"])
                return (f"{d['sin_conciliar']} sin conciliar, "
                        f"{d['con_propuesta']} con pareja ({pct}%), "
                        f"{d['ambiguos']} ambiguos")
            revisar("GET  /erp/tesoreria/conciliacion",
                    await c.get(API + "/erp/tesoreria/conciliacion",
                                params={"cuenta_id": cbid, "desde": "2024-01-01",
                                        "hasta": "2026-12-31"}), _conc)

        # ── Consolidación ──
        revisar("GET  /erp/consolidacion",
                await c.get(API + "/erp/consolidacion",
                            params={"desde": "2026-01-01", "hasta": "2026-12-31"}),
                lambda d: (f"{len(d['empresas'])} empresa(s), "
                           f"eliminación {d['eliminacion_ingresos']:,.0f}"))

    print()
    if fallos:
        print("FALLARON %d:" % len(fallos))
        for f in fallos:
            print("  - " + f)
        sys.exit(1)
    print("todo bien")


asyncio.run(principal())
