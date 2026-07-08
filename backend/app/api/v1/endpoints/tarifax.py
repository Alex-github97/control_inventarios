import io
import base64
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/tarifax", tags=["TarifaX"])

DATA_DIR = Path(__file__).parents[4] / "data"
DF1_PATH = DATA_DIR / "TARIFARIO_SICETAC.xlsx"
TEMPLATE_PATH = DATA_DIR / "plantilla_cotizacion_tarifax.xlsx"

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

    # Llaves efectivas: solo las que existen en ambos archivos.
    keys = [(a, b) for (a, b) in JOIN_KEYS if a in df2.columns and b in df1.columns]

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
        cruzados = int(result[COL_PRECIO_SICETAC].notna().sum())
    else:
        cruzados = 0
    unmatched = total - cruzados
    match_rate = round(cruzados / total * 100, 1) if total > 0 else 0.0

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        result.to_excel(writer, index=False, sheet_name="TarifaX_Resultado")
    output.seek(0)

    filename = f"TarifaX_resultado_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return {
        "stats": {
            "registros": total,
            "cruzados": cruzados,
            "sin_coincidencia": unmatched,
            "tasa_cruce": match_rate,
            "llaves_cruce": [a for a, _ in keys],
        },
        "filename": filename,
        "file_base64": base64.b64encode(output.read()).decode("utf-8"),
    }
