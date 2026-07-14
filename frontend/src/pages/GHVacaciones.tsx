import React, { useState, useEffect } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Tooltip, CircularProgress,
  Avatar, InputAdornment, alpha, Tabs, Tab, Badge, Card, CardContent, CardActions,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  BeachAccess as BeachIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GH_COLOR = '#BE185D'

interface Colaborador { id: number; nombres: string; apellidos: string; cargo?: string }
interface Vacacion {
  id: number
  colaborador_id: number
  colaborador_nombre?: string
  colaborador_apellido?: string
  colaborador_cargo?: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  tipo: string
  estado: string
  notas?: string
  fecha_solicitud?: string
}

const TIPOS_VAC = ['DISFRUTE', 'COMPENSACION']
const ESTADOS_VAC = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'DISFRUTANDO', 'COMPLETADA']
const ESTADO_VAC_COLOR: Record<string, string> = {
  PENDIENTE: '#D97706',
  APROBADA: '#16A34A',
  RECHAZADA: '#EF4444',
  DISFRUTANDO: '#3B82F6',
  COMPLETADA: '#9CA3AF',
}

const fmtDate = (d: string) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function calcCalendarDays(from: string, to: string): number {
  if (!from || !to) return 0
  const start = new Date(from)
  const end = new Date(to)
  if (end < start) return 0
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
}

const EMPTY_FORM = {
  colaborador_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  tipo: 'DISFRUTE',
  notas: '',
  dias: '',
}

export default function GHVacaciones() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // Tab 0/2 filters
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  // Dialog
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Vacacion | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [colabSearch, setColabSearch] = useState('')
  const [colabOptions, setColabOptions] = useState<Colaborador[]>([])
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null)

  const { data: vacaciones = [], isLoading } = useQuery<Vacacion[]>({
    queryKey: ['gh-vacaciones'],
    queryFn: () => api.get('/hcm/vacaciones').then(r => r.data),
  })

  const pendientes = vacaciones.filter(v => v.estado === 'PENDIENTE')

  useEffect(() => {
    if (!colabSearch || colabSearch.length < 2) { setColabOptions([]); return }
    const t = setTimeout(() => {
      api.get(`/hcm/colaboradores?search=${encodeURIComponent(colabSearch)}`).then(r => setColabOptions(r.data)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [colabSearch])

  useEffect(() => {
    if (form.fecha_inicio && form.fecha_fin) {
      const d = calcCalendarDays(form.fecha_inicio, form.fecha_fin)
      setForm(prev => ({ ...prev, dias: String(d) }))
    }
  }, [form.fecha_inicio, form.fecha_fin])

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/hcm/vacaciones', d).then(r => r.data),
    onSuccess: () => { toast.success('Solicitud creada'); qc.invalidateQueries({ queryKey: ['gh-vacaciones'] }); handleClose() },
    onError: () => toast.error('Error al crear solicitud'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/hcm/vacaciones/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Solicitud actualizada'); qc.invalidateQueries({ queryKey: ['gh-vacaciones'] }); handleClose() },
    onError: () => toast.error('Error al actualizar'),
  })

  const aprobarMut = useMutation({
    mutationFn: (id: number) => api.put(`/hcm/vacaciones/${id}/aprobar`, {}).then(r => r.data),
    onSuccess: () => { toast.success('Vacaciones aprobadas'); qc.invalidateQueries({ queryKey: ['gh-vacaciones'] }) },
    onError: () => toast.error('Error al aprobar'),
  })

  const rechazarMut = useMutation({
    mutationFn: (id: number) => api.put(`/hcm/vacaciones/${id}/rechazar`, {}).then(r => r.data),
    onSuccess: () => { toast.success('Solicitud rechazada'); qc.invalidateQueries({ queryKey: ['gh-vacaciones'] }) },
    onError: () => toast.error('Error al rechazar'),
  })

  const handleOpen = (vac?: Vacacion) => {
    setEditing(vac ?? null)
    if (vac) {
      setForm({
        colaborador_id: String(vac.colaborador_id),
        fecha_inicio: vac.fecha_inicio,
        fecha_fin: vac.fecha_fin,
        tipo: vac.tipo,
        notas: vac.notas ?? '',
        dias: String(vac.dias),
      })
      setSelectedColab(vac.colaborador_nombre ? { id: vac.colaborador_id, nombres: vac.colaborador_nombre, apellidos: vac.colaborador_apellido ?? '' } : null)
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
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      tipo: form.tipo,
      dias: Number(form.dias) || 0,
      notas: form.notas || null,
    }
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const filterRow = (v: Vacacion) => {
    if (search) {
      const name = `${v.colaborador_nombre ?? ''} ${v.colaborador_apellido ?? ''}`.toLowerCase()
      if (!name.includes(search.toLowerCase())) return false
    }
    if (filterEstado && v.estado !== filterEstado) return false
    if (filterTipo && v.tipo !== filterTipo) return false
    if (filterDesde && v.fecha_inicio < filterDesde) return false
    if (filterHasta && v.fecha_inicio > filterHasta) return false
    return true
  }

  const tab0Data = vacaciones.filter(v => v.estado !== 'COMPLETADA').filter(filterRow)
  const tab2Data = vacaciones.filter(filterRow)

  const isSaving = createMut.isPending || updateMut.isPending

  const VacTable = ({ rows }: { rows: Vacacion[] }) => (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: alpha(GH_COLOR, 0.06) }}>
            {['Colaborador', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Tipo', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Sin registros</td></tr>
          ) : rows.map((vac, idx) => (
            <tr key={vac.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
              <td style={{ padding: '10px 14px' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: GH_COLOR }}>
                    {(vac.colaborador_nombre?.[0] ?? '') + (vac.colaborador_apellido?.[0] ?? '')}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                    {vac.colaborador_nombre} {vac.colaborador_apellido}
                  </Typography>
                </Stack>
              </td>
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(vac.fecha_inicio)}</Typography></td>
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><Typography variant="body2">{fmtDate(vac.fecha_fin)}</Typography></td>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}><Typography variant="body2" fontWeight={600}>{vac.dias}</Typography></td>
              <td style={{ padding: '10px 14px' }}>
                <Chip label={vac.tipo} size="small" sx={{ fontWeight: 600, fontSize: 11, bgcolor: alpha('#6366F1', 0.1), color: '#6366F1' }} />
              </td>
              <td style={{ padding: '10px 14px' }}>
                <Chip label={vac.estado} size="small"
                  sx={{ bgcolor: alpha(ESTADO_VAC_COLOR[vac.estado] ?? '#9CA3AF', 0.12), color: ESTADO_VAC_COLOR[vac.estado] ?? '#9CA3AF', fontWeight: 600, fontSize: 11 }} />
              </td>
              <td style={{ padding: '10px 14px' }}>
                <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpen(vac)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  )

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, bgcolor: alpha(GH_COLOR, 0.12), borderRadius: 2, display: 'flex' }}>
            <BeachIcon sx={{ color: GH_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Gestión de Vacaciones</Typography>
            <Typography variant="body2" color="text.secondary">Solicitudes y aprobación de vacaciones</Typography>
          </Box>
          <Box flex={1} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Nueva Solicitud
          </Button>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: GH_COLOR }, '& .MuiTabs-indicator': { bgcolor: GH_COLOR } }}
        >
          <Tab label="Solicitudes" />
          <Tab
            label={
              pendientes.length > 0
                ? <Badge badgeContent={pendientes.length} color="error" sx={{ '& .MuiBadge-badge': { right: -12, top: -2 } }}>Pendientes de Aprobación</Badge>
                : 'Pendientes de Aprobación'
            }
          />
          <Tab label="Historial" />
        </Tabs>

        {/* Filters (Tab 0 & 2) */}
        {tab !== 1 && (
          <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
              <TextField
                size="small" placeholder="Buscar colaborador..."
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 220 }}
              />
              <TextField select size="small" label="Estado" value={filterEstado} onChange={e => setFilterEstado(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="">Todos</MenuItem>
                {ESTADOS_VAC.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Tipo" value={filterTipo} onChange={e => setFilterTipo(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="">Todos</MenuItem>
                {TIPOS_VAC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              {tab === 2 && (
                <>
                  <TextField size="small" label="Desde" type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
                  <TextField size="small" label="Hasta" type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
                </>
              )}
            </Stack>
          </Paper>
        )}

        {/* Tab 0: Solicitudes */}
        {tab === 0 && (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {isLoading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box>
              : <VacTable rows={tab0Data} />}
          </Paper>
        )}

        {/* Tab 1: Pendientes de Aprobación - Cards */}
        {tab === 1 && (
          isLoading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box> :
          pendientes.length === 0 ? (
            <Paper sx={{ borderRadius: 3, p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">No hay solicitudes pendientes de aprobación</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {pendientes.map(vac => (
                <Grid key={vac.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(GH_COLOR, 0.2)}`, boxShadow: 'none' }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                        <Avatar sx={{ bgcolor: GH_COLOR, width: 40, height: 40 }}>
                          {(vac.colaborador_nombre?.[0] ?? '') + (vac.colaborador_apellido?.[0] ?? '')}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={700}>
                            {vac.colaborador_nombre} {vac.colaborador_apellido}
                          </Typography>
                          {vac.colaborador_cargo && (
                            <Typography variant="caption" color="text.secondary">{vac.colaborador_cargo}</Typography>
                          )}
                        </Box>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Tipo</Typography>
                          <Chip label={vac.tipo} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha('#6366F1', 0.1), color: '#6366F1', fontWeight: 600 }} />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Desde</Typography>
                          <Typography variant="body2" fontWeight={600}>{fmtDate(vac.fecha_inicio)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Hasta</Typography>
                          <Typography variant="body2" fontWeight={600}>{fmtDate(vac.fecha_fin)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Días</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: GH_COLOR }}>{vac.dias} días</Typography>
                        </Stack>
                        {vac.notas && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>{vac.notas}</Typography>
                        )}
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                      <Button
                        fullWidth variant="contained" size="small" startIcon={<ApproveIcon />}
                        onClick={() => aprobarMut.mutate(vac.id)}
                        disabled={aprobarMut.isPending}
                        sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        fullWidth variant="outlined" size="small" startIcon={<RejectIcon />}
                        onClick={() => rechazarMut.mutate(vac.id)}
                        disabled={rechazarMut.isPending}
                        color="error"
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                      >
                        Rechazar
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )
        )}

        {/* Tab 2: Historial */}
        {tab === 2 && (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {isLoading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GH_COLOR }} /></Box>
              : <VacTable rows={tab2Data} />}
          </Paper>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={700}>{editing ? 'Editar Solicitud' : 'Nueva Solicitud de Vacaciones'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Buscar Colaborador"
                  value={colabSearch} onChange={e => setColabSearch(e.target.value)}
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
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Fecha Inicio" type="date" value={form.fecha_inicio} onChange={f('fecha_inicio')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Fecha Fin" type="date" value={form.fecha_fin} onChange={f('fecha_fin')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Días" type="number" value={form.dias} onChange={f('dias')} helperText="Auto-calculado" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField select fullWidth size="small" label="Tipo" value={form.tipo} onChange={f('tipo')}>
                  {TIPOS_VAC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
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
              {isSaving ? <CircularProgress size={18} color="inherit" /> : editing ? 'Guardar cambios' : 'Crear solicitud'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
