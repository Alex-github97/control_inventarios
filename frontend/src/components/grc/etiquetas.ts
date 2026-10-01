/**
 * Valores de GRC que son código, no configuración: estados de cada flujo y
 * escalas que alimentan cálculos. Las clasificaciones (tipo de riesgo, de
 * comité, de hallazgo, marco normativo, periodicidad…) NO están aquí: viven en
 * el catálogo y se administran en Configuración GRC. Los nombres de los
 * niveles de probabilidad e impacto salen de la matriz configurada.
 */
export type Par = [string, string]

export const ESTADOS_RIESGO: Par[] = [['identificado', 'Identificado'], ['en_analisis', 'En análisis'], ['tratamiento', 'En tratamiento'],
  ['aceptado', 'Aceptado'], ['mitigado', 'Mitigado'], ['cerrado', 'Cerrado']]
/** Las cuatro respuestas de ISO 31000. */
export const TRATAMIENTOS: Par[] = [['mitigar', 'Mitigar'], ['transferir', 'Transferir'], ['evitar', 'Evitar'], ['aceptar', 'Aceptar']]
export const PRIORIDADES: Par[] = [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]
export const PRIORIDAD_COLOR: Record<string, string> = { critica: '#DC2626', alta: '#EA580C', media: '#D97706', baja: '#15803D' }

/** Naturaleza del control: decide qué reduce en el cálculo del residual. */
export const TIPOS_CONTROL: Par[] = [['preventivo', 'Preventivo · reduce la probabilidad'], ['detectivo', 'Detectivo · reduce el impacto'],
  ['correctivo', 'Correctivo · reduce el impacto'], ['compensatorio', 'Compensatorio · reduce ambos (menos)']]
export const EFECTIVIDAD: Par[] = [['efectivo', 'Efectivo'], ['parcialmente_efectivo', 'Parcialmente efectivo'], ['inefectivo', 'Inefectivo'], ['no_probado', 'No probado']]
export const RESULTADOS_PRUEBA: Par[] = EFECTIVIDAD.filter(p => p[0] !== 'no_probado')
export const EFECTIVIDAD_COLOR: Record<string, string> = { efectivo: '#15803D', parcialmente_efectivo: '#D97706', inefectivo: '#DC2626', no_probado: '#6B7280' }

export const ESTADOS_POLITICA: Par[] = [['borrador', 'Borrador'], ['en_revision', 'En revisión'], ['aprobada', 'Aprobada'],
  ['publicada', 'Publicada'], ['archivada', 'Archivada']]
export const POLITICA_COLOR: Record<string, string> = { borrador: '#6B7280', en_revision: '#D97706', aprobada: '#0369A1', publicada: '#15803D', vencida: '#DC2626', archivada: '#94A3B8' }
/** A qué estados puede pasar una política desde cada uno (igual que el servidor). */
export const TRANSICIONES_POLITICA: Record<string, Par[]> = {
  borrador: [['en_revision', 'Enviar a revisión']],
  en_revision: [['aprobada', 'Aprobar'], ['borrador', 'Devolver a borrador']],
  aprobada: [['publicada', 'Publicar'], ['en_revision', 'Volver a revisión'], ['archivada', 'Archivar']],
  publicada: [['archivada', 'Archivar'], ['en_revision', 'Volver a revisión']],
  vencida: [['en_revision', 'Volver a revisión'], ['archivada', 'Archivar']],
  archivada: [['borrador', 'Reabrir como borrador']],
}

export const ESTADOS_CUMPLIMIENTO: Par[] = [['cumple', 'Cumple'], ['cumple_parcial', 'Cumple parcialmente'], ['no_cumple', 'No cumple'],
  ['no_aplica', 'No aplica'], ['en_evaluacion', 'En evaluación']]
export const CUMPLIMIENTO_COLOR: Record<string, string> = { cumple: '#15803D', cumple_parcial: '#D97706', no_cumple: '#DC2626', no_aplica: '#6B7280', en_evaluacion: '#0369A1' }

export const ESTADOS_AUDITORIA: Par[] = [['planificada', 'Planificada'], ['en_ejecucion', 'En ejecución'], ['en_revision', 'En revisión'],
  ['completada', 'Completada'], ['cancelada', 'Cancelada']]
export const AUDITORIA_COLOR: Record<string, string> = { planificada: '#0369A1', en_ejecucion: '#D97706', en_revision: '#7C3AED', completada: '#15803D', cancelada: '#6B7280' }

export const SEVERIDADES: Par[] = [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]
export const SEVERIDAD_COLOR: Record<string, string> = { critica: '#DC2626', alta: '#EA580C', media: '#D97706', baja: '#15803D' }
export const ESTADOS_HALLAZGO: Par[] = [['abierto', 'Abierto'], ['en_remediacion', 'En remediación'], ['verificacion', 'En verificación'], ['cerrado', 'Cerrado']]
export const HALLAZGO_COLOR: Record<string, string> = { abierto: '#DC2626', en_remediacion: '#D97706', verificacion: '#0369A1', cerrado: '#15803D', vencido: '#991B1B' }

export const ESTADOS_INCIDENTE: Par[] = [['abierto', 'Abierto'], ['en_investigacion', 'En investigación'], ['contenido', 'Contenido'], ['cerrado', 'Cerrado']]
export const INCIDENTE_COLOR: Record<string, string> = { abierto: '#DC2626', en_investigacion: '#D97706', contenido: '#0369A1', cerrado: '#15803D' }

export const ESTADOS_PLAN_BCP: Par[] = [['activo', 'Activo'], ['en_actualizacion', 'En actualización'], ['inactivo', 'Inactivo']]
export const ESTADOS_TERCERO: Par[] = [['activo', 'Activo'], ['en_evaluacion', 'En evaluación'], ['suspendido', 'Suspendido'], ['retirado', 'Retirado']]
export const NIVEL_TERCERO: Par[] = [['critico', 'Crítico'], ['alto', 'Alto'], ['medio', 'Medio'], ['bajo', 'Bajo']]
export const NIVEL_TERCERO_COLOR: Record<string, string> = { critico: '#DC2626', alto: '#EA580C', medio: '#D97706', bajo: '#15803D' }

export const KRI_COLOR: Record<string, string> = { normal: '#15803D', alerta: '#D97706', critico: '#DC2626', sin_medicion: '#6B7280' }
export const ESTADO_PLAN: Record<string, string> = { pendiente: '#6B7280', en_curso: '#D97706', completado: '#15803D' }

export const etiqueta = (pares: Par[], v?: string | null) => pares.find(p => p[0] === v)?.[1] ?? (v ? v.replace(/_/g, ' ') : '—')

/** Catálogos de GRC y compartidos, para declarar campos sin repetir módulo y tipo. */
export const CAT = {
  categoria: { modulo: 'GRC', tipo: 'CATEGORIA_RIESGO' },
  marco: { modulo: 'GRC', tipo: 'MARCO_NORMATIVO' },
  tipoObligacion: { modulo: 'GRC', tipo: 'TIPO_OBLIGACION' },
  tipoPolitica: { modulo: 'GRC', tipo: 'TIPO_POLITICA' },
  tipoComite: { modulo: 'GRC', tipo: 'TIPO_COMITE' },
  periodicidad: { modulo: 'GRC', tipo: 'PERIODICIDAD' },
  frecuencia: { modulo: 'GRC', tipo: 'FRECUENCIA_CONTROL' },
  tipoAuditoria: { modulo: 'GRC', tipo: 'TIPO_AUDITORIA' },
  tipoHallazgo: { modulo: 'GRC', tipo: 'TIPO_HALLAZGO' },
  tipoIncidente: { modulo: 'GRC', tipo: 'TIPO_INCIDENTE' },
  tipoEvidencia: { modulo: 'GRC', tipo: 'TIPO_EVIDENCIA' },
  tipoTercero: { modulo: 'GRC', tipo: 'TIPO_TERCERO' },
  tipoSimulacro: { modulo: 'GRC', tipo: 'TIPO_SIMULACRO' },
  resultadoSimulacro: { modulo: 'GRC', tipo: 'RESULTADO_SIMULACRO' },
  sistema: { modulo: 'GRC', tipo: 'SISTEMA_CRITICO' },
  // Compartidos: se administran en un solo sitio, no se agregan desde aquí.
  proceso: { modulo: 'GLOBAL', tipo: 'PROCESO', agregar: false },
  area: { modulo: 'GLOBAL', tipo: 'AREA', agregar: false },
  pais: { modulo: 'GLOBAL', tipo: 'PAIS', agregar: false },
  sector: { modulo: 'CRM', tipo: 'SECTOR_ECONOMICO', agregar: false },
}
