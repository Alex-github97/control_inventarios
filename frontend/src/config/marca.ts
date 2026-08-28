/**
 * Identidad del producto, en un solo lugar.
 *
 * La plataforma es multicliente: el nombre de la empresa que la usa sale del
 * registro de clientes y se muestra tras elegirla. Lo de acá es el nombre del
 * producto en sí, que es de quien lo desarrolla y no de ninguno de sus
 * clientes.
 *
 * Para cambiarlo, basta editar estas constantes.
 */
export const MARCA = {
  /** Nombre del producto. */
  nombre: 'Plataforma Empresarial',
  /** Versión corta para el encabezado. */
  corto: 'Plataforma',
  /** Descripción de una línea. */
  descripcion: 'Control, visibilidad y eficiencia operacional.',
  /** Pie de página. El año se calcula para no quedar desactualizado. */
  legal: `© ${new Date().getFullYear()} · Todos los derechos reservados`,
} as const
