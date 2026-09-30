/**
 * Prueba en navegador la configuración de TMS: zonas guardadas en el servidor
 * y cruzadas con los viajes, tipos de servicio con su uso y la tolerancia de
 * puntualidad. Deja todo como estaba: borra la zona y devuelve la tolerancia.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_tms_config.cjs
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
const aparece = async (loc, ms = 8000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/tms') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
  p.on('dialog', d => d.accept());

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
  await p.goto(APP + '/tms/config', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1200);
  const dlg = () => p.getByRole('dialog').last();

  // Zonas
  const sinZonaAntes = await p.getByText(/no caen en ninguna zona/).count() ? await p.getByRole('alert').innerText() : '';
  await p.getByRole('button', { name: 'Nueva zona' }).click();
  await dlg().getByLabel(/^Zona/).fill('PRUEBA-TMS Centro');
  await dlg().getByLabel(/^Ciudades/).fill('bogota, Soacha');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText('Zona registrada')), 'zonas: se guarda en el servidor');
  const fila = p.getByRole('row', { name: /PRUEBA-TMS Centro/ });
  await aparece(fila);
  const celdas = await fila.getByRole('cell').allInnerTexts();
  comprobar(Number(celdas[3]) > 0 || !/Bogot/.test(sinZonaAntes), `zonas: cuenta los viajes de Bogotá sin importar la tilde (${celdas[3]})`);
  comprobar(!(await p.getByText(/no caen en ninguna zona:.*Bogot/).count()), 'zonas: Bogotá deja de figurar sin zona');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-TMS Centro/ })), 'zonas: sigue ahí al recargar');
  await p.getByRole('button', { name: 'Retirar PRUEBA-TMS Centro' }).click();
  comprobar(await aparece(p.getByText('Zona retirada')), 'zonas: se retira');

  // Tipos de servicio
  await p.getByRole('tab', { name: 'Tipos de servicio' }).click();
  comprobar(await aparece(p.getByRole('row', { name: /Terrestre nacional/ })), 'servicios: lista los tipos del sistema con su uso');

  // Parámetros
  await p.getByRole('tab', { name: 'Parámetros' }).click();
  const tol = p.getByLabel(/Tolerancia de puntualidad/);
  await tol.waitFor();
  const original = await tol.inputValue();
  await tol.fill('5000');
  comprobar(await p.getByRole('button', { name: 'Guardar parámetros' }).isDisabled(), 'parámetros: fuera de rango no se guarda');
  await tol.fill('30');
  await p.getByRole('button', { name: 'Guardar parámetros' }).click();
  comprobar(await aparece(p.getByText('Parámetros guardados')), 'parámetros: guarda la tolerancia');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.getByRole('tab', { name: 'Parámetros' }).click();
  comprobar(await p.getByLabel(/Tolerancia de puntualidad/).inputValue() === '30', 'parámetros: persiste al recargar');
  await p.getByLabel(/Tolerancia de puntualidad/).fill(original);
  await p.getByRole('button', { name: 'Guardar parámetros' }).click();
  await aparece(p.getByText('Parámetros guardados'));

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/tms-config.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
