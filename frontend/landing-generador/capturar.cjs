/**
 * Toma las capturas de la plataforma para los folletos de módulo.
 *
 *   TOKEN=<jwt> node frontend/landing-generador/capturar.cjs
 *
 * Va con extensión .cjs porque el package.json del frontend declara módulos
 * ES y este script usa require: sin eso, node se niega a cargarlo.
 *
 * El token se acuña dentro del contenedor del backend con
 * `create_access_token(subject=1, esquema='cli_demoflota', usuario='admin')`.
 *
 * QUÉ SE FOTOGRAFÍA
 * La cuenta de demostración, que tiene tres años de operación sembrada. Son
 * datos generados, no de un cliente: por eso se pueden publicar. Cualquier otro
 * inquilino queda descartado por esa misma razón.
 *
 * CÓMO ENTRA
 * Poniendo en `localStorage` lo mismo que deja el login: el token suelto, el
 * estado de sesión que persiste zustand y el cliente activo. Se hace así y no
 * escribiendo una contraseña porque acá no hay ninguna contraseña, y no debe
 * haberla.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP || 'https://tittanware.tech';
const TOKEN = process.env.TOKEN;
const SALIDA = process.env.SALIDA || '/salida';
const EJECUTABLE = process.env.CHROME || '/usr/bin/chromium-browser';

if (!TOKEN) { console.error('Falta TOKEN'); process.exit(1); }

// (módulo, nombre del archivo, ruta, leyenda, [pestaña que hay que abrir])
//
// Las leyendas describen LO QUE SE VE. Si una pantalla no sale como se esperaba,
// se cambia la leyenda y no al revés: un folleto que promete una pantalla que
// no existe se descubre en la primera demostración.
const TOMAS = [
  ['cmms', 1, '/eam',                  'El tablero de mantenimiento, con lo que está detenido y lo que vence'],
  ['cmms', 2, '/eam/neumaticos',       'Las llantas por vehículo y por posición, con su profundidad'],
  ['cmms', 3, '/eam/ordenes-trabajo',  'Las órdenes de trabajo, con su estado y su costo'],

  ['wms',  1, '/wms',                  'El tablero del almacén'],
  ['wms',  2, '/wms/inventario',       'El inventario por ubicación'],
  ['wms',  3, '/wms/despacho',         'Los despachos en curso'],

  ['tms',  1, '/tms',                  'El tablero de transporte'],
  ['tms',  2, '/tms/viajes',           'Los viajes con su estado y su cumplimiento'],
  ['tms',  3, '/tms/liquidaciones',    'La liquidación de un viaje'],

  ['estibas', 1, '/dashboard',         'El tablero de control de estibas'],
  ['estibas', 2, '/estibas',           'El inventario de estibas por ubicación y cliente'],
  ['estibas', 3, '/movimientos',       'Los movimientos con su trazabilidad'],

  ['erp',  1, '/erp',                  'El tablero financiero'],
  ['erp',  2, '/erp/contabilidad',     'El plan de cuentas de la empresa', 'Plan de Cuentas'],
  ['erp',  3, '/erp/contabilidad',     'El balance de comprobación, que dice si el libro cuadra', 'Libros'],
  ['erp',  4, '/erp/cxc',              'La cartera con su antigüedad'],
  ['erp',  5, '/erp/tributacion',      'El motor tributario'],

  ['gh',   1, '/gh',                   'El tablero de gestión humana'],
  ['gh',   2, '/gh/colaboradores',     'Los colaboradores con su ficha'],
  ['gh',   3, '/gh/nomina',            'La liquidación de nómina'],

  ['sst',  1, '/sst',                  'El tablero de seguridad y salud'],
  ['sst',  2, '/sst/riesgos',          'La matriz de riesgos'],
  ['sst',  3, '/sst/incidentes',       'El registro de incidentes'],

  ['lms',  1, '/lms',                  'El tablero de formación'],
  ['lms',  2, '/lms/cursos',           'El catálogo de cursos'],
  ['lms',  3, '/lms/competencias',     'La matriz de competencias'],

  ['qms',  1, '/qms',                  'El tablero de calidad'],
  ['qms',  2, '/qms/procesos',         'El mapa de procesos'],
  ['qms',  3, '/qms/no-conformidades', 'Las no conformidades con su acción'],

  ['grc',  1, '/grc',                  'El tablero de riesgo y cumplimiento'],
  ['grc',  2, '/grc/riesgos',          'La matriz de riesgos con sus controles'],
  ['grc',  3, '/grc/obligaciones',     'El calendario de obligaciones'],

  ['dms',  1, '/dms',                  'El tablero documental'],
  ['dms',  2, '/dms/documentos',       'Los documentos con su versión'],
  ['dms',  3, '/dms/workflow',         'Un flujo de aprobación'],

  ['crm',  1, '/crm',                  'El tablero comercial'],
  ['crm',  2, '/crm/oportunidades',    'El embudo por etapa'],
  ['crm',  3, '/crm/cotizaciones',     'Las cotizaciones'],

  ['tarifax', 1, '/tarifax',           'El motor de tarifas'],

  ['scm',  1, '/scm',                  'El tablero de proveedores'],
  ['scm',  2, '/erp/compras',          'Las requisiciones y órdenes de compra'],

  ['mes',  1, '/mes',                  'El tablero de producción'],
  ['mes',  2, '/mes/ordenes',          'Las órdenes de producción'],
  ['mes',  3, '/mes/lineas',           'El esquema de la línea'],

  ['aps',  1, '/aps',                  'El tablero de planeación'],
  ['aps',  2, '/aps/demanda',          'El pronóstico de demanda'],
  ['aps',  3, '/aps/capacidad',        'Carga contra capacidad'],

  ['ags',  1, '/ags',                  'El tablero de la agenda'],
  ['ags',  2, '/ags/agenda',           'La agenda del día por profesional'],
  ['ags',  3, '/ags/servicios',        'El catálogo de servicios'],
];

const sesion = {
  access_token: TOKEN,
  'auth-storage': JSON.stringify({
    state: {
      // `permisos` tiene que venir aunque sea vacío: el guardián de rutas manda
      // al login cuando es `undefined`, para expulsar sesiones viejas de antes
      // de que existieran los permisos. Con rol ADMINISTRADOR el mapa no se
      // consulta, pero tiene que estar.
      user: { id: 1, username: 'admin', nombre: 'Administrador Demo',
              rol: 'ADMINISTRADOR', email: 'demo@tittanware.com', permisos: {} },
      token: TOKEN,
      isAuthenticated: true,
      // `['*']` son todos: la cuenta de demostración los tiene todos.
      modulos: ['*'],
    },
    version: 0,
  }),
  cliente_activo: JSON.stringify({ codigo: 'demoflota',
                                   nombre: 'Demostración · Flota de carga' }),
};

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const navegador = await chromium.launch({
    executablePath: EJECUTABLE,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const contexto = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,          // pantalla nítida: el folleto se ve en retina
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  });

  // La sesión se siembra ANTES de cargar la aplicación: si se pone después, el
  // primer render ya decidió que no hay sesión y manda al login.
  await contexto.addInitScript(datos => {
    for (const [k, v] of Object.entries(datos)) localStorage.setItem(k, v);
  }, sesion);

  const pagina = await contexto.newPage();
  const fallos = [];
  const rotas = [];
  const vacias = [];
  let hechas = 0;

  // Los errores de la propia aplicación, no los del guion. Sirven para
  // distinguir «no pude llegar a la pantalla» de «la pantalla se rompió»,
  // que es un problema del producto y no de la captura.
  let ultimoError = null;
  pagina.on('pageerror', e => {
    ultimoError = String(e.message).split(String.fromCharCode(10))[0];
  });

  for (const [modulo, n, ruta, leyenda, pestana] of TOMAS) {
    const destino = path.join(SALIDA, `${modulo}-${n}.png`);
    try {
      await pagina.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 45000 });

      // Si rebotó al login, la sesión no sirvió y no tiene sentido seguir.
      if (/\/(login|ingreso)/.test(pagina.url())) {
        throw new Error('rebotó al login');
      }

      if (pestana) {
        const p = pagina.locator(`button[role="tab"]:has-text("${pestana}")`).first();
        if (await p.count()) { await p.click(); await pagina.waitForTimeout(1400); }
      }

      // Un respiro para que terminen de llegar los datos y las animaciones de
      // entrada: una captura a mitad de la animación sale traslúcida.
      await pagina.waitForTimeout(2600);

      // La frontera de errores de React pinta este título cuando una pantalla
      // revienta. Fotografiarla sería publicar el fallo en el folleto.
      const reventada = await pagina.locator('text=Error de renderizado').count();
      if (reventada) {
        rotas.push(`${modulo}-${n} ${ruta} :: ${ultimoError ?? 'sin mensaje'}`);
        console.log(`  ROTA  ${modulo}-${n}  ${ruta}  ->  ${ultimoError ?? ''}`);
        ultimoError = null;
        continue;
      }

      // Una pantalla sin datos tampoco sirve para un folleto: se ve honesta y
      // vacía a la vez, y quien la mira concluye que el módulo no hace nada.
      // Se detecta por los textos que la propia aplicación usa para decirlo.
      const vacia = await pagina.locator(
        'text=/Sin (períodos|registros|datos|resultados|movimientos)|' +
        'No hay |No se encontraron|no hay datos/i').count();
      if (vacia) {
        vacias.push(`${modulo}-${n} ${ruta}`);
        console.log(`  VACÍA ${modulo}-${n}  ${ruta}`);
      }

      await pagina.screenshot({ path: destino });
      hechas++;
      if (!vacia) console.log(`  ok    ${modulo}-${n}  ${ruta}`);
    } catch (e) {
      fallos.push(`${modulo}-${n} (${ruta}): ${String(e.message).split('\n')[0].slice(0, 90)}`);
      console.log(`  FALLA ${modulo}-${n}  ${ruta}`);
    }
  }

  // Las leyendas de lo que de verdad quedó fotografiado. El generador las lee
  // en vez de llevar su propia lista: así una captura que se descarta por venir
  // vacía no deja una leyenda huérfana prometiendo una pantalla que no está.
  const leyendas = {};
  for (const [modulo, n, , leyenda] of TOMAS) {
    if (fs.existsSync(path.join(SALIDA, `${modulo}-${n}.png`))) {
      leyendas[`${modulo}-${n}`] = leyenda;
    }
  }
  fs.writeFileSync(path.join(SALIDA, 'leyendas.json'),
                   JSON.stringify(leyendas, null, 2));
  console.log(`
leyendas.json con ${Object.keys(leyendas).length} entradas`);

  await navegador.close();
  console.log(`\n${hechas} capturas · ${fallos.length} fallos`);
  for (const f of fallos) console.log('   ' + f);
})();
