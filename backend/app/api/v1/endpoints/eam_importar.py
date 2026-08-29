"""
Cargue masivo de los catálogos propios del CMMS.

El Excel se lee en el navegador y aquí llegan filas ya estructuradas: así no hay
que subir archivos ni manejar temporales, y este lado se dedica a lo que
importa, que es validar.

Criterio de la importación: **no se detiene en el primer error**. Un archivo de
trescientas filas con dos malas debe cargar las 298 buenas y decir exactamente
qué pasó con las otras dos; abortar todo obligaría a corregir a ciegas.

Y es **idempotente**: lo que ya existe se omite en vez de duplicarse, para que
volver a subir el mismo archivo corregido no deje el catálogo con todo repetido.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.models.eam import (
    EAMActividad, EAMRepuesto, EAMFallaCatalogo, EAMCausaCatalogo,
    EAMSolucionCatalogo,
)

router = APIRouter(prefix="/eam", tags=["CMMS/EAM"])

# Tope por archivo. Un Excel de más de esto casi siempre es un error de pegado,
# y una petición con cien mil filas tumba la memoria del proceso.
MAX_FILAS = 5000


class ColumnaPlantilla(BaseModel):
    clave: str
    titulo: str
    requerida: bool = False
    ayuda: Optional[str] = None
    ejemplo: Optional[str] = None


class DefinicionImportacion(BaseModel):
    ruta: str
    titulo: str
    columnas: List[ColumnaPlantilla]


def _col(clave, titulo, requerida=False, ayuda=None, ejemplo=None):
    return ColumnaPlantilla(clave=clave, titulo=titulo, requerida=requerida,
                            ayuda=ayuda, ejemplo=ejemplo)


# Qué columnas admite cada catálogo, de dónde salen la plantilla y la validación.
# `clave_unica` es el campo por el que se decide si una fila ya existe.
CATALOGOS: Dict[str, Dict[str, Any]] = {
    "actividades": {
        "modelo": EAMActividad, "titulo": "Actividades", "clave_unica": "nombre",
        "columnas": [
            _col("nombre", "Nombre", True, "El trabajo tal como aparecerá en la OT",
                 "Cambio de aceite de motor"),
            _col("descripcion", "Descripción", False, ejemplo="Incluye filtro y revisión de fugas"),
        ],
    },
    "repuestos": {
        "modelo": EAMRepuesto, "titulo": "Repuestos", "clave_unica": "codigo",
        "columnas": [
            _col("codigo", "Código", True, "Identificador único del repuesto", "REP-0001"),
            _col("nombre", "Nombre", True, ejemplo="Filtro de aceite"),
            _col("descripcion", "Descripción"),
            _col("categoria", "Categoría", ejemplo="Filtros"),
            _col("unidad_medida", "Unidad de medida", ejemplo="UNIDAD"),
            _col("costo_unitario", "Costo unitario",
                 ayuda="Escriba el número sin separadores de miles: 45000, no 45.000",
                 ejemplo="45000"),
            _col("stock_minimo", "Stock mínimo", ejemplo="5"),
            _col("stock_actual", "Stock actual", ejemplo="20"),
            _col("proveedor_ppal", "Proveedor principal", ejemplo="Distribuidora XYZ"),
        ],
    },
    "fallas": {
        "modelo": EAMFallaCatalogo, "titulo": "Fallas", "clave_unica": "descripcion",
        "columnas": [
            _col("descripcion", "Descripción", True, "Qué se dañó", "Fuga de aceite por retén"),
            _col("codigo", "Código", ejemplo="F-001"),
            _col("tipo_activo", "Tipo de activo", ayuda="A qué tipo de activo aplica",
                 ejemplo="VEHICULO"),
        ],
    },
    "causas": {
        "modelo": EAMCausaCatalogo, "titulo": "Causas", "clave_unica": "descripcion",
        "columnas": [
            _col("descripcion", "Descripción", True, "Por qué se dañó",
                 "Desgaste normal por uso"),
        ],
    },
    "soluciones": {
        "modelo": EAMSolucionCatalogo, "titulo": "Soluciones", "clave_unica": "descripcion",
        "columnas": [
            _col("descripcion", "Descripción", True, "Qué se hizo", "Cambio de retén y sellos"),
        ],
    },
}

NUMERICAS = {"costo_unitario": float, "stock_minimo": int, "stock_actual": int}


def _numero(valor: Any) -> float:
    """Interpreta un número escrito a la colombiana: punto de miles, coma decimal.

    Si la celda ya viene como número —lo normal cuando Excel la tiene
    formateada— se usa tal cual. El problema son las celdas de texto: "45.000"
    son cuarenta y cinco mil, no cuarenta y cinco, y "12500,50" son doce mil
    quinientos con cincuenta, no un millón doscientos cincuenta mil.

    Queda un caso genuinamente ambiguo: un punto seguido de exactamente tres
    dígitos y sin coma. "45.000" puede ser 45000 (miles) o 45.0 (decimal). Se
    resuelve como miles porque es la convención local, y por eso la plantilla
    pide escribir los números sin separadores.
    """
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return float(valor)

    texto = str(valor).strip()
    for basura in ("$", " ", " ", "COP", "cop"):
        texto = texto.replace(basura, "")
    if not texto:
        raise ValueError("vacío")

    tiene_punto, tiene_coma = "." in texto, "," in texto
    if tiene_punto and tiene_coma:
        # El separador decimal es el último que aparece; el otro es de miles.
        if texto.rfind(",") > texto.rfind("."):
            texto = texto.replace(".", "").replace(",", ".")
        else:
            texto = texto.replace(",", "")
    elif tiene_coma:
        # Una sola coma con uno o dos dígitos detrás es decimal; si no, miles.
        entero, _, resto = texto.rpartition(",")
        if texto.count(",") == 1 and 1 <= len(resto) <= 2:
            texto = entero + "." + resto
        else:
            texto = texto.replace(",", "")
    elif tiene_punto:
        entero, _, resto = texto.rpartition(".")
        # Tres dígitos detrás del punto: separador de miles, no decimal.
        if texto.count(".") > 1 or len(resto) == 3:
            texto = texto.replace(".", "")
    return float(texto)


class FilaConError(BaseModel):
    # Número de fila del Excel tal como lo ve el usuario: la 1 es el encabezado.
    fila: int
    motivo: str


class ResultadoImportacion(BaseModel):
    creados: int = 0
    omitidos: int = 0
    errores: List[FilaConError] = []
    total: int = 0


class Cargue(BaseModel):
    filas: List[Dict[str, Any]]


@router.get("/catalogos/{ruta}/plantilla", response_model=DefinicionImportacion)
async def definicion_plantilla(ruta: str):
    """Las columnas del catálogo, para que el navegador arme la plantilla."""
    if ruta not in CATALOGOS:
        raise HTTPException(404, f"No hay un catálogo «{ruta}» que se pueda importar")
    d = CATALOGOS[ruta]
    return DefinicionImportacion(ruta=ruta, titulo=d["titulo"], columnas=d["columnas"])


@router.post("/catalogos/{ruta}/importar", response_model=ResultadoImportacion)
async def importar(ruta: str, cargue: Cargue, db: AsyncSession = Depends(get_db)):
    if ruta not in CATALOGOS:
        raise HTTPException(404, f"No hay un catálogo «{ruta}» que se pueda importar")
    if len(cargue.filas) > MAX_FILAS:
        raise HTTPException(
            400,
            f"El archivo trae {len(cargue.filas)} filas y el máximo son {MAX_FILAS}. "
            "Divídalo en varios archivos.",
        )

    d = CATALOGOS[ruta]
    modelo, clave = d["modelo"], d["clave_unica"]
    requeridas = [c.clave for c in d["columnas"] if c.requerida]
    admitidas = {c.clave for c in d["columnas"]}

    # Lo que ya está, para no duplicarlo. Se compara sin distinguir mayúsculas
    # ni espacios sobrantes: "Filtro de aceite" y "filtro de aceite " son lo
    # mismo para quien llena un Excel.
    existentes = {
        str(v).strip().lower()
        for (v,) in (await db.execute(select(getattr(modelo, clave)))).all()
        if v is not None
    }

    resultado = ResultadoImportacion(total=len(cargue.filas))
    nuevos = []

    for i, cruda in enumerate(cargue.filas):
        # +2: la fila 1 del Excel es el encabezado y el índice empieza en 0.
        numero = i + 2
        fila = {k: v for k, v in cruda.items() if k in admitidas}

        faltantes = [
            c for c in requeridas
            if fila.get(c) is None or str(fila.get(c)).strip() == ""
        ]
        if faltantes:
            titulos = ", ".join(
                next(c.titulo for c in d["columnas"] if c.clave == f) for f in faltantes)
            resultado.errores.append(FilaConError(fila=numero, motivo=f"Falta {titulos}"))
            continue

        valor_clave = str(fila.get(clave, "")).strip().lower()
        if valor_clave in existentes:
            resultado.omitidos += 1
            continue

        limpio: Dict[str, Any] = {}
        problema = None
        for k, v in fila.items():
            if v is None or str(v).strip() == "":
                continue
            if k in NUMERICAS:
                try:
                    limpio[k] = NUMERICAS[k](_numero(v))
                except (TypeError, ValueError):
                    titulo = next(c.titulo for c in d["columnas"] if c.clave == k)
                    problema = f"«{v}» no es un número válido en {titulo}"
                    break
            else:
                limpio[k] = str(v).strip()
        if problema:
            resultado.errores.append(FilaConError(fila=numero, motivo=problema))
            continue

        # Dos filas iguales dentro del mismo archivo: la segunda se omite.
        existentes.add(valor_clave)
        nuevos.append(modelo(**limpio))

    if nuevos:
        db.add_all(nuevos)
        await db.commit()
        resultado.creados = len(nuevos)

    return resultado
