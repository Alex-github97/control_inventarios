import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
} from '@mui/material'
import {
  Engineering, Timeline, BugReport, Assessment, Warning,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const EAM_COLOR = '#EA580C'
const CARD_BG = '#0F1E35'
const DARK_BG = '#060C1A'

// ─── Types ────────────────────────────────────────────────────────────────────
interface KpiCard {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
  trend: string
  trendUp: boolean
}

interface AssetTypeRow {
  tipo: string
  mtbf: number
  mttr: number
  disponibilidad: number
  fallas: number
  indiceFallas: number
}

interface TopFailureRow {
  rank: number
  activo: string
  codigo: string
  fallas: number
  horasParado: number
  costo: number
}

interface FmeaRow {
  activo: string
  componente: string
  funcion: string
  modoFalla: string
  efecto: string
  s: number
  o: number
  d: number
  accion: string
  responsable: string
  estado: 'Abierto' | 'En Proceso' | 'Cerrado'
}

interface MonthlyFailure {
  activo: string
  descripcion: string
  causaRaiz: string
  solucion: string
  tiempoParado: number
  costo: number
  ot: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const kpiCards: KpiCard[] = [
  { label: 'MTBF', value: '312', unit: 'hrs', icon: <Timeline />, trend: '+8.3%', trendUp: true },
  { label: 'MTTR', value: '4.2', unit: 'hrs', icon: <Engineering />, trend: '-12.5%', trendUp: true },
  { label: 'Disponibilidad', value: '94.2', unit: '%', icon: <Assessment />, trend: '+1.4%', trendUp: true },
  { label: 'Mantenibilidad', value: '96.8', unit: '%', icon: <Engineering />, trend: '+0.6%', trendUp: true },
  { label: 'Confiabilidad', value: '91.5', unit: '%', icon: <Timeline />, trend: '-0.3%', trendUp: false },
  { label: 'Backlog', value: '180', unit: 'hrs', icon: <Warning />, trend: '+5.0%', trendUp: false },
]

const assetTypeRows: AssetTypeRow[] = [
  { tipo: 'Vehículos', mtbf: 345, mttr: 3.8, disponibilidad: 95.1, fallas: 18, indiceFallas: 0.052 },
  { tipo: 'Montacargas', mtbf: 280, mttr: 5.1, disponibilidad: 92.8, fallas: 24, indiceFallas: 0.086 },
  { tipo: 'Infraestructura', mtbf: 410, mttr: 6.2, disponibilidad: 96.4, fallas: 9, indiceFallas: 0.024 },
  { tipo: 'Equipos Tecnológicos', mtbf: 520, mttr: 2.1, disponibilidad: 98.2, fallas: 7, indiceFallas: 0.013 },
  { tipo: 'Maquinaria Pesada', mtbf: 190, mttr: 7.8, disponibilidad: 88.6, fallas: 31, indiceFallas: 0.163 },
]

const topFailures: TopFailureRow[] = [
  { rank: 1, activo: 'Montacargas Hyster H80', codigo: 'MF-012', fallas: 14, horasParado: 87, costo: 4200000 },
  { rank: 2, activo: 'Tracto Kenworth T800', codigo: 'VH-034', fallas: 11, horasParado: 62, costo: 3750000 },
  { rank: 3, activo: 'Maquinaria CAT 320', codigo: 'MP-007', fallas: 9, horasParado: 74, costo: 6100000 },
  { rank: 4, activo: 'Montacargas Clark C50', codigo: 'MF-019', fallas: 8, horasParado: 48, costo: 2900000 },
  { rank: 5, activo: 'Tractomula Freightliner', codigo: 'VH-051', fallas: 7, horasParado: 55, costo: 3200000 },
]

const fmeaRows: FmeaRow[] = [
  {
    activo: 'Tracto Kenworth T800',
    componente: 'Motor Diesel',
    funcion: 'Generar potencia motriz',
    modoFalla: 'Sobrecalentamiento del motor',
    efecto: 'Parada total del vehículo',
    s: 9, o: 6, d: 4,
    accion: 'Revisar sistema de refrigeración cada 5.000 km',
    responsable: 'Taller Mecánico',
    estado: 'Abierto',
  },
  {
    activo: 'Montacargas Hyster H80',
    componente: 'Sistema Hidráulico',
    funcion: 'Elevar y descender cargas',
    modoFalla: 'Fuga de aceite hidráulico',
    efecto: 'Pérdida de capacidad de izaje',
    s: 8, o: 7, d: 3,
    accion: 'Inspección de sellos y mangueras mensual',
    responsable: 'Mantenimiento Industrial',
    estado: 'En Proceso',
  },
  {
    activo: 'Maquinaria CAT 320',
    componente: 'Sistema de Frenos',
    funcion: 'Detener la máquina con seguridad',
    modoFalla: 'Desgaste excesivo de pastillas',
    efecto: 'Riesgo de accidente por pérdida de frenado',
    s: 10, o: 5, d: 5,
    accion: 'Reemplazo preventivo cada 500 horas',
    responsable: 'Taller Especializado',
    estado: 'Abierto',
  },
  {
    activo: 'Compresor Atlas Copco',
    componente: 'Compresor de Aire',
    funcion: 'Suministrar aire comprimido a 120 PSI',
    modoFalla: 'Falla en válvula de presión',
    efecto: 'Interrupción del suministro de aire a línea de producción',
    s: 7, o: 4, d: 5,
    accion: 'Calibración de válvulas trimestral',
    responsable: 'Mantenimiento Locativo',
    estado: 'Cerrado',
  },
  {
    activo: 'Tractomula Freightliner',
    componente: 'Sistema Eléctrico',
    funcion: 'Alimentar sistemas electrónicos del vehículo',
    modoFalla: 'Cortocircuito en arnés eléctrico',
    efecto: 'Falla de instrumentación y luces',
    s: 6, o: 5, d: 6,
    accion: 'Inspección de arneses y conectores semestral',
    responsable: 'Taller Eléctrico',
    estado: 'En Proceso',
  },
  {
    activo: 'Montacargas Clark C50',
    componente: 'Transmisión',
    funcion: 'Transferir potencia a las ruedas',
    modoFalla: 'Deslizamiento de embrague',
    efecto: 'Reducción de capacidad de tracción',
    s: 7, o: 6, d: 4,
    accion: 'Ajuste y lubricación de embrague cada 3.000 hrs',
    responsable: 'Taller Mecánico',
    estado: 'Abierto',
  },
  {
    activo: 'Grúa Puente 10T',
    componente: 'Cable de Acero',
    funcion: 'Sostener y elevar cargas hasta 10 toneladas',
    modoFalla: 'Fatiga y rotura de hilos del cable',
    efecto: 'Riesgo de caída de carga y accidente grave',
    s: 10, o: 3, d: 3,
    accion: 'Inspección visual diaria y reemplazo anual',
    responsable: 'Mantenimiento Industrial',
    estado: 'Cerrado',
  },
  {
    activo: 'UPS Sala de Servidores',
    componente: 'Batería de Respaldo',
    funcion: 'Proveer energía eléctrica ante cortes',
    modoFalla: 'Degradación de baterías por temperatura',
    efecto: 'Pérdida de respaldo eléctrico — riesgo de caída de sistemas IT',
    s: 8, o: 4, d: 4,
    accion: 'Prueba de carga de baterías semestral',
    responsable: 'TI / Mantenimiento',
    estado: 'En Proceso',
  },
]

const paretoData = [
  { tipo: 'Falla eléctrica', fallas: 34, pct: 34, cumPct: 34 },
  { tipo: 'Falla mecánica', fallas: 28, pct: 28, cumPct: 62 },
  { tipo: 'Falla hidráulica', fallas: 18, pct: 18, cumPct: 80 },
  { tipo: 'Falla neumática', fallas: 12, pct: 12, cumPct: 92 },
  { tipo: 'Otras', fallas: 8, pct: 8, cumPct: 100 },
]

const causasRaiz = [
  { causa: 'Falta de mantenimiento preventivo', casos: 42 },
  { causa: 'Desgaste por uso', casos: 31 },
  { causa: 'Falla de componente', casos: 24 },
  { causa: 'Error operacional', casos: 18 },
  { causa: 'Condiciones ambientales', casos: 11 },
]

const monthlyFailures: MonthlyFailure[] = [
  { activo: 'Tracto Kenworth T800', descripcion: 'Sobrecalentamiento motor', causaRaiz: 'Falta MP', solucion: 'Reemplazo termostato y limpieza radiador', tiempoParado: 8.5, costo: 1850000, ot: 'OT-2024-0612' },
  { activo: 'Montacargas Hyster H80', descripcion: 'Fuga aceite hidráulico', causaRaiz: 'Desgaste sello', solucion: 'Reemplazo kit sellos hidráulicos', tiempoParado: 4.0, costo: 680000, ot: 'OT-2024-0589' },
  { activo: 'Maquinaria CAT 320', descripcion: 'Frenos sin respuesta', causaRaiz: 'Desgaste pastillas', solucion: 'Reemplazo pastillas y ajuste sistema', tiempoParado: 12.0, costo: 3200000, ot: 'OT-2024-0601' },
  { activo: 'Compresor Atlas Copco', descripcion: 'Baja presión de aire', causaRaiz: 'Válvula defectuosa', solucion: 'Reemplazo válvula de alivio', tiempoParado: 6.0, costo: 920000, ot: 'OT-2024-0578' },
  { activo: 'Tractomula Freightliner', descripcion: 'Falla eléctrica general', causaRaiz: 'Cortocircuito arnés', solucion: 'Reparación arnés y reemplazo fusibles', tiempoParado: 5.5, costo: 1100000, ot: 'OT-2024-0617' },
  { activo: 'Grúa Puente 10T', descripcion: 'Ruido en polipasto', causaRaiz: 'Rodamiento desgastado', solucion: 'Reemplazo rodamiento y lubricación', tiempoParado: 9.0, costo: 2400000, ot: 'OT-2024-0594' },
  { activo: 'Montacargas Clark C50', descripcion: 'Embrague resbalando', causaRaiz: 'Desgaste disco', solucion: 'Reemplazo disco de embrague', tiempoParado: 7.0, costo: 1560000, ot: 'OT-2024-0603' },
  { activo: 'UPS Sala de Servidores', descripcion: 'Alarma de batería baja', causaRaiz: 'Degradación baterías', solucion: 'Reemplazo banco de baterías', tiempoParado: 2.0, costo: 4800000, ot: 'OT-2024-0621' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function RpnCell({ rpn }: { rpn: number }) {
  const color = rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f97316' : '#22c55e'
  return (
    <Typography
      sx={{ fontWeight: 900, fontSize: 18, color, textAlign: 'center' }}
    >
      {rpn}
    </Typography>
  )
}

function EstadoChip({ estado }: { estado: FmeaRow['estado'] }) {
  const map: Record<FmeaRow['estado'], string> = {
    Abierto: '#ef4444',
    'En Proceso': '#f97316',
    Cerrado: '#22c55e',
  }
  return <Chip label={estado} size="small" sx={{ bgcolor: map[estado], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function fmeaRowBg(rpn: number): string {
  if (rpn >= 200) return 'rgba(239,68,68,0.12)'
  if (rpn >= 100) return 'rgba(249,115,22,0.10)'
  return 'transparent'
}

// ─── Tab 0: KPIs Confiabilidad ────────────────────────────────────────────────
function KpisTab() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        {kpiCards.map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={kpi.label}>
            <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${EAM_COLOR}33`, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ color: EAM_COLOR }}>{kpi.icon}</Box>
                  <Chip
                    label={kpi.trend}
                    size="small"
                    sx={{
                      bgcolor: kpi.trendUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: kpi.trendUp ? '#22c55e' : '#ef4444',
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  />
                </Box>
                <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900, lineHeight: 1 }}>
                  {kpi.value}
                  <Typography component="span" sx={{ fontSize: 16, color: '#94a3b8', ml: 0.5 }}>
                    {kpi.unit}
                  </Typography>
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, fontWeight: 600 }}>
                  {kpi.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Asset type table */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Indicadores por Tipo de Activo
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Tipo Activo', 'MTBF (hrs)', 'MTTR (hrs)', 'Disponibilidad%', 'Fallas este mes', 'Índice de Fallas'].map((h) => (
                  <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {assetTypeRows.map((row) => (
                <TableRow key={row.tipo} sx={{ '&:hover': { bgcolor: 'rgba(234,88,12,0.06)' } }}>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f' }}>{row.tipo}</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.mtbf}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.mttr}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={row.disponibilidad}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#1e3a5f',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: row.disponibilidad >= 95 ? '#22c55e' : row.disponibilidad >= 90 ? '#f59e0b' : '#ef4444',
                          },
                        }}
                      />
                      <Typography sx={{ color: '#e2e8f0', fontSize: 12, minWidth: 40 }}>{row.disponibilidad}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f' }}>{row.fallas}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Typography sx={{ color: row.indiceFallas > 0.1 ? '#ef4444' : row.indiceFallas > 0.05 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
                      {row.indiceFallas.toFixed(3)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Bathtub curve */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Curva de Bañera — Tasa de Fallas vs. Tiempo
        </Typography>
        <Card sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f`, borderRadius: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 160, position: 'relative' }}>
            {/* Y-axis label */}
            <Box sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
              Tasa de Fallas
            </Box>
            {/* Phase 1: Mortalidad Infantil */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Typography sx={{ color: '#ef4444', fontSize: 10, fontWeight: 700, mb: 0.5, textAlign: 'center' }}>
                Mortalidad Infantil
              </Typography>
              <Box sx={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: 120 }}>
                {[110, 90, 72, 58, 46, 37, 30, 26, 23].map((h, i) => (
                  <Box key={i} sx={{ flex: 1, height: `${h}px`, bgcolor: '#ef4444', opacity: 0.7, borderRadius: '2px 2px 0 0', transition: 'all 0.3s' }} />
                ))}
              </Box>
              <Box sx={{ width: '100%', height: 4, bgcolor: '#ef4444', opacity: 0.3 }} />
              <Typography sx={{ color: '#ef4444', fontSize: 9, mt: 0.5 }}>Decreciente</Typography>
            </Box>
            <Divider orientation="vertical" sx={{ bgcolor: '#1e3a5f', height: 130, alignSelf: 'flex-end' }} />
            {/* Phase 2: Vida Útil */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.4 }}>
              <Typography sx={{ color: '#22c55e', fontSize: 10, fontWeight: 700, mb: 0.5, textAlign: 'center' }}>
                Vida Útil
              </Typography>
              <Box sx={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: 120 }}>
                {[22, 21, 22, 20, 22, 21, 21, 22, 20, 21, 22, 21].map((h, i) => (
                  <Box key={i} sx={{ flex: 1, height: `${h}px`, bgcolor: '#22c55e', opacity: 0.7, borderRadius: '2px 2px 0 0' }} />
                ))}
              </Box>
              <Box sx={{ width: '100%', height: 4, bgcolor: '#22c55e', opacity: 0.3 }} />
              <Typography sx={{ color: '#22c55e', fontSize: 9, mt: 0.5 }}>Constante (baja)</Typography>
            </Box>
            <Divider orientation="vertical" sx={{ bgcolor: '#1e3a5f', height: 130, alignSelf: 'flex-end' }} />
            {/* Phase 3: Desgaste */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Typography sx={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, mb: 0.5, textAlign: 'center' }}>
                Desgaste
              </Typography>
              <Box sx={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: 120 }}>
                {[23, 26, 31, 38, 48, 60, 76, 95, 115].map((h, i) => (
                  <Box key={i} sx={{ flex: 1, height: `${Math.min(h, 120)}px`, bgcolor: '#f59e0b', opacity: 0.7, borderRadius: '2px 2px 0 0' }} />
                ))}
              </Box>
              <Box sx={{ width: '100%', height: 4, bgcolor: '#f59e0b', opacity: 0.3 }} />
              <Typography sx={{ color: '#f59e0b', fontSize: 9, mt: 0.5 }}>Creciente</Typography>
            </Box>
          </Box>
          {/* X-axis */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Tiempo →</Typography>
          </Box>
        </Card>
      </Box>

      {/* Top 5 failures table */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Top 5 Activos con Mayor Número de Fallas este Año
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Activo', 'Placa / Código', 'Fallas', 'Horas Parado', 'Costo Acumulado'].map((h) => (
                  <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {topFailures.map((row) => (
                <TableRow key={row.rank} sx={{ '&:hover': { bgcolor: 'rgba(234,88,12,0.06)' } }}>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Box sx={{
                      width: 24, height: 24, borderRadius: '50%',
                      bgcolor: row.rank === 1 ? '#ef4444' : row.rank === 2 ? '#f97316' : row.rank === 3 ? '#f59e0b' : '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 900, fontSize: 12,
                    }}>
                      {row.rank}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f' }}>{row.activo}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f' }}>{row.codigo}</TableCell>
                  <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.fallas}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.horasParado} hrs</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f' }}>
                    ${row.costo.toLocaleString('es-CO')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

// ─── Tab 1: FMEA ──────────────────────────────────────────────────────────────
function FmeaTab() {
  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
        Análisis de Modos y Efectos de Falla (FMEA)
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.4)', border: '1px solid #ef4444' }} />
          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>RPN ≥ 200 — Crítico</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'rgba(249,115,22,0.4)', border: '1px solid #f97316' }} />
          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>RPN 100–199 — Alto</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'transparent', border: '1px solid #334155' }} />
          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>RPN &lt; 100 — Normal</Typography>
        </Box>
      </Box>
      <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f`, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow>
              {['Activo', 'Componente', 'Función', 'Modo de Falla', 'Efecto', 'S', 'O', 'D', 'RPN', 'Acción Recomendada', 'Responsable', 'Estado'].map((h) => (
                <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {fmeaRows.map((row, idx) => {
              const rpn = row.s * row.o * row.d
              return (
                <TableRow key={idx} sx={{ bgcolor: fmeaRowBg(rpn), '&:hover': { bgcolor: rpn >= 200 ? 'rgba(239,68,68,0.18)' : 'rgba(234,88,12,0.06)' } }}>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', whiteSpace: 'nowrap', fontSize: 12 }}>{row.activo}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', whiteSpace: 'nowrap', fontSize: 12 }}>{row.componente}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12, maxWidth: 160 }}>{row.funcion}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f', fontSize: 12, maxWidth: 180 }}>{row.modoFalla}</TableCell>
                  <TableCell sx={{ color: '#fbbf24', borderColor: '#1e3a5f', fontSize: 12, maxWidth: 200 }}>{row.efecto}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: row.s >= 8 ? '#ef4444' : row.s >= 5 ? '#f97316' : '#22c55e', fontSize: 13 }}>{row.s}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: row.o >= 8 ? '#ef4444' : row.o >= 5 ? '#f97316' : '#22c55e', fontSize: 13 }}>{row.o}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: row.d >= 8 ? '#ef4444' : row.d >= 5 ? '#f97316' : '#22c55e', fontSize: 13 }}>{row.d}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f', textAlign: 'center' }}>
                    <RpnCell rpn={rpn} />
                  </TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f', fontSize: 11, maxWidth: 200 }}>{row.accion}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 11, whiteSpace: 'nowrap' }}>{row.responsable}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <EstadoChip estado={row.estado} />
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

// ─── Tab 2: Análisis de Fallas ────────────────────────────────────────────────
function AnalisisFallasTab() {
  const maxFallas = Math.max(...paretoData.map((d) => d.fallas))
  const maxCasos = Math.max(...causasRaiz.map((c) => c.casos))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* Pareto Diagram */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Diagrama de Pareto — Top 5 Tipos de Falla
        </Typography>
        <Card sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f`, borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 200 }}>
            {paretoData.map((d, i) => {
              const barColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
              const barH = Math.round((d.fallas / maxFallas) * 170)
              return (
                <Box key={d.tipo} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ color: barColors[i], fontWeight: 900, fontSize: 14 }}>{d.fallas}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: 9, mb: 0.3 }}>Acum: {d.cumPct}%</Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: barH,
                        bgcolor: barColors[i],
                        opacity: 0.85,
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.3s',
                        position: 'relative',
                        '&:hover': { opacity: 1 },
                      }}
                    />
                  </Box>
                  <Divider sx={{ width: '100%', bgcolor: '#1e3a5f' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: 10, textAlign: 'center', lineHeight: 1.2, mt: 0.5 }}>
                    {d.tipo}
                  </Typography>
                  <Typography sx={{ color: barColors[i], fontSize: 10, fontWeight: 700 }}>{d.pct}%</Typography>
                </Box>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Tipo de Falla → (Total: 100 fallas)</Typography>
          </Box>
        </Card>
      </Box>

      {/* Root causes */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Causas Raíz más Frecuentes
        </Typography>
        <Card sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f`, borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {causasRaiz.map((c, i) => {
              const pct = Math.round((c.casos / maxCasos) * 100)
              const colors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
              return (
                <Box key={c.causa}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{c.causa}</Typography>
                    <Typography sx={{ color: colors[i], fontWeight: 700, fontSize: 13 }}>{c.casos} casos</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#1e3a5f',
                      '& .MuiLinearProgress-bar': { bgcolor: colors[i], borderRadius: 4 },
                    }}
                  />
                </Box>
              )
            })}
          </Box>
        </Card>
      </Box>

      {/* Monthly failures table */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          Fallas del Mes en Curso
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: `1px solid #1e3a5f`, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                {['Activo', 'Descripción Falla', 'Causa Raíz', 'Solución Aplicada', 'Tiempo Parado (hrs)', 'Costo ($)', 'OT#'].map((h) => (
                  <TableCell key={h} sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyFailures.map((row, idx) => (
                <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(234,88,12,0.06)' } }}>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 12, whiteSpace: 'nowrap' }}>{row.activo}</TableCell>
                  <TableCell sx={{ color: '#fbbf24', borderColor: '#1e3a5f', fontSize: 12 }}>{row.descripcion}</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f', fontSize: 12 }}>
                    <Chip label={row.causaRaiz} size="small" sx={{ bgcolor: 'rgba(234,88,12,0.15)', color: EAM_COLOR, fontWeight: 600, fontSize: 10 }} />
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: '#1e3a5f', fontSize: 12 }}>{row.solucion}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f', textAlign: 'center', fontSize: 12 }}>{row.tiempoParado}</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f', fontSize: 12, whiteSpace: 'nowrap' }}>
                    ${row.costo.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Typography sx={{ color: '#60a5fa', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{row.ot}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function EAMConfiabilidad() {
  const [tab, setTab] = useState(0)

  const tabLabels = ['KPIs Confiabilidad', 'FMEA', 'Análisis de Fallas']
  const tabIcons = [<Assessment />, <BugReport />, <Timeline />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', bgcolor: DARK_BG, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2,
              bgcolor: `${EAM_COLOR}22`,
              border: `1px solid ${EAM_COLOR}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: EAM_COLOR,
            }}
          >
            <Engineering fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>
              EAM — Confiabilidad
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
              ICOLTRANS · Gestión de Confiabilidad, FMEA y Análisis de Fallas
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ bgcolor: '#1e3a5f', mb: 3 }} />

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{
            mb: 1,
            '& .MuiTab-root': { color: '#64748b', fontWeight: 600, textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: EAM_COLOR },
            '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
          }}
        >
          {tabLabels.map((label, i) => (
            <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
          ))}
        </Tabs>

        <Divider sx={{ bgcolor: '#1e3a5f', mb: 1 }} />

        <TabPanel value={tab} index={0}><KpisTab /></TabPanel>
        <TabPanel value={tab} index={1}><FmeaTab /></TabPanel>
        <TabPanel value={tab} index={2}><AnalisisFallasTab /></TabPanel>
      </Box>
    </Layout>
  )
}
