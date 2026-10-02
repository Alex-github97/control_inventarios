"""Facturación 3PL contra la COPIA, con una historia de 8 días fechada a mano.

Día −10: llegan 2 unidades de 1 m³ a L1.     → 2 m³, 1 posición
Día −7:  una pasa a L2.                       → 2 m³, 2 posiciones
Día −5:  se despacha una (orden de 1 unidad). → 1 m³, 1 posición
Periodo −10…−3 (8 días): 13 m³-día y 10 posiciones-día.
Tarifas: m³-día 1.000 (general), posición-día 500 (del depositante), unidad
recibida 200, orden despachada 3.000, mínimo 90.000 al mes.
Cobro: 13.000 + 5.000 + 400 + 3.000 = 21.400 < mínimo de 8 días (24.000):
ajuste 2.600 → subtotal 24.000, IVA 4.560, total 28.560.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_3pl.py
"""
import asyncio, json, os, time, urllib.request, urllib.error
from datetime import date, datetime, timedelta, timezone
import asyncpg
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', '/ci_pruebas_form')
X = f'P3{int(time.time()) % 100000}'
fallos = 0
hoy = (datetime.now(timezone.utc) - timedelta(hours=5)).date()


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
    print(('ok  ' if c else 'X   ') + t + ('' if c else f'  -> {str(extra)[:700]}'))


def sql(q, *a):
    async def f():
        c = await asyncpg.connect(URL_DB)
        try: return await c.fetch(q, *a)
        finally: await c.close()
    return asyncio.run(f())


def mediodia(dias_atras):   # mediodía de Bogotá = 17:00 UTC
    d = hoy - timedelta(days=dias_atras)
    return datetime(d.year, d.month, d.day, 17, 0, tzinfo=timezone.utc)


def cerca(a, b, tol=0.01):
    return a is not None and abs(a - b) <= tol


s, dep = llamar('POST', '/wms/depositantes', {'codigo': X, 'nombre': f'{X} Cliente 3PL SAS', 'nit': f'90{int(time.time()) % 10000000}'})
s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-3PL {X}'})
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': f'{X}-ALM', 'nombre': 'Almacenamiento', 'tipo': 'ALMACENAMIENTO'})
s, l1 = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-L1', 'pasillo': '1', 'posicion': '1'})
s, l2 = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-L2', 'pasillo': '1', 'posicion': '2'})
s, p = llamar('POST', '/wms/productos/', {'sku': f'{X}-P', 'nombre': f'{X} Caja de 1 m³', 'depositante_id': dep['id']})
llamar('PUT', f'/wms/productos/{p["id"]}/empaques', [{'nivel': 'UNIDAD', 'unidades': 1, 'largo_cm': 100, 'ancho_cm': 100, 'alto_cm': 100}])
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C', 'nombre': f'{X} Destinatario'})

# Día −10: recepción de 2 a L1.
s, rec = llamar('POST', '/wms/recepciones/', {'almacen_id': alm['id'], 'tipo': 'CIEGA', 'detalles': [
    {'producto_id': p['id'], 'cantidad_recibida': 2, 'ubicacion_id': l1['id']}]})
llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
sql("UPDATE wms_movimientos_inventario SET created_at = $1 WHERE producto_id = $2", mediodia(10), p['id'])
# Día −7: traslado de 1 a L2.
llamar('POST', '/wms/inventario/transferencia/', {'producto_id': p['id'], 'ubicacion_origen_id': l1['id'], 'ubicacion_destino_id': l2['id'], 'cantidad': 1})
sql("UPDATE wms_movimientos_inventario SET created_at = $1 WHERE producto_id = $2 AND tipo = 'TRANSFERENCIA'", mediodia(7), p['id'])
# Día −5: orden de 1, alistada y despachada.
s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': alm['id'], 'detalles': [{'producto_id': p['id'], 'cantidad_solicitada': 1}]})
s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': t['detalles'][0]['id'], 'cantidad_pickeada': 1})
s, d = llamar('POST', '/wms/despachos/', {'orden_id': o['id']})
ok(s == 201, 'historia armada: recepción, traslado y despacho', d)
sql("UPDATE wms_movimientos_inventario SET created_at = $1 WHERE producto_id = $2 AND tipo IN ('RESERVA','LIBERACION','DESPACHO')", mediodia(5), p['id'])
sql("UPDATE wms_picking_detalles SET timestamp_confirmacion = $1 WHERE tarea_id = $2", mediodia(5), t['id'])
sql("UPDATE wms_despachos SET created_at = $1 WHERE id = $2", mediodia(5), d['id'])

# Tarifas: generales y una propia del depositante.
s, r = llamar('PUT', '/wms/3pl/tarifas', [{'concepto': 'ALM_M3_DIA', 'valor': 1000}, {'concepto': 'REC_UNIDAD', 'valor': 200},
                                          {'concepto': 'DESP_ORDEN', 'valor': 3000}, {'concepto': 'MINIMO_MES', 'valor': 90000},
                                          {'concepto': 'ALM_POSICION_DIA', 'valor': 9999}])
s, r = llamar('PUT', f'/wms/3pl/tarifas?depositante_id={dep["id"]}', [{'concepto': 'ALM_POSICION_DIA', 'valor': 500}])
pos = next(x for x in r if x['concepto'] == 'ALM_POSICION_DIA')
m3 = next(x for x in r if x['concepto'] == 'ALM_M3_DIA')
ok(pos['aplica'] == 500 and pos['origen'] == 'propia' and m3['aplica'] == 1000 and m3['origen'] == 'general',
   'tarifa propia del depositante gana sobre la general', r)

periodo = {'depositante_id': dep['id'], 'desde': (hoy - timedelta(days=10)).isoformat(), 'hasta': (hoy - timedelta(days=3)).isoformat()}
s, e = llamar('POST', '/wms/3pl/liquidaciones/previa', {**periodo, 'hasta': hoy.isoformat()})
ok(s == 422, 'no se liquida el día en curso', e)
s, pv = llamar('POST', '/wms/3pl/liquidaciones/previa', periodo)
dias = [(x['m3'], x['posiciones']) for x in pv['diario']]
ok(dias == [(2, 1), (2, 1), (2, 1), (2, 2), (2, 2), (1, 1), (1, 1), (1, 1)], 'ocupación día a día reconstruida con el kárdex', dias)
lin = {x['concepto']: x for x in pv['lineas']}
ok(cerca(lin['ALM_M3_DIA']['cantidad'], 13) and cerca(lin['ALM_M3_DIA']['subtotal'], 13000), '13 m³-día × 1.000', lin.get('ALM_M3_DIA'))
ok(lin['ALM_POSICION_DIA']['cantidad'] == 10 and lin['ALM_POSICION_DIA']['subtotal'] == 5000 and lin['ALM_POSICION_DIA']['propia'],
   '10 posiciones-día × 500 (tarifa propia)', lin.get('ALM_POSICION_DIA'))
ok(lin['REC_UNIDAD']['subtotal'] == 400 and lin['DESP_ORDEN']['subtotal'] == 3000, 'recepción 2 × 200 y una orden despachada × 3.000', lin)
ok(cerca(lin['MINIMO_MES']['subtotal'], 2600), 'ajuste al mínimo de 8 días (24.000 − 21.400 = 2.600)', lin.get('MINIMO_MES'))
ok((pv['subtotal'], pv['iva'], pv['total']) == (24000, 4560, 28560), 'subtotal 24.000, IVA 4.560, total 28.560', (pv['subtotal'], pv['iva'], pv['total']))
ok(any('sin tarifa' in a for a in pv['avisos']), 'avisa la actividad sin tarifa (líneas y unidades despachadas)', pv['avisos'])

s, liq = llamar('POST', '/wms/3pl/liquidaciones', periodo)
ok(s == 201 and liq['estado'] == 'BORRADOR' and liq['total'] == 28560, 'liquidación guardada en borrador', liq)
s, e = llamar('POST', '/wms/3pl/liquidaciones', {**periodo, 'desde': (hoy - timedelta(days=4)).isoformat(), 'hasta': (hoy - timedelta(days=1)).isoformat()})
ok(s == 409, 'no se liquidan dos veces los mismos días', e)
llamar('POST', '/erp/resoluciones', {'tipo_documento': 'FACTURA_VENTA', 'numero_resolucion': f'1876{X}', 'fecha_resolucion': hoy.isoformat(),
                                     'prefijo': X[-4:].replace('3', 'F'), 'desde': 1, 'hasta': 1000,
                                     'vigencia_desde': (hoy - timedelta(days=1)).isoformat(), 'vigencia_hasta': (hoy + timedelta(days=300)).isoformat(),
                                     'clave_tecnica': 'clave-prueba'})
s, f = llamar('POST', f'/wms/3pl/liquidaciones/{liq["id"]}/facturar')
ok(s == 200 and f['estado'] == 'FACTURADA' and f['factura'] and len(f['cufe'] or '') == 96, 'facturada en el ERP con número y CUFE', f)
fac = sql("SELECT total, saldo, estado, origen FROM erp_facturas_cliente WHERE id = $1", f.get('factura_id') or 0)
ok(fac and float(fac[0]['total']) == 28560 and float(fac[0]['saldo']) == 28560 and fac[0]['origen'] == 'WMS_3PL',
   'la factura queda por cobrar (cartera) por 28.560', fac)
asi = sql("SELECT sum(l.debito) d, sum(l.credito) c FROM erp_comprobante_lineas l JOIN erp_comprobantes c ON c.id = l.comprobante_id "
          "WHERE c.referencia = $1", f.get('factura') or '')
ok(asi and float(asi[0]['d']) == 28560 and asi[0]['d'] == asi[0]['c'], 'asiento cuadrado por 28.560', asi)
s, e = llamar('POST', f'/wms/3pl/liquidaciones/{liq["id"]}/anular')
ok(s == 409, 'una liquidación facturada no se anula (va por nota crédito)', e)
s, e = llamar('POST', f'/wms/3pl/liquidaciones/{liq["id"]}/facturar')
ok(s == 409, 'no se factura dos veces', e)
print('\nFALLOS:', fallos)
