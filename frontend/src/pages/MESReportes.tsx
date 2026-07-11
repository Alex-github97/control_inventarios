import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Stack, alpha, Divider, Button, TextField, MenuItem,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Snackbar, Alert, Avatar, LinearProgress,
} from '@mui/material'
import {
  BarChart as ReportIcon,
  Factory as ProdIcon,
  VerifiedUser as QualityIcon,
  TrendingUp as TrendIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  Warning as WarnIcon,
  CheckCircle as OkIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Schedule as ScheduleIcon,
  EventRepeat as FreqIcon,
  Description as DocIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Person as PersonIcon,
  PrecisionManufacturing as MachineIcon,
  Timeline as TimelineIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

// ── Paleta tema claro ──────────────────────────────────────────────────────
const TXT = '#1E293B'
const TXT2 = '#64748B'
const MUTED = '#94A3B8'
const BORDER = '#E5E7EB'
const PANEL = '#F8FAFC'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtN = (n: number) => new Intl.NumberFormat('es-CO').format(n)

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Paro { motivo: string; minutos: number }

interface OrdenProduccion {
  op: string
  producto: string
  plan: number
  real: number
  pct: number
  scrap: number
  estado: 'COMPLETADO' | 'EN_PROCESO' | 'RETRASADO' | 'PENDIENTE'
  linea: string
  turno: string
  maquina: string
  responsable: string
  inicio: string
  fin: string
  oee: number
  retrabajos: number
  paros: Paro[]
}

interface LineaCalidad {
  linea: string
  fpy: number
  scrap: number
  defectos: number
  inspecciones: number
  rechazos: number
  responsable: string
  turnoCritico: string
  costoScrap: number
  detalle: { tipo: string; cantidad: number }[]
}

interface ProductoTop {
  producto: string
  unidades: number
  pctTotal: number
  oee: number
  costoUnitario: number
  linea: string
  familia: string
  margen: number
  tendencia: number[]
}

interface CostoMes {
  mes: string
  costo: number
}

interface OEETrend {
  semana: string
  oee: number
}

interface DefectoPareto {
  tipo: string
  cantidad: number
  pctAcum: number
}

interface ProductoCosto {
  producto: string
  mp: number
  mod: number
  cif: number
  total: number
  margen: number
  linea: string
  unidadesMes: number
  precioVenta: number
}

// ── Nombres de línea (fuente única) ──────────────────────────────────────────
const L1 = 'Línea 1 — Mecanizado CNC'
const L2 = 'Línea 2 — Fundición'
const L3 = 'Línea 3 — Ensamble A'
const L4 = 'Línea 4 — Ensamble B'
const L5 = 'Línea 5 — Pintura/Acabado'
const L6 = 'Línea 6 — Empaque Final'

// ── Mock Data ────────────────────────────────────────────────────────────────
const ORDENES: OrdenProduccion[] = [
  { op: 'OP-2026-0841', producto: 'Válvula Industrial DN50', plan: 1200, real: 1185, pct: 98.8, scrap: 15, estado: 'COMPLETADO', linea: L1, turno: 'Turno A', maquina: 'CNC-04', responsable: 'Andrés Peña', inicio: '06:00', fin: '13:40', oee: 90.1, retrabajos: 6, paros: [{ motivo: 'Cambio de herramienta', minutos: 18 }, { motivo: 'Micro-paro alimentación', minutos: 7 }] },
  { op: 'OP-2026-0842', producto: 'Carcasa Bomba Centrífuga', plan: 800, real: 764, pct: 95.5, scrap: 22, estado: 'EN_PROCESO', linea: L2, turno: 'Turno A', maquina: 'FUN-02', responsable: 'María Gil', inicio: '06:00', fin: '—', oee: 83.4, retrabajos: 11, paros: [{ motivo: 'Espera de molde', minutos: 34 }, { motivo: 'Ajuste temperatura horno', minutos: 22 }] },
  { op: 'OP-2026-0843', producto: 'Eje Transmisión 25mm', plan: 1500, real: 1089, pct: 72.6, scrap: 41, estado: 'RETRASADO', linea: L1, turno: 'Turno B', maquina: 'CNC-07', responsable: 'Andrés Peña', inicio: '14:00', fin: '—', oee: 68.2, retrabajos: 19, paros: [{ motivo: 'Falla husillo', minutos: 96 }, { motivo: 'Material fuera de spec', minutos: 40 }] },
  { op: 'OP-2026-0844', producto: 'Brida Acero Inox 316', plan: 600, real: 598, pct: 99.7, scrap: 2, estado: 'COMPLETADO', linea: L1, turno: 'Turno A', maquina: 'CNC-04', responsable: 'Andrés Peña', inicio: '06:00', fin: '10:15', oee: 94.6, retrabajos: 1, paros: [{ motivo: 'Cambio de herramienta', minutos: 12 }] },
  { op: 'OP-2026-0845', producto: 'Impeller Fundición Gris', plan: 400, real: 388, pct: 97.0, scrap: 9, estado: 'EN_PROCESO', linea: L2, turno: 'Turno A', maquina: 'FUN-01', responsable: 'María Gil', inicio: '06:00', fin: '—', oee: 85.0, retrabajos: 4, paros: [{ motivo: 'Ajuste temperatura horno', minutos: 20 }] },
  { op: 'OP-2026-0846', producto: 'Tapa Cierre Hermético', plan: 2200, real: 2156, pct: 98.0, scrap: 33, estado: 'COMPLETADO', linea: L3, turno: 'Turno A', maquina: 'ENS-A2', responsable: 'Julián Mora', inicio: '06:00', fin: '14:00', oee: 88.7, retrabajos: 14, paros: [{ motivo: 'Falta de componente', minutos: 25 }] },
  { op: 'OP-2026-0847', producto: 'Soporte Estructura L40', plan: 950, real: 712, pct: 74.9, scrap: 18, estado: 'RETRASADO', linea: L4, turno: 'Turno B', maquina: 'ENS-B1', responsable: 'Daniela Ruiz', inicio: '14:00', fin: '—', oee: 71.3, retrabajos: 9, paros: [{ motivo: 'Ausentismo operario', minutos: 80 }, { motivo: 'Falta de componente', minutos: 45 }] },
  { op: 'OP-2026-0848', producto: 'Anillo Sellado PTFE', plan: 3000, real: 3000, pct: 100.0, scrap: 0, estado: 'COMPLETADO', linea: L3, turno: 'Turno A', maquina: 'ENS-A1', responsable: 'Julián Mora', inicio: '06:00', fin: '13:20', oee: 96.4, retrabajos: 0, paros: [] },
  { op: 'OP-2026-0849', producto: 'Buje Bronce SAE-660', plan: 750, real: 528, pct: 70.4, scrap: 29, estado: 'RETRASADO', linea: L2, turno: 'Turno B', maquina: 'FUN-02', responsable: 'María Gil', inicio: '14:00', fin: '—', oee: 66.8, retrabajos: 15, paros: [{ motivo: 'Porosidad recurrente', minutos: 70 }, { motivo: 'Ajuste temperatura horno', minutos: 38 }] },
  { op: 'OP-2026-0850', producto: 'Perno Hexagonal M20', plan: 5000, real: 0, pct: 0.0, scrap: 0, estado: 'PENDIENTE', linea: L1, turno: 'Turno C', maquina: 'CNC-09', responsable: 'Andrés Peña', inicio: '—', fin: '—', oee: 0, retrabajos: 0, paros: [] },
]

const OEE_TREND: OEETrend[] = [
  { semana: 'S01', oee: 82.0 },
  { semana: 'S02', oee: 84.0 },
  { semana: 'S03', oee: 85.1 },
  { semana: 'S04', oee: 86.2 },
  { semana: 'S05', oee: 87.0 },
  { semana: 'S06', oee: 87.3 },
]

const LINEAS_CALIDAD: LineaCalidad[] = [
  { linea: L1, fpy: 95.2, scrap: 1.8, defectos: 42, inspecciones: 280, rechazos: 8, responsable: 'Andrés Peña', turnoCritico: 'Turno B', costoScrap: 8600000, detalle: [{ tipo: 'Dimensión fuera de tolerancia', cantidad: 24 }, { tipo: 'Acabado superficial', cantidad: 12 }, { tipo: 'Rebaba', cantidad: 6 }] },
  { linea: L2, fpy: 91.4, scrap: 3.1, defectos: 78, inspecciones: 210, rechazos: 14, responsable: 'María Gil', turnoCritico: 'Turno B', costoScrap: 19400000, detalle: [{ tipo: 'Porosidad en fundición', cantidad: 51 }, { tipo: 'Inclusiones', cantidad: 18 }, { tipo: 'Rechupe', cantidad: 9 }] },
  { linea: L3, fpy: 97.8, scrap: 0.9, defectos: 18, inspecciones: 340, rechazos: 4, responsable: 'Julián Mora', turnoCritico: 'Turno A', costoScrap: 3100000, detalle: [{ tipo: 'Falla en sellado / O-ring', cantidad: 11 }, { tipo: 'Torque incorrecto', cantidad: 7 }] },
  { linea: L4, fpy: 94.0, scrap: 2.4, defectos: 55, inspecciones: 310, rechazos: 11, responsable: 'Daniela Ruiz', turnoCritico: 'Turno B', costoScrap: 9800000, detalle: [{ tipo: 'Componente faltante', cantidad: 22 }, { tipo: 'Ensamble incorrecto', cantidad: 19 }, { tipo: 'Ajuste fuera de spec', cantidad: 14 }] },
  { linea: L5, fpy: 93.1, scrap: 2.8, defectos: 63, inspecciones: 195, rechazos: 9, responsable: 'Óscar Lara', turnoCritico: 'Turno A', costoScrap: 5300000, detalle: [{ tipo: 'Acabado superficial deficiente', cantidad: 33 }, { tipo: 'Espesor de capa', cantidad: 18 }, { tipo: 'Contaminación pintura', cantidad: 12 }] },
  { linea: L6, fpy: 98.5, scrap: 0.5, defectos: 9, inspecciones: 420, rechazos: 2, responsable: 'Sara Nieto', turnoCritico: 'Turno C', costoScrap: 1200000, detalle: [{ tipo: 'Marcado / etiquetado incorrecto', cantidad: 6 }, { tipo: 'Empaque dañado', cantidad: 3 }] },
]

const DEFECTOS_PARETO: DefectoPareto[] = [
  { tipo: 'Dimensión fuera de tolerancia', cantidad: 124, pctAcum: 38.3 },
  { tipo: 'Porosidad en fundición', cantidad: 89, pctAcum: 65.8 },
  { tipo: 'Acabado superficial deficiente', cantidad: 56, pctAcum: 83.1 },
  { tipo: 'Falla en sellado / O-ring', cantidad: 31, pctAcum: 92.7 },
  { tipo: 'Marcado / etiquetado incorrecto', cantidad: 24, pctAcum: 100.0 },
]

const PRODUCTOS_TOP: ProductoTop[] = [
  { producto: 'Válvula Industrial DN50', unidades: 14820, pctTotal: 17.6, oee: 90.1, costoUnitario: 62400, linea: L1, familia: 'Válvulas', margen: 15.8, tendencia: [2100, 2280, 2350, 2480, 2560, 2610] },
  { producto: 'Anillo Sellado PTFE', pctTotal: 14.3, unidades: 12050, oee: 88.5, costoUnitario: 18200, linea: L3, familia: 'Sellos', margen: 26.4, tendencia: [1850, 1920, 1980, 2010, 2080, 2110] },
  { producto: 'Tapa Cierre Hermético', unidades: 10380, pctTotal: 12.3, oee: 85.7, costoUnitario: 47800, linea: L3, familia: 'Cierres', margen: 19.2, tendencia: [1620, 1690, 1710, 1740, 1790, 1830] },
  { producto: 'Perno Hexagonal M20', unidades: 9800, pctTotal: 11.6, oee: 91.2, costoUnitario: 8400, linea: L1, familia: 'Fijaciones', margen: 31.0, tendencia: [1500, 1560, 1610, 1650, 1710, 1770] },
  { producto: 'Buje Bronce SAE-660', unidades: 6240, pctTotal: 7.4, oee: 82.3, costoUnitario: 54600, linea: L2, familia: 'Bujes', margen: 12.9, tendencia: [980, 1010, 1040, 1050, 1070, 1090] },
]

const TENDENCIA_COSTOS: CostoMes[] = [
  { mes: 'Ene', costo: 261000000 },
  { mes: 'Feb', costo: 274000000 },
  { mes: 'Mar', costo: 268000000 },
  { mes: 'Abr', costo: 279000000 },
  { mes: 'May', costo: 271000000 },
  { mes: 'Jun', costo: 284000000 },
]

const PRODUCTOS_COSTO: ProductoCosto[] = [
  { producto: 'Carcasa Bomba Centrífuga', mp: 38200, mod: 18400, cif: 11800, total: 68400, margen: 18.4, linea: L2, unidadesMes: 764, precioVenta: 83900 },
  { producto: 'Impeller Fundición Gris', mp: 31500, mod: 14200, cif: 9100, total: 54800, margen: 22.1, linea: L2, unidadesMes: 388, precioVenta: 70300 },
  { producto: 'Válvula Industrial DN50', mp: 44100, mod: 12800, cif: 8200, total: 65100, margen: 15.8, linea: L1, unidadesMes: 1185, precioVenta: 77300 },
  { producto: 'Eje Transmisión 25mm', mp: 28400, mod: 11600, cif: 7400, total: 47400, margen: 24.6, linea: L1, unidadesMes: 1089, precioVenta: 62900 },
  { producto: 'Brida Acero Inox 316', mp: 51200, mod: 16300, cif: 10400, total: 77900, margen: 12.2, linea: L1, unidadesMes: 598, precioVenta: 88700 },
]

// ── Catálogo de reportes ──────────────────────────────────────────────────────
interface ReporteDef {
  key: string
  nombre: string
  descripcion: string
  categoria: 'Producción' | 'Calidad' | 'Ejecutivo' | 'Costos'
  color: string
  icon: React.ReactNode
  frecuencia: string
  formato: string
}

const REPORTES: ReporteDef[] = [
  { key: 'prod-diaria', nombre: 'Producción Diaria por OP', descripcion: 'Detalle de órdenes de producción del día: plan vs real, cumplimiento, scrap y estado.', categoria: 'Producción', color: MES_COLOR, icon: <ProdIcon />, frecuencia: 'Diario', formato: 'PDF' },
  { key: 'oee-semanal', nombre: 'Tendencia OEE Semanal', descripcion: 'Evolución del OEE global de planta en las últimas 6 semanas contra la meta.', categoria: 'Producción', color: '#32AC5C', icon: <SpeedIcon />, frecuencia: 'Semanal', formato: 'Excel' },
  { key: 'calidad-linea', nombre: 'Calidad por Línea', descripcion: 'FPY, scrap, defectos, inspecciones y rechazos discriminados por línea de producción.', categoria: 'Calidad', color: '#8B5CF6', icon: <QualityIcon />, frecuencia: 'Semanal', formato: 'PDF' },
  { key: 'pareto-defectos', nombre: 'Pareto de Defectos', descripcion: 'Ranking de los principales tipos de defecto y su contribución acumulada.', categoria: 'Calidad', color: '#EF4444', icon: <WarnIcon />, frecuencia: 'Mensual', formato: 'PDF' },
  { key: 'top-productos', nombre: 'Top Productos por Volumen', descripcion: 'Productos de mayor volumen con participación, OEE y costo unitario.', categoria: 'Ejecutivo', color: '#0EA5E9', icon: <TrendIcon />, frecuencia: 'Mensual', formato: 'Excel' },
  { key: 'costos-producto', nombre: 'Costeo por Producto', descripcion: 'Estructura de costo (MP, MOD, CIF), costo total y margen por producto.', categoria: 'Costos', color: '#F59E0B', icon: <MoneyIcon />, frecuencia: 'Mensual', formato: 'Excel' },
]

const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length

interface PreviewData {
  resumen: { label: string; value: string; color?: string }[]
  columns: string[]
  rows: (string | number)[][]
}

const PREVIEWS: Record<string, PreviewData> = {
  'prod-diaria': {
    resumen: [
      { label: 'Órdenes', value: String(ORDENES.length) },
      { label: 'Cumplimiento prom.', value: `${avg(ORDENES.map(o => o.pct)).toFixed(1)}%`, color: '#F59E0B' },
      { label: 'Unidades reales', value: fmtN(ORDENES.reduce((s, o) => s + o.real, 0)) },
      { label: 'Scrap total', value: `${ORDENES.reduce((s, o) => s + o.scrap, 0)} un`, color: '#EF4444' },
    ],
    columns: ['OP', 'Producto', 'Plan', 'Real', '% Cumpl.', 'Estado'],
    rows: ORDENES.map(o => [o.op, o.producto, fmtN(o.plan), fmtN(o.real), `${o.pct.toFixed(1)}%`, o.estado.replace('_', ' ')]),
  },
  'oee-semanal': {
    resumen: [
      { label: 'OEE actual', value: `${OEE_TREND[OEE_TREND.length - 1].oee}%`, color: '#32AC5C' },
      { label: 'Mejora 6 sem.', value: `+${(OEE_TREND[OEE_TREND.length - 1].oee - OEE_TREND[0].oee).toFixed(1)} pp`, color: MES_COLOR },
      { label: 'Meta OEE', value: '90%', color: '#F59E0B' },
    ],
    columns: ['Semana', 'OEE %', 'Δ vs anterior'],
    rows: OEE_TREND.map((o, i) => [o.semana, `${o.oee}%`, i === 0 ? '—' : `${(o.oee - OEE_TREND[i - 1].oee >= 0 ? '+' : '')}${(o.oee - OEE_TREND[i - 1].oee).toFixed(1)} pp`]),
  },
  'calidad-linea': {
    resumen: [
      { label: 'FPY promedio', value: `${avg(LINEAS_CALIDAD.map(l => l.fpy)).toFixed(1)}%`, color: '#F59E0B' },
      { label: 'Scrap promedio', value: `${avg(LINEAS_CALIDAD.map(l => l.scrap)).toFixed(1)}%`, color: '#EF4444' },
      { label: 'Defectos totales', value: String(LINEAS_CALIDAD.reduce((s, l) => s + l.defectos, 0)) },
      { label: 'Rechazos', value: String(LINEAS_CALIDAD.reduce((s, l) => s + l.rechazos, 0)), color: '#EF4444' },
    ],
    columns: ['Línea', 'FPY %', 'Scrap %', 'Defectos', 'Rechazos'],
    rows: LINEAS_CALIDAD.map(l => [l.linea, `${l.fpy}%`, `${l.scrap}%`, l.defectos, l.rechazos]),
  },
  'pareto-defectos': {
    resumen: [
      { label: 'Defectos totales', value: String(DEFECTOS_PARETO.reduce((s, d) => s + d.cantidad, 0)) },
      { label: 'Causa principal', value: DEFECTOS_PARETO[0].tipo, color: '#EF4444' },
      { label: 'Top 2 acumulado', value: `${DEFECTOS_PARETO[1].pctAcum.toFixed(1)}%`, color: '#F59E0B' },
    ],
    columns: ['Tipo de defecto', 'Cantidad', '% Acum.'],
    rows: DEFECTOS_PARETO.map(d => [d.tipo, d.cantidad, `${d.pctAcum.toFixed(1)}%`]),
  },
  'top-productos': {
    resumen: [
      { label: 'Productos', value: String(PRODUCTOS_TOP.length) },
      { label: 'Unidades top-5', value: fmtN(PRODUCTOS_TOP.reduce((s, p) => s + p.unidades, 0)) },
      { label: 'OEE promedio', value: `${avg(PRODUCTOS_TOP.map(p => p.oee)).toFixed(1)}%`, color: '#32AC5C' },
    ],
    columns: ['#', 'Producto', 'Unidades', '% Total', 'OEE'],
    rows: PRODUCTOS_TOP.map((p, i) => [i + 1, p.producto, fmtN(p.unidades), `${p.pctTotal}%`, `${p.oee}%`]),
  },
  'costos-producto': {
    resumen: [
      { label: 'Costo prom./un.', value: fmt(avg(PRODUCTOS_COSTO.map(p => p.total))), color: '#EF4444' },
      { label: 'Margen prom.', value: `${avg(PRODUCTOS_COSTO.map(p => p.margen)).toFixed(1)}%`, color: '#32AC5C' },
      { label: 'Productos', value: String(PRODUCTOS_COSTO.length) },
    ],
    columns: ['Producto', 'MP', 'MOD', 'CIF', 'Total/Un.', 'Margen %'],
    rows: PRODUCTOS_COSTO.map(p => [p.producto, fmt(p.mp), fmt(p.mod), fmt(p.cif), fmt(p.total), `${p.margen}%`]),
  },
}

// ── Reportes programados ──────────────────────────────────────────────────────
interface Programado {
  id: string
  nombre: string
  reporte: string
  frecuencia: string
  formato: string
  destinatario: string
  linea: string
  hora: string
  activo: boolean
}

const PROGRAMADOS_SEED: Programado[] = [
  { id: 'RP-001', nombre: 'Cierre diario producción', reporte: 'Producción Diaria por OP', frecuencia: 'Diario', formato: 'PDF', destinatario: 'Jefatura de Planta', linea: 'Todas', hora: '18:00', activo: true },
  { id: 'RP-002', nombre: 'Comité de calidad semanal', reporte: 'Calidad por Línea', frecuencia: 'Semanal', formato: 'PDF', destinatario: 'Gerencia de Calidad', linea: 'Todas', hora: '08:00', activo: true },
]

const DESTINATARIOS = ['Jefatura de Planta', 'Gerencia de Calidad', 'Gerencia General', 'Control de Costos', 'Supervisión de Turno', 'Dirección de Operaciones']
const FRECUENCIAS = ['Diario', 'Semanal', 'Mensual', 'Trimestral']
const FORMATOS = ['PDF', 'Excel', 'CSV']

// ── Helpers ──────────────────────────────────────────────────────────────────
const estadoColor = (e: string) =>
  ({ COMPLETADO: '#32AC5C', EN_PROCESO: MES_COLOR, RETRASADO: '#EF4444', PENDIENTE: '#9CA3AF' })[e] ?? '#9CA3AF'

const pctColor = (p: number) => p >= 95 ? '#32AC5C' : p >= 80 ? '#F59E0B' : '#EF4444'
const fpyColor = (v: number) => v >= 96 ? '#32AC5C' : v >= 93 ? '#F59E0B' : '#EF4444'
const scrapColor = (v: number) => v <= 1.5 ? '#32AC5C' : v <= 2.5 ? '#F59E0B' : '#EF4444'
const margenColor = (v: number) => v >= 20 ? '#32AC5C' : v >= 15 ? '#F59E0B' : '#EF4444'

const maxOEE = Math.max(...OEE_TREND.map(o => o.oee))
const maxPareto = Math.max(...DEFECTOS_PARETO.map(d => d.cantidad))
const maxCosto = Math.max(...TENDENCIA_COSTOS.map(c => c.costo))

const inputSx = {
  '& .MuiOutlinedInput-root': { color: TXT, borderRadius: '10px' },
  '& label': { color: TXT2 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.25) },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
  '& .MuiSvgIcon-root': { color: MUTED },
}

// ── SVG Gauge (tema claro) ─────────────────────────────────────────────────────
function SvgGauge({ value, label, color = MES_COLOR, max = 100 }: { value: number; label: string; color?: string; max?: number }) {
  const pct = Math.min(value / max, 1)
  const r = 60
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * r
  const arc = circumference * 0.75
  const offset = arc - pct * arc

  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width={160} height={130} viewBox="0 0 160 150">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={alpha('#000', 0.06)} strokeWidth={14}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={14}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={TXT} fontSize={22} fontWeight={800}>{value}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill={TXT2} fontSize={11}>{label}</text>
      </svg>
    </Box>
  )
}

// ── Tile reutilizable ──────────────────────────────────────────────────────────
function InfoTile({ label, value, color = TXT }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ bgcolor: PANEL, borderRadius: '8px', p: 1.25 }}>
      <Typography fontSize={10} color={TXT2} fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
      <Typography fontSize={13} fontWeight={600} sx={{ color }}>{value}</Typography>
    </Box>
  )
}

const SectionTitle = ({ children, color = MES_COLOR }: { children: React.ReactNode; color?: string }) => (
  <Typography fontSize={12} fontWeight={700} color={TXT} mb={1} textTransform="uppercase" letterSpacing="0.04em" sx={{ borderLeft: `3px solid ${color}`, pl: 1 }}>
    {children}
  </Typography>
)

interface NewProgForm {
  nombre: string
  reporte: string
  frecuencia: string
  formato: string
  destinatario: string
  linea: string
  hora: string
  notas: string
}

const EMPTY_PROG: NewProgForm = {
  nombre: '', reporte: '', frecuencia: '', formato: 'PDF', destinatario: '', linea: 'Todas', hora: '08:00', notas: '',
}

const PERIODOS = ['Hoy', 'Esta semana', 'Este mes', 'Trimestre']

// ── Main Component ────────────────────────────────────────────────────────────
export default function MESReportes() {
  const [tab, setTab] = useState(0)

  // Filtros conectados
  const [periodo, setPeriodo] = useState('Hoy')
  const [linea, setLinea] = useState('Todas')
  const [search, setSearch] = useState('')

  // Reportes programados
  const [programados, setProgramados] = useState<Programado[]>(PROGRAMADOS_SEED)

  // Diálogos de detalle
  const [selOP, setSelOP] = useState<OrdenProduccion | null>(null)
  const [selLinea, setSelLinea] = useState<LineaCalidad | null>(null)
  const [selProd, setSelProd] = useState<ProductoTop | null>(null)
  const [selCosto, setSelCosto] = useState<ProductoCosto | null>(null)

  // Vista previa de reporte
  const [preview, setPreview] = useState<ReporteDef | null>(null)

  // Programar reporte
  const [progOpen, setProgOpen] = useState(false)
  const [form, setForm] = useState<NewProgForm>(EMPTY_PROG)
  const [triedSubmit, setTriedSubmit] = useState(false)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  const lineas = useMemo(() => Array.from(new Set(LINEAS_CALIDAD.map(l => l.linea))), [])
  const hayFiltros = search !== '' || linea !== 'Todas'
  const resetFiltros = () => { setSearch(''); setLinea('Todas') }

  const matchLinea = (l: string) => linea === 'Todas' || l === linea
  const matchSearch = (txt: string) => !search || txt.toLowerCase().includes(search.toLowerCase())

  const ordenesFiltradas = useMemo(() =>
    ORDENES.filter(o => matchLinea(o.linea) && (matchSearch(o.op) || matchSearch(o.producto) || matchSearch(o.responsable))),
    [linea, search])
  const lineasFiltradas = useMemo(() =>
    LINEAS_CALIDAD.filter(l => matchLinea(l.linea) && matchSearch(l.linea)),
    [linea, search])
  const productosFiltrados = useMemo(() =>
    PRODUCTOS_TOP.filter(p => matchLinea(p.linea) && (matchSearch(p.producto) || matchSearch(p.familia))),
    [linea, search])
  const costosFiltrados = useMemo(() =>
    PRODUCTOS_COSTO.filter(p => matchLinea(p.linea) && matchSearch(p.producto)),
    [linea, search])

  const setField = (field: keyof NewProgForm, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const openProg = (reporteNombre?: string) => {
    setForm({ ...EMPTY_PROG, reporte: reporteNombre ?? '' })
    setTriedSubmit(false)
    setProgOpen(true)
  }

  const progValido = form.nombre.trim() !== '' && form.reporte !== '' && form.frecuencia !== ''

  const handleProgramar = () => {
    if (!progValido) {
      setTriedSubmit(true)
      notify('Complete los campos obligatorios: nombre, reporte y frecuencia', 'warning')
      return
    }
    const nextNum = programados.length + 1
    const nuevo: Programado = {
      id: `RP-${String(nextNum).padStart(3, '0')}`,
      nombre: form.nombre.trim(),
      reporte: form.reporte,
      frecuencia: form.frecuencia,
      formato: form.formato,
      destinatario: form.destinatario || 'Sin asignar',
      linea: form.linea,
      hora: form.hora || '08:00',
      activo: true,
    }
    setProgramados(prev => [nuevo, ...prev])
    setProgOpen(false)
    notify(`Reporte programado ${nuevo.id} creado (${nuevo.frecuencia})`, 'success')
  }

  const toggleProgramado = (id: string) =>
    setProgramados(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p))
  const deleteProgramado = (id: string) => {
    setProgramados(prev => prev.filter(p => p.id !== id))
    notify(`Programación ${id} eliminada`, 'warning')
  }

  const exportar = (nombre: string) => notify(`Exportando "${nombre}"... el archivo estará disponible en Descargas`, 'info')

  const KpiCard = ({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) => (
    <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(color, 0.3)}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ color }}>{icon}</Box>
          <Box>
            <Typography variant="h6" fontWeight={700} color={TXT}>{value}</Typography>
            <Typography variant="caption" color={TXT2}>{label}</Typography>
            <Typography variant="caption" display="block" color={color} fontSize={10}>{sub}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: PANEL, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={2} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR }}>
              <ReportIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color={MES_DARK}>Reportes MES</Typography>
              <Typography variant="body2" color={TXT2}>Producción, Calidad, Presidencia y Costos — {periodo} · Junio 2026</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => exportar('Dashboard MES completo')}
              sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
              Exportar
            </Button>
            <Button variant="contained" startIcon={<ScheduleIcon />} onClick={() => openProg()}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>
              Programar reporte
            </Button>
          </Stack>
        </Stack>

        {/* Catálogo de reportes */}
        <SectionTitle>Catálogo de reportes — clic para vista previa</SectionTitle>
        <Grid container spacing={2} mb={3}>
          {REPORTES.map(r => (
            <Grid key={r.key} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <Card
                onClick={() => setPreview(r)}
                sx={{
                  background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2, cursor: 'pointer', height: '100%',
                  transition: 'box-shadow .15s, transform .15s, border-color .15s',
                  '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.10)', transform: 'translateY(-2px)', borderColor: r.color },
                }}
              >
                <CardContent sx={{ p: 1.75 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: alpha(r.color, 0.15), color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {r.icon}
                    </Box>
                    <PreviewIcon sx={{ fontSize: 16, color: MUTED }} />
                  </Stack>
                  <Typography fontSize={12.5} fontWeight={700} color={TXT} sx={{ lineHeight: 1.25, mb: 0.5 }}>{r.nombre}</Typography>
                  <Chip label={r.categoria} size="small" sx={{ bgcolor: alpha(r.color, 0.12), color: r.color, fontWeight: 700, fontSize: 9.5, height: 18 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Reportes programados */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <SectionTitle color="#8B5CF6">Reportes programados ({programados.length})</SectionTitle>
        </Stack>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={3}>
          {programados.length === 0 && <Typography fontSize={12} color={MUTED}>No hay reportes programados. Use “Programar reporte”.</Typography>}
          {programados.map(p => (
            <Card key={p.id} sx={{ background: '#FFFFFF', border: `1px solid ${p.activo ? alpha('#8B5CF6', 0.35) : BORDER}`, borderRadius: 2, minWidth: 250, flex: '1 1 250px' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ pr: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} mb={0.25}>
                      <Typography fontSize={11} fontWeight={800} color="#8B5CF6">{p.id}</Typography>
                      <Chip label={p.activo ? 'Activo' : 'Pausado'} size="small" onClick={() => toggleProgramado(p.id)}
                        sx={{ height: 16, fontSize: 9, fontWeight: 700, cursor: 'pointer', bgcolor: alpha(p.activo ? '#32AC5C' : '#9CA3AF', 0.15), color: p.activo ? '#32AC5C' : '#6B7280' }} />
                    </Stack>
                    <Typography fontSize={13} fontWeight={700} color={TXT}>{p.nombre}</Typography>
                    <Typography fontSize={11} color={TXT2}>{p.reporte}</Typography>
                    <Stack direction="row" spacing={1} mt={0.75} flexWrap="wrap" useFlexGap>
                      <Chip icon={<FreqIcon sx={{ fontSize: 12 }} />} label={p.frecuencia} size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: PANEL, color: TXT2, '& .MuiChip-icon': { color: MUTED } }} />
                      <Chip label={p.formato} size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: PANEL, color: TXT2 }} />
                      <Chip icon={<ScheduleIcon sx={{ fontSize: 12 }} />} label={p.hora} size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: PANEL, color: TXT2, '& .MuiChip-icon': { color: MUTED } }} />
                    </Stack>
                    <Typography fontSize={10.5} color={MUTED} mt={0.5}>Para: {p.destinatario} · {p.linea}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => deleteProgramado(p.id)} sx={{ color: MUTED, '&:hover': { color: '#EF4444' } }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Barra de filtros */}
        <Card sx={{ border: `1px solid ${alpha(MES_COLOR, 0.15)}`, borderRadius: 2, mb: 3 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField size="small" placeholder="Buscar OP, producto, línea o responsable..." value={search}
                onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: MUTED }} /></InputAdornment> }} />
              <TextField select size="small" label="Periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                {PERIODOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Línea" value={linea} onChange={(e) => setLinea(e.target.value)} sx={{ minWidth: 220, ...inputSx }}>
                <MenuItem value="Todas">Todas las líneas</MenuItem>
                {lineas.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              {hayFiltros && (
                <Button size="small" variant="outlined" onClick={resetFiltros}
                  sx={{ color: '#EF4444', borderColor: alpha('#EF4444', 0.3), '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11 }}>
                  Limpiar
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ borderBottom: 1, borderColor: BORDER, mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{ '& .MuiTab-root': { color: TXT2, textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: MES_COLOR }, '& .MuiTabs-indicator': { backgroundColor: MES_COLOR } }}>
            {['Producción', 'Calidad', 'Presidencia', 'Costos'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: Producción ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Cumplimiento Programa" value="87.4%" sub="vs meta 90%" icon={<SpeedIcon />} color="#F59E0B" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Producción Real vs Plan" value="8,420 / 9,640 un" sub="déficit 1,220 un" icon={<ProdIcon />} color={MES_COLOR} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="OEE Global" value="87.3%" sub="disponib. × rend. × calidad" icon={<TrendIcon />} color="#32AC5C" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Throughput" value="420 un/h" sub="turno 8h promedio" icon={<SpeedIcon />} color="#8B5CF6" /></Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                    <Typography variant="subtitle2" color={TXT} fontWeight={700}>Órdenes de Producción — {ordenesFiltradas.length} de {ORDENES.length}</Typography>
                    <Button size="small" startIcon={<ExportIcon sx={{ fontSize: 16 }} />} onClick={() => exportar('Órdenes de Producción')}
                      sx={{ color: MES_DARK, fontWeight: 600, fontSize: 11 }}>Exportar</Button>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: TXT2, fontWeight: 700, borderBottom: `1px solid ${BORDER}` } }}>
                          <TableCell>OP</TableCell>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Plan</TableCell>
                          <TableCell align="right">Real</TableCell>
                          <TableCell align="center">% Cumpl.</TableCell>
                          <TableCell align="right">Scrap</TableCell>
                          <TableCell align="center">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ordenesFiltradas.map((o, i) => (
                          <TableRow key={i} hover onClick={() => setSelOP(o)}
                            sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${alpha('#000', 0.05)}` }, '&:hover': { background: alpha(MES_COLOR, 0.05) } }}>
                            <TableCell><Typography variant="caption" fontWeight={700} color={MES_COLOR}>{o.op}</Typography></TableCell>
                            <TableCell><Typography variant="caption">{o.producto}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmtN(o.plan)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmtN(o.real)}</Typography></TableCell>
                            <TableCell align="center"><Typography variant="caption" fontWeight={700} color={pctColor(o.pct)}>{o.pct.toFixed(1)}%</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption" color={o.scrap > 20 ? '#EF4444' : TXT2}>{o.scrap}</Typography></TableCell>
                            <TableCell align="center">
                              <Chip label={o.estado.replace('_', ' ')} size="small" sx={{ background: alpha(estadoColor(o.estado), 0.15), color: estadoColor(o.estado), fontWeight: 700, fontSize: 10 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                        {ordenesFiltradas.length === 0 && (
                          <TableRow><TableCell colSpan={7} align="center" sx={{ color: MUTED, py: 4, border: 0 }}>No hay órdenes que coincidan con los filtros.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 4 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT} mb={2} fontWeight={700}>Tendencia OEE — Últimas 6 Semanas</Typography>
                    <Stack spacing={1.5}>
                      {OEE_TREND.map((o, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                          <Typography variant="caption" color={TXT2} sx={{ width: 28 }}>{o.semana}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 20, borderRadius: 4, background: alpha(MES_COLOR, 0.08), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(o.oee / maxOEE) * 100}%`, background: i === OEE_TREND.length - 1 ? MES_COLOR : alpha(MES_COLOR, 0.5), borderRadius: 4, transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" color="white" fontWeight={700} noWrap sx={{ fontSize: 11 }}>{o.oee}%</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                    <Divider sx={{ borderColor: BORDER, my: 2 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color={MES_COLOR}>+5.3 pp</Typography>
                        <Typography variant="caption" color={TXT2}>Mejora 6 sem</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color="#F59E0B">90%</Typography>
                        <Typography variant="caption" color={TXT2}>Meta OEE</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 1: Calidad ───────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="First Pass Yield" value="93.8%" sub="meta ≥ 95%" icon={<QualityIcon />} color="#F59E0B" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Scrap Rate" value="2.1%" sub="meta ≤ 1.5%" icon={<WarnIcon />} color="#EF4444" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Rework Rate" value="0.8%" sub="meta ≤ 1.0%" icon={<OkIcon />} color="#32AC5C" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Defectos por Millón (DPMO)" value="21,000" sub="objetivo sigma 4.0" icon={<TrendIcon />} color="#8B5CF6" /></Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                    <Typography variant="subtitle2" color={TXT} fontWeight={700}>Calidad por Línea — {lineasFiltradas.length} de {LINEAS_CALIDAD.length}</Typography>
                    <Button size="small" startIcon={<ExportIcon sx={{ fontSize: 16 }} />} onClick={() => exportar('Calidad por Línea')}
                      sx={{ color: MES_DARK, fontWeight: 600, fontSize: 11 }}>Exportar</Button>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: TXT2, fontWeight: 700, borderBottom: `1px solid ${BORDER}` } }}>
                          <TableCell>Línea</TableCell>
                          <TableCell align="center">FPY %</TableCell>
                          <TableCell align="center">Scrap %</TableCell>
                          <TableCell align="right">Defectos</TableCell>
                          <TableCell align="right">Inspecc.</TableCell>
                          <TableCell align="right">Rechazos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineasFiltradas.map((l, i) => (
                          <TableRow key={i} hover onClick={() => setSelLinea(l)}
                            sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${alpha('#000', 0.05)}` }, '&:hover': { background: alpha(MES_COLOR, 0.05) } }}>
                            <TableCell><Typography variant="caption" fontWeight={600}>{l.linea}</Typography></TableCell>
                            <TableCell align="center"><Typography variant="caption" fontWeight={700} color={fpyColor(l.fpy)}>{l.fpy}%</Typography></TableCell>
                            <TableCell align="center"><Typography variant="caption" fontWeight={700} color={scrapColor(l.scrap)}>{l.scrap}%</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{l.defectos}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{l.inspecciones}</Typography></TableCell>
                            <TableCell align="right">
                              <Chip label={l.rechazos} size="small" sx={{ background: alpha(l.rechazos > 10 ? '#EF4444' : '#F59E0B', 0.15), color: l.rechazos > 10 ? '#EF4444' : '#F59E0B', fontWeight: 700, minWidth: 32 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                        {lineasFiltradas.length === 0 && (
                          <TableRow><TableCell colSpan={6} align="center" sx={{ color: MUTED, py: 4, border: 0 }}>No hay líneas que coincidan con los filtros.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT} mb={2} fontWeight={700}>Pareto de Defectos — Top 5 Tipos</Typography>
                    <Stack spacing={2}>
                      {DEFECTOS_PARETO.map((d, i) => {
                        const barColor = i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : i === 2 ? MES_COLOR : alpha(MES_COLOR, 0.6)
                        return (
                          <Box key={i}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption" color="#334155" sx={{ maxWidth: '70%' }}>{d.tipo}</Typography>
                              <Stack direction="row" spacing={1}>
                                <Typography variant="caption" fontWeight={700} color={barColor}>{d.cantidad}</Typography>
                                <Typography variant="caption" color={TXT2}>({d.pctAcum.toFixed(1)}%)</Typography>
                              </Stack>
                            </Stack>
                            <Box sx={{ height: 10, borderRadius: 5, background: alpha('#000', 0.05), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(d.cantidad / maxPareto) * 100}%`, background: barColor, borderRadius: 5, transition: 'width 0.5s ease' }} />
                            </Box>
                          </Box>
                        )
                      })}
                    </Stack>
                    <Divider sx={{ borderColor: BORDER, my: 2 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color={TXT2}>Total defectos mes</Typography>
                      <Typography variant="caption" fontWeight={700} color={TXT}>324</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color={TXT2}>Costo scrap estimado</Typography>
                      <Typography variant="caption" fontWeight={700} color="#EF4444">$48.2M COP</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 2: Presidencia ───────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Typography variant="subtitle1" color={TXT} mb={3} fontWeight={700}>Dashboard Ejecutivo — Junio 2026</Typography>

            <Grid container spacing={3} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.35)}`, borderRadius: 2, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT2} mb={1} fontWeight={600}>OEE Global</Typography>
                    <SvgGauge value={87.3} label="OEE" color={MES_COLOR} />
                    <Typography variant="caption" color={TXT2}>Meta: ≥ 90%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#32AC5C', 0.35)}`, borderRadius: 2, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT2} mb={1} fontWeight={600}>Cumplimiento Programa</Typography>
                    <SvgGauge value={87.4} label="Cumpl." color="#32AC5C" />
                    <Typography variant="caption" color={TXT2}>Meta: ≥ 90%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#EF4444', 0.35)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT2} mb={2} fontWeight={600}>Costo Unitario vs Meta</Typography>
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight={800} color="#EF4444">$67,400</Typography>
                      <Typography variant="caption" color={TXT2}>costo real / unidad</Typography>
                    </Box>
                    <Divider sx={{ borderColor: BORDER, my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color="#32AC5C">$65,000</Typography>
                        <Typography variant="caption" color={TXT2}>Meta</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={700} color="#EF4444">+3.7%</Typography>
                        <Typography variant="caption" color={TXT2}>Sobre meta</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#8B5CF6', 0.35)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT2} mb={2} fontWeight={600}>OTIF Productivo</Typography>
                    <Box textAlign="center">
                      <Typography variant="h3" fontWeight={900} color="#8B5CF6" sx={{ lineHeight: 1.1 }}>91.2%</Typography>
                      <Typography variant="caption" color={TXT2}>On Time In Full</Typography>
                    </Box>
                    <Divider sx={{ borderColor: BORDER, my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color={TXT2}>Meta OTIF</Typography>
                      <Typography variant="caption" fontWeight={700} color="#8B5CF6">95%</Typography>
                    </Stack>
                    <Box sx={{ height: 6, borderRadius: 3, background: alpha('#8B5CF6', 0.12), overflow: 'hidden', mt: 0.5 }}>
                      <Box sx={{ height: '100%', width: '91.2%', background: '#8B5CF6', borderRadius: 3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                    <Typography variant="subtitle2" color={TXT} fontWeight={700}>Top Productos por Volumen — {productosFiltrados.length} de {PRODUCTOS_TOP.length}</Typography>
                    <Button size="small" startIcon={<ExportIcon sx={{ fontSize: 16 }} />} onClick={() => exportar('Top Productos por Volumen')}
                      sx={{ color: MES_DARK, fontWeight: 600, fontSize: 11 }}>Exportar</Button>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: TXT2, fontWeight: 700, borderBottom: `1px solid ${BORDER}` } }}>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Unidades</TableCell>
                          <TableCell align="center">% Total</TableCell>
                          <TableCell align="center">OEE</TableCell>
                          <TableCell align="right">Costo Unitario</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productosFiltrados.map((p, i) => (
                          <TableRow key={i} hover onClick={() => setSelProd(p)}
                            sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${alpha('#000', 0.05)}` }, '&:hover': { background: alpha(MES_COLOR, 0.05) } }}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="caption" color={MUTED} fontWeight={700}>#{i + 1}</Typography>
                                <Typography variant="caption">{p.producto}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right"><Typography variant="caption" fontWeight={600}>{fmtN(p.unidades)}</Typography></TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="caption" fontWeight={700} color={MES_COLOR}>{p.pctTotal}%</Typography>
                                <Box sx={{ height: 4, borderRadius: 2, background: alpha(MES_COLOR, 0.12), mt: 0.3 }}>
                                  <Box sx={{ height: '100%', width: `${p.pctTotal * 4}%`, background: MES_COLOR, borderRadius: 2 }} />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center"><Typography variant="caption" fontWeight={700} color={pctColor(p.oee)}>{p.oee}%</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.costoUnitario)}</Typography></TableCell>
                          </TableRow>
                        ))}
                        {productosFiltrados.length === 0 && (
                          <TableRow><TableCell colSpan={5} align="center" sx={{ color: MUTED, py: 4, border: 0 }}>No hay productos que coincidan con los filtros.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT} mb={2} fontWeight={700}>Tendencia Costo Mensual (6 meses)</Typography>
                    <Stack spacing={1.5}>
                      {TENDENCIA_COSTOS.map((m, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={2}>
                          <Typography variant="caption" color={TXT2} sx={{ width: 28 }}>{m.mes}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 20, borderRadius: 4, background: alpha(MES_COLOR, 0.08), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(m.costo / maxCosto) * 100}%`, background: i === 5 ? MES_COLOR : alpha(MES_COLOR, 0.45), borderRadius: 4, transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" color="white" fontWeight={700} noWrap sx={{ fontSize: 11 }}>${Math.round(m.costo / 1000000)}M</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 3: Costos ────────────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Costo Total Mes" value="$284M" sub="COP junio 2026" icon={<MoneyIcon />} color={MES_COLOR} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Costo por Unidad" value="$67,400" sub="real jun" icon={<TrendIcon />} color="#EF4444" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Meta Costo / Un." value="$65,000" sub="presupuesto aprobado" icon={<OkIcon />} color="#32AC5C" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><KpiCard label="Varianza" value="+3.7%" sub="sobre meta ($2,400/un)" icon={<WarnIcon />} color="#F59E0B" /></Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color={TXT} mb={2} fontWeight={700}>Estructura de Costos</Typography>
                    <Stack spacing={2.5}>
                      {[
                        { concepto: 'Materiales Directos', pct: 72, valor: 204480000, color: MES_COLOR },
                        { concepto: 'Mano de Obra Directa', pct: 18, valor: 51120000, color: '#8B5CF6' },
                        { concepto: 'Costos Indirectos Fab.', pct: 10, valor: 28400000, color: '#F59E0B' },
                      ].map((c, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="#334155">{c.concepto}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={700} color={c.color}>{c.pct}%</Typography>
                              <Typography variant="caption" color={TXT2}>${Math.round(c.valor / 1000000)}M</Typography>
                            </Stack>
                          </Stack>
                          <Box sx={{ height: 12, borderRadius: 6, background: alpha(c.color, 0.1), overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 6, transition: 'width 0.5s ease' }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                    <Divider sx={{ borderColor: BORDER, my: 2 }} />
                    <Box sx={{ p: 1.5, borderRadius: 1.5, background: alpha('#EF4444', 0.08), border: `1px solid ${alpha('#EF4444', 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="caption" color={TXT2}>Scrap en COP</Typography>
                          <Typography variant="body1" fontWeight={700} color="#EF4444">$48.2M</Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" color={TXT2}>Del costo total</Typography>
                          <Typography variant="body1" fontWeight={700} color="#EF4444">17.0%</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Paper sx={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                    <Typography variant="subtitle2" color={TXT} fontWeight={700}>Costeo por Producto — {costosFiltrados.length} de {PRODUCTOS_COSTO.length}</Typography>
                    <Button size="small" startIcon={<ExportIcon sx={{ fontSize: 16 }} />} onClick={() => exportar('Costeo por Producto')}
                      sx={{ color: MES_DARK, fontWeight: 600, fontSize: 11 }}>Exportar</Button>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: TXT2, fontWeight: 700, borderBottom: `1px solid ${BORDER}` } }}>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">MP</TableCell>
                          <TableCell align="right">MOD</TableCell>
                          <TableCell align="right">CIF</TableCell>
                          <TableCell align="right">Total / Un.</TableCell>
                          <TableCell align="center">Margen %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {costosFiltrados.map((p, i) => (
                          <TableRow key={i} hover onClick={() => setSelCosto(p)}
                            sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${alpha('#000', 0.05)}` }, '&:hover': { background: alpha(MES_COLOR, 0.05) } }}>
                            <TableCell><Typography variant="caption" fontWeight={600}>{p.producto}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.mp)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.mod)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption">{fmt(p.cif)}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption" fontWeight={700} color={MES_COLOR}>{fmt(p.total)}</Typography></TableCell>
                            <TableCell align="center">
                              <Chip label={`${p.margen}%`} size="small" sx={{ background: alpha(margenColor(p.margen), 0.15), color: margenColor(p.margen), fontWeight: 700, fontSize: 10 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                        {costosFiltrados.length === 0 && (
                          <TableRow><TableCell colSpan={6} align="center" sx={{ color: MUTED, py: 4, border: 0 }}>No hay productos que coincidan con los filtros.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* ── Dialog: DETALLE ORDEN DE PRODUCCIÓN ── */}
      <Dialog open={!!selOP} onClose={() => setSelOP(null)} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selOP && (() => {
          const downtime = selOP.paros.reduce((s, p) => s + p.minutos, 0)
          const maxParo = Math.max(1, ...selOP.paros.map(p => p.minutos))
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(estadoColor(selOP.estado), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ProdIcon sx={{ color: estadoColor(selOP.estado) }} />
                  </Box>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>{selOP.op}</Typography>
                      <Chip label={selOP.estado.replace('_', ' ')} size="small" sx={{ background: alpha(estadoColor(selOP.estado), 0.15), color: estadoColor(selOP.estado), fontWeight: 700, fontSize: 10 }} />
                    </Stack>
                    <Typography fontSize={15} fontWeight={700} color={TXT}>{selOP.producto}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSelOP(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="Línea" value={selOP.linea} />
                    <InfoTile label="Máquina" value={<Stack direction="row" alignItems="center" spacing={0.5}><MachineIcon sx={{ fontSize: 15, color: MES_COLOR }} /><span>{selOP.maquina}</span></Stack>} />
                    <InfoTile label="Turno" value={selOP.turno} />
                    <InfoTile label="Responsable" value={<Stack direction="row" alignItems="center" spacing={0.5}><PersonIcon sx={{ fontSize: 15, color: MES_COLOR }} /><span>{selOP.responsable}</span></Stack>} />
                    <InfoTile label="Inicio" value={selOP.inicio} />
                    <InfoTile label="Fin" value={selOP.fin} />
                    <InfoTile label="OEE de la OP" value={`${selOP.oee}%`} color={pctColor(selOP.oee)} />
                    <InfoTile label="Retrabajos" value={String(selOP.retrabajos)} color={selOP.retrabajos > 10 ? '#EF4444' : TXT} />
                  </Box>

                  <Box>
                    <SectionTitle>Avance plan vs real</SectionTitle>
                    <Box sx={{ bgcolor: PANEL, borderRadius: '8px', p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography fontSize={12} color={TXT2}>Real {fmtN(selOP.real)} / Plan {fmtN(selOP.plan)} un</Typography>
                        <Typography fontSize={12} fontWeight={800} color={pctColor(selOP.pct)}>{selOP.pct.toFixed(1)}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={Math.min(selOP.pct, 100)}
                        sx={{ height: 10, borderRadius: 5, bgcolor: alpha(MES_COLOR, 0.1), '& .MuiLinearProgress-bar': { bgcolor: pctColor(selOP.pct), borderRadius: 5 } }} />
                      <Stack direction="row" spacing={3} mt={1.5}>
                        <Box><Typography fontSize={10} color={TXT2}>Déficit</Typography><Typography fontSize={13} fontWeight={700} color="#EF4444">{fmtN(Math.max(0, selOP.plan - selOP.real))} un</Typography></Box>
                        <Box><Typography fontSize={10} color={TXT2}>Scrap</Typography><Typography fontSize={13} fontWeight={700} color={selOP.scrap > 20 ? '#EF4444' : TXT}>{selOP.scrap} un</Typography></Box>
                        <Box><Typography fontSize={10} color={TXT2}>% Scrap</Typography><Typography fontSize={13} fontWeight={700} color={TXT}>{selOP.real > 0 ? ((selOP.scrap / (selOP.real + selOP.scrap)) * 100).toFixed(1) : '0.0'}%</Typography></Box>
                      </Stack>
                    </Box>
                  </Box>

                  <Box>
                    <SectionTitle color="#EF4444">Paros registrados ({selOP.paros.length}) · {downtime} min de parada</SectionTitle>
                    {selOP.paros.length === 0 ? (
                      <Typography fontSize={12} color={MUTED}>Sin paros registrados en esta orden.</Typography>
                    ) : (
                      <Stack spacing={1}>
                        {selOP.paros.map((p, i) => (
                          <Box key={i}>
                            <Stack direction="row" justifyContent="space-between" mb={0.25}>
                              <Typography fontSize={12} color="#334155">{p.motivo}</Typography>
                              <Typography fontSize={12} fontWeight={700} color="#EF4444">{p.minutos} min</Typography>
                            </Stack>
                            <Box sx={{ height: 8, borderRadius: 4, background: alpha('#EF4444', 0.1), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(p.minutos / maxParo) * 100}%`, background: '#EF4444', borderRadius: 4 }} />
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<ExportIcon />} onClick={() => exportar(`Detalle OP ${selOP.op}`)} sx={{ color: MES_DARK, fontWeight: 600 }}>Exportar detalle</Button>
                <Button variant="contained" onClick={() => setSelOP(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: DETALLE LÍNEA CALIDAD ── */}
      <Dialog open={!!selLinea} onClose={() => setSelLinea(null)} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selLinea && (() => {
          const maxDet = Math.max(1, ...selLinea.detalle.map(d => d.cantidad))
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha('#8B5CF6', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QualityIcon sx={{ color: '#8B5CF6' }} />
                  </Box>
                  <Box>
                    <Typography fontSize={13} fontWeight={800} color="#8B5CF6">CALIDAD</Typography>
                    <Typography fontSize={15} fontWeight={700} color={TXT}>{selLinea.linea}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSelLinea(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="FPY" value={`${selLinea.fpy}%`} color={fpyColor(selLinea.fpy)} />
                    <InfoTile label="Scrap" value={`${selLinea.scrap}%`} color={scrapColor(selLinea.scrap)} />
                    <InfoTile label="Defectos" value={String(selLinea.defectos)} />
                    <InfoTile label="Inspecciones" value={String(selLinea.inspecciones)} />
                    <InfoTile label="Rechazos" value={String(selLinea.rechazos)} color={selLinea.rechazos > 10 ? '#EF4444' : TXT} />
                    <InfoTile label="Turno crítico" value={selLinea.turnoCritico} />
                    <InfoTile label="Responsable" value={selLinea.responsable} />
                    <InfoTile label="Costo scrap" value={fmt(selLinea.costoScrap)} color="#EF4444" />
                    <InfoTile label="Tasa rechazo" value={`${((selLinea.rechazos / selLinea.inspecciones) * 100).toFixed(1)}%`} />
                  </Box>
                  <Box>
                    <SectionTitle color="#8B5CF6">Composición de defectos</SectionTitle>
                    <Stack spacing={1.5}>
                      {selLinea.detalle.map((d, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.25}>
                            <Typography fontSize={12} color="#334155">{d.tipo}</Typography>
                            <Typography fontSize={12} fontWeight={700} color="#8B5CF6">{d.cantidad}</Typography>
                          </Stack>
                          <Box sx={{ height: 8, borderRadius: 4, background: alpha('#8B5CF6', 0.1), overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${(d.cantidad / maxDet) * 100}%`, background: '#8B5CF6', borderRadius: 4 }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<ExportIcon />} onClick={() => exportar(`Calidad ${selLinea.linea}`)} sx={{ color: MES_DARK, fontWeight: 600 }}>Exportar</Button>
                <Button variant="contained" onClick={() => setSelLinea(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: DETALLE PRODUCTO (Presidencia) ── */}
      <Dialog open={!!selProd} onClose={() => setSelProd(null)} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selProd && (() => {
          const maxT = Math.max(...selProd.tendencia)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha('#0EA5E9', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendIcon sx={{ color: '#0EA5E9' }} />
                  </Box>
                  <Box>
                    <Typography fontSize={13} fontWeight={800} color="#0EA5E9">{selProd.familia}</Typography>
                    <Typography fontSize={15} fontWeight={700} color={TXT}>{selProd.producto}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSelProd(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="Unidades mes" value={fmtN(selProd.unidades)} />
                    <InfoTile label="% del total" value={`${selProd.pctTotal}%`} color={MES_COLOR} />
                    <InfoTile label="OEE" value={`${selProd.oee}%`} color={pctColor(selProd.oee)} />
                    <InfoTile label="Costo unitario" value={fmt(selProd.costoUnitario)} />
                    <InfoTile label="Margen" value={`${selProd.margen}%`} color={margenColor(selProd.margen)} />
                    <InfoTile label="Línea" value={selProd.linea} />
                  </Box>
                  <Box>
                    <SectionTitle color="#0EA5E9">Tendencia de producción (6 meses)</SectionTitle>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 130, px: 1, bgcolor: PANEL, borderRadius: '8px', pt: 2, pb: 1 }}>
                      {selProd.tendencia.map((v, i) => (
                        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Typography fontSize={9.5} color={TXT2} fontWeight={700}>{fmtN(v)}</Typography>
                          <Box sx={{ width: '100%', height: `${(v / maxT) * 80}px`, bgcolor: i === selProd.tendencia.length - 1 ? '#0EA5E9' : alpha('#0EA5E9', 0.4), borderRadius: '4px 4px 0 0', transition: 'height .3s' }} />
                          <Typography fontSize={9.5} color={MUTED}>{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'][i]}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<ExportIcon />} onClick={() => exportar(`Producto ${selProd.producto}`)} sx={{ color: MES_DARK, fontWeight: 600 }}>Exportar</Button>
                <Button variant="contained" onClick={() => setSelProd(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: DETALLE COSTO PRODUCTO ── */}
      <Dialog open={!!selCosto} onClose={() => setSelCosto(null)} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {selCosto && (() => {
          const partes = [
            { concepto: 'Materia Prima (MP)', valor: selCosto.mp, color: MES_COLOR },
            { concepto: 'Mano de Obra (MOD)', valor: selCosto.mod, color: '#8B5CF6' },
            { concepto: 'Costos Indirectos (CIF)', valor: selCosto.cif, color: '#F59E0B' },
          ]
          const costoTotalMes = selCosto.total * selCosto.unidadesMes
          const utilidadUnit = selCosto.precioVenta - selCosto.total
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha('#F59E0B', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MoneyIcon sx={{ color: '#F59E0B' }} />
                  </Box>
                  <Box>
                    <Typography fontSize={13} fontWeight={800} color="#F59E0B">COSTEO</Typography>
                    <Typography fontSize={15} fontWeight={700} color={TXT}>{selCosto.producto}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSelCosto(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="Costo total / un." value={fmt(selCosto.total)} color={MES_COLOR} />
                    <InfoTile label="Precio venta" value={fmt(selCosto.precioVenta)} />
                    <InfoTile label="Margen" value={`${selCosto.margen}%`} color={margenColor(selCosto.margen)} />
                    <InfoTile label="Utilidad / un." value={fmt(utilidadUnit)} color={utilidadUnit > 0 ? '#32AC5C' : '#EF4444'} />
                    <InfoTile label="Unidades mes" value={fmtN(selCosto.unidadesMes)} />
                    <InfoTile label="Línea" value={selCosto.linea} />
                  </Box>
                  <Box>
                    <SectionTitle color="#F59E0B">Estructura de costo unitario</SectionTitle>
                    <Stack spacing={1.5}>
                      {partes.map((c, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.25}>
                            <Typography fontSize={12} color="#334155">{c.concepto}</Typography>
                            <Stack direction="row" spacing={1}>
                              <Typography fontSize={12} fontWeight={700} color={c.color}>{fmt(c.valor)}</Typography>
                              <Typography fontSize={12} color={TXT2}>({((c.valor / selCosto.total) * 100).toFixed(0)}%)</Typography>
                            </Stack>
                          </Stack>
                          <Box sx={{ height: 10, borderRadius: 5, background: alpha(c.color, 0.1), overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${(c.valor / selCosto.total) * 100}%`, background: c.color, borderRadius: 5 }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(MES_COLOR, 0.06), border: `1px solid ${alpha(MES_COLOR, 0.2)}` }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontSize={12} color={TXT2}>Costo total del mes ({fmtN(selCosto.unidadesMes)} un)</Typography>
                      <Typography fontSize={14} fontWeight={800} color={MES_DARK}>{fmt(costoTotalMes)}</Typography>
                    </Stack>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<ExportIcon />} onClick={() => exportar(`Costeo ${selCosto.producto}`)} sx={{ color: MES_DARK, fontWeight: 600 }}>Exportar</Button>
                <Button variant="contained" onClick={() => setSelCosto(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: VISTA PREVIA DE REPORTE ── */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {preview && (() => {
          const data = PREVIEWS[preview.key]
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(preview.color, 0.15), color: preview.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {preview.icon}
                  </Box>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip label={preview.categoria} size="small" sx={{ bgcolor: alpha(preview.color, 0.12), color: preview.color, fontWeight: 700, fontSize: 9.5, height: 18 }} />
                      <Chip icon={<FreqIcon sx={{ fontSize: 12 }} />} label={preview.frecuencia} size="small" sx={{ bgcolor: PANEL, color: TXT2, fontSize: 9.5, height: 18, '& .MuiChip-icon': { color: MUTED } }} />
                    </Stack>
                    <Typography fontSize={15} fontWeight={700} color={TXT}>{preview.nombre}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setPreview(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  <Box sx={{ bgcolor: alpha(preview.color, 0.05), border: `1px solid ${alpha(preview.color, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                    <Typography fontSize={13} color="#334155">{preview.descripcion}</Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${data.resumen.length}, 1fr)` }, gap: 1.5 }}>
                    {data.resumen.map((r, i) => (
                      <Box key={i} sx={{ bgcolor: PANEL, borderRadius: '8px', p: 1.25, textAlign: 'center' }}>
                        <Typography fontSize={15} fontWeight={800} sx={{ color: r.color ?? TXT }}>{r.value}</Typography>
                        <Typography fontSize={10} color={TXT2}>{r.label}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box>
                    <SectionTitle color={preview.color}>Vista previa de datos</SectionTitle>
                    <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(preview.color, 0.06) }}>
                            {data.columns.map((c, i) => (
                              <TableCell key={i} align={i === 0 ? 'left' : 'right'} sx={{ color: TXT2, borderColor: BORDER, fontWeight: 700, fontSize: 11 }}>{c}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.rows.map((row, ri) => (
                            <TableRow key={ri}>
                              {row.map((cell, ci) => (
                                <TableCell key={ci} align={ci === 0 ? 'left' : 'right'} sx={{ color: ci === 0 ? TXT : '#334155', borderColor: BORDER, fontSize: 12, fontWeight: ci === 0 ? 600 : 400 }}>{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<ScheduleIcon />} onClick={() => { const nombre = preview.nombre; setPreview(null); openProg(nombre) }}
                  sx={{ color: '#8B5CF6', fontWeight: 600 }}>Programar</Button>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" onClick={() => setPreview(null)} sx={{ borderColor: BORDER, color: TXT2, borderRadius: '10px', fontWeight: 600 }}>Cerrar</Button>
                  <Button variant="contained" startIcon={<DocIcon />} onClick={() => exportar(preview.nombre)}
                    sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Exportar {preview.formato}</Button>
                </Stack>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: PROGRAMAR REPORTE ── */}
      <Dialog open={progOpen} onClose={() => setProgOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScheduleIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={16} color={TXT}>Programar reporte</Typography>
              <Typography fontSize={12} color={TXT2}>Envío automático recurrente</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setProgOpen(false)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Stack spacing={2} mt={0.5}>
            <TextField fullWidth size="small" label="Nombre de la programación *" value={form.nombre}
              onChange={(e) => setField('nombre', e.target.value)} sx={inputSx} placeholder="Ej. Cierre diario de producción"
              error={triedSubmit && !form.nombre.trim()}
              helperText={triedSubmit && !form.nombre.trim() ? 'El nombre es obligatorio' : ' '} />
            <TextField select fullWidth size="small" label="Reporte base *" value={form.reporte}
              onChange={(e) => setField('reporte', e.target.value)} sx={inputSx}
              error={triedSubmit && !form.reporte}
              helperText={triedSubmit && !form.reporte ? 'Seleccione el reporte' : ' '}>
              {REPORTES.map(r => <MenuItem key={r.key} value={r.nombre}>{r.nombre}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Frecuencia *" value={form.frecuencia}
                onChange={(e) => setField('frecuencia', e.target.value)} sx={inputSx}
                error={triedSubmit && !form.frecuencia}
                helperText={triedSubmit && !form.frecuencia ? 'Obligatoria' : ' '}>
                {FRECUENCIAS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Formato" value={form.formato}
                onChange={(e) => setField('formato', e.target.value)} sx={inputSx} helperText=" ">
                {FORMATOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Destinatario" value={form.destinatario}
                onChange={(e) => setField('destinatario', e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {DESTINATARIOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Hora de envío" type="time" value={form.hora}
                onChange={(e) => setField('hora', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><ScheduleIcon sx={{ fontSize: 16, color: MUTED }} /></InputAdornment> }} />
            </Stack>
            <TextField select fullWidth size="small" label="Línea / alcance" value={form.linea}
              onChange={(e) => setField('linea', e.target.value)} sx={inputSx}>
              <MenuItem value="Todas">Todas las líneas</MenuItem>
              {lineas.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={(e) => setField('notas', e.target.value)} sx={inputSx}
              placeholder="Observaciones o instrucciones de distribución..." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setProgOpen(false)} sx={{ color: TXT2, fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleProgramar} disabled={!progValido}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            Programar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
