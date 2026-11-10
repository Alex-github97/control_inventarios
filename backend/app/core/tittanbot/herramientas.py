"""
Las herramientas de TittanBot: lo que puede consultar y lo que puede hacer.

DOS CLASES, DOS CAMINOS
  · Consultas: SQL compacto dentro del servidor, en el esquema de la empresa.
    Las listas de la API devuelven cientos de filas completas —la de activos,
    miles—; pasarle eso al modelo es lento y caro. Acá cada consulta trae el
    total y una muestra corta con los campos que importan.
  · Acciones (crear una OT, cambiar su estado, abrir un ticket): van por la
    propia API, con el token del usuario (`ejecutor.llamar_api`), así heredan
    TODAS las reglas del endpoint —consecutivos, validaciones, el permiso del
    perfil del middleware—. Y nunca se ejecutan sin que el usuario pulse
    «Confirmar» en la tarjeta: lo hace cumplir el motor, no el modelo.

EL PERMISO
Cada herramienta declara las claves de perfil que la abren —las mismas de
`permisos_ruta.py`—. Al modelo solo se le ofrecen las que el usuario tiene, y el
ejecutor lo vuelve a verificar antes de correrla.
"""
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from sqlalchemy import text

ESTADOS_ABIERTOS = ("PENDIENTE", "EN_PROCESO", "EN_EJECUCION")
ESTADOS_OT = ["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA"]
PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"]
TIPOS_OT = ["CORRECTIVA", "PREVENTIVA", "PREDICTIVA", "INSPECCION"]


@dataclass
class Contexto:
    db: Any                      # sesión ya apuntada al esquema de la empresa
    usuario: Any
    esquema: str
    headers: Dict[str, str]
    descargas: List[dict] = field(default_factory=list)   # archivos armados en el turno
    conversacion_id: Optional[int] = None


@dataclass
class Herramienta:
    nombre: str
    descripcion: str
    esquema: dict
    permiso: Tuple[str, ...] = ()        # vacío = cualquiera con el bot
    destructiva: bool = False
    # Consultas: corre y devuelve un dict para el modelo.
    consultar: Optional[Callable[[Contexto, dict], Awaitable[dict]]] = None
    # Acciones: arma (método, ruta, cuerpo) para la API, y un resumen para la tarjeta.
    construir: Optional[Callable[[dict], Tuple[str, str, Optional[dict]]]] = None
    resumir: Optional[Callable[[Contexto, dict], Awaitable[str]]] = None
    # Acciones de varios pasos (drenar y abrir carga, leer y reescribir una OT,
    # importar un Excel): hacen sus propias llamadas a la API y devuelven
    # {exito, resultado}. Si está, reemplaza a `construir`.
    accion: Optional[Callable[[Contexto, dict], Awaitable[dict]]] = None

    def para_modelo(self) -> dict:
        return {"name": self.nombre, "description": self.descripcion, "input_schema": self.esquema}


def _obj(props: dict, requeridos: List[str] = ()) -> dict:
    return {"type": "object", "properties": props, "required": list(requeridos),
            "additionalProperties": False}


def rol_de(u) -> str:
    r = getattr(u, "rol", "") or ""
    return r.value if hasattr(r, "value") else str(r)


def _nombre_usuario(u) -> str:
    return (getattr(u, "nombre_completo", None) or getattr(u, "username", "") or "").strip()


def _fecha(v) -> Optional[str]:
    return v.strftime("%Y-%m-%d") if v else None


async def _filas(db, sql: str, params: dict) -> List[dict]:
    return [dict(r._mapping) for r in (await db.execute(text(sql), params)).all()]


def _limpio(d: dict) -> dict:
    return {k: v for k, v in d.items() if v not in (None, "", [], {})}


# ═════════════════════════════════════════════════════════════════════════════
# CONSULTAS
# ═════════════════════════════════════════════════════════════════════════════

async def _mi_dia(c: Contexto, a: dict) -> dict:
    """Lo pendiente del usuario hoy, de los módulos que puede ver."""
    from app.core.permisos_ruta import permitido
    rol, permisos = rol_de(c.usuario), (getattr(c.usuario, "permisos", None) or {})
    salida: Dict[str, Any] = {"hoy": datetime.now().strftime("%Y-%m-%d")}
    if permitido(rol, permisos, ("eam",)):
        nombre = _nombre_usuario(c.usuario)
        mias = await _filas(c.db, """
            SELECT o.numero, o.estado, o.prioridad, o.descripcion, a.codigo AS placa,
                   o.fecha_requerida
              FROM eam_orden_trabajo o JOIN eam_activo a ON a.id = o.activo_id
             WHERE o.estado = ANY(:abiertos)
               AND (o.tecnico_asignado ILIKE :n OR o.tecnico_asignado ILIKE :u)
             ORDER BY o.fecha_requerida NULLS LAST, o.id DESC LIMIT 8""",
            {"abiertos": list(ESTADOS_ABIERTOS), "n": f"%{nombre}%" if nombre else "-",
             "u": getattr(c.usuario, "username", "-")})
        vencidas = await _filas(c.db, """
            SELECT count(*) AS n FROM eam_orden_trabajo
             WHERE estado = ANY(:abiertos) AND fecha_requerida < now()""",
            {"abiertos": list(ESTADOS_ABIERTOS)})
        abiertas = await _filas(c.db, """
            SELECT prioridad, count(*) AS n FROM eam_orden_trabajo
             WHERE estado = ANY(:abiertos) GROUP BY prioridad""", {"abiertos": list(ESTADOS_ABIERTOS)})
        salida["ordenes_asignadas_a_mi"] = [{**o, "fecha_requerida": _fecha(o["fecha_requerida"]),
                                             "descripcion": (o["descripcion"] or "")[:90]} for o in mias]
        salida["ordenes_abiertas_por_prioridad"] = {r["prioridad"] or "SIN": r["n"] for r in abiertas}
        salida["ordenes_vencidas"] = vencidas[0]["n"] if vencidas else 0
        try:
            from app.api.v1.endpoints.lubricacion_analitica import pendientes
            pend = await pendientes(db=c.db)
            venc = [p for p in pend if p["estado"] == "VENCIDO"]
            salida["muestras_aceite"] = {
                "vencidas": len(venc),
                "proximas": sum(1 for p in pend if p["estado"] == "PROXIMO"),
                "primeras_vencidas": [f"{p['activo']} · {p['compartimento']} ({p['avance_pct']} %)"
                                      for p in venc[:5]],
            }
        except Exception:   # noqa: BLE001 — sin lubricación configurada no pasa nada
            pass
    alertas = await _filas(c.db, "SELECT count(*) AS n FROM alertas WHERE resuelta = false", {})
    salida["alertas_sin_resolver"] = alertas[0]["n"] if alertas else 0
    return salida


async def _buscar_activos(c: Contexto, a: dict) -> dict:
    texto = (a.get("texto") or "").strip()
    filas = await _filas(c.db, """
        SELECT a.id, a.codigo, a.placa, a.nombre, a.marca, a.linea, a.tipo_activo, a.estado,
               a.odometro_actual, a.horometro_actual
          FROM eam_activo a
         WHERE a.activo = true AND (a.codigo ILIKE :t OR a.placa ILIKE :t OR a.nombre ILIKE :t
                                    OR a.marca ILIKE :t OR a.linea ILIKE :t)
         ORDER BY (a.codigo ILIKE :exacto OR a.placa ILIKE :exacto) DESC, a.codigo
         LIMIT 10""", {"t": f"%{texto}%", "exacto": texto})
    total = await _filas(c.db, """SELECT count(*) AS n FROM eam_activo a WHERE a.activo = true AND
        (a.codigo ILIKE :t OR a.placa ILIKE :t OR a.nombre ILIKE :t OR a.marca ILIKE :t OR a.linea ILIKE :t)""",
        {"t": f"%{texto}%"})
    return {"total": total[0]["n"], "muestra": filas}


def _filtro_ordenes(a: dict, usuario) -> Tuple[str, dict]:
    cond, p = ["1=1"], {}
    if a.get("placa"):
        cond.append("(a.codigo ILIKE :placa OR a.placa ILIKE :placa)"); p["placa"] = a["placa"].strip()
    if a.get("estado"):
        if a["estado"] == "ABIERTAS":
            cond.append("o.estado = ANY(:abiertos)"); p["abiertos"] = list(ESTADOS_ABIERTOS)
        else:
            cond.append("o.estado = :estado"); p["estado"] = a["estado"]
    if a.get("prioridad"):
        cond.append("o.prioridad = :prioridad"); p["prioridad"] = a["prioridad"]
    if a.get("tipo_ot"):
        cond.append("o.tipo_ot = :tipo"); p["tipo"] = a["tipo_ot"]
    if a.get("solo_vencidas"):
        cond.append("o.estado = ANY(:abiertos) AND o.fecha_requerida < now()"); p["abiertos"] = list(ESTADOS_ABIERTOS)
    if a.get("asignadas_a_mi"):
        cond.append("o.tecnico_asignado ILIKE :yo"); p["yo"] = f"%{_nombre_usuario(usuario)}%"
    if a.get("dias"):
        cond.append("o.created_at >= :desde"); p["desde"] = datetime.now() - timedelta(days=int(a["dias"]))
    return " AND ".join(cond), p


async def _consultar_ordenes(c: Contexto, a: dict) -> dict:
    donde, p = _filtro_ordenes(a, c.usuario)
    base = f"FROM eam_orden_trabajo o JOIN eam_activo a ON a.id = o.activo_id WHERE {donde}"
    total = await _filas(c.db, f"SELECT count(*) AS n, coalesce(sum(o.costo_total),0) AS costo {base}", p)
    filas = await _filas(c.db, f"""
        SELECT o.id, o.numero, a.codigo AS placa, o.estado, o.prioridad, o.tipo_ot,
               left(o.descripcion, 100) AS descripcion, o.tecnico_asignado, o.fecha_requerida,
               o.created_at AS creada, o.costo_total
          {base} ORDER BY o.id DESC LIMIT :lim""", {**p, "lim": min(int(a.get("limite") or 10), 25)})
    for f in filas:
        f["fecha_requerida"], f["creada"] = _fecha(f["fecha_requerida"]), _fecha(f["creada"])
    return {"total": total[0]["n"], "costo_total": round(float(total[0]["costo"] or 0)), "muestra": filas}


async def _ver_orden(c: Contexto, a: dict) -> dict:
    filas = await _filas(c.db, """
        SELECT o.id, o.numero, a.codigo AS placa, a.nombre AS activo, o.estado, o.prioridad, o.tipo_ot,
               o.descripcion, o.tecnico_asignado, o.fecha_requerida, o.fecha_inicio, o.fecha_fin,
               o.costo_mano_obra, o.costo_repuestos, o.costo_servicios, o.costo_total,
               o.tiempo_estimado_horas, o.tiempo_real_horas, o.observaciones, o.creado_por
          FROM eam_orden_trabajo o JOIN eam_activo a ON a.id = o.activo_id
         WHERE o.numero ILIKE :n OR o.id::text = :n LIMIT 1""", {"n": str(a.get("numero") or "").strip()})
    if not filas:
        return {"error": "No hay una orden con ese número."}
    f = filas[0]
    for k in ("fecha_requerida", "fecha_inicio", "fecha_fin"):
        f[k] = _fecha(f[k])
    return f


async def _indicadores_cmms(c: Contexto, a: dict) -> dict:
    dias = max(7, min(int(a.get("dias") or 30), 730))
    desde = datetime.now() - timedelta(days=dias)
    r = (await _filas(c.db, """
        SELECT count(*) FILTER (WHERE o.created_at >= :d) AS creadas,
               count(*) FILTER (WHERE o.estado IN ('COMPLETADA','CERRADA') AND o.fecha_fin >= :d) AS cerradas,
               count(*) FILTER (WHERE o.estado = ANY(:ab)) AS abiertas,
               count(*) FILTER (WHERE o.estado = ANY(:ab) AND o.fecha_requerida < now()) AS vencidas,
               count(*) FILTER (WHERE o.created_at >= :d AND o.tipo_ot = 'CORRECTIVA') AS correctivas,
               coalesce(sum(o.costo_total) FILTER (WHERE o.fecha_fin >= :d), 0) AS costo,
               avg(o.tiempo_real_horas) FILTER (WHERE o.fecha_fin >= :d AND o.tipo_ot = 'CORRECTIVA'
                                                AND o.tiempo_real_horas > 0) AS mttr
          FROM eam_orden_trabajo o""", {"d": desde, "ab": list(ESTADOS_ABIERTOS)}))[0]
    activos = (await _filas(c.db, "SELECT count(*) AS n FROM eam_activo WHERE activo = true", {}))[0]["n"]
    creadas = r["creadas"] or 0
    return {
        "periodo_dias": dias, "activos": activos,
        "ordenes_creadas": creadas, "ordenes_cerradas": r["cerradas"], "abiertas_hoy": r["abiertas"],
        "vencidas_hoy": r["vencidas"],
        "porcentaje_correctivas": round(100 * (r["correctivas"] or 0) / creadas, 1) if creadas else None,
        "costo_cerradas": round(float(r["costo"] or 0)),
        "mttr_horas": round(float(r["mttr"]), 1) if r["mttr"] else None,
        "nota": "MTTR = promedio de horas reales de las correctivas cerradas en el periodo.",
    }


async def _lubricacion_equipo(c: Contexto, a: dict) -> dict:
    from app.api.v1.endpoints.lubricacion_flota import FiltroFlota
    from app.api.v1.endpoints.lubricacion_interpretacion import tablero
    placa = (a.get("placa") or "").strip()
    f = FiltroFlota(marca=None, linea=None, modelo=None, tipo=None, motor=None, placa=placa, compartimento=None)
    t = await tablero(dias=730, solo_con_hallazgo=False, estado=None, limite=6, desplazamiento=0, f=f, db=c.db)
    filas = sorted(t["filas"], key=lambda x: x["fecha_toma"], reverse=True)[:5]
    if not filas:
        return {"resultado": f"No hay muestras de aceite de {placa} en los últimos dos años."}
    return {"muestras": [{
        "numero": x["numero"], "fecha": _fecha(x["fecha_toma"]), "compartimento": x["compartimento"],
        "severidad": x["severidad_norma"], "hallazgo": x["patron"], "parametros_fuera": x["tipo"],
        "que_pasa": x["lectura"][:260], "que_hacer": (x["accion_sugerida"] or "")[:260],
        "vida_aceite": x["horas_aceite"], "unidad_vida": x["unidad_vida"],
    } for x in filas]}


async def _pendientes_lubricacion(c: Contexto, a: dict) -> dict:
    from app.api.v1.endpoints.lubricacion_analitica import pendientes
    pend = await pendientes(db=c.db)
    estado = a.get("estado")
    if estado:
        pend = [p for p in pend if p["estado"] == estado]
    return {"total": len(pend), "muestra": [{
        "placa": p["activo"], "compartimento": p["compartimento"], "estado": p["estado"],
        "desde_ultima": p["desde_ultima"], "frecuencia": p["frecuencia_muestreo"], "unidad": p["unidad"],
        "avance_pct": p["avance_pct"], "ultima_muestra": _fecha(p["ultima_muestra"]),
    } for p in pend[:12]]}


async def _guia(c: Contexto, a: dict) -> dict:
    from app.core.tittanbot.guia import buscar
    return {"guia": buscar(a.get("tema") or "")}


async def _generar_reporte(c: Contexto, a: dict) -> dict:
    from app.core.tittanbot import reportes
    r = await reportes.generar(c, a)
    # El enlace lo pinta el chat; el modelo solo necesita saber que quedó listo.
    return {k: v for k, v in r.items() if k not in ("token",)}


# ═════════════════════════════════════════════════════════════════════════════
# ACCIONES (con tarjeta de confirmación)
# ═════════════════════════════════════════════════════════════════════════════

def _construir_ot(a: dict):
    cuerpo = _limpio({
        "activo_id": int(a["activo_id"]), "descripcion": a["descripcion"],
        "tipo_ot": a.get("tipo_ot") or "CORRECTIVA", "prioridad": a.get("prioridad") or "MEDIA",
        "tecnico_asignado": a.get("tecnico_asignado"), "fecha_requerida": a.get("fecha_requerida"),
        "observaciones": a.get("observaciones"), "es_falla": bool(a.get("es_falla")),
    })
    return "POST", "/api/v1/eam/ots", cuerpo


async def _resumen_ot(c: Contexto, a: dict) -> str:
    act = await _filas(c.db, "SELECT codigo, nombre FROM eam_activo WHERE id = :i", {"i": int(a.get("activo_id") or 0)})
    equipo = f"{act[0]['codigo']} · {act[0]['nombre']}" if act else f"activo {a.get('activo_id')} (NO EXISTE)"
    partes = [f"Crear orden {a.get('tipo_ot') or 'CORRECTIVA'} · prioridad {a.get('prioridad') or 'MEDIA'}",
              f"Equipo: {equipo}", f"Trabajo: {a.get('descripcion')}",
              f"Técnico: {a['tecnico_asignado']}" if a.get("tecnico_asignado") else None,
              f"Para el: {a['fecha_requerida'][:10]}" if a.get("fecha_requerida") else None]
    return " · ".join(p for p in partes if p)


def _construir_estado(a: dict):
    cuerpo = _limpio({"estado": a["estado"], "observaciones": a.get("observaciones"),
                      "tiempo_real_horas": a.get("tiempo_real_horas")})
    if a["estado"] == "EN_PROCESO":
        cuerpo["fecha_inicio"] = datetime.now().isoformat(timespec="seconds")
    if a["estado"] == "COMPLETADA":
        cuerpo["fecha_fin"] = datetime.now().isoformat(timespec="seconds")
    return "PUT", f"/api/v1/eam/ots/{int(a['ot_id'])}/estado", cuerpo


async def _resumen_estado(c: Contexto, a: dict) -> str:
    ot = await _filas(c.db, """SELECT o.numero, o.estado, a.codigo FROM eam_orden_trabajo o
        JOIN eam_activo a ON a.id = o.activo_id WHERE o.id = :i""", {"i": int(a.get("ot_id") or 0)})
    cual = f"{ot[0]['numero']} ({ot[0]['codigo']}), hoy {ot[0]['estado']}" if ot else f"orden {a.get('ot_id')} (NO EXISTE)"
    partes = [f"Pasar la orden {cual} a {a.get('estado')}",
              f"Observaciones: {a['observaciones']}" if a.get("observaciones") else None,
              f"Horas reales: {a['tiempo_real_horas']}" if a.get("tiempo_real_horas") else None]
    return " · ".join(p for p in partes if p)


def _construir_ticket(a: dict):
    return "POST", "/api/v1/soporte/tickets", _limpio({
        "asunto": a["asunto"], "descripcion": a["descripcion"], "modulo": a.get("modulo"),
        "impacto": a.get("impacto") or "MOLESTIA", "categoria": "TITTANBOT"})


async def _resumen_ticket(c: Contexto, a: dict) -> str:
    return f"Abrir ticket de soporte: «{a.get('asunto')}» · impacto {a.get('impacto') or 'MOLESTIA'}"


# ═════════════════════════════════════════════════════════════════════════════
# EL CATÁLOGO
# ═════════════════════════════════════════════════════════════════════════════

CATALOGO: List[Herramienta] = [
    Herramienta(
        "mi_dia",
        "Lo pendiente del usuario hoy: órdenes de trabajo asignadas a él, órdenes vencidas, muestras de "
        "aceite vencidas y alertas sin resolver. Úsala cuando pregunte qué tiene pendiente, por dónde empezar "
        "o cómo va su día.",
        _obj({}), consultar=_mi_dia),
    Herramienta(
        "buscar_activos",
        "Busca equipos/vehículos del CMMS por placa, código, nombre, marca o línea. Devuelve el id (necesario "
        "para crear órdenes), y la lectura actual de odómetro u horómetro. Úsala SIEMPRE antes de referirte a un "
        "equipo por su id.",
        _obj({"texto": {"type": "string", "description": "Placa, código o parte del nombre"}}, ["texto"]),
        permiso=("eam",), consultar=_buscar_activos),
    Herramienta(
        "consultar_ordenes",
        "Lista órdenes de trabajo del CMMS con filtros; devuelve el total, el costo y una muestra. Para contar, "
        "usa el total, no la muestra.",
        _obj({
            "placa": {"type": "string"},
            "estado": {"type": "string", "enum": ["ABIERTAS", *ESTADOS_OT, "CERRADA"]},
            "prioridad": {"type": "string", "enum": PRIORIDADES},
            "tipo_ot": {"type": "string", "enum": TIPOS_OT},
            "solo_vencidas": {"type": "boolean"},
            "asignadas_a_mi": {"type": "boolean"},
            "dias": {"type": "integer", "description": "Solo las creadas en los últimos N días"},
            "limite": {"type": "integer", "description": "Filas de muestra, máximo 25"},
        }),
        permiso=("eam",), consultar=_consultar_ordenes),
    Herramienta(
        "ver_orden", "El detalle completo de una orden de trabajo por su número (OT-2026-00123) o id.",
        _obj({"numero": {"type": "string"}}, ["numero"]), permiso=("eam",), consultar=_ver_orden),
    Herramienta(
        "indicadores_cmms",
        "Indicadores del mantenimiento en un periodo, ya calculados: órdenes creadas y cerradas, abiertas y "
        "vencidas hoy, % de correctivas, costo y MTTR. Reporta las cifras tal como vienen.",
        _obj({"dias": {"type": "integer", "description": "Periodo en días; 30 por omisión"}}),
        permiso=("eam",), consultar=_indicadores_cmms),
    Herramienta(
        "lubricacion_equipo",
        "Las últimas muestras de aceite de un equipo con su interpretación según norma: severidad, qué está "
        "pasando y qué hacer.",
        _obj({"placa": {"type": "string"}}, ["placa"]), permiso=("eam",), consultar=_lubricacion_equipo),
    Herramienta(
        "pendientes_lubricacion",
        "Compartimentos a los que les toca muestra de aceite: VENCIDO, PROXIMO (más del 90 % de la frecuencia) o "
        "SIN_HISTORIA (nunca muestreados).",
        _obj({"estado": {"type": "string", "enum": ["VENCIDO", "PROXIMO", "SIN_HISTORIA"]}}),
        permiso=("eam",), consultar=_pendientes_lubricacion),
    Herramienta(
        "guia_de_uso",
        "Cómo se hace algo en TittanWare (dónde está una pantalla, pasos de un proceso). Úsala para preguntas de "
        "soporte del tipo «¿cómo registro…?», «¿dónde veo…?».",
        _obj({"tema": {"type": "string"}}, ["tema"]), consultar=_guia),
    Herramienta(
        "generar_reporte",
        "Genera y le entrega al usuario un archivo (PDF o Excel) de los informes que YA existen en la "
        "plataforma; el usuario recibe el botón de descarga en el chat. Úsala SIEMPRE que pida un informe, un "
        "PDF, un Excel, o que le manden, envíen, descarguen o exporten algo; nunca le digas que no puedes "
        "enviar archivos. Tipos:\n"
        "- ordenes_excel: Excel de órdenes de trabajo (filtros: placa, estado, prioridad, solo_vencidas, dias).\n"
        "- lubricacion_flota_pdf: informe del programa de análisis de aceite de la flota, firmado por el asesor "
        "(dias; marca opcional).\n"
        "- lubricacion_muestra_pdf: informe de UNA muestra de aceite (numero de la muestra, p. ej. LUB-0004832).\n"
        "- llantas_flota_pdf: informe de estado de llantas de la flota con la última inspección: novedades, "
        "profundidad, presión y sugerencias (filtros: placa, marca de llanta, tipo_vehiculo, desde, hasta).\n"
        "- llantas_rendimiento_pdf: informes de rendimiento de llantas; informe_llantas = TABLERO (resumen), "
        "CPK (costo por km), KM (km por vida), KM_MM (km por milímetro), VIDAS (detalle por vida) o "
        "COMPOSICION (parque montado por marca y medida); desde, hasta y marca opcionales.\n"
        "- causa_raiz_pdf: informe del análisis de causa raíz de una falla (numero de la OT, o placa).\n"
        "Si el usuario no dice cuál, elige el más cercano a lo que pidió o pregunta en una frase. Después "
        "confirma en una frase que quedó listo; no describas su contenido.",
        _obj({
            "tipo": {"type": "string", "enum": ["ordenes_excel", "lubricacion_flota_pdf", "lubricacion_muestra_pdf",
                                               "llantas_flota_pdf", "llantas_rendimiento_pdf", "causa_raiz_pdf"]},
            "informe_llantas": {"type": "string", "enum": ["TABLERO", "CPK", "KM", "KM_MM", "VIDAS", "COMPOSICION"]},
            "dias": {"type": "integer"}, "marca": {"type": "string"}, "numero": {"type": "string"},
            "placa": {"type": "string"}, "tipo_vehiculo": {"type": "string"},
            "desde": {"type": "string", "description": "AAAA-MM-DD"},
            "hasta": {"type": "string", "description": "AAAA-MM-DD"},
            "estado": {"type": "string", "enum": ["ABIERTAS", *ESTADOS_OT, "CERRADA"]},
            "prioridad": {"type": "string", "enum": PRIORIDADES}, "solo_vencidas": {"type": "boolean"},
        }, ["tipo"]),
        permiso=("eam",), consultar=_generar_reporte),
    # ── acciones ─────────────────────────────────────────────────────────────
    Herramienta(
        "crear_orden",
        "Crea una orden de trabajo. Necesita el activo_id (búscalo con buscar_activos) y la descripción del "
        "trabajo. El usuario verá una tarjeta para confirmar antes de que se cree.",
        _obj({
            "activo_id": {"type": "integer"},
            "descripcion": {"type": "string", "description": "Qué hay que hacer o qué falla tiene"},
            "tipo_ot": {"type": "string", "enum": TIPOS_OT},
            "prioridad": {"type": "string", "enum": PRIORIDADES},
            "tecnico_asignado": {"type": "string"},
            "fecha_requerida": {"type": "string", "description": "AAAA-MM-DD"},
            "observaciones": {"type": "string"},
            "es_falla": {"type": "boolean", "description": "True si el equipo falló (cuenta para confiabilidad)"},
        }, ["activo_id", "descripcion"]),
        permiso=("eam",), destructiva=True, construir=_construir_ot, resumir=_resumen_ot),
    Herramienta(
        "cambiar_estado_orden",
        "Inicia (EN_PROCESO), completa (COMPLETADA) o cancela (CANCELADA) una orden. Necesita el id de la orden "
        "(consúltalo con ver_orden). Al completar, pide las horas reales si el usuario no las dio.",
        _obj({
            "ot_id": {"type": "integer"},
            "estado": {"type": "string", "enum": ["EN_PROCESO", "COMPLETADA", "CANCELADA"]},
            "observaciones": {"type": "string"},
            "tiempo_real_horas": {"type": "number"},
        }, ["ot_id", "estado"]),
        permiso=("eam",), destructiva=True, construir=_construir_estado, resumir=_resumen_estado),
    Herramienta(
        "crear_ticket_soporte",
        "Abre un ticket en la mesa de ayuda de TittanWare cuando el usuario reporta un error o algo que tú no "
        "puedes resolver. Resume en la descripción lo que intentó y qué pasó.",
        _obj({
            "asunto": {"type": "string"}, "descripcion": {"type": "string"},
            "modulo": {"type": "string", "description": "Módulo afectado, p. ej. CMMS"},
            "impacto": {"type": "string", "enum": ["CONSULTA", "MOLESTIA", "BLOQUEA_TAREA", "OPERACION_DETENIDA"]},
        }, ["asunto", "descripcion"]),
        destructiva=True, construir=_construir_ticket, resumir=_resumen_ticket),
]

def disponibles(usuario) -> List[Herramienta]:
    """Las herramientas que el perfil del usuario abre, en orden fijo (para la caché)."""
    from app.core.permisos_ruta import permitido
    rol, permisos = rol_de(usuario), (getattr(usuario, "permisos", None) or {})
    return [h for h in CATALOGO if not h.permiso or permitido(rol, permisos, h.permiso)]


def resultado_corto(datos: Any, limite: int = 6000) -> str:
    texto = json.dumps(datos, ensure_ascii=False, default=str)
    return texto if len(texto) <= limite else texto[:limite] + "…(recortado)"


# Las herramientas de cada módulo viven en su propio archivo y se suman acá, al
# final: esos archivos importan el ejecutor, que a su vez importa de este módulo
# (resultado_corto incluido), así que todo lo de arriba tiene que existir ya.
from app.core.tittanbot import cmms as _cmms  # noqa: E402
from app.core.tittanbot import tms as _tms  # noqa: E402
from app.core.tittanbot import wms as _wms  # noqa: E402

CATALOGO += _cmms.HERRAMIENTAS + _tms.HERRAMIENTAS + _wms.HERRAMIENTAS

POR_NOMBRE: Dict[str, Herramienta] = {h.nombre: h for h in CATALOGO}
