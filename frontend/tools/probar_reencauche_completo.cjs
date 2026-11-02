/**
 * Prueba de punta a punta de la planta de reencauche en un navegador de verdad:
 * recogida pedida y programada en un viaje, parada completada en el TMS con lo
 * recogido, recepción desde la recogida, ruta en frío completa en la terminal,
 * un rechazo con su disposición, dos ciclos de autoclave a la vez (uno con
 * desviación que retiene y luego se libera), una condicional dictaminada,
 * entrega, liquidación facturada en el ERP y un reclamo de garantía. Recorre
 * además todas las pantallas del módulo sin errores de página ni del servidor.
 *
 * Necesita la empresa preparada por `backend/tests/humo_reencauche.py`.
 *
 *   APP=... GATEWAY=... EMPRESA=rtm USUARIO=admin CLAVE=... node probar_reencauche_completo.cjs
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'rtm';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const ESTACION = { INSP_INICIAL: 'INS-1', DESTALONADO: 'DST-1', RASPADO: 'RAS-2', INSP_RASPADO: 'INS-1', ESCARIADO: 'ESC-1',
  CEMENTADO: 'CEM-1', PREP_BANDA: 'COR-1', EMBANDADO: 'EMB-1', ENVELOPADO: 'ENV-1', DESENVELOPADO: 'INS-1',
  INSP_FINAL: 'INS-1', ACABADOS: 'ACA-1', MARCACION: 'ACA-1' };
const RUTA = ['INSP_INICIAL', 'DESTALONADO', 'RASPADO', 'INSP_RASPADO', 'ESCARIADO', 'CEMENTADO', 'PREP_BANDA', 'EMBANDADO',
  'ENVELOPADO', 'VULCANIZACION', 'DESENVELOPADO', 'INSP_FINAL', 'ACABADOS', 'MARCACION'];

async function elegir(p, etiqueta, opcion, dentro) {
  await (dentro ?? p).getByLabel(etiqueta, { exact: true }).click();
  await p.getByRole('option', { name: opcion }).first().click();
}
const ir = (p, ruta) => p.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 60000 });

/** Lleva la carcasa por la terminal desde `desde` hasta antes de `hasta` (sin incluirla). */
async function terminal(p, codigo, desde, hasta) {
  await ir(p, '/reencauche/terminal');
  let actual = '';
  for (const etapa of RUTA.slice(RUTA.indexOf(desde), hasta ? RUTA.indexOf(hasta) : undefined)) {
    const est = ESTACION[etapa];
    if (est !== actual) { await elegir(p, 'Estación', new RegExp(`^${est} `)); actual = est }
    const entrada = p.getByLabel('Escanee el código de la carcasa');
    await entrada.fill(codigo); await entrada.press('Enter');
    await p.getByText(codigo, { exact: true }).first().waitFor({ timeout: 15000 });
    if (etapa === 'DESTALONADO' || etapa === 'ESCARIADO') {
      const r = p.waitForResponse(x => x.url().includes('/terminal/omitir'));
      await p.getByRole('button', { name: 'Omitir' }).click(); await r; continue
    }
    await p.getByRole('button', { name: /^Iniciar / }).click();
    const terminar = p.getByRole('button', { name: /^Terminar / });
    await terminar.waitFor({ timeout: 15000 });
    if (etapa === 'INSP_INICIAL') { await p.getByLabel(/Profundidad remanente/).fill('4.5'); await p.getByRole('button', { name: 'Aprobada' }).click() }
    if (etapa === 'RASPADO') { await p.getByLabel(/Diámetro de raspado/).fill('1020'); await p.getByLabel(/Ancho de raspado/).fill('230'); await p.getByLabel(/Radio del perfil/).fill('800') }
    if (etapa === 'INSP_RASPADO' || etapa === 'DESENVELOPADO') await p.getByRole('button', { name: 'Aprobada' }).click()
    if (etapa === 'CEMENTADO') await p.getByLabel('Lote (escanear)').first().fill('CM-77')
    if (etapa === 'PREP_BANDA') { await p.getByLabel(/Longitud de banda cortada/).fill('3.12'); await p.getByLabel('Lote (escanear)').nth(0).fill('L-0915'); await p.getByLabel('Lote (escanear)').nth(1).fill('C-0420') }
    if (etapa === 'EMBANDADO') await p.getByLabel(/Desviación de centrado/).fill('1')
    if (etapa === 'ENVELOPADO') await p.getByRole('button', { name: 'Sí' }).click()
    if (etapa === 'INSP_FINAL') { await p.getByLabel(/Profundidad de labrado final/).fill('16'); await p.getByRole('button', { name: 'Aprobada' }).click() }
    const r = p.waitForResponse(x => x.url().includes('/terminar'));
    await terminar.click();
    const resp = await r;
    if (resp.status() !== 200) throw new Error(`${codigo} ${etapa}: ${await resp.text()}`)
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, locale: 'es-CO' });
  const p = await ctx.newPage();
  const errores = [], malas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) malas.push(`${r.status()} ${r.url()}`) });

  await ir(p, '/');
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });
  const sufijo = Date.now().toString().slice(-5);
  const ciudad = `Soledad${sufijo}`;

  // 1. Solicitud de recogida y viaje.
  await ir(p, '/reencauche/despachos');
  await p.getByRole('button', { name: 'Solicitud de recogida' }).click();
  const dlg = p.getByRole('dialog');
  await elegir(p, 'Cliente', 'Carga Caribe', dlg);
  await dlg.getByLabel('Sede', { exact: true }).fill('Patio principal');
  await dlg.getByLabel('Ciudad', { exact: true }).fill(ciudad);
  await dlg.getByLabel('Llantas estimadas').fill('4');
  await dlg.getByRole('button', { name: 'Registrar' }).click();
  const fila = p.getByRole('row').filter({ hasText: ciudad });
  await fila.waitFor({ timeout: 15000 });
  await fila.getByRole('checkbox').check();
  await p.getByRole('button', { name: /Programar viaje/ }).click();
  const respViaje = p.waitForResponse(x => x.url().includes('/recogidas/programar'));
  await p.getByRole('button', { name: 'Crear viaje' }).click();
  const viaje = await (await respViaje).json();
  comprobar(viaje.codigo && viaje.paradas.length === 2, `recogida programada en el viaje ${viaje.codigo} (sede y planta)`);

  // 2. El conductor completa la parada en el TMS: pide cantidad y remisión.
  await ir(p, '/tms/viajes');
  await p.getByPlaceholder('Buscar por código, ciudad, conductor...').fill(viaje.codigo);
  await p.getByRole('row').filter({ hasText: viaje.codigo }).first().click();
  await p.getByRole('tab', { name: 'Paradas' }).click();
  await p.getByLabel(`Completar ${ciudad}`).click();
  const dRec = p.getByRole('dialog').filter({ hasText: 'Recogida de llantas' });
  await dRec.waitFor({ timeout: 15000 });
  comprobar(true, 'TMS: completar la parada de recogida pide la cantidad y la remisión');
  await dRec.getByLabel('Llantas recogidas').fill('4');
  await dRec.getByLabel('Remisión del cliente').fill(`REM-CC-${sufijo}`);
  await dRec.getByRole('button', { name: 'Completar parada' }).click();
  await p.getByText(/recogió 4 llantas/).waitFor({ timeout: 15000 });
  comprobar(true, 'TMS: la parada queda con lo recogido');

  // 3. Recepción desde la recogida.
  await ir(p, '/reencauche/recepcion');
  await p.getByRole('tab', { name: /Por recibir/ }).click();
  await p.getByRole('row').filter({ hasText: `REM-CC-${sufijo}` }).getByRole('button', { name: 'Recibir' }).click();
  await p.getByRole('button', { name: 'Registrar carcasa' }).waitFor({ timeout: 20000 });
  await p.getByLabel('Marca *').fill('Bridgestone');
  await p.getByLabel('Medida *').fill('295/80 R22.5');
  await p.getByLabel('Modelo *').fill('R268');
  await elegir(p, 'Banda pedida', 'Banda BDR-HT 230');
  for (let i = 0; i < 4; i++) {
    const r = p.waitForResponse(x => x.url().includes('/carcasas') && x.request().method() === 'POST');
    await p.getByRole('button', { name: 'Registrar carcasa' }).click(); await r;
  }
  await p.waitForTimeout(800);
  const codigos = await p.locator('table b').evaluateAll(xs => xs.map(x => x.textContent).filter(t => /^RT-\d+$/.test(t)));
  await p.getByRole('button', { name: 'Cerrar recepción' }).click();
  await p.getByText('Cuadrada').first().waitFor({ timeout: 15000 });
  comprobar(codigos.length === 4, `recepción desde la recogida: 4 de 4 contra lo recogido (${codigos.join(', ')})`);
  const [c1, c2, c3, c4] = codigos;

  // 4. Rechazo en la inspección inicial y disposición.
  await ir(p, '/reencauche/terminal');
  await elegir(p, 'Estación', /^INS-1 /);
  const entrada = p.getByLabel('Escanee el código de la carcasa');
  await entrada.fill(c2); await entrada.press('Enter');
  await p.getByRole('button', { name: /^Iniciar / }).click();
  await p.getByLabel(/Profundidad remanente/).fill('1.5');
  await p.getByRole('button', { name: 'Rechazada' }).click();
  await p.getByLabel('Motivos de rechazo (al menos uno)').click();
  await p.getByRole('option', { name: /Deformación permanente/ }).click();
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: /^Terminar / }).click();
  await p.getByText(/rechazada: pasa a disposición/).waitFor({ timeout: 15000 });
  comprobar(true, 'terminal: rechazo con motivo en la inspección inicial');
  await ir(p, '/reencauche/calidad');
  await p.getByRole('tab', { name: 'Rechazos y disposición' }).click();
  await p.getByRole('row').filter({ hasText: c2 }).getByRole('checkbox').check();
  await p.getByRole('button', { name: /^Disponer/ }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Registrar' }).click();
  await p.getByText(/disposición devolucion/i).waitFor({ timeout: 15000 });
  comprobar(true, 'rechazos: disposición de devolución al cliente');

  // 5. Condicional dictaminada.
  await ir(p, '/reencauche/terminal');
  await elegir(p, 'Estación', /^INS-1 /);
  await entrada.fill(c4); await entrada.press('Enter');
  await p.getByRole('button', { name: /^Iniciar / }).click();
  await p.getByLabel(/Profundidad remanente/).fill('4');
  await p.getByRole('button', { name: 'Condicional' }).click();
  await p.getByRole('button', { name: /^Terminar / }).click();
  await p.getByText(/queda para dictamen técnico/).waitFor({ timeout: 15000 });
  await ir(p, '/reencauche/calidad');
  await p.getByRole('row').filter({ hasText: c4 }).getByRole('button', { name: 'Dictaminar' }).click();
  await p.getByRole('dialog').getByLabel('Justificación').fill('Corte en el hombro dentro de los límites de reparación');
  await p.getByRole('dialog').getByRole('button', { name: 'Firmar dictamen' }).click();
  await p.getByText(/aprobada: sigue su ruta/).waitFor({ timeout: 15000 });
  comprobar(true, 'evaluación técnica: la condicional se dictamina y sigue su ruta');

  // 6. Dos ciclos a la vez: AC1 conforme y AC2 con tiempo corto (retiene) que se libera.
  await terminal(p, c1, 'INSP_INICIAL', 'VULCANIZACION');
  await terminal(p, c3, 'INSP_INICIAL', 'VULCANIZACION');
  await ir(p, '/reencauche/vulcanizacion');
  for (const [nombre, codigo] of [['AC1 · capacidad', c1], ['AC2 · capacidad', c3]]) {
    const t = p.locator('.MuiPaper-root').filter({ hasText: nombre }).first();
    if (await t.getByRole('button', { name: 'Armar ciclo' }).count()) await t.getByRole('button', { name: 'Armar ciclo' }).click();
    await t.getByLabel('Escanee la carcasa').fill(codigo);
    await t.getByRole('button', { name: 'Cargar' }).click();
    await t.getByText(codigo).waitFor({ timeout: 15000 });
    await t.getByRole('button', { name: 'Iniciar ciclo' }).click();
    await t.getByText('En ciclo').waitFor({ timeout: 15000 });
  }
  comprobar(await p.getByText('En ciclo', { exact: true }).count() >= 2, 'tablero de vulcanización: dos autoclaves en ciclo, con llantas y hora de fin');
  for (const [nombre, tiempo] of [['AC1 · capacidad', '181'], ['AC2 · capacidad', '170']]) {
    const t = p.locator('.MuiPaper-root').filter({ hasText: nombre }).first();
    await t.getByRole('button', { name: 'Cerrar ciclo' }).click();
    const d = p.getByRole('dialog');
    await d.getByLabel('Temperatura máxima (°C)').fill('98'); await d.getByLabel('Presión media (bar)').fill('6');
    await d.getByLabel('Vacío mínimo (bar)').fill('-0.8'); await d.getByLabel(/Duración/).fill(tiempo);
    await d.getByRole('button', { name: 'Cerrar ciclo' }).click();
    await d.waitFor({ state: 'detached', timeout: 15000 });
  }
  await ir(p, '/reencauche/calidad');
  await p.getByRole('tab', { name: 'Retenciones' }).click();
  const filaRet = p.getByRole('row').filter({ hasText: c3 });
  await filaRet.waitFor({ timeout: 15000 });
  comprobar(await filaRet.getByText(/desviación de tiempo/).count() > 0, 'el ciclo con tiempo corto retiene su carcasa con el motivo');
  await filaRet.getByRole('button', { name: 'Resolver' }).click();
  await p.getByRole('dialog').getByLabel('Justificación').fill('Dentro de la tolerancia del fabricante de la banda');
  await p.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await p.getByText('Retención cerrada').waitFor({ timeout: 15000 });
  comprobar(true, 'calidad libera la retención con justificación');
  await terminal(p, c1, 'DESENVELOPADO');
  await terminal(p, c3, 'DESENVELOPADO');

  // 7. Entrega en mostrador: dos terminadas y la rechazada por devolver.
  await ir(p, '/reencauche/despachos');
  await p.getByRole('tab', { name: 'Entregas' }).click();
  await p.getByRole('button', { name: 'Nueva entrega' }).click();
  const de = p.getByRole('dialog');
  await elegir(p, 'Dueño de las llantas', 'Carga Caribe', de);
  for (const c of [c1, c2, c3]) await de.locator('div').filter({ hasText: new RegExp(`^${c}`) }).getByRole('checkbox').first().check();
  await de.getByRole('button', { name: 'En mostrador' }).click();
  await de.getByLabel('Placa del vehículo').fill('CCB321');
  await de.getByLabel('Nombre de quien recibe').fill('Luis Martínez');
  await de.getByRole('button', { name: /^Entregar 3/ }).click();
  await p.getByText(/cerrada en mostrador/).waitFor({ timeout: 20000 });
  comprobar(true, 'entrega en mostrador: 2 reencauchadas y 1 devolución');

  // 8. Liquidación facturada.
  await ir(p, '/reencauche/liquidacion');
  await p.getByRole('row').filter({ hasText: 'Carga Caribe' }).first().click();
  const dl = p.getByRole('dialog');
  await dl.getByText('Cargo de inspección').first().waitFor({ timeout: 15000 });
  const lineas = await dl.locator('tbody tr').count();
  await dl.getByRole('button', { name: /Aprobar y facturar/ }).click();
  const aviso = await Promise.race([p.getByText(/Factura .* emitida en el ERP/).waitFor({ timeout: 20000 }).then(() => 'factura'),
    p.getByText(/Aprobada, sin factura/).waitFor({ timeout: 20000 }).then(() => 'aviso')]);
  comprobar(lineas >= 5 && aviso === 'factura', `liquidación: reencauches y cargo de inspección, facturada en el ERP (${aviso})`);
  await p.keyboard.press('Escape');

  // 9. Reclamo de garantía.
  await ir(p, '/reencauche/garantias');
  await p.getByRole('button', { name: 'Nuevo reclamo' }).click();
  const dg = p.getByRole('dialog');
  await dg.getByLabel('Código de la llanta').fill(c1);
  await dg.getByLabel('Kilometraje').fill('18000');
  await dg.getByLabel('Condiciones de operación').fill('Tracción, carretera nacional');
  await dg.getByRole('button', { name: 'Registrar' }).click();
  const filaR = p.getByRole('row').filter({ hasText: c1 }).first();
  await filaR.waitFor({ timeout: 15000 });
  await filaR.getByRole('button', { name: 'Analizar' }).click();
  await filaR.getByRole('button', { name: 'Dictaminar' }).click();
  await p.getByRole('dialog').getByLabel('Causa probable').fill('Defecto de unión');
  await p.getByRole('dialog').getByRole('button', { name: 'Firmar dictamen' }).click();
  await filaR.getByText(/procede · Defecto de unión/).waitFor({ timeout: 15000 });
  comprobar(true, 'garantía: reclamo registrado, analizado y dictaminado procedente');

  // 10. Todas las pantallas del módulo.
  for (const ruta of ['/reencauche', '/reencauche/carcasas', '/reencauche/indicadores', '/reencauche/config', '/reencauche/vulcanizacion',
    '/reencauche/despachos', '/reencauche/liquidacion', '/reencauche/garantias', '/reencauche/calidad', '/reencauche/recepcion', '/tms/planeacion']) {
    await ir(p, ruta);
    await p.waitForTimeout(600);
  }
  await ir(p, '/reencauche/indicadores');
  await p.getByText('Llantas recibidas').waitFor({ timeout: 20000 });
  await p.screenshot({ path: `${SALIDA}/rtm_indicadores.png` });
  await ir(p, '/reencauche');
  await p.getByText('Llantas por etapa (ruta en frío)').waitFor({ timeout: 20000 });
  await p.screenshot({ path: `${SALIDA}/rtm_tablero.png` });
  comprobar(errores.length === 0, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  comprobar(malas.length === 0, `sin errores del servidor${malas.length ? ': ' + malas.join(' | ') : ''}`);
  await b.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
