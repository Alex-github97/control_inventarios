import { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import TodayIcon from '@mui/icons-material/Today'
import ScheduleIcon from '@mui/icons-material/Schedule'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import EventNoteIcon from '@mui/icons-material/EventNote'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { Layout } from '@/components/layout/Layout'

// ─── Paleta (TEMA CLARO) ────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const SURFACE   = '#FFFFFF'
const BORDER    = '#E5E7EB'
const TEXT      = '#1E293B'
const MUTED     = '#64748B'
const SOFT_BG   = '#F8FAFC'

// ─── Paleta de colores por producto ──────────────────────────────────────────
const PRODUCT_COLORS: Record<string, string> = {
  'PRD-001': '#0891B2',
  'PRD-002': '#8B5CF6',
  'PRD-003': '#F59E0B',
  'PRD-004': '#10B981',
  'PRD-005': '#EF4444',
  'PRD-006': '#EC4899',
  'PRD-007': '#6366F1',
}

// ─── Catálogos de dominio (para selects y autocompletado) ────────────────────
interface ProductoCat {
  codigo: string
  nombre: string
  unidad: string
  color: string
}

const PRODUCTOS: ProductoCat[] = [
  { codigo: 'PRD-001', nombre: 'Aceite Motor 5W-30 1L',   unidad: 'cajas',    color: PRODUCT_COLORS['PRD-001'] },
  { codigo: 'PRD-002', nombre: 'Filtro Aceite Premium',    unidad: 'unidades', color: PRODUCT_COLORS['PRD-002'] },
  { codigo: 'PRD-003', nombre: 'Grasa Industrial #2',      unidad: 'baldes',   color: PRODUCT_COLORS['PRD-003'] },
  { codigo: 'PRD-004', nombre: 'Lubricante Cadena 500ml',  unidad: 'cajas',    color: PRODUCT_COLORS['PRD-004'] },
  { codigo: 'PRD-005', nombre: 'Aceite Hidráulico ISO 46', unidad: 'tambores', color: PRODUCT_COLORS['PRD-005'] },
  { codigo: 'PRD-006', nombre: 'Desengrasante Industrial', unidad: 'cajas',    color: PRODUCT_COLORS['PRD-006'] },
  { codigo: 'PRD-007', nombre: 'Aceite Compresor VDL 100', unidad: 'tambores', color: PRODUCT_COLORS['PRD-007'] },
]
const PROD_MAP: Record<string, ProductoCat> = Object.fromEntries(PRODUCTOS.map(p => [p.codigo, p]))

const LINEAS = ['Línea A', 'Línea B', 'Línea C', 'Línea D', 'Línea E']

const MAQUINAS: Record<string, string> = {
  'Línea A': 'Envasadora Krones EV-200',
  'Línea B': 'Dosificadora Tetra D-50',
  'Línea C': 'Selladora Térmica ST-120',
  'Línea D': 'Mezcladora MX-800',
  'Línea E': 'Etiquetadora LB-90',
}

const RESPONSABLES = ['María López', 'Andrés Gómez', 'Carla Ruiz', 'Diego Torres', 'Sofía Marín', 'Jorge Peña']

type Prioridad = 'URGENTE' | 'ALTA' | 'MEDIA' | 'NORMAL'
const PRIORIDADES: Prioridad[] = ['URGENTE', 'ALTA', 'MEDIA', 'NORMAL']

type EstadoProg = 'PROG' | 'EN_EJECUCION' | 'CONF'
const ESTADOS_PROG: EstadoProg[] = ['PROG', 'EN_EJECUCION', 'CONF']

const HOY = '2026-06-19' // referencia para días hasta entrega

// ─── Datos mock ───────────────────────────────────────────────────────────────

interface GanttBar {
  op: string
  producto: string           // código PRD-xxx
  color: string
  left: number               // % desde inicio de la fila (6 días)
  width: number              // % del ancho total
  dia: number                // índice de día base
  estado: EstadoProg
  // enriquecido
  inicio: string             // HH:mm
  setup: number              // min
  proceso: number            // min
  cantidad: number
  prioridad: Prioridad
  responsable: string
  avance: number             // %
}

interface GanttLine {
  nombre: string
  bars: GanttBar[]
}

const GANTT_DATA: GanttLine[] = [
  {
    nombre: 'Línea A',
    bars: [
      { op: 'OP-2401', producto: 'PRD-001', color: PRODUCT_COLORS['PRD-001'], left: 0,    width: 14.5, dia: 0, estado: 'EN_EJECUCION', inicio: '06:00', setup: 30, proceso: 240, cantidad: 1200, prioridad: 'ALTA',    responsable: 'María López',  avance: 65 },
      { op: 'OP-2402', producto: 'PRD-002', color: PRODUCT_COLORS['PRD-002'], left: 16.7, width: 10.0, dia: 0, estado: 'PROG',         inicio: '10:30', setup: 15, proceso: 180, cantidad: 800,  prioridad: 'MEDIA',   responsable: 'Andrés Gómez', avance: 0 },
      { op: 'OP-2407', producto: 'PRD-005', color: PRODUCT_COLORS['PRD-005'], left: 50.0, width: 16.0, dia: 0, estado: 'PROG',         inicio: '13:00', setup: 25, proceso: 210, cantidad: 600,  prioridad: 'ALTA',    responsable: 'Carla Ruiz',   avance: 0 },
      { op: 'OP-2412', producto: 'PRD-003', color: PRODUCT_COLORS['PRD-003'], left: 83.3, width: 16.7, dia: 0, estado: 'PROG',         inicio: '16:30', setup: 45, proceso: 300, cantidad: 500,  prioridad: 'URGENTE', responsable: 'Diego Torres', avance: 0 },
    ],
  },
  {
    nombre: 'Línea B',
    bars: [
      { op: 'OP-2403', producto: 'PRD-003', color: PRODUCT_COLORS['PRD-003'], left: 0,    width: 33.0, dia: 0, estado: 'EN_EJECUCION', inicio: '06:00', setup: 45, proceso: 300, cantidad: 700, prioridad: 'ALTA',   responsable: 'Sofía Marín',  avance: 40 },
      { op: 'OP-2404', producto: 'PRD-004', color: PRODUCT_COLORS['PRD-004'], left: 33.4, width: 22.0, dia: 0, estado: 'PROG',         inicio: '11:30', setup: 20, proceso: 150, cantidad: 900, prioridad: 'NORMAL', responsable: 'Jorge Peña',   avance: 0 },
      { op: 'OP-2409', producto: 'PRD-007', color: PRODUCT_COLORS['PRD-007'], left: 66.7, width: 16.6, dia: 0, estado: 'CONF',         inicio: '15:00', setup: 35, proceso: 270, cantidad: 400, prioridad: 'MEDIA',  responsable: 'María López',  avance: 0 },
    ],
  },
  {
    nombre: 'Línea C',
    bars: [
      { op: 'OP-2405', producto: 'PRD-005', color: PRODUCT_COLORS['PRD-005'], left: 0,    width: 16.7, dia: 0, estado: 'PROG', inicio: '06:00', setup: 25, proceso: 210, cantidad: 650,  prioridad: 'ALTA',   responsable: 'Andrés Gómez', avance: 0 },
      { op: 'OP-2406', producto: 'PRD-006', color: PRODUCT_COLORS['PRD-006'], left: 16.7, width: 27.0, dia: 0, estado: 'PROG', inicio: '09:45', setup: 10, proceso: 120, cantidad: 1000, prioridad: 'NORMAL', responsable: 'Carla Ruiz',   avance: 0 },
      { op: 'OP-2410', producto: 'PRD-001', color: PRODUCT_COLORS['PRD-001'], left: 50.0, width: 16.7, dia: 0, estado: 'CONF', inicio: '12:00', setup: 30, proceso: 240, cantidad: 1200, prioridad: 'MEDIA',  responsable: 'Diego Torres', avance: 0 },
      { op: 'OP-2415', producto: 'PRD-004', color: PRODUCT_COLORS['PRD-004'], left: 66.7, width: 33.3, dia: 0, estado: 'PROG', inicio: '16:00', setup: 20, proceso: 150, cantidad: 850,  prioridad: 'ALTA',   responsable: 'Sofía Marín',  avance: 0 },
    ],
  },
  {
    nombre: 'Línea D',
    bars: [
      { op: 'OP-2408', producto: 'PRD-007', color: PRODUCT_COLORS['PRD-007'], left: 0,    width: 50.0, dia: 0, estado: 'EN_EJECUCION', inicio: '06:00', setup: 35, proceso: 270, cantidad: 450, prioridad: 'URGENTE', responsable: 'Jorge Peña',  avance: 80 },
      { op: 'OP-2411', producto: 'PRD-002', color: PRODUCT_COLORS['PRD-002'], left: 66.7, width: 16.7, dia: 0, estado: 'PROG',         inicio: '13:30', setup: 15, proceso: 180, cantidad: 750, prioridad: 'MEDIA',   responsable: 'María López', avance: 0 },
    ],
  },
  {
    nombre: 'Línea E',
    bars: [
      { op: 'OP-2413', producto: 'PRD-006', color: PRODUCT_COLORS['PRD-006'], left: 16.7, width: 33.0, dia: 0, estado: 'PROG', inicio: '07:30', setup: 10, proceso: 120, cantidad: 1100, prioridad: 'NORMAL', responsable: 'Andrés Gómez', avance: 0 },
      { op: 'OP-2414', producto: 'PRD-003', color: PRODUCT_COLORS['PRD-003'], left: 50.0, width: 33.3, dia: 0, estado: 'PROG', inicio: '12:00', setup: 45, proceso: 300, cantidad: 520,  prioridad: 'ALTA',   responsable: 'Carla Ruiz',   avance: 0 },
    ],
  },
]

interface CapacidadLinea {
  nombre: string
  carga: number
  horasDisponibles: number
  horasUtilizadas: number
  estado: 'OK' | 'ALERTA' | 'CRITICO'
}

const CAPACIDAD_DATA: CapacidadLinea[] = [
  { nombre: 'Línea A', carga: 92, horasDisponibles: 16, horasUtilizadas: 14.7, estado: 'CRITICO' },
  { nombre: 'Línea B', carga: 78, horasDisponibles: 16, horasUtilizadas: 12.5, estado: 'ALERTA' },
  { nombre: 'Línea C', carga: 85, horasDisponibles: 16, horasUtilizadas: 13.6, estado: 'CRITICO' },
  { nombre: 'Línea D', carga: 65, horasDisponibles: 16, horasUtilizadas: 10.4, estado: 'OK' },
  { nombre: 'Línea E', carga: 71, horasDisponibles: 16, horasUtilizadas: 11.4, estado: 'ALERTA' },
]

interface CuelloBotella {
  linea: string
  operacion: string
  ocupacion: number
  disponible: number
}

const CUELLOS_BOTELLA: CuelloBotella[] = [
  { linea: 'Línea A', operacion: 'Empaque primario', ocupacion: 92, disponible: 1.3 },
  { linea: 'Línea C', operacion: 'Sellado térmico',  ocupacion: 85, disponible: 2.4 },
  { linea: 'Línea B', operacion: 'Dosificación',     ocupacion: 78, disponible: 3.5 },
  { linea: 'Línea E', operacion: 'Etiquetado',        ocupacion: 71, disponible: 4.6 },
]

interface OrdenSecuencia {
  op: string
  producto: string
  prioridad: Prioridad
  setup: number
  proceso: number
  entrega: string
  linea: string
  responsable: string
  cantidad: number
  unidad: string
}

const SECUENCIA_INICIAL: OrdenSecuencia[] = [
  { op: 'OP-2416', producto: 'Aceite Motor 5W-30 1L',    prioridad: 'URGENTE', setup: 30, proceso: 240, entrega: '2026-06-20', linea: 'Línea A', responsable: 'María López',  cantidad: 1200, unidad: 'cajas'    },
  { op: 'OP-2417', producto: 'Filtro Aceite Premium',     prioridad: 'ALTA',    setup: 15, proceso: 180, entrega: '2026-06-21', linea: 'Línea D', responsable: 'Andrés Gómez', cantidad: 800,  unidad: 'unidades' },
  { op: 'OP-2418', producto: 'Grasa Industrial #2',       prioridad: 'URGENTE', setup: 45, proceso: 300, entrega: '2026-06-20', linea: 'Línea B', responsable: 'Sofía Marín',  cantidad: 500,  unidad: 'baldes'   },
  { op: 'OP-2419', producto: 'Lubricante Cadena 500ml',   prioridad: 'MEDIA',   setup: 20, proceso: 150, entrega: '2026-06-22', linea: 'Línea C', responsable: 'Carla Ruiz',   cantidad: 900,  unidad: 'cajas'    },
  { op: 'OP-2420', producto: 'Aceite Hidráulico ISO 46',  prioridad: 'ALTA',    setup: 25, proceso: 210, entrega: '2026-06-21', linea: 'Línea A', responsable: 'Diego Torres', cantidad: 600,  unidad: 'tambores' },
  { op: 'OP-2421', producto: 'Desengrasante Industrial',  prioridad: 'NORMAL',  setup: 10, proceso: 120, entrega: '2026-06-23', linea: 'Línea E', responsable: 'Jorge Peña',   cantidad: 1000, unidad: 'cajas'    },
  { op: 'OP-2422', producto: 'Aceite Compresor VDL 100',  prioridad: 'MEDIA',   setup: 35, proceso: 270, entrega: '2026-06-22', linea: 'Línea B', responsable: 'María López',  cantidad: 400,  unidad: 'tambores' },
  { op: 'OP-2423', producto: 'Fluido Frenos DOT 4',       prioridad: 'ALTA',    setup: 20, proceso: 180, entrega: '2026-06-21', linea: 'Línea C', responsable: 'Carla Ruiz',   cantidad: 700,  unidad: 'cajas'    },
]

const DIAS = ['Lun 17', 'Mar 18', 'Mié 19', 'Jue 20', 'Vie 21', 'Sáb 22']
const HOY_DIA = 'Mié 19'

const SEMANAS = [
  { value: '2026-W24', label: 'Semana 24 — 10 al 15 Jun' },
  { value: '2026-W25', label: 'Semana 25 — 17 al 22 Jun' },
  { value: '2026-W26', label: 'Semana 26 — 24 al 29 Jun' },
]

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const cardSx = {
  bgcolor: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
}

const tabsSx = {
  borderBottom: `1px solid ${BORDER}`,
  mb: 3,
  '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
  '& .MuiTab-root': { color: MUTED, textTransform: 'none', fontWeight: 500, fontSize: 14 },
  '& .MuiTab-root.Mui-selected': { color: MES_COLOR },
}

const inputSx = {
  '& .MuiOutlinedInput-root': { color: TEXT },
  '& label': { color: MUTED },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.25) },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
  '& .MuiSvgIcon-root': { color: MUTED },
}

const dialogPaperSx = {
  bgcolor: SURFACE,
  border: `1px solid ${alpha(MES_COLOR, 0.3)}`,
  borderRadius: '16px',
}

function prioridadColor(p: Prioridad) {
  if (p === 'URGENTE') return '#EF4444'
  if (p === 'ALTA')    return '#F59E0B'
  if (p === 'MEDIA')   return MES_COLOR
  return '#64748B'
}

function cargaColor(c: number) {
  if (c >= 90) return '#EF4444'
  if (c >= 75) return '#F59E0B'
  return '#10B981'
}

function estadoLabel(e: EstadoProg) {
  return e === 'EN_EJECUCION' ? 'En ejecución' : e === 'CONF' ? 'Confirmada' : 'Programada'
}
function estadoColor(e: EstadoProg) {
  return e === 'EN_EJECUCION' ? '#10B981' : e === 'CONF' ? '#8B5CF6' : MES_COLOR
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h || 0) * 60 + (m || 0) + mins
  const hh = Math.floor((total % (24 * 60)) / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
const minToH = (min: number) => Math.round((min / 60) * 10) / 10
const prodNombre = (codigo: string) => PROD_MAP[codigo]?.nombre ?? codigo
const prodUnidad = (codigo: string) => PROD_MAP[codigo]?.unidad ?? 'uds'
const diasHasta = (fecha: string) => Math.ceil((new Date(fecha).getTime() - new Date(HOY).getTime()) / 86400000)

type NotifyFn = (msg: string, sev?: 'success' | 'info' | 'warning') => void

// ─── Bloque etiqueta/valor reutilizable ──────────────────────────────────────
function Campo({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ bgcolor: SOFT_BG, borderRadius: '8px', p: 1.25 }}>
      <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ color: color ?? TEXT, fontSize: 13, fontWeight: 600 }}>{value}</Typography>
    </Box>
  )
}

// ─── Componente SVG radial progress ──────────────────────────────────────────

function RadialProgress({ value, color }: { value: number; color: string }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <Box sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke={alpha(color, 0.15)} strokeWidth="6" />
        <circle
          cx="42" cy="42" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>
          {value}%
        </Typography>
      </Box>
    </Box>
  )
}

// ─── Tab 0: Gantt ─────────────────────────────────────────────────────────────

interface BarSel extends GanttBar { linea: string }

interface NuevaOPForm {
  producto: string
  linea: string
  dia: string
  inicio: string
  prioridad: Prioridad
  estado: EstadoProg
  cantidad: string
  setup: string
  proceso: string
  responsable: string
}

const EMPTY_OP_FORM: NuevaOPForm = {
  producto: '', linea: '', dia: '', inicio: '06:00', prioridad: 'MEDIA', estado: 'PROG',
  cantidad: '', setup: '', proceso: '', responsable: '',
}

let _opSeq = 24
const nextOp = () => `OP-25${String(++_opSeq).padStart(2, '0')}`

function TabGantt({ notify }: { notify: NotifyFn }) {
  const [lineas, setLineas] = useState<GanttLine[]>(GANTT_DATA)
  const [semanaIdx, setSemanaIdx] = useState(1)
  const [filterLinea, setFilterLinea] = useState('Todas')
  const [filterEstado, setFilterEstado] = useState('Todos')

  const [sel, setSel] = useState<BarSel | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<NuevaOPForm>(EMPTY_OP_FORM)
  const [tried, setTried] = useState(false)

  const semana = SEMANAS[semanaIdx]

  const setSemana = (value: string) => {
    const idx = SEMANAS.findIndex(s => s.value === value)
    if (idx >= 0) { setSemanaIdx(idx); notify(`Vista cambiada a ${SEMANAS[idx].label}`, 'info') }
  }
  const navSemana = (dir: -1 | 1) => {
    const idx = Math.min(SEMANAS.length - 1, Math.max(0, semanaIdx + dir))
    if (idx !== semanaIdx) { setSemanaIdx(idx); notify(`Vista cambiada a ${SEMANAS[idx].label}`, 'info') }
  }

  const setField = (f: keyof NuevaOPForm, v: string) => setForm(prev => ({ ...prev, [f]: v }))
  const openCreate = () => { setForm(EMPTY_OP_FORM); setTried(false); setCreateOpen(true) }

  const formValido = !!form.producto && !!form.linea && !!form.dia &&
    (Number(form.cantidad) > 0) && (Number(form.proceso) > 0)

  const handleCreate = () => {
    if (!formValido) {
      setTried(true)
      notify('Complete los campos obligatorios de la OP', 'warning')
      return
    }
    const diaIndex = Math.max(0, DIAS.indexOf(form.dia))
    const left = Math.min(85, (diaIndex / 6) * 100)
    const setup = Number(form.setup) || 0
    const proceso = Number(form.proceso) || 0
    const totalMin = setup + proceso
    const width = Math.max(8, Math.min(100 - left, (totalMin / 60) * 4))
    const nuevo: GanttBar = {
      op: nextOp(),
      producto: form.producto,
      color: PROD_MAP[form.producto]?.color ?? MES_COLOR,
      left, width, dia: diaIndex,
      estado: form.estado,
      inicio: form.inicio || '06:00',
      setup, proceso,
      cantidad: Number(form.cantidad) || 0,
      prioridad: form.prioridad,
      responsable: form.responsable || 'Sin asignar',
      avance: 0,
    }
    setLineas(prev => prev.map(l => l.nombre === form.linea ? { ...l, bars: [...l.bars, nuevo] } : l))
    setCreateOpen(false)
    notify(`OP ${nuevo.op} programada en ${form.linea}`, 'success')
  }

  const filteredLineas = useMemo(() => lineas
    .filter(l => filterLinea === 'Todas' || l.nombre === filterLinea)
    .map(l => ({ ...l, bars: l.bars.filter(b => filterEstado === 'Todos' || b.estado === filterEstado) })),
    [lineas, filterLinea, filterEstado])

  const allBars = lineas.flatMap(l => l.bars)
  const kpiUtil = Math.round(CAPACIDAD_DATA.reduce((s, c) => s + c.carga, 0) / CAPACIDAD_DATA.length)
  const kpiProg = allBars.length
  const kpiEjec = allBars.filter(b => b.estado === 'EN_EJECUCION').length

  return (
    <Box>
      {/* Controles */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3} flexWrap="wrap" useFlexGap>
        <FormControl size="small" sx={{ minWidth: 210 }}>
          <Select value={semana.value} onChange={e => setSemana(e.target.value)}
            sx={{ bgcolor: SURFACE, color: TEXT, borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              '& .MuiSvgIcon-root': { color: MUTED } }}>
            {SEMANAS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<NavigateBeforeIcon />} onClick={() => navSemana(-1)}
          sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', textTransform: 'none' }}>
          Anterior
        </Button>
        <Button size="small" startIcon={<TodayIcon />} onClick={() => setSemana('2026-W25')}
          sx={{ color: MES_COLOR, border: `1px solid ${MES_COLOR}`, borderRadius: '8px', textTransform: 'none' }}>
          Hoy
        </Button>
        <Button size="small" endIcon={<NavigateNextIcon />} onClick={() => navSemana(1)}
          sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', textTransform: 'none' }}>
          Siguiente
        </Button>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={filterLinea} onChange={e => setFilterLinea(e.target.value)}
            sx={{ bgcolor: SURFACE, color: TEXT, borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER }, '& .MuiSvgIcon-root': { color: MUTED } }}>
            <MenuItem value="Todas">Todas las líneas</MenuItem>
            {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            sx={{ bgcolor: SURFACE, color: TEXT, borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER }, '& .MuiSvgIcon-root': { color: MUTED } }}>
            <MenuItem value="Todos">Todos los estados</MenuItem>
            {ESTADOS_PROG.map(e => <MenuItem key={e} value={e}>{estadoLabel(e)}</MenuItem>)}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Programar OP
        </Button>
      </Stack>

      {/* Gantt body */}
      <Card sx={{ ...cardSx, overflow: 'hidden' }}>
        {/* Cabecera de días */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '100px repeat(6, 1fr)', borderBottom: `1px solid ${BORDER}` }}>
          <Box sx={{ p: 1.5, borderRight: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recurso
            </Typography>
          </Box>
          {DIAS.map(dia => (
            <Box key={dia} sx={{ p: 1.5, textAlign: 'center', borderRight: `1px solid ${BORDER}`,
              bgcolor: dia === HOY_DIA ? alpha(MES_COLOR, 0.08) : 'transparent' }}>
              <Typography sx={{ color: dia === HOY_DIA ? MES_COLOR : TEXT, fontSize: 13, fontWeight: 600 }}>
                {dia}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Filas de líneas */}
        {filteredLineas.map((linea, li) => (
          <Box key={linea.nombre} sx={{ display: 'grid', gridTemplateColumns: '100px repeat(6, 1fr)',
            borderBottom: li < filteredLineas.length - 1 ? `1px solid ${BORDER}` : 'none', minHeight: 56 }}>
            <Box sx={{ p: 1.5, borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{linea.nombre}</Typography>
            </Box>
            <Box sx={{ gridColumn: '2 / 8', position: 'relative', display: 'flex', alignItems: 'center', py: 1 }}>
              {linea.bars.map(bar => (
                <Tooltip key={bar.op} title={`${bar.op} · ${prodNombre(bar.producto)} · ${estadoLabel(bar.estado)}`} placement="top" arrow>
                  <Box
                    onClick={() => setSel({ ...bar, linea: linea.nombre })}
                    sx={{
                      position: 'absolute', left: `${bar.left}%`, width: `${bar.width}%`, height: 34,
                      borderRadius: '6px',
                      bgcolor: alpha(bar.color, bar.estado === 'CONF' ? 0.18 : 0.28),
                      border: `1.5px solid ${alpha(bar.color, bar.estado === 'EN_EJECUCION' ? 1 : 0.6)}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', px: 0.75, overflow: 'hidden',
                      transition: 'filter 0.15s, box-shadow 0.15s',
                      '&:hover': { filter: 'brightness(0.95)', boxShadow: `0 2px 8px ${alpha(bar.color, 0.4)}` },
                      ...(bar.estado === 'EN_EJECUCION' && { boxShadow: `0 0 8px ${alpha(bar.color, 0.4)}` }),
                    }}
                  >
                    <Typography sx={{ color: bar.color, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.04em' }}>
                      {bar.op}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
              {[1, 2, 3, 4, 5].map(i => (
                <Box key={i} sx={{ position: 'absolute', left: `${(i / 6) * 100}%`, top: 0, bottom: 0,
                  width: '1px', bgcolor: BORDER, pointerEvents: 'none' }} />
              ))}
            </Box>
          </Box>
        ))}
        {filteredLineas.every(l => l.bars.length === 0) && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: MUTED, fontSize: 13 }}>No hay OPs que coincidan con los filtros.</Typography>
          </Box>
        )}
      </Card>

      {/* Leyenda */}
      <Stack direction="row" spacing={2} mt={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography sx={{ color: MUTED, fontSize: 12 }}>Estado:</Typography>
        {ESTADOS_PROG.map(e => (
          <Stack key={e} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 16, height: 10, borderRadius: '3px', bgcolor: alpha(estadoColor(e), 0.28), border: `1.5px solid ${estadoColor(e)}` }} />
            <Typography sx={{ color: MUTED, fontSize: 12 }}>{estadoLabel(e)}</Typography>
          </Stack>
        ))}
        <Typography sx={{ color: MUTED, fontSize: 12, ml: 1 }}>· Haz clic en una barra para ver el detalle de la OP</Typography>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2} mt={2}>
        {[
          { label: 'Utilización global', value: `${kpiUtil}%`, color: '#10B981', icon: <CheckCircleIcon sx={{ color: '#10B981' }} /> },
          { label: 'OPs programadas',    value: String(kpiProg), color: MES_COLOR, icon: <ScheduleIcon sx={{ color: MES_COLOR }} /> },
          { label: 'En ejecución',       value: String(kpiEjec), color: '#F59E0B', icon: <PlayArrowIcon sx={{ color: '#F59E0B' }} /> },
        ].map(kpi => (
          <Grid key={kpi.label} size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: MUTED, fontSize: 12, mb: 0.5 }}>{kpi.label}</Typography>
                    <Typography sx={{ color: kpi.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{kpi.value}</Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(kpi.color, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {kpi.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Dialog detalle de OP ── */}
      <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {sel && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(sel.color, 0.15),
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventNoteIcon sx={{ fontSize: 18, color: sel.color }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{sel.op}</Typography>
                  <Typography sx={{ fontSize: 11, color: MUTED }}>{prodNombre(sel.producto)} · {sel.producto}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSel(null)}><CloseIcon sx={{ fontSize: 18, color: MUTED }} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Stack spacing={1.5} mt={1}>
                <Stack direction="row" spacing={1}>
                  <Chip label={estadoLabel(sel.estado)} size="small"
                    sx={{ bgcolor: alpha(estadoColor(sel.estado), 0.15), color: estadoColor(sel.estado), fontWeight: 700,
                      border: `1px solid ${alpha(estadoColor(sel.estado), 0.4)}` }} />
                  <Chip label={sel.prioridad} size="small"
                    sx={{ bgcolor: alpha(prioridadColor(sel.prioridad), 0.15), color: prioridadColor(sel.prioridad), fontWeight: 700,
                      border: `1px solid ${alpha(prioridadColor(sel.prioridad), 0.4)}` }} />
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Campo label="Línea" value={sel.linea} />
                  <Campo label="Máquina" value={MAQUINAS[sel.linea] ?? '—'} />
                  <Campo label="Día" value={DIAS[sel.dia] ?? '—'} />
                  <Campo label="Inicio → Fin" value={`${sel.inicio} → ${addMinutes(sel.inicio, sel.setup + sel.proceso)}`} />
                  <Campo label="Setup" value={`${sel.setup} min`} />
                  <Campo label="Proceso" value={`${sel.proceso} min`} />
                  <Campo label="Duración total" value={`${minToH(sel.setup + sel.proceso)} h`} color={MES_COLOR} />
                  <Campo label="Cantidad" value={`${sel.cantidad.toLocaleString('es-CO')} ${prodUnidad(sel.producto)}`} />
                  <Campo label="Responsable" value={sel.responsable} />
                  <Campo label="Avance" value={`${sel.avance}%`} color={sel.avance > 0 ? '#10B981' : MUTED} />
                </Box>
                <Box>
                  <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.5 }}>
                    Progreso de la orden
                  </Typography>
                  <LinearProgress variant="determinate" value={sel.avance}
                    sx={{ height: 8, borderRadius: 4, bgcolor: alpha(sel.color, 0.15),
                      '& .MuiLinearProgress-bar': { bgcolor: sel.color, borderRadius: 4 } }} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              <Button onClick={() => setSel(null)} sx={{ color: MUTED }}>Cerrar</Button>
              <Button variant="contained" startIcon={<RestartAltIcon />}
                onClick={() => { notify(`OP ${sel.op} enviada a reprogramación`, 'success'); setSel(null) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px' }}>
                Reprogramar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog crear OP ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ fontSize: 18, color: MES_COLOR }} />
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Programar nueva OP</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setCreateOpen(false)}><CloseIcon sx={{ fontSize: 18, color: MUTED }} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1 }}>
            <TextField select fullWidth size="small" label="Producto *" value={form.producto}
              onChange={e => setField('producto', e.target.value)} sx={{ ...inputSx, gridColumn: { sm: '1 / -1' } }}
              error={tried && !form.producto}
              helperText={tried && !form.producto ? 'Seleccione el producto' : ' '}>
              {PRODUCTOS.map(p => (
                <MenuItem key={p.codigo} value={p.codigo}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: p.color }} />
                    <span>{p.nombre} ({p.codigo})</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <TextField select fullWidth size="small" label="Línea *" value={form.linea}
              onChange={e => setField('linea', e.target.value)} sx={inputSx}
              error={tried && !form.linea}
              helperText={tried && !form.linea ? 'Seleccione la línea' : ' '}>
              {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>

            <TextField fullWidth size="small" label="Máquina" value={form.linea ? (MAQUINAS[form.linea] ?? '') : ''}
              InputProps={{ readOnly: true }} sx={{ ...inputSx, '& .MuiOutlinedInput-root': { color: MUTED, bgcolor: SOFT_BG } }}
              helperText="Se autocompleta según la línea" />

            <TextField select fullWidth size="small" label="Día *" value={form.dia}
              onChange={e => setField('dia', e.target.value)} sx={inputSx}
              error={tried && !form.dia}
              helperText={tried && !form.dia ? 'Seleccione el día' : ' '}>
              {DIAS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>

            <TextField fullWidth size="small" label="Hora de inicio" type="time" value={form.inicio}
              onChange={e => setField('inicio', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} helperText=" " />

            <TextField select fullWidth size="small" label="Prioridad" value={form.prioridad}
              onChange={e => setField('prioridad', e.target.value)} sx={inputSx} helperText=" ">
              {PRIORIDADES.map(p => (
                <MenuItem key={p} value={p}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: prioridadColor(p) }} />
                    <span>{p}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <TextField select fullWidth size="small" label="Estado" value={form.estado}
              onChange={e => setField('estado', e.target.value)} sx={inputSx} helperText=" ">
              {ESTADOS_PROG.map(e => <MenuItem key={e} value={e}>{estadoLabel(e)}</MenuItem>)}
            </TextField>

            <TextField fullWidth size="small" label="Cantidad *" type="number" value={form.cantidad}
              onChange={e => setField('cantidad', e.target.value)} sx={inputSx}
              error={tried && !(Number(form.cantidad) > 0)}
              helperText={tried && !(Number(form.cantidad) > 0)
                ? 'Cantidad requerida'
                : form.producto ? `Unidad: ${prodUnidad(form.producto)}` : ' '} />

            <TextField fullWidth size="small" label="Setup (min)" type="number" value={form.setup}
              onChange={e => setField('setup', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>min</Typography></InputAdornment> }}
              sx={inputSx} helperText=" " />

            <TextField fullWidth size="small" label="Proceso (min) *" type="number" value={form.proceso}
              onChange={e => setField('proceso', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>min</Typography></InputAdornment> }}
              sx={inputSx}
              error={tried && !(Number(form.proceso) > 0)}
              helperText={tried && !(Number(form.proceso) > 0) ? 'Proceso requerido' : ' '} />

            <TextField select fullWidth size="small" label="Responsable" value={form.responsable}
              onChange={e => setField('responsable', e.target.value)} sx={{ ...inputSx, gridColumn: { sm: '1 / -1' } }} helperText=" ">
              {RESPONSABLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>

            {(Number(form.setup) > 0 || Number(form.proceso) > 0) && form.inicio && (
              <Box sx={{ gridColumn: '1 / -1', bgcolor: alpha(MES_COLOR, 0.06), border: `1px solid ${alpha(MES_COLOR, 0.2)}`,
                borderRadius: '8px', p: 1.25 }}>
                <Typography sx={{ color: MES_COLOR, fontSize: 12, fontWeight: 600 }}>
                  Ventana estimada: {form.inicio} → {addMinutes(form.inicio, (Number(form.setup) || 0) + (Number(form.proceso) || 0))}
                  {'  '}({minToH((Number(form.setup) || 0) + (Number(form.proceso) || 0))} h)
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: MUTED }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValido}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px',
              '&:disabled': { bgcolor: alpha(MES_COLOR, 0.3), color: '#fff' } }}>
            Programar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Tab 1: Carga Capacidad ───────────────────────────────────────────────────

function TabCargaCapacidad({ notify }: { notify: NotifyFn }) {
  const [selLinea, setSelLinea] = useState<CapacidadLinea | null>(null)
  const [selCuello, setSelCuello] = useState<CuelloBotella | null>(null)

  const opsDeLinea = (nombre: string) => GANTT_DATA.find(l => l.nombre === nombre)?.bars ?? []

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
        <Typography sx={{ color: MUTED, fontSize: 14 }}>
          Haz clic en una línea o cuello de botella para ver su detalle de capacidad
        </Typography>
        <Button size="small" startIcon={<FileDownloadIcon />}
          onClick={() => notify('Reporte de capacidad exportado (CSV)', 'success')}
          sx={{ color: MES_COLOR, border: `1px solid ${alpha(MES_COLOR, 0.4)}`, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Exportar
        </Button>
      </Stack>

      <Grid container spacing={2} mb={3}>
        {CAPACIDAD_DATA.map(linea => {
          const color = cargaColor(linea.carga)
          return (
            <Grid key={linea.nombre} size={{ xs: 12, md: 4, lg: 2.4 }}>
              <Card sx={{ ...cardSx, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)', borderColor: alpha(MES_COLOR, 0.4) } }}
                onClick={() => setSelLinea(linea)}>
                <CardContent>
                  <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 14, mb: 2 }}>{linea.nombre}</Typography>
                  <Stack alignItems="center" spacing={1.5}>
                    <RadialProgress value={linea.carga} color={color} />
                    <Chip label={linea.estado} size="small"
                      sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.4)}`, fontSize: 11 }} />
                    <Box sx={{ width: '100%' }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: MUTED, fontSize: 11 }}>Disponibles</Typography>
                        <Typography sx={{ color: TEXT, fontSize: 11, fontWeight: 600 }}>{linea.horasDisponibles} h</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" mt={0.25}>
                        <Typography sx={{ color: MUTED, fontSize: 11 }}>Utilizadas</Typography>
                        <Typography sx={{ color, fontSize: 11, fontWeight: 600 }}>{linea.horasUtilizadas} h</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Card sx={cardSx}>
        <CardContent>
          <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
            Cuellos de Botella Identificados
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Línea', 'Operación', '% Ocupación', 'Tiempo Disponible'].map(h => (
                    <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {CUELLOS_BOTELLA.map(row => {
                  const color = cargaColor(row.ocupacion)
                  return (
                    <TableRow key={row.linea} onClick={() => setSelCuello(row)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) } }}>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{row.linea}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{row.operacion}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 80, height: 6, borderRadius: '3px', bgcolor: alpha(color, 0.2), position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${row.ocupacion}%`, bgcolor: color, borderRadius: '3px' }} />
                          </Box>
                          <Typography sx={{ color, fontSize: 13, fontWeight: 700 }}>{row.ocupacion}%</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{row.disponible} h</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── Dialog detalle de línea ── */}
      <Dialog open={!!selLinea} onClose={() => setSelLinea(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {selLinea && (() => {
          const color = cargaColor(selLinea.carga)
          const holgura = Math.round((selLinea.horasDisponibles - selLinea.horasUtilizadas) * 10) / 10
          const ops = opsDeLinea(selLinea.nombre)
          const cuello = CUELLOS_BOTELLA.find(c => c.linea === selLinea.nombre)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(color, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PrecisionManufacturingIcon sx={{ fontSize: 18, color }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{selLinea.nombre}</Typography>
                    <Typography sx={{ fontSize: 11, color: MUTED }}>{MAQUINAS[selLinea.nombre] ?? ''}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSelLinea(null)}><CloseIcon sx={{ fontSize: 18, color: MUTED }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                <Stack spacing={1.5} mt={1}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <RadialProgress value={selLinea.carga} color={color} />
                    <Box sx={{ flex: 1 }}>
                      <Chip label={selLinea.estado} size="small"
                        sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.4)}`, mb: 1 }} />
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>
                        {selLinea.estado === 'CRITICO' ? 'Capacidad al límite: reprograme OPs no urgentes o habilite turno extra.'
                          : selLinea.estado === 'ALERTA' ? 'Carga elevada: monitoree y evite añadir OPs urgentes.'
                          : 'Capacidad saludable con holgura disponible.'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                    <Campo label="Disponibles" value={`${selLinea.horasDisponibles} h`} />
                    <Campo label="Utilizadas" value={`${selLinea.horasUtilizadas} h`} color={color} />
                    <Campo label="Holgura" value={`${holgura} h`} color={holgura > 2 ? '#10B981' : '#EF4444'} />
                  </Box>
                  {cuello && (
                    <Box sx={{ bgcolor: alpha('#F59E0B', 0.06), border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', p: 1.25 }}>
                      <Typography sx={{ color: '#B45309', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>
                        Cuello de botella
                      </Typography>
                      <Typography sx={{ color: TEXT, fontSize: 13 }}>{cuello.operacion} — {cuello.ocupacion}% ocupación · {cuello.disponible} h libres</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.75 }}>
                      OPs programadas ({ops.length})
                    </Typography>
                    <Stack spacing={0.75}>
                      {ops.length === 0 && <Typography sx={{ color: MUTED, fontSize: 12 }}>Sin OPs programadas.</Typography>}
                      {ops.map(b => (
                        <Stack key={b.op} direction="row" alignItems="center" justifyContent="space-between"
                          sx={{ bgcolor: SOFT_BG, borderRadius: '6px', px: 1, py: 0.75 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: b.color }} />
                            <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{b.op}</Typography>
                            <Typography sx={{ color: MUTED, fontSize: 12 }}>{prodNombre(b.producto)}</Typography>
                          </Stack>
                          <Chip label={estadoLabel(b.estado)} size="small"
                            sx={{ bgcolor: alpha(estadoColor(b.estado), 0.12), color: estadoColor(b.estado), fontWeight: 700, fontSize: 10, height: 20 }} />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                <Button onClick={() => setSelLinea(null)} sx={{ color: MUTED }}>Cerrar</Button>
                <Button variant="contained" startIcon={<RestartAltIcon />}
                  onClick={() => { notify(`Rebalanceo de carga solicitado para ${selLinea.nombre}`, 'success'); setSelLinea(null) }}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px' }}>
                  Rebalancear carga
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog detalle de cuello de botella ── */}
      <Dialog open={!!selCuello} onClose={() => setSelCuello(null)} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {selCuello && (() => {
          const color = cargaColor(selCuello.ocupacion)
          const sev = selCuello.ocupacion >= 90 ? 'Crítico' : selCuello.ocupacion >= 75 ? 'Alerta' : 'Controlado'
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(color, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{selCuello.operacion}</Typography>
                    <Typography sx={{ fontSize: 11, color: MUTED }}>{selCuello.linea}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSelCuello(null)}><CloseIcon sx={{ fontSize: 18, color: MUTED }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                <Stack spacing={1.5} mt={1}>
                  <Chip label={`Severidad: ${sev}`} size="small"
                    sx={{ alignSelf: 'flex-start', bgcolor: alpha(color, 0.15), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.4)}` }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Campo label="% Ocupación" value={`${selCuello.ocupacion}%`} color={color} />
                    <Campo label="Tiempo disponible" value={`${selCuello.disponible} h`} />
                  </Box>
                  <Box sx={{ bgcolor: SOFT_BG, borderRadius: '8px', p: 1.25 }}>
                    <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>
                      Recomendación
                    </Typography>
                    <Typography sx={{ color: TEXT, fontSize: 13 }}>
                      {selCuello.ocupacion >= 90
                        ? 'Redistribuir OPs a líneas con holgura o habilitar turno adicional para descongestionar la operación.'
                        : selCuello.ocupacion >= 75
                        ? 'Vigilar ocupación; considerar adelantar setups para ganar disponibilidad.'
                        : 'Ocupación bajo control, sin acción inmediata requerida.'}
                    </Typography>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                <Button onClick={() => setSelCuello(null)} sx={{ color: MUTED }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>
    </Box>
  )
}

// ─── Tab 2: Secuenciación ─────────────────────────────────────────────────────

interface NuevaSecForm {
  producto: string
  linea: string
  prioridad: Prioridad
  setup: string
  proceso: string
  entrega: string
  cantidad: string
  responsable: string
}

const EMPTY_SEC_FORM: NuevaSecForm = {
  producto: '', linea: '', prioridad: 'MEDIA', setup: '', proceso: '', entrega: '', cantidad: '', responsable: '',
}

function TabSecuenciacion({ notify }: { notify: NotifyFn }) {
  const [ordenes, setOrdenes] = useState<OrdenSecuencia[]>(SECUENCIA_INICIAL)
  const [aplicado, setAplicado] = useState(false)
  const [filterPrioridad, setFilterPrioridad] = useState('Todas')

  const [sel, setSel] = useState<{ orden: OrdenSecuencia; pos: number } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<NuevaSecForm>(EMPTY_SEC_FORM)
  const [tried, setTried] = useState(false)

  const mover = (idx: number, dir: -1 | 1) => {
    const next = [...ordenes]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setOrdenes(next)
    setAplicado(false)
  }

  const visibles = ordenes
    .map((o, idx) => ({ o, idx }))
    .filter(({ o }) => filterPrioridad === 'Todas' || o.prioridad === filterPrioridad)

  const setField = (f: keyof NuevaSecForm, v: string) => setForm(prev => ({ ...prev, [f]: v }))
  const openCreate = () => { setForm(EMPTY_SEC_FORM); setTried(false); setCreateOpen(true) }
  const formValido = !!form.producto && !!form.linea && !!form.entrega && Number(form.cantidad) > 0 && Number(form.proceso) > 0

  const handleCreate = () => {
    if (!formValido) {
      setTried(true)
      notify('Complete los campos obligatorios de la orden', 'warning')
      return
    }
    const nueva: OrdenSecuencia = {
      op: nextOp(),
      producto: PROD_MAP[form.producto]?.nombre ?? form.producto,
      prioridad: form.prioridad,
      setup: Number(form.setup) || 0,
      proceso: Number(form.proceso) || 0,
      entrega: form.entrega,
      linea: form.linea,
      responsable: form.responsable || 'Sin asignar',
      cantidad: Number(form.cantidad) || 0,
      unidad: prodUnidad(form.producto),
    }
    setOrdenes(prev => [...prev, nueva])
    setAplicado(false)
    setCreateOpen(false)
    notify(`Orden ${nueva.op} añadida a la secuencia`, 'success')
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" useFlexGap gap={1.5}>
        <Typography sx={{ color: MUTED, fontSize: 14 }}>
          Reordena las OPs para optimizar setup y cumplimiento de entregas
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)}
              sx={{ bgcolor: SURFACE, color: TEXT, borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER }, '& .MuiSvgIcon-root': { color: MUTED } }}>
              <MenuItem value="Todas">Todas las prioridades</MenuItem>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          <Button size="small" startIcon={<AddIcon />} onClick={openCreate} variant="outlined"
            sx={{ color: MES_COLOR, borderColor: alpha(MES_COLOR, 0.4), borderRadius: '8px', textTransform: 'none', fontWeight: 600,
              '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
            Añadir OP
          </Button>
          <Button variant="contained" startIcon={<PlayArrowIcon />}
            onClick={() => { setAplicado(true); notify('Secuencia aplicada a la programación', 'success') }}
            sx={{ bgcolor: aplicado ? '#10B981' : MES_COLOR, '&:hover': { bgcolor: aplicado ? '#059669' : MES_DARK },
              borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            {aplicado ? 'Secuencia aplicada' : 'Aplicar secuencia'}
          </Button>
        </Stack>
      </Stack>

      <Card sx={cardSx}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['#', 'OP', 'Producto', 'Línea', 'Prioridad', 'Setup (min)', 'Proceso (min)', 'Entrega', 'Mover'].map(h => (
                  <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibles.map(({ o: op, idx }) => {
                const pColor = prioridadColor(op.prioridad)
                return (
                  <TableRow key={op.op} onClick={() => setSel({ orden: op, pos: idx + 1 })}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) } }}>
                    <TableCell sx={{ color: MUTED, borderColor: BORDER, fontWeight: 700, width: 40 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontWeight: 700 }}>{op.op}</TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER, maxWidth: 200 }}>
                      <Typography sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.producto}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 13 }}>{op.linea}</TableCell>
                    <TableCell sx={{ borderColor: BORDER }}>
                      <Chip label={op.prioridad} size="small" sx={{ bgcolor: alpha(pColor, 0.15), color: pColor,
                        fontWeight: 700, border: `1px solid ${alpha(pColor, 0.4)}`, fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{op.setup}</TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{op.proceso}</TableCell>
                    <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{op.entrega}</TableCell>
                    <TableCell sx={{ borderColor: BORDER }}>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Subir" placement="top">
                          <span>
                            <Button size="small" onClick={(e) => { e.stopPropagation(); mover(idx, -1) }} disabled={idx === 0}
                              sx={{ minWidth: 28, p: 0.5, color: MUTED, '&:hover': { color: MES_COLOR } }}>
                              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Bajar" placement="top">
                          <span>
                            <Button size="small" onClick={(e) => { e.stopPropagation(); mover(idx, 1) }} disabled={idx === ordenes.length - 1}
                              sx={{ minWidth: 28, p: 0.5, color: MUTED, '&:hover': { color: MES_COLOR } }}>
                              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {visibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ borderColor: BORDER, textAlign: 'center', color: MUTED, py: 3 }}>
                    No hay órdenes con esa prioridad.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ── Dialog detalle de orden ── */}
      <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {sel && (() => {
          const op = sel.orden
          const pColor = prioridadColor(op.prioridad)
          const dias = diasHasta(op.entrega)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Inventory2Icon sx={{ fontSize: 18, color: MES_COLOR }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{op.op}</Typography>
                    <Typography sx={{ fontSize: 11, color: MUTED }}>{op.producto}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setSel(null)}><CloseIcon sx={{ fontSize: 18, color: MUTED }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                <Stack spacing={1.5} mt={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={op.prioridad} size="small"
                      sx={{ bgcolor: alpha(pColor, 0.15), color: pColor, fontWeight: 700, border: `1px solid ${alpha(pColor, 0.4)}` }} />
                    <Chip label={`Posición #${sel.pos} en secuencia`} size="small"
                      sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700 }} />
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Campo label="Línea" value={op.linea} />
                    <Campo label="Máquina" value={MAQUINAS[op.linea] ?? '—'} />
                    <Campo label="Setup" value={`${op.setup} min`} />
                    <Campo label="Proceso" value={`${op.proceso} min`} />
                    <Campo label="Duración total" value={`${minToH(op.setup + op.proceso)} h`} color={MES_COLOR} />
                    <Campo label="Cantidad" value={`${op.cantidad.toLocaleString('es-CO')} ${op.unidad}`} />
                    <Campo label="Entrega" value={op.entrega} />
                    <Campo label="Días a entrega" value={`${dias} d`} color={dias <= 1 ? '#EF4444' : dias <= 3 ? '#F59E0B' : '#10B981'} />
                    <Campo label="Responsable" value={op.responsable} />
                  </Box>
                  <Box sx={{ bgcolor: SOFT_BG, borderRadius: '8px', p: 1.25 }}>
                    <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>
                      Estado de holgura
                    </Typography>
                    <Typography sx={{ color: TEXT, fontSize: 13 }}>
                      {dias <= 1 ? 'Riesgo de incumplimiento: priorizar al inicio de la secuencia.'
                        : dias <= 3 ? 'Holgura ajustada: mantener posición o adelantar si hay capacidad.'
                        : 'Holgura amplia: puede reprogramarse sin afectar la entrega.'}
                    </Typography>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                <Button onClick={() => setSel(null)} sx={{ color: MUTED }}>Cerrar</Button>
                <Button variant="contained" startIcon={<RestartAltIcon />}
                  onClick={() => { notify(`OP ${op.op} marcada para reprogramación`, 'success'); setSel(null) }}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px' }}>
                  Reprogramar
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog añadir OP a la secuencia ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ fontSize: 18, color: MES_COLOR }} />
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Añadir OP a la secuencia</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setCreateOpen(false)}><CloseIcon sx={{ fontSize: 18, color: MUTED }} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1 }}>
            <TextField select fullWidth size="small" label="Producto *" value={form.producto}
              onChange={e => setField('producto', e.target.value)} sx={{ ...inputSx, gridColumn: { sm: '1 / -1' } }}
              error={tried && !form.producto} helperText={tried && !form.producto ? 'Seleccione el producto' : ' '}>
              {PRODUCTOS.map(p => (
                <MenuItem key={p.codigo} value={p.codigo}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: p.color }} />
                    <span>{p.nombre} ({p.codigo})</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <TextField select fullWidth size="small" label="Línea *" value={form.linea}
              onChange={e => setField('linea', e.target.value)} sx={inputSx}
              error={tried && !form.linea} helperText={tried && !form.linea ? 'Seleccione la línea' : ' '}>
              {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>

            <TextField fullWidth size="small" label="Máquina" value={form.linea ? (MAQUINAS[form.linea] ?? '') : ''}
              InputProps={{ readOnly: true }} sx={{ ...inputSx, '& .MuiOutlinedInput-root': { color: MUTED, bgcolor: SOFT_BG } }}
              helperText="Se autocompleta según la línea" />

            <TextField select fullWidth size="small" label="Prioridad" value={form.prioridad}
              onChange={e => setField('prioridad', e.target.value)} sx={inputSx} helperText=" ">
              {PRIORIDADES.map(p => (
                <MenuItem key={p} value={p}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: prioridadColor(p) }} />
                    <span>{p}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <TextField fullWidth size="small" label="Entrega *" type="date" value={form.entrega}
              onChange={e => setField('entrega', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx}
              error={tried && !form.entrega} helperText={tried && !form.entrega ? 'Fecha requerida' : ' '} />

            <TextField fullWidth size="small" label="Cantidad *" type="number" value={form.cantidad}
              onChange={e => setField('cantidad', e.target.value)} sx={inputSx}
              error={tried && !(Number(form.cantidad) > 0)}
              helperText={tried && !(Number(form.cantidad) > 0) ? 'Cantidad requerida' : form.producto ? `Unidad: ${prodUnidad(form.producto)}` : ' '} />

            <TextField fullWidth size="small" label="Setup (min)" type="number" value={form.setup}
              onChange={e => setField('setup', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>min</Typography></InputAdornment> }}
              sx={inputSx} helperText=" " />

            <TextField fullWidth size="small" label="Proceso (min) *" type="number" value={form.proceso}
              onChange={e => setField('proceso', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>min</Typography></InputAdornment> }}
              sx={inputSx}
              error={tried && !(Number(form.proceso) > 0)}
              helperText={tried && !(Number(form.proceso) > 0) ? 'Proceso requerido' : ' '} />

            <TextField select fullWidth size="small" label="Responsable" value={form.responsable}
              onChange={e => setField('responsable', e.target.value)} sx={{ ...inputSx, gridColumn: { sm: '1 / -1' } }} helperText=" ">
              {RESPONSABLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: MUTED }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValido}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px',
              '&:disabled': { bgcolor: alpha(MES_COLOR, 0.3), color: '#fff' } }}>
            Añadir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MESProgramacion() {
  const [tab, setTab] = useState(0)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify: NotifyFn = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  return (
    <Layout title="MES · Programación APS">
      <Box sx={{ minHeight: '100%', p: { xs: 2, sm: 3 }, mx: -3, mt: -3 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Box sx={{ width: 4, height: 20, bgcolor: MES_COLOR, borderRadius: '2px' }} />
                <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  MES · Programación Finita
                </Typography>
              </Stack>
              <Typography sx={{ color: TEXT, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                APS — Planificación de Capacidad
              </Typography>
            </Box>
            <Chip label="Semana 25 · 2026"
              sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700, border: `1px solid ${alpha(MES_COLOR, 0.3)}` }} />
          </Stack>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
            <Tab label="Gantt" />
            <Tab label="Carga Capacidad" />
            <Tab label="Secuenciación" />
          </Tabs>

          {tab === 0 && <TabGantt notify={notify} />}
          {tab === 1 && <TabCargaCapacidad notify={notify} />}
          {tab === 2 && <TabSecuenciacion notify={notify} />}
        </Box>
      </Box>

      {/* Snackbar global */}
      <Snackbar open={snack.open} autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
