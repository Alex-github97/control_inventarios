/**
 * Recorre la terminal de planta de punta a punta, como lo haría un operario.
 *
 *   TOKEN=<jwt> node probar_terminal.cjs
 *
 * POR QUÉ EXISTE
 * La terminal es el único sitio de la plataforma donde una persona registra algo
 * que después no se puede deshacer sin dejar rastro. Comprobar que carga no
 * basta: hay que recorrerla entera —identificarse, reportar, parar, reanudar— y
 * verificar que cada paso deja el dato que dice dejar.
 *
 * A DIFERENCIA DEL AUDITOR DE BOTONES, ESTE SÍ ESCRIBE
 * Escribe contra la cuenta de demostración a propósito: es la única forma de
 * saber que el flujo completo funciona. No debe correrse contra un cliente.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'https://tittanware.tech';
const TOKEN = process.env.TOKEN;
const ESQUEMA = process.env.ESQUEMA || 'cli_demoflota';
const SALIDA = process.env.SALIDA || '/salida';

if (!TOKEN) { console.error('Falta TOKEN'); process.exit(1); }

const paso = (n, t) => console.log(`\n[${n}] ${t}`);

(async () => {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox'],
  });
  const contexto = await navegador.newContext({ viewport: { width: 1600, height: 1050 } });
  await contexto.addInitScript(([t, esquema]) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('cliente_activo', esquema);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token: t, isAuthenticated: true,
               user: { id: 1, username: 'admin', nombre: 'Administrador Demo',
                       rol: 'ADMINISTRADOR', email: 'demo@tittanware.com', permisos: {} } },
      version: 0,
    }));
  }, [TOKEN, ESQUEMA]);

  const p = await contexto.newPage();
  const fallos = [];
  p.on('pageerror', e => fallos.push('JS: ' + String(e.message).slice(0, 120)));
  p.on('response', r => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      fallos.push(`${r.status()} ${r.url().split('/api/v1')[1].split('?')[0]}`);
    }
  });
  const main = p.locator('main');

  paso(1, 'Abrir la terminal y escoger la línea');
  await p.goto(APP + '/mes/terminal', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2200);
  await main.getByText('Extrusión').first().click({ force: true });
  await p.waitForTimeout(2600);

  paso(2, 'Escoger la orden');
  const orden = main.getByText(/^OP-\d{8}-\d+$/).first();
  if (!await orden.count()) throw new Error('No apareció ninguna orden');
  const numeroOrden = (await orden.innerText()).trim();
  await orden.click({ force: true });
  await p.waitForTimeout(1800);
  console.log('    orden:', numeroOrden);

  paso(3, 'Identificarse con el usuario de la plataforma');
  await main.locator('input').first().fill('erincon');
  await main.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(2400);
  const campoPin = main.locator('input[type=password]');
  const pidePin = await campoPin.count() > 0;
  console.log('    pide PIN:', pidePin ? 'sí' : 'NO — el operario no tiene PIN');
  if (pidePin) {
    await campoPin.fill('1234');
    await main.getByRole('button', { name: 'Entrar' }).click();
    await p.waitForTimeout(3800);
  }
  await p.screenshot({ path: `${SALIDA}/t1-esquema.png` });

  const dibujado = await main.getByText(/esquema de la línea/).count();
  console.log('    esquema dibujado:', dibujado ? 'sí' : 'NO');

  paso(4, 'Pulsar la primera estación del esquema');
  // Las estaciones llevan su número de orden delante del nombre.
  const estacion = main.locator('div').filter({ hasText: /^1\./ }).last();
  await estacion.click({ force: true });
  await p.waitForTimeout(1400);
  const hayAcciones = await main.getByRole('button', { name: /Reportar avance/ }).count();
  console.log('    acciones visibles:', hayAcciones ? 'sí' : 'NO');
  await p.screenshot({ path: `${SALIDA}/t2-estacion.png` });

  paso(5, 'Reportar un avance de 120 unidades');
  if (hayAcciones) {
    await main.getByRole('button', { name: /Reportar avance/ }).click();
    await p.waitForTimeout(1100);
    const dialogo = p.locator('[role="dialog"]');
    await dialogo.locator('input[type=number]').first().fill('120');
    await dialogo.getByRole('button', { name: /Registrar/ }).click();
    await p.waitForTimeout(3000);
    console.log('    registrado');
    await p.screenshot({ path: `${SALIDA}/t3-tras-avance.png` });
  }

  paso(6, 'Reportar una avería en esa estación');
  await main.locator('div').filter({ hasText: /^1\./ }).last().click({ force: true });
  await p.waitForTimeout(1100);
  const botonAveria = main.getByRole('button', { name: /Reportar avería/ });
  if (await botonAveria.count()) {
    await botonAveria.click();
    await p.waitForTimeout(1100);
    const d = p.locator('[role="dialog"]');
    await d.getByRole('button', { name: 'Falla de la máquina' }).click();
    await d.getByRole('button', { name: /Registrar parada/ }).click();
    await p.waitForTimeout(3000);
    console.log('    avería registrada');
    await p.screenshot({ path: `${SALIDA}/t4-averia.png` });

    paso(7, 'Reanudar');
    await main.locator('div').filter({ hasText: /^1\./ }).last().click({ force: true });
    await p.waitForTimeout(1100);
    const reanudar = main.getByRole('button', { name: /Reanudar/ });
    if (await reanudar.count()) {
      await reanudar.click();
      await p.waitForTimeout(2800);
      console.log('    reanudado');
    } else {
      console.log('    NO apareció el botón de reanudar');
    }
    await p.screenshot({ path: `${SALIDA}/t5-final.png` });
  } else {
    console.log('    NO apareció el botón de avería');
  }

  console.log('\n' + '─'.repeat(60));
  console.log(fallos.length ? 'FALLOS:\n  ' + [...new Set(fallos)].join('\n  ')
                            : 'Sin errores de JavaScript ni de API.');
  await navegador.close();
})();
