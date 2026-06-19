import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Grid, Tooltip, CircularProgress,
  Tabs, Tab, alpha,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Person as PersonIcon, Engineering as MechanicIcon, Badge as BadgeIcon, Phone as PhoneIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const GF_COLOR = '#7C3AED'

interface Personal {
  id: number; tipo: string; nombres: string; apellidos: string
  tipo_documento: string; numero_documento: string
  telefono?: string; email?: string; direccion?: string; especialidad?: string; activo: boolean
}

const EMPTY: Record<string, string> = {
  tipo: 'CONDUCTOR', nombres: '', apellidos: '',
  tipo_documento: 'CC', numero_documento: '',
  telefono: '', email: '', direccion: '', especialidad: '',
}

export default function FlotaPersonal() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Personal | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState<Personal | null>(null)

  const tipos = ['CONDUCTOR', 'MECANICO']
  const tipoLabel = (t: string) => t === 'CONDUCTOR' ? 'Conductor' : 'Mecánico'

  const { data: personal = [], isLoading } = useQuery<Personal[]>({
    queryKey: ['flota-personal-all'],
    queryFn: () => api.get('/flota/personal/').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/flota/personal/', d).then(r => r.data),
    onSuccess: () => { toast.success('Personal registrado'); qc.invalidateQueries({ queryKey: ['flota-personal-all'] }); handleClose() },
    onError: () => toast.error('Error al registrar'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.put(`/flota/personal/${id}`, d).then(r => r.data),
    onSuccess: () => { toast.success('Datos actualizados'); qc.invalidateQueries({ queryKey: ['flota-personal-all'] }); handleClose() },
    onError: () => toast.error('Error al actualizar'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/personal/${id}`),
    onSuccess: () => { toast.success('Registro eliminado'); qc.invalidateQueries({ queryKey: ['flota-personal-all'] }); setDeleteConfirm(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const openDialog = (p?: Personal) => {
    if (p) {
      setEditing(p)
      setForm({
        tipo: p.tipo, nombres: p.nombres, apellidos: p.apellidos,
        tipo_documento: p.tipo_documento, numero_documento: p.numero_documento,
        telefono: p.telefono ?? '', email: p.email ?? '',
        direccion: p.direccion ?? '', especialidad: p.especialidad ?? '',
      })
    } else { setEditing(null); setForm(EMPTY) }
    setDialogOpen(true)
  }
  const handleClose = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombres.trim() || !form.numero_documento.trim()) {
      toast.error('Nombres y número de documento son obligatorios'); return
    }
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (editing) updateMut.mutate({ id: editing.id, d: payload })
    else createMut.mutate(payload)
  }

  const conductores = personal.filter(p => p.tipo === 'CONDUCTOR')
  const mecanicos = personal.filter(p => p.tipo === 'MECANICO')
  const filtered = tab === 0 ? personal : tab === 1 ? conductores : mecanicos

  const isMut = createMut.isPending || updateMut.isPending

  return (
    <Layout title="Personal — Gestión de Flotas">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
            Personal de Flota
          </Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.25}>
            Conductores y mecánicos registrados en el sistema
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: GF_COLOR, '&:hover': { bgcolor: '#6D28D9' }, boxShadow: `0 4px 12px ${alpha(GF_COLOR, 0.4)}` }}>
          Registrar Personal
        </Button>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total personal', count: personal.length, color: GF_COLOR },
          { label: 'Conductores', count: conductores.length, color: '#32AC5C' },
          { label: 'Mecánicos', count: mecanicos.length, color: '#3B82F6' },
        ].map(k => (
          <Grid key={k.label} size={{ xs: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
              <Typography fontSize={28} fontWeight={800} color={k.color} lineHeight={1}>{k.count}</Typography>
              <Typography fontSize={12} color="text.secondary" mt={0.25}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: GF_COLOR } }}>
        {['Todos', 'Conductores', 'Mecánicos'].map((l, i) => (
          <Tab key={i} label={l} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, '&.Mui-selected': { color: GF_COLOR } }} />
        ))}
      </Tabs>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: GF_COLOR }} /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={10}>
          <PersonIcon sx={{ fontSize: 56, color: '#D1D5DB', mb: 2 }} />
          <Typography color="text.secondary">No hay personal registrado en esta categoría</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(p => {
            const isConductor = p.tipo === 'CONDUCTOR'
            const color = isConductor ? '#32AC5C' : '#3B82F6'
            const Icon = isConductor ? PersonIcon : MechanicIcon
            return (
              <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{
                  border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5,
                  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.07)', borderColor: alpha(color, 0.4) },
                  transition: 'all 0.12s',
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" gap={1.5} alignItems="center">
                      <Box sx={{
                        width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(color, 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon sx={{ fontSize: 22, color }} />
                      </Box>
                      <Box>
                        <Typography fontWeight={700} fontSize={14}>{p.nombres} {p.apellidos}</Typography>
                        <Chip label={tipoLabel(p.tipo)} size="small"
                          sx={{ height: 18, fontSize: 10, bgcolor: alpha(color, 0.1), color }} />
                      </Box>
                    </Stack>
                    <Stack direction="row" gap={0.25}>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openDialog(p)}>
                          <EditIcon sx={{ fontSize: 15, color: '#9CA3AF' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => setDeleteConfirm(p)}>
                          <DeleteIcon sx={{ fontSize: 15, color: '#EF4444' }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Stack gap={0.5} mt={1.5}>
                    <Stack direction="row" gap={0.75} alignItems="center">
                      <BadgeIcon sx={{ fontSize: 12, color: '#9CA3AF' }} />
                      <Typography fontSize={12} color="text.secondary">{p.tipo_documento} {p.numero_documento}</Typography>
                    </Stack>
                    {p.telefono && (
                      <Stack direction="row" gap={0.75} alignItems="center">
                        <PhoneIcon sx={{ fontSize: 12, color: '#9CA3AF' }} />
                        <Typography fontSize={12} color="text.secondary">{p.telefono}</Typography>
                      </Stack>
                    )}
                    {p.especialidad && (
                      <Typography fontSize={12} color="text.secondary">Especialidad: {p.especialidad}</Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          {editing ? 'Editar Personal' : 'Registrar Personal'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} pt={0.5}>
              <Grid size={12}>
                <TextField select label="Tipo *" fullWidth size="small" value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {tipos.map(t => <MenuItem key={t} value={t}>{tipoLabel(t)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Nombres *" fullWidth size="small" value={form.nombres}
                  onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Apellidos *" fullWidth size="small" value={form.apellidos}
                  onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
              </Grid>
              <Grid size={4}>
                <TextField select label="Tipo documento" fullWidth size="small" value={form.tipo_documento}
                  onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))}>
                  {['CC', 'CE', 'PASAPORTE', 'NIT'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={8}>
                <TextField label="Número de documento *" fullWidth size="small" value={form.numero_documento}
                  onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Teléfono" fullWidth size="small" value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </Grid>
              <Grid size={6}>
                <TextField label="Email" type="email" fullWidth size="small" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField label="Dirección" fullWidth size="small" value={form.direccion}
                  onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </Grid>
              {form.tipo === 'MECANICO' && (
                <Grid size={12}>
                  <TextField label="Especialidad" fullWidth size="small" value={form.especialidad}
                    onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))}
                    placeholder="Ej: Motor, Frenos, Eléctrico, Llantas..." />
                </Grid>
              )}
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

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Eliminar Personal</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            ¿Eliminar a <strong>{deleteConfirm?.nombres} {deleteConfirm?.apellidos}</strong>?
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
