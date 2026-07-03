import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Stack, alpha, Divider,
} from '@mui/material'
import {
  BarChart as ReportIcon,
  Factory as ProdIcon,
  VerifiedUser as QualityIcon,
  TrendingUp as TrendIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  Warning as WarnIcon,
  CheckCircle as OkIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtN = (n: number) => new Intl.NumberFormat('es-CO').format(n)

// ── Interfaces ──────────────────────────────────────────────────────────────
interface OrdenProduccion {
  op: string
  producto: string
  plan: number
  real: number
  pct: number
  scrap: number
  estado: 'COMPLETADO' | 'EN_PROCESO' | 'RETRASADO' | 'PENDIENTE'
}

interface LineaCalidad {
  linea: string
  fpy: number
  scrap: number
  defectos: number
  inspecciones: number
  rechazos: number
}

interface ProductoTop {
  producto: string
  unidades: number
  pctTotal: number
  oee: number
  costoUnitario: number
}

interface CostoMes {
  mes: string
  costo: number
}

interface OEETrend {
  semana: string
  oee: number
}

interface DefectoPareto {
  tipo: string
  cantidad: number
  pctAcum: number
}

interface ProductoCosto {
  producto: string
  mp: number
  mod: number
  cif: number
  total: number
  margen: number
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const ORDENES: OrdenProduccion[] = [
  { op: 'OP-2026-0841', producto: 'Válvula Industrial DN50', plan: 1200, real: 1185, pct: 98.8, scrap: 15, estado: 'COMPLETADO' },
  { op: 'OP-2026-0842', producto: 'Carcasa Bomba Centrífuga', plan: 800, real: 764, pct: 95.5, scrap: 22, estado: 'EN_PROCESO' },
  { op: 'OP-2026-0843', producto: 'Eje Transmisión 25mm', plan: 1500, real: 1089, pct: 72.6, scrap: 41, estado: 'RETRASADO' },
  { op: 'OP-2026-0844', producto: 'Brida Acero Inox 316', plan: 600, real: 598, pct: 99.7, scrap: 2, estado: 'COMPLETADO' },
  { op: 'OP-2026-0845', producto: 'Impeller Fundición Gris', plan: 400, real: 388, pct: 97.0, scrap: 9, estado: 'EN_PROCESO' },
  { op: 'OP-2026-0846', producto: 'Tapa Cierre Hermético', plan: 2200, real: 2156, pct: 98.0, scrap: 33, estado: 'COMPLETADO' },
  { op: 'OP-2026-0847', producto: 'Soporte Estructura L40', plan: 950, real: 712, pct: 74.9, scrap: 18, estado: 'RETRASADO' },
  { op: 'OP-2026-0848', producto: 'Anillo Sellado PTFE', plan: 3000, real: 3000, pct: 100.0, scrap: 0, estado: 'COMPLETADO' },
  { op: 'OP-2026-0849', producto: 'Buje Bronce SAE-660', plan: 750, real: 528, pct: 70.4, scrap: 29, estado: 'RETRASADO' },
  { op: 'OP-2026-0850', producto: 'Perno Hexagonal M20', plan: 5000, real: 0, pct: 0.0, scrap: 0, estado: 'PENDIENTE' },
]

const OEE_TREND: OEETrend[] = [
  { semana: 'S01', oee: 82.0 },
  { semana: 'S02', oee: 84.0 },
  { semana: 'S03', oee: 85.1 },
  { semana: 'S04', oee: 86.2 },
  { semana: 'S05', oee: 87.0 },
  { semana: 'S06', oee: 87.3 },
]

const LINEAS_CALIDAD: LineaCalidad[] = [
  { linea: 'Línea 1 — Mecanizado CNC', fpy: 95.2, scrap: 1.8, defectos: 42, inspecciones: 280, rechazos: 8 },
  { linea: 'Línea 2 — Fundición', fpy: 91.4, scrap: 3.1, defectos: 78, inspecciones: 210, rechazos: 14 },
  { linea: 'Línea 3 — Ensamble A', fpy: 97.8, scrap: 0.9, defectos: 18, inspecciones: 340, rechazos: 4 },
  { linea: 'Línea 4 — Ensamble B', fpy: 94.0, scrap: 2.4, defectos: 55, inspecciones: 310, rechazos: 11 },
  { linea: 'Línea 5 — Pintura/Acabado', fpy: 93.1, scrap: 2.8, defectos: 63, inspecciones: 195, rechazos: 9 },
  { linea: 'Línea 6 — Empaque Final', fpy: 98.5, scrap: 0.5, defectos: 9, inspecciones: 420, rechazos: 2 },
]

const DEFECTOS_PARETO: DefectoPareto[] = [
  { tipo: 'Dimensión fuera de tolerancia', cantidad: 124, pctAcum: 38.3 },
  { tipo: 'Porosidad en fundición', cantidad: 89, pctAcum: 65.8 },
  { tipo: 'Acabado superficial deficiente', cantidad: 56, pctAcum: 83.1 },
  { tipo: 'Falla en sellado / O-ring', cantidad: 31, pctAcum: 92.7 },
  { tipo: 'Marcado / etiquetado incorrecto', cantidad: 24, pctAcum: 100.0 },
]

const PRODUCTOS_TOP: ProductoTop[] = [
  { producto: 'Válvula Industrial DN50', unidades: 14820, pctTotal: 17.6, oee: 90.1, costoUnitario: 62400 },
  { producto: 'Anillo Sellado PTFE', pctTotal: 14.3, unidades: 12050, oee: 88.5, costoUnitario: 18200 },
  { producto: 'Tapa Cierre Hermético', unidades: 10380, pctTotal: 12.3, oee: 85.7, costoUnitario: 47800 },
  { producto: 'Perno Hexagonal M20', unidades: 9800, pctTotal: 11.6, oee: 91.2, costoUnitario: 8400 },
  { producto: 'Buje Bronce SAE-660', unidades: 6240, pctTotal: 7.4, oee: 82.3, costoUnitario: 54600 },
]

const TENDENCIA_COSTOS: CostoMes[] = [
  { mes: 'Ene', costo: 261000000 },
  { mes: 'Feb', costo: 274000000 },
  { mes: 'Mar', costo: 268000000 },
  { mes: 'Abr', costo: 279000000 },
  { mes: 'May', costo: 271000000 },
  { mes: 'Jun', costo: 284000000 },
]

const PRODUCTOS_COSTO: ProductoCosto[] = [
  { producto: 'Carcasa Bomba Centrífuga', mp: 38200, mod: 18400, cif: 11800, total: 68400, margen: 18.4 },
  { producto: 'Impeller Fundición Gris', mp: 31500, mod: 14200, cif: 9100, total: 54800, margen: 22.1 },
  { producto: 'Válvula Industrial DN50', mp: 44100, mod: 12800, cif: 8200, total: 65100, margen: 15.8 },
  { producto: 'Eje Transmisión 25mm', mp: 28400, mod: 11600, cif: 7400, total: 47400, margen: 24.6 },
  { producto: 'Brida Acero Inox 316', mp: 51200, mod: 16300, cif: 10400, total: 77900, margen: 12.2 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const estadoColor = (e: string) =>
  ({ COMPLETADO: '#32AC5C', EN_PROCESO: MES_COLOR, RETRASADO: '#EF4444', PENDIENTE: '#9CA3AF' })[e] ?? '#9CA3AF'

const pctColor = (p: number) => p >= 95 ? '#32AC5C' : p >= 80 ? '#F59E0B' : '#EF4444'

const maxOEE = Math.max(...OEE_TREND.map(o => o.oee))
const maxPareto = Math.max(...DEFECTOS_PARETO.map(d => d.cantidad))
const maxCosto = Math.max(...TENDENCIA_COSTOS.map(c => c.costo))

// ── SVG Gauge ────────────────────────────────────────────────────────────────
function SvgGauge({ value, label, color = MES_COLOR, max = 100 }: { value: number; label: string; color?: string; max?: number }) {
  const pct = Math.min(value / max, 1)
  const r = 60
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * r
  const arc = circumference * 0.75
  const offset = arc - pct * arc

  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width={160} height={130} viewBox="0 0 160 150">
        {/* Background arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={alpha('#fff', 0.07)} strokeWidth={14}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={14}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={22} fontWeight={800}>{value}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#9CA3AF" fontSize={11}>{label}</text>
      </svg>
    </Box>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MESReportes() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR }}>
            <ReportIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">Reportes MES</Typography>
            <Typography variant="body2" color="grey.400">Producción, Calidad, Presidencia y Costos — Junio 2026</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: MES_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
            }}
          >
            {['Producción', 'Calidad', 'Presidencia', 'Costos'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: Producción ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Cumplimiento Programa', value: '87.4%', sub: 'vs meta 90%', icon: <SpeedIcon />, color: '#F59E0B' },
                { label: 'Producción Real vs Plan', value: '8,420 / 9,640 un', sub: 'déficit 1,220 un', icon: <ProdIcon />, color: MES_COLOR },
                { label: 'OEE Global', value: '87.3%', sub: 'disponib. × rend. × calidad', icon: <TrendIcon />, color: '#32AC5C' },
                { label: 'Throughput', value: '420 un/h', sub: 'turno 8h promedio', icon: <SpeedIcon />, color: '#8B5CF6' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                          <Typography variant="caption" display="block" color={k.color} fontSize={10}>{k.sub}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Tabla OPs del día */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    <Typography variant="subtitle2" color="grey.300" fontWeight={700}>Órdenes de Producción — Hoy</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                          <TableCell>OP</TableCell>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Plan</TableCell>
                          <TableCell align="right">Real</TableCell>
                          <TableCell align="center">% Cumpl.</TableCell>
                          <TableCell align="right">Scrap</TableCell>
                          <TableCell align="center">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ORDENES.map((o, i) => (
                          <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                            <TableCell><Typography variant="caption" fontWeight={700} color={MES_COLOR}>{o.op}</Typography></TableCell>
                            <TableCell><Typography variant="caption">{o.producto}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmtN(o.plan)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmtN(o.real)}</Typography></TableCell>
                            <TableCell align="center">
                              <Typography variant="caption" fontWeight={700} color={pctColor(o.pct)}>{o.pct.toFixed(1)}%</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color={o.scrap > 20 ? '#EF4444' : 'grey.300'}>{o.scrap}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={o.estado.replace('_', ' ')} size="small"
                                sx={{ background: alpha(estadoColor(o.estado), 0.15), color: estadoColor(o.estado), fontWeight: 700, fontSize: 10 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* OEE Trend */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}`, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Tendencia OEE — Últimas 6 Semanas</Typography>
                    <Stack spacing={1.5}>
                      {OEE_TREND.map((o, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                          <Typography variant="caption" color="grey.400" sx={{ width: 28 }}>{o.semana}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 20, borderRadius: 4, background: alpha('#fff', 0.05), overflow: 'hidden' }}>
                              <Box sx={{
                                height: '100%',
                                width: `${(o.oee / maxOEE) * 100}%`,
                                background: i === OEE_TREND.length - 1 ? MES_COLOR : alpha(MES_COLOR, 0.5),
                                borderRadius: 4,
                                transition: 'width 0.5s ease',
                                display: 'flex', alignItems: 'center', pl: 1,
                              }}>
                                <Typography variant="caption" color="white" fontWeight={700} noWrap sx={{ fontSize: 11 }}>{o.oee}%</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                    <Divider sx={{ borderColor: alpha('#fff', 0.07), my: 2 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color={MES_COLOR}>+5.3 pp</Typography>
                        <Typography variant="caption" color="grey.500">Mejora 6 sem</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color="#F59E0B">90%</Typography>
                        <Typography variant="caption" color="grey.500">Meta OEE</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 1: Calidad ───────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'First Pass Yield', value: '93.8%', sub: 'meta ≥ 95%', color: '#F59E0B', icon: <QualityIcon /> },
                { label: 'Scrap Rate', value: '2.1%', sub: 'meta ≤ 1.5%', color: '#EF4444', icon: <WarnIcon /> },
                { label: 'Rework Rate', value: '0.8%', sub: 'meta ≤ 1.0%', color: '#32AC5C', icon: <OkIcon /> },
                { label: 'Defectos por Millón (DPMO)', value: '21,000', sub: 'objetivo sigma 4.0', color: '#8B5CF6', icon: <TrendIcon /> },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                          <Typography variant="caption" display="block" color={k.color} fontSize={10}>{k.sub}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Tabla por línea */}
              <Grid size={{ xs: 12, lg: 7 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    <Typography variant="subtitle2" color="grey.300" fontWeight={700}>Indicadores de Calidad por Línea</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                          <TableCell>Línea</TableCell>
                          <TableCell align="center">FPY %</TableCell>
                          <TableCell align="center">Scrap %</TableCell>
                          <TableCell align="right">Defectos</TableCell>
                          <TableCell align="right">Inspecc.</TableCell>
                          <TableCell align="right">Rechazos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {LINEAS_CALIDAD.map((l, i) => (
                          <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                            <TableCell><Typography variant="caption" fontWeight={600}>{l.linea}</Typography></TableCell>
                            <TableCell align="center">
                              <Typography variant="caption" fontWeight={700} color={l.fpy >= 96 ? '#32AC5C' : l.fpy >= 93 ? '#F59E0B' : '#EF4444'}>{l.fpy}%</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="caption" fontWeight={700} color={l.scrap <= 1.5 ? '#32AC5C' : l.scrap <= 2.5 ? '#F59E0B' : '#EF4444'}>{l.scrap}%</Typography>
                            </TableCell>
                            <TableCell align="right"><Typography variant="caption">{l.defectos}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{l.inspecciones}</Typography></TableCell>
                            <TableCell align="right">
                              <Chip label={l.rechazos} size="small" sx={{ background: alpha(l.rechazos > 10 ? '#EF4444' : '#F59E0B', 0.15), color: l.rechazos > 10 ? '#EF4444' : '#F59E0B', fontWeight: 700, minWidth: 32 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Pareto defectos */}
              <Grid size={{ xs: 12, lg: 5 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}`, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Pareto de Defectos — Top 5 Tipos</Typography>
                    <Stack spacing={2}>
                      {DEFECTOS_PARETO.map((d, i) => {
                        const barColor = i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : i === 2 ? MES_COLOR : alpha(MES_COLOR, 0.6)
                        return (
                          <Box key={i}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption" color="grey.300" sx={{ maxWidth: '70%' }}>{d.tipo}</Typography>
                              <Stack direction="row" spacing={1}>
                                <Typography variant="caption" fontWeight={700} color={barColor}>{d.cantidad}</Typography>
                                <Typography variant="caption" color="grey.500">({d.pctAcum.toFixed(1)}%)</Typography>
                              </Stack>
                            </Stack>
                            <Box sx={{ height: 10, borderRadius: 5, background: alpha('#fff', 0.05), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(d.cantidad / maxPareto) * 100}%`, background: barColor, borderRadius: 5, transition: 'width 0.5s ease' }} />
                            </Box>
                          </Box>
                        )
                      })}
                    </Stack>
                    <Divider sx={{ borderColor: alpha('#fff', 0.07), my: 2 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="grey.500">Total defectos mes</Typography>
                      <Typography variant="caption" fontWeight={700} color="white">324</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="grey.500">Costo scrap estimado</Typography>
                      <Typography variant="caption" fontWeight={700} color="#EF4444">$48.2M COP</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 2: Presidencia ───────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Typography variant="subtitle1" color="grey.300" mb={3} fontWeight={600}>Dashboard Ejecutivo — Junio 2026</Typography>

            {/* 4 Executive KPIs */}
            <Grid container spacing={3} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.35)}`, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={1} fontWeight={600}>OEE Global</Typography>
                    <SvgGauge value={87.3} label="OEE" color={MES_COLOR} />
                    <Typography variant="caption" color="grey.500">Meta: ≥ 90%</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#32AC5C', 0.35)}`, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={1} fontWeight={600}>Cumplimiento Programa</Typography>
                    <SvgGauge value={87.4} label="Cumpl." color="#32AC5C" />
                    <Typography variant="caption" color="grey.500">Meta: ≥ 90%</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#EF4444', 0.35)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Costo Unitario vs Meta</Typography>
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight={800} color="#EF4444">$67,400</Typography>
                      <Typography variant="caption" color="grey.400">costo real / unidad</Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color="#32AC5C">$65,000</Typography>
                        <Typography variant="caption" color="grey.500">Meta</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color="#EF4444">+3.7%</Typography>
                        <Typography variant="caption" color="grey.500">Sobre meta</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#8B5CF6', 0.35)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>OTIF Productivo</Typography>
                    <Box textAlign="center">
                      <Typography variant="h3" fontWeight={900} color="#8B5CF6" sx={{ lineHeight: 1.1 }}>91.2%</Typography>
                      <Typography variant="caption" color="grey.500">On Time In Full</Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="grey.500">Meta OTIF</Typography>
                      <Typography variant="caption" fontWeight={700} color="#8B5CF6">95%</Typography>
                    </Stack>
                    <Box sx={{ height: 6, borderRadius: 3, background: alpha('#8B5CF6', 0.12), overflow: 'hidden', mt: 0.5 }}>
                      <Box sx={{ height: '100%', width: '91.2%', background: '#8B5CF6', borderRadius: 3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Top 5 productos */}
              <Grid size={{ xs: 12, lg: 7 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    <Typography variant="subtitle2" color="grey.300" fontWeight={700}>Top 5 Productos por Volumen</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Unidades</TableCell>
                          <TableCell align="center">% Total</TableCell>
                          <TableCell align="center">OEE</TableCell>
                          <TableCell align="right">Costo Unitario</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {PRODUCTOS_TOP.map((p, i) => (
                          <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="caption" color="grey.500" fontWeight={700}>#{i + 1}</Typography>
                                <Typography variant="caption">{p.producto}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right"><Typography variant="caption" fontWeight={600}>{fmtN(p.unidades)}</Typography></TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="caption" fontWeight={700} color={MES_COLOR}>{p.pctTotal}%</Typography>
                                <Box sx={{ height: 4, borderRadius: 2, background: alpha(MES_COLOR, 0.12), mt: 0.3 }}>
                                  <Box sx={{ height: '100%', width: `${p.pctTotal * 4}%`, background: MES_COLOR, borderRadius: 2 }} />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="caption" fontWeight={700} color={pctColor(p.oee)}>{p.oee}%</Typography>
                            </TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.costoUnitario)}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Tendencia costo mensual */}
              <Grid size={{ xs: 12, lg: 5 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}`, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Tendencia Costo Mensual (6 meses)</Typography>
                    <Stack spacing={1.5}>
                      {TENDENCIA_COSTOS.map((m, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={2}>
                          <Typography variant="caption" color="grey.400" sx={{ width: 28 }}>{m.mes}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 20, borderRadius: 4, background: alpha('#fff', 0.05), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(m.costo / maxCosto) * 100}%`, background: i === 5 ? MES_COLOR : alpha(MES_COLOR, 0.45), borderRadius: 4, transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" color="white" fontWeight={700} noWrap sx={{ fontSize: 11 }}>${Math.round(m.costo / 1000000)}M</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 3: Costos ────────────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Costo Total Mes', value: '$284M', sub: 'COP junio 2026', color: MES_COLOR, icon: <MoneyIcon /> },
                { label: 'Costo por Unidad', value: '$67,400', sub: 'real jun', color: '#EF4444', icon: <TrendIcon /> },
                { label: 'Meta Costo / Un.', value: '$65,000', sub: 'presupuesto aprobado', color: '#32AC5C', icon: <OkIcon /> },
                { label: 'Varianza', value: '+3.7%', sub: 'sobre meta ($2,400/un)', color: '#F59E0B', icon: <WarnIcon /> },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                          <Typography variant="caption" display="block" color={k.color} fontSize={10}>{k.sub}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Breakdown costos */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Estructura de Costos</Typography>
                    <Stack spacing={2.5}>
                      {[
                        { concepto: 'Materiales Directos', pct: 72, valor: 204480000, color: MES_COLOR },
                        { concepto: 'Mano de Obra Directa', pct: 18, valor: 51120000, color: '#8B5CF6' },
                        { concepto: 'Costos Indirectos Fab.', pct: 10, valor: 28400000, color: '#F59E0B' },
                      ].map((c, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="grey.300">{c.concepto}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={700} color={c.color}>{c.pct}%</Typography>
                              <Typography variant="caption" color="grey.500">${Math.round(c.valor / 1000000)}M</Typography>
                            </Stack>
                          </Stack>
                          <Box sx={{ height: 12, borderRadius: 6, background: alpha(c.color, 0.1), overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 6, transition: 'width 0.5s ease' }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                    <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />
                    <Box sx={{ p: 1.5, borderRadius: 1.5, background: alpha('#EF4444', 0.08), border: `1px solid ${alpha('#EF4444', 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="caption" color="grey.400">Scrap en COP</Typography>
                          <Typography variant="body1" fontWeight={700} color="#EF4444">$48.2M</Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" color="grey.400">Del costo total</Typography>
                          <Typography variant="body1" fontWeight={700} color="#EF4444">17.0%</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top 5 productos costosos */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    <Typography variant="subtitle2" color="grey.300" fontWeight={700}>Top 5 Productos — Mayor Costo de Producción</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">MP</TableCell>
                          <TableCell align="right">MOD</TableCell>
                          <TableCell align="right">CIF</TableCell>
                          <TableCell align="right">Total / Un.</TableCell>
                          <TableCell align="center">Margen %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {PRODUCTOS_COSTO.map((p, i) => (
                          <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                            <TableCell><Typography variant="caption" fontWeight={600}>{p.producto}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.mp)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.mod)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.cif)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption" fontWeight={700} color={MES_COLOR}>{fmt(p.total)}</Typography></TableCell>
                            <TableCell align="center">
                              <Chip label={`${p.margen}%`} size="small"
                                sx={{ background: alpha(p.margen >= 20 ? '#32AC5C' : p.margen >= 15 ? '#F59E0B' : '#EF4444', 0.15), color: p.margen >= 20 ? '#32AC5C' : p.margen >= 15 ? '#F59E0B' : '#EF4444', fontWeight: 700, fontSize: 10 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
