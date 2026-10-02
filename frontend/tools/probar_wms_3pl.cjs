/**
 * Prueba en navegador la facturación 3PL sobre la COPIA que sembró
 * backend/tools/probar_wms_3pl.py (depositante «… Cliente 3PL SAS»).
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
const iso = d => d.toISOString().slice(0, 10);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, timezoneId: 'America/Bogota' });
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

  const deps = await p.evaluate(async () => (await fetch('/api/v1/wms/depositantes', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } })).json());
  const dep = deps.filter(d => d.nombre.endsWith('Cliente 3PL SAS')).sort((x, y) => y.id - x.id)[0];
  await p.goto(APP + '/wms/facturacion', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/facturacion');
  await p.getByLabel('Depositante').click();
  await p.getByRole('option', { name: dep.nombre }).click();
  const ayer = new Date(Date.now() - 864e5), antier = new Date(Date.now() - 2 * 864e5);
  await p.getByLabel('Desde').fill(iso(antier));
  await p.getByLabel('Hasta').fill(iso(ayer));
  await p.getByRole('button', { name: 'Calcular' }).click();
  comprobar(await aparece(p.getByText('Total con IVA')), 'vista previa con totales');
  comprobar(await aparece(p.getByRole('cell', { name: /Almacenamiento por m³-día/ })), 'línea de almacenamiento por m³-día');
  comprobar(await aparece(p.locator('.recharts-bar')), 'ocupación día a día en la gráfica');
  await p.getByRole('button', { name: 'Guardar liquidación' }).click();
  comprobar(await aparece(p.getByText(/guardada en borrador/)), 'liquidación guardada');
  await p.getByRole('tab', { name: 'Liquidaciones' }).click();
  await p.getByRole('button', { name: 'Facturar' }).first().click();
  comprobar(await aparece(p.getByText('Factura emitida en el ERP')), 'facturada en el ERP desde la lista');
  comprobar(await aparece(p.getByText('facturada')), 'queda como facturada con su número');

  await p.getByRole('tab', { name: 'Tarifas' }).click();
  await p.getByLabel('Tarifa Despacho por unidad').fill('150');
  await p.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText('Tarifas guardadas')), 'tarifa general editada');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  if (fallos) await p.screenshot({ path: `${SALIDA}/3pl-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
