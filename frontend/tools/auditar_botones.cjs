/**
 * Pulsa cada botón de la aplicación y dice cuáles no hacen nada.
 *
 *   TOKEN=<jwt> RUTAS=/tools/rutas.txt node auditar_botones.cjs
 *
 * POR QUÉ HACE FALTA
 * Que una pantalla cargue sin errores no dice nada de sus botones. Un botón
 * muerto —uno que guarda un estado que nadie lee, o que quedó de una maqueta— se
 * ve idéntico a uno que funciona: mismo color, mismo cursor, misma animación al
 * pulsarlo. Solo se descubre pulsándolo, y el usuario lo descubre antes que
 * nadie.
 *
 * CÓMO DECIDE SI UN BOTÓN «HIZO ALGO»
 * Cuatro señales, cualquiera basta:
 *   1. Cambió la dirección — navegó a otra pantalla.
 *   2. Se abrió o se cerró un diálogo.
 *   3. Salió una petición al servidor.
 *   4. Cambió el contenido de la página de forma apreciable.
 * Si no pasa ninguna, el botón no hace nada y se reporta con su texto, que es lo
 * que permite encontrarlo en el código.
 *
 * POR QUÉ ES SEGURO PULSAR TODO
 * Se bloquea toda petición que no sea de lectura: POST, PUT, PATCH y DELETE se
 * abortan antes de salir. Así se puede pulsar «Aprobar» o «Eliminar» sin tocar
 * ni un dato, y el botón igual cuenta como vivo porque la petición se intentó.
 * Sin ese bloqueo, una revisión completa dejaría la cuenta de demostración
 * irreconocible.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

const APP = process.env.APP || 'https://tittanware.tech';
const TOKEN = process.env.TOKEN;
const EJECUTABLE = process.env.CHROME || '/usr/bin/chromium-browser';
const ESQUEMA = process.env.ESQUEMA || 'cli_demoflota';
const TOPE = Number(process.env.TOPE || 24);   // botones por pantalla
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;

if (!TOKEN && !process.env.CLAVE) { console.error('Falta TOKEN o USUARIO/CLAVE'); process.exit(1); }

const RUTAS = fs.readFileSync(process.env.RUTAS || '/tools/rutas.txt', 'utf8')
  .split('\n').map(x => x.trim()).filter(Boolean)
  .filter(r => !['/login', '/sin-acceso', '/scanner-movil', '/empresa'].includes(r))
  .filter(r => !SOLO || SOLO.some(p => r === p || r.startsWith(p + '/')));

// Botones que se saltan aunque las escrituras estén bloqueadas: cerrar sesión
// saca la sesión y deja el resto de la revisión sin token.
const NO_TOCAR = /cerrar sesi|salir|logout|colapsar|expandir/i;

(async () => {
  // En local el servidor de desarrollo corre en el anfitrión: GATEWAY resuelve
  // «localhost» hacia él sin tocar la configuración de Vite.
  const GATEWAY = process.env.GATEWAY || '';
  const navegador = await chromium.launch({
    executablePath: EJECUTABLE,
    args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])],
  });
  const contexto = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  if (process.env.CLAVE) {
    // Con usuario y clave se entra por el formulario, igual que una persona.
    const p0 = await contexto.newPage();
    await p0.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
    const empresa = p0.getByLabel(/[Cc]ódigo de la empresa/);
    if (await empresa.count()) { await empresa.first().fill(process.env.EMPRESA || 'demo'); await p0.getByRole('button', { name: /Continuar/i }).click(); }
    const clave = p0.locator('input[type="password"]');
    await clave.waitFor({ timeout: 30000 });
    await p0.locator('input:not([type="password"]):visible').first().fill(process.env.USUARIO);
    await clave.fill(process.env.CLAVE);
    await p0.getByRole('button', { name: /Ingresar/i }).first().click();
    await clave.waitFor({ state: 'detached', timeout: 60000 });
    await p0.close();
  } else await contexto.addInitScript(([t, esquema]) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('cliente_activo', esquema);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: t, isAuthenticated: true,
        user: {
          id: 1, username: 'admin', nombre: 'Administrador Demo',
          rol: 'ADMINISTRADOR', email: 'demo@tittanware.com', permisos: {},
        },
      },
      version: 0,
    }));
  }, [TOKEN, ESQUEMA]);

  const pagina = await contexto.newPage();

  // Nada que escriba llega al servidor.
  let peticiones = 0;
  await pagina.route('**/api/**', (ruta) => {
    const metodo = ruta.request().method();
    peticiones++;
    if (metodo === 'GET' || metodo === 'HEAD') return ruta.continue();
    // Se responde un error creíble para que la pantalla siga su camino normal
    // en vez de quedarse esperando para siempre.
    return ruta.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Revisión en curso: no se escriben datos.' }),
    });
  });

  // Una descarga (PDF, Excel armados en el navegador) no pide nada al servidor
  // ni cambia la página, pero es exactamente lo que el botón debía hacer.
  let descargas = 0;
  pagina.on('download', () => { descargas++; });
  pagina.on('popup', () => { descargas++; });
  // Una confirmación nativa («¿Retirar este control?») y el selector de
  // archivos también son la respuesta del botón. La confirmación se descarta:
  // así no se ejecuta nada.
  pagina.on('dialog', (d) => { descargas++; d.dismiss().catch(() => {}); });
  pagina.on('filechooser', () => { descargas++; });

  // Qué está marcado en la página: pestañas, botones de alternar, desplegables
  // abiertos, casillas. Una pestaña cuyo contenido está vacío cambia muy poco
  // texto, pero sí cambia esto.
  const estado = () => pagina.evaluate(() => [
    '[aria-selected="true"]', '[aria-pressed="true"]', '[aria-expanded="true"]',
    '.Mui-selected', '.Mui-checked', '[aria-current="page"]',
  ].map(sel => [...document.querySelectorAll(sel)]
    .map(e => (e.textContent || '').trim().slice(0, 30)).join('|')).join('#')).catch(() => '');

  const muertos = [];
  const resumen = [];

  for (const ruta of RUTAS) {
    try {
      await pagina.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 45000 });
    } catch { continue; }
    await pagina.waitForTimeout(1800);

    let cuantos = 0, vivos = 0, sinEfecto = 0;
    try {
      const candidatos = pagina.locator(
        'main button:visible, main [role="button"]:visible, ' +
        'main a[href]:visible, [role="dialog"] button:visible');
      cuantos = Math.min(await candidatos.count(), TOPE);

      for (let i = 0; i < cuantos; i++) {
        const boton = candidatos.nth(i);
        let texto = '';
        try {
          texto = ((await boton.innerText({ timeout: 1500 })) || '').trim()
            .replace(/\s+/g, ' ').slice(0, 40);
          if (!texto) {
            texto = (await boton.getAttribute('aria-label'))
              || (await boton.getAttribute('title')) || '(sin texto)';
          }
        } catch { continue; }
        if (NO_TOCAR.test(texto)) continue;
        // Pulsar la pestaña que ya está abierta no cambia nada, y no es un botón
        // muerto: se salta.
        if ((await boton.getAttribute('aria-selected').catch(() => null)) === 'true') continue;
        if ((await boton.getAttribute('aria-pressed').catch(() => null)) === 'true') continue;

        const antes = {
          url: pagina.url(),
          dialogos: await pagina.locator('[role="dialog"]').count(),
          largo: (await pagina.locator('body').innerText().catch(() => '')).length,
          peticiones,
          estado: await estado(),
          descargas,
        };

        try {
          await boton.click({ timeout: 3000, noWaitAfter: true });
        } catch { continue; }
        await pagina.waitForTimeout(1100);

        const despues = {
          url: pagina.url(),
          dialogos: await pagina.locator('[role="dialog"]').count(),
          largo: (await pagina.locator('body').innerText().catch(() => '')).length,
          peticiones,
          estado: await estado(),
          descargas,
        };

        const hizoAlgo =
          despues.url !== antes.url ||
          despues.dialogos !== antes.dialogos ||
          despues.peticiones > antes.peticiones ||
          despues.descargas > antes.descargas ||
          despues.estado !== antes.estado ||
          // Un cambio de menos de 20 caracteres suele ser un reloj o un contador
          // que se refrescó solo; no cuenta como efecto del clic.
          Math.abs(despues.largo - antes.largo) > 20;

        if (hizoAlgo) {
          vivos++;
        } else {
          sinEfecto++;
          muertos.push({ ruta, texto });
        }

        // Volver al estado inicial para que el siguiente botón se pulse limpio.
        if (despues.dialogos > antes.dialogos) {
          await pagina.keyboard.press('Escape').catch(() => {});
          await pagina.waitForTimeout(450);
        }
        if (despues.url !== antes.url) {
          await pagina.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 45000 })
            .catch(() => {});
          await pagina.waitForTimeout(1400);
        }
      }
    } catch (e) {
      // Una navegación a mitad de la cuenta destruye el contexto; se anota la
      // pantalla y se sigue con la siguiente en vez de tumbar la revisión.
      console.log(`error   ${ruta.padEnd(26)} ${String(e.message).split(/\r?\n/)[0].slice(0, 80)}`);
    }

    resumen.push({ ruta, probados: cuantos, vivos, sinEfecto });
    console.log(`${sinEfecto ? 'MUERTOS' : 'ok     '} ${ruta.padEnd(26)} ` +
                `${cuantos} probados · ${sinEfecto} sin efecto`);
  }

  console.log('\n' + '─'.repeat(72));
  console.log(`${resumen.length} pantallas · ` +
              `${resumen.reduce((s, r) => s + r.probados, 0)} botones pulsados · ` +
              `${muertos.length} sin efecto`);
  if (muertos.length) {
    console.log('\nBotones que no hacen nada:');
    for (const m of muertos) console.log(`  ${m.ruta.padEnd(26)} «${m.texto}»`);
  }
  fs.writeFileSync(process.env.SALIDA_JSON || process.env.SALIDA || '/salida/botones.json',
                   JSON.stringify({ resumen, muertos }, null, 2));

  await navegador.close();
})();
