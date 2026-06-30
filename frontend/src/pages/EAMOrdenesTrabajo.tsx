import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Chip, Button, Tab, Tabs,
  MenuItem, TextField, alpha, Accordion, AccordionSummary, AccordionDetails,
  IconButton, Switch, FormControlLabel, Divider, InputAdornment, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import {
  Add as AddIcon,
  Handyman as OTIcon,
  ExpandMore as ExpandMoreIcon,
  Build as WorkIcon,
  Inventory2 as PartsIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Warning as FaultIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'
const DARK_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'

// ─── Types ───────────────────────────────────────────────────────────────────

type OTEstado = 'PENDIENTE' | 'ASIGNADA' | 'EN_EJECUCION' | 'EN_ESPERA_REPUESTOS' | 'COMPLETADA'
type OTPrioridad = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'
type OTTipo = 'PREVENTIVA' | 'CORRECTIVA' | 'PREDICTIVA' | 'EMERGENCIA'

interface OT {
  id: number
  numero: string
  activo: string
  tipo: OTTipo
  prioridad: OTPrioridad
  estado: OTEstado
  tecnico: string
  fechaReq: string
  costo: string
  diasTranscurridos: number
}

interface KanbanColumn {
  estado: OTEstado
  label: string
  color: string
}

interface OTDialogState {
  open: boolean
  ot: OT | null
  mode: 'view' | 'edit' | 'delete'
  deleteText: string
  editEstado: OTEstado
  editTecnico: string
  editPrioridad: OTPrioridad
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const PRIORIDAD_COLOR: Record<OTPrioridad, string> = {
  URGENTE: '#DC2626',
  ALTA:    EAM_COLOR,
  MEDIA:   '#F59E0B',
  BAJA:    '#6B7280',
}

const TIPO_COLOR: Record<OTTipo, string> = {
  PREVENTIVA: '#16A34A',
  CORRECTIVA: '#DC2626',
  PREDICTIVA: '#3B82F6',
  EMERGENCIA: '#7F1D1D',
}

const ESTADO_COLOR: Record<OTEstado, string> = {
  PENDIENTE:             EAM_COLOR,
  ASIGNADA:              '#3B82F6',
  EN_EJECUCION:          '#16A34A',
  EN_ESPERA_REPUESTOS:   '#F59E0B',
  COMPLETADA:            '#6B7280',
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { estado: 'PENDIENTE',           label: 'PENDIENTE',         color: EAM_COLOR  },
  { estado: 'ASIGNADA',            label: 'ASIGNADA',          color: '#3B82F6'  },
  { estado: 'EN_EJECUCION',        label: 'EN EJECUCIÓN',      color: '#16A34A'  },
  { estado: 'EN_ESPERA_REPUESTOS', label: 'ESP. REPUESTOS',    color: '#F59E0B'  },
  { estado: 'COMPLETADA',          label: 'COMPLETADA',        color: '#6B7280'  },
]

// ─── Mock data ────────────────────────────────────────────────────────────────

const OTS_MOCK: OT[] = [
  // PENDIENTE
  { id:  1, numero: 'OT-2025-0101', activo: 'VH-001 Kenworth T800',      tipo: 'PREVENTIVA', prioridad: 'ALTA',    estado: 'PENDIENTE',           tecnico: 'Jorge Méndez',   fechaReq: '2025-06-25', costo: '$850,000',   diasTranscurridos: 2  },
  { id:  2, numero: 'OT-2025-0102', activo: 'MC-003 Toyota 8FGCU25',     tipo: 'CORRECTIVA', prioridad: 'URGENTE', estado: 'PENDIENTE',           tecnico: 'Sin asignar',    fechaReq: '2025-06-20', costo: '$1,200,000', diasTranscurridos: 0  },
  { id:  3, numero: 'OT-2025-0103', activo: 'CMP-07 Atlas Copco',        tipo: 'PREDICTIVA', prioridad: 'MEDIA',   estado: 'PENDIENTE',           tecnico: 'Sin asignar',    fechaReq: '2025-06-28', costo: '$320,000',   diasTranscurridos: 1  },
  // ASIGNADA
  { id:  4, numero: 'OT-2025-0094', activo: 'CF-001 Compresor Frío',     tipo: 'PREVENTIVA', prioridad: 'ALTA',    estado: 'ASIGNADA',            tecnico: 'Luis Vargas',    fechaReq: '2025-06-22', costo: '$650,000',   diasTranscurridos: 3  },
  { id:  5, numero: 'OT-2025-0095', activo: 'SRV-01 Dell PowerEdge',     tipo: 'CORRECTIVA', prioridad: 'URGENTE', estado: 'ASIGNADA',            tecnico: 'Ana Rojas',      fechaReq: '2025-06-19', costo: '$2,100,000', diasTranscurridos: 1  },
  { id:  6, numero: 'OT-2025-0096', activo: 'VH-002 Freightliner M2',    tipo: 'PREVENTIVA', prioridad: 'MEDIA',   estado: 'ASIGNADA',            tecnico: 'Carlos Díaz',    fechaReq: '2025-06-30', costo: '$480,000',   diasTranscurridos: 4  },
  // EN_EJECUCION
  { id:  7, numero: 'OT-2025-0088', activo: 'MC-001 Yale GLP050',        tipo: 'CORRECTIVA', prioridad: 'ALTA',    estado: 'EN_EJECUCION',        tecnico: 'Jorge Méndez',   fechaReq: '2025-06-18', costo: '$1,800,000', diasTranscurridos: 5  },
  { id:  8, numero: 'OT-2025-0089', activo: 'BD-01 Bodega Principal',    tipo: 'PREVENTIVA', prioridad: 'BAJA',    estado: 'EN_EJECUCION',        tecnico: 'Pedro Torres',   fechaReq: '2025-06-21', costo: '$250,000',   diasTranscurridos: 3  },
  { id:  9, numero: 'OT-2025-0090', activo: 'ELV-02 Still EXU',         tipo: 'EMERGENCIA', prioridad: 'URGENTE', estado: 'EN_EJECUCION',        tecnico: 'Luis Vargas',    fechaReq: '2025-06-19', costo: '$3,400,000', diasTranscurridos: 1  },
  // EN_ESPERA_REPUESTOS
  { id: 10, numero: 'OT-2025-0081', activo: 'VH-003 Ford Ranger',        tipo: 'CORRECTIVA', prioridad: 'ALTA',    estado: 'EN_ESPERA_REPUESTOS', tecnico: 'Carlos Díaz',    fechaReq: '2025-06-15', costo: '$950,000',   diasTranscurridos: 8  },
  { id: 11, numero: 'OT-2025-0082', activo: 'MC-004 Crown RR5200',       tipo: 'CORRECTIVA', prioridad: 'MEDIA',   estado: 'EN_ESPERA_REPUESTOS', tecnico: 'Ana Rojas',      fechaReq: '2025-06-12', costo: '$1,650,000', diasTranscurridos: 11 },
  { id: 12, numero: 'OT-2025-0083', activo: 'CF-001 Evaporador EV-001',  tipo: 'PREDICTIVA', prioridad: 'ALTA',    estado: 'EN_ESPERA_REPUESTOS', tecnico: 'Jorge Méndez',   fechaReq: '2025-06-16', costo: '$780,000',   diasTranscurridos: 7  },
  // COMPLETADA
  { id: 13, numero: 'OT-2025-0074', activo: 'VH-001 Kenworth T800',      tipo: 'PREVENTIVA', prioridad: 'MEDIA',   estado: 'COMPLETADA',          tecnico: 'Luis Vargas',    fechaReq: '2025-06-10', costo: '$850,000',   diasTranscurridos: 10 },
  { id: 14, numero: 'OT-2025-0075', activo: 'MC-003 Toyota 8FGCU25',     tipo: 'PREDICTIVA', prioridad: 'BAJA',    estado: 'COMPLETADA',          tecnico: 'Pedro Torres',   fechaReq: '2025-06-08', costo: '$310,000',   diasTranscurridos: 12 },
  { id: 15, numero: 'OT-2025-0076', activo: 'SRV-01 Dell PowerEdge',     tipo: 'PREVENTIVA', prioridad: 'ALTA',    estado: 'COMPLETADA',          tecnico: 'Ana Rojas',      fechaReq: '2025-06-05', costo: '$500,000',   diasTranscurridos: 15 },
]

const FALLAS_CATALOGO = [
  'Falla eléctrica',
  'Falla mecánica',
  'Fuga de fluidos',
  'Desgaste prematuro',
  'Sobrecalentamiento',
  'Vibración excesiva',
  'Ruido anormal',
  'Pérdida de presión',
  'Corrosión',
  'PM programado',
]

interface CentroCosto {
  codigo: string
  nombre: string
  ciudad: string
  plataforma: string
}

const CENTROS_COSTO: CentroCosto[] = [
  { codigo: 'CC-001', nombre: 'Flota Bogotá',        ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
  { codigo: 'CC-002', nombre: 'Flota Medellín',       ciudad: 'Medellín',  plataforma: 'Plataforma Norte'   },
  { codigo: 'CC-003', nombre: 'Bodega Principal',      ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
  { codigo: 'CC-004', nombre: 'Infraestructura TI',    ciudad: 'Bogotá',    plataforma: 'Corporativo'        },
  { codigo: 'CC-005', nombre: 'Equipos de Frío',       ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
  { codigo: 'CC-006', nombre: 'Montacargas y Grúas',   ciudad: 'Bogotá',    plataforma: 'Plataforma Central' },
]

interface ActivoData {
  nombre: string
  centroCosto: string
  ciudad: string
}

const ACTIVOS_DATA: ActivoData[] = [
  { nombre: 'VH-001 — Tractocamión Kenworth T800',    centroCosto: 'CC-001', ciudad: 'Bogotá'   },
  { nombre: 'VH-002 — Camión Freightliner M2-106',    centroCosto: 'CC-001', ciudad: 'Bogotá'   },
  { nombre: 'VH-003 — Camioneta Ford Ranger',         centroCosto: 'CC-002', ciudad: 'Medellín' },
  { nombre: 'MC-001 — Montacargas Yale GLP050',       centroCosto: 'CC-006', ciudad: 'Bogotá'   },
  { nombre: 'MC-003 — Montacargas Toyota 8FGCU25',   centroCosto: 'CC-006', ciudad: 'Bogotá'   },
  { nombre: 'MC-004 — Reach Truck Crown RR5200',      centroCosto: 'CC-006', ciudad: 'Bogotá'   },
  { nombre: 'CF-001 — Compresor Cuarto Frío',         centroCosto: 'CC-005', ciudad: 'Bogotá'   },
  { nombre: 'CMP-07 — Compresor Atlas Copco GA22',    centroCosto: 'CC-003', ciudad: 'Bogotá'   },
  { nombre: 'SRV-01 — Servidor Dell PowerEdge R740',  centroCosto: 'CC-004', ciudad: 'Bogotá'   },
  { nombre: 'ELV-02 — Estibador Eléctrico Still EXU', centroCosto: 'CC-006', ciudad: 'Bogotá'   },
  { nombre: 'BD-01  — Bodega Principal Bogotá',        centroCosto: 'CC-003', ciudad: 'Bogotá'   },
]

const TECNICOS_SELECT = [
  'Jorge Méndez',
  'Luis Vargas',
  'Ana Rojas',
  'Carlos Díaz',
  'Pedro Torres',
]

const PROVEEDORES_SELECT = [
  'AutoTaller Express S.A.',
  'Cummins Service Center',
  'ElectrAuto Ltda.',
  'HydroTech SAS',
  'Frenos y Suspensión del Valle',
  'Taller Interno Bogotá',
]

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
  PREVENTIVO:  '#16A34A',
  CORRECTIVO:  '#DC2626',
  PREDICTIVO:  '#3B82F6',
  INSPECCION:  '#F59E0B',
  EMERGENCIA:  '#7F1D1D',
}

const TIPOS_TRABAJO_CONFIG: TipoTrabajoConfig[] = [
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

const REPUESTOS_SELECT = [
  'Filtro de aire CUMMINS',
  'Filtro de aceite CUMMINS',
  'Correa de distribución',
  'Bujías NGK iridium',
  'Pastillas de freno Brembo',
  'Aceite sintético 15W-40',
  'Líquido de frenos DOT4',
  'Batería 12V 100Ah',
  'Amortiguador trasero',
  'Correa alternador',
  'Termostato motor',
  'Bomba de agua',
  'Kit de embrague',
  'Disco de freno ventilado',
]

interface TrabajoItem {
  id: number
  trabajo: string
  observaciones: string
  moObra: string
  tipoMant: string
  sistema: string
  subsistema: string
}

interface RepuestoItem {
  id: number
  trabajoId: string
  repuesto: string
  cantidad: string
  precioUnitario: string
}

// ─── OT Card (Kanban) ─────────────────────────────────────────────────────────

function OTCard({ ot, onOpen }: { ot: OT; onOpen: (ot: OT) => void }) {
  return (
    <Paper
      elevation={0}
      onClick={() => onOpen(ot)}
      sx={{
        bgcolor: alpha('#0F1E35', 0.9),
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: '10px',
        p: 1.5,
        mb: 1,
        '&:hover': { border: `1px solid rgba(50,172,92,0.3)`, bgcolor: alpha(EAM_COLOR, 0.04) },
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
        <Typography fontSize={11} fontWeight={700} color={EAM_COLOR}>
          {ot.numero}
        </Typography>
        <Chip
          label={ot.prioridad}
          size="small"
          sx={{
            bgcolor: alpha(PRIORIDAD_COLOR[ot.prioridad], 0.15),
            color: PRIORIDAD_COLOR[ot.prioridad],
            fontWeight: 700,
            fontSize: 9,
            height: 18,
          }}
        />
      </Stack>
      <Typography fontSize={12} color="rgba(255,255,255,0.8)" fontWeight={600} mb={0.5} noWrap>
        {ot.activo}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
        <Chip
          label={ot.tipo}
          size="small"
          sx={{
            bgcolor: alpha(TIPO_COLOR[ot.tipo], 0.15),
            color: TIPO_COLOR[ot.tipo],
            fontWeight: 700,
            fontSize: 9,
            height: 18,
          }}
        />
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontSize={11} color="rgba(255,255,255,0.45)">
          👤 {ot.tecnico}
        </Typography>
        <Typography fontSize={10} color="rgba(255,255,255,0.3)">
          {ot.diasTranscurridos}d
        </Typography>
      </Stack>
    </Paper>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

let _nextId = 1
const nextId = () => _nextId++

export default function EAMOrdenesTrabajo() {
  const [tab, setTab] = useState(0)

  // Lista de OTs en memoria (permite editar/eliminar)
  const [otsList, setOtsList] = useState<OT[]>(OTS_MOCK)

  // Dialog de detalle/edición/eliminación de OT
  const [otDialog, setOtDialog] = useState<OTDialogState>({
    open: false, ot: null, mode: 'view', deleteText: '',
    editEstado: 'PENDIENTE', editTecnico: '', editPrioridad: 'MEDIA',
  })

  const openOTDialog = (ot: OT) =>
    setOtDialog({ open: true, ot, mode: 'view', deleteText: '', editEstado: ot.estado, editTecnico: ot.tecnico, editPrioridad: ot.prioridad })
  const closeOTDialog = () =>
    setOtDialog((p) => ({ ...p, open: false }))
  const toEditMode = () =>
    setOtDialog((p) => ({ ...p, mode: 'edit', editEstado: p.ot!.estado, editTecnico: p.ot!.tecnico, editPrioridad: p.ot!.prioridad }))
  const toDeleteMode = () =>
    setOtDialog((p) => ({ ...p, mode: 'delete', deleteText: '' }))
  const saveOTEdit = () => {
    setOtsList((prev) => prev.map((o) =>
      o.id === otDialog.ot!.id
        ? { ...o, estado: otDialog.editEstado, tecnico: otDialog.editTecnico, prioridad: otDialog.editPrioridad }
        : o
    ))
    setOtDialog((p) => ({
      ...p,
      mode: 'view',
      ot: p.ot ? { ...p.ot, estado: p.editEstado, tecnico: p.editTecnico, prioridad: p.editPrioridad } : p.ot,
    }))
  }
  const deleteOT = () => {
    setOtsList((prev) => prev.filter((o) => o.id !== otDialog.ot!.id))
    closeOTDialog()
  }

  // Tabla filters
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterTipo,   setFilterTipo]   = useState('Todos')
  const [filterPrioridad, setFilterPrioridad] = useState('Todos')

  // Crear OT form
  const [form, setForm] = useState({
    numero:          'OT-2026-0116',
    activo:          '',
    tipo:            'PREVENTIVA',
    prioridad:       'MEDIA',
    descripcion:     '',
    tecnico:         '',
    fechaApertura:   '',
    posibleCierre:   '',
    odometro:        '',
    proveedor:       '',
    centroCosto:     '',
    ciudad:          '',
    afectaDisp:      true,
    esUnaFalla:      false,
    observaciones:   '',
    falla:           '',
  })

  const setField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const setActivo = (nombre: string) => {
    const data = ACTIVOS_DATA.find((a) => a.nombre === nombre)
    setForm((prev) => ({
      ...prev,
      activo: nombre,
      centroCosto: data ? data.centroCosto : prev.centroCosto,
      ciudad:      data ? data.ciudad      : prev.ciudad,
    }))
  }

  // Trabajos y Repuestos
  const [trabajos, setTrabajos] = useState<TrabajoItem[]>([
    { id: nextId(), trabajo: '', observaciones: '', moObra: '', tipoMant: '', sistema: '', subsistema: '' },
  ])
  const [repuestos, setRepuestos] = useState<RepuestoItem[]>([
    { id: nextId(), trabajoId: '', repuesto: '', cantidad: '1', precioUnitario: '' } as RepuestoItem,
  ])
  const [accTrabajos, setAccTrabajos] = useState(true)
  const [accRepuestos, setAccRepuestos] = useState(false)

  const addTrabajo = () =>
    setTrabajos((p) => [...p, { id: nextId(), trabajo: '', observaciones: '', moObra: '', tipoMant: '', sistema: '', subsistema: '' }])
  const removeTrabajo = (id: number) =>
    setTrabajos((p) => p.filter((t) => t.id !== id))
  const setTrabajo = (id: number, field: keyof TrabajoItem, val: string) => {
    if (field === 'trabajo') {
      const cfg = TIPOS_TRABAJO_CONFIG.find((c) => c.nombre === val)
      setTrabajos((p) => p.map((t) => t.id === id ? {
        ...t,
        trabajo: val,
        tipoMant: cfg ? cfg.categoria : '',
        sistema:  cfg ? cfg.sistema   : '',
        subsistema: cfg ? cfg.subsistema : '',
      } : t))
      return
    }
    setTrabajos((p) => p.map((t) => (t.id === id ? { ...t, [field]: val } : t)))
  }

  const addRepuesto = () =>
    setRepuestos((p) => [...p, { id: nextId(), trabajoId: '', repuesto: '', cantidad: '1', precioUnitario: '' } as RepuestoItem])
  const removeRepuesto = (id: number) =>
    setRepuestos((p) => p.filter((r) => r.id !== id))
  const setRepuesto = (id: number, field: keyof RepuestoItem, val: string) =>
    setRepuestos((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)))

  const totalMO = trabajos.reduce((s, t) => s + (parseFloat(t.moObra.replace(/[^0-9.]/g, '')) || 0), 0)
  const totalRep = repuestos.reduce((s, r) => {
    const qty = parseFloat(r.cantidad) || 0
    const prc = parseFloat(r.precioUnitario.replace(/[^0-9.]/g, '')) || 0
    return s + qty * prc
  }, 0)
  const fmt = (n: number) => '$' + n.toLocaleString('es-CO')

  const filteredOTs = otsList.filter((ot) => {
    if (filterEstado !== 'Todos' && ot.estado !== filterEstado) return false
    if (filterTipo   !== 'Todos' && ot.tipo   !== filterTipo)   return false
    if (filterPrioridad !== 'Todos' && ot.prioridad !== filterPrioridad) return false
    return true
  })

  const inputSx = {
    '& .MuiOutlinedInput-root': { bgcolor: CARD_BG, color: '#fff' },
    '& label': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.5)' },
    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
  }

  const inputSxSm = {
    '& .MuiOutlinedInput-root': { bgcolor: alpha('#060C1A', 0.6), color: '#fff', fontSize: 12 },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
    '& input': { py: 0.6 },
  }

  return (
    <>
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: DARK_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <OTIcon sx={{ fontSize: 28, color: EAM_COLOR }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color="#fff" letterSpacing="-0.5px">
                Órdenes de Trabajo
              </Typography>
              <Typography fontSize={13} color="rgba(255,255,255,0.45)">
                Gestión integral de OTs — Kanban, tabla y creación
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTab(2)}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700 }}
          >
            Nueva OT
          </Button>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13 },
            '& .Mui-selected': { color: EAM_COLOR },
            '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
          }}
        >
          <Tab label="Kanban" />
          <Tab label="Tabla" />
          <Tab label="Crear OT" />
        </Tabs>

        {/* ── Tab 0: Kanban ── */}
        {tab === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Stack direction="row" spacing={2} sx={{ minWidth: 1100, pb: 2 }}>
              {KANBAN_COLUMNS.map((col) => {
                const colOTs = otsList.filter((o) => o.estado === col.estado)
                return (
                  <Box
                    key={col.estado}
                    sx={{
                      flex: '1 1 200px',
                      minWidth: 200,
                      bgcolor: alpha(col.color, 0.05),
                      border: `1px solid ${alpha(col.color, 0.2)}`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Column header */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 1.5, py: 1,
                        borderBottom: `1px solid ${alpha(col.color, 0.2)}`,
                        bgcolor: alpha(col.color, 0.1),
                      }}
                    >
                      <Typography fontSize={11} fontWeight={800} color={col.color} letterSpacing="0.5px">
                        {col.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 22, height: 22, borderRadius: '50%',
                          bgcolor: alpha(col.color, 0.2),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Typography fontSize={11} fontWeight={900} color={col.color}>
                          {colOTs.length}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Cards */}
                    <Box sx={{ p: 1.25 }}>
                      {colOTs.map((ot) => (
                        <OTCard key={ot.id} ot={ot} onOpen={openOTDialog} />
                      ))}
                      {colOTs.length === 0 && (
                        <Typography fontSize={12} color="rgba(255,255,255,0.25)" textAlign="center" py={2}>
                          Sin OTs
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Box>
        )}

        {/* ── Tab 1: Tabla ── */}
        {tab === 1 && (
          <Box>
            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                select size="small" label="Estado" value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                sx={{ minWidth: 190, ...inputSx }}
              >
                {['Todos', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_ESPERA_REPUESTOS', 'COMPLETADA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Tipo OT" value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                sx={{ minWidth: 160, ...inputSx }}
              >
                {['Todos', 'PREVENTIVA', 'CORRECTIVA', 'PREDICTIVA', 'EMERGENCIA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Prioridad" value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value)}
                sx={{ minWidth: 150, ...inputSx }}
              >
                {['Todos', 'URGENTE', 'ALTA', 'MEDIA', 'BAJA'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                bgcolor: CARD_BG,
                border: `1px solid rgba(50,172,92,0.25)`,
                borderRadius: '14px',
                overflow: 'auto',
              }}
            >
              {/* Table header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 120px 100px 160px 130px 110px 100px 90px',
                  gap: 1,
                  px: 2, py: 1.25,
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  bgcolor: alpha(EAM_COLOR, 0.06),
                  minWidth: 1000,
                }}
              >
                {['# OT', 'Activo', 'Tipo', 'Prioridad', 'Estado', 'Técnico', 'Fecha Req.', 'Costo'].map((h) => (
                  <Typography key={h} fontSize={11} fontWeight={700} color="rgba(255,255,255,0.4)" letterSpacing="0.5px">
                    {h.toUpperCase()}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ minWidth: 1000 }}>
                {filteredOTs.map((ot, idx) => (
                  <Box
                    key={ot.id}
                    onClick={() => openOTDialog(ot)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 120px 100px 160px 130px 110px 100px',
                      gap: 1,
                      px: 2, py: 1.25,
                      borderBottom: idx < filteredOTs.length - 1
                        ? '1px solid rgba(255,255,255,0.04)'
                        : 'none',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(EAM_COLOR, 0.04) },
                    }}
                  >
                    <Typography fontSize={11} fontWeight={700} color={EAM_COLOR} noWrap>
                      {ot.numero}
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.8)" noWrap>
                      {ot.activo}
                    </Typography>
                    <Chip label={ot.tipo} size="small" sx={{ bgcolor: alpha(TIPO_COLOR[ot.tipo], 0.15), color: TIPO_COLOR[ot.tipo], fontWeight: 700, fontSize: 9, height: 20 }} />
                    <Chip label={ot.prioridad} size="small" sx={{ bgcolor: alpha(PRIORIDAD_COLOR[ot.prioridad], 0.15), color: PRIORIDAD_COLOR[ot.prioridad], fontWeight: 700, fontSize: 9, height: 20 }} />
                    <Chip label={ot.estado.replace(/_/g, ' ')} size="small" sx={{ bgcolor: alpha(ESTADO_COLOR[ot.estado], 0.15), color: ESTADO_COLOR[ot.estado], fontWeight: 700, fontSize: 9, height: 20 }} />
                    <Typography fontSize={12} color="rgba(255,255,255,0.65)" noWrap>{ot.tecnico}</Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.55)">{ot.fechaReq}</Typography>
                    <Typography fontSize={12} fontWeight={600} color="#16A34A">{ot.costo}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* ── Tab 2: Crear OT ── */}
        {tab === 2 && (
          <Box sx={{ maxWidth: 1100 }}>

            {/* ── Encabezado de la OT ── */}
            <Paper elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid rgba(50,172,92,0.25)`, borderRadius: '14px', p: 3, mb: 2 }}>

              {/* Título */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.15) }}>
                    <OTIcon sx={{ fontSize: 22, color: EAM_COLOR }} />
                  </Box>
                  <Box>
                    <Typography fontWeight={800} fontSize={17} color="#fff" letterSpacing="-0.3px">
                      Nueva Orden de Trabajo
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.4)">
                      Complete los datos y agregue trabajos y repuestos
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={form.numero}
                  sx={{ bgcolor: alpha(EAM_COLOR, 0.12), color: EAM_COLOR, fontWeight: 800, fontSize: 13, height: 30, letterSpacing: '0.5px' }}
                />
              </Stack>

              <Grid container spacing={2.5}>

                {/* ── COLUMNA IZQUIERDA ── */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={2}>

                    {/* Activo */}
                    <TextField
                      select fullWidth size="small" label="Activo *"
                      value={form.activo}
                      onChange={(e) => setActivo(e.target.value)}
                      sx={inputSx}
                    >
                      <MenuItem value=""><em>Seleccionar activo...</em></MenuItem>
                      {ACTIVOS_DATA.map((a) => <MenuItem key={a.nombre} value={a.nombre}>{a.nombre}</MenuItem>)}
                    </TextField>

                    {/* Fecha apertura + Posible cierre */}
                    <Stack direction="row" spacing={1.5}>
                      <TextField
                        fullWidth size="small" label="Fecha apertura *" type="date"
                        value={form.fechaApertura}
                        onChange={(e) => setField('fechaApertura', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                      />
                      <TextField
                        fullWidth size="small" label="Posible cierre" type="date"
                        value={form.posibleCierre}
                        onChange={(e) => setField('posibleCierre', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                      />
                    </Stack>

                    {/* Odómetro */}
                    <TextField
                      fullWidth size="small" label="Odómetro / Contador"
                      value={form.odometro}
                      onChange={(e) => setField('odometro', e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="rgba(255,255,255,0.3)">km</Typography></InputAdornment> }}
                      sx={inputSx}
                    />

                    {/* Proveedor */}
                    <TextField
                      select fullWidth size="small" label="Proveedor / Taller"
                      value={form.proveedor}
                      onChange={(e) => setField('proveedor', e.target.value)}
                      sx={inputSx}
                    >
                      <MenuItem value=""><em>Seleccionar proveedor...</em></MenuItem>
                      {PROVEEDORES_SELECT.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </TextField>

                    {/* Tipo OT */}
                    <TextField
                      select fullWidth size="small" label="Tipo de orden *"
                      value={form.tipo}
                      onChange={(e) => setField('tipo', e.target.value)}
                      sx={inputSx}
                    >
                      {['PREVENTIVA', 'CORRECTIVA', 'PREDICTIVA', 'EMERGENCIA'].map((t) => (
                        <MenuItem key={t} value={t}>{t}</MenuItem>
                      ))}
                    </TextField>

                    {/* Observaciones */}
                    <TextField
                      fullWidth size="small" label="Observaciones" multiline rows={3}
                      value={form.observaciones}
                      onChange={(e) => setField('observaciones', e.target.value)}
                      placeholder="Notas, recursos especiales, permisos requeridos..."
                      sx={inputSx}
                    />
                  </Stack>
                </Grid>

                {/* ── COLUMNA DERECHA ── */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={2}>

                    {/* Toggles */}
                    <Paper elevation={0} sx={{ bgcolor: alpha('#fff', 0.03), border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '10px', p: 1.5 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <CheckIcon sx={{ fontSize: 16, color: form.afectaDisp ? EAM_COLOR : 'rgba(255,255,255,0.3)' }} />
                            <Typography fontSize={13} color="rgba(255,255,255,0.7)">Afecta la disponibilidad</Typography>
                          </Stack>
                          <Switch
                            size="small"
                            checked={form.afectaDisp}
                            onChange={(e) => setField('afectaDisp', e.target.checked)}
                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: EAM_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: EAM_COLOR } }}
                          />
                        </Stack>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <FaultIcon sx={{ fontSize: 16, color: form.esUnaFalla ? '#F59E0B' : 'rgba(255,255,255,0.3)' }} />
                            <Typography fontSize={13} color="rgba(255,255,255,0.7)">Es una falla</Typography>
                          </Stack>
                          <Switch
                            size="small"
                            checked={form.esUnaFalla}
                            onChange={(e) => setField('esUnaFalla', e.target.checked)}
                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#F59E0B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#F59E0B' } }}
                          />
                        </Stack>
                      </Stack>
                    </Paper>

                    {/* Técnico */}
                    <TextField
                      select fullWidth size="small" label="Técnico asignado"
                      value={form.tecnico}
                      onChange={(e) => setField('tecnico', e.target.value)}
                      sx={inputSx}
                    >
                      <MenuItem value=""><em>Sin asignar</em></MenuItem>
                      {TECNICOS_SELECT.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </TextField>

                    {/* Prioridad */}
                    <TextField
                      select fullWidth size="small" label="Prioridad *"
                      value={form.prioridad}
                      onChange={(e) => setField('prioridad', e.target.value)}
                      sx={inputSx}
                    >
                      {[
                        { v: 'URGENTE', color: '#DC2626' },
                        { v: 'ALTA',    color: EAM_COLOR },
                        { v: 'MEDIA',   color: '#F59E0B' },
                        { v: 'BAJA',    color: '#6B7280' },
                      ].map(({ v, color }) => (
                        <MenuItem key={v} value={v}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                            <span>{v}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Falla del catálogo (solo si esUnaFalla) */}
                    {form.esUnaFalla && (
                      <TextField
                        select fullWidth size="small" label="Tipo de falla (catálogo)"
                        value={form.falla}
                        onChange={(e) => setField('falla', e.target.value)}
                        sx={inputSx}
                      >
                        <MenuItem value=""><em>Seleccionar falla...</em></MenuItem>
                        {FALLAS_CATALOGO.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                      </TextField>
                    )}

                    {/* Centro de costo + Ciudad */}
                    <Stack direction="row" spacing={1.5}>
                      <TextField
                        fullWidth size="small" label="Centro de costo"
                        value={form.centroCosto}
                        onChange={(e) => setField('centroCosto', e.target.value)}
                        sx={inputSx}
                      />
                      <TextField
                        fullWidth size="small" label="Ciudad"
                        value={form.ciudad}
                        onChange={(e) => setField('ciudad', e.target.value)}
                        sx={inputSx}
                      />
                    </Stack>

                    {/* Descripción */}
                    <TextField
                      fullWidth size="small" label="Descripción del trabajo *" multiline rows={3}
                      value={form.descripcion}
                      onChange={(e) => setField('descripcion', e.target.value)}
                      placeholder="Describa el trabajo a realizar..."
                      sx={inputSx}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* ── Acordeón TRABAJOS ── */}
            <Accordion
              expanded={accTrabajos}
              onChange={() => setAccTrabajos((p) => !p)}
              elevation={0}
              sx={{
                bgcolor: CARD_BG, mb: 1.5,
                border: `1px solid ${alpha(EAM_COLOR, accTrabajos ? 0.4 : 0.15)}`,
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                transition: 'border-color 0.2s',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: EAM_COLOR }} />}
                sx={{ px: 2.5, py: 1, minHeight: 52, '&.Mui-expanded': { minHeight: 52 }, '& .MuiAccordionSummary-content': { my: 0 } }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} flex={1}>
                  <WorkIcon sx={{ fontSize: 18, color: EAM_COLOR }} />
                  <Typography fontWeight={700} fontSize={14} color="#fff">Trabajos</Typography>
                  <Chip
                    label={trabajos.length}
                    size="small"
                    sx={{ bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_COLOR, fontWeight: 800, fontSize: 11, height: 20 }}
                  />
                  {totalMO > 0 && (
                    <Typography fontSize={12} color="rgba(255,255,255,0.4)" ml="auto" mr={2}>
                      M.O. total: <strong style={{ color: EAM_COLOR }}>{fmt(totalMO)}</strong>
                    </Typography>
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                {/* Cabecera tabla */}
                <Box sx={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 1fr 130px 36px',
                  gap: 1, px: 1.5, py: 0.75, mb: 0.5,
                  bgcolor: alpha(EAM_COLOR, 0.05), borderRadius: '8px',
                }}>
                  {['#', 'Trabajo (catálogo)', 'Observaciones', 'M.O. ($)', ''].map((h) => (
                    <Typography key={h} fontSize={10} fontWeight={700} color="rgba(255,255,255,0.35)" letterSpacing="0.4px">
                      {h.toUpperCase()}
                    </Typography>
                  ))}
                </Box>

                {/* Filas — cada una es un mini-card */}
                <Stack spacing={1}>
                  {trabajos.map((t, i) => {
                    const cfg = TIPOS_TRABAJO_CONFIG.find((c) => c.nombre === t.trabajo)
                    const catColor = cfg ? CAT_COLOR[cfg.categoria as CatTrabajo] : 'rgba(255,255,255,0.12)'
                    return (
                      <Paper
                        key={t.id}
                        elevation={0}
                        sx={{
                          bgcolor: alpha('#fff', 0.015),
                          border: `1px solid ${cfg ? alpha(catColor, 0.3) : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '10px',
                          p: 1,
                          transition: 'border-color 0.2s',
                        }}
                      >
                        {/* ── Fila 1: número | trabajo | observaciones | M.O. | eliminar ── */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 130px 36px', gap: 1, alignItems: 'center' }}>
                          <Typography fontSize={11} color="rgba(255,255,255,0.3)" fontWeight={700}>{i + 1}</Typography>

                          {/* Trabajo — select del catálogo */}
                          <TextField
                            select size="small" fullWidth
                            value={t.trabajo}
                            onChange={(e) => setTrabajo(t.id, 'trabajo', e.target.value)}
                            sx={{
                              ...inputSxSm,
                              '& .MuiOutlinedInput-root': {
                                ...inputSxSm['& .MuiOutlinedInput-root'],
                                bgcolor: cfg ? alpha(catColor, 0.07) : alpha('#060C1A', 0.6),
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: cfg ? alpha(catColor, 0.4) : 'rgba(255,255,255,0.08)',
                              },
                            }}
                          >
                            <MenuItem value=""><em style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Seleccionar trabajo...</em></MenuItem>
                            {TIPOS_TRABAJO_CONFIG.map((tp) => (
                              <MenuItem key={tp.id} value={tp.nombre}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CAT_COLOR[tp.categoria], flexShrink: 0 }} />
                                  <span>{tp.nombre}</span>
                                </Stack>
                              </MenuItem>
                            ))}
                          </TextField>

                          {/* Observaciones */}
                          <TextField
                            size="small" fullWidth placeholder="Notas u observaciones..."
                            value={t.observaciones}
                            onChange={(e) => setTrabajo(t.id, 'observaciones', e.target.value)}
                            sx={inputSxSm}
                          />

                          {/* M.O. */}
                          <TextField
                            size="small" fullWidth placeholder="0"
                            value={t.moObra}
                            onChange={(e) => setTrabajo(t.id, 'moObra', e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={11} color="rgba(255,255,255,0.3)">$</Typography></InputAdornment> }}
                            sx={inputSxSm}
                          />

                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => removeTrabajo(t.id)}
                              disabled={trabajos.length === 1}
                              sx={{ color: '#EF4444', opacity: trabajos.length === 1 ? 0.3 : 1 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        {/* ── Fila 2: campos auto-llenados cuando se selecciona un trabajo ── */}
                        {cfg && (
                          <Box
                            sx={{
                              mt: 0.75, ml: '36px',
                              display: 'grid',
                              gridTemplateColumns: '160px 1fr 1fr',
                              gap: 1,
                              alignItems: 'end',
                            }}
                          >
                            {/* Tipo de mantenimiento — solo lectura */}
                            <Box>
                              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                Tipo de mantenimiento
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.75,
                                  px: 1.25, height: 32, borderRadius: '6px',
                                  bgcolor: alpha(catColor, 0.12),
                                  border: `1px solid ${alpha(catColor, 0.35)}`,
                                }}
                              >
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: catColor, flexShrink: 0 }} />
                                <Typography fontSize={11} fontWeight={700} color={catColor} noWrap>
                                  {t.tipoMant}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Sistema — editable, auto-llenado */}
                            <Box>
                              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                Sistema del activo
                              </Typography>
                              <TextField
                                size="small" fullWidth
                                value={t.sistema}
                                onChange={(e) => setTrabajo(t.id, 'sistema', e.target.value)}
                                sx={{
                                  ...inputSxSm,
                                  '& .MuiOutlinedInput-root': {
                                    ...inputSxSm['& .MuiOutlinedInput-root'],
                                    bgcolor: alpha('#fff', 0.04),
                                  },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Tooltip title="Auto-llenado desde configuración del trabajo">
                                        <Typography fontSize={9} color={alpha(EAM_COLOR, 0.6)} fontWeight={700} sx={{ cursor: 'default' }}>AUTO</Typography>
                                      </Tooltip>
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Box>

                            {/* Subsistema — editable, auto-llenado */}
                            <Box>
                              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                Subsistema del activo
                              </Typography>
                              <TextField
                                size="small" fullWidth
                                value={t.subsistema}
                                onChange={(e) => setTrabajo(t.id, 'subsistema', e.target.value)}
                                sx={{
                                  ...inputSxSm,
                                  '& .MuiOutlinedInput-root': {
                                    ...inputSxSm['& .MuiOutlinedInput-root'],
                                    bgcolor: alpha('#fff', 0.04),
                                  },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Tooltip title="Auto-llenado desde configuración del trabajo">
                                        <Typography fontSize={9} color={alpha(EAM_COLOR, 0.6)} fontWeight={700} sx={{ cursor: 'default' }}>AUTO</Typography>
                                      </Tooltip>
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    )
                  })}
                </Stack>

                <Button
                  size="small" startIcon={<AddIcon />}
                  onClick={addTrabajo}
                  sx={{ mt: 1.5, color: EAM_COLOR, borderColor: alpha(EAM_COLOR, 0.35), '&:hover': { bgcolor: alpha(EAM_COLOR, 0.08), borderColor: EAM_COLOR }, textTransform: 'none', fontWeight: 600 }}
                  variant="outlined"
                >
                  Agregar trabajo
                </Button>
              </AccordionDetails>
            </Accordion>

            {/* ── Acordeón REPUESTOS ── */}
            <Accordion
              expanded={accRepuestos}
              onChange={() => setAccRepuestos((p) => !p)}
              elevation={0}
              sx={{
                bgcolor: CARD_BG, mb: 2,
                border: `1px solid ${alpha('#3B82F6', accRepuestos ? 0.4 : 0.15)}`,
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                transition: 'border-color 0.2s',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#3B82F6' }} />}
                sx={{ px: 2.5, py: 1, minHeight: 52, '&.Mui-expanded': { minHeight: 52 }, '& .MuiAccordionSummary-content': { my: 0 } }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} flex={1}>
                  <PartsIcon sx={{ fontSize: 18, color: '#3B82F6' }} />
                  <Typography fontWeight={700} fontSize={14} color="#fff">Repuestos</Typography>
                  <Chip
                    label={repuestos.length}
                    size="small"
                    sx={{ bgcolor: alpha('#3B82F6', 0.15), color: '#3B82F6', fontWeight: 800, fontSize: 11, height: 20 }}
                  />
                  {totalRep > 0 && (
                    <Typography fontSize={12} color="rgba(255,255,255,0.4)" ml="auto" mr={2}>
                      Total repuestos: <strong style={{ color: '#3B82F6' }}>{fmt(totalRep)}</strong>
                    </Typography>
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                {/* Cabecera tabla */}
                <Box sx={{
                  display: 'grid', gridTemplateColumns: '28px 180px 1fr 75px 125px 110px 36px',
                  gap: 1, px: 1, py: 0.75, mb: 0.5,
                  bgcolor: alpha('#3B82F6', 0.05), borderRadius: '8px',
                }}>
                  {['#', 'Trabajo asociado', 'Repuesto', 'Cant.', 'P. Unitario', 'Subtotal', ''].map((h) => (
                    <Typography key={h} fontSize={10} fontWeight={700} color="rgba(255,255,255,0.35)" letterSpacing="0.4px">
                      {h.toUpperCase()}
                    </Typography>
                  ))}
                </Box>

                {/* Filas */}
                <Stack spacing={0.75}>
                  {repuestos.map((r, i) => {
                    const sub = (parseFloat(r.cantidad) || 0) * (parseFloat(r.precioUnitario.replace(/[^0-9.]/g, '')) || 0)
                    return (
                      <Box key={r.id} sx={{
                        display: 'grid', gridTemplateColumns: '28px 180px 1fr 75px 125px 110px 36px',
                        gap: 1, alignItems: 'center',
                        px: 1, py: 0.5,
                        bgcolor: alpha('#fff', 0.02), borderRadius: '8px',
                        border: `1px solid rgba(255,255,255,0.05)`,
                      }}>
                        <Typography fontSize={11} color="rgba(255,255,255,0.3)" fontWeight={700}>{i + 1}</Typography>

                        {/* Trabajo asociado */}
                        <TextField
                          select size="small" fullWidth
                          value={r.trabajoId}
                          onChange={(e) => setRepuesto(r.id, 'trabajoId', e.target.value)}
                          SelectProps={{
                            renderValue: (val) => {
                              const idx = trabajos.findIndex((t) => (t.trabajo || `Trabajo ${trabajos.indexOf(t) + 1}`) === val)
                              if (!val || idx === -1) return <em style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Sin trabajo...</em>
                              const t = trabajos[idx]
                              return (
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                  <Box sx={{ width: 16, height: 16, borderRadius: '3px', bgcolor: alpha(EAM_COLOR, 0.25), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Typography fontSize={9} fontWeight={800} color={EAM_COLOR}>{idx + 1}</Typography>
                                  </Box>
                                  <Typography fontSize={11} noWrap color="white">
                                    {t.trabajo || `Trabajo ${idx + 1}`}
                                  </Typography>
                                </Stack>
                              )
                            },
                          }}
                          sx={{
                            ...inputSxSm,
                            '& .MuiOutlinedInput-root': {
                              ...inputSxSm['& .MuiOutlinedInput-root'],
                              bgcolor: r.trabajoId ? alpha(EAM_COLOR, 0.08) : alpha('#060C1A', 0.6),
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: r.trabajoId ? alpha(EAM_COLOR, 0.4) : 'rgba(255,255,255,0.08)',
                            },
                          }}
                        >
                          <MenuItem value=""><em style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Sin trabajo...</em></MenuItem>
                          {trabajos.map((t, ti) => (
                            <MenuItem key={t.id} value={t.trabajo || `Trabajo ${ti + 1}`}>
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box sx={{ width: 18, height: 18, borderRadius: '4px', bgcolor: alpha(EAM_COLOR, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Typography fontSize={9} fontWeight={800} color={EAM_COLOR}>{ti + 1}</Typography>
                                </Box>
                                <Typography fontSize={11} noWrap>
                                  {t.trabajo || `Trabajo ${ti + 1}`}
                                </Typography>
                              </Stack>
                            </MenuItem>
                          ))}
                        </TextField>

                        {/* Repuesto */}
                        <TextField
                          select size="small" fullWidth value={r.repuesto}
                          onChange={(e) => setRepuesto(r.id, 'repuesto', e.target.value)}
                          sx={inputSxSm}
                        >
                          <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                          {REPUESTOS_SELECT.map((rp) => <MenuItem key={rp} value={rp}>{rp}</MenuItem>)}
                        </TextField>

                        {/* Cantidad */}
                        <TextField
                          size="small" fullWidth placeholder="1"
                          value={r.cantidad}
                          onChange={(e) => setRepuesto(r.id, 'cantidad', e.target.value)}
                          sx={inputSxSm}
                        />

                        {/* Precio unitario */}
                        <TextField
                          size="small" fullWidth placeholder="0"
                          value={r.precioUnitario}
                          onChange={(e) => setRepuesto(r.id, 'precioUnitario', e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={11} color="rgba(255,255,255,0.3)">$</Typography></InputAdornment> }}
                          sx={inputSxSm}
                        />

                        {/* Subtotal */}
                        <Typography fontSize={12} fontWeight={600} color={sub > 0 ? '#3B82F6' : 'rgba(255,255,255,0.2)'}>
                          {sub > 0 ? fmt(sub) : '—'}
                        </Typography>

                        {/* Eliminar */}
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={() => removeRepuesto(r.id)}
                            disabled={repuestos.length === 1}
                            sx={{ color: '#EF4444', opacity: repuestos.length === 1 ? 0.3 : 1 }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )
                  })}
                </Stack>

                <Button
                  size="small" startIcon={<AddIcon />}
                  onClick={addRepuesto}
                  sx={{ mt: 1.5, color: '#3B82F6', borderColor: alpha('#3B82F6', 0.35), '&:hover': { bgcolor: alpha('#3B82F6', 0.08), borderColor: '#3B82F6' }, textTransform: 'none', fontWeight: 600 }}
                  variant="outlined"
                >
                  Agregar repuesto
                </Button>
              </AccordionDetails>
            </Accordion>

            {/* ── Resumen de costos + Acciones ── */}
            <Paper elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid rgba(50,172,92,0.2)`, borderRadius: '12px', p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
                {/* Totales */}
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography fontSize={11} color="rgba(255,255,255,0.4)" mb={0.25}>Mano de obra</Typography>
                    <Typography fontSize={16} fontWeight={800} color={EAM_COLOR}>{fmt(totalMO)}</Typography>
                  </Box>
                  <Box>
                    <Typography fontSize={11} color="rgba(255,255,255,0.4)" mb={0.25}>Repuestos</Typography>
                    <Typography fontSize={16} fontWeight={800} color="#3B82F6">{fmt(totalRep)}</Typography>
                  </Box>
                  <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.08)', pl: 3 }}>
                    <Typography fontSize={11} color="rgba(255,255,255,0.4)" mb={0.25}>Costo estimado total</Typography>
                    <Typography fontSize={18} fontWeight={900} color="#fff">{fmt(totalMO + totalRep)}</Typography>
                  </Box>
                </Stack>

                {/* Botones */}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => setTab(0)}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.5)',
                      borderRadius: '10px', fontWeight: 600,
                      '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.04)' },
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    sx={{
                      bgcolor: EAM_COLOR,
                      '&:hover': { bgcolor: EAM_DARK },
                      borderRadius: '10px',
                      fontWeight: 700,
                      px: 3.5,
                      boxShadow: `0 4px 16px ${alpha(EAM_COLOR, 0.35)}`,
                    }}
                  >
                    Crear Orden de Trabajo
                  </Button>
                </Stack>
              </Stack>
            </Paper>

          </Box>
        )}
      </Box>
    </Layout>

      {/* ── Dialog detalle / edición / eliminación de OT ── */}
      <Dialog
        open={otDialog.open}
        onClose={closeOTDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0F1E35', border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {otDialog.ot && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: 'white' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <OTIcon sx={{ fontSize: 18, color: EAM_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={13} fontWeight={800} color={EAM_COLOR}>{otDialog.ot.numero}</Typography>
                  <Typography fontSize={11} color="rgba(255,255,255,0.45)" noWrap>{otDialog.ot.activo}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={closeOTDialog} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 0 }}>
              {/* ── MODO VER ── */}
              {otDialog.mode === 'view' && (
                <Stack spacing={1.5} mt={1}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    {[
                      { label: 'Tipo de orden', value: otDialog.ot.tipo },
                      { label: 'Prioridad',     value: otDialog.ot.prioridad },
                      { label: 'Técnico',        value: otDialog.ot.tecnico },
                      { label: 'Fecha req.',     value: otDialog.ot.fechaReq },
                      { label: 'Costo',          value: otDialog.ot.costo },
                      { label: 'Días transcurridos', value: `${otDialog.ot.diasTranscurridos}d` },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ bgcolor: alpha('#fff', 0.04), borderRadius: '8px', p: 1.25 }}>
                        <Typography fontSize={10} color="rgba(255,255,255,0.35)" fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
                        <Typography fontSize={13} fontWeight={600} color="white">{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ bgcolor: alpha('#fff', 0.04), borderRadius: '8px', p: 1.25 }}>
                    <Typography fontSize={10} color="rgba(255,255,255,0.35)" fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.5}>Estado actual</Typography>
                    <Chip
                      label={otDialog.ot.estado.replace(/_/g, ' ')}
                      sx={{ bgcolor: alpha(ESTADO_COLOR[otDialog.ot.estado], 0.2), color: ESTADO_COLOR[otDialog.ot.estado], fontWeight: 700, fontSize: 11, height: 24, border: `1px solid ${alpha(ESTADO_COLOR[otDialog.ot.estado], 0.4)}` }}
                    />
                  </Box>
                </Stack>
              )}

              {/* ── MODO EDITAR ── */}
              {otDialog.mode === 'edit' && (
                <Stack spacing={2} mt={1}>
                  <TextField
                    select fullWidth size="small" label="Estado (Kanban)"
                    value={otDialog.editEstado}
                    onChange={(e) => setOtDialog((p) => ({ ...p, editEstado: e.target.value as OTEstado }))}
                    sx={{ '& .MuiOutlinedInput-root': { color: 'white', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                  >
                    {(['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_ESPERA_REPUESTOS', 'COMPLETADA'] as OTEstado[]).map((e) => (
                      <MenuItem key={e} value={e}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ESTADO_COLOR[e] }} />
                          <span>{e.replace(/_/g, ' ')}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select fullWidth size="small" label="Técnico asignado"
                    value={otDialog.editTecnico}
                    onChange={(e) => setOtDialog((p) => ({ ...p, editTecnico: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { color: 'white', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                  >
                    <MenuItem value="Sin asignar">Sin asignar</MenuItem>
                    {TECNICOS_SELECT.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                  <TextField
                    select fullWidth size="small" label="Prioridad"
                    value={otDialog.editPrioridad}
                    onChange={(e) => setOtDialog((p) => ({ ...p, editPrioridad: e.target.value as OTPrioridad }))}
                    sx={{ '& .MuiOutlinedInput-root': { color: 'white', bgcolor: alpha('#fff', 0.04) }, '& label': { color: 'grey.500' }, '& fieldset': { borderColor: alpha('#fff', 0.15) }, '& .MuiSvgIcon-root': { color: 'grey.400' } }}
                  >
                    {(['URGENTE', 'ALTA', 'MEDIA', 'BAJA'] as OTPrioridad[]).map((p) => (
                      <MenuItem key={p} value={p}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORIDAD_COLOR[p] }} />
                          <span>{p}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              )}

              {/* ── MODO ELIMINAR ── */}
              {otDialog.mode === 'delete' && (
                <Stack spacing={2} mt={1}>
                  <Box sx={{ bgcolor: alpha('#DC2626', 0.08), border: '1px solid rgba(220,38,38,0.25)', borderRadius: '10px', p: 2 }}>
                    <Typography fontSize={13} color="#FCA5A5" fontWeight={600} mb={0.5}>
                      ¿Eliminar la orden {otDialog.ot.numero}?
                    </Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,0.45)">
                      Esta acción no se puede deshacer. Escribe <strong style={{ color: '#FCA5A5' }}>ELIMINAR</strong> en el campo de abajo para confirmar.
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth size="small" placeholder="Escribe ELIMINAR para confirmar"
                    value={otDialog.deleteText}
                    onChange={(e) => setOtDialog((p) => ({ ...p, deleteText: e.target.value }))}
                    sx={{
                      '& .MuiOutlinedInput-root': { color: 'white', bgcolor: alpha('#fff', 0.04) },
                      '& fieldset': { borderColor: otDialog.deleteText === 'ELIMINAR' ? '#DC2626' : alpha('#fff', 0.15) },
                    }}
                  />
                </Stack>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              {otDialog.mode === 'view' && (
                <>
                  <Button onClick={toDeleteMode} sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }} startIcon={<DeleteIcon />}>
                    Eliminar
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Button onClick={closeOTDialog} sx={{ color: 'grey.400' }}>Cancelar</Button>
                  <Button variant="contained" onClick={toEditMode} startIcon={<EditIcon />}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700, borderRadius: '8px' }}>
                    Editar
                  </Button>
                </>
              )}
              {otDialog.mode === 'edit' && (
                <>
                  <Button onClick={() => setOtDialog((p) => ({ ...p, mode: 'view' }))} sx={{ color: 'grey.400' }}>Cancelar</Button>
                  <Button variant="contained" onClick={saveOTEdit}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700, borderRadius: '8px' }}>
                    Guardar cambios
                  </Button>
                </>
              )}
              {otDialog.mode === 'delete' && (
                <>
                  <Button onClick={() => setOtDialog((p) => ({ ...p, mode: 'view' }))} sx={{ color: 'grey.400' }}>Cancelar</Button>
                  <Button
                    variant="contained"
                    onClick={deleteOT}
                    disabled={otDialog.deleteText !== 'ELIMINAR'}
                    sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, '&:disabled': { bgcolor: 'rgba(220,38,38,0.3)', color: 'rgba(255,255,255,0.3)' }, fontWeight: 700, borderRadius: '8px' }}
                    startIcon={<DeleteIcon />}
                  >
                    Eliminar definitivamente
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}
