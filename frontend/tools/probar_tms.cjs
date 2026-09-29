/**
 * Prueba en navegador las pantallas de TMS que eran maqueta y el detalle del
 * viaje, que solo mostraba y no dejaba registrar nada.
 *
 *   APP=http://localhost:5173 GATEWAY=host.docker.internal EMPRESA=demo \
 *   USUARIO=... CLAVE=... VIAJE_ENTREGADO=VJ-... VIAJE_PROGRAMADO=VJ-... node probar_tms.cjs
 *
 * Necesita dos viajes de prueba: uno entregado (con costos) y uno programado
 * sin asignar, más un vehículo y un conductor libres. Todo lo que crea lleva
 * PRUEBA-TMS.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const ENTREGADO = process.env.VIAJE_ENTREGADO;
const PROGRAMADO = process.env.VIAJE_PROGRAMADO;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE || !ENTREGADO || !PROGRAMADO) { console.error('Faltan CLAVE, VIAJE_ENTREGADO o VIAJE_PROGRAMADO'); process.exit(1); }

let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const campo = (d, r) => d.getByLabel(new RegExp('^' + esc(r) + '(\\s*\\*)?$')).first();
async function elegir(p, d, r, opcion) {
  await d.getByRole('combobox', { name: new RegExp('^' + esc(r) + '(\\s*\\*)?(\\s|$)') }).click();
  await p.getByRole('option', { name: opcion, exact: true }).click();
}
const aparece = async (loc) => { try { await loc.first().waitFor({ timeout: 8000 }); return true } catch { return false } };
async function aviso(p, re) { try { await p.getByText(re).first().waitFor({ timeout: 8000 }); return true } catch { return false } }

(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])],
  });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1100 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => {
    // El 404 del POD es «todavía no hay prueba de entrega», no un fallo.
    if (r.url().includes('/api/v1/tms') && r.status() >= 400 && !(r.status() === 404 && r.url().endsWith('/pod')))
      fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`);
  });
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
  const ir = async (ruta) => { await p.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(1500); };
  const dlg = () => p.getByRole('dialog').last();

  // ── Detalle del viaje: registrar dentro del recorrido ────────────────────
  await ir('/tms/viajes');
  await p.getByRole('row', { name: new RegExp(esc(PROGRAMADO)) }).getByRole('button').first().click();
  const detalle = p.getByRole('dialog').first();
  await detalle.getByRole('tab', { name: 'Paradas' }).click();
  await detalle.getByRole('button', { name: 'Agregar parada' }).click();
  await campo(dlg(), 'Ciudad').fill('PRUEBA-TMS Facatativá');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aviso(p, /Parada agregada/), 'detalle: agrega una parada');
  comprobar(await aparece(detalle.getByText(/PRUEBA-TMS Facatativá/)), 'detalle: la parada aparece en la lista');

  await detalle.getByRole('tab', { name: 'Documentos' }).click();
  await detalle.getByRole('button', { name: 'Agregar documento' }).click();
  await elegir(p, dlg(), 'Tipo de documento', 'MANIFIESTO');
  await campo(dlg(), 'Número').fill('PRUEBA-TMS-M1');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aviso(p, /Documento agregado/), 'detalle: agrega un documento');
  comprobar(await aparece(detalle.getByText(/MANIFIESTO — PRUEBA-TMS-M1/)), 'detalle: el documento aparece');

  await detalle.getByRole('tab', { name: 'Alertas' }).click();
  await detalle.getByRole('button', { name: 'Crear alerta' }).click();
  await campo(dlg(), 'Mensaje').fill('PRUEBA-TMS cierre vial en la ruta');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aviso(p, /Alerta creada/), 'detalle: crea una alerta');
  await detalle.getByRole('button', { name: 'Marcar atendida' }).first().click();
  comprobar(await aviso(p, /Alerta atendida/), 'detalle: marca la alerta como atendida');

  await detalle.getByRole('tab', { name: /Tracking/ }).click();
  comprobar(!(await detalle.getByRole('button', { name: 'Registrar seguimiento' }).count()),
    'detalle: un viaje sin salir no admite seguimiento todavía');
  await p.keyboard.press('Escape');

  // ── Planeación: asignar el programado ────────────────────────────────────
  await ir('/tms/planeacion');
  await p.getByRole('button', { name: `Seleccionar ${PROGRAMADO}` }).click();
  await p.getByRole('button', { name: /^Elegir vehículo / }).first().click();
  await p.getByRole('tab', { name: /Conductores/ }).click();
  await p.getByRole('button', { name: /^Elegir conductor PRUEBA-TMS/ }).first().click();
  await p.getByRole('button', { name: 'Asignar viaje' }).click();
  comprobar(await aviso(p, new RegExp(`Viaje ${esc(PROGRAMADO)} asignado`)), 'planeación: asigna vehículo y conductor');
  await p.waitForTimeout(1200);
  comprobar(!(await p.getByRole('button', { name: `Seleccionar ${PROGRAMADO}` }).count()), 'planeación: el viaje sale de la cola');

  // ── Ahora sí: iniciar y registrar seguimiento y novedad ───────────────────
  await ir('/tms/viajes');
  await p.getByRole('row', { name: new RegExp(esc(PROGRAMADO)) }).getByRole('button').first().click();
  await p.getByRole('dialog').first().getByRole('button', { name: 'Iniciar' }).click();
  await p.waitForTimeout(2000);
  await p.getByRole('row', { name: new RegExp(esc(PROGRAMADO)) }).getByRole('button').first().click();
  const d2 = p.getByRole('dialog').first();
  await d2.getByRole('tab', { name: /Tracking/ }).click();
  await d2.getByRole('button', { name: 'Registrar seguimiento' }).click();
  await campo(dlg(), 'Descripción').fill('PRUEBA-TMS pasó por el peaje');
  await campo(dlg(), 'Latitud').fill('4.8');
  await campo(dlg(), 'Longitud').fill('-74.2');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aviso(p, /Seguimiento registrado/), 'tracking: registra un seguimiento con posición');
  await d2.getByRole('button', { name: 'Reportar novedad' }).click();
  comprobar(await dlg().getByRole('button', { name: 'Guardar' }).isDisabled(), 'tracking: la novedad exige decir qué pasó');
  await campo(dlg(), 'Qué pasó').fill('PRUEBA-TMS derrumbe, espera de 2 horas');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aviso(p, /Novedad registrada/), 'tracking: reporta una novedad');
  await p.waitForTimeout(1000);
  comprobar(await d2.getByText('Novedad', { exact: true }).count() > 0 && await d2.getByText('PRUEBA-TMS derrumbe, espera de 2 horas').count() > 0,
    'tracking: la novedad queda marcada en la línea de tiempo');

  await d2.getByRole('tab', { name: 'Entrega (POD)' }).click();
  await campo(d2, 'Nombre de quien recibe').fill('PRUEBA-TMS Receptor');
  await d2.getByRole('button', { name: 'Registrar prueba de entrega' }).click();
  comprobar(await aviso(p, /Prueba de entrega registrada/), 'detalle: registra la prueba de entrega');
  await p.keyboard.press('Escape');

  // ── OTIF: confirmar completitud ──────────────────────────────────────────
  await ir('/tms/otif');
  const fila = p.getByRole('row', { name: new RegExp(esc(ENTREGADO)) });
  await fila.getByRole('button', { name: /Cambiar|Confirmar/ }).click();
  await dlg().getByRole('button', { name: 'Incompleta' }).click();
  comprobar(await dlg().getByRole('button', { name: 'Confirmar' }).isDisabled(), 'OTIF: «incompleta» exige el motivo');
  await campo(dlg(), 'Qué faltó').fill('PRUEBA-TMS faltaron 3 cajas');
  await dlg().getByRole('button', { name: 'Confirmar' }).click();
  comprobar(await aviso(p, /Entrega confirmada/), 'OTIF: confirma la entrega como incompleta');
  await p.getByRole('tab', { name: 'Causas de falla' }).click();
  comprobar(await p.getByText('PRUEBA-TMS faltaron 3 cajas').count() > 0, 'OTIF: el motivo aparece en causas de falla');

  // ── Costos ───────────────────────────────────────────────────────────────
  await ir('/tms/costos');
  const fc = await p.getByRole('row', { name: new RegExp(esc(ENTREGADO)) }).innerText();
  comprobar(/1\.000\.000/.test(fc) && /50[.,]0\s*%/.test(fc), 'costos: el viaje muestra costo 1.000.000 y margen 50 %');

  // ── Documentos ───────────────────────────────────────────────────────────
  await ir('/tms/documentos');
  await p.getByRole('tab', { name: /Pendientes/ }).click();
  const fp = p.getByRole('row', { name: new RegExp(esc(ENTREGADO)) });
  comprobar(/MANIFIESTO/.test(await fp.innerText()) && /CUMPLIDO/.test(await fp.innerText()), 'documentos: al entregado le faltan manifiesto y cumplido');
  await fp.getByRole('button', { name: 'Completar' }).click();
  await p.waitForTimeout(1500);
  comprobar(await p.getByText('Remesa', { exact: false }).count() > 0 || await p.getByText(/REMESA/).count() > 0, 'documentos: «Completar» abre los documentos del viaje');
  await p.getByRole('tab', { name: /Pruebas de entrega/ }).click();
  comprobar(await p.getByRole('row', { name: new RegExp(esc(PROGRAMADO)) }).count() > 0, 'documentos: el POD registrado aparece en la lista');

  // ── Rutas: estimador y análisis ──────────────────────────────────────────
  await ir('/tms/rutas');
  await p.getByRole('tab', { name: /Optimizador|Estimador/ }).click();
  await p.getByLabel('Ciudad de origen').fill('Bogot');
  await p.getByLabel('Ciudad de destino').fill('PRUEBA-TMS Tunja');
  await p.getByRole('button', { name: 'Estimar' }).click();
  await p.waitForTimeout(1500);
  const est = await p.locator('body').innerText();
  comprobar(/200 km/.test(est) && /promedio de 1 viaje/.test(est), 'rutas: estima 200 km con el viaje real');
  await p.getByLabel('Ciudad de origen').fill('Leticia');
  await p.getByLabel('Ciudad de destino').fill('Mitú');
  await p.getByRole('button', { name: 'Estimar' }).click();
  comprobar(await aviso(p, /No hay rutas en el catálogo ni viajes/), 'rutas: sin datos lo dice, no inventa');
  await p.getByRole('tab', { name: /Análisis/ }).click();
  await p.waitForTimeout(1500);
  comprobar(!(await p.getByText('RT-001 Bogotá-Medellín').count()) && await p.getByText(/PRUEBA-TMS Tunja/).count() > 0, 'rutas: el análisis sale de los viajes, sin datos fijos');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/tms-final.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
