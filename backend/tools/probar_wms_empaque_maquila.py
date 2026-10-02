"""WMS Fase 4c-4d (empaque y maquila) contra la COPIA, con cuentas hechas a mano.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_empaque_maquila.py
"""
import asyncio, json, os, time, urllib.request, urllib.error
from datetime import timedelta
import asyncpg
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', '/ci_pruebas_form')
X = f'PE{int(time.time()) % 100000}'
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


def sql(q, *a):
    async def f():
        c = await asyncpg.connect(URL_DB)
        try: return await c.fetch(q, *a)
        finally: await c.close()
    return asyncio.run(f())


def cerca(a, b, tol=0.01):
    return a is not None and abs(a - b) <= tol


def stock(pid, estado='cantidad_disponible+cantidad_reservada+cantidad_bloqueada'):
    return float(sql(f'SELECT coalesce(sum({estado}),0) s FROM wms_inventario_ubicacion WHERE producto_id=$1', pid)[0]['s'])


s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-EMP {X}'})
A = alm['id']
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': A, 'codigo': f'{X}-ALM', 'nombre': 'Almacenamiento', 'tipo': 'ALMACENAMIENTO'})
U = {}
for i in range(1, 5):
    s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-{i}', 'pasillo': '1', 'posicion': str(i)})
    U[i] = u['id']
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C', 'nombre': f'{X} Cliente'})


def producto(nombre, costo=None):
    s, p = llamar('POST', '/wms/productos/', {'sku': f'{X}-{nombre}', 'nombre': f'{X} {nombre}'})
    if costo is not None:
        sql('UPDATE wms_productos SET costo_promedio = $1 WHERE id = $2', costo, p['id'])
    return p


def poner(p, ubic, cant):
    llamar('POST', '/wms/inventario/ajuste/', {'producto_id': p['id'], 'ubicacion_id': U[ubic], 'cantidad_nueva': cant, 'motivo': 'Inicial'})

# ═══ Empaque ═══
for c in llamar('GET', '/wms/cajas-empaque')[1]:       # solo las cajas de esta prueba
    if c['activo']:
        llamar('PUT', f'/wms/cajas-empaque/{c["id"]}', {**{k: c[k] for k in ('codigo', 'nombre', 'largo_cm', 'ancho_cm', 'alto_cm', 'peso_max_kg', 'tara_kg', 'costo')}, 'activo': False})
for cod, dims, maxk, tara in (('S', (30, 20, 20), 10, 0.2), ('M', (40, 30, 30), 20, 0.4), ('L', (60, 40, 40), 30, 0.8)):
    s, c = llamar('POST', '/wms/cajas-empaque', {'codigo': f'{X}-{cod}', 'nombre': f'Caja {cod}', 'largo_cm': dims[0],
                                                 'ancho_cm': dims[1], 'alto_cm': dims[2], 'peso_max_kg': maxk, 'tara_kg': tara})
ok(s == 201 and cerca(c['volumen_m3'], 0.096, 1e-9), 'cajas de despacho en el catálogo', c)
E = producto('E'); F = producto('F')
llamar('PUT', f'/wms/productos/{E["id"]}/empaques', [{'nivel': 'UNIDAD', 'unidades': 1, 'largo_cm': 10, 'ancho_cm': 10, 'alto_cm': 10, 'peso_kg': 0.5}])
poner(E, 1, 10); poner(F, 2, 5)
s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': A, 'detalles': [
    {'producto_id': E['id'], 'cantidad_solicitada': 4}, {'producto_id': F['id'], 'cantidad_solicitada': 1}]})
s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
for d in t['detalles']:
    llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': d['cantidad_solicitada']})
s, sug = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/empaque/sugerir')
ok(s == 200 and len(sug['bultos']) == 1 and sug['bultos'][0]['caja'] == f'{X}-S' and cerca(sug['bultos'][0]['peso_kg'], 2.2),
   'sugerencia: las 4 unidades medidas van en la caja S (2,2 kg con la tara)', sug)
ok(sug['sin_medidas'] and sug['sin_medidas'][0]['sku'] == f'{X}-F' and sug['avisos'], 'avisa el producto sin medidas', sug.get('sin_medidas'))
ok(cerca(sug['bultos'][0]['peso_facturable_kg'], 2.4), 'peso facturable: el volumétrico (30×20×20/5000 = 2,4 kg) gana', sug['bultos'][0])
cajas = {c['codigo']: c['id'] for c in llamar('GET', '/wms/cajas-empaque')[1]}
s, e = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/empaque/confirmar', {'bultos': [
    {'caja_id': cajas[f'{X}-S'], 'peso_kg': 2.2, 'contenido': [{'producto_id': E['id'], 'cantidad': 5}]}]})
ok(s == 422, 'no se empaca más de lo alistado', e)
s, emp = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/empaque/confirmar', {'bultos': [
    {'caja_id': cajas[f'{X}-S'], 'peso_kg': 2.2, 'contenido': [{'producto_id': E['id'], 'cantidad': 4}]},
    {'largo_cm': 20, 'ancho_cm': 20, 'alto_cm': 20, 'peso_kg': 1.0, 'contenido': [{'producto_id': F['id'], 'cantidad': 1}]}]})
ok(s == 200 and len(emp['bultos']) == 2 and emp['bultos'][1]['de'] == 2 and cerca(emp['peso_total_kg'], 3.2)
   and cerca(emp['volumen_total_m3'], 0.02, 1e-6), 'dos bultos: 3,2 kg y 0,02 m³', emp)
s, d = llamar('POST', '/wms/despachos/', {'orden_id': o['id']})
ok(s == 201 and cerca(d['peso_total_kg'], 3.2) and cerca(d['volumen_total_m3'], 0.02, 1e-6), 'el despacho toma peso y volumen de los bultos', d)

# ═══ Maquila ═══
K = producto('KIT'); C1 = producto('C1', 100); C2 = producto('C2', 50)
poner(C1, 1, 10); poner(C2, 2, 3)
s, ajeno = llamar('POST', '/wms/depositantes', {'codigo': f'{X}-D', 'nombre': f'{X} Otro dueño'})
s, AJ = llamar('POST', '/wms/productos/', {'sku': f'{X}-AJENO', 'nombre': 'Ajeno', 'depositante_id': ajeno['id']})
s, e = llamar('POST', '/wms/maquila/recetas', {'codigo': f'{X}-RX', 'nombre': 'Mezcla', 'producto_resultado_id': K['id'],
                                               'componentes': [{'producto_id': C1['id'], 'cantidad': 1}, {'producto_id': AJ['id'], 'cantidad': 1}]})
ok(s == 422, 'una receta no mezcla mercancía de dos depositantes', e)
s, rec = llamar('POST', '/wms/maquila/recetas', {'codigo': f'{X}-R1', 'nombre': 'Kit de prueba', 'tipo': 'KIT', 'producto_resultado_id': K['id'],
                                                 'minutos_por_unidad': 5, 'costo_mano_obra_unidad': 30,
                                                 'componentes': [{'producto_id': C1['id'], 'cantidad': 2}, {'producto_id': C2['id'], 'cantidad': 1}]})
ok(s == 201 and cerca(rec['costo_estandar_unidad'], 280), 'receta: costo estándar 2×100 + 50 + 30 = 280', rec)
s, o2 = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': A, 'detalles': [{'producto_id': K['id'], 'cantidad_solicitada': 5}]})
s, pos = llamar('GET', f'/wms/maquila/recetas/{rec["id"]}/posible?almacen_id={A}')
ok((pos['maximo'], pos['cuello_de_botella']['producto_id'], pos['demanda_pendiente'], pos['sugerido']) == (3, C2['id'], 5, 3),
   'se pueden 3 (limita C2), la demanda pide 5: se sugieren 3', pos)
s, om = llamar('POST', '/wms/maquila/ordenes', {'receta_id': rec['id'], 'almacen_id': A, 'cantidad': 4})
s, e = llamar('POST', f'/wms/maquila/ordenes/{om["id"]}/iniciar')
ok(s == 409 and 'C2' in str(e) and stock(C1['id'], 'cantidad_reservada') == 0, 'si falta un componente no reserva nada y dice cuál', e)
llamar('POST', f'/wms/maquila/ordenes/{om["id"]}/cancelar')
s, om = llamar('POST', '/wms/maquila/ordenes', {'receta_id': rec['id'], 'almacen_id': A, 'cantidad': 3})
s, om = llamar('POST', f'/wms/maquila/ordenes/{om["id"]}/iniciar')
ok(s == 200 and om['estado'] == 'EN_PROCESO' and stock(C1['id'], 'cantidad_reservada') == 6 and stock(C2['id'], 'cantidad_reservada') == 3,
   'iniciar reserva 6 de C1 y 3 de C2', om)
s, e = llamar('POST', f'/wms/maquila/ordenes/{om["id"]}/terminar', {'cantidad_hecha': 4, 'ubicacion_id': U[3]})
ok(s == 422, 'no se reporta más de lo planeado', e)
s, om = llamar('POST', f'/wms/maquila/ordenes/{om["id"]}/terminar', {'cantidad_hecha': 2, 'ubicacion_codigo': f'{X}-3'})
ok(s == 200 and om['estado'] == 'TERMINADA' and cerca(om['costo_unitario'], 280), 'terminar 2: costo (4×100 + 2×50 + 2×30)/2 = 280', om)
ok((stock(C1['id']), stock(C1['id'], 'cantidad_reservada'), stock(C2['id']), stock(K['id'])) == (6, 0, 1, 2),
   'consume 4 de C1 y 2 de C2, libera el resto, produce 2 kits', (stock(C1['id']), stock(C2['id']), stock(K['id'])))
costo_k = float(sql('SELECT costo_promedio FROM wms_productos WHERE id=$1', K['id'])[0]['costo_promedio'])
ok(cerca(costo_k, 280), 'el kit entra al inventario a 280', costo_k)
s, doc = llamar('GET', f'/wms/trazabilidad/documento?tipo=MAQUILA&id={om["id"]}')
ok({m['tipo'] for m in doc} >= {'RESERVA', 'MAQUILA_CONSUMO', 'LIBERACION', 'MAQUILA_PRODUCCION'}, 'kárdex de la orden de maquila completo', [m['tipo'] for m in doc])
s, des = llamar('POST', '/wms/maquila/recetas', {'codigo': f'{X}-R2', 'nombre': 'Desarme', 'tipo': 'DESARME', 'producto_resultado_id': K['id'],
                                                 'componentes': [{'producto_id': C1['id'], 'cantidad': 2}, {'producto_id': C2['id'], 'cantidad': 1}]})
s, od = llamar('POST', '/wms/maquila/ordenes', {'receta_id': des['id'], 'almacen_id': A, 'cantidad': 1})
llamar('POST', f'/wms/maquila/ordenes/{od["id"]}/iniciar')
s, od = llamar('POST', f'/wms/maquila/ordenes/{od["id"]}/terminar', {'cantidad_hecha': 1, 'ubicacion_id': U[4]})
ok(s == 200 and (stock(K['id']), stock(C1['id']), stock(C2['id'])) == (1, 8, 2), 'desarme: 1 kit vuelve a 2 de C1 y 1 de C2', od)
mov = sql("SELECT producto_id, costo_unitario FROM wms_movimientos_inventario WHERE documento_tipo='MAQUILA' AND documento_id=$1 AND tipo='MAQUILA_PRODUCCION'", od['id'])
cu = {r['producto_id']: float(r['costo_unitario']) for r in mov}
ok(cerca(cu.get(C1['id']), 112) and cerca(cu.get(C2['id']), 56), 'desarme: los 280 se reparten por peso de costo (C1 112 c/u, C2 56)', cu)
s, res = llamar('GET', f'/wms/maquila/resumen?almacen_id={A}')
r0 = res[0] if res else {}
ok(s == 200 and r0.get('ordenes') == 2 and r0.get('unidades') == 3 and cerca(r0.get('minutos_estandar'), 10) and cerca(r0.get('mano_obra'), 60),
   'resumen por depositante para facturar: 2 órdenes, 3 unidades, 10 min estándar, 60 de mano de obra', res)
print('\nFALLOS:', fallos)
