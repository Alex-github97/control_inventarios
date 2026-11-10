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


async def emparejar(ctx: Contexto, destino: str) -> Dict[str, Any]:
    """Qué columna del archivo va a qué campo del importador."""
    from app.core.permisos_ruta import permitido
    from app.core.tittanbot.herramientas import rol_de
    d = DESTINOS.get(destino)
    if d is None:
        raise ValueError(f"No conozco el destino «{destino}». Opciones: {', '.join(DESTINOS)}.")
    if not permitido(rol_de(ctx.usuario), getattr(ctx.usuario, "permisos", None) or {}, d.permiso):
        raise ValueError(f"Su perfil no tiene permiso para cargar {d.titulo}.")
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
