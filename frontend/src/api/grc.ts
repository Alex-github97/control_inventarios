/**
 * Cliente de GRC. Cada recurso tiene las mismas cinco operaciones (listar,
 * ver, crear, editar, retirar); lo particular va aparte. Las personas viajan
 * como id de usuario y el servidor devuelve su nombre en `<campo>_nombre`.
 */
import { apiClient as api } from './client'

const datos = <T,>(p: Promise<{ data: T }>) => p.then(r => r.data)

export interface Registro { id: number; [k: string]: any }

function recurso<T extends Registro = Registro>(ruta: string) {
  return {
    listar: (params?: Record<string, any>) => datos<T[]>(api.get(`/grc/${ruta}`, { params })),
    ver: (id: number) => datos<T>(api.get(`/grc/${ruta}/${id}`)),
    crear: (d: any) => datos<T>(api.post(`/grc/${ruta}`, d)),
    editar: (id: number, d: any) => datos<T>(api.put(`/grc/${ruta}/${id}`, d)),
    retirar: (id: number) => api.delete(`/grc/${ruta}/${id}`),
  }
}

export type Recurso = ReturnType<typeof recurso>

export const grc = {
  comites: recurso('comites'),
  sesiones: recurso('sesiones'),
  politicas: recurso('politicas'),
  obligaciones: recurso('obligaciones'),
  cumplimiento: recurso('cumplimiento'),
  controles: recurso('controles'),
  pruebas: recurso('pruebas'),
  riesgos: recurso('riesgos'),
  tratamientos: recurso('tratamientos'),
  kris: recurso('kris'),
  auditorias: recurso('auditorias'),
  hallazgos: recurso('hallazgos'),
  planes: recurso('planes'),
  incidentes: recurso('incidentes'),
  continuidad: recurso('continuidad'),
  simulacros: recurso('simulacros'),
  terceros: recurso('terceros'),
  evaluaciones: recurso('evaluaciones'),
  evidencias: recurso('evidencias'),

  personas: () => datos<{ id: number; nombre: string; email?: string; cargo?: string | null }[]>(api.get('/grc/personas')),

  controlesDeRiesgo: (rid: number) => datos<any[]>(api.get(`/grc/riesgos/${rid}/controles`)),
  vincularControl: (rid: number, control_id: number) => datos<any[]>(api.post(`/grc/riesgos/${rid}/controles`, { control_id })),
  desvincularControl: (rid: number, cid: number) => api.delete(`/grc/riesgos/${rid}/controles/${cid}`),

  vinculos: (tipo: string, id: number) => datos<any[]>(api.get('/grc/vinculos', { params: { tipo, id } })),
  vincular: (d: { origen_tipo: string; origen_id: number; destino_tipo: string; destino_id: number }) =>
    datos<{ id: number }>(api.post('/grc/vinculos', d)),
  desvincular: (vid: number) => api.delete(`/grc/vinculos/${vid}`),

  mediciones: (kid: number) => datos<any[]>(api.get(`/grc/kris/${kid}/mediciones`)),
  medir: (kid: number, d: { periodo: string; valor: number; nota?: string }) => datos<any[]>(api.post(`/grc/kris/${kid}/mediciones`, d)),
  borrarMedicion: (mid: number) => api.delete(`/grc/kris/mediciones/${mid}`),

  estadoPolitica: (pid: number, estado: string, comentario?: string) =>
    datos<any>(api.post(`/grc/politicas/${pid}/estado`, { estado, comentario })),
  aceptarPolitica: (pid: number) => datos<any>(api.post(`/grc/politicas/${pid}/aceptar`)),
  aceptaciones: (pid: number) => datos<any[]>(api.get(`/grc/politicas/${pid}/aceptaciones`)),
  misPendientes: () => datos<any[]>(api.get('/grc/mis-politicas-pendientes')),

  hallazgoDeIncidente: (iid: number) => datos<{ id: number; codigo: string }>(api.post(`/grc/incidentes/${iid}/hallazgo`)),

  subirEvidencia: (fd: FormData) => datos<{ id: number }>(api.post('/grc/evidencias/archivo', fd)),
  descargarEvidencia: async (id: number, nombre: string) => {
    const r = await api.get(`/grc/evidencias/${id}/descargar`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data as Blob)
    const a = document.createElement('a'); a.href = url; a.download = nombre; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },

  ficha: (tipo: string, id: number) => datos<any>(api.get(`/grc/ficha/${tipo}/${id}`)),
  historial: (entidad: string, id: number) => datos<any[]>(api.get('/grc/historial', { params: { entidad, id } })),
  fuentesTerceros: () => datos<{ proveedores: any[]; clientes: any[] }>(api.get('/grc/terceros-fuentes')),

  matriz: () => datos<{ escala: any[]; bandas: any[] }>(api.get('/grc/config/matriz')),
  guardarEscala: (d: any[]) => datos<any>(api.put('/grc/config/escala', d)),
  guardarBandas: (d: any[]) => datos<any>(api.put('/grc/config/bandas', d)),
  apetito: () => datos<{ categoria: string; apetito: number | null }[]>(api.get('/grc/config/apetito')),
  guardarApetito: (d: any[]) => datos<any>(api.put('/grc/config/apetito', d)),
  parametros: () => datos<any[]>(api.get('/grc/config/parametros')),
  guardarParametros: (d: Record<string, number>) => datos<any[]>(api.put('/grc/config/parametros', d)),

  agenda: (dias = 60) => datos<{ items: any[]; vencidos: number; por_vencer: number }>(api.get('/grc/agenda', { params: { dias } })),
  tablero: () => datos<any>(api.get('/grc/tablero')),
  responsables: () => datos<any[]>(api.get('/grc/responsables')),
  reporteJunta: () => datos<any>(api.get('/grc/reporte-junta')),
}
