import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material'
import { Add, Business } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

export default function Proveedores() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    nit: '', razon_social: '', nombre_comercial: '', tipo: 'COMPRA',
    contacto_nombre: '', contacto_email: '', contacto_telefono: '', ciudad: ''
  })

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => apiClient.get('/proveedores').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/proveedores', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Proveedor creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      setOpen(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando proveedor'),
  })

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
                      sx={{
                        bgcolor: p.tipo === 'ALQUILER' ? '#DBEAFE' : p.tipo === 'AMBOS' ? '#EDE9FE' : '#DCFCE7',
                        color: p.tipo === 'ALQUILER' ? '#2563EB' : p.tipo === 'AMBOS' ? '#7C3AED' : '#16A34A',
                        fontWeight: 700, fontSize: 11,
                      }}
                    />
                  </TableCell>
                  <TableCell><Typography variant="body2">{p.ciudad || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{p.contacto_nombre || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Proveedor</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="NIT *" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select value={form.tipo} label="Tipo *" onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <MenuItem value="COMPRA">Compra</MenuItem>
                  <MenuItem value="ALQUILER">Alquiler</MenuItem>
                  <MenuItem value="AMBOS">Ambos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Razón Social *" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Nombre Comercial" value={form.nombre_comercial} onChange={e => setForm({ ...form, nombre_comercial: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Contacto" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Ciudad" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Email Contacto" type="email" value={form.contacto_email} onChange={e => setForm({ ...form, contacto_email: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Teléfono" value={form.contacto_telefono} onChange={e => setForm({ ...form, contacto_telefono: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
