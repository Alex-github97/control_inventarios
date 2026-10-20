"""
Cruce de las tarifas negociadas con cada cliente contra el costo SICETAC.

SICETAC publica el costo de referencia de UN VIAJE por ruta, configuración del
vehículo y carrocería. Por eso solo son comparables las tarifas que el cliente
paga por viaje según el tipo de vehículo («POR TIPO DE VEHICULO TURBO»…). Las
tarifas por kilo, por caja o por metro cúbico no tienen contra qué compararse
sin saber cuánto lleva cada viaje: se informan como no comparables.

La categoría del cliente (TURBO, SENCILLO, TRACTOMULA…) se traduce a la
configuración SICETAC (2L3, 2, 3S2…) con el mapeo de vehículos de TarifaX, el
mismo que usa el motor de tarifas: una sola equivalencia para toda la
plataforma.

Variación = (tarifa del cliente − costo SICETAC) / costo SICETAC. Positiva: el
cliente paga por encima del costo de referencia. Negativa: por debajo.
"""
import io
import re
import unicodedata
from typing import Dict, List, Optional

import pandas as pd

# Columnas del consolidado comercial (los encabezados se comparan normalizados).
COLS_NEGOCIACION = {
    "CLIENTE": "cliente", "TIPO DE SERVICIO": "servicio", "ORIGEN": "origen",
    "DEPARTAMENTO ORIGEN": "dpto_origen", "DESTINO": "destino",
    "DEPARTAMENTO DESTINO": "dpto_destino", "TIPO DE TARIFA": "tipo_tarifa",
    "TARIFA": "tarifa", "BP": "bp",
}
OBLIGATORIAS_NEGOCIACION = ["CLIENTE", "ORIGEN", "DESTINO", "TIPO DE TARIFA", "TARIFA"]

# Columnas del archivo SICETAC, con los nombres alternos con que suele venir.
COLS_SICETAC = {
    "ORIGEN": ["ORIGEN", "MUNICIPIO ORIGEN", "CIUDAD ORIGEN"],
    "DESTINO": ["DESTINO", "MUNICIPIO DESTINO", "CIUDAD DESTINO"],
    "TIPO_VEHICULO": ["TIPO_VEHICULO", "TIPO VEHICULO", "CONFIGURACION", "CONFIGURACION VEHICULAR"],
    "TIPO_CARROCERIA": ["TIPO_CARROCERIA", "TIPO CARROCERIA", "CARROCERIA"],
    "COSTO_TOTAL_VIAJE": ["COSTO_TOTAL_VIAJE", "COSTO TOTAL VIAJE", "COSTO TOTAL", "VALOR TOTAL VIAJE"],
    "DISTANCIA": ["DISTANCIA", "KILOMETROS", "KM"],
    # Valor de UNA hora logística (espera en cargue y descargue) para esa
    # ruta y vehículo. Opcional: si el archivo no lo trae, se usa el valor por
    # configuración que se define en el tablero.
    "VALOR_HORA_LOGISTICA": ["VALOR_HORA_LOGISTICA", "VALOR HORA LOGISTICA", "HORA_LOGISTICA", "HORA LOGISTICA",
                             "VALOR_HORA", "VALOR HORA", "COSTO_HORA_LOGISTICA", "COSTO HORA LOGISTICA", "COSTO_HORA"],
}
OBLIGATORIAS_SICETAC = ["ORIGEN", "DESTINO", "TIPO_VEHICULO", "COSTO_TOTAL_VIAJE"]

# Sinónimos de categoría de vehículo que el mapeo puede tener con otro nombre.
SINONIMOS_CATEGORIA = {"TRACTOMULA": "TRACTOCAMION", "TRACTOCAMION": "TRACTOMULA", "CAMION SENCILLO": "SENCILLO"}

PREFIJO_VEHICULO = re.compile(r"^POR TIPO DE VEHICULO\s+", re.I)

MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
         "Septiembre", "Octubre", "Noviembre", "Diciembre"]


class ArchivoInvalido(ValueError):
    pass


def normalizar(v) -> str:
    """Texto comparable: mayúsculas, sin tildes, sin espacios dobles."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    s = re.sub(r"\s+", " ", str(v).strip().upper())
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def categoria_de(tipo_tarifa) -> Optional[str]:
    """«POR TIPO DE VEHICULO TURBO» → «TURBO». Las demás tarifas no son por viaje."""
    t = normalizar(tipo_tarifa)
    if not PREFIJO_VEHICULO.match(t):
        return None
    return PREFIJO_VEHICULO.sub("", t).strip() or None


def _leer_tabla(contenido: bytes, nombre: str) -> pd.DataFrame:
    try:
        if nombre.lower().endswith(".csv"):
            return pd.read_csv(io.BytesIO(contenido), sep=None, engine="python", encoding_errors="replace")
        return pd.read_excel(io.BytesIO(contenido))
    except Exception as e:  # noqa: BLE001
        raise ArchivoInvalido(f"No se pudo leer el archivo «{nombre}»: {e}") from e


def leer_negociaciones(contenido: bytes, nombre: str) -> pd.DataFrame:
    df = _leer_tabla(contenido, nombre)
    encabezados = {normalizar(c): c for c in df.columns}
    faltan = [c for c in OBLIGATORIAS_NEGOCIACION if c not in encabezados]
    if faltan:
        raise ArchivoInvalido(
            "Al archivo de negociaciones le faltan las columnas: " + ", ".join(faltan)
            + ". Se esperan: " + ", ".join(COLS_NEGOCIACION) + ".")
    out = pd.DataFrame({dest: df[encabezados[src]] if src in encabezados else None
                        for src, dest in COLS_NEGOCIACION.items()})
    for c in ("cliente", "servicio", "origen", "dpto_origen", "destino", "dpto_destino", "tipo_tarifa", "bp"):
        out[c] = out[c].map(lambda v: normalizar(v) or None)
    out["tarifa"] = pd.to_numeric(out["tarifa"], errors="coerce")
    out = out[out["cliente"].notna() & out["origen"].notna() & out["destino"].notna()]
    if out.empty:
        raise ArchivoInvalido("El archivo de negociaciones no trae ninguna fila con cliente, origen y destino.")
    out["categoria_vehiculo"] = out["tipo_tarifa"].map(categoria_de)
    return out.reset_index(drop=True)


def leer_sicetac(contenido: bytes, nombre: str) -> pd.DataFrame:
    """Lee un tarifario SICETAC y lo reduce a lo que usa el cruce: costo
    promedio y distancia por origen, destino, configuración y carrocería."""
    df = _leer_tabla(contenido, nombre)
    encabezados = {normalizar(c).replace(" ", "_"): c for c in df.columns}
    encabezados.update({normalizar(c): c for c in df.columns})
    columnas = {}
    for destino, alternos in COLS_SICETAC.items():
        for alt in alternos:
            if alt in encabezados:
                columnas[destino] = encabezados[alt]
                break
    faltan = [c for c in OBLIGATORIAS_SICETAC if c not in columnas]
    if faltan:
        raise ArchivoInvalido(
            "Al archivo SICETAC le faltan las columnas: " + ", ".join(faltan)
            + ". Debe traer, como el tarifario de TarifaX: ORIGEN, DESTINO, TIPO_VEHICULO, "
              "TIPO_CARROCERIA, COSTO_TOTAL_VIAJE y (opcional) DISTANCIA.")
    base = pd.DataFrame({k: df[v] for k, v in columnas.items()})
    if "TIPO_CARROCERIA" not in base:
        base["TIPO_CARROCERIA"] = "SIN CARROCERIA"
    if "DISTANCIA" not in base:
        base["DISTANCIA"] = None
    if "VALOR_HORA_LOGISTICA" not in base:
        base["VALOR_HORA_LOGISTICA"] = None
    return agrupar_sicetac(base)


def agrupar_sicetac(base: pd.DataFrame) -> pd.DataFrame:
    g = pd.DataFrame({
        "o": base["ORIGEN"].map(normalizar),
        "d": base["DESTINO"].map(normalizar),
        "tv": base["TIPO_VEHICULO"].map(normalizar),
        "carroceria": base["TIPO_CARROCERIA"].map(normalizar).replace("", "SIN CARROCERIA"),
        "costo": pd.to_numeric(base["COSTO_TOTAL_VIAJE"], errors="coerce"),
        "distancia": pd.to_numeric(base["DISTANCIA"], errors="coerce"),
        "valor_hora": pd.to_numeric(base["VALOR_HORA_LOGISTICA"], errors="coerce")
                      if "VALOR_HORA_LOGISTICA" in base else float("nan"),
    })
    g = g[(g["o"] != "") & (g["d"] != "") & (g["tv"] != "") & g["costo"].gt(0)]
    if g.empty:
        raise ArchivoInvalido("El archivo SICETAC no trae ninguna fila con origen, destino, vehículo y costo.")
    return (g.groupby(["o", "d", "tv", "carroceria"], as_index=False)
             .agg(costo=("costo", "mean"), distancia=("distancia", "first"), valor_hora=("valor_hora", "mean")))


def mapeo_categorias(mapeo: Dict[str, str]) -> Dict[str, str]:
    """{CATEGORIA_NORMALIZADA: configuración SICETAC normalizada}, con sinónimos."""
    out = {normalizar(k): normalizar(v) for k, v in mapeo.items() if normalizar(k) and normalizar(v)}
    for a, b in SINONIMOS_CATEGORIA.items():
        if a not in out and b in out:
            out[a] = out[b]
    return out


def cruzar(negociaciones: List[dict], sicetac: pd.DataFrame, alias: Dict[str, str],
           mapeo: Dict[str, str], periodo: str) -> List[dict]:
    """Una fila por tarifa comparable y carrocería con referencia SICETAC; si la
    ruta no tiene referencia, una sola fila marcada SIN_RUTA (o SIN_VEHICULO si
    la categoría no tiene equivalente en el mapeo)."""
    alias_n = {normalizar(k): normalizar(v) for k, v in alias.items()}
    mapa = mapeo_categorias(mapeo)
    indice: Dict[tuple, List[tuple]] = {}
    if "valor_hora" not in sicetac:   # archivos guardados antes de leer la hora logística
        sicetac = sicetac.assign(valor_hora=float("nan"))
    for o, d, tv, carr, costo, dist, vh in sicetac[["o", "d", "tv", "carroceria", "costo", "distancia", "valor_hora"]].itertuples(index=False):
        indice.setdefault((o, d, tv), []).append((carr, costo, dist, vh))
    filas = []
    for n in negociaciones:
        cat = n["categoria_vehiculo"]
        # Desde pandas lo vacío llega como NaN, que es «verdadero».
        if not isinstance(cat, str) or not cat:
            continue
        # Una tarifa vacía o en cero no es una negociación: compararla daría
        # «−100 % frente a SICETAC», una pérdida que no existe.
        if n["tarifa"] is None or pd.isna(n["tarifa"]) or n["tarifa"] <= 0:
            continue
        o = alias_n.get(normalizar(n["origen"]), normalizar(n["origen"]))
        d = alias_n.get(normalizar(n["destino"]), normalizar(n["destino"]))
        tv = mapa.get(normalizar(cat))
        comun = dict(periodo=periodo, negociacion_id=n["id"], cliente=n["cliente"], servicio=n["servicio"],
                     origen=n["origen"], destino=n["destino"], dpto_origen=n.get("dpto_origen"),
                     dpto_destino=n.get("dpto_destino"), categoria=cat, tipo_vehiculo=tv,
                     tarifa_cliente=n["tarifa"], valor_hora=None)
        if not tv:
            filas.append({**comun, "estado": "SIN_VEHICULO", "carroceria": None, "distancia": None,
                          "costo_sicetac": None, "diferencia": None, "variacion_pct": None})
            continue
        refs = indice.get((o, d, tv))
        if not refs:
            filas.append({**comun, "estado": "SIN_RUTA", "carroceria": None, "distancia": None,
                          "costo_sicetac": None, "diferencia": None, "variacion_pct": None})
            continue
        for carr, costo, dist, vh in refs:
            tarifa = n["tarifa"]
            dif = (tarifa - costo) if tarifa is not None else None
            filas.append({**comun, "estado": "OK", "carroceria": carr,
                          "valor_hora": None if pd.isna(vh) else round(float(vh), 0),
                          "distancia": None if pd.isna(dist) else float(dist),
                          "costo_sicetac": round(float(costo), 0),
                          "diferencia": None if dif is None else round(float(dif), 0),
                          "variacion_pct": None if dif is None or not costo else round(float(dif) / float(costo) * 100, 2)})
    return filas


def nombre_periodo(periodo: str) -> str:
    if periodo == "VIGENTE":
        return "Tarifario TarifaX vigente"
    anio, mes = periodo.split("-")
    return f"{MESES[int(mes) - 1]} {anio}"
