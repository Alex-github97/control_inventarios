/**
 * Prueba en navegador el asistente de reuniones del CRM (tareas 2.5 y 4.3).
 *
 * - Micrófono negado: el aviso sale y la reunión sigue PROGRAMADA.
 * - Grabación con micrófono simulado de Chromium; a mitad se corta la red y se
 *   vuelve a conectar: el audio armado en el servidor debe durar lo grabado.
 * - Revisión de una reunión sembrada (backend/tests/datos_reuniones_navegador.py):
 *   editar, aprobar, descartar, ir a la evidencia y cerrar.
 *
 * Imprime REUNION=<id> para que quien lo corre verifique la duración del audio.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const SALIDA = process.env.SALIDA || '/salida';
const REVISAR = process.env.REUNION_REVISAR;
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 30000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
const esperar = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
           ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, permissions: ['microphone'] });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  // El 503 de la credencial en vivo es lo esperado en un servidor sin clave de OpenAI.
  p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 500
    && !(r.status() === 503 && r.url().includes('/vivo/credencial'))) errores.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });
  if (process.env.API) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    await route.continue({ url: process.env.API + u.pathname + u.search });
  });

  // Ingreso (los rótulos no son <label>: se ubican los campos por tipo).
  await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  if (await p.getByText('Ingrese a su empresa').count()) {
    await p.locator('input:visible').first().fill(process.env.EMPRESA);
    await p.getByRole('button', { name: /Continuar/i }).click();
  }
  const c = p.locator('input[type="password"]');
  await c.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
  await c.fill(process.env.CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await c.waitFor({ state: 'detached', timeout: 60000 });

  // ── Crear la reunión desde la pantalla ────────────────────────────────────
  await p.goto(APP + '/crm/reuniones', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText('Se graban, se transcriben')), 'la pantalla de reuniones abre');
  comprobar(await aparece(p.getByText(/La transcripción no está configurada/)), 'avisa que la transcripción no está configurada (servidor sin clave)');
  await p.getByRole('button', { name: 'Nueva reunión' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Cliente').click();
  await p.getByRole('option', { name: process.env.CLIENTE }).click();
  await dlg.getByLabel('Tema de la reunión').fill('Visita de prueba del navegador');
  await dlg.getByText('Marta Gómez').click();
  await dlg.getByRole('button', { name: 'Crear reunión' }).click();
  await p.waitForURL(/\/crm\/reuniones\/\d+$/, { timeout: 30000 });
  const rid = p.url().split('/').pop();
  comprobar(await aparece(p.getByText('Antes de grabar')), 'pide el aviso antes de grabar');
  comprobar(await p.getByRole('button', { name: 'Confirmar aviso' }).isDisabled(), 'no se puede confirmar sin marcar que avisó');
  await p.getByText('Avisé a los asistentes').click();
  await p.getByRole('button', { name: 'Confirmar aviso' }).click();
  comprobar(await aparece(p.getByRole('button', { name: 'Grabar aquí' })), 'con el aviso confirmado aparece «Grabar aquí»');

  // ── Micrófono negado ──────────────────────────────────────────────────────
  await p.evaluate(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('negado', 'NotAllowedError')) });
  await p.getByRole('button', { name: 'Grabar aquí' }).click();
  comprobar(await aparece(p.getByText(/no dio acceso al micrófono/)), 'micrófono negado: avisa que no puede grabar');
  comprobar(await aparece(p.getByText('Programada')), 'micrófono negado: la reunión sigue Programada');
  await p.reload({ waitUntil: 'networkidle' });

  // ── Grabar, cortar la red, volver, terminar ───────────────────────────────
  await p.getByRole('button', { name: 'Grabar aquí' }).click();
  comprobar(await aparece(p.getByRole('button', { name: 'Terminar y procesar' })), 'empieza a grabar');
  // Texto en vivo: en este servidor no hay clave, así que la sesión falla. Lo
  // que importa es que la grabación siga sin interrupción.
  await p.getByText('Texto en vivo').click();
  comprobar(await aparece(p.getByText(/El texto en vivo se apagó .*La grabación sigue normal/)), 'si el texto en vivo falla, lo avisa');
  comprobar(await p.getByRole('button', { name: 'Terminar y procesar' }).isVisible(), 'y la grabación continúa');
  await esperar(14000);
  await ctx.setOffline(true);
  comprobar(await aparece(p.getByText(/Sin conexión: \d+ trozos guardados en este equipo/), 25000), 'sin red: guarda los trozos en el equipo');
  await p.screenshot({ path: `${SALIDA}/reuniones_sin_red.png` });
  await esperar(6000);
  await ctx.setOffline(false);
  comprobar(await aparece(p.getByRole('button', { name: 'Terminar y procesar' })), 'sigue grabando al volver la red');
  await esperar(9000);
  const reloj = await p.locator('text=/^\\d+:\\d{2}$/').first().textContent().catch(() => '');
  await p.getByRole('button', { name: 'Terminar y procesar' }).click();
  comprobar(await aparece(p.getByText('Procesando'), 60000), 'al terminar, la reunión queda Procesando');
  console.log(`REUNION=${rid} RELOJ=${reloj}`);
  await p.screenshot({ path: `${SALIDA}/reuniones_procesando.png` });

  // ── Revisión de la reunión sembrada ───────────────────────────────────────
  if (REVISAR) {
    await p.goto(APP + `/crm/reuniones/${REVISAR}`, { waitUntil: 'networkidle' });
    comprobar(await aparece(p.getByText('Transcripción')), 'la reunión por revisar muestra la transcripción');
    comprobar(await aparece(p.getByText('Compromisos (2)')), 'muestra los dos compromisos propuestos');
    comprobar(await p.getByRole('button', { name: 'Cerrar revisión' }).isDisabled(), 'no se puede cerrar con puntos por revisar');
    await p.getByText(/les envío el reporte de novedades el jueves» · min 0:20/).click();
    comprobar(await p.waitForFunction(() => [...document.querySelectorAll('div')].some(d =>
      d.textContent?.startsWith('0:20') && getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)'), null, { timeout: 5000 })
      .then(() => true).catch(() => false), 'la cita salta al tramo del minuto 0:20 y lo resalta');
    // Fecha del compromiso nuestro (no definida) → 5 de noviembre, y aprobar.
    // Cada punto de la revisión es un [data-punto]; se ubica por su descripción.
    const punto = desc => p.locator('[data-punto]').filter({ has: p.locator(`input[value="${desc}"]`) });
    const nuestro = punto('Ajustar la ventana de cargue');
    comprobar(await aparece(nuestro.getByText('No definida')), 'el compromiso sin fecha dice «No definida»');
    await nuestro.locator('input[type="date"]').fill('2026-11-05');
    await esperar(1500);
    await nuestro.getByRole('button', { name: 'Aprobar' }).click();
    comprobar(await aparece(p.getByText('Aprobado · actividad creada')), 'aprobar el compromiso nuestro crea la actividad');
    const cliente = punto('Enviar el reporte de novedades');
    await cliente.getByRole('button', { name: 'Aprobar' }).click();
    await aparece(p.getByText('Aprobado', { exact: true }));
    const acuerdo = punto('Cargue de 6 a 10 a. m. desde noviembre');
    await acuerdo.getByRole('button', { name: 'Descartar' }).click();
    comprobar(await aparece(p.getByText('Descartado')), 'descartar deja el punto como Descartado');
    await p.getByRole('button', { name: 'Cerrar revisión' }).click();
    comprobar(await aparece(p.getByText('Cerrada')), 'cerrar la revisión deja la reunión Cerrada');
    comprobar(await aparece(p.getByRole('button', { name: 'Marcar cumplido' })), 'los compromisos aprobados quedan en seguimiento');
    await p.screenshot({ path: `${SALIDA}/reuniones_revision.png`, fullPage: true });
  }

  comprobar(!errores.length, `sin errores de página ni 500 (${errores.slice(0, 3).join(' | ')})`);
  await b.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
