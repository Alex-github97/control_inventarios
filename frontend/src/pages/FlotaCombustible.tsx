import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Grid, Tooltip, CircularProgress, alpha,
} from '@mui/material'
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  LocalGasStation as CombIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#7C3AED'
const COMB_COLOR = '#F59E0B'

interface Vehiculo { id: number; placa: string }
interface TipoCombustible { id: number; nombre: string; unidad: string }
interface Proveedor { id: number; nombre: string }
interface Combustible {
  id: number; vehiculo_id: number; vehiculo?: Vehiculo
  fecha: string; medicion_actual?: number; cantidad: number; unidad: string
  valor_unitario?: number; valor_total?: number
  tipo_combustible_id?: number; proveedor_id?: number
  estacion?: string; numero_factura?: string; observaciones?: string
}

const EMPTY: Record<string, string> = {
  vehiculo_id: '', fecha: new Date().toISOString().split('T')[0], medicion_actual: '',
  cantidad: '', unidad: 'GALON', valor_unitario: '', valor_total: '',
  tipo_combustible_id: '', proveedor_id: '', estacion: '', numero_factura: '', observaciones: '',
}

const fmt = (n?: number) => n != null
  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
  : '—'

export default function FlotaCombustible() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Combustible | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState<Combustible | null>(null)
  const [filterVeh, setFilterVeh] = useState('')

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({
    queryKey: ['flota-vehiculos'],
    queryFn: () => api.get('/flota/vehiculos/?activo=true').then(r => r.data),
  })
  const { data: tiposComb = [] } = useQuery<TipoCombustible[]>({
    queryKey: ['flota-tipos-combustible'],
    queryFn: () => api.get('/flota/tipos-combustible/').then(r => r.data),
  })
  const { data: proveedores = [] } = useQuery<Proveedor[]>({
    queryKey: ['flota-proveedores-comb'],
    queryFn: () => api.get('/flota/proveedores/?tipo=COMBUSTIBLE').then(r => r.data),
  })
  const { data: registros = [], isLoading } = useQuery<Combustible[]>({
    queryKey: ['flota-combustible', filterVeh],
    queryFn: () => {
      const q = filterVeh ? `?vehiculo_id=${filterVeh}` : ''
      return api.get(`/flota/combustible/${q}`).then(r => r.data)
    },
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/flota/combustible/', d).then(r => r.data),
    onSuccess: () => { toast.success('Registro guardado'); qc.invalidateQueries({ queryKey: ['flota-combustible'] }); handleClose() },
    onError: () => toast.error('Error al guardar'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/combustible/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Registro actualizado'); qc.invalidateQueries({ queryKey: ['flota-combustible'] }); handleClose() },
    onError: () => toast.error('Error al actualizar'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/combustible/${id}`),
    onSuccess: () => { toast.success('Registro eliminado'); qc.invalidateQueries({ queryKey: ['flota-combustible'] }); setDeleteConfirm(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const openDialog = (r?: Combustible) => {
    if (r) {
      setEditing(r)
      setForm({
        vehiculo_id: String(r.vehiculo_id), fecha: r.fecha,
        medicion_actual: r.medicion_actual ? String(r.medicion_actual) : '',
        cantidad: String(r.cantidad), unidad: r.unidad,
        valor_unitario: r.valor_unitario ? String(r.valor_unitario) : '',
        valor_total: r.valor_total ? String(r.valor_total) : '',
        tipo_combustible_id: r.tipo_combustible_id ? String(r.tipo_combustible_id) : '',
        proveedor_id: r.proveedor_id ? String(r.proveedor_id) : '',
        estacion: r.estacion ?? '', numero_factura: r.numero_factura ?? '',
        observaciones: r.observaciones ?? '',
      })
    } else { setEditing(null); setForm(EMPTY) }
    setDialogOpen(true)
  }
  const handleClose = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehiculo_id || !form.cantidad) { toast.error('Vehículo y cantidad son obligatorios'); return }
    const payload: Record<string, unknown> = { ...form }
    const nums = ['vehiculo_id', 'tipo_combustible_id', 'proveedor_id', 'medicion_actual', 'cantidad', 'valor_unitario', 'valor_total']
    nums.forEach(k => { if (payload[k]) payload[k] = Number(payload[k]); else delete payload[k] })
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  const totalLitros = registros.reduce((a, r) => a + r.cantidad, 0)
  const totalCosto = registros.reduce((a, r) => a + (r.valor_total ?? 0), 0)
  const isMut = createMut.isPending || updateMut.isPending

  return (
    <Layout title="Combustible — Gestión de Flotas">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
            Registro de Combustible
          </Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.25}>
            Historial de abastecimiento por vehículo
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: COMB_COLOR, '&:hover': { bgcolor: '#D97706' }, boxShadow: `0 4px 12px ${alpha(COMB_COLOR, 0.4)}` }}>
          Registrar Abastecimiento
        </Button>
      </Stack>

      {/* KPIs + Filtro */}
      <Grid container spacing={2} mb={3} alignItems="stretch">
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Typography fontSize={11} color="text.secondary" textTransform="uppercase" letterSpacing="0.06em" mb={1}>
              {filterVeh ? 'Filtrado por vehículo' : 'Todos los registros'}
            </Typography>
            <Stack direction="row" gap={3}>
              <Box>
                <Typography fontSize={22} fontWeight={800} color={COMB_COLOR} lineHeight={1}>
                  {totalLitros.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                </Typography>
                <Typography fontSize={12} color="text.secondary">galones totales</Typography>
              </Box>
              <Box>
                <Typography fontSize={22} fontWeight={800} color={GF_COLOR} lineHeight={1}>
                  {fmt(totalCosto)}
                </Typography>
                <Typography fontSize={12} color="text.secondary">costo total</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, display: 'flex', alignItems: 'center' }}>
            <TextField select label="Filtrar por vehículo" fullWidth size="small" value={filterVeh}
              onChange={e => setFilterVeh(e.target.value)}>
              <MenuItem value="">Todos los vehículos</MenuItem>
              {vehiculos.map(v => <MenuItem key={v.id} value={v.id}>{v.placa}</MenuItem>)}
            </TextField>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Typography fontSize={11} color="text.secondary" textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>Registros</Typography>
            <Typography fontSize={28} fontWeight={800} color="#1F2937" lineHeight={1}>{registros.length}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Lista */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: GF_COLOR }} /></Box>
      ) : registros.length === 0 ? (
        <Box textAlign="center" py={10}>
          <CombIcon sx={{ fontSize: 56, color: '#D1D5DB', mb: 2 }} />
          <Typography color="text.secondary">No hay registros de combustible</Typography>
        </Box>
      ) : (
        <Stack gap={1}>
          {registros.map(r => (
            <Paper key={r.id} elevation={0} sx={{
              border: '1px solid #E5E7EB', borderRadius: '12px', p: 2,
              '&:hover': { borderColor: alpha(COMB_COLOR, 0.4), boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
              transition: 'all 0.12s',
            }}>
              <Stack direction="row" alignItems="center" gap={2}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(COMB_COLOR, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CombIcon sx={{ fontSize: 18, color: COMB_COLOR }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Chip label={r.vehiculo?.placa ?? `Veh. ${r.vehiculo_id}`} size="small"
                      sx={{ height: 20, fontSize: 10, bgcolor: alpha(GF_COLOR, 0.1), color: GF_COLOR }} />
                    <Typography fontSize={12} color="text.secondary">
                      {new Date(r.fecha).toLocaleDateString('es-CO')}
                    </Typography>
                    {r.estacion && <Typography fontSize={12} color="text.secondary">{r.estacion}</Typography>}
                  </Stack>
                  <Stack direction="row" gap={2} mt={0.25}>
                    <Typography fontSize={13} fontWeight={700} color={COMB_COLOR}>
                      {r.cantidad} {r.unidad}
                    </Typography>
                    {r.valor_total && <Typography fontSize={13} fontWeight={600}>{fmt(r.valor_total)}</Typography>}
                    {r.medicion_actual && (
                      <Typography fontSize={12} color="text.secondary">{r.medicion_actual.toLocaleString()} km</Typography>
                    )}
                    {r.numero_factura && (
                      <Typography fontSize={12} color="text.secondary">Factura #{r.numero_factura}</Typography>
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" gap={0.25}>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openDialog(r)}>
                      <EditIcon sx={{ fontSize: 15, color: '#9CA3AF' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => setDeleteConfirm(r)}>
                      <DeleteIcon sx={{ fontSize: 15, color: '#EF4444' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          {editing ? 'Editar Registro' : 'Registrar Abastecimiento'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} pt={0.5}>
              <Grid size={6}>
                <TextField select label="Vehículo *" fullWidth size="small" value={form.vehiculo_id}
                  onChange={e => setForm(f => ({ ...f, vehiculo_id: e.target.value }))}>
                  <MenuItem value=""><em>Seleccionar</em></MenuItem>
                  {vehiculos.map(v => <MenuItem key={v.id} value={v.id}>{v.placa}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Fecha *" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }} value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField label="Cantidad *" type="number" fullWidth size="small"
                  inputProps={{ min: 0, step: 0.01 }} value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField select label="Unidad" fullWidth size="small" value={form.unidad}
                  onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                  <MenuItem value="GALON">Galón</MenuItem>
                  <MenuItem value="LITRO">Litro</MenuItem>
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField label="Odómetro (km)" type="number" fullWidth size="small"
                  inputProps={{ min: 0 }} value={form.medicion_actual}
                  onChange={e => setForm(f => ({ ...f, medicion_actual: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField label="Valor unitario ($)" type="number" fullWidth size="small"
                  inputProps={{ min: 0 }} value={form.valor_unitario}
                  onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField label="Valor total ($)" type="number" fullWidth size="small"
                  inputProps={{ min: 0 }} value={form.valor_total}
                  onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField select label="Tipo combustible" fullWidth size="small" value={form.tipo_combustible_id}
                  onChange={e => setForm(f => ({ ...f, tipo_combustible_id: e.target.value }))}>
                  <MenuItem value=""><em>Sin especificar</em></MenuItem>
                  {tiposComb.map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Estación / Proveedor" fullWidth size="small" value={form.estacion}
                  onChange={e => setForm(f => ({ ...f, estacion: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Número de factura" fullWidth size="small" value={form.numero_factura}
                  onChange={e => setForm(f => ({ ...f, numero_factura: e.target.value }))} />
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
              sx={{ textTransform: 'none', bgcolor: COMB_COLOR, '&:hover': { bgcolor: '#D97706' } }}>
              {editing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Eliminar Registro</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            ¿Eliminar el registro de combustible del{' '}
            <strong>{deleteConfirm && new Date(deleteConfirm.fecha).toLocaleDateString('es-CO')}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setDeleteConfirm(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" color="error" disabled={deleteMut.isPending}
            onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm.id)}
            sx={{ textTransform: 'none' }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
