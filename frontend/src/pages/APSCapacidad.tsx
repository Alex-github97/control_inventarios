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
  IconButton,
  Divider,
} from '@mui/material'
import {
  Speed,
  Warning,
  Add,
  Remove,
  Engineering,
  Schedule,
  TrendingDown,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const crpData = [
  { recurso: 'Línea Ensamble 1', periodo: 'Sem 25', capacidad: 480, carga: 442, pct_uso: 92.1, es_cuello: true },
  { recurso: 'Línea Ensamble 2', periodo: 'Sem 25', capacidad: 480, carga: 368, pct_uso: 76.7, es_cuello: false },
  { recurso: 'Centro Mecanizado A', periodo: 'Sem 25', capacidad: 320, carga: 310, pct_uso: 96.9, es_cuello: true },
  { recurso: 'Centro Mecanizado B', periodo: 'Sem 25', capacidad: 320, carga: 245, pct_uso: 76.6, es_cuello: false },
  { recurso: 'Celda Soldadura', periodo: 'Sem 26', capacidad: 240, carga: 180, pct_uso: 75.0, es_cuello: false },
  { recurso: 'Pintura / Acabados', periodo: 'Sem 26', capacidad: 400, carga: 310, pct_uso: 77.5, es_cuello: false },
  { recurso: 'Empaque Final', periodo: 'Sem 26', capacidad: 480, carga: 390, pct_uso: 81.2, es_cuello: false },
  { recurso: 'Almacén PT', periodo: 'Sem 26', capacidad: 560, carga: 420, pct_uso: 75.0, es_cuello: false },
]

const cuelloData = [
  {
    id: 1,
    recurso: 'Línea Ensamble 1',
    descripcion: 'Falta de operadores calificados en turno noche limita producción efectiva',
    impacto_horas: 38,
    opciones: ['Horas Extra', 'Subcontratación'],
    costo_resolucion: 'BAJO',
    urgencia: 'ALTA',
    valor: 'ALTO',
  },
  {
    id: 2,
    recurso: 'Centro Mecanizado A',
    descripcion: 'Máquina CNC-3 en mantenimiento correctivo no programado, reduce capacidad 30%',
    impacto_horas: 96,
    opciones: ['Inversión Mantenimiento', 'Subcontratación'],
    costo_resolucion: 'ALTO',
    urgencia: 'ALTA',
    valor: 'ALTO',
  },
]

interface TurnoConfig {
  id: number
  planta: string
  turno: 'MAÑANA' | 'TARDE' | 'NOCHE'
  dias: number
  horas_turno: number
  activo: boolean
}

const turnosIniciales: TurnoConfig[] = [
  { id: 1, planta: 'Planta A', turno: 'MAÑANA', dias: 5, horas_turno: 8, activo: true },
  { id: 2, planta: 'Planta A', turno: 'TARDE', dias: 5, horas_turno: 8, activo: true },
  { id: 3, planta: 'Planta A', turno: 'NOCHE', dias: 3, horas_turno: 8, activo: false },
  { id: 4, planta: 'Planta B', turno: 'MAÑANA', dias: 5, horas_turno: 9, activo: true },
  { id: 5, planta: 'Planta B', turno: 'TARDE', dias: 5, horas_turno: 9, activo: true },
  { id: 6, planta: 'Planta C', turno: 'MAÑANA', dias: 5, horas_turno: 8, activo: true },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <Card sx={{ bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.3)}`, flex: 1 }}>
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="caption" sx={{ color: alpha(color, 0.8), fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function TabCRP() {
  const barColor = (pct: number) => pct > 90 ? '#EF4444' : pct > 80 ? '#F59E0B' : APS_COLOR

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Carga vs Capacidad por Recurso</Typography>

      {/* Bar Chart */}
      <Paper sx={{ p: 3, mb: 3, border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          {[['Capacidad Disponible', '#0EA5E9'], ['Carga Actual', APS_COLOR], ['Cuello de Botella', '#EF4444']].map(([l, c]) => (
            <Stack key={l as string} direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: c as string }} />
              <Typography variant="caption">{l as string}</Typography>
            </Stack>
          ))}
        </Stack>

        <Stack spacing={2}>
          {crpData.map(r => (
            <Box key={r.recurso}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{r.recurso}</Typography>
                  {r.es_cuello && (
                    <Chip label="CUELLO" size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700, fontSize: 9, height: 18 }} />
                  )}
                </Stack>
                <Typography variant="body2" fontWeight={700} sx={{ color: barColor(r.pct_uso) }}>
                  {r.pct_uso.toFixed(1)}%
                </Typography>
              </Stack>

              {/* Capacity bar */}
              <Box sx={{ position: 'relative', height: 10, bgcolor: alpha('#0EA5E9', 0.15), borderRadius: 1, mb: 0.5 }}>
                <Box sx={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  bgcolor: alpha('#0EA5E9', 0.4), borderRadius: 1,
                }} />
              </Box>

              {/* Load bar */}
              <Box sx={{ position: 'relative', height: 14, bgcolor: alpha(barColor(r.pct_uso), 0.1), borderRadius: 1 }}>
                <Box sx={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${r.pct_uso}%`,
                  height: '100%',
                  bgcolor: barColor(r.pct_uso),
                  borderRadius: 1,
                  transition: 'width 0.6s ease',
                }} />
              </Box>

              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.3 }}>
                <Typography variant="caption" color="text.secondary">Carga: {r.carga}h</Typography>
                <Typography variant="caption" color="text.secondary">Cap: {r.capacidad}h</Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Detail Table */}
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Box sx={{ bgcolor: alpha(APS_COLOR, 0.06), px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR}>Detalle CRP</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.04) }}>
              {['Recurso', 'Período', 'Capacidad (h)', 'Carga (h)', '% Uso', 'Cuello'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {crpData.map((r, i) => (
              <TableRow key={i} hover sx={{ bgcolor: r.es_cuello ? alpha('#EF4444', 0.04) : 'inherit' }}>
                <TableCell sx={{ fontWeight: 600 }}>{r.recurso}</TableCell>
                <TableCell>{r.periodo}</TableCell>
                <TableCell>{r.capacidad}</TableCell>
                <TableCell>{r.carga}</TableCell>
                <TableCell>
                  <Typography fontWeight={700} sx={{ color: barColor(r.pct_uso), fontSize: 13 }}>
                    {r.pct_uso.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell>
                  {r.es_cuello && (
                    <Chip label="CUELLO" size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700, fontSize: 10 }} />
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

function TabCuellos() {
  const matrixCells = [
    { label: 'Alto Impacto\nAlto Costo', color: '#EF4444', items: ['CNC-3 Reparación'] },
    { label: 'Alto Impacto\nBajo Costo', color: '#F59E0B', items: ['Horas Extra Ensamble'] },
    { label: 'Bajo Impacto\nAlto Costo', color: '#6B7280', items: [] },
    { label: 'Bajo Impacto\nBajo Costo', color: '#10B981', items: [] },
  ]

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Gestión de Cuellos de Botella</Typography>

      {/* Bottleneck Table */}
      <Paper sx={{ mb: 3, border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Recurso', 'Descripción del Problema', 'Impacto (h/sem)', 'Opciones de Resolución', 'Urgencia', 'Costo'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {cuelloData.map(row => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 700, color: '#EF4444' }}>{row.recurso}</TableCell>
                <TableCell sx={{ maxWidth: 280, fontSize: 12 }}>{row.descripcion}</TableCell>
                <TableCell>
                  <Typography fontWeight={700} color="#EF4444">{row.impacto_horas}h</Typography>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    {row.opciones.map(o => (
                      <Chip key={o} label={o} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR, fontWeight: 600, fontSize: 10 }} />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={row.urgencia} size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700, fontSize: 10 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.costo_resolucion}
                    size="small"
                    sx={{
                      bgcolor: alpha(row.costo_resolucion === 'BAJO' ? '#10B981' : '#EF4444', 0.15),
                      color: row.costo_resolucion === 'BAJO' ? '#10B981' : '#EF4444',
                      fontWeight: 700, fontSize: 10,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Decision Matrix */}
      <Paper sx={{ p: 3, border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Typography variant="subtitle1" fontWeight={700} color={APS_COLOR} sx={{ mb: 2 }}>
          Matriz de Decisión — Impacto vs Costo
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, color: 'text.secondary', minWidth: 60, textAlign: 'center' }}>
              IMPACTO ↑
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {matrixCells.map((cell, i) => (
                  <Box key={i} sx={{
                    bgcolor: alpha(cell.color, 0.08),
                    border: `2px solid ${alpha(cell.color, 0.4)}`,
                    borderRadius: 2, p: 2, minHeight: 100,
                  }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: cell.color, display: 'block', whiteSpace: 'pre-line', mb: 1 }}>
                      {cell.label}
                    </Typography>
                    {cell.items.map(item => (
                      <Chip key={item} label={item} size="small" sx={{ bgcolor: alpha(cell.color, 0.15), color: cell.color, fontWeight: 600, fontSize: 10, mt: 0.5 }} />
                    ))}
                    {cell.items.length === 0 && (
                      <Typography variant="caption" color="text.secondary">Sin restricciones</Typography>
                    )}
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, fontWeight: 700, color: 'text.secondary' }}>
                COSTO DE RESOLUCIÓN →
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}

function TabTurnos() {
  const [turnos, setTurnos] = useState<TurnoConfig[]>(turnosIniciales)

  const updateDias = (id: number, delta: number) => {
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, dias: Math.max(1, Math.min(7, t.dias + delta)) } : t))
  }

  const turnoColor = (t: string) => t === 'MAÑANA' ? '#F59E0B' : t === 'TARDE' ? '#0EA5E9' : '#8B5CF6'

  const plantas = [...new Set(turnos.map(t => t.planta))]

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Configuración de Turnos por Planta</Typography>

      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Planta', 'Turno', 'Días/Sem', 'Horas/Turno', 'Cap. Total (h/sem)', 'Activo'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {turnos.map(t => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{t.planta}</TableCell>
                <TableCell>
                  <Chip
                    label={t.turno}
                    size="small"
                    sx={{ bgcolor: alpha(turnoColor(t.turno), 0.15), color: turnoColor(t.turno), fontWeight: 700, fontSize: 10 }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton size="small" onClick={() => updateDias(t.id, -1)} sx={{ p: 0.2 }}>
                      <Remove sx={{ fontSize: 14 }} />
                    </IconButton>
                    <Typography fontWeight={700} sx={{ minWidth: 20, textAlign: 'center' }}>{t.dias}</Typography>
                    <IconButton size="small" onClick={() => updateDias(t.id, 1)} sx={{ p: 0.2 }}>
                      <Add sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                </TableCell>
                <TableCell>{t.horas_turno}h</TableCell>
                <TableCell sx={{ color: APS_COLOR, fontWeight: 700 }}>
                  {(t.dias * t.horas_turno).toLocaleString()}h
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.activo ? 'ACTIVO' : 'INACTIVO'}
                    size="small"
                    sx={{
                      bgcolor: alpha(t.activo ? '#10B981' : '#6B7280', 0.15),
                      color: t.activo ? '#10B981' : '#6B7280',
                      fontWeight: 700, fontSize: 10,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Summary by plant */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 2 }}>Resumen de Capacidad por Planta</Typography>
      <Grid container spacing={2}>
        {plantas.map(planta => {
          const total = turnos.filter(t => t.planta === planta && t.activo).reduce((s, t) => s + t.dias * t.horas_turno, 0)
          return (
            <Grid key={planta} size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: `1px solid ${alpha(APS_COLOR, 0.25)}`, bgcolor: alpha(APS_COLOR, 0.04) }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR}>{planta}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>{total}h</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {turnos.filter(t => t.planta === planta && t.activo).length} turnos activos/semana
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function APSCapacidad() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(APS_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Speed sx={{ color: APS_COLOR, fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: APS_COLOR, lineHeight: 1.2 }}>
              Gestión de Capacidad
            </Typography>
            <Typography variant="caption" color="text.secondary">
              APS — Capacity Requirements Planning (CRP)
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Chip label="APS" sx={{ bgcolor: APS_COLOR, color: 'white', fontWeight: 700 }} />
        </Stack>

        {/* KPIs */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <KpiCard label="Capacidad Total" value="85,000h" sub="Período actual" color={APS_COLOR} icon={<Speed fontSize="large" />} />
          <KpiCard label="Utilización" value="78.5%" sub="+2.3% vs semana anterior" color="#0EA5E9" icon={<Engineering fontSize="large" />} />
          <KpiCard label="Cuellos de Botella" value="2" sub="Recursos críticos" color="#EF4444" icon={<Warning fontSize="large" />} />
          <KpiCard label="Capacidad Libre" value="18,700h" sub="Disponible para asignar" color="#10B981" icon={<TrendingDown fontSize="large" />} />
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
            <Tab icon={<Speed fontSize="small" />} iconPosition="start" label="CRP — Capacity Requirements Planning" />
            <Tab icon={<Warning fontSize="small" />} iconPosition="start" label="Cuellos de Botella" />
            <Tab icon={<Schedule fontSize="small" />} iconPosition="start" label="Turnos" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabCRP />}
            {tab === 1 && <TabCuellos />}
            {tab === 2 && <TabTurnos />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
