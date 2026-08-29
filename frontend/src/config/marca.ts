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
  /** Dos letras, para el distintivo cuadrado cuando el panel está plegado. */
  sigla: 'TW',
  lema: 'Tecnología que fortalece · Soluciones que trascienden',
  descripcion: 'Control, visibilidad y eficiencia operacional.',
  get legal() {
    return `© ${new Date().getFullYear()} TittanWare · Todos los derechos reservados`
  },
} as const

/**
 * La escala de grises de la marca.
 *
 * El logo es monocromo, así que toda la estructura —fondos, superficies,
 * texto, bordes— sale de acá. Los tonos están escalonados a propósito: dos
 * superficies contiguas nunca deben usar el mismo, o se funden y el ojo pierde
 * dónde termina un panel y empieza el otro.
 */
export const PALETA = {
  /** Abismo: el panel más profundo, el que va al fondo de todo. */
  abismo: '#0D0D0D',
  /** Tinta: barra lateral, encabezados, texto principal. */
  tinta: '#1A1A1A',
  /** Carbón: bordes sobre superficie oscura, estados intermedios. */
  carbon: '#333333',
  /** Grafito: texto secundario fuerte, iconos, extremo de degradados. */
  grafito: '#4D4D4D',
  /** Acero: texto secundario, bordes, elementos inactivos. */
  acero: '#8C8C8C',
  /** Niebla: separadores y superficies suaves. */
  niebla: '#E5E5E5',
  /** Bruma: el fondo del área de contenido. */
  bruma: '#F7F7F7',
  /** Lienzo: tarjetas y superficies elevadas. */
  lienzo: '#FFFFFF',
} as const

/**
 * El único color de la interfaz.
 *
 * La marca es monocroma, pero una herramienta que se mira ocho horas al día
 * necesita que se distinga de un vistazo qué es pulsable y qué está activo.
 * Un solo acento lo resuelve sin volver la pantalla un arcoíris: si todo es
 * gris, hay que leer el texto para saber dónde está uno parado.
 */
export const ACENTO = {
  /** Sobre fondo claro: enlaces, botones, foco, dato destacado. */
  base: '#2F6FEB',
  /** El extremo oscuro de los degradados y los estados presionados. */
  profundo: '#1B4FB8',
  /**
   * Sobre fondo oscuro. El tono base no llega a separarse del casi negro de la
   * barra lateral, así que ahí se usa este, más claro.
   */
  claro: '#7BA4F5',
  /** Para rellenos y halos muy suaves sobre fondo claro. */
  vapor: '#EAF1FE',
} as const

/**
 * Colores que significan algo.
 *
 * Estos NO son decoración y por eso no se vuelven grises: una llanta vencida
 * en rojo y una al día en verde se leen de un vistazo, y pintarlas del mismo
 * tono obligaría a leer el texto en cada fila. El acento es de la marca; esto
 * es del dato.
 */
export const ESTADO = {
  exito: '#16A34A',
  alerta: '#D97706',
  peligro: '#DC2626',
  informacion: ACENTO.base,
} as const

/**
 * El color de identidad de cualquier módulo. Antes cada uno tenía el suyo, y
 * la plataforma parecía veinte productos distintos pegados.
 */
export const COLOR_MODULO = ACENTO.base
export const COLOR_MODULO_CLARO = ACENTO.profundo

/**
 * El mismo papel, sobre superficies oscuras.
 *
 * La barra lateral y el panel de espacios son casi negros: ni el tinta ni el
 * acento base se despegan de ese fondo. Ahí el acento es su tono claro.
 */
export const COLOR_MODULO_SOBRE_OSCURO = ACENTO.claro

/**
 * Series de las gráficas.
 *
 * Es el único sitio donde hacen falta varios colores a la vez: en una torta o
 * en varias líneas, cada serie tiene que distinguirse de la de al lado o el
 * gráfico no se puede leer. En vez de ocho tonos saturados sin relación, esta
 * escala va del acento al gris pasando por tonos vecinos, así que sigue
 * pareciendo la misma marca.
 *
 * Está ordenada por contraste: las primeras se separan mejor entre sí, que es
 * lo que importa cuando la gráfica solo tiene dos o tres series.
 */
export const SERIES = [
  '#2F6FEB', // acento
  '#1A1A1A', // tinta
  '#7BA4F5', // acento claro
  '#4D4D4D', // grafito
  '#1B4FB8', // acento profundo
  '#8C8C8C', // acero
  '#A8C4F8', // acento muy claro
  '#333333', // carbón
] as const

/**
 * Las superficies, de la más profunda a la más elevada.
 *
 * Se nombran por su papel y no por su color para que la jerarquía sea
 * explícita: el panel de espacios va detrás de la barra lateral, y la barra
 * lateral detrás del contenido.
 */
export const SUPERFICIE = {
  espacios: PALETA.abismo,
  barra: PALETA.tinta,
  /** La línea que separa los dos paneles oscuros, que si no se funden. */
  divisorOscuro: 'rgba(255,255,255,0.08)',
  contenido: PALETA.bruma,
  tarjeta: PALETA.lienzo,
  divisor: PALETA.niebla,
} as const
