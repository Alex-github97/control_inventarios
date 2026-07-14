import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  TextField,
  alpha,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  InputAdornment,
  Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReportIcon from '@mui/icons-material/Report'
import AddIcon from '@mui/icons-material/Add'
import PersonIcon from '@mui/icons-material/Person'
import CloseIcon from '@mui/icons-material/Close'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SpeedIcon from '@mui/icons-material/Speed'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import HistoryIcon from '@mui/icons-material/History'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Layout } from '@/components/layout/Layout'

// ─── Paleta (tema claro) ──────────────────────────────────────────────────────

const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const SURFACE   = '#FFFFFF'
const BORDER    = '#E5E7EB'
const TEXT      = '#1E293B'
const MUTED     = '#64748B'
const SOFT_BG   = '#F8FAFC'

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
  '& .MuiOutlinedInput-root': {
    bgcolor: SURFACE,
    color: TEXT,
    borderRadius: '8px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: MES_COLOR },
    '&.Mui-focused fieldset': { borderColor: MES_COLOR },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: MES_COLOR },
  '& .MuiSelect-icon': { color: MUTED },
  '& .MuiFormHelperText-root': { marginLeft: 0 },
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type OpEstado = 'EN_PROGRESO' | 'PAUSADA' | 'COMPLETADA'

interface Material {
  nombre: string
  cantidad: number
  unidad: string
}

interface OperacionActiva {
  op: string
  linea: string
  operario: string
  equipo: string
  producto: string
  producido: number
  meta: number
  tiempoMin: number
  estado: OpEstado
  turno: string
  lote: string
  cliente: string
  velNominal: number // unidades/hora nominales de la línea
  inicio: string     // hora de arranque
  materiales: Material[]
}

interface RegistroProduccion {
  id: number
  hora: string
  op: string
  buena: number
  scrap: number
  tipo: string
  operario: string
  turno: string
}

interface Parada {
  id: number
  equipo: string
  tipo: string
  causa: string
  horaInicio: string
  duracion: number
  estado: 'ACTIVA' | 'CERRADA'
  responsable: string
  opAfectada: string
  descripcion: string
}

interface WIPItem {
  celda: string
  producto: string
  lote: string
  cantidad: number
  unidad: string
  fechaEntrada: string
  tiempoHrs: number
  responsable: string
  siguienteEtapa: string
}

// ─── Catálogos / constantes de dominio ──────────────────────────────────────────

const OPERARIOS = ['Carlos Ruiz', 'Ana Gómez', 'Luis Pérez', 'Martha Torres', 'Jorge Salinas', 'Patricia Mora']
const EQUIPOS = ['EQ-A01', 'EQ-A02', 'EQ-B01', 'EQ-B02', 'EQ-C01', 'EQ-C02', 'EQ-D01', 'EQ-E01']
const TIPOS_PARADA = ['MECÁNICA', 'ELÉCTRICA', 'CALIDAD', 'MATERIAL', 'SETUP', 'OPERATIVA']
const CAUSAS_PARADA = ['Falla rodamiento', 'Corte alimentación', 'Ajuste banda', 'Cambio de formato', 'Espera de MP', 'Inspección lote', 'Pausa operario', 'Calibración sensor', 'Cambio lote']
const TIPOS_SCRAP = ['NORMAL', 'REPROCESO', 'DEFECTO']
const TURNOS = [
  { value: '1', label: 'Turno 1 (6:00–14:00)' },
  { value: '2', label: 'Turno 2 (14:00–22:00)' },
  { value: '3', label: 'Turno 3 (22:00–6:00)' },
]

// ─── Datos mock ───────────────────────────────────────────────────────────────

const OPERACIONES_INIT: OperacionActiva[] = [
  { op: 'OP-2401', linea: 'Línea A', operario: 'Carlos Ruiz',   equipo: 'EQ-A01', producto: 'Aceite Motor 5W-30 1L',   producido: 840,  meta: 1200, tiempoMin: 187, estado: 'EN_PROGRESO', turno: '1', lote: 'LOT-2026-004', cliente: 'Distribuidora Andina', velNominal: 320,
    inicio: '06:12', materiales: [ { nombre: 'Base Aceite Mineral', cantidad: 780, unidad: 'kg' }, { nombre: 'Aditivo Paquete A', cantidad: 96, unidad: 'kg' }, { nombre: 'Envase PET 1L', cantidad: 1200, unidad: 'und' }, { nombre: 'Tapa rosca', cantidad: 1200, unidad: 'und' }, { nombre: 'Etiqueta frontal', cantidad: 1200, unidad: 'und' } ] },
  { op: 'OP-2403', linea: 'Línea B', operario: 'Ana Gómez',     equipo: 'EQ-B01', producto: 'Grasa Industrial #2',      producido: 320,  meta: 500,  tiempoMin: 245, estado: 'EN_PROGRESO', turno: '1', lote: 'LOT-2026-005', cliente: 'Minera del Norte', velNominal: 90,
    inicio: '06:05', materiales: [ { nombre: 'Aceite base grupo II', cantidad: 300, unidad: 'kg' }, { nombre: 'Espesante litio', cantidad: 45, unidad: 'kg' }, { nombre: 'Aditivo EP', cantidad: 12, unidad: 'kg' }, { nombre: 'Cartucho 400g', cantidad: 500, unidad: 'und' } ] },
  { op: 'OP-2405', linea: 'Línea C', operario: 'Luis Pérez',    equipo: 'EQ-C01', producto: 'Desengrasante Industrial', producido: 0,    meta: 800,  tiempoMin: 12,  estado: 'PAUSADA', turno: '1', lote: 'LOT-2026-008', cliente: 'Talleres Unidos', velNominal: 260,
    inicio: '07:40', materiales: [ { nombre: 'Solvente base', cantidad: 640, unidad: 'kg' }, { nombre: 'Tensoactivo', cantidad: 48, unidad: 'kg' }, { nombre: 'Envase 1L', cantidad: 800, unidad: 'und' } ] },
  { op: 'OP-2408', linea: 'Línea D', operario: 'Martha Torres', equipo: 'EQ-D01', producto: 'Aceite Compresor VDL 100', producido: 1100, meta: 1500, tiempoMin: 302, estado: 'EN_PROGRESO', turno: '1', lote: 'LOT-2026-007', cliente: 'IndustriAir S.A.', velNominal: 300,
    inicio: '06:00', materiales: [ { nombre: 'Base sintética', cantidad: 1350, unidad: 'kg' }, { nombre: 'Antioxidante', cantidad: 60, unidad: 'kg' }, { nombre: 'Envase 1L', cantidad: 1500, unidad: 'und' }, { nombre: 'Tapa rosca', cantidad: 1500, unidad: 'und' } ] },
  { op: 'OP-2410', linea: 'Línea C', operario: 'Jorge Salinas', equipo: 'EQ-C02', producto: 'Filtro Aceite Premium',    producido: 200,  meta: 600,  tiempoMin: 95,  estado: 'PAUSADA', turno: '1', lote: 'LOT-2026-011', cliente: 'AutoPartes Bogotá', velNominal: 180,
    inicio: '07:05', materiales: [ { nombre: 'Cuerpo metálico', cantidad: 600, unidad: 'und' }, { nombre: 'Elemento filtrante', cantidad: 600, unidad: 'und' }, { nombre: 'Empaque sello', cantidad: 600, unidad: 'und' } ] },
  { op: 'OP-2413', linea: 'Línea E', operario: 'Patricia Mora', equipo: 'EQ-E01', producto: 'Fluido Frenos DOT 4',      producido: 450,  meta: 700,  tiempoMin: 178, estado: 'EN_PROGRESO', turno: '1', lote: 'LOT-2026-006', cliente: 'Frenos del Valle', velNominal: 210,
    inicio: '06:20', materiales: [ { nombre: 'Glicol base', cantidad: 480, unidad: 'kg' }, { nombre: 'Inhibidor corrosión', cantidad: 18, unidad: 'kg' }, { nombre: 'Envase 500ml', cantidad: 700, unidad: 'und' } ] },
]

const REGISTROS_INIT: RegistroProduccion[] = [
  { id: 1,  hora: '07:15', op: 'OP-2401', buena: 120, scrap: 3,  tipo: 'NORMAL',    operario: 'Carlos Ruiz',   turno: '1' },
  { id: 2,  hora: '07:45', op: 'OP-2403', buena: 80,  scrap: 0,  tipo: 'NORMAL',    operario: 'Ana Gómez',     turno: '1' },
  { id: 3,  hora: '08:00', op: 'OP-2408', buena: 200, scrap: 5,  tipo: 'REPROCESO', operario: 'Martha Torres', turno: '1' },
  { id: 4,  hora: '08:30', op: 'OP-2401', buena: 130, scrap: 2,  tipo: 'NORMAL',    operario: 'Carlos Ruiz',   turno: '1' },
  { id: 5,  hora: '08:45', op: 'OP-2413', buena: 90,  scrap: 8,  tipo: 'DEFECTO',   operario: 'Patricia Mora', turno: '1' },
  { id: 6,  hora: '09:00', op: 'OP-2403', buena: 100, scrap: 1,  tipo: 'NORMAL',    operario: 'Ana Gómez',     turno: '1' },
  { id: 7,  hora: '09:20', op: 'OP-2408', buena: 180, scrap: 0,  tipo: 'NORMAL',    operario: 'Martha Torres', turno: '1' },
  { id: 8,  hora: '09:45', op: 'OP-2401', buena: 140, scrap: 4,  tipo: 'NORMAL',    operario: 'Carlos Ruiz',   turno: '1' },
  { id: 9,  hora: '10:00', op: 'OP-2413', buena: 110, scrap: 2,  tipo: 'NORMAL',    operario: 'Patricia Mora', turno: '1' },
  { id: 10, hora: '10:30', op: 'OP-2403', buena: 140, scrap: 0,  tipo: 'NORMAL',    operario: 'Ana Gómez',     turno: '1' },
]

const PARADAS_INIT: Parada[] = [
  { id: 1, equipo: 'EQ-C01', tipo: 'MECÁNICA',  causa: 'Falla rodamiento',   horaInicio: '06:30', duracion: 45, estado: 'CERRADA', responsable: 'Luis Pérez',    opAfectada: 'OP-2405', descripcion: 'Rodamiento del eje principal con juego excesivo, se reemplazó.' },
  { id: 2, equipo: 'EQ-B02', tipo: 'SETUP',     causa: 'Cambio de formato',  horaInicio: '07:00', duracion: 25, estado: 'CERRADA', responsable: 'Ana Gómez',     opAfectada: '—',       descripcion: 'Ajuste de guías para envase de menor calibre.' },
  { id: 3, equipo: 'EQ-A03', tipo: 'MATERIAL',  causa: 'Espera de MP',       horaInicio: '07:45', duracion: 30, estado: 'CERRADA', responsable: 'Carlos Ruiz',   opAfectada: 'OP-2401', descripcion: 'Espera de reposición de envase PET desde bodega.' },
  { id: 4, equipo: 'EQ-C02', tipo: 'CALIDAD',   causa: 'Inspección lote',    horaInicio: '08:15', duracion: 20, estado: 'CERRADA', responsable: 'Jorge Salinas', opAfectada: 'OP-2410', descripcion: 'Retención preventiva por variación de torque de tapa.' },
  { id: 5, equipo: 'EQ-D01', tipo: 'ELÉCTRICA', causa: 'Corte alimentación', horaInicio: '08:50', duracion: 10, estado: 'CERRADA', responsable: 'Martha Torres', opAfectada: 'OP-2408', descripcion: 'Disparo de breaker por sobrecarga momentánea.' },
  { id: 6, equipo: 'EQ-E01', tipo: 'OPERATIVA', causa: 'Pausa operario',     horaInicio: '09:20', duracion: 8,  estado: 'CERRADA', responsable: 'Patricia Mora', opAfectada: 'OP-2413', descripcion: 'Pausa reglamentaria de descanso.' },
  { id: 7, equipo: 'EQ-C01', tipo: 'MECÁNICA',  causa: 'Ajuste banda',       horaInicio: '10:10', duracion: 0,  estado: 'ACTIVA',  responsable: 'Luis Pérez',    opAfectada: 'OP-2405', descripcion: 'Tensado de banda transportadora en curso.' },
  { id: 8, equipo: 'EQ-B01', tipo: 'SETUP',     causa: 'Cambio lote',        horaInicio: '10:40', duracion: 0,  estado: 'ACTIVA',  responsable: 'Ana Gómez',     opAfectada: 'OP-2403', descripcion: 'Preparación de siguiente lote de grasa.' },
]

const WIP_INIT: WIPItem[] = [
  { celda: 'MEZCLADO-01', producto: 'Base Aceite Mineral',      lote: 'LOT-2026-001', cantidad: 480, unidad: 'kg',  fechaEntrada: '10:00', tiempoHrs: 0.8, responsable: 'Carlos Ruiz',   siguienteEtapa: 'FILTRADO-01' },
  { celda: 'FILTRADO-01', producto: 'Aceite Mineral Tratado',   lote: 'LOT-2026-002', cantidad: 320, unidad: 'kg',  fechaEntrada: '08:30', tiempoHrs: 2.2, responsable: 'Ana Gómez',     siguienteEtapa: 'DOSIF-01' },
  { celda: 'DOSIF-01',    producto: 'Compuesto Aditivo A',      lote: 'LOT-2026-003', cantidad: 150, unidad: 'kg',  fechaEntrada: '06:00', tiempoHrs: 4.7, responsable: 'Luis Pérez',    siguienteEtapa: 'ENVASADO-01' },
  { celda: 'ENVASADO-01', producto: 'Aceite Motor 5W-30 1L',    lote: 'LOT-2026-004', cantidad: 840, unidad: 'und', fechaEntrada: '07:15', tiempoHrs: 3.5, responsable: 'Carlos Ruiz',   siguienteEtapa: 'ETIQ-01' },
  { celda: 'ETIQ-01',     producto: 'Aceite Motor 5W-30 1L',    lote: 'LOT-2026-004', cantidad: 700, unidad: 'und', fechaEntrada: '05:00', tiempoHrs: 5.7, responsable: 'Jorge Salinas', siguienteEtapa: 'PALLETIZ-01' },
  { celda: 'DOSIF-02',    producto: 'Grasa Industrial #2',      lote: 'LOT-2026-005', cantidad: 200, unidad: 'kg',  fechaEntrada: '02:00', tiempoHrs: 8.7, responsable: 'Ana Gómez',     siguienteEtapa: 'ENVASADO-02' },
  { celda: 'ENVASADO-02', producto: 'Fluido Frenos DOT 4',      lote: 'LOT-2026-006', cantidad: 450, unidad: 'und', fechaEntrada: '09:00', tiempoHrs: 1.7, responsable: 'Patricia Mora', siguienteEtapa: 'ETIQ-01' },
  { celda: 'PALLETIZ-01', producto: 'Aceite Compresor VDL 100', lote: 'LOT-2026-007', cantidad: 700, unidad: 'und', fechaEntrada: '04:00', tiempoHrs: 6.7, responsable: 'Martha Torres', siguienteEtapa: 'DESPACHO' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tiempoStr(min: number) {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  return h > 0 ? `${h}h ${r}m` : `${r}m`
}

function tipoParadaColor(tipo: string) {
  switch (tipo) {
    case 'MECÁNICA':  return '#EF4444'
    case 'ELÉCTRICA': return '#F59E0B'
    case 'CALIDAD':   return '#8B5CF6'
    case 'MATERIAL':  return '#0891B2'
    case 'SETUP':     return '#10B981'
    case 'OPERATIVA': return '#6B7280'
    default: return MUTED
  }
}

function scrapColor(tipo: string) {
  return tipo === 'NORMAL' ? MES_COLOR : tipo === 'REPROCESO' ? '#F59E0B' : '#EF4444'
}

function wipSemaforo(hrs: number): { color: string; label: string } {
  if (hrs < 4) return { color: '#10B981', label: 'Normal' }
  if (hrs < 8) return { color: '#F59E0B', label: 'Alerta' }
  return { color: '#EF4444', label: 'Crítico' }
}

const estadoMeta: Record<OpEstado, { label: string; color: string }> = {
  EN_PROGRESO: { label: 'En progreso', color: '#10B981' },
  PAUSADA:     { label: 'Pausada',     color: '#F59E0B' },
  COMPLETADA:  { label: 'Completada',  color: '#64748B' },
}

// Estadísticas derivadas de una OP a partir de sus registros y paradas
function opStats(op: OperacionActiva, registros: RegistroProduccion[], paradas: Parada[]) {
  const regs = registros.filter(r => r.op === op.op)
  const buena = regs.reduce((s, r) => s + r.buena, 0)
  const scrap = regs.reduce((s, r) => s + r.scrap, 0)
  const totalReg = buena + scrap
  const calidad = totalReg > 0 ? (buena / totalReg) * 100 : 100
  const parosMin = paradas.filter(p => p.equipo === op.equipo && p.estado === 'CERRADA').reduce((s, p) => s + p.duracion, 0)
  const disponibilidad = op.tiempoMin > 0 ? (op.tiempoMin / (op.tiempoMin + parosMin)) * 100 : 100
  const teorico = op.velNominal * (op.tiempoMin / 60)
  const rendimiento = teorico > 0 ? Math.min(100, (op.producido / teorico) * 100) : 0
  const oee = (disponibilidad / 100) * (rendimiento / 100) * (calidad / 100) * 100
  const pct = Math.min(100, Math.round((op.producido / op.meta) * 100))
  const restantes = Math.max(0, op.meta - op.producido)
  const ritmo = op.tiempoMin > 0 ? op.producido / op.tiempoMin : 0 // un/min
  const etaMin = ritmo > 0 ? restantes / ritmo : 0
  return { regs, buena, scrap, calidad, parosMin, disponibilidad, rendimiento, oee, pct, restantes, ritmo, etaMin }
}

// ─── Piezas reutilizables ───────────────────────────────────────────────────────

function KpiTile({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <Box sx={{ bgcolor: SOFT_BG, borderRadius: '10px', p: 1.5, border: `1px solid ${BORDER}` }}>
      <Typography sx={{ color: MUTED, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>{label}</Typography>
      <Stack direction="row" spacing={0.75} alignItems="baseline">
        <Typography sx={{ color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
        {unit && <Typography sx={{ color: MUTED, fontSize: 12 }}>{unit}</Typography>}
      </Stack>
    </Box>
  )
}

function FichaCampo({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ bgcolor: SOFT_BG, borderRadius: '8px', p: 1.25, border: `1px solid ${BORDER}` }}>
      <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{value}</Typography>
    </Box>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
      {icon}
      <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 13.5 }}>{children}</Typography>
    </Stack>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <Box sx={{ height: 8, bgcolor: alpha(MES_COLOR, 0.12), borderRadius: '4px', overflow: 'hidden' }}>
      <Box sx={{
        height: '100%', width: `${pct}%`,
        bgcolor: pct >= 90 ? '#10B981' : pct >= 60 ? MES_COLOR : '#F59E0B',
        borderRadius: '4px', transition: 'width 0.4s ease',
      }} />
    </Box>
  )
}

const thSx = { color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 } as const

// ─── Tab 0: Operaciones Activas ───────────────────────────────────────────────

function TabOperaciones({ operaciones, registros, paradas, onOpen, onAction, onParada }: {
  operaciones: OperacionActiva[]
  registros: RegistroProduccion[]
  paradas: Parada[]
  onOpen: (op: OperacionActiva) => void
  onAction: (opCode: string, action: 'pausar' | 'reanudar' | 'completar') => void
  onParada: (equipo: string) => void
}) {
  const [filtroLinea, setFiltroLinea] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  const lineas = ['Todas', ...Array.from(new Set(operaciones.map(o => o.linea)))]

  const filtradas = operaciones.filter(o => {
    if (filtroLinea !== 'Todas' && o.linea !== filtroLinea) return false
    if (filtroEstado !== 'Todos' && o.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!o.op.toLowerCase().includes(q) && !o.producto.toLowerCase().includes(q) && !o.operario.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <Box>
      {/* Filtros */}
      <Card sx={{ ...cardSx, mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField size="small" placeholder="Buscar OP, producto u operario..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)} sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }} />
            <TextField select size="small" label="Línea" value={filtroLinea}
              onChange={e => setFiltroLinea(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
              {lineas.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Estado" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="EN_PROGRESO">En progreso</MenuItem>
              <MenuItem value="PAUSADA">Pausada</MenuItem>
              <MenuItem value="COMPLETADA">Completada</MenuItem>
            </TextField>
            <Typography sx={{ color: MUTED, fontSize: 12, ml: 'auto' }}>{filtradas.length} operaciones</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {filtradas.map(op => {
          const st = opStats(op, registros, paradas)
          const meta = estadoMeta[op.estado]
          const completa = op.estado === 'COMPLETADA'
          return (
            <Grid key={op.op} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                onClick={() => onOpen(op)}
                sx={{
                  ...cardSx, height: '100%', cursor: 'pointer',
                  transition: 'border-color .15s, box-shadow .15s, transform .15s',
                  '&:hover': { borderColor: alpha(MES_COLOR, 0.5), boxShadow: '0 6px 18px rgba(8,145,178,0.12)', transform: 'translateY(-2px)' },
                }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                      <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 15 }}>{op.op}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>{op.linea} · {op.equipo}</Typography>
                    </Box>
                    <Chip label={meta.label} size="small"
                      sx={{ bgcolor: alpha(meta.color, 0.12), color: meta.color, fontWeight: 700, border: `1px solid ${alpha(meta.color, 0.4)}`, fontSize: 11 }} />
                  </Stack>

                  <Typography sx={{ color: TEXT, fontSize: 13, mb: 1.5, fontWeight: 600 }} noWrap>{op.producto}</Typography>

                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <PersonIcon sx={{ fontSize: 14, color: MUTED }} />
                    <Typography sx={{ color: MUTED, fontSize: 12 }}>{op.operario}</Typography>
                    <Chip label={`OEE ${st.oee.toFixed(0)}%`} size="small"
                      sx={{ ml: 'auto', bgcolor: alpha(MES_COLOR, 0.1), color: MES_COLOR, fontWeight: 700, fontSize: 10 }} />
                  </Stack>

                  <Box mb={1}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography sx={{ color: MUTED, fontSize: 11 }}>Producción</Typography>
                      <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>
                        {op.producido.toLocaleString('es-CO')} / {op.meta.toLocaleString('es-CO')} un
                      </Typography>
                    </Stack>
                    <ProgressBar pct={st.pct} />
                    <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.25 }}>{st.pct}% completado · faltan {st.restantes.toLocaleString('es-CO')} un</Typography>
                  </Box>

                  <Stack direction="row" justifyContent="space-between" mb={2}>
                    <Typography sx={{ color: MUTED, fontSize: 12 }}>Tiempo transcurrido</Typography>
                    <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{tiempoStr(op.tiempoMin)}</Typography>
                  </Stack>

                  <Divider sx={{ borderColor: BORDER, mb: 1.5 }} />

                  <Stack direction="row" spacing={1} onClick={e => e.stopPropagation()}>
                    {op.estado === 'PAUSADA' ? (
                      <Button size="small" startIcon={<PlayArrowIcon />} disabled={completa}
                        onClick={() => onAction(op.op, 'reanudar')}
                        sx={{ flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#10B981', border: `1px solid ${alpha('#10B981', 0.3)}`, '&:hover': { bgcolor: alpha('#10B981', 0.08) } }}>
                        Reanudar
                      </Button>
                    ) : (
                      <Button size="small" startIcon={<PauseIcon />} disabled={completa}
                        onClick={() => onAction(op.op, 'pausar')}
                        sx={{ flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#F59E0B', border: `1px solid ${alpha('#F59E0B', 0.3)}`, '&:hover': { bgcolor: alpha('#F59E0B', 0.08) }, '&.Mui-disabled': { color: alpha(MUTED, 0.4), border: `1px solid ${alpha(MUTED, 0.2)}` } }}>
                        Pausar
                      </Button>
                    )}
                    <Button size="small" startIcon={<CheckCircleIcon />} disabled={completa}
                      onClick={() => onAction(op.op, 'completar')}
                      sx={{ flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#10B981', border: `1px solid ${alpha('#10B981', 0.3)}`, '&:hover': { bgcolor: alpha('#10B981', 0.08) }, '&.Mui-disabled': { color: alpha(MUTED, 0.4), border: `1px solid ${alpha(MUTED, 0.2)}` } }}>
                      Completar
                    </Button>
                    <Button size="small" startIcon={<ReportIcon />}
                      onClick={() => onParada(op.equipo)}
                      sx={{ flex: 1, borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#EF4444', border: `1px solid ${alpha('#EF4444', 0.3)}`, '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>
                      Parada
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
        {filtradas.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={cardSx}><CardContent><Typography sx={{ color: MUTED, textAlign: 'center', py: 3 }}>No hay operaciones que coincidan con los filtros.</Typography></CardContent></Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

// ─── Tab 1: Registrar Producción ──────────────────────────────────────────────

interface RegForm { op: string; buena: string; scrap: string; tipoScrap: string; turno: string; operario: string; obs: string }
const EMPTY_REG: RegForm = { op: '', buena: '', scrap: '0', tipoScrap: 'NORMAL', turno: '1', operario: '', obs: '' }

function TabRegistrarProduccion({ operaciones, registros, onAdd, onOpenReg, notify }: {
  operaciones: OperacionActiva[]
  registros: RegistroProduccion[]
  onAdd: (reg: Omit<RegistroProduccion, 'id'>) => void
  onOpenReg: (reg: RegistroProduccion) => void
  notify: (msg: string, sev?: 'success' | 'info' | 'warning') => void
}) {
  const [form, setForm] = useState<RegForm>(EMPTY_REG)
  const [tried, setTried] = useState(false)

  const activas = operaciones.filter(o => o.estado === 'EN_PROGRESO')
  const opSel = operaciones.find(o => o.op === form.op)

  const setField = (f: keyof RegForm, v: string) => setForm(prev => ({ ...prev, [f]: v }))
  const setOp = (opCode: string) => {
    const o = operaciones.find(x => x.op === opCode)
    setForm(prev => ({ ...prev, op: opCode, operario: o ? o.operario : prev.operario, turno: o ? o.turno : prev.turno }))
  }

  const buenaNum = parseInt(form.buena, 10)
  const invalidBuena = form.buena === '' || isNaN(buenaNum) || buenaNum < 0

  const handleGuardar = () => {
    if (!form.op || invalidBuena) {
      setTried(true)
      notify('Complete los campos obligatorios: OP y cantidad buena', 'warning')
      return
    }
    const now = new Date()
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    onAdd({
      hora, op: form.op, buena: buenaNum, scrap: parseInt(form.scrap, 10) || 0,
      tipo: form.tipoScrap, operario: form.operario || (opSel ? opSel.operario : '—'), turno: form.turno,
    })
    notify(`Registro de ${buenaNum} un guardado para ${form.op}`, 'success')
    setForm({ ...EMPTY_REG, op: form.op, operario: form.operario, turno: form.turno })
    setTried(false)
  }

  const ultimos = [...registros].slice(0, 10)

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2.5 }}>Nuevo registro de producción</Typography>
            <Stack spacing={2}>
              <TextField select fullWidth size="small" label="OP activa *" value={form.op}
                onChange={e => setOp(e.target.value)}
                error={tried && !form.op}
                helperText={tried && !form.op ? 'Seleccione la orden de producción' : 'Solo OP en progreso'}
                sx={inputSx}>
                <MenuItem value=""><em>Seleccionar OP...</em></MenuItem>
                {activas.map(o => <MenuItem key={o.op} value={o.op}>{o.op} — {o.producto}</MenuItem>)}
              </TextField>

              <TextField fullWidth size="small" label="Producto" value={opSel ? opSel.producto : ''}
                InputProps={{ readOnly: true }}
                helperText="Se autocompleta con la OP"
                sx={{ ...inputSx, '& .MuiOutlinedInput-root': { ...inputSx['& .MuiOutlinedInput-root'], bgcolor: SOFT_BG, color: MUTED } }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Cantidad buena *" type="number" value={form.buena}
                    onChange={e => setField('buena', e.target.value)}
                    error={tried && invalidBuena}
                    helperText={tried && invalidBuena ? 'Requerida (≥ 0)' : ' '}
                    InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>un</Typography></InputAdornment> }}
                    sx={inputSx} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Cantidad scrap" type="number" value={form.scrap}
                    onChange={e => setField('scrap', e.target.value)} helperText=" "
                    InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>un</Typography></InputAdornment> }}
                    sx={inputSx} />
                </Grid>
              </Grid>

              <TextField select fullWidth size="small" label="Tipo de registro" value={form.tipoScrap}
                onChange={e => setField('tipoScrap', e.target.value)} sx={inputSx}>
                {TIPOS_SCRAP.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField select fullWidth size="small" label="Turno" value={form.turno}
                    onChange={e => setField('turno', e.target.value)} sx={inputSx}>
                    {TURNOS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField select fullWidth size="small" label="Operario" value={form.operario}
                    onChange={e => setField('operario', e.target.value)} sx={inputSx}>
                    <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                    {OPERARIOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>

              <TextField fullWidth size="small" label="Observaciones" multiline rows={2} value={form.obs}
                onChange={e => setField('obs', e.target.value)} sx={inputSx} />

              <Button variant="contained" onClick={handleGuardar}
                disabled={!form.op || invalidBuena}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&.Mui-disabled': { bgcolor: alpha(MES_COLOR, 0.35), color: '#fff' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, py: 1.2 }}>
                Guardar registro
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>Últimos registros del turno</Typography>
              <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => notify('Registros exportados a Excel', 'info')}
                sx={{ color: MES_COLOR, textTransform: 'none', fontSize: 12, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '7px', '&:hover': { bgcolor: alpha(MES_COLOR, 0.06) } }}>
                Exportar
              </Button>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>{['Hora', 'OP', 'Buena', 'Scrap', 'Tipo', 'Operario'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {ultimos.map(r => (
                    <TableRow key={r.id} hover onClick={() => onOpenReg(r)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) } }}>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{r.hora}</TableCell>
                      <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontWeight: 600, fontSize: 12 }}>{r.op}</TableCell>
                      <TableCell sx={{ color: '#10B981', borderColor: BORDER, fontWeight: 600 }}>{r.buena}</TableCell>
                      <TableCell sx={{ color: r.scrap > 0 ? '#EF4444' : MUTED, borderColor: BORDER, fontWeight: r.scrap > 0 ? 700 : 400 }}>{r.scrap}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Chip label={r.tipo} size="small" sx={{ bgcolor: alpha(scrapColor(r.tipo), 0.12), color: scrapColor(r.tipo), fontSize: 10, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{r.operario}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// ─── Tab 2: Paradas ───────────────────────────────────────────────────────────

function TabParadas({ paradas, onOpen, onNueva, notify }: {
  paradas: Parada[]
  onOpen: (p: Parada) => void
  onNueva: () => void
  notify: (msg: string, sev?: 'success' | 'info' | 'warning') => void
}) {
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const filtradas = paradas.filter(p => {
    if (filtroTipo !== 'Todos' && p.tipo !== filtroTipo) return false
    if (filtroEstado !== 'Todos' && p.estado !== filtroEstado) return false
    return true
  })

  const totalMin = paradas.reduce((s, p) => s + p.duracion, 0)
  const activas = paradas.filter(p => p.estado === 'ACTIVA').length
  const perdidoPct = ((totalMin / 480) * 100).toFixed(1)

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 1 }}>Gestión de paradas</Typography>
            <Typography sx={{ color: MUTED, fontSize: 12.5, mb: 2 }}>
              Registra tiempos de paro por equipo con motivo desde el catálogo, para el cálculo de disponibilidad y OEE.
            </Typography>
            <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={onNueva}
              sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, py: 1.2 }}>
              Registrar parada
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ ...cardSx, mt: 2 }}>
          <CardContent>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 14, mb: 1.5 }}>Resumen del turno</Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Tiempo total de paro</Typography>
                <Typography sx={{ color: '#EF4444', fontSize: 14, fontWeight: 700 }}>{totalMin} min</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>% tiempo perdido</Typography>
                <Typography sx={{ color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>{perdidoPct}%</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Paradas registradas</Typography>
                <Typography sx={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{paradas.length}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Paradas activas</Typography>
                <Typography sx={{ color: activas > 0 ? '#EF4444' : '#10B981', fontSize: 14, fontWeight: 700 }}>{activas}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={cardSx}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>Paradas del turno</Typography>
              <Stack direction="row" spacing={1}>
                <TextField select size="small" label="Tipo" value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)} sx={{ minWidth: 130, ...inputSx }}>
                  <MenuItem value="Todos">Todos</MenuItem>
                  {TIPOS_PARADA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Estado" value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 120, ...inputSx }}>
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="ACTIVA">Activa</MenuItem>
                  <MenuItem value="CERRADA">Cerrada</MenuItem>
                </TextField>
                <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => notify('Paradas exportadas a Excel', 'info')}
                  sx={{ color: MES_COLOR, textTransform: 'none', fontSize: 12, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '7px', '&:hover': { bgcolor: alpha(MES_COLOR, 0.06) } }}>
                  Exportar
                </Button>
              </Stack>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>{['Equipo', 'Tipo', 'Causa', 'Inicio', 'Duración', 'Estado'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.map(p => {
                    const tColor = tipoParadaColor(p.tipo)
                    const eColor = p.estado === 'ACTIVA' ? '#EF4444' : '#10B981'
                    return (
                      <TableRow key={p.id} hover onClick={() => onOpen(p)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) } }}>
                        <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600, fontSize: 12 }}>{p.equipo}</TableCell>
                        <TableCell sx={{ borderColor: BORDER }}>
                          <Chip label={p.tipo} size="small" sx={{ bgcolor: alpha(tColor, 0.12), color: tColor, fontSize: 10, fontWeight: 600, border: `1px solid ${alpha(tColor, 0.3)}` }} />
                        </TableCell>
                        <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{p.causa}</TableCell>
                        <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{p.horaInicio}</TableCell>
                        <TableCell sx={{ color: p.duracion > 0 ? TEXT : MUTED, borderColor: BORDER, fontSize: 12 }}>{p.duracion > 0 ? `${p.duracion} min` : 'En curso'}</TableCell>
                        <TableCell sx={{ borderColor: BORDER }}>
                          <Chip label={p.estado} size="small" sx={{ bgcolor: alpha(eColor, 0.12), color: eColor, fontSize: 10, fontWeight: 700, border: `1px solid ${alpha(eColor, 0.3)}` }} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtradas.length === 0 && (
                    <TableRow><TableCell colSpan={6} sx={{ borderColor: BORDER, color: MUTED, textAlign: 'center', py: 3 }}>Sin paradas para los filtros seleccionados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// ─── Tab 3: WIP ───────────────────────────────────────────────────────────────

function TabWIP({ wipData, onOpen }: { wipData: WIPItem[]; onOpen: (w: WIPItem) => void }) {
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const filtradas = wipData.filter(w => {
    if (filtroEstado === 'Todos') return true
    return wipSemaforo(w.tiempoHrs).label === filtroEstado
  })

  const wipTotal = wipData.reduce((s, w) => s + w.cantidad, 0)
  const criticas = wipData.filter(w => w.tiempoHrs >= 8).length

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'WIP Total', value: wipTotal.toLocaleString('es-CO'), unit: 'un', color: MES_COLOR },
          { label: 'Celdas críticas', value: String(criticas), unit: 'celdas', color: criticas > 0 ? '#EF4444' : '#10B981' },
          { label: 'Throughput actual', value: '420', unit: 'un/h', color: '#10B981' },
        ].map(kpi => (
          <Grid key={kpi.label} size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx}>
              <CardContent>
                <Typography sx={{ color: MUTED, fontSize: 12, mb: 0.5 }}>{kpi.label}</Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography sx={{ color: kpi.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{kpi.value}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 13 }}>{kpi.unit}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={cardSx}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>WIP por celda productiva</Typography>
            <TextField select size="small" label="Semáforo" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 140, ...inputSx }}>
              {['Todos', 'Normal', 'Alerta', 'Crítico'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>{['Celda', 'Producto', 'Lote', 'Cantidad', 'Unidad', 'Entrada', 'Tiempo en celda', 'Estado'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {filtradas.map((w, i) => {
                  const sem = wipSemaforo(w.tiempoHrs)
                  return (
                    <TableRow key={`${w.celda}-${i}`} hover onClick={() => onOpen(w)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) } }}>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600, fontSize: 13 }}>{w.celda}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{w.producto}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{w.lote}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{w.cantidad.toLocaleString('es-CO')}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{w.unidad}</TableCell>
                      <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{w.fechaEntrada}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Typography sx={{ color: sem.color, fontWeight: 700, fontSize: 13 }}>{w.tiempoHrs.toFixed(1)} h</Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: BORDER }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sem.color, boxShadow: `0 0 6px ${alpha(sem.color, 0.7)}` }} />
                          <Typography sx={{ color: sem.color, fontSize: 12, fontWeight: 600 }}>{sem.label}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={3} mt={2} pt={1.5} sx={{ borderTop: `1px solid ${BORDER}` }} flexWrap="wrap" useFlexGap>
            {[
              { color: '#10B981', label: 'Normal — menos de 4 h' },
              { color: '#F59E0B', label: 'Alerta — entre 4 y 8 h' },
              { color: '#EF4444', label: 'Crítico — más de 8 h' },
            ].map(s => (
              <Stack key={s.color} direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                <Typography sx={{ color: MUTED, fontSize: 12 }}>{s.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const dialogPaperSx = { bgcolor: SURFACE, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' }

interface ParadaForm { equipo: string; tipo: string; causa: string; descripcion: string; horaInicio: string; duracion: string; estado: 'ACTIVA' | 'CERRADA'; responsable: string; opAfectada: string }

export default function MESEjecucion() {
  const [tab, setTab] = useState(0)

  const [operaciones, setOperaciones] = useState<OperacionActiva[]>(OPERACIONES_INIT)
  const [registros, setRegistros] = useState<RegistroProduccion[]>([...REGISTROS_INIT].reverse())
  const [paradas, setParadas] = useState<Parada[]>(PARADAS_INIT)
  const [wipData] = useState<WIPItem[]>(WIP_INIT)

  // Dialogos de detalle
  const [opDetail, setOpDetail] = useState<OperacionActiva | null>(null)
  const [regDetail, setRegDetail] = useState<RegistroProduccion | null>(null)
  const [paradaDetail, setParadaDetail] = useState<Parada | null>(null)
  const [wipDetail, setWipDetail] = useState<WIPItem | null>(null)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  // Formulario de parada (Dialog)
  const EMPTY_PARADA: ParadaForm = { equipo: '', tipo: '', causa: '', descripcion: '', horaInicio: new Date().toTimeString().slice(0, 5), duracion: '', estado: 'ACTIVA', responsable: '', opAfectada: '' }
  const [paradaForm, setParadaForm] = useState<ParadaForm>(EMPTY_PARADA)
  const [paradaOpen, setParadaOpen] = useState(false)
  const [triedParada, setTriedParada] = useState(false)

  const abrirParadaForm = (equipoPref = '') => {
    const opDeEquipo = operaciones.find(o => o.equipo === equipoPref)
    setParadaForm({ ...EMPTY_PARADA, equipo: equipoPref, opAfectada: opDeEquipo ? opDeEquipo.op : '', responsable: opDeEquipo ? opDeEquipo.operario : '', horaInicio: new Date().toTimeString().slice(0, 5) })
    setTriedParada(false)
    setParadaOpen(true)
  }

  const setParadaField = (f: keyof ParadaForm, v: string) => {
    if (f === 'equipo') {
      const opDeEquipo = operaciones.find(o => o.equipo === v)
      setParadaForm(prev => ({ ...prev, equipo: v, opAfectada: opDeEquipo ? opDeEquipo.op : prev.opAfectada, responsable: opDeEquipo ? opDeEquipo.operario : prev.responsable }))
      return
    }
    setParadaForm(prev => ({ ...prev, [f]: v }))
  }

  const guardarParada = () => {
    if (!paradaForm.equipo || !paradaForm.tipo || !paradaForm.causa) {
      setTriedParada(true)
      notify('Complete los campos obligatorios: equipo, tipo y causa', 'warning')
      return
    }
    const nextId = paradas.reduce((m, p) => Math.max(m, p.id), 0) + 1
    const nueva: Parada = {
      id: nextId, equipo: paradaForm.equipo, tipo: paradaForm.tipo, causa: paradaForm.causa,
      horaInicio: paradaForm.horaInicio, duracion: parseInt(paradaForm.duracion, 10) || 0,
      estado: paradaForm.estado, responsable: paradaForm.responsable || '—',
      opAfectada: paradaForm.opAfectada || '—', descripcion: paradaForm.descripcion || 'Sin descripción.',
    }
    setParadas(prev => [nueva, ...prev])
    // Si la parada está activa, pausa la OP afectada
    if (nueva.estado === 'ACTIVA' && nueva.opAfectada !== '—') {
      setOperaciones(prev => prev.map(o => o.op === nueva.opAfectada && o.estado === 'EN_PROGRESO' ? { ...o, estado: 'PAUSADA' } : o))
    }
    setParadaOpen(false)
    notify(`Parada registrada en ${nueva.equipo}`, 'success')
  }

  // Acciones de operación
  const opAction = (opCode: string, action: 'pausar' | 'reanudar' | 'completar') => {
    const nuevo: OpEstado = action === 'pausar' ? 'PAUSADA' : action === 'reanudar' ? 'EN_PROGRESO' : 'COMPLETADA'
    setOperaciones(prev => prev.map(o => o.op === opCode ? { ...o, estado: nuevo } : o))
    setOpDetail(d => (d && d.op === opCode ? { ...d, estado: nuevo } : d))
    const msg = action === 'pausar' ? `${opCode} pausada` : action === 'reanudar' ? `${opCode} reanudada` : `${opCode} completada`
    notify(msg, action === 'completar' ? 'success' : 'info')
  }

  // Registro de producción
  const addRegistro = (reg: Omit<RegistroProduccion, 'id'>) => {
    const nextId = registros.reduce((m, r) => Math.max(m, r.id), 0) + 1
    setRegistros(prev => [{ ...reg, id: nextId }, ...prev])
    setOperaciones(prev => prev.map(o => o.op === reg.op ? { ...o, producido: o.producido + reg.buena } : o))
  }

  const activasCount = operaciones.filter(o => o.estado !== 'COMPLETADA').length

  return (
    <>
      <Layout title="MES · Ejecución en Planta">
        <Box sx={{ minHeight: '100%', p: { xs: 2, sm: 3 }, mx: -3, mt: -3 }}>
          <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Box sx={{ width: 4, height: 20, bgcolor: MES_COLOR, borderRadius: '2px' }} />
                  <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>MES · Captura en Planta</Typography>
                </Stack>
                <Typography sx={{ color: TEXT, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Ejecución — Turno 1</Typography>
              </Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip label="Turno 1 · 6:00–14:00" size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.1), color: MES_COLOR, fontWeight: 600, border: `1px solid ${alpha(MES_COLOR, 0.3)}` }} />
                <Chip label={`${activasCount} activas`} size="small" sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981', fontWeight: 600, border: `1px solid ${alpha('#10B981', 0.3)}` }} />
                <Button variant="contained" startIcon={<ReportIcon />} onClick={() => abrirParadaForm()}
                  sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: '9px', textTransform: 'none', fontWeight: 600 }}>
                  Nueva parada
                </Button>
              </Stack>
            </Stack>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
              <Tab label="Operaciones activas" />
              <Tab label="Registrar producción" />
              <Tab label="Paradas" />
              <Tab label="WIP" />
            </Tabs>

            {tab === 0 && <TabOperaciones operaciones={operaciones} registros={registros} paradas={paradas} onOpen={setOpDetail} onAction={opAction} onParada={abrirParadaForm} />}
            {tab === 1 && <TabRegistrarProduccion operaciones={operaciones} registros={registros} onAdd={addRegistro} onOpenReg={setRegDetail} notify={notify} />}
            {tab === 2 && <TabParadas paradas={paradas} onOpen={setParadaDetail} onNueva={() => abrirParadaForm()} notify={notify} />}
            {tab === 3 && <TabWIP wipData={wipData} onOpen={setWipDetail} />}
          </Box>
        </Box>
      </Layout>

      {/* ── Dialog: Detalle de Operación ── */}
      <Dialog open={!!opDetail} onClose={() => setOpDetail(null)} maxWidth="md" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {opDetail && (() => {
          const op = opDetail
          const st = opStats(op, registros, paradas)
          const meta = estadoMeta[op.estado]
          const completa = op.estado === 'COMPLETADA'
          const paradasEquipo = paradas.filter(p => p.equipo === op.equipo)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SpeedIcon sx={{ fontSize: 18, color: MES_COLOR }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>{op.op}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: MUTED }} noWrap>{op.producto}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setOpDetail(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>

              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  {/* Estado + acciones */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip label={meta.label} sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700, border: `1px solid ${alpha(meta.color, 0.4)}` }} />
                    <Box flex={1} />
                    {op.estado === 'PAUSADA' ? (
                      <Button size="small" startIcon={<PlayArrowIcon />} disabled={completa} onClick={() => opAction(op.op, 'reanudar')}
                        sx={{ borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#10B981', border: `1px solid ${alpha('#10B981', 0.3)}` }}>Reanudar</Button>
                    ) : (
                      <Button size="small" startIcon={<PauseIcon />} disabled={completa} onClick={() => opAction(op.op, 'pausar')}
                        sx={{ borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#F59E0B', border: `1px solid ${alpha('#F59E0B', 0.3)}` }}>Pausar</Button>
                    )}
                    <Button size="small" startIcon={<CheckCircleIcon />} disabled={completa} onClick={() => opAction(op.op, 'completar')}
                      sx={{ borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#10B981', border: `1px solid ${alpha('#10B981', 0.3)}` }}>Completar</Button>
                    <Button size="small" startIcon={<ReportIcon />} onClick={() => { setOpDetail(null); abrirParadaForm(op.equipo) }}
                      sx={{ borderRadius: '7px', textTransform: 'none', fontSize: 12, color: '#EF4444', border: `1px solid ${alpha('#EF4444', 0.3)}` }}>Registrar parada</Button>
                  </Stack>

                  {/* KPIs */}
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6, sm: 3 }}><KpiTile label="Avance" value={`${st.pct}%`} color={MES_COLOR} /></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><KpiTile label="OEE" value={st.oee.toFixed(0)} unit="%" color="#8B5CF6" /></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><KpiTile label="Scrap acum." value={String(st.scrap)} unit="un" color="#EF4444" /></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><KpiTile label="ETA restante" value={tiempoStr(st.etaMin)} color="#10B981" /></Grid>
                  </Grid>

                  {/* Progreso */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>Producción acumulada</Typography>
                      <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{op.producido.toLocaleString('es-CO')} / {op.meta.toLocaleString('es-CO')} un · faltan {st.restantes.toLocaleString('es-CO')}</Typography>
                    </Stack>
                    <ProgressBar pct={st.pct} />
                  </Box>

                  {/* OEE breakdown */}
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Disponibilidad', val: st.disponibilidad, sub: `${st.parosMin} min de paro` },
                      { label: 'Rendimiento', val: st.rendimiento, sub: `nom. ${op.velNominal} un/h` },
                      { label: 'Calidad', val: st.calidad, sub: `${st.buena} buenas / ${st.scrap} scrap` },
                    ].map(m => (
                      <Grid key={m.label} size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ bgcolor: SOFT_BG, borderRadius: '10px', p: 1.5, border: `1px solid ${BORDER}` }}>
                          <Typography sx={{ color: MUTED, fontSize: 11, fontWeight: 600, mb: 0.5 }}>{m.label}</Typography>
                          <Typography sx={{ color: TEXT, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{m.val.toFixed(1)}%</Typography>
                          <Box sx={{ mt: 0.75 }}><ProgressBar pct={Math.min(100, m.val)} /></Box>
                          <Typography sx={{ color: MUTED, fontSize: 10.5, mt: 0.5 }}>{m.sub}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Ficha */}
                  <SectionTitle icon={<Inventory2Icon sx={{ fontSize: 16, color: MES_COLOR }} />}>Ficha de la operación</SectionTitle>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Línea', value: op.linea },
                      { label: 'Equipo', value: op.equipo },
                      { label: 'Operario', value: op.operario },
                      { label: 'Turno', value: `Turno ${op.turno}` },
                      { label: 'Lote', value: op.lote },
                      { label: 'Cliente', value: op.cliente },
                      { label: 'Inicio', value: op.inicio },
                      { label: 'Vel. nominal', value: `${op.velNominal} un/h` },
                    ].map(f => <Grid key={f.label} size={{ xs: 6, sm: 3 }}><FichaCampo label={f.label} value={f.value} /></Grid>)}
                  </Grid>

                  {/* Composición / BOM */}
                  <SectionTitle icon={<Inventory2Icon sx={{ fontSize: 16, color: MES_COLOR }} />}>Composición / materiales</SectionTitle>
                  <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
                    <Table size="small">
                      <TableHead><TableRow>{['Material', 'Cantidad', 'Unidad'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {op.materiales.map(m => (
                          <TableRow key={m.nombre}>
                            <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{m.nombre}</TableCell>
                            <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12, fontWeight: 600 }}>{m.cantidad.toLocaleString('es-CO')}</TableCell>
                            <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{m.unidad}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Historial de registros */}
                  <SectionTitle icon={<HistoryIcon sx={{ fontSize: 16, color: MES_COLOR }} />}>Registros de producción de esta OP</SectionTitle>
                  {st.regs.length > 0 ? (
                    <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead><TableRow>{['Hora', 'Buena', 'Scrap', 'Tipo', 'Operario'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}</TableRow></TableHead>
                        <TableBody>
                          {st.regs.map(r => (
                            <TableRow key={r.id}>
                              <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{r.hora}</TableCell>
                              <TableCell sx={{ color: '#10B981', borderColor: BORDER, fontSize: 12, fontWeight: 600 }}>{r.buena}</TableCell>
                              <TableCell sx={{ color: r.scrap > 0 ? '#EF4444' : MUTED, borderColor: BORDER, fontSize: 12 }}>{r.scrap}</TableCell>
                              <TableCell sx={{ borderColor: BORDER }}><Chip label={r.tipo} size="small" sx={{ bgcolor: alpha(scrapColor(r.tipo), 0.12), color: scrapColor(r.tipo), fontSize: 10, fontWeight: 600 }} /></TableCell>
                              <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{r.operario}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : <Typography sx={{ color: MUTED, fontSize: 12.5 }}>Sin registros de producción todavía.</Typography>}

                  {/* Paradas del equipo */}
                  <SectionTitle icon={<WarningAmberIcon sx={{ fontSize: 16, color: '#EF4444' }} />}>Paradas del equipo {op.equipo}</SectionTitle>
                  {paradasEquipo.length > 0 ? (
                    <Stack spacing={1}>
                      {paradasEquipo.map(p => {
                        const tColor = tipoParadaColor(p.tipo)
                        return (
                          <Stack key={p.id} direction="row" spacing={1} alignItems="center" sx={{ bgcolor: SOFT_BG, border: `1px solid ${BORDER}`, borderRadius: '8px', p: 1 }}>
                            <Chip label={p.tipo} size="small" sx={{ bgcolor: alpha(tColor, 0.12), color: tColor, fontSize: 10, fontWeight: 600 }} />
                            <Typography sx={{ color: TEXT, fontSize: 12 }}>{p.causa}</Typography>
                            <Box flex={1} />
                            <Typography sx={{ color: MUTED, fontSize: 11.5 }}>{p.horaInicio} · {p.duracion > 0 ? `${p.duracion} min` : 'En curso'}</Typography>
                          </Stack>
                        )
                      })}
                    </Stack>
                  ) : <Typography sx={{ color: MUTED, fontSize: 12.5 }}>Sin paradas registradas para este equipo.</Typography>}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setOpDetail(null)} sx={{ color: MUTED, textTransform: 'none' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de Registro ── */}
      <Dialog open={!!regDetail} onClose={() => setRegDetail(null)} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {regDetail && (() => {
          const op = operaciones.find(o => o.op === regDetail.op)
          const total = regDetail.buena + regDetail.scrap
          const yieldPct = total > 0 ? (regDetail.buena / total) * 100 : 100
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>Registro · {regDetail.op}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: MUTED }}>{regDetail.hora} · Turno {regDetail.turno}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setRegDetail(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={1.5}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}><KpiTile label="Buena" value={String(regDetail.buena)} unit="un" color="#10B981" /></Grid>
                    <Grid size={{ xs: 6 }}><KpiTile label="Scrap" value={String(regDetail.scrap)} unit="un" color="#EF4444" /></Grid>
                    <Grid size={{ xs: 6 }}><KpiTile label="Total" value={String(total)} unit="un" color={MES_COLOR} /></Grid>
                    <Grid size={{ xs: 6 }}><KpiTile label="Yield" value={yieldPct.toFixed(1)} unit="%" color="#8B5CF6" /></Grid>
                  </Grid>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Producto" value={op ? op.producto : '—'} /></Grid>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Tipo" value={regDetail.tipo} /></Grid>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Operario" value={regDetail.operario} /></Grid>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Equipo" value={op ? op.equipo : '—'} /></Grid>
                  </Grid>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setRegDetail(null)} sx={{ color: MUTED, textTransform: 'none' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de Parada ── */}
      <Dialog open={!!paradaDetail} onClose={() => setParadaDetail(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {paradaDetail && (() => {
          const p = paradaDetail
          const tColor = tipoParadaColor(p.tipo)
          const eColor = p.estado === 'ACTIVA' ? '#EF4444' : '#10B981'
          const costo = p.duracion * 4200 // costo estimado por minuto de paro
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha('#EF4444', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{p.equipo} · Parada #{p.id}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>{p.causa}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setParadaDetail(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    <Chip label={p.tipo} sx={{ bgcolor: alpha(tColor, 0.12), color: tColor, fontWeight: 700, border: `1px solid ${alpha(tColor, 0.3)}` }} />
                    <Chip label={p.estado} sx={{ bgcolor: alpha(eColor, 0.12), color: eColor, fontWeight: 700, border: `1px solid ${alpha(eColor, 0.3)}` }} />
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6, sm: 4 }}><FichaCampo label="Hora inicio" value={p.horaInicio} /></Grid>
                    <Grid size={{ xs: 6, sm: 4 }}><FichaCampo label="Duración" value={p.duracion > 0 ? `${p.duracion} min` : 'En curso'} /></Grid>
                    <Grid size={{ xs: 6, sm: 4 }}><FichaCampo label="OP afectada" value={p.opAfectada} /></Grid>
                    <Grid size={{ xs: 6, sm: 4 }}><FichaCampo label="Responsable" value={p.responsable} /></Grid>
                    <Grid size={{ xs: 6, sm: 4 }}><FichaCampo label="Costo estimado" value={`$${costo.toLocaleString('es-CO')}`} /></Grid>
                  </Grid>
                  <Box sx={{ bgcolor: SOFT_BG, borderRadius: '8px', p: 1.5, border: `1px solid ${BORDER}` }}>
                    <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', mb: 0.5 }}>Descripción</Typography>
                    <Typography sx={{ color: TEXT, fontSize: 13 }}>{p.descripcion}</Typography>
                  </Box>
                  {p.estado === 'ACTIVA' && (
                    <Button variant="contained" onClick={() => {
                      setParadas(prev => prev.map(x => x.id === p.id ? { ...x, estado: 'CERRADA' as const } : x))
                      setParadaDetail(null); notify(`Parada #${p.id} cerrada`, 'success')
                    }} sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                      Cerrar parada
                    </Button>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setParadaDetail(null)} sx={{ color: MUTED, textTransform: 'none' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Detalle de WIP ── */}
      <Dialog open={!!wipDetail} onClose={() => setWipDetail(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {wipDetail && (() => {
          const w = wipDetail
          const sem = wipSemaforo(w.tiempoHrs)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>{w.celda}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: MUTED }}>{w.producto} · {w.lote}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setWipDetail(null)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sem.color }} />
                    <Typography sx={{ color: sem.color, fontWeight: 700, fontSize: 13 }}>{sem.label} · {w.tiempoHrs.toFixed(1)} h en celda</Typography>
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}><KpiTile label="Cantidad" value={w.cantidad.toLocaleString('es-CO')} unit={w.unidad} color={MES_COLOR} /></Grid>
                    <Grid size={{ xs: 6 }}><KpiTile label="Tiempo en celda" value={w.tiempoHrs.toFixed(1)} unit="h" color={sem.color} /></Grid>
                  </Grid>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Lote" value={w.lote} /></Grid>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Entrada" value={w.fechaEntrada} /></Grid>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Responsable" value={w.responsable} /></Grid>
                    <Grid size={{ xs: 6 }}><FichaCampo label="Siguiente etapa" value={w.siguienteEtapa} /></Grid>
                  </Grid>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setWipDetail(null)} sx={{ color: MUTED, textTransform: 'none' }}>Cerrar</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ── Dialog: Registrar Parada (formulario de alto nivel) ── */}
      <Dialog open={paradaOpen} onClose={() => setParadaOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha('#EF4444', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReportIcon sx={{ fontSize: 18, color: '#EF4444' }} />
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Registrar parada</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setParadaOpen(false)} sx={{ color: MUTED }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Stack spacing={2} mt={0.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth size="small" label="Equipo *" value={paradaForm.equipo}
                  onChange={e => setParadaField('equipo', e.target.value)}
                  error={triedParada && !paradaForm.equipo}
                  helperText={triedParada && !paradaForm.equipo ? 'Seleccione el equipo' : ' '} sx={inputSx}>
                  <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                  {EQUIPOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="OP afectada" value={paradaForm.opAfectada}
                  InputProps={{ readOnly: true }} helperText="Se autocompleta con el equipo"
                  sx={{ ...inputSx, '& .MuiOutlinedInput-root': { ...inputSx['& .MuiOutlinedInput-root'], bgcolor: SOFT_BG, color: MUTED } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth size="small" label="Tipo de parada *" value={paradaForm.tipo}
                  onChange={e => setParadaField('tipo', e.target.value)}
                  error={triedParada && !paradaForm.tipo}
                  helperText={triedParada && !paradaForm.tipo ? 'Seleccione el tipo' : ' '} sx={inputSx}>
                  <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                  {TIPOS_PARADA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth size="small" label="Causa *" value={paradaForm.causa}
                  onChange={e => setParadaField('causa', e.target.value)}
                  error={triedParada && !paradaForm.causa}
                  helperText={triedParada && !paradaForm.causa ? 'Seleccione la causa' : ' '} sx={inputSx}>
                  <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                  {CAUSAS_PARADA.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Hora inicio" type="time" value={paradaForm.horaInicio}
                  onChange={e => setParadaField('horaInicio', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="Duración" type="number" value={paradaForm.duracion}
                  onChange={e => setParadaField('duracion', e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>min</Typography></InputAdornment> }}
                  helperText="0 si sigue activa" sx={inputSx} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select fullWidth size="small" label="Estado" value={paradaForm.estado}
                  onChange={e => setParadaField('estado', e.target.value)} sx={inputSx}>
                  <MenuItem value="ACTIVA">Activa</MenuItem>
                  <MenuItem value="CERRADA">Cerrada</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField select fullWidth size="small" label="Responsable" value={paradaForm.responsable}
                  onChange={e => setParadaField('responsable', e.target.value)} sx={inputSx}>
                  <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                  {OPERARIOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Descripción" multiline rows={2} value={paradaForm.descripcion}
                  onChange={e => setParadaField('descripcion', e.target.value)} sx={inputSx} />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setParadaOpen(false)} sx={{ color: MUTED, textTransform: 'none' }}>Cancelar</Button>
          <Tooltip title={!paradaForm.equipo || !paradaForm.tipo || !paradaForm.causa ? 'Complete equipo, tipo y causa' : ''}>
            <span>
              <Button variant="contained" startIcon={<AddIcon />} onClick={guardarParada}
                disabled={!paradaForm.equipo || !paradaForm.tipo || !paradaForm.causa}
                sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, '&.Mui-disabled': { bgcolor: alpha('#EF4444', 0.35), color: '#fff' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                Registrar parada
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  )
}
