/**
 * La interpretación de las muestras de aceite, contra el servidor.
 *
 * Separado de `api/lube.ts` —que cubre la operación: cargas, muestras,
 * resultados— porque responde otra pregunta. Aquello registra; esto lee.
 *
 * Todo lo de acá acepta el mismo filtro de flota. Va en un solo objeto y no en
 * siete argumentos sueltos porque son siete, se pasan a nueve consultas, y
 * añadir el octavo de otra forma obligaría a tocar los nueve sitios.
 */
import { apiClient } from './client'

const B = '/eam/lube/interpretacion'

/* ═══════════════════════════════════════════════════════════════════════════
   El filtro
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FiltroFlota {
  marca?: string | null
  linea?: string | null
  modelo?: string | null
  tipo?: string | null
  /** El motor va como «marca · línea» en un solo valor. */
  motor?: string | null
  placa?: string | null
  /** Código del tipo de compartimento: MOT, HID, TRA… */
  compartimento?: string | null
}

export interface OpcionFiltro {
  valor: string
  etiqueta: string
  /** De qué depende: la línea sabe su marca, el modelo sabe su línea. */
  padre?: string | null
  muestras: number
  detalle?: string
  placa?: string | null
  marca?: string | null
  linea?: string | null
  modelo?: string | null
}

export interface OpcionesFiltro {
  tipos: OpcionFiltro[]
  marcas: OpcionFiltro[]
  lineas: OpcionFiltro[]
  modelos: OpcionFiltro[]
  motores: OpcionFiltro[]
  compartimentos: OpcionFiltro[]
  placas: OpcionFiltro[]
}

/** Los criterios vacíos se omiten: `?marca=` filtraría por marca vacía. */
const conFiltro = (f?: FiltroFlota, extra?: Record<string, unknown>) => {
  const p: Record<string, unknown> = { ...extra }
  if (f) for (const [k, v] of Object.entries(f)) if (v) p[k] = v
  return p
}

/* ═══════════════════════════════════════════════════════════════════════════
   Cobertura
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Cobertura {
  anio: number
  filtro?: FiltroFlota
  compartimentos_analizables: number
  con_muestra_en_el_anio: number
  cobertura_pct: number
  sin_muestra_en_el_anio: FilaSinMuestra[]
  sin_historico: FilaSinMuestra[]
}

export interface FilaSinMuestra {
  compartimento_id: number; compartimento: string; tipo: string
  placa: string; activo: string; familia_motor: string
  marca?: string | null; ultima_muestra?: string | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   El tablero de conclusiones
   ═══════════════════════════════════════════════════════════════════════════ */

/** El límite contra el que se juzgó un parámetro, con su procedencia. */
export interface LimiteAplicado {
  precaucion?: number | null
  condena?: number | null
  direccion?: string | null
  /** La norma del ENSAYO: ASTM D5185, D6304… Dice cómo se midió. */
  metodo?: string | null
  /** De dónde sale el UMBRAL. No es lo mismo, y por eso van separados. */
  criterio?: string | null
  /** NORMA | REFERENCIA | FLOTA | OEM | TENDENCIA */
  naturaleza?: string | null
  porque?: string | null
  /** Cuántas mediciones sostienen un límite estadístico. */
  n?: number | null
}

export interface Tendencia {
  variacion?: number | null
  estado: string
  lectura: string
}

export interface DetalleParametro {
  codigo: string; nombre: string; sigla: string
  valor?: number | null; texto?: string | null; unidad?: string | null
  /** PRECAUCION | CONDENA | TENDENCIA */
  estado: string
  limite?: LimiteAplicado | null
  tendencia?: Tendencia | null
  origen_probable?: string | null
  /** Lo que había dictaminado el evaluador con los límites configurados. */
  estado_sistema?: string | null
}

export interface DesvioViscosidad {
  medido: number; referencia: number; grado?: string | null
  desvio_pct: number; direccion: string; estado?: string | null
  metodo: string; criterio: string; naturaleza: string
}

export interface FilaTablero {
  muestra_id: number; numero: string
  familia_motor: string; placa: string; activo: string; compartimento: string
  compartimento_id: number; tipo_compartimento?: string | null
  marca?: string | null; linea?: string | null; modelo?: string | null
  motor?: string | null
  km?: number | null; horas_aceite?: number | null
  /** HORAS | KM | DIAS — en qué se mide la vida de esta carga. */
  unidad_vida?: string | null
  fecha_toma: string
  /** La notación de taller: «Fe-Al-Cu-Si-Na». */
  tipo: string
  patron: string; regla: string; lectura: string
  /** De dónde sale el criterio que produjo esta conclusión. */
  criterio: string
  fuentes: string[]
  accion_sugerida: string; accion_de_persona: boolean
  estado: 'NORMAL' | 'ALERTA' | 'CRITICO'
  severidad_norma: string
  /** Lo que la regla declara para su modo de falla, que puede ser peor que
   *  lo alcanzado por esta muestra. */
  severidad_del_modo: string
  urgencia: number
  severidad_sistema?: string | null
  /** El criterio de norma y el del sistema no coinciden en esta muestra. */
  discrepa: boolean
  cruce_tbn_tan: boolean
  relacion_si_al?: number | null
  desvio_viscosidad?: DesvioViscosidad | null
  detalle: DetalleParametro[]
}

export interface Fuente { titulo: string; define: string }

export interface Tablero {
  desde: string
  filtro?: FiltroFlota
  filas: FilaTablero[]
  resumen: Record<string, number>
  /** Por familia de compartimento: `{MOT: {fe: …}}`. */
  limites_flota: Record<string, Record<string, LimiteAplicado>>
  fuentes: Record<string, Fuente>
}

/* ═══════════════════════════════════════════════════════════════════════════
   Seguimiento por placa
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PuntoSerie {
  fecha: string; numero: string; valor: number
  estado: string; horas_aceite?: number | null; km?: number | null
}

export interface SerieParametro {
  codigo: string; nombre: string; sigla: string
  unidad?: string | null; grupo?: string | null
  origen_probable?: string | null
  puntos: PuntoSerie[]
}

export interface CambioEntreMuestras {
  codigo: string; nombre: string; sigla: string
  unidad?: string | null; grupo?: string | null; origen_probable?: string | null
  penultima: number; ultima: number
  delta: number; variacion_pct: number
  estado: string; tasa_cambio?: number | null
}

export interface AnalisisPlaca {
  compartimento_id: number; compartimento: string
  placa?: string | null; activo?: string | null; familia_motor?: string | null
  muestras: { id: number; numero: string; fecha: string
              severidad?: string | null; horas_aceite?: number | null }[]
  series: SerieParametro[]
  cambios: CambioEntreMuestras[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   Correlación
   ═══════════════════════════════════════════════════════════════════════════ */

export interface MedidaEslabon {
  causa: string; efecto: string
  r: number | null; n: number
  /** POSITIVO | NEGATIVO — el signo que predice el mecanismo. */
  esperado: string
  /** Si el signo salió como debía. `null` = no se pudo calcular. */
  concuerda: boolean | null
}

export interface EslabonMedido {
  causa: string[]; efecto?: string[]; efecto_inverso?: string[]
  porque: string; accion: string; fuentes?: string[]
  medidas: MedidaEslabon[]
  /** Media de las correlaciones ORIENTADAS por el signo esperado. */
  correlacion_media: number | null
  /** La misma media sin orientar, para que se vea el número crudo. */
  correlacion_cruda: number | null
  se_confirma: boolean
  /** El signo salió al revés del que predice el mecanismo. */
  contradice: boolean
}

export interface Correlacion {
  familia?: string | null
  filtro?: FiltroFlota
  muestras: number
  suficiente: boolean
  motivo?: string
  metodo?: string
  umbral_confirmacion?: number
  parametros: { codigo: string; nombre: string; sigla: string
                grupo?: string; unidad?: string | null }[]
  /** Cuadrada, en el mismo orden que `parametros`. `null` = no se pudo. */
  matriz: (number | null)[][]
  conteos: number[][]
  cadena: EslabonMedido[]
  fuentes?: Record<string, Fuente>
}

/** La correlación de UN parámetro contra todos los demás. */
export interface CorrelacionDe {
  codigo: string; nombre: string
  unidad?: string | null; grupo?: string | null
  origen_probable?: string | null
  filtro?: FiltroFlota
  muestras: number
  metodo: string
  nota: string
  contra: {
    codigo: string; nombre: string; grupo?: string | null
    unidad?: string | null; origen_probable?: string | null
    r: number | null; n: number
  }[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   El tablero del programa
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ParametroDisparo {
  codigo: string; etiqueta: string
  grupo?: string | null; unidad?: string | null; origen?: string | null
  cantidad: number; criticas: number; equipos: number
}

export interface Programa {
  filtro: FiltroFlota
  dias: number
  total_muestras: number
  por_severidad: Record<string, number>
  criticas: number
  parametros: ParametroDisparo[]
  drenajes: { etiqueta: string; categoria: string; evitable: boolean
              cantidad: number; vida_promedio?: number | null }[]
  costos: { etiqueta: string; unidad?: string | null; cargas: number
            costo_total: number; vida_total: number
            costo_por_unidad?: number | null }[]
  por_marca: { etiqueta: string; cantidad: number; criticas: number }[]
  por_linea: { etiqueta: string; cantidad: number; criticas: number }[]
  diagnostico: { confirmados: number; desmentidos: number
                 pendientes: number; acierto_pct?: number | null }
  compartimentos: number
  sin_puerto_muestreo: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   Dashboard contra kilometraje
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Regresion {
  n: number
  pendiente: number
  /** La pendiente por cada 1.000 km, que es como se lee. */
  por_mil: number
  /** La misma pendiente por cada 10.000 km, para series de flota. */
  por_diez_mil: number
  intercepto: number
  r: number | null
  r2: number | null
  x_min: number; x_max: number
}

export interface PuntoEvolucion {
  km: number; fecha: string; numero: string
  compartimento: string; tipo_compartimento?: string | null
  severidad?: string | null; horas_aceite?: number | null
  hallazgos: number; criticos: number
  muestra_id: number; compartimento_id: number
}

export interface PlacaEvolucion {
  placa: string; activo: string
  marca?: string | null; linea?: string | null; modelo?: string | null
  motor?: string | null
  puntos: PuntoEvolucion[]
  muestras: number
  km_min?: number | null; km_max?: number | null
  tendencia: Regresion | null
}

export interface Evolucion {
  filtro: FiltroFlota
  placas: PlacaEvolucion[]
  muestras: number
  /** Muestras descartadas por no tener lectura de odómetro. */
  sin_medidor: number
  resumen: Record<string, number>
}

export interface ParametroDispersion {
  codigo: string; nombre: string; unidad?: string | null
  grupo?: string | null; origen_probable?: string | null
  bidireccional: boolean; es_desgaste: boolean
  puntos: { km: number; valor: number; estado: string
            placa?: string | null; muestra_id: number }[]
  fuera_de_rango: number
  regresion: Regresion | null
  minimo: number; maximo: number; promedio: number
}

export interface Dispersion {
  filtro: FiltroFlota
  parametros: ParametroDispersion[]
  muestras: number
  sin_medidor: number
  motivo?: string
  nota?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   Extensión del intervalo
   ═══════════════════════════════════════════════════════════════════════════ */

export interface CompartimentoLube {
  compartimento_id: number; compartimento: string; tipo: string
  placa: string; activo: string; familia_motor: string
  muestras: number
  ultima_muestra?: string | null
  severidad_ultima?: string | null
}

export interface FamiliaExtension {
  familia: string; muestras: number; equipos: number
  tbn_promedio?: number | null; tbn_cuartil_bajo?: number | null
  viscosidad_promedio?: number | null; vida_promedio?: number | null
  impedimentos: { impedimento: string; muestras: number; pct: number; porque: string }[]
  puede_evaluarse: boolean
  motivo: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   Los límites vigentes y su fuente
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LimiteNorma extends LimiteAplicado {
  accion?: string | null
  /** Nombre y unidad del catálogo: la tabla de criterios los necesita para
   *  poder contrastarse con un boletín de laboratorio. */
  nombre?: string
  unidad?: string | null
  grupo?: string | null
}

export interface Normas {
  filtro: FiltroFlota
  fuentes: Record<string, Fuente>
  naturaleza: Record<string, string>
  limites_motor: Record<string, LimiteNorma>
  limites_hidraulico: Record<string, LimiteNorma>
  /** Los límites estadísticos separados por familia de compartimento. */
  por_familia: {
    tipo: string; nombre: string; muestras: number
    estadisticos: Record<string, LimiteNorma & { mediana?: number }>
    insuficientes: { codigo: string; n: number; faltan: number }[]
  }[]
  minimo_poblacion: number
  percentiles: { precaucion: number; condena: number }
  banda_sae: Record<string, [number, number]>
  desvio_viscosidad: { precaucion: number; condena: number }
  reglas: {
    codigo: string; nombre: string; severidad: string; urgencia: number
    fuentes: string[]; criterio: string; lectura: string; accion: string
  }[]
  advertencia: string
}

/* ═══════════════════════════════════════════════════════════════════════════ */

const get = <T,>(ruta: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(B + ruta, { params }).then(r => r.data)

export const interpretacionApi = {
  filtros: () => get<OpcionesFiltro>('/filtros'),
  cobertura: (anio?: number, f?: FiltroFlota) =>
    get<Cobertura>('/cobertura', conFiltro(f, { anio })),
  compartimentos: (f?: FiltroFlota) =>
    get<CompartimentoLube[]>('/compartimentos', conFiltro(f)),
  tablero: (dias = 180, soloConHallazgo = true, f?: FiltroFlota) =>
    get<Tablero>('/tablero', conFiltro(f, { dias, solo_con_hallazgo: soloConHallazgo })),
  placa: (compartimentoId: number, muestras = 8) =>
    get<AnalisisPlaca>(`/placa/${compartimentoId}`, { muestras }),
  correlacion: (f?: FiltroFlota, dias = 1460) =>
    get<Correlacion>('/correlacion', conFiltro(f, { dias })),
  correlacionDe: (codigo: string, f?: FiltroFlota, dias = 1460) =>
    get<CorrelacionDe>(`/correlacion-de/${codigo}`, conFiltro(f, { dias })),
  programa: (dias = 365, f?: FiltroFlota) =>
    get<Programa>('/programa', conFiltro(f, { dias })),
  evolucion: (f?: FiltroFlota, dias = 1460) =>
    get<Evolucion>('/evolucion', conFiltro(f, { dias })),
  dispersion: (f?: FiltroFlota, dias = 1460) =>
    get<Dispersion>('/dispersion', conFiltro(f, { dias })),
  extension: (f?: FiltroFlota, dias = 1460) =>
    get<{ familias: FamiliaExtension[]; muestras: number }>(
      '/extension', conFiltro(f, { dias })),
  normas: (f?: FiltroFlota) => get<Normas>('/normas', conFiltro(f)),
  cadena: () => get<{ eslabones: EslabonMedido[]; reglas: Normas['reglas']
                      fuentes: Record<string, Fuente>; nota: string }>(
    '/cadena-causal'),
}

/* ═══════════════════════════════════════════════════════════════════════════
   Colores
   ═══════════════════════════════════════════════════════════════════════════ */

/** El color con que se pinta un estado en todo el informe. */
export const COLOR_ESTADO: Record<string, string> = {
  NORMAL: '#059669', ALERTA: '#F59E0B', CRITICO: '#EF4444',
  MARGINAL: '#F59E0B', ACCION_INMEDIATA: '#B91C1C',
  PRECAUCION: '#F59E0B', CONDENA: '#EF4444', TENDENCIA: '#6366F1',
}

/** El color de cada grupo de parámetros, para leer un boletín de un vistazo. */
export const COLOR_GRUPO: Record<string, string> = {
  DESGASTE: '#DC2626', CONTAMINACION: '#D97706',
  PROPIEDAD: '#2563EB', ADITIVO: '#059669',
}

export const ETIQUETA_GRUPO: Record<string, string> = {
  DESGASTE: 'Desgaste', CONTAMINACION: 'Contaminación',
  PROPIEDAD: 'Propiedad', ADITIVO: 'Aditivo',
}

/**
 * Qué autoridad tiene un umbral. Se muestra junto al hallazgo porque un límite
 * del fabricante y un percentil de la propia flota no pesan lo mismo, y quien
 * decide tiene derecho a saber cuál está mirando.
 */
export const ETIQUETA_NATURALEZA: Record<string, string> = {
  NORMA: 'Norma', REFERENCIA: 'Literatura', FLOTA: 'Esta flota',
  OEM: 'Fabricante', TENDENCIA: 'Tendencia',
}

export const COLOR_NATURALEZA: Record<string, string> = {
  NORMA: '#1D4ED8', REFERENCIA: '#7C3AED', FLOTA: '#0891B2',
  OEM: '#B45309', TENDENCIA: '#4F46E5',
}

/**
 * El color de una correlación.
 *
 * Rojo para la relación fuerte positiva, azul para la negativa, y casi nada
 * para lo que ronda el cero. Es la convención de las matrices de correlación y
 * conviene respetarla: quien las lee busca las manchas, no los números.
 */
export function colorCorrelacion(r: number | null): string {
  if (r === null) return '#F1F5F9'
  const a = Math.min(1, Math.abs(r))
  if (r >= 0) return `rgba(220, 38, 38, ${(a * 0.85).toFixed(2)})`
  return `rgba(37, 99, 235, ${(a * 0.85).toFixed(2)})`
}

/** Kilometraje con separador de miles. Es el eje de medio informe. */
export const km = (v?: number | null) =>
  v == null ? '—' : `${Math.round(v).toLocaleString('es-CO')} km`
