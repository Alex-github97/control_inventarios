import { apiClient } from './client'

export interface MovimientoItem {
  id: number
  tipo: string
  fecha: string
  estiba_id: number
  estiba_codigo: string
  usuario: string
  ubicacion_origen: string | null
  ubicacion_destino: string | null
  vehiculo: string | null
  estado_antes: string | null
  estado_despues: string | null
  observaciones: string | null
}

export interface MovimientosListResponse {
  items: MovimientoItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface MovimientoResumen {
  por_tipo: Record<string, number>
  totales: {
    entradas: number
    salidas: number
    transferencias: number
    otros: number
    total: number
    balance: number
  }
}

interface ListParams {
  fecha_inicio?: string
  fecha_fin?: string
  tipo?: string
  page?: number
  page_size?: number
}

export const movimientosApi = {
  resumen: (fecha_inicio?: string, fecha_fin?: string): Promise<MovimientoResumen> => {
    const params: Record<string, string> = {}
    if (fecha_inicio) params.fecha_inicio = fecha_inicio
    if (fecha_fin) params.fecha_fin = fecha_fin
    return apiClient.get<MovimientoResumen>('/movimientos/resumen', { params }).then(r => r.data)
  },

  lista: (p: ListParams = {}): Promise<MovimientosListResponse> => {
    const params: Record<string, string | number> = {}
    if (p.fecha_inicio) params.fecha_inicio = p.fecha_inicio
    if (p.fecha_fin) params.fecha_fin = p.fecha_fin
    if (p.tipo) params.tipo = p.tipo
    if (p.page) params.page = p.page
    if (p.page_size) params.page_size = p.page_size
    return apiClient.get<MovimientosListResponse>('/movimientos/lista', { params }).then(r => r.data)
  },

  exportar: async (
    fecha_inicio?: string,
    fecha_fin?: string,
    tipo?: string,
  ): Promise<void> => {
    const params: Record<string, string> = {}
    if (fecha_inicio) params.fecha_inicio = fecha_inicio
    if (fecha_fin) params.fecha_fin = fecha_fin
    if (tipo) params.tipo = tipo

    const token = localStorage.getItem('access_token') ?? ''
    const qs = new URLSearchParams(params).toString()
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1'
    const url = `${baseUrl}/movimientos/exportar${qs ? '?' + qs : ''}`

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) throw new Error('Error al exportar')
    const blob = await resp.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `movimientos_${fecha_inicio ?? 'todos'}_${fecha_fin ?? 'todos'}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  },
}
