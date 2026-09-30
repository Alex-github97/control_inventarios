/**
 * Prueba en navegador tres pantallas que eran reales solo a medias:
 *  - Tablero de MES (antes: líneas, órdenes, paradas y alertas inventadas).
 *    Usa la planta de `backend/tools/simular_planta_mes.py`, que deja una
 *    parada abierta hace 90 minutos y una ejecución en curso.
 *  - Jerarquía de activos de EAM (antes: un centro de distribución inventado).
 *  - Configuración de EAM: umbrales, integraciones y disponibilidad (antes:
 *    valores que vivían en el navegador y estados «ACTIVO» inventados).
 * Deja los umbrales y las horas como estaban.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_mixtas.cjs
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
const aparece = async (loc, ms = 15000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
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
  const ir = async (ruta) => { await p.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(800) };
  const dlg = () => p.getByRole('dialog').last();

  // ── Tablero de MES ──
  await ir('/mes');
  comprobar(await aparece(p.getByText('SIM Equipo 2 · SIM Falla de motor')), 'mes: la parada abierta real aparece');
  comprobar(await aparece(p.getByText(/Parada abierta hace 1 h/)), 'mes: alerta por parada de más de una hora');
  comprobar(await aparece(p.locator('tr', { hasText: 'SIM Línea 1' })), 'mes: las líneas reales con su OEE');
  comprobar(!(await p.getByText('Robot Soldadura R-02').count()), 'mes: ya no aparecen las paradas inventadas');
  await p.getByRole('button', { name: 'Cerrar parada SIM Falla de motor' }).click();
  comprobar(await aparece(p.getByText('Parada cerrada: su duración queda registrada')), 'mes: cierra la parada en el servidor');
  await p.getByRole('button', { name: 'Registrar parada' }).click();
  await dlg().getByLabel('Ejecución en curso').click(); await p.getByRole('option').first().click();
  await dlg().getByLabel('Causa').fill('PRUEBA atasco en la banda de salida');
  await dlg().getByRole('button', { name: 'Registrar' }).click();
  comprobar(await aparece(p.getByText('Parada registrada')), 'mes: registra una parada nueva');
  comprobar(await aparece(p.getByText(/PRUEBA atasco en la banda de salida/)), 'mes: la parada nueva queda en curso');
  await p.screenshot({ path: `${SALIDA}/mes-tablero.png`, fullPage: true });

  // ── Jerarquía de activos ──
  await ir('/eam/activos');
  await p.getByRole('tab', { name: 'Jerarquía' }).click();
  comprobar(!(await p.getByText('Centro de Distribución Bogotá').count()), 'activos: ya no aparece la jerarquía inventada');
  comprobar(await aparece(p.getByText('Sin sede')), 'activos: agrupa los activos reales por sede');

  // ── Configuración de EAM ──
  await ir('/eam/configuracion');
  if (!(await p.getByRole('tab', { name: 'Umbrales de aviso' }).count())) await ir('/eam/config');
  await p.getByRole('tab', { name: 'Umbrales de aviso' }).click();
  const garantia = p.getByLabel(/avisar que una garantía vence/);
  await aparece(garantia);
  const antes = await garantia.inputValue();
  await garantia.fill('60');
  await p.getByRole('button', { name: 'Guardar umbrales' }).click();
  comprobar(await aparece(p.getByText('Umbrales guardados')), 'umbrales: se guardan en el servidor');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  await p.getByRole('tab', { name: 'Umbrales de aviso' }).click();
  comprobar(await p.getByLabel(/avisar que una garantía vence/).inputValue() === '60', 'umbrales: persisten al recargar');
  await p.getByLabel(/avisar que una garantía vence/).fill(antes);
  await p.getByRole('button', { name: 'Guardar umbrales' }).click();
  await aparece(p.getByText('Umbrales guardados'));
  await p.getByRole('tab', { name: 'Integraciones' }).click();
  comprobar(await aparece(p.getByText('TMS · Transporte')), 'integraciones: solo la conexión real con TMS');
  comprobar(await aparece(p.getByText(/no están conectados hoy con el CMMS/)), 'integraciones: dice lo que no está conectado');
  await p.getByRole('tab', { name: 'Disponibilidad' }).click();
  comprobar(await aparece(p.locator('tr', { hasText: 'VEH-001' })), 'disponibilidad: lista los activos reales');
  await p.getByRole('button', { name: /Aplicar a los \d+ de la lista/ }).click();
  comprobar(await aparece(p.getByText(/activo\(s\) actualizados/)), 'disponibilidad: guarda las horas programadas');
  comprobar(await aparece(p.locator('tr', { hasText: 'VEH-001' }).getByText('176')), 'disponibilidad: el activo muestra 176 h');
  await p.getByRole('button', { name: 'Volver a continuo' }).click();
  await aparece(p.getByText(/activo\(s\) actualizados/));

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
