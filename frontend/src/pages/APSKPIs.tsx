// APS Module - KPIs & Supply Chain Control Tower
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Button, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, alpha, Divider, Tooltip,
} from '@mui/material'
import {
  TrendingUp, TrendingDown, Remove, Dashboard, Timeline,
  Leaderboard, Assignment, TrafficOutlined, CheckCircle,
  Warning, Error as ErrorIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR      = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ── Mock data ──────────────────────────────────────────────────────────────

interface KPI {
  id: string; grupo: string; nombre: string; valor: number; unidad: string;
  meta: number; variacion: number; icon: string;
}

const KPIS: KPI[] = [
  // DEMANDA
  { id: 'fa',  grupo: 'DEMANDA',    nombre: 'Forecast Accuracy',     valor: 91.4, unidad: '%',    meta: 92,   variacion: +1.2,  icon: '🎯' },
  { id: 'bi',  grupo: 'DEMANDA',    nombre: 'Bias',                  valor: -1.2, unidad: '%',    meta: 0,    variacion: -0.3,  icon: '⚖️' },
  { id: 'ma',  grupo: 'DEMANDA',    nombre: 'MAPE',                  valor: 8.6,  unidad: '%',    meta: 8.0,  variacion: +0.4,  icon: '📉' },
  // SUPPLY
  { id: 'sa',  grupo: 'SUPPLY',     nombre: 'Schedule Adherence',    valor: 88.7, unidad: '%',    meta: 90,   variacion: -0.8,  icon: '📋' },
  { id: 'cu',  grupo: 'SUPPLY',     nombre: 'Capacity Utilization',  valor: 78.5, unidad: '%',    meta: 80,   variacion: +2.1,  icon: '🏭' },
  { id: 'mr',  grupo: 'SUPPLY',     nombre: 'MRP Accuracy',          valor: 94.2, unidad: '%',    meta: 95,   variacion: +0.5,  icon: '🔧' },
  // INVENTARIO
  { id: 'it',  grupo: 'INVENTARIO', nombre: 'Inventory Turns',       valor: 8.3,  unidad: 'x',    meta: 9.0,  variacion: +0.3,  icon: '🔄' },
  { id: 'di',  grupo: 'INVENTARIO', nombre: 'Days of Inventory',     valor: 44,   unidad: 'd',    meta: 40,   variacion: -2.0,  icon: '📅' },
  { id: 'fr',  grupo: 'INVENTARIO', nombre: 'Fill Rate',             valor: 97.8, unidad: '%',    meta: 98,   variacion: +0.2,  icon: '📦' },
  { id: 'sl',  grupo: 'INVENTARIO', nombre: 'Service Level',         valor: 97.1, unidad: '%',    meta: 97,   variacion: +0.1,  icon: '⭐' },
  // SERVICIO
  { id: 'ot',  grupo: 'SERVICIO',   nombre: 'OTIF',                  valor: 96.2, unidad: '%',    meta: 96,   variacion: +0.7,  icon: '🚚' },
  { id: 'po',  grupo: 'SERVICIO',   nombre: 'Perfect Order',         valor: 94.5, unidad: '%',    meta: 95,   variacion: -0.3,  icon: '✅' },
]

const GRUPOS_COLOR: Record<string, string> = {
  DEMANDA:    '#7C3AED',
  SUPPLY:     '#2563EB',
  INVENTARIO: '#059669',
  SERVICIO:   '#D97706',
}

const HISTORICO_SEMANAS = [
  { semana: 'S17', fa: 89.1, sa: 87.2, it: 7.9, fr: 97.2, ot: 95.4, po: 93.8 },
  { semana: 'S18', fa: 90.3, sa: 88.0, it: 8.0, fr: 97.5, ot: 95.8, po: 94.0 },
  { semana: 'S19', fa: 90.8, sa: 87.5, it: 8.1, fr: 97.3, ot: 96.0, po: 94.2 },
  { semana: 'S20', fa: 91.0, sa: 88.3, it: 8.2, fr: 97.6, ot: 95.9, po: 94.1 },
  { semana: 'S21', fa: 90.5, sa: 89.0, it: 8.1, fr: 97.4, ot: 96.1, po: 94.3 },
  { semana: 'S22', fa: 91.2, sa: 88.7, it: 8.2, fr: 97.7, ot: 96.0, po: 94.4 },
  { semana: 'S23', fa: 91.0, sa: 88.5, it: 8.3, fr: 97.8, ot: 96.1, po: 94.5 },
  { semana: 'S24', fa: 91.4, sa: 88.7, it: 8.3, fr: 97.8, ot: 96.2, po: 94.5 },
]

const BENCHMARKS = [
  { kpi: 'Forecast Accuracy', tuEmpresa: 91.4, p50: 82,  p75: 88, p90: 93, unidad: '%' },
  { kpi: 'MAPE',              tuEmpresa: 8.6,  p50: 15,  p75: 12, p90: 8,  unidad: '%', lowerBetter: true },
  { kpi: 'Schedule Adherence',tuEmpresa: 88.7, p50: 79,  p75: 85, p90: 91, unidad: '%' },
  { kpi: 'OTIF',              tuEmpresa: 96.2, p50: 88,  p75: 93, p90: 97, unidad: '%' },
  { kpi: 'Fill Rate',         tuEmpresa: 97.8, p50: 91,  p75: 95, p90: 98, unidad: '%' },
  { kpi: 'Inventory Turns',   tuEmpresa: 8.3,  p50: 5.5, p75: 7,  p90: 9,  unidad: 'x' },
  { kpi: 'Days of Inventory', tuEmpresa: 44,   p50: 65,  p75: 52, p90: 38, unidad: 'd', lowerBetter: true },
  { kpi: 'Perfect Order',     tuEmpresa: 94.5, p50: 85,  p75: 91, p90: 96, unidad: '%' },
]

const SCORECARD_DATA = [
  {
    periodo: 'Semana', responsable: 'Gerencia SC', objetivo: 'OTIF ≥ 96%',
    meta: 96, real: 96.2, tendencia: 'UP', acciones: 'Mantener plan actual', status: 'GREEN',
  },
  {
    periodo: 'Semana', responsable: 'Planificación', objetivo: 'Forecast Accuracy ≥ 92%',
    meta: 92, real: 91.4, tendencia: 'UP', acciones: 'Revisar estadístico semana 25', status: 'YELLOW',
  },
  {
    periodo: 'Mes', responsable: 'Operaciones', objetivo: 'Schedule Adherence ≥ 90%',
    meta: 90, real: 88.7, tendencia: 'DOWN', acciones: 'Ajustar capacidad Línea A turno noche', status: 'RED',
  },
  {
    periodo: 'Mes', responsable: 'Inventarios', objetivo: 'Fill Rate ≥ 98%',
    meta: 98, real: 97.8, tendencia: 'UP', acciones: 'Revisar SS de SKUs críticos', status: 'YELLOW',
  },
  {
    periodo: 'Trimestre', responsable: 'Compras', objetivo: 'MRP Accuracy ≥ 95%',
    meta: 95, real: 94.2, tendencia: 'UP', acciones: 'Depurar maestro de materiales', status: 'YELLOW',
  },
  {
    periodo: 'Trimestre', responsable: 'Dirección', objetivo: 'Inventory Turns ≥ 9x',
    meta: 9, real: 8.3, tendencia: 'UP', acciones: 'Programa reducción overstock canal moderno', status: 'RED',
  },
]

// ── Helper components ──────────────────────────────────────────────────────

function Semaforo({ value, size = 14 }: { value: 'GREEN' | 'YELLOW' | 'RED'; size?: number }) {
  const color = value === 'GREEN' ? '#059669' : value === 'YELLOW' ? '#D97706' : '#DC2626'
  return (
    <Box sx={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${alpha(color, 0.5)}` }} />
  )
}

function VarBadge({ val }: { val: number }) {
  const isUp = val > 0
  const isFlat = val === 0
  return (
    <Chip
      icon={isFlat ? <Remove fontSize="small" /> : isUp ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
      label={`${isUp ? '+' : ''}${val}%`}
      size="small"
      sx={{
        background: alpha(isFlat ? '#6B7280' : isUp ? '#059669' : '#DC2626', 0.1),
        color: isFlat ? '#6B7280' : isUp ? '#059669' : '#DC2626',
        fontWeight: 700, fontSize: '0.7rem',
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: `${pct * 0.5}px`, minWidth: 4, height: 8, borderRadius: 2, background: color }} />
      <Typography variant="caption" fontWeight={600}>{value}</Typography>
    </Box>
  )
}

// ── Tab components ──────────────────────────────────────────────────────────

function TabDashboard() {
  const grupos = ['DEMANDA', 'SUPPLY', 'INVENTARIO', 'SERVICIO'] as const

  return (
    <Box>
      {grupos.map(grupo => {
        const kpisGrupo = KPIS.filter(k => k.grupo === grupo)
        const color = GRUPOS_COLOR[grupo]
        return (
          <Box key={grupo} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box sx={{ width: 4, height: 20, borderRadius: 2, background: color }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ color, letterSpacing: 1, fontSize: '0.8rem' }}>
                {grupo}
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {kpisGrupo.map(kpi => {
                const pct = kpi.unidad === '%'
                  ? Math.min((kpi.valor / kpi.meta) * 100, 100)
                  : kpi.nombre === 'Days of Inventory'
                  ? Math.max(0, 100 - ((kpi.valor - kpi.meta) / kpi.meta) * 100)
                  : Math.min((kpi.valor / kpi.meta) * 100, 100)
                const onTarget = kpi.nombre === 'Days of Inventory' || kpi.nombre === 'MAPE'
                  ? kpi.valor <= kpi.meta
                  : kpi.valor >= kpi.meta
                return (
                  <Grid key={kpi.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{
                      border: `1px solid ${alpha(color, 0.2)}`,
                      background: alpha(color, 0.03),
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: `0 4px 20px ${alpha(color, 0.15)}` },
                    }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                              {kpi.icon} {kpi.nombre}
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color={color} sx={{ lineHeight: 1.2 }}>
                              {kpi.valor}{kpi.unidad}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <VarBadge val={kpi.variacion} />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Meta: {kpi.meta}{kpi.unidad}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              flex: 1, height: 6, borderRadius: 3,
                              background: alpha(color, 0.12),
                              '& .MuiLinearProgress-bar': { background: onTarget ? color : '#DC2626', borderRadius: 3 },
                            }}
                          />
                          <Typography variant="caption" fontWeight={700} color={onTarget ? color : '#DC2626'}>
                            {Math.round(pct)}%
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )
      })}
    </Box>
  )
}

function TabTendencias() {
  const cols = [
    { key: 'fa', label: 'FA %', max: 100 },
    { key: 'sa', label: 'Sched. Adh. %', max: 100 },
    { key: 'it', label: 'Inv. Turns x', max: 10 },
    { key: 'fr', label: 'Fill Rate %', max: 100 },
    { key: 'ot', label: 'OTIF %', max: 100 },
    { key: 'po', label: 'Perf. Order %', max: 100 },
  ]

  const averages = cols.reduce((acc, col) => {
    const sum = HISTORICO_SEMANAS.reduce((s, r) => s + (r as Record<string, number>)[col.key], 0)
    acc[col.key] = Math.round((sum / HISTORICO_SEMANAS.length) * 10) / 10
    return acc
  }, {} as Record<string, number>)

  return (
    <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ background: alpha(APS_COLOR, 0.06) }}>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: APS_COLOR }}>Semana</TableCell>
            {cols.map(c => (
              <TableCell key={c.key} sx={{ fontWeight: 700, fontSize: '0.73rem', color: APS_COLOR, whiteSpace: 'nowrap' }}>{c.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {HISTORICO_SEMANAS.map((row, idx) => (
            <TableRow key={row.semana} hover sx={{ background: idx % 2 === 0 ? 'transparent' : alpha(APS_COLOR, 0.015) }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: APS_COLOR }}>{row.semana}</TableCell>
              {cols.map(col => {
                const val = (row as Record<string, number>)[col.key]
                return (
                  <TableCell key={col.key}>
                    <MiniBar value={val} max={col.max} color={APS_COLOR} />
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
          {/* Promedio row */}
          <TableRow sx={{ background: alpha(APS_COLOR, 0.08), borderTop: `2px solid ${alpha(APS_COLOR, 0.3)}` }}>
            <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: APS_COLOR }}>Promedio</TableCell>
            {cols.map(col => (
              <TableCell key={col.key} sx={{ fontWeight: 800, fontSize: '0.78rem', color: APS_COLOR }}>
                {averages[col.key]}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  )
}

function getBenchmarkPosition(kpi: typeof BENCHMARKS[0]) {
  const { tuEmpresa, p50, p75, p90, lowerBetter } = kpi
  if (lowerBetter) {
    if (tuEmpresa <= p90) return { label: 'WORLD CLASS', color: '#059669' }
    if (tuEmpresa <= p75) return { label: 'TOP QUARTIL', color: '#7C3AED' }
    if (tuEmpresa <= p50) return { label: 'MID', color: '#D97706' }
    return { label: 'BAJO', color: '#DC2626' }
  }
  if (tuEmpresa >= p90) return { label: 'WORLD CLASS', color: '#059669' }
  if (tuEmpresa >= p75) return { label: 'TOP QUARTIL', color: '#7C3AED' }
  if (tuEmpresa >= p50) return { label: 'MID', color: '#D97706' }
  return { label: 'BAJO', color: '#DC2626' }
}

function TabBenchmarks() {
  return (
    <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ background: alpha(APS_COLOR, 0.06) }}>
            {['KPI', 'Tu Empresa', 'Industria P50', 'Top Quartile P75', 'World Class P90', 'Posición'].map(h => (
              <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.73rem', color: APS_COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {BENCHMARKS.map((b, i) => {
            const pos = getBenchmarkPosition(b)
            return (
              <TableRow key={i} hover sx={{ '&:hover': { background: alpha(APS_COLOR, 0.03) } }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.kpi}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={800} color={APS_COLOR}>
                    {b.tuEmpresa}{b.unidad}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{b.p50}{b.unidad}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{b.p75}{b.unidad}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{b.p90}{b.unidad}</TableCell>
                <TableCell>
                  <Chip
                    label={pos.label}
                    size="small"
                    sx={{ background: alpha(pos.color, 0.12), color: pos.color, fontWeight: 800, fontSize: '0.68rem' }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Paper>
  )
}

function TabScorecard() {
  const [periodoFilter, setPeriodoFilter] = useState<string>('Todos')
  const periodos = ['Todos', 'Semana', 'Mes', 'Trimestre']

  const filtered = SCORECARD_DATA.filter(s => periodoFilter === 'Todos' || s.periodo === periodoFilter)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Período</InputLabel>
          <Select label="Período" value={periodoFilter} onChange={e => setPeriodoFilter(e.target.value)}>
            {periodos.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          {filtered.length} objetivo(s) mostrado(s)
        </Typography>
      </Box>
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: alpha(APS_COLOR, 0.06) }}>
              {['Estado', 'Período', 'Responsable', 'Objetivo', 'Meta', 'Real', '% Cumplim.', 'Tendencia', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.73rem', color: APS_COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((s, i) => {
              const pct = Math.round((s.real / s.meta) * 100)
              const statusVal = s.status as 'GREEN' | 'YELLOW' | 'RED'
              return (
                <TableRow key={i} hover sx={{ '&:hover': { background: alpha(APS_COLOR, 0.03) } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Semaforo value={statusVal} size={16} />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.periodo} size="small" sx={{ background: alpha(APS_COLOR, 0.1), color: APS_COLOR, fontWeight: 600, fontSize: '0.68rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{s.responsable}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{s.objetivo}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{s.meta}%</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: s.status === 'GREEN' ? '#059669' : s.status === 'YELLOW' ? '#D97706' : '#DC2626' }}>
                    {s.real}%
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: `${Math.min(pct * 0.5, 60)}px`, height: 6, borderRadius: 3, background: statusVal === 'GREEN' ? '#059669' : statusVal === 'YELLOW' ? '#D97706' : '#DC2626' }} />
                      <Typography variant="caption" fontWeight={700}>{pct}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {s.tendencia === 'UP'
                      ? <TrendingUp sx={{ color: '#059669', fontSize: 18 }} />
                      : <TrendingDown sx={{ color: '#DC2626', fontSize: 18 }} />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 200 }}>{s.acciones}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function APSKPIs() {
  const [tab, setTab] = useState(0)

  // Global traffic light: average compliance
  const compliance = KPIS.map(k => {
    if (k.nombre === 'Days of Inventory' || k.nombre === 'MAPE') return k.valor <= k.meta ? 100 : (k.meta / k.valor) * 100
    return (k.valor / k.meta) * 100
  })
  const avgCompliance = compliance.reduce((a, b) => a + b, 0) / compliance.length
  const globalStatus: 'GREEN' | 'YELLOW' | 'RED' = avgCompliance >= 97 ? 'GREEN' : avgCompliance >= 92 ? 'YELLOW' : 'RED'
  const globalColor = globalStatus === 'GREEN' ? '#059669' : globalStatus === 'YELLOW' ? '#D97706' : '#DC2626'
  const globalLabel = globalStatus === 'GREEN' ? 'OPERACIÓN NORMAL' : globalStatus === 'YELLOW' ? 'ATENCIÓN REQUERIDA' : 'ALERTA CRÍTICA'

  return (
    <Layout title="KPIs Supply Chain - Control Tower">
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        {/* Header Control Tower */}
        <Box sx={{
          mb: 3, p: 2.5, borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(APS_COLOR, 0.12)} 0%, ${alpha(APS_COLOR_DARK, 0.06)} 100%)`,
          border: `1px solid ${alpha(APS_COLOR, 0.2)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TrafficOutlined sx={{ color: APS_COLOR, fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={APS_COLOR}>
                Supply Chain Control Tower
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Visibilidad end-to-end · Monitoreo en tiempo real · {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>ESTADO GLOBAL</Typography>
              <Typography variant="body2" fontWeight={800} color={globalColor}>{globalLabel}</Typography>
              <Typography variant="caption" color="text.secondary">Compliance promedio: {Math.round(avgCompliance)}%</Typography>
            </Box>
            <Semaforo value={globalStatus} size={36} />
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.2)}`, borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${alpha(APS_COLOR, 0.15)}`,
              '& .MuiTab-root': { fontWeight: 600, fontSize: '0.82rem' },
              '& .Mui-selected': { color: APS_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: APS_COLOR },
            }}
          >
            <Tab icon={<Dashboard fontSize="small" />} iconPosition="start" label="Dashboard Ejecutivo" />
            <Tab icon={<Timeline fontSize="small" />} iconPosition="start" label="Tendencias" />
            <Tab icon={<Leaderboard fontSize="small" />} iconPosition="start" label="Benchmarks" />
            <Tab icon={<Assignment fontSize="small" />} iconPosition="start" label="Scorecard" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabDashboard />}
            {tab === 1 && <TabTendencias />}
            {tab === 2 && <TabBenchmarks />}
            {tab === 3 && <TabScorecard />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
