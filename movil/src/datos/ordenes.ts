/**
 * Órdenes de trabajo del CMMS, tal como las da el servidor (mismos endpoints
 * del portal). Sin caché local todavía: la operación sin señal llega con la
 * sincronización (grupo 4 del OpenSpec).
 */
import { useCallback, useEffect, useState } from 'react'
import type { components } from '@compartido/api/esquema'
import { PRIORIDAD_OT, type PrioridadOT } from '@compartido/index'
import type { TonoChip } from '@/diseno'
import { useSesion, type Usuario } from './sesion'

export type Orden = components['schemas']['OTResponse']
export type Activo = components['schemas']['ActivoResponse']

/** El tono del chip de cada estado (el color sale del sistema de diseño). */
export const TONO_ESTADO: Record<string, TonoChip> = {
  EN_EJECUCION: 'exito', ASIGNADA: 'acento', EN_ESPERA_REPUESTOS: 'alerta', PENDIENTE: 'neutro', COMPLETADA: 'neutro',
}

const ABIERTAS = ['EN_EJECUCION', 'ASIGNADA', 'EN_ESPERA_REPUESTOS', 'PENDIENTE'] as const

/** Si la orden es de este usuario. El técnico se guarda como texto (nombre o
 * usuario) hasta que exista `tecnico_usuario_id` (tarea 4.2). */
export function esMia(o: Orden, u: Usuario | null): boolean {
  const t = (o.tecnico_asignado ?? '').trim().toLowerCase()
  if (!t || !u) return false
  const completo = `${u.nombre} ${u.apellido}`.trim().toLowerCase()
  return t === u.username.toLowerCase() || t === completo || t.includes(completo)
}

const peso = (o: Orden) => (PRIORIDAD_OT[o.prioridad as PrioridadOT]?.orden ?? 9) * 10 + ABIERTAS.indexOf(o.estado as typeof ABIERTAS[number])

export function useOrdenesAbiertas() {
  const { llamar } = useSesion()
  const [ordenes, setOrdenes] = useState<Orden[] | null>(null)
  const [activos, setActivos] = useState<Record<number, Activo>>({})
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Consultar no toca el estado; lo aplican los `.then` (así el efecto de
  // montaje no provoca renders en cascada).
  const consultar = useCallback(async () => {
    const listas = await Promise.all(ABIERTAS.map(estado =>
      llamar(api => api.GET('/api/v1/eam/ots', { params: { query: { estado } } }))))
    const todas = listas.flat().sort((a, b) => peso(a) - peso(b))
    const ids = [...new Set(todas.map(o => o.activo_id))].slice(0, 60)
    const fichas = await Promise.all(ids.map(id =>
      llamar(api => api.GET('/api/v1/eam/activos/{activo_id}', { params: { path: { activo_id: id } } })).catch(() => null)))
    return { todas, activos: Object.fromEntries(fichas.filter((a): a is Activo => !!a).map(a => [a.id, a])) }
  }, [llamar])

  const aplicar = useCallback((p: Promise<{ todas: Orden[]; activos: Record<number, Activo> }>) => p.then(
    r => { setOrdenes(r.todas); setActivos(r.activos); setError(null) },
    e => setError(e instanceof Error ? e.message : 'No se pudieron cargar las órdenes'),
  ).finally(() => setCargando(false)), [])

  useEffect(() => { aplicar(consultar()) }, [aplicar, consultar])
  const recargar = useCallback(() => { setCargando(true); aplicar(consultar()) }, [aplicar, consultar])
  return { ordenes, activos, error, cargando, recargar }
}

export function nombreActivo(a?: Activo | null): string {
  if (!a) return 'Activo'
  return [a.placa || a.codigo, a.nombre || [a.marca, a.modelo].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
}
