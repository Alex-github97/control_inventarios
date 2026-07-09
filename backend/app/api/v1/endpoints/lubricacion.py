"""Lubricación — extracción por IA (visión) de boletines de análisis de aceite.

Expone:
  POST   /lubricacion/ocr                  -> extrae campos de una imagen/PDF de laboratorio (Claude vision)
  GET    /lubricacion/ia/ejemplos          -> lista los ejemplos etiquetados (dataset de entrenamiento)
  POST   /lubricacion/ia/ejemplos          -> agrega un ejemplo (imagen + datos correctos)
  DELETE /lubricacion/ia/ejemplos/{id}     -> elimina un ejemplo

El "entrenamiento" no re-entrena el modelo: los ejemplos etiquetados se inyectan
como ejemplos few-shot en la petición de visión para mejorar la extracción.
"""
import os
import io
import json
import base64
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/lubricacion", tags=["Lubricación IA"])

IA_DIR = Path(__file__).parents[4] / "uploads" / "lube_ia"
DATASET_PATH = IA_DIR / "dataset.json"
OCR_MODEL = os.environ.get("LUBE_OCR_MODEL", "claude-opus-4-8")
MAX_FEWSHOT = 4

IMG_MEDIA = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif",
}

# Parámetros que la IA debe tabular desde el boletín de análisis de aceite.
# Descripción por campo (usada tanto para el esquema de salida como de referencia).
DESCRIPCIONES: dict[str, str] = {
    # Identificación
    "activo":       "Código o nombre del activo/equipo (ej. VH-001)",
    "componente":   "Componente muestreado (Motor, Sistema Hidráulico, Caja, Diferencial...)",
    "lubricante":   "Marca y referencia del lubricante/aceite",
    "fecha":        "Fecha de la muestra en formato YYYY-MM-DD si es posible",
    "horas":        "Horas/km de servicio del aceite o del equipo",
    "laboratorio":  "Nombre del laboratorio que emitió el boletín",
    "muestra_id":   "Número o código de la muestra/boletín",
    # Metales de desgaste (ppm)
    "fe":  "Hierro (Fe) en ppm", "cr": "Cromo (Cr) en ppm", "pb": "Plomo (Pb) en ppm",
    "cu":  "Cobre (Cu) en ppm", "sn": "Estaño (Sn) en ppm", "al": "Aluminio (Al) en ppm",
    "ni":  "Níquel (Ni) en ppm", "mo": "Molibdeno (Mo) en ppm",
    # Contaminación
    "si":  "Silicio (Si) en ppm — indicador de tierra/polvo", "na": "Sodio (Na) en ppm",
    "k":   "Potasio (K) en ppm", "agua": "Contenido de agua en % o ppm",
    "combustible": "Dilución por combustible en %", "hollin": "Hollín en %",
    "glicol": "Presencia de glicol (positivo/negativo o %)",
    # Aditivos (ppm)
    "ca": "Calcio (Ca) en ppm", "mg": "Magnesio (Mg) en ppm", "zn": "Zinc (Zn) en ppm",
    "p": "Fósforo (P) en ppm", "b": "Boro (B) en ppm", "ba": "Bario (Ba) en ppm",
    # Propiedades físico-químicas / salud del aceite
    "viscosidad": "Viscosidad cinemática a 40°C (cSt)",
    "visc100": "Viscosidad cinemática a 100°C (cSt)",
    "indice_viscosidad": "Índice de viscosidad (IV)",
    "tbn": "TBN — número básico total (mgKOH/g)",
    "tan": "TAN — número ácido total (mgKOH/g)",
    "oxidacion": "Oxidación (Ab/cm)", "nitracion": "Nitración (Ab/cm)",
    "sulfatacion": "Sulfatación (Ab/cm)",
    # Conteo de partículas
    "iso4406": "Código de limpieza ISO 4406 (ej. 18/16/13)",
    "pq": "Índice PQ (partículas ferrosas)",
    # Diagnóstico
    "severidad": "Estado/severidad global de la muestra (NORMAL, PRECAUCIÓN, CRÍTICO)",
    "recomendacion": "Recomendación o comentario del laboratorio",
}
CAMPOS: list[str] = list(DESCRIPCIONES.keys())

EXTRACTION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {k: {"type": "string", "description": DESCRIPCIONES[k]} for k in CAMPOS},
    "required": CAMPOS,
}

SYSTEM_PROMPT = (
    "Eres un analista experto en tribología y análisis de aceite. Recibes la imagen o PDF "
    "de un boletín de análisis de aceite (oil analysis report) y debes TABULAR TODOS sus "
    "datos en JSON estructurado, agrupados en: identificación (activo, componente, "
    "lubricante, fecha, horas, laboratorio, muestra); METALES DE DESGASTE en ppm (Fe, Cr, "
    "Pb, Cu, Sn, Al, Ni, Mo); CONTAMINACIÓN (Si, Na, K, agua, combustible, hollín, glicol); "
    "ADITIVOS en ppm (Ca, Mg, Zn, P, B, Ba); PROPIEDADES Y SALUD del aceite (viscosidad "
    "40°C y 100°C, índice de viscosidad, TBN, TAN, oxidación, nitración, sulfatación); "
    "CONTEO DE PARTÍCULAS (código ISO 4406, índice PQ); y DIAGNÓSTICO (severidad y "
    "recomendación del laboratorio). Si un valor no aparece en el documento, devuelve "
    "cadena vacía para ese campo — no inventes datos. Devuelve los números tal como "
    "aparecen (solo el valor, sin unidades cuando sea posible)."
)


def _ensure_dir() -> None:
    IA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATASET_PATH.exists():
        DATASET_PATH.write_text("[]", encoding="utf-8")


def _load_dataset() -> list[dict]:
    _ensure_dir()
    try:
        return json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_dataset(items: list[dict]) -> None:
    _ensure_dir()
    DATASET_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def _media_type(filename: str, content_type: str | None) -> tuple[str, bool]:
    """Devuelve (media_type, es_pdf)."""
    ext = Path(filename or "").suffix.lower()
    if ext == ".pdf" or (content_type or "").endswith("pdf"):
        return "application/pdf", True
    return IMG_MEDIA.get(ext, content_type or "image/png"), False


def _source_block(b64: str, media_type: str, is_pdf: bool) -> dict:
    if is_pdf:
        return {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}}
    return {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}}


def _fewshot_messages() -> list[dict]:
    """Construye ejemplos few-shot (imagen etiquetada -> JSON) desde el dataset."""
    msgs: list[dict] = []
    for ex in _load_dataset()[:MAX_FEWSHOT]:
        img_path = IA_DIR / ex["filename"]
        if not img_path.exists():
            continue
        b64 = base64.b64encode(img_path.read_bytes()).decode("utf-8")
        media_type, is_pdf = _media_type(ex["filename"], None)
        msgs.append({
            "role": "user",
            "content": [
                _source_block(b64, media_type, is_pdf),
                {"type": "text", "text": "Tabula los datos de este boletín de análisis de aceite."},
            ],
        })
        msgs.append({"role": "assistant", "content": json.dumps(ex["campos"], ensure_ascii=False)})
    return msgs


@router.post("/ocr")
async def extraer_muestra(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    media_type, is_pdf = _media_type(file.filename or "", file.content_type)

    try:
        import anthropic
    except ImportError:
        raise HTTPException(status_code=503, detail="Motor de IA no instalado en el servidor (falta el paquete 'anthropic').")

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        raise HTTPException(
            status_code=503,
            detail="Extracción por IA no configurada: falta ANTHROPIC_API_KEY en el servidor. Puedes ingresar los datos manualmente.",
        )

    b64 = base64.b64encode(content).decode("utf-8")
    messages = _fewshot_messages()
    messages.append({
        "role": "user",
        "content": [
            _source_block(b64, media_type, is_pdf),
            {"type": "text", "text": "Tabula los datos de este boletín de análisis de aceite."},
        ],
    })

    client = anthropic.Anthropic()
    try:
        resp = client.messages.create(
            model=OCR_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
            output_config={"format": {"type": "json_schema", "schema": EXTRACTION_SCHEMA}},
        )
    except Exception as e:  # errores de la API / red
        raise HTTPException(status_code=502, detail=f"Error del motor de IA: {e}")

    text = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
    try:
        campos = json.loads(text)
    except Exception:
        raise HTTPException(status_code=502, detail="La IA no devolvió datos estructurados legibles.")

    return {
        "campos": {k: campos.get(k, "") for k in CAMPOS},
        "modelo": OCR_MODEL,
        "ejemplos_usados": len(messages) // 2 - 0,  # pares few-shot (excluye el target)
        "raw": text,
    }


@router.get("/ia/ejemplos")
async def listar_ejemplos(current_user: Usuario = Depends(get_current_user)):
    return [
        {"id": e["id"], "filename": e["filename"], "campos": e["campos"], "created_at": e.get("created_at")}
        for e in _load_dataset()
    ]


@router.post("/ia/ejemplos")
async def agregar_ejemplo(
    file: UploadFile = File(...),
    datos: str = Form(...),
    current_user: Usuario = Depends(get_current_user),
):
    """Agrega un ejemplo etiquetado al dataset (imagen + los datos correctos en JSON)."""
    try:
        campos = json.loads(datos)
        if not isinstance(campos, dict):
            raise ValueError
    except Exception:
        raise HTTPException(status_code=400, detail="El campo 'datos' debe ser un JSON de objeto con los valores correctos.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Imagen vacía")

    _ensure_dir()
    ext = Path(file.filename or "").suffix.lower() or ".png"
    ex_id = uuid.uuid4().hex[:12]
    fname = f"{ex_id}{ext}"
    (IA_DIR / fname).write_bytes(content)

    items = _load_dataset()
    entry = {
        "id": ex_id,
        "filename": fname,
        "campos": {k: str(campos.get(k, "")) for k in CAMPOS},
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    items.insert(0, entry)
    _save_dataset(items)
    return {"id": ex_id, "total_ejemplos": len(items)}


@router.delete("/ia/ejemplos/{ejemplo_id}")
async def eliminar_ejemplo(ejemplo_id: str, current_user: Usuario = Depends(get_current_user)):
    items = _load_dataset()
    match = next((e for e in items if e["id"] == ejemplo_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Ejemplo no encontrado")
    try:
        (IA_DIR / match["filename"]).unlink(missing_ok=True)
    except Exception:
        pass
    _save_dataset([e for e in items if e["id"] != ejemplo_id])
    return {"ok": True, "total_ejemplos": len(items) - 1}
