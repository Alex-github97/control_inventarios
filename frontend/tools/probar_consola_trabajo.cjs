/**
 * Comprueba en el navegador el area de trabajo de una incidencia:
 * el reloj, el salto libre de estado, y la vista previa y el borrado de
 * adjuntos.
 *
 *   TOKEN=<jwt de la consola> node probar_consola_trabajo.cjs
 *
 * ESCRIBE: arranca y pausa el reloj, mueve la incidencia de estado y la
 * devuelve, y sube y borra un archivo de prueba. Se hace contra una incidencia
 * real a proposito: la unica forma de saber que la pantalla y el servidor se
 * entienden es que el cambio quede.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

const APP = process.env.APP || 'https://administrador.tittanware.tech';
const TOKEN = process.env.TOKEN;
const SALIDA = process.env.SALIDA || '/salida';
if (!TOKEN) { console.error('Falta TOKEN'); process.exit(1); }

const pausa = (p, ms) => p.waitForTimeout(ms);

(async () => {
  fs.writeFileSync('/tmp/vista.png', Buffer.from(
    // Un PNG de 1x1 en rojo. Sirve para probar que la vista previa pinta una
    // imagen de verdad y no el icono de imagen rota.
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'));

  const b = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/chromium-browser',
    args: ['--no-sandbox'],
  });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('tw_admin_sesion',
      JSON.stringify({ token: t, usuario: 'admin', empresa: 'tittanware' }));
  }, TOKEN);

  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  p.on('response', r => {
    const u = r.url();
    if (/\/(tiempo|estado|estados|adjuntos)/.test(u) && r.status() >= 400) {
      console.log(`  RED ${r.status()} ${r.request().method()} ${u.split('/api/v1')[1]}`);
    }
  });

  await p.goto(APP + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await pausa(p, 1800);
  await p.getByText('Proyectos', { exact: true }).first().click();
  await pausa(p, 3000);

  // La consola abre en el ultimo proyecto usado, que no siempre es el que tiene
  // incidencias. Se cambia al de soporte antes de buscar.
  const selectorProyecto = p.locator('header, div')
    .filter({ hasText: /^DESARROLLOS/ }).last();
  if (await selectorProyecto.count()) {
    await selectorProyecto.click({ force: true });
    await pausa(p, 1200);
    const opcion = p.getByText(/Soporte y mantenimiento/).last();
    if (await opcion.count()) await opcion.click({ force: true });
    await pausa(p, 3000);
  }

  const claves = p.getByText(/^(SOP|DES)-\d+$/);
  if (!await claves.count()) {
    console.log('No hay incidencias con las que probar.');
    await p.screenshot({ path: `${SALIDA}/sin-incidencias.png` });
    await b.close(); return;
  }
  await claves.first().click({ force: true });
  await pausa(p, 3500);
  await p.screenshot({ path: `${SALIDA}/trabajo-1-detalle.png` });

  // ── El reloj ────────────────────────────────────────────────────────────────
  console.log('\n== RELOJ ==');
  const empezar = p.getByRole('button', { name: /Empezar|Reanudar/ });
  console.log('boton de arranque presente:', await empezar.count());
  if (await empezar.count()) {
    await empezar.first().click();
    await pausa(p, 3000);
    console.log('  arrancó:', await p.getByRole('button', { name: /Pausar/ }).count() > 0);
    console.log('  dice «trabajando ahora»:',
                await p.getByText(/trabajando ahora/).count() > 0);
    await p.screenshot({ path: `${SALIDA}/trabajo-2-reloj.png` });

    // El contador tiene que MOVERSE solo: si se quedara quieto, el tramo
    // estaria abierto en el servidor y la pantalla no lo estaria mostrando.
    const antes = await p.locator('text=/^\\d+ (s|min)$/').first().textContent()
      .catch(() => null);
    await pausa(p, 4000);
    const despues = await p.locator('text=/^\\d+ (s|min)$/').first().textContent()
      .catch(() => null);
    console.log(`  contador vivo: ${antes} -> ${despues}`,
                antes !== despues ? 'SÍ' : 'NO');

    await p.getByRole('button', { name: /Pausar/ }).first().click();
    await pausa(p, 3000);
    console.log('  pausó:', await p.getByRole('button', { name: /Reanudar/ }).count() > 0);
  }

  // ── El salto de estado ──────────────────────────────────────────────────────
  console.log('\n== SALTO DE ESTADO ==');
  const selector = p.locator('button').filter({ hasText: /Por clasificar|Por hacer|En curso|En revisión|Hecho|Descartada/ }).last();
  console.log('selector de estado presente:', await selector.count());
  if (await selector.count()) {
    const original = (await selector.textContent() || '').trim();
    console.log('  estado actual:', original);
    await selector.click({ force: true });
    await pausa(p, 1200);
    const opciones = p.locator('li[role=menuitem]');
    const n = await opciones.count();
    console.log('  estados ofrecidos:', n, '(deben ser TODOS, no solo los siguientes)');
    await p.screenshot({ path: `${SALIDA}/trabajo-3-estados.png` });
    if (n > 1) {
      // El ultimo del flujo: si se puede saltar hasta ahi de una, el salto
      // libre funciona; el camino declarado obligaria a pasar por el medio.
      const destino = (await opciones.last().textContent() || '').trim();
      await opciones.last().click({ force: true });
      await pausa(p, 3500);
      console.log(`  saltó a «${destino}»:`,
                  await p.getByText(/Estado actualizado/).count() > 0);

      // Y de vuelta, que es lo que de verdad se pidio.
      const sel2 = p.locator('button').filter({ hasText: new RegExp(destino) }).last();
      if (await sel2.count()) {
        await sel2.click({ force: true });
        await pausa(p, 1200);
        const volver = p.locator('li[role=menuitem]').filter({ hasText: original }).first();
        if (await volver.count()) {
          await volver.click({ force: true });
          await pausa(p, 3500);
          console.log(`  regresó a «${original}»:`,
                      await p.getByText(new RegExp(original)).count() > 0);
        }
      }
    }
  }

  // ── Adjuntos: vista previa y borrado ────────────────────────────────────────
  console.log('\n== ADJUNTOS ==');
  const entrada = p.locator('input[type=file]');
  if (await entrada.count()) {
    await entrada.first().setInputFiles('/tmp/vista.png');
    await pausa(p, 4500);
    const chip = p.locator('.MuiChip-root').filter({ hasText: 'vista.png' }).first();
    console.log('aparece el chip:', await chip.count());

    if (await chip.count()) {
      await chip.locator('.MuiChip-label').click({ force: true });
      await pausa(p, 3500);
      const img = p.locator('div[role=dialog] img[alt="vista.png"]');
      console.log('  abre la vista previa:', await img.count() > 0);
      if (await img.count()) {
        // Que la etiqueta exista no basta: una imagen rota tambien existe.
        const cargada = await img.first().evaluate(
          (e) => e.complete && e.naturalWidth > 0);
        console.log('  la imagen carga de verdad:', cargada);
      }
      await p.screenshot({ path: `${SALIDA}/trabajo-4-vista-previa.png` });
      await p.keyboard.press('Escape');
      await pausa(p, 1200);

      const chip2 = p.locator('.MuiChip-root').filter({ hasText: 'vista.png' }).first();
      await chip2.locator('.MuiChip-deleteIcon').click({ force: true });
      await pausa(p, 1200);
      console.log('  pregunta antes de borrar:',
                  await p.getByText(/¿Eliminar este archivo\?/).count() > 0);
      await p.screenshot({ path: `${SALIDA}/trabajo-5-confirmar.png` });
      await p.getByRole('button', { name: 'Eliminar' }).first().click();
      await pausa(p, 3500);
      console.log('  borró:', await p.getByText(/Archivo eliminado/).count() > 0);
      console.log('  desapareció de la lista:',
                  await p.locator('.MuiChip-root').filter({ hasText: 'vista.png' }).count() === 0);
    }
  }

  console.log('\nerrores de JS:', errores.length ? errores : 'ninguno');
  await p.screenshot({ path: `${SALIDA}/trabajo-6-final.png` });
  await b.close();
})();
