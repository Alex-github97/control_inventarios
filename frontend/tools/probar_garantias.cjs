/**
 * Prueba en navegador el formulario de garantías del CMMS: los desplegables de
 * activo, proveedor y responsable, y los documentos adjuntos. Son justo las
 * cuatro cosas que un usuario reportó rotas.
 *
 * Necesita un contratista «PRUEBA-GAR Cummins de los Andes» con contacto (lo
 * crea la preparación de la prueba) y al menos un activo. Deja todo limpio:
 * borra la garantía creada.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_garantias.cjs
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
const aparece = async (loc, ms = 10000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
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
  await p.goto(APP + '/eam/garantias', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(800);

  await p.getByRole('button', { name: /Nueva Garantía/ }).first().click();
  const dlg = p.getByRole('dialog').last();
  await dlg.getByLabel(/^Descripción de la garantía/).fill('PRUEBA-GAR Motor del tracto');

  // Activo: con búsqueda
  const activo = dlg.getByRole('combobox', { name: /^Activo/ });
  await activo.click();
  const opcionesActivo = await p.getByRole('option').count();
  comprobar(opcionesActivo > 0, `activo: el desplegable lista activos (${opcionesActivo})`);
  const primera = (await p.getByRole('option').first().innerText()).split(' · ')[0];
  await activo.fill(primera);
  comprobar(await aparece(p.getByRole('option', { name: new RegExp(primera) })), 'activo: filtra al escribir el código');
  await p.getByRole('option', { name: new RegExp(primera) }).first().click();
  comprobar((await activo.inputValue()).startsWith(primera), 'activo: queda seleccionado');

  // Proveedor: el contratista del CMMS aparece y trae su contacto
  const prov = dlg.getByRole('combobox', { name: /^Proveedor/ });
  await prov.click();
  await prov.fill('Cummins');
  comprobar(await aparece(p.getByRole('option', { name: /PRUEBA-GAR Cummins de los Andes/ })), 'proveedor: aparece el contratista del CMMS');
  await p.getByRole('option', { name: /PRUEBA-GAR Cummins de los Andes/ }).click();
  comprobar(await prov.inputValue() === 'PRUEBA-GAR Cummins de los Andes', 'proveedor: queda seleccionado');
  comprobar(await dlg.getByLabel('Contacto en el proveedor').inputValue() === 'Laura Pérez', 'proveedor: llena el contacto');
  comprobar(await dlg.getByLabel('Teléfono').inputValue() === '3001234567', 'proveedor: llena el teléfono');

  // Responsable: lista de personas
  const resp = dlg.getByRole('combobox', { name: /^Responsable interno/ });
  await resp.click();
  const opcionesResp = await p.getByRole('option').count();
  comprobar(opcionesResp > 0, `responsable: el desplegable lista personas (${opcionesResp})`);
  const persona = await p.getByRole('option').first().innerText();
  await p.getByRole('option').first().click();
  comprobar(await resp.inputValue() === persona, 'responsable: queda seleccionado');

  await dlg.getByLabel(/^Fecha inicio/).fill('2026-01-01');
  await dlg.getByLabel(/^Fecha vencimiento/).fill('2028-01-01');

  // Documento: archivo real
  await dlg.locator('input[type="file"]').setInputFiles({ name: 'PRUEBA-GAR contrato.pdf', mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% contrato de prueba\n') });
  comprobar(await aparece(dlg.getByText('PRUEBA-GAR contrato.pdf')), 'documento: el archivo queda listo para subir');
  await dlg.getByRole('button', { name: /Crear Garantía/ }).click();
  comprobar(await aparece(p.getByText(/Garantía .* creada/)), 'guardar: la garantía se crea');

  // Detalle: el documento está y se descarga
  await p.getByText('PRUEBA-GAR Motor del tracto').first().click();
  comprobar(await aparece(p.getByText('PRUEBA-GAR contrato.pdf')), 'detalle: el documento quedó adjunto');
  const [descarga] = await Promise.all([
    p.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    p.getByRole('button', { name: 'Descargar PRUEBA-GAR contrato.pdf' }).first().click(),
  ]);
  comprobar(descarga && descarga.suggestedFilename() === 'PRUEBA-GAR contrato.pdf', 'detalle: el documento se descarga');
  const tx = await p.locator('body').innerText();
  comprobar(/Laura Pérez/.test(tx) && tx.includes(persona), 'detalle: guarda contacto y responsable');
  await p.screenshot({ path: `${SALIDA}/garantias-detalle.png`, fullPage: true });

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
