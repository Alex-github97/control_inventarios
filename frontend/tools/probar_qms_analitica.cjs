/**
 * Prueba en navegador la analítica de calidad de QMS contra los datos de
 * `backend/tools/simular_calidad_qms.py`: Despacho sube, la CAPA de estibas no
 * funcionó y la de facturación sí, y Empaques Norte cae mientras Transportes
 * Sur solo es irregular.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_qms_analitica.cjs
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
  p.on('response', r => { if (r.url().includes('/api/v1/qms/analitica') && r.status() >= 400) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });

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
  await p.goto(APP + '/qms/ia', { waitUntil: 'networkidle', timeout: 60000 });

  // El Tooltip de la etiqueta cambia su nombre accesible por la ayuda («p = …»),
  // así que se lee el texto visible de la fila.
  const fila = (t) => p.locator('tr', { hasText: t }).first();
  await aparece(fila('SIM Despacho'));
  comprobar(/Sube/.test(await fila('SIM Despacho').innerText()), 'tendencias: Despacho sube');
  comprobar(/Estable/.test(await fila('SIM Bodega').innerText()), 'tendencias: Bodega estable');
  comprobar(await aparece(p.getByText('No conformidades por mes')), 'tendencias: carta c mensual');

  await p.getByRole('tab', { name: 'Problemas recurrentes' }).click();
  comprobar(await aparece(p.getByText(/SIM-CAPA-EST: Ineficaz/), 60000), 'recurrentes: la CAPA de estibas sale ineficaz');
  comprobar(await aparece(p.getByText(/SIM-CAPA-FAC: Eficaz/)), 'recurrentes: la CAPA de facturación sale eficaz');
  await p.getByText(/SIM-CAPA-EST: Ineficaz/).first().click();
  comprobar(await aparece(p.getByText(/el problema volvió \d+ veces/)), 'recurrentes: explica las reincidencias');

  await p.getByRole('tab', { name: 'Proveedores' }).click();
  comprobar(await aparece(p.getByRole('row', { name: /SIM Empaques Norte.*En caída.*meses/ })), 'proveedores: Empaques Norte en caída con proyección');
  comprobar(await aparece(p.getByRole('row', { name: /SIM Transportes Sur.*Estable/ })), 'proveedores: Transportes Sur irregular pero sin tendencia');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/qms-proveedores.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Problemas recurrentes' }).click(); await p.waitForTimeout(600);
  await p.screenshot({ path: `${SALIDA}/qms-recurrentes.png`, fullPage: true });
  await p.getByRole('tab', { name: 'Tendencias' }).click(); await p.waitForTimeout(600);
  await p.screenshot({ path: `${SALIDA}/qms-tendencias.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
