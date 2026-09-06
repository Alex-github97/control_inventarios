/**
 * El sistema de calidad contra el servidor.
 *
 * Ocho de las catorce pantallas del módulo ya hablaban con la API, cada una
 * armando sus URL a mano con `apiClient`. Las otras seis eran maqueta, y varias
 * tenían botones de «Nuevo» que no abrían nada.
 *
 * Este archivo es el sitio único donde vive cada ruta. Con las URL repartidas
 * por catorce archivos, cambiar un endpoint obliga a buscarlo por todo el
 * proyecto, y siempre queda uno sin cambiar que falla en silencio.
 */
import { apiClient } from './client'

export type Cifra = string | number | null | undefined

export const aNumero = (v: Cifra): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

export interface Proceso {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null; tipo: string; estado: string
  padre_id?: number | null; responsable_id?: number | null
  objetivo?: string | null; alcance?: string | null
  norma_iso?: string | null; orden: number
  created_at?: string | null; updated_at?: string | null
}

export interface Procedimiento {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null; proceso_id?: number | null
  tipo?: string | null; version: string; estado: string
  dms_documento_id?: number | null; responsable_id?: number | null
  fecha_vigencia?: string | null; activo: boolean
}

export interface Auditoria {
  id: number; codigo?: string | null; nombre: string
  tipo: string; estado: string; norma?: string | null
  proceso_ids?: string | null; auditor_lider_id?: number | null
  empresa_auditora?: string | null
  fecha_inicio_plan?: string | null; fecha_fin_plan?: string | null
  fecha_inicio_real?: string | null; fecha_fin_real?: string | null
  objetivo?: string | null; alcance?: string | null
  conclusion?: string | null; resultado?: string | null
}

export interface Hallazgo {
  id: number; codigo?: string | null; descripcion: string
  tipo: string; severidad?: string | null; estado: string
  auditoria_id?: number | null; proceso_id?: number | null
  no_conformidad_id?: number | null
  requisito?: string | null; evidencia?: string | null
  responsable_id?: number | null; fecha_limite?: string | null
}

export interface EvaluacionProveedor {
  id: number; proveedor_nombre: string; proveedor_nit?: string | null
  periodo: string
  calidad?: number | null; cumplimiento?: number | null
  servicio?: number | null; tiempos?: number | null
  puntaje_total?: number | null; clasificacion?: string | null
  observaciones?: string | null
  evaluado_por_id?: number | null; proceso_id?: number | null
}

export interface Encuesta {
  id: number; nombre: string; tipo: string
  descripcion?: string | null; activa: boolean
  fecha_inicio?: string | null; fecha_fin?: string | null
  preguntas?: string | null
  total_respuestas: number
  nps_score?: number | null; csat_score?: number | null
  proceso_id?: number | null
}

export interface RespuestaEncuesta {
  id: number; encuesta_id: number
  respondente_nombre?: string | null; respondente_tipo?: string | null
  respuestas?: string | null
  nps_valor?: number | null; csat_valor?: number | null
  comentario?: string | null; created_at?: string | null
}

/** El tablero devuelve un objeto suelto; apretarle el tipo obligaría a tocar
 *  dos archivos cada vez que se le añade una cifra. */
export type TableroQMS = Record<string, any>

const get = <T,>(ruta: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(ruta, { params }).then(r => r.data)

export const qmsApi = {
  tablero: () => get<TableroQMS>('/qms/dashboard'),

  procesos: (f?: { tipo?: string; estado?: string; padre_id?: number; limit?: number }) =>
    get<Proceso[]>('/qms/procesos', { limit: 200, ...f }),
  crearProceso: (d: Partial<Proceso>) =>
    apiClient.post<Proceso>('/qms/procesos', d).then(r => r.data),
  editarProceso: (id: number, d: Partial<Proceso>) =>
    apiClient.put<Proceso>(`/qms/procesos/${id}`, d).then(r => r.data),
  borrarProceso: (id: number) => apiClient.delete(`/qms/procesos/${id}`),

  procedimientos: (f?: { proceso_id?: number; estado?: string }) =>
    get<Procedimiento[]>('/qms/procedimientos', { limit: 200, ...f }),
  crearProcedimiento: (d: Partial<Procedimiento>) =>
    apiClient.post<Procedimiento>('/qms/procedimientos', d).then(r => r.data),
  editarProcedimiento: (id: number, d: Partial<Procedimiento>) =>
    apiClient.put<Procedimiento>(`/qms/procedimientos/${id}`, d).then(r => r.data),
  borrarProcedimiento: (id: number) => apiClient.delete(`/qms/procedimientos/${id}`),

  auditorias: (f?: { tipo?: string; estado?: string }) =>
    get<Auditoria[]>('/qms/auditorias', { limit: 200, ...f }),
  auditoria: (id: number) => get<Auditoria>(`/qms/auditorias/${id}`),
  crearAuditoria: (d: Partial<Auditoria>) =>
    apiClient.post<Auditoria>('/qms/auditorias', d).then(r => r.data),
  editarAuditoria: (id: number, d: Partial<Auditoria>) =>
    apiClient.put<Auditoria>(`/qms/auditorias/${id}`, d).then(r => r.data),
  borrarAuditoria: (id: number) => apiClient.delete(`/qms/auditorias/${id}`),

  hallazgos: (f?: { auditoria_id?: number; tipo?: string; estado?: string }) =>
    get<Hallazgo[]>('/qms/hallazgos', { limit: 200, ...f }),

  evaluaciones: (f?: { periodo?: string; clasificacion?: string }) =>
    get<EvaluacionProveedor[]>('/qms/evaluaciones-proveedores', { limit: 200, ...f }),
  crearEvaluacion: (d: Partial<EvaluacionProveedor>) =>
    apiClient.post<EvaluacionProveedor>('/qms/evaluaciones-proveedores', d).then(r => r.data),
  editarEvaluacion: (id: number, d: Partial<EvaluacionProveedor>) =>
    apiClient.put<EvaluacionProveedor>(`/qms/evaluaciones-proveedores/${id}`, d).then(r => r.data),

  encuestas: (f?: { activa?: boolean; tipo?: string }) =>
    get<Encuesta[]>('/qms/encuestas', { limit: 200, ...f }),
  encuesta: (id: number) => get<Encuesta>(`/qms/encuestas/${id}`),
  respuestas: (encuestaId: number) =>
    get<RespuestaEncuesta[]>(`/qms/encuestas/${encuestaId}/respuestas`, { limit: 500 }),
  crearEncuesta: (d: Partial<Encuesta>) =>
    apiClient.post<Encuesta>('/qms/encuestas', d).then(r => r.data),
  editarEncuesta: (id: number, d: Partial<Encuesta>) =>
    apiClient.put<Encuesta>(`/qms/encuestas/${id}`, d).then(r => r.data),
  responderEncuesta: (encuestaId: number, d: Partial<RespuestaEncuesta>) =>
    apiClient.post<RespuestaEncuesta>(`/qms/encuestas/${encuestaId}/respuestas`, d)
      .then(r => r.data),

  noConformidades: (f?: Record<string, unknown>) =>
    get<any[]>('/qms/no-conformidades', { limit: 200, ...f }),
  indicadores: (f?: Record<string, unknown>) =>
    get<any[]>('/qms/indicadores', { limit: 200, ...f }),
  riesgos: (f?: Record<string, unknown>) =>
    get<any[]>('/qms/riesgos', { limit: 200, ...f }),
  quejas: (f?: Record<string, unknown>) =>
    get<any[]>('/qms/quejas', { limit: 200, ...f }),
  mejoras: (f?: Record<string, unknown>) =>
    get<any[]>('/qms/mejoras', { limit: 200, ...f }),
  capas: (f?: Record<string, unknown>) =>
    get<any[]>('/qms/capas', { limit: 200, ...f }),
}
