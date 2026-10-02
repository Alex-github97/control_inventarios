"""WMS Fase 5 (mapa visual) contra la COPIA.

Una estantería de 3 niveles × 4 posiciones en el pasillo 7. La foto se genera
a color y debe quedar guardada en blanco y negro; las celdas se asignan solas
(nivel 1 = fila de abajo) y se pintan según lo ocupadas que están.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tools/probar_wms_mapa.py
"""
import io, os, time
from datetime import timedelta
import httpx
from PIL import Image, ImageDraw
from app.core.config import settings
from app.core.security import create_access_token

B = os.environ.get('API', 'http://127.0.0.1:8001/api/v1')
T = create_access_token(1, timedelta(hours=2), cliente='public', esquema='public', usuario='admin')
X = f'PM{int(time.time()) % 100000}'
cli = httpx.Client(base_url=B, headers={'Authorization': 'Bearer ' + T}, timeout=60)
fallos = 0


def llamar(m, ruta, cuerpo=None, **kw):
    r = cli.request(m, ruta, json=cuerpo, **kw)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.content


def ok(c, t, extra=''):
    global fallos
    if not c: fallos += 1
    print(('ok  ' if c else 'X   ') + t + ('' if c else f'  -> {str(extra)[:500]}'))


def foto_color(ancho=1600, alto=1200):
    img = Image.new('RGB', (ancho, alto), (200, 120, 40))
    d = ImageDraw.Draw(img)
    for i in range(5):
        d.line([(200 + i * 300, 150), (200 + i * 300, 1050)], fill=(30, 60, 200), width=12)
    for j in range(4):
        d.line([(200, 150 + j * 300), (1400, 150 + j * 300)], fill=(30, 60, 200), width=12)
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    return buf.getvalue()


s, alm = llamar('POST', '/wms/almacenes/', {'codigo': X, 'nombre': f'PRUEBA-MAPA {X}'})
A = alm['id']
s, z = llamar('POST', '/wms/zonas/', {'almacen_id': A, 'codigo': f'{X}-ALM', 'nombre': 'Almacenamiento', 'tipo': 'ALMACENAMIENTO'})
U = {}
for nivel in (1, 2, 3):
    for pos in (1, 2, 3, 4):
        s, u = llamar('POST', '/wms/ubicaciones/', {'zona_id': z['id'], 'codigo': f'{X}-7-{nivel}{pos}', 'pasillo': '7',
                                                     'nivel': str(nivel), 'posicion': str(pos), 'largo_cm': 100, 'ancho_cm': 100, 'alto_cm': 100})
        U[(nivel, pos)] = u['id']
s, prod = llamar('POST', '/wms/productos/', {'sku': f'{X}-CAJA', 'nombre': f'{X} Caja grande'})
llamar('PUT', f'/wms/productos/{prod["id"]}/empaques', [{'nivel': 'UNIDAD', 'unidades': 1, 'largo_cm': 50, 'ancho_cm': 50, 'alto_cm': 50}])
# nivel 1 pos 1: 2 cajas (0,25 m³ = 25 %); nivel 2 pos 3: 7 cajas (87,5 %); nivel 3 pos 4: 8 cajas (100 %)
for (nivel, pos), q in (((1, 1), 2), ((2, 3), 7), ((3, 4), 8)):
    llamar('POST', '/wms/inventario/ajuste/', {'producto_id': prod['id'], 'ubicacion_id': U[(nivel, pos)], 'cantidad_nueva': q, 'motivo': 'Inicial'})
s, otro = llamar('POST', '/wms/productos/', {'sku': f'{X}-MALO', 'nombre': f'{X} En cuarentena'})
llamar('POST', '/wms/inventario/ajuste/', {'producto_id': otro['id'], 'ubicacion_id': U[(1, 4)], 'cantidad_nueva': 1, 'motivo': 'Inicial'})
llamar('POST', '/wms/inventario/reserva-bloqueo/', {'producto_id': otro['id'], 'ubicacion_id': U[(1, 4)], 'cantidad': 1, 'accion': 'BLOQUEAR', 'motivo': 'Dañado'})

s, e = llamar('POST', '/wms/mapa/fotos', data={'almacen_id': str(A), 'nombre': 'No es imagen'}, files={'archivo': ('x.jpg', b'hola', 'image/jpeg')})
ok(s == 422, 'un archivo que no es imagen se rechaza', e)
s, f = llamar('POST', '/wms/mapa/fotos', data={'almacen_id': str(A), 'nombre': 'Pasillo 7 · frente', 'pasillo': '7'},
              files={'archivo': ('estanteria.png', foto_color(), 'image/png')})
ok(s == 201 and f['ancho'] == 1600 and not f['calibrada'], 'foto subida', f)
r = cli.get(f'/wms/mapa/fotos/{f["id"]}/imagen')
img = Image.open(io.BytesIO(r.content))
ok(r.status_code == 200 and img.format == 'JPEG' and img.mode == 'L', 'se guarda en blanco y negro (JPEG en escala de grises)', (r.status_code, img.format, img.mode))
ok(httpx.get(B + f'/wms/mapa/fotos/{f["id"]}/imagen').status_code == 401, 'la imagen no se sirve sin sesión')
s, e = llamar('POST', f'/wms/mapa/fotos/{f["id"]}/autoasignar', {})
ok(s == 422, 'sin cuadrícula no se pueden asignar celdas', e)
esq = [[0.125, 0.125], [0.875, 0.125], [0.875, 0.875], [0.125, 0.875]]
s, f2 = llamar('PUT', f'/wms/mapa/fotos/{f["id"]}', {'esquinas': esq, 'filas': 3, 'columnas': 4})
ok(s == 200 and f2['calibrada'], 'calibrada: 4 esquinas, 3 filas × 4 columnas', f2)
s, e = llamar('PUT', f'/wms/mapa/fotos/{f["id"]}', {'esquinas': [[0, 0], [2, 0], [1, 1], [0, 1]], 'filas': 3, 'columnas': 4})
ok(s == 422, 'esquinas fuera de la foto se rechazan', e)
s, a = llamar('POST', f'/wms/mapa/fotos/{f["id"]}/autoasignar', {})
ok(s == 200 and a['asignadas'] == 12 and a['sin_ubicacion'] == 0, 'autoasignación: las 12 celdas del pasillo 7', a)
s, est = llamar('GET', f'/wms/mapa/fotos/{f["id"]}/estado')
celda = {(c['fila'], c['columna']): c for c in est['celdas']}
ok(celda[(2, 0)]['codigo'] == f'{X}-7-11' and celda[(0, 3)]['codigo'] == f'{X}-7-34', 'nivel 1 abajo, posición 1 a la izquierda', (celda[(2, 0)], celda[(0, 3)]))
ok((celda[(2, 0)]['estado'], celda[(1, 2)]['estado'], celda[(0, 3)]['estado'], celda[(2, 3)]['estado'], celda[(1, 0)]['estado'])
   == ('OCUPADA', 'CASI_LLENA', 'LLENA', 'BLOQUEADA', 'VACIA'), 'colores: 25 % ocupada, 87,5 % casi llena, 100 % llena, bloqueada, vacía',
   [celda[k]['estado'] for k in ((2, 0), (1, 2), (0, 3), (2, 3), (1, 0))])
ok(celda[(1, 2)]['contenido'][0]['sku'] == f'{X}-CAJA' and celda[(1, 2)]['unidades'] == 7, 'cada celda dice qué tiene', celda[(1, 2)])
s, est = llamar('GET', f'/wms/mapa/fotos/{f["id"]}/estado?producto_id={otro["id"]}')
ok([(c['fila'], c['columna']) for c in est['celdas'] if c['resaltar']] == [(2, 3)], 'resalta dónde está un producto', est['celdas'])
s, r = llamar('PUT', f'/wms/mapa/fotos/{f["id"]}/celdas', [{'fila': 1, 'columna': 0, 'ubicacion_id': None}])
s, est = llamar('GET', f'/wms/mapa/fotos/{f["id"]}/estado')
ok(next(c for c in est['celdas'] if (c['fila'], c['columna']) == (1, 0))['estado'] == 'SIN_ASIGNAR', 'asignación manual de una celda', est['resumen'])
s, b = llamar('GET', f'/wms/mapa/buscar?almacen_id={A}&q={X}-CAJA')
ok(s == 200 and b['fotos'] and len(b['fotos'][0]['celdas']) == 3 and b['fuera_del_mapa'] == 0, 'buscar: el producto está en 3 celdas de la foto', b)

s, p = llamar('POST', '/wms/mapa/plano', data={'almacen_id': str(A)}, files={'archivo': ('plano.png', foto_color(1000, 700), 'image/png')})
ok(s == 201, 'plano subido', p)
s, m = llamar('PUT', f'/wms/mapa/plano/{p["id"]}/marcas', [{'x': 0.1, 'y': 0.2, 'w': 0.3, 'h': 0.1, 'etiqueta': 'Pasillo 7', 'foto_id': f['id']}])
ok(s == 200, 'estantería marcada en el plano', m)
s, pl = llamar('GET', f'/wms/mapa/plano?almacen_id={A}')
mk = pl['marcas'][0]
ok(mk['celdas'] == 11 and mk['ocupadas'] == 4 and mk['ocupacion_pct'] == 36.4, 'el plano dice cuánto de cada estantería está ocupado (4 de 11)', mk)
print('\nFALLOS:', fallos)
