import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Select,
  MenuItem, FormControl, InputLabel, alpha, LinearProgress,
  Tabs, Tab,
} from '@mui/material'
import {
  Add,
  Receipt,
  Warning,
  CheckCircle,
  Schedule,
  MoneyOff,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// ── Module brand ────────────────────────────────────────────────────────────
const ERP_COLOR = '#1A3A6B'

// ── Helpers ─────────────────────────────────────────────────────────────────
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

// ── Types ────────────────────────────────────────────────────────────────────
interface Factura {
  id: number
  numero: string
  cliente_nombre: string
  cliente_nit?: string
  fecha: string
  fecha_vencimiento: string
  total: number
  saldo: number
  estado: string
  dias_vencido?: number
  moneda?: string
  concepto?: string
}

interface AgingData {
  corriente: number
  dias_1_30: number
  dias_31_60: number
  dias_61_90: number
  mas_90: number
  cartera_total?: number
  cartera_vencida?: number
}

interface Pago {
  id: number
  numero: string
  fecha: string
  factura_numero?: string
  monto: number
  metodo?: string
  estado: string
}

// ── Estado / colores de factura ──────────────────────────────────────────────
type EstadoKey =
  | 'BORRADOR'
  | 'EMITIDA'
  | 'PARCIALMENTE_PAGADA'
  | 'PAGADA'
  | 'VENCIDA'
  | 'ANULADA'

const ESTADO_FACTURA: Record<
  EstadoKey,
  { bg: string; color: string; border: string; label: string }
> = {
  BORRADOR:            { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Borrador' },
  EMITIDA:             { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Emitida' },
  PARCIALMENTE_PAGADA: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Parc. Pagada' },
  PAGADA:              { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Pagada' },
  VENCIDA:             { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Vencida' },
  ANULADA:             { bg: '#1E293B', color: '#94A3B8', border: '#334155', label: 'Anulada' },
}

// ── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  numero: '',
  cliente_nombre: '',
  cliente_nit: '',
  fecha: '',
  fecha_vencimiento: '',
  moneda: 'COP',
  concepto: '',
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
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
export default function ERPCxC() {
  const qc = useQueryClient()
  const [tabValue, setTabValue] = useState(0)
  const [openNew, setOpenNew] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')
  const [searchCliente, setSearchCliente] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: facturas = [], isLoading: loadingFacturas } = useQuery<Factura[]>({
    queryKey: ['erp-cxc-facturas'],
    queryFn: () => apiClient.get('/erp/cxc/facturas').then((r) => r.data),
  })

  const { data: aging, isLoading: loadingAging } = useQuery<AgingData>({
    queryKey: ['erp-cxc-aging'],
    queryFn: () => apiClient.get('/erp/cxc/aging').then((r) => r.data),
  })

  const { data: pagos = [], isLoading: loadingPagos } = useQuery<Pago[]>({
    queryKey: ['erp-pagos-cobro'],
    queryFn: () => apiClient.get('/erp/pagos?tipo=COBRO').then((r) => r.data),
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const createFactura = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      apiClient.post('/erp/cxc/facturas', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Factura registrada')
      qc.invalidateQueries({ queryKey: ['erp-cxc-facturas'] })
      qc.invalidateQueries({ queryKey: ['erp-cxc-aging'] })
      setOpenNew(false)
      setForm({ ...EMPTY_FORM })
    },
    onError: () => toast.error('Error al registrar la factura'),
  })

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const carteraTotal = facturas.reduce(
    (acc, f) => acc + (f.saldo > 0 ? f.saldo : 0),
    0,
  )

  const vencida =
    aging != null
      ? (aging.mas_90 ?? 0) + (aging.dias_61_90 ?? 0)
      : 0

  const corriente = aging?.corriente ?? 0

  // ── Filtered facturas ────────────────────────────────────────────────────
  const facturasFiltradas = facturas.filter((f) => {
    const matchEstado =
      filtroEstado === 'TODOS' || f.estado === filtroEstado
    const matchCliente = f.cliente_nombre
      .toLowerCase()
      .includes(searchCliente.toLowerCase())
    return matchEstado && matchCliente
  })

  // ── Aging helpers ────────────────────────────────────────────────────────
  const agingTotal =
    (aging?.corriente ?? 0) +
    (aging?.dias_1_30 ?? 0) +
    (aging?.dias_31_60 ?? 0) +
    (aging?.dias_61_90 ?? 0) +
    (aging?.mas_90 ?? 0)

  const agingBuckets = [
    {
      label: 'Corriente',
      value: aging?.corriente ?? 0,
      accent: '#16A34A',
      bg: '#F0FDF4',
      border: '#BBF7D0',
    },
    {
      label: '1 – 30 días',
      value: aging?.dias_1_30 ?? 0,
      accent: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
    },
    {
      label: '31 – 60 días',
      value: aging?.dias_31_60 ?? 0,
      accent: '#EA580C',
      bg: '#FFF7ED',
      border: '#FED7AA',
    },
    {
      label: '61 – 90 días',
      value: aging?.dias_61_90 ?? 0,
      accent: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
    },
    {
      label: '+90 días',
      value: aging?.mas_90 ?? 0,
      accent: '#7F1D1D',
      bg: '#FFF1F2',
      border: '#FECDD3',
    },
  ]

  return (
    <Layout title="ERP — Cuentas por Cobrar">
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
              Cuentas por Cobrar
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>
              ERP · Cartera de clientes y seguimiento de cobros
            </Typography>
          </Box>
          <Chip
            label="CxC"
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
            label="Cartera Total"
            value={formatCurrency(carteraTotal)}
            icon={<Receipt sx={{ fontSize: 18 }} />}
            accent={ERP_COLOR}
            loading={loadingFacturas}
            sub={`${facturas.filter((f) => f.saldo > 0).length} facturas con saldo`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Cartera Vencida"
            value={formatCurrency(vencida)}
            icon={<Warning sx={{ fontSize: 18 }} />}
            accent="#DC2626"
            loading={loadingAging}
            sub="Más de 60 días"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Cartera Corriente"
            value={formatCurrency(corriente)}
            icon={<CheckCircle sx={{ fontSize: 18 }} />}
            accent="#16A34A"
            loading={loadingAging}
            sub="Al día"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Total Facturas"
            value={String(facturas.length)}
            icon={<Schedule sx={{ fontSize: 18 }} />}
            accent="#64748B"
            loading={loadingFacturas}
            sub={`${facturas.filter((f) => f.estado === 'VENCIDA').length} vencidas`}
          />
        </Grid>
      </Grid>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Card
        sx={{
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Tab bar + action */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #F1F5F9',
            px: 2,
            pt: 1,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              flex: 1,
              '& .MuiTab-root': {
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'none',
                color: '#64748B',
                minHeight: 44,
                px: 2,
              },
              '& .Mui-selected': { color: ERP_COLOR },
              '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 },
            }}
          >
            <Tab label="Facturas" />
            <Tab label="Aging de Cartera" />
            <Tab label="Cobros Aplicados" />
          </Tabs>

          {tabValue === 0 && (
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
              Nueva Factura
            </Button>
          )}
        </Box>

        {/* ── Tab 0: Facturas ──────────────────────────────────────────── */}
        {tabValue === 0 && (
          <Box>
            {/* Filters */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                borderBottom: '1px solid #F8FAFC',
                flexWrap: 'wrap',
              }}
            >
              <TextField
                size="small"
                placeholder="Buscar cliente..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                sx={{ width: 240 }}
              />
              <FormControl size="small" sx={{ width: 180 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  label="Estado"
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <MenuItem value="TODOS">Todos los estados</MenuItem>
                  {Object.entries(ESTADO_FACTURA).map(([key, cfg]) => (
                    <MenuItem key={key} value={key}>
                      {cfg.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="center">Días vencido</TableCell>
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
                          <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                            <MoneyOff sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                            <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                              No se encontraron facturas
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    : facturasFiltradas.map((f) => {
                        const estado = ESTADO_FACTURA[f.estado as EstadoKey] ??
                          ESTADO_FACTURA.BORRADOR
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
                              <Typography sx={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'monospace' }}>
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
                            <TableCell align="right">
                              <Typography
                                sx={{
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: f.saldo > 0 ? '#DC2626' : '#16A34A',
                                }}
                              >
                                {formatCurrency(f.saldo)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={estado.label}
                                size="small"
                                sx={{
                                  bgcolor: estado.bg,
                                  color: estado.color,
                                  border: `1px solid ${estado.border}`,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 22,
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {f.dias_vencido != null && f.dias_vencido > 0 ? (
                                <Chip
                                  label={`${f.dias_vencido}d`}
                                  size="small"
                                  sx={{
                                    bgcolor: f.dias_vencido > 90
                                      ? '#7F1D1D'
                                      : f.dias_vencido > 60
                                      ? '#FEF2F2'
                                      : '#FFF7ED',
                                    color: f.dias_vencido > 90
                                      ? '#FEE2E2'
                                      : f.dias_vencido > 60
                                      ? '#DC2626'
                                      : '#C2410C',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    height: 22,
                                  }}
                                />
                              ) : (
                                <Typography sx={{ color: '#CBD5E1', fontSize: '0.8rem' }}>—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {/* ── Tab 1: Aging ─────────────────────────────────────────────── */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#94A3B8',
                mb: 2.5,
              }}
            >
              Antigüedad de la cartera
            </Typography>

            {loadingAging ? (
              <Grid container spacing={2}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md key={i}>
                    <Skeleton height={120} sx={{ borderRadius: '12px' }} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {agingBuckets.map((bucket) => {
                  const pct =
                    agingTotal > 0 ? (bucket.value / agingTotal) * 100 : 0
                  return (
                    <Grid item xs={12} sm={6} md key={bucket.label}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: '14px',
                          border: `1px solid ${bucket.border}`,
                          bgcolor: bucket.bg,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            color: bucket.accent,
                          }}
                        >
                          {bucket.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: bucket.accent,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.1,
                          }}
                        >
                          {formatCurrency(bucket.value)}
                        </Typography>
                        {/* Proportional bar — the aesthetic risk: inline ledger viz */}
                        <Box>
                          <Box
                            sx={{
                              height: 6,
                              borderRadius: 99,
                              bgcolor: alpha(bucket.accent, 0.15),
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${pct}%`,
                                bgcolor: bucket.accent,
                                borderRadius: 99,
                                transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                              }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.7rem',
                              color: alpha(bucket.accent, 0.7),
                              mt: 0.5,
                              fontWeight: 600,
                            }}
                          >
                            {pct.toFixed(1)}% del total
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>
            )}

            {/* Summary footer */}
            {!loadingAging && aging && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: alpha(ERP_COLOR, 0.05),
                  border: `1px solid ${alpha(ERP_COLOR, 0.12)}`,
                  display: 'flex',
                  gap: 3,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Cartera total aging
                  </Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: ERP_COLOR, mt: 0.25 }}>
                    {formatCurrency(agingTotal)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    % vencida (&gt;60d)
                  </Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626', mt: 0.25 }}>
                    {agingTotal > 0
                      ? (((aging.dias_61_90 ?? 0) + (aging.mas_90 ?? 0)) / agingTotal * 100).toFixed(1) + '%'
                      : '0%'}
                  </Typography>
                </Box>
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      agingTotal > 0
                        ? (((aging.dias_61_90 ?? 0) + (aging.mas_90 ?? 0)) / agingTotal) * 100
                        : 0
                    }
                    sx={{
                      mt: 2.5,
                      width: 160,
                      height: 6,
                      borderRadius: 99,
                      bgcolor: '#E2E8F0',
                      '& .MuiLinearProgress-bar': { bgcolor: '#DC2626' },
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* ── Tab 2: Cobros ────────────────────────────────────────────── */}
        {tabValue === 2 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Número</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Factura</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingPagos
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pagos.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                          <MoneyOff sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                          <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                            No hay cobros registrados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  : pagos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: ERP_COLOR, fontFamily: 'monospace' }}>
                            {p.numero}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                          {safeFormat(p.fecha)}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748B' }}>
                            {p.factura_numero ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#16A34A' }}>
                            {formatCurrency(p.monto)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {p.metodo ? (
                            <Chip
                              label={p.metodo}
                              size="small"
                              sx={{
                                bgcolor: alpha(ERP_COLOR, 0.08),
                                color: ERP_COLOR,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 22,
                              }}
                            />
                          ) : (
                            <Typography sx={{ color: '#CBD5E1', fontSize: '0.8rem' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.estado}
                            size="small"
                            sx={{
                              bgcolor:
                                p.estado === 'APLICADO'
                                  ? '#F0FDF4'
                                  : p.estado === 'PENDIENTE'
                                  ? '#FFFBEB'
                                  : '#F8FAFC',
                              color:
                                p.estado === 'APLICADO'
                                  ? '#16A34A'
                                  : p.estado === 'PENDIENTE'
                                  ? '#D97706'
                                  : '#64748B',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {/* ── Nueva Factura Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={openNew}
        onClose={() => { setOpenNew(false); setForm({ ...EMPTY_FORM }) }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1E293B',
            pb: 1,
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: alpha(ERP_COLOR, 0.1),
                color: ERP_COLOR,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt sx={{ fontSize: 15 }} />
            </Box>
            Nueva Factura
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Número *"
                fullWidth
                size="small"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="NIT cliente"
                fullWidth
                size="small"
                value={form.cliente_nit}
                onChange={(e) => setForm((f) => ({ ...f, cliente_nit: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Nombre del cliente *"
                fullWidth
                size="small"
                value={form.cliente_nombre}
                onChange={(e) => setForm((f) => ({ ...f, cliente_nombre: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha *"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vencimiento *"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12}>
              <TextField
                label="Concepto"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={form.concepto}
                onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
                placeholder="Descripción del servicio o producto facturado..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => { setOpenNew(false); setForm({ ...EMPTY_FORM }) }}
            variant="outlined"
            size="small"
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
            onClick={() => createFactura.mutate(form)}
            sx={{
              bgcolor: ERP_COLOR,
              '&:hover': { bgcolor: '#0D2347' },
            }}
          >
            {createFactura.isPending ? 'Registrando...' : 'Registrar factura'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
