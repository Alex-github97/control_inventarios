/**
 * Prueba en navegador las catorce pantallas de APS contra la cadena simulada
 * de `backend/tools/simular_planeacion_aps.py`, cuyos efectos se conocen:
 * jugos estacionales, tapas atrasadas, envasadora al límite, exactitud
 * publicada del 90 %. Además recorre el ciclo completo con escrituras reales:
 * cargar demanda, publicar, ajustar y aprobar el consenso, aprobar y recibir
 * una orden, simular un escenario y cerrar un ciclo S&OP.
 *
 * Lo que crea lleva PRUEBA-APS; el simulador lo limpia con --limpiar.
 *
 *   APP=... GATEWAY=... EMPRESA=demo USUARIO=... CLAVE=... node probar_aps.cjs
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
const aparece = async (loc, ms = 20000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };
const mes = (d = new Date(), k = 0) => { const x = new Date(d.getFullYear(), d.getMonth() + k, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage();
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
  const fila = (t) => p.locator('tr', { hasText: t }).first();
  const dlg = () => p.getByRole('dialog').last();

  // Tablero
  await ir('/aps');
  comprobar(await aparece(p.getByText('Riesgos del plan')), 'tablero: KPIs y riesgos del plan');
  comprobar(await aparece(p.getByText(/atrasada/i)), 'tablero: la orden atrasada sembrada aparece como riesgo');

  // Configuración: un producto nuevo
  await ir('/aps/config');
  await p.getByRole('tab', { name: 'Productos' }).click();
  await p.getByRole('button', { name: 'Nuevo producto' }).click();
  await dlg().getByLabel(/^Código/).fill('PRUEBA-APS1');
  await dlg().getByLabel(/^Nombre/).fill('PRUEBA-APS Néctar de mora');
  await dlg().getByLabel(/^Familia/).fill('Bebidas');
  await dlg().getByLabel(/^Costo unitario/).fill('2500');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText('Producto registrado')), 'configuración: crea un producto');

  // Demanda: pegar historia del producto nuevo
  await ir('/aps/demanda');
  await p.getByRole('tab', { name: 'Historia' }).click();
  await p.getByRole('button', { name: /Pegar desde hoja de cálculo/ }).click();
  const lineas = Array.from({ length: 10 }, (_, i) => `PRUEBA-APS1\tSIM-PLB\t${mes(new Date(), i - 10)}\t${400 + i * 10}`).join('\n');
  await dlg().getByLabel('Datos de demanda').fill('producto\tubicacion\tmes\tcantidad\n' + lineas);
  await dlg().getByRole('button', { name: 'Guardar demanda' }).click();
  comprobar(await aparece(p.getByText('10 registros de demanda guardados')), 'demanda: pega 10 meses desde hoja de cálculo');
  await p.getByRole('button', { name: /Pegar desde hoja de cálculo/ }).click();
  await dlg().getByLabel('Datos de demanda').fill('NO-EXISTE\tSIM-PLB\t2025-01\t10');
  await dlg().getByRole('button', { name: 'Guardar demanda' }).click();
  comprobar(await aparece(dlg().getByText(/producto «NO-EXISTE» no existe/)), 'demanda: rechaza un producto inexistente y dice la línea');
  await dlg().getByRole('button', { name: 'Cancelar' }).click();

  // Pronóstico: la serie estacional elige Holt-Winters; publicar
  await p.getByRole('tab', { name: 'Pronóstico' }).click();
  await aparece(fila('SIM-JUG1 · SIM Jugo de naranja 1 L'));
  const jugo = p.locator('tr', { hasText: 'SIM-JUG1' }).filter({ hasText: 'SIM Planta Bogotá' }).first();
  comprobar(/Holt-Winters/.test(await jugo.innerText()), 'pronóstico: el jugo estacional usa Holt-Winters');
  await p.locator('tr', { hasText: 'SIM-JUG1' }).filter({ hasText: 'SIM Planta Bogotá' }).first().click();
  comprobar(await aparece(p.getByText('Métodos probados (en los meses que no vieron)')), 'pronóstico: muestra la comparación de métodos');
  await p.getByRole('button', { name: /Publicar como versión oficial/ }).click();
  comprobar(await aparece(p.getByText(/Versión v1 · HOLT_WINTERS publicada/)), 'pronóstico: publica la versión oficial');

  // Consenso: proponer y aprobar un ajuste
  await p.getByRole('tab', { name: 'Consenso' }).click();
  await aparece(p.getByText('Proponer un ajuste'));
  // «Mes» también es el botón del módulo MES del menú: se busca el combobox.
  await p.getByRole('combobox', { name: 'Mes' }).click(); await p.getByRole('option').first().click();
  await p.getByLabel(/Ajuste \(\+\/− unidades\)/).fill('500');
  await p.getByLabel('Justificación').fill('PRUEBA-APS campaña de temporada');
  await p.getByRole('button', { name: 'Proponer' }).click();
  comprobar(await aparece(p.getByText('Ajuste propuesto')), 'consenso: propone un ajuste');
  await p.getByRole('button', { name: 'Aprobar' }).first().click();
  comprobar(await aparece(p.getByText(/Ajuste aprobado/)), 'consenso: aprueba el ajuste');
  comprobar(await aparece(p.getByRole('cell', { name: '+500' })), 'consenso: el ajuste aprobado suma al consenso');

  // Exactitud publicada sembrada: 90 % con sesgo +10 %
  await p.getByRole('tab', { name: 'Exactitud' }).click();
  comprobar(await aparece(p.getByText('90 %')), 'exactitud: lo publicado da 90 %');
  comprobar(await aparece(p.getByText('+10 %')), 'exactitud: con sesgo +10 %');

  // Plan: la orden atrasada, aprobar y recibir
  await ir('/aps/plan');
  comprobar(await aparece(p.locator('tr', { hasText: 'SIM-TAP' }).filter({ hasText: 'Atrasada' })), 'plan: las tapas sin stock salen atrasadas');
  const antes = await p.locator('tbody tr').count();
  await p.locator('tr', { hasText: 'SIM-TAP' }).first().getByRole('button', { name: 'Aprobar' }).click();
  comprobar(await aparece(p.getByText(/aprobada: ya cuenta como recepción programada/)), 'plan: aprueba una orden');
  await p.getByRole('tab', { name: 'Detalle por producto' }).click();
  comprobar(await aparece(p.getByText('Recepciones aprobadas')), 'plan: detalle MPS por producto');
  await p.getByRole('tab', { name: 'Órdenes aprobadas' }).click();
  await p.locator('tr', { hasText: 'SIM-TAP' }).first().getByRole('button', { name: 'Recibir' }).click();
  comprobar(await aparece(p.getByText('Orden recibida: existencias actualizadas')), 'plan: recibe la orden y actualiza existencias');
  await p.getByRole('tab', { name: 'Versiones' }).click();
  await p.getByRole('button', { name: 'Guardar versión del plan' }).click();
  await dlg().getByLabel('Nombre de la versión').fill('PRUEBA-APS plan de prueba');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText('Versión del plan guardada')), 'plan: guarda una versión');

  // Capacidad, inventario, distribución, transporte
  await ir('/aps/capacidad');
  comprobar(await aparece(p.getByText('SIM Envasadora').first()) && /SIM Envasadora|SIM Mezcladora/.test(await p.locator('body').innerText()), 'capacidad: identifica el cuello de botella');
  await ir('/aps/inventario');
  comprobar(await aparece(p.getByText('Stock seguridad')), 'inventario: parámetros calculados');
  await p.getByRole('tab', { name: 'Matriz ABC-XYZ' }).click();
  comprobar(await aparece(p.getByText(/^AX · \d+/)), 'inventario: matriz ABC-XYZ');
  await ir('/aps/distribucion');
  await p.getByRole('tab', { name: /Traslados sugeridos/ }).click();
  comprobar(await aparece(p.locator('tr', { hasText: 'SIM CD Medellín' })), 'distribución: traslados a los centros');
  await ir('/aps/transporte');
  comprobar(await aparece(p.getByText('SIM Planta Bogotá → SIM CD Medellín').first()), 'transporte: consolida en camiones por ruta');
  comprobar(await aparece(p.getByText('12.000 kg').first()), 'transporte: usa la restricción de 12 t de la planta');

  // Escenarios
  await ir('/aps/escenarios');
  await p.getByRole('button', { name: 'Nuevo escenario' }).click();
  await dlg().getByLabel(/^Nombre/).fill('PRUEBA-APS demanda +30 %');
  await dlg().getByLabel(/^Cambio en la demanda/).fill('30');
  await dlg().getByRole('button', { name: 'Guardar' }).click();
  await aparece(p.getByText('Escenario registrado'));
  await fila('PRUEBA-APS demanda +30 %').getByRole('button', { name: 'Simular' }).click();
  comprobar(await aparece(p.getByText('Simulación completa'), 60000), 'escenarios: simula el plan completo');
  comprobar(/\+\d/.test(await fila('Unidades a producir').innerText()), 'escenarios: más demanda, más producción');

  // Restricciones
  await ir('/aps/restricciones');
  comprobar(/Sí/.test(await fila('SIM Bodega de Cali').innerText()), 'restricciones: la bodega la aplica el motor');
  comprobar(await aparece(p.getByText(/TOC, paso 1/)), 'restricciones: identifica la restricción del sistema');

  // S&OP
  await ir('/aps/soip');
  await p.getByRole('button', { name: 'Nuevo ciclo' }).click();
  await dlg().getByLabel('Nombre').fill('PRUEBA-APS S&OP');
  await dlg().getByLabel('Mes que se planea').fill(mes(new Date(), 1));
  await dlg().getByRole('button', { name: 'Crear' }).click();
  comprobar(await aparece(p.getByText('Ciclo creado')), 's&op: crea el ciclo');
  await p.getByText('PRUEBA-APS S&OP').first().click();
  comprobar(await aparece(p.locator('tr', { hasText: 'Bebidas' })), 's&op: tablero del mes por familia');
  await p.getByLabel('Acuerdos del ciclo').fill('PRUEBA-APS producir el pico de jugos en noviembre');
  await p.getByRole('button', { name: 'Guardar acuerdos' }).click();
  await aparece(p.getByText('Acuerdos guardados'));
  await p.getByRole('button', { name: 'Cerrar ciclo' }).click();
  comprobar(await aparece(p.getByText('Ciclo cerrado')), 's&op: cierra el ciclo con acuerdos');

  // KPIs, analítica, reportes
  await ir('/aps/kpis');
  comprobar(await aparece(p.getByText('Cómo se calcula')), 'kpis: cada indicador con su fórmula');
  await ir('/aps/ia');
  comprobar(await aparece(p.getByText(/Demanda intermitente/)), 'analítica: clasifica la demanda intermitente del repuesto');
  await ir('/aps/reportes');
  await p.getByRole('tab', { name: 'Órdenes del plan' }).click();
  const [desc] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.getByRole('button', { name: 'Descargar Excel' }).click()]);
  comprobar(!!desc, 'reportes: descarga a Excel');

  comprobar(!fallidas.length, `sin peticiones fallidas${fallidas.length ? ': ' + fallidas.join(' | ') : ''}`);
  comprobar(!errores.length, `sin errores de página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  for (const [ruta, nombre] of [['/aps', 'tablero'], ['/aps/demanda', 'demanda'], ['/aps/plan', 'plan'], ['/aps/capacidad', 'capacidad']]) {
    await ir(ruta); await p.screenshot({ path: `${SALIDA}/aps-${nombre}.png`, fullPage: true })
  }
  await b.close();
  console.log(`\n${fallos ? `${fallos} FALLOS` : 'TODO BIEN'}`);
  process.exit(fallos ? 1 : 0);
})();
