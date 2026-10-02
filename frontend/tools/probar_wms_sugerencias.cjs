/**
 * Prueba en navegador la fase 4 del WMS (slotting, olas, empaque, maquila) sobre
 * la COPIA que sembraron probar_wms_slotting.py, probar_wms_olas.py y
 * probar_wms_empaque_maquila.py.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const COPIA = process.env.API_COPIA;
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  let ventana = false;
  ctx.on('page', w => { ventana = true; w.close().catch(() => {}) });
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

  const api = (metodo, ruta, cuerpo) => p.evaluate(async ([m, r, c]) => {
    const res = await fetch('/api/v1' + r, { method: m, body: c ? JSON.stringify(c) : undefined,
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } })
    return res.json()
  }, [metodo, ruta, cuerpo]);
  const almacenes = await api('GET', '/wms/almacenes/');
  const ultimo = prefijo => almacenes.filter(a => a.nombre.startsWith(prefijo)).sort((x, y) => y.id - x.id)[0];
  const elegirAlmacen = async nombre => {
    await p.getByLabel('Almacén').first().click();
    await p.getByRole('option', { name: nombre }).click();
  };

  // ── Slotting ──
  const slot = ultimo('PRUEBA-SLOT');
  await p.goto(APP + '/wms/slotting', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/slotting');
  await elegirAlmacen(slot.nombre);
  comprobar(await aparece(p.getByText(/No hay reubicaciones|Crear \d+ tareas/)), 'slotting: sugerencias (o ninguna pendiente)');
  await p.getByRole('tab', { name: 'Clasificación ABC' }).click();
  comprobar(await aparece(p.getByRole('cell', { name: /-RAPIDO$/ })), 'slotting: clasificación ABC');
  await p.getByRole('tab', { name: 'Recorrido' }).click();
  comprobar(await aparece(p.getByText(/^1\. PS\d+-P1-01$/)), 'slotting: recorrido numerado');

  // ── Olas ──
  const olaAlm = ultimo('PRUEBA-OLA');
  const prods = (await api('GET', '/wms/productos/')).filter(x => x.sku.startsWith(olaAlm.codigo + '-'));
  const cliente = (await api('GET', '/wms/clientes/')).find(c => c.codigo === olaAlm.codigo + '-C');
  for (const pr of prods.slice(0, 2)) {
    await api('POST', '/wms/ordenes-salida/', { cliente_id: cliente.id, almacen_id: olaAlm.id, detalles: [{ producto_id: pr.id, cantidad_solicitada: 1 }] });
  }
  await p.goto(APP + '/wms/olas', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/olas');
  await elegirAlmacen(olaAlm.nombre);
  await p.getByRole('button', { name: 'Nueva ola' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Crear ola' }).click();
  comprobar(await aparece(p.getByText('Recorrido ahorrado')), 'olas: ola creada con su comparación de recorrido');
  await p.getByRole('button', { name: 'Alistar' }).first().click();
  const dlg = p.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Confirmar' }).click();
  comprobar(await aparece(p.getByText('Parada confirmada')), 'olas: parada confirmada desde la pantalla');

  // ── Empaque ──
  const emp = ultimo('PRUEBA-EMP');
  const e = (await api('GET', '/wms/productos/')).find(x => x.sku === emp.codigo + '-E');
  const cli2 = (await api('GET', '/wms/clientes/')).find(c => c.codigo === emp.codigo + '-C');
  const o = await api('POST', '/wms/ordenes-salida/', { cliente_id: cli2.id, almacen_id: emp.id, detalles: [{ producto_id: e.id, cantidad_solicitada: 3 }] });
  const t = await api('POST', `/wms/ordenes-salida/${o.id}/generar-picking`);
  await api('POST', `/wms/picking-tareas/${t.id}/confirmar-item`, { detalle_id: t.detalles[0].id, cantidad_pickeada: 3 });
  await p.goto(APP + '/wms/empaque', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/empaque');
  await elegirAlmacen(emp.nombre);
  await p.getByRole('cell', { name: o.numero_orden }).click();
  comprobar(await aparece(p.getByText('Peso facturable')), 'empaque: propuesta con peso real y facturable');
  await p.getByRole('button', { name: 'Confirmar empaque' }).click();
  comprobar(await aparece(p.getByText(/bultos registrados/)), 'empaque: bultos confirmados');
  await p.getByRole('button', { name: 'Etiquetas' }).click();
  await p.waitForTimeout(1500);
  comprobar(ventana, 'empaque: abre las etiquetas de los bultos');

  // ── Maquila ──
  await p.goto(APP + '/wms/maquila', { waitUntil: 'networkidle' });
  comprobar(!(await p.getByText('Esta pantalla no se pudo mostrar').count()), 'carga /wms/maquila');
  await elegirAlmacen(emp.nombre);
  await p.getByRole('button', { name: 'Nueva orden' }).click();
  const nd = p.getByRole('dialog');
  await nd.getByRole('combobox', { name: 'Receta' }).click();
  await p.getByRole('option', { name: /Kit de prueba/ }).first().click();
  comprobar(await aparece(nd.getByText(/Con lo disponible se pueden hacer/)), 'maquila: cuánto se puede hacer y cuánto pide la demanda');
  await nd.getByLabel('Cantidad a producir').fill('1');
  await nd.getByRole('button', { name: 'Crear' }).click();
  comprobar(await aparece(p.getByText(/planeada/)), 'maquila: orden planeada');
  await p.getByRole('button', { name: 'Iniciar' }).first().click();
  comprobar(await aparece(p.getByText(/Componentes reservados/)), 'maquila: iniciar reserva los componentes');
  await p.getByRole('button', { name: 'Terminar' }).first().click();
  const td = p.getByRole('dialog');
  await td.getByLabel('Escanee dónde queda lo producido').fill(`${emp.codigo}-3`);
  await td.getByRole('button', { name: 'Terminar' }).click();
  comprobar(await aparece(p.getByText(/Terminada: 1 a/)), 'maquila: terminada con su costo');
  await p.getByRole('tab', { name: 'Resumen por depositante' }).click();
  comprobar(await aparece(p.getByText('Mano de obra a facturar')), 'maquila: resumen para facturar');

  comprobar(!errores.length, `sin errores de JavaScript ${errores.join(' | ')}`);
  comprobar(!fallidas.length, `sin respuestas 5xx ${fallidas.join(' | ')}`);
  if (fallos) await p.screenshot({ path: `${SALIDA}/sug-final.png`, fullPage: true });
  console.log(`\nFALLOS: ${fallos}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
