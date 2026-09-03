/**
 * Comprueba que se pueda adjuntar un PDF y un Excel a una incidencia.
 *
 *   TOKEN=<jwt de la consola> node probar_adjuntos.cjs
 *
 * Va contra la consola del operador. Escribe: sube dos archivos de prueba a la
 * primera incidencia que encuentre.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

const APP = process.env.APP || 'https://administrador.tittanware.tech';
const TOKEN = process.env.TOKEN;
const SALIDA = process.env.SALIDA || '/salida';
if (!TOKEN) { console.error('Falta TOKEN'); process.exit(1); }

(async () => {
  fs.writeFileSync('/tmp/prueba.pdf', '%PDF-1.4 prueba de carga\n');
  // Un .xlsx mínimo es un zip; con la cabecera basta para probar la extensión.
  fs.writeFileSync('/tmp/prueba.xlsx', Buffer.from('PKprueba'));

  const b = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox'],
  });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('tw_admin_sesion',
      JSON.stringify({ token: t, usuario: 'admin', empresa: 'tittanware' }));
  }, TOKEN);

  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('  ERROR JS:', String(e.message).slice(0, 150)));
  p.on('requestfailed', r => {
    if (r.url().includes('adjunto')) {
      console.log('  PETICIÓN FALLIDA:', r.failure()?.errorText);
    }
  });
  p.on('request', r => {
    if (!r.url().includes('adjunto')) return;
    const h = r.headers();
    console.log('  ENVÍA:', r.method(),
                '| content-type:', h['content-type'],
                '| tamaño:', (r.postDataBuffer() || {length: 0}).length);
  });
  p.on('response', async r => {
    if (!r.url().includes('adjunto')) return;
    let cuerpo = '';
    try { cuerpo = (await r.text()).slice(0, 200) } catch {}
    console.log(`  RED ${r.status()} ${r.request().method()} ` +
                `${r.url().split('/api/v1')[1]}  ${cuerpo}`);
  });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1800);
  await p.getByText('Proyectos', { exact: true }).first().click();
  await p.waitForTimeout(3000);

  // Cambiar al proyecto que tiene incidencias.
  const selector = p.locator('header, div').filter({ hasText: /^DESARROLLOS/ }).last();
  if (await selector.count()) {
    await selector.click({ force: true });
    await p.waitForTimeout(1200);
    const opcion = p.getByText(/Soporte y mantenimiento/).last();
    if (await opcion.count()) { await opcion.click({ force: true }); }
    await p.waitForTimeout(3000);
  }

  const claves = p.getByText(/^(SOP|DES)-\d+$/);
  const cuantas = await claves.count();
  console.log('incidencias en la lista:', cuantas);
  if (!cuantas) {
    await p.screenshot({ path: `${SALIDA}/sin-incidencias.png` });
    console.log('No hay ninguna incidencia con la que probar.');
    await b.close();
    return;
  }

  await claves.first().click({ force: true });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${SALIDA}/detalle.png` });

  const entrada = p.locator('input[type=file]');
  console.log('zona de adjuntos:', await p.getByText(/Arrastre archivos/).count());
  console.log('campo de archivo:', await entrada.count());
  if (!await entrada.count()) {
    console.log('La zona de adjuntos no tiene campo de archivo.');
    await b.close();
    return;
  }

  for (const archivo of ['/tmp/prueba.pdf', '/tmp/prueba.xlsx']) {
    console.log(`\nSubiendo ${archivo}…`);
    await entrada.first().setInputFiles(archivo);
    await p.waitForTimeout(4500);
    const nombre = archivo.split('/').pop();
    console.log('  éxito:', await p.getByText(/Archivo adjuntado/).count(),
                '· error:', await p.getByText(/No se pudo adjuntar/).count(),
                '· aparece en la lista:', await p.getByText(nombre).count());
  }
  await p.screenshot({ path: `${SALIDA}/tras-subir.png` });
  await b.close();
})();
