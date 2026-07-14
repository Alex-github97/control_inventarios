import React, { useState, useEffect } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Tooltip, CircularProgress,
  Avatar, InputAdornment, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  MedicalServices as MedicalIcon,
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

interface Colaborador { id: number; nombres: string; apellidos: string; cargo?: string }
interface Incapacidad {
  id: number
  colaborador_id: number
  colaborador_nombre?: string
  colaborador_apellido?: string
  tipo_incapacidad: string
  diagnostico?: string
  entidad_emisora?: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  costo_empresa: number
  costo_eps: number
  estado: string
  notas?: string
}

const TIPOS = ['ENFERMEDAD_COMUN', 'ACCIDENTE_LABORAL', 'ENFERMEDAD_LABORAL', 'MATERNIDAD', 'PATERNIDAD', 'RIESGO_PROFESIONAL']
const TIPO_LABEL: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_LABORAL: 'Accidente Laboral',
  ENFERMEDAD_LABORAL: 'Enfermedad Laboral',
  MATERNIDAD: 'Maternidad',
  PATERNIDAD: 'Paternidad',
  RIESGO_PROFESIONAL: 'Riesgo Profesional',
}
const TIPO_COLOR: Record<string, string> = {
  ENFERMEDAD_COMUN: '#3B82F6',
  ACCIDENTE_LABORAL: '#F59E0B',
  ENFERMEDAD_LABORAL: '#EF4444',
  MATERNIDAD: '#EC4899',
  PATERNIDAD: '#6366F1',
  RIESGO_PROFESIONAL: '#D97706',
}
const ESTADOS_INC = ['ACTIVA', 'VENCIDA', 'PAGADA', 'ANULADA']
const ESTADO_COLOR_INC: Record<string, string> = {
  ACTIVA: '#16A34A', VENCIDA: '#D97706', PAGADA: '#3B82F6', ANULADA: '#9CA3AF',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function calcBusinessDays(from: string, to: string): number {
  if (!from || !to) return 0
  const start = new Date(from)
  const end = new Date(to)
  if (end < start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

const EMPTY_FORM = {
  colaborador_id: '',
  tipo_incapacidad: 'ENFERMEDAD_COMUN',
  diagnostico: '',
  entidad_emisora: '',
  fecha_inicio: '',
  fecha_fin: '',
  dias: '',
  costo_empresa: '',
  costo_eps: '',
  notas: '',
}

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

export default function GHIncapacidades() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Incapacidad | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Incapacidad | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [colabSearch, setColabSearch] = useState('')
  const [colabOptions, setColabOptions] = useState<Colaborador[]>([])
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null)

  const { data: incapacidades = [], isLoading } = useQuery<Incapacidad[]>({
    queryKey: ['gh-incapacidades', filterTipo, filterEstado],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterTipo) params.append('tipo', filterTipo)
      if (filterEstado) params.append('estado', filterEstado)
      return api.get(`/hcm/incapacidades?${params}`).then(r => r.data)
    },
  })

  useEffect(() => {
    if (!colabSearch || colabSearch.length < 2) { setColabOptions([]); return }
    const t = setTimeout(() => {
      api.get(`/hcm/colaboradores?search=${encodeURIComponent(colabSearch)}`).then(r => setColabOptions(r.data)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [colabSearch])

  useEffect(() => {
    if (form.fecha_inicio && form.fecha_fin) {
      const d = calcBusinessDays(form.fecha_inicio, form.fecha_fin)
      setForm(prev => ({ ...prev, dias: String(d) }))
    }
  }, [form.fecha_inicio, form.fecha_fin])

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/hcm/incapacidades', d).then(r => r.data),
    onSuccess: () => { toast.success('Incapacidad registrada'); qc.invalidateQueries({ queryKey: ['gh-incapacidades'] }); handleClose() },
    onError: () => toast.error('Error al registrar incapacidad'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/incapacidades/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Incapacidad actualizada'); qc.invalidateQueries({ queryKey: ['gh-incapacidades'] }); handleClose() },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/hcm/incapacidades/${id}`),
    onSuccess: () => { toast.success('Incapacidad eliminada'); qc.invalidateQueries({ queryKey: ['gh-incapacidades'] }); setDeleteTarget(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const handleOpen = (inc?: Incapacidad) => {
    setEditing(inc ?? null)
    if (inc) {
      setForm({
        colaborador_id: String(inc.colaborador_id),
        tipo_incapacidad: inc.tipo_incapacidad,
        diagnostico: inc.diagnostico ?? '',
        entidad_emisora: inc.entidad_emisora ?? '',
        fecha_inicio: inc.fecha_inicio,
        fecha_fin: inc.fecha_fin,
        dias: String(inc.dias),
        costo_empresa: String(inc.costo_empresa),
        costo_eps: String(inc.costo_eps),
        notas: inc.notas ?? '',
      })
      setSelectedColab(inc.colaborador_nombre ? { id: inc.colaborador_id, nombres: inc.colaborador_nombre, apellidos: inc.colaborador_apellido ?? '' } : null)
    } else {
      setForm({ ...EMPTY_FORM })
      setSelectedColab(null)
    }
    setColabSearch('')
    setColabOptions([])
    setOpen(true)
  }

  const handleClose = () => { setOpen(false); setEditing(null) }

  const handleSave = () => {
    const payload = {
      colaborador_id: Number(form.colaborador_id),
      tipo_incapacidad: form.tipo_incapacidad,
      diagnostico: form.diagnostico || null,
      entidad_emisora: form.entidad_emisora || null,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      dias: Number(form.dias) || 0,
      costo_empresa: Number(form.costo_empresa) || 0,
      costo_eps: Number(form.costo_eps) || 0,
      notas: form.notas || null,
    }
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const activas = incapacidades.filter(i => i.estado === 'ACTIVA')
  const enfermedadComun = incapacidades.filter(i => i.tipo_incapacidad === 'ENFERMEDAD_COMUN')
  const accidenteLaboral = incapacidades.filter(i => i.tipo_incapacidad === 'ACCIDENTE_LABORAL')
  const diasMes = incapacidades
    .filter(i => i.fecha_inicio?.startsWith(thisMonth))
    .reduce((acc, i) => acc + (i.dias || 0), 0)

  const filtered = incapacidades.filter(i => {
    if (search) {
      const name = `${i.colaborador_nombre ?? ''} ${i.colaborador_apellido ?? ''}`.toLowerCase()
      if (!name.includes(search.toLowerCase())) return false
    }
    if (filterDesde && i.fecha_inicio < filterDesde) return false
    if (filterHasta && i.fecha_inicio > filterHasta) return false
    return true
  })

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, bgcolor: alpha(GH_COLOR, 0.12), borderRadius: 2, display: 'flex' }}>
            <MedicalIcon sx={{ color: GH_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Gestión de Incapacidades</Typography>
            <Typography variant="body2" color="text.secondary">Registro y control de incapacidades laborales</Typography>
          </Box>
          <Box flex={1} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Nueva Incapacidad
          </Button>
        </Stack>

        {/* Stats */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Total Activas" value={activas.length} color={GH_COLOR} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Enfermedad Común" value={enfermedadComun.length} color="#3B82F6" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Accidente Laboral" value={accidenteLaboral.length} color="#F59E0B" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Días Acumulados (mes)" value={diasMes} color="#6366F1" />
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 220 }}
            />
            <TextField select size="small" label="Tipo" value={filterTipo} onChange={e => setFilterTipo(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">Todos</MenuItem>
              {TIPOS.map(t => <MenuItem key={t} value={t}>{TIPO_LABEL[t]}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Estado" value={filterEstado} onChange={e => setFilterEstado(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value="">Todos</MenuItem>
              {ESTADOS_INC.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Desde" type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
            <TextField size="small" label="Hasta" type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
          </Stack>
        </Paper>

        {/* Table */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: alpha(GH_COLOR, 0.06) }}>
                    {['Colaborador', 'Tipo', 'Diagnóstico', 'Entidad Emisora', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Costo Empresa', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Sin registros</td></tr>
                  ) : filtered.map((inc, idx) => (
                    <tr key={inc.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: GH_COLOR }}>
                            {(inc.colaborador_nombre?.[0] ?? '') + (inc.colaborador_apellido?.[0] ?? '')}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                            {inc.colaborador_nombre} {inc.colaborador_apellido}
                          </Typography>
                        </Stack>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip label={TIPO_LABEL[inc.tipo_incapacidad] ?? inc.tipo_incapacidad} size="small"
                          sx={{ bgcolor: alpha(TIPO_COLOR[inc.tipo_incapacidad] ?? '#6B7280', 0.12), color: TIPO_COLOR[inc.tipo_incapacidad] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={inc.diagnostico ?? ''}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{inc.diagnostico || '—'}</Typography>
                        </Tooltip>
                      </td>
                      <td style={{ padding: '10px 14px' }}><Typography variant="body2">{inc.entidad_emisora || '—'}</Typography></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(inc.fecha_inicio)}</Typography></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(inc.fecha_fin)}</Typography></td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}><Typography variant="body2" fontWeight={600}>{inc.dias}</Typography></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmt(inc.costo_empresa)}</Typography></td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip label={inc.estado} size="small"
                          sx={{ bgcolor: alpha(ESTADO_COLOR_INC[inc.estado] ?? '#9CA3AF', 0.12), color: ESTADO_COLOR_INC[inc.estado] ?? '#9CA3AF', fontWeight: 600, fontSize: 11 }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpen(inc)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteTarget(inc)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Paper>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
            {editing ? 'Editar Incapacidad' : 'Nueva Incapacidad'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {/* Colaborador Autocomplete */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Buscar Colaborador"
                  value={colabSearch}
                  onChange={e => setColabSearch(e.target.value)}
                  placeholder="Escriba nombre para buscar..."
                  helperText={selectedColab ? `Seleccionado: ${selectedColab.nombres} ${selectedColab.apellidos}` : 'Mínimo 2 caracteres'}
                />
                {colabOptions.length > 0 && (
                  <Paper sx={{ mt: 0.5, maxHeight: 160, overflow: 'auto', border: '1px solid #E5E7EB' }}>
                    {colabOptions.map(c => (
                      <Box key={c.id} sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#F9FAFB' } }}
                        onClick={() => {
                          setSelectedColab(c)
                          setForm(prev => ({ ...prev, colaborador_id: String(c.id) }))
                          setColabSearch(`${c.nombres} ${c.apellidos}`)
                          setColabOptions([])
                        }}>
                        <Typography variant="body2" fontWeight={600}>{c.nombres} {c.apellidos}</Typography>
                        {c.cargo && <Typography variant="caption" color="text.secondary">{c.cargo}</Typography>}
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth size="small" label="Tipo de Incapacidad" value={form.tipo_incapacidad} onChange={f('tipo_incapacidad')}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{TIPO_LABEL[t]}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Entidad Emisora" value={form.entidad_emisora} onChange={f('entidad_emisora')} placeholder="EPS Sura, ARL..." />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Diagnóstico (opcional)" value={form.diagnostico} onChange={f('diagnostico')} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Fecha Inicio" type="date" value={form.fecha_inicio} onChange={f('fecha_inicio')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Fecha Fin" type="date" value={form.fecha_fin} onChange={f('fecha_fin')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Días" type="number" value={form.dias} onChange={f('dias')}
                  helperText="Auto-calculado (días hábiles)" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Costo Empresa (COP)" type="number" value={form.costo_empresa} onChange={f('costo_empresa')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="Costo EPS (COP)" type="number" value={form.costo_eps} onChange={f('costo_eps')} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Notas" value={form.notas} onChange={f('notas')} multiline rows={3} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving || !form.colaborador_id || !form.fecha_inicio || !form.fecha_fin}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, textTransform: 'none', fontWeight: 600 }}
            >
              {isSaving ? <CircularProgress size={18} color="inherit" /> : editing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={700}>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Eliminar la incapacidad de <strong>{deleteTarget?.colaborador_nombre} {deleteTarget?.colaborador_apellido}</strong>? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 600 }}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}>
              {deleteMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
