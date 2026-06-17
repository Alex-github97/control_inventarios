import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material'
import { Add, LocalShipping } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  DISPONIBLE:     { bg: '#DCFCE7', color: '#16A34A' },
  EN_RUTA:        { bg: '#FEF3C7', color: '#D97706' },
  MANTENIMIENTO:  { bg: '#FEE2E2', color: '#DC2626' },
  INACTIVO:       { bg: '#F1F5F9', color: '#64748B' },
}

export default function Vehiculos() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ placa: '', tipo: 'CAMION', marca: '', modelo: '', capacidad_estibas: '' })

  const { data: vehiculos, isLoading } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: () => apiClient.get('/vehiculos').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/vehiculos', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Vehículo creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] })
      setOpen(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando vehículo'),
  })

  return (
    <Layout title="Vehículos">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Nuevo Vehículo</Button>
      </Box>
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Placa</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Marca/Modelo</TableCell>
                <TableCell>Capacidad</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : (vehiculos || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8' }}>
                    <LocalShipping sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    Sin vehículos registrados
                  </TableCell>
                </TableRow>
              ) : (vehiculos || []).map((v: any) => {
                const ec = ESTADO_COLORS[v.estado] || { bg: '#F1F5F9', color: '#64748B' }
                return (
                  <TableRow key={v.id} sx={{ '&:hover': { bgcolor: 'rgba(50,172,92,0.04)' } }}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 14 }}>{v.placa}</Typography></TableCell>
                    <TableCell><Chip label={v.tipo} size="small" variant="outlined" sx={{ fontSize: 11 }} /></TableCell>
                    <TableCell><Typography variant="body2">{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</Typography></TableCell>
                    <TableCell>
                      {v.capacidad_estibas ? (
                        <Typography variant="body2">{v.capacidad_estibas} estibas</Typography>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={v.estado} size="small" sx={{ bgcolor: ec.bg, color: ec.color, fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Vehículo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Placa *" value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} /></Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select value={form.tipo} label="Tipo *" onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {['CAMION', 'TRACTOMULA', 'FURGON', 'CAMIONETA', 'MULA', 'TURBO', 'PATINETA'].map(t =>
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Modelo/Año" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Capacidad (estibas)" type="number" value={form.capacidad_estibas} onChange={e => setForm({ ...form, capacidad_estibas: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => createMutation.mutate({ ...form, capacidad_estibas: form.capacidad_estibas ? parseInt(form.capacidad_estibas) : undefined })} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
