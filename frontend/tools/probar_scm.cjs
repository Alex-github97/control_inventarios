/**
 * Prueba en navegador las cinco pantallas de SCM que eran maqueta.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... ORDEN=SCM-OC-... node probar_scm.cjs
 *
 * Necesita una orden de compra en camino (ORDEN) de un proveedor PRUEBA-SCM
 * para un repuesto con mínimo y sin existencias. Todo lo que crea lleva PRUEBA-SCM.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const ORDEN = process.env.ORDEN;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE || !ORDEN) { console.error('Faltan CLAVE u ORDEN'); process.exit(1); }

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
  p.on('response', r => { if (r.url().includes('/api/v1/scm') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });
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

  await ir('/scm/inventario');
  const inv = await p.locator('body').innerText();
  comprobar(!/3\.8 B|Shanghai|Zona Franca/.test(inv) && /Bodega principal/.test(inv), 'inventario: bodegas reales, sin las de la maqueta');
  comprobar(await aparece(p.getByRole('row', { name: /Sin existencias en ninguna.*Crítico/ })), 'inventario: el repuesto sin existencias sale como crítico con lo que viene en camino');

  await ir('/scm/logistica');
  const fila = p.getByRole('row', { name: new RegExp(esc(ORDEN)) });
  comprobar(await aparece(fila) && /PRUEBA-SCM Proveedor/.test(await fila.innerText()) && /días? de atraso/.test(await fila.innerText()),
    'logística: la orden aparece en camino, con proveedor y atraso');

  await ir('/scm/planificacion');
  comprobar(await aparece(p.getByText(/Reposición sugerida/)) && !/accuracy|82%|Plan Maestro/i.test(await p.locator('body').innerText()),
    'planificación: reposición calculada, sin planes ni pronósticos inventados');
  comprobar(await aparece(p.getByRole('row', { name: /REP-013.*33/ })), 'planificación: sugiere 33 (40 objetivo − 7 en camino)');

  await ir('/scm/devoluciones');
  await p.getByRole('button', { name: 'Nueva devolución' }).click();
  await elegir(p, dlg(), 'Orden de compra', new RegExp(esc(ORDEN)));
  await campo(dlg(), 'Valor devuelto').fill('15000');
  await campo(dlg(), 'Qué se devuelve y por qué').fill('PRUEBA-SCM bujías con rosca dañada');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Devolución registrada/)), 'devoluciones: registra contra una orden real');
  const fd = p.getByRole('row', { name: /PRUEBA-SCM bujías/ }).first();
  comprobar(/PRUEBA-SCM Proveedor/.test(await fd.innerText()), 'devoluciones: el proveedor sale de la orden');
  await fd.getByRole('button', { name: /^Gestionar/ }).click();
  await elegir(p, dlg(), 'Estado', 'Cerrada');
  comprobar(await dlg().getByRole('button', { name: 'Guardar' }).isDisabled(), 'devoluciones: cerrar exige la respuesta del proveedor');
  await campo(dlg(), 'Respuesta del proveedor').fill('Nota crédito NC-77');
  await campo(dlg(), 'Valor recuperado').fill('15000');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Devolución actualizada/)), 'devoluciones: se cierra con lo recuperado');

  await ir('/scm/riesgos');
  await p.getByRole('button', { name: 'Registrar riesgo' }).click();
  await campo(dlg(), 'Riesgo').fill('PRUEBA-SCM Único proveedor de bujías');
  await elegir(p, dlg(), 'Impacto', '4 · Crítico');
  await elegir(p, dlg(), 'Probabilidad', '3 · Alta');
  await elegir(p, dlg(), 'Estado', 'En mitigación');
  comprobar(await dlg().getByRole('button', { name: 'Guardar' }).isDisabled(), 'riesgos: en mitigación exige plan');
  await campo(dlg(), 'Plan de mitigación').fill('Homologar un segundo proveedor');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText(/Riesgo registrado/)), 'riesgos: registra el riesgo');
  comprobar(await aparece(p.getByRole('row', { name: /PRUEBA-SCM Único.*12.*CRITICO/ })), 'riesgos: 4 × 3 = 12, crítico');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await p.screenshot({ path: `${SALIDA}/scm-final.png`, fullPage: true });
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
