import React, { useState, useCallback } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Tabs, Tab, Tooltip,
  CircularProgress, alpha, Chip, Skeleton, Alert, Autocomplete,
  Table, TableHead, TableRow, TableCell, TableBody, Card, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Groups as GroupsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GH_COLOR = '#BE185D'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Colaborador {
  id: number
  codigo?: string
  nombres: string
  apellidos: string
  tipo_documento?: string
  numero_documento?: string
  fecha_nacimiento?: string
  genero?: string
  email?: string
  telefono?: string
  empresa_id?: number
  empresa_nombre?: string
  sede_id?: number
  area_id?: number
  area_nombre?: string
  cargo_id?: number
  cargo_nombre?: string
  centro_costo_id?: number
  jefe_id?: number
  tipo_contrato?: string
  fecha_ingreso?: string
  salario_base?: number
  tipo_salario?: string
  auxilio_transporte?: number
  estado_laboral?: string
  usuario_id?: number | null
}

interface CatalogItem { id: number; nombre: string }

interface Contrato {
  id: number
  colaborador_id: number
  tipo_contrato: string
  fecha_inicio: string
  fecha_fin?: string
  salario?: number
  notas?: string
  estado?: string
}

interface HistorialItem {
  id: number
  campo: string
  valor_anterior?: string
  valor_nuevo?: string
  fecha_cambio: string
  usuario_nombre?: string
}

interface PaginatedResponse {
  items: Colaborador[]
  total: number
  page: number
  per_page: number
  pages: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ESTADOS_LABORALES = ['ACTIVO', 'INACTIVO', 'VACACIONES', 'INCAPACIDAD', 'RETIRADO', 'SUSPENSION']
const TIPOS_DOCUMENTO = ['CC', 'CE', 'PA', 'NIT', 'TI']
const GENEROS = ['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERO_NO_DECIR']
const TIPOS_CONTRATO = ['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'PRESTACION_SERVICIOS', 'APRENDIZAJE', 'TEMPORAL']
const TIPOS_SALARIO = ['FIJO', 'VARIABLE', 'INTEGRAL']

const ESTADO_COLORES: Record<string, { bg: string; color: string }> = {
  ACTIVO:      { bg: '#DCFCE7', color: '#166534' },
  INACTIVO:    { bg: '#F3F4F6', color: '#6B7280' },
  VACACIONES:  { bg: '#DBEAFE', color: '#1D4ED8' },
  INCAPACIDAD: { bg: '#FEF3C7', color: '#92400E' },
  RETIRADO:    { bg: '#FEE2E2', color: '#991B1B' },
  SUSPENSION:  { bg: '#FEF9C3', color: '#713F12' },
}

const HISTORIAL_COLORES = [GH_COLOR, '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626']

function estadoAvatar(estado?: string) {
  const map: Record<string, string> = {
    ACTIVO: '#166534', INACTIVO: '#6B7280', VACACIONES: '#1D4ED8',
    INCAPACIDAD: '#92400E', RETIRADO: '#991B1B', SUSPENSION: '#713F12',
  }
  return map[estado ?? ''] ?? '#6B7280'
}

function initials(nombres: string, apellidos: string) {
  const n = nombres.trim().split(' ')[0]?.[0] ?? ''
  const a = apellidos.trim().split(' ')[0]?.[0] ?? ''
  return (n + a).toUpperCase()
}

function formatCOP(value?: number) {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

// ─── Shared: StepIndicator ────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
      {Array.from({ length: total }).map((_, i) => (
        <Box key={i} sx={{
          width: i === current - 1 ? 24 : 8, height: 8, borderRadius: 4,
          bgcolor: i === current - 1 ? GH_COLOR : alpha(GH_COLOR, 0.2),
          transition: 'all 0.2s',
        }} />
      ))}
      <Typography fontSize={12} color="text.secondary" ml={0.5}>Paso {current}/{total}</Typography>
    </Stack>
  )
}

// ─── Step forms ───────────────────────────────────────────────────────────────
type FormPersonal = {
  tipo_documento: string; numero_documento: string; nombres: string; apellidos: string
  fecha_nacimiento: string; genero: string; email: string; telefono: string
}
type FormLaboral = {
  empresa_id: string; sede_id: string; area_id: string; cargo_id: string
  centro_costo_id: string; jefe_id: string; tipo_contrato: string; fecha_ingreso: string
}
type FormSalarial = { salario_base: string; tipo_salario: string; auxilio_transporte: string }

const BLANK_PERSONAL: FormPersonal = { tipo_documento: '', numero_documento: '', nombres: '', apellidos: '', fecha_nacimiento: '', genero: '', email: '', telefono: '' }
const BLANK_LABORAL: FormLaboral = { empresa_id: '', sede_id: '', area_id: '', cargo_id: '', centro_costo_id: '', jefe_id: '', tipo_contrato: '', fecha_ingreso: '' }
const BLANK_SALARIAL: FormSalarial = { salario_base: '', tipo_salario: '', auxilio_transporte: '' }

function StepPersonal({ form, onChange }: { form: FormPersonal; onChange: (k: keyof FormPersonal, v: string) => void }) {
  return (
    <Stack gap={1.5}>
      <Stack direction="row" gap={1.5}>
        <TextField select label="Tipo Documento *" size="small" value={form.tipo_documento} onChange={e => onChange('tipo_documento', e.target.value)} sx={{ flex: 1 }}>
          {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField label="Número Documento *" size="small" value={form.numero_documento} onChange={e => onChange('numero_documento', e.target.value)} sx={{ flex: 2 }} />
      </Stack>
      <Stack direction="row" gap={1.5}>
        <TextField label="Nombres *" size="small" value={form.nombres} onChange={e => onChange('nombres', e.target.value)} sx={{ flex: 1 }} />
        <TextField label="Apellidos *" size="small" value={form.apellidos} onChange={e => onChange('apellidos', e.target.value)} sx={{ flex: 1 }} />
      </Stack>
      <Stack direction="row" gap={1.5}>
        <TextField label="Fecha Nacimiento" size="small" type="date" value={form.fecha_nacimiento} onChange={e => onChange('fecha_nacimiento', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
        <TextField select label="Género" size="small" value={form.genero} onChange={e => onChange('genero', e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="">No especificado</MenuItem>
          {GENEROS.map(g => <MenuItem key={g} value={g}>{g.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
      </Stack>
      <Stack direction="row" gap={1.5}>
        <TextField label="Email" size="small" type="email" value={form.email} onChange={e => onChange('email', e.target.value)} sx={{ flex: 1 }} />
        <TextField label="Teléfono" size="small" value={form.telefono} onChange={e => onChange('telefono', e.target.value)} sx={{ flex: 1 }} />
      </Stack>
    </Stack>
  )
}

function StepLaboral({ form, onChange }: { form: FormLaboral; onChange: (k: keyof FormLaboral, v: string) => void }) {
  const empId = form.empresa_id ? Number(form.empresa_id) : undefined

  const { data: empresas = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-empresas'], queryFn: () => api.get('/hcm/empresas').then(r => r.data) })
  const { data: sedes = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-sedes', empId], queryFn: () => api.get(`/hcm/sedes${empId ? `?empresa_id=${empId}` : ''}`).then(r => r.data), enabled: true })
  const { data: areas = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-areas', empId], queryFn: () => api.get(`/hcm/areas${empId ? `?empresa_id=${empId}` : ''}`).then(r => r.data), enabled: true })
  const { data: cargos = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-cargos', empId], queryFn: () => api.get(`/hcm/cargos${empId ? `?empresa_id=${empId}` : ''}`).then(r => r.data), enabled: true })
  const { data: centros = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-centros-costo', empId], queryFn: () => api.get(`/hcm/centros-costo${empId ? `?empresa_id=${empId}` : ''}`).then(r => r.data), enabled: true })
  const { data: colabData } = useQuery<PaginatedResponse>({ queryKey: ['hcm-colab-jefes'], queryFn: () => api.get('/hcm/colaboradores?per_page=100').then(r => r.data) })
  const jefes = colabData?.items ?? []

  return (
    <Stack gap={1.5}>
      <TextField select label="Empresa *" size="small" fullWidth value={form.empresa_id} onChange={e => { onChange('empresa_id', e.target.value); onChange('sede_id', ''); onChange('area_id', ''); onChange('cargo_id', ''); onChange('centro_costo_id', '') }}>
        <MenuItem value="">Seleccione...</MenuItem>
        {empresas.map(e => <MenuItem key={e.id} value={e.id.toString()}>{e.nombre}</MenuItem>)}
      </TextField>
      <Stack direction="row" gap={1.5}>
        <TextField select label="Sede" size="small" value={form.sede_id} onChange={e => onChange('sede_id', e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="">Sin sede</MenuItem>
          {sedes.map(s => <MenuItem key={s.id} value={s.id.toString()}>{s.nombre}</MenuItem>)}
        </TextField>
        <TextField select label="Área" size="small" value={form.area_id} onChange={e => onChange('area_id', e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="">Sin área</MenuItem>
          {areas.map(a => <MenuItem key={a.id} value={a.id.toString()}>{a.nombre}</MenuItem>)}
        </TextField>
      </Stack>
      <Stack direction="row" gap={1.5}>
        <TextField select label="Cargo" size="small" value={form.cargo_id} onChange={e => onChange('cargo_id', e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="">Sin cargo</MenuItem>
          {cargos.map(c => <MenuItem key={c.id} value={c.id.toString()}>{c.nombre}</MenuItem>)}
        </TextField>
        <TextField select label="Centro de Costo" size="small" value={form.centro_costo_id} onChange={e => onChange('centro_costo_id', e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="">Sin centro</MenuItem>
          {centros.map(c => <MenuItem key={c.id} value={c.id.toString()}>{c.nombre}</MenuItem>)}
        </TextField>
      </Stack>
      <TextField select label="Jefe Directo" size="small" fullWidth value={form.jefe_id} onChange={e => onChange('jefe_id', e.target.value)}>
        <MenuItem value="">Sin jefe</MenuItem>
        {jefes.map(j => <MenuItem key={j.id} value={j.id.toString()}>{j.nombres} {j.apellidos}</MenuItem>)}
      </TextField>
      <Stack direction="row" gap={1.5}>
        <TextField select label="Tipo Contrato" size="small" value={form.tipo_contrato} onChange={e => onChange('tipo_contrato', e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="">Seleccione...</MenuItem>
          {TIPOS_CONTRATO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
        <TextField label="Fecha Ingreso" size="small" type="date" value={form.fecha_ingreso} onChange={e => onChange('fecha_ingreso', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
      </Stack>
    </Stack>
  )
}

function StepSalarial({ form, onChange }: { form: FormSalarial; onChange: (k: keyof FormSalarial, v: string) => void }) {
  return (
    <Stack gap={1.5}>
      <TextField label="Salario Base (COP)" size="small" type="number" fullWidth value={form.salario_base} onChange={e => onChange('salario_base', e.target.value)} />
      <TextField select label="Tipo Salario" size="small" fullWidth value={form.tipo_salario} onChange={e => onChange('tipo_salario', e.target.value)}>
        <MenuItem value="">Seleccione...</MenuItem>
        {TIPOS_SALARIO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
      </TextField>
      <TextField label="Auxilio de Transporte (COP)" size="small" type="number" fullWidth value={form.auxilio_transporte} onChange={e => onChange('auxilio_transporte', e.target.value)} />
    </Stack>
  )
}

// ─── Colaborador dialog (create/edit) ────────────────────────────────────────
function ColaboradorDialog({
  open, onClose, editing,
}: {
  open: boolean
  onClose: () => void
  editing: Colaborador | null
}) {
  const qc = useQueryClient()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [personal, setPersonal] = useState<FormPersonal>(BLANK_PERSONAL)
  const [laboral, setLaboral] = useState<FormLaboral>(BLANK_LABORAL)
  const [salarial, setSalarial] = useState<FormSalarial>(BLANK_SALARIAL)

  React.useEffect(() => {
    if (!open) return
    setStep(1); setError('')
    if (editing) {
      setPersonal({
        tipo_documento: editing.tipo_documento ?? '',
        numero_documento: editing.numero_documento ?? '',
        nombres: editing.nombres,
        apellidos: editing.apellidos,
        fecha_nacimiento: editing.fecha_nacimiento ?? '',
        genero: editing.genero ?? '',
        email: editing.email ?? '',
        telefono: editing.telefono ?? '',
      })
      setLaboral({
        empresa_id: editing.empresa_id?.toString() ?? '',
        sede_id: editing.sede_id?.toString() ?? '',
        area_id: editing.area_id?.toString() ?? '',
        cargo_id: editing.cargo_id?.toString() ?? '',
        centro_costo_id: editing.centro_costo_id?.toString() ?? '',
        jefe_id: editing.jefe_id?.toString() ?? '',
        tipo_contrato: editing.tipo_contrato ?? '',
        fecha_ingreso: editing.fecha_ingreso ?? '',
      })
      setSalarial({
        salario_base: editing.salario_base?.toString() ?? '',
        tipo_salario: editing.tipo_salario ?? '',
        auxilio_transporte: editing.auxilio_transporte?.toString() ?? '',
      })
    } else {
      setPersonal(BLANK_PERSONAL); setLaboral(BLANK_LABORAL); setSalarial(BLANK_SALARIAL)
    }
  }, [open, editing])

  const setPField = useCallback((k: keyof FormPersonal, v: string) => setPersonal(f => ({ ...f, [k]: v })), [])
  const setLField = useCallback((k: keyof FormLaboral, v: string) => setLaboral(f => ({ ...f, [k]: v })), [])
  const setSField = useCallback((k: keyof FormSalarial, v: string) => setSalarial(f => ({ ...f, [k]: v })), [])

  const validateStep = () => {
    if (step === 1) {
      if (!personal.tipo_documento || !personal.numero_documento || !personal.nombres || !personal.apellidos) {
        setError('Tipo doc, número, nombres y apellidos son obligatorios'); return false
      }
    }
    if (step === 2) {
      if (!laboral.empresa_id) { setError('La empresa es obligatoria'); return false }
    }
    setError(''); return true
  }

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing
        ? api.put(`/hcm/colaboradores/${editing.id}`, payload).then(r => r.data)
        : api.post('/hcm/colaboradores', payload).then(r => r.data),
    onSuccess: () => {
      toast.success(editing ? 'Colaborador actualizado' : 'Colaborador creado')
      qc.invalidateQueries({ queryKey: ['hcm-colaboradores'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al guardar'
      setError(msg)
    },
  })

  const handleNext = () => { if (validateStep()) setStep(s => s + 1) }
  const handleBack = () => { setError(''); setStep(s => s - 1) }

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = {
      tipo_documento: personal.tipo_documento,
      numero_documento: personal.numero_documento,
      nombres: personal.nombres,
      apellidos: personal.apellidos,
    }
    if (personal.fecha_nacimiento) p.fecha_nacimiento = personal.fecha_nacimiento
    if (personal.genero) p.genero = personal.genero
    if (personal.email) p.email = personal.email
    if (personal.telefono) p.telefono = personal.telefono
    if (laboral.empresa_id) p.empresa_id = Number(laboral.empresa_id)
    if (laboral.sede_id) p.sede_id = Number(laboral.sede_id)
    if (laboral.area_id) p.area_id = Number(laboral.area_id)
    if (laboral.cargo_id) p.cargo_id = Number(laboral.cargo_id)
    if (laboral.centro_costo_id) p.centro_costo_id = Number(laboral.centro_costo_id)
    if (laboral.jefe_id) p.jefe_id = Number(laboral.jefe_id)
    if (laboral.tipo_contrato) p.tipo_contrato = laboral.tipo_contrato
    if (laboral.fecha_ingreso) p.fecha_ingreso = laboral.fecha_ingreso
    if (salarial.salario_base) p.salario_base = Number(salarial.salario_base)
    if (salarial.tipo_salario) p.tipo_salario = salarial.tipo_salario
    if (salarial.auxilio_transporte) p.auxilio_transporte = Number(salarial.auxilio_transporte)
    return p
  }

  const handleSave = () => { if (validateStep()) saveMutation.mutate(buildPayload()) }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 0 }}>
        {editing ? 'Editar Colaborador' : 'Nuevo Colaborador'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <StepIndicator current={step} total={3} />
        {error && <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>{error}</Alert>}
        {step === 1 && <StepPersonal form={personal} onChange={setPField} />}
        {step === 2 && <StepLaboral form={laboral} onChange={setLField} />}
        {step === 3 && <StepSalarial form={salarial} onChange={setSField} />}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
        {step > 1 && <Button size="small" onClick={handleBack} startIcon={<ChevronLeftIcon />} sx={{ textTransform: 'none' }}>Anterior</Button>}
        {step < 3 && (
          <Button size="small" variant="contained" onClick={handleNext} endIcon={<ChevronRightIcon />}
            sx={{ textTransform: 'none', bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}>
            Siguiente
          </Button>
        )}
        {step === 3 && (
          <Button size="small" variant="contained" onClick={handleSave} disabled={saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}>
            Guardar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Delete dialog ─────────────────────────────────────────────────────────────
function DeleteDialog({ open, onClose, colaborador }: { open: boolean; onClose: () => void; colaborador: Colaborador | null }) {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const del = useMutation({
    mutationFn: () => api.delete(`/hcm/colaboradores/${colaborador!.id}`),
    onSuccess: () => {
      toast.success('Colaborador eliminado')
      qc.invalidateQueries({ queryKey: ['hcm-colaboradores'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al eliminar'
      setError(msg)
    },
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Eliminar Colaborador</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: 12 }}>{error}</Alert>}
        <Typography fontSize={13} color="text.secondary">
          ¿Está seguro de eliminar a <strong>{colaborador?.nombres} {colaborador?.apellidos}</strong>? Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button size="small" variant="contained" color="error" disabled={del.isPending} onClick={() => del.mutate()}
          startIcon={del.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
          sx={{ textTransform: 'none' }}>
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Asignar usuario dialog ───────────────────────────────────────────────────
function AsignarUsuarioDialog({ open, onClose, colaborador }: { open: boolean; onClose: () => void; colaborador: Colaborador | null }) {
  const qc = useQueryClient()
  const [usuarioId, setUsuarioId] = useState('')
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) { setUsuarioId(colaborador?.usuario_id?.toString() ?? ''); setError('') }
  }, [open, colaborador])

  const assign = useMutation({
    mutationFn: () => api.post(`/hcm/colaboradores/${colaborador!.id}/asignar-usuario`, { usuario_id: usuarioId ? Number(usuarioId) : null }),
    onSuccess: () => {
      toast.success('Usuario vinculado correctamente')
      qc.invalidateQueries({ queryKey: ['hcm-colaboradores'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al asignar usuario'
      setError(msg)
    },
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Vincular cuenta de usuario</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: 12 }}>{error}</Alert>}
        <Typography fontSize={12} color="text.secondary" mb={2}>
          Esto permite que este colaborador acceda al sistema con el usuario especificado. Opcional.
        </Typography>
        <TextField
          label="ID de Usuario del Sistema (dejar vacío para desvincular)"
          size="small" type="number" fullWidth
          value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button size="small" variant="contained" disabled={assign.isPending} onClick={() => assign.mutate()}
          startIcon={assign.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
          sx={{ textTransform: 'none', bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Tab 0: Directorio ─────────────────────────────────────────────────────────
function DirectorioTab() {
  const [search, setSearch] = useState('')
  const [areaId, setAreaId] = useState('')
  const [cargoId, setCargoId] = useState('')
  const [estadoLaboral, setEstadoLaboral] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Colaborador | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Colaborador | null>(null)
  const [asignarOpen, setAsignarOpen] = useState(false)
  const [asignarTarget, setAsignarTarget] = useState<Colaborador | null>(null)

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', String(PER_PAGE))
  if (search) params.set('search', search)
  if (areaId) params.set('area_id', areaId)
  if (cargoId) params.set('cargo_id', cargoId)
  if (estadoLaboral) params.set('estado_laboral', estadoLaboral)

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['hcm-colaboradores', search, areaId, cargoId, estadoLaboral, page],
    queryFn: () => api.get(`/hcm/colaboradores?${params.toString()}`).then(r => r.data),
  })

  const { data: areas = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-areas'], queryFn: () => api.get('/hcm/areas').then(r => r.data) })
  const { data: cargos = [] } = useQuery<CatalogItem[]>({ queryKey: ['hcm-cargos'], queryFn: () => api.get('/hcm/cargos').then(r => r.data) })

  const items = data?.items ?? []
  const totalPages = data?.pages ?? 1

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (c: Colaborador) => { setEditing(c); setDialogOpen(true) }
  const openDelete = (c: Colaborador) => { setDeleteTarget(c); setDeleteOpen(true) }
  const openAsignar = (c: Colaborador) => { setAsignarTarget(c); setAsignarOpen(true) }

  return (
    <Box>
      {/* Filter bar */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
          <TextField
            size="small" placeholder="Buscar colaborador..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} /></InputAdornment> }}
            sx={{ flex: 2, minWidth: 200 }}
          />
          <TextField select size="small" label="Área" value={areaId} onChange={e => { setAreaId(e.target.value); setPage(1) }} sx={{ flex: 1, minWidth: 140 }}>
            <MenuItem value="">Todas</MenuItem>
            {areas.map(a => <MenuItem key={a.id} value={a.id.toString()}>{a.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Cargo" value={cargoId} onChange={e => { setCargoId(e.target.value); setPage(1) }} sx={{ flex: 1, minWidth: 140 }}>
            <MenuItem value="">Todos</MenuItem>
            {cargos.map(c => <MenuItem key={c.id} value={c.id.toString()}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estado" value={estadoLaboral} onChange={e => { setEstadoLaboral(e.target.value); setPage(1) }} sx={{ flex: 1, minWidth: 140 }}>
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS_LABORALES.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </TextField>
          <Button size="small" variant="contained" onClick={openNew}
            sx={{ textTransform: 'none', bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '8px', flexShrink: 0 }}>
            + Nuevo Colaborador
          </Button>
        </Stack>
      </Card>

      {/* Table */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', width: 48 }}></TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Código</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Cargo</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Área</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Contrato</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Estado</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Fecha Ingreso</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}><Skeleton variant="text" width={j === 0 ? 32 : '80%'} height={j === 0 ? 32 : 16} sx={{ borderRadius: j === 0 ? '50%' : 1 }} /></TableCell>
                  ))}
                </TableRow>
              ))
              : items.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF', fontSize: 13 }}>
                      No se encontraron colaboradores
                    </TableCell>
                  </TableRow>
                )
                : items.map(colab => {
                  const estadoCfg = ESTADO_COLORES[colab.estado_laboral ?? ''] ?? { bg: '#F3F4F6', color: '#6B7280' }
                  return (
                    <TableRow key={colab.id} hover sx={{ '&:hover': { bgcolor: alpha(GH_COLOR, 0.03) } }}>
                      <TableCell>
                        <Box sx={{
                          width: 32, height: 32, borderRadius: '50%',
                          bgcolor: alpha(estadoAvatar(colab.estado_laboral), 0.15),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Typography fontSize={11} fontWeight={700} color={estadoAvatar(colab.estado_laboral)}>
                            {initials(colab.nombres, colab.apellidos)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#6B7280' }}>{colab.codigo ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{colab.nombres} {colab.apellidos}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{colab.cargo_nombre ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{colab.area_nombre ?? '—'}</TableCell>
                      <TableCell>
                        {colab.tipo_contrato
                          ? <Chip label={colab.tipo_contrato.replace(/_/g, ' ')} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(GH_COLOR, 0.1), color: GH_COLOR, fontWeight: 600 }} />
                          : <Typography fontSize={12} color="#9CA3AF">—</Typography>}
                      </TableCell>
                      <TableCell>
                        {colab.estado_laboral
                          ? <Chip label={colab.estado_laboral} size="small" sx={{ fontSize: 10, height: 20, bgcolor: estadoCfg.bg, color: estadoCfg.color, fontWeight: 700 }} />
                          : <Typography fontSize={12} color="#9CA3AF">—</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{colab.fecha_ingreso ?? '—'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Stack direction="row" gap={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(colab)}><EditIcon sx={{ fontSize: 14, color: '#9CA3AF' }} /></IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={() => openDelete(colab)}><DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton>
                          </Tooltip>
                          <Tooltip title="Vincular usuario">
                            <IconButton size="small" onClick={() => openAsignar(colab)}><PersonAddIcon sx={{ fontSize: 14, color: GH_COLOR }} /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })
            }
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && items.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography fontSize={12} color="text.secondary">
              Página {data?.page ?? 1} de {totalPages} — {data?.total ?? 0} colaboradores
            </Typography>
            <Stack direction="row" gap={0.5}>
              <Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                startIcon={<ChevronLeftIcon />} sx={{ textTransform: 'none', fontSize: 12 }}>
                Anterior
              </Button>
              <Button size="small" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                endIcon={<ChevronRightIcon />} sx={{ textTransform: 'none', fontSize: 12 }}>
                Siguiente
              </Button>
            </Stack>
          </Box>
        )}
      </Card>

      <ColaboradorDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />
      <DeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} colaborador={deleteTarget} />
      <AsignarUsuarioDialog open={asignarOpen} onClose={() => setAsignarOpen(false)} colaborador={asignarTarget} />
    </Box>
  )
}

// ─── Tab 1: Contratos ──────────────────────────────────────────────────────────
function ContratosTab() {
  const qc = useQueryClient()
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [contratoOpen, setContratoOpen] = useState(false)
  const [contratoError, setContratoError] = useState('')
  const [contratoForm, setContratoForm] = useState({ tipo_contrato: '', fecha_inicio: '', fecha_fin: '', salario: '', notas: '' })
  const setCF = (k: string, v: string) => setContratoForm(f => ({ ...f, [k]: v }))

  const { data: searchData } = useQuery<PaginatedResponse>({
    queryKey: ['hcm-colab-search', searchInput],
    queryFn: () => api.get(`/hcm/colaboradores?search=${encodeURIComponent(searchInput)}&per_page=20`).then(r => r.data),
    enabled: searchInput.length > 0,
  })
  const colabOptions = searchData?.items ?? []

  const { data: contratos = [], isLoading: loadingContratos } = useQuery<Contrato[]>({
    queryKey: ['hcm-contratos', selectedColab?.id],
    queryFn: () => api.get(`/hcm/contratos?colaborador_id=${selectedColab!.id}`).then(r => r.data),
    enabled: !!selectedColab,
  })

  const createContrato = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/hcm/contratos', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Contrato creado')
      qc.invalidateQueries({ queryKey: ['hcm-contratos', selectedColab?.id] })
      setContratoOpen(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al crear contrato'
      setContratoError(msg)
    },
  })

  const handleContratoSubmit = () => {
    if (!contratoForm.tipo_contrato || !contratoForm.fecha_inicio) { setContratoError('Tipo y fecha de inicio son obligatorios'); return }
    const payload: Record<string, unknown> = {
      colaborador_id: selectedColab!.id,
      tipo_contrato: contratoForm.tipo_contrato,
      fecha_inicio: contratoForm.fecha_inicio,
    }
    if (contratoForm.fecha_fin) payload.fecha_fin = contratoForm.fecha_fin
    if (contratoForm.salario) payload.salario = Number(contratoForm.salario)
    if (contratoForm.notas) payload.notas = contratoForm.notas
    createContrato.mutate(payload)
  }

  const CONTRATO_COLORES: Record<string, { bg: string; color: string }> = {
    INDEFINIDO:           { bg: '#DCFCE7', color: '#166534' },
    FIJO:                 { bg: '#DBEAFE', color: '#1D4ED8' },
    OBRA_LABOR:           { bg: '#FEF3C7', color: '#92400E' },
    PRESTACION_SERVICIOS: { bg: '#F3E8FF', color: '#6D28D9' },
    APRENDIZAJE:          { bg: '#FEE2E2', color: '#991B1B' },
    TEMPORAL:             { bg: '#E0F2FE', color: '#0369A1' },
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', p: 2 }}>
            <Typography fontSize={13} fontWeight={700} mb={1.5}>Seleccionar Colaborador</Typography>
            <Autocomplete
              options={colabOptions}
              getOptionLabel={o => `${o.nombres} ${o.apellidos}${o.codigo ? ` (${o.codigo})` : ''}`}
              inputValue={searchInput}
              onInputChange={(_, v) => setSearchInput(v)}
              onChange={(_, v) => setSelectedColab(v)}
              value={selectedColab}
              renderInput={params => <TextField {...params} size="small" label="Buscar colaborador" placeholder="Escriba para buscar..." />}
              noOptionsText="Sin resultados"
              loadingText="Buscando..."
              size="small"
            />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {!selectedColab ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, border: '1px dashed #E5E7EB', borderRadius: '12px' }}>
              <Typography fontSize={13} color="text.secondary">Seleccione un colaborador para ver sus contratos</Typography>
            </Box>
          ) : (
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography fontSize={13} fontWeight={700}>{selectedColab.nombres} {selectedColab.apellidos} — Contratos</Typography>
                <Button size="small" variant="outlined" onClick={() => { setContratoForm({ tipo_contrato: '', fecha_inicio: '', fecha_fin: '', salario: '', notas: '' }); setContratoError(''); setContratoOpen(true) }}
                  sx={{ textTransform: 'none', fontSize: 12, borderColor: alpha(GH_COLOR, 0.5), color: GH_COLOR }}>
                  + Nuevo Contrato
                </Button>
              </Box>
              {loadingContratos ? (
                <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: GH_COLOR }} /></Box>
              ) : contratos.length === 0 ? (
                <Typography fontSize={13} color="text.secondary" textAlign="center" py={4}>Sin contratos registrados</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Tipo</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Inicio</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Fin</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Salario</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contratos.map(c => {
                      const cfg = CONTRATO_COLORES[c.tipo_contrato] ?? { bg: '#F3F4F6', color: '#374151' }
                      return (
                        <TableRow key={c.id} hover>
                          <TableCell><Chip label={c.tipo_contrato.replace(/_/g, ' ')} size="small" sx={{ fontSize: 10, height: 20, bgcolor: cfg.bg, color: cfg.color, fontWeight: 700 }} /></TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{c.fecha_inicio}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: c.fecha_fin ? 'text.primary' : '#9CA3AF' }}>{c.fecha_fin ?? 'Indefinido'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{formatCOP(c.salario)}</TableCell>
                          <TableCell>
                            {c.estado && <Chip label={c.estado} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#F3F4F6', color: '#374151' }} />}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Nuevo Contrato dialog */}
      <Dialog open={contratoOpen} onClose={() => setContratoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Nuevo Contrato</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {contratoError && <Alert severity="error" sx={{ mb: 1.5, fontSize: 12 }}>{contratoError}</Alert>}
          <Stack gap={1.5}>
            <TextField select label="Tipo Contrato *" size="small" fullWidth value={contratoForm.tipo_contrato} onChange={e => setCF('tipo_contrato', e.target.value)}>
              <MenuItem value="">Seleccione...</MenuItem>
              {TIPOS_CONTRATO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </TextField>
            <Stack direction="row" gap={1.5}>
              <TextField label="Fecha Inicio *" size="small" type="date" value={contratoForm.fecha_inicio} onChange={e => setCF('fecha_inicio', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
              <TextField label="Fecha Fin" size="small" type="date" value={contratoForm.fecha_fin} onChange={e => setCF('fecha_fin', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField label="Salario (COP)" size="small" type="number" fullWidth value={contratoForm.salario} onChange={e => setCF('salario', e.target.value)} />
            <TextField label="Notas" size="small" multiline rows={2} fullWidth value={contratoForm.notas} onChange={e => setCF('notas', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setContratoOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" onClick={handleContratoSubmit} disabled={createContrato.isPending}
            startIcon={createContrato.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}>
            Crear Contrato
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Tab 2: Historial ─────────────────────────────────────────────────────────
function HistorialTab() {
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const { data: searchData } = useQuery<PaginatedResponse>({
    queryKey: ['hcm-colab-search-hist', searchInput],
    queryFn: () => api.get(`/hcm/colaboradores?search=${encodeURIComponent(searchInput)}&per_page=20`).then(r => r.data),
    enabled: searchInput.length > 0,
  })
  const colabOptions = searchData?.items ?? []

  const { data: historial = [], isLoading } = useQuery<HistorialItem[]>({
    queryKey: ['hcm-historial', selectedColab?.id],
    queryFn: () => api.get(`/hcm/colaboradores/${selectedColab!.id}/historial`).then(r => r.data),
    enabled: !!selectedColab,
  })

  return (
    <Box>
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
        <Typography fontSize={13} fontWeight={700} mb={1.5}>Seleccionar Colaborador</Typography>
        <Autocomplete
          options={colabOptions}
          getOptionLabel={o => `${o.nombres} ${o.apellidos}${o.codigo ? ` (${o.codigo})` : ''}`}
          inputValue={searchInput}
          onInputChange={(_, v) => setSearchInput(v)}
          onChange={(_, v) => setSelectedColab(v)}
          value={selectedColab}
          renderInput={params => <TextField {...params} size="small" label="Buscar colaborador" placeholder="Escriba para buscar..." />}
          noOptionsText="Sin resultados"
          size="small"
          sx={{ maxWidth: 400 }}
        />
      </Card>

      {!selectedColab ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, border: '1px dashed #E5E7EB', borderRadius: '12px' }}>
          <Typography fontSize={13} color="text.secondary">Seleccione un colaborador para ver su historial</Typography>
        </Box>
      ) : isLoading ? (
        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: GH_COLOR }} /></Box>
      ) : historial.length === 0 ? (
        <Typography fontSize={13} color="text.secondary" textAlign="center" py={4}>Sin cambios registrados para este colaborador</Typography>
      ) : (
        <Stack gap={1}>
          {historial.map((item, idx) => {
            const dotColor = HISTORIAL_COLORES[idx % HISTORIAL_COLORES.length]
            return (
              <Paper key={item.id} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.75, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dotColor, mt: 0.5, flexShrink: 0 }} />
                <Box flex={1}>
                  <Stack direction="row" gap={1} flexWrap="wrap" alignItems="baseline">
                    <Typography fontSize={13} fontWeight={700}>{item.campo}</Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {item.valor_anterior != null ? `"${item.valor_anterior}"` : 'vacío'} → {item.valor_nuevo != null ? `"${item.valor_nuevo}"` : 'vacío'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" gap={1.5} mt={0.25}>
                    <Typography fontSize={11} color="text.secondary">{item.fecha_cambio}</Typography>
                    {item.usuario_nombre && <Typography fontSize={11} color="text.secondary">por {item.usuario_nombre}</Typography>}
                  </Stack>
                </Box>
              </Paper>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GHColaboradores() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="GH — Colaboradores">
      <Box mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(GH_COLOR, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GroupsIcon sx={{ color: GH_COLOR, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
              Colaboradores
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              Directorio y gestión de colaboradores
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid #E5E7EB', '& .MuiTabs-indicator': { bgcolor: GH_COLOR } }}
      >
        {['Directorio', 'Contratos', 'Historial'].map((label, i) => (
          <Tab key={i} label={label}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GH_COLOR } }} />
        ))}
      </Tabs>

      {tab === 0 && <DirectorioTab />}
      {tab === 1 && <ContratosTab />}
      {tab === 2 && <HistorialTab />}
    </Layout>
  )
}
