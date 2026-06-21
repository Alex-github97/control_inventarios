import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
  Grid,
  Button,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material'
import {
  Inventory,
  Refresh,
  CheckCircle,
  Cancel,
  FilterList,
  Layers,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const optimalParams = [
  { producto: 'Paleta Industrial 1200x1000', ss: 120, smin: 80, smax: 600, rop: 200, eoq: 350, dias_inv: 18, rotacion: 20.3, nivel_svc: 97.5, ok: true },
  { producto: 'Estiba Plástica 1100x1100', ss: 80, smin: 60, smax: 400, rop: 130, eoq: 200, dias_inv: 12, rotacion: 30.4, nivel_svc: 95.2, ok: true },
  { producto: 'Caja Corrugada Canal Simple', ss: 500, smin: 300, smax: 3000, rop: 800, eoq: 2000, dias_inv: 22, rotacion: 16.6, nivel_svc: 92.1, ok: false },
  { producto: 'Caja Corrugada Doble Canal', ss: 300, smin: 200, smax: 2000, rop: 500, eoq: 1500, dias_inv: 8, rotacion: 45.6, nivel_svc: 98.8, ok: true },
  { producto: 'Film Stretch 500m Natural', ss: 150, smin: 100, smax: 800, rop: 250, eoq: 500, dias_inv: 25, rotacion: 14.6, nivel_svc: 88.4, ok: false },
  { producto: 'Zuncho Plástico 16mm x 1000m', ss: 60, smin: 40, smax: 400, rop: 100, eoq: 300, dias_inv: 15, rotacion: 24.3, nivel_svc: 96.0, ok: true },
  { producto: 'Esquinero Cartón 50mm', ss: 200, smin: 100, smax: 1200, rop: 350, eoq: 800, dias_inv: 19, rotacion: 19.2, nivel_svc: 94.7, ok: true },
  { producto: 'Cinta Adhesiva 48mm x 100m', ss: 400, smin: 250, smax: 2500, rop: 650, eoq: 1500, dias_inv: 28, rotacion: 13.0, nivel_svc: 91.3, ok: false },
]

const coberturaData = [
  { familia: 'Paletas', cobertura_actual: 18, cobertura_obj: 15, brecha: 3, estado: 'EXCESO' },
  { familia: 'Estibas Plásticas', cobertura_actual: 12, cobertura_obj: 15, brecha: -3, estado: 'BAJO' },
  { familia: 'Cajas Corrugado', cobertura_actual: 15, cobertura_obj: 14, brecha: 1, estado: 'OK' },
  { familia: 'Film Stretch', cobertura_actual: 25, cobertura_obj: 12, brecha: 13, estado: 'EXCESO' },
  { familia: 'Zunchos', cobertura_actual: 15, cobertura_obj: 15, brecha: 0, estado: 'OK' },
  { familia: 'Esquineros', cobertura_actual: 8, cobertura_obj: 10, brecha: -2, estado: 'BAJO' },
  { familia: 'Cintas Adhesivas', cobertura_actual: 28, cobertura_obj: 14, brecha: 14, estado: 'EXCESO' },
]

interface AbcXyz {
  x: 'A' | 'B' | 'C'
  y: 'X' | 'Y' | 'Z'
  sku: string
  descripcion: string
  valor_anual: number
  cv: number
}

const abcXyzData: AbcXyz[] = [
  { x: 'A', y: 'X', sku: 'SKU-0012', descripcion: 'Caja Corrugada Doble Canal', valor_anual: 420000, cv: 0.08 },
  { x: 'A', y: 'X', sku: 'SKU-0034', descripcion: 'Paleta Industrial 1200x1000', valor_anual: 380000, cv: 0.12 },
  { x: 'A', y: 'Y', sku: 'SKU-0056', descripcion: 'Film Stretch 500m Natural', valor_anual: 310000, cv: 0.34 },
  { x: 'A', y: 'Z', sku: 'SKU-0078', descripcion: 'Esquinero Metálico 60mm', valor_anual: 290000, cv: 0.72 },
  { x: 'B', y: 'X', sku: 'SKU-0089', descripcion: 'Estiba Plástica 1100x1100', valor_anual: 180000, cv: 0.15 },
  { x: 'B', y: 'X', sku: 'SKU-0091', descripcion: 'Zuncho Plástico 16mm', valor_anual: 160000, cv: 0.18 },
  { x: 'B', y: 'Y', sku: 'SKU-0102', descripcion: 'Cinta Adhesiva 48mm', valor_anual: 140000, cv: 0.41 },
  { x: 'B', y: 'Z', sku: 'SKU-0115', descripcion: 'Separador Cartón 3mm', valor_anual: 130000, cv: 0.65 },
  { x: 'C', y: 'X', sku: 'SKU-0128', descripcion: 'Tapa Plástica TM-100', valor_anual: 45000, cv: 0.19 },
  { x: 'C', y: 'Y', sku: 'SKU-0139', descripcion: 'Protector Angular PVC', valor_anual: 32000, cv: 0.45 },
  { x: 'C', y: 'Z', sku: 'SKU-0147', descripcion: 'Bolsa Polietileno 60x80', valor_anual: 28000, cv: 0.88 },
]

const matrixCounts: Record<string, number> = {
  AX: abcXyzData.filter(d => d.x === 'A' && d.y === 'X').length,
  AY: abcXyzData.filter(d => d.x === 'A' && d.y === 'Y').length,
  AZ: abcXyzData.filter(d => d.x === 'A' && d.y === 'Z').length,
  BX: abcXyzData.filter(d => d.x === 'B' && d.y === 'X').length,
  BY: abcXyzData.filter(d => d.x === 'B' && d.y === 'Y').length,
  BZ: abcXyzData.filter(d => d.x === 'B' && d.y === 'Z').length,
  CX: abcXyzData.filter(d => d.x === 'C' && d.y === 'X').length,
  CY: abcXyzData.filter(d => d.x === 'C' && d.y === 'Y').length,
  CZ: abcXyzData.filter(d => d.x === 'C' && d.y === 'Z').length,
}

const matrixColors: Record<string, string> = {
  AX: '#10B981', AY: '#22C55E', AZ: '#84CC16',
  BX: '#0EA5E9', BY: '#38BDF8', BZ: '#7DD3FC',
  CX: '#F59E0B', CY: '#FBbf24', CZ: '#FDE68A',
}

interface ReposicionOrden {
  id: string
  producto: string
  tipo: 'COMPRA' | 'PRODUCCION' | 'TRASLADO'
  cantidad: number
  valor: number
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  estado: 'PENDIENTE' | 'APROBADA' | 'LANZADA'
  fecha_sugerida: string
}

const reposicionData: ReposicionOrden[] = [
  { id: 'ORD-001', producto: 'Caja Corrugada Canal Simple', tipo: 'COMPRA', cantidad: 4000, valor: 3200000, prioridad: 'ALTA', estado: 'PENDIENTE', fecha_sugerida: '2026-06-22' },
  { id: 'ORD-002', producto: 'Film Stretch 500m', tipo: 'PRODUCCION', cantidad: 600, valor: 2400000, prioridad: 'ALTA', estado: 'APROBADA', fecha_sugerida: '2026-06-24' },
  { id: 'ORD-003', producto: 'Papel Kraft 90g/m²', tipo: 'COMPRA', cantidad: 1500, valor: 1875000, prioridad: 'MEDIA', estado: 'PENDIENTE', fecha_sugerida: '2026-06-27' },
  { id: 'ORD-004', producto: 'Estiba Plástica 1100x1100', tipo: 'TRASLADO', cantidad: 420, valor: 0, prioridad: 'ALTA', estado: 'PENDIENTE', fecha_sugerida: '2026-06-21' },
  { id: 'ORD-005', producto: 'Fleje Metálico 32mm', tipo: 'COMPRA', cantidad: 500, valor: 950000, prioridad: 'MEDIA', estado: 'LANZADA', fecha_sugerida: '2026-06-30' },
  { id: 'ORD-006', producto: 'Paleta Exportación 1200x800', tipo: 'PRODUCCION', cantidad: 250, valor: 1850000, prioridad: 'BAJA', estado: 'PENDIENTE', fecha_sugerida: '2026-07-05' },
  { id: 'ORD-007', producto: 'Cinta Adhesiva 48mm x 100m', tipo: 'COMPRA', cantidad: 1500, valor: 675000, prioridad: 'BAJA', estado: 'APROBADA', fecha_sugerida: '2026-07-03' },
  { id: 'ORD-008', producto: 'Esquinero Cartón 50mm', tipo: 'TRASLADO', cantidad: 800, valor: 0, prioridad: 'MEDIA', estado: 'PENDIENTE', fecha_sugerida: '2026-06-25' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card sx={{ bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.3)}`, flex: 1 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ color: alpha(color, 0.8), fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>{value}</Typography>
      </CardContent>
    </Card>
  )
}

function TabOptimos() {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Parámetros de Inventario Óptimos</Typography>
        <Button variant="contained" startIcon={<Refresh />} sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK } }}>
          Recalcular
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <KpiCard label="SKUs Analizados" value={String(optimalParams.length)} color={APS_COLOR} />
        <KpiCard label="Dentro de Objetivo" value={String(optimalParams.filter(r => r.ok).length)} color="#10B981" />
        <KpiCard label="Fuera de Objetivo" value={String(optimalParams.filter(r => !r.ok).length)} color="#EF4444" />
        <KpiCard label="Nivel Svc Prom." value={`${(optimalParams.reduce((s, r) => s + r.nivel_svc, 0) / optimalParams.length).toFixed(1)}%`} color="#0EA5E9" />
      </Stack>

      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Producto', 'Stock Seg.', 'S. Mínimo', 'S. Máximo', 'Punto Reorden', 'EOQ', 'Días Inv.', 'Rotación', 'Niv. Svc %', 'Estado'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 10, color: APS_COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {optimalParams.map((r, i) => (
              <TableRow key={i} hover sx={{ bgcolor: r.ok ? 'inherit' : alpha('#EF4444', 0.03) }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{r.producto}</TableCell>
                <TableCell>{r.ss}</TableCell>
                <TableCell>{r.smin}</TableCell>
                <TableCell>{r.smax}</TableCell>
                <TableCell sx={{ color: APS_COLOR, fontWeight: 600 }}>{r.rop}</TableCell>
                <TableCell sx={{ color: APS_COLOR, fontWeight: 700 }}>{r.eoq}</TableCell>
                <TableCell>{r.dias_inv}d</TableCell>
                <TableCell>{r.rotacion.toFixed(1)}x</TableCell>
                <TableCell sx={{ color: r.nivel_svc >= 95 ? '#10B981' : r.nivel_svc >= 90 ? '#F59E0B' : '#EF4444', fontWeight: 700 }}>
                  {r.nivel_svc.toFixed(1)}%
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.ok ? 'OK' : 'REVISAR'}
                    size="small"
                    icon={r.ok ? <CheckCircle sx={{ fontSize: 12 }} /> : <Cancel sx={{ fontSize: 12 }} />}
                    sx={{
                      bgcolor: alpha(r.ok ? '#10B981' : '#EF4444', 0.15),
                      color: r.ok ? '#10B981' : '#EF4444',
                      fontWeight: 700, fontSize: 10,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function TabCobertura() {
  const estadoColor = (e: string) => e === 'OK' ? '#10B981' : e === 'BAJO' ? '#EF4444' : '#F59E0B'
  const estadoEmoji = (e: string) => e === 'OK' ? '🟢' : e === 'BAJO' ? '🔴' : '🟡'
  const maxCobertura = Math.max(...coberturaData.map(r => r.cobertura_actual))

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Análisis de Cobertura de Inventario</Typography>

      {/* Bar Chart */}
      <Paper sx={{ p: 3, mb: 3, border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR} sx={{ mb: 2 }}>Días de Cobertura por Familia</Typography>
        <Stack spacing={2}>
          {coberturaData.map(row => (
            <Box key={row.familia}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>{row.familia}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">Objetivo: {row.cobertura_obj}d</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: estadoColor(row.estado) }}>
                    {row.cobertura_actual}d
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ position: 'relative', height: 16, bgcolor: alpha('#6B7280', 0.15), borderRadius: 1 }}>
                {/* Target line */}
                <Box sx={{
                  position: 'absolute',
                  left: `${(row.cobertura_obj / maxCobertura) * 100}%`,
                  top: 0, bottom: 0, width: 2,
                  bgcolor: '#6B7280', zIndex: 2,
                }} />
                {/* Actual bar */}
                <Box sx={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${(row.cobertura_actual / maxCobertura) * 100}%`,
                  height: '100%',
                  bgcolor: estadoColor(row.estado),
                  borderRadius: 1,
                  opacity: 0.8,
                  transition: 'width 0.5s ease',
                }} />
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 3, height: 14, bgcolor: '#6B7280', borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">Línea objetivo</Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Familia', 'Cobertura Actual (días)', 'Cobertura Objetivo', 'Brecha', 'Semáforo', 'Estado'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {coberturaData.map((row, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.familia}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: estadoColor(row.estado) }}>{row.cobertura_actual}d</TableCell>
                <TableCell>{row.cobertura_obj}d</TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  color: row.brecha === 0 ? '#10B981' : row.brecha > 0 ? '#F59E0B' : '#EF4444',
                }}>
                  {row.brecha > 0 ? '+' : ''}{row.brecha}d
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 20 }}>{estadoEmoji(row.estado)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.estado}
                    size="small"
                    sx={{ bgcolor: alpha(estadoColor(row.estado), 0.15), color: estadoColor(row.estado), fontWeight: 700, fontSize: 10 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function TabAbcXyz() {
  const cellColor = (key: string) => matrixColors[key] || '#E5E7EB'
  const abcDesc = { A: '70% del valor', B: '25% del valor', C: '5% del valor' }
  const xyzDesc = { X: 'Demanda estable', Y: 'Demanda variable', Z: 'Demanda irregular' }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Clasificación ABC-XYZ</Typography>

      {/* Legend */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(['A', 'B', 'C'] as const).map(cls => (
          <Grid key={cls} size={{ xs: 12, md: 4 }}>
            <Card sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, bgcolor: alpha(APS_COLOR, 0.03) }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha(APS_COLOR, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography fontWeight={900} sx={{ color: APS_COLOR }}>{cls}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">{abcDesc[cls]}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Matrix 3x3 */}
      <Paper sx={{ p: 2.5, mb: 3, border: `1px solid ${alpha(APS_COLOR, 0.2)}` }}>
        <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR} sx={{ mb: 2 }}>Matriz de Clasificación Cruzada (SKUs por cuadrante)</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, color: 'text.secondary', minWidth: 50, textAlign: 'center' }}>
            VALOR (ABC) ↑
          </Typography>
          <Box sx={{ flex: 1 }}>
            {/* Column headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1, ml: 0 }}>
              {(['X', 'Y', 'Z'] as const).map(y => (
                <Box key={y} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">{y} — {xyzDesc[y]}</Typography>
                </Box>
              ))}
            </Box>
            {/* Matrix cells */}
            {(['A', 'B', 'C'] as const).map(x => (
              <Box key={x} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1 }}>
                {(['X', 'Y', 'Z'] as const).map(y => {
                  const key = `${x}${y}`
                  const count = matrixCounts[key]
                  return (
                    <Box key={key} sx={{
                      bgcolor: alpha(cellColor(key), 0.15),
                      border: `2px solid ${alpha(cellColor(key), 0.5)}`,
                      borderRadius: 2, p: 2, textAlign: 'center', minHeight: 80,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography variant="h5" fontWeight={900} sx={{ color: cellColor(key) }}>{count}</Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color: cellColor(key) }}>{key}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>SKUs</Typography>
                    </Box>
                  )
                })}
              </Box>
            ))}
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontWeight: 700, color: 'text.secondary' }}>
              VARIABILIDAD (XYZ) →
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* SKU Table */}
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Box sx={{ bgcolor: alpha(APS_COLOR, 0.06), px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR}>Detalle SKUs por Clasificación</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.04) }}>
              {['SKU', 'Descripción', 'Clase ABC', 'Clase XYZ', 'Cuadrante', 'Valor Anual $', 'Coef. Variación'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {abcXyzData.map((row, i) => {
              const key = `${row.x}${row.y}`
              const c = cellColor(key)
              return (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontWeight: 700, color: APS_COLOR }}>{row.sku}</TableCell>
                  <TableCell>{row.descripcion}</TableCell>
                  <TableCell>
                    <Chip label={row.x} size="small" sx={{ bgcolor: alpha(c, 0.2), color: c, fontWeight: 900, minWidth: 30 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={row.y} size="small" sx={{ bgcolor: alpha(c, 0.2), color: c, fontWeight: 900, minWidth: 30 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={key} size="small" sx={{ bgcolor: alpha(c, 0.25), color: c, fontWeight: 900, fontSize: 12 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>${row.valor_anual.toLocaleString()}</TableCell>
                  <TableCell sx={{ color: row.cv > 0.5 ? '#EF4444' : row.cv > 0.3 ? '#F59E0B' : '#10B981', fontWeight: 700 }}>
                    {row.cv.toFixed(2)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function TabReposicion() {
  const [tipoFiltro, setTipoFiltro] = useState('TODOS')
  const [prioFiltro, setPrioFiltro] = useState('TODOS')
  const [ordenes, setOrdenes] = useState<ReposicionOrden[]>(reposicionData)

  const filtered = ordenes.filter(o =>
    (tipoFiltro === 'TODOS' || o.tipo === tipoFiltro) &&
    (prioFiltro === 'TODOS' || o.prioridad === prioFiltro)
  )

  const totalPendiente = ordenes.filter(o => o.estado === 'PENDIENTE').reduce((s, o) => s + o.valor, 0)

  const handleAction = (id: string, action: 'APROBADA' | 'RECHAZADA') => {
    if (action === 'RECHAZADA') {
      setOrdenes(prev => prev.filter(o => o.id !== id))
    } else {
      setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: 'APROBADA' as const } : o))
    }
  }

  const estadoColor = (e: string) => e === 'PENDIENTE' ? '#F59E0B' : e === 'APROBADA' ? '#10B981' : '#0EA5E9'
  const tipoColor = (t: string) => t === 'COMPRA' ? '#7C3AED' : t === 'PRODUCCION' ? '#0EA5E9' : '#10B981'
  const prioColor = (p: string) => p === 'ALTA' ? '#EF4444' : p === 'MEDIA' ? '#F59E0B' : '#6B7280'

  return (
    <Box>
      {/* KPIs */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <KpiCard label="Total Pendiente Aprobación" value={`$${(totalPendiente / 1e6).toFixed(2)}M`} color="#EF4444" />
        <KpiCard label="Órdenes Pendientes" value={String(ordenes.filter(o => o.estado === 'PENDIENTE').length)} color="#F59E0B" />
        <KpiCard label="Órdenes Aprobadas" value={String(ordenes.filter(o => o.estado === 'APROBADA').length)} color="#10B981" />
        <KpiCard label="Órdenes Lanzadas" value={String(ordenes.filter(o => o.estado === 'LANZADA').length)} color="#0EA5E9" />
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FilterList sx={{ color: 'text.secondary' }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={tipoFiltro} label="Tipo" onChange={e => setTipoFiltro(e.target.value)}>
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="COMPRA">Compra</MenuItem>
            <MenuItem value="PRODUCCION">Producción</MenuItem>
            <MenuItem value="TRASLADO">Traslado</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Prioridad</InputLabel>
          <Select value={prioFiltro} label="Prioridad" onChange={e => setPrioFiltro(e.target.value)}>
            <MenuItem value="TODOS">Todas</MenuItem>
            <MenuItem value="ALTA">Alta</MenuItem>
            <MenuItem value="MEDIA">Media</MenuItem>
            <MenuItem value="BAJA">Baja</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">{filtered.length} órdenes</Typography>
      </Stack>

      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Orden', 'Producto', 'Tipo', 'Cantidad', 'Valor $', 'Prioridad', 'Estado', 'Fecha Sugerida', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 10, color: APS_COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id} hover>
                <TableCell sx={{ fontWeight: 700, color: APS_COLOR }}>{o.id}</TableCell>
                <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{o.producto}</TableCell>
                <TableCell>
                  <Chip label={o.tipo} size="small" sx={{ bgcolor: alpha(tipoColor(o.tipo), 0.15), color: tipoColor(o.tipo), fontWeight: 700, fontSize: 10 }} />
                </TableCell>
                <TableCell>{o.cantidad.toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {o.valor > 0 ? `$${o.valor.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>
                  <Chip label={o.prioridad} size="small" sx={{ bgcolor: alpha(prioColor(o.prioridad), 0.15), color: prioColor(o.prioridad), fontWeight: 700, fontSize: 10 }} />
                </TableCell>
                <TableCell>
                  <Chip label={o.estado} size="small" sx={{ bgcolor: alpha(estadoColor(o.estado), 0.15), color: estadoColor(o.estado), fontWeight: 700, fontSize: 10 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 11 }}>{o.fecha_sugerida}</TableCell>
                <TableCell>
                  {o.estado === 'PENDIENTE' && (
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAction(o.id, 'APROBADA')}
                        sx={{ fontSize: 10, py: 0.3, px: 1, borderColor: '#10B981', color: '#10B981', '&:hover': { bgcolor: alpha('#10B981', 0.1), borderColor: '#10B981' } }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAction(o.id, 'RECHAZADA')}
                        sx={{ fontSize: 10, py: 0.3, px: 1, borderColor: '#EF4444', color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1), borderColor: '#EF4444' } }}
                      >
                        Rechazar
                      </Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function APSInventario() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(APS_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers sx={{ color: APS_COLOR, fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: APS_COLOR, lineHeight: 1.2 }}>
              Optimización de Inventario Multi-Echelon
            </Typography>
            <Typography variant="caption" color="text.secondary">
              APS — Parámetros óptimos, cobertura, clasificación ABC-XYZ y reposición
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Chip label="APS" sx={{ bgcolor: APS_COLOR, color: 'white', fontWeight: 700 }} />
        </Stack>

        {/* Tabs */}
        <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.2)}`, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${alpha(APS_COLOR, 0.15)}`,
              bgcolor: alpha(APS_COLOR, 0.04),
              '& .MuiTab-root': { fontWeight: 700, fontSize: 13 },
              '& .Mui-selected': { color: APS_COLOR },
              '& .MuiTabs-indicator': { bgcolor: APS_COLOR },
            }}
          >
            <Tab icon={<Inventory fontSize="small" />} iconPosition="start" label="Parámetros Óptimos" />
            <Tab icon={<CheckCircle fontSize="small" />} iconPosition="start" label="Cobertura" />
            <Tab icon={<Layers fontSize="small" />} iconPosition="start" label="Clasificación ABC-XYZ" />
            <Tab icon={<Refresh fontSize="small" />} iconPosition="start" label="Órdenes de Reposición" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabOptimos />}
            {tab === 1 && <TabCobertura />}
            {tab === 2 && <TabAbcXyz />}
            {tab === 3 && <TabReposicion />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
