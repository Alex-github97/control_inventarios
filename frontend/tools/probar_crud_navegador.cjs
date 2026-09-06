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

const NOMBRE = 'Prueba automatica S.A.S.';
const CODIGO = 'CLI-AUTO-001';

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
    if (m !== 'GET' && r.url().includes('/api/v1/crm/')) {
      escrituras.push(`${m} ${r.status()} ${r.url().split('/crm/')[1]}`);
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

  await p.goto(APP + '/crm/clientes', { waitUntil: 'networkidle', timeout: 45000 });
  await p.waitForTimeout(3000);

  // ── CREAR ───────────────────────────────────────────────────────────────────
  console.log('\nCREAR');
  const botonNuevo = p.getByRole('button', { name: /Nuevo cliente/i });
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
  await p.getByLabel(/Razón social/).first().fill(NOMBRE);
  await p.getByLabel(/^Ciudad/).first().fill('Bogotá');
  await p.getByRole('button', { name: /^Crear$/ }).click();
  await p.waitForTimeout(4000);

  revisar('se cierra al guardar', await p.getByRole('dialog').count() === 0);
  revisar('aparece en la lista sin recargar',
          await p.getByText(NOMBRE).count() > 0);
  await p.screenshot({ path: `${SALIDA}/crud-1-creado.png` });

  // ── EDITAR ──────────────────────────────────────────────────────────────────
  console.log('\nEDITAR');
  const fila = p.locator('tr').filter({ hasText: NOMBRE }).first();
  await fila.getByRole('button').nth(0).click();   // el lápiz
  await p.waitForTimeout(1500);
  revisar('se abre con los datos cargados',
          (await p.getByLabel(/Razón social/).first().inputValue()) === NOMBRE);
  revisar('el código no se deja cambiar',
          await p.getByLabel(/^Código/).first().isDisabled());

  await p.getByLabel(/^Ciudad/).first().fill('Medellín');
  await p.getByRole('button', { name: /Guardar cambios/i }).click();
  await p.waitForTimeout(4000);
  const filaEditada = p.locator('tr').filter({ hasText: NOMBRE }).first();
  revisar('el cambio se ve en la tabla',
          (await filaEditada.innerText()).includes('Medellín'));

  // ── ELIMINAR ────────────────────────────────────────────────────────────────
  console.log('\nELIMINAR');
  await filaEditada.getByRole('button').nth(1).click();   // la papelera
  await p.waitForTimeout(1200);
  revisar('pregunta antes de borrar',
          await p.getByText(/¿Eliminar el cliente\?/i).count() > 0);

  const botonBorrar = p.getByRole('button', { name: /^Eliminar$/ });
  revisar('el botón está bloqueado hasta escribir el nombre',
          await botonBorrar.isDisabled());
  await p.getByLabel(/Escriba/).first().fill(NOMBRE);
  await p.waitForTimeout(400);
  revisar('se habilita al escribirlo', !(await botonBorrar.isDisabled()));
  await p.screenshot({ path: `${SALIDA}/crud-2-confirmar.png` });

  await botonBorrar.click();
  await p.waitForTimeout(4000);
  // Se busca dentro de la TABLA, no en toda la pagina: el aviso de «se eliminó»
  // lleva el nombre y sigue visible unos segundos, con lo que la comprobacion
  // fallaba por el propio mensaje de exito.
  revisar('desaparece de la lista',
          await p.locator('table tr').filter({ hasText: NOMBRE }).count() === 0);

  console.log('\nescrituras al servidor:');
  for (const e of escrituras) console.log('   ', e);
  console.log('errores de JS:', errores.length ? errores : 'ninguno');
  if (errores.length) fallos++;
  console.log(fallos ? `\n${fallos} comprobacion(es) fallaron` : '\nTodo correcto');

  await p.screenshot({ path: `${SALIDA}/crud-3-final.png` });
  await b.close();
  process.exit(fallos ? 1 : 0);
})();
