/**
 * Estado de llantas a piso y composición por vida, en el informe de estado de
 * la flota.
 *
 * - Barras apiladas por periodo (día, semana, mes o año): cuántas llantas
 *   había en cada rango de profundidad, con la última inspección de cada llanta
 *   en el periodo y su surco más gastado. Los rangos son los de Configuración
 *   (por defecto ≤ 3 mm crítica, hasta 6 mm moderada, más de 6 mm buen estado).
 * - Torta de las llantas montadas por vida: nueva y número de reencauches.
 */
import { useState } from 'react'
import { Box, Card, CardContent, LinearProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { apiClient as api } from '@/api/client'

type Agrupacion = 'DIA' | 'SEMANA' | 'MES' | 'ANIO'
interface Periodo { periodo: string; critica: number; moderada: number; buena: number; sin_medida: number; total: number }
interface EstadoPiso { agrupacion: Agrupacion; desde: string; hasta: string; rango_critico_mm: number; rango_moderado_mm: number; periodos: Periodo[] }
interface Vida { vida: string; reencauches: number; llantas: number }

const ROJO = '#DC2626'
const AMBAR = '#EAB308'
const VERDE = '#16A34A'
// Nueva y cada reencauche: tonos de un mismo azul que se oscurecen con las vidas.
const VIDAS = ['#0EA5E9', '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3', '#64748B']

const mm = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
const n = (v: number) => v.toLocaleString('es-CO')

/** El número dentro del tramo, solo si cabe. */
const dentro = (color: string) => (props: any) => {
  const { x, y, width, height, value } = props
  if (!value || height < 15 || width < 26) return null
  return <text x={x + width / 2} y={y + height / 2} fill={color} fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">{n(value)}</text>
}

/** Encima de la barra, las críticas: el tramo rojo suele ser demasiado bajo para llevar su número. */
const criticasArriba = (serie: Periodo[]) => (props: any) => {
  const { x, y, width, index } = props
  const c = serie[index]?.critica
  if (!c) return null
  return <text x={x + width / 2} y={y - 6} fill={ROJO} fontSize={10.5} fontWeight={700} textAnchor="middle">{n(c)} crít.</text>
}

/** El porcentaje dentro de la porción de la torta, si la porción alcanza. */
function porcentaje({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) / 2
  const a = (-midAngle * Math.PI) / 180
  return <text x={cx + r * Math.cos(a)} y={cy + r * Math.sin(a)} fill="#FFFFFF" fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="central">
    {`${Math.round(percent * 100)} %`}</text>
}

function etiqueta(fecha: string, ag: Agrupacion, variosAnios: boolean) {
  const d = new Date(`${fecha}T12:00:00`)
  if (ag === 'ANIO') return String(d.getFullYear())
  if (ag === 'MES') return d.toLocaleDateString('es-CO', variosAnios ? { month: 'short', year: '2-digit' } : { month: 'long' })
  if (ag === 'SEMANA') return `Sem. ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function EstadoLlantasPiso({ desde, hasta, activoId }: { desde?: string; hasta?: string; activoId?: string }) {
  const [ag, setAg] = useState<Agrupacion>('MES')
  const estado = useQuery<EstadoPiso>({
    queryKey: ['neu-estado-piso', ag, desde, hasta, activoId],
    queryFn: () => api.get('/eam/neumaticos/reportes/estado-piso', {
      params: { agrupacion: ag, desde: desde || undefined, hasta: hasta || undefined, activo_id: activoId || undefined },
    }).then(r => r.data),
  })
  const vidas = useQuery<Vida[]>({
    queryKey: ['neu-composicion-vida', activoId],
    queryFn: () => api.get('/eam/neumaticos/reportes/composicion-vida', { params: { activo_id: activoId || undefined } }).then(r => r.data),
  })
  const d = estado.data
  const variosAnios = !!d && new Date(d.desde).getFullYear() !== new Date(d.hasta).getFullYear()
  const serie = (d?.periodos ?? []).map(p => ({ ...p, nombre: etiqueta(p.periodo, ag, variosAnios) }))
  const totalVidas = (vidas.data ?? []).reduce((s, v) => s + v.llantas, 0)
  const rotulos = d ? {
    critica: `Crítica (≤ ${mm(d.rango_critico_mm)} mm)`,
    moderada: `Moderada (${mm(d.rango_critico_mm + 0.1)} a ${mm(d.rango_moderado_mm)} mm)`,
    buena: `Buen estado (> ${mm(d.rango_moderado_mm)} mm)`,
  } : { critica: 'Crítica', moderada: 'Moderada', buena: 'Buen estado' }
  // Con muchas barras los números no caben dentro: se muestran solo en el tooltip.
  const conNumeros = serie.length <= 16

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
              <Box>
                <Typography fontWeight={800} fontSize={15}>Estado de llantas a piso</Typography>
                <Typography fontSize={11.5} color="text.secondary">
                  Cada llanta una vez por periodo, con su última inspección y el surco más gastado. Rangos en Neumáticos → Configuración.
                </Typography>
              </Box>
              <ToggleButtonGroup size="small" exclusive value={ag} onChange={(_, v) => v && setAg(v)}>
                <ToggleButton value="DIA">Día</ToggleButton><ToggleButton value="SEMANA">Semana</ToggleButton>
                <ToggleButton value="MES">Mes</ToggleButton><ToggleButton value="ANIO">Año</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {estado.isFetching && <LinearProgress sx={{ mb: 1 }} />}
            {estado.isError && <Typography fontSize={12.5} color="error">{(estado.error as any)?.response?.data?.detail ?? 'No se pudo cargar el estado'}</Typography>}
            {d && !serie.length && <Typography fontSize={13} color="text.secondary" py={4} textAlign="center">Sin inspecciones en el periodo.</Typography>}
            {serie.length > 0 && (
              <Box sx={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={n} width={52} />
                    <Tooltip formatter={(v: number, k: string) => [n(v), rotulos[k as keyof typeof rotulos] ?? k]}
                      labelFormatter={(l, p) => `${l} · ${n((p?.[0]?.payload as Periodo | undefined)?.total ?? 0)} llantas`} />
                    <Legend formatter={(k: string) => <span style={{ fontSize: 12, color: '#334155' }}>{rotulos[k as keyof typeof rotulos] ?? k}</span>} />
                    {(['critica', 'moderada', 'buena'] as const).map((k, i) => (
                      <Bar key={k} dataKey={k} stackId="estado" fill={[ROJO, AMBAR, VERDE][i]} stroke="#FFFFFF" strokeWidth={1}
                        radius={k === 'buena' ? [4, 4, 0, 0] : undefined} isAnimationActive={false}>
                        {conNumeros && <LabelList dataKey={k} content={dentro(k === 'moderada' ? '#422006' : '#FFFFFF')} />}
                        {conNumeros && k === 'buena' && <LabelList dataKey="total" content={criticasArriba(serie)} />}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
          <CardContent>
            <Typography fontWeight={800} fontSize={15}>Composición por vida</Typography>
            <Typography fontSize={11.5} color="text.secondary" mb={1}>Llantas montadas hoy: nuevas y número de reencauches.</Typography>
            {vidas.isFetching && <LinearProgress sx={{ mb: 1 }} />}
            {!vidas.isFetching && totalVidas === 0 && <Typography fontSize={13} color="text.secondary" py={4} textAlign="center">No hay llantas montadas.</Typography>}
            {totalVidas > 0 && (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vidas.data} dataKey="llantas" nameKey="vida" innerRadius="45%" outerRadius="80%" paddingAngle={1}
                      stroke="#FFFFFF" isAnimationActive={false}
                      label={porcentaje} labelLine={false}>
                      {(vidas.data ?? []).map((v, i) => <Cell key={v.vida} fill={VIDAS[Math.min(i, VIDAS.length - 1)]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, k: string) => [`${n(v)} llantas (${((v / totalVidas) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %)`,
                      k === 'VN' ? 'Vida nueva' : `${k.slice(1)} reencauche(s)`]} />
                    <Legend formatter={(k: string) => <span style={{ fontSize: 12, color: '#334155' }}>{k === 'VN' ? 'Vida nueva (VN)' : `${k} · ${k.slice(1)} reencauche${k === 'R1' ? '' : 's'}`}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
            {totalVidas > 0 && <Typography fontSize={11.5} color="text.secondary" textAlign="center">{n(totalVidas)} llantas montadas</Typography>}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
