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
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Add,
  Receipt,
  Send,
  Download,
  QrCode,
  Search,
  FilterList,
  Edit,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// ── Module brand ──────────────────────────────────────────────────────────────
const ERP_COLOR = '#1A3A6B'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function safeFormat(dateStr: string | undefined | null, fmt = 'dd/MM/yyyy'): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), fmt)
  } catch {
    return '—'
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7)
}

// ── Types ─────────────────────────────────────────────────────────────────────
type EstadoFactura = 'BORRADOR' | 'EMITIDA' | 'PAGADA' | 'ANULADA' | 'VENCIDA'

interface Factura {
  id: number
  numero: string
  cliente_nombre: string
  cliente_nit?: string
  cliente_email?: string
  fecha: string
  fecha_vencimiento: string
  total: number
  estado: EstadoFactura
  cufe?: string
  moneda?: string
  concepto?: string
}

interface Impuesto {
  id: number
  nombre: string
  tasa: number
  codigo?: string
}

interface LineItem {
  descripcion: string
  cantidad: string
  precio_unitario: string
  impuesto_id: string
}

// ── Estado config ─────────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<EstadoFactura, { bg: string; color: string; border: string; label: string }> = {
  BORRADOR: { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Borrador' },
  EMITIDA:  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Emitida' },
  PAGADA:   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Pagada' },
  VENCIDA:  { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Vencida' },
  ANULADA:  { bg: '#1E293B', color: '#94A3B8', border: '#334155', label: 'Anulada' },
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  numero: '',
  cliente_nombre: '',
  cliente_nit: '',
  cliente_email: '',
  fecha: todayISO(),
  fecha_vencimiento: '',
  moneda: 'COP',
  concepto: '',
}

const EMPTY_LINE: LineItem = {
  descripcion: '',
  cantidad: '1',
  precio_unitario: '',
  impuesto_id: '',
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
  loading?: boolean
  sub?: string
}

function KpiCard({ label, value, icon, accent, loading, sub }: KpiCardProps) {
  return (
    <Card
      sx={{
        p: 2.5,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: alpha(accent, 0.15),
        background: `linear-gradient(135deg, ${alpha(accent, 0.04)} 0%, #fff 100%)`,
        boxShadow: `0 1px 4px ${alpha(accent, 0.08)}, 0 0 0 1px ${alpha(accent, 0.06)}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          bgcolor: accent,
          borderRadius: '16px 0 0 16px',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: alpha(accent, 0.12),
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#94A3B8',
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={100} height={28} />
          ) : (
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: accent,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </Typography>
          )}
          {sub && !loading && (
            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>
              {sub}
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ERPFacturacion() {
  const qc = useQueryClient()

  // — Dialog state
  const [openNew, setOpenNew] = useState(false)

  // — Filters
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')
  const [searchCliente, setSearchCliente] = useState('')

  // — Create form
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_LINE }])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: facturas = [], isLoading: loadingFacturas } = useQuery<Factura[]>({
    queryKey: ['erp-fe-facturas'],
    queryFn: () => apiClient.get('/erp/cxc/facturas').then((r) => r.data),
  })

  const { data: impuestos = [] } = useQuery<Impuesto[]>({
    queryKey: ['erp-fe-impuestos'],
    queryFn: () => apiClient.get('/erp/tributacion/impuestos').then((r) => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createFactura = useMutation({
    mutationFn: (payload: object) =>
      apiClient.post('/erp/cxc/facturas', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Factura electrónica creada')
      qc.invalidateQueries({ queryKey: ['erp-fe-facturas'] })
      handleCloseNew()
    },
    onError: () => toast.error('Error al crear la factura'),
  })

  const emitirFactura = useMutation({
    mutationFn: (id: number) =>
      apiClient.patch(`/erp/cxc/facturas/${id}`, { estado: 'EMITIDA' }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Factura enviada a la DIAN')
      qc.invalidateQueries({ queryKey: ['erp-fe-facturas'] })
    },
    onError: () => toast.error('Error al emitir la factura'),
  })

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  function handleCloseNew() {
    setOpenNew(false)
    setForm({ ...EMPTY_FORM })
    setLineItems([{ ...EMPTY_LINE }])
  }

  function addLine() {
    setLineItems((prev) => [...prev, { ...EMPTY_LINE }])
  }

  function removeLine(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    )
  }

  // ── Computed totals ────────────────────────────────────────────────────────
  function lineSubtotal(line: LineItem): number {
    const qty = parseFloat(line.cantidad) || 0
    const price = parseFloat(line.precio_unitario) || 0
    return qty * price
  }

  function lineTax(line: LineItem): number {
    const subtotal = lineSubtotal(line)
    const imp = impuestos.find((t) => String(t.id) === line.impuesto_id)
    if (!imp) return 0
    return subtotal * (imp.tasa / 100)
  }

  const subtotalTotal = lineItems.reduce((s, l) => s + lineSubtotal(l), 0)
  const impuestosTotal = lineItems.reduce((s, l) => s + lineTax(l), 0)
  const grandTotal = subtotalTotal + impuestosTotal

  // ── KPI derivations ────────────────────────────────────────────────────────
  const today = todayISO()
  const currentMonth = currentMonthISO()

  const emitidosHoy = facturas.filter((f) => f.fecha?.startsWith(today)).length
  const emitidosMes = facturas.filter((f) => f.fecha?.startsWith(currentMonth)).length
  const valorMes = facturas
    .filter((f) => f.fecha?.startsWith(currentMonth))
    .reduce((s, f) => s + (f.total ?? 0), 0)
  const pendientesDIAN = facturas.filter((f) => f.estado === 'BORRADOR').length

  // ── Filtered list ──────────────────────────────────────────────────────────
  const facturasFiltradas = facturas.filter((f) => {
    const matchEstado = filtroEstado === 'TODOS' || f.estado === filtroEstado
    const matchCliente = f.cliente_nombre
      .toLowerCase()
      .includes(searchCliente.toLowerCase())
    return matchEstado && matchCliente
  })

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!form.numero || !form.cliente_nombre || !form.fecha || !form.fecha_vencimiento) {
      toast.error('Complete los campos obligatorios')
      return
    }
    const lineas = lineItems
      .filter((l) => l.descripcion.trim())
      .map((l) => ({
        descripcion: l.descripcion,
        cantidad: parseFloat(l.cantidad) || 1,
        precio_unitario: parseFloat(l.precio_unitario) || 0,
        impuesto_id: l.impuesto_id ? Number(l.impuesto_id) : null,
      }))
    createFactura.mutate({ ...form, lineas })
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="ERP — Facturación Electrónica">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Receipt sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>
              Facturación Electrónica
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>
              ERP · Motor de emisión DIAN — resolución 42946607
            </Typography>
          </Box>
          <Chip
            label="FE"
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: alpha(ERP_COLOR, 0.1),
              color: ERP_COLOR,
              fontWeight: 700,
              fontSize: 11,
              height: 24,
              letterSpacing: '0.05em',
            }}
          />
        </Box>
      </Box>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Emitidas hoy"
            value={String(emitidosHoy)}
            icon={<Receipt sx={{ fontSize: 18 }} />}
            accent={ERP_COLOR}
            loading={loadingFacturas}
            sub={safeFormat(today)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Emitidas este mes"
            value={String(emitidosMes)}
            icon={<QrCode sx={{ fontSize: 18 }} />}
            accent="#0369A1"
            loading={loadingFacturas}
            sub={currentMonth}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Valor facturado mes"
            value={formatCurrency(valorMes)}
            icon={<Receipt sx={{ fontSize: 18 }} />}
            accent="#16A34A"
            loading={loadingFacturas}
            sub="Facturas del mes actual"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Pendientes por enviar"
            value={String(pendientesDIAN)}
            icon={<Send sx={{ fontSize: 18 }} />}
            accent={pendientesDIAN > 0 ? '#D97706' : '#64748B'}
            loading={loadingFacturas}
            sub="Estado BORRADOR"
          />
        </Grid>
      </Grid>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <Card
        sx={{
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            borderBottom: '1px solid #F1F5F9',
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              px: 1.5,
              py: 0.5,
              width: 240,
            }}
          >
            <Search sx={{ fontSize: 16, color: '#94A3B8' }} />
            <input
              value={searchCliente}
              onChange={(e) => setSearchCliente(e.target.value)}
              placeholder="Buscar cliente..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8rem',
                color: '#1E293B',
                width: '100%',
              }}
            />
          </Box>

          {/* Estado filter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FilterList sx={{ fontSize: 16, color: '#94A3B8' }} />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                displayEmpty
                sx={{ fontSize: '0.8rem', height: 34 }}
              >
                <MenuItem value="TODOS">Todos los estados</MenuItem>
                {(Object.keys(ESTADO_CONFIG) as EstadoFactura[]).map((key) => (
                  <MenuItem key={key} value={key}>
                    {ESTADO_CONFIG[key].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ ml: 'auto' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setOpenNew(true)}
              sx={{
                bgcolor: ERP_COLOR,
                '&:hover': { bgcolor: '#0D2347' },
                height: 34,
                px: 2,
                fontSize: '0.8rem',
              }}
            >
              Nueva factura
            </Button>
          </Box>
        </Box>

        {/* Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>NIT</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Venc.</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>CUFE</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingFacturas
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : facturasFiltradas.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 7 }}>
                        <Receipt sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                          No se encontraron facturas
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                : facturasFiltradas.map((f) => {
                    const estadoCfg = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.BORRADOR
                    const cufeShort = f.cufe
                      ? `${f.cufe.slice(0, 8)}…${f.cufe.slice(-4)}`
                      : '—'
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: ERP_COLOR,
                              fontFamily: 'monospace',
                            }}
                          >
                            {f.numero}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {f.cliente_nombre}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}
                          >
                            {f.cliente_nit ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                          {safeFormat(f.fecha)}
                        </TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                          {safeFormat(f.fecha_vencimiento)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {formatCurrency(f.total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={estadoCfg.label}
                            size="small"
                            sx={{
                              bgcolor: estadoCfg.bg,
                              color: estadoCfg.color,
                              border: `1px solid ${estadoCfg.border}`,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {f.cufe ? (
                            <Tooltip title={f.cufe} arrow>
                              <Typography
                                sx={{
                                  fontSize: '0.72rem',
                                  color: '#64748B',
                                  fontFamily: 'monospace',
                                  cursor: 'default',
                                }}
                              >
                                {cufeShort}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ color: '#CBD5E1', fontSize: '0.8rem' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {f.estado === 'BORRADOR' && (
                              <Tooltip title="Enviar a DIAN">
                                <IconButton
                                  size="small"
                                  disabled={emitirFactura.isPending}
                                  onClick={() => emitirFactura.mutate(f.id)}
                                  sx={{
                                    color: ERP_COLOR,
                                    '&:hover': { bgcolor: alpha(ERP_COLOR, 0.08) },
                                  }}
                                >
                                  <Send sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Descargar PDF">
                              <IconButton
                                size="small"
                                onClick={() => toast('Descarga disponible próximamente', { icon: '📄' })}
                                sx={{ color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}
                              >
                                <Download sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* ── Create dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={openNew}
        onClose={handleCloseNew}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle
          sx={{
            pb: 1.5,
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit sx={{ color: '#fff', fontSize: 16 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
                Nueva Factura Electrónica
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Documento tributario electrónico — DIAN
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, pb: 0 }}>
          {/* ── Section 1: Datos del cliente ── */}
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: ERP_COLOR,
              mb: 1.5,
            }}
          >
            Datos del cliente
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Nombre del cliente *"
                fullWidth
                size="small"
                value={form.cliente_nombre}
                onChange={(e) => setForm((f) => ({ ...f, cliente_nombre: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="NIT / Identificación"
                fullWidth
                size="small"
                value={form.cliente_nit}
                onChange={(e) => setForm((f) => ({ ...f, cliente_nit: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Correo electrónico"
                type="email"
                fullWidth
                size="small"
                value={form.cliente_email}
                onChange={(e) => setForm((f) => ({ ...f, cliente_email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Número de factura *"
                fullWidth
                size="small"
                placeholder="FE-0001"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2.5 }} />

          {/* ── Section 2: Fechas y moneda ── */}
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: ERP_COLOR,
              mb: 1.5,
            }}
          >
            Fechas y moneda
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Fecha de emisión *"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Fecha de vencimiento *"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={form.moneda}
                  label="Moneda"
                  onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
                >
                  <MenuItem value="COP">COP — Peso colombiano</MenuItem>
                  <MenuItem value="USD">USD — Dólar</MenuItem>
                  <MenuItem value="EUR">EUR — Euro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2.5 }} />

          {/* ── Section 3: Líneas de factura ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: ERP_COLOR,
              }}
            >
              Líneas de factura
            </Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={addLine}
              sx={{ color: ERP_COLOR, fontSize: '0.78rem', py: 0.25 }}
            >
              Agregar línea
            </Button>
          </Box>

          {/* Line items table */}
          <Box
            sx={{
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              overflow: 'hidden',
              mb: 1.5,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>Descripción</TableCell>
                  <TableCell sx={{ width: 80 }} align="center">Cantidad</TableCell>
                  <TableCell sx={{ width: 140 }} align="right">Precio unitario</TableCell>
                  <TableCell sx={{ width: 150 }}>Impuesto</TableCell>
                  <TableCell sx={{ width: 120 }} align="right">Subtotal</TableCell>
                  <TableCell sx={{ width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((line, idx) => {
                  const sub = lineSubtotal(line)
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Descripción del servicio o producto"
                          fullWidth
                          value={line.descripcion}
                          onChange={(e) => updateLine(idx, 'descripcion', e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={line.cantidad}
                          onChange={(e) => updateLine(idx, 'cantidad', e.target.value)}
                          inputProps={{ style: { textAlign: 'center' }, min: 1 }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          placeholder="0"
                          value={line.precio_unitario}
                          onChange={(e) => updateLine(idx, 'precio_unitario', e.target.value)}
                          inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          displayEmpty
                          value={line.impuesto_id}
                          onChange={(e) => updateLine(idx, 'impuesto_id', e.target.value)}
                          sx={{ borderRadius: '8px', fontSize: '0.8rem', width: '100%' }}
                        >
                          <MenuItem value="">Sin impuesto</MenuItem>
                          {impuestos.map((t) => (
                            <MenuItem key={t.id} value={String(t.id)}>
                              {t.nombre} {t.tasa}%
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: sub > 0 ? '#1E293B' : '#CBD5E1',
                            fontFamily: 'monospace',
                          }}
                        >
                          {sub > 0 ? formatCurrency(sub) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {lineItems.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => removeLine(idx)}
                            sx={{ color: '#94A3B8', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                          >
                            <Typography sx={{ fontSize: '1rem', lineHeight: 1, fontWeight: 700 }}>×</Typography>
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Running totals */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                minWidth: 280,
                p: 2,
                borderRadius: '12px',
                bgcolor: alpha(ERP_COLOR, 0.03),
                border: `1px solid ${alpha(ERP_COLOR, 0.1)}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>Subtotal</Typography>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatCurrency(subtotalTotal)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>Impuestos</Typography>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatCurrency(impuestosTotal)}
                </Typography>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: ERP_COLOR }}>
                  Total
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: ERP_COLOR,
                    fontFamily: 'monospace',
                  }}
                >
                  {formatCurrency(grandTotal)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Concepto */}
          <TextField
            label="Concepto / observaciones"
            fullWidth
            size="small"
            multiline
            rows={2}
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
            placeholder="Descripción general del documento..."
            sx={{ mb: 2.5 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9', gap: 1 }}>
          <Button
            onClick={handleCloseNew}
            variant="outlined"
            size="small"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={
              !form.numero ||
              !form.cliente_nombre ||
              !form.fecha ||
              !form.fecha_vencimiento ||
              createFactura.isPending
            }
            onClick={handleSubmit}
            sx={{
              bgcolor: ERP_COLOR,
              '&:hover': { bgcolor: '#0D2347' },
            }}
          >
            {createFactura.isPending ? 'Creando...' : 'Crear factura'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
