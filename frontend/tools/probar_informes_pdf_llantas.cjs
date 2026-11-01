/**
 * Prueba en navegador los informes PDF de consultoría de llantas: en cada
 * informe de la pantalla de informes (menos el historial de inspecciones) el
 * botón «Informe PDF» debe descargar un PDF de verdad.
 *
 *   APP=... GATEWAY=... EMPRESA=carga USUARIO=... CLAVE=... node probar_informes_pdf_llantas.cjs
 */
const fs = require('fs');
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

const INFORMES = [
  ['Tablero de rendimiento', 'TABLERO'], ['Costo por kilómetro', 'CPK'], ['Rendimiento en kilómetros', 'KM'],
  ['Kilómetros por milímetro', 'KM_MM'], ['Detalle por vida', 'VIDAS'], ['Composición de llantas a piso', 'COMPOSICION'],
];

let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, locale: 'es-CO', acceptDownloads: true });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });

  await p.goto(APP + '/eam/neumaticos/reportes', { waitUntil: 'networkidle', timeout: 120000 });
  for (const [nombre, tipo] of INFORMES) {
    await p.getByText(nombre, { exact: true }).first().click();
    const boton = p.getByRole('button', { name: 'Informe PDF' });
    await boton.waitFor({ timeout: 30000 });
    // Espera a que la vista previa termine de cargar (el botón se habilita).
    await p.waitForFunction(() => [...document.querySelectorAll('button')]
      .some(x => x.textContent.trim() === 'Informe PDF' && !x.disabled), null, { timeout: 120000 });
    const t0 = Date.now();
    const [descarga] = await Promise.all([p.waitForEvent('download', { timeout: 180000 }), boton.click()]);
    const ruta = `${SALIDA}/informe_${tipo}.pdf`;
    await descarga.saveAs(ruta);
    const cabeza = fs.readFileSync(ruta).subarray(0, 5).toString();
    const tam = fs.statSync(ruta).size;
    comprobar(cabeza === '%PDF-' && tam > 5000,
      `${nombre}: descarga ${descarga.suggestedFilename()} (${Math.round(tam / 1024)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  await p.getByText('Historial de inspecciones', { exact: true }).first().click();
  await p.waitForTimeout(800);
  comprobar(await p.getByRole('button', { name: 'Informe PDF' }).count() === 0, 'el historial de inspecciones no tiene informe PDF');
  comprobar(errores.length === 0, `sin errores de la página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await b.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
