"""Vuelca la especificación OpenAPI de la API a un archivo, sin levantar el servidor.

    python tools/volcar_openapi.py ../frontend/compartido/api/.openapi.json

Por defecto deja solo lo que usa la app móvil —el CMMS (`/eam`), el acceso
(`/auth`) y lo propio de la app (`/movil`)— y los esquemas que esas rutas
referencian: la API entera son más de 1.500 rutas y 4 MB de tipos. Con
`--todo` vuelca la API completa.

De ahí `npm run tipos-api` (en frontend/) genera `compartido/api/esquema.d.ts`.
El despliegue lo corre para verificar que el archivo generado esté al día.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DEBUG", "false")

from app.main import app  # noqa: E402

PREFIJOS = ("/api/v1/eam", "/api/v1/auth", "/api/v1/movil")


def referencias(nodo, salida: set):
    if isinstance(nodo, dict):
        ref = nodo.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            salida.add(ref.rsplit("/", 1)[1])
        for v in nodo.values():
            referencias(v, salida)
    elif isinstance(nodo, list):
        for v in nodo:
            referencias(v, salida)


def recortar(spec: dict) -> dict:
    spec["paths"] = {p: v for p, v in spec["paths"].items() if p.startswith(PREFIJOS)}
    esquemas = spec.get("components", {}).get("schemas", {})
    usados: set = set()
    referencias(spec["paths"], usados)
    pendientes = list(usados)
    while pendientes:       # los esquemas que referencian otros esquemas
        nuevo: set = set()
        referencias(esquemas.get(pendientes.pop(), {}), nuevo)
        for n in nuevo - usados:
            usados.add(n)
            pendientes.append(n)
    spec["components"]["schemas"] = {k: v for k, v in esquemas.items() if k in usados}
    return spec


argumentos = [a for a in sys.argv[1:] if not a.startswith("--")]
destino = argumentos[0] if argumentos else "openapi.json"
spec = app.openapi()
if "--todo" not in sys.argv:
    spec = recortar(json.loads(json.dumps(spec)))
with open(destino, "w", encoding="utf-8") as f:
    json.dump(spec, f, ensure_ascii=False, indent=1, sort_keys=True)
print(f"OpenAPI: {len(spec['paths'])} rutas, {len(spec['components']['schemas'])} esquemas → {destino}")
