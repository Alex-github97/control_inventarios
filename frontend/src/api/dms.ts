/**
 * La gestión documental contra el servidor.
 *
 * De las catorce pantallas del módulo, siete no consultaban nada y las otras
 * siete solo leían: NINGUNA tenía una sola mutación. El servidor, en cambio,
 * expone sesenta y seis rutas con altas, cambios y bajas completas en quince
 * recursos. Este archivo es lo que faltaba entre las dos cosas.
 *
 * Los tipos siguen a los `Response` de `backend/app/application/schemas/dms.py`.
 */
import { apiClient } from './client'

export interface Categoria {
  id: number; nombre: string; descripcion?: string | null
  codigo?: string | null; icono?: string | null; color?: string | null
  activo: boolean; created_at?: string | null
}

export interface Carpeta {
  id: number; nombre: string; descripcion?: string | null
  padre_id?: number | null; ruta?: string | null
  icono?: string | null; color?: string | null
  es_publica: boolean; creado_por_id?: number | null
  created_at?: string | null; updated_at?: string | null
}

export interface TipoDocumento {
  id: number; nombre: string; descripcion?: string | null
  categoria_id?: number | null; codigo?: string | null
  extensiones_permitidas?: string | null
  requiere_firma: boolean; requiere_aprobacion: boolean
  dias_vigencia?: number | null; activo: boolean
}

export interface CampoMetadato {
  id: number; tipo_documento_id: number; nombre: string; etiqueta: string
  tipo_dato: string; opciones?: string | null
  requerido: boolean; orden: number
}

export interface Documento {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null
  tipo_documento_id?: number | null; carpeta_id?: number | null
  estado: string; version_actual: string; version_numero: number
  tags?: string | null
  es_confidencial: boolean; permite_descarga: boolean; permite_impresion: boolean
  fecha_vigencia_inicio?: string | null; fecha_vigencia_fin?: string | null
  propietario_id?: number | null
  hcm_colaborador_id?: number | null; hcm_conductor_id?: number | null
  tms_vehiculo_id?: number | null
  modulo_origen?: string | null; referencia_externa_id?: number | null
  created_at?: string | null; updated_at?: string | null
}

/** Lo que devuelve el LISTADO: menos campos, pero con los nombres ya resueltos. */
export interface DocumentoEnLista {
  id: number; codigo?: string | null; nombre: string
  tipo_nombre?: string | null; estado: string; version_actual: string
  fecha_vigencia_inicio?: string | null; fecha_vigencia_fin?: string | null
  propietario_nombre?: string | null; created_at?: string | null
}

export interface Version {
  id: number; documento_id: number
  numero_version: string; version_numero: number; es_mayor: boolean
  nombre_archivo?: string | null; ruta_archivo?: string | null
  url_archivo?: string | null; tamanio_bytes?: number | null
  tipo_mime?: string | null; hash_md5?: string | null
  comentario?: string | null; ocr_texto?: string | null
  creado_por_id?: number | null; created_at?: string | null
}

export interface Firma {
  id: number; documento_id: number; version_id?: number | null
  firmante_id?: number | null; tipo_firma: string; estado: string
  fecha_firma?: string | null; ip_firma?: string | null
  dispositivo?: string | null; observaciones?: string | null
  orden?: number | null; created_at?: string | null
}

export interface Workflow {
  id: number; nombre: string; descripcion?: string | null
  tipo_documento_id?: number | null; activo: boolean
  dias_limite?: number | null; created_at?: string | null
}

export interface WorkflowPaso {
  id: number; workflow_id: number; nombre: string; tipo?: string | null
  orden: number; responsable_id?: number | null
  responsable_rol?: string | null; dias_limite?: number | null
  es_obligatorio: boolean
}

export interface Instancia {
  id: number; workflow_id: number; documento_id?: number | null
  estado: string; iniciado_por_id?: number | null; paso_actual?: number | null
  fecha_inicio?: string | null; fecha_limite?: string | null
  fecha_fin?: string | null; comentario_cierre?: string | null
}

export interface Expediente {
  id: number; codigo?: string | null; nombre: string
  tipo: string; estado: string; descripcion?: string | null
  hcm_colaborador_id?: number | null; hcm_conductor_id?: number | null
  tms_vehiculo_id?: number | null; propietario_id?: number | null
  completitud_pct: number
  created_at?: string | null; updated_at?: string | null
}

export interface ExpedienteDocumento {
  id: number; expediente_id: number; documento_id: number
  tipo_requerido?: string | null; es_obligatorio: boolean
}

export interface Retencion {
  id: number; nombre: string; tipo_documento_id?: number | null
  dias_retencion_activo?: number | null; dias_retencion_total?: number | null
  accion_vencimiento?: string | null; normativa?: string | null
  activo: boolean
}

export interface RegistroAuditoria {
  id: number; documento_id?: number | null; version_id?: number | null
  usuario_id?: number | null; accion: string; detalle?: string | null
  ip_origen?: string | null; user_agent?: string | null
  created_at?: string | null
}

export interface Notificacion {
  id: number; usuario_id?: number | null; documento_id?: number | null
  tipo?: string | null; titulo: string; mensaje?: string | null
  leida: boolean; accion_url?: string | null; created_at?: string | null
}

export interface TableroDMS {
  total_documentos: number; documentos_activos: number
  documentos_vencidos: number; documentos_proximos_vencer: number
  firmas_pendientes: number; workflows_activos: number
  expedientes_activos: number; cumplimiento_pct: number
  categorias_total: number; versiones_hoy: number
  tamanio_total_mb: number; alertas_criticas: number
  documentos_creados_hoy: number; aprobaciones_pendientes: number
}

const get = <T,>(ruta: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(ruta, { params }).then(r => r.data)

export const dmsApi = {
  tablero: () => get<TableroDMS>('/dms/dashboard/kpis'),

  categorias: () => get<Categoria[]>('/dms/categorias'),
  crearCategoria: (d: Partial<Categoria>) =>
    apiClient.post<Categoria>('/dms/categorias', d).then(r => r.data),
  editarCategoria: (id: number, d: Partial<Categoria>) =>
    apiClient.put<Categoria>(`/dms/categorias/${id}`, d).then(r => r.data),
  borrarCategoria: (id: number) => apiClient.delete(`/dms/categorias/${id}`),

  carpetas: (padre_id?: number) => get<Carpeta[]>('/dms/carpetas', { padre_id }),
  crearCarpeta: (d: Partial<Carpeta>) =>
    apiClient.post<Carpeta>('/dms/carpetas', d).then(r => r.data),
  editarCarpeta: (id: number, d: Partial<Carpeta>) =>
    apiClient.put<Carpeta>(`/dms/carpetas/${id}`, d).then(r => r.data),
  borrarCarpeta: (id: number) => apiClient.delete(`/dms/carpetas/${id}`),

  tipos: () => get<TipoDocumento[]>('/dms/tipos-documento'),
  crearTipo: (d: Partial<TipoDocumento>) =>
    apiClient.post<TipoDocumento>('/dms/tipos-documento', d).then(r => r.data),
  editarTipo: (id: number, d: Partial<TipoDocumento>) =>
    apiClient.put<TipoDocumento>(`/dms/tipos-documento/${id}`, d).then(r => r.data),
  camposDeTipo: (id: number) => get<CampoMetadato[]>(`/dms/tipos-documento/${id}/campos`),
  crearCampo: (d: Partial<CampoMetadato>) =>
    apiClient.post<CampoMetadato>('/dms/campos-metadato', d).then(r => r.data),
  editarCampo: (id: number, d: Partial<CampoMetadato>) =>
    apiClient.put<CampoMetadato>(`/dms/campos-metadato/${id}`, d).then(r => r.data),
  borrarCampo: (id: number) => apiClient.delete(`/dms/campos-metadato/${id}`),

  // Pagina con `page`/`per_page`, no con `skip`/`limit`: es lo que espera el
  // servidor, y mandarle los otros nombres los ignora en silencio y devuelve
  // siempre la primera página de veinte.
  documentos: (f?: {
    carpeta_id?: number; tipo_documento_id?: number; estado?: string
    q?: string; page?: number; per_page?: number
  }) => get<DocumentoEnLista[]>('/dms/documentos', { per_page: 200, ...f }),
  documento: (id: number) => get<Documento>(`/dms/documentos/${id}`),
  crearDocumento: (d: Partial<Documento>) =>
    apiClient.post<Documento>('/dms/documentos', d).then(r => r.data),
  editarDocumento: (id: number, d: Partial<Documento>) =>
    apiClient.put<Documento>(`/dms/documentos/${id}`, d).then(r => r.data),
  borrarDocumento: (id: number) => apiClient.delete(`/dms/documentos/${id}`),
  cambiarEstado: (id: number, estado: string, comentario?: string) =>
    apiClient.put(`/dms/documentos/${id}/estado`,
      { estado, comentario }).then(r => r.data),
  versiones: (id: number) => get<Version[]>(`/dms/documentos/${id}/versiones`),
  metadatos: (id: number) => get<any[]>(`/dms/documentos/${id}/metadatos`),

  firmas: (f?: { documento_id?: number; estado?: string; firmante_id?: number }) =>
    get<Firma[]>('/dms/firmas', { limit: 200, ...f }),
  crearFirma: (d: Partial<Firma>) =>
    apiClient.post<Firma>('/dms/firmas', d).then(r => r.data),
  firmar: (id: number, observaciones?: string) =>
    apiClient.put<Firma>(`/dms/firmas/${id}/firmar`, { observaciones }).then(r => r.data),
  rechazarFirma: (id: number, observaciones?: string) =>
    apiClient.put<Firma>(`/dms/firmas/${id}/rechazar`, { observaciones }).then(r => r.data),

  workflows: () => get<Workflow[]>('/dms/workflows'),
  crearWorkflow: (d: Partial<Workflow>) =>
    apiClient.post<Workflow>('/dms/workflows', d).then(r => r.data),
  editarWorkflow: (id: number, d: Partial<Workflow>) =>
    apiClient.put<Workflow>(`/dms/workflows/${id}`, d).then(r => r.data),
  borrarWorkflow: (id: number) => apiClient.delete(`/dms/workflows/${id}`),
  pasos: (id: number) => get<WorkflowPaso[]>(`/dms/workflows/${id}/pasos`),
  crearPaso: (d: Partial<WorkflowPaso>) =>
    apiClient.post<WorkflowPaso>('/dms/workflows/pasos', d).then(r => r.data),
  editarPaso: (id: number, d: Partial<WorkflowPaso>) =>
    apiClient.put<WorkflowPaso>(`/dms/workflows/pasos/${id}`, d).then(r => r.data),
  borrarPaso: (id: number) => apiClient.delete(`/dms/workflows/pasos/${id}`),

  instancias: (f?: { estado?: string; documento_id?: number }) =>
    get<Instancia[]>('/dms/instancias', { limit: 200, ...f }),
  crearInstancia: (d: Partial<Instancia>) =>
    apiClient.post<Instancia>('/dms/instancias', d).then(r => r.data),
  avanzarInstancia: (id: number, comentario?: string) =>
    apiClient.put<Instancia>(`/dms/instancias/${id}/avanzar`, { comentario }).then(r => r.data),
  cancelarInstancia: (id: number, comentario?: string) =>
    apiClient.put<Instancia>(`/dms/instancias/${id}/cancelar`, { comentario }).then(r => r.data),

  expedientes: (f?: { tipo?: string; estado?: string }) =>
    get<Expediente[]>('/dms/expedientes', { limit: 200, ...f }),
  expediente: (id: number) => get<Expediente>(`/dms/expedientes/${id}`),
  documentosDeExpediente: (id: number) =>
    get<ExpedienteDocumento[]>(`/dms/expedientes/${id}/documentos`),
  crearExpediente: (d: Partial<Expediente>) =>
    apiClient.post<Expediente>('/dms/expedientes', d).then(r => r.data),
  editarExpediente: (id: number, d: Partial<Expediente>) =>
    apiClient.put<Expediente>(`/dms/expedientes/${id}`, d).then(r => r.data),
  borrarExpediente: (id: number) => apiClient.delete(`/dms/expedientes/${id}`),
  adjuntarAExpediente: (d: Partial<ExpedienteDocumento>) =>
    apiClient.post<ExpedienteDocumento>('/dms/expedientes/documentos', d).then(r => r.data),
  quitarDeExpediente: (id: number) =>
    apiClient.delete(`/dms/expedientes/documentos/${id}`),

  retenciones: () => get<Retencion[]>('/dms/retencion'),
  // El servidor mira una ventana fija de treinta días; no recibe parámetro.
  vencimientos: () => get<any>('/dms/retencion/vencimientos'),
  crearRetencion: (d: Partial<Retencion>) =>
    apiClient.post<Retencion>('/dms/retencion', d).then(r => r.data),
  editarRetencion: (id: number, d: Partial<Retencion>) =>
    apiClient.put<Retencion>(`/dms/retencion/${id}`, d).then(r => r.data),

  auditoria: (f?: { documento_id?: number; usuario_id?: number; accion?: string; limit?: number }) =>
    get<RegistroAuditoria[]>('/dms/auditoria', { limit: 200, ...f }),

  notificaciones: (leida?: boolean) =>
    get<Notificacion[]>('/dms/notificaciones', { leida }),
  marcarLeida: (id: number) =>
    apiClient.put<Notificacion>(`/dms/notificaciones/${id}/leer`).then(r => r.data),
}

/** «2,4 MB». Los bytes crudos no le dicen nada a nadie en una tabla. */
export function peso(bytes?: number | null): string {
  const b = bytes ?? 0
  if (!b) return '—'
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)} GB`
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`
  if (b >= 1024) return `${Math.round(b / 1024)} KB`
  return `${b} B`
}
