/**
 * Prueba en navegador el tablero comparativo SICETAC vs tarifa del cliente.
 * Necesita las negociaciones cargadas. Carga un mes de SICETAC desde la
 * pantalla (variable SICETAC con la ruta del archivo dentro del contenedor).
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 30000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', async r => { if (r.url().includes('/sicetac/') && r.status() >= 400) console.log('rechazo:', r.status(), (await r.text()).slice(0, 400)) })
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });

  if (process.env.API) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    // continue() reenvía la petición original con su cuerpo intacto (fetch+fulfill pierde el archivo de un formulario).
    await route.continue({ url: process.env.API + u.pathname + u.search });
  });
  await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  // Los rótulos del ingreso no son <label> asociados: se ubica el campo por tipo.
  if (await p.getByText('Ingrese a su empresa').count()) {
    await p.locator('input:visible').first().fill(process.env.EMPRESA || 'demo');
    await p.getByRole('button', { name: /Continuar/i }).click();
  }
  const c = p.locator('input[type="password"]');
  await c.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
  await c.fill(process.env.CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await c.waitFor({ state: 'detached', timeout: 60000 });

  await p.goto(APP + '/tarifax/comparativo', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText('Comparativo SICETAC vs tarifa del cliente')), 'el tablero abre');
  comprobar(await aparece(p.getByText('Variación vs SICETAC')), 'muestra la variación contra SICETAC');
  comprobar(await aparece(p.getByText('Variación por cliente')), 'muestra la gráfica por cliente');
  comprobar(await aparece(p.getByRole('tab', { name: /Rutas comparadas/ })), 'muestra el detalle de rutas');

  // Los 12 meses con su botón de cargue.
  await p.getByText('Cargue de datos').click();
  for (const m of ['Enero', 'Junio', 'Diciembre'])
    comprobar(await aparece(p.getByRole('button', { name: `Cargar SICETAC de ${m}` })), `botón de cargue de ${m}`);

  if (process.env.SICETAC) {
    const [selector] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: 'Cargar SICETAC de Febrero' }).click()]);
    await selector.setFiles(process.env.SICETAC);
    comprobar(await aparece(p.getByText(/Febrero \d{4}: .* rutas SICETAC/), 180000), 'carga el SICETAC de febrero desde la pantalla');
  }

  // Filtro por cliente desde la gráfica.
  const barra = p.locator('.recharts-bar-rectangle').first();
  if (await barra.count()) {
    await barra.click();
    await p.waitForTimeout(1500);
    comprobar((await p.getByLabel('Cliente').locator('xpath=ancestor::div[contains(@class,"MuiAutocomplete-root")]').locator('.MuiChip-root').count()) === 1,
      'clic en una barra filtra ese cliente');
  }
  await p.getByRole('tab', { name: /Sin referencia SICETAC/ }).click();
  comprobar(await aparece(p.getByText(/no se pudieron comparar/)), 'explica las rutas sin referencia');
  await p.getByRole('button', { name: 'Equivalencias de ciudades' }).click();
  comprobar(await aparece(p.getByRole('dialog').locator('input[value="BOGOTA, D.C."]')), 'equivalencias de ciudades editables');
  await p.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await p.getByRole('tab', { name: /Rutas comparadas/ }).click();
  await p.screenshot({ path: `${SALIDA}/tarifax-comparativo.png`, fullPage: true });

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
