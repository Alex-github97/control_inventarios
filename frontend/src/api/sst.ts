/**
 * Seguridad y salud en el trabajo contra el servidor.
 *
 * Las diez pantallas del módulo eran maqueta —incluso Incidentes, que
 * importaba el cliente y no lo usaba—. Todas las rutas viven aquí.
 */
import { apiClient } from './client'

const get = <T,>(ruta: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(`/sst${ruta}`, { params }).then(r => r.data)
const post = <T,>(ruta: string, d?: unknown) => apiClient.post<T>(`/sst${ruta}`, d).then(r => r.data)
const put = <T,>(ruta: string, d?: unknown) => apiClient.put<T>(`/sst${ruta}`, d).then(r => r.data)
const del = (ruta: string) => apiClient.delete(`/sst${ruta}`)

/** CRUD de un recurso con la misma forma de rutas. */
const recurso = <T,>(base: string) => ({
  listar: (p?: Record<string, unknown>) => get<T[]>(base, p),
  crear: (d: Partial<T>) => post<T>(base, d),
  editar: (id: number, d: Partial<T>) => put<T>(`${base}/${id}`, d),
  retirar: (id: number) => del(`${base}/${id}`),
})

export interface Incidente {
  id: number; numero: string; tipo: string; gravedad?: string | null; estado: string
  fecha_evento: string; hora_evento?: string | null; lugar?: string | null
  trabajador?: string | null; cargo?: string | null; area?: string | null
  descripcion?: string | null; causa_inmediata?: string | null; causa_basica?: string | null
  dias_incapacidad: number; acciones_correctivas?: string | null
  investigador?: string | null; fecha_cierre?: string | null
}

export interface Riesgo {
  id: number; codigo: string; proceso?: string | null; area?: string | null; actividad?: string | null
  clase_peligro?: string | null; descripcion_peligro?: string | null; efecto_posible?: string | null
  nivel_deficiencia: number | null; nivel_exposicion: number | null; nivel_consecuencia: number | null
  /** Calculados por el servidor con la GTC 45. */
  nivel_probabilidad: number | null; nivel_riesgo_valor: number | null
  interpretacion: 'I' | 'II' | 'III' | 'IV' | null; aceptabilidad: string | null
  nivel_riesgo?: string | null; expuestos?: number | null
  controles_existentes?: string | null; controles_propuestos?: string | null
  responsable?: string | null; fecha_revision?: string | null
}

export interface Inspeccion {
  id: number; numero: string; tipo?: string | null; area?: string | null; estado: string
  fecha_programada?: string | null; fecha_realizacion?: string | null
  inspector?: string | null; descripcion?: string | null
  hallazgos_count: number; puntuacion?: number | null; observaciones?: string | null
}

export interface EntregaEPP {
  id: number; numero: string; trabajador: string; cargo?: string | null; area?: string | null
  tipo_epp: string; descripcion_epp?: string | null; cantidad: number
  fecha_entrega: string; fecha_vencimiento?: string | null
  firma_recibido: boolean; devuelto: boolean
  fecha_devolucion?: string | null; motivo_devolucion?: string | null
  vencido: boolean
}

export interface Capacitacion {
  id: number; codigo: string; titulo: string; tipo?: string | null; modalidad?: string | null
  estado: string; instructor?: string | null; fecha_inicio?: string | null; fecha_fin?: string | null
  duracion_horas?: number | null; max_participantes?: number | null; participantes: number
  area_dirigida?: string | null; descripcion?: string | null; evaluacion_prom?: number | null
}

export interface DocumentoSST {
  id: number; codigo: string; titulo: string; tipo: string; version: string; estado: string
  area_responsable?: string | null; responsable?: string | null
  fecha_aprobacion?: string | null; fecha_revision?: string | null
  descripcion?: string | null; url_documento?: string | null; revision_vencida: boolean
}

export interface Brigadista {
  id: number; nombre: string; cargo?: string | null; area?: string | null; rol: string
  telefono?: string | null; certificado_hasta?: string | null; certificado_vigente: boolean
}

export interface Simulacro {
  id: number; fecha: string; tipo: string; participantes?: number | null
  tiempo_respuesta_seg?: number | null; resultado?: string | null
  observaciones?: string | null; acciones_mejora?: string | null
}

export interface Periodo {
  id: number; anio: number; mes: number; trabajadores: number; horas_hombre: number
  dias_ausencia_medica: number; dias_programados?: number | null
}

export interface IndicadorMes {
  mes: number; accidentes: number; incidentes: number; dias_perdidos: number
  trabajadores: number | null; horas_hombre: number | null
  if: number | null; is: number | null; ili: number | null
  frecuencia_0312: number | null; severidad_0312: number | null; ausentismo: number | null
  inspecciones_programadas: number; inspecciones_completadas: number
  capacitaciones_programadas: number; capacitaciones_completadas: number; participantes: number
}

export interface Indicadores {
  anio: number; meses: IndicadorMes[]
  anual: {
    if: number | null; is: number | null; ili: number | null
    meses_con_periodo: number; accidentes_sin_periodo: number
    proporcion_at_mortales: number | null
    cumplimiento_inspecciones: number | null; cumplimiento_capacitaciones: number | null
    epp_vigentes_pct: number | null
  }
  epp_por_tipo: { tipo: string; cantidad: number }[]
}

export interface TableroSST {
  dias_sin_accidente: number | null; ultimo_accidente: string | null
  incidentes_anio: number; accidentes_trabajo: number; incidentes_abiertos: number
  inspecciones_pendientes: number; riesgos_criticos: number; epp_vencidos: number
  proximas_inspecciones: Inspeccion[]
}

export type ConfigSST = Record<string, string>

export const sstApi = {
  tablero: () => get<TableroSST>('/dashboard'),
  incidentes: {
    ...recurso<Incidente>('/incidentes'),
    estado: (id: number, estado: string) => apiClient.patch<Incidente>(`/sst/incidentes/${id}/estado`, null, { params: { estado } }).then(r => r.data),
  },
  riesgos: recurso<Riesgo>('/riesgos'),
  inspecciones: {
    ...recurso<Inspeccion>('/inspecciones'),
    estado: (id: number, estado: string) => apiClient.patch<Inspeccion>(`/sst/inspecciones/${id}/estado`, null, { params: { estado } }).then(r => r.data),
  },
  epp: {
    ...recurso<EntregaEPP>('/epp'),
    devolver: (id: number, motivo?: string) => post<EntregaEPP>(`/epp/${id}/devolver`, { motivo }),
  },
  capacitaciones: recurso<Capacitacion>('/capacitaciones'),
  documentos: recurso<DocumentoSST>('/documentos'),
  brigada: recurso<Brigadista>('/brigada'),
  simulacros: recurso<Simulacro>('/simulacros'),
  periodos: {
    listar: (anio?: number) => get<Periodo[]>('/periodos', anio ? { anio } : undefined),
    guardar: (d: Omit<Periodo, 'id'>) => put<Periodo>('/periodos', d),
    retirar: (id: number) => del(`/periodos/${id}`),
  },
  indicadores: (anio: number) => get<Indicadores>('/indicadores', { anio }),
  config: () => get<ConfigSST>('/config'),
  guardarConfig: (d: ConfigSST) => put<ConfigSST>('/config', d),
}
