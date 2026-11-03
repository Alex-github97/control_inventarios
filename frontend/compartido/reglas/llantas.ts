/**
 * Cómo se presenta una llanta, igual en el portal y en la app.
 *
 * Los umbrales de profundidad no se fijan aquí: vienen de la configuración de
 * llantas de cada empresa (`rango_critico_mm`, `rango_moderado_mm`). Aquí solo
 * está la regla de clasificar con ellos.
 */
import { ESTADO } from '../marca'

/** VN para una llanta nueva, R1, R2… para cada reencauche. */
export const etiquetaVida = (reencauches: number | null | undefined): string =>
  !reencauches ? 'VN' : `R${reencauches}`

export const nombreVida = (reencauches: number | null | undefined): string =>
  !reencauches ? 'Vida nueva' : `${reencauches} reencauche${reencauches === 1 ? '' : 's'}`

export type RangoProfundidad = 'critica' | 'moderada' | 'buena'

export interface UmbralesProfundidad { rango_critico_mm: number; rango_moderado_mm: number }

export const UMBRALES_POR_DEFECTO: UmbralesProfundidad = { rango_critico_mm: 3, rango_moderado_mm: 6 }

/** Hasta el crítico es crítica, hasta el moderado moderada y por encima buen estado. */
export function rangoProfundidad(mm: number | null | undefined,
                                 u: UmbralesProfundidad = UMBRALES_POR_DEFECTO): RangoProfundidad | null {
  if (mm == null || Number.isNaN(mm)) return null
  return mm <= u.rango_critico_mm ? 'critica' : mm <= u.rango_moderado_mm ? 'moderada' : 'buena'
}

export const RANGO: Record<RangoProfundidad, { nombre: string; color: string }> = {
  critica: { nombre: 'Crítica', color: ESTADO.peligro },
  moderada: { nombre: 'Moderada', color: '#EAB308' },
  buena: { nombre: 'Buen estado', color: ESTADO.exito },
}

/** La profundidad que decide: la del surco más gastado. */
export const surcoMasGastado = (...surcos: (number | null | undefined)[]): number | null => {
  const v = surcos.filter((x): x is number => x != null && !Number.isNaN(x))
  return v.length ? Math.min(...v) : null
}
