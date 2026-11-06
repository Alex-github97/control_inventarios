/**
 * Barras que filtran el tablero (ver FiltroCruzado).
 *
 * Horizontal para rankings (marca, línea, modo de falla), vertical para el
 * tiempo (meses). El gráfico recibe los grupos ya filtrados por las DEMÁS
 * dimensiones: sus propias barras no desaparecen al elegir una, se atenúan las
 * no elegidas, para que se pueda seguir comparando y sumar otras.
 *
 * El tooltip no repite el número de la barra y ya: dice qué parte del total es,
 * en qué puesto está, cuánto se aparta del promedio (o del mes anterior) y lo
 * que cada tablero agregue en `detalle`.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Box, Card, Divider, Stack, Tooltip as TooltipMui, Typography, Link } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Grupo } from './cubo'
import { useFiltros } from './FiltroCruzado'

export interface LineaDetalle {
  etiqueta: string
  valor: string
  tono?: 'bien' | 'alerta' | 'mal'
}

interface Props {
  dimension: string
  titulo: string
  /** Qué muestra y cómo leerlo: va en el ícono de información del título. */
  ayuda?: ReactNode
  subtitulo?: string
  grupos: Grupo[]
  nombreMedida: string
  formato: (v: number) => string
  orientacion?: 'horizontal' | 'vertical'
  /** Barras visibles; el resto se cuenta en el subtítulo. */
  max?: number
  /** Si la medida se puede sumar (órdenes, costo). Un MTTR no: no hay «% del total». */
  sumable?: boolean
  /** Para medidas donde menos es mejor (MTTR, costo): cambia el sentido de «sobre el promedio». */
  menosEsMejor?: boolean
  color: string
  etiqueta?: (clave: string) => string
  detalle?: (g: Grupo) => LineaDetalle[]
  alto?: number
  vacio?: string
}

const TONO = { bien: '#15803D', alerta: '#B45309', mal: '#B91C1C' }

const pct = (v: number) => `${v.toLocaleString('es-CO', { maximumFractionDigits: v < 10 ? 1 : 0 })}%`

export function GraficoBarras({
  dimension, titulo, ayuda, subtitulo, grupos, nombreMedida, formato, orientacion = 'horizontal',
  max = 12, sumable = true, menosEsMejor = false, color, etiqueta = c => c, detalle, alto, vacio = 'Sin datos con estos filtros',
}: Props) {
  const { filtros, nombres, alternar, elegir, quitar } = useFiltros()
  const elegidos = filtros[dimension] ?? []
  const [arrastre, setArrastre] = useState<{ desde: string; hasta: string } | null>(null)

  const vertical = orientacion === 'vertical'
  const ordenados = useMemo(() => (vertical
    ? [...grupos].sort((a, b) => a.clave.localeCompare(b.clave))
    : [...grupos].filter(g => g.valor > 0 || elegidos.includes(g.clave)).sort((a, b) => b.valor - a.valor)),
  [grupos, vertical, elegidos])
  const visibles = vertical ? ordenados : ordenados.slice(0, max)
  const ocultos = ordenados.length - visibles.length

  const total = grupos.reduce((s, g) => s + g.valor, 0)
  const conValor = grupos.filter(g => g.valor > 0)
  const promedio = conValor.length ? conValor.reduce((s, g) => s + g.valor, 0) / conValor.length : 0
  const puesto = useMemo(() => {
    const p = new Map<string, number>()
    ;[...conValor].sort((a, b) => b.valor - a.valor).forEach((g, i) => p.set(g.clave, i + 1))
    return p
  }, [conValor])

  const claves = visibles.map(g => g.clave)
  const tramo = (a: string, b: string) => {
    const i = claves.indexOf(a), j = claves.indexOf(b)
    if (i < 0 || j < 0) return [a]
    return claves.slice(Math.min(i, j), Math.max(i, j) + 1)
  }

  type EstadoRecharts = { activeLabel?: string | number } | null
  type Evento = { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } | undefined
  const alPresionar = (e: EstadoRecharts) => {
    if (e?.activeLabel != null) setArrastre({ desde: String(e.activeLabel), hasta: String(e.activeLabel) })
  }
  const alMover = (e: EstadoRecharts) => {
    if (arrastre && e?.activeLabel != null && String(e.activeLabel) !== arrastre.hasta)
      setArrastre({ ...arrastre, hasta: String(e.activeLabel) })
  }
  const alSoltar = (_: EstadoRecharts, ev: Evento) => {
    if (!arrastre) return
    const sumar = !!(ev?.ctrlKey || ev?.metaKey || ev?.shiftKey)
    if (arrastre.desde === arrastre.hasta) alternar(dimension, arrastre.desde, sumar)
    else elegir(dimension, tramo(arrastre.desde, arrastre.hasta), sumar)
    setArrastre(null)
  }

  const contenidoTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Grupo }[] }) => {
    if (!active || !payload?.length || arrastre && arrastre.desde !== arrastre.hasta) return null
    const g = payload[0].payload
    const i = ordenados.findIndex(o => o.clave === g.clave)
    const anterior = vertical && i > 0 ? ordenados[i - 1] : null
    const lineas: LineaDetalle[] = []
    if (sumable && total > 0) lineas.push({ etiqueta: 'Del total', valor: pct(g.valor / total * 100) })
    if (!vertical && puesto.has(g.clave)) lineas.push({ etiqueta: 'Puesto', valor: `${puesto.get(g.clave)} de ${conValor.length}` })
    if (anterior && anterior.valor > 0) {
      const d = (g.valor - anterior.valor) / anterior.valor * 100
      const peor = menosEsMejor ? d > 0 : d < 0
      lineas.push({ etiqueta: `Frente a ${etiqueta(anterior.clave)}`, valor: `${d > 0 ? '+' : ''}${pct(d)}`,
        tono: Math.abs(d) < 5 ? undefined : peor ? 'alerta' : 'bien' })
    }
    if (promedio > 0 && conValor.length > 1) {
      const d = (g.valor - promedio) / promedio * 100
      const peor = menosEsMejor ? d > 0 : false
      lineas.push({ etiqueta: vertical ? 'Frente al promedio mensual' : 'Frente al promedio', valor: `${d > 0 ? '+' : ''}${pct(d)}`,
        tono: menosEsMejor && Math.abs(d) >= 15 ? (peor ? 'mal' : 'bien') : undefined })
    }
    const extra = detalle?.(g) ?? []
    const elegido = elegidos.includes(g.clave)
    return (
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: '0 8px 28px rgba(15,23,42,.18)',
        border: '1px solid', borderColor: 'divider', p: 1.5, minWidth: 240, maxWidth: 340 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{nombres[dimension] ?? dimension}</Typography>
        <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.25, mb: 0.5 }}>{etiqueta(g.clave)}</Typography>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Box sx={{ width: 10, height: 3, borderRadius: 2, bgcolor: color, alignSelf: 'center' }} />
          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{formato(g.valor)}</Typography>
          <Typography variant="caption" color="text.secondary">{nombreMedida.toLowerCase()}</Typography>
        </Stack>
        {(lineas.length > 0 || extra.length > 0) && <Divider sx={{ my: 1 }} />}
        {[...lineas, ...extra].map(l => (
          <Stack key={l.etiqueta} direction="row" spacing={2} justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{l.etiqueta}</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ whiteSpace: 'nowrap', textAlign: 'right', color: l.tono ? TONO[l.tono] : 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
              {l.valor}
            </Typography>
          </Stack>
        ))}
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontSize: 10.5 }}>
          {elegido ? 'Clic para quitar el filtro' : 'Clic: filtrar · Ctrl+clic: sumar · arrastrar: tramo'}
        </Typography>
      </Box>
    )
  }

  const fill = (clave: string) => {
    const enArrastre = arrastre && tramo(arrastre.desde, arrastre.hasta).includes(clave)
    const atenuar = elegidos.length > 0 && !elegidos.includes(clave) && !enArrastre
    return { fill: color, fillOpacity: atenuar ? 0.25 : 1 }
  }

  const altura = alto ?? (vertical ? 240 : Math.max(140, visibles.length * 30 + 30))
  const corto = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t)

  return (
    <Card sx={{ borderRadius: 3, p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
        {ayuda && (
          <TooltipMui title={<Box sx={{ fontSize: 12.5, lineHeight: 1.5 }}>{ayuda}</Box>} arrow>
            <InfoOutlined sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
          </TooltipMui>
        )}
        <Box sx={{ flex: 1 }} />
        {elegidos.length > 0 && (
          <Link component="button" variant="caption" onClick={() => quitar(dimension)} underline="hover">
            Quitar ({elegidos.length})
          </Link>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {subtitulo}{ocultos > 0 ? `${subtitulo ? ' · ' : ''}${visibles.length} de ${ordenados.length}, las de mayor valor` : ''}
      </Typography>
      {visibles.length === 0 ? (
        <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>{vacio}</Typography>
      ) : (
        <Box sx={{ mt: 1.5, flex: 1, userSelect: 'none', cursor: 'pointer', '& .recharts-surface': { outline: 'none' } }}
          role="img" aria-label={`${titulo}: ${visibles.map(g => `${etiqueta(g.clave)} ${formato(g.valor)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height={altura}>
            <BarChart data={visibles} layout={vertical ? 'horizontal' : 'vertical'}
              margin={{ top: 4, right: vertical ? 12 : 64, bottom: 0, left: 0 }} barCategoryGap={vertical ? '18%' : 6}
              onMouseDown={alPresionar} onMouseMove={alMover} onMouseUp={alSoltar}
              onMouseLeave={() => setArrastre(null)}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="0" vertical={!vertical} horizontal={vertical} />
              {vertical ? (
                <>
                  <XAxis dataKey="clave" tickFormatter={etiqueta} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => formato(Number(v))} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={64} />
                </>
              ) : (
                <>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="clave" width={128} axisLine={false} tickLine={false}
                    tick={{ fontSize: 11.5, fill: '#374151' }} tickFormatter={c => corto(etiqueta(String(c)), 20)} />
                </>
              )}
              <Tooltip content={contenidoTooltip as never} cursor={{ fill: 'rgba(15,23,42,.05)' }} isAnimationActive={false} />
              <Bar dataKey="valor" radius={vertical ? [4, 4, 0, 0] : [0, 4, 4, 0]} maxBarSize={vertical ? 42 : 18} isAnimationActive={false}
                label={vertical ? undefined : { position: 'right', fontSize: 11, fill: '#374151', formatter: (v: number) => formato(v) }}>
                {visibles.map(g => <Cell key={g.clave} {...fill(g.clave)} />)}
              </Bar>
              {arrastre && arrastre.desde !== arrastre.hasta && (vertical
                ? <ReferenceArea x1={arrastre.desde} x2={arrastre.hasta} fill={color} fillOpacity={0.08} stroke={color} strokeOpacity={0.4} />
                : <ReferenceArea y1={arrastre.desde} y2={arrastre.hasta} fill={color} fillOpacity={0.08} stroke={color} strokeOpacity={0.4} />)}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Card>
  )
}
