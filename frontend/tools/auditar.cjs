/**
 * Recorre la aplicación entera en un navegador de verdad y dice qué está roto.
 *
 *   TOKEN=<jwt> RUTAS=/ruta/a/rutas.txt node frontend/tools/auditar.cjs
 *
 * POR QUÉ EXISTE
 * Que una pantalla cargue sin reventar no significa que funcione. Este guion
 * mira cuatro cosas a la vez en cada ruta, porque cada una falla de una forma
 * distinta y las tres primeras son invisibles desde afuera:
 *
 *   1. Excepciones de JavaScript sin capturar. Es el fallo que deja la pantalla
 *      en blanco o a medias.
 *   2. Llamadas al API que responden 4xx o 5xx. Una pantalla puede verse
 *      perfecta con todos sus números en cero porque la consulta reventó y el
 *      código cayó a su valor por defecto — ya pasó dos veces en este proyecto.
 *   3. Errores de consola. Los avisos de React sobre claves duplicadas o
 *      propiedades inválidas preceden a fallos reales.
 *   4. Si hay datos. Una tabla vacía en un módulo que debería tener un año de
 *      operación es un fallo, no un estado.
 *   5. Si la pantalla habla con el servidor. Una página maquetada —con los datos
 *      escritos en el código— se ve llena, no da ningún error y pasa cualquier
 *      revisión superficial. Es el fallo más caro de los cinco, porque solo se
 *      descubre cuando un cliente pregunta por qué sus cifras no cambian. La
 *      señal es simple: cero llamadas al API.
 *
 * Y abre cada pestaña interna, porque la mitad de las pantallas de esta
 * aplicación esconden su contenido detrás de pestañas: fotografiar solo la
 * primera deja sin revisar la mayor parte del módulo.
 *
 * Va en .cjs porque el package.json del frontend declara módulos ES.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

const APP = process.env.APP || 'https://tittanware.tech';
const TOKEN = process.env.TOKEN;
const EJECUTABLE = process.env.CHROME || '/usr/bin/chromium-browser';
const ESQUEMA = process.env.ESQUEMA || 'cli_demoflota';
const ESPERA = Number(process.env.ESPERA || 2600);
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;

if (!TOKEN) { console.error('Falta TOKEN'); process.exit(1); }

const RUTAS = fs.readFileSync(process.env.RUTAS || '/rutas.txt', 'utf8')
  .split('\n').map(x => x.trim()).filter(Boolean)
  // Estas no son pantallas de la aplicación: login saca la sesión, y las otras
  // son pasos de un flujo que no tiene sentido visitar en frío.
  .filter(r => !['/login', '/sin-acceso', '/scanner-movil'].includes(r))
  .filter(r => !SOLO || SOLO.some(p => r === p || r.startsWith(p + '/')));

// Textos que la aplicación usa para decir «no hay nada». Se listan explícitos
// porque cada módulo escribe el suyo, y buscar solo «sin datos» deja pasar la
// mitad.
const VACIA = new RegExp(
  'Sin (registros|datos|resultados|movimientos|existencias|órdenes|viajes|' +
  'períodos|documentos|colaboradores|novedades|alertas|actividad)|' +
  'No hay |No se encontraron|no hay datos|Aún no hay|Todavía no hay',
  'i');

(async () => {
  const navegador = await chromium.launch({
    executablePath: EJECUTABLE, args: ['--no-sandbox'],
  });
  const contexto = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  await contexto.addInitScript(([t, esquema]) => {
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
  const excepciones = [];
  const consola = [];
  const fallidas = [];
  let llamadas = 0;

  pagina.on('pageerror', e => excepciones.push(String(e.message).slice(0, 160)));
  pagina.on('console', m => {
    if (m.type() !== 'error') return;
    const texto = m.text();
    // El propio axios registra en consola cada respuesta con error, y eso ya
    // queda contado como llamada fallida: repetirlo duplica cada hallazgo.
    if (/Request failed with status|Failed to load resource/i.test(texto)) return;
    consola.push(texto.slice(0, 160));
  });
  pagina.on('response', r => {
    const cualquiera = r.url();
    if (cualquiera.includes('/api/')) llamadas++;
    if (r.status() < 400) return;
    const url = cualquiera;
    if (!url.includes('/api/')) return;
    fallidas.push(`${r.status()} ${url.split('/api/v1')[1].split('?')[0]}`);
  });

  const informe = [];
  for (const ruta of RUTAS) {
    excepciones.length = 0; consola.length = 0; fallidas.length = 0;
    llamadas = 0;
    const fila = { ruta, estado: 'ok', pestanas: 0, detalle: [] };
    try {
      await pagina.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) {
      fila.estado = 'TIMEOUT';
      fila.detalle.push(String(e).slice(0, 80));
      informe.push(fila);
      console.log(linea(fila));
      continue;
    }
    await pagina.waitForTimeout(ESPERA);

    if (await pagina.locator('text=Error de renderizado').count()) {
      fila.estado = 'CRASH';
    }

    // Las pestañas. Se abren una por una porque cada una dispara sus propias
    // consultas, y un módulo puede tener la primera bien y las otras rotas.
    const pestanas = pagina.locator('[role="tab"]');
    const cuantas = Math.min(await pestanas.count(), 12);
    fila.pestanas = cuantas;
    for (let i = 1; i < cuantas; i++) {
      try {
        await pestanas.nth(i).click({ timeout: 5000 });
        await pagina.waitForTimeout(1300);
        if (await pagina.locator('text=Error de renderizado').count()) {
          const nombre = (await pestanas.nth(i).innerText()).trim().slice(0, 28);
          fila.detalle.push(`pestaña «${nombre}» revienta`);
          fila.estado = 'CRASH';
        }
      } catch { /* una pestaña que no se deja pulsar no es un fallo del módulo */ }
    }

    // ¿Hay datos? Se cuentan filas de tabla y elementos de lista; si no hay
    // ninguno y además aparece un texto de estado vacío, la pantalla está vacía.
    const filas = await pagina.locator('tbody tr, [role="row"], .MuiListItem-root').count();
    const vacia = await pagina.locator(`text=${VACIA}`).count();

    const unicos = a => [...new Set(a)];
    if (excepciones.length) {
      fila.estado = 'CRASH';
      fila.detalle.push(...unicos(excepciones).slice(0, 2));
    }
    if (fallidas.length) {
      if (fila.estado === 'ok') fila.estado = 'API';
      fila.detalle.push(...unicos(fallidas).slice(0, 3));
    }
    if (consola.length && fila.estado === 'ok') {
      fila.estado = 'CONSOLA';
      fila.detalle.push(...unicos(consola).slice(0, 2));
    }
    if (fila.estado === 'ok' && filas === 0 && vacia > 0) fila.estado = 'VACIA';
    // Cero llamadas al API: la pantalla no consulta nada. Se marca aunque esté
    // llena, porque lo que muestra no puede venir de ningún cliente.
    //
    // Solo cuando lo demás está bien: una pantalla que revienta antes de pedir
    // nada tampoco hace llamadas, y llamarla «maqueta» escondería el fallo real.
    if (llamadas === 0 && (fila.estado === 'ok' || fila.estado === 'VACIA')) {
      fila.estado = 'MAQUETA';
    }
    fila.filas = filas;
    fila.llamadas = llamadas;

    informe.push(fila);
    console.log(linea(fila));
  }

  console.log('\n' + '─'.repeat(72));
  const por = e => informe.filter(f => f.estado === e).length;
  console.log(`${informe.length} rutas · ok ${por('ok')} · maquetadas ${por('MAQUETA')} ` +
              `· vacías ${por('VACIA')} · API ${por('API')} · consola ${por('CONSOLA')} ` +
              `· crash ${por('CRASH')} · timeout ${por('TIMEOUT')}`);
  const maq = informe.filter(f => f.estado === 'MAQUETA').map(f => f.ruta);
  if (maq.length) {
    console.log('\nSin una sola llamada al servidor:');
    console.log('  ' + maq.join(' '));
  }
  fs.writeFileSync(process.env.SALIDA || '/salida/auditoria.json',
                   JSON.stringify(informe, null, 2));

  await navegador.close();
})();

function linea(f) {
  const marca = { ok: 'ok      ', VACIA: 'VACIA   ', API: 'API     ',
                  CONSOLA: 'CONSOLA ', CRASH: 'CRASH   ', TIMEOUT: 'TIMEOUT ',
                  MAQUETA: 'MAQUETA ' }[f.estado];
  const extra = f.detalle.length ? '  ' + f.detalle.join(' | ') : '';
  const pest = f.pestanas > 1 ? ` (${f.pestanas} pest.)` : '';
  return `${marca}${f.ruta.padEnd(28)}${String(f.filas ?? '').padStart(4)} filas${pest}${extra}`;
}
