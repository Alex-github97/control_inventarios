"""
TittanBot · WMS: productos, existencias, recepciones, ajustes, traslados,
órdenes de salida, picking y despachos.

Las consultas leen en SQL compacto; los movimientos van por los mismos
endpoints de las pantallas del WMS (que a su vez pasan por `wms_inventario`),
con el token del usuario y la tarjeta de confirmación. El bot no mueve stock
por su cuenta: si el endpoint rechaza (sin existencia, lote vencido, ubicación
de otro almacén…), el motivo vuelve tal cual.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.tittanbot import ejecutor, importar
from app.core.tittanbot.cmms import _resultado
from app.core.tittanbot.herramientas import Contexto, Herramienta, _fecha, _filas, _limpio, _obj

WMS = ("wms",)
TIPOS_RECEPCION = ["CONTRA_OC", "ASN", "CIEGA", "PARCIAL", "CONSOLIDADA"]
PRIORIDADES_ORDEN = ["BAJA", "NORMAL", "ALTA", "URGENTE"]
ESTADOS_DESPACHO = ["PREPARANDO", "LISTO", "EN_TRANSITO", "ENTREGADO", "INCIDENCIA"]
TIPOS_DOCUMENTO = ["ORDENES_SALIDA", "RECEPCIONES", "DESPACHOS"]


# ─── Consultas ───────────────────────────────────────────────────────────────

async def _buscar_productos(c: Contexto, a: dict) -> dict:
    t = f"%{(a.get('texto') or '').strip()}%"
    filas = await _filas(c.db, """
        SELECT p.id AS producto_id, p.sku, p.nombre, p.unidad_medida AS unidad, p.categoria,
               p.requiere_lote, coalesce(sum(i.cantidad_disponible), 0) AS disponible,
               coalesce(sum(i.cantidad_reservada), 0) AS reservado, coalesce(sum(i.cantidad_bloqueada), 0) AS bloqueado
          FROM wms_productos p LEFT JOIN wms_inventario_ubicacion i ON i.producto_id = p.id
         WHERE coalesce(p.activo, true) AND (p.sku ILIKE :t OR p.nombre ILIKE :t OR p.codigo_barras ILIKE :t
                                             OR p.referencia ILIKE :t)
         GROUP BY p.id ORDER BY p.nombre LIMIT :lim""", {"t": t, "lim": min(int(a.get("limite") or 15), 30)})
    return {"productos": [{**f, **{k: float(f[k]) for k in ("disponible", "reservado", "bloqueado")}} for f in filas]}


async def _existencias(c: Contexto, a: dict) -> dict:
    cond, p = [], {}
    if a.get("producto"):
        cond.append("(p.sku ILIKE :p OR p.nombre ILIKE :p OR p.id::text = :pe)")
        p["p"] = f"%{a['producto'].strip()}%"; p["pe"] = a["producto"].strip()
    if a.get("ubicacion"):
        cond.append("u.codigo ILIKE :u"); p["u"] = f"%{a['ubicacion'].strip()}%"
    if a.get("almacen_id"):
        cond.append("z.almacen_id = :al"); p["al"] = int(a["almacen_id"])
    if a.get("por_vencer_dias"):
        cond.append("l.fecha_vencimiento <= :venc"); p["venc"] = datetime.now().date() + timedelta(days=int(a["por_vencer_dias"]))
    donde = "".join(f" AND {x}" for x in cond)
    filas = await _filas(c.db, f"""
        SELECT p.id AS producto_id, p.sku, p.nombre, u.id AS ubicacion_id, u.codigo AS ubicacion,
               al.codigo AS almacen, l.id AS lote_id, l.numero_lote AS lote, l.fecha_vencimiento AS vence,
               i.cantidad_disponible AS disponible, i.cantidad_reservada AS reservado, i.cantidad_bloqueada AS bloqueado
          FROM wms_inventario_ubicacion i
          JOIN wms_productos p ON p.id = i.producto_id
          JOIN wms_ubicaciones u ON u.id = i.ubicacion_id
          JOIN wms_zonas z ON z.id = u.zona_id
          JOIN wms_almacenes al ON al.id = z.almacen_id
          LEFT JOIN wms_lotes l ON l.id = i.lote_id
         WHERE (i.cantidad_disponible + i.cantidad_reservada + i.cantidad_bloqueada) > 0 {donde}
         ORDER BY p.sku, u.codigo LIMIT :lim""", {**p, "lim": min(int(a.get("limite") or 20), 40)})
    for f in filas:
        f["vence"] = _fecha(f["vence"])
    return {"existencias": filas}


async def _recursos_wms(c: Contexto, a: dict) -> dict:
    t = f"%{(a.get('texto') or '').strip()}%"
    almacenes = await _filas(c.db, """SELECT id AS almacen_id, codigo, nombre, ciudad, flujo_recepcion
        FROM wms_almacenes WHERE coalesce(activo, true) ORDER BY codigo LIMIT 20""", {})
    clientes = await _filas(c.db, """SELECT id AS cliente_id, codigo, nombre, nit, ciudad FROM wms_clientes
        WHERE coalesce(activo, true) AND (nombre ILIKE :t OR codigo ILIKE :t OR coalesce(nit, '') ILIKE :t)
        ORDER BY nombre LIMIT 15""", {"t": t})
    ubicaciones = await _filas(c.db, """SELECT u.id AS ubicacion_id, u.codigo, u.tipo, z.tipo AS zona, al.codigo AS almacen
        FROM wms_ubicaciones u JOIN wms_zonas z ON z.id = u.zona_id JOIN wms_almacenes al ON al.id = z.almacen_id
        WHERE coalesce(u.activo, true) AND u.codigo ILIKE :t ORDER BY u.codigo LIMIT 15""", {"t": t})
    transportadoras = await _filas(c.db, """SELECT id AS transportadora_id, codigo, nombre FROM wms_transportadoras
        WHERE coalesce(activo, true) AND (nombre ILIKE :t OR codigo ILIKE :t) ORDER BY nombre LIMIT 10""", {"t": t})
    return {"almacenes": almacenes, "clientes": clientes, "ubicaciones": ubicaciones, "transportadoras": transportadoras}


async def _documentos_wms(c: Contexto, a: dict) -> dict:
    tipo = a.get("tipo") or "ORDENES_SALIDA"
    t = f"%{(a.get('texto') or '').strip()}%"
    p: Dict[str, Any] = {"t": t, "lim": min(int(a.get("limite") or 10), 25)}
    estado = " AND x.estado = :e" if a.get("estado") else ""
    if a.get("estado"):
        p["e"] = a["estado"].strip().upper()
    if tipo == "RECEPCIONES":
        sql = f"""SELECT x.id, x.numero_recepcion AS numero, x.tipo, x.estado, al.codigo AS almacen,
                  x.fecha_recepcion AS fecha, (SELECT count(*) FROM wms_recepciones_detalle d WHERE d.recepcion_id = x.id) AS lineas
             FROM wms_recepciones x JOIN wms_almacenes al ON al.id = x.almacen_id
            WHERE x.deleted_at IS NULL AND x.numero_recepcion ILIKE :t {estado} ORDER BY x.id DESC LIMIT :lim"""
    elif tipo == "DESPACHOS":
        sql = f"""SELECT x.id, x.numero_despacho AS numero, x.estado, o.numero_orden AS orden, cl.nombre AS cliente,
                  x.vehiculo_placa AS placa, x.fecha_despacho AS fecha, x.fecha_entrega_real AS entregado
             FROM wms_despachos x JOIN wms_ordenes_salida o ON o.id = x.orden_id JOIN wms_clientes cl ON cl.id = o.cliente_id
            WHERE x.deleted_at IS NULL AND (x.numero_despacho ILIKE :t OR o.numero_orden ILIKE :t OR cl.nombre ILIKE :t)
                  {estado} ORDER BY x.id DESC LIMIT :lim"""
    else:
        sql = f"""SELECT x.id, x.numero_orden AS numero, x.estado, x.prioridad, cl.nombre AS cliente, al.codigo AS almacen,
                  x.fecha_emision AS fecha, x.fecha_requerida AS requerida,
                  (SELECT count(*) FROM wms_ordenes_salida_detalle d WHERE d.orden_id = x.id) AS lineas,
                  (SELECT max(t.id) FROM wms_picking_tareas t WHERE t.orden_id = x.id) AS picking_id
             FROM wms_ordenes_salida x JOIN wms_clientes cl ON cl.id = x.cliente_id JOIN wms_almacenes al ON al.id = x.almacen_id
            WHERE x.deleted_at IS NULL AND (x.numero_orden ILIKE :t OR cl.nombre ILIKE :t) {estado}
            ORDER BY x.id DESC LIMIT :lim"""
    filas = await _filas(c.db, sql, p)
    for f in filas:
        for k in ("fecha", "requerida", "entregado"):
            if k in f:
                f[k] = _fecha(f[k])
    return {"tipo": tipo, "documentos": filas}


async def _indicadores_wms(c: Contexto, a: dict) -> dict:
    dias = max(7, min(int(a.get("dias") or 30), 730))
    desde = datetime.now().date() - timedelta(days=dias)
    o = (await _filas(c.db, """SELECT count(*) AS ordenes,
            count(*) FILTER (WHERE estado IN ('PENDIENTE','EN_PICKING','EMPACANDO')) AS abiertas,
            count(*) FILTER (WHERE estado IN ('PENDIENTE','EN_PICKING','EMPACANDO') AND fecha_requerida < current_date) AS atrasadas
          FROM wms_ordenes_salida WHERE deleted_at IS NULL AND fecha_emision >= :d""", {"d": desde}))[0]
    r = (await _filas(c.db, """SELECT count(*) AS recepciones, count(*) FILTER (WHERE estado = 'COMPLETA') AS completas
          FROM wms_recepciones WHERE deleted_at IS NULL AND fecha_recepcion >= :d""", {"d": desde}))[0]
    d = (await _filas(c.db, """SELECT count(*) AS despachos, count(*) FILTER (WHERE estado = 'ENTREGADO') AS entregados,
            count(*) FILTER (WHERE estado = 'INCIDENCIA') AS incidencias,
            count(*) FILTER (WHERE estado = 'ENTREGADO' AND fecha_entrega_estimada IS NOT NULL
                             AND fecha_entrega_real <= fecha_entrega_estimada) AS a_tiempo,
            count(*) FILTER (WHERE estado = 'ENTREGADO' AND fecha_entrega_estimada IS NOT NULL) AS con_fecha
          FROM wms_despachos WHERE deleted_at IS NULL AND fecha_despacho >= :d""", {"d": desde}))[0]
    s = (await _filas(c.db, """SELECT count(DISTINCT producto_id) AS productos_con_stock,
            coalesce(sum(cantidad_disponible), 0) AS unidades_disponibles, coalesce(sum(cantidad_bloqueada), 0) AS unidades_bloqueadas
          FROM wms_inventario_ubicacion WHERE cantidad_disponible + cantidad_bloqueada > 0""", {}))[0]
    v = (await _filas(c.db, """SELECT count(*) AS n FROM wms_inventario_ubicacion i JOIN wms_lotes l ON l.id = i.lote_id
          WHERE i.cantidad_disponible > 0 AND l.fecha_vencimiento <= current_date + 30""", {}))[0]
    return {"periodo_dias": dias, **o, **r, "despachos": d["despachos"], "despachos_entregados": d["entregados"],
            "despachos_con_incidencia": d["incidencias"],
            "entregas_a_tiempo_pct": round(100 * d["a_tiempo"] / d["con_fecha"], 1) if d["con_fecha"] else None,
            "productos_con_stock": s["productos_con_stock"], "unidades_disponibles": float(s["unidades_disponibles"]),
            "unidades_bloqueadas": float(s["unidades_bloqueadas"]), "posiciones_que_vencen_en_30_dias": v["n"]}


# ─── Ayudas para las tarjetas ────────────────────────────────────────────────

async def _sku(c: Contexto, pid) -> str:
    f = await _filas(c.db, "SELECT sku, nombre FROM wms_productos WHERE id = :i", {"i": int(pid or 0)})
    return f"{f[0]['sku']} {f[0]['nombre']}" if f else "PRODUCTO INEXISTENTE"


async def _ubic(c: Contexto, uid) -> str:
    f = await _filas(c.db, "SELECT codigo FROM wms_ubicaciones WHERE id = :i", {"i": int(uid or 0)})
    return f[0]["codigo"] if f else "UBICACIÓN INEXISTENTE"


async def _lote(c: Contexto, lid) -> Optional[str]:
    if not lid:
        return None
    f = await _filas(c.db, "SELECT numero_lote FROM wms_lotes WHERE id = :i", {"i": int(lid)})
    return f"lote {f[0]['numero_lote']}" if f else "LOTE INEXISTENTE"


async def _almacen(c: Contexto, aid) -> str:
    f = await _filas(c.db, "SELECT codigo, nombre FROM wms_almacenes WHERE id = :i", {"i": int(aid or 0)})
    return f"{f[0]['codigo']} {f[0]['nombre']}" if f else "ALMACÉN INEXISTENTE"


async def _orden(c: Contexto, oid) -> str:
    f = await _filas(c.db, """SELECT o.numero_orden, o.estado, cl.nombre FROM wms_ordenes_salida o
        JOIN wms_clientes cl ON cl.id = o.cliente_id WHERE o.id = :i""", {"i": int(oid or 0)})
    return f"{f[0]['numero_orden']} de {f[0]['nombre']} (hoy {f[0]['estado']})" if f else "ORDEN INEXISTENTE"


async def _lineas_texto(c: Contexto, lineas: List[dict], campo: str) -> str:
    partes = []
    for ln in lineas[:8]:
        extra = " ".join(x for x in [await _lote(c, ln.get("lote_id")),
                                     f"→ {await _ubic(c, ln['ubicacion_id'])}" if ln.get("ubicacion_id") else None] if x)
        partes.append(f"{ln.get(campo)} × {await _sku(c, ln.get('producto_id'))} {extra}".strip())
    if len(lineas) > 8:
        partes.append(f"y {len(lineas) - 8} línea(s) más")
    return "; ".join(partes)


# ─── Acciones ────────────────────────────────────────────────────────────────

async def _recepcion(c: Contexto, a: dict) -> dict:
    cuerpo = _limpio({"almacen_id": int(a["almacen_id"]), "tipo": a.get("tipo") or "CIEGA", "notas": a.get("notas"),
                      "orden_compra_id": a.get("orden_compra_id"),
                      "detalles": [_limpio({"producto_id": int(ln["producto_id"]), "cantidad_recibida": float(ln["cantidad"]),
                                            "cantidad_esperada": ln.get("cantidad_esperada"),
                                            "ubicacion_id": ln.get("ubicacion_id"), "lote_id": ln.get("lote_id")})
                                   for ln in a["lineas"]]})
    r = await ejecutor.llamar_api("POST", "/api/v1/wms/recepciones/", c.headers, cuerpo=cuerpo)
    if not (200 <= r.status_code < 300) or not a.get("completar"):
        return await _resultado(r)
    rec = r.json()
    r2 = await ejecutor.llamar_api("POST", f"/api/v1/wms/recepciones/{rec['id']}/completar", c.headers)
    if 200 <= r2.status_code < 300:
        return {"exito": True, "resultado": f"Recepción {rec.get('numero_recepcion')} creada y completada: la "
                                             f"mercancía quedó en inventario."}
    return {"exito": True, "resultado": f"Recepción {rec.get('numero_recepcion')} creada, pero no se pudo completar: "
                                         f"{ejecutor._detalle(r2)}. Quedó en BORRADOR."}


async def _resumen_recepcion(c: Contexto, a: dict) -> str:
    return " · ".join(x for x in [
        f"Recepción {a.get('tipo') or 'CIEGA'} en {await _almacen(c, a.get('almacen_id'))}",
        await _lineas_texto(c, a.get("lineas") or [], "cantidad"),
        "Se COMPLETA al crearla (entra al inventario)" if a.get("completar") else "Queda en BORRADOR para completarla después",
        f"Notas: {a['notas']}" if a.get("notas") else None] if x)


def _construir_ajuste(a: dict):
    return "POST", "/api/v1/wms/inventario/ajuste/", _limpio({
        "producto_id": int(a["producto_id"]), "ubicacion_id": int(a["ubicacion_id"]), "lote_id": a.get("lote_id"),
        "cantidad_nueva": float(a["cantidad_nueva"]), "estado": a.get("estado") or "DISPONIBLE", "motivo": a["motivo"]})


async def _resumen_ajuste(c: Contexto, a: dict) -> str:
    actual = await _filas(c.db, """SELECT coalesce(sum(CASE WHEN :e = 'BLOQUEADO' THEN cantidad_bloqueada
                                   ELSE cantidad_disponible END), 0) AS n
        FROM wms_inventario_ubicacion WHERE producto_id = :p AND ubicacion_id = :u
         AND coalesce(lote_id, 0) = coalesce(:l, 0)""",
                          {"e": a.get("estado") or "DISPONIBLE", "p": int(a.get("producto_id") or 0),
                           "u": int(a.get("ubicacion_id") or 0), "l": a.get("lote_id")})
    return " · ".join(x for x in [
        f"Ajustar {a.get('estado') or 'DISPONIBLE'} de {await _sku(c, a.get('producto_id'))} en {await _ubic(c, a.get('ubicacion_id'))}",
        await _lote(c, a.get("lote_id")),
        f"Hoy: {float(actual[0]['n']):g} → queda: {float(a.get('cantidad_nueva') or 0):g}",
        f"Motivo: {a.get('motivo')}"] if x)


def _construir_traslado(a: dict):
    return "POST", "/api/v1/wms/inventario/transferencia/", _limpio({
        "producto_id": int(a["producto_id"]), "ubicacion_origen_id": int(a["ubicacion_origen_id"]),
        "ubicacion_destino_id": int(a["ubicacion_destino_id"]), "lote_id": a.get("lote_id"),
        "cantidad": float(a["cantidad"]), "notas": a.get("notas")})


async def _resumen_traslado(c: Contexto, a: dict) -> str:
    return " · ".join(x for x in [
        f"Trasladar {a.get('cantidad')} × {await _sku(c, a.get('producto_id'))}",
        await _lote(c, a.get("lote_id")),
        f"De {await _ubic(c, a.get('ubicacion_origen_id'))} a {await _ubic(c, a.get('ubicacion_destino_id'))}",
        f"Notas: {a['notas']}" if a.get("notas") else None] if x)


async def _orden_salida(c: Contexto, a: dict) -> dict:
    cuerpo = _limpio({"cliente_id": int(a["cliente_id"]), "almacen_id": int(a["almacen_id"]),
                      "fecha_requerida": (a.get("fecha_requerida") or "")[:10] or None,
                      "prioridad": a.get("prioridad") or "NORMAL", "canal": a.get("canal"),
                      "detalles": [_limpio({"producto_id": int(ln["producto_id"]), "cantidad_solicitada": float(ln["cantidad"]),
                                            "lote_id": ln.get("lote_id"), "precio_unitario": ln.get("precio_unitario")})
                                   for ln in a["lineas"]]})
    r = await ejecutor.llamar_api("POST", "/api/v1/wms/ordenes-salida/", c.headers, cuerpo=cuerpo)
    if not (200 <= r.status_code < 300) or not a.get("generar_picking"):
        return await _resultado(r)
    o = r.json()
    r2 = await ejecutor.llamar_api("POST", f"/api/v1/wms/ordenes-salida/{o['id']}/generar-picking", c.headers)
    if 200 <= r2.status_code < 300:
        return {"exito": True, "resultado": f"Orden {o.get('numero_orden')} creada y su picking generado "
                                             f"(tarea {r2.json().get('id')}, FEFO)."}
    return {"exito": True, "resultado": f"Orden {o.get('numero_orden')} creada, pero el picking no se pudo generar: "
                                         f"{ejecutor._detalle(r2)}."}


async def _resumen_orden(c: Contexto, a: dict) -> str:
    cl = await _filas(c.db, "SELECT nombre FROM wms_clientes WHERE id = :i", {"i": int(a.get("cliente_id") or 0)})
    return " · ".join(x for x in [
        f"Orden de salida para {cl[0]['nombre'] if cl else 'CLIENTE INEXISTENTE'} desde {await _almacen(c, a.get('almacen_id'))}",
        await _lineas_texto(c, a.get("lineas") or [], "cantidad"),
        f"Prioridad {a.get('prioridad') or 'NORMAL'}",
        f"Requerida: {a['fecha_requerida'][:10]}" if a.get("fecha_requerida") else None,
        "Genera el picking (FEFO) al crearla" if a.get("generar_picking") else None] if x)


async def _picking(c: Contexto, a: dict) -> dict:
    r = await ejecutor.llamar_api("POST", f"/api/v1/wms/ordenes-salida/{int(a['orden_id'])}/generar-picking", c.headers,
                                  params=_limpio({"dias_vida_minima": a.get("dias_vida_minima")}))
    if 200 <= r.status_code < 300:
        t = r.json()
        return {"exito": True, "resultado": f"Picking generado: tarea {t.get('id')} con {len(t.get('detalles') or [])} línea(s)."}
    return await _resultado(r)


async def _resumen_picking(c: Contexto, a: dict) -> str:
    return f"Generar el picking (FEFO) de la orden {await _orden(c, a.get('orden_id'))}"


async def _tarea_pendiente(c: Contexto, orden_id) -> List[dict]:
    return await _filas(c.db, """SELECT d.id AS detalle_id, d.tarea_id, d.cantidad_solicitada, p.sku, u.codigo AS ubicacion
          FROM wms_picking_detalles d JOIN wms_picking_tareas t ON t.id = d.tarea_id
          JOIN wms_productos p ON p.id = d.producto_id JOIN wms_ubicaciones u ON u.id = d.ubicacion_id
         WHERE t.orden_id = :o AND NOT coalesce(d.confirmado, false) ORDER BY d.id""", {"o": int(orden_id or 0)})


async def _confirmar_picking(c: Contexto, a: dict) -> dict:
    pend = await _tarea_pendiente(c, a["orden_id"])
    if not pend:
        return {"exito": False, "resultado": "Esa orden no tiene líneas de picking pendientes de confirmar."}
    ok, errores = 0, []
    for d in pend:
        r = await ejecutor.llamar_api("POST", f"/api/v1/wms/picking-tareas/{d['tarea_id']}/confirmar-item", c.headers,
                                      cuerpo={"detalle_id": d["detalle_id"], "cantidad_pickeada": d["cantidad_solicitada"]})
        if 200 <= r.status_code < 300:
            ok += 1
        else:
            errores.append(f"{d['sku']} en {d['ubicacion']}: {ejecutor._detalle(r)}")
    texto = f"Confirmé {ok} de {len(pend)} línea(s) de picking"
    if errores:
        texto += "; con error: " + " | ".join(errores[:5])
    return {"exito": ok > 0, "resultado": texto + "."}


async def _resumen_confirmar_picking(c: Contexto, a: dict) -> str:
    pend = await _tarea_pendiente(c, a.get("orden_id"))
    lineas = "; ".join(f"{d['cantidad_solicitada']:g} × {d['sku']} en {d['ubicacion']}" for d in pend[:8])
    return (f"Confirmar como alistado TODO el picking pendiente de la orden {await _orden(c, a.get('orden_id'))} "
            f"con las cantidades asignadas · {lineas or 'no hay líneas pendientes'}")


def _construir_despacho(a: dict):
    return "POST", "/api/v1/wms/despachos/", _limpio({
        "orden_id": int(a["orden_id"]), "transportadora_id": a.get("transportadora_id"),
        "vehiculo_placa": a.get("vehiculo_placa"), "conductor_nombre": a.get("conductor_nombre"),
        "fecha_entrega_estimada": (a.get("fecha_entrega_estimada") or "")[:10] or None,
        "muelle": a.get("muelle"), "notas": a.get("notas")})


async def _resumen_despacho(c: Contexto, a: dict) -> str:
    return " · ".join(x for x in [
        f"Crear despacho de la orden {await _orden(c, a.get('orden_id'))} con lo alistado en el picking",
        f"Vehículo {a['vehiculo_placa']}" if a.get("vehiculo_placa") else None,
        f"Conductor {a['conductor_nombre']}" if a.get("conductor_nombre") else None,
        f"Entrega estimada {a['fecha_entrega_estimada'][:10]}" if a.get("fecha_entrega_estimada") else None] if x)


def _construir_estado_despacho(a: dict):
    return "PUT", f"/api/v1/wms/despachos/{int(a['despacho_id'])}/estado", _limpio({
        "estado": a["estado"], "fecha_entrega_real": (a.get("fecha_entrega_real") or "")[:10] or None})


async def _resumen_estado_despacho(c: Contexto, a: dict) -> str:
    f = await _filas(c.db, "SELECT numero_despacho, estado FROM wms_despachos WHERE id = :i", {"i": int(a.get("despacho_id") or 0)})
    d = f"{f[0]['numero_despacho']} (hoy {f[0]['estado']})" if f else "DESPACHO INEXISTENTE"
    return f"Pasar el despacho {d} a {a.get('estado')}" + (
        f" · entregado el {a['fecha_entrega_real'][:10]}" if a.get("fecha_entrega_real") else "")


# ─── Cargues desde Excel (una petición por fila) ─────────────────────────────

async def _producto_id(c: Contexto, sku) -> int:
    f = await _filas(c.db, "SELECT id FROM wms_productos WHERE sku = :s OR codigo_barras = :s LIMIT 1", {"s": str(sku).strip()})
    if not f:
        raise ValueError(f"no hay un producto con SKU {sku}")
    return f[0]["id"]


async def _ubicacion_id(c: Contexto, codigo) -> int:
    f = await _filas(c.db, "SELECT id FROM wms_ubicaciones WHERE codigo = :c LIMIT 1", {"c": str(codigo).strip()})
    if not f:
        raise ValueError(f"no hay una ubicación {codigo}")
    return f[0]["id"]


async def _lote_id(c: Contexto, pid: int, numero) -> Optional[int]:
    if numero in (None, ""):
        return None
    f = await _filas(c.db, "SELECT id FROM wms_lotes WHERE producto_id = :p AND numero_lote = :n LIMIT 1",
                     {"p": pid, "n": str(numero).strip()})
    if not f:
        raise ValueError(f"el producto no tiene el lote {numero}")
    return f[0]["id"]


def _numero(v, nombre: str) -> float:
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        raise ValueError(f"{nombre} no es un número: {v}")


COLUMNAS_AJUSTE = [
    {"clave": "sku", "titulo": "SKU", "requerida": True, "ayuda": "SKU o código de barras del producto",
     "ejemplo": "SKU-00001"},
    {"clave": "ubicacion", "titulo": "Ubicación", "requerida": True, "ayuda": "Código exacto de la ubicación",
     "ejemplo": "FUN-A01-01-1"},
    {"clave": "lote", "titulo": "Lote", "requerida": False, "ayuda": "Número de lote, si el producto maneja lotes"},
    {"clave": "cantidad_nueva", "titulo": "Cantidad nueva", "requerida": True,
     "ayuda": "Lo que debe quedar disponible en esa ubicación (no la diferencia)", "ejemplo": "25"},
    {"clave": "motivo", "titulo": "Motivo", "requerida": True, "ayuda": "Por qué se ajusta (mínimo 3 caracteres)",
     "ejemplo": "Conteo cíclico noviembre"},
]


async def _ajuste_desde_fila(c: Contexto, f: dict):
    pid = await _producto_id(c, f["sku"])
    return _construir_ajuste({"producto_id": pid, "ubicacion_id": await _ubicacion_id(c, f["ubicacion"]),
                              "lote_id": await _lote_id(c, pid, f.get("lote")),
                              "cantidad_nueva": _numero(f["cantidad_nueva"], "la cantidad nueva"),
                              "motivo": str(f["motivo"])})


COLUMNAS_TRASLADO = [
    {"clave": "sku", "titulo": "SKU", "requerida": True, "ayuda": "SKU o código de barras del producto",
     "ejemplo": "SKU-00001"},
    {"clave": "origen", "titulo": "Ubicación origen", "requerida": True, "ayuda": "Código de donde sale",
     "ejemplo": "FUN-A01-01-1"},
    {"clave": "destino", "titulo": "Ubicación destino", "requerida": True, "ayuda": "Código a donde llega",
     "ejemplo": "FUN-A01-01-2"},
    {"clave": "cantidad", "titulo": "Cantidad", "requerida": True, "ejemplo": "5"},
    {"clave": "lote", "titulo": "Lote", "requerida": False, "ayuda": "Número de lote, si el producto maneja lotes"},
    {"clave": "notas", "titulo": "Notas", "requerida": False},
]


async def _traslado_desde_fila(c: Contexto, f: dict):
    pid = await _producto_id(c, f["sku"])
    return _construir_traslado({"producto_id": pid, "ubicacion_origen_id": await _ubicacion_id(c, f["origen"]),
                                "ubicacion_destino_id": await _ubicacion_id(c, f["destino"]),
                                "lote_id": await _lote_id(c, pid, f.get("lote")),
                                "cantidad": _numero(f["cantidad"], "la cantidad"), "notas": f.get("notas")})


importar.registrar(
    importar.Destino("wms_ajustes", "Ajustes de inventario del WMS (uno por fila)", "", "", WMS,
                     columnas=COLUMNAS_AJUSTE, por_fila=_ajuste_desde_fila),
    importar.Destino("wms_traslados", "Traslados entre ubicaciones del WMS (uno por fila)", "", "", WMS,
                     columnas=COLUMNAS_TRASLADO, por_fila=_traslado_desde_fila),
)


_LINEA = {"type": "object", "properties": {
    "producto_id": {"type": "integer"}, "cantidad": {"type": "number"}, "lote_id": {"type": "integer"},
    "ubicacion_id": {"type": "integer", "description": "Solo recepciones: dónde se guarda"},
    "cantidad_esperada": {"type": "number"}, "precio_unitario": {"type": "number"}},
    "required": ["producto_id", "cantidad"], "additionalProperties": False}

HERRAMIENTAS: List[Herramienta] = [
    Herramienta("buscar_productos_wms",
                "Productos del WMS por SKU, nombre, código de barras o referencia, con el total disponible, "
                "reservado y bloqueado. Devuelve el producto_id para las acciones.",
                _obj({"texto": {"type": "string"}, "limite": {"type": "integer"}}), permiso=WMS, consultar=_buscar_productos),
    Herramienta("existencias_wms",
                "Existencias por ubicación y lote (producto_id, ubicacion_id, lote_id, disponible, reservado, "
                "bloqueado, vencimiento). Filtra por producto (SKU o nombre), ubicación, almacén o lotes que vencen "
                "en N días. Úsala antes de ajustar o trasladar.",
                _obj({"producto": {"type": "string"}, "ubicacion": {"type": "string"}, "almacen_id": {"type": "integer"},
                      "por_vencer_dias": {"type": "integer"}, "limite": {"type": "integer"}}),
                permiso=WMS, consultar=_existencias),
    Herramienta("recursos_wms",
                "Almacenes (almacen_id), clientes (cliente_id), ubicaciones (ubicacion_id) y transportadoras "
                "(transportadora_id). El texto filtra clientes, ubicaciones y transportadoras.",
                _obj({"texto": {"type": "string"}}), permiso=WMS, consultar=_recursos_wms),
    Herramienta("documentos_wms",
                "Órdenes de salida (con su picking_id), recepciones o despachos, por número, cliente o estado. "
                "Devuelve el id de cada documento.",
                _obj({"tipo": {"type": "string", "enum": TIPOS_DOCUMENTO}, "texto": {"type": "string"},
                      "estado": {"type": "string"}, "limite": {"type": "integer"}}), permiso=WMS, consultar=_documentos_wms),
    Herramienta("indicadores_wms",
                "Indicadores del almacén en un periodo: órdenes, abiertas y atrasadas, recepciones, despachos, "
                "entregas a tiempo, unidades disponibles y bloqueadas, posiciones por vencer. Reporta las cifras tal cual.",
                _obj({"dias": {"type": "integer"}}), permiso=WMS, consultar=_indicadores_wms),
    Herramienta("crear_recepcion",
                "Registra una recepción de mercancía en un almacén con sus líneas (producto_id, cantidad, ubicacion_id "
                "y lote_id opcionales). Con completar=true la cierra y la mercancía entra al inventario.",
                _obj({"almacen_id": {"type": "integer"}, "tipo": {"type": "string", "enum": TIPOS_RECEPCION},
                      "orden_compra_id": {"type": "integer"}, "lineas": {"type": "array", "items": _LINEA},
                      "completar": {"type": "boolean"}, "notas": {"type": "string"}}, ["almacen_id", "lineas"]),
                permiso=WMS, destructiva=True, accion=_recepcion, resumir=_resumen_recepcion),
    Herramienta("ajustar_inventario",
                "Ajusta la cantidad de un producto en una ubicación (y lote) a un valor absoluto, con motivo "
                "obligatorio. estado=BLOQUEADO ajusta lo retenido en cuarentena.",
                _obj({"producto_id": {"type": "integer"}, "ubicacion_id": {"type": "integer"}, "lote_id": {"type": "integer"},
                      "cantidad_nueva": {"type": "number"}, "estado": {"type": "string", "enum": ["DISPONIBLE", "BLOQUEADO"]},
                      "motivo": {"type": "string"}}, ["producto_id", "ubicacion_id", "cantidad_nueva", "motivo"]),
                permiso=WMS, destructiva=True, construir=_construir_ajuste, resumir=_resumen_ajuste),
    Herramienta("trasladar_inventario",
                "Mueve una cantidad de un producto (y lote) de una ubicación a otra.",
                _obj({"producto_id": {"type": "integer"}, "ubicacion_origen_id": {"type": "integer"},
                      "ubicacion_destino_id": {"type": "integer"}, "lote_id": {"type": "integer"},
                      "cantidad": {"type": "number"}, "notas": {"type": "string"}},
                     ["producto_id", "ubicacion_origen_id", "ubicacion_destino_id", "cantidad"]),
                permiso=WMS, destructiva=True, construir=_construir_traslado, resumir=_resumen_traslado),
    Herramienta("crear_orden_salida",
                "Crea una orden de salida (pedido) para un cliente desde un almacén, con sus líneas. Con "
                "generar_picking=true genera además la tarea de picking (FEFO).",
                _obj({"cliente_id": {"type": "integer"}, "almacen_id": {"type": "integer"},
                      "lineas": {"type": "array", "items": _LINEA},
                      "fecha_requerida": {"type": "string", "description": "AAAA-MM-DD"},
                      "prioridad": {"type": "string", "enum": PRIORIDADES_ORDEN}, "canal": {"type": "string"},
                      "generar_picking": {"type": "boolean"}}, ["cliente_id", "almacen_id", "lineas"]),
                permiso=WMS, destructiva=True, accion=_orden_salida, resumir=_resumen_orden),
    Herramienta("generar_picking",
                "Genera la tarea de picking de una orden de salida PENDIENTE o EN_PICKING, asignando lotes por FEFO.",
                _obj({"orden_id": {"type": "integer"}, "dias_vida_minima": {"type": "integer"}}, ["orden_id"]),
                permiso=WMS, destructiva=True, accion=_picking, resumir=_resumen_picking),
    Herramienta("confirmar_picking",
                "Confirma como alistadas todas las líneas pendientes del picking de una orden, con las cantidades "
                "asignadas. Solo cuando el usuario diga que ya se alistó físicamente.",
                _obj({"orden_id": {"type": "integer"}}, ["orden_id"]),
                permiso=WMS, destructiva=True, accion=_confirmar_picking, resumir=_resumen_confirmar_picking),
    Herramienta("crear_despacho",
                "Crea el despacho de una orden con lo ya alistado en el picking (vehículo, conductor, transportadora, "
                "fecha estimada de entrega).",
                _obj({"orden_id": {"type": "integer"}, "transportadora_id": {"type": "integer"},
                      "vehiculo_placa": {"type": "string"}, "conductor_nombre": {"type": "string"},
                      "fecha_entrega_estimada": {"type": "string"}, "muelle": {"type": "string"},
                      "notas": {"type": "string"}}, ["orden_id"]),
                permiso=WMS, destructiva=True, construir=_construir_despacho, resumir=_resumen_despacho),
    Herramienta("cambiar_estado_despacho",
                "Cambia el estado de un despacho: PREPARANDO→LISTO→EN_TRANSITO→ENTREGADO, o INCIDENCIA. Al "
                "entregar puede llevar la fecha real.",
                _obj({"despacho_id": {"type": "integer"}, "estado": {"type": "string", "enum": ESTADOS_DESPACHO},
                      "fecha_entrega_real": {"type": "string"}}, ["despacho_id", "estado"]),
                permiso=WMS, destructiva=True, construir=_construir_estado_despacho, resumir=_resumen_estado_despacho),
]
