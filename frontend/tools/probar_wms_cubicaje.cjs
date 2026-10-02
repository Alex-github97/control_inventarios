/**
 * Prueba en navegador el cubicaje (WMS fase 2) sobre una COPIA de la base que ya
 * sembró backend/tools/probar_wms_cubicaje.py. Simula el ESP32: emite su token
 * y manda una medición; la estación tiene que mostrarla sola.
 *
 *   APP=... GATEWAY=... API_COPIA=http://ci_backend:8001 EMPRESA=demo USUARIO=... CLAVE=... node probar_wms_cubicaje.cjs
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
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
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

  await p.goto(APP + '/wms/cubicaje', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/cubicaje');

  // El «ESP32»: token del primer cubicador y una medición de una caja de 20 × 25 × 15 cm.
  const r = await p.evaluate(async () => {
    const h = { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' };
    const equipos = await (await fetch('/api/v1/wms/cubicadores', { headers: h })).json();
    const tok = await (await fetch(`/api/v1/wms/cubicadores/${equipos[0].id}/token`, { method: 'POST', headers: h })).json();
    const med = await fetch('/api/v1/wms/cubicador/lecturas', { method: 'POST',
      headers: { Authorization: `Bearer ${tok.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lecturas: { x: [600, 600, 600, 600, 600], y: [350, 350, 350], z: [550, 550, 550], peso: [3000, 3000] }, firmware: '1.0.0' }) })
    return { estado: med.status, codigo: equipos[0].codigo }
  });
  comprobar(r.estado === 201, 'el equipo manda una medición con su token');
  await p.reload({ waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText('20 × 25 × 15 cm')), 'estación: la medición aparece sola');
  comprobar(await aparece(p.getByText(/Largo: calibrado/)), 'estación: estado de calibración del equipo');
  await p.getByRole('combobox', { name: 'Producto' }).click();
  await p.getByRole('combobox', { name: 'Producto' }).fill('PRUEBA-CUB');
  await p.getByRole('option').first().click();
  await p.getByRole('button', { name: /^Asignar a / }).first().click();
  comprobar(await aparece(p.getByText(/unidad = 20 × 25 × 15 cm/)), 'estación: medición asignada al producto');

  await p.getByRole('tab', { name: 'Productos' }).click();
  await p.getByRole('button', { name: /^Editar PC\d+-A/ }).first().click();
  const dlg = p.getByRole('dialog');
  comprobar(await aparece(dlg.getByText('medido con cubicador')), 'empaques: la unidad dice que la midió el cubicador');
  await dlg.getByRole('button', { name: 'Calcular' }).click();
  comprobar(await aparece(dlg.getByText(/por cama ×/)), 'empaques: calcula el armado de la estiba');
  await dlg.getByRole('button', { name: 'Cerrar' }).click();

  await p.getByRole('tab', { name: 'Ubicaciones' }).click();
  comprobar(await aparece(p.getByText('Utilización cúbica')), 'ubicaciones: utilización cúbica del almacén');
  comprobar(await aparece(p.getByText(/41[.,]7%/)), 'ubicaciones: ocupación de la ubicación medida');

  await p.getByRole('tab', { name: 'Cubicadores' }).click();
  await p.getByRole('button', { name: 'Nuevo token' }).first().click();
  comprobar(await aparece(p.getByText(/no se vuelve a mostrar/)), 'cubicadores: el token se muestra una sola vez');
  await p.getByRole('button', { name: 'Listo' }).click();

  await p.goto(APP + '/wms/config', { waitUntil: 'networkidle' });
  await p.getByRole('tab', { name: 'Ubicaciones' }).click();
  await p.getByRole('button', { name: 'Nuevo' }).first().click();
  comprobar(await aparece(p.getByLabel('Alto libre (cm)')), 'configuración: la ubicación pide sus medidas internas');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  if (fallos) await p.screenshot({ path: `${SALIDA}/cub-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
