import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Autocomplete,
  Tooltip, IconButton, alpha,
} from '@mui/material'
import { Add, Business, Settings, Delete } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

export default function Proveedores() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [openConfigTipos, setOpenConfigTipos] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [selectedTipo, setSelectedTipo] = useState<any>(null)
  const [form, setForm] = useState({
    nit: '', razon_social: '', nombre_comercial: '',
    contacto_nombre: '', contacto_email: '', contacto_telefono: '', ciudad: '',
  })

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => apiClient.get('/proveedores').then((r: any) => r.data),
  })

  const { data: tipos } = useQuery({
    queryKey: ['tipos-proveedor'],
    queryFn: () => apiClient.get('/proveedores/tipos').then((r: any) => r.data),
  })

  const crearTipoMutation = useMutation({
    mutationFn: (nombre: string) => apiClient.post('/proveedores/tipos', { nombre }).then((r: any) => r.data),
    onSuccess: () => {
      toast.success('Tipo creado')
      queryClient.invalidateQueries({ queryKey: ['tipos-proveedor'] })
      setNuevoTipo('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando tipo'),
  })

  const eliminarTipoMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/proveedores/tipos/${id}`),
    onSuccess: () => {
      toast.success('Tipo eliminado')
      queryClient.invalidateQueries({ queryKey: ['tipos-proveedor'] })
    },
    onError: () => toast.error('Error eliminando tipo'),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/proveedores', data).then((r: any) => r.data),
    onSuccess: () => {
      toast.success('Proveedor creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      setOpen(false)
      setSelectedTipo(null)
      setForm({ nit: '', razon_social: '', nombre_comercial: '', contacto_nombre: '', contacto_email: '', contacto_telefono: '', ciudad: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando proveedor'),
  })

  const handleSubmit = () => {
    if (!form.nit.trim() || !form.razon_social.trim() || !selectedTipo) {
      toast.error('NIT, razón social y tipo son obligatorios')
      return
    }
    createMutation.mutate({ ...form, tipo: selectedTipo.nombre })
  }

  return (
    <Layout title="Proveedores">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Nuevo Proveedor</Button>
      </Box>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>NIT</TableCell>
                <TableCell>Razón Social</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Ciudad</TableCell>
                <TableCell>Contacto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : (proveedores || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8' }}>
                    <Business sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    Sin proveedores registrados
                  </TableCell>
                </TableRow>
              ) : (proveedores || []).map((p: any) => (
                <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(50,172,92,0.04)' } }}>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.nit}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.razon_social}</Typography></TableCell>
                  <TableCell>
                    <Chip label={p.tipo} size="small"
                      sx={{ bgcolor: alpha(PRIMARY, 0.12), color: '#16A34A', fontWeight: 700, fontSize: 11 }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{p.ciudad || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{p.contacto_nombre || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Dialog nuevo proveedor */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Proveedor</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="NIT *"
                value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={tipos ?? []}
                  getOptionLabel={(o: any) => o.nombre}
                  value={selectedTipo}
                  onChange={(_: any, v: any) => setSelectedTipo(v)}
                  noOptionsText="Sin tipos configurados"
                  renderInput={(params: any) => (
                    <TextField {...params} label="Tipo *" size="small" />
                  )}
                />
                <Tooltip title="Configurar tipos">
                  <IconButton size="small" onClick={() => setOpenConfigTipos(true)} sx={{ mt: 0.5 }}>
                    <Settings fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Razón Social *"
                value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Nombre Comercial"
                value={form.nombre_comercial} onChange={e => setForm({ ...form, nombre_comercial: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Contacto"
                value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Ciudad"
                value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Email Contacto" type="email"
                value={form.contacto_email} onChange={e => setForm({ ...form, contacto_email: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Teléfono"
                value={form.contacto_telefono} onChange={e => setForm({ ...form, contacto_telefono: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal configuración de tipos */}
      <Dialog open={openConfigTipos} onClose={() => setOpenConfigTipos(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Configurar Tipos de Proveedor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" fullWidth label="Nuevo tipo"
              value={nuevoTipo}
              onChange={e => setNuevoTipo(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && nuevoTipo.trim() && crearTipoMutation.mutate(nuevoTipo.trim())}
              placeholder="Ej: SERVICIO" />
            <Button variant="contained" onClick={() => crearTipoMutation.mutate(nuevoTipo.trim())}
              disabled={!nuevoTipo.trim() || crearTipoMutation.isPending}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' }, minWidth: 40, px: 1 }}>
              <Add />
            </Button>
          </Box>
          {(tipos ?? []).length === 0 ? (
            <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', py: 2 }}>
              Sin tipos registrados
            </Typography>
          ) : (tipos ?? []).map((t: any) => (
            <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.nombre}</Typography>
              <IconButton size="small" onClick={() => eliminarTipoMutation.mutate(t.id)}
                sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfigTipos(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
