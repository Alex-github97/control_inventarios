/**
 * Diagrama de Gantt.
 *
 * Dibujado a mano en SVG en vez de con una librería. Un Gantt es una escala de
 * tiempo y unos rectángulos: la librería habría traído su propio sistema de
 * estilos, su propia forma de manejar el arrastre y 300 kB al paquete, para
 * resolver algo que cabe en un archivo.
 *
 * Cada fila lleva DOS barras: el plan (`inicio_plan` → `vence`) y lo real
 * (`iniciado` → `resuelto`). Con una sola no se puede ver si el plan se está
 * cumpliendo, que es lo único que un Gantt sirve para responder. La barra real
 * va más delgada y encima, así se comparan de un vistazo.
 *
 * Las flechas entre barras son los vínculos de tipo «bloquea».
 */
import { useMemo, useState } from 'react'
import {
  Box, Stack, Typography, Chip, Skeleton, Alert, Tooltip, ToggleButton,
  ToggleButtonGroup, Button,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { gestionApi, type BarraGantt, type Proyecto } from './api'

const ALTO_FILA = 34
const ANCHO_ETIQUETAS = 260

const COLOR_CATEGORIA: Record<string, string> = {
  SIN_CLASIFICAR: PALETA.acero,
  POR_HACER: PALETA.grafito,
  EN_CURSO: COLOR_MODULO,
  TERMINADO: ESTADO.exito,
}

const ESCALAS = {
  dia: { px: 34, titulo: 'Días' },
  semana: { px: 14, titulo: 'Semanas' },
  mes: { px: 5, titulo: 'Meses' },
} as const

type Escala = keyof typeof ESCALAS

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
               'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function aDia(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dias(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export default function GestionGantt({
  proyecto, onAbrir,
}: {
  proyecto: Proyecto
  onAbrir: (id: number) => void
}) {
  const [escala, setEscala] = useState<Escala>('dia')
  const [conTerminadas, setConTerminadas] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['gestion', 'gantt', proyecto.id, conTerminadas],
    queryFn: () => gestionApi.gantt(proyecto.id, { incluir_terminadas: conTerminadas }),
  })

  const plano = useMemo(() => {
    if (!data?.barras.length) return null

    // El lienzo abarca todas las fechas más un margen, y siempre incluye hoy:
    // un Gantt donde no se ve el día de hoy no dice si algo va tarde.
    const momentos: Date[] = []
    data.barras.forEach(b => {
      ;[b.inicio_plan, b.vence, b.iniciado, b.resuelto].forEach(f => {
        const d = aDia(f)
        if (d) momentos.push(d)
      })
    })
    const hoy = new Date()
    momentos.push(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))

    const min = new Date(Math.min(...momentos.map(d => d.getTime())))
    const max = new Date(Math.max(...momentos.map(d => d.getTime())))
    min.setDate(min.getDate() - 2)
    max.setDate(max.getDate() + 3)

    const total = Math.max(dias(min, max), 1)
    const px = ESCALAS[escala].px
    return { min, max, total, px, ancho: total * px }
  }, [data, escala])

  if (isLoading) return <Skeleton variant="rounded" height={340} />

  if (!data?.barras.length) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Todavía no hay ninguna incidencia con fechas. Póngale fecha de inicio y
          de vencimiento a alguna —desde su detalle— y aparecerá acá.
        </Alert>
        {!!data?.sin_fechas.length && <SinFechas filas={data.sin_fechas} onAbrir={onAbrir} />}
      </Box>
    )
  }

  const { min, total, px, ancho } = plano!
  const hoy = new Date()
  const xHoy = dias(min, new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) * px

  // Las marcas de la escala: cada día, cada lunes o cada primero de mes.
  const marcas: { x: number; texto: string; fuerte: boolean }[] = []
  for (let i = 0; i <= total; i++) {
    const d = new Date(min)
    d.setDate(d.getDate() + i)
    const esLunes = d.getDay() === 1
    const esPrimero = d.getDate() === 1
    if (escala === 'dia') {
      marcas.push({ x: i * px, texto: String(d.getDate()), fuerte: esLunes })
    } else if (escala === 'semana' && esLunes) {
      marcas.push({ x: i * px, texto: `${d.getDate()} ${MESES[d.getMonth()]}`, fuerte: esPrimero })
    } else if (escala === 'mes' && esPrimero) {
      marcas.push({ x: i * px, texto: `${MESES[d.getMonth()]} ${d.getFullYear() % 100}`, fuerte: true })
    }
  }

  const porId = new Map(data.barras.map((b, i) => [b.id, i]))
  const alto = data.barras.length * ALTO_FILA

  function tramo(desde?: string | null, hasta?: string | null) {
    const a = aDia(desde)
    const b = aDia(hasta)
    if (!a && !b) return null
    // Con una sola fecha se dibuja un tramo mínimo: una barra invisible sería
    // indistinguible de no tener fechas.
    const ini = a ?? b!
    const fin = b ?? a!
    const x = dias(min, ini) * px
    const w = Math.max((dias(ini, fin) + 1) * px, px * 0.8)
    return { x, w }
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5} flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small" exclusive value={escala}
          onChange={(_, v) => v && setEscala(v)}
        >
          {(Object.keys(ESCALAS) as Escala[]).map(e => (
            <ToggleButton key={e} value={e} sx={{ textTransform: 'none', px: 1.5 }}>
              {ESCALAS[e].titulo}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Button size="small" onClick={() => setConTerminadas(!conTerminadas)}
          sx={{ textTransform: 'none' }}>
          {conTerminadas ? 'Ocultar terminadas' : 'Mostrar terminadas'}
        </Button>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Leyenda color={PALETA.acero} texto="Plan" alto={9} />
          <Leyenda color={COLOR_MODULO} texto="Real" alto={5} />
          <Leyenda color={ESTADO.peligro} texto="Hoy" alto={9} ancho={2} />
        </Stack>
      </Stack>

      <Box sx={{
        display: 'flex', border: `1px solid ${PALETA.niebla}`, borderRadius: 2,
        overflow: 'hidden', bgcolor: PALETA.lienzo,
      }}>
        {/* Columna fija con las claves. Se queda quieta al desplazar el tiempo:
            una barra sin su nombre a la vista no dice nada. */}
        <Box sx={{ width: ANCHO_ETIQUETAS, flexShrink: 0, borderRight: `1px solid ${PALETA.niebla}` }}>
          <Box sx={{ height: 30, borderBottom: `1px solid ${PALETA.niebla}`, bgcolor: PALETA.bruma }} />
          {data.barras.map(b => (
            <Box
              key={b.id} onClick={() => onAbrir(b.id)}
              sx={{
                height: ALTO_FILA, display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.25, cursor: 'pointer', borderBottom: `1px solid ${PALETA.bruma}`,
                pl: b.nivel === 'SUBTAREA' ? 3 : 1.25,
                '&:hover': { bgcolor: PALETA.bruma },
              }}
            >
              <Typography variant="caption" sx={{
                fontFamily: 'monospace', fontWeight: 700, fontSize: 10.5,
                color: PALETA.acero, flexShrink: 0,
              }}>
                {b.clave}
              </Typography>
              <Typography variant="caption" noWrap sx={{ fontSize: 12 }}>
                {b.resumen}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* La escala de tiempo y las barras */}
        <Box sx={{ flex: 1, overflowX: 'auto' }}>
          <Box sx={{ width: ancho, minWidth: '100%' }}>
            <Box sx={{
              height: 30, position: 'relative', borderBottom: `1px solid ${PALETA.niebla}`,
              bgcolor: PALETA.bruma,
            }}>
              {marcas.map((m, i) => (
                <Typography key={i} variant="caption" sx={{
                  position: 'absolute', left: m.x + 2, top: 7, fontSize: 9.5,
                  color: m.fuerte ? PALETA.grafito : PALETA.acero,
                  fontWeight: m.fuerte ? 700 : 400, whiteSpace: 'nowrap',
                }}>
                  {m.texto}
                </Typography>
              ))}
            </Box>

            <svg width={ancho} height={alto} style={{ display: 'block' }}>
              {/* Rejilla */}
              {marcas.map((m, i) => (
                <line key={i} x1={m.x} y1={0} x2={m.x} y2={alto}
                  stroke={m.fuerte ? PALETA.niebla : PALETA.bruma} strokeWidth={1} />
              ))}
              {data.barras.map((_, i) => (
                <line key={`h${i}`} x1={0} y1={(i + 1) * ALTO_FILA}
                  x2={ancho} y2={(i + 1) * ALTO_FILA}
                  stroke={PALETA.bruma} strokeWidth={1} />
              ))}

              {/* Las flechas de «bloquea a». Van debajo de las barras para que
                  no tapen el texto. */}
              {data.barras.map((b, i) => b.bloquea_a.map(destino => {
                const j = porId.get(destino)
                if (j === undefined) return null
                const desde = tramo(b.inicio_plan ?? b.iniciado, b.vence ?? b.resuelto)
                const hasta = tramo(data.barras[j].inicio_plan ?? data.barras[j].iniciado,
                                    data.barras[j].vence ?? data.barras[j].resuelto)
                if (!desde || !hasta) return null
                const x1 = desde.x + desde.w
                const y1 = i * ALTO_FILA + ALTO_FILA / 2
                const x2 = hasta.x
                const y2 = j * ALTO_FILA + ALTO_FILA / 2
                const medio = x1 + Math.max((x2 - x1) / 2, 8)
                return (
                  <path
                    key={`${b.id}-${destino}`}
                    d={`M ${x1} ${y1} H ${medio} V ${y2} H ${x2}`}
                    fill="none" stroke={ESTADO.alerta} strokeWidth={1.2}
                    strokeDasharray="3 2" markerEnd="url(#punta)"
                  />
                )
              }))}

              <defs>
                <marker id="punta" markerWidth="6" markerHeight="6" refX="5" refY="3"
                  orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={ESTADO.alerta} />
                </marker>
              </defs>

              {/* Las barras */}
              {data.barras.map((b, i) => {
                const y = i * ALTO_FILA
                const plan = tramo(b.inicio_plan, b.vence)
                const real = tramo(b.iniciado, b.resuelto ?? (b.iniciado ? new Date().toISOString() : null))
                const color = COLOR_CATEGORIA[b.categoria ?? ''] ?? PALETA.acero
                // Va tarde si vence antes de hoy y no está terminada.
                const vencida = b.vence && !b.resuelto &&
                  aDia(b.vence)! < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
                return (
                  <g key={b.id} style={{ cursor: 'pointer' }} onClick={() => onAbrir(b.id)}>
                    {plan && (
                      <rect
                        x={plan.x} y={y + 7} width={plan.w} height={12} rx={3}
                        fill={vencida ? `${ESTADO.peligro}33` : `${PALETA.acero}33`}
                        stroke={vencida ? ESTADO.peligro : PALETA.acero} strokeWidth={1}
                      />
                    )}
                    {real && (
                      <rect x={real.x} y={y + 11} width={real.w} height={7} rx={2.5}
                        fill={color} />
                    )}
                    <title>
                      {`${b.clave} · ${b.resumen}\n`}
                      {`Estado: ${b.estado ?? '—'}\n`}
                      {`Responsable: ${b.asignado ?? 'sin asignar'}\n`}
                      {b.inicio_plan || b.vence
                        ? `Plan: ${(b.inicio_plan ?? '').slice(0, 10)} → ${(b.vence ?? '').slice(0, 10)}\n`
                        : 'Sin plan\n'}
                      {b.iniciado
                        ? `Real: ${b.iniciado.slice(0, 10)} → ${(b.resuelto ?? 'en curso').slice(0, 10)}`
                        : 'Todavía no ha empezado'}
                    </title>
                  </g>
                )
              })}

              {/* Hoy */}
              <line x1={xHoy} y1={0} x2={xHoy} y2={alto}
                stroke={ESTADO.peligro} strokeWidth={1.5} />
            </svg>
          </Box>
        </Box>
      </Box>

      {!!data.sin_fechas.length && (
        <Box sx={{ mt: 2 }}>
          <SinFechas filas={data.sin_fechas} onAbrir={onAbrir} />
        </Box>
      )}
    </Box>
  )
}

function Leyenda({ color, texto, alto, ancho = 16 }: {
  color: string; texto: string; alto: number; ancho?: number
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ width: ancho, height: alto, bgcolor: color, borderRadius: 0.5 }} />
      <Typography variant="caption" sx={{ color: PALETA.acero, fontSize: 10.5 }}>
        {texto}
      </Typography>
    </Stack>
  )
}

/** Las que no tienen ninguna fecha.
 *
 *  Se listan y no se esconden: desaparecer de la pantalla se lee como que se
 *  perdieron, y lo que hace falta es justo lo contrario —verlas para poder
 *  ponerles fecha—. */
function SinFechas({ filas, onAbrir }: { filas: any[]; onAbrir: (id: number) => void }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: PALETA.bruma }}>
      <Typography variant="caption" sx={{ fontWeight: 800, color: PALETA.acero }}>
        SIN FECHAS ({filas.length}) — no salen en el diagrama hasta que se les ponga plan
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mt={1}>
        {filas.map(t => (
          <Chip
            key={t.id} size="small" label={`${t.clave} ${t.resumen}`}
            onClick={() => onAbrir(t.id)}
            sx={{ height: 22, fontSize: 11, maxWidth: 320 }}
          />
        ))}
      </Stack>
    </Box>
  )
}
