import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, InputAdornment,
  Alert, alpha, Tooltip, IconButton,
} from '@mui/material'
import {
  Add, Build, Search, Delete, AttachMoney, FilterList,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

const TIPOS_MANTENIMIENTO = [
  'PREVENTIVO', 'CORRECTIVO', 'REPARACION', 'INSPECCION', 'LIMPIEZA', 'PINTURA', 'REFUERZO',
]

const TIPO_COLORS: Record<string, string> = {
  PREVENTIVO: '#3B82F6', CORRECTIVO: '#F59E0B', REPARACION: '#EF4444',
  INSPECCION: '#8B5CF6', LIMPIEZA: '#06B6D4', PINTURA: '#EC4899', REFUERZO: '#32AC5C',
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

export default function Mantenimiento() {
  const queryClient = useQueryClient()
  const [openDialog, setOpenDialog] = useState(false)
  const [filterEstiba, setFilterEstiba] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [form, setForm] = useState({
    estiba_id: '', tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0, 10),
    costo: '', descripcion: '', proveedor_servicio: '',
  })

  const params: Record<string, string> = {}
  if (filterEstiba) params.estiba_id = filterEstiba
  if (filterTipo) params.tipo = filterTipo
  if (filterDesde) params.desde = filterDesde
  if (filterHasta) params.hasta = filterHasta

  const { data, isLoading } = useQuery({
    queryKey: ['mantenimientos', params],
    queryFn: () => apiClient.get('/mantenimientos/', { params }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (body: any) => apiClient.post('/mantenimientos/', body).then(r => r.data),
    onSuccess: () => {
      toast.success('Mantenimiento registrado')
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setOpenDialog(false)
      setForm({ estiba_id: '', tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0, 10), costo: '', descripcion: '', proveedor_servicio: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error registrando mantenimiento'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/mantenimientos/${id}`),
    onSuccess: () => {
      toast.success('Registro eliminado')
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Error eliminando registro'),
  })

  const handleSubmit = () => {
    if (!form.estiba_id || !form.tipo || !form.fecha || !form.costo) {
      toast.error('Estiba, tipo, fecha y costo son obligatorios')
      return
    }
    createMutation.mutate({
      estiba_id: parseInt(form.estiba_id),
      tipo: form.tipo,
      fecha: form.fecha,
      costo: parseFloat(form.costo),
      descripcion: form.descripcion || undefined,
      proveedor_servicio: form.proveedor_servicio || undefined,
    })
  }

  const items = data?.items ?? []
  const totalCosto = data?.total_costo ?? 0

  return (
    <Layout title="Mantenimiento de Estibas">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Registro de costos y mantenimientos por estiba
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' } }}>
          Registrar Mantenimiento
        </Button>
      </Box>

      {/* KPI */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: 'Registros encontrados', value: data?.total ?? 0, fmt: (v: number) => v.toLocaleString() },
          { label: 'Costo total filtrado', value: totalCosto, fmt: formatCOP },
        ].map(k => (
          <Grid item xs={12} sm={6} key={k.label}>
            <Card sx={{ p: 2, border: `1px solid ${alpha(PRIMARY, 0.2)}`, borderLeft: `4px solid ${PRIMARY}`, borderRadius: '12px' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                {k.label}
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#1E293B' }}>
                {isLoading ? '—' : k.fmt(k.value)}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterList sx={{ color: '#94A3B8', fontSize: 20 }} />
          <TextField
            size="small" label="ID Estiba" type="number"
            value={filterEstiba} onChange={e => setFilterEstiba(e.target.value)}
            sx={{ width: 130 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={filterTipo} label="Tipo" onChange={e => setFilterTipo(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {TIPOS_MANTENIMIENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Desde" type="date" InputLabelProps={{ shrink: true }}
            value={filterDesde} onChange={e => setFilterDesde(e.target.value)} sx={{ width: 145 }} />
          <TextField size="small" label="Hasta" type="date" InputLabelProps={{ shrink: true }}
            value={filterHasta} onChange={e => setFilterHasta(e.target.value)} sx={{ width: 145 }} />
          <Button size="small" onClick={() => { setFilterEstiba(''); setFilterTipo(''); setFilterDesde(''); setFilterHasta('') }}
            sx={{ color: '#64748B' }}>
            Limpiar
          </Button>
        </Box>
      </Card>

      {/* Tabla */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Estiba</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell>Registrado por</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: '#94A3B8' }}>
                    <Build sx={{ fontSize: 40, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    Sin registros de mantenimiento
                  </TableCell>
                </TableRow>
              ) : items.map((m: any) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {format(new Date(m.fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      #{m.estiba_id} {m.estiba_codigo && `— ${m.estiba_codigo}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={m.tipo} size="small"
                      sx={{ bgcolor: TIPO_COLORS[m.tipo] || '#64748B', color: '#FFF', fontWeight: 700, fontSize: 10 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.descripcion || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{m.proveedor_servicio || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>
                      {formatCOP(m.costo)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{m.usuario_nombre || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Eliminar registro">
                      <IconButton size="small" onClick={() => deleteMutation.mutate(m.id)}
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

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar Mantenimiento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="ID de Estiba" type="number" required
                value={form.estiba_id} onChange={e => setForm({ ...form, estiba_id: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Fecha" type="date" required
                InputLabelProps={{ shrink: true }}
                value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select value={form.tipo} label="Tipo" onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS_MANTENIMIENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Costo (COP)" type="number" required
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Proveedor del servicio"
                value={form.proveedor_servicio} onChange={e => setForm({ ...form, proveedor_servicio: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Descripción" multiline rows={2}
                value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}
            sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' } }}>
            {createMutation.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
