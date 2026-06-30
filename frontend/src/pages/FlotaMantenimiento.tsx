import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Grid, Tooltip, CircularProgress,
  Tabs, Tab, alpha, Divider,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Build as BuildIcon,
  CheckCircle as DoneIcon, Schedule as OpenIcon, Engineering as InProgressIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#32AC5C'

interface Vehiculo { id: number; placa: string }
interface Personal { id: number; nombres: string; apellidos: string; tipo: string }
interface TipoTrabajo { id: number; nombre: string; tipo: string; nivel_criticidad: string }
interface OrdenDetalle { id: number; descripcion: string; estado: string; costo_repuestos: number; costo_mano_obra: number }
interface Orden {
  id: number; numero: string; vehiculo_id: number; vehiculo?: Vehiculo
  fecha_apertura: string; fecha_cierre?: string; estado: string
  personal_id?: number; mecanico?: Personal
  tipo_taller: string; observaciones?: string
  costo_repuestos: number; costo_mano_obra: number
  detalles: OrdenDetalle[]
}

const ESTADOS = ['ABIERTA', 'EN_PROCESO', 'CERRADA', 'CANCELADA']
const estadoColor = (e: string) => ({
  ABIERTA: '#3B82F6', EN_PROCESO: '#F59E0B', CERRADA: '#32AC5C', CANCELADA: '#9CA3AF',
})[e] ?? '#9CA3AF'
const EstadoIcon = ({ e }: { e: string }) => {
  const c = estadoColor(e)
  if (e === 'CERRADA') return <DoneIcon sx={{ fontSize: 14, color: c }} />
  if (e === 'EN_PROCESO') return <InProgressIcon sx={{ fontSize: 14, color: c }} />
  return <OpenIcon sx={{ fontSize: 14, color: c }} />
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function FlotaMantenimiento() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [estadoDialog, setEstadoDialog] = useState<Orden | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Orden | null>(null)
  const [form, setForm] = useState({ vehiculo_id: '', fecha_apertura: new Date().toISOString().split('T')[0], personal_id: '', tipo_taller: 'INTERNO', observaciones: '', medicion_apertura: '' })
  const [detalles, setDetalles] = useState([{ descripcion: '', tipo_trabajo_id: '', costo_repuestos: '', costo_mano_obra: '' }])

  const tabFiltros = ['todas', 'ABIERTA', 'EN_PROCESO', 'CERRADA']

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['flota-vehiculos'], queryFn: () => api.get('/flota/vehiculos/?activo=true').then(r => r.data) })
  const { data: personal = [] } = useQuery<Personal[]>({ queryKey: ['flota-personal-mecanicos'], queryFn: () => api.get('/flota/personal/?tipo=MECANICO').then(r => r.data) })
  const { data: tiposTrabajo = [] } = useQuery<TipoTrabajo[]>({ queryKey: ['flota-tipos-trabajo'], queryFn: () => api.get('/flota/tipos-trabajo/').then(r => r.data) })

  const { data: ordenes = [], isLoading } = useQuery<Orden[]>({
    queryKey: ['flota-ordenes', tabFiltros[tab]],
    queryFn: () => {
      const q = tab === 0 ? '' : `?estado=${tabFiltros[tab]}`
      return api.get(`/flota/ordenes/${q}`).then(r => r.data)
    },
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/flota/ordenes/', d).then(r => r.data),
    onSuccess: () => { toast.success('Orden de trabajo creada'); qc.invalidateQueries({ queryKey: ['flota-ordenes'] }); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Error al crear la orden'),
  })
  const estadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => api.patch(`/flota/ordenes/${id}/estado`, { estado }).then(r => r.data),
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['flota-ordenes'] }); setEstadoDialog(null) },
    onError: () => toast.error('Error al actualizar estado'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/ordenes/${id}`),
    onSuccess: () => { toast.success('Orden eliminada'); qc.invalidateQueries({ queryKey: ['flota-ordenes'] }); setDeleteConfirm(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const resetForm = () => {
    setForm({ vehiculo_id: '', fecha_apertura: new Date().toISOString().split('T')[0], personal_id: '', tipo_taller: 'INTERNO', observaciones: '', medicion_apertura: '' })
    setDetalles([{ descripcion: '', tipo_trabajo_id: '', costo_repuestos: '', costo_mano_obra: '' }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehiculo_id) { toast.error('Selecciona un vehículo'); return }
    const dets = detalles.filter(d => d.descripcion.trim()).map(d => ({
      descripcion: d.descripcion,
      tipo_trabajo_id: d.tipo_trabajo_id ? Number(d.tipo_trabajo_id) : undefined,
      costo_repuestos: Number(d.costo_repuestos) || 0,
      costo_mano_obra: Number(d.costo_mano_obra) || 0,
    }))
    if (dets.length === 0) { toast.error('Agrega al menos un trabajo'); return }
    const payload: Record<string, unknown> = {
      vehiculo_id: Number(form.vehiculo_id),
      fecha_apertura: form.fecha_apertura,
      tipo_taller: form.tipo_taller,
      observaciones: form.observaciones || undefined,
      detalles: dets,
    }
    if (form.personal_id) payload.personal_id = Number(form.personal_id)
    if (form.medicion_apertura) payload.medicion_apertura = Number(form.medicion_apertura)
    createMut.mutate(payload)
  }

  const abiertas = ordenes.filter(o => o.estado === 'ABIERTA').length
  const enProceso = ordenes.filter(o => o.estado === 'EN_PROCESO').length
  const cerradas = ordenes.filter(o => o.estado === 'CERRADA').length

  return (
    <Layout title="Mantenimiento — Gestión de Flotas">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
            Órdenes de Trabajo
          </Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.25}>
            Control de mantenimiento preventivo y correctivo de la flota
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true) }}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: GF_COLOR, '&:hover': { bgcolor: '#27884A' }, boxShadow: `0 4px 12px ${alpha(GF_COLOR, 0.4)}` }}>
          Nueva Orden
        </Button>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Abiertas', count: abiertas, color: '#3B82F6' },
          { label: 'En proceso', count: enProceso, color: '#F59E0B' },
          { label: 'Cerradas', count: cerradas, color: '#32AC5C' },
        ].map(k => (
          <Grid key={k.label} size={{ xs: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color={k.color} lineHeight={1}>{k.count}</Typography>
              <Typography fontSize={12} color="text.secondary" mt={0.25}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: GF_COLOR } }}>
        {['Todas', 'Abiertas', 'En Proceso', 'Cerradas'].map((l, i) => (
          <Tab key={i} label={l} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GF_COLOR } }} />
        ))}
      </Tabs>

      {/* Lista */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: GF_COLOR }} /></Box>
      ) : ordenes.length === 0 ? (
        <Box textAlign="center" py={10}>
          <BuildIcon sx={{ fontSize: 56, color: '#D1D5DB', mb: 2 }} />
          <Typography color="text.secondary">No hay órdenes de trabajo en esta categoría</Typography>
        </Box>
      ) : (
        <Stack gap={1.5}>
          {ordenes.map(orden => {
            const color = estadoColor(orden.estado)
            const costoTotal = orden.costo_repuestos + orden.costo_mano_obra
            return (
              <Paper key={orden.id} elevation={0} sx={{
                border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '14px', p: 2.5,
                '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }, transition: 'all 0.12s',
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" gap={1.5} alignItems="flex-start">
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(color, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25,
                    }}>
                      <BuildIcon sx={{ fontSize: 20, color }} />
                    </Box>
                    <Box>
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={800} fontSize={14}>{orden.numero}</Typography>
                        <Chip icon={<EstadoIcon e={orden.estado} />} label={orden.estado}
                          size="small" sx={{ bgcolor: alpha(color, 0.1), color, height: 20, fontSize: 10 }} />
                        <Chip label={orden.vehiculo?.placa ?? `Veh. ${orden.vehiculo_id}`}
                          size="small" sx={{ bgcolor: alpha(GF_COLOR, 0.1), color: GF_COLOR, height: 20, fontSize: 10 }} />
                      </Stack>
                      <Stack direction="row" gap={2} mt={0.25} flexWrap="wrap">
                        <Typography fontSize={12} color="text.secondary">
                          Apertura: {new Date(orden.fecha_apertura).toLocaleDateString('es-CO')}
                        </Typography>
                        {orden.mecanico && (
                          <Typography fontSize={12} color="text.secondary">
                            Mecánico: {orden.mecanico.nombres} {orden.mecanico.apellidos}
                          </Typography>
                        )}
                        <Typography fontSize={12} color="text.secondary">{orden.tipo_taller}</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Stack direction="row" gap={1} alignItems="center">
                    {costoTotal > 0 && (
                      <Typography fontSize={13} fontWeight={700} color={GF_COLOR}>{fmt(costoTotal)}</Typography>
                    )}
                    <Tooltip title="Cambiar estado">
                      <IconButton size="small" onClick={() => { setEstadoDialog(orden); setNuevoEstado(orden.estado) }}>
                        <EditIcon sx={{ fontSize: 15, color: '#9CA3AF' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => setDeleteConfirm(orden)}>
                        <DeleteIcon sx={{ fontSize: 15, color: '#EF4444' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                {orden.detalles.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.25 }} />
                    <Stack gap={0.5}>
                      {orden.detalles.map(d => (
                        <Stack key={d.id} direction="row" gap={1} alignItems="center">
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: estadoColor(d.estado), flexShrink: 0 }} />
                          <Typography fontSize={12} flex={1}>{d.descripcion}</Typography>
                          {(d.costo_repuestos + d.costo_mano_obra) > 0 && (
                            <Typography fontSize={11} color="text.secondary">{fmt(d.costo_repuestos + d.costo_mano_obra)}</Typography>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}

                {orden.observaciones && (
                  <Typography fontSize={12} color="text.secondary" mt={1} fontStyle="italic">
                    {orden.observaciones}
                  </Typography>
                )}
              </Paper>
            )
          })}
        </Stack>
      )}

      {/* Dialog nueva orden */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Nueva Orden de Trabajo</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} pt={0.5}>
              <Grid size={4}>
                <TextField select label="Vehículo *" fullWidth size="small" value={form.vehiculo_id}
                  onChange={e => setForm(f => ({ ...f, vehiculo_id: e.target.value }))}>
                  <MenuItem value=""><em>Seleccionar</em></MenuItem>
                  {vehiculos.map(v => <MenuItem key={v.id} value={v.id}>{v.placa}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField label="Fecha de apertura" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }} value={form.fecha_apertura}
                  onChange={e => setForm(f => ({ ...f, fecha_apertura: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField label="Medición apertura (km)" type="number" fullWidth size="small"
                  value={form.medicion_apertura}
                  onChange={e => setForm(f => ({ ...f, medicion_apertura: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField select label="Mecánico asignado" fullWidth size="small" value={form.personal_id}
                  onChange={e => setForm(f => ({ ...f, personal_id: e.target.value }))}>
                  <MenuItem value=""><em>Sin asignar</em></MenuItem>
                  {personal.map(p => <MenuItem key={p.id} value={p.id}>{p.nombres} {p.apellidos}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField select label="Tipo de taller" fullWidth size="small" value={form.tipo_taller}
                  onChange={e => setForm(f => ({ ...f, tipo_taller: e.target.value }))}>
                  <MenuItem value="INTERNO">Taller Interno</MenuItem>
                  <MenuItem value="EXTERNO">Taller Externo</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField label="Observaciones" fullWidth size="small" multiline rows={2}
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </Grid>

              <Grid size={12}>
                <Divider><Typography fontSize={12} color="text.secondary">Trabajos a realizar</Typography></Divider>
              </Grid>

              {detalles.map((det, i) => (
                <React.Fragment key={i}>
                  <Grid size={4}>
                    <TextField label={`Descripción ${i + 1} *`} fullWidth size="small"
                      value={det.descripcion}
                      onChange={e => setDetalles(ds => ds.map((d, j) => j === i ? { ...d, descripcion: e.target.value } : d))} />
                  </Grid>
                  <Grid size={3}>
                    <TextField select label="Tipo de trabajo" fullWidth size="small"
                      value={det.tipo_trabajo_id}
                      onChange={e => setDetalles(ds => ds.map((d, j) => j === i ? { ...d, tipo_trabajo_id: e.target.value } : d))}>
                      <MenuItem value=""><em>Sin tipo</em></MenuItem>
                      {tiposTrabajo.map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={2}>
                    <TextField label="Rep. ($)" type="number" fullWidth size="small"
                      inputProps={{ min: 0 }} value={det.costo_repuestos}
                      onChange={e => setDetalles(ds => ds.map((d, j) => j === i ? { ...d, costo_repuestos: e.target.value } : d))} />
                  </Grid>
                  <Grid size={2}>
                    <TextField label="M.O. ($)" type="number" fullWidth size="small"
                      inputProps={{ min: 0 }} value={det.costo_mano_obra}
                      onChange={e => setDetalles(ds => ds.map((d, j) => j === i ? { ...d, costo_mano_obra: e.target.value } : d))} />
                  </Grid>
                  <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    {detalles.length > 1 && (
                      <IconButton size="small" onClick={() => setDetalles(ds => ds.filter((_, j) => j !== i))}>
                        <DeleteIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                      </IconButton>
                    )}
                  </Grid>
                </React.Fragment>
              ))}

              <Grid size={12}>
                <Button size="small" onClick={() => setDetalles(ds => [...ds, { descripcion: '', tipo_trabajo_id: '', costo_repuestos: '', costo_mano_obra: '' }])}
                  sx={{ textTransform: 'none', color: GF_COLOR }}>
                  + Agregar trabajo
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button size="small" onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={createMut.isPending}
              startIcon={createMut.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#27884A' } }}>
              Crear orden
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Dialog cambiar estado */}
      <Dialog open={!!estadoDialog} onClose={() => setEstadoDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Cambiar Estado — {estadoDialog?.numero}</DialogTitle>
        <DialogContent>
          <TextField select label="Nuevo estado" fullWidth size="small" value={nuevoEstado}
            onChange={e => setNuevoEstado(e.target.value)} sx={{ mt: 1 }}>
            {ESTADOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button size="small" onClick={() => setEstadoDialog(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" disabled={estadoMut.isPending}
            onClick={() => estadoDialog && estadoMut.mutate({ id: estadoDialog.id, estado: nuevoEstado })}
            sx={{ textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#27884A' } }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Eliminar Orden</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            ¿Eliminar la orden <strong>{deleteConfirm?.numero}</strong>?
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
