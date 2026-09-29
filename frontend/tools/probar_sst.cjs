/**
 * Prueba en navegador las diez pantallas de SST, que eran maqueta.
 *
 *   APP=http://localhost:5173 GATEWAY=host.docker.internal EMPRESA=demo \
 *   USUARIO=... CLAVE=... node probar_sst.cjs
 *
 * Lo que importa comprobar no es que carguen sino que calculen bien: el nivel
 * GTC 45 mientras se llena la matriz, que un accidente no se cierre sin
 * causas, que los indicadores aparezcan solo cuando hay horas-hombre.
 * Todo lo que crea lleva PRUEBA-SST.
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
  await p.getByRole('option', { name: opcion, exact: true }).click();
}
const aparece = async (loc, ms = 8000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1100 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => { if (r.url().includes('/api/v1/sst') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
  let respuestaPrompt = '';
  p.on('dialog', d => d.accept(respuestaPrompt));

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

  // ── Matriz GTC 45 ────────────────────────────────────────────────────────
  await ir('/sst/riesgos');
  await p.getByRole('button', { name: 'Nuevo peligro' }).click();
  await campo(dlg(), 'Proceso').fill('PRUEBA-SST Taller');
  await campo(dlg(), 'Actividad o tarea').fill('Soldadura');
  await elegir(p, dlg(), 'Clase de peligro', 'Físico');
  await elegir(p, dlg(), 'Nivel de deficiencia (ND)', '6 · Alto');
  await elegir(p, dlg(), 'Nivel de exposición (NE)', '2 · Ocasional');
  await elegir(p, dlg(), 'Nivel de consecuencia (NC)', '60 · Muy grave');
  comprobar(await dlg().getByText(/NP 12 · NR 720 → I · No aceptable/).count() > 0, 'matriz: la vista previa calcula 6×2×60 = 720 → I');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Riesgo registrado/)), 'matriz: guarda el peligro');
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-SST Taller.*720/ })), 'matriz: aparece con NR 720');

  // ── Incidentes: no se cierra sin investigar ──────────────────────────────
  await ir('/sst/incidentes');
  await p.getByRole('button', { name: 'Reportar evento' }).click();
  await elegir(p, dlg(), 'Tipo de evento', 'Accidente de trabajo');
  await campo(dlg(), 'Trabajador').fill('PRUEBA-SST Operario');
  await campo(dlg(), 'Qué pasó').fill('Corte en la mano');
  await campo(dlg(), 'Días de incapacidad').fill('3');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Evento registrado/)), 'incidentes: reporta un accidente');
  const fila = p.getByRole('row', { name: /PRUEBA-SST Operario/ }).first();
  await fila.getByRole('button', { name: /^Iniciar investigación/ }).click(); await p.waitForTimeout(800);
  await fila.getByRole('button', { name: /^Marcar investigado/ }).click(); await p.waitForTimeout(800);
  await fila.getByRole('button', { name: /^Cerrar/ }).click();
  comprobar(await aparece(p.getByText(/Registra las causas de la investigación/)), 'incidentes: no deja cerrar el accidente sin causas');
  await fila.getByRole('button', { name: /^Editar/ }).click();
  await campo(dlg(), 'Causa inmediata').fill('Uso de herramienta sin guarda');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  await aparece(p.getByText(/Evento actualizado/));
  await p.waitForTimeout(800);
  await fila.getByRole('button', { name: /^Cerrar/ }).click();
  comprobar(await aparece(fila.getByText('Cerrado')), 'incidentes: con causas, se cierra');

  // ── EPP: devolución ──────────────────────────────────────────────────────
  await ir('/sst/epp');
  await p.getByRole('button', { name: 'Registrar entrega' }).click();
  await campo(dlg(), 'Trabajador').fill('PRUEBA-SST Operario');
  await elegir(p, dlg(), 'Tipo de EPP', 'Manos (guantes)');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Entrega registrada/)), 'EPP: registra una entrega');
  respuestaPrompt = 'Desgaste';
  await p.getByRole('row', { name: /PRUEBA-SST Operario.*Manos/ }).first().getByRole('button', { name: /^Devolver/ }).click();
  comprobar(await aparece(p.getByText(/Devolución registrada/)), 'EPP: registra la devolución');
  respuestaPrompt = '';

  // ── Configuración: período → indicadores ─────────────────────────────────
  await ir('/sst/config');
  await p.getByRole('tab', { name: 'Metas' }).click();
  await p.getByLabel('Índice de frecuencia máximo (AT / millón h-h)').fill('9');
  await p.getByRole('button', { name: 'Guardar cambios' }).click();
  comprobar(await aparece(p.getByText(/Configuración guardada/)), 'config: guarda una meta');
  await p.getByRole('tab', { name: 'Períodos' }).click();
  await p.getByRole('button', { name: 'Registrar mes' }).click();
  await campo(dlg(), 'Trabajadores').fill('50');
  await campo(dlg(), 'Horas-hombre trabajadas').fill('10000');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Período guardado/)), 'config: registra el mes con horas-hombre');

  await ir('/sst/indicadores');
  const tarjeta = await p.locator('.MuiPaper-root', { hasText: 'Índice de frecuencia (IF)' }).first().innerText();
  comprobar(/Meta ≤ 9/.test(tarjeta) && !/^—/.test(tarjeta.split('\n')[1] ?? ''), 'indicadores: IF calculado y comparado con la meta guardada');
  comprobar(!(await p.getByText('94.2').count()) && !(await p.getByText('7.0 ').count()), 'indicadores: sin cifras de la maqueta');

  // ── Emergencias ──────────────────────────────────────────────────────────
  await ir('/sst/emergencias');
  await p.getByRole('button', { name: 'Agregar brigadista' }).click();
  await campo(dlg(), 'Nombre').fill('PRUEBA-SST Brigadista');
  await elegir(p, dlg(), 'Rol en la brigada', 'Primeros auxilios');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Brigadista registrado/)), 'emergencias: agrega un brigadista');
  await p.getByRole('tab', { name: 'Simulacros' }).click();
  await p.getByRole('button', { name: 'Registrar simulacro' }).click();
  await campo(dlg(), 'Escenario').fill('PRUEBA-SST Sismo');
  await campo(dlg(), 'Tiempo de evacuación (s)').fill('245');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Simulacro registrado/)), 'emergencias: registra un simulacro');
  comprobar(await aparece(p.getByText('4 min 5 s')), 'emergencias: muestra el tiempo como 4 min 5 s');

  // ── Tablero ──────────────────────────────────────────────────────────────
  await ir('/sst');
  const tab = await p.locator('body').innerText();
  comprobar(/0 d/.test(tab) && !/47d|47 d/.test(tab), 'tablero: días sin accidente reales (0), no los 47 de la maqueta');

  comprobar(!fallidas.filter(f => !/^4\d\d PATCH .*estado/.test(f)).length, `sin peticiones fallidas inesperadas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/sst-final.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
