import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
} from '@mui/material'
import {
  Speed, FactoryOutlined, PrecisionManufacturing, PauseCircle,
  TrendingUp, TrendingDown, WarningAmber,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineaOEE {
  nombre: string; disp: number; rend: number; cal: number; oee: number
  real: number; nominal: number; vsAnterior: number
}

interface EquipoOEE {
  codigo: string; nombre: string; disp: number; rend: number; cal: number
  oee: number; hrsOp: number; paradas: number; mtbf: number; mttr: number
}

interface TipoParada {
  tipo: string; frecuencia: number; duracion: number; pctTiempo: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const lineasOEE: LineaOEE[] = [
  { nombre: 'Línea 1 — Ensamble',    disp: 94.2, rend: 98.1, cal: 99.8, oee: 92.1, real: 4820, nominal: 5200, vsAnterior:  2.4 },
  { nombre: 'Línea 2 — Inyección',   disp: 91.8, rend: 96.2, cal: 99.5, oee: 87.9, real: 3940, nominal: 4400, vsAnterior:  1.1 },
  { nombre: 'Línea 3 — Empaque',     disp: 88.5, rend: 94.8, cal: 98.7, oee: 82.8, real: 6210, nominal: 7100, vsAnterior: -1.2 },
  { nombre: 'Línea 4 — Soldadura',   disp: 79.2, rend: 91.4, cal: 99.1, oee: 71.5, real: 2840, nominal: 3600, vsAnterior:  0.8 },
  { nombre: 'Línea 5 — Pintura',     disp: 64.8, rend: 88.2, cal: 97.5, oee: 55.7, real: 1920, nominal: 2800, vsAnterior: -3.1 },
  { nombre: 'Línea 6 — Mecanizado',  disp: 93.6, rend: 97.5, cal: 99.6, oee: 90.8, real: 3680, nominal: 4000, vsAnterior:  1.9 },
]

const equiposOEE: EquipoOEE[] = [
  { codigo: 'EQ-001', nombre: 'Prensa Hidráulica 200T',  disp: 95.1, rend: 98.4, cal: 99.9, oee: 93.5, hrsOp: 680, paradas: 120, mtbf: 226, mttr: 28  },
  { codigo: 'EQ-002', nombre: 'Inyectora KM-500',        disp: 91.2, rend: 96.1, cal: 99.5, oee: 87.2, hrsOp: 620, paradas: 180, mtbf: 186, mttr: 42  },
  { codigo: 'EQ-003', nombre: 'Robot Soldadura ABB',     disp: 98.2, rend: 99.1, cal: 99.8, oee: 97.2, hrsOp: 710, paradas:  55, mtbf: 410, mttr: 15  },
  { codigo: 'EQ-004', nombre: 'Torno CNC Mazak',         disp: 93.8, rend: 97.2, cal: 99.7, oee: 90.8, hrsOp: 660, paradas: 140, mtbf: 248, mttr: 32  },
  { codigo: 'EQ-005', nombre: 'Fresadora DMG 5 ejes',    disp: 88.4, rend: 94.6, cal: 98.9, oee: 82.7, hrsOp: 590, paradas: 220, mtbf: 148, mttr: 55  },
  { codigo: 'EQ-006', nombre: 'Horno Tratamiento Térmico', disp: 72.5, rend: 89.3, cal: 97.8, oee: 63.3, hrsOp: 480, paradas: 440, mtbf:  88, mttr: 108 },
  { codigo: 'EQ-007', nombre: 'Banda Conveyora L-1',     disp: 97.4, rend: 99.8, cal: 99.9, oee: 97.1, hrsOp: 720, paradas:  65, mtbf: 480, mttr: 12  },
  { codigo: 'EQ-008', nombre: 'Compresor Atlas GA-75',   disp: 94.6, rend: 98.8, cal: 99.6, oee: 93.1, hrsOp: 700, paradas: 100, mtbf: 280, mttr: 24  },
  { codigo: 'EQ-009', nombre: 'Cabina de Pintura A',     disp: 64.2, rend: 87.5, cal: 97.1, oee: 54.5, hrsOp: 410, paradas: 540, mtbf:  68, mttr: 132 },
  { codigo: 'EQ-010', nombre: 'Empacadora Automática',   disp: 89.9, rend: 95.8, cal: 99.2, oee: 85.3, hrsOp: 630, paradas: 200, mtbf: 168, mttr: 48  },
]

const tiposParada: TipoParada[] = [
  { tipo: 'MECÁNICA',  frecuencia: 42, duracion: 820, pctTiempo: 44.6 },
  { tipo: 'CALIDAD',   frecuencia: 28, duracion: 380, pctTiempo: 20.7 },
  { tipo: 'SETUP',     frecuencia: 22, duracion: 310, pctTiempo: 16.8 },
  { tipo: 'MATERIAL',  frecuencia: 18, duracion: 220, pctTiempo: 12.0 },
  { tipo: 'OPERATIVA', frecuencia: 17, duracion: 110, pctTiempo:  6.0 },
]

const paradaColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function oeeColor(oee: number) {
  if (oee >= 85) return '#22c55e'
  if (oee >= 70) return '#f59e0b'
  return '#ef4444'
}

function SemaforoOEE({ oee }: { oee: number }) {
  return <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: oeeColor(oee) }} />
}

// ─── SVG Gauge ────────────────────────────────────────────────────────────────
function GaugeSVG({ value, label, color = MES_COLOR }: { value: number; label: string; color?: string }) {
  const r = 54; const cx = 70; const cy = 70
  const startAngle = -210; const endAngle = 30
  const totalAngle = endAngle - startAngle
  const valueAngle = startAngle + (value / 100) * totalAngle

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const arcPath = (start: number, end: number, innerR: number, outerR: number) => {
    const s = toRad(start); const e = toRad(end)
    const x1 = cx + outerR * Math.cos(s); const y1 = cy + outerR * Math.sin(s)
    const x2 = cx + outerR * Math.cos(e); const y2 = cy + outerR * Math.sin(e)
    const x3 = cx + innerR * Math.cos(e); const y3 = cy + innerR * Math.sin(e)
    const x4 = cx + innerR * Math.cos(s); const y4 = cy + innerR * Math.sin(s)
    const large = Math.abs(end - start) > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={140} height={110} viewBox="0 0 140 110">
        {/* Track */}
        <path d={arcPath(toRad(startAngle), toRad(endAngle), r - 14, r)} fill="#1e3a5f" />
        {/* Value fill */}
        <path d={arcPath(toRad(startAngle), toRad(valueAngle), r - 14, r)} fill={color} opacity={0.9} />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 7) * Math.cos(toRad(valueAngle))}
          y2={cy + (r - 7) * Math.sin(toRad(valueAngle))}
          stroke="#fff" strokeWidth={2} strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        {/* Value text */}
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={900}>
          {value}%
        </text>
      </svg>
      <Typography sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, mt: -1 }}>{label}</Typography>
    </Box>
  )
}

// ─── Tab 0: OEE Global ────────────────────────────────────────────────────────
function OEEGlobalTab() {
  const disponibilidad = 91.2; const rendimiento = 95.8; const calidad = 99.4
  const oee = 87.3

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Gauges + OEE gigante */}
      <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}33`, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* 3 gauges */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <GaugeSVG value={disponibilidad} label="Disponibilidad" color="#3b82f6" />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <GaugeSVG value={rendimiento} label="Rendimiento" color="#f59e0b" />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <GaugeSVG value={calidad} label="Calidad" color="#22c55e" />
                </Box>
              </Box>
            </Grid>

            {/* OEE resultante */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, mb: 1 }}>OEE RESULTANTE</Typography>
                <Typography sx={{ color: MES_COLOR, fontWeight: 900, fontSize: 72, lineHeight: 1 }}>
                  {oee}%
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 12, mt: 1 }}>Disponibilidad × Rendimiento × Calidad</Typography>
                <Typography sx={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                  {disponibilidad}% × {rendimiento}% × {calidad}%
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Stacked bar OEE */}
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, mb: 1 }}>Composición OEE</Typography>
            <Box sx={{ height: 28, display: 'flex', borderRadius: 1, overflow: 'hidden', gap: '2px' }}>
              <Box sx={{ width: `${disponibilidad}%`, bgcolor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>D: {disponibilidad}%</Typography>
              </Box>
              <Box sx={{ width: `${(rendimiento / 100) * (100 - disponibilidad)}%`, bgcolor: '#1e3a5f' }} />
            </Box>
            <Box sx={{ height: 28, display: 'flex', borderRadius: 1, overflow: 'hidden', gap: '2px', mt: 1 }}>
              <Box sx={{ width: `${rendimiento}%`, bgcolor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>R: {rendimiento}%</Typography>
              </Box>
              <Box sx={{ width: `${100 - rendimiento}%`, bgcolor: '#1e3a5f' }} />
            </Box>
            <Box sx={{ height: 28, display: 'flex', borderRadius: 1, overflow: 'hidden', gap: '2px', mt: 1 }}>
              <Box sx={{ width: `${calidad}%`, bgcolor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>C: {calidad}%</Typography>
              </Box>
              <Box sx={{ width: `${100 - calidad}%`, bgcolor: '#1e3a5f' }} />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Benchmarks */}
      <Grid container spacing={2}>
        {[
          {
            label: 'Clase Mundial', valor: '85%+', estado: oee >= 85, icono: <TrendingUp />,
            desc: oee >= 85 ? `Alcanzado — ${oee}%` : `No alcanzado — ${oee}%`,
            color: oee >= 85 ? '#22c55e' : '#ef4444',
          },
          {
            label: 'Meta Empresa', valor: '88%', estado: oee >= 88, icono: <Speed />,
            desc: oee >= 88 ? 'Superada' : `En progreso — faltan ${(88 - oee).toFixed(1)} pp`,
            color: oee >= 88 ? '#22c55e' : '#f59e0b',
          },
          {
            label: 'Mes Anterior', valor: '85.1%', estado: true, icono: <TrendingUp />,
            desc: `+${(oee - 85.1).toFixed(1)} pp vs mes anterior`,
            color: '#22c55e',
          },
        ].map((b) => (
          <Grid size={{ xs: 12, md: 4 }} key={b.label}>
            <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${b.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '14px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>{b.label}</Typography>
                  <Box sx={{ color: b.color }}>{b.icono}</Box>
                </Box>
                <Typography sx={{ color: b.color, fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{b.valor}</Typography>
                <Typography sx={{ color: b.estado ? '#22c55e' : '#f59e0b', fontSize: 11, mt: 0.5, fontWeight: 600 }}>
                  {b.estado ? '✓' : '→'} {b.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// ─── Tab 1: Por Línea ─────────────────────────────────────────────────────────
function PorLineaTab() {
  const sorted = [...lineasOEE].sort((a, b) => b.oee - a.oee)
  const maxOEE = Math.max(...sorted.map((l) => l.oee))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #1e3a5f', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {['Línea', 'Disponib.', 'Rendim.', 'Calidad', 'OEE%', 'Prod. Real', 'Prod. Nominal', 'vs Ant.', 'Estado'].map((h) => (
                <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lineasOEE.map((row) => (
              <TableRow key={row.nombre} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 12, whiteSpace: 'nowrap' }}>{row.nombre}</TableCell>
                <TableCell sx={{ color: '#3b82f6', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.disp}%</TableCell>
                <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.rend}%</TableCell>
                <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f' }}>{row.cal}%</TableCell>
                <TableCell sx={{ borderColor: '#1e3a5f' }}>
                  <Typography sx={{ color: oeeColor(row.oee), fontWeight: 900, fontSize: 15 }}>{row.oee}%</Typography>
                </TableCell>
                <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f' }}>{row.real.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={{ color: '#64748b', borderColor: '#1e3a5f' }}>{row.nominal.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={{ borderColor: '#1e3a5f' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {row.vsAnterior >= 0
                      ? <TrendingUp sx={{ fontSize: 16, color: '#22c55e' }} />
                      : <TrendingDown sx={{ fontSize: 16, color: '#ef4444' }} />
                    }
                    <Typography sx={{ color: row.vsAnterior >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 12 }}>
                      {row.vsAnterior >= 0 ? '+' : ''}{row.vsAnterior} pp
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ borderColor: '#1e3a5f' }}><SemaforoOEE oee={row.oee} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Barras OEE por línea */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>OEE por Línea (mayor a menor)</Typography>
        <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #1e3a5f', borderRadius: 2, p: 3 }}>
          {/* Marca 85% */}
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: `${(85 / maxOEE) * 100}%`, top: 0, bottom: 0, width: 1, bgcolor: '#22c55e', opacity: 0.6,
              borderLeft: '1px dashed #22c55e', zIndex: 1 }} />
            <Typography sx={{ position: 'absolute', left: `${(85 / maxOEE) * 100 + 0.5}%`, top: 0, color: '#22c55e', fontSize: 9, fontWeight: 700 }}>
              85%
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
              {sorted.map((l) => (
                <Box key={l.nombre}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                    <Typography sx={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{l.nombre}</Typography>
                    <Typography sx={{ color: oeeColor(l.oee), fontWeight: 900, fontSize: 13 }}>{l.oee}%</Typography>
                  </Box>
                  <Box sx={{ height: 22, bgcolor: '#0a1628', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%', width: `${(l.oee / maxOEE) * 100}%`,
                      bgcolor: oeeColor(l.oee), opacity: 0.85, borderRadius: 1,
                      transition: 'width 0.4s ease',
                    }} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Tab 2: Por Equipo ────────────────────────────────────────────────────────
function PorEquipoTab() {
  return (
    <Box>
      <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #1e3a5f', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow>
              {['Código', 'Equipo', 'Disponib.', 'Rendim.', 'Calidad', 'OEE%', 'Hrs Op.', 'Paradas (min)', 'MTBF (hrs)', 'MTTR (min)'].map((h) => (
                <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f', whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {equiposOEE.map((eq) => {
              const critico = eq.oee < 70
              return (
                <TableRow key={eq.codigo}
                  sx={{
                    bgcolor: critico ? 'rgba(220,38,38,0.08)' : 'transparent',
                    '&:hover': { bgcolor: critico ? 'rgba(220,38,38,0.14)' : `${MES_COLOR}10` },
                  }}>
                  <TableCell sx={{ color: '#60a5fa', fontFamily: 'monospace', borderColor: '#1e3a5f', fontSize: 11 }}>{eq.codigo}</TableCell>
                  <TableCell sx={{ color: critico ? '#ef4444' : '#e2e8f0', fontWeight: 600, borderColor: '#1e3a5f', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {critico && <WarningAmber sx={{ fontSize: 13, mr: 0.5, color: '#ef4444', verticalAlign: 'middle' }} />}
                    {eq.nombre}
                  </TableCell>
                  <TableCell sx={{ color: '#3b82f6', fontWeight: 700, borderColor: '#1e3a5f' }}>{eq.disp}%</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f' }}>{eq.rend}%</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#1e3a5f' }}>{eq.cal}%</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={eq.oee}
                        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#1e3a5f',
                          '& .MuiLinearProgress-bar': { bgcolor: oeeColor(eq.oee) } }} />
                      <Typography sx={{ color: oeeColor(eq.oee), fontWeight: 900, fontSize: 13, minWidth: 40 }}>{eq.oee}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#e2e8f0', borderColor: '#1e3a5f' }}>{eq.hrsOp}</TableCell>
                  <TableCell sx={{ color: eq.paradas > 300 ? '#ef4444' : '#f59e0b', fontWeight: 700, borderColor: '#1e3a5f' }}>{eq.paradas}</TableCell>
                  <TableCell sx={{ color: eq.mtbf >= 200 ? '#22c55e' : eq.mtbf >= 100 ? '#f59e0b' : '#ef4444', fontWeight: 700, borderColor: '#1e3a5f' }}>{eq.mtbf}</TableCell>
                  <TableCell sx={{ color: eq.mttr <= 30 ? '#22c55e' : eq.mttr <= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700, borderColor: '#1e3a5f' }}>{eq.mttr}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Leyenda OEE crítico */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#22c55e' }} />
          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>OEE ≥ 85% — Clase Mundial</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#f59e0b' }} />
          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>OEE 70–85% — Aceptable</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#ef4444' }} />
          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>OEE &lt; 70% — Crítico (fondo rojo)</Typography>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Tab 3: Análisis Paradas ──────────────────────────────────────────────────

function AnalisisParadasTab() {
  const maxDur = Math.max(...tiposParada.map((t) => t.duracion))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs paradas */}
      <Grid container spacing={2}>
        {[
          { label: 'Total Paradas Mes', value: '127',      color: '#f97316' },
          { label: 'Tiempo Perdido',    value: '1,840 min', color: '#ef4444', sub: '30.7 horas' },
          { label: 'Mayor Causa',       value: 'Mecánica', color: '#dc2626', sub: '44.6% del tiempo' },
          { label: '% Disp. Perdida',   value: '8.8%',     color: '#d97706', sub: 'vs turno teórico' },
        ].map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{k.value}</Typography>
                {k.sub && <Typography sx={{ color: '#64748b', fontSize: 10, mt: 0.2 }}>{k.sub}</Typography>}
                <Typography sx={{ color: '#94a3b8', fontSize: 11, mt: 0.3, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla clasificación paradas */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Clasificación de Paradas por Tipo</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #1e3a5f' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Tipo de Parada', 'Frecuencia', 'Duración Total (min)', '% Tiempo Total'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#1e3a5f' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tiposParada.map((t, i) => (
                <TableRow key={t.tipo} sx={{ '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Chip label={t.tipo} size="small" sx={{ bgcolor: `${paradaColors[i]}22`, color: paradaColors[i], fontWeight: 700, fontSize: 11, border: `1px solid ${paradaColors[i]}44` }} />
                  </TableCell>
                  <TableCell sx={{ color: paradaColors[i], fontWeight: 900, fontSize: 15, borderColor: '#1e3a5f' }}>{t.frecuencia}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderColor: '#1e3a5f' }}>{t.duracion} min</TableCell>
                  <TableCell sx={{ borderColor: '#1e3a5f' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={t.pctTiempo}
                        sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#1e3a5f',
                          '& .MuiLinearProgress-bar': { bgcolor: paradaColors[i] } }} />
                      <Typography sx={{ color: paradaColors[i], fontWeight: 900, minWidth: 40, fontSize: 13 }}>{t.pctTiempo}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pareto horizontal paradas */}
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>Pareto de Paradas — Duración Total</Typography>
        <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #1e3a5f', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {tiposParada.map((t, i) => (
              <Box key={t.tipo}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: paradaColors[i] }} />
                    <Typography sx={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{t.tipo}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ color: paradaColors[i], fontWeight: 900, fontSize: 13 }}>{t.duracion} min</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 12, minWidth: 40 }}>{t.pctTiempo}%</Typography>
                    <Typography sx={{ color: '#475569', fontSize: 11 }}>{t.frecuencia} ocur.</Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 24, bgcolor: '#0a1628', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                  <Box sx={{
                    height: '100%', width: `${(t.duracion / maxDur) * 100}%`,
                    bgcolor: paradaColors[i], opacity: 0.85, borderRadius: 1,
                    transition: 'width 0.4s ease',
                  }} />
                </Box>
              </Box>
            ))}
          </Box>
          <Divider sx={{ bgcolor: '#1e3a5f', my: 2 }} />
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Total tiempo perdido</Typography>
              <Typography sx={{ color: '#ef4444', fontWeight: 900, fontSize: 18 }}>1,840 min</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Total paradas</Typography>
              <Typography sx={{ color: '#f97316', fontWeight: 900, fontSize: 18 }}>127 eventos</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Promedio por evento</Typography>
              <Typography sx={{ color: '#f59e0b', fontWeight: 900, fontSize: 18 }}>14.5 min</Typography>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MESOEE() {
  const [tab, setTab] = useState(0)

  const tabLabels = ['OEE Global', 'Por Línea', 'Por Equipo', 'Análisis Paradas']
  const tabIcons = [<Speed />, <FactoryOutlined />, <PrecisionManufacturing />, <PauseCircle />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${MES_COLOR}22`, border: `1px solid ${MES_COLOR}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: MES_COLOR,
          }}>
            <Speed fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>
              MES — OEE (Overall Equipment Effectiveness)
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
              ICOLTRANS · Disponibilidad · Rendimiento · Calidad · Análisis de Paradas
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ bgcolor: '#1e3a5f', mb: 3 }} />

        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{
          mb: 1,
          '& .MuiTab-root': { color: '#64748b', fontWeight: 600, textTransform: 'none', fontSize: 14 },
          '& .Mui-selected': { color: MES_COLOR },
          '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
        }}>
          {tabLabels.map((label, i) => (
            <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
          ))}
        </Tabs>

        <Divider sx={{ bgcolor: '#1e3a5f', mb: 1 }} />

        <TabPanel value={tab} index={0}><OEEGlobalTab /></TabPanel>
        <TabPanel value={tab} index={1}><PorLineaTab /></TabPanel>
        <TabPanel value={tab} index={2}><PorEquipoTab /></TabPanel>
        <TabPanel value={tab} index={3}><AnalisisParadasTab /></TabPanel>
      </Box>
    </Layout>
  )
}
