import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Grid, Chip, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  alpha, Divider,
} from '@mui/material'
import {
  AttachMoney, TrendingUp, TrendingDown, BarChart, Visibility,
  Edit, LocalGasStation, Toll, HotelOutlined, WorkOutline,
  Build, AccountBalance, ArrowForward,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
const fmtPct = (n: number) => `${n.toFixed(1)}%`

// ─── Types ────────────────────────────────────────────────────────────────────
interface CostoComponente {
  combustible: number
  peajes: number
  viaticos: number
  horas_extras: number
  mantenimiento: number
  indirectos: number
}

interface ViajeConCosto {
  id: number
  codigo: string
  origen: string
  destino: string
  conductor: string
  km: number
  valor_flete: number
  costos: CostoComponente
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_VIAJES: ViajeConCosto[] = [
  { id: 1, codigo: 'VJ-2024-001', origen: 'Bogotá', destino: 'Medellín', conductor: 'Carlos Rodríguez', km: 415, valor_flete: 2800000, costos: { combustible: 850000, peajes: 180000, viaticos: 120000, horas_extras: 60000, mantenimiento: 90000, indirectos: 150000 } },
  { id: 2, codigo: 'VJ-2024-002', origen: 'Medellín', destino: 'Cali', conductor: 'Luis Hernández', km: 238, valor_flete: 1900000, costos: { combustible: 580000, peajes: 95000, viaticos: 80000, horas_extras: 0, mantenimiento: 45000, indirectos: 90000 } },
  { id: 3, codigo: 'VJ-2024-003', origen: 'Cali', destino: 'Barranquilla', conductor: 'Andrés Torres', km: 970, valor_flete: 5200000, costos: { combustible: 1950000, peajes: 420000, viaticos: 280000, horas_extras: 150000, mantenimiento: 180000, indirectos: 320000 } },
  { id: 4, codigo: 'VJ-2024-004', origen: 'Bogotá', destino: 'Bucaramanga', conductor: 'Pedro Martínez', km: 390, valor_flete: 2600000, costos: { combustible: 820000, peajes: 165000, viaticos: 110000, horas_extras: 0, mantenimiento: 75000, indirectos: 140000 } },
  { id: 5, codigo: 'VJ-2024-005', origen: 'Medellín', destino: 'Bogotá', conductor: 'Mario López', km: 415, valor_flete: 2750000, costos: { combustible: 870000, peajes: 180000, viaticos: 120000, horas_extras: 90000, mantenimiento: 110000, indirectos: 155000 } },
  { id: 6, codigo: 'VJ-2024-006', origen: 'Bogotá', destino: 'Pereira', conductor: 'Felipe Ruiz', km: 285, valor_flete: 1800000, costos: { combustible: 650000, peajes: 120000, viaticos: 90000, horas_extras: 30000, mantenimiento: 55000, indirectos: 100000 } },
  { id: 7, codigo: 'VJ-2024-007', origen: 'Cali', destino: 'Bogotá', conductor: 'Sergio Castro', km: 462, valor_flete: 3100000, costos: { combustible: 980000, peajes: 200000, viaticos: 140000, horas_extras: 0, mantenimiento: 95000, indirectos: 170000 } },
  { id: 8, codigo: 'VJ-2024-008', origen: 'Barranquilla', destino: 'Medellín', conductor: 'Ricardo Vargas', km: 690, valor_flete: 3900000, costos: { combustible: 1400000, peajes: 290000, viaticos: 190000, horas_extras: 120000, mantenimiento: 140000, indirectos: 220000 } },
  { id: 9, codigo: 'VJ-2024-009', origen: 'Bogotá', destino: 'Villavicencio', conductor: 'Héctor Moreno', km: 90, valor_flete: 850000, costos: { combustible: 240000, peajes: 45000, viaticos: 40000, horas_extras: 0, mantenimiento: 20000, indirectos: 50000 } },
  { id: 10, codigo: 'VJ-2024-010', origen: 'Medellín', destino: 'Santa Marta', conductor: 'Carlos Rodríguez', km: 810, valor_flete: 4500000, costos: { combustible: 1700000, peajes: 360000, viaticos: 240000, horas_extras: 90000, mantenimiento: 165000, indirectos: 280000 } },
  { id: 11, codigo: 'VJ-2024-011', origen: 'Cali', destino: 'Cartagena', conductor: 'Luis Hernández', km: 1050, valor_flete: 5800000, costos: { combustible: 2100000, peajes: 450000, viaticos: 300000, horas_extras: 180000, mantenimiento: 200000, indirectos: 350000 } },
  { id: 12, codigo: 'VJ-2024-012', origen: 'Bucaramanga', destino: 'Bogotá', conductor: 'Andrés Torres', km: 390, valor_flete: 2500000, costos: { combustible: 810000, peajes: 165000, viaticos: 110000, horas_extras: 60000, mantenimiento: 80000, indirectos: 140000 } },
  { id: 13, codigo: 'VJ-2024-013', origen: 'Pereira', destino: 'Medellín', conductor: 'Pedro Martínez', km: 168, valor_flete: 1200000, costos: { combustible: 420000, peajes: 80000, viaticos: 60000, horas_extras: 0, mantenimiento: 35000, indirectos: 70000 } },
  { id: 14, codigo: 'VJ-2024-014', origen: 'Bogotá', destino: 'Cali', conductor: 'Mario López', km: 462, valor_flete: 3000000, costos: { combustible: 970000, peajes: 200000, viaticos: 140000, horas_extras: 45000, mantenimiento: 90000, indirectos: 165000 } },
  { id: 15, codigo: 'VJ-2024-015', origen: 'Manizales', destino: 'Bogotá', conductor: 'Felipe Ruiz', km: 310, valor_flete: 2100000, costos: { combustible: 700000, peajes: 135000, viaticos: 95000, horas_extras: 30000, mantenimiento: 60000, indirectos: 110000 } },
]

function totalCosto(c: CostoComponente) {
  return c.combustible + c.peajes + c.viaticos + c.horas_extras + c.mantenimiento + c.indirectos
}
function margen(v: ViajeConCosto) { return v.valor_flete - totalCosto(v.costos) }
function margenPct(v: ViajeConCosto) { return (margen(v) / v.valor_flete) * 100 }

function margenColor(pct: number) {
  if (pct >= 20) return 'success.main'
  if (pct >= 10) return 'warning.main'
  return 'error.main'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography fontSize={12} color="text.secondary" mb={0.5}>{label}</Typography>
          <Typography variant="h6" fontWeight={700} color="#0F172A">{value}</Typography>
          {sub && <Typography fontSize={11} color="text.secondary" mt={0.3}>{sub}</Typography>}
        </Box>
        <Box sx={{ bgcolor: alpha(color, 0.1), p: 1, borderRadius: 1.5, color }}>{icon}</Box>
      </Stack>
    </Paper>
  )
}

// ─── Componente de breakdown ─────────────────────────────────────────────────
const COMP_LABELS: { key: keyof CostoComponente; label: string; icon: React.ReactNode }[] = [
  { key: 'combustible', label: 'Combustible', icon: <LocalGasStation fontSize="small" /> },
  { key: 'peajes', label: 'Peajes', icon: <Toll fontSize="small" /> },
  { key: 'viaticos', label: 'Viáticos', icon: <HotelOutlined fontSize="small" /> },
  { key: 'horas_extras', label: 'Horas Extras', icon: <WorkOutline fontSize="small" /> },
  { key: 'mantenimiento', label: 'Mantenimiento', icon: <Build fontSize="small" /> },
  { key: 'indirectos', label: 'Costos Indirectos', icon: <AccountBalance fontSize="small" /> },
]

export default function TMSCostos() {
  const [tab, setTab] = useState(0)
  const [breakdownViaje, setBreakdownViaje] = useState<ViajeConCosto | null>(null)
  const [editViaje, setEditViaje] = useState<ViajeConCosto | null>(null)
  const [editCostos, setEditCostos] = useState<CostoComponente>({ combustible: 0, peajes: 0, viaticos: 0, horas_extras: 0, mantenimiento: 0, indirectos: 0 })

  // KPIs
  const costoTotal = MOCK_VIAJES.reduce((s, v) => s + totalCosto(v.costos), 0)
  const costoPromViaje = costoTotal / MOCK_VIAJES.length
  const costoPromKm = costoTotal / MOCK_VIAJES.reduce((s, v) => s + v.km, 0)
  const margenProm = MOCK_VIAJES.reduce((s, v) => s + margenPct(v), 0) / MOCK_VIAJES.length

  // Rutas agrupadas
  const rutasMap = new Map<string, { viajes: ViajeConCosto[] }>()
  MOCK_VIAJES.forEach(v => {
    const key = `${v.origen} → ${v.destino}`
    if (!rutasMap.has(key)) rutasMap.set(key, { viajes: [] })
    rutasMap.get(key)!.viajes.push(v)
  })
  const rutas = Array.from(rutasMap.entries()).map(([ruta, { viajes }]) => ({
    ruta, n: viajes.length,
    costoTotal: viajes.reduce((s, v) => s + totalCosto(v.costos), 0),
    costoProm: viajes.reduce((s, v) => s + totalCosto(v.costos), 0) / viajes.length,
    costoPromKm: viajes.reduce((s, v) => s + totalCosto(v.costos), 0) / viajes.reduce((s, v) => s + v.km, 0),
    margenProm: viajes.reduce((s, v) => s + margenPct(v), 0) / viajes.length,
  })).sort((a, b) => b.costoTotal - a.costoTotal)

  // Por conductor
  const condMap = new Map<string, ViajeConCosto[]>()
  MOCK_VIAJES.forEach(v => { if (!condMap.has(v.conductor)) condMap.set(v.conductor, []); condMap.get(v.conductor)!.push(v) })
  const conductores = Array.from(condMap.entries()).map(([nombre, viajes]) => ({
    nombre, n: viajes.length,
    costoProm: viajes.reduce((s, v) => s + totalCosto(v.costos), 0) / viajes.length,
    margenProm: viajes.reduce((s, v) => s + margenPct(v), 0) / viajes.length,
  }))

  // Totales por componente
  const totComp = (k: keyof CostoComponente) => MOCK_VIAJES.reduce((s, v) => s + v.costos[k], 0)

  // Top rutas por margen
  const rutasOrdenadas = [...rutas].sort((a, b) => b.margenProm - a.margenProm)
  const top5Mejor = rutasOrdenadas.slice(0, 5)
  const top5Peor = [...rutasOrdenadas].reverse().slice(0, 5)
  const maxMargen = Math.max(...rutasOrdenadas.map(r => Math.abs(r.margenProm)))

  function openEdit(v: ViajeConCosto) {
    setEditViaje(v)
    setEditCostos({ ...v.costos })
    setBreakdownViaje(null)
  }

  function guardarCostos() {
    toast.success('Costos actualizados')
    setEditViaje(null)
  }

  const editTotal = Object.values(editCostos).reduce((a, b) => a + b, 0)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <Box sx={{ bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: 2, p: 1, display: 'flex' }}>
            <AttachMoney sx={{ color: TMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#0F172A">Motor de Costos TMS</Typography>
            <Typography variant="body2" color="text.secondary">Rentabilidad y análisis de costos por viaje y ruta</Typography>
          </Box>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <KPICard label="Costo Total del Mes" value={fmt(costoTotal)} icon={<AttachMoney />} color={TMS_COLOR} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <KPICard label="Costo Promedio / Viaje" value={fmt(costoPromViaje)} icon={<BarChart />} color="#7C3AED" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <KPICard label="Costo Promedio / Km" value={fmt(costoPromKm)} sub="Por kilómetro" icon={<TrendingUp />} color="#059669" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <KPICard label="Margen Promedio" value={fmtPct(margenProm)} icon={<TrendingUp />} color={margenProm >= 20 ? '#059669' : margenProm >= 10 ? '#D97706' : '#DC2626'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <KPICard label="Mayor Costo" value="VJ-2024-011" sub="Cali → Cartagena" icon={<TrendingDown />} color="#DC2626" />
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Por Viaje" />
            <Tab label="Por Ruta" />
            <Tab label="Análisis de Rentabilidad" />
          </Tabs>

          {/* ── Tab 0: Por Viaje ── */}
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Código</b></TableCell>
                      <TableCell><b>Ruta</b></TableCell>
                      <TableCell><b>Conductor</b></TableCell>
                      <TableCell align="right"><b>Flete Cobrado</b></TableCell>
                      <TableCell align="right"><b>Costo Total</b></TableCell>
                      <TableCell align="right"><b>Margen $</b></TableCell>
                      <TableCell align="right"><b>Margen %</b></TableCell>
                      <TableCell><b>Acciones</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_VIAJES.map(v => {
                      const tot = totalCosto(v.costos)
                      const mg = margen(v)
                      const mgPct = margenPct(v)
                      return (
                        <TableRow key={v.id} hover>
                          <TableCell><b>{v.codigo}</b></TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <Typography fontSize={12}>{v.origen}</Typography>
                              <ArrowForward sx={{ fontSize: 12, color: TMS_COLOR }} />
                              <Typography fontSize={12}>{v.destino}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell fontSize={12}>{v.conductor}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(v.valor_flete)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(tot)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, color: mg >= 0 ? 'success.main' : 'error.main' }}>{fmt(mg)}</TableCell>
                          <TableCell align="right">
                            <Typography fontSize={12} fontWeight={700} color={margenColor(mgPct)}>{fmtPct(mgPct)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Ver Breakdown">
                              <IconButton size="small" onClick={() => setBreakdownViaje(v)}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 1: Por Ruta ── */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Ruta</b></TableCell>
                      <TableCell align="center"><b>N° Viajes</b></TableCell>
                      <TableCell align="right"><b>Costo Total</b></TableCell>
                      <TableCell align="right"><b>Costo Prom/Viaje</b></TableCell>
                      <TableCell align="right"><b>Costo Prom/Km</b></TableCell>
                      <TableCell align="right"><b>Margen Prom %</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rutas.map(r => (
                      <TableRow key={r.ruta} hover>
                        <TableCell><b>{r.ruta}</b></TableCell>
                        <TableCell align="center">{r.n}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(r.costoTotal)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(r.costoProm)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(r.costoPromKm)}</TableCell>
                        <TableCell align="right">
                          <Typography fontSize={12} fontWeight={700} color={margenColor(r.margenProm)}>{fmtPct(r.margenProm)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 2: Rentabilidad ── */}
          {tab === 2 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Top 5 mejor */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography fontWeight={700} mb={2} color="success.main">Top 5 Rutas más rentables</Typography>
                  <Stack gap={1}>
                    {top5Mejor.map(r => (
                      <Box key={r.ruta}>
                        <Stack direction="row" justifyContent="space-between" mb={0.3}>
                          <Typography fontSize={12}>{r.ruta}</Typography>
                          <Typography fontSize={12} fontWeight={700} color="success.main">{fmtPct(r.margenProm)}</Typography>
                        </Stack>
                        <Box sx={{ bgcolor: '#E5E7EB', borderRadius: 1, height: 8 }}>
                          <Box sx={{ bgcolor: 'success.main', height: 8, borderRadius: 1, width: `${(r.margenProm / maxMargen) * 100}%` }} />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
                {/* Top 5 peor */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography fontWeight={700} mb={2} color="error.main">Top 5 Rutas menos rentables</Typography>
                  <Stack gap={1}>
                    {top5Peor.map(r => (
                      <Box key={r.ruta}>
                        <Stack direction="row" justifyContent="space-between" mb={0.3}>
                          <Typography fontSize={12}>{r.ruta}</Typography>
                          <Typography fontSize={12} fontWeight={700} color="error.main">{fmtPct(r.margenProm)}</Typography>
                        </Stack>
                        <Box sx={{ bgcolor: '#E5E7EB', borderRadius: 1, height: 8 }}>
                          <Box sx={{ bgcolor: 'error.main', height: 8, borderRadius: 1, width: `${(r.margenProm / maxMargen) * 100}%` }} />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Grid>

                {/* Conductores */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontWeight={700} mb={2}>Análisis por Conductor</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                          <TableCell><b>Conductor</b></TableCell>
                          <TableCell align="center"><b>N° Viajes</b></TableCell>
                          <TableCell align="right"><b>Costo Prom/Viaje</b></TableCell>
                          <TableCell align="right"><b>Margen Prom %</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {conductores.map(c => (
                          <TableRow key={c.nombre} hover>
                            <TableCell>{c.nombre}</TableCell>
                            <TableCell align="center">{c.n}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(c.costoProm)}</TableCell>
                            <TableCell align="right"><Typography fontSize={12} fontWeight={700} color={margenColor(c.margenProm)}>{fmtPct(c.margenProm)}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                {/* Resumen componentes */}
                <Grid size={{ xs: 12 }}>
                  <Typography fontWeight={700} mb={2}>Resumen por Componente de Costo</Typography>
                  <Grid container spacing={2}>
                    {COMP_LABELS.map(cl => (
                      <Grid key={cl.key} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                          <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                            <Box sx={{ color: TMS_COLOR }}>{cl.icon}</Box>
                            <Typography fontSize={13}>{cl.label}</Typography>
                          </Stack>
                          <Typography fontWeight={700} fontSize={16}>{fmt(totComp(cl.key))}</Typography>
                          <Typography fontSize={11} color="text.secondary">{fmtPct((totComp(cl.key) / costoTotal) * 100)} del total</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* ── Dialog Breakdown ── */}
        <Dialog open={!!breakdownViaje} onClose={() => setBreakdownViaje(null)} maxWidth="sm" fullWidth>
          {breakdownViaje && (
            <>
              <DialogTitle>Breakdown de Costos — {breakdownViaje.codigo}</DialogTitle>
              <DialogContent>
                <Typography fontSize={13} color="text.secondary" mb={2}>{breakdownViaje.origen} → {breakdownViaje.destino} | {breakdownViaje.conductor}</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell><b>Componente</b></TableCell>
                        <TableCell align="right"><b>Valor</b></TableCell>
                        <TableCell align="right"><b>% Total</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {COMP_LABELS.map(cl => {
                        const val = breakdownViaje.costos[cl.key]
                        const tot = totalCosto(breakdownViaje.costos)
                        return (
                          <TableRow key={cl.key}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" gap={1}>
                                <Box sx={{ color: TMS_COLOR }}>{cl.icon}</Box>
                                {cl.label}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{fmt(val)}</TableCell>
                            <TableCell align="right">{fmtPct((val / tot) * 100)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Divider sx={{ my: 2 }} />
                <Stack gap={0.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={600}>Total Costo:</Typography>
                    <Typography fontWeight={600}>{fmt(totalCosto(breakdownViaje.costos))}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={600}>Valor Cobrado:</Typography>
                    <Typography fontWeight={600} color="success.main">{fmt(breakdownViaje.valor_flete)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={700}>Margen:</Typography>
                    <Typography fontWeight={700} color={margen(breakdownViaje) >= 0 ? 'success.main' : 'error.main'}>
                      {fmt(margen(breakdownViaje))} ({fmtPct(margenPct(breakdownViaje))})
                    </Typography>
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setBreakdownViaje(null)}>Cerrar</Button>
                <Button variant="outlined" startIcon={<Edit />} onClick={() => openEdit(breakdownViaje)} sx={{ borderColor: TMS_COLOR, color: TMS_COLOR }}>
                  Editar Costos
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* ── Dialog Editar Costos ── */}
        <Dialog open={!!editViaje} onClose={() => setEditViaje(null)} maxWidth="sm" fullWidth>
          {editViaje && (
            <>
              <DialogTitle>Editar Costos — {editViaje.codigo}</DialogTitle>
              <DialogContent>
                <Stack gap={2} mt={1}>
                  <TextField label="Viaje" value={`${editViaje.codigo} | ${editViaje.origen} → ${editViaje.destino}`} disabled />
                  {COMP_LABELS.map(cl => (
                    <TextField
                      key={cl.key} label={cl.label} type="number"
                      value={editCostos[cl.key]}
                      onChange={e => setEditCostos(c => ({ ...c, [cl.key]: Number(e.target.value) }))}
                      InputProps={{ startAdornment: <Box sx={{ mr: 0.5, color: TMS_COLOR }}>{cl.icon}</Box> }}
                    />
                  ))}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={700}>Total Calculado:</Typography>
                    <Typography fontWeight={700} color={TMS_COLOR}>{fmt(editTotal)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Margen Proyectado:</Typography>
                    <Typography fontWeight={600} color={editViaje.valor_flete - editTotal >= 0 ? 'success.main' : 'error.main'}>
                      {fmt(editViaje.valor_flete - editTotal)} ({fmtPct(((editViaje.valor_flete - editTotal) / editViaje.valor_flete) * 100)})
                    </Typography>
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditViaje(null)}>Cancelar</Button>
                <Button variant="contained" onClick={guardarCostos} sx={{ bgcolor: TMS_COLOR }}>Guardar</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Layout>
  )
}
