import { apiClient } from './client'

export interface Estiba {
  id: number
  codigo_interno: string
  codigo_qr?: string
  codigo_rfid?: string
  tipo: string
  material: string
  estado: string
  tipo_propietario: string
  ubicacion_actual?: { id: number; nombre: string; tipo: string }
  proveedor?: { id: number; razon_social: string }
  fecha_ingreso: string
  valor_actual?: number
  total_usos: number
  observaciones?: string
  nivel_dano?: string
  created_at: string
}

export interface EstibaListResponse {
  items: Estiba[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface EstibaKPIs {
  total: number
  DISPONIBLE: number
  EN_TRANSITO: number
  EN_CLIENTE: number
  PENDIENTE_RETORNO: number
  DANADA: number
  EN_REPARACION: number
  EN_INVENTARIO: number
  PERDIDA: number
  BAJA: number
}

export const estibasApi = {
  listar: (params?: Record<string, any>) =>
    apiClient.get<EstibaListResponse>('/estibas', { params }).then(r => r.data),

  obtener: (id: number) =>
    apiClient.get<Estiba>(`/estibas/${id}`).then(r => r.data),

  buscar: (codigo: string) =>
    apiClient.get<Estiba>(`/estibas/buscar/${codigo}`).then(r => r.data),

  crear: (data: Partial<Estiba>) =>
    apiClient.post<Estiba>('/estibas', data).then(r => r.data),

  actualizar: (id: number, data: Partial<Estiba>) =>
    apiClient.put<Estiba>(`/estibas/${id}`, data).then(r => r.data),

  kpis: () =>
    apiClient.get<EstibaKPIs>('/estibas/kpis').then(r => r.data),

  trazabilidad: (id: number) =>
    apiClient.get(`/estibas/${id}/trazabilidad`).then(r => r.data),

  darBaja: (id: number, motivo: string) =>
    apiClient.post(`/estibas/${id}/dar-baja`, null, { params: { motivo } }).then(r => r.data),
}
