/**
 * El modelo en memoria de un tablero interactivo.
 *
 * El servidor entrega los hechos ya agrupados por las dimensiones que se pueden
 * filtrar (tabla de columnas + filas), y aquí se cortan y suman en el navegador.
 * Así un clic filtra todos los gráficos al instante, sin volver al servidor:
 * es lo que hace Power BI con su modelo en memoria.
 *
 * Un filtro sobre una dimensión que una tabla no tiene no la afecta (el mes no
 * cambia cuántos activos hay). `filtrar` lo resuelve solo: ignora las
 * dimensiones que las filas no traen.
 */

export interface TablaServidor {
  columnas: string[]
  filas: unknown[][]
}

/** dimensión → valores elegidos. Una dimensión sin valores no filtra. */
export type Filtros = Record<string, string[]>

export type Fila = Record<string, unknown>

export function aFilas<T extends Fila = Fila>(t?: TablaServidor | null): T[] {
  if (!t) return []
  return t.filas.map(f => Object.fromEntries(t.columnas.map((c, i) => [c, f[i]])) as T)
}

/**
 * Las filas que pasan los filtros. `excepto` deja fuera la dimensión del propio
 * gráfico: el gráfico donde se hizo clic sigue mostrando todas sus barras (con
 * la elegida resaltada) y son los demás los que se filtran.
 */
export function filtrar<T extends Fila>(filas: T[], filtros: Filtros, excepto?: string): T[] {
  const activos = Object.entries(filtros).filter(([d, v]) => d !== excepto && v.length > 0)
  if (!activos.length || !filas.length) return filas
  const aplican = activos.filter(([d]) => d in filas[0])
  if (!aplican.length) return filas
  const conjuntos = aplican.map(([d, v]) => [d, new Set(v)] as const)
  return filas.filter(f => conjuntos.every(([d, s]) => s.has(String(f[d]))))
}

/** Qué filtros activos no afectan a una tabla, para decirlo en el tooltip. */
export function filtrosQueNoAplican(filas: Fila[], filtros: Filtros): string[] {
  if (!filas.length) return []
  return Object.entries(filtros).filter(([d, v]) => v.length && !(d in filas[0])).map(([d]) => d)
}

export const sumar = <T extends Fila>(filas: T[], campo: keyof T & string): number =>
  filas.reduce((s, f) => s + (Number(f[campo]) || 0), 0)

export interface Grupo {
  clave: string
  /** La medida que dibuja el gráfico. */
  valor: number
  /** Todas las medidas sumadas del grupo, para el tooltip. */
  sumas: Record<string, number>
  filas: number
}

/**
 * Agrupa por una dimensión y suma las medidas pedidas. `medida` es el campo a
 * dibujar, o una función de las sumas para lo que no es sumable (un MTTR es
 * horas / casos, no la suma de MTTRs).
 */
export function agrupar<T extends Fila>(
  filas: T[], dimension: keyof T & string, medidas: string[],
  medida: string | ((sumas: Record<string, number>) => number),
): Grupo[] {
  const mapa = new Map<string, Grupo>()
  for (const f of filas) {
    const clave = String(f[dimension] ?? '—')
    let g = mapa.get(clave)
    if (!g) { g = { clave, valor: 0, sumas: Object.fromEntries(medidas.map(m => [m, 0])), filas: 0 }; mapa.set(clave, g) }
    for (const m of medidas) g.sumas[m] += Number(f[m]) || 0
    g.filas += 1
  }
  const grupos = [...mapa.values()]
  for (const g of grupos) g.valor = typeof medida === 'function' ? medida(g.sumas) : (g.sumas[medida] ?? g.filas)
  return grupos
}
