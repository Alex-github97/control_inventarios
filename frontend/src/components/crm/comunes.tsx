/**
 * Los colores propios del comercial, sobre las piezas comunes.
 *
 * Lo genérico —el estado de una consulta, la tabla, el indicador— vive en
 * `components/datos/vista`, que usan todos los módulos. Aquí quedan solo los
 * mapas de color que significan algo únicamente en el CRM: qué es un cliente
 * activo, qué es una etapa del embudo.
 */
import { ACENTO } from '@/components/datos/vista'

export {
  ACENTO as CRM_COLOR, BORDE, num, pesos, porcentaje, fecha, fechaHora,
  legible, Estado, Encabezados, Panel, Indicador, BarraSalud,
} from '@/components/datos/vista'

export const COLOR_ESTADO_CLIENTE: Record<string, string> = {
  CLIENTE_ACTIVO: '#059669', PROSPECTO: '#94A3B8', LEAD: '#0EA5E9',
  CLIENTE_INACTIVO: '#F59E0B', EXCLIENTE: '#EF4444',
}
export const COLOR_SEGMENTO: Record<string, string> = {
  CORPORATIVO: ACENTO, ESTRATEGICO: '#7C3AED',
  MEDIANA: '#0EA5E9', PEQUENA: '#059669',
}
export const COLOR_ETAPA: Record<string, string> = {
  IDENTIFICACION: '#94A3B8', CALIFICACION: '#0EA5E9', PROPUESTA: '#F59E0B',
  NEGOCIACION: '#7C3AED', CIERRE_GANADO: '#059669', CIERRE_PERDIDO: '#EF4444',
}
export const COLOR_TICKET: Record<string, string> = {
  ABIERTO: '#0EA5E9', EN_PROCESO: '#F59E0B', ESCALADO: '#EF4444',
  RESUELTO: '#059669', CERRADO: '#94A3B8',
}
export const COLOR_PRIORIDAD: Record<string, string> = {
  CRITICA: '#DC2626', ALTA: '#EF4444', MEDIA: '#F59E0B', BAJA: '#94A3B8',
}
