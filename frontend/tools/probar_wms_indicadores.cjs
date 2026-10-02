/**
 * Prueba en navegador los indicadores del WMS (fase 3) sobre la COPIA que sembró
 * backend/tools/probar_wms_indicadores.py (almacén «PRUEBA-KPI …»).
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
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

  await p.goto(APP + '/wms/indicadores', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/indicadores');
  await p.getByLabel('Almacén').click();
  await p.getByRole('option', { name: /PRUEBA-KPI/ }).last().click();
  const otif = p.getByRole('button', { name: 'Ficha OTIF (a tiempo y completo)' });
  comprobar(await aparece(otif.getByText(/33[.,]33%/)), 'tarjeta OTIF: 33,33 %');
  comprobar(await aparece(p.getByText(/en meta/)), 'resumen del semáforo');
  await otif.click();
  const dlg = p.getByRole('dialog');
  comprobar(await aparece(dlg.getByText(/Órdenes entregadas a tiempo y completas ÷/)), 'ficha: la fórmula');
  comprobar(await aparece(dlg.getByText(/Se evalúa orden por orden/)), 'ficha: cómo se mide, paso a paso');
  await dlg.getByRole('tab', { name: 'Evolución' }).click();
  comprobar(await aparece(dlg.locator('.recharts-line')), 'ficha: la evolución en el tiempo');
  await dlg.getByRole('tab', { name: /Detalle/ }).click();
  comprobar((await dlg.getByRole('row').count()) >= 3, 'ficha: las órdenes que fallaron');
  await dlg.getByRole('button', { name: 'Cerrar' }).click();

  await p.getByRole('tab', { name: 'Productividad por persona' }).click();
  comprobar(await aparece(p.getByRole('cell', { name: /Líneas|Prueba|admin/i })), 'productividad por persona');

  const [descarga] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.getByRole('button', { name: 'Fichas de los indicadores' }).click()]);
  comprobar(descarga.suggestedFilename() === 'fichas-indicadores-wms.xlsx', 'descarga las fichas de los indicadores');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  if (fallos) await p.screenshot({ path: `${SALIDA}/kpi-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
