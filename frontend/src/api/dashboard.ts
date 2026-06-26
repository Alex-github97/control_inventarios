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
  edad_promedio_meses?: number
  total_costos_acumulados?: number
  faltantes?: number
  perdidas?: number
  valor_perdidas?: number
  tiempo_promedio_retorno_dias?: number
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

export interface RetornoMensual {
  mes: string
  promedio_dias: number
  cantidad_retornos: number
}

export interface RetornoData {
  tiempo_promedio_dias: number
  retorno_por_mes: RetornoMensual[]
}

export interface UbicacionSimple {
  id: number
  nombre: string
  tipo: string
}

export interface DashboardData {
  kpis: DashboardKPIs
  tendencia_movimientos: TendenciaMovimiento[]
  top_danos: DanoEstadistica[]
  ocupacion_ubicaciones: any[]
  alertas_recientes: any[]
  movimientos_recientes: any[]
  edad_distribucion?: any[]
  costos_por_mes?: any[]
}

export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard').then(r => r.data),
  kpis: () => apiClient.get<DashboardKPIs>('/dashboard/kpis').then(r => r.data),
  tendencia: (dias?: number) =>
    apiClient.get<TendenciaMovimiento[]>('/dashboard/tendencia-movimientos', { params: { dias } }).then(r => r.data),
  retorno: (bodega_id?: number) =>
    apiClient.get<RetornoData>('/dashboard/retorno', { params: bodega_id ? { bodega_id } : {} }).then(r => r.data),
  ubicacionesClientes: () =>
    apiClient.get<UbicacionSimple[]>('/ubicaciones/', { params: { tipo: 'CLIENTE' } }).then(r => r.data),
}
