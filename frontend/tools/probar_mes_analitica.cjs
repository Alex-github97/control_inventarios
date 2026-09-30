/**
 * Prueba en navegador la analítica de planta de MES contra la planta simulada
 * (`backend/tools/simular_planta_mes.py`), cuyos efectos se conocen: el operario
 * 3 y el producto B desperdician más, el turno no influye, el equipo 2 se
 * desgasta y la línea 1 perdió rendimiento el último mes.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_mes_analitica.cjs
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
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/mes/analitica') && r.status() >= 400) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });
  comprobar(true, 'sesión iniciada');
  await p.goto(APP + '/mes/ia', { waitUntil: 'networkidle', timeout: 60000 });

  // SPC
  comprobar(await aparece(p.getByText("Carta p' de Laney").first()), 'spc: carta de desperdicio con Laney');
  await p.getByRole('button', { name: 'OEE por turno' }).click();
  const l1 = p.locator('.MuiPaper-root', { has: p.getByText('SIM Línea 1', { exact: true }) }).first();
  comprobar(await aparece(l1.getByText(/señales de/)), 'spc: la carta de OEE de la línea 1 da señales');
  await p.getByRole('button', { name: 'Defectos en inspección' }).click();
  comprobar(await aparece(p.getByText('Defectos en inspección', { exact: true })), 'spc: carta de inspección');

  // Pérdidas
  await p.getByRole('tab', { name: 'Pérdidas de OEE' }).click();
  const pl1 = p.locator('.MuiPaper-root', { has: p.getByText('SIM Línea 1', { exact: true }) }).first();
  await aparece(pl1.getByText('Qué explica el cambio'));
  const t = await pl1.innerText();
  const rend = Number((t.match(/Rendimiento:\s*(\d+)\s*%/) || [])[1]);
  comprobar(rend >= 80, `pérdidas: la caída de la línea 1 la explica el rendimiento (${rend} %)`);

  // Paradas
  await p.getByRole('tab', { name: 'Paradas' }).click();
  comprobar(await aparece(p.getByRole('row', { name: /SIM Cambio de referencia/ }), 60000), 'paradas: Pareto con la causa principal');
  comprobar(await aparece(p.getByRole('row', { name: /SIM Equipo 2.*Se desgasta/ })), 'paradas: el equipo 2 se desgasta');
  comprobar(await aparece(p.getByText('Modelo elegido')), 'paradas: modelo de aprendizaje automático calificado');

  // Desperdicio
  await p.getByRole('tab', { name: 'Qué explica el desperdicio' }).click();
  comprobar(await aparece(p.getByText(/Operario SIM Operario 3/).first()), 'desperdicio: encuentra al operario sembrado');
  comprobar(await aparece(p.getByText(/Producto SIM Producto B/).first()), 'desperdicio: encuentra al producto sembrado');
  const alertas = await p.locator('.MuiAlert-message').allInnerTexts();
  comprobar(!alertas.some(a => /^Turno/.test(a)), 'desperdicio: el turno no sale como causa');
  comprobar(alertas.filter(a => /de desperdicio frente a/.test(a)).length === 2, 'desperdicio: sin efecto espejo (solo los dos sembrados)');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/mes-desperdicio.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Paradas' }).click(); await p.waitForTimeout(800);
  await p.screenshot({ path: `${SALIDA}/mes-paradas.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Control estadístico' }).click(); await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'OEE por turno' }).click(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${SALIDA}/mes-spc.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Pérdidas de OEE' }).click(); await p.waitForTimeout(800);
  await p.screenshot({ path: `${SALIDA}/mes-perdidas.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
