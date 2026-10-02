/**
 * Prueba en navegador, sobre la COPIA, las pantallas del flujo integrado:
 * traslados en tránsito (crear y recibir), despachos con su factura, y la
 * factura de proveedor ligada a una recepción del WMS.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
const X = `PB${Date.now() % 100000}`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  if (COPIA) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    await route.fulfill({ response: await route.fetch({ url: COPIA + u.pathname + u.search }) });
  });

  await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(process.env.EMPRESA || 'demo'); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const c = p.locator('input[type="password"]');
  await c.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
  await c.fill(process.env.CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await c.waitFor({ state: 'detached', timeout: 60000 });
  const api = (m, r, cu) => p.evaluate(async ([m, r, cu]) => {
    const res = await fetch('/api/v1' + r, { method: m, body: cu ? JSON.stringify(cu) : undefined,
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } })
    return res.json()
  }, [m, r, cu]);

  // Montaje por API: dos almacenes con existencias y una recepción contra OC.
  const bod = await api('POST', '/wms/almacenes/', { codigo: `${X}B`, nombre: `${X} Bodega`, ciudad: 'Bogotá D.C.' });
  const tda = await api('POST', '/wms/almacenes/', { codigo: `${X}T`, nombre: `${X} Tienda`, ciudad: 'Cali' });
  const U = {};
  for (const [alm, k, tipo] of [[bod, 'B', 'ALMACENAMIENTO'], [tda, 'T', 'ALMACENAMIENTO'], [tda, 'C', 'CUARENTENA']]) {
    const z = await api('POST', '/wms/zonas/', { almacen_id: alm.id, codigo: `${X}${k}Z`, nombre: tipo, tipo });
    U[k] = (await api('POST', '/wms/ubicaciones/', { zona_id: z.id, codigo: `${X}${k}-01` })).id;
  }
  const prov = await api('POST', '/wms/proveedores/', { codigo: `${X}P`, nombre: `${X} Proveedor SAS`, nit: '900777666' });
  const prod = await api('POST', '/wms/productos/', { sku: `${X}-ACE`, nombre: `${X} Aceite`, tarifa_iva: 19 });
  const oc = await api('POST', '/wms/ordenes-compra/', { proveedor_id: prov.id, almacen_id: bod.id, detalles: [{ producto_id: prod.id, cantidad_solicitada: 20, precio_unitario: 50000 }] });
  const rec = await api('POST', '/wms/recepciones/', { tipo: 'CONTRA_OC', orden_compra_id: oc.id, almacen_id: bod.id, detalles: [
    { producto_id: prod.id, cantidad_esperada: 20, cantidad_recibida: 20, ubicacion_id: U.B, estado_calidad: 'APROBADO' }] });
  await api('POST', `/wms/recepciones/${rec.id}/completar`);

  // 1. Traslado desde la pantalla.
  await p.goto(APP + '/wms/traslados', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText('Traslados entre almacenes')), 'la pantalla de traslados abre');
  await p.getByRole('button', { name: 'Nuevo traslado' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Sale de').click(); await p.getByRole('option', { name: `${X} Bodega` }).click();
  await dlg.getByLabel('Va a').click(); await p.getByRole('option', { name: `${X} Tienda` }).click();
  await dlg.getByLabel('Producto y ubicación de origen').click();
  await p.getByRole('option', { name: new RegExp(`${X}-ACE`) }).click();
  await dlg.getByLabel('Cantidad').fill('8');
  await dlg.getByRole('button', { name: 'Despachar traslado' }).click();
  comprobar(await aparece(p.getByText(/en tránsito · viaje TRAS-/)), 'al despachar: en tránsito y con su viaje del TMS');
  const det = p.getByRole('dialog');
  comprobar(await aparece(det.getByRole('button', { name: new RegExp(`Recibir en ${X} Tienda`) })), 'el detalle ofrece recibir en el destino');
  await det.getByLabel(`Llegó de ${X}-ACE`).fill('7');
  await det.getByRole('button', { name: new RegExp(`Recibir en ${X} Tienda`) }).click();
  comprobar(await aparece(p.getByText(/faltante de 1 und/)), 'recibir con una unidad de menos avisa el faltante (merma)');
  comprobar(await aparece(det.getByText('recibido')), 'el traslado queda recibido');
  await p.screenshot({ path: `${SALIDA}/traslado.png`, fullPage: true });
  await det.getByRole('button', { name: 'Cerrar' }).click();
  const inv = await api('GET', `/wms/inventario/?almacen_id=${tda.id}`);
  comprobar(inv.filter(x => x.producto_id === prod.id).reduce((s, x) => s + x.cantidad_disponible, 0) === 7, 'la tienda tiene las 7 que llegaron');

  // 2. Baja desde cuarentena en el ajuste de inventario (por API: el formulario se revisa en pantalla abajo).
  await api('POST', '/wms/inventario/ajuste/', { producto_id: prod.id, ubicacion_id: U.C, cantidad_nueva: 1, motivo: 'Llegó golpeado', estado: 'BLOQUEADO' });
  await p.goto(APP + '/wms/inventario', { waitUntil: 'networkidle' });
  const tabAjuste = p.getByRole('tab', { name: /Ajuste/ });
  if (await tabAjuste.count()) await tabAjuste.first().click();
  comprobar(await aparece(p.getByLabel('Qué se ajusta')), 'el ajuste deja elegir disponible o retenido (cuarentena)');

  // 3. Despachos: la columna de factura.
  await p.goto(APP + '/wms/despacho', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByRole('columnheader', { name: 'Factura' })), 'despachos muestra la columna de factura');

  // 4. ERP: factura de proveedor ligada a la recepción.
  await p.goto(APP + '/erp/cxp', { waitUntil: 'networkidle' });
  const nueva = p.getByRole('button', { name: /Registrar factura|Nueva factura|Registrar Factura/i });
  await nueva.first().click();
  const fd = p.getByRole('dialog');
  await fd.getByLabel('Mercancía recibida en el WMS (opcional)').click();
  await p.getByRole('option', { name: new RegExp(rec.numero_recepcion) }).click();
  comprobar(await aparece(fd.getByText(/Salda \$\s?1\.000\.000/)), 'elegir la recepción trae su valor: salda $ 1.000.000 por facturar');
  comprobar(await fd.getByLabel('Nombre Proveedor *').inputValue() === `${X} Proveedor SAS`, 'y llena el proveedor');
  await fd.getByLabel('Número Proveedor *').fill(`FE-${X}`);
  await fd.getByLabel('Fecha *').fill(new Date().toISOString().slice(0, 10));
  await fd.getByLabel('IVA', { exact: true }).fill('190000');
  await fd.getByLabel('Total *', { exact: true }).fill('1190000');
  await fd.getByRole('button', { name: /Registrar|Guardar/ }).last().click();
  comprobar(await aparece(p.getByText('Factura registrada')), 'factura de proveedor registrada');
  const pend = await api('GET', '/erp/cxp/recepciones-por-facturar');
  comprobar(!pend.some(x => x.id === rec.id), 'la recepción sale de «por facturar»');
  await p.screenshot({ path: `${SALIDA}/cxp.png`, fullPage: true });

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
