/**
 * Valores y etiquetas de GRC, tal como los guarda el servidor (en minúscula).
 * Un solo sitio para las doce pantallas: la maqueta tenía cada una su propia
 * lista, en mayúsculas, que no coincidía con la base.
 */
export type Par = [string, string]

export const TIPOS_RIESGO: Par[] = [['estrategico', 'Estratégico'], ['operativo', 'Operativo'], ['financiero', 'Financiero'],
  ['tecnologico', 'Tecnológico'], ['logistico', 'Logístico'], ['transporte', 'Transporte'], ['rrhh', 'Talento humano'],
  ['legal', 'Legal'], ['ambiental', 'Ambiental'], ['reputacional', 'Reputacional'], ['ciberseguridad', 'Ciberseguridad']]
export const ESTADOS_RIESGO: Par[] = [['identificado', 'Identificado'], ['en_analisis', 'En análisis'], ['tratamiento', 'En tratamiento'],
  ['aceptado', 'Aceptado'], ['mitigado', 'Mitigado'], ['cerrado', 'Cerrado']]
export const TRATAMIENTOS: Par[] = [['mitigar', 'Mitigar'], ['transferir', 'Transferir'], ['evitar', 'Evitar'], ['aceptar', 'Aceptar']]
export const PROBABILIDAD: [number, string][] = [[1, '1 · Muy baja'], [2, '2 · Baja'], [3, '3 · Media'], [4, '4 · Alta'], [5, '5 · Muy alta']]
export const IMPACTO: [number, string][] = [[1, '1 · Insignificante'], [2, '2 · Menor'], [3, '3 · Moderado'], [4, '4 · Mayor'], [5, '5 · Catastrófico']]
export const PRIORIDAD_COLOR: Record<string, string> = { critica: '#DC2626', alta: '#EA580C', media: '#D97706', baja: '#15803D' }
/** La misma regla del servidor (`_calc_prioridad`), para la vista previa. */
export const prioridadDe = (n: number) => (n >= 15 ? 'critica' : n >= 10 ? 'alta' : n >= 5 ? 'media' : 'baja')

export const TIPOS_CONTROL: Par[] = [['preventivo', 'Preventivo'], ['detectivo', 'Detectivo'], ['correctivo', 'Correctivo'], ['compensatorio', 'Compensatorio']]
export const EFECTIVIDAD: Par[] = [['efectivo', 'Efectivo'], ['parcialmente_efectivo', 'Parcialmente efectivo'], ['inefectivo', 'Inefectivo'], ['no_probado', 'No probado']]
export const EFECTIVIDAD_COLOR: Record<string, string> = { efectivo: '#15803D', parcialmente_efectivo: '#D97706', inefectivo: '#DC2626', no_probado: '#6B7280' }

export const TIPOS_OBLIGACION: Par[] = [['ley', 'Ley'], ['reglamento', 'Reglamento / decreto'], ['norma', 'Norma técnica'], ['contrato', 'Contrato'],
  ['politica_interna', 'Política interna'], ['requisito_cliente', 'Requisito de cliente']]
export const ESTADOS_CUMPLIMIENTO: Par[] = [['cumple', 'Cumple'], ['cumple_parcial', 'Cumple parcialmente'], ['no_cumple', 'No cumple'],
  ['no_aplica', 'No aplica'], ['en_evaluacion', 'En evaluación']]
export const CUMPLIMIENTO_COLOR: Record<string, string> = { cumple: '#15803D', cumple_parcial: '#D97706', no_cumple: '#DC2626', no_aplica: '#6B7280', en_evaluacion: '#0369A1' }

export const TIPOS_AUDITORIA: Par[] = [['interna', 'Interna'], ['externa', 'Externa'], ['financiera', 'Financiera'], ['operativa', 'Operativa'],
  ['tecnologica', 'Tecnológica'], ['regulatoria', 'Regulatoria'], ['cumplimiento', 'Cumplimiento']]
export const ESTADOS_AUDITORIA: Par[] = [['planificada', 'Planificada'], ['en_ejecucion', 'En ejecución'], ['en_revision', 'En revisión'],
  ['completada', 'Completada'], ['cancelada', 'Cancelada']]
export const AUDITORIA_COLOR: Record<string, string> = { planificada: '#0369A1', en_ejecucion: '#D97706', en_revision: '#7C3AED', completada: '#15803D', cancelada: '#6B7280' }

export const SEVERIDADES: Par[] = [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]
export const SEVERIDAD_COLOR: Record<string, string> = { critica: '#DC2626', alta: '#EA580C', media: '#D97706', baja: '#15803D' }
export const ESTADOS_HALLAZGO: Par[] = [['abierto', 'Abierto'], ['en_remediacion', 'En remediación'], ['verificacion', 'En verificación'], ['cerrado', 'Cerrado']]
export const HALLAZGO_COLOR: Record<string, string> = { abierto: '#DC2626', en_remediacion: '#D97706', verificacion: '#0369A1', cerrado: '#15803D', vencido: '#991B1B' }

export const ESTADOS_INCIDENTE: Par[] = [['abierto', 'Abierto'], ['en_investigacion', 'En investigación'], ['contenido', 'Contenido'], ['cerrado', 'Cerrado']]
export const INCIDENTE_COLOR: Record<string, string> = { abierto: '#DC2626', en_investigacion: '#D97706', contenido: '#0369A1', cerrado: '#15803D' }
export const TIPOS_INCIDENTE: Par[] = [['seguridad_informacion', 'Seguridad de la información'], ['fraude', 'Fraude'], ['operativo', 'Operativo'],
  ['legal', 'Legal / regulatorio'], ['ambiental', 'Ambiental'], ['reputacional', 'Reputacional'], ['otro', 'Otro']]

export const CRITICIDAD: Par[] = [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]
export const TIPOS_TERCERO: Par[] = [['proveedor', 'Proveedor'], ['cliente', 'Cliente'], ['contratista', 'Contratista'], ['aliado', 'Aliado']]
export const NIVEL_TERCERO: Par[] = [['critico', 'Crítico'], ['alto', 'Alto'], ['medio', 'Medio'], ['bajo', 'Bajo']]
export const NIVEL_TERCERO_COLOR: Record<string, string> = { critico: '#DC2626', alto: '#EA580C', medio: '#D97706', bajo: '#15803D' }

export const etiqueta = (pares: Par[], v?: string | null) => pares.find(p => p[0] === v)?.[1] ?? v ?? '—'
