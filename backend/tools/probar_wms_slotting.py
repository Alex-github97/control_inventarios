"""WMS Fase 4a (slotting) contra la COPIA, con un escenario de resultado conocido.

Dos pasillos de 5 posiciones, nivel 1. Recorrido en serpentina: P1-01…P1-05 y
luego P2-05…P2-01. Preferentes: el primer 30 % (P1-01, P1-02, P1-03).
  RAPIDO: 10 líneas alistadas, guardado en P2-05 (puesto 6)  → clase A, lejos
  LENTO:  1 línea, en P2-04                                    → clase B
  QUIETO: sin alistamientos, ocupa P1-01 (preferente)           → clase C
Se espera: acercar RAPIDO a P1-02 y alejar QUIETO al fondo (P2-01).

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_slotting.py
"""
import json, os, time, urllib.request, urllib.error
from datetime import timedelta
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
X = f'PS{int(time.time()) % 100000}'
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
    print(('ok  ' if c else 'X   ') + t + ('' if c else f'  -> {str(extra)[:500]}'))


s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-SLOT {X}', 'flujo_recepcion': 'DIRIGIDO'})
A = alm['id']
s, zr = llamar('POST', '/wms/zonas/', {'almacen_id': A, 'codigo': f'{X}-REC', 'nombre': 'Recepción', 'tipo': 'RECEPCION'})
s, rec_u = llamar('POST', '/wms/ubicaciones/', {'zona_id': zr['id'], 'codigo': f'{X}-REC'})
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': A, 'codigo': f'{X}-ALM', 'nombre': 'Almacenamiento', 'tipo': 'ALMACENAMIENTO'})
U = {}
for pasillo in (2, 1):            # se crean en desorden a propósito
    for pos in (5, 3, 1, 4, 2):
        cod = f'{X}-P{pasillo}-0{pos}'
        s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': cod, 'pasillo': str(pasillo),
                                                     'posicion': f'0{pos}', 'nivel': '1'})
        U[f'P{pasillo}-0{pos}'] = u['id']
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C', 'nombre': f'{X} Cliente'})
P = {}
for nombre, donde, cant in (('RAPIDO', 'P2-05', 50), ('LENTO', 'P2-04', 20), ('QUIETO', 'P1-01', 30)):
    s, p = llamar('POST', '/wms/productos/', {'sku': f'{X}-{nombre}', 'nombre': f'{X} {nombre}'})
    P[nombre] = p
    llamar('POST', '/wms/inventario/ajuste/', {'producto_id': p['id'], 'ubicacion_id': U[donde], 'cantidad_nueva': cant, 'motivo': 'Inicial'})

s, ruta = llamar('GET', f'/wms/slotting/ubicaciones?almacen_id={A}')
codigos = [u['codigo'].replace(f'{X}-', '') for u in ruta]
ok(codigos == ['P1-01', 'P1-02', 'P1-03', 'P1-04', 'P1-05', 'P2-05', 'P2-04', 'P2-03', 'P2-02', 'P2-01'],
   'recorrido en serpentina: pasillo 1 hacia el fondo, pasillo 2 de regreso', codigos)
ok([u['preferente'] for u in ruta][:4] == [True, True, True, False], 'preferentes: el primer 30 % en nivel 1', [u['preferente'] for u in ruta])

def alistar(producto, n):
    for _ in range(n):
        s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': A,
                                                       'detalles': [{'producto_id': producto['id'], 'cantidad_solicitada': 1}]})
        s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
        d = t['detalles'][0]
        llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': 1})
alistar(P['RAPIDO'], 10)
alistar(P['LENTO'], 1)

s, abc = llamar('GET', f'/wms/slotting/abc?almacen_id={A}')
clase = {x['sku'].replace(f'{X}-', ''): x['clase'] for x in abc}
ok(clase == {'RAPIDO': 'A', 'LENTO': 'B', 'QUIETO': 'C'}, 'ABC: 10 líneas → A, 1 → B, ninguna → C', abc)
ok(next(x for x in abc if x['sku'].endswith('RAPIDO'))['en_preferente'] is False, 'la A está fuera de las preferentes')

s, sug = llamar('GET', f'/wms/slotting/sugerencias?almacen_id={A}')
acercar = [x for x in sug if x['tipo'] == 'ACERCAR']
alejar = [x for x in sug if x['tipo'] == 'ALEJAR']
ok(len(acercar) == 1 and acercar[0]['sku'].endswith('RAPIDO') and acercar[0]['destino'] == f'{X}-P1-02',
   'sugerencia: acercar la A a la mejor preferente libre (P1-02)', sug)
ok(len(alejar) == 1 and alejar[0]['sku'].endswith('QUIETO') and alejar[0]['destino'] == f'{X}-P2-01',
   'sugerencia: llevar la C de la preferente al fondo (P2-01)', sug)
ok(all(x['razon'] for x in sug), 'cada sugerencia dice por qué')

s, r = llamar('POST', '/wms/slotting/aplicar', {'almacen_id': A, 'movimientos': [
    {k: x[k] for k in ('producto_id', 'lote_id', 'cantidad', 'origen_id', 'destino_id', 'razon')} for x in sug]})
ok(s == 201 and len(r['tareas']) == 2, 'sugerencias convertidas en 2 tareas de movimiento', r)
s, r2 = llamar('POST', '/wms/slotting/aplicar', {'almacen_id': A, 'movimientos': [
    {k: acercar[0][k] for k in ('producto_id', 'lote_id', 'cantidad', 'origen_id', 'destino_id', 'razon')}]})
ok(s == 201 and not r2['tareas'] and r2['omitidas'] == 1, 'no duplica una tarea abierta para el mismo movimiento', r2)
s, ts = llamar('GET', f'/wms/tareas?almacen_id={A}&estado=PENDIENTE&tipo=MOVIMIENTO')
t = next(x for x in ts if x['sku'].endswith('RAPIDO'))
s, hecho = llamar('POST', f'/wms/tareas/{t["id"]}/completar', {'ubicacion_codigo': t['sugerida']})
ok(s == 200 and hecho['estado'] == 'COMPLETADA', 'tarea de movimiento completada escaneando el destino', hecho)
s, abc = llamar('GET', f'/wms/slotting/abc?almacen_id={A}')
ok(next(x for x in abc if x['sku'].endswith('RAPIDO'))['en_preferente'], 'la A quedó en una preferente', abc)
s, sug = llamar('GET', f'/wms/slotting/sugerencias?almacen_id={A}')
ok(not [x for x in sug if x['tipo'] == 'ACERCAR'], 'ya no sugiere acercarla', sug)

# Lo que llega: una referencia nueva (C) se sugiere al fondo, sin gastar preferentes.
s, nuevo = llamar('POST', '/wms/productos/', {'sku': f'{X}-NUEVO', 'nombre': f'{X} Nuevo'})
s, rec = llamar('POST', '/wms/recepciones/', {'almacen_id': A, 'tipo': 'CIEGA', 'detalles': [{'producto_id': nuevo['id'], 'cantidad_recibida': 5}]})
llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
s, ts = llamar('GET', f'/wms/tareas?almacen_id={A}&estado=PENDIENTE&tipo=UBICACION')
tn = next(x for x in ts if x['sku'] == f'{X}-NUEVO')
ok(tn['sugerida'] and tn['sugerida'] not in (f'{X}-P1-01', f'{X}-P1-02', f'{X}-P1-03') and 'Clase C' in tn['razon_sugerencia'],
   'al recibir, una referencia sin movimiento se sugiere fuera de las preferentes', tn)
print('\nFALLOS:', fallos)
