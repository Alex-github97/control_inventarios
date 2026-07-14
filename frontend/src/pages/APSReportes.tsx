import React, { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { alpha } from '@mui/material/styles'
import {
  TrendingUp,
  Inventory2,
  Assessment,
  Star,
  Warning,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const APS_COLOR      = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ForecastAccuracyRow {
  familia: string
  jan: number
  feb: number
  mar: number
  apr: number
  may: number
  jun: number
  avg: number
}

interface MPSAdherenceRow {
  familia: string
  w1: number
  w2: number
  w3: number
  w4: number
  w5: number
  w6: number
}

interface OEERow {
  planta: string
  planificado: number
  real: number
  diferencia: number
}

interface VariacionRow {
  familia: string
  plan: number
  real: number
  variacion: number
  causaRaiz: string
}

interface InventoryKPI {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
}

interface ABCRow {
  categoria: string
  porcentajeSkus: number
  porcentajeValor: number
  montoUSD: string
  diasCobertura: number
}

interface TopSKURow {
  sku: string
  descripcion: string
  categoria: string
  stock: number
  valorUnit: string
  valorTotal: string
  diasCobertura: number
}

interface GaugeMetric {
  label: string
  value: number
  color: string
}

interface CommitmentRow {
  indicador: string
  target: string
  actual: string
  estado: 'ok' | 'warning' | 'critical'
}

interface TrendRow {
  kpi: string
  apr: number
  may: number
  jun: number
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const forecastAccuracy: ForecastAccuracyRow[] = [
  { familia: 'Electrónicos',  jan: 75, feb: 77, mar: 74, apr: 78, may: 76, jun: 79, avg: 76.4 },
  { familia: 'Mecánicos',     jan: 88, feb: 91, mar: 92, apr: 93, may: 94, jun: 93, avg: 91.8 },
  { familia: 'Consumibles',   jan: 92, feb: 94, mar: 95, apr: 96, may: 93, jun: 95, avg: 94.2 },
  { familia: 'Repuestos',     jan: 77, feb: 79, mar: 80, apr: 81, may: 79, jun: 78, avg: 79.1 },
  { familia: 'Accesorios',    jan: 87, feb: 89, mar: 90, apr: 91, may: 90, jun: 90, avg: 89.5 },
]

const mpsAdherence: MPSAdherenceRow[] = [
  { familia: 'Electrónicos', w1: 97, w2: 88, w3: 72, w4: 95, w5: 91, w6: 96 },
  { familia: 'Mecánicos',    w1: 98, w2: 97, w3: 95, w4: 99, w5: 96, w6: 97 },
  { familia: 'Consumibles',  w1: 99, w2: 98, w3: 97, w4: 98, w5: 99, w6: 98 },
  { familia: 'Repuestos',    w1: 82, w2: 79, w3: 75, w4: 83, w5: 80, w6: 81 },
  { familia: 'Accesorios',   w1: 94, w2: 93, w3: 91, w4: 96, w5: 94, w6: 95 },
]

const oeeData: OEERow[] = [
  { planta: 'Planta Norte',  planificado: 85, real: 81.2, diferencia: -3.8 },
  { planta: 'Planta Sur',    planificado: 88, real: 84.7, diferencia: -3.3 },
  { planta: 'Planta Centro', planificado: 82, real: 79.3, diferencia: -2.7 },
]

const variaciones: VariacionRow[] = [
  { familia: 'Electrónicos', plan: 1200, real: 1050, variacion: -12.5, causaRaiz: 'Falta de componentes' },
  { familia: 'Mecánicos',    plan: 850,  real: 870,  variacion: +2.4,  causaRaiz: 'Eficiencia mejorada' },
  { familia: 'Consumibles',  plan: 3200, real: 3180, variacion: -0.6,  causaRaiz: 'Dentro del rango normal' },
  { familia: 'Repuestos',    plan: 640,  real: 520,  variacion: -18.8, causaRaiz: 'Proveedor con retraso' },
  { familia: 'Accesorios',   plan: 980,  real: 1010, variacion: +3.1,  causaRaiz: 'Demanda adicional cubierta' },
]

const abcData: ABCRow[] = [
  { categoria: 'A', porcentajeSkus: 20, porcentajeValor: 70, montoUSD: '$2,940K', diasCobertura: 18 },
  { categoria: 'B', porcentajeSkus: 30, porcentajeValor: 20, montoUSD: '$840K',   diasCobertura: 34 },
  { categoria: 'C', porcentajeSkus: 50, porcentajeValor: 10, montoUSD: '$420K',   diasCobertura: 62 },
]

const topSKUs: TopSKURow[] = [
  { sku: 'ELE-001', descripcion: 'Motor eléctrico 5HP',    categoria: 'A', stock: 45,  valorUnit: '$1,240', valorTotal: '$55,800',  diasCobertura: 22 },
  { sku: 'MEC-032', descripcion: 'Rodamiento SKF 6205',    categoria: 'A', stock: 320, valorUnit: '$68',    valorTotal: '$21,760',  diasCobertura: 15 },
  { sku: 'ELE-015', descripcion: 'Variador de frecuencia', categoria: 'A', stock: 12,  valorUnit: '$1,850', valorTotal: '$22,200',  diasCobertura: 30 },
  { sku: 'CON-008', descripcion: 'Aceite hidráulico 55gl', categoria: 'B', stock: 88,  valorUnit: '$145',   valorTotal: '$12,760',  diasCobertura: 40 },
  { sku: 'REP-021', descripcion: 'Válvula solenoide 1/2"', categoria: 'A', stock: 67,  valorUnit: '$185',   valorTotal: '$12,395',  diasCobertura: 25 },
  { sku: 'ACC-003', descripcion: 'Sensor de proximidad',   categoria: 'B', stock: 150, valorUnit: '$78',    valorTotal: '$11,700',  diasCobertura: 55 },
  { sku: 'MEC-018', descripcion: 'Cadena transmisión #60', categoria: 'B', stock: 95,  valorUnit: '$112',   valorTotal: '$10,640',  diasCobertura: 48 },
  { sku: 'ELE-044', descripcion: 'Contactor 32A 24VDC',    categoria: 'A', stock: 80,  valorUnit: '$125',   valorTotal: '$10,000',  diasCobertura: 20 },
  { sku: 'CON-019', descripcion: 'Grasa multipropósito',   categoria: 'C', stock: 210, valorUnit: '$42',    valorTotal: '$8,820',   diasCobertura: 75 },
  { sku: 'REP-007', descripcion: 'Empaque industrial #4',  categoria: 'C', stock: 500, valorUnit: '$16',    valorTotal: '$8,000',   diasCobertura: 90 },
]

const gaugeMetrics: GaugeMetric[] = [
  { label: 'OTIF',                value: 96.2, color: '#10B981' },
  { label: 'Forecast Accuracy',   value: 91.4, color: APS_COLOR },
  { label: 'Perfect Order',       value: 94.5, color: '#3B82F6' },
  { label: 'Service Level',       value: 97.1, color: '#10B981' },
  { label: 'Schedule Adherence',  value: 88.7, color: '#F59E0B' },
  { label: 'Capacity Utilization',value: 78.5, color: '#EF4444' },
]

const commitments: CommitmentRow[] = [
  { indicador: 'OTIF Global',           target: '≥ 95%',   actual: '96.2%',  estado: 'ok'       },
  { indicador: 'Nivel de Servicio',      target: '≥ 97%',   actual: '97.1%',  estado: 'ok'       },
  { indicador: 'Costo de Inventario',    target: '≤ $4.5M', actual: '$4.2M',  estado: 'ok'       },
  { indicador: 'Rotación Inventario',    target: '≥ 8x',    actual: '8.3x',   estado: 'ok'       },
  { indicador: 'Adherencia MPS',         target: '≥ 92%',   actual: '88.7%',  estado: 'warning'  },
  { indicador: 'Riesgo Obsolescencia',   target: '≤ $75K',  actual: '$85K',   estado: 'critical' },
  { indicador: 'Forecast MAPE',          target: '≤ 10%',   actual: '8.6%',   estado: 'ok'       },
]

const trendData: TrendRow[] = [
  { kpi: 'OTIF %',              apr: 94.1, may: 95.3, jun: 96.2 },
  { kpi: 'Forecast Accuracy %', apr: 89.1, may: 90.2, jun: 91.4 },
  { kpi: 'Service Level %',     apr: 95.8, may: 96.4, jun: 97.1 },
  { kpi: 'Schedule Adherence %',apr: 86.2, may: 87.5, jun: 88.7 },
]

// ─── Helper Components ────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  )
}

function AdherenceCell({ value }: { value: number }) {
  const color =
    value >= 95 ? 'success.main' :
    value >= 80 ? 'warning.main' :
    'error.main'
  return (
    <TableCell align="center">
      <Typography variant="body2" fontWeight={600} color={color}>
        {value}%
      </Typography>
    </TableCell>
  )
}

// SVG Gauge Circle
function GaugeCircle({ metric }: { metric: GaugeMetric }) {
  const radius      = 45
  const cx          = 60
  const cy          = 60
  const circumference = 2 * Math.PI * radius
  const offset      = circumference - (metric.value / 100) * circumference

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
        />
        {/* Value arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={metric.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Center text */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="700"
          fill={metric.color}
        >
          {metric.value}%
        </text>
      </svg>
      <Typography variant="caption" fontWeight={600} textAlign="center" color="text.secondary" sx={{ maxWidth: 100 }}>
        {metric.label}
      </Typography>
    </Box>
  )
}

// CSS horizontal bar
function HBar({ value, max = 100, color = APS_COLOR, height = 12 }: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, bgcolor: alpha(color, 0.12), borderRadius: 1, height, overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            bgcolor: color,
            borderRadius: 1,
            transition: 'width 0.5s ease',
          }}
        />
      </Box>
      <Typography variant="caption" fontWeight={600} sx={{ minWidth: 38, textAlign: 'right', color }}>
        {value}%
      </Typography>
    </Box>
  )
}

// ─── Tab 1: Demanda & Forecast ────────────────────────────────────────────────
function DemandaForecastTab() {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']

  const best3  = [
    { familia: 'Consumibles',  acc: '94.2%' },
    { familia: 'Mecánicos',    acc: '91.8%' },
    { familia: 'Accesorios',   acc: '89.5%' },
  ]
  const worst3 = [
    { familia: 'Electrónicos', acc: '76.4%' },
    { familia: 'Repuestos',    acc: '79.1%' },
    { familia: 'Accesorios Gen', acc: '81.3%' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        {[
          { label: 'MAPE Promedio', value: '8.6%',  desc: 'Mean Absolute Percentage Error', good: true },
          { label: 'Bias',          value: '-1.2%', desc: 'Sesgo del pronóstico',            good: true },
          { label: 'Hit Rate',      value: '78.3%', desc: 'Tasa de acierto por SKU',         good: false },
        ].map((k) => (
          <Grid size={{ xs: 12, md: 4 }} key={k.label}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha(APS_COLOR, 0.2), borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                  {k.label}
                </Typography>
                <Typography variant="h3" fontWeight={800} color={APS_COLOR} sx={{ mt: 0.5, mb: 0.5 }}>
                  {k.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{k.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Accuracy Table */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Historial de Exactitud por Familia (Ene–Jun 2026)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06) } }}>
                  <TableCell>Familia</TableCell>
                  {months.map((m) => <TableCell key={m} align="center">{m}</TableCell>)}
                  <TableCell align="center">Promedio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forecastAccuracy.map((row) => (
                  <TableRow key={row.familia} hover>
                    <TableCell fontWeight={600}>{row.familia}</TableCell>
                    {[row.jan, row.feb, row.mar, row.apr, row.may, row.jun].map((v, i) => (
                      <TableCell key={i} align="center">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={v >= 90 ? 'success.main' : v >= 80 ? 'warning.main' : 'error.main'}
                        >
                          {v}%
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <Chip
                        label={`${row.avg}%`}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.1), color: APS_COLOR_DARK }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Accuracy Bars */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Exactitud Promedio por Familia
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {forecastAccuracy.map((row) => (
              <Box key={row.familia}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {row.familia}
                </Typography>
                <HBar value={row.avg} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha('#10B981', 0.3), borderRadius: 2, bgcolor: alpha('#10B981', 0.04) }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Star sx={{ color: '#10B981' }} />
                <Typography variant="subtitle1" fontWeight={700} color="#065F46">
                  Mejores 3 Familias
                </Typography>
              </Box>
              {best3.map((b, i) => (
                <Box key={b.familia} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: i < 2 ? '1px solid' : 'none', borderColor: alpha('#10B981', 0.2) }}>
                  <Typography variant="body2" fontWeight={600}>{i + 1}. {b.familia}</Typography>
                  <Chip label={b.acc} size="small" sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha('#EF4444', 0.3), borderRadius: 2, bgcolor: alpha('#EF4444', 0.04) }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning sx={{ color: '#EF4444' }} />
                <Typography variant="subtitle1" fontWeight={700} color="#7F1D1D">
                  Peores 3 Familias
                </Typography>
              </Box>
              {worst3.map((w, i) => (
                <Box key={w.familia} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: i < 2 ? '1px solid' : 'none', borderColor: alpha('#EF4444', 0.2) }}>
                  <Typography variant="body2" fontWeight={600}>{i + 1}. {w.familia}</Typography>
                  <Chip label={w.acc} size="small" sx={{ bgcolor: '#FEE2E2', color: '#991B1B', fontWeight: 700 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Tab 2: Supply & Producción ───────────────────────────────────────────────
function SupplyProduccionTab() {
  const weeks = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* MPS Adherence */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Adherencia MPS por Semana (%)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {[
              { label: '≥ 95%', color: 'success.main' },
              { label: '80–95%', color: 'warning.main' },
              { label: '< 80%', color: 'error.main' },
            ].map((l) => (
              <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: l.color }} />
                <Typography variant="caption">{l.label}</Typography>
              </Box>
            ))}
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06) } }}>
                  <TableCell>Familia</TableCell>
                  {weeks.map((w) => <TableCell key={w} align="center">{w}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {mpsAdherence.map((row) => (
                  <TableRow key={row.familia} hover>
                    <TableCell fontWeight={600}>{row.familia}</TableCell>
                    <AdherenceCell value={row.w1} />
                    <AdherenceCell value={row.w2} />
                    <AdherenceCell value={row.w3} />
                    <AdherenceCell value={row.w4} />
                    <AdherenceCell value={row.w5} />
                    <AdherenceCell value={row.w6} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* OEE */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            OEE por Planta (Overall Equipment Effectiveness)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06) } }}>
                  <TableCell>Planta</TableCell>
                  <TableCell align="center">Planificado</TableCell>
                  <TableCell align="center">Real</TableCell>
                  <TableCell align="center">Diferencia</TableCell>
                  <TableCell>Comparativa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {oeeData.map((row) => (
                  <TableRow key={row.planta} hover>
                    <TableCell fontWeight={600}>{row.planta}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">{row.planificado}%</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700} color={APS_COLOR}>{row.real}%</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${row.diferencia > 0 ? '+' : ''}${row.diferencia}%`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: row.diferencia >= 0 ? '#D1FAE5' : '#FEE2E2',
                          color: row.diferencia >= 0 ? '#065F46' : '#991B1B',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 180 }}>
                      <HBar value={row.real} color={row.real >= 83 ? '#10B981' : '#F59E0B'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Variaciones Plan vs Real */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Plan vs Real — Variaciones por Familia
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06) } }}>
                  <TableCell>Familia</TableCell>
                  <TableCell align="right">Plan (und)</TableCell>
                  <TableCell align="right">Real (und)</TableCell>
                  <TableCell align="center">Variación</TableCell>
                  <TableCell>Causa Raíz</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variaciones.map((row) => (
                  <TableRow key={row.familia} hover>
                    <TableCell fontWeight={600}>{row.familia}</TableCell>
                    <TableCell align="right">{row.plan.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.real.toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${row.variacion > 0 ? '+' : ''}${row.variacion}%`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: row.variacion >= 0 ? '#D1FAE5' : row.variacion >= -10 ? '#FEF3C7' : '#FEE2E2',
                          color:   row.variacion >= 0 ? '#065F46' : row.variacion >= -10 ? '#92400E' : '#991B1B',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{row.causaRaiz}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Tab 3: Inventario & Costos ───────────────────────────────────────────────
function InventarioCostosTab() {
  const kpis: InventoryKPI[] = [
    { label: 'Inventory Turns', value: '8.3x',      sub: 'rotaciones/año',      icon: <TrendingUp />,  color: '#10B981' },
    { label: 'Working Capital', value: '$4.2M',     sub: 'capital de trabajo',  icon: <Assessment />,  color: APS_COLOR },
    { label: 'Carrying Cost',   value: '$420K/mes', sub: 'costo de tenencia',   icon: <Inventory2 />,  color: '#F59E0B' },
    { label: 'Obsolescence Risk',value: '$85K',     sub: 'riesgo obsolescencia',icon: <Warning />,     color: '#EF4444' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        {kpis.map((k) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={k.label}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha(k.color, 0.25), borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      {k.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color={k.color} sx={{ mt: 0.5 }}>
                      {k.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{k.sub}</Typography>
                  </Box>
                  <Box sx={{ color: k.color, opacity: 0.7, mt: 0.5 }}>{k.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ABC Analysis */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Análisis ABC — Distribución de Valor
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06) } }}>
                      <TableCell>Cat.</TableCell>
                      <TableCell align="right">% SKUs</TableCell>
                      <TableCell align="right">% Valor</TableCell>
                      <TableCell align="right">Monto USD</TableCell>
                      <TableCell align="right">Días Cob.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {abcData.map((row) => (
                      <TableRow key={row.categoria} hover>
                        <TableCell>
                          <Chip
                            label={`Cat. ${row.categoria}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: row.categoria === 'A' ? alpha(APS_COLOR, 0.12) : row.categoria === 'B' ? alpha('#F59E0B', 0.12) : alpha('#6B7280', 0.12),
                              color:   row.categoria === 'A' ? APS_COLOR_DARK          : row.categoria === 'B' ? '#92400E'             : '#374151',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{row.porcentajeSkus}%</TableCell>
                        <TableCell align="right">{row.porcentajeValor}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{row.montoUSD}</TableCell>
                        <TableCell align="right">{row.diasCobertura}d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Días Cobertura por Categoría
              </Typography>
              {abcData.map((row) => (
                <Box key={row.categoria} sx={{ mb: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Categoría {row.categoria}
                  </Typography>
                  <HBar
                    value={row.diasCobertura}
                    max={100}
                    color={row.categoria === 'A' ? APS_COLOR : row.categoria === 'B' ? '#F59E0B' : '#6B7280'}
                    height={10}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Top 10 SKUs por Valor de Inventario
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06), fontSize: '0.7rem' } }}>
                      <TableCell>SKU</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="center">Cat.</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell align="right">V.Unit</TableCell>
                      <TableCell align="right">V.Total</TableCell>
                      <TableCell align="right">Cob.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topSKUs.map((row) => (
                      <TableRow key={row.sku} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, color: APS_COLOR }}>
                          {row.sku}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem' }}>{row.descripcion}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.categoria}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 18,
                              fontWeight: 700,
                              bgcolor: row.categoria === 'A' ? alpha(APS_COLOR, 0.12) : row.categoria === 'B' ? alpha('#F59E0B', 0.12) : alpha('#6B7280', 0.12),
                              color:   row.categoria === 'A' ? APS_COLOR_DARK          : row.categoria === 'B' ? '#92400E'             : '#374151',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem' }}>{row.stock}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem' }}>{row.valorUnit}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{row.valorTotal}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem' }}>{row.diasCobertura}d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Tab 4: Presidencia (Executive Summary) ───────────────────────────────────
function PresidenciaTab() {
  const months = ['Abril 2026', 'Mayo 2026', 'Junio 2026']

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Gauge Row */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
            Indicadores Clave — Resumen Ejecutivo (Jun 2026)
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            {gaugeMetrics.map((g) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={g.label}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <GaugeCircle metric={g} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* S&OP Commitments */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Compromisos S&OP — Período Jun 2026
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(APS_COLOR, 0.06) } }}>
                  <TableCell>Indicador</TableCell>
                  <TableCell align="center">Target</TableCell>
                  <TableCell align="center">Actual</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commitments.map((row) => (
                  <TableRow key={row.indicador} hover>
                    <TableCell fontWeight={600}>{row.indicador}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">{row.target}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700}>{row.actual}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.estado === 'ok' ? 'Cumplido' : row.estado === 'warning' ? 'Riesgo' : 'Incumplido'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: row.estado === 'ok' ? '#D1FAE5' : row.estado === 'warning' ? '#FEF3C7' : '#FEE2E2',
                          color:   row.estado === 'ok' ? '#065F46' : row.estado === 'warning' ? '#92400E' : '#991B1B',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 3-Month Trend */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
            Tendencia Trimestral de KPIs Principales
          </Typography>
          {trendData.map((row) => (
            <Box key={row.kpi} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                {row.kpi}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {[row.apr, row.may, row.jun].map((v, i) => {
                  const isLast = i === 2
                  const prev   = i === 0 ? null : [row.apr, row.may, row.jun][i - 1]
                  const delta  = prev !== null ? (v - prev).toFixed(1) : null
                  return (
                    <Box key={months[i]} sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{months[i]}</Typography>
                        {delta && (
                          <Typography variant="caption" fontWeight={700} color={parseFloat(delta) >= 0 ? 'success.main' : 'error.main'}>
                            {parseFloat(delta) >= 0 ? '+' : ''}{delta}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ bgcolor: alpha(isLast ? APS_COLOR : '#6B7280', 0.1), borderRadius: 1, height: 8, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${v}%`,
                            height: '100%',
                            bgcolor: isLast ? APS_COLOR : '#9CA3AF',
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" fontWeight={700} color={isLast ? APS_COLOR : 'text.secondary'}>
                        {v}%
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function APSReportes() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="APS — Reportes & Analítica">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: alpha(APS_COLOR, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Assessment sx={{ color: APS_COLOR, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                Reportes & Analítica APS
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Advanced Planning & Scheduling — Análisis y seguimiento de KPIs
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
              '& .Mui-selected': { color: APS_COLOR },
              '& .MuiTabs-indicator': { bgcolor: APS_COLOR },
            }}
          >
            <Tab label="Demanda & Forecast" />
            <Tab label="Supply & Producción" />
            <Tab label="Inventario & Costos" />
            <Tab label="Presidencia" />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}><DemandaForecastTab /></TabPanel>
        <TabPanel value={tab} index={1}><SupplyProduccionTab /></TabPanel>
        <TabPanel value={tab} index={2}><InventarioCostosTab /></TabPanel>
        <TabPanel value={tab} index={3}><PresidenciaTab /></TabPanel>
      </Box>
    </Layout>
  )
}
