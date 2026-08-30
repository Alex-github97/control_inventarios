/**
 * Descarga de informes en Excel.
 *
 * Se hace en el navegador con SheetJS —la misma librería que ya usan el cargue
 * masivo de catálogos y el módulo de llantas— y no en el servidor, porque los
 * datos ya están en pantalla: pedirle al backend que los vuelva a consultar y
 * los arme sería recorrer todo dos veces para producir lo mismo.
 *
 * DOS COSAS QUE PARECEN DETALLE Y NO LO SON
 *
 * Los números van como números y no como texto. Un Excel donde no se puede
 * sumar una columna obliga a rehacer el trabajo a mano, que es justo lo que se
 * quería evitar al descargarlo.
 *
 * El ancho de columna se calcula del contenido. Una hoja donde todo sale como
 * «####» se ve rota, y la primera reacción de quien la abre es desconfiar de
 * las cifras.
 */
import * as XLSX from 'xlsx'

/** Una columna del informe: de dónde sale el dato y cómo se titula. */
export interface Columna<T> {
  titulo: string
  /** Clave de la fila, o una función para lo derivado. */
  valor: keyof T | ((fila: T) => any)
  /** Ancho en caracteres. Si se omite, se calcula del contenido. */
  ancho?: number
}

const MAX_ANCHO = 55

function _valor<T>(fila: T, col: Columna<T>): any {
  const v = typeof col.valor === 'function'
    ? (col.valor as (f: T) => any)(fila)
    : (fila as any)[col.valor]
  if (v === null || v === undefined) return ''
  // Las fechas ISO se entregan como objeto Date para que Excel las reconozca y
  // se puedan ordenar y filtrar por rango.
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d
  }
  return v
}

/**
 * Arma una hoja a partir de filas y columnas declaradas.
 *
 * Se separa de `descargarExcel` porque un informe puede tener varias hojas —el
 * de rotación trae existencias y kárdex juntos— y así no hay que duplicar el
 * armado.
 */
export function hoja<T>(filas: T[], columnas: Columna<T>[]): XLSX.WorkSheet {
  const datos = filas.map(f => {
    const salida: Record<string, any> = {}
    for (const c of columnas) salida[c.titulo] = _valor(f, c)
    return salida
  })

  const ws = XLSX.utils.json_to_sheet(datos, {
    header: columnas.map(c => c.titulo),
  })

  ws['!cols'] = columnas.map(c => {
    if (c.ancho) return { wch: c.ancho }
    const largos = datos.map(d => String(d[c.titulo] ?? '').length)
    return { wch: Math.min(MAX_ANCHO, Math.max(c.titulo.length + 2, ...largos, 8)) }
  })
  // Congela el encabezado: un informe de trescientas filas es inútil si al
  // bajar se pierde de vista qué columna es cuál.
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  if (datos.length) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 }, e: { c: columnas.length - 1, r: datos.length } }),
    }
  }
  return ws
}

/** Nombre de archivo con la fecha, para no acumular copias indistinguibles. */
function _nombre(base: string): string {
  const hoy = new Date()
  const sello = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${
    String(hoy.getDate()).padStart(2, '0')}`
  return `${base.replace(/[^\w\-]+/g, '_')}_${sello}.xlsx`
}

/** Descarga un informe de una sola hoja. */
export function descargarExcel<T>(
  nombre: string, filas: T[], columnas: Columna<T>[], titulo = 'Datos',
): void {
  const wb = XLSX.utils.book_new()
  // Excel no admite más de 31 caracteres en el nombre de una pestaña, y falla
  // en silencio si se pasa.
  XLSX.utils.book_append_sheet(wb, hoja(filas, columnas), titulo.slice(0, 31))
  XLSX.writeFile(wb, _nombre(nombre))
}

/** Descarga un informe con varias hojas. */
export function descargarLibro(
  nombre: string, hojas: { titulo: string; ws: XLSX.WorkSheet }[],
): void {
  const wb = XLSX.utils.book_new()
  for (const h of hojas) {
    XLSX.utils.book_append_sheet(wb, h.ws, h.titulo.slice(0, 31))
  }
  XLSX.writeFile(wb, _nombre(nombre))
}
