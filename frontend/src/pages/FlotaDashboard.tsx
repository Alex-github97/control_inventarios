import React from 'react'
import {
  Box, Paper, Typography, Stack, Chip, Button, CircularProgress, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  DirectionsCar as VehiculoIcon,
  Build as MantenimientoIcon,
  People as PersonalIcon,
  LocalGasStation as CombustibleIcon,
  WarningAmber as AlertaIcon,
  CheckCircle as OkIcon,
  Error as VencidoIcon,
  Schedule as PorVencerIcon,
  ArrowForward as GoIcon,
  AttachMoney as CostoIcon,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient as api } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

const GF_COLOR = '#7C3AED'

interface KPIs {
  total_vehiculos: number
  vehiculos_activos: number
  vehiculos_en_mantenimiento: number
  total_personal: number
  conductores_activos: number
  mecanicos: number
  ordenes_abiertas: number
  ordenes_en_proceso: number
  documentos_vencidos: number
  documentos_por_vencer: number
  litros_mes_actual: number
  costo_combustible_mes: number
  costo_mantenimiento_mes: number
}

interface DocVehiculo {
  id: number; vehiculo_id: number; tipo_documento: string
  fecha_vencimiento: string; estado_semaforo: string; dias_para_vencer: number
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const KPICard = ({ label, value, color, icon, sub }: { label: string; value: string | number; color: string; icon: React.ReactNode; sub?: string }) => (
  <Paper elevation={0} className="hover-lift" sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography className="text-gradient" fontSize={28} fontWeight={800} color={color} lineHeight={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
        <Typography fontSize={12} color="text.secondary" mt={0.25}>{label}</Typography>
        {sub && <Typography fontSize={11} color="text.secondary" mt={0.25}>{sub}</Typography>}
      </Box>
      <Box sx={{
        width: 40, height: 40, borderRadius: '10px',
        bgcolor: alpha(color, 0.1),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20, color } })}
      </Box>
    </Stack>
  </Paper>
)

export default function FlotaDashboard() {
  const navigate = useNavigate()

  const { data: kpis, isLoading } = useQuery<KPIs>({
    queryKey: ['flota-kpis'],
    queryFn: () => api.get('/flota/dashboard/kpis').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: docsPorVencer = [] } = useQuery<DocVehiculo[]>({
    queryKey: ['flota-docs-por-vencer'],
    queryFn: () => api.get('/flota/documentos/?estado=POR_VENCER').then(r => r.data),
  })

  const { data: docsVencidos = [] } = useQuery<DocVehiculo[]>({
    queryKey: ['flota-docs-vencidos'],
    queryFn: () => api.get('/flota/documentos/?estado=VENCIDO').then(r => r.data),
  })

  const alertas = [...docsVencidos, ...docsPorVencer]
    .sort((a, b) => a.dias_para_vencer - b.dias_para_vencer)
    .slice(0, 8)

  if (isLoading) return (
    <Layout title="Dashboard — Gestión de Flotas">
      <Box display="flex" justifyContent="center" py={12}><CircularProgress sx={{ color: GF_COLOR }} /></Box>
    </Layout>
  )

  return (
    <Layout title="Dashboard — Gestión de Flotas">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography fontSize={22} fontWeight={800} color="text.primary" letterSpacing="-0.03em">
            Dashboard
          </Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.25}>
            Vista general del estado de la flota vehicular
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            size="small" variant="outlined"
            onClick={() => navigate('/flota/vehiculos')}
            sx={{ borderRadius: '8px', textTransform: 'none', borderColor: alpha(GF_COLOR, 0.5), color: GF_COLOR }}
          >
            Nuevo vehículo
          </Button>
          <Button
            size="small" variant="contained"
            onClick={() => navigate('/flota/mantenimiento')}
            sx={{ borderRadius: '8px', textTransform: 'none', bgcolor: GF_COLOR, '&:hover': { bgcolor: '#6D28D9' } }}
          >
            Nueva orden
          </Button>
        </Stack>
      </Stack>

      {/* KPIs flota */}
      <Grid container spacing={2} mb={3} className="anim-stagger">
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Vehículos activos" value={kpis?.vehiculos_activos ?? 0}
            color={GF_COLOR} icon={<VehiculoIcon />}
            sub={`${kpis?.total_vehiculos ?? 0} en total`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="En mantenimiento" value={kpis?.vehiculos_en_mantenimiento ?? 0}
            color="#F59E0B" icon={<MantenimientoIcon />}
            sub={`${(kpis?.ordenes_abiertas ?? 0) + (kpis?.ordenes_en_proceso ?? 0)} órdenes abiertas`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Conductores activos" value={kpis?.conductores_activos ?? 0}
            color="#32AC5C" icon={<PersonalIcon />}
            sub={`${kpis?.mecanicos ?? 0} mecánicos`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Docs. por vencer / vencidos"
            value={`${kpis?.documentos_por_vencer ?? 0} / ${kpis?.documentos_vencidos ?? 0}`}
            color="#EF4444" icon={<AlertaIcon />} />
        </Grid>
      </Grid>

      {/* KPIs económicos */}
      <Grid container spacing={2} mb={3} className="anim-stagger">
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" gap={1.5} alignItems="center" mb={1}>
              <CombustibleIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
              <Typography fontSize={13} fontWeight={600}>Combustible — mes actual</Typography>
            </Stack>
            <Typography fontSize={24} fontWeight={800} color="#F59E0B">
              {fmt(kpis?.costo_combustible_mes ?? 0)}
            </Typography>
            <Typography fontSize={12} color="text.secondary" mt={0.25}>
              {(kpis?.litros_mes_actual ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} galones
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" gap={1.5} alignItems="center" mb={1}>
              <CostoIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              <Typography fontSize={13} fontWeight={600}>Mantenimiento — mes actual</Typography>
            </Stack>
            <Typography fontSize={24} fontWeight={800} color="#EF4444">
              {fmt(kpis?.costo_mantenimiento_mes ?? 0)}
            </Typography>
            <Typography fontSize={12} color="text.secondary" mt={0.25}>
              {(kpis?.ordenes_abiertas ?? 0) + (kpis?.ordenes_en_proceso ?? 0)} órdenes en curso
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
            <Stack direction="row" gap={1.5} alignItems="center" mb={1}>
              <MantenimientoIcon sx={{ fontSize: 18, color: GF_COLOR }} />
              <Typography fontSize={13} fontWeight={600}>Órdenes de trabajo</Typography>
            </Stack>
            <Stack direction="row" gap={2} mt={1}>
              <Box>
                <Typography fontSize={22} fontWeight={800} color="#EF4444">{kpis?.ordenes_abiertas ?? 0}</Typography>
                <Typography fontSize={11} color="text.secondary">Abiertas</Typography>
              </Box>
              <Box>
                <Typography fontSize={22} fontWeight={800} color="#F59E0B">{kpis?.ordenes_en_proceso ?? 0}</Typography>
                <Typography fontSize={11} color="text.secondary">En proceso</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Alertas documentales */}
      {alertas.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" gap={1} alignItems="center">
              <AlertaIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              <Typography fontSize={14} fontWeight={700}>Alertas documentales</Typography>
            </Stack>
            <Button
              size="small" endIcon={<GoIcon />}
              onClick={() => navigate('/flota/documentos')}
              sx={{ textTransform: 'none', color: GF_COLOR, fontSize: 12 }}
            >
              Ver todos
            </Button>
          </Stack>
          <Stack gap={1}>
            {alertas.map(doc => {
              const isVencido = doc.estado_semaforo === 'VENCIDO'
              const color = isVencido ? '#EF4444' : '#F59E0B'
              const Icon = isVencido ? VencidoIcon : PorVencerIcon
              return (
                <Stack key={doc.id} direction="row" gap={1.5} alignItems="center"
                  sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.2)}` }}>
                  <Icon sx={{ fontSize: 16, color, flexShrink: 0 }} />
                  <Box flex={1}>
                    <Typography fontSize={12} fontWeight={600}>{doc.tipo_documento}</Typography>
                    <Typography fontSize={11} color="text.secondary">Vehículo ID {doc.vehiculo_id}</Typography>
                  </Box>
                  <Chip
                    label={isVencido ? `Vencido hace ${Math.abs(doc.dias_para_vencer)}d` : `Vence en ${doc.dias_para_vencer}d`}
                    size="small"
                    sx={{ bgcolor: alpha(color, 0.12), color, fontSize: 10, height: 20 }}
                  />
                </Stack>
              )
            })}
          </Stack>
        </Paper>
      )}

      {alertas.length === 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3, textAlign: 'center' }}>
          <OkIcon sx={{ fontSize: 40, color: '#32AC5C', mb: 1 }} />
          <Typography fontSize={14} color="text.secondary">
            Sin alertas documentales activas
          </Typography>
        </Paper>
      )}

      {/* Accesos rápidos */}
      <Grid container spacing={1.5} mt={1}>
        {[
          { label: 'Registrar combustible', path: '/flota/combustible', color: '#F59E0B' },
          { label: 'Nueva orden de trabajo', path: '/flota/mantenimiento', color: GF_COLOR },
          { label: 'Ver vehículos', path: '/flota/vehiculos', color: '#32AC5C' },
          { label: 'Gestionar personal', path: '/flota/personal', color: '#3B82F6' },
        ].map(a => (
          <Grid key={a.path} size={{ xs: 6, md: 3 }}>
            <Paper
              elevation={0}
              onClick={() => navigate(a.path)}
              sx={{
                border: `1px solid ${alpha(a.color, 0.3)}`, borderRadius: '12px', p: 2,
                cursor: 'pointer', textAlign: 'center',
                '&:hover': { bgcolor: alpha(a.color, 0.05), borderColor: a.color },
                transition: 'all 0.15s',
              }}
            >
              <Typography fontSize={13} fontWeight={600} color={a.color}>{a.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Layout>
  )
}
