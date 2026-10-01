"""POS de punta a punta contra la COPIA (:8001, base ci_pruebas_form). Corre dentro de ci_backend."""
import asyncio, json, os, urllib.request, urllib.error
from datetime import date, timedelta
from decimal import Decimal
import asyncpg
from app.core.security import create_access_token

B = 'http://127.0.0.1:8001/api/v1'
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', '/ci_pruebas_form')
fallos = 0
hoy = date.today()


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
    print(('ok  ' if c else 'X   ') + t + ('' if c else f'  -> {str(extra)[:400]}'))


def sql(q, *a):
    async def f():
        c = await asyncpg.connect(URL_DB)
        try: return await c.fetch(q, *a)
        finally: await c.close()
    return asyncio.run(f())


def stock(pid, uid=None, lote=None):
    q = 'SELECT coalesce(sum(cantidad_disponible),0) s FROM wms_inventario_ubicacion WHERE producto_id=$1'
    a = [pid]
    if uid: q += f' AND ubicacion_id=${len(a)+1}'; a.append(uid)
    if lote: q += f' AND lote_id=${len(a)+1}'; a.append(lote)
    return float(sql(q, *a)[0]['s'])


# ── Montaje ──────────────────────────────────────────────────────────────────
s, alm = llamar('POST', '/wms/almacenes/', {'codigo': 'PPOS', 'nombre': 'PRUEBA-POS Tienda'})
ok(s == 201, 'almacén creado', alm)
zonas = {}
for cod, tipo in [('VTA', 'ALMACENAMIENTO'), ('REC', 'RECEPCION')]:
    s, z = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': f'PPOS-{cod}', 'nombre': f'PRUEBA-POS {cod}', 'tipo': tipo})
    zonas[cod] = z
    s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'PPOS-{cod}-01'})
    z['ubic'] = u['id']
s, pa = llamar('POST', '/wms/productos/', {'sku': 'PPOS-A', 'nombre': 'PRUEBA-POS Gaseosa', 'tarifa_iva': 19})
s, pb = llamar('POST', '/wms/productos/', {'sku': 'PPOS-B', 'nombre': 'PRUEBA-POS Yogur', 'tarifa_iva': 19, 'requiere_lote': True})
ok(pa and pb and 'id' in pa and 'id' in pb, 'productos creados', (pa, pb))
lotes = {}
for nom, dias in [('L1', 30), ('L2', 60), ('LX', -2)]:
    s, l = llamar('POST', '/wms/lotes/', {'producto_id': pb['id'], 'numero_lote': f'PPOS-{nom}', 'fecha_vencimiento': (hoy + timedelta(days=dias)).isoformat()})
    lotes[nom] = l['id']
VTA = zonas['VTA']['ubic']
for pid, lote, cant in [(pa['id'], None, 10), (pb['id'], lotes['L1'], 3), (pb['id'], lotes['L2'], 5), (pb['id'], lotes['LX'], 4)]:
    s, r = llamar('POST', '/wms/inventario/ajuste/', {'producto_id': pid, 'ubicacion_id': VTA, 'lote_id': lote, 'cantidad_nueva': cant, 'motivo': 'PRUEBA-POS'})
    ok(s == 201, f'existencia inicial {cant}', r)
s, r = llamar('POST', '/wms/inventario/ajuste/', {'producto_id': pa['id'], 'ubicacion_id': zonas['REC']['ubic'], 'cantidad_nueva': 50, 'motivo': 'PRUEBA-POS'})
sql('UPDATE wms_productos SET costo_promedio = 1000 WHERE id=$1', pa['id'])
sql('UPDATE wms_productos SET costo_promedio = 2000 WHERE id=$1', pb['id'])

# ── Configuración ────────────────────────────────────────────────────────────
s, e = llamar('PUT', f'/pos/zonas/{zonas["REC"]["id"]}', {'vendible_pos': True})
ok(s == 422, 'zona: recepción no se puede vender', e)
s, r = llamar('PUT', f'/pos/zonas/{zonas["VTA"]["id"]}', {'vendible_pos': True})
ok(s == 200, 'zona de almacenamiento marcada vendible', r)
s, r = llamar('PUT', f'/pos/productos/{pa["id"]}', {'codigo_barras': '7700000000PPA', 'tarifa_iva': 19})
ok(s == 200, 'producto: código de barras', r)
s, e = llamar('PUT', f'/pos/productos/{pb["id"]}', {'codigo_barras': '7700000000PPA', 'tarifa_iva': 19})
ok(s == 409, 'producto: código de barras repetido se rechaza', e)
s, lista = llamar('POST', '/pos/listas', {'nombre': 'PRUEBA-POS Público'})
s, r = llamar('PUT', f'/pos/listas/{lista["id"]}/precios', [{'producto_id': pa['id'], 'precio': 2380}, {'producto_id': pb['id'], 'precio': 5950}])
ok(s == 200, 'precios guardados', r)
s, pr = llamar('GET', f'/pos/listas/{lista["id"]}/precios?q=PRUEBA-POS')
fa = next(x for x in pr if x['producto_id'] == pa['id'])
ok(fa['margen_pct'] == 50.0, 'margen: base 2.000 sobre costo 1.000 = 50 %', fa)

s, e = llamar('POST', '/erp/resoluciones', {'numero_resolucion': 'PRUEBA', 'fecha_resolucion': hoy.isoformat(), 'prefijo': 'PPOS',
                                             'desde': 10, 'hasta': 5, 'vigencia_desde': hoy.isoformat(), 'vigencia_hasta': hoy.isoformat()})
ok(s == 422, 'resolución: rango al revés se rechaza', e)
s, res = llamar('POST', '/erp/resoluciones', {'numero_resolucion': '18760000001', 'fecha_resolucion': hoy.isoformat(), 'prefijo': 'PPOS',
                                               'desde': 1, 'hasta': 3, 'vigencia_desde': (hoy - timedelta(days=1)).isoformat(),
                                               'vigencia_hasta': (hoy + timedelta(days=365)).isoformat(), 'clave_tecnica': 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c'})
ok(s == 201 and res['siguiente'] == 'PPOS1' and res['restantes'] == 3, 'resolución creada: siguiente PPOS1, quedan 3', res)

s, caja = llamar('POST', '/pos/cajas', {'codigo': 'PPOS1', 'nombre': 'PRUEBA-POS Caja 1', 'almacen_id': alm['id'], 'lista_id': lista['id'],
                                        'resolucion_id': res['id'], 'descuento_maximo': 10})
ok(s == 201 and caja['zonas_vendibles'] == 1, 'caja creada con una ubicación vendible', caja)

# ── Turno y venta ────────────────────────────────────────────────────────────
s, turno = llamar('GET', '/pos/turnos/actual')
if turno:  # un turno viejo del admin en la copia
    llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': turno['resumen']['esperado'], 'observaciones': 'cierre de prueba'})
s, turno = llamar('POST', '/pos/turnos/abrir', {'caja_id': caja['id'], 'base_inicial': 50000})
ok(s == 201, 'turno abierto con base 50.000', turno)
s, e = llamar('POST', '/pos/turnos/abrir', {'caja_id': caja['id'], 'base_inicial': 0})
ok(s == 409, 'no abre dos turnos en la misma caja', e)

s, cat = llamar('GET', f'/pos/cajas/{caja["id"]}/catalogo?q=PRUEBA-POS')
d = {x['producto_id']: x['disponible'] for x in cat}
ok(d.get(pa['id']) == 10 and d.get(pb['id']) == 8, 'catálogo: 10 de A (no cuenta recepción), 8 de B (no cuenta el lote vencido)', cat)
s, cat = llamar('GET', f'/pos/cajas/{caja["id"]}/catalogo?q=7700000000PPA')
ok(len(cat) == 1 and cat[0]['producto_id'] == pa['id'], 'catálogo: encuentra por código de barras', cat)

venta_base = {'caja_id': caja['id'], 'cliente': {}}
s, e = llamar('POST', '/pos/ventas', {**venta_base, 'lineas': [{'producto_id': pa['id'], 'cantidad': 1, 'descuento_pct': 15}], 'pagos': [{'medio': 'EFECTIVO', 'monto': 5000}]})
ok(s == 422, 'venta: descuento por encima del máximo de la caja', e)
s, e = llamar('POST', '/pos/ventas', {**venta_base, 'lineas': [{'producto_id': pa['id'], 'cantidad': 11}], 'pagos': [{'medio': 'EFECTIVO', 'monto': 99999}]})
ok(s == 409, 'venta: sin existencia suficiente (las 50 de recepción no cuentan)', e)
s, e = llamar('POST', '/pos/ventas', {**venta_base, 'lineas': [{'producto_id': pa['id'], 'cantidad': 1}], 'pagos': [{'medio': 'TARJETA_DEBITO', 'monto': 5000}]})
ok(s == 422, 'venta: la tarjeta no puede pasar del total', e)
s, e = llamar('POST', '/pos/ventas', {**venta_base, 'lineas': [{'producto_id': pa['id'], 'cantidad': 1}], 'pagos': [{'medio': 'EFECTIVO', 'monto': 1000}]})
ok(s == 422, 'venta: pago incompleto', e)
ok(stock(pa['id'], VTA) == 10, 'los intentos fallidos no tocaron el inventario', stock(pa['id'], VTA))

s, v = llamar('POST', '/pos/ventas', {**venta_base, 'cliente': {'nombre': 'PRUEBA-POS Cliente', 'documento': '900123456'},
                                      'lineas': [{'producto_id': pa['id'], 'cantidad': 2}, {'producto_id': pb['id'], 'cantidad': 4}],
                                      'pagos': [{'medio': 'TARJETA_DEBITO', 'monto': 10000, 'referencia': '1234'}, {'medio': 'EFECTIVO', 'monto': 20000}]})
ok(s == 201 and v['numero'] == 'PPOS1', 'venta 1: número PPOS1', v)
ok(v.get('total') == 28560 and abs(v['impuestos'] - 4560) < 0.01 and v['cambio'] == 1440, 'venta 1: total 28.560, IVA 4.560 discriminado, cambio 1.440', v)
ok(len(v.get('cufe') or '') == 96, 'venta 1: CUFE SHA-384 (96 hex)', v.get('cufe'))
ok(v.get('costo_total') == 2 * 1000 + 4 * 2000, 'venta 1: costo 10.000 al costo promedio', v.get('costo_total'))
ok(stock(pa['id'], VTA) == 8, 'inventario A: 10 − 2 = 8')
ok(stock(pb['id'], VTA, lotes['L1']) == 0 and stock(pb['id'], VTA, lotes['L2']) == 4 and stock(pb['id'], VTA, lotes['LX']) == 4,
   'FEFO: salen los 3 del lote que vence primero y 1 del siguiente; el vencido no se toca',
   (stock(pb['id'], VTA, lotes['L1']), stock(pb['id'], VTA, lotes['L2']), stock(pb['id'], VTA, lotes['LX'])))
mov = sql("SELECT count(*) n FROM wms_movimientos_inventario WHERE producto_id=ANY($1::int[]) AND tipo='DESPACHO' AND costo_unitario IS NOT NULL", [pa['id'], pb['id']])
ok(mov[0]['n'] == 3, 'kardex: 3 salidas con costo (A, B-L1, B-L2)', mov)

f = sql('SELECT numero, total, estado, origen, estado_dian FROM erp_facturas_cliente WHERE id=(SELECT factura_id FROM pos_venta WHERE id=$1)', v['id'])
ok(f and f[0]['numero'] == 'PPOS1' and float(f[0]['total']) == 28560 and f[0]['origen'] == 'POS' and f[0]['estado_dian'] == 'POR_TRANSMITIR',
   'ERP: factura PPOS1 por 28.560, origen POS, por transmitir a la DIAN', f)
asiento = sql('SELECT c.codigo, sum(m.debito) d, sum(m.credito) c FROM erp_comprobante_lineas m JOIN erp_plan_cuentas c ON c.id=m.cuenta_id '
              'WHERE m.comprobante_id=(SELECT comprobante_id FROM pos_venta WHERE id=$1) GROUP BY c.codigo ORDER BY c.codigo', v['id'])
cuentas = {r['codigo']: (float(r['d']), float(r['c'])) for r in asiento}
ok(sum(x[0] for x in cuentas.values()) == sum(x[1] for x in cuentas.values()) and cuentas, 'asiento cuadrado', cuentas)
ok(cuentas.get('110505') == (18560, 0) and cuentas.get('111005') == (10000, 0) and cuentas.get('413500') == (0, 24000)
   and cuentas.get('240805') == (0, 4560) and cuentas.get('613500') == (10000, 0) and cuentas.get('143505') == (0, 10000),
   'asiento: caja 18.560 (efectivo neto de cambio) + banco 10.000 / ingreso 24.000 + IVA 4.560; costo 10.000 / inventario 10.000', cuentas)

s, vv = llamar('GET', f'/pos/ventas/{v["id"]}')
ok(s == 200 and vv['emisor'] and 'PPOS1' in vv['resolucion'] or 'PPOS' in (vv.get('resolucion') or ''), 'ticket: emisor y texto de la resolución', vv.get('resolucion'))

# ── Devolución ───────────────────────────────────────────────────────────────
la = next(l for l in vv['lineas'] if l['producto_id'] == pa['id'])
lb = next(l for l in vv['lineas'] if l['producto_id'] == pb['id'])
s, e = llamar('POST', '/pos/devoluciones', {'venta_id': v['id'], 'motivo': 'Dañado', 'lineas': [{'linea_id': lb['id'], 'cantidad': 1, 'estado': 'DANADO'}]})
ok(s == 422, 'devolución: lo dañado necesita zona de cuarentena', e)
s, zc = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': 'PPOS-CUA', 'nombre': 'PRUEBA-POS Cuarentena', 'tipo': 'CUARENTENA'})
s, uc = llamar('POST', '/wms/ubicaciones/', {'zona_id': zc['id'], 'codigo': 'PPOS-CUA-01'})
s, e = llamar('POST', '/pos/devoluciones', {'venta_id': v['id'], 'motivo': 'Exceso', 'lineas': [{'linea_id': la['id'], 'cantidad': 3, 'estado': 'BUENO'}]})
ok(s == 422, 'devolución: no más de lo vendido', e)
s, dv = llamar('POST', '/pos/devoluciones', {'venta_id': v['id'], 'motivo': 'Cliente se arrepintió', 'medio_reembolso': 'EFECTIVO',
                                             'lineas': [{'linea_id': la['id'], 'cantidad': 1, 'estado': 'BUENO'},
                                                        {'linea_id': lb['id'], 'cantidad': 1, 'estado': 'DANADO'}]})
ok(s == 201 and abs(dv['total'] - (2380 + 5950)) < 0.01, 'devolución: 1 A + 1 B = 8.330', dv)
ok(stock(pa['id'], VTA) == 9, 'lo bueno vuelve a la ubicación de donde salió (A: 9)', stock(pa['id'], VTA))
ok(stock(pb['id'], uc['id']) == 1, 'lo dañado va a cuarentena (B: 1)', stock(pb['id'], uc['id']))
nc = sql('SELECT numero, total, cude FROM erp_nota_credito_cliente WHERE id=(SELECT nota_credito_id FROM pos_devolucion WHERE id=$1)', dv['id'])
ok(nc and nc[0]['numero'].startswith('NCPPOS1') and len(nc[0]['cude'] or '') == 96 and float(nc[0]['total']) == 8330, 'nota crédito con CUDE', nc)
asiento = sql('SELECT sum(m.debito) d, sum(m.credito) c FROM erp_comprobante_lineas m WHERE m.comprobante_id=(SELECT comprobante_id FROM pos_devolucion WHERE id=$1)', dv['id'])
ok(asiento and asiento[0]['d'] == asiento[0]['c'] and asiento[0]['d'] > 0, 'asiento de la devolución cuadrado', asiento)
s, vv = llamar('GET', f'/pos/ventas/{v["id"]}')
ok(vv['estado'] == 'DEVUELTA_PARCIAL', 'venta queda devuelta parcial', vv['estado'])

# ── Numeración agotada ───────────────────────────────────────────────────────
una = {**venta_base, 'lineas': [{'producto_id': pa['id'], 'cantidad': 1}], 'pagos': [{'medio': 'EFECTIVO', 'monto': 2380}]}
s, v2 = llamar('POST', '/pos/ventas', una)
s, v3 = llamar('POST', '/pos/ventas', una)
ok(v2.get('numero') == 'PPOS2' and v3.get('numero') == 'PPOS3', 'consecutivo PPOS2, PPOS3', (v2, v3))
antes = stock(pa['id'], VTA)
s, e = llamar('POST', '/pos/ventas', una)
ok(s in (409, 422) and stock(pa['id'], VTA) == antes, 'resolución agotada: no vende y no descuenta inventario', (s, e))

# ── Arqueo ───────────────────────────────────────────────────────────────────
s, r = llamar('POST', f'/pos/turnos/{turno["id"]}/movimientos', {'tipo': 'RETIRO', 'monto': 5000, 'motivo': 'Consignación'})
s, t = llamar('GET', '/pos/turnos/actual')
esp = t['resumen']['esperado']
# efectivo: 50.000 + 18.560 + 2.380×2 − 8.330 − 5.000 = 59.990
ok(abs(esp.get('EFECTIVO', 0) - 59990) < 0.01 and abs(esp.get('TARJETA_DEBITO', 0) - 10000) < 0.01, 'arqueo: efectivo esperado 59.990, tarjeta 10.000', esp)
s, e = llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': {'EFECTIVO': 59000, 'TARJETA_DEBITO': 10000}})
ok(s == 422, 'cierre: con diferencia exige explicación', e)
s, r = llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': {'EFECTIVO': 59000, 'TARJETA_DEBITO': 10000}, 'observaciones': 'Faltante en billete'})
ok(s == 200 and abs(r['diferencia'] + 990) < 0.01, 'cierre: diferencia −990 registrada', r)
s, e = llamar('POST', '/pos/ventas', una)
ok(s == 409, 'sin turno no se vende', e)

s, tb = llamar('GET', '/pos/tablero')
ok(s == 200 and tb['ventas'] >= 3 and tb['devoluciones'] >= 8330, 'tablero', tb)
print('\nFALLOS:', fallos)
