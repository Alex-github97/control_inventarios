/**
 * Una línea por grupo (tipo de vehículo, ciudad de origen…) con un punto por
 * mes y su cambio frente al mes anterior, como el informe de costos por
 * tipología. Sirve para pesos (costo; el cambio va en %) y para porcentajes
 * (rentabilidad; el cambio va en puntos porcentuales).
 *
 * - Cada línea se rotula al final con su nombre y su último valor; esos
 *   rótulos se separan solos para no encimarse cuando dos líneas terminan cerca.
 * - Con pocas líneas, el cambio va además sobre cada punto, con flecha (no
 *   depende solo del color). Con muchas, solo en el recuadro al pasar el mouse.
 * - El grupo «otros» va en gris neutro.
 */
import { Box, Stack, Typography } from '@mui/material'
import { CartesianGrid, Customized, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface Linea {
  clave: string; detalle?: string | null; tarifas: number
  puntos: { periodo: string; nombre: string; valor: number; cambio: number | null; tarifas: number }[]
}

// Paleta categórica validada (orden fijo, nunca ciclado). El color sigue al
// grupo, no a su posición: se asigna por orden alfabético.
const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const NEUTRO = '#8a8984'
const GRILLA = '#e6e5e0'
const TINTA = '#52514e'
const MAX_ROTULOS_POR_PUNTO = 5

const num = (v: number, d = 1) => v.toLocaleString('es-CO', { maximumFractionDigits: d })
/** Marcas redondas del eje (1, 2, 2,5 o 5 × 10ⁿ) para unas 5 divisiones, con aire arriba y abajo. */
function marcas(valores: number[]): number[] {
  let min = Math.min(...valores), max = Math.max(...valores)
  if (min === max) { min -= 1; max += 1 }
  const bruto = (max - min) / 5, pot = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map(m => m * pot).find(p => p >= bruto) ?? 10 * pot
  const out: number[] = []
  for (let v = Math.floor(min / paso) * paso; v <= Math.ceil(max / paso) * paso + paso / 2; v += paso) out.push(Math.round(v * 1e6) / 1e6)
  return out
}
const corto = (nombre: string) => nombre.replace(/ \d{4}$/, '').slice(0, 3).toLowerCase()

export function LineasPorMes({ lineas, formato, todas, otros = '', alto = 380 }: {
  lineas: Linea[]; formato: 'pesos' | 'pct'; todas?: string[]; otros?: string; alto?: number
}) {
  const valorTxt = (v: number | null | undefined) => v == null ? '—'
    : formato === 'pesos' ? `$ ${num(v / 1e6)} M` : `${num(v)} %`
  const valorLargo = (v: number | null | undefined) => v == null ? '—'
    : formato === 'pesos' ? v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : `${num(v)} %`
  const cambioTxt = (v: number | null | undefined) => v == null ? ''
    : `${v > 0 ? '▲' : v < 0 ? '▼' : '='} ${v > 0 ? '+' : ''}${num(v)} ${formato === 'pesos' ? '%' : 'pp'}`

  if (!lineas.length) return <Typography fontSize={13} color="text.secondary" sx={{ py: 3 }}>Sin datos para estos filtros.</Typography>
  const meses = Array.from(new Set(lineas.flatMap(l => l.puntos.map(p => p.periodo)))).sort()
  if (meses.length < 2) return (
    <Typography fontSize={13} color="text.secondary" sx={{ py: 3 }}>Se necesitan al menos dos meses cargados para ver la evolución.</Typography>
  )
  const orden = [...(todas ?? lineas.map(l => l.clave))].filter(c => c !== otros).sort()
  const color = (c: string) => c === otros ? NEUTRO : PALETA[Math.max(0, orden.indexOf(c)) % PALETA.length]
  const nombres = Object.fromEntries(lineas.flatMap(l => l.puntos.map(p => [p.periodo, p.nombre])))
  const datos = meses.map(per => {
    const fila: Record<string, number | string | null> = { periodo: per, mes: corto(nombres[per] ?? per) }
    for (const l of lineas) {
      const p = l.puntos.find(x => x.periodo === per)
      fila[l.clave] = p ? p.valor : null
      fila[`${l.clave}__c`] = p ? p.cambio : null
    }
    return fila
  })
  const porPunto = lineas.length <= MAX_ROTULOS_POR_PUNTO
  const ticks = marcas(lineas.flatMap(l => l.puntos.map(p => p.valor)))
  const hayNegativos = formato === 'pct' && lineas.some(l => l.puntos.some(p => p.valor < 0))

  // Rótulos del final de cada línea, separados verticalmente si quedan cerca.
  const RotulosFinales = (props: any) => {
    const items: any[] = props.formattedGraphicalItems ?? []
    const finales = items.map((it, i) => {
      const pts = (it.props?.points ?? []).filter((p: any) => p.value != null && p.y != null)
      const p = pts[pts.length - 1]
      const l = lineas[i]
      return p && l ? { l, x: p.x, y: p.y, yr: p.y } : null
    }).filter(Boolean) as { l: Linea; x: number; y: number; yr: number }[]
    finales.sort((a, b) => a.y - b.y)
    const SEP = 27
    for (let i = 1; i < finales.length; i++) if (finales[i].yr - finales[i - 1].yr < SEP) finales[i].yr = finales[i - 1].yr + SEP
    return <g>{finales.map(f => {
      const ult = f.l.puntos[f.l.puntos.length - 1]
      return (
        <g key={f.l.clave}>
          {Math.abs(f.yr - f.y) > 2 && <line x1={f.x + 4} y1={f.y} x2={f.x + 12} y2={f.yr - 4} stroke={GRILLA} />}
          <text x={f.x + 14} y={f.yr - 3} fontSize={11} fontWeight={700} fill={TINTA}>{f.l.clave}</text>
          <text x={f.x + 14} y={f.yr + 10} fontSize={10.5} fill={TINTA}>{valorTxt(ult.valor)} {cambioTxt(ult.cambio)}</text>
        </g>
      )
    })}</g>
  }

  return (
    <Box>
      {/* Leyenda: con varias líneas siempre hay una, además del rótulo al final. */}
      <Stack direction="row" gap={2} flexWrap="wrap" mb={1}>
        {lineas.map(l => (
          <Stack key={l.clave} direction="row" alignItems="center" gap={0.75}>
            <Box sx={{ width: 14, height: 3, borderRadius: 2, bgcolor: color(l.clave) }} />
            <Typography fontSize={12} color="text.secondary">{l.clave}{l.detalle ? ` (${l.detalle})` : ''}</Typography>
          </Stack>
        ))}
      </Stack>
      <ResponsiveContainer width="100%" height={alto}>
        <LineChart data={datos} margin={{ top: 28, right: 150, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRILLA} vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRILLA }} padding={{ left: 24, right: 24 }} />
          <YAxis tickFormatter={v => valorTxt(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} />
          {hayNegativos && <ReferenceLine y={0} stroke={NEUTRO} />}
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const fila = payload[0].payload as Record<string, number | null>
            return (
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.75 }}>
                <Typography fontSize={12} fontWeight={700} mb={0.25}>{nombres[fila.periodo as unknown as string]}</Typography>
                {lineas.filter(l => fila[l.clave] != null).map(l => (
                  <Stack key={l.clave} direction="row" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color(l.clave) }} />
                    <Typography fontSize={12} sx={{ minWidth: 120 }}>{l.clave}</Typography>
                    <Typography fontSize={12} fontWeight={700} sx={{ minWidth: 92, textAlign: 'right' }}>{valorLargo(fila[l.clave])}</Typography>
                    <Typography fontSize={12} color="text.secondary">{cambioTxt(fila[`${l.clave}__c`])}</Typography>
                  </Stack>
                ))}
              </Box>
            )
          }} />
          {lineas.map(l => (
            <Line key={l.clave} type="linear" dataKey={l.clave} stroke={color(l.clave)} strokeWidth={2} connectNulls
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false}>
              {porPunto && <LabelList dataKey={l.clave} content={({ x, y, index, value }: any) => {
                const c = datos[index]?.[`${l.clave}__c`] as number | null
                if (value == null || c == null || index === datos.length - 1) return null
                return <text x={Number(x)} y={Number(y) - 9} textAnchor="middle" fontSize={10} fill={TINTA}>{cambioTxt(c)}</text>
              }} />}
            </Line>
          ))}
          <Customized component={RotulosFinales} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
