/**
 * Prueba en navegador la analítica de riesgo de GRC contra los datos de
 * `backend/tools/simular_riesgo_grc.py`: Almacenamiento subestimado con su
 * control en duda, Compras sin riesgos, Tecnología crítica sin incidentes y
 * Transporte con incidentes al alza.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_grc_analitica.cjs
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
  p.on('response', r => { if (r.url().includes('/api/v1/grc/analitica') && r.status() >= 400) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });

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
  await p.goto(APP + '/grc/ia', { waitUntil: 'networkidle', timeout: 60000 });

  const fila = (t) => p.locator('tr', { hasText: t }).first();
  await aparece(p.getByText('Incidentes por mes'));
  comprobar(/Sube/.test(await fila('SIM Transporte').innerText()), 'incidentes: Transporte sube');
  comprobar(await aparece(p.getByText('¿Cuánto tarda en resolverse?')), 'incidentes: curva de resolución');
  comprobar(await aparece(p.getByText(/de los resueltos/)), 'incidentes: abiertos comparados contra los resueltos');
  comprobar(await aparece(p.getByText('Robo de mercancía en bodega principal').or(p.getByText('Hurto de cajas en la bodega principal'))), 'incidentes: agrupa los que se repiten');

  await p.getByRole('tab', { name: '¿La matriz acierta?' }).click();
  await aparece(fila('SIM Almacenamiento'));
  comprobar(/Riesgo subestimado/.test(await fila('SIM Almacenamiento').innerText()), 'matriz: Almacenamiento subestimado');
  comprobar(/Sin riesgos registrados/.test(await fila('SIM Compras').innerText()), 'matriz: Compras sin riesgos');
  comprobar(/Crítico sin incidentes/.test(await fila('SIM Tecnología').innerText()), 'matriz: Tecnología crítica sin incidentes');
  comprobar(/Coherente/.test(await fila('SIM Transporte').innerText()), 'matriz: Transporte coherente');
  comprobar(await aparece(p.getByText('SIM Control de acceso a bodega')), 'matriz: el control «efectivo» queda en duda');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/grc-matriz.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Incidentes' }).click(); await p.waitForTimeout(700);
  await p.screenshot({ path: `${SALIDA}/grc-incidentes.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
