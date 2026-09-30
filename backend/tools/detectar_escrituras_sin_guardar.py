"""
Rutas que reciben datos (POST, PUT, PATCH, DELETE) y no los guardan.

Una pantalla puede llamar al servidor, recibir «201 creado» y aun así no haber
guardado nada, si la ruta arma la respuesta sin hacer commit. Es la contraparte
del lado del servidor de los «guardados» que solo vivían en el navegador.

Cómo decide: lee cada archivo de endpoints con `ast`, toma las funciones con
decorador `router.post/put/patch/delete` y mira si en su cuerpo —o en las
funciones del mismo archivo que llama— aparece `commit`. Las que no, se
reportan para revisarlas a mano: algunas son cálculos que legítimamente no
guardan (una simulación, una vista previa, un inicio de sesión).

    python backend/tools/detectar_escrituras_sin_guardar.py
"""
import ast
import pathlib
import sys

RAIZ = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).parents[1] / "app" / "api" / "v1" / "endpoints")
METODOS = {"post", "put", "patch", "delete"}


def es_escritura(f: ast.AST):
    for d in getattr(f, "decorator_list", []):
        if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in METODOS:
            ruta = d.args[0].value if d.args and isinstance(d.args[0], ast.Constant) else "?"
            return d.func.attr.upper(), ruta
    return None


hallazgos = []
for archivo in sorted(RAIZ.glob("*.py")):
    fuente = archivo.read_text(encoding="utf-8")
    arbol = ast.parse(fuente)
    funciones = {n.name: n for n in ast.walk(arbol) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}

    def guarda(nodo, vistos=None) -> bool:
        vistos = vistos or set()
        texto = ast.get_source_segment(fuente, nodo) or ""
        if "commit" in texto:
            return True
        # Sigue una vez a las funciones del mismo archivo que llama.
        for sub in ast.walk(nodo):
            if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id in funciones \
                    and sub.func.id not in vistos:
                vistos.add(sub.func.id)
                if guarda(funciones[sub.func.id], vistos):
                    return True
        return False

    for f in funciones.values():
        e = es_escritura(f)
        if e and not guarda(f):
            hallazgos.append((archivo.name, f.lineno, e[0], e[1], f.name))

print(f"=== RUTAS DE ESCRITURA SIN COMMIT VISIBLE ({len(hallazgos)}) ===")
for a, linea, metodo, ruta, nombre in hallazgos:
    print(f"  {a}:{linea}  {metodo:6} {ruta:45} {nombre}")
