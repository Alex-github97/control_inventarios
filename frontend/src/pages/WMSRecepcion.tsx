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
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add,
  Search,
  CheckCircleOutline,
  DeleteOutline,
  MoveToInbox,
  OutboundOutlined,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const WMS_COLOR = '#1E40AF'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Proveedor {
  id: number
  nombre: string
}

interface Almacen {
  id: number
  nombre: string
}

interface Producto {
  id: number
  nombre: string
  sku: string
  requiere_lote?: boolean
}

interface Zona {
  id: number
  nombre?: string
  almacen_id: number
}

interface Ubicacion {
  id: number
  codigo: string
  pasillo?: string
  estanteria?: string
  nivel?: string
  posicion?: string
  zona_id: number
}

interface Lote {
  id: number
  numero_lote?: string
  codigo?: string
}

interface LineaOC {
  producto_id: number
  cantidad_solicitada: number
  precio_unitario: number
  unidad_medida: string
}

const UNIDADES_MEDIDA = ['UNIDAD', 'CAJA', 'PALLET', 'KG', 'LITRO', 'METRO', 'PAQUETE', 'DOCENA']

interface OrdenCompraDetalle {
  producto?: { sku?: string; nombre?: string }
  cantidad_solicitada?: number
  cantidad_recibida?: number
  precio_unitario?: number
  unidad_medida?: string
}

interface OrdenCompra {
  id: number
  numero_oc: string
  proveedor_id: number
  proveedor_nombre: string
  proveedor?: { nombre?: string }
  almacen_id: number
  almacen?: { nombre?: string }
  fecha_emision: string
  fecha_esperada: string
  estado: 'PENDIENTE' | 'PARCIAL' | 'COMPLETA' | 'CANCELADA'
  notas: string
  lineas?: LineaOC[]
  detalles?: OrdenCompraDetalle[]
}

interface LineaRecepcion {
  producto_id: number
  cantidad_esperada: number
  cantidad_recibida: number
  lote_id: number | null
  ubicacion_id: number | null
  estado_calidad: 'APROBADO' | 'RECHAZADO' | 'CUARENTENA' | 'INSPECCION'
  notas: string
}

interface RecepcionDetalle {
  producto?: { sku?: string; nombre?: string }
  lote?: { numero_lote?: string }
  cantidad_esperada?: number
  cantidad_recibida?: number
  ubicacion?: { codigo?: string }
  estado_calidad?: string
}

interface Recepcion {
  id: number
  numero_recepcion: string
  tipo: string
  orden_compra_id: number | null
  numero_oc?: string
  almacen_id: number
  almacen_nombre: string
  almacen?: { nombre?: string }
  fecha_recepcion: string
  estado: string
  operario: string
  notas: string
  detalles?: RecepcionDetalle[]
}

// ─── Empty form shapes ────────────────────────────────────────────────────────

const EMPTY_OC = {
  numero_oc: '',
  proveedor_id: '',
  almacen_id: '',
  fecha_emision: format(new Date(), 'yyyy-MM-dd'),
  fecha_esperada: '',
  notas: '',
}

const EMPTY_LINEA_OC: LineaOC = {
  producto_id: 0,
  cantidad_solicitada: 1,
  precio_unitario: 0,
  unidad_medida: 'UNIDAD',
}

const EMPTY_RECEPCION = {
  numero_recepcion: '',
  tipo: 'CONTRA_OC' as string,
  orden_compra_id: '' as string | number,
  almacen_id: '',
  fecha_recepcion: format(new Date(), 'yyyy-MM-dd'),
  notas: '',
}

const EMPTY_LINEA_REC: LineaRecepcion = {
  producto_id: 0,
  cantidad_esperada: 1,
  cantidad_recibida: 0,
  lote_id: null,
  ubicacion_id: null,
  estado_calidad: 'APROBADO',
  notas: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte el `detail` de un error de axios/FastAPI en un texto legible.
 *  Un 422 de FastAPI trae `detail` como arreglo de objetos `{ msg, loc, ... }`. */
function parseApiError(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join('; ')
  }
  if (typeof detail === 'string') return detail
  if (detail) return JSON.stringify(detail)
  return fallback
}

/** Formatea una fecha de forma segura; null/undefined/invalid → '—'. */
function fmtFecha(x?: string | null): string {
  if (!x) return '—'
  const d = new Date(x)
  if (isNaN(d.getTime())) return '—'
  return format(d, 'dd MMM yyyy', { locale: es })
}

/** Par etiqueta/valor uniforme para las cabeceras de los diálogos de detalle. */
function DetalleCampo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.primary', mt: 0.25 }}>{value ?? '—'}</Typography>
    </Box>
  )
}

/** Encabezado de sección uniforme para los diálogos de detalle. */
function SeccionTitulo({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary' }}
    >
      {children}
    </Typography>
  )
}

// ─── Chips ────────────────────────────────────────────────────────────────────

const OC_ESTADO_COLOR: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
  PENDIENTE: 'primary',
  PARCIAL: 'warning',
  COMPLETA: 'success',
  CANCELADA: 'default',
}

const REC_ESTADO_COLOR: Record<string, 'primary' | 'info' | 'warning' | 'success' | 'default' | 'error'> = {
  BORRADOR: 'default',
  EN_PROCESO: 'info',
  COMPLETA: 'success',
  RECHAZADA: 'error',
}

const CALIDAD_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  APROBADO: 'success',
  RECHAZADO: 'error',
  CUARENTENA: 'warning',
  INSPECCION: 'info',
}

// ─── Tab 1: Órdenes de Compra ─────────────────────────────────────────────────

function OrdenesCompraTab() {
  const queryClient = useQueryClient()

  // Filters
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('TODOS')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  // Dialog
  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_OC })
  const [lineas, setLineas] = useState<LineaOC[]>([])
  const [formError, setFormError] = useState('')

  // Detail dialog
  const [detalleOC, setDetalleOC] = useState<OrdenCompra | null>(null)

  // Queries
  const { data: ordenes = [], isLoading } = useQuery<OrdenCompra[]>({
    queryKey: ['wms-ordenes-compra'],
    queryFn: () => api.get('/wms/ordenes-compra/').then((r) => r.data),
  })

  const { data: proveedores = [] } = useQuery<Proveedor[]>({
    queryKey: ['wms-proveedores'],
    queryFn: () => api.get('/wms/proveedores/').then((r) => r.data),
  })

  const { data: almacenes = [] } = useQuery<Almacen[]>({
    queryKey: ['wms-almacenes'],
    queryFn: () => api.get('/wms/almacenes/').then((r) => r.data),
  })

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['wms-productos'],
    queryFn: () => api.get('/wms/productos/').then((r) => r.data),
  })

  // Mutation
  const createOC = useMutation({
    mutationFn: (data: any) => api.post('/wms/ordenes-compra/', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Orden de compra creada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['wms-ordenes-compra'] })
      handleClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Error al crear la orden'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // Filtered rows
  const filtered = ordenes.filter((o) => {
    const matchSearch =
      !search ||
      o.numero_oc.toLowerCase().includes(search.toLowerCase()) ||
      o.proveedor_nombre?.toLowerCase().includes(search.toLowerCase())
    const matchEstado = estadoFilter === 'TODOS' || o.estado === estadoFilter
    return matchSearch && matchEstado
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  function handleClose() {
    if (createOC.isPending) return
    setOpenDialog(false)
    setForm({ ...EMPTY_OC })
    setLineas([])
    setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!form.proveedor_id || !form.almacen_id || !form.fecha_esperada) {
      setFormError('Proveedor, almacén y fecha esperada son obligatorios')
      return
    }
    const validas = lineas.filter((l) => l.producto_id > 0 && l.cantidad_solicitada > 0)
    if (validas.length === 0) {
      setFormError('Agrega al menos un artículo con producto y cantidad válidos')
      return
    }
    const detalles = validas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad_solicitada: Number(l.cantidad_solicitada),
      precio_unitario: Number(l.precio_unitario) || 0,
      unidad_medida: l.unidad_medida || 'UNIDAD',
    }))
    createOC.mutate({
      numero_oc: form.numero_oc || undefined,
      proveedor_id: Number(form.proveedor_id),
      almacen_id: Number(form.almacen_id),
      fecha_emision: form.fecha_emision || undefined,
      fecha_esperada: form.fecha_esperada || undefined,
      notas: form.notas || undefined,
      detalles,
    })
  }

  function addLinea() {
    setLineas((prev) => [...prev, { ...EMPTY_LINEA_OC }])
  }

  function updateLinea(idx: number, field: keyof LineaOC, value: any) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  function removeLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar N° OC o proveedor…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={estadoFilter}
            label="Estado"
            onChange={(e) => { setEstadoFilter(e.target.value); setPage(0) }}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="PENDIENTE">Pendiente</MenuItem>
            <MenuItem value="PARCIAL">Parcial</MenuItem>
            <MenuItem value="COMPLETA">Completa</MenuItem>
            <MenuItem value="CANCELADA">Cancelada</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: alpha(WMS_COLOR, 0.85) } }}
        >
          Nueva OC
        </Button>
      </Stack>

      {/* Table */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F9FAFB', '& th': { fontSize: 12, fontWeight: 700, color: 'text.secondary', py: 1.5 } }}>
                <TableCell>N° OC</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Fecha Emisión</TableCell>
                <TableCell>Fecha Esperada</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1 }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginated.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: 13 }}>
                      No se encontraron órdenes de compra
                    </TableCell>
                  </TableRow>
                )
                : paginated.map((o) => (
                  <TableRow
                    key={o.id}
                    hover
                    onClick={() => setDetalleOC(o)}
                    sx={{ cursor: 'pointer', '& td': { fontSize: 12, py: 1 } }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: WMS_COLOR }}>{o.numero_oc}</TableCell>
                    <TableCell>{o.proveedor_nombre}</TableCell>
                    <TableCell>
                      {o.fecha_emision ? format(new Date(o.fecha_emision), 'dd MMM yyyy', { locale: es }) : '—'}
                    </TableCell>
                    <TableCell>
                      {o.fecha_esperada ? format(new Date(o.fecha_esperada), 'dd MMM yyyy', { locale: es }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={o.estado}
                        size="small"
                        color={OC_ESTADO_COLOR[o.estado] ?? 'default'}
                        sx={{ fontSize: 11, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.notas || '—'}
                    </TableCell>
                  </TableRow>
                ))
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
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ fontSize: 12 }}
        />
      </Card>

      {/* ── Create OC Dialog ───────────────────────────────────────────── */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 0.5 }}>
          Nueva Orden de Compra
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
            Registra los artículos solicitados al proveedor y su fecha esperada de llegada
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Grid container spacing={2.5} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="N° OC (dejar vacío para autoasignar)"
                fullWidth
                size="small"
                value={form.numero_oc}
                onChange={(e) => setForm((f) => ({ ...f, numero_oc: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Proveedor *</InputLabel>
                <Select
                  value={form.proveedor_id}
                  label="Proveedor *"
                  onChange={(e) => setForm((f) => ({ ...f, proveedor_id: e.target.value as string }))}
                >
                  {proveedores.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Almacén *</InputLabel>
                <Select
                  value={form.almacen_id}
                  label="Almacén *"
                  onChange={(e) => setForm((f) => ({ ...f, almacen_id: e.target.value as string }))}
                >
                  {almacenes.map((a) => (
                    <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fecha Emisión"
                type="date"
                fullWidth
                size="small"
                value={form.fecha_emision}
                onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fecha Esperada *"
                type="date"
                fullWidth
                size="small"
                value={form.fecha_esperada}
                onChange={(e) => setForm((f) => ({ ...f, fecha_esperada: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notas"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </Grid>

            {/* Line items */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ mb: 1.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
                  Artículos
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={addLinea}>
                  Agregar artículo
                </Button>
              </Stack>
              {lineas.length === 0 ? (
                <Typography fontSize={12} color="text.secondary" align="center" sx={{ py: 2 }}>
                  Sin artículos. Haz clic en "Agregar artículo" para añadir.
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5 }}>
                  {lineas.map((l, idx) => (
                    <Box
                      key={idx}
                      sx={{ p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" fontWeight={700}>Línea {idx + 1}</Typography>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => removeLinea(idx)}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl size="small" fullWidth>
                            <InputLabel>Producto</InputLabel>
                            <Select
                              value={l.producto_id || ''}
                              label="Producto"
                              onChange={(e) => updateLinea(idx, 'producto_id', Number(e.target.value))}
                            >
                              {productos.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.nombre} ({p.sku})</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            label="Cantidad"
                            type="number"
                            size="small"
                            fullWidth
                            value={l.cantidad_solicitada}
                            onChange={(e) => updateLinea(idx, 'cantidad_solicitada', Number(e.target.value))}
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <FormControl size="small" fullWidth>
                            <InputLabel>Unidad</InputLabel>
                            <Select
                              value={l.unidad_medida}
                              label="Unidad"
                              onChange={(e) => updateLinea(idx, 'unidad_medida', e.target.value)}
                            >
                              {UNIDADES_MEDIDA.map((u) => (
                                <MenuItem key={u} value={u}>{u}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <TextField
                            label="Precio Unit."
                            type="number"
                            size="small"
                            fullWidth
                            value={l.precio_unitario}
                            onChange={(e) => updateLinea(idx, 'precio_unitario', Number(e.target.value))}
                            inputProps={{ min: 0, step: 0.01 }}
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 8 }}>
                          <TextField
                            label="Subtotal"
                            size="small"
                            fullWidth
                            value={`$ ${((Number(l.cantidad_solicitada) || 0) * (Number(l.precio_unitario) || 0)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { fontWeight: 600 } }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                  <Stack direction="row" justifyContent="flex-end" alignItems="baseline" spacing={1} sx={{ mt: 0.5, pr: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Total OC:</Typography>
                    <Typography fontWeight={700} color={WMS_COLOR}>
                      $ {lineas.reduce((acc, l) => acc + (Number(l.cantidad_solicitada) || 0) * (Number(l.precio_unitario) || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Grid>

            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error" sx={{ py: 0.5 }}>{formError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={createOC.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createOC.isPending}
            sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: alpha(WMS_COLOR, 0.85) } }}
          >
            {createOC.isPending ? 'Guardando...' : 'Crear OC'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail OC Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!detalleOC}
        onClose={() => setDetalleOC(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {detalleOC && (
          <>
            <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                <span>Orden de Compra {detalleOC.numero_oc}</span>
                <Chip
                  label={detalleOC.estado}
                  size="small"
                  color={OC_ESTADO_COLOR[detalleOC.estado] ?? 'default'}
                  sx={{ fontSize: 11, fontWeight: 600 }}
                />
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
              {/* Cabecera */}
              <SeccionTitulo>Información general</SeccionTitulo>
              <Grid container spacing={2} sx={{ mt: 0.5, mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo
                    label="Proveedor"
                    value={detalleOC.proveedor?.nombre ?? detalleOC.proveedor_nombre}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="Almacén" value={detalleOC.almacen?.nombre} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="Fecha Emisión" value={fmtFecha(detalleOC.fecha_emision)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="Fecha Esperada" value={fmtFecha(detalleOC.fecha_esperada)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <DetalleCampo label="Notas" value={detalleOC.notas || '—'} />
                </Grid>
              </Grid>

              {/* Artículos */}
              <Divider sx={{ mb: 2 }} />
              <SeccionTitulo>Artículos</SeccionTitulo>
              {!detalleOC.detalles || detalleOC.detalles.length === 0 ? (
                <Typography fontSize={12} color="text.secondary" sx={{ py: 2 }}>
                  Esta orden no tiene artículos registrados.
                </Typography>
              ) : (
                <Box sx={{ overflowX: 'auto', mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary' } }}>
                        <TableCell>Producto</TableCell>
                        <TableCell align="right">Solicitada</TableCell>
                        <TableCell align="right">Recibida</TableCell>
                        <TableCell>Unidad</TableCell>
                        <TableCell align="right">Precio Unit.</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detalleOC.detalles.map((d, i) => {
                        const cant = Number(d.cantidad_solicitada) || 0
                        const precio = Number(d.precio_unitario) || 0
                        return (
                          <TableRow key={i} sx={{ '& td': { fontSize: 12 } }}>
                            <TableCell>
                              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                {d.producto?.nombre ?? '—'}
                              </Typography>
                              {d.producto?.sku && (
                                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                  {d.producto.sku}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">{cant}</TableCell>
                            <TableCell align="right">{Number(d.cantidad_recibida) || 0}</TableCell>
                            <TableCell>{d.unidad_medida ?? '—'}</TableCell>
                            <TableCell align="right">
                              $ {precio.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              $ {(cant * precio).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <Stack direction="row" justifyContent="flex-end" alignItems="baseline" spacing={1} sx={{ mt: 1, pr: 1 }}>
                    <Typography variant="caption" color="text.secondary">Total OC:</Typography>
                    <Typography fontWeight={700} color={WMS_COLOR}>
                      $ {detalleOC.detalles.reduce((acc, d) => acc + (Number(d.cantidad_solicitada) || 0) * (Number(d.precio_unitario) || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDetalleOC(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Tab 2: Recepciones ───────────────────────────────────────────────────────

/** Fila del detalle de una recepción. Se extrae como componente para poder
 *  cargar los lotes del producto seleccionado con su propio `useQuery`. */
function LineaRecepcionRow({
  linea,
  index,
  productos,
  ubicaciones,
  onUpdate,
  onRemove,
}: {
  linea: LineaRecepcion
  index: number
  productos: Producto[]
  ubicaciones: Ubicacion[]
  onUpdate: (field: keyof LineaRecepcion, value: any) => void
  onRemove: () => void
}) {
  const producto = productos.find((p) => p.id === linea.producto_id)
  const requiereLote = !!producto?.requiere_lote

  const { data: lotes = [] } = useQuery<Lote[]>({
    queryKey: ['wms-lotes', linea.producto_id],
    queryFn: () => api.get(`/wms/lotes/?producto_id=${linea.producto_id}`).then((r) => r.data),
    enabled: requiereLote && linea.producto_id > 0,
  })

  return (
    <Box
      sx={{ p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="caption" fontWeight={700}>Línea {index + 1}</Typography>
        <Tooltip title="Eliminar línea">
          <IconButton size="small" color="error" onClick={onRemove}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Producto</InputLabel>
            <Select
              value={linea.producto_id || ''}
              label="Producto"
              onChange={(e) => {
                // Al cambiar de producto, se limpia el lote seleccionado.
                onUpdate('producto_id', Number(e.target.value))
                onUpdate('lote_id', null)
              }}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre} ({p.sku})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <TextField
            label="Cant. Esperada"
            type="number"
            size="small"
            fullWidth
            value={linea.cantidad_esperada}
            onChange={(e) => onUpdate('cantidad_esperada', Number(e.target.value))}
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <TextField
            label="Cant. Recibida"
            type="number"
            size="small"
            fullWidth
            value={linea.cantidad_recibida}
            onChange={(e) => onUpdate('cantidad_recibida', Number(e.target.value))}
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Ubicación</InputLabel>
            <Select
              value={linea.ubicacion_id ?? ''}
              label="Ubicación"
              onChange={(e) =>
                onUpdate('ubicacion_id', e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <MenuItem value=""><em>Por defecto del almacén</em></MenuItem>
              {ubicaciones.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.codigo}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {requiereLote && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Lote</InputLabel>
              <Select
                value={linea.lote_id ?? ''}
                label="Lote"
                onChange={(e) =>
                  onUpdate('lote_id', e.target.value === '' ? null : Number(e.target.value))
                }
              >
                <MenuItem value=""><em>Sin lote</em></MenuItem>
                {lotes.map((lt) => (
                  <MenuItem key={lt.id} value={lt.id}>
                    {lt.numero_lote ?? lt.codigo ?? `Lote #${lt.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Calidad</InputLabel>
            <Select
              value={linea.estado_calidad}
              label="Calidad"
              onChange={(e) => onUpdate('estado_calidad', e.target.value)}
            >
              {(['APROBADO', 'RECHAZADO', 'CUARENTENA', 'INSPECCION'] as const).map((s) => (
                <MenuItem key={s} value={s}>
                  <Chip
                    label={s}
                    size="small"
                    color={CALIDAD_COLOR[s]}
                    sx={{ fontSize: 10, fontWeight: 600, pointerEvents: 'none' }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: requiereLote ? 12 : 5 }}>
          <TextField
            label="Notas"
            size="small"
            fullWidth
            value={linea.notas}
            onChange={(e) => onUpdate('notas', e.target.value)}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

function RecepcionesTab() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_RECEPCION })
  const [lineas, setLineas] = useState<LineaRecepcion[]>([])
  const [formError, setFormError] = useState('')

  // Detail dialog
  const [detalleRec, setDetalleRec] = useState<Recepcion | null>(null)

  // Queries
  const { data: recepciones = [], isLoading } = useQuery<Recepcion[]>({
    queryKey: ['wms-recepciones'],
    queryFn: () => api.get('/wms/recepciones/').then((r) => r.data),
  })

  const { data: ordenesCompra = [] } = useQuery<OrdenCompra[]>({
    queryKey: ['wms-ordenes-compra'],
    queryFn: () => api.get('/wms/ordenes-compra/').then((r) => r.data),
  })

  const { data: almacenes = [] } = useQuery<Almacen[]>({
    queryKey: ['wms-almacenes'],
    queryFn: () => api.get('/wms/almacenes/').then((r) => r.data),
  })

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['wms-productos'],
    queryFn: () => api.get('/wms/productos/').then((r) => r.data),
  })

  // Zonas del almacén seleccionado (para acotar las ubicaciones disponibles)
  const { data: zonas = [] } = useQuery<Zona[]>({
    queryKey: ['wms-zonas', form.almacen_id],
    queryFn: () => api.get(`/wms/zonas/?almacen_id=${form.almacen_id}`).then((r) => r.data),
    enabled: !!form.almacen_id,
  })

  const { data: ubicaciones = [] } = useQuery<Ubicacion[]>({
    queryKey: ['wms-ubicaciones'],
    queryFn: () => api.get('/wms/ubicaciones/').then((r) => r.data),
  })

  // Ubicaciones filtradas por las zonas del almacén elegido; si aún no hay
  // zonas cargadas se ofrecen todas las ubicaciones para no bloquear al usuario.
  const zonaIds = new Set(zonas.map((z) => z.id))
  const ubicacionesFiltradas =
    zonas.length > 0 ? ubicaciones.filter((u) => zonaIds.has(u.zona_id)) : ubicaciones

  // Create recepcion
  const createRec = useMutation({
    mutationFn: (data: any) => api.post('/wms/recepciones/', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Recepción registrada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['wms-recepciones'] })
      queryClient.invalidateQueries({ queryKey: ['wms-kpis'] })
      handleClose()
    },
    onError: (err: any) => {
      setFormError(parseApiError(err, 'Error al registrar la recepción'))
    },
  })

  // Completar recepcion
  const completarRec = useMutation({
    mutationFn: (id: number) => api.post(`/wms/recepciones/${id}/completar`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Recepción completada — stock actualizado')
      queryClient.invalidateQueries({ queryKey: ['wms-recepciones'] })
      queryClient.invalidateQueries({ queryKey: ['wms-kpis'] })
    },
    onError: (err: any) => {
      toast.error(parseApiError(err, 'Error al completar la recepción'))
    },
  })

  const filtered = recepciones.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.numero_recepcion?.toLowerCase().includes(q) ||
      r.almacen_nombre?.toLowerCase().includes(q) ||
      r.operario?.toLowerCase().includes(q) ||
      r.numero_oc?.toLowerCase().includes(q)
    )
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  function handleClose() {
    if (createRec.isPending) return
    setOpenDialog(false)
    setForm({ ...EMPTY_RECEPCION })
    setLineas([])
    setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!form.almacen_id) {
      setFormError('El almacén es obligatorio')
      return
    }
    if (lineas.length === 0) {
      setFormError('Agrega al menos una línea de recepción')
      return
    }
    for (const l of lineas) {
      if (!(Number(l.producto_id) > 0)) {
        setFormError('Cada línea debe tener un producto seleccionado')
        return
      }
      if (!(Number(l.cantidad_recibida) > 0) && !(Number(l.cantidad_esperada) > 0)) {
        setFormError('Cada línea debe tener cantidad recibida o esperada mayor a 0')
        return
      }
    }

    const detalles = lineas.map((l) => ({
      producto_id: Number(l.producto_id),
      cantidad_esperada: Number(l.cantidad_esperada) || 0,
      cantidad_recibida: Number(l.cantidad_recibida) || 0,
      lote_id: l.lote_id != null ? Number(l.lote_id) : null,
      ubicacion_id: l.ubicacion_id != null ? Number(l.ubicacion_id) : null,
      estado_calidad: l.estado_calidad,
      notas: l.notas || '',
    }))

    const payload: any = {
      tipo: form.tipo,
      almacen_id: Number(form.almacen_id),
      orden_compra_id: form.orden_compra_id ? Number(form.orden_compra_id) : null,
      fecha_recepcion: form.fecha_recepcion || undefined,
      notas: form.notas || '',
      detalles,
    }
    // El backend autogenera el número si va vacío; sólo lo enviamos si el usuario lo llenó.
    if (form.numero_recepcion.trim()) {
      payload.numero_recepcion = form.numero_recepcion.trim()
    }

    createRec.mutate(payload)
  }

  function addLinea() {
    setLineas((prev) => [...prev, { ...EMPTY_LINEA_REC }])
  }

  function updateLinea(idx: number, field: keyof LineaRecepcion, value: any) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  function removeLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar recepción, almacén u operario…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: alpha(WMS_COLOR, 0.85) } }}
        >
          Nueva Recepción
        </Button>
      </Stack>

      {/* Table */}
      <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F9FAFB', '& th': { fontSize: 12, fontWeight: 700, color: 'text.secondary', py: 1.5 } }}>
                <TableCell>N° Recepción</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>OC Referencia</TableCell>
                <TableCell>Almacén</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Operario</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1 }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginated.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: 13 }}>
                      No se encontraron recepciones
                    </TableCell>
                  </TableRow>
                )
                : paginated.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    onClick={() => setDetalleRec(r)}
                    sx={{ cursor: 'pointer', '& td': { fontSize: 12, py: 1 } }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: WMS_COLOR }}>{r.numero_recepcion}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.tipo}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10, fontWeight: 600, borderColor: WMS_COLOR, color: WMS_COLOR }}
                      />
                    </TableCell>
                    <TableCell>{r.numero_oc || '—'}</TableCell>
                    <TableCell>{r.almacen_nombre}</TableCell>
                    <TableCell>
                      {r.fecha_recepcion ? format(new Date(r.fecha_recepcion), 'dd MMM yyyy', { locale: es }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.estado}
                        size="small"
                        color={REC_ESTADO_COLOR[r.estado] ?? 'default'}
                        sx={{ fontSize: 11, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>{r.operario || '—'}</TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      {r.estado !== 'COMPLETA' && r.estado !== 'RECHAZADA' && (
                        <Tooltip title="Completar Recepción">
                          <IconButton
                            size="small"
                            color="success"
                            disabled={completarRec.isPending}
                            onClick={(e) => { e.stopPropagation(); completarRec.mutate(r.id) }}
                          >
                            <CheckCircleOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ fontSize: 12 }}
        />
      </Card>

      {/* ── Create Recepcion Dialog ────────────────────────────────────── */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 0.5 }}>
          Nueva Recepción
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
            Registra los artículos recibidos y su ubicación en bodega
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Grid container spacing={2.5} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="N° Recepción (dejar vacío para autoasignar)"
                fullWidth
                size="small"
                value={form.numero_recepcion}
                onChange={(e) => setForm((f) => ({ ...f, numero_recepcion: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select
                  value={form.tipo}
                  label="Tipo *"
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  <MenuItem value="CONTRA_OC">Contra OC</MenuItem>
                  <MenuItem value="ASN">ASN</MenuItem>
                  <MenuItem value="CIEGA">Ciega</MenuItem>
                  <MenuItem value="PARCIAL">Parcial</MenuItem>
                  <MenuItem value="CONSOLIDADA">Consolidada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Orden de Compra (opcional)</InputLabel>
                <Select
                  value={form.orden_compra_id}
                  label="Orden de Compra (opcional)"
                  onChange={(e) => setForm((f) => ({ ...f, orden_compra_id: e.target.value }))}
                >
                  <MenuItem value=""><em>Sin OC asociada</em></MenuItem>
                  {ordenesCompra
                    .filter((o) => o.estado !== 'CANCELADA' && o.estado !== 'COMPLETA')
                    .map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.numero_oc} — {o.proveedor_nombre}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Almacén *</InputLabel>
                <Select
                  value={form.almacen_id}
                  label="Almacén *"
                  onChange={(e) => setForm((f) => ({ ...f, almacen_id: e.target.value as string }))}
                >
                  {almacenes.map((a) => (
                    <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fecha Recepción *"
                type="date"
                fullWidth
                size="small"
                value={form.fecha_recepcion}
                onChange={(e) => setForm((f) => ({ ...f, fecha_recepcion: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notas"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </Grid>

            {/* Detail lines */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ mb: 1.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
                  Artículos
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={addLinea}>
                  Agregar línea
                </Button>
              </Stack>
              {lineas.length === 0 ? (
                <Typography fontSize={12} color="text.secondary" align="center" sx={{ py: 2 }}>
                  Sin líneas. Haz clic en "Agregar línea" para añadir artículos recibidos.
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 0.5 }}>
                  {lineas.map((l, idx) => (
                    <LineaRecepcionRow
                      key={idx}
                      index={idx}
                      linea={l}
                      productos={productos}
                      ubicaciones={ubicacionesFiltradas}
                      onUpdate={(field, value) => updateLinea(idx, field, value)}
                      onRemove={() => removeLinea(idx)}
                    />
                  ))}
                </Box>
              )}
            </Grid>

            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error" sx={{ py: 0.5 }}>{formError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={createRec.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createRec.isPending}
            sx={{ bgcolor: WMS_COLOR, '&:hover': { bgcolor: alpha(WMS_COLOR, 0.85) } }}
          >
            {createRec.isPending ? 'Guardando...' : 'Crear Recepción'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail Recepcion Dialog ────────────────────────────────────── */}
      <Dialog
        open={!!detalleRec}
        onClose={() => setDetalleRec(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {detalleRec && (
          <>
            <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                <span>Recepción {detalleRec.numero_recepcion}</span>
                <Chip
                  label={detalleRec.estado}
                  size="small"
                  color={REC_ESTADO_COLOR[detalleRec.estado] ?? 'default'}
                  sx={{ fontSize: 11, fontWeight: 600 }}
                />
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
              {/* Cabecera */}
              <SeccionTitulo>Información general</SeccionTitulo>
              <Grid container spacing={2} sx={{ mt: 0.5, mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="Tipo" value={detalleRec.tipo} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="OC Referencia" value={detalleRec.numero_oc || '—'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo
                    label="Almacén"
                    value={detalleRec.almacen?.nombre ?? detalleRec.almacen_nombre}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="Fecha Recepción" value={fmtFecha(detalleRec.fecha_recepcion)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetalleCampo label="Operario" value={detalleRec.operario || '—'} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <DetalleCampo label="Notas" value={detalleRec.notas || '—'} />
                </Grid>
              </Grid>

              {/* Artículos */}
              <Divider sx={{ mb: 2 }} />
              <SeccionTitulo>Artículos</SeccionTitulo>
              {!detalleRec.detalles || detalleRec.detalles.length === 0 ? (
                <Typography fontSize={12} color="text.secondary" sx={{ py: 2 }}>
                  Esta recepción no tiene artículos registrados.
                </Typography>
              ) : (
                <Box sx={{ overflowX: 'auto', mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary' } }}>
                        <TableCell>Producto</TableCell>
                        <TableCell>Lote</TableCell>
                        <TableCell align="right">Esperada</TableCell>
                        <TableCell align="right">Recibida</TableCell>
                        <TableCell>Ubicación</TableCell>
                        <TableCell>Calidad</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detalleRec.detalles.map((d, i) => (
                        <TableRow key={i} sx={{ '& td': { fontSize: 12 } }}>
                          <TableCell>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                              {d.producto?.nombre ?? '—'}
                            </Typography>
                            {d.producto?.sku && (
                              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                {d.producto.sku}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{d.lote?.numero_lote ?? '—'}</TableCell>
                          <TableCell align="right">{Number(d.cantidad_esperada) || 0}</TableCell>
                          <TableCell align="right">{Number(d.cantidad_recibida) || 0}</TableCell>
                          <TableCell>{d.ubicacion?.codigo ?? '—'}</TableCell>
                          <TableCell>
                            {d.estado_calidad ? (
                              <Chip
                                label={d.estado_calidad}
                                size="small"
                                color={CALIDAD_COLOR[d.estado_calidad] ?? 'default'}
                                sx={{ fontSize: 10, fontWeight: 600 }}
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDetalleRec(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WMSRecepcion() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="WMS — Recepción de Mercancía">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: alpha(WMS_COLOR, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoveToInbox sx={{ color: WMS_COLOR, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontSize={22} fontWeight={800} color="text.primary">
              Recepción de Mercancía
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              Gestión de órdenes de compra y recepciones en almacén
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
                '& .Mui-selected': { color: WMS_COLOR },
                '& .MuiTabs-indicator': { bgcolor: WMS_COLOR },
              }}
            >
              <Tab
                icon={<OutboundOutlined sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Órdenes de Compra"
              />
              <Tab
                icon={<MoveToInbox sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Recepciones"
              />
            </Tabs>
          </Box>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {tab === 0 && <OrdenesCompraTab />}
            {tab === 1 && <RecepcionesTab />}
          </CardContent>
        </Card>

      </Box>
    </Layout>
  )
}
