/**
 * Prueba en navegador el mapa de la bodega (WMS fase 5) sobre la COPIA que sembró
 * backend/tools/probar_wms_mapa.py (almacén «PRUEBA-MAPA …»).
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
// PNG de 40×30 píxeles a color (generado con Pillow)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAALklEQVR4nO3NMQEAMAgAoLlIZjKssazg5wMFiK58F/7JKhaLxWKxWCwWi8XilQEZiwGaaC11rQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1100 } });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  if (COPIA) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    await route.fulfill({ response: await route.fetch({ url: COPIA + u.pathname + u.search }) });
  });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(process.env.EMPRESA || 'demo'); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
  await clave.fill(process.env.CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });

  const almacenes = await p.evaluate(async () => (await fetch('/api/v1/wms/almacenes/', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } })).json());
  const alm = almacenes.filter(a => a.nombre.startsWith('PRUEBA-MAPA')).sort((x, y) => y.id - x.id)[0];
  await p.goto(APP + '/wms/mapa', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/mapa');
  await p.getByLabel('Almacén').click();
  await p.getByRole('option', { name: alm.nombre }).click();
  comprobar(await aparece(p.getByText(/Pasillo 7 · 36[.,]4%/)), 'plano: la estantería marcada con su ocupación');
  await p.locator('svg rect').first().click();
  comprobar(await aparece(p.locator('polygon[data-celda]')), 'del plano a la foto de la estantería');
  await p.waitForTimeout(1000);
  comprobar((await p.locator('polygon[data-celda]').count()) === 12, 'foto: 12 celdas sobre la imagen');
  comprobar((await p.locator('polygon[fill="#EF4444"]').count()) === 1 && (await p.locator('polygon[fill="#A855F7"]').count()) === 1,
    'colores: una celda llena (rojo) y una bloqueada (morado)');

  await p.getByLabel(/¿Dónde está\?/).fill(`${alm.codigo}-MALO`);
  await p.getByLabel(/¿Dónde está\?/).press('Enter');
  comprobar(await aparece(p.getByText(/en 1 ubicaciones/)), 'buscador: dice en cuántas ubicaciones está');
  comprobar(await aparece(p.locator('polygon[fill="#2563EB"]')), 'buscador: resalta la celda en la foto');

  await p.getByRole('button', { name: 'Cargar foto de estantería' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.locator('input[type="file"]').setInputFiles({ name: 'nueva.png', mimeType: 'image/png', buffer: PNG });
  await dlg.getByLabel(/Nombre/).fill('Pasillo 7 · prueba UI');
  await dlg.getByLabel('Pasillo', { exact: true }).fill('7');
  await dlg.getByRole('button', { name: 'Cargar' }).click();
  comprobar(await aparece(p.getByText(/Foto cargada/)), 'foto nueva cargada');
  await p.getByRole('button', { name: /Calibrar cuadrícula/ }).click();
  const img = p.locator('img[alt="Pasillo 7 · prueba UI"]');
  await img.waitFor();
  const r = await img.boundingBox();
  for (const [x, y] of [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]) await p.mouse.click(r.x + r.width * x, r.y + r.height * y);
  await p.getByLabel('Niveles (filas)').fill('2');
  await p.getByLabel('Posiciones (columnas)').fill('2');
  await p.getByRole('button', { name: 'Guardar cuadrícula' }).click();
  comprobar(await aparece(p.getByText('Cuadrícula guardada')), 'calibración guardada con 4 clics');
  await p.waitForTimeout(800);
  comprobar((await p.locator('polygon[data-celda]').count()) === 4, 'la cuadrícula de 2 × 2 se dibuja');
  await p.getByRole('button', { name: 'Asignar celdas automáticamente' }).click();
  comprobar(await aparece(p.getByText(/4 de 4 celdas asignadas/)), 'asignación automática por pasillo, nivel y posición');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  await p.screenshot({ path: `${SALIDA}/mapa-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
