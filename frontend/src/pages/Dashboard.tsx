import React from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Skeleton, Alert, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, Paper, alpha
} from '@mui/material'
import {
  ViewModule, LocalShipping, LocationOn, Warning, Build,
  TrendingUp, Assignment, NotificationsActive, Inventory2
} from '@mui/icons-material'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { Layout } from '@/components/layout/Layout'
import { KPICard } from '@/components/dashboard/KPICard'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const PIE_COLORS = ['#32AC5C', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60000,
  })

  if (error) return (
    <Layout title="Dashboard">
      <Alert severity="error">Error cargando el dashboard. Verifique la conexión.</Alert>
    </Layout>
  )

  const kpis = data?.kpis
  const tendencia = data?.tendencia_movimientos?.slice(-14) ?? []
  const danos = data?.top_danos ?? []

  return (
    <Layout title="Dashboard">
      {/* KPIs Row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="Total Estibas"
            value={isLoading ? '—' : (kpis?.total_estibas ?? 0)}
            icon={<ViewModule />}
            color="#32AC5C"
            subtitle="En el sistema"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="Disponibles"
            value={isLoading ? '—' : (kpis?.disponibles ?? 0)}
            icon={<Inventory2 />}
            color="#3B82F6"
            progress={kpis ? (kpis.disponibles / kpis.total_estibas) * 100 : 0}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="En Tránsito"
            value={isLoading ? '—' : (kpis?.en_transito ?? 0)}
            icon={<LocalShipping />}
            color="#F59E0B"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="En Cliente"
            value={isLoading ? '—' : (kpis?.en_cliente ?? 0)}
            icon={<LocationOn />}
            color="#8B5CF6"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="Pend. Retorno"
            value={isLoading ? '—' : (kpis?.pendiente_retorno ?? 0)}
            icon={<Warning />}
            color="#EA580C"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="Dañadas"
            value={isLoading ? '—' : (kpis?.danadas ?? 0)}
            icon={<Build />}
            color="#EF4444"
          />
        </Grid>
      </Grid>

      {/* Second KPI Row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KPICard
            title="Manifiestos Activos"
            value={isLoading ? '—' : (kpis?.manifiestos_activos ?? 0)}
            icon={<Assignment />}
            color="#06B6D4"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard
            title="Alertas Activas"
            value={isLoading ? '—' : (kpis?.alertas_activas ?? 0)}
            icon={<NotificationsActive />}
            color="#EC4899"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard
            title="Movimientos Hoy"
            value={isLoading ? '—' : (kpis?.movimientos_hoy ?? 0)}
            icon={<TrendingUp />}
            color="#32AC5C"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard
            title="Propias"
            value={isLoading ? '—' : (kpis?.propias ?? 0)}
            subtitle={`Alquiladas: ${kpis?.alquiladas ?? 0}`}
            icon={<ViewModule />}
            color="#27884A"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Tendencia movimientos */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Tendencia de Movimientos (14 días)
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={tendencia}>
                    <defs>
                      <linearGradient id="gCarga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#32AC5C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#32AC5C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDescarga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={v => format(new Date(v), 'dd/MM', { locale: es })} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any, name: string) => [v, name === 'cargas' ? 'Cargas' : 'Descargas']} />
                    <Legend />
                    <Area type="monotone" dataKey="cargas" stroke="#32AC5C" fill="url(#gCarga)" strokeWidth={2} name="Cargas" />
                    <Area type="monotone" dataKey="descargas" stroke="#3B82F6" fill="url(#gDescarga)" strokeWidth={2} name="Descargas" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top daños */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Top Causas de Daño
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : danos.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94A3B8' }}>
                  <Typography>Sin datos de daños</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={danos} dataKey="cantidad" nameKey="descripcion" cx="50%" cy="50%" outerRadius={90} label={({ name, porcentaje }) => `${porcentaje}%`} labelLine={false}>
                      {danos.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Row */}
      <Grid container spacing={2.5}>
        {/* Alertas recientes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Alertas Recientes
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={160} />
              ) : (data?.alertas_recientes ?? []).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: '#94A3B8' }}>
                  <NotificationsActive sx={{ fontSize: 36, mb: 1, opacity: 0.4 }} />
                  <Typography variant="body2">Sin alertas activas</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableBody>
                    {(data?.alertas_recientes ?? []).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell sx={{ py: 1 }}>
                          <Chip label={a.nivel} size="small"
                            sx={{ fontSize: 10, fontWeight: 700, bgcolor: a.nivel === 'CRITICA' ? '#FEE2E2' : '#FEF3C7', color: a.nivel === 'CRITICA' ? '#DC2626' : '#D97706' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{a.titulo}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Ocupación ubicaciones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Ocupación por Ubicación
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={160} />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={(data?.ocupacion_ubicaciones ?? []).slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="total_estibas" fill="#32AC5C" radius={[4, 4, 0, 0]} name="Estibas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  )
}
