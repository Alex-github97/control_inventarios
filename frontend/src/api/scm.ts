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
