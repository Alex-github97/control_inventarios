"""Mide cuánto tarda cada ruta GET y lista las más lentas.

    BASE=http://localhost:8000 PYTHONPATH=/app python tools/medir_rutas_consulta.py cli_<empresa> [prefijo ...]

Sin prefijos mide todas; con ellos, solo las que empiecen por alguno
(«/api/v1/eam»). Las rutas con un parámetro se llaman con un id real tomado del
listado hermano, como en `barrido_rutas_consulta.py`. Es solo lectura.
"""
import asyncio, os, re, sys, time

import httpx
from app.core.sesiones import token_de_herramienta

B = os.environ.get("BASE", "http://localhost:8000")
ESQ = sys.argv[1] if len(sys.argv) > 1 else "public"
PREFIJOS = tuple(sys.argv[2:])
TOPE = float(os.environ.get("TOPE_S", "120"))
H = {"Authorization": "Bearer " + token_de_herramienta(subject=1, cliente=ESQ, esquema=ESQ, usuario="admin")}
SALTAR = re.compile(r"/stream|/ws|/scan-sessions/server-ip|/health")


def primer_id(datos):
    if isinstance(datos, dict):
        for k in ("items", "data", "resultados", "registros", "filas"):
            if isinstance(datos.get(k), list):
                datos = datos[k]
                break
    if isinstance(datos, list) and datos and isinstance(datos[0], dict):
        return datos[0].get("id")
    return None


async def main():
    from app.main import app
    rutas = sorted({r.path for r in app.routes
                    if getattr(r, "methods", None) and "GET" in r.methods and r.path.startswith("/api/")
                    and (not PREFIJOS or r.path.startswith(PREFIJOS)) and not SALTAR.search(r.path)})
    medidas, listados = [], {}
    async with httpx.AsyncClient(base_url=B, headers=H, timeout=TOPE) as c:
        async def medir(url, plantilla):
            t = time.perf_counter()
            try:
                r = await c.get(url)
                codigo, peso = r.status_code, len(r.content)
            except Exception as e:  # noqa: BLE001
                r, codigo, peso = None, type(e).__name__, 0
            medidas.append((time.perf_counter() - t, codigo, peso, plantilla))
            return r
        for p in rutas:
            if "{" in p:
                continue
            r = await medir(p, p)
            if r is not None and r.status_code == 200 and "json" in r.headers.get("content-type", ""):
                try:
                    listados[p] = primer_id(r.json())
                except ValueError:
                    pass
        for p in rutas:
            if p.count("{") != 1:
                continue
            idv = listados.get(p.split("/{")[0])
            if idv is not None:
                await medir(re.sub(r"\{[^}]+\}", str(idv), p), p)
    medidas.sort(reverse=True, key=lambda m: m[0] if isinstance(m[0], float) else 0)
    print(f"esquema {ESQ}: {len(medidas)} llamadas de {len(rutas)} rutas GET")
    print(f"  {sum(1 for m in medidas if m[0] >= 1)} tardan 1 s o más · {sum(1 for m in medidas if m[2] >= 1_000_000)} pesan 1 MB o más")
    for seg, codigo, peso, p in medidas[:int(os.environ.get('CUANTAS', '45'))]:
        print(f"{seg:8.2f} s  {codigo}  {peso/1024:9.0f} KB  {p}")
    print("-- más pesadas")
    for seg, codigo, peso, p in sorted(medidas, key=lambda m: -m[2])[:15]:
        print(f"{peso/1024:9.0f} KB  {seg:6.2f} s  {p}")


asyncio.run(main())
