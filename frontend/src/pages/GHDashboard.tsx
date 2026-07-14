import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  PeopleAlt,
  TrendingUp,
  LocalHospital,
  BeachAccess,
  DirectionsCar,
  Person,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const GH_COLOR = '#BE185D'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HCMKPIs {
  headcount_total: number
  colaboradores_activos: number
  conductores_activos: number
  rotacion_mensual: number
  nuevos_ingresos: number
  incapacidades_activas: number
  vacaciones_pendientes_aprobacion: number
  ausentismo_reciente?: AusentismoItem[]
}

interface HCMAlerta {
  id: number
  tipo: string
  mensaje: string
  severidad: 'danger' | 'warning' | 'info'
  conductor_nombre?: string
  licencia_tipo?: string
  fecha_vencimiento?: string
  dias_restantes?: number
}

interface AusentismoItem {
  id: number
  colaborador: string
  tipo: string
  dias: number
  fecha_inicio: string
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonKPI() {
  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Box sx={{ bgcolor: '#F3F4F6', height: 48, borderRadius: 1, mb: 1, width: 90 }} />
          <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1, width: 120 }} />
          <Box sx={{ bgcolor: '#F3F4F6', height: 12, borderRadius: 1, width: 80, mt: 0.5 }} />
        </Box>
        <Box sx={{ bgcolor: '#F3F4F6', width: 44, height: 44, borderRadius: '11px' }} />
      </Stack>
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <LinearProgress variant="determinate" value={0} sx={{ height: 4, borderRadius: 0 }} />
      </Box>
    </Paper>
  )
}

function SkeletonStat() {
  return (
    <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Box sx={{ bgcolor: '#F3F4F6', height: 40, borderRadius: 1, mb: 1, width: 60 }} />
          <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1, width: 140 }} />
        </Box>
        <Box sx={{ bgcolor: '#F3F4F6', width: 44, height: 44, borderRadius: '11px' }} />
      </Stack>
    </Paper>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: React.ReactNode
  unit?: string
  target?: string
  icon: React.ReactElement
  color: string
  progressValue?: number
  badge?: React.ReactNode
}

function KPICard({ label, value, unit, target, icon, color, progressValue = 0, badge }: KPICardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Stack direction="row" alignItems="baseline" spacing={0.75}>
            <Typography fontSize={60} fontWeight={800} color={color} lineHeight={1}>
              {value}
            </Typography>
            {unit && (
              <Typography fontSize={14} fontWeight={600} color={color}>
                {unit}
              </Typography>
            )}
          </Stack>
          <Typography fontSize={12} color="text.secondary" mt={0.5}>
            {label}
          </Typography>
          {target && (
            <Typography fontSize={11} color="text.disabled" mt={0.25}>
              {target}
            </Typography>
          )}
          {badge && <Box mt={0.75}>{badge}</Box>}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '11px',
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 22, color } })}
        </Box>
      </Stack>
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(progressValue, 100)}
          sx={{
            height: 4,
            borderRadius: 0,
            bgcolor: alpha(color, 0.15),
            '& .MuiLinearProgress-bar': { bgcolor: color },
          }}
        />
      </Box>
    </Paper>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  count: number
  icon: React.ReactElement
  color: string
  sublabel?: string
  chip?: React.ReactNode
}

function StatCard({ label, count, icon, color, sublabel, chip }: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        p: 2.5,
        height: '100%',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography fontSize={36} fontWeight={800} color={color}>
            {count}
          </Typography>
          <Typography fontSize={13} fontWeight={600} color="text.primary" mt={0.25}>
            {label}
          </Typography>
          {sublabel && (
            <Typography fontSize={11} color="text.secondary" mt={0.25}>
              {sublabel}
            </Typography>
          )}
          {chip && <Box mt={1}>{chip}</Box>}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '11px',
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 22, color } })}
        </Box>
      </Stack>
    </Paper>
  )
}

// ─── Dias chip ────────────────────────────────────────────────────────────────

function DiasChip({ dias }: { dias: number }) {
  let color: 'error' | 'warning' | 'default' | 'success' = 'success'
  let label = `${dias}d`

  if (dias < 0) {
    color = 'error'
    label = 'Vencido'
  } else if (dias < 7) {
    color = 'error'
    label = `${dias}d`
  } else if (dias < 30) {
    color = 'warning'
    label = `${dias}d`
  }

  return (
    <Chip
      label={label}
      size="small"
      color={color}
      sx={{ fontSize: 11, fontWeight: 700, height: 20 }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GHDashboard() {
  const {
    data: kpis,
    isLoading: kpisLoading,
    error,
  } = useQuery<HCMKPIs>({
    queryKey: ['hcm-kpis'],
    queryFn: () => api.get('/hcm/dashboard/kpis').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: alertas } = useQuery<HCMAlerta[]>({
    queryKey: ['hcm-alertas'],
    queryFn: () => api.get('/hcm/dashboard/alertas').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const headcount = kpis?.headcount_total ?? 0
  const activos = kpis?.colaboradores_activos ?? 0
  const activosPct = headcount > 0 ? Math.round((activos / headcount) * 100) : 0
  const rotacion = kpis?.rotacion_mensual ?? 0
  const rotacionColor =
    rotacion < 5 ? '#16A34A' : rotacion < 10 ? '#D97706' : '#DC2626'

  const licencias = alertas?.filter((a) => a.fecha_vencimiento) ?? []
  const ausentismo = kpis?.ausentismo_reciente ?? []

  return (
    <Layout title="HCM — Gestión Humana">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: alpha(GH_COLOR, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PeopleAlt sx={{ color: GH_COLOR, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontSize={22} fontWeight={800} color="text.primary">
              Gestión Humana — HCM
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              Human Capital Management
            </Typography>
          </Box>
        </Stack>

        {/* ── Alerts strip ──────────────────────────────────────────────── */}
        {alertas && alertas.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 0.5,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: '#D1D5DB' },
            }}
          >
            {alertas.slice(0, 5).map((a) => (
              <Chip
                key={a.id}
                label={a.mensaje}
                size="small"
                sx={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor:
                    a.severidad === 'danger'
                      ? alpha('#DC2626', 0.1)
                      : a.severidad === 'warning'
                      ? alpha('#D97706', 0.1)
                      : alpha('#2563EB', 0.1),
                  color:
                    a.severidad === 'danger'
                      ? '#DC2626'
                      : a.severidad === 'warning'
                      ? '#D97706'
                      : '#2563EB',
                  border: `1px solid ${
                    a.severidad === 'danger'
                      ? alpha('#DC2626', 0.3)
                      : a.severidad === 'warning'
                      ? alpha('#D97706', 0.3)
                      : alpha('#2563EB', 0.3)
                  }`,
                }}
              />
            ))}
          </Box>
        )}

        {error && (
          <Alert severity="error">
            No se pudieron cargar los KPIs. Verifique la conexión con el servidor.
          </Alert>
        )}

        {/* ── Row 1: 4 KPI Cards ────────────────────────────────────────── */}
        <Box>
          <Typography
            fontSize={13}
            fontWeight={700}
            color="text.secondary"
            mb={1.5}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Indicadores de Fuerza Laboral
          </Typography>
          <Grid container spacing={2}>
            {/* Headcount Total */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              {kpisLoading ? (
                <SkeletonKPI />
              ) : (
                <KPICard
                  label="Headcount Total"
                  value={headcount}
                  target="Planta total de colaboradores"
                  icon={<PeopleAlt />}
                  color="#374151"
                  progressValue={100}
                  badge={
                    <Chip
                      label="TOTAL"
                      size="small"
                      sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#F3F4F6', color: '#6B7280' }}
                    />
                  }
                />
              )}
            </Grid>

            {/* Colaboradores Activos */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              {kpisLoading ? (
                <SkeletonKPI />
              ) : (
                <KPICard
                  label="Colaboradores Activos"
                  value={activos}
                  unit={`(${activosPct}%)`}
                  target={`de ${headcount} en planta`}
                  icon={<Person />}
                  color="#16A34A"
                  progressValue={activosPct}
                  badge={
                    <Chip
                      label="ACTIVO"
                      size="small"
                      sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: alpha('#16A34A', 0.1), color: '#16A34A' }}
                    />
                  }
                />
              )}
            </Grid>

            {/* Conductores Activos */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              {kpisLoading ? (
                <SkeletonKPI />
              ) : (
                <KPICard
                  label="Conductores Activos"
                  value={kpis?.conductores_activos ?? 0}
                  target="Con licencia vigente"
                  icon={<DirectionsCar />}
                  color={GH_COLOR}
                  progressValue={
                    headcount > 0
                      ? Math.round(((kpis?.conductores_activos ?? 0) / headcount) * 100)
                      : 0
                  }
                  badge={
                    <Chip
                      label="CONDUCTORES"
                      size="small"
                      sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: alpha(GH_COLOR, 0.1), color: GH_COLOR }}
                    />
                  }
                />
              )}
            </Grid>

            {/* Rotación Mensual */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              {kpisLoading ? (
                <SkeletonKPI />
              ) : (
                <KPICard
                  label="Rotación Mensual"
                  value={rotacion.toFixed(1)}
                  unit="%"
                  target="Meta: < 5%"
                  icon={<TrendingUp />}
                  color={rotacionColor}
                  progressValue={Math.min(rotacion * 5, 100)}
                  badge={
                    <Chip
                      label={rotacion < 5 ? 'ÓPTIMO' : rotacion < 10 ? 'MODERADO' : 'ALTO'}
                      size="small"
                      sx={{
                        fontSize: 10,
                        height: 18,
                        fontWeight: 700,
                        bgcolor: alpha(rotacionColor, 0.1),
                        color: rotacionColor,
                      }}
                    />
                  }
                />
              )}
            </Grid>
          </Grid>
        </Box>

        {/* ── Row 2: 3 Stat Cards ───────────────────────────────────────── */}
        <Box>
          <Typography
            fontSize={13}
            fontWeight={700}
            color="text.secondary"
            mb={1.5}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Estado del Período
          </Typography>
          <Grid container spacing={2}>
            {/* Nuevos Ingresos */}
            <Grid size={{ xs: 12, sm: 4 }}>
              {kpisLoading ? (
                <SkeletonStat />
              ) : (
                <StatCard
                  label="Nuevos Ingresos"
                  count={kpis?.nuevos_ingresos ?? 0}
                  icon={<TrendingUp />}
                  color="#2563EB"
                  sublabel="Este mes"
                />
              )}
            </Grid>

            {/* Incapacidades Activas */}
            <Grid size={{ xs: 12, sm: 4 }}>
              {kpisLoading ? (
                <SkeletonStat />
              ) : (
                <StatCard
                  label="Incapacidades Activas"
                  count={kpis?.incapacidades_activas ?? 0}
                  icon={<LocalHospital />}
                  color="#EA580C"
                  sublabel="Colaboradores en incapacidad"
                  chip={
                    (kpis?.incapacidades_activas ?? 0) > 5 ? (
                      <Chip
                        label="ALTO"
                        size="small"
                        color="error"
                        sx={{ fontSize: 10, height: 20, fontWeight: 700 }}
                      />
                    ) : (kpis?.incapacidades_activas ?? 0) > 0 ? (
                      <Chip
                        label="ATENCIÓN"
                        size="small"
                        color="warning"
                        sx={{ fontSize: 10, height: 20, fontWeight: 700 }}
                      />
                    ) : null
                  }
                />
              )}
            </Grid>

            {/* Vacaciones Pendientes */}
            <Grid size={{ xs: 12, sm: 4 }}>
              {kpisLoading ? (
                <SkeletonStat />
              ) : (
                <StatCard
                  label="Vacaciones Pend. Aprobación"
                  count={kpis?.vacaciones_pendientes_aprobacion ?? 0}
                  icon={<BeachAccess />}
                  color="#D97706"
                  sublabel="Solicitudes por aprobar"
                  chip={
                    (kpis?.vacaciones_pendientes_aprobacion ?? 0) > 3 ? (
                      <Chip
                        label="REVISAR"
                        size="small"
                        sx={{
                          fontSize: 10,
                          height: 20,
                          fontWeight: 700,
                          bgcolor: alpha('#D97706', 0.15),
                          color: '#D97706',
                        }}
                      />
                    ) : null
                  }
                />
              )}
            </Grid>
          </Grid>
        </Box>

        {/* ── Row 3: Two tables ─────────────────────────────────────────── */}
        <Grid container spacing={2}>
          {/* Vencimientos de Licencias */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%' }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                  <Typography fontWeight={700} fontSize={14}>
                    Vencimientos de Licencias
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    Conductores con licencia próxima a vencer
                  </Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1 } }}
                      >
                        <TableCell>Conductor</TableCell>
                        <TableCell>Licencia</TableCell>
                        <TableCell>Vence</TableCell>
                        <TableCell>Días</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kpisLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 4 }).map((_, j) => (
                                <TableCell key={j}>
                                  <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1 }} />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        : licencias.length === 0
                        ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                              Sin vencimientos próximos
                            </TableCell>
                          </TableRow>
                        )
                        : licencias.map((a) => {
                            const dias =
                              a.fecha_vencimiento
                                ? differenceInDays(new Date(a.fecha_vencimiento), new Date())
                                : 999
                            return (
                              <TableRow key={a.id} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  {a.conductor_nombre ?? '—'}
                                </TableCell>
                                <TableCell>{a.licencia_tipo ?? '—'}</TableCell>
                                <TableCell>
                                  {a.fecha_vencimiento
                                    ? format(new Date(a.fecha_vencimiento), 'dd MMM yyyy', { locale: es })
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  <DiasChip dias={dias} />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Ausentismo Reciente */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', height: '100%' }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                  <Typography fontWeight={700} fontSize={14}>
                    Ausentismo Reciente
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    Incapacidades últimos 7 días
                  </Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1 } }}
                      >
                        <TableCell>Colaborador</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Días</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kpisLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 3 }).map((_, j) => (
                                <TableCell key={j}>
                                  <Box sx={{ bgcolor: '#F3F4F6', height: 14, borderRadius: 1 }} />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        : ausentismo.length === 0
                        ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                              Sin ausentismo reciente
                            </TableCell>
                          </TableRow>
                        )
                        : ausentismo.map((item) => (
                            <TableRow key={item.id} hover sx={{ '& td': { fontSize: 12, py: 1 } }}>
                              <TableCell sx={{ fontWeight: 600 }}>{item.colaborador}</TableCell>
                              <TableCell>
                                <Chip
                                  label={item.tipo}
                                  size="small"
                                  sx={{
                                    fontSize: 10,
                                    height: 20,
                                    fontWeight: 600,
                                    bgcolor: alpha('#EA580C', 0.1),
                                    color: '#EA580C',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography fontSize={12} fontWeight={600} color="text.secondary">
                                  {item.dias}d
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      </Box>
    </Layout>
  )
}
