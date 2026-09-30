/**
 * Prueba en navegador la analítica de confiabilidad de EAM. Necesita una flota
 * con historia: en local se usa la simulada (activos SIM-), cuyos parámetros
 * Weibull se conocen, así que la prueba comprueba también que el ajuste los
 * recupere.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_eam_analitica.cjs
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
const aparece = async (loc, ms = 15000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/eam/analitica') && r.status() >= 400) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });

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
  await p.goto(APP + '/eam/ia', { waitUntil: 'networkidle', timeout: 60000 });

  // Weibull
  const alt = p.locator('.MuiPaper-root', { has: p.getByText('SIM Alternador', { exact: true }) }).first();
  comprobar(await aparece(alt), 'weibull: tarjeta del modo alternador');
  const txt = await alt.innerText();
  const beta = Number((txt.match(/(\d+,\d+)\s*\n\s*Forma β/) || [])[1]?.replace(',', '.'));
  comprobar(beta > 2.6 && beta < 3.5, `weibull: recupera el desgaste simulado (β=3, sale ${beta})`);
  comprobar(/Desgaste/.test(txt) && /Cambiar a los/.test(txt), 'weibull: desgaste con reemplazo recomendado');
  const ele = p.locator('.MuiPaper-root', { has: p.getByText('SIM Falla electrónica', { exact: true }) }).first();
  comprobar(/Aleatoria/.test(await ele.innerText()) && /no reduce fallas/.test(await ele.innerText()), 'weibull: falla electrónica aleatoria, sin reemplazo');
  await alt.getByLabel(/Costo de cambiarla antes/).fill('2400000');
  await alt.getByRole('button', { name: /Recalcular/ }).click();
  comprobar(await aparece(alt.getByText(/más barato usar la pieza hasta que falle/)), 'weibull: con preventivo casi tan caro como la falla, no conviene cambiar');

  // Tendencia
  await p.getByRole('tab', { name: 'Tendencia por equipo' }).click();
  comprobar(await aparece(p.getByText('Equipos analizados')), 'tendencia: se calcula por equipo');

  // Predicción
  await p.getByRole('tab', { name: 'Predicción de fallas' }).click();
  comprobar(await aparece(p.getByText('Modelo elegido'), 60000), 'predicción: entrena y muestra el modelo elegido');
  comprobar(await aparece(p.getByText('Kilómetros recorridos en 30 días')), 'predicción: identifica el uso como factor');
  comprobar(await aparece(p.getByText('¿Se cumple lo que predice?')), 'predicción: muestra la calibración');

  // Anomalías
  await p.getByRole('tab', { name: 'Anomalías' }).click();
  comprobar(await aparece(p.getByRole('button', { name: /Rendimiento \([1-9]/ })), 'anomalías: encuentra rendimientos atípicos');
  await p.getByRole('button', { name: /Costo \(/ }).click();
  comprobar(await aparece(p.getByRole('cell', { name: /^\$/ })), 'anomalías: filtra por costo');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.getByRole('tab', { name: 'Vida por modo de falla' }).click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${SALIDA}/eam-analitica.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Predicción de fallas' }).click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${SALIDA}/eam-prediccion.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
