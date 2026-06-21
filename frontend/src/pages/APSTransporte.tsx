import React, { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Divider,
  Badge,
  Tooltip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const despachos = [
  { id: 'D-001', origen: 'Planta Bogotá', destino: 'CEDI Medellín', vehiculo: 'Tractocamión', capacidadKg: 30000, cargaKg: 26400, despacho: '2026-06-20', entrega: '2026-06-21', estado: 'PLANIFICADO', costo: 4200000 },
  { id: 'D-002', origen: 'CEDI Bogotá', destino: 'PV Zona Norte', vehiculo: 'Camión 5T', capacidadKg: 5000, cargaKg: 4800, despacho: '2026-06-20', entrega: '2026-06-20', estado: 'EN_RUTA', costo: 380000 },
  { id: 'D-003', origen: 'Planta Bogotá', destino: 'CEDI Cali', vehiculo: 'Tractocamión', capacidadKg: 30000, cargaKg: 18500, despacho: '2026-06-21', entrega: '2026-06-22', estado: 'PLANIFICADO', costo: 5100000 },
  { id: 'D-004', origen: 'CEDI Medellín', destino: 'PV El Poblado', vehiculo: 'Furgón', capacidadKg: 2000, cargaKg: 1940, despacho: '2026-06-21', entrega: '2026-06-21', estado: 'PLANIFICADO', costo: 210000 },
  { id: 'D-005', origen: 'CEDI Bogotá', destino: 'PV Chapinero', vehiculo: 'Furgón', capacidadKg: 2000, cargaKg: 820, despacho: '2026-06-21', entrega: '2026-06-21', estado: 'PLANIFICADO', costo: 95000 },
  { id: 'D-006', origen: 'Planta Bogotá', destino: 'CEDI Barranquilla', vehiculo: 'Tractocamión', capacidadKg: 30000, cargaKg: 29100, despacho: '2026-06-22', entrega: '2026-06-24', estado: 'PLANIFICADO', costo: 7800000 },
  { id: 'D-007', origen: 'CEDI Cali', destino: 'PV Centenario', vehiculo: 'Camión 5T', capacidadKg: 5000, cargaKg: 3200, despacho: '2026-06-22', entrega: '2026-06-22', estado: 'PLANIFICADO', costo: 290000 },
  { id: 'D-008', origen: 'CEDI Medellín', destino: 'PV La Floresta', vehiculo: 'Furgón', capacidadKg: 2000, cargaKg: 1750, despacho: '2026-06-23', entrega: '2026-06-23', estado: 'PLANIFICADO', costo: 180000 },
]

const rutasOptimizadas = [
  { id: 'R-001', paradas: ['CEDI Bogotá', 'PV Chapinero', 'PV Usaquén', 'PV Suba'], vehiculo: 'Camión 5T', km: 48, cargaKg: 4600, ahorroVsManual: '18%', co2: 12.4 },
  { id: 'R-002', paradas: ['CEDI Medellín', 'PV El Poblado', 'PV La Floresta', 'PV Laureles'], vehiculo: 'Furgón', km: 32, cargaKg: 1820, ahorroVsManual: '24%', co2: 5.8 },
  { id: 'R-003', paradas: ['CEDI Cali', 'PV Centenario', 'PV Chipichape'], vehiculo: 'Camión 5T', km: 22, cargaKg: 3200, ahorroVsManual: '11%', co2: 7.2 },
  { id: 'R-004', paradas: ['Planta Bogotá', 'CEDI Medellín', 'CEDI Manizales'], vehiculo: 'Tractocamión', km: 420, cargaKg: 28000, ahorroVsManual: '8%', co2: 89.3 },
]

const consolidaciones = [
  { id: 'CON-001', origen: 'Planta Bogotá', destino: 'CEDI Medellín', fecha: '2026-06-22', productos: ['SKU-A001', 'SKU-B210', 'SKU-D320'], kg: 24800, estado: 'PENDIENTE' },
  { id: 'CON-002', origen: 'CEDI Bogotá', destino: 'PV Zona Norte', fecha: '2026-06-22', productos: ['SKU-C045', 'SKU-A001'], kg: 4100, estado: 'CONSOLIDADO' },
  { id: 'CON-003', origen: 'Planta Bogotá', destino: 'CEDI Barranquilla', fecha: '2026-06-23', productos: ['SKU-A001', 'SKU-B210', 'SKU-C045', 'SKU-E100'], kg: 29100, estado: 'PENDIENTE' },
]

const tmsViajes = [
  { tmsId: 'TMS-2841', apsId: 'D-001', ruta: 'Bogotá → Medellín', vehiculoTMS: 'PH-6821', vehiculoAPS: 'Tractocamión', estadoTMS: 'CONFIRMADO', estadoAPS: 'PLANIFICADO', sincronizado: true },
  { tmsId: 'TMS-2842', apsId: 'D-002', ruta: 'CEDI Bog → PV Norte', vehiculoTMS: 'LJ-4410', vehiculoAPS: 'Camión 5T', estadoTMS: 'EN_RUTA', estadoAPS: 'EN_RUTA', sincronizado: true },
  { tmsId: 'TMS-2843', apsId: 'D-003', ruta: 'Bogotá → Cali', vehiculoTMS: 'No asignado', vehiculoAPS: 'Tractocamión', estadoTMS: 'PENDIENTE', estadoAPS: 'PLANIFICADO', sincronizado: false },
  { tmsId: '—', apsId: 'D-006', ruta: 'Bogotá → Barranquilla', vehiculoTMS: '—', vehiculoAPS: 'Tractocamión', estadoTMS: '—', estadoAPS: 'PLANIFICADO', sincronizado: false },
  { tmsId: 'TMS-2845', apsId: 'D-004', ruta: 'CEDI Med → PV Poblado', vehiculoTMS: 'BW-9023', vehiculoAPS: 'Furgón', estadoTMS: 'CONFIRMADO', estadoAPS: 'PLANIFICADO', sincronizado: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('es-CO').format(n)
const fmtCur = (n: number) => `$${new Intl.NumberFormat('es-CO').format(n)}`

const usoPct = (carga: number, cap: number) => Math.round((carga / cap) * 100)

const usoColor = (pct: number) => {
  if (pct >= 90) return '#22C55E'
  if (pct >= 65) return '#F97316'
  return '#EF4444'
}

const estadoChipColor = (e: string): 'info' | 'warning' | 'success' | 'default' => {
  if (e === 'EN_RUTA') return 'info'
  if (e === 'PLANIFICADO') return 'warning'
  if (e === 'ENTREGADO') return 'success'
  return 'default'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  const color = accent ?? APS_COLOR
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: alpha(color, 0.2), borderRadius: 2, background: alpha(color, 0.04), height: '100%' }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  )
}

// ─── CSS Bar ──────────────────────────────────────────────────────────────────

function BarUso({ pct }: { pct: number }) {
  const color = usoColor(pct)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#E5E7EB', overflow: 'hidden', minWidth: 60 }}>
        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </Box>
      <Typography variant="caption" fontWeight={700} color={color} sx={{ minWidth: 34 }}>
        {pct}%
      </Typography>
    </Box>
  )
}

// ─── Tab: Planificación ───────────────────────────────────────────────────────

function TabPlanificacion() {
  const [generados, setGenerados] = useState<Set<string>>(new Set())

  const generar = (id: string) => setGenerados(prev => new Set([...prev, id]))

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={700} color={APS_COLOR}>Despachos Planificados</Typography>
        <Chip label={`${despachos.length} despachos`} sx={{ bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR, fontWeight: 700 }} />
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.05) }}>
              {['ID', 'Origen', 'Destino', 'Vehículo', 'Cap. kg', 'Carga kg', '% Uso', 'Despacho', 'Entrega', 'Estado', 'Costo', 'TMS'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: APS_COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {despachos.map(d => {
              const pct = usoPct(d.cargaKg, d.capacidadKg)
              const yaGenerado = generados.has(d.id)
              return (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: APS_COLOR }}>{d.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{d.origen}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{d.destino}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{d.vehiculo}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(d.capacidadKg)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(d.cargaKg)}</TableCell>
                  <TableCell sx={{ minWidth: 120 }}><BarUso pct={pct} /></TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{d.despacho}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{d.entrega}</TableCell>
                  <TableCell>
                    <Chip label={d.estado} color={estadoChipColor(d.estado)} size="small" sx={{ fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtCur(d.costo)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant={yaGenerado ? 'outlined' : 'contained'}
                      disabled={yaGenerado}
                      sx={{
                        fontSize: '0.62rem', py: 0.3, px: 1, whiteSpace: 'nowrap',
                        ...(yaGenerado ? { color: '#22C55E', borderColor: '#22C55E' } : { bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK } }),
                      }}
                      onClick={() => generar(d.id)}
                    >
                      {yaGenerado ? 'Generado ✓' : 'Generar en TMS'}
                    </Button>
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

// ─── Tab: Optimización de Rutas ───────────────────────────────────────────────

function TabOptimizacion() {
  const [consolidando, setConsolidando] = useState<Set<string>>(new Set())

  const consolidar = (id: string) => setConsolidando(prev => new Set([...prev, id]))

  const metricCards = [
    { label: 'Ahorro vs Plan Manual', value: '17.8%', detail: 'Reducción en costo logístico', color: '#22C55E' },
    { label: 'Reducción CO2', value: '12.4%', detail: 'vs rutas no optimizadas', color: '#2563EB' },
    { label: 'Km Optimizados', value: '3,420 km', detail: 'En rutas semanales', color: APS_COLOR },
    { label: 'Rutas Consolidadas', value: '4', detail: 'Multi-parada activas', color: '#F97316' },
  ]

  return (
    <Box>
      {/* Métricas */}
      <Grid container spacing={2} mb={3}>
        {metricCards.map(m => (
          <Grid key={m.label} size={{ xs: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${alpha(m.color, 0.25)}`, borderRadius: 2, bgcolor: alpha(m.color, 0.04) }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>{m.label}</Typography>
              <Typography variant="h5" fontWeight={700} color={m.color} mt={0.5}>{m.value}</Typography>
              <Typography variant="caption" color="text.secondary">{m.detail}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Rutas */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR} mb={1.5}>Rutas Multi-Parada Sugeridas</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.05) }}>
                  {['ID', 'Paradas', 'Vehículo', 'Km', 'Carga', 'Ahorro', 'CO2 ton'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: APS_COLOR }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rutasOptimizadas.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: APS_COLOR }}>{r.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <Stack spacing={0.3}>
                        {r.paradas.map((p, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {i > 0 && <Box sx={{ width: 6, height: 1, bgcolor: '#9CA3AF' }} />}
                            <Typography variant="caption">{p}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.vehiculo}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{r.km}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(r.cargaKg)}</TableCell>
                    <TableCell>
                      <Chip label={r.ahorroVsManual} size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', color: '#2563EB' }}>{r.co2}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Consolidación */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR} mb={1.5}>Consolidación de Carga</Typography>
          <Stack spacing={2}>
            {consolidaciones.map(c => {
              const done = consolidando.has(c.id) || c.estado === 'CONSOLIDADO'
              return (
                <Paper key={c.id} elevation={0} sx={{ p: 2, border: `1px solid ${done ? alpha('#22C55E', 0.3) : 'divider'}`, borderRadius: 2, bgcolor: done ? alpha('#22C55E', 0.03) : 'inherit' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" fontWeight={700} color={APS_COLOR}>{c.id}</Typography>
                      <Typography variant="body2" fontWeight={600} mt={0.3}>{c.origen} → {c.destino}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.fecha} · {fmt(c.kg)} kg</Typography>
                      <Box sx={{ mt: 0.8, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {c.productos.map(p => (
                          <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                        ))}
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      variant={done ? 'outlined' : 'contained'}
                      disabled={done}
                      sx={{
                        fontSize: '0.65rem', py: 0.3, px: 1, ml: 1, flexShrink: 0,
                        ...(done ? { color: '#22C55E', borderColor: '#22C55E' } : { bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK } }),
                      }}
                      onClick={() => consolidar(c.id)}
                    >
                      {done ? 'Consolidado ✓' : 'Consolidar'}
                    </Button>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Tab: Integración TMS ─────────────────────────────────────────────────────

function TabTMS() {
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSync, setUltimaSync] = useState('2026-06-20 08:32:14')

  const resincronizar = () => {
    setSincronizando(true)
    setTimeout(() => {
      setSincronizando(false)
      const now = new Date()
      setUltimaSync(`${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`)
    }, 2000)
  }

  const synced = tmsViajes.filter(v => v.sincronizado).length
  const divergentes = tmsViajes.filter(v => !v.sincronizado).length

  return (
    <Box>
      {/* Status bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: alpha(APS_COLOR, 0.03) }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
              <Typography variant="body2" fontWeight={600}>TMS Conectado</Typography>
            </Box>
            <Chip label={`${synced} sincronizados`} size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700 }} />
            {divergentes > 0 && (
              <Chip label={`${divergentes} divergencias`} size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 700 }} />
            )}
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">Última sincronización</Typography>
              <Typography variant="caption" fontWeight={700}>{ultimaSync}</Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              disabled={sincronizando}
              onClick={resincronizar}
              sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK }, fontSize: '0.78rem' }}
            >
              {sincronizando ? 'Sincronizando...' : 'Re-sincronizar con TMS'}
            </Button>
          </Stack>
        </Stack>
        {sincronizando && (
          <Box sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: '#E5E7EB', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: '100%', bgcolor: APS_COLOR, borderRadius: 2, animation: 'pulse 1s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
          </Box>
        )}
      </Paper>

      {/* Tabla comparativa */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.05) }}>
              {['TMS ID', 'APS ID', 'Ruta', 'Vehículo TMS', 'Vehículo APS', 'Estado TMS', 'Estado APS', 'Coherencia'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tmsViajes.map((v, i) => (
              <TableRow key={i} hover sx={{ bgcolor: !v.sincronizado ? alpha('#EF4444', 0.04) : 'inherit' }}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: v.tmsId !== '—' ? '#2563EB' : '#9CA3AF' }}>{v.tmsId}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: APS_COLOR }}>{v.apsId}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{v.ruta}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: v.vehiculoTMS === '—' || v.vehiculoTMS === 'No asignado' ? '#EF4444' : 'inherit', fontWeight: v.vehiculoTMS === 'No asignado' ? 600 : 400 }}>
                  {v.vehiculoTMS}
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{v.vehiculoAPS}</TableCell>
                <TableCell>
                  {v.estadoTMS !== '—'
                    ? <Chip label={v.estadoTMS} size="small" sx={{ fontSize: '0.65rem', bgcolor: v.estadoTMS === 'EN_RUTA' ? '#EFF6FF' : v.estadoTMS === 'CONFIRMADO' ? '#F0FDF4' : '#FFFBEB', color: v.estadoTMS === 'EN_RUTA' ? '#2563EB' : v.estadoTMS === 'CONFIRMADO' ? '#16A34A' : '#D97706' }} />
                    : <Typography variant="caption" color="text.disabled">—</Typography>
                  }
                </TableCell>
                <TableCell>
                  <Chip label={v.estadoAPS} color={estadoChipColor(v.estadoAPS)} size="small" sx={{ fontSize: '0.65rem' }} />
                </TableCell>
                <TableCell>
                  <Tooltip title={v.sincronizado ? 'Sincronizado' : 'Divergencia detectada'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: v.sincronizado ? '#22C55E' : '#EF4444', boxShadow: v.sincronizado ? '0 0 5px #22C55E' : '0 0 5px #EF4444' }} />
                      <Typography variant="caption" color={v.sincronizado ? '#16A34A' : '#DC2626'} fontWeight={600}>
                        {v.sincronizado ? 'OK' : 'Divergencia'}
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diferencias destacadas */}
      {divergentes > 0 && (
        <Paper elevation={0} sx={{ mt: 2, p: 2, border: '1px solid', borderColor: alpha('#EF4444', 0.3), borderRadius: 2, bgcolor: alpha('#EF4444', 0.03) }}>
          <Typography variant="subtitle2" fontWeight={700} color="#DC2626" mb={1}>Diferencias Detectadas</Typography>
          {tmsViajes.filter(v => !v.sincronizado).map((v, i) => (
            <Box key={i} sx={{ mb: 1, p: 1.5, bgcolor: '#FFF', borderRadius: 1, border: '1px solid', borderColor: alpha('#EF4444', 0.2) }}>
              <Typography variant="caption" fontWeight={700} color="#DC2626">{v.apsId} vs {v.tmsId}</Typography>
              <Typography variant="caption" display="block" color="text.secondary" mt={0.3}>
                {v.tmsId === '—' ? 'Viaje APS sin correspondencia en TMS. Requiere creación manual.' : `Estado TMS: "${v.estadoTMS}" vs APS: "${v.estadoAPS}". Vehículo TMS: "${v.vehiculoTMS}".`}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function APSTransporte() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="APS — Transporte (TRP)">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Box sx={{ width: 8, height: 32, borderRadius: 1, bgcolor: APS_COLOR }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={APS_COLOR}>
                Transport Requirements Planning
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Planificación de transporte integrada con TMS · Optimización de rutas y carga
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <KpiCard label="Vehículos Planificados" value="34" sub="Para próximos 7 días" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <KpiCard label="Carga Total" value="485 ton" sub="Toneladas planificadas" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <KpiCard label="Eficiencia Carga" value="82.3%" sub="Uso promedio vehículos" accent="#22C55E" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <KpiCard label="Costo Transporte" value="$1.2M/mes" sub="COP total planificado" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <KpiCard label="CO2 Estimado" value="45.2 ton" sub="Huella de carbono" accent="#2563EB" />
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
              <Tab label="Planificación" />
              <Tab label="Optimización de Rutas" />
              <Tab label="Integración TMS" />
            </Tabs>
          </Box>
          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabPlanificacion />}
            {tab === 1 && <TabOptimizacion />}
            {tab === 2 && <TabTMS />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
