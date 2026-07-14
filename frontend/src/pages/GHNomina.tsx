import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  CircularProgress,
  alpha,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import PaymentsIcon from '@mui/icons-material/Payments'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LockIcon from '@mui/icons-material/Lock'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import DeleteIcon from '@mui/icons-material/Delete'
import PrintIcon from '@mui/icons-material/Print'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

// ─── Constants ────────────────────────────────────────────────────────────────

const GH_COLOR = '#BE185D'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Empresa {
  id: number
  nombre: string
}

interface PeriodoNomina {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  num_empleados: number
  total_devengado: number
  total_deducido: number
  total_neto: number
  estado: 'BORRADOR' | 'EN_PROCESO' | 'CERRADA' | 'PAGADA'
  empresa_id: number
}

interface DetalleNomina {
  id: number
  colaborador_nombre: string
  cargo?: string
  salario_base: number
  aux_transporte: number
  otros_devengados?: number
  total_devengado: number
  salud: number
  pension: number
  fondo_solidaridad?: number
  retencion_fuente?: number
  total_deducido: number
  neto_pagar: number
}

interface ColaboradorOption {
  id: number
  nombre: string
  cargo?: string
}

interface Novedad {
  id: number
  colaborador_nombre: string
  periodo_nombre: string | null
  tipo_novedad: string
  descripcion: string | null
  valor: number
  fecha: string
  aprobado_por: string | null
}

interface Liquidacion {
  id: number
  colaborador_nombre: string
  fecha_liquidacion: string
  motivo_retiro: string
  dias_trabajados: number
  prima: number
  cesantias: number
  vacaciones_compensadas: number
  total_pagar: number
  estado: string
}

// ─── Empty form objects ───────────────────────────────────────────────────────

const EMPTY_PERIODO = {
  empresa_id: '',
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  notas: '',
}

const EMPTY_NOVEDAD = {
  colaborador_id: null as ColaboradorOption | null,
  periodo_id: '',
  tipo_novedad: '',
  descripcion: '',
  valor: '',
  fecha: '',
  aprobado_por: '',
  notas: '',
}

const EMPTY_LIQUIDACION = {
  colaborador_id: '',
  motivo_retiro: '',
  fecha_liquidacion: '',
  dias_trabajados: '',
  prima: '',
  cesantias: '',
  intereses_cesantias: '',
  vacaciones_compensadas: '',
  indemnizacion: '',
  otros_conceptos: '',
  deducciones: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('es-CO')
  } catch {
    return d
  }
}

const estadoChipColor = (estado: string): { bg: string; color: string } => {
  switch (estado) {
    case 'BORRADOR':
      return { bg: '#6B7280', color: '#fff' }
    case 'EN_PROCESO':
      return { bg: '#3B82F6', color: '#fff' }
    case 'CERRADA':
      return { bg: '#0D9488', color: '#fff' }
    case 'PAGADA':
      return { bg: '#16A34A', color: '#fff' }
    default:
      return { bg: '#9CA3AF', color: '#fff' }
  }
}

const TIPOS_NOVEDAD = [
  { value: 'HORA_EXTRA', label: 'Hora Extra' },
  { value: 'RECARGO_NOCTURNO', label: 'Recargo Nocturno' },
  { value: 'DOMINICAL', label: 'Dominical' },
  { value: 'FESTIVO', label: 'Festivo' },
  { value: 'BONIFICACION', label: 'Bonificación' },
  { value: 'COMISION', label: 'Comisión' },
  { value: 'VIATICO', label: 'Viático' },
  { value: 'DESCUENTO', label: 'Descuento' },
  { value: 'EMBARGO', label: 'Embargo' },
  { value: 'RETENCION', label: 'Retención' },
  { value: 'OTRO', label: 'Otro' },
]

const DEVENGADO_TIPOS = ['HORA_EXTRA', 'RECARGO_NOCTURNO', 'DOMINICAL', 'FESTIVO', 'BONIFICACION', 'COMISION', 'VIATICO']
const DEDUCCION_TIPOS = ['DESCUENTO', 'EMBARGO', 'RETENCION']

const novedadChipColor = (tipo: string): 'primary' | 'success' | 'error' | 'default' => {
  if (DEVENGADO_TIPOS.includes(tipo)) return 'primary'
  if (['BONIFICACION', 'COMISION', 'VIATICO'].includes(tipo)) return 'success'
  if (DEDUCCION_TIPOS.includes(tipo)) return 'error'
  return 'default'
}

// ─── Expandable Period Row ────────────────────────────────────────────────────

function PeriodoDetalleRow({ periodoId, open }: { periodoId: number; open: boolean }) {
  const detallesQuery = useQuery<DetalleNomina[]>({
    queryKey: ['gh-periodo-detalles', periodoId],
    queryFn: async () => {
      const res = await api.get(`/hcm/nomina/periodos/${periodoId}/detalles`)
      return res.data
    },
    enabled: open,
  })

  const detalles = detallesQuery.data ?? []

  const totales = detalles.reduce(
    (acc, d) => ({
      salario_base: acc.salario_base + d.salario_base,
      aux_transporte: acc.aux_transporte + d.aux_transporte,
      total_devengado: acc.total_devengado + d.total_devengado,
      salud: acc.salud + d.salud,
      pension: acc.pension + d.pension,
      total_deducido: acc.total_deducido + d.total_deducido,
      neto_pagar: acc.neto_pagar + d.neto_pagar,
    }),
    { salario_base: 0, aux_transporte: 0, total_devengado: 0, salud: 0, pension: 0, total_deducido: 0, neto_pagar: 0 }
  )

  return (
    <Box sx={{ bgcolor: alpha(GH_COLOR, 0.03), p: 2, borderTop: `1px solid ${alpha(GH_COLOR, 0.15)}` }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1} color={GH_COLOR}>
        Detalle por Empleado
      </Typography>
      {detallesQuery.isLoading ? (
        <Skeleton variant="rectangular" height={80} />
      ) : detalles.length === 0 ? (
        <Typography color="text.secondary" variant="body2">Sin detalles disponibles</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Colaborador', 'Salario Base', 'Aux. Transporte', 'Total Devengado', 'Salud', 'Pensión', 'Total Deducido', 'Neto a Pagar'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {detalles.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>{d.colaborador_nombre}</TableCell>
                  <TableCell>{formatCOP(d.salario_base)}</TableCell>
                  <TableCell>{formatCOP(d.aux_transporte)}</TableCell>
                  <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>{formatCOP(d.total_devengado)}</TableCell>
                  <TableCell>{formatCOP(d.salud)}</TableCell>
                  <TableCell>{formatCOP(d.pension)}</TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{formatCOP(d.total_deducido)}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{formatCOP(d.neto_pagar)}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.06) }}>
                <TableCell sx={{ fontWeight: 700 }}>TOTALES</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatCOP(totales.salario_base)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatCOP(totales.aux_transporte)}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>{formatCOP(totales.total_devengado)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatCOP(totales.salud)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatCOP(totales.pension)}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>{formatCOP(totales.total_deducido)}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'success.dark' }}>{formatCOP(totales.neto_pagar)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GHNomina() {
  const queryClient = useQueryClient()

  // ── Tab state
  const [tab, setTab] = useState(0)

  // ── Períodos state
  const [openPeriodoDialog, setOpenPeriodoDialog] = useState(false)
  const [periodoForm, setPeriodoForm] = useState({ ...EMPTY_PERIODO })
  const [periodoDialogError, setPeriodoDialogError] = useState('')
  const [expandedPeriodo, setExpandedPeriodo] = useState<number | null>(null)
  const [procesandoId, setProcesandoId] = useState<number | null>(null)
  const [cerrandoId, setCerrandoId] = useState<number | null>(null)

  // ── Novedades state
  const [openNovedadDialog, setOpenNovedadDialog] = useState(false)
  const [novedadForm, setNovedadForm] = useState({ ...EMPTY_NOVEDAD })
  const [novedadDialogError, setNovedadDialogError] = useState('')
  const [novedadFiltros, setNovedadFiltros] = useState({ colaborador: '', periodo_id: '', tipo_novedad: '' })
  const [colaboradorSearch, setColaboradorSearch] = useState('')

  // ── Liquidaciones state
  const [openLiqDialog, setOpenLiqDialog] = useState(false)
  const [liqForm, setLiqForm] = useState({ ...EMPTY_LIQUIDACION })
  const [liqDialogError, setLiqDialogError] = useState('')

  // ── Prenomina state
  const [preEmpresaId, setPreEmpresaId] = useState('')
  const [prePeriodoId, setPrePeriodoId] = useState('')
  const [preDetalles, setPreDetalles] = useState<DetalleNomina[] | null>(null)
  const [preLoading, setPreLoading] = useState(false)
  const [preError, setPreError] = useState('')

  // ── Queries ─────────────────────────────────────────────────────────────────

  const empresasQuery = useQuery<Empresa[]>({
    queryKey: ['gh-empresas'],
    queryFn: async () => {
      const res = await api.get('/hcm/empresas')
      return res.data
    },
  })

  const periodosQuery = useQuery<PeriodoNomina[]>({
    queryKey: ['gh-periodos'],
    queryFn: async () => {
      const res = await api.get('/hcm/nomina/periodos')
      return res.data
    },
  })

  const novedadesQuery = useQuery<Novedad[]>({
    queryKey: ['gh-novedades', novedadFiltros],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (novedadFiltros.colaborador) params.colaborador = novedadFiltros.colaborador
      if (novedadFiltros.periodo_id) params.periodo_id = novedadFiltros.periodo_id
      if (novedadFiltros.tipo_novedad) params.tipo_novedad = novedadFiltros.tipo_novedad
      const res = await api.get('/hcm/nomina/novedades', { params })
      return res.data
    },
  })

  const liquidacionesQuery = useQuery<Liquidacion[]>({
    queryKey: ['gh-liquidaciones'],
    queryFn: async () => {
      const res = await api.get('/hcm/liquidaciones')
      return res.data
    },
  })

  const colaboradoresQuery = useQuery<ColaboradorOption[]>({
    queryKey: ['gh-colaboradores-search', colaboradorSearch],
    queryFn: async () => {
      const res = await api.get('/hcm/colaboradores', {
        params: { search: colaboradorSearch, per_page: 20 },
      })
      return res.data
    },
    enabled: colaboradorSearch.length >= 2,
  })

  const todosColaboradoresQuery = useQuery<ColaboradorOption[]>({
    queryKey: ['gh-colaboradores-all'],
    queryFn: async () => {
      const res = await api.get('/hcm/colaboradores', { params: { per_page: 200 } })
      return res.data
    },
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const mutCrearPeriodo = useMutation({
    mutationFn: (data: typeof EMPTY_PERIODO) => api.post('/hcm/nomina/periodos', data),
    onSuccess: () => {
      toast.success('Período creado exitosamente')
      setOpenPeriodoDialog(false)
      setPeriodoForm({ ...EMPTY_PERIODO })
      setPeriodoDialogError('')
      queryClient.invalidateQueries({ queryKey: ['gh-periodos'] })
    },
    onError: (err: any) => {
      setPeriodoDialogError(err?.response?.data?.detail ?? 'Error al crear el período')
    },
  })

  const mutProcesarPeriodo = useMutation({
    mutationFn: (id: number) => api.post(`/hcm/nomina/periodos/${id}/procesar`),
    onSuccess: () => {
      toast.success('Nómina procesada exitosamente')
      setProcesandoId(null)
      queryClient.invalidateQueries({ queryKey: ['gh-periodos'] })
    },
    onError: () => {
      toast.error('Error al procesar la nómina')
      setProcesandoId(null)
    },
  })

  const mutCerrarPeriodo = useMutation({
    mutationFn: (id: number) => api.put(`/hcm/nomina/periodos/${id}/cerrar`),
    onSuccess: () => {
      toast.success('Período cerrado exitosamente')
      setCerrandoId(null)
      queryClient.invalidateQueries({ queryKey: ['gh-periodos'] })
    },
    onError: () => {
      toast.error('Error al cerrar el período')
      setCerrandoId(null)
    },
  })

  const mutCrearNovedad = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/hcm/nomina/novedades', data),
    onSuccess: () => {
      toast.success('Novedad creada exitosamente')
      setOpenNovedadDialog(false)
      setNovedadForm({ ...EMPTY_NOVEDAD })
      setNovedadDialogError('')
      queryClient.invalidateQueries({ queryKey: ['gh-novedades'] })
    },
    onError: (err: any) => {
      setNovedadDialogError(err?.response?.data?.detail ?? 'Error al crear la novedad')
    },
  })

  const mutEliminarNovedad = useMutation({
    mutationFn: (id: number) => api.delete(`/hcm/nomina/novedades/${id}`),
    onSuccess: () => {
      toast.success('Novedad eliminada')
      queryClient.invalidateQueries({ queryKey: ['gh-novedades'] })
    },
    onError: () => {
      toast.error('Error al eliminar la novedad')
    },
  })

  const mutCrearLiquidacion = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/hcm/liquidaciones', data),
    onSuccess: () => {
      toast.success('Liquidación creada exitosamente')
      setOpenLiqDialog(false)
      setLiqForm({ ...EMPTY_LIQUIDACION })
      setLiqDialogError('')
      queryClient.invalidateQueries({ queryKey: ['gh-liquidaciones'] })
    },
    onError: (err: any) => {
      setLiqDialogError(err?.response?.data?.detail ?? 'Error al crear la liquidación')
    },
  })

  // ── Derived data ─────────────────────────────────────────────────────────────

  const empresas = empresasQuery.data ?? []
  const periodos = periodosQuery.data ?? []
  const novedades = novedadesQuery.data ?? []
  const liquidaciones = liquidacionesQuery.data ?? []
  const colaboradoresOptions = colaboradoresQuery.data ?? []
  const todosColaboradores = todosColaboradoresQuery.data ?? []

  // Liquidacion computed total
  const liqTotal =
    (parseFloat(liqForm.prima) || 0) +
    (parseFloat(liqForm.cesantias) || 0) +
    (parseFloat(liqForm.intereses_cesantias) || 0) +
    (parseFloat(liqForm.vacaciones_compensadas) || 0) +
    (parseFloat(liqForm.indemnizacion) || 0) +
    (parseFloat(liqForm.otros_conceptos) || 0) -
    (parseFloat(liqForm.deducciones) || 0)

  // Prenomina: filter periodos by empresa
  const periodosPorEmpresa = preEmpresaId
    ? periodos.filter((p) => String(p.empresa_id) === preEmpresaId)
    : periodos

  const handleCargarPreNomina = useCallback(async () => {
    if (!prePeriodoId) return
    setPreLoading(true)
    setPreError('')
    try {
      const res = await api.get(`/hcm/nomina/periodos/${prePeriodoId}/detalles`)
      setPreDetalles(res.data)
    } catch {
      setPreError('Error al cargar la vista previa')
    } finally {
      setPreLoading(false)
    }
  }, [prePeriodoId])

  const preTotal = preDetalles
    ? preDetalles.reduce(
        (acc, d) => ({
          devengado: acc.devengado + d.total_devengado,
          deducido: acc.deducido + d.total_deducido,
          neto: acc.neto + d.neto_pagar,
        }),
        { devengado: 0, deducido: 0, neto: 0 }
      )
    : null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <PaymentsIcon sx={{ color: GH_COLOR, fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color={GH_COLOR}>
              Gestión de Nómina
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Procesamiento y liquidación de nómina
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': { bgcolor: GH_COLOR },
          }}
        >
          {['Períodos de Nómina', 'Novedades', 'Liquidaciones', 'Pre-nómina / Vista Previa'].map((label) => (
            <Tab
              key={label}
              label={label}
              sx={{ textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: GH_COLOR } }}
            />
          ))}
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 0 — Períodos de Nómina                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => setOpenPeriodoDialog(true)}
                sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
              >
                Nuevo Período
              </Button>
            </Box>

            {periodosQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los períodos</Alert>
            )}

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.08) }}>
                      <TableCell sx={{ width: 48 }} />
                      <TableCell sx={{ fontWeight: 700 }}>Nombre del período</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fechas</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Empleados</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total Devengado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total Deducido</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total Neto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {periodosQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 9 }).map((__, ci) => (
                              <TableCell key={ci}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : periodos.map((periodo) => {
                          const { bg, color } = estadoChipColor(periodo.estado)
                          const isExpanded = expandedPeriodo === periodo.id
                          return (
                            <>
                              <TableRow key={periodo.id} hover>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => setExpandedPeriodo(isExpanded ? null : periodo.id)}
                                  >
                                    {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                  </IconButton>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{periodo.nombre}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
                                </TableCell>
                                <TableCell align="right">{periodo.num_empleados}</TableCell>
                                <TableCell align="right">{formatCOP(periodo.total_devengado)}</TableCell>
                                <TableCell align="right">{formatCOP(periodo.total_deducido)}</TableCell>
                                <TableCell align="right">
                                  <Typography fontWeight={700} color="success.main">
                                    {formatCOP(periodo.total_neto)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={periodo.estado.replace('_', ' ')}
                                    size="small"
                                    sx={{ bgcolor: bg, color, fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {periodo.estado === 'BORRADOR' && (
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        title="Procesar Nómina"
                                        disabled={procesandoId === periodo.id}
                                        onClick={() => {
                                          setProcesandoId(periodo.id)
                                          mutProcesarPeriodo.mutate(periodo.id)
                                        }}
                                      >
                                        {procesandoId === periodo.id ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          <PlayArrowIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    )}
                                    {periodo.estado === 'EN_PROCESO' && (
                                      <IconButton
                                        size="small"
                                        color="warning"
                                        title="Cerrar Período"
                                        disabled={cerrandoId === periodo.id}
                                        onClick={() => {
                                          setCerrandoId(periodo.id)
                                          mutCerrarPeriodo.mutate(periodo.id)
                                        }}
                                      >
                                        {cerrandoId === periodo.id ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          <LockIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                              {/* Expandable row */}
                              <TableRow key={`det-${periodo.id}`}>
                                <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <PeriodoDetalleRow periodoId={periodo.id} open={isExpanded} />
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </>
                          )
                        })}
                    {!periodosQuery.isLoading && periodos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary" py={2}>Sin períodos registrados</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — Novedades                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 1 && (
          <Box>
            {/* Filter bar */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Buscar colaborador"
                      value={novedadFiltros.colaborador}
                      onChange={(e) => setNovedadFiltros((f) => ({ ...f, colaborador: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Período</InputLabel>
                      <Select
                        label="Período"
                        value={novedadFiltros.periodo_id}
                        onChange={(e) => setNovedadFiltros((f) => ({ ...f, periodo_id: e.target.value }))}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {periodos.map((p) => (
                          <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo de Novedad</InputLabel>
                      <Select
                        label="Tipo de Novedad"
                        value={novedadFiltros.tipo_novedad}
                        onChange={(e) => setNovedadFiltros((f) => ({ ...f, tipo_novedad: e.target.value }))}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {TIPOS_NOVEDAD.map((t) => (
                          <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => setOpenNovedadDialog(true)}
                      sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
                    >
                      Nueva Novedad
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {novedadesQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>Error al cargar las novedades</Alert>
            )}

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.08) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Colaborador</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Período</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Valor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Aprobado Por</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {novedadesQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 8 }).map((__, ci) => (
                              <TableCell key={ci}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : novedades.map((n) => {
                          const isDevengado = DEVENGADO_TIPOS.includes(n.tipo_novedad)
                          const isDeduccion = DEDUCCION_TIPOS.includes(n.tipo_novedad)
                          return (
                            <TableRow key={n.id} hover>
                              <TableCell>{n.colaborador_nombre}</TableCell>
                              <TableCell>{n.periodo_nombre ?? 'Sin período'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={TIPOS_NOVEDAD.find((t) => t.value === n.tipo_novedad)?.label ?? n.tipo_novedad}
                                  size="small"
                                  color={novedadChipColor(n.tipo_novedad)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{n.descripcion ?? '-'}</TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color={isDevengado ? 'success.main' : isDeduccion ? 'error.main' : 'text.primary'}
                                >
                                  {formatCOP(n.valor)}
                                </Typography>
                              </TableCell>
                              <TableCell>{formatDate(n.fecha)}</TableCell>
                              <TableCell>{n.aprobado_por ?? '-'}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => mutEliminarNovedad.mutate(n.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    {!novedadesQuery.isLoading && novedades.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" py={2}>Sin novedades registradas</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — Liquidaciones                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => setOpenLiqDialog(true)}
                sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
              >
                Nueva Liquidación
              </Button>
            </Box>

            {liquidacionesQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>Error al cargar las liquidaciones</Alert>
            )}

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.08) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Colaborador</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha Liquidación</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Motivo de Retiro</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Días Trabajados</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Prima</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Cesantías</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Vacaciones Comp.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total a Pagar</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {liquidacionesQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 9 }).map((__, ci) => (
                              <TableCell key={ci}><Skeleton variant="text" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : liquidaciones.map((liq) => (
                          <TableRow key={liq.id} hover>
                            <TableCell>{liq.colaborador_nombre}</TableCell>
                            <TableCell>{formatDate(liq.fecha_liquidacion)}</TableCell>
                            <TableCell>{liq.motivo_retiro}</TableCell>
                            <TableCell align="right">{liq.dias_trabajados}</TableCell>
                            <TableCell align="right">{formatCOP(liq.prima)}</TableCell>
                            <TableCell align="right">{formatCOP(liq.cesantias)}</TableCell>
                            <TableCell align="right">{formatCOP(liq.vacaciones_compensadas)}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={700} color="success.main">
                                {formatCOP(liq.total_pagar)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={liq.estado} size="small" color="info" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                    {!liquidacionesQuery.isLoading && liquidaciones.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary" py={2}>Sin liquidaciones registradas</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3 — Pre-nómina / Vista Previa                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 3 && (
          <Box>
            {/* Selector bar */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Empresa</InputLabel>
                      <Select
                        label="Empresa"
                        value={preEmpresaId}
                        onChange={(e) => {
                          setPreEmpresaId(e.target.value)
                          setPrePeriodoId('')
                          setPreDetalles(null)
                        }}
                      >
                        <MenuItem value="">Todas</MenuItem>
                        {empresas.map((e) => (
                          <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Período</InputLabel>
                      <Select
                        label="Período"
                        value={prePeriodoId}
                        onChange={(e) => setPrePeriodoId(e.target.value)}
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {periodosPorEmpresa.map((p) => (
                          <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={!prePeriodoId || preLoading}
                      onClick={handleCargarPreNomina}
                      sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
                    >
                      {preLoading ? <CircularProgress size={20} color="inherit" /> : 'Cargar Vista Previa'}
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={() => toast('Función de exportación próximamente')}
                      sx={{ borderColor: GH_COLOR, color: GH_COLOR }}
                    >
                      Imprimir / Exportar
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {preError && <Alert severity="error" sx={{ mb: 2 }}>{preError}</Alert>}

            {preDetalles && preTotal && (
              <>
                {/* Summary cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Empleados</Typography>
                        <Typography variant="h4" fontWeight={700} color={GH_COLOR}>
                          {preDetalles.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Devengado</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          {formatCOP(preTotal.devengado)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Deducido</Typography>
                        <Typography variant="h6" fontWeight={700} color="error.main">
                          {formatCOP(preTotal.deducido)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: alpha(GH_COLOR, 0.06), border: `2px solid ${GH_COLOR}` }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Neto a Pagar</Typography>
                        <Typography variant="h5" fontWeight={800} color={GH_COLOR}>
                          {formatCOP(preTotal.neto)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Full detail table */}
                <Card>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(GH_COLOR, 0.08) }}>
                          {[
                            'Colaborador', 'Cargo', 'Salario Base', 'Aux. Transporte',
                            'Otros Devengados', 'Total Devengado', 'Salud', 'Pensión',
                            'Fondo Solidaridad', 'Retención Fuente', 'Total Deducido', 'Neto a Pagar',
                          ].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preDetalles.map((d) => (
                          <TableRow key={d.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{d.colaborador_nombre}</TableCell>
                            <TableCell>{d.cargo ?? '-'}</TableCell>
                            <TableCell>{formatCOP(d.salario_base)}</TableCell>
                            <TableCell>{formatCOP(d.aux_transporte)}</TableCell>
                            <TableCell>{formatCOP(d.otros_devengados ?? 0)}</TableCell>
                            <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>{formatCOP(d.total_devengado)}</TableCell>
                            <TableCell>{formatCOP(d.salud)}</TableCell>
                            <TableCell>{formatCOP(d.pension)}</TableCell>
                            <TableCell>{formatCOP(d.fondo_solidaridad ?? 0)}</TableCell>
                            <TableCell>{formatCOP(d.retencion_fuente ?? 0)}</TableCell>
                            <TableCell sx={{ color: 'error.main' }}>{formatCOP(d.total_deducido)}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: GH_COLOR }}>{formatCOP(d.neto_pagar)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Card>
              </>
            )}

            {!preDetalles && !preLoading && !preError && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">
                  Seleccione una empresa y un período, luego presione "Cargar Vista Previa"
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Nuevo Período                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={openPeriodoDialog} onClose={() => { setOpenPeriodoDialog(false); setPeriodoDialogError('') }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Período de Nómina</DialogTitle>
          <DialogContent dividers>
            {periodoDialogError && <Alert severity="error" sx={{ mb: 2 }}>{periodoDialogError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Empresa</InputLabel>
                <Select
                  label="Empresa"
                  value={periodoForm.empresa_id}
                  onChange={(e) => setPeriodoForm((f) => ({ ...f, empresa_id: e.target.value }))}
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {empresas.map((e) => (
                    <MenuItem key={e.id} value={String(e.id)}>{e.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth size="small" label="Nombre del período"
                value={periodoForm.nombre}
                onChange={(e) => setPeriodoForm((f) => ({ ...f, nombre: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Fecha de inicio" type="date"
                InputLabelProps={{ shrink: true }}
                value={periodoForm.fecha_inicio}
                onChange={(e) => setPeriodoForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Fecha de fin" type="date"
                InputLabelProps={{ shrink: true }}
                value={periodoForm.fecha_fin}
                onChange={(e) => setPeriodoForm((f) => ({ ...f, fecha_fin: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Notas" multiline rows={3}
                value={periodoForm.notas}
                onChange={(e) => setPeriodoForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenPeriodoDialog(false); setPeriodoDialogError('') }}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={mutCrearPeriodo.isPending}
              onClick={() => mutCrearPeriodo.mutate(periodoForm)}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
            >
              {mutCrearPeriodo.isPending ? 'Creando...' : 'Crear Período'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Nueva Novedad                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={openNovedadDialog} onClose={() => { setOpenNovedadDialog(false); setNovedadDialogError('') }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Novedad</DialogTitle>
          <DialogContent dividers>
            {novedadDialogError && <Alert severity="error" sx={{ mb: 2 }}>{novedadDialogError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Autocomplete
                options={colaboradoresOptions}
                getOptionLabel={(o) => o.nombre}
                value={novedadForm.colaborador_id}
                onChange={(_, v) => setNovedadForm((f) => ({ ...f, colaborador_id: v }))}
                onInputChange={(_, v) => setColaboradorSearch(v)}
                loading={colaboradoresQuery.isFetching}
                renderInput={(params) => (
                  <TextField {...params} label="Colaborador" size="small" fullWidth
                    InputProps={{ ...params.InputProps, endAdornment: (<>{colaboradoresQuery.isFetching ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>) }}
                  />
                )}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Período (opcional)</InputLabel>
                <Select
                  label="Período (opcional)"
                  value={novedadForm.periodo_id}
                  onChange={(e) => setNovedadForm((f) => ({ ...f, periodo_id: e.target.value }))}
                >
                  <MenuItem value="">Sin período</MenuItem>
                  {periodos.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Novedad</InputLabel>
                <Select
                  label="Tipo de Novedad"
                  value={novedadForm.tipo_novedad}
                  onChange={(e) => setNovedadForm((f) => ({ ...f, tipo_novedad: e.target.value }))}
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {TIPOS_NOVEDAD.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth size="small" label="Descripción (opcional)"
                value={novedadForm.descripcion}
                onChange={(e) => setNovedadForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Valor" type="number"
                helperText="Positivo = devengado, negativo = deducción"
                value={novedadForm.valor}
                onChange={(e) => setNovedadForm((f) => ({ ...f, valor: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Fecha" type="date"
                InputLabelProps={{ shrink: true }}
                value={novedadForm.fecha}
                onChange={(e) => setNovedadForm((f) => ({ ...f, fecha: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Aprobado por (opcional)"
                value={novedadForm.aprobado_por}
                onChange={(e) => setNovedadForm((f) => ({ ...f, aprobado_por: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Notas (opcional)" multiline rows={2}
                value={novedadForm.notas}
                onChange={(e) => setNovedadForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenNovedadDialog(false); setNovedadDialogError('') }}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={mutCrearNovedad.isPending}
              onClick={() => {
                mutCrearNovedad.mutate({
                  colaborador_id: novedadForm.colaborador_id?.id,
                  periodo_id: novedadForm.periodo_id || undefined,
                  tipo_novedad: novedadForm.tipo_novedad,
                  descripcion: novedadForm.descripcion || undefined,
                  valor: parseFloat(novedadForm.valor),
                  fecha: novedadForm.fecha,
                  aprobado_por: novedadForm.aprobado_por || undefined,
                  notas: novedadForm.notas || undefined,
                })
              }}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
            >
              {mutCrearNovedad.isPending ? 'Guardando...' : 'Guardar Novedad'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Nueva Liquidación                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={openLiqDialog} onClose={() => { setOpenLiqDialog(false); setLiqDialogError('') }} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Liquidación</DialogTitle>
          <DialogContent dividers>
            {liqDialogError && <Alert severity="error" sx={{ mb: 2 }}>{liqDialogError}</Alert>}
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {/* Section 1 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={700} color={GH_COLOR} gutterBottom>
                  Datos Básicos
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Colaborador</InputLabel>
                  <Select
                    label="Colaborador"
                    value={liqForm.colaborador_id}
                    onChange={(e) => setLiqForm((f) => ({ ...f, colaborador_id: e.target.value }))}
                  >
                    <MenuItem value="">Seleccionar...</MenuItem>
                    {todosColaboradores.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Motivo de Retiro"
                  value={liqForm.motivo_retiro}
                  onChange={(e) => setLiqForm((f) => ({ ...f, motivo_retiro: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Fecha de Liquidación" type="date"
                  InputLabelProps={{ shrink: true }}
                  value={liqForm.fecha_liquidacion}
                  onChange={(e) => setLiqForm((f) => ({ ...f, fecha_liquidacion: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Días Trabajados" type="number"
                  value={liqForm.dias_trabajados}
                  onChange={(e) => setLiqForm((f) => ({ ...f, dias_trabajados: e.target.value }))}
                />
              </Grid>

              {/* Section 2 */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={700} color={GH_COLOR} gutterBottom sx={{ mt: 1 }}>
                  Conceptos de Liquidación
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              {[
                { key: 'prima', label: 'Prima' },
                { key: 'cesantias', label: 'Cesantías' },
                { key: 'intereses_cesantias', label: 'Intereses de Cesantías' },
                { key: 'vacaciones_compensadas', label: 'Vacaciones Compensadas' },
                { key: 'indemnizacion', label: 'Indemnización' },
                { key: 'otros_conceptos', label: 'Otros Conceptos' },
                { key: 'deducciones', label: 'Deducciones (positivo)' },
              ].map(({ key, label }) => (
                <Grid key={key} size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth size="small" label={label} type="number"
                    InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5, color: 'text.secondary' }}>COP</Typography> }}
                    value={liqForm[key as keyof typeof liqForm]}
                    onChange={(e) => setLiqForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </Grid>
              ))}

              {/* Computed total */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{
                  bgcolor: alpha(GH_COLOR, 0.08),
                  border: `2px solid ${GH_COLOR}`,
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Typography fontWeight={700} color={GH_COLOR}>Total a Pagar</Typography>
                  <Typography variant="h6" fontWeight={800} color={GH_COLOR}>
                    {formatCOP(liqTotal)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenLiqDialog(false); setLiqDialogError('') }}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={mutCrearLiquidacion.isPending}
              onClick={() => {
                mutCrearLiquidacion.mutate({
                  colaborador_id: liqForm.colaborador_id,
                  motivo_retiro: liqForm.motivo_retiro,
                  fecha_liquidacion: liqForm.fecha_liquidacion,
                  dias_trabajados: parseInt(liqForm.dias_trabajados) || 0,
                  prima: parseFloat(liqForm.prima) || 0,
                  cesantias: parseFloat(liqForm.cesantias) || 0,
                  intereses_cesantias: parseFloat(liqForm.intereses_cesantias) || 0,
                  vacaciones_compensadas: parseFloat(liqForm.vacaciones_compensadas) || 0,
                  indemnizacion: parseFloat(liqForm.indemnizacion) || 0,
                  otros_conceptos: parseFloat(liqForm.otros_conceptos) || 0,
                  deducciones: parseFloat(liqForm.deducciones) || 0,
                  total_pagar: liqTotal,
                })
              }}
              sx={{ bgcolor: GH_COLOR, '&:hover': { bgcolor: '#9D174D' } }}
            >
              {mutCrearLiquidacion.isPending ? 'Creando...' : 'Crear Liquidación'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
