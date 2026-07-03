import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Stack, alpha, Divider, IconButton, Button, TextField, MenuItem,
  Switch, FormControlLabel, InputAdornment, Avatar, Rating,
  List, ListItem, ListItemText, ListItemSecondaryAction, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  NotificationsActive as AlertIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Sync as SyncIcon,
  Warning as WarnIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'

// ── Tipos de Trabajo — catálogo rico ─────────────────────────────────────────

type CatTrabajo = 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'INSPECCION' | 'EMERGENCIA'

interface TipoTrabajoConfig {
  id: number
  nombre: string
  categoria: CatTrabajo
  duracion: string
  requiereTaller: boolean
  requiereMateriales: boolean
  sistema: string
  subsistema: string
}

const CAT_COLOR: Record<CatTrabajo, string> = {
  PREVENTIVO: '#16A34A',
  CORRECTIVO: '#DC2626',
  PREDICTIVO: '#3B82F6',
  INSPECCION: '#F59E0B',
  EMERGENCIA: '#7F1D1D',
}

const CATEGORIAS_TRABAJO: CatTrabajo[] = ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'INSPECCION', 'EMERGENCIA']

// ── Catalogos mock ────────────────────────────────────────────────────────────

const TIPOS_TRABAJO_INIT: TipoTrabajoConfig[] = [
  { id:  1, nombre: 'Mantenimiento Preventivo',    categoria: 'PREVENTIVO', duracion: '4h',       requiereTaller: false, requiereMateriales: true,  sistema: 'General',     subsistema: 'Varios componentes'   },
  { id:  2, nombre: 'Mantenimiento Correctivo',    categoria: 'CORRECTIVO', duracion: 'Variable',  requiereTaller: true,  requiereMateriales: true,  sistema: 'Variable',    subsistema: 'Variable'             },
  { id:  3, nombre: 'Mantenimiento Predictivo',    categoria: 'PREDICTIVO', duracion: '3h',       requiereTaller: false, requiereMateriales: false, sistema: 'General',     subsistema: 'Monitoreo'            },
  { id:  4, nombre: 'Inspección Visual',           categoria: 'INSPECCION', duracion: '1h',       requiereTaller: false, requiereMateriales: false, sistema: 'General',     subsistema: 'Inspección general'   },
  { id:  5, nombre: 'Cambio de Aceite y Filtros',  categoria: 'PREVENTIVO', duracion: '2h',       requiereTaller: false, requiereMateriales: true,  sistema: 'Motor',       subsistema: 'Lubricación'          },
  { id:  6, nombre: 'Servicio Eléctrico',          categoria: 'CORRECTIVO', duracion: '3h',       requiereTaller: true,  requiereMateriales: false, sistema: 'Eléctrico',   subsistema: 'Circuitos y sensores' },
  { id:  7, nombre: 'Servicio Mecánico',           categoria: 'CORRECTIVO', duracion: 'Variable',  requiereTaller: true,  requiereMateriales: true,  sistema: 'Mecánico',    subsistema: 'Transmisión'          },
  { id:  8, nombre: 'Servicio Hidráulico',         categoria: 'CORRECTIVO', duracion: '4h',       requiereTaller: true,  requiereMateriales: true,  sistema: 'Hidráulico',  subsistema: 'Circuito hidráulico'  },
  { id:  9, nombre: 'Calibración',                 categoria: 'PREDICTIVO', duracion: '2h',       requiereTaller: false, requiereMateriales: false, sistema: 'Control',     subsistema: 'Sensores y válvulas'  },
  { id: 10, nombre: 'Lubricación',                 categoria: 'PREVENTIVO', duracion: '1h',       requiereTaller: false, requiereMateriales: true,  sistema: 'Lubricación', subsistema: 'Engrase general'      },
  { id: 11, nombre: 'Soldadura',                   categoria: 'CORRECTIVO', duracion: 'Variable',  requiereTaller: true,  requiereMateriales: true,  sistema: 'Estructura',  subsistema: 'Carrocería y chasis'  },
  { id: 12, nombre: 'Atención de Emergencia',      categoria: 'EMERGENCIA', duracion: '?',        requiereTaller: true,  requiereMateriales: true,  sistema: 'Variable',    subsistema: 'Variable'             },
]
const ACTIVIDADES = ['Revisión de frenos', 'Cambio de filtros', 'Alineación y balanceo', 'Diagnóstico electrónico', 'Revisión sistema eléctrico', 'Cambio de correas', 'Revisión de suspensión', 'Lavado y engrase', 'Revisión de neumáticos', 'Cambio de aceite motor', 'Revisión de batería', 'Ajuste de frenos', 'Revisión de luces', 'Revisión de niveles', 'Revisión de embrague', 'Revisión de dirección', 'Prueba de ruta', 'Documentación técnica']
const REPUESTOS_CAT = ['Filtro de aire CUMMINS', 'Filtro de aceite CUMMINS', 'Correa de distribución', 'Bujías NGK', 'Pastillas de freno', 'Aceite sintético 15W-40', 'Líquido de frenos DOT4', 'Batería 12V 100Ah', 'Amortiguador trasero', 'Correa alternador', 'Termostato motor', 'Bomba de agua']
const FALLAS = ['Fuga de aceite', 'Sobrecalentamiento motor', 'Falla eléctrica', 'Desgaste prematuro frenos', 'Vibración en marcha', 'Ruido en caja de cambios', 'Pérdida de potencia', 'Humo excesivo', 'Falla de arranque', 'Consumo excesivo combustible', 'Fuga hidráulica', 'Falla de suspensión']
const CAUSAS = ['Falta de mantenimiento', 'Uso inadecuado', 'Desgaste natural', 'Defecto de fabricación', 'Corrosión', 'Sobrecarga', 'Contaminación fluidos', 'Falla eléctrica', 'Temperatura extrema', 'Vibración', 'Fatiga de material', 'Accidente']
const SOLUCIONES = ['Reemplazo de componente', 'Reparación in situ', 'Ajuste y calibración', 'Limpieza profunda', 'Lubricación', 'Soldadura', 'Reemplazo de fluidos', 'Reprogramación ECU', 'Rebobinado eléctrico', 'Rectificación', 'Templado de frenos', 'Cambio de eje']

interface Contratista {
  id: number
  nombre: string
  tipo: 'TALLER' | 'PROVEEDOR' | 'TECNICO_EXTERNO'
  especialidad: string
  ciudad: string
  calificacion: number
  activo: boolean
}

const CONTRATISTAS: Contratista[] = [
  { id: 1, nombre: 'AutoTaller Express S.A.', tipo: 'TALLER', especialidad: 'Mecánica automotriz general', ciudad: 'Bogotá', calificacion: 4.5, activo: true },
  { id: 2, nombre: 'Cummins Service Center', tipo: 'PROVEEDOR', especialidad: 'Motores CUMMINS y garantías', ciudad: 'Bogotá', calificacion: 4.8, activo: true },
  { id: 3, nombre: 'ElectrAuto Ltda.', tipo: 'TALLER', especialidad: 'Sistemas eléctricos y electrónicos', ciudad: 'Medellín', calificacion: 4.2, activo: true },
  { id: 4, nombre: 'Ing. Carlos Pérez', tipo: 'TECNICO_EXTERNO', especialidad: 'Diagnóstico avanzado y ECU', ciudad: 'Cali', calificacion: 4.7, activo: true },
  { id: 5, nombre: 'HydroTech SAS', tipo: 'PROVEEDOR', especialidad: 'Sistemas hidráulicos industriales', ciudad: 'Bogotá', calificacion: 4.0, activo: false },
  { id: 6, nombre: 'Frenos y Suspensión del Valle', tipo: 'TALLER', especialidad: 'Frenos, suspensión y dirección', ciudad: 'Cali', calificacion: 3.8, activo: true },
]

interface Integracion {
  codigo: string
  nombre: string
  descripcion: string
  estado: 'ACTIVO' | 'PENDIENTE' | 'CONFIGURAR'
  ultimaSync?: string
  color: string
}

const INTEGRACIONES: Integracion[] = [
  { codigo: 'TMS', nombre: 'Sistema de Transporte', descripcion: 'Vehículos registrados, kilómetros y rutas en tiempo real', estado: 'ACTIVO', ultimaSync: 'Hace 5 min', color: '#32AC5C' },
  { codigo: 'HCM', nombre: 'Recursos Humanos', descripcion: 'Técnicos, certificaciones y disponibilidad de personal', estado: 'ACTIVO', ultimaSync: 'Hace 1 hora', color: '#32AC5C' },
  { codigo: 'WMS', nombre: 'Gestión de Almacén', descripcion: 'Equipos logísticos, inventario y ubicaciones físicas', estado: 'ACTIVO', ultimaSync: 'Hace 30 min', color: '#32AC5C' },
  { codigo: 'DMS', nombre: 'Gestión de Documentos', descripcion: 'Manuales técnicos, planos y garantías digitales', estado: 'PENDIENTE', color: '#F59E0B' },
  { codigo: 'QMS', nombre: 'Gestión de Calidad', descripcion: 'Hallazgos de auditoría y no conformidades', estado: 'ACTIVO', ultimaSync: 'Ayer 18:00', color: '#32AC5C' },
  { codigo: 'GRC', nombre: 'Gestión de Riesgos', descripcion: 'Activos críticos, valoración de riesgos y controles', estado: 'PENDIENTE', color: '#F59E0B' },
  { codigo: 'ERP', nombre: 'Planificación Empresarial', descripcion: 'Órdenes de compra, facturas y centros de costo', estado: 'ACTIVO', ultimaSync: 'Hace 15 min', color: '#32AC5C' },
  { codigo: 'GPS', nombre: 'GPS / Telemetría CANBUS', descripcion: 'Posicionamiento, velocidad, temperatura motor y consumo', estado: 'CONFIGURAR', color: '#3B82F6' },
]

const tipoContColor = (t: string) => ({ TALLER: '#3B82F6', PROVEEDOR: '#32AC5C', TECNICO_EXTERNO: '#8B5CF6' })[t] ?? '#9CA3AF'

interface UmbralState {
  pmAntesDias: number
  pmActive: boolean
  profNeumatico: number
  profActive: boolean
  stockMin: boolean
  mttrHrs: number
  mttrActive: boolean
  combustiblePct: number
  combustibleActive: boolean
  garantiaDias: number
  garantiaActive: boolean
  calibracionDias: number
  calibracionActive: boolean
}

const EMPTY_TIPO: TipoTrabajoConfig = { id: 0, nombre: '', categoria: 'PREVENTIVO', duracion: '1h', requiereTaller: false, requiereMateriales: false, sistema: '', subsistema: '' }

interface CentroCosto {
  id: number
  codigo: string
  nombre: string
  ciudad: string
  plataforma: string
}

const CENTROS_COSTO_INIT: CentroCosto[] = [
  { id: 1, codigo: 'CC-001', nombre: 'Flota Bogotá',        ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
  { id: 2, codigo: 'CC-002', nombre: 'Flota Medellín',       ciudad: 'Medellín',  plataforma: 'Plataforma Norte'   },
  { id: 3, codigo: 'CC-003', nombre: 'Bodega Principal',      ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
  { id: 4, codigo: 'CC-004', nombre: 'Infraestructura TI',    ciudad: 'Bogotá',    plataforma: 'Corporativo'        },
  { id: 5, codigo: 'CC-005', nombre: 'Equipos de Frío',       ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
  { id: 6, codigo: 'CC-006', nombre: 'Montacargas y Grúas',   ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
]

const EMPTY_CC: CentroCosto = { id: 0, codigo: '', nombre: '', ciudad: '', plataforma: '' }
const CIUDADES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga']
const PLATAFORMAS = ['Plataforma Central', 'Plataforma Norte', 'Plataforma Sur', 'Plataforma Oriente', 'Corporativo']

// ── Configuración de Disponibilidad ──────────────────────────────────────────
interface PeriodoCfg {
  id: number
  nombre: string
  desde: string   // "YYYY-MM"
  hasta: string   // "YYYY-MM"
  horas: number   // valor base / default
  aplica: 'todos' | 'categoria' | 'activos'
  categoria?: string
  activos?: string[]
  horasPorActivo?: Record<string, number>  // horas individuales por equipo
}

interface ActivoCfg {
  nombre: string
  categoria: string
  centroCosto: string
}

const ACTIVOS_CFG: ActivoCfg[] = [
  { nombre: 'VH-001 — Tractocamión Kenworth T800',    categoria: 'Vehículos',      centroCosto: 'CC-001' },
  { nombre: 'VH-002 — Camión Freightliner M2-106',    categoria: 'Vehículos',      centroCosto: 'CC-001' },
  { nombre: 'VH-003 — Camioneta Ford Ranger',         categoria: 'Vehículos',      centroCosto: 'CC-002' },
  { nombre: 'MC-001 — Montacargas Yale GLP050',       categoria: 'Montacargas',    centroCosto: 'CC-006' },
  { nombre: 'MC-003 — Montacargas Toyota 8FGCU25',   categoria: 'Montacargas',    centroCosto: 'CC-006' },
  { nombre: 'MC-004 — Reach Truck Crown RR5200',      categoria: 'Montacargas',    centroCosto: 'CC-006' },
  { nombre: 'CF-001 — Compresor Cuarto Frío',         categoria: 'Equipos Frío',   centroCosto: 'CC-005' },
  { nombre: 'CMP-07 — Compresor Atlas Copco GA22',    categoria: 'Industrial',     centroCosto: 'CC-003' },
  { nombre: 'SRV-01 — Servidor Dell PowerEdge R740',  categoria: 'TI',             centroCosto: 'CC-004' },
  { nombre: 'ELV-02 — Estibador Eléctrico Still EXU', categoria: 'Industrial',     centroCosto: 'CC-006' },
  { nombre: 'BD-01  — Bodega Principal Bogotá',        categoria: 'Infraestructura',centroCosto: 'CC-003' },
]

const ACTIVOS_CATS_CFG = ['Vehículos', 'Montacargas', 'Equipos Frío', 'Industrial', 'TI', 'Infraestructura']

const HORAS_DEFAULTS: Record<string, number> = {
  'VH-001 — Tractocamión Kenworth T800':    720,
  'VH-002 — Camión Freightliner M2-106':    720,
  'VH-003 — Camioneta Ford Ranger':         480,
  'MC-001 — Montacargas Yale GLP050':       480,
  'MC-003 — Montacargas Toyota 8FGCU25':   480,
  'MC-004 — Reach Truck Crown RR5200':      480,
  'CF-001 — Compresor Cuarto Frío':         720,
  'CMP-07 — Compresor Atlas Copco GA22':    480,
  'SRV-01 — Servidor Dell PowerEdge R740':  720,
  'ELV-02 — Estibador Eléctrico Still EXU': 480,
  'BD-01  — Bodega Principal Bogotá':        480,
}

export default function EAMConfig() {
  const [tab, setTab] = useState(0)
  const [catSearch, setCatSearch] = useState<Record<string, string>>({})

  // Tipos de Trabajo — CRUD
  const [tiposTrabajo, setTiposTrabajo] = useState<TipoTrabajoConfig[]>(TIPOS_TRABAJO_INIT)
  const [tipoDialog, setTipoDialog] = useState(false)
  const [tipoEditing, setTipoEditing] = useState<TipoTrabajoConfig>(EMPTY_TIPO)
  const [tipoSearch, setTipoSearch] = useState('')

  const openNewTipo = () => { setTipoEditing({ ...EMPTY_TIPO, id: Date.now() }); setTipoDialog(true) }
  const openEditTipo = (t: TipoTrabajoConfig) => { setTipoEditing({ ...t }); setTipoDialog(true) }
  const saveTipo = () => {
    setTiposTrabajo((prev) =>
      prev.find((t) => t.id === tipoEditing.id)
        ? prev.map((t) => (t.id === tipoEditing.id ? tipoEditing : t))
        : [...prev, tipoEditing]
    )
    setTipoDialog(false)
  }
  const deleteTipo = (id: number) => setTiposTrabajo((p) => p.filter((t) => t.id !== id))

  // Centros de Costo — CRUD
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>(CENTROS_COSTO_INIT)
  const [ccDialog, setCcDialog] = useState(false)
  const [ccEditing, setCcEditing] = useState<CentroCosto>(EMPTY_CC)
  const [ccSearch, setCcSearch] = useState('')

  const openNewCC = () => { setCcEditing({ ...EMPTY_CC, id: Date.now() }); setCcDialog(true) }
  const openEditCC = (c: CentroCosto) => { setCcEditing({ ...c }); setCcDialog(true) }
  const saveCC = () => {
    setCentrosCosto((prev) =>
      prev.find((c) => c.id === ccEditing.id)
        ? prev.map((c) => (c.id === ccEditing.id ? ccEditing : c))
        : [...prev, ccEditing]
    )
    setCcDialog(false)
  }
  const deleteCC = (id: number) => setCentrosCosto((p) => p.filter((c) => c.id !== id))

  const filteredCC = centrosCosto.filter((c) =>
    c.nombre.toLowerCase().includes(ccSearch.toLowerCase()) ||
    c.codigo.toLowerCase().includes(ccSearch.toLowerCase()) ||
    c.ciudad.toLowerCase().includes(ccSearch.toLowerCase())
  )

  const filteredTipos = tiposTrabajo.filter((t) =>
    t.nombre.toLowerCase().includes(tipoSearch.toLowerCase()) ||
    t.categoria.toLowerCase().includes(tipoSearch.toLowerCase())
  )
  const [intToggles, setIntToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRACIONES.map(i => [i.codigo, i.estado === 'ACTIVO']))
  )
  const [umbrales, setUmbrales] = useState<UmbralState>({
    pmAntesDias: 7, pmActive: true,
    profNeumatico: 3, profActive: true,
    stockMin: true,
    mttrHrs: 8, mttrActive: true,
    combustiblePct: 15, combustibleActive: true,
    garantiaDias: 30, garantiaActive: true,
    calibracionDias: 14, calibracionActive: true,
  })

  const setU = <K extends keyof UmbralState>(k: K, v: UmbralState[K]) =>
    setUmbrales(prev => ({ ...prev, [k]: v }))

  // Disponibilidad — horas por activo
  const [horasCfg, setHorasCfg] = useState<Record<string, number>>(() => {
    try {
      const s = localStorage.getItem('eam_horas_config')
      return s ? { ...HORAS_DEFAULTS, ...JSON.parse(s) } : { ...HORAS_DEFAULTS }
    } catch { return { ...HORAS_DEFAULTS } }
  })
  const [dispCat, setDispCat]   = useState('Todos')
  const [dispBulk, setDispBulk] = useState('720')
  const [dispSel, setDispSel]   = useState<string[]>([])

  // Períodos especiales de disponibilidad
  const [periodos, setPeriodos] = useState<PeriodoCfg[]>(() => {
    try {
      const s = localStorage.getItem('eam_periodos_config')
      return s ? JSON.parse(s) : []
    } catch { return [] }
  })

  const [periodDlg, setPeriodDlg] = useState(false)
  const [newPeriodo, setNewPeriodo] = useState<Omit<PeriodoCfg, 'id'>>({
    nombre: '', desde: '2026-07', hasta: '2026-07', horas: 720,
    aplica: 'todos', categoria: '', activos: [],
  })
  const [periodActSel, setPeriodActSel]     = useState<string[]>([])
  const [periodActHoras, setPeriodActHoras] = useState<Record<string, number>>({})
  const [periodActCat, setPeriodActCat]     = useState('Todos')

  useEffect(() => {
    localStorage.setItem('eam_horas_config', JSON.stringify(horasCfg))
  }, [horasCfg])

  useEffect(() => {
    localStorage.setItem('eam_periodos_config', JSON.stringify(periodos))
  }, [periodos])

  const activosFiltrados = dispCat === 'Todos' ? ACTIVOS_CFG : ACTIVOS_CFG.filter((a) => a.categoria === dispCat)
  const applyDispBulk = () => {
    const hs = parseFloat(dispBulk) || 0
    if (hs <= 0) return
    const targets = dispSel.length > 0 ? dispSel : activosFiltrados.map((a) => a.nombre)
    setHorasCfg((p) => { const n = { ...p }; targets.forEach((nm) => { n[nm] = hs }); return n })
  }

  const savePeriodo = () => {
    if (!newPeriodo.nombre || newPeriodo.horas <= 0 || newPeriodo.desde > newPeriodo.hasta) return
    const entry: PeriodoCfg = {
      ...newPeriodo,
      id: Date.now(),
      activos: newPeriodo.aplica === 'activos' ? periodActSel : [],
      categoria: newPeriodo.aplica === 'categoria' ? newPeriodo.categoria : '',
      horasPorActivo: newPeriodo.aplica === 'activos' ? { ...periodActHoras } : {},
    }
    setPeriodos((p) => [...p, entry])
    setPeriodDlg(false)
    setNewPeriodo({ nombre: '', desde: '2026-07', hasta: '2026-07', horas: 720, aplica: 'todos', categoria: '', activos: [] })
    setPeriodActSel([])
    setPeriodActHoras({})
    setPeriodActCat('Todos')
  }

  const togglePeriodActivo = (nombre: string, horasBase: number) => {
    if (periodActSel.includes(nombre)) {
      setPeriodActSel((p) => p.filter((x) => x !== nombre))
      setPeriodActHoras((p) => { const n = { ...p }; delete n[nombre]; return n })
    } else {
      setPeriodActSel((p) => [...p, nombre])
      setPeriodActHoras((p) => ({ ...p, [nombre]: horasBase }))
    }
  }

  const getSearch = (cat: string) => catSearch[cat] ?? ''
  const setSearch = (cat: string, val: string) => setCatSearch(prev => ({ ...prev, [cat]: val }))
  const filterCat = (items: string[], cat: string) =>
    items.filter(i => i.toLowerCase().includes(getSearch(cat).toLowerCase())).slice(0, 5)

  const CatalogCard = ({ title, items, catKey, total }: { title: string; items: string[]; catKey: string; total: number }) => (
    <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="white">{title}</Typography>
            <Typography variant="caption" color="grey.500">{total} registros</Typography>
          </Box>
          <Button size="small" startIcon={<AddIcon />} variant="outlined" sx={{ textTransform: 'none', borderColor: alpha(EAM_COLOR, 0.4), color: EAM_COLOR, fontSize: 11, '&:hover': { borderColor: EAM_COLOR, background: alpha(EAM_COLOR, 0.1) } }}>
            Agregar
          </Button>
        </Stack>
        <TextField
          fullWidth size="small" placeholder="Buscar..." value={getSearch(catKey)}
          onChange={e => setSearch(catKey, e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.03), '& fieldset': { borderColor: alpha('#fff', 0.12) }, '&:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.4) }, color: 'text.primary', fontSize: 13 } }}
        />
        <List dense disablePadding>
          {filterCat(items, catKey).map((item, i) => (
            <ListItem key={i} disablePadding sx={{ py: 0.25, '&:hover .actions': { opacity: 1 } }}>
              <ListItemText primary={<Typography variant="body2" color="grey.300">{item}</Typography>} />
              <ListItemSecondaryAction className="actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                <IconButton size="small" sx={{ color: 'grey.500', mr: 0.5 }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                <IconButton size="small" sx={{ color: '#EF4444' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {items.length > 5 && (
          <Typography variant="caption" color={EAM_COLOR} sx={{ cursor: 'pointer', mt: 0.5, display: 'block' }}>
            +{items.length - 5} más →
          </Typography>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(EAM_COLOR, 0.15), color: EAM_COLOR }}>
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">Configuración EAM</Typography>
            <Typography variant="body2" color="grey.400">Catálogos, contratistas, umbrales de alerta e integraciones</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR } }}>
            {['Catálogos', 'Contratistas', 'Umbrales & Alertas', 'Integraciones', 'Disponibilidad'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Catálogos */}
        {tab === 0 && (
          <Grid container spacing={2}>

            {/* ── Tipos de Trabajo — card especial con CRUD ── */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}` }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="white">Tipos de Trabajo</Typography>
                      <Typography variant="caption" color="grey.500">{tiposTrabajo.length} tipos configurados — categorías, duración y requisitos</Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} variant="contained"
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#27884A' }, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      onClick={openNewTipo}
                    >
                      Agregar tipo
                    </Button>
                  </Stack>

                  {/* Buscador */}
                  <TextField
                    fullWidth size="small" placeholder="Buscar por nombre o categoría..."
                    value={tipoSearch}
                    onChange={(e) => setTipoSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.03), '& fieldset': { borderColor: alpha('#fff', 0.1) }, '&:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.4) }, color: 'text.primary', fontSize: 13 } }}
                  />

                  {/* Cabecera */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px 1fr 36px 36px', gap: 1, px: 1, py: 0.5, bgcolor: alpha(EAM_COLOR, 0.05), borderRadius: '6px', mb: 0.5 }}>
                    {['Nombre', 'Categoría', 'Duración', 'Atributos', '', ''].map((h) => (
                      <Typography key={h} fontSize={10} fontWeight={700} color="rgba(255,255,255,0.35)" letterSpacing="0.4px">{h.toUpperCase()}</Typography>
                    ))}
                  </Box>

                  {/* Filas */}
                  <Stack spacing={0.5}>
                    {filteredTipos.map((t) => (
                      <Box key={t.id} sx={{
                        display: 'grid', gridTemplateColumns: '1fr 130px 80px 1fr 36px 36px',
                        gap: 1, px: 1, py: 0.75, alignItems: 'center',
                        borderRadius: '8px', border: `1px solid rgba(255,255,255,0.04)`,
                        '&:hover': { bgcolor: alpha('#fff', 0.02) },
                      }}>
                        <Typography fontSize={13} color="white" fontWeight={500}>{t.nombre}</Typography>

                        <Chip
                          label={t.categoria}
                          size="small"
                          sx={{ bgcolor: alpha(CAT_COLOR[t.categoria], 0.15), color: CAT_COLOR[t.categoria], fontWeight: 700, fontSize: 10, height: 20, border: `1px solid ${alpha(CAT_COLOR[t.categoria], 0.3)}`, width: 'fit-content' }}
                        />

                        <Typography fontSize={12} color="grey.400">{t.duracion}</Typography>

                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {t.requiereTaller && (
                            <Chip label="Taller" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontSize: 9, height: 18, border: '1px solid rgba(245,158,11,0.2)' }} />
                          )}
                          {t.requiereMateriales && (
                            <Chip label="Repuestos" size="small" sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', fontSize: 9, height: 18, border: '1px solid rgba(59,130,246,0.2)' }} />
                          )}
                          {!t.requiereTaller && !t.requiereMateriales && (
                            <Typography fontSize={11} color="grey.600">Sin requisitos</Typography>
                          )}
                        </Stack>

                        <IconButton size="small" sx={{ color: 'grey.500', '&:hover': { color: EAM_COLOR } }} onClick={() => openEditTipo(t)}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'grey.600', '&:hover': { color: '#EF4444' } }} onClick={() => deleteTipo(t.id)}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Diálogo crear/editar tipo de trabajo */}
            <Dialog open={tipoDialog} onClose={() => setTipoDialog(false)} maxWidth="sm" fullWidth
              PaperProps={{ sx: { border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '14px' } }}
            >
              <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                {tipoEditing.id && tiposTrabajo.find(t => t.id === tipoEditing.id) ? 'Editar tipo de trabajo' : 'Nuevo tipo de trabajo'}
                <IconButton size="small" onClick={() => setTipoDialog(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth size="small" label="Nombre del trabajo"
                    value={tipoEditing.nombre}
                    onChange={(e) => setTipoEditing((p) => ({ ...p, nombre: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      select fullWidth size="small" label="Categoría"
                      value={tipoEditing.categoria}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, categoria: e.target.value as CatTrabajo }))}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.500' } }}
                    >
                      {CATEGORIAS_TRABAJO.map((c) => (
                        <MenuItem key={c} value={c}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CAT_COLOR[c] }} />
                            <span>{c}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      fullWidth size="small" label="Duración estimada"
                      value={tipoEditing.duracion}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, duracion: e.target.value }))}
                      placeholder="Ej: 2h, 4h, Variable"
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth size="small" label="Sistema del activo"
                      value={tipoEditing.sistema}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, sistema: e.target.value }))}
                      placeholder="Ej: Motor, Eléctrico, Hidráulico"
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                    <TextField
                      fullWidth size="small" label="Subsistema del activo"
                      value={tipoEditing.subsistema}
                      onChange={(e) => setTipoEditing((p) => ({ ...p, subsistema: e.target.value }))}
                      placeholder="Ej: Lubricación, Circuitos, Transmisión"
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tipoEditing.requiereTaller}
                          onChange={(e) => setTipoEditing((p) => ({ ...p, requiereTaller: e.target.checked }))}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#F59E0B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#F59E0B' } }}
                        />
                      }
                      label={<Typography fontSize={13} color="grey.300">Requiere taller externo</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tipoEditing.requiereMateriales}
                          onChange={(e) => setTipoEditing((p) => ({ ...p, requiereMateriales: e.target.checked }))}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3B82F6' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3B82F6' } }}
                        />
                      }
                      label={<Typography fontSize={13} color="grey.300">Requiere repuestos</Typography>}
                    />
                  </Stack>

                  {/* Preview del badge */}
                  {tipoEditing.nombre && (
                    <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.03), borderRadius: '8px', border: `1px solid rgba(255,255,255,0.07)` }}>
                      <Typography fontSize={11} color="grey.500" mb={0.75}>Vista previa de badges:</Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        <Chip label={tipoEditing.categoria} size="small" sx={{ bgcolor: alpha(CAT_COLOR[tipoEditing.categoria], 0.15), color: CAT_COLOR[tipoEditing.categoria], fontWeight: 700, fontSize: 10, height: 20 }} />
                        <Chip label={`⏱ ${tipoEditing.duracion || '?'}`} size="small" sx={{ bgcolor: alpha('#fff', 0.05), color: 'text.secondary', fontSize: 10, height: 20 }} />
                        {tipoEditing.requiereTaller && <Chip label="Requiere taller" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontSize: 10, height: 20 }} />}
                        {tipoEditing.requiereMateriales && <Chip label="Requiere repuestos" size="small" sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', fontSize: 10, height: 20 }} />}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setTipoDialog(false)} sx={{ color: 'grey.400' }}>Cancelar</Button>
                <Button
                  variant="contained" onClick={saveTipo}
                  disabled={!tipoEditing.nombre.trim()}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#27884A' }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Guardar
                </Button>
              </DialogActions>
            </Dialog>

            {/* ── Centros de Costo — card especial con CRUD ── */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}` }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="white">Centros de Costo</Typography>
                      <Typography variant="caption" color="grey.500">{centrosCosto.length} centros configurados — asociados a plataformas y ciudades</Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} variant="contained"
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#27884A' }, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      onClick={openNewCC}
                    >
                      Agregar centro
                    </Button>
                  </Stack>
                  <TextField
                    fullWidth size="small" placeholder="Buscar por código, nombre o ciudad..."
                    value={ccSearch} onChange={(e) => setCcSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.03), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                  />
                  {/* Header */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 1fr 90px', gap: 1, px: 1, pb: 0.5, borderBottom: '1px solid rgba(255,255,255,0.07)', mb: 0.5 }}>
                    {['Código', 'Nombre', 'Ciudad', 'Plataforma', ''].map((h) => (
                      <Typography key={h} fontSize={10} fontWeight={700} color="rgba(255,255,255,0.3)" letterSpacing="0.04em" textTransform="uppercase">{h}</Typography>
                    ))}
                  </Box>
                  <Stack spacing={0.25}>
                    {filteredCC.map((c) => (
                      <Box key={c.id} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 1fr 90px', gap: 1, px: 1, py: 0.75, borderRadius: '6px', '&:hover': { bgcolor: alpha('#fff', 0.03) }, alignItems: 'center' }}>
                        <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>{c.codigo}</Typography>
                        <Typography fontSize={12} color="white" noWrap>{c.nombre}</Typography>
                        <Typography fontSize={12} color="rgba(255,255,255,0.6)" noWrap>{c.ciudad}</Typography>
                        <Typography fontSize={12} color="rgba(255,255,255,0.45)" noWrap>{c.plataforma}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => openEditCC(c)} sx={{ color: EAM_COLOR, '&:hover': { bgcolor: alpha(EAM_COLOR, 0.1) } }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" onClick={() => deleteCC(c.id)} sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Stack>
                      </Box>
                    ))}
                    {filteredCC.length === 0 && (
                      <Typography fontSize={12} color="rgba(255,255,255,0.3)" textAlign="center" py={2}>Sin resultados</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Dialog Centros de Costo */}
            <Dialog open={ccDialog} onClose={() => setCcDialog(false)} maxWidth="sm" fullWidth
              PaperProps={{ sx: { border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '14px' } }}
            >
              <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                {ccEditing.id && centrosCosto.find((c) => c.id === ccEditing.id) ? 'Editar centro de costo' : 'Nuevo centro de costo'}
                <IconButton size="small" onClick={() => setCcDialog(false)} sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth size="small" label="Código"
                      value={ccEditing.codigo}
                      onChange={(e) => setCcEditing((p) => ({ ...p, codigo: e.target.value }))}
                      placeholder="Ej: CC-007"
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                    <TextField
                      fullWidth size="small" label="Nombre del centro de costo"
                      value={ccEditing.nombre}
                      onChange={(e) => setCcEditing((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Flota Cali"
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select fullWidth size="small" label="Ciudad"
                      value={ccEditing.ciudad}
                      onChange={(e) => setCcEditing((p) => ({ ...p, ciudad: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.500' } }}
                    >
                      {CIUDADES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                    <TextField
                      select fullWidth size="small" label="Plataforma"
                      value={ccEditing.plataforma}
                      onChange={(e) => setCcEditing((p) => ({ ...p, plataforma: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.500' } }}
                    >
                      {PLATAFORMAS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </TextField>
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setCcDialog(false)} sx={{ color: 'grey.400' }}>Cancelar</Button>
                <Button
                  variant="contained" onClick={saveCC}
                  disabled={!ccEditing.codigo.trim() || !ccEditing.nombre.trim()}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#27884A' }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Guardar
                </Button>
              </DialogActions>
            </Dialog>

            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Actividades" items={ACTIVIDADES} catKey="actividades" total={18} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Repuestos" items={REPUESTOS_CAT} catKey="repuestos" total={324} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Fallas" items={FALLAS} catKey="fallas" total={45} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Causas" items={CAUSAS} catKey="causas" total={32} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Soluciones" items={SOLUCIONES} catKey="soluciones" total={28} />
            </Grid>
          </Grid>
        )}

        {/* Tab 1: Contratistas */}
        {tab === 1 && (
          <Box>
            <Stack direction="row" justifyContent="flex-end" mb={2}>
              <Button startIcon={<AddIcon />} variant="contained" sx={{ textTransform: 'none', background: EAM_COLOR, '&:hover': { background: '#27884A' } }}>
                Agregar Contratista
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {CONTRATISTAS.map(c => (
                <Grid key={c.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(c.activo ? tipoContColor(c.tipo) : '#4B5563', 0.3)}`, opacity: c.activo ? 1 : 0.6 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 40, height: 40, background: alpha(tipoContColor(c.tipo), 0.15) }}>
                            {c.tipo === 'TECNICO_EXTERNO' ? <PersonIcon sx={{ color: tipoContColor(c.tipo) }} /> : c.tipo === 'TALLER' ? <BuildIcon sx={{ color: tipoContColor(c.tipo) }} /> : <BusinessIcon sx={{ color: tipoContColor(c.tipo) }} />}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700} color="white">{c.nombre}</Typography>
                            <Typography variant="caption" color="grey.500">{c.ciudad}</Typography>
                          </Box>
                        </Stack>
                        {c.activo
                          ? <ActiveIcon sx={{ color: '#32AC5C', fontSize: 18 }} />
                          : <InactiveIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />}
                      </Stack>

                      <Chip label={c.tipo.replace('_', ' ')} size="small" sx={{ background: alpha(tipoContColor(c.tipo), 0.12), color: tipoContColor(c.tipo), fontWeight: 600, fontSize: 10, mb: 1 }} />

                      <Typography variant="caption" color="grey.400" display="block" mb={1}>{c.especialidad}</Typography>

                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Rating value={c.calificacion} precision={0.5} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' }, '& .MuiRating-iconEmpty': { color: alpha('#fff', 0.2) } }} />
                          <Typography variant="caption" color="grey.400">{c.calificacion}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" sx={{ color: 'grey.500' }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" sx={{ color: '#EF4444' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Tab 2: Umbrales & Alertas */}
        {tab === 2 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <AlertIcon sx={{ color: EAM_COLOR, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="white">Alertas de Mantenimiento</Typography>
                  </Stack>
                  <Stack spacing={2.5} divider={<Divider sx={{ borderColor: alpha('#fff', 0.06) }} />}>
                    {/* PM Vencido */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.pmActive} onChange={e => setU('pmActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: EAM_COLOR }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: EAM_COLOR } }} />
                          <Typography variant="body2" color={umbrales.pmActive ? 'white' : 'grey.500'} fontWeight={600}>Alerta PM por vencer</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Notificar X días antes del vencimiento del PM</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.pmAntesDias}
                        onChange={e => setU('pmAntesDias', Number(e.target.value))}
                        disabled={!umbrales.pmActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">días</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Profundidad neumático */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.profActive} onChange={e => setU('profActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: EAM_COLOR }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: EAM_COLOR } }} />
                          <Typography variant="body2" color={umbrales.profActive ? 'white' : 'grey.500'} fontWeight={600}>Profundidad mínima neumático</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alerta cuando la profundidad sea menor a X mm</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.profNeumatico}
                        onChange={e => setU('profNeumatico', Number(e.target.value))}
                        disabled={!umbrales.profActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">mm</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Stock mínimo */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.stockMin} onChange={e => setU('stockMin', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: EAM_COLOR }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: EAM_COLOR } }} />
                          <Typography variant="body2" color={umbrales.stockMin ? 'white' : 'grey.500'} fontWeight={600}>Alerta stock mínimo repuestos</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Notificar cuando repuesto crítico esté por debajo del mínimo</Typography>
                      </Box>
                      <Chip label={umbrales.stockMin ? 'ACTIVO' : 'INACTIVO'} size="small" sx={{ background: alpha(umbrales.stockMin ? '#32AC5C' : '#9CA3AF', 0.15), color: umbrales.stockMin ? '#32AC5C' : '#9CA3AF', fontWeight: 700 }} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <WarnIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="white">Umbrales Operativos</Typography>
                  </Stack>
                  <Stack spacing={2.5} divider={<Divider sx={{ borderColor: alpha('#fff', 0.06) }} />}>
                    {/* MTTR */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.mttrActive} onChange={e => setU('mttrActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.mttrActive ? 'white' : 'grey.500'} fontWeight={600}>MTTR excedido</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alerta cuando el MTTR supere el umbral</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.mttrHrs}
                        onChange={e => setU('mttrHrs', Number(e.target.value))}
                        disabled={!umbrales.mttrActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">hrs</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Consumo combustible */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.combustibleActive} onChange={e => setU('combustibleActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.combustibleActive ? 'white' : 'grey.500'} fontWeight={600}>Desviación consumo combustible</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alerta cuando el consumo supere en X% el promedio</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.combustiblePct}
                        onChange={e => setU('combustiblePct', Number(e.target.value))}
                        disabled={!umbrales.combustibleActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">%</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Garantía por vencer */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.garantiaActive} onChange={e => setU('garantiaActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.garantiaActive ? 'white' : 'grey.500'} fontWeight={600}>Garantía por vencer</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alertar X días antes del vencimiento de garantía</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.garantiaDias}
                        onChange={e => setU('garantiaDias', Number(e.target.value))}
                        disabled={!umbrales.garantiaActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">días</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Calibración */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.calibracionActive} onChange={e => setU('calibracionActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.calibracionActive ? 'white' : 'grey.500'} fontWeight={600}>Calibración por vencer</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alertar X días antes del vencimiento de calibración</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.calibracionDias}
                        onChange={e => setU('calibracionDias', Number(e.target.value))}
                        disabled={!umbrales.calibracionActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">días</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'text.primary', fontSize: 13 } }}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 3: Integraciones */}
        {tab === 3 && (
          <Box>
            <Typography variant="subtitle1" color="grey.300" mb={2} fontWeight={600}>
              Integraciones con sistemas corporativos ICOLTRANS
            </Typography>
            <Grid container spacing={2}>
              {INTEGRACIONES.map(intg => {
                const isOn = intToggles[intg.codigo] ?? false
                const statusColor = intg.estado === 'ACTIVO' ? '#32AC5C' : intg.estado === 'CONFIGURAR' ? '#3B82F6' : '#F59E0B'
                return (
                  <Grid key={intg.codigo} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(isOn ? intg.color : '#4B5563', 0.3)}`, transition: 'border-color 0.3s' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, background: alpha(intg.color, 0.15), border: `1px solid ${alpha(intg.color, 0.3)}` }}>
                              <Typography variant="body2" fontWeight={800} color={intg.color}>{intg.codigo}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={700} color="white">{intg.nombre}</Typography>
                            </Box>
                          </Stack>
                          <Switch
                            checked={isOn}
                            onChange={e => setIntToggles(prev => ({ ...prev, [intg.codigo]: e.target.checked }))}
                            size="small"
                            sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: intg.color }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: intg.color } }}
                          />
                        </Stack>

                        <Typography variant="caption" color="grey.400" display="block" mb={1.5}>{intg.descripcion}</Typography>

                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Chip
                            label={intg.estado}
                            size="small"
                            icon={intg.estado === 'ACTIVO' ? <ActiveIcon sx={{ fontSize: '12px !important', color: `${statusColor} !important` }} /> : intg.estado === 'CONFIGURAR' ? <SyncIcon sx={{ fontSize: '12px !important', color: `${statusColor} !important` }} /> : <WarnIcon sx={{ fontSize: '12px !important', color: `${statusColor} !important` }} />}
                            sx={{ background: alpha(statusColor, 0.12), color: statusColor, fontWeight: 700, fontSize: 10 }}
                          />
                          {intg.ultimaSync && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <SyncIcon sx={{ fontSize: 12, color: 'grey.600' }} />
                              <Typography variant="caption" color="grey.500">{intg.ultimaSync}</Typography>
                            </Stack>
                          )}
                          {!intg.ultimaSync && (
                            <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: 11, borderColor: alpha(intg.color, 0.4), color: intg.color, py: 0.25, '&:hover': { borderColor: intg.color, background: alpha(intg.color, 0.1) } }}>
                              {intg.estado === 'CONFIGURAR' ? 'Configurar' : 'Activar'}
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}

        {/* Tab 4: Disponibilidad */}
        {tab === 4 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="white">Configuración de Disponibilidad</Typography>
                <Typography variant="body2" color="grey.500">Defina las horas operativas esperadas por activo, categoría o período para el cálculo de disponibilidad</Typography>
              </Box>
            </Stack>

            {/* ── Sección 1: Períodos especiales ── */}
            <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#F59E0B', 0.25)}`, mb: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="white">Períodos especiales</Typography>
                    <Typography variant="caption" color="grey.500">Defina rangos de meses con horas distintas a las base (vacaciones, temporadas, mantenimientos programados)</Typography>
                  </Box>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />}
                    onClick={() => setPeriodDlg(true)}
                    sx={{ borderColor: alpha('#F59E0B', 0.5), color: '#F59E0B', '&:hover': { borderColor: '#F59E0B', bgcolor: alpha('#F59E0B', 0.08) }, fontWeight: 700, borderRadius: '8px', flexShrink: 0 }}>
                    Nuevo período
                  </Button>
                </Stack>

                {periodos.length === 0 ? (
                  <Box sx={{ py: 2.5, textAlign: 'center', borderRadius: '8px', bgcolor: alpha('#fff', 0.02), border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <Typography fontSize={12} color="rgba(255,255,255,0.3)">Sin períodos especiales. Las horas base por activo aplican a todos los meses.</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { color: 'text.disabled', fontWeight: 700, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)', py: 1 } }}>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Período</TableCell>
                          <TableCell>Horas/mes</TableCell>
                          <TableCell>Aplica a</TableCell>
                          <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {periodos.map((p) => (
                          <TableRow key={p.id} sx={{ '& td': { color: 'grey.200', borderBottom: '1px solid rgba(255,255,255,0.04)' }, '&:hover': { bgcolor: alpha('#fff', 0.02) } }}>
                            <TableCell><Typography fontSize={12} fontWeight={600} color="white">{p.nombre}</Typography></TableCell>
                            <TableCell>
                              <Typography fontSize={11} color="rgba(255,255,255,0.6)">{p.desde} → {p.hasta}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={`${p.horas}h`} size="small" sx={{ bgcolor: alpha('#F59E0B', 0.12), color: '#F59E0B', fontWeight: 700, fontSize: 11 }} />
                            </TableCell>
                            <TableCell>
                              {p.aplica === 'todos' && <Chip label="Todos los activos" size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.12), color: EAM_COLOR, fontSize: 10 }} />}
                              {p.aplica === 'categoria' && <Chip label={p.categoria} size="small" sx={{ bgcolor: alpha('#3B82F6', 0.12), color: '#93C5FD', fontSize: 10 }} />}
                              {p.aplica === 'activos' && (
                                <Tooltip
                                  title={
                                    <Box>
                                      {p.activos?.map((nm) => (
                                        <Box key={nm} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontSize: 11 }}>
                                          <span>{nm.split('—')[0].trim()}</span>
                                          <strong>{p.horasPorActivo?.[nm] ?? p.horas}h</strong>
                                        </Box>
                                      ))}
                                    </Box>
                                  }
                                  placement="top"
                                >
                                  <Chip label={`${p.activos?.length} equipos`} size="small" sx={{ bgcolor: alpha('#8B5CF6', 0.12), color: '#C4B5FD', fontSize: 10, cursor: 'help' }} />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => setPeriodos((prev) => prev.filter((x) => x.id !== p.id))} sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* ── Sección 2: Horas base por activo ── */}
            <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.2)}`, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="white" mb={0.5}>Horas base por activo</Typography>
                <Typography variant="caption" color="grey.500" display="block" mb={2}>Horas operativas esperadas por mes para cada activo. Se aplican cuando no hay un período especial vigente.</Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap mb={2}>
                  <TextField
                    select size="small" label="Filtrar categoría" value={dispCat}
                    onChange={(e) => { setDispCat(e.target.value); setDispSel([]) }}
                    sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                  >
                    <MenuItem value="Todos">Todas las categorías</MenuItem>
                    {ACTIVOS_CATS_CFG.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                  <TextField
                    size="small" label="Horas/mes a aplicar" type="number" value={dispBulk}
                    onChange={(e) => setDispBulk(e.target.value)}
                    inputProps={{ min: 1, max: 744 }}
                    sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                  />
                  <Button variant="contained" onClick={applyDispBulk}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#27884A' }, fontWeight: 700, borderRadius: '8px', height: 36 }}>
                    Aplicar a {dispSel.length > 0 ? `${dispSel.length} seleccionados` : (dispCat === 'Todos' ? 'todos' : dispCat)}
                  </Button>
                  {dispSel.length > 0 && (
                    <Button size="small" onClick={() => setDispSel([])} sx={{ color: 'grey.500', fontSize: 11 }}>Limpiar selección</Button>
                  )}
                </Stack>

                <Box mb={2}>
                  <Typography variant="caption" color="grey.600" mb={0.75} display="block">Selección individual (opcional)</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {activosFiltrados.map((a) => (
                      <Chip key={a.nombre} label={a.nombre.split('—')[0].trim()} size="small" clickable
                        onClick={() => setDispSel((p) => p.includes(a.nombre) ? p.filter((x) => x !== a.nombre) : [...p, a.nombre])}
                        sx={{
                          bgcolor: dispSel.includes(a.nombre) ? alpha(EAM_COLOR, 0.2) : alpha('#fff', 0.05),
                          color: dispSel.includes(a.nombre) ? EAM_COLOR : 'rgba(255,255,255,0.45)',
                          border: `1px solid ${dispSel.includes(a.nombre) ? alpha(EAM_COLOR, 0.4) : 'rgba(255,255,255,0.07)'}`,
                          fontWeight: dispSel.includes(a.nombre) ? 700 : 400, fontSize: 11,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Tabla individual */}
                <Box sx={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 140px 120px 130px', gap: 2, px: 3, py: 1.25, bgcolor: alpha(EAM_COLOR, 0.06), borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Activo', 'Categoría', 'Centro costo', 'Horas/mes'].map((h) => (
                      <Typography key={h} fontSize={10} fontWeight={700} color="rgba(255,255,255,0.35)" letterSpacing="0.05em" textTransform="uppercase">{h}</Typography>
                    ))}
                  </Box>
                  {ACTIVOS_CFG.map((a) => (
                    <Box key={a.nombre} sx={{ display: 'grid', gridTemplateColumns: '2fr 140px 120px 130px', gap: 2, px: 3, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', '&:hover': { bgcolor: alpha('#fff', 0.02) } }}>
                      <Box>
                        <Typography fontSize={12} fontWeight={600} color="white" noWrap>{a.nombre.split('—')[0].trim()}</Typography>
                        <Typography fontSize={10} color="rgba(255,255,255,0.35)" noWrap>{a.nombre.split('—')[1]?.trim()}</Typography>
                      </Box>
                      <Chip label={a.categoria} size="small" sx={{ bgcolor: alpha('#6B7280', 0.15), color: '#9CA3AF', fontSize: 10, height: 20, fontWeight: 600, width: 'fit-content' }} />
                      <Typography fontSize={11} color="rgba(255,255,255,0.45)">{a.centroCosto}</Typography>
                      <TextField
                        size="small" type="number" value={horasCfg[a.nombre] ?? 720}
                        onChange={(e) => setHorasCfg((p) => ({ ...p, [a.nombre]: parseFloat(e.target.value) || 0 }))}
                        inputProps={{ min: 1, max: 744, style: { textAlign: 'center', fontSize: 13, fontWeight: 700 } }}
                        sx={{
                          '& .MuiOutlinedInput-root': { color: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06), fontSize: 13 },
                          '& fieldset': { borderColor: alpha(EAM_COLOR, 0.25) },
                          '& .MuiOutlinedInput-root:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.5) },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Nota */}
            <Box sx={{ p: 2, bgcolor: alpha('#3B82F6', 0.06), border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px' }}>
              <Typography fontSize={12} color="#93C5FD">
                <strong>Referencia:</strong> 24 h/día × 30 días = 720 h/mes (continuo) · 1 turno (8h) = 240 h/mes · 2 turnos = 480 h/mes · 3 turnos = 720 h/mes. Los períodos especiales tienen precedencia sobre los valores base. La configuración se aplica automáticamente al informe de Disponibilidad.
              </Typography>
            </Box>

            {/* ── Dialog: Nuevo período ── */}
            <Dialog open={periodDlg} onClose={() => setPeriodDlg(false)} maxWidth="sm" fullWidth
              PaperProps={{ sx: { bgcolor: '#0D1B2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' } }}>
              <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, pb: 1 }}>
                Nuevo período especial
                <IconButton onClick={() => setPeriodDlg(false)} sx={{ position: 'absolute', right: 12, top: 12, color: 'grey.500' }}><CloseIcon /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2} mt={1}>
                  <TextField size="small" label="Nombre del período" fullWidth
                    value={newPeriodo.nombre} onChange={(e) => setNewPeriodo((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Vacaciones julio-agosto, Operación reducida..."
                    sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField size="small" label="Mes inicio" type="month" fullWidth
                      value={newPeriodo.desde} onChange={(e) => setNewPeriodo((p) => ({ ...p, desde: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                    <TextField size="small" label="Mes fin" type="month" fullWidth
                      value={newPeriodo.hasta} onChange={(e) => setNewPeriodo((p) => ({ ...p, hasta: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) } }}
                    />
                    <TextField size="small" label="Horas/mes" type="number" sx={{ minWidth: 100, '& .MuiOutlinedInput-root': { color: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha(EAM_COLOR, 0.3) } }}
                      value={newPeriodo.horas}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setNewPeriodo((p) => ({ ...p, horas: val }))
                        if (newPeriodo.aplica === 'activos' && periodActSel.length > 0) {
                          setPeriodActHoras((p) => {
                            const n = { ...p }
                            periodActSel.forEach((nm) => { n[nm] = val })
                            return n
                          })
                        }
                      }}
                      inputProps={{ min: 1, max: 744 }}
                    />
                  </Stack>

                  <TextField select size="small" label="Aplica a" fullWidth
                    value={newPeriodo.aplica} onChange={(e) => setNewPeriodo((p) => ({ ...p, aplica: e.target.value as PeriodoCfg['aplica'] }))}
                    sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                  >
                    <MenuItem value="todos">Todos los activos</MenuItem>
                    <MenuItem value="categoria">Por categoría</MenuItem>
                    <MenuItem value="activos">Activos específicos</MenuItem>
                  </TextField>

                  {newPeriodo.aplica === 'categoria' && (
                    <TextField select size="small" label="Categoría" fullWidth
                      value={newPeriodo.categoria} onChange={(e) => setNewPeriodo((p) => ({ ...p, categoria: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                    >
                      {ACTIVOS_CATS_CFG.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                  )}

                  {newPeriodo.aplica === 'activos' && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <TextField select size="small" label="Filtrar categoría" value={periodActCat}
                          onChange={(e) => setPeriodActCat(e.target.value)}
                          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                        >
                          <MenuItem value="Todos">Todas las categorías</MenuItem>
                          {ACTIVOS_CATS_CFG.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>
                        {periodActSel.length > 0 && (
                          <Typography fontSize={11} color={EAM_COLOR} fontWeight={700}>{periodActSel.length} seleccionados</Typography>
                        )}
                      </Stack>
                      <Stack direction="row" flexWrap="wrap" gap={0.75} mb={periodActSel.length > 0 ? 1.5 : 0}>
                        {(periodActCat === 'Todos' ? ACTIVOS_CFG : ACTIVOS_CFG.filter((a) => a.categoria === periodActCat)).map((a) => (
                          <Chip key={a.nombre} label={a.nombre.split('—')[0].trim()} size="small" clickable
                            onClick={() => togglePeriodActivo(a.nombre, newPeriodo.horas)}
                            sx={{
                              bgcolor: periodActSel.includes(a.nombre) ? alpha(EAM_COLOR, 0.2) : alpha('#fff', 0.05),
                              color: periodActSel.includes(a.nombre) ? EAM_COLOR : 'rgba(255,255,255,0.45)',
                              border: `1px solid ${periodActSel.includes(a.nombre) ? alpha(EAM_COLOR, 0.4) : 'rgba(255,255,255,0.07)'}`,
                              fontWeight: periodActSel.includes(a.nombre) ? 700 : 400, fontSize: 11,
                            }}
                          />
                        ))}
                      </Stack>

                      {/* Tabla de horas individuales por equipo seleccionado */}
                      {periodActSel.length > 0 && (
                        <Box sx={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(50,172,92,0.2)', bgcolor: alpha(EAM_COLOR, 0.03) }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 130px', px: 2, py: 1, bgcolor: alpha(EAM_COLOR, 0.08), borderBottom: '1px solid rgba(50,172,92,0.15)' }}>
                            <Typography fontSize={10} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.05em" textTransform="uppercase">Equipo</Typography>
                            <Typography fontSize={10} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.05em" textTransform="uppercase">Horas/mes</Typography>
                          </Box>
                          {periodActSel.map((nombre) => {
                            const parts = nombre.split('—')
                            return (
                              <Box key={nombre} sx={{ display: 'grid', gridTemplateColumns: '1fr 130px', px: 2, py: 1, borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', '&:hover': { bgcolor: alpha('#fff', 0.02) } }}>
                                <Box>
                                  <Typography fontSize={12} fontWeight={600} color="white" noWrap>{parts[0].trim()}</Typography>
                                  <Typography fontSize={10} color="rgba(255,255,255,0.35)" noWrap>{parts[1]?.trim()}</Typography>
                                </Box>
                                <TextField
                                  size="small" type="number"
                                  value={periodActHoras[nombre] ?? newPeriodo.horas}
                                  onChange={(e) => setPeriodActHoras((p) => ({ ...p, [nombre]: parseFloat(e.target.value) || 0 }))}
                                  inputProps={{ min: 1, max: 744, style: { textAlign: 'center', fontSize: 13, fontWeight: 700 } }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': { color: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06), fontSize: 13 },
                                    '& fieldset': { borderColor: alpha(EAM_COLOR, 0.25) },
                                    '& .MuiOutlinedInput-root:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.5) },
                                  }}
                                />
                              </Box>
                            )
                          })}
                        </Box>
                      )}
                    </Box>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setPeriodDlg(false)} sx={{ color: 'grey.500' }}>Cancelar</Button>
                <Button variant="contained" onClick={savePeriodo}
                  disabled={!newPeriodo.nombre || newPeriodo.horas <= 0 || newPeriodo.desde > newPeriodo.hasta || (newPeriodo.aplica === 'activos' && periodActSel.length === 0)}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: '#27884A' }, fontWeight: 700, borderRadius: '8px' }}>
                  Agregar período
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
