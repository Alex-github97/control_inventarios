/**
 * Garantías y reclamaciones del CMMS, contra el servidor.
 *
 * La pantalla era la más grande del sistema escrita sobre datos inventados:
 * 1.719 líneas con tres garantías, tres avisos de vencimiento y cinco
 * reclamaciones en el código. El servidor tenía la mitad de la tabla y solo
 * leer y crear; las reclamaciones no existían en ninguna parte.
 *
 * DOS COSAS QUE LA PANTALLA NO DEBE CALCULAR
 * Los días restantes y el estado los da el servidor. Estaban escritos a mano
 * («209 días»), que es un dato que envejece solo: al día siguiente miente. Y
 * los totales del encabezado vienen de `resumen` y no de sumar la tabla que se
 * está viendo, porque la tabla se filtra y los totales no deben cambiar con el
 * filtro.
 */
import { apiClient } from './client'

/** VIGENTE y VENCIDA los calcula el servidor desde la fecha; los otros dos son
 *  decisiones de una persona. */
export type EstadoGarantia = 'VIGENTE' | 'VENCIDA' | 'RECLAMADA' | 'CANCELADA'
export type TipoGarantia = 'ACTIVO' | 'REPUESTO' | 'SERVICIO'
export type EstadoReclamo = 'EN_PROCESO' | 'APROBADA' | 'RECHAZADA' | 'CERRADA'

export interface Garantia {
  id: number
  activo_id?: number | null
  tipo?: TipoGarantia | string | null
  descripcion: string
  proveedor?: string | null
  numero_garantia?: string | null
  fecha_inicio: string
  fecha_fin: string
  condiciones?: string | null
  valor_cubierto?: number | null
  /** Una por línea. */
  cobertura?: string | null
  contacto_proveedor?: string | null
  telefono_proveedor?: string | null
  documento?: string | null
  responsable?: string | null
  // ── Lo que calcula el servidor ──
  estado: EstadoGarantia
  dias_restantes?: number | null
  reclamaciones: number
  ultimo_reclamo?: string | null
  activo_codigo?: string | null
}

export interface Reclamacion {
  id: number
  garantia_id: number
  fecha: string
  descripcion: string
  monto_solicitado?: number | null
  monto_recuperado?: number | null
  estado: EstadoReclamo
  responsable?: string | null
  resolucion?: string | null
  fecha_cierre?: string | null
  // ── Calculados ──
  dias_gestion?: number | null
  abierto: boolean
  numero_garantia?: string | null
  proveedor?: string | null
  activo_codigo?: string | null
}

export interface ResumenGarantias {
  vigentes: number
  por_vencer: number
  vencidas: number
  reclamadas: number
  valor_cubierto: number
  total: number
  dias_aviso: number
  reclamos: number
  monto_solicitado: number
  monto_recuperado: number
  tasa_recuperacion: number
}

export type GarantiaEntrada = Omit<
  Garantia,
  'id' | 'estado' | 'dias_restantes' | 'reclamaciones' | 'ultimo_reclamo' | 'activo_codigo'
>
export type ReclamacionEntrada = Omit<
  Reclamacion,
  'id' | 'dias_gestion' | 'abierto' | 'numero_garantia' | 'proveedor' | 'activo_codigo'
>

const R = '/eam'

export const garantiasApi = {
  listar: (params?: { estado?: string; activo_id?: number }) =>
    apiClient.get<Garantia[]>(`${R}/garantias`, { params }).then(r => r.data),
  obtener: (id: number) =>
    apiClient.get<Garantia>(`${R}/garantias/${id}`).then(r => r.data),
  resumen: () =>
    apiClient.get<ResumenGarantias>(`${R}/garantias/resumen`).then(r => r.data),
  /** Las que se vencen dentro de la ventana. El servidor pone 90 días si no se
   *  le dice otra cosa, y excluye lo ya vencido: esta lista es de lo que
   *  todavía se puede reclamar. */
  porVencer: (dias?: number) =>
    apiClient.get<Garantia[]>(`${R}/garantias/por-vencer`,
      { params: dias ? { dias } : undefined }).then(r => r.data),

  crear: (d: Partial<GarantiaEntrada>) =>
    apiClient.post<Garantia>(`${R}/garantias`, d).then(r => r.data),
  editar: (id: number, d: Partial<GarantiaEntrada>) =>
    apiClient.put<Garantia>(`${R}/garantias/${id}`, d).then(r => r.data),
  /** El estado va por su propia ruta: editar la descripción de una garantía
   *  reclamada no debe poder borrar ese hecho sin que nadie lo pida. */
  cambiarEstado: (id: number, estado: EstadoGarantia) =>
    apiClient.patch<Garantia>(`${R}/garantias/${id}/estado`, { estado }).then(r => r.data),
  eliminar: (id: number) =>
    apiClient.delete(`${R}/garantias/${id}`).then(r => r.data),
}

export const reclamacionesApi = {
  listar: (params?: { garantia_id?: number; estado?: string }) =>
    apiClient.get<Reclamacion[]>(`${R}/garantias-reclamaciones`, { params }).then(r => r.data),
  crear: (d: Partial<ReclamacionEntrada>) =>
    apiClient.post<Reclamacion>(`${R}/garantias-reclamaciones`, d).then(r => r.data),
  editar: (id: number, d: Partial<ReclamacionEntrada>) =>
    apiClient.put<Reclamacion>(`${R}/garantias-reclamaciones/${id}`, d).then(r => r.data),
  eliminar: (id: number) =>
    apiClient.delete(`${R}/garantias-reclamaciones/${id}`).then(r => r.data),
}

// ─── Etiquetas y colores, en un solo sitio ────────────────────────────────────

export const ETIQUETA_RECLAMO: Record<string, string> = {
  EN_PROCESO: 'En proceso',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CERRADA: 'Cerrada',
}

/** Pesos colombianos sin decimales: en garantías nadie mira los centavos. */
export const pesos = (v?: number | null): string =>
  v == null ? '—' : `$${Math.round(v).toLocaleString('es-CO')}`

/** La cobertura se guarda como texto de una línea por ítem. */
export const coberturaLista = (v?: string | null): string[] =>
  (v ?? '').split('\n').map(s => s.trim()).filter(Boolean)


// ─── Catálogo del formulario y documentos ────────────────────────────────────

/** Activos, proveedores y responsables para el formulario. Sale de un catálogo
 *  propio porque `/proveedores/` estaba vacío en el CMMS y `/usuarios/` solo lo
 *  puede listar un administrador: para los demás, los desplegables llegaban vacíos. */
export interface CatalogosGarantia {
  activos: { id: number; codigo: string; nombre: string; placa?: string | null; marca?: string | null }[]
  proveedores: string[]
  responsables: string[]
  contactos: Record<string, { contacto?: string | null; telefono?: string | null }>
}

export interface AdjuntoGarantia {
  id: number; garantia_id: number; nombre: string; tipo_mime?: string | null
  tamano?: number | null; subido_por?: string | null; created_at?: string | null
}

export const catalogosGarantia = () =>
  apiClient.get<CatalogosGarantia>('/eam/garantias-catalogos').then(r => r.data)

export const adjuntosGarantiaApi = {
  listar: (gid: number) => apiClient.get<AdjuntoGarantia[]>(`/eam/garantias/${gid}/adjuntos`).then(r => r.data),
  subir: (gid: number, archivos: File[]) => {
    const fd = new FormData()
    archivos.forEach(a => fd.append('archivos', a))
    return apiClient.post<AdjuntoGarantia[]>(`/eam/garantias/${gid}/adjuntos`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  borrar: (id: number) => apiClient.delete(`/eam/garantias-adjuntos/${id}`),
  /** La descarga lleva el token: el archivo no está en una carpeta pública. */
  descargar: async (a: AdjuntoGarantia) => {
    const r = await apiClient.get(`/eam/garantias-adjuntos/${a.id}/descargar`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data as Blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = a.nombre
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  },
}
