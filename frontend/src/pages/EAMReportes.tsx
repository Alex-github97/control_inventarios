import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Stack, alpha, Divider, LinearProgress,
  TextField, MenuItem, Button, Collapse, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  InputAdornment, Tooltip,
} from '@mui/material'
import {
  DirectionsBus as FlotaIcon,
  Business as InfraIcon,
  BarChart as ReportIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  LocalGasStation as FuelIcon,
  Build as BuildIcon,
  TrendingUp as TrendIcon,
  Stars as StarsIcon,
  CheckCircle as OkIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  AccessTime as ClockIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  Visibility as ViewIcon,
  Assessment as AssessmentIcon,
  Description as DocIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtN = (n: number) => new Intl.NumberFormat('es-CO').format(n)

interface VehiculoReporte {
  placa: string
  tipo: string
  kmMes: number
  litrosMes: number
  rendimiento: number
  costoMes: number
  otsAbiertas: number
  pmProximo: string
  estado: 'OPERATIVO' | 'EN_TALLER' | 'INACTIVO'
  // datos enriquecidos para el detalle
  conductor?: string
  ubicacion?: string
  ultimoPM?: string
  disponibilidad?: number
  costoAnio?: number
  observaciones?: string
}

interface Sede {
  nombre: string
  activos: number
  otsAbiertas: number
  ultimoCheck: string
  estadoGeneral: 'BUENO' | 'REGULAR' | 'CRITICO'
  // enriquecido
  responsable?: string
  area?: number
  costoMes?: number
  incidencias?: number
  proximaInspeccion?: string
}

interface CostoActivo {
  nombre: string
  tipo: string
  costoMes: number
  costoAnio: number
  // enriquecido
  manoObra?: number
  repuestos?: number
  externos?: number
  otsMes?: number
}

const VEHICULOS: VehiculoReporte[] = [
  { placa: 'TXC-123', tipo: 'Tracto', kmMes: 28450, litrosMes: 3100, rendimiento: 9.2, costoMes: 4850000, otsAbiertas: 1, pmProximo: '25/07/2025', estado: 'OPERATIVO', conductor: 'Jorge Méndez', ubicacion: 'Bogotá DC', ultimoPM: '02/06/2025', disponibilidad: 96.1, costoAnio: 44100000, observaciones: 'Rendimiento óptimo, ruta Bogotá–Medellín.' },
  { placa: 'STK-456', tipo: 'Tracto', kmMes: 24300, litrosMes: 2980, rendimiento: 8.2, costoMes: 3200000, otsAbiertas: 0, pmProximo: '10/07/2025', estado: 'OPERATIVO', conductor: 'Carlos Díaz', ubicacion: 'Medellín', ultimoPM: '18/05/2025', disponibilidad: 94.7, costoAnio: 31200000, observaciones: 'Sin incidencias en el último trimestre.' },
  { placa: 'FRG-789', tipo: 'Furgón', kmMes: 18200, litrosMes: 2340, rendimiento: 7.8, costoMes: 2100000, otsAbiertas: 2, pmProximo: '05/07/2025', estado: 'EN_TALLER', conductor: 'Ana Rojas', ubicacion: 'Cali', ultimoPM: '20/05/2025', disponibilidad: 81.5, costoAnio: 24500000, observaciones: 'En taller por revisión de caja y frenos.' },
  { placa: 'CMN-321', tipo: 'Camión', kmMes: 22100, litrosMes: 3450, rendimiento: 6.4, costoMes: 5600000, otsAbiertas: 1, pmProximo: '18/07/2025', estado: 'OPERATIVO', conductor: 'Luis Vargas', ubicacion: 'Bogotá DC', ultimoPM: '10/06/2025', disponibilidad: 89.2, costoAnio: 52300000, observaciones: 'Rendimiento bajo, evaluar cambio de inyectores.' },
  { placa: 'BUS-654', tipo: 'Bus', kmMes: 14800, litrosMes: 2100, rendimiento: 7.0, costoMes: 1800000, otsAbiertas: 0, pmProximo: '30/07/2025', estado: 'OPERATIVO', conductor: 'Pedro Torres', ubicacion: 'Barranquilla', ultimoPM: '28/05/2025', disponibilidad: 97.4, costoAnio: 16400000, observaciones: 'Servicio de transporte de personal.' },
  { placa: 'TXC-987', tipo: 'Tracto', kmMes: 31200, litrosMes: 3900, rendimiento: 8.0, costoMes: 6200000, otsAbiertas: 3, pmProximo: '02/07/2025', estado: 'EN_TALLER', conductor: 'Marco Vargas', ubicacion: 'Bogotá DC', ultimoPM: '15/05/2025', disponibilidad: 76.8, costoAnio: 48500000, observaciones: 'Alto costo de mantenimiento — 3 OTs abiertas.' },
  { placa: 'CMV-111', tipo: 'Camioneta', kmMes: 8900, litrosMes: 980, rendimiento: 9.1, costoMes: 980000, otsAbiertas: 0, pmProximo: '20/08/2025', estado: 'OPERATIVO', conductor: 'Diana Castro', ubicacion: 'Bucaramanga', ultimoPM: '01/06/2025', disponibilidad: 98.9, costoAnio: 9800000, observaciones: 'Vehículo de supervisión, bajo consumo.' },
  { placa: 'PLT-222', tipo: 'Plataforma', kmMes: 19500, litrosMes: 2600, rendimiento: 7.5, costoMes: 3400000, otsAbiertas: 1, pmProximo: '15/07/2025', estado: 'OPERATIVO', conductor: 'Luis Herrera', ubicacion: 'Cali', ultimoPM: '12/06/2025', disponibilidad: 92.3, costoAnio: 28500000, observaciones: 'Transporte de carga extradimensionada.' },
]

const SEDES: Sede[] = [
  { nombre: 'Bodega Principal — Bogotá', activos: 8, otsAbiertas: 3, ultimoCheck: '2025-06-15', estadoGeneral: 'BUENO', responsable: 'Marco Vargas', area: 4200, costoMes: 5200000, incidencias: 2, proximaInspeccion: '2025-07-15' },
  { nombre: 'Centro Distribución — Medellín', activos: 5, otsAbiertas: 1, ultimoCheck: '2025-06-10', estadoGeneral: 'BUENO', responsable: 'Diana Castro', area: 1800, costoMes: 2800000, incidencias: 0, proximaInspeccion: '2025-07-10' },
  { nombre: 'Terminal Logístico — Cali', activos: 6, otsAbiertas: 2, ultimoCheck: '2025-06-12', estadoGeneral: 'REGULAR', responsable: 'Pedro Torres', area: 2400, costoMes: 3600000, incidencias: 3, proximaInspeccion: '2025-07-05' },
  { nombre: 'Depósito — Barranquilla', activos: 5, otsAbiertas: 0, ultimoCheck: '2025-06-18', estadoGeneral: 'BUENO', responsable: 'Ana Rojas', area: 1500, costoMes: 1900000, incidencias: 0, proximaInspeccion: '2025-07-18' },
  { nombre: 'Punto Logístico — Bucaramanga', activos: 4, otsAbiertas: 2, ultimoCheck: '2025-06-05', estadoGeneral: 'CRITICO', responsable: 'Luis Herrera', area: 900, costoMes: 2400000, incidencias: 5, proximaInspeccion: '2025-07-02' },
]

const COSTOS_TOP: CostoActivo[] = [
  { nombre: 'Tracto TXC-987', tipo: 'Flota', costoMes: 6200000, costoAnio: 48500000, manoObra: 1800000, repuestos: 3600000, externos: 800000, otsMes: 3 },
  { nombre: 'Camión CMN-321', tipo: 'Flota', costoMes: 5600000, costoAnio: 52300000, manoObra: 1400000, repuestos: 3400000, externos: 800000, otsMes: 2 },
  { nombre: 'Compresor CMP-07', tipo: 'Infraestructura', costoMes: 4900000, costoAnio: 38400000, manoObra: 900000, repuestos: 2800000, externos: 1200000, otsMes: 2 },
  { nombre: 'Tracto TXC-123', tipo: 'Flota', costoMes: 4850000, costoAnio: 44100000, manoObra: 1200000, repuestos: 2900000, externos: 750000, otsMes: 1 },
  { nombre: 'Montacargas MC-003', tipo: 'Infraestructura', costoMes: 4200000, costoAnio: 29800000, manoObra: 1000000, repuestos: 2600000, externos: 600000, otsMes: 2 },
  { nombre: 'Plataforma PLT-222', tipo: 'Flota', costoMes: 3400000, costoAnio: 28500000, manoObra: 800000, repuestos: 2100000, externos: 500000, otsMes: 1 },
  { nombre: 'Tracto STK-456', tipo: 'Flota', costoMes: 3200000, costoAnio: 31200000, manoObra: 700000, repuestos: 2000000, externos: 500000, otsMes: 1 },
  { nombre: 'UPS / Sala TI', tipo: 'Infraestructura', costoMes: 2800000, costoAnio: 18900000, manoObra: 500000, repuestos: 1800000, externos: 500000, otsMes: 1 },
  { nombre: 'Bus BUS-654', tipo: 'Flota', costoMes: 1800000, costoAnio: 16400000, manoObra: 500000, repuestos: 1100000, externos: 200000, otsMes: 0 },
  { nombre: 'Camioneta CMV-111', tipo: 'Flota', costoMes: 980000, costoAnio: 9800000, manoObra: 300000, repuestos: 580000, externos: 100000, otsMes: 0 },
]

const TENDENCIA_MENSUAL = [
  { mes: 'Ene', costo: 38200000 },
  { mes: 'Feb', costo: 42500000 },
  { mes: 'Mar', costo: 51300000 },
  { mes: 'Abr', costo: 44100000 },
  { mes: 'May', costo: 39800000 },
  { mes: 'Jun', costo: 48200000 },
]

const MTBF_TREND = [
  { mes: 'Ene', horas: 298 },
  { mes: 'Feb', horas: 312 },
  { mes: 'Mar', horas: 287 },
  { mes: 'Abr', horas: 325 },
  { mes: 'May', horas: 341 },
  { mes: 'Jun', horas: 337 },
]

const TOP_COSTOSOS_AÑO = [
  { nombre: 'Camión CMN-321', tipo: 'Flota', costoAnio: 52300000 },
  { nombre: 'Tracto TXC-987', tipo: 'Flota', costoAnio: 48500000 },
  { nombre: 'Tracto TXC-123', tipo: 'Flota', costoAnio: 44100000 },
]

const estadoVehColor = (e: string) => ({ OPERATIVO: '#32AC5C', EN_TALLER: '#F59E0B', INACTIVO: '#9CA3AF' })[e] ?? '#9CA3AF'
const sedeColor = (e: string) => ({ BUENO: '#32AC5C', REGULAR: '#F59E0B', CRITICO: '#EF4444' })[e] ?? '#9CA3AF'

const maxCosto = Math.max(...TENDENCIA_MENSUAL.map(t => t.costo))
const maxMtbf = Math.max(...MTBF_TREND.map(t => t.horas))

// ── Catálogo de reportes ─────────────────────────────────────────────────────
type CatKey = 'flota' | 'infra' | 'costos' | 'confiabilidad' | 'disponibilidad'

interface ReporteDef {
  id: string
  titulo: string
  descripcion: string
  categoria: 'Flota' | 'Infraestructura' | 'Costos' | 'Confiabilidad' | 'Gerencial'
  icon: React.ReactNode
  color: string
  fuente: CatKey
  frecuencia: string
  ultimaGeneracion: string
  formatos: string[]
  columnas: string[]
}

const REPORTES_CATALOGO: ReporteDef[] = [
  { id: 'rep-flota-consumo', titulo: 'Consumo y Rendimiento de Flota', descripcion: 'Kilometraje, litros y rendimiento por vehículo en el periodo.', categoria: 'Flota', icon: <FuelIcon />, color: '#3B82F6', fuente: 'flota', frecuencia: 'Mensual', ultimaGeneracion: '2025-06-30', formatos: ['PDF', 'Excel'], columnas: ['Placa', 'Tipo', 'Km Mes', 'Litros', 'Rendimiento', 'Costo Mes', 'Estado'] },
  { id: 'rep-flota-disp', titulo: 'Disponibilidad de Flota', descripcion: 'Porcentaje de disponibilidad y OTs abiertas por vehículo.', categoria: 'Flota', icon: <FlotaIcon />, color: EAM_COLOR, fuente: 'flota', frecuencia: 'Mensual', ultimaGeneracion: '2025-06-30', formatos: ['PDF', 'Excel'], columnas: ['Placa', 'Tipo', 'Disponibilidad', 'OTs Abiertas', 'Próximo PM', 'Estado'] },
  { id: 'rep-infra-sedes', titulo: 'Estado de Sedes e Infraestructura', descripcion: 'Estado general, inspecciones y OTs por ubicación.', categoria: 'Infraestructura', icon: <InfraIcon />, color: '#8B5CF6', fuente: 'infra', frecuencia: 'Mensual', ultimaGeneracion: '2025-06-28', formatos: ['PDF', 'Excel'], columnas: ['Sede', 'Activos', 'OTs Abiertas', 'Último Check', 'Estado'] },
  { id: 'rep-costos-top', titulo: 'Top de Costos por Activo', descripcion: 'Ranking de activos por costo de mantenimiento mensual y anual.', categoria: 'Costos', icon: <MoneyIcon />, color: '#F59E0B', fuente: 'costos', frecuencia: 'Mensual', ultimaGeneracion: '2025-06-30', formatos: ['PDF', 'Excel', 'CSV'], columnas: ['Activo', 'Tipo', 'Costo Mes', 'Costo Año', 'OTs Mes'] },
  { id: 'rep-conf-mtbf', titulo: 'Confiabilidad — MTBF / MTTR', descripcion: 'Indicadores de confiabilidad y tendencia mensual.', categoria: 'Confiabilidad', icon: <SpeedIcon />, color: '#06B6D4', fuente: 'confiabilidad', frecuencia: 'Mensual', ultimaGeneracion: '2025-06-30', formatos: ['PDF'], columnas: ['Mes', 'MTBF (h)', 'Tendencia'] },
  { id: 'rep-gerencial', titulo: 'Reporte Gerencial Ejecutivo', descripcion: 'Resumen consolidado de KPIs para presidencia.', categoria: 'Gerencial', icon: <AssessmentIcon />, color: '#EF4444', fuente: 'costos', frecuencia: 'Mensual', ultimaGeneracion: '2025-06-30', formatos: ['PDF'], columnas: ['Indicador', 'Valor', 'Objetivo'] },
]

const CATEGORIAS_REP = ['Todas', 'Flota', 'Infraestructura', 'Costos', 'Confiabilidad', 'Gerencial'] as const

// ── Disponibilidad ──────────────────────────────────────────────────────────
interface OTDisp {
  id: number
  numero: string
  activo: string
  fechaApertura: string
  fechaCierre: string
  horasMantenimiento: number
  descripcion: string
}

interface ActivoDisp {
  nombre: string
  categoria: string
}

interface PeriodoRep {
  aplica: 'todos' | 'categoria' | 'activos'
  categoria?: string
  activos?: string[]
  horasPorActivo?: Record<string, number>
  desde: string  // "YYYY-MM"
  hasta: string  // "YYYY-MM"
  horas: number
}

const ACTIVOS_DISP: ActivoDisp[] = [
  { nombre: 'VH-001 — Tractocamión Kenworth T800',    categoria: 'Vehículos'       },
  { nombre: 'VH-002 — Camión Freightliner M2-106',    categoria: 'Vehículos'       },
  { nombre: 'VH-003 — Camioneta Ford Ranger',         categoria: 'Vehículos'       },
  { nombre: 'MC-001 — Montacargas Yale GLP050',       categoria: 'Montacargas'     },
  { nombre: 'MC-003 — Montacargas Toyota 8FGCU25',   categoria: 'Montacargas'     },
  { nombre: 'MC-004 — Reach Truck Crown RR5200',      categoria: 'Montacargas'     },
  { nombre: 'CF-001 — Compresor Cuarto Frío',         categoria: 'Equipos Frío'   },
  { nombre: 'CMP-07 — Compresor Atlas Copco GA22',    categoria: 'Industrial'      },
  { nombre: 'SRV-01 — Servidor Dell PowerEdge R740',  categoria: 'TI'              },
  { nombre: 'ELV-02 — Estibador Eléctrico Still EXU', categoria: 'Industrial'      },
  { nombre: 'BD-01  — Bodega Principal Bogotá',        categoria: 'Infraestructura' },
]

const HORAS_CONFIG_DEFAULT: Record<string, number> = {
  'VH-001 — Tractocamión Kenworth T800':    720,
  'VH-002 — Camión Freightliner M2-106':    720,
  'VH-003 — Camioneta Ford Ranger':         480,
  'MC-001 — Montacargas Yale GLP050':       600,
  'MC-003 — Montacargas Toyota 8FGCU25':   600,
  'MC-004 — Reach Truck Crown RR5200':      600,
  'CF-001 — Compresor Cuarto Frío':         744,
  'CMP-07 — Compresor Atlas Copco GA22':    720,
  'SRV-01 — Servidor Dell PowerEdge R740':  744,
  'ELV-02 — Estibador Eléctrico Still EXU': 600,
  'BD-01  — Bodega Principal Bogotá':        720,
}

const OTS_DISP: OTDisp[] = [
  { id: 13, numero: 'OT-2026-0074', activo: 'VH-001 — Tractocamión Kenworth T800',   fechaApertura: '2026-06-01T07:00', fechaCierre: '2026-06-01T11:30', horasMantenimiento: 4.5,  descripcion: 'Cambio de aceite y filtros motor — mantenimiento preventivo 30.000 km' },
  { id: 14, numero: 'OT-2026-0075', activo: 'MC-003 — Montacargas Toyota 8FGCU25',  fechaApertura: '2026-06-03T08:00', fechaCierre: '2026-06-03T11:00', horasMantenimiento: 3.0,  descripcion: 'Revisión sistema hidráulico y mástil — inspección programada' },
  { id: 15, numero: 'OT-2026-0076', activo: 'SRV-01 — Servidor Dell PowerEdge R740', fechaApertura: '2026-06-05T06:00', fechaCierre: '2026-06-05T14:00', horasMantenimiento: 8.0,  descripcion: 'Actualización firmware y limpieza interna — mantenimiento semestral' },
  { id: 16, numero: 'OT-2026-0068', activo: 'MC-001 — Montacargas Yale GLP050',      fechaApertura: '2026-06-10T07:00', fechaCierre: '2026-06-11T15:00', horasMantenimiento: 32.0, descripcion: 'Reparación transmisión y embrague — falla en operación' },
  { id: 17, numero: 'OT-2026-0069', activo: 'VH-002 — Camión Freightliner M2-106',   fechaApertura: '2026-06-15T08:00', fechaCierre: '2026-06-15T12:00', horasMantenimiento: 4.0,  descripcion: 'Mantenimiento preventivo 50.000 km — frenos, suspensión y filtros' },
  { id: 18, numero: 'OT-2026-0070', activo: 'CF-001 — Compresor Cuarto Frío',        fechaApertura: '2026-06-16T00:00', fechaCierre: '2026-06-16T08:00', horasMantenimiento: 8.0,  descripcion: 'Reparación urgente compresor — falla sistema refrigeración a 0°C' },
]

// ── Estilo común de PaperProps para diálogos (tema claro) ────────────────────
const dialogPaperSx = { bgcolor: '#FFFFFF', borderRadius: '16px', border: `1px solid ${alpha(EAM_COLOR, 0.25)}` }

const RANGOS = ['Mes actual', 'Últimos 3 meses', 'Últimos 6 meses', 'Año en curso'] as const

// ── KPIs gerenciales (drill-down en tab Presidencia) ─────────────────────────
interface KpiGerencial {
  clave: string
  titulo: string
  valor: string
  objetivo: string
  color: string
  estado: 'CUMPLE' | 'EN_RIESGO' | 'INCUMPLE'
  descripcion: string
  detalle: { label: string; value: string }[]
  serie: { mes: string; valor: number }[]
}

const KPIS_GERENCIALES: Record<string, KpiGerencial> = {
  disponibilidad: {
    clave: 'disponibilidad', titulo: 'Disponibilidad General', valor: '94.2%', objetivo: '≥ 95%', color: '#32AC5C', estado: 'EN_RIESGO',
    descripcion: 'Porcentaje de tiempo en que los activos estuvieron operativos frente al total de horas planificadas.',
    detalle: [
      { label: 'Horas planificadas', value: '7,344 h' },
      { label: 'Horas no disponibles', value: '426 h' },
      { label: 'Activos por debajo del 90%', value: '2 (TXC-987, FRG-789)' },
      { label: 'Brecha vs objetivo', value: '-0.8 pp' },
    ],
    serie: [{ mes: 'Ene', valor: 92.1 }, { mes: 'Feb', valor: 93.4 }, { mes: 'Mar', valor: 91.8 }, { mes: 'Abr', valor: 93.9 }, { mes: 'May', valor: 94.8 }, { mes: 'Jun', valor: 94.2 }],
  },
  confiabilidad: {
    clave: 'confiabilidad', titulo: 'Índice de Confiabilidad', valor: '91.5 / 100', objetivo: '≥ 90', color: '#32AC5C', estado: 'CUMPLE',
    descripcion: 'Índice compuesto de MTBF, MTTR y cumplimiento de PM que mide la salud global de la operación de mantenimiento.',
    detalle: [
      { label: 'MTBF', value: '337 h' },
      { label: 'MTTR', value: '4.2 h' },
      { label: 'Fallas del mes', value: '11' },
      { label: 'Tendencia', value: '▲ +1.3 vs mayo' },
    ],
    serie: [{ mes: 'Ene', valor: 88.2 }, { mes: 'Feb', valor: 89.1 }, { mes: 'Mar', valor: 87.5 }, { mes: 'Abr', valor: 90.3 }, { mes: 'May', valor: 90.2 }, { mes: 'Jun', valor: 91.5 }],
  },
  costo: {
    clave: 'costo', titulo: 'Costo YTD vs Presupuesto', valor: '$264M / $300M', objetivo: '≤ 100%', color: '#3B82F6', estado: 'CUMPLE',
    descripcion: 'Ejecución presupuestal acumulada del año frente al presupuesto anual asignado a mantenimiento.',
    detalle: [
      { label: 'Ejecutado YTD', value: '$264M' },
      { label: 'Presupuesto anual', value: '$300M' },
      { label: 'Disponible', value: '$36M (12%)' },
      { label: 'Proyección cierre', value: '$298M (99.3%)' },
    ],
    serie: TENDENCIA_MENSUAL.map((t) => ({ mes: t.mes, valor: Math.round(t.costo / 1000000) })),
  },
  pm: {
    clave: 'pm', titulo: 'Cumplimiento PM', valor: '87%', objetivo: '≥ 90%', color: '#F59E0B', estado: 'EN_RIESGO',
    descripcion: 'Porcentaje de mantenimientos preventivos ejecutados frente a los programados en el periodo.',
    detalle: [
      { label: 'PM programados', value: '60' },
      { label: 'PM ejecutados', value: '52' },
      { label: 'PM vencidos', value: '8' },
      { label: 'Brecha vs objetivo', value: '-3 pp' },
    ],
    serie: [{ mes: 'Ene', valor: 81 }, { mes: 'Feb', valor: 84 }, { mes: 'Mar', valor: 79 }, { mes: 'Abr', valor: 88 }, { mes: 'May', valor: 90 }, { mes: 'Jun', valor: 87 }],
  },
}

const kpiEstadoColor = (e: KpiGerencial['estado']) => ({ CUMPLE: '#16A34A', EN_RIESGO: '#F59E0B', INCUMPLE: '#EF4444' })[e]

// ── Reportes programados (creación/edición) ──────────────────────────────────
interface ReporteProgramado {
  id: string
  reporte: string
  frecuencia: string
  formato: string
  destinatario: string
  proximaEjecucion: string
}

const PROGRAMADOS_INICIAL: ReporteProgramado[] = [
  { id: 'prog-1', reporte: 'Reporte Gerencial Ejecutivo', frecuencia: 'Mensual', formato: 'PDF', destinatario: 'presidencia@icoltrans.com.co', proximaEjecucion: '2025-07-31' },
  { id: 'prog-2', reporte: 'Top de Costos por Activo', frecuencia: 'Semanal', formato: 'Excel', destinatario: 'mantenimiento@icoltrans.com.co', proximaEjecucion: '2025-07-07' },
]

const FRECUENCIAS_PROG = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral'] as const
const FORMATOS_PROG = ['PDF', 'Excel', 'CSV'] as const

export default function EAMReportes() {
  const [tab, setTab] = useState(0)
  const [dispMes, setDispMes]           = useState('2026-06')
  const [expandedActivo, setExpanded]   = useState<string | null>(null)
  const [horasConfig]                   = useState<Record<string, number>>(() => {
    try {
      const s = localStorage.getItem('eam_horas_config')
      return s ? { ...HORAS_CONFIG_DEFAULT, ...JSON.parse(s) } : { ...HORAS_CONFIG_DEFAULT }
    } catch { return { ...HORAS_CONFIG_DEFAULT } }
  })

  // ── Estado de interactividad ──
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  // Catálogo de reportes
  const [catFiltro, setCatFiltro] = useState<typeof CATEGORIAS_REP[number]>('Todas')
  const [catSearch, setCatSearch] = useState('')
  const [catRango, setCatRango]   = useState<typeof RANGOS[number]>('Mes actual')
  const [repDialog, setRepDialog] = useState<ReporteDef | null>(null)

  // Diálogos de detalle de ítem
  const [vehSel, setVehSel]   = useState<VehiculoReporte | null>(null)
  const [sedeSel, setSedeSel] = useState<Sede | null>(null)
  const [costoSel, setCostoSel] = useState<CostoActivo | null>(null)
  const [otSel, setOtSel]     = useState<OTDisp | null>(null)   // OT de mantenimiento (tab Disponibilidad)
  const [kpiSel, setKpiSel]   = useState<KpiGerencial | null>(null) // drill-down KPI gerencial

  // Programación de reportes (creación) — lista mutable
  const [programados, setProgramados] = useState<ReporteProgramado[]>(PROGRAMADOS_INICIAL)
  const [progDialog, setProgDialog]   = useState(false)
  const [progForm, setProgForm]       = useState<ReporteProgramado>({ id: '', reporte: REPORTES_CATALOGO[0].titulo, frecuencia: 'Mensual', formato: 'PDF', destinatario: '', proximaEjecucion: '2025-07-31' })
  const [progTried, setProgTried]     = useState(false)

  // Reporte seleccionado en el form → formatos disponibles y autocompletado
  const progRepDef = useMemo(() => REPORTES_CATALOGO.find((r) => r.titulo === progForm.reporte), [progForm.reporte])
  const formatosProgDisp = progRepDef?.formatos ?? [...FORMATOS_PROG]
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(progForm.destinatario.trim())
  const progValido = !!progForm.reporte && !!progForm.frecuencia && !!progForm.formato && emailValido && !!progForm.proximaEjecucion

  const abrirProg = () => {
    const rep = REPORTES_CATALOGO[0]
    setProgForm({ id: '', reporte: rep.titulo, frecuencia: rep.frecuencia, formato: rep.formatos[0], destinatario: '', proximaEjecucion: '2025-07-31' })
    setProgTried(false)
    setProgDialog(true)
  }

  const guardarProg = () => {
    if (!progValido) {
      setProgTried(true)
      notify('Complete los campos obligatorios del reporte programado', 'warning')
      return
    }
    const nuevo: ReporteProgramado = { ...progForm, destinatario: progForm.destinatario.trim(), id: `prog-${Date.now()}` }
    setProgramados((prev) => [...prev, nuevo])
    setProgDialog(false)
    notify(`Reporte "${nuevo.reporte}" programado (${nuevo.frecuencia})`)
  }

  // Filtros de tablas
  const [vehSearch, setVehSearch]   = useState('')
  const [vehEstado, setVehEstado]   = useState('Todos')
  const [sedeEstado, setSedeEstado] = useState('Todos')
  const [costoTipo, setCostoTipo]   = useState('Todos')

  const getPeriodos = (): PeriodoRep[] => {
    try {
      const s = localStorage.getItem('eam_periodos_config')
      return s ? JSON.parse(s) : []
    } catch { return [] }
  }

  const getHorasEfectivas = (activo: ActivoDisp): number => {
    const periodos = getPeriodos()
    const matching = periodos.filter((p) => {
      if (dispMes < p.desde || dispMes > p.hasta) return false
      if (p.aplica === 'todos') return true
      if (p.aplica === 'categoria') return activo.categoria === p.categoria
      if (p.aplica === 'activos') return p.activos?.includes(activo.nombre) ?? false
      return false
    })
    if (matching.length > 0) {
      const byActivo = matching.find((p) => p.aplica === 'activos')
      if (byActivo) {
        if (byActivo.horasPorActivo?.[activo.nombre] !== undefined) {
          return byActivo.horasPorActivo[activo.nombre]
        }
        return byActivo.horas
      }
      const byCat = matching.find((p) => p.aplica === 'categoria')
      if (byCat) return byCat.horas
      return matching[0].horas
    }
    return horasConfig[activo.nombre] ?? 720
  }

  // ── Datos filtrados ──
  const vehiculosFiltrados = useMemo(() => VEHICULOS.filter((v) => {
    if (vehEstado !== 'Todos' && v.estado !== vehEstado) return false
    if (vehSearch.trim()) {
      const q = vehSearch.toLowerCase()
      if (!v.placa.toLowerCase().includes(q) && !v.tipo.toLowerCase().includes(q) && !(v.conductor ?? '').toLowerCase().includes(q)) return false
    }
    return true
  }), [vehEstado, vehSearch])

  const sedesFiltradas = useMemo(() => SEDES.filter((s) => sedeEstado === 'Todos' || s.estadoGeneral === sedeEstado), [sedeEstado])

  const costosFiltrados = useMemo(() => COSTOS_TOP.filter((c) => costoTipo === 'Todos' || c.tipo === costoTipo), [costoTipo])

  const catalogoFiltrado = useMemo(() => REPORTES_CATALOGO.filter((r) => {
    if (catFiltro !== 'Todas' && r.categoria !== catFiltro) return false
    if (catSearch.trim()) {
      const q = catSearch.toLowerCase()
      if (!r.titulo.toLowerCase().includes(q) && !r.descripcion.toLowerCase().includes(q)) return false
    }
    return true
  }), [catFiltro, catSearch])

  // ── Datos de vista previa por reporte ──
  const previewRows = (rep: ReporteDef): { cols: string[]; rows: (string | number)[][] } => {
    switch (rep.id) {
      case 'rep-flota-consumo':
        return { cols: rep.columnas, rows: VEHICULOS.map((v) => [v.placa, v.tipo, fmtN(v.kmMes), fmtN(v.litrosMes), `${v.rendimiento} km/L`, fmt(v.costoMes), v.estado.replace('_', ' ')]) }
      case 'rep-flota-disp':
        return { cols: rep.columnas, rows: VEHICULOS.map((v) => [v.placa, v.tipo, `${v.disponibilidad ?? 0}%`, v.otsAbiertas, v.pmProximo, v.estado.replace('_', ' ')]) }
      case 'rep-infra-sedes':
        return { cols: rep.columnas, rows: SEDES.map((s) => [s.nombre, s.activos, s.otsAbiertas, s.ultimoCheck, s.estadoGeneral]) }
      case 'rep-costos-top':
        return { cols: rep.columnas, rows: COSTOS_TOP.map((c) => [c.nombre, c.tipo, fmt(c.costoMes), fmt(c.costoAnio), c.otsMes ?? 0]) }
      case 'rep-conf-mtbf':
        return { cols: rep.columnas, rows: MTBF_TREND.map((m, i) => [m.mes, m.horas, i > 0 ? (m.horas >= MTBF_TREND[i - 1].horas ? '▲ Sube' : '▼ Baja') : '—']) }
      case 'rep-gerencial':
        return {
          cols: rep.columnas,
          rows: [
            ['Disponibilidad general', '94.2%', '≥ 95%'],
            ['Índice de confiabilidad', '91.5 / 100', '≥ 90'],
            ['MTBF', '337 h', '≥ 320 h'],
            ['MTTR', '4.2 h', '≤ 5 h'],
            ['Cumplimiento PM', '87%', '≥ 90%'],
            ['Costo YTD vs presupuesto', '$264M / $300M', '≤ 100%'],
          ],
        }
      default:
        return { cols: rep.columnas, rows: [] }
    }
  }

  const exportar = (rep: ReporteDef, formato: string) => {
    notify(`Reporte "${rep.titulo}" exportado en ${formato} — Rango: ${catRango}`, 'success')
  }

  const kpiCard = (k: { label: string; value: string; icon?: React.ReactNode; color: string }, i: number) => (
    <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
      <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {k.icon && <Box sx={{ color: k.color }}>{k.icon}</Box>}
            <Box>
              <Typography variant="h5" fontWeight={700} color="#1E293B">{k.value}</Typography>
              <Typography variant="caption" color="#64748B">{k.label}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(EAM_COLOR, 0.15), color: EAM_COLOR }}>
            <ReportIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1E293B">Reportes EAM</Typography>
            <Typography variant="body2" color="#64748B">Catálogo de informes, flota, infraestructura, costos y gerencia</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ '& .MuiTab-root': { color: '#64748B', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR } }}>
            {['Catálogo', 'Flota', 'Infraestructura', 'Presidencia', 'Costos', 'Disponibilidad'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Catálogo de reportes */}
        {tab === 0 && (
          <Box>
            {/* Toolbar de filtros */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small" placeholder="Buscar reporte…" value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                sx={{ minWidth: 240, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Categoría" value={catFiltro} onChange={(e) => setCatFiltro(e.target.value as typeof CATEGORIAS_REP[number])} sx={{ minWidth: 170 }}>
                {CATEGORIAS_REP.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Rango" value={catRango} onChange={(e) => setCatRango(e.target.value as typeof RANGOS[number])} sx={{ minWidth: 180 }}>
                {RANGOS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <Button
                variant="contained" startIcon={<ScheduleIcon />}
                onClick={abrirProg}
                sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', flexShrink: 0 }}
              >
                Programar reporte
              </Button>
            </Stack>

            {/* Reportes programados */}
            {programados.length > 0 && (
              <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}`, borderRadius: '12px', p: 2, mb: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <ScheduleIcon sx={{ fontSize: 18, color: EAM_COLOR }} />
                  <Typography fontWeight={700} fontSize={13} color="#1E293B">Reportes programados</Typography>
                  <Chip label={programados.length} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.12), color: EAM_DARK, fontWeight: 700, height: 20 }} />
                </Stack>
                <Stack spacing={1}>
                  {programados.map((p) => (
                    <Stack key={p.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1} sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#F8FAFC' }}>
                      <Box flex={1}>
                        <Typography fontSize={13} fontWeight={700} color="#1E293B">{p.reporte}</Typography>
                        <Typography fontSize={11} color="#64748B">{p.destinatario || 'sin destinatario'}</Typography>
                      </Box>
                      <Chip label={p.frecuencia} size="small" sx={{ bgcolor: alpha('#3B82F6', 0.12), color: '#3B82F6', fontWeight: 700, fontSize: 10 }} />
                      <Chip label={p.formato} size="small" variant="outlined" sx={{ fontSize: 10, color: '#64748B', borderColor: '#E5E7EB' }} />
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 130 }}>
                        <ClockIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                        <Typography fontSize={11} color="#64748B">Próx: {p.proximaEjecucion}</Typography>
                      </Stack>
                      <Tooltip title="Ejecutar ahora">
                        <IconButton size="small" onClick={() => notify(`Reporte programado "${p.reporte}" ejecutado y enviado a ${p.destinatario || 'destinatario'}`)} sx={{ color: EAM_COLOR }}>
                          <ExportIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar programación">
                        <IconButton size="small" onClick={() => { setProgramados((prev) => prev.filter((x) => x.id !== p.id)); notify('Programación eliminada', 'info') }} sx={{ color: '#EF4444' }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            <Typography fontSize={12} color="#94A3B8" mb={2}>
              {catalogoFiltrado.length} reporte{catalogoFiltrado.length !== 1 ? 's' : ''} · haz clic en una tarjeta para ver la vista previa y exportar · Rango: {catRango}
            </Typography>

            <Grid container spacing={2}>
              {catalogoFiltrado.map((rep) => (
                <Grid key={rep.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    onClick={() => setRepDialog(rep)}
                    sx={{
                      background: '#FFFFFF', border: `1px solid ${alpha(rep.color, 0.3)}`, borderRadius: '14px', height: '100%',
                      cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { boxShadow: `0 6px 20px ${alpha(rep.color, 0.18)}`, transform: 'translateY(-2px)', borderColor: alpha(rep.color, 0.5) },
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box sx={{ p: 1.2, borderRadius: 2, background: alpha(rep.color, 0.15), color: rep.color }}>{rep.icon}</Box>
                        <Chip label={rep.categoria} size="small" sx={{ background: alpha(rep.color, 0.12), color: rep.color, fontWeight: 700, fontSize: 10 }} />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={700} color="#1E293B">{rep.titulo}</Typography>
                      <Typography variant="body2" color="#64748B" sx={{ minHeight: 40 }}>{rep.descripcion}</Typography>
                      <Divider sx={{ my: 1.5, borderColor: '#E5E7EB' }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <ScheduleIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                          <Typography variant="caption" color="#64748B">{rep.frecuencia}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          {rep.formatos.map((f) => (
                            <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: 9, height: 18, color: '#64748B', borderColor: '#E5E7EB' }} />
                          ))}
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={1} mt={2}>
                        <Button fullWidth size="small" variant="contained" startIcon={<ViewIcon />} onClick={(e) => { e.stopPropagation(); setRepDialog(rep) }} sx={{ bgcolor: rep.color, '&:hover': { bgcolor: rep.color, filter: 'brightness(0.92)' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
                          Generar / Ver
                        </Button>
                        <Tooltip title="Exportar rápido a PDF">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); exportar(rep, 'PDF') }} sx={{ border: `1px solid ${alpha(rep.color, 0.4)}`, color: rep.color, borderRadius: '10px' }}>
                            <ExportIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {catalogoFiltrado.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                    <Typography color="#94A3B8">No se encontraron reportes con los filtros aplicados.</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Tab 1: Flota */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Disponibilidad Flota', value: '94.2%', icon: <SpeedIcon />, color: '#32AC5C' },
                { label: 'Km Recorridos (mes)', value: fmtN(186450), icon: <FlotaIcon />, color: EAM_COLOR },
                { label: 'Consumo Combustible', value: '18,450 L', icon: <FuelIcon />, color: '#3B82F6' },
                { label: 'Rendimiento Promedio', value: '7.2 km/L', icon: <TrendIcon />, color: '#8B5CF6' },
              ].map(kpiCard)}
            </Grid>

            {/* Filtros de flota */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small" placeholder="Buscar placa, tipo o conductor…" value={vehSearch}
                onChange={(e) => setVehSearch(e.target.value)} sx={{ minWidth: 260, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Estado" value={vehEstado} onChange={(e) => setVehEstado(e.target.value)} sx={{ minWidth: 180 }}>
                {['Todos', 'OPERATIVO', 'EN_TALLER', 'INACTIVO'].map((o) => <MenuItem key={o} value={o}>{o === 'Todos' ? 'Todos' : o.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Stack>
            <Typography fontSize={12} color="#94A3B8" mb={1}>{vehiculosFiltrados.length} vehículos · clic en una fila para ver la ficha</Typography>

            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, borderBottom: `1px solid ${'#E5E7EB'}` } }}>
                    <TableCell>Placa</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Km Mes</TableCell>
                    <TableCell align="right">Litros Mes</TableCell>
                    <TableCell align="center">Rendimiento</TableCell>
                    <TableCell align="right">Costo Mes</TableCell>
                    <TableCell align="center">OTs Abiertas</TableCell>
                    <TableCell>PM Próximo</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vehiculosFiltrados.map((v, i) => (
                    <TableRow key={i} onClick={() => setVehSel(v)} sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${'#E5E7EB'}` }, '&:hover': { background: alpha(EAM_COLOR, 0.06) } }}>
                      <TableCell><Typography variant="body2" fontWeight={700} color={EAM_COLOR}>{v.placa}</Typography></TableCell>
                      <TableCell>{v.tipo}</TableCell>
                      <TableCell align="right">{fmtN(v.kmMes)}</TableCell>
                      <TableCell align="right">{fmtN(v.litrosMes)}</TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color={v.rendimiento >= 8 ? '#32AC5C' : v.rendimiento >= 7 ? '#F59E0B' : '#EF4444'}>{v.rendimiento} km/L</Typography>
                      </TableCell>
                      <TableCell align="right">{fmt(v.costoMes)}</TableCell>
                      <TableCell align="center">
                        <Chip label={v.otsAbiertas} size="small" sx={{ background: v.otsAbiertas > 0 ? alpha('#F59E0B', 0.15) : alpha('#32AC5C', 0.15), color: v.otsAbiertas > 0 ? '#F59E0B' : '#32AC5C', fontWeight: 700, minWidth: 30 }} />
                      </TableCell>
                      <TableCell><Typography variant="caption" color="#64748B">{v.pmProximo}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={v.estado.replace('_', ' ')} size="small" sx={{ background: alpha(estadoVehColor(v.estado), 0.15), color: estadoVehColor(v.estado), fontWeight: 600, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {vehiculosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ color: '#94A3B8', py: 3 }}>Sin resultados para los filtros aplicados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Infraestructura */}
        {tab === 2 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Activos Infraestructura', value: '28', color: EAM_COLOR, icon: <InfraIcon /> },
                { label: 'Inspecciones Pendientes', value: '5', color: '#F59E0B', icon: <BuildIcon /> },
                { label: 'OTs Correctivas (mes)', value: '8', color: '#EF4444', icon: <BuildIcon /> },
                { label: 'Costo Mes Infraestructura', value: '$12.4M', color: '#8B5CF6', icon: <MoneyIcon /> },
              ].map(kpiCard)}
            </Grid>

            <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Estado general" value={sedeEstado} onChange={(e) => setSedeEstado(e.target.value)} sx={{ minWidth: 180 }}>
                {['Todos', 'BUENO', 'REGULAR', 'CRITICO'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Typography fontSize={12} color="#94A3B8" mb={1}>{sedesFiltradas.length} sedes · clic en una fila para ver el detalle</Typography>

            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, borderBottom: `1px solid ${'#E5E7EB'}` } }}>
                    <TableCell>Sede / Ubicación</TableCell>
                    <TableCell align="center">Activos</TableCell>
                    <TableCell align="center">OTs Abiertas</TableCell>
                    <TableCell>Último Check</TableCell>
                    <TableCell align="center">Estado General</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sedesFiltradas.map((s, i) => (
                    <TableRow key={i} onClick={() => setSedeSel(s)} sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${'#E5E7EB'}` }, '&:hover': { background: alpha(EAM_COLOR, 0.06) } }}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{s.nombre}</Typography></TableCell>
                      <TableCell align="center">{s.activos}</TableCell>
                      <TableCell align="center">
                        <Chip label={s.otsAbiertas} size="small" sx={{ background: s.otsAbiertas > 0 ? alpha('#F59E0B', 0.15) : alpha('#32AC5C', 0.15), color: s.otsAbiertas > 0 ? '#F59E0B' : '#32AC5C', fontWeight: 700, minWidth: 30 }} />
                      </TableCell>
                      <TableCell>{s.ultimoCheck}</TableCell>
                      <TableCell align="center">
                        <Chip label={s.estadoGeneral} size="small" sx={{ background: alpha(sedeColor(s.estadoGeneral), 0.15), color: sedeColor(s.estadoGeneral), fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {sedesFiltradas.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: '#94A3B8', py: 3 }}>Sin resultados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: Presidencia */}
        {tab === 3 && (
          <Box>
            <Typography variant="subtitle1" color="#64748B" mb={3} fontWeight={600}>Dashboard Ejecutivo — Junio 2025</Typography>
            <Grid container spacing={3}>
              {/* Disponibilidad gauge */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card onClick={() => setKpiSel(KPIS_GERENCIALES.disponibilidad)} sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { boxShadow: `0 6px 20px ${alpha(EAM_COLOR, 0.18)}`, transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>Disponibilidad General</Typography>
                    <Box sx={{ position: 'relative', width: 160, height: 160, mx: 'auto', mb: 1 }}>
                      <Box sx={{ width: 160, height: 160, borderRadius: '50%', background: `conic-gradient(${EAM_COLOR} 0% 94.2%, ${'#E5E7EB'} 94.2% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <Typography variant="h4" fontWeight={800} color={EAM_COLOR}>94.2%</Typography>
                          <Typography variant="caption" color="#64748B">Disponibilidad</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="#64748B">Objetivo: ≥ 95%</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Índice confiabilidad */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card onClick={() => setKpiSel(KPIS_GERENCIALES.confiabilidad)} sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#32AC5C', 0.3)}`, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { boxShadow: `0 6px 20px ${alpha(EAM_COLOR, 0.18)}`, transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>Índice de Confiabilidad Global</Typography>
                    <Typography variant="h2" fontWeight={900} color="#32AC5C" sx={{ lineHeight: 1.1 }}>91.5</Typography>
                    <Typography variant="h6" color="#64748B">/ 100</Typography>
                    <Divider sx={{ borderColor: '#E5E7EB', my: 2 }} />
                    <Stack direction="row" justifyContent="space-around">
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight={700} color="#1E293B">337h</Typography>
                        <Typography variant="caption" color="#64748B">MTBF</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight={700} color="#1E293B">4.2h</Typography>
                        <Typography variant="caption" color="#64748B">MTTR</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Costo vs presupuesto */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card onClick={() => setKpiSel(KPIS_GERENCIALES.costo)} sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#3B82F6', 0.3)}`, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { boxShadow: `0 6px 20px ${alpha('#3B82F6', 0.18)}`, transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>Costo Mantenimiento YTD vs Presupuesto</Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="#64748B">Ejecutado</Typography>
                          <Typography variant="caption" fontWeight={700} color="#1E293B">$264M</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={88} sx={{ height: 10, borderRadius: 5, backgroundColor: alpha('#3B82F6', 0.15), '& .MuiLinearProgress-bar': { backgroundColor: '#3B82F6', borderRadius: 5 } }} />
                      </Box>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="#64748B">Presupuestado</Typography>
                          <Typography variant="caption" fontWeight={700} color="#1E293B">$300M</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={100} sx={{ height: 10, borderRadius: 5, backgroundColor: alpha('#32AC5C', 0.15), '& .MuiLinearProgress-bar': { backgroundColor: alpha('#32AC5C', 0.4), borderRadius: 5 } }} />
                      </Box>
                      <Typography variant="caption" color="#32AC5C" fontWeight={700}>✓ 88% ejecutado — $36M disponibles</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cumplimiento PM */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card onClick={() => setKpiSel(KPIS_GERENCIALES.pm)} sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}`, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { boxShadow: `0 6px 20px ${alpha(EAM_COLOR, 0.18)}`, transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>Cumplimiento PM</Typography>
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box flex={1}>
                        <Stack direction="row" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="#334155">Mantenimientos realizados</Typography>
                          <Typography variant="body2" fontWeight={700} color={EAM_COLOR}>87%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={87} sx={{ height: 16, borderRadius: 8, backgroundColor: alpha(EAM_COLOR, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: EAM_COLOR, borderRadius: 8 } }} />
                        <Stack direction="row" justifyContent="space-between" mt={0.5}>
                          <Typography variant="caption" color="#64748B">52 de 60 PM programados</Typography>
                          <Typography variant="caption" color="#64748B">Objetivo: 90%</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* MTBF Trend */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>MTBF Últimos 6 Meses (horas)</Typography>
                    <Stack spacing={1}>
                      {MTBF_TREND.map((m, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                          <Typography variant="caption" color="#64748B" sx={{ width: 28 }}>{m.mes}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 8, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(m.horas / maxMtbf) * 100}%`, background: m.horas >= 330 ? '#32AC5C' : m.horas >= 300 ? EAM_COLOR : '#EF4444', borderRadius: 4, transition: 'width 0.5s ease' }} />
                            </Box>
                          </Box>
                          <Typography variant="caption" color="#1E293B" fontWeight={700} sx={{ width: 40, textAlign: 'right' }}>{m.horas}h</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top 3 costosos */}
              <Grid size={{ xs: 12 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <StarsIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                      <Typography variant="subtitle2" color="#64748B" fontWeight={600}>Top 3 Activos con Mayor Costo de Mantenimiento (Año)</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      {TOP_COSTOSOS_AÑO.map((t, i) => {
                        const costo = COSTOS_TOP.find((c) => c.nombre === t.nombre)
                        return (
                          <Grid key={i} size={{ xs: 12, md: 4 }}>
                            <Box
                              onClick={() => costo && setCostoSel(costo)}
                              sx={{ p: 2, borderRadius: 2, background: alpha(i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#B45309', 0.1), border: `1px solid ${alpha(i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#B45309', 0.3)}`, cursor: costo ? 'pointer' : 'default', transition: 'transform 0.15s', '&:hover': costo ? { transform: 'translateY(-2px)' } : {} }}
                            >
                              <Typography variant="caption" color={i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#B45309'} fontWeight={700}>#{i + 1}</Typography>
                              <Typography variant="body1" fontWeight={700} color="#1E293B">{t.nombre}</Typography>
                              <Typography variant="caption" color="#64748B">{t.tipo}</Typography>
                              <Typography variant="h6" fontWeight={800} color="#1E293B" mt={1}>{fmt(t.costoAnio)}</Typography>
                              <Typography variant="caption" color="#64748B">Costo acumulado 2025 · clic para detalle</Typography>
                            </Box>
                          </Grid>
                        )
                      })}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 4: Costos */}
        {tab === 4 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Costo Total Mes', value: '$48.2M', color: EAM_COLOR, icon: <MoneyIcon /> },
                { label: 'Mano de Obra', value: '$12.3M', color: '#3B82F6', icon: <BuildIcon /> },
                { label: 'Repuestos', value: '$28.4M', color: '#F59E0B', icon: <BuildIcon /> },
                { label: 'Servicios Externos', value: '$7.5M', color: '#8B5CF6', icon: <MoneyIcon /> },
              ].map(kpiCard)}
            </Grid>

            <Grid container spacing={3}>
              {/* Breakdown por tipo OT */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>Distribución por Tipo de OT</Typography>
                    <Stack spacing={2}>
                      {[
                        { tipo: 'CORRECTIVA', pct: 52, color: '#EF4444' },
                        { tipo: 'PREVENTIVA', pct: 35, color: '#32AC5C' },
                        { tipo: 'PREDICTIVA', pct: 8, color: '#8B5CF6' },
                        { tipo: 'EMERGENCIA', pct: 5, color: '#F97316' },
                      ].map((t, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="#334155">{t.tipo}</Typography>
                            <Typography variant="body2" fontWeight={700} color={t.color}>{t.pct}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={t.pct} sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(t.color, 0.1), '& .MuiLinearProgress-bar': { backgroundColor: t.color, borderRadius: 4 } }} />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Tendencia mensual */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="#64748B" mb={2} fontWeight={600}>Tendencia Costo Mensual (últimos 6 meses)</Typography>
                    <Stack spacing={1.5}>
                      {TENDENCIA_MENSUAL.map((m, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={2}>
                          <Typography variant="caption" color="#64748B" sx={{ width: 28 }}>{m.mes}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 20, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden', position: 'relative' }}>
                              <Box sx={{ height: '100%', width: `${(m.costo / maxCosto) * 100}%`, background: i === 5 ? EAM_COLOR : alpha(EAM_COLOR, 0.5), borderRadius: 4, transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" color="white" fontWeight={700} noWrap sx={{ fontSize: 11 }}>{fmt(m.costo)}</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top 10 activos costosos */}
              <Grid size={{ xs: 12 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${'#E5E7EB'}` }}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle2" color="#64748B" fontWeight={600} flex={1}>Top 10 Activos por Costo de Mantenimiento</Typography>
                      <TextField select size="small" label="Tipo" value={costoTipo} onChange={(e) => setCostoTipo(e.target.value)} sx={{ minWidth: 170 }}>
                        {['Todos', 'Flota', 'Infraestructura'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </TextField>
                    </Stack>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, borderBottom: `1px solid ${'#E5E7EB'}` } }}>
                            <TableCell>#</TableCell>
                            <TableCell>Activo</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell align="right">Costo Mes</TableCell>
                            <TableCell align="right">Costo Año</TableCell>
                            <TableCell>Proporción</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {costosFiltrados.map((c, i) => (
                            <TableRow key={i} onClick={() => setCostoSel(c)} sx={{ cursor: 'pointer', '& td': { color: '#334155', borderBottom: `1px solid ${'#E5E7EB'}` }, '&:hover': { background: alpha(EAM_COLOR, 0.06) } }}>
                              <TableCell><Typography variant="body2" fontWeight={700} color="#64748B">#{i + 1}</Typography></TableCell>
                              <TableCell><Typography variant="body2" fontWeight={600}>{c.nombre}</Typography></TableCell>
                              <TableCell><Chip label={c.tipo} size="small" sx={{ background: alpha(c.tipo === 'Flota' ? EAM_COLOR : '#8B5CF6', 0.15), color: c.tipo === 'Flota' ? EAM_COLOR : '#8B5CF6', fontSize: 10 }} /></TableCell>
                              <TableCell align="right">{fmt(c.costoMes)}</TableCell>
                              <TableCell align="right"><Typography fontWeight={600}>{fmt(c.costoAnio)}</Typography></TableCell>
                              <TableCell sx={{ width: 120 }}>
                                <LinearProgress variant="determinate" value={Math.round((c.costoMes / 6200000) * 100)} sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(EAM_COLOR, 0.1), '& .MuiLinearProgress-bar': { backgroundColor: EAM_COLOR, borderRadius: 3 } }} />
                              </TableCell>
                            </TableRow>
                          ))}
                          {costosFiltrados.length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ color: '#94A3B8', py: 3 }}>Sin resultados.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 5: Disponibilidad */}
        {tab === 5 && (() => {
          const otsMes = OTS_DISP.filter((o) => o.fechaCierre.startsWith(dispMes))

          const horasNoDisp: Record<string, number> = {}
          otsMes.forEach((o) => {
            horasNoDisp[o.activo] = Math.round(((horasNoDisp[o.activo] ?? 0) + o.horasMantenimiento) * 100) / 100
          })

          const rows = ACTIVOS_DISP.map((a) => {
            const horasEsp = getHorasEfectivas(a)
            const horasND  = Math.round((horasNoDisp[a.nombre] ?? 0) * 100) / 100
            const horasDis = Math.max(0, horasEsp - horasND)
            const disp     = horasEsp > 0 ? (horasDis / horasEsp) * 100 : 100
            return { ...a, horasEsp, horasND, horasDis, disp }
          })

          const promedioDisp = rows.reduce((s, r) => s + r.disp, 0) / rows.length
          const criticos     = rows.filter((r) => r.disp < 90).length
          const totalHorasND = Math.round(rows.reduce((s, r) => s + r.horasND, 0) * 100) / 100

          return (
            <Box>
              {/* Month picker + KPIs */}
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} mb={3}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    size="small" label="Mes" type="month"
                    value={dispMes} onChange={(e) => { setDispMes(e.target.value); setExpanded(null) }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 170 }}
                  />
                </Stack>
              </Stack>

              {/* KPI cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
                {[
                  { label: 'Disponibilidad promedio', value: `${promedioDisp.toFixed(1)}%`, color: promedioDisp >= 95 ? '#10B981' : promedioDisp >= 90 ? '#F59E0B' : '#EF4444' },
                  { label: 'Activos críticos (<90%)',  value: String(criticos),               color: criticos === 0 ? '#10B981' : '#EF4444' },
                  { label: 'Total horas no disponibles', value: `${totalHorasND}h`,           color: '#F59E0B' },
                ].map(({ label, value, color }) => (
                  <Paper key={label} elevation={0} sx={{ border: `1px solid rgba(50,172,92,0.12)`, borderRadius: '12px', p: 2 }}>
                    <Typography fontSize={11} color="#64748B" fontWeight={600} textTransform="uppercase" letterSpacing="0.04em">{label}</Typography>
                    <Typography fontSize={28} fontWeight={900} color={color} mt={0.5}>{value}</Typography>
                  </Paper>
                ))}
              </Box>

              {/* Asset availability table */}
              <Paper elevation={0} sx={{ border: '1px solid rgba(50,172,92,0.12)', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Table header */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '36px 2fr 130px 100px 100px 100px 130px', gap: 1, px: 2, py: 1.25, bgcolor: alpha(EAM_COLOR, 0.06), borderBottom: '1px solid #E5E7EB' }}>
                  {['', 'Activo', 'Categoría', 'Horas mes', 'No disp.', 'Disponibles', 'Disponibilidad'].map((h, i) => (
                    <Typography key={i} fontSize={10} fontWeight={700} color="#64748B" letterSpacing="0.05em" textTransform="uppercase">{h}</Typography>
                  ))}
                </Box>

                {rows.map((r) => {
                  const dispColor  = r.disp >= 95 ? '#10B981' : r.disp >= 90 ? '#F59E0B' : '#EF4444'
                  const otsActivo  = otsMes.filter((o) => o.activo === r.nombre)
                  const isExpanded = expandedActivo === r.nombre
                  return (
                    <Box key={r.nombre}>
                      {/* Row */}
                      <Box
                        onClick={() => setExpanded(isExpanded ? null : r.nombre)}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '36px 2fr 130px 100px 100px 100px 130px',
                          gap: 1, px: 2, py: 1.25,
                          borderBottom: isExpanded ? 'none' : '1px solid #E5E7EB',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha('#000', 0.025) },
                          bgcolor: isExpanded ? alpha(EAM_COLOR, 0.04) : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <IconButton size="small" sx={{ color: 'text.disabled', p: 0.25 }}>
                          {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                        <Box>
                          <Typography fontSize={12} fontWeight={600} color="#1E293B" noWrap>{r.nombre.split('—')[0].trim()}</Typography>
                          <Typography fontSize={10} color="#64748B" noWrap>{r.nombre.split('—')[1]?.trim()}</Typography>
                        </Box>
                        <Chip label={r.categoria} size="small" sx={{ bgcolor: alpha('#6B7280', 0.15), color: '#9CA3AF', fontSize: 10, height: 20, fontWeight: 600 }} />
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography fontSize={14} fontWeight={700} color="#1E293B">{r.horasEsp}h</Typography>
                          <Typography fontSize={9} color="#64748B">configurado</Typography>
                        </Box>
                        <Typography fontSize={13} fontWeight={700} color="#F59E0B">{r.horasND}h</Typography>
                        <Typography fontSize={13} fontWeight={700} color="#3B82F6">{r.horasDis.toFixed(1)}h</Typography>
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                            <Typography fontSize={14} fontWeight={900} color={dispColor}>{r.disp.toFixed(1)}%</Typography>
                            <Chip label={r.disp >= 95 ? 'Óptimo' : r.disp >= 90 ? 'Aceptable' : 'Crítico'} size="small"
                              sx={{ bgcolor: alpha(dispColor, 0.15), color: dispColor, border: `1px solid ${alpha(dispColor, 0.3)}`, fontWeight: 700, fontSize: 9, height: 18 }} />
                          </Stack>
                          <Box sx={{ height: 4, borderRadius: '2px', bgcolor: '#E5E7EB', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${Math.min(r.disp, 100)}%`, bgcolor: dispColor, borderRadius: '2px', transition: 'width 0.4s' }} />
                          </Box>
                        </Box>
                      </Box>

                      {/* Expandable OT panel */}
                      <Collapse in={isExpanded} unmountOnExit>
                        <Box sx={{ mx: 2, mb: 1.5, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                          {otsActivo.length === 0 ? (
                            <Box sx={{ py: 2.5, textAlign: 'center' }}>
                              <Typography fontSize={12} color="#64748B">Sin órdenes de trabajo completadas en {dispMes}</Typography>
                            </Box>
                          ) : (
                            <>
                              {/* OT list header */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr 220px 90px', gap: 1.5, px: 2, py: 1, bgcolor: alpha('#000', 0.03), borderBottom: '1px solid #E5E7EB' }}>
                                {['Número OT', 'Descripción', 'Apertura → Cierre', 'Horas'].map((h) => (
                                  <Typography key={h} fontSize={9} fontWeight={700} color="#64748B" letterSpacing="0.05em" textTransform="uppercase">{h}</Typography>
                                ))}
                              </Box>

                              {otsActivo.map((o) => (
                                <Box key={o.id} onClick={(e) => { e.stopPropagation(); setOtSel(o) }} sx={{ display: 'grid', gridTemplateColumns: '130px 1fr 220px 90px', gap: 1.5, px: 2, py: 1, borderBottom: '1px solid #E5E7EB', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) }, '&:last-of-type': { borderBottom: 'none' } }}>
                                  <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>{o.numero}</Typography>
                                  <Typography fontSize={11} color="#334155" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.descripcion}</Typography>
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <ClockIcon sx={{ fontSize: 12, color: '#64748B' }} />
                                    <Typography fontSize={10} color="#64748B" noWrap>
                                      {o.fechaApertura.replace('T', ' ')} → {o.fechaCierre.replace('T', ' ')}
                                    </Typography>
                                  </Stack>
                                  <Chip label={`${o.horasMantenimiento}h`} size="small"
                                    sx={{ bgcolor: alpha('#F59E0B', 0.12), color: '#F59E0B', fontWeight: 700, fontSize: 10, height: 20 }} />
                                </Box>
                              ))}

                              {/* Sum row */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr 220px 90px', gap: 1.5, px: 2, py: 1, bgcolor: alpha('#F59E0B', 0.06), borderTop: '1px solid rgba(245,158,11,0.2)', alignItems: 'center' }}>
                                <Box />
                                <Typography fontSize={10} fontWeight={700} color="#64748B" textTransform="uppercase" letterSpacing="0.04em">Total horas no disponibles</Typography>
                                <Box />
                                <Chip
                                  label={`${r.horasND}h`}
                                  size="small"
                                  sx={{ bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B', fontWeight: 900, fontSize: 11, height: 22, border: `1px solid ${alpha('#F59E0B', 0.4)}` }}
                                />
                              </Box>
                            </>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  )
                })}
              </Paper>

              {otsMes.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography fontSize={13} color="#64748B">
                    No hay órdenes de trabajo completadas en {dispMes}. La disponibilidad es 100% para todos los activos.
                  </Typography>
                </Box>
              )}
            </Box>
          )
        })()}
      </Box>

      {/* ── Dialog: Vista previa de reporte ── */}
      <Dialog open={!!repDialog} onClose={() => setRepDialog(null)} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {repDialog && (() => {
          const { cols, rows } = previewRows(repDialog)
          return (
            <>
              <DialogTitle sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ p: 1.2, borderRadius: 2, background: alpha(repDialog.color, 0.15), color: repDialog.color }}>{repDialog.icon}</Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={800} color="#1E293B">{repDialog.titulo}</Typography>
                    <Typography variant="caption" color="#64748B">{repDialog.categoria} · {repDialog.frecuencia} · Rango: {catRango}</Typography>
                  </Box>
                  <IconButton onClick={() => setRepDialog(null)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
                </Stack>
              </DialogTitle>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogContent sx={{ p: 2.5 }}>
                <Typography variant="body2" color="#64748B" mb={2}>{repDialog.descripcion}</Typography>

                {/* Resumen */}
                <Grid container spacing={1.5} mb={2.5}>
                  {[
                    { label: 'Registros', value: String(rows.length), color: EAM_COLOR },
                    { label: 'Última generación', value: repDialog.ultimaGeneracion, color: '#3B82F6' },
                    { label: 'Formatos', value: repDialog.formatos.join(' · '), color: '#8B5CF6' },
                  ].map((s) => (
                    <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
                      <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${alpha(s.color, 0.25)}`, borderRadius: '10px', bgcolor: '#FFFFFF' }}>
                        <Typography fontSize={10} color="#94A3B8" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em">{s.label}</Typography>
                        <Typography fontSize={16} fontWeight={800} color={s.color}>{s.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <HistoryIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                  <Typography fontWeight={700} fontSize={13} color="#1E293B">Vista previa de datos</Typography>
                </Stack>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '10px', maxHeight: 340 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 700, background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' } }}>
                        {cols.map((c) => <TableCell key={c}>{c}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row, ri) => (
                        <TableRow key={ri} sx={{ '& td': { color: '#334155', borderBottom: '1px solid #F1F5F9' }, '&:hover': { background: alpha(EAM_COLOR, 0.04) } }}>
                          {row.map((cell, ci) => (
                            <TableCell key={ci}>
                              <Typography variant="body2" fontWeight={ci === 0 ? 700 : 400} color={ci === 0 ? '#1E293B' : '#334155'}>{cell}</Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
                <Button onClick={() => setRepDialog(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Box flex={1} />
                {repDialog.formatos.includes('Excel') && (
                  <Button variant="outlined" startIcon={<ExcelIcon />} onClick={() => exportar(repDialog, 'Excel')} sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Excel</Button>
                )}
                {repDialog.formatos.includes('CSV') && (
                  <Button variant="outlined" startIcon={<DocIcon />} onClick={() => exportar(repDialog, 'CSV')} sx={{ color: '#3B82F6', borderColor: alpha('#3B82F6', 0.4), textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>CSV</Button>
                )}
                <Button variant="contained" startIcon={<PdfIcon />} onClick={() => exportar(repDialog, 'PDF')} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Exportar PDF</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de vehículo ── */}
      <Dialog open={!!vehSel} onClose={() => setVehSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {vehSel && (
          <>
            <DialogTitle sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: EAM_COLOR }}><FlotaIcon /></Box>
                <Box flex={1}>
                  <Typography variant="h6" fontWeight={800} color={EAM_COLOR}>{vehSel.placa}</Typography>
                  <Typography variant="caption" color="#64748B">{vehSel.tipo} · {vehSel.ubicacion} · {vehSel.conductor}</Typography>
                </Box>
                <Chip label={vehSel.estado.replace('_', ' ')} size="small" sx={{ background: alpha(estadoVehColor(vehSel.estado), 0.15), color: estadoVehColor(vehSel.estado), fontWeight: 700, fontSize: 10 }} />
                <IconButton onClick={() => setVehSel(null)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
              </Stack>
            </DialogTitle>
            <Divider sx={{ borderColor: '#E5E7EB' }} />
            <DialogContent sx={{ p: 2.5 }}>
              {/* KPIs */}
              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: 'Disponibilidad', value: `${vehSel.disponibilidad ?? 0}%`, color: (vehSel.disponibilidad ?? 0) >= 95 ? '#16A34A' : (vehSel.disponibilidad ?? 0) >= 85 ? '#F59E0B' : '#EF4444' },
                  { label: 'Rendimiento', value: `${vehSel.rendimiento} km/L`, color: '#3B82F6' },
                  { label: 'Costo Mes', value: fmt(vehSel.costoMes), color: EAM_DARK },
                  { label: 'Costo Año', value: fmt(vehSel.costoAnio ?? 0), color: '#8B5CF6' },
                ].map((k) => (
                  <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
                    <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${alpha(k.color, 0.25)}`, borderRadius: '10px', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                      <Typography fontSize={15} fontWeight={800} color={k.color} noWrap>{k.value}</Typography>
                      <Typography fontSize={10} color="#64748B">{k.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px', mb: 2 }}>
                <Typography fontWeight={700} fontSize={13} color="#1E293B" mb={1.5}>Ficha operativa</Typography>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Km recorridos (mes)', value: `${fmtN(vehSel.kmMes)} km` },
                    { label: 'Combustible (mes)', value: `${fmtN(vehSel.litrosMes)} L` },
                    { label: 'OTs abiertas', value: String(vehSel.otsAbiertas) },
                    { label: 'Último PM', value: vehSel.ultimoPM ?? '—' },
                    { label: 'Próximo PM', value: vehSel.pmProximo },
                    { label: 'Conductor', value: vehSel.conductor ?? '—' },
                  ].map((f) => (
                    <Grid key={f.label} size={{ xs: 6, sm: 4 }}>
                      <Typography fontSize={10} color="#94A3B8" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em">{f.label}</Typography>
                      <Typography fontSize={13} fontWeight={600} color="#1E293B">{f.value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Box mb={2}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography fontSize={11} color="#64748B">Disponibilidad operativa</Typography>
                  <Typography fontSize={11} fontWeight={700} color={(vehSel.disponibilidad ?? 0) >= 95 ? '#16A34A' : (vehSel.disponibilidad ?? 0) >= 85 ? '#F59E0B' : '#EF4444'}>{vehSel.disponibilidad ?? 0}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={vehSel.disponibilidad ?? 0} sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: (vehSel.disponibilidad ?? 0) >= 95 ? '#16A34A' : (vehSel.disponibilidad ?? 0) >= 85 ? '#F59E0B' : '#EF4444', borderRadius: 5 } }} />
              </Box>

              <Paper elevation={0} sx={{ p: 2, border: `1px solid ${alpha('#F59E0B', 0.3)}`, borderRadius: '10px', bgcolor: alpha('#F59E0B', 0.05) }}>
                <Typography fontSize={11} fontWeight={700} color="#B45309" textTransform="uppercase" letterSpacing="0.05em" mb={0.5}>Observaciones</Typography>
                <Typography fontSize={13} color="#334155">{vehSel.observaciones}</Typography>
              </Paper>
            </DialogContent>
            <Divider sx={{ borderColor: '#E5E7EB' }} />
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setVehSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
              <Button variant="contained" startIcon={<ExportIcon />} onClick={() => { notify(`Ficha del vehículo ${vehSel.placa} exportada a PDF`); }} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Exportar ficha</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: Detalle de sede ── */}
      <Dialog open={!!sedeSel} onClose={() => setSedeSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {sedeSel && (
          <>
            <DialogTitle sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: EAM_COLOR }}><InfraIcon /></Box>
                <Box flex={1}>
                  <Typography variant="h6" fontWeight={800} color="#1E293B">{sedeSel.nombre}</Typography>
                  <Typography variant="caption" color="#64748B">Responsable: {sedeSel.responsable} · {sedeSel.area} m²</Typography>
                </Box>
                <Chip label={sedeSel.estadoGeneral} size="small" sx={{ background: alpha(sedeColor(sedeSel.estadoGeneral), 0.15), color: sedeColor(sedeSel.estadoGeneral), fontWeight: 700, fontSize: 10 }} />
                <IconButton onClick={() => setSedeSel(null)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
              </Stack>
            </DialogTitle>
            <Divider sx={{ borderColor: '#E5E7EB' }} />
            <DialogContent sx={{ p: 2.5 }}>
              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: 'Activos', value: String(sedeSel.activos), color: EAM_COLOR },
                  { label: 'OTs abiertas', value: String(sedeSel.otsAbiertas), color: sedeSel.otsAbiertas > 0 ? '#F59E0B' : '#16A34A' },
                  { label: 'Incidencias', value: String(sedeSel.incidencias ?? 0), color: (sedeSel.incidencias ?? 0) > 2 ? '#EF4444' : '#16A34A' },
                  { label: 'Costo Mes', value: fmt(sedeSel.costoMes ?? 0), color: '#8B5CF6' },
                ].map((k) => (
                  <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
                    <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${alpha(k.color, 0.25)}`, borderRadius: '10px', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                      <Typography fontSize={15} fontWeight={800} color={k.color} noWrap>{k.value}</Typography>
                      <Typography fontSize={10} color="#64748B">{k.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                <Typography fontWeight={700} fontSize={13} color="#1E293B" mb={1.5}>Información de la sede</Typography>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Área construida', value: `${fmtN(sedeSel.area ?? 0)} m²` },
                    { label: 'Último check', value: sedeSel.ultimoCheck },
                    { label: 'Próxima inspección', value: sedeSel.proximaInspeccion ?? '—' },
                    { label: 'Responsable', value: sedeSel.responsable ?? '—' },
                    { label: 'Estado general', value: sedeSel.estadoGeneral },
                    { label: 'Incidencias abiertas', value: String(sedeSel.incidencias ?? 0) },
                  ].map((f) => (
                    <Grid key={f.label} size={{ xs: 6, sm: 4 }}>
                      <Typography fontSize={10} color="#94A3B8" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em">{f.label}</Typography>
                      <Typography fontSize={13} fontWeight={600} color="#1E293B">{f.value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </DialogContent>
            <Divider sx={{ borderColor: '#E5E7EB' }} />
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSedeSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
              <Button variant="contained" startIcon={<ExportIcon />} onClick={() => notify(`Reporte de la sede "${sedeSel.nombre}" exportado a PDF`)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Exportar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: Detalle de costo por activo ── */}
      <Dialog open={!!costoSel} onClose={() => setCostoSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {costoSel && (() => {
          const desglose = [
            { label: 'Mano de obra', value: costoSel.manoObra ?? 0, color: '#3B82F6' },
            { label: 'Repuestos', value: costoSel.repuestos ?? 0, color: '#F59E0B' },
            { label: 'Servicios externos', value: costoSel.externos ?? 0, color: '#8B5CF6' },
          ]
          const totalDesglose = desglose.reduce((s, d) => s + d.value, 0) || 1
          return (
            <>
              <DialogTitle sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ color: EAM_COLOR }}><MoneyIcon /></Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={800} color="#1E293B">{costoSel.nombre}</Typography>
                    <Typography variant="caption" color="#64748B">Análisis de costos de mantenimiento</Typography>
                  </Box>
                  <Chip label={costoSel.tipo} size="small" sx={{ background: alpha(costoSel.tipo === 'Flota' ? EAM_COLOR : '#8B5CF6', 0.15), color: costoSel.tipo === 'Flota' ? EAM_COLOR : '#8B5CF6', fontWeight: 700, fontSize: 10 }} />
                  <IconButton onClick={() => setCostoSel(null)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
                </Stack>
              </DialogTitle>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogContent sx={{ p: 2.5 }}>
                <Grid container spacing={1.5} mb={2}>
                  {[
                    { label: 'Costo Mes', value: fmt(costoSel.costoMes), color: EAM_DARK },
                    { label: 'Costo Año', value: fmt(costoSel.costoAnio), color: '#EF4444' },
                    { label: 'OTs del mes', value: String(costoSel.otsMes ?? 0), color: '#3B82F6' },
                  ].map((k) => (
                    <Grid key={k.label} size={{ xs: 4 }}>
                      <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${alpha(k.color, 0.25)}`, borderRadius: '10px', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                        <Typography fontSize={14} fontWeight={800} color={k.color} noWrap>{k.value}</Typography>
                        <Typography fontSize={10} color="#64748B">{k.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                  <Typography fontWeight={700} fontSize={13} color="#1E293B" mb={1.5}>Desglose de costo mensual</Typography>
                  <Stack spacing={1.75}>
                    {desglose.map((d) => (
                      <Box key={d.label}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="#334155">{d.label}</Typography>
                          <Typography variant="body2" fontWeight={700} color={d.color}>{fmt(d.value)} · {Math.round((d.value / totalDesglose) * 100)}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={(d.value / totalDesglose) * 100} sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(d.color, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: d.color, borderRadius: 4 } }} />
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </DialogContent>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setCostoSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button variant="contained" startIcon={<ExportIcon />} onClick={() => notify(`Detalle de costos de "${costoSel.nombre}" exportado a PDF`)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Exportar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de OT de mantenimiento (tab Disponibilidad) ── */}
      <Dialog open={!!otSel} onClose={() => setOtSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {otSel && (() => {
          const apertura = otSel.fechaApertura.replace('T', ' ')
          const cierre = otSel.fechaCierre.replace('T', ' ')
          const activoNombre = otSel.activo.split('—')[0].trim()
          const activoDesc = otSel.activo.split('—')[1]?.trim() ?? ''
          return (
            <>
              <DialogTitle sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ color: EAM_COLOR }}><BuildIcon /></Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={800} color={EAM_COLOR}>{otSel.numero}</Typography>
                    <Typography variant="caption" color="#64748B">{activoNombre} · {activoDesc}</Typography>
                  </Box>
                  <Chip label={`${otSel.horasMantenimiento}h`} size="small" sx={{ background: alpha('#F59E0B', 0.15), color: '#B45309', fontWeight: 700 }} />
                  <IconButton onClick={() => setOtSel(null)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
                </Stack>
              </DialogTitle>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogContent sx={{ p: 2.5 }}>
                <Grid container spacing={1.5} mb={2}>
                  {[
                    { label: 'Horas de mantenimiento', value: `${otSel.horasMantenimiento} h`, color: '#F59E0B' },
                    { label: 'Impacto disponibilidad', value: otSel.horasMantenimiento > 12 ? 'Alto' : otSel.horasMantenimiento > 4 ? 'Medio' : 'Bajo', color: otSel.horasMantenimiento > 12 ? '#EF4444' : otSel.horasMantenimiento > 4 ? '#F59E0B' : '#16A34A' },
                    { label: 'Estado', value: 'Completada', color: EAM_DARK },
                  ].map((k) => (
                    <Grid key={k.label} size={{ xs: 4 }}>
                      <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${alpha(k.color, 0.25)}`, borderRadius: '10px', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                        <Typography fontSize={14} fontWeight={800} color={k.color} noWrap>{k.value}</Typography>
                        <Typography fontSize={10} color="#64748B">{k.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px', mb: 2 }}>
                  <Typography fontWeight={700} fontSize={13} color="#1E293B" mb={1.5}>Trazabilidad de la intervención</Typography>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Activo', value: activoNombre },
                      { label: 'Descripción del activo', value: activoDesc || '—' },
                      { label: 'Apertura', value: apertura },
                      { label: 'Cierre', value: cierre },
                      { label: 'Duración', value: `${otSel.horasMantenimiento} h` },
                      { label: 'Mes de cierre', value: otSel.fechaCierre.slice(0, 7) },
                    ].map((f) => (
                      <Grid key={f.label} size={{ xs: 6, sm: 4 }}>
                        <Typography fontSize={10} color="#94A3B8" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em">{f.label}</Typography>
                        <Typography fontSize={13} fontWeight={600} color="#1E293B">{f.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.05) }}>
                  <Typography fontSize={11} fontWeight={700} color={EAM_DARK} textTransform="uppercase" letterSpacing="0.05em" mb={0.5}>Trabajo realizado</Typography>
                  <Typography fontSize={13} color="#334155">{otSel.descripcion}</Typography>
                </Paper>
              </DialogContent>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setOtSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button variant="contained" startIcon={<ExportIcon />} onClick={() => notify(`Detalle de la OT ${otSel.numero} exportado a PDF`)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Exportar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Drill-down de KPI gerencial (tab Presidencia) ── */}
      <Dialog open={!!kpiSel} onClose={() => setKpiSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {kpiSel && (() => {
          const maxSerie = Math.max(...kpiSel.serie.map((s) => s.valor)) || 1
          return (
            <>
              <DialogTitle sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ color: kpiSel.color }}><AssessmentIcon /></Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={800} color="#1E293B">{kpiSel.titulo}</Typography>
                    <Typography variant="caption" color="#64748B">KPI gerencial · Objetivo: {kpiSel.objetivo}</Typography>
                  </Box>
                  <Chip label={kpiSel.estado.replace('_', ' ')} size="small" sx={{ background: alpha(kpiEstadoColor(kpiSel.estado), 0.15), color: kpiEstadoColor(kpiSel.estado), fontWeight: 700, fontSize: 10 }} />
                  <IconButton onClick={() => setKpiSel(null)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
                </Stack>
              </DialogTitle>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="baseline" spacing={1.5} mb={2}>
                  <Typography variant="h3" fontWeight={900} color={kpiSel.color}>{kpiSel.valor}</Typography>
                  <Typography variant="body2" color="#64748B">Objetivo {kpiSel.objetivo}</Typography>
                </Stack>
                <Typography variant="body2" color="#64748B" mb={2}>{kpiSel.descripcion}</Typography>

                <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px', mb: 2 }}>
                  <Typography fontWeight={700} fontSize={13} color="#1E293B" mb={1.5}>Componentes del indicador</Typography>
                  <Grid container spacing={1.5}>
                    {kpiSel.detalle.map((d) => (
                      <Grid key={d.label} size={{ xs: 6 }}>
                        <Typography fontSize={10} color="#94A3B8" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em">{d.label}</Typography>
                        <Typography fontSize={13} fontWeight={600} color="#1E293B">{d.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                  <Typography fontWeight={700} fontSize={13} color="#1E293B" mb={1.5}>Tendencia últimos 6 meses</Typography>
                  <Stack spacing={1}>
                    {kpiSel.serie.map((s, i) => (
                      <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="caption" color="#64748B" sx={{ width: 28 }}>{s.mes}</Typography>
                        <Box flex={1}>
                          <Box sx={{ height: 8, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${(s.valor / maxSerie) * 100}%`, background: i === kpiSel.serie.length - 1 ? kpiSel.color : alpha(kpiSel.color, 0.5), borderRadius: 4, transition: 'width 0.5s ease' }} />
                          </Box>
                        </Box>
                        <Typography variant="caption" color="#1E293B" fontWeight={700} sx={{ width: 44, textAlign: 'right' }}>{s.valor}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </DialogContent>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setKpiSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button variant="contained" startIcon={<ExportIcon />} onClick={() => notify(`KPI "${kpiSel.titulo}" exportado a PDF`)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Exportar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Programar reporte (creación) ── */}
      <Dialog open={progDialog} onClose={() => setProgDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ p: 1.2, borderRadius: 2, background: alpha(EAM_COLOR, 0.15), color: EAM_COLOR }}><ScheduleIcon /></Box>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={800} color="#1E293B">Programar reporte</Typography>
              <Typography variant="caption" color="#64748B">Genera y envía este reporte de forma automática</Typography>
            </Box>
            <IconButton onClick={() => setProgDialog(false)} size="small" sx={{ color: '#64748B' }}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <Divider sx={{ borderColor: '#E5E7EB' }} />
        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={1} mt={0.5}>
            <TextField
              select fullWidth size="small" label="Reporte *" value={progForm.reporte}
              onChange={(e) => {
                const rep = REPORTES_CATALOGO.find((r) => r.titulo === e.target.value)
                setProgForm((p) => ({
                  ...p,
                  reporte: e.target.value,
                  frecuencia: rep ? rep.frecuencia : p.frecuencia,
                  formato: rep && !rep.formatos.includes(p.formato) ? rep.formatos[0] : p.formato,
                }))
              }}
              error={progTried && !progForm.reporte}
              helperText={progTried && !progForm.reporte ? 'Seleccione el reporte' : ' '}
            >
              {REPORTES_CATALOGO.map((r) => <MenuItem key={r.id} value={r.titulo}>{r.titulo}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select fullWidth size="small" label="Frecuencia *" value={progForm.frecuencia}
                onChange={(e) => setProgForm((p) => ({ ...p, frecuencia: e.target.value }))}
                error={progTried && !progForm.frecuencia}
                helperText={progTried && !progForm.frecuencia ? 'Requerida' : ' '}
              >
                {FRECUENCIAS_PROG.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
              <TextField
                select fullWidth size="small" label="Formato *" value={progForm.formato}
                onChange={(e) => setProgForm((p) => ({ ...p, formato: e.target.value }))}
                error={progTried && !progForm.formato}
                helperText={progTried && !progForm.formato ? 'Requerido' : ' '}
              >
                {formatosProgDisp.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField
              fullWidth size="small" type="email" label="Destinatario (email) *" placeholder="correo@icoltrans.com.co"
              value={progForm.destinatario}
              onChange={(e) => setProgForm((p) => ({ ...p, destinatario: e.target.value }))}
              error={progTried && !emailValido}
              helperText={progTried && !emailValido ? (progForm.destinatario.trim() ? 'Correo no válido' : 'Ingrese un correo destinatario') : ' '}
              InputProps={{ startAdornment: <InputAdornment position="start"><DocIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
            />
            <TextField
              fullWidth size="small" label="Próxima ejecución *" type="date" InputLabelProps={{ shrink: true }}
              value={progForm.proximaEjecucion}
              onChange={(e) => setProgForm((p) => ({ ...p, proximaEjecucion: e.target.value }))}
              error={progTried && !progForm.proximaEjecucion}
              helperText={progTried && !progForm.proximaEjecucion ? 'Seleccione la fecha' : ' '}
            />
          </Stack>
        </DialogContent>
        <Divider sx={{ borderColor: '#E5E7EB' }} />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProgDialog(false)} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!progValido}
            onClick={guardarProg}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&.Mui-disabled': { bgcolor: '#CBD5E1', color: '#FFFFFF' } }}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar global ── */}
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((p) => ({ ...p, open: false }))} severity={snack.sev} variant="filled" icon={<OkIcon fontSize="inherit" />} sx={{ bgcolor: snack.sev === 'success' ? EAM_COLOR : snack.sev === 'warning' ? '#F59E0B' : '#3B82F6', color: '#FFFFFF', fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
