import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Grid, Card, CardContent, Divider, LinearProgress,
  TextField, MenuItem, Button, Stack, IconButton, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
} from '@mui/material'
import {
  Science, BarChart, Report, BugReport, CheckCircle,
  Close as CloseIcon, Add as AddIcon, Search as SearchIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK  = '#0E7490'

type Notify = (msg: string, sev?: 'success' | 'info' | 'warning') => void

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultadoInsp = 'APROBADO' | 'RECHAZADO' | 'CONDICIONAL'
type SeveridadNC   = 'MAYOR' | 'MENOR' | 'CRÍTICA'
type EstadoNC      = 'ABIERTA' | 'EN CAPA' | 'CERRADA'
type TipoInsp      = 'INICIO' | 'PROCESO' | 'FINAL' | 'LIBERACIÓN'

interface Inspeccion {
  orden: string; lote: string; tipo: TipoInsp
  inspector: string; fecha: string; muestra: number; defectos: number; resultado: ResultadoInsp
  producto: string; linea: string; turno: string; disposicion: string; observaciones: string
}

interface AccionCapa {
  descripcion: string; responsable: string; estado: 'PENDIENTE' | 'EN PROCESO' | 'COMPLETADA'
}

interface NoConformidad {
  codigo: string; descripcion: string; op: string; linea: string
  severidad: SeveridadNC; estado: EstadoNC; dias: number
  producto: string; responsable: string; fechaDeteccion: string
  causaRaiz: string; disposicion: string; acciones: AccionCapa[]
}

interface DefectoPareto {
  nombre: string; freq: number; pct: number; cumPct: number
}

// ─── Catálogos de dominio (opciones de formularios) ─────────────────────────────
interface ProductoData { codigo: string; nombre: string; linea: string }
const PRODUCTOS_DATA: ProductoData[] = [
  { codigo: 'PRD-A', nombre: 'Envase PET 500ml',            linea: 'L-1' },
  { codigo: 'PRD-B', nombre: 'Tapa rosca 28mm',             linea: 'L-2' },
  { codigo: 'PRD-C', nombre: 'Etiqueta termoencogible',     linea: 'L-3' },
  { codigo: 'PRD-D', nombre: 'Aceite Lubricante 15W-40',    linea: 'L-4' },
  { codigo: 'PRD-E', nombre: 'Pieza metálica A-200',        linea: 'L-1' },
]

const LINEAS       = ['L-1', 'L-2', 'L-3', 'L-4']
const TURNOS       = ['Turno 1 (06:00-14:00)', 'Turno 2 (14:00-22:00)', 'Turno 3 (22:00-06:00)']
const INSPECTORES  = ['Luis Peña', 'Ana Torres', 'Carlos Ruiz', 'María García', 'Pedro López']
const TIPOS_INSP: TipoInsp[]      = ['INICIO', 'PROCESO', 'FINAL', 'LIBERACIÓN']
const RESULTADOS: ResultadoInsp[] = ['APROBADO', 'RECHAZADO', 'CONDICIONAL']
const DISPOSICIONES  = ['Liberar', 'Retrabajar', 'Rechazar / Desechar', 'Concesión', 'Cuarentena']
const SEVERIDADES: SeveridadNC[]  = ['MENOR', 'MAYOR', 'CRÍTICA']
const ESTADOS_NC: EstadoNC[]      = ['ABIERTA', 'EN CAPA', 'CERRADA']
const RESPONSABLES = ['Jefe de Calidad', 'Supervisor de Línea', 'Ing. de Procesos', 'Coordinador CAPA', 'Analista de Laboratorio']

const DISPOSICION_SUGERIDA: Record<ResultadoInsp, string> = {
  APROBADO: 'Liberar', CONDICIONAL: 'Concesión', RECHAZADO: 'Retrabajar',
}

// Catálogo de parámetros medibles (para la ficha de inspección)
const PARAM_SPECS = [
  { nombre: 'Peso neto',           unidad: 'g',  nominal: 500, tol: 5   },
  { nombre: 'Dimensión largo',     unidad: 'mm', nominal: 120, tol: 1.5 },
  { nombre: 'Temperatura sellado', unidad: '°C', nominal: 180, tol: 8   },
  { nombre: 'Viscosidad',          unidad: 'cP', nominal: 350, tol: 20  },
]

interface ParamMedido {
  nombre: string; unidad: string; especificacion: string; medido: number; resultado: 'CONFORME' | 'NO CONFORME'
}

// Genera parámetros medidos deterministas y coherentes con los defectos de la inspección
function buildParametros(insp: Inspeccion): ParamMedido[] {
  const seed = parseInt(insp.orden.replace(/\D/g, '').slice(-3)) || 1
  return PARAM_SPECS.map((s, i) => {
    const swing = (((seed * (i + 3)) % 7) - 3) / 3            // ~ -1 .. +1
    const outFactor = insp.defectos > 0 && i < insp.defectos ? 1.6 : 0.55
    const medidoRaw = s.nominal + swing * s.tol * outFactor
    const medido = Math.round(medidoRaw * 100) / 100
    const dentro = medido >= s.nominal - s.tol && medido <= s.nominal + s.tol
    return {
      nombre: s.nombre, unidad: s.unidad,
      especificacion: `${s.nominal} ± ${s.tol}`,
      medido,
      resultado: dentro ? 'CONFORME' : 'NO CONFORME',
    }
  })
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INSPECCIONES_MOCK: Inspeccion[] = [
  { orden: 'OP-2024-0812', lote: 'LT-4421', tipo: 'INICIO',     inspector: 'Luis Peña',    fecha: '20/06/2024 07:15', muestra: 50,  defectos: 0, resultado: 'APROBADO',    producto: 'Envase PET 500ml',         linea: 'L-1', turno: TURNOS[0], disposicion: 'Liberar',   observaciones: 'Arranque de línea sin novedades.' },
  { orden: 'OP-2024-0813', lote: 'LT-4422', tipo: 'PROCESO',    inspector: 'Ana Torres',   fecha: '20/06/2024 08:30', muestra: 30,  defectos: 1, resultado: 'CONDICIONAL', producto: 'Tapa rosca 28mm',          linea: 'L-2', turno: TURNOS[0], disposicion: 'Concesión', observaciones: 'Un defecto menor cosmético, se libera bajo concesión.' },
  { orden: 'OP-2024-0814', lote: 'LT-4423', tipo: 'FINAL',      inspector: 'Carlos Ruiz',  fecha: '20/06/2024 09:00', muestra: 80,  defectos: 0, resultado: 'APROBADO',    producto: 'Pieza metálica A-200',     linea: 'L-1', turno: TURNOS[0], disposicion: 'Liberar',   observaciones: 'Todos los parámetros dentro de especificación.' },
  { orden: 'OP-2024-0815', lote: 'LT-4424', tipo: 'LIBERACIÓN', inspector: 'María García', fecha: '20/06/2024 09:45', muestra: 100, defectos: 0, resultado: 'APROBADO',    producto: 'Etiqueta termoencogible',  linea: 'L-3', turno: TURNOS[0], disposicion: 'Liberar',   observaciones: 'Lote liberado para despacho.' },
  { orden: 'OP-2024-0816', lote: 'LT-4425', tipo: 'PROCESO',    inspector: 'Pedro López',  fecha: '20/06/2024 10:10', muestra: 30,  defectos: 4, resultado: 'RECHAZADO',   producto: 'Aceite Lubricante 15W-40', linea: 'L-4', turno: TURNOS[0], disposicion: 'Retrabajar', observaciones: 'Viscosidad y peso fuera de rango, se detiene línea.' },
  { orden: 'OP-2024-0817', lote: 'LT-4426', tipo: 'INICIO',     inspector: 'Luis Peña',    fecha: '20/06/2024 10:50', muestra: 50,  defectos: 0, resultado: 'APROBADO',    producto: 'Envase PET 500ml',         linea: 'L-1', turno: TURNOS[1], disposicion: 'Liberar',   observaciones: 'Setup validado, OK.' },
  { orden: 'OP-2024-0818', lote: 'LT-4427', tipo: 'FINAL',      inspector: 'Ana Torres',   fecha: '20/06/2024 11:20', muestra: 80,  defectos: 2, resultado: 'RECHAZADO',   producto: 'Tapa rosca 28mm',          linea: 'L-2', turno: TURNOS[1], disposicion: 'Retrabajar', observaciones: 'Dos piezas con dimensión fuera de tolerancia.' },
  { orden: 'OP-2024-0819', lote: 'LT-4428', tipo: 'PROCESO',    inspector: 'Carlos Ruiz',  fecha: '20/06/2024 12:00', muestra: 30,  defectos: 0, resultado: 'APROBADO',    producto: 'Pieza metálica A-200',     linea: 'L-1', turno: TURNOS[1], disposicion: 'Liberar',   observaciones: 'Proceso estable.' },
  { orden: 'OP-2024-0820', lote: 'LT-4429', tipo: 'LIBERACIÓN', inspector: 'María García', fecha: '20/06/2024 13:15', muestra: 100, defectos: 3, resultado: 'RECHAZADO',   producto: 'Aceite Lubricante 15W-40', linea: 'L-4', turno: TURNOS[1], disposicion: 'Cuarentena', observaciones: 'Lote enviado a cuarentena pendiente de análisis.' },
  { orden: 'OP-2024-0821', lote: 'LT-4430', tipo: 'INICIO',     inspector: 'Pedro López',  fecha: '20/06/2024 14:00', muestra: 50,  defectos: 0, resultado: 'APROBADO',    producto: 'Etiqueta termoencogible',  linea: 'L-3', turno: TURNOS[1], disposicion: 'Liberar',   observaciones: 'Arranque sin observaciones.' },
]

const spcPuntos = [10.2, 10.4, 9.9, 10.1, 10.3, 9.8, 10.5, 10.2, 10.6, 10.1, 9.7, 10.2, 10.3, 10.0, 10.1, 10.4, 10.8, 10.2, 9.9, 10.1]
const UCL = 10.7; const LCL = 9.6; const CL = 10.15

const NC_MOCK: NoConformidad[] = [
  { codigo: 'NC-2024-041', descripcion: 'Dimensión fuera de tolerancia en pieza A',   op: 'OP-2024-0790', linea: 'L-1', severidad: 'MAYOR',   estado: 'ABIERTA',  dias: 8,  producto: 'Pieza metálica A-200',     responsable: 'Supervisor de Línea', fechaDeteccion: '2024-06-12', causaRaiz: 'Desgaste de herramienta de corte', disposicion: 'Retrabajar', acciones: [ { descripcion: 'Contención: segregar lote afectado', responsable: 'Supervisor de Línea', estado: 'COMPLETADA' }, { descripcion: 'Reemplazo de herramienta de corte', responsable: 'Ing. de Procesos', estado: 'EN PROCESO' } ] },
  { codigo: 'NC-2024-042', descripcion: 'Contaminación partículas metálicas lote B',  op: 'OP-2024-0795', linea: 'L-2', severidad: 'CRÍTICA', estado: 'EN CAPA',  dias: 12, producto: 'Tapa rosca 28mm',          responsable: 'Jefe de Calidad',     fechaDeteccion: '2024-06-08', causaRaiz: 'Falla en filtro de línea de alimentación', disposicion: 'Rechazar / Desechar', acciones: [ { descripcion: 'Bloqueo y retiro del lote del mercado', responsable: 'Jefe de Calidad', estado: 'COMPLETADA' }, { descripcion: 'Instalar filtro redundante', responsable: 'Ing. de Procesos', estado: 'EN PROCESO' }, { descripcion: 'Verificación de efectividad', responsable: 'Coordinador CAPA', estado: 'PENDIENTE' } ] },
  { codigo: 'NC-2024-043', descripcion: 'Peso de producto fuera de rango mínimo',     op: 'OP-2024-0801', linea: 'L-3', severidad: 'MENOR',   estado: 'ABIERTA',  dias: 3,  producto: 'Etiqueta termoencogible',  responsable: 'Analista de Laboratorio', fechaDeteccion: '2024-06-17', causaRaiz: 'Calibración deficiente de báscula', disposicion: 'Concesión', acciones: [ { descripcion: 'Recalibrar báscula de dosificación', responsable: 'Ing. de Procesos', estado: 'PENDIENTE' } ] },
  { codigo: 'NC-2024-044', descripcion: 'Defecto superficial en empaque primario',    op: 'OP-2024-0805', linea: 'L-1', severidad: 'MENOR',   estado: 'CERRADA',  dias: 15, producto: 'Envase PET 500ml',         responsable: 'Supervisor de Línea', fechaDeteccion: '2024-06-05', causaRaiz: 'Contaminación en molde de inyección', disposicion: 'Retrabajar', acciones: [ { descripcion: 'Limpieza de moldes cada turno', responsable: 'Supervisor de Línea', estado: 'COMPLETADA' }, { descripcion: 'Auditoría de efectividad', responsable: 'Coordinador CAPA', estado: 'COMPLETADA' } ] },
  { codigo: 'NC-2024-045', descripcion: 'Viscosidad fuera de especificación lote D',  op: 'OP-2024-0808', linea: 'L-4', severidad: 'MAYOR',   estado: 'EN CAPA',  dias: 6,  producto: 'Aceite Lubricante 15W-40', responsable: 'Analista de Laboratorio', fechaDeteccion: '2024-06-14', causaRaiz: 'Temperatura de mezcla fuera de setpoint', disposicion: 'Cuarentena', acciones: [ { descripcion: 'Ajuste de lazo de control de temperatura', responsable: 'Ing. de Procesos', estado: 'EN PROCESO' } ] },
  { codigo: 'NC-2024-046', descripcion: 'Temperatura proceso excede límite superior', op: 'OP-2024-0811', linea: 'L-2', severidad: 'CRÍTICA', estado: 'ABIERTA',  dias: 2,  producto: 'Tapa rosca 28mm',          responsable: 'Jefe de Calidad',     fechaDeteccion: '2024-06-18', causaRaiz: 'Sensor de temperatura descalibrado', disposicion: 'Cuarentena', acciones: [ { descripcion: 'Parada de línea y verificación de sensor', responsable: 'Supervisor de Línea', estado: 'COMPLETADA' } ] },
]

const defectos: DefectoPareto[] = [
  { nombre: 'Dimensión fuera de rango', freq: 34, pct: 32, cumPct: 32 },
  { nombre: 'Peso incorrecto',          freq: 28, pct: 26, cumPct: 58 },
  { nombre: 'Defecto superficial',      freq: 22, pct: 21, cumPct: 79 },
  { nombre: 'Contaminación',            freq: 12, pct: 11, cumPct: 90 },
  { nombre: 'Empaque dañado',           freq: 10, pct:  9, cumPct: 99 },
]

const causasRaiz: Record<string, { causa: string; accion: string }> = {
  'Dimensión fuera de rango': { causa: 'Desgaste de herramienta de corte',      accion: 'Cambio preventivo cada 500 piezas — en curso' },
  'Peso incorrecto':          { causa: 'Calibración deficiente de báscula',     accion: 'Calibración diaria 06:00 am — implementado' },
  'Defecto superficial':      { causa: 'Contaminación en molde de inyección',   accion: 'Limpieza de moldes cada turno — en revisión' },
  'Contaminación':            { causa: 'Falla en filtro de alimentación',       accion: 'Instalación de filtro redundante — planificado' },
  'Empaque dañado':           { causa: 'Manipulación en transporte interno',    accion: 'Rediseño de estiba — en evaluación' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

function ResultadoChip({ r }: { r: ResultadoInsp }) {
  const map: Record<ResultadoInsp, string> = { APROBADO: '#16a34a', RECHAZADO: '#dc2626', CONDICIONAL: '#d97706' }
  return <Chip label={r} size="small" sx={{ bgcolor: map[r], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function SeveridadChip({ s }: { s: SeveridadNC }) {
  const map: Record<SeveridadNC, string> = { MAYOR: '#ea580c', MENOR: '#2563eb', 'CRÍTICA': '#dc2626' }
  return <Chip label={s} size="small" sx={{ bgcolor: map[s], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function EstadoNCChip({ e }: { e: EstadoNC }) {
  const map: Record<EstadoNC, string> = { ABIERTA: '#dc2626', 'EN CAPA': '#d97706', CERRADA: '#16a34a' }
  return <Chip label={e} size="small" sx={{ bgcolor: map[e], color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function TipoChip({ t }: { t: string }) {
  const map: Record<string, string> = { INICIO: '#7c3aed', PROCESO: MES_COLOR, FINAL: '#16a34a', 'LIBERACIÓN': '#ea580c' }
  return <Chip label={t} size="small" sx={{ bgcolor: map[t] || '#475569', color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

function DetailField({ label, value, mono, color }: { label: string; value: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.25 }}>
      <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: color ?? '#1E293B', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</Typography>
    </Box>
  )
}

// Estilos compartidos para campos de formulario en tema claro
const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B' },
  '& label': { color: '#64748B' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
}

const filterBarSx = { border: '1px solid #E5E7EB', borderRadius: 2, p: 1.5, mb: 2 }

// ─── Tab 0: Inspecciones ──────────────────────────────────────────────────────
const EMPTY_INSP_FORM = {
  producto: '', linea: '', lote: '', tipo: '' as TipoInsp | '', inspector: '',
  turno: '', muestra: '', defectos: '', resultado: '' as ResultadoInsp | '', disposicion: '', observaciones: '',
}

function InspeccionesTab({ notify }: { notify: Notify }) {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>(INSPECCIONES_MOCK)

  // Filtros
  const [search, setSearch]           = useState('')
  const [filterTipo, setFilterTipo]   = useState('Todos')
  const [filterResultado, setFilterResultado] = useState('Todos')

  // Dialogs
  const [detalle, setDetalle] = useState<Inspeccion | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_INSP_FORM)
  const [tried, setTried] = useState(false)

  const setField = (f: keyof typeof form, v: string) => setForm((p) => ({ ...p, [f]: v }))
  const setProducto = (nombre: string) => {
    const p = PRODUCTOS_DATA.find((x) => x.nombre === nombre)
    setForm((prev) => ({ ...prev, producto: nombre, linea: p ? p.linea : prev.linea }))
  }
  const setResultado = (r: string) => {
    setForm((prev) => ({ ...prev, resultado: r as ResultadoInsp, disposicion: DISPOSICION_SUGERIDA[r as ResultadoInsp] ?? prev.disposicion }))
  }

  const resetFiltros = () => { setSearch(''); setFilterTipo('Todos'); setFilterResultado('Todos') }
  const hayFiltros = search || filterTipo !== 'Todos' || filterResultado !== 'Todos'

  const filtered = useMemo(() => inspecciones.filter((i) => {
    if (filterTipo !== 'Todos' && i.tipo !== filterTipo) return false
    if (filterResultado !== 'Todos' && i.resultado !== filterResultado) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.orden.toLowerCase().includes(q) && !i.lote.toLowerCase().includes(q) && !i.producto.toLowerCase().includes(q)) return false
    }
    return true
  }), [inspecciones, filterTipo, filterResultado, search])

  const total = inspecciones.length
  const aprobadas = inspecciones.filter((i) => i.resultado === 'APROBADO').length
  const rechazadas = inspecciones.filter((i) => i.resultado === 'RECHAZADO').length
  const condicionales = inspecciones.filter((i) => i.resultado === 'CONDICIONAL').length
  const fpy = total ? ((aprobadas / total) * 100).toFixed(1) + '%' : '—'

  const kpis = [
    { label: 'Inspecciones hoy', value: String(total), color: MES_COLOR },
    { label: 'Aprobadas',        value: String(aprobadas), color: '#16a34a' },
    { label: 'Rechazadas',       value: String(rechazadas), color: '#dc2626' },
    { label: 'Condicionales',    value: String(condicionales), color: '#d97706' },
    { label: 'First Pass Yield', value: fpy, color: '#7c3aed' },
  ]

  const openCreate = () => { setForm(EMPTY_INSP_FORM); setTried(false); setCreateOpen(true) }
  const formValido = form.producto && form.tipo && form.inspector && form.resultado

  const handleCreate = () => {
    if (!formValido) { setTried(true); notify('Complete los campos obligatorios: producto, tipo, inspector y resultado', 'warning'); return }
    const num = 812 + inspecciones.length
    const now = new Date()
    const p = (x: number) => String(x).padStart(2, '0')
    const nueva: Inspeccion = {
      orden: `OP-2024-0${num}`,
      lote: form.lote || `LT-${4431 + inspecciones.length}`,
      tipo: form.tipo as TipoInsp,
      inspector: form.inspector,
      fecha: `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} ${p(now.getHours())}:${p(now.getMinutes())}`,
      muestra: parseInt(form.muestra) || 0,
      defectos: parseInt(form.defectos) || 0,
      resultado: form.resultado as ResultadoInsp,
      producto: form.producto,
      linea: form.linea || '—',
      turno: form.turno || TURNOS[0],
      disposicion: form.disposicion || DISPOSICION_SUGERIDA[form.resultado as ResultadoInsp],
      observaciones: form.observaciones || 'Sin observaciones.',
    }
    setInspecciones((prev) => [nueva, ...prev])
    setCreateOpen(false)
    notify(`Inspección ${nueva.orden} registrada correctamente`, 'success')
  }

  const parametros = detalle ? buildParametros(detalle) : []
  const noConformes = parametros.filter((p) => p.resultado === 'NO CONFORME').length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        {kpis.map((k) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={k.label}>
            <Card sx={{ border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#64748B', fontSize: 11, mt: 0.5, fontWeight: 600 }}>{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Barra de acciones + filtros */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={2}>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Registro de Inspecciones del Día</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify('Exportando registro de inspecciones a Excel...', 'info')}
              sx={{ borderColor: MES_COLOR, color: MES_COLOR, fontWeight: 700, textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: MES_DARK, bgcolor: `${MES_COLOR}0D` } }}>
              Exportar
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
              Registrar Inspección
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={0} sx={filterBarSx}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" alignItems="center">
            <TextField size="small" placeholder="Buscar por orden, lote o producto..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 240, flex: '1 1 240px', ...inputSx }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }} />
            <TextField select size="small" label="Tipo" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
              {['Todos', ...TIPOS_INSP].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Resultado" value={filterResultado} onChange={(e) => setFilterResultado(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
              {['Todos', ...RESULTADOS].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
            {hayFiltros && (
              <Button size="small" onClick={resetFiltros} variant="outlined"
                sx={{ color: '#EF4444', borderColor: '#EF444455', fontWeight: 600, fontSize: 11, '&:hover': { borderColor: '#EF4444', bgcolor: '#EF44440D' } }}>
                Limpiar
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Tabla inspecciones */}
        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                {['N° Orden', 'Lote', 'Producto', 'Tipo', 'Inspector', 'Fecha', 'Muestra', 'Defectos', 'Resultado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.orden} onClick={() => setDetalle(row)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: MES_COLOR, fontWeight: 700, borderColor: '#E5E7EB', fontFamily: 'monospace', fontSize: 12 }}>{row.orden}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }}>{row.lote}</TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{row.producto}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><TipoChip t={row.tipo} /></TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{row.inspector}</TableCell>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 11, whiteSpace: 'nowrap' }}>{row.fecha}</TableCell>
                  <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', textAlign: 'center', fontSize: 12 }}>{row.muestra}</TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB', textAlign: 'center' }}>
                    <Typography sx={{ color: row.defectos > 0 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>{row.defectos}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}><ResultadoChip r={row.resultado} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', color: '#94a3b8', py: 4, borderColor: '#E5E7EB' }}>No hay inspecciones que coincidan con los filtros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── Dialog detalle inspección ── */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: `1px solid ${MES_COLOR}33` } }}>
        {detalle && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${MES_COLOR}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Science sx={{ fontSize: 18, color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{detalle.orden}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>{detalle.producto} · Lote {detalle.lote}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setDetalle(null)} sx={{ color: '#94a3b8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                {/* Ficha */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.25 }}>
                  <DetailField label="Tipo" value={<TipoChip t={detalle.tipo} />} />
                  <DetailField label="Resultado" value={<ResultadoChip r={detalle.resultado} />} />
                  <DetailField label="Disposición" value={detalle.disposicion} color={MES_DARK} />
                  <DetailField label="Inspector" value={detalle.inspector} />
                  <DetailField label="Línea" value={detalle.linea} mono />
                  <DetailField label="Turno" value={detalle.turno} />
                  <DetailField label="Tamaño muestra" value={`${detalle.muestra} und`} />
                  <DetailField label="Defectos" value={<span style={{ color: detalle.defectos > 0 ? '#ef4444' : '#22c55e' }}>{detalle.defectos}</span>} />
                  <DetailField label="Fecha / hora" value={detalle.fecha} />
                </Box>

                {/* Parámetros medidos vs especificación */}
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>
                    Parámetros medidos vs. especificación
                    <Chip label={`${noConformes} no conforme(s)`} size="small" sx={{ ml: 1, bgcolor: noConformes > 0 ? '#dc262622' : '#16a34a22', color: noConformes > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: 10 }} />
                  </Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Parámetro', 'Especificación', 'Medido', 'Unidad', 'Resultado'].map((h) => (
                            <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parametros.map((p) => (
                          <TableRow key={p.nombre}>
                            <TableCell sx={{ color: '#334155', fontSize: 12, fontWeight: 600, borderColor: '#E5E7EB' }}>{p.nombre}</TableCell>
                            <TableCell sx={{ color: '#64748B', fontSize: 12, borderColor: '#E5E7EB' }}>{p.especificacion}</TableCell>
                            <TableCell sx={{ color: p.resultado === 'CONFORME' ? '#334155' : '#dc2626', fontWeight: 700, fontSize: 12, borderColor: '#E5E7EB' }}>{p.medido}</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontSize: 12, borderColor: '#E5E7EB' }}>{p.unidad}</TableCell>
                            <TableCell sx={{ borderColor: '#E5E7EB' }}>
                              <Chip label={p.resultado} size="small" sx={{ bgcolor: p.resultado === 'CONFORME' ? '#16a34a22' : '#dc262622', color: p.resultado === 'CONFORME' ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 10 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Observaciones */}
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Observaciones</Typography>
                  <Typography sx={{ fontSize: 13, color: '#334155' }}>{detalle.observaciones}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => { notify(`Ficha de ${detalle.orden} enviada a impresión`, 'info') }} sx={{ color: '#64748B', textTransform: 'none' }}>Imprimir ficha</Button>
              <Button variant="contained" onClick={() => setDetalle(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog registrar inspección ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: `1px solid ${MES_COLOR}33` } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, color: '#1E293B' }}>Registrar Inspección de Calidad</Typography>
          <IconButton size="small" onClick={() => setCreateOpen(false)} sx={{ color: '#94a3b8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth size="small" label="Producto *" value={form.producto} onChange={(e) => setProducto(e.target.value)}
                error={tried && !form.producto} helperText={tried && !form.producto ? 'Seleccione el producto' : 'Autocompleta la línea'} sx={inputSx}>
                {PRODUCTOS_DATA.map((p) => <MenuItem key={p.codigo} value={p.nombre}>{p.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField select fullWidth size="small" label="Línea" value={form.linea} onChange={(e) => setField('linea', e.target.value)} sx={inputSx} helperText=" ">
                {LINEAS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Lote" value={form.lote} onChange={(e) => setField('lote', e.target.value)} placeholder="LT-4431" sx={inputSx} helperText=" " />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth size="small" label="Tipo de inspección *" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)}
                error={tried && !form.tipo} helperText={tried && !form.tipo ? 'Seleccione el tipo' : ' '} sx={inputSx}>
                {TIPOS_INSP.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth size="small" label="Inspector *" value={form.inspector} onChange={(e) => setField('inspector', e.target.value)}
                error={tried && !form.inspector} helperText={tried && !form.inspector ? 'Seleccione el inspector' : ' '} sx={inputSx}>
                {INSPECTORES.map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth size="small" label="Turno" value={form.turno} onChange={(e) => setField('turno', e.target.value)} sx={inputSx} helperText=" ">
                {TURNOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Tam. muestra" type="number" value={form.muestra} onChange={(e) => setField('muestra', e.target.value)} sx={inputSx} helperText=" " />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Defectos" type="number" value={form.defectos} onChange={(e) => setField('defectos', e.target.value)} sx={inputSx} helperText=" " />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth size="small" label="Resultado *" value={form.resultado} onChange={(e) => setResultado(e.target.value)}
                error={tried && !form.resultado} helperText={tried && !form.resultado ? 'Seleccione el resultado' : ' '} sx={inputSx}>
                {RESULTADOS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth size="small" label="Disposición" value={form.disposicion} onChange={(e) => setField('disposicion', e.target.value)} sx={inputSx} helperText=" ">
                {DISPOSICIONES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Observaciones" multiline rows={2} value={form.observaciones} onChange={(e) => setField('observaciones', e.target.value)} sx={inputSx} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValido}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: '#0891B255', color: '#fff' }, fontWeight: 700, borderRadius: 2 }}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Tab 1: SPC ───────────────────────────────────────────────────────────────
interface Medicion { num: number; valor: number; desv: string; estado: 'FUERA' | 'EN CONTROL' }

function SPCTab({ notify }: { notify: Notify }) {
  const [variable, setVariable] = useState('Peso')
  const [detalle, setDetalle] = useState<Medicion | null>(null)
  const vars = ['Peso', 'Temperatura', 'Dimensión', 'Viscosidad']

  const min = Math.min(...spcPuntos); const max = Math.max(...spcPuntos)
  const rango = max - min + 0.2
  const toY = (val: number) => ((val - (min - 0.1)) / rango) * 180
  const uclY = toY(UCL); const lclY = toY(LCL); const clY = toY(CL)

  const mediciones: Medicion[] = spcPuntos.slice(-10).map((v, i) => ({
    num: i + 11, valor: v,
    desv: (v - CL).toFixed(3),
    estado: (v > UCL || v < LCL) ? 'FUERA' : 'EN CONTROL',
  }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs SPC */}
      <Grid container spacing={2}>
        {[
          { label: 'Cp', value: '1.42', color: '#16a34a', desc: 'Capacidad proceso' },
          { label: 'Cpk', value: '1.38', color: '#16a34a', desc: 'Capacidad centrada' },
          { label: 'Sigma', value: '3.8σ', color: MES_COLOR, desc: 'Nivel sigma' },
          { label: '% Fuera control', value: '2.1%', color: '#ef4444', desc: '1 de 20 puntos' },
        ].map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Card sx={{ border: `1px solid ${k.color}33`, borderRadius: 2 }}>
              <CardContent sx={{ p: '12px !important' }}>
                <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 30, lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ color: '#1E293B', fontSize: 12, fontWeight: 700 }}>{k.label}</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 11 }}>{k.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Selector variable */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ color: '#64748B', fontWeight: 600 }}>Variable de control:</Typography>
        {vars.map((v) => (
          <Button key={v} size="small" onClick={() => setVariable(v)} variant={variable === v ? 'contained' : 'outlined'}
            sx={{ bgcolor: variable === v ? MES_COLOR : 'transparent', borderColor: MES_COLOR, color: variable === v ? '#fff' : MES_COLOR, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: `${MES_COLOR}22` } }}>{v}</Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={() => notify(`Exportando carta X-bar de ${variable}...`, 'info')}
          sx={{ borderColor: MES_COLOR, color: MES_COLOR, fontWeight: 700, textTransform: 'none', '&:hover': { borderColor: MES_DARK, bgcolor: `${MES_COLOR}0D` } }}>Exportar carta</Button>
      </Box>

      {/* Carta de control */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Carta X-bar — {variable}</Typography>
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            {[
              { label: `UCL = ${UCL}`, color: '#ef4444' },
              { label: `CL = ${CL}`, color: '#22c55e' },
              { label: `LCL = ${LCL}`, color: '#ef4444' },
              { label: 'En control', color: MES_COLOR },
              { label: 'Fuera control', color: '#ef4444' },
            ].map((l) => (
              <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 3, bgcolor: l.color, borderRadius: 1 }} />
                <Typography sx={{ color: '#64748B', fontSize: 11 }}>{l.label}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ position: 'relative', height: 200, bgcolor: '#F8FAFC', borderRadius: 1, px: 2, py: 1, overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: uclY, height: 1, bgcolor: '#ef4444', opacity: 0.8 }} />
            <Typography sx={{ position: 'absolute', right: 4, bottom: uclY + 2, color: '#ef4444', fontSize: 9, fontWeight: 700 }}>UCL</Typography>
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: lclY, height: 1, bgcolor: '#ef4444', opacity: 0.8 }} />
            <Typography sx={{ position: 'absolute', right: 4, bottom: lclY + 2, color: '#ef4444', fontSize: 9, fontWeight: 700 }}>LCL</Typography>
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: clY, height: 1, bgcolor: '#22c55e', opacity: 0.8, borderTop: '1px dashed #22c55e' }} />
            <Typography sx={{ position: 'absolute', right: 4, bottom: clY + 2, color: '#22c55e', fontSize: 9, fontWeight: 700 }}>CL</Typography>

            <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '2px', position: 'relative', zIndex: 1 }}>
              {spcPuntos.map((v, i) => {
                const fuera = v > UCL || v < LCL
                const barH = Math.max(4, toY(v))
                return (
                  <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <Box sx={{ fontSize: 9, color: fuera ? '#ef4444' : '#94a3b8', mb: 0.3, fontWeight: fuera ? 900 : 400 }}>{v}</Box>
                    <Box sx={{ width: '80%', height: `${barH}px`, bgcolor: fuera ? '#ef4444' : MES_COLOR, opacity: fuera ? 1 : 0.75, borderRadius: '3px 3px 0 0', border: fuera ? '1px solid #ef4444' : 'none', transition: 'all 0.2s' }} />
                  </Box>
                )
              })}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>Últimas 20 mediciones — {variable}</Typography>
          </Box>
        </Card>
      </Box>

      {/* Tabla últimas 10 mediciones */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Últimas 10 Mediciones</Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Valor', 'Desviación de CL', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {mediciones.map((m) => (
                <TableRow key={m.num} onClick={() => setDetalle(m)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                  <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB' }}>{m.num}</TableCell>
                  <TableCell sx={{ color: '#334155', fontWeight: 700, borderColor: '#E5E7EB' }}>{m.valor}</TableCell>
                  <TableCell sx={{ color: parseFloat(m.desv) >= 0 ? MES_COLOR : '#f97316', fontWeight: 700, borderColor: '#E5E7EB' }}>
                    {parseFloat(m.desv) >= 0 ? '+' : ''}{m.desv}
                  </TableCell>
                  <TableCell sx={{ borderColor: '#E5E7EB' }}>
                    <Chip label={m.estado} size="small" sx={{ bgcolor: m.estado === 'EN CONTROL' ? '#16a34a22' : '#dc262622', color: m.estado === 'EN CONTROL' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 10, border: `1px solid ${m.estado === 'EN CONTROL' ? '#22c55e44' : '#ef444444'}` }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Dialog detalle medición */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: `1px solid ${MES_COLOR}33` } }}>
        {detalle && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 800, color: '#1E293B' }}>Medición #{detalle.num} — {variable}</Typography>
              <IconButton size="small" onClick={() => setDetalle(null)} sx={{ color: '#94a3b8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                <DetailField label="Valor medido" value={String(detalle.valor)} />
                <DetailField label="Desviación de CL" value={`${parseFloat(detalle.desv) >= 0 ? '+' : ''}${detalle.desv}`} color={parseFloat(detalle.desv) >= 0 ? MES_COLOR : '#f97316'} />
                <DetailField label="Límite superior (UCL)" value={String(UCL)} />
                <DetailField label="Límite inferior (LCL)" value={String(LCL)} />
                <DetailField label="Línea central (CL)" value={String(CL)} />
                <DetailField label="Estado" value={detalle.estado} color={detalle.estado === 'EN CONTROL' ? '#16a34a' : '#dc2626'} />
              </Box>
              <Box sx={{ mt: 2, bgcolor: detalle.estado === 'EN CONTROL' ? '#16a34a11' : '#dc262611', border: `1px solid ${detalle.estado === 'EN CONTROL' ? '#16a34a44' : '#dc262644'}`, borderRadius: 1.5, p: 1.5 }}>
                <Typography sx={{ fontSize: 12, color: detalle.estado === 'EN CONTROL' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {detalle.estado === 'EN CONTROL'
                    ? 'Punto dentro de límites de control. Proceso estable, no requiere acción.'
                    : 'Punto fuera de control. Investigar causa asignable y registrar no conformidad.'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="contained" onClick={() => setDetalle(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Tab 2: No Conformidades ──────────────────────────────────────────────────
const EMPTY_NC_FORM = {
  descripcion: '', producto: '', op: '', linea: '', severidad: '' as SeveridadNC | '',
  estado: 'ABIERTA' as EstadoNC, responsable: '', fechaDeteccion: '', causaRaiz: '', disposicion: '',
}

function NoConformidadesTab({ notify }: { notify: Notify }) {
  const [ncs, setNcs] = useState<NoConformidad[]>(NC_MOCK)
  const [capaStates, setCapaStates] = useState<Record<string, boolean>>({})

  const [search, setSearch] = useState('')
  const [filterSeveridad, setFilterSeveridad] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')

  const [detalle, setDetalle] = useState<NoConformidad | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_NC_FORM)
  const [tried, setTried] = useState(false)

  const setField = (f: keyof typeof form, v: string) => setForm((p) => ({ ...p, [f]: v }))
  const setProducto = (nombre: string) => {
    const p = PRODUCTOS_DATA.find((x) => x.nombre === nombre)
    setForm((prev) => ({ ...prev, producto: nombre, linea: p ? p.linea : prev.linea }))
  }

  const resetFiltros = () => { setSearch(''); setFilterSeveridad('Todos'); setFilterEstado('Todos') }
  const hayFiltros = search || filterSeveridad !== 'Todos' || filterEstado !== 'Todos'

  const filtered = useMemo(() => ncs.filter((nc) => {
    if (filterSeveridad !== 'Todos' && nc.severidad !== filterSeveridad) return false
    if (filterEstado !== 'Todos' && nc.estado !== filterEstado) return false
    if (search) {
      const q = search.toLowerCase()
      if (!nc.codigo.toLowerCase().includes(q) && !nc.descripcion.toLowerCase().includes(q) && !nc.producto.toLowerCase().includes(q)) return false
    }
    return true
  }), [ncs, filterSeveridad, filterEstado, search])

  const totalMes = ncs.length
  const cerradas = ncs.filter((n) => n.estado === 'CERRADA').length
  const abiertas = ncs.filter((n) => n.estado !== 'CERRADA').length
  const tasaCierre = totalMes ? Math.round((cerradas / totalMes) * 100) + '%' : '—'

  const openCreate = () => { setForm(EMPTY_NC_FORM); setTried(false); setCreateOpen(true) }
  const formValido = form.descripcion.trim() && form.producto && form.severidad && form.responsable

  const handleCreate = () => {
    if (!formValido) { setTried(true); notify('Complete los obligatorios: descripción, producto, severidad y responsable', 'warning'); return }
    const num = 41 + ncs.length
    let dias = 0
    if (form.fechaDeteccion) {
      const diff = Date.now() - new Date(form.fechaDeteccion).getTime()
      dias = Math.max(0, Math.floor(diff / 86400000))
    }
    const nueva: NoConformidad = {
      codigo: `NC-2024-0${num}`,
      descripcion: form.descripcion.trim(),
      op: form.op || '—',
      linea: form.linea || '—',
      severidad: form.severidad as SeveridadNC,
      estado: form.estado,
      dias,
      producto: form.producto,
      responsable: form.responsable,
      fechaDeteccion: form.fechaDeteccion || new Date().toISOString().slice(0, 10),
      causaRaiz: form.causaRaiz || 'Por determinar (análisis pendiente)',
      disposicion: form.disposicion || 'Cuarentena',
      acciones: [],
    }
    setNcs((prev) => [nueva, ...prev])
    setCreateOpen(false)
    notify(`No conformidad ${nueva.codigo} registrada`, 'success')
  }

  const generarCapa = (nc: NoConformidad) => {
    setCapaStates((prev) => ({ ...prev, [nc.codigo]: !prev[nc.codigo] }))
    if (!capaStates[nc.codigo]) notify(`CAPA generada para ${nc.codigo}`, 'success')
  }

  const accionColor: Record<AccionCapa['estado'], string> = { PENDIENTE: '#dc2626', 'EN PROCESO': '#d97706', COMPLETADA: '#16a34a' }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Resumen mes */}
      <Card sx={{ border: `1px solid ${MES_COLOR}33`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Resumen del Mes</Typography>
          <Grid container spacing={3}>
            {[
              { label: 'NCs Totales',    value: String(totalMes), color: MES_COLOR },
              { label: 'Cerradas',       value: String(cerradas), color: '#16a34a' },
              { label: 'Abiertas',       value: String(abiertas), color: '#dc2626' },
              { label: 'Tasa de cierre', value: tasaCierre, color: '#d97706' },
            ].map((k) => (
              <Grid size={{ xs: 6, md: 3 }} key={k.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ color: k.color, fontWeight: 900, fontSize: 36, lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 12, fontWeight: 600, mt: 0.5 }}>{k.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Acciones + filtros */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>No Conformidades</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
          Registrar No Conformidad
        </Button>
      </Stack>

      <Paper elevation={0} sx={filterBarSx}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" alignItems="center">
          <TextField size="small" placeholder="Buscar por código, descripción o producto..." value={search}
            onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }} />
          <TextField select size="small" label="Severidad" value={filterSeveridad} onChange={(e) => setFilterSeveridad(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
            {['Todos', ...SEVERIDADES].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estado" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
            {['Todos', ...ESTADOS_NC].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          {hayFiltros && (
            <Button size="small" onClick={resetFiltros} variant="outlined"
              sx={{ color: '#EF4444', borderColor: '#EF444455', fontWeight: 600, fontSize: 11, '&:hover': { borderColor: '#EF4444', bgcolor: '#EF44440D' } }}>Limpiar</Button>
          )}
        </Stack>
      </Paper>

      {/* Cards NC */}
      <Grid container spacing={2}>
        {filtered.map((nc) => (
          <Grid size={{ xs: 12, md: 6 }} key={nc.codigo}>
            <Card onClick={() => setDetalle(nc)} sx={{
              bgcolor: '#FFFFFF', cursor: 'pointer',
              border: `1px solid ${nc.severidad === 'CRÍTICA' ? '#dc2626' : nc.severidad === 'MAYOR' ? '#ea580c' : '#E5E7EB'}44`,
              borderRadius: 2, transition: 'box-shadow 0.15s, border-color 0.15s',
              '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)', borderColor: `${MES_COLOR}66` },
            }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{nc.codigo}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <SeveridadChip s={nc.severidad} />
                    <EstadoNCChip e={nc.estado} />
                  </Box>
                </Box>
                <Typography sx={{ color: '#334155', fontWeight: 600, fontSize: 13, mb: 1 }}>{nc.descripcion}</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Producto: <span style={{ color: '#334155' }}>{nc.producto}</span></Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Línea: <span style={{ color: '#334155' }}>{nc.linea}</span></Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>Días abierta: <span style={{ color: nc.dias > 10 ? '#ef4444' : '#f59e0b' }}>{nc.dias} días</span></Typography>
                </Box>
                {nc.estado !== 'CERRADA' && (
                  <Button size="small" variant={capaStates[nc.codigo] ? 'contained' : 'outlined'}
                    onClick={(e) => { e.stopPropagation(); generarCapa(nc) }}
                    sx={{ borderColor: MES_COLOR, color: capaStates[nc.codigo] ? '#fff' : MES_COLOR, bgcolor: capaStates[nc.codigo] ? MES_COLOR : 'transparent', fontWeight: 700, textTransform: 'none', fontSize: 11, '&:hover': { bgcolor: `${MES_COLOR}22` } }}>
                    {capaStates[nc.codigo] ? '✓ CAPA Generada' : 'Generar CAPA'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 4 }}>No hay no conformidades que coincidan con los filtros.</Typography>
          </Grid>
        )}
      </Grid>

      {/* Dialog detalle NC */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: `1px solid ${MES_COLOR}33` } }}>
        {detalle && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${MES_COLOR}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Report sx={{ fontSize: 18, color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{detalle.codigo}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>{detalle.producto} · {detalle.op}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setDetalle(null)} sx={{ color: '#94a3b8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Descripción</Typography>
                  <Typography sx={{ fontSize: 14, color: '#1E293B', fontWeight: 600 }}>{detalle.descripcion}</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.25 }}>
                  <DetailField label="Severidad" value={<SeveridadChip s={detalle.severidad} />} />
                  <DetailField label="Estado" value={<EstadoNCChip e={detalle.estado} />} />
                  <DetailField label="Disposición" value={detalle.disposicion} color={MES_DARK} />
                  <DetailField label="Línea" value={detalle.linea} mono />
                  <DetailField label="Responsable" value={detalle.responsable} />
                  <DetailField label="Detectada" value={detalle.fechaDeteccion} />
                  <DetailField label="Días abierta" value={`${detalle.dias} días`} color={detalle.dias > 10 ? '#ef4444' : '#f59e0b'} />
                  <DetailField label="Orden asociada" value={detalle.op} mono />
                </Box>
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Causa raíz</Typography>
                  <Typography sx={{ fontSize: 13, color: '#334155' }}>{detalle.causaRaiz}</Typography>
                </Box>

                {/* Plan de acciones CAPA */}
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B', mb: 1 }}>Plan de acciones CAPA ({detalle.acciones.length})</Typography>
                  {detalle.acciones.length === 0 ? (
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Aún no se han definido acciones. Genere una CAPA para iniciar el plan.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {detalle.acciones.map((a, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid #E5E7EB', borderRadius: 1.5, p: 1.25 }}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: accionColor[a.estado], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, flexShrink: 0 }}>{i + 1}</Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{a.descripcion}</Typography>
                            <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Responsable: {a.responsable}</Typography>
                          </Box>
                          <Chip label={a.estado} size="small" sx={{ bgcolor: `${accionColor[a.estado]}22`, color: accionColor[a.estado], fontWeight: 700, fontSize: 10 }} />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              {detalle.estado !== 'CERRADA' && (
                <Button onClick={() => { setNcs((prev) => prev.map((n) => n.codigo === detalle.codigo ? { ...n, estado: 'CERRADA' } : n)); setDetalle({ ...detalle, estado: 'CERRADA' }); notify(`${detalle.codigo} marcada como CERRADA`, 'success') }}
                  sx={{ color: '#16a34a', textTransform: 'none', fontWeight: 700 }}>Cerrar NC</Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" onClick={() => setDetalle(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog registrar NC */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: `1px solid ${MES_COLOR}33` } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, color: '#1E293B' }}>Registrar No Conformidad</Typography>
          <IconButton size="small" onClick={() => setCreateOpen(false)} sx={{ color: '#94a3b8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Descripción *" value={form.descripcion} onChange={(e) => setField('descripcion', e.target.value)}
                error={tried && !form.descripcion.trim()} helperText={tried && !form.descripcion.trim() ? 'Describa la no conformidad' : ' '} sx={inputSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth size="small" label="Producto *" value={form.producto} onChange={(e) => setProducto(e.target.value)}
                error={tried && !form.producto} helperText={tried && !form.producto ? 'Seleccione el producto' : 'Autocompleta la línea'} sx={inputSx}>
                {PRODUCTOS_DATA.map((p) => <MenuItem key={p.codigo} value={p.nombre}>{p.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField select fullWidth size="small" label="Línea" value={form.linea} onChange={(e) => setField('linea', e.target.value)} sx={inputSx} helperText=" ">
                {LINEAS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Orden (OP)" value={form.op} onChange={(e) => setField('op', e.target.value)} placeholder="OP-2024-0812" sx={inputSx} helperText=" " />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField select fullWidth size="small" label="Severidad *" value={form.severidad} onChange={(e) => setField('severidad', e.target.value)}
                error={tried && !form.severidad} helperText={tried && !form.severidad ? 'Seleccione severidad' : ' '} sx={inputSx}>
                {SEVERIDADES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField select fullWidth size="small" label="Estado" value={form.estado} onChange={(e) => setField('estado', e.target.value)} sx={inputSx} helperText=" ">
                {ESTADOS_NC.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth size="small" label="Fecha detección" type="date" value={form.fechaDeteccion} onChange={(e) => setField('fechaDeteccion', e.target.value)}
                InputLabelProps={{ shrink: true }} sx={inputSx} helperText=" " />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth size="small" label="Responsable *" value={form.responsable} onChange={(e) => setField('responsable', e.target.value)}
                error={tried && !form.responsable} helperText={tried && !form.responsable ? 'Seleccione responsable' : ' '} sx={inputSx}>
                {RESPONSABLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth size="small" label="Disposición" value={form.disposicion} onChange={(e) => setField('disposicion', e.target.value)} sx={inputSx} helperText=" ">
                {DISPOSICIONES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Causa raíz (preliminar)" multiline rows={2} value={form.causaRaiz} onChange={(e) => setField('causaRaiz', e.target.value)} sx={inputSx} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValido}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: '#0891B255', color: '#fff' }, fontWeight: 700, borderRadius: 2 }}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Tab 3: Defectología ──────────────────────────────────────────────────────
function DefectologiaTab({ notify }: { notify: Notify }) {
  const maxFreq = Math.max(...defectos.map((d) => d.freq))
  const barColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6']
  const [detalle, setDetalle] = useState<{ d: DefectoPareto; color: string; rank: number } | null>(null)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Pareto */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>Diagrama de Pareto — Tipos de Defecto</Typography>
          <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={() => notify('Exportando análisis de Pareto...', 'info')}
            sx={{ borderColor: MES_COLOR, color: MES_COLOR, fontWeight: 700, textTransform: 'none', '&:hover': { borderColor: MES_DARK, bgcolor: `${MES_COLOR}0D` } }}>Exportar</Button>
        </Stack>
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {defectos.map((d, i) => {
              const barW = (d.freq / maxFreq) * 100
              return (
                <Box key={d.nombre} onClick={() => setDetalle({ d, color: barColors[i], rank: i + 1 })} sx={{ cursor: 'pointer', borderRadius: 1, p: 0.5, '&:hover': { bgcolor: `${MES_COLOR}0A` } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ color: '#334155', fontSize: 13, fontWeight: 600 }}>{d.nombre}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ color: barColors[i], fontWeight: 900, fontSize: 13 }}>{d.freq}</Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: 12, minWidth: 40 }}>{d.pct}%</Typography>
                      <Typography sx={{ color: '#64748b', fontSize: 11, minWidth: 60 }}>acum: {d.cumPct}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative', height: 22, bgcolor: '#E5E7EB', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${barW}%`, bgcolor: barColors[i], opacity: 0.85, borderRadius: 1, transition: 'width 0.4s ease' }} />
                    <Box sx={{ position: 'absolute', top: '50%', left: `${d.cumPct}%`, transform: 'translateX(-50%) translateY(-50%)', width: 2, height: '100%', bgcolor: '#334155', opacity: 0.4 }} />
                  </Box>
                </Box>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Box sx={{ width: 20, height: 2, bgcolor: '#334155', opacity: 0.4, borderTop: '2px dashed #334155' }} />
            <Typography sx={{ color: '#64748b', fontSize: 11 }}>Línea de frecuencia acumulada · haz clic en un defecto para ver el detalle</Typography>
          </Box>
        </Card>
      </Box>

      {/* Tabla Pareto */}
      <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['#', 'Tipo de Defecto', 'Frecuencia', 'Porcentaje', '% Acumulado'].map((h) => (
                <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderColor: '#E5E7EB' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {defectos.map((d, i) => (
              <TableRow key={d.nombre} onClick={() => setDetalle({ d, color: barColors[i], rank: i + 1 })} sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${MES_COLOR}10` } }}>
                <TableCell sx={{ borderColor: '#E5E7EB' }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: barColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 11 }}>{i + 1}</Box>
                </TableCell>
                <TableCell sx={{ color: '#334155', fontWeight: 600, borderColor: '#E5E7EB', fontSize: 13 }}>{d.nombre}</TableCell>
                <TableCell sx={{ color: barColors[i], fontWeight: 900, fontSize: 14, borderColor: '#E5E7EB' }}>{d.freq}</TableCell>
                <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{d.pct}%</TableCell>
                <TableCell sx={{ borderColor: '#E5E7EB' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={d.cumPct} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: '#7c3aed' } }} />
                    <Typography sx={{ color: '#7c3aed', fontSize: 12, fontWeight: 700, minWidth: 36 }}>{d.cumPct}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Causas raíz top 3 */}
      <Box>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Top 3 Causas Raíz y Acciones Correctivas</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {defectos.slice(0, 3).map((d, i) => {
            const cr = causasRaiz[d.nombre]
            return (
              <Card key={d.nombre} sx={{ border: `1px solid ${barColors[i]}33`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: barColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{i + 1}</Box>
                    <Box>
                      <Typography sx={{ color: '#334155', fontWeight: 700, fontSize: 13 }}>{d.nombre}</Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.3 }}>Causa: {cr?.causa ?? '—'}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 14, color: '#22c55e' }} />
                        <Typography sx={{ color: '#22c55e', fontSize: 12 }}>{cr?.accion ?? '—'}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </Box>

      {/* Dialog detalle defecto */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: `1px solid ${MES_COLOR}33` } }}>
        {detalle && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: detalle.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{detalle.rank}</Box>
                <Typography sx={{ fontWeight: 800, color: '#1E293B' }}>{detalle.d.nombre}</Typography>
              </Stack>
              <IconButton size="small" onClick={() => setDetalle(null)} sx={{ color: '#94a3b8' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.25, mb: 2 }}>
                <DetailField label="Frecuencia" value={String(detalle.d.freq)} color={detalle.color} />
                <DetailField label="Porcentaje" value={`${detalle.d.pct}%`} />
                <DetailField label="% Acumulado" value={`${detalle.d.cumPct}%`} color="#7c3aed" />
              </Box>
              <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Causa raíz identificada</Typography>
                <Typography sx={{ fontSize: 13, color: '#334155' }}>{causasRaiz[detalle.d.nombre]?.causa ?? 'Análisis pendiente'}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#16a34a11', border: '1px solid #16a34a44', borderRadius: 1.5, p: 1.5 }}>
                <Typography sx={{ fontSize: 10, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Acción correctiva</Typography>
                <Typography sx={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{causasRaiz[detalle.d.nombre]?.accion ?? 'Por definir'}</Typography>
              </Box>
              <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 1.5 }}>
                {detalle.d.cumPct <= 80 ? 'Este defecto forma parte del 80% acumulado (pocos vitales) — priorizar acción.' : 'Defecto dentro de los muchos triviales según el principio de Pareto.'}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="contained" onClick={() => setDetalle(null)} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: 2 }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MESCalidad() {
  const [tab, setTab] = useState(0)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' })
  const notify: Notify = (msg, sev = 'success') => setSnack({ open: true, msg, sev })

  const tabLabels = ['Inspecciones', 'SPC', 'No Conformidades', 'Defectología']
  const tabIcons = [<CheckCircle />, <BarChart />, <Report />, <BugReport />]

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${MES_COLOR}22`, border: `1px solid ${MES_COLOR}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MES_COLOR }}>
            <Science fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 800, lineHeight: 1 }}>MES — Control de Calidad</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>ICOLTRANS · Inspecciones · SPC · No Conformidades · Defectología</Typography>
          </Box>
        </Box>

        <Divider sx={{ bgcolor: '#E5E7EB', mb: 3 }} />

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

        <TabPanel value={tab} index={0}><InspeccionesTab notify={notify} /></TabPanel>
        <TabPanel value={tab} index={1}><SPCTab notify={notify} /></TabPanel>
        <TabPanel value={tab} index={2}><NoConformidadesTab notify={notify} /></TabPanel>
        <TabPanel value={tab} index={3}><DefectologiaTab notify={notify} /></TabPanel>
      </Box>

      {/* Snackbar global */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
