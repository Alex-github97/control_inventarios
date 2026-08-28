/**
 * Identidad de TittanWare, en un solo lugar.
 *
 * La plataforma es multicliente: el nombre y el logo de la empresa que la usa
 * salen del registro de clientes. Lo de acá es la marca del producto, que es de
 * quien lo desarrolla y no de ninguno de sus clientes.
 */
export const MARCA = {
  nombre: 'TittanWare',
  /** Como se escribe en el logo: en versales y con espaciado. */
  logotipo: 'TITTANWARE',
  /** Versión breve, para el encabezado y espacios estrechos. */
  corto: 'TITTANWARE',
  lema: 'Tecnología que fortalece · Soluciones que trascienden',
  descripcion: 'Control, visibilidad y eficiencia operacional.',
  get legal() {
    return `© ${new Date().getFullYear()} TittanWare · Todos los derechos reservados`
  },
} as const

/**
 * Paleta monocromática de la marca.
 *
 * Los módulos ya no llevan cada uno su color: la identidad la pone la marca y
 * no el módulo en el que uno esté parado. Se conservan cuatro tonos para que
 * siga habiendo jerarquía visual sin recurrir al color.
 */
export const PALETA = {
  /** Tinta: encabezados, texto principal, superficies oscuras. */
  tinta: '#1A1A1A',
  /** Grafito: acentos, iconos activos, bordes marcados. */
  grafito: '#4D4D4D',
  /** Acero: texto secundario, bordes, elementos inactivos. */
  acero: '#8C8C8C',
  /** Niebla: fondos, separadores, superficies suaves. */
  niebla: '#E5E5E5',
} as const

/**
 * Colores que siguen significando algo.
 *
 * Estos NO se vuelven grises a propósito: una llanta vencida en rojo y una al
 * día en verde se leen de un vistazo, y pintarlas del mismo tono obligaría a
 * leer el texto en cada fila. El monocromo es de la marca, no del estado.
 */
export const ESTADO = {
  exito: '#16A34A',
  alerta: '#D97706',
  peligro: '#DC2626',
  informacion: '#4D4D4D',
} as const

/** El color de identidad de cualquier módulo. Antes cada uno tenía el suyo. */
export const COLOR_MODULO = PALETA.tinta
export const COLOR_MODULO_CLARO = PALETA.grafito

/**
 * El mismo acento, para superficies oscuras.
 *
 * La barra lateral y el panel de módulos son casi negros: pintar el acento de
 * tinta ahí lo haría invisible. Sobre oscuro el acento es el blanco, que cumple
 * el mismo papel — destacar lo activo — sin salirse del monocromo.
 */
export const COLOR_MODULO_SOBRE_OSCURO = '#FFFFFF'
