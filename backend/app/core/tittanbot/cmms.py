"""
TittanBot · el resto del CMMS: lubricación, combustible, órdenes, llantas y los
cargues masivos por Excel adjunto.

Cada acción va por el mismo endpoint que usa la pantalla, con el token del
usuario: las validaciones son las de siempre (el medidor que no retrocede, la
profundidad que no sube, el motivo de drenaje). Y ninguna se ejecuta sin la
tarjeta de confirmación.
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.tittanbot import ejecutor, importar
from app.core.tittanbot.herramientas import (
    PRIORIDADES, Contexto, Herramienta, _fecha, _filas, _limpio, _obj,
)

UNIDAD = {"KM": "km", "HORAS": "h", "DIAS": "días"}


def _hoy() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _cuando(v: Optional[str]) -> str:
    return f"{v[:10]}T08:00:00" if v else _hoy()


async def _resultado(resp) -> Dict[str, Any]:
    ok = 200 <= resp.status_code < 300
    try:
        cuerpo = resp.json()
    except Exception:
        cuerpo = resp.text[:300]
    return {"exito": ok, "resultado": json.dumps(cuerpo if ok else ejecutor._detalle(resp),
                                                 ensure_ascii=False, default=str)[:1500]}


async def _compartimento(ctx: Contexto, cid: int) -> Optional[dict]:
    filas = await _filas(ctx.db, """
        SELECT c.id, c.nombre, a.codigo AS placa, k.id AS carga_id, k.medidor_inicio,
               p.nombre AS producto
          FROM eam_lube_compartimento c JOIN eam_activo a ON a.id = c.activo_id
          LEFT JOIN eam_lube_carga k ON k.compartimento_id = c.id AND k.estado = 'ACTIVA'
          LEFT JOIN eam_lube_producto p ON p.id = k.producto_id
         WHERE c.id = :i""", {"i": int(cid)})
    return filas[0] if filas else None


async def _nombre(ctx: Contexto, tabla: str, i) -> Optional[str]:
    if not i:
        return None
    f = await _filas(ctx.db, f"SELECT nombre FROM {tabla} WHERE id = :i", {"i": int(i)})
    return f[0]["nombre"] if f else f"id {i} (NO EXISTE)"


# ─── Consultas ───────────────────────────────────────────────────────────────

async def _lubricacion_de_equipo(c: Contexto, a: dict) -> dict:
    from app.api.v1.endpoints.lubricacion_operacion import listar_compartimentos
    act = await _filas(c.db, "SELECT id, codigo FROM eam_activo WHERE codigo ILIKE :p OR placa ILIKE :p LIMIT 1",
                       {"p": (a.get("placa") or "").strip()})
    if not act:
        return {"error": "No hay un equipo con esa placa o código."}
    comps = await listar_compartimentos(activo_id=act[0]["id"], tipo_compartimento_id=None,
                                        solo_criticos=False, db=c.db)
    return {"placa": act[0]["codigo"], "compartimentos": [{
        "compartimento_id": x["id"], "nombre": x["nombre"], "tipo": x.get("tipo_compartimento"),
        "carga_viva": bool(x.get("carga_id")), "producto": x.get("producto_actual"),
        "vida_actual": x.get("vida_actual"), "unidad": UNIDAD.get(x.get("unidad_vida") or "", x.get("unidad_vida")),
        "lectura_actual_equipo": x.get("medidor_actual"), "lectura_del_llenado": x.get("medidor_inicio_carga"),
        "ultima_muestra": _fecha(x.get("fecha_ultima_muestra")), "severidad_ultima": x.get("severidad_ultima"),
    } for x in comps]}


async def _catalogo_lubricacion(c: Contexto, a: dict) -> dict:
    return {
        "productos": await _filas(c.db, """SELECT p.id, p.nombre, m.nombre AS marca, p.grado_sae
            FROM eam_lube_producto p LEFT JOIN eam_lube_marca m ON m.id = p.marca_id
           WHERE p.activo ORDER BY p.nombre LIMIT 60""", {}),
        "motivos_drenaje": await _filas(c.db, "SELECT id, nombre, evitable FROM eam_lube_motivo_drenaje "
                                              "WHERE activo ORDER BY nombre", {}),
        "laboratorios": await _filas(c.db, "SELECT id, nombre FROM eam_lube_laboratorio WHERE activo", {}),
        "parametros": await _filas(c.db, "SELECT codigo, nombre, unidad, es_texto FROM eam_lube_parametro "
                                         "WHERE activo ORDER BY orden", {}),
    }


async def _llantas_de_equipo(c: Contexto, a: dict) -> dict:
    filas = await _filas(c.db, """
        SELECT n.id AS neumatico_id, n.codigo, n.posicion, n.marca, n.medida, n.profundidad_actual,
               n.profundidad_externa, n.profundidad_interna, n.presion_actual, n.presion_recomendada
          FROM eam_neumatico n JOIN eam_activo a ON a.id = n.activo_id
         WHERE n.estado = 'INSTALADO' AND (a.codigo ILIKE :p OR a.placa ILIKE :p)
         ORDER BY n.posicion""", {"p": (a.get("placa") or "").strip()})
    return {"total": len(filas), "llantas": filas} if filas else {"error": "Ese equipo no tiene llantas montadas."}


async def _ver_adjunto(c: Contexto, a: dict) -> dict:
    adj = await importar.adjunto_actual(c)
    if adj is None:
        return {"error": "No hay archivo adjunto. Pídale al usuario que lo adjunte con el clip."}
    return {"archivo": adj.nombre, "filas": adj.total, "columnas": json.loads(adj.encabezados),
            "primeras_filas": json.loads(adj.filas)[:3],
            "destinos_posibles": {k: d.titulo for k, d in importar.DESTINOS.items()}}


# ─── Acciones ────────────────────────────────────────────────────────────────

async def _resumen_cambio(c: Contexto, a: dict) -> str:
    comp = await _compartimento(c, a["compartimento_id"])
    if not comp:
        return "Compartimento inexistente"
    partes = [f"Cambio de aceite · {comp['placa']} · {comp['nombre']}",
              f"Sale: {comp['producto'] or 'carga sin producto'}" if comp["carga_id"] else "Primera carga del compartimento",
              f"Motivo del drenaje: {await _nombre(c, 'eam_lube_motivo_drenaje', a.get('motivo_drenaje_id'))}"
              if comp["carga_id"] else None,
              f"Entra: {await _nombre(c, 'eam_lube_producto', a.get('producto_id'))}" if a.get("producto_id") else None,
              f"Lectura del equipo: {a['medidor']}" if a.get("medidor") is not None else None,
              f"Litros: {a['litros']}" if a.get("litros") else None,
              f"Intervalo de cambio: {a['intervalo_cambio']:g}" if a.get("intervalo_cambio") else None,
              f"Fecha: {(a.get('fecha') or _hoy())[:10]}"]
    return " · ".join(p for p in partes if p)


async def _cambio_aceite(c: Contexto, a: dict) -> dict:
    comp = await _compartimento(c, a["compartimento_id"])
    if not comp:
        return {"exito": False, "resultado": "Ese compartimento no existe."}
    cuando = _cuando(a.get("fecha"))
    if comp["carga_id"]:
        if not a.get("motivo_drenaje_id"):
            return {"exito": False, "resultado": "Falta el motivo del drenaje (consúltalo en catalogo_lubricacion)."}
        r = await ejecutor.llamar_api("POST", f"/api/v1/eam/lube/cargas/{comp['carga_id']}/drenar", c.headers, _limpio({
            "fecha_drenaje": cuando, "medidor_fin": a.get("medidor"), "motivo_drenaje_id": a["motivo_drenaje_id"]}))
        if r.status_code >= 300:
            return await _resultado(r)
    r = await ejecutor.llamar_api("POST", "/api/v1/eam/lube/cargas", c.headers, _limpio({
        "compartimento_id": int(a["compartimento_id"]), "producto_id": a.get("producto_id"),
        "fecha_llenado": cuando, "medidor_inicio": a.get("medidor"), "volumen_litros": a.get("litros"),
        "intervalo_cambio": a.get("intervalo_cambio"), "costo_aceite": a.get("costo_aceite"), "costo_filtro": a.get("costo_filtro"),
        "costo_mano_obra": a.get("costo_mano_obra"), "observaciones": a.get("observaciones")}))
    return await _resultado(r)


async def _resumen_relleno(c: Contexto, a: dict) -> str:
    comp = await _compartimento(c, a["compartimento_id"])
    if not comp:
        return "Compartimento inexistente"
    return " · ".join(p for p in [f"Adición de aceite · {comp['placa']} · {comp['nombre']}",
                                  f"Litros: {a.get('litros')}",
                                  f"Lubricante: {await _nombre(c, 'eam_lube_producto', a.get('producto_id'))}"
                                  if a.get("producto_id") else None,
                                  f"Lectura: {a['medidor']}" if a.get("medidor") is not None else None,
                                  f"Costo: ${a['costo']:,.0f}" if a.get("costo") else None,
                                  f"Motivo: {a['motivo']}" if a.get("motivo") else None] if p)


async def _relleno(c: Contexto, a: dict) -> dict:
    comp = await _compartimento(c, a["compartimento_id"])
    if not comp or not comp["carga_id"]:
        return {"exito": False, "resultado": "Ese compartimento no tiene una carga abierta: primero registre el cambio de aceite."}
    r = await ejecutor.llamar_api("POST", "/api/v1/eam/lube/rellenos", c.headers, _limpio({
        "carga_id": comp["carga_id"], "fecha": _cuando(a.get("fecha")), "litros": a["litros"],
        "producto_id": a.get("producto_id"), "medidor": a.get("medidor"), "costo": a.get("costo"), "motivo": a.get("motivo")}))
    return await _resultado(r)


def _construir_muestra(a: dict):
    resultados = []
    for codigo, v in (a.get("resultados") or {}).items():
        if v in (None, ""):
            continue
        if isinstance(v, (int, float)):
            resultados.append({"codigo": codigo, "valor": v})
        else:
            try:
                resultados.append({"codigo": codigo, "valor": float(str(v).replace(",", "."))})
            except ValueError:
                resultados.append({"codigo": codigo, "valor_texto": str(v)})
    return "POST", "/api/v1/eam/lube/muestras", _limpio({
        "numero": a["numero"], "compartimento_id": int(a["compartimento_id"]),
        "fecha_toma": _cuando(a.get("fecha_toma")), "medidor_equipo": a.get("medidor"),
        "laboratorio_id": a.get("laboratorio_id"), "resultados": resultados})


async def _resumen_muestra(c: Contexto, a: dict) -> str:
    comp = await _compartimento(c, a["compartimento_id"])
    res = a.get("resultados") or {}
    return " · ".join(p for p in [
        f"Registrar muestra {a.get('numero')} · {comp['placa'] if comp else '?'} · {comp['nombre'] if comp else '?'}",
        f"Tomada: {(a.get('fecha_toma') or _hoy())[:10]}",
        f"Lectura: {a['medidor']}" if a.get("medidor") is not None else None,
        f"Laboratorio: {await _nombre(c, 'eam_lube_laboratorio', a.get('laboratorio_id'))}" if a.get("laboratorio_id") else None,
        f"{len(res)} resultado(s): " + ", ".join(f"{k}={v}" for k, v in list(res.items())[:10]) if res
        else "Sin resultados todavía (queda como tomada)",
        "Se evalúa contra los límites al guardar"] if p)


def _construir_tanqueo(a: dict):
    return "POST", "/api/v1/eam/combustible/registros", _limpio({
        "activo_id": int(a["activo_id"]), "fecha": _cuando(a.get("fecha")), "cantidad": a["cantidad"],
        "unidad": (a.get("unidad") or "GALON").upper(), "precio_unitario": a.get("precio_unitario"),
        "odometro": a.get("odometro"), "horometro": a.get("horometro"),
        "tanque_lleno": a.get("tanque_lleno", True), "estacion": a.get("estacion"),
        "conductor": a.get("conductor"), "factura": a.get("factura"), "observaciones": a.get("observaciones")})


async def _resumen_tanqueo(c: Contexto, a: dict) -> str:
    act = await _filas(c.db, "SELECT codigo, nombre FROM eam_activo WHERE id = :i", {"i": int(a.get("activo_id") or 0)})
    total = (a.get("precio_unitario") or 0) * (a.get("cantidad") or 0)
    return " · ".join(p for p in [
        f"Registrar tanqueo · {act[0]['codigo'] if act else 'ACTIVO INEXISTENTE'}",
        f"{a.get('cantidad')} {(a.get('unidad') or 'GALON').lower()}(es)",
        f"a ${a['precio_unitario']:,.0f} (total ${total:,.0f})" if a.get("precio_unitario") else None,
        f"Odómetro: {a['odometro']}" if a.get("odometro") is not None else None,
        f"Horómetro: {a['horometro']}" if a.get("horometro") is not None else None,
        "Tanque lleno" if a.get("tanque_lleno", True) else "Tanqueo parcial",
        f"Estación: {a['estacion']}" if a.get("estacion") else None,
        f"Fecha: {(a.get('fecha') or _hoy())[:10]}"] if p)


CAMPOS_OT = ("activo_id", "tipo_ot", "tipo_trabajo_id", "estado", "prioridad", "descripcion", "falla_id", "causa_id",
             "solucion_id", "plan_id", "contratista_id", "tecnico_asignado", "fecha_requerida", "odometro",
             "horometro", "tiempo_estimado_horas", "observaciones", "creado_por", "centro_costo", "ciudad",
             "afecta_disponibilidad", "es_falla", "fecha_inicio", "fecha_fin", "fecha_posible_cierre",
             "costo_servicios", "numero")


async def _actualizar_orden(c: Contexto, a: dict) -> dict:
    """La API reemplaza la OT entera al editarla: se lee como está, se cambia
    solo lo pedido y se reescribe; así no se pierde nada de lo que tenía."""
    r = await ejecutor.llamar_api("GET", f"/api/v1/eam/ots/{int(a['ot_id'])}", c.headers)
    if r.status_code != 200:
        return await _resultado(r)
    ot = r.json()
    cuerpo = {k: ot.get(k) for k in CAMPOS_OT if k in ot}
    for k in ("tecnico_asignado", "prioridad", "observaciones", "tiempo_estimado_horas"):
        if a.get(k) not in (None, ""):
            cuerpo[k] = a[k]
    if a.get("fecha_requerida"):
        cuerpo["fecha_requerida"] = _cuando(a["fecha_requerida"])
    cuerpo.pop("trabajos", None)
    return await _resultado(await ejecutor.llamar_api("PUT", f"/api/v1/eam/ots/{int(a['ot_id'])}", c.headers, cuerpo))


async def _resumen_actualizar(c: Contexto, a: dict) -> str:
    ot = await _filas(c.db, """SELECT o.numero, a.codigo, o.tecnico_asignado, o.prioridad FROM eam_orden_trabajo o
        JOIN eam_activo a ON a.id = o.activo_id WHERE o.id = :i""", {"i": int(a.get("ot_id") or 0)})
    if not ot:
        return "Orden inexistente"
    o = ot[0]
    return " · ".join(p for p in [
        f"Actualizar la orden {o['numero']} ({o['codigo']})",
        f"Técnico: {o['tecnico_asignado'] or '—'} → {a['tecnico_asignado']}" if a.get("tecnico_asignado") else None,
        f"Prioridad: {o['prioridad']} → {a['prioridad']}" if a.get("prioridad") else None,
        f"Para el: {a['fecha_requerida'][:10]}" if a.get("fecha_requerida") else None,
        f"Horas estimadas: {a['tiempo_estimado_horas']}" if a.get("tiempo_estimado_horas") else None,
        f"Observaciones: {a['observaciones']}" if a.get("observaciones") else None] if p)


def _construir_inspeccion(a: dict):
    return "POST", f"/api/v1/eam/neumaticos/{int(a['neumatico_id'])}/inspecciones", _limpio({
        "fecha": _cuando(a.get("fecha")), "profundidad_izq": a.get("profundidad_externa"),
        "profundidad_centro": a.get("profundidad_centro"), "profundidad_der": a.get("profundidad_interna"),
        "presion_psi": a.get("presion_psi"), "km_odometro": a.get("km_odometro"),
        "estado_visual": a.get("estado_visual"), "observaciones": a.get("observaciones"), "tecnico": a.get("tecnico")})


async def _resumen_inspeccion(c: Contexto, a: dict) -> str:
    n = await _filas(c.db, """SELECT n.codigo, n.posicion, a.codigo AS placa FROM eam_neumatico n
        LEFT JOIN eam_activo a ON a.id = n.activo_id WHERE n.id = :i""", {"i": int(a.get("neumatico_id") or 0)})
    surcos = "/".join(str(a.get(k, "—")) for k in ("profundidad_externa", "profundidad_centro", "profundidad_interna"))
    return " · ".join(p for p in [
        f"Inspección de la llanta {n[0]['codigo']} · {n[0]['placa'] or 'en bodega'} · posición {n[0]['posicion'] or '—'}"
        if n else "LLANTA INEXISTENTE",
        f"Profundidad ext/centro/int: {surcos} mm",
        f"Presión: {a['presion_psi']} psi" if a.get("presion_psi") is not None else None,
        f"Odómetro: {a['km_odometro']}" if a.get("km_odometro") is not None else None,
        f"Estado visual: {a['estado_visual']}" if a.get("estado_visual") else None] if p)


# ─── Destinos de cargue masivo del CMMS ──────────────────────────────────────

def _destinos_cmms() -> None:
    from app.api.v1.endpoints.eam_importar import CATALOGOS
    importar.registrar(importar.Destino("muestras_aceite", "Muestras de aceite (con resultados de laboratorio)",
                                        "/api/v1/eam/lube/importar/muestras/plantilla",
                                        "/api/v1/eam/lube/importar/muestras", ("eam",)))
    for ruta, cfg in CATALOGOS.items():
        importar.registrar(importar.Destino(f"cmms_{ruta}", f"Catálogo del CMMS: {cfg['titulo']}",
                                            f"/api/v1/eam/catalogos/{ruta}/plantilla",
                                            f"/api/v1/eam/catalogos/{ruta}/importar", ("eam",)))


_destinos_cmms()


EAM = ("eam",)

HERRAMIENTAS: List[Herramienta] = [
    Herramienta("lubricacion_de_equipo",
                "Compartimentos de aceite de un equipo con su compartimento_id, el aceite que tiene, la vida de la "
                "carga y la lectura actual del equipo. Úsala antes de registrar un cambio de aceite, un relleno o "
                "una muestra.", _obj({"placa": {"type": "string"}}, ["placa"]), permiso=EAM,
                consultar=_lubricacion_de_equipo),
    Herramienta("catalogo_lubricacion",
                "Productos de aceite, motivos de drenaje, laboratorios y parámetros de laboratorio (código, nombre, "
                "unidad) con sus ids. Úsala para pasar de nombres a ids antes de registrar.", _obj({}),
                permiso=EAM, consultar=_catalogo_lubricacion),
    Herramienta("llantas_de_equipo",
                "Llantas montadas en un equipo: neumatico_id, código, posición y última profundidad y presión. "
                "Úsala antes de registrar una inspección de llanta.", _obj({"placa": {"type": "string"}}, ["placa"]),
                permiso=EAM, consultar=_llantas_de_equipo),
    Herramienta("ver_adjunto",
                "El archivo Excel o CSV que el usuario adjuntó en el chat: columnas, cantidad de filas, primeras filas "
                "y a qué se puede importar. Úsala cuando el usuario adjunte un archivo.", _obj({}),
                consultar=_ver_adjunto),
    # ── acciones ─────────────────────────────────────────────────────────────
    Herramienta("registrar_cambio_aceite",
                "Registra un cambio de aceite en un compartimento: cierra la carga viva con su motivo de drenaje y "
                "abre la nueva. Necesita compartimento_id (lubricacion_de_equipo) y, si ya había carga, "
                "motivo_drenaje_id (catalogo_lubricacion). Pide la lectura del equipo si no la dieron.",
                _obj({"compartimento_id": {"type": "integer"}, "motivo_drenaje_id": {"type": "integer"},
                      "producto_id": {"type": "integer"}, "medidor": {"type": "number",
                      "description": "Lectura del odómetro u horómetro al hacer el cambio"},
                      "litros": {"type": "number"}, "costo_aceite": {"type": "number"},
                      "intervalo_cambio": {"type": "number",
                                           "description": "Cada cuántos km u horas se cambia esta carga"},
                      "costo_filtro": {"type": "number"}, "costo_mano_obra": {"type": "number"},
                      "fecha": {"type": "string", "description": "AAAA-MM-DD; hoy si no se dice"},
                      "observaciones": {"type": "string"}}, ["compartimento_id"]),
                permiso=EAM, destructiva=True, accion=_cambio_aceite, resumir=_resumen_cambio),
    Herramienta("registrar_relleno",
                "Registra una adición de aceite (relleno) a un compartimento sin cambiar la carga, con el "
                "lubricante usado (producto_id de catalogo_lubricacion). Las muestras posteriores quedan marcadas "
                "con adición.",
                _obj({"compartimento_id": {"type": "integer"}, "litros": {"type": "number"},
                      "producto_id": {"type": "integer"},
                      "medidor": {"type": "number"}, "costo": {"type": "number"}, "motivo": {"type": "string"},
                      "fecha": {"type": "string"}}, ["compartimento_id", "litros"]),
                permiso=EAM, destructiva=True, accion=_relleno, resumir=_resumen_relleno),
    Herramienta("registrar_muestra_aceite",
                "Registra una muestra de aceite con sus resultados de laboratorio; el sistema la evalúa contra los "
                "límites al guardar. `resultados` es un objeto código→valor con los códigos de catalogo_lubricacion "
                "(p. ej. {\"fe\": 38.9, \"cu\": 12, \"iso4406\": \"18/16/13\"}). Sin resultados queda como tomada.",
                _obj({"compartimento_id": {"type": "integer"}, "numero": {"type": "string"},
                      "fecha_toma": {"type": "string"}, "medidor": {"type": "number"},
                      "laboratorio_id": {"type": "integer"},
                      "resultados": {"type": "object", "additionalProperties": {"type": ["number", "string"]}}},
                     ["compartimento_id", "numero"]),
                permiso=EAM, destructiva=True, construir=_construir_muestra, resumir=_resumen_muestra),
    Herramienta("registrar_tanqueo",
                "Registra un tanqueo de combustible de un equipo (activo_id de buscar_activos). El odómetro no puede "
                "retroceder; el sistema calcula el rendimiento.",
                _obj({"activo_id": {"type": "integer"}, "cantidad": {"type": "number"},
                      "unidad": {"type": "string", "enum": ["GALON", "LITRO"]},
                      "precio_unitario": {"type": "number"}, "odometro": {"type": "number"},
                      "horometro": {"type": "number"}, "tanque_lleno": {"type": "boolean"},
                      "estacion": {"type": "string"}, "conductor": {"type": "string"}, "factura": {"type": "string"},
                      "fecha": {"type": "string"}, "observaciones": {"type": "string"}}, ["activo_id", "cantidad"]),
                permiso=EAM, destructiva=True, construir=_construir_tanqueo, resumir=_resumen_tanqueo),
    Herramienta("actualizar_orden",
                "Cambia el técnico asignado, la prioridad, la fecha requerida, las horas estimadas o las "
                "observaciones de una orden de trabajo (ot_id de ver_orden). El resto de la orden queda igual.",
                _obj({"ot_id": {"type": "integer"}, "tecnico_asignado": {"type": "string"},
                      "prioridad": {"type": "string", "enum": PRIORIDADES},
                      "fecha_requerida": {"type": "string"}, "tiempo_estimado_horas": {"type": "number"},
                      "observaciones": {"type": "string"}}, ["ot_id"]),
                permiso=EAM, destructiva=True, accion=_actualizar_orden, resumir=_resumen_actualizar),
    Herramienta("registrar_inspeccion_llanta",
                "Registra la inspección de una llanta (neumatico_id de llantas_de_equipo): profundidad de los surcos "
                "externo, centro e interno en mm y presión. La profundidad no puede subir salvo reencauche.",
                _obj({"neumatico_id": {"type": "integer"}, "profundidad_externa": {"type": "number"},
                      "profundidad_centro": {"type": "number"}, "profundidad_interna": {"type": "number"},
                      "presion_psi": {"type": "number"}, "km_odometro": {"type": "number"},
                      "estado_visual": {"type": "string", "enum": ["BUENO", "REGULAR", "CRITICO"]},
                      "observaciones": {"type": "string"}, "tecnico": {"type": "string"},
                      "fecha": {"type": "string"}}, ["neumatico_id"]),
                permiso=EAM, destructiva=True, construir=_construir_inspeccion, resumir=_resumen_inspeccion),
    Herramienta("importar_excel",
                "Importa el archivo adjunto por el cargue masivo de la plataforma. `destino` es uno de los que "
                "devuelve ver_adjunto (catálogos del CMMS, muestras de aceite, viajes del TMS, ajustes y traslados "
                "del WMS). El usuario verá qué columnas se reconocieron antes de confirmar.",
                _obj({"destino": {"type": "string"}}, ["destino"]),
                destructiva=True, accion=importar.importar, resumir=importar.resumen),
    Herramienta("plantilla_cargue",
                "Entrega en el chat la plantilla de Excel de un cargue masivo (columnas, fila de ejemplo, "
                "instrucciones y listas desplegables). Úsala cuando pidan una plantilla o formato, o pregunten cómo "
                "cargar algo masivamente. Sin destino devuelve los cargues que el usuario puede hacer.",
                _obj({"destino": {"type": "string", "description": "Clave del cargue, p. ej. cmms_repuestos, "
                                                                   "muestras_aceite, tms_viajes, wms_ajustes"}}),
                consultar=importar.plantilla),
]
