import React, { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { alpha } from '@mui/material/styles'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const nodos = [
  { id: 'planta', tipo: 'PLANTA', nombre: 'Planta Principal', ciudad: 'Bogotá', stock: 12400, capacidad: 20000, semaforo: 'green' },
  { id: 'cedi_bog', tipo: 'CEDI', nombre: 'CEDI Bogotá', ciudad: 'Bogotá', stock: 3200, capacidad: 8000, semaforo: 'orange' },
  { id: 'cedi_med', tipo: 'CEDI', nombre: 'CEDI Medellín', ciudad: 'Medellín', stock: 4800, capacidad: 8000, semaforo: 'green' },
  { id: 'pv_ch', tipo: 'PUNTO_VENTA', nombre: 'PV Chapinero', ciudad: 'Bogotá', stock: 180, capacidad: 600, semaforo: 'orange' },
  { id: 'pv_us', tipo: 'PUNTO_VENTA', nombre: 'PV Usaquén', ciudad: 'Bogotá', stock: 90, capacidad: 600, semaforo: 'red' },
  { id: 'pv_el', tipo: 'PUNTO_VENTA', nombre: 'PV El Poblado', ciudad: 'Medellín', stock: 320, capacidad: 600, semaforo: 'green' },
  { id: 'pv_lf', tipo: 'PUNTO_VENTA', nombre: 'PV La Floresta', ciudad: 'Medellín', stock: 410, capacidad: 600, semaforo: 'green' },
]

const traslados = [
  { id: 'T-001', origen: 'Planta Principal', destino: 'CEDI Bogotá', producto: 'SKU-A001', cantidad: 500, emision: '2026-06-20', llegada: '2026-06-21', tipo: 'REPOSICIÓN', estado: 'APROBADA', costo: 1200000 },
  { id: 'T-002', origen: 'CEDI Bogotá', destino: 'PV Usaquén', producto: 'SKU-B210', cantidad: 80, emision: '2026-06-20', llegada: '2026-06-20', tipo: 'URGENTE', estado: 'EN_TRANSITO', costo: 180000 },
  { id: 'T-003', origen: 'Planta Principal', destino: 'CEDI Medellín', producto: 'SKU-C045', cantidad: 1200, emision: '2026-06-21', llegada: '2026-06-22', tipo: 'REPOSICIÓN', estado: 'SUGERIDA', costo: 3400000 },
  { id: 'T-004', origen: 'CEDI Medellín', destino: 'PV La Floresta', producto: 'SKU-A001', cantidad: 150, emision: '2026-06-21', llegada: '2026-06-21', tipo: 'NORMAL', estado: 'SUGERIDA', costo: 95000 },
  { id: 'T-005', origen: 'Planta Principal', destino: 'CEDI Bogotá', producto: 'SKU-D320', cantidad: 800, emision: '2026-06-22', llegada: '2026-06-23', tipo: 'REPOSICIÓN', estado: 'SUGERIDA', costo: 2100000 },
  { id: 'T-006', origen: 'CEDI Bogotá', destino: 'PV Chapinero', producto: 'SKU-B210', cantidad: 200, emision: '2026-06-22', llegada: '2026-06-22', tipo: 'NORMAL', estado: 'APROBADA', costo: 120000 },
  { id: 'T-007', origen: 'CEDI Medellín', destino: 'PV El Poblado', producto: 'SKU-C045', cantidad: 300, emision: '2026-06-23', llegada: '2026-06-23', tipo: 'NORMAL', estado: 'EN_TRANSITO', costo: 210000 },
]

const brechas = [
  { nodo: 'PV Usaquén', sku: 'SKU-B210', demandaProyectada: 320, disponible: 90, enCamino: 80, delta: -150, diasBrecha: 4, accion: 'TRASLADO_INMEDIATO' },
  { nodo: 'PV Chapinero', sku: 'SKU-A001', demandaProyectada: 280, disponible: 180, enCamino: 200, delta: 100, diasBrecha: 0, accion: 'NINGUNA' },
  { nodo: 'CEDI Bogotá', sku: 'SKU-C045', demandaProyectada: 4200, disponible: 3200, enCamino: 500, delta: -500, diasBrecha: 2, accion: 'ORDEN_EMERGENCIA' },
  { nodo: 'PV El Poblado', sku: 'SKU-D320', demandaProyectada: 190, disponible: 320, enCamino: 0, delta: 130, diasBrecha: 0, accion: 'NINGUNA' },
  { nodo: 'PV La Floresta', sku: 'SKU-A001', demandaProyectada: 500, disponible: 410, enCamino: 150, delta: 60, diasBrecha: 0, accion: 'NINGUNA' },
  { nodo: 'CEDI Medellín', sku: 'SKU-B210', demandaProyectada: 5800, disponible: 4800, enCamino: 1200, delta: 200, diasBrecha: 0, accion: 'NINGUNA' },
  { nodo: 'PV Chapinero', sku: 'SKU-D320', demandaProyectada: 420, disponible: 180, enCamino: 0, delta: -240, diasBrecha: 5, accion: 'TRASLADO_INMEDIATO' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const semaforoColor = (s: string) => {
  if (s === 'green') return '#22C55E'
  if (s === 'orange') return '#F97316'
  return '#EF4444'
}

const estadoChipColor = (estado: string): 'warning' | 'success' | 'info' | 'default' => {
  if (estado === 'SUGERIDA') return 'warning'
  if (estado === 'APROBADA') return 'success'
  if (estado === 'EN_TRANSITO') return 'info'
  return 'default'
}

const accionChip = (accion: string) => {
  if (accion === 'TRASLADO_INMEDIATO') return { label: 'Traslado Inmediato', color: '#EF4444', bg: '#FEF2F2' }
  if (accion === 'ORDEN_EMERGENCIA') return { label: 'Orden Emergencia', color: '#F97316', bg: '#FFF7ED' }
  return { label: 'Ninguna', color: '#22C55E', bg: '#F0FDF4' }
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO').format(n)
const fmtCur = (n: number) => `$${new Intl.NumberFormat('es-CO').format(n)}`

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: alpha(APS_COLOR, 0.2), borderRadius: 2, background: alpha(APS_COLOR, 0.04) }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} color={APS_COLOR} mt={0.5}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  )
}

// ─── Tab: Red de Distribución ─────────────────────────────────────────────────

function TabRed() {
  const planta = nodos.find(n => n.tipo === 'PLANTA')!
  const cedis = nodos.filter(n => n.tipo === 'CEDI')
  const pvsBog = nodos.filter(n => n.tipo === 'PUNTO_VENTA' && n.ciudad === 'Bogotá')
  const pvsMed = nodos.filter(n => n.tipo === 'PUNTO_VENTA' && n.ciudad === 'Medellín')

  const NodeBox = ({ nodo, color }: { nodo: typeof nodos[0]; color: string }) => (
    <Box sx={{
      border: `2px solid ${color}`,
      borderRadius: 2,
      p: 1.5,
      minWidth: 140,
      background: alpha(color, 0.07),
      position: 'relative',
    }}>
      <Box sx={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: '50%', bgcolor: semaforoColor(nodo.semaforo) }} />
      <Typography variant="caption" fontWeight={700} color={color} display="block">{nodo.tipo}</Typography>
      <Typography variant="body2" fontWeight={600} mt={0.3}>{nodo.nombre}</Typography>
      <Typography variant="caption" color="text.secondary">{nodo.ciudad}</Typography>
      <Divider sx={{ my: 0.8 }} />
      <Typography variant="caption" display="block">Stock: <b>{fmt(nodo.stock)}</b> u</Typography>
      <Typography variant="caption" display="block">Cap: {fmt(nodo.capacidad)} u</Typography>
      <Box sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#E5E7EB', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${Math.min(100, (nodo.stock / nodo.capacidad) * 100).toFixed(0)}%`, bgcolor: semaforoColor(nodo.semaforo), borderRadius: 3, transition: 'width 0.4s' }} />
      </Box>
    </Box>
  )

  const Arrow = ({ label }: { label?: string }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 1 }}>
      {label && <Typography variant="caption" color="text.secondary" mb={0.5}>{label}</Typography>}
      <Box sx={{ width: 40, height: 2, bgcolor: alpha(APS_COLOR, 0.4), position: 'relative' }}>
        <Box sx={{ position: 'absolute', right: -1, top: -4, width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `8px solid ${alpha(APS_COLOR, 0.6)}` }} />
      </Box>
    </Box>
  )

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={3} color={APS_COLOR}>Red de Distribución Multi-Escalón</Typography>

      {/* Leyenda semaforo */}
      <Stack direction="row" spacing={2} mb={3}>
        {[['green', 'Stock OK'], ['orange', 'Stock Bajo'], ['red', 'Quiebre']].map(([c, l]) => (
          <Stack key={c} direction="row" alignItems="center" spacing={0.8}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: semaforoColor(c) }} />
            <Typography variant="caption" color="text.secondary">{l}</Typography>
          </Stack>
        ))}
      </Stack>

      {/* Red visual */}
      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 800 }}>

          {/* PLANTA */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
            <NodeBox nodo={planta} color="#2563EB" />
          </Box>

          {/* Arrow Planta → CEDIs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 320 }}>
            <Arrow label="traslado" />
          </Box>

          {/* CEDIs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center', height: 320 }}>
            {cedis.map(c => <NodeBox key={c.id} nodo={c} color="#16A34A" />)}
          </Box>

          {/* Arrow CEDIs → PVs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 320 }}>
            <Arrow label="reparto" />
          </Box>

          {/* PVs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', height: 320 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} ml={1}>Bogotá</Typography>
              {pvsBog.map(p => <NodeBox key={p.id} nodo={p} color="#6B7280" />)}
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} ml={1}>Medellín</Typography>
              {pvsMed.map(p => <NodeBox key={p.id} nodo={p} color="#6B7280" />)}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Resumen semaforo */}
      <Grid container spacing={2} mt={2}>
        {[
          { label: 'Nodos OK', count: nodos.filter(n => n.semaforo === 'green').length, color: '#22C55E' },
          { label: 'Stock Bajo', count: nodos.filter(n => n.semaforo === 'orange').length, color: '#F97316' },
          { label: 'Quiebre', count: nodos.filter(n => n.semaforo === 'red').length, color: '#EF4444' },
        ].map(r => (
          <Grid key={r.label} size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${alpha(r.color, 0.3)}`, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: r.color, flexShrink: 0 }} />
              <Box>
                <Typography variant="h5" fontWeight={700} color={r.color}>{r.count}</Typography>
                <Typography variant="caption" color="text.secondary">{r.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// ─── Tab: Traslados ───────────────────────────────────────────────────────────

function TabTraslados() {
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroOrigen, setFiltroOrigen] = useState('TODOS')
  const [estadosLocales, setEstadosLocales] = useState<Record<string, string>>(
    Object.fromEntries(traslados.map(t => [t.id, t.estado]))
  )

  const origenes = ['TODOS', ...Array.from(new Set(traslados.map(t => t.origen)))]
  const estados = ['TODOS', 'SUGERIDA', 'APROBADA', 'EN_TRANSITO']

  const filtered = traslados.filter(t => {
    const eMatch = filtroEstado === 'TODOS' || estadosLocales[t.id] === filtroEstado
    const oMatch = filtroOrigen === 'TODOS' || t.origen === filtroOrigen
    return eMatch && oMatch
  })

  const aprobar = (id: string) => setEstadosLocales(prev => ({ ...prev, [id]: 'APROBADA' }))
  const rechazar = (id: string) => setEstadosLocales(prev => ({ ...prev, [id]: 'SUGERIDA' }))

  const totalesPorEstado = (['SUGERIDA', 'APROBADA', 'EN_TRANSITO'] as const).map(e => ({
    estado: e,
    count: traslados.filter(t => estadosLocales[t.id] === e).length,
    costo: traslados.filter(t => estadosLocales[t.id] === e).reduce((a, t) => a + t.costo, 0),
  }))

  return (
    <Box>
      {/* Totales */}
      <Grid container spacing={2} mb={3}>
        {totalesPorEstado.map(t => (
          <Grid key={t.estado} size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Chip label={t.estado} color={estadoChipColor(t.estado)} size="small" sx={{ mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>{t.count} traslados</Typography>
              <Typography variant="caption" color="text.secondary">{fmtCur(t.costo)}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={filtroEstado} label="Estado" onChange={e => setFiltroEstado(e.target.value)}>
            {estados.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Origen</InputLabel>
          <Select value={filtroOrigen} label="Origen" onChange={e => setFiltroOrigen(e.target.value)}>
            {origenes.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {/* Tabla */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.05) }}>
              {['ID', 'Origen', 'Destino', 'Producto', 'Cantidad', 'F. Emisión', 'F. Llegada', 'Tipo', 'Estado', 'Costo', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(t => {
              const est = estadosLocales[t.id]
              return (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: APS_COLOR }}>{t.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{t.origen}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{t.destino}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{t.producto}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(t.cantidad)}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{t.emision}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{t.llegada}</TableCell>
                  <TableCell>
                    <Chip label={t.tipo} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={est} color={estadoChipColor(est)} size="small" sx={{ fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{fmtCur(t.costo)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {est === 'SUGERIDA' && (
                        <Button size="small" variant="contained" sx={{ fontSize: '0.65rem', py: 0.3, px: 1, bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK } }} onClick={() => aprobar(t.id)}>
                          Aprobar
                        </Button>
                      )}
                      {est === 'APROBADA' && (
                        <Button size="small" variant="outlined" color="error" sx={{ fontSize: '0.65rem', py: 0.3, px: 1 }} onClick={() => rechazar(t.id)}>
                          Rechazar
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ─── Tab: Brechas ─────────────────────────────────────────────────────────────

function TabBrechas() {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={2} color={APS_COLOR}>Brechas de Inventario por Nodo y SKU</Typography>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.05) }}>
              {['Nodo', 'SKU', 'Dem. Proyectada', 'Disponible', 'En Camino', 'Delta', 'Días Brecha', 'Acción'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {brechas.map((b, i) => {
              const ac = accionChip(b.accion)
              return (
                <TableRow key={i} hover sx={{ bgcolor: b.delta < 0 ? alpha('#EF4444', 0.03) : 'inherit' }}>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{b.nodo}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.sku}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(b.demandaProyectada)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', color: b.disponible < b.demandaProyectada * 0.5 ? '#EF4444' : 'inherit', fontWeight: b.disponible < b.demandaProyectada * 0.5 ? 700 : 400 }}>
                    {fmt(b.disponible)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#2563EB' }}>{fmt(b.enCamino)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: b.delta < 0 ? '#EF4444' : '#22C55E' }}>
                    {b.delta > 0 ? '+' : ''}{fmt(b.delta)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 700, color: b.diasBrecha > 0 ? '#EF4444' : '#22C55E' }}>
                    {b.diasBrecha > 0 ? `${b.diasBrecha}d` : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ac.label}
                      size="small"
                      sx={{ fontSize: '0.65rem', bgcolor: ac.bg, color: ac.color, fontWeight: 600, border: `1px solid ${alpha(ac.color, 0.3)}` }}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Resumen */}
      <Grid container spacing={2} mt={2}>
        {[
          { label: 'SKUs con brecha', count: brechas.filter(b => b.delta < 0).length, color: '#EF4444' },
          { label: 'Traslados urgentes', count: brechas.filter(b => b.accion === 'TRASLADO_INMEDIATO').length, color: '#F97316' },
          { label: 'Órdenes emergencia', count: brechas.filter(b => b.accion === 'ORDEN_EMERGENCIA').length, color: '#7C3AED' },
          { label: 'Sin problema', count: brechas.filter(b => b.accion === 'NINGUNA').length, color: '#22C55E' },
        ].map(r => (
          <Grid key={r.label} size={{ xs: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${alpha(r.color, 0.3)}`, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color={r.color}>{r.count}</Typography>
              <Typography variant="caption" color="text.secondary">{r.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function APSDistribucion() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="APS — Distribución (DRP)">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Box sx={{ width: 8, height: 32, borderRadius: 1, bgcolor: APS_COLOR }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={APS_COLOR}>
                Distribution Requirements Planning
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Red de distribución multi-escalón · Planta → CEDI → Puntos de Venta
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}>
            <KpiCard label="Traslados Pendientes" value="23" sub="Por aprobar o programar" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <KpiCard label="Valor en Tránsito" value="$2.3M" sub="COP en movimiento" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <KpiCard label="Fill Rate Red" value="97.1%" sub="Nivel de servicio global" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <KpiCard label="Costo Red" value="$890K/mes" sub="Costo logístico total" />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(APS_COLOR, 0.03) }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                '& .MuiTab-root': { fontWeight: 600, fontSize: '0.82rem', textTransform: 'none' },
                '& .Mui-selected': { color: APS_COLOR },
                '& .MuiTabs-indicator': { bgcolor: APS_COLOR },
              }}
            >
              <Tab label="Red de Distribución" />
              <Tab label="Traslados" />
              <Tab label="Brechas" />
            </Tabs>
          </Box>
          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabRed />}
            {tab === 1 && <TabTraslados />}
            {tab === 2 && <TabBrechas />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
