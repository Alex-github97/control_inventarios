/**
 * El CRM contra el servidor.
 *
 * Las pantallas de este módulo se hicieron primero como maqueta, con los datos
 * escritos dentro del propio archivo. Este cliente es lo que faltaba para que
 * pidan lo real: el backend ya tenía las veinte tablas y los veintinueve
 * endpoints desde el principio.
 *
 * Los tipos siguen a los `Response` de `backend/app/api/v1/endpoints/crm.py`.
 * Los importes llegan como cadena y no como número —Pydantic serializa
 * `Decimal` así a propósito— y por eso van tipados `Cifra`: convertirlos a
 * `number` en el tipo haría creer que ya son números y `.toFixed()` fallaría en
 * tiempo de ejecución sin que el compilador dijera nada.
 */
import { apiClient } from './client'

/** Un decimal del servidor. Llega como cadena; se convierte con `aNumero`. */
export type Cifra = string | number | null | undefined

export const aNumero = (v: Cifra): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

export interface Ejecutivo {
  id: number; codigo: string; nombre: string
  email?: string | null; telefono?: string | null; region?: string | null
  meta_anual?: Cifra; activo: boolean
}

export interface ClienteCRM {
  id: number; codigo: string; razon_social: string
  nit?: string | null; tipo: string
  segmento?: string | null; estado: string
  industria?: string | null; pais: string; ciudad?: string | null
  direccion?: string | null; telefono?: string | null; email?: string | null
  sitio_web?: string | null; ejecutivo_id?: number | null
  potencial_anual?: Cifra; notas?: string | null
  ingresos_ytd: Cifra; health_score: number; lead_score: number; activo: boolean
}

export interface Contacto {
  id: number; cliente_id: number; nombre: string
  cargo?: string | null; email?: string | null; telefono?: string | null
  whatsapp?: string | null; linkedin?: string | null
  es_decisor: boolean; es_principal: boolean; activo: boolean
}

export interface Lead {
  id: number; codigo: string; cliente_id?: number | null
  ejecutivo_id?: number | null; empresa: string
  contacto?: string | null; email?: string | null; telefono?: string | null
  fuente?: string | null; industria?: string | null
  estado: string; score: number; potencial?: Cifra
  notas?: string | null; convertido: boolean
}

export interface Oportunidad {
  id: number; codigo: string; cliente_id: number
  lead_id?: number | null; ejecutivo_id?: number | null
  nombre: string; descripcion?: string | null
  estado: string; probabilidad: number; valor_estimado?: Cifra
  servicio?: string | null; fecha_esperada?: string | null
  valor_contratado?: Cifra; fecha_cierre?: string | null
  motivo_perdida?: string | null
}

export interface Cotizacion {
  id: number; codigo: string; oportunidad_id?: number | null
  cliente_id: number; ejecutivo_id?: number | null
  estado: string; validez_dias: number; notas?: string | null
  version: number; subtotal: Cifra; iva: Cifra; total: Cifra
  fecha_envio?: string | null; fecha_vencimiento?: string | null
}

export interface Contrato {
  id: number; codigo: string; cliente_id: number
  oportunidad_id?: number | null; ejecutivo_id?: number | null
  nombre: string; estado: string; tipo_servicio?: string | null
  valor_mensual?: Cifra; valor_total?: Cifra
  fecha_inicio?: string | null; fecha_fin?: string | null
  duracion_meses?: number | null; auto_renovacion: boolean
  notas?: string | null
}

export interface Ticket {
  id: number; codigo: string; cliente_id: number
  contrato_id?: number | null; contacto_id?: number | null
  ejecutivo_id?: number | null; tipo: string; estado: string
  prioridad: string; asunto: string; descripcion?: string | null
  canal?: string | null
  fecha_limite?: string | null; fecha_resolucion?: string | null
  tiempo_respuesta_hrs?: Cifra; tiempo_solucion_hrs?: Cifra
  satisfaccion?: number | null
}

export interface Interaccion {
  id: number; cliente_id: number; contacto_id?: number | null
  ticket_id?: number | null; oportunidad_id?: number | null
  ejecutivo_id?: number | null; tipo: string
  asunto?: string | null; descripcion?: string | null
  duracion_min?: number | null; resultado?: string | null
  proximo_paso?: string | null; fecha_interaccion?: string | null
}

export interface Encuesta {
  id: number; codigo: string; cliente_id: number
  ticket_id?: number | null; tipo: string
  puntaje?: number | null; comentario?: string | null
  respondida: boolean
  fecha_envio?: string | null; fecha_respuesta?: string | null
}

export interface KPIDiario {
  id: number; fecha: string
  total_clientes: number; clientes_activos: number
  total_leads: number; leads_calientes: number
  pipeline_valor: Cifra; oportunidades_activas: number
  tasa_conversion: Cifra; win_rate: Cifra
  tickets_abiertos: number; tickets_escalados: number
  nps_promedio: Cifra; csat_promedio: Cifra
  contratos_activos: number; contratos_por_vencer: number
  ingresos_mes: Cifra; churn_rate: Cifra
}

export interface CotizacionItem {
  id: number; descripcion: string; unidad?: string | null
  cantidad: Cifra; precio_unitario: Cifra; descuento_pct: Cifra; total: Cifra
}

export interface SLA {
  id: number; contrato_id: number; indicador: string
  objetivo: Cifra; unidad?: string | null; valor_actual?: Cifra
  penalizacion?: string | null; frecuencia_medicion?: string | null
  activo: boolean
}

export interface Campana {
  id: number; codigo: string; nombre: string; tipo: string
  descripcion?: string | null
  fecha_inicio?: string | null; fecha_fin?: string | null
  presupuesto?: Cifra
  leads_generados: number; conversiones: number; ingresos_generados: Cifra
  activa: boolean
  enviados: number; abiertos: number; respondidos: number
}

export interface CuentaClave {
  id: number; cliente_id: number; ejecutivo_id?: number | null
  objetivo_anual?: Cifra; ingreso_actual?: Cifra
  estrategia?: string | null; proxima_reunion?: string | null
  nivel_riesgo: string
  cliente?: string | null; health_score?: number | null; segmento?: string | null
}

export interface Objetivo {
  id: number; ejecutivo_id: number; periodo: string; tipo_objetivo: string
  meta: Cifra; logrado: Cifra; porcentaje: Cifra
  ejecutivo?: string | null; region?: string | null
}

export interface Salud {
  id: number; cliente_id: number; fecha_calculo: string; health_score: number
  score_otif?: number | null; score_tickets?: number | null
  score_pagos?: number | null; score_nps?: number | null
  score_contratos?: number | null
  riesgo_churn?: Cifra; prediccion_ia?: string | null
  cliente?: string | null; ingresos_ytd?: Cifra
}

export interface Riesgo {
  id: number; cliente_id: number; tipo_riesgo: string; nivel: string
  descripcion?: string | null; plan_mitigacion?: string | null
  activo: boolean; cliente?: string | null
}

export interface Actividad {
  id: number; cliente_id?: number | null; oportunidad_id?: number | null
  ticket_id?: number | null; ejecutivo_id?: number | null
  tipo: string; asunto: string; descripcion?: string | null
  fecha_vencimiento?: string | null; completada: boolean; prioridad: string
  cliente?: string | null
}

export interface ParametroCRM {
  clave: string; nombre: string; unidad: string
  valor: number; defecto: number; minimo: number; maximo: number
  explica: string; personalizado: boolean
}

export interface Recomendacion {
  tipo: 'AMPLIAR' | 'RENOVAR' | 'RECUPERAR' | 'REACTIVAR' | 'CONVERTIR'
  cliente_id: number; cliente: string
  titulo: string; razon: string
  potencial?: Cifra; urgencia: number
}

export interface Alerta {
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO'
  tipo: string; texto: string
  referencia?: string | null; cliente_id?: number | null
}

/** Lo que `GET /crm/kpis/dashboard` devuelve hoy. Es un objeto suelto en el
 *  servidor, así que se tipa laxo a propósito: apretar el tipo aquí obligaría a
 *  tocar dos archivos cada vez que se añade una cifra al tablero. */
export type KPIsTablero = Record<string, number | string | null>

const get = <T,>(ruta: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(ruta, { params }).then(r => r.data)

export const crmApi = {
  ejecutivos: () => get<Ejecutivo[]>('/crm/ejecutivos'),
  ejecutivo: (id: number) => get<Ejecutivo>(`/crm/ejecutivos/${id}`),
  crearEjecutivo: (c: Partial<Ejecutivo>) =>
    apiClient.post<Ejecutivo>('/crm/ejecutivos', c).then(r => r.data),

  clientes: (f?: { estado?: string; segmento?: string; ejecutivo_id?: number; q?: string }) =>
    get<ClienteCRM[]>('/crm/clientes', f),
  cliente: (id: number) => get<ClienteCRM>(`/crm/clientes/${id}`),
  crearCliente: (c: Partial<ClienteCRM>) =>
    apiClient.post<ClienteCRM>('/crm/clientes', c).then(r => r.data),
  editarCliente: (id: number, c: Partial<ClienteCRM>) =>
    apiClient.put<ClienteCRM>(`/crm/clientes/${id}`, c).then(r => r.data),

  contactos: (cliente_id?: number) => get<Contacto[]>('/crm/contactos', { cliente_id }),
  crearContacto: (c: Partial<Contacto>) =>
    apiClient.post<Contacto>('/crm/contactos', c).then(r => r.data),

  leads: (f?: { estado?: string; ejecutivo_id?: number }) => get<Lead[]>('/crm/leads', f),
  crearLead: (c: Partial<Lead>) => apiClient.post<Lead>('/crm/leads', c).then(r => r.data),
  editarLead: (id: number, c: Partial<Lead>) =>
    apiClient.put<Lead>(`/crm/leads/${id}`, c).then(r => r.data),

  oportunidades: (f?: { estado?: string; cliente_id?: number; ejecutivo_id?: number }) =>
    get<Oportunidad[]>('/crm/oportunidades', f),
  crearOportunidad: (c: Partial<Oportunidad>) =>
    apiClient.post<Oportunidad>('/crm/oportunidades', c).then(r => r.data),
  moverOportunidad: (id: number, estado: string,
                     extra?: { valor_contratado?: number; motivo_perdida?: string }) =>
    apiClient.put<Oportunidad>(`/crm/oportunidades/${id}/estado`,
      { estado, ...extra }).then(r => r.data),

  cotizaciones: (f?: { estado?: string; cliente_id?: number }) =>
    get<Cotizacion[]>('/crm/cotizaciones', f),
  crearCotizacion: (c: Partial<Cotizacion> & { items?: unknown[] }) =>
    apiClient.post<Cotizacion>('/crm/cotizaciones', c).then(r => r.data),

  contratos: (f?: { estado?: string; cliente_id?: number }) =>
    get<Contrato[]>('/crm/contratos', f),
  crearContrato: (c: Partial<Contrato>) =>
    apiClient.post<Contrato>('/crm/contratos', c).then(r => r.data),
  editarContrato: (id: number, c: Partial<Contrato>) =>
    apiClient.put<Contrato>(`/crm/contratos/${id}`, c).then(r => r.data),

  tickets: (f?: { estado?: string; cliente_id?: number; tipo?: string }) =>
    get<Ticket[]>('/crm/tickets', f),
  crearTicket: (c: Partial<Ticket>) =>
    apiClient.post<Ticket>('/crm/tickets', c).then(r => r.data),
  moverTicket: (id: number, estado: string, extra?: { satisfaccion?: number }) =>
    apiClient.put<Ticket>(`/crm/tickets/${id}/estado`,
      { estado, ...extra }).then(r => r.data),

  interacciones: (f?: { cliente_id?: number; tipo?: string }) =>
    get<Interaccion[]>('/crm/interacciones', f),
  crearInteraccion: (c: Partial<Interaccion>) =>
    apiClient.post<Interaccion>('/crm/interacciones', c).then(r => r.data),

  encuestas: (f?: { cliente_id?: number; tipo?: string }) =>
    get<Encuesta[]>('/crm/encuestas', f),
  crearEncuesta: (c: Partial<Encuesta>) =>
    apiClient.post<Encuesta>('/crm/encuestas', c).then(r => r.data),

  tablero: () => get<KPIsTablero>('/crm/kpis/dashboard'),
  kpisDiarios: (limit = 90) => get<KPIDiario[]>('/crm/kpis/diarios', { limit }),
  // ── Lo que se añadió al conectar las pantallas ──────────────────────────────
  cotizacion: (id: number) =>
    get<{ cotizacion: Cotizacion; items: CotizacionItem[] }>(`/crm/cotizaciones/${id}`),
  slaDeContrato: (id: number) => get<SLA[]>(`/crm/contratos/${id}/sla`),
  campanas: (activa?: boolean) => get<Campana[]>('/crm/campanas', { activa }),
  cuentasClave: () => get<CuentaClave[]>('/crm/cuentas-clave'),
  objetivos: (periodo?: string) => get<Objetivo[]>('/crm/objetivos', { periodo }),
  salud: (enRiesgo = false) => get<Salud[]>('/crm/salud', { en_riesgo: enRiesgo }),
  riesgos: () => get<Riesgo[]>('/crm/riesgos'),
  actividades: (f?: { pendientes?: boolean; ejecutivo_id?: number }) =>
    get<Actividad[]>('/crm/actividades', f),
  completarActividad: (id: number) =>
    apiClient.put(`/crm/actividades/${id}/completar`).then(r => r.data),
  alertas: () => get<Alerta[]>('/crm/alertas'),
  recomendaciones: () => get<Recomendacion[]>('/crm/recomendaciones'),
  // ── Corregir y deshacer ─────────────────────────────────────────────────────
  borrarCliente: (id: number) => apiClient.delete(`/crm/clientes/${id}`),
  editarContacto: (id: number, c: Partial<Contacto>) =>
    apiClient.put<Contacto>(`/crm/contactos/${id}`, c).then(r => r.data),
  borrarContacto: (id: number) => apiClient.delete(`/crm/contactos/${id}`),
  borrarLead: (id: number) => apiClient.delete(`/crm/leads/${id}`),
  editarOportunidad: (id: number, c: Partial<Oportunidad>) =>
    apiClient.put<Oportunidad>(`/crm/oportunidades/${id}`, c).then(r => r.data),
  borrarOportunidad: (id: number) => apiClient.delete(`/crm/oportunidades/${id}`),
  editarCotizacion: (id: number, c: Partial<Cotizacion>) =>
    apiClient.put<Cotizacion>(`/crm/cotizaciones/${id}`, c).then(r => r.data),
  borrarCotizacion: (id: number) => apiClient.delete(`/crm/cotizaciones/${id}`),
  borrarContrato: (id: number) => apiClient.delete(`/crm/contratos/${id}`),
  crearSla: (contratoId: number, c: Partial<SLA>) =>
    apiClient.post<SLA>(`/crm/contratos/${contratoId}/sla`, c).then(r => r.data),
  editarSla: (id: number, c: Partial<SLA>) =>
    apiClient.put<SLA>(`/crm/sla/${id}`, c).then(r => r.data),
  borrarSla: (id: number) => apiClient.delete(`/crm/sla/${id}`),
  editarTicket: (id: number, c: Partial<Ticket>) =>
    apiClient.put<Ticket>(`/crm/tickets/${id}`, c).then(r => r.data),
  borrarTicket: (id: number) => apiClient.delete(`/crm/tickets/${id}`),
  editarInteraccion: (id: number, c: Partial<Interaccion>) =>
    apiClient.put<Interaccion>(`/crm/interacciones/${id}`, c).then(r => r.data),
  borrarInteraccion: (id: number) => apiClient.delete(`/crm/interacciones/${id}`),
  editarEncuesta: (id: number, c: Partial<Encuesta>) =>
    apiClient.put<Encuesta>(`/crm/encuestas/${id}`, c).then(r => r.data),
  borrarEncuesta: (id: number) => apiClient.delete(`/crm/encuestas/${id}`),
  crearCampana: (c: Partial<Campana>) =>
    apiClient.post<Campana>('/crm/campanas', c).then(r => r.data),
  editarCampana: (id: number, c: Partial<Campana>) =>
    apiClient.put<Campana>(`/crm/campanas/${id}`, c).then(r => r.data),
  borrarCampana: (id: number) => apiClient.delete(`/crm/campanas/${id}`),
  crearCuentaClave: (c: Partial<CuentaClave>) =>
    apiClient.post<CuentaClave>('/crm/cuentas-clave', c).then(r => r.data),
  editarCuentaClave: (id: number, c: Partial<CuentaClave>) =>
    apiClient.put<CuentaClave>(`/crm/cuentas-clave/${id}`, c).then(r => r.data),
  borrarCuentaClave: (id: number) => apiClient.delete(`/crm/cuentas-clave/${id}`),
  crearRiesgo: (c: Partial<Riesgo>) =>
    apiClient.post<Riesgo>('/crm/riesgos', c).then(r => r.data),
  editarRiesgo: (id: number, c: Partial<Riesgo>) =>
    apiClient.put<Riesgo>(`/crm/riesgos/${id}`, c).then(r => r.data),
  borrarRiesgo: (id: number) => apiClient.delete(`/crm/riesgos/${id}`),
  crearActividad: (c: Partial<Actividad>) =>
    apiClient.post<Actividad>('/crm/actividades', c).then(r => r.data),
  borrarActividad: (id: number) => apiClient.delete(`/crm/actividades/${id}`),
  editarEjecutivo: (id: number, c: Partial<Ejecutivo>) =>
    apiClient.put<Ejecutivo>(`/crm/ejecutivos/${id}`, c).then(r => r.data),
  borrarEjecutivo: (id: number) => apiClient.delete(`/crm/ejecutivos/${id}`),

  parametros: () => get<ParametroCRM[]>('/crm/parametros'),
  guardarParametro: (clave: string, valor: number) =>
    apiClient.put<ParametroCRM>(`/crm/parametros/${clave}`, { valor }).then(r => r.data),
  restaurarParametro: (clave: string) =>
    apiClient.delete<ParametroCRM>(`/crm/parametros/${clave}`).then(r => r.data),
}
