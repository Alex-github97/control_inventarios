/**
 * Prueba los tres cortes de flota: marca, línea y motor.
 *
 *   APP=... EMPRESA=... CLAVE=... node revisar_cortes.cjs
 *
 * Tienen que hacer lo mismo que el panel de un parámetro —clic, panel fijo,
 * matriz— pero acotando el cálculo al segmento. Lo que de verdad hay que
 * comprobar es lo último: que la matriz que abren NO sea la de toda la flota.
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
const muestrasDe = (t) => {
  const m = t.match(/sobre\s+(\d+)\s+muestra/i);
  return m ? Number(m[1]) : null;
};

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
  await p.waitForTimeout(4500);

  // ── Los tres cuadros existen ──────────────────────────────────────────────
  const cuerpo = await p.locator('body').innerText();
  for (const t of ['Por marca', 'Por línea', 'Por motor']) {
    if (!cuerpo.includes(t)) mal(`falta el cuadro «${t}»`);
    else ok(`existe el cuadro «${t}»`);
  }
  // Los equipos sin motor registrado se cuentan, no se esconden.
  if (!/no tienen ese dato registrado/i.test(cuerpo)) {
    mal('no dice cuántas muestras quedan fuera por falta del dato');
  } else ok('dice cuántas muestras quedan fuera del corte');
  await p.screenshot({ path: `${SALIDA}/cort-0-tablero.png` });

  // ── El panel de cada corte, y que acote de verdad ─────────────────────────
  const total = 170;
  for (const [cuadro, quien] of [
    ['Por marca', /^Ver la correlación de Kenworth$/i],
    ['Por línea', /^Ver la correlación de \w+/i],
    ['Por motor', /^Ver la correlación de Detroit/i],
  ]) {
    const fila = p.getByRole('button', { name: quien }).first();
    if (!(await fila.count())) { mal(`«${cuadro}»: no hay filas con acción`); continue; }
    const etiqueta = (await fila.getAttribute('aria-label'))
      .replace('Ver la correlación de ', '');

    await fila.click();
    await p.waitForTimeout(4000);
    const panel = await p.locator('body').innerText();
    if (!/se mueven juntos en este segmento|Correlación de Pearson dentro/i.test(panel)) {
      mal(`«${cuadro}» (${etiqueta}): el panel no se abrió`);
      await p.keyboard.press('Escape');
      continue;
    }
    const n = muestrasDe(panel);
    if (n === null) {
      mal(`«${cuadro}» (${etiqueta}): el panel no dice sobre cuántas muestras`);
    } else if (n >= total) {
      mal(`«${cuadro}» (${etiqueta}): usó ${n} muestras, o sea toda la flota; `
          + 'no acotó al segmento');
    } else {
      ok(`«${cuadro}» → ${etiqueta}: acota a ${n} de ${total} muestras`);
    }
    await p.screenshot({ path: `${SALIDA}/cort-${cuadro.split(' ')[1]}.png` });

    // La matriz que abre tiene que llevar el segmento en el título.
    const boton = p.getByRole('button', { name: /Ver la matriz completa/i });
    if (!(await boton.count())) {
      mal(`«${cuadro}» (${etiqueta}): el panel no ofrece la matriz`);
      await p.keyboard.press('Escape');
      continue;
    }
    await boton.click();
    await p.waitForTimeout(4500);
    const dialogo = p.getByRole('dialog');
    const enDialogo = await dialogo.innerText();
    if (!enDialogo.includes(etiqueta)) {
      mal(`la matriz de «${etiqueta}» no dice a qué segmento corresponde`);
    } else ok(`la matriz se abre rotulada «${etiqueta}»`);
    const nMatriz = muestrasDe(enDialogo);
    if (nMatriz !== n) {
      mal(`la matriz de «${etiqueta}» usa ${nMatriz} muestras y el panel ${n}: `
          + 'no están mirando lo mismo');
    } else ok(`la matriz de «${etiqueta}» usa las mismas ${nMatriz} muestras`);

    await dialogo.getByRole('button', { name: /Cerrar/i }).click();
    await p.waitForTimeout(1500);
  }
  await p.screenshot({ path: `${SALIDA}/cort-9-final.png` });

  console.log('\nerrores de JS:', errores.length ? errores : 'ninguno');
  if (errores.length) fallos++;
  console.log(fallos ? `\n${fallos} problema(s)` : '\nTodo correcto');
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
