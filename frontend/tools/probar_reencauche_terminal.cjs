/**
 * Prueba en navegador la planta de reencauche: recepción de 5 llantas con sus
 * etiquetas y una carcasa que recorre la ruta en frío completa desde la
 * terminal de estación (incluido el ciclo de autoclave en vulcanización).
 *
 * Necesita la empresa de prueba preparada por `backend/tests/humo_reencauche.py`
 * (equipos INS-1, RAS-2, CEM-1, COR-1... insumos con lote y la receta del AC1).
 *
 *   APP=... GATEWAY=... EMPRESA=rtm USUARIO=admin CLAVE=... node probar_reencauche_terminal.cjs
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
const ORDEN = ['INSP_INICIAL', 'DESTALONADO', 'RASPADO', 'INSP_RASPADO', 'ESCARIADO', 'CEMENTADO', 'PREP_BANDA', 'EMBANDADO',
  'ENVELOPADO', 'VULCANIZACION', 'DESENVELOPADO', 'INSP_FINAL', 'ACABADOS', 'MARCACION'];

async function elegir(p, etiqueta, opcion) {
  await p.getByLabel(etiqueta, { exact: true }).click();
  await p.getByRole('option', { name: opcion }).first().click();
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, locale: 'es-CO' });
  const p = await ctx.newPage();
  const errores = [];
  const malas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500) malas.push(`${r.status()} ${r.url()}`) });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });

  // ── Recepción de 5 llantas ──
  await p.goto(APP + '/reencauche/recepcion', { waitUntil: 'networkidle', timeout: 60000 });
  await p.getByRole('button', { name: 'Nueva recepción' }).click();
  await elegir(p, 'Propietario de las llantas', 'Transportes del Norte');
  await p.getByLabel('Remisión del cliente').fill('REM-NAV-' + Date.now().toString().slice(-5));
  await p.getByLabel('Cantidad remitida').fill('5');
  await p.getByRole('button', { name: 'Abrir recepción' }).click();
  await p.getByRole('button', { name: 'Registrar carcasa' }).waitFor({ timeout: 20000 });
  await p.getByLabel('Marca *').fill('Michelin');
  await p.getByLabel('Medida *').fill('295/80 R22.5');
  await p.getByLabel('Modelo *').fill('X Multi Z');
  await elegir(p, 'Banda pedida', 'Banda BDR-HT 230');
  for (let i = 0; i < 5; i++) {
    const r = p.waitForResponse(x => x.url().includes('/carcasas') && x.request().method() === 'POST');
    await p.getByRole('button', { name: 'Registrar carcasa' }).click();
    const resp = await r;
    if (resp.status() !== 201) { console.log('registro', resp.status(), await resp.text()); break }
  }
  await p.waitForTimeout(800);
  const codigos = await p.locator('table b').evaluateAll(xs => xs.map(x => x.textContent).filter(t => /^RT-\d+$/.test(t)));
  comprobar(codigos.length === 5, `recepción: 5 carcasas registradas con su código (${codigos.join(', ')})`);
  const [popup] = await Promise.all([p.waitForEvent('popup', { timeout: 20000 }), p.getByRole('button', { name: 'Etiquetas de todas' }).click()]);
  await popup.waitForLoadState();
  const html = await popup.content();
  comprobar(codigos.every(c => html.includes(c)) && (await popup.locator('img').count()) === 5, 'imprimir: una etiqueta con código QR por carcasa');
  await popup.close();
  await p.getByRole('button', { name: 'Cerrar recepción' }).click();
  await p.getByText('Cuadrada').first().waitFor({ timeout: 15000 });
  comprobar(true, 'cerrar la recepción: 5 de 5, cuadrada contra la remisión');

  // ── Una carcasa por toda la ruta desde la terminal ──
  const codigo = codigos[0];
  await p.goto(APP + '/reencauche/terminal', { waitUntil: 'networkidle', timeout: 60000 });
  let estacionActual = '';
  for (const etapa of ORDEN) {
    if (etapa === 'VULCANIZACION') {
      await p.goto(APP + '/reencauche/vulcanizacion', { waitUntil: 'networkidle', timeout: 60000 });
      const tarjeta = p.locator('.MuiPaper-root').filter({ hasText: 'Autoclave 1' }).filter({ hasText: 'AC1 · capacidad' }).first();
      if (await tarjeta.getByRole('button', { name: 'Armar ciclo' }).count()) await tarjeta.getByRole('button', { name: 'Armar ciclo' }).click();
      await tarjeta.getByLabel('Escanee la carcasa').fill(codigo);
      await tarjeta.getByRole('button', { name: 'Cargar' }).click();
      await tarjeta.getByText(codigo).waitFor({ timeout: 15000 });
      await tarjeta.getByRole('button', { name: 'Iniciar ciclo' }).click();
      await tarjeta.getByRole('button', { name: 'Cerrar ciclo' }).click();
      const dlg = p.getByRole('dialog');
      await dlg.getByLabel('Temperatura máxima (°C)').fill('98.5');
      await dlg.getByLabel('Presión media (bar)').fill('6.1');
      await dlg.getByLabel('Vacío mínimo (bar)').fill('-0.82');
      await dlg.getByLabel(/Duración/).fill('181');
      await dlg.getByRole('button', { name: 'Cerrar ciclo' }).click();
      await p.getByText(/Ciclo conforme/).waitFor({ timeout: 15000 });
      comprobar(true, 'vulcanización: ciclo armado por escaneo, iniciado y cerrado conforme');
      await p.goto(APP + '/reencauche/terminal', { waitUntil: 'networkidle', timeout: 60000 });
      estacionActual = ''
      continue
    }
    const est = ESTACION[etapa];
    if (est !== estacionActual) { await elegir(p, 'Estación', new RegExp(`^${est} `)); estacionActual = est }
    const entrada = p.getByLabel('Escanee el código de la carcasa');
    await entrada.fill(codigo);
    await entrada.press('Enter');
    await p.getByText(codigo, { exact: true }).first().waitFor({ timeout: 15000 });
    if (etapa === 'DESTALONADO' || etapa === 'ESCARIADO') {
      await p.getByRole('button', { name: 'Omitir' }).click();
      await p.getByText('Etapa omitida').first().waitFor({ timeout: 15000 });
      continue
    }
    await p.getByRole('button', { name: /^Iniciar / }).click();
    const terminar = p.getByRole('button', { name: /^Terminar / });
    await terminar.waitFor({ timeout: 15000 });
    if (etapa === 'INSP_INICIAL') { await p.getByLabel(/Profundidad remanente/).fill('4.5'); await p.getByRole('button', { name: 'Aprobada' }).click() }
    if (etapa === 'RASPADO') {
      await p.getByLabel(/Diámetro de raspado/).fill('1008'); await p.getByLabel(/Ancho de raspado/).fill('230'); await p.getByLabel(/Radio del perfil/).fill('800')
      comprobar(await p.getByText('Hay mediciones fuera de tolerancia').count() > 0, 'terminal: un diámetro fuera de rango se marca y pide decisión')
      await p.getByLabel(/Diámetro de raspado/).fill('1020')
    }
    if (etapa === 'INSP_RASPADO' || etapa === 'DESENVELOPADO') await p.getByRole('button', { name: 'Aprobada' }).click()
    if (etapa === 'CEMENTADO') await p.getByLabel('Lote (escanear)').first().fill('CM-77')
    if (etapa === 'PREP_BANDA') {
      await p.getByLabel(/Longitud de banda cortada/).fill('3.12')
      await p.getByLabel('Lote (escanear)').nth(0).fill('L-0915'); await p.getByLabel('Lote (escanear)').nth(1).fill('C-0420')
    }
    if (etapa === 'EMBANDADO') await p.getByLabel(/Desviación de centrado/).fill('1')
    if (etapa === 'ENVELOPADO') await p.getByRole('button', { name: 'Sí' }).click()
    if (etapa === 'INSP_FINAL') { await p.getByLabel(/Profundidad de labrado final/).fill('16'); await p.getByRole('button', { name: 'Aprobada' }).click() }
    const r = p.waitForResponse(x => x.url().includes('/terminar'));
    await terminar.click();
    const resp = await r;
    if (resp.status() !== 200) { comprobar(false, `${etapa}: ${await resp.text()}`); break }
  }
  await p.goto(APP + '/reencauche/carcasas', { waitUntil: 'networkidle', timeout: 60000 });
  await p.getByLabel('Código, DOT, serie o cliente').fill(codigo);
  await p.getByRole('button', { name: 'Buscar' }).click();
  await p.getByRole('cell', { name: codigo }).first().click();
  const hoja = p.getByRole('dialog');
  await hoja.getByText(/Reencauche nº 1/).waitFor({ timeout: 15000 });
  const texto = await hoja.innerText();
  comprobar(texto.includes('Producto terminado') && texto.includes('Autoclave 1') && texto.includes('L-0915') && texto.includes('Raspadora 2'),
    'la carcasa recorrió la ruta en frío completa desde la terminal y su hoja de vida lo muestra');
  await p.screenshot({ path: `${SALIDA}/rtm_hoja.png`, fullPage: false });
  comprobar(errores.length === 0, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  comprobar(malas.length === 0, `sin errores del servidor${malas.length ? ': ' + malas.join(' | ') : ''}`);
  await b.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
