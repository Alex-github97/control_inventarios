import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tab,
  Tabs,
  alpha,
  Divider,
  InputAdornment,
  Avatar,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Collapse,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add,
  Search,
  DriveEta,
  ExpandMore,
  ExpandLess,
  Warning,
  ErrorOutline,
  CheckCircleOutline,
} from '@mui/icons-material'
import Autocomplete from '@mui/material/Autocomplete'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import toast from 'react-hot-toast'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const GH_COLOR = '#BE185D'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Colaborador {
  id: number
  nombre: string
  documento: string
  cargo?: string
}

interface Conductor {
  id: number
  colaborador_id: number
  nombre: string
  documento: string
  num_licencia: string
  tipo_licencia: string
  fecha_expedicion: string
  fecha_vencimiento_licencia: string
  anos_experiencia: number
  restricciones: string
  vehiculos_autorizados: string[]
  coberturas: string[]
  activo: boolean
  total_accidentes?: number
}

interface DocumentoConductor {
  id: number
  tipo: string
  numero: string
  fecha_emision: string
  fecha_vencimiento: string
  notas: string
}

interface AccidenteConductor {
  id: number
  fecha: string
  tipo: string
  descripcion: string
  consecuencias: string
  dias_incapacidad: number
}

interface AlertaVencimiento {
  conductor_id: number
  nombre: string
  num_licencia: string
  tipo_licencia: string
  fecha_vencimiento_licencia: string
  dias_restantes: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_LICENCIA = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

const VEHICULOS_OPTIONS = [
  'MOTOCICLETA',
  'AUTOMOVIL',
  'CAMIONETA',
  'CAMION_RIGIDO',
  'TRACTOCAMION',
  'DOBLE_TROQUE',
  'ARTICULADO',
  'MONTACARGAS',
  'REACH_STACKER',
  'EQUIPO_ESPECIAL',
]

const COBERTURAS_OPTIONS = [
  'URBANA',
  'METROPOLITANA',
  'REGIONAL',
  'NACIONAL',
  'INTERNACIONAL',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiasRestantes(fecha: string): number {
  try {
    return differenceInDays(parseISO(fecha), new Date())
  } catch {
    return 9999
  }
}

function getLicenciaChipProps(fecha: string): { label: string; bgcolor: string; color: string } {
  const dias = getDiasRestantes(fecha)
  if (dias < 0) return { label: 'Vencida', bgcolor: '#FEE2E2', color: '#991B1B' }
  if (dias < 7) return { label: `${dias}d`, bgcolor: '#FED7AA', color: '#9A3412' }
  if (dias < 30) return { label: `${dias}d`, bgcolor: '#FEF08A', color: '#854D0E' }
  return { label: format(parseISO(fecha), 'dd/MM/yy'), bgcolor: '#DCFCE7', color: '#166534' }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function fmtDate(d: string): string {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd MMM yyyy', { locale: es }) } catch { return d }
}

// ─── Conductores Tab ─────────────────────────────────────────────────────────

function ConductoresTab() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [activoFilter, setActivoFilter] = useState('TODOS')
  const [licenciaFilter, setLicenciaFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [openDialog, setOpenDialog] = useState(false)
  const [formError, setFormError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Collaborator search for Autocomplete
  const [colabSearch, setColabSearch] = useState('')

  // Form state
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null)
  const [form, setForm] = useState({
    num_licencia: '',
    tipo_licencia: 'B1',
    fecha_expedicion: '',
    fecha_vencimiento_licencia: '',
    anos_experiencia: 0,
    restricciones: '',
  })
  const [vehiculos, setVehiculos] = useState<string[]>([])
  const [coberturas, setCoberturas] = useState<string[]>([])

  // Sub-form for documents
  const [docForm, setDocForm] = useState({ tipo: '', numero: '', fecha_emision: '', fecha_vencimiento: '', notas: '' })
  // Sub-form for accidents
  const [accForm, setAccForm] = useState({ fecha: '', tipo: '', descripcion: '', consecuencias: '', dias_incapacidad: 0 })

  // Queries
  const { data: conductores = [], isLoading } = useQuery<Conductor[]>({
    queryKey: ['gh-conductores'],
    queryFn: () => api.get('/hcm/conductores').then((r) => r.data),
  })

  const { data: colaboradores = [] } = useQuery<Colaborador[]>({
    queryKey: ['gh-colaboradores-activos', colabSearch],
    queryFn: () =>
      api.get('/hcm/colaboradores', { params: { estado_laboral: 'ACTIVO', search: colabSearch } }).then((r) => r.data),
    enabled: colabSearch.length >= 2,
  })

  const { data: documentosConductor = [], refetch: refetchDocs } = useQuery<DocumentoConductor[]>({
    queryKey: ['gh-conductor-docs', expandedId],
    queryFn: () => api.get(`/hcm/conductores/${expandedId}/documentos`).then((r) => r.data),
    enabled: expandedId !== null,
  })

  const { data: accidentesConductor = [], refetch: refetchAcc } = useQuery<AccidenteConductor[]>({
    queryKey: ['gh-conductor-accidentes', expandedId],
    queryFn: () => api.get(`/hcm/conductores/${expandedId}/accidentes`).then((r) => r.data),
    enabled: expandedId !== null,
  })

  // Stats
  const total = conductores.length
  const activos = conductores.filter((c) => c.activo).length
  const porVencer = conductores.filter((c) => {
    const d = getDiasRestantes(c.fecha_vencimiento_licencia)
    return d >= 0 && d < 30
  }).length
  const conAccidentes = conductores.filter((c) => (c.total_accidentes ?? 0) > 0).length

  // Mutations
  const createConductor = useMutation({
    mutationFn: (data: any) => api.post('/hcm/conductores', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Conductor registrado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['gh-conductores'] })
      handleClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Error al registrar el conductor'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const addDocumento = useMutation({
    mutationFn: (data: any) => api.post(`/hcm/conductores/${expandedId}/documentos`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Documento agregado')
      refetchDocs()
      setDocForm({ tipo: '', numero: '', fecha_emision: '', fecha_vencimiento: '', notas: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Error al agregar documento'),
  })

  const addAccidente = useMutation({
    mutationFn: (data: any) => api.post(`/hcm/conductores/${expandedId}/accidentes`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Accidente registrado')
      refetchAcc()
      setAccForm({ fecha: '', tipo: '', descripcion: '', consecuencias: '', dias_incapacidad: 0 })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Error al registrar accidente'),
  })

  // Filtering
  const filtered = conductores.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      c.nombre?.toLowerCase().includes(q) ||
      c.num_licencia?.toLowerCase().includes(q) ||
      c.documento?.toLowerCase().includes(q)
    const matchActivo =
      activoFilter === 'TODOS' ||
      (activoFilter === 'ACTIVO' && c.activo) ||
      (activoFilter === 'INACTIVO' && !c.activo)
    const matchLic = !licenciaFilter || c.tipo_licencia === licenciaFilter
    return matchSearch && matchActivo && matchLic
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  function handleClose() {
    if (createConductor.isPending) return
    setOpenDialog(false)
    setSelectedColab(null)
    setColabSearch('')
    setForm({ num_licencia: '', tipo_licencia: 'B1', fecha_expedicion: '', fecha_vencimiento_licencia: '', anos_experiencia: 0, restricciones: '' })
    setVehiculos([])
    setCoberturas([])
    setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!selectedColab) { setFormError('Seleccione un colaborador'); return }
    if (!form.num_licencia || !form.fecha_vencimiento_licencia) {
      setFormError('Número de licencia y fecha de vencimiento son obligatorios')
      return
    }
    createConductor.mutate({
      colaborador_id: selectedColab.id,
      ...form,
      anos_experiencia: Number(form.anos_experiencia),
      vehiculos_autorizados: vehiculos,
      coberturas,
    })
  }

  function toggleVehiculo(v: string) {
    setVehiculos((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }

  function toggleCobertura(c: string) {
    setCoberturas((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <Box>
      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Conductores', value: total, color: GH_COLOR },
          { label: 'Activos', value: activos, color: '#16A34A' },
          { label: 'Licencias por vencer <30d', value: porVencer, color: '#EA580C' },
          { label: 'Con accidentes registrados', value: conAccidentes, color: '#DC2626' },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2 }}>
              <Typography fontSize={12} color="text.secondary">{s.label}</Typography>
              <Typography fontSize={28} fontWeight={800} color={s.color}>{s.value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Toolbar */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar nombre o licencia…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={activoFilter} label="Estado" onChange={(e) => { setActivoFilter(e.target.value); setPage(0) }}>
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="ACTIVO">Activos</MenuItem>
            <MenuItem value="INACTIVO">Inactivos</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Tipo Licencia</InputLabel>
          <Select value={licenciaFilter} label="Tipo Licencia" onChange={(e) => { setLicenciaFilter(e.target.value); setPage(0) }}>
            <MenuItem value="">Todos</MenuItem>
            {TIPOS_LICENCIA.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: alpha(GH_COLOR, 0.85) } }}
        >
          Nuevo Conductor
        </Button>
      </Stack>

      {/* Table */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F9FAFB', '& th': { fontSize: 12, fontWeight: 700, color: 'text.secondary', py: 1.5 } }}>
                <TableCell />
                <TableCell>Nombre</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Num. Licencia</TableCell>
                <TableCell>Tipo Lic.</TableCell>
                <TableCell>Venc. Licencia</TableCell>
                <TableCell>Años Exp.</TableCell>
                <TableCell>Vehículos Autorizados</TableCell>
                <TableCell>Coberturas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1 }} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginated.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: 13 }}>
                      No se encontraron conductores
                    </TableCell>
                  </TableRow>
                )
                : paginated.map((c) => {
                  const licChip = getLicenciaChipProps(c.fecha_vencimiento_licencia)
                  const isOpen = expandedId === c.id
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow
                        hover
                        sx={{ '& td': { fontSize: 12, py: 1 }, cursor: 'pointer' }}
                        onClick={() => toggleExpand(c.id)}
                      >
                        <TableCell sx={{ width: 32 }}>
                          <IconButton size="small">
                            {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: alpha(GH_COLOR, 0.15), color: GH_COLOR }}>
                              {getInitials(c.nombre || '')}
                            </Avatar>
                            <Box>
                              <Typography fontSize={12} fontWeight={600}>{c.nombre}</Typography>
                              <Typography fontSize={11} color={c.activo ? 'success.main' : 'text.disabled'}>
                                {c.activo ? 'Activo' : 'Inactivo'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{c.documento || '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: GH_COLOR }}>{c.num_licencia}</TableCell>
                        <TableCell>
                          <Chip label={c.tipo_licencia} size="small" variant="outlined" sx={{ fontSize: 10, fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={licChip.label}
                            size="small"
                            sx={{ fontSize: 10, fontWeight: 700, bgcolor: licChip.bgcolor, color: licChip.color, border: 'none' }}
                          />
                        </TableCell>
                        <TableCell>{c.anos_experiencia ?? '—'}</TableCell>
                        <TableCell>
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {(c.vehiculos_autorizados ?? []).slice(0, 3).map((v) => (
                              <Chip key={v} label={v.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18 }} />
                            ))}
                            {(c.vehiculos_autorizados ?? []).length > 3 && (
                              <Chip label={`+${(c.vehiculos_autorizados ?? []).length - 3}`} size="small" sx={{ fontSize: 9, height: 18 }} />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {(c.coberturas ?? []).map((v) => (
                              <Chip key={v} label={v} size="small" sx={{ fontSize: 9, height: 18 }} />
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Expandable row */}
                      <TableRow>
                        <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isOpen} unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                              <Grid container spacing={3}>
                                {/* Documentos */}
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography fontSize={13} fontWeight={700} mb={1}>
                                    Documentos
                                  </Typography>
                                  {documentosConductor.length === 0 ? (
                                    <Typography fontSize={12} color="text.secondary" mb={1}>Sin documentos registrados.</Typography>
                                  ) : (
                                    <Table size="small" sx={{ mb: 1 }}>
                                      <TableHead>
                                        <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary' } }}>
                                          <TableCell>Tipo</TableCell>
                                          <TableCell>Número</TableCell>
                                          <TableCell>Emisión</TableCell>
                                          <TableCell>Venc.</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {documentosConductor.map((d) => (
                                          <TableRow key={d.id}>
                                            <TableCell sx={{ fontSize: 11 }}>{d.tipo}</TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>{d.numero}</TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>{fmtDate(d.fecha_emision)}</TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>{fmtDate(d.fecha_vencimiento)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                  <Typography fontSize={12} fontWeight={600} mb={1}>Agregar documento</Typography>
                                  <Stack spacing={1}>
                                    <Stack direction="row" spacing={1}>
                                      <TextField label="Tipo" size="small" sx={{ flex: 1 }} value={docForm.tipo} onChange={(e) => setDocForm((f) => ({ ...f, tipo: e.target.value }))} />
                                      <TextField label="Número" size="small" sx={{ flex: 1 }} value={docForm.numero} onChange={(e) => setDocForm((f) => ({ ...f, numero: e.target.value }))} />
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                      <TextField label="Fecha emisión" type="date" size="small" sx={{ flex: 1 }} value={docForm.fecha_emision} onChange={(e) => setDocForm((f) => ({ ...f, fecha_emision: e.target.value }))} InputLabelProps={{ shrink: true }} />
                                      <TextField label="Fecha venc." type="date" size="small" sx={{ flex: 1 }} value={docForm.fecha_vencimiento} onChange={(e) => setDocForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))} InputLabelProps={{ shrink: true }} />
                                    </Stack>
                                    <TextField label="Notas" size="small" fullWidth value={docForm.notas} onChange={(e) => setDocForm((f) => ({ ...f, notas: e.target.value }))} />
                                    <Box>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: alpha(GH_COLOR, 0.85) } }}
                                        disabled={addDocumento.isPending}
                                        onClick={() => addDocumento.mutate(docForm)}
                                      >
                                        {addDocumento.isPending ? 'Guardando...' : 'Agregar'}
                                      </Button>
                                    </Box>
                                  </Stack>
                                </Grid>

                                {/* Accidentes */}
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography fontSize={13} fontWeight={700} mb={1}>
                                    Accidentes
                                  </Typography>
                                  {accidentesConductor.length === 0 ? (
                                    <Typography fontSize={12} color="text.secondary" mb={1}>Sin accidentes registrados.</Typography>
                                  ) : (
                                    <Table size="small" sx={{ mb: 1 }}>
                                      <TableHead>
                                        <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary' } }}>
                                          <TableCell>Fecha</TableCell>
                                          <TableCell>Tipo</TableCell>
                                          <TableCell>Días Incap.</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {accidentesConductor.map((a) => (
                                          <TableRow key={a.id}>
                                            <TableCell sx={{ fontSize: 11 }}>{fmtDate(a.fecha)}</TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>{a.tipo}</TableCell>
                                            <TableCell sx={{ fontSize: 11 }}>{a.dias_incapacidad}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                  <Typography fontSize={12} fontWeight={600} mb={1}>Registrar accidente</Typography>
                                  <Stack spacing={1}>
                                    <Stack direction="row" spacing={1}>
                                      <TextField label="Fecha" type="date" size="small" sx={{ flex: 1 }} value={accForm.fecha} onChange={(e) => setAccForm((f) => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
                                      <TextField label="Tipo" size="small" sx={{ flex: 1 }} value={accForm.tipo} onChange={(e) => setAccForm((f) => ({ ...f, tipo: e.target.value }))} />
                                    </Stack>
                                    <TextField label="Descripción" size="small" fullWidth value={accForm.descripcion} onChange={(e) => setAccForm((f) => ({ ...f, descripcion: e.target.value }))} />
                                    <TextField label="Consecuencias" size="small" fullWidth value={accForm.consecuencias} onChange={(e) => setAccForm((f) => ({ ...f, consecuencias: e.target.value }))} />
                                    <TextField label="Días incapacidad" type="number" size="small" fullWidth value={accForm.dias_incapacidad} onChange={(e) => setAccForm((f) => ({ ...f, dias_incapacidad: Number(e.target.value) }))} inputProps={{ min: 0 }} />
                                    <Box>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="error"
                                        disabled={addAccidente.isPending}
                                        onClick={() => addAccidente.mutate(accForm)}
                                      >
                                        {addAccidente.isPending ? 'Guardando...' : 'Registrar'}
                                      </Button>
                                    </Box>
                                  </Stack>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })
              }
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ fontSize: 12 }}
        />
      </Card>

      {/* ── Create Conductor Dialog ─────────────────────────────────────── */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Conductor</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>

            {/* Step 1: Select collaborator */}
            <Grid size={{ xs: 12 }}>
              <Typography fontSize={13} fontWeight={700} mb={1}>1. Seleccionar colaborador activo</Typography>
              <Autocomplete
                options={colaboradores}
                getOptionLabel={(o) => `${o.nombre} — ${o.documento}`}
                value={selectedColab}
                onChange={(_, v) => setSelectedColab(v)}
                inputValue={colabSearch}
                onInputChange={(_, v) => setColabSearch(v)}
                filterOptions={(x) => x}
                renderInput={(params) => (
                  <TextField {...params} label="Buscar colaborador (mín. 2 caracteres)" size="small" fullWidth />
                )}
                noOptionsText="Sin resultados"
                loadingText="Buscando..."
              />
            </Grid>

            <Grid size={{ xs: 12 }}><Divider /></Grid>

            {/* Step 2: License data */}
            <Grid size={{ xs: 12 }}>
              <Typography fontSize={13} fontWeight={700} mb={0.5}>2. Datos de licencia</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Num. Licencia *"
                fullWidth size="small"
                value={form.num_licencia}
                onChange={(e) => setForm((f) => ({ ...f, num_licencia: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo Licencia</InputLabel>
                <Select value={form.tipo_licencia} label="Tipo Licencia" onChange={(e) => setForm((f) => ({ ...f, tipo_licencia: e.target.value }))}>
                  {TIPOS_LICENCIA.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Fecha Expedición" type="date" fullWidth size="small" value={form.fecha_expedicion} onChange={(e) => setForm((f) => ({ ...f, fecha_expedicion: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Fecha Vencimiento *" type="date" fullWidth size="small" value={form.fecha_vencimiento_licencia} onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento_licencia: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Años Experiencia" type="number" fullWidth size="small" value={form.anos_experiencia} onChange={(e) => setForm((f) => ({ ...f, anos_experiencia: Number(e.target.value) }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Restricciones" fullWidth size="small" value={form.restricciones} onChange={(e) => setForm((f) => ({ ...f, restricciones: e.target.value }))} />
            </Grid>

            <Grid size={{ xs: 12 }}><Divider /></Grid>

            {/* Step 3: Vehicles */}
            <Grid size={{ xs: 12 }}>
              <Typography fontSize={13} fontWeight={700} mb={1}>3. Vehículos autorizados</Typography>
              <FormGroup row>
                {VEHICULOS_OPTIONS.map((v) => (
                  <FormControlLabel
                    key={v}
                    control={<Checkbox size="small" checked={vehiculos.includes(v)} onChange={() => toggleVehiculo(v)} sx={{ '&.Mui-checked': { color: GH_COLOR } }} />}
                    label={<Typography fontSize={12}>{v.replace(/_/g, ' ')}</Typography>}
                    sx={{ mr: 2, mb: 0.5 }}
                  />
                ))}
              </FormGroup>
            </Grid>

            <Grid size={{ xs: 12 }}><Divider /></Grid>

            {/* Step 4: Coverages */}
            <Grid size={{ xs: 12 }}>
              <Typography fontSize={13} fontWeight={700} mb={1}>4. Coberturas operativas</Typography>
              <FormGroup row>
                {COBERTURAS_OPTIONS.map((c) => (
                  <FormControlLabel
                    key={c}
                    control={<Checkbox size="small" checked={coberturas.includes(c)} onChange={() => toggleCobertura(c)} sx={{ '&.Mui-checked': { color: GH_COLOR } }} />}
                    label={<Typography fontSize={12}>{c}</Typography>}
                    sx={{ mr: 2, mb: 0.5 }}
                  />
                ))}
              </FormGroup>
            </Grid>

            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error" sx={{ py: 0.5 }}>{formError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={createConductor.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createConductor.isPending}
            sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: alpha(GH_COLOR, 0.85) } }}
          >
            {createConductor.isPending ? 'Guardando...' : 'Registrar Conductor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Alertas Tab ──────────────────────────────────────────────────────────────

function AlertasTab() {
  const { data: alertas = [], isLoading } = useQuery<AlertaVencimiento[]>({
    queryKey: ['gh-conductores-alertas'],
    queryFn: () => api.get('/hcm/conductores/alertas-vencimiento').then((r) => r.data),
  })

  function getCardColors(dias: number): { border: string; bg: string; textColor: string; icon: React.ReactNode } {
    if (dias < 0)
      return { border: '#DC2626', bg: '#FEF2F2', textColor: '#991B1B', icon: <ErrorOutline sx={{ color: '#DC2626', fontSize: 20 }} /> }
    if (dias < 7)
      return { border: '#EA580C', bg: '#FFF7ED', textColor: '#9A3412', icon: <Warning sx={{ color: '#EA580C', fontSize: 20 }} /> }
    if (dias < 30)
      return { border: '#D97706', bg: '#FFFBEB', textColor: '#854D0E', icon: <Warning sx={{ color: '#D97706', fontSize: 20 }} /> }
    return { border: '#16A34A', bg: '#F0FDF4', textColor: '#166534', icon: <CheckCircleOutline sx={{ color: '#16A34A', fontSize: 20 }} /> }
  }

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2, height: 120 }}>
              <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1, mb: 1 }} />
              <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1, width: '60%' }} />
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  if (alertas.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <CheckCircleOutline sx={{ fontSize: 48, color: '#16A34A', mb: 1 }} />
        <Typography>No hay alertas de vencimiento</Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={2}>
      {alertas.map((a) => {
        const colors = getCardColors(a.dias_restantes)
        return (
          <Grid key={a.conductor_id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              elevation={0}
              sx={{
                border: `1.5px solid ${colors.border}`,
                borderRadius: '14px',
                bgcolor: colors.bg,
                p: 2,
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                {colors.icon}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontSize={13} fontWeight={700} color={colors.textColor}>{a.nombre}</Typography>
                  <Typography fontSize={11} color="text.secondary">{a.num_licencia} — Cat. {a.tipo_licencia}</Typography>
                  <Typography fontSize={11} color="text.secondary" mt={0.5}>
                    Vence: {fmtDate(a.fecha_vencimiento_licencia)}
                  </Typography>
                  <Typography fontSize={12} fontWeight={700} color={colors.textColor} mt={0.5}>
                    {a.dias_restantes < 0
                      ? `Vencida hace ${Math.abs(a.dias_restantes)} días`
                      : `${a.dias_restantes} días restantes`}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GHConductores() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="GH — Conductores Internos">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: alpha(GH_COLOR, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DriveEta sx={{ color: GH_COLOR, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontSize={22} fontWeight={800} color="text.primary">
              Conductores Internos
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              Gestión de licencias, habilitaciones y siniestralidad
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
          <Box sx={{ borderBottom: '1px solid #E5E7EB' }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                px: 2,
                '& .MuiTab-root': { fontSize: 13, fontWeight: 600, textTransform: 'none', minHeight: 48 },
                '& .Mui-selected': { color: GH_COLOR },
                '& .MuiTabs-indicator': { bgcolor: GH_COLOR },
              }}
            >
              <Tab icon={<DriveEta sx={{ fontSize: 18 }} />} iconPosition="start" label="Conductores" />
              <Tab icon={<Warning sx={{ fontSize: 18 }} />} iconPosition="start" label="Alertas de Vencimiento" />
            </Tabs>
          </Box>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {tab === 0 && <ConductoresTab />}
            {tab === 1 && <AlertasTab />}
          </CardContent>
        </Card>

      </Box>
    </Layout>
  )
}
