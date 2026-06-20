import React, { useState, useEffect } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Tooltip, CircularProgress,
  Avatar, InputAdornment, alpha, Tabs, Tab,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  PersonSearch as PersonSearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GH_COLOR = '#BE185D'

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Empresa { id: number; nombre: string }
interface Cargo { id: number; nombre: string }

interface Vacante {
  id: number
  empresa_id: number
  empresa_nombre?: string
  cargo_id: number
  cargo_nombre?: string
  titulo: string
  num_vacantes: number
  descripcion?: string
  requisitos?: string
  salario_min?: number
  salario_max?: number
  fecha_apertura: string
  fecha_cierre?: string
  tipo_contrato: string
  modalidad: string
  estado: string
}

interface Postulacion {
  id: number
  vacante_id: number
  vacante_titulo?: string
  nombres: string
  apellidos: string
  email: string
  telefono?: string
  cv_url?: string
  estado: string
  puntuacion?: number
  fecha_postulacion?: string
  notas?: string
}

interface Entrevista {
  id: number
  postulacion_id: number
  postulante_nombres?: string
  postulante_apellidos?: string
  vacante_titulo?: string
  fecha: string
  tipo: string
  entrevistador?: string
  resultado: string
  calificacion?: number
  notas?: string
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const MODALIDADES = ['PRESENCIAL', 'REMOTO', 'HIBRIDO']
const MODALIDAD_COLOR: Record<string, string> = { PRESENCIAL: '#0D9488', REMOTO: '#6366F1', HIBRIDO: '#D97706' }

const ESTADOS_VAC = ['ABIERTA', 'EN_PROCESO', 'CERRADA', 'CANCELADA']
const ESTADO_VAC_COLOR: Record<string, string> = { ABIERTA: '#16A34A', EN_PROCESO: '#3B82F6', CERRADA: '#6B7280', CANCELADA: '#EF4444' }

const ESTADOS_POST = ['NUEVA', 'EN_REVISION', 'ENTREVISTA', 'CONTRATADO', 'DESCARTADO']
const ESTADO_POST_COLOR: Record<string, string> = { NUEVA: '#6B7280', EN_REVISION: '#3B82F6', ENTREVISTA: '#D97706', CONTRATADO: '#16A34A', DESCARTADO: '#EF4444' }

const TIPOS_ENT = ['TELEFONICA', 'VIRTUAL', 'PRESENCIAL', 'TECNICA']
const RESULTADOS_ENT = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_ESPERA']
const RESULTADO_ENT_COLOR: Record<string, string> = { PENDIENTE: '#6B7280', APROBADO: '#16A34A', RECHAZADO: '#EF4444', EN_ESPERA: '#D97706' }

const TIPOS_CONTRATO = ['INDEFINIDO', 'TERMINO_FIJO', 'OBRA_LABOR', 'PRESTACION_SERVICIOS', 'TEMPORAL']

const fmt = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n) : '—'

const fmtDate = (d?: string) => {
  if (!d) return '—'
  const [y, m, day] = d.substring(0, 10).split('-')
  return `${day}/${m}/${y}`
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, borderLeft: `4px solid ${color || GH_COLOR}`, height: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ color: color || GH_COLOR, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

const EMPTY_VACANTE = {
  empresa_id: '', cargo_id: '', titulo: '', num_vacantes: '1',
  descripcion: '', requisitos: '', salario_min: '', salario_max: '',
  fecha_apertura: new Date().toISOString().split('T')[0],
  fecha_cierre: '', tipo_contrato: 'INDEFINIDO', modalidad: 'PRESENCIAL',
}

const EMPTY_POST = {
  vacante_id: '', nombres: '', apellidos: '', email: '', telefono: '', cv_url: '', notas: '',
}

const EMPTY_ENT = {
  postulacion_id: '', fecha: '', tipo: 'VIRTUAL', entrevistador: '', notas: '',
  resultado: 'PENDIENTE', calificacion: '',
}

export default function GHReclutamiento() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // Vacantes
  const [filterEmpresa, setFilterEmpresa] = useState('')
  const [filterEstadoVac, setFilterEstadoVac] = useState('')
  const [openVac, setOpenVac] = useState(false)
  const [editingVac, setEditingVac] = useState<Vacante | null>(null)
  const [formVac, setFormVac] = useState<typeof EMPTY_VACANTE>({ ...EMPTY_VACANTE })

  // Postulaciones
  const [filterVacantePost, setFilterVacantePost] = useState('')
  const [filterEstadoPost, setFilterEstadoPost] = useState('')
  const [openPost, setOpenPost] = useState(false)
  const [editingPost, setEditingPost] = useState<Postulacion | null>(null)
  const [formPost, setFormPost] = useState<typeof EMPTY_POST>({ ...EMPTY_POST })
  const [deletePost, setDeletePost] = useState<Postulacion | null>(null)

  // Entrevistas
  const [searchEnt, setSearchEnt] = useState('')
  const [openEnt, setOpenEnt] = useState(false)
  const [editingEnt, setEditingEnt] = useState<Entrevista | null>(null)
  const [formEnt, setFormEnt] = useState<typeof EMPTY_ENT>({ ...EMPTY_ENT })
  const [postSearch, setPostSearch] = useState('')
  const [postOptions, setPostOptions] = useState<Postulacion[]>([])

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: empresas = [] } = useQuery<Empresa[]>({
    queryKey: ['gh-empresas'],
    queryFn: () => api.get('/hcm/empresas').then(r => r.data),
  })

  const { data: cargos = [] } = useQuery<Cargo[]>({
    queryKey: ['gh-cargos'],
    queryFn: () => api.get('/hcm/cargos').then(r => r.data),
  })

  const { data: vacantes = [], isLoading: loadingVac } = useQuery<Vacante[]>({
    queryKey: ['gh-vacantes', filterEmpresa, filterEstadoVac],
    queryFn: () => {
      const p = new URLSearchParams()
      if (filterEmpresa) p.append('empresa_id', filterEmpresa)
      if (filterEstadoVac) p.append('estado', filterEstadoVac)
      return api.get(`/hcm/reclutamiento/vacantes?${p}`).then(r => r.data)
    },
  })

  const { data: postulaciones = [], isLoading: loadingPost } = useQuery<Postulacion[]>({
    queryKey: ['gh-postulaciones', filterVacantePost, filterEstadoPost],
    queryFn: () => {
      const p = new URLSearchParams()
      if (filterVacantePost) p.append('vacante_id', filterVacantePost)
      if (filterEstadoPost) p.append('estado', filterEstadoPost)
      return api.get(`/hcm/reclutamiento/postulaciones?${p}`).then(r => r.data)
    },
  })

  const { data: entrevistas = [], isLoading: loadingEnt } = useQuery<Entrevista[]>({
    queryKey: ['gh-entrevistas'],
    queryFn: () => api.get('/hcm/reclutamiento/entrevistas').then(r => r.data),
  })

  // ── Postulacion Autocomplete ───────────────────────────────────────────

  useEffect(() => {
    if (!postSearch || postSearch.length < 2) { setPostOptions([]); return }
    const t = setTimeout(() => {
      api.get(`/hcm/reclutamiento/postulaciones?search=${encodeURIComponent(postSearch)}`).then(r => setPostOptions(r.data)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [postSearch])

  // ── Mutations: Vacantes ───────────────────────────────────────────────

  const createVac = useMutation({
    mutationFn: (d: object) => api.post('/hcm/reclutamiento/vacantes', d).then(r => r.data),
    onSuccess: () => { toast.success('Vacante creada'); qc.invalidateQueries({ queryKey: ['gh-vacantes'] }); setOpenVac(false); setEditingVac(null) },
    onError: () => toast.error('Error al crear vacante'),
  })

  const updateVac = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/reclutamiento/vacantes/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Vacante actualizada'); qc.invalidateQueries({ queryKey: ['gh-vacantes'] }); setOpenVac(false); setEditingVac(null) },
    onError: () => toast.error('Error al actualizar vacante'),
  })

  // ── Mutations: Postulaciones ──────────────────────────────────────────

  const createPost = useMutation({
    mutationFn: (d: object) => api.post('/hcm/reclutamiento/postulaciones', d).then(r => r.data),
    onSuccess: () => { toast.success('Postulación registrada'); qc.invalidateQueries({ queryKey: ['gh-postulaciones'] }); setOpenPost(false); setEditingPost(null) },
    onError: () => toast.error('Error al registrar postulación'),
  })

  const updatePost = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/reclutamiento/postulaciones/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Postulación actualizada'); qc.invalidateQueries({ queryKey: ['gh-postulaciones'] }); setOpenPost(false); setEditingPost(null) },
    onError: () => toast.error('Error al actualizar'),
  })

  const deletePostMut = useMutation({
    mutationFn: (id: number) => api.delete(`/hcm/reclutamiento/postulaciones/${id}`),
    onSuccess: () => { toast.success('Postulación eliminada'); qc.invalidateQueries({ queryKey: ['gh-postulaciones'] }); setDeletePost(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const changeEstadoPost = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => api.patch(`/hcm/reclutamiento/postulaciones/${id}`, { estado }).then(r => r.data),
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['gh-postulaciones'] }) },
    onError: () => toast.error('Error al cambiar estado'),
  })

  // ── Mutations: Entrevistas ────────────────────────────────────────────

  const createEnt = useMutation({
    mutationFn: (d: object) => api.post('/hcm/reclutamiento/entrevistas', d).then(r => r.data),
    onSuccess: () => { toast.success('Entrevista programada'); qc.invalidateQueries({ queryKey: ['gh-entrevistas'] }); setOpenEnt(false); setEditingEnt(null) },
    onError: () => toast.error('Error al programar entrevista'),
  })

  const updateEnt = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/reclutamiento/entrevistas/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Entrevista actualizada'); qc.invalidateQueries({ queryKey: ['gh-entrevistas'] }); setOpenEnt(false); setEditingEnt(null) },
    onError: () => toast.error('Error al actualizar entrevista'),
  })

  // ── Handlers: Vacantes ────────────────────────────────────────────────

  const handleOpenVac = (v?: Vacante) => {
    setEditingVac(v ?? null)
    setFormVac(v ? {
      empresa_id: String(v.empresa_id), cargo_id: String(v.cargo_id),
      titulo: v.titulo, num_vacantes: String(v.num_vacantes),
      descripcion: v.descripcion ?? '', requisitos: v.requisitos ?? '',
      salario_min: v.salario_min != null ? String(v.salario_min) : '',
      salario_max: v.salario_max != null ? String(v.salario_max) : '',
      fecha_apertura: v.fecha_apertura, fecha_cierre: v.fecha_cierre ?? '',
      tipo_contrato: v.tipo_contrato, modalidad: v.modalidad,
    } : { ...EMPTY_VACANTE })
    setOpenVac(true)
  }

  const handleSaveVac = () => {
    const payload = {
      empresa_id: Number(formVac.empresa_id),
      cargo_id: Number(formVac.cargo_id),
      titulo: formVac.titulo,
      num_vacantes: Number(formVac.num_vacantes) || 1,
      descripcion: formVac.descripcion || null,
      requisitos: formVac.requisitos || null,
      salario_min: formVac.salario_min ? Number(formVac.salario_min) : null,
      salario_max: formVac.salario_max ? Number(formVac.salario_max) : null,
      fecha_apertura: formVac.fecha_apertura,
      fecha_cierre: formVac.fecha_cierre || null,
      tipo_contrato: formVac.tipo_contrato,
      modalidad: formVac.modalidad,
    }
    if (editingVac) updateVac.mutate({ id: editingVac.id, d: payload })
    else createVac.mutate(payload)
  }

  const fVac = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormVac(prev => ({ ...prev, [k]: e.target.value }))

  // ── Handlers: Postulaciones ───────────────────────────────────────────

  const handleOpenPost = (p?: Postulacion) => {
    setEditingPost(p ?? null)
    setFormPost(p ? {
      vacante_id: String(p.vacante_id), nombres: p.nombres, apellidos: p.apellidos,
      email: p.email, telefono: p.telefono ?? '', cv_url: p.cv_url ?? '', notas: p.notas ?? '',
    } : { ...EMPTY_POST })
    setOpenPost(true)
  }

  const handleSavePost = () => {
    const payload = {
      vacante_id: Number(formPost.vacante_id),
      nombres: formPost.nombres, apellidos: formPost.apellidos, email: formPost.email,
      telefono: formPost.telefono || null, cv_url: formPost.cv_url || null, notas: formPost.notas || null,
    }
    if (editingPost) updatePost.mutate({ id: editingPost.id, d: payload })
    else createPost.mutate(payload)
  }

  const fPost = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormPost(prev => ({ ...prev, [k]: e.target.value }))

  // ── Handlers: Entrevistas ─────────────────────────────────────────────

  const handleOpenEnt = (e?: Entrevista) => {
    setEditingEnt(e ?? null)
    setFormEnt(e ? {
      postulacion_id: String(e.postulacion_id),
      fecha: e.fecha, tipo: e.tipo, entrevistador: e.entrevistador ?? '',
      notas: e.notas ?? '', resultado: e.resultado,
      calificacion: e.calificacion != null ? String(e.calificacion) : '',
    } : { ...EMPTY_ENT })
    setPostSearch('')
    setPostOptions([])
    setOpenEnt(true)
  }

  const handleSaveEnt = () => {
    const payload = {
      postulacion_id: Number(formEnt.postulacion_id),
      fecha: formEnt.fecha, tipo: formEnt.tipo,
      entrevistador: formEnt.entrevistador || null,
      notas: formEnt.notas || null,
      resultado: formEnt.resultado,
      calificacion: formEnt.calificacion ? Number(formEnt.calificacion) : null,
    }
    if (editingEnt) updateEnt.mutate({ id: editingEnt.id, d: payload })
    else createEnt.mutate(payload)
  }

  const fEnt = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormEnt(prev => ({ ...prev, [k]: e.target.value }))

  // ── KPIs ──────────────────────────────────────────────────────────────

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const kpiAbiertas = vacantes.filter(v => v.estado === 'ABIERTA').length
  const kpiEnProceso = vacantes.filter(v => v.estado === 'EN_PROCESO').length
  const kpiPostTotal = postulaciones.length
  const kpiContratados = postulaciones.filter(p => p.estado === 'CONTRATADO' && (p.fecha_postulacion ?? '').startsWith(thisMonth)).length

  const entFiltered = entrevistas.filter(e => {
    if (!searchEnt) return true
    const name = `${e.postulante_nombres ?? ''} ${e.postulante_apellidos ?? ''} ${e.vacante_titulo ?? ''}`.toLowerCase()
    return name.includes(searchEnt.toLowerCase())
  })

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, bgcolor: alpha(GH_COLOR, 0.12), borderRadius: 2, display: 'flex' }}>
            <PersonSearchIcon sx={{ color: GH_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Reclutamiento y Selección</Typography>
            <Typography variant="body2" color="text.secondary">Gestión de vacantes, postulaciones y entrevistas</Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: GH_COLOR }, '& .MuiTabs-indicator': { bgcolor: GH_COLOR } }}
        >
          <Tab label="Vacantes" />
          <Tab label="Postulaciones" />
          <Tab label="Entrevistas" />
        </Tabs>

        {/* ═══════════════ TAB 0: VACANTES ═══════════════ */}
        {tab === 0 && (
          <>
            {/* KPIs */}
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 6, md: 3 }}><StatCard label="Vacantes Abiertas" value={kpiAbiertas} color="#16A34A" /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><StatCard label="En Proceso" value={kpiEnProceso} color="#3B82F6" /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><StatCard label="Total Postulaciones" value={kpiPostTotal} color={GH_COLOR} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><StatCard label="Contratados este mes" value={kpiContratados} color="#16A34A" /></Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <TextField select size="small" label="Empresa" value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)} sx={{ minWidth: 180 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {empresas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Estado" value={filterEstadoVac} onChange={e => setFilterEstadoVac(e.target.value)} sx={{ minWidth: 150 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ESTADOS_VAC.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                  </TextField>
                </Stack>
                <Button
                  variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenVac()}
                  sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Nueva Vacante
                </Button>
              </Stack>
            </Paper>

            {/* Table */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {loadingVac ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: alpha(GH_COLOR, 0.06) }}>
                        {['Título', 'Cargo', '# Vacantes', 'Salario', 'Modalidad', 'Estado', 'Apertura', 'Cierre', 'Acciones'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vacantes.length === 0 ? (
                        <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Sin vacantes</td></tr>
                      ) : vacantes.map((v, idx) => (
                        <tr key={v.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2" fontWeight={600}>{v.titulo}</Typography><Typography variant="caption" color="text.secondary">{v.empresa_nombre}</Typography></td>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2">{v.cargo_nombre ?? '—'}</Typography></td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}><Typography variant="body2" fontWeight={600}>{v.num_vacantes}</Typography></td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">
                              {v.salario_min != null || v.salario_max != null
                                ? `${fmt(v.salario_min)} – ${fmt(v.salario_max)}`
                                : '—'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={v.modalidad} size="small"
                              sx={{ bgcolor: alpha(MODALIDAD_COLOR[v.modalidad] ?? '#6B7280', 0.12), color: MODALIDAD_COLOR[v.modalidad] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={v.estado} size="small"
                              sx={{ bgcolor: alpha(ESTADO_VAC_COLOR[v.estado] ?? '#6B7280', 0.12), color: ESTADO_VAC_COLOR[v.estado] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(v.fecha_apertura)}</Typography></td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(v.fecha_cierre)}</Typography></td>
                          <td style={{ padding: '10px 14px' }}>
                            <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenVac(v)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Paper>
          </>
        )}

        {/* ═══════════════ TAB 1: POSTULACIONES ═══════════════ */}
        {tab === 1 && (
          <>
            <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <TextField select size="small" label="Vacante" value={filterVacantePost} onChange={e => setFilterVacantePost(e.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {vacantes.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.titulo}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Estado" value={filterEstadoPost} onChange={e => setFilterEstadoPost(e.target.value)} sx={{ minWidth: 150 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ESTADOS_POST.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                  </TextField>
                </Stack>
                <Button
                  variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenPost()}
                  sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Nueva Postulación
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {loadingPost ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: alpha(GH_COLOR, 0.06) }}>
                        {['Nombre Completo', 'Email', 'Teléfono', 'Vacante', 'Estado', 'Puntuación', 'Fecha', 'Acciones'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {postulaciones.length === 0 ? (
                        <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Sin postulaciones</td></tr>
                      ) : postulaciones.map((p, idx) => (
                        <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: GH_COLOR }}>
                                {(p.nombres?.[0] ?? '') + (p.apellidos?.[0] ?? '')}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>{p.nombres} {p.apellidos}</Typography>
                            </Stack>
                          </td>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2">{p.email}</Typography></td>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2">{p.telefono || '—'}</Typography></td>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{p.vacante_titulo || '—'}</Typography></td>
                          <td style={{ padding: '10px 14px' }}>
                            <TextField
                              select size="small" value={p.estado}
                              onChange={e => changeEstadoPost.mutate({ id: p.id, estado: e.target.value })}
                              sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { fontSize: 12, height: 28 } }}
                            >
                              {ESTADOS_POST.map(s => <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>{s}</MenuItem>)}
                            </TextField>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.puntuacion != null ? (
                              <Typography variant="body2" fontWeight={700}
                                sx={{ color: p.puntuacion >= 7 ? '#16A34A' : p.puntuacion >= 5 ? '#D97706' : '#EF4444' }}>
                                {p.puntuacion}/10
                              </Typography>
                            ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(p.fecha_postulacion)}</Typography></td>
                          <td style={{ padding: '10px 14px' }}>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenPost(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeletePost(p)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                            </Stack>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Paper>
          </>
        )}

        {/* ═══════════════ TAB 2: ENTREVISTAS ═══════════════ */}
        {tab === 2 && (
          <>
            <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <TextField
                  size="small" placeholder="Buscar postulante o vacante..."
                  value={searchEnt} onChange={e => setSearchEnt(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{ minWidth: 260 }}
                />
                <Button
                  variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenEnt()}
                  sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Nueva Entrevista
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {loadingEnt ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: alpha(GH_COLOR, 0.06) }}>
                        {['Postulante', 'Vacante', 'Fecha/Hora', 'Tipo', 'Entrevistador', 'Resultado', 'Calificación', 'Acciones'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entFiltered.length === 0 ? (
                        <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Sin entrevistas</td></tr>
                      ) : entFiltered.map((e, idx) => (
                        <tr key={e.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: GH_COLOR }}>
                                {(e.postulante_nombres?.[0] ?? '') + (e.postulante_apellidos?.[0] ?? '')}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>{e.postulante_nombres} {e.postulante_apellidos}</Typography>
                            </Stack>
                          </td>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{e.vacante_titulo || '—'}</Typography></td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">{e.fecha ? fmtDate(e.fecha.substring(0, 10)) : '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{e.fecha ? e.fecha.substring(11, 16) : ''}</Typography>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={e.tipo} size="small" sx={{ fontWeight: 600, fontSize: 11, bgcolor: alpha('#6366F1', 0.1), color: '#6366F1' }} />
                          </td>
                          <td style={{ padding: '10px 14px' }}><Typography variant="body2">{e.entrevistador || '—'}</Typography></td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={e.resultado} size="small"
                              sx={{ bgcolor: alpha(RESULTADO_ENT_COLOR[e.resultado] ?? '#6B7280', 0.12), color: RESULTADO_ENT_COLOR[e.resultado] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {e.calificacion != null ? (
                              <Typography variant="body2" fontWeight={700}
                                sx={{ color: e.calificacion >= 7 ? '#16A34A' : e.calificacion >= 5 ? '#D97706' : '#EF4444' }}>
                                {e.calificacion}/10
                              </Typography>
                            ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenEnt(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Paper>
          </>
        )}

        {/* ═══════════════ DIALOGS ═══════════════ */}

        {/* Vacante Dialog */}
        <Dialog open={openVac} onClose={() => { setOpenVac(false); setEditingVac(null) }} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={700}>{editingVac ? 'Editar Vacante' : 'Nueva Vacante'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth size="small" label="Empresa" value={formVac.empresa_id} onChange={fVac('empresa_id')}>
                  {empresas.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth size="small" label="Cargo" value={formVac.cargo_id} onChange={fVac('cargo_id')}>
                  {cargos.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField fullWidth size="small" label="Título del cargo" value={formVac.titulo} onChange={fVac('titulo')} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Número de vacantes" type="number" value={formVac.num_vacantes} onChange={fVac('num_vacantes')} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Descripción" value={formVac.descripcion} onChange={fVac('descripcion')} multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Requisitos" value={formVac.requisitos} onChange={fVac('requisitos')} multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Salario Mínimo (COP)" type="number" value={formVac.salario_min} onChange={fVac('salario_min')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Salario Máximo (COP)" type="number" value={formVac.salario_max} onChange={fVac('salario_max')} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Fecha Apertura" type="date" value={formVac.fecha_apertura} onChange={fVac('fecha_apertura')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Fecha Cierre" type="date" value={formVac.fecha_cierre} onChange={fVac('fecha_cierre')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select fullWidth size="small" label="Modalidad" value={formVac.modalidad} onChange={fVac('modalidad')}>
                  {MODALIDADES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField select fullWidth size="small" label="Tipo de Contrato" value={formVac.tipo_contrato} onChange={fVac('tipo_contrato')}>
                  {TIPOS_CONTRATO.map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenVac(false); setEditingVac(null) }} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveVac}
              disabled={createVac.isPending || updateVac.isPending || !formVac.titulo || !formVac.empresa_id}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}>
              {createVac.isPending || updateVac.isPending ? <CircularProgress size={18} color="inherit" /> : editingVac ? 'Guardar' : 'Crear vacante'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Postulacion Dialog */}
        <Dialog open={openPost} onClose={() => { setOpenPost(false); setEditingPost(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={700}>{editingPost ? 'Editar Postulación' : 'Nueva Postulación'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField select fullWidth size="small" label="Vacante" value={formPost.vacante_id} onChange={fPost('vacante_id')}>
                  {vacantes.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.titulo}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Nombres" value={formPost.nombres} onChange={fPost('nombres')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Apellidos" value={formPost.apellidos} onChange={fPost('apellidos')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Email" type="email" value={formPost.email} onChange={fPost('email')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Teléfono" value={formPost.telefono} onChange={fPost('telefono')} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="URL Hoja de Vida (CV)" value={formPost.cv_url} onChange={fPost('cv_url')} placeholder="https://..." />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Notas" value={formPost.notas} onChange={fPost('notas')} multiline rows={3} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenPost(false); setEditingPost(null) }} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSavePost}
              disabled={createPost.isPending || updatePost.isPending || !formPost.vacante_id || !formPost.nombres || !formPost.email}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}>
              {createPost.isPending || updatePost.isPending ? <CircularProgress size={18} color="inherit" /> : editingPost ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Postulacion Confirm */}
        <Dialog open={!!deletePost} onClose={() => setDeletePost(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={700}>Eliminar postulación</DialogTitle>
          <DialogContent>
            <Typography>¿Eliminar la postulación de <strong>{deletePost?.nombres} {deletePost?.apellidos}</strong>? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeletePost(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 600 }}
              onClick={() => deletePost && deletePostMut.mutate(deletePost.id)}
              disabled={deletePostMut.isPending}>
              {deletePostMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Entrevista Dialog */}
        <Dialog open={openEnt} onClose={() => { setOpenEnt(false); setEditingEnt(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={700}>{editingEnt ? 'Editar Entrevista' : 'Nueva Entrevista'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {/* Postulacion Autocomplete */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Buscar Postulación"
                  value={postSearch} onChange={e => setPostSearch(e.target.value)}
                  placeholder="Nombre del postulante..."
                  helperText={formEnt.postulacion_id ? `ID seleccionado: ${formEnt.postulacion_id}` : 'Mínimo 2 caracteres'}
                />
                {postOptions.length > 0 && (
                  <Paper sx={{ mt: 0.5, maxHeight: 160, overflow: 'auto', border: '1px solid #E5E7EB' }}>
                    {postOptions.map(p => (
                      <Box key={p.id} sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#F9FAFB' } }}
                        onClick={() => {
                          setFormEnt(prev => ({ ...prev, postulacion_id: String(p.id) }))
                          setPostSearch(`${p.nombres} ${p.apellidos} — ${p.vacante_titulo ?? ''}`)
                          setPostOptions([])
                        }}>
                        <Typography variant="body2" fontWeight={600}>{p.nombres} {p.apellidos}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.vacante_titulo}</Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField fullWidth size="small" label="Fecha y Hora" type="datetime-local" value={formEnt.fecha} onChange={fEnt('fecha')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField select fullWidth size="small" label="Tipo" value={formEnt.tipo} onChange={fEnt('tipo')}>
                  {TIPOS_ENT.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Entrevistador" value={formEnt.entrevistador} onChange={fEnt('entrevistador')} />
              </Grid>
              {editingEnt && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField select fullWidth size="small" label="Resultado" value={formEnt.resultado} onChange={fEnt('resultado')}>
                      {RESULTADOS_ENT.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth size="small" label="Calificación (0–10)" type="number"
                      value={formEnt.calificacion} onChange={fEnt('calificacion')}
                      inputProps={{ min: 0, max: 10, step: 0.5 }} />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Notas" value={formEnt.notas} onChange={fEnt('notas')} multiline rows={3} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenEnt(false); setEditingEnt(null) }} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveEnt}
              disabled={createEnt.isPending || updateEnt.isPending || !formEnt.postulacion_id || !formEnt.fecha}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}>
              {createEnt.isPending || updateEnt.isPending ? <CircularProgress size={18} color="inherit" /> : editingEnt ? 'Guardar' : 'Programar'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Layout>
  )
}
