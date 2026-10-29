"""Barrido estático de las rutas GET: consultas dentro de ciclos y listas sin tope.

Uso: python tools/barrido_consultas.py app/api/v1/endpoints   (desde backend/)
Imprime por ruta: archivo:línea, ruta, y las señales encontradas.
  N+1      un `await db...` dentro de un for/while o comprensión (también en
           funciones auxiliares del mismo archivo llamadas desde el ciclo)
  SIN_TOPE la ruta no recibe limit/limite/skip y ejecuta select(...).scalars().all()
"""
import ast
import sys
from pathlib import Path


def es_await_db(n):
    if not isinstance(n, ast.Await):
        return False
    c = n.value
    return isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute) and \
        isinstance(c.func.value, ast.Name) and c.func.value.id in ("db", "session", "s", "sesion")


def llamadas_async(fn):
    """Nombres de funciones del archivo esperadas con await dentro de fn."""
    out = set()
    for n in ast.walk(fn):
        if isinstance(n, ast.Await) and isinstance(n.value, ast.Call) and isinstance(n.value.func, ast.Name):
            out.add(n.value.func.id)
    return out


def consulta_directa(fn):
    return any(es_await_db(n) for n in ast.walk(fn))


def analizar(path):
    arbol = ast.parse(path.read_text(encoding="utf-8"))
    funcs = {f.name: f for f in ast.walk(arbol) if isinstance(f, ast.AsyncFunctionDef)}
    # funciones que consultan la base, directa o indirectamente
    consultan = {k for k, f in funcs.items() if consulta_directa(f)}
    for _ in range(3):
        for k, f in funcs.items():
            if llamadas_async(f) & consultan:
                consultan.add(k)
    for f in funcs.values():
        ruta = None
        for d in f.decorator_list:
            if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr == "get" and d.args \
                    and isinstance(d.args[0], ast.Constant):
                ruta = d.args[0].value
        if ruta is None:
            continue
        senales = []
        for n in ast.walk(f):
            if isinstance(n, (ast.For, ast.AsyncFor, ast.While, ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp)):
                # Lo que se repite: el cuerpo, no la expresión que se recorre
                # (`for x in (await db.execute(q)).all()` es UNA consulta).
                if isinstance(n, (ast.For, ast.AsyncFor, ast.While)):
                    partes = n.body + n.orelse
                else:
                    partes = [getattr(n, "elt", None), getattr(n, "key", None), getattr(n, "value", None)]
                    partes += [i for g in n.generators for i in g.ifs]
                    partes += [g.iter for g in n.generators[1:]]
                cuerpo = [x for p in partes if p is not None for x in ast.walk(p)]
                if any(es_await_db(x) for x in cuerpo):
                    senales.append(f"N+1 L{n.lineno}")
                else:
                    llam = {x.value.func.id for x in cuerpo if isinstance(x, ast.Await) and isinstance(x.value, ast.Call)
                            and isinstance(x.value.func, ast.Name)}
                    if llam & consultan:
                        senales.append(f"N+1 L{n.lineno} via {','.join(sorted(llam & consultan))}")
        params = {a.arg for a in f.args.args + f.args.kwonlyargs}
        src = ast.unparse(f)
        if not params & {"limit", "limite", "skip", "page", "pagina", "offset", "desplazamiento", "por_pagina"} \
                and ".scalars().all()" in src and ".limit(" not in src:
            senales.append("SIN_TOPE")
        if senales:
            print(f"{path.name}:{f.lineno}\t{ruta}\t{' | '.join(dict.fromkeys(senales))}")


for p in sorted(Path(sys.argv[1]).glob("*.py")):
    try:
        analizar(p)
    except SyntaxError as e:
        print("ERROR", p, e)
