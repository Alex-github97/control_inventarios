import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Chip, Button, alpha, LinearProgress,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, Divider,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  HourglassEmpty as HourglassIcon,
  RadioButtonUnchecked as PendingIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Group as GroupIcon,
  CalendarMonth as CalendarIcon,
  Factory as FactoryIcon,
  AccountBalance as FinanceIcon,
  Gavel as GavelIcon,
  Sync as SyncIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ── Mock Data ──────────────────────────────────────────────────────────────

type CicloEstado = 'COMPLETADO' | 'EN_PROCESO' | 'PENDIENTE'

const cicloSOIP: { paso: number; titulo: string; descripcion: string; estado: CicloEstado; fecha: string; responsable: string }[] = [
  { paso: 1, titulo: 'Recopilación de Datos', descripcion: 'Consolidación de datos de ventas, inventario y capacidad', estado: 'COMPLETADO', fecha: '2026-06-09', responsable: 'TI / Planificación' },
  { paso: 2, titulo: 'Revisión de Demanda', descripcion: 'Consenso del pronóstico con áreas Comercial y Marketing', estado: 'COMPLETADO', fecha: '2026-06-13', responsable: 'Demand Planning' },
  { paso: 3, titulo: 'Revisión de Supply', descripcion: 'Análisis de brechas capacidad vs demanda consensuada', estado: 'EN_PROCESO', fecha: '2026-06-20', responsable: 'Supply Planning' },
  { paso: 4, titulo: 'Revisión Financiera', descripcion: 'Impacto P&L del plan operativo vs presupuesto', estado: 'PENDIENTE', fecha: '2026-06-24', responsable: 'Finanzas' },
  { paso: 5, titulo: 'Revisión Ejecutiva', descripcion: 'Acuerdos y compromisos del equipo directivo', estado: 'PENDIENTE', fecha: '2026-06-27', responsable: 'Dirección General' },
]

const reuniones = [
  { titulo: 'Revisión Supply Chain', fecha: '2026-06-20 10:00', sala: 'Sala Boardroom A', asistentes: ['C. Rodríguez', 'A. López', 'M. Torres', 'Supply Team'], tipo: 'EN_PROCESO' },
  { titulo: 'Revisión Financiera', fecha: '2026-06-24 09:00', sala: 'Sala Dirección', asistentes: ['D. Mora', 'CFO', 'Finanzas'], tipo: 'PENDIENTE' },
  { titulo: 'Revisión Ejecutiva', fecha: '2026-06-27 08:00', sala: 'Sala Directivos', asistentes: ['CEO', 'COO', 'CFO', 'CMO'], tipo: 'PENDIENTE' },
]

const consensoDemanda = [
  { familia: 'Lubricantes', region: 'Bogotá', estadistico: 12000, comercial: 13800, consenso: 13000, variacion: 8.3 },
  { familia: 'Lubricantes', region: 'Medellín', estadistico: 8500, comercial: 9200, consenso: 8900, variacion: 4.7 },
  { familia: 'Filtros', region: 'Bogotá', estadistico: 4500, comercial: 5100, consenso: 4800, variacion: 6.7 },
  { familia: 'Filtros', region: 'Cali', estadistico: 3200, comercial: 3500, consenso: 3350, variacion: 4.7 },
  { familia: 'Repuestos', region: 'Nacional', estadistico: 1800, comercial: 1650, consenso: 1750, variacion: -2.8 },
  { familia: 'Empaques', region: 'Nacional', estadistico: 48000, comercial: 52000, consenso: 50000, variacion: 4.2 },
]

const brechasSupply = [
  { planta: 'Planta Bogotá', linea: 'Ensamble A1', demanda: 13000, capacidad: 14500, brecha: 1500, estado: 'OK', accion: 'Sin acción requerida' },
  { planta: 'Planta Bogotá', linea: 'Ensamble A3', demanda: 8900, capacidad: 7800, brecha: -1100, estado: 'CRITICO', accion: 'Horas extra + subcontratación' },
  { planta: 'Planta Medellín', linea: 'Línea Filtros', demanda: 4800, capacidad: 5200, brecha: 400, estado: 'OK', accion: 'Sin acción requerida' },
  { planta: 'CD Cali', linea: 'Distribución Sur', demanda: 3350, capacidad: 3100, brecha: -250, estado: 'ADVERTENCIA', accion: 'Refuerzo flota 3er trimestre' },
  { planta: 'Planta Bogotá', linea: 'CNC-04', demanda: 1750, capacidad: 1500, brecha: -250, estado: 'CRITICO', accion: 'Turno adicional o externalizar' },
  { planta: 'Nacional', linea: 'Empaques', demanda: 50000, capacidad: 52000, brecha: 2000, estado: 'OK', accion: 'Sin acción requerida' },
]

const impactoFinanciero = [
  { linea: 'Lubricantes', revenue: 2450000, revBudget: 2300000, cogs: 1470000, cogsBudget: 1380000, margen: 40.0, margenBudget: 40.0 },
  { linea: 'Filtros', revenue: 980000, revBudget: 920000, cogs: 588000, cogsBudget: 552000, margen: 40.0, margenBudget: 40.0 },
  { linea: 'Repuestos', revenue: 1260000, revBudget: 1300000, cogs: 882000, cogsBudget: 910000, margen: 30.0, margenBudget: 30.0 },
  { linea: 'Empaques', revenue: 840000, revBudget: 820000, cogs: 588000, cogsBudget: 574000, margen: 30.0, margenBudget: 30.0 },
  { linea: 'TOTAL', revenue: 5530000, revBudget: 5340000, cogs: 3528000, cogsBudget: 3416000, margen: 36.2, margenBudget: 36.0 },
]

const kpisEjecutivos = [
  { label: 'Revenue Plan', value: '$5.53M', vs: '+3.6% vs Budget', color: '#10B981', up: true },
  { label: 'Margen Bruto', value: '36.2%', vs: '+0.2pp vs Budget', color: APS_COLOR, up: true },
  { label: 'OTIF Proyectado', value: '96.2%', vs: '-0.8pp vs Meta', color: '#F59E0B', up: false },
  { label: 'Inventory Turns', value: '8.3x', vs: '+0.4x vs Meta', color: '#10B981', up: true },
]

const acuerdosEjecutivos = [
  { id: 1, acuerdo: 'Aprobar horas extra Línea A3 — 3er trimestre', responsable: 'COO', fecha: '2026-06-30', estado: 'PENDIENTE', prioridad: 'ALTA' },
  { id: 2, acuerdo: 'Contratar flota adicional para distribución zona Sur', responsable: 'Logística', fecha: '2026-07-15', estado: 'PENDIENTE', prioridad: 'ALTA' },
  { id: 3, acuerdo: 'Confirmar presupuesto campaña promocional Lubricantes Q3', responsable: 'CMO', fecha: '2026-06-25', estado: 'CONFIRMADO', prioridad: 'MEDIA' },
  { id: 4, acuerdo: 'Revisar contrato subcontratación CNC-04 con Proveedor MECAN', responsable: 'Compras', fecha: '2026-07-05', estado: 'PENDIENTE', prioridad: 'ALTA' },
  { id: 5, acuerdo: 'Publicar plan S&OP Jul 2026 a todas las áreas', responsable: 'Planificación', fecha: '2026-06-30', estado: 'PENDIENTE', prioridad: 'MEDIA' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function estadoCicloColor(estado: CicloEstado) {
  if (estado === 'COMPLETADO') return '#10B981'
  if (estado === 'EN_PROCESO') return '#F59E0B'
  return '#94A3B8'
}

function estadoCicloIcon(estado: CicloEstado) {
  if (estado === 'COMPLETADO') return <CheckIcon sx={{ fontSize: 20, color: '#10B981' }} />
  if (estado === 'EN_PROCESO') return <HourglassIcon sx={{ fontSize: 20, color: '#F59E0B' }} />
  return <PendingIcon sx={{ fontSize: 20, color: '#94A3B8' }} />
}

function brechaColor(estado: string) {
  if (estado === 'CRITICO') return '#EF4444'
  if (estado === 'ADVERTENCIA') return '#F59E0B'
  return '#10B981'
}

function acuerdoColor(estado: string) {
  if (estado === 'CONFIRMADO') return '#10B981'
  return APS_COLOR
}

function prioridadColor(p: string) {
  if (p === 'ALTA') return '#EF4444'
  if (p === 'MEDIA') return '#F59E0B'
  return '#64748B'
}

function formatCOP(v: number) {
  return `$${(v / 1000000).toFixed(2)}M`
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function APSSOIP() {
  const [tab, setTab] = useState(0)

  const pasoCompletados = cicloSOIP.filter(c => c.estado === 'COMPLETADO').length
  const progresoCiclo = (pasoCompletados / cicloSOIP.length) * 100

  return (
    <Layout title="S&OP / IBP — Advanced Planning & Scheduling">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
            <Chip label="S&OP" size="small" sx={{ bgcolor: APS_COLOR, color: '#fff', fontWeight: 800, fontSize: 11, height: 22 }} />
            <Chip label="IBP" size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.15), color: APS_COLOR, fontWeight: 800, fontSize: 11, height: 22 }} />
            <Typography fontSize={22} fontWeight={800} letterSpacing="-0.03em">Sales & Operations Planning</Typography>
          </Stack>
          <Typography fontSize={13} color="text.secondary">
            Ciclo Jun 2026 · Semana 3 de 4 · Próxima reunión: Revisión Supply — 20 Jun 2026
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" size="small" startIcon={<SyncIcon />} sx={{ borderColor: APS_COLOR, color: APS_COLOR, textTransform: 'none', fontWeight: 600 }}>
            Actualizar Ciclo
          </Button>
          <Button variant="contained" size="small"
            sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK }, textTransform: 'none', fontWeight: 600 }}>
            Publicar Plan
          </Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid #E5E7EB', '& .MuiTabs-indicator': { bgcolor: APS_COLOR } }}
      >
        {['Ciclo Actual', 'Revisión Demanda', 'Revisión Supply', 'Revisión Financiera', 'Revisión Ejecutiva'].map((label, i) => (
          <Tab key={i} label={label} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: APS_COLOR } }} />
        ))}
      </Tabs>

      {/* ── Tab 0: Ciclo Actual ───────────────────────────────────────────── */}
      {tab === 0 && (
        <Stack gap={3}>
          {/* Progress del ciclo */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Box>
                <Typography fontSize={15} fontWeight={700}>Progreso del Ciclo S&OP — Jun 2026</Typography>
                <Typography fontSize={12} color="text.secondary">{pasoCompletados} de {cicloSOIP.length} etapas completadas</Typography>
              </Box>
              <Typography fontSize={22} fontWeight={800} color={APS_COLOR}>{progresoCiclo.toFixed(0)}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progresoCiclo}
              sx={{ height: 10, borderRadius: 5, bgcolor: alpha(APS_COLOR, 0.12), '& .MuiLinearProgress-bar': { bgcolor: APS_COLOR, borderRadius: 5 } }}
            />
          </Paper>

          {/* Timeline */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Typography fontSize={15} fontWeight={700} mb={2.5}>Timeline del Ciclo S&OP</Typography>
            <Stack gap={0}>
              {cicloSOIP.map((paso, i) => {
                const color = estadoCicloColor(paso.estado)
                const isLast = i === cicloSOIP.length - 1
                return (
                  <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                    {/* Línea vertical + círculo */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '50%',
                        bgcolor: paso.estado === 'COMPLETADO' ? alpha('#10B981', 0.12) : paso.estado === 'EN_PROCESO' ? alpha('#F59E0B', 0.12) : '#F1F5F9',
                        border: `2px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {estadoCicloIcon(paso.estado)}
                      </Box>
                      {!isLast && (
                        <Box sx={{ width: 2, flex: 1, minHeight: 24, bgcolor: i < pasoCompletados ? '#10B981' : '#E5E7EB', my: 0.5 }} />
                      )}
                    </Box>
                    {/* Contenido */}
                    <Box sx={{ pb: isLast ? 0 : 2, flex: 1 }}>
                      <Stack direction="row" alignItems="center" gap={1} mb={0.25}>
                        <Typography fontSize={13} fontWeight={700} color={paso.estado === 'PENDIENTE' ? '#94A3B8' : 'text.primary'}>
                          {paso.paso}. {paso.titulo}
                        </Typography>
                        <Chip
                          label={paso.estado.replace('_', ' ')}
                          size="small"
                          sx={{ bgcolor: alpha(color, 0.1), color, height: 18, fontSize: 10, fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography fontSize={12} color="text.secondary" mb={0.5}>{paso.descripcion}</Typography>
                      <Stack direction="row" gap={2}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <CalendarIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
                          <Typography fontSize={11} color="text.secondary">{paso.fecha}</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <GroupIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
                          <Typography fontSize={11} color="text.secondary">{paso.responsable}</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Paper>

          {/* Próximas reuniones */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Typography fontSize={15} fontWeight={700} mb={2}>Próximas Reuniones del Ciclo</Typography>
            <Grid container spacing={2}>
              {reuniones.map((r, i) => {
                const color = r.tipo === 'EN_PROCESO' ? '#F59E0B' : '#94A3B8'
                return (
                  <Grid key={i} size={{ xs: 12, md: 4 }}>
                    <Paper elevation={0} sx={{ border: `1px solid ${alpha(color, 0.4)}`, borderRadius: '12px', p: 2, bgcolor: alpha(color, 0.04) }}>
                      <Stack direction="row" alignItems="center" gap={1} mb={1}>
                        <CalendarIcon sx={{ fontSize: 16, color }} />
                        <Typography fontSize={13} fontWeight={700} color={color}>{r.titulo}</Typography>
                      </Stack>
                      <Typography fontSize={12} fontWeight={600} color="text.primary" mb={0.25}>{r.fecha}</Typography>
                      <Typography fontSize={11} color="text.secondary" mb={1}>{r.sala}</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography fontSize={11} color="text.secondary" fontWeight={600} mb={0.5}>Asistentes:</Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {r.asistentes.map((a, j) => (
                          <Chip key={j} label={a} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', height: 18, fontSize: 10 }} />
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>
        </Stack>
      )}

      {/* ── Tab 1: Revisión Demanda ──────────────────────────────────────── */}
      {tab === 1 && (
        <Stack gap={3}>
          {/* KPIs variación */}
          <Grid container spacing={2}>
            {[
              { label: 'Demanda Consenso Total', value: '81,800 und', vs: '+5.2% vs Estadístico', color: APS_COLOR, up: true },
              { label: 'Variación vs Plan Anterior', value: '+3.1%', vs: 'Jun 2026 vs May 2026', color: '#10B981', up: true },
              { label: 'Familias con Consenso', value: '6 / 6', vs: '100% completado', color: '#10B981', up: true },
              { label: 'Ajuste Comercial Neto', value: '+4.8%', vs: 'Sobre base estadística', color: '#F59E0B', up: true },
            ].map((k, i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${k.color}`, borderRadius: '14px', p: 2.5 }}>
                  <Stack direction="row" alignItems="center" gap={0.5} mb={0.5}>
                    {k.up ? <TrendingUpIcon sx={{ fontSize: 16, color: k.color }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: '#EF4444' }} />}
                    <Typography fontSize={11} color="text.secondary" fontWeight={600}>{k.vs}</Typography>
                  </Stack>
                  <Typography fontSize={22} fontWeight={800} color={k.color}>{k.value}</Typography>
                  <Typography fontSize={12} fontWeight={600} color="text.primary" mt={0.25}>{k.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Tabla consenso */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography fontSize={15} fontWeight={700}>Consenso de Demanda por Familia / Región</Typography>
                <Typography fontSize={12} color="text.secondary">Pronóstico estadístico · Ajuste comercial · Consenso final — Jul 2026</Typography>
              </Box>
              <Button variant="contained" size="small"
                sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, textTransform: 'none', fontWeight: 600 }}>
                Aprobar Consenso
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Familia', 'Región', 'Estadístico', 'Ajuste Comercial', 'Consenso Final', 'Variación', 'Tendencia'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {consensoDemanda.map((c, i) => {
                  const varColor = c.variacion > 0 ? '#10B981' : '#EF4444'
                  return (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: alpha(APS_COLOR, 0.03) } }}>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>{c.familia}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{c.region}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12 }}>{c.estadistico.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>{c.comercial.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 800, color: APS_COLOR }}>{c.consenso.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={`${c.variacion > 0 ? '+' : ''}${c.variacion}%`}
                          size="small"
                          sx={{ bgcolor: alpha(varColor, 0.1), color: varColor, height: 20, fontSize: 10, fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {c.variacion > 0
                          ? <TrendingUpIcon sx={{ fontSize: 16, color: '#10B981' }} />
                          : <TrendingDownIcon sx={{ fontSize: 16, color: '#EF4444' }} />}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}

      {/* ── Tab 2: Revisión Supply ───────────────────────────────────────── */}
      {tab === 2 && (
        <Stack gap={3}>
          {/* Semáforo resumen */}
          <Grid container spacing={2}>
            {[
              { label: 'Recursos OK', value: '3', color: '#10B981', desc: 'Sin brechas' },
              { label: 'Advertencias', value: '1', color: '#F59E0B', desc: 'Requieren plan' },
              { label: 'Críticos', value: '2', color: '#EF4444', desc: 'Acción inmediata' },
              { label: 'Cobertura Plan', value: '83.3%', color: APS_COLOR, desc: 'Recursos cubiertos' },
            ].map((k, i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${k.color}`, borderRadius: '14px', p: 2.5 }}>
                  <Typography fontSize={26} fontWeight={800} color={k.color}>{k.value}</Typography>
                  <Typography fontSize={12} fontWeight={600} color="text.primary" mt={0.5}>{k.label}</Typography>
                  <Typography fontSize={11} color="text.secondary">{k.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Tabla brechas */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Box mb={2}>
              <Typography fontSize={15} fontWeight={700}>Brechas Supply vs Demanda — Jul 2026</Typography>
              <Typography fontSize={12} color="text.secondary">Análisis por planta y línea de producción</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Planta / CD', 'Línea / Recurso', 'Demanda Consenso', 'Capacidad Disponible', 'Brecha', 'Semáforo', 'Acción Recomendada'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {brechasSupply.map((b, i) => {
                  const color = brechaColor(b.estado)
                  return (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: b.estado === 'CRITICO' ? alpha('#EF4444', 0.03) : '#F8FAFC' } }}>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>{b.planta}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12 }}>{b.linea}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12 }}>{b.demanda.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12 }}>{b.capacidad.toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography fontSize={12} fontWeight={700} color={b.brecha >= 0 ? '#10B981' : '#EF4444'}>
                          {b.brecha >= 0 ? '+' : ''}{b.brecha.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {/* Semáforo */}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {['OK', 'ADVERTENCIA', 'CRITICO'].map(nivel => (
                            <Box key={nivel} sx={{
                              width: 12, height: 12, borderRadius: '50%',
                              bgcolor: b.estado === nivel ? brechaColor(nivel) : alpha(brechaColor(nivel), 0.2),
                            }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 11, color: b.estado === 'OK' ? '#64748B' : b.estado === 'CRITICO' ? '#EF4444' : '#F59E0B', fontWeight: b.estado !== 'OK' ? 600 : 400 }}>
                        {b.accion}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}

      {/* ── Tab 3: Revisión Financiera ───────────────────────────────────── */}
      {tab === 3 && (
        <Stack gap={3}>
          {/* KPIs financieros */}
          <Grid container spacing={2}>
            {[
              { label: 'Revenue Plan', value: formatCOP(5530000), vs: '+$190K vs Budget', color: '#10B981' },
              { label: 'COGS Plan', value: formatCOP(3528000), vs: '+$112K vs Budget', color: '#F59E0B' },
              { label: 'Margen Bruto', value: '36.2%', vs: '+0.2pp vs Budget', color: APS_COLOR },
              { label: 'Margen $', value: formatCOP(2002000), vs: '+$78K vs Budget', color: '#10B981' },
            ].map((k, i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${k.color}`, borderRadius: '14px', p: 2.5 }}>
                  <Typography fontSize={22} fontWeight={800} color={k.color}>{k.value}</Typography>
                  <Typography fontSize={12} fontWeight={600} color="text.primary" mt={0.5}>{k.label}</Typography>
                  <Typography fontSize={11} color="text.secondary">{k.vs}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Tabla impacto financiero */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Box mb={2}>
              <Typography fontSize={15} fontWeight={700}>Impacto Financiero del Plan Operativo</Typography>
              <Typography fontSize={12} color="text.secondary">Plan vs Presupuesto por línea de negocio — Jul 2026</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Línea Negocio', 'Revenue Plan', 'Revenue Budget', 'Var. Rev.', 'COGS Plan', 'COGS Budget', 'Margen Plan', 'Margen Budget', 'Resultado'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {impactoFinanciero.map((f, i) => {
                  const varRev = f.revenue - f.revBudget
                  const varRevPct = ((varRev / f.revBudget) * 100).toFixed(1)
                  const isTotal = f.linea === 'TOTAL'
                  const varMargen = f.margen - f.margenBudget
                  return (
                    <TableRow key={i} sx={{
                      '&:hover': { bgcolor: '#F8FAFC' },
                      bgcolor: isTotal ? alpha(APS_COLOR, 0.04) : 'transparent',
                      fontWeight: isTotal ? 800 : 400,
                    }}>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: isTotal ? 800 : 600, color: isTotal ? APS_COLOR : 'text.primary' }}>{f.linea}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: isTotal ? 700 : 400 }}>{formatCOP(f.revenue)}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{formatCOP(f.revBudget)}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={`${varRev >= 0 ? '+' : ''}${varRevPct}%`}
                          size="small"
                          sx={{ bgcolor: alpha(varRev >= 0 ? '#10B981' : '#EF4444', 0.1), color: varRev >= 0 ? '#10B981' : '#EF4444', height: 20, fontSize: 10, fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12 }}>{formatCOP(f.cogs)}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{formatCOP(f.cogsBudget)}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 700, color: APS_COLOR }}>{f.margen}%</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{f.margenBudget}%</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {varMargen >= 0
                          ? <TrendingUpIcon sx={{ fontSize: 16, color: '#10B981' }} />
                          : <TrendingDownIcon sx={{ fontSize: 16, color: '#EF4444' }} />}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}

      {/* ── Tab 4: Revisión Ejecutiva ────────────────────────────────────── */}
      {tab === 4 && (
        <Stack gap={3}>
          {/* 4 KPIs ejecutivos */}
          <Grid container spacing={2}>
            {kpisEjecutivos.map((k, i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${k.color}`, borderRadius: '14px', p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography fontSize={26} fontWeight={800} color={k.color}>{k.value}</Typography>
                      <Typography fontSize={12} fontWeight={600} color="text.primary" mt={0.5}>{k.label}</Typography>
                      <Stack direction="row" alignItems="center" gap={0.5} mt={0.25}>
                        {k.up ? <TrendingUpIcon sx={{ fontSize: 13, color: '#10B981' }} /> : <TrendingDownIcon sx={{ fontSize: 13, color: '#EF4444' }} />}
                        <Typography fontSize={11} color={k.up ? '#10B981' : '#EF4444'}>{k.vs}</Typography>
                      </Stack>
                    </Box>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '10px',
                      bgcolor: alpha(k.color, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i === 0 && <FinanceIcon sx={{ fontSize: 20, color: k.color }} />}
                      {i === 1 && <TrendingUpIcon sx={{ fontSize: 20, color: k.color }} />}
                      {i === 2 && <FactoryIcon sx={{ fontSize: 20, color: k.color }} />}
                      {i === 3 && <SyncIcon sx={{ fontSize: 20, color: k.color }} />}
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Resumen ejecutivo */}
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" gap={1} alignItems="center" mb={1}>
              <GavelIcon sx={{ fontSize: 18, color: APS_COLOR }} />
              <Typography fontSize={15} fontWeight={700}>Resumen Ejecutivo del Plan — Jun 2026</Typography>
            </Stack>
            <Typography fontSize={13} color="text.secondary" mb={2} lineHeight={1.7}>
              El plan operativo de julio 2026 muestra un crecimiento de demanda del <strong>+5.2%</strong> sobre la base estadística, impulsado principalmente por campañas comerciales en Lubricantes (+15%) y Filtros (+13%). El plan financiero supera el presupuesto en <strong>$190K de Revenue</strong> con un margen bruto mejorado de 36.2% (+0.2pp). Sin embargo, se identificaron <strong>2 recursos críticos</strong> (Línea A3 y CNC-04) con sobrecarga que requieren aprobación de horas extra y subcontratación antes del 30 de junio.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Tabla de acuerdos */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography fontSize={14} fontWeight={700}>Acuerdos y Compromisos</Typography>
              <Chip label={`${acuerdosEjecutivos.filter(a => a.estado === 'PENDIENTE').length} pendientes`} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR, fontWeight: 700, fontSize: 11 }} />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Acuerdo / Compromiso', 'Responsable', 'Fecha Límite', 'Prioridad', 'Estado'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', py: 1, bgcolor: '#F8FAFC' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {acuerdosEjecutivos.map(a => {
                  const eColor = acuerdoColor(a.estado)
                  const pColor = prioridadColor(a.prioridad)
                  return (
                    <TableRow key={a.id} sx={{ '&:hover': { bgcolor: alpha(APS_COLOR, 0.03) } }}>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{a.id}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600 }}>{a.acuerdo}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{a.responsable}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>{a.fecha}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={a.prioridad} size="small" sx={{ bgcolor: alpha(pColor, 0.1), color: pColor, height: 20, fontSize: 10, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          icon={a.estado === 'CONFIRMADO' ? <CheckIcon sx={{ fontSize: 12 }} /> : <PendingIcon sx={{ fontSize: 12 }} />}
                          label={a.estado}
                          size="small"
                          sx={{ bgcolor: alpha(eColor, 0.1), color: eColor, height: 20, fontSize: 10, fontWeight: 700, '& .MuiChip-icon': { color: eColor } }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}
    </Layout>
  )
}
