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

  // Equivalencias de vehículos (la misma configuración del motor).
  comprobar(await aparece(p.getByText('Equivalencias de vehículos')), 'el informe muestra las equivalencias de vehículos');
  comprobar(await aparece(p.getByText(/TRACTOMULA → 3S2 · .* \(como TRACTOCAMION\)/)), 'TRACTOMULA usa la equivalencia de TRACTOCAMION y lo dice');
  comprobar(await aparece(p.getByText(/TURBO → 2L3 · /)), 'TURBO → 2L3');
  await p.screenshot({ path: `${SALIDA}/equivalencias.png` });
  await p.getByRole('button', { name: 'Editar equivalencias' }).click();
  const dv = p.getByRole('dialog');
  comprobar(await aparece(dv.getByText('Configuración de tipologías de vehículo')), 'abre el mismo editor del motor');
  comprobar(await aparece(dv.getByText(/Los vehículos de las tarifas de clientes son: /)), 'el editor lista los vehículos de los clientes');
  // Guardar queda deshabilitado mientras carga: guardar antes borraba todas las equivalencias.
  await dv.locator('input[value="TRACTOCAMION"]').waitFor({ timeout: 20000 });
  await dv.getByRole('button', { name: 'Guardar configuración' }).click();   // sin cambios: solo recalcula
  comprobar(await aparece(p.getByText('Comparación recalculada'), 120000), 'al guardar recalcula la comparación');

  if (process.env.SICETAC) {
    const [selector] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: 'Cargar SICETAC de Febrero' }).click()]);
    await selector.setFiles(process.env.SICETAC);
    comprobar(await aparece(p.getByText(/Febrero \d{4}: .* rutas SICETAC/), 180000), 'carga el SICETAC de febrero desde la pantalla');
  }

  // Filtro por cliente desde la gráfica.
  const barra = p.getByText('Variación por cliente').locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]')
    .locator('.recharts-bar-rectangle path').first();
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

  // Cascada por mes y horas logísticas (necesita meses de prueba: MESES=1).
  if (process.env.MESES) {
  if (await p.getByRole('button', { name: 'Quitar filtros' }).count()) await p.getByRole('button', { name: 'Quitar filtros' }).click();
  const mes = p.locator('.MuiAutocomplete-root').filter({ has: p.getByLabel('Mes') });
  await mes.locator('input').click();
  for (const nombre of ['Enero 2026', 'Febrero 2026']) {
    const op = p.getByRole('option', { name: nombre });
    if (await op.count() && (await op.getAttribute('aria-selected')) !== 'true') await op.click();
  }
  await p.keyboard.press('Escape');
  await p.waitForTimeout(1500);
  comprobar(await aparece(p.getByText('Cascada por mes: SICETAC frente a tarifa del cliente')), 'muestra la cascada por mes');
  comprobar(await aparece(p.getByText(/^Enero 2026 ·/)) && await aparece(p.getByText(/^Febrero 2026 ·/)), 'una cascada por cada mes elegido');
  await p.getByLabel('Horas logísticas').fill('4');
  await p.waitForTimeout(2500);
  comprobar(await aparece(p.getByText('+4 h logísticas')), 'la cascada agrega el paso de 4 horas logísticas');
  comprobar(await aparece(p.getByText(/no tienen valor de hora logística/)), 'avisa las tarifas sin valor de hora (enero no lo trae)');
  await p.getByRole('button', { name: 'Valor de la hora' }).click();
  const dh = p.getByRole('dialog');
  comprobar(await aparece(dh.getByText(/Traen su propio valor por hora: Febrero 2026/)), 'reconoce que febrero trae su valor por hora');
  await dh.getByLabel('Configuración 3S2').fill('60000');
  await dh.getByLabel('Configuración 2', { exact: true }).fill('35000');
  await dh.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText('Valor de la hora logística guardado')), 'guarda el valor de la hora por vehículo');
  }
  comprobar(await aparece(p.getByLabel('Depto. destino')) && await aparece(p.getByLabel('Frente a SICETAC')), 'filtros de departamento y posición frente a SICETAC');
  // Solo transporte masivo y solo turbos, con los filtros del archivo de tarifas.
  if (await p.getByRole('button', { name: 'Quitar filtros' }).count()) await p.getByRole('button', { name: 'Quitar filtros' }).click();
  const elegir = async (etiqueta, opcion) => {
    await p.locator('.MuiAutocomplete-root').filter({ has: p.getByLabel(etiqueta) }).locator('input').click();
    await p.getByRole('option', { name: opcion, exact: true }).click();
    await p.keyboard.press('Escape');
  };
  await elegir('Tipo de servicio', 'TRANSPORTE MASIVO');
  await elegir('Tipo de tarifa', 'POR TIPO DE VEHICULO TURBO');
  await p.waitForTimeout(2500);
  await p.getByRole('tab', { name: /Rutas comparadas/ }).click();
  const filas = p.locator('table tbody tr');
  const textos = await filas.allInnerTexts();
  comprobar(textos.length > 0 && textos.every(t => t.includes('TURBO') && t.includes('TRANSPORTE MASIVO')),
    `filtro tipo de tarifa + tipo de servicio: solo turbos de transporte masivo (${textos.length} filas)`);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${SALIDA}/tarifax-comparativo.png`, fullPage: true });

  // El motor sigue usando el mismo editor.
  await p.goto(APP + '/tarifax/motor', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Tipolog|Configurar|Editar/ }).first().click();
  comprobar(await aparece(p.getByRole('dialog').getByText('Configuración de tipologías de vehículo')), 'el motor abre el editor compartido');
  await p.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
