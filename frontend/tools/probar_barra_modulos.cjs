/**
 * Prueba en navegador la barra de módulos del encabezado: todos los módulos a
 * la vista, la rueda del mouse desplaza la fila hacia los lados y cada módulo
 * despliega sus submódulos.
 *
 *   APP=... GATEWAY=... EMPRESA=carga USUARIO=admin CLAVE=... node probar_barra_modulos.cjs
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
const ANCHO = Number(process.env.ANCHO || 1280);
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
  const p = await (await b.newContext({ viewport: { width: ANCHO, height: 850 } })).newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
  const clave = p.locator('input[type="password"]');
  await clave.waitFor({ timeout: 30000 });
  await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
  await clave.fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await clave.waitFor({ state: 'detached', timeout: 60000 });
  await p.goto(APP + '/eam/dashboard', { waitUntil: 'networkidle', timeout: 60000 });

  const barra = p.getByRole('menubar', { name: 'Módulos' });
  await barra.waitFor({ timeout: 20000 });
  const modulos = barra.getByRole('menuitem');
  const n = await modulos.count();
  comprobar(n >= 5, `la barra muestra los módulos (${n})`);
  comprobar(await p.getByRole('button', { name: /Espacios/ }).count() === 0, 'ya no está el botón «Espacios»');
  const activo = barra.locator('[data-activo="true"]');
  comprobar(await activo.count() === 1, 'hay exactamente un módulo activo');
  await p.screenshot({ path: `${SALIDA}/barra_${ANCHO}_inicio.png` });

  // Rueda vertical => desplazamiento horizontal
  const antes = await barra.evaluate(el => ({ x: el.scrollLeft, desborda: el.scrollWidth > el.clientWidth }));
  if (antes.desborda) {
    await barra.hover();
    await p.mouse.wheel(0, 400);
    await p.waitForTimeout(400);
    const x = await barra.evaluate(el => el.scrollLeft);
    comprobar(x > antes.x, `la rueda mueve la fila hacia la derecha (${antes.x} → ${x})`);
    const yPagina = await p.evaluate(() => window.scrollY);
    comprobar(yPagina === 0, 'la página no se desplazó hacia abajo');
    comprobar(await p.getByRole('button', { name: 'Ver módulos anteriores' }).isVisible(), 'aparece la flecha izquierda');
    await p.screenshot({ path: `${SALIDA}/barra_${ANCHO}_desplazada.png` });
    await p.mouse.wheel(0, -2000);
    await p.waitForTimeout(400);
  } else {
    console.log('-- a este ancho caben todos: no hay desplazamiento que probar');
  }

  // Desplegar el CMMS y entrar a un submódulo
  const eam = barra.getByRole('menuitem').filter({ hasText: /EAM|CMMS|Mantenimiento/ }).first();
  await eam.scrollIntoViewIfNeeded();
  await eam.click();
  const menu = p.getByRole('menu');
  await menu.waitFor({ timeout: 10000 });
  const opciones = await menu.getByRole('menuitem').allInnerTexts();
  comprobar(opciones.length > 5, `el módulo despliega sus submódulos (${opciones.length})`);
  comprobar(/Inicio de/.test(opciones[0]), 'la primera opción lleva al inicio del módulo');
  await p.screenshot({ path: `${SALIDA}/barra_${ANCHO}_menu.png` });
  const llantas = menu.getByRole('menuitem').filter({ hasText: /Neum|Llant|Tires$/ }).first();
  await llantas.click();
  await p.waitForURL(/\/eam\/neumaticos/, { timeout: 15000 });
  comprobar(true, 'al elegir un submódulo navega a él');
  let cerrado = true
  try { await p.getByRole('menu').waitFor({ state: 'hidden', timeout: 4000 }) } catch { cerrado = false }
  comprobar(cerrado, 'el menú se cierra al navegar')
  await p.screenshot({ path: `${SALIDA}/barra_${ANCHO}_llantas.png` });

  // Otro módulo distinto al activo
  const otro = barra.getByRole('menuitem').filter({ hasText: /^WMS/ }).first();
  if (await otro.count()) {
    await otro.scrollIntoViewIfNeeded();
    await otro.click();
    await p.getByRole('menu').waitFor({ timeout: 10000 });
    const txt = (await p.getByRole('menu').getByRole('menuitem').allInnerTexts()).join(' | ');
    comprobar(txt.length > 0 && !/Neumáticos|Tires/.test(txt), 'otro módulo muestra sus propios submódulos');
    await p.keyboard.press('Escape');
  }

  comprobar(errores.length === 0, `sin errores de página ${errores.join(' · ')}`);
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
  await b.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
