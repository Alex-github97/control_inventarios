import { apiClient } from './client'

export interface DashboardKPIs {
  total_estibas: number
  disponibles: number
  en_transito: number
  en_cliente: number
  pendiente_retorno: number
  danadas: number
  en_reparacion: number
  propias: number
  alquiladas: number
  alertas_activas: number
  movimientos_hoy: number
  manifiestos_activos: number
}

export interface TendenciaMovimiento {
  fecha: string
  cargas: number
  descargas: number
  transferencias: number
  total: number
}

export interface DanoEstadistica {
  codigo: string
  descripcion: string
  cantidad: number
  porcentaje: number
}

export interface DashboardData {
  kpis: DashboardKPIs
  tendencia_movimientos: TendenciaMovimiento[]
  top_danos: DanoEstadistica[]
  ocupacion_ubicaciones: any[]
  alertas_recientes: any[]
  movimientos_recientes: any[]
}

export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard').then(r => r.data),
  kpis: () => apiClient.get<DashboardKPIs>('/dashboard/kpis').then(r => r.data),
  tendencia: (dias?: number) =>
    apiClient.get<TendenciaMovimiento[]>('/dashboard/tendencia-movimientos', { params: { dias } }).then(r => r.data),
}
