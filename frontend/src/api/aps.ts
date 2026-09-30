/**
 * APS — cliente del motor de planeación (`backend/app/api/v1/endpoints/aps.py`).
 *
 * Las catorce pantallas eran maqueta y el servidor era un cascarón. Ahora se
 * guarda lo que una persona decide o registra (maestros, demanda real,
 * pronósticos publicados, ajustes, órdenes aprobadas, escenarios, ciclos S&OP)
 * y el resto lo calcula el motor en cada consulta.
 */
import { apiClient } from './client'

const get = <T,>(url: string, params?: object) => apiClient.get<T>(url, { params }).then(r => r.data)

export interface Nombres {
  productos: Record<string, { codigo: string; nombre: string; familia?: string | null }>
  ubicaciones: Record<string, { codigo: string; nombre: string }>
  recursos: Record<string, { codigo: string; nombre: string }>
}

export interface Ubicacion { id: number; codigo: string; nombre: string; tipo: string; ciudad?: string | null; pais?: string | null; abastecida_por_id?: number | null }
export interface Producto { id: number; codigo: string; nombre: string; familia?: string | null; categoria?: string | null; unidad_medida: string; lead_time_dias: number; costo_unitario?: number | null; precio_venta?: number | null; peso_kg?: number | null }
export interface Recurso { id: number; codigo: string; nombre: string; tipo: string; ubicacion_id?: number | null; capacidad_diaria?: number | null; unidad_capacidad?: string | null; eficiencia_pct: number }
export interface Ruta { id: number; producto_id: number; recurso_id: number; horas_por_unidad: number }
export interface Parametro { id: number; producto_id: number; ubicacion_id: number; stock_actual: number; nivel_servicio_pct: number; lote_minimo_compra?: number | null; lote_produccion?: number | null; lead_time_compra_dias?: number | null; lead_time_produccion_dias?: number | null }
export interface Restriccion { id: number; ubicacion_id?: number | null; recurso_id?: number | null; tipo: string; ambito: string; nombre: string; descripcion?: string | null; valor_min?: number | null; valor_max?: number | null }
export interface ConfigAPS { clave: string; valor: number; defecto: number; min: number; max: number; descripcion: string }

export interface Comparacion { metodo: string; nombre: string; mae: number; rmse: number; wape: number | null; sesgo: number | null }
export interface Estadistico {
  metodo: string | null; nombre?: string; suficiente: boolean; meses: number; meses_validacion?: number
  clase: { tipo: string; adi: number | null; cv2: number | null }
  pronostico: number[]; inferior?: number[]; superior?: number[]
  rmse?: number; mae?: number; wape?: number | null; sesgo?: number | null; fva_pct?: number | null
  comparacion: Comparacion[]
}
export interface SerieResumen { producto_id: number; ubicacion_id: number; metodo: string | null; nombre_metodo?: string; meses: number; suficiente: boolean; wape: number | null; sesgo: number | null; fva_pct: number | null; clase: string; proximo: number | null; usa_consenso: boolean }
export interface Publicado {
  id: number; version: string; fecha: string | null
  detalles: { periodo: string; estadistico: number; inferior: number | null; superior: number | null; ajuste_aprobado: number; consenso: number }[]
  ajustes: { id: number; periodo: string; area: string; usuario: string; cantidad_ajuste: number; justificacion: string | null; aprobado: boolean }[]
}
export interface FilaPlan { periodo: string; demanda: number; programadas: number; planificadas: number; stock_final: number; stock_seguridad: number; bajo_seguridad: boolean; traslados?: number }
export interface SeriePlan { producto_id: number; ubicacion_id: number; tipo?: string; origen_id?: number; lote?: number | null; lead_time_dias?: number; filas: FilaPlan[] }
export interface OrdenPlan { producto_id: number; ubicacion_id: number; origen_id?: number; tipo: string; cantidad: number; periodo_recepcion: string; periodo_lanzamiento: string; periodo_envio?: string; atrasada: boolean; meses_atraso: number; costo: number }
export interface Kpis {
  series: number; series_con_historia_suficiente: number; exactitud_validacion_pct: number | null
  exactitud_publicada_pct: number | null; sesgo_publicado_pct: number | null; periodos_publicados_evaluados: number
  valor_inventario: number; cobertura_dias: number | null; rotacion_proyectada: number | null
  uso_capacidad_promedio_pct: number | null; uso_capacidad_maximo_pct: number | null; recursos_sobrecargados: number
  ordenes_sugeridas: number; ordenes_atrasadas: number; costo_ordenes: number; unidades_produccion: number
  unidades_compra: number; inventario_proyectado_promedio: number; alertas_criticas: number; alertas: number
}
export interface Alerta { tipo: string; nivel: 'CRITICA' | 'ADVERTENCIA' | 'INFO'; titulo: string; detalle: string; producto_id?: number; ubicacion_id?: number; recurso_id?: number }
export interface CargaRecurso { recurso_id: number; periodo: string; carga_horas: number; capacidad_horas: number; uso_pct: number | null; sobrecarga: boolean; sin_capacidad: boolean }
export interface Inventario {
  producto_id: number; ubicacion_id: number; lead_time_dias: number; nivel_servicio_pct: number; demanda_mensual: number
  error_pronostico: number; stock_seguridad: number; punto_reorden: number; eoq: number | null; stock_maximo: number
  stock_actual: number; valor_stock: number; cobertura_dias: number | null; valor_anual: number; cv: number | null
  abc: 'A' | 'B' | 'C'; xyz: 'X' | 'Y' | 'Z' | null
}
export interface Carga { origen_id: number; destino_id: number; periodo: string; kg: number; unidades: number; capacidad_camion_kg: number; camiones: number | null; ocupacion_pct: number | null; productos_sin_peso: string[]; lineas: { producto_id: number; cantidad: number }[] }
export interface OrdenGuardada { id: number; producto_id: number; ubicacion_id: number; tipo: string; cantidad: number; estado: string; costo_estimado: number | null; justificacion: string | null; periodo: string }
export interface Escenario { id: number; nombre: string; tipo: string; descripcion: string | null; supuesto_demanda_delta_pct: number; supuesto_capacidad_delta_pct: number; supuesto_costo_delta_pct: number; estado: string; creado_por: string | null }
export interface ResultadoSim { clave?: string; metrica: string; base?: number | null; escenario?: number | null; valor_base?: number | null; valor_escenario?: number | null; delta: number | null; delta_pct: number | null }
export interface Ciclo { id: number; nombre: string; periodo: string; facilitador: string | null; acuerdos: string | null; estado: string; fecha_inicio: string | null; fecha_cierre: string | null }
export interface Revision { id: number; ciclo_id: number; tipo: string; asistentes: string | null; compromisos: string | null; estado: string; fecha: string | null }

const crud = <T extends { id: number }>(ruta: string) => ({
  listar: () => get<T[]>(`/aps/${ruta}`),
  crear: (d: Partial<T>) => apiClient.post<T>(`/aps/${ruta}`, d).then(r => r.data),
  editar: (id: number, d: Partial<T>) => apiClient.put<T>(`/aps/${ruta}/${id}`, d).then(r => r.data),
  retirar: (id: number) => apiClient.delete(`/aps/${ruta}/${id}`),
})

export const apsApi = {
  ubicaciones: crud<Ubicacion>('ubicaciones'),
  productos: crud<Producto>('productos'),
  recursos: crud<Recurso>('recursos'),
  rutas: crud<Ruta>('rutas'),
  parametros: crud<Parametro>('parametros'),
  restricciones: crud<Restriccion>('restricciones'),
  escenarios: crud<Escenario>('escenarios'),

  config: () => get<ConfigAPS[]>('/aps/config'),
  guardarConfig: (d: Record<string, number>) => apiClient.put<ConfigAPS[]>('/aps/config', d).then(r => r.data),

  demanda: (f?: { producto_id?: number; ubicacion_id?: number }) => get<{ id: number; producto_id: number; ubicacion_id: number; periodo: string; cantidad: number }[]>('/aps/demanda', f),
  registrarDemanda: (d: { producto_id: number; ubicacion_id: number; periodo: string; cantidad: number }) => apiClient.post('/aps/demanda', d),
  borrarDemanda: (id: number) => apiClient.delete(`/aps/demanda/${id}`),
  cargarDemanda: (texto: string) => apiClient.post<{ guardadas: number; errores: string[]; total_errores?: number }>('/aps/demanda/carga', { texto }).then(r => r.data),

  pronostico: () => get<{ periodos: string[]; series: SerieResumen[] } & Nombres>('/aps/pronostico'),
  serie: (producto_id: number, ubicacion_id: number) => get<{ periodos: string[]; historia: Record<string, number>; estadistico: Estadistico; demanda_plan: number[]; publicado: Publicado | null }>('/aps/pronostico/serie', { producto_id, ubicacion_id }),
  publicar: (producto_id: number, ubicacion_id: number) => apiClient.post<{ id: number; version: string }>('/aps/pronostico/publicar', { producto_id, ubicacion_id }).then(r => r.data),
  proponerAjuste: (d: { pronostico_id: number; periodo: string; area: string; cantidad_ajuste: number; justificacion: string }) => apiClient.post('/aps/pronostico/ajustes', d),
  aprobarAjuste: (id: number) => apiClient.patch(`/aps/pronostico/ajustes/${id}/aprobar`),
  retirarAjuste: (id: number) => apiClient.delete(`/aps/pronostico/ajustes/${id}`),
  exactitud: () => get<{ por_mes: { clave: string; exactitud_pct: number | null; sesgo_pct: number | null; real: number }[]; por_familia: { clave: string; exactitud_pct: number | null; sesgo_pct: number | null; real: number }[]; validacion_por_familia: { familia: string; exactitud_pct: number | null }[]; kpis: Kpis }>('/aps/pronostico/exactitud'),

  plan: () => get<{ periodos: string[]; mps: SeriePlan[]; ordenes: OrdenPlan[]; traslados: OrdenPlan[]; kpis: Kpis } & Nombres>('/aps/plan'),
  aprobarOrden: (o: OrdenPlan) => apiClient.post('/aps/ordenes', { producto_id: o.producto_id, ubicacion_id: o.ubicacion_id, tipo: o.tipo, cantidad: o.cantidad, periodo_recepcion: o.periodo_recepcion, costo: o.costo, justificacion: o.atrasada ? `Atrasada ${o.meses_atraso} mes(es)` : null }),
  ordenes: (estado?: string) => get<OrdenGuardada[]>('/aps/ordenes', estado ? { estado } : undefined),
  recibirOrden: (id: number) => apiClient.patch(`/aps/ordenes/${id}/recibir`),
  cancelarOrden: (id: number) => apiClient.patch(`/aps/ordenes/${id}/cancelar`),
  guardarVersion: (nombre: string, observaciones?: string) => apiClient.post('/aps/planes', { nombre, observaciones }),
  versiones: () => get<{ id: number; nombre: string; estado: string; creado_por: string | null; observaciones: string | null; fecha: string | null; desde: string; hasta: string; lineas: number; costo: number }[]>('/aps/planes'),

  capacidad: () => get<{ periodos: string[]; capacidad: CargaRecurso[]; resumen: { recurso_id: number; uso_maximo_pct: number | null; uso_promedio_pct: number | null; meses_sobrecarga: number; carga_total_horas: number }[]; cuello: { recurso_id: number; uso_maximo_pct: number | null } | null } & Nombres>('/aps/capacidad'),
  inventario: () => get<{ inventario: Inventario[]; matriz: Record<string, number>; kpis: Kpis } & Nombres>('/aps/inventario'),
  distribucion: () => get<{ periodos: string[]; red: { id: number; nombre: string; codigo: string; tipo?: string; abastecida_por_id?: number | null }[]; drp: SeriePlan[]; traslados: OrdenPlan[] } & Nombres>('/aps/distribucion'),
  transporte: () => get<{ periodos: string[]; cargas: Carga[] } & Nombres>('/aps/transporte'),
  alertas: () => get<{ alertas: Alerta[] } & Nombres>('/aps/alertas'),
  kpis: () => get<{ kpis: Kpis; config: Record<string, number>; inicio: string }>('/aps/kpis'),
  tablero: () => get<{ kpis: Kpis; alertas: Alerta[]; maestros: { productos: number; ubicaciones: number; recursos: number; series_demanda: number }; periodos: string[]; capacidad: CargaRecurso[] } & Nombres>('/aps/tablero'),

  simular: (id: number) => apiClient.post<{ simulacion_id: number; resultados: ResultadoSim[]; alertas_escenario: Alerta[] }>(`/aps/escenarios/${id}/simular`).then(r => r.data),
  resultados: (id: number) => get<{ simulacion: { id: number; nombre: string; duracion_seg: number; fecha: string | null } | null; resultados: ResultadoSim[] }>(`/aps/escenarios/${id}/resultados`),

  ciclos: () => get<Ciclo[]>('/aps/soip/ciclos'),
  crearCiclo: (d: Partial<Ciclo>) => apiClient.post('/aps/soip/ciclos', d),
  editarCiclo: (id: number, d: Partial<Ciclo>) => apiClient.put(`/aps/soip/ciclos/${id}`, d),
  cerrarCiclo: (id: number) => apiClient.patch(`/aps/soip/ciclos/${id}/cerrar`),
  revisiones: (ciclo_id: number) => get<Revision[]>('/aps/soip/revisiones', { ciclo_id }),
  crearRevision: (d: Partial<Revision>) => apiClient.post('/aps/soip/revisiones', d),
  borrarRevision: (id: number) => apiClient.delete(`/aps/soip/revisiones/${id}`),
  resumenSoip: (periodo: string) => get<{ periodo: string; en_horizonte: boolean; periodos?: string[]; familias?: { familia: string; demanda: number; produccion: number; compras: number; stock_final: number; valor_stock: number }[]; capacidad?: CargaRecurso[]; alertas?: Alerta[] } & Partial<Nombres>>('/aps/soip/resumen', { periodo }),

  analitica: () => get<{ series: { producto_id: number; ubicacion_id: number; clase: { tipo: string; adi: number | null; cv2: number | null }; metodo: string | null; wape: number | null; sesgo: number | null; fva_pct: number | null; comparacion: Comparacion[]; meses: number; suficiente: boolean }[]; clases: Record<string, number>; atipicos: { producto_id: number; ubicacion_id: number; periodo: string; cantidad: number; mediana: number; z: number }[]; kpis: Kpis } & Nombres>('/aps/analitica'),
}

// ─── Utilidades de presentación ───────────────────────────────────────────────

export const n0 = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 0 })
export const n1 = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
export const pesos = (v?: number | null) => v == null ? '—' : `$${Math.round(v).toLocaleString('es-CO')}`
export const pct = (v?: number | null) => v == null ? '—' : `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`
export const nombreP = (n: Partial<Nombres> | undefined, id?: number) => (id != null && n?.productos?.[id]) ? `${n.productos[id].codigo} · ${n.productos[id].nombre}` : `#${id}`
export const nombreU = (n: Partial<Nombres> | undefined, id?: number | null) => (id != null && n?.ubicaciones?.[id]) ? n.ubicaciones[id].nombre : '—'
export const nombreR = (n: Partial<Nombres> | undefined, id?: number) => (id != null && n?.recursos?.[id]) ? n.recursos[id].nombre : `#${id}`
export const mesCorto = (p: string) => {
  const m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(p.slice(5, 7)) - 1]
  return `${m} ${p.slice(2, 4)}`
}
export const CLASE_DEMANDA: Record<string, [string, string]> = {
  SUAVE: ['Suave', '#16A34A'], ERRATICA: ['Errática', '#D97706'], INTERMITENTE: ['Intermitente', '#2563EB'],
  IRREGULAR: ['Irregular', '#DC2626'], SIN_DATOS: ['Sin datos', '#94A3B8'],
}
export const NIVEL_ALERTA: Record<string, string> = { CRITICA: '#DC2626', ADVERTENCIA: '#D97706', INFO: '#2563EB' }
export const TIPO_ORDEN: Record<string, string> = { PRODUCCION: 'Producción', COMPRA: 'Compra', TRASLADO: 'Traslado', REPOSICION: 'Reposición' }
