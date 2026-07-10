import { useState } from 'react'
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
  Grid,
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
  alpha,
} from '@mui/material'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import CheckIcon from '@mui/icons-material/Check'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ProductoRef {
  id: number
  sku: string
  nombre: string
  unidad_medida?: string
}

interface UbicacionRef {
  id: number
  codigo: string
  pasillo?: string
  estanteria?: string
  nivel?: string
  posicion?: string
}

interface LoteRef {
  id: number
  numero_lote: string
  fecha_vencimiento?: string | null
}

interface StockItem {
  id: number
  producto_id: number
  producto?: ProductoRef
  ubicacion_id: number
  ubicacion?: UbicacionRef
  lote_id: number | null
  lote?: LoteRef | null
  cantidad_disponible: number
  cantidad_reservada: number
  cantidad_bloqueada: number
  updated_at?: string
}

// Historial de movimientos (ajustes / transferencias) — WMSMovimientoResponse
interface Movimiento {
  id: number
  tipo: string
  producto_id: number
  producto?: ProductoRef
  ubicacion_origen_id: number | null
  ubicacion_destino_id: number | null
  lote_id: number | null
  cantidad: number
  referencia_documento?: string | null
  usuario_id?: number | null
  notas?: string | null
  created_at: string
}

interface ConteoDetalle {
  id: number
  producto_nombre: string
  ubicacion_codigo: string
  cantidad_sistema: number
  cantidad_fisica: number | null
  diferencia: number | null
}

interface Conteo {
  id: number
  almacen_nombre: string
  tipo: 'CICLICO' | 'GENERAL' | 'DIRIGIDO'
  estado: string
  fecha_programada: string
  operario_nombre?: string
  detalle?: ConteoDetalle[]
}

interface Producto {
  id: number
  nombre: string
  sku: string
}

interface Ubicacion {
  id: number
  codigo: string
  almacen_nombre?: string
}

interface Almacen {
  id: number
  nombre: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WMS_COLOR = '#1E40AF'

const EMPTY_AJUSTE = {
  producto_id: '',
  ubicacion_id: '',
  lote_id: '',
  cantidad_nueva: '',
  motivo: '',
}

const EMPTY_TRANSFERENCIA = {
  producto_id: '',
  ubicacion_origen_id: '',
  ubicacion_destino_id: '',
  lote_id: '',
  cantidad: '',
  notas: '',
}

const EMPTY_CONTEO = {
  almacen_id: '',
  tipo: 'CICLICO',
  fecha_programada: '',
  notas: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WMSInventario() {
  const queryClient = useQueryClient()

  // ── State ──────────────────────────────────────────────────────────────────

  const [tab, setTab] = useState(0)
  const [filtros, setFiltros] = useState({
    almacen_id: '',
    zona: '',
    producto: '',
  })
  const [ajusteForm, setAjusteForm] = useState({ ...EMPTY_AJUSTE })
  const [transForm, setTransForm] = useState({ ...EMPTY_TRANSFERENCIA })
  const [conteoForm, setConteoForm] = useState({ ...EMPTY_CONTEO })
  const [openConteoDialog, setOpenConteoDialog] = useState(false)
  const [expandedConteo, setExpandedConteo] = useState<number | null>(null)

  // ── Queries ─────────────────────────────────────────────────────────────────

  const stockQuery = useQuery<StockItem[]>({
    queryKey: ['wms-stock', filtros],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filtros.almacen_id) params.almacen_id = filtros.almacen_id
      if (filtros.zona) params.zona = filtros.zona
      if (filtros.producto) params.producto = filtros.producto
      const res = await api.get('/wms/inventario/', { params })
      return res.data
    },
  })

  const ajustesQuery = useQuery<Movimiento[]>({
    queryKey: ['wms-ajustes'],
    queryFn: async () => {
      const res = await api.get('/wms/inventario/ajustes/')
      return res.data
    },
  })

  const transferenciasQuery = useQuery<Movimiento[]>({
    queryKey: ['wms-transferencias'],
    queryFn: async () => {
      const res = await api.get('/wms/inventario/transferencias/')
      return res.data
    },
  })

  const conteosQuery = useQuery<Conteo[]>({
    queryKey: ['wms-conteos'],
    queryFn: async () => {
      const res = await api.get('/wms/conteos/')
      return res.data
    },
  })

  const productosQuery = useQuery<Producto[]>({
    queryKey: ['wms-productos'],
    queryFn: async () => {
      const res = await api.get('/wms/productos/')
      return res.data
    },
  })

  const ubicacionesQuery = useQuery<Ubicacion[]>({
    queryKey: ['wms-ubicaciones'],
    queryFn: async () => {
      const res = await api.get('/wms/ubicaciones/')
      return res.data
    },
  })

  const almacenesQuery = useQuery<Almacen[]>({
    queryKey: ['wms-almacenes'],
    queryFn: async () => {
      const res = await api.get('/wms/almacenes/')
      return res.data
    },
  })

  // ── Mutations ───────────────────────────────────────────────────────────────

  const mutAjuste = useMutation({
    mutationFn: (data: typeof EMPTY_AJUSTE) =>
      api.post('/wms/inventario/ajuste/', {
        producto_id: Number(data.producto_id),
        ubicacion_id: Number(data.ubicacion_id),
        lote_id: data.lote_id ? Number(data.lote_id) : null,
        cantidad_nueva: Number(data.cantidad_nueva),
        motivo: data.motivo || undefined,
      }),
    onSuccess: () => {
      toast.success('Ajuste registrado correctamente')
      setAjusteForm({ ...EMPTY_AJUSTE })
      queryClient.invalidateQueries({ queryKey: ['wms-stock'] })
      queryClient.invalidateQueries({ queryKey: ['wms-ajustes'] })
    },
    onError: () => {
      toast.error('Error al registrar el ajuste')
    },
  })

  const mutTransferencia = useMutation({
    mutationFn: (data: typeof EMPTY_TRANSFERENCIA) =>
      api.post('/wms/inventario/transferencia/', {
        producto_id: Number(data.producto_id),
        ubicacion_origen_id: Number(data.ubicacion_origen_id),
        ubicacion_destino_id: Number(data.ubicacion_destino_id),
        lote_id: data.lote_id ? Number(data.lote_id) : null,
        cantidad: Number(data.cantidad),
        notas: data.notas || undefined,
      }),
    onSuccess: () => {
      toast.success('Transferencia registrada correctamente')
      setTransForm({ ...EMPTY_TRANSFERENCIA })
      queryClient.invalidateQueries({ queryKey: ['wms-stock'] })
      queryClient.invalidateQueries({ queryKey: ['wms-transferencias'] })
    },
    onError: () => {
      toast.error('Error al registrar la transferencia')
    },
  })

  const mutConteo = useMutation({
    mutationFn: (data: typeof EMPTY_CONTEO) =>
      api.post('/wms/conteos/', {
        almacen_id: Number(data.almacen_id),
        tipo: data.tipo,
        fecha_programada: data.fecha_programada,
        notas: data.notas || undefined,
        detalles: [],
      }),
    onSuccess: () => {
      toast.success('Conteo creado correctamente')
      setConteoForm({ ...EMPTY_CONTEO })
      setOpenConteoDialog(false)
      queryClient.invalidateQueries({ queryKey: ['wms-conteos'] })
    },
    onError: () => {
      toast.error('Error al crear el conteo')
    },
  })

  const mutCompletarConteo = useMutation({
    mutationFn: (id: number) =>
      api.put(`/wms/conteos/${id}/completar`),
    onSuccess: () => {
      toast.success('Conteo completado')
      queryClient.invalidateQueries({ queryKey: ['wms-conteos'] })
    },
    onError: () => {
      toast.error('Error al completar el conteo')
    },
  })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const stockItems = stockQuery.data ?? []
  const ajustes = ajustesQuery.data ?? []
  const transferencias = transferenciasQuery.data ?? []
  const conteos = conteosQuery.data ?? []
  const productos = productosQuery.data ?? []
  const ubicaciones = ubicacionesQuery.data ?? []
  const almacenes = almacenesQuery.data ?? []

  const totalDisponible = stockItems.reduce((s, i) => s + i.cantidad_disponible, 0)
  const totalReservada = stockItems.reduce((s, i) => s + i.cantidad_reservada, 0)
  const totalBloqueada = stockItems.reduce((s, i) => s + i.cantidad_bloqueada, 0)
  const totalGeneral = totalDisponible + totalReservada + totalBloqueada

  const tipoBadgeColor = (tipo: string) => {
    if (tipo === 'CICLICO') return 'primary'
    if (tipo === 'GENERAL') return 'success' // teal-ish via MUI success
    if (tipo === 'DIRIGIDO') return 'secondary'
    return 'default'
  }

  const estadoBadgeColor = (
    estado: string
  ): 'warning' | 'info' | 'success' | 'error' | 'default' => {
    if (estado === 'PROGRAMADO') return 'warning'
    if (estado === 'EN_PROCESO') return 'info'
    if (estado === 'COMPLETO') return 'success'
    if (estado === 'CANCELADO') return 'error'
    return 'default'
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO')
    } catch {
      return dateStr
    }
  }

  const ubicacionLabel = (id: number | null | undefined) => {
    if (id == null) return '-'
    const u = ubicaciones.find((x) => x.id === id)
    return u ? u.codigo : `#${id}`
  }

  const isNum = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v))

  const ajusteValido =
    isNum(ajusteForm.producto_id) &&
    isNum(ajusteForm.ubicacion_id) &&
    isNum(ajusteForm.cantidad_nueva) &&
    Number(ajusteForm.cantidad_nueva) >= 0

  const transValido =
    isNum(transForm.producto_id) &&
    isNum(transForm.ubicacion_origen_id) &&
    isNum(transForm.ubicacion_destino_id) &&
    isNum(transForm.cantidad) &&
    Number(transForm.cantidad) > 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Inventory2Icon sx={{ color: WMS_COLOR, fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color={WMS_COLOR}>
              Gestión de Inventario WMS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control de stock, ajustes, transferencias y conteos
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
            '& .MuiTabs-indicator': { bgcolor: WMS_COLOR },
          }}
        >
          {['Stock en Tiempo Real', 'Ajustes', 'Transferencias', 'Conteos de Inventario'].map(
            (label) => (
              <Tab
                key={label}
                label={label}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-selected': { color: WMS_COLOR },
                }}
              />
            )
          )}
        </Tabs>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 0 — Stock en Tiempo Real                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 0 && (
          <Box>
            {/* Filter card */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Almacén</InputLabel>
                      <Select
                        label="Almacén"
                        value={filtros.almacen_id}
                        onChange={(e) =>
                          setFiltros((f) => ({ ...f, almacen_id: e.target.value }))
                        }
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {almacenes.map((a) => (
                          <MenuItem key={a.id} value={String(a.id)}>
                            {a.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Zona"
                      value={filtros.zona}
                      onChange={(e) => setFiltros((f) => ({ ...f, zona: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Buscar producto"
                      value={filtros.producto}
                      onChange={(e) =>
                        setFiltros((f) => ({ ...f, producto: e.target.value }))
                      }
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Stock error */}
            {stockQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error al cargar el stock
              </Alert>
            )}

            {/* Stock table */}
            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(WMS_COLOR, 0.08) }}>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ubicación</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Lote</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Disponible
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Reservada
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Bloqueada
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Total
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, idx) => (
                          <TableRow key={idx}>
                            {Array.from({ length: 8 }).map((__, ci) => (
                              <TableCell key={ci}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : stockItems.map((item) => {
                          const total =
                            item.cantidad_disponible +
                            item.cantidad_reservada +
                            item.cantidad_bloqueada
                          return (
                            <TableRow key={item.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontFamily="monospace">
                                  {item.producto?.sku ?? '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>{item.producto?.nombre ?? '-'}</TableCell>
                              <TableCell>
                                {item.ubicacion?.codigo ?? '-'}
                                {item.ubicacion &&
                                (item.ubicacion.pasillo ||
                                  item.ubicacion.estanteria ||
                                  item.ubicacion.nivel ||
                                  item.ubicacion.posicion) ? (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {[
                                      item.ubicacion.pasillo,
                                      item.ubicacion.estanteria,
                                      item.ubicacion.nivel,
                                      item.ubicacion.posicion,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </Typography>
                                ) : null}
                              </TableCell>
                              <TableCell>{item.lote?.numero_lote ?? '-'}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={item.cantidad_disponible}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={item.cantidad_reservada}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={item.cantidad_bloqueada}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600}>
                                  {total}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )
                        })}

                    {/* Summary row */}
                    {!stockQuery.isLoading && stockItems.length > 0 && (
                      <TableRow
                        sx={{ bgcolor: alpha(WMS_COLOR, 0.05) }}
                      >
                        <TableCell colSpan={4} sx={{ fontWeight: 700 }}>
                          Stock Total
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={totalDisponible}
                            size="small"
                            color="success"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={totalReservada}
                            size="small"
                            color="warning"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={totalBloqueada}
                            size="small"
                            color="error"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>{totalGeneral}</Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {!stockQuery.isLoading && stockItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" py={2}>
                            No hay registros de stock
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — Ajustes                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 1 && (
          <Grid container spacing={2}>
            {/* Left: Nuevo Ajuste */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Nuevo Ajuste
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Producto</InputLabel>
                      <Select
                        label="Producto"
                        value={ajusteForm.producto_id}
                        onChange={(e) =>
                          setAjusteForm((f) => ({ ...f, producto_id: e.target.value }))
                        }
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {productos.map((p) => (
                          <MenuItem key={p.id} value={String(p.id)}>
                            {p.sku} — {p.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel>Ubicación</InputLabel>
                      <Select
                        label="Ubicación"
                        value={ajusteForm.ubicacion_id}
                        onChange={(e) =>
                          setAjusteForm((f) => ({ ...f, ubicacion_id: e.target.value }))
                        }
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {ubicaciones.map((u) => (
                          <MenuItem key={u.id} value={String(u.id)}>
                            {u.codigo}
                            {u.almacen_nombre ? ` (${u.almacen_nombre})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      size="small"
                      label="Lote ID (opcional)"
                      value={ajusteForm.lote_id}
                      onChange={(e) =>
                        setAjusteForm((f) => ({ ...f, lote_id: e.target.value }))
                      }
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Nueva cantidad (stock resultante)"
                      type="number"
                      helperText="Nueva cantidad (stock resultante)"
                      inputProps={{ min: 0 }}
                      value={ajusteForm.cantidad_nueva}
                      onChange={(e) =>
                        setAjusteForm((f) => ({ ...f, cantidad_nueva: e.target.value }))
                      }
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Motivo"
                      multiline
                      rows={2}
                      value={ajusteForm.motivo}
                      onChange={(e) =>
                        setAjusteForm((f) => ({ ...f, motivo: e.target.value }))
                      }
                    />

                    <Button
                      variant="contained"
                      disabled={mutAjuste.isPending || !ajusteValido}
                      onClick={() => mutAjuste.mutate(ajusteForm)}
                      sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1e3a8a' } }}
                    >
                      {mutAjuste.isPending ? 'Registrando...' : 'Registrar Ajuste'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right: Historial */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Historial de Ajustes
                  </Typography>

                  {ajustesQuery.isError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Error al cargar los ajustes
                    </Alert>
                  )}

                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(WMS_COLOR, 0.08) }}>
                          <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Ubicación</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Cantidad
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Referencia</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Notas</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ajustesQuery.isLoading
                          ? Array.from({ length: 5 }).map((_, idx) => (
                              <TableRow key={idx}>
                                {Array.from({ length: 6 }).map((__, ci) => (
                                  <TableCell key={ci}>
                                    <Skeleton variant="text" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          : ajustes.map((a) => (
                              <TableRow key={a.id} hover>
                                <TableCell>{a.producto?.nombre ?? `#${a.producto_id}`}</TableCell>
                                <TableCell>
                                  {ubicacionLabel(a.ubicacion_destino_id ?? a.ubicacion_origen_id)}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={600}>
                                    {a.cantidad}
                                  </Typography>
                                </TableCell>
                                <TableCell>{a.referencia_documento ?? '-'}</TableCell>
                                <TableCell>{formatDate(a.created_at)}</TableCell>
                                <TableCell>{a.notas ?? '-'}</TableCell>
                              </TableRow>
                            ))}
                        {!ajustesQuery.isLoading && ajustes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography color="text.secondary" py={2}>
                                Sin ajustes registrados
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — Transferencias                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 2 && (
          <Grid container spacing={2}>
            {/* Left: Nueva Transferencia */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Nueva Transferencia
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Producto</InputLabel>
                      <Select
                        label="Producto"
                        value={transForm.producto_id}
                        onChange={(e) =>
                          setTransForm((f) => ({ ...f, producto_id: e.target.value }))
                        }
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {productos.map((p) => (
                          <MenuItem key={p.id} value={String(p.id)}>
                            {p.sku} — {p.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel>Ubicación Origen</InputLabel>
                      <Select
                        label="Ubicación Origen"
                        value={transForm.ubicacion_origen_id}
                        onChange={(e) =>
                          setTransForm((f) => ({
                            ...f,
                            ubicacion_origen_id: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {ubicaciones.map((u) => (
                          <MenuItem key={u.id} value={String(u.id)}>
                            {u.codigo}
                            {u.almacen_nombre ? ` (${u.almacen_nombre})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel>Ubicación Destino</InputLabel>
                      <Select
                        label="Ubicación Destino"
                        value={transForm.ubicacion_destino_id}
                        onChange={(e) =>
                          setTransForm((f) => ({
                            ...f,
                            ubicacion_destino_id: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {ubicaciones.map((u) => (
                          <MenuItem key={u.id} value={String(u.id)}>
                            {u.codigo}
                            {u.almacen_nombre ? ` (${u.almacen_nombre})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      size="small"
                      label="Lote ID (opcional)"
                      value={transForm.lote_id}
                      onChange={(e) =>
                        setTransForm((f) => ({ ...f, lote_id: e.target.value }))
                      }
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Cantidad"
                      type="number"
                      value={transForm.cantidad}
                      onChange={(e) =>
                        setTransForm((f) => ({ ...f, cantidad: e.target.value }))
                      }
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Notas"
                      multiline
                      rows={2}
                      value={transForm.notas}
                      onChange={(e) =>
                        setTransForm((f) => ({ ...f, notas: e.target.value }))
                      }
                    />

                    <Button
                      variant="contained"
                      disabled={mutTransferencia.isPending || !transValido}
                      onClick={() => mutTransferencia.mutate(transForm)}
                      sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1e3a8a' } }}
                    >
                      {mutTransferencia.isPending ? 'Registrando...' : 'Registrar Transferencia'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right: Transferencias Recientes */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Transferencias Recientes
                  </Typography>

                  {transferenciasQuery.isError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Error al cargar las transferencias
                    </Alert>
                  )}

                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(WMS_COLOR, 0.08) }}>
                          <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Origen</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Destino</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">
                            Cantidad
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Notas</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transferenciasQuery.isLoading
                          ? Array.from({ length: 5 }).map((_, idx) => (
                              <TableRow key={idx}>
                                {Array.from({ length: 6 }).map((__, ci) => (
                                  <TableCell key={ci}>
                                    <Skeleton variant="text" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          : transferencias.map((t) => (
                              <TableRow key={t.id} hover>
                                <TableCell>{t.producto?.nombre ?? `#${t.producto_id}`}</TableCell>
                                <TableCell>{ubicacionLabel(t.ubicacion_origen_id)}</TableCell>
                                <TableCell>{ubicacionLabel(t.ubicacion_destino_id)}</TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={600}>
                                    {t.cantidad}
                                  </Typography>
                                </TableCell>
                                <TableCell>{formatDate(t.created_at)}</TableCell>
                                <TableCell>{t.notas ?? '-'}</TableCell>
                              </TableRow>
                            ))}
                        {!transferenciasQuery.isLoading && transferencias.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography color="text.secondary" py={2}>
                                Sin transferencias registradas
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3 — Conteos de Inventario                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 3 && (
          <Box>
            {/* Header row */}
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" fontWeight={700}>
                Conteos de Inventario
              </Typography>
              <Button
                variant="contained"
                onClick={() => setOpenConteoDialog(true)}
                sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1e3a8a' } }}
              >
                Nuevo Conteo
              </Button>
            </Box>

            {conteosQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error al cargar los conteos
              </Alert>
            )}

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(WMS_COLOR, 0.08) }}>
                      <TableCell sx={{ width: 48 }} />
                      <TableCell sx={{ fontWeight: 700 }}>Almacén</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha Programada</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Operario</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conteosQuery.isLoading
                      ? Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            {Array.from({ length: 7 }).map((__, ci) => (
                              <TableCell key={ci}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : conteos.map((conteo) => (
                          <>
                            <TableRow key={conteo.id} hover>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setExpandedConteo(
                                      expandedConteo === conteo.id ? null : conteo.id
                                    )
                                  }
                                >
                                  {expandedConteo === conteo.id ? (
                                    <KeyboardArrowUpIcon fontSize="small" />
                                  ) : (
                                    <KeyboardArrowDownIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell>{conteo.almacen_nombre}</TableCell>
                              <TableCell>
                                <Chip
                                  label={conteo.tipo}
                                  size="small"
                                  color={tipoBadgeColor(conteo.tipo) as 'primary' | 'success' | 'secondary' | 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={conteo.estado}
                                  size="small"
                                  color={estadoBadgeColor(conteo.estado)}
                                />
                              </TableCell>
                              <TableCell>{formatDate(conteo.fecha_programada)}</TableCell>
                              <TableCell>{conteo.operario_nombre ?? '-'}</TableCell>
                              <TableCell>
                                {(conteo.estado === 'EN_PROCESO' ||
                                  conteo.estado === 'PROGRAMADO') && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    disabled={mutCompletarConteo.isPending}
                                    onClick={() => mutCompletarConteo.mutate(conteo.id)}
                                  >
                                    Completar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Expandable detail row */}
                            <TableRow key={`detail-${conteo.id}`}>
                              <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                                <Collapse
                                  in={expandedConteo === conteo.id}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box
                                    sx={{
                                      bgcolor: alpha(WMS_COLOR, 0.03),
                                      p: 2,
                                      borderTop: `1px solid ${alpha(WMS_COLOR, 0.15)}`,
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight={700}
                                      mb={1}
                                      color={WMS_COLOR}
                                    >
                                      Detalle del Conteo
                                    </Typography>
                                    {conteo.detalle && conteo.detalle.length > 0 ? (
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Producto</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Ubicación</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">
                                              Sistema
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">
                                              Física
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">
                                              Diferencia
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {conteo.detalle.map((d) => (
                                            <TableRow key={d.id}>
                                              <TableCell>{d.producto_nombre}</TableCell>
                                              <TableCell>{d.ubicacion_codigo}</TableCell>
                                              <TableCell align="right">
                                                {d.cantidad_sistema}
                                              </TableCell>
                                              <TableCell align="right">
                                                {d.cantidad_fisica ?? '-'}
                                              </TableCell>
                                              <TableCell align="right">
                                                {d.diferencia !== null && d.diferencia !== 0 ? (
                                                  <Chip
                                                    label={d.diferencia}
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                  />
                                                ) : (
                                                  <Chip
                                                    icon={<CheckIcon />}
                                                    label="OK"
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                  />
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : (
                                      <Typography color="text.secondary" variant="body2">
                                        Sin detalle disponible
                                      </Typography>
                                    )}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </>
                        ))}

                    {!conteosQuery.isLoading && conteos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" py={2}>
                            Sin conteos registrados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Nuevo Conteo                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openConteoDialog}
          onClose={() => setOpenConteoDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Conteo de Inventario</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Almacén</InputLabel>
                <Select
                  label="Almacén"
                  value={conteoForm.almacen_id}
                  onChange={(e) =>
                    setConteoForm((f) => ({ ...f, almacen_id: e.target.value }))
                  }
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {almacenes.map((a) => (
                    <MenuItem key={a.id} value={String(a.id)}>
                      {a.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={conteoForm.tipo}
                  onChange={(e) =>
                    setConteoForm((f) => ({ ...f, tipo: e.target.value }))
                  }
                >
                  <MenuItem value="CICLICO">Cíclico</MenuItem>
                  <MenuItem value="GENERAL">General</MenuItem>
                  <MenuItem value="DIRIGIDO">Dirigido</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Fecha Programada"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={conteoForm.fecha_programada}
                onChange={(e) =>
                  setConteoForm((f) => ({ ...f, fecha_programada: e.target.value }))
                }
              />

              <TextField
                fullWidth
                size="small"
                label="Notas"
                multiline
                rows={3}
                value={conteoForm.notas}
                onChange={(e) =>
                  setConteoForm((f) => ({ ...f, notas: e.target.value }))
                }
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenConteoDialog(false)}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={mutConteo.isPending}
              onClick={() => mutConteo.mutate(conteoForm)}
              sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1e3a8a' } }}
            >
              {mutConteo.isPending ? 'Creando...' : 'Crear Conteo'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
