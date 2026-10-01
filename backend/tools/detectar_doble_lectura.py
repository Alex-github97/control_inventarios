"""Resultados de consulta leídos dos veces en la misma función (el segundo falla)."""
import ast, pathlib, sys
from collections import defaultdict
LECTURAS = {"scalar", "scalar_one", "scalar_one_or_none", "scalars", "all", "first", "one", "one_or_none", "mappings", "fetchall"}
for f in pathlib.Path(sys.argv[1]).rglob("*.py"):
    arbol = ast.parse(f.read_text(encoding="utf-8"))
    for fn in ast.walk(arbol):
        if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        asignaciones = defaultdict(list)
        lecturas = defaultdict(list)
        for n in ast.walk(fn):
            if isinstance(n, ast.Assign):
                for t in n.targets:
                    if isinstance(t, ast.Name):
                        asignaciones[t.id].append(n.lineno)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in LECTURAS \
                    and isinstance(n.func.value, ast.Name):
                lecturas[n.func.value.id].append(n.lineno)
        for var, lineas in lecturas.items():
            if len(lineas) < 2 or not asignaciones.get(var):
                continue
            lineas.sort()
            for a, b in zip(lineas, lineas[1:]):
                # leído dos veces sin reasignar en medio
                if not any(a < x <= b for x in asignaciones[var]):
                    print(f"{f}:{a},{b}  {fn.name}  {var}")
