/**
 * AGS · Tablero — cómo va el día y cómo va el mes.
 */
import {
  Box, Typography, Stack, Card, CardContent, Chip, Divider, alpha, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Alert, LinearProgress, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  CalendarMonth, TrendingUp, TrendingDown, Payments, PersonOff, WarningAmber,
  Groups, ArrowForward, Place, NotificationsActive, Insights,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtCortoCOP, fmtFechaCorta, estadoCita,
  type DashboardAGS,
} from '@/utils/ags'

function KPI({ titulo, valor, detalle, color, icono, onClick }: {
  titulo: string; valor: string; detalle?: string; color: string
  icono: React.ReactNode; onClick?: () => void
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%', cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`,
        transition: 'transform .15s, box-shadow .15s',
        ...(onClick ? { '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } } : {}),
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap>{titulo}</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>{valor}</Typography>
            {detalle && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {detalle}
              </Typography>
            )}
          </Box>
          <Box sx={{
            width: 38, height: 38, borderRadius: 1.5, flexShrink: 0,
            bgcolor: alpha(color, 0.12), color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icono}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function AGSDashboard() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<DashboardAGS>({
    queryKey: ['ags-dashboard'],
    queryFn: async () => (await api.get('/ags/dashboard')).data,
  })

  const subiendo = (data?.variacion_pct ?? 0) >= 0

  return (
    <Layout title="Tablero">
      <Box className="anim-page-in">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{data?.negocio ?? 'Agenda de Servicios'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {fmtFechaCorta(`${data?.fecha ?? ''}T12:00:00`)} · resumen del día y del mes
            </Typography>
          </Box>
          <Button
            variant="contained" startIcon={<CalendarMonth />}
            onClick={() => navigate('/ags/agenda')}
            sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
          >
            Ir a la agenda
          </Button>
        </Stack>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {/* ── KPIs del día ── */}
        <Typography variant="overline" color="text.secondary">Hoy</Typography>
        <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }} className="anim-stagger">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Citas de hoy" valor={String(data?.citas_hoy ?? 0)}
              detalle={`${data?.atendidas_hoy ?? 0} atendidas · ${data?.pendientes_hoy ?? 0} pendientes`}
              color="#0284C7" icono={<CalendarMonth />} onClick={() => navigate('/ags/agenda')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Facturado hoy" valor={fmtCortoCOP(data?.ingresos_hoy)}
              detalle={`${fmtCOP(data?.recaudado_hoy)} recaudado`}
              color="#16A34A" icono={<Payments />} onClick={() => navigate('/ags/ingresos')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Ocupación de hoy" valor={`${data?.ocupacion_hoy_pct ?? 0}%`}
              detalle="minutos vendidos sobre la jornada del equipo"
              color="#CA8A04" icono={<Insights />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Por cobrar" valor={fmtCortoCOP(data?.por_cobrar)}
              detalle={`en ${data?.citas_por_cobrar ?? 0} cita(s) atendidas`}
              color={(data?.por_cobrar ?? 0) > 0 ? '#DC2626' : '#64748B'}
              icono={<WarningAmber />} onClick={() => navigate('/ags/ingresos')}
            />
          </Grid>
        </Grid>

        {/* ── KPIs del mes ── */}
        <Typography variant="overline" color="text.secondary">Este mes</Typography>
        <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Ingresos del mes" valor={fmtCortoCOP(data?.ingresos_mes)}
              detalle={data?.variacion_pct === null || data?.variacion_pct === undefined
                ? 'sin mes anterior para comparar'
                : `${subiendo ? '+' : ''}${data.variacion_pct}% vs. mes anterior`}
              color={subiendo ? '#16A34A' : '#DC2626'}
              icono={subiendo ? <TrendingUp /> : <TrendingDown />}
              onClick={() => navigate('/ags/ingresos')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Ticket promedio" valor={fmtCortoCOP(data?.ticket_promedio_mes)}
              detalle={`${data?.citas_mes ?? 0} citas completadas`}
              color="#7C3AED" icono={<Payments />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Comisiones" valor={fmtCortoCOP(data?.comisiones_mes)}
              detalle="a liquidar al equipo"
              color="#0891B2" icono={<Groups />} onClick={() => navigate('/ags/ingresos')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPI
              titulo="Inasistencias" valor={String(data?.no_show_mes ?? 0)}
              detalle={`${data?.tasa_no_show_pct ?? 0}% de las citas del mes`}
              color={(data?.tasa_no_show_pct ?? 0) > 10 ? '#DC2626' : '#64748B'}
              icono={<PersonOff />}
            />
          </Grid>
        </Grid>

        {/* ── Avisos accionables ── */}
        {(data?.sin_recordatorio ?? 0) > 0 && (
          <Alert
            severity="info" icon={<NotificationsActive />} sx={{ mb: 2 }}
            action={
              <Button size="small" onClick={() => navigate('/ags/agenda')}>Ver agenda</Button>
            }
          >
            Hay <strong>{data?.sin_recordatorio}</strong> cita(s) de hoy sin recordatorio enviado.
            Confirmarlas por WhatsApp es la forma más directa de bajar las inasistencias.
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Agenda de hoy */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={800}>Agenda de hoy</Typography>
                  <Button
                    size="small" endIcon={<ArrowForward />} onClick={() => navigate('/ags/agenda')}
                    sx={{ color: AGS_COLOR }}
                  >
                    Abrir
                  </Button>
                </Stack>
                {(data?.agenda_hoy ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No hay citas para hoy.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Hora</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Servicio</TableCell>
                        <TableCell>Atiende</TableCell>
                        <TableCell align="right">Valor</TableCell>
                        <TableCell>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data?.agenda_hoy ?? []).map(c => {
                        const est = estadoCita(c.estado)
                        return (
                          <TableRow key={c.id} hover>
                            <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                              {c.hora}
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <span>{c.cliente}</span>
                                {c.lugar === 'DOMICILIO' && (
                                  <Tooltip title="Servicio a domicilio">
                                    <Place sx={{ fontSize: 13, color: 'text.secondary' }} />
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{c.servicios}</Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Box sx={{
                                  width: 8, height: 8, borderRadius: '50%',
                                  bgcolor: c.profesional_color || AGS_COLOR,
                                }} />
                                <Typography variant="caption">{c.profesional}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{fmtCOP(c.total)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small" label={est.label}
                                sx={{
                                  height: 20, fontSize: 10.5, fontWeight: 700,
                                  bgcolor: alpha(est.color, 0.13), color: est.color,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Próximas + top servicios */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={2}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                    Próximos 7 días
                  </Typography>
                  {(data?.proximas ?? []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Sin citas próximas.
                    </Typography>
                  ) : (
                    <Stack spacing={0.8} sx={{ maxHeight: 260, overflowY: 'auto' }}>
                      {(data?.proximas ?? []).map(c => (
                        <Stack
                          key={c.id} direction="row" spacing={1} alignItems="center"
                          sx={{ p: 0.8, borderRadius: 1, bgcolor: alpha(AGS_COLOR, 0.04) }}
                        >
                          <Box sx={{ minWidth: 76 }}>
                            <Typography variant="caption" fontWeight={700} display="block">
                              {fmtFechaCorta(c.fecha_inicio)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{c.hora}</Typography>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} noWrap display="block">
                              {c.cliente}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {c.servicios}
                            </Typography>
                          </Box>
                          <Typography variant="caption" fontWeight={700}>{fmtCortoCOP(c.total)}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                    Servicios más vendidos del mes
                  </Typography>
                  {(data?.top_servicios ?? []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Todavía no hay ventas este mes.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {(data?.top_servicios ?? []).map(s => (
                        <Box key={s.servicio}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" fontWeight={600} noWrap>{s.servicio}</Typography>
                            <Typography variant="caption" fontWeight={700}>{fmtCortoCOP(s.ingresos)}</Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate" value={Math.min(s.participacion_pct, 100)}
                            sx={{
                              height: 5, borderRadius: 3, mt: 0.3,
                              bgcolor: alpha(AGS_COLOR, 0.1),
                              '& .MuiLinearProgress-bar': { bgcolor: AGS_COLOR },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {s.veces} vez/veces · {s.participacion_pct}% · {fmtCOP(s.ingreso_por_hora)}/hora
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
