/**
 * Cliente de la capa de checklists del CMMS.
 *
 * Todo cuelga de `/eam/chk`: es una capa del CMMS, no un módulo aparte.
 */
import { apiClient as api } from '@/api/client'

export interface Categoria {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null; color?: string | null; activo: boolean
}

export interface Hallazgo {
  id: number; codigo: string; nombre: string; categoria?: string | null
  /** LEVE | MODERADO | GRAVE */
  severidad: string
  descripcion?: string | null; accion_sugerida?: string | null
  /** Si al marcarlo debe abrirse una orden de trabajo automáticamente. */
  genera_ot: boolean
  activo: boolean
}

export interface Plantilla {
  id: number; codigo: string; nombre: string
  categoria_id?: number | null; categoria?: string | null
  descripcion?: string | null
  tipo_activo?: string | null; marca?: string | null; linea?: string | null
  activo_id?: number | null
  version: number
  periodicidad_dias?: number | null
  requiere_firma: boolean
  umbral_aprobacion: number
  /** Un ítem crítico no conforme reprueba, sin importar el porcentaje. */
  critico_reprueba: boolean
  genera_ot: boolean
  pide_medidor: boolean
  activo: boolean
  total_items?: number
  ejecuciones?: number
}

export interface Seccion {
  id: number; plantilla_id: number; nombre: string; orden: number
  descripcion?: string | null; activo?: boolean
}

export interface Item {
  id: number; plantilla_id: number; seccion_id?: number | null
  orden: number; pregunta: string; ayuda?: string | null
  /** CONFORME_NO | SI_NO | TEXTO | NUMERO | OPCIONES | FECHA | RANGO */
  tipo: string
  opciones?: string[] | null; unidad?: string | null
  valor_min?: number | null; valor_max?: number | null
  obligatorio: boolean; critico: boolean; requiere_foto: boolean
  exige_observacion_no_conforme: boolean
  peso: number; activo?: boolean
}

export interface FotoRespuesta {
  id: number; nombre?: string | null; nota?: string | null; url: string
}

export interface RespuestaGuardada {
  id: number
  valor_texto?: string | null; valor_numero?: number | null
  valor_bool?: boolean | null
  conforme?: boolean | null; observacion?: string | null
  hallazgo_id?: number | null; no_aplica: boolean
  fotos: FotoRespuesta[]
}

export interface ItemEnEjecucion extends Omit<Item, 'id' | 'plantilla_id' | 'seccion_id' | 'orden' | 'activo'> {
  item_id: number
  respuesta: RespuestaGuardada | null
}

export interface BloqueSeccion {
  id: number | null; nombre: string; descripcion?: string | null
  items: ItemEnEjecucion[]
}

export interface Ejecucion {
  id: number; numero: string
  plantilla_id: number; plantilla_version: number
  activo_id: number; ot_id?: number | null
  ejecutado_por?: string | null
  fecha_inicio: string; fecha_fin?: string | null
  /** BORRADOR | COMPLETADA | ANULADA */
  estado: string
  /** APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO | PENDIENTE */
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
            marca?: string | null; linea?: string | null } | null
  secciones: BloqueSeccion[]
  fotos_generales: FotoRespuesta[]
  /** La plantilla cambió después de abrir esta inspección. */
  version_desactualizada: boolean
}

export interface Pendiente {
  plantilla_id: number; plantilla: string; codigo: string
  activo_id: number; activo: string
  proxima_fecha: string; ultima_fecha?: string | null
  dias: number
  /** VENCIDA | PROXIMA */
  estado: string
}

export interface AnaliticaChk {
  total: number
  por_resultado: Record<string, number>
  promedio_conformidad: number | null
  rechazadas: number
  items_mas_reprobados: { etiqueta: string; critico: boolean; cantidad: number }[]
  hallazgos: { etiqueta: string; severidad: string; cantidad: number }[]
  por_marca: { etiqueta: string; cantidad: number; rechazadas: number }[]
  por_linea: { etiqueta: string; cantidad: number; rechazadas: number }[]
}

const R = '/eam/chk'

function catalogo<T>(ruta: string) {
  return {
    listar: (params?: Record<string, any>) =>
      api.get<T[]>(`${R}/${ruta}`, { params }).then(r => r.data),
    crear: (datos: Partial<T>) => api.post<T>(`${R}/${ruta}`, datos).then(r => r.data),
    editar: (id: number, datos: Partial<T>) =>
      api.put<T>(`${R}/${ruta}/${id}`, datos).then(r => r.data),
    borrar: (id: number) => api.delete(`${R}/${ruta}/${id}`).then(r => r.data),
  }
}

export const chkApi = {
  categorias: catalogo<Categoria>('categorias'),
  hallazgos: catalogo<Hallazgo>('hallazgos'),
  plantillas: catalogo<Plantilla>('plantillas'),
  secciones: catalogo<Seccion>('secciones'),
  items: catalogo<Item>('items'),

  tiposItem: () => api.get<{ clave: string; label: string }[]>(`${R}/tipos-item`).then(r => r.data),

  estructura: (pid: number) =>
    api.get<any>(`${R}/plantillas/${pid}/estructura`).then(r => r.data),

  duplicar: (pid: number, codigo: string, nombre: string) =>
    api.post<Plantilla>(`${R}/plantillas/${pid}/duplicar`, { codigo, nombre }).then(r => r.data),

  reordenar: (ids: number[]) =>
    api.put(`${R}/items/reordenar`, { ids }).then(r => r.data),

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

export const ETIQUETA_TIPO: Record<string, string> = {
  CONFORME_NO: 'Conforme / No conforme',
  SI_NO: 'Sí / No',
  TEXTO: 'Texto libre',
  NUMERO: 'Número',
  OPCIONES: 'Lista de opciones',
  FECHA: 'Fecha',
  RANGO: 'Rango (1 a 5)',
}
