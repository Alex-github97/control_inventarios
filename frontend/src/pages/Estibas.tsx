import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination,
  IconButton, Tooltip, Chip, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material'
import {
  Search, Add, QrCode2, Visibility, FilterList,
  ViewModule
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estibasApi } from '@/api/estibas'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ESTADOS = [
  'DISPONIBLE', 'EN_INVENTARIO', 'EN_TRANSITO', 'CARGADA',
  'EN_CLIENTE', 'PENDIENTE_RETORNO', 'EN_REPARACION', 'DANADA', 'BAJA',
]

const PROPIETARIOS = ['PROPIA', 'ALQUILADA', 'CLIENTE', 'PROVEEDOR', 'TERCERO']

const TIPOS = ['MADERA', 'PLASTICO', 'METAL', 'CARTON', 'MIXTA']

const MATERIALES: Record<string, string[]> = {
  MADERA:   ['MADERA_PINO', 'MADERA_EUCALIPTO'],
  PLASTICO: ['PLASTICO_HDPE'],
  METAL:    ['ACERO', 'ALUMINIO'],
  CARTON:   ['CARTON_CORRUGADO'],
  MIXTA:    ['MADERA_PINO', 'MADERA_EUCALIPTO', 'PLASTICO_HDPE', 'ACERO', 'ALUMINIO', 'CARTON_CORRUGADO'],
}

const EMPTY_FORM = {
  codigo_interno: '',
  tipo: 'MADERA',
  material: 'MADERA_PINO',
  tipo_propietario: 'PROPIA',
  fecha_ingreso: new Date().toISOString().split('T')[0],
  largo_cm: 120,
  ancho_cm: 100,
  alto_cm: 15,
  peso_kg: 25,
  capacidad_carga_kg: 1000,
  valor_compra: '',
  observaciones: '',
}

export default function Estibas() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [estado, setEstado] = useState('')
  const [propietario, setPropietario] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['estibas', page, pageSize, search, estado, propietario],
    queryFn: () => estibasApi.listar({
      page: page + 1, page_size: pageSize,
      ...(search && { search }),
      ...(estado && { estado }),
      ...(propietario && { tipo_propietario: propietario }),
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => estibasApi.crear(data),
    onSuccess: () => {
      toast.success('Estiba creada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['estibas'] })
      setOpenDialog(false)
      setForm({ ...EMPTY_FORM })
      setFormError('')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Error al crear la estiba'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const handleSearch = () => setSearch(searchInput)

  const handleTipoChange = (tipo: string) => {
    const mats = MATERIALES[tipo] ?? []
    setForm(f => ({ ...f, tipo, material: mats[0] ?? '' }))
  }

  const handleSubmit = () => {
    if (!form.codigo_interno.trim()) { setFormError('El código interno es obligatorio'); return }
    if (!form.fecha_ingreso) { setFormError('La fecha de ingreso es obligatoria'); return }
    setFormError('')
    createMutation.mutate({
      ...form,
      largo_cm: Number(form.largo_cm),
      ancho_cm: Number(form.ancho_cm),
      alto_cm: Number(form.alto_cm),
      peso_kg: Number(form.peso_kg),
      capacidad_carga_kg: Number(form.capacidad_carga_kg),
      valor_compra: form.valor_compra !== '' ? Number(form.valor_compra) : null,
      observaciones: form.observaciones || null,
    })
  }

  const handleClose = () => {
    if (createMutation.isPending) return
    setOpenDialog(false)
    setForm({ ...EMPTY_FORM })
    setFormError('')
  }

  return (
    <Layout title="Estibas">
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Buscar por código, QR, RFID..."
          size="small"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          sx={{ width: { xs: '100%', sm: 340 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94A3B8', fontSize: 18 }} /></InputAdornment>,
          }}
        />
        <Button variant="contained" onClick={handleSearch} sx={{ minWidth: 90 }}>
          Buscar
        </Button>
        <Button
          variant="outlined" startIcon={<FilterList />}
          onClick={() => setShowFilters(!showFilters)}
          color={showFilters ? 'primary' : 'inherit'}
        >
          Filtros
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined" startIcon={<QrCode2 />}
          onClick={() => navigate('/estibas/scan')}
        >
          Escanear QR
        </Button>
        <Button
          variant="contained" startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Nueva Estiba
        </Button>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent sx={{ py: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select value={estado} label="Estado" onChange={e => { setEstado(e.target.value); setPage(0) }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace(/_/g, ' ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Propietario</InputLabel>
                  <Select value={propietario} label="Propietario" onChange={e => { setPropietario(e.target.value); setPage(0) }}>
                    <MenuItem value="">Todos</MenuItem>
                    {PROPIETARIOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button onClick={() => { setEstado(''); setPropietario(''); setSearch(''); setSearchInput('') }}>
                  Limpiar filtros
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        {error ? (
          <Alert severity="error" sx={{ m: 2 }}>Error cargando estibas</Alert>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Propietario</TableCell>
                    <TableCell>Ubicación Actual</TableCell>
                    <TableCell>Usos</TableCell>
                    <TableCell>Fecha Ingreso</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (data?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                        <ViewModule sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                        No se encontraron estibas
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.items ?? []).map((estiba) => (
                      <TableRow key={estiba.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(50,172,92,0.04)' } }}
                        onClick={() => navigate(`/estibas/${estiba.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                            {estiba.codigo_interno}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{estiba.tipo}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={estiba.estado} />
                        </TableCell>
                        <TableCell>
                          <Chip label={estiba.tipo_propietario} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {estiba.ubicacion_actual?.nombre ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{estiba.total_usos}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {format(new Date(estiba.fecha_ingreso), 'dd/MM/yyyy', { locale: es })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" onClick={e => e.stopPropagation()}>
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" onClick={() => navigate(`/estibas/${estiba.id}`)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver QR">
                            <IconButton size="small">
                              <QrCode2 fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={data?.total ?? 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value)); setPage(0) }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Card>

      {/* Diálogo Nueva Estiba */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Estiba</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Código Interno *"
                fullWidth size="small"
                value={form.codigo_interno}
                onChange={e => setForm(f => ({ ...f, codigo_interno: e.target.value.toUpperCase() }))}
                placeholder="Ej: EST-001"
                inputProps={{ maxLength: 80 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select value={form.tipo} label="Tipo" onChange={e => handleTipoChange(e.target.value)}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Material</InputLabel>
                <Select value={form.material} label="Material" onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
                  {(MATERIALES[form.tipo] ?? []).map(m => (
                    <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Propietario</InputLabel>
                <Select value={form.tipo_propietario} label="Propietario" onChange={e => setForm(f => ({ ...f, tipo_propietario: e.target.value }))}>
                  {PROPIETARIOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha de Ingreso *"
                type="date"
                fullWidth size="small"
                value={form.fecha_ingreso}
                onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <TextField label="Largo (cm)" type="number" fullWidth size="small"
                value={form.largo_cm} onChange={e => setForm(f => ({ ...f, largo_cm: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Ancho (cm)" type="number" fullWidth size="small"
                value={form.ancho_cm} onChange={e => setForm(f => ({ ...f, ancho_cm: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Alto (cm)" type="number" fullWidth size="small"
                value={form.alto_cm} onChange={e => setForm(f => ({ ...f, alto_cm: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Peso (kg)" type="number" fullWidth size="small"
                value={form.peso_kg} onChange={e => setForm(f => ({ ...f, peso_kg: Number(e.target.value) }))} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Capacidad carga (kg)" type="number" fullWidth size="small"
                value={form.capacidad_carga_kg} onChange={e => setForm(f => ({ ...f, capacidad_carga_kg: Number(e.target.value) }))} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Valor de compra (COP)" type="number" fullWidth size="small"
                value={form.valor_compra}
                onChange={e => setForm(f => ({ ...f, valor_compra: e.target.value }))}
                placeholder="Opcional" />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Observaciones" fullWidth size="small" multiline rows={2}
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                placeholder="Opcional" />
            </Grid>

            {formError && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ py: 0.5 }}>{formError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={createMutation.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Guardando...' : 'Crear Estiba'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
