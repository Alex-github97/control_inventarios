/**
 * Cliente de la capa de checklists del CMMS.
 *
 * La jerarquía de configuración: clasificación → sistema → pregunta. Las
 * preguntas son un banco global; una plantilla escoge de ahí y declara a qué
 * tipos de activo aplica.
 */
import { apiClient as api } from '@/api/client'

// ─── 1 · Clasificación: cómo se responde ─────────────────────────────────────

export interface Opcion {
  id: number
  clasificacion_id: number
  nombre: string
  orden: number
  /** true cuenta como conforme, false como hallazgo, null es informativa. */
  conforme: boolean | null
  /** De 0 a 1. Cuánto suma del peso de la pregunta: «Regular» puede valer 0,5. */
  puntaje: number
  color?: string | null
}

export interface OpcionEntrada {
  nombre: string
  orden?: number
  conforme?: boolean | null
  puntaje?: number
  color?: string | null
}

export interface Clasificacion {
  id: number
  nombre: string
  descripcion?: string | null
  /** OPCIONES | NUMERO | TEXTO | FECHA */
  tipo: string
  unidad?: string | null
  valor_min?: number | null
  valor_max?: number | null
  activo: boolean
  opciones: Opcion[]
  usos?: number
}

// ─── 2 · Sistema: qué parte del activo ───────────────────────────────────────

export interface Sistema {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null; orden: number; activo: boolean
  preguntas?: number
}

// ─── 3 · Pregunta: el banco global ───────────────────────────────────────────

export interface Pregunta {
  id: number
  sistema_id: number
  clasificacion_id: number
  texto: string
  ayuda?: string | null
  orden: number
  critico: boolean
  requiere_foto: boolean
  exige_observacion_no_conforme: boolean
  peso: number
  activo: boolean
  sistema?: string | null
  clasificacion?: string | null
  clasificacion_tipo?: string | null
  /** En cuántas plantillas se está usando. */
  usos?: number
}

// ─── Catálogos de apoyo ──────────────────────────────────────────────────────

export interface Categoria {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null; color?: string | null; activo: boolean
}

export interface Hallazgo {
  id: number; codigo: string; nombre: string; categoria?: string | null
  severidad: string; descripcion?: string | null
  accion_sugerida?: string | null; genera_ot: boolean; activo: boolean
}

// ─── 4 · Plantilla ───────────────────────────────────────────────────────────

export interface TipoAplica {
  id: number; tipo_activo: string
  marca?: string | null; linea?: string | null
}

export interface Plantilla {
  id: number; codigo: string; nombre: string
  categoria_id?: number | null; categoria?: string | null
  descripcion?: string | null
  version: number
  periodicidad_dias?: number | null
  requiere_firma: boolean
  umbral_aprobacion: number
  critico_reprueba: boolean
  genera_ot: boolean
  pide_medidor: boolean
  activo: boolean
  total_preguntas?: number
  ejecuciones?: number
  tipos: TipoAplica[]
}

// ─── Ejecución ───────────────────────────────────────────────────────────────

export interface FotoRespuesta {
  id: number; nombre?: string | null; nota?: string | null; url: string
}

export interface RespuestaGuardada {
  id: number
  opcion_id?: number | null
  valor_texto?: string | null
  valor_numero?: number | null
  conforme?: boolean | null
  puntaje?: number | null
  observacion?: string | null
  hallazgo_id?: number | null
  no_aplica: boolean
  fotos: FotoRespuesta[]
}

export interface ClasificacionEnPregunta {
  id: number; nombre: string; tipo: string
  unidad?: string | null
  valor_min?: number | null; valor_max?: number | null
  opciones: { id: number; nombre: string; conforme: boolean | null
              puntaje: number; color?: string | null }[]
}

export interface PreguntaEnEjecucion {
  pregunta_id: number
  texto: string
  ayuda?: string | null
  obligatorio: boolean
  critico: boolean
  requiere_foto: boolean
  peso: number
  exige_observacion_no_conforme: boolean
  clasificacion: ClasificacionEnPregunta
  respuesta: RespuestaGuardada | null
}

export interface BloqueSistema {
  id: number; nombre: string; preguntas: PreguntaEnEjecucion[]
}

export interface Ejecucion {
  id: number; numero: string
  plantilla_id: number; plantilla_version: number
  activo_id: number; ot_id?: number | null
  ejecutado_por?: string | null
  fecha_inicio: string; fecha_fin?: string | null
  estado: string
  resultado: string
  pct_conforme?: number | null
  total_items: number; no_conformes: number; criticos_no_conformes: number
  odometro?: number | null; horometro?: number | null
  ubicacion?: string | null; observaciones?: string | null
  firma_nombre?: string | null
  plantilla?: string | null
  activo_codigo?: string | null; activo_nombre?: string | null
  fotos?: number
}

export interface DetalleEjecucion {
  ejecucion: Ejecucion
  plantilla: {
    id: number; nombre: string; codigo: string; version_actual: number
    umbral_aprobacion: number; critico_reprueba: boolean
    requiere_firma: boolean; pide_medidor: boolean; genera_ot: boolean
  } | null
  activo: { id: number; codigo: string; nombre: string
            tipo_activo?: string | null
            marca?: string | null; linea?: string | null } | null
  sistemas: BloqueSistema[]
  fotos_generales: FotoRespuesta[]
  version_desactualizada: boolean
}

export interface Pendiente {
  plantilla_id: number; plantilla: string; codigo: string
  activo_id: number; activo: string
  proxima_fecha: string; ultima_fecha?: string | null
  dias: number; estado: string
}

export interface AnaliticaChk {
  total: number
  por_resultado: Record<string, number>
  promedio_conformidad: number | null
  rechazadas: number
  por_sistema: { etiqueta: string; cantidad: number }[]
  preguntas_mas_reprobadas: {
    etiqueta: string; critico: boolean; sistema: string; cantidad: number }[]
  hallazgos: { etiqueta: string; severidad: string; cantidad: number }[]
  por_marca: { etiqueta: string; cantidad: number; rechazadas: number }[]
  por_linea: { etiqueta: string; cantidad: number; rechazadas: number }[]
}

const R = '/eam/chk'

function catalogo<T>(ruta: string) {
  return {
    listar: (params?: Record<string, any>) =>
      api.get<T[]>(`${R}/${ruta}`, { params }).then(r => r.data),
    crear: (datos: any) => api.post<T>(`${R}/${ruta}`, datos).then(r => r.data),
    editar: (id: number, datos: any) =>
      api.put<T>(`${R}/${ruta}/${id}`, datos).then(r => r.data),
    borrar: (id: number) => api.delete(`${R}/${ruta}/${id}`).then(r => r.data),
  }
}

export const chkApi = {
  clasificaciones: catalogo<Clasificacion>('clasificaciones'),
  sistemas: catalogo<Sistema>('sistemas'),
  preguntas: catalogo<Pregunta>('preguntas'),
  categorias: catalogo<Categoria>('categorias'),
  hallazgos: catalogo<Hallazgo>('hallazgos'),
  plantillas: catalogo<Plantilla>('plantillas'),

  tiposClasificacion: () =>
    api.get<{ clave: string; label: string }[]>(`${R}/tipos-clasificacion`).then(r => r.data),

  /** Las plantillas que aplican a un activo concreto. */
  plantillasDeActivo: (activo_id: number) =>
    api.get<Plantilla[]>(`${R}/plantillas`, { params: { activo_id } }).then(r => r.data),

  estructura: (pid: number) =>
    api.get<any>(`${R}/plantillas/${pid}/estructura`).then(r => r.data),

  /** Define qué preguntas del banco componen la plantilla. El orden es el de la lista. */
  fijarPreguntas: (pid: number, pregunta_ids: number[]) =>
    api.put<any>(`${R}/plantillas/${pid}/preguntas`, { pregunta_ids }).then(r => r.data),

  ajustarPregunta: (ppid: number, datos: any) =>
    api.put<any>(`${R}/plantilla-preguntas/${ppid}`, datos).then(r => r.data),

  duplicar: (pid: number, codigo: string, nombre: string) =>
    api.post<Plantilla>(`${R}/plantillas/${pid}/duplicar`, { codigo, nombre }).then(r => r.data),

  tipos: {
    listar: (pid: number) =>
      api.get<TipoAplica[]>(`${R}/plantillas/${pid}/tipos`).then(r => r.data),
    agregar: (pid: number, datos: any) =>
      api.post<TipoAplica>(`${R}/plantillas/${pid}/tipos`, datos).then(r => r.data),
    quitar: (tid: number) => api.delete(`${R}/plantilla-tipos/${tid}`).then(r => r.data),
  },

  ejecuciones: {
    listar: (params?: Record<string, any>) =>
      api.get<Ejecucion[]>(`${R}/ejecuciones`, { params }).then(r => r.data),
    abrir: (datos: any) => api.post<Ejecucion>(`${R}/ejecuciones`, datos).then(r => r.data),
    detalle: (eid: number) =>
      api.get<DetalleEjecucion>(`${R}/ejecuciones/${eid}`).then(r => r.data),
    guardar: (eid: number, respuestas: any[]) =>
      api.put<any>(`${R}/ejecuciones/${eid}/respuestas`, { respuestas }).then(r => r.data),
    cerrar: (eid: number, datos: any) =>
      api.post<any>(`${R}/ejecuciones/${eid}/cerrar`, datos ?? {}).then(r => r.data),
    anular: (eid: number, motivo: string) =>
      api.post<any>(`${R}/ejecuciones/${eid}/anular`, null, { params: { motivo } })
        .then(r => r.data),
    subirFoto: (eid: number, archivo: File, respuesta_id?: number, nota?: string) => {
      const fd = new FormData()
      fd.append('archivo', archivo)
      if (respuesta_id) fd.append('respuesta_id', String(respuesta_id))
      if (nota) fd.append('nota', nota)
      return api.post<any>(`${R}/ejecuciones/${eid}/fotos`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
    },
    borrarFoto: (fid: number) => api.delete(`${R}/fotos/${fid}`).then(r => r.data),
  },

  pendientes: () => api.get<Pendiente[]>(`${R}/pendientes`).then(r => r.data),
  analitica: (dias = 90) =>
    api.get<AnaliticaChk>(`${R}/analitica`, { params: { dias } }).then(r => r.data),
}

export const ETIQUETA_RESULTADO: Record<string, string> = {
  APROBADO: 'Aprobado',
  APROBADO_CON_OBSERVACIONES: 'Aprobado con observaciones',
  RECHAZADO: 'Rechazado',
  PENDIENTE: 'Sin calificar',
}

export const ETIQUETA_TIPO_CLASIFICACION: Record<string, string> = {
  OPCIONES: 'Escoger una opción',
  NUMERO: 'Un número, con rango aceptable',
  TEXTO: 'Texto libre',
  FECHA: 'Una fecha',
}
