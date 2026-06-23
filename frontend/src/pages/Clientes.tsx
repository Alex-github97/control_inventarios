import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, TextField, IconButton, Tooltip, alpha, Chip,
} from '@mui/material'
import { Add, People, Delete } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

export default function Clientes() {
  const queryClient = useQueryClient()
  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState({ nombre: '', nit: '' })

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes-manifiestos'],
    queryFn: () => apiClient.get('/manifiestos/clientes').then((r: any) => r.data),
  })

  const crearMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/manifiestos/clientes', data).then((r: any) => r.data),
    onSuccess: () => {
      toast.success('Cliente creado')
      queryClient.invalidateQueries({ queryKey: ['clientes-manifiestos'] })
      setOpenDialog(false)
      setForm({ nombre: '', nit: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando cliente'),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/manifiestos/clientes/${id}`),
    onSuccess: () => {
      toast.success('Cliente eliminado')
      queryClient.invalidateQueries({ queryKey: ['clientes-manifiestos'] })
    },
    onError: () => toast.error('Error eliminando cliente'),
  })

  const handleSubmit = () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    crearMutation.mutate({ nombre: form.nombre.trim(), nit: form.nit.trim() || undefined })
  }

  const items: any[] = clientes ?? []

  return (
    <Layout title="Clientes">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Clientes registrados para asignar en manifiestos
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' } }}>
          Nuevo Cliente
        </Button>
      </Box>

      <Card sx={{ mb: 2.5, p: 2, border: `1px solid ${alpha(PRIMARY, 0.2)}`, borderLeft: `4px solid ${PRIMARY}`, borderRadius: '12px' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
          Total clientes
        </Typography>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#1E293B' }}>
          {isLoading ? '—' : items.length}
        </Typography>
      </Card>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nombre / Razón Social</TableCell>
                <TableCell>NIT</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: '#94A3B8' }}>
                    <People sx={{ fontSize: 40, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    Sin clientes registrados. Cree el primero.
                  </TableCell>
                </TableRow>
              ) : items.map((c: any) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#94A3B8' }}>
                      #{c.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#64748B' }}>
                      {c.nit || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label="Activo" size="small"
                      sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Eliminar cliente">
                      <IconButton size="small" onClick={() => eliminarMutation.mutate(c.id)}
                        sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.06) } }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Nombre / Razón Social *"
                value={form.nombre} onChange={(e: any) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Empresa XYZ S.A.S." />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="NIT (opcional)"
                value={form.nit} onChange={(e: any) => setForm({ ...form, nit: e.target.value })}
                placeholder="Ej: 900123456-1" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={crearMutation.isPending}
            sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' } }}>
            {crearMutation.isPending ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
