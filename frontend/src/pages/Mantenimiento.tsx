import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, InputAdornment,
  alpha, Tooltip, IconButton, Autocomplete,
} from '@mui/material'
import {
  Add, Build, Delete, FilterList, Settings,
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
  const [filterEstiba, setFilterEstiba] = useState<any>(null)
  const [filterEstibaSearch, setFilterEstibaSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [estibaSearch, setEstibaSearch] = useState('')
  const [selectedEstiba, setSelectedEstiba] = useState<any>(null)
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null)
  const [selectedActividad, setSelectedActividad] = useState<any>(null)
  const [openConfigActividades, setOpenConfigActividades] = useState(false)
  const [nuevaActividad, setNuevaActividad] = useState('')
  const [form, setForm] = useState({
    tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0, 10),
    costo: '',
  })

  const { data: proveedores } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => apiClient.get('/proveedores/').then((r: any) => Array.isArray(r.data) ? r.data : (r.data.items ?? [])),
  })

  const { data: estibasParaFiltro } = useQuery({
    queryKey: ['estibas-filter-search', filterEstibaSearch],
    queryFn: () => apiClient.get('/estibas', { params: { search: filterEstibaSearch, page_size: 20 } }).then((r: any) => r.data.items ?? []),
    enabled: filterEstibaSearch.length >= 2,
  })

  const { data: estibasEncontradas } = useQuery({
    queryKey: ['estibas-search', estibaSearch],
    queryFn: () => apiClient.get('/estibas', { params: { search: estibaSearch, page_size: 20 } }).then((r: any) => r.data.items ?? []),
    enabled: estibaSearch.length >= 2,
  })

  const { data: actividades } = useQuery({
    queryKey: ['actividades-mantenimiento'],
    queryFn: () => apiClient.get('/mantenimientos/actividades').then((r: any) => r.data),
  })

  const crearActividadMutation = useMutation({
    mutationFn: (nombre: string) => apiClient.post('/mantenimientos/actividades', { nombre }).then(r => r.data),
    onSuccess: () => {
      toast.success('Actividad creada')
      queryClient.invalidateQueries({ queryKey: ['actividades-mantenimiento'] })
      setNuevaActividad('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando actividad'),
  })

  const eliminarActividadMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/mantenimientos/actividades/${id}`),
    onSuccess: () => {
      toast.success('Actividad eliminada')
      queryClient.invalidateQueries({ queryKey: ['actividades-mantenimiento'] })
    },
    onError: () => toast.error('Error eliminando actividad'),
  })

  const params: Record<string, string> = {}
  if (filterEstiba) params.estiba_id = String(filterEstiba.id)
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
      setEstibaSearch('')
      setSelectedEstiba(null)
      setSelectedProveedor(null)
      setSelectedActividad(null)
      setForm({ tipo: 'PREVENTIVO', fecha: new Date().toISOString().slice(0, 10), costo: '' })
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
    if (!selectedEstiba || !selectedProveedor || !selectedActividad || !form.tipo || !form.fecha || !form.costo) {
      toast.error('Estiba, actividad, proveedor, tipo, fecha y costo son obligatorios')
      return
    }
    createMutation.mutate({
      estiba_id: selectedEstiba.id,
      proveedor_id: selectedProveedor.id,
      tipo: form.tipo,
      fecha: form.fecha,
      costo: parseFloat(form.costo),
      descripcion: selectedActividad.nombre,
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
          <Autocomplete
            options={estibasParaFiltro ?? []}
            getOptionLabel={(o: any) => o.codigo_interno}
            value={filterEstiba}
            inputValue={filterEstibaSearch}
            onInputChange={(_: any, v: string) => setFilterEstibaSearch(v)}
            onChange={(_: any, v: any) => setFilterEstiba(v)}
            noOptionsText={filterEstibaSearch.length < 2 ? 'Escriba 2+ caracteres' : 'Sin resultados'}
            sx={{ width: 200 }}
            renderInput={(params: any) => (
              <TextField {...params} size="small" label="Estiba" placeholder="Código..." />
            )}
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
          <Button size="small" onClick={() => { setFilterEstiba(null); setFilterEstibaSearch(''); setFilterTipo(''); setFilterDesde(''); setFilterHasta('') }}
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
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{m.proveedor_nombre || '—'}</Typography>
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
            <Grid item xs={12}>
              <Autocomplete
                options={estibasEncontradas ?? []}
                getOptionLabel={(o: any) => `${o.codigo_interno} — ${o.estado}`}
                inputValue={estibaSearch}
                onInputChange={(_: any, v: string) => setEstibaSearch(v)}
                onChange={(_: any, v: any) => setSelectedEstiba(v)}
                noOptionsText={estibaSearch.length < 2 ? 'Escriba al menos 2 caracteres' : 'No se encontraron estibas'}
                renderInput={(params: any) => (
                  <TextField {...params} label="Buscar estiba por código" size="small" required
                    placeholder="Ej: PRUEBA-001" />
                )}
              />
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
              <Autocomplete
                options={proveedores ?? []}
                getOptionLabel={(o: any) => `${o.razon_social} — ${o.nit}`}
                value={selectedProveedor}
                onChange={(_: any, v: any) => setSelectedProveedor(v)}
                noOptionsText="No hay proveedores registrados"
                renderInput={(params: any) => (
                  <TextField {...params} label="Proveedor de servicio *" size="small"
                    placeholder="Seleccione un proveedor" />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={actividades ?? []}
                  getOptionLabel={(o: any) => o.nombre}
                  value={selectedActividad}
                  onChange={(_: any, v: any) => setSelectedActividad(v)}
                  noOptionsText="No hay actividades configuradas"
                  renderInput={(params: any) => (
                    <TextField {...params} label="Actividad / Descripción *" size="small" />
                  )}
                />
                <Tooltip title="Configurar actividades">
                  <IconButton size="small" onClick={() => setOpenConfigActividades(true)} sx={{ mt: 0.5 }}>
                    <Settings fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
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

      {/* Modal configuración de actividades */}
      <Dialog open={openConfigActividades} onClose={() => setOpenConfigActividades(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Configurar Actividades</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" fullWidth label="Nueva actividad"
              value={nuevaActividad} onChange={(e: any) => setNuevaActividad(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && nuevaActividad.trim() && crearActividadMutation.mutate(nuevaActividad.trim())}
              placeholder="Ej: Cambio de 4 tablas" />
            <Button variant="contained" onClick={() => crearActividadMutation.mutate(nuevaActividad.trim())}
              disabled={!nuevaActividad.trim() || crearActividadMutation.isPending}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#27884A' }, minWidth: 40, px: 1 }}>
              <Add />
            </Button>
          </Box>
          {(actividades ?? []).length === 0 ? (
            <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', py: 2 }}>
              Sin actividades registradas
            </Typography>
          ) : (actividades ?? []).map((a: any) => (
            <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
              <Typography variant="body2">{a.nombre}</Typography>
              <IconButton size="small" onClick={() => eliminarActividadMutation.mutate(a.id)}
                sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfigActividades(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
