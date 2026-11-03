/**
 * Estados, prioridades y tipos de una orden de trabajo del CMMS, con el nombre
 * y el color con que se muestran en el portal y en la app.
 */
import { ACENTO, ESTADO } from '../marca'

export const ESTADOS_OT = ['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_ESPERA_REPUESTOS', 'COMPLETADA'] as const
export type EstadoOT = typeof ESTADOS_OT[number]

export const ESTADO_OT: Record<EstadoOT, { nombre: string; corto: string; color: string }> = {
  PENDIENTE: { nombre: 'Pendiente', corto: 'Pendiente', color: ACENTO.base },
  ASIGNADA: { nombre: 'Asignada', corto: 'Asignada', color: '#3B82F6' },
  EN_EJECUCION: { nombre: 'En ejecución', corto: 'En curso', color: ESTADO.exito },
  EN_ESPERA_REPUESTOS: { nombre: 'En espera de repuestos', corto: 'Esp. repuestos', color: '#F59E0B' },
  COMPLETADA: { nombre: 'Completada', corto: 'Completada', color: '#6B7280' },
}

export const PRIORIDADES_OT = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA'] as const
export type PrioridadOT = typeof PRIORIDADES_OT[number]

export const PRIORIDAD_OT: Record<PrioridadOT, { nombre: string; color: string; orden: number }> = {
  URGENTE: { nombre: 'Urgente', color: ESTADO.peligro, orden: 0 },
  ALTA: { nombre: 'Alta', color: ACENTO.base, orden: 1 },
  MEDIA: { nombre: 'Media', color: '#F59E0B', orden: 2 },
  BAJA: { nombre: 'Baja', color: '#6B7280', orden: 3 },
}

export const TIPO_OT: Record<string, { nombre: string; color: string }> = {
  PREVENTIVA: { nombre: 'Preventiva', color: ESTADO.exito },
  CORRECTIVA: { nombre: 'Correctiva', color: ESTADO.peligro },
  PREDICTIVA: { nombre: 'Predictiva', color: '#3B82F6' },
  EMERGENCIA: { nombre: 'Emergencia', color: '#7F1D1D' },
}

/** Lo que todavía es trabajo por hacer. */
export const otAbierta = (estado: string): boolean => estado !== 'COMPLETADA'
