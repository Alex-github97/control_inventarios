"""WMS Fase 2 (cubicaje) contra la COPIA de la base. Simula el ESP32 con su token.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_cubicaje.py
"""
import json, os, time, urllib.request, urllib.error
from datetime import timedelta
from app.core.security import create_access_token, create_refresh_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
fallos = 0
X = f'PC{int(time.time()) % 100000}'   # único por corrida: se puede repetir sin restaurar la copia


def llamar(m, ruta, cuerpo=None, token=None):
    req = urllib.request.Request(B + ruta, method=m, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 headers={'Authorization': 'Bearer ' + (token or T), 'Content-Type': 'application/json'})
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


def cerca(a, b, tol=0.05):
    return a is not None and abs(a - b) <= tol


# ── Cubicador y su token ─────────────────────────────────────────────────────
s, c = llamar('POST', '/wms/cubicadores', {'codigo': X, 'nombre': 'PRUEBA Estación muelle 1'})
ok(s == 201 and not c['tiene_token'], 'cubicador creado', c)
s, t = llamar('POST', f'/wms/cubicadores/{c["id"]}/token')
DEV = t['token']
ok(s == 200 and DEV, 'token del dispositivo emitido (se muestra una vez)', t)
s, e = llamar('GET', '/wms/cubicador/estado', token=DEV)
ok(s == 200 and e['calibrado'] == {'x': False, 'y': False, 'z': False, 'peso': False}, 'el dispositivo se identifica; sin calibrar', e)
s, _ = llamar('GET', '/wms/almacenes/', token=DEV)
ok(s == 401, 'el token del cubicador no sirve como sesión de usuario')
s, _ = llamar('GET', '/wms/cubicador/estado')
ok(s == 401, 'un token de usuario no sirve como cubicador')
s, _ = llamar('GET', '/wms/almacenes/', token=create_refresh_token(1, cliente='public', esquema='public'))
ok(s == 401, 'el token de refresco no abre la API')


def medir(x, y, z, peso=None, token=DEV):
    lect = {'x': x if isinstance(x, list) else [x] * 5, 'y': y if isinstance(y, list) else [y] * 5,
            'z': z if isinstance(z, list) else [z] * 5}
    if peso is not None:
        lect['peso'] = [peso] * 5
    return llamar('POST', '/wms/cubicador/lecturas', {'lecturas': lect, 'firmware': '1.0.0'}, token=token)


# ── Calibración: base 800/600/700 mm, escala 1; báscula tara 1000, 0,5 g/cuenta ──
s, m = medir(700, 400, 400, 5000)   # bloque A: 100 × 200 × 300 mm, 2.000 g
ok(s == 201 and m['largo_cm'] is None and any('no está calibrado' in a for a in m['avisos']), 'sin calibrar no inventa medidas', m)
s, r = llamar('POST', f'/wms/mediciones/{m["id"]}/calibrar', {'largo_mm': 100, 'ancho_mm': 200, 'alto_mm': 300, 'peso_g': 2000})
ok(s == 200 and cerca(r['base_x_mm'], 800, 0.01) and cerca(r['base_z_mm'], 700, 0.01), 'un bloque fija la base de cada eje', r)
s, m0 = medir(800, 600, 700, 1000)  # báscula vacía
s, r = llamar('POST', f'/wms/mediciones/{m0["id"]}/calibrar', {'peso_g': 0})
ok(s == 200 and r['calibrado']['peso'] and cerca(r['tara_crudo'], 1000, 0.01) and cerca(r['escala_peso'], 0.5, 1e-6), 'báscula: tara y escala', r)
s, m = medir(500, 200, 200)        # bloque B: 300 × 400 × 500 mm
s, r = llamar('POST', f'/wms/mediciones/{m["id"]}/calibrar', {'largo_mm': 300, 'ancho_mm': 400, 'alto_mm': 500})
ok(s == 200 and cerca(r['escala_x'], 1.0, 1e-6) and r['muestras']['x'] == 2, 'dos bloques: base y escala por mínimos cuadrados', r)
s, e = llamar('POST', f'/wms/mediciones/{m["id"]}/calibrar', {'largo_mm': 300})
ok(s == 409, 'una medición ya usada no se vuelve a usar', e)

# ── Medir un producto ────────────────────────────────────────────────────────
s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': 'PRUEBA-CUB Bodega'})
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': f'{X}-ALM', 'nombre': 'PRUEBA-CUB ALM', 'tipo': 'ALMACENAMIENTO'})
s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-01', 'largo_cm': 120, 'ancho_cm': 100, 'alto_cm': 150})
ok(s == 201 and cerca(u['capacidad_m3'], 1.8, 1e-6), 'ubicación: la capacidad sale de sus medidas (1,8 m³)', u)
s, prod = llamar('POST', '/wms/productos/', {'sku': f'{X}-A', 'nombre': 'PRUEBA-CUB Kit de frenos'})

s, m = medir([600, 600, 601, 599, 600], 350, 550, 3000)
ok(s == 201 and (m['largo_cm'], m['ancho_cm'], m['alto_cm'], m['peso_kg']) == (20.0, 25.0, 15.0, 1.0) and m['estable'],
   'medición: 20 × 25 × 15 cm, 1 kg, estable (mediana)', m)
s, mi = medir([600, 615, 585, 600, 600], 350, 550)
ok(s == 201 and not mi['estable'], 'lecturas que se mueven: inestable', mi)
s, e = llamar('POST', f'/wms/mediciones/{mi["id"]}/asignar', {'producto_id': prod['id'], 'nivel': 'UNIDAD'})
ok(s == 422, 'una medición inestable no se asigna sin confirmarla', e)
s, lista = llamar('GET', f'/wms/cubicadores/{c["id"]}/mediciones?estado=PENDIENTE')
ok(s == 200 and {m['id'], mi['id']} <= {x['id'] for x in lista}, 'la estación ve las mediciones pendientes', lista)
s, emp = llamar('POST', f'/wms/mediciones/{m["id"]}/asignar', {'producto_id': prod['id'], 'nivel': 'UNIDAD', 'codigo_barras': '7701234000017'})
ok(s == 200 and emp['fuente'] == 'CUBICADOR' and cerca(emp['volumen_m3'], 0.0075, 1e-9), 'asignada al producto como su unidad', emp)
s, p2 = llamar('GET', '/wms/productos/')
pp = next(x for x in p2 if x['id'] == prod['id'])
ok(cerca(pp['volumen_m3'], 0.0075, 1e-9) and pp['peso_kg'] == 1.0, 'el producto toma el volumen y el peso medidos', pp)
s, e = llamar('POST', f'/wms/mediciones/{m["id"]}/asignar', {'producto_id': prod['id'], 'nivel': 'UNIDAD'})
ok(s == 409, 'una medición se asigna una sola vez', e)
s, r = llamar('POST', f'/wms/mediciones/{mi["id"]}/descartar')
ok(s == 200 and r['estado'] == 'DESCARTADA', 'medición descartada', r)

# ── Empaques y estiba ────────────────────────────────────────────────────────
unidad = {'nivel': 'UNIDAD', 'unidades': 1, 'largo_cm': 20, 'ancho_cm': 25, 'alto_cm': 15, 'peso_kg': 1.0}
s, e = llamar('PUT', f'/wms/productos/{prod["id"]}/empaques', [unidad, {'nivel': 'CAJA', 'unidades': 12, 'largo_cm': 40, 'ancho_cm': 30, 'alto_cm': 25, 'peso_kg': 12.6},
                                                                {'nivel': 'MASTER', 'unidades': 6}])
ok(s == 422, 'la caja máster no puede llevar menos unidades que la caja', e)
s, emps = llamar('PUT', f'/wms/productos/{prod["id"]}/empaques', [unidad, {'nivel': 'CAJA', 'unidades': 12, 'largo_cm': 40, 'ancho_cm': 30, 'alto_cm': 25, 'peso_kg': 20, 'codigo_barras': '17701234000014'}])
ok(s == 200 and [x['nivel'] for x in emps] == ['UNIDAD', 'CAJA'], 'niveles de empaque guardados', emps)
s, r = llamar('POST', '/wms/cubicaje/estiba', {'producto_id': prod['id'], 'nivel': 'CAJA', 'peso_max_kg': 800, 'guardar': True})
ok(s == 200 and (r['ti'], r['hi'], r['cajas'], r['limita']) == (10, 4, 40, 'peso') and r.get('guardado'),
   'estiba: 10 cajas por cama × 4 camas (limita el peso), guardada', r)
s, emps = llamar('GET', f'/wms/productos/{prod["id"]}/empaques')
est = next((x for x in emps if x['nivel'] == 'ESTIBA'), {})
ok(est.get('unidades') == 480 and est.get('cajas_por_cama') == 10 and est.get('camas') == 4, 'nivel estiba: 40 cajas × 12 = 480 unidades', est)

# ── Ocupación ────────────────────────────────────────────────────────────────
llamar('POST', '/wms/inventario/ajuste/', {'producto_id': prod['id'], 'ubicacion_id': u['id'], 'cantidad_nueva': 100, 'motivo': 'Prueba de cubicaje'})
s, ocu = llamar('GET', f'/wms/cubicaje/ubicaciones?almacen_id={alm["id"]}')
o = next(x for x in ocu if x['id'] == u['id'])
ok(cerca(o['ocupado_m3'], 0.75, 1e-6) and cerca(o['ocupacion_pct'], 41.7, 0.05), 'ocupación: 100 und × 0,0075 m³ = 0,75 de 1,8 m³ (41,7 %)', o)
s, res = llamar('GET', f'/wms/cubicaje/resumen?almacen_id={alm["id"]}')
ok(s == 200 and cerca(res['utilizacion_cubica_pct'], 41.7, 0.05) and res['ubicaciones_ocupadas'] == 1, 'resumen del almacén', res)
s, cp = llamar('GET', f'/wms/cubicaje/productos?q={X}')
ok(cp and cp[0]['medido'] and cp[0]['fuente'] == 'CUBICADOR' and cp[0]['estiba']['ti'] == 10,
   'listado: guardar sin cambiar las medidas conserva el origen «cubicador»', cp)
emps_ahora = [x for x in llamar('GET', f'/wms/productos/{prod["id"]}/empaques')[1]]
emps_ahora[0]['alto_cm'] = 16
s, _ = llamar('PUT', f'/wms/productos/{prod["id"]}/empaques', emps_ahora)
s, cp = llamar('GET', f'/wms/cubicaje/productos?q={X}')
ok(cp[0]['fuente'] == 'MANUAL' and cerca(cp[0]['volumen_m3'], 0.008, 1e-9),
   'corregir una medida a mano: pasa a MANUAL y el volumen del producto se recalcula', cp)

# ── Revocación ───────────────────────────────────────────────────────────────
s, t2 = llamar('POST', f'/wms/cubicadores/{c["id"]}/token')
s, _ = llamar('GET', '/wms/cubicador/estado', token=DEV)
s2, _ = llamar('GET', '/wms/cubicador/estado', token=t2['token'])
ok(s == 401 and s2 == 200, 'emitir un token nuevo revoca el anterior')
print('\nFALLOS:', fallos)
