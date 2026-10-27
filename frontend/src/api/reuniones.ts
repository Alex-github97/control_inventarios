/**
 * Asistente de reuniones del CRM contra el servidor.
 * Sigue a `backend/app/api/v1/endpoints/crm_reuniones.py`.
 */
import { apiClient } from './client'

export type EstadoReunion = 'PROGRAMADA' | 'EN_CURSO' | 'PROCESANDO' | 'POR_REVISAR' | 'CERRADA' | 'FALLIDA'

export interface Reunion {
  id: number; cliente_id: number; cliente?: string | null; oportunidad_id?: number | null
  titulo: string; origen: 'PRESENCIAL' | 'VIRTUAL'; plataforma?: string | null; enlace?: string | null
  fecha: string; estado: EstadoReunion; motivo_falla?: string | null; fuente_captura?: string | null
  aviso_confirmado: boolean; aviso_confirmado_en?: string | null; aviso_texto?: string | null
  tiene_audio: boolean; audio_duracion_s?: number | null; audio_borrado_en?: string | null
  resumen?: string | null; interaccion_id?: number | null; cerrada_en?: string | null
}

export interface ParticipanteReunion {
  id: number; nombre: string; contacto_id?: number | null; usuario_id?: number | null
  lado: 'NUESTRO' | 'CLIENTE' | null
}

export interface TramoReunion {
  id: number; orden: number; inicio_s: number; fin_s: number; texto: string
  texto_original?: string | null; participante_id?: number | null
}

export interface CompromisoReunion {
  id: number; reunion_id: number; cliente_id: number
  tipo: 'COMPROMISO' | 'ACUERDO' | 'RIESGO'; lado?: 'NUESTRO' | 'CLIENTE' | null
  descripcion: string; responsable_nombre?: string | null; participante_id?: number | null
  fecha_limite?: string | null; cita: string; minuto_s?: number | null
  estado: 'PROPUESTO' | 'APROBADO' | 'DESCARTADO' | 'CUMPLIDO'; actividad_id?: number | null
  vencido: boolean
}

export interface BotReunion {
  estado?: string | null; detalle?: string | null; plataforma: string
}

export interface ReunionDetalle extends Reunion {
  participantes: ParticipanteReunion[]
  tramos: TramoReunion[]
  compromisos: CompromisoReunion[]
  bot?: BotReunion | null
}

export interface ConfigReuniones {
  aviso_texto: string; retencion_audio_dias: number; tope_minutos_mes?: number | null
  ia_configurada: boolean; bot_configurado: boolean
}

/** Lo que dice el bot, en palabras del ejecutivo. */
export const TEXTO_BOT: Record<string, string> = {
  requested: 'El bot va en camino…', joining: 'El bot está entrando…',
  awaiting_admission: 'El bot espera en la sala de espera: admítalo desde la reunión.',
  needs_help: 'El bot necesita ayuda para entrar.', active: 'El bot está en la reunión, grabando.',
  stopping: 'El bot está saliendo…', completed: 'El bot terminó.', failed: 'El bot no pudo grabar.',
}

const B = '/crm/reuniones'
const d = <T,>(p: Promise<{ data: T }>) => p.then(r => r.data)

export const reunionesApi = {
  config: () => d(apiClient.get<ConfigReuniones>(`${B}/config`)),
  guardarConfig: (c: Partial<ConfigReuniones>) => d(apiClient.put<ConfigReuniones>(`${B}/config`, c)),
  listar: (f?: { cliente_id?: number; estado?: string }) => d(apiClient.get<Reunion[]>(B, { params: f })),
  ver: (id: number) => d(apiClient.get<ReunionDetalle>(`${B}/${id}`)),
  crear: (r: {
    cliente_id: number; oportunidad_id?: number | null; titulo: string; origen: string
    enlace?: string | null; fecha?: string | null
    participantes: { contacto_id?: number; usuario_id?: number }[]
  }) => d(apiClient.post<ReunionDetalle>(B, r)),
  confirmarAviso: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/aviso`, { confirmo: true })),
  iniciar: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/iniciar`)),
  enviarParte: (id: number, sesion: number, numero: number, datos: Blob) =>
    apiClient.put(`${B}/${id}/partes/${sesion}/${numero}`, datos, {
      headers: { 'Content-Type': 'application/octet-stream' }, timeout: 60000,
    }),
  detener: (id: number, sesiones: Record<number, number>) =>
    d(apiClient.post<Reunion>(`${B}/${id}/detener`, { sesiones })),
  subirArchivo: (id: number, archivo: File, progreso?: (p: number) => void) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return d(apiClient.post<Reunion>(`${B}/${id}/archivo`, fd, {
      timeout: 30 * 60 * 1000,
      onUploadProgress: e => progreso?.(e.total ? e.loaded / e.total : 0),
    }))
  },
  reintentar: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/reintentar`)),
  reextraer: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/reextraer`)),
  borrarAudio: (id: number) => d(apiClient.delete<Reunion>(`${B}/${id}/audio`)),
  editarTramo: (id: number, c: { texto?: string; participante_id?: number; quitar_participante?: boolean }) =>
    d(apiClient.put<TramoReunion>(`${B}/tramos/${id}`, c)),
  editarCompromiso: (id: number, c: Partial<{
    descripcion: string; tipo: string; lado: string; participante_id: number
    fecha_limite: string; quitar_fecha: boolean
  }>) => d(apiClient.put<CompromisoReunion>(`${B}/compromisos/${id}`, c)),
  aprobar: (id: number) => d(apiClient.post<CompromisoReunion>(`${B}/compromisos/${id}/aprobar`)),
  descartar: (id: number) => d(apiClient.post<CompromisoReunion>(`${B}/compromisos/${id}/descartar`)),
  cumplido: (id: number) => d(apiClient.post<CompromisoReunion>(`${B}/compromisos/${id}/cumplido`)),
  cerrar: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/cerrar`)),
  seguimiento: (f?: { cliente_id?: number; lado?: string; solo_vencidos?: boolean }) =>
    d(apiClient.get<CompromisoReunion[]>(`${B}/compromisos`, { params: f })),
  enviarBot: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/bot`)),
  retirarBot: (id: number) => d(apiClient.post<Reunion>(`${B}/${id}/bot/retirar`)),
  credencialVivo: () => d(apiClient.post<{ valor: string; vence?: number }>(`${B}/vivo/credencial`)),
}

/** 754 s → «12:34». */
export const minutoTexto = (s?: number | null) => {
  if (s == null) return '—'
  const t = Math.max(0, Math.floor(s))
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), seg = t % 60
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(seg).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
