"""Flujo integrado contra la COPIA: cómo viaja un mismo producto entre los módulos.

Una empresa con bodega en Bogotá y tienda en Medellín:
compra → recepción (WMS) → traslado con transporte (TMS) → venta y devolución
en mostrador (POS → ERP/DIAN) → venta B2B con despacho (WMS → TMS) →
devolución del cliente → conteo cíclico. En cada paso se mira qué quedó en
cada módulo, y al final se compara el inventario del WMS con la cuenta de
inventario del ERP.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_flujo_integrado.py
"""
import asyncio, json, os, time, urllib.request, urllib.error
from datetime import date, datetime, timedelta, timezone
import asyncpg
from app.core.security import create_access_token

B = 'http://127.0.0.1:8001/api/v1'
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', '/ci_pruebas_form')
X = f'FI{int(time.time()) % 10000:04d}'
hoy = date.today()
fallos, hallazgos = 0, []


def llamar(m, ruta, cuerpo=None):
    req = urllib.request.Request(B + ruta, method=m, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 headers={'Authorization': 'Bearer ' + T, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t


def ok(c, t, extra=''):
    global fallos
    if not c: fallos += 1
    print(('  ok  ' if c else '  X   ') + t + ('' if c else f'  -> {str(extra)[:400]}'))


def hallazgo(t):
    hallazgos.append(t)
    print('  !!  ' + t)


def paso(t):
    print(f'\n── {t}')


def sql(q, *a):
    async def f():
        c = await asyncpg.connect(URL_DB)
        try: return await c.fetch(q, *a)
        finally: await c.close()
    return asyncio.run(f())


def stock(pid, uid=None, col='cantidad_disponible'):
    q = f'SELECT coalesce(sum({col}),0) s FROM wms_inventario_ubicacion WHERE producto_id=$1'
    return float(sql(q + (' AND ubicacion_id=$2' if uid else ''), *([pid, uid] if uid else [pid]))[0]['s'])


def costo(pid):
    return float(sql('SELECT costo_promedio c FROM wms_productos WHERE id=$1', pid)[0]['c'])


def cuenta_erp(codigo, desde_id):
    """Movimiento neto (débito − crédito) de una cuenta en los comprobantes creados por esta prueba."""
    r = sql('SELECT coalesce(sum(l.debito - l.credito),0) n FROM erp_comprobante_lineas l JOIN erp_plan_cuentas c ON c.id=l.cuenta_id '
            'WHERE c.codigo=$1 AND l.comprobante_id > $2', codigo, desde_id)
    return float(r[0]['n'])


def comprobantes(desde_id):
    return sql('SELECT id, concepto FROM erp_comprobantes WHERE id > $1 ORDER BY id', desde_id)


INICIO_ERP = sql('SELECT coalesce(max(id),0) m FROM erp_comprobantes')[0]['m']

# ════════════════════════════════════════════════════════════════════════════
paso('1. Montaje: bodega en Bogotá, tienda en Medellín, tres productos')
s, bod = llamar('POST', '/wms/almacenes/', {'codigo': f'{X}B', 'nombre': f'{X} Bodega Bogotá', 'ciudad': 'Bogotá D.C.', 'direccion': 'Cra 68 # 13-40'})
s, tda = llamar('POST', '/wms/almacenes/', {'codigo': f'{X}T', 'nombre': f'{X} Tienda Medellín', 'ciudad': 'Medellín', 'direccion': 'Cl 10 # 43-20'})
ok(bod.get('id') and tda.get('id'), 'dos almacenes', (bod, tda))
U = {}
for alm, pref, zonas in [(bod, 'B', ['RECEPCION', 'ALMACENAMIENTO', 'CUARENTENA', 'DESPACHO']), (tda, 'T', ['ALMACENAMIENTO', 'CUARENTENA'])]:
    for tipo in zonas:
        s, z = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': f'{X}{pref}-{tipo[:3]}', 'nombre': f'{tipo.title()}', 'tipo': tipo})
        s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}{pref}-{tipo[:3]}-01', 'pasillo': '01', 'nivel': '1'})
        U[f'{pref}-{tipo}'] = u['id']
        U[f'zona-{pref}-{tipo}'] = z['id']
ok(len([k for k in U if not k.startswith('zona')]) == 6, 'seis ubicaciones (recepción, almacenamiento, cuarentena, despacho y tienda)', U)
s, aceite = llamar('POST', '/wms/productos/', {'sku': f'{X}-ACE', 'nombre': f'{X} Aceite 20W50 galón', 'tarifa_iva': 19, 'peso_kg': 3.6, 'volumen_m3': 0.005})
s, filtro = llamar('POST', '/wms/productos/', {'sku': f'{X}-FIL', 'nombre': f'{X} Filtro de aceite', 'tarifa_iva': 19, 'peso_kg': 0.4, 'volumen_m3': 0.001})
s, grasa = llamar('POST', '/wms/productos/', {'sku': f'{X}-GRA', 'nombre': f'{X} Grasa litio 1 kg', 'tarifa_iva': 19, 'peso_kg': 1.0, 'volumen_m3': 0.0012, 'requiere_lote': True})
s, lote = llamar('POST', '/wms/lotes/', {'producto_id': grasa['id'], 'numero_lote': f'{X}-L1', 'fecha_vencimiento': (hoy + timedelta(days=300)).isoformat()})
ok(all(p.get('id') for p in (aceite, filtro, grasa)) and lote.get('id'), 'productos y lote', (aceite, filtro, grasa, lote))
s, prov = llamar('POST', '/wms/proveedores/', {'codigo': f'{X}-PRV', 'nombre': f'{X} Lubricantes del Valle SAS', 'nit': '900555111'})
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-CLI', 'nombre': f'{X} Transportes La Sabana', 'ciudad': 'Tunja'})
s, tra = llamar('POST', '/wms/transportadoras/', {'codigo': f'{X}-TRA', 'nombre': f'{X} Envía Carga'})

# ════════════════════════════════════════════════════════════════════════════
paso('2. Compra y recepción en la bodega (WMS)')
s, oc = llamar('POST', '/wms/ordenes-compra/', {'proveedor_id': prov['id'], 'almacen_id': bod['id'], 'fecha_esperada': hoy.isoformat(), 'detalles': [
    {'producto_id': aceite['id'], 'cantidad_solicitada': 100, 'precio_unitario': 52000},
    {'producto_id': filtro['id'], 'cantidad_solicitada': 200, 'precio_unitario': 9500},
    {'producto_id': grasa['id'], 'cantidad_solicitada': 50, 'precio_unitario': 18000}]})
ok(s == 201, f'orden de compra {oc.get("numero_oc")}', oc)
llegada = datetime.now(timezone.utc) - timedelta(hours=3)
s, rec = llamar('POST', '/wms/recepciones/', {
    'tipo': 'CONTRA_OC', 'orden_compra_id': oc['id'], 'almacen_id': bod['id'], 'muelle': 'MUELLE-1',
    'fecha_llegada': llegada.isoformat(), 'inicio_descargue': (llegada + timedelta(minutes=15)).isoformat(),
    'fin_descargue': (llegada + timedelta(minutes=55)).isoformat(), 'detalles': [
        {'producto_id': aceite['id'], 'cantidad_esperada': 100, 'cantidad_recibida': 100, 'ubicacion_id': U['B-ALMACENAMIENTO'], 'estado_calidad': 'APROBADO'},
        {'producto_id': filtro['id'], 'cantidad_esperada': 200, 'cantidad_recibida': 190, 'ubicacion_id': U['B-ALMACENAMIENTO'], 'estado_calidad': 'APROBADO',
         'notas': 'Llegaron 10 menos'},
        {'producto_id': grasa['id'], 'lote_id': lote['id'], 'cantidad_esperada': 50, 'cantidad_recibida': 50, 'ubicacion_id': U['B-ALMACENAMIENTO'], 'estado_calidad': 'APROBADO'}]})
ok(s == 201, f'recepción {rec.get("numero_recepcion")} con muelle y tiempos de descargue', rec)
s, r = llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
ok(s == 200, 'recepción completada', r)
ok(stock(aceite['id'], U['B-ALMACENAMIENTO']) == 100 and stock(filtro['id']) == 190 and stock(grasa['id']) == 50,
   'existencias: 100 aceites, 190 filtros (llegaron 10 menos), 50 grasas', (stock(aceite['id']), stock(filtro['id']), stock(grasa['id'])))
ok(costo(aceite['id']) == 52000 and costo(filtro['id']) == 9500, 'costo promedio tomado del precio de la orden de compra', (costo(aceite['id']), costo(filtro['id'])))
e = sql('SELECT estado FROM wms_ordenes_compra WHERE id=$1', oc['id'])[0]['estado']
ok(e in ('PARCIAL', 'COMPLETA'), f'la orden de compra queda {e} (faltaron 10 filtros)', e)
if e == 'COMPLETA':
    hallazgo('La OC queda COMPLETA aunque llegaron 190 de 200 filtros.')
k = sql("SELECT tipo, cantidad, costo_unitario, documento_tipo, depositante_id, almacen_id FROM wms_movimientos_inventario WHERE producto_id=$1 ORDER BY id", aceite['id'])
ok(k and k[-1]['documento_tipo'] == 'RECEPCION' and float(k[-1]['costo_unitario']) == 52000 and k[-1]['almacen_id'] == bod['id'],
   'kárdex: entrada con documento, costo y almacén', [dict(x) for x in k])
valor_recibido = 100 * 52000 + 190 * 9500 + 50 * 18000
ok(True, f'valor recibido: $ {valor_recibido:,.0f}')
if not comprobantes(INICIO_ERP):
    hallazgo(f'ERP: la recepción de $ {valor_recibido:,.0f} no generó ningún comprobante (el evento INVENTARIO_ENTRADA existe pero nadie lo usa). '
             'Inventario y cuentas por pagar al proveedor no se enteran.')

paso('2b. Segunda compra de aceite a otro precio: costo promedio ponderado')
s, oc2 = llamar('POST', '/wms/ordenes-compra/', {'proveedor_id': prov['id'], 'almacen_id': bod['id'], 'detalles': [
    {'producto_id': aceite['id'], 'cantidad_solicitada': 50, 'precio_unitario': 58000}]})
s, rec2 = llamar('POST', '/wms/recepciones/', {'tipo': 'CONTRA_OC', 'orden_compra_id': oc2['id'], 'almacen_id': bod['id'], 'detalles': [
    {'producto_id': aceite['id'], 'cantidad_esperada': 50, 'cantidad_recibida': 50, 'ubicacion_id': U['B-ALMACENAMIENTO'], 'estado_calidad': 'APROBADO'}]})
llamar('POST', f'/wms/recepciones/{rec2["id"]}/completar')
ok(costo(aceite['id']) == 54000, 'aceite: (100 × 52.000 + 50 × 58.000) / 150 = 54.000', costo(aceite['id']))

# ════════════════════════════════════════════════════════════════════════════
paso('3. Traslado de la bodega a la tienda, con transporte por TMS')
viajes_antes = sql('SELECT coalesce(max(id),0) m FROM tms_viaje')[0]['m']
for pid, cant, lot in [(aceite['id'], 30, None), (filtro['id'], 40, None), (grasa['id'], 12, lote['id'])]:
    s, m = llamar('POST', '/wms/inventario/transferencia/', {'producto_id': pid, 'lote_id': lot, 'cantidad': cant, 'ubicacion_origen_id': U['B-ALMACENAMIENTO'],
                                                            'ubicacion_destino_id': U['T-ALMACENAMIENTO'], 'gestion_transporte': 'TMS'})
    ok(s == 201, f'traslado de {cant} unidades', m)
vj = sql('SELECT codigo, tipo_servicio, estado, origen_ciudad, destino_ciudad, peso_kg, descripcion_carga FROM tms_viaje WHERE id > $1 ORDER BY id', viajes_antes)
ok(len(vj) == 3 and all(v['origen_ciudad'] == 'Bogotá D.C.' and v['destino_ciudad'] == 'Medellín' for v in vj),
   f'TMS: {len(vj)} viajes programados Bogotá → Medellín ({", ".join(v["codigo"] for v in vj)})', [dict(v) for v in vj])
ok(vj and str(vj[0]['tipo_servicio']).endswith('NACIONAL') and float(vj[0]['peso_kg']) == 108, 'TMS: servicio nacional; peso del aceite 30 × 3,6 = 108 kg', vj and dict(vj[0]))
if len(vj) == 3:
    hallazgo('TMS: un traslado de 3 productos al mismo destino genera 3 viajes separados (uno por línea), no un viaje con 3 entregas.')
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 30 and stock(aceite['id'], U['B-ALMACENAMIENTO']) == 120, 'aceite: 120 en bodega, 30 en tienda')
t = sql("SELECT documento_tipo FROM wms_movimientos_inventario WHERE producto_id=$1 AND tipo='TRANSFERENCIA'", aceite['id'])
hallazgo('El traslado entre almacenes mueve el stock al instante (sale de Bogotá y aparece en Medellín) aunque el viaje del TMS siga PROGRAMADO: '
         'no hay inventario «en tránsito».')

# ════════════════════════════════════════════════════════════════════════════
paso('4. Venta en mostrador en la tienda (POS → WMS, ERP y DIAN)')
s, r = llamar('PUT', f'/pos/zonas/{U["zona-T-ALMACENAMIENTO"]}', {'vendible_pos': True})
ok(s == 200, 'la zona de almacenamiento de la tienda se vende en el POS', r)
s, lista = llamar('POST', '/pos/listas', {'nombre': f'{X} Mostrador'})
llamar('PUT', f'/pos/listas/{lista["id"]}/precios', [{'producto_id': aceite['id'], 'precio': 75000}, {'producto_id': filtro['id'], 'precio': 16000},
                                                     {'producto_id': grasa['id'], 'precio': 28000}])
s, res = llamar('POST', '/erp/resoluciones', {'numero_resolucion': f'1876{X[2:]}', 'fecha_resolucion': hoy.isoformat(), 'prefijo': X,
                                             'desde': 1, 'hasta': 1000, 'vigencia_desde': (hoy - timedelta(days=1)).isoformat(),
                                             'vigencia_hasta': (hoy + timedelta(days=365)).isoformat(), 'clave_tecnica': 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c'})
s, caja = llamar('POST', '/pos/cajas', {'codigo': X, 'nombre': f'{X} Caja mostrador', 'almacen_id': tda['id'], 'lista_id': lista['id'],
                                        'resolucion_id': res['id'], 'descuento_maximo': 10})
ok(s == 201, 'caja creada en la tienda con su resolución DIAN', caja)
s, turno = llamar('GET', '/pos/turnos/actual')
if turno:
    llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': turno['resumen']['esperado'], 'observaciones': 'cierre de prueba'})
s, turno = llamar('POST', '/pos/turnos/abrir', {'caja_id': caja['id'], 'base_inicial': 200000})
ok(s == 201, 'turno abierto con base de $ 200.000', turno)
s, cat = llamar('GET', f'/pos/cajas/{caja["id"]}/catalogo?q={X}')
dispo = {c['producto_id']: c['disponible'] for c in cat}
ok(dispo == {aceite['id']: 30, filtro['id']: 40, grasa['id']: 12}, 'el POS ve solo lo que hay en la tienda (no las 120 de la bodega)', cat)

base = {'caja_id': caja['id']}
s, v1 = llamar('POST', '/pos/ventas', {**base, 'cliente': {'nombre': 'Carlos Pérez', 'documento': '79555123'},
                                       'lineas': [{'producto_id': aceite['id'], 'cantidad': 2}, {'producto_id': filtro['id'], 'cantidad': 2},
                                                  {'producto_id': grasa['id'], 'cantidad': 1, 'descuento_pct': 5}],
                                       'pagos': [{'medio': 'EFECTIVO', 'monto': 250000}]})
ok(s == 201, f'venta {v1.get("numero")}: 2 aceites, 2 filtros, 1 grasa con 5 % de descuento', v1)
print(f'      total $ {v1["total"]:,.0f} · IVA $ {v1["impuestos"]:,.0f} · cambio $ {v1["cambio"]:,.0f} · costo $ {v1["costo_total"]:,.0f}')
ok(v1['costo_total'] == 2 * 54000 + 2 * 9500 + 18000, 'costo de la venta al promedio del WMS (2 × 54.000 + 2 × 9.500 + 18.000)', v1['costo_total'])
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 28 and stock(filtro['id'], U['T-ALMACENAMIENTO']) == 38 and stock(grasa['id'], U['T-ALMACENAMIENTO']) == 11,
   'WMS: la tienda queda con 28 aceites, 38 filtros, 11 grasas')
ok(stock(aceite['id'], U['B-ALMACENAMIENTO']) == 120, 'WMS: la bodega no se toca (120)')
k = sql("SELECT tipo, documento_tipo, referencia_documento, costo_unitario, lote_id FROM wms_movimientos_inventario WHERE producto_id=$1 ORDER BY id DESC LIMIT 1", grasa['id'])
ok(k and k[0]['lote_id'] == lote['id'], f'kárdex: salida «{k[0]["tipo"]}» con referencia {k[0]["referencia_documento"]} y lote', dict(k[0]))
f = sql('SELECT numero, total, estado_dian, origen, length(cufe) lc FROM erp_facturas_cliente WHERE id=(SELECT factura_id FROM pos_venta WHERE id=$1)', v1['id'])
ok(f and f[0]['origen'] == 'POS' and f[0]['lc'] == 96, f'ERP: factura {f[0]["numero"]} por $ {float(f[0]["total"]):,.0f} con CUFE, {f[0]["estado_dian"]}', f and dict(f[0]))
ok(cuenta_erp('143505', INICIO_ERP) == -v1['costo_total'], f'ERP: inventario (143505) acreditado por el costo, $ {v1["costo_total"]:,.0f}', cuenta_erp('143505', INICIO_ERP))
ok(cuenta_erp('613500', INICIO_ERP) == v1['costo_total'], 'ERP: costo de ventas (613500) debitado por lo mismo')

s, e = llamar('POST', '/pos/ventas', {**base, 'lineas': [{'producto_id': aceite['id'], 'cantidad': 29}], 'pagos': [{'medio': 'EFECTIVO', 'monto': 5_000_000}]})
ok(s == 409, 'venta de 29 aceites rechazada: en la tienda hay 28 (las de la bodega no se venden desde el mostrador)', e)
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 28, 'y no tocó el inventario')

paso('5. Devolución en mostrador: un aceite bueno vuelve al estante, un filtro dañado a cuarentena')
s, vv = llamar('GET', f'/pos/ventas/{v1["id"]}')
la = next(l for l in vv['lineas'] if l['producto_id'] == aceite['id'])
lf = next(l for l in vv['lineas'] if l['producto_id'] == filtro['id'])
s, dv = llamar('POST', '/pos/devoluciones', {'venta_id': v1['id'], 'motivo': 'Compró de más; el filtro venía golpeado', 'medio_reembolso': 'EFECTIVO',
                                             'lineas': [{'linea_id': la['id'], 'cantidad': 1, 'estado': 'BUENO'},
                                                        {'linea_id': lf['id'], 'cantidad': 1, 'estado': 'DANADO'}]})
ok(s == 201, f'devolución por $ {dv.get("total", 0):,.0f}', dv)
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 29, 'WMS: el aceite bueno vuelve al estante de la tienda (29)')
ok(stock(filtro['id'], U['T-CUARENTENA']) == 1 and stock(filtro['id'], U['T-ALMACENAMIENTO']) == 38, 'WMS: el filtro dañado queda en cuarentena, no vendible')
s, cat = llamar('GET', f'/pos/cajas/{caja["id"]}/catalogo?q={X}-FIL')
ok(cat and cat[0]['disponible'] == 38, 'el POS no ofrece el filtro de cuarentena', cat)
nc = sql('SELECT numero, total, length(cude) lc FROM erp_nota_credito_cliente WHERE id=(SELECT nota_credito_id FROM pos_devolucion WHERE id=$1)', dv['id'])
ok(nc and nc[0]['lc'] == 96, f'ERP: nota crédito {nc[0]["numero"]} con CUDE', nc and dict(nc[0]))
ok(cuenta_erp('143505', INICIO_ERP) == -v1['costo_total'] + 54000 + 9500,
   'ERP: el inventario vuelve a subir por el costo de lo devuelto (54.000 + 9.500)', cuenta_erp('143505', INICIO_ERP))
hallazgo('POS: el filtro dañado vuelve a la cuenta de inventario del ERP a costo pleno, aunque está en cuarentena; si se da de baja, '
         'esa pérdida no se registra en ningún lado (ver el conteo).')

# ════════════════════════════════════════════════════════════════════════════
paso('6. Venta B2B desde la bodega con despacho por TMS')
s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': bod['id'], 'fecha_requerida': (hoy + timedelta(days=2)).isoformat(),
                                               'detalles': [{'producto_id': aceite['id'], 'cantidad_solicitada': 40}, {'producto_id': filtro['id'], 'cantidad_solicitada': 60}]})
ok(s == 201, f'orden de salida {o.get("numero_orden")}', o)
s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
ok(s == 201 and len(t['detalles']) == 2, 'alistamiento generado con 2 líneas', t)
ok(stock(aceite['id'], U['B-ALMACENAMIENTO'], 'cantidad_reservada') == 40, 'WMS: 40 aceites reservados mientras se alistan')
for d in t['detalles']:
    s, r = llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': d['cantidad_solicitada']})
ok(s == 200, 'alistamiento confirmado', r)
viajes_antes = sql('SELECT coalesce(max(id),0) m FROM tms_viaje')[0]['m']
s, dsp = llamar('POST', '/wms/despachos/', {'orden_id': o['id'], 'transportadora_id': tra['id'], 'vehiculo_placa': 'TSX482', 'conductor_nombre': 'Jairo Gómez',
                                            'peso_total_kg': 168, 'gestion_transporte': 'TMS'})
ok(s == 201, f'despacho {dsp.get("numero_despacho")}', dsp)
vj = sql('SELECT codigo, wms_despacho_id, destino_ciudad, estado, peso_kg FROM tms_viaje WHERE id > $1', viajes_antes)
ok(len(vj) == 1 and vj[0]['wms_despacho_id'] == dsp['id'] and vj[0]['destino_ciudad'] == 'Tunja',
   f'TMS: viaje {vj[0]["codigo"] if vj else "—"} ligado al despacho, destino Tunja', [dict(v) for v in vj])
ok(stock(aceite['id'], U['B-ALMACENAMIENTO']) == 80 and stock(aceite['id'], U['B-ALMACENAMIENTO'], 'cantidad_reservada') == 0,
   'WMS: bodega con 80 aceites y sin reservas')
antes = cuenta_erp('143505', INICIO_ERP)
hallazgo(f'ERP: el despacho B2B de 40 aceites y 60 filtros (costo $ {40 * 54000 + 60 * 9500:,.0f}) no genera factura al cliente ni asiento de costo; '
         'el POS sí lo hace. La venta B2B queda solo en el WMS.')

paso('7. El cliente devuelve 5 aceites')
s, dev = llamar('POST', '/wms/devoluciones/', {'numero_devolucion': f'{X}-DEV1', 'tipo': 'CLIENTE', 'orden_referencia_id': o['id'], 'cliente_id': cli['id'],
                                               'almacen_id': bod['id'], 'fecha_recepcion': hoy.isoformat(), 'estado': 'PENDIENTE', 'motivo': 'Referencia equivocada',
                                               'detalles': [{'producto_id': aceite['id'], 'cantidad': 5, 'estado_calidad': 'APROBADO', 'accion': 'REINGRESAR'}]})
ok(s == 201, 'devolución registrada', dev)
s, r = llamar('PUT', f'/wms/devoluciones/{dev["id"]}/procesar', {'estado': 'REINGRESADA'})
ok(s == 200 and stock(aceite['id'], U['B-ALMACENAMIENTO']) == 85, 'WMS: reingresan a almacenamiento (85)', (s, r, stock(aceite['id'], U['B-ALMACENAMIENTO'])))

paso('8. Conteo cíclico en la bodega: faltan 3 filtros')
sistema = stock(filtro['id'], U['B-ALMACENAMIENTO'])
s, c = llamar('POST', '/wms/conteos/', {'almacen_id': bod['id'], 'tipo': 'CICLICO', 'fecha_programada': hoy.isoformat(),
                                        'detalles': [{'producto_id': filtro['id'], 'ubicacion_id': U['B-ALMACENAMIENTO'], 'cantidad_sistema': sistema}]})
ok(s == 201, f'conteo creado (sistema: {sistema:g})', c)
s, r = llamar('PUT', f'/wms/conteos/{c["id"]}/detalles/{c["detalles"][0]["id"]}', {'cantidad_fisica': sistema - 3})
s, r = llamar('PUT', f'/wms/conteos/{c["id"]}/completar')
ok(s == 200 and stock(filtro['id'], U['B-ALMACENAMIENTO']) == sistema - 3, f'WMS: ajuste por conteo, quedan {sistema - 3:g}', (s, r))
hallazgo(f'ERP: la pérdida de 3 filtros ($ {3 * 9500:,.0f}) ajusta el WMS pero no genera asiento de merma.')

# ════════════════════════════════════════════════════════════════════════════
paso('9. Trazabilidad: el kárdex del aceite de punta a punta')
k = sql("""SELECT m.created_at, m.tipo, m.cantidad, uo.codigo o, ud.codigo d, m.documento_tipo, m.referencia_documento r
             FROM wms_movimientos_inventario m LEFT JOIN wms_ubicaciones uo ON uo.id=m.ubicacion_origen_id
             LEFT JOIN wms_ubicaciones ud ON ud.id=m.ubicacion_destino_id WHERE m.producto_id=$1 ORDER BY m.id""", aceite['id'])
for m in k:
    print(f'      {m["tipo"]:<14} {float(m["cantidad"]):>6g}  {(m["o"] or "—"):<18} → {(m["d"] or "—"):<18} {m["documento_tipo"] or "":<11} {m["r"] or ""}')
neto = sum(float(m['cantidad']) * ((1 if m['d'] else 0) - (1 if m['o'] else 0)) for m in k)
ok(neto == stock(aceite['id']) == 85 + 29, f'el kárdex suma lo que hay: {neto:g} = 85 en bodega + 29 en tienda', (neto, stock(aceite['id'])))
ev = sql("SELECT tipo_evento, count(*) n FROM wms_eventos_trazabilidad WHERE producto_id=$1 GROUP BY 1 ORDER BY 1", aceite['id'])
print('      bitácora: ' + ', '.join(f'{e["tipo_evento"]} ×{e["n"]}' for e in ev))

paso('10. Cuadre: inventario del WMS frente a la cuenta de inventario del ERP')
valor_wms = sum((stock(p['id']) + stock(p['id'], None, 'cantidad_bloqueada') + stock(p['id'], None, 'cantidad_reservada')) * costo(p['id']) for p in (aceite, filtro, grasa))
erp = cuenta_erp('143505', INICIO_ERP)
print(f'      WMS (existencias × costo promedio): $ {valor_wms:,.0f}')
print(f'      ERP cuenta 143505 por esta operación: $ {erp:,.0f}')
ok(True, f'diferencia: $ {valor_wms - erp:,.0f}')
if abs(valor_wms - erp) > 1:
    hallazgo(f'Cuadre: el WMS vale $ {valor_wms:,.0f} y el ERP registra $ {erp:,.0f} en inventario. Solo el POS escribe en el ERP; '
             'las compras, el despacho B2B y el conteo no, así que la cuenta queda negativa.')
print('      comprobantes ERP creados: ' + '; '.join(c['concepto'] for c in comprobantes(INICIO_ERP)))

s, tb = llamar('GET', '/pos/tablero')
s, r = llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': llamar('GET', '/pos/turnos/actual')[1]['resumen']['esperado']})
ok(s == 200, 'turno de caja cerrado sin diferencia', r)

print(f'\nPREFIJO: {X}')
print(f'HALLAZGOS: {len(hallazgos)}')
for h in hallazgos:
    print(' - ' + h)
print('FALLOS:', fallos)
