import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Autocomplete, Tooltip, IconButton,
} from '@mui/material'
import { Add, Assignment, OpenInNew } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  PROGRAMADO:   { bg: '#EFF6FF', color: '#2563EB' },
  EN_CARGUE:    { bg: '#FEF3C7', color: '#D97706' },
  EN_TRANSITO:  { bg: '#EDE9FE', color: '#7C3AED' },
  ENTREGADO:    { bg: '#DCFCE7', color: '#16A34A' },
  CANCELADO:    { bg: '#FEE2E2', color: '#DC2626' },
  CON_NOVEDAD:  { bg: '#FCE7F3', color: '#DB2777' },
}

export default function Manifiestos() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<any>(null)
  const [form, setForm] = useState({
    numero: '', vehiculo_id: '', origen_id: '', destino_id: '',
    fecha_programada: '', observaciones: ''
  })

  const { data: manifiestos, isLoading } = useQuery({
    queryKey: ['manifiestos'],
    queryFn: () => apiClient.get('/manifiestos').then(r => r.data),
  })
  const { data: vehiculos } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: () => apiClient.get('/vehiculos').then(r => r.data),
  })
  const { data: ubicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => apiClient.get('/ubicaciones').then((r: any) => r.data),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes-manifiestos'],
    queryFn: () => apiClient.get('/manifiestos/clientes').then((r: any) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/manifiestos', data).then((r: any) => r.data),
    onSuccess: () => {
      toast.success('Manifiesto creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['manifiestos'] })
      setOpen(false)
      setSelectedCliente(null)
      setForm({ numero: '', vehiculo_id: '', origen_id: '', destino_id: '', fecha_programada: '', observaciones: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando manifiesto'),
  })

  const handleSubmit = () => {
    createMutation.mutate({
      numero: form.numero,
      vehiculo_id: parseInt(form.vehiculo_id),
      origen_id: parseInt(form.origen_id),
      destino_id: parseInt(form.destino_id),
      cliente_nombre: selectedCliente?.nombre || undefined,
      cliente_nit: selectedCliente?.nit || undefined,
      fecha_programada: form.fecha_programada,
      observaciones: form.observaciones || undefined,
    })
  }

  return (
    <Layout title="Manifiestos">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Nuevo Manifiesto
        </Button>
      </Box>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha Programada</TableCell>
                <TableCell>Estibas Cargadas</TableCell>
                <TableCell>Estibas Descargadas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : (manifiestos || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94A3B8' }}>
                    <Assignment sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    Sin manifiestos registrados
                  </TableCell>
                </TableRow>
              ) : (manifiestos || []).map((m: any) => {
                const ec = ESTADO_COLORS[m.estado] || { bg: '#F1F5F9', color: '#64748B' }
                return (
                  <TableRow key={m.id} sx={{ '&:hover': { bgcolor: 'rgba(50,172,92,0.04)' }, cursor: 'pointer' }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{m.numero}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={m.estado.replace('_', ' ')} size="small"
                        sx={{ bgcolor: ec.bg, color: ec.color, fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2">{m.cliente_nombre || '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {format(new Date(m.fecha_programada), 'dd/MM/yyyy', { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={m.total_estibas_cargadas} size="small" sx={{ bgcolor: '#DBEAFE', color: '#2563EB', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={m.total_estibas_descargadas} size="small" sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Manifiesto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Número *" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="date" label="Fecha Programada *" InputLabelProps={{ shrink: true }}
                value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Vehículo *</InputLabel>
                <Select value={form.vehiculo_id} label="Vehículo *" onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}>
                  {(vehiculos || []).map((v: any) => <MenuItem key={v.id} value={v.id}>{v.placa} — {v.tipo}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Origen *</InputLabel>
                <Select value={form.origen_id} label="Origen *" onChange={e => setForm({ ...form, origen_id: e.target.value })}>
                  {(ubicaciones || []).map((u: any) => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Destino *</InputLabel>
                <Select value={form.destino_id} label="Destino *" onChange={e => setForm({ ...form, destino_id: e.target.value })}>
                  {(ubicaciones || []).map((u: any) => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={clientes ?? []}
                  getOptionLabel={(o: any) => o.nit ? `${o.nombre} — ${o.nit}` : o.nombre}
                  value={selectedCliente}
                  onChange={(_: any, v: any) => setSelectedCliente(v)}
                  noOptionsText="Sin clientes. Créelos en Recursos > Clientes"
                  renderInput={(params: any) => (
                    <TextField {...params} label="Cliente" size="small" placeholder="Seleccione un cliente" />
                  )}
                />
                <Tooltip title="Gestionar clientes">
                  <IconButton size="small" onClick={() => navigate('/clientes')} sx={{ mt: 0.5 }}>
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Observaciones" multiline rows={2} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear Manifiesto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
