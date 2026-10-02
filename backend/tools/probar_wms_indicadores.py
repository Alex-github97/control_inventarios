"""WMS Fase 3 (indicadores) contra la COPIA: un escenario con resultados conocidos.

Tres órdenes de 10 unidades con fecha requerida:
  A: a tiempo y completa, pero con devolución de 2  → OTIF sí, orden perfecta no
  B: completa pero entregada tarde                   → OTIF no
  C: a tiempo pero incompleta (8 de 10)              → OTIF no
OTIF = 1/3; la aproximación vieja (el menor de "a tiempo" y "completas") daba 2/3.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_indicadores.py
"""
import asyncio, json, os, time, urllib.request, urllib.error
from datetime import date, timedelta
import asyncpg
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', '/ci_pruebas_form')
X = f'PK{int(time.time()) % 100000}'
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
    print(('ok  ' if c else 'X   ') + t + ('' if c else f'  -> {str(extra)[:500]}'))


def sql(q, *a):
    async def f():
        c = await asyncpg.connect(URL_DB)
        try: return await c.execute(q, *a)
        finally: await c.close()
    return asyncio.run(f())


def cerca(a, b, tol=0.02):
    return a is not None and abs(a - b) <= tol


# ── Montaje ──────────────────────────────────────────────────────────────────
s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-KPI {X}', 'flujo_recepcion': 'DIRIGIDO'})
A = alm['id']
U = {}
for cod, tipo, n in [('REC', 'RECEPCION', 1), ('ALM', 'ALMACENAMIENTO', 2), ('CUA', 'CUARENTENA', 1)]:
    s, z = llamar('POST', '/wms/zonas/', {'almacen_id': A, 'codigo': f'{X}-{cod}', 'nombre': f'{X} {cod}', 'tipo': tipo})
    for i in range(1, n + 1):
        s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-{cod}-{i}', 'largo_cm': 100, 'ancho_cm': 100, 'alto_cm': 100})
        U[f'{cod}{i}'] = u['id']
s, p = llamar('POST', '/wms/productos/', {'sku': f'{X}-P', 'nombre': f'{X} Producto', 'codigo_barras': f'77{int(time.time())}'})
s, q = llamar('POST', '/wms/productos/', {'sku': f'{X}-Q', 'nombre': f'{X} Otro'})
s, prov = llamar('POST', '/wms/proveedores/', {'codigo': f'{X}-PR', 'nombre': f'{X} Proveedor'})
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-CL', 'nombre': f'{X} Cliente'})
s, oc = llamar('POST', '/wms/ordenes-compra/', {'proveedor_id': prov['id'], 'almacen_id': A, 'fecha_esperada': hoy.isoformat(),
                                                'detalles': [{'producto_id': p['id'], 'cantidad_solicitada': 40, 'precio_unitario': 1000}]})
s, rec = llamar('POST', '/wms/recepciones/', {'orden_compra_id': oc['id'], 'almacen_id': A, 'muelle': 'M1',
                                              'detalles': [{'producto_id': p['id'], 'cantidad_esperada': 40, 'cantidad_recibida': 40}]})
s, rec = llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
ok(s == 200, 'recepción dirigida completada', rec)
s, ts = llamar('GET', f'/wms/tareas?almacen_id={A}&estado=PENDIENTE')
llamar('POST', f'/wms/tareas/{ts[0]["id"]}/iniciar')
s, r = llamar('POST', f'/wms/tareas/{ts[0]["id"]}/completar', {'ubicacion_codigo': ts[0]['sugerida']})
ok(s == 200, 'estiba ubicada en la sugerida', r)
# Tiempos del muelle conocidos: llegó hace 5 h, descargó de 5 h a 4,5 h atrás.
sql("UPDATE wms_recepciones SET fecha_llegada = now() - interval '5 hours', inicio_descargue = now() - interval '5 hours', "
    "fin_descargue = now() - interval '270 minutes' WHERE id = $1", rec['id'])
sql('UPDATE wms_productos SET costo_promedio = 500 WHERE id = $1', q['id'])   # costo conocido para la merma
llamar('POST', '/wms/inventario/ajuste/', {'producto_id': q['id'], 'ubicacion_id': U['ALM2'], 'cantidad_nueva': 5, 'motivo': 'Inicial'})

# ── Tres órdenes ─────────────────────────────────────────────────────────────
ordenes = {}
for nombre in 'ABC':
    s, o = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': A, 'fecha_requerida': hoy.isoformat(),
                                                   'detalles': [{'producto_id': p['id'], 'cantidad_solicitada': 10}]})
    ordenes[nombre] = o
sql("UPDATE wms_ordenes_salida SET fecha_requerida = $1 WHERE id = $2", hoy - timedelta(days=1), ordenes['B']['id'])
for nombre, alistar, verificar in (('A', 10, True), ('B', 10, True), ('C', 8, False)):
    o = ordenes[nombre]
    s, t = llamar('POST', f'/wms/ordenes-salida/{o["id"]}/generar-picking')
    d = t['detalles'][0]
    cuerpo = {'detalle_id': d['id'], 'cantidad_pickeada': alistar}
    if verificar:
        cuerpo.update(ubicacion_codigo=d['ubicacion']['codigo'], producto_codigo=f'{X}-P')
    llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', cuerpo)
    s, de = llamar('POST', '/wms/despachos/', {'orden_id': o['id'], 'muelle': 'D1'})
    for e in ('LISTO', 'EN_TRANSITO', 'ENTREGADO'):
        llamar('PUT', f'/wms/despachos/{de["id"]}/estado', {'estado': e, 'fecha_entrega_real': hoy.isoformat()})
    o['despacho'] = de['id']
sql("UPDATE wms_despachos SET inicio_cargue = now() - interval '1 hour', fin_cargue = now() - interval '40 minutes' WHERE id = $1",
    ordenes['A']['despacho'])
# Orden C quedó con 8 de 10: se marca entregada igual (el cliente recibió lo que había).
sql("UPDATE wms_ordenes_salida SET estado = 'ENTREGADO' WHERE id = $1", ordenes['C']['id'])
s, dv = llamar('POST', '/wms/devoluciones/', {'numero_devolucion': f'{X}-DV', 'tipo': 'CLIENTE', 'cliente_id': cli['id'], 'almacen_id': A,
                                              'fecha_recepcion': hoy.isoformat(), 'orden_referencia_id': ordenes['A']['id'],
                                              'detalles': [{'producto_id': p['id'], 'cantidad': 2, 'accion': 'CUARENTENA', 'estado_calidad': 'DANO_MENOR'}]})
llamar('PUT', f'/wms/devoluciones/{dv["id"]}/procesar', {'estado': 'REINGRESADA'})

# Conteo: todo bien salvo el otro producto, al que le falta 1.
s, ct = llamar('POST', '/wms/conteos/', {'almacen_id': A, 'fecha_programada': hoy.isoformat()})
for d in ct['detalles']:
    fisico = d['cantidad_sistema'] - (1 if d['producto_id'] == q['id'] else 0)
    llamar('PUT', f'/wms/conteos/{ct["id"]}/detalles/{d["id"]}', {'cantidad_fisica': fisico})
llamar('PUT', f'/wms/conteos/{ct["id"]}/completar')
lineas_conteo = len(ct['detalles'])

# ── Indicadores ──────────────────────────────────────────────────────────────
rango = f'desde={(hoy - timedelta(days=1)).isoformat()}&hasta={(hoy + timedelta(days=1)).isoformat()}&almacen_id={A}'
s, tab = llamar('GET', f'/wms/indicadores?{rango}')
ok(s == 200 and len(tab['indicadores']) == 28, 'tablero: 28 indicadores', tab if s != 200 else len(tab['indicadores']))
I = {i['clave']: i for i in tab.get('indicadores', [])}
v = lambda k: I[k]['valor']
ok(cerca(v('otif'), 33.33), 'OTIF orden por orden: 1 de 3 = 33,33 % (la aproximación vieja daba 66,7 %)', I.get('otif'))
ok(v('orden_perfecta') == 0.0, 'orden perfecta: 0 % (A tiene devolución, B tarde, C incompleta)', I.get('orden_perfecta'))
ok(cerca(v('fill_rate_lineas'), 66.67) and cerca(v('fill_rate_unidades'), 93.33), 'nivel de servicio: 2/3 líneas, 28/30 unidades',
   (I.get('fill_rate_lineas'), I.get('fill_rate_unidades')))
ok(cerca(v('despacho_a_tiempo'), 66.67), 'despachos a tiempo: 2 de 3 (B tenía fecha de ayer)', I.get('despacho_a_tiempo'))
ok(cerca(v('dock_to_stock'), 5.0, 0.1), 'de muelle a estantería ≈ 5 h', I.get('dock_to_stock'))
ok(cerca(v('tiempo_descargue'), 30.0, 0.5), 'descargue: 30 min', I.get('tiempo_descargue'))
ok(cerca(v('tiempo_cargue'), 20.0, 0.5) and I['tiempo_cargue']['avisos'], 'cargue: 20 min, y avisa los despachos sin tiempos', I.get('tiempo_cargue'))
ok(v('recepcion_a_tiempo') == 100.0 and v('exactitud_recepcion') == 100.0 and v('fill_rate_proveedor') == 100.0,
   'recepción: a tiempo, exacta y completa', (I.get('recepcion_a_tiempo'), I.get('exactitud_recepcion')))
ok(v('ubicacion_sugerida_cumplida') == 100.0, 'ubicación en la sugerida: 100 %', I.get('ubicacion_sugerida_cumplida'))
ok(cerca(v('lineas_completas'), 66.67), 'líneas alistadas completas: 2 de 3', I.get('lineas_completas'))
ok(cerca(v('exactitud_inventario'), (lineas_conteo - 1) / lineas_conteo * 100, 0.05),
   f'exactitud de inventario: {lineas_conteo - 1} de {lineas_conteo} registros', I.get('exactitud_inventario'))
ok(cerca(v('tasa_devolucion'), 2 / 28 * 100, 0.05), 'devoluciones: 2 de 28 despachadas', I.get('tasa_devolucion'))
ok(cerca(v('merma'), 500 / 28000 * 100, 0.01) and I['merma']['semaforo'] == 'rojo',
   'merma: 1 und × 500 faltante frente a 28 × 1.000 despachados = 1,79 %', I.get('merma'))
ok(v('rotacion') is not None and v('dias_inventario') is not None, 'rotación y días de inventario con el kárdex', (I.get('rotacion'), I.get('dias_inventario')))
ok(v('utilizacion_cubica') is not None and v('utilizacion_cubica') <= 100, 'utilización cúbica razonable', I.get('utilizacion_cubica'))
ok(I['otif']['semaforo'] == 'rojo' and I['fill_rate_unidades']['semaforo'] == 'amarillo', 'semáforo contra la meta', (I['otif']['semaforo'], I['fill_rate_unidades']['semaforo']))

s, f = llamar('GET', f'/wms/indicadores/otif?{rango}')
ok(s == 200 and f['ficha']['formula'] and f['ficha']['como'] and len(f['detalle']) == 2,
   'ficha del OTIF: fórmula, cómo se mide y las 2 órdenes que fallaron', f.get('detalle') if s == 200 else f)
ok(f['serie'] and any(x['valor'] is not None for x in f['serie']), 'ficha: serie en el tiempo', f.get('serie'))
s, r = llamar('PUT', '/wms/indicadores/otif/meta', {'meta': 30, 'almacen_id': A})
s, f = llamar('GET', f'/wms/indicadores/otif?{rango}')
ok(f['ficha']['meta'] == 30 and f['semaforo'] == 'verde', 'meta del almacén editable: con 30 % el OTIF queda en verde', f.get('ficha', {}).get('meta'))
s, e = llamar('PUT', '/wms/indicadores/otif/meta', {'meta': 130})
ok(s == 422, 'una meta en % no pasa de 100', e)
s, ops = llamar('GET', f'/wms/indicadores/operarios?{rango}')
ok(s == 200 and ops and ops[0]['lineas'] >= 3 and ops[0]['tareas'] >= 1, 'productividad por operario', ops)
s, k = llamar('GET', f'/wms/dashboard/kpis?almacen_id={A}')
ok(s == 200 and cerca(k['otif_pct'], 33.33), 'el tablero viejo también usa el OTIF real', k.get('otif_pct') if s == 200 else k)
print('\nFALLOS:', fallos)
