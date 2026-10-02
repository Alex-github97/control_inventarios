"""WMS Fase 1 (trazabilidad) de punta a punta contra la COPIA de la base.

Corre dentro de ci_backend contra el backend de pruebas en :8001:
    docker exec -w /app ci_backend python tools/probar_wms_trazable.py
"""
import asyncio, json, os, urllib.request, urllib.error
from datetime import date, timedelta
import asyncpg
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
URL_DB = os.environ['DATABASE_URL'].replace('postgresql+asyncpg', 'postgresql').replace('/control_inventarios', '/ci_pruebas_form')
fallos = 0
hoy = date.today()
X = 'PWMS'


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
        try: return await c.fetch(q, *a)
        finally: await c.close()
    return asyncio.run(f())


def stock(pid, uid=None, estado='total', lote=None):
    col = {'total': 'cantidad_disponible+cantidad_reservada+cantidad_bloqueada', 'disp': 'cantidad_disponible',
           'res': 'cantidad_reservada', 'blo': 'cantidad_bloqueada'}[estado]
    q, a = f'SELECT coalesce(sum({col}),0) s FROM wms_inventario_ubicacion WHERE producto_id=$1', [pid]
    if uid: q += f' AND ubicacion_id=${len(a)+1}'; a.append(uid)
    if lote: q += f' AND lote_id=${len(a)+1}'; a.append(lote)
    return float(sql(q, *a)[0]['s'])


# ── Montaje ──────────────────────────────────────────────────────────────────
s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': 'PRUEBA-WMS Bodega 3PL', 'flujo_recepcion': 'DIRIGIDO'})
ok(s == 201 and alm['flujo_recepcion'] == 'DIRIGIDO', 'almacén con recepción dirigida', alm)
U = {}
for cod, tipo, n in [('REC', 'RECEPCION', 1), ('ALM', 'ALMACENAMIENTO', 3), ('CUA', 'CUARENTENA', 1), ('DES', 'DESPACHO', 1)]:
    s, z = llamar('POST', '/wms/zonas/', {'almacen_id': alm['id'], 'codigo': f'{X}-{cod}', 'nombre': f'PRUEBA {cod}', 'tipo': tipo})
    for i in range(1, n + 1):
        s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-{cod}-0{i}'})
        U[f'{cod}{i}'] = u
s, depA = llamar('POST', '/wms/depositantes', {'codigo': f'{X}-A', 'nombre': 'PRUEBA-WMS Cliente A'})
ok(s == 201, 'depositante 3PL creado', depA)
s, e = llamar('POST', '/wms/depositantes', {'codigo': f'{X}-B', 'nombre': 'otro propio', 'propio': True})
ok(s == 409, 'solo un depositante puede ser «propio»', e)
s, pa = llamar('POST', '/wms/productos/', {'sku': f'{X}-A', 'nombre': 'PRUEBA-WMS Aceite', 'requiere_lote': True, 'depositante_id': depA['id']})
s, pb = llamar('POST', '/wms/productos/', {'sku': f'{X}-B', 'nombre': 'PRUEBA-WMS Filtro', 'codigo_barras': '7709999000011'})
ok(pa['depositante_id'] == depA['id'] and pb['depositante_id'] is not None and pb['depositante_id'] != depA['id'],
   'producto sin depositante queda como mercancía propia', (pa, pb))
s, lote = llamar('POST', '/wms/lotes/', {'producto_id': pa['id'], 'numero_lote': f'{X}-L1', 'fecha_vencimiento': (hoy + timedelta(days=200)).isoformat()})
s, prov = llamar('POST', '/wms/proveedores/', {'codigo': f'{X}-P', 'nombre': 'PRUEBA-WMS Lubricantes SAS'})
s, cli = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C', 'nombre': 'PRUEBA-WMS Transportes del Sur', 'telefono': '3001112233'})
s, cli2 = llamar('POST', '/wms/clientes/', {'codigo': f'{X}-C2', 'nombre': 'PRUEBA-WMS Otro cliente'})

# ── Entrada ──────────────────────────────────────────────────────────────────
s, e = llamar('POST', '/wms/ordenes-compra/', {'proveedor_id': prov['id'], 'almacen_id': alm['id'], 'detalles': [
    {'producto_id': pa['id'], 'cantidad_solicitada': 1}, {'producto_id': pb['id'], 'cantidad_solicitada': 1}]})
ok(s == 422, 'OC que mezcla mercancía de dos depositantes se rechaza', e)
s, oc = llamar('POST', '/wms/ordenes-compra/', {'proveedor_id': prov['id'], 'almacen_id': alm['id'], 'detalles': [
    {'producto_id': pa['id'], 'cantidad_solicitada': 100, 'precio_unitario': 1000}]})
ok(s == 201 and oc['depositante_id'] == depA['id'], 'OC toma el depositante de sus productos', oc)
s, rec = llamar('POST', '/wms/recepciones/', {'orden_compra_id': oc['id'], 'almacen_id': alm['id'], 'muelle': 'M1', 'detalles': [
    {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad_recibida': 80},
    {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad_recibida': 20, 'estado_calidad': 'CUARENTENA'}]})
ok(s == 201 and rec['fecha_llegada'] and rec['depositante_id'] == depA['id'], 'recepción: llegada al muelle y dueño de la OC', rec)
s, rec = llamar('POST', f'/wms/recepciones/{rec["id"]}/completar')
ok(s == 200 and rec['completada_en'], 'recepción completada', rec)
ok(stock(pa['id'], U['REC1']['id']) == 80, 'dirigido: lo aprobado queda en la zona de recepción (80)', stock(pa['id'], U['REC1']['id']))
ok(stock(pa['id'], U['CUA1']['id'], 'blo') == 20, 'lo de cuarentena entra BLOQUEADO a cuarentena (antes no entraba)', stock(pa['id'], U['CUA1']['id'], 'blo'))
lpn_rec = [d['contenedor_id'] for d in rec['detalles'] if d['estado_calidad'] == 'APROBADO'][0]
ok(lpn_rec is not None, 'la línea recibida quedó en una estiba (LPN)', rec['detalles'])
costo = float(sql('SELECT costo_promedio FROM wms_productos WHERE id=$1', pa['id'])[0]['costo_promedio'])
ok(costo == 1000, 'costo promedio desde el precio de la OC', costo)

s, tareas = llamar('GET', f'/wms/tareas?almacen_id={alm["id"]}&estado=PENDIENTE')
t1 = tareas[0] if tareas else {}
ok(len(tareas) == 1 and t1['sugerida'] == f'{X}-ALM-03' and 'Clase C' in (t1['razon_sugerencia'] or '') and t1['contenedor_id'] == lpn_rec,
   'tarea de ubicación: sin alistamientos es clase C y se sugiere al fondo (slotting)', tareas)
s, e = llamar('POST', f'/wms/tareas/{t1["id"]}/completar', {'ubicacion_codigo': f'{X}-ALM-02'})
ok(s == 422, 'ubicar en otra que la sugerida exige motivo', e)
s, e = llamar('POST', f'/wms/tareas/{t1["id"]}/completar', {'ubicacion_codigo': f'{X}-DES-01'})
ok(s == 422, 'no se ubica en zona de despacho', e)
s, r = llamar('POST', f'/wms/tareas/{t1["id"]}/iniciar')
ok(s == 200 and r['estado'] == 'EN_CURSO' and r['operario'], 'tarea iniciada con operario', r)
s, r = llamar('POST', f'/wms/tareas/{t1["id"]}/completar', {'ubicacion_codigo': f'{X}-alm-01', 'motivo_desvio': 'Va al frente'})
ok(s == 200 and r['estado'] == 'COMPLETADA' and r['destino'] == f'{X}-ALM-01' and r['ejecucion_min'] is not None,
   'tarea completada escaneando la ubicación (sin distinguir mayúsculas)', r)
ok(stock(pa['id'], U['ALM1']['id']) == 80 and stock(pa['id'], U['REC1']['id']) == 0, 'la estiba quedó ubicada')
mv = sql("SELECT tarea_id, contenedor_id, saldo_destino, saldo_origen, almacen_id, depositante_id FROM wms_movimientos_inventario "
         "WHERE tipo='UBICACION' AND producto_id=$1", pa['id'])
ok(mv and mv[0]['tarea_id'] == t1['id'] and mv[0]['contenedor_id'] == lpn_rec and mv[0]['saldo_destino'] == 80
   and mv[0]['saldo_origen'] == 0 and mv[0]['almacen_id'] == alm['id'] and mv[0]['depositante_id'] == depA['id'],
   'kárdex: tarea, estiba, saldos, almacén y depositante', mv)

s, k = llamar('GET', f'/wms/kardex?producto_id={pa["id"]}')
ok(s == 200 and k['saldo_final'] == 100 and k['existencia_actual'] == 100 and k['diferencia'] == 0,
   'kárdex del producto: saldo 100 cuadra con la existencia', {x: k.get(x) for x in ('saldo_final', 'existencia_actual', 'diferencia')})
s, k = llamar('GET', f'/wms/kardex?ubicacion_id={U["REC1"]["id"]}')
ok(s == 200 and k['saldo_final'] == 0 and len(k['movimientos']) == 2, 'kárdex de la ubicación de recepción: entra 80, sale 80', k)

s, rec2 = llamar('POST', '/wms/recepciones/', {'almacen_id': alm['id'], 'tipo': 'CIEGA', 'detalles': [
    {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad_recibida': 30}]})
llamar('POST', f'/wms/recepciones/{rec2["id"]}/completar')
s, tareas = llamar('GET', f'/wms/tareas?almacen_id={alm["id"]}&estado=PENDIENTE')
ok(tareas and tareas[0]['sugerida'] == f'{X}-ALM-01' and 'Consolidar' in (tareas[0]['razon_sugerencia'] or ''),
   'segunda entrada del mismo lote: sugiere consolidar', tareas)
s, r = llamar('POST', f'/wms/tareas/{tareas[0]["id"]}/completar', {'ubicacion_codigo': f'{X}-ALM-02', 'motivo_desvio': 'ALM-01 sin espacio físico'})
ok(s == 200 and r['motivo_desvio'], 'ubicada en otra con motivo de desvío registrado', r)

# ── Ajuste, traslado, estados ────────────────────────────────────────────────
s, e = llamar('POST', '/wms/inventario/ajuste/', {'producto_id': pb['id'], 'ubicacion_id': U['ALM3']['id'], 'cantidad_nueva': 10})
ok(s == 422, 'ajuste sin motivo se rechaza', e)
s, r = llamar('POST', '/wms/inventario/ajuste/', {'producto_id': pb['id'], 'ubicacion_id': U['ALM3']['id'], 'cantidad_nueva': 10, 'motivo': 'Inventario inicial'})
ok(s == 201 and r['saldo_destino'] == 10, 'ajuste con motivo y saldo resultante', r)
s, e = llamar('POST', '/wms/inventario/ajuste/', {'producto_id': pb['id'], 'ubicacion_id': U['ALM3']['id'], 'cantidad_nueva': 10, 'motivo': 'otra vez'})
ok(s == 422, 'ajuste que no cambia nada se rechaza', e)
s, e = llamar('POST', '/wms/inventario/transferencia/', {'producto_id': pb['id'], 'ubicacion_origen_id': U['ALM3']['id'], 'ubicacion_destino_id': U['ALM2']['id'], 'cantidad': 50})
ok(s == 409 and stock(pb['id']) == 10, 'traslado mayor que la existencia: 409 y nada se pierde (antes se truncaba a cero)', e)
s, r = llamar('POST', '/wms/inventario/transferencia/', {'producto_id': pb['id'], 'ubicacion_origen_id': U['ALM3']['id'], 'ubicacion_destino_id': U['ALM2']['id'], 'cantidad': 4})
ok(s == 201 and r['saldo_origen'] == 6 and r['saldo_destino'] == 4, 'traslado con saldos de las dos ubicaciones', r)
s, r = llamar('POST', '/wms/inventario/reserva-bloqueo/', {'producto_id': pb['id'], 'ubicacion_id': U['ALM3']['id'], 'cantidad': 2, 'accion': 'BLOQUEAR', 'motivo': 'Caja golpeada'})
ok(s == 200 and r['cantidad_bloqueada'] == 2 and r['cantidad_disponible'] == 4, 'bloqueo', r)
s, k = llamar('GET', f'/wms/kardex?producto_id={pb["id"]}')
s2, k2 = llamar('GET', f'/wms/kardex?producto_id={pb["id"]}&incluir_estados=true')
ok(len(k2['movimientos']) == len(k['movimientos']) + 1 and k['saldo_final'] == 10,
   'el kárdex oculta los cambios de estado salvo que se pidan; el saldo físico no cambia', (len(k['movimientos']), len(k2['movimientos'])))

# ── Estiba manual ────────────────────────────────────────────────────────────
s, c = llamar('POST', '/wms/contenedores', {'almacen_id': alm['id'], 'ubicacion_codigo': f'{X}-ALM-03'})
ok(s == 201 and c['codigo'].startswith('LPN'), 'estiba creada', c)
s, c = llamar('POST', f'/wms/contenedores/{c["id"]}/agregar', {'producto_id': pb['id'], 'cantidad': 3})
ok(s == 200 and c['unidades'] == 3 and c['depositante_id'] == pb['depositante_id'], 'estiba armada con 3 sueltos', c)
s, e = llamar('POST', f'/wms/contenedores/{c["id"]}/agregar', {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad': 1})
ok(s == 422, 'no se mezcla mercancía de otro depositante en la estiba', e)
s, c2 = llamar('POST', f'/wms/contenedores/{c["id"]}/mover', {'ubicacion_codigo': f'{X}-ALM-02'})
ok(s == 200 and c2['ubicacion'] == f'{X}-ALM-02' and stock(pb['id'], U['ALM2']['id']) == 7, 'estiba movida entera', c2)
s, k = llamar('GET', f'/wms/kardex?contenedor_id={c["id"]}')
ok(k['saldo_final'] == 3 and k['diferencia'] == 0, 'kárdex de la estiba: 3, cuadra', k)
s, cc = llamar('GET', f'/wms/contenedores/codigo/{c["codigo"].lower()}')
ok(s == 200 and cc['contenido'][0]['producto_id'] == pb['id'], 'buscar estiba por código escaneado', cc)

# ── Salida ───────────────────────────────────────────────────────────────────
s, o1 = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': alm['id'], 'fecha_requerida': hoy.isoformat(),
                                                'detalles': [{'producto_id': pa['id'], 'cantidad_solicitada': 50}]})
ok(s == 201 and o1['depositante_id'] == depA['id'], 'orden de salida con depositante', o1)
s, t = llamar('POST', f'/wms/ordenes-salida/{o1["id"]}/generar-picking')
ubs = {d['ubicacion_id'] for d in t['detalles']}
ok(s == 201 and sum(d['cantidad_solicitada'] for d in t['detalles']) == 50 and U['CUA1']['id'] not in ubs and U['REC1']['id'] not in ubs,
   'picking: 50 reservados, nunca de cuarentena ni recepción', t)
ok(stock(pa['id'], estado='res') == 50, 'reservado 50')
d0 = t['detalles'][0]
s, e = llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d0['id'], 'cantidad_pickeada': 1, 'ubicacion_codigo': f'{X}-ALM-03'})
ok(s == 422, 'escaneo de ubicación equivocada se rechaza', e)
s, e = llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d0['id'], 'cantidad_pickeada': 1, 'producto_codigo': '7709999000011'})
ok(s == 422, 'escaneo de producto equivocado se rechaza', e)
for d in t['detalles']:
    q = d['cantidad_solicitada'] - (5 if d is d0 else 0)
    s, t = llamar('POST', f'/wms/picking-tareas/{t["id"]}/confirmar-item', {'detalle_id': d['id'], 'cantidad_pickeada': q,
                  'ubicacion_codigo': d['ubicacion']['codigo'], 'producto_codigo': f'{X}-A'})
ok(t['estado'] == 'COMPLETADA' and t['fecha_inicio'] and t['fecha_fin'], 'picking completado con tiempos', t)
ok(stock(pa['id'], estado='res') == 45, 'alistado de menos: los 5 vuelven a disponible', stock(pa['id'], estado='res'))

s, o2 = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli2['id'], 'almacen_id': alm['id'], 'detalles': [{'producto_id': pa['id'], 'cantidad_solicitada': 10}]})
s, t2 = llamar('POST', f'/wms/ordenes-salida/{o2["id"]}/generar-picking')
ok(stock(pa['id'], estado='res') == 55, 'segunda orden reserva 10 más')
s, de = llamar('POST', '/wms/despachos/', {'orden_id': o1['id'], 'muelle': 'D2'})
ok(s == 201 and sum(x['cantidad'] for x in de['detalles']) == 45, 'despacho de la orden 1: 45', de)
ok(stock(pa['id'], estado='res') == 10, 'el despacho no tocó la reserva de la otra orden (antes podía)', stock(pa['id'], estado='res'))
mv = sql("SELECT count(*) n FROM wms_movimientos_inventario WHERE documento_tipo='DESPACHO' AND documento_id=$1 AND ubicacion_origen_id IS NOT NULL", de['id'])
ok(mv[0]['n'] >= 1, 'el despacho dice de qué ubicación salió', mv)
s, e = llamar('POST', '/wms/despachos/', {'orden_id': o1['id']})
ok(s == 400, 'no se despacha dos veces lo mismo', e)

# ── Conteo ───────────────────────────────────────────────────────────────────
s, ct = llamar('POST', '/wms/conteos/', {'almacen_id': alm['id'], 'fecha_programada': hoy.isoformat(), 'tipo': 'CICLICO'})
lin = next(d for d in ct['detalles'] if d['producto_id'] == pb['id'] and d['ubicacion_id'] == U['ALM3']['id'] and not d.get('contenedor_id'))
ok(lin['cantidad_sistema'] == 3, 'conteo: el sistema cuenta disponible + bloqueado (1 + 2 = 3)', lin)
s, ct = llamar('PUT', f'/wms/conteos/{ct["id"]}/detalles/{lin["id"]}', {'cantidad_fisica': 2})
s, ct = llamar('PUT', f'/wms/conteos/{ct["id"]}/completar')
ok(s == 200 and stock(pb['id'], U['ALM3']['id']) == 2, 'faltante de 1 ajustado (antes daba sobrantes falsos con lo bloqueado)', stock(pb['id'], U['ALM3']['id']))

# ── Devolución ───────────────────────────────────────────────────────────────
s, dv = llamar('POST', '/wms/devoluciones/', {'numero_devolucion': f'{X}-DEV1', 'tipo': 'CLIENTE', 'cliente_id': cli['id'], 'almacen_id': alm['id'],
                                              'fecha_recepcion': hoy.isoformat(), 'orden_referencia_id': o1['id'], 'detalles': [
    {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad': 5, 'estado_calidad': 'DANO_MAYOR', 'accion': 'CUARENTENA'},
    {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad': 3, 'accion': 'REINGRESAR'},
    {'producto_id': pa['id'], 'lote_id': lote['id'], 'cantidad': 1, 'accion': 'DESTRUIR'}]})
s, dv = llamar('PUT', f'/wms/devoluciones/{dv["id"]}/procesar', {'estado': 'REINGRESADA'})
ok(s == 200 and stock(pa['id'], U['CUA1']['id'], 'blo') == 25 and stock(pa['id'], U['REC1']['id']) == 3,
   'devolución: dañado a cuarentena bloqueado, bueno a recepción, destruir no entra',
   (stock(pa['id'], U['CUA1']['id'], 'blo'), stock(pa['id'], U['REC1']['id'])))
s, tareas = llamar('GET', f'/wms/tareas?almacen_id={alm["id"]}&estado=PENDIENTE')
ok(any(x['documento_tipo'] == 'DEVOLUCION' for x in tareas), 'el reingreso genera su tarea de ubicación', tareas)

# ── Recorrido del lote y retención ───────────────────────────────────────────
s, rl = llamar('GET', f'/wms/trazabilidad/lote/{lote["id"]}/recorrido')
quien = {c['a_quien']: c['cantidad'] for c in rl.get('clientes', [])}
ok(s == 200 and rl['origen'] and rl['origen'][0]['proveedor'] == 'PRUEBA-WMS Lubricantes SAS', 'recorrido: origen con proveedor', rl.get('origen'))
ok(quien.get('PRUEBA-WMS Transportes del Sur') == 45 and any('3001112233' in (c['contacto'] or '') for c in rl['clientes']),
   'recorrido: a quién se entregó, cuánto y cómo contactarlo', rl.get('clientes'))
ok(rl['en_bodega'] == stock(pa['id'], lote=lote['id']), 'recorrido: lo que queda en bodega', (rl['en_bodega'], rl['queda']))
s, r = llamar('POST', f'/wms/trazabilidad/lote/{lote["id"]}/retener', {'motivo': 'Alerta de calidad del fabricante'})
ok(s == 200 and r['reservado_en_ordenes'] == 10 and stock(pa['id'], lote=lote['id'], estado='disp') == 0,
   'retener el lote: todo lo disponible queda bloqueado e informa lo reservado', r)
s, o3 = llamar('POST', '/wms/ordenes-salida/', {'cliente_id': cli['id'], 'almacen_id': alm['id'], 'detalles': [{'producto_id': pa['id'], 'cantidad_solicitada': 1}]})
s, t3 = llamar('POST', f'/wms/ordenes-salida/{o3["id"]}/generar-picking')
ok(s == 201 and not t3['detalles'], 'un lote retenido no se alista', t3)

# ── Depositantes y reglas ────────────────────────────────────────────────────
s, deps = llamar('GET', '/wms/depositantes')
da = next(d for d in deps if d['id'] == depA['id'])
ok(da['unidades'] == stock(pa['id']) and da['valor'] > 0, 'depositante: unidades y valor en bodega', da)
s, e = llamar('PUT', f'/wms/productos/{pa["id"]}', {'depositante_id': pb['depositante_id']})
ok(s == 409, 'no se cambia el dueño de un producto con existencias', e)
s, k = llamar('GET', f'/wms/kardex?depositante_id={depA["id"]}')
ok(k['diferencia'] == 0, 'kárdex del depositante cuadra con su existencia', {x: k.get(x) for x in ('saldo_final', 'existencia_actual', 'diferencia')})
s, k = llamar('GET', f'/wms/kardex?almacen_id={alm["id"]}')
ok(k['diferencia'] == 0, 'kárdex del almacén cuadra', {x: k.get(x) for x in ('saldo_final', 'existencia_actual', 'diferencia')})
s, doc = llamar('GET', f'/wms/trazabilidad/documento?tipo=RECEPCION&id={rec["id"]}')
ok(s == 200 and sorted(m['tipo'] for m in doc) == ['RECEPCION', 'RECEPCION', 'UBICACION'],
   'trazabilidad por documento: las dos entradas y la ubicación de su tarea', doc)
print('\nFALLOS:', fallos)
