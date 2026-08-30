/**
 * Cliente de la capa de lubricación del CMMS.
 *
 * Todo cuelga de `/eam/lube` porque lubricación no es un módulo aparte: es una
 * capa del CMMS, y el control de acceso por módulo la trata como parte de EAM.
 */
import { apiClient as api } from '@/api/client'

// ─── Catálogos ────────────────────────────────────────────────────────────────

export interface Marca { id: number; nombre: string; activo: boolean }

export interface TipoCompartimento {
  id: number; codigo?: string | null; nombre: string
  descripcion?: string | null
  /** HORAS | KM | DIAS — con qué se mide la vida del aceite en esta familia. */
  unidad_vida: string
  activo: boolean
}

export interface Producto {
  id: number; marca_id: number; nombre: string; marca?: string | null
  familia?: string | null; grado_sae?: string | null
  grado_iso?: string | null; base?: string | null; activo: boolean
}

export interface Aplicacion {
  id: number; producto_id: number; tipo_compartimento_id: number
  producto?: string | null; tipo_compartimento?: string | null
  vida_recomendada?: number | null; vida_maxima?: number | null
  meta_iso4406?: string | null; volumen_tipico?: number | null
  costo_litro?: number | null; observaciones?: string | null; activo: boolean
}

export interface Parametro {
  id: number; codigo: string; nombre: string; unidad?: string | null
  /** DESGASTE | CONTAMINACION | ADITIVO | PROPIEDAD */
  grupo: string
  /** Qué pieza o entrada delata el elemento. Es lo que traduce el número. */
  origen_probable?: string | null
  es_texto: boolean; bidireccional: boolean; orden: number; activo: boolean
}

export interface Limite {
  id: number; parametro_id: number; parametro?: string | null
  tipo_compartimento_id?: number | null; tipo_compartimento?: string | null
  producto_id?: number | null; compartimento_id?: number | null
  /** ABSOLUTO | ESTADISTICO | TASA_CAMBIO */
  tipo: string
  marginal_min?: number | null; marginal_max?: number | null
  critico_min?: number | null; critico_max?: number | null
  fuente?: string | null; nota?: string | null; activo: boolean
}

export interface Laboratorio {
  id: number; nombre: string; contacto?: string | null; telefono?: string | null
  correo?: string | null; dias_respuesta?: number | null; activo: boolean
}

export interface MetodoMuestreo {
  id: number; nombre: string
  /** RECOMENDADO | ACEPTABLE | NO_RECOMENDADO */
  calidad: string
  descripcion?: string | null; activo: boolean
}

export interface MotivoDrenaje {
  id: number; codigo?: string | null; nombre: string; categoria: string
  evitable: boolean; descripcion?: string | null; activo: boolean
}

export interface ModoFalla {
  id: number; codigo: string; nombre: string; categoria: string
  severidad: string; descripcion?: string | null
  accion_sugerida?: string | null; activo: boolean
}

// ─── Operación ────────────────────────────────────────────────────────────────

export interface Compartimento {
  id: number; activo_id: number; componente_id?: number | null
  tipo_compartimento_id: number; codigo: string; nombre: string
  capacidad_litros?: number | null
  producto_recomendado_id?: number | null; meta_iso4406?: string | null
  frecuencia_muestreo?: number | null; metodo_muestreo_id?: number | null
  tiene_puerto_muestreo: boolean; critico: boolean
  observaciones?: string | null; activo: boolean
  // Derivados que trae la lista, para no pedir una consulta por fila.
  activo_codigo?: string | null; activo_nombre?: string | null
  tipo_compartimento?: string | null; unidad_vida?: string | null
  carga_id?: number | null; producto_actual?: string | null
  vida_actual?: number | null; vida_recomendada?: number | null
  severidad_ultima?: string | null; fecha_ultima_muestra?: string | null
}

export interface Carga {
  id: number; compartimento_id: number; producto_id?: number | null
  producto?: string | null
  fecha_llenado: string; medidor_inicio?: number | null
  volumen_litros?: number | null
  costo_aceite?: number | null; costo_filtro?: number | null
  costo_mano_obra?: number | null
  estado: string
  fecha_drenaje?: string | null; medidor_fin?: number | null
  motivo_drenaje_id?: number | null; motivo?: string | null
  vida_lograda?: number | null
  litros_repuestos?: number | null
  costo_total?: number | null; costo_por_unidad_vida?: number | null
  observaciones?: string | null; registrado_por?: string | null
}

export interface Relleno {
  id: number; carga_id: number; fecha: string; litros: number
  medidor?: number | null; costo?: number | null; motivo?: string | null
  registrado_por?: string | null
}

export interface ResultadoMuestra {
  id: number; parametro_id: number; codigo: string; nombre: string
  unidad?: string | null; grupo: string; origen_probable?: string | null
  valor?: number | null; valor_texto?: string | null
  /** NORMAL | MARGINAL | CRITICO */
  estado: string
  /** Variación por cada 100 unidades de vida. La señal temprana. */
  tasa_cambio?: number | null
  /** ABSOLUTO | ESTADISTICO | TASA_CAMBIO — qué criterio disparó la alarma. */
  disparo_por?: string | null
}

export interface Muestra {
  id: number; numero: string; compartimento_id: number
  carga_id?: number | null
  fecha_toma: string; fecha_resultado?: string | null
  medidor_equipo?: number | null; horas_aceite?: number | null
  laboratorio_id?: number | null; metodo_id?: number | null
  /** NORMAL | MARGINAL | CRITICO | ACCION_INMEDIATA | PENDIENTE */
  severidad: string
  severidad_manual: boolean; estado: string
  observaciones?: string | null; registrado_por?: string | null
  activo_codigo?: string | null; compartimento?: string | null
  resultados?: ResultadoMuestra[]
}

export interface Diagnostico {
  id: number; muestra_id: number; modo_falla_id?: number | null
  severidad: string; conclusion?: string | null; recomendacion?: string | null
  orden_trabajo_id?: number | null; causa_raiz_id?: number | null
  /** PENDIENTE | CONFIRMADO | DESMENTIDO */
  verificacion: string
  hallazgo?: string | null; analista?: string | null; automatico: boolean
}

export interface FilaAnalitica {
  etiqueta: string; cantidad: number; criticas?: number
  categoria?: string; evitable?: boolean; vida_promedio?: number | null
  grupo?: string; origen?: string | null
  unidad?: string; cargas?: number; costo_total?: number
  vida_total?: number; costo_por_unidad?: number | null
}

export interface Analitica {
  total_muestras: number
  por_severidad: Record<string, number>
  criticas: number
  drenajes: FilaAnalitica[]
  costos: FilaAnalitica[]
  parametros: FilaAnalitica[]
  por_marca: FilaAnalitica[]
  por_linea: FilaAnalitica[]
  diagnostico: {
    confirmados: number; desmentidos: number; pendientes: number
    acierto_pct: number | null
  }
  compartimentos: number
  sin_puerto_muestreo: number
}

export interface Pendiente {
  compartimento_id: number; activo: string; compartimento: string
  tipo: string; unidad: string; carga_id: number
  vida_actual?: number | null; frecuencia_muestreo?: number | null
  ultima_muestra?: string | null; critico: boolean; motivo: string
}

const R = '/eam/lube'

/** CRUD genérico: los diez catálogos se comportan igual salvo la ruta. */
function catalogo<T>(ruta: string) {
  return {
    listar: (params?: Record<string, any>) =>
      api.get<T[]>(`${R}/${ruta}`, { params }).then(r => r.data),
    crear: (datos: Partial<T>) =>
      api.post<T>(`${R}/${ruta}`, datos).then(r => r.data),
    editar: (id: number, datos: Partial<T>) =>
      api.put<T>(`${R}/${ruta}/${id}`, datos).then(r => r.data),
    borrar: (id: number) => api.delete(`${R}/${ruta}/${id}`).then(r => r.data),
  }
}

export const lubeApi = {
  marcas: catalogo<Marca>('marcas'),
  tipos: catalogo<TipoCompartimento>('tipos-compartimento'),
  productos: catalogo<Producto>('productos'),
  aplicaciones: catalogo<Aplicacion>('aplicaciones'),
  parametros: catalogo<Parametro>('parametros'),
  limites: catalogo<Limite>('limites'),
  laboratorios: catalogo<Laboratorio>('laboratorios'),
  metodos: catalogo<MetodoMuestreo>('metodos-muestreo'),
  motivos: catalogo<MotivoDrenaje>('motivos-drenaje'),
  modosFalla: catalogo<ModoFalla>('modos-falla'),
  compartimentos: catalogo<Compartimento>('compartimentos'),

  cargas: {
    listar: (params?: Record<string, any>) =>
      api.get<Carga[]>(`${R}/cargas`, { params }).then(r => r.data),
    abrir: (datos: any) => api.post<Carga>(`${R}/cargas`, datos).then(r => r.data),
    drenar: (id: number, datos: any) =>
      api.post<Carga>(`${R}/cargas/${id}/drenar`, datos).then(r => r.data),
  },

  rellenos: {
    listar: (carga_id: number) =>
      api.get<Relleno[]>(`${R}/rellenos`, { params: { carga_id } }).then(r => r.data),
    crear: (datos: any) => api.post<Relleno>(`${R}/rellenos`, datos).then(r => r.data),
  },

  muestras: {
    listar: (params?: Record<string, any>) =>
      api.get<Muestra[]>(`${R}/muestras`, { params }).then(r => r.data),
    obtener: (id: number) => api.get<Muestra>(`${R}/muestras/${id}`).then(r => r.data),
    crear: (datos: any) => api.post<any>(`${R}/muestras`, datos).then(r => r.data),
    reevaluar: (id: number) =>
      api.post<any>(`${R}/muestras/${id}/reevaluar`).then(r => r.data),
    fijarSeveridad: (id: number, severidad: string, nota?: string) =>
      api.put<any>(`${R}/muestras/${id}/severidad`, { severidad, nota }).then(r => r.data),
    tendencia: (id: number) =>
      api.get<any>(`${R}/muestras/${id}/tendencia`).then(r => r.data),
  },

  diagnosticos: {
    listar: (params?: Record<string, any>) =>
      api.get<Diagnostico[]>(`${R}/diagnosticos`, { params }).then(r => r.data),
    crear: (datos: any) => api.post<Diagnostico>(`${R}/diagnosticos`, datos).then(r => r.data),
    verificar: (id: number, verificacion: string, hallazgo?: string) =>
      api.put<Diagnostico>(`${R}/diagnosticos/${id}/verificar`,
        { verificacion, hallazgo }).then(r => r.data),
  },

  analitica: (params?: Record<string, any>) =>
    api.get<Analitica>(`${R}/analitica`, { params }).then(r => r.data),
  pendientes: () => api.get<Pendiente[]>(`${R}/pendientes`).then(r => r.data),

  /** El lector de boletines que ya existía, para precargar una muestra. */
  leerBoletin: (archivo: File) => {
    const fd = new FormData()
    fd.append('file', archivo)
    return api.post<any>('/lubricacion/ocr', fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}

/** Colores de severidad, en un solo sitio para que no se desincronicen. */
export const COLOR_SEVERIDAD: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  NORMAL: 'success',
  MARGINAL: 'warning',
  CRITICO: 'error',
  ACCION_INMEDIATA: 'error',
  PENDIENTE: 'default',
}

export const ETIQUETA_SEVERIDAD: Record<string, string> = {
  NORMAL: 'Normal',
  MARGINAL: 'Marginal',
  CRITICO: 'Crítico',
  ACCION_INMEDIATA: 'Acción inmediata',
  PENDIENTE: 'Sin resultado',
}

export const ETIQUETA_DISPARO: Record<string, string> = {
  ABSOLUTO: 'supera el límite',
  TASA_CAMBIO: 'sube demasiado rápido',
  ESTADISTICO: 'se sale de la flota',
}
