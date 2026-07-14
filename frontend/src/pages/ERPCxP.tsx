import React, { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  Tabs,
  Tab,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import AddIcon from '@mui/icons-material/Add'
import PaymentIcon from '@mui/icons-material/Payment'
import WarningIcon from '@mui/icons-material/Warning'
import ScheduleIcon from '@mui/icons-material/Schedule'
import BusinessIcon from '@mui/icons-material/Business'
import MoneyOffIcon from '@mui/icons-material/MoneyOff'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// ─── Constants ────────────────────────────────────────────────────────────────

const ERP_COLOR = '#1A3A6B'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FacturaProveedor {
  id: number
  numero_proveedor: string
  proveedor_nombre: string
  proveedor_nit?: string
  fecha: string
  fecha_vencimiento: string
  subtotal: number
  retenciones?: number
  total: number
  neto_pagar: number
  saldo: number
  moneda?: string
  concepto?: string
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA'
}

interface Pago {
  id: number
  numero?: string
  fecha: string
  factura_proveedor_id?: number
  monto: number
  metodo_pago: 'TRANSFERENCIA' | 'CHEQUE' | 'EFECTIVO' | 'PSE'
  referencia?: string
  cuenta_bancaria_id?: number
  estado: string
  // joined from factura
  proveedor_nombre?: string
}

// ─── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_FACTURA = {
  numero_proveedor: '',
  proveedor_nombre: '',
  proveedor_nit: '',
  fecha: '',
  fecha_vencimiento: '',
  subtotal: '',
  retenciones: '',
  total: '',
  moneda: 'COP',
  concepto: '',
}

const EMPTY_PAGO = {
  factura_proveedor_id: '',
  monto: '',
  fecha: '',
  metodo_pago: 'TRANSFERENCIA',
  referencia: '',
  cuenta_bancaria_id: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number, moneda = 'COP') =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(v)

const formatDate = (d: string) => {
  try {
    return format(new Date(d), 'dd/MM/yyyy')
  } catch {
    return d
  }
}

const isVencida = (fecha_vencimiento: string, saldo: number): boolean => {
  if (saldo <= 0) return false
  try {
    return new Date(fecha_vencimiento) < new Date()
  } catch {
    return false
  }
}

const isPorVencer = (fecha_vencimiento: string, saldo: number): boolean => {
  if (saldo <= 0) return false
  try {
    const diff = new Date(fecha_vencimiento).getTime() - Date.now()
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

interface EstadoChipProps {
  estado: FacturaProveedor['estado']
}

const ESTADO_FACTURA: Record<
  FacturaProveedor['estado'],
  { bg: string; color: string; label: string }
> = {
  PENDIENTE: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Pendiente' },
  PARCIAL: { bg: '#FFFBEB', color: '#B45309', label: 'Pago Parcial' },
  PAGADA: { bg: '#F0FDF4', color: '#15803D', label: 'Pagada' },
  VENCIDA: { bg: '#FEF2F2', color: '#DC2626', label: 'Vencida' },
  ANULADA: { bg: '#F8FAFC', color: '#64748B', label: 'Anulada' },
}

function EstadoChip({ estado }: EstadoChipProps) {
  const cfg = ESTADO_FACTURA[estado] ?? { bg: '#F1F5F9', color: '#64748B', label: estado }
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.72rem' }}
    />
  )
}

const METODO_PAGO_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  EFECTIVO: 'Efectivo',
  PSE: 'PSE',
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accentColor: string
}

function KpiCard({ icon, label, value, sub, accentColor }: KpiCardProps) {
  return (
    <Card
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          bgcolor: alpha(accentColor, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: accentColor,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={800} sx={{ color: accentColor, lineHeight: 1.2, mt: 0.25 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </Box>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ERPCxP() {
  const queryClient = useQueryClient()

  // ── State ────────────────────────────────────────────────────────────────────
  const [tabValue, setTabValue] = useState(0)
  const [openNew, setOpenNew] = useState(false)
  const [openPago, setOpenPago] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [searchProv, setSearchProv] = useState('')

  const [facturaForm, setFacturaForm] = useState({ ...EMPTY_FACTURA })
  const [pagoForm, setPagoForm] = useState({ ...EMPTY_PAGO })

  // ── Queries ──────────────────────────────────────────────────────────────────

  const facturasQuery = useQuery<FacturaProveedor[]>({
    queryKey: ['erp-cxp-facturas'],
    queryFn: async () => {
      const res = await api.get('/erp/cxp/facturas')
      return res.data
    },
  })

  const pagosQuery = useQuery<Pago[]>({
    queryKey: ['erp-pagos'],
    queryFn: async () => {
      const res = await api.get('/erp/pagos', { params: { tipo: 'PAGO' } })
      return res.data
    },
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const mutCrearFactura = useMutation({
    mutationFn: (data: typeof EMPTY_FACTURA) => api.post('/erp/cxp/facturas', data),
    onSuccess: () => {
      toast.success('Factura registrada')
      setOpenNew(false)
      setFacturaForm({ ...EMPTY_FACTURA })
      queryClient.invalidateQueries({ queryKey: ['erp-cxp-facturas'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error al registrar la factura')
    },
  })

  const mutCrearPago = useMutation({
    mutationFn: (data: typeof EMPTY_PAGO) => api.post('/erp/pagos', data),
    onSuccess: () => {
      toast.success('Pago registrado')
      setOpenPago(false)
      setPagoForm({ ...EMPTY_PAGO })
      queryClient.invalidateQueries({ queryKey: ['erp-pagos'] })
      queryClient.invalidateQueries({ queryKey: ['erp-cxp-facturas'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error al registrar el pago')
    },
  })

  // ── Derived data ─────────────────────────────────────────────────────────────

  const facturas = facturasQuery.data ?? []
  const pagos = pagosQuery.data ?? []

  const today = new Date()
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const totalPorPagar = facturas.reduce((s, f) => s + (f.saldo ?? 0), 0)
  const countVencidas = facturas.filter((f) => isVencida(f.fecha_vencimiento, f.saldo)).length
  const countPorVencer = facturas.filter((f) => isPorVencer(f.fecha_vencimiento, f.saldo)).length
  const pagadasEsteMes = pagos.filter((p) => {
    try { return new Date(p.fecha) >= thisMonthStart } catch { return false }
  }).length

  const facturasFiltradas = facturas.filter((f) => {
    const matchEstado = !filtroEstado || f.estado === filtroEstado
    const matchProv = !searchProv || f.proveedor_nombre.toLowerCase().includes(searchProv.toLowerCase())
    return matchEstado && matchProv
  })

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Layout title="ERP — Cuentas por Pagar">
      <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#F0F2F5', minHeight: '100vh' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              bgcolor: ERP_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PaymentIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: ERP_COLOR, letterSpacing: '-0.01em' }}>
              Cuentas por Pagar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de facturas y pagos a proveedores
            </Typography>
          </Box>
        </Box>

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              icon={<BusinessIcon />}
              label="Total por Pagar"
              value={formatCurrency(totalPorPagar)}
              sub={`${facturas.filter((f) => f.saldo > 0).length} facturas activas`}
              accentColor="#EA580C"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              icon={<WarningIcon />}
              label="Vencidas"
              value={String(countVencidas)}
              sub="saldo pendiente expirado"
              accentColor="#DC2626"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              icon={<ScheduleIcon />}
              label="Por Vencer"
              value={String(countPorVencer)}
              sub="vencen en menos de 7 días"
              accentColor="#D97706"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              icon={<MoneyOffIcon />}
              label="Pagadas este mes"
              value={String(pagadasEsteMes)}
              sub="transacciones confirmadas"
              accentColor="#16A34A"
            />
          </Grid>
        </Grid>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': { bgcolor: ERP_COLOR },
          }}
        >
          {['Facturas de Proveedor', 'Programar Pagos'].map((label) => (
            <Tab
              key={label}
              label={label}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&.Mui-selected': { color: ERP_COLOR },
              }}
            />
          ))}
        </Tabs>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB 0 — Facturas de Proveedor                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {tabValue === 0 && (
          <Box>
            {/* Filter / action bar */}
            <Card sx={{ mb: 2, p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar proveedor"
                    value={searchProv}
                    onChange={(e) => setSearchProv(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Estado</InputLabel>
                    <Select
                      label="Estado"
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {Object.entries(ESTADO_FACTURA).map(([k, v]) => (
                        <MenuItem key={k} value={k}>{v.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', justifyContent: { md: 'flex-end' } }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenNew(true)}
                    sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D54' } }}
                  >
                    Registrar Factura
                  </Button>
                </Grid>
              </Grid>
            </Card>

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        'Número Prov.',
                        'Proveedor',
                        'NIT',
                        'Fecha',
                        'Vencimiento',
                        'Total',
                        'Neto Pagar',
                        'Saldo',
                        'Estado',
                      ].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {facturasQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 9 }).map((__, ci) => (
                              <TableCell key={ci}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : facturasFiltradas.map((f) => {
                          const vencida = isVencida(f.fecha_vencimiento, f.saldo)
                          return (
                            <TableRow
                              key={f.id}
                              hover
                              sx={{
                                bgcolor: vencida ? alpha('#DC2626', 0.04) : undefined,
                                '&:hover': {
                                  bgcolor: vencida ? alpha('#DC2626', 0.07) : undefined,
                                },
                              }}
                            >
                              <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {f.numero_proveedor}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>{f.proveedor_nombre}</TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {f.proveedor_nit ?? '—'}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(f.fecha)}</TableCell>
                              <TableCell
                                sx={{
                                  whiteSpace: 'nowrap',
                                  color: vencida ? '#DC2626' : undefined,
                                  fontWeight: vencida ? 700 : undefined,
                                }}
                              >
                                {formatDate(f.fecha_vencimiento)}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {formatCurrency(f.total, f.moneda)}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {formatCurrency(f.neto_pagar, f.moneda)}
                              </TableCell>
                              <TableCell
                                sx={{
                                  whiteSpace: 'nowrap',
                                  fontWeight: 700,
                                  color: f.saldo > 0 ? ERP_COLOR : '#16A34A',
                                }}
                              >
                                {formatCurrency(f.saldo, f.moneda)}
                              </TableCell>
                              <TableCell>
                                <EstadoChip estado={f.estado} />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    {!facturasQuery.isLoading && facturasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary" py={3} variant="body2">
                            Sin facturas que coincidan con los filtros
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

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — Pagos Realizados                                            */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {tabValue === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => setOpenPago(true)}
                sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D54' } }}
              >
                Registrar Pago
              </Button>
            </Box>

            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        'Número',
                        'Fecha',
                        'Proveedor',
                        'Monto',
                        'Método',
                        'Referencia',
                        'Estado',
                      ].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagosQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((__, ci) => (
                              <TableCell key={ci}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : pagos.map((p) => {
                          const facturaRef = facturas.find((f) => f.id === p.factura_proveedor_id)
                          return (
                            <TableRow key={p.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                                {p.numero ?? `#${p.id}`}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(p.fecha)}</TableCell>
                              <TableCell>
                                {p.proveedor_nombre ?? facturaRef?.proveedor_nombre ?? '—'}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: ERP_COLOR }}>
                                {formatCurrency(p.monto)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={METODO_PAGO_LABEL[p.metodo_pago] ?? p.metodo_pago}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {p.referencia ?? '—'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={p.estado}
                                  size="small"
                                  sx={{
                                    bgcolor: p.estado === 'CONFIRMADO' ? '#F0FDF4' : alpha(ERP_COLOR, 0.08),
                                    color: p.estado === 'CONFIRMADO' ? '#15803D' : ERP_COLOR,
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    {!pagosQuery.isLoading && pagos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" py={3} variant="body2">
                            Sin pagos registrados
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

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Registrar Factura                                          */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openNew}
          onClose={() => { setOpenNew(false); setFacturaForm({ ...EMPTY_FACTURA }) }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700, color: ERP_COLOR }}>
            Registrar Factura de Proveedor
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Número Proveedor *"
                  value={facturaForm.numero_proveedor}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, numero_proveedor: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Nombre Proveedor *"
                  value={facturaForm.proveedor_nombre}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, proveedor_nombre: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth size="small" label="NIT Proveedor"
                  value={facturaForm.proveedor_nit}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, proveedor_nit: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth size="small" label="Fecha *" type="date"
                  InputLabelProps={{ shrink: true }}
                  value={facturaForm.fecha}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth size="small" label="Fecha Vencimiento *" type="date"
                  InputLabelProps={{ shrink: true }}
                  value={facturaForm.fecha_vencimiento}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth size="small" label="Subtotal *" type="number"
                  value={facturaForm.subtotal}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, subtotal: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth size="small" label="Retenciones" type="number"
                  value={facturaForm.retenciones}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, retenciones: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth size="small" label="Total *" type="number"
                  value={facturaForm.total}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, total: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Moneda</InputLabel>
                  <Select
                    label="Moneda"
                    value={facturaForm.moneda}
                    onChange={(e) => setFacturaForm((f) => ({ ...f, moneda: e.target.value }))}
                  >
                    <MenuItem value="COP">COP</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth size="small" label="Concepto"
                  value={facturaForm.concepto}
                  onChange={(e) => setFacturaForm((f) => ({ ...f, concepto: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenNew(false); setFacturaForm({ ...EMPTY_FACTURA }) }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={mutCrearFactura.isPending}
              onClick={() => mutCrearFactura.mutate(facturaForm)}
              sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D54' } }}
            >
              {mutCrearFactura.isPending ? 'Guardando...' : 'Registrar Factura'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* Dialog — Registrar Pago                                             */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={openPago}
          onClose={() => { setOpenPago(false); setPagoForm({ ...EMPTY_PAGO }) }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700, color: ERP_COLOR }}>
            Registrar Pago
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Factura de Proveedor</InputLabel>
                <Select
                  label="Factura de Proveedor"
                  value={pagoForm.factura_proveedor_id}
                  onChange={(e) => setPagoForm((p) => ({ ...p, factura_proveedor_id: e.target.value }))}
                >
                  <MenuItem value="">Sin asociar</MenuItem>
                  {facturas
                    .filter((f) => f.saldo > 0)
                    .map((f) => (
                      <MenuItem key={f.id} value={String(f.id)}>
                        {f.numero_proveedor} — {f.proveedor_nombre} ({formatCurrency(f.saldo, f.moneda)})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth size="small" label="Monto *" type="number"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm((p) => ({ ...p, monto: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Fecha *" type="date"
                InputLabelProps={{ shrink: true }}
                value={pagoForm.fecha}
                onChange={(e) => setPagoForm((p) => ({ ...p, fecha: e.target.value }))}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  label="Método de Pago"
                  value={pagoForm.metodo_pago}
                  onChange={(e) => setPagoForm((p) => ({ ...p, metodo_pago: e.target.value }))}
                >
                  <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                  <MenuItem value="CHEQUE">Cheque</MenuItem>
                  <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                  <MenuItem value="PSE">PSE</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth size="small" label="Referencia"
                value={pagoForm.referencia}
                onChange={(e) => setPagoForm((p) => ({ ...p, referencia: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="ID Cuenta Bancaria" type="number"
                value={pagoForm.cuenta_bancaria_id}
                onChange={(e) => setPagoForm((p) => ({ ...p, cuenta_bancaria_id: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setOpenPago(false); setPagoForm({ ...EMPTY_PAGO }) }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={mutCrearPago.isPending}
              onClick={() => mutCrearPago.mutate(pagoForm)}
              sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#142D54' } }}
            >
              {mutCrearPago.isPending ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Layout>
  )
}
