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


// ─── La relación comercial ────────────────────────────────────────────────────

export interface Contrato {
  tarifa_mensual: string
  moneda: string
  iva_pct: string
  dia_corte: number
  inicio?: string | null
  fin?: string | null
  notas?: string | null
}

export interface ModuloContratado {
  clave: string
  nombre: string
  activo: boolean
  /** Los esenciales no se pueden quitar: sin ellos nadie entra. */
  esencial: boolean
}

export interface Contacto {
  id?: number
  nombre: string
  cargo?: string | null
  email?: string | null
  telefono?: string | null
  principal: boolean
  notas?: string | null
}

export interface Documento {
  id?: number
  tipo?: string | null
  nombre: string
  archivo?: string | null
  vence?: string | null
  notas?: string | null
}

export interface Pago {
  id?: number
  /** A qué factura se aplica; vacío = anticipo sin factura todavía. */
  factura_id?: number | null
  fecha: string
  monto: string
  moneda: string
  periodo_desde?: string | null
  periodo_hasta?: string | null
  metodo?: string | null
  referencia?: string | null
  notas?: string | null
}

export interface Cartera {
  tarifa_mensual: string
  moneda: string
  iva_pct: string
  total_con_iva: string
  pagado_total: string
  cubierto_hasta?: string | null
  dias_en_mora: number
  al_dia: boolean
  /** Sin ningún pago con periodo no se puede afirmar nada sobre la mora. */
  hay_datos: boolean
}

export interface Uso {
  usuarios: number
  usuarios_activos: number
  ultimo_ingreso?: string | null
  activos_30d: number
  conteos: Record<string, number>
}


// ─── Facturación y contabilidad ───────────────────────────────────────────────
//
// Control contable interno: NO es facturación electrónica ante la DIAN. El
// número legal se guarda en `numero_externo` para poder cruzar las dos cosas.

export interface Factura {
  id: number
  numero: string
  numero_externo?: string | null
  fecha: string
  periodo_desde?: string | null
  periodo_hasta?: string | null
  subtotal: string
  iva_pct: string
  iva_valor: string
  total: string
  moneda: string
  anulada: boolean
  concepto?: string | null
  notas?: string | null
  acreditado: string
  pagado: string
  saldo: string
}

export interface NotaCredito {
  id?: number
  factura_id: number
  numero?: string
  numero_externo?: string | null
  fecha?: string | null
  valor: string
  moneda?: string
  motivo: string
  notas?: string | null
}

export interface FilaCliente {
  cliente_id: number
  codigo: string
  nombre: string
  activo: boolean
  tarifa_mensual: string
  facturado: string
  acreditado: string
  recaudado: string
  saldo: string
  facturas: number
  dias_mora: number
}

export interface FilaMes {
  mes: string
  facturado: string
  acreditado: string
  recaudado: string
}

export interface Contabilidad {
  facturado: string
  acreditado: string
  recaudado: string
  por_cobrar: string
  ingreso_recurrente: string
  empresas_activas: number
  empresas_en_mora: number
  clientes: FilaCliente[]
  meses: FilaMes[]
}


// ─── Mesa de ayuda ────────────────────────────────────────────────────────────

export interface Adjunto {
  id: number
  nombre: string
  tipo_mime?: string | null
  tamano?: number | null
  creado_en: string
  mensaje_id?: number | null
}

export interface MensajeSoporte {
  id: number
  autor: string
  autor_nombre?: string | null
  es_soporte: boolean
  cuerpo: string
  /** Nota del equipo: el cliente no la ve. */
  interno: boolean
  creado_en: string
  adjuntos: Adjunto[]
}

export interface Ticket {
  id: number
  numero: string
  asunto: string
  estado: string
  criticidad: string
  categoria?: string | null
  modulo?: string | null
  impacto?: string | null
  autor: string
  autor_nombre?: string | null
  cliente_codigo: string
  asignado_a?: string | null
  created_at?: string | null
  ultima_actividad?: string | null
  primera_respuesta_en?: string | null
  mensajes: number
  conversacion?: MensajeSoporte[]
}

export interface ResumenSoporte {
  abiertos: number
  sin_responder: number
  criticos: number
  por_estado: Record<string, number>
  por_criticidad: Record<string, number>
}


// ─── Gestión ágil ─────────────────────────────────────────────────────────────

export interface Tarjeta {
  id: number
  numero: string
  asunto: string
  estado: string
  criticidad: string
  tipo_trabajo?: string | null
  puntos?: number | null
  sprint_id?: number | null
  epica_id?: number | null
  orden?: number | null
  etiquetas?: string[] | null
  asignado_a?: string | null
  cliente_codigo: string
  autor: string
  modulo?: string | null
  created_at?: string | null
  ultima_actividad?: string | null
}

export interface ColumnaTablero {
  estado: string
  titulo: string
  orden: number
  /** Vacío = sin límite. Cuando se alcanza, el servidor rechaza el movimiento. */
  limite_wip?: number | null
  cantidad: number
  puntos: number
  tarjetas: Tarjeta[]
}

export interface Tablero {
  sprint?: {
    id: number; nombre: string; objetivo?: string | null
    inicio?: string | null; fin?: string | null; estado: string
  } | null
  columnas: ColumnaTablero[]
}

export interface SprintAgil {
  id?: number
  nombre: string
  objetivo?: string | null
  inicio?: string | null
  fin?: string | null
  estado: string
  puntos_comprometidos?: number | null
  puntos_completados?: number | null
  cerrado_en?: string | null
  total_solicitudes: number
  puntos_en_curso: number
  puntos_hechos: number
}

export interface EpicaAgil {
  id?: number
  nombre: string
  descripcion?: string | null
  color?: string | null
  archivada: boolean
  solicitudes: number
  puntos: number
}

export interface MetricasAgiles {
  burndown: { fecha: string; ideal: number; real?: number | null }[]
  velocidad: { sprint: string; comprometidos: number; completados: number }[]
  tiempo_ciclo_promedio?: number | null
  tiempo_entrega_promedio?: number | null
  por_tipo: Record<string, number>
}


// ─── Equipo de la consola ─────────────────────────────────────────────────────

export interface MiembroEquipo {
  id: number
  usuario: string
  nombre?: string | null
  email?: string | null
  rol: string
  activo: boolean
  notas?: string | null
}

export interface RolConsola {
  clave: string
  nombre: string
  descripcion: string
  permisos: string[]
}

export interface Candidato {
  username: string
  nombre: string
  email?: string | null
  ya_es_miembro: boolean
}

export interface QuienSoy {
  usuario: string
  rol: string
  permisos: string[]
  /** True mientras el equipo no se haya formalizado. */
  implicito: boolean
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

  // ─── Comercial ──────────────────────────────────────────────────────────────

  contrato: (id: number) =>
    api.get<Contrato>(`/plataforma/empresas/${id}/contrato`).then(r => r.data),
  guardarContrato: (id: number, c: Partial<Contrato>) =>
    api.put<Contrato>(`/plataforma/empresas/${id}/contrato`, c).then(r => r.data),

  modulos: (id: number) =>
    api.get<ModuloContratado[]>(`/plataforma/empresas/${id}/modulos`).then(r => r.data),
  guardarModulos: (id: number, claves: string[]) =>
    api.put<ModuloContratado[]>(`/plataforma/empresas/${id}/modulos`, { claves }).then(r => r.data),

  contactos: (id: number) =>
    api.get<Contacto[]>(`/plataforma/empresas/${id}/contactos`).then(r => r.data),
  crearContacto: (id: number, c: Contacto) =>
    api.post<Contacto>(`/plataforma/empresas/${id}/contactos`, c).then(r => r.data),
  borrarContacto: (id: number, contactoId: number) =>
    api.delete(`/plataforma/empresas/${id}/contactos/${contactoId}`),

  documentos: (id: number) =>
    api.get<Documento[]>(`/plataforma/empresas/${id}/documentos`).then(r => r.data),
  crearDocumento: (id: number, d: Documento) =>
    api.post<Documento>(`/plataforma/empresas/${id}/documentos`, d).then(r => r.data),
  borrarDocumento: (id: number, docId: number) =>
    api.delete(`/plataforma/empresas/${id}/documentos/${docId}`),

  pagos: (id: number) =>
    api.get<Pago[]>(`/plataforma/empresas/${id}/pagos`).then(r => r.data),
  registrarPago: (id: number, p: Pago) =>
    api.post<Pago>(`/plataforma/empresas/${id}/pagos`, p).then(r => r.data),
  borrarPago: (id: number, pagoId: number) =>
    api.delete(`/plataforma/empresas/${id}/pagos/${pagoId}`),

  cartera: (id: number) =>
    api.get<Cartera>(`/plataforma/empresas/${id}/cartera`).then(r => r.data),

  uso: (id: number) =>
    api.get<Uso>(`/plataforma/empresas/${id}/uso`).then(r => r.data),

  // ─── Facturación ────────────────────────────────────────────────────────────

  facturas: (id: number) =>
    api.get<Factura[]>(`/plataforma/empresas/${id}/facturas`).then(r => r.data),
  emitirFactura: (id: number, cuerpo: Record<string, unknown>) =>
    api.post<Factura>(`/plataforma/empresas/${id}/facturas`, cuerpo).then(r => r.data),
  anularFactura: (id: number, facturaId: number) =>
    api.post<Factura>(`/plataforma/empresas/${id}/facturas/${facturaId}/anular`).then(r => r.data),

  notasCredito: (id: number) =>
    api.get<NotaCredito[]>(`/plataforma/empresas/${id}/notas-credito`).then(r => r.data),
  emitirNota: (id: number, n: NotaCredito) =>
    api.post<NotaCredito>(`/plataforma/empresas/${id}/notas-credito`, n).then(r => r.data),

  contabilidad: (desde?: string, hasta?: string) =>
    api.get<Contabilidad>('/plataforma/contabilidad', { params: { desde, hasta } })
      .then(r => r.data),

  bitacora: (empresa?: string) =>
    api.get<AsientoBitacora[]>('/plataforma/bitacora', { params: { empresa, limite: 300 } })
      .then(r => r.data),
}

export const soporteApi = {
  cola: (filtros: Record<string, unknown>) =>
    api.get<Ticket[]>('/soporte/cola', { params: filtros }).then(r => r.data),

  ticket: (id: number) =>
    api.get<Ticket>(`/soporte/cola/${id}`).then(r => r.data),

  clasificar: (id: number, cambios: Record<string, unknown>) =>
    api.put<Ticket>(`/soporte/cola/${id}`, cambios).then(r => r.data),

  responder: (id: number, cuerpo: string, interno: boolean) =>
    api.post<Ticket>(`/soporte/cola/${id}/mensajes`, { cuerpo, interno }).then(r => r.data),

  adjuntar: (id: number, cuerpo: FormData) =>
    api.post<Ticket>(`/soporte/tickets/${id}/adjuntos`, cuerpo).then(r => r.data),

  // Los adjuntos no se sirven por carpeta pública: la descarga pasa por la API,
  // que comprueba de quién es el ticket.
  descargarAdjunto: (id: number) =>
    api.get(`/soporte/adjuntos/${id}`, { responseType: 'blob' }).then(r => r.data as Blob),

  resumen: () => api.get<ResumenSoporte>('/soporte/resumen').then(r => r.data),
}

export const agilApi = {
  tablero: (sprintId?: number) =>
    api.get<Tablero>('/soporte/agil/tablero', { params: { sprint_id: sprintId } })
      .then(r => r.data),

  mover: (id: number, estado: string, ordenAnterior?: number, ordenSiguiente?: number) =>
    api.put<Tarjeta>(`/soporte/agil/tickets/${id}/mover`, {
      estado, orden_anterior: ordenAnterior ?? null, orden_siguiente: ordenSiguiente ?? null,
    }).then(r => r.data),

  actualizar: (id: number, cambios: Record<string, unknown>) =>
    api.put<Tarjeta>(`/soporte/agil/tickets/${id}`, cambios).then(r => r.data),

  backlog: () => api.get<Tarjeta[]>('/soporte/agil/backlog').then(r => r.data),
  reordenar: (ids: number[]) =>
    api.put<Tarjeta[]>('/soporte/agil/backlog/orden', { ids }).then(r => r.data),

  sprints: () => api.get<SprintAgil[]>('/soporte/agil/sprints').then(r => r.data),
  crearSprint: (s: Partial<SprintAgil>) =>
    api.post<SprintAgil>('/soporte/agil/sprints', s).then(r => r.data),
  activarSprint: (id: number) =>
    api.post<SprintAgil>(`/soporte/agil/sprints/${id}/activar`).then(r => r.data),
  cerrarSprint: (id: number) =>
    api.post<SprintAgil>(`/soporte/agil/sprints/${id}/cerrar`).then(r => r.data),

  epicas: () => api.get<EpicaAgil[]>('/soporte/agil/epicas').then(r => r.data),
  crearEpica: (e: Partial<EpicaAgil>) =>
    api.post<EpicaAgil>('/soporte/agil/epicas', e).then(r => r.data),

  configurarColumna: (estado: string, cambios: Record<string, unknown>) =>
    api.put(`/soporte/agil/columnas/${estado}`, cambios).then(r => r.data),

  metricas: () => api.get<MetricasAgiles>('/soporte/agil/metricas').then(r => r.data),
}

export const equipoApi = {
  quienSoy: () => api.get<QuienSoy>('/plataforma/equipo/quien-soy').then(r => r.data),
  roles: () => api.get<RolConsola[]>('/plataforma/equipo/roles').then(r => r.data),
  listar: () => api.get<MiembroEquipo[]>('/plataforma/equipo').then(r => r.data),
  candidatos: () => api.get<Candidato[]>('/plataforma/equipo/candidatos').then(r => r.data),
  agregar: (cuerpo: Record<string, unknown>) =>
    api.post<MiembroEquipo>('/plataforma/equipo', cuerpo).then(r => r.data),
  editar: (id: number, cambios: Record<string, unknown>) =>
    api.put<MiembroEquipo>(`/plataforma/equipo/${id}`, cambios).then(r => r.data),
  quitar: (id: number) => api.delete(`/plataforma/equipo/${id}`),
}
