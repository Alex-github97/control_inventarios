import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Tooltip, CircularProgress,
  Tabs, Tab, alpha, Divider, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Build as BuildIcon,
  CheckCircle as DoneIcon, Schedule as OpenIcon, Engineering as InProgressIcon,
  Inventory2 as PartsIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#32AC5C'

interface Vehiculo { id: number; placa: string }
interface Personal { id: number; nombres: string; apellidos: string; tipo: string }
interface TipoTrabajo { id: number; nombre: string; tipo: string; nivel_criticidad: string }
interface Proveedor { id: number; nombre: string }
interface Repuesto { id: number; codigo: string; nombre: string; unidad: string; costo_referencia?: number }
interface OrdenDetalle { id: number; descripcion: string; estado: string; costo_repuestos: number; costo_mano_obra: number }
interface Orden {
  id: number; numero: string; vehiculo_id: number; vehiculo?: Vehiculo
  fecha_apertura: string; fecha_cierre?: string; estado: string
  personal_id?: number; mecanico?: Personal
  proveedor_id?: number; proveedor?: Proveedor
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
  const [formTab, setFormTab] = useState(0)
  const [estadoDialog, setEstadoDialog] = useState<Orden | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Orden | null>(null)

  const [form, setForm] = useState({
    vehiculo_id: '', fecha_apertura: new Date().toISOString().split('T')[0],
    personal_id: '', tipo_taller: 'INTERNO', proveedor_id: '',
    observaciones: '', medicion_apertura: '',
  })
  const [trabajos, setTrabajos] = useState([{ descripcion: '', tipo_trabajo_id: '', costo_mano_obra: '' }])
  const [repuestoItems, setRepuestoItems] = useState([{ repuesto_id: '', cantidad: '1' }])

  const tabFiltros = ['todas', 'ABIERTA', 'EN_PROCESO', 'CERRADA']

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['flota-vehiculos'], queryFn: () => api.get('/flota/vehiculos/?activo=true').then(r => r.data) })
  const { data: personal = [] } = useQuery<Personal[]>({ queryKey: ['flota-personal-mecanicos'], queryFn: () => api.get('/flota/personal/?tipo=MECANICO').then(r => r.data) })
  const { data: tiposTrabajo = [] } = useQuery<TipoTrabajo[]>({ queryKey: ['flota-tipos-trabajo'], queryFn: () => api.get('/flota/tipos-trabajo/').then(r => r.data) })
  const { data: proveedores = [] } = useQuery<Proveedor[]>({ queryKey: ['flota-proveedores'], queryFn: () => api.get('/flota/proveedores/').then(r => r.data) })
  const { data: repuestosData = [] } = useQuery<Repuesto[]>({ queryKey: ['flota-repuestos'], queryFn: () => api.get('/flota/repuestos/').then(r => r.data) })

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
    setForm({ vehiculo_id: '', fecha_apertura: new Date().toISOString().split('T')[0], personal_id: '', tipo_taller: 'INTERNO', proveedor_id: '', observaciones: '', medicion_apertura: '' })
    setTrabajos([{ descripcion: '', tipo_trabajo_id: '', costo_mano_obra: '' }])
    setRepuestoItems([{ repuesto_id: '', cantidad: '1' }])
    setFormTab(0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehiculo_id) { toast.error('Selecciona un vehículo'); return }

    const trabajoDets = trabajos.filter(t => t.descripcion.trim()).map(t => ({
      descripcion: t.descripcion,
      tipo_trabajo_id: t.tipo_trabajo_id ? Number(t.tipo_trabajo_id) : undefined,
      costo_repuestos: 0,
      costo_mano_obra: Number(t.costo_mano_obra) || 0,
    }))

    const repuestoDets = repuestoItems.filter(r => r.repuesto_id).map(r => {
      const rep = repuestosData.find(rd => String(rd.id) === r.repuesto_id)
      const costo = rep?.costo_referencia ? Number(r.cantidad) * rep.costo_referencia : 0
      return {
        descripcion: `${rep?.nombre ?? 'Repuesto'} ×${r.cantidad} ${rep?.unidad ?? ''}`.trim(),
        tipo_trabajo_id: undefined,
        costo_repuestos: costo,
        costo_mano_obra: 0,
      }
    })

    const dets = [...trabajoDets, ...repuestoDets]
    if (dets.length === 0) { toast.error('Agrega al menos un trabajo o repuesto'); return }

    const payload: Record<string, unknown> = {
      vehiculo_id: Number(form.vehiculo_id),
      fecha_apertura: form.fecha_apertura,
      tipo_taller: form.tipo_taller,
      observaciones: form.observaciones || undefined,
      detalles: dets,
    }
    if (form.personal_id) payload.personal_id = Number(form.personal_id)
    if (form.medicion_apertura) payload.medicion_apertura = Number(form.medicion_apertura)
    if (form.proveedor_id) payload.proveedor_id = Number(form.proveedor_id)
    createMut.mutate(payload)
  }

  const abiertas = ordenes.filter(o => o.estado === 'ABIERTA').length
  const enProceso = ordenes.filter(o => o.estado === 'EN_PROCESO').length
  const cerradas = ordenes.filter(o => o.estado === 'CERRADA').length

  const totalRepuestos = repuestoItems.reduce((sum, r) => {
    const rep = repuestosData.find(rd => String(rd.id) === r.repuesto_id)
    return sum + (rep?.costo_referencia ? Number(r.cantidad) * rep.costo_referencia : 0)
  }, 0)

  const vehiculoSeleccionado = vehiculos.find(v => String(v.id) === form.vehiculo_id)

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
                        {orden.tipo_taller === 'EXTERNO' && (
                          <Chip label="Externo" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                        )}
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
                        {orden.proveedor && (
                          <Typography fontSize={12} color="text.secondary">
                            Proveedor: {orden.proveedor.nombre}
                          </Typography>
                        )}
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

      {/* ═══ DIALOG: Nueva Orden ═══════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '92vh', display: 'flex', flexDirection: 'column' } }}>

        {/* Title */}
        <DialogTitle sx={{ borderBottom: '1px solid #E5E7EB', py: 2, px: 3, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: alpha(GF_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BuildIcon sx={{ fontSize: 18, color: GF_COLOR }} />
            </Box>
            <Box>
              <Typography fontSize={15} fontWeight={700} lineHeight={1.2}>
                Crear Orden de Trabajo
                {vehiculoSeleccionado && (
                  <Typography component="span" fontSize={13} color="text.secondary" fontWeight={400} ml={1}>
                    — vehículo {vehiculoSeleccionado.placa}
                  </Typography>
                )}
              </Typography>
              <Typography fontSize={11} color="text.secondary">Ingresa los datos de la orden y los trabajos/repuestos a realizar</Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* ── Sección superior: datos generales ── */}
          <Box sx={{ px: 3, pt: 2.5, pb: 0, flexShrink: 0 }}>
            <Grid container spacing={2.5}>

              {/* Columna izquierda */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack gap={2}>
                  <TextField select label="Vehículo *" fullWidth size="small" value={form.vehiculo_id}
                    onChange={e => setForm(f => ({ ...f, vehiculo_id: e.target.value }))}>
                    <MenuItem value=""><em>Seleccionar vehículo</em></MenuItem>
                    {vehiculos.map(v => <MenuItem key={v.id} value={v.id}>{v.placa}</MenuItem>)}
                  </TextField>

                  <Stack direction="row" gap={1.5}>
                    <TextField label="Fecha de apertura *" type="date" size="small" fullWidth
                      InputLabelProps={{ shrink: true }} value={form.fecha_apertura}
                      onChange={e => setForm(f => ({ ...f, fecha_apertura: e.target.value }))} />
                    <TextField label="Odómetro" type="number" size="small" fullWidth
                      value={form.medicion_apertura}
                      onChange={e => setForm(f => ({ ...f, medicion_apertura: e.target.value }))}
                      InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="text.secondary">km</Typography></InputAdornment> }} />
                  </Stack>

                  <Stack direction="row" gap={1.5}>
                    <TextField select label="Tipo de taller" fullWidth size="small" value={form.tipo_taller}
                      onChange={e => setForm(f => ({ ...f, tipo_taller: e.target.value, proveedor_id: '' }))}>
                      <MenuItem value="INTERNO">Taller Interno</MenuItem>
                      <MenuItem value="EXTERNO">Taller Externo</MenuItem>
                    </TextField>
                    {form.tipo_taller === 'EXTERNO' ? (
                      <TextField select label="Proveedor *" fullWidth size="small" value={form.proveedor_id}
                        onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}>
                        <MenuItem value=""><em>Seleccionar</em></MenuItem>
                        {proveedores.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                      </TextField>
                    ) : (
                      <TextField select label="Mecánico asignado" fullWidth size="small" value={form.personal_id}
                        onChange={e => setForm(f => ({ ...f, personal_id: e.target.value }))}>
                        <MenuItem value=""><em>Sin asignar</em></MenuItem>
                        {personal.map(p => <MenuItem key={p.id} value={p.id}>{p.nombres} {p.apellidos}</MenuItem>)}
                      </TextField>
                    )}
                  </Stack>

                  {form.tipo_taller === 'EXTERNO' && (
                    <TextField select label="Mecánico asignado" fullWidth size="small" value={form.personal_id}
                      onChange={e => setForm(f => ({ ...f, personal_id: e.target.value }))}>
                      <MenuItem value=""><em>Sin asignar</em></MenuItem>
                      {personal.map(p => <MenuItem key={p.id} value={p.id}>{p.nombres} {p.apellidos}</MenuItem>)}
                    </TextField>
                  )}
                </Stack>
              </Grid>

              {/* Columna derecha */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack gap={2} height="100%">
                  <Box sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '10px', bgcolor: '#F9FAFB', flex: 1 }}>
                    <Typography fontSize={11} fontWeight={600} color="text.secondary" mb={1} textTransform="uppercase" letterSpacing="0.05em">
                      Estado inicial
                    </Typography>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                      <Typography fontSize={13} fontWeight={700} color="#3B82F6">ABIERTA</Typography>
                      <Typography fontSize={11} color="text.secondary">— Se asignará automáticamente al crear</Typography>
                    </Stack>
                  </Box>
                  <TextField
                    label="Observaciones" fullWidth size="small" multiline rows={3}
                    value={form.observaciones} placeholder="Descripción de la situación, síntomas observados..."
                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
                </Stack>
              </Grid>

            </Grid>
          </Box>

          {/* ── Sección inferior: Trabajos y Repuestos (scrollable) ── */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 2 }}>
            <Divider sx={{ my: 2 }} />

            <Tabs value={formTab} onChange={(_, v) => setFormTab(v)}
              sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: GF_COLOR }, minHeight: 36 }}>
              <Tab label={`Trabajos a realizar (${trabajos.length})`}
                sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, minHeight: 36, py: 0.5, '&.Mui-selected': { color: GF_COLOR } }} />
              <Tab
                icon={<PartsIcon sx={{ fontSize: 14 }} />} iconPosition="start"
                label={`Repuestos (${repuestoItems.filter(r => r.repuesto_id).length})`}
                sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, minHeight: 36, py: 0.5, '&.Mui-selected': { color: GF_COLOR } }} />
            </Tabs>

            {/* Tab 0: Trabajos */}
            {formTab === 0 && (
              <Box>
                {/* Header */}
                <Grid container spacing={1} mb={0.5} px={0.5}>
                  <Grid size={4}><Typography fontSize={11} fontWeight={600} color="text.secondary">Descripción del trabajo *</Typography></Grid>
                  <Grid size={3}><Typography fontSize={11} fontWeight={600} color="text.secondary">Tipo de trabajo</Typography></Grid>
                  <Grid size={3}><Typography fontSize={11} fontWeight={600} color="text.secondary">Costo M.O. ($)</Typography></Grid>
                  <Grid size={2} />
                </Grid>

                <Stack gap={1}>
                  {trabajos.map((t, i) => (
                    <Grid container spacing={1} key={i} alignItems="center">
                      <Grid size={4}>
                        <TextField placeholder={`Trabajo ${i + 1}`} fullWidth size="small"
                          value={t.descripcion}
                          onChange={e => setTrabajos(ts => ts.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))} />
                      </Grid>
                      <Grid size={3}>
                        <TextField select fullWidth size="small" value={t.tipo_trabajo_id}
                          onChange={e => setTrabajos(ts => ts.map((x, j) => j === i ? { ...x, tipo_trabajo_id: e.target.value } : x))}>
                          <MenuItem value=""><em>Sin tipo</em></MenuItem>
                          {tiposTrabajo.map(tt => <MenuItem key={tt.id} value={tt.id}>{tt.nombre}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={3}>
                        <TextField type="number" fullWidth size="small" inputProps={{ min: 0 }}
                          value={t.costo_mano_obra} placeholder="0"
                          InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={11}>$</Typography></InputAdornment> }}
                          onChange={e => setTrabajos(ts => ts.map((x, j) => j === i ? { ...x, costo_mano_obra: e.target.value } : x))} />
                      </Grid>
                      <Grid size={2} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {trabajos.length > 1 && (
                          <IconButton size="small" onClick={() => setTrabajos(ts => ts.filter((_, j) => j !== i))}>
                            <DeleteIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                          </IconButton>
                        )}
                      </Grid>
                    </Grid>
                  ))}
                </Stack>

                <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                  onClick={() => setTrabajos(ts => [...ts, { descripcion: '', tipo_trabajo_id: '', costo_mano_obra: '' }])}
                  sx={{ mt: 1.5, textTransform: 'none', color: GF_COLOR, fontSize: 12 }}>
                  Agregar trabajo
                </Button>
              </Box>
            )}

            {/* Tab 1: Repuestos */}
            {formTab === 1 && (
              <Box>
                {/* Header */}
                <Grid container spacing={1} mb={0.5} px={0.5}>
                  <Grid size={5}><Typography fontSize={11} fontWeight={600} color="text.secondary">Repuesto del catálogo</Typography></Grid>
                  <Grid size={2}><Typography fontSize={11} fontWeight={600} color="text.secondary">Cantidad</Typography></Grid>
                  <Grid size={2}><Typography fontSize={11} fontWeight={600} color="text.secondary">P. unitario</Typography></Grid>
                  <Grid size={2}><Typography fontSize={11} fontWeight={600} color="text.secondary">Subtotal</Typography></Grid>
                  <Grid size={1} />
                </Grid>

                <Stack gap={1}>
                  {repuestoItems.map((r, i) => {
                    const rep = repuestosData.find(rd => String(rd.id) === r.repuesto_id)
                    const subtotal = rep?.costo_referencia ? Number(r.cantidad) * rep.costo_referencia : 0
                    return (
                      <Grid container spacing={1} key={i} alignItems="center">
                        <Grid size={5}>
                          <TextField select fullWidth size="small" value={r.repuesto_id}
                            onChange={e => setRepuestoItems(rs => rs.map((x, j) => j === i ? { ...x, repuesto_id: e.target.value } : x))}>
                            <MenuItem value=""><em>Seleccionar repuesto</em></MenuItem>
                            {repuestosData.map(rd => (
                              <MenuItem key={rd.id} value={rd.id}>
                                <Box>
                                  <Typography fontSize={12} fontWeight={600}>{rd.nombre}</Typography>
                                  <Typography fontSize={10} color="text.secondary">{rd.codigo} · {rd.unidad}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid size={2}>
                          <TextField type="number" fullWidth size="small" inputProps={{ min: 1 }}
                            value={r.cantidad}
                            onChange={e => setRepuestoItems(rs => rs.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} />
                        </Grid>
                        <Grid size={2}>
                          <Typography fontSize={12} color="text.secondary" sx={{ pl: 0.5 }}>
                            {rep?.costo_referencia ? fmt(rep.costo_referencia) : '—'}
                          </Typography>
                        </Grid>
                        <Grid size={2}>
                          <Typography fontSize={12} fontWeight={700} color={subtotal > 0 ? GF_COLOR : 'text.secondary'} sx={{ pl: 0.5 }}>
                            {subtotal > 0 ? fmt(subtotal) : '—'}
                          </Typography>
                        </Grid>
                        <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                          {repuestoItems.length > 1 && (
                            <IconButton size="small" onClick={() => setRepuestoItems(rs => rs.filter((_, j) => j !== i))}>
                              <DeleteIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                            </IconButton>
                          )}
                        </Grid>
                      </Grid>
                    )
                  })}
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5}>
                  <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setRepuestoItems(rs => [...rs, { repuesto_id: '', cantidad: '1' }])}
                    sx={{ textTransform: 'none', color: GF_COLOR, fontSize: 12 }}>
                    Agregar repuesto
                  </Button>
                  {totalRepuestos > 0 && (
                    <Box sx={{ px: 2, py: 0.75, bgcolor: alpha(GF_COLOR, 0.08), borderRadius: '8px' }}>
                      <Typography fontSize={12} fontWeight={700} color={GF_COLOR}>
                        Total repuestos: {fmt(totalRepuestos)}
                      </Typography>
                    </Box>
                  )}
                </Stack>

                {repuestosData.length === 0 && (
                  <Box sx={{ mt: 2, p: 2, border: '1px dashed #D1D5DB', borderRadius: '10px', textAlign: 'center' }}>
                    <PartsIcon sx={{ fontSize: 32, color: '#D1D5DB', mb: 1 }} />
                    <Typography fontSize={12} color="text.secondary">
                      No hay repuestos en el catálogo. Agrégalos desde{' '}
                      <Typography component="span" fontSize={12} color={GF_COLOR} fontWeight={600}>Configuración → Repuestos</Typography>
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* ── Acciones ── */}
          <DialogActions sx={{ px: 3, py: 2, gap: 1, borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
            <Button size="small" onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={createMut.isPending}
              startIcon={createMut.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', fontWeight: 600, bgcolor: GF_COLOR, '&:hover': { bgcolor: '#27884A' }, px: 3 }}>
              Crear orden de trabajo
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ── Dialog cambiar estado ── */}
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

      {/* ── Dialog eliminar ── */}
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
