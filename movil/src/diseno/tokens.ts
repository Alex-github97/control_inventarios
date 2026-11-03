/**
 * Los tokens del sistema de diseño de la app.
 *
 * Es el único archivo con colores, tamaños y tiempos escritos a mano; el lint
 * prohíbe colores literales fuera de `src/diseno`. La marca (acento, estados)
 * sale de `compartido/marca.ts`, la misma del portal: cambiar el acento allá
 * cambia el portal y la app.
 *
 * Claro y oscuro son dos juegos diseñados, no una inversión: en oscuro las
 * superficies suben de tono con la elevación (no con sombras) y el acento pasa
 * a su variante clara para despegarse del fondo.
 */
import { ACENTO, ESTADO, PALETA, SERIES } from '@compartido/marca'

export interface Colores {
  fondo: string
  superficie: string
  elevada: string
  hundida: string
  borde: string
  bordeFuerte: string
  texto: string
  textoSecundario: string
  textoTerciario: string
  textoSobreAcento: string
  acento: string
  acentoPresionado: string
  acentoSuave: string
  /** Texto o ícono de acento sobre `acentoSuave`: en claro el acento base no llega a AA sobre su tinte. */
  acentoSobreSuave: string
  exito: string
  exitoSuave: string
  alerta: string
  alertaSuave: string
  peligro: string
  peligroSuave: string
  moderada: string
  moderadaSuave: string
  informacion: string
  /** Series categóricas de gráficos, en el orden del portal (SERIES): acento, tinta, acento claro, grafito. */
  serie: readonly [string, string, string, string]
  velo: string
  sombra: string
  brillo: string
}

export const CLARO: Colores = {
  fondo: '#F4F5F7',
  superficie: PALETA.lienzo,
  elevada: PALETA.lienzo,
  hundida: '#ECEEF1',
  borde: '#E4E6EA',
  bordeFuerte: '#CDD1D8',
  texto: '#0E1013',
  textoSecundario: '#565D6A',
  textoTerciario: '#646B77',
  textoSobreAcento: '#FFFFFF',
  acento: ACENTO.base,
  acentoPresionado: ACENTO.profundo,
  acentoSuave: ACENTO.vapor,
  acentoSobreSuave: ACENTO.profundo,
  exito: '#15803D',
  exitoSuave: '#EEF9F2',
  alerta: '#B45309',
  alertaSuave: '#FDF2E3',
  peligro: '#C81E1E',
  peligroSuave: '#FDECEC',
  moderada: '#A16207',
  moderadaSuave: '#FDF6D8',
  informacion: ACENTO.base,
  serie: [SERIES[0]!, SERIES[1]!, SERIES[2]!, SERIES[5]!],
  velo: 'rgba(14,16,19,0.45)',
  sombra: '#0E1013',
  brillo: 'rgba(255,255,255,0.6)',
}

export const OSCURO: Colores = {
  fondo: '#0B0C0E',
  superficie: '#141619',
  elevada: '#1B1E22',
  hundida: '#0F1113',
  borde: '#24282E',
  bordeFuerte: '#333942',
  texto: '#F3F5F8',
  textoSecundario: '#A7AEBA',
  textoTerciario: '#8A919D',
  textoSobreAcento: '#0B0C0E',
  acento: ACENTO.claro,
  acentoPresionado: '#A8C4F8',
  acentoSuave: 'rgba(123,164,245,0.14)',
  acentoSobreSuave: ACENTO.claro,
  exito: '#4ADE80',
  exitoSuave: 'rgba(74,222,128,0.13)',
  alerta: '#FBBF24',
  alertaSuave: 'rgba(251,191,36,0.13)',
  peligro: '#F87171',
  peligroSuave: 'rgba(248,113,113,0.14)',
  moderada: '#FACC15',
  moderadaSuave: 'rgba(250,204,21,0.13)',
  informacion: ACENTO.claro,
  serie: [ACENTO.claro, '#E6E8EB', SERIES[4]!, SERIES[5]!],
  velo: 'rgba(0,0,0,0.6)',
  sombra: '#000000',
  brillo: 'rgba(255,255,255,0.06)',
}

/** Los colores de dato de la marca, para gráficos (no cambian con el modo). */
export const DATO = { exito: ESTADO.exito, alerta: ESTADO.alerta, peligro: ESTADO.peligro, moderada: '#EAB308' } as const

/** Retícula de 4 puntos. */
export const ESPACIO = { e0: 0, e1: 4, e2: 8, e3: 12, e4: 16, e5: 20, e6: 24, e8: 32, e10: 40, e12: 48, e16: 64 } as const

export const RADIO = { chico: 8, medio: 12, grande: 16, xl: 24, total: 999 } as const

/** Inter, cargada en el layout raíz con estos nombres. */
export const FUENTE = {
  regular: 'Inter_400Regular',
  media: 'Inter_500Medium',
  seminegrita: 'Inter_600SemiBold',
  negrita: 'Inter_700Bold',
  extra: 'Inter_800ExtraBold',
} as const

/** Escala tipográfica (tamaño / interlineado / fuente / espaciado). */
export const TIPO = {
  display: { fontSize: 34, lineHeight: 40, fontFamily: FUENTE.extra, letterSpacing: -0.8 },
  titulo: { fontSize: 26, lineHeight: 32, fontFamily: FUENTE.negrita, letterSpacing: -0.5 },
  subtitulo: { fontSize: 19, lineHeight: 25, fontFamily: FUENTE.seminegrita, letterSpacing: -0.2 },
  cuerpo: { fontSize: 15, lineHeight: 22, fontFamily: FUENTE.regular, letterSpacing: 0 },
  cuerpoFuerte: { fontSize: 15, lineHeight: 22, fontFamily: FUENTE.seminegrita, letterSpacing: 0 },
  nota: { fontSize: 13, lineHeight: 18, fontFamily: FUENTE.media, letterSpacing: 0 },
  mini: { fontSize: 11, lineHeight: 14, fontFamily: FUENTE.seminegrita, letterSpacing: 0.6 },
  cifra: { fontSize: 30, lineHeight: 34, fontFamily: FUENTE.extra, letterSpacing: -1 },
} as const
export type VarianteTipo = keyof typeof TIPO

/** Duraciones y resortes del movimiento. */
export const MOVIMIENTO = {
  rapido: 140,
  normal: 240,
  lento: 380,
  resorte: { damping: 18, stiffness: 220, mass: 0.9 },
  resorteSuave: { damping: 22, stiffness: 160, mass: 1 },
} as const

/** El objetivo táctil mínimo (Material: 48 dp). */
export const TACTIL = 48

export type NivelElevacion = 0 | 1 | 2 | 3
