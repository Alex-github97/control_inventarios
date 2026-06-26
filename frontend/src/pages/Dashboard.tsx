import React, { useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Skeleton, Alert, Chip, Table,
  TableBody, TableCell, TableRow, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'
import {
  ViewModule, LocalShipping, LocationOn, Warning, Build,
  TrendingUp, Assignment, NotificationsActive, Inventory2, AccessTime, AttachMoney,
  Timer,
} from '@mui/icons-material'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { Layout } from '@/components/layout/Layout'
import { KPICard } from '@/components/dashboard/KPICard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const PIE_COLORS = ['#32AC5C', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 }).format(v)

export default function Dashboard() {
  const [bodegaId, setBodegaId] = useState<number | ''>('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60000,
  })

  const { data: bodegas = [] } = useQuery({
    queryKey: ['dashboard-bodegas-cliente'],
    queryFn: dashboardApi.ubicacionesClientes,
    staleTime: 300000,
  })

  const { data: retornoData, isLoading: isLoadingRetorno } = useQuery({
    queryKey: ['dashboard-retorno', bodegaId],
    queryFn: () => dashboardApi.retorno(bodegaId === '' ? undefined : bodegaId),
    staleTime: 60000,
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
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="Faltantes"
            value={isLoading ? '—' : (kpis?.faltantes ?? 0)}
            icon={<Warning />}
            color="#C2410C"
            subtitle="Pendientes de resolución"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="Pérdidas"
            value={isLoading ? '—' : (kpis?.perdidas ?? 0)}
            icon={<Warning />}
            color="#7F1D1D"
            subtitle={isLoading ? '' : `${formatCOP(kpis?.valor_perdidas ?? 0)} en valor`}
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

      {/* Third KPI Row — Tiempo de uso, Costos y Retorno */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <KPICard
            title="Edad Promedio (meses)"
            value={isLoading ? '—' : `${kpis?.edad_promedio_meses ?? 0} m`}
            icon={<AccessTime />}
            color="#8B5CF6"
            subtitle="Tiempo promedio en el sistema"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            title="Costos Acumulados"
            value={isLoading ? '—' : formatCOP(kpis?.total_costos_acumulados ?? 0)}
            icon={<AttachMoney />}
            color="#F59E0B"
            subtitle="Total mantenimientos registrados"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            title="Tiempo Prom. Retorno"
            value={isLoading ? '—' : `${kpis?.tiempo_promedio_retorno_dias ?? 0} días`}
            icon={<Timer />}
            color="#06B6D4"
            subtitle="Promedio CARGA → RETORNO (12 meses)"
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

      {/* Charts Row — Tiempo de uso y Costos por mes */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Tiempo de Uso por Estiba
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.edad_distribucion ?? []} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [v, 'Estibas']} />
                    <Bar dataKey="cantidad" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Estibas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', textAlign: 'center', mt: 0.5 }}>
                Distribución por antigüedad en meses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Costos de Mantenimiento por Mes
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (data?.costos_por_mes ?? []).length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94A3B8' }}>
                  <Typography variant="body2">Sin registros de costos aún</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data?.costos_por_mes ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCOP(v)} width={80} />
                    <Tooltip formatter={(v: any) => [formatCOP(Number(v)), 'Costo']} />
                    <Line type="monotone" dataKey="costo_total" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4, fill: '#F59E0B' }} name="Costo total" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', textAlign: 'center', mt: 0.5 }}>
                Últimos 12 meses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tiempo Promedio de Retorno por Mes */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Tiempo Promedio de Retorno por Mes
                </Typography>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Bodega de cliente</InputLabel>
                  <Select
                    value={bodegaId}
                    label="Bodega de cliente"
                    onChange={e => setBodegaId(e.target.value as number | '')}
                  >
                    <MenuItem value="">Todas las bodegas</MenuItem>
                    {bodegas.map(b => (
                      <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {isLoadingRetorno ? (
                <Skeleton variant="rectangular" height={240} />
              ) : (retornoData?.retorno_por_mes ?? []).length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94A3B8' }}>
                  <Typography variant="body2">Sin retornos registrados en los últimos 12 meses</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={retornoData?.retorno_por_mes ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => `${v}d`}
                      label={{ value: 'Días', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <Tooltip
                      formatter={(v: any, name: string) => [`${v} días`, 'Promedio retorno']}
                      labelFormatter={label => `Mes: ${label}`}
                    />
                    <Legend formatter={() => 'Días promedio CARGA → RETORNO'} />
                    <Line
                      type="monotone"
                      dataKey="promedio_dias"
                      stroke="#06B6D4"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#06B6D4' }}
                      activeDot={{ r: 7 }}
                      name="promedio_dias"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', textAlign: 'center', mt: 0.5 }}>
                Días transcurridos entre el movimiento de CARGA y el siguiente RETORNO por estiba — últimos 12 meses
              </Typography>
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
