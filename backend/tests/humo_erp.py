"""Prueba de humo del ERP contable, contra la app entera y por HTTP interno.

Va por la aplicación —no llamando a las funciones— porque lo que se quiere
comprobar acá es justamente lo que las pruebas de unidad no ven: que las
dependencias de permisos estén bien puestas, que los esquemas de Pydantic acepten
lo que la pantalla envía y que las rutas existan con el nombre que el frontend
usa.

La autenticación se sustituye por un usuario administrador de mentira. Es lo
único que se simula; todo lo demás —base de datos, motor contable, reglas— es el
de verdad.
"""
import asyncio
import os
import sys

os.environ.setdefault("SQLALCHEMY_ECHO", "0")

import httpx
from sqlalchemy import text

import app.main as m
from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user, require_admin
from app.infrastructure.models.usuario import Usuario

ESQUEMA = os.environ.get("ESQUEMA", "public")


class UsuarioFalso:
    id = 1
    username = "prueba"
    nombre = "Prueba de humo"
    rol_id = 1
    # `rol` es la columna de texto que usa el resto de la plataforma para
    # reconocer al administrador; sin ella el guardia de Finanzas no lo exime.
    rol = "ADMINISTRADOR"
    email = "prueba@local"
    activo = True


async def _db():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as s:
        await s.execute(text('SET search_path TO "%s"' % ESQUEMA))
        yield s


# El token es de verdad y va firmado con la clave de la instancia: hay una
# dependencia global que exige sesión en toda la API, y saltársela dejaría sin
# probar justamente el camino por el que pasan las peticiones reales.
from app.core.security import create_access_token
TOKEN = create_access_token(subject=1, esquema=ESQUEMA, usuario="prueba")

m.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso()
m.app.dependency_overrides[require_admin] = lambda: UsuarioFalso()
m.app.dependency_overrides[get_db] = _db

API = "/api/v1"
fallos = []


def revisar(nombre, r, esperado=(200, 201)):
    ok = r.status_code in esperado
    print(("  ok  " if ok else "FALLA ") + nombre + "  ->  " + str(r.status_code))
    if not ok:
        fallos.append(nombre)
        print("        " + r.text[:300])
    return r


async def principal():
    transporte = httpx.ASGITransport(app=m.app)
    async with httpx.AsyncClient(
        transport=transporte, base_url="http://local",
        headers={"Authorization": "Bearer " + TOKEN},
    ) as c:

        # ── Una empresa sobre la que trabajar ──
        r = await c.get(API + "/erp/empresas")
        revisar("GET  /erp/empresas", r)
        empresas = r.json() if r.status_code == 200 else []
        if empresas:
            eid = empresas[0]["id"]
            print("      usando la empresa existente %s" % eid)
        else:
            r = await c.post(API + "/erp/empresas", json={
                "nit": "900000001", "razon_social": "Empresa de humo",
                "pais": "Colombia", "moneda_base": "COP"})
            revisar("POST /erp/empresas", r)
            if r.status_code not in (200, 201):
                return
            eid = r.json()["id"]

        # ── Sembrar el núcleo ──
        revisar("POST /erp/contabilidad/sembrar",
                await c.post(API + "/erp/contabilidad/sembrar", params={"empresa_id": eid}))

        # ── Terceros ──
        revisar("GET  /erp/terceros/dv/890903938",
                await c.get(API + "/erp/terceros/dv/890903938"))
        r = await c.post(API + "/erp/terceros", json={
            "empresa_id": eid, "numero_identificacion": "800197268",
            "razon_social": "Tercero de humo", "es_cliente": True,
            "codigo_municipio": "05001", "responsabilidades": ["O-13"]})
        revisar("POST /erp/terceros", r, (200, 201, 409))
        revisar("GET  /erp/terceros",
                await c.get(API + "/erp/terceros", params={"empresa_id": eid}))

        # ── Períodos ──
        revisar("GET  /erp/contabilidad/periodos",
                await c.get(API + "/erp/contabilidad/periodos", params={"empresa_id": eid}))

        # ── Reglas ──
        rr = revisar("GET  /erp/contabilidad/reglas",
                     await c.get(API + "/erp/contabilidad/reglas", params={"empresa_id": eid}))
        if rr.status_code == 200:
            n = sum(len(e["reglas"]) for e in rr.json().get("eventos", []))
            print("      %d reglas contables sembradas" % n)
            if n == 0:
                fallos.append("la siembra no dejó reglas contables")

        revisar("GET  /erp/tributacion/reglas",
                await c.get(API + "/erp/tributacion/reglas",
                            params={"empresa_id": eid, "vigentes": False}))
        revisar("GET  /erp/tributacion/parametros",
                await c.get(API + "/erp/tributacion/parametros"))
        revisar("POST /erp/tributacion/simular",
                await c.post(API + "/erp/tributacion/simular",
                             params={"empresa_id": eid, "base": 5000000,
                                     "concepto": "Compras generales"}))

        # ── Una factura de verdad, que es lo que ejercita el motor ──
        import datetime
        hoy = datetime.date.today().isoformat()
        r = await c.post(API + "/erp/cxc/facturas", json={
            "empresa_id": eid, "numero": "HUMO-" + hoy.replace("-", ""),
            "cliente_nombre": "Cliente de humo", "fecha": hoy,
            "fecha_vencimiento": hoy, "lineas": [
                {"descripcion": "Servicio", "cantidad": 1,
                 "precio_unitario": 1000000, "descuento_pct": 0}]})
        revisar("POST /erp/cxc/facturas (genera asiento)", r, (200, 201, 409))

        # ── Libros ──
        revisar("GET  /erp/contabilidad/balance-comprobacion",
                await c.get(API + "/erp/contabilidad/balance-comprobacion",
                            params={"empresa_id": eid, "hasta": hoy}))
        revisar("GET  /erp/contabilidad/libro-diario",
                await c.get(API + "/erp/contabilidad/libro-diario",
                            params={"empresa_id": eid, "desde": hoy, "hasta": hoy}))
        revisar("GET  /erp/contabilidad/estado-situacion",
                await c.get(API + "/erp/contabilidad/estado-situacion",
                            params={"empresa_id": eid, "hasta": hoy}))
        r = revisar("GET  /erp/contabilidad/estado-resultados",
                    await c.get(API + "/erp/contabilidad/estado-resultados",
                                params={"empresa_id": eid,
                                        "desde": hoy[:4] + "-01-01", "hasta": hoy}))
        if r.status_code == 200:
            d = r.json()
            print("      ingresos %s · costos %s · gastos %s"
                  % (d.get("total_ingresos"), d.get("total_costos"), d.get("total_gastos")))

        revisar("GET  /erp/auditoria",
                await c.get(API + "/erp/auditoria", params={"empresa_id": eid}))
        revisar("GET  /erp/contabilidad/eventos",
                await c.get(API + "/erp/contabilidad/eventos", params={"empresa_id": eid}))

    print()
    if fallos:
        print("FALLARON %d:" % len(fallos))
        for f in fallos:
            print("  - " + f)
        sys.exit(1)
    print("todo bien")


asyncio.run(principal())
