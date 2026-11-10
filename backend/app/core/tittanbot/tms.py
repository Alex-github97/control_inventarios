"""
TittanBot · TMS: viajes, vehículos, conductores, eventos, entregas y costos.

Las consultas leen en SQL compacto; las acciones van por los mismos endpoints
de las pantallas del TMS, con el token del usuario y la tarjeta de
confirmación. Las transiciones de estado del viaje (programado → asignado → en
tránsito → entregado → cerrado) las decide el endpoint, no el bot.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.tittanbot import ejecutor, importar
from app.core.tittanbot.cmms import _cuando, _resultado
from app.core.tittanbot.herramientas import Contexto, Herramienta, _fecha, _filas, _limpio, _obj

TMS = ("tms",)
TIPOS_SERVICIO = ["TERRESTRE_URBANO", "TERRESTRE_REGIONAL", "TERRESTRE_NACIONAL", "INTERNACIONAL", "DISTRIBUCION",
                  "ULTIMA_MILLA", "PRIMERA_MILLA", "CROSS_DOCKING", "DEDICADO", "TERCERIZADO"]
ESTADOS = ["PROGRAMADO", "ASIGNADO", "EN_TRANSITO", "ENTREGADO", "CERRADO", "CANCELADO"]
EVENTOS = ["SALIDA_ORIGEN", "LLEGADA_PARADA", "SALIDA_PARADA", "LLEGADA_DESTINO", "INCIDENTE",
           "PARADA_NO_PROGRAMADA", "RETRASO", "DETENCION"]

_BASE_VIAJE = """
    FROM tms_viaje v
    LEFT JOIN tms_vehiculo t ON t.id = v.vehiculo_id
    LEFT JOIN hcm_conductor c ON c.id = v.conductor_hcm_id
    LEFT JOIN hcm_colaborador p ON p.id = c.colaborador_id
   WHERE v.deleted_at IS NULL"""


def _viaje(f: dict) -> dict:
    for k in ("fecha_programada_cargue", "fecha_programada_entrega", "fecha_real_entrega", "creado"):
        if k in f:
            f[k] = _fecha(f[k])
    return f


async def _buscar_viajes(c: Contexto, a: dict) -> dict:
    cond, p = [], {}
    if a.get("texto"):
        cond.append("(v.codigo ILIKE :t OR v.origen_ciudad ILIKE :t OR v.destino_ciudad ILIKE :t "
                     "OR v.descripcion_carga ILIKE :t)")
        p["t"] = f"%{a['texto'].strip()}%"
    if a.get("placa"):
        cond.append("t.placa ILIKE :placa"); p["placa"] = a["placa"].strip()
    if a.get("estado"):
        if a["estado"] == "ACTIVOS":
            cond.append("v.estado::text IN ('PROGRAMADO','ASIGNADO','EN_TRANSITO')")
        else:
            cond.append("v.estado::text = :estado"); p["estado"] = a["estado"]
    if a.get("dias"):
        cond.append("v.created_at >= :desde"); p["desde"] = datetime.now() - timedelta(days=int(a["dias"]))
    if a.get("atrasados"):
        cond.append("v.estado::text IN ('PROGRAMADO','ASIGNADO','EN_TRANSITO') AND v.fecha_programada_entrega < now()")
    donde = _BASE_VIAJE + "".join(f" AND {x}" for x in cond)
    total = (await _filas(c.db, f"SELECT count(*) AS n {donde}", p))[0]["n"]
    filas = await _filas(c.db, f"""
        SELECT v.id, v.codigo, v.estado::text AS estado, v.tipo_servicio::text AS servicio, t.placa,
               p.nombres || ' ' || p.apellidos AS conductor, v.origen_ciudad, v.destino_ciudad,
               v.fecha_programada_cargue, v.fecha_programada_entrega, v.peso_kg, v.valor_flete
          {donde} ORDER BY v.id DESC LIMIT :lim""", {**p, "lim": min(int(a.get("limite") or 10), 25)})
    return {"total": total, "muestra": [_viaje(f) for f in filas]}


async def _ver_viaje(c: Contexto, a: dict) -> dict:
    filas = await _filas(c.db, f"""
        SELECT v.id, v.codigo, v.estado::text AS estado, v.tipo_servicio::text AS servicio, t.placa,
               p.nombres || ' ' || p.apellidos AS conductor, v.origen_ciudad, v.origen_direccion,
               v.destino_ciudad, v.destino_direccion, v.fecha_programada_cargue, v.fecha_programada_entrega,
               v.fecha_real_entrega, v.distancia_km, v.peso_kg, v.volumen_m3, v.num_entregas,
               v.descripcion_carga, v.valor_flete, v.otif_on_time, v.otif_in_full, v.notas
          {_BASE_VIAJE} AND (v.codigo ILIKE :c OR v.id::text = :c) LIMIT 1""",
                         {"c": str(a.get("codigo") or "").strip()})
    if not filas:
        return {"error": "No hay un viaje con ese código."}
    v = _viaje(filas[0])
    v["eventos"] = await _filas(c.db, """SELECT tipo_evento::text AS tipo, descripcion, timestamp::date::text AS fecha
        FROM tms_evento WHERE viaje_id = :i ORDER BY id DESC LIMIT 5""", {"i": v["id"]})
    costos = await _filas(c.db, "SELECT * FROM tms_costo_viaje WHERE viaje_id = :i ORDER BY id DESC LIMIT 1", {"i": v["id"]})
    if costos:
        v["costos"] = {k: costos[0][k] for k in ("combustible", "peajes", "viaticos", "horas_extras",
                                                 "mantenimiento", "costos_indirectos", "valor_flete_cobrado")
                       if k in costos[0]}
    return v


async def _recursos_tms(c: Contexto, a: dict) -> dict:
    texto = f"%{(a.get('texto') or '').strip()}%"
    vehiculos = await _filas(c.db, """SELECT id AS vehiculo_id, placa, tipo_vehiculo::text AS tipo_vehiculo, capacidad_kg,
            estado_operativo::text AS estado FROM tms_vehiculo
         WHERE deleted_at IS NULL AND coalesce(activo, true) AND (placa ILIKE :t OR tipo_vehiculo::text ILIKE :t)
         ORDER BY placa LIMIT 15""", {"t": texto})
    conductores = await _filas(c.db, """SELECT c.id AS conductor_hcm_id, p.nombres || ' ' || p.apellidos AS nombre,
            p.numero_documento AS documento, c.fecha_vencimiento_licencia AS licencia_vence
          FROM hcm_conductor c JOIN hcm_colaborador p ON p.id = c.colaborador_id
         WHERE c.activo_conduccion AND (p.nombres || ' ' || p.apellidos ILIKE :t OR p.numero_documento ILIKE :t)
         ORDER BY p.nombres LIMIT 15""", {"t": texto})
    for x in conductores:
        x["licencia_vence"] = _fecha(x["licencia_vence"])
    return {"vehiculos": vehiculos, "conductores": conductores}


async def _indicadores_tms(c: Contexto, a: dict) -> dict:
    dias = max(7, min(int(a.get("dias") or 30), 730))
    r = (await _filas(c.db, """
        SELECT count(*) AS viajes,
               count(*) FILTER (WHERE estado::text IN ('ENTREGADO','CERRADO')) AS entregados,
               count(*) FILTER (WHERE estado::text IN ('PROGRAMADO','ASIGNADO','EN_TRANSITO')) AS activos,
               count(*) FILTER (WHERE estado::text = 'CANCELADO') AS cancelados,
               count(*) FILTER (WHERE otif_on_time) AS a_tiempo, count(*) FILTER (WHERE otif_on_time IS NOT NULL) AS con_dato_tiempo,
               count(*) FILTER (WHERE otif_in_full) AS completos, count(*) FILTER (WHERE otif_in_full IS NOT NULL) AS con_dato_completo,
               coalesce(sum(distancia_km), 0) AS km, coalesce(sum(peso_kg), 0) AS kg, coalesce(sum(valor_flete), 0) AS fletes
          FROM tms_viaje WHERE deleted_at IS NULL AND created_at >= :d""",
                     {"d": datetime.now() - timedelta(days=dias)}))[0]
    pct = lambda a_, b_: round(100 * a_ / b_, 1) if b_ else None  # noqa: E731
    return {"periodo_dias": dias, "viajes": r["viajes"], "entregados": r["entregados"], "activos": r["activos"],
            "cancelados": r["cancelados"], "a_tiempo_pct": pct(r["a_tiempo"], r["con_dato_tiempo"]),
            "completos_pct": pct(r["completos"], r["con_dato_completo"]), "km": round(float(r["km"])),
            "toneladas": round(float(r["kg"]) / 1000, 1), "valor_fletes": round(float(r["fletes"]))}


# ─── Acciones ────────────────────────────────────────────────────────────────

def _cuerpo_viaje(a: dict) -> dict:
    return _limpio({
        "tipo_servicio": a.get("tipo_servicio") or "TERRESTRE_NACIONAL", "vehiculo_id": a.get("vehiculo_id"),
        "conductor_hcm_id": a.get("conductor_hcm_id"), "origen_ciudad": a.get("origen_ciudad"),
        "origen_direccion": a.get("origen_direccion"), "destino_ciudad": a.get("destino_ciudad"),
        "destino_direccion": a.get("destino_direccion"),
        "fecha_programada_cargue": _cuando(a["fecha_cargue"]) if a.get("fecha_cargue") else None,
        "fecha_programada_entrega": _cuando(a["fecha_entrega"]) if a.get("fecha_entrega") else None,
        "distancia_km": a.get("distancia_km"), "peso_kg": a.get("peso_kg"), "volumen_m3": a.get("volumen_m3"),
        "descripcion_carga": a.get("descripcion_carga"), "valor_flete": a.get("valor_flete"), "notas": a.get("notas")})


def _construir_viaje(a: dict):
    return "POST", "/api/v1/tms/viajes", _cuerpo_viaje(a)


async def _resumen_viaje(c: Contexto, a: dict) -> str:
    veh = await _filas(c.db, "SELECT placa FROM tms_vehiculo WHERE id = :i", {"i": int(a.get("vehiculo_id") or 0)})
    con = await _filas(c.db, """SELECT p.nombres || ' ' || p.apellidos AS n FROM hcm_conductor c
        JOIN hcm_colaborador p ON p.id = c.colaborador_id WHERE c.id = :i""", {"i": int(a.get("conductor_hcm_id") or 0)})
    return " · ".join(x for x in [
        f"Crear viaje {a.get('tipo_servicio') or 'TERRESTRE_NACIONAL'}",
        f"{a.get('origen_ciudad') or '¿origen?'} → {a.get('destino_ciudad') or '¿destino?'}",
        f"Vehículo: {veh[0]['placa']}" if veh else ("Vehículo: VEHÍCULO INEXISTENTE" if a.get("vehiculo_id") else "Sin vehículo"),
        f"Conductor: {con[0]['n']}" if con else ("Conductor: INEXISTENTE" if a.get("conductor_hcm_id") else "Sin conductor"),
        f"Cargue: {a['fecha_cargue'][:10]}" if a.get("fecha_cargue") else None,
        f"Entrega: {a['fecha_entrega'][:10]}" if a.get("fecha_entrega") else None,
        f"Carga: {a['descripcion_carga']}" if a.get("descripcion_carga") else None,
        f"{a['peso_kg']} kg" if a.get("peso_kg") else None,
        f"Flete: ${a['valor_flete']:,.0f}" if a.get("valor_flete") else None] if x)


async def _estado_viaje(c: Contexto, a: dict) -> dict:
    r = await ejecutor.llamar_api("PUT", f"/api/v1/tms/viajes/{int(a['viaje_id'])}/estado", c.headers,
                                  params=_limpio({"estado": a["estado"], "notas": a.get("notas")}))
    return await _resultado(r)


async def _codigo_viaje(c: Contexto, vid) -> str:
    v = await _filas(c.db, "SELECT codigo, estado::text AS e FROM tms_viaje WHERE id = :i", {"i": int(vid or 0)})
    return f"{v[0]['codigo']} (hoy {v[0]['e']})" if v else "VIAJE INEXISTENTE"


async def _resumen_estado(c: Contexto, a: dict) -> str:
    return " · ".join(x for x in [f"Pasar el viaje {await _codigo_viaje(c, a.get('viaje_id'))} a {a.get('estado')}",
                                  f"Notas: {a['notas']}" if a.get("notas") else None] if x)


def _construir_evento(a: dict):
    return "POST", "/api/v1/tms/eventos", _limpio({"viaje_id": int(a["viaje_id"]), "tipo_evento": a["tipo_evento"],
                                                    "descripcion": a.get("descripcion")})


async def _resumen_evento(c: Contexto, a: dict) -> str:
    return " · ".join(x for x in [f"Registrar evento {a.get('tipo_evento')} en el viaje {await _codigo_viaje(c, a.get('viaje_id'))}",
                                  a.get("descripcion")] if x)


def _construir_pod(a: dict):
    return "POST", "/api/v1/tms/pod", _limpio({
        "viaje_id": int(a["viaje_id"]), "receptor_nombre": a.get("receptor_nombre"),
        "receptor_documento": a.get("receptor_documento"), "observaciones": a.get("observaciones"),
        "fecha_hora": _cuando(a.get("fecha")) if a.get("fecha") else datetime.now().isoformat(timespec="seconds")})


async def _resumen_pod(c: Contexto, a: dict) -> str:
    return " · ".join(x for x in [f"Registrar entrega (POD) del viaje {await _codigo_viaje(c, a.get('viaje_id'))}",
                                  f"Recibió: {a.get('receptor_nombre') or '—'} {a.get('receptor_documento') or ''}".strip(),
                                  f"Observaciones: {a['observaciones']}" if a.get("observaciones") else None] if x)


CAMPOS_COSTO = ("combustible", "peajes", "viaticos", "horas_extras", "mantenimiento", "costos_indirectos",
                "valor_flete_cobrado")


def _construir_costos(a: dict):
    return "POST", "/api/v1/tms/costos", {"viaje_id": int(a["viaje_id"]),
                                          **{k: float(a[k]) for k in CAMPOS_COSTO if a.get(k) is not None},
                                          **({"notas": a["notas"]} if a.get("notas") else {})}


async def _resumen_costos(c: Contexto, a: dict) -> str:
    partes = [f"{k.replace('_', ' ')}: ${float(a[k]):,.0f}" for k in CAMPOS_COSTO if a.get(k) is not None]
    return f"Registrar costos del viaje {await _codigo_viaje(c, a.get('viaje_id'))} · " + " · ".join(partes)


# ─── Cargue de viajes desde Excel ────────────────────────────────────────────

COLUMNAS_VIAJE = [
    {"clave": "tipo_servicio", "titulo": "Tipo de servicio", "requerida": False, "opciones": TIPOS_SERVICIO,
     "ayuda": "Si se deja vacío: TERRESTRE_NACIONAL", "ejemplo": "TERRESTRE_NACIONAL"},
    {"clave": "placa", "titulo": "Placa", "requerida": False, "ayuda": "Placa de un vehículo registrado en el TMS",
     "ejemplo": "ABC123"},
    {"clave": "conductor", "titulo": "Documento del conductor", "requerida": False,
     "ayuda": "Número de documento de un conductor activo", "ejemplo": "1020304050"},
    {"clave": "origen_ciudad", "titulo": "Origen", "requerida": True, "ayuda": "Ciudad de cargue", "ejemplo": "Bogotá"},
    {"clave": "destino_ciudad", "titulo": "Destino", "requerida": True, "ayuda": "Ciudad de entrega", "ejemplo": "Medellín"},
    {"clave": "origen_direccion", "titulo": "Dirección de origen", "requerida": False, "ejemplo": "Calle 13 # 68-50"},
    {"clave": "destino_direccion", "titulo": "Dirección de destino", "requerida": False, "ejemplo": "Cra 50 # 10-20"},
    {"clave": "fecha_cargue", "titulo": "Fecha de cargue", "requerida": False, "ayuda": "AAAA-MM-DD",
     "ejemplo": "2026-11-15"},
    {"clave": "fecha_entrega", "titulo": "Fecha de entrega", "requerida": False, "ayuda": "AAAA-MM-DD",
     "ejemplo": "2026-11-16"},
    {"clave": "peso_kg", "titulo": "Peso kg", "requerida": False, "ejemplo": "12000"},
    {"clave": "descripcion_carga", "titulo": "Carga", "requerida": False, "ayuda": "Qué se transporta",
     "ejemplo": "Cemento en bultos"},
    {"clave": "valor_flete", "titulo": "Valor del flete", "requerida": False, "ayuda": "Pesos, sin puntos",
     "ejemplo": "3500000"},
    {"clave": "notas", "titulo": "Notas", "requerida": False},
]


async def _viaje_desde_fila(c: Contexto, f: dict):
    a = dict(f)
    if a.get("placa"):
        v = await _filas(c.db, "SELECT id FROM tms_vehiculo WHERE placa ILIKE :p AND deleted_at IS NULL LIMIT 1",
                         {"p": str(a["placa"]).strip()})
        if not v:
            raise ValueError(f"no hay un vehículo con placa {a['placa']}")
        a["vehiculo_id"] = v[0]["id"]
    if a.get("conductor"):
        cd = await _filas(c.db, """SELECT c.id FROM hcm_conductor c JOIN hcm_colaborador p ON p.id = c.colaborador_id
            WHERE p.numero_documento = :d LIMIT 1""", {"d": str(a["conductor"]).strip()})
        if not cd:
            raise ValueError(f"no hay un conductor con documento {a['conductor']}")
        a["conductor_hcm_id"] = cd[0]["id"]
    if a.get("tipo_servicio"):
        a["tipo_servicio"] = str(a["tipo_servicio"]).strip().upper().replace(" ", "_")
    for k in ("fecha_cargue", "fecha_entrega"):
        if a.get(k):
            a[k] = str(a[k])
    return "POST", "/api/v1/tms/viajes", _cuerpo_viaje(a)


importar.registrar(importar.Destino("tms_viajes", "Viajes del TMS (uno por fila)", "", "", TMS,
                                    columnas=COLUMNAS_VIAJE, por_fila=_viaje_desde_fila))


HERRAMIENTAS: List[Herramienta] = [
    Herramienta("buscar_viajes",
                "Viajes del TMS con filtros (texto: código, ciudad o carga; placa; estado o ACTIVOS; atrasados; "
                "dias). Devuelve el total y una muestra con el id de cada viaje.",
                _obj({"texto": {"type": "string"}, "placa": {"type": "string"},
                      "estado": {"type": "string", "enum": ["ACTIVOS", *ESTADOS]}, "atrasados": {"type": "boolean"},
                      "dias": {"type": "integer"}, "limite": {"type": "integer"}}),
                permiso=TMS, consultar=_buscar_viajes),
    Herramienta("ver_viaje", "El detalle de un viaje por su código (VJ-2026-000123) o id, con eventos y costos.",
                _obj({"codigo": {"type": "string"}}, ["codigo"]), permiso=TMS, consultar=_ver_viaje),
    Herramienta("recursos_tms",
                "Vehículos (vehiculo_id, placa, capacidad, estado) y conductores activos (conductor_hcm_id, nombre, "
                "documento, vencimiento de licencia). Filtra por placa, nombre o documento. Úsala antes de crear o "
                "asignar un viaje.", _obj({"texto": {"type": "string"}}), permiso=TMS, consultar=_recursos_tms),
    Herramienta("indicadores_tms",
                "Indicadores del transporte en un periodo: viajes, entregados, activos, cancelados, % a tiempo, % "
                "completos, km, toneladas y valor de fletes. Reporta las cifras tal cual.",
                _obj({"dias": {"type": "integer"}}), permiso=TMS, consultar=_indicadores_tms),
    Herramienta("crear_viaje",
                "Crea un viaje del TMS; el código lo asigna el sistema. vehiculo_id y conductor_hcm_id salen de "
                "recursos_tms. Necesita al menos origen y destino.",
                _obj({"tipo_servicio": {"type": "string", "enum": TIPOS_SERVICIO}, "vehiculo_id": {"type": "integer"},
                      "conductor_hcm_id": {"type": "integer"}, "origen_ciudad": {"type": "string"},
                      "origen_direccion": {"type": "string"}, "destino_ciudad": {"type": "string"},
                      "destino_direccion": {"type": "string"},
                      "fecha_cargue": {"type": "string", "description": "AAAA-MM-DD"},
                      "fecha_entrega": {"type": "string", "description": "AAAA-MM-DD"},
                      "distancia_km": {"type": "number"}, "peso_kg": {"type": "number"},
                      "volumen_m3": {"type": "number"}, "descripcion_carga": {"type": "string"},
                      "valor_flete": {"type": "number"}, "notas": {"type": "string"}},
                     ["origen_ciudad", "destino_ciudad"]),
                permiso=TMS, destructiva=True, construir=_construir_viaje, resumir=_resumen_viaje),
    Herramienta("cambiar_estado_viaje",
                "Cambia el estado de un viaje (viaje_id de buscar_viajes o ver_viaje). Transiciones válidas: "
                "PROGRAMADO→ASIGNADO, ASIGNADO→EN_TRANSITO, EN_TRANSITO→ENTREGADO, ENTREGADO→CERRADO, o CANCELADO "
                "antes de entregar.",
                _obj({"viaje_id": {"type": "integer"}, "estado": {"type": "string", "enum": ESTADOS},
                      "notas": {"type": "string"}}, ["viaje_id", "estado"]),
                permiso=TMS, destructiva=True, accion=_estado_viaje, resumir=_resumen_estado),
    Herramienta("registrar_evento_viaje",
                "Registra un evento del viaje: salida, llegada, incidente, retraso, detención…",
                _obj({"viaje_id": {"type": "integer"}, "tipo_evento": {"type": "string", "enum": EVENTOS},
                      "descripcion": {"type": "string"}}, ["viaje_id", "tipo_evento"]),
                permiso=TMS, destructiva=True, construir=_construir_evento, resumir=_resumen_evento),
    Herramienta("registrar_entrega",
                "Registra la prueba de entrega (POD) de un viaje: quién recibió, su documento y observaciones.",
                _obj({"viaje_id": {"type": "integer"}, "receptor_nombre": {"type": "string"},
                      "receptor_documento": {"type": "string"}, "observaciones": {"type": "string"},
                      "fecha": {"type": "string"}}, ["viaje_id", "receptor_nombre"]),
                permiso=TMS, destructiva=True, construir=_construir_pod, resumir=_resumen_pod),
    Herramienta("registrar_costos_viaje",
                "Registra los costos de un viaje: combustible, peajes, viáticos, horas extras, mantenimiento, "
                "indirectos y el valor del flete cobrado (pesos).",
                _obj({"viaje_id": {"type": "integer"}, **{k: {"type": "number"} for k in CAMPOS_COSTO},
                      "notas": {"type": "string"}}, ["viaje_id"]),
                permiso=TMS, destructiva=True, construir=_construir_costos, resumir=_resumen_costos),
]
