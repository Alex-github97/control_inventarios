/**
 * AGS · Agenda de Servicios — tipos y utilidades compartidas.
 *
 * Todo el módulo habla el mismo lenguaje desde aquí: los tipos que devuelve
 * el backend, el formato de pesos y los colores de cada estado.
 */

export const AGS_COLOR = '#A21CAF'
export const AGS_DARK = '#86198F'
export const AGS_LIGHT = '#F5D0FE'

// ── Formato de dinero ──────────────────────────────────────────────────
// El peso colombiano no maneja centavos en la práctica: mostrarlos solo
// ensucia la lectura de una lista de precios.
export function fmtCOP(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '$0'
  return '$' + Math.round(v).toLocaleString('es-CO')
}

/** Versión compacta para tarjetas de KPI: $1,2M / $850k */
export function fmtCortoCOP(v?: number | null): string {
  if (!v) return '$0'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (abs >= 10_000) return '$' + Math.round(v / 1000) + 'k'
  return fmtCOP(v)
}

export function fmtMinutos(min?: number | null): string {
  if (!min) return '0 min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** "24/08/2026" */
export function fmtFecha(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** "lun 24 ago" */
export function fmtFechaCorta(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })
}

/** "09:00" — se lee del texto ISO y no del objeto Date para no aplicarle
 *  la zona del navegador: el backend ya entrega la hora local del negocio. */
export function fmtHora(iso?: string | null): string {
  if (!iso) return '—'
  const m = /T(\d{2}:\d{2})/.exec(iso)
  return m ? m[1] : '—'
}

export function fmtFechaHora(iso?: string | null): string {
  if (!iso) return '—'
  return `${fmtFecha(iso)} ${fmtHora(iso)}`
}

/** Fecha de hoy como YYYY-MM-DD en hora local (no UTC). */
export function hoyISO(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function sumarDiasISO(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Primer día del mes de la fecha dada. */
export function inicioMesISO(iso = hoyISO()): string {
  return `${iso.slice(0, 7)}-01`
}

// ── Estados de la cita ─────────────────────────────────────────────────
export const ESTADOS_CITA = [
  { valor: 'AGENDADA',   label: 'Agendada',   color: '#0284C7', descripcion: 'Reservada, sin confirmar' },
  { valor: 'CONFIRMADA', label: 'Confirmada', color: '#7C3AED', descripcion: 'El cliente confirmó que viene' },
  { valor: 'EN_CURSO',   label: 'En curso',   color: '#CA8A04', descripcion: 'Se está atendiendo' },
  { valor: 'COMPLETADA', label: 'Completada', color: '#16A34A', descripcion: 'Atendida y cobrada' },
  { valor: 'CANCELADA',  label: 'Cancelada',  color: '#64748B', descripcion: 'Cancelada con aviso' },
  { valor: 'NO_ASISTIO', label: 'No asistió', color: '#DC2626', descripcion: 'El cliente no llegó' },
] as const

export function estadoCita(valor?: string | null) {
  return ESTADOS_CITA.find(e => e.valor === valor)
    ?? { valor: valor ?? '', label: valor ?? '—', color: '#64748B', descripcion: '' }
}

/** Acciones posibles según el estado actual (espeja las transiciones del backend). */
export const TRANSICIONES_CITA: Record<string, string[]> = {
  AGENDADA:   ['CONFIRMADA', 'EN_CURSO', 'CANCELADA', 'NO_ASISTIO'],
  CONFIRMADA: ['EN_CURSO', 'CANCELADA', 'NO_ASISTIO'],
  EN_CURSO:   ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA:  [],
  NO_ASISTIO: [],
}

export const MEDIOS_PAGO = [
  { valor: 'EFECTIVO',      label: 'Efectivo' },
  { valor: 'NEQUI',         label: 'Nequi' },
  { valor: 'DAVIPLATA',     label: 'Daviplata' },
  { valor: 'TRANSFERENCIA', label: 'Transferencia' },
  { valor: 'TARJETA',       label: 'Tarjeta' },
  { valor: 'QR',            label: 'QR' },
  { valor: 'CREDITO',       label: 'Crédito (queda por cobrar)' },
] as const

export const ORIGENES_CITA = [
  { valor: 'MOSTRADOR', label: 'Mostrador' },
  { valor: 'TELEFONO',  label: 'Teléfono' },
  { valor: 'WHATSAPP',  label: 'WhatsApp' },
  { valor: 'ONLINE',    label: 'Agenda online' },
] as const

export const TIPOS_NEGOCIO = [
  { valor: 'SALON_BELLEZA', label: 'Salón de belleza' },
  { valor: 'BARBERIA',      label: 'Barbería' },
  { valor: 'SPA',           label: 'Spa / estética' },
  { valor: 'UNAS',          label: 'Salón de uñas' },
  { valor: 'PLOMERIA',      label: 'Plomería' },
  { valor: 'CONSTRUCCION',  label: 'Albañilería / remodelación' },
  { valor: 'ELECTRICIDAD',  label: 'Electricidad' },
  { valor: 'TECNICO',       label: 'Servicio técnico a domicilio' },
  { valor: 'OTRO',          label: 'Otro' },
] as const

export const DIAS_SEMANA = [
  { valor: 1, label: 'Lunes',     corto: 'Lun' },
  { valor: 2, label: 'Martes',    corto: 'Mar' },
  { valor: 3, label: 'Miércoles', corto: 'Mié' },
  { valor: 4, label: 'Jueves',    corto: 'Jue' },
  { valor: 5, label: 'Viernes',   corto: 'Vie' },
  { valor: 6, label: 'Sábado',    corto: 'Sáb' },
  { valor: 7, label: 'Domingo',   corto: 'Dom' },
] as const

// ── Tipos del backend ──────────────────────────────────────────────────

export interface AGSConfigData {
  id: number
  nombre_negocio: string
  tipo_negocio?: string | null
  nit?: string | null
  telefono?: string | null
  direccion?: string | null
  ciudad?: string | null
  hora_apertura?: string | null
  hora_cierre?: string | null
  dias_laborales?: number[] | null
  intervalo_agenda_min?: number | null
  moneda?: string | null
  iva_pct?: number | null
  comision_defecto_pct?: number | null
  permite_sobrecupo?: boolean | null
  anticipacion_minima_min?: number | null
  tolerancia_no_show_min?: number | null
  mensaje_recordatorio?: string | null
  // Reserva online (página pública /reservar/{slug})
  reserva_online_activa?: boolean | null
  slug?: string | null
  mensaje_bienvenida?: string | null
  dias_max_anticipacion?: number | null
  max_citas_pendientes_cliente?: number | null
  permite_cancelar_online?: boolean | null
  horas_min_cancelacion?: number | null
  requiere_confirmacion_online?: boolean | null
}

export interface Categoria {
  id: number
  nombre: string
  descripcion?: string | null
  color?: string | null
  orden?: number | null
  activo?: boolean | null
  total_servicios?: number
}

export interface Servicio {
  id: number
  codigo: string
  nombre: string
  categoria_id?: number | null
  categoria_nombre?: string | null
  categoria_color?: string | null
  descripcion?: string | null
  duracion_min: number
  precio: number
  costo_insumos?: number | null
  comision_pct?: number | null
  permite_domicilio?: boolean | null
  cobra_materiales?: boolean | null
  requiere_anticipo?: boolean | null
  color?: string | null
  activo?: boolean | null
  margen?: number | null
  margen_pct?: number | null
  veces_vendido?: number
}

export interface Horario {
  id?: number
  profesional_id?: number
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  activo?: boolean | null
}

export interface Profesional {
  id: number
  codigo: string
  nombre: string
  documento?: string | null
  telefono?: string | null
  email?: string | null
  especialidad?: string | null
  color?: string | null
  comision_pct?: number | null
  salario_base?: number | null
  fecha_ingreso?: string | null
  acepta_domicilio?: boolean | null
  notas?: string | null
  activo?: boolean | null
  horarios?: Horario[]
  servicios_ids?: number[]
  citas_mes?: number
  ingresos_mes?: number
}

export interface Cliente {
  id: number
  codigo: string
  nombre: string
  documento?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  barrio?: string | null
  ciudad?: string | null
  fecha_nacimiento?: string | null
  como_nos_conocio?: string | null
  acepta_recordatorios?: boolean | null
  notas?: string | null
  activo?: boolean | null
  total_citas?: number
  citas_completadas?: number
  citas_no_asistio?: number
  total_gastado?: number
  ticket_promedio?: number
  ultima_visita?: string | null
  proxima_cita?: string | null
  saldo_pendiente?: number
}

export interface LineaServicio {
  id: number
  servicio_id?: number | null
  nombre_servicio: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  duracion_min: number
}

export interface LineaMaterial {
  id: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Pago {
  id: number
  fecha: string
  monto: number
  medio_pago?: string | null
  tipo?: string | null
  referencia?: string | null
  notas?: string | null
}

export interface Cita {
  id: number
  codigo: string
  cliente_id: number
  cliente?: string | null
  cliente_telefono?: string | null
  profesional_id: number
  profesional?: string | null
  profesional_color?: string | null
  fecha_inicio: string
  fecha_fin: string
  duracion_min: number
  lugar?: string | null
  direccion_servicio?: string | null
  estado: string
  origen?: string | null
  subtotal: number
  descuento: number
  descuento_motivo?: string | null
  total_materiales: number
  propina: number
  total: number
  pagado: boolean
  total_pagado: number
  saldo: number
  medio_pago?: string | null
  fecha_pago?: string | null
  comision_profesional: number
  notas?: string | null
  motivo_cancelacion?: string | null
  recordatorio_enviado: boolean
  servicios_texto?: string
  servicios?: LineaServicio[]
  materiales?: LineaMaterial[]
  pagos?: Pago[]
}

export interface SlotDisponible {
  hora_inicio: string
  hora_fin: string
  inicio: string
  fin: string
}

export interface DisponibilidadProfesional {
  profesional_id: number
  profesional: string
  color?: string | null
  trabaja: boolean
  motivo_no_disponible?: string | null
  jornada: string[]
  slots: SlotDisponible[]
  minutos_disponibles: number
  minutos_ocupados: number
  ocupacion_pct: number
}

export interface Ausencia {
  id: number
  profesional_id?: number | null
  profesional_nombre?: string | null
  fecha_inicio: string
  fecha_fin: string
  motivo?: string | null
  tipo?: string | null
}

export interface PuntoIngreso {
  periodo: string
  fecha: string
  citas: number
  servicios: number
  materiales: number
  descuentos: number
  propinas: number
  total: number
  comisiones: number
  utilidad: number
}

export interface ResumenIngresos {
  desde: string
  hasta: string
  agrupar: string
  citas_completadas: number
  citas_canceladas: number
  citas_no_asistio: number
  total_servicios: number
  total_materiales: number
  total_descuentos: number
  total_propinas: number
  total_ingresos: number
  total_comisiones: number
  utilidad_bruta: number
  ticket_promedio: number
  por_cobrar: number
  tasa_no_show_pct: number
  serie: PuntoIngreso[]
}

export interface ProduccionProfesional {
  profesional_id: number
  profesional: string
  color?: string | null
  citas: number
  servicios: number
  ingresos: number
  comision: number
  propinas: number
  ticket_promedio: number
  minutos_trabajados: number
  minutos_disponibles: number
  ocupacion_pct: number
  no_show: number
}

export interface VentaServicio {
  servicio_id?: number | null
  servicio: string
  categoria?: string | null
  veces: number
  cantidad: number
  ingresos: number
  participacion_pct: number
  minutos: number
  ingreso_por_hora: number
}

export interface ClienteRanking {
  cliente_id: number
  cliente: string
  telefono?: string | null
  citas: number
  ingresos: number
  ticket_promedio: number
  ultima_visita?: string | null
  dias_sin_venir?: number | null
  saldo_pendiente: number
  no_show: number
}

export interface LineaCaja {
  medio_pago: string
  movimientos: number
  total: number
}

export interface CierreCaja {
  fecha: string
  total_recaudado: number
  movimientos: number
  efectivo: number
  digital: number
  por_medio: LineaCaja[]
  citas_atendidas: number
  citas_pendientes_pago: number
  saldo_por_cobrar: number
  comisiones_generadas: number
}

export interface CitaResumen {
  id: number
  codigo: string
  hora: string
  fecha_inicio: string
  cliente: string
  telefono?: string | null
  profesional?: string | null
  profesional_color?: string | null
  servicios: string
  estado: string
  total: number
  lugar?: string | null
}

export interface DashboardAGS {
  fecha: string
  negocio?: string | null
  citas_hoy: number
  atendidas_hoy: number
  pendientes_hoy: number
  ingresos_hoy: number
  recaudado_hoy: number
  ocupacion_hoy_pct: number
  citas_mes: number
  ingresos_mes: number
  ticket_promedio_mes: number
  comisiones_mes: number
  ingresos_mes_anterior: number
  variacion_pct?: number | null
  por_cobrar: number
  citas_por_cobrar: number
  no_show_mes: number
  tasa_no_show_pct: number
  clientes_nuevos_mes: number
  clientes_activos: number
  sin_recordatorio: number
  agenda_hoy: CitaResumen[]
  proximas: CitaResumen[]
  top_servicios: VentaServicio[]
}

export interface HistorialCliente {
  cliente_id: number
  nombre: string
  total_citas: number
  total_gastado: number
  ticket_promedio: number
  saldo_pendiente: number
  dias_desde_ultima?: number | null
  servicio_favorito?: string | null
  citas: {
    id: number
    codigo: string
    fecha_inicio: string
    estado: string
    profesional?: string | null
    servicios: string
    total: number
    total_pagado: number
    medio_pago?: string | null
  }[]
}

export interface Recordatorio {
  cita_id: number
  cliente: string
  telefono?: string | null
  mensaje: string
  enlace_whatsapp?: string | null
}
