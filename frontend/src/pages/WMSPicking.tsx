import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Select,
  InputLabel,
  FormControl,
  Collapse,
  alpha,
} from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface OrdenSalida {
  id: number
  numero_orden: string
  cliente_nombre: string
  almacen_nombre: string
  fecha_requerida: string
  prioridad: 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAJA'
  estado: string
  canal: string
  total_items: number
  qty_solicitada: number
  qty_preparada: number
}

interface OrdenLinea {
  producto_id: string
  cantidad_solicitada: string
  precio_unitario: string
}

interface TareaPickingDetalle {
  id: number
  producto_nombre: string
  ubicacion_codigo: string
  cantidad_solicitada: number
  cantidad_pickeada: number
  confirmado: boolean
}

interface TareaPicking {
  id: number
  orden_numero: string
  tipo: 'SINGLE' | 'BATCH' | 'ZONE' | 'CLUSTER' | 'WAVE'
  operario_nombre?: string
  estado: string
  fecha_asignacion?: string
  items_pickeados: number
  total_items: number
  detalle?: TareaPickingDetalle[]
}

interface Cliente { id: number; nombre: string }
interface Almacen { id: number; nombre: string }
interface Producto { id: number; nombre: string; sku: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const WMS_COLOR = '#1E40AF'

const PRIORIDAD_CONFIG: Record<string, { color: 'error' | 'warning' | 'info' | 'default'; label: string }> = {
  URGENTE: { color: 'error', label: 'Urgente' },
  ALTA:    { color: 'warning', label: 'Alta' },
  NORMAL:  { color: 'info', label: 'Normal' },
  BAJA:    { color: 'default', label: 'Baja' },
}

const EMPTY_ORDEN = {
  numero_orden: '',
  cliente_id: '',
  almacen_id: '',
  fecha_requerida: '',
  prioridad: 'NORMAL',
  canal: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WMSPicking() {
  const queryClient = useQueryClient()

  // ── Tab state ──
  const [tab, setTab] = useState(0)

  // ── Filter state ──
  const [filtrosOrdenes, setFiltrosOrdenes] = useState({ estado: '', prioridad: '', cliente: '' })
  const [filtrosTareas, setFiltrosTareas] = useState({ estado: '' })

  // ── Dialog state ──
  const [openOrdenDialog, setOpenOrdenDialog] = useState(false)
  const [ordenForm, setOrdenForm] = useState({ ...EMPTY_ORDEN })
  const [lineas, setLineas] = useState<OrdenLinea[]>([{ producto_id: '', cantidad_solicitada: '', precio_unitario: '' }])

  // ── Expandable tarea ──
  const [expandedTarea, setExpandedTarea] = useState<number | null>(null)

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: ordenes, isLoading: loadingOrdenes, isError: errorOrdenes } = useQuery<OrdenSalida[]>({
    queryKey: ['wms-ordenes', filtrosOrdenes],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filtrosOrdenes.estado)    params.estado    = filtrosOrdenes.estado
      if (filtrosOrdenes.prioridad) params.prioridad = filtrosOrdenes.prioridad
      if (filtrosOrdenes.cliente)   params.cliente   = filtrosOrdenes.cliente
      const res = await api.get('/wms/ordenes-salida/', { params })
      return res.data
    },
  })

  const { data: tareas, isLoading: loadingTareas, isError: errorTareas } = useQuery<TareaPicking[]>({
    queryKey: ['wms-tareas', filtrosTareas],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filtrosTareas.estado) params.estado = filtrosTareas.estado
      const res = await api.get('/wms/picking-tareas/', { params })
      return res.data
    },
  })

  const { data: clientes } = useQuery<Cliente[]>({
    queryKey: ['wms-clientes'],
    queryFn: async () => {
      const res = await api.get('/wms/clientes/')
      return res.data
    },
  })

  const { data: almacenes } = useQuery<Almacen[]>({
    queryKey: ['wms-almacenes'],
    queryFn: async () => {
      const res = await api.get('/wms/almacenes/')
      return res.data
    },
  })

  const { data: productos } = useQuery<Producto[]>({
    queryKey: ['wms-productos'],
    queryFn: async () => {
      const res = await api.get('/wms/productos/')
      return res.data
    },
  })

  // ─── Mutations ────────────────────────────────────────────────────────────

  const mutCrearOrden = useMutation({
    mutationFn: async (body: typeof EMPTY_ORDEN & { lineas: OrdenLinea[] }) => {
      const res = await api.post('/wms/ordenes-salida/', body)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-ordenes'] })
      toast.success('Orden creada')
      setOrdenForm({ ...EMPTY_ORDEN })
      setLineas([{ producto_id: '', cantidad_solicitada: '', precio_unitario: '' }])
      setOpenOrdenDialog(false)
    },
  })

  const mutGenerarPicking = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/wms/ordenes-salida/${id}/generar-picking`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-ordenes'] })
      queryClient.invalidateQueries({ queryKey: ['wms-tareas'] })
      toast.success('Picking generado')
    },
  })

  const mutConfirmarItem = useMutation({
    mutationFn: async ({ tareaId, detalle_id, cantidad_pickeada }: { tareaId: number; detalle_id: number; cantidad_pickeada: number }) => {
      const res = await api.post(`/wms/picking-tareas/${tareaId}/confirmar-item`, { detalle_id, cantidad_pickeada })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-tareas'] })
      toast.success('Item confirmado')
    },
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const addLinea = () => {
    setLineas(prev => [...prev, { producto_id: '', cantidad_solicitada: '', precio_unitario: '' }])
  }

  const removeLinea = (index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index))
  }

  const updateLinea = (index: number, field: keyof OrdenLinea, value: string) => {
    setLineas(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const handleCrearOrden = () => {
    if (!ordenForm.numero_orden.trim()) {
      toast.error('El número de orden es requerido')
      return
    }
    if (!ordenForm.cliente_id) {
      toast.error('El cliente es requerido')
      return
    }
    mutCrearOrden.mutate({ ...ordenForm, lineas })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <LocalShippingIcon sx={{ color: WMS_COLOR, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color={WMS_COLOR}>
              Picking y Órdenes de Salida
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de órdenes salientes y tareas de picking
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 2,
            '& .MuiTabs-indicator': { bgcolor: WMS_COLOR },
            '& .Mui-selected': { color: `${WMS_COLOR} !important` },
          }}
        >
          <Tab label="Órdenes de Salida" />
          <Tab label="Tareas de Picking" />
        </Tabs>

        {/* ── TAB 0: Órdenes de Salida ─────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            {/* Filters */}
            <Card sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  label="Estado"
                  size="small"
                  value={filtrosOrdenes.estado}
                  onChange={e => setFiltrosOrdenes(prev => ({ ...prev, estado: e.target.value }))}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                  <MenuItem value="EN_PREPARACION">En Preparación</MenuItem>
                  <MenuItem value="LISTO">Listo</MenuItem>
                  <MenuItem value="DESPACHADO">Despachado</MenuItem>
                  <MenuItem value="CANCELADO">Cancelado</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Prioridad"
                  size="small"
                  value={filtrosOrdenes.prioridad}
                  onChange={e => setFiltrosOrdenes(prev => ({ ...prev, prioridad: e.target.value }))}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="URGENTE">Urgente</MenuItem>
                  <MenuItem value="ALTA">Alta</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="BAJA">Baja</MenuItem>
                </TextField>

                <TextField
                  label="Cliente"
                  size="small"
                  value={filtrosOrdenes.cliente}
                  onChange={e => setFiltrosOrdenes(prev => ({ ...prev, cliente: e.target.value }))}
                  sx={{ minWidth: 180 }}
                />

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1E3A8A' } }}
                  onClick={() => setOpenOrdenDialog(true)}
                >
                  Nueva Orden
                </Button>
              </Box>
            </Card>

            {/* Ordenes Table */}
            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(WMS_COLOR, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700 }}># Orden</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Almacén</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha Req.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Prioridad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Canal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Items</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Progreso</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingOrdenes ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 10 }).map((__, j) => (
                            <TableCell key={j}><Skeleton variant="text" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : errorOrdenes ? (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <Alert severity="error">Error al cargar las órdenes de salida</Alert>
                        </TableCell>
                      </TableRow>
                    ) : (ordenes ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No hay órdenes de salida
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (ordenes ?? []).map(orden => {
                        const progreso = orden.qty_solicitada > 0
                          ? (orden.qty_preparada / orden.qty_solicitada) * 100
                          : 0

                        const estadoColor: Record<string, 'warning' | 'info' | 'success' | 'default' | 'error'> = {
                          PENDIENTE: 'warning',
                          EN_PREPARACION: 'info',
                          LISTO: 'success',
                          DESPACHADO: 'default',
                          CANCELADO: 'error',
                        }

                        return (
                          <TableRow key={orden.id} hover>
                            <TableCell>
                              <Typography fontWeight={600} variant="body2">
                                {orden.numero_orden}
                              </Typography>
                            </TableCell>
                            <TableCell>{orden.cliente_nombre}</TableCell>
                            <TableCell>{orden.almacen_nombre}</TableCell>
                            <TableCell>
                              {new Date(orden.fecha_requerida).toLocaleDateString('es-CO')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={PRIORIDAD_CONFIG[orden.prioridad]?.color ?? 'default'}
                                label={PRIORIDAD_CONFIG[orden.prioridad]?.label ?? orden.prioridad}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={estadoColor[orden.estado] ?? 'default'}
                                label={orden.estado}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip size="small" variant="outlined" label={orden.canal || '-'} />
                            </TableCell>
                            <TableCell align="center">{orden.total_items}</TableCell>
                            <TableCell>
                              <LinearProgress
                                variant="determinate"
                                value={progreso}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {orden.qty_preparada}/{orden.qty_solicitada}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {orden.estado === 'PENDIENTE' && (
                                <Tooltip title="Generar Picking">
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={mutGenerarPicking.isPending}
                                      onClick={() => mutGenerarPicking.mutate(orden.id)}
                                      sx={{ color: WMS_COLOR }}
                                    >
                                      <PlayArrowIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ── TAB 1: Tareas de Picking ──────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            {/* Filters */}
            <Card sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  label="Estado"
                  size="small"
                  value={filtrosTareas.estado}
                  onChange={e => setFiltrosTareas(prev => ({ ...prev, estado: e.target.value }))}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                  <MenuItem value="ASIGNADA">Asignada</MenuItem>
                  <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                  <MenuItem value="COMPLETADA">Completada</MenuItem>
                  <MenuItem value="CANCELADA">Cancelada</MenuItem>
                </TextField>
              </Box>
            </Card>

            {/* Tareas Table */}
            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(WMS_COLOR, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Orden</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Operario</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Asignado</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Progreso</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingTareas ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((__, j) => (
                            <TableCell key={j}><Skeleton variant="text" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : errorTareas ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Alert severity="error">Error al cargar las tareas de picking</Alert>
                        </TableCell>
                      </TableRow>
                    ) : (tareas ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No hay tareas de picking
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (tareas ?? []).map(tarea => {
                        const tipoColor: Record<string, 'default' | 'info' | 'warning' | 'secondary' | 'primary'> = {
                          SINGLE:  'default',
                          BATCH:   'info',
                          ZONE:    'warning',
                          CLUSTER: 'secondary',
                          WAVE:    'primary',
                        }

                        const estadoTareaColor: Record<string, 'warning' | 'info' | 'primary' | 'success' | 'error'> = {
                          PENDIENTE:   'warning',
                          ASIGNADA:    'info',
                          EN_PROCESO:  'primary',
                          COMPLETADA:  'success',
                          CANCELADA:   'error',
                        }

                        const progreso = tarea.total_items > 0
                          ? (tarea.items_pickeados / tarea.total_items) * 100
                          : 0

                        const isExpanded = expandedTarea === tarea.id

                        return (
                          <>
                            <TableRow key={tarea.id} hover>
                              <TableCell>
                                <Typography fontWeight={600} variant="body2" color={WMS_COLOR}>
                                  {tarea.id}
                                </Typography>
                              </TableCell>
                              <TableCell>{tarea.orden_numero}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={tipoColor[tarea.tipo] ?? 'default'}
                                  label={tarea.tipo}
                                />
                              </TableCell>
                              <TableCell>{tarea.operario_nombre || '-'}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={estadoTareaColor[tarea.estado] ?? 'default'}
                                  label={tarea.estado}
                                />
                              </TableCell>
                              <TableCell>
                                {tarea.fecha_asignacion
                                  ? new Date(tarea.fecha_asignacion).toLocaleDateString('es-CO')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <LinearProgress
                                  variant="determinate"
                                  value={progreso}
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {tarea.items_pickeados}/{tarea.total_items}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => setExpandedTarea(isExpanded ? null : tarea.id)}
                                >
                                  {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                </IconButton>
                              </TableCell>
                            </TableRow>

                            {/* Expandable row */}
                            <TableRow key={`${tarea.id}-expand`}>
                              <TableCell colSpan={8} sx={{ py: 0, border: isExpanded ? undefined : 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ bgcolor: alpha(WMS_COLOR, 0.03), p: 2 }}>
                                    <Typography fontWeight={600} variant="body2" sx={{ mb: 1 }}>
                                      Líneas de Picking
                                    </Typography>

                                    {!tarea.detalle || tarea.detalle.length === 0 ? (
                                      <Typography variant="body2" color="text.secondary">
                                        Sin detalle disponible
                                      </Typography>
                                    ) : (
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Ubicación</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Solicitado</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Pickeado</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Acción</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {tarea.detalle.map(detalle => (
                                            <TableRow key={detalle.id} hover>
                                              <TableCell>{detalle.producto_nombre}</TableCell>
                                              <TableCell>
                                                <Chip
                                                  size="small"
                                                  variant="outlined"
                                                  label={detalle.ubicacion_codigo}
                                                />
                                              </TableCell>
                                              <TableCell>{detalle.cantidad_solicitada}</TableCell>
                                              <TableCell>{detalle.cantidad_pickeada}</TableCell>
                                              <TableCell>
                                                {detalle.confirmado ? (
                                                  <Chip
                                                    size="small"
                                                    color="success"
                                                    label="Confirmado"
                                                    icon={<CheckCircleIcon />}
                                                  />
                                                ) : (
                                                  <Chip
                                                    size="small"
                                                    color="warning"
                                                    label="Pendiente"
                                                    icon={<HourglassEmptyIcon />}
                                                  />
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {!detalle.confirmado && (
                                                  <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                      mutConfirmarItem.mutate({
                                                        tareaId: tarea.id,
                                                        detalle_id: detalle.id,
                                                        cantidad_pickeada: detalle.cantidad_solicitada,
                                                      })
                                                    }
                                                  >
                                                    Confirmar
                                                  </Button>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ── Dialog: Nueva Orden de Salida ─────────────────────────────────── */}
        <Dialog
          open={openOrdenDialog}
          onClose={() => setOpenOrdenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Nueva Orden de Salida</DialogTitle>
          <DialogContent dividers>

            {/* Section 1 — Datos de la Orden */}
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Datos de la Orden
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Número de Orden"
                  fullWidth
                  size="small"
                  value={ordenForm.numero_orden}
                  onChange={e => setOrdenForm(prev => ({ ...prev, numero_orden: e.target.value }))}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    label="Cliente"
                    value={ordenForm.cliente_id}
                    onChange={e => setOrdenForm(prev => ({ ...prev, cliente_id: e.target.value }))}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {(clientes ?? []).map(c => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Almacén</InputLabel>
                  <Select
                    label="Almacén"
                    value={ordenForm.almacen_id}
                    onChange={e => setOrdenForm(prev => ({ ...prev, almacen_id: e.target.value }))}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {(almacenes ?? []).map(a => (
                      <MenuItem key={a.id} value={String(a.id)}>{a.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Fecha Requerida"
                  type="date"
                  fullWidth
                  size="small"
                  value={ordenForm.fecha_requerida}
                  onChange={e => setOrdenForm(prev => ({ ...prev, fecha_requerida: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    label="Prioridad"
                    value={ordenForm.prioridad}
                    onChange={e => setOrdenForm(prev => ({ ...prev, prioridad: e.target.value }))}
                  >
                    <MenuItem value="URGENTE">Urgente</MenuItem>
                    <MenuItem value="ALTA">Alta</MenuItem>
                    <MenuItem value="NORMAL">Normal</MenuItem>
                    <MenuItem value="BAJA">Baja</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Canal"
                  fullWidth
                  size="small"
                  value={ordenForm.canal}
                  onChange={e => setOrdenForm(prev => ({ ...prev, canal: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Section 2 — Líneas de Pedido */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Líneas de Pedido</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addLinea}
              >
                Agregar Línea
              </Button>
            </Box>

            {lineas.map((linea, index) => (
              <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 1 }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Producto</InputLabel>
                    <Select
                      label="Producto"
                      value={linea.producto_id}
                      onChange={e => updateLinea(index, 'producto_id', e.target.value)}
                    >
                      <MenuItem value="">Seleccionar</MenuItem>
                      {(productos ?? []).map(p => (
                        <MenuItem key={p.id} value={String(p.id)}>
                          {p.sku} — {p.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Cantidad"
                    type="number"
                    fullWidth
                    size="small"
                    value={linea.cantidad_solicitada}
                    onChange={e => updateLinea(index, 'cantidad_solicitada', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Precio Unit."
                    type="number"
                    fullWidth
                    size="small"
                    value={linea.precio_unitario}
                    onChange={e => updateLinea(index, 'precio_unitario', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 1 }}>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={lineas.length === 1}
                    onClick={() => removeLinea(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenOrdenDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1E3A8A' } }}
              onClick={handleCrearOrden}
              disabled={mutCrearOrden.isPending}
            >
              Crear Orden
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Layout>
  )
}
