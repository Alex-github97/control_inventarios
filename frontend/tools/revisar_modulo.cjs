/**
 * Recorre las quince pantallas del comercial y comprueba que muestren datos.
 *
 *   APP=http://host.docker.internal:5173 TOKEN=<jwt> node revisar_crm.cjs
 *
 * QUE COMPRUEBA, Y POR QUE ESO
 * No basta con que la pagina cargue: una maqueta tambien carga. Se mira que
 * haya llegado una respuesta del servidor con contenido, que no queden textos
 * de «cargando», y —lo que de verdad importa— que no aparezca el mensaje de
 * vacio, porque una pantalla conectada contra una base con datos que muestra
 * «todavia no hay nada» esta pidiendo mal.
 */
const { chromium } = require('playwright-core');

// Se navega a `localhost` aunque el servidor este en la maquina anfitriona: el
// servidor de desarrollo rechaza cualquier otro nombre de host, y cambiar su
// configuracion para poder probarlo seria cambiar el programa para que quepa la
// prueba. Chromium resuelve `localhost` a la puerta de enlace con
// `--host-resolver-rules`, asi que la cabecera Host sigue diciendo `localhost`.
const APP = process.env.APP || 'http://localhost:5173';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'acme';
const USUARIO = process.env.USUARIO || 'admin';
const CLAVE = process.env.CLAVE;
const SALIDA = process.env.SALIDA || '/salida';
if (!CLAVE) { console.error('Falta CLAVE'); process.exit(1); }

// El modulo a revisar sale del entorno: `MODULO=dms RUTAS=/dms,/dms/documentos...`
// Asi el mismo guion sirve para los quince modulos en vez de copiarse quince
// veces y quedar cada copia con un arreglo distinto.
const MODULO = process.env.MODULO || 'crm';
const RUTAS = (process.env.RUTAS
  ? process.env.RUTAS.split(',')
  : ['/crm', '/crm/clientes', '/crm/leads', '/crm/oportunidades',
     '/crm/cotizaciones', '/crm/contratos', '/crm/tickets', '/crm/interacciones',
     '/crm/campanas', '/crm/encuestas', '/crm/cuentas-clave', '/crm/rentabilidad',
     '/crm/ia', '/crm/reportes', '/crm/config']
).map(r => {
  const t = r.trim();
  const hoja = t.split('/').filter(Boolean).pop() || 'tablero';
  return [t, hoja.replace(/-/g, ' ')];
});

(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : []),
    ],
  });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });

  // SE ENTRA POR EL FORMULARIO, NO FALSIFICANDO LA SESION.
  //
  // Falsificar el almacenamiento local ahorra unos segundos y a cambio deja de
  // probar la mitad del camino: los permisos que trae el token, los modulos
  // contratados que decide el servidor, y la propia pantalla de ingreso. Con la
  // sesion inventada, una revision puede salir en verde mientras ningun cliente
  // real logra entrar.
  {
    const p = await ctx.newPage();
    await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForTimeout(1200);

    // Se busca por ETIQUETA y no por marcador de posicion: MUI solo pinta el
    // marcador mientras el campo no tiene foco ni valor, asi que apuntarle a el
    // hace que la prueba falle por un detalle visual y no por un fallo real.
    const campoEmpresa = p.getByLabel(/[Cc]ódigo de la empresa/);
    if (await campoEmpresa.count()) {
      await campoEmpresa.first().fill(EMPRESA);
      await p.getByRole('button', { name: /Continuar/i }).click();
      await p.waitForTimeout(2500);
    }
    const usuario = p.getByLabel(/Usuario/i).or(p.getByPlaceholder(/nombre de usuario/i));
    const clave = p.getByLabel(/Contraseña/i).or(p.getByPlaceholder(/contrase/i));
    await usuario.first().fill(USUARIO);
    await clave.first().fill(CLAVE);
    await p.getByRole('button', { name: /Ingresar/i }).click();
    await p.waitForTimeout(4500);

    const entro = !(await usuario.count());
    console.log(entro ? 'sesion iniciada' : 'NO SE PUDO INICIAR SESION');
    console.log('');
    if (!entro) {
      await p.screenshot({ path: `${SALIDA}/crm-login.png` });
      await b.close();
      process.exit(1);
    }
    await p.close();
  }

  let fallos = 0;
  for (const [ruta, nombre] of RUTAS) {
    const p = await ctx.newPage();
    const errores = [];
    const respuestas = [];
    p.on('pageerror', e => errores.push(String(e.message).slice(0, 120)));
    p.on('response', r => {
      if (r.url().includes(`/api/v1/${MODULO}/`)) {
        respuestas.push(`${r.status()} ${r.url().split(`/${MODULO}/`)[1].split('?')[0]}`);
      }
    });

    try {
      await p.goto(APP + ruta, { waitUntil: 'networkidle', timeout: 45000 });
      // Las consultas encadenadas —la ficha 360, el detalle— tardan un poco mas
      // que la primera pintura, y sin esta espera se leeria el estado de carga.
      await p.waitForTimeout(3500);

      const texto = await p.locator('body').innerText();
      const malas = respuestas.filter(r => !r.startsWith('2'));
      const vacio = /Todav[ií]a no hay|no hay nada aqu|No hay .* registrad/i.test(texto);
      const roto = /No se pudo cargar/i.test(texto);
      const cifras = (texto.match(/\$[\d.,]+\s*[MK]?/g) || []).length;

      // Cero peticiones al modulo significa que la pantalla nunca se monto —el
      // servidor rechazo el host, la sesion no valia, la ruta no existe—. Sin
      // esto, una pagina en blanco pasaba la revision por no tener fallos.
      const mal = malas.length || roto || errores.length || !respuestas.length;
      if (mal || vacio) fallos++;
      console.log(
        `${mal ? 'X' : vacio ? '!' : 'ok'}  ${nombre.padEnd(15)} ` +
        `${String(respuestas.length).padStart(2)} peticiones` +
        `${!respuestas.length ? ' | NO SE MONTO LA PANTALLA' : ''}` +
        `${malas.length ? ` | FALLIDAS: ${malas.join(', ')}` : ''}` +
        `${roto ? ' | PANTALLA DE ERROR' : ''}` +
        `${vacio ? ' | dice que no hay datos' : ''}` +
        `${cifras ? ` | ${cifras} cifras` : ' | SIN CIFRAS'}` +
        `${errores.length ? ` | JS: ${errores[0]}` : ''}`);

      await p.screenshot({
        path: `${SALIDA}/${MODULO}-${ruta.replace(/\//g, '_')}.png`, fullPage: false,
      });
    } catch (e) {
      fallos++;
      console.log(`X  ${nombre.padEnd(15)} no cargo: ${String(e.message).slice(0, 90)}`);
    }
    await p.close();
  }

  console.log(`\n${RUTAS.length - fallos} de ${RUTAS.length} pantallas con datos.`);
  await b.close();
})();
