/**
 * Prueba en navegador el recorrido completo de la plataforma de aprendizaje:
 * armar un curso desde cero, publicarlo, tomarlo, presentar la evaluación y
 * recibir el certificado. Luego revisa que las pantallas de administración y
 * de medición lo reflejen. Todo lo que crea lleva PRUEBA-LMS.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_lms.cjs
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
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const campo = (d, r) => d.getByLabel(new RegExp('^' + esc(r) + '(\\s*\\*)?$')).first();
async function elegir(p, d, r, opcion) {
  await d.getByRole('combobox', { name: new RegExp('^' + esc(r) + '(\\s*\\*)?(\\s|$)') }).click();
  await p.getByRole('option', { name: opcion }).first().click();
}
const aparece = async (loc, ms = 8000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1100 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/lms') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
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
  const ir = async (ruta) => { await p.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(1200); };
  const dlg = () => p.getByRole('dialog').last();

  // 1. Crear el curso desde el catálogo (lleva al curso)
  await ir('/lms/catalogo');
  await p.getByRole('button', { name: 'Nuevo curso' }).click();
  await campo(dlg(), 'Curso').fill('PRUEBA-LMS Seguridad vial');
  await elegir(p, dlg(), 'Estado', 'Publicado');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Un curso sin contenidos no se puede publicar/)), 'catálogo: no deja crear publicado sin contenidos');
  await elegir(p, dlg(), 'Estado', 'Borrador');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Curso creado/)), 'catálogo: crea el curso en borrador');
  await p.waitForURL(/\/lms\/curso\/\d+/, { timeout: 10000 });
  const cursoUrl = p.url();

  // 2. Temario
  await p.getByRole('tab', { name: 'Temario (edición)' }).click();
  await p.getByRole('button', { name: 'Nuevo módulo' }).click();
  await campo(dlg(), 'Módulo').fill('Normas básicas');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  await aparece(p.getByText(/Módulo guardado/));
  await p.getByRole('button', { name: 'Contenido' }).first().click();
  await campo(dlg(), 'Título').fill('Video de señales');
  comprobar(await dlg().getByRole('button', { name: 'Guardar' }).isDisabled(), 'temario: un video sin enlace no se guarda');
  await campo(dlg(), 'Enlace al material').fill('https://ejemplo.com/senales');
  await campo(dlg(), 'Minutos').fill('5');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Contenido guardado/)), 'temario: agrega un contenido');

  // 3. Pregunta y evaluación
  await ir('/lms/banco-preguntas');
  await p.getByRole('button', { name: 'Nueva pregunta' }).click();
  await dlg().getByLabel('Enunciado').fill('PRUEBA-LMS ¿Qué indica el semáforo en rojo?');
  await dlg().getByPlaceholder('Opción 1').fill('Pare');
  await dlg().getByPlaceholder('Opción 2').fill('Siga');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Pregunta registrada/)), 'banco: registra una pregunta con opciones');

  await ir('/lms/evaluaciones');
  await p.getByRole('button', { name: 'Nueva evaluación' }).click();
  await dlg().getByLabel(/^Nombre/).fill('PRUEBA-LMS Examen de señales');
  await elegir(p, dlg(), 'Curso', /PRUEBA-LMS Seguridad vial/);
  await dlg().getByLabel(/Preguntas \(del banco/).click();
  await p.getByRole('option', { name: /PRUEBA-LMS ¿Qué indica el semáforo/ }).click();
  await p.keyboard.press('Escape');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Evaluación registrada/)), 'evaluaciones: crea el examen del curso');

  await ir('/lms/certificaciones');
  await p.getByRole('button', { name: 'Nueva certificación' }).click();
  await campo(dlg(), 'Certificación').fill('PRUEBA-LMS Certificado de seguridad vial');
  await elegir(p, dlg(), 'Curso que la otorga', /PRUEBA-LMS Seguridad vial/);
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Certificación registrada/)), 'certificaciones: define la del curso');

  // 4. Publicar
  await ir('/lms/catalogo');
  await p.getByRole('button', { name: 'Editar PRUEBA-LMS Seguridad vial' }).click();
  await elegir(p, dlg(), 'Estado', 'Publicado');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Curso actualizado/)), 'catálogo: con contenido, se publica');

  // 5. Tomar el curso
  await p.goto(cursoUrl, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.getByRole('button', { name: 'Inscribirme' }).click();
  comprobar(await aparece(p.getByText(/Inscripción registrada/)), 'curso: inscripción');
  await p.getByRole('button', { name: 'Marcar como visto' }).first().click();
  comprobar(await aparece(p.getByText(/1 de 1 contenidos vistos/)), 'curso: marca el contenido y el avance sube a 100 %');
  await p.getByRole('tab', { name: /Evaluaciones/ }).click();
  await p.getByRole('button', { name: 'Presentar' }).click();
  await aparece(p.getByText(/intento 1 de 3/));
  comprobar(await p.getByText('Pare').count() > 0 && !(await p.getByText(/es_correcta/).count()), 'examen: muestra la pregunta sin revelar la respuesta');
  await p.getByLabel('Pare').check();
  await p.getByRole('button', { name: 'Entregar evaluación' }).click();
  comprobar(await aparece(p.getByText('¡Aprobaste!')), 'examen: califica en el servidor y aprueba');
  comprobar(await aparece(p.getByText(/Certificado CERT-\d{4}-\d+ emitido/)), 'examen: el certificado se emite solo al completar');
  await p.getByRole('button', { name: 'Cerrar' }).click();

  // 6. Mi aprendizaje y administración
  await ir('/lms/mi-aprendizaje');
  comprobar(await aparece(p.getByText('PRUEBA-LMS Certificado de seguridad vial')), 'mi aprendizaje: aparece el certificado');
  comprobar(await aparece(p.locator('text=Completado').first()), 'mi aprendizaje: curso completado');
  await ir('/lms/certificaciones');
  await p.getByRole('tab', { name: /Emitidos/ }).click();
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-LMS Certificado de seguridad vial.*Vigente/ })), 'certificaciones: el emitido figura vigente');
  await ir('/lms/reportes');
  await p.getByRole('tab', { name: 'Top de cursos' }).click();
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-LMS Seguridad vial/ })), 'reportes: el curso aparece en el top');
  await ir('/lms/conocimiento');
  comprobar(await aparece(p.getByText('Video de señales')), 'biblioteca: el material del curso publicado');
  await ir('/lms');
  const t = await p.locator('body').innerText();
  comprobar(/[1-9]\s*\n\s*Certificados vigentes/.test(t), 'tablero: certificados vigentes reales');

  comprobar(!fallidas.filter(f => !/^400 PUT \/lms\/cursos\/\d+$|^400 POST \/lms\/cursos\/nuevo$/.test(f)).length, `sin peticiones fallidas inesperadas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/lms-final.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
