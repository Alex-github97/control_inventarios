import io
import json
import base64
import asyncio
import unicodedata
from datetime import datetime
from pathlib import Path

import httpx
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/tarifax", tags=["TarifaX"])

DATA_DIR = Path(__file__).parents[4] / "data"
DF1_PATH = DATA_DIR / "TARIFARIO_SICETAC.xlsx"
TEMPLATE_PATH = DATA_DIR / "plantilla_cotizacion_tarifax.xlsx"
# Mapeo categorias internas de la empresa -> tipologia de vehiculo SICETAC.
MAPEO_PATH = DATA_DIR / "tarifax_mapeo_vehiculos.json"

COL_PRECIO_ACTUAL = "TARIFA_CLIENTE"      # precio del cliente (archivo DF2)
COL_PRECIO_SICETAC = "COSTO_TOTAL_VIAJE"  # costo de referencia SICETAC (base DF1)

# Llaves de cruce: (columna en el archivo del cliente DF2, columna en la base SICETAC DF1).
# Definen la RUTA y la CATEGORIA DE VEHICULO que se esta consultando, de modo que el
# merge traiga unicamente la tarifa de esa combinacion (y no todas las de un mismo origen).
JOIN_KEYS = [
    ("ORIGEN", "ORIGEN"),
    ("DESTINO", "DESTINO"),
    ("TIPO_VEHICULO", "TIPO_VEHICULO"),
    ("CARROCERIA", "TIPO_CARROCERIA"),
]
# Sin estas columnas no tiene sentido el cruce por categoria.
REQUIRED_DF2_KEYS = ["ORIGEN", "DESTINO", "TIPO_VEHICULO"]

# Columnas de SICETAC que se arrastran al resultado (ademas del costo).
DF1_EXTRA_COLS = ["DPTO_ORIGEN", "DPTO_DESTINO", "DISTANCIA", "CATEGORIA_VEHICULO"]

COL_DISTANCIA = "DISTANCIA"
# Nombres posibles de la columna de CPK (costo por km) en el tarifario SICETAC.
# El usuario agrega esta columna; si no existe, el CPK se deriva de COSTO/DISTANCIA.
CPK_COL_CANDIDATES = [
    "CPK", "COSTO_KM", "COSTO_POR_KM", "COSTO_POR_KILOMETRO",
    "COSTO_KILOMETRO", "CPK_ORIGEN", "COSTO_X_KM",
]

_df1_cache: pd.DataFrame | None = None
_grouped_cache: dict[tuple, pd.DataFrame] = {}


def _load_df1() -> pd.DataFrame:
    global _df1_cache
    if _df1_cache is None:
        if not DF1_PATH.exists():
            raise HTTPException(status_code=503, detail=f"Archivo base interno no encontrado: {DF1_PATH.name}")
        df = pd.read_excel(DF1_PATH)
        df.columns = [str(c).strip() for c in df.columns]
        _df1_cache = df
    return _df1_cache


def _norm(s: pd.Series) -> pd.Series:
    """Normaliza una columna llave: texto, sin espacios extremos/dobles, MAYUSCULAS y sin acentos.

    Evita que diferencias de mayusculas, espacios o tildes (BOGOTA vs Bogotá) rompan el cruce.
    """
    out = s.astype("string").fillna("").str.strip().str.upper()
    out = out.str.replace(r"\s+", " ", regex=True)
    out = out.map(
        lambda v: unicodedata.normalize("NFKD", v).encode("ascii", "ignore").decode("ascii")
        if isinstance(v, str) else v
    )
    return out


def _grouped_df1(keys: list[tuple[str, str]]) -> pd.DataFrame:
    """Devuelve la base SICETAC colapsada a UNA fila por combinacion de llaves.

    Agrega el costo (promedio) por combinacion — asi el cruce es 1:1 y no explota en
    multiples filas por origen. Cacheado por la firma de columnas de cruce.
    """
    sig = tuple(b for _, b in keys)
    cached = _grouped_cache.get(sig)
    if cached is not None:
        return cached

    df1 = _load_df1().copy()
    norm_cols: list[str] = []
    for i, (_, b) in enumerate(keys):
        nc = f"__k{i}"
        df1[nc] = _norm(df1[b])
        norm_cols.append(nc)

    base = df1[df1[norm_cols].ne("").all(axis=1)]  # descartar llaves vacias

    agg: dict[str, str] = {}
    if COL_PRECIO_SICETAC in df1.columns:
        agg[COL_PRECIO_SICETAC] = "mean"
    for c in DF1_EXTRA_COLS:
        if c in df1.columns:
            agg[c] = "first"

    if agg:
        grouped = base.groupby(norm_cols, as_index=False).agg(agg)
    else:
        grouped = base.groupby(norm_cols, as_index=False).size().drop(columns="size")

    counts = (
        base.groupby(norm_cols, as_index=False)
        .size()
        .rename(columns={"size": "coincidencias_sicetac"})
    )
    grouped = grouped.merge(counts, on=norm_cols, how="left")

    if COL_PRECIO_SICETAC in grouped.columns:
        grouped[COL_PRECIO_SICETAC] = grouped[COL_PRECIO_SICETAC].round(0)

    _grouped_cache[sig] = grouped
    return grouped


def _preview(df: pd.DataFrame, n: int = 25) -> dict:
    """Muestra JSON-safe de las primeras filas para previsualizar en la UI."""
    return {
        "columns": [str(c) for c in df.columns],
        "rows": json.loads(df.head(n).to_json(orient="records", date_format="iso")),
        "total": int(len(df)),
    }


def _cpk_column(df1: pd.DataFrame) -> str | None:
    for c in CPK_COL_CANDIDATES:
        if c in df1.columns:
            return c
    return None


_CPK_PIVOT_COLS = ["MUNICIPIO_ORIGEN", "TIPO_VEHICULO", "CPK_PROMEDIO", "RUTAS_SICETAC"]


def _cpk_por_origen() -> tuple[dict[tuple[str, str], float], pd.DataFrame]:
    """CPK (costo por km) promedio por municipio de ORIGEN Y tipologia de vehiculo.

    El CPK no es igual entre tipologias (tractocamion vs sencillo vs turbo…), por eso
    se clasifica por (ORIGEN, TIPO_VEHICULO). Usa la columna de CPK del tarifario si
    existe; si no, lo deriva de COSTO_TOTAL_VIAJE / DISTANCIA. Devuelve
    (mapa (origen_norm, tipo_veh_norm) -> cpk_promedio, tabla-resumen pivot).
    """
    df1 = _load_df1().copy()
    if "ORIGEN" not in df1.columns or "TIPO_VEHICULO" not in df1.columns:
        return {}, pd.DataFrame(columns=_CPK_PIVOT_COLS)

    df1["__origen"] = _norm(df1["ORIGEN"])
    df1["__tveh"] = _norm(df1["TIPO_VEHICULO"])
    cpk_col = _cpk_column(df1)
    if cpk_col:
        df1["__cpk"] = pd.to_numeric(df1[cpk_col], errors="coerce")
    elif COL_PRECIO_SICETAC in df1.columns and COL_DISTANCIA in df1.columns:
        dist = pd.to_numeric(df1[COL_DISTANCIA], errors="coerce").replace(0, pd.NA)
        df1["__cpk"] = pd.to_numeric(df1[COL_PRECIO_SICETAC], errors="coerce") / dist
    else:
        df1["__cpk"] = pd.NA

    valid = df1[df1["__origen"].ne("") & df1["__tveh"].ne("") & df1["__cpk"].notna()]
    if valid.empty:
        return {}, pd.DataFrame(columns=_CPK_PIVOT_COLS)

    pivot = valid.groupby(["__origen", "__tveh"], as_index=False).agg(
        cpk_promedio=("__cpk", "mean"), rutas=("__cpk", "size")
    )
    nombres_o = df1.groupby("__origen")["ORIGEN"].first()
    nombres_v = df1.groupby("__tveh")["TIPO_VEHICULO"].first()
    pivot["MUNICIPIO_ORIGEN"] = pivot["__origen"].map(nombres_o)
    pivot["TIPO_VEHICULO"] = pivot["__tveh"].map(nombres_v)
    pivot["cpk_promedio"] = pivot["cpk_promedio"].round(2)

    cpk_map = {(r["__origen"], r["__tveh"]): r["cpk_promedio"] for _, r in pivot.iterrows()}
    pivot_out = (
        pivot[["MUNICIPIO_ORIGEN", "TIPO_VEHICULO", "cpk_promedio", "rutas"]]
        .rename(columns={"cpk_promedio": "CPK_PROMEDIO", "rutas": "RUTAS_SICETAC"})
        .sort_values(["MUNICIPIO_ORIGEN", "TIPO_VEHICULO"])
        .reset_index(drop=True)
    )
    return cpk_map, pivot_out


def _distancia_origen_destino() -> dict[tuple[str, str], float]:
    """Distancia promedio por ruta (ORIGEN, DESTINO) desde SICETAC, para estimar
    la tarifa teorica de las rutas que no cruzaron por categoria de vehiculo."""
    df1 = _load_df1().copy()
    if COL_DISTANCIA not in df1.columns or "ORIGEN" not in df1.columns or "DESTINO" not in df1.columns:
        return {}
    df1["__o"] = _norm(df1["ORIGEN"])
    df1["__d"] = _norm(df1["DESTINO"])
    df1["__dist"] = pd.to_numeric(df1[COL_DISTANCIA], errors="coerce")
    valid = df1[df1["__o"].ne("") & df1["__d"].ne("") & df1["__dist"].notna()]
    if valid.empty:
        return {}
    g = valid.groupby(["__o", "__d"], as_index=False)["__dist"].mean()
    return {(r["__o"], r["__d"]): float(r["__dist"]) for _, r in g.iterrows()}


def _load_mapeo_raw() -> dict[str, str]:
    """Mapeo crudo {categoria_interna_empresa: tipo_vehiculo_sicetac}."""
    if MAPEO_PATH.exists():
        try:
            data = json.loads(MAPEO_PATH.read_text(encoding="utf-8"))
            return {str(k): str(v) for k, v in data.items()} if isinstance(data, dict) else {}
        except Exception:
            return {}
    return {}


def _mapeo_norm() -> dict[str, str]:
    """Mapeo con la clave normalizada (para cruzar con el TIPO_VEHICULO del cliente)."""
    out: dict[str, str] = {}
    for interna, sicetac in _load_mapeo_raw().items():
        k = _norm(pd.Series([interna])).iloc[0]
        if k and sicetac:
            out[k] = sicetac
    return out


@router.get("/tipos-sicetac")
async def tipos_sicetac(current_user: Usuario = Depends(get_current_user)):
    """Tipologias de vehiculo tal como SICETAC las nombra (para el mapeo)."""
    df1 = _load_df1()
    if "TIPO_VEHICULO" not in df1.columns:
        return []
    vals = df1["TIPO_VEHICULO"].dropna().astype(str).str.strip()
    return sorted(v for v in vals.unique().tolist() if v)


@router.get("/mapeo-vehiculos")
async def get_mapeo_vehiculos(current_user: Usuario = Depends(get_current_user)):
    return _load_mapeo_raw()


class MapeoVehiculosReq(BaseModel):
    mapeo: dict[str, str]


@router.put("/mapeo-vehiculos")
async def put_mapeo_vehiculos(
    data: MapeoVehiculosReq,
    current_user: Usuario = Depends(get_current_user),
):
    limpio = {str(k).strip(): str(v).strip() for k, v in data.mapeo.items() if str(k).strip() and str(v).strip()}
    MAPEO_PATH.write_text(json.dumps(limpio, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "categorias": len(limpio)}


# ─── Ruteo por carretera (geocodificacion Nominatim + ruta OSRM) ──────────────
# OSRM implementa Dijkstra sobre Contraction Hierarchies para calcular la ruta
# minima por la red vial real. Nominatim resuelve nombres de lugar -> lat/lon.
_NOMINATIM = "https://nominatim.openstreetmap.org/search"
_OSRM = "https://router.project-osrm.org/route/v1/driving"
_UA = {"User-Agent": "ICOLTRANS-TarifaX/1.0 (logistica@icoltrans.com.co)"}
_geo_cache: dict[str, dict | None] = {}
_geo_lock = asyncio.Lock()


async def _geocode(client: httpx.AsyncClient, lugar: str) -> dict | None:
    """Resuelve un nombre de lugar (cualquier parte del mundo) a coordenadas.
    Cachea resultados y respeta el limite de uso de Nominatim (1 req/s)."""
    key = (lugar or "").strip().lower()
    if not key:
        return None
    if key in _geo_cache:
        return _geo_cache[key]
    async with _geo_lock:
        if key in _geo_cache:
            return _geo_cache[key]
        # Fallback progresivo: intentamos la cadena completa (mas precisa) y, si
        # Nominatim no la ubica, vamos soltando la parte mas especifica de la
        # izquierda (p.ej. una direccion/POI) hasta que quede ciudad, depto, pais.
        partes = [p.strip() for p in lugar.split(",") if p.strip()]
        intentos = [", ".join(partes[i:]) for i in range(max(1, len(partes)))] or [lugar]
        res = None
        for intento in intentos:
            try:
                r = await client.get(_NOMINATIM, params={"q": intento, "format": "json", "limit": 1},
                                      headers=_UA, timeout=20)
                data = r.json() if r.status_code == 200 else []
            except Exception:
                data = []
            await asyncio.sleep(1.0)  # politica de uso Nominatim
            if data:
                top = data[0]
                res = {"nombre": top.get("display_name"), "lat": float(top["lat"]), "lon": float(top["lon"])}
                break
        _geo_cache[key] = res
        return res


async def _ruta(client: httpx.AsyncClient, o: dict, d: dict, con_geometria: bool) -> dict | None:
    ov = "full" if con_geometria else "false"
    url = f"{_OSRM}/{o['lon']},{o['lat']};{d['lon']},{d['lat']}"
    try:
        r = await client.get(url, params={"overview": ov, "geometries": "geojson"}, timeout=25)
        data = r.json()
    except Exception:
        return None
    if data.get("code") != "Ok" or not data.get("routes"):
        return None
    ruta = data["routes"][0]
    out = {"distancia_km": round(ruta["distance"] / 1000, 1), "duracion_min": round(ruta["duration"] / 60, 1)}
    if con_geometria:
        out["geometria"] = [[c[1], c[0]] for c in ruta["geometry"]["coordinates"]]  # [lat, lon] para Leaflet
    return out


@router.get("/geocode")
async def geocode_lugar(q: str, current_user: Usuario = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        res = await _geocode(client, q)
    if not res:
        raise HTTPException(status_code=404, detail=f"No se encontró el lugar: {q}")
    return res


@router.get("/ruta")
async def calcular_ruta(
    origen: str,
    destino: str,
    current_user: Usuario = Depends(get_current_user),
):
    """Distancia y ruta por carretera entre dos lugares (consulta puntual)."""
    async with httpx.AsyncClient() as client:
        o = await _geocode(client, origen)
        if not o:
            raise HTTPException(404, f"Origen no encontrado: {origen}")
        d = await _geocode(client, destino)
        if not d:
            raise HTTPException(404, f"Destino no encontrado: {destino}")
        r = await _ruta(client, o, d, con_geometria=True)
    if not r:
        raise HTTPException(502, "No se pudo calcular la ruta entre esos puntos")
    return {"origen": o, "destino": d, **r}


@router.post("/ruta-masiva")
async def ruta_masiva(
    file: UploadFile = File(...),
    limite: int = Query(500, ge=1, le=2000),
    current_user: Usuario = Depends(get_current_user),
):
    """Carga un Excel con ORIGEN/DESTINO y devuelve otro con la distancia por
    carretera de cada par (Dijkstra sobre Contraction Hierarchies via OSRM)."""
    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"No se pudo leer el archivo: {e}")
    df.columns = [str(c).strip() for c in df.columns]

    def _col(*cands):
        for c in cands:
            if c in df.columns:
                return c
        return None

    col_o = _col("ORIGEN", "Origen", "origen", "MUNICIPIO_ORIGEN", "CIUDAD_ORIGEN")
    col_d = _col("DESTINO", "Destino", "destino", "MUNICIPIO_DESTINO", "CIUDAD_DESTINO")
    if not col_o or not col_d:
        raise HTTPException(400, f"El archivo debe tener columnas ORIGEN y DESTINO. Columnas: {', '.join(df.columns)}")

    # Columnas opcionales para afinar la geocodificacion (direccion, depto/estado, pais)
    col_dir_o = _col("DIRECCION_ORIGEN", "DIR_ORIGEN", "DIRECCION ORIGEN")
    col_dir_d = _col("DIRECCION_DESTINO", "DIR_DESTINO", "DIRECCION DESTINO")
    col_dep_o = _col("DEPARTAMENTO_ORIGEN", "DEPTO_ORIGEN", "ESTADO_ORIGEN", "PROVINCIA_ORIGEN")
    col_dep_d = _col("DEPARTAMENTO_DESTINO", "DEPTO_DESTINO", "ESTADO_DESTINO", "PROVINCIA_DESTINO")
    col_pais_o = _col("PAIS_ORIGEN", "PAIS ORIGEN")
    col_pais_d = _col("PAIS_DESTINO", "PAIS DESTINO")

    def _componer(row, c_dir, c_mun, c_dep, c_pais) -> str:
        partes = []
        for c in (c_dir, c_mun, c_dep, c_pais):
            if not c:
                continue
            v = str(row[c]).strip()
            if v and v.lower() != "nan":
                partes.append(v)
        return ", ".join(partes)

    total_filas = len(df)
    df = df.head(limite).copy()

    dist_km: list = []
    dur_min: list = []
    estado: list = []
    async with httpx.AsyncClient() as client:
        for _, row in df.iterrows():
            o_txt = _componer(row, col_dir_o, col_o, col_dep_o, col_pais_o)
            d_txt = _componer(row, col_dir_d, col_d, col_dep_d, col_pais_d)
            if not o_txt or not d_txt:
                dist_km.append(None); dur_min.append(None); estado.append("FALTAN DATOS"); continue
            o = await _geocode(client, o_txt)
            d = await _geocode(client, d_txt)
            if not o:
                dist_km.append(None); dur_min.append(None); estado.append(f"ORIGEN no ubicado"); continue
            if not d:
                dist_km.append(None); dur_min.append(None); estado.append(f"DESTINO no ubicado"); continue
            r = await _ruta(client, o, d, con_geometria=False)
            if not r:
                dist_km.append(None); dur_min.append(None); estado.append("SIN RUTA"); continue
            dist_km.append(r["distancia_km"]); dur_min.append(r["duracion_min"]); estado.append("OK")

    df["DISTANCIA_KM"] = dist_km
    df["DURACION_MIN"] = dur_min
    df["ESTADO_RUTA"] = estado

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Distancias")
    output.seek(0)
    filename = f"TarifaX_distancias_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    ok = sum(1 for e in estado if e == "OK")
    return {
        "stats": {"filas": len(df), "total_archivo": total_filas, "calculadas": ok,
                  "sin_ruta": len(df) - ok, "truncado": total_filas > len(df)},
        "filename": filename,
        "file_base64": base64.b64encode(output.read()).decode("utf-8"),
    }


@router.get("/template")
async def descargar_plantilla(
    current_user: Usuario = Depends(get_current_user),
):
    if not TEMPLATE_PATH.exists():
        raise HTTPException(status_code=404, detail="Plantilla no encontrada en el servidor")
    with open(TEMPLATE_PATH, "rb") as f:
        content = f.read()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_cotizacion_tarifax.xlsx"},
    )


@router.post("/merge")
async def merge_tarifas(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
):
    content = await file.read()
    try:
        df2 = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {e}")

    df2.columns = [str(c).strip() for c in df2.columns]

    faltantes = [c for c in REQUIRED_DF2_KEYS if c not in df2.columns]
    if faltantes:
        available = ", ".join(df2.columns.tolist())
        raise HTTPException(
            status_code=400,
            detail=(
                f"Faltan columnas clave en el archivo: {', '.join(faltantes)}. "
                f"Se requieren {', '.join(REQUIRED_DF2_KEYS)} para cruzar por ruta y categoria de vehiculo. "
                f"Columnas disponibles: {available}"
            ),
        )

    df1 = _load_df1()

    # Traduce la tipologia interna de la empresa (p.ej. TRACTOCAMION) al codigo
    # SICETAC (p.ej. 3S2) segun el mapeo configurado, para que el cruce y el CPK calcen.
    mapeo = _mapeo_norm()
    vehiculos_mapeados = 0
    if mapeo and "TIPO_VEHICULO" in df2.columns:
        tvn = _norm(df2["TIPO_VEHICULO"])
        nuevos = []
        for i in range(len(df2)):
            dest = mapeo.get(tvn.iloc[i])
            if dest:
                nuevos.append(dest); vehiculos_mapeados += 1
            else:
                nuevos.append(df2["TIPO_VEHICULO"].iloc[i])
        df2["TIPO_VEHICULO"] = nuevos

    # Columnas originales del archivo del cliente (para la hoja de no-coincidencias).
    df2_cols = list(df2.columns)

    # Llaves efectivas: solo las que existen en ambos archivos...
    keys = [(a, b) for (a, b) in JOIN_KEYS if a in df2.columns and b in df1.columns]
    # ...y descartar las que vienen totalmente en blanco en el archivo del cliente
    # (p.ej. CARROCERIA vacia), para no forzar todo a "sin coincidencia".
    keys = [(a, b) for (a, b) in keys if _norm(df2[a]).ne("").any()]

    # Columnas normalizadas de cruce en el archivo del cliente.
    norm_cols: list[str] = []
    for i, (a, _) in enumerate(keys):
        nc = f"__k{i}"
        df2[nc] = _norm(df2[a])
        norm_cols.append(nc)

    grouped = _grouped_df1(keys)

    # Cruce 1:1 por la ruta + categoria de vehiculo consultada.
    result = pd.merge(df2, grouped, on=norm_cols, how="left", suffixes=("", "_sicetac"))
    result = result.drop(columns=norm_cols)
    result["procesado_en"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if COL_PRECIO_ACTUAL in result.columns and COL_PRECIO_SICETAC in result.columns:
        precio_cli = pd.to_numeric(result[COL_PRECIO_ACTUAL], errors="coerce")
        precio_sic = pd.to_numeric(result[COL_PRECIO_SICETAC], errors="coerce").replace(0, pd.NA)
        result["variacion_precio"] = (precio_cli / precio_sic).round(4)

    total = len(result)
    if COL_PRECIO_SICETAC in result.columns:
        matched_mask = result[COL_PRECIO_SICETAC].notna()
    else:
        matched_mask = pd.Series([False] * total, index=result.index)
    cruzados = int(matched_mask.sum())
    unmatched = total - cruzados
    match_rate = round(cruzados / total * 100, 1) if total > 0 else 0.0

    # ── Hoja 2 "calculo por cpk": rutas SIN coincidencia con tarifa teorica ──
    # Tarifa teorica = distancia(origen, destino) x CPK promedio del municipio origen.
    cpk_map, pivot_cpk = _cpk_por_origen()
    dist_map = _distancia_origen_destino()

    sin = result[~matched_mask].copy()
    cpk_cols = [c for c in df2_cols if c in sin.columns]
    cpk_sheet = sin[cpk_cols].reset_index(drop=True)
    n = len(cpk_sheet)

    o_norm = _norm(cpk_sheet["ORIGEN"]) if "ORIGEN" in cpk_sheet.columns else pd.Series([""] * n)
    d_norm = _norm(cpk_sheet["DESTINO"]) if "DESTINO" in cpk_sheet.columns else pd.Series([""] * n)
    v_norm = _norm(cpk_sheet["TIPO_VEHICULO"]) if "TIPO_VEHICULO" in cpk_sheet.columns else pd.Series([""] * n)

    # Distancia: la del archivo del cliente si viene; si no, la de SICETAC por ruta.
    if COL_DISTANCIA in cpk_sheet.columns:
        dist = pd.to_numeric(cpk_sheet[COL_DISTANCIA], errors="coerce").astype("Float64")
    else:
        dist = pd.Series([pd.NA] * n, dtype="Float64")
    lookup = pd.Series(
        [dist_map.get((o_norm.iloc[i], d_norm.iloc[i])) for i in range(n)], dtype="Float64"
    )
    dist_final = dist.fillna(lookup)
    # CPK segun (municipio origen, tipologia de vehiculo) de cada fila.
    cpk_series = pd.Series(
        [cpk_map.get((o_norm.iloc[i], v_norm.iloc[i])) for i in range(n)], dtype="Float64"
    )

    cpk_sheet["DISTANCIA_KM"] = dist_final
    cpk_sheet["CPK_PROMEDIO_ORIGEN"] = cpk_series.round(2)
    cpk_sheet["TARIFA_TEORICA_CPK"] = (dist_final * cpk_series).round(0)
    con_teorica = int(cpk_sheet["TARIFA_TEORICA_CPK"].notna().sum())

    matched = result[matched_mask]

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        matched.to_excel(writer, index=False, sheet_name="TarifaX_Resultado")
        cpk_sheet.to_excel(writer, index=False, sheet_name="calculo por cpk")
        pivot_cpk.to_excel(writer, index=False, sheet_name="CPK por Origen")
    output.seek(0)

    filename = f"TarifaX_resultado_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return {
        "stats": {
            "registros": total,
            "cruzados": cruzados,
            "sin_coincidencia": unmatched,
            "tasa_cruce": match_rate,
            "llaves_cruce": [a for a, _ in keys],
            "tarifa_teorica_calculada": con_teorica,
            "municipios_origen_cpk": len(pivot_cpk),
            "vehiculos_mapeados": vehiculos_mapeados,
        },
        "preview": {
            "cruzados": _preview(matched),
            "calculo_por_cpk": _preview(cpk_sheet),
        },
        "filename": filename,
        "file_base64": base64.b64encode(output.read()).decode("utf-8"),
    }
