/**
 * Prueba en navegador el módulo GRC reconstruido: que cada pantalla cargue sin
 * caerse, que los formularios usen catálogos y personas (no texto libre), que
 * un valor nuevo se agregue al catálogo desde el formulario, y que la ficha
 * muestre el riesgo con sus controles, tratamientos e indicadores.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_grc_modulo.cjs
 *
 * Crea registros con el prefijo «UI-PRUEBA»; el guion que lo lanza los borra.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 15000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

const RUTAS = ['/grc', '/grc/gobierno', '/grc/politicas', '/grc/obligaciones', '/grc/riesgos', '/grc/controles',
  '/grc/cumplimiento', '/grc/terceros', '/grc/auditorias', '/grc/hallazgos', '/grc/continuidad', '/grc/incidentes',
  '/grc/ia', '/grc/config'];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errores = [], fallidas = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  p.on('response', r => { if (r.url().includes('/api/v1/grc') && r.status() >= 500) fallidas.push(`${r.status()} ${r.url().split('/api/v1')[1]}`) });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(process.env.EMPRESA || 'demo'); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
  await clave.fill(process.env.CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });

  // 1. Todas las pantallas cargan.
  for (const r of RUTAS) {
    await p.goto(APP + r, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(800);
    const caida = await p.getByText('Esta pantalla no se pudo mostrar').count()
    comprobar(!caida, `carga ${r}`);
    if (caida) await p.screenshot({ path: `${SALIDA}/grc-caida-${r.replace(/\//g, '_')}.png` });
  }

  const elegir = async (etiqueta, texto) => {
    const campo = p.getByRole('dialog').getByLabel(etiqueta, { exact: false }).first();
    await campo.click(); await campo.fill(texto);
    const op = p.getByRole('option').filter({ hasText: texto }).first();
    await op.waitFor({ timeout: 8000 }); await op.click();
  };
  const primeraPersona = async (etiqueta) => {
    const campo = p.getByRole('dialog').getByLabel(etiqueta, { exact: false }).first();
    await campo.click();
    const op = p.getByRole('option').first(); await op.waitFor({ timeout: 8000 }); await op.click();
  };
  const seleccion = async (etiqueta, texto) => {
    await p.getByRole('dialog').getByLabel(etiqueta, { exact: false }).first().click();
    await p.getByRole('option').filter({ hasText: texto }).first().click();
  };

  // 2. Comité con un tipo NUEVO agregado desde el formulario.
  await p.goto(APP + '/grc/gobierno', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Nuevo comité' }).click();
  await p.getByRole('dialog').getByLabel('Nombre del comité').fill('UI-PRUEBA Comité de seguridad vial');
  const tipo = p.getByRole('dialog').getByLabel('Tipo', { exact: false }).first();
  await tipo.click(); await tipo.fill('UI-PRUEBA Comité vial');
  const agregar = p.getByRole('option', { name: /Agregar «UI-PRUEBA Comité vial» al catálogo/ });
  comprobar(await aparece(agregar, 8000), 'el formulario ofrece agregar el valor al catálogo');
  await agregar.click();
  await p.waitForTimeout(800);
  await elegir('Se reúne', 'Mensual');
  await primeraPersona('Presidente');
  await p.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.locator('tr', { hasText: 'UI-PRUEBA Comité de seguridad vial' })), 'comité creado con tipo nuevo y presidente de la lista');
  comprobar(await aparece(p.locator('tr', { hasText: 'UI-PRUEBA Comité vial' })), 'el tipo nuevo quedó guardado');

  // 3. Riesgo con catálogos, persona y matriz configurada.
  await p.goto(APP + '/grc/riesgos', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Nuevo riesgo' }).click();
  await p.getByRole('dialog').getByRole('textbox', { name: /^Riesgo/ }).first().fill('UI-PRUEBA Robo de mercancía en tránsito');
  await elegir('Categoría', 'Operativo');
  await primeraPersona('Dueño del riesgo');
  await seleccion('Probabilidad', '4 ·');
  await seleccion('Impacto', '5 ·');
  comprobar(await aparece(p.getByText(/Nivel inherente/)), 'vista previa del nivel con las bandas');
  await p.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  const fila = p.locator('tr', { hasText: 'UI-PRUEBA Robo de mercancía' }).first();
  comprobar(await aparece(fila), 'riesgo creado');
  comprobar(/20/.test(await fila.innerText()) && /Operativo/.test(await fila.innerText()), 'nivel 20 y categoría del catálogo');

  // 4. Ficha del riesgo.
  await fila.click();
  comprobar(await aparece(p.getByText('Controles que lo mitigan')), 'ficha: panel de controles');
  comprobar(await aparece(p.getByText('Tratamientos')), 'ficha: tratamientos');
  comprobar(await aparece(p.getByText('Indicadores clave de riesgo (KRI)')), 'ficha: indicadores');
  await p.getByRole('tab', { name: 'Historial' }).click();
  comprobar(await aparece(p.getByText(/Crear/)), 'ficha: historial con la creación');
  await p.screenshot({ path: `${SALIDA}/grc-ficha-riesgo.png` });
  await p.keyboard.press('Escape');

  // 5. Configuración: matriz editable y catálogos de GRC.
  await p.goto(APP + '/grc/config', { waitUntil: 'networkidle' });
  comprobar(await aparece(p.getByText('Bandas de prioridad')), 'configuración: bandas');
  comprobar(await aparece(p.getByText('Cómo se calcula el riesgo residual')), 'configuración: metodología del residual');
  await p.getByRole('tab', { name: 'Catálogos' }).click();
  comprobar(await aparece(p.getByText('Tipos de comité')), 'configuración: catálogo de tipos de comité');
  comprobar(await aparece(p.getByText('Marcos normativos')), 'configuración: marcos normativos');

  comprobar(!fallidas.length, `sin errores 5xx${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  console.log(`\n${fallos ? fallos + ' FALLOS' : 'todo bien'}`);
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
