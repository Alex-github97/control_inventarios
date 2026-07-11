import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
  Button, TextField, MenuItem, InputAdornment, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, Alert, alpha,
} from '@mui/material'
import {
  Speed, FactoryOutlined, PrecisionManufacturing, PauseCircle,
  TrendingUp, TrendingDown, WarningAmber, Add as AddIcon, Close as CloseIcon,
  FileDownload as FileDownloadIcon, AccessTime, Bolt, CheckCircleOutline,
  Insights, BuildCircle,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'

const FACTOR_COLOR: Record<string, string> = {
  Disponibilidad: '#3b82f6',
  Rendimiento:    '#f59e0b',
  Calidad:        '#22c55e',
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PerdidaItem { causa: string; min: number; freq: number }

interface TurnoOEE {
  turno: string; turnoLabel: string
  disp: number; rend: number; cal: number; oee: number; real: number; nominal: number
}

interface LineaOEE {
  id: string; nombre: string; proceso: string; supervisor: string
  disp: number; rend: number; cal: number; oee: number
  real: number; nominal: number; vsAnterior: number
  tiempoPlan: number; paradasProg: number
  paros: PerdidaItem[]
  microparos: { min: number; eventos: number }
  velNominal: number
  defectos: { rechazos: number; retrabajos: number; scrap: number }
  turnos: TurnoOEE[]
  historial: { periodo: string; oee: number }[]
}

interface EquipoOEE {
  codigo: string; nombre: string; linea: string; fabricante: string; anio: number
  criticidad: 'Alta' | 'Media' | 'Baja'
  disp: number; rend: number; cal: number; oee: number
  hrsOp: number; paradas: number; mtbf: number; mttr: number
  paros: PerdidaItem[]
}

interface TipoParada {
  tipo: string; frecuencia: number; duracion: number; pctTiempo: number
  factorOEE: 'Disponibilidad' | 'Rendimiento' | 'Calidad'
  lineasAfectadas: string[]
  causas: PerdidaItem[]
}

interface ParadaEvento {
  id: number; linea: string; turno: string; equipo: string; tipo: string; causa: string
  fechaInicio: string; duracion: number; responsable: string; factor: string; observaciones: string
}

// ─── Select option catalogs ─────────────────────────────────────────────────────
const TURNOS = [
  { short: 'Turno 1', label: 'Turno 1 · 06:00–14:00' },
  { short: 'Turno 2', label: 'Turno 2 · 14:00–22:00' },
  { short: 'Turno 3', label: 'Turno 3 · 22:00–06:00' },
]

const TIPOS_PARADA_NOMBRES = ['MECÁNICA', 'CALIDAD', 'SETUP', 'MATERIAL', 'OPERATIVA', 'MICROPAROS']

const CAUSAS_POR_TIPO: Record<string, string[]> = {
  'MECÁNICA':   ['Rodamiento dañado', 'Banda/correa rota', 'Falla de motor', 'Fuga hidráulica', 'Atasco mecánico'],
  'CALIDAD':    ['Producto fuera de especificación', 'Ajuste de parámetros', 'Rechazo dimensional', 'Contaminación'],
  'SETUP':      ['Cambio de formato', 'Cambio de herramienta', 'Ajuste inicial', 'Calibración de arranque'],
  'MATERIAL':   ['Falta de material', 'Material defectuoso', 'Espera de insumos', 'Cambio de lote'],
  'OPERATIVA':  ['Falta de operador', 'Reunión de turno', 'Limpieza programada', 'Falta de instrucción'],
  'MICROPAROS': ['Atasco de producto', 'Sensor sucio', 'Reinicio de ciclo', 'Ajuste menor de guía'],
}

const FACTOR_POR_TIPO: Record<string, 'Disponibilidad' | 'Rendimiento' | 'Calidad'> = {
  'MECÁNICA':   'Disponibilidad',
  'SETUP':      'Disponibilidad',
  'MATERIAL':   'Disponibilidad',
  'OPERATIVA':  'Disponibilidad',
  'CALIDAD':    'Calidad',
  'MICROPAROS': 'Rendimiento',
}

const RESPONSABLES = ['Supervisor de Turno', 'Operador de Línea', 'Mantenimiento', 'Aseguramiento Calidad', 'Logística']

// ─── Mock Data ────────────────────────────────────────────────────────────────
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10))
const round1 = (n: number) => Math.round(n * 10) / 10

function makeTurnos(l: { disp: number; rend: number; cal: number; nominal: number }): TurnoOEE[] {
  return [
    { short: 'Turno 1', label: 'Turno 1 · 06:00–14:00', d: 1.6 },
    { short: 'Turno 2', label: 'Turno 2 · 14:00–22:00', d: -0.4 },
    { short: 'Turno 3', label: 'Turno 3 · 22:00–06:00', d: -2.3 },
  ].map(({ short, label, d }) => {
    const disp = clamp(l.disp + d)
    const rend = clamp(l.rend + d * 0.5)
    const cal  = clamp(l.cal + d * 0.08)
    const oee  = round1((disp * rend * cal) / 10000)
    const nominal = Math.round(l.nominal / 3)
    const real = Math.round((nominal * oee) / 100)
    return { turno: short, turnoLabel: label, disp, rend, cal, oee, real, nominal }
  })
}

function makeHistorial(l: { oee: number }): { periodo: string; oee: number }[] {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
  return meses.map((m, i) => ({ periodo: m, oee: clamp(l.oee - (5 - i) * 0.9 + (i % 2 ? 1.1 : -0.8)) }))
}

const LINEAS_BASE: Omit<LineaOEE, 'turnos' | 'historial'>[] = [
  {
    id: 'LN-1', nombre: 'Línea 1 — Ensamble', proceso: 'Ensamble', supervisor: 'Jorge Méndez',
    disp: 94.2, rend: 98.1, cal: 99.8, oee: 92.1, real: 4820, nominal: 5200, vsAnterior: 2.4,
    tiempoPlan: 1440, paradasProg: 60,
    paros: [{ causa: 'Ajuste de estación', min: 22, freq: 3 }, { causa: 'Falla de sensor', min: 14, freq: 1 }],
    microparos: { min: 18, eventos: 24 }, velNominal: 220,
    defectos: { rechazos: 8, retrabajos: 2, scrap: 1 },
  },
  {
    id: 'LN-2', nombre: 'Línea 2 — Inyección', proceso: 'Inyección', supervisor: 'Ana Rojas',
    disp: 91.8, rend: 96.2, cal: 99.5, oee: 87.9, real: 3940, nominal: 4400, vsAnterior: 1.1,
    tiempoPlan: 1440, paradasProg: 75,
    paros: [{ causa: 'Cambio de molde', min: 48, freq: 2 }, { causa: 'Fuga hidráulica', min: 26, freq: 1 }],
    microparos: { min: 32, eventos: 41 }, velNominal: 190,
    defectos: { rechazos: 18, retrabajos: 6, scrap: 4 },
  },
  {
    id: 'LN-3', nombre: 'Línea 3 — Empaque', proceso: 'Empaque', supervisor: 'Carlos Díaz',
    disp: 88.5, rend: 94.8, cal: 98.7, oee: 82.8, real: 6210, nominal: 7100, vsAnterior: -1.2,
    tiempoPlan: 1440, paradasProg: 90,
    paros: [{ causa: 'Atasco de banda', min: 54, freq: 6 }, { causa: 'Falta de material', min: 40, freq: 3 }],
    microparos: { min: 58, eventos: 72 }, velNominal: 320,
    defectos: { rechazos: 41, retrabajos: 12, scrap: 8 },
  },
  {
    id: 'LN-4', nombre: 'Línea 4 — Soldadura', proceso: 'Soldadura', supervisor: 'Luis Vargas',
    disp: 79.2, rend: 91.4, cal: 99.1, oee: 71.5, real: 2840, nominal: 3600, vsAnterior: 0.8,
    tiempoPlan: 1440, paradasProg: 80,
    paros: [{ causa: 'Falla robot ABB', min: 96, freq: 2 }, { causa: 'Cambio de electrodo', min: 62, freq: 4 }, { causa: 'Espera de insumos', min: 38, freq: 2 }],
    microparos: { min: 44, eventos: 51 }, velNominal: 150,
    defectos: { rechazos: 14, retrabajos: 9, scrap: 3 },
  },
  {
    id: 'LN-5', nombre: 'Línea 5 — Pintura', proceso: 'Pintura', supervisor: 'Pedro Torres',
    disp: 64.8, rend: 88.2, cal: 97.5, oee: 55.7, real: 1920, nominal: 2800, vsAnterior: -3.1,
    tiempoPlan: 1440, paradasProg: 120,
    paros: [{ causa: 'Falla cabina de pintura', min: 168, freq: 3 }, { causa: 'Cambio de color', min: 92, freq: 5 }, { causa: 'Limpieza de boquillas', min: 60, freq: 4 }],
    microparos: { min: 74, eventos: 88 }, velNominal: 130,
    defectos: { rechazos: 34, retrabajos: 22, scrap: 11 },
  },
  {
    id: 'LN-6', nombre: 'Línea 6 — Mecanizado', proceso: 'Mecanizado', supervisor: 'Jorge Méndez',
    disp: 93.6, rend: 97.5, cal: 99.6, oee: 90.8, real: 3680, nominal: 4000, vsAnterior: 1.9,
    tiempoPlan: 1440, paradasProg: 55,
    paros: [{ causa: 'Cambio de herramienta CNC', min: 34, freq: 5 }, { causa: 'Recalibración', min: 20, freq: 2 }],
    microparos: { min: 24, eventos: 30 }, velNominal: 175,
    defectos: { rechazos: 10, retrabajos: 3, scrap: 2 },
  },
]

const lineasOEE: LineaOEE[] = LINEAS_BASE.map((l) => ({
  ...l,
  turnos: makeTurnos(l),
  historial: makeHistorial(l),
}))

const equiposOEE: EquipoOEE[] = [
  { codigo: 'EQ-001', nombre: 'Prensa Hidráulica 200T',    linea: 'Línea 1 — Ensamble',   fabricante: 'Schuler',       anio: 2019, criticidad: 'Alta',  disp: 95.1, rend: 98.4, cal: 99.9, oee: 93.5, hrsOp: 680, paradas: 120, mtbf: 226, mttr: 28,  paros: [{ causa: 'Ajuste de matriz', min: 60, freq: 3 }, { causa: 'Fuga hidráulica', min: 60, freq: 2 }] },
  { codigo: 'EQ-002', nombre: 'Inyectora KM-500',          linea: 'Línea 2 — Inyección',  fabricante: 'KraussMaffei',  anio: 2018, criticidad: 'Alta',  disp: 91.2, rend: 96.1, cal: 99.5, oee: 87.2, hrsOp: 620, paradas: 180, mtbf: 186, mttr: 42,  paros: [{ causa: 'Cambio de molde', min: 110, freq: 3 }, { causa: 'Falla de resistencia', min: 70, freq: 2 }] },
  { codigo: 'EQ-003', nombre: 'Robot Soldadura ABB',       linea: 'Línea 4 — Soldadura',  fabricante: 'ABB',           anio: 2021, criticidad: 'Alta',  disp: 98.2, rend: 99.1, cal: 99.8, oee: 97.2, hrsOp: 710, paradas: 55,  mtbf: 410, mttr: 15,  paros: [{ causa: 'Reprogramación', min: 35, freq: 2 }, { causa: 'Cambio de antorcha', min: 20, freq: 1 }] },
  { codigo: 'EQ-004', nombre: 'Torno CNC Mazak',           linea: 'Línea 6 — Mecanizado', fabricante: 'Mazak',         anio: 2020, criticidad: 'Media', disp: 93.8, rend: 97.2, cal: 99.7, oee: 90.8, hrsOp: 660, paradas: 140, mtbf: 248, mttr: 32,  paros: [{ causa: 'Cambio de herramienta', min: 90, freq: 5 }, { causa: 'Recalibración', min: 50, freq: 2 }] },
  { codigo: 'EQ-005', nombre: 'Fresadora DMG 5 ejes',      linea: 'Línea 6 — Mecanizado', fabricante: 'DMG MORI',      anio: 2017, criticidad: 'Media', disp: 88.4, rend: 94.6, cal: 98.9, oee: 82.7, hrsOp: 590, paradas: 220, mtbf: 148, mttr: 55,  paros: [{ causa: 'Falla de husillo', min: 130, freq: 2 }, { causa: 'Cambio de herramienta', min: 90, freq: 6 }] },
  { codigo: 'EQ-006', nombre: 'Horno Tratamiento Térmico', linea: 'Línea 4 — Soldadura',  fabricante: 'Ipsen',         anio: 2015, criticidad: 'Alta',  disp: 72.5, rend: 89.3, cal: 97.8, oee: 63.3, hrsOp: 480, paradas: 440, mtbf: 88,  mttr: 108, paros: [{ causa: 'Falla de resistencias', min: 260, freq: 2 }, { causa: 'Control de temperatura', min: 180, freq: 3 }] },
  { codigo: 'EQ-007', nombre: 'Banda Conveyora L-1',       linea: 'Línea 1 — Ensamble',   fabricante: 'Interroll',     anio: 2020, criticidad: 'Baja',  disp: 97.4, rend: 99.8, cal: 99.9, oee: 97.1, hrsOp: 720, paradas: 65,  mtbf: 480, mttr: 12,  paros: [{ causa: 'Tensión de banda', min: 40, freq: 3 }, { causa: 'Sensor de posición', min: 25, freq: 2 }] },
  { codigo: 'EQ-008', nombre: 'Compresor Atlas GA-75',     linea: 'Línea 2 — Inyección',  fabricante: 'Atlas Copco',   anio: 2019, criticidad: 'Media', disp: 94.6, rend: 98.8, cal: 99.6, oee: 93.1, hrsOp: 700, paradas: 100, mtbf: 280, mttr: 24,  paros: [{ causa: 'Cambio de filtro', min: 60, freq: 4 }, { causa: 'Fuga de aire', min: 40, freq: 2 }] },
  { codigo: 'EQ-009', nombre: 'Cabina de Pintura A',       linea: 'Línea 5 — Pintura',    fabricante: 'Gema',          anio: 2014, criticidad: 'Alta',  disp: 64.2, rend: 87.5, cal: 97.1, oee: 54.5, hrsOp: 410, paradas: 540, mtbf: 68,  mttr: 132, paros: [{ causa: 'Obstrucción de boquilla', min: 300, freq: 6 }, { causa: 'Falla de extracción', min: 240, freq: 3 }] },
  { codigo: 'EQ-010', nombre: 'Empacadora Automática',     linea: 'Línea 3 — Empaque',    fabricante: 'Bosch',         anio: 2018, criticidad: 'Media', disp: 89.9, rend: 95.8, cal: 99.2, oee: 85.3, hrsOp: 630, paradas: 200, mtbf: 168, mttr: 48,  paros: [{ causa: 'Atasco de producto', min: 120, freq: 8 }, { causa: 'Cambio de bobina', min: 80, freq: 4 }] },
]

const tiposParada: TipoParada[] = [
  { tipo: 'MECÁNICA',  frecuencia: 42, duracion: 820, pctTiempo: 44.6, factorOEE: 'Disponibilidad', lineasAfectadas: ['Línea 4 — Soldadura', 'Línea 5 — Pintura', 'Línea 2 — Inyección'],
    causas: [{ causa: 'Falla de motor', min: 320, freq: 12 }, { causa: 'Rodamiento dañado', min: 280, freq: 18 }, { causa: 'Fuga hidráulica', min: 220, freq: 12 }] },
  { tipo: 'CALIDAD',   frecuencia: 28, duracion: 380, pctTiempo: 20.7, factorOEE: 'Calidad', lineasAfectadas: ['Línea 3 — Empaque', 'Línea 5 — Pintura'],
    causas: [{ causa: 'Ajuste de parámetros', min: 180, freq: 14 }, { causa: 'Rechazo dimensional', min: 120, freq: 9 }, { causa: 'Contaminación', min: 80, freq: 5 }] },
  { tipo: 'SETUP',     frecuencia: 22, duracion: 310, pctTiempo: 16.8, factorOEE: 'Disponibilidad', lineasAfectadas: ['Línea 2 — Inyección', 'Línea 6 — Mecanizado'],
    causas: [{ causa: 'Cambio de formato', min: 160, freq: 10 }, { causa: 'Cambio de herramienta', min: 110, freq: 8 }, { causa: 'Ajuste inicial', min: 40, freq: 4 }] },
  { tipo: 'MATERIAL',  frecuencia: 18, duracion: 220, pctTiempo: 12.0, factorOEE: 'Disponibilidad', lineasAfectadas: ['Línea 3 — Empaque', 'Línea 4 — Soldadura'],
    causas: [{ causa: 'Falta de material', min: 120, freq: 8 }, { causa: 'Material defectuoso', min: 60, freq: 6 }, { causa: 'Espera de insumos', min: 40, freq: 4 }] },
  { tipo: 'OPERATIVA', frecuencia: 17, duracion: 110, pctTiempo: 6.0,  factorOEE: 'Disponibilidad', lineasAfectadas: ['Línea 1 — Ensamble'],
    causas: [{ causa: 'Reunión de turno', min: 50, freq: 6 }, { causa: 'Limpieza programada', min: 40, freq: 7 }, { causa: 'Falta de operador', min: 20, freq: 4 }] },
]

const paradaColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']

const PARADAS_SEED: ParadaEvento[] = [
  { id: 1, linea: 'Línea 5 — Pintura', turno: 'Turno 2', equipo: 'EQ-009 — Cabina de Pintura A', tipo: 'MECÁNICA', causa: 'Obstrucción de boquilla', fechaInicio: '2026-07-07T15:20', duracion: 48, responsable: 'Mantenimiento', factor: 'Disponibilidad', observaciones: 'Se requirió limpieza profunda de boquillas.' },
  { id: 2, linea: 'Línea 3 — Empaque', turno: 'Turno 1', equipo: 'EQ-010 — Empacadora Automática', tipo: 'MICROPAROS', causa: 'Atasco de producto', fechaInicio: '2026-07-07T09:05', duracion: 12, responsable: 'Operador de Línea', factor: 'Rendimiento', observaciones: 'Microparos recurrentes por producto mal alineado.' },
]

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

const fmtNum = (n: number) => n.toLocaleString('es-CO')

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
        <path d={arcPath(toRad(startAngle), toRad(endAngle), r - 14, r)} fill="#E5E7EB" />
        <path d={arcPath(toRad(startAngle), toRad(valueAngle), r - 14, r)} fill={color} opacity={0.9} />
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 7) * Math.cos(toRad(valueAngle))}
          y2={cy + (r - 7) * Math.sin(toRad(valueAngle))}
          stroke="#1E293B" strokeWidth={2} strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#1E293B" fontSize={20} fontWeight={900}>
          {value}%
        </text>
      </svg>
      <Typography sx={{ color: '#64748B', fontSize: 12, fontWeight: 700, mt: -1 }}>{label}</Typography>
    </Box>
  )
}

// ─── Tab 0: OEE Global ────────────────────────────────────────────────────────
function OEEGlobalTab({ disponibilidad, rendimiento, calidad, oee, nLineas, contexto }: {
  disponibilidad: number; rendimiento: number; calidad: number; oee: number; nLineas: number; contexto: string
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}33`, borderRadius: 2 }}>
        <CardContent>
          <Typography sx={{ color: '#64748B', fontSize: 12, fontWeight: 600, mb: 1.5 }}>
            Agregado de {nLineas} línea{nLineas !== 1 ? 's' : ''} · {contexto}
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                <GaugeSVG value={disponibilidad} label="Disponibilidad" color="#3b82f6" />
                <GaugeSVG value={rendimiento} label="Rendimiento" color="#f59e0b" />
                <GaugeSVG value={calidad} label="Calidad" color="#22c55e" />
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography sx={{ color: '#64748B', fontSize: 13, fontWeight: 600, mb: 1 }}>OEE RESULTANTE</Typography>
                <Typography sx={{ color: oeeColor(oee), fontWeight: 900, fontSize: 72, lineHeight: 1 }}>
                  {oee}%
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 12, mt: 1 }}>Disponibilidad × Rendimiento × Calidad</Typography>
                <Typography sx={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                  {disponibilidad}% × {rendimiento}% × {calidad}%
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography sx={{ color: '#64748B', fontSize: 12, fontWeight: 600, mb: 1 }}>Composición OEE</Typography>
            {[
              { label: 'D', val: disponibilidad, color: '#3b82f6' },
              { label: 'R', val: rendimiento, color: '#f59e0b' },
              { label: 'C', val: calidad, color: '#22c55e' },
            ].map((b) => (
              <Box key={b.label} sx={{ height: 28, display: 'flex', borderRadius: 1, overflow: 'hidden', gap: '2px', mt: b.label === 'D' ? 0 : 1 }}>
                <Box sx={{ width: `${b.val}%`, bgcolor: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{b.label}: {b.val}%</Typography>
                </Box>
                <Box sx={{ width: `${100 - b.val}%`, bgcolor: '#E5E7EB' }} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {[
          {
            label: 'Clase Mundial', valor: '85%+', estado: oee >= 85, icono: <TrendingUp />,
            desc: oee >= 85 ? `Alcanzado — ${oee}%` : `No alcanzado — ${oee}%`,
            color: oee >= 85 ? '#22c55e' : '#ef4444',
          },
          {
            label: 'Meta Empresa', valor: '88%', estado: oee >= 88, icono: <Speed />,
            desc: oee >= 88 ? 'Superada' : `En progreso — faltan ${round1(88 - oee)} pp`,
            color: oee >= 88 ? '#22c55e' : '#f59e0b',
          },
          {
            label: 'Mes Anterior', valor: '85.1%', estado: oee >= 85.1, icono: oee >= 85.1 ? <TrendingUp /> : <TrendingDown />,
            desc: `${oee >= 85.1 ? '+' : ''}${round1(oee - 85.1)} pp vs mes anterior`,
            color: oee >= 85.1 ? '#22c55e' : '#ef4444',
          },
        ].map((b) => (
          <Grid size={{ xs: 12, md: 4 }} key={b.label}>
            <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${b.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '14px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ color: '#64748B', fontSize: 12, fontWeight: 600 }}>{b.label}</Typography>
                  <Box sx={{ color: b.color }}>{b.icono}</Box>
                </Box>
                <Typography sx={{ color: b.color, fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{b.valor}</Typography>
                <Typography sx={{ color: b.color, fontSize: 11, mt: 0.5, fontWeight: 600 }}>
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
function PorLineaTab({ lines, onSelect }: { lines: LineaOEE[]; onSelect: (l: LineaOEE) => void }) {
  const sorted = [...lines].sort((a, b) => b.oee - a.oee)
  const maxOEE = Math.max(100, ...sorted.map((l) => l.oee))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {lines.length === 0 && (
        <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2, p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#64748B' }}>No hay líneas para los filtros seleccionados.</Typography>
        </Card>
      )}
      {lines.length > 0 && (
        <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {['Línea', 'Disponib.', 'Rendim.', 'Calidad', 'OEE%', 'Prod. Real', 'Prod. Nominal', 'vs Ant.', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((row) => (
                <TableRow key={row.id} hover onClick={() => onSelect(row)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#334155', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{row.nombre}</TableCell>
                  <TableCell sx={{ color: '#3b82f6', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.disp}%</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.rend}%</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#E5E7EB' }}>{row.cal}%</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Typography sx={{ color: oeeColor(row.oee), fontWeight: 900, fontSize: 15 }}>{row.oee}%</Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{fmtNum(row.real)}</TableCell>
                  <TableCell sx={{ color: '#64748b', borderColor: '#E5E7EB' }}>{fmtNum(row.nominal)}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {row.vsAnterior >= 0
                        ? <TrendingUp sx={{ fontSize: 16, color: '#22c55e' }} />
                        : <TrendingDown sx={{ fontSize: 16, color: '#ef4444' }} />}
                      <Typography sx={{ color: row.vsAnterior >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 12 }}>
                        {row.vsAnterior >= 0 ? '+' : ''}{row.vsAnterior} pp
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><SemaforoOEE oee={row.oee} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {sorted.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>OEE por Línea (mayor a menor)</Typography>
          <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: `${(85 / maxOEE) * 100}%`, top: 0, bottom: 0, width: 1, bgcolor: '#22c55e', opacity: 0.6, borderLeft: '1px dashed #22c55e', zIndex: 1 }} />
              <Typography sx={{ position: 'absolute', left: `${(85 / maxOEE) * 100 + 0.5}%`, top: 0, color: '#22c55e', fontSize: 9, fontWeight: 700 }}>85%</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
                {sorted.map((l) => (
                  <Box key={l.id} onClick={() => onSelect(l)}
                    sx={{ cursor: 'pointer', borderRadius: 1, p: 0.5, '&:hover': { bgcolor: `${MES_COLOR}0A` } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography sx={{ color: '#334155', fontSize: 12, fontWeight: 600 }}>{l.nombre}</Typography>
                      <Typography sx={{ color: oeeColor(l.oee), fontWeight: 900, fontSize: 13 }}>{l.oee}%</Typography>
                    </Box>
                    <Box sx={{ height: 22, bgcolor: '#E5E7EB', borderRadius: 1, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${(l.oee / maxOEE) * 100}%`, bgcolor: oeeColor(l.oee), opacity: 0.85, borderRadius: 1, transition: 'width 0.4s ease' }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  )
}

// ─── Tab 2: Por Equipo ────────────────────────────────────────────────────────
function PorEquipoTab({ equipos, onSelect }: { equipos: EquipoOEE[]; onSelect: (e: EquipoOEE) => void }) {
  return (
    <Box>
      <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow>
              {['Código', 'Equipo', 'Disponib.', 'Rendim.', 'Calidad', 'OEE%', 'Hrs Op.', 'Paradas (min)', 'MTBF (hrs)', 'MTTR (min)'].map((h) => (
                <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {equipos.map((eq) => {
              const critico = eq.oee < 70
              return (
                <TableRow key={eq.codigo} onClick={() => onSelect(eq)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: critico ? 'rgba(220,38,38,0.08)' : 'transparent',
                    '&:hover': { bgcolor: critico ? 'rgba(220,38,38,0.14)' : `${MES_COLOR}10` },
                  }}>
                  <TableCell sx={{ color: '#0891B2', fontFamily: 'monospace', borderColor: '#E5E7EB', fontSize: 11 }}>{eq.codigo}</TableCell>
                  <TableCell sx={{ color: critico ? '#ef4444' : '#334155', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {critico && <WarningAmber sx={{ fontSize: 13, mr: 0.5, color: '#ef4444', verticalAlign: 'middle' }} />}
                    {eq.nombre}
                  </TableCell>
                  <TableCell sx={{ color: '#3b82f6', fontWeight: 700, borderColor: '#E5E7EB' }}>{eq.disp}%</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB' }}>{eq.rend}%</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700, borderColor: '#E5E7EB' }}>{eq.cal}%</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={eq.oee}
                        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: oeeColor(eq.oee) } }} />
                      <Typography sx={{ color: oeeColor(eq.oee), fontWeight: 900, fontSize: 13, minWidth: 40 }}>{eq.oee}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{eq.hrsOp}</TableCell>
                  <TableCell sx={{ color: eq.paradas > 300 ? '#ef4444' : '#f59e0b', fontWeight: 700, borderColor: '#E5E7EB' }}>{eq.paradas}</TableCell>
                  <TableCell sx={{ color: eq.mtbf >= 200 ? '#22c55e' : eq.mtbf >= 100 ? '#f59e0b' : '#ef4444', fontWeight: 700, borderColor: '#E5E7EB' }}>{eq.mtbf}</TableCell>
                  <TableCell sx={{ color: eq.mttr <= 30 ? '#22c55e' : eq.mttr <= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700, borderColor: '#E5E7EB' }}>{eq.mttr}</TableCell>
                </TableRow>
              )
            })}
            {equipos.length === 0 && (
              <TableRow><TableCell colSpan={10} sx={{ color: '#64748B', textAlign: 'center', py: 3, borderColor: '#E5E7EB' }}>Sin equipos para la línea seleccionada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        {[
          { c: '#22c55e', t: 'OEE ≥ 85% — Clase Mundial' },
          { c: '#f59e0b', t: 'OEE 70–85% — Aceptable' },
          { c: '#ef4444', t: 'OEE < 70% — Crítico (fondo rojo)' },
        ].map((l) => (
          <Box key={l.t} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: l.c }} />
            <Typography sx={{ color: '#64748B', fontSize: 12 }}>{l.t}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ─── Tab 3: Análisis Paradas ──────────────────────────────────────────────────
function AnalisisParadasTab({ registradas, onSelectTipo, onSelectEvento, onRegistrar }: {
  registradas: ParadaEvento[]
  onSelectTipo: (t: TipoParada) => void
  onSelectEvento: (e: ParadaEvento) => void
  onRegistrar: () => void
}) {
  const maxDur = Math.max(...tiposParada.map((t) => t.duracion))
  const minRegistrados = registradas.reduce((s, p) => s + p.duracion, 0)
  const totalParadas = 127 + registradas.length
  const totalMin = 1840 + minRegistrados

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onRegistrar}
          sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
          Registrar Parada
        </Button>
      </Box>

      <Grid container spacing={2}>
        {[
          { label: 'Total Paradas Mes', value: fmtNum(totalParadas), color: '#f97316' },
          { label: 'Tiempo Perdido', value: `${fmtNum(totalMin)} min`, color: '#ef4444', sub: `${round1(totalMin / 60)} horas` },
          { label: 'Mayor Causa', value: 'Mecánica', color: '#dc2626', sub: '44.6% del tiempo' },
          { label: '% Disp. Perdida', value: '8.8%', color: '#d97706', sub: 'vs turno teórico' },
        ].map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{k.value}</Typography>
                {k.sub && <Typography sx={{ color: '#64748b', fontSize: 10, mt: 0.2 }}>{k.sub}</Typography>}
                <Typography sx={{ color: '#64748B', fontSize: 11, mt: 0.3, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Paradas registradas (en vivo) */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>
          Paradas Registradas ({registradas.length})
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {['Inicio', 'Línea', 'Turno', 'Tipo', 'Causa', 'Duración', 'Factor OEE'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {registradas.map((p) => (
                <TableRow key={p.id} hover onClick={() => onSelectEvento(p)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{p.fechaInicio.replace('T', ' ')}</TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12, whiteSpace: 'nowrap' }}>{p.linea}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }}>{p.turno}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Chip label={p.tipo} size="small" sx={{ bgcolor: `${MES_COLOR}18`, color: MES_COLOR, fontWeight: 700, fontSize: 10 }} />
                  </TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{p.causa}</TableCell>
                  <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#E5E7EB' }}>{p.duracion} min</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Chip label={p.factor} size="small" sx={{ bgcolor: `${FACTOR_COLOR[p.factor]}18`, color: FACTOR_COLOR[p.factor], fontWeight: 700, fontSize: 10 }} />
                  </TableCell>
                </TableRow>
              ))}
              {registradas.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ color: '#64748B', textAlign: 'center', py: 3, borderColor: '#E5E7EB' }}>Aún no hay paradas registradas. Usa "Registrar Parada".</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Clasificación por tipo (clicable) */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Clasificación de Paradas por Tipo</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Tipo de Parada', 'Frecuencia', 'Duración Total (min)', '% Tiempo Total'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tiposParada.map((t, i) => (
                <TableRow key={t.tipo} hover onClick={() => onSelectTipo(t)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Chip label={t.tipo} size="small" sx={{ bgcolor: `${paradaColors[i]}22`, color: paradaColors[i], fontWeight: 700, fontSize: 11, border: `1px solid ${paradaColors[i]}44` }} />
                  </TableCell>
                  <TableCell sx={{ color: paradaColors[i], fontWeight: 900, fontSize: 15, borderColor: '#E5E7EB' }}>{t.frecuencia}</TableCell>
                  <TableCell sx={{ color: '#334155', fontWeight: 700, borderColor: '#E5E7EB' }}>{t.duracion} min</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={t.pctTiempo}
                        sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: paradaColors[i] } }} />
                      <Typography sx={{ color: paradaColors[i], fontWeight: 900, minWidth: 40, fontSize: 13 }}>{t.pctTiempo}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Pareto de Paradas — Duración Total</Typography>
        <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {tiposParada.map((t, i) => (
              <Box key={t.tipo} onClick={() => onSelectTipo(t)}
                sx={{ cursor: 'pointer', borderRadius: 1, p: 0.5, '&:hover': { bgcolor: `${MES_COLOR}0A` } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: paradaColors[i] }} />
                    <Typography sx={{ color: '#334155', fontSize: 13, fontWeight: 600 }}>{t.tipo}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ color: paradaColors[i], fontWeight: 900, fontSize: 13 }}>{t.duracion} min</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: 12, minWidth: 40 }}>{t.pctTiempo}%</Typography>
                    <Typography sx={{ color: '#475569', fontSize: 11 }}>{t.frecuencia} ocur.</Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 24, bgcolor: '#E5E7EB', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                  <Box sx={{ height: '100%', width: `${(t.duracion / maxDur) * 100}%`, bgcolor: paradaColors[i], opacity: 0.85, borderRadius: 1, transition: 'width 0.4s ease' }} />
                </Box>
              </Box>
            ))}
          </Box>
          <Divider sx={{ bgcolor: '#E5E7EB', my: 2 }} />
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>Total tiempo perdido</Typography>
              <Typography sx={{ color: '#ef4444', fontWeight: 900, fontSize: 18 }}>{fmtNum(totalMin)} min</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>Total paradas</Typography>
              <Typography sx={{ color: '#f97316', fontWeight: 900, fontSize: 18 }}>{fmtNum(totalParadas)} eventos</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>Promedio por evento</Typography>
              <Typography sx={{ color: '#f59e0b', fontWeight: 900, fontSize: 18 }}>{round1(totalMin / totalParadas)} min</Typography>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

// ─── Reusable UI bits for dialogs ───────────────────────────────────────────────
function InfoTile({ label, value, color = '#1E293B' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
      <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color }}>{value}</Typography>
    </Box>
  )
}

function FactorCard({ title, value, color, icon, children }: {
  title: string; value: number; color: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${color}44`, borderRadius: 2, flex: 1, minWidth: 220 }}>
      <CardContent sx={{ p: '14px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color }}>
            {icon}
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{title}</Typography>
          </Box>
          <Typography sx={{ color, fontWeight: 900, fontSize: 22 }}>{value}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={value}
          sx={{ height: 6, borderRadius: 3, bgcolor: '#E5E7EB', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MESOEE() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  // Selectores globales
  const [filterLinea, setFilterLinea] = useState('Todas')
  const [filterTurno, setFilterTurno] = useState('Todos')
  const [fecha, setFecha] = useState('2026-07-07')

  // Dialogs
  const [lineaSel, setLineaSel] = useState<LineaOEE | null>(null)
  const [equipoSel, setEquipoSel] = useState<EquipoOEE | null>(null)
  const [tipoSel, setTipoSel] = useState<TipoParada | null>(null)
  const [eventoSel, setEventoSel] = useState<ParadaEvento | null>(null)

  // Paradas registradas
  const [registradas, setRegistradas] = useState<ParadaEvento[]>(PARADAS_SEED)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  // Formulario Registrar Parada
  const EMPTY_PARADA = { linea: '', turno: '', equipo: '', tipo: '', causa: '', fechaInicio: '', duracion: '', responsable: '', factor: '', observaciones: '' }
  const [regOpen, setRegOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_PARADA })
  const [triedSubmit, setTriedSubmit] = useState(false)

  const openRegistrar = () => { setForm({ ...EMPTY_PARADA, linea: filterLinea !== 'Todas' ? filterLinea : '', turno: filterTurno !== 'Todos' ? filterTurno : '' }); setTriedSubmit(false); setRegOpen(true) }
  const setField = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }))
  const setTipoParada = (tipo: string) => setForm((p) => ({ ...p, tipo, causa: '', factor: FACTOR_POR_TIPO[tipo] ?? '' }))

  const equiposPorLinea = useMemo(
    () => (form.linea ? equiposOEE.filter((e) => e.linea === form.linea) : equiposOEE),
    [form.linea],
  )
  const causasDisponibles = form.tipo ? (CAUSAS_POR_TIPO[form.tipo] ?? []) : []

  const formValido = !!form.linea && !!form.turno && !!form.tipo && !!form.fechaInicio && !!form.duracion && Number(form.duracion) > 0

  const guardarParada = () => {
    if (!formValido) {
      setTriedSubmit(true)
      notify('Complete los campos obligatorios: línea, turno, tipo, fecha/hora y duración', 'warning')
      return
    }
    const nuevo: ParadaEvento = {
      id: (registradas[0]?.id ?? 0) + registradas.length + 1,
      linea: form.linea, turno: form.turno, equipo: form.equipo || 'Sin especificar',
      tipo: form.tipo, causa: form.causa || 'Sin especificar', fechaInicio: form.fechaInicio,
      duracion: Number(form.duracion), responsable: form.responsable || 'Sin asignar',
      factor: form.factor || FACTOR_POR_TIPO[form.tipo] || 'Disponibilidad',
      observaciones: form.observaciones,
    }
    setRegistradas((prev) => [nuevo, ...prev])
    setRegOpen(false)
    notify(`Parada registrada en ${nuevo.linea} (${nuevo.duracion} min)`, 'success')
  }

  // Aplicar filtros de turno + línea a los datos de línea
  const applyTurno = (l: LineaOEE): LineaOEE => {
    if (filterTurno === 'Todos') return l
    const t = l.turnos.find((x) => x.turno === filterTurno)
    return t ? { ...l, disp: t.disp, rend: t.rend, cal: t.cal, oee: t.oee, real: t.real, nominal: t.nominal } : l
  }
  const displayLines = lineasOEE
    .filter((l) => filterLinea === 'Todas' || l.nombre === filterLinea)
    .map(applyTurno)

  const displayEquipos = equiposOEE.filter((e) => filterLinea === 'Todas' || e.linea === filterLinea)

  const displayRegistradas = registradas.filter((p) => filterLinea === 'Todas' || p.linea === filterLinea)

  // Agregado ponderado por producción nominal
  const totNom = displayLines.reduce((s, l) => s + l.nominal, 0) || 1
  const aggDisp = round1(displayLines.reduce((s, l) => s + l.disp * l.nominal, 0) / totNom)
  const aggRend = round1(displayLines.reduce((s, l) => s + l.rend * l.nominal, 0) / totNom)
  const aggCal  = round1(displayLines.reduce((s, l) => s + l.cal * l.nominal, 0) / totNom)
  const aggOEE  = round1((aggDisp * aggRend * aggCal) / 10000)

  const turnoLabel = filterTurno === 'Todos' ? 'Todos los turnos' : (TURNOS.find((t) => t.short === filterTurno)?.label ?? filterTurno)
  const contexto = `${filterLinea === 'Todas' ? 'Todas las líneas' : filterLinea} · ${turnoLabel} · ${fecha}`

  const tabLabels = ['OEE Global', 'Por Línea', 'Por Equipo', 'Análisis Paradas']
  const tabIcons = [<Speed />, <FactoryOutlined />, <PrecisionManufacturing />, <PauseCircle />]

  const selInputSx = {
    minWidth: 170,
    '& .MuiOutlinedInput-root': { color: '#1E293B', bgcolor: '#FFFFFF' },
    '& label': { color: '#64748B' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: `${MES_COLOR}44` },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: MES_COLOR },
    '& .MuiSvgIcon-root': { color: '#64748B' },
  }
  const dlgInputSx = {
    '& .MuiOutlinedInput-root': { color: '#1E293B' },
    '& label': { color: '#64748B' },
    '& fieldset': { borderColor: '#E5E7EB' },
    '& .MuiOutlinedInput-root:hover fieldset': { borderColor: '#CBD5E1' },
    '& .MuiSvgIcon-root': { color: '#64748B' },
  }

  return (
    <>
      <Layout>
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              bgcolor: `${MES_COLOR}22`, border: `1px solid ${MES_COLOR}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: MES_COLOR,
            }}>
              <Speed fontSize="medium" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 260 }}>
              <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 800, lineHeight: 1 }}>
                MES — OEE (Overall Equipment Effectiveness)
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
                ICOLTRANS · Disponibilidad · Rendimiento · Calidad · Análisis de Paradas
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openRegistrar}
                sx={{ borderColor: `${MES_COLOR}66`, color: MES_COLOR, '&:hover': { borderColor: MES_COLOR, bgcolor: `${MES_COLOR}0A` }, borderRadius: '10px', fontWeight: 700 }}>
                Registrar Parada
              </Button>
              <Button variant="contained" startIcon={<FileDownloadIcon />}
                onClick={() => notify(`Reporte OEE exportado — ${contexto}`, 'success')}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
                Exportar
              </Button>
            </Stack>
          </Box>

          {/* Selectores línea / turno / fecha */}
          <Paper elevation={0} sx={{ border: `1px solid ${MES_COLOR}22`, borderRadius: '12px', p: 1.5, mb: 3, bgcolor: '#FFFFFF' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField select size="small" label="Línea" value={filterLinea}
                onChange={(e) => setFilterLinea(e.target.value)} sx={selInputSx}>
                <MenuItem value="Todas">Todas las líneas</MenuItem>
                {lineasOEE.map((l) => <MenuItem key={l.id} value={l.nombre}>{l.nombre}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Turno" value={filterTurno}
                onChange={(e) => setFilterTurno(e.target.value)} sx={selInputSx}>
                <MenuItem value="Todos">Todos los turnos</MenuItem>
                {TURNOS.map((t) => <MenuItem key={t.short} value={t.short}>{t.label}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Fecha" type="date" value={fecha}
                onChange={(e) => setFecha(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...selInputSx, minWidth: 160 }} />
              <Box sx={{ flex: 1 }} />
              <Chip label={contexto} sx={{ bgcolor: `${MES_COLOR}12`, color: MES_COLOR, fontWeight: 700, fontSize: 12 }} />
            </Stack>
          </Paper>

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

          <Divider sx={{ bgcolor: '#E5E7EB', mb: 1 }} />

          <TabPanel value={tab} index={0}>
            <OEEGlobalTab disponibilidad={aggDisp} rendimiento={aggRend} calidad={aggCal} oee={aggOEE} nLineas={displayLines.length} contexto={contexto} />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <PorLineaTab lines={displayLines} onSelect={setLineaSel} />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <PorEquipoTab equipos={displayEquipos} onSelect={setEquipoSel} />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <AnalisisParadasTab registradas={displayRegistradas} onSelectTipo={setTipoSel} onSelectEvento={setEventoSel} onRegistrar={openRegistrar} />
          </TabPanel>
        </Box>
      </Layout>

      {/* ── Dialog: Drill-down de Línea ── */}
      <Dialog open={!!lineaSel} onClose={() => setLineaSel(null)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}44`, borderRadius: '16px' } }}>
        {lineaSel && (() => {
          const l = lineaSel
          const parosMin = l.paros.reduce((s, p) => s + p.min, 0)
          const tiempoOper = l.tiempoPlan - l.paradasProg - parosMin
          const velReal = Math.round((l.velNominal * l.rend) / 100)
          const defTotal = l.defectos.rechazos + l.defectos.retrabajos + l.defectos.scrap
          const maxHist = Math.max(100, ...l.historial.map((h) => h.oee))
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${MES_COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FactoryOutlined sx={{ fontSize: 18, color: MES_COLOR }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>{l.id} · {l.nombre}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>{l.proceso} · Supervisor: {l.supervisor} · {turnoLabel}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setLineaSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                <Stack spacing={2} mt={1}>
                  {/* OEE headline */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F8FAFC', borderRadius: '10px', p: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                      <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>OEE</Typography>
                      <Typography sx={{ color: oeeColor(l.oee), fontWeight: 900, fontSize: 44, lineHeight: 1 }}>{l.oee}%</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: '#E5E7EB' }} />
                    <Typography sx={{ fontFamily: 'monospace', color: '#475569', fontSize: 14 }}>
                      {l.disp}% × {l.rend}% × {l.cal}% = {l.oee}%
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {l.vsAnterior >= 0 ? <TrendingUp sx={{ color: '#22c55e' }} /> : <TrendingDown sx={{ color: '#ef4444' }} />}
                      <Typography sx={{ color: l.vsAnterior >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{l.vsAnterior >= 0 ? '+' : ''}{l.vsAnterior} pp</Typography>
                    </Box>
                  </Box>

                  {/* Factores + pérdidas */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <FactorCard title="Disponibilidad" value={l.disp} color="#3b82f6" icon={<AccessTime sx={{ fontSize: 18 }} />}>
                      <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Tiempo planificado</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{l.tiempoPlan} min</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Paradas programadas</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>-{l.paradasProg} min</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Paros no programados</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>-{parosMin} min</Typography></Box>
                        <Divider sx={{ bgcolor: '#E5E7EB', my: 0.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>Tiempo operativo</Typography><Typography sx={{ fontSize: 11, fontWeight: 800, color: '#3b82f6' }}>{tiempoOper} min</Typography></Box>
                      </Stack>
                    </FactorCard>
                    <FactorCard title="Rendimiento" value={l.rend} color="#f59e0b" icon={<Bolt sx={{ fontSize: 18 }} />}>
                      <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Velocidad nominal</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{l.velNominal} u/h</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Velocidad real</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{velReal} u/h</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Microparos</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{l.microparos.min} min / {l.microparos.eventos} ev.</Typography></Box>
                        <Divider sx={{ bgcolor: '#E5E7EB', my: 0.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>Pérdida velocidad</Typography><Typography sx={{ fontSize: 11, fontWeight: 800, color: '#f59e0b' }}>{round1(100 - l.rend)}%</Typography></Box>
                      </Stack>
                    </FactorCard>
                    <FactorCard title="Calidad" value={l.cal} color="#22c55e" icon={<CheckCircleOutline sx={{ fontSize: 18 }} />}>
                      <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Piezas buenas</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>{fmtNum(l.real)}</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Rechazos</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{l.defectos.rechazos}</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Retrabajos</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{l.defectos.retrabajos}</Typography></Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#64748B' }}>Scrap</Typography><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{l.defectos.scrap}</Typography></Box>
                        <Divider sx={{ bgcolor: '#E5E7EB', my: 0.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>Total defectos</Typography><Typography sx={{ fontSize: 11, fontWeight: 800, color: '#ef4444' }}>{defTotal}</Typography></Box>
                      </Stack>
                    </FactorCard>
                  </Stack>

                  {/* Paros no programados (composición disponibilidad) */}
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>Paros no programados — composición de la disponibilidad</Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                      <Table size="small">
                        <TableHead><TableRow>{['Causa', 'Duración (min)', 'Frecuencia', '% de paros'].map((h) => (
                          <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                        ))}</TableRow></TableHead>
                        <TableBody>
                          {l.paros.map((p) => (
                            <TableRow key={p.causa}>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{p.causa}</TableCell>
                              <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#E5E7EB' }}>{p.min}</TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB' }}>{p.freq}</TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{parosMin ? round1((p.min / parosMin) * 100) : 0}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Turnos + Historial */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>OEE por turno</Typography>
                      <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                        <Table size="small">
                          <TableHead><TableRow>{['Turno', 'D', 'R', 'C', 'OEE'].map((h) => (
                            <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                          ))}</TableRow></TableHead>
                          <TableBody>
                            {l.turnos.map((t) => (
                              <TableRow key={t.turno} sx={{ bgcolor: t.turno === filterTurno ? `${MES_COLOR}0F` : 'transparent' }}>
                                <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{t.turno}</TableCell>
                                <TableCell sx={{ color: '#3b82f6', borderColor: '#E5E7EB', fontWeight: 700 }}>{t.disp}%</TableCell>
                                <TableCell sx={{ color: '#f59e0b', borderColor: '#E5E7EB', fontWeight: 700 }}>{t.rend}%</TableCell>
                                <TableCell sx={{ color: '#22c55e', borderColor: '#E5E7EB', fontWeight: 700 }}>{t.cal}%</TableCell>
                                <TableCell sx={{ color: oeeColor(t.oee), borderColor: '#E5E7EB', fontWeight: 900 }}>{t.oee}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>Tendencia OEE (6 meses)</Typography>
                      <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2, p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120 }}>
                          {l.historial.map((h) => (
                            <Box key={h.periodo} sx={{ flex: 1, textAlign: 'center' }}>
                              <Box sx={{ height: `${(h.oee / maxHist) * 90}px`, bgcolor: oeeColor(h.oee), opacity: 0.85, borderRadius: '4px 4px 0 0' }} />
                              <Typography sx={{ fontSize: 9, color: '#334155', fontWeight: 700, mt: 0.3 }}>{h.oee}%</Typography>
                              <Typography sx={{ fontSize: 9, color: '#94A3B8' }}>{h.periodo}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Card>
                    </Box>
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => { setLineaSel(null); openRegistrar() }} startIcon={<AddIcon />} sx={{ color: MES_COLOR }}>Registrar parada</Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => setLineaSel(null)} sx={{ color: '#64748B' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de Equipo ── */}
      <Dialog open={!!equipoSel} onClose={() => setEquipoSel(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}44`, borderRadius: '16px' } }}>
        {equipoSel && (() => {
          const eq = equipoSel
          const parosMin = eq.paros.reduce((s, p) => s + p.min, 0)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${MES_COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PrecisionManufacturing sx={{ fontSize: 18, color: MES_COLOR }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>{eq.codigo} · {eq.nombre}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>{eq.linea} · {eq.fabricante} ({eq.anio})</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setEquipoSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                <Stack spacing={2} mt={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F8FAFC', borderRadius: '10px', p: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ textAlign: 'center', minWidth: 110 }}>
                      <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>OEE</Typography>
                      <Typography sx={{ color: oeeColor(eq.oee), fontWeight: 900, fontSize: 40, lineHeight: 1 }}>{eq.oee}%</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: '#E5E7EB' }} />
                    <Chip label={`Criticidad ${eq.criticidad}`} sx={{ bgcolor: eq.criticidad === 'Alta' ? '#ef444418' : eq.criticidad === 'Media' ? '#f59e0b18' : '#22c55e18', color: eq.criticidad === 'Alta' ? '#ef4444' : eq.criticidad === 'Media' ? '#f59e0b' : '#22c55e', fontWeight: 700 }} />
                    <Typography sx={{ fontFamily: 'monospace', color: '#475569', fontSize: 13 }}>{eq.disp}% × {eq.rend}% × {eq.cal}%</Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="Disponibilidad" value={`${eq.disp}%`} color="#3b82f6" />
                    <InfoTile label="Rendimiento" value={`${eq.rend}%`} color="#f59e0b" />
                    <InfoTile label="Calidad" value={`${eq.cal}%`} color="#22c55e" />
                    <InfoTile label="Horas Op." value={`${eq.hrsOp} h`} />
                    <InfoTile label="Paradas" value={`${eq.paradas} min`} color={eq.paradas > 300 ? '#ef4444' : '#f59e0b'} />
                    <InfoTile label="MTBF" value={`${eq.mtbf} h`} color={eq.mtbf >= 200 ? '#22c55e' : eq.mtbf >= 100 ? '#f59e0b' : '#ef4444'} />
                    <InfoTile label="MTTR" value={`${eq.mttr} min`} color={eq.mttr <= 30 ? '#22c55e' : eq.mttr <= 60 ? '#f59e0b' : '#ef4444'} />
                    <InfoTile label="Línea" value={eq.linea.split('—')[0].trim()} />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>Principales paros del equipo</Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                      <Table size="small">
                        <TableHead><TableRow>{['Causa', 'Duración (min)', 'Frecuencia', '% del total'].map((h) => (
                          <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                        ))}</TableRow></TableHead>
                        <TableBody>
                          {eq.paros.map((p) => (
                            <TableRow key={p.causa}>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{p.causa}</TableCell>
                              <TableCell sx={{ color: '#ef4444', fontWeight: 700, borderColor: '#E5E7EB' }}>{p.min}</TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB' }}>{p.freq}</TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{parosMin ? round1((p.min / parosMin) * 100) : 0}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => navigate('/eam/ordenes-trabajo')} startIcon={<BuildCircle />} sx={{ color: MES_COLOR }}>Generar OT de mantenimiento</Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => setEquipoSel(null)} sx={{ color: '#64748B' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de Tipo de Parada ── */}
      <Dialog open={!!tipoSel} onClose={() => setTipoSel(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}44`, borderRadius: '16px' } }}>
        {tipoSel && (() => {
          const t = tipoSel
          const maxCausa = Math.max(...t.causas.map((c) => c.min))
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${MES_COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PauseCircle sx={{ fontSize: 18, color: MES_COLOR }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>Parada · {t.tipo}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>Afecta a: {t.factorOEE}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setTipoSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                <Stack spacing={2} mt={1}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                    <InfoTile label="Frecuencia" value={t.frecuencia} color="#f97316" />
                    <InfoTile label="Duración total" value={`${t.duracion} min`} color="#ef4444" />
                    <InfoTile label="% del tiempo" value={`${t.pctTiempo}%`} color="#f59e0b" />
                  </Box>
                  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5 }}>
                    <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', mb: 0.5 }}>Factor OEE impactado</Typography>
                    <Chip label={t.factorOEE} size="small" icon={<Insights sx={{ fontSize: 14 }} />}
                      sx={{ bgcolor: `${FACTOR_COLOR[t.factorOEE]}18`, color: FACTOR_COLOR[t.factorOEE], fontWeight: 700, '& .MuiChip-icon': { color: FACTOR_COLOR[t.factorOEE] } }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>Causas principales</Typography>
                    <Stack spacing={1}>
                      {t.causas.map((c) => (
                        <Box key={c.causa}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                            <Typography sx={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{c.causa}</Typography>
                            <Typography sx={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{c.min} min · {c.freq} ocur.</Typography>
                          </Box>
                          <Box sx={{ height: 18, bgcolor: '#E5E7EB', borderRadius: 1, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${(c.min / maxCausa) * 100}%`, bgcolor: MES_COLOR, opacity: 0.8, borderRadius: 1 }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>Líneas afectadas</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {t.lineasAfectadas.map((ln) => (
                        <Chip key={ln} label={ln} size="small" sx={{ bgcolor: `${MES_COLOR}12`, color: '#334155', fontWeight: 600, fontSize: 11 }} />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => { setTipoSel(null); setForm({ ...EMPTY_PARADA, tipo: t.tipo, factor: t.factorOEE }); setTriedSubmit(false); setRegOpen(true) }} startIcon={<AddIcon />} sx={{ color: MES_COLOR }}>Registrar esta parada</Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => setTipoSel(null)} sx={{ color: '#64748B' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de Evento de Parada registrado ── */}
      <Dialog open={!!eventoSel} onClose={() => setEventoSel(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}44`, borderRadius: '16px' } }}>
        {eventoSel && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${MES_COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PauseCircle sx={{ fontSize: 18, color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>Parada registrada #{eventoSel.id}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>{eventoSel.linea} · {eventoSel.turno}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setEventoSel(null)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Stack spacing={1.5} mt={1}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoTile label="Tipo" value={eventoSel.tipo} color={MES_COLOR} />
                  <InfoTile label="Causa" value={eventoSel.causa} />
                  <InfoTile label="Inicio" value={eventoSel.fechaInicio.replace('T', ' ')} />
                  <InfoTile label="Duración" value={`${eventoSel.duracion} min`} color="#ef4444" />
                  <InfoTile label="Equipo" value={eventoSel.equipo} />
                  <InfoTile label="Responsable" value={eventoSel.responsable} />
                  <InfoTile label="Factor OEE" value={eventoSel.factor} color={FACTOR_COLOR[eventoSel.factor] ?? '#1E293B'} />
                  <InfoTile label="Turno" value={eventoSel.turno} />
                </Box>
                {eventoSel.observaciones && (
                  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5 }}>
                    <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', mb: 0.5 }}>Observaciones</Typography>
                    <Typography sx={{ fontSize: 13, color: '#334155' }}>{eventoSel.observaciones}</Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => { const id = eventoSel.id; setRegistradas((prev) => prev.filter((p) => p.id !== id)); setEventoSel(null); notify('Parada eliminada', 'info') }} sx={{ color: '#ef4444' }}>Eliminar</Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setEventoSel(null)} sx={{ color: '#64748B' }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: Registrar Parada (formulario) ── */}
      <Dialog open={regOpen} onClose={() => setRegOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${MES_COLOR}44`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${MES_COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ fontSize: 18, color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>Registrar Parada</Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>Evento de tiempo perdido — afecta el OEE</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setRegOpen(false)} sx={{ color: '#94A3B8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Stack spacing={2} mt={1}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField select fullWidth size="small" label="Línea *" value={form.linea}
                onChange={(e) => setForm((p) => ({ ...p, linea: e.target.value, equipo: '' }))}
                error={triedSubmit && !form.linea}
                helperText={triedSubmit && !form.linea ? 'Seleccione la línea' : ' '} sx={dlgInputSx}>
                {lineasOEE.map((l) => <MenuItem key={l.id} value={l.nombre}>{l.nombre}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Turno *" value={form.turno}
                onChange={(e) => setField('turno', e.target.value)}
                error={triedSubmit && !form.turno}
                helperText={triedSubmit && !form.turno ? 'Seleccione el turno' : ' '} sx={dlgInputSx}>
                {TURNOS.map((t) => <MenuItem key={t.short} value={t.short}>{t.label}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Equipo" value={form.equipo}
                onChange={(e) => setField('equipo', e.target.value)} helperText="Opcional — se filtra por línea" sx={dlgInputSx}>
                <MenuItem value=""><em>Sin especificar</em></MenuItem>
                {equiposPorLinea.map((eq) => <MenuItem key={eq.codigo} value={`${eq.codigo} — ${eq.nombre}`}>{eq.codigo} — {eq.nombre}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Tipo de parada *" value={form.tipo}
                onChange={(e) => setTipoParada(e.target.value)}
                error={triedSubmit && !form.tipo}
                helperText={triedSubmit && !form.tipo ? 'Seleccione el tipo' : 'Autocompleta el factor OEE'} sx={dlgInputSx}>
                {TIPOS_PARADA_NOMBRES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Causa" value={form.causa}
                onChange={(e) => setField('causa', e.target.value)} disabled={!form.tipo}
                helperText={form.tipo ? 'Según el tipo' : 'Elija primero el tipo'} sx={dlgInputSx}>
                <MenuItem value=""><em>Sin especificar</em></MenuItem>
                {causasDisponibles.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Factor OEE afectado" value={form.factor}
                InputProps={{ readOnly: true }}
                helperText="Derivado del tipo"
                sx={{ ...dlgInputSx, '& .MuiOutlinedInput-root': { color: '#64748B', bgcolor: '#F8FAFC' } }} />
              <TextField fullWidth size="small" label="Fecha y hora de inicio *" type="datetime-local" value={form.fechaInicio}
                onChange={(e) => setField('fechaInicio', e.target.value)} InputLabelProps={{ shrink: true }}
                error={triedSubmit && !form.fechaInicio}
                helperText={triedSubmit && !form.fechaInicio ? 'Indique la fecha/hora' : ' '} sx={dlgInputSx} />
              <TextField fullWidth size="small" label="Duración *" type="number" value={form.duracion}
                onChange={(e) => setField('duracion', e.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="#94A3B8">min</Typography></InputAdornment> }}
                error={triedSubmit && (!form.duracion || Number(form.duracion) <= 0)}
                helperText={triedSubmit && (!form.duracion || Number(form.duracion) <= 0) ? 'Duración mayor a 0' : ' '} sx={dlgInputSx} />
              <TextField select fullWidth size="small" label="Responsable" value={form.responsable}
                onChange={(e) => setField('responsable', e.target.value)} helperText="Opcional" sx={dlgInputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {RESPONSABLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Box>
            <TextField fullWidth size="small" label="Observaciones" multiline minRows={2} value={form.observaciones}
              onChange={(e) => setField('observaciones', e.target.value)}
              placeholder="Detalle de la parada, acciones tomadas..." sx={dlgInputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRegOpen(false)} sx={{ color: '#64748B' }}>Cancelar</Button>
          <Button variant="contained" onClick={guardarParada} disabled={!formValido} startIcon={<AddIcon />}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: alpha(MES_COLOR, 0.35), color: '#fff' }, fontWeight: 700, borderRadius: '8px', px: 3 }}>
            Registrar parada
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  )
}
