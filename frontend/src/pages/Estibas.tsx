import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, ButtonGroup, Menu, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination,
  IconButton, Tooltip, Chip, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Grid, alpha,
  Divider, Tabs, Tab,
} from '@mui/material'
import {
  Search, Add, QrCode2, Visibility, FilterList, Close,
  ViewModule, ArrowDropDown, UploadFile, AddBox, BarChart, Delete,
} from '@mui/icons-material'
import { EstibasInventario } from './EstibasInventario'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estibasApi } from '@/api/estibas'
import { apiClient } from '@/api/client'
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
const PRIMARY = '#32AC5C'

const MATERIALES: Record<string, string[]> = {
  MADERA:   ['MADERA_PINO', 'MADERA_EUCALIPTO'],
  PLASTICO: ['PLASTICO_HDPE'],
  METAL:    ['ACERO', 'ALUMINIO'],
  CARTON:   ['CARTON_CORRUGADO'],
  MIXTA:    ['MADERA_PINO', 'MADERA_EUCALIPTO', 'PLASTICO_HDPE', 'ACERO', 'ALUMINIO', 'CARTON_CORRUGADO'],
}

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  codigo_interno: '',
  tipo: 'MADERA',
  material: 'MADERA_PINO',
  tipo_propietario: 'PROPIA',
  fecha_ingreso: TODAY,
  largo_cm: 120,
  ancho_cm: 100,
  alto_cm: 15,
  peso_kg: 25,
  capacidad_carga_kg: 1000,
  valor_compra: '',
  observaciones: '',
  ubicacion_inicial_id: '' as string | number,
}

const EMPTY_MASIVO = {
  tipo: 'MADERA',
  material: 'MADERA_PINO',
  tipo_propietario: 'PROPIA',
  fecha_ingreso: TODAY,
  largo_cm: 120,
  ancho_cm: 100,
  alto_cm: 15,
  peso_kg: 25,
  capacidad_carga_kg: 1000,
  valor_compra: '' as string | number,
  ubicacion_inicial_id: '' as string | number,
}

// Genera lista de códigos entre código inicial y final
// Ej: "EST-001" a "EST-050" → ["EST-001", ..., "EST-050"]
function generateCodes(start: string, end: string): string[] | null {
  const matchStart = start.trim().match(/^(.*?)(\d+)$/)
  const matchEnd   = end.trim().match(/^(.*?)(\d+)$/)
  if (!matchStart || !matchEnd) return null

  const prefix   = matchStart[1]
  const startNum = parseInt(matchStart[2], 10)
  const endNum   = parseInt(matchEnd[2], 10)
  const padding  = matchStart[2].length

  if (endNum < startNum) return null
  if (endNum - startNum > 9999) return null  // límite de seguridad

  const codes: string[] = []
  for (let i = startNum; i <= endNum; i++) {
    codes.push(prefix + String(i).padStart(padding, '0'))
  }
  return codes
}

export default function Estibas() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Tab activa ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0)

  // ── Estado listado ────────────────────────────────────────────────────────
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [estado, setEstado] = useState('')
  const [propietario, setPropietario] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // ── Estado diálogos ───────────────────────────────────────────────────────
  const [openDialog, setOpenDialog] = useState(false)
  const [openMasivo, setOpenMasivo] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; codigo: string } | null>(null)
  const [qrTarget, setQrTarget] = useState<{ codigo: string; qr: string } | null>(null)

  // ── Estado formulario Nueva Estiba ────────────────────────────────────────
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')

  // ── Estado formulario Creación Masiva ─────────────────────────────────────
  const [codigoInicial, setCodigoInicial] = useState('')
  const [codigoFinal, setCodigoFinal] = useState('')
  const [masivoForm, setMasivoForm] = useState({ ...EMPTY_MASIVO })
  const [masivoError, setMasivoError] = useState('')
  const [masivoPreview, setMasivoPreview] = useState<string[]>([])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['estibas', page, pageSize, search, estado, propietario],
    queryFn: () => estibasApi.listar({
      page: page + 1, page_size: pageSize,
      ...(search && { search }),
      ...(estado && { estado }),
      ...(propietario && { tipo_propietario: propietario }),
    }),
  })

  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones-select'],
    queryFn: () => apiClient.get('/ubicaciones', { params: { page_size: 500 } }).then(r => r.data?.items ?? r.data ?? []),
    staleTime: 60000,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/estibas/${id}`),
    onSuccess: () => {
      toast.success('Estiba eliminada')
      queryClient.invalidateQueries({ queryKey: ['estibas'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Error al eliminar la estiba'
      toast.error(typeof msg === 'string' ? msg : 'Error al eliminar')
      setDeleteTarget(null)
    },
  })

  const masivaMutation = useMutation({
    mutationFn: (items: any[]) => apiClient.post('/estibas/bulk', { items }).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`${data.exitosos} de ${data.total} estibas creadas`)
      queryClient.invalidateQueries({ queryKey: ['estibas'] })
      if (data.errores?.length > 0) {
        toast.error(`${data.errores.length} errores — revisa los códigos duplicados`)
      }
      setOpenMasivo(false)
      resetMasivo()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Error en la creación masiva'
      setMasivoError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleSearch = () => setSearch(searchInput)

  const handleTipoChange = (tipo: string) => {
    const mats = MATERIALES[tipo] ?? []
    setForm(f => ({ ...f, tipo, material: mats[0] ?? '' }))
  }

  const resetMasivo = () => {
    setCodigoInicial('')
    setCodigoFinal('')
    setMasivoForm({ ...EMPTY_MASIVO })
    setMasivoError('')
    setMasivoPreview([])
  }

  const handlePreviewMasivo = () => {
    setMasivoError('')
    if (!codigoInicial.trim() || !codigoFinal.trim()) {
      setMasivoError('Ingresa el código inicial y el código final'); return
    }
    if (!masivoForm.ubicacion_inicial_id) {
      setMasivoError('La bodega es obligatoria'); return
    }
    const codes = generateCodes(codigoInicial, codigoFinal)
    if (!codes) {
      setMasivoError('Los códigos deben terminar en número. Ej: EST-001 a EST-050'); return
    }
    if (codes.length === 0) {
      setMasivoError('El código final debe ser mayor que el código inicial'); return
    }
    setMasivoPreview(codes)
  }

  const handleSubmitMasivo = () => {
    if (masivoPreview.length === 0) { handlePreviewMasivo(); return }
    const items = masivoPreview.map(codigo => ({
      codigo_interno:      codigo,
      tipo:                masivoForm.tipo,
      material:            masivoForm.material,
      tipo_propietario:    masivoForm.tipo_propietario,
      fecha_ingreso:       masivoForm.fecha_ingreso,
      largo_cm:            Number(masivoForm.largo_cm),
      ancho_cm:            Number(masivoForm.ancho_cm),
      alto_cm:             Number(masivoForm.alto_cm),
      peso_kg:             Number(masivoForm.peso_kg),
      capacidad_carga_kg:  Number(masivoForm.capacidad_carga_kg),
      valor_compra:        masivoForm.valor_compra !== '' ? Number(masivoForm.valor_compra) : null,
      ubicacion_inicial_id: Number(masivoForm.ubicacion_inicial_id),
    }))
    masivaMutation.mutate(items)
  }

  const handleSubmit = () => {
    if (!form.codigo_interno.trim()) { setFormError('El código interno es obligatorio'); return }
    if (!form.fecha_ingreso) { setFormError('La fecha de ingreso es obligatoria'); return }
    if (!form.ubicacion_inicial_id) { setFormError('La bodega es obligatoria'); return }
    setFormError('')
    createMutation.mutate({
      ...form,
      largo_cm:            Number(form.largo_cm),
      ancho_cm:            Number(form.ancho_cm),
      alto_cm:             Number(form.alto_cm),
      peso_kg:             Number(form.peso_kg),
      capacidad_carga_kg:  Number(form.capacidad_carga_kg),
      valor_compra:        form.valor_compra !== '' ? Number(form.valor_compra) : null,
      observaciones:       form.observaciones || null,
      ubicacion_inicial_id: Number(form.ubicacion_inicial_id),
    })
  }

  const handleClose = () => {
    if (createMutation.isPending) return
    setOpenDialog(false)
    setForm({ ...EMPTY_FORM })
    setFormError('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout title="Estibas">

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_: React.SyntheticEvent, v: number) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            icon={<ViewModule sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Gestión de Estibas"
            sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            icon={<BarChart sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Inventario / Movimientos"
            sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {activeTab === 1 && <EstibasInventario />}

      {activeTab === 0 && <>

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
        <ButtonGroup variant="contained" disableElevation>
          <Button startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            Nueva Estiba
          </Button>
          <Button
            size="small" sx={{ px: 0.75 }}
            onClick={e => setMenuAnchor(e.currentTarget)}
            aria-haspopup="true"
          >
            <ArrowDropDown />
          </Button>
        </ButtonGroup>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ elevation: 3, sx: { mt: 0.5, minWidth: 220, borderRadius: '10px' } }}
        >
          <MenuItem
            onClick={() => { setMenuAnchor(null); navigate('/estibas/cargue-masivo') }}
            sx={{ py: 1.25, px: 2 }}
          >
            <UploadFile sx={{ fontSize: 18, mr: 1.5, color: PRIMARY }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>
                Cargue Masivo
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                Importar desde Excel (.xlsx)
              </Typography>
            </Box>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => { setMenuAnchor(null); setOpenMasivo(true) }}
            sx={{ py: 1.25, px: 2 }}
          >
            <AddBox sx={{ fontSize: 18, mr: 1.5, color: '#1A3A6B' }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>
                Creación Masiva
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                Rango de códigos consecutivos
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
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
                        onClick={() => navigate(`/estibas/${estiba.id}`)}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                            {estiba.codigo_interno}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2">{estiba.tipo}</Typography></TableCell>
                        <TableCell><StatusChip status={estiba.estado} /></TableCell>
                        <TableCell>
                          <Chip label={estiba.tipo_propietario} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {estiba.ubicacion_actual?.nombre ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2">{estiba.total_usos}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {format(new Date(estiba.fecha_ingreso), 'dd/MM/yyyy', { locale: es })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" onClick={e => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.25 }}>
                            <Tooltip title="Ver detalle">
                              <IconButton size="small" onClick={() => navigate(`/estibas/${estiba.id}`)}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ver QR">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!estiba.codigo_qr}
                                  onClick={() => estiba.codigo_qr && setQrTarget({ codigo: estiba.codigo_interno, qr: estiba.codigo_qr })}
                                >
                                  <QrCode2 fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Eliminar estiba">
                              <IconButton
                                size="small"
                                onClick={() => setDeleteTarget({ id: estiba.id, codigo: estiba.codigo_interno })}
                                sx={{ color: '#EF4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
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

      {/* ── Diálogo: Nueva Estiba ─────────────────────────────────────────── */}
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
              <FormControl fullWidth size="small" required>
                <InputLabel>Bodega *</InputLabel>
                <Select
                  value={form.ubicacion_inicial_id}
                  label="Bodega *"
                  onChange={e => setForm(f => ({ ...f, ubicacion_inicial_id: e.target.value }))}
                >
                  <MenuItem value=""><em>Selecciona una bodega</em></MenuItem>
                  {ubicaciones.map((u: any) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.nombre} {u.codigo ? `(${u.codigo})` : ''}
                    </MenuItem>
                  ))}
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
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Guardando...' : 'Crear Estiba'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Creación Masiva ──────────────────────────────────────── */}
      <Dialog open={openMasivo} onClose={() => { if (!masivaMutation.isPending) { setOpenMasivo(false); resetMasivo() } }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Creación Masiva de Estibas
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 400, mt: 0.25 }}>
            Define el rango de códigos y la bodega de ingreso
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>

            {/* Rango de códigos */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rango de códigos
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Código inicial *"
                fullWidth size="small"
                value={codigoInicial}
                onChange={e => { setCodigoInicial(e.target.value.toUpperCase()); setMasivoPreview([]) }}
                placeholder="Ej: EST-001"
                inputProps={{ maxLength: 80 }}
                helperText="Primera estiba del rango"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Código final *"
                fullWidth size="small"
                value={codigoFinal}
                onChange={e => { setCodigoFinal(e.target.value.toUpperCase()); setMasivoPreview([]) }}
                placeholder="Ej: EST-100"
                inputProps={{ maxLength: 80 }}
                helperText="Última estiba del rango"
              />
            </Grid>

            {/* Vista previa del rango */}
            {masivoPreview.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{
                  bgcolor: alpha(PRIMARY, 0.06), border: `1px solid ${alpha(PRIMARY, 0.25)}`,
                  borderRadius: 1.5, px: 2, py: 1.25,
                }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 0.5 }}>
                    {masivoPreview.length} estibas a crear
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#475569', fontFamily: 'monospace' }}>
                    {masivoPreview[0]} … {masivoPreview[masivoPreview.length - 1]}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Divider sx={{ width: '100%', mx: 2, mt: 1 }} />

            {/* Configuración de la bodega */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bodega y configuración
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Bodega de ingreso *</InputLabel>
                <Select
                  value={masivoForm.ubicacion_inicial_id}
                  label="Bodega de ingreso *"
                  onChange={e => setMasivoForm(f => ({ ...f, ubicacion_inicial_id: e.target.value }))}
                >
                  <MenuItem value=""><em>Selecciona una bodega</em></MenuItem>
                  {ubicaciones.map((u: any) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.nombre} {u.codigo ? `(${u.codigo})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={masivoForm.tipo} label="Tipo"
                  onChange={e => {
                    const tipo = e.target.value
                    const mat = MATERIALES[tipo]?.[0] ?? ''
                    setMasivoForm(f => ({ ...f, tipo, material: mat }))
                  }}
                >
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Material</InputLabel>
                <Select value={masivoForm.material} label="Material" onChange={e => setMasivoForm(f => ({ ...f, material: e.target.value }))}>
                  {(MATERIALES[masivoForm.tipo] ?? []).map(m => (
                    <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Propietario</InputLabel>
                <Select value={masivoForm.tipo_propietario} label="Propietario" onChange={e => setMasivoForm(f => ({ ...f, tipo_propietario: e.target.value }))}>
                  {PROPIETARIOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha de Ingreso *"
                type="date" fullWidth size="small"
                value={masivoForm.fecha_ingreso}
                onChange={e => setMasivoForm(f => ({ ...f, fecha_ingreso: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <TextField label="Largo (cm)" type="number" fullWidth size="small"
                value={masivoForm.largo_cm} onChange={e => setMasivoForm(f => ({ ...f, largo_cm: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Ancho (cm)" type="number" fullWidth size="small"
                value={masivoForm.ancho_cm} onChange={e => setMasivoForm(f => ({ ...f, ancho_cm: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Alto (cm)" type="number" fullWidth size="small"
                value={masivoForm.alto_cm} onChange={e => setMasivoForm(f => ({ ...f, alto_cm: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Peso (kg)" type="number" fullWidth size="small"
                value={masivoForm.peso_kg} onChange={e => setMasivoForm(f => ({ ...f, peso_kg: Number(e.target.value) }))} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Capacidad carga (kg)" type="number" fullWidth size="small"
                value={masivoForm.capacidad_carga_kg} onChange={e => setMasivoForm(f => ({ ...f, capacidad_carga_kg: Number(e.target.value) }))} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Valor de compra (COP)" type="number" fullWidth size="small"
                value={masivoForm.valor_compra}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMasivoForm((f: typeof EMPTY_MASIVO) => ({ ...f, valor_compra: e.target.value }))}
                placeholder="Opcional"
                InputProps={{ inputProps: { min: 0 } }} />
            </Grid>

            {masivoError && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ py: 0.5 }}>{masivoError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => { setOpenMasivo(false); resetMasivo() }} disabled={masivaMutation.isPending}>
            Cancelar
          </Button>
          {masivoPreview.length === 0 ? (
            <Button variant="outlined" onClick={handlePreviewMasivo} disabled={masivaMutation.isPending}>
              Previsualizar rango
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmitMasivo}
              disabled={masivaMutation.isPending}
              sx={{ bgcolor: '#1A3A6B', '&:hover': { bgcolor: '#152D54' } }}
            >
              {masivaMutation.isPending
                ? 'Creando...'
                : `Crear ${masivoPreview.length} estibas`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Confirmar eliminación ───────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#EF4444' }}>
          Eliminar estiba
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro que deseas eliminar la estiba{' '}
            <strong>{deleteTarget?.codigo}</strong>?
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 13, color: '#64748B' }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Ver QR ──────────────────────────────────────────────── */}
      <Dialog open={Boolean(qrTarget)} onClose={() => setQrTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Código QR
          <IconButton size="small" onClick={() => setQrTarget(null)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: '8px !important', pb: 1 }}>
          {qrTarget?.qr ? (
            <>
              <Box
                component="img"
                src={qrTarget.qr}
                alt={`QR ${qrTarget.codigo}`}
                sx={{ width: 220, height: 220, display: 'block' }}
              />
              <Typography sx={{ mt: 1.5, fontSize: 13, color: '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>
                {qrTarget.codigo}
              </Typography>
            </>
          ) : (
            <Typography sx={{ color: '#94A3B8', my: 3 }}>Sin QR generado</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
          {qrTarget?.qr && (
            <Button
              component="a"
              href={qrTarget.qr}
              download={`QR-${qrTarget.codigo}.png`}
              variant="outlined"
              size="small"
              startIcon={<QrCode2 />}
            >
              Descargar
            </Button>
          )}
          <Button onClick={() => setQrTarget(null)} size="small">Cerrar</Button>
        </DialogActions>
      </Dialog>

      </>}

    </Layout>
  )
}
