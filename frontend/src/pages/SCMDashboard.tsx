import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, CircularProgress, alpha, LinearProgress,
} from '@mui/material'
import { Grain, ShoppingCart, Pending, LocalShipping, Business, TrendingUp, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { getSCMDashboard, SCMDashboardData } from '@/api/scm'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = `rgba(12,77,140,0.25)`

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: '#64748b', PENDIENTE: '#f59e0b', APROBADA: '#22c55e', RECHAZADA: '#ef4444',
  CANCELADA: '#6b7280', ENVIADA: '#3b82f6', CONFIRMADA: '#8b5cf6',
  EN_TRANSITO: '#06b6d4', RECIBIDA_PARCIAL: '#f97316', RECIBIDA: '#10b981',
  CERRADA: '#475569', EN_PROCESO: '#3b82f6', COMPLETADA: '#22c55e',
}

interface KPIProps { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }
function KPICard({ label, value, icon, color, sub }: KPIProps) {
  return (
    <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(color, 0.3)}`, borderRadius: 2 }}>
      <CardContent sx={{ p: '14px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
            {sub && <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>{sub}</Typography>}
          </Box>
          <Box sx={{ color: alpha(color, 0.45), '& svg': { fontSize: 26 } }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function EstadoBar({ data, max }: { data: Record<string, number>; max: number }) {
  const entries = Object.entries(data)
  if (!entries.length) return <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Sin datos aún</Typography>
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {entries.map(([estado, cantidad]) => (
        <Box key={estado}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{estado.replace(/_/g, ' ')}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: ESTADO_COLORS[estado] ?? '#94a3b8' }}>{cantidad}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, max > 0 ? (cantidad / max) * 100 : 0)}
            sx={{ height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: ESTADO_COLORS[estado] ?? '#64748b' } }}
          />
        </Box>
      ))}
    </Box>
  )
}

export default function SCMDashboard() {
  const [data, setData]     = useState<SCMDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSCMDashboard().then(setData).finally(() => setLoading(false))
  }, [])

  const kpis   = data?.kpis
  const maxOC  = data?.oc_por_estado  ? Math.max(...Object.values(data.oc_por_estado),  1) : 1
  const maxSol = data?.sol_por_estado ? Math.max(...Object.values(data.sol_por_estado), 1) : 1

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Grain sx={{ color: SCM_COLOR, fontSize: 30 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Torre de Control SCM</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Supply Chain Management — visibilidad integral</Typography>
          </Box>
          <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: SCM_COLOR }} />
          </Box>
        ) : (
          <>
            {/* KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPICard label="Solicitudes pendientes" value={kpis?.solicitudes_pendientes ?? 0} icon={<Pending />} color="#f59e0b" sub={`de ${kpis?.total_solicitudes ?? 0} totales`} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPICard label="Órdenes activas" value={kpis?.oc_abiertas ?? 0} icon={<ShoppingCart />} color={SCM_COLOR} sub="enviadas, confirmadas o en tránsito" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPICard label="Proveedores activos" value={kpis?.proveedores_activos ?? 0} icon={<Business />} color="#22c55e" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPICard
                  label="Valor OC en proceso"
                  value={`$${((kpis?.valor_oc_en_proceso ?? 0) / 1_000_000).toFixed(1)} M`}
                  icon={<TrendingUp />}
                  color="#8b5cf6"
                  sub="COP"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPICard label="OC en tránsito" value={data?.oc_por_estado?.['EN_TRANSITO'] ?? 0} icon={<LocalShipping />} color="#06b6d4" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPICard label="Total solicitudes" value={kpis?.total_solicitudes ?? 0} icon={<Warning />} color="#ef4444" sub="en todos los estados" />
              </Grid>
            </Grid>

            {/* Estado charts */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 2 }}>Órdenes de Compra por Estado</Typography>
                    <EstadoBar data={data?.oc_por_estado ?? {}} max={maxOC} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 2 }}>Solicitudes por Estado</Typography>
                    <EstadoBar data={data?.sol_por_estado ?? {}} max={maxSol} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Layout>
  )
}
