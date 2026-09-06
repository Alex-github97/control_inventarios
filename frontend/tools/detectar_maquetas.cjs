/**
 * Encuentra las pantallas que muestran datos inventados en el codigo.
 *
 * QUE CUENTA COMO MAQUETA
 * No basta con que haya un arreglo constante: una lista de meses, de colores o
 * de opciones de un desplegable son constantes legitimas y estan en casi todas
 * las pantallas. Lo que delata a una maqueta es un arreglo de OBJETOS con
 * pinta de registro —id, nombre, fecha, cantidades— que ademas se pinta en la
 * pantalla, en un archivo que no le pregunta nada al servidor.
 *
 * Por eso se cruzan tres senales y no una:
 *   1. Hay un arreglo de objetos con varios campos (un registro, no una opcion).
 *   2. Ese arreglo se recorre para pintar algo (`.map(`).
 *   3. La pantalla no trae ese dato del servidor.
 *
 * La tercera es la que decide. Una pantalla que consulta al servidor Y ademas
 * tiene una lista fija casi siempre esta usando esa lista como catalogo de
 * apoyo —los estados posibles, las columnas— y no como datos falsos.
 *
 *   node detectar_maquetas.cjs [ruta/a/src/pages]
 */
const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || path.join(__dirname, '..', 'src', 'pages');

// Campos que solo aparecen en registros de negocio. Si un objeto del arreglo
// trae alguno, no es una opcion de un desplegable.
const CAMPOS_DE_REGISTRO = /\b(id|codigo|nombre|fecha|cantidad|total|valor|estado|cliente|placa|documento|monto|saldo|referencia|numero|responsable|creado|vence)\s*:/;

/** Los arreglos de objetos declarados en el archivo, con su nombre y tamano. */
function arreglosDeObjetos(src) {
  const salida = [];
  const re = /const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\[/g;
  let m;
  while ((m = re.exec(src))) {
    // Se recorre a mano hasta el corchete que cierra: una expresion regular no
    // sabe de anidamiento, y estos arreglos llevan objetos dentro de objetos.
    let i = re.lastIndex, prof = 1;
    while (i < src.length && prof > 0) {
      const c = src[i];
      if (c === '[') prof++;
      else if (c === ']') prof--;
      i++;
    }
    const cuerpo = src.slice(re.lastIndex, i - 1);
    const objetos = (cuerpo.match(/\{/g) || []).length;
    if (objetos >= 2 && CAMPOS_DE_REGISTRO.test(cuerpo)) {
      salida.push({ nombre: m[1], objetos, largo: cuerpo.length });
    }
  }
  return salida;
}

const archivos = fs.readdirSync(DIR).filter(f => f.endsWith('.tsx'));
const maquetas = [];
const mixtas = [];

for (const f of archivos) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const arr = arreglosDeObjetos(src);
  if (!arr.length) continue;

  // Solo los que de verdad se pintan.
  const pintados = arr.filter(a =>
    new RegExp(`${a.nombre}\\s*[.\\)\\]]*\\s*\\.?(map|filter|slice|sort|reduce|find)\\(`)
      .test(src) || new RegExp(`\\{\\s*${a.nombre}`).test(src));
  if (!pintados.length) continue;

  const consulta = /useQuery|useInfiniteQuery/.test(src);
  const fila = {
    archivo: f,
    registros: pintados.reduce((s, a) => s + a.objetos, 0),
    arreglos: pintados.map(a => a.nombre),
    lineas: src.split('\n').length,
  };
  (consulta ? mixtas : maquetas).push(fila);
}

const porTamano = (a, b) => b.registros - a.registros;
maquetas.sort(porTamano);
mixtas.sort(porTamano);

const modulo = (f) => (f.match(/^[A-Z]+/) || ['OTRO'])[0];
const agrupar = (lista) => {
  const g = {};
  for (const x of lista) (g[modulo(x.archivo)] ||= []).push(x.archivo);
  return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
};

console.log(`=== MAQUETAS COMPLETAS (${maquetas.length}) ===`);
console.log('No consultan nada al servidor. Todo lo que se ve esta escrito en el codigo.\n');
for (const [m, fs_] of agrupar(maquetas)) {
  console.log(`  ${m.padEnd(10)} ${String(fs_.length).padStart(2)}  ${fs_.join(' ')}`);
}

console.log(`\n=== MIXTAS (${mixtas.length}) ===`);
console.log('Consultan al servidor Y ademas tienen datos fijos. Hay que mirarlas una a una:');
console.log('la lista fija puede ser un catalogo legitimo o un trozo sin terminar.\n');
for (const x of mixtas.slice(0, 30)) {
  console.log(`  ${x.archivo.padEnd(30)} ${String(x.registros).padStart(3)} reg  ${x.arreglos.join(', ')}`);
}
if (mixtas.length > 30) console.log(`  … y ${mixtas.length - 30} mas`);

console.log(`\nTOTAL a revisar: ${maquetas.length} maquetas + ${mixtas.length} mixtas`);
