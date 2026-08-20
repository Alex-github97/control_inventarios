/**
 * AGS · Ingresos — cuánto entró, por qué medio, quién lo produjo y qué se debe.
 *
 * Cuatro miradas del mismo periodo: la evolución en el tiempo, la producción
 * del equipo (con la comisión a pagar), qué servicios sostienen el negocio y
 * el cuadre de caja del día.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Card, CardContent, Chip, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, alpha, Tabs, Tab, Divider,
  LinearProgress, Alert, Tooltip, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Download, TrendingUp, TrendingDown, Payments, Groups, ContentCut, People,
  PointOfSale, WarningAmber, AccountBalanceWallet,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarExcel } from '@/utils/exportar'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtCortoCOP, fmtMinutos, fmtFecha, hoyISO,
  inicioMesISO, sumarDiasISO, MEDIOS_PAGO,
  type ResumenIngresos, type ProduccionProfesional, type VentaServicio,
  type ClienteRanking, type CierreCaja,
} from '@/utils/ags'

const RANGOS = [
  { label: 'Hoy', desde: () => hoyISO(), hasta: () => hoyISO() },
  { label: '7 días', desde: () => sumarDiasISO(hoyISO(), -6), hasta: () => hoyISO() },
  { label: 'Este mes', desde: () => inicioMesISO(), hasta: () => hoyISO() },
  { label: '90 días', desde: () => sumarDiasISO(hoyISO(), -89), hasta: () => hoyISO() },
]

function nombreMedio(valor: string): string {
  return MEDIOS_PAGO.find(m => m.valor === valor)?.label ?? valor
}

export default function AGSIngresos() {
  const [desde, setDesde] = useState(inicioMesISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [agrupar, setAgrupar] = useState<'dia' | 'semana' | 'mes'>('dia')
  const [tab, setTab] = useState(0)
  const [fechaCaja, setFechaCaja] = useState(hoyISO())

  const params = { desde, hasta }

  const { data: resumen, isLoading } = useQuery<ResumenIngresos>({
    queryKey: ['ags-ingresos', desde, hasta, agrupar],
    queryFn: async () => (await api.get('/ags/reportes/ingresos', {
      params: { ...params, agrupar },
    })).data,
  })
  const { data: porProfesional = [] } = useQuery<ProduccionProfesional[]>({
    queryKey: ['ags-por-profesional', desde, hasta],
    queryFn: async () => (await api.get('/ags/reportes/por-profesional', { params })).data,
  })
  const { data: porServicio = [] } = useQuery<VentaServicio[]>({
    queryKey: ['ags-por-servicio', desde, hasta],
    queryFn: async () => (await api.get('/ags/reportes/por-servicio', { params })).data,
  })
  const { data: porCliente = [] } = useQuery<ClienteRanking[]>({
    queryKey: ['ags-por-cliente', desde, hasta],
    queryFn: async () => (await api.get('/ags/reportes/por-cliente', { params })).data,
  })
  const { data: caja } = useQuery<CierreCaja>({
    queryKey: ['ags-caja', fechaCaja],
    queryFn: async () => (await api.get('/ags/reportes/caja', { params: { fecha: fechaCaja } })).data,
  })

  const maxSerie = useMemo(
    () => Math.max(...(resumen?.serie ?? []).map(p => p.total), 1), [resumen])

  const margenPct = useMemo(() => {
    if (!resumen?.total_ingresos) return 0
    return Math.round(resumen.utilidad_bruta / resumen.total_ingresos * 100)
  }, [resumen])

  const exportar = () => {
    const mapa: Record<number, () => void> = {
      0: () => exportarExcel({
        archivo: `ags-ingresos-${desde}-a-${hasta}`,
        titulo: 'Ingresos por periodo', subtitulo: `${fmtFecha(desde)} a ${fmtFecha(hasta)}`,
        color: AGS_COLOR,
        columnas: [
          { key: 'periodo', header: 'Periodo' },
          { key: 'citas', header: 'Citas' },
          { key: 'servicios', header: 'Servicios' },
          { key: 'materiales', header: 'Materiales' },
          { key: 'descuentos', header: 'Descuentos' },
          { key: 'propinas', header: 'Propinas' },
          { key: 'total', header: 'Total' },
          { key: 'comisiones', header: 'Comisiones' },
          { key: 'utilidad', header: 'Utilidad' },
        ],
        filas: resumen?.serie ?? [],
      }),
      1: () => exportarExcel({
        archivo: `ags-produccion-equipo-${desde}-a-${hasta}`,
        titulo: 'Producción y comisiones del equipo',
        subtitulo: `${fmtFecha(desde)} a ${fmtFecha(hasta)}`, color: AGS_COLOR,
        columnas: [
          { key: 'profesional', header: 'Profesional' },
          { key: 'citas', header: 'Citas' },
          { key: 'servicios', header: 'Mano de obra' },
          { key: 'ingresos', header: 'Ingresos' },
          { key: 'comision', header: 'Comisión a pagar' },
          { key: 'propinas', header: 'Propinas' },
          { key: 'ticket_promedio', header: 'Ticket promedio' },
          { key: 'ocupacion_pct', header: 'Ocupación %' },
          { key: 'no_show', header: 'Inasistencias' },
        ],
        filas: porProfesional,
      }),
      2: () => exportarExcel({
        archivo: `ags-servicios-${desde}-a-${hasta}`,
        titulo: 'Ingresos por servicio',
        subtitulo: `${fmtFecha(desde)} a ${fmtFecha(hasta)}`, color: AGS_COLOR,
        columnas: [
          { key: 'servicio', header: 'Servicio' },
          { key: 'categoria', header: 'Categoría' },
          { key: 'veces', header: 'Veces' },
          { key: 'ingresos', header: 'Ingresos' },
          { key: 'participacion_pct', header: 'Participación %' },
          { key: 'minutos', header: 'Minutos' },
          { key: 'ingreso_por_hora', header: 'Ingreso por hora' },
        ],
        filas: porServicio,
      }),
      3: () => exportarExcel({
        archivo: `ags-clientes-${desde}-a-${hasta}`,
        titulo: 'Ingresos por cliente',
        subtitulo: `${fmtFecha(desde)} a ${fmtFecha(hasta)}`, color: AGS_COLOR,
        columnas: [
          { key: 'cliente', header: 'Cliente' },
          { key: 'telefono', header: 'Teléfono' },
          { key: 'citas', header: 'Citas' },
          { key: 'ingresos', header: 'Ingresos' },
          { key: 'ticket_promedio', header: 'Ticket promedio' },
          { key: 'saldo_pendiente', header: 'Saldo pendiente' },
          { key: 'dias_sin_venir', header: 'Días sin venir' },
        ],
        filas: porCliente,
      }),
      4: () => exportarExcel({
        archivo: `ags-caja-${fechaCaja}`,
        titulo: 'Cierre de caja', subtitulo: fmtFecha(fechaCaja), color: AGS_COLOR,
        columnas: [
          { key: 'medio_pago', header: 'Medio de pago' },
          { key: 'movimientos', header: 'Movimientos' },
          { key: 'total', header: 'Total' },
        ],
        filas: caja?.por_medio ?? [],
      }),
    }
    const fn = mapa[tab]
    if (!fn) return
    fn()
    toast.success('Reporte exportado')
  }

  return (
    <Layout title="Ingresos">
      <Box className="anim-page-in">
        {/* ── Filtros de periodo ── */}
        <Card sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
            <Stack direction="row" spacing={0.6}>
              {RANGOS.map(r => (
                <Chip
                  key={r.label} label={r.label} size="small"
                  onClick={() => { setDesde(r.desde()); setHasta(r.hasta()) }}
                  variant={desde === r.desde() && hasta === r.hasta() ? 'filled' : 'outlined'}
                  sx={desde === r.desde() && hasta === r.hasta()
                    ? { bgcolor: AGS_COLOR, color: '#fff' } : undefined}
                />
              ))}
            </Stack>
            <TextField type="date" size="small" label="Desde" value={desde}
              onChange={e => setDesde(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }} />
            <TextField type="date" size="small" label="Hasta" value={hasta}
              onChange={e => setHasta(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }} />
            <ToggleButtonGroup
              exclusive size="small" value={agrupar}
              onChange={(_e, v) => { if (v) setAgrupar(v) }}
            >
              <ToggleButton value="dia">Día</ToggleButton>
              <ToggleButton value="semana">Semana</ToggleButton>
              <ToggleButton value="mes">Mes</ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ flex: 1 }} />
            <Button startIcon={<Download />} onClick={exportar}>Excel</Button>
          </Stack>
        </Card>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {/* ── KPIs del periodo ── */}
        <Grid container spacing={2} sx={{ mb: 2 }} className="anim-stagger">
          {[
            {
              t: 'Ingresos', v: fmtCortoCOP(resumen?.total_ingresos),
              d: `${resumen?.citas_completadas ?? 0} citas · ticket ${fmtCortoCOP(resumen?.ticket_promedio)}`,
              c: '#16A34A', i: <Payments />,
            },
            {
              t: 'Utilidad bruta', v: fmtCortoCOP(resumen?.utilidad_bruta),
              d: `${margenPct}% del ingreso · descontando comisiones, insumos y propinas`,
              c: margenPct < 30 ? '#DC2626' : '#0891B2', i: <TrendingUp />,
            },
            {
              t: 'Comisiones', v: fmtCortoCOP(resumen?.total_comisiones),
              d: 'a liquidar al equipo', c: '#7C3AED', i: <Groups />,
            },
            {
              t: 'Por cobrar', v: fmtCortoCOP(resumen?.por_cobrar),
              d: (resumen?.por_cobrar ?? 0) > 0 ? 'citas atendidas sin pagar del todo' : 'todo cobrado',
              c: (resumen?.por_cobrar ?? 0) > 0 ? '#DC2626' : '#64748B', i: <WarningAmber />,
            },
          ].map(k => (
            <Grid key={k.t} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', borderLeft: `4px solid ${k.c}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">{k.t}</Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>{k.v}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{k.d}</Typography>
                    </Box>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
                      bgcolor: alpha(k.c, 0.12), color: k.c,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{k.i}</Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {(resumen?.citas_no_asistio ?? 0) > 0 && (
          <Alert severity={(resumen?.tasa_no_show_pct ?? 0) > 10 ? 'warning' : 'info'} sx={{ mb: 2 }}>
            <strong>{resumen?.citas_no_asistio}</strong> inasistencia(s)
            y <strong>{resumen?.citas_canceladas}</strong> cancelación(es) en el periodo
            ({resumen?.tasa_no_show_pct}% de no-show).
            {(resumen?.tasa_no_show_pct ?? 0) > 10 &&
              ' Una tasa por encima del 10% suele bajarse confirmando por WhatsApp el día anterior o pidiendo anticipo.'}
          </Alert>
        )}

        <Card>
          <Tabs
            value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{ borderBottom: '1px solid', borderColor: 'divider',
              '& .Mui-selected': { color: `${AGS_COLOR} !important` },
              '& .MuiTabs-indicator': { bgcolor: AGS_COLOR } }}
          >
            <Tab icon={<TrendingUp fontSize="small" />} iconPosition="start" label="Evolución" />
            <Tab icon={<Groups fontSize="small" />} iconPosition="start" label="Equipo" />
            <Tab icon={<ContentCut fontSize="small" />} iconPosition="start" label="Servicios" />
            <Tab icon={<People fontSize="small" />} iconPosition="start" label="Clientes" />
            <Tab icon={<PointOfSale fontSize="small" />} iconPosition="start" label="Cierre de caja" />
          </Tabs>

          <CardContent>
            {/* ── 0. Evolución ── */}
            {tab === 0 && (
              <Box>
                {(resumen?.serie ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
                    No hay citas completadas en este periodo.
                  </Typography>
                ) : (
                  <>
                    {/* Barras: cada periodo con su total y su utilidad */}
                    <Box sx={{
                      display: 'flex', alignItems: 'flex-end', gap: 0.8, height: 200,
                      overflowX: 'auto', pb: 1, mb: 2,
                    }}>
                      {(resumen?.serie ?? []).map(p => (
                        <Tooltip
                          key={p.periodo} arrow
                          title={
                            <Box>
                              <Typography variant="caption" fontWeight={700} display="block">{p.periodo}</Typography>
                              <Typography variant="caption" display="block">{p.citas} cita(s)</Typography>
                              <Typography variant="caption" display="block">Total {fmtCOP(p.total)}</Typography>
                              <Typography variant="caption" display="block">Utilidad {fmtCOP(p.utilidad)}</Typography>
                              <Typography variant="caption" display="block">Comisiones {fmtCOP(p.comisiones)}</Typography>
                            </Box>
                          }
                        >
                          <Stack alignItems="center" spacing={0.4} sx={{ minWidth: 44, cursor: 'pointer' }}>
                            <Typography variant="caption" sx={{ fontSize: 9.5 }}>
                              {fmtCortoCOP(p.total)}
                            </Typography>
                            <Box sx={{
                              width: '100%', height: `${(p.total / maxSerie) * 150}px`,
                              minHeight: 3, borderRadius: '4px 4px 0 0',
                              background: `linear-gradient(180deg, ${AGS_COLOR}, ${AGS_DARK})`,
                              position: 'relative',
                            }}>
                              {/* Franja interna: la parte que quedó como utilidad */}
                              <Box sx={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                height: `${p.total > 0 ? Math.max(p.utilidad / p.total * 100, 0) : 0}%`,
                                bgcolor: alpha('#FFFFFF', 0.35),
                              }} />
                            </Box>
                            <Typography variant="caption" color="text.secondary"
                              sx={{ fontSize: 9.5, whiteSpace: 'nowrap' }}>
                              {p.periodo}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      La franja clara de cada barra es la utilidad que quedó después de comisiones,
                      insumos y propinas.
                    </Typography>

                    <Divider sx={{ mb: 2 }} />
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Periodo</TableCell>
                          <TableCell align="right">Citas</TableCell>
                          <TableCell align="right">Servicios</TableCell>
                          <TableCell align="right">Materiales</TableCell>
                          <TableCell align="right">Descuentos</TableCell>
                          <TableCell align="right">Propinas</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Comisiones</TableCell>
                          <TableCell align="right">Utilidad</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(resumen?.serie ?? []).map(p => (
                          <TableRow key={p.periodo} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{p.periodo}</TableCell>
                            <TableCell align="right">{p.citas}</TableCell>
                            <TableCell align="right">{fmtCOP(p.servicios)}</TableCell>
                            <TableCell align="right">{fmtCOP(p.materiales)}</TableCell>
                            <TableCell align="right">
                              {p.descuentos > 0 && (
                                <Typography variant="caption" color="error.main">
                                  −{fmtCOP(p.descuentos)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">{fmtCOP(p.propinas)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCOP(p.total)}</TableCell>
                            <TableCell align="right">{fmtCOP(p.comisiones)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700}
                                color={p.utilidad >= 0 ? 'success.main' : 'error.main'}>
                                {fmtCOP(p.utilidad)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </Box>
            )}

            {/* ── 1. Equipo ── */}
            {tab === 1 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Profesional</TableCell>
                    <TableCell align="right">Citas</TableCell>
                    <TableCell align="right">Mano de obra</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                    <TableCell align="right">Comisión a pagar</TableCell>
                    <TableCell align="right">Propinas</TableCell>
                    <TableCell align="right">Ticket</TableCell>
                    <TableCell>Ocupación</TableCell>
                    <TableCell align="right">No-show</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {porProfesional.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Sin datos en este periodo.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {porProfesional.map(p => (
                    <TableRow key={p.profesional_id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Box sx={{
                            width: 9, height: 9, borderRadius: '50%',
                            bgcolor: p.color || AGS_COLOR,
                          }} />
                          <Typography variant="body2" fontWeight={600}>{p.profesional}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{p.citas}</TableCell>
                      <TableCell align="right">{fmtCOP(p.servicios)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCOP(p.ingresos)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="secondary.main">
                          {fmtCOP(p.comision)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{fmtCOP(p.propinas)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{fmtCOP(p.ticket_promedio)}</Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <Tooltip title={`${fmtMinutos(p.minutos_trabajados)} vendidos de ${fmtMinutos(p.minutos_disponibles)} de jornada`}>
                          <Box>
                            <Typography variant="caption" fontWeight={700}>{p.ocupacion_pct}%</Typography>
                            <LinearProgress
                              variant="determinate" value={Math.min(p.ocupacion_pct, 100)}
                              sx={{
                                height: 5, borderRadius: 3, mt: 0.2,
                                bgcolor: alpha(AGS_COLOR, 0.1),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: p.ocupacion_pct > 85 ? '#DC2626'
                                    : p.ocupacion_pct > 50 ? '#16A34A' : '#CA8A04',
                                },
                              }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {p.no_show > 0 && (
                          <Chip size="small" label={p.no_show}
                            sx={{ height: 19, fontSize: 10, bgcolor: alpha('#DC2626', 0.13), color: '#DC2626' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* ── 2. Servicios ── */}
            {tab === 2 && (
              <>
                <Alert severity="info" sx={{ mb: 2, py: 0.3 }}>
                  El <strong>ingreso por hora</strong> ordena mejor que el ingreso total: un servicio
                  caro que ocupa tres horas puede rendir menos que uno barato de veinte minutos.
                </Alert>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Servicio</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Veces</TableCell>
                      <TableCell align="right">Ingresos</TableCell>
                      <TableCell>Participación</TableCell>
                      <TableCell align="right">Tiempo</TableCell>
                      <TableCell align="right">Ingreso/hora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {porServicio.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Sin ventas en este periodo.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {porServicio.map(s => (
                      <TableRow key={s.servicio} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{s.servicio}</TableCell>
                        <TableCell>
                          <Typography variant="caption">{s.categoria ?? '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">{s.veces}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCOP(s.ingresos)}</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          <Typography variant="caption">{s.participacion_pct}%</Typography>
                          <LinearProgress
                            variant="determinate" value={Math.min(s.participacion_pct, 100)}
                            sx={{
                              height: 5, borderRadius: 3, mt: 0.2,
                              bgcolor: alpha(AGS_COLOR, 0.1),
                              '& .MuiLinearProgress-bar': { bgcolor: AGS_COLOR },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{fmtMinutos(s.minutos)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            {fmtCOP(s.ingreso_por_hora)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {/* ── 3. Clientes ── */}
            {tab === 3 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell align="right">Citas</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                    <TableCell align="right">Ticket</TableCell>
                    <TableCell align="right">Sin venir</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {porCliente.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Sin clientes atendidos en este periodo.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {porCliente.map(c => (
                    <TableRow key={c.cliente_id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{c.cliente}</TableCell>
                      <TableCell><Typography variant="caption">{c.telefono ?? '—'}</Typography></TableCell>
                      <TableCell align="right">{c.citas}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCOP(c.ingresos)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{fmtCOP(c.ticket_promedio)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="caption"
                          color={(c.dias_sin_venir ?? 0) > 60 ? 'warning.main' : 'text.secondary'}
                        >
                          {c.dias_sin_venir === null || c.dias_sin_venir === undefined
                            ? '—' : `${c.dias_sin_venir} d`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {c.saldo_pendiente > 0 ? (
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            {fmtCOP(c.saldo_pendiente)}
                          </Typography>
                        ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* ── 4. Cierre de caja ── */}
            {tab === 4 && (
              <Box>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <TextField
                    type="date" size="small" label="Día a cuadrar" value={fechaCaja}
                    onChange={e => setFechaCaja(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ width: 175 }}
                  />
                  <Chip size="small" label="Hoy" onClick={() => setFechaCaja(hoyISO())} />
                  <Typography variant="caption" color="text.secondary">
                    Se cuadra sobre los pagos recibidos ese día, no sobre las citas agendadas
                  </Typography>
                </Stack>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    ['Total recaudado', fmtCOP(caja?.total_recaudado), '#16A34A', <AccountBalanceWallet key="1" />],
                    ['Efectivo en caja', fmtCOP(caja?.efectivo), '#CA8A04', <Payments key="2" />],
                    ['Medios digitales', fmtCOP(caja?.digital), '#0284C7', <PointOfSale key="3" />],
                    ['Por cobrar del día', fmtCOP(caja?.saldo_por_cobrar),
                      (caja?.saldo_por_cobrar ?? 0) > 0 ? '#DC2626' : '#64748B', <WarningAmber key="4" />],
                  ].map(([t, v, c, i]) => (
                    <Grid key={String(t)} size={{ xs: 6, md: 3 }}>
                      <Card sx={{ borderLeft: `4px solid ${c as string}` }}>
                        <CardContent sx={{ p: 1.8 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="caption" color="text.secondary">{t as string}</Typography>
                              <Typography variant="h6" fontWeight={800}>{v as string}</Typography>
                            </Box>
                            <Box sx={{ color: c as string, opacity: 0.7 }}>{i as React.ReactNode}</Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                      Desglose por medio de pago
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Medio</TableCell>
                          <TableCell align="right">Movimientos</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(caja?.por_medio ?? []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                              <Typography variant="body2" color="text.secondary">
                                No se registraron pagos ese día.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {(caja?.por_medio ?? []).map(m => (
                          <TableRow key={m.medio_pago} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{nombreMedio(m.medio_pago)}</TableCell>
                            <TableCell align="right">{m.movimientos}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCOP(m.total)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="caption">
                                {caja?.total_recaudado
                                  ? Math.round(m.total / caja.total_recaudado * 100) : 0}%
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                      Resumen del día
                    </Typography>
                    <Stack spacing={1}>
                      {[
                        ['Citas atendidas', String(caja?.citas_atendidas ?? 0)],
                        ['Movimientos de caja', String(caja?.movimientos ?? 0)],
                        ['Citas sin pagar del todo', String(caja?.citas_pendientes_pago ?? 0)],
                        ['Comisiones generadas', fmtCOP(caja?.comisiones_generadas)],
                      ].map(([k, v]) => (
                        <Stack key={k} direction="row" justifyContent="space-between"
                          sx={{ p: 1, borderRadius: 1, bgcolor: alpha(AGS_COLOR, 0.05) }}>
                          <Typography variant="body2">{k}</Typography>
                          <Typography variant="body2" fontWeight={700}>{v}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}
