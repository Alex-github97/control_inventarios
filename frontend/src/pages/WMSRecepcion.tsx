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
  Grid,
  Stack,
  Tab,
  Tabs,
  alpha,
  Divider,
  InputAdornment,
} from '@mui/material'
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
}

interface LineaOC {
  producto_id: number
  cantidad_solicitada: number
  precio_unitario: number
}

interface OrdenCompra {
  id: number
  numero_oc: string
  proveedor_id: number
  proveedor_nombre: string
  almacen_id: number
  fecha_emision: string
  fecha_esperada: string
  estado: 'PENDIENTE' | 'PARCIAL' | 'COMPLETA' | 'CANCELADA'
  notas: string
  lineas?: LineaOC[]
}

interface LineaRecepcion {
  producto_id: number
  cantidad_esperada: number
  cantidad_recibida: number
  estado_calidad: 'APROBADO' | 'RECHAZADO' | 'CUARENTENA' | 'INSPECCION'
  notas: string
}

interface Recepcion {
  id: number
  numero_recepcion: string
  tipo: string
  orden_compra_id: number | null
  numero_oc?: string
  almacen_id: number
  almacen_nombre: string
  fecha_recepcion: string
  estado: string
  operario: string
  notas: string
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
}

const EMPTY_RECEPCION = {
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
  estado_calidad: 'APROBADO',
  notas: '',
}

// ─── Chips ────────────────────────────────────────────────────────────────────

const OC_ESTADO_COLOR: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
  PENDIENTE: 'primary',
  PARCIAL: 'warning',
  COMPLETA: 'success',
  CANCELADA: 'default',
}

const REC_ESTADO_COLOR: Record<string, 'primary' | 'warning' | 'success' | 'default' | 'error'> = {
  PENDIENTE: 'primary',
  EN_PROCESO: 'warning',
  COMPLETADA: 'success',
  CANCELADA: 'default',
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
    createOC.mutate({
      ...form,
      proveedor_id: Number(form.proveedor_id),
      almacen_id: Number(form.almacen_id),
      lineas,
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
                  <TableRow key={o.id} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
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
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Orden de Compra</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
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
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography fontSize={13} fontWeight={700}>Artículos de la OC</Typography>
                <Button size="small" startIcon={<Add />} onClick={addLinea}>
                  Agregar artículo
                </Button>
              </Stack>
              {lineas.length === 0 && (
                <Typography fontSize={12} color="text.secondary" sx={{ mb: 1 }}>
                  Sin artículos. Haz clic en "Agregar artículo" para añadir.
                </Typography>
              )}
              {lineas.map((l, idx) => (
                <Stack key={idx} direction="row" spacing={1} mb={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 200 }}>
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
                  <TextField
                    label="Cantidad"
                    type="number"
                    size="small"
                    sx={{ width: 110 }}
                    value={l.cantidad_solicitada}
                    onChange={(e) => updateLinea(idx, 'cantidad_solicitada', Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    label="Precio Unit."
                    type="number"
                    size="small"
                    sx={{ width: 130 }}
                    value={l.precio_unitario}
                    onChange={(e) => updateLinea(idx, 'precio_unitario', Number(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => removeLinea(idx)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
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
    </Box>
  )
}

// ─── Tab 2: Recepciones ───────────────────────────────────────────────────────

function RecepcionesTab() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  const [openDialog, setOpenDialog] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_RECEPCION })
  const [lineas, setLineas] = useState<LineaRecepcion[]>([])
  const [formError, setFormError] = useState('')

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
      const msg = err?.response?.data?.detail ?? 'Error al registrar la recepción'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
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
      const msg = err?.response?.data?.detail ?? 'Error al completar la recepción'
      toast.error(typeof msg === 'string' ? msg : 'Error al completar')
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
    if (!form.almacen_id || !form.fecha_recepcion) {
      setFormError('Almacén y fecha de recepción son obligatorios')
      return
    }
    createRec.mutate({
      ...form,
      almacen_id: Number(form.almacen_id),
      orden_compra_id: form.orden_compra_id ? Number(form.orden_compra_id) : null,
      detalles: lineas,
    })
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
                  <TableRow key={r.id} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
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
                    <TableCell align="center">
                      {r.estado !== 'COMPLETADA' && r.estado !== 'CANCELADA' && (
                        <Tooltip title="Completar Recepción">
                          <IconButton
                            size="small"
                            color="success"
                            disabled={completarRec.isPending}
                            onClick={() => completarRec.mutate(r.id)}
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
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Recepción</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
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
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography fontSize={13} fontWeight={700}>Detalle de artículos</Typography>
                <Button size="small" startIcon={<Add />} onClick={addLinea}>
                  Agregar línea
                </Button>
              </Stack>
              {lineas.length === 0 && (
                <Typography fontSize={12} color="text.secondary" mb={1}>
                  Sin líneas. Haz clic en "Agregar línea" para añadir artículos recibidos.
                </Typography>
              )}
              {lineas.map((l, idx) => (
                <Box
                  key={idx}
                  sx={{
                    mb: 1.5,
                    p: 1.5,
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    bgcolor: '#FAFAFA',
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
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
                    <TextField
                      label="Cant. Esperada"
                      type="number"
                      size="small"
                      sx={{ width: 130 }}
                      value={l.cantidad_esperada}
                      onChange={(e) => updateLinea(idx, 'cantidad_esperada', Number(e.target.value))}
                      inputProps={{ min: 0 }}
                    />
                    <TextField
                      label="Cant. Recibida"
                      type="number"
                      size="small"
                      sx={{ width: 130 }}
                      value={l.cantidad_recibida}
                      onChange={(e) => updateLinea(idx, 'cantidad_recibida', Number(e.target.value))}
                      inputProps={{ min: 0 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Calidad</InputLabel>
                      <Select
                        value={l.estado_calidad}
                        label="Calidad"
                        onChange={(e) => updateLinea(idx, 'estado_calidad', e.target.value)}
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
                    <TextField
                      label="Notas"
                      size="small"
                      sx={{ flexGrow: 1, minWidth: 120 }}
                      value={l.notas}
                      onChange={(e) => updateLinea(idx, 'notas', e.target.value)}
                    />
                    <Tooltip title="Eliminar línea">
                      <IconButton size="small" color="error" onClick={() => removeLinea(idx)}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
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
