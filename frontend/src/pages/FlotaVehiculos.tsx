import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Grid, Tooltip, CircularProgress,
  Tabs, Tab, alpha, InputAdornment,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  DirectionsCar as CarIcon, Search as SearchIcon,
  CheckCircle as ActiveIcon, Cancel as InactiveIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#7C3AED'

interface Marca { id: number; nombre: string }
interface TipoV { id: number; nombre: string }
interface CentroCosto { id: number; codigo: string; nombre: string }
interface Vehiculo {
  id: number; placa: string; marca_id?: number; marca?: Marca
  tipo_vehiculo_id?: number; tipo_vehiculo?: TipoV
  linea?: string; modelo?: number; color?: string
  tipo_medicion: string; tipo_trabajo: string
  ciudad?: string; centro_costo_id?: number
  rendimiento_ideal?: number; activo: boolean
  fecha_baja?: string; motivo_baja?: string
}

const EMPTY: Record<string, string> = {
  placa: '', marca_id: '', tipo_vehiculo_id: '', linea: '', modelo: '',
  color: '', tipo_medicion: 'KM', tipo_trabajo: 'NORMAL',
  ciudad: '', centro_costo_id: '', rendimiento_ideal: '',
  nro_motor: '', nro_serie: '', observaciones: '',
}

const tipoMedicionOpts = [{ v: 'KM', l: 'Kilómetros' }, { v: 'HORAS', l: 'Horas' }, { v: 'AMBOS', l: 'Ambos' }]
const tipoTrabajoOpts = [{ v: 'BAJO', l: 'Bajo' }, { v: 'NORMAL', l: 'Normal' }, { v: 'SEVERO', l: 'Severo' }]

export default function FlotaVehiculos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vehiculo | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState<Vehiculo | null>(null)
  const [bajaDialog, setBajaDialog] = useState<Vehiculo | null>(null)
  const [bajaForm, setBajaForm] = useState({ fecha_baja: '', motivo_baja: '' })

  const { data: vehiculos = [], isLoading } = useQuery<Vehiculo[]>({
    queryKey: ['flota-vehiculos'],
    queryFn: () => api.get('/flota/vehiculos/').then(r => r.data),
  })
  const { data: marcas = [] } = useQuery<Marca[]>({
    queryKey: ['flota-marcas'],
    queryFn: () => api.get('/flota/marcas/').then(r => r.data),
  })
  const { data: tiposV = [] } = useQuery<TipoV[]>({
    queryKey: ['flota-tipos-vehiculo'],
    queryFn: () => api.get('/flota/tipos-vehiculo/').then(r => r.data),
  })
  const { data: centros = [] } = useQuery<CentroCosto[]>({
    queryKey: ['flota-centros-costo'],
    queryFn: () => api.get('/flota/centros-costo/').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/flota/vehiculos/', d).then(r => r.data),
    onSuccess: () => { toast.success('Vehículo registrado'); qc.invalidateQueries({ queryKey: ['flota-vehiculos'] }); handleClose() },
    onError: () => toast.error('Error al registrar'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/vehiculos/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Vehículo actualizado'); qc.invalidateQueries({ queryKey: ['flota-vehiculos'] }); handleClose() },
    onError: () => toast.error('Error al actualizar'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/vehiculos/${id}`),
    onSuccess: () => { toast.success('Vehículo eliminado'); qc.invalidateQueries({ queryKey: ['flota-vehiculos'] }); setDeleteConfirm(null) },
    onError: () => toast.error('Error al eliminar'),
  })
  const bajaMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.patch(`/flota/vehiculos/${id}/baja`, d).then(r => r.data),
    onSuccess: () => { toast.success('Vehículo dado de baja'); qc.invalidateQueries({ queryKey: ['flota-vehiculos'] }); setBajaDialog(null) },
    onError: () => toast.error('Error al dar de baja'),
  })

  const openDialog = (v?: Vehiculo) => {
    if (v) {
      setEditing(v)
      setForm({
        placa: v.placa, marca_id: v.marca_id ? String(v.marca_id) : '',
        tipo_vehiculo_id: v.tipo_vehiculo_id ? String(v.tipo_vehiculo_id) : '',
        linea: v.linea ?? '', modelo: v.modelo ? String(v.modelo) : '',
        color: v.color ?? '', tipo_medicion: v.tipo_medicion, tipo_trabajo: v.tipo_trabajo,
        ciudad: v.ciudad ?? '', centro_costo_id: v.centro_costo_id ? String(v.centro_costo_id) : '',
        rendimiento_ideal: v.rendimiento_ideal ? String(v.rendimiento_ideal) : '',
        nro_motor: '', nro_serie: '', observaciones: '',
      })
    } else { setEditing(null); setForm(EMPTY) }
    setDialogOpen(true)
  }
  const handleClose = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.placa.trim()) { toast.error('La placa es obligatoria'); return }
    const payload: Record<string, unknown> = { ...form }
    const nums = ['marca_id', 'tipo_vehiculo_id', 'centro_costo_id', 'modelo', 'rendimiento_ideal']
    nums.forEach(k => { if (payload[k]) payload[k] = Number(payload[k]); else delete payload[k] })
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    payload.placa = String(payload.placa).toUpperCase()
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  const activos = vehiculos.filter(v => v.activo)
  const inactivos = vehiculos.filter(v => !v.activo)
  const filtered = (tab === 0 ? activos : inactivos).filter(v =>
    v.placa.toLowerCase().includes(search.toLowerCase()) ||
    (v.marca?.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.ciudad ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const isMut = createMut.isPending || updateMut.isPending

  return (
    <Layout title="Vehículos — Gestión de Flotas">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
            Catálogo de Vehículos
          </Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.25}>
            Flota vehicular registrada en el sistema
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: GF_COLOR, '&:hover': { bgcolor: '#6D28D9' }, boxShadow: `0 4px 12px ${alpha(GF_COLOR, 0.4)}` }}
        >
          Nuevo Vehículo
        </Button>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total', count: vehiculos.length, color: GF_COLOR },
          { label: 'Activos', count: activos.length, color: '#32AC5C' },
          { label: 'Inactivos / Baja', count: inactivos.length, color: '#EF4444' },
        ].map(k => (
          <Grid key={k.label} size={{ xs: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color={k.color} lineHeight={1}>{k.count}</Typography>
              <Typography fontSize={12} color="text.secondary" mt={0.25}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs + search */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTabs-indicator': { bgcolor: GF_COLOR } }}>
          <Tab label={`Activos (${activos.length})`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GF_COLOR } }} />
          <Tab label={`Inactivos (${inactivos.length})`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GF_COLOR } }} />
        </Tabs>
        <TextField
          placeholder="Buscar placa, marca, ciudad…" size="small" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment> }}
          sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
        />
      </Stack>

      {/* Grid vehículos */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: GF_COLOR }} /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={10}>
          <CarIcon sx={{ fontSize: 56, color: '#D1D5DB', mb: 2 }} />
          <Typography color="text.secondary">No hay vehículos {tab === 0 ? 'activos' : 'inactivos'}</Typography>
          {tab === 0 && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openDialog()}
              sx={{ mt: 2, borderRadius: '10px', textTransform: 'none', borderColor: GF_COLOR, color: GF_COLOR }}>
              Registrar el primero
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(v => (
            <Grid key={v.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper elevation={0} sx={{
                border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5,
                transition: 'all 0.15s',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderColor: alpha(GF_COLOR, 0.4) },
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(GF_COLOR, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CarIcon sx={{ fontSize: 22, color: GF_COLOR }} />
                    </Box>
                    <Box>
                      <Typography fontWeight={800} fontSize={16} letterSpacing="0.06em">{v.placa}</Typography>
                      <Typography fontSize={12} color="text.secondary">
                        {[v.marca?.nombre, v.linea, v.modelo].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" gap={0.25}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openDialog(v)}>
                        <EditIcon sx={{ fontSize: 15, color: '#9CA3AF' }} />
                      </IconButton>
                    </Tooltip>
                    {v.activo && (
                      <Tooltip title="Dar de baja">
                        <IconButton size="small" onClick={() => { setBajaDialog(v); setBajaForm({ fecha_baja: new Date().toISOString().split('T')[0], motivo_baja: '' }) }}>
                          <InactiveIcon sx={{ fontSize: 15, color: '#F59E0B' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => setDeleteConfirm(v)}>
                        <DeleteIcon sx={{ fontSize: 15, color: '#EF4444' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                <Stack gap={0.5} mt={1.5}>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {v.tipo_vehiculo && <Chip label={v.tipo_vehiculo.nombre} size="small" sx={{ height: 20, fontSize: 10 }} />}
                    <Chip label={v.tipo_medicion} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                    <Chip label={v.tipo_trabajo} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                  </Stack>
                  {v.ciudad && <Typography fontSize={12} color="text.secondary" mt={0.25}>📍 {v.ciudad}</Typography>}
                  {v.rendimiento_ideal && <Typography fontSize={11} color="text.secondary">{v.rendimiento_ideal} km/gal</Typography>}
                  {!v.activo && v.motivo_baja && (
                    <Typography fontSize={11} color="#EF4444" mt={0.25}>Baja: {v.motivo_baja}</Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          {editing ? `Editar — ${editing.placa}` : 'Registrar Vehículo'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} pt={0.5}>
              <Grid size={4}>
                <TextField label="Placa *" fullWidth size="small" value={form.placa}
                  onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                  inputProps={{ style: { textTransform: 'uppercase' } }} />
              </Grid>
              <Grid size={4}>
                <TextField select label="Marca" fullWidth size="small" value={form.marca_id}
                  onChange={e => setForm(f => ({ ...f, marca_id: e.target.value }))}>
                  <MenuItem value=""><em>Sin especificar</em></MenuItem>
                  {marcas.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField select label="Tipo de Vehículo" fullWidth size="small" value={form.tipo_vehiculo_id}
                  onChange={e => setForm(f => ({ ...f, tipo_vehiculo_id: e.target.value }))}>
                  <MenuItem value=""><em>Sin especificar</em></MenuItem>
                  {tiposV.map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField label="Línea / Modelo comercial" fullWidth size="small" value={form.linea}
                  onChange={e => setForm(f => ({ ...f, linea: e.target.value }))} />
              </Grid>
              <Grid size={2}>
                <TextField label="Año" type="number" fullWidth size="small" value={form.modelo}
                  onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                  inputProps={{ min: 1950, max: 2030 }} />
              </Grid>
              <Grid size={3}>
                <TextField label="Color" fullWidth size="small" value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </Grid>
              <Grid size={3}>
                <TextField select label="Tipo medición" fullWidth size="small" value={form.tipo_medicion}
                  onChange={e => setForm(f => ({ ...f, tipo_medicion: e.target.value }))}>
                  {tipoMedicionOpts.map(o => <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField select label="Tipo de trabajo" fullWidth size="small" value={form.tipo_trabajo}
                  onChange={e => setForm(f => ({ ...f, tipo_trabajo: e.target.value }))}>
                  {tipoTrabajoOpts.map(o => <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField label="Ciudad" fullWidth size="small" value={form.ciudad}
                  onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField select label="Centro de Costo" fullWidth size="small" value={form.centro_costo_id}
                  onChange={e => setForm(f => ({ ...f, centro_costo_id: e.target.value }))}>
                  <MenuItem value=""><em>Sin asignar</em></MenuItem>
                  {centros.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField label="Rendimiento ideal (km/gal)" type="number" fullWidth size="small"
                  value={form.rendimiento_ideal}
                  onChange={e => setForm(f => ({ ...f, rendimiento_ideal: e.target.value }))}
                  inputProps={{ step: 0.1, min: 0 }} />
              </Grid>
              <Grid size={4}>
                <TextField label="Nro. Motor" fullWidth size="small" value={form.nro_motor}
                  onChange={e => setForm(f => ({ ...f, nro_motor: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField label="Nro. Serie" fullWidth size="small" value={form.nro_serie}
                  onChange={e => setForm(f => ({ ...f, nro_serie: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField label="Observaciones" fullWidth size="small" multiline rows={2}
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={isMut}
              startIcon={isMut ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#6D28D9' } }}>
              {editing ? 'Guardar cambios' : 'Registrar vehículo'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Dar de baja */}
      <Dialog open={!!bajaDialog} onClose={() => setBajaDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Dar de Baja — {bajaDialog?.placa}</DialogTitle>
        <DialogContent>
          <Stack gap={2} pt={1}>
            <TextField label="Fecha de baja" type="date" fullWidth size="small"
              value={bajaForm.fecha_baja} InputLabelProps={{ shrink: true }}
              onChange={e => setBajaForm(f => ({ ...f, fecha_baja: e.target.value }))} />
            <TextField label="Motivo *" fullWidth size="small" multiline rows={2}
              value={bajaForm.motivo_baja}
              onChange={e => setBajaForm(f => ({ ...f, motivo_baja: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setBajaDialog(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="warning" disabled={bajaMut.isPending}
            onClick={() => bajaDialog && bajaMut.mutate({ id: bajaDialog.id, d: bajaForm })}
            sx={{ textTransform: 'none' }}>
            Confirmar baja
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Eliminar Vehículo</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            ¿Eliminar el vehículo <strong>{deleteConfirm?.placa}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setDeleteConfirm(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="error" disabled={deleteMut.isPending}
            onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm.id)}
            sx={{ textTransform: 'none' }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
