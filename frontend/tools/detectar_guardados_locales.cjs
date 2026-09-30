/**
 * Encuentra «guardados» que no guardan: funciones que agregan, editan o
 * borran registros de una lista en memoria (useState) sin llamar al servidor.
 *
 * Es el patrón que dejaron las maquetas: el botón «Registrar» hace
 *   setLista(prev => [nuevo, ...prev])
 * y muestra «registrado correctamente», pero al recargar el registro no
 * existe. Un auditor de botones no lo ve —el botón SÍ hace algo en pantalla—;
 * hay que leer el código.
 *
 * Cómo decide: busca cada función (flecha o declarada) que modifique una lista
 * con un setter —agregar con spread, filtrar para borrar, mapear para editar— y
 * revisa si en esa misma función hay una llamada al servidor (api, apiClient,
 * xxxApi.algo, fetch, mutate, guardar(...)). Si no la hay, la reporta.
 *
 *   node detectar_guardados_locales.cjs [ruta/a/src]
 */
const fs = require('fs')
const path = require('path')

const RAIZ = process.argv[2] || path.join(__dirname, '..', 'src')
const archivos = []
const recorrer = d => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) recorrer(p)
    else if (/\.tsx$/.test(f)) archivos.push(p)
  }
}
recorrer(RAIZ)

// Un setter que cambia una lista de registros: agregar, borrar o editar.
const MUTA_LISTA = /\bset[A-Z]\w*\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*(\[\s*\.\.\.\s*\1|\[[^\]]*\.\.\.\s*\1\s*\]|\1\.filter\(|\1\.map\()/
const LLAMA_SERVIDOR = /\b(api|apiClient|axios)\s*\.\s*(get|post|put|patch|delete)\b|\b\w+Api\s*\.\s*\w+\(|\bfetch\(|\.mutate(Async)?\(|\bguardar\w*\(|\bcrud\.\w+|\bmutation\.|await\s+\w+\(/
// Estados de interfaz que sí es legítimo manejar en memoria.
const INTERFAZ = /set(Expanded|Abiertos?|Seleccion|Sel\b|Selected|Filtros?|Orden|Pagina|Tab|Visibles|Columnas|Errores|Touched|Archivos|Pendientes|Chips|Tags|Campos|Filas?Form|Lineas|Items|Opciones|Pasos|Mensajes|Historial|Chat|Toasts?|Snack|Notif|Checked|Marcad|Drag|Zoom|Hover)/i

const hallazgos = []
for (const f of archivos) {
  const src = fs.readFileSync(f, 'utf8')
  const lineas = src.split('\n')
  lineas.forEach((l, i) => {
    const m = l.match(MUTA_LISTA)
    if (!m || INTERFAZ.test(l)) return
    // La función que contiene la línea: se retrocede hasta el inicio del
    // bloque (una declaración `const x = (...) =>` o `function x`) y se avanza
    // hasta que cierra, para ver si en ella hay llamada al servidor.
    let ini = i
    while (ini > 0 && !/(const|let|function)\s+\w+\s*=?\s*(async\s*)?(\(|function)|onClick=\{|onSuccess:|onSubmit=/.test(lineas[ini])) ini--
    const bloque = lineas.slice(ini, Math.min(lineas.length, i + 25)).join('\n')
    if (LLAMA_SERVIDOR.test(bloque)) return
    // Si el setter vive dentro de un onSuccess de react-query, ya se guardó.
    if (/onSuccess|then\(|invalidateQueries/.test(lineas.slice(Math.max(0, i - 6), i + 1).join('\n'))) return
    hallazgos.push({ archivo: path.relative(RAIZ, f).replace(/\\/g, '/'), linea: i + 1, codigo: l.trim().slice(0, 110) })
  })
}

const porArchivo = {}
for (const h of hallazgos) (porArchivo[h.archivo] ||= []).push(h)
console.log(`=== POSIBLES GUARDADOS SOLO EN MEMORIA (${hallazgos.length} en ${Object.keys(porArchivo).length} archivos) ===`)
console.log('Hay que mirarlos uno a uno: algunos son listas de un formulario antes de enviarlo.\n')
for (const [a, hs] of Object.entries(porArchivo).sort((x, y) => y[1].length - x[1].length)) {
  console.log(`${a} (${hs.length})`)
  for (const h of hs.slice(0, 6)) console.log(`   ${String(h.linea).padStart(5)}: ${h.codigo}`)
}
