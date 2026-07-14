import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Paper, Chip, Switch,
  TextField, IconButton, Button, Stack, alpha, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Avatar, Card, CardContent, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Link as LinkIcon,
  People as PeopleIcon,
  Tune as TuneIcon,
  MenuBook as CatalogIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  HourglassEmpty as PendingIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Sync as SyncIcon,
  Category as CategoryIcon,
  Save as SaveIcon,
  RestartAlt as RestoreIcon,
  Email as EmailIcon,
  Bolt as BoltIcon,
  Factory as PlantIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'
const TODAY = '2026-07-07'

// Paleta tema claro
const TXT = '#1E293B'
const SUB = '#64748B'
const MUTED = '#94A3B8'
const BORDER = '#E5E7EB'
const SURFACE = '#F8FAFC'

// ── Interfaces ───────────────────────────────────────────────────────────────
type Nivel = 'Alto' | 'Medio' | 'Bajo'

interface CatalogItem {
  id: number
  codigo: string
  nombre: string
  categoria: string
  impacto: Nivel
  responsable: string
  descripcion: string
  usosUltimoMes: number
  creado: string
  actualizado: string
  activo: boolean
  historial: { fecha: string; accion: string; usuario: string }[]
}

interface Catalogo {
  titulo: string
  prefix: string
  metrica: string
  registros: number
  items: CatalogItem[]
}

interface Parametro {
  id: number
  label: string
  descripcion: string
  valor: string
  unidad: string
  categoria: string
  criticidad: 'Alta' | 'Media' | 'Baja'
  activo: boolean
}

interface Integracion {
  id: number
  nombre: string
  sigla: string
  descripcion: string
  estado: 'activo' | 'inactivo' | 'pendiente'
  ultimaSync: string
  activo: boolean
  frecuencia: string
  direccion: 'Bidireccional' | 'Entrada' | 'Salida'
  entidades: string[]
  registrosSync: number
  historialSync: { fecha: string; registros: number; estado: 'OK' | 'Con errores' | 'Pendiente' }[]
}

type RolMES = 'Administrador' | 'Supervisor' | 'Operario' | 'Analista'

interface UsuarioMES {
  id: number
  nombre: string
  email: string
  telefono: string
  cargo: string
  rol: RolMES
  planta: string
  lineas: string[]
  activo: boolean
  ultimaSesion: string
}

// ── Constantes de dominio ─────────────────────────────────────────────────────
const CATEGORIAS = ['Mantenimiento', 'Calidad', 'Proceso', 'Producción', 'Logística', 'Metrología']
const CATEGORIAS_PARAM = ['OEE', 'Calidad', 'Producción', 'Inventario', 'Tiempos']
const CRITICIDADES: Parametro['criticidad'][] = ['Alta', 'Media', 'Baja']
const NIVELES: Nivel[] = ['Alto', 'Medio', 'Bajo']
const PLANTAS = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla']
const LINEAS = ['Todas', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6']
const ROLES: RolMES[] = ['Administrador', 'Supervisor', 'Analista', 'Operario']
const FRECUENCIAS = ['Tiempo real', 'Cada 15 min', 'Cada 30 min', 'Cada hora', 'Diaria', '—']
const DIRECCIONES: Integracion['direccion'][] = ['Bidireccional', 'Entrada', 'Salida']
const UNIDADES = ['%', 'min', 'h', 'un', 'defectos', 'rechazos', 'días', 'COP']

const permisosDe = (rol: RolMES): string[] =>
  ({
    Administrador: ['Configuración total', 'Gestión de usuarios', 'Reportes ejecutivos', 'Aprobaciones'],
    Supervisor: ['Gestión de OP', 'Reportes de línea', 'Registro de paros', 'Liberación de lotes'],
    Analista: ['Reportes', 'Análisis OEE', 'Exportar datos', 'Tableros'],
    Operario: ['Registro de producción', 'Registro de paros'],
  })[rol]

// ── Mock Data (enriquecido) ────────────────────────────────────────────────────
type RawItem = [string, string, Nivel, string, boolean]

const CAT_DEFS: { titulo: string; prefix: string; registros: number; metrica: string; items: RawItem[] }[] = [
  {
    titulo: 'Motivos de Parada', prefix: 'MP', registros: 18, metrica: 'eventos de parada',
    items: [
      ['Mantenimiento Correctivo', 'Mantenimiento', 'Alto', 'Carlos Mendoza', true],
      ['Mantenimiento Preventivo', 'Mantenimiento', 'Medio', 'Carlos Mendoza', true],
      ['Falta de Material', 'Logística', 'Alto', 'Luisa Fernanda Torres', true],
      ['Cambio de Referencia (Changeover)', 'Proceso', 'Medio', 'Andrés Felipe Ríos', true],
      ['Avería Eléctrica', 'Mantenimiento', 'Alto', 'Carlos Mendoza', false],
    ],
  },
  {
    titulo: 'Tipos de Defecto', prefix: 'TD', registros: 24, metrica: 'no conformidades',
    items: [
      ['Dimensión fuera de tolerancia', 'Calidad', 'Alto', 'María Camila Gómez', true],
      ['Porosidad / Inclusión', 'Calidad', 'Medio', 'María Camila Gómez', true],
      ['Acabado superficial', 'Calidad', 'Bajo', 'María Camila Gómez', true],
      ['Falla en sellado', 'Calidad', 'Alto', 'Luisa Fernanda Torres', true],
      ['Deformación plástica', 'Proceso', 'Medio', 'Andrés Felipe Ríos', false],
    ],
  },
  {
    titulo: 'Causas de Scrap', prefix: 'CS', registros: 12, metrica: 'lotes con scrap',
    items: [
      ['Error de máquina CNC', 'Proceso', 'Alto', 'Andrés Felipe Ríos', true],
      ['Materia prima fuera de spec', 'Calidad', 'Alto', 'María Camila Gómez', true],
      ['Error operario', 'Producción', 'Medio', 'Luisa Fernanda Torres', true],
      ['Desgaste de herramienta', 'Mantenimiento', 'Medio', 'Carlos Mendoza', true],
      ['Temperatura de proceso', 'Proceso', 'Bajo', 'Andrés Felipe Ríos', false],
    ],
  },
  {
    titulo: 'Tipos de Inspección', prefix: 'TI', registros: 9, metrica: 'inspecciones ejecutadas',
    items: [
      ['Inspección 100%', 'Calidad', 'Alto', 'María Camila Gómez', true],
      ['Muestreo AQL 1.0', 'Calidad', 'Medio', 'María Camila Gómez', true],
      ['Muestreo AQL 2.5', 'Calidad', 'Medio', 'Luisa Fernanda Torres', true],
      ['Dimensional por CMM', 'Metrología', 'Alto', 'Andrés Felipe Ríos', true],
      ['Visual subjetiva', 'Calidad', 'Bajo', 'María Camila Gómez', false],
    ],
  },
  {
    titulo: 'Operaciones', prefix: 'OP', registros: 31, metrica: 'órdenes procesadas',
    items: [
      ['Torneado CNC', 'Producción', 'Alto', 'Andrés Felipe Ríos', true],
      ['Fresado', 'Producción', 'Medio', 'Andrés Felipe Ríos', true],
      ['Rectificado', 'Producción', 'Medio', 'Luisa Fernanda Torres', true],
      ['Soldadura MIG', 'Producción', 'Alto', 'Carlos Mendoza', true],
      ['Pintura electrostática', 'Proceso', 'Bajo', 'Andrés Felipe Ríos', false],
    ],
  },
  {
    titulo: 'Actividades', prefix: 'AC', registros: 14, metrica: 'registros generados',
    items: [
      ['Configuración de máquina', 'Proceso', 'Medio', 'Andrés Felipe Ríos', true],
      ['Limpieza de área', 'Producción', 'Bajo', 'Luisa Fernanda Torres', true],
      ['Calibración de instrumento', 'Metrología', 'Alto', 'Andrés Felipe Ríos', true],
      ['Registro de trazabilidad', 'Calidad', 'Medio', 'María Camila Gómez', true],
      ['Inventario de WIP', 'Logística', 'Bajo', 'Luisa Fernanda Torres', false],
    ],
  },
]

const buildItems = (prefix: string, raws: RawItem[]): CatalogItem[] =>
  raws.map(([nombre, categoria, impacto, responsable, activo], i) => ({
    id: i + 1,
    codigo: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    nombre, categoria, impacto, responsable, activo,
    descripcion: `${nombre}: registro del catálogo con categoría ${categoria} e impacto ${impacto.toLowerCase()} sobre la operación. Utilizado por operarios y supervisores al registrar eventos en piso de planta.`,
    usosUltimoMes: activo ? ((i * 13 + 7) % 45) + 3 : 0,
    creado: '2025-11-15',
    actualizado: activo ? '2026-06-18' : '2026-02-10',
    historial: [
      { fecha: '2025-11-15', accion: 'Creación del registro', usuario: responsable },
      activo
        ? { fecha: '2026-06-18', accion: 'Actualización de parámetros', usuario: 'Carlos Mendoza' }
        : { fecha: '2026-02-10', accion: 'Registro desactivado', usuario: 'Carlos Mendoza' },
    ],
  }))

const CATALOGOS_DATA: Catalogo[] = CAT_DEFS.map(d => ({
  titulo: d.titulo, prefix: d.prefix, metrica: d.metrica, registros: d.registros,
  items: buildItems(d.prefix, d.items),
}))

const PARAMETROS_INIT: Parametro[] = [
  { id: 1, label: 'OEE Mínimo aceptable', descripcion: 'Umbral para alerta roja en dashboard ejecutivo', valor: '70', unidad: '%', categoria: 'OEE', criticidad: 'Alta', activo: true },
  { id: 2, label: 'Alerta scrap rate', descripcion: 'Dispara notificación al supervisor de calidad', valor: '3', unidad: '%', categoria: 'Calidad', criticidad: 'Alta', activo: true },
  { id: 3, label: 'Alerta tiempo de parada', descripcion: 'Tiempo sin producción que genera alerta crítica', valor: '30', unidad: 'min', categoria: 'Tiempos', criticidad: 'Alta', activo: true },
  { id: 4, label: 'WIP máximo por celda', descripcion: 'Límite de unidades en proceso simultáneas por celda', valor: '500', unidad: 'un', categoria: 'Inventario', criticidad: 'Media', activo: true },
  { id: 5, label: 'Lead time máximo', descripcion: 'Tiempo total de ciclo esperado por OP en producción', valor: '8', unidad: 'h', categoria: 'Tiempos', criticidad: 'Media', activo: true },
  { id: 6, label: 'Inspección obligatoria si defectos >', descripcion: 'Activa protocolo de inspección 100% al superar umbral', valor: '5', unidad: 'defectos', categoria: 'Calidad', criticidad: 'Alta', activo: true },
  { id: 7, label: 'Bloqueo automático lote si rechazos >', descripcion: 'Congela liberación del lote para revisión de calidad', valor: '2', unidad: 'rechazos', categoria: 'Calidad', criticidad: 'Alta', activo: false },
]

const INTEGRACIONES_INIT: Integracion[] = [
  { id: 1, nombre: 'Enterprise Resource Planning', sigla: 'ERP', descripcion: 'Sync órdenes de producción, listas de materiales y costos', estado: 'activo', ultimaSync: '2026-06-20 08:45', activo: true, frecuencia: 'Cada 15 min', direccion: 'Bidireccional', entidades: ['Órdenes de producción', 'Listas de materiales (BOM)', 'Costos estándar'], registrosSync: 1284, historialSync: [{ fecha: '2026-06-20 08:45', registros: 128, estado: 'OK' }, { fecha: '2026-06-20 08:30', registros: 96, estado: 'OK' }, { fecha: '2026-06-20 08:15', registros: 12, estado: 'Con errores' }] },
  { id: 2, nombre: 'Warehouse Management System', sigla: 'WMS', descripcion: 'Entradas y salidas de inventario de materias primas y PT', estado: 'activo', ultimaSync: '2026-06-20 09:12', activo: true, frecuencia: 'Cada 30 min', direccion: 'Bidireccional', entidades: ['Inventario MP', 'Producto terminado', 'Movimientos WIP'], registrosSync: 932, historialSync: [{ fecha: '2026-06-20 09:12', registros: 74, estado: 'OK' }, { fecha: '2026-06-20 08:42', registros: 68, estado: 'OK' }] },
  { id: 3, nombre: 'Quality Management System', sigla: 'QMS', descripcion: 'Registros de calidad, NCR y planes de control', estado: 'activo', ultimaSync: '2026-06-20 07:30', activo: true, frecuencia: 'Tiempo real', direccion: 'Entrada', entidades: ['NCR', 'Planes de control', 'Resultados de inspección'], registrosSync: 421, historialSync: [{ fecha: '2026-06-20 07:30', registros: 31, estado: 'OK' }, { fecha: '2026-06-20 07:00', registros: 28, estado: 'OK' }] },
  { id: 4, nombre: 'Computerized Maint. Mgmt.', sigla: 'CMMS/EAM', descripcion: 'OTs de mantenimiento, disponibilidad de equipos', estado: 'activo', ultimaSync: '2026-06-20 06:00', activo: true, frecuencia: 'Cada hora', direccion: 'Entrada', entidades: ['Órdenes de trabajo', 'Disponibilidad de equipos', 'Paros por mantenimiento'], registrosSync: 210, historialSync: [{ fecha: '2026-06-20 06:00', registros: 18, estado: 'OK' }, { fecha: '2026-06-20 05:00', registros: 15, estado: 'OK' }] },
  { id: 5, nombre: 'Human Capital Management', sigla: 'HCM', descripcion: 'Turnos, asistencia y horas de operario por celda', estado: 'activo', ultimaSync: '2026-06-20 05:00', activo: true, frecuencia: 'Diaria', direccion: 'Entrada', entidades: ['Turnos', 'Asistencia', 'Horas por celda'], registrosSync: 88, historialSync: [{ fecha: '2026-06-20 05:00', registros: 88, estado: 'OK' }] },
  { id: 6, nombre: 'Transportation Mgmt. System', sigla: 'TMS', descripcion: 'Despachos de producto terminado y OTIF de entrega', estado: 'inactivo', ultimaSync: 'Sin sincronizar', activo: false, frecuencia: '—', direccion: 'Salida', entidades: ['Despachos', 'OTIF'], registrosSync: 0, historialSync: [] },
  { id: 7, nombre: 'Document Mgmt. System', sigla: 'DMS', descripcion: 'Planos, instrucciones de trabajo y formatos digitales', estado: 'inactivo', ultimaSync: 'Sin sincronizar', activo: false, frecuencia: '—', direccion: 'Entrada', entidades: ['Planos', 'Instrucciones de trabajo'], registrosSync: 0, historialSync: [] },
  { id: 8, nombre: 'Governance, Risk & Compliance', sigla: 'GRC', descripcion: 'Auditorías, riesgos de proceso y cumplimiento normativo', estado: 'pendiente', ultimaSync: 'Pendiente configuración', activo: false, frecuencia: '—', direccion: 'Bidireccional', entidades: ['Auditorías', 'Riesgos de proceso'], registrosSync: 0, historialSync: [] },
]

const USUARIOS_DATA: UsuarioMES[] = [
  { id: 1, nombre: 'Carlos Mendoza', email: 'c.mendoza@icoltrans.com.co', telefono: '+57 310 555 0101', cargo: 'Jefe de Producción', rol: 'Administrador', planta: 'Bogotá', lineas: ['Todas'], activo: true, ultimaSesion: '2026-06-20 08:12' },
  { id: 2, nombre: 'Luisa Fernanda Torres', email: 'l.torres@icoltrans.com.co', telefono: '+57 311 555 0102', cargo: 'Supervisora de Línea', rol: 'Supervisor', planta: 'Bogotá', lineas: ['L1', 'L2', 'L3'], activo: true, ultimaSesion: '2026-06-20 07:45' },
  { id: 3, nombre: 'Andrés Felipe Ríos', email: 'a.rios@icoltrans.com.co', telefono: '+57 312 555 0103', cargo: 'Supervisor de Manufactura', rol: 'Supervisor', planta: 'Medellín', lineas: ['L4', 'L5'], activo: true, ultimaSesion: '2026-06-19 16:30' },
  { id: 4, nombre: 'María Camila Gómez', email: 'm.gomez@icoltrans.com.co', telefono: '+57 313 555 0104', cargo: 'Analista de Calidad', rol: 'Analista', planta: 'Bogotá', lineas: ['L1', 'L2'], activo: true, ultimaSesion: '2026-06-20 09:05' },
  { id: 5, nombre: 'Jorge Ernesto Vargas', email: 'j.vargas@icoltrans.com.co', telefono: '+57 314 555 0105', cargo: 'Operario CNC', rol: 'Operario', planta: 'Bogotá', lineas: ['L1'], activo: true, ultimaSesion: '2026-06-20 06:00' },
  { id: 6, nombre: 'Sandra Milena Patiño', email: 's.patino@icoltrans.com.co', telefono: '+57 315 555 0106', cargo: 'Operaria de Ensamble', rol: 'Operario', planta: 'Cali', lineas: ['L6'], activo: true, ultimaSesion: '2026-06-20 05:55' },
  { id: 7, nombre: 'Ricardo Leal', email: 'r.leal@icoltrans.com.co', telefono: '+57 316 555 0107', cargo: 'Analista de Procesos', rol: 'Analista', planta: 'Medellín', lineas: ['L3', 'L4', 'L5'], activo: false, ultimaSesion: '2026-06-10 14:22' },
  { id: 8, nombre: 'Diana Marcela Ortiz', email: 'd.ortiz@icoltrans.com.co', telefono: '+57 317 555 0108', cargo: 'Operaria de Empaque', rol: 'Operario', planta: 'Barranquilla', lineas: ['L2'], activo: true, ultimaSesion: '2026-06-20 06:15' },
]

// ── Color helpers ─────────────────────────────────────────────────────────────
const rolColor = (r: string) =>
  ({ Administrador: '#EF4444', Supervisor: '#F59E0B', Analista: MES_COLOR, Operario: '#32AC5C' })[r] ?? '#9CA3AF'

const integColor = (e: string) =>
  ({ activo: '#32AC5C', inactivo: '#9CA3AF', pendiente: '#F59E0B' })[e] ?? '#9CA3AF'

const integIcon = (e: string) =>
  ({ activo: <ActiveIcon sx={{ fontSize: 14 }} />, inactivo: <InactiveIcon sx={{ fontSize: 14 }} />, pendiente: <PendingIcon sx={{ fontSize: 14 }} /> })[e]

const nivelColor = (n: string) => (/alt/i.test(n) ? '#EF4444' : /med/i.test(n) ? '#F59E0B' : '#32AC5C')

const syncEstadoColor = (e: string) => (e === 'OK' ? '#16A34A' : e === 'Con errores' ? '#DC2626' : '#CA8A04')

// ── Estilos compartidos ─────────────────────────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': { color: TXT },
  '& label': { color: SUB },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.25) },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
  '& .MuiSvgIcon-root': { color: MUTED },
}
const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: MES_COLOR },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: MES_COLOR },
}
const CARD_SX = { bgcolor: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 2 }

// ── Form types ──────────────────────────────────────────────────────────────────
interface CatForm { nombre: string; categoria: string; impacto: Nivel; responsable: string; descripcion: string; activo: boolean }
const EMPTY_CAT: CatForm = { nombre: '', categoria: '', impacto: 'Medio', responsable: '', descripcion: '', activo: true }

interface ParamForm { label: string; descripcion: string; valor: string; unidad: string; categoria: string; criticidad: Parametro['criticidad']; activo: boolean }
const EMPTY_PARAM: ParamForm = { label: '', descripcion: '', valor: '', unidad: '%', categoria: 'OEE', criticidad: 'Media', activo: true }

interface UserForm { nombre: string; email: string; telefono: string; cargo: string; rol: RolMES; planta: string; lineas: string[]; activo: boolean }
const EMPTY_USER: UserForm = { nombre: '', email: '', telefono: '', cargo: '', rol: 'Operario', planta: 'Bogotá', lineas: [], activo: true }

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

// ── Componentes de apoyo ─────────────────────────────────────────────────────────
const InfoTile = ({ label, value, color = TXT }: { label: string; value: React.ReactNode; color?: string }) => (
  <Box sx={{ bgcolor: SURFACE, borderRadius: '8px', p: 1.25 }}>
    <Typography fontSize={10} color={SUB} fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
    <Typography fontSize={13} fontWeight={600} sx={{ color }}>{value}</Typography>
  </Box>
)

const SectionTitle = ({ icon, children, color = MES_COLOR }: { icon: React.ReactNode; children: React.ReactNode; color?: string }) => (
  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Typography fontSize={12} fontWeight={700} color={TXT} textTransform="uppercase" letterSpacing="0.04em">{children}</Typography>
  </Stack>
)

// ── Main Component ────────────────────────────────────────────────────────────
export default function MESConfig() {
  const [tab, setTab] = useState(0)

  // Estado principal
  const [catalogos, setCatalogos] = useState<Catalogo[]>(CATALOGOS_DATA)
  const [parametros, setParametros] = useState<Parametro[]>(PARAMETROS_INIT)
  const [integraciones, setIntegraciones] = useState<Integracion[]>(INTEGRACIONES_INIT)
  const [usuarios, setUsuarios] = useState<UsuarioMES[]>(USUARIOS_DATA)

  // Búsqueda catálogos
  const [searchCat, setSearchCat] = useState<string[]>(CATALOGOS_DATA.map(() => ''))

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>({ open: false, msg: '', sev: 'success' })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'success') => setSnack({ open: true, msg, sev })

  // Confirmación genérica
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; action: () => void }>({ open: false, title: '', message: '', action: () => {} })
  const askConfirm = (title: string, message: string, action: () => void) => setConfirm({ open: true, title, message, action })

  // Derivados
  const usuariosNombres = useMemo(() => usuarios.map(u => u.nombre), [usuarios])
  const plantaByResp = useMemo(() => {
    const m: Record<string, string> = {}
    usuarios.forEach(u => { m[u.nombre] = u.planta })
    return m
  }, [usuarios])

  // ── CATÁLOGOS: detalle / crear / editar ──────────────────────────────────────
  const [catDetail, setCatDetail] = useState<{ catIdx: number; item: CatalogItem } | null>(null)
  const [catDialog, setCatDialog] = useState<{ open: boolean; catIdx: number; editingId: number | null }>({ open: false, catIdx: 0, editingId: null })
  const [catForm, setCatForm] = useState<CatForm>(EMPTY_CAT)
  const [triedCat, setTriedCat] = useState(false)

  const setCatField = (f: keyof CatForm, v: CatForm[keyof CatForm]) => setCatForm(prev => ({ ...prev, [f]: v }))

  const nextCatCodigo = (catIdx: number) => {
    const c = catalogos[catIdx]
    const max = c.items.reduce((m, it) => Math.max(m, parseInt(it.codigo.split('-')[1]) || 0), 0)
    return `${c.prefix}-${String(max + 1).padStart(3, '0')}`
  }

  const openCreateCat = (catIdx: number) => {
    setCatForm(EMPTY_CAT); setTriedCat(false)
    setCatDialog({ open: true, catIdx, editingId: null })
  }
  const openEditCat = (catIdx: number, item: CatalogItem) => {
    setCatForm({ nombre: item.nombre, categoria: item.categoria, impacto: item.impacto, responsable: item.responsable, descripcion: item.descripcion, activo: item.activo })
    setTriedCat(false)
    setCatDialog({ open: true, catIdx, editingId: item.id })
  }
  const handleSaveCat = () => {
    if (!catForm.nombre.trim() || !catForm.categoria) {
      setTriedCat(true)
      notify('Complete los campos obligatorios: nombre y categoría', 'warning')
      return
    }
    const { catIdx, editingId } = catDialog
    setCatalogos(prev => prev.map((c, ci) => {
      if (ci !== catIdx) return c
      if (editingId != null) {
        return {
          ...c,
          items: c.items.map(it => it.id === editingId ? {
            ...it, nombre: catForm.nombre.trim(), categoria: catForm.categoria, impacto: catForm.impacto,
            responsable: catForm.responsable, descripcion: catForm.descripcion.trim() || it.descripcion,
            activo: catForm.activo, actualizado: TODAY,
            historial: [{ fecha: TODAY, accion: 'Edición del registro', usuario: 'Carlos Mendoza' }, ...it.historial],
          } : it),
        }
      }
      const max = c.items.reduce((m, it) => Math.max(m, parseInt(it.codigo.split('-')[1]) || 0), 0)
      const codigo = `${c.prefix}-${String(max + 1).padStart(3, '0')}`
      const newItem: CatalogItem = {
        id: Date.now(), codigo, nombre: catForm.nombre.trim(), categoria: catForm.categoria,
        impacto: catForm.impacto, responsable: catForm.responsable || 'Sin asignar',
        descripcion: catForm.descripcion.trim() || `${catForm.nombre.trim()}: nuevo registro del catálogo ${c.titulo}.`,
        usosUltimoMes: 0, creado: TODAY, actualizado: TODAY, activo: catForm.activo,
        historial: [{ fecha: TODAY, accion: 'Creación del registro', usuario: catForm.responsable || 'Sistema' }],
      }
      return { ...c, items: [newItem, ...c.items], registros: c.registros + 1 }
    }))
    notify(editingId != null ? 'Registro actualizado correctamente' : `Registro creado en ${catalogos[catIdx].titulo}`, 'success')
    setCatDialog(d => ({ ...d, open: false }))
    if (editingId != null && catDetail && catDetail.item.id === editingId) setCatDetail(null)
  }
  const handleDeleteCat = (catIdx: number, item: CatalogItem) => {
    setCatalogos(prev => prev.map((c, ci) => ci === catIdx
      ? { ...c, items: c.items.filter(it => it.id !== item.id), registros: Math.max(0, c.registros - 1) }
      : c))
    if (catDetail && catDetail.item.id === item.id) setCatDetail(null)
    notify(`Registro ${item.codigo} eliminado`, 'warning')
  }

  // ── PARÁMETROS ───────────────────────────────────────────────────────────────
  const [paramDetail, setParamDetail] = useState<Parametro | null>(null)
  const [paramDialog, setParamDialog] = useState<{ open: boolean; editingId: number | null }>({ open: false, editingId: null })
  const [paramForm, setParamForm] = useState<ParamForm>(EMPTY_PARAM)
  const [triedParam, setTriedParam] = useState(false)
  const setParamField = (f: keyof ParamForm, v: ParamForm[keyof ParamForm]) => setParamForm(prev => ({ ...prev, [f]: v }))

  const handleParamSwitch = (id: number, val: boolean) => setParametros(prev => prev.map(p => p.id === id ? { ...p, activo: val } : p))
  const handleParamValor = (id: number, val: string) => setParametros(prev => prev.map(p => p.id === id ? { ...p, valor: val } : p))

  const openCreateParam = () => { setParamForm(EMPTY_PARAM); setTriedParam(false); setParamDialog({ open: true, editingId: null }) }
  const openEditParam = (p: Parametro) => {
    setParamForm({ label: p.label, descripcion: p.descripcion, valor: p.valor, unidad: p.unidad, categoria: p.categoria, criticidad: p.criticidad, activo: p.activo })
    setTriedParam(false); setParamDialog({ open: true, editingId: p.id })
  }
  const handleSaveParam = () => {
    if (!paramForm.label.trim() || paramForm.valor.trim() === '') {
      setTriedParam(true)
      notify('Complete los campos obligatorios: etiqueta y valor', 'warning')
      return
    }
    const { editingId } = paramDialog
    if (editingId != null) {
      setParametros(prev => prev.map(p => p.id === editingId ? { ...p, label: paramForm.label.trim(), descripcion: paramForm.descripcion.trim(), valor: paramForm.valor, unidad: paramForm.unidad, categoria: paramForm.categoria, criticidad: paramForm.criticidad, activo: paramForm.activo } : p))
      notify('Parámetro actualizado', 'success')
      if (paramDetail && paramDetail.id === editingId) setParamDetail(null)
    } else {
      const nextId = Math.max(0, ...parametros.map(p => p.id)) + 1
      setParametros(prev => [...prev, { id: nextId, label: paramForm.label.trim(), descripcion: paramForm.descripcion.trim() || 'Sin descripción.', valor: paramForm.valor, unidad: paramForm.unidad, categoria: paramForm.categoria, criticidad: paramForm.criticidad, activo: paramForm.activo }])
      notify('Parámetro creado correctamente', 'success')
    }
    setParamDialog(d => ({ ...d, open: false }))
  }
  const handleDeleteParam = (p: Parametro) => {
    setParametros(prev => prev.filter(x => x.id !== p.id))
    if (paramDetail && paramDetail.id === p.id) setParamDetail(null)
    notify(`Parámetro "${p.label}" eliminado`, 'warning')
  }

  // ── INTEGRACIONES ────────────────────────────────────────────────────────────
  const [integDetail, setIntegDetail] = useState<Integracion | null>(null)
  const [integDialog, setIntegDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [integForm, setIntegForm] = useState<{ frecuencia: string; direccion: Integracion['direccion'] }>({ frecuencia: 'Cada hora', direccion: 'Bidireccional' })

  const handleIntegSwitch = (id: number, val: boolean) =>
    setIntegraciones(prev => prev.map(g => g.id === id ? { ...g, activo: val, estado: val ? 'activo' : 'inactivo' } : g))

  const openConfigInteg = (g: Integracion) => { setIntegForm({ frecuencia: g.frecuencia, direccion: g.direccion }); setIntegDialog({ open: true, id: g.id }) }
  const handleSaveInteg = () => {
    const { id } = integDialog
    setIntegraciones(prev => prev.map(g => g.id === id ? { ...g, frecuencia: integForm.frecuencia, direccion: integForm.direccion } : g))
    notify('Configuración de integración guardada', 'success')
    setIntegDialog(d => ({ ...d, open: false }))
    if (integDetail && integDetail.id === id) setIntegDetail(g => g ? { ...g, frecuencia: integForm.frecuencia, direccion: integForm.direccion } : g)
  }
  const handleSyncNow = (g: Integracion) => {
    if (!g.activo) { notify('Active la integración antes de sincronizar', 'warning'); return }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const nuevos = ((g.id * 7) % 40) + 20
    const updater = (x: Integracion): Integracion => ({
      ...x, ultimaSync: now, registrosSync: x.registrosSync + nuevos,
      historialSync: [{ fecha: now, registros: nuevos, estado: 'OK' as const }, ...x.historialSync].slice(0, 6),
    })
    setIntegraciones(prev => prev.map(x => x.id === g.id ? updater(x) : x))
    if (integDetail && integDetail.id === g.id) setIntegDetail(updater(integDetail))
    notify(`${g.sigla}: sincronización completada (${nuevos} registros)`, 'success')
  }

  // ── USUARIOS ─────────────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('')
  const [filterRol, setFilterRol] = useState('Todos')
  const [filterPlanta, setFilterPlanta] = useState('Todos')
  const [userDetail, setUserDetail] = useState<UsuarioMES | null>(null)
  const [userDialog, setUserDialog] = useState<{ open: boolean; editingId: number | null }>({ open: false, editingId: null })
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER)
  const [triedUser, setTriedUser] = useState(false)
  const setUserField = (f: keyof UserForm, v: UserForm[keyof UserForm]) => setUserForm(prev => ({ ...prev, [f]: v }))

  const handleUserSwitch = (id: number, val: boolean) => setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: val } : u))

  const filteredUsuarios = useMemo(() => usuarios.filter(u => {
    if (filterRol !== 'Todos' && u.rol !== filterRol) return false
    if (filterPlanta !== 'Todos' && u.planta !== filterPlanta) return false
    if (userSearch) {
      const q = userSearch.toLowerCase()
      if (!u.nombre.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.cargo.toLowerCase().includes(q)) return false
    }
    return true
  }), [usuarios, filterRol, filterPlanta, userSearch])

  const openCreateUser = () => { setUserForm(EMPTY_USER); setTriedUser(false); setUserDialog({ open: true, editingId: null }) }
  const openEditUser = (u: UsuarioMES) => {
    setUserForm({ nombre: u.nombre, email: u.email, telefono: u.telefono, cargo: u.cargo, rol: u.rol, planta: u.planta, lineas: u.lineas, activo: u.activo })
    setTriedUser(false); setUserDialog({ open: true, editingId: u.id })
  }
  const handleUserRol = (rol: RolMES) => {
    setUserForm(prev => ({ ...prev, rol, lineas: rol === 'Administrador' ? ['Todas'] : prev.lineas.filter(l => l !== 'Todas') }))
  }
  const handleSaveUser = () => {
    if (!userForm.nombre.trim() || !emailOk(userForm.email) || userForm.lineas.length === 0) {
      setTriedUser(true)
      notify('Complete nombre, email válido y al menos una línea', 'warning')
      return
    }
    const { editingId } = userDialog
    if (editingId != null) {
      setUsuarios(prev => prev.map(u => u.id === editingId ? { ...u, nombre: userForm.nombre.trim(), email: userForm.email.trim(), telefono: userForm.telefono.trim(), cargo: userForm.cargo.trim() || u.cargo, rol: userForm.rol, planta: userForm.planta, lineas: userForm.lineas, activo: userForm.activo } : u))
      notify('Usuario actualizado', 'success')
      if (userDetail && userDetail.id === editingId) setUserDetail(null)
    } else {
      const nextId = Math.max(0, ...usuarios.map(u => u.id)) + 1
      setUsuarios(prev => [{ id: nextId, nombre: userForm.nombre.trim(), email: userForm.email.trim(), telefono: userForm.telefono.trim() || '—', cargo: userForm.cargo.trim() || 'Sin cargo', rol: userForm.rol, planta: userForm.planta, lineas: userForm.lineas, activo: userForm.activo, ultimaSesion: 'Nunca' }, ...prev])
      notify(`Usuario ${userForm.nombre.trim()} creado`, 'success')
    }
    setUserDialog(d => ({ ...d, open: false }))
  }
  const handleDeleteUser = (u: UsuarioMES) => {
    setUsuarios(prev => prev.filter(x => x.id !== u.id))
    if (userDetail && userDetail.id === u.id) setUserDetail(null)
    notify(`Usuario ${u.nombre} eliminado`, 'warning')
  }

  const userFormValid = userForm.nombre.trim() && emailOk(userForm.email) && userForm.lineas.length > 0

  return (
    <Layout>
      <Box sx={{ p: 3, background: SURFACE, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.12), color: MES_COLOR, display: 'flex' }}>
              <SettingsIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_COLOR}>Configuración MES</Typography>
              <Typography variant="body2" sx={{ color: SUB }}>Catálogos, parámetros, integraciones y usuarios del sistema</Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => notify('Exportando configuración MES a Excel...', 'info')}
            sx={{ borderColor: alpha(MES_COLOR, 0.4), color: MES_DARK, borderRadius: '10px', fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}
          >
            Exportar configuración
          </Button>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mt: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: SUB, textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: MES_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
            }}
          >
            {[
              <Stack key={0} direction="row" alignItems="center" spacing={0.7}><CatalogIcon sx={{ fontSize: 16 }} /><span>Catálogos</span></Stack>,
              <Stack key={1} direction="row" alignItems="center" spacing={0.7}><TuneIcon sx={{ fontSize: 16 }} /><span>Parámetros</span></Stack>,
              <Stack key={2} direction="row" alignItems="center" spacing={0.7}><LinkIcon sx={{ fontSize: 16 }} /><span>Integraciones</span></Stack>,
              <Stack key={3} direction="row" alignItems="center" spacing={0.7}><PeopleIcon sx={{ fontSize: 16 }} /><span>Usuarios MES</span></Stack>,
            ].map((label, i) => <Tab key={i} label={label} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: Catálogos ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Grid container spacing={2.5}>
            {catalogos.map((cat, ci) => {
              const filtered = cat.items.filter(it =>
                it.nombre.toLowerCase().includes(searchCat[ci].toLowerCase()) ||
                it.codigo.toLowerCase().includes(searchCat[ci].toLowerCase())
              )
              return (
                <Grid key={ci} size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ ...CARD_SX, height: '100%' }}>
                    <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" color={TXT} fontWeight={700}>{cat.titulo}</Typography>
                          <Typography variant="caption" sx={{ color: SUB }}>{cat.items.length} de {cat.registros} registros</Typography>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => openCreateCat(ci)}
                          sx={{ color: MES_COLOR, textTransform: 'none', fontSize: 12, fontWeight: 600, '&:hover': { background: alpha(MES_COLOR, 0.1) } }}
                        >
                          Agregar
                        </Button>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="Buscar por nombre o código..."
                        value={searchCat[ci]}
                        onChange={e => {
                          const copy = [...searchCat]
                          copy[ci] = e.target.value
                          setSearchCat(copy)
                        }}
                        fullWidth
                        sx={{ mt: 1.5, ...inputSx }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: MUTED }} /></InputAdornment> }}
                      />
                    </Box>
                    <Box sx={{ p: 1 }}>
                      {filtered.map(item => (
                        <Box
                          key={item.id}
                          onClick={() => setCatDetail({ catIdx: ci, item })}
                          sx={{
                            px: 1.5, py: 1, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', transition: 'background 0.15s',
                            '&:hover': { background: alpha(MES_COLOR, 0.06), '& .item-actions': { opacity: 1 } },
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
                            <Chip
                              label={item.activo ? 'ACTIVO' : 'INACTIVO'}
                              size="small"
                              sx={{
                                fontSize: 9, fontWeight: 700, height: 18,
                                background: alpha(item.activo ? '#32AC5C' : '#9CA3AF', 0.15),
                                color: item.activo ? '#16A34A' : '#6B7280',
                              }}
                            />
                            <Box minWidth={0}>
                              <Typography variant="caption" color={TXT} fontWeight={600} noWrap display="block">{item.nombre}</Typography>
                              <Typography variant="caption" sx={{ color: MUTED, fontSize: 10 }}>{item.codigo} · {item.categoria}</Typography>
                            </Box>
                          </Stack>
                          <Stack className="item-actions" direction="row" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                            <Tooltip title="Editar"><IconButton size="small" onClick={e => { e.stopPropagation(); openEditCat(ci, item) }} sx={{ color: MES_COLOR, p: 0.4 }}><EditIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                            <Tooltip title="Eliminar"><IconButton size="small" onClick={e => { e.stopPropagation(); askConfirm('Eliminar registro', `¿Eliminar "${item.nombre}" (${item.codigo}) del catálogo ${cat.titulo}?`, () => handleDeleteCat(ci, item)) }} sx={{ color: '#EF4444', p: 0.4 }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                          </Stack>
                        </Box>
                      ))}
                      {filtered.length === 0 && (
                        <Typography variant="caption" sx={{ color: MUTED, px: 1.5, py: 1, display: 'block' }}>Sin resultados</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        )}

        {/* ── Tab 1: Parámetros ────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <Typography variant="body2" sx={{ color: SUB, flex: '1 1 300px' }}>
                Configure los umbrales y reglas de negocio que controlan alertas, bloqueos y comportamiento automático del MES.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateParam}
                sx={{ textTransform: 'none', background: MES_COLOR, fontWeight: 700, borderRadius: '10px', '&:hover': { background: MES_DARK } }}>
                Nuevo parámetro
              </Button>
            </Stack>
            <Paper sx={CARD_SX}>
              <Stack divider={<Divider sx={{ borderColor: BORDER }} />}>
                {parametros.map(p => (
                  <Box
                    key={p.id}
                    onClick={() => setParamDetail(p)}
                    sx={{ px: 3, py: 2, cursor: 'pointer', '&:hover': { background: SURFACE } }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex' }}>
                        <Switch checked={p.activo} onChange={e => handleParamSwitch(p.id, e.target.checked)} size="small" sx={switchSx} />
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600} color={p.activo ? TXT : MUTED}>{p.label}</Typography>
                          <Chip label={p.categoria} size="small" sx={{ height: 16, fontSize: 9, bgcolor: alpha(MES_COLOR, 0.1), color: MES_DARK }} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: SUB }}>{p.descripcion}</Typography>
                      </Box>
                      <Box onClick={e => e.stopPropagation()}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <TextField
                            size="small" type="number" value={p.valor}
                            onChange={e => handleParamValor(p.id, e.target.value)} disabled={!p.activo}
                            sx={{ width: 90, ...inputSx, '& input': { textAlign: 'center', fontWeight: 700 } }}
                          />
                          <Typography variant="caption" sx={{ color: SUB, width: 56 }}>{p.unidad}</Typography>
                        </Stack>
                      </Box>
                      <Chip
                        label={p.criticidad}
                        size="small"
                        sx={{ background: alpha(nivelColor(p.criticidad), 0.12), color: nivelColor(p.criticidad), fontWeight: 700, fontSize: 10, width: 62 }}
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ p: 2.5, borderTop: `1px solid ${BORDER}` }}>
                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button variant="outlined" size="small" startIcon={<RestoreIcon />}
                    onClick={() => { setParametros(PARAMETROS_INIT); notify('Valores restablecidos a los predeterminados', 'info') }}
                    sx={{ textTransform: 'none', borderColor: BORDER, color: SUB }}>
                    Restablecer valores
                  </Button>
                  <Button variant="contained" size="small" startIcon={<SaveIcon />}
                    onClick={() => notify('Parámetros guardados correctamente', 'success')}
                    sx={{ textTransform: 'none', background: MES_COLOR, '&:hover': { background: MES_DARK } }}>
                    Guardar parámetros
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Box>
        )}

        {/* ── Tab 2: Integraciones ─────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Typography variant="body2" sx={{ color: SUB, mb: 3 }}>
              Gestione las conexiones del MES con los sistemas empresariales. Cada integración sincroniza datos en tiempo real o por lotes programados.
            </Typography>
            <Grid container spacing={2.5}>
              {integraciones.map(g => (
                <Grid key={g.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper
                    onClick={() => setIntegDetail(g)}
                    sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(integColor(g.estado), 0.3)}`, borderRadius: 2, height: '100%', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.10)', transform: 'translateY(-2px)' } }}
                  >
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(integColor(g.estado), 0.12) }}>
                          <Typography variant="h6" fontWeight={800} color={integColor(g.estado)} sx={{ lineHeight: 1 }}>{g.sigla}</Typography>
                        </Box>
                        <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex' }}>
                          <Switch checked={g.activo} onChange={e => handleIntegSwitch(g.id, e.target.checked)} size="small" sx={switchSx} />
                        </Box>
                      </Stack>
                      <Typography variant="body2" fontWeight={700} color={TXT} mb={0.5}>{g.nombre}</Typography>
                      <Typography variant="caption" sx={{ color: SUB, lineHeight: 1.4 }} display="block" mb={1.5}>{g.descripcion}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.7} mb={0.5}>
                        <Box sx={{ color: integColor(g.estado), display: 'flex' }}>{integIcon(g.estado)}</Box>
                        <Chip
                          label={g.estado.charAt(0).toUpperCase() + g.estado.slice(1)}
                          size="small"
                          sx={{ background: alpha(integColor(g.estado), 0.12), color: integColor(g.estado), fontWeight: 700, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" sx={{ color: MUTED }} display="block" mb={1.5}>Últ. sync: {g.ultimaSync}</Typography>
                      <Button
                        size="small" variant="outlined" fullWidth
                        onClick={e => { e.stopPropagation(); openConfigInteg(g) }}
                        sx={{ textTransform: 'none', borderColor: alpha(MES_COLOR, 0.4), color: MES_COLOR, fontSize: 12, fontWeight: 600, '&:hover': { background: alpha(MES_COLOR, 0.08), borderColor: MES_COLOR } }}
                      >
                        Configurar
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Tab 3: Usuarios MES ──────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
              <Typography variant="body2" sx={{ color: SUB }}>
                {usuarios.filter(u => u.activo).length} usuarios activos de {usuarios.length} registrados
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateUser}
                sx={{ textTransform: 'none', background: MES_COLOR, fontWeight: 700, borderRadius: '10px', '&:hover': { background: MES_DARK } }}>
                Agregar Usuario
              </Button>
            </Stack>

            {/* Barra de filtros */}
            <Card sx={{ border: `1px solid ${alpha(MES_COLOR, 0.15)}`, borderRadius: 2, mb: 3 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                  <TextField size="small" placeholder="Buscar por nombre, email o cargo..."
                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    sx={{ minWidth: 240, flex: '1 1 240px', ...inputSx }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: MUTED }} /></InputAdornment> }}
                  />
                  <TextField select size="small" label="Rol" value={filterRol} onChange={e => setFilterRol(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                    <MenuItem value="Todos">Todos</MenuItem>
                    {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Planta" value={filterPlanta} onChange={e => setFilterPlanta(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                    <MenuItem value="Todos">Todas</MenuItem>
                    {PLANTAS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </TextField>
                  <Typography variant="caption" sx={{ color: SUB, fontWeight: 600 }}>
                    {filteredUsuarios.length} de {usuarios.length} usuarios
                  </Typography>
                  {(userSearch || filterRol !== 'Todos' || filterPlanta !== 'Todos') && (
                    <Button size="small" variant="outlined"
                      onClick={() => { setUserSearch(''); setFilterRol('Todos'); setFilterPlanta('Todos') }}
                      sx={{ color: '#EF4444', borderColor: alpha('#EF4444', 0.3), '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11 }}>
                      Limpiar
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Paper sx={CARD_SX}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { color: SUB, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, py: 1.5 } }}>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell align="center">Rol MES</TableCell>
                      <TableCell>Planta</TableCell>
                      <TableCell>Líneas asignadas</TableCell>
                      <TableCell align="center">Activo</TableCell>
                      <TableCell>Última sesión</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsuarios.map(u => (
                      <TableRow
                        key={u.id}
                        onClick={() => setUserDetail(u)}
                        sx={{
                          cursor: 'pointer',
                          '& td': { color: TXT, borderBottom: `1px solid ${BORDER}`, py: 1 },
                          '&:hover': { background: SURFACE },
                          opacity: u.activo ? 1 : 0.55,
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(rolColor(u.rol), 0.15), color: rolColor(u.rol), fontSize: 12, fontWeight: 700 }}>
                              {u.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600} color={TXT}>{u.nombre}</Typography>
                              <Typography variant="caption" sx={{ color: MUTED }}>{u.cargo}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: SUB }}>{u.email}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip label={u.rol} size="small" sx={{ background: alpha(rolColor(u.rol), 0.15), color: rolColor(u.rol), fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: TXT }}>{u.planta}</Typography></TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                            {u.lineas.map((l, li) => (
                              <Chip key={li} label={l} size="small" sx={{ background: alpha(MES_COLOR, 0.12), color: MES_DARK, fontSize: 10, height: 18 }} />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                          <Switch checked={u.activo} onChange={e => handleUserSwitch(u.id, e.target.checked)} size="small" sx={switchSx} />
                        </TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: SUB }}>{u.ultimaSesion}</Typography></TableCell>
                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                          <Stack direction="row" justifyContent="center">
                            <Tooltip title="Editar"><IconButton size="small" onClick={() => openEditUser(u)} sx={{ color: MES_COLOR, p: 0.5 }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                            <Tooltip title="Eliminar"><IconButton size="small" onClick={() => askConfirm('Eliminar usuario', `¿Eliminar a ${u.nombre} del sistema MES?`, () => handleDeleteUser(u))} sx={{ color: '#EF4444', p: 0.5 }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsuarios.length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: MUTED, py: 5, border: 0 }}>No hay usuarios que coincidan con los filtros.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </Box>

      {/* ══ DIALOG: DETALLE DE REGISTRO DE CATÁLOGO ══ */}
      <Dialog open={!!catDetail} onClose={() => setCatDetail(null)} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {catDetail && (() => {
          const { item } = catDetail
          const cat = catalogos[catDetail.catIdx]
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TXT }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CategoryIcon sx={{ color: MES_COLOR }} />
                  </Box>
                  <Box>
                    <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>{item.codigo} · {cat.titulo}</Typography>
                    <Typography fontSize={15} fontWeight={700} color={TXT}>{item.nombre}</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setCatDetail(null)} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: BORDER }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={item.activo ? 'ACTIVO' : 'INACTIVO'} size="small" sx={{ bgcolor: alpha(item.activo ? '#16A34A' : '#9CA3AF', 0.15), color: item.activo ? '#16A34A' : '#6B7280', fontWeight: 700 }} />
                    <Chip label={`Impacto ${item.impacto}`} size="small" sx={{ bgcolor: alpha(nivelColor(item.impacto), 0.12), color: nivelColor(item.impacto), fontWeight: 700 }} />
                    <Chip label={item.categoria} size="small" sx={{ bgcolor: '#F1F5F9', color: SUB }} />
                  </Stack>
                  <Box sx={{ bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                    <Typography fontSize={13} color="#334155">{item.descripcion}</Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="Categoría" value={item.categoria} />
                    <InfoTile label="Impacto" value={item.impacto} color={nivelColor(item.impacto)} />
                    <InfoTile label="Responsable" value={<Stack direction="row" alignItems="center" spacing={0.5}><PersonIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span>{item.responsable}</span></Stack>} />
                    <InfoTile label={`Usos último mes`} value={`${item.usosUltimoMes} ${cat.metrica}`} color={MES_DARK} />
                    <InfoTile label="Creado" value={item.creado} />
                    <InfoTile label="Actualizado" value={item.actualizado} />
                  </Box>
                  <Box>
                    <SectionTitle icon={<HistoryIcon sx={{ fontSize: 16 }} />} color="#8B5CF6">Historial de cambios ({item.historial.length})</SectionTitle>
                    <Stack spacing={1}>
                      {item.historial.map((h, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: SURFACE, borderRadius: '8px', p: 1.25 }}>
                          <Box sx={{ minWidth: 84 }}><Typography fontSize={12} fontWeight={700} color={TXT}>{h.fecha}</Typography></Box>
                          <Typography fontSize={12} color="#334155" sx={{ flex: 1 }}>{h.accion}</Typography>
                          <Chip label={h.usuario} size="small" sx={{ bgcolor: '#F1F5F9', color: SUB, fontSize: '0.65rem' }} />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button startIcon={<DeleteIcon />} onClick={() => askConfirm('Eliminar registro', `¿Eliminar "${item.nombre}" (${item.codigo})?`, () => handleDeleteCat(catDetail.catIdx, item))}
                  sx={{ color: '#EF4444', fontWeight: 600, '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>Eliminar</Button>
                <Button variant="contained" startIcon={<EditIcon />} onClick={() => openEditCat(catDetail.catIdx, item)}
                  sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Editar registro</Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ══ DIALOG: CREAR / EDITAR REGISTRO DE CATÁLOGO ══ */}
      <Dialog open={catDialog.open} onClose={() => setCatDialog(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {catDialog.editingId != null ? <EditIcon sx={{ color: MES_COLOR }} /> : <AddIcon sx={{ color: MES_COLOR }} />}
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={16} color={TXT}>{catDialog.editingId != null ? 'Editar registro' : 'Nuevo registro'}</Typography>
              <Typography fontSize={12} color={SUB}>{catalogos[catDialog.catIdx]?.titulo}</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCatDialog(d => ({ ...d, open: false }))} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Stack spacing={2} mt={0.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Código" value={catDialog.editingId != null ? (catDetail?.item.codigo ?? catForm.nombre) : nextCatCodigo(catDialog.catIdx)}
                InputProps={{ readOnly: true }} sx={{ ...inputSx, flex: '0 0 130px' }} helperText="Automático" />
              <TextField fullWidth size="small" label="Nombre *" value={catForm.nombre}
                onChange={e => setCatField('nombre', e.target.value)} sx={inputSx}
                error={triedCat && !catForm.nombre.trim()} helperText={triedCat && !catForm.nombre.trim() ? 'El nombre es obligatorio' : ' '} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Categoría *" value={catForm.categoria}
                onChange={e => setCatField('categoria', e.target.value)} sx={inputSx}
                error={triedCat && !catForm.categoria} helperText={triedCat && !catForm.categoria ? 'Seleccione una categoría' : ' '}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Impacto" value={catForm.impacto}
                onChange={e => setCatField('impacto', e.target.value as Nivel)} sx={inputSx} helperText=" ">
                {NIVELES.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Responsable" value={catForm.responsable}
                onChange={e => setCatField('responsable', e.target.value)} sx={inputSx} helperText={catForm.responsable ? `Planta: ${plantaByResp[catForm.responsable] ?? '—'}` : 'Se autocompleta la planta'}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {usuariosNombres.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Planta" value={catForm.responsable ? (plantaByResp[catForm.responsable] ?? '—') : ''}
                InputProps={{ readOnly: true }} sx={inputSx} helperText="Derivada del responsable" />
            </Stack>
            <TextField fullWidth size="small" label="Descripción" multiline rows={3} value={catForm.descripcion}
              onChange={e => setCatField('descripcion', e.target.value)} sx={inputSx} placeholder="Detalle del registro, criterios de uso, notas..." />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={catForm.activo} onChange={e => setCatField('activo', e.target.checked)} size="small" sx={switchSx} />
              <Typography variant="body2" sx={{ color: TXT }}>Registro activo</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCatDialog(d => ({ ...d, open: false }))} sx={{ color: SUB, fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={catDialog.editingId != null ? <SaveIcon /> : <AddIcon />} onClick={handleSaveCat}
            disabled={!catForm.nombre.trim() || !catForm.categoria}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            {catDialog.editingId != null ? 'Guardar cambios' : 'Crear registro'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ DIALOG: DETALLE DE PARÁMETRO ══ */}
      <Dialog open={!!paramDetail} onClose={() => setParamDetail(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {paramDetail && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TuneIcon sx={{ color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>{paramDetail.categoria}</Typography>
                  <Typography fontSize={15} fontWeight={700} color={TXT}>{paramDetail.label}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setParamDetail(null)} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: BORDER }}>
              <Stack spacing={2}>
                <Box sx={{ bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={13} color="#334155">{paramDetail.descripcion}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoTile label="Valor configurado" value={`${paramDetail.valor} ${paramDetail.unidad}`} color={MES_DARK} />
                  <InfoTile label="Criticidad" value={paramDetail.criticidad} color={nivelColor(paramDetail.criticidad)} />
                  <InfoTile label="Categoría" value={paramDetail.categoria} />
                  <InfoTile label="Estado" value={paramDetail.activo ? 'Activo' : 'Inactivo'} color={paramDetail.activo ? '#16A34A' : '#6B7280'} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button startIcon={<DeleteIcon />} onClick={() => askConfirm('Eliminar parámetro', `¿Eliminar el parámetro "${paramDetail.label}"?`, () => handleDeleteParam(paramDetail))}
                sx={{ color: '#EF4444', fontWeight: 600, '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>Eliminar</Button>
              <Button variant="contained" startIcon={<EditIcon />} onClick={() => openEditParam(paramDetail)}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Editar parámetro</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══ DIALOG: CREAR / EDITAR PARÁMETRO ══ */}
      <Dialog open={paramDialog.open} onClose={() => setParamDialog(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TuneIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Typography fontWeight={800} fontSize={16} color={TXT}>{paramDialog.editingId != null ? 'Editar parámetro' : 'Nuevo parámetro'}</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setParamDialog(d => ({ ...d, open: false }))} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Stack spacing={2} mt={0.5}>
            <TextField fullWidth size="small" label="Etiqueta del parámetro *" value={paramForm.label}
              onChange={e => setParamField('label', e.target.value)} sx={inputSx}
              error={triedParam && !paramForm.label.trim()} helperText={triedParam && !paramForm.label.trim() ? 'La etiqueta es obligatoria' : ' '} />
            <TextField fullWidth size="small" label="Descripción" multiline rows={2} value={paramForm.descripcion}
              onChange={e => setParamField('descripcion', e.target.value)} sx={inputSx} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" type="number" label="Valor *" value={paramForm.valor}
                onChange={e => setParamField('valor', e.target.value)} sx={inputSx}
                error={triedParam && paramForm.valor.trim() === ''} helperText={triedParam && paramForm.valor.trim() === '' ? 'Ingrese un valor' : ' '} />
              <TextField select fullWidth size="small" label="Unidad" value={paramForm.unidad}
                onChange={e => setParamField('unidad', e.target.value)} sx={inputSx} helperText=" ">
                {UNIDADES.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Categoría" value={paramForm.categoria}
                onChange={e => setParamField('categoria', e.target.value)} sx={inputSx}>
                {CATEGORIAS_PARAM.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Criticidad" value={paramForm.criticidad}
                onChange={e => setParamField('criticidad', e.target.value as Parametro['criticidad'])} sx={inputSx}>
                {CRITICIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={paramForm.activo} onChange={e => setParamField('activo', e.target.checked)} size="small" sx={switchSx} />
              <Typography variant="body2" sx={{ color: TXT }}>Parámetro activo</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setParamDialog(d => ({ ...d, open: false }))} sx={{ color: SUB, fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={paramDialog.editingId != null ? <SaveIcon /> : <AddIcon />} onClick={handleSaveParam}
            disabled={!paramForm.label.trim() || paramForm.valor.trim() === ''}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            {paramDialog.editingId != null ? 'Guardar cambios' : 'Crear parámetro'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ DIALOG: DETALLE DE INTEGRACIÓN ══ */}
      <Dialog open={!!integDetail} onClose={() => setIntegDetail(null)} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {integDetail && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: alpha(integColor(integDetail.estado), 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={800} color={integColor(integDetail.estado)}>{integDetail.sigla}</Typography>
                </Box>
                <Box>
                  <Typography fontSize={13} fontWeight={800} color={integColor(integDetail.estado)}>{integDetail.estado.toUpperCase()}</Typography>
                  <Typography fontSize={15} fontWeight={700} color={TXT}>{integDetail.nombre}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setIntegDetail(null)} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: BORDER }}>
              <Stack spacing={2}>
                <Box sx={{ bgcolor: alpha(MES_COLOR, 0.05), border: `1px solid ${alpha(MES_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={13} color="#334155">{integDetail.descripcion}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Estado" value={integDetail.activo ? 'Activo' : integDetail.estado === 'pendiente' ? 'Pendiente' : 'Inactivo'} color={integColor(integDetail.estado)} />
                  <InfoTile label="Frecuencia" value={integDetail.frecuencia} />
                  <InfoTile label="Dirección" value={integDetail.direccion} />
                  <InfoTile label="Última sync" value={integDetail.ultimaSync} />
                  <InfoTile label="Registros sync" value={integDetail.registrosSync.toLocaleString('es-CO')} color={MES_DARK} />
                  <InfoTile label="Entidades" value={String(integDetail.entidades.length)} />
                </Box>
                <Box>
                  <SectionTitle icon={<LinkIcon sx={{ fontSize: 16 }} />}>Entidades sincronizadas</SectionTitle>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {integDetail.entidades.map(e => <Chip key={e} label={e} size="small" variant="outlined" sx={{ borderColor: '#CBD5E1', color: '#334155', fontSize: '0.7rem' }} />)}
                  </Stack>
                </Box>
                <Box>
                  <SectionTitle icon={<HistoryIcon sx={{ fontSize: 16 }} />} color="#8B5CF6">Historial de sincronización ({integDetail.historialSync.length})</SectionTitle>
                  {integDetail.historialSync.length === 0 ? (
                    <Typography fontSize={12} color={MUTED}>Esta integración no registra sincronizaciones.</Typography>
                  ) : (
                    <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead><TableRow sx={{ bgcolor: alpha(MES_COLOR, 0.06) }}>
                          <TableCell sx={{ color: SUB, borderColor: BORDER, fontWeight: 700, fontSize: 11 }}>Fecha</TableCell>
                          <TableCell sx={{ color: SUB, borderColor: BORDER, fontWeight: 700, fontSize: 11 }} align="right">Registros</TableCell>
                          <TableCell sx={{ color: SUB, borderColor: BORDER, fontWeight: 700, fontSize: 11 }} align="center">Estado</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                          {integDetail.historialSync.map((h, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ color: '#334155', borderColor: BORDER, fontSize: 12 }}>{h.fecha}</TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: BORDER, fontSize: 12 }} align="right">{h.registros}</TableCell>
                              <TableCell sx={{ borderColor: BORDER }} align="center">
                                <Chip label={h.estado} size="small" sx={{ bgcolor: alpha(syncEstadoColor(h.estado), 0.12), color: syncEstadoColor(h.estado), fontWeight: 700, fontSize: '0.65rem' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openConfigInteg(integDetail)}
                sx={{ borderColor: BORDER, color: SUB, borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: '#CBD5E1', bgcolor: alpha(SUB, 0.06) } }}>Configurar</Button>
              <Button variant="contained" startIcon={<SyncIcon />} onClick={() => handleSyncNow(integDetail)}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Sincronizar ahora</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══ DIALOG: CONFIGURAR INTEGRACIÓN ══ */}
      <Dialog open={integDialog.open} onClose={() => setIntegDialog(d => ({ ...d, open: false }))} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
          <Typography fontWeight={800} fontSize={16} color={TXT}>Configurar integración</Typography>
          <IconButton size="small" onClick={() => setIntegDialog(d => ({ ...d, open: false }))} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Stack spacing={2} mt={0.5}>
            <TextField select fullWidth size="small" label="Frecuencia de sincronización" value={integForm.frecuencia}
              onChange={e => setIntegForm(f => ({ ...f, frecuencia: e.target.value }))} sx={inputSx}>
              {FRECUENCIAS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Dirección de datos" value={integForm.direccion}
              onChange={e => setIntegForm(f => ({ ...f, direccion: e.target.value as Integracion['direccion'] }))} sx={inputSx}>
              {DIRECCIONES.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setIntegDialog(d => ({ ...d, open: false }))} sx={{ color: SUB, fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveInteg}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ══ DIALOG: DETALLE DE USUARIO ══ */}
      <Dialog open={!!userDetail} onClose={() => setUserDetail(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        {userDetail && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: alpha(rolColor(userDetail.rol), 0.15), color: rolColor(userDetail.rol), fontWeight: 700 }}>
                  {userDetail.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </Avatar>
                <Box>
                  <Typography fontSize={15} fontWeight={700} color={TXT}>{userDetail.nombre}</Typography>
                  <Typography fontSize={12} color={SUB}>{userDetail.cargo}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setUserDetail(null)} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: BORDER }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={userDetail.rol} size="small" sx={{ bgcolor: alpha(rolColor(userDetail.rol), 0.15), color: rolColor(userDetail.rol), fontWeight: 700 }} />
                  <Chip label={userDetail.activo ? 'ACTIVO' : 'INACTIVO'} size="small" sx={{ bgcolor: alpha(userDetail.activo ? '#16A34A' : '#9CA3AF', 0.15), color: userDetail.activo ? '#16A34A' : '#6B7280', fontWeight: 700 }} />
                  <Chip icon={<PlantIcon sx={{ fontSize: 14 }} />} label={userDetail.planta} size="small" sx={{ bgcolor: '#F1F5F9', color: SUB }} />
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Email" value={<Stack direction="row" alignItems="center" spacing={0.5}><EmailIcon sx={{ fontSize: 14, color: MES_COLOR }} /><span style={{ overflowWrap: 'anywhere' }}>{userDetail.email}</span></Stack>} />
                  <InfoTile label="Teléfono" value={userDetail.telefono} />
                  <InfoTile label="Planta" value={userDetail.planta} />
                  <InfoTile label="Última sesión" value={userDetail.ultimaSesion} />
                </Box>
                <Box>
                  <SectionTitle icon={<CategoryIcon sx={{ fontSize: 16 }} />}>Líneas asignadas</SectionTitle>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {userDetail.lineas.map(l => <Chip key={l} label={l} size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_DARK, fontWeight: 600 }} />)}
                  </Stack>
                </Box>
                <Box>
                  <SectionTitle icon={<BoltIcon sx={{ fontSize: 16 }} />} color="#F59E0B">Permisos del rol</SectionTitle>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {permisosDe(userDetail.rol).map(p => <Chip key={p} label={p} size="small" variant="outlined" sx={{ borderColor: '#CBD5E1', color: '#334155', fontSize: '0.7rem' }} />)}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button startIcon={<DeleteIcon />} onClick={() => askConfirm('Eliminar usuario', `¿Eliminar a ${userDetail.nombre} del sistema MES?`, () => handleDeleteUser(userDetail))}
                sx={{ color: '#EF4444', fontWeight: 600, '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}>Eliminar</Button>
              <Button variant="contained" startIcon={<EditIcon />} onClick={() => openEditUser(userDetail)}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}>Editar usuario</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══ DIALOG: CREAR / EDITAR USUARIO ══ */}
      <Dialog open={userDialog.open} onClose={() => setUserDialog(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Typography fontWeight={800} fontSize={16} color={TXT}>{userDialog.editingId != null ? 'Editar usuario' : 'Nuevo usuario MES'}</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setUserDialog(d => ({ ...d, open: false }))} sx={{ color: SUB }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Stack spacing={2} mt={0.5}>
            <TextField fullWidth size="small" label="Nombre completo *" value={userForm.nombre}
              onChange={e => setUserField('nombre', e.target.value)} sx={inputSx}
              error={triedUser && !userForm.nombre.trim()} helperText={triedUser && !userForm.nombre.trim() ? 'El nombre es obligatorio' : ' '} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Email *" value={userForm.email}
                onChange={e => setUserField('email', e.target.value)} sx={inputSx}
                error={triedUser && !emailOk(userForm.email)} helperText={triedUser && !emailOk(userForm.email) ? 'Ingrese un email válido' : ' '} />
              <TextField fullWidth size="small" label="Teléfono" value={userForm.telefono}
                onChange={e => setUserField('telefono', e.target.value)} sx={inputSx} helperText=" " />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Cargo" value={userForm.cargo}
                onChange={e => setUserField('cargo', e.target.value)} sx={inputSx} placeholder="Ej. Operario CNC" />
              <TextField select fullWidth size="small" label="Rol MES" value={userForm.rol}
                onChange={e => handleUserRol(e.target.value as RolMES)} sx={inputSx}
                helperText={userForm.rol === 'Administrador' ? 'Acceso a todas las líneas' : ' '}>
                {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Planta" value={userForm.planta}
                onChange={e => setUserField('planta', e.target.value)} sx={inputSx}>
                {PLANTAS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Líneas asignadas *" value={userForm.lineas}
                onChange={e => setUserField('lineas', typeof e.target.value === 'string' ? [e.target.value] : (e.target.value as unknown as string[]))}
                disabled={userForm.rol === 'Administrador'}
                SelectProps={{ multiple: true, renderValue: (sel) => (sel as string[]).join(', ') }}
                error={triedUser && userForm.lineas.length === 0}
                helperText={userForm.rol === 'Administrador' ? 'Fijado en "Todas"' : (triedUser && userForm.lineas.length === 0 ? 'Seleccione al menos una' : ' ')}
                sx={inputSx}>
                {LINEAS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={userForm.activo} onChange={e => setUserField('activo', e.target.checked)} size="small" sx={switchSx} />
              <Typography variant="body2" sx={{ color: TXT }}>Usuario activo</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setUserDialog(d => ({ ...d, open: false }))} sx={{ color: SUB, fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={userDialog.editingId != null ? <SaveIcon /> : <AddIcon />} onClick={handleSaveUser}
            disabled={!userFormValid}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            {userDialog.editingId != null ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ DIALOG: CONFIRMACIÓN GENÉRICA ══ */}
      <Dialog open={confirm.open} onClose={() => setConfirm(c => ({ ...c, open: false }))} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha('#EF4444', 0.3)}`, borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: TXT }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha('#EF4444', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: '#EF4444' }} />
          </Box>
          <Typography fontWeight={800} fontSize={16} color={TXT}>{confirm.title}</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: BORDER }}>
          <Typography fontSize={14} color="#334155">{confirm.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirm(c => ({ ...c, open: false }))} sx={{ color: SUB, fontWeight: 600 }}>Cancelar</Button>
          <Button variant="contained" startIcon={<DeleteIcon />}
            onClick={() => { confirm.action(); setConfirm(c => ({ ...c, open: false })) }}
            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: '10px', fontWeight: 700, px: 3 }}>
            Eliminar
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
