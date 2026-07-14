import React, { useState } from 'react'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  alpha,
  Tab,
  Tabs,
  CircularProgress,
  Slider,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material'
import Grid from '@mui/material/Grid2'

import {
  HealthAndSafety as HealthAndSafetyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ErrorOutline as ErrorOutlineIcon,
  Warning as WarningIcon,
  ReportProblem as ReportProblemIcon,
  CalendarToday as CalendarTodayIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

const GH_COLOR = '#BE185D'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Empresa { id: number; nombre: string }
interface Sede { id: number; nombre: string; empresa_id: number }
interface Area { id: number; nombre: string }
interface Colaborador { id: number; nombre: string }

interface Incidente {
  id: number
  empresa_id: number
  sede_id?: number
  sede_nombre?: string
  colaborador_id?: number
  colaborador_nombre?: string
  fecha: string
  tipo_sst: string
  descripcion: string
  causa?: string
  consecuencias?: string
  dias_incapacidad: number
  medidas_correctivas?: string
  investigado: boolean
  estado: string
}

interface Riesgo {
  id: number
  empresa_id: number
  area_id?: number
  area_nombre?: string
  fuente: string
  descripcion: string
  probabilidad: number
  impacto: number
  nivel_riesgo: number
  control?: string
  responsable_id?: number
  responsable_nombre?: string
  fecha_revision?: string
  estado: string
}

interface Inspeccion {
  id: number
  empresa_id: number
  empresa_nombre: string
  sede_id?: number
  sede_nombre?: string
  fecha: string
  tipo: string
  inspector_id?: number
  inspector_nombre?: string
  hallazgos?: string
  acciones?: string
  estado: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const trunc = (s: string | undefined, n: number) => {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

const riskColor = (val: number): { bg: string; fg: string } => {
  if (val >= 15) return { bg: '#FEE2E2', fg: '#DC2626' }
  if (val >= 10) return { bg: '#FED7AA', fg: '#D97706' }
  if (val >= 5)  return { bg: '#FEF3C7', fg: '#B45309' }
  return { bg: '#DCFCE7', fg: '#16A34A' }
}

const probColor = (val: number): string => {
  if (val <= 2) return '#16A34A'
  if (val === 3) return '#B45309'
  if (val === 4) return '#D97706'
  return '#DC2626'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_SST_OPTS = ['ACCIDENTE', 'INCIDENTE', 'CASI_ACCIDENTE'] as const
const ESTADO_INC_OPTS = ['ABIERTO', 'EN_INVESTIGACION', 'CERRADO'] as const
const ESTADO_RIESGO_OPTS = ['IDENTIFICADO', 'EN_CONTROL', 'MITIGADO', 'ACEPTADO'] as const
const ESTADO_INSP_OPTS = ['PENDIENTE', 'EN_PROCESO', 'CERRADA', 'CON_HALLAZGOS'] as const
const TIPO_INSP_OPTS = ['SEGURIDAD', 'ORDEN_ASEO', 'EQUIPOS_CONTRA_INCENDIO', 'RIESGO_QUIMICO', 'ERGONOMIA', 'OTRO'] as const

const TIPO_SST_CHIP: Record<string, { bg: string; fg: string }> = {
  ACCIDENTE:     { bg: '#FEE2E2', fg: '#DC2626' },
  INCIDENTE:     { bg: '#FEF3C7', fg: '#D97706' },
  CASI_ACCIDENTE:{ bg: '#FFFBEB', fg: '#B45309' },
}

const ESTADO_INC_CHIP: Record<string, string> = {
  ABIERTO: '#3B82F6',
  EN_INVESTIGACION: '#D97706',
  CERRADO: '#16A34A',
}

const ESTADO_RIESGO_CHIP: Record<string, string> = {
  IDENTIFICADO: '#9CA3AF',
  EN_CONTROL: '#3B82F6',
  MITIGADO: '#16A34A',
  ACEPTADO: '#B45309',
}

const ESTADO_INSP_CHIP: Record<string, string> = {
  PENDIENTE: '#9CA3AF',
  EN_PROCESO: '#3B82F6',
  CERRADA: '#16A34A',
  CON_HALLAZGOS: '#D97706',
}

const PROB_MARKS = [
  { value: 1, label: 'Raro' },
  { value: 2, label: 'Improbable' },
  { value: 3, label: 'Posible' },
  { value: 4, label: 'Probable' },
  { value: 5, label: 'Casi seguro' },
]

const IMPACTO_MARKS = [
  { value: 1, label: 'Insignificante' },
  { value: 2, label: 'Menor' },
  { value: 3, label: 'Moderado' },
  { value: 4, label: 'Mayor' },
  { value: 5, label: 'Catastrófico' },
]

// ── Empty forms ───────────────────────────────────────────────────────────────

const EMPTY_INC = {
  empresa_id: '',
  sede_id: '',
  colaborador_id: null as Colaborador | null,
  fecha: '',
  tipo_sst: 'INCIDENTE',
  descripcion: '',
  causa: '',
  consecuencias: '',
  dias_incapacidad: '0',
  medidas_correctivas: '',
}

const EMPTY_RIESGO = {
  empresa_id: '',
  area_id: '',
  fuente: '',
  descripcion: '',
  probabilidad: 3,
  impacto: 3,
  control: '',
  responsable_id: null as Colaborador | null,
  fecha_revision: '',
  estado: 'IDENTIFICADO',
}

const EMPTY_INSP = {
  empresa_id: '',
  sede_id: '',
  fecha: '',
  tipo: 'SEGURIDAD',
  inspector_id: null as Colaborador | null,
  hallazgos: '',
  acciones: '',
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GHSST() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // ─── Tab 0 state ──────────────────────────────────────────────────────────
  const [incOpenDialog, setIncOpenDialog] = useState(false)
  const [incEditing, setIncEditing] = useState<Incidente | null>(null)
  const [incForm, setIncForm] = useState({ ...EMPTY_INC })
  const [incFilterEmpresa, setIncFilterEmpresa] = useState('')
  const [incFilterTipo, setIncFilterTipo] = useState('')
  const [incFilterEstado, setIncFilterEstado] = useState('')
  const [incFilterDesde, setIncFilterDesde] = useState('')
  const [incFilterHasta, setIncFilterHasta] = useState('')

  // ─── Tab 1 state ──────────────────────────────────────────────────────────
  const [riesgoOpenDialog, setRiesgoOpenDialog] = useState(false)
  const [riesgoEditing, setRiesgoEditing] = useState<Riesgo | null>(null)
  const [riesgoForm, setRiesgoForm] = useState({ ...EMPTY_RIESGO })
  const [riesgoFilterEstado, setRiesgoFilterEstado] = useState('')

  // ─── Tab 2 state ──────────────────────────────────────────────────────────
  const [inspOpenDialog, setInspOpenDialog] = useState(false)
  const [inspEditing, setInspEditing] = useState<Inspeccion | null>(null)
  const [inspForm, setInspForm] = useState({ ...EMPTY_INSP })

  // ─── Shared data ──────────────────────────────────────────────────────────
  const { data: empresas = [] } = useQuery<Empresa[]>({
    queryKey: ['hcm-empresas'],
    queryFn: () => api.get('/hcm/empresas').then(r => r.data),
  })

  const { data: sedes = [] } = useQuery<Sede[]>({
    queryKey: ['hcm-sedes'],
    queryFn: () => api.get('/hcm/sedes').then(r => r.data),
  })

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ['hcm-areas'],
    queryFn: () => api.get('/hcm/areas').then(r => r.data),
  })

  const { data: colaboradores = [] } = useQuery<Colaborador[]>({
    queryKey: ['hcm-colaboradores'],
    queryFn: () => api.get('/hcm/colaboradores').then(r => r.data),
  })

  // ─── Incidentes queries & mutations ──────────────────────────────────────
  const { data: incidentes = [], isLoading: incLoading } = useQuery<Incidente[]>({
    queryKey: ['gh-sst-incidentes'],
    queryFn: () => api.get('/hcm/sst/incidentes').then(r => r.data),
  })

  const incCreateMut = useMutation({
    mutationFn: (d: object) => api.post('/hcm/sst/incidentes', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Incidente registrado')
      qc.invalidateQueries({ queryKey: ['gh-sst-incidentes'] })
      setIncOpenDialog(false)
    },
    onError: () => toast.error('Error al registrar incidente'),
  })

  const incUpdateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/sst/incidentes/${id}`, d).then(r => r.data),
    onSuccess: () => {
      toast.success('Incidente actualizado')
      qc.invalidateQueries({ queryKey: ['gh-sst-incidentes'] })
      setIncOpenDialog(false)
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const incMarkInvMut = useMutation({
    mutationFn: (id: number) => api.put(`/hcm/sst/incidentes/${id}`, { investigado: true }).then(r => r.data),
    onSuccess: () => {
      toast.success('Marcado como investigado')
      qc.invalidateQueries({ queryKey: ['gh-sst-incidentes'] })
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const handleIncOpen = (inc?: Incidente) => {
    setIncEditing(inc ?? null)
    if (inc) {
      setIncForm({
        empresa_id: String(inc.empresa_id),
        sede_id: String(inc.sede_id ?? ''),
        colaborador_id: inc.colaborador_id
          ? { id: inc.colaborador_id, nombre: inc.colaborador_nombre ?? '' }
          : null,
        fecha: inc.fecha,
        tipo_sst: inc.tipo_sst,
        descripcion: inc.descripcion,
        causa: inc.causa ?? '',
        consecuencias: inc.consecuencias ?? '',
        dias_incapacidad: String(inc.dias_incapacidad),
        medidas_correctivas: inc.medidas_correctivas ?? '',
      })
    } else {
      setIncForm({ ...EMPTY_INC })
    }
    setIncOpenDialog(true)
  }

  const handleIncSave = () => {
    const payload = {
      empresa_id: Number(incForm.empresa_id),
      sede_id: incForm.sede_id ? Number(incForm.sede_id) : null,
      colaborador_id: incForm.colaborador_id ? incForm.colaborador_id.id : null,
      fecha: incForm.fecha,
      tipo_sst: incForm.tipo_sst,
      descripcion: incForm.descripcion,
      causa: incForm.causa || null,
      consecuencias: incForm.consecuencias || null,
      dias_incapacidad: Number(incForm.dias_incapacidad) || 0,
      medidas_correctivas: incForm.medidas_correctivas || null,
    }
    if (incEditing) incUpdateMut.mutate({ id: incEditing.id, d: payload })
    else incCreateMut.mutate(payload)
  }

  // ─── Riesgos queries & mutations ──────────────────────────────────────────
  const { data: riesgos = [], isLoading: riesgoLoading } = useQuery<Riesgo[]>({
    queryKey: ['gh-riesgos'],
    queryFn: () => api.get('/hcm/sst/riesgos').then(r => r.data),
  })

  const riesgoCreateMut = useMutation({
    mutationFn: (d: object) => api.post('/hcm/sst/riesgos', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Riesgo registrado')
      qc.invalidateQueries({ queryKey: ['gh-riesgos'] })
      setRiesgoOpenDialog(false)
    },
    onError: () => toast.error('Error al registrar riesgo'),
  })

  const riesgoUpdateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/sst/riesgos/${id}`, d).then(r => r.data),
    onSuccess: () => {
      toast.success('Riesgo actualizado')
      qc.invalidateQueries({ queryKey: ['gh-riesgos'] })
      setRiesgoOpenDialog(false)
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const handleRiesgoOpen = (r?: Riesgo) => {
    setRiesgoEditing(r ?? null)
    if (r) {
      setRiesgoForm({
        empresa_id: String(r.empresa_id),
        area_id: String(r.area_id ?? ''),
        fuente: r.fuente,
        descripcion: r.descripcion,
        probabilidad: r.probabilidad,
        impacto: r.impacto,
        control: r.control ?? '',
        responsable_id: r.responsable_id ? { id: r.responsable_id, nombre: r.responsable_nombre ?? '' } : null,
        fecha_revision: r.fecha_revision ?? '',
        estado: r.estado,
      })
    } else {
      setRiesgoForm({ ...EMPTY_RIESGO })
    }
    setRiesgoOpenDialog(true)
  }

  const handleRiesgoSave = () => {
    const nivel = riesgoForm.probabilidad * riesgoForm.impacto
    const payload = {
      empresa_id: Number(riesgoForm.empresa_id),
      area_id: riesgoForm.area_id ? Number(riesgoForm.area_id) : null,
      fuente: riesgoForm.fuente,
      descripcion: riesgoForm.descripcion,
      probabilidad: riesgoForm.probabilidad,
      impacto: riesgoForm.impacto,
      nivel_riesgo: nivel,
      control: riesgoForm.control || null,
      responsable_id: riesgoForm.responsable_id ? riesgoForm.responsable_id.id : null,
      fecha_revision: riesgoForm.fecha_revision || null,
      estado: riesgoForm.estado,
    }
    if (riesgoEditing) riesgoUpdateMut.mutate({ id: riesgoEditing.id, d: payload })
    else riesgoCreateMut.mutate(payload)
  }

  // ─── Inspecciones queries & mutations ────────────────────────────────────
  const { data: inspecciones = [], isLoading: inspLoading } = useQuery<Inspeccion[]>({
    queryKey: ['gh-inspecciones'],
    queryFn: () => api.get('/hcm/sst/inspecciones').then(r => r.data),
  })

  const inspCreateMut = useMutation({
    mutationFn: (d: object) => api.post('/hcm/sst/inspecciones', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Inspección registrada')
      qc.invalidateQueries({ queryKey: ['gh-inspecciones'] })
      setInspOpenDialog(false)
    },
    onError: () => toast.error('Error al registrar inspección'),
  })

  const inspUpdateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/sst/inspecciones/${id}`, d).then(r => r.data),
    onSuccess: () => {
      toast.success('Inspección actualizada')
      qc.invalidateQueries({ queryKey: ['gh-inspecciones'] })
      setInspOpenDialog(false)
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const handleInspOpen = (ins?: Inspeccion) => {
    setInspEditing(ins ?? null)
    if (ins) {
      setInspForm({
        empresa_id: String(ins.empresa_id),
        sede_id: String(ins.sede_id ?? ''),
        fecha: ins.fecha,
        tipo: ins.tipo,
        inspector_id: ins.inspector_id ? { id: ins.inspector_id, nombre: ins.inspector_nombre ?? '' } : null,
        hallazgos: ins.hallazgos ?? '',
        acciones: ins.acciones ?? '',
      })
    } else {
      setInspForm({ ...EMPTY_INSP })
    }
    setInspOpenDialog(true)
  }

  const handleInspSave = () => {
    const payload = {
      empresa_id: Number(inspForm.empresa_id),
      sede_id: inspForm.sede_id ? Number(inspForm.sede_id) : null,
      fecha: inspForm.fecha,
      tipo: inspForm.tipo,
      inspector_id: inspForm.inspector_id ? inspForm.inspector_id.id : null,
      hallazgos: inspForm.hallazgos || null,
      acciones: inspForm.acciones || null,
    }
    if (inspEditing) inspUpdateMut.mutate({ id: inspEditing.id, d: payload })
    else inspCreateMut.mutate(payload)
  }

  // ─── Derived data ─────────────────────────────────────────────────────────
  const thisYear = new Date().getFullYear()

  const accidentesCount = incidentes.filter(i => i.tipo_sst === 'ACCIDENTE').length
  const incidentesCount = incidentes.filter(i => i.tipo_sst === 'INCIDENTE').length
  const casiAccidentesCount = incidentes.filter(i => i.tipo_sst === 'CASI_ACCIDENTE').length
  const diasPerdidos = incidentes
    .filter(i => i.fecha?.startsWith(String(thisYear)))
    .reduce((acc, i) => acc + (i.dias_incapacidad || 0), 0)

  const filteredIncidentes = incidentes.filter(i => {
    if (incFilterEmpresa && String(i.empresa_id) !== incFilterEmpresa) return false
    if (incFilterTipo && i.tipo_sst !== incFilterTipo) return false
    if (incFilterEstado && i.estado !== incFilterEstado) return false
    if (incFilterDesde && i.fecha < incFilterDesde) return false
    if (incFilterHasta && i.fecha > incFilterHasta) return false
    return true
  })

  const filteredRiesgos = riesgos.filter(r => {
    if (riesgoFilterEstado && r.estado !== riesgoFilterEstado) return false
    return true
  })

  // Build risk matrix count map
  const matrixCount: Record<string, number> = {}
  riesgos.forEach(r => {
    const key = `${r.probabilidad}-${r.impacto}`
    matrixCount[key] = (matrixCount[key] ?? 0) + 1
  })

  const incIsSaving = incCreateMut.isPending || incUpdateMut.isPending
  const riesgoIsSaving = riesgoCreateMut.isPending || riesgoUpdateMut.isPending
  const inspIsSaving = inspCreateMut.isPending || inspUpdateMut.isPending

  // Sedes filtered by empresa for dialogs
  const incSedesFiltered = sedes.filter(s => !incForm.empresa_id || s.empresa_id === Number(incForm.empresa_id))
  const inspSedesFiltered = sedes.filter(s => !inspForm.empresa_id || s.empresa_id === Number(inspForm.empresa_id))

  // Computed nivel for riesgo form
  const computedNivel = riesgoForm.probabilidad * riesgoForm.impacto

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, bgcolor: alpha(GH_COLOR, 0.12), borderRadius: 2, display: 'flex' }}>
            <HealthAndSafetyIcon sx={{ color: GH_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Seguridad y Salud en el Trabajo</Typography>
            <Typography variant="body2" color="text.secondary">ISO 45001</Typography>
          </Box>
        </Stack>

        {/* Main Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 },
            '& .Mui-selected': { color: GH_COLOR },
            '& .MuiTabs-indicator': { bgcolor: GH_COLOR },
          }}
        >
          <Tab label="Incidentes y Accidentes" />
          <Tab label="Matriz de Riesgos" />
          <Tab label="Inspecciones" />
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 0: Incidentes y Accidentes
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 0 && (
          <Box>
            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: '14px', bgcolor: alpha('#EF4444', 0.07) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 30 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Accidentes</Typography>
                      <Typography variant="h4" fontWeight={700} color="#EF4444">{accidentesCount}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: '14px', bgcolor: alpha('#F59E0B', 0.07) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <WarningIcon sx={{ color: '#F59E0B', fontSize: 30 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Incidentes</Typography>
                      <Typography variant="h4" fontWeight={700} color="#F59E0B">{incidentesCount}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: '14px', bgcolor: alpha('#FBBF24', 0.07) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <ReportProblemIcon sx={{ color: '#FBBF24', fontSize: 30 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Casi-Accidentes</Typography>
                      <Typography variant="h4" fontWeight={700} color="#FBBF24">{casiAccidentesCount}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E5E7EB', borderRadius: '14px', bgcolor: alpha('#3B82F6', 0.07) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CalendarTodayIcon sx={{ color: '#3B82F6', fontSize: 30 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Días Perdidos</Typography>
                      <Typography variant="h4" fontWeight={700} color="#3B82F6">{diasPerdidos}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Filters + Button */}
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '12px', mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  select size="small" label="Empresa" value={incFilterEmpresa}
                  onChange={e => setIncFilterEmpresa(e.target.value)} sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {empresas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>)}
                </TextField>
                <TextField
                  select size="small" label="Tipo" value={incFilterTipo}
                  onChange={e => setIncFilterTipo(e.target.value)} sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {TIPO_SST_OPTS.map(t => <MenuItem key={t} value={t}>{t.replace('_', '-')}</MenuItem>)}
                </TextField>
                <TextField
                  select size="small" label="Estado" value={incFilterEstado}
                  onChange={e => setIncFilterEstado(e.target.value)} sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {ESTADO_INC_OPTS.map(e => <MenuItem key={e} value={e}>{e.replace('_', ' ')}</MenuItem>)}
                </TextField>
                <TextField
                  size="small" label="Fecha desde" type="date" value={incFilterDesde}
                  onChange={e => setIncFilterDesde(e.target.value)}
                  InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                />
                <TextField
                  size="small" label="Fecha hasta" type="date" value={incFilterHasta}
                  onChange={e => setIncFilterHasta(e.target.value)}
                  InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                />
                <Box flex={1} />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleIncOpen()}
                  sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Registrar Incidente
                </Button>
              </Stack>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px' }}>
              {incLoading ? (
                <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.05) }}>
                      {['Fecha', 'Tipo', 'Colaborador', 'Sede', 'Descripción', 'Días Inc.', 'Investigado', 'Estado', 'Acciones'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredIncidentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Sin registros</TableCell>
                      </TableRow>
                    ) : filteredIncidentes.map(inc => {
                      const tipoStyle = TIPO_SST_CHIP[inc.tipo_sst] ?? { bg: '#F3F4F6', fg: '#6B7280' }
                      return (
                        <TableRow key={inc.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDate(inc.fecha)}</TableCell>
                          <TableCell>
                            <Chip
                              label={inc.tipo_sst.replace('_', '-')}
                              size="small"
                              sx={{ bgcolor: tipoStyle.bg, color: tipoStyle.fg, fontWeight: 700, fontSize: 11 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 13 }}>{inc.colaborador_nombre || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>{inc.sede_nombre || '—'}</TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Tooltip title={inc.descripcion}>
                              <Typography variant="body2" sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {trunc(inc.descripcion, 60)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontSize: 13 }}>{inc.dias_incapacidad}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {inc.investigado
                              ? <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 20 }} />
                              : <CancelIcon sx={{ color: '#EF4444', fontSize: 20 }} />}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={inc.estado.replace('_', ' ')}
                              size="small"
                              sx={{
                                bgcolor: alpha(ESTADO_INC_CHIP[inc.estado] ?? '#9CA3AF', 0.12),
                                color: ESTADO_INC_CHIP[inc.estado] ?? '#9CA3AF',
                                fontWeight: 700, fontSize: 11,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleIncOpen(inc)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {!inc.investigado && (
                                <Tooltip title="Marcar como Investigado">
                                  <IconButton
                                    size="small"
                                    onClick={() => incMarkInvMut.mutate(inc.id)}
                                    disabled={incMarkInvMut.isPending}
                                    sx={{ color: '#16A34A' }}
                                  >
                                    <AssignmentTurnedInIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: Matriz de Riesgos
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 1 && (
          <Box>
            {/* 5×5 Visual Risk Matrix */}
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3, mb: 3 }}>
              <Typography fontWeight={700} fontSize={15} mb={2}>Mapa de Calor — Probabilidad × Impacto</Typography>
              <Stack direction="row" spacing={1} alignItems="flex-end">
                {/* Y axis label */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 5 * 52 + 4 * 4, width: 24 }}>
                  <Typography
                    fontSize={11} fontWeight={700} color="text.secondary"
                    sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
                  >
                    Impacto ▲
                  </Typography>
                </Box>
                <Box>
                  {/* Matrix grid: rows = impacto 5→1, cols = probabilidad 1→5 */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 52px)', gap: '4px' }}>
                    {[5, 4, 3, 2, 1].map(impacto =>
                      [1, 2, 3, 4, 5].map(prob => {
                        const val = prob * impacto
                        const { bg, fg } = riskColor(val)
                        const count = matrixCount[`${prob}-${impacto}`] ?? 0
                        return (
                          <Tooltip key={`${prob}-${impacto}`} title={`P${prob}×I${impacto} = ${val} | ${count} riesgo(s)`}>
                            <Box
                              sx={{
                                width: 52, height: 52, borderRadius: '8px',
                                bgcolor: bg, border: `1.5px solid ${alpha(fg, 0.3)}`,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                cursor: 'default',
                              }}
                            >
                              <Typography fontSize={14} fontWeight={700} color={fg}>{val}</Typography>
                              {count > 0 && (
                                <Box sx={{
                                  bgcolor: fg, color: '#fff', borderRadius: '50%',
                                  width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 700, lineHeight: 1,
                                }}>
                                  {count}
                                </Box>
                              )}
                            </Box>
                          </Tooltip>
                        )
                      })
                    )}
                  </Box>
                  {/* X axis label */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                    <Typography fontSize={11} fontWeight={700} color="text.secondary">
                      Probabilidad →
                    </Typography>
                  </Box>
                </Box>
                {/* Prob axis numbers */}
                <Stack spacing="4px" justifyContent="flex-start" sx={{ height: 5 * 52 + 4 * 4 }}>
                  {[5, 4, 3, 2, 1].map(p => (
                    <Box key={p} sx={{ height: 52, display: 'flex', alignItems: 'center' }}>
                      <Typography fontSize={11} color="text.secondary" fontWeight={600}>{p}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>

              {/* Legend */}
              <Stack direction="row" spacing={2} mt={2} flexWrap="wrap">
                {[
                  { label: 'Bajo (1-4)', ...riskColor(2) },
                  { label: 'Medio (5-9)', ...riskColor(6) },
                  { label: 'Alto (10-14)', ...riskColor(12) },
                  { label: 'Crítico (15-25)', ...riskColor(20) },
                ].map(({ label, bg, fg }) => (
                  <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: bg, border: `1.5px solid ${alpha(fg, 0.4)}` }} />
                    <Typography fontSize={12} color={fg} fontWeight={600}>{label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* Filters + Button */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2} flexWrap="wrap">
              <TextField
                select size="small" label="Estado" value={riesgoFilterEstado}
                onChange={e => setRiesgoFilterEstado(e.target.value)} sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {ESTADO_RIESGO_OPTS.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
              <Box flex={1} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleRiesgoOpen()}
                sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
              >
                Nuevo Riesgo
              </Button>
            </Stack>

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px' }}>
              {riesgoLoading ? (
                <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.05) }}>
                      {['Fuente', 'Área', 'Descripción', 'Prob.', 'Impacto', 'Nivel', 'Control', 'Responsable', 'Revisión', 'Estado', 'Acciones'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRiesgos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Sin registros</TableCell>
                      </TableRow>
                    ) : filteredRiesgos.map(r => {
                      const nivelStyle = riskColor(r.nivel_riesgo)
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600, maxWidth: 100 }}>{r.fuente}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{r.area_nombre || '—'}</TableCell>
                          <TableCell sx={{ maxWidth: 180 }}>
                            <Tooltip title={r.descripcion}>
                              <Typography variant="body2" sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                {trunc(r.descripcion, 60)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.probabilidad}
                              size="small"
                              sx={{ bgcolor: alpha(probColor(r.probabilidad), 0.12), color: probColor(r.probabilidad), fontWeight: 700, minWidth: 28 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.impacto}
                              size="small"
                              sx={{ bgcolor: alpha(probColor(r.impacto), 0.12), color: probColor(r.impacto), fontWeight: 700, minWidth: 28 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.nivel_riesgo}
                              size="small"
                              sx={{ bgcolor: nivelStyle.bg, color: nivelStyle.fg, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 120 }}>
                            <Tooltip title={r.control ?? ''}>
                              <Typography variant="body2" sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                {trunc(r.control, 40)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{r.responsable_nombre || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(r.fecha_revision)}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.estado.replace('_', ' ')}
                              size="small"
                              sx={{
                                bgcolor: alpha(ESTADO_RIESGO_CHIP[r.estado] ?? '#9CA3AF', 0.12),
                                color: ESTADO_RIESGO_CHIP[r.estado] ?? '#9CA3AF',
                                fontWeight: 700, fontSize: 11,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleRiesgoOpen(r)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: Inspecciones
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 2 && (
          <Box>
            <Stack direction="row" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleInspOpen()}
                sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
              >
                Nueva Inspección
              </Button>
            </Stack>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px' }}>
              {inspLoading ? (
                <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.05) }}>
                      {['Empresa', 'Sede', 'Fecha', 'Tipo', 'Inspector', 'Hallazgos', 'Estado', 'Acciones'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inspecciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Sin registros</TableCell>
                      </TableRow>
                    ) : inspecciones.map(ins => (
                      <TableRow key={ins.id} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{ins.empresa_nombre}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{ins.sede_nombre || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(ins.fecha)}</TableCell>
                        <TableCell>
                          <Chip
                            label={ins.tipo.replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 11, fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{ins.inspector_nombre || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={ins.hallazgos ?? ''}>
                            <Typography variant="body2" sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                              {trunc(ins.hallazgos, 60)}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ins.estado.replace('_', ' ')}
                            size="small"
                            sx={{
                              bgcolor: alpha(ESTADO_INSP_CHIP[ins.estado] ?? '#9CA3AF', 0.12),
                              color: ESTADO_INSP_CHIP[ins.estado] ?? '#9CA3AF',
                              fontWeight: 700, fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleInspOpen(ins)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            DIALOG: Incidente Create/Edit
        ════════════════════════════════════════════════════════════════════ */}
        <Dialog open={incOpenDialog} onClose={() => setIncOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {incEditing ? 'Editar Incidente' : 'Registrar Incidente'}
            <IconButton onClick={() => setIncOpenDialog(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Empresa *"
                  value={incForm.empresa_id}
                  onChange={e => setIncForm(prev => ({ ...prev, empresa_id: e.target.value, sede_id: '' }))}
                >
                  {empresas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Sede (opcional)"
                  value={incForm.sede_id}
                  onChange={e => setIncForm(prev => ({ ...prev, sede_id: e.target.value }))}
                >
                  <MenuItem value="">Sin sede</MenuItem>
                  {incSedesFiltered.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  options={colaboradores}
                  getOptionLabel={o => o.nombre}
                  value={incForm.colaborador_id}
                  onChange={(_, v) => setIncForm(prev => ({ ...prev, colaborador_id: v }))}
                  renderInput={params => <TextField {...params} size="small" label="Colaborador (opcional)" />}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Fecha *" type="date"
                  value={incForm.fecha}
                  onChange={e => setIncForm(prev => ({ ...prev, fecha: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Tipo SST *"
                  value={incForm.tipo_sst}
                  onChange={e => setIncForm(prev => ({ ...prev, tipo_sst: e.target.value }))}
                >
                  {TIPO_SST_OPTS.map(t => <MenuItem key={t} value={t}>{t.replace('_', '-')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Días de Incapacidad" type="number"
                  value={incForm.dias_incapacidad}
                  onChange={e => setIncForm(prev => ({ ...prev, dias_incapacidad: e.target.value }))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Descripción *" multiline rows={3}
                  value={incForm.descripcion}
                  onChange={e => setIncForm(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Causa (opcional)" multiline rows={2}
                  value={incForm.causa}
                  onChange={e => setIncForm(prev => ({ ...prev, causa: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Consecuencias (opcional)" multiline rows={2}
                  value={incForm.consecuencias}
                  onChange={e => setIncForm(prev => ({ ...prev, consecuencias: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Medidas Correctivas (opcional)" multiline rows={2}
                  value={incForm.medidas_correctivas}
                  onChange={e => setIncForm(prev => ({ ...prev, medidas_correctivas: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIncOpenDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleIncSave}
              disabled={incIsSaving || !incForm.empresa_id || !incForm.fecha || !incForm.descripcion}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}
            >
              {incIsSaving ? <CircularProgress size={18} color="inherit" /> : incEditing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════
            DIALOG: Riesgo Create/Edit
        ════════════════════════════════════════════════════════════════════ */}
        <Dialog open={riesgoOpenDialog} onClose={() => setRiesgoOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {riesgoEditing ? 'Editar Riesgo' : 'Nuevo Riesgo'}
            <IconButton onClick={() => setRiesgoOpenDialog(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Empresa"
                  value={riesgoForm.empresa_id}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, empresa_id: e.target.value }))}
                >
                  {empresas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Área (opcional)"
                  value={riesgoForm.area_id}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, area_id: e.target.value }))}
                >
                  <MenuItem value="">Sin área</MenuItem>
                  {areas.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Fuente *"
                  value={riesgoForm.fuente}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, fuente: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Estado"
                  value={riesgoForm.estado}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, estado: e.target.value }))}
                >
                  {ESTADO_RIESGO_OPTS.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Descripción *" multiline rows={3}
                  value={riesgoForm.descripcion}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </Grid>

              {/* Probabilidad Slider */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography fontSize={13} fontWeight={600} color="text.secondary" mb={1}>
                  Probabilidad: <strong style={{ color: probColor(riesgoForm.probabilidad) }}>{riesgoForm.probabilidad}</strong>
                </Typography>
                <Slider
                  value={riesgoForm.probabilidad}
                  min={1} max={5} step={1}
                  marks={PROB_MARKS}
                  onChange={(_, v) => setRiesgoForm(prev => ({ ...prev, probabilidad: v as number }))}
                  sx={{ color: probColor(riesgoForm.probabilidad) }}
                />
              </Grid>

              {/* Impacto Slider */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography fontSize={13} fontWeight={600} color="text.secondary" mb={1}>
                  Impacto: <strong style={{ color: probColor(riesgoForm.impacto) }}>{riesgoForm.impacto}</strong>
                </Typography>
                <Slider
                  value={riesgoForm.impacto}
                  min={1} max={5} step={1}
                  marks={IMPACTO_MARKS}
                  onChange={(_, v) => setRiesgoForm(prev => ({ ...prev, impacto: v as number }))}
                  sx={{ color: probColor(riesgoForm.impacto) }}
                />
              </Grid>

              {/* Nivel auto-computed */}
              <Grid size={{ xs: 12 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography fontSize={13} fontWeight={600} color="text.secondary">Nivel de Riesgo (auto):</Typography>
                  <Chip
                    label={`Nivel: ${computedNivel}`}
                    sx={{
                      bgcolor: riskColor(computedNivel).bg,
                      color: riskColor(computedNivel).fg,
                      fontWeight: 700, fontSize: 13,
                    }}
                  />
                </Stack>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Control (opcional)" multiline rows={2}
                  value={riesgoForm.control}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, control: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  options={colaboradores}
                  getOptionLabel={o => o.nombre}
                  value={riesgoForm.responsable_id}
                  onChange={(_, v) => setRiesgoForm(prev => ({ ...prev, responsable_id: v }))}
                  renderInput={params => <TextField {...params} size="small" label="Responsable (opcional)" />}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Fecha Revisión" type="date"
                  value={riesgoForm.fecha_revision}
                  onChange={e => setRiesgoForm(prev => ({ ...prev, fecha_revision: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRiesgoOpenDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleRiesgoSave}
              disabled={riesgoIsSaving || !riesgoForm.fuente || !riesgoForm.descripcion}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}
            >
              {riesgoIsSaving ? <CircularProgress size={18} color="inherit" /> : riesgoEditing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════
            DIALOG: Inspección Create/Edit
        ════════════════════════════════════════════════════════════════════ */}
        <Dialog open={inspOpenDialog} onClose={() => setInspOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {inspEditing ? 'Editar Inspección' : 'Nueva Inspección'}
            <IconButton onClick={() => setInspOpenDialog(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Empresa *"
                  value={inspForm.empresa_id}
                  onChange={e => setInspForm(prev => ({ ...prev, empresa_id: e.target.value, sede_id: '' }))}
                >
                  {empresas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Sede (opcional)"
                  value={inspForm.sede_id}
                  onChange={e => setInspForm(prev => ({ ...prev, sede_id: e.target.value }))}
                >
                  <MenuItem value="">Sin sede</MenuItem>
                  {inspSedesFiltered.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Fecha *" type="date"
                  value={inspForm.fecha}
                  onChange={e => setInspForm(prev => ({ ...prev, fecha: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select fullWidth size="small" label="Tipo"
                  value={inspForm.tipo}
                  onChange={e => setInspForm(prev => ({ ...prev, tipo: e.target.value }))}
                >
                  {TIPO_INSP_OPTS.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={colaboradores}
                  getOptionLabel={o => o.nombre}
                  value={inspForm.inspector_id}
                  onChange={(_, v) => setInspForm(prev => ({ ...prev, inspector_id: v }))}
                  renderInput={params => <TextField {...params} size="small" label="Inspector (opcional)" />}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Hallazgos (opcional)" multiline rows={3}
                  value={inspForm.hallazgos}
                  onChange={e => setInspForm(prev => ({ ...prev, hallazgos: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Acciones (opcional)" multiline rows={2}
                  value={inspForm.acciones}
                  onChange={e => setInspForm(prev => ({ ...prev, acciones: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setInspOpenDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleInspSave}
              disabled={inspIsSaving || !inspForm.empresa_id || !inspForm.fecha}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}
            >
              {inspIsSaving ? <CircularProgress size={18} color="inherit" /> : inspEditing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
