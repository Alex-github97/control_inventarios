/**
 * Una orden de trabajo: qué hay que hacer, en qué equipo, y los cambios de
 * estado del técnico (iniciar, esperar repuestos, reanudar, completar).
 */
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, CheckCircle2, PackageSearch, Play, RefreshCw, Truck, UserRound, Wrench } from 'lucide-react-native'
import { ESTADO_OT, PRIORIDAD_OT, TIPO_OT, type EstadoOT, type PrioridadOT } from '@compartido/index'
import {
  Boton, BotonIcono, Campo, Chip, ESPACIO, Esqueleto, EstadoVacio, Fila, HojaInferior, Pantalla, Seccion, Tarjeta, Texto,
} from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { TONO_ESTADO, nombreActivo, type Activo, type Orden } from '@/datos/ordenes'

/** Hora local sin zona, como la guarda el portal: las columnas de fecha de la
 * OT no llevan zona y el servidor rechaza una fecha con ella. */
function ahoraLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const fecha = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : null

export default function DetalleOrden() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { llamar } = useSesion()
  const [orden, setOrden] = useState<Orden | null>(null)
  const [activo, setActivo] = useState<Activo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [cerrar, setCerrar] = useState(false)
  const [notas, setNotas] = useState('')

  const cargar = useCallback(() => (async () => {
    const o = await llamar(api => api.GET('/api/v1/eam/ots/{ot_id}', { params: { path: { ot_id: Number(id) } } }))
    const a = await llamar(api => api.GET('/api/v1/eam/activos/{activo_id}', { params: { path: { activo_id: o.activo_id } } })).catch(() => null)
    return { o, a }
  })().then(
    ({ o, a }) => { setOrden(o); setActivo(a); setError(null) },
    e => setError(e instanceof Error ? e.message : 'No se pudo cargar la orden'),
  ), [id, llamar])

  useEffect(() => { cargar() }, [cargar])

  const cambiar = async (estado: EstadoOT, extra: { observaciones?: string } = {}) => {
    if (!orden) return
    setEnviando(estado)
    const ahora = ahoraLocal()
    try {
      await llamar(api => api.PUT('/api/v1/eam/ots/{ot_id}/estado', {
        params: { path: { ot_id: orden.id } },
        body: {
          estado, ...extra,
          fecha_inicio: estado === 'EN_EJECUCION' && !orden.fecha_inicio ? ahora : undefined,
          fecha_fin: estado === 'COMPLETADA' ? ahora : undefined,
        },
      }))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setCerrar(false)
      await cargar()
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
    } finally {
      setEnviando(null)
    }
  }

  const volver = <BotonIcono icono={ArrowLeft} etiqueta="Volver" onPress={() => router.back()} />

  if (error && !orden) {
    return (
      <Pantalla titulo="Orden" accion={volver}>
        <Tarjeta><EstadoVacio icono={RefreshCw} titulo="No se pudo cargar" detalle={error} accion="Reintentar" onAccion={cargar} /></Tarjeta>
      </Pantalla>
    )
  }
  if (!orden) {
    return (
      <Pantalla titulo="Orden" accion={volver}>
        <Tarjeta style={{ gap: ESPACIO.e4 }}>
          <Esqueleto alto={22} ancho="80%" /><Esqueleto alto={14} ancho="60%" /><Esqueleto alto={14} ancho="40%" />
        </Tarjeta>
      </Pantalla>
    )
  }

  const estado = orden.estado as EstadoOT
  const prioridad = PRIORIDAD_OT[orden.prioridad as PrioridadOT]
  const tipo = TIPO_OT[orden.tipo_ot ?? '']

  return (
    <Pantalla subtitulo={orden.numero} titulo={ESTADO_OT[estado]?.nombre ?? estado} accion={volver}>
      <Tarjeta style={{ gap: ESPACIO.e3 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e2 }}>
          <Chip texto={ESTADO_OT[estado]?.corto ?? estado} tono={TONO_ESTADO[estado] ?? 'neutro'} />
          {prioridad && <Chip texto={prioridad.nombre} tono={orden.prioridad === 'URGENTE' ? 'peligro' : orden.prioridad === 'ALTA' ? 'acento' : 'neutro'} />}
          {tipo && <Chip texto={tipo.nombre} punto={false} />}
        </View>
        <Texto variante="subtitulo">{orden.descripcion}</Texto>
        {orden.observaciones ? <Texto tono="secundario">{orden.observaciones}</Texto> : null}
      </Tarjeta>

      {error && <Texto variante="nota" tono="peligro">{error}</Texto>}

      <View style={{ gap: ESPACIO.e3 }}>
        {(estado === 'PENDIENTE' || estado === 'ASIGNADA') && (
          <Boton titulo="Iniciar orden" icono={Play} tamano="grande" ancho cargando={enviando === 'EN_EJECUCION'} onPress={() => cambiar('EN_EJECUCION')} />
        )}
        {estado === 'EN_EJECUCION' && (
          <>
            <Boton titulo="Completar orden" icono={CheckCircle2} tamano="grande" ancho onPress={() => setCerrar(true)} />
            <Boton titulo="En espera de repuestos" icono={PackageSearch} variante="secundario" ancho
              cargando={enviando === 'EN_ESPERA_REPUESTOS'} onPress={() => cambiar('EN_ESPERA_REPUESTOS')} />
          </>
        )}
        {estado === 'EN_ESPERA_REPUESTOS' && (
          <Boton titulo="Reanudar orden" icono={Play} tamano="grande" ancho cargando={enviando === 'EN_EJECUCION'} onPress={() => cambiar('EN_EJECUCION')} />
        )}
      </View>

      <Seccion titulo="Equipo y responsable">
        <Tarjeta relleno={0} style={{ overflow: 'hidden' }}>
          <Fila titulo={nombreActivo(activo)} icono={Truck}
            detalle={[activo?.odometro_actual != null ? `Odómetro ${activo.odometro_actual.toLocaleString('es-CO')} km` : null,
              activo?.horometro_actual != null ? `Horómetro ${activo.horometro_actual.toLocaleString('es-CO')} h` : null].filter(Boolean).join(' · ') || undefined} />
          <Fila titulo={orden.tecnico_asignado || 'Sin técnico asignado'} detalle={orden.contratista_id ? 'Contratista externo' : 'Taller interno'} icono={UserRound} />
          <Fila titulo="Fechas" icono={Wrench} ultima detalle={[
            fecha(orden.fecha_requerida) && `Requerida ${fecha(orden.fecha_requerida)}`,
            fecha(orden.fecha_inicio) && `Inició ${fecha(orden.fecha_inicio)}`,
            fecha(orden.fecha_fin) && `Terminó ${fecha(orden.fecha_fin)}`,
          ].filter(Boolean).join('\n') || 'Sin fechas registradas'} />
        </Tarjeta>
      </Seccion>

      <HojaInferior visible={cerrar} onCerrar={() => setCerrar(false)} titulo="Completar orden">
        <Texto tono="secundario">Quedará cerrada con la hora actual. Los repuestos y las horas se registran en el portal.</Texto>
        <Campo etiqueta="Observaciones del cierre (opcional)" valor={notas} onCambio={setNotas} multilinea placeholder="Qué se hizo, qué se encontró" />
        <Boton titulo="Completar" icono={CheckCircle2} tamano="grande" ancho cargando={enviando === 'COMPLETADA'}
          onPress={() => cambiar('COMPLETADA', notas.trim() ? { observaciones: notas.trim() } : {})} />
      </HojaInferior>
    </Pantalla>
  )
}
