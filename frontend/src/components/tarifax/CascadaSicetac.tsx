/**
 * Cascada por mes: SICETAC base → + horas logísticas → SICETAC total →
 * ± diferencia → tarifa del cliente, todo en promedios del mes.
 *
 * Con varios meses se dibuja una cascada por mes (múltiplos pequeños) en la
 * misma escala: así se comparan sin mezclar pasos de meses distintos en un eje.
 * Cada barra lleva su valor escrito y su nombre en el eje: la identidad del
 * paso nunca depende solo del color (el verde agua de las horas queda bajo
 * 3:1 de contraste y cerca del rojo para daltónicos, y la etiqueta lo resuelve).
 */
import { Box, Typography, Stack } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'

export interface MesCascada {
  periodo: string; nombre: string; sicetac_base_prom: number; horas_prom: number
  sicetac_prom: number; tarifa_prom: number; variacion_prom: number | null; tarifas: number
}

export const COLORES_CASCADA = {
  total: '#8a8984',       // SICETAC (total del costo de referencia)
  horas: '#1baf7a',       // horas logísticas que se suman
  encima: '#2a78d6',      // la tarifa del cliente supera a SICETAC
  debajo: '#e34948',      // la tarifa del cliente queda por debajo
  cliente: '#52514e',     // tarifa del cliente
}
const GRILLA = '#e6e5e0'

const millones = (v: number) => `${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 2 })} M`
const pesos = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const pct = (v: number | null) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`

interface Paso { paso: string; base: number; valor: number; color: string; texto: string; detalle: string }

function pasos(m: MesCascada, horas: number): Paso[] {
  const dif = m.tarifa_prom - m.sicetac_prom
  const out: Paso[] = [{ paso: horas ? 'SICETAC viaje' : 'SICETAC', base: 0, valor: m.sicetac_base_prom, color: COLORES_CASCADA.total,
                         texto: millones(m.sicetac_base_prom), detalle: `Costo SICETAC promedio del viaje: ${pesos(m.sicetac_base_prom)}` }]
  if (horas) {
    out.push({ paso: `+${horas} h logísticas`, base: m.sicetac_base_prom, valor: m.horas_prom, color: COLORES_CASCADA.horas,
               texto: `+${millones(m.horas_prom)}`, detalle: `${horas} horas logísticas, en promedio ${pesos(m.horas_prom)} por viaje` })
    out.push({ paso: 'SICETAC total', base: 0, valor: m.sicetac_prom, color: COLORES_CASCADA.total,
               texto: millones(m.sicetac_prom), detalle: `SICETAC con horas logísticas: ${pesos(m.sicetac_prom)}` })
  }
  out.push({ paso: 'Variación', base: Math.min(m.sicetac_prom, m.tarifa_prom), valor: Math.abs(dif),
             color: dif < 0 ? COLORES_CASCADA.debajo : COLORES_CASCADA.encima, texto: pct(m.variacion_prom),
             detalle: `${dif < 0 ? 'Por debajo' : 'Por encima'} de SICETAC: ${pesos(dif)} (${pct(m.variacion_prom)})` })
  out.push({ paso: 'Tarifa cliente', base: 0, valor: m.tarifa_prom, color: COLORES_CASCADA.cliente,
             texto: millones(m.tarifa_prom), detalle: `Tarifa promedio del cliente: ${pesos(m.tarifa_prom)}` })
  return out
}

function Cascada({ mes, horas, maximo, alto }: { mes: MesCascada; horas: number; maximo: number; alto: number }) {
  const datos = pasos(mes, horas)
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke={GRILLA} vertical={false} />
        <XAxis dataKey="paso" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRILLA }} interval={0} />
        <YAxis domain={[0, maximo]} ticks={[0, 1, 2, 3, 4].map(i => (maximo / 4) * i)} tickFormatter={v => millones(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={58} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={({ active, payload }) => active && payload?.[1] ? (
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.75 }}>
            <Typography fontSize={12} fontWeight={700}>{mes.nombre}</Typography>
            <Typography fontSize={12}>{(payload[1].payload as Paso).detalle}</Typography>
          </Box>) : null} />
        {/* La base es invisible: solo levanta los pasos intermedios. */}
        <Bar dataKey="base" stackId="c" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="valor" stackId="c" radius={4} isAnimationActive={false}>
          {datos.map(d => <Cell key={d.paso} fill={d.color} />)}
          {/* Etiqueta propia: la de recharts se parte en dos líneas cuando la barra es angosta. */}
          <LabelList dataKey="texto" content={({ x, y, width, value }: any) => (
            <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b0b0b">{value}</text>
          )} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CascadaSicetac({ meses, horas }: { meses: MesCascada[]; horas: number }) {
  if (!meses.length) return null
  // Una sola escala para todos los meses: si no, dos cascadas iguales se verían distintas.
  // Cuatro tramos iguales de medio millón en medio millón, con aire para las etiquetas.
  const tramo = Math.ceil(Math.max(...meses.flatMap(m => [m.sicetac_prom, m.tarifa_prom])) * 1.12 / 4 / 5e5) * 5e5
  const maximo = tramo * 4
  const varios = meses.length > 1
  return (
    <Box>
      <Stack direction="row" gap={2} flexWrap="wrap" mb={1}>
        {[[COLORES_CASCADA.total, 'SICETAC'], ...(horas ? [[COLORES_CASCADA.horas, 'Horas logísticas']] : []),
          [COLORES_CASCADA.encima, 'Cliente por encima'], [COLORES_CASCADA.debajo, 'Cliente por debajo'],
          [COLORES_CASCADA.cliente, 'Tarifa cliente']].map(([c, l]) => (
          <Stack key={l} direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: c }} />
            <Typography fontSize={11} color="text.secondary">{l}</Typography>
          </Stack>
        ))}
      </Stack>
      <Grid container spacing={2}>
        {meses.map(m => (
          <Grid key={m.periodo} size={{ xs: 12, md: varios ? 6 : 12, xl: varios ? 4 : 12 }}>
            {varios && <Typography fontSize={13} fontWeight={700} mb={0.5}>
              {m.nombre} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>· {m.tarifas} tarifas · variación {pct(m.variacion_prom)}</Box>
            </Typography>}
            <Cascada mes={m} horas={horas} maximo={maximo} alto={varios ? 230 : 300} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
