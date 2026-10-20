/**
 * Prueba en navegador la pestaña «Costo flota propia» del comparativo SICETAC
 * y el desplazamiento lateral de las pestañas con la rueda del mouse.
 * Guarda un CPK de prueba: quien la corre debe dejar después la configuración
 * como estaba (PUT /tarifax/comparativo/flota).
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const SALIDA = process.env.SALIDA || '/salida';
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const aparece = async (loc, ms = 30000) => { try { await loc.first().waitFor({ timeout: ms }); return true } catch { return false } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  // Angosta a propósito: así las pestañas no caben y hay que desplazarlas.
  const p = await (await b.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
  if (process.env.API) await p.route('**/api/v1/**', async route => {
    const u = new URL(route.request().url());
    await route.continue({ url: process.env.API + u.pathname + u.search });
  });
  await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  if (await p.getByText('Ingrese a su empresa').count()) {
    await p.locator('input:visible').first().fill(process.env.EMPRESA || 'demo');
    await p.getByRole('button', { name: /Continuar/i }).click();
  }
  const c = p.locator('input[type="password"]');
  await c.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
  await c.fill(process.env.CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await c.waitFor({ state: 'detached', timeout: 60000 });

  await p.goto(APP + '/tarifax/comparativo', { waitUntil: 'networkidle' });
  const tabFlota = p.getByRole('tab', { name: /Costo flota propia/ });
  comprobar(await aparece(tabFlota, 60000), 'existe la pestaña Costo flota propia');
  await p.screenshot({ path: `${SALIDA}/flota_inicio.png` });
  console.log('errores:', errores.join(' | '));

  // La rueda del mouse sobre las pestañas las mueve hacia los lados.
  const scroller = p.locator('.MuiTabs-scroller').last();
  await scroller.scrollIntoViewIfNeeded();
  const antes = await scroller.evaluate(el => el.scrollLeft);
  const caja = await scroller.boundingBox();
  await p.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await p.mouse.wheel(0, 300);
  await p.waitForTimeout(400);
  const despues = await scroller.evaluate(el => el.scrollLeft);
  comprobar(despues > antes, `la rueda desplaza las pestañas (${antes} → ${despues})`);
  await p.screenshot({ path: `${SALIDA}/flota_pestanas.png`, clip: { x: 0, y: caja.y - 20, width: 1100, height: 120 } });

  // Configurar el CPK desde la sección de cargue.
  if (!(await p.getByRole('button', { name: 'Configurar costo flota' }).isVisible())) await p.getByText('Cargue de datos').click();
  comprobar(await aparece(p.getByText('Costo flota propia').first()), 'la sección de cargue muestra el costo de flota');
  await p.getByRole('button', { name: 'Configurar costo flota' }).click();
  const d = p.getByRole('dialog');
  comprobar(await aparece(d.getByLabel('CPK TURBO')), 'el diálogo pide el CPK por tipología');
  await d.getByLabel('CPK TURBO').fill('3000');
  await d.getByLabel('CPK SENCILLO').fill('3500');
  await d.getByLabel('CPK TRACTOMULA').fill('6000');
  await p.screenshot({ path: `${SALIDA}/flota_dialogo.png` });
  await d.getByRole('button', { name: 'Guardar' }).click();
  comprobar(await aparece(p.getByText('TURBO: $ 3.000/km')), 'el CPK guardado se ve en la sección de cargue');

  await tabFlota.click();
  comprobar(await aparece(p.getByRole('columnheader', { name: 'Sobrecosto' })), 'la tabla trae la columna Sobrecosto');
  comprobar(await aparece(p.getByRole('columnheader', { name: 'Costo total de ruta' })), 'la tabla trae Costo total de ruta');
  comprobar(await aparece(p.getByText('Margen sobre la tarifa')), 'muestra el margen sobre la tarifa');
  comprobar(!(await p.getByText('Por cliente', { exact: true }).count()), 'sin la tabla por cliente');
  // Orden con un clic: primero de mayor a menor, el segundo clic invierte.
  const tabla = p.locator('table').last();
  const columna = async n => (await tabla.locator(`tbody tr td:nth-child(${n})`).allInnerTexts()).map(x => x.trim());
  const km = async () => (await columna(4)).map(x => Number(x.replace(/\./g, '')));
  await tabla.getByRole('button', { name: 'Km', exact: true }).click();
  let v = await km();
  comprobar(v.length > 1 && v.every((x, i) => !i || v[i - 1] >= x), `Km de mayor a menor (${v.slice(0, 3).join(', ')}…)`);
  await tabla.getByRole('button', { name: 'Km', exact: true }).click();
  v = await km();
  comprobar(v.every((x, i) => !i || v[i - 1] <= x), `segundo clic: Km de menor a mayor (${v.slice(0, 3).join(', ')}…)`);
  await tabla.getByRole('button', { name: 'Cliente', exact: true }).click();
  const cl = await columna(1);
  comprobar(cl.every((x, i) => !i || cl[i - 1].localeCompare(x, 'es') >= 0), `Cliente de Z a A (${cl[0]})`);
  await p.getByRole('columnheader', { name: 'Costo total de ruta' }).first().scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SALIDA}/flota_tabla.png`, fullPage: false });

  comprobar(!errores.length, `sin errores en la página ${errores.join(' | ')}`);
  await b.close();
  console.log(fallos ? `${fallos} FALLAS` : 'TODO OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
