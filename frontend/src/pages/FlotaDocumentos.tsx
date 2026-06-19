import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Grid, Tooltip, CircularProgress,
  Tabs, Tab, alpha,
} from '@mui/material'
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Description as DocIcon, WarningAmber as WarnIcon, CheckCircle as OkIcon, Error as ErrorIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#7C3AED'

interface Vehiculo { id: number; placa: string }
interface Documento {
  id: number; vehiculo_id: number; tipo_documento: string
  numero?: string; fecha_expedicion?: string; fecha_vencimiento: string
  entidad_emisora?: string; estado_semaforo: string; dias_para_vencer: number
}

const TIPOS_DOC = [
  'SOAT', 'RTM', 'TARJETA_OPERACION', 'LICENCIA_TRANSITO',
  'SEGURO_RC', 'TECNOMECANICA', 'POLIZA_TODO_RIESGO', 'PERMISO_OPERACION', 'OTRO'
]

const EMPTY = { vehiculo_id: '', tipo_documento: '', numero: '', fecha_expedicion: '', fecha_vencimiento: '', entidad_emisora: '' }

const semColor = (s: string) => s === 'VENCIDO' ? '#EF4444' : s === 'POR_VENCER' ? '#F59E0B' : '#32AC5C'
const SemIcon = ({ s }: { s: string }) => {
  const c = semColor(s)
  if (s === 'VENCIDO') return <ErrorIcon sx={{ fontSize: 16, color: c }} />
  if (s === 'POR_VENCER') return <WarnIcon sx={{ fontSize: 16, color: c }} />
  return <OkIcon sx={{ fontSize: 16, color: c }} />
}

export default function FlotaDocumentos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Documento | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState<Documento | null>(null)

  const tabs = ['TODOS', 'VENCIDO', 'POR_VENCER', 'VIGENTE']

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({
    queryKey: ['flota-vehiculos'],
    queryFn: () => api.get('/flota/vehiculos/?activo=true').then(r => r.data),
  })

  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ['flota-documentos', tabs[tab]],
    queryFn: () => {
      const estado = tab === 0 ? '' : `?estado=${tabs[tab]}`
      return api.get(`/flota/documentos/${estado}`).then(r => r.data)
    },
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post(`/flota/vehiculos/${(d as any).vehiculo_id}/documentos`, d).then(r => r.data),
    onSuccess: () => {
      toast.success('Documento registrado')
      qc.invalidateQueries({ queryKey: ['flota-documentos'] })
      handleClose()
    },
    onError: () => toast.error('Error al registrar'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/documentos-vehiculo/${id}`, d).then(r => r.data),
    onSuccess: () => {
      toast.success('Documento actualizado')
      qc.invalidateQueries({ queryKey: ['flota-documentos'] })
      handleClose()
    },
    onError: () => toast.error('Error al actualizar'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/documentos-vehiculo/${id}`),
    onSuccess: () => {
      toast.success('Documento eliminado')
      qc.invalidateQueries({ queryKey: ['flota-documentos'] })
      setDeleteConfirm(null)
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const openDialog = (doc?: Documento) => {
    if (doc) {
      setEditing(doc)
      setForm({
        vehiculo_id: String(doc.vehiculo_id),
        tipo_documento: doc.tipo_documento,
        numero: doc.numero ?? '',
        fecha_expedicion: doc.fecha_expedicion ?? '',
        fecha_vencimiento: doc.fecha_vencimiento,
        entidad_emisora: doc.entidad_emisora ?? '',
      })
    } else { setEditing(null); setForm(EMPTY) }
    setDialogOpen(true)
  }
  const handleClose = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fecha_vencimiento) { toast.error('La fecha de vencimiento es obligatoria'); return }
    const payload: Record<string, unknown> = { ...form }
    payload.vehiculo_id = Number(payload.vehiculo_id)
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  const vencidos = documentos.filter(d => d.estado_semaforo === 'VENCIDO').length
  const porVencer = documentos.filter(d => d.estado_semaforo === 'POR_VENCER').length
  const vigentes = documentos.filter(d => d.estado_semaforo === 'VIGENTE').length

  const isMut = createMut.isPending || updateMut.isPending

  const placaVehiculo = (id: number) => vehiculos.find(v => v.id === id)?.placa ?? `ID ${id}`

  return (
    <Layout title="Documentos — Gestión de Flotas">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
            Gestión Documental
          </Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.25}>
            Control de vencimientos: SOAT, RTM, seguros y más
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: GF_COLOR, '&:hover': { bgcolor: '#6D28D9' }, boxShadow: `0 4px 12px ${alpha(GF_COLOR, 0.4)}` }}>
          Nuevo Documento
        </Button>
      </Stack>

      {/* Semáforo KPIs */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Vencidos', count: vencidos, color: '#EF4444' },
          { label: 'Por vencer (≤30 días)', count: porVencer, color: '#F59E0B' },
          { label: 'Vigentes', count: vigentes, color: '#32AC5C' },
        ].map(k => (
          <Grid key={k.label} size={{ xs: 4 }}>
            <Paper elevation={0} sx={{ border: `2px solid ${alpha(k.color, 0.3)}`, borderRadius: '14px', p: 2.5, bgcolor: alpha(k.color, 0.04) }}>
              <Typography fontSize={28} fontWeight={800} color={k.color} lineHeight={1}>{k.count}</Typography>
              <Typography fontSize={12} color="text.secondary" mt={0.25}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs filtro */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: GF_COLOR } }}>
        {['Todos', 'Vencidos', 'Por vencer', 'Vigentes'].map((l, i) => (
          <Tab key={i} label={l} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GF_COLOR } }} />
        ))}
      </Tabs>

      {/* Lista */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: GF_COLOR }} /></Box>
      ) : documentos.length === 0 ? (
        <Box textAlign="center" py={10}>
          <DocIcon sx={{ fontSize: 56, color: '#D1D5DB', mb: 2 }} />
          <Typography color="text.secondary">No hay documentos en esta categoría</Typography>
        </Box>
      ) : (
        <Stack gap={1}>
          {documentos.map(doc => {
            const color = semColor(doc.estado_semaforo)
            return (
              <Paper key={doc.id} elevation={0} sx={{
                border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '12px', p: 2,
                bgcolor: alpha(color, 0.02),
              }}>
                <Stack direction="row" alignItems="center" gap={2}>
                  <SemIcon s={doc.estado_semaforo} />
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography fontWeight={700} fontSize={13}>{doc.tipo_documento.replace(/_/g, ' ')}</Typography>
                      <Chip label={placaVehiculo(doc.vehiculo_id)} size="small"
                        sx={{ height: 18, fontSize: 10, bgcolor: alpha(GF_COLOR, 0.1), color: GF_COLOR }} />
                      {doc.numero && <Typography fontSize={12} color="text.secondary">#{doc.numero}</Typography>}
                    </Stack>
                    <Stack direction="row" gap={2} mt={0.25} flexWrap="wrap">
                      <Typography fontSize={12} color="text.secondary">
                        Vence: <strong>{new Date(doc.fecha_vencimiento).toLocaleDateString('es-CO')}</strong>
                      </Typography>
                      {doc.entidad_emisora && (
                        <Typography fontSize={12} color="text.secondary">{doc.entidad_emisora}</Typography>
                      )}
                    </Stack>
                  </Box>
                  <Chip
                    label={
                      doc.estado_semaforo === 'VENCIDO'
                        ? `Vencido hace ${Math.abs(doc.dias_para_vencer)}d`
                        : doc.estado_semaforo === 'POR_VENCER'
                        ? `Vence en ${doc.dias_para_vencer}d`
                        : 'Vigente'
                    }
                    size="small"
                    sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: 11 }}
                  />
                  <Stack direction="row" gap={0.25}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openDialog(doc)}>
                        <EditIcon sx={{ fontSize: 15, color: '#9CA3AF' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => setDeleteConfirm(doc)}>
                        <DeleteIcon sx={{ fontSize: 15, color: '#EF4444' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          {editing ? 'Editar Documento' : 'Registrar Documento'}
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
                <TextField select label="Tipo de Documento *" fullWidth size="small" value={form.tipo_documento}
                  onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))}>
                  <MenuItem value=""><em>Seleccionar</em></MenuItem>
                  {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Número de documento" fullWidth size="small" value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Entidad emisora" fullWidth size="small" value={form.entidad_emisora}
                  onChange={e => setForm(f => ({ ...f, entidad_emisora: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Fecha de expedición" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }} value={form.fecha_expedicion}
                  onChange={e => setForm(f => ({ ...f, fecha_expedicion: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Fecha de vencimiento *" type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }} value={form.fecha_vencimiento}
                  onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" size="small" variant="contained" disabled={isMut}
              startIcon={isMut ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#6D28D9' } }}>
              {editing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Confirmar eliminar */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Eliminar Documento</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            ¿Eliminar el documento <strong>{deleteConfirm?.tipo_documento}</strong>?
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
