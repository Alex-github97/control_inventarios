"""Portal del depositante contra la COPIA: lo que ve y, sobre todo, lo que NO puede ver.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_portal.py
"""
import base64, json, os, time, urllib.request, urllib.error
from datetime import timedelta
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
ADMIN = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
X = f'PP{int(time.time()) % 100000}'
fallos = 0


def llamar(m, ruta, cuerpo=None, token=ADMIN, cliente=None):
    h = {'Content-Type': 'application/json'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    if cliente:
        h['X-Cliente'] = cliente
    req = urllib.request.Request(B + ruta, method=m, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, headers=h)
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


def claims(token):
    return json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '=='))


# Dos depositantes, cada uno con su mercancía.
s, d1 = llamar('POST', '/wms/depositantes', {'codigo': f'{X}-1', 'nombre': f'{X} Cliente Uno'})
s, d2 = llamar('POST', '/wms/depositantes', {'codigo': f'{X}-2', 'nombre': f'{X} Cliente Dos'})
s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-PORTAL {X}'})
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': f'{X}-ALM', 'nombre': 'Almacenamiento', 'tipo': 'ALMACENAMIENTO'})
s, u1 = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-1'})
s, u2 = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-2'})
s, p1 = llamar('POST', '/wms/productos/', {'sku': f'{X}-UNO', 'nombre': f'{X} Del cliente uno', 'depositante_id': d1['id']})
s, p2 = llamar('POST', '/wms/productos/', {'sku': f'{X}-DOS', 'nombre': f'{X} Del cliente dos', 'depositante_id': d2['id']})
s, rec = llamar('POST', '/wms/recepciones/', {'almacen_id': alm['id'], 'tipo': 'CIEGA', 'detalles': [{'producto_id': p1['id'], 'cantidad_recibida': 10, 'ubicacion_id': u1['id']}]})
llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
llamar('POST', '/wms/inventario/ajuste/', {'producto_id': p2['id'], 'ubicacion_id': u2['id'], 'cantidad_nueva': 7, 'motivo': 'Inicial'})
llamar('POST', '/wms/inventario/transferencia/', {'producto_id': p1['id'], 'ubicacion_origen_id': u1['id'], 'ubicacion_destino_id': u2['id'], 'cantidad': 2})
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C', 'nombre': f'{X} Destinatario'})
s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': alm['id'], 'detalles': [{'producto_id': p1['id'], 'cantidad_solicitada': 3}]})
s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
for d in t['detalles']:
    llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': d['cantidad_solicitada']})
llamar('POST', '/wms/despachos/', {'orden_id': o['id']})

# El usuario del cliente.
clave = 'PortalCliente2026!'
s, usr = llamar('POST', '/usuarios/', {'nombre': 'Ana', 'apellido': 'Cliente', 'email': f'{X.lower()}@icoltrans.com.co',
                                       'username': f'{X.lower()}', 'rol': 'CONSULTA', 'password': clave})
ok(s == 201, 'usuario del cliente creado', usr)
s, ses = llamar('POST', '/auth/login', {'username': X.lower(), 'password': clave}, token=None, cliente='demo')
viejo = ses['access_token']
ok(s == 200 and ses.get('portal') is None and 'dep' not in claims(viejo), 'antes de vincularlo, entra como usuario normal', ses.get('portal'))
s, e = llamar('GET', '/wms/portal/resumen', token=viejo)
ok(s == 403, 'sin vínculo, el portal no le abre', e)

s, e = llamar('POST', f'/wms/depositantes/{d1["id"]}/usuarios', {'usuario_id': 1})
ok(s == 422, 'un administrador no se puede volver usuario del portal', e)
s, r = llamar('POST', f'/wms/depositantes/{d1["id"]}/usuarios', {'usuario_id': usr['id']})
ok(s == 201, 'usuario vinculado al cliente uno', r)
s, e = llamar('POST', f'/wms/depositantes/{d2["id"]}/usuarios', {'usuario_id': usr['id']})
ok(s == 409, 'no puede ser del portal de dos clientes', e)
s, e = llamar('GET', '/wms/almacenes/', token=viejo)
ok(s == 401, 'su sesión vieja (sin el depositante en el token) deja de servir', e)

s, ses = llamar('POST', '/auth/login', {'username': X.lower(), 'password': clave}, token=None, cliente='demo')
tok = ses['access_token']
ok(s == 200 and ses['portal']['depositante_id'] == d1['id'] and claims(tok)['dep'] == d1['id'], 'al entrar, el token lleva su depositante firmado', ses.get('portal'))
for ruta in ('/wms/inventario/', '/wms/productos/', f'/wms/kardex?depositante_id={d2["id"]}', '/wms/depositantes', '/erp/cxc/aging', '/usuarios/', '/alertas'):
    s, e = llamar('GET', ruta, token=tok)
    ok(s == 403, f'portal: {ruta} → 403', (s, e))
s, me = llamar('GET', '/auth/me', token=tok)
ok(s == 200 and me['username'] == X.lower(), 'portal: puede consultar su propia sesión', me)

s, r = llamar('GET', '/wms/portal/resumen', token=tok)
ok(s == 200 and r['depositante']['id'] == d1['id'] and r['unidades'] == 7 and r['referencias'] == 1, 'resumen: solo su mercancía (10 recibidas − 3 despachadas)', r)
s, inv = llamar('GET', '/wms/portal/inventario', token=tok)
ok([x['sku'] for x in inv] == [f'{X}-UNO'] and inv[0]['total'] == 7 and 'ubicacion' not in json.dumps(inv), 'inventario: solo lo suyo y sin las ubicaciones internas', inv)
s, mv = llamar('GET', '/wms/portal/movimientos', token=tok)
tipos = {m['tipo'] for m in mv}
ok(tipos == {'Despacho', 'Recepción'} and all(m['sku'] == f'{X}-UNO' for m in mv)
   and sum(m['entrada'] for m in mv) == 10 and sum(m['salida'] for m in mv) == 3,
   'movimientos: entró 10 y salió 3 (de dos ubicaciones), sin traslados internos ni nada ajeno', mv)
s, ords = llamar('GET', '/wms/portal/ordenes', token=tok)
ok(len(ords) == 1 and ords[0]['despachado'] == 3 and ords[0]['despachos'], 'órdenes con su despacho', ords)
s, recs = llamar('GET', '/wms/portal/recepciones', token=tok)
ok(len(recs) == 1 and recs[0]['unidades'] == 10, 'recepciones', recs)
s, fac = llamar('GET', '/wms/portal/facturacion', token=tok)
ok(s == 200 and fac == [], 'facturación: sus facturas (aún ninguna)', fac)
s, e = llamar('GET', '/wms/portal/resumen')
ok(s == 403, 'el personal interno no entra al portal (es para clientes)', e)
s, us = llamar('GET', f'/wms/depositantes/{d1["id"]}/usuarios')
ok(s == 200 and us and us[0]['username'] == X.lower(), 'el depositante lista sus usuarios del portal', us)
s, r = llamar('DELETE', f'/wms/depositantes/{d1["id"]}/usuarios/{usr["id"]}')
s, e = llamar('GET', '/wms/portal/resumen', token=tok)
ok(s == 401, 'al desvincularlo, su sesión del portal deja de servir', e)
print('\nFALLOS:', fallos)
