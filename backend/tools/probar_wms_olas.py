"""WMS Fase 4b (olas de alistamiento) contra la COPIA, con resultado calculado a mano.

Recorrido: P1-01…P1-05 (puestos 1-5), P2-05…P2-01 (puestos 6-10).
  X en P1-02 (puesto 2), Z en P1-04 (puesto 4), Y en P2-04 (puesto 7).
  O1: X 2 + Y 1   O2: X 3 + Z 1   O3 (URGENTE): Y 2
Ola: paradas P1-02 (X 5), P1-04 (Z 1), P2-04 (Y 3) → 3 visitas, recorrido 7.
Orden por orden: O1 hasta 7, O2 hasta 4, O3 hasta 7 → 18 y 5 visitas. Ahorro 61,1 %.
En P2-04 se alistan solo 2: la urgente (O3) recibe sus 2 y a O1 le falta 1.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_olas.py
"""
import json, os, time, urllib.request, urllib.error
from datetime import timedelta
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
X = f'PO{int(time.time()) % 100000}'
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
    print(('ok  ' if c else 'X   ') + t + ('' if c else f'  -> {str(extra)[:600]}'))


s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-OLA {X}'})
A = alm['id']
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': A, 'codigo': f'{X}-ALM', 'nombre': 'Almacenamiento', 'tipo': 'ALMACENAMIENTO'})
U = {}
for pasillo in (1, 2):
    for pos in range(1, 6):
        s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-P{pasillo}-0{pos}', 'pasillo': str(pasillo),
                                                     'posicion': f'0{pos}', 'nivel': '1'})
        U[f'P{pasillo}-0{pos}'] = u['id']
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C', 'nombre': f'{X} Cliente'})
P = {}
for nombre, donde in (('X', 'P1-02'), ('Y', 'P2-04'), ('Z', 'P1-04')):
    s, p = llamar('POST', '/wms/productos/', {'sku': f'{X}-{nombre}', 'nombre': f'{X} {nombre}'})
    P[nombre] = p
    llamar('POST', '/wms/inventario/ajuste/', {'producto_id': p['id'], 'ubicacion_id': U[donde], 'cantidad_nueva': 20, 'motivo': 'Inicial'})


def orden(lineas, prioridad='NORMAL'):
    s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': A, 'prioridad': prioridad,
                                                   'detalles': [{'producto_id': P[k]['id'], 'cantidad_solicitada': q} for k, q in lineas]})
    return o
O1 = orden([('X', 2), ('Y', 1)])
O2 = orden([('X', 3), ('Z', 1)])
O3 = orden([('Y', 2)], 'URGENTE')

s, e = llamar('POST', '/wms/olas', {'almacen_id': A, 'prioridades': ['BAJA']})
ok(s == 422, 'sin órdenes que cumplan el criterio no se crea la ola', e)
s, ola = llamar('POST', '/wms/olas', {'almacen_id': A})
ok(s == 201 and len(ola['ordenes']) == 3 and ola['ordenes'][0]['numero'] == O3['numero_orden'],
   'ola con las 3 órdenes, la urgente primero', ola if s != 201 else ola['ordenes'])
paradas = [(p['ubicacion'].replace(f'{X}-', ''), p['sku'].replace(f'{X}-', ''), p['cantidad']) for p in ola.get('paradas', [])]
ok(paradas == [('P1-02', 'X', 5), ('P1-04', 'Z', 1), ('P2-04', 'Y', 3)], 'ruta en serpentina con cantidades consolidadas', paradas)
ok((ola['visitas_ola'], ola['visitas_orden_por_orden'], ola['recorrido_ola'], ola['recorrido_orden_por_orden'], ola['ahorro_recorrido_pct'])
   == (3, 5, 7, 18, 61.1), '3 visitas en vez de 5; recorrido 7 en vez de 18 (61,1 % menos)', ola)
y = next(p for p in ola['paradas'] if p['sku'].endswith('-Y'))
ok([r['orden'] for r in y['reparto']] == [O3['numero_orden'], O1['numero_orden']], 'en la parada de Y, la urgente va primero', y['reparto'])
s, o1 = llamar('GET', f'/wms/ordenes-salida/?almacen_id={A}&estado=EN_PICKING')
ok(s == 200 and len(o1) == 3, 'las órdenes pasaron a alistamiento', o1)

def parada(p, cantidad, ubic=None):
    return llamar('POST', f'/wms/olas/{ola["id"]}/parada', {'ubicacion_id': p['ubicacion_id'], 'producto_id': p['producto_id'],
                  'lote_id': p['lote_id'], 'contenedor_id': p['contenedor_id'], 'cantidad': cantidad,
                  'ubicacion_codigo': ubic or p['ubicacion'], 'producto_codigo': p['sku']})
s, e = parada(y, 2, ubic=f'{X}-P1-01')
ok(s == 422, 'escanear otra ubicación en la parada se rechaza', e)
s, e = parada(y, 4)
ok(s == 422, 'no se alista más de lo que pide la parada', e)
s, r = parada(y, 2)
ok(s == 200 and r['estado'] == 'EN_CURSO', 'parada de Y con faltante: 2 de 3', r if s != 200 else r['estado'])
y2 = next(p for p in r['paradas'] if p['sku'].endswith('-Y'))
alist = {x['orden']: x['alistado'] for x in y2['reparto']}
ok(alist == {O3['numero_orden']: 2, O1['numero_orden']: 0}, 'la urgente recibe sus 2; a O1 le falta su unidad', alist)
s, e = parada(y, 1)
ok(s == 409, 'una parada confirmada no se repite', e)
for p in r['paradas']:
    if not p['hecha']:
        s, r = parada(p, p['cantidad'])
ok(r['estado'] == 'COMPLETADA' and r['completada_en'], 'ola completada al confirmar todas las paradas', r['estado'])
s, inv = llamar('GET', f'/wms/inventario/?producto_id={P["Y"]["id"]}')
res = sum(i['cantidad_reservada'] for i in inv)
disp = sum(i['cantidad_disponible'] for i in inv)
ok(res == 2 and disp == 18, 'Y: reservado 2 (para O3), lo de O1 volvió a disponible (18)', (res, disp))
s, d = llamar('POST', '/wms/despachos/', {'orden_id': O3['id']})
ok(s == 201 and sum(x['cantidad'] for x in d['detalles']) == 2, 'la orden urgente se despacha con lo alistado en la ola', d)
s, lista = llamar('GET', f'/wms/olas?almacen_id={A}')
ok(lista and lista[0]['codigo'].startswith('OLA-') and lista[0]['estado'] == 'COMPLETADA', 'listado de olas', lista)
print('\nFALLOS:', fallos)
