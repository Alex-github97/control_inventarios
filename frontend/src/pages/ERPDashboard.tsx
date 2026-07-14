import React, { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Chip,
  Skeleton,
  LinearProgress,
  Divider,
  Avatar,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TrendingUp,
  AccountBalance,
  Receipt,
  Payments,
  Assessment,
  Warning,
  CheckCircle,
  MoneyOff,
  Business,
  CurrencyExchange,
  Refresh,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Palette ─────────────────────────────────────────────────────────────────

const NAVY       = '#0C1E3D'   // header band
const NAVY_MID   = '#1A3A6B'   // accent label text
const BLUE       = '#2563EB'   // primary action / info
const PAGE_BG    = '#F0F2F5'   // matches Layout default

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function formatMillions(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)} Bil`
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} M`
  }
  return formatCurrency(n)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ERPKPIs {
  facturacion: {
    total_facturas: number
    total_facturado: number
    cartera_total: number
    cartera_vencida: number
  }
  cuentas_pagar: {
    total_facturas: number
    total_por_pagar: number
  }
  activos_fijos: {
    total_activos: number
    valor_adquisicion: number
    valor_libro: number
  }
  presupuesto: {
    presupuestado: number
    ejecutado: number
    ejecucion_pct: number
  }
  tesoreria: {
    saldo_bancario: number
  }
  compras: {
    oc_pendientes: number
    valor_oc_pendiente: number
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string
  subtitle: string
  value: string
  rawValue?: number
  borderColor: string
  iconColor: string
  icon: React.ReactElement
  loading: boolean
  chip?: { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' }
  secondLine?: string
}

function KPICard({
  title,
  subtitle,
  value,
  borderColor,
  iconColor,
  icon,
  loading,
  chip,
  secondLine,
}: KPICardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        borderLeft: `4px solid ${borderColor}`,
        bgcolor: '#FFFFFF',
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.09)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      {/* Icon + title */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          {loading ? (
            <Skeleton width={120} height={18} />
          ) : (
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: '#64748B',
              }}
            >
              {title}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            bgcolor: alpha(iconColor, 0.1),
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 20, color: iconColor } })}
        </Avatar>
      </Box>

      {/* Big number */}
      {loading ? (
        <Skeleton width="70%" height={44} />
      ) : (
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>
      )}

      {/* Subtitle + chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
        {loading ? (
          <Skeleton width="80%" height={14} />
        ) : (
          <>
            <Typography sx={{ fontSize: 12, color: '#64748B', flex: 1 }}>
              {subtitle}
            </Typography>
            {chip && (
              <Chip
                label={chip.label}
                color={chip.color}
                size="small"
                sx={{ fontSize: 10, fontWeight: 700, height: 20 }}
              />
            )}
          </>
        )}
      </Box>

      {/* Optional second info line */}
      {secondLine && !loading && (
        <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
          {secondLine}
        </Typography>
      )}
    </Card>
  )
}

// ─── Stat Pill (bottom row) ───────────────────────────────────────────────────

interface StatPillProps {
  label: string
  value: string
  icon: React.ReactElement
  color: string
  loading: boolean
}

function StatPill({ label, value, icon, color, loading }: StatPillProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        px: 2,
        py: 1.5,
        flex: 1,
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '9px',
          bgcolor: alpha(color, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 18, color } })}
      </Box>
      <Box>
        {loading ? (
          <>
            <Skeleton width={60} height={20} />
            <Skeleton width={90} height={13} />
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {value}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.25 }}>
              {label}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ERPDashboard() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const {
    data: kpis,
    isLoading,
    refetch,
  } = useQuery<ERPKPIs>({
    queryKey: ['erp-dashboard-kpis'],
    queryFn: () => apiClient.get('/erp/dashboard/kpis').then((r) => r.data),
    refetchInterval: 120_000,
  })

  function handleRefresh() {
    refetch()
    setLastRefresh(new Date())
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const totalFacturado   = kpis?.facturacion.total_facturado ?? 0
  const carteraTotal     = kpis?.facturacion.cartera_total ?? 0
  const carteraVencida   = kpis?.facturacion.cartera_vencida ?? 0
  const totalPorPagar    = kpis?.cuentas_pagar.total_por_pagar ?? 0
  const saldoBancario    = kpis?.tesoreria.saldo_bancario ?? 0
  const ocPendientes     = kpis?.compras.oc_pendientes ?? 0
  const valorOCPendiente = kpis?.compras.valor_oc_pendiente ?? 0

  const presupuestado  = kpis?.presupuesto.presupuestado ?? 0
  const ejecutado      = kpis?.presupuesto.ejecutado ?? 0
  const ejecucionPct   = kpis?.presupuesto.ejecucion_pct ?? 0

  const totalActivos     = kpis?.activos_fijos.total_activos ?? 0
  const valorAdquisicion = kpis?.activos_fijos.valor_adquisicion ?? 0
  const valorLibro       = kpis?.activos_fijos.valor_libro ?? 0
  const depreciacionAcum = valorAdquisicion - valorLibro

  // Quick financial ratios (estimates)
  // DSO = (Cartera / Facturado) * 30 days
  const dso = totalFacturado > 0
    ? Math.round((carteraTotal / totalFacturado) * 30)
    : 0
  // DPO = (Por pagar / Facturado) * 30 days (rough proxy)
  const dpo = totalFacturado > 0
    ? Math.round((totalPorPagar / totalFacturado) * 30)
    : 0
  // Working Capital = Cartera + Saldo - Por Pagar
  const workingCapital = carteraTotal + saldoBancario - totalPorPagar

  const vencidaPct = carteraTotal > 0
    ? (carteraVencida / carteraTotal) * 100
    : 0

  const presupBarColor =
    ejecucionPct >= 95 ? '#DC2626'
    : ejecucionPct >= 75 ? '#2563EB'
    : '#16A34A'

  return (
    <Layout title="ERP — Torre de Control Financiera">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header band ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${NAVY} 0%, #1A3A6B 60%, #1D4ED8 100%)`,
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '11px',
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <AccountBalance sx={{ color: '#FFFFFF', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                Torre de Control Financiera
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', mt: 0.25 }}>
                {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label="Actualización automática"
              size="small"
              icon={<CheckCircle sx={{ fontSize: '12px !important', color: '#34D399 !important' }} />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 11,
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.15)',
                height: 26,
              }}
            />
            <Tooltip title={`Última actualización: ${format(lastRefresh, 'HH:mm:ss')}`}>
              <IconButton
                size="small"
                onClick={handleRefresh}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  width: 32,
                  height: 32,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                }}
              >
                <Refresh sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Section label ─────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: NAVY_MID,
            }}
          >
            Indicadores Financieros Clave
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        {/* ── KPI grid: 2 rows × 3 cols ─────────────────────────────────────── */}
        <Grid container spacing={2}>

          {/* 1. Total Facturado */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard
              title="Total Facturado"
              subtitle={`${kpis?.facturacion.total_facturas ?? 0} facturas emitidas`}
              value={formatMillions(totalFacturado)}
              rawValue={totalFacturado}
              borderColor="#16A34A"
              iconColor="#16A34A"
              icon={<Receipt />}
              loading={isLoading}
              chip={{ label: 'Ingresos', color: 'success' }}
            />
          </Grid>

          {/* 2. Cartera Total */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard
              title="Cartera Total"
              subtitle="Cuentas por cobrar activas"
              value={formatMillions(carteraTotal)}
              rawValue={carteraTotal}
              borderColor={BLUE}
              iconColor={BLUE}
              icon={<AccountBalance />}
              loading={isLoading}
              chip={{ label: 'Por cobrar', color: 'info' }}
            />
          </Grid>

          {/* 3. Cartera Vencida */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard
              title="Cartera Vencida"
              subtitle={
                vencidaPct > 0
                  ? `${vencidaPct.toFixed(1)}% de la cartera total`
                  : 'Sin cartera vencida'
              }
              value={formatMillions(carteraVencida)}
              rawValue={carteraVencida}
              borderColor={carteraVencida > 0 ? '#DC2626' : '#16A34A'}
              iconColor={carteraVencida > 0 ? '#DC2626' : '#16A34A'}
              icon={carteraVencida > 0 ? <Warning /> : <CheckCircle />}
              loading={isLoading}
              chip={
                carteraVencida > 0
                  ? { label: 'Requiere gestión', color: 'error' }
                  : { label: 'Al día', color: 'success' }
              }
            />
          </Grid>

          {/* 4. Por Pagar */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard
              title="Por Pagar"
              subtitle={`${kpis?.cuentas_pagar.total_facturas ?? 0} facturas de proveedores`}
              value={formatMillions(totalPorPagar)}
              rawValue={totalPorPagar}
              borderColor="#EA580C"
              iconColor="#EA580C"
              icon={<Payments />}
              loading={isLoading}
              chip={{ label: 'Pasivo corriente', color: 'warning' }}
            />
          </Grid>

          {/* 5. Saldo Bancario */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard
              title="Saldo Bancario"
              subtitle="Disponible en cuentas propias"
              value={formatMillions(saldoBancario)}
              rawValue={saldoBancario}
              borderColor="#0891B2"
              iconColor="#0891B2"
              icon={<CurrencyExchange />}
              loading={isLoading}
              chip={{
                label: saldoBancario >= 0 ? 'Positivo' : 'Déficit',
                color: saldoBancario >= 0 ? 'success' : 'error',
              }}
            />
          </Grid>

          {/* 6. OC Pendientes */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard
              title="OC Pendientes"
              subtitle="Órdenes de compra por recibir"
              value={String(ocPendientes)}
              rawValue={valorOCPendiente}
              borderColor="#7C3AED"
              iconColor="#7C3AED"
              icon={<Assessment />}
              loading={isLoading}
              secondLine={ocPendientes > 0 ? `Valor comprometido: ${formatMillions(valorOCPendiente)}` : undefined}
              chip={{ label: 'Compras', color: 'default' }}
            />
          </Grid>
        </Grid>

        {/* ── Section label ─────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: NAVY_MID,
            }}
          >
            Análisis Detallado
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        {/* ── Two row cards ─────────────────────────────────────────────────── */}
        <Grid container spacing={2}>

          {/* Left: Ejecución Presupuestal */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                p: 2.5,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '9px',
                    bgcolor: alpha(BLUE, 0.1),
                  }}
                >
                  <TrendingUp sx={{ fontSize: 18, color: BLUE }} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    Ejecución Presupuestal
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                    Período actual
                  </Typography>
                </Box>
                {!isLoading && (
                  <Chip
                    label={`${ejecucionPct.toFixed(1)}%`}
                    size="small"
                    sx={{
                      ml: 'auto',
                      bgcolor: alpha(presupBarColor, 0.1),
                      color: presupBarColor,
                      fontWeight: 800,
                      fontSize: 13,
                      height: 28,
                      px: 0.5,
                    }}
                  />
                )}
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Skeleton height={14} />
                  <Skeleton height={8} sx={{ borderRadius: 99 }} />
                  <Skeleton height={14} width="60%" />
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                      Ejecutado
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                      Presupuestado
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: presupBarColor, letterSpacing: '-0.02em' }}>
                      {formatMillions(ejecutado)}
                    </Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#94A3B8', letterSpacing: '-0.02em' }}>
                      {formatMillions(presupuestado)}
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(ejecucionPct, 100)}
                    sx={{
                      height: 10,
                      borderRadius: 99,
                      bgcolor: alpha(presupBarColor, 0.12),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: presupBarColor,
                        borderRadius: 99,
                      },
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                      0%
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                      {ejecucionPct >= 95 ? 'Sobre ejecución' : ejecucionPct >= 75 ? 'En curso normal' : 'Bajo ejecución'}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                      100%
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Disponible
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                        {formatMillions(Math.max(presupuestado - ejecutado, 0))}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Sobremarco
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: ejecutado > presupuestado ? '#DC2626' : '#94A3B8' }}>
                        {ejecutado > presupuestado ? formatMillions(ejecutado - presupuestado) : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Card>
          </Grid>

          {/* Right: Activos Fijos */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                p: 2.5,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '9px',
                    bgcolor: alpha('#7C3AED', 0.1),
                  }}
                >
                  <Business sx={{ fontSize: 18, color: '#7C3AED' }} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    Activos Fijos
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                    Resumen del libro de activos
                  </Typography>
                </Box>
                {!isLoading && (
                  <Chip
                    label={`${totalActivos} activos`}
                    size="small"
                    sx={{
                      ml: 'auto',
                      bgcolor: alpha('#7C3AED', 0.08),
                      color: '#7C3AED',
                      fontWeight: 700,
                      fontSize: 12,
                      height: 26,
                    }}
                  />
                )}
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Skeleton width={120} height={14} />
                      <Skeleton width={100} height={14} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <>
                  {[
                    {
                      label: 'Valor de Adquisición',
                      value: formatMillions(valorAdquisicion),
                      color: '#0F172A',
                      icon: <Receipt sx={{ fontSize: 15 }} />,
                    },
                    {
                      label: 'Valor en Libros',
                      value: formatMillions(valorLibro),
                      color: BLUE,
                      icon: <AccountBalance sx={{ fontSize: 15 }} />,
                    },
                    {
                      label: 'Depreciación Acumulada',
                      value: formatMillions(depreciacionAcum),
                      color: '#EA580C',
                      icon: <MoneyOff sx={{ fontSize: 15 }} />,
                    },
                  ].map((row, i) => (
                    <React.Fragment key={row.label}>
                      {i > 0 && <Divider sx={{ my: 1.5 }} />}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: '#94A3B8' }}>{row.icon}</Box>
                          <Typography sx={{ fontSize: 13, color: '#64748B' }}>
                            {row.label}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: row.color }}>
                          {row.value}
                        </Typography>
                      </Box>
                    </React.Fragment>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  {/* Depreciation ratio bar */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Vida útil consumida
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>
                        {valorAdquisicion > 0
                          ? `${((depreciacionAcum / valorAdquisicion) * 100).toFixed(1)}%`
                          : '—'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        valorAdquisicion > 0
                          ? Math.min((depreciacionAcum / valorAdquisicion) * 100, 100)
                          : 0
                      }
                      sx={{
                        height: 6,
                        borderRadius: 99,
                        bgcolor: alpha('#EA580C', 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#EA580C',
                          borderRadius: 99,
                        },
                      }}
                    />
                  </Box>
                </>
              )}
            </Card>
          </Grid>
        </Grid>

        {/* ── Section label ─────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: NAVY_MID,
            }}
          >
            Ratios de Liquidez (Estimados)
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        {/* ── Bottom quick stats ─────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <StatPill
            label="DSO estimado (días cobro)"
            value={isLoading ? '—' : `${dso} días`}
            icon={<Receipt />}
            color={dso > 45 ? '#DC2626' : dso > 30 ? '#EA580C' : '#16A34A'}
            loading={isLoading}
          />
          <StatPill
            label="DPO estimado (días pago)"
            value={isLoading ? '—' : `${dpo} días`}
            icon={<Payments />}
            color={dpo < 15 ? '#DC2626' : dpo < 30 ? '#EA580C' : '#16A34A'}
            loading={isLoading}
          />
          <StatPill
            label="Capital de Trabajo"
            value={isLoading ? '—' : formatMillions(workingCapital)}
            icon={<CurrencyExchange />}
            color={workingCapital >= 0 ? '#16A34A' : '#DC2626'}
            loading={isLoading}
          />
          <StatPill
            label="Índice Cobertura Cartera"
            value={isLoading ? '—' : carteraTotal > 0 ? `${((saldoBancario / carteraTotal) * 100).toFixed(0)}%` : '—'}
            icon={<Assessment />}
            color={BLUE}
            loading={isLoading}
          />
        </Box>

        {/* ── Footer note ───────────────────────────────────────────────────── */}
        <Typography
          sx={{
            fontSize: 11,
            color: '#64748B',
            textAlign: 'center',
            pb: 1,
          }}
        >
          Datos en tiempo real · ERP ICOLTRANS · Actualización cada 2 minutos
        </Typography>

      </Box>
    </Layout>
  )
}
