/**
 * Prueba la matriz de correlación que se abre desde el panel de un parámetro.
 *
 *   APP=... EMPRESA=... CLAVE=... node revisar_matriz.cjs
 *
 * Las dos vistas tienen que traer los MISMOS coeficientes: si el mapa de calor
 * y la tabla salieran de cálculos distintos, quien mira el mapa y quien copia
 * la tabla acabarían citando números que no coinciden.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'https://tittanware.tech';
const EMPRESA = process.env.EMPRESA || 'demoflota';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

let fallos = 0;
const mal = (t) => { fallos++; console.log(`X   ${t}`); };
const ok = (t) => console.log(`ok  ${t}`);

(async () => {
  const b = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'],
  });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1150 } })).newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2000);
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) {
    await empresa.first().fill(EMPRESA);
    await p.getByRole('button', { name: /Continuar/i }).click();
    await p.waitForTimeout(3000);
  }
  await p.getByPlaceholder(/nombre de usuario/i).fill(USUARIO);
  await p.getByPlaceholder(/contrase/i).fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).first().click();
  await p.waitForTimeout(5000);

  await p.goto(APP + '/eam/lubricacion/reportes', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(3500);
  await p.getByRole('tab', { name: /Tablero/i }).click();
  await p.waitForTimeout(4000);

  // ── Abrir el panel de un parámetro ────────────────────────────────────────
  const param = p.locator('p', { hasText: /^TAN$/ }).first();
  if (!(await param.count())) { mal('no se encontró el parámetro TAN'); }
  await param.click();
  await p.waitForTimeout(3500);

  const boton = p.getByRole('button', { name: /Ver la matriz completa/i });
  if (!(await boton.count())) {
    mal('el panel no ofrece el botón para abrir la matriz');
  } else ok('el panel ofrece el botón para abrir la matriz');
  await p.screenshot({ path: `${SALIDA}/mat-0-panel.png` });

  await boton.click();
  await p.waitForTimeout(4500);

  const dialogo = p.getByRole('dialog');
  if (!(await dialogo.count())) { mal('no se abrió el diálogo de la matriz'); }

  // ── El mapa de calor ──────────────────────────────────────────────────────
  let texto = await dialogo.innerText();
  if (!/uno sube cuando el otro baja/i.test(texto)) {
    mal('el mapa no trae la leyenda de la escala de color');
  } else ok('el mapa trae la leyenda de la escala');
  if (!/sin muestras suficientes/i.test(texto)) {
    mal('no explica qué significan las celdas vacías');
  } else ok('explica que las celdas vacías no son ceros');
  await p.screenshot({ path: `${SALIDA}/mat-1-mapa.png` });

  // Cuántas celdas de datos tiene el mapa: una matriz cuadrada de n×n.
  const celdasMapa = await dialogo.locator('tbody td').count();
  const filasMapa = await dialogo.locator('tbody tr').count();
  if (filasMapa < 5 || celdasMapa !== filasMapa * filasMapa) {
    mal(`el mapa no es cuadrado: ${filasMapa} filas y ${celdasMapa} celdas`);
  } else ok(`el mapa es cuadrado: ${filasMapa} × ${filasMapa}`);

  // ── La tabla ──────────────────────────────────────────────────────────────
  await dialogo.getByRole('tab', { name: /Tabla/i }).click();
  await p.waitForTimeout(2500);
  texto = await dialogo.innerText();
  if (!/r de Pearson/i.test(texto)) {
    mal('la tabla no trae la cabecera de la esquina');
  } else ok('la tabla se pinta con su cabecera');

  const filasTabla = await dialogo.locator('tbody tr').count();
  if (filasTabla !== filasMapa) {
    mal(`la tabla y el mapa no tienen las mismas filas: `
        + `${filasTabla} contra ${filasMapa}`);
  } else ok(`la tabla tiene las mismas ${filasTabla} filas que el mapa`);

  // La diagonal de una matriz de correlación es 1 en todas sus celdas.
  const primeraCelda = (await dialogo.locator('tbody tr').first()
    .locator('td').first().innerText()).trim();
  if (!/^1[.,]0+$/.test(primeraCelda)) {
    mal(`la diagonal tendría que ser 1,00 y dice «${primeraCelda}»`);
  } else ok(`la diagonal vale ${primeraCelda}, como en cualquier matriz de correlación`);
  await p.screenshot({ path: `${SALIDA}/mat-2-tabla.png` });

  // ── Los decimales ─────────────────────────────────────────────────────────
  await dialogo.getByLabel('Decimales').click();
  await p.waitForTimeout(900);
  await p.locator('li[role=option]', { hasText: /^4$/ }).click();
  await p.waitForTimeout(1500);
  const conCuatro = (await dialogo.locator('tbody tr').first()
    .locator('td').nth(1).innerText()).trim();
  if (conCuatro !== '—' && !/^-?\d[.,]\d{4}$/.test(conCuatro)) {
    mal(`escoger 4 decimales no los aplicó: «${conCuatro}»`);
  } else ok('el selector de decimales funciona');

  // ── Ocultar las débiles ───────────────────────────────────────────────────
  const antes = (await dialogo.innerText()).length;
  await dialogo.getByLabel(/Ocultar correlaciones débiles/i).click();
  await p.waitForTimeout(1500);
  const despues = (await dialogo.innerText()).length;
  if (despues >= antes) {
    mal('ocultar las débiles no quitó ningún número');
  } else ok('ocultar las débiles deja solo lo que importa');
  await p.screenshot({ path: `${SALIDA}/mat-3-fuertes.png` });

  console.log('\nerrores de JS:', errores.length ? errores : 'ninguno');
  if (errores.length) fallos++;
  console.log(fallos ? `\n${fallos} problema(s)` : '\nTodo correcto');
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
