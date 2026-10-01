/**
 * Prueba en navegador el POS de punta a punta y el panel de la configuración
 * de la plataforma. Las llamadas a la API se desvían a una COPIA de la base
 * (API_COPIA), porque vender mueve inventario y contabilidad.
 *
 *   APP=... GATEWAY=... API_COPIA=http://ci_backend:8001 EMPRESA=demo USUARIO=... CLAVE=... node probar_pos_modulo.cjs
 *
 * Espera en la copia la caja «PRUEBA-POS Caja 1» con sus productos y precios
 * (los deja probar_pos_api.py) y una resolución agotada: la nueva se crea aquí.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 15000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
const hoy = new Date().toLocaleDateString('en-CA');
const enUnAnio = new Date(Date.now() + 365 * 864e5).toLocaleDateString('en-CA');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  // La impresión del ticket abre otra ventana: que no estorbe.
  ctx.on('page', w => w.close().catch(() => {}));
  if (COPIA) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    const r = await route.fetch({ url: COPIA + u.pathname + u.search });
    await route.fulfill({ response: r });
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

  // 1. La configuración de la plataforma ya no abre el panel de Control de Estibas.
  for (const r of ['/usuarios', '/configuracion', '/catalogos']) {
    await p.goto(APP + r, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(800);
    const cfg = await p.getByText(/^(del Sistema|Settings)$/).count();
    const ce = await p.getByText(/^(Estibas|Pallets?)$/).count();
    comprobar(cfg > 0 && ce === 0, `${r}: panel de Configuración del Sistema, no de Control de Estibas`);
    if (!(cfg > 0 && ce === 0)) await p.screenshot({ path: `${SALIDA}/pos-cfg${r.replace(/\//g, '_')}.png` });
  }

  // 2. Las pantallas del POS cargan y el menú lateral es el del POS.
  for (const r of ['/pos', '/pos/turnos', '/pos/ventas', '/pos/tablero', '/pos/config']) {
    await p.goto(APP + r, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(800);
    const caida = await p.getByText('Esta pantalla no se pudo mostrar').count();
    comprobar(!caida, `carga ${r}`);
    if (caida) await p.screenshot({ path: `${SALIDA}/pos-caida${r.replace(/\//g, '_')}.png` });
  }
  comprobar(await p.getByText(/^(Turnos y arqueo|Shifts & cash count)$/).count() > 0, 'menú lateral del POS');

  // 3. Resolución nueva desde el formulario y asignada a la caja.
  await p.getByRole('tab', { name: 'Resoluciones DIAN' }).click();
  await p.getByRole('button', { name: 'Nueva resolución' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel(/Número de la resolución/).fill('18760000099');
  await dlg.getByLabel(/Fecha de la resolución/).fill(hoy);
  await dlg.getByLabel(/^Prefijo/).fill('UIP');
  await dlg.getByLabel(/Desde el número/).fill('1');
  await dlg.getByLabel(/Hasta el número/).fill('5000');
  await dlg.getByLabel(/Vigente desde/).fill(hoy);
  await dlg.getByLabel(/Vigente hasta/).fill(enUnAnio);
  await dlg.getByRole('button', { name: /Guardar/ }).click();
  comprobar(await aparece(p.getByRole('cell', { name: 'UIP1 – UIP5000' })), 'resolución creada desde el formulario (rango UIP1–UIP5000)');

  await p.getByRole('tab', { name: 'Cajas' }).click();
  await p.getByRole('button', { name: 'Editar PRUEBA-POS Caja 1' }).click();
  await dlg.getByLabel(/Resolución de facturación/).click();
  await p.getByRole('option', { name: /UIP 1–5000/ }).click();
  await dlg.getByRole('button', { name: /Guardar/ }).click();
  comprobar(await aparece(p.getByRole('cell', { name: /UIP 1–5000/ })), 'caja con la resolución nueva');

  // Precios: la tabla muestra el margen.
  await p.getByRole('tab', { name: 'Listas y precios' }).click();
  comprobar(await aparece(p.getByRole('cell', { name: '50%' })), 'listas: margen 50 % de la gaseosa');

  // 4. Abrir turno y vender escaneando.
  await p.goto(APP + '/pos', { waitUntil: 'networkidle' });
  await p.getByLabel('Caja').click();
  await p.getByRole('option', { name: /PRUEBA-POS Caja 1/ }).click();
  await p.getByLabel('Base inicial en efectivo').fill('20000');
  await p.getByRole('button', { name: 'Abrir turno' }).click();
  const buscador = p.getByPlaceholder(/Buscar o escanear/);
  comprobar(await aparece(buscador), 'turno abierto: aparece el mostrador');
  await buscador.fill('7700000000PPA'); await buscador.press('Enter');
  comprobar(await aparece(p.getByRole('button', { name: /Cobrar \$\s?2\.380/ })), 'escáner: el código de barras agrega la gaseosa ($2.380)');
  await buscador.fill('Yogur');
  await p.getByRole('button', { name: 'Agregar PRUEBA-POS Yogur' }).click();
  await p.getByRole('button', { name: /Cobrar \$\s?8\.330/ }).click();
  const cobro = p.getByRole('dialog');
  await cobro.getByLabel('Recibido').fill('10000');
  comprobar(await aparece(cobro.getByText(/1\.670/)), 'cobro: cambio $1.670 de $10.000');
  await cobro.getByRole('button', { name: 'Confirmar venta' }).click();
  comprobar(await aparece(p.getByText(/Factura UIP1/)), 'ticket de la factura UIP1');
  comprobar(await p.getByText(/CUFE: [0-9a-f]{96}/).count() > 0, 'ticket con CUFE');
  await p.getByRole('button', { name: 'Nueva venta' }).click();

  // 5. Devolución de la gaseosa.
  await p.goto(APP + '/pos/ventas', { waitUntil: 'networkidle' });
  const fila = p.getByRole('row').filter({ hasText: 'UIP1' });
  await fila.getByRole('button', { name: 'Devolver' }).click();
  const dev = p.getByRole('dialog');
  await dev.getByLabel(/Devolver \(máx\. 1\)/).first().fill('1');
  await dev.getByLabel('Motivo').fill('No era el sabor');
  comprobar(await aparece(dev.getByText(/A reembolsar: \$\s?2\.380/)), 'devolución: a reembolsar $2.380');
  await dev.getByRole('button', { name: 'Registrar devolución' }).click();
  comprobar(await aparece(fila.getByText('devuelta parcial')), 'venta queda devuelta parcial');

  // 6. Arqueo: 20.000 + 8.330 − 2.380 = 25.950 en efectivo.
  await p.goto(APP + '/pos/turnos', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText(/25\.950/)), 'turno: efectivo esperado $25.950');
  await p.getByRole('button', { name: 'Cerrar turno' }).click();
  const cierre = p.getByRole('dialog');
  await cierre.getByLabel('Contado').first().fill('25950');
  await cierre.getByRole('button', { name: 'Cerrar turno' }).click();
  comprobar(await aparece(p.getByText('No tiene un turno abierto.')), 'turno cerrado y cuadrado');

  await p.goto(APP + '/pos/tablero', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText('PRUEBA-POS Yogur')), 'tablero: el yogur entre lo más vendido');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  if (fallos) await p.screenshot({ path: `${SALIDA}/pos-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
