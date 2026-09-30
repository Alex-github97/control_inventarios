import { apiClient } from './client'

// ─── Enums ────────────────────────────────────────────────────────────────────
export type EstadoSolicitud = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'
export type PrioridadSCM   = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'
export type EstadoOrden    = 'BORRADOR' | 'ENVIADA' | 'CONFIRMADA' | 'EN_TRANSITO' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CERRADA' | 'CANCELADA'
export type CategoriaSCM   = 'INSUMOS' | 'SERVICIOS' | 'EQUIPOS' | 'MATERIALES' | 'LOGISTICA' | 'IT' | 'REPUESTOS' | 'PAPELERIA' | 'OTROS'
export type ClasificacionProveedor = 'A' | 'B' | 'C' | 'D'

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface SolicitudItem {
  id?: number
  descripcion: string
  cantidad: number
  unidad?: string
  precio_estimado?: number
  total_estimado?: number
  especificaciones?: string
}

export interface Solicitud {
  id: number
  numero: string
  titulo: string
  descripcion?: string
  estado: EstadoSolicitud
  prioridad: PrioridadSCM
  categoria: CategoriaSCM
  presupuesto_estimado?: number
  fecha_requerida?: string
  fecha_aprobacion?: string
  motivo_rechazo?: string
  items: SolicitudItem[]
  created_at: string
}

export interface OrdenItem {
  id?: number
  descripcion: string
  cantidad: number
  unidad?: string
  precio_unitario: number
  subtotal?: number
  especificaciones?: string
}

export interface OrdenCompra {
  id: number
  numero: string
  proveedor_id: number
  proveedor_nombre?: string
  solicitud_id?: number
  estado: EstadoOrden
  prioridad: PrioridadSCM
  subtotal: number
  impuestos: number
  total: number
  fecha_entrega_esperada?: string
  fecha_entrega_real?: string
  condiciones_pago?: string
  notas?: string
  items: OrdenItem[]
  created_at: string
}

export interface EvaluacionProveedor {
  id: number
  proveedor_id: number
  orden_compra_id?: number
  calidad: number
  tiempo_entrega: number
  precio: number
  servicio: number
  documentacion: number
  puntaje_total: number
  clasificacion: ClasificacionProveedor
  comentarios?: string
  recomendacion?: string
  created_at: string
}

export interface ProveedorSCM {
  id: number
  razon_social: string
  nombre_comercial?: string
  nit?: string
  contacto_nombre?: string
  contacto_email?: string
  ciudad?: string
  tipo?: string
  total_ordenes?: number
  puntaje_promedio?: number
  clasificacion?: ClasificacionProveedor
}

// Dashboard usa dicts para los estados (formato real del backend)
export interface SCMDashboardData {
  kpis: {
    total_solicitudes: number
    solicitudes_pendientes: number
    oc_abiertas: number
    valor_oc_en_proceso: number
    proveedores_activos: number
  }
  oc_por_estado: Record<string, number>
  sol_por_estado: Record<string, number>
  // Calculadas con los plazos de Configuración SCM.
  alertas: { tipo: 'OC_SIN_CONFIRMAR' | 'PROVEEDOR_SIN_EVALUAR'; id: number; texto: string; detalle: string }[]
  parametros: { dias_oc_sin_confirmar: number; dias_evaluacion_proveedor: number }
}

// ─── API calls ────────────────────────────────────────────────────────────────
export async function getSCMDashboard(): Promise<SCMDashboardData> {
  const r = await apiClient.get('/scm/dashboard')
  return r.data
}

export async function getSolicitudes(params?: {
  page?: number; page_size?: number; estado?: EstadoSolicitud; prioridad?: PrioridadSCM
}): Promise<{ items: Solicitud[]; total: number }> {
  const r = await apiClient.get('/scm/solicitudes', { params })
  return r.data
}

export async function createSolicitud(data: {
  titulo: string; descripcion?: string; prioridad: PrioridadSCM; categoria: CategoriaSCM
  presupuesto_estimado?: number; fecha_requerida?: string; items: SolicitudItem[]
}): Promise<Solicitud> {
  const r = await apiClient.post('/scm/solicitudes', data)
  return r.data
}

export async function enviarSolicitud(id: number): Promise<Solicitud> {
  const r = await apiClient.put(`/scm/solicitudes/${id}/enviar`)
  return r.data
}

export async function aprobarSolicitud(id: number): Promise<Solicitud> {
  const r = await apiClient.put(`/scm/solicitudes/${id}/aprobar`)
  return r.data
}

export async function rechazarSolicitud(id: number, motivo: string): Promise<Solicitud> {
  const r = await apiClient.put(`/scm/solicitudes/${id}/rechazar`, { motivo })
  return r.data
}

export async function getOrdenesCompra(params?: {
  page?: number; page_size?: number; estado?: EstadoOrden; proveedor_id?: number
}): Promise<{ items: OrdenCompra[]; total: number }> {
  const r = await apiClient.get('/scm/ordenes-compra', { params })
  return r.data
}

export async function getOrdenCompra(id: number): Promise<OrdenCompra> {
  const r = await apiClient.get(`/scm/ordenes-compra/${id}`)
  return r.data
}

export async function createOrdenCompra(data: {
  proveedor_id: number; solicitud_id?: number; prioridad?: PrioridadSCM
  fecha_entrega_estimada?: string; terminos_pago?: string; notas?: string
  impuestos_pct?: number; items: OrdenItem[]
}): Promise<OrdenCompra> {
  const r = await apiClient.post('/scm/ordenes-compra', data)
  return r.data
}

export async function actualizarEstadoOrden(id: number, estado: EstadoOrden, fecha_entrega_real?: string): Promise<OrdenCompra> {
  const r = await apiClient.put(`/scm/ordenes-compra/${id}/estado`, { estado, fecha_entrega_real })
  return r.data
}

export async function getEvaluacionesProveedor(proveedorId: number): Promise<EvaluacionProveedor[]> {
  const r = await apiClient.get(`/scm/evaluaciones/proveedor/${proveedorId}`)
  return r.data
}

export async function createEvaluacion(data: {
  proveedor_id: number; orden_compra_id?: number
  calidad: number; tiempo_entrega: number; precio: number; servicio: number; documentacion: number
  comentarios?: string; recomendacion?: string
}): Promise<EvaluacionProveedor> {
  const r = await apiClient.post('/scm/evaluaciones', data)
  return r.data
}

export async function getProveedoresSCM(params?: {
  page?: number; page_size?: number; q?: string
}): Promise<{ items: ProveedorSCM[]; total: number }> {
  const r = await apiClient.get('/scm/proveedores', { params })
  return r.data
}

// ─── Inventario, entrantes, reposición, devoluciones y riesgos ──────────────
// Las cinco pantallas que eran maqueta. Todo sale de datos que ya existían
// (inventario, órdenes de compra) o de tablas nuevas (devoluciones, riesgos).

export interface InventarioSCM {
  bodegas: { id: number; nombre: string; codigo: string; referencias: number; unidades: number; valor: number; bajo_minimo: number }[]
  alertas: { repuesto_id: number; codigo: string; nombre: string; bodega: string | null; cantidad: number; minimo: number; en_camino: number; nivel: 'CRITICO' | 'BAJO' }[]
  valor_total: number
}

export interface EntrantesSCM {
  en_camino: {
    id: number; numero: string; estado: EstadoOrden; proveedor: string | null; categoria: CategoriaSCM
    total: number | null; lugar_entrega: string | null; fecha_emision: string | null
    fecha_esperada: string | null; dias_atraso: number; unidades_pedidas: number; unidades_recibidas: number
  }[]
  recibidas_90d: number; recibidas_mes: number; a_tiempo_pct: number | null; medibles: number
}

export interface ItemReposicion {
  repuesto_id: number; codigo: string; nombre: string; categoria: string | null; unidad: string | null
  existencias: number; minimo: number; maximo: number | null; en_camino: number
  consumo_diario: number; dias_cobertura: number | null; sugerido: number
}

export interface DemandaCategoria { categoria: CategoriaSCM; actual: number; anterior: number; variacion_pct: number | null }

export interface DevolucionSCM {
  id: number; numero: string; orden_id: number; orden_numero: string | null
  proveedor_id: number | null; proveedor: string | null
  motivo: string; estado: string; fecha: string; unidades: number | null; valor: number | null
  descripcion: string | null; resolucion: string | null; valor_recuperado: number | null; fecha_cierre: string | null
}

export interface RiesgoSCM {
  id: number; titulo: string; categoria: string; proveedor_id: number | null; proveedor: string | null
  impacto: number; probabilidad: number; puntaje: number; nivel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  estado: string; responsable: string | null; descripcion: string | null
  plan_mitigacion: string | null; fecha_revision: string | null
}

export const scmApi = {
  inventario: () => apiClient.get<InventarioSCM>('/scm/inventario').then(r => r.data),
  entrantes: () => apiClient.get<EntrantesSCM>('/scm/entrantes').then(r => r.data),
  reposicion: (dias = 90) => apiClient.get<{ dias_consumo: number; items: ItemReposicion[] }>('/scm/reposicion', { params: { dias } }).then(r => r.data),
  demanda: () => apiClient.get<DemandaCategoria[]>('/scm/demanda').then(r => r.data),
  devoluciones: {
    listar: () => apiClient.get<DevolucionSCM[]>('/scm/devoluciones').then(r => r.data),
    crear: (d: Partial<DevolucionSCM>) => apiClient.post<DevolucionSCM>('/scm/devoluciones', d).then(r => r.data),
    editar: (id: number, d: Partial<DevolucionSCM>) => apiClient.put<DevolucionSCM>(`/scm/devoluciones/${id}`, d).then(r => r.data),
    retirar: (id: number) => apiClient.delete(`/scm/devoluciones/${id}`),
    estado: (id: number, estado: string, resolucion?: string | null, valor_recuperado?: number | null) =>
      apiClient.put<DevolucionSCM>(`/scm/devoluciones/${id}/estado`, { estado, resolucion, valor_recuperado }).then(r => r.data),
  },
  riesgos: {
    listar: () => apiClient.get<RiesgoSCM[]>('/scm/riesgos').then(r => r.data),
    crear: (d: Partial<RiesgoSCM>) => apiClient.post<RiesgoSCM>('/scm/riesgos', d).then(r => r.data),
    editar: (id: number, d: Partial<RiesgoSCM>) => apiClient.put<RiesgoSCM>(`/scm/riesgos/${id}`, d).then(r => r.data),
    retirar: (id: number) => apiClient.delete(`/scm/riesgos/${id}`),
  },
}
