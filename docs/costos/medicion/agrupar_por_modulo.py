"""Agrupa la medición por módulo y arma las transacciones típicas."""
import json, sys
from collections import defaultdict

m = json.load(open(sys.argv[1]))
bpr = {t: (v["heap_bytes"] + v["indices_bytes"]) / v["filas"] for t, v in m.items() if v["filas"]}

PREFIJO = {"wms": "wms", "mkp": "wms", "eam": "eam", "fleet": "eam", "tms": "tms", "erp": "erp", "aps": "aps",
           "mes": "mes", "grc": "grc", "scm": "scm", "lms": "lms", "crm": "crm", "sst": "sst", "dms": "dms",
           "loca": "locativa", "hcm": "gh", "ags": "ags", "pos": "pos", "tarifax": "tarifax", "qms": "qms"}
CONTROL = {"estibas", "estiba_stock_minimo", "movimientos", "manifiestos", "manifiesto_historial", "clientes_manifiestos",
           "codigos_dano", "eventos_dano", "ubicaciones", "mantenimientos_estiba", "actividades_mantenimiento", "vehiculos"}
TMS_LEGADO = {"fletes", "vehiculos_flete", "enturnamiento", "conductores", "transportadoras", "generadores_carga", "contratos"}
NOMBRES = {
    "control": "Control de Estibas", "tarifax": "TarifaX", "grc": "GRC · Riesgo", "qms": "QMS · Calidad",
    "dms": "DMS · Documental", "tms": "TMS · Transporte", "eam": "CMMS / EAM", "ags": "AGS · Agenda",
    "pos": "POS · Punto de venta", "wms": "WMS · Almacenes", "gh": "Gestión Humana", "lms": "LMS · Formación",
    "crm": "CRM · Comercial", "mes": "MES · Producción", "aps": "APS · Planeación", "erp": "ERP · Financiero",
    "scm": "SCM · Compras", "sst": "SST", "locativa": "Mant. Locativo", "base": "Base (usuarios y auditoría)",
}


def modulo(t):
    p = t.split("_")[0]
    if p in PREFIJO:
        return PREFIJO[p]
    if t in CONTROL:
        return "control"
    if t in TMS_LEGADO:
        return "tms"
    return "base"


por_modulo = defaultdict(lambda: {"tablas": 0, "filas": 0, "bytes": 0, "indices": 0})
for t, v in m.items():
    d = por_modulo[modulo(t)]
    d["tablas"] += 1
    d["filas"] += v["filas"]
    d["bytes"] += v["heap_bytes"] + v["indices_bytes"]
    d["indices"] += v["n_indices"]

# (clave, módulo, nombre, unidad, origen, {tabla: filas por transacción})
# origen: "medido" = proporciones de un generador coherente; "estimado" = criterio.
TX = [
    ("eam_tanqueo", "eam", "Tanqueo de combustible", "tanqueo", "medido", {"eam_registro_combustible": 1}),
    ("eam_chk", "eam", "Checklist preoperacional", "checklist", "medido",
     {"eam_chk_ejecucion": 1, "eam_chk_respuesta": 13.7}),
    ("eam_insp_llanta", "eam", "Inspección de llanta", "inspección", "medido", {"eam_inspeccion_neumatico": 1}),
    ("eam_mov_llanta", "eam", "Movimiento de llanta (montaje, rotación, reencauche)", "movimiento", "medido",
     {"eam_movimiento_neumatico": 1, "eam_vida_neumatico": 0.31, "eam_reencauche_detalle": 0.14}),
    ("eam_ot", "eam", "Orden de trabajo con repuestos y mano de obra", "orden", "medido",
     {"eam_orden_trabajo": 1, "eam_ot_material": 3.82, "eam_ot_mano_obra": 0.99, "eam_inv_movimiento": 4.36}),
    ("eam_lube", "eam", "Lubricación (carga o muestra de aceite)", "registro", "medido",
     {"eam_lube_carga": 1, "eam_lube_muestra": 0.31, "eam_lube_resultado": 4.6}),
    ("tms_viaje", "tms", "Viaje con eventos, paradas, POD y liquidación", "viaje", "medido",
     {"tms_viaje": 1, "tms_evento": 6.34, "tms_parada": 2.36, "tms_documento": 2.99, "tms_costo_viaje": 1,
      "tms_liquidacion": 1, "tms_otif_registro": 1, "tms_pod": 1, "tms_alerta": 0.13}),
    ("wms_salida", "wms", "Pedido de salida (picking y despacho)", "pedido", "medido",
     {"wms_ordenes_salida": 1, "wms_ordenes_salida_detalle": 2.99, "wms_picking_tareas": 1,
      "wms_picking_detalles": 2.99, "wms_despachos": 1, "wms_despachos_detalle": 2.94,
      "wms_movimientos_inventario": 3.28, "wms_eventos_trazabilidad": 2.98}),
    ("wms_recepcion", "wms", "Recepción de mercancía", "recepción", "medido",
     {"wms_recepciones": 1, "wms_recepciones_detalle": 5.25, "wms_movimientos_inventario": 5.25,
      "wms_eventos_trazabilidad": 1}),
    ("wms_mkp", "wms", "Pedido de marketplace (canal en línea)", "pedido", "estimado",
     {"mkp_pedidos": 1, "mkp_pedido_lineas": 2, "mkp_cola_estado": 2, "mkp_cola_stock": 2, "mkp_bitacora": 3}),
    ("erp_doc", "erp", "Documento contable (factura, pago o nota) con su asiento", "documento", "medido",
     {"erp_comprobantes": 1, "erp_comprobante_lineas": 2.64, "erp_auditoria": 1, "erp_facturas_cliente": 0.45,
      "erp_lineas_factura_cliente": 0.8, "erp_facturas_proveedor": 0.1, "erp_pagos": 0.45}),
    ("scm_compra", "scm", "Solicitud y orden de compra", "solicitud", "medido",
     {"scm_solicitudes_compra": 1, "scm_solicitud_items": 2.34, "scm_ordenes_compra": 0.85, "scm_orden_items": 1.99}),
    ("crm_lead", "crm", "Lead con su seguimiento comercial", "lead", "medido",
     {"crm_lead": 1, "crm_interaccion": 0.59, "crm_oportunidad": 0.29, "crm_cotizacion": 0.27,
      "crm_cotizacion_item": 0.82, "crm_actividad": 0.035}),
    ("dms_doc", "dms", "Documento con versiones, metadatos y firma", "documento", "medido",
     {"dms_documento": 1, "dms_version": 2.0, "dms_metadato_valor": 0.92, "dms_firma": 0.3,
      "dms_instancia": 0.18, "dms_instancia_paso": 0.54, "dms_auditoria": 0.1}),
    ("gh_colab", "gh", "Colaborador activo en el mes (nómina y novedades)", "colaborador·mes", "medido",
     {"hcm_nomina_detalle": 1, "hcm_novedad": 1.2, "hcm_colaborador_historial": 0.1}),
    ("qms_reg", "qms", "Registro de calidad (medición, hallazgo o no conformidad)", "registro", "estimado",
     {"qms_medicion_indicador": 1, "qms_no_conformidad": 0.15, "qms_capa_tarea": 0.2, "qms_auditoria_hallazgo": 0.15}),
    ("grc_eval", "grc", "Prueba de control o evaluación de riesgo", "evaluación", "estimado",
     {"grc_prueba_control": 1, "grc_evidencia": 1, "grc_historial": 1}),
    ("mes_op", "mes", "Orden de producción ejecutada", "orden", "estimado",
     {"mes_orden_produccion": 1, "mes_orden_operacion": 3, "mes_consumo_material": 5, "mes_oee_registro": 3,
      "mes_wip": 3, "mes_scrap": 1, "mes_defecto": 1, "mes_parada": 1}),
    ("aps_plan", "aps", "Producto planeado en un periodo (pronóstico a MRP)", "producto·periodo", "estimado",
     {"aps_demanda": 1, "aps_pronostico": 1, "aps_plan_detalle": 1, "aps_mrp": 1, "aps_orden_sugerida": 0.5,
      "aps_detalle_periodo": 1}),
    ("lms_insc", "lms", "Inscripción con avance y evaluación", "inscripción", "estimado",
     {"lms_inscripcion": 1, "lms_progreso": 3, "lms_intento_evaluacion": 1, "lms_respuesta": 5}),
    ("sst_reg", "sst", "Registro SST (inspección, incidente o entrega de EPP)", "registro", "estimado",
     {"sst_inspecciones": 0.4, "sst_incidentes": 0.2, "sst_entregas_epp": 0.4}),
    ("loca_ot", "locativa", "Orden de trabajo locativa", "orden", "estimado",
     {"loca_ordenes_trabajo": 1, "loca_ot_checklist": 5, "loca_ot_materiales": 2}),
    ("ags_cita", "ags", "Cita con servicios y pago", "cita", "estimado",
     {"ags_cita": 1, "ags_cita_servicio": 1.5, "ags_cita_material": 1, "ags_pago_cita": 1}),
    ("pos_venta", "pos", "Venta con líneas y pago", "venta", "estimado",
     {"pos_venta": 1, "pos_venta_linea": 3, "pos_pago": 1.1, "pos_movimiento_caja": 1}),
    ("control_mov", "control", "Movimiento de estibas", "movimiento", "estimado",
     {"movimientos": 1, "manifiesto_historial": 0.3, "eventos_dano": 0.1}),
    ("tarifax_cot", "tarifax", "Comparación o cotización de tarifa", "comparación", "estimado",
     {"tarifax_comparaciones": 1, "tarifax_ajustes": 0.2}),
]
transacciones = []
for clave, mod, nombre, unidad, origen, tablas in TX:
    falta = [t for t in tablas if t not in bpr]
    assert not falta, (clave, falta)
    b = sum(bpr[t] * r for t, r in tablas.items())
    transacciones.append({"clave": clave, "modulo": mod, "nombre": nombre, "unidad": unidad, "origen": origen,
                          "registros": round(sum(tablas.values()), 2), "bytes": round(b),
                          "detalle": [{"tabla": t, "por_tx": r, "bytes_fila": round(bpr[t])} for t, r in tablas.items()]})

# Por activo al mes en el CMMS de producción (300 activos, 24 meses).
POR_ACTIVO_MES = {"eam_tanqueo": 12.06, "eam_chk": 1.81, "eam_insp_llanta": 9.03, "eam_mov_llanta": 2.43,
                  "eam_ot": 0.985, "eam_lube": 0.53}

n_indices = sum(v["n_indices"] for v in m.values())
total_filas = sum(v["filas"] for v in m.values())
total_bytes = sum(v["heap_bytes"] + v["indices_bytes"] for v in m.values())
salida = {
    "total": {"tablas": len(m), "filas": total_filas, "heap": sum(v["heap_bytes"] for v in m.values()),
              "indices_bytes": sum(v["indices_bytes"] for v in m.values()), "bytes": total_bytes,
              "bytes_fila": round(total_bytes / total_filas), "n_indices": n_indices,
              # Esquema vacío: cada índice ocupa al menos su página de metadatos.
              "esquema_vacio_bytes": n_indices * 8192 + len(m) * 8192,
              "dump_bytes": 72416678},
    "modulos": [{"clave": k, "nombre": NOMBRES[k], **v, "bytes_fila": round(v["bytes"] / v["filas"]) if v["filas"] else 0}
                for k, v in sorted(por_modulo.items(), key=lambda x: -x[1]["bytes"])],
    "transacciones": transacciones,
    "por_activo_mes": POR_ACTIVO_MES,
}
json.dump(salida, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
t = salida["total"]
print(f'{t["filas"]:,} filas · {t["bytes"]/2**20:,.0f} MB · {t["bytes_fila"]} B/fila · {t["n_indices"]} índices · '
      f'esquema vacío {t["esquema_vacio_bytes"]/2**20:.1f} MB · dump {t["dump_bytes"]/t["filas"]:.0f} B/fila')
for x in salida["modulos"]:
    print(f'  {x["nombre"]:28} {x["tablas"]:4} tablas {x["filas"]:>9,} filas {x["bytes"]/2**20:7.1f} MB {x["bytes_fila"]:5} B/fila')
for x in transacciones:
    print(f'  {x["clave"]:16} {x["registros"]:6} reg {x["bytes"]:7,} B  {x["origen"]}')
eam_mes = sum(next(x["bytes"] for x in transacciones if x["clave"] == k) * n for k, n in POR_ACTIVO_MES.items())
print(f"CMMS por activo al mes: {eam_mes/1024:.1f} KB")
