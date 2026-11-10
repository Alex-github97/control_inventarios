import { apiClient as api } from '@/api/client'

export interface Descarga { token: string; nombre: string }
export interface AccionPendiente { herramienta: string; resumen: string }

export interface RespuestaBot {
  conversacion_id: number
  texto: string
  descargas?: Descarga[]
  accion?: AccionPendiente
}

export interface ResultadoConfirmar { conversacion_id: number; texto: string; exito: boolean }

const B = '/tittanbot'

export const tittanbotApi = {
  estado: () => api.get<{ activo: boolean; modelo?: string | null }>(`${B}/estado`).then(r => r.data),
  mensaje: (mensaje: string, conversacion_id?: number | null) =>
    api.post<RespuestaBot>(`${B}/mensaje`, { mensaje, conversacion_id: conversacion_id ?? null },
      { timeout: 120_000 }).then(r => r.data),
  confirmar: (conversacion_id: number, aceptar: boolean) =>
    api.post<ResultadoConfirmar>(`${B}/confirmar`, { conversacion_id, aceptar },
      { timeout: 120_000 }).then(r => r.data),
  /** Un Excel o CSV para que el bot lo revise e importe. */
  adjuntar: (archivo: File, conversacion_id?: number | null) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    if (conversacion_id) fd.append('conversacion_id', String(conversacion_id))
    return api.post<{ conversacion_id: number; nombre: string; filas: number; columnas: string[] }>(
      `${B}/adjunto`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 }).then(r => r.data)
  },
  /** El archivo pide sesión: se baja con el token y se entrega como descarga. */
  descargar: async (d: Descarga) => {
    const r = await api.get(`${B}/descargas/${d.token}`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = d.nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  },
}
