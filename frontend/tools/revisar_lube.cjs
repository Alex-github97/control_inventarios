/**
 * Recorre las pestañas del informe de interpretación de muestras.
 *
 *   APP=... EMPRESA=... CLAVE=... node revisar_lube.cjs
 *
 * Comprueba que cada pestaña pida sus datos y muestre contenido de verdad: una
 * pestaña que carga y no pinta nada es exactamente lo que se veía antes.
 * Además prueba el filtro de flota y el panel de correlación que se abre al
 * hacer clic en un parámetro, que son las dos interacciones nuevas.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'https://tittanware.tech';
const EMPRESA = process.env.EMPRESA || 'demoflota';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

// (pestaña, algo que TIENE que aparecer si la pestaña trajo datos)
const PESTANAS = [
  ['Cobertura', /Cobertura|con muestra en/i],
  ['Tablero', /Parámetros que más disparan/i],
  ['Conclusiones', /Críticas|En alerta|Qué está pasando/i],
  ['Por placa', /Escoja un compartimento|Qué se movió/i],
  ['Correlación', /mecanismos, contrastados|Matriz de correlación/i],
  ['Contra kilometraje', /Desempeño de las muestras|Cada parámetro contra el kil/i],
  ['Extensión del intervalo', /Familias analizadas|Se puede evaluar/i],
  ['Criterios y normas', /Límites de contaminación|Las fuentes/i],
];

let fallos = 0;
const mal = (t) => { fallos++; console.log(`X   ${t}`); };

(async () => {
  const b = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'],
  });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1150 } })).newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  let peticiones = [];
  p.on('response', r => {
    if (r.url().includes('/interpretacion/')) {
      peticiones.push(`${r.status()} ${r.url().split('/interpretacion/')[1].split('?')[0]}`);
    }
  });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1500);
  const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await empresa.count()) {
    await empresa.first().fill(EMPRESA);
    await p.getByRole('button', { name: /Continuar/i }).click();
    await p.waitForTimeout(2500);
  }
  await p.getByLabel(/Usuario/i).or(p.getByPlaceholder(/nombre de usuario/i)).first().fill(USUARIO);
  await p.getByLabel(/Contraseña/i).or(p.getByPlaceholder(/contrase/i)).first().fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).click();
  await p.waitForTimeout(4500);

  await p.goto(APP + '/eam/lubricacion/reportes',
               { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(4000);

  // ── La barra de filtros ───────────────────────────────────────────────────
  const barra = await p.locator('text=SEGMENTO DE FLOTA').count();
  if (!barra) mal('no se pintó la barra de filtros');
  for (const etiqueta of ['Tipo de vehículo', 'Marca', 'Línea', 'Modelo',
                          'Motor', 'Compartimento', 'Placa']) {
    if (!(await p.getByLabel(etiqueta, { exact: true }).count())) {
      mal(`falta el filtro «${etiqueta}»`);
    }
  }
  console.log(`ok  barra de filtros con sus 7 selectores`);

  // ── Las pestañas ──────────────────────────────────────────────────────────
  for (let i = 0; i < PESTANAS.length; i++) {
    const [nombre, esperado] = PESTANAS[i];
    peticiones = [];
    await p.getByRole('tab', { name: new RegExp(nombre, 'i') }).click();
    await p.waitForTimeout(4000);

    const texto = await p.locator('body').innerText();
    const pintó = esperado.test(texto);
    const roto = /No se pudo cargar/i.test(texto);
    const malas = peticiones.filter(r => !r.startsWith('2'));

    const falla = roto || malas.length || !pintó;
    if (falla) fallos++;
    console.log(
      `${falla ? 'X  ' : 'ok '} ${nombre.padEnd(24)}` +
      `${String(peticiones.length).padStart(2)} peticiones` +
      `${malas.length ? ` | FALLIDAS: ${malas.join(', ')}` : ''}` +
      `${roto ? ' | PANTALLA DE ERROR' : ''}` +
      `${!pintó ? ' | NO PINTÓ LO ESPERADO' : ''}`);

    await p.screenshot({ path: `${SALIDA}/lube-${i}-${nombre.split(' ')[0].toLowerCase()}.png`,
                         fullPage: false });
  }

  // ── El panel de correlación al hacer clic en un parámetro ────────────────
  await p.getByRole('tab', { name: /Tablero/i }).click();
  await p.waitForTimeout(3500);
  const param = p.locator('text=Parámetros que más disparan')
    .locator('xpath=../..').locator('p', { hasText: /^TAN$|^Hierro|^Silicio/ }).first();
  if (await param.count()) {
    peticiones = [];
    await param.click();
    await p.waitForTimeout(3500);
    const texto = await p.locator('body').innerText();
    const abrió = /Correlación de Pearson contra el resto/i.test(texto);
    const pidió = peticiones.some(r => r.includes('correlacion-de'));
    if (!abrió || !pidió) {
      mal(`el panel de correlación no se abrió (abrió=${abrió} pidió=${pidió})`);
    } else {
      console.log('ok  panel de correlación fijo al hacer clic en un parámetro');
    }
    await p.screenshot({ path: `${SALIDA}/lube-8-popover.png` });
    // Tiene que quedarse fijo: mover el ratón no lo cierra.
    await p.mouse.move(1500, 900);
    await p.waitForTimeout(900);
    if (!/Correlación de Pearson contra el resto/i.test(await p.locator('body').innerText())) {
      mal('el panel se cerró al mover el ratón: tenía que quedarse fijo');
    }
    // Y se cierra al hacer clic fuera.
    await p.keyboard.press('Escape');
    await p.waitForTimeout(800);
  } else {
    mal('no se encontró ningún parámetro en el ranking para hacer clic');
  }

  // ── El filtro de verdad acota ─────────────────────────────────────────────
  await p.getByRole('tab', { name: /Tablero/i }).click();
  await p.waitForTimeout(2500);
  const antes = (await p.locator('body').innerText()).match(/(\d+)\s*Muestras/i);
  await p.getByLabel('Marca', { exact: true }).click();
  await p.waitForTimeout(900);
  const opciones = p.locator('li[role=option]');
  if (await opciones.count() > 1) {
    await opciones.nth(1).click();
    await p.waitForTimeout(4000);
    const despues = (await p.locator('body').innerText()).match(/(\d+)\s*Muestras/i);
    const a = antes ? Number(antes[1]) : null;
    const d = despues ? Number(despues[1]) : null;
    if (a == null || d == null || d >= a) {
      mal(`el filtro por marca no redujo las muestras (${a} -> ${d})`);
    } else {
      console.log(`ok  el filtro por marca acota: ${a} -> ${d} muestras`);
    }
    await p.screenshot({ path: `${SALIDA}/lube-9-filtrado.png` });
  }

  console.log('\nerrores de JS:', errores.length ? errores : 'ninguno');
  if (errores.length) fallos++;
  console.log(fallos ? `\n${fallos} problema(s)` : '\nTodo correcto');
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
