import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Tabs, Tab, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  MenuItem, TextField, alpha, Divider,
} from '@mui/material'
import {
  CheckCircle, Cancel, TrendingUp, TrendingDown, TrendingFlat,
  EmojiEvents, Speed, AccessTime,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const TMS_COLOR = '#0369A1'
const fmtPct = (n: number) => `${n.toFixed(1)}%`

// ─── Types ────────────────────────────────────────────────────────────────────
interface ViajeOTIF {
  codigo: string
  cliente: string
  origen: string
  destino: string
  fecha_prog: string
  fecha_real: string
  on_time: boolean
  in_full: boolean
  motivo?: string
}

interface ClienteOTIF {
  cliente: string
  pedidos: number
  ot: number
  if_: number
  otif: number
  tendencia: 'up' | 'down' | 'flat'
}

interface RutaOTIF {
  ruta: string
  viajes: number
  ot: number
  if_: number
  otif: number
  tiempo_prom: number
  desviacion: number
}

interface ConductorOTIF {
  conductor: string
  viajes: number
  ot: number
  if_: number
  otif: number
  incidentes: number
  productividad: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_VIAJES: ViajeOTIF[] = [
  { codigo: 'VJ-001', cliente: 'Grupo Éxito', origen: 'Bogotá', destino: 'Medellín', fecha_prog: '2024-06-01 08:00', fecha_real: '2024-06-01 09:30', on_time: false, in_full: true, motivo: 'Tráfico en autopista' },
  { codigo: 'VJ-002', cliente: 'Bavaria S.A.', origen: 'Medellín', destino: 'Cali', fecha_prog: '2024-06-02 07:00', fecha_real: '2024-06-02 06:55', on_time: true, in_full: true },
  { codigo: 'VJ-003', cliente: 'Alpina', origen: 'Cali', destino: 'Barranquilla', fecha_prog: '2024-06-02 09:00', fecha_real: '2024-06-02 11:45', on_time: false, in_full: false, motivo: 'Demora en cargue' },
  { codigo: 'VJ-004', cliente: 'Almacenes Éxito', origen: 'Bogotá', destino: 'Bucaramanga', fecha_prog: '2024-06-03 06:00', fecha_real: '2024-06-03 06:20', on_time: true, in_full: true },
  { codigo: 'VJ-005', cliente: 'Postobón', origen: 'Medellín', destino: 'Bogotá', fecha_prog: '2024-06-03 08:00', fecha_real: '2024-06-03 09:15', on_time: false, in_full: true, motivo: 'Cierre de vía' },
  { codigo: 'VJ-006', cliente: 'Grupo Éxito', origen: 'Bogotá', destino: 'Pereira', fecha_prog: '2024-06-04 07:00', fecha_real: '2024-06-04 07:00', on_time: true, in_full: true },
  { codigo: 'VJ-007', cliente: 'Bavaria S.A.', origen: 'Cali', destino: 'Bogotá', fecha_prog: '2024-06-04 10:00', fecha_real: '2024-06-04 11:30', on_time: false, in_full: false, motivo: 'Accidente en vía' },
  { codigo: 'VJ-008', cliente: 'Alpina', origen: 'Barranquilla', destino: 'Medellín', fecha_prog: '2024-06-05 08:00', fecha_real: '2024-06-05 07:45', on_time: true, in_full: true },
  { codigo: 'VJ-009', cliente: 'Almacenes Éxito', origen: 'Bogotá', destino: 'Villavicencio', fecha_prog: '2024-06-05 09:00', fecha_real: '2024-06-05 09:05', on_time: true, in_full: false, motivo: 'Faltante en bodega' },
  { codigo: 'VJ-010', cliente: 'Postobón', origen: 'Medellín', destino: 'Santa Marta', fecha_prog: '2024-06-06 06:00', fecha_real: '2024-06-06 05:50', on_time: true, in_full: true },
  { codigo: 'VJ-011', cliente: 'Grupo Éxito', origen: 'Cali', destino: 'Cartagena', fecha_prog: '2024-06-07 07:00', fecha_real: '2024-06-07 09:00', on_time: false, in_full: true, motivo: 'Tráfico' },
  { codigo: 'VJ-012', cliente: 'Bavaria S.A.', origen: 'Bucaramanga', destino: 'Bogotá', fecha_prog: '2024-06-08 08:00', fecha_real: '2024-06-08 08:10', on_time: true, in_full: true },
  { codigo: 'VJ-013', cliente: 'Alpina', origen: 'Pereira', destino: 'Medellín', fecha_prog: '2024-06-09 10:00', fecha_real: '2024-06-09 10:00', on_time: true, in_full: true },
  { codigo: 'VJ-014', cliente: 'Almacenes Éxito', origen: 'Bogotá', destino: 'Cali', fecha_prog: '2024-06-10 07:00', fecha_real: '2024-06-10 08:30', on_time: false, in_full: false, motivo: 'Vehículo varado' },
  { codigo: 'VJ-015', cliente: 'Postobón', origen: 'Manizales', destino: 'Bogotá', fecha_prog: '2024-06-11 09:00', fecha_real: '2024-06-11 08:55', on_time: true, in_full: true },
  { codigo: 'VJ-016', cliente: 'Grupo Éxito', origen: 'Bogotá', destino: 'Medellín', fecha_prog: '2024-06-12 06:00', fecha_real: '2024-06-12 06:40', on_time: true, in_full: true },
  { codigo: 'VJ-017', cliente: 'Bavaria S.A.', origen: 'Medellín', destino: 'Cali', fecha_prog: '2024-06-13 08:00', fecha_real: '2024-06-13 08:00', on_time: true, in_full: true },
  { codigo: 'VJ-018', cliente: 'Alpina', origen: 'Cali', destino: 'Bogotá', fecha_prog: '2024-06-14 07:00', fecha_real: '2024-06-14 09:30', on_time: false, in_full: true, motivo: 'Cierre de vía' },
  { codigo: 'VJ-019', cliente: 'Almacenes Éxito', origen: 'Bogotá', destino: 'Barranquilla', fecha_prog: '2024-06-15 06:00', fecha_real: '2024-06-15 07:15', on_time: false, in_full: false, motivo: 'Tráfico en autopista' },
  { codigo: 'VJ-020', cliente: 'Postobón', origen: 'Bucaramanga', destino: 'Medellín', fecha_prog: '2024-06-16 08:00', fecha_real: '2024-06-16 07:50', on_time: true, in_full: true },
  { codigo: 'VJ-021', cliente: 'Grupo Éxito', origen: 'Medellín', destino: 'Bogotá', fecha_prog: '2024-06-17 09:00', fecha_real: '2024-06-17 09:00', on_time: true, in_full: true },
  { codigo: 'VJ-022', cliente: 'Bavaria S.A.', origen: 'Bogotá', destino: 'Pereira', fecha_prog: '2024-06-18 07:00', fecha_real: '2024-06-18 07:30', on_time: true, in_full: false, motivo: 'Faltante en picking' },
  { codigo: 'VJ-023', cliente: 'Alpina', origen: 'Cali', destino: 'Medellín', fecha_prog: '2024-06-19 08:00', fecha_real: '2024-06-19 08:00', on_time: true, in_full: true },
  { codigo: 'VJ-024', cliente: 'Almacenes Éxito', origen: 'Bogotá', destino: 'Santa Marta', fecha_prog: '2024-06-20 06:00', fecha_real: '2024-06-20 06:00', on_time: true, in_full: true },
  { codigo: 'VJ-025', cliente: 'Postobón', origen: 'Medellín', destino: 'Cartagena', fecha_prog: '2024-06-21 07:00', fecha_real: '2024-06-21 09:30', on_time: false, in_full: true, motivo: 'Tráfico' },
  { codigo: 'VJ-026', cliente: 'Grupo Éxito', origen: 'Cali', destino: 'Bucaramanga', fecha_prog: '2024-06-22 10:00', fecha_real: '2024-06-22 10:00', on_time: true, in_full: true },
  { codigo: 'VJ-027', cliente: 'Bavaria S.A.', origen: 'Barranquilla', destino: 'Bogotá', fecha_prog: '2024-06-23 08:00', fecha_real: '2024-06-23 07:45', on_time: true, in_full: true },
  { codigo: 'VJ-028', cliente: 'Alpina', origen: 'Bogotá', destino: 'Cali', fecha_prog: '2024-06-24 07:00', fecha_real: '2024-06-24 09:00', on_time: false, in_full: false, motivo: 'Vehículo varado' },
  { codigo: 'VJ-029', cliente: 'Almacenes Éxito', origen: 'Medellín', destino: 'Bogotá', fecha_prog: '2024-06-25 09:00', fecha_real: '2024-06-25 09:00', on_time: true, in_full: true },
  { codigo: 'VJ-030', cliente: 'Postobón', origen: 'Bogotá', destino: 'Medellín', fecha_prog: '2024-06-26 06:00', fecha_real: '2024-06-26 06:00', on_time: true, in_full: true },
]

const MOTIVOS = [
  { motivo: 'Tráfico en autopista', n: 4 },
  { motivo: 'Cierre de vía', n: 3 },
  { motivo: 'Accidente en vía', n: 2 },
  { motivo: 'Vehículo varado', n: 2 },
  { motivo: 'Demora en cargue', n: 2 },
  { motivo: 'Faltante en bodega', n: 2 },
  { motivo: 'Faltante en picking', n: 1 },
]

const MOCK_CONDUCTORES: ConductorOTIF[] = [
  { conductor: 'Carlos Rodríguez', viajes: 8, ot: 87.5, if_: 87.5, otif: 75.0, incidentes: 1, productividad: 8 },
  { conductor: 'Luis Hernández', viajes: 7, ot: 85.7, if_: 100, otif: 85.7, incidentes: 0, productividad: 7 },
  { conductor: 'Andrés Torres', viajes: 6, ot: 83.3, if_: 66.7, otif: 66.7, incidentes: 2, productividad: 6 },
  { conductor: 'Pedro Martínez', viajes: 5, ot: 100, if_: 80.0, otif: 80.0, incidentes: 0, productividad: 5 },
  { conductor: 'Mario López', viajes: 4, ot: 100, if_: 100, otif: 100, incidentes: 0, productividad: 4 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nivelServicioChip(otif: number) {
  if (otif >= 95) return <Chip label="EXCELENTE" color="success" size="small" />
  if (otif >= 85) return <Chip label="BUENO" color="primary" size="small" />
  if (otif >= 70) return <Chip label="REGULAR" color="warning" size="small" />
  return <Chip label="CRÍTICO" color="error" size="small" />
}

function TendenciaIcon({ t }: { t: 'up' | 'down' | 'flat' }) {
  if (t === 'up') return <TrendingUp fontSize="small" color="success" />
  if (t === 'down') return <TrendingDown fontSize="small" color="error" />
  return <TrendingFlat fontSize="small" color="action" />
}

function BigKPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 3, border: `2px solid ${alpha(color, 0.3)}`, borderRadius: 2, textAlign: 'center', bgcolor: alpha(color, 0.04) }}>
      <Typography fontSize={12} color="text.secondary" mb={0.5}>{label}</Typography>
      <Typography variant="h3" fontWeight={800} color={color}>{value}</Typography>
      {sub && <Typography fontSize={11} color="text.secondary" mt={0.5}>{sub}</Typography>}
    </Paper>
  )
}

function otColor(v: number) {
  if (v >= 95) return '#059669'
  if (v >= 85) return '#D97706'
  return '#DC2626'
}

// ─── Weekly trend bars ────────────────────────────────────────────────────────
const TREND_WEEKS = [
  { label: 'S1', ot: 88, if_: 85, otif: 80 },
  { label: 'S2', ot: 90, if_: 87, otif: 82 },
  { label: 'S3', ot: 89, if_: 90, otif: 83 },
  { label: 'S4', ot: 91, if_: 88, otif: 83 },
]

// ─── Compute KPIs from mock ───────────────────────────────────────────────────
const total = MOCK_VIAJES.length
const otCount = MOCK_VIAJES.filter(v => v.on_time).length
const ifCount = MOCK_VIAJES.filter(v => v.in_full).length
const otifCount = MOCK_VIAJES.filter(v => v.on_time && v.in_full).length
const OT_RATE = (otCount / total) * 100
const IF_RATE = (ifCount / total) * 100
const OTIF_RATE = (otifCount / total) * 100

// Clientes
const clienteMap = new Map<string, ViajeOTIF[]>()
MOCK_VIAJES.forEach(v => { if (!clienteMap.has(v.cliente)) clienteMap.set(v.cliente, []); clienteMap.get(v.cliente)!.push(v) })
const MOCK_CLIENTES: ClienteOTIF[] = Array.from(clienteMap.entries()).map(([cliente, viajes]) => ({
  cliente, pedidos: viajes.length,
  ot: (viajes.filter(v => v.on_time).length / viajes.length) * 100,
  if_: (viajes.filter(v => v.in_full).length / viajes.length) * 100,
  otif: (viajes.filter(v => v.on_time && v.in_full).length / viajes.length) * 100,
  tendencia: 'flat' as const,
}))

// Rutas
const rutaMap = new Map<string, ViajeOTIF[]>()
MOCK_VIAJES.forEach(v => { const k = `${v.origen} → ${v.destino}`; if (!rutaMap.has(k)) rutaMap.set(k, []); rutaMap.get(k)!.push(v) })
const MOCK_RUTAS: RutaOTIF[] = Array.from(rutaMap.entries()).map(([ruta, viajes]) => ({
  ruta, viajes: viajes.length,
  ot: (viajes.filter(v => v.on_time).length / viajes.length) * 100,
  if_: (viajes.filter(v => v.in_full).length / viajes.length) * 100,
  otif: (viajes.filter(v => v.on_time && v.in_full).length / viajes.length) * 100,
  tiempo_prom: 5.2,
  desviacion: 1.1,
}))

export default function TMSOTIF() {
  const [tab, setTab] = useState(0)
  const [periodo, setPeriodo] = useState('Este Mes')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [conductorFiltro, setConductorFiltro] = useState('')

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <Box sx={{ bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: 2, p: 1, display: 'flex' }}>
            <Speed sx={{ color: TMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#0F172A">OTIF & KPIs de Servicio</Typography>
            <Typography variant="body2" color="text.secondary">On Time In Full — Indicadores de cumplimiento de entrega</Typography>
          </Box>
        </Stack>

        {/* Filtros */}
        <Stack direction="row" gap={2} mb={3} flexWrap="wrap">
          <TextField select size="small" label="Período" value={periodo} onChange={e => setPeriodo(e.target.value)} sx={{ minWidth: 180 }}>
            {['Este Mes', 'Mes Anterior', 'Último Trimestre', 'Rango Custom'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Cliente" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">Todos</MenuItem>
            {['Grupo Éxito', 'Bavaria S.A.', 'Alpina', 'Almacenes Éxito', 'Postobón'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Conductor" value={conductorFiltro} onChange={e => setConductorFiltro(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {MOCK_CONDUCTORES.map(c => <MenuItem key={c.conductor} value={c.conductor}>{c.conductor}</MenuItem>)}
          </TextField>
        </Stack>

        {/* Big KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <BigKPI label="OTIF Rate" value={fmtPct(OTIF_RATE)} color={otColor(OTIF_RATE)} sub="On Time In Full" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <BigKPI label="On Time Rate (OT)" value={fmtPct(OT_RATE)} color={otColor(OT_RATE)} sub="Entregas a tiempo" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <BigKPI label="In Full Rate (IF)" value={fmtPct(IF_RATE)} color={otColor(IF_RATE)} sub="Entregas completas" />
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }} variant="scrollable" scrollButtons="auto">
            <Tab label="Resumen Ejecutivo" />
            <Tab label="Por Cliente" />
            <Tab label="Por Ruta" />
            <Tab label="Por Conductor" />
            <Tab label="Detalle de Viajes" />
          </Tabs>

          {/* ── Tab 0: Resumen ── */}
          {tab === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Tendencia semanal */}
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography fontWeight={700} mb={2}>Tendencia OTIF — Últimas 4 Semanas</Typography>
                  <Stack direction="row" gap={2} alignItems="flex-end" sx={{ height: 120 }}>
                    {TREND_WEEKS.map(w => (
                      <Box key={w.label} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Stack direction="row" gap={0.3} alignItems="flex-end" sx={{ height: 80 }}>
                          <Tooltip title={`OT: ${w.ot}%`}>
                            <Box sx={{ width: 18, bgcolor: '#3B82F6', borderRadius: '3px 3px 0 0', height: `${w.ot * 0.8}%`, minHeight: 4 }} />
                          </Tooltip>
                          <Tooltip title={`IF: ${w.if_}%`}>
                            <Box sx={{ width: 18, bgcolor: '#10B981', borderRadius: '3px 3px 0 0', height: `${w.if_ * 0.8}%`, minHeight: 4 }} />
                          </Tooltip>
                          <Tooltip title={`OTIF: ${w.otif}%`}>
                            <Box sx={{ width: 18, bgcolor: TMS_COLOR, borderRadius: '3px 3px 0 0', height: `${w.otif * 0.8}%`, minHeight: 4 }} />
                          </Tooltip>
                        </Stack>
                        <Typography fontSize={11} color="text.secondary">{w.label}</Typography>
                      </Box>
                    ))}
                    <Stack gap={0.5} ml={2}>
                      <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 12, height: 12, bgcolor: '#3B82F6', borderRadius: 1 }} /><Typography fontSize={11}>OT</Typography></Stack>
                      <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 12, height: 12, bgcolor: '#10B981', borderRadius: 1 }} /><Typography fontSize={11}>IF</Typography></Stack>
                      <Stack direction="row" alignItems="center" gap={0.5}><Box sx={{ width: 12, height: 12, bgcolor: TMS_COLOR, borderRadius: 1 }} /><Typography fontSize={11}>OTIF</Typography></Stack>
                    </Stack>
                  </Stack>
                </Grid>

                {/* Métricas adicionales */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography fontWeight={700} mb={2}>Métricas Adicionales</Typography>
                  <Stack gap={1.5}>
                    {[
                      { label: 'Perfect Order Rate', value: fmtPct(OTIF_RATE), icon: <EmojiEvents fontSize="small" /> },
                      { label: 'Fill Rate', value: fmtPct(IF_RATE), icon: <CheckCircle fontSize="small" /> },
                      { label: 'Viajes Totales', value: String(total), icon: <AccessTime fontSize="small" /> },
                      { label: 'Entregados a tiempo', value: String(otCount), icon: <AccessTime fontSize="small" /> },
                      { label: 'Entregados completos', value: String(ifCount), icon: <CheckCircle fontSize="small" /> },
                      { label: 'OTIF completos', value: String(otifCount), icon: <CheckCircle fontSize="small" /> },
                    ].map(m => (
                      <Stack key={m.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <Box sx={{ color: TMS_COLOR }}>{m.icon}</Box>
                          <Typography fontSize={12}>{m.label}</Typography>
                        </Stack>
                        <Typography fontSize={12} fontWeight={700}>{m.value}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>

                {/* Motivos */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography fontWeight={700} mb={2}>Motivos de Incumplimiento</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                          <TableCell><b>Motivo</b></TableCell>
                          <TableCell align="center"><b>N° Viajes</b></TableCell>
                          <TableCell align="right"><b>% del Total</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {MOTIVOS.map(m => (
                          <TableRow key={m.motivo} hover>
                            <TableCell>{m.motivo}</TableCell>
                            <TableCell align="center">{m.n}</TableCell>
                            <TableCell align="right">{fmtPct((m.n / (total - otifCount)) * 100)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Tab 1: Por Cliente ── */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Cliente</b></TableCell>
                      <TableCell align="center"><b>N° Pedidos</b></TableCell>
                      <TableCell align="right"><b>OT %</b></TableCell>
                      <TableCell align="right"><b>IF %</b></TableCell>
                      <TableCell align="right"><b>OTIF %</b></TableCell>
                      <TableCell align="center"><b>Tendencia</b></TableCell>
                      <TableCell align="center"><b>Nivel Servicio</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_CLIENTES.map(c => (
                      <TableRow key={c.cliente} hover>
                        <TableCell><b>{c.cliente}</b></TableCell>
                        <TableCell align="center">{c.pedidos}</TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(c.ot)} fontWeight={600}>{fmtPct(c.ot)}</Typography></TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(c.if_)} fontWeight={600}>{fmtPct(c.if_)}</Typography></TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(c.otif)} fontWeight={700}>{fmtPct(c.otif)}</Typography></TableCell>
                        <TableCell align="center"><TendenciaIcon t={c.tendencia} /></TableCell>
                        <TableCell align="center">{nivelServicioChip(c.otif)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 2: Por Ruta ── */}
          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Ruta</b></TableCell>
                      <TableCell align="center"><b>N° Viajes</b></TableCell>
                      <TableCell align="right"><b>OT %</b></TableCell>
                      <TableCell align="right"><b>IF %</b></TableCell>
                      <TableCell align="right"><b>OTIF %</b></TableCell>
                      <TableCell align="right"><b>Tiempo Prom (h)</b></TableCell>
                      <TableCell align="right"><b>Desviación (h)</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_RUTAS.map(r => (
                      <TableRow key={r.ruta} hover>
                        <TableCell><b>{r.ruta}</b></TableCell>
                        <TableCell align="center">{r.viajes}</TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(r.ot)} fontWeight={600}>{fmtPct(r.ot)}</Typography></TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(r.if_)} fontWeight={600}>{fmtPct(r.if_)}</Typography></TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(r.otif)} fontWeight={700}>{fmtPct(r.otif)}</Typography></TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{r.tiempo_prom}h</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: r.desviacion > 1 ? 'error.main' : 'text.primary' }}>+{r.desviacion}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 3: Por Conductor ── */}
          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Conductor</b></TableCell>
                      <TableCell align="center"><b>N° Viajes</b></TableCell>
                      <TableCell align="right"><b>OT %</b></TableCell>
                      <TableCell align="right"><b>IF %</b></TableCell>
                      <TableCell align="right"><b>OTIF %</b></TableCell>
                      <TableCell align="center"><b>Incidentes</b></TableCell>
                      <TableCell align="right"><b>Productividad</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_CONDUCTORES.map(c => (
                      <TableRow key={c.conductor} hover>
                        <TableCell><b>{c.conductor}</b></TableCell>
                        <TableCell align="center">{c.viajes}</TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(c.ot)} fontWeight={600}>{fmtPct(c.ot)}</Typography></TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(c.if_)} fontWeight={600}>{fmtPct(c.if_)}</Typography></TableCell>
                        <TableCell align="right"><Typography fontSize={12} color={otColor(c.otif)} fontWeight={700}>{fmtPct(c.otif)}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={c.incidentes} color={c.incidentes === 0 ? 'success' : c.incidentes === 1 ? 'warning' : 'error'} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{c.productividad} viajes/mes</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Tab 4: Detalle Viajes ── */}
          {tab === 4 && (
            <Box sx={{ p: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell><b>Código</b></TableCell>
                      <TableCell><b>Cliente</b></TableCell>
                      <TableCell><b>Ruta</b></TableCell>
                      <TableCell><b>F. Prog.</b></TableCell>
                      <TableCell><b>F. Real</b></TableCell>
                      <TableCell align="center"><b>OT</b></TableCell>
                      <TableCell align="center"><b>IF</b></TableCell>
                      <TableCell align="center"><b>OTIF</b></TableCell>
                      <TableCell><b>Motivo</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {MOCK_VIAJES.map(v => (
                      <TableRow key={v.codigo} hover>
                        <TableCell sx={{ fontSize: 12 }}><b>{v.codigo}</b></TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{v.cliente}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{v.origen} → {v.destino}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{v.fecha_prog}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{v.fecha_real}</TableCell>
                        <TableCell align="center">{v.on_time ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="error" fontSize="small" />}</TableCell>
                        <TableCell align="center">{v.in_full ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="error" fontSize="small" />}</TableCell>
                        <TableCell align="center">{v.on_time && v.in_full ? <CheckCircle color="success" fontSize="small" /> : <Cancel color="error" fontSize="small" />}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{v.motivo || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  )
}
