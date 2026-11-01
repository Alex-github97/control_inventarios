/**
 * Prueba en navegador los tableros de llantas: la pila de descarte con sus
 * filtros y el salto a la lista, el histórico con sus conteos, las reglas y
 * sugerencias, el tablero general (marca, referencia, dimensión, I.R. a piso)
 * y el informe PDF de flota (directo y en segundo plano). Pensada para la
 * empresa de prueba de carga.
 *
 *   APP=... GATEWAY=... EMPRESA=carga USUARIO=... CLAVE=... node probar_neumaticos_tableros.cjs
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
const VEHICULO = process.env.VEHICULO || 'TAB001';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const numero = s => Number(String(s).replace(/\./g, '').replace(/[^\d]/g, ''));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, locale: 'es-CO', acceptDownloads: true });
  const p = await ctx.newPage();
  const errores = [], fallidas = [], lentas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/eam/neumaticos') && r.status() >= 400) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  p.on('requestfinished', rq => {
    if (!rq.url().includes('/api/v1/eam/neumaticos')) return
    const ms = rq.timing().responseEnd
    if (ms > 5000) lentas.push(`${(ms / 1000).toFixed(1)} s ${rq.url().split('/api/v1')[1].slice(0, 90)}`)
  });

  // ── Ingreso ──
  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });

  // ── 1. Pila de descarte ──
  await p.goto(APP + '/eam/neumaticos', { waitUntil: 'networkidle', timeout: 120000 });
  await p.getByRole('tab', { name: /Descarte \(/ }).click();
  await p.getByText('Tablero de la pila de descarte', { exact: true }).waitFor({ timeout: 30000 });
  await p.getByText('Por motivo de daño', { exact: true }).waitFor({ timeout: 30000 });
  const total = numero(await p.getByText('Llantas dadas de baja', { exact: true }).locator('..').locator('p').nth(1).innerText());
  comprobar(total > 1000, `el tablero cuenta las bajas (${total})`);
  const motivos = p.getByRole('button', { name: /^Ver las bajas por / });
  comprobar(await motivos.count() >= 3, `muestra los motivos de daño del catálogo (${await motivos.count()})`);
  comprobar(await p.getByText('Daños por marca', { exact: true }).isVisible() && await p.getByText('Daños por referencia', { exact: true }).isVisible(), 'muestra los cruces por marca y por referencia');
  comprobar(await p.getByText('I.R. del descarte', { exact: true }).isVisible(), 'muestra el I.R. del descarte');
  await p.screenshot({ path: `${SALIDA}/tab_descarte.png`, fullPage: true });

  // Pulsar el motivo principal filtra la lista y el total cuadra.
  const primero = motivos.first();
  const textoMotivo = await primero.innerText();
  const cantMotivo = numero(textoMotivo.split('\n').pop().split('·')[0]);
  await primero.click();
  await p.getByText(/Lista filtrada · Daño:/).waitFor({ timeout: 15000 });
  await p.waitForTimeout(1500);
  const pie = await p.locator('.MuiTablePagination-displayedRows').last().innerText();
  comprobar(numero(pie.split('de').pop()) === cantMotivo, `la lista del motivo cuadra con el tablero (${cantMotivo} = ${pie})`);

  // Filtro por año de fabricación (sale del DOT).
  const antes = total;
  const anio = p.getByLabel('Año de fabricación');
  await anio.click();
  await p.getByRole('option').nth(1).click();
  await p.keyboard.press('Escape');
  await p.waitForFunction(n => {
    const el = [...document.querySelectorAll('p')].find(x => x.textContent === 'Llantas dadas de baja')
    const v = el?.parentElement?.querySelectorAll('p')[1]?.textContent ?? ''
    return Number(v.replace(/\./g, '').replace(/\D/g, '')) < n
  }, antes, { timeout: 20000 }).catch(() => {});
  const filtrado = numero(await p.getByText('Llantas dadas de baja', { exact: true }).locator('..').locator('p').nth(1).innerText());
  comprobar(filtrado < antes && filtrado > 0, `el filtro de año de fabricación recalcula el tablero (${antes} → ${filtrado})`);

  // ── 2. Histórico con conteos ──
  await p.locator('table tbody tr').filter({ has: p.locator('button') }).first().locator('button').last().click();
  await p.getByLabel('Resumen del historial').waitFor({ timeout: 15000 });
  const resumen = await p.getByLabel('Resumen del historial').innerText();
  comprobar(/\d+ inspecciones/.test(resumen) && /\d+ rotaciones/.test(resumen), `el histórico muestra inspecciones y rotaciones (${resumen.replace(/\n/g, ' · ').slice(0, 120)})`);
  await p.getByRole('button', { name: /inspecciones/ }).click();
  await p.getByText('Solo inspecciones').waitFor({ timeout: 10000 });
  comprobar(await p.getByRole('columnheader', { name: 'Centro' }).isVisible(), 'pulsar el conteo muestra solo las inspecciones');
  await p.screenshot({ path: `${SALIDA}/historial_conteos.png` });
  await p.keyboard.press('Escape');

  // ── 3. Reglas de sugerencia ──
  await p.getByRole('tab', { name: /Configuración/ }).click();
  await p.getByText('Reglas de sugerencia', { exact: true }).waitFor({ timeout: 15000 });
  for (const r of ['Retirar por profundidad mínima', 'Ajustar presión', 'Revisar alineación o rotar']) {
    comprobar(await p.getByText(r, { exact: true }).isVisible(), `regla inicial «${r}»`);
  }
  comprobar(await p.getByText('Umbrales de novedad', { exact: true }).isVisible(), 'umbrales de novedad en Configuración');
  await p.getByRole('button', { name: 'Nueva regla' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Nombre', { exact: true }).fill('ZZ Reencauchar pronto');
  await dlg.getByLabel('Texto de la sugerencia').fill('Programar reencauche de la {posicion} ({profundidad} mm)');
  await dlg.getByLabel(/^Valor/).first().fill('6');
  await dlg.getByRole('button', { name: 'Vista previa' }).click();
  await dlg.getByText(/Hoy la cumplen/).waitFor({ timeout: 30000 });
  comprobar(true, 'la vista previa dice cuántas llantas cumplen la regla');
  await p.screenshot({ path: `${SALIDA}/regla_nueva.png` });
  await dlg.getByRole('button', { name: 'Guardar' }).click();
  await p.getByText('ZZ Reencauchar pronto', { exact: true }).first().waitFor({ timeout: 15000 });
  comprobar(true, 'la regla nueva queda en la lista');

  // ── 4. Sugerencias en el vehículo ──
  await p.screenshot({ path: `${SALIDA}/antes_vehiculo.png` });
  await p.getByRole('tab', { name: /Llantas por Vehículo/ }).click({ timeout: 60000 });
  const selector = p.getByPlaceholder(/Buscar por placa, código/);
  await selector.click();
  await selector.fill(VEHICULO);
  await p.getByRole('option').filter({ hasText: VEHICULO }).first().click();
  await p.getByText('Sugerencias según la última inspección', { exact: true }).waitFor({ timeout: 30000 });
  const sug = p.getByLabel('Sugerencias del vehículo');
  await sug.scrollIntoViewIfNeeded();
  const textoSug = await sug.innerText();
  comprobar(/Programar reencauche|Revisar alineación|Retirar|Ajustar/.test(textoSug), 'el vehículo muestra sugerencias generadas por las reglas');
  const item = sug.locator('p', { hasText: /Programar reencauche|Revisar alineación|Retirar|Ajustar/ }).first();
  if (await item.count()) {
    await item.hover();
    comprobar(await p.getByText(/^Regla: /).first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false), 'al pasar el cursor se ve la regla que la generó');
  }
  await p.screenshot({ path: `${SALIDA}/sugerencias_vehiculo.png`, fullPage: true });

  // Borrar la regla de prueba.
  await p.getByRole('tab', { name: /Configuración/ }).click();
  p.once('dialog', d => d.accept());
  await p.getByRole('button', { name: 'Eliminar ZZ Reencauchar pronto' }).click();
  await p.getByText('ZZ Reencauchar pronto', { exact: true }).waitFor({ state: 'detached', timeout: 15000 });

  // ── 5. Tablero general ──
  await p.goto(APP + '/eam/neumaticos/reportes', { waitUntil: 'networkidle', timeout: 120000 });
  await p.getByText('Tablero de rendimiento', { exact: true }).first().click();
  await p.getByText('I.R. a piso').first().waitFor({ timeout: 90000 });
  for (const t of ['Por marca', 'Por referencia', 'Por dimensión', 'A piso por marca', 'A piso por referencia', 'A piso por dimensión']) {
    comprobar(await p.getByText(t, { exact: true }).first().isVisible({ timeout: 60000 }).catch(() => false), `tablero general: «${t}»`);
  }
  const irAntes = await p.getByText('I.R. a piso').first().locator('../..').innerText();
  await p.getByLabel('Dimensión').click();
  await p.getByRole('option').nth(1).click();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(4000);
  const irDespues = await p.getByText('I.R. a piso').first().locator('../..').innerText();
  comprobar(irAntes !== irDespues, 'el filtro de dimensión recalcula el I.R. a piso');
  await p.screenshot({ path: `${SALIDA}/tablero_general.png`, fullPage: true });

  // ── 6. Informe PDF de flota ──
  await p.getByText('Estado actual de la flota', { exact: true }).first().click();
  await p.getByRole('button', { name: 'Informe PDF' }).waitFor({ timeout: 30000 });
  // Un vehículo: descarga directa.
  await p.getByLabel('Vehículo', { exact: true }).click();
  await p.getByRole('option').nth(1).click();
  let descarga = p.waitForEvent('download', { timeout: 60000 });
  await p.getByRole('button', { name: 'Informe PDF' }).click();
  let d = await descarga;
  comprobar(/\.pdf$/.test(d.suggestedFilename()), `informe de un vehículo descargado (${d.suggestedFilename()})`);
  // Todos los remolques: más de 200, se prepara en segundo plano.
  await p.getByRole('button', { name: 'Limpiar' }).click();
  await p.getByLabel('Tipo de vehículo').click();
  await p.getByRole('option', { name: 'Remolque' }).click();
  descarga = p.waitForEvent('download', { timeout: 240000 });
  await p.getByRole('button', { name: 'Informe PDF' }).click();
  comprobar(await p.getByText(/Preparando el informe de [\d.]+ vehículos/).first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false), 'una flota grande avisa que se prepara en segundo plano');
  d = await descarga;
  comprobar(/\.pdf$/.test(d.suggestedFilename()), `informe encolado descargado al terminar (${d.suggestedFilename()})`);
  await d.saveAs(`${SALIDA}/informe_remolques.pdf`);

  lentas.forEach(l => console.log('   lenta:', l));
  comprobar(fallidas.length === 0, `sin errores de la API ${fallidas.join(' · ')}`);
  comprobar(errores.length === 0, `sin errores de página ${errores.join(' · ')}`);
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
