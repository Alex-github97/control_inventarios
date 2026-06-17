import io
import base64
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

KEY_COL = "ORIGEN"
COL_PRECIO_ACTUAL = "TARIFA_CLIENTE"
COL_PRECIO_SICETAC = "COSTO_TOTAL_VIAJE"

_df1_cache: pd.DataFrame | None = None


def _load_df1() -> pd.DataFrame:
    global _df1_cache
    if _df1_cache is None:
        if not DF1_PATH.exists():
            raise HTTPException(status_code=503, detail=f"Archivo base interno no encontrado: {DF1_PATH.name}")
        _df1_cache = pd.read_excel(DF1_PATH)
    return _df1_cache


def _find_col(df: pd.DataFrame, base_name: str) -> str | None:
    if base_name in df.columns:
        return base_name
    for suffix in ("_cliente", "_sicetac"):
        candidate = f"{base_name}{suffix}"
        if candidate in df.columns:
            return candidate
    return None


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

    if KEY_COL not in df2.columns:
        available = ", ".join(df2.columns.tolist())
        raise HTTPException(
            status_code=400,
            detail=f"La columna clave '{KEY_COL}' no se encontró en el archivo. "
                   f"Columnas disponibles: {available}",
        )

    df1 = _load_df1()

    result = pd.merge(df2, df1, on=KEY_COL, how="left", suffixes=("_cliente", "_sicetac"))
    result["procesado_en"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    col_actual = _find_col(result, COL_PRECIO_ACTUAL)
    col_sicetac = _find_col(result, COL_PRECIO_SICETAC)

    if col_actual and col_sicetac:
        result["variacion_precio"] = (
            result[col_actual] / result[col_sicetac].replace(0, pd.NA)
        ).round(4)

    total = len(result)
    if col_sicetac:
        cruzados = int(result[col_sicetac].notna().sum())
    else:
        cruzados = total
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
        },
        "filename": filename,
        "file_base64": base64.b64encode(output.read()).decode("utf-8"),
    }
