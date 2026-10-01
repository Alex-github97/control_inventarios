"""Envía cada ruta de escritura (POST/PUT/PATCH/DELETE) con datos válidos y
reporta las que responden 5xx.

Corre contra una COPIA de la base (backend en :8001 sobre ci_pruebas_form):
lo que se crea, edita o borra acá no toca la base de desarrollo.

Un 4xx no es falla: es la ruta rechazando datos de relleno (un id que no
existe, una regla de negocio). Un 5xx sí: es el servidor rompiéndose con datos
que pasaron la validación, que es justo lo que vería un usuario al guardar.

Cómo correrlo (nunca contra la base de desarrollo ni producción):
    1. Copia de la base:  CREATE DATABASE ci_pruebas_form; pg_dump ... | psql -d ci_pruebas_form
    2. Backend sobre la copia, dentro de ci_backend:
       DATABASE_URL=<url con /ci_pruebas_form> uvicorn app.main:app --port 8001
    3. Opcional, para tener registros sobre los que actuar: los simuladores de
       backend/tools con el mismo DATABASE_URL.
    4. python tools/barrido_rutas_escritura.py <esquema>
    5. Borrar la base ci_pruebas_form.
Se saltan TarifaX (escribe archivos compartidos y llama servicios externos),
la consola de la plataforma y lo que reinicia o siembra datos.
"""
import asyncio, datetime as dt, enum, re, sys, typing, uuid
from collections import defaultdict

import httpx
from pydantic import BaseModel
from fastapi.routing import APIRoute

from app.main import app
from app.core.security import create_access_token

import os
B = os.environ.get("BASE", "http://127.0.0.1:8001")
ESQ = sys.argv[1] if len(sys.argv) > 1 else "public"
H = {"Authorization": "Bearer " + create_access_token(subject=1, cliente=ESQ, esquema=ESQ, usuario="admin")}
SALTAR = re.compile(r"/tarifax|/auth/|/plataforma|/gestion/|/soporte/agil|/landing|/demo|sembrar|/reset|"
                    r"restaurar|/logout|password|contrasena|clave|/scan-sessions/server-ip")
SUF = uuid.uuid4().hex[:6]


def valor(anot, nombre="", prof=0):
    """Un valor plausible para el tipo declarado."""
    origen = typing.get_origin(anot)
    args = typing.get_args(anot)
    if origen is typing.Union or str(origen) == "types.UnionType":
        no_nulos = [a for a in args if a is not type(None)]
        return valor(no_nulos[0], nombre, prof) if no_nulos else None
    if origen is typing.Literal:
        return args[0]
    if origen in (list, typing.List, set, tuple):
        if prof > 3:
            return []
        return [valor(args[0] if args else str, nombre, prof + 1)]
    if origen in (dict, typing.Dict):
        return {}
    if isinstance(anot, type):
        if issubclass(anot, BaseModel):
            return modelo(anot, prof + 1)
        if issubclass(anot, enum.Enum):
            return list(anot)[0].value
        if issubclass(anot, bool):
            return False
        if issubclass(anot, int):
            return 1
        if issubclass(anot, float):
            return 1.0
        if issubclass(anot, dt.datetime):
            return dt.datetime.now().replace(microsecond=0).isoformat()
        if issubclass(anot, dt.date):
            return dt.date.today().isoformat()
        if issubclass(anot, dt.time):
            return "10:00:00"
    n = nombre.lower()
    if "email" in n or "correo" in n:
        return f"prueba{SUF}@ejemplo.co"
    if "periodo" in n:
        return dt.date.today().strftime("%Y-%m")
    if "fecha" in n:
        return dt.date.today().isoformat()
    if "hora" in n:
        return "10:00"
    if "color" in n:
        return "#336699"
    if n in ("nit", "documento", "cedula", "identificacion"):
        return f"900{SUF[:5]}"
    return f"PRUEBA-{nombre[:10]}-{SUF}"


def modelo(m, prof=0):
    datos = {}
    for nombre, campo in m.model_fields.items():
        if prof > 4:
            break
        if campo.is_required() or prof == 0:
            v = valor(campo.annotation, nombre, prof)
            if v is not None:
                datos[campo.alias or nombre] = v
    return datos


def cuerpo(ruta: APIRoute):
    params = ruta.dependant.body_params
    if not params:
        return None, None
    archivos = [p for p in params if "UploadFile" in str(p.field_info.annotation) or "bytes" in str(p.field_info.annotation)]
    if archivos:
        datos = {p.alias: "PRUEBA" for p in params if p not in archivos}
        return "multipart", (datos, {p.alias: ("prueba.txt", b"contenido de prueba", "text/plain") for p in archivos})
    if len(params) == 1 and not getattr(params[0].field_info, "embed", False):
        return "json", valor(params[0].field_info.annotation, params[0].alias)
    return "json", {p.alias: valor(p.field_info.annotation, p.alias) for p in params}


def consulta(ruta: APIRoute):
    q = {}
    for p in ruta.dependant.query_params:
        if p.required:
            q[p.alias] = valor(p.field_info.annotation, p.alias)
    return q


def primer_id(datos):
    if isinstance(datos, dict):
        for k in ("items", "data", "resultados", "registros"):
            if isinstance(datos.get(k), list):
                datos = datos[k]
                break
    if isinstance(datos, list) and datos and isinstance(datos[0], dict):
        return datos[0].get("id")
    return None


async def listado(c, prefijo, ids):
    """El primer id del listado en `prefijo` (con o sin barra final), con caché."""
    for p in (prefijo, prefijo + "/"):
        if p in ids:
            if ids[p] is not None:
                return ids[p]
            continue
        try:
            g = await c.get(p)
            ids[p] = primer_id(g.json()) if g.status_code == 200 else None
        except Exception:  # noqa: BLE001
            ids[p] = None
        if ids[p] is not None:
            return ids[p]
    return None


async def resolver(c, ruta, ids):
    """Sustituye cada {param} por un id real del listado que lo precede."""
    url = ruta
    while "{" in url:
        i = url.index("{")
        prefijo = url[:i].rstrip("/")
        idv = await listado(c, prefijo, ids)
        if idv is None:
            return None
        url = url[:i] + str(idv) + url[url.index("}", i) + 1:]
    return url


async def main():
    rutas = [r for r in app.routes if isinstance(r, APIRoute) and r.path.startswith("/api/")
             and not SALTAR.search(r.path)]
    escrituras = [(m, r) for r in rutas for m in r.methods if m in ("POST", "PUT", "PATCH", "DELETE")]
    orden = {"POST": 0, "PUT": 1, "PATCH": 1, "DELETE": 2}
    escrituras.sort(key=lambda x: (orden[x[0]], "{" in x[1].path, x[1].path))
    ids = {}
    fallas, codigos, sin_id = [], defaultdict(int), 0
    async with httpx.AsyncClient(base_url=B, headers=H, timeout=90) as c:
        # ids reales para las rutas con {id}: el primero del listado hermano
        for r in rutas:
            if "GET" in r.methods and "{" not in r.path:
                try:
                    g = await c.get(r.path)
                    if g.status_code == 200:
                        ids[r.path] = primer_id(g.json())
                except Exception:  # noqa: BLE001
                    pass
        for metodo, r in escrituras:
            url = await resolver(c, r.path, ids)
            if url is None:
                sin_id += 1
                continue
            tipo, datos = cuerpo(r)
            kw = {"params": consulta(r)}
            if tipo == "json":
                kw["json"] = datos
            elif tipo == "multipart":
                kw["data"], kw["files"] = datos
            try:
                resp = await c.request(metodo, url, **kw)
            except Exception as e:  # noqa: BLE001
                fallas.append((metodo, url, "EXC", str(e)[:150]))
                continue
            codigos[resp.status_code] += 1
            if resp.status_code >= 500:
                fallas.append((metodo, url, resp.status_code, resp.text[:150]))
            elif metodo == "POST" and resp.status_code in (200, 201) and "{" not in r.path:
                try:
                    nuevo = resp.json().get("id")
                    if nuevo and ids.get(r.path) is None:
                        ids[r.path] = nuevo
                except Exception:  # noqa: BLE001
                    pass
    print(f"esquema {ESQ}: {len(escrituras)} rutas de escritura · {sum(codigos.values())} enviadas · {sin_id} sin id")
    print("codigos:", dict(sorted(codigos.items())))
    print(f"FALLAS 5xx: {len(fallas)}")
    for f in fallas:
        print("  ", f[0], f[1], f[2], str(f[3]).replace("\n", " ")[:120])

asyncio.run(main())
