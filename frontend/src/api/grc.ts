/**
 * Gobierno, riesgo y cumplimiento contra el servidor.
 *
 * Doce de las trece pantallas del módulo eran maqueta (solo Políticas
 * consultaba). El servidor tenía casi todo; lo que faltaba —editar y retirar
 * en varias entidades— se agregó junto con este cliente.
 */
import { apiClient } from './client'

const g = <T,>(ruta: string, params?: Record<string, unknown>) => apiClient.get<T>(`/grc${ruta}`, { params }).then(r => r.data)

/** CRUD con la forma del servidor: POST crea, PATCH o PUT edita, DELETE retira. */
const recurso = <T,>(base: string, metodoEditar: 'patch' | 'put' = 'patch') => ({
  listar: (p?: Record<string, unknown>) => g<T[]>(base, p),
  crear: (d: Partial<T>) => apiClient.post<T>(`/grc${base}`, d).then(r => r.data),
  editar: (id: number, d: Partial<T>) => apiClient[metodoEditar]<T>(`/grc${base}/${id}`, d).then(r => r.data),
  retirar: (id: number) => apiClient.delete(`/grc${base}/${id}`),
})

export interface RiesgoGRC {
  id: number; codigo: string; nombre: string; descripcion?: string | null; tipo?: string | null
  proceso?: string | null; area?: string | null; responsable?: string | null
  probabilidad_inherente?: number | null; impacto_inherente?: number | null; nivel_inherente?: number | null
  probabilidad_residual?: number | null; impacto_residual?: number | null; nivel_residual?: number | null
  /** Calculada por el servidor con el nivel residual (o el inherente si no hay residual). */
  prioridad?: 'baja' | 'media' | 'alta' | 'critica' | null
  estado: string; tratamiento?: string | null; apetito_riesgo?: string | null; comite_id?: number | null
}
export interface Tratamiento { id: number; riesgo_id: number; tipo?: string | null; descripcion?: string | null; responsable?: string | null; fecha_objetivo?: string | null; estado: string; avance: number }
export interface ControlGRC {
  id: number; codigo: string; nombre: string; tipo?: string | null; descripcion?: string | null
  proceso?: string | null; area?: string | null; responsable?: string | null; frecuencia?: string | null
  efectividad: string; ultima_evaluacion?: string | null; proxima_evaluacion?: string | null; automatizado: boolean
}
export interface Obligacion {
  id: number; codigo: string; nombre: string; tipo?: string | null; pais?: string | null; industria?: string | null
  area?: string | null; descripcion?: string | null; fuente?: string | null
  fecha_vigencia?: string | null; fecha_vencimiento?: string | null; responsable?: string | null; estado_cumplimiento?: string | null
}
export interface Cumplimiento {
  id: number; obligacion_id: number; proceso?: string | null; area?: string | null; responsable?: string | null
  estado: string; puntaje?: number | null; ultima_evaluacion?: string | null; proxima_evaluacion?: string | null
  evidencias?: string | null; observaciones?: string | null
}
export interface AuditoriaGRC {
  id: number; codigo: string; nombre: string; tipo?: string | null; estado: string
  auditor_lider?: string | null; equipo_auditor?: string | null; auditado?: string | null
  fecha_inicio?: string | null; fecha_fin?: string | null; fecha_reporte?: string | null
  alcance?: string | null; criterios?: string | null; presupuesto?: number | string | null; observaciones?: string | null
}
export interface HallazgoGRC {
  id: number; codigo: string; auditoria_id?: number | null; titulo: string; descripcion?: string | null
  tipo?: string | null; severidad?: string | null; proceso?: string | null; area?: string | null
  responsable?: string | null; fecha_limite?: string | null; estado: string
  riesgo_asociado?: string | null; impacto?: string | null; recomendacion?: string | null
}
export interface PlanAccion { id: number; hallazgo_id: number; accion: string; responsable?: string | null; fecha_objetivo?: string | null; estado: string; avance: number; evidencia?: string | null; observaciones?: string | null }
export interface IncidenteGRC {
  id: number; codigo: string; titulo: string; tipo?: string | null; descripcion?: string | null
  severidad?: string | null; impacto?: string | null; urgencia?: string | null; proceso?: string | null; area?: string | null
  reportado_por?: string | null; responsable?: string | null; fecha_ocurrencia?: string | null; fecha_cierre?: string | null
  estado: string; causa_raiz?: string | null; acciones_tomadas?: string | null; lecciones_aprendidas?: string | null
}
export interface Continuidad {
  id: number; proceso: string; criticidad?: string | null; rto_horas?: number | null; rpo_horas?: number | null
  impacto_financiero_hora?: number | string | null; impacto_operativo?: string | null; sistemas_criticos?: string | null
  dependencias?: string | null; responsable?: string | null; plan_contingencia?: string | null
  estado_plan?: string | null; ultima_revision?: string | null
}
export interface SimulacroGRC { id: number; continuidad_id?: number | null; nombre?: string | null; fecha?: string | null; tipo?: string | null; resultado?: string | null; participantes?: number | null; observaciones?: string | null; lecciones?: string | null }
export interface Tercero { id: number; nombre: string; nit?: string | null; tipo?: string | null; pais?: string | null; sector?: string | null; contacto?: string | null; nivel_riesgo?: string | null; estado: string }
export interface EvaluacionTercero { id: number; tercero_id: number; periodo?: string | null; cumplimiento_legal?: number | null; riesgo_reputacional?: number | null; solidez_financiera?: number | null; seguridad_info?: number | null; puntaje_total?: number | string | null; clasificacion?: string | null; evaluador?: string | null; observaciones?: string | null }
export interface Comite { id: number; nombre: string; tipo?: string | null; presidente?: string | null; secretario?: string | null; periodicidad?: string | null; descripcion?: string | null; activo: boolean }
export interface Responsable { responsable: string; riesgos: number; controles: number; obligaciones: number; hallazgos_abiertos: number }
export type TableroGRC = Record<string, number>

export const grcApi = {
  tablero: () => g<TableroGRC>('/dashboard/kpis'),
  riesgos: recurso<RiesgoGRC>('/riesgos'),
  tratamientos: {
    listar: (riesgoId: number) => g<Tratamiento[]>(`/riesgos/${riesgoId}/tratamientos`),
    crear: (d: Partial<Tratamiento>) => apiClient.post<Tratamiento>('/grc/tratamientos', d).then(r => r.data),
    avance: (id: number, avance: number) => apiClient.patch<Tratamiento>(`/grc/tratamientos/${id}`, { avance }).then(r => r.data),
    retirar: (id: number) => apiClient.delete(`/grc/tratamientos/${id}`),
  },
  controles: recurso<ControlGRC>('/controles'),
  obligaciones: recurso<Obligacion>('/obligaciones', 'put'),
  cumplimiento: recurso<Cumplimiento>('/cumplimiento'),
  auditorias: recurso<AuditoriaGRC>('/auditorias'),
  hallazgos: recurso<HallazgoGRC>('/hallazgos'),
  planes: {
    listar: (hallazgoId: number) => g<PlanAccion[]>(`/hallazgos/${hallazgoId}/planes`),
    crear: (d: Partial<PlanAccion>) => apiClient.post<PlanAccion>('/grc/planes', d).then(r => r.data),
    editar: (id: number, d: Partial<PlanAccion>) => apiClient.patch<PlanAccion>(`/grc/planes/${id}`, d).then(r => r.data),
    retirar: (id: number) => apiClient.delete(`/grc/planes/${id}`),
  },
  incidentes: recurso<IncidenteGRC>('/incidentes'),
  continuidad: recurso<Continuidad>('/continuidad', 'put'),
  simulacros: recurso<SimulacroGRC>('/simulacros', 'put'),
  terceros: recurso<Tercero>('/terceros', 'put'),
  evaluaciones: {
    listar: (terceroId: number) => g<EvaluacionTercero[]>(`/terceros/${terceroId}/evaluaciones`),
    crear: (d: Partial<EvaluacionTercero>) => apiClient.post<EvaluacionTercero>('/grc/terceros/evaluaciones', d).then(r => r.data),
  },
  comites: recurso<Comite>('/comites', 'put'),
  responsables: () => g<Responsable[]>('/responsables'),
}
