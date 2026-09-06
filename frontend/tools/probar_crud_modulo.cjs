/**
 * Comprueba, desde el navegador, que los botones de crear, editar y eliminar
 * hagan lo que dicen.
 *
 *   CLAVE=... GATEWAY=... node probar_crud_navegador.cjs
 *
 * POR QUE DESDE EL NAVEGADOR Y NO CONTRA LA API
 * Porque los endpoints ya tienen su propia prueba y pasan. Lo que aqui puede
 * fallar es lo otro: que el boton no abra nada, que el formulario mande el
 * campo con otro nombre, que la lista no se refresque despues de guardar. Nada
 * de eso se ve probando el servidor.
 *
 * ESCRIBE: crea un cliente de prueba, lo edita y lo borra. Si algo se cae a la
 * mitad, queda un cliente llamado «Prueba automatica» que hay que borrar.
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'acme';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

const MODULO = process.env.MODULO || 'crm';
const RUTA = process.env.RUTA || '/crm/clientes';
const ENTIDAD = process.env.ENTIDAD || 'cliente';
const CAMPO_NOMBRE = process.env.CAMPO_NOMBRE || 'Razón social';
const CAMPO_EXTRA = process.env.CAMPO_EXTRA || 'Ciudad';
// Si el campo extra ES el codigo, lleva el sello: de lo contrario dos corridas
// chocan con el indice unico y el fallo parece del programa.
const SELLO = Date.now().toString(36).slice(-5).toUpperCase();
const CAMPO_EXTRA_ES_CODIGO = /c[oó]digo/i.test(process.env.CAMPO_EXTRA || '')
const VALOR_EXTRA = (process.env.VALOR_EXTRA || 'Bogotá')
  + (CAMPO_EXTRA_ES_CODIGO ? SELLO : '')
const VALOR_EDITADO = (process.env.VALOR_EDITADO || 'Medellín')
  + (CAMPO_EXTRA_ES_CODIGO ? SELLO : '')
const NOMBRE = `Prueba automatica ${SELLO}`;
const CODIGO = (process.env.CODIGO || 'AUTO') + '-' + SELLO;

let fallos = 0;
const revisar = (etiqueta, ok, extra = '') => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok ' : 'MAL'} ${etiqueta}${extra ? ' | ' + extra : ''}`);
};

(async () => {
  const b = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox',
           ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])],
  });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 140)));
  const escrituras = [];
  p.on('response', r => {
    const m = r.request().method();
    if (m !== 'GET' && r.url().includes(`/api/v1/${MODULO}/`)) {
      escrituras.push(`${m} ${r.status()} ${r.url().split(`/${MODULO}/`)[1]}`);
    }
  });

  // ── Entrar ──────────────────────────────────────────────────────────────────
  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await p.waitForTimeout(1200);
  const campoEmpresa = p.getByLabel(/[Cc]ódigo de la empresa/);
  if (await campoEmpresa.count()) {
    await campoEmpresa.first().fill(EMPRESA);
    await p.getByRole('button', { name: /Continuar/i }).click();
    await p.waitForTimeout(2500);
  }
  await p.getByLabel(/Usuario/i).or(p.getByPlaceholder(/nombre de usuario/i)).first().fill(USUARIO);
  await p.getByLabel(/Contraseña/i).or(p.getByPlaceholder(/contrase/i)).first().fill(CLAVE);
  await p.getByRole('button', { name: /Ingresar/i }).click();
  await p.waitForTimeout(4500);

  await p.goto(APP + RUTA, { waitUntil: 'networkidle', timeout: 45000 });
  await p.waitForTimeout(3000);

  // ── CREAR ───────────────────────────────────────────────────────────────────
  console.log('\nCREAR');
  const botonNuevo = p.getByRole('button', { name: new RegExp(`Nuev[oa] ${ENTIDAD}`, 'i') });
  revisar('existe el botón de crear', await botonNuevo.count() > 0);
  await botonNuevo.first().click();
  await p.waitForTimeout(1200);
  revisar('se abre el formulario',
          await p.getByRole('dialog').count() > 0);

  // Guardar sin llenar nada debe quejarse EN EL FORMULARIO, no cerrarlo.
  await p.getByRole('button', { name: /^Crear$/ }).click();
  await p.waitForTimeout(900);
  revisar('sin datos obligatorios no guarda',
          await p.getByRole('dialog').count() > 0,
          await p.getByText(/hace falta/i).count() + ' avisos en los campos');

  await p.getByLabel(/^Código/).first().fill(CODIGO);
  await p.getByLabel(new RegExp(CAMPO_NOMBRE, 'i')).first().fill(NOMBRE);
  await p.getByLabel(new RegExp(`^${CAMPO_EXTRA}`, 'i')).first().fill(VALOR_EXTRA);
  await p.getByRole('button', { name: /^Crear$/ }).click();
  await p.waitForTimeout(4000);

  const cerro = await p.getByRole('dialog').count() === 0;
  revisar('se cierra al guardar', cerro);
  if (!cerro) {
    // El dialogo abierto casi siempre trae el motivo dentro; sin leerlo, el
    // siguiente paso falla buscando algo que nunca se creo.
    const motivo = await p.getByRole('dialog').innerText();
    console.log('  el formulario sigue abierto:',
                motivo.split(String.fromCharCode(10))
                  .filter(l => /no se pudo|ya |error|falta/i.test(l))
                  .join(' | ') || '(sin mensaje visible)');
    await p.screenshot({ path: `${SALIDA}/crud-error.png` });
    await b.close();
    process.exit(1);
  }
  revisar('aparece en la lista sin recargar',
          await p.getByText(NOMBRE).count() > 0);
  await p.screenshot({ path: `${SALIDA}/crud-1-creado.png` });

  // ── EDITAR ──────────────────────────────────────────────────────────────────
  console.log('\nEDITAR');
  // Se apunta al boton POR SU ETIQUETA, no por su posicion dentro de una fila.
  // La ficha puede ser una fila de tabla o una tarjeta —los dos existen en la
  // plataforma— y buscar «el primer boton del contenedor» depende de como este
  // maquetada. La etiqueta lleva el nombre del registro, asi que apunta a uno.
  const botonEditar = () => p.getByRole('button', { name: `Editar ${NOMBRE}` });
  const botonEliminar = () => p.getByRole('button', { name: `Eliminar ${NOMBRE}` });
  await botonEditar().first().click();
  await p.waitForTimeout(1500);
  revisar('se abre con los datos cargados',
          (await p.getByLabel(new RegExp(CAMPO_NOMBRE, 'i')).first().inputValue()) === NOMBRE);
  const codigoBloqueado = await p.getByLabel(/^Código/).first().isDisabled();
  console.log(`  ok  el código ${codigoBloqueado ? 'no se deja cambiar'
    : 'se puede cambiar (esta entidad lo permite)'}`);

  await p.getByLabel(new RegExp(`^${CAMPO_EXTRA}`, 'i')).first().fill(VALOR_EDITADO);
  await p.getByRole('button', { name: /Guardar cambios/i }).click();
  await p.waitForTimeout(4000);
  // Se comprueba sobre la pagina, no sobre un contenedor concreto: la ficha
  // puede ser una fila o una tarjeta, y localizar «el div que la envuelve» es
  // ambiguo entre miles. Con el dialogo ya cerrado, que el valor nuevo este en
  // pantalla significa que la lista se refresco con el.
  revisar('el cambio se ve en la lista',
          (await p.locator('main, body').first().innerText()).includes(VALOR_EDITADO));

  // ── ELIMINAR ────────────────────────────────────────────────────────────────
  console.log('\nELIMINAR');
  await botonEliminar().first().click();
  await p.waitForTimeout(1200);
  revisar('pregunta antes de borrar',
          await p.getByText(new RegExp(`¿Eliminar (el|la) ${ENTIDAD}`, 'i')).count() > 0);

  const botonBorrar = p.getByRole('button', { name: /^Eliminar$/ });
  const pideEscribir = await p.getByLabel(/Escriba/).count() > 0;
  if (pideEscribir) {
    revisar('el botón está bloqueado hasta escribir el nombre',
            await botonBorrar.isDisabled());
    await p.getByLabel(/Escriba/).first().fill(NOMBRE);
    await p.waitForTimeout(400);
    revisar('se habilita al escribirlo', !(await botonBorrar.isDisabled()));
  } else {
    console.log('  ok  borrado directo (esta entidad no exige teclear el nombre)');
  }
  await p.screenshot({ path: `${SALIDA}/crud-2-confirmar.png` });

  await botonBorrar.click();
  await p.waitForTimeout(4000);
  // Se busca dentro de la TABLA, no en toda la pagina: el aviso de «se eliminó»
  // lleva el nombre y sigue visible unos segundos, con lo que la comprobacion
  // fallaba por el propio mensaje de exito.
  revisar('desaparece de la lista', await botonEditar().count() === 0);

  console.log('\nescrituras al servidor:');
  for (const e of escrituras) console.log('   ', e);
  console.log('errores de JS:', errores.length ? errores : 'ninguno');
  if (errores.length) fallos++;
  console.log(fallos ? `\n${fallos} comprobacion(es) fallaron` : '\nTodo correcto');

  await p.screenshot({ path: `${SALIDA}/crud-3-final.png` });
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
