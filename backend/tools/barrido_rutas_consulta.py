"""Llama cada ruta GET del servidor y reporta las que fallan (5xx).

    BASE=http://localhost:8000 python tools/barrido_rutas_consulta.py <esquema>


Las rutas con parámetros de ruta se llaman con un id real tomado del listado
hermano cuando existe (/x/{id} ← primer elemento de /x).
"""
import asyncio, re, sys, json

import httpx
from app.core.security import create_access_token

import os
B = os.environ.get("BASE", "http://localhost:8000")
ESQ = sys.argv[1] if len(sys.argv) > 1 else "public"
H = {"Authorization": "Bearer " + create_access_token(subject=1, cliente=ESQ, esquema=ESQ, usuario="admin")}
SALTAR = re.compile(r"/download|/descargar|/exportar|/pdf|/excel|/stream|/ws|/scan-sessions/server-ip|/archivo")


def primer_id(datos):
    if isinstance(datos, dict):
        for k in ("items", "data", "resultados", "registros"):
            if isinstance(datos.get(k), list):
                datos = datos[k]
                break
    if isinstance(datos, list) and datos and isinstance(datos[0], dict):
        return datos[0].get("id")
    return None


async def main():
    async with httpx.AsyncClient(base_url=B, headers=H, timeout=60) as c:
        from app.main import app
        rutas = sorted({r.path for r in app.routes
                        if getattr(r, "methods", None) and "GET" in r.methods and r.path.startswith("/api/")})
        listados = {}
        fallas, sin_id, ok, otras = [], 0, 0, {}
        simples = [p for p in rutas if "{" not in p]
        for p in simples:
            if SALTAR.search(p):
                continue
            try:
                r = await c.get(p)
            except Exception as e:  # noqa: BLE001
                fallas.append((p, "EXC", str(e)[:120])); continue
            if r.status_code >= 500:
                fallas.append((p, r.status_code, r.text[:160]))
            else:
                ok += 1
                otras[r.status_code] = otras.get(r.status_code, 0) + 1
                if r.status_code == 200:
                    try:
                        listados[p] = primer_id(r.json())
                    except ValueError:
                        pass
        for p in rutas:
            if "{" not in p or SALTAR.search(p):
                continue
            base = p.split("/{")[0]
            if p.count("{") != 1 or not p.endswith("}") and "/{" not in p:
                pass
            idv = listados.get(base)
            if idv is None:
                sin_id += 1
                continue
            url = re.sub(r"\{[^}]+\}", str(idv), p, count=1)
            if "{" in url:
                sin_id += 1
                continue
            try:
                r = await c.get(url)
            except Exception as e:  # noqa: BLE001
                fallas.append((url, "EXC", str(e)[:120])); continue
            if r.status_code >= 500:
                fallas.append((url, r.status_code, r.text[:160]))
            else:
                ok += 1
                otras[r.status_code] = otras.get(r.status_code, 0) + 1
        print(f"esquema {ESQ}: {len(rutas)} rutas GET · {ok} respondieron · {sin_id} sin id para probar")
        print("codigos:", dict(sorted(otras.items())))
        print(f"FALLAS 5xx: {len(fallas)}")
        for f in fallas:
            print("  ", f[0], f[1], f[2].replace("\n", " "))

asyncio.run(main())
