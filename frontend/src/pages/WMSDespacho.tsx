import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Tooltip, CircularProgress, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse,
  Switch, FormControlLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  LocalShipping as TruckIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Inbox as InboxIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  AssignmentReturn as ReturnIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const WMS_COLOR = '#1E40AF'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Orden { id: number; numero_orden: string; estado: string }
interface Transportadora { id: number; nombre: string; codigo?: string }
interface Despacho {
  id: number
  numero_despacho: string
  orden_numero: string
  transportadora_nombre?: string
  vehiculo_placa?: string
  conductor_nombre?: string
  fecha_despacho?: string
  fecha_entrega_estimada?: string
  estado: 'PREPARANDO' | 'LISTO' | 'EN_TRANSITO' | 'ENTREGADO' | 'INCIDENCIA'
  peso_total_kg?: number
  notas?: string
}
interface Devolucion {
  id: number
  numero_devolucion: string
  tipo: 'CLIENTE' | 'PROVEEDOR'
  estado: string
  motivo?: string
  fecha_recepcion?: string
}
interface Almacen { id: number; nombre: string }
interface Cliente { id: number; nombre: string }
interface Proveedor { id: number; nombre: string }

// ─── Estado chip ───────────────────────────────────────────────────────────────
const ESTADO_CFG = {
  PREPARANDO:  { label: 'Preparando',   color: '#1E40AF', bg: '#DBEAFE' },
  LISTO:       { label: 'Listo',        color: '#92400E', bg: '#FEF3C7' },
  EN_TRANSITO: { label: 'En tránsito',  color: '#9A3412', bg: '#FFEDD5' },
  ENTREGADO:   { label: 'Entregado',    color: '#065F46', bg: '#D1FAE5' },
  INCIDENCIA:  { label: 'Incidencia',   color: '#991B1B', bg: '#FEE2E2' },
} as const

function EstadoChip({ estado }: { estado: Despacho['estado'] }) {
  const cfg = ESTADO_CFG[estado] ?? { label: estado, color: '#374151', bg: '#F3F4F6' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11, height: 22 }}
    />
  )
}

// ─── Estado action button ──────────────────────────────────────────────────────
function EstadoButton({ despacho, onTransition }: { despacho: Despacho; onTransition: (id: number, estado: string) => void }) {
  if (despacho.estado === 'PREPARANDO') {
    return (
      <Button size="small" variant="outlined"
        sx={{ textTransform: 'none', fontSize: 11, borderColor: alpha(WMS_COLOR, 0.5), color: WMS_COLOR }}
        onClick={() => onTransition(despacho.id, 'LISTO')}>
        Listo para despachar
      </Button>
    )
  }
  if (despacho.estado === 'LISTO') {
    return (
      <Button size="small" variant="outlined"
        sx={{ textTransform: 'none', fontSize: 11, borderColor: '#D97706', color: '#D97706' }}
        onClick={() => onTransition(despacho.id, 'EN_TRANSITO')}>
        <TruckIcon sx={{ fontSize: 13, mr: 0.5 }} /> Iniciar tránsito
      </Button>
    )
  }
  if (despacho.estado === 'EN_TRANSITO') {
    return (
      <Button size="small" variant="outlined"
        sx={{ textTransform: 'none', fontSize: 11, borderColor: '#059669', color: '#059669' }}
        onClick={() => onTransition(despacho.id, 'ENTREGADO')}>
        <CheckIcon sx={{ fontSize: 13, mr: 0.5 }} /> Confirmar entrega
      </Button>
    )
  }
  if (despacho.estado === 'ENTREGADO') {
    return <CheckIcon sx={{ color: '#059669', fontSize: 18 }} />
  }
  if (despacho.estado === 'INCIDENCIA') {
    return <WarningIcon sx={{ color: '#DC2626', fontSize: 18 }} />
  }
  return null
}

// ─── Summary cards ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${alpha(color, 0.25)}`, borderRadius: '12px', p: 2, flex: 1, minWidth: 120 }}>
      <Typography fontSize={26} fontWeight={800} color={color} lineHeight={1}>{value}</Typography>
      <Typography fontSize={12} color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
  )
}

// ─── Nuevo Despacho dialog form ────────────────────────────────────────────────
function NuevoDespachoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    orden_id: '', transportadora_id: '', vehiculo_placa: '', conductor_nombre: '',
    fecha_despacho: '', fecha_entrega_estimada: '', notas: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: ordenes = [] } = useQuery<Orden[]>({
    queryKey: ['wms-ordenes-despacho'],
    queryFn: () => api.get('/wms/ordenes/?estado=EMPACANDO,EN_PICKING').then(r => r.data),
    enabled: open,
  })
  const { data: transportadoras = [] } = useQuery<Transportadora[]>({
    queryKey: ['wms-transportadoras'],
    queryFn: () => api.get('/wms/transportadoras/').then(r => r.data),
    enabled: open,
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/wms/despachos/', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Despacho creado')
      qc.invalidateQueries({ queryKey: ['wms-despachos'] })
      onClose()
    },
    onError: () => toast.error('Error al crear despacho'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orden_id) { toast.error('Seleccione una orden'); return }
    const payload: Record<string, unknown> = {
      orden_id: Number(form.orden_id),
      transportadora_id: form.transportadora_id ? Number(form.transportadora_id) : undefined,
      vehiculo_placa: form.vehiculo_placa || undefined,
      conductor_nombre: form.conductor_nombre || undefined,
      fecha_despacho: form.fecha_despacho || undefined,
      fecha_entrega_estimada: form.fecha_entrega_estimada || undefined,
      notas: form.notas || undefined,
    }
    createMut.mutate(payload)
  }

  const handleClose = () => {
    setForm({ orden_id: '', transportadora_id: '', vehiculo_placa: '', conductor_nombre: '', fecha_despacho: '', fecha_entrega_estimada: '', notas: '' })
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Nuevo Despacho</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack gap={1.5} pt={0.5}>
            <TextField select label="Orden *" fullWidth size="small" value={form.orden_id} onChange={e => set('orden_id', e.target.value)}>
              <MenuItem value="">Seleccione una orden</MenuItem>
              {ordenes.map(o => <MenuItem key={o.id} value={o.id.toString()}>{o.numero_orden} — {o.estado}</MenuItem>)}
            </TextField>
            <TextField select label="Transportadora" fullWidth size="small" value={form.transportadora_id} onChange={e => set('transportadora_id', e.target.value)}>
              <MenuItem value="">Sin transportadora</MenuItem>
              {transportadoras.map(t => <MenuItem key={t.id} value={t.id.toString()}>{t.nombre}</MenuItem>)}
            </TextField>
            <Stack direction="row" gap={1.5}>
              <TextField label="Placa vehículo" size="small" value={form.vehiculo_placa} onChange={e => set('vehiculo_placa', e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Conductor" size="small" value={form.conductor_nombre} onChange={e => set('conductor_nombre', e.target.value)} sx={{ flex: 2 }} />
            </Stack>
            <Stack direction="row" gap={1.5}>
              <TextField label="Fecha despacho" size="small" type="date" value={form.fecha_despacho} onChange={e => set('fecha_despacho', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
              <TextField label="Entrega estimada" size="small" type="date" value={form.fecha_entrega_estimada} onChange={e => set('fecha_entrega_estimada', e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField label="Notas" fullWidth size="small" multiline rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" size="small" variant="contained" disabled={createMut.isPending}
            startIcon={createMut.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1E3A8A' } }}>
            Crear
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ─── Nueva Devolución dialog ───────────────────────────────────────────────────
function NuevoDevolucionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    tipo: 'CLIENTE', orden_referencia_id: '', cliente_id: '', proveedor_id: '',
    almacen_id: '', fecha_recepcion: '', motivo: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: almacenes = [] } = useQuery<Almacen[]>({ queryKey: ['wms-almacenes'], queryFn: () => api.get('/wms/almacenes/').then(r => r.data), enabled: open })
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ['wms-clientes'], queryFn: () => api.get('/wms/clientes/').then(r => r.data), enabled: open })
  const { data: proveedores = [] } = useQuery<Proveedor[]>({ queryKey: ['wms-proveedores'], queryFn: () => api.get('/wms/proveedores/').then(r => r.data), enabled: open })
  const { data: ordenes = [] } = useQuery<Orden[]>({ queryKey: ['wms-ordenes-dev'], queryFn: () => api.get('/wms/ordenes/').then(r => r.data), enabled: open })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/wms/devoluciones/', d).then(r => r.data),
    onSuccess: () => { toast.success('Devolución registrada'); qc.invalidateQueries({ queryKey: ['wms-devoluciones'] }); onClose() },
    onError: () => toast.error('Error al registrar devolución'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.motivo.trim()) { toast.error('El motivo es obligatorio'); return }
    const payload: Record<string, unknown> = {
      tipo: form.tipo,
      motivo: form.motivo,
      almacen_id: form.almacen_id ? Number(form.almacen_id) : undefined,
      fecha_recepcion: form.fecha_recepcion || undefined,
      orden_referencia_id: form.orden_referencia_id ? Number(form.orden_referencia_id) : undefined,
      cliente_id: form.tipo === 'CLIENTE' && form.cliente_id ? Number(form.cliente_id) : undefined,
      proveedor_id: form.tipo === 'PROVEEDOR' && form.proveedor_id ? Number(form.proveedor_id) : undefined,
    }
    createMut.mutate(payload)
  }

  const handleClose = () => {
    setForm({ tipo: 'CLIENTE', orden_referencia_id: '', cliente_id: '', proveedor_id: '', almacen_id: '', fecha_recepcion: '', motivo: '' })
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Nueva Devolución</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack gap={1.5} pt={0.5}>
            <TextField select label="Tipo *" fullWidth size="small" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <MenuItem value="CLIENTE">Cliente</MenuItem>
              <MenuItem value="PROVEEDOR">Proveedor</MenuItem>
            </TextField>
            {form.tipo === 'CLIENTE' && (
              <TextField select label="Cliente" fullWidth size="small" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
                <MenuItem value="">Sin cliente específico</MenuItem>
                {clientes.map(c => <MenuItem key={c.id} value={c.id.toString()}>{c.nombre}</MenuItem>)}
              </TextField>
            )}
            {form.tipo === 'PROVEEDOR' && (
              <TextField select label="Proveedor" fullWidth size="small" value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)}>
                <MenuItem value="">Sin proveedor específico</MenuItem>
                {proveedores.map(p => <MenuItem key={p.id} value={p.id.toString()}>{p.nombre}</MenuItem>)}
              </TextField>
            )}
            <TextField select label="Orden de referencia" fullWidth size="small" value={form.orden_referencia_id} onChange={e => set('orden_referencia_id', e.target.value)}>
              <MenuItem value="">Sin orden de referencia</MenuItem>
              {ordenes.map(o => <MenuItem key={o.id} value={o.id.toString()}>{o.numero_orden}</MenuItem>)}
            </TextField>
            <TextField select label="Almacén destino" fullWidth size="small" value={form.almacen_id} onChange={e => set('almacen_id', e.target.value)}>
              <MenuItem value="">Sin almacén asignado</MenuItem>
              {almacenes.map(a => <MenuItem key={a.id} value={a.id.toString()}>{a.nombre}</MenuItem>)}
            </TextField>
            <TextField label="Fecha de recepción" size="small" type="date" fullWidth value={form.fecha_recepcion} onChange={e => set('fecha_recepcion', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Motivo *" fullWidth size="small" multiline rows={2} value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button type="submit" size="small" variant="contained" disabled={createMut.isPending}
            startIcon={createMut.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1E3A8A' } }}>
            Registrar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ─── Devoluciones section ──────────────────────────────────────────────────────
function DevolucionesSection() {
  const qc = useQueryClient()
  const [openNew, setOpenNew] = useState(false)

  const { data: devoluciones = [], isLoading } = useQuery<Devolucion[]>({
    queryKey: ['wms-devoluciones'],
    queryFn: () => api.get('/wms/devoluciones/').then(r => r.data),
  })

  const procesarMut = useMutation({
    mutationFn: (id: number) => api.put(`/wms/devoluciones/${id}/procesar`, {}).then(r => r.data),
    onSuccess: () => { toast.success('Devolución procesada'); qc.invalidateQueries({ queryKey: ['wms-devoluciones'] }) },
    onError: () => toast.error('Error al procesar devolución'),
  })

  const TIPO_CFG = {
    CLIENTE:   { label: 'Cliente',   color: '#1E40AF', bg: '#DBEAFE' },
    PROVEEDOR: { label: 'Proveedor', color: '#4338CA', bg: '#E0E7FF' },
  } as const

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography fontSize={15} fontWeight={700}>Devoluciones</Typography>
          <Typography fontSize={12} color="text.secondary">Gestión de devoluciones de clientes y proveedores</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenNew(true)}
          sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(WMS_COLOR, 0.5), color: WMS_COLOR }}>
          Nueva Devolución
        </Button>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} sx={{ color: WMS_COLOR }} /></Box>
      ) : devoluciones.length === 0 ? (
        <Typography fontSize={13} color="text.secondary" textAlign="center" py={3}>Sin devoluciones registradas</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                {['N° Devolución', 'Tipo', 'Estado', 'Motivo', 'Fecha recepción', 'Acción'].map(h => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', py: 1.25 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {devoluciones.map(d => {
                const tipoCfg = TIPO_CFG[d.tipo] ?? { label: d.tipo, color: '#374151', bg: '#F3F4F6' }
                return (
                  <TableRow key={d.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{d.numero_devolucion}</TableCell>
                    <TableCell>
                      <Chip label={tipoCfg.label} size="small" sx={{ bgcolor: tipoCfg.bg, color: tipoCfg.color, fontWeight: 700, fontSize: 10, height: 20 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={d.estado} size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontSize: 10, height: 20 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 200 }}><Typography fontSize={12} noWrap>{d.motivo ?? '—'}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{d.fecha_recepcion ?? '—'}</TableCell>
                    <TableCell>
                      {d.estado !== 'PROCESADA' && (
                        <Button size="small" variant="outlined" disabled={procesarMut.isPending}
                          sx={{ textTransform: 'none', fontSize: 11, borderColor: alpha(WMS_COLOR, 0.4), color: WMS_COLOR }}
                          onClick={() => procesarMut.mutate(d.id)}>
                          <ReturnIcon sx={{ fontSize: 13, mr: 0.5 }} /> Procesar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <NuevoDevolucionDialog open={openNew} onClose={() => setOpenNew(false)} />
    </Box>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function WMSDespacho() {
  const qc = useQueryClient()
  const [openNew, setOpenNew] = useState(false)
  const [showDevoluciones, setShowDevoluciones] = useState(false)

  const { data: despachos = [], isLoading } = useQuery<Despacho[]>({
    queryKey: ['wms-despachos'],
    queryFn: () => api.get('/wms/despachos/').then(r => r.data),
  })

  const transicionMut = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.put(`/wms/despachos/${id}/estado`, { estado }).then(r => r.data),
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['wms-despachos'] }) },
    onError: () => toast.error('Error al actualizar estado'),
  })

  const counts = {
    preparando:    despachos.filter(d => d.estado === 'PREPARANDO').length,
    listos:        despachos.filter(d => d.estado === 'LISTO').length,
    enTransito:    despachos.filter(d => d.estado === 'EN_TRANSITO').length,
    entregadosHoy: despachos.filter(d => d.estado === 'ENTREGADO' && d.fecha_despacho?.startsWith(new Date().toISOString().slice(0, 10))).length,
  }

  return (
    <Layout title="WMS — Despacho y Distribución">
      <Box mb={3}>
        <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
          Despacho y Distribución
        </Typography>
        <Typography fontSize={13} color="text.secondary" mt={0.25}>
          Gestión de despachos, transportadoras y devoluciones
        </Typography>
      </Box>

      {/* Summary cards */}
      <Stack direction="row" gap={2} mb={3} flexWrap="wrap">
        <StatCard label="Preparando" value={counts.preparando} color={WMS_COLOR} />
        <StatCard label="Listos" value={counts.listos} color="#D97706" />
        <StatCard label="En tránsito" value={counts.enTransito} color="#EA580C" />
        <StatCard label="Entregados hoy" value={counts.entregadosHoy} color="#059669" />
      </Stack>

      {/* Main table header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography fontSize={15} fontWeight={700}>Despachos</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpenNew(true)}
          sx={{ textTransform: 'none', bgcolor: WMS_COLOR, '&:hover': { bgcolor: '#1E3A8A' }, borderRadius: '8px' }}>
          Nuevo Despacho
        </Button>
      </Stack>

      {/* Main table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: WMS_COLOR }} /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                {['N° Despacho', 'Orden', 'Transportadora', 'Placa', 'Conductor', 'F. Despacho', 'F. Entrega Est.', 'Estado', 'Peso (kg)', 'Notas', 'Acción'].map(h => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', py: 1.25, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {despachos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Stack alignItems="center" gap={1}>
                      <AssignmentIcon sx={{ fontSize: 32, color: '#D1D5DB' }} />
                      <Typography fontSize={13} color="text.secondary">Sin despachos registrados</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : despachos.map(d => (
                <TableRow key={d.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{d.numero_despacho}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.orden_numero}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.transportadora_nombre ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{d.vehiculo_placa ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.conductor_nombre ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.fecha_despacho ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.fecha_entrega_estimada ?? '—'}</TableCell>
                  <TableCell><EstadoChip estado={d.estado} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.peso_total_kg != null ? `${d.peso_total_kg} kg` : '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, maxWidth: 160 }}>
                    <Tooltip title={d.notas ?? ''}>
                      <Typography fontSize={12} noWrap>{d.notas ?? '—'}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <EstadoButton despacho={d} onTransition={(id, estado) => transicionMut.mutate({ id, estado })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Devoluciones collapsible section */}
      <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
        <Box
          onClick={() => setShowDevoluciones(v => !v)}
          sx={{
            px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', bgcolor: '#FAFAFA', '&:hover': { bgcolor: '#F3F4F6' },
          }}
        >
          <Stack direction="row" gap={1} alignItems="center">
            <ReturnIcon sx={{ fontSize: 16, color: WMS_COLOR }} />
            <Typography fontSize={14} fontWeight={700}>Devoluciones</Typography>
          </Stack>
          {showDevoluciones ? <ExpandLessIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />}
        </Box>
        <Collapse in={showDevoluciones}>
          <Box p={2.5}><DevolucionesSection /></Box>
        </Collapse>
      </Paper>

      <NuevoDespachoDialog open={openNew} onClose={() => setOpenNew(false)} />
    </Layout>
  )
}
