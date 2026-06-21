import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Chip, Button, alpha,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import {
  Add as AddIcon,
  AutoGraph as AutoGraphIcon,
  Psychology as PsychologyIcon,
  AccountTree as EnsembleIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ── Mock Data ──────────────────────────────────────────────────────────────

const pronosticos = [
  { id: 1, producto: 'Aceite Motor 20W50 5L', familia: 'Lubricantes', horizonte: '6 meses', tipo: 'HIBRIDO', metodo: 'Ensemble', accuracy: 94.2, bias: -0.8, fechaGen: '2026-06-01', fechaVig: '2026-11-30', estado: 'ACTIVO' },
  { id: 2, producto: 'Filtro Aire FA-220', familia: 'Filtros', horizonte: '3 meses', tipo: 'ML', metodo: 'LSTM', accuracy: 91.5, bias: 1.2, fechaGen: '2026-06-01', fechaVig: '2026-08-31', estado: 'ACTIVO' },
  { id: 3, producto: 'Tornillos M8 x 40 (caja)', familia: 'Ferretería', horizonte: '12 meses', tipo: 'ESTADISTICO', metodo: 'ARIMA', accuracy: 87.3, bias: -2.1, fechaGen: '2026-06-01', fechaVig: '2027-05-31', estado: 'ACTIVO' },
  { id: 4, producto: 'Repuesto Hidráulico RH-45', familia: 'Repuestos', horizonte: '6 meses', tipo: 'HIBRIDO', metodo: 'Ensemble', accuracy: 89.8, bias: 0.5, fechaGen: '2026-06-01', fechaVig: '2026-11-30', estado: 'ACTIVO' },
  { id: 5, producto: 'Sub-ensamble Motor M12', familia: 'Producto Terminado', horizonte: '3 meses', tipo: 'ML', metodo: 'LSTM', accuracy: 93.1, bias: -1.4, fechaGen: '2026-06-01', fechaVig: '2026-08-31', estado: 'BORRADOR' },
  { id: 6, producto: 'Lubricante Sintético LS-500', familia: 'Lubricantes', horizonte: '6 meses', tipo: 'ESTADISTICO', metodo: 'ARIMA', accuracy: 85.6, bias: 3.2, fechaGen: '2026-05-01', fechaVig: '2026-10-31', estado: 'VENCIDO' },
]

const detallesPeriodo = [
  { mes: 'Jul 2026', pronosticado: 1200, real: null, limInf: 1050, limSup: 1350 },
  { mes: 'Ago 2026', pronosticado: 1350, real: null, limInf: 1180, limSup: 1520 },
  { mes: 'Sep 2026', pronosticado: 1100, real: null, limInf: 960, limSup: 1240 },
  { mes: 'Oct 2026', pronosticado: 1480, real: null, limInf: 1290, limSup: 1670 },
  { mes: 'Nov 2026', pronosticado: 1620, real: null, limInf: 1410, limSup: 1830 },
  { mes: 'Dic 2026', pronosticado: 1950, real: null, limInf: 1700, limSup: 2200 },
  { mes: 'May 2026', pronosticado: 1180, real: 1210, limInf: 1030, limSup: 1330 },
  { mes: 'Jun 2026', pronosticado: 1240, real: 1195, limInf: 1080, limSup: 1400 },
]

const ajustesColaborativos = [
  { id: 1, area: 'Comercial', producto: 'Aceite Motor 20W50 5L', mes: 'Jul 2026', estadistico: 1200, ajuste: 1380, razon: 'Campaña promocional Q3', estado: 'APROBADO', usuario: 'Marta Gómez' },
  { id: 2, area: 'Comercial', producto: 'Filtro Aire FA-220', mes: 'Jul 2026', estadistico: 450, ajuste: 520, razon: 'Lanzamiento nuevo canal', estado: 'PENDIENTE', usuario: 'Carlos Ruiz' },
  { id: 3, area: 'Operaciones', producto: 'Sub-ensamble Motor M12', mes: 'Jul 2026', estadistico: 800, ajuste: 750, razon: 'Capacidad limitada línea A3', estado: 'APROBADO', usuario: 'Andrés López' },
  { id: 4, area: 'Finanzas', producto: 'Lubricante Sintético LS-500', mes: 'Jul 2026', estadistico: 600, ajuste: 550, razon: 'Restricción presupuestal Q3', estado: 'PENDIENTE', usuario: 'Diana Mora' },
  { id: 5, area: 'Comercial', producto: 'Repuesto Hidráulico RH-45', mes: 'Ago 2026', estadistico: 200, ajuste: 240, razon: 'Contrato nuevo cliente minero', estado: 'APROBADO', usuario: 'Marta Gómez' },
]

const comparativoColaboracion = [
  { familia: 'Lubricantes', estadistico: 1200, comercial: 1380, consenso: 1300 },
  { familia: 'Filtros', estadistico: 450, comercial: 520, consenso: 490 },
  { familia: 'Repuestos', estadistico: 800, comercial: 750, consenso: 780 },
  { familia: 'Empaques', estadistico: 5000, comercial: 5500, consenso: 5200 },
]

const precisionFamilias = [
  { familia: 'Lubricantes', mape: 5.8, bias: -0.8, accuracy: 94.2, trend: 'up' },
  { familia: 'Filtros', mape: 8.5, bias: 1.2, accuracy: 91.5, trend: 'up' },
  { familia: 'Ferretería', mape: 12.7, bias: -2.1, accuracy: 87.3, trend: 'down' },
  { familia: 'Repuestos', mape: 10.2, bias: 0.5, accuracy: 89.8, trend: 'stable' },
  { familia: 'Producto Terminado', mape: 6.9, bias: -1.4, accuracy: 93.1, trend: 'up' },
]

const historicoPrecision = [
  { mes: 'Ene', mape: 9.2, bias: -1.5, accuracy: 90.8 },
  { mes: 'Feb', mape: 8.8, bias: -1.2, accuracy: 91.2 },
  { mes: 'Mar', mape: 10.1, bias: 0.8, accuracy: 89.9 },
  { mes: 'Abr', mape: 9.5, bias: -0.5, accuracy: 90.5 },
  { mes: 'May', mape: 8.1, bias: -0.9, accuracy: 91.9 },
  { mes: 'Jun', mape: 7.6, bias: -1.1, accuracy: 92.4 },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function metodoColor(metodo: string) {
  if (metodo === 'LSTM') return '#3B82F6'
  if (metodo === 'Ensemble') return APS_COLOR
  return '#10B981'
}

function estadoPronosticoColor(estado: string) {
  if (estado === 'ACTIVO') return '#10B981'
  if (estado === 'BORRADOR') return '#F59E0B'
  return '#EF4444'
}

function areaColor(area: string) {
  if (area === 'Comercial') return '#3B82F6'
  if (area === 'Operaciones') return '#10B981'
  return '#F59E0B'
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function APSDemanda() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="Demand Planning — Advanced Planning & Scheduling">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
            <Chip label="APS" size="small" sx={{ bgcolor: APS_COLOR, color: '#fff', fontWeight: 800, fontSize: 11, height: 22 }} />
            <Typography fontSize={22} fontWeight={800} letterSpacing="-0.03em">Demand Planning</Typography>
          </Stack>
          <Typography fontSize={13} color="text.secondary">Gestión de pronósticos, colaboración y precisión · Jun 2026</Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK }, textTransform: 'none', fontWeight: 600 }}
        >
          Nuevo Pronóstico
        </Button>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid #E5E7EB', '& .MuiTabs-indicator': { bgcolor: APS_COLOR } }}
      >
        {['Pronóstico', 'Colaboración', 'Precisión'].map((label, i) => (
          <Tab key={i} label={label} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: APS_COLOR } }} />
        ))}
      </Tabs>

      {/* ── Tab 0: Pronóstico ────────────────────────────────────────────── */}
      {tab === 0 && (
        <Stack gap={3}>
          {/* Tabla de pronósticos */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography fontSize={15} fontWeight={700}>Pronósticos Activos</Typography>
                <Typography fontSize={12} color="text.secondary">Modelos en producción por familia de producto</Typography>
              </Box>
              <Chip label={`${pronosticos.length} modelos`} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR, fontWeight: 700, fontSize: 11 }} />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Producto', 'Familia', 'Horizonte', 'Método', 'Accuracy', 'Bias', 'Vigencia', 'Estado'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pronosticos.map(p => {
                  const mColor = metodoColor(p.metodo)
                  const eColor = estadoPronosticoColor(p.estado)
                  return (
                    <TableRow key={p.id} sx={{ '&:hover': { bgcolor: alpha(APS_COLOR, 0.03) } }}>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, maxWidth: 180 }}>{p.producto}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{p.familia}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12 }}>{p.horizonte}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={p.metodo} size="small" sx={{ bgcolor: alpha(mColor, 0.1), color: mColor, height: 20, fontSize: 10, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <Typography fontSize={12} fontWeight={700} color={p.accuracy >= 90 ? '#10B981' : '#F59E0B'}>{p.accuracy}%</Typography>
                          {/* Mini barra inline */}
                          <Box sx={{ width: 40, height: 6, bgcolor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${p.accuracy}%`, bgcolor: p.accuracy >= 90 ? '#10B981' : '#F59E0B', borderRadius: 3 }} />
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography fontSize={12} fontWeight={700} color={Math.abs(p.bias) <= 1 ? '#10B981' : '#F59E0B'}>
                          {p.bias > 0 ? '+' : ''}{p.bias}%
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 11, color: '#64748B' }}>{p.fechaVig}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={p.estado} size="small" sx={{ bgcolor: alpha(eColor, 0.1), color: eColor, height: 20, fontSize: 10, fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>

          {/* Detalles por período */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Box mb={2}>
              <Typography fontSize={15} fontWeight={700}>Detalle por Período — Aceite Motor 20W50 5L</Typography>
              <Typography fontSize={12} color="text.secondary">Pronóstico, real e intervalos de confianza 95%</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Mes', 'Pronosticado', 'Real', 'Límite Inferior', 'Límite Superior', 'Visualización'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {detallesPeriodo.map((d, i) => {
                  const max = 2200
                  const isFuture = d.real === null
                  return (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: '#F8FAFC' }, bgcolor: isFuture ? alpha(APS_COLOR, 0.02) : 'transparent' }}>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          {isFuture && <Chip label="F" size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR, height: 16, fontSize: 9, minWidth: 20 }} />}
                          {d.mes}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: APS_COLOR }}>{d.pronosticado.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: d.real ? '#10B981' : '#94A3B8' }}>
                        {d.real ? d.real.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{d.limInf.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{d.limSup.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {/* Mini barra con intervalo */}
                        <Box sx={{ position: 'relative', width: 120, height: 12, bgcolor: '#F1F5F9', borderRadius: 6 }}>
                          {/* Intervalo */}
                          <Box sx={{
                            position: 'absolute', top: 3, height: 6,
                            left: `${(d.limInf / max) * 100}%`,
                            width: `${((d.limSup - d.limInf) / max) * 100}%`,
                            bgcolor: alpha(APS_COLOR, 0.2), borderRadius: 3,
                          }} />
                          {/* Pronóstico */}
                          <Box sx={{
                            position: 'absolute', top: 2, height: 8, width: 3,
                            left: `${(d.pronosticado / max) * 100}%`,
                            bgcolor: APS_COLOR, borderRadius: 2,
                          }} />
                          {/* Real */}
                          {d.real && (
                            <Box sx={{
                              position: 'absolute', top: 2, height: 8, width: 3,
                              left: `${(d.real / max) * 100}%`,
                              bgcolor: '#10B981', borderRadius: 2,
                            }} />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}

      {/* ── Tab 1: Colaboración ──────────────────────────────────────────── */}
      {tab === 1 && (
        <Stack gap={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography fontSize={15} fontWeight={700}>Ajustes Colaborativos</Typography>
                    <Typography fontSize={12} color="text.secondary">Revisiones por área funcional · Jul 2026</Typography>
                  </Box>
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Área', 'Producto', 'Estadístico', 'Ajuste', 'Razón', 'Estado', 'Responsable'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ajustesColaborativos.map(a => {
                      const aColor = areaColor(a.area)
                      const diff = a.ajuste - a.estadistico
                      const diffPct = ((diff / a.estadistico) * 100).toFixed(1)
                      return (
                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: alpha(APS_COLOR, 0.03) } }}>
                          <TableCell sx={{ py: 1 }}>
                            <Chip label={a.area} size="small" sx={{ bgcolor: alpha(aColor, 0.1), color: aColor, height: 20, fontSize: 10, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, maxWidth: 150 }}>{a.producto}</TableCell>
                          <TableCell sx={{ py: 1, fontSize: 12 }}>{a.estadistico.toLocaleString()}</TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <Typography fontSize={12} fontWeight={700} color={diff > 0 ? '#10B981' : '#EF4444'}>
                                {a.ajuste.toLocaleString()}
                              </Typography>
                              <Typography fontSize={10} color={diff > 0 ? '#10B981' : '#EF4444'}>
                                ({diff > 0 ? '+' : ''}{diffPct}%)
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ py: 1, fontSize: 11, color: '#64748B', maxWidth: 160 }}>{a.razon}</TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Chip
                              icon={a.estado === 'APROBADO' ? <CheckIcon sx={{ fontSize: 12 }} /> : <PendingIcon sx={{ fontSize: 12 }} />}
                              label={a.estado}
                              size="small"
                              sx={{ bgcolor: alpha(a.estado === 'APROBADO' ? '#10B981' : '#F59E0B', 0.1), color: a.estado === 'APROBADO' ? '#10B981' : '#F59E0B', height: 20, fontSize: 10, fontWeight: 700, '& .MuiChip-icon': { color: a.estado === 'APROBADO' ? '#10B981' : '#F59E0B' } }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1, fontSize: 11, color: '#64748B' }}>{a.usuario}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>

            {/* Gráfico comparativo barras agrupadas CSS */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
                <Typography fontSize={15} fontWeight={700} mb={0.5}>Comparativo por Familia</Typography>
                <Typography fontSize={12} color="text.secondary" mb={2}>Estadístico vs Comercial vs Consenso · Jul 2026</Typography>
                <Stack gap={0.5} mb={1.5}>
                  {[
                    { label: 'Estadístico', color: '#3B82F6' },
                    { label: 'Comercial', color: '#10B981' },
                    { label: 'Consenso', color: APS_COLOR },
                  ].map((l, i) => (
                    <Stack key={i} direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: l.color }} />
                      <Typography fontSize={11} color="text.secondary">{l.label}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Stack gap={2.5}>
                  {comparativoColaboracion.map((c, i) => {
                    const max = Math.max(c.estadistico, c.comercial, c.consenso) * 1.1
                    return (
                      <Box key={i}>
                        <Typography fontSize={12} fontWeight={700} mb={0.75}>{c.familia}</Typography>
                        <Stack gap={0.5}>
                          {[
                            { val: c.estadistico, color: '#3B82F6' },
                            { val: c.comercial, color: '#10B981' },
                            { val: c.consenso, color: APS_COLOR },
                          ].map((bar, j) => (
                            <Stack key={j} direction="row" alignItems="center" gap={1}>
                              <Box sx={{ flex: 1, height: 10, bgcolor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${(bar.val / max) * 100}%`, bgcolor: bar.color, borderRadius: 5 }} />
                              </Box>
                              <Typography fontSize={10} fontWeight={600} color={bar.color} sx={{ minWidth: 40, textAlign: 'right' }}>
                                {bar.val.toLocaleString()}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* ── Tab 2: Precisión ─────────────────────────────────────────────── */}
      {tab === 2 && (
        <Stack gap={3}>
          {/* KPIs de precisión */}
          <Grid container spacing={2}>
            {[
              { label: 'MAPE Global', value: '8.4%', sub: 'Mean Absolute % Error', color: APS_COLOR, good: true },
              { label: 'BIAS Global', value: '-1.1%', sub: 'Sesgo del sistema', color: '#3B82F6', good: true },
              { label: 'Forecast Accuracy', value: '91.6%', sub: 'Promedio todas las familias', color: '#10B981', good: true },
              { label: 'Modelos Activos', value: '6', sub: 'En producción', color: '#F59E0B', good: true },
            ].map((k, i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${k.color}`, borderRadius: '14px', p: 2.5 }}>
                  <Typography fontSize={26} fontWeight={800} color={k.color}>{k.value}</Typography>
                  <Typography fontSize={12} fontWeight={600} color="text.primary" mt={0.5}>{k.label}</Typography>
                  <Typography fontSize={11} color="text.secondary">{k.sub}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            {/* Por familia */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
                <Typography fontSize={15} fontWeight={700} mb={0.5}>Precisión por Familia</Typography>
                <Typography fontSize={12} color="text.secondary" mb={2}>MAPE · BIAS · Accuracy</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Familia', 'MAPE', 'BIAS', 'Accuracy', 'Tendencia'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {precisionFamilias.map((f, i) => (
                      <TableRow key={i} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>{f.familia}</TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: f.mape < 10 ? '#10B981' : '#F59E0B' }}>{f.mape}%</TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: Math.abs(f.bias) <= 1.5 ? '#10B981' : '#F59E0B' }}>
                          {f.bias > 0 ? '+' : ''}{f.bias}%
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Stack direction="row" alignItems="center" gap={0.75}>
                            <Typography fontSize={12} fontWeight={700} color={f.accuracy >= 90 ? APS_COLOR : '#F59E0B'}>{f.accuracy}%</Typography>
                            <Box sx={{ width: 50, height: 6, bgcolor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${f.accuracy}%`, bgcolor: f.accuracy >= 90 ? APS_COLOR : '#F59E0B', borderRadius: 3 }} />
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          {f.trend === 'up' && <TrendingUpIcon sx={{ fontSize: 18, color: '#10B981' }} />}
                          {f.trend === 'down' && <TrendingDownIcon sx={{ fontSize: 18, color: '#EF4444' }} />}
                          {f.trend === 'stable' && <Box sx={{ width: 18, height: 3, bgcolor: '#F59E0B', borderRadius: 2, mt: 0.5 }} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>

            {/* Histórico + mini charts */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
                <Typography fontSize={15} fontWeight={700} mb={0.5}>Histórico de Precisión</Typography>
                <Typography fontSize={12} color="text.secondary" mb={2}>Ene – Jun 2026 · Global</Typography>
                {/* Mini chart tendencia Accuracy */}
                <Box mb={2.5}>
                  <Typography fontSize={12} fontWeight={700} color={APS_COLOR} mb={1}>Forecast Accuracy (%)</Typography>
                  <Stack direction="row" gap={1} alignItems="flex-end" height={70}>
                    {historicoPrecision.map((h, i) => (
                      <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography fontSize={10} fontWeight={700} color={APS_COLOR}>{h.accuracy}</Typography>
                        <Box sx={{ width: '100%', height: `${(h.accuracy - 88) * 8}px`, bgcolor: alpha(APS_COLOR, 0.7), borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                        <Typography fontSize={10} color="text.secondary">{h.mes}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                {/* Mini chart MAPE */}
                <Box mb={2}>
                  <Typography fontSize={12} fontWeight={700} color="#F59E0B" mb={1}>MAPE (%) — menor es mejor</Typography>
                  <Stack direction="row" gap={1} alignItems="flex-end" height={50}>
                    {historicoPrecision.map((h, i) => (
                      <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography fontSize={10} fontWeight={700} color="#F59E0B">{h.mape}</Typography>
                        <Box sx={{ width: '100%', height: `${h.mape * 4}px`, bgcolor: alpha('#F59E0B', 0.7), borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                        <Typography fontSize={10} color="text.secondary">{h.mes}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Mes', 'MAPE', 'BIAS', 'Accuracy'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historicoPrecision.map((h, i) => (
                      <TableRow key={i} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>{h.mes} 2026</TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: h.mape < 10 ? '#10B981' : '#F59E0B' }}>{h.mape}%</TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: Math.abs(h.bias) <= 1.5 ? '#10B981' : '#F59E0B' }}>
                          {h.bias > 0 ? '+' : ''}{h.bias}%
                        </TableCell>
                        <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: h.accuracy >= 91 ? APS_COLOR : '#F59E0B' }}>{h.accuracy}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Layout>
  )
}
