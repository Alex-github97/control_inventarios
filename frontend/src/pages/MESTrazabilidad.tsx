import { useState, useMemo, type ReactNode } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Button,
  TextField,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Collapse,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  InputAdornment,
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import SearchIcon from '@mui/icons-material/Search'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ScienceIcon from '@mui/icons-material/Science'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'
const SURFACE   = '#FFFFFF'
const BORDER    = '#E5E7EB'
const TEXT      = '#1E293B'
const MUTED     = '#64748B'

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
    borderRadius: '8px',
    '&:hover fieldset': { borderColor: MES_COLOR },
    '&.Mui-focused fieldset': { borderColor: MES_COLOR },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: MES_COLOR },
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

type EstadoLote = 'LIBERADO' | 'EN_USO' | 'BLOQUEADO' | 'APROBADO' | 'CUARENTENA'
type ResultadoQC = 'CONFORME' | 'NO_CONFORME'

interface Material {
  id: string
  nombre: string
  lote: string
  proveedor: string
  cantidad: number
  unidad: string
  fechaRec: string
  certCalidad: string
  estado: EstadoLote
  tipo: 'MP' | 'EMP'
  color: string
}

interface Operacion {
  id: string
  secuencia: number
  nombre: string
  maquina: string
  operador: string
  inicio: string
  fin: string
  duracion: string
  resultado: string
  parametros: string
}

interface ControlCalidad {
  id: string
  parametro: string
  valor: string
  especificacion: string
  resultado: ResultadoQC
  responsable: string
  fecha: string
}

interface EventoTimeline {
  id: string
  fecha: string
  evento: string
  responsable: string
  detalle: string
  icono: 'RECEPCION' | 'PRODUCCION' | 'INSPECCION' | 'EMPAQUE' | 'LIBERACION' | 'DESPACHO' | 'REGISTRO'
}

interface Lote {
  codigo: string
  producto: string
  estado: EstadoLote
  cantidad: number
  unidad: string
  fechaFab: string
  fechaVenc: string
  op: string
  linea: string
  turno: string
  responsable: string
  cliente: string
  remision: string
  destino: string
  costoLote: number
  rendimiento: number
  materiales: Material[]
  operaciones: Operacion[]
  calidad: ControlCalidad[]
  timeline: EventoTimeline[]
}

interface OpAfectada {
  op: string
  producto: string
  linea: string
  estado: string
  riesgo: 'ALTO' | 'MEDIO' | 'BAJO'
  cantidad: number
  fechaProg: string
  responsable: string
  loteConsumido: string
  cliente: string
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

const LOTES_MOCK: Lote[] = [
  {
    codigo: 'PT-2024-LOT-001',
    producto: 'Aceite Motor 5W-30 1L',
    estado: 'LIBERADO',
    cantidad: 1140,
    unidad: 'unidades',
    fechaFab: '2026-06-16',
    fechaVenc: '2028-06-16',
    op: 'OP-2401',
    linea: 'Línea A',
    turno: 'Turno 1 (06:00-14:00)',
    responsable: 'Carlos Ruiz',
    cliente: 'Distribuciones del Caribe',
    remision: 'R-2026-2841',
    destino: 'Barranquilla — CD Norte',
    costoLote: 18420000,
    rendimiento: 95,
    materiales: [
      { id: 'M1-1', nombre: 'Base Aceite Mineral',   lote: 'LOT-MP-001',  proveedor: 'Petroquímica del Norte SA', cantidad: 480,  unidad: 'kg',  fechaRec: '2026-06-15', certCalidad: 'CERT-2026-0412', estado: 'EN_USO',   tipo: 'MP',  color: MES_COLOR },
      { id: 'M1-2', nombre: 'Paquete Aditivos A100',  lote: 'LOT-MP-002',  proveedor: 'Lubrizol Colombia',         cantidad: 120,  unidad: 'kg',  fechaRec: '2026-06-14', certCalidad: 'CERT-2026-0389', estado: 'EN_USO',   tipo: 'MP',  color: '#8B5CF6' },
      { id: 'M1-3', nombre: 'Envase PET 1L + Tapa',   lote: 'LOT-EMP-001', proveedor: 'Plásticos Modernos SAS',     cantidad: 1200, unidad: 'und', fechaRec: '2026-06-13', certCalidad: 'CERT-EMP-0021',  estado: 'APROBADO', tipo: 'EMP', color: '#F59E0B' },
      { id: 'M1-4', nombre: 'Etiqueta Autoadhesiva',  lote: 'LOT-ETQ-007', proveedor: 'Etiketas Andinas',           cantidad: 1200, unidad: 'und', fechaRec: '2026-06-12', certCalidad: 'CERT-ETQ-0110',  estado: 'APROBADO', tipo: 'EMP', color: '#10B981' },
    ],
    operaciones: [
      { id: 'O1-1', secuencia: 10, nombre: 'Mezcla de base y aditivos', maquina: 'Reactor RX-02', operador: 'Carlos Ruiz',   inicio: '2026-06-16 06:00', fin: '2026-06-16 10:30', duracion: '4.5 h', resultado: 'OK',          parametros: 'Temp. 65°C · Agitación 320 rpm · Vacío 0.8 bar' },
      { id: 'O1-2', secuencia: 20, nombre: 'Homogenización',            maquina: 'Molino MH-01',  operador: 'Andrés Peña',   inicio: '2026-06-16 10:45', fin: '2026-06-16 12:15', duracion: '1.5 h', resultado: 'OK',          parametros: 'Ciclos 3 · Presión 2.1 bar' },
      { id: 'O1-3', secuencia: 30, nombre: 'Envasado y sellado',        maquina: 'Envasadora EV-04', operador: 'Martha Torres', inicio: '2026-06-17 07:00', fin: '2026-06-17 13:20', duracion: '6.3 h', resultado: 'Con ajustes', parametros: 'Cadencia 190 und/h · 12 scrap por sello' },
    ],
    calidad: [
      { id: 'Q1-1', parametro: 'Viscosidad cinemática @100°C', valor: '9.9 cSt',    especificacion: '9.3 – 12.5 cSt',  resultado: 'CONFORME', responsable: 'Ana Torres',  fecha: '2026-06-16 14:00' },
      { id: 'Q1-2', parametro: 'Densidad @15°C',               valor: '0.871 g/cm³', especificacion: '0.860 – 0.880',   resultado: 'CONFORME', responsable: 'Ana Torres',  fecha: '2026-06-16 14:10' },
      { id: 'Q1-3', parametro: 'Índice de viscosidad',         valor: '162',         especificacion: '≥ 155',           resultado: 'CONFORME', responsable: 'Ingrid López', fecha: '2026-06-17 09:00' },
      { id: 'Q1-4', parametro: 'Punto de inflamación',         valor: '228 °C',      especificacion: '≥ 210 °C',        resultado: 'CONFORME', responsable: 'Ingrid López', fecha: '2026-06-17 09:20' },
    ],
    timeline: [
      { id: 'T1-1', fecha: '2026-06-15 08:30', evento: 'Recepción de materias primas', responsable: 'Almacén — Jorge Salinas',    icono: 'RECEPCION',  detalle: 'Base Aceite Mineral + Aditivos. Ingreso a cuarentena.' },
      { id: 'T1-2', fecha: '2026-06-16 06:00', evento: 'Inicio producción',            responsable: 'Producción — Carlos Ruiz',   icono: 'PRODUCCION', detalle: 'Línea A · OP-2401. Mezcla base 480 kg.' },
      { id: 'T1-3', fecha: '2026-06-16 14:00', evento: 'Inspección en proceso',        responsable: 'Calidad — Ana Torres',       icono: 'INSPECCION', detalle: 'Viscosidad 9.9 cSt · Densidad 0.871 g/cm³ · Conforme.' },
      { id: 'T1-4', fecha: '2026-06-17 07:00', evento: 'Empaque y etiquetado',         responsable: 'Producción — Martha Torres', icono: 'EMPAQUE',    detalle: '1,140 unidades empacadas. 12 scrap por defecto de sello.' },
      { id: 'T1-5', fecha: '2026-06-17 15:00', evento: 'Liberación por Calidad',       responsable: 'QC — Ingrid López',          icono: 'LIBERACION', detalle: 'Lote aprobado. Cod. liberación QC-2026-0844.' },
      { id: 'T1-6', fecha: '2026-06-18 09:00', evento: 'Despacho a cliente',           responsable: 'Logística — Pedro Castro',   icono: 'DESPACHO',   detalle: 'Remisión R-2026-2841 · Destino: Distribuciones del Caribe.' },
    ],
  },
  {
    codigo: 'PT-2024-LOT-014',
    producto: 'Aceite Hidráulico ISO 46',
    estado: 'CUARENTENA',
    cantidad: 860,
    unidad: 'unidades',
    fechaFab: '2026-06-28',
    fechaVenc: '2028-06-28',
    op: 'OP-2415',
    linea: 'Línea C',
    turno: 'Turno 2 (14:00-22:00)',
    responsable: 'Andrés Peña',
    cliente: 'Ingeniería Hidráulica del Valle',
    remision: '—',
    destino: 'Pendiente de liberación',
    costoLote: 12960000,
    rendimiento: 91,
    materiales: [
      { id: 'M2-1', nombre: 'Base Aceite Mineral',   lote: 'LOT-MP-001',  proveedor: 'Petroquímica del Norte SA', cantidad: 360, unidad: 'kg',  fechaRec: '2026-06-15', certCalidad: 'CERT-2026-0412', estado: 'EN_USO',   tipo: 'MP',  color: MES_COLOR },
      { id: 'M2-2', nombre: 'Aditivo Antidesgaste ZDDP', lote: 'LOT-MP-018', proveedor: 'Lubrizol Colombia',      cantidad: 65,  unidad: 'kg',  fechaRec: '2026-06-20', certCalidad: 'CERT-2026-0451', estado: 'EN_USO',   tipo: 'MP',  color: '#8B5CF6' },
      { id: 'M2-3', nombre: 'Envase PET 1L + Tapa',   lote: 'LOT-EMP-004', proveedor: 'Plásticos Modernos SAS',     cantidad: 900, unidad: 'und', fechaRec: '2026-06-22', certCalidad: 'CERT-EMP-0038',  estado: 'APROBADO', tipo: 'EMP', color: '#F59E0B' },
    ],
    operaciones: [
      { id: 'O2-1', secuencia: 10, nombre: 'Mezcla de base y aditivos', maquina: 'Reactor RX-01', operador: 'Andrés Peña', inicio: '2026-06-28 14:00', fin: '2026-06-28 18:00', duracion: '4.0 h', resultado: 'OK',          parametros: 'Temp. 60°C · Agitación 300 rpm' },
      { id: 'O2-2', secuencia: 20, nombre: 'Filtración fina',           maquina: 'Filtro FL-03', operador: 'Andrés Peña', inicio: '2026-06-28 18:15', fin: '2026-06-28 19:30', duracion: '1.3 h', resultado: 'OK',          parametros: 'Malla 10 µm · Caudal 40 L/min' },
      { id: 'O2-3', secuencia: 30, nombre: 'Envasado',                  maquina: 'Envasadora EV-02', operador: 'Martha Torres', inicio: '2026-06-29 07:00', fin: '2026-06-29 11:00', duracion: '4.0 h', resultado: 'OK',      parametros: 'Cadencia 215 und/h' },
    ],
    calidad: [
      { id: 'Q2-1', parametro: 'Viscosidad cinemática @40°C', valor: '52 cSt',     especificacion: '41.4 – 50.6 cSt', resultado: 'NO_CONFORME', responsable: 'Ana Torres',  fecha: '2026-06-29 12:00' },
      { id: 'Q2-2', parametro: 'Contenido de agua',           valor: '180 ppm',    especificacion: '≤ 200 ppm',       resultado: 'CONFORME',    responsable: 'Ana Torres',  fecha: '2026-06-29 12:10' },
      { id: 'Q2-3', parametro: 'Índice de acidez (TAN)',      valor: '0.08 mgKOH/g', especificacion: '≤ 0.10',        resultado: 'CONFORME',    responsable: 'Ingrid López', fecha: '2026-06-29 12:30' },
    ],
    timeline: [
      { id: 'T2-1', fecha: '2026-06-22 09:00', evento: 'Recepción de envases',   responsable: 'Almacén — Jorge Salinas',  icono: 'RECEPCION',  detalle: 'Lote LOT-EMP-004. Aprobado por inspección visual.' },
      { id: 'T2-2', fecha: '2026-06-28 14:00', evento: 'Inicio producción',      responsable: 'Producción — Andrés Peña', icono: 'PRODUCCION', detalle: 'Línea C · OP-2415.' },
      { id: 'T2-3', fecha: '2026-06-29 12:00', evento: 'Inspección en proceso',  responsable: 'Calidad — Ana Torres',     icono: 'INSPECCION', detalle: 'Viscosidad @40°C fuera de rango (52 cSt). Retenido en cuarentena.' },
    ],
  },
  {
    codigo: 'PT-2024-LOT-022',
    producto: 'Grasa Multiuso EP2',
    estado: 'BLOQUEADO',
    cantidad: 540,
    unidad: 'kg',
    fechaFab: '2026-07-01',
    fechaVenc: '2028-01-01',
    op: 'OP-2422',
    linea: 'Línea B',
    turno: 'Turno 3 (22:00-06:00)',
    responsable: 'Martha Torres',
    cliente: 'Minería Andina SAS',
    remision: '—',
    destino: 'Bloqueado — investigación de calidad',
    costoLote: 8100000,
    rendimiento: 82,
    materiales: [
      { id: 'M3-1', nombre: 'Aceite Base Grupo II',  lote: 'LOT-MP-025', proveedor: 'Petroquímica del Norte SA', cantidad: 300, unidad: 'kg', fechaRec: '2026-06-26', certCalidad: 'CERT-2026-0470', estado: 'BLOQUEADO', tipo: 'MP', color: MES_COLOR },
      { id: 'M3-2', nombre: 'Espesante Litio 12-OH', lote: 'LOT-MP-031', proveedor: 'Química Industrial Ltda',   cantidad: 90,  unidad: 'kg', fechaRec: '2026-06-27', certCalidad: 'CERT-2026-0478', estado: 'EN_USO',    tipo: 'MP', color: '#8B5CF6' },
    ],
    operaciones: [
      { id: 'O3-1', secuencia: 10, nombre: 'Saponificación', maquina: 'Reactor RX-03', operador: 'Martha Torres', inicio: '2026-07-01 22:00', fin: '2026-07-02 03:00', duracion: '5.0 h', resultado: 'Con ajustes', parametros: 'Temp. 200°C · Adición base controlada' },
      { id: 'O3-2', secuencia: 20, nombre: 'Molienda coloidal', maquina: 'Molino MH-02', operador: 'Andrés Peña', inicio: '2026-07-02 03:15', fin: '2026-07-02 05:00', duracion: '1.8 h', resultado: 'OK',          parametros: 'Gap 25 µm · 2 pasadas' },
    ],
    calidad: [
      { id: 'Q3-1', parametro: 'Penetración trabajada',   valor: '310 dmm', especificacion: '265 – 295 dmm', resultado: 'NO_CONFORME', responsable: 'Ana Torres', fecha: '2026-07-02 06:30' },
      { id: 'Q3-2', parametro: 'Punto de goteo',          valor: '182 °C',  especificacion: '≥ 190 °C',      resultado: 'NO_CONFORME', responsable: 'Ana Torres', fecha: '2026-07-02 06:40' },
    ],
    timeline: [
      { id: 'T3-1', fecha: '2026-07-01 22:00', evento: 'Inicio producción',     responsable: 'Producción — Martha Torres', icono: 'PRODUCCION', detalle: 'Línea B · OP-2422 (turno noche).' },
      { id: 'T3-2', fecha: '2026-07-02 06:30', evento: 'Inspección en proceso', responsable: 'Calidad — Ana Torres',       icono: 'INSPECCION', detalle: 'Consistencia y punto de goteo fuera de especificación.' },
      { id: 'T3-3', fecha: '2026-07-02 08:00', evento: 'Bloqueo de lote',       responsable: 'QC — Ingrid López',          icono: 'LIBERACION', detalle: 'Lote bloqueado. Se abre investigación NC-2026-0033.' },
    ],
  },
]

const OPS_AFECTADAS: OpAfectada[] = [
  { op: 'OP-2401', producto: 'Aceite Motor 5W-30 1L',   linea: 'Línea A', estado: 'EN_EJECUCION', riesgo: 'ALTO',  cantidad: 1140, fechaProg: '2026-06-16', responsable: 'Carlos Ruiz',   loteConsumido: 'LOT-MP-001', cliente: 'Distribuciones del Caribe' },
  { op: 'OP-2408', producto: 'Aceite Compresor VDL 100', linea: 'Línea D', estado: 'PROGRAMADA',   riesgo: 'ALTO',  cantidad: 720,  fechaProg: '2026-07-09', responsable: 'Andrés Peña',   loteConsumido: 'LOT-MP-001', cliente: 'Aire Comprimido SAS' },
  { op: 'OP-2415', producto: 'Aceite Hidráulico ISO 46', linea: 'Línea C', estado: 'PROGRAMADA',   riesgo: 'MEDIO', cantidad: 860,  fechaProg: '2026-07-11', responsable: 'Andrés Peña',   loteConsumido: 'LOT-MP-001', cliente: 'Ingeniería Hidráulica del Valle' },
]

// Catálogos para el formulario de alto nivel
const PRODUCTOS_CATALOGO = [
  { nombre: 'Aceite Motor 5W-30 1L',    unidad: 'unidades', lineaSugerida: 'Línea A' },
  { nombre: 'Aceite Hidráulico ISO 46', unidad: 'unidades', lineaSugerida: 'Línea C' },
  { nombre: 'Aceite Compresor VDL 100', unidad: 'unidades', lineaSugerida: 'Línea D' },
  { nombre: 'Grasa Multiuso EP2',       unidad: 'kg',       lineaSugerida: 'Línea B' },
]
const LINEAS = ['Línea A', 'Línea B', 'Línea C', 'Línea D']
const TURNOS = ['Turno 1 (06:00-14:00)', 'Turno 2 (14:00-22:00)', 'Turno 3 (22:00-06:00)']
const RESPONSABLES = ['Carlos Ruiz', 'Andrés Peña', 'Martha Torres', 'Ana Torres', 'Ingrid López', 'Jorge Salinas']
const ESTADOS_LOTE: EstadoLote[] = ['LIBERADO', 'EN_USO', 'CUARENTENA', 'APROBADO', 'BLOQUEADO']

// ─── Nodo árbol ────────────────────────────────────────────────────────────────

interface NodoArbol {
  id: string
  nombre: string
  lote: string
  tipo: 'PT' | 'MP' | 'EMP'
  estado: EstadoLote
  color: string
  cantidad?: string
  kind: 'lote' | 'material'
  refId?: string
  hijos?: NodoArbol[]
}

function arbolDe(lote: Lote): NodoArbol {
  return {
    id: lote.codigo,
    nombre: lote.producto,
    lote: lote.codigo,
    tipo: 'PT',
    estado: lote.estado,
    color: '#10B981',
    cantidad: `${fmt(lote.cantidad)} ${lote.unidad}`,
    kind: 'lote',
    hijos: lote.materiales.map(m => ({
      id: m.id,
      nombre: m.nombre,
      lote: m.lote,
      tipo: m.tipo,
      estado: m.estado,
      color: m.color,
      cantidad: `${fmt(m.cantidad)} ${m.unidad}`,
      kind: 'material' as const,
      refId: m.id,
    })),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-CO')
}
const formatCOP = (v: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

function estadoColor(e: string) {
  switch (e) {
    case 'LIBERADO':  return '#10B981'
    case 'EN_USO':    return MES_COLOR
    case 'BLOQUEADO': return '#EF4444'
    case 'APROBADO':  return '#8B5CF6'
    case 'CUARENTENA': return '#F59E0B'
    default: return MUTED
  }
}

function iconoTimeline(tipo: EventoTimeline['icono']) {
  switch (tipo) {
    case 'RECEPCION':  return { bg: MES_COLOR, label: 'R' }
    case 'PRODUCCION': return { bg: '#8B5CF6', label: 'P' }
    case 'INSPECCION': return { bg: '#F59E0B', label: 'I' }
    case 'EMPAQUE':    return { bg: '#10B981', label: 'E' }
    case 'LIBERACION': return { bg: '#10B981', label: 'L' }
    case 'DESPACHO':   return { bg: '#6366F1', label: 'D' }
    case 'REGISTRO':   return { bg: MES_DARK,  label: '+' }
  }
}

function riesgoColor(r: string) {
  if (r === 'ALTO')  return '#EF4444'
  if (r === 'MEDIO') return '#F59E0B'
  return '#10B981'
}

// Fila etiqueta/valor para diálogos
function Fila({ label, value, color, mono }: { label: string; value: ReactNode; color?: string; mono?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.9, borderBottom: `1px solid ${alpha(BORDER, 0.7)}` }}>
      <Typography sx={{ color: MUTED, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ color: color || TEXT, fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}

function EstadoChip({ estado }: { estado: string }) {
  const c = estadoColor(estado)
  return (
    <Chip label={estado.replace(/_/g, ' ')} size="small" sx={{
      bgcolor: alpha(c, 0.15), color: c, fontSize: 10, fontWeight: 700,
      border: `1px solid ${alpha(c, 0.3)}`,
    }} />
  )
}

// ─── Nodo genealogía (clicable) ─────────────────────────────────────────────────

function NodoGenealogico({ nodo, nivel, onSelect }: { nodo: NodoArbol; nivel: number; onSelect: (n: NodoArbol) => void }) {
  const [expandido, setExpandido] = useState(true)
  const tieneHijos = !!nodo.hijos && nodo.hijos.length > 0

  return (
    <Box sx={{ ml: nivel * 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {nivel > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1, pt: 1.5 }}>
            <Box sx={{ width: 1, height: 12, bgcolor: BORDER }} />
            <Box sx={{ width: 16, height: 1, bgcolor: BORDER }} />
          </Box>
        )}

        <Tooltip title="Clic para ver el detalle" placement="right" arrow>
          <Box
            onClick={() => onSelect(nodo)}
            sx={{
              border: `1.5px solid ${alpha(nodo.color, 0.6)}`,
              borderRadius: '10px',
              p: 1.5,
              mb: 1,
              bgcolor: alpha(nodo.color, 0.08),
              cursor: 'pointer',
              transition: 'all 0.15s',
              minWidth: 240,
              maxWidth: 340,
              '&:hover': { bgcolor: alpha(nodo.color, 0.16), borderColor: nodo.color, boxShadow: `0 4px 14px ${alpha(nodo.color, 0.25)}` },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600, mb: 0.25 }} noWrap>
                  {nodo.nombre}
                </Typography>
                <Typography sx={{ color: nodo.color, fontSize: 11, fontFamily: 'monospace', opacity: 0.9 }}>
                  {nodo.lote}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1, flexShrink: 0 }}>
                <EstadoChip estado={nodo.estado} />
                {tieneHijos && (
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setExpandido(v => !v) }}
                    sx={{ color: MUTED, p: 0.25 }}
                  >
                    {expandido ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                )}
              </Stack>
            </Stack>
            {nodo.cantidad && (
              <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.5 }}>
                Cantidad: {nodo.cantidad}
              </Typography>
            )}
          </Box>
        </Tooltip>
      </Box>

      {tieneHijos && (
        <Collapse in={expandido}>
          <Box sx={{ ml: nivel > 0 ? 2 : 0 }}>
            {nodo.hijos!.map(hijo => (
              <NodoGenealogico key={hijo.id} nodo={hijo} nivel={nivel + 1} onSelect={onSelect} />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

// ─── Detalle de item (Dialog genérico por dominio) ──────────────────────────────

type ItemDetalle =
  | { tipo: 'material';  data: Material }
  | { tipo: 'operacion'; data: Operacion }
  | { tipo: 'calidad';   data: ControlCalidad }
  | { tipo: 'evento';    data: EventoTimeline }
  | { tipo: 'op';        data: OpAfectada }

function ItemDialog({ item, loteActivo, onClose, notify }: {
  item: ItemDetalle | null
  loteActivo: Lote
  onClose: () => void
  notify: (m: string, s?: 'success' | 'info' | 'warning') => void
}) {
  if (!item) return null

  let icon = <InfoOutlinedIcon />
  let color = MES_COLOR
  let titulo = ''
  let subtitulo = ''
  let body: ReactNode = null

  if (item.tipo === 'material') {
    const m = item.data
    color = m.color
    icon = <Inventory2Icon sx={{ color }} />
    titulo = m.nombre
    subtitulo = `${m.tipo === 'MP' ? 'Materia prima' : 'Material de empaque'} · ${m.lote}`
    body = (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <EstadoChip estado={m.estado} />
          <Chip label={m.tipo === 'MP' ? 'Materia prima' : 'Empaque'} size="small" sx={{ bgcolor: alpha(m.color, 0.12), color: m.color, fontWeight: 600, border: `1px solid ${alpha(m.color, 0.3)}` }} />
        </Stack>
        <Box>
          <Fila label="Lote de materia prima" value={m.lote} mono color={m.color} />
          <Fila label="Proveedor" value={m.proveedor} />
          <Fila label="Cantidad consumida" value={`${fmt(m.cantidad)} ${m.unidad}`} />
          <Fila label="Fecha de recepción" value={m.fechaRec} />
          <Fila label="Certificado de calidad" value={m.certCalidad} mono color={MES_COLOR} />
          <Fila label="Consumido en lote" value={loteActivo.codigo} mono color="#10B981" />
        </Box>
        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}` }}>
          <Typography sx={{ color: TEXT, fontSize: 12, lineHeight: 1.5 }}>
            Este insumo hace parte de la genealogía del producto terminado {loteActivo.producto}. La trazabilidad permite ubicar todos los lotes de PT que consumieron {m.lote}.
          </Typography>
        </Box>
      </Stack>
    )
  } else if (item.tipo === 'operacion') {
    const o = item.data
    color = '#8B5CF6'
    icon = <PrecisionManufacturingIcon sx={{ color }} />
    titulo = o.nombre
    subtitulo = `Secuencia ${o.secuencia} · ${o.maquina}`
    const okColor = o.resultado === 'OK' ? '#10B981' : '#F59E0B'
    body = (
      <Stack spacing={2}>
        <Chip label={o.resultado} size="small" sx={{ bgcolor: alpha(okColor, 0.15), color: okColor, fontWeight: 700, border: `1px solid ${alpha(okColor, 0.3)}`, alignSelf: 'flex-start' }} />
        <Box>
          <Fila label="Secuencia" value={`Op. ${o.secuencia}`} />
          <Fila label="Máquina / recurso" value={o.maquina} mono color="#8B5CF6" />
          <Fila label="Operador" value={o.operador} />
          <Fila label="Inicio" value={o.inicio} />
          <Fila label="Fin" value={o.fin} />
          <Fila label="Duración" value={o.duracion} color={MES_COLOR} />
        </Box>
        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha('#8B5CF6', 0.05), border: `1px solid ${alpha('#8B5CF6', 0.2)}` }}>
          <Typography sx={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>Parámetros de proceso</Typography>
          <Typography sx={{ color: TEXT, fontSize: 13 }}>{o.parametros}</Typography>
        </Box>
      </Stack>
    )
  } else if (item.tipo === 'calidad') {
    const q = item.data
    color = q.resultado === 'CONFORME' ? '#10B981' : '#EF4444'
    icon = <ScienceIcon sx={{ color }} />
    titulo = q.parametro
    subtitulo = `Control de calidad · ${q.fecha}`
    body = (
      <Stack spacing={2}>
        <Chip
          icon={q.resultado === 'CONFORME' ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : <WarningAmberIcon sx={{ fontSize: 15 }} />}
          label={q.resultado.replace('_', ' ')}
          size="small"
          sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, border: `1px solid ${alpha(color, 0.3)}`, alignSelf: 'flex-start', '& .MuiChip-icon': { color } }}
        />
        <Box>
          <Fila label="Parámetro" value={q.parametro} />
          <Fila label="Valor medido" value={q.valor} color={color} />
          <Fila label="Especificación" value={q.especificacion} />
          <Fila label="Responsable" value={q.responsable} />
          <Fila label="Fecha / hora" value={q.fecha} />
        </Box>
        {q.resultado === 'NO_CONFORME' && (
          <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha('#EF4444', 0.08), border: `1px solid ${alpha('#EF4444', 0.3)}` }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningAmberIcon sx={{ color: '#EF4444', fontSize: 18 }} />
              <Typography sx={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
                Resultado fuera de especificación — el lote debe permanecer retenido hasta su disposición por Calidad.
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>
    )
  } else if (item.tipo === 'evento') {
    const ev = item.data
    const ico = iconoTimeline(ev.icono)
    color = ico.bg
    icon = <InfoOutlinedIcon sx={{ color }} />
    titulo = ev.evento
    subtitulo = ev.fecha
    body = (
      <Stack spacing={2}>
        <Box>
          <Fila label="Evento" value={ev.evento} />
          <Fila label="Fecha / hora" value={ev.fecha} />
          <Fila label="Responsable" value={ev.responsable} />
        </Box>
        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.25)}` }}>
          <Typography sx={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>Detalle</Typography>
          <Typography sx={{ color: TEXT, fontSize: 13, lineHeight: 1.5 }}>{ev.detalle}</Typography>
        </Box>
      </Stack>
    )
  } else {
    const op = item.data
    color = riesgoColor(op.riesgo)
    icon = <PrecisionManufacturingIcon sx={{ color: MES_COLOR }} />
    titulo = op.op
    subtitulo = op.producto
    body = (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 6px ${alpha(color, 0.6)}` }} />
          <Typography sx={{ color, fontWeight: 700, fontSize: 13 }}>Riesgo {op.riesgo}</Typography>
        </Stack>
        <Box>
          <Fila label="Orden de producción" value={op.op} mono color={MES_COLOR} />
          <Fila label="Producto" value={op.producto} />
          <Fila label="Línea" value={op.linea} />
          <Fila label="Estado actual" value={op.estado.replace(/_/g, ' ')} />
          <Fila label="Cantidad planeada" value={fmt(op.cantidad)} />
          <Fila label="Fecha programada" value={op.fechaProg} />
          <Fila label="Responsable" value={op.responsable} />
          <Fila label="Lote consumido" value={op.loteConsumido} mono color="#8B5CF6" />
          <Fila label="Cliente" value={op.cliente} />
        </Box>
      </Stack>
    )
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper"
      PaperProps={{ sx: { bgcolor: SURFACE, border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TEXT }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{titulo}</Typography>
            <Typography sx={{ fontSize: 12, color: MUTED }}>{subtitulo}</Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: 'grey.500' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: BORDER }}>
        {body}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => notify('Trazabilidad del item exportada a PDF', 'info')}
          startIcon={<FileDownloadIcon />}
          sx={{ color: MES_DARK, fontWeight: 600, textTransform: 'none' }}>
          Exportar
        </Button>
        <Button onClick={onClose} variant="contained"
          sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Diálogo de detalle 360° del lote ──────────────────────────────────────────

function LoteDialog({ lote, onClose, onItem, notify }: {
  lote: Lote | null
  onClose: () => void
  onItem: (i: ItemDetalle) => void
  notify: (m: string, s?: 'success' | 'info' | 'warning') => void
}) {
  if (!lote) return null
  const noConformes = lote.calidad.filter(q => q.resultado === 'NO_CONFORME').length
  const kpis = [
    { label: 'Cantidad', value: `${fmt(lote.cantidad)}`, sub: lote.unidad, color: MES_COLOR },
    { label: 'Rendimiento', value: `${lote.rendimiento}%`, sub: 'del plan', color: lote.rendimiento >= 90 ? '#10B981' : '#F59E0B' },
    { label: 'Materiales', value: String(lote.materiales.length), sub: 'consumidos', color: '#8B5CF6' },
    { label: 'Operaciones', value: String(lote.operaciones.length), sub: 'ejecutadas', color: '#6366F1' },
    { label: 'Ensayos QC', value: String(lote.calidad.length), sub: `${noConformes} no conf.`, color: noConformes ? '#EF4444' : '#10B981' },
    { label: 'Costo lote', value: formatCOP(lote.costoLote), sub: 'COP', color: MES_DARK },
  ]
  const c = estadoColor(lote.estado)

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      PaperProps={{ sx: { bgcolor: SURFACE, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TEXT }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountTreeIcon sx={{ color: MES_COLOR }} />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{lote.codigo}</Typography>
              <EstadoChip estado={lote.estado} />
            </Stack>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{lote.producto}</Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: 'grey.500' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: BORDER }}>
        <Stack spacing={2.5}>
          {/* KPIs */}
          <Grid container spacing={1.5}>
            {kpis.map(k => (
              <Grid key={k.label} size={{ xs: 6, sm: 4 }}>
                <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px', p: 1.5, textAlign: 'center' }}>
                  <Typography sx={{ color: k.color, fontSize: 18, fontWeight: 900, lineHeight: 1.1 }} noWrap>{k.value}</Typography>
                  <Typography sx={{ color: TEXT, fontSize: 11, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 10 }}>{k.sub}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Ficha del lote */}
          <Box>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 13, mb: 1 }}>Ficha del lote</Typography>
            <Grid container spacing={0} sx={{ '& > *': { px: 0 } }}>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ pr: { sm: 2 } }}>
                <Fila label="Orden de producción" value={lote.op} mono color={MES_COLOR} />
                <Fila label="Línea" value={lote.linea} />
                <Fila label="Turno" value={lote.turno} />
                <Fila label="Responsable" value={lote.responsable} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ pl: { sm: 2 } }}>
                <Fila label="Fecha fabricación" value={lote.fechaFab} />
                <Fila label="Fecha vencimiento" value={lote.fechaVenc} />
                <Fila label="Cliente" value={lote.cliente} />
                <Fila label="Remisión / destino" value={`${lote.remision} · ${lote.destino}`} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography sx={{ color: MUTED, fontSize: 11 }}>Rendimiento de fabricación</Typography>
                <Typography sx={{ color: lote.rendimiento >= 90 ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: 700 }}>{lote.rendimiento}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={lote.rendimiento} sx={{
                height: 8, borderRadius: 5, bgcolor: '#F1F5F9',
                '& .MuiLinearProgress-bar': { bgcolor: lote.rendimiento >= 90 ? '#10B981' : '#F59E0B', borderRadius: 5 },
              }} />
            </Box>
          </Box>

          {/* Materiales consumidos */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Inventory2Icon sx={{ fontSize: 16, color: MES_COLOR }} />
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>Materiales consumidos ({lote.materiales.length})</Typography>
            </Stack>
            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(MES_COLOR, 0.06) }}>
                    {['Material', 'Lote', 'Cantidad', 'Estado'].map(h => (
                      <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lote.materiales.map(m => (
                    <TableRow key={m.id} onClick={() => onItem({ tipo: 'material', data: m })}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) } }}>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600, fontSize: 12 }}>{m.nombre}</TableCell>
                      <TableCell sx={{ color: m.color, borderColor: BORDER, fontFamily: 'monospace', fontSize: 12 }}>{m.lote}</TableCell>
                      <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12 }}>{fmt(m.cantidad)} {m.unidad}</TableCell>
                      <TableCell sx={{ borderColor: BORDER }}><EstadoChip estado={m.estado} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Operaciones */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <PrecisionManufacturingIcon sx={{ fontSize: 16, color: '#8B5CF6' }} />
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>Operaciones ejecutadas ({lote.operaciones.length})</Typography>
            </Stack>
            <Stack spacing={1}>
              {lote.operaciones.map(o => {
                const okColor = o.resultado === 'OK' ? '#10B981' : '#F59E0B'
                return (
                  <Box key={o.id} onClick={() => onItem({ tipo: 'operacion', data: o })}
                    sx={{ p: 1.25, borderRadius: '8px', bgcolor: '#F8FAFC', border: `1px solid ${BORDER}`, cursor: 'pointer', '&:hover': { borderColor: '#8B5CF6', bgcolor: alpha('#8B5CF6', 0.05) } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>Op. {o.secuencia} · {o.nombre}</Typography>
                        <Typography sx={{ color: MUTED, fontSize: 11 }}>{o.maquina} · {o.operador} · {o.duracion}</Typography>
                      </Box>
                      <Chip label={o.resultado} size="small" sx={{ bgcolor: alpha(okColor, 0.15), color: okColor, fontWeight: 700, fontSize: 9 }} />
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </Box>

          {/* Calidad */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <ScienceIcon sx={{ fontSize: 16, color: '#10B981' }} />
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>Resultados de calidad ({lote.calidad.length})</Typography>
            </Stack>
            <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#10B981', 0.06) }}>
                    {['Parámetro', 'Valor', 'Especificación', 'Resultado'].map(h => (
                      <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lote.calidad.map(q => {
                    const qc = q.resultado === 'CONFORME' ? '#10B981' : '#EF4444'
                    return (
                      <TableRow key={q.id} onClick={() => onItem({ tipo: 'calidad', data: q })}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha('#10B981', 0.05) } }}>
                        <TableCell sx={{ color: TEXT, borderColor: BORDER, fontSize: 12, fontWeight: 600 }}>{q.parametro}</TableCell>
                        <TableCell sx={{ color: qc, borderColor: BORDER, fontSize: 12, fontWeight: 700 }}>{q.valor}</TableCell>
                        <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{q.especificacion}</TableCell>
                        <TableCell sx={{ borderColor: BORDER }}>
                          <Chip label={q.resultado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(qc, 0.15), color: qc, fontWeight: 700, fontSize: 9 }} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Destino */}
          <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}` }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocalShippingIcon sx={{ color: MES_COLOR, fontSize: 18 }} />
              <Typography sx={{ color: TEXT, fontSize: 12 }}>
                <b>Destino:</b> {lote.destino}{lote.remision !== '—' ? ` · Remisión ${lote.remision}` : ''} · Cliente {lote.cliente}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Chip label={<span style={{ color: c }}>Estado: {lote.estado.replace(/_/g, ' ')}</span>} size="small"
          sx={{ bgcolor: alpha(c, 0.12), border: `1px solid ${alpha(c, 0.3)}`, fontWeight: 700 }} />
        <Stack direction="row" spacing={1.5}>
          <Button onClick={() => notify(`Genealogía de ${lote.codigo} exportada a PDF`, 'info')}
            startIcon={<FileDownloadIcon />}
            sx={{ color: MES_DARK, fontWeight: 600, textTransform: 'none' }}>
            Exportar genealogía
          </Button>
          <Button onClick={onClose} variant="contained"
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}>
            Cerrar
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}

// ─── Formulario de alto nivel: registrar lote ──────────────────────────────────

interface NuevoLoteForm {
  producto: string
  unidad: string
  cantidad: string
  fechaFab: string
  fechaVenc: string
  op: string
  linea: string
  turno: string
  responsable: string
  estado: EstadoLote
  cliente: string
  costoLote: string
}

const EMPTY_LOTE_FORM: NuevoLoteForm = {
  producto: '', unidad: '', cantidad: '', fechaFab: '', fechaVenc: '', op: '',
  linea: '', turno: TURNOS[0], responsable: '', estado: 'EN_USO', cliente: '', costoLote: '',
}

function RegistrarLoteDialog({ open, onClose, onCreate, notify }: {
  open: boolean
  onClose: () => void
  onCreate: (l: Lote) => void
  notify: (m: string, s?: 'success' | 'info' | 'warning') => void
}) {
  const [form, setForm] = useState<NuevoLoteForm>(EMPTY_LOTE_FORM)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const setField = (f: keyof NuevoLoteForm, v: string) => setForm(prev => ({ ...prev, [f]: v }))

  const setProducto = (nombre: string) => {
    const cat = PRODUCTOS_CATALOGO.find(p => p.nombre === nombre)
    setForm(prev => ({
      ...prev,
      producto: nombre,
      unidad: cat ? cat.unidad : prev.unidad,
      linea: prev.linea || (cat ? cat.lineaSugerida : ''),
    }))
  }

  const cantidadNum = parseFloat(form.cantidad)
  const errProducto = triedSubmit && !form.producto
  const errCantidad = triedSubmit && (!form.cantidad || isNaN(cantidadNum) || cantidadNum <= 0)
  const errFecha = triedSubmit && !form.fechaFab
  const errLinea = triedSubmit && !form.linea
  const errResp = triedSubmit && !form.responsable
  const valido = !!form.producto && !!form.cantidad && !isNaN(cantidadNum) && cantidadNum > 0 && !!form.fechaFab && !!form.linea && !!form.responsable

  const handleClose = () => { setForm(EMPTY_LOTE_FORM); setTriedSubmit(false); onClose() }

  const handleCreate = () => {
    if (!valido) {
      setTriedSubmit(true)
      notify('Complete los campos obligatorios del lote', 'warning')
      return
    }
    const n = Math.floor(Math.random() * 900) + 100
    const codigo = `PT-2024-LOT-${String(n).padStart(3, '0')}`
    const nuevo: Lote = {
      codigo,
      producto: form.producto,
      estado: form.estado,
      cantidad: cantidadNum,
      unidad: form.unidad || 'unidades',
      fechaFab: form.fechaFab,
      fechaVenc: form.fechaVenc || '—',
      op: form.op || `OP-${n}`,
      linea: form.linea,
      turno: form.turno,
      responsable: form.responsable,
      cliente: form.cliente || 'Por asignar',
      remision: '—',
      destino: form.estado === 'LIBERADO' ? 'Disponible para despacho' : 'Pendiente de liberación',
      costoLote: parseFloat(form.costoLote.replace(/[^0-9.]/g, '')) || 0,
      rendimiento: 100,
      materiales: [],
      operaciones: [],
      calidad: [],
      timeline: [
        { id: `${codigo}-T0`, fecha: `${form.fechaFab} 00:00`, evento: 'Registro de lote', responsable: `Producción — ${form.responsable}`, icono: 'REGISTRO', detalle: `Lote ${codigo} registrado en el sistema MES para ${form.linea}.` },
      ],
    }
    onCreate(nuevo)
    setForm(EMPTY_LOTE_FORM)
    setTriedSubmit(false)
    onClose()
    notify(`Lote ${codigo} registrado correctamente`, 'success')
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: SURFACE, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TEXT }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AddIcon sx={{ color: MES_COLOR }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: TEXT }}>Registrar lote de producción</Typography>
            <Typography sx={{ fontSize: 12, color: MUTED }}>Complete los datos y el sistema abrirá su genealogía</Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'grey.500' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: BORDER }}>
        <Stack spacing={2} mt={0.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select fullWidth size="small" label="Producto *" value={form.producto}
              onChange={e => setProducto(e.target.value)} sx={inputSx}
              error={errProducto} helperText={errProducto ? 'Seleccione el producto' : 'Autocompleta la unidad y sugiere la línea'}>
              {PRODUCTOS_CATALOGO.map(p => <MenuItem key={p.nombre} value={p.nombre}>{p.nombre}</MenuItem>)}
            </TextField>
            <TextField fullWidth size="small" label="Unidad" value={form.unidad}
              InputProps={{ readOnly: true }} sx={inputSx} helperText="Derivada del producto" />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField fullWidth size="small" label="Cantidad producida *" type="number" value={form.cantidad}
              onChange={e => setField('cantidad', e.target.value)} sx={inputSx}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color={MUTED}>{form.unidad || 'und'}</Typography></InputAdornment> }}
              error={errCantidad} helperText={errCantidad ? 'Ingrese una cantidad mayor que 0' : ' '} />
            <TextField fullWidth size="small" label="Costo del lote" type="number" value={form.costoLote}
              onChange={e => setField('costoLote', e.target.value)} sx={inputSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={13} color={MUTED}>$</Typography></InputAdornment> }}
              helperText=" " />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField fullWidth size="small" label="Fecha fabricación *" type="date" value={form.fechaFab}
              onChange={e => setField('fechaFab', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx}
              error={errFecha} helperText={errFecha ? 'Obligatoria' : ' '} />
            <TextField fullWidth size="small" label="Fecha vencimiento" type="date" value={form.fechaVenc}
              onChange={e => setField('fechaVenc', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx}
              helperText=" " />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select fullWidth size="small" label="Línea *" value={form.linea}
              onChange={e => setField('linea', e.target.value)} sx={inputSx}
              error={errLinea} helperText={errLinea ? 'Seleccione la línea' : ' '}>
              {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Turno" value={form.turno}
              onChange={e => setField('turno', e.target.value)} sx={inputSx} helperText=" ">
              {TURNOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select fullWidth size="small" label="Responsable *" value={form.responsable}
              onChange={e => setField('responsable', e.target.value)} sx={inputSx}
              error={errResp} helperText={errResp ? 'Seleccione el responsable' : ' '}>
              {RESPONSABLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Estado inicial" value={form.estado}
              onChange={e => setField('estado', e.target.value)} sx={inputSx} helperText=" ">
              {ESTADOS_LOTE.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
            </TextField>
          </Stack>

          <TextField fullWidth size="small" label="Cliente / destino" value={form.cliente}
            onChange={e => setField('cliente', e.target.value)} sx={inputSx}
            placeholder="Ej. Distribuciones del Caribe" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ color: MUTED, fontWeight: 600, textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!valido}
          sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 700, px: 3 }}>
          Registrar lote
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MESTrazabilidad() {
  const [tab, setTab] = useState(0)
  const [lotes, setLotes] = useState<Lote[]>(LOTES_MOCK)
  const [codigoActivo, setCodigoActivo] = useState<string>(LOTES_MOCK[0].codigo)

  // Búsquedas por tab (conectadas a estado)
  const [busquedaArbol, setBusquedaArbol] = useState('')
  const [busquedaLote, setBusquedaLote] = useState('')
  const [loteInverso, setLoteInverso] = useState(LOTES_MOCK[0].codigo)
  const [bloquear, setBloquear] = useState(false)

  // Diálogos
  const [loteDetalle, setLoteDetalle] = useState<Lote | null>(null)
  const [item, setItem] = useState<ItemDetalle | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev })

  const loteActivo = useMemo(() => lotes.find(l => l.codigo === codigoActivo) ?? lotes[0], [lotes, codigoActivo])
  const loteInversoData = useMemo(() => lotes.find(l => l.codigo === loteInverso) ?? lotes[0], [lotes, loteInverso])

  const buscar = (q: string, quedarseSiVacio = true) => {
    const query = q.trim().toLowerCase()
    if (!query) { if (!quedarseSiVacio) notify('Ingrese un lote a buscar', 'warning'); return }
    const found = lotes.find(l =>
      l.codigo.toLowerCase().includes(query) ||
      l.producto.toLowerCase().includes(query) ||
      l.op.toLowerCase().includes(query) ||
      l.materiales.some(m => m.lote.toLowerCase().includes(query)),
    )
    if (found) { setCodigoActivo(found.codigo); notify(`Lote ${found.codigo} cargado`, 'success') }
    else notify(`No se encontró ningún lote para "${q}"`, 'warning')
  }

  const onSelectNodo = (nodo: NodoArbol) => {
    if (nodo.kind === 'lote') setLoteDetalle(loteActivo)
    else {
      const m = loteActivo.materiales.find(x => x.id === nodo.refId)
      if (m) setItem({ tipo: 'material', data: m })
    }
  }

  const crearLote = (l: Lote) => {
    setLotes(prev => [l, ...prev])
    setCodigoActivo(l.codigo)
    setLoteDetalle(l)
  }

  const arbol = useMemo(() => arbolDe(loteActivo), [loteActivo])

  return (
    <Layout title="MES · Trazabilidad">
      <Box sx={{ minHeight: '100%', p: { xs: 2, sm: 3 }, mx: -3, mt: -3 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Box sx={{ width: 4, height: 20, bgcolor: MES_COLOR, borderRadius: '2px' }} />
                <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  MES · Trazabilidad Total
                </Typography>
              </Stack>
              <Typography sx={{ color: TEXT, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Genealogía del Producto
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button variant="outlined" startIcon={<FileDownloadIcon />}
                onClick={() => notify('Exportando trazabilidad a Excel...', 'info')}
                sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
                Exportar
              </Button>
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}>
                Registrar lote
              </Button>
            </Stack>
          </Stack>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
            <Tab label="Árbol genealogía" />
            <Tab label="Búsqueda por lote" />
            <Tab label="Trazabilidad inversa" />
          </Tabs>

          {/* ── Tab 0: Árbol genealogía ── */}
          {tab === 0 && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={3}>
                <TextField
                  fullWidth size="small"
                  placeholder="Buscar lote, producto u OP — ej. PT-2024-LOT-001"
                  value={busquedaArbol}
                  onChange={e => setBusquedaArbol(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') buscar(busquedaArbol, false) }}
                  sx={{ ...inputSx, maxWidth: 480 }}
                />
                <Button variant="contained" startIcon={<SearchIcon />}
                  onClick={() => buscar(busquedaArbol, false)}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}>
                  Buscar
                </Button>
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card sx={cardSx}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>
                          Árbol de genealogía — {loteActivo.codigo}
                        </Typography>
                        <EstadoChip estado={loteActivo.estado} />
                      </Stack>

                      <Box sx={{ overflowX: 'auto', pb: 1 }}>
                        <NodoGenealogico nodo={arbol} nivel={0} onSelect={onSelectNodo} />
                      </Box>

                      <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
                        <Typography sx={{ color: MUTED, fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                          Haz clic en el producto terminado para ver su detalle 360°, o en un material para su ficha. Usa el ícono para contraer / expandir.
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                  <Card sx={cardSx}>
                    <CardContent>
                      <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
                        Componentes del lote
                      </Typography>
                      <Stack spacing={1.5}>
                        <Box onClick={() => setLoteDetalle(loteActivo)}
                          sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${alpha('#10B981', 0.3)}`, bgcolor: alpha('#10B981', 0.05), cursor: 'pointer', '&:hover': { bgcolor: alpha('#10B981', 0.12) } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{loteActivo.producto}</Typography>
                              <Typography sx={{ color: '#10B981', fontSize: 11, fontFamily: 'monospace' }}>{loteActivo.codigo}</Typography>
                            </Box>
                            <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{fmt(loteActivo.cantidad)} {loteActivo.unidad}</Typography>
                          </Stack>
                        </Box>
                        {loteActivo.materiales.map(m => (
                          <Box key={m.id} onClick={() => setItem({ tipo: 'material', data: m })}
                            sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${alpha(m.color, 0.3)}`, bgcolor: alpha(m.color, 0.05), cursor: 'pointer', '&:hover': { bgcolor: alpha(m.color, 0.12) } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{m.nombre}</Typography>
                                <Typography sx={{ color: m.color, fontSize: 11, fontFamily: 'monospace' }}>{m.lote}</Typography>
                              </Box>
                              <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{fmt(m.cantidad)} {m.unidad}</Typography>
                            </Stack>
                          </Box>
                        ))}
                        {loteActivo.materiales.length === 0 && (
                          <Typography sx={{ color: MUTED, fontSize: 12, textAlign: 'center', py: 2 }}>
                            Este lote aún no tiene materiales registrados.
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Tab 1: Búsqueda por lote ── */}
          {tab === 1 && (
            <Box>
              <Stack direction="row" spacing={1.5} mb={3}>
                <TextField
                  fullWidth size="small"
                  placeholder="Ingresa lote — ej. PT-2024-LOT-001 · LOT-MP-001"
                  value={busquedaLote}
                  onChange={e => setBusquedaLote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') buscar(busquedaLote, false) }}
                  sx={{ ...inputSx, maxWidth: 560 }}
                />
                <Button variant="contained" startIcon={<SearchIcon />}
                  onClick={() => buscar(busquedaLote, false)}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}>
                  Buscar lote
                </Button>
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Card sx={cardSx}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>Datos del lote</Typography>
                        <EstadoChip estado={loteActivo.estado} />
                      </Stack>

                      <Box>
                        <Fila label="Producto" value={loteActivo.producto} />
                        <Fila label="# Lote" value={loteActivo.codigo} mono color={MES_COLOR} />
                        <Fila label="Cantidad producida" value={`${fmt(loteActivo.cantidad)} ${loteActivo.unidad}`} />
                        <Fila label="Fecha fabricación" value={loteActivo.fechaFab} />
                        <Fila label="Fecha vencimiento" value={loteActivo.fechaVenc} />
                        <Fila label="OP de origen" value={loteActivo.op} mono color={MES_COLOR} />
                        <Fila label="Línea / turno" value={`${loteActivo.linea} · ${loteActivo.turno}`} />
                        <Fila label="Responsable" value={loteActivo.responsable} />
                        <Fila label="Costo del lote" value={formatCOP(loteActivo.costoLote)} color={MES_DARK} />
                      </Box>

                      <Button fullWidth variant="outlined" startIcon={<AccountTreeIcon />}
                        onClick={() => setLoteDetalle(loteActivo)}
                        sx={{ mt: 2, borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
                        Ver genealogía 360° completa
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  <Card sx={cardSx}>
                    <CardContent>
                      <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2.5 }}>
                        Historial de eventos
                      </Typography>

                      <Box sx={{ position: 'relative', pl: 3.5 }}>
                        <Box sx={{ position: 'absolute', left: 11, top: 16, bottom: 16, width: 2, bgcolor: alpha(MES_COLOR, 0.2), borderRadius: '1px' }} />
                        <Stack spacing={0}>
                          {loteActivo.timeline.map((ev, i) => {
                            const ico = iconoTimeline(ev.icono)
                            const esUltimo = i === loteActivo.timeline.length - 1
                            return (
                              <Box key={ev.id} sx={{ position: 'relative', pb: esUltimo ? 0 : 2.5 }}>
                                <Box sx={{ position: 'absolute', left: -28, top: 4, width: 22, height: 22, borderRadius: '50%', bgcolor: ico.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 8px ${alpha(ico.bg, 0.5)}`, zIndex: 1 }}>
                                  <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>{ico.label}</Typography>
                                </Box>
                                <Box onClick={() => setItem({ tipo: 'evento', data: ev })}
                                  sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${alpha(ico.bg, 0.25)}`, bgcolor: alpha(ico.bg, 0.05), cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: ico.bg, bgcolor: alpha(ico.bg, 0.12) } }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{ev.evento}</Typography>
                                    <Typography sx={{ color: MUTED, fontSize: 11, ml: 1, flexShrink: 0 }}>{ev.fecha}</Typography>
                                  </Stack>
                                  <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.25 }}>{ev.responsable}</Typography>
                                  <Typography sx={{ color: alpha(TEXT, 0.7), fontSize: 11, mt: 0.75, lineHeight: 1.4 }}>{ev.detalle}</Typography>
                                </Box>
                              </Box>
                            )
                          })}
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Tab 2: Trazabilidad inversa ── */}
          {tab === 2 && (
            <Box>
              <Card sx={{ ...cardSx, mb: 3 }}>
                <CardContent>
                  <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                    Consulta directa
                  </Typography>
                  <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, mb: 2 }}>
                    ¿Qué materias primas se usaron para fabricar este lote?
                  </Typography>

                  <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap>
                    <TextField select size="small" value={loteInverso}
                      onChange={e => setLoteInverso(e.target.value)}
                      label="Lote de producto terminado"
                      sx={{ ...inputSx, minWidth: 320 }}>
                      {lotes.map(l => <MenuItem key={l.codigo} value={l.codigo}>{l.codigo} — {l.producto}</MenuItem>)}
                    </TextField>
                    <Button variant="outlined" startIcon={<FileDownloadIcon />}
                      onClick={() => notify(`Consumo de ${loteInversoData.codigo} exportado`, 'info')}
                      sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}>
                      Exportar consumo
                    </Button>
                  </Stack>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Materia prima', 'Lote MP', 'Proveedor', 'Cantidad usada', 'Fecha recepción', 'Estado'].map(h => (
                            <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loteInversoData.materiales.map(m => (
                          <TableRow key={m.id} onClick={() => setItem({ tipo: 'material', data: m })}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) } }}>
                            <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{m.nombre}</TableCell>
                            <TableCell sx={{ color: m.color, borderColor: BORDER, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{m.lote}</TableCell>
                            <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{m.proveedor}</TableCell>
                            <TableCell sx={{ color: TEXT, borderColor: BORDER, fontWeight: 600 }}>{fmt(m.cantidad)} {m.unidad}</TableCell>
                            <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 12 }}>{m.fechaRec}</TableCell>
                            <TableCell sx={{ borderColor: BORDER }}><EstadoChip estado={m.estado} /></TableCell>
                          </TableRow>
                        ))}
                        {loteInversoData.materiales.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ borderColor: BORDER, textAlign: 'center', color: MUTED, py: 3 }}>
                              Este lote no tiene materiales registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Análisis de impacto */}
              <Card sx={cardSx}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1.5}>
                    <Box>
                      <Typography sx={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                        Análisis de impacto
                      </Typography>
                      <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>
                        ¿Qué OPs se verían afectadas si bloqueamos LOT-MP-001?
                      </Typography>
                    </Box>
                    <Button
                      variant={bloquear ? 'contained' : 'outlined'}
                      startIcon={bloquear ? <CheckCircleIcon /> : <WarningAmberIcon />}
                      onClick={() => { setBloquear(b => !b); notify(bloquear ? 'Simulación de bloqueo desactivada' : 'Simulación de bloqueo activada', bloquear ? 'info' : 'warning') }}
                      sx={{
                        borderRadius: '8px', textTransform: 'none', fontWeight: 600,
                        ...(bloquear
                          ? { bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }
                          : { color: '#EF4444', borderColor: alpha('#EF4444', 0.5), '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }),
                      }}>
                      {bloquear ? 'Bloqueo simulado activo' : 'Simular bloqueo de lote'}
                    </Button>
                  </Stack>

                  {bloquear && (
                    <Box sx={{ p: 1.5, mb: 2, borderRadius: '8px', bgcolor: alpha('#EF4444', 0.08), border: `1px solid ${alpha('#EF4444', 0.3)}` }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <WarningAmberIcon sx={{ color: '#EF4444', fontSize: 18 }} />
                        <Typography sx={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                          Simulación activa — LOT-MP-001 bloqueado. Las siguientes OPs quedarían sin insumo.
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {['OP', 'Producto', 'Línea', 'Estado actual', 'Riesgo'].map(h => (
                            <TableCell key={h} sx={{ color: MUTED, borderColor: BORDER, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {OPS_AFECTADAS.map(op => {
                          const rColor = riesgoColor(op.riesgo)
                          const eColor = op.estado === 'EN_EJECUCION' ? '#10B981' : MES_COLOR
                          return (
                            <TableRow key={op.op} onClick={() => setItem({ tipo: 'op', data: op })}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(MES_COLOR, 0.04) }, ...(bloquear && { bgcolor: alpha('#EF4444', 0.04) }) }}>
                              <TableCell sx={{ color: MES_COLOR, borderColor: BORDER, fontWeight: 700, fontFamily: 'monospace' }}>{op.op}</TableCell>
                              <TableCell sx={{ color: TEXT, borderColor: BORDER }}>{op.producto}</TableCell>
                              <TableCell sx={{ color: MUTED, borderColor: BORDER, fontSize: 13 }}>{op.linea}</TableCell>
                              <TableCell sx={{ borderColor: BORDER }}>
                                <Chip label={op.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(eColor, 0.12), color: eColor, fontSize: 10, fontWeight: 700, border: `1px solid ${alpha(eColor, 0.3)}` }} />
                              </TableCell>
                              <TableCell sx={{ borderColor: BORDER }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: rColor, boxShadow: `0 0 6px ${alpha(rColor, 0.6)}` }} />
                                  <Typography sx={{ color: rColor, fontWeight: 700, fontSize: 13 }}>{op.riesgo}</Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
                    <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                      {[
                        { color: '#EF4444', label: 'Alto — detención inmediata de producción' },
                        { color: '#F59E0B', label: 'Medio — posible impacto en próximas 8 h' },
                        { color: '#10B981', label: 'Bajo — no impacta operación actual' },
                      ].map(s => (
                        <Stack key={s.color} direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                          <Typography sx={{ color: MUTED, fontSize: 12 }}>{s.label}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Box>

      {/* Diálogos */}
      <LoteDialog lote={loteDetalle} onClose={() => setLoteDetalle(null)} onItem={setItem} notify={notify} />
      <ItemDialog item={item} loteActivo={loteActivo} onClose={() => setItem(null)} notify={notify} />
      <RegistrarLoteDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={crearLote} notify={notify} />

      {/* Snackbar */}
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
