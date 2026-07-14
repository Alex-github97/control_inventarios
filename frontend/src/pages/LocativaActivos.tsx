import React, { useState } from 'react'
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, alpha, Tab, Tabs,
  CircularProgress, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Inventory2 as ActivoIcon,
  AttachMoney as ValorIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ML_COLOR = '#0D9488'

interface Sede { id: number; nombre: string }
interface Categoria { id: number; nombre: string }
interface Espacio { id: number; nombre: string; sede_id: number }

interface Activo {
  id: number
  tag: string
  nombre: string
  descripcion: string | null
  estado: string
  criticidad: string
  metodo_depreciacion: string
  costo_adquisicion: number | null
  valor_residual: number
  vida_util_anos: number | null
  depreciacion_acumulada: number
  deterioro_acumulado: number
  valor_libros: number | null
  depreciacion_anual: number | null
  fecha_adquisicion: string | null
  categoria_id: number | null
  sede_id: number | null
  espacio_id: number | null
  categoria_nombre: string | null
  sede_nombre: string | null
  espacio_nombre: string | null
}

const ESTADOS = ['OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_SERVICIO', 'BAJA', 'CUARENTENA']
const CRITICIDADES = ['CRITICO', 'IMPORTANTE', 'ESTANDAR']
const METODOS_DEP = ['LINEA_RECTA', 'SALDOS_DECRECIENTES', 'UNIDADES_PRODUCCION']

const ESTADO_COLOR: Record<string, string> = {
  OPERATIVO: '#16A34A',
  EN_MANTENIMIENTO: '#D97706',
  FUERA_SERVICIO: '#DC2626',
  BAJA: '#6B7280',
  CUARENTENA: '#7C3AED',
}

const CRITICIDAD_COLOR: Record<string, string> = {
  CRITICO: '#DC2626',
  IMPORTANTE: '#D97706',
  ESTANDAR: '#6B7280',
}

const fmt = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
    : '—'

const EMPTY: Partial<Activo> & { [k: string]: any } = {
  tag: '', nombre: '', descripcion: '', estado: 'OPERATIVO', criticidad: 'ESTANDAR',
  metodo_depreciacion: 'LINEA_RECTA', costo_adquisicion: undefined, valor_residual: 0,
  vida_util_anos: undefined, depreciacion_acumulada: 0, deterioro_acumulado: 0,
  fecha_adquisicion: '', categoria_id: '', sede_id: '', espacio_id: '',
}

export default function LocativaActivos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Activo | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })

  const TAB_ESTADOS = [null, 'OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_SERVICIO', 'BAJA']

  const { data: activos = [], isLoading } = useQuery<Activo[]>({
    queryKey: ['locativa-activos'],
    queryFn: () => api.get('/locativa/activos/').then(r => r.data),
  })

  const { data: sedes = [] } = useQuery<Sede[]>({
    queryKey: ['locativa-sedes'],
    queryFn: () => api.get('/locativa/sedes/').then(r => r.data),
  })

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['locativa-categorias'],
    queryFn: () => api.get('/locativa/categorias/').then(r => r.data),
  })

  const { data: espacios = [] } = useQuery<Espacio[]>({
    queryKey: ['locativa-espacios'],
    queryFn: () => api.get('/locativa/espacios/').then(r => r.data),
  })

  const crear = useMutation({
    mutationFn: (data: any) => api.post('/locativa/activos/', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-activos'] }); handleClose(); toast.success('Activo creado') },
    onError: () => toast.error('Error al crear activo'),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/locativa/activos/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-activos'] }); handleClose(); toast.success('Activo actualizado') },
    onError: () => toast.error('Error al actualizar activo'),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/locativa/activos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locativa-activos'] }); toast.success('Activo eliminado') },
    onError: () => toast.error('Error al eliminar activo'),
  })

  const handleOpen = (a?: Activo) => {
    setEditing(a ?? null)
    setForm(a ? {
      tag: a.tag, nombre: a.nombre, descripcion: a.descripcion ?? '',
      estado: a.estado, criticidad: a.criticidad,
      metodo_depreciacion: a.metodo_depreciacion,
      costo_adquisicion: a.costo_adquisicion ?? undefined,
      valor_residual: a.valor_residual, vida_util_anos: a.vida_util_anos ?? undefined,
      depreciacion_acumulada: a.depreciacion_acumulada, deterioro_acumulado: a.deterioro_acumulado,
      fecha_adquisicion: a.fecha_adquisicion ?? '',
      categoria_id: a.categoria_id ?? '', sede_id: a.sede_id ?? '', espacio_id: a.espacio_id ?? '',
    } : { ...EMPTY })
    setOpen(true)
  }

  const handleClose = () => { setOpen(false); setEditing(null) }

  const handleSave = () => {
    const payload: any = { ...form }
    if (!payload.costo_adquisicion) payload.costo_adquisicion = null
    if (!payload.vida_util_anos) payload.vida_util_anos = null
    if (!payload.fecha_adquisicion) payload.fecha_adquisicion = null
    if (!payload.categoria_id) payload.categoria_id = null
    if (!payload.sede_id) payload.sede_id = null
    if (!payload.espacio_id) payload.espacio_id = null
    if (editing) actualizar.mutate({ id: editing.id, data: payload })
    else crear.mutate(payload)
  }

  const filteredEspacios = form.sede_id ? espacios.filter((e: Espacio) => e.sede_id === Number(form.sede_id)) : espacios

  const filtered = activos.filter(a => {
    const estadoFiltro = TAB_ESTADOS[tab]
    if (estadoFiltro && a.estado !== estadoFiltro) return false
    if (search && !a.nombre.toLowerCase().includes(search.toLowerCase()) && !a.tag.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>Activos</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: ML_COLOR, '&:hover': { bgcolor: '#0F766E' }, borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Nuevo activo
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <TextField
            size="small"
            placeholder="Buscar por nombre o TAG..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: ML_COLOR }, '& .MuiTabs-indicator': { bgcolor: ML_COLOR } }}>
          <Tab label={`Todos (${activos.length})`} />
          <Tab label={`Operativos (${activos.filter(a => a.estado === 'OPERATIVO').length})`} />
          <Tab label={`En mantenimiento (${activos.filter(a => a.estado === 'EN_MANTENIMIENTO').length})`} />
          <Tab label={`Fuera de servicio (${activos.filter(a => a.estado === 'FUERA_SERVICIO').length})`} />
          <Tab label={`Baja (${activos.filter(a => a.estado === 'BAJA').length})`} />
        </Tabs>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: ML_COLOR }} /></Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(a => (
              <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%', '&:hover': { border: `1px solid ${alpha(ML_COLOR, 0.3)}` }, transition: 'border 0.15s ease' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700} fontSize={14}>{a.nombre}</Typography>
                      <Typography fontSize={11} color="text.secondary" sx={{ fontFamily: 'monospace' }}>{a.tag}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpen(a)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => { if (window.confirm(`¿Eliminar "${a.nombre}"?`)) eliminar.mutate(a.id) }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" gap={0.5}>
                    <Chip label={a.estado.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(ESTADO_COLOR[a.estado] ?? '#6B7280', 0.1), color: ESTADO_COLOR[a.estado] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                    <Chip label={a.criticidad} size="small" sx={{ bgcolor: alpha(CRITICIDAD_COLOR[a.criticidad] ?? '#6B7280', 0.1), color: CRITICIDAD_COLOR[a.criticidad] ?? '#6B7280', fontWeight: 600, fontSize: 11 }} />
                  </Stack>

                  <Stack spacing={0.5}>
                    {a.sede_nombre && <Typography fontSize={12} color="text.secondary">📍 {a.sede_nombre}{a.espacio_nombre ? ` · ${a.espacio_nombre}` : ''}</Typography>}
                    {a.categoria_nombre && <Typography fontSize={12} color="text.secondary">🏷️ {a.categoria_nombre}</Typography>}
                    {a.valor_libros != null && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <ValorIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography fontSize={12} color="text.secondary">Valor libros: <strong>{fmt(a.valor_libros)}</strong></Typography>
                      </Stack>
                    )}
                    {a.depreciacion_anual != null && (
                      <Typography fontSize={12} color="text.secondary">Dep. anual: {fmt(a.depreciacion_anual)}</Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
            {filtered.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={8} color="text.secondary">
                  <ActivoIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                  <Typography>No hay activos en esta categoría</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Dialog crear/editar */}
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editing ? 'Editar activo' : 'Nuevo activo'}
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" label="TAG *" value={form.tag ?? ''} onChange={f('tag')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth size="small" label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Descripción" multiline rows={2} value={form.descripcion ?? ''} onChange={f('descripcion')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Estado" value={form.estado ?? 'OPERATIVO'} onChange={f('estado')}>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Criticidad" value={form.criticidad ?? 'ESTANDAR'} onChange={f('criticidad')}>
                  {CRITICIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Categoría" value={form.categoria_id ?? ''} onChange={f('categoria_id')}>
                  <MenuItem value="">Sin categoría</MenuItem>
                  {categorias.map((c: Categoria) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Sede" value={form.sede_id ?? ''} onChange={f('sede_id')}>
                  <MenuItem value="">Sin sede</MenuItem>
                  {sedes.map((s: Sede) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" select label="Espacio" value={form.espacio_id ?? ''} onChange={f('espacio_id')}>
                  <MenuItem value="">Sin espacio</MenuItem>
                  {filteredEspacios.map((e: Espacio) => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>IAS 16 — Valoración</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" select label="Método depreciación" value={form.metodo_depreciacion ?? 'LINEA_RECTA'} onChange={f('metodo_depreciacion')}>
                  {METODOS_DEP.map(m => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" type="number" label="Costo adquisición (COP)" value={form.costo_adquisicion ?? ''} onChange={f('costo_adquisicion')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" type="number" label="Valor residual (COP)" value={form.valor_residual ?? 0} onChange={f('valor_residual')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" type="number" label="Vida útil (años)" value={form.vida_util_anos ?? ''} onChange={f('vida_util_anos')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" type="number" label="Depreciación acumulada" value={form.depreciacion_acumulada ?? 0} onChange={f('depreciacion_acumulada')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" type="number" label="Deterioro acumulado" value={form.deterioro_acumulado ?? 0} onChange={f('deterioro_acumulado')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth size="small" type="date" label="Fecha adquisición" value={form.fecha_adquisicion ?? ''} onChange={f('fecha_adquisicion')} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!form.tag || !form.nombre || crear.isPending || actualizar.isPending}
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
