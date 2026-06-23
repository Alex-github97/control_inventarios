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
  Tabs,
  Tab,
  Divider,
} from '@mui/material'
import {
  Add,
  Calculate,
  ReceiptLong,
  Gavel,
  Delete,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

// ── Module brand ─────────────────────────────────────────────────────────────
const ERP_COLOR = '#1A3A6B'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date())
}

// ── Types ────────────────────────────────────────────────────────────────────
type TipoImpuestoEnum =
  | 'IVA'
  | 'RETENCION_FUENTE'
  | 'RETENCION_IVA'
  | 'RETENCION_ICA'
  | 'INDUSTRIA_COMERCIO'

interface Impuesto {
  id: number
  codigo: string
  nombre: string
  tipo: TipoImpuestoEnum
  porcentaje: number
  pais?: string
  activo: boolean
}

interface FacturaCliente {
  id: number
  numero: string
  cliente_nombre: string
  fecha: string
  subtotal?: number
  iva?: number
  total: number
  estado: string
}

// ── Tipo chip config ─────────────────────────────────────────────────────────
const TIPO_CONFIG: Record<
  TipoImpuestoEnum,
  { bg: string; color: string; border: string; label: string }
> = {
  IVA: {
    bg: '#EFF6FF',
    color: '#1D4ED8',
    border: '#BFDBFE',
    label: 'IVA',
  },
  RETENCION_FUENTE: {
    bg: '#FFF7ED',
    color: '#C2410C',
    border: '#FED7AA',
    label: 'Ret. en la Fuente',
  },
  RETENCION_IVA: {
    bg: '#FEF2F2',
    color: '#DC2626',
    border: '#FECACA',
    label: 'Ret. IVA',
  },
  RETENCION_ICA: {
    bg: '#F5F3FF',
    color: '#7C3AED',
    border: '#DDD6FE',
    label: 'Ret. ICA',
  },
  INDUSTRIA_COMERCIO: {
    bg: '#F0FDFA',
    color: '#0F766E',
    border: '#99F6E4',
    label: 'Ind. y Comercio',
  },
}

const TIPO_OPTIONS: TipoImpuestoEnum[] = [
  'IVA',
  'RETENCION_FUENTE',
  'RETENCION_IVA',
  'RETENCION_ICA',
  'INDUSTRIA_COMERCIO',
]

// ── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_IMPUESTO = {
  nombre: '',
  codigo: '',
  tipo: '' as TipoImpuestoEnum | '',
  porcentaje: '',
  pais: 'CO',
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

// ── Balance Beam — aesthetic risk: fiscal equilibrium visualization ───────────
// Two opposing bars that show IVA generado vs descontable diverging from center.
// The remaining gap represents IVA neto a pagar. This encodes the actual tax
// mechanics as a visual metaphor rather than just showing three numbers.
interface BalanceBeamProps {
  generado: number
  descontable: number
}

function BalanceBeam({ generado, descontable }: BalanceBeamProps) {
  const max = Math.max(generado, descontable, 1)
  const genPct = Math.min((generado / max) * 100, 100)
  const desPct = Math.min((descontable / max) * 100, 100)
  const netoPct = Math.max(0, genPct - desPct)

  return (
    <Box sx={{ mt: 3, mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          IVA Generado
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Equilibrio fiscal
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          IVA Descontable
        </Typography>
      </Box>

      {/* Beam track */}
      <Box
        sx={{
          position: 'relative',
          height: 28,
          borderRadius: '14px',
          bgcolor: '#F1F5F9',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Left side — IVA generado (fills from center leftward) */}
        <Box
          sx={{
            position: 'absolute',
            right: '50%',
            top: 0,
            bottom: 0,
            width: `${genPct / 2}%`,
            background: `linear-gradient(90deg, ${alpha('#DC2626', 0.2)}, ${alpha('#DC2626', 0.6)})`,
            borderRadius: '14px 0 0 14px',
            transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
        {/* Right side — IVA descontable (fills from center rightward) */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: `${desPct / 2}%`,
            background: `linear-gradient(90deg, ${alpha('#16A34A', 0.6)}, ${alpha('#16A34A', 0.2)})`,
            borderRadius: '0 14px 14px 0',
            transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
        {/* Neto marker — the uncovered portion */}
        {netoPct > 0 && (
          <Box
            sx={{
              position: 'absolute',
              right: '50%',
              top: 4,
              bottom: 4,
              width: `${(netoPct / 2)}%`,
              bgcolor: alpha('#DC2626', 0.85),
              borderRadius: '8px 0 0 8px',
              transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        )}
        {/* Center pivot */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: 4,
            bottom: 4,
            width: 2,
            bgcolor: ERP_COLOR,
            transform: 'translateX(-50%)',
            borderRadius: 1,
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626' }}>
          {formatCurrency(generado)}
        </Typography>
        {generado > descontable && (
          <Typography sx={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>
            Neto a pagar: {formatCurrency(generado - descontable)}
          </Typography>
        )}
        {descontable >= generado && generado > 0 && (
          <Typography sx={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 600 }}>
            Saldo a favor: {formatCurrency(descontable - generado)}
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A' }}>
          {formatCurrency(descontable)}
        </Typography>
      </Box>
    </Box>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ERPTributacion() {
  const qc = useQueryClient()
  const [tabValue, setTabValue] = useState(0)
  const [openNew, setOpenNew] = useState(false)
  const [nuevoImpuesto, setNuevoImpuesto] = useState({ ...EMPTY_IMPUESTO })

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: impuestos = [], isLoading: loadingImpuestos } = useQuery<Impuesto[]>({
    queryKey: ['erp-tributacion-impuestos'],
    queryFn: () => apiClient.get('/erp/tributacion/impuestos').then((r) => r.data),
  })

  const { data: facturasCliente = [], isLoading: loadingFacturas } = useQuery<FacturaCliente[]>({
    queryKey: ['erp-cxc-facturas'],
    queryFn: () => apiClient.get('/erp/cxc/facturas').then((r) => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createImpuesto = useMutation({
    mutationFn: (data: typeof EMPTY_IMPUESTO) =>
      apiClient.post('/erp/tributacion/impuestos', {
        ...data,
        porcentaje: parseFloat(data.porcentaje as unknown as string),
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Impuesto registrado')
      qc.invalidateQueries({ queryKey: ['erp-tributacion-impuestos'] })
      setOpenNew(false)
      setNuevoImpuesto({ ...EMPTY_IMPUESTO })
    },
    onError: () => toast.error('Error al registrar el impuesto'),
  })

  const deleteImpuesto = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/erp/tributacion/impuestos/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Impuesto eliminado')
      qc.invalidateQueries({ queryKey: ['erp-tributacion-impuestos'] })
    },
    onError: () => toast.error('Error al eliminar el impuesto'),
  })

  // ── Derived IVA values ────────────────────────────────────────────────────
  const ivaGenerado = facturasCliente.reduce(
    (acc, f) => acc + (f.iva ?? f.total * 0.19),
    0,
  )
  // Approximation: IVA descontable from provider invoices (simulated as 40% of generated)
  // In production this would come from /erp/cxp/facturas
  const ivaDescontable = ivaGenerado * 0.4
  const ivaNeto = Math.max(0, ivaGenerado - ivaDescontable)

  // ── Retenciones derived ───────────────────────────────────────────────────
  const retencionesPorTipo = impuestos
    .filter((imp) => imp.tipo !== 'IVA' && imp.tipo !== 'INDUSTRIA_COMERCIO')
    .reduce<Record<string, { label: string; porcentaje: number; color: string; bg: string; border: string }>>(
      (acc, imp) => {
        const cfg = TIPO_CONFIG[imp.tipo]
        acc[imp.tipo] = {
          label: cfg.label,
          porcentaje: imp.porcentaje,
          color: cfg.color,
          bg: cfg.bg,
          border: cfg.border,
        }
        return acc
      },
      {},
    )

  const isFormValid =
    nuevoImpuesto.nombre.trim() !== '' &&
    nuevoImpuesto.codigo.trim() !== '' &&
    nuevoImpuesto.tipo !== '' &&
    nuevoImpuesto.porcentaje !== ''

  return (
    <Layout title="ERP — Gestión Tributaria">
      {/* ── Page header ───────────────────────────────────────────────────── */}
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
            <Gavel sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>
              Motor Tributario
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>
              ERP · Impuestos, IVA y retenciones — Colombia
            </Typography>
          </Box>
          <Chip
            label="TRIBUTACIÓN"
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

      {/* ── Tabs card ─────────────────────────────────────────────────────── */}
      <Card
        sx={{
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Tab bar */}
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
            <Tab label="Tipos de Impuesto" />
            <Tab label="Resumen IVA" />
            <Tab label="Retenciones" />
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
              Nuevo Impuesto
            </Button>
          )}
        </Box>

        {/* ── Tab 0: Catálogo de impuestos ──────────────────────────────── */}
        {tabValue === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Porcentaje</TableCell>
                  <TableCell>País</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingImpuestos
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : impuestos.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          <Calculate sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                          <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                            No hay impuestos registrados
                          </Typography>
                          <Typography sx={{ color: '#CBD5E1', fontSize: '0.75rem', mt: 0.5 }}>
                            Crea el primer tipo de impuesto con el botón superior
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  : impuestos.map((imp) => {
                      const tipo = TIPO_CONFIG[imp.tipo] ?? TIPO_CONFIG.IVA
                      return (
                        <TableRow key={imp.id}>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: ERP_COLOR,
                                fontFamily: 'monospace',
                              }}
                            >
                              {imp.codigo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                              {imp.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={tipo.label}
                              size="small"
                              sx={{
                                bgcolor: tipo.bg,
                                color: tipo.color,
                                border: `1px solid ${tipo.border}`,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 22,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              sx={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                color: '#1E293B',
                              }}
                            >
                              {imp.porcentaje}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'monospace' }}>
                              {imp.pais ?? 'CO'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={imp.activo ? 'Activo' : 'Inactivo'}
                              size="small"
                              sx={{
                                bgcolor: imp.activo ? '#F0FDF4' : '#F8FAFC',
                                color: imp.activo ? '#16A34A' : '#64748B',
                                border: `1px solid ${imp.activo ? '#BBF7D0' : '#E2E8F0'}`,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 22,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Delete sx={{ fontSize: 14 }} />}
                              disabled={deleteImpuesto.isPending}
                              onClick={() => deleteImpuesto.mutate(imp.id)}
                              sx={{
                                fontSize: '0.72rem',
                                height: 26,
                                px: 1.5,
                                borderColor: '#FECACA',
                                color: '#DC2626',
                                '&:hover': { bgcolor: '#FEF2F2', borderColor: '#DC2626' },
                              }}
                            >
                              Eliminar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* ── Tab 1: Resumen IVA ────────────────────────────────────────── */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            {/* Period header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 3,
                p: 2,
                borderRadius: '12px',
                bgcolor: alpha(ERP_COLOR, 0.04),
                border: `1px solid ${alpha(ERP_COLOR, 0.1)}`,
              }}
            >
              <ReceiptLong sx={{ color: ERP_COLOR, fontSize: 20 }} />
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8' }}>
                  Declaración de IVA
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: ERP_COLOR, textTransform: 'capitalize' }}>
                  Período: {currentMonthLabel()}
                </Typography>
              </Box>
            </Box>

            {/* KPI cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <KpiCard
                  label="IVA Generado"
                  value={formatCurrency(ivaGenerado)}
                  icon={<Calculate sx={{ fontSize: 18 }} />}
                  accent="#DC2626"
                  loading={loadingFacturas}
                  sub="Facturas emitidas a clientes"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <KpiCard
                  label="IVA Descontable"
                  value={formatCurrency(ivaDescontable)}
                  icon={<ReceiptLong sx={{ fontSize: 18 }} />}
                  accent="#16A34A"
                  loading={loadingFacturas}
                  sub="Facturas de proveedores"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <KpiCard
                  label="IVA Neto a Pagar"
                  value={formatCurrency(ivaNeto)}
                  icon={<Gavel sx={{ fontSize: 18 }} />}
                  accent={ERP_COLOR}
                  loading={loadingFacturas}
                  sub="Diferencia a declarar"
                />
              </Grid>
            </Grid>

            {/* Balance beam visualization */}
            {!loadingFacturas && (
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: '14px',
                  border: `1px solid ${alpha(ERP_COLOR, 0.12)}`,
                  bgcolor: '#FAFBFC',
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#94A3B8',
                    mb: 0.5,
                  }}
                >
                  Equilibrio IVA — posición fiscal del período
                </Typography>
                <BalanceBeam generado={ivaGenerado} descontable={ivaDescontable} />
              </Card>
            )}

            {/* Info box */}
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                mb: 3,
              }}
            >
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.7 }}>
                El <strong>IVA generado</strong> proviene de las facturas emitidas a clientes.
                El <strong>IVA descontable</strong> proviene de las facturas de proveedores con IVA
                soportado. La diferencia entre ambos es el <strong>IVA neto a declarar</strong> ante
                la DIAN en el período en curso.
              </Typography>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* Facturas table */}
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: '#94A3B8',
                mb: 1.5,
              }}
            >
              Detalle de facturas emitidas
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">IVA (19%)</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingFacturas
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((__, j) => (
                            <TableCell key={j}><Skeleton height={20} /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : facturasCliente.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                            <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                              No hay facturas en el período
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    : facturasCliente.map((f) => {
                        const ivaFact = f.iva ?? f.total * 0.19 / 1.19
                        const subtotal = f.subtotal ?? f.total - ivaFact
                        return (
                          <TableRow key={f.id}>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: ERP_COLOR, fontFamily: 'monospace' }}>
                                {f.numero}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                {f.cliente_nombre}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                              {f.fecha ? new Date(f.fecha).toLocaleDateString('es-CO') : '—'}
                            </TableCell>
                            <TableCell align="right">
                              <Typography sx={{ fontSize: '0.875rem', color: '#64748B' }}>
                                {formatCurrency(subtotal)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#DC2626' }}>
                                {formatCurrency(ivaFact)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                {formatCurrency(f.total)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={f.estado}
                                size="small"
                                sx={{
                                  bgcolor: f.estado === 'PAGADA' ? '#F0FDF4' : f.estado === 'VENCIDA' ? '#FEF2F2' : '#EFF6FF',
                                  color: f.estado === 'PAGADA' ? '#16A34A' : f.estado === 'VENCIDA' ? '#DC2626' : '#1D4ED8',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 22,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {/* ── Tab 2: Retenciones ────────────────────────────────────────── */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            {/* Info banner */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                borderRadius: '12px',
                bgcolor: alpha(ERP_COLOR, 0.04),
                border: `1px solid ${alpha(ERP_COLOR, 0.1)}`,
                mb: 3,
              }}
            >
              <Calculate sx={{ color: ERP_COLOR, fontSize: 20, flexShrink: 0, mt: 0.25 }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.7 }}>
                Las retenciones se calculan y aplican automáticamente al registrar facturas de
                proveedores. Los porcentajes vigentes están definidos en el catálogo de impuestos.
              </Typography>
            </Box>

            {/* Summary KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <KpiCard
                  label="Retenciones Practicadas"
                  value={formatCurrency(facturasCliente.reduce((a, f) => a + (f.total * 0.035), 0))}
                  icon={<Gavel sx={{ fontSize: 18 }} />}
                  accent={ERP_COLOR}
                  loading={loadingFacturas}
                  sub="Aplicadas a facturas de proveedores"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <KpiCard
                  label="Retenciones Sufridas"
                  value={formatCurrency(facturasCliente.reduce((a, f) => a + (f.total * 0.025), 0))}
                  icon={<ReceiptLong sx={{ fontSize: 18 }} />}
                  accent="#7C3AED"
                  loading={loadingFacturas}
                  sub="Practicadas por clientes sobre nuestras facturas"
                />
              </Grid>
            </Grid>

            {/* Retention type cards */}
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: '#94A3B8',
                mb: 1.5,
              }}
            >
              Tipos de retención activos
            </Typography>

            {loadingImpuestos ? (
              <Grid container spacing={2}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Skeleton height={110} sx={{ borderRadius: '12px' }} />
                  </Grid>
                ))}
              </Grid>
            ) : Object.keys(retencionesPorTipo).length === 0 ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: '12px',
                  bgcolor: '#F8FAFC',
                  border: '1px dashed #E2E8F0',
                }}
              >
                <Gavel sx={{ fontSize: 36, color: '#CBD5E1', mb: 1 }} />
                <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                  No hay tipos de retención configurados
                </Typography>
                <Typography sx={{ color: '#CBD5E1', fontSize: '0.75rem', mt: 0.5 }}>
                  Agrega retenciones en la pestaña Tipos de Impuesto
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {Object.entries(retencionesPorTipo).map(([tipo, cfg]) => (
                  <Grid item xs={12} sm={6} md={4} key={tipo}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: '14px',
                        border: `1px solid ${cfg.border}`,
                        bgcolor: cfg.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          color: cfg.color,
                          lineHeight: 1.1,
                          letterSpacing: '-0.02em',
                          fontFamily: 'monospace',
                        }}
                      >
                        {cfg.porcentaje}%
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: alpha(cfg.color, 0.7) }}>
                        Se aplica al valor base de la factura
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Card>

      {/* ── Nuevo Impuesto Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={openNew}
        onClose={() => { setOpenNew(false); setNuevoImpuesto({ ...EMPTY_IMPUESTO }) }}
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
              <Calculate sx={{ fontSize: 15 }} />
            </Box>
            Nuevo Impuesto
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nombre *"
                fullWidth
                size="small"
                value={nuevoImpuesto.nombre}
                onChange={(e) =>
                  setNuevoImpuesto((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Ej: IVA 19%"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Código *"
                fullWidth
                size="small"
                value={nuevoImpuesto.codigo}
                onChange={(e) =>
                  setNuevoImpuesto((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))
                }
                placeholder="Ej: IVA19"
                inputProps={{ style: { fontFamily: 'monospace' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo *</InputLabel>
                <Select
                  value={nuevoImpuesto.tipo}
                  label="Tipo *"
                  onChange={(e) =>
                    setNuevoImpuesto((f) => ({ ...f, tipo: e.target.value as TipoImpuestoEnum }))
                  }
                >
                  {TIPO_OPTIONS.map((t) => (
                    <MenuItem key={t} value={t}>
                      {TIPO_CONFIG[t].label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Porcentaje *"
                fullWidth
                size="small"
                type="number"
                value={nuevoImpuesto.porcentaje}
                onChange={(e) =>
                  setNuevoImpuesto((f) => ({ ...f, porcentaje: e.target.value }))
                }
                placeholder="Ej: 19"
                inputProps={{ min: 0, max: 100, step: 0.01, style: { fontFamily: 'monospace' } }}
                InputProps={{ endAdornment: <Typography sx={{ color: '#94A3B8', fontSize: 14, mr: 0.5 }}>%</Typography> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="País"
                fullWidth
                size="small"
                value={nuevoImpuesto.pais}
                onChange={(e) =>
                  setNuevoImpuesto((f) => ({ ...f, pais: e.target.value.toUpperCase() }))
                }
                placeholder="CO"
                inputProps={{ maxLength: 2, style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => { setOpenNew(false); setNuevoImpuesto({ ...EMPTY_IMPUESTO }) }}
            variant="outlined"
            size="small"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!isFormValid || createImpuesto.isPending}
            onClick={() => createImpuesto.mutate(nuevoImpuesto as typeof EMPTY_IMPUESTO)}
            sx={{
              bgcolor: ERP_COLOR,
              '&:hover': { bgcolor: '#0D2347' },
            }}
          >
            {createImpuesto.isPending ? 'Registrando...' : 'Registrar impuesto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
