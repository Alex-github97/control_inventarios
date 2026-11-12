"""
Lubr-IA: el chat de análisis de aceite del módulo de lubricación.

Usa el mismo motor que TittanBot (modelo, cupos, historial, confirmación de
acciones), pero con su propia instrucción y solo las herramientas de
lubricación. Sus conversaciones van aparte (`tittanbot_conversacion.agente`).

LA REGLA DE ORO
Lubr-IA no interpreta «de memoria»: cada valor que le den pasa por
`interpretar_resultados`, que corre el MISMO evaluador de la plataforma
(normas_lubricacion: Tormos, ASTM, límites de la propia flota y los ajustes de
la empresa). Así lo que dice el chat y lo que dice el informe son lo mismo, y
el modelo explica y conversa sobre un diagnóstico que no inventó.
"""
from typing import Any, Dict, List

from sqlalchemy import select, text

from app.core.tittanbot.herramientas import Contexto, Herramienta, _obj

AGENTE = "lubria"

PROMPT = """Eres Lubr-IA, el analista de aceite de TittanWare. Hablas con el equipo de mantenimiento de una \
empresa cliente y les ayudas a interpretar análisis de aceite usado (motor diésel sobre todo, también \
hidráulicos, transmisiones y diferenciales) y a decidir qué hacer.

Cómo trabajas:
- Cuando te den resultados de laboratorio (escritos, pegados de un boletín o en un Excel adjunto), extrae los \
valores con su unidad y llama SIEMPRE a interpretar_resultados antes de opinar. Ese es el criterio de la \
plataforma —Tormos (Diagnóstico de motores diésel mediante el análisis del aceite usado), ASTM y los límites \
de la propia flota—, y tu explicación debe coincidir con él. Nunca inventes límites ni conclusiones que la \
herramienta no respalde. Si falta un dato importante (tipo de compartimento, grado SAE, km o horas del \
aceite), pregúntalo o dilo como limitación.
- Si te nombran una muestra por su número, usa ver_muestra; si te nombran un equipo, buscar_activos y \
lubricacion_equipo para ver su historia: la tendencia pesa más que el valor suelto.
- Si preguntan por qué un límite es ese, usa criterio_lubricacion y cita la fuente (tabla o norma).
- Para registrar una muestra, un cambio de aceite o un relleno, usa las herramientas de registro: el sistema \
muestra una tarjeta para Confirmar antes de ejecutar.

Cómo respondes:
- Primero el veredicto en una línea (Normal, Precaución o Crítico) y el modo de falla probable.
- Luego, en lista corta: qué parámetros están fuera y contra qué límite; qué significa físicamente (de qué \
componente sale cada metal: hierro de camisas y cigüeñal, cromo de segmentos, cobre-plomo-estaño de \
cojinetes, aluminio de pistones, silicio con aluminio es polvo); y qué hacer, en orden de urgencia.
- Distingue contaminación (agua, combustible, glicol, polvo), degradación del aceite (viscosidad, TBN, \
oxidación) y desgaste. Señala cuando una conclusión depende de confirmar en la próxima muestra.
- Español de Colombia, trato de usted, corto y técnico. No recomiendes desarmar un motor por un solo valor \
sin tendencia que lo respalde."""

# Las herramientas que ve Lubr-IA (las de lubricación existentes + las propias).
NOMBRES = (
    "interpretar_resultados", "ver_muestra", "criterio_lubricacion",
    "buscar_activos", "lubricacion_equipo", "lubricacion_de_equipo", "pendientes_lubricacion",
    "catalogo_lubricacion", "generar_reporte", "ver_adjunto",
    "registrar_muestra_aceite", "registrar_cambio_aceite", "registrar_relleno",
)

PARAMETROS = ("fe", "cr", "sn", "pb", "cu", "al", "ni", "mo", "si", "na", "k", "b", "mg", "ca", "zn", "p",
              "visc100", "tbn", "tan", "agua", "combustible", "hollin", "oxidacion", "nitracion",
              "sulfatacion", "glicol", "pq")
UNIDADES = {"visc100": "cSt", "tbn": "mgKOH/g", "tan": "mgKOH/g", "agua": "%", "combustible": "%",
            "hollin": "%", "oxidacion": "Abs/cm", "nitracion": "Abs/cm", "sulfatacion": "Abs/cm",
            "glicol": "ppm", "pq": "—"}


async def _poblacion(c: Contexto, tipo: str) -> Dict[str, List[float]]:
    """Los metales de desgaste medidos en la familia, para los límites de la
    propia flota (ASTM D7720). Solo columnas, agregadas por código."""
    from app.core.normas_lubricacion import GRUPO_DESGASTE
    filas = (await c.db.execute(text("""
        SELECT p.codigo, r.valor FROM eam_lube_resultado r
        JOIN eam_lube_parametro p ON p.id = r.parametro_id
        JOIN eam_lube_muestra m ON m.id = r.muestra_id
        JOIN eam_lube_compartimento k ON k.id = m.compartimento_id
        JOIN eam_lube_tipo_compartimento t ON t.id = k.tipo_compartimento_id
        WHERE t.codigo = :t AND m.estado <> 'ANULADA' AND r.valor IS NOT NULL
          AND p.codigo = ANY(:metales) AND m.fecha_toma >= now() - interval '730 days'"""),
        {"t": tipo, "metales": list(GRUPO_DESGASTE)})).all()
    pob: Dict[str, List[float]] = {}
    for cod, v in filas:
        pob.setdefault(cod, []).append(float(v))
    return pob


async def _interpretar(c: Contexto, a: dict) -> dict:
    from app.api.v1.endpoints.lubricacion_flota import _criterio
    from app.core.normas_lubricacion import diagnosticar, evaluar_muestra, limites_estadisticos
    valores = {k: float(v) for k, v in (a.get("valores") or {}).items()
               if k in PARAMETROS and isinstance(v, (int, float))}
    if not valores:
        return {"resultado": "No llegó ningún valor reconocible. Envíe los resultados con su parámetro "
                             "(por ejemplo fe, cu, si, al, tbn, visc100, hollin, agua, combustible)."}
    tipo = (a.get("tipo_compartimento") or "MOT").upper()
    criterio = await _criterio(c.db)
    anteriores: Dict[str, float] = {k: float(v) for k, v in (a.get("anteriores") or {}).items()
                                    if k in PARAMETROS and isinstance(v, (int, float))}
    est = limites_estadisticos(await _poblacion(c, tipo), criterio)
    ev = evaluar_muestra(
        valores=valores, unidades={k: UNIDADES.get(k, "ppm") for k in valores}, anteriores=anteriores,
        tipo_compartimento=tipo, estadisticos=est, grado_sae=a.get("grado_sae"), criterio=criterio,
        tbn_nuevo=a.get("tbn_nuevo"), visc100_nuevo=a.get("visc100_nuevo"))
    regla = diagnosticar(ev, bool(a.get("recien_reparado")), criterio)
    hallazgos = [{
        "parametro": k, "valor": h.get("valor"), "estado": h.get("estado") or "TENDENCIA",
        "limite_precaucion": (h.get("limite") or {}).get("precaucion"),
        "limite_condena": (h.get("limite") or {}).get("condena"),
        "origen_limite": (h.get("limite") or {}).get("criterio"),
        "por_que": ((h.get("limite") or {}).get("porque") or "")[:300],
        "tendencia": (h.get("tendencia") or {}).get("lectura"),
    } for k, h in ev["hallazgos"].items()]
    sin_limite_flota = sorted(m for m in valores if m in {"fe", "cr", "sn", "pb", "cu", "al", "ni", "mo"}
                              and m not in est)
    return {
        "diagnostico": {"codigo": regla["codigo"], "nombre": regla["nombre"], "severidad": regla["severidad"],
                        "criterio": regla.get("criterio"), "que_pasa": regla.get("lectura"),
                        "que_hacer": regla.get("accion"), "fuentes": regla.get("fuentes")},
        "hallazgos": hallazgos,
        "viscosidad": ev.get("desvio_viscosidad"),
        "relacion_al_si": ev.get("relacion_si_al"), "relacion_na_b": ev.get("relacion_na_b"),
        "cruce_tbn_tan": ev.get("cruce_tbn_tan"),
        "nota": ("Sin población suficiente en la flota para límite estadístico de: "
                 + ", ".join(sin_limite_flota) + "; esos metales se juzgan solo por tendencia.")
        if sin_limite_flota else None,
    }


async def _ver_muestra(c: Contexto, a: dict) -> dict:
    from app.api.v1.endpoints.lubricacion_flota import FiltroFlota
    from app.api.v1.endpoints.lubricacion_interpretacion import tablero
    from app.infrastructure.models.eam import EAMActivo
    from app.infrastructure.models.lubricacion import LubeCompartimento, LubeMuestra
    numero = (a.get("numero") or "").strip()
    fila = (await c.db.execute(
        select(LubeMuestra, LubeCompartimento, EAMActivo)
        .join(LubeCompartimento, LubeCompartimento.id == LubeMuestra.compartimento_id)
        .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
        .where(LubeMuestra.numero.ilike(numero)))).first()
    if not fila:
        return {"resultado": f"No encontré la muestra {numero}."}
    m, comp, act = fila
    vals = (await c.db.execute(text(
        "SELECT p.codigo, r.valor, p.unidad FROM eam_lube_resultado r JOIN eam_lube_parametro p "
        "ON p.id = r.parametro_id WHERE r.muestra_id = :m AND r.valor IS NOT NULL"), {"m": m.id})).all()
    placa = act.placa or act.codigo
    f = FiltroFlota(marca=None, linea=None, modelo=None, tipo=None, motor=None, placa=placa, compartimento=None)
    t = await tablero(dias=1825, solo_con_hallazgo=False, estado=None, limite=2000, desplazamiento=0, f=f, db=c.db)
    inter = next((x for x in t["filas"] if x["muestra_id"] == m.id), None)
    return {
        "muestra": m.numero, "fecha": m.fecha_toma.date().isoformat(), "equipo": placa,
        "compartimento": comp.nombre, "vida_aceite": m.horas_aceite, "lectura_equipo": m.medidor_equipo,
        "resultados": {k: (v, u) for k, v, u in vals},
        "interpretacion": {"severidad": inter["severidad_norma"], "hallazgo": inter["patron"],
                           "parametros_fuera": inter["tipo"], "que_pasa": inter["lectura"],
                           "que_hacer": inter["accion_sugerida"]} if inter else None,
        "observaciones": None,
    }


async def _criterio_lub(c: Contexto, a: dict) -> dict:
    from app.api.v1.endpoints.lubricacion_flota import _criterio
    from app.core.normas_lubricacion import FUENTES
    criterio = await _criterio(c.db)
    tipo = (a.get("tipo_compartimento") or "MOT").upper()
    lim = criterio.limites(tipo)
    par = a.get("parametro")
    limites = {k: {"precaucion": v.get("precaucion"), "condena": v.get("condena"), "direccion": v.get("direccion"),
                   "metodo": v.get("metodo"), "origen": v.get("criterio"), "por_que": (v.get("porque") or "")[:400]}
               for k, v in lim.items() if not par or k == par}
    reglas = [{"codigo": r["codigo"], "nombre": r["nombre"], "criterio": r.get("criterio")}
              for r in criterio.reglas()] if not par else []
    return {"limites": limites, "reglas_en_orden": reglas,
            "fuentes": {k: v["titulo"] for k, v in FUENTES.items()},
            "metales_de_desgaste": "Se juzgan contra los percentiles de la propia flota (ASTM D7720, "
                                   "alerta P90 y condena P96 según Tormos) y por tendencia."}


HERRAMIENTAS = [
    Herramienta(
        "interpretar_resultados",
        "Interpreta resultados de un análisis de aceite con el criterio de la plataforma (Tormos, ASTM, límites "
        "de la flota y ajustes de la empresa). Úsala SIEMPRE que el usuario dé valores de laboratorio. "
        "valores: dict con códigos fe, cr, sn, pb, cu, al, ni, mo, si, na, k, b, mg, ca, zn, p (ppm), visc100 "
        "(cSt a 100 °C), tbn y tan (mgKOH/g), agua, combustible y hollin (%), oxidacion, nitracion y "
        "sulfatacion (Abs/cm; si vienen en Abs/0,1 mm multiplíquelas por 100), glicol (ppm), pq. "
        "anteriores: los de la muestra anterior del mismo compartimento, si los hay (para la tendencia).",
        _obj({"valores": {"type": "object", "additionalProperties": {"type": "number"}},
              "tipo_compartimento": {"type": "string", "description": "MOT (motor), HID, TRA, DIF… por defecto MOT"},
              "grado_sae": {"type": "string", "description": "Por ejemplo 15W-40"},
              "tbn_nuevo": {"type": "number"}, "visc100_nuevo": {"type": "number"},
              "anteriores": {"type": "object", "additionalProperties": {"type": "number"}},
              "recien_reparado": {"type": "boolean", "description": "Motor intervenido hace menos de 90 días"}},
             ["valores"]),
        permiso=("eam",), consultar=_interpretar),
    Herramienta(
        "ver_muestra",
        "Una muestra de aceite registrada en la plataforma por su número de boletín: equipo, compartimento, "
        "vida del aceite, todos sus resultados y la interpretación según norma.",
        _obj({"numero": {"type": "string"}}, ["numero"]), permiso=("eam",), consultar=_ver_muestra),
    Herramienta(
        "criterio_lubricacion",
        "El criterio vigente de interpretación: límites de precaución y condena por parámetro con su origen "
        "(tabla de Tormos o norma ASTM) y las reglas de diagnóstico en el orden en que se aplican. Úsala para "
        "explicar por qué un límite es ese.",
        _obj({"parametro": {"type": "string"}, "tipo_compartimento": {"type": "string"}}),
        permiso=("eam",), consultar=_criterio_lub),
]


def filtrar(herramientas: List[Any]) -> List[Any]:
    return [h for h in herramientas if h.nombre in NOMBRES]


def resumen_estado() -> Dict[str, Any]:
    return {"nombre": "Lubr-IA", "herramientas": len(NOMBRES)}
