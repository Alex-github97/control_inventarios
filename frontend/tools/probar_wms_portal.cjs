/**
 * Prueba en navegador el portal del depositante sobre la COPIA:
 * el administrador vincula un usuario; ese usuario entra y solo tiene su portal.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
const X = `PW${Date.now() % 100000}`;

async function entrar(p, usuario, clave) {
  await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(process.env.EMPRESA || 'demo'); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const c = p.locator('input[type="password"]');
  await c.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(usuario);
  await c.fill(clave);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await c.waitFor({ state: 'detached', timeout: 60000 });
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctx.newPage();
  const errores = [], fallidas = [], prohibidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => {
    if (!r.url().includes('/api/v1/')) return
    if (r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`)
    if (r.status() === 403) prohibidas.push(r.url().split('/api/v1')[1])
  });
  if (COPIA) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    await route.fulfill({ response: await route.fetch({ url: COPIA + u.pathname + u.search }) });
  });

  await entrar(p, process.env.USUARIO, process.env.CLAVE);
  const api = (m, r, c) => p.evaluate(async ([m, r, c]) => {
    const res = await fetch('/api/v1' + r, { method: m, body: c ? JSON.stringify(c) : undefined,
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } })
    return res.json()
  }, [m, r, c]);
  const dep = await api('POST', '/wms/depositantes', { codigo: X, nombre: `${X} Distribuidora Andina` });
  const alm = (await api('GET', '/wms/almacenes/'))[0];
  const zona = (await api('GET', '/wms/zonas/')).find(z => z.almacen_id === alm.id && z.tipo === 'ALMACENAMIENTO') ;
  const ubic = (await api('GET', '/wms/ubicaciones/')).find(u => u.zona_id === zona.id);
  const prod = await api('POST', '/wms/productos/', { sku: `${X}-AND`, nombre: `${X} Café molido`, depositante_id: dep.id });
  await api('POST', '/wms/inventario/ajuste/', { producto_id: prod.id, ubicacion_id: ubic.id, cantidad_nueva: 25, motivo: 'Inicial' });
  await api('POST', '/usuarios/', { nombre: 'Laura', apellido: 'Andina', email: `${X.toLowerCase()}@icoltrans.com.co`, username: X.toLowerCase(), rol: 'CONSULTA', password: 'PortalAndina2026!' });

  await p.goto(APP + '/wms/config', { waitUntil: 'networkidle' });
  await p.getByRole('tab', { name: 'Depositantes' }).click();
  const fila = p.getByRole('row').filter({ hasText: `${X} Distribuidora Andina` });
  await fila.getByRole('button', { name: 'Usuarios del portal' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Agregar usuario').fill('Laura');
  await p.getByRole('option', { name: new RegExp(X.toLowerCase()) }).click();
  await dlg.getByRole('button', { name: 'Agregar' }).click();
  comprobar(await aparece(p.getByText(/Usuario agregado al portal/)), 'el administrador agrega el usuario al portal del cliente');
  await dlg.getByRole('button', { name: 'Cerrar' }).click();

  await p.evaluate(() => { localStorage.removeItem('access_token'); localStorage.removeItem('auth-storage') });
  prohibidas.length = 0;
  await entrar(p, X.toLowerCase(), 'PortalAndina2026!');
  await p.waitForURL('**/portal', { timeout: 20000 }).catch(() => {});
  comprobar(p.url().endsWith('/portal'), 'el usuario del cliente entra directo a su portal');
  comprobar(await aparece(p.getByText(`${X} Distribuidora Andina`)), 'el portal dice de qué cliente es');
  comprobar(await aparece(p.getByRole('cell', { name: `${X}-AND` })), 've su inventario');
  comprobar((await p.getByRole('row').count()) === 2, 'y solo su inventario (una referencia)');
  await p.getByRole('tab', { name: 'Movimientos' }).click();
  comprobar(await aparece(p.getByRole('cell', { name: 'Ajuste de inventario' })), 've sus movimientos');
  await p.goto(APP + '/wms/inventario', { waitUntil: 'networkidle' });
  comprobar(p.url().endsWith('/portal'), 'si intenta abrir el inventario interno, vuelve a su portal');
  await p.goto(APP + '/erp', { waitUntil: 'networkidle' });
  comprobar(p.url().endsWith('/portal'), 'si intenta abrir otro módulo, vuelve a su portal');
  comprobar(!prohibidas.length, `el portal no hace llamadas prohibidas ${prohibidas.join(' | ')}`);

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  await p.screenshot({ path: `${SALIDA}/portal-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
