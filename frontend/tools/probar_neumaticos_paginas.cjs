/**
 * Prueba en navegador las listas de llantas que ahora pagina el servidor:
 * descarte, consulta general, bitácora de movimientos e indicadores. Pensada
 * para la empresa de prueba de carga (decenas de miles de llantas).
 *
 *   APP=... GATEWAY=... EMPRESA=carga USUARIO=admin CLAVE=... node probar_neumaticos_paginas.cjs
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const numero = s => Number(String(s).replace(/\./g, '').replace(/[^\d]/g, ''));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 }, locale: 'es-CO' })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/eam/neumaticos') && r.status() >= 400) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  const lentas = [];
  p.on('requestfinished', async rq => {
    if (!rq.url().includes('/api/v1/')) return
    const t = rq.timing(); const ms = t.responseEnd
    let kb = 0; try { kb = Math.round(((await rq.sizes()).responseBodySize) / 1024) } catch {}
    if (ms > 1500 || kb > 2000) lentas.push(`${(ms / 1000).toFixed(1)} s ${kb} KB ${rq.url().split('/api/v1')[1]}`)
  });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });

  const t0 = Date.now();
  await p.goto(APP + '/eam/neumaticos', { waitUntil: 'networkidle', timeout: 120000 });
  console.log(`-- la página de llantas cargó en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  lentas.forEach(l => console.log('   lenta:', l));

  // Descarte: el total viene del servidor, la tabla trae una página
  const tabDesc = p.getByRole('tab', { name: /Descarte \(/ });
  await p.waitForFunction(() => /Descarte \([1-9]/.test(document.body.innerText), null, { timeout: 30000 });
  const totalDesc = numero((await tabDesc.innerText()).match(/\(([\d.]+)\)/)[1]);
  comprobar(totalDesc > 1000, `pestaña de descarte con el total del servidor (${totalDesc})`);
  await tabDesc.click();
  await p.getByText(/1–100 de/).first().waitFor({ timeout: 20000 });
  const filas = await p.locator('table tbody tr').count();
  comprobar(filas === 100, `descarte pinta una página de 100 filas (${filas})`);
  await p.getByRole('button', { name: /next page|siguiente/i }).first().click();
  comprobar(await p.getByText(/101–200 de/).first().isVisible({ timeout: 15000 }).catch(() => false) ||
            await p.getByText(/101–200 de/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false),
            'descarte: la página siguiente trae 101–200');
  await p.getByPlaceholder(/Buscar código, marca, medida, proveedor/).fill('LL-00001');
  await p.waitForFunction(() => /de (\d{1,3})\b(?!\.)/.test([...document.querySelectorAll('.MuiTablePagination-displayedRows')].map(e => e.textContent).join(' ')), null, { timeout: 20000 }).catch(() => {});
  const pieDesc = await p.locator('.MuiTablePagination-displayedRows').first().innerText();
  comprobar(numero(pieDesc.split('de')[1]) < totalDesc, `descarte: la búsqueda filtra en el servidor (${pieDesc})`);
  await p.screenshot({ path: `${SALIDA}/neu_descarte.png` });

  // Consulta general
  await p.getByRole('tab', { name: /Consultas/ }).click();
  await p.getByText(/Consulta general de llantas \([1-9][\d.]*\)/).waitFor({ timeout: 30000 });
  const totalCons = numero((await p.getByText(/Consulta general de llantas/).innerText()).match(/\(([\d.]+)\)/)[1]);
  comprobar(totalCons > 50000, `consulta general cuenta todas las llantas, también las de baja (${totalCons})`);
  comprobar(await p.locator('table tbody tr').count() <= 100, 'consulta general pinta solo una página');
  await p.screenshot({ path: `${SALIDA}/neu_consulta.png` });

  // Bitácora
  await p.getByRole('tab', { name: /Movimientos/ }).click();
  await p.getByText(/[\d.]+ movimientos/).waitFor({ timeout: 30000 });
  const totalMov = numero(await p.getByText(/[\d.]+ movimientos/).first().innerText());
  comprobar(totalMov > 100000, `bitácora con el total de movimientos (${totalMov})`);
  await p.getByPlaceholder(/Buscar llanta, vehículo, técnico/).fill('LL-0000016');
  await p.waitForFunction(n => {
    const m = document.body.innerText.match(/([\d.]+) movimientos/); return m && Number(m[1].replace(/\./g, '')) < n
  }, totalMov, { timeout: 20000 }).catch(() => {});
  const filtrados = numero(await p.getByText(/[\d.]+ movimientos/).first().innerText());
  comprobar(filtrados > 0 && filtrados < 100, `bitácora: la búsqueda de una llanta trae toda su historia (${filtrados})`);
  await p.screenshot({ path: `${SALIDA}/neu_bitacora.png` });

  // Indicadores
  await p.getByRole('tab', { name: /Indicadores/ }).click();
  await p.getByText(/Costo por km \(CPK\)/).waitFor({ timeout: 30000 });
  await p.getByText(/1–100 de/).first().waitFor({ timeout: 30000 });
  const pieInd = await p.locator('.MuiTablePagination-displayedRows').first().innerText();
  comprobar(/1–100 de/.test(pieInd), `indicadores paginados (${pieInd})`);

  comprobar(fallidas.length === 0, `sin errores de la API ${fallidas.join(' · ')}`);
  comprobar(errores.length === 0, `sin errores de página ${errores.join(' · ')}`);
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
