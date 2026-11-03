/**
 * Contraste WCAG AA de los pares de color que la app usa para texto.
 *
 * Si alguien cambia un token (o el acento de la marca en compartido/marca.ts)
 * y un texto deja de leerse al sol, esta prueba falla nombrando el par.
 * Los colores translúcidos (los «suaves» del modo oscuro) se componen sobre la
 * superficie antes de medir, que es como se ven en pantalla.
 */
import { CLARO, OSCURO, type Colores } from '../tokens'

type RGB = [number, number, number]

function rgba(c: string): [RGB, number] {
  const m = c.match(/^rgba?\(([^)]+)\)$/)
  if (m) {
    const [r, g, b, a = '1'] = m[1]!.split(',').map(x => x.trim())
    return [[Number(r), Number(g), Number(b)], Number(a)]
  }
  const h = c.replace('#', '')
  const x = h.length === 3 ? h.split('').map(d => d + d).join('') : h
  return [[0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)) as RGB, 1]
}

/** El color tal como se ve: si es translúcido, compuesto sobre `fondo`. */
function visto(c: string, fondo: string): RGB {
  const [rgb, a] = rgba(c)
  if (a === 1) return rgb
  const base = visto(fondo, '#000000')
  return rgb.map((v, i) => v * a + base[i]! * (1 - a)) as RGB
}

function luminancia([r, g, b]: RGB) {
  const canal = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(texto: string, fondo: string, debajo: string) {
  const f = visto(fondo, debajo)
  const t = visto(texto, fondo.startsWith('rgba') ? debajo : fondo)
  const [a, b] = [luminancia(t), luminancia(f)].sort((x, y) => y - x)
  return (a! + 0.05) / (b! + 0.05)
}

// [texto, fondo, mínimo]. 4,5 es AA para texto normal; 3 para texto grande
// (cifras, títulos) y para componentes como bordes de foco.
const PARES: [keyof Colores, keyof Colores, number][] = [
  ['texto', 'fondo', 4.5], ['texto', 'superficie', 4.5], ['texto', 'elevada', 4.5],
  ['textoSecundario', 'superficie', 4.5], ['textoSecundario', 'fondo', 4.5],
  ['textoTerciario', 'superficie', 4.5], ['textoTerciario', 'fondo', 4.5],
  ['textoSobreAcento', 'acento', 4.5], ['acento', 'superficie', 4.5], ['acentoSobreSuave', 'acentoSuave', 4.5],
  ['exito', 'exitoSuave', 4.5], ['alerta', 'alertaSuave', 4.5], ['peligro', 'peligroSuave', 4.5],
  ['moderada', 'moderadaSuave', 4.5], ['peligro', 'superficie', 4.5], ['exito', 'superficie', 4.5],
  ['texto', 'hundida', 4.5], ['acento', 'fondo', 3],
]

describe.each([['claro', CLARO], ['oscuro', OSCURO]] as const)('contraste en modo %s', (_, c) => {
  it.each(PARES)('%s sobre %s ≥ %d', (t, f, minimo) => {
    const r = contraste(c[t] as string, c[f] as string, c.superficie)
    expect(Number(r.toFixed(2))).toBeGreaterThanOrEqual(minimo)
  })
})
