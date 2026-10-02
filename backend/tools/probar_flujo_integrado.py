"""Flujo integrado: cómo viaja un mismo producto entre los módulos.

Una empresa con bodega en Bogotá y tienda en Medellín:
compra → recepción (WMS → ERP) → factura del proveedor (ERP) → traslado en
tránsito con su viaje (WMS → TMS) → venta, devolución y baja en mostrador
(POS → WMS, ERP y DIAN) → venta B2B facturada y despachada (WMS → ERP, TMS) →
devolución del cliente con nota crédito → conteo cíclico. En cada paso se mira
qué quedó en cada módulo, y al final el inventario del WMS tiene que valer
exactamente lo que dice la cuenta de inventario del ERP.

Por defecto corre contra la COPIA (:8001, base ci_pruebas_form):

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_flujo_integrado.py

Para dejar los datos a la vista en la aplicación local (http://localhost:5173):

    docker exec -w /app -e PYTHONPATH=/app -e API=http://127.0.0.1:8000/api/v1 -e BASE=control_inventarios \
        ci_backend python tools/probar_flujo_integrado.py

Todo lo que crea lleva el prefijo que imprime al final (FIxxxx).
"""
import asyncio, json, os, time, urllib.request, urllib.error
from datetime import date, datetime, timedelta, timezone
import asyncpg
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
BASE = os.environ.get('BASE', 'ci_pruebas_form')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', f'/{BASE}')
X = f'FI{int(time.time()) % 10000:04d}'
hoy = (datetime.now(timezone.utc) - timedelta(hours=5)).date()
fallos = 0


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
    print(('  ok  ' if c else '  X   ') + t + ('' if c else f'  -> {str(extra)[:500]}'))


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


def total(pid):
    return stock(pid) + stock(pid, None, 'cantidad_reservada') + stock(pid, None, 'cantidad_bloqueada')


def costo(pid):
    return float(sql('SELECT costo_promedio c FROM wms_productos WHERE id=$1', pid)[0]['c'])


class Libro:
    """Los saldos de las cuentas del ERP en los comprobantes de esta prueba, y
    cuánto se movió cada una desde la última vez que se preguntó."""
    def __init__(self):
        self.inicio = sql('SELECT coalesce(max(id),0) m FROM erp_comprobantes')[0]['m']
        self.antes = {}

    def saldo(self, codigo):
        r = sql('SELECT coalesce(sum(l.debito - l.credito),0) n FROM erp_comprobante_lineas l JOIN erp_plan_cuentas c ON c.id=l.cuenta_id '
                'WHERE c.codigo=$1 AND l.comprobante_id > $2', codigo, self.inicio)
        return float(r[0]['n'])

    def mov(self, *codigos):
        """Cuánto se movió cada cuenta desde la llamada anterior."""
        out = {}
        for c in codigos:
            s = self.saldo(c)
            out[c] = round(s - self.antes.get(c, 0), 2)
            self.antes[c] = s
        return out

    def marcar(self):
        for c in ('143505', '220510', '220505', '613500', '531595', '429595', '130505', '413500', '240805', '427500', '539995', '240810'):
            self.antes[c] = self.saldo(c)

    def conceptos(self):
        return [r['concepto'] for r in sql('SELECT concepto FROM erp_comprobantes WHERE id > $1 ORDER BY id', self.inicio)]


libro = Libro()

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
s, aceite = llamar('POST', '/wms/productos/', {'sku': f'{X}-ACE', 'nombre': f'{X} Aceite 20W50 galón', 'tarifa_iva': 19, 'peso_kg': 3.6, 'volumen_m3': 0.005})
s, filtro = llamar('POST', '/wms/productos/', {'sku': f'{X}-FIL', 'nombre': f'{X} Filtro de aceite', 'tarifa_iva': 19, 'peso_kg': 0.4, 'volumen_m3': 0.001})
s, grasa = llamar('POST', '/wms/productos/', {'sku': f'{X}-GRA', 'nombre': f'{X} Grasa litio 1 kg', 'tarifa_iva': 19, 'peso_kg': 1.0, 'volumen_m3': 0.0012, 'requiere_lote': True})
s, lote = llamar('POST', '/wms/lotes/', {'producto_id': grasa['id'], 'numero_lote': f'{X}-L1', 'fecha_vencimiento': (hoy + timedelta(days=300)).isoformat()})
PRODS = (aceite, filtro, grasa)
ok(all(p.get('id') for p in PRODS) and lote.get('id'), 'productos y lote', (aceite, filtro, grasa, lote))
s, prov = llamar('POST', '/wms/proveedores/', {'codigo': f'{X}-PRV', 'nombre': f'{X} Lubricantes del Valle SAS', 'nit': f'9005{X[2:]}11'})
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-CLI', 'nombre': f'{X} Transportes La Sabana SAS', 'ciudad': 'Tunja', 'nit': f'8001{X[2:]}22'})
s, tra = llamar('POST', '/wms/transportadoras/', {'codigo': f'{X}-TRA', 'nombre': f'{X} Envía Carga'})
s, res = llamar('POST', '/erp/resoluciones', {'tipo_documento': 'FACTURA_VENTA', 'numero_resolucion': f'1876{X[2:]}', 'fecha_resolucion': hoy.isoformat(),
                                             'prefijo': X, 'desde': 1, 'hasta': 1000, 'vigencia_desde': (hoy - timedelta(days=1)).isoformat(),
                                             'vigencia_hasta': (hoy + timedelta(days=365)).isoformat(), 'clave_tecnica': 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c'})
ok(s == 201, f'resolución DIAN de factura de venta con prefijo {X}', res)
libro.marcar()

# ════════════════════════════════════════════════════════════════════════════
paso('2. Compra y recepción en la bodega (WMS → ERP)')
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
s, r = llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
ok(s == 200, f'recepción {rec.get("numero_recepcion")} completada', r)
ok(stock(aceite['id'], U['B-ALMACENAMIENTO']) == 100 and stock(filtro['id']) == 190 and stock(grasa['id']) == 50,
   'WMS: 100 aceites, 190 filtros (llegaron 10 menos), 50 grasas')
e = sql('SELECT estado FROM wms_ordenes_compra WHERE id=$1', oc['id'])[0]['estado']
ok(e == 'PARCIAL', f'la orden de compra queda {e}', e)
recibido = 100 * 52000 + 190 * 9500 + 50 * 18000
m = libro.mov('143505', '220510')
ok(m == {'143505': recibido, '220510': -recibido},
   f'ERP: inventario +$ {recibido:,.0f} contra «mercancía recibida por facturar» (220510)', m)
s, pend = llamar('GET', '/erp/cxp/recepciones-por-facturar')
fila = next((x for x in pend if x['id'] == rec['id']), None)
ok(fila and fila['valor'] == recibido and fila['proveedor_nit'] == prov['nit'], 'ERP: la recepción aparece en «por facturar» con su valor y proveedor', fila)

paso('2b. Llega la factura del proveedor y se registra en el ERP ligada a la recepción')
s, fp = llamar('POST', '/erp/cxp/facturas', {'numero_proveedor': f'FE-{X}', 'proveedor_nombre': prov['nombre'], 'proveedor_nit': prov['nit'],
                                             'fecha': hoy.isoformat(), 'subtotal': recibido + 20000, 'total_impuestos': round((recibido + 20000) * 0.19),
                                             'total': round((recibido + 20000) * 1.19), 'recepcion_wms_id': rec['id']})
ok(s == 201, 'factura del proveedor registrada (cobra $ 20.000 más que la orden)', fp)
m = libro.mov('220510', '220505', '539995', '240810', '143505')
ok(m['220510'] == recibido and m['539995'] == 20000 and m['143505'] == 0 and m['220505'] == -round((recibido + 20000) * 1.19),
   'ERP: salda «por facturar», la diferencia de precio va a gasto, nace la cuenta por pagar al proveedor', m)
s, e = llamar('POST', '/erp/cxp/facturas', {'numero_proveedor': f'FE2-{X}', 'proveedor_nombre': prov['nombre'], 'fecha': hoy.isoformat(),
                                            'subtotal': 1, 'total': 1, 'recepcion_wms_id': rec['id']})
ok(s == 409, 'una recepción no se factura dos veces', e)

paso('2c. Segunda compra de aceite a otro precio: costo promedio ponderado')
s, oc2 = llamar('POST', '/wms/ordenes-compra/', {'proveedor_id': prov['id'], 'almacen_id': bod['id'], 'detalles': [
    {'producto_id': aceite['id'], 'cantidad_solicitada': 50, 'precio_unitario': 58000}]})
s, rec2 = llamar('POST', '/wms/recepciones/', {'tipo': 'CONTRA_OC', 'orden_compra_id': oc2['id'], 'almacen_id': bod['id'], 'detalles': [
    {'producto_id': aceite['id'], 'cantidad_esperada': 50, 'cantidad_recibida': 50, 'ubicacion_id': U['B-ALMACENAMIENTO'], 'estado_calidad': 'APROBADO'}]})
llamar('POST', f'/wms/recepciones/{rec2["id"]}/completar')
ok(costo(aceite['id']) == 54000, 'aceite: (100 × 52.000 + 50 × 58.000) / 150 = 54.000', costo(aceite['id']))
ok(libro.mov('143505')['143505'] == 50 * 58000, 'ERP: inventario +$ 2.900.000 (queda por facturar hasta que llegue su factura)')

# ════════════════════════════════════════════════════════════════════════════
paso('3. Traslado de la bodega a la tienda: un viaje del TMS y la mercancía en tránsito')
viajes_antes = sql('SELECT coalesce(max(id),0) m FROM tms_viaje')[0]['m']
s, tr = llamar('POST', '/wms/traslados', {'almacen_origen_id': bod['id'], 'almacen_destino_id': tda['id'], 'gestion_transporte': 'TMS',
                                          'notas': 'Surtido semanal de la tienda', 'lineas': [
    {'producto_id': aceite['id'], 'cantidad': 30, 'ubicacion_origen_id': U['B-ALMACENAMIENTO'], 'ubicacion_destino_id': U['T-ALMACENAMIENTO']},
    {'producto_id': filtro['id'], 'cantidad': 40, 'ubicacion_origen_id': U['B-ALMACENAMIENTO'], 'ubicacion_destino_id': U['T-ALMACENAMIENTO']},
    {'producto_id': grasa['id'], 'lote_id': lote['id'], 'cantidad': 12, 'ubicacion_origen_id': U['B-ALMACENAMIENTO'], 'ubicacion_destino_id': U['T-ALMACENAMIENTO']}]})
ok(s == 201 and tr['estado'] == 'EN_TRANSITO', f'traslado {tr.get("numero")} en tránsito', tr)
vj = sql('SELECT codigo, tipo_servicio, estado, origen_ciudad, destino_ciudad, peso_kg FROM tms_viaje WHERE id > $1 ORDER BY id', viajes_antes)
ok(len(vj) == 1 and vj[0]['destino_ciudad'] == 'Medellín' and float(vj[0]['peso_kg']) == 30 * 3.6 + 40 * 0.4 + 12 * 1.0,
   f'TMS: UN viaje ({vj[0]["codigo"] if vj else "—"}) Bogotá → Medellín con las tres líneas: 136 kg', [dict(v) for v in vj])
transito = sql('SELECT ubicacion_transito_id u FROM wms_traslados WHERE id=$1', tr['id'])[0]['u']
ok(stock(aceite['id'], U['B-ALMACENAMIENTO']) == 120 and stock(aceite['id'], transito) == 30 and stock(aceite['id'], U['T-ALMACENAMIENTO']) == 0,
   'WMS: 120 aceites en bodega, 30 en tránsito, 0 todavía en la tienda')
ok(libro.mov('143505')['143505'] == 0, 'ERP: un traslado no cambia el valor del inventario (sigue siendo de la empresa)')

paso('3b. La tienda recibe: llegan 39 filtros de 40')
dets = {l['producto_id']: l for l in tr['lineas']}
s, tr = llamar('POST', f'/wms/traslados/{tr["id"]}/recibir', {'lineas': [{'detalle_id': dets[filtro['id']]['id'], 'cantidad_recibida': 39}],
                                                              'notas': 'Una caja de filtros llegó abierta'})
ok(s == 200 and tr['estado'] == 'RECIBIDO', 'traslado recibido', tr)
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 30 and stock(filtro['id'], U['T-ALMACENAMIENTO']) == 39 and stock(grasa['id'], U['T-ALMACENAMIENTO']) == 12
   and stock(filtro['id'], transito) == 0, 'WMS: la tienda queda con 30 aceites, 39 filtros y 12 grasas; el tránsito vacío')
v = sql('SELECT estado FROM tms_viaje WHERE id > $1', viajes_antes)
ok(v and v[0]['estado'] == 'ENTREGADO', 'TMS: el viaje queda entregado al recibir', v and dict(v[0]))
m = libro.mov('143505', '531595')
ok(m == {'143505': -9500, '531595': 9500}, 'ERP: el filtro que no llegó es merma (−$ 9.500)', m)

# ════════════════════════════════════════════════════════════════════════════
paso('4. Venta en mostrador en la tienda (POS → WMS, ERP y DIAN)')
s, r = llamar('PUT', f'/pos/zonas/{U["zona-T-ALMACENAMIENTO"]}', {'vendible_pos': True})
s, lista = llamar('POST', '/pos/listas', {'nombre': f'{X} Mostrador'})
llamar('PUT', f'/pos/listas/{lista["id"]}/precios', [{'producto_id': aceite['id'], 'precio': 75000}, {'producto_id': filtro['id'], 'precio': 16000},
                                                     {'producto_id': grasa['id'], 'precio': 28000}])
s, resp = llamar('POST', '/erp/resoluciones', {'numero_resolucion': f'1877{X[2:]}', 'fecha_resolucion': hoy.isoformat(), 'prefijo': f'P{X[2:]}',
                                              'desde': 1, 'hasta': 1000, 'vigencia_desde': (hoy - timedelta(days=1)).isoformat(),
                                              'vigencia_hasta': (hoy + timedelta(days=365)).isoformat(), 'clave_tecnica': 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c'})
s, caja = llamar('POST', '/pos/cajas', {'codigo': X, 'nombre': f'{X} Caja mostrador', 'almacen_id': tda['id'], 'lista_id': lista['id'],
                                        'resolucion_id': resp['id'], 'descuento_maximo': 10})
ok(s == 201, 'caja de la tienda con su resolución POS', caja)
s, turno = llamar('GET', '/pos/turnos/actual')
if turno:
    llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': turno['resumen']['esperado'], 'observaciones': 'cierre de prueba'})
s, turno = llamar('POST', '/pos/turnos/abrir', {'caja_id': caja['id'], 'base_inicial': 200000})
ok(s == 201, 'turno abierto con base de $ 200.000', turno)
s, cat = llamar('GET', f'/pos/cajas/{caja["id"]}/catalogo?q={X}')
ok({c['producto_id']: c['disponible'] for c in cat} == {aceite['id']: 30, filtro['id']: 39, grasa['id']: 12},
   'el POS ve solo lo que hay en la tienda', cat)
base = {'caja_id': caja['id']}
s, v1 = llamar('POST', '/pos/ventas', {**base, 'cliente': {'nombre': 'Carlos Pérez', 'documento': '79555123'},
                                       'lineas': [{'producto_id': aceite['id'], 'cantidad': 2}, {'producto_id': filtro['id'], 'cantidad': 2},
                                                  {'producto_id': grasa['id'], 'cantidad': 1, 'descuento_pct': 5}],
                                       'pagos': [{'medio': 'EFECTIVO', 'monto': 250000}]})
ok(s == 201, f'venta {v1.get("numero")}: total $ {v1.get("total", 0):,.0f}, cambio $ {v1.get("cambio", 0):,.0f}', v1)
ok(v1['costo_total'] == 2 * 54000 + 2 * 9500 + 18000, 'costo al promedio del WMS: $ 145.000', v1['costo_total'])
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 28 and stock(filtro['id'], U['T-ALMACENAMIENTO']) == 37 and stock(grasa['id'], U['T-ALMACENAMIENTO']) == 11,
   'WMS: la tienda queda con 28 aceites, 37 filtros, 11 grasas')
m = libro.mov('143505', '613500')
ok(m == {'143505': -145000, '613500': 145000}, 'ERP: costo de ventas contra inventario por $ 145.000', m)
s, e = llamar('POST', '/pos/ventas', {**base, 'lineas': [{'producto_id': aceite['id'], 'cantidad': 29}], 'pagos': [{'medio': 'EFECTIVO', 'monto': 5_000_000}]})
ok(s == 409, 'no vende 29 aceites: en la tienda hay 28', e)

paso('5. Devolución en mostrador y baja de lo dañado')
s, vv = llamar('GET', f'/pos/ventas/{v1["id"]}')
la = next(l for l in vv['lineas'] if l['producto_id'] == aceite['id'])
lf = next(l for l in vv['lineas'] if l['producto_id'] == filtro['id'])
s, dv = llamar('POST', '/pos/devoluciones', {'venta_id': v1['id'], 'motivo': 'Compró de más; el filtro venía golpeado', 'medio_reembolso': 'EFECTIVO',
                                             'lineas': [{'linea_id': la['id'], 'cantidad': 1, 'estado': 'BUENO'},
                                                        {'linea_id': lf['id'], 'cantidad': 1, 'estado': 'DANADO'}]})
ok(s == 201, f'devolución por $ {dv.get("total", 0):,.0f} con nota crédito', dv)
ok(stock(aceite['id'], U['T-ALMACENAMIENTO']) == 29 and stock(filtro['id'], U['T-CUARENTENA'], 'cantidad_bloqueada') + stock(filtro['id'], U['T-CUARENTENA']) == 1,
   'WMS: el aceite vuelve al estante (29); el filtro dañado a cuarentena')
m = libro.mov('143505')
ok(m['143505'] == 54000 + 9500, 'ERP: los dos vuelven al inventario a su costo', m)
estado_cua = 'BLOQUEADO' if stock(filtro['id'], U['T-CUARENTENA'], 'cantidad_bloqueada') else 'DISPONIBLE'
s, r = llamar('POST', '/wms/inventario/ajuste/', {'producto_id': filtro['id'], 'ubicacion_id': U['T-CUARENTENA'], 'cantidad_nueva': 0,
                                                  'estado': estado_cua, 'motivo': 'Baja: filtro golpeado, no se puede vender'})
ok(s == 201, 'baja del filtro dañado desde cuarentena', r)
m = libro.mov('143505', '531595')
ok(m == {'143505': -9500, '531595': 9500}, 'ERP: la baja es merma (−$ 9.500)', m)

# ════════════════════════════════════════════════════════════════════════════
paso('6. Venta B2B desde la bodega: alistamiento, despacho por TMS y factura electrónica')
s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': bod['id'], 'fecha_requerida': (hoy + timedelta(days=2)).isoformat(),
                                               'detalles': [{'producto_id': aceite['id'], 'cantidad_solicitada': 40, 'precio_unitario': 70000},
                                                            {'producto_id': filtro['id'], 'cantidad_solicitada': 60, 'precio_unitario': 14000}]})
ok(s == 201, f'orden de salida {o.get("numero_orden")} con precios', o)
s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
ok(stock(aceite['id'], U['B-ALMACENAMIENTO'], 'cantidad_reservada') == 40, 'WMS: 40 aceites reservados mientras se alistan')
for d in t['detalles']:
    s, r = llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': d['cantidad_solicitada']})
viajes_antes = sql('SELECT coalesce(max(id),0) m FROM tms_viaje')[0]['m']
libro.marcar()
s, dsp = llamar('POST', '/wms/despachos/', {'orden_id': o['id'], 'transportadora_id': tra['id'], 'vehiculo_placa': 'TSX482', 'conductor_nombre': 'Jairo Gómez',
                                            'peso_total_kg': 168, 'gestion_transporte': 'TMS'})
ok(s == 201 and dsp.get('factura_numero'), f'despacho {dsp.get("numero_despacho")} facturado: {dsp.get("factura_numero")}', dsp)
vj = sql('SELECT codigo, wms_despacho_id, destino_ciudad FROM tms_viaje WHERE id > $1', viajes_antes)
ok(len(vj) == 1 and vj[0]['wms_despacho_id'] == dsp['id'] and vj[0]['destino_ciudad'] == 'Tunja', f'TMS: viaje {vj[0]["codigo"] if vj else "—"} a Tunja', [dict(v) for v in vj])
venta = 40 * 70000 + 60 * 14000
f = sql('SELECT numero, subtotal, total_impuestos, total, saldo, length(cufe) lc, estado_dian, origen FROM erp_facturas_cliente WHERE id=$1', dsp['factura_id'])
ok(f and float(f[0]['subtotal']) == venta and float(f[0]['total']) == round(venta * 1.19) and f[0]['lc'] == 96 and f[0]['origen'] == 'WMS',
   f'ERP: factura {f[0]["numero"] if f else ""} por $ {venta * 1.19:,.0f} (IVA incluido) con CUFE, por transmitir', f and dict(f[0]))
m = libro.mov('143505', '613500', '130505', '413500', '240805')
ok(m == {'143505': -(40 * 54000 + 60 * 9500), '613500': 40 * 54000 + 60 * 9500, '130505': round(venta * 1.19),
         '413500': -venta, '240805': -round(venta * 0.19)},
   'ERP: costo $ 2.730.000 contra inventario; cartera contra ingreso e IVA', m)

paso('6b. Orden sin precio: el despacho sale y queda por facturar')
s, o2 = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': bod['id'], 'detalles': [{'producto_id': grasa['id'], 'cantidad_solicitada': 10}]})
s, t2 = llamar('POST', f'/wms/ordenes-salida/{o2["id"]}/generar-picking')
for d in t2['detalles']:
    llamar('POST', f'/wms/picking-tareas/{t2["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': d['cantidad_solicitada']})
s, dsp2 = llamar('POST', '/wms/despachos/', {'orden_id': o2['id']})
ok(s == 201 and not dsp2.get('factura_id') and 'precio' in (dsp2.get('aviso_factura') or ''),
   f'despacho sin factura; aviso: «{dsp2.get("aviso_factura")}»', dsp2)
ok(libro.mov('143505')['143505'] == -10 * 18000, 'ERP: el costo sí se registra al salir (−$ 180.000)')
s, dsp2 = llamar('POST', f'/wms/despachos/{dsp2["id"]}/facturar', {'precios': {str(grasa['id']): 26000}})
ok(s == 200 and dsp2.get('factura_numero'), f'facturado después con el precio: {dsp2.get("factura_numero")}', dsp2)
ok(libro.mov('413500')['413500'] == -260000, 'ERP: ingreso $ 260.000')

# ════════════════════════════════════════════════════════════════════════════
paso('7. El cliente devuelve 5 aceites: reingreso y nota crédito')
s, dev = llamar('POST', '/wms/devoluciones/', {'numero_devolucion': f'{X}-DEV1', 'tipo': 'CLIENTE', 'orden_referencia_id': o['id'], 'cliente_id': cli['id'],
                                               'almacen_id': bod['id'], 'fecha_recepcion': hoy.isoformat(), 'estado': 'PENDIENTE', 'motivo': 'Referencia equivocada',
                                               'detalles': [{'producto_id': aceite['id'], 'cantidad': 5, 'estado_calidad': 'APROBADO', 'accion': 'REINGRESAR'}]})
libro.marcar()
s, r = llamar('PUT', f'/wms/devoluciones/{dev["id"]}/procesar', {'estado': 'REINGRESADA'})
ok(s == 200 and stock(aceite['id'], U['B-ALMACENAMIENTO']) == 85, 'WMS: reingresan a almacenamiento (85)', r)
nc = sql('SELECT numero, total, length(cude) lc FROM erp_nota_credito_cliente WHERE id=$1', r.get('nota_credito_id') or 0)
ok(nc and float(nc[0]['total']) == round(5 * 70000 * 1.19) and nc[0]['lc'] == 96, f'ERP: nota crédito {nc[0]["numero"] if nc else "—"} por $ {5 * 70000 * 1.19:,.0f} con CUDE', nc and dict(nc[0]))
m = libro.mov('143505', '613500', '130505', '427500')
ok(m == {'143505': 5 * 54000, '613500': -5 * 54000, '130505': -round(5 * 70000 * 1.19), '427500': 5 * 70000},
   'ERP: el costo se revierte y la cartera baja por la nota crédito', m)
saldo = float(sql('SELECT saldo FROM erp_facturas_cliente WHERE id=$1', dsp['factura_id'])[0]['saldo'])
ok(saldo == round(venta * 1.19) - round(5 * 70000 * 1.19), f'ERP: la factura queda debiendo $ {saldo:,.0f}', saldo)

paso('8. Conteo cíclico en la bodega: faltan 3 filtros')
sistema = stock(filtro['id'], U['B-ALMACENAMIENTO'])
s, c = llamar('POST', '/wms/conteos/', {'almacen_id': bod['id'], 'tipo': 'CICLICO', 'fecha_programada': hoy.isoformat(),
                                        'detalles': [{'producto_id': filtro['id'], 'ubicacion_id': U['B-ALMACENAMIENTO'], 'cantidad_sistema': sistema}]})
llamar('PUT', f'/wms/conteos/{c["id"]}/detalles/{c["detalles"][0]["id"]}', {'cantidad_fisica': sistema - 3})
s, r = llamar('PUT', f'/wms/conteos/{c["id"]}/completar')
ok(s == 200 and stock(filtro['id'], U['B-ALMACENAMIENTO']) == sistema - 3, f'WMS: ajuste por conteo, quedan {sistema - 3:g}', r)
m = libro.mov('143505', '531595')
ok(m == {'143505': -28500, '531595': 28500}, 'ERP: merma de $ 28.500', m)

# ════════════════════════════════════════════════════════════════════════════
paso('9. Trazabilidad: el kárdex del aceite de punta a punta')
k = sql("""SELECT m.tipo, m.cantidad, uo.codigo o, ud.codigo d, m.documento_tipo, m.referencia_documento r, m.comprobante_id c
             FROM wms_movimientos_inventario m LEFT JOIN wms_ubicaciones uo ON uo.id=m.ubicacion_origen_id
             LEFT JOIN wms_ubicaciones ud ON ud.id=m.ubicacion_destino_id WHERE m.producto_id=$1 ORDER BY m.id""", aceite['id'])
for mv in k:
    print(f'      {mv["tipo"]:<14} {float(mv["cantidad"]):>6g}  {(mv["o"] or "—"):<18} → {(mv["d"] or "—"):<18} {mv["documento_tipo"] or "":<14} '
          f'{mv["r"] or "":<26} {"asiento " + str(mv["c"]) if mv["c"] else ""}')
neto = sum(float(mv['cantidad']) * ((1 if mv['d'] else 0) - (1 if mv['o'] else 0)) for mv in k)
ok(neto == total(aceite['id']) == 85 + 29, f'el kárdex suma lo que hay: {neto:g} = 85 en bodega + 29 en tienda', (neto, total(aceite['id'])))

paso('10. Cuadre: el inventario del WMS frente a la cuenta de inventario del ERP')
valor_wms = sum(total(p['id']) * costo(p['id']) for p in PRODS)
erp = libro.saldo('143505')
print(f'      WMS (existencias × costo promedio): $ {valor_wms:,.0f}')
print(f'      ERP cuenta 143505 en esta operación: $ {erp:,.0f}')
ok(abs(valor_wms - erp) < 1, f'CUADRAN (diferencia $ {valor_wms - erp:,.0f})', (valor_wms, erp))
ok(libro.saldo('220510') == -50 * 58000, 'ERP: queda por facturar solo la segunda compra ($ 2.900.000)', libro.saldo('220510'))
print('      comprobantes ERP: ' + ' · '.join(libro.conceptos()))

s, t = llamar('GET', '/pos/turnos/actual')
s, r = llamar('POST', f'/pos/turnos/{turno["id"]}/cerrar', {'contado': t['resumen']['esperado']})
ok(s == 200, 'turno de caja cerrado sin diferencia', r)

print(f'\nPREFIJO: {X}')
print('FALLOS:', fallos)
