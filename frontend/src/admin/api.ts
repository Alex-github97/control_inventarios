/**
 * La API de la consola del operador.
 *
 * Habla solo con `/plataforma/*`, que es lo que administra el acceso de las
 * empresas. Deliberadamente no toca ningún endpoint operativo: la consola
 * administra quién entra, no qué hay dentro.
 */
import axios from 'axios'

export interface Empresa {
  id: number
  codigo: string
  nombre: string
  esquema: string
  nit?: string | null
  logo_url?: string | null
  color?: string | null
  activo: boolean
  es_operador: boolean
  suspendido_desde?: string | null
  usuarios: number
  usuarios_activos: number
}

export interface UsuarioDeEmpresa {
  id: number
  nombre: string
  apellido: string
  email: string
  username: string
  rol: string
  cargo?: string | null
  activo: boolean
  bloqueado?: boolean | null
  ultimo_login?: string | null
}

export interface ClaveEntregada {
  username: string
  clave_temporal: string
}

export interface AsientoBitacora {
  id: number
  fecha: string
  actor: string
  actor_empresa: string
  accion: string
  empresa_codigo?: string | null
  detalle?: string | null
}

const api = axios.create({ baseURL: '/api/v1' })

const CLAVE_SESION = 'tw_admin_sesion'

export interface Sesion {
  token: string
  usuario: string
  empresa: string
}

export const sesion = {
  leer(): Sesion | null {
    try {
      const cru = localStorage.getItem(CLAVE_SESION)
      return cru ? JSON.parse(cru) : null
    } catch {
      // Un navegador con el almacenamiento bloqueado no debe romper la consola:
      // simplemente no hay sesión guardada y se vuelve a pedir el ingreso.
      return null
    }
  },
  guardar(s: Sesion) {
    try { localStorage.setItem(CLAVE_SESION, JSON.stringify(s)) } catch { /* sin persistencia */ }
  },
  cerrar() {
    try { localStorage.removeItem(CLAVE_SESION) } catch { /* nada que borrar */ }
  },
}

api.interceptors.request.use(cfg => {
  const s = sesion.leer()
  if (s) cfg.headers.Authorization = `Bearer ${s.token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  e => {
    // 401 es sesión vencida; 403 es «esta empresa no opera la plataforma», que
    // no se arregla volviendo a entrar y por eso no cierra la sesión.
    if (e?.response?.status === 401) {
      sesion.cerrar()
      if (!location.pathname.startsWith('/ingreso')) location.href = '/ingreso'
    }
    return Promise.reject(e)
  },
)

/** El mensaje del servidor, que explica la causa; si no, uno genérico. */
export function mensajeDeError(e: any, respaldo = 'No se pudo completar la operación'): string {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg
  return e?.message || respaldo
}

export const consolaApi = {
  async ingresar(empresa: string, usuario: string, clave: string): Promise<Sesion> {
    const { data } = await axios.post('/api/v1/auth/login',
      { username: usuario, password: clave },
      { headers: { 'X-Cliente': empresa } })
    if (!data.es_operador) {
      throw new Error(
        'Esa empresa no opera la plataforma. Esta consola es solo para quien la administra.')
    }
    return { token: data.access_token, usuario, empresa }
  },

  empresas: () => api.get<Empresa[]>('/plataforma/empresas').then(r => r.data),

  crearEmpresa: (cuerpo: Record<string, unknown>) =>
    api.post<{ empresa: Empresa; acceso: ClaveEntregada }>('/plataforma/empresas', cuerpo)
      .then(r => r.data),

  editarEmpresa: (id: number, cuerpo: Record<string, unknown>) =>
    api.put<Empresa>(`/plataforma/empresas/${id}`, cuerpo).then(r => r.data),

  cambiarEstado: (id: number, activo: boolean) =>
    api.put<Empresa>(`/plataforma/empresas/${id}/estado`, null, { params: { activo } })
      .then(r => r.data),

  usuarios: (id: number) =>
    api.get<UsuarioDeEmpresa[]>(`/plataforma/empresas/${id}/usuarios`).then(r => r.data),

  crearUsuario: (id: number, cuerpo: Record<string, unknown>) =>
    api.post<ClaveEntregada>(`/plataforma/empresas/${id}/usuarios`, cuerpo).then(r => r.data),

  editarUsuario: (id: number, usuarioId: number, cuerpo: Record<string, unknown>) =>
    api.put<UsuarioDeEmpresa>(`/plataforma/empresas/${id}/usuarios/${usuarioId}`, cuerpo)
      .then(r => r.data),

  restablecerClave: (id: number, usuarioId: number) =>
    api.post<ClaveEntregada>(`/plataforma/empresas/${id}/usuarios/${usuarioId}/clave`)
      .then(r => r.data),

  bitacora: (empresa?: string) =>
    api.get<AsientoBitacora[]>('/plataforma/bitacora', { params: { empresa, limite: 300 } })
      .then(r => r.data),
}
