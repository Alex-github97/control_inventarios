/**
 * Prueba en navegador las seis pantallas de calidad que eran maqueta.
 *
 *   APP=http://localhost:5173 GATEWAY=host.docker.internal EMPRESA=demo \
 *   USUARIO=... CLAVE=... node probar_qms.cjs
 *
 * No basta con que carguen —una maqueta también carga—: en cada una se crea un
 * registro por el formulario y se comprueba que vuelva del servidor. Y en las
 * que calculan algo se comprueba la cuenta, porque ahí estaba el dato inventado:
 * el NPS de la encuesta, la marca del proveedor bajo el mínimo, el estado de la
 * certificación.
 *
 * Todo lo que crea lleva la marca PRUEBA-QMS en el nombre, para borrarlo al final.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

const MARCA = 'PRUEBA-QMS';
let fallos = 0;
const ok = (t) => console.log(`ok  ${t}`);
const mal = (t) => { fallos++; console.log(`X   ${t}`); };
const comprobar = (cond, t) => (cond ? ok(t) : mal(t));

// El campo por su rótulo. Los TextField de MUI sí asocian el <label> (a
// diferencia de la pantalla de ingreso); el asterisco de obligatorio va aparte.
const rotuloExacto = (t) => new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s*\\*)?$');
const campo = (dlg, rotulo) => dlg.getByLabel(rotuloExacto(rotulo)).first();

async function elegir(p, dlg, rotulo, opcion) {
  // El nombre del combo lleva pegado el valor elegido: «Tipo de proceso MISIONAL».
  const esc = rotulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await dlg.getByRole('combobox', { name: new RegExp('^' + esc + '(\\s*\\*)?(\\s|$)') }).click();
  await p.getByRole('option', { name: opcion, exact: true }).click();
}

async function esperarToast(p, re) {
  try { await p.getByText(re).first().waitFor({ timeout: 8000 }); return true } catch { return false }
}

(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])],
  });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  const fallidas = [];
  p.on('response', r => { if (r.url().includes('/api/v1/qms') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
  p.on('dialog', d => d.accept());

  // ── Ingreso por el formulario ────────────────────────────────────────────
  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) {
    await empresa.first().fill(EMPRESA);
    await p.getByRole('button', { name: /Continuar/i }).click();
  }
  // Los rótulos del ingreso no son <label> asociados: se apunta por tipo.
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  try { await clave.waitFor({ state: 'detached', timeout: 60000 }); ok('sesión iniciada') }
  catch { mal('no se pudo iniciar sesión'); await p.screenshot({ path: `${SALIDA}/qms-login.png` }); await b.close(); process.exit(1) }

  const ir = async (ruta) => {
    await p.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(1500);
  }
  const dialogo = () => p.getByRole('dialog').last();

  // ── Procesos ─────────────────────────────────────────────────────────────
  await ir('/qms/procesos');
  await p.getByRole('button', { name: 'Nuevo Proceso' }).click();
  let d = dialogo();
  await campo(d, 'Nombre del proceso').fill(`${MARCA} Proceso`);
  await elegir(p, d, 'Tipo de proceso', 'APOYO');
  await d.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await esperarToast(p, /Proceso creado/), 'procesos: crea un proceso');
  comprobar(await p.getByText(`${MARCA} Proceso`).count() > 0, 'procesos: aparece en el mapa');
  await p.getByRole('tab', { name: /Procedimientos/ }).click();
  await p.getByRole('button', { name: 'Nuevo Procedimiento' }).click();
  d = dialogo();
  await campo(d, 'Nombre').fill(`${MARCA} Procedimiento`);
  await elegir(p, d, 'Proceso', `${MARCA} Proceso`);
  await d.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await esperarToast(p, /Procedimiento creado/), 'procesos: crea un procedimiento');
  const filaProc = p.getByRole('row', { name: new RegExp(`${MARCA} Procedimiento`) });
  comprobar((await filaProc.innerText()).includes(`${MARCA} Proceso`), 'procesos: el procedimiento muestra su proceso');

  // ── Auditorías ───────────────────────────────────────────────────────────
  await ir('/qms/auditorias');
  const planAntes = Number(await p.getByText('Planificadas', { exact: true }).locator('xpath=preceding-sibling::*[1]').innerText());
  await p.getByRole('button', { name: 'Nueva Auditoría' }).click();
  d = dialogo();
  const anio = new Date().getFullYear();
  await campo(d, 'Nombre').fill(`${MARCA} Auditoría`);
  await campo(d, 'Norma').fill('ISO 9001:2015');
  await campo(d, 'Inicio plan').fill(`${anio}-11-03`);
  await campo(d, 'Fin plan').fill(`${anio}-11-01`);
  comprobar(await d.getByText('Antes del inicio').count() > 0, 'auditorías: avisa si el fin va antes del inicio');
  comprobar(await d.getByRole('button', { name: 'Guardar' }).isDisabled(), 'auditorías: no deja guardar fechas invertidas');
  await campo(d, 'Fin plan').fill(`${anio}-11-05`);
  await d.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await esperarToast(p, /Auditoría programada/), 'auditorías: programa una auditoría');
  const fila = p.getByRole('row', { name: new RegExp(`${MARCA} Auditoría`) });
  comprobar(/AUD-\d{4}-\d{3}/.test(await fila.innerText()), 'auditorías: el servidor le asigna código');
  const planDespues = Number(await p.getByText('Planificadas', { exact: true }).locator('xpath=preceding-sibling::*[1]').innerText());
  comprobar(planDespues === planAntes + 1, `auditorías: la cifra de planificadas sube (${planAntes} → ${planDespues})`);
  await p.getByRole('tab', { name: 'Programa Anual' }).click();
  comprobar(await p.getByText(new RegExp(`${MARCA} Auditoría`)).count() > 0, 'auditorías: aparece en el programa anual');

  // ── Proveedores ──────────────────────────────────────────────────────────
  await ir('/qms/proveedores');
  await p.getByRole('button', { name: 'Nueva Evaluación' }).click();
  d = dialogo();
  await campo(d, 'Proveedor').fill(`${MARCA} Proveedor`);
  await campo(d, 'NIT').fill('900000001-0');
  // Se bajan los cuatro deslizadores con el teclado hasta 40: queda deficiente.
  for (const s of await d.getByRole('slider').all()) {
    await s.focus();
    for (let i = 0; i < 40; i++) await p.keyboard.press('ArrowLeft');
  }
  comprobar(await d.getByText(/Puntaje Total: 40\.0 → DEFICIENTE/).count() > 0, 'proveedores: la vista previa calcula 40 → deficiente');
  await d.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await esperarToast(p, /Evaluación guardada: 40\.0 · deficiente/), 'proveedores: el servidor guarda 40 · deficiente');
  comprobar(await p.getByText(new RegExp(`por debajo del puntaje mínimo de 60.*${MARCA} Proveedor`)).count() > 0,
    'proveedores: lo marca bajo el mínimo configurado');

  // ── Encuestas ────────────────────────────────────────────────────────────
  await ir('/qms/encuestas');
  await p.getByRole('button', { name: 'Nueva Encuesta' }).click();
  d = dialogo();
  await campo(d, 'Nombre de la encuesta').fill(`${MARCA} Encuesta`);
  await campo(d, 'Preguntas (una por línea, se califican de 1 a 5)').fill('¿Llegó a tiempo?\n¿Llegó completo?');
  await d.getByRole('button', { name: 'Crear Encuesta' }).click();
  comprobar(await esperarToast(p, /Encuesta creada/), 'encuestas: crea la encuesta');
  const tarjeta = () => p.locator('.MuiCard-root', { hasText: `${MARCA} Encuesta` });
  // Dos respuestas: un promotor (10) y un detractor (5) → NPS 0.
  for (const [nps, estrellas] of [[10, 5], [5, 2]]) {
    await tarjeta().getByRole('button', { name: 'Registrar respuesta' }).click();
    d = dialogo();
    await d.getByRole('button', { name: String(nps), exact: true }).click();
    // La primera fila de estrellas es la satisfacción general (CSAT).
    const radio = d.getByRole('radio', { name: estrellas === 1 ? '1 Star' : `${estrellas} Stars` }).first();
    // El radio va oculto: lo que se pulsa es su <label>, que es la estrella.
    await d.locator(`label[for="${await radio.getAttribute('id')}"]`).click();
    await d.getByRole('button', { name: 'Registrar' }).click();
    await esperarToast(p, /Respuesta registrada/);
    await p.waitForTimeout(1200);
  }
  const txt = await tarjeta().innerText();
  comprobar(/\b2\s*\n?\s*Respuestas/.test(txt), 'encuestas: cuenta 2 respuestas');
  comprobar(/\b0\s*\n?\s*NPS/.test(txt), 'encuestas: NPS = 0 (un promotor, un detractor)');
  await p.getByRole('tab', { name: 'Análisis Preguntas' }).click();
  await p.locator('[role="combobox"]').first().click();
  await p.getByRole('option', { name: `${MARCA} Encuesta` }).click();
  await p.waitForTimeout(1500);
  const analisis = await p.locator('body').innerText();
  comprobar(/Promotores \(9-10\)/.test(analisis) && analisis.includes('¿Llegó a tiempo?'), 'encuestas: el análisis sale de las respuestas');

  // ── Configuración: certificación y umbral ─────────────────────────────────
  await ir('/qms/config');
  await p.getByRole('tab', { name: 'Normas ISO' }).click();
  comprobar(!(await p.getByText('Bureau Veritas').count()), 'config: ya no inventa certificaciones');
  await p.getByRole('button', { name: 'Registrar norma' }).click();
  d = dialogo();
  await campo(d, 'Norma').fill(`${MARCA} ISO`);
  await campo(d, 'Organismo certificador').fill('Certificadora de prueba');
  const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  await campo(d, 'Otorgada').fill('2024-01-01');
  await campo(d, 'Vence').fill(en30);
  await d.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await esperarToast(p, /Certificación registrada/), 'config: registra una certificación');
  const cert = p.locator('.MuiCard-root', { hasText: `${MARCA} ISO` });
  comprobar((await cert.innerText()).includes('Por vencer'), 'config: vence en 30 días → «Por vencer», calculado');

  await p.getByRole('tab', { name: 'Umbrales' }).click();
  const umbral = p.getByLabel('Puntaje por debajo del cual un proveedor queda en alerta');
  await umbral.fill('150');
  comprobar(await p.getByRole('button', { name: 'Guardar cambios' }).isDisabled(), 'config: no deja guardar un umbral fuera de rango');
  await umbral.fill('30');
  await p.getByRole('button', { name: 'Guardar cambios' }).click();
  comprobar(await esperarToast(p, /Umbrales guardados/), 'config: guarda el umbral');
  await ir('/qms/proveedores');
  comprobar(!(await p.getByText(/por debajo del puntaje mínimo/).count()), 'proveedores: con mínimo 30 el de 40 ya no queda marcado');

  // ── Tablero ──────────────────────────────────────────────────────────────
  await ir('/qms');
  const tab = await p.locator('body').innerText();
  comprobar(!/94\.2%|CAPA #CAPA-024|Cliente XYZ/.test(tab), 'tablero: sin cifras inventadas');
  comprobar(tab.includes(`${MARCA} Auditoría`), 'tablero: la auditoría nueva está en próximas');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/qms-final.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
