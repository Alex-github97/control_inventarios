/** Cliente de la planta de reencauche (/reencauche). */
import { apiClient as api } from './client'

const datos = <T,>(p: Promise<{ data: T }>) => p.then(r => r.data)

/** Lista paginada en el servidor: filas y el total de la cabecera X-Total-Count. */
export interface Pagina<T> { filas: T[]; total: number }
const pagina = <T,>(p: Promise<{ data: T[]; headers: any }>) =>
  p.then(r => ({ filas: r.data, total: Number(r.headers['x-total-count'] ?? r.data.length) }))

export interface Etapa {
  id: number; codigo: string; nombre: string; tipo: string; decision: boolean; decision_final: boolean
  mediciones: { clave: string; nombre: string; unidad?: string; tipo?: 'NUMERO' | 'SI_NO' }[]
  reparaciones: boolean; insumos: string[]; tipos_equipo: string[]; obligatoria?: boolean
}
export interface OrdenTerminal {
  orden_id: number; orden: string; carcasa_id: number; codigo: string; cliente: string; medida: string; marca: string
  modelo: string; estado: string; prioridad: number; numero_reencauche: number; banda?: string | null
  banda_producto_id?: number | null; etapa: Etapa | null; en_proceso: boolean; paso_abierto_id?: number | null
  decision_pendiente?: string | null; retenida: boolean; ubicacion: string; costo_insumos: number
  especificacion?: { limites: Record<string, { min?: number | null; max?: number | null }>; longitud_banda_m?: number
    longitud_cojin_m?: number; cemento_estandar?: number } | null
  puede_registrar?: boolean; aviso?: string | null
}

export const rtm = {
  // Configuración
  planta: () => datos<any>(api.get('/reencauche/planta')),
  guardarPlanta: (d: any) => datos<any>(api.put('/reencauche/planta', d)),
  almacenes: () => datos<any[]>(api.get('/reencauche/almacenes')),
  propietarios: () => datos<any[]>(api.get('/reencauche/propietarios')),
  crearPropietario: (d: any) => datos<any>(api.post('/reencauche/propietarios', d)),
  roles: () => datos<any[]>(api.get('/reencauche/roles')),
  misRoles: () => datos<Record<string, boolean>>(api.get('/reencauche/roles/yo')),
  guardarRoles: (d: { usuario_id: number; roles: string[] }) => datos<any>(api.put('/reencauche/roles', d)),
  usuarios: () => datos<any[]>(api.get('/reencauche/usuarios')),
  equipos: () => datos<any[]>(api.get('/reencauche/equipos')),
  tiposEquipo: () => datos<string[]>(api.get('/reencauche/equipos/tipos')),
  crearEquipo: (d: any) => datos<any>(api.post('/reencauche/equipos', d)),
  editarEquipo: (id: number, d: any) => datos<any>(api.put(`/reencauche/equipos/${id}`, d)),
  etapas: () => datos<Etapa[]>(api.get('/reencauche/etapas')),
  editarEtapa: (id: number, d: any) => datos<any>(api.put(`/reencauche/etapas/${id}`, d)),
  rutas: () => datos<any[]>(api.get('/reencauche/rutas')),
  crearRuta: (d: any) => datos<any>(api.post('/reencauche/rutas', d)),
  editarRuta: (id: number, d: any) => datos<any>(api.put(`/reencauche/rutas/${id}`, d)),
  defectos: () => datos<any[]>(api.get('/reencauche/defectos')),
  crearDefecto: (d: any) => datos<any>(api.post('/reencauche/defectos', d)),
  editarDefecto: (id: number, d: any) => datos<any>(api.put(`/reencauche/defectos/${id}`, d)),
  motivos: () => datos<any[]>(api.get('/reencauche/motivos')),
  crearMotivo: (d: any) => datos<any>(api.post('/reencauche/motivos', d)),
  editarMotivo: (id: number, d: any) => datos<any>(api.put(`/reencauche/motivos/${id}`, d)),
  limites: () => datos<any[]>(api.get('/reencauche/limites')),
  guardarLimite: (d: any) => datos<any>(api.put('/reencauche/limites', d)),
  especificaciones: () => datos<any[]>(api.get('/reencauche/especificaciones')),
  crearEspecificacion: (d: any) => datos<any>(api.post('/reencauche/especificaciones', d)),
  editarEspecificacion: (id: number, d: any) => datos<any>(api.put(`/reencauche/especificaciones/${id}`, d)),
  insumos: (clase?: string) => datos<any[]>(api.get('/reencauche/insumos', { params: { clase } })),
  productosWms: (q?: string) => datos<any[]>(api.get('/reencauche/insumos/productos', { params: { q } })),
  lotes: (productoId: number) => datos<any[]>(api.get(`/reencauche/insumos/${productoId}/lotes`)),
  guardarInsumo: (d: any) => datos<any>(api.put('/reencauche/insumos', d)),
  recetas: () => datos<any[]>(api.get('/reencauche/recetas')),
  crearReceta: (d: any) => datos<any>(api.post('/reencauche/recetas', d)),
  aprobarReceta: (id: number) => datos<any>(api.post(`/reencauche/recetas/${id}/aprobar`)),
  tarifas: () => datos<any[]>(api.get('/reencauche/tarifas')),
  crearTarifa: (d: any) => datos<any>(api.post('/reencauche/tarifas', d)),
  editarTarifa: (id: number, d: any) => datos<any>(api.put(`/reencauche/tarifas/${id}`, d)),

  // Recepción y carcasas
  recepciones: (p?: any) => pagina<any>(api.get('/reencauche/recepciones', { params: p })),
  crearRecepcion: (d: any) => datos<any>(api.post('/reencauche/recepciones', d)),
  recepcion: (id: number) => datos<any>(api.get(`/reencauche/recepciones/${id}`)),
  registrarCarcasa: (rid: number, d: any) => datos<any>(api.post(`/reencauche/recepciones/${rid}/carcasas`, d)),
  cerrarRecepcion: (rid: number) => datos<any>(api.post(`/reencauche/recepciones/${rid}/cerrar`)),
  carcasas: (p?: any) => pagina<any>(api.get('/reencauche/carcasas', { params: p })),
  coincidencias: (p: any) => datos<any[]>(api.get('/reencauche/carcasas/coincidencias', { params: p })),
  etiqueta: (codigo: string) => datos<any>(api.get(`/reencauche/carcasas/etiqueta/${encodeURIComponent(codigo)}`)),
  hojaDeVida: (q: string) => datos<any>(api.get('/reencauche/hoja-de-vida', { params: { q } })),
  hojaPorId: (id: number) => datos<any>(api.get(`/reencauche/carcasas/${id}/hoja-de-vida`)),

  // Terminal
  estacion: (codigo: string) => datos<any>(api.get(`/reencauche/estaciones/${encodeURIComponent(codigo)}`)),
  cola: (codigo: string) => datos<any[]>(api.get(`/reencauche/estaciones/${encodeURIComponent(codigo)}/cola`)),
  escanear: (estacion: string, codigo: string) =>
    datos<OrdenTerminal>(api.get(`/reencauche/terminal/${encodeURIComponent(estacion)}/${encodeURIComponent(codigo)}`)),
  iniciar: (estacion: string, codigo: string) => datos<any>(api.post('/reencauche/terminal/iniciar', { estacion, codigo })),
  omitir: (codigo: string, motivo?: string) => datos<any>(api.post('/reencauche/terminal/omitir', { codigo, motivo })),
  terminar: (pasoId: number, d: any) => datos<any>(api.post(`/reencauche/pasos/${pasoId}/terminar`, d)),
  corregir: (pasoId: number, d: any) => datos<any>(api.post(`/reencauche/pasos/${pasoId}/corregir`, d)),
  editarOrden: (id: number, d: any) => datos<any>(api.put(`/reencauche/ordenes/${id}`, d)),

  // Calidad
  evaluacion: () => datos<any[]>(api.get('/reencauche/evaluacion')),
  dictaminar: (ordenId: number, d: any) => datos<any>(api.post(`/reencauche/ordenes/${ordenId}/dictamen`, d)),
  retener: (codigo: string, motivo: string) => datos<any>(api.post('/reencauche/retenciones', { codigo, motivo })),
  retenciones: (estado = 'ABIERTA') => datos<any[]>(api.get('/reencauche/retenciones', { params: { estado } })),
  cerrarRetencion: (id: number, d: any) => datos<any>(api.post(`/reencauche/retenciones/${id}/cerrar`, d)),
  rechazos: (p?: any) => pagina<any>(api.get('/reencauche/rechazos', { params: p })),
  disponer: (d: any) => datos<any>(api.post('/reencauche/rechazos/disponer', d)),
  subirArchivoPrueba: (pruebaId: number, archivo: File) => {
    const f = new FormData(); f.append('archivo', archivo)
    return datos<any>(api.post(`/reencauche/pruebas/${pruebaId}/archivo`, f))
  },

  // Vulcanización
  tableroVulcanizacion: () => datos<any>(api.get('/reencauche/vulcanizacion/tablero')),
  ciclos: (p?: any) => pagina<any>(api.get('/reencauche/ciclos', { params: p })),
  crearCiclo: (equipo_id: number) => datos<any>(api.post('/reencauche/ciclos', { equipo_id })),
  cargar: (cid: number, codigo: string) => datos<any>(api.post(`/reencauche/ciclos/${cid}/cargar`, { codigo })),
  iniciarCiclo: (cid: number) => datos<any>(api.post(`/reencauche/ciclos/${cid}/iniciar`)),
  cerrarCiclo: (cid: number, d: any) => datos<any>(api.post(`/reencauche/ciclos/${cid}/cerrar`, d)),

  // Despachos y recogidas
  recogidas: (estado?: string) => datos<any[]>(api.get('/reencauche/recogidas', { params: { estado } })),
  crearRecogida: (d: any) => datos<any>(api.post('/reencauche/recogidas', d)),
  cancelarRecogida: (id: number) => datos<any>(api.post(`/reencauche/recogidas/${id}/cancelar`)),
  programarRecogidas: (d: any) => datos<any>(api.post('/reencauche/recogidas/programar', d)),
  propuesta: (depositante_id: number) => datos<any>(api.get('/reencauche/entregas/propuesta', { params: { depositante_id } })),
  clientesWms: (q?: string) => datos<any[]>(api.get('/reencauche/clientes-wms', { params: { q } })),
  entregas: (p?: any) => pagina<any>(api.get('/reencauche/entregas', { params: p })),
  entrega: (id: number) => datos<any>(api.get(`/reencauche/entregas/${id}`)),
  crearEntrega: (d: any) => datos<any>(api.post('/reencauche/entregas', d)),
  despachar: (id: number, d: any) => datos<any>(api.post(`/reencauche/entregas/${id}/despachar`, d)),
  anularEntrega: (id: number) => datos<any>(api.post(`/reencauche/entregas/${id}/anular`)),
  lotesCmms: () => datos<any[]>(api.get('/reencauche/cmms/lotes')),
  recibirLoteCmms: (id: number) => datos<any>(api.post(`/reencauche/cmms/lotes/${id}/recibir`)),

  // Liquidación y garantías
  liquidaciones: (p?: any) => pagina<any>(api.get('/reencauche/liquidaciones', { params: p })),
  liquidacion: (id: number) => datos<any>(api.get(`/reencauche/liquidaciones/${id}`)),
  aprobarLiquidacion: (id: number) => datos<any>(api.post(`/reencauche/liquidaciones/${id}/aprobar`)),
  reclamos: (p?: any) => pagina<any>(api.get('/reencauche/reclamos', { params: p })),
  crearReclamo: (d: any) => datos<any>(api.post('/reencauche/reclamos', d)),
  avanzarReclamo: (id: number, d: any) => datos<any>(api.post(`/reencauche/reclamos/${id}/avanzar`, d)),
  subirFotoReclamo: (id: number, archivo: File) => {
    const f = new FormData(); f.append('archivo', archivo)
    return datos<any>(api.post(`/reencauche/reclamos/${id}/fotos`, f))
  },

  // Consultas
  tablero: (depositante_id?: number | '') => datos<any>(api.get('/reencauche/tablero', { params: { depositante_id: depositante_id || undefined } })),
  indicadores: (p: any) => datos<any>(api.get('/reencauche/indicadores', { params: p })),
  conciliacion: () => datos<any>(api.get('/reencauche/conciliacion')),
  novedades: (depositante_id?: number) => datos<any[]>(api.get('/reencauche/novedades', { params: { depositante_id } })),
  trazaLote: (p: any) => datos<any>(api.get('/reencauche/trazabilidad/lote', { params: p })),
  trazaCiclo: (codigo: string) => datos<any>(api.get('/reencauche/trazabilidad/ciclo', { params: { codigo } })),
  trazaEquipo: (p: any) => datos<any>(api.get('/reencauche/trazabilidad/equipo', { params: p })),
  archivoUrl: (id: number) => `/reencauche/archivos/${id}`,
  descargarArchivo: (id: number) => api.get(`/reencauche/archivos/${id}`, { responseType: 'blob' }).then(r => r.data as Blob),
}

export const pesos = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
export const num = (v?: number | null, dec = 1) =>
  v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: dec })
export const fechaHora = (s?: string | null) =>
  s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export const ESTADO_CARCASA: Record<string, [string, string]> = {
  EN_PLANTA: ['En planta', '#0369A1'], TERMINADA: ['Terminada', '#15803D'], RECHAZADA: ['Rechazada', '#DC2626'],
  DESPACHADA: ['Despachada', '#7C3AED'], ENTREGADA: ['Entregada', '#475569'], DISPUESTA: ['Dispuesta', '#92400E'],
  VENDIDA: ['Vendida', '#0F766E'],
}
