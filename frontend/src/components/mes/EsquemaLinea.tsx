import React, { useMemo } from 'react'
import { Box, Chip, Stack, Tooltip, Typography, alpha } from '@mui/material'
import { Bolt, CheckCircle, PauseCircle, Warning } from '@mui/icons-material'

export interface NodoEsquema {
  nodo_id: number
  posicion: number
  nombre: string
  tipo: string
  operacion?: string | null
  equipo?: string | null
  pos_x: number
  pos_y: number
  es_cuello_botella: boolean
  cantidad_entrante: number
  cantidad_producida: number
  cantidad_scrap: number
  cantidad_disponible: number
  estado: string
  puede_reportar: boolean
  parada_abierta?: {
    id: number; tipo: string; causa: string; fecha_inicio: string
  } | null
}

export interface ConexionEsquema {
  origen_id: number
  destino_id: number
  tipo: string
  etiqueta?: string | null
}

interface Props {
  nodos: NodoEsquema[]
  conexiones: ConexionEsquema[]
  unidad: string
  onEstacion: (n: NodoEsquema) => void
  seleccionado?: number | null
}

const ANCHO = 190
const ALTO = 108

const COLOR: Record<string, string> = {
  PENDIENTE: '#94A3B8',
  EN_PROGRESO: '#2563EB',
  PAUSADA: '#D97706',
  COMPLETADA: '#16A34A',
  CANCELADA: '#DC2626',
}

const num = (v: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(v || 0)

/**
 * El esquema de la línea, con la orden avanzando por él.
 *
 * POR QUÉ EL DIBUJO Y NO UNA LISTA
 * Una línea de producción no es una fila: se abre en dos cuando hay dos
 * máquinas en paralelo, se devuelve cuando hay reproceso y recibe material en
 * varios puntos. Una lista de tarjetas solo sabe contar la fila india, y el
 * operario que está frente a la máquina no reconoce en ella la planta donde
 * trabaja. Acá se dibuja el mismo esquema que se configuró en «Plantas &
 * Líneas», con las mismas coordenadas, y sobre él se ve por dónde va la orden.
 *
 * Se pulsa una estación para reportar. El estado se lee del color y del número,
 * sin abrir nada: verde ya cerró, azul está produciendo, ámbar está parada, gris
 * todavía no ha recibido material.
 */
export function EsquemaLinea({
  nodos, conexiones, unidad, onEstacion, seleccionado,
}: Props) {
  // El lienzo se ajusta a lo que hay. Se normaliza porque las coordenadas vienen
  // del editor y pueden empezar en cualquier punto, incluso negativo.
  const caja = useMemo(() => {
    if (!nodos.length) return { minX: 0, minY: 0, ancho: 0, alto: 0 }
    const xs = nodos.map(n => n.pos_x)
    const ys = nodos.map(n => n.pos_y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return {
      minX, minY,
      ancho: Math.max(...xs) - minX + ANCHO + 40,
      alto: Math.max(...ys) - minY + ALTO + 40,
    }
  }, [nodos])

  const posicion = (n: NodoEsquema) => ({
    x: n.pos_x - caja.minX + 20,
    y: n.pos_y - caja.minY + 20,
  })

  const porId = useMemo(
    () => Object.fromEntries(nodos.map(n => [n.nodo_id, n])), [nodos])

  if (!nodos.length) return null

  return (
    <Box sx={{
      position: 'relative', overflow: 'auto', borderRadius: 3,
      border: '1px solid #E2E8F0', bgcolor: '#F8FAFC',
      // La cuadrícula da la sensación de plano de planta y ayuda a ubicar las
      // máquinas cuando el esquema es grande.
      backgroundImage:
        'radial-gradient(circle at 1px 1px, rgba(100,116,139,.16) 1px, transparent 0)',
      backgroundSize: '22px 22px',
      p: 1,
    }}>
      <Box sx={{ position: 'relative',
                 width: Math.max(caja.ancho, 600),
                 height: Math.max(caja.alto, 260) }}>
        <svg width="100%" height="100%"
             style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
            </marker>
          </defs>
          {conexiones.map((c, i) => {
            const a = porId[c.origen_id]
            const b = porId[c.destino_id]
            if (!a || !b) return null
            const pa = posicion(a)
            const pb = posicion(b)
            const x1 = pa.x + ANCHO
            const y1 = pa.y + ALTO / 2
            const x2 = pb.x
            const y2 = pb.y + ALTO / 2
            // Curva suave: con líneas rectas, dos conexiones que se cruzan se
            // vuelven indistinguibles en cuanto la línea tiene bifurcaciones.
            const d = `M ${x1} ${y1} C ${x1 + 46} ${y1}, ${x2 - 46} ${y2}, ${x2} ${y2}`
            const retrabajo = c.tipo === 'RETRABAJO'
            return (
              <path key={i} d={d} fill="none"
                    stroke={retrabajo ? '#F59E0B' : '#94A3B8'}
                    strokeWidth={retrabajo ? 2 : 2.4}
                    strokeDasharray={retrabajo ? '6 5' : undefined}
                    markerEnd="url(#punta)" />
            )
          })}
        </svg>

        {nodos.map((n) => {
          const p = posicion(n)
          const color = n.parada_abierta ? COLOR.PAUSADA
            : COLOR[n.estado] ?? COLOR.PENDIENTE
          const meta = n.cantidad_entrante || 0
          const pct = meta > 0
            ? Math.min(100, (n.cantidad_producida / meta) * 100) : 0
          const activo = seleccionado === n.nodo_id
          return (
            <Tooltip key={n.nodo_id} arrow
                     title={n.parada_abierta
                       ? `Parada: ${n.parada_abierta.causa}`
                       : n.puede_reportar
                       ? `Puede reportar hasta ${num(n.cantidad_disponible)} ${unidad}`
                       : n.estado === 'COMPLETADA'
                       ? 'Estación cerrada para esta orden'
                       : 'Esperando material de la estación anterior'}>
              <Box
                onClick={() => onEstacion(n)}
                sx={{
                  position: 'absolute', left: p.x, top: p.y,
                  width: ANCHO, height: ALTO,
                  borderRadius: 2.5, bgcolor: '#fff', cursor: 'pointer',
                  border: `2px solid ${activo ? color : alpha(color, .45)}`,
                  boxShadow: activo
                    ? `0 0 0 4px ${alpha(color, .18)}`
                    : '0 1px 3px rgba(15,23,42,.08)',
                  transition: 'transform .12s, box-shadow .12s',
                  '&:hover': { transform: 'translateY(-2px)',
                               boxShadow: `0 6px 18px ${alpha(color, .3)}` },
                  p: 1.25, display: 'flex', flexDirection: 'column',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    bgcolor: alpha(color, .16), color,
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>{n.posicion}</Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1.15,
                                    flex: 1, minWidth: 0 }} noWrap>
                    {n.nombre}
                  </Typography>
                  {n.parada_abierta ? <PauseCircle sx={{ fontSize: 17, color }} />
                    : n.estado === 'COMPLETADA' ? <CheckCircle sx={{ fontSize: 17, color }} />
                    : n.es_cuello_botella ? <Bolt sx={{ fontSize: 17, color: '#B45309' }} />
                    : null}
                </Stack>

                <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                  {n.operacion ?? n.tipo.toLowerCase()}
                </Typography>

                <Box sx={{ mt: 'auto' }}>
                  <Box sx={{ height: 6, bgcolor: '#E2E8F0', borderRadius: 3,
                             overflow: 'hidden', mb: 0.5 }}>
                    <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color }} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800,
                                      fontVariantNumeric: 'tabular-nums' }}>
                      {num(n.cantidad_producida)}
                    </Typography>
                    {n.cantidad_scrap > 0 && (
                      <Typography sx={{ fontSize: 11, color: '#DC2626' }}>
                        {num(n.cantidad_scrap)} scrap
                      </Typography>
                    )}
                    {n.parada_abierta && (
                      <Chip size="small" label="PARADA" icon={<Warning />}
                            sx={{ height: 17, fontSize: 9.5, fontWeight: 800,
                                  bgcolor: alpha(color, .16), color }} />
                    )}
                  </Stack>
                </Box>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
    </Box>
  )
}
