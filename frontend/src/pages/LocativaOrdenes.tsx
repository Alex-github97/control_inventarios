import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Grid, Button, Chip, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, alpha, Tab, Tabs,
  CircularProgress, InputAdornment,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Search as SearchIcon,
  Handyman as OTIcon, Close as CloseIcon, PlayArrow as IniciarIcon,
  CheckCircle as CerrarIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ML_COLOR = '#0D9488'

interface Activo { id: number; tag: string; nombre: string }
interface Personal { id: number; nombre: string; apellido: string }
interface CatalogoTarea { id: number; nombre: string; tipo: string }

interface OT {
  id: number
  numero: string
  titulo: string
  descripcion: string | null
  tipo: string
  estado: string
  prioridad: string
  es_capitalizable: boolean
  activo_id: number | null
  activo_tag: string | null
  activo_nombre: string | null
  responsable_id: number | null
  responsable_nombre: string | null
  fecha_programada: string | null
  fecha_inicio: string | null
  fecha_cierre: string | null
  costo_estimado: number | null
  costo_real: number | null
}

const TIPOS = ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'MEJORATIVO', 'INSPECCION']
const PRIORIDADES = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']
const ESTADOS = ['ABIERTA', 'ASIGNADA', 'EN_PROGRESO', 'CERRADA', 'VERIFICADA', 'CANCELADA']

const ESTADO_COLOR: Record<string, string> = {
  ABIERTA: '#D97706', ASIGNADA: '#0EA5E9', EN_PROGRESO: ML_COLOR,
  CERRADA: '#6B7280', VERIFICADA: '#16A34A', CANCELADA: '#DC2626',
}

const PRIORIDAD_COLOR: Record<string, string> = {
  CRITICA: '#DC2626', ALTA: '#D97706', MEDIA: '#0EA5E9', BAJA: '#6B7280',
}

const TIPO_COLOR: Record<string, string> = {
  PREVENTIVO: '#16A34A', CORRECTIVO: '#DC2626', PREDICTIVO: '#0EA5E9',
  MEJORATIVO: '#7C3AED', INSPECCION: '#D97706',
}

const EMPTY = {
  titulo: '', descripcion: '', tipo: 'PREVENTIVO', prioridad: 'MEDIA',
  es_capitalizable: false, activo_id: '', responsable_id: '',
  fecha_programada: '', costo_estimado: '',
}

const fmt = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
    : '—'

export default function LocativaOrdenes() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<OT | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })

  const TAB_ESTADOS = [null, 'ABIERTA', 'ASIGNADA', 'EN_PROGRESO', 'CERRADA', 'VERIFICADA']

  const { data: ots = [], isLoading } = useQuery<OT[]>({
    queryKey: ['locativa-ots'],
    queryFn: () => api.get('/locativa/ordenes/').then(r => r.data),
  })

  const { data: activos = [] } = useQuery<Activo[]>({
    queryKey: ['locativa-activos'],
    queryFn: () => api.get('/locativa/activos/').then(r => r.data),
  })

  const crear = useMutation({
    mutationFn: (data: any) => api.post('/locativa/ordenes/', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-ots'] }); handleClose(); toast.success('OT creada') },
    onError: () => toast.error('Error al crear OT'),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/locativa/ordenes/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-ots'] }); handleClose(); toast.success('OT actualizada') },
    onError: () => toast.error('Error al actualizar OT'),
  })

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.patch(`/locativa/ordenes/${id}/estado`, { estado }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-ots'] }); toast.success('Estado actualizado') },
    onError: () => toast.error('Error al cambiar estado'),
  })

  const handleOpen = (ot?: OT) => {
    setEditing(ot ?? null)
    setForm(ot ? {
      titulo: ot.titulo, descripcion: ot.descripcion ?? '', tipo: ot.tipo, prioridad: ot.prioridad,
      es_capitalizable: ot.es_capitalizable as any, activo_id: String(ot.activo_id ?? ''),
      responsable_id: String(ot.responsable_id ?? ''),
      fecha_programada: ot.fecha_programada ?? '', costo_estimado: String(ot.costo_estimado ?? ''),
    } : { ...EMPTY })
    setOpen(true)
  }

  const handleClose = () => { setOpen(false); setEditing(null) }

  const handleSave = () => {
    const payload: any = {
      ...form,
      activo_id: form.activo_id ? Number(form.activo_id) : null,
      responsable_id: form.responsable_id ? Number(form.responsable_id) : null,
      costo_estimado: form.costo_estimado ? Number(form.costo_estimado) : null,
      fecha_programada: form.fecha_programada || null,
    }
    if (editing) actualizar.mutate({ id: editing.id, data: payload })
    else crear.mutate(payload)
  }

  const filtered = ots.filter(o => {
    const estadoFiltro = TAB_ESTADOS[tab]
    if (estadoFiltro && o.estado !== estadoFiltro) return false
    if (search && !o.titulo.toLowerCase().includes(search.toLowerCase()) && !o.numero.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>Órdenes de Trabajo</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Nueva OT
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <TextField
            size="small"
            placeholder="Buscar por título o número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: ML_COLOR }, '& .MuiTabs-indicator': { bgcolor: ML_COLOR } }}>
          <Tab label={`Todas (${ots.length})`} />
          <Tab label={`Abiertas (${ots.filter(o => o.estado === 'ABIERTA').length})`} />
          <Tab label={`Asignadas (${ots.filter(o => o.estado === 'ASIGNADA').length})`} />
          <Tab label={`En progreso (${ots.filter(o => o.estado === 'EN_PROGRESO').length})`} />
          <Tab label={`Cerradas (${ots.filter(o => o.estado === 'CERRADA').length})`} />
          <Tab label={`Verificadas (${ots.filter(o => o.estado === 'VERIFICADA').length})`} />
        </Tabs>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: ML_COLOR }} /></Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(ot => (
              <Grid key={ot.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%', '&:hover': { border: `1px solid ${alpha(ML_COLOR, 0.3)}` }, transition: 'border 0.15s ease' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700} fontSize={14}>{ot.titulo}</Typography>
                      <Typography fontSize={11} color="text.secondary" sx={{ fontFamily: 'monospace' }}>{ot.numero}</Typography>
                    </Box>
                    <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpen(ot)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>

                  <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" gap={0.5}>
                    <Chip label={ot.estado} size="small" sx={{ bgcolor: alpha(ESTADO_COLOR[ot.estado] ?? '#6B7280', 0.1), color: ESTADO_COLOR[ot.estado] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                    <Chip label={ot.tipo} size="small" sx={{ bgcolor: alpha(TIPO_COLOR[ot.tipo] ?? '#6B7280', 0.1), color: TIPO_COLOR[ot.tipo] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                    <Chip label={ot.prioridad} size="small" sx={{ bgcolor: alpha(PRIORIDAD_COLOR[ot.prioridad] ?? '#6B7280', 0.1), color: PRIORIDAD_COLOR[ot.prioridad] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                    {ot.es_capitalizable && <Chip label="IAS 16" size="small" sx={{ bgcolor: alpha('#7C3AED', 0.1), color: '#7C3AED', fontWeight: 600, fontSize: 11 }} />}
                  </Stack>

                  <Stack spacing={0.5} mb={1.5}>
                    {ot.activo_nombre && <Typography fontSize={12} color="text.secondary">⚙️ {ot.activo_tag} — {ot.activo_nombre}</Typography>}
                    {ot.responsable_nombre && <Typography fontSize={12} color="text.secondary">👤 {ot.responsable_nombre}</Typography>}
                    {ot.fecha_programada && <Typography fontSize={12} color="text.secondary">📅 {ot.fecha_programada}</Typography>}
                    {ot.costo_estimado != null && <Typography fontSize={12} color="text.secondary">Estimado: {fmt(ot.costo_estimado)}</Typography>}
                    {ot.costo_real != null && <Typography fontSize={12} color="text.secondary">Real: {fmt(ot.costo_real)}</Typography>}
                  </Stack>

                  {/* State machine actions */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                    {ot.estado === 'ABIERTA' && (
                      <Button size="small" startIcon={<IniciarIcon />} onClick={() => cambiarEstado.mutate({ id: ot.id, estado: 'ASIGNADA' })} sx={{ textTransform: 'none', fontSize: 12, color: '#0EA5E9', p: '2px 8px' }}>Asignar</Button>
                    )}
                    {ot.estado === 'ASIGNADA' && (
                      <Button size="small" startIcon={<IniciarIcon />} onClick={() => cambiarEstado.mutate({ id: ot.id, estado: 'EN_PROGRESO' })} sx={{ textTransform: 'none', fontSize: 12, color: ML_COLOR, p: '2px 8px' }}>Iniciar</Button>
                    )}
                    {ot.estado === 'EN_PROGRESO' && (
                      <Button size="small" startIcon={<CerrarIcon />} onClick={() => cambiarEstado.mutate({ id: ot.id, estado: 'CERRADA' })} sx={{ textTransform: 'none', fontSize: 12, color: '#16A34A', p: '2px 8px' }}>Cerrar</Button>
                    )}
                    {ot.estado === 'CERRADA' && (
                      <Button size="small" startIcon={<CerrarIcon />} onClick={() => cambiarEstado.mutate({ id: ot.id, estado: 'VERIFICADA' })} sx={{ textTransform: 'none', fontSize: 12, color: '#16A34A', p: '2px 8px' }}>Verificar</Button>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
            {filtered.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={8} color="text.secondary">
                  <OTIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                  <Typography>No hay órdenes de trabajo</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Dialog crear/editar */}
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editing ? `Editar OT — ${editing.numero}` : 'Nueva Orden de Trabajo'}
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Título *" value={form.titulo} onChange={f('titulo')} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Descripción" multiline rows={2} value={form.descripcion} onChange={f('descripcion')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Tipo" value={form.tipo} onChange={f('tipo')}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Prioridad" value={form.prioridad} onChange={f('prioridad')}>
                  {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Capitalizable IAS 16" value={String(form.es_capitalizable)} onChange={e => setForm(prev => ({ ...prev, es_capitalizable: e.target.value === 'true' as any }))}>
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Sí — capitalizable</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Activo" value={form.activo_id} onChange={f('activo_id')}>
                  <MenuItem value="">Sin activo</MenuItem>
                  {activos.map((a: Activo) => <MenuItem key={a.id} value={a.id}>{a.tag} — {a.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" type="date" label="Fecha programada" value={form.fecha_programada} onChange={f('fecha_programada')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" type="number" label="Costo estimado (COP)" value={form.costo_estimado} onChange={f('costo_estimado')} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!form.titulo || crear.isPending || actualizar.isPending}
              sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {crear.isPending || actualizar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
