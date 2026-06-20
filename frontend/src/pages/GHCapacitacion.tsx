import React, { useState } from 'react'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Checkbox,
  ListItem,
  ListItemText,
  List,
  Grid,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'

import SchoolIcon from '@mui/icons-material/School'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LinkIcon from '@mui/icons-material/Link'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AddIcon from '@mui/icons-material/Add'

const GH_COLOR = '#BE185D'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface Empresa { id: number; nombre: string }
interface Colaborador { id: number; nombre: string }
interface Capacitacion {
  id: number
  empresa_id: number
  nombre: string
  descripcion?: string
  tipo: string
  duracion_horas: number
  instructor?: string
  modalidad: string
  fecha_inicio?: string
  fecha_fin?: string
  obligatoria: boolean
  aplica_conductores: boolean
  activo: boolean
}
interface Asignacion {
  id: number
  colaborador_id: number
  colaborador_nombre: string
  estado: string
  fecha_completado?: string
  calificacion?: number
  certificado_url?: string
  fecha_vencimiento?: string
}
interface Vencimiento {
  id: number
  colaborador_nombre: string
  capacitacion_nombre: string
  fecha_vencimiento: string
  dias_restantes: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_OPTS = [
  'INDUCCION',
  'TECNICA',
  'SEGURIDAD_VIAL',
  'PRIMEROS_AUXILIOS',
  'LIDERAZGO',
  'NORMATIVA',
  'OTRO',
]

const MODALIDAD_OPTS = ['PRESENCIAL', 'VIRTUAL', 'HIBRIDO', 'E_LEARNING']

function tipoChip(tipo: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    INDUCCION:        { label: 'Inducción',        color: '#374151', bg: '#F3F4F6' },
    TECNICA:          { label: 'Técnica',           color: '#1D4ED8', bg: '#EFF6FF' },
    SEGURIDAD_VIAL:   { label: 'Seg. Vial',         color: '#92400E', bg: '#FFF7ED' },
    PRIMEROS_AUXILIOS:{ label: 'Primeros Auxilios', color: '#991B1B', bg: '#FEF2F2' },
    LIDERAZGO:        { label: 'Liderazgo',         color: '#5B21B6', bg: '#F5F3FF' },
    NORMATIVA:        { label: 'Normativa',         color: '#065F46', bg: '#ECFDF5' },
    OTRO:             { label: 'Otro',              color: '#374151', bg: '#F3F4F6' },
  }
  const s = map[tipo] ?? map['OTRO']
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }}
    />
  )
}

function modalidadChip(m: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PRESENCIAL: { label: 'Presencial', color: '#065F46', bg: '#ECFDF5' },
    VIRTUAL:    { label: 'Virtual',   color: '#1D4ED8', bg: '#EFF6FF' },
    HIBRIDO:    { label: 'Híbrido',   color: '#5B21B6', bg: '#F5F3FF' },
    E_LEARNING: { label: 'E-Learning',color: '#065F46', bg: '#CCFBF1' },
  }
  const s = map[m] ?? { label: m, color: '#374151', bg: '#F3F4F6' }
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }}
    />
  )
}

function estadoChip(estado: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PENDIENTE:   { label: 'Pendiente',   color: '#6B7280', bg: '#F3F4F6' },
    EN_CURSO:    { label: 'En Curso',    color: '#1D4ED8', bg: '#EFF6FF' },
    COMPLETADO:  { label: 'Completado',  color: '#065F46', bg: '#ECFDF5' },
    VENCIDO:     { label: 'Vencido',     color: '#991B1B', bg: '#FEF2F2' },
  }
  const s = map[estado] ?? { label: estado, color: '#374151', bg: '#F3F4F6' }
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }}
    />
  )
}

function vencimientoBadge(dias: number) {
  let label = `${dias}d`
  let bg = '#ECFDF5'; let color = '#065F46'
  if (dias < 0)  { label = 'Vencido'; bg = '#FEF2F2'; color = '#991B1B' }
  else if (dias < 7)  { bg = '#FFF7ED'; color = '#92400E' }
  else if (dias < 30) { bg = '#FEFCE8'; color = '#854D0E' }
  return (
    <Chip label={label} size="small" sx={{ bgcolor: bg, color, fontWeight: 700, fontSize: '0.75rem' }} />
  )
}

function fmtDate(d?: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-CO') } catch { return d }
}

// ── Empty form state ──────────────────────────────────────────────────────────

const emptyForm = {
  empresa_id: '' as number | '',
  nombre: '',
  descripcion: '',
  tipo: 'INDUCCION',
  duracion_horas: '' as number | '',
  instructor: '',
  modalidad: 'PRESENCIAL',
  fecha_inicio: '',
  fecha_fin: '',
  obligatoria: false,
  aplica_conductores: false,
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GHCapacitacion() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // ── Tab 0 filters ──
  const [filtroTipo, setFiltroTipo] = useState<string>('ALL')
  const [filtroConductores, setFiltroConductores] = useState<string>('ALL')
  const [filtroActivo, setFiltroActivo] = useState<string>('ALL')

  // ── Dialog estado ──
  const [dlgOpen, setDlgOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Capacitacion | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  // ── Tab 1 ──
  const [capacitacionId, setCapacitacionId] = useState<number | ''>('')
  const [asignarDlgOpen, setAsignarDlgOpen] = useState(false)
  const [selectedColabs, setSelectedColabs] = useState<number[]>([])
  const [completarDlg, setCompletarDlg] = useState<Asignacion | null>(null)
  const [completarForm, setCompletarForm] = useState({ calificacion: '', fecha_vencimiento: '' })

  // ── Tab 2 ──
  const [dias, setDias] = useState(60)

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: capacitaciones = [], isLoading: loadingCaps } = useQuery<Capacitacion[]>({
    queryKey: ['gh-capacitaciones'],
    queryFn: () => api.get('/hcm/capacitaciones').then(r => r.data),
  })

  const { data: empresas = [] } = useQuery<Empresa[]>({
    queryKey: ['gh-empresas'],
    queryFn: () => api.get('/hcm/empresas').then(r => r.data),
  })

  const { data: colaboradores = [] } = useQuery<Colaborador[]>({
    queryKey: ['gh-colaboradores'],
    queryFn: () => api.get('/hcm/colaboradores').then(r => r.data),
    enabled: asignarDlgOpen,
  })

  const { data: asignaciones = [], isLoading: loadingAsig } = useQuery<Asignacion[]>({
    queryKey: ['gh-asignaciones', capacitacionId],
    queryFn: () =>
      api.get(`/hcm/capacitaciones/${capacitacionId}/asignaciones`).then(r => r.data),
    enabled: !!capacitacionId,
  })

  const { data: vencimientos = [], isLoading: loadingVenc } = useQuery<Vencimiento[]>({
    queryKey: ['gh-vencimientos', dias],
    queryFn: () =>
      api.get(`/hcm/capacitaciones/vencimientos?dias=${dias}`).then(r => r.data),
    enabled: tab === 2,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post('/hcm/capacitaciones', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gh-capacitaciones'] })
      toast.success('Capacitación creada')
      setDlgOpen(false)
    },
    onError: () => toast.error('Error al crear capacitación'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<typeof form> }) =>
      api.put(`/hcm/capacitaciones/${id}`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gh-capacitaciones'] })
      toast.success('Capacitación actualizada')
      setDlgOpen(false)
    },
    onError: () => toast.error('Error al actualizar capacitación'),
  })

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.put(`/hcm/capacitaciones/${id}`, { activo }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gh-capacitaciones'] }),
    onError: () => toast.error('Error al cambiar estado'),
  })

  const asignarMut = useMutation({
    mutationFn: (colaborador_ids: number[]) =>
      api.post(`/hcm/capacitaciones/${capacitacionId}/asignar`, { colaborador_ids }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gh-asignaciones', capacitacionId] })
      toast.success('Colaboradores asignados')
      setAsignarDlgOpen(false)
      setSelectedColabs([])
    },
    onError: () => toast.error('Error al asignar colaboradores'),
  })

  const completarMut = useMutation({
    mutationFn: ({ asignacionId, body }: { asignacionId: number; body: { calificacion?: number; fecha_vencimiento?: string } }) =>
      api.put(`/hcm/capacitaciones/asignaciones/${asignacionId}/completar`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gh-asignaciones', capacitacionId] })
      toast.success('Asignación completada')
      setCompletarDlg(null)
    },
    onError: () => toast.error('Error al completar asignación'),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm({ ...emptyForm })
    setDlgOpen(true)
  }

  function openEdit(cap: Capacitacion) {
    setEditTarget(cap)
    setForm({
      empresa_id: cap.empresa_id,
      nombre: cap.nombre,
      descripcion: cap.descripcion ?? '',
      tipo: cap.tipo,
      duracion_horas: cap.duracion_horas,
      instructor: cap.instructor ?? '',
      modalidad: cap.modalidad,
      fecha_inicio: cap.fecha_inicio ?? '',
      fecha_fin: cap.fecha_fin ?? '',
      obligatoria: cap.obligatoria,
      aplica_conductores: cap.aplica_conductores,
    })
    setDlgOpen(true)
  }

  function handleSave() {
    const body = {
      ...form,
      empresa_id: form.empresa_id === '' ? undefined : Number(form.empresa_id),
      duracion_horas: form.duracion_horas === '' ? 0 : Number(form.duracion_horas),
    }
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, body })
    } else {
      createMut.mutate(body as typeof form)
    }
  }

  function handleCompletar() {
    if (!completarDlg) return
    completarMut.mutate({
      asignacionId: completarDlg.id,
      body: {
        calificacion: completarForm.calificacion ? Number(completarForm.calificacion) : undefined,
        fecha_vencimiento: completarForm.fecha_vencimiento || undefined,
      },
    })
  }

  function toggleColab(id: number) {
    setSelectedColabs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── Filtered Capacitaciones ───────────────────────────────────────────────────

  const filteredCaps = capacitaciones.filter(c => {
    if (filtroTipo !== 'ALL' && c.tipo !== filtroTipo) return false
    if (filtroConductores === 'SI' && !c.aplica_conductores) return false
    if (filtroConductores === 'NO' && c.aplica_conductores) return false
    if (filtroActivo === 'ACTIVO' && !c.activo) return false
    if (filtroActivo === 'INACTIVO' && c.activo) return false
    return true
  })

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <SchoolIcon sx={{ color: GH_COLOR, fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700} color={GH_COLOR}>
            Formación y Capacitación
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          TabIndicatorProps={{ style: { backgroundColor: GH_COLOR } }}
        >
          <Tab label="Catálogo de Cursos" sx={{ '&.Mui-selected': { color: GH_COLOR } }} />
          <Tab label="Asignaciones" sx={{ '&.Mui-selected': { color: GH_COLOR } }} />
          <Tab label="Próximos Vencimientos" sx={{ '&.Mui-selected': { color: GH_COLOR } }} />
        </Tabs>

        {/* ── TAB 0: Catálogo ── */}
        {tab === 0 && (
          <Box>
            {/* Filters + action */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
              {/* Tipo filter */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)}
                >
                  <MenuItem value="ALL">Todos</MenuItem>
                  {TIPO_OPTS.map(t => (
                    <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Conductores filter */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Conductores:</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={filtroConductores}
                  onChange={(_, v) => v && setFiltroConductores(v)}
                >
                  <ToggleButton value="ALL">Todos</ToggleButton>
                  <ToggleButton value="SI">Sí</ToggleButton>
                  <ToggleButton value="NO">No</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Activo filter */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Estado:</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={filtroActivo}
                  onChange={(_, v) => v && setFiltroActivo(v)}
                >
                  <ToggleButton value="ALL">Todos</ToggleButton>
                  <ToggleButton value="ACTIVO">Activo</ToggleButton>
                  <ToggleButton value="INACTIVO">Inactivo</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ flex: 1 }} />

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreate}
                sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
              >
                Nueva Capacitación
              </Button>
            </Box>

            {/* Table */}
            {loadingCaps ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: GH_COLOR }} />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Duración</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Instructor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Modalidad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Obligatoria</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Conductores</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Activo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCaps.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No se encontraron capacitaciones
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredCaps.map(cap => (
                      <TableRow key={cap.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{cap.nombre}</Typography>
                        </TableCell>
                        <TableCell>{tipoChip(cap.tipo)}</TableCell>
                        <TableCell>{cap.duracion_horas} hrs</TableCell>
                        <TableCell>{cap.instructor || '—'}</TableCell>
                        <TableCell>{modalidadChip(cap.modalidad)}</TableCell>
                        <TableCell>
                          <Chip
                            label={cap.obligatoria ? 'Sí' : 'No'}
                            size="small"
                            sx={{
                              bgcolor: cap.obligatoria ? '#FEF2F2' : '#F3F4F6',
                              color: cap.obligatoria ? '#991B1B' : '#6B7280',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cap.aplica_conductores ? 'Sí' : 'No'}
                            size="small"
                            sx={{
                              bgcolor: cap.aplica_conductores ? '#FDF2F8' : '#F3F4F6',
                              color: cap.aplica_conductores ? GH_COLOR : '#6B7280',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={cap.activo}
                            size="small"
                            onChange={e => toggleActivoMut.mutate({ id: cap.id, activo: e.target.checked })}
                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: GH_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: GH_COLOR } }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => openEdit(cap)} sx={{ color: GH_COLOR }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ── TAB 1: Asignaciones ── */}
        {tab === 1 && (
          <Box>
            {/* Course selector */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 320 }}>
                <InputLabel>Selecciona una capacitación</InputLabel>
                <Select
                  label="Selecciona una capacitación"
                  value={capacitacionId}
                  onChange={e => setCapacitacionId(e.target.value as number)}
                >
                  {capacitaciones.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!!capacitacionId && (
                <>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => { setSelectedColabs([]); setAsignarDlgOpen(true) }}
                    sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
                  >
                    Asignar Colaboradores
                  </Button>
                </>
              )}
            </Box>

            {/* Assignments table */}
            {!!capacitacionId && (
              loadingAsig ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: GH_COLOR }} />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Colaborador</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Fecha Completado</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Calificación</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Certificado</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Vencimiento</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {asignaciones.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            No hay asignaciones para esta capacitación
                          </TableCell>
                        </TableRow>
                      )}
                      {asignaciones.map(asig => {
                        const diasRestantes = asig.fecha_vencimiento
                          ? Math.ceil((new Date(asig.fecha_vencimiento).getTime() - Date.now()) / 86400000)
                          : null

                        return (
                          <TableRow key={asig.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ bgcolor: GH_COLOR, width: 28, height: 28, fontSize: 13 }}>
                                  {asig.colaborador_nombre.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2">{asig.colaborador_nombre}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{estadoChip(asig.estado)}</TableCell>
                            <TableCell>{fmtDate(asig.fecha_completado)}</TableCell>
                            <TableCell>{asig.calificacion != null ? asig.calificacion : '—'}</TableCell>
                            <TableCell>
                              {asig.certificado_url ? (
                                <IconButton size="small" onClick={() => window.open(asig.certificado_url, '_blank')} sx={{ color: GH_COLOR }}>
                                  <LinkIcon fontSize="small" />
                                </IconButton>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              {asig.fecha_vencimiento ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ mr: 0.5 }}>{fmtDate(asig.fecha_vencimiento)}</Typography>
                                  {diasRestantes !== null && vencimientoBadge(diasRestantes)}
                                </Box>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              {(asig.estado === 'PENDIENTE' || asig.estado === 'EN_CURSO') && (
                                <IconButton
                                  size="small"
                                  sx={{ color: '#065F46' }}
                                  title="Completar"
                                  onClick={() => {
                                    setCompletarDlg(asig)
                                    setCompletarForm({ calificacion: '', fecha_vencimiento: '' })
                                  }}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            )}
          </Box>
        )}

        {/* ── TAB 2: Próximos Vencimientos ── */}
        {tab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TextField
                label="Días a vencer"
                type="number"
                size="small"
                value={dias}
                onChange={e => setDias(Number(e.target.value))}
                sx={{ width: 160 }}
                inputProps={{ min: 1 }}
              />
            </Box>

            {loadingVenc ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: GH_COLOR }} />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Colaborador</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Capacitación</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha Vencimiento</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Días Restantes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vencimientos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No hay vencimientos próximos en {dias} días
                        </TableCell>
                      </TableRow>
                    )}
                    {vencimientos.map(v => (
                      <TableRow key={v.id} hover>
                        <TableCell>{v.colaborador_nombre}</TableCell>
                        <TableCell>{v.capacitacion_nombre}</TableCell>
                        <TableCell>{fmtDate(v.fecha_vencimiento)}</TableCell>
                        <TableCell>{vencimientoBadge(v.dias_restantes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>

      {/* ── Dialog: Create/Edit Capacitación ── */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: GH_COLOR, fontWeight: 700 }}>
          {editTarget ? 'Editar Capacitación' : 'Nueva Capacitación'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Empresa</InputLabel>
                <Select
                  label="Empresa"
                  value={form.empresa_id}
                  onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value as number }))}
                >
                  {empresas.map(e => (
                    <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Nombre"
                required
                fullWidth
                size="small"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Descripción"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                >
                  {TIPO_OPTS.map(t => (
                    <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Duración (horas)"
                required
                fullWidth
                type="number"
                size="small"
                value={form.duracion_horas}
                onChange={e => setForm(f => ({ ...f, duracion_horas: e.target.value as unknown as number }))}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Instructor"
                fullWidth
                size="small"
                value={form.instructor}
                onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Modalidad</InputLabel>
                <Select
                  label="Modalidad"
                  value={form.modalidad}
                  onChange={e => setForm(f => ({ ...f, modalidad: e.target.value }))}
                >
                  {MODALIDAD_OPTS.map(m => (
                    <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Fecha Inicio"
                type="date"
                fullWidth
                size="small"
                value={form.fecha_inicio}
                onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Fecha Fin"
                type="date"
                fullWidth
                size="small"
                value={form.fecha_fin}
                onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.obligatoria}
                    onChange={e => setForm(f => ({ ...f, obligatoria: e.target.checked }))}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: GH_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: GH_COLOR } }}
                  />
                }
                label="Obligatoria"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.aplica_conductores}
                    onChange={e => setForm(f => ({ ...f, aplica_conductores: e.target.checked }))}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: GH_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: GH_COLOR } }}
                  />
                }
                label="Aplica Conductores"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgOpen(false)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending}
            sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
          >
            {editTarget ? 'Guardar Cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Asignar Colaboradores ── */}
      <Dialog open={asignarDlgOpen} onClose={() => setAsignarDlgOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: GH_COLOR, fontWeight: 700 }}>Asignar Colaboradores</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List dense>
            {colaboradores.map(c => (
              <ListItem
                key={c.id}
                button
                onClick={() => toggleColab(c.id)}
                sx={{ cursor: 'pointer' }}
              >
                <Checkbox
                  edge="start"
                  checked={selectedColabs.includes(c.id)}
                  tabIndex={-1}
                  disableRipple
                  sx={{ '&.Mui-checked': { color: GH_COLOR } }}
                />
                <ListItemText primary={c.nombre} />
              </ListItem>
            ))}
            {colaboradores.length === 0 && (
              <ListItem>
                <ListItemText primary="No hay colaboradores disponibles" sx={{ color: 'text.secondary' }} />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAsignarDlgOpen(false)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => asignarMut.mutate(selectedColabs)}
            disabled={selectedColabs.length === 0 || asignarMut.isPending}
            sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
          >
            Asignar ({selectedColabs.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Completar Asignación ── */}
      <Dialog open={!!completarDlg} onClose={() => setCompletarDlg(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: GH_COLOR, fontWeight: 700 }}>Completar Asignación</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Calificación (0–10)"
                type="number"
                fullWidth
                size="small"
                value={completarForm.calificacion}
                onChange={e => setCompletarForm(f => ({ ...f, calificacion: e.target.value }))}
                inputProps={{ min: 0, max: 10, step: 0.1 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Fecha Vencimiento"
                type="date"
                fullWidth
                size="small"
                value={completarForm.fecha_vencimiento}
                onChange={e => setCompletarForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompletarDlg(null)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCompletar}
            disabled={completarMut.isPending}
            sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
