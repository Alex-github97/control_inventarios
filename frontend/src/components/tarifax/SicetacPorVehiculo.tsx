/**
 * Costo SICETAC promedio por mes de cada tipo de vehículo, con la variación
 * frente al mes anterior en cada punto (como el informe de costos por
 * tipología). Una línea por tipo de vehículo, rotulada al final con su nombre
 * y su último valor; el porcentaje de cada punto va con flecha, así que la
 * subida o bajada no depende solo del color.
 */
import { Box, Stack, Typography } from '@mui/material'
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface SerieVehiculo {
  categoria: string; tipo_vehiculo: string | null; tarifas: number
  puntos: { periodo: string; nombre: string; sicetac_prom: number; tarifas: number; var_mes_anterior: number | null }[]
}

// Paleta categórica validada (orden fijo, nunca ciclado). El color sigue al
// vehículo, no a su posición: se asigna por el orden alfabético de TODOS los
// vehículos, así un filtro no repinta los que quedan.
const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const GRILLA = '#e6e5e0'
const TINTA = '#52514e'
const pesos = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const millones = (v: number) => `$ ${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
const variacion = (v: number | null | undefined) => v == null ? '' : `${v > 0 ? '▲' : v < 0 ? '▼' : '='} ${v > 0 ? '+' : ''}${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`
const corto = (nombre: string) => nombre.replace(/ \d{4}$/, '').slice(0, 3).toLowerCase()

export function SicetacPorVehiculo({ series, todas }: { series: SerieVehiculo[]; todas: string[] }) {
  if (!series.length) return null
  const color = (cat: string) => {
    const i = [...todas].sort().indexOf(cat)
    return PALETA[(i < 0 ? 0 : i) % PALETA.length]
  }
  const meses = series[0].puntos.map(p => p.periodo)
  const datos = meses.map(per => {
    const fila: Record<string, number | string | null> = { periodo: per, mes: '' }
    for (const s of series) {
      const p = s.puntos.find(x => x.periodo === per)
      if (!p) continue
      fila.mes = corto(p.nombre)
      fila[s.categoria] = p.sicetac_prom
      fila[`${s.categoria}__var`] = p.var_mes_anterior
    }
    return fila
  })
  const ultimo = datos.length - 1
  if (meses.length < 2) return (
    <Typography fontSize={13} color="text.secondary" sx={{ py: 3 }}>Se necesitan al menos dos meses cargados para ver la evolución por tipo de vehículo.</Typography>
  )
  return (
    <Box>
      {/* Leyenda: con varias líneas siempre hay una, además del rótulo al final de cada línea. */}
      <Stack direction="row" gap={2} flexWrap="wrap" mb={1}>
        {series.map(s => (
          <Stack key={s.categoria} direction="row" alignItems="center" gap={0.75}>
            <Box sx={{ width: 14, height: 3, borderRadius: 2, bgcolor: color(s.categoria) }} />
            <Typography fontSize={12} color="text.secondary">{s.categoria}{s.tipo_vehiculo ? ` (${s.tipo_vehiculo})` : ''}</Typography>
          </Stack>
        ))}
      </Stack>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={datos} margin={{ top: 28, right: 130, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRILLA} vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRILLA }} padding={{ left: 24, right: 24 }} />
          <YAxis tickFormatter={millones} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} domain={['auto', 'auto']} />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const fila = payload[0].payload as Record<string, number | null>
            const nombre = series[0].puntos.find(p => p.periodo === (fila.periodo as unknown as string))?.nombre ?? label
            return (
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.75 }}>
                <Typography fontSize={12} fontWeight={700} mb={0.25}>{nombre}</Typography>
                {series.map(s => fila[s.categoria] != null && (
                  <Stack key={s.categoria} direction="row" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color(s.categoria) }} />
                    <Typography fontSize={12} sx={{ minWidth: 96 }}>{s.categoria}</Typography>
                    <Typography fontSize={12} fontWeight={700} sx={{ minWidth: 92, textAlign: 'right' }}>{pesos(fila[s.categoria])}</Typography>
                    <Typography fontSize={12} color="text.secondary">{variacion(fila[`${s.categoria}__var`])}</Typography>
                  </Stack>
                ))}
              </Box>
            )
          }} />
          {series.map(s => (
            <Line key={s.categoria} type="linear" dataKey={s.categoria} stroke={color(s.categoria)} strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false}>
              {/* Variación frente al mes anterior sobre cada punto; al final, nombre y último valor. */}
              <LabelList dataKey={s.categoria} content={({ x, y, index, value }: any) => {
                if (value == null) return null
                const v = datos[index]?.[`${s.categoria}__var`] as number | null
                if (index === ultimo) return (
                  <g>
                    <text x={Number(x) + 10} y={Number(y) - 2} fontSize={11} fontWeight={700} fill={TINTA}>{s.categoria}</text>
                    <text x={Number(x) + 10} y={Number(y) + 11} fontSize={10.5} fill={TINTA}>{millones(Number(value))} {variacion(v)}</text>
                  </g>
                )
                if (v == null) return null
                return <text x={Number(x)} y={Number(y) - 9} textAnchor="middle" fontSize={10} fill={TINTA}>{variacion(v)}</text>
              }} />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
