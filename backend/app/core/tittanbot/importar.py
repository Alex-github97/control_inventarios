"""
Cargues masivos desde el chat: el usuario adjunta un Excel y TittanBot lo pasa
por el MISMO importador de la pantalla de cargue masivo.

No hay un importador nuevo ni reglas propias. Se lee la plantilla del
importador (sus columnas, cuáles son obligatorias), se emparejan los
encabezados del archivo con esas columnas —por título o por clave, sin tildes
ni mayúsculas— y se le envían las filas tal como las mandaría la pantalla. Las
validaciones, los duplicados y los errores por fila los decide el importador.

Antes de grabar, la tarjeta de confirmación dice cuántas filas van, qué columnas
se reconocieron y cuáles obligatorias faltan; sin las obligatorias no se ofrece.
"""
import json
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from sqlalchemy import desc, select

from app.core.tittanbot import ejecutor
from app.core.tittanbot.herramientas import Contexto
from app.infrastructure.models.tittanbot import TittanbotAdjunto

LOTE = 500
MAX_POR_FILA = 300      # cada fila es una petición: más que esto pasa el tiempo de la conexión


@dataclass
class Destino:
    clave: str
    titulo: str
    plantilla: str          # GET que devuelve {columnas: [{clave, titulo, requerida}]}
    importar: str           # POST que recibe {filas: [...]}
    permiso: Tuple[str, ...]
    # Para lo que no tiene importador masivo (viajes del TMS, movimientos del
    # WMS): las columnas se declaran acá y cada fila se convierte en una
    # petición al mismo endpoint de la pantalla. Devuelve (método, ruta, cuerpo)
    # o lanza ValueError con el motivo de la fila.
    columnas: Optional[List[dict]] = None
    por_fila: Optional[Callable[[Contexto, dict], Awaitable[Tuple[str, str, dict]]]] = None


DESTINOS: Dict[str, Destino] = {}


def registrar(*destinos: Destino) -> None:
    for d in destinos:
        DESTINOS[d.clave] = d


def _norma(s: Any) -> str:
    t = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    t = t.split("(")[0]                       # «Hierro (Fe) (ppm)» → «hierro»
    return "".join(c for c in t if c.isalnum())


async def adjunto_actual(ctx: Contexto) -> Optional[TittanbotAdjunto]:
    if not ctx.conversacion_id:
        return None
    return (await ctx.db.execute(
        select(TittanbotAdjunto).where(TittanbotAdjunto.conversacion_id == ctx.conversacion_id)
        .order_by(desc(TittanbotAdjunto.id)).limit(1))).scalar_one_or_none()


async def _plantilla(ctx: Contexto, d: Destino) -> List[dict]:
    if d.columnas is not None:
        return d.columnas
    resp = await ejecutor.llamar_api("GET", d.plantilla, ctx.headers)
    if resp.status_code != 200:
        raise ValueError(f"No se pudo leer la plantilla de «{d.titulo}»: {ejecutor._detalle(resp)}")
    return resp.json().get("columnas") or []


def _puede(ctx: Contexto, d: Destino) -> bool:
    from app.core.permisos_ruta import permitido
    from app.core.tittanbot.herramientas import rol_de
    return permitido(rol_de(ctx.usuario), getattr(ctx.usuario, "permisos", None) or {}, d.permiso)


def _destino(ctx: Contexto, destino: str) -> Destino:
    d = DESTINOS.get(destino)
    if d is None:
        raise ValueError(f"No conozco el destino «{destino}». Opciones: {', '.join(DESTINOS)}.")
    if not _puede(ctx, d):
        raise ValueError(f"Su perfil no tiene permiso para cargar {d.titulo}.")
    return d


async def emparejar(ctx: Contexto, destino: str) -> Dict[str, Any]:
    """Qué columna del archivo va a qué campo del importador."""
    d = _destino(ctx, destino)
    adj = await adjunto_actual(ctx)
    if adj is None:
        raise ValueError("No hay ningún archivo adjunto en esta conversación.")
    columnas = await _plantilla(ctx, d)
    encabezados: List[str] = json.loads(adj.encabezados)
    por_nombre: Dict[str, str] = {}
    for c in columnas:
        por_nombre.setdefault(_norma(c["titulo"]), c["clave"])
        por_nombre.setdefault(_norma(c["clave"]), c["clave"])
    mapa: Dict[int, str] = {}
    sin_reconocer: List[str] = []
    for i, h in enumerate(encabezados):
        clave = por_nombre.get(_norma(h))
        if clave and clave not in mapa.values():
            mapa[i] = clave
        elif str(h or "").strip():
            sin_reconocer.append(str(h))
    usadas = set(mapa.values())
    faltan = [c["titulo"] for c in columnas if c.get("requerida") and c["clave"] not in usadas]
    titulo_de = {c["clave"]: c["titulo"] for c in columnas}
    return {"destino": d, "adjunto": adj, "mapa": mapa, "sin_reconocer": sin_reconocer, "faltan": faltan,
            "reconocidas": [titulo_de[c] for c in mapa.values()]}


def _valor(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d") if (v.hour, v.minute, v.second) == (0, 0, 0) else v.isoformat()
    if isinstance(v, date):
        return v.isoformat()
    return v


async def resumen(ctx: Contexto, a: dict) -> str:
    e = await emparejar(ctx, a["destino"])
    partes = [f"Importar {e['adjunto'].total} fila(s) de «{e['adjunto'].nombre}» a {e['destino'].titulo}",
              "Columnas reconocidas: " + (", ".join(e["reconocidas"]) or "ninguna")]
    if e["sin_reconocer"]:
        partes.append("Se ignoran: " + ", ".join(e["sin_reconocer"][:8]))
    if e["faltan"]:
        partes.append("FALTAN OBLIGATORIAS: " + ", ".join(e["faltan"]))
    partes.append("Las filas con errores no se graban y se le informan")
    return " · ".join(partes)


async def importar(ctx: Contexto, a: dict) -> Dict[str, Any]:
    e = await emparejar(ctx, a["destino"])
    if e["faltan"]:
        return {"exito": False, "resultado": "Al archivo le faltan columnas obligatorias: " + ", ".join(e["faltan"])}
    filas = json.loads(e["adjunto"].filas)
    registros = [{clave: _valor(f[i]) for i, clave in e["mapa"].items() if i < len(f) and f[i] not in (None, "")}
                 for f in filas]
    creados = omitidos = 0
    errores: List[str] = []
    if e["destino"].por_fila is not None:
        if len(registros) > MAX_POR_FILA:
            return {"exito": False, "resultado": f"Para {e['destino'].titulo} el máximo por cargue es "
                                                  f"{MAX_POR_FILA} filas; el archivo trae {len(registros)}."}
        for n, reg in enumerate(registros, start=2):
            try:
                metodo, ruta, cuerpo = await e["destino"].por_fila(ctx, reg)
                resp = await ejecutor.llamar_api(metodo, ruta, ctx.headers, cuerpo=cuerpo)
                if 200 <= resp.status_code < 300:
                    creados += 1
                else:
                    errores.append(f"fila {n}: {ejecutor._detalle(resp)}")
            except (ValueError, KeyError) as ex:
                errores.append(f"fila {n}: {ex}")
        texto = f"Registré {creados} de {len(registros)} fila(s) en {e['destino'].titulo}"
        if errores:
            texto += f"; {len(errores)} con error, por ejemplo: " + " | ".join(errores[:5])
        return {"exito": creados > 0, "resultado": texto + "."}
    for inicio in range(0, len(registros), LOTE):
        resp = await ejecutor.llamar_api("POST", e["destino"].importar, ctx.headers,
                                         cuerpo={"filas": registros[inicio:inicio + LOTE]})
        if resp.status_code != 200:
            return {"exito": creados > 0, "resultado": f"Se detuvo en la fila {inicio + 2}: {ejecutor._detalle(resp)}. "
                                                        f"Alcanzaron a crearse {creados}."}
        r = resp.json()
        creados += r.get("creados", 0)
        omitidos += r.get("omitidos", 0)
        # El importador numera las filas de su lote: se corren al número real del Excel.
        errores += [f"fila {x['fila'] + inicio}: {x['motivo']}" for x in r.get("errores", [])]
    texto = f"Importé {creados} registro(s) a {e['destino'].titulo}"
    if omitidos:
        texto += f"; {omitidos} ya existían y se omitieron"
    if errores:
        texto += f"; {len(errores)} fila(s) con error, por ejemplo: " + " | ".join(errores[:5])
    return {"exito": creados > 0 or not errores, "resultado": texto + "."}


# ─── Plantillas ──────────────────────────────────────────────────────────────

def _libro_plantilla(d: Destino, columnas: List[dict]) -> bytes:
    """El mismo Excel que baja la pantalla de cargue masivo (hoja Datos con una
    fila de ejemplo, hoja Instrucciones), más listas desplegables donde la
    columna solo admite ciertos valores."""
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation

    libro = Workbook()
    hoja = libro.active
    hoja.title = "Datos"
    hoja.append([c["titulo"] + (" *" if c.get("requerida") else "") for c in columnas])
    hoja.append([c.get("ejemplo") or "" for c in columnas])
    for i, c in enumerate(columnas, start=1):
        celda = hoja.cell(row=1, column=i)
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="1F4E79" if c.get("requerida") else "5B7A99")
        hoja.column_dimensions[get_column_letter(i)].width = max(16, len(c["titulo"]) + 6)
        if c.get("opciones"):
            lista = ",".join(str(o) for o in c["opciones"])
            if len(lista) <= 250:   # límite de Excel para una lista escrita en la validación
                v = DataValidation(type="list", formula1=f'"{lista}"', allow_blank=True,
                                   error="Elija un valor de la lista.", errorTitle=c["titulo"])
                hoja.add_data_validation(v)
                v.add(f"{get_column_letter(i)}2:{get_column_letter(i)}5000")
    hoja.freeze_panes = "A2"

    ayuda = libro.create_sheet("Instrucciones")
    pasos = ["1. Escriba una fila por registro, debajo de los encabezados.",
             "2. Borre la fila de ejemplo antes de cargar el archivo.",
             "3. Las columnas marcadas con * son obligatorias.",
             "4. No cambie los encabezados.",
             ("5. Cada fila se registra por separado: las que tengan error se le informan y las demás se graban."
              if d.por_fila else "5. Lo que ya exista se omite: puede volver a cargar el archivo corregido."),
             "6. Cuando lo tenga listo, adjúntelo en el chat de TittanBot y él lo carga."]
    for fila in [[d.titulo], [], ["Cómo llenar este archivo"], *[[p] for p in pasos], [],
                 ["Columna", "Obligatoria", "Qué va aquí", "Valores admitidos"]]:
        ayuda.append(fila)
    ayuda["A1"].font = Font(bold=True, size=13)
    ayuda["A3"].font = Font(bold=True)
    for celda in ayuda[ayuda.max_row]:
        celda.font = Font(bold=True)
    for c in columnas:
        ayuda.append([c["titulo"], "Sí" if c.get("requerida") else "No", c.get("ayuda") or "",
                      ", ".join(str(o) for o in c.get("opciones") or [])])
    for letra, ancho in zip("ABCD", (28, 12, 70, 50)):
        ayuda.column_dimensions[letra].width = ancho
    b = io.BytesIO()
    libro.save(b)
    return b.getvalue()


async def plantilla(ctx: Contexto, a: dict) -> Dict[str, Any]:
    """Entrega la plantilla de un cargue como descarga en el chat; sin destino,
    lista los cargues que el perfil del usuario puede hacer."""
    import asyncio
    from app.core.tittanbot import reportes
    if not a.get("destino"):
        return {"cargues_disponibles": {k: d.titulo for k, d in DESTINOS.items() if _puede(ctx, d)}}
    try:
        d = _destino(ctx, a["destino"])
        columnas = await _plantilla(ctx, d)
    except ValueError as ex:
        return {"error": str(ex)}
    contenido = await asyncio.to_thread(_libro_plantilla, d, columnas)
    nombre = f"Plantilla - {d.titulo.split('(')[0].strip().replace(':', ' -')}.xlsx"
    await reportes._guardar(ctx, contenido, nombre,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return {"listo": True, "archivo": nombre, "obligatorias": [c["titulo"] for c in columnas if c.get("requerida")],
            "opcionales": [c["titulo"] for c in columnas if not c.get("requerida")],
            "nota": "El usuario ya tiene el botón de descarga en el chat; que la llene y la adjunte aquí mismo."}
