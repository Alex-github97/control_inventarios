/**
 * Prueba en navegador la Fase 1 del WMS (trazabilidad). Desvía /api/v1 a una
 * COPIA de la base (API_COPIA) que ya sembró backend/tools/probar_wms_trazable.py.
 *
 *   APP=... GATEWAY=... API_COPIA=http://ci_backend:8001 EMPRESA=demo USUARIO=... CLAVE=... node probar_wms_trazable.cjs
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 15000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, locale: 'es-CO' });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  let etiqueta = false;
  ctx.on('page', w => { etiqueta = true; w.close().catch(() => {}) });
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

  for (const r of ['/wms', '/wms/recepcion', '/wms/inventario', '/wms/tareas', '/wms/estibas', '/wms/picking', '/wms/despacho', '/wms/trazabilidad', '/wms/config']) {
    await p.goto(APP + r, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(700);
    const caida = await p.getByText('Esta pantalla no se pudo mostrar').count();
    comprobar(!caida, `carga ${r}`);
    if (caida) await p.screenshot({ path: `${SALIDA}/wms-caida${r.replace(/\//g, '_')}.png` });
  }

  // Configuración: depositantes.
  await p.getByRole('tab', { name: 'Depositantes' }).click();
  comprobar(await aparece(p.getByRole('cell', { name: 'PRUEBA-WMS Cliente A' })), 'config: depositante 3PL con su resumen');

  // Inventario: la columna de estiba.
  await p.goto(APP + '/wms/inventario', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByRole('cell', { name: /^LPN\d{8}$/ })), 'inventario: muestra la estiba de cada fila');

  // Tareas: ubicar la del reingreso por devolución.
  await p.goto(APP + '/wms/tareas', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText(/Ubicar #\d+/)), 'tareas: la tarea pendiente del reingreso');
  await p.getByRole('button', { name: 'Ubicar' }).first().click();
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Escanee la ubicación donde la deja').fill('PWMS-ALM-03');
  comprobar(await aparece(dlg.getByLabel('¿Por qué no en la sugerida?')), 'tareas: otra ubicación pide el motivo');
  await dlg.getByLabel('Escanee la ubicación donde la deja').fill('');
  await dlg.getByRole('button', { name: 'Usar la sugerida' }).click();
  await dlg.getByRole('button', { name: 'Confirmar' }).click();
  comprobar(await aparece(p.getByText(/Ubicado en PWMS-ALM-0/)), 'tareas: ubicada en la sugerida');
  await p.getByRole('button', { name: 'Historial' }).click();
  comprobar(await aparece(p.getByText(/la hizo en/)), 'tareas: el historial muestra quién y en cuánto tiempo');

  // Estibas: ficha, historia y etiqueta.
  await p.goto(APP + '/wms/estibas', { waitUntil: 'networkidle' });
  await p.getByRole('cell', { name: /^LPN\d{8}$/ }).first().click();
  const ficha = p.getByRole('dialog');
  comprobar(await aparece(ficha.getByRole('cell', { name: /PWMS-/ })), 'estiba: contenido');
  await ficha.getByRole('tab', { name: 'Historia' }).click();
  comprobar(await aparece(ficha.getByRole('cell', { name: /Recepción|Ubicación|Armado/ })), 'estiba: historia de movimientos');
  await ficha.getByRole('button', { name: 'Imprimir etiqueta' }).click();
  await p.waitForTimeout(1500);
  comprobar(etiqueta, 'estiba: abre la etiqueta para imprimir');
  await ficha.getByRole('button', { name: 'Salir' }).click();

  // Trazabilidad: kárdex que cuadra y recorrido del lote.
  await p.goto(APP + '/wms/trazabilidad', { waitUntil: 'networkidle' });
  await p.getByRole('combobox', { name: 'Buscar' }).click();
  await p.getByRole('combobox', { name: 'Buscar' }).fill('PWMS-A');
  await p.getByRole('option', { name: /PWMS-A/ }).first().click();
  comprobar(await aparece(p.getByText('Cuadra', { exact: true })), 'kárdex del producto: cuadra con la existencia');
  comprobar(await aparece(p.getByRole('cell', { name: /PWMS-REC-01 \[LPN\d+\] → PWMS-ALM-0/ })), 'kárdex: muestra la ruta de cada movimiento');
  await p.getByRole('tab', { name: 'Recorrido de lote' }).click();
  await p.getByRole('combobox', { name: 'Lote a rastrear' }).click();
  await p.getByRole('combobox', { name: 'Lote a rastrear' }).fill('PWMS-L1');
  await p.getByRole('option', { name: /PWMS-L1/ }).first().click();
  comprobar(await aparece(p.getByRole('cell', { name: 'PRUEBA-WMS Transportes del Sur' })), 'recorrido: a quién se le entregó el lote');
  comprobar(await aparece(p.getByRole('cell', { name: 'PRUEBA-WMS Lubricantes SAS' })), 'recorrido: de qué proveedor vino');
  comprobar(await aparece(p.getByText('Retenido / inactivo')), 'recorrido: el lote figura retenido');
  await p.getByRole('tab', { name: 'Bitácora de eventos' }).click();
  comprobar(await aparece(p.getByText(/Bitácora de eventos/)), 'bitácora: la pestaña de eventos sigue disponible');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  if (fallos) await p.screenshot({ path: `${SALIDA}/wms-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
