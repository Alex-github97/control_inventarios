/**
 * Prueba en navegador las doce pantallas de GRC que eran maqueta.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_grc.cjs
 *
 * Recorre el ciclo que une las pantallas: un riesgo con su tratamiento, una
 * obligación evaluada en la matriz, una auditoría con un hallazgo y su plan,
 * un incidente que no se cierra sin causa raíz, un proceso crítico con su
 * simulacro, un tercero evaluado, y comprueba que el tablero y «responsables»
 * lo reflejen. Todo lo que crea lleva PRUEBA-GRC.
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
  p.on('response', r => { if (r.url().includes('/api/v1/grc') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
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
  const hoy = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Riesgo
  await ir('/grc/riesgos');
  await p.getByRole('button', { name: 'Nuevo riesgo' }).click();
  await campo(dlg(), 'Riesgo').fill('PRUEBA-GRC Caída del WMS');
  await elegir(p, dlg(), 'Probabilidad inherente', '4 · Alta');
  await elegir(p, dlg(), 'Impacto inherente', '5 · Catastrófico');
  await elegir(p, dlg(), 'Probabilidad residual', '2 · Baja');
  await elegir(p, dlg(), 'Impacto residual', '4 · Mayor');
  await campo(dlg(), 'Responsable').fill('PRUEBA-GRC Jefe TI');
  comprobar(await dlg().getByText(/Inherente 20 · residual 8 → prioridad media/).count() > 0, 'riesgos: vista previa 20 inherente, 8 residual → media');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Riesgo registrado/)), 'riesgos: guarda el riesgo');
  await p.getByRole('row', { name: /PRUEBA-GRC Caída del WMS/ }).first().click();
  await p.getByRole('button', { name: 'Agregar' }).click();
  await campo(dlg(), 'Acción').fill('Servidor de contingencia');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Tratamiento agregado/)), 'riesgos: agrega un tratamiento');
  await p.getByRole('button', { name: 'Cerrar', exact: true }).click(); await p.waitForTimeout(500);
  await p.getByRole('tab', { name: /Mapa de calor/ }).click();
  comprobar(await p.getByText('1', { exact: true }).count() > 0, 'riesgos: el mapa de calor ubica el riesgo');

  // Obligación + matriz
  await ir('/grc/obligaciones');
  await p.getByRole('button', { name: 'Nueva obligación' }).click();
  await campo(dlg(), 'Obligación').fill('PRUEBA-GRC Ley 1581 de 2012');
  await campo(dlg(), 'Responsable').fill('PRUEBA-GRC Jefe TI');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Obligación registrada/)), 'obligaciones: registra');
  await ir('/grc/cumplimiento');
  await p.getByRole('button', { name: 'Nueva evaluación' }).click();
  await elegir(p, dlg(), 'Obligación', /PRUEBA-GRC Ley 1581/);
  await elegir(p, dlg(), 'Estado', 'Cumple');
  comprobar(await dlg().getByRole('button', { name: 'Guardar' }).isDisabled(), 'cumplimiento: «cumple» exige evidencia');
  await elegir(p, dlg(), 'Estado', 'Cumple parcialmente');
  await campo(dlg(), 'Puntaje (0-100)').fill('70');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Evaluación registrada/)), 'cumplimiento: registra la evaluación con su estado (antes se perdía al crear)');
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-GRC Ley 1581.*Cumple parcialmente.*70/ })), 'cumplimiento: la fila guarda estado y puntaje');
  await ir('/grc/obligaciones');
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-GRC Ley 1581.*Cumple parcialmente/ })), 'obligaciones: el estado sale de la matriz');

  // Auditoría + hallazgo vencido + plan
  await ir('/grc/auditorias');
  await p.getByRole('button', { name: 'Programar auditoría' }).click();
  await campo(dlg(), 'Auditoría').fill('PRUEBA-GRC Auditoría TI');
  await elegir(p, dlg(), 'Estado', 'En ejecución');
  await campo(dlg(), 'Inicio').fill(hoy);
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Auditoría registrada/)), 'auditorías: programa una en ejecución');
  await ir('/grc/hallazgos');
  await p.getByRole('button', { name: 'Nuevo hallazgo' }).click();
  await campo(dlg(), 'Hallazgo').fill('PRUEBA-GRC Sin MFA en VPN');
  await elegir(p, dlg(), 'Auditoría', /PRUEBA-GRC Auditoría TI/);
  await campo(dlg(), 'Fecha límite').fill(ayer);
  await campo(dlg(), 'Responsable').fill('PRUEBA-GRC Jefe TI');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Hallazgo registrado/)), 'hallazgos: registra');
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-GRC Sin MFA.*Vencido/ })), 'hallazgos: fecha límite pasada → vencido (calculado)');
  await p.getByRole('row', { name: /PRUEBA-GRC Sin MFA/ }).first().click();
  await p.getByRole('button', { name: 'Agregar' }).click();
  await campo(dlg(), 'Acción').fill('Activar MFA');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Plan agregado/)), 'hallazgos: agrega plan de acción');
  await p.getByRole('button', { name: 'Cerrar', exact: true }).click(); await p.waitForTimeout(500);

  // Incidente
  await ir('/grc/incidentes');
  await p.getByRole('button', { name: 'Reportar incidente' }).click();
  await campo(dlg(), 'Incidente').fill('PRUEBA-GRC Phishing a tesorería');
  await campo(dlg(), 'Qué pasó').fill('Correo falso de proveedor');
  await elegir(p, dlg(), 'Estado', 'Cerrado');
  comprobar(await dlg().getByRole('button', { name: 'Guardar' }).isDisabled(), 'incidentes: cerrar exige causa raíz');
  await campo(dlg(), 'Causa raíz').fill('Sin verificación de cambio de cuenta');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Incidente registrado/)), 'incidentes: registra cerrado');
  comprobar(!/—\s*$/.test(await p.getByRole('row', { name: /PRUEBA-GRC Phishing/ }).first().locator('td').nth(4).innerText()), 'incidentes: fecha de cierre fijada');

  // Continuidad
  await ir('/grc/continuidad');
  await p.getByRole('button', { name: 'Nuevo proceso' }).click();
  await campo(dlg(), 'Proceso').fill('PRUEBA-GRC Facturación');
  await elegir(p, dlg(), 'Criticidad', 'Crítica');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-GRC Facturación.*Nunca probado/ })), 'continuidad: proceso crítico sin simulacro se marca');
  await p.getByRole('tab', { name: 'Simulacros' }).click();
  await p.getByRole('button', { name: 'Registrar simulacro' }).click();
  await campo(dlg(), 'Simulacro').fill('PRUEBA-GRC Caída de facturación');
  await elegir(p, dlg(), 'Proceso probado', 'PRUEBA-GRC Facturación');
  await elegir(p, dlg(), 'Resultado', 'Exitoso');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Simulacro registrado/)), 'continuidad: registra simulacro');

  // Tercero
  await ir('/grc/terceros');
  await p.getByRole('button', { name: 'Nuevo tercero' }).click();
  await campo(dlg(), 'Tercero').fill('PRUEBA-GRC Transportes');
  await elegir(p, dlg(), 'Nivel de riesgo', 'Alto');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Tercero registrado/)), 'terceros: registra');
  await p.getByRole('row', { name: /PRUEBA-GRC Transportes/ }).first().click();
  await p.getByRole('button', { name: 'Evaluar' }).click();
  await campo(dlg(), 'Período').fill('2026-Q3');
  for (const [l, v] of [['Cumplimiento legal (0-100)', '80'], ['Reputación (0-100)', '70'], ['Solidez financiera (0-100)', '90'], ['Seguridad de la información (0-100)', '60']]) await campo(dlg(), l).fill(v);
  comprobar(await dlg().getByText('Puntaje: 75.0').count() > 0, 'terceros: vista previa del puntaje 75');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/75\.0 · bueno/)), 'terceros: el servidor clasifica 75 como bueno');
  await p.getByRole('button', { name: 'Cerrar', exact: true }).click(); await p.waitForTimeout(500);

  // Gobierno y tablero
  await ir('/grc/gobierno');
  await p.getByRole('tab', { name: 'Responsables' }).click();
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-GRC Jefe TI\s+1\s+0\s+1\s+1/ })), 'gobierno: responsables sale de lo asignado (1 riesgo, 1 obligación, 1 hallazgo)');
  await ir('/grc');
  const t = await p.locator('body').innerText();
  comprobar(/[1-9]\s*\n\s*Auditorías en curso/.test(t) && /[1-9]\s*\n\s*Terceros de riesgo alto o crítico/.test(t),
    'tablero: auditorías en curso y terceros críticos reales (antes fijos en cero)');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/grc-final.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
