/**
 * Registrar una llanta de una referencia que no tiene dimensiones configuradas.
 *
 * Antes la lista de dimensiones salía vacía y no había forma de crear la
 * llanta desde el formulario. Ahora ofrece las dimensiones del catálogo, pide
 * la profundidad inicial y deja la combinación guardada.
 *
 * Crea por API lo que necesita (usuario, marca, referencia y dimensión de
 * prueba) y lo borra al terminar.
 *
 *   APP=... GATEWAY=... API=http://host.docker.internal:8000 TOKEN=... node probar_llanta_dimension.cjs
 */
const { chromium } = require('playwright-core');

const APP = process.env.APP || 'http://localhost:5173';
const API = (process.env.API || 'http://localhost:8000') + '/api/v1';
const GATEWAY = process.env.GATEWAY || '';
const EMPRESA = process.env.EMPRESA || 'demo';
const TOKEN = process.env.TOKEN;
const SALIDA = process.env.SALIDA || '/salida';
if (!TOKEN) { console.error('Falta TOKEN'); process.exit(1); }

const sello = Date.now().toString().slice(-6);
const USUARIO = `pruebadim${sello}`, CLAVE = `Pd!${sello}aB9x`;
let fallos = 0;
const comprobar = (c, t) => { if (!c) fallos++; console.log(`${c ? 'ok ' : 'X  '} ${t}`); };
const api = async (metodo, ruta, cuerpo) => {
  const r = await fetch(API + ruta, { method: metodo, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${ruta} -> ${r.status} ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
};

(async () => {
  const creado = {};
  let b;
  try {
    creado.usuario = await api('POST', '/usuarios/', { username: USUARIO, email: `${USUARIO}@tittanware.com`, nombre: 'Prueba', apellido: 'Dimension', password: CLAVE, rol: 'ADMINISTRADOR' });
    creado.marca = await api('POST', '/eam/neumaticos/catalogo/marcas', { nombre: `ZZMARCA${sello}`, ambito: 'LLANTA' });
    creado.ref = await api('POST', '/eam/neumaticos/catalogo/referencias', { marca_id: creado.marca.id, nombre: `ZZREF${sello}`, ambito: 'LLANTA' });
    creado.dim = await api('POST', '/eam/neumaticos/catalogo/dimensiones', { nombre: `ZZ${sello}R22.5`, ambito: 'LLANTA' });
    creado.dim2 = await api('POST', '/eam/neumaticos/catalogo/dimensiones', { nombre: `ZY${sello}R17.5`, ambito: 'LLANTA' });
    // Una segunda referencia que sí tiene una dimensión: las dos listas deben convivir.
    creado.ref2 = await api('POST', '/eam/neumaticos/catalogo/referencias', { marca_id: creado.marca.id, nombre: `ZZCON${sello}`, ambito: 'LLANTA' });
    await api('POST', '/eam/neumaticos/catalogo/referencia-dimension', { referencia_id: creado.ref2.id, dimension_id: creado.dim2.id, profundidad_inicial: 14 });

    b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', ...(GATEWAY ? [`--host-resolver-rules=MAP localhost ${GATEWAY}`] : [])] });
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 }, locale: 'es-CO' })).newPage();
    const errores = [], fallidas = [];
    p.on('pageerror', e => errores.push(String(e.message).slice(0, 200)));
    p.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 400) fallidas.push(`${r.status()} ${r.request().method()} ${r.url().split('/api/v1')[1]}`) });

    await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 90000 });
    const empresa = p.getByLabel(/[Cc]ódigo de la empresa/);
    if (await empresa.count()) { await empresa.first().fill(EMPRESA); await p.getByRole('button', { name: /Continuar/i }).click(); }
    const clave = p.locator('input[type="password"]');
    await clave.waitFor({ timeout: 30000 });
    await p.locator('input:not([type="password"]):visible').first().fill(USUARIO);
    await clave.fill(CLAVE);
    await p.getByRole('button', { name: /Ingresar/i }).first().click();
    await clave.waitFor({ state: 'detached', timeout: 90000 });

    await p.goto(APP + '/eam/neumaticos', { waitUntil: 'networkidle', timeout: 120000 });
    await p.getByRole('button', { name: /Registrar llanta/ }).click();
    const dlg = p.getByRole('dialog');
    await dlg.getByText('Registrar neumático').waitFor({ timeout: 20000 });
    const combos = dlg.getByRole('combobox');   // marca, referencia, dimensión, vida…
    const elegir = async (i, texto) => { await combos.nth(i).click(); await p.getByRole('option', { name: texto, exact: false }).first().click(); };

    await dlg.getByLabel(/Código/).fill(`ZZLL${sello}`);
    await elegir(0, creado.marca.nombre);
    await elegir(1, creado.ref.nombre);

    // 1. Referencia SIN dimensiones: ya no queda bloqueada
    await combos.nth(2).click();
    const lista = p.getByRole('listbox');
    comprobar(await lista.getByText('Sin configurar para esta referencia').isVisible(), 'la lista avisa cuáles dimensiones están sin configurar');
    comprobar(await lista.getByRole('option', { name: creado.dim.nombre }).count() === 1, 'ofrece las dimensiones del catálogo aunque la referencia no las tenga');
    await lista.getByText('Sin configurar para esta referencia').click({ force: true }).catch(() => {});   // el rótulo no es opción
    comprobar(errores.length === 0, `tocar el rótulo no rompe la pantalla ${errores.join(' | ')}`);
    if (!(await lista.isVisible().catch(() => false))) await combos.nth(2).click();
    await p.getByRole('option', { name: creado.dim.nombre }).click();
    const boton = dlg.getByRole('button', { name: 'Configurar y usar' });
    await boton.waitFor({ timeout: 10000 });
    comprobar(await boton.isDisabled(), 'sin profundidad no deja configurar');
    comprobar(await dlg.getByRole('button', { name: /^Registrar/ }).last().isDisabled(), 'sin dimensión configurada no deja registrar todavía');
    await p.screenshot({ path: `${SALIDA}/llanta_dim_1_pide_profundidad.png` });
    await dlg.getByLabel(/Profundidad inicial \(mm\)/).fill('16.5');
    await boton.click();
    await dlg.getByText('Profundidad inicial 16.5 mm').waitFor({ timeout: 15000 });
    comprobar(true, 'queda elegida con la profundidad que se indicó');
    comprobar(!(await boton.isVisible().catch(() => false)), 'el aviso de configurar desaparece');
    await p.screenshot({ path: `${SALIDA}/llanta_dim_2_configurada.png` });
    const rds = await api('GET', `/eam/neumaticos/catalogo/referencias/${creado.ref.id}/dimensiones`);
    comprobar(rds.length === 1 && rds[0].profundidad_inicial === 16.5 && rds[0].dimension_id === creado.dim.id, 'la combinación quedó guardada en el catálogo');

    // 2. Se registra la llanta
    await dlg.getByRole('button', { name: /^Registrar/ }).last().click();
    await p.getByText('Neumático registrado').waitFor({ timeout: 20000 });
    const llantas = await api('GET', `/eam/neumaticos?busqueda=ZZLL${sello}&limite=5`);
    creado.llanta = llantas.find(n => n.codigo === `ZZLL${sello}`);
    comprobar(!!creado.llanta && creado.llanta.medida === creado.dim.nombre && creado.llanta['profundidad_diseño'] === 16.5,
      `la llanta se creó con esa dimensión y profundidad (${creado.llanta && creado.llanta.medida})`);

    // 3. Referencia CON una dimensión: sigue igual, y además ofrece las otras
    await p.getByRole('button', { name: /Registrar llanta/ }).click();
    await dlg.getByText('Registrar neumático').waitFor({ timeout: 20000 });
    await elegir(0, creado.marca.nombre);
    await elegir(1, creado.ref2.nombre);
    await combos.nth(2).click();
    comprobar(await p.getByRole('option', { name: `${creado.dim2.nombre} · 14 mm` }).count() === 1, 'la dimensión ya configurada sale con su profundidad, como antes');
    await p.getByRole('option', { name: `${creado.dim2.nombre} · 14 mm` }).click();
    await dlg.getByText('Profundidad inicial 14 mm').waitFor({ timeout: 10000 });
    comprobar(!(await dlg.getByRole('button', { name: 'Configurar y usar' }).isVisible().catch(() => false)), 'una dimensión ya configurada no pide nada más');
    await p.screenshot({ path: `${SALIDA}/llanta_dim_3_ya_configurada.png` });

    comprobar(errores.length === 0, `sin errores de la página ${errores.join(' | ')}`);
    comprobar(fallidas.length === 0, `sin respuestas fallidas ${fallidas.join(' | ')}`);
  } catch (e) {
    fallos++;
    console.log('X   la prueba se interrumpió:', String(e.message || e).slice(0, 400));
  } finally {
    if (b) await b.close();
    const borrar = async (ruta) => { try { await api('DELETE', ruta); } catch (e) { console.log('   (limpieza)', String(e.message).slice(0, 120)); } };
    if (creado.llanta) await borrar(`/eam/neumaticos/${creado.llanta.id}`);
    for (const r of [creado.ref, creado.ref2]) if (r) {
      try { for (const rd of await api('GET', `/eam/neumaticos/catalogo/referencias/${r.id}/dimensiones`)) await borrar(`/eam/neumaticos/catalogo/referencia-dimension/${rd.id}`); } catch {}
      await borrar(`/eam/neumaticos/catalogo/referencias/${r.id}`);
    }
    for (const d of [creado.dim, creado.dim2]) if (d) await borrar(`/eam/neumaticos/catalogo/dimensiones/${d.id}`);
    if (creado.marca) await borrar(`/eam/neumaticos/catalogo/marcas/${creado.marca.id}`);
    if (creado.usuario) await borrar(`/usuarios/${creado.usuario.id}`);
  }
  console.log(fallos ? `FALLOS: ${fallos}` : 'TODO BIEN');
  process.exit(fallos ? 1 : 0);
})();
