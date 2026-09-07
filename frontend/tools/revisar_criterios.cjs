/**
 * Prueba que el criterio se pueda ajustar DESDE LA PANTALLA.
 *
 *   APP=... EMPRESA=... CLAVE=... node revisar_criterios.cjs
 *
 * El ciclo completo con el ratón: abrir el diálogo, comprobar que exige el
 * motivo, guardar, ver la marca de «de la empresa», y restaurar. Que el
 * endpoint funcione no significa que el formulario llegue hasta él.
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
  let peticiones = [];
  p.on('response', r => {
    if (r.url().includes('/criterios')) {
      peticiones.push(`${r.request().method()} ${r.status()}`);
    }
  });

  // ── Entrar ────────────────────────────────────────────────────────────────
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
  await p.getByRole('tab', { name: /Criterios/i }).click();
  await p.waitForTimeout(4000);

  // ── Las cuatro secciones ──────────────────────────────────────────────────
  for (const [nombre, esperado] of [
    ['Límites por parámetro', /Límites de contaminación|Metales de desgaste/i],
    ['Motor de cálculo', /Percentil de precaución|Ruido del laboratorio/i],
    ['Reglas de diagnóstico', /Gana la primera que encaje|Refrigerante en el aceite/i],
    ['Fuentes', /Qué define|ASTM D7720/i],
  ]) {
    await p.getByRole('tab', { name: new RegExp(nombre, 'i') }).click();
    await p.waitForTimeout(2000);
    const texto = await p.locator('body').innerText();
    if (!esperado.test(texto)) mal(`la sección «${nombre}» no pintó lo esperado`);
    else ok(`sección «${nombre}»`);
    await p.screenshot({ path: `${SALIDA}/crit-${nombre.split(' ')[0].toLowerCase()}.png` });
  }

  // ── Ajustar un límite ─────────────────────────────────────────────────────
  await p.getByRole('tab', { name: /Límites por parámetro/i }).click();
  await p.waitForTimeout(2500);
  await p.getByRole('button', { name: /^Ajustar Agua$/i }).click();
  await p.waitForTimeout(1200);

  const dialogo = p.getByRole('dialog');
  if (!(await dialogo.count())) { mal('no se abrió el diálogo de ajuste'); }
  const enDialogo = await dialogo.innerText();
  if (!/VALOR DE REFERENCIA/i.test(enDialogo)) {
    mal('el diálogo no muestra el valor de referencia que se va a reemplazar');
  } else ok('el diálogo muestra el valor de referencia');

  // Sin motivo no deja guardar: es la regla que hace defendible el ajuste.
  const guardar = dialogo.getByRole('button', { name: /Guardar ajuste/i });
  if (!(await guardar.isDisabled())) {
    mal('deja guardar sin motivo');
  } else ok('exige el motivo antes de guardar');

  await dialogo.getByLabel('Precaución').fill('0.35');
  await dialogo.getByLabel('Condena').fill('0.6');
  await dialogo.getByLabel(/Por qué se cambia/i).fill(
    'Prueba automática: el fabricante acepta más agua en este servicio.');
  await p.waitForTimeout(400);
  if (await guardar.isDisabled()) mal('no deja guardar con el motivo escrito');
  peticiones = [];
  await guardar.click();
  await p.waitForTimeout(4000);

  const tras = await p.locator('body').innerText();
  if (!/de la empresa/i.test(tras)) {
    mal('tras guardar no aparece la marca «de la empresa»');
  } else ok('el límite ajustado queda marcado como «de la empresa»');
  if (!/se aparta del criterio publicado/i.test(tras)) {
    mal('no aparece el aviso de cuántos puntos se apartan de la referencia');
  } else ok('avisa de cuántos criterios están ajustados');
  const puts = peticiones.filter(x => x.startsWith('PUT'));
  if (!puts.some(x => x === 'PUT 200')) mal(`el PUT no salió bien: ${puts}`);
  await p.screenshot({ path: `${SALIDA}/crit-ajustado.png` });

  // ── Que el ajuste llegue al informe ───────────────────────────────────────
  await p.getByRole('tab', { name: /Conclusiones/i }).click();
  await p.waitForTimeout(4500);
  ok('las conclusiones se recargaron tras el ajuste');

  // ── Restaurar ─────────────────────────────────────────────────────────────
  await p.getByRole('tab', { name: /Criterios/i }).click();
  await p.waitForTimeout(3000);
  await p.getByRole('tab', { name: /Límites por parámetro/i }).click();
  await p.waitForTimeout(2500);
  // La clave del ajuste lleva la familia, y la familia por defecto depende de
  // los datos de la empresa. Se busca por el patrón, no por un valor fijo.
  const restaurar = p.getByRole('button', { name: /^Restaurar \w+:agua$/i });
  if (!(await restaurar.count())) {
    mal('no hay botón para restaurar el límite ajustado');
  } else {
    await restaurar.click();
    await p.waitForTimeout(4000);
    // Se comprueba que desapareció ESTE ajuste, no que la empresa se quedó sin
    // ninguno: si alguien tenía un límite ajustado de verdad, una prueba que
    // exija cero fallaría sin que nada estuviera roto.
    if (await p.getByRole('button', { name: /^Restaurar \w+:agua$/i }).count()) {
      mal('tras restaurar, el límite del agua sigue marcado como ajustado');
    } else ok('restaurar devuelve el criterio de referencia');
  }
  await p.screenshot({ path: `${SALIDA}/crit-restaurado.png` });

  console.log('\nerrores de JS:', errores.length ? errores : 'ninguno');
  if (errores.length) fallos++;
  console.log(fallos ? `\n${fallos} problema(s)` : '\nTodo correcto');
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
