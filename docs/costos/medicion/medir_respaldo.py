"""Mide cuánto ocupa en Postgres cada tabla de un respaldo pg_dump -Fc, sin Postgres.

Lee la tabla de contenido (definiciones de tablas e índices) y los datos (COPY
comprimido con zlib) y calcula el tamaño en disco con las reglas de
almacenamiento de Postgres 16:

- Fila (heap): 23 B de cabecera + mapa de nulos, alineado a 8; cada columna con
  su largo y alineación; textos con cabecera de 1 B si miden < 127 B (4 B si no);
  más 4 B del puntero de línea; páginas de 8 KB con 24 B de cabecera.
- Índices B-tree: 8 B de cabecera de tupla + llaves alineadas a 8 + 4 B de
  puntero, hojas al 90 % (fillfactor por defecto) y ~1 % de páginas internas.
TOAST y compresión de valores largos no se modelan (casi no hay textos > 2 KB).
"""
import json, re, struct, sys, zlib
from collections import defaultdict

RUTA = sys.argv[1]
SALIDA = sys.argv[2]
f = open(RUTA, "rb")


def rb():
    return f.read(1)[0]


def ri():
    signo = rb()
    v = int.from_bytes(f.read(4), "little")
    return -v if signo else v


def rs():
    n = ri()
    return None if n < 0 else f.read(n).decode("utf-8", "replace")


def ro():
    flag = rb()
    off = int.from_bytes(f.read(8), "little")
    return flag, off


assert f.read(5) == b"PGDMP"
vmaj, vmin, vrev = rb(), rb(), rb()
assert (vmaj, vmin) == (1, 15), (vmaj, vmin)
int_size, off_size, formato = rb(), rb(), rb()
compresion = rb()
for _ in range(7):
    ri()
rs(); rs(); rs()  # base, versión remota, versión de pg_dump
n_toc = ri()
toc = []
for _ in range(n_toc):
    e = dict(dump_id=ri(), had_dumper=ri(), tableoid=rs(), oid=rs(), tag=rs(), desc=rs(), section=ri(),
             defn=rs(), drop=rs(), copy=rs(), ns=rs(), tablespace=rs(), tableam=rs(), owner=rs())
    rs()  # with oids
    while rs() is not None:
        pass
    e["flag"], e["off"] = ro()
    toc.append(e)

# ─── Tipos ────────────────────────────────────────────────────────────────────
FIJOS = {  # tipo: (largo, alineación)
    "smallint": (2, 2), "integer": (4, 4), "bigint": (8, 8), "real": (4, 4), "double precision": (8, 8),
    "boolean": (1, 1), "date": (4, 4), "timestamp without time zone": (8, 8),
    "timestamp with time zone": (8, 8), "time without time zone": (8, 8), "uuid": (16, 1),
    "interval": (16, 8), "oid": (4, 4),
}
enums = set()
for e in toc:
    if e["desc"] == "TYPE" and e["defn"] and "AS ENUM" in e["defn"]:
        enums.add(e["tag"])


def tipo_col(t):
    t = t.strip().lower()
    t = re.sub(r"^public\.|^\"?cli_carga\"?\.", "", t)
    t = t.strip('"')
    if t.endswith("[]"):
        return ("var", 4)
    base = re.sub(r"\(.*\)", "", t).strip()
    if base in FIJOS:
        return ("fijo",) + FIJOS[base]
    if base in enums:
        return ("fijo", 4, 4)
    if base == "numeric":
        return ("numeric", 4)
    if base == "jsonb":
        return ("jsonb", 4)
    return ("var", 4)  # text, varchar, char, json, bytea…


def columnas(defn):
    cuerpo = defn[defn.index("(") + 1: defn.rindex(")")]
    cols = []
    for linea in cuerpo.split(",\n"):
        linea = linea.strip()
        m = re.match(r'^("?[\w]+"?)\s+(.+?)(\s+(NOT NULL|DEFAULT|GENERATED|COLLATE).*)?$', linea, re.S)
        if not m or linea.upper().startswith(("CONSTRAINT", "PRIMARY", "UNIQUE", "CHECK")):
            continue
        cols.append((m.group(1).strip('"'), m.group(2).strip()))
    return cols


def alinear(x, a):
    return (x + a - 1) // a * a


def largo_valor(tipo, v):
    """Bytes que ocupa el valor en disco y su alineación (None si es nulo)."""
    clase = tipo[0]
    if clase == "fijo":
        return tipo[1], tipo[2]
    if clase == "numeric":
        s = v.lstrip("-").replace(".", "")
        digitos = len(s.strip("0")) or 1
        n = 2 + 2 * ((digitos + 3) // 4)
        return (1 + n, 1) if n < 127 else (4 + n, 4)
    b = len(v.encode("utf-8"))
    if clase == "jsonb":
        b = int(b * 1.1) + 4
    return (1 + b, 1) if b + 1 <= 127 else (4 + b, 4)


def des_copy(s):
    return s.replace("\\t", "\t").replace("\\n", "\n").replace("\\r", "\r").replace("\\\\", "\\")


# ─── Tablas y datos ───────────────────────────────────────────────────────────
tablas = {}
for e in toc:
    if e["desc"] == "TABLE":
        tablas[e["tag"]] = {"cols": columnas(e["defn"]), "filas": 0, "heap": 0, "ancho_col": defaultdict(int),
                            "nulos": defaultdict(int), "indices": []}

por_id = {e["dump_id"]: e for e in toc}
inicio_datos = f.tell()
while True:
    cab = f.read(1)
    if not cab:
        break
    assert cab[0] == 1, cab  # bloque de datos
    e = por_id[ri()]
    if e["desc"] != "TABLE DATA" or e["tag"] not in tablas:
        while True:
            n = ri()
            if n <= 0:
                break
            f.seek(n, 1)
        continue
    t = tablas[e["tag"]]
    m = re.match(r'COPY\s+\S+\s*\((.*)\)\s+FROM', e["copy"] or "", re.S)
    orden = [c.strip().strip('"') for c in m.group(1).split(",")] if m else [c for c, _ in t["cols"]]
    tipos = dict(t["cols"])
    tipos_orden = [tipo_col(tipos.get(c, "text")) for c in orden]
    dec = zlib.decompressobj()
    resto = b""
    natts = len(orden)
    mapa_nulos = (natts + 7) // 8

    def procesar(linea):
        if linea == "\\.":
            return
        vals = linea.split("\t")
        hay_nulos = any(v == "\\N" for v in vals)
        off = 0
        for i, v in enumerate(vals):
            if v == "\\N":
                t["nulos"][orden[i]] += 1
                continue
            n, a = largo_valor(tipos_orden[i], des_copy(v))
            off = alinear(off, a) + n
            t["ancho_col"][orden[i]] += n
        cab = alinear(23 + (mapa_nulos if hay_nulos else 0), 8)
        t["heap"] += alinear(cab + off, 8) + 4
        t["filas"] += 1

    while True:
        n = ri()
        if n <= 0:
            break
        trozo = dec.decompress(f.read(n))
        resto += trozo
        *lineas, resto = resto.split(b"\n")
        for l in lineas:
            procesar(l.decode("utf-8", "replace"))
    resto += dec.flush()
    for l in resto.split(b"\n"):
        if l:
            procesar(l.decode("utf-8", "replace"))

# ─── Índices ──────────────────────────────────────────────────────────────────
for e in toc:
    d = e["defn"] or ""
    m = re.search(r'ON (?:ONLY )?\S*?\.?"?(\w+)"? USING (\w+) \((.*)\);', d)
    if e["desc"] == "INDEX" and m:
        tabla, metodo, llaves = m.group(1), m.group(2), m.group(3)
    else:
        m = re.search(r'ALTER TABLE ONLY \S*?\.?"?(\w+)"?\s+ADD CONSTRAINT \S+ (PRIMARY KEY|UNIQUE) \((.*)\);', d, re.S)
        if e["desc"] != "CONSTRAINT" or not m:
            continue
        tabla, metodo, llaves = m.group(1), "btree", m.group(3)
    if tabla in tablas:
        cols = re.findall(r'"?([a-z_][\w]*)"?', re.sub(r"\b(lower|upper|coalesce|COLLATE|DESC|ASC|NULLS|LAST|FIRST)\b", "", llaves))
        tablas[tabla]["indices"].append({"nombre": e["tag"], "cols": [c for c in cols if c in dict(tablas[tabla]["cols"])]})

salida = {}
for nombre, t in tablas.items():
    filas = t["filas"]
    heap = (t["heap"] / 8168 * 8192) if filas else 0
    idx_total = 0
    for ix in t["indices"]:
        llave = 0
        for c in ix["cols"] or ["id"]:
            presentes = filas - t["nulos"].get(c, 0)
            llave += (t["ancho_col"].get(c, 0) / presentes) if presentes else 0
        tupla = alinear(8 + int(round(llave)), 8) + 4
        idx_total += (filas * tupla / (8168 * 0.90)) * 8192 * 1.01 if filas else 0
    salida[nombre] = {"filas": filas, "heap_bytes": round(heap), "indices_bytes": round(idx_total),
                      "n_indices": len(t["indices"]), "n_columnas": len(t["cols"])}

json.dump(salida, open(SALIDA, "w"), indent=1)
total = sum(v["filas"] for v in salida.values())
heap = sum(v["heap_bytes"] for v in salida.values())
idx = sum(v["indices_bytes"] for v in salida.values())
print(f"tablas {len(salida)} · filas {total:,} · heap {heap/2**20:,.0f} MB · índices {idx/2**20:,.0f} MB · "
      f"{(heap+idx)/total:,.0f} B/fila")
