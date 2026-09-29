/**
 * SST · Tablero del sistema de gestión
 *
 * Consultaba el servidor, pero arrancaba con cifras inventadas —47 días sin
 * accidente, 11 riesgos críticos— que se quedaban si la consulta fallaba, y
 * sus tres gráficas y la lista de próximas inspecciones eran fijas.
 * Ahora todo sale del tablero, los indicadores y la matriz de riesgos.
 */
import { Box, Typography, Card, CardContent, Chip, alpha, LinearProgress } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { HealthAndSafety, ReportProblem, Checklist, GppBad, Timer, SafetyDivider } from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { sstApi } from '@/api/sst'
import { fmtFecha } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const NIVELES = [
  { k: 'I', name: 'I · No aceptable', color: '#991B1B' }, { k: 'II', name: 'II · No aceptable / control', color: '#DC2626' },
  { k: 'III', name: 'III · Mejorable', color: '#D97706' }, { k: 'IV', name: 'IV · Aceptable', color: '#15803D' },
]

export default function SSTDashboard() {
  const anio = new Date().getFullYear()
  const { data: t, isLoading } = useQuery({ queryKey: ['sst-tablero'], queryFn: sstApi.tablero })
  const { data: ind } = useQuery({ queryKey: ['sst-indicadores', anio], queryFn: () => sstApi.indicadores(anio) })
  const { data: riesgos = [] } = useQuery({ queryKey: ['sst-riesgos'], queryFn: () => sstApi.riesgos.listar() })

  const meses = (ind?.meses ?? []).slice(0, new Date().getMonth() + 1).map(m => ({ ...m, nombre: MESES[m.mes - 1] }))
  const pie = NIVELES.map(n => ({ ...n, value: riesgos.filter(r => r.interpretacion === n.k).length })).filter(n => n.value > 0)

  const kpis = [
    { icon: <Timer />, label: 'Días sin accidente', value: t?.dias_sin_accidente == null ? '—' : `${t.dias_sin_accidente} d`,
      color: t?.dias_sin_accidente == null ? '#6B7280' : t.dias_sin_accidente >= 30 ? '#15803D' : '#DC2626',
      sub: t?.ultimo_accidente ? `Último: ${fmtFecha(t.ultimo_accidente)}` : 'Sin accidentes registrados' },
    { icon: <ReportProblem />, label: `Eventos ${anio}`, value: t?.incidentes_anio ?? '—', color: '#D97706', sub: `${t?.accidentes_trabajo ?? 0} accidentes de trabajo` },
    { icon: <Checklist />, label: 'Inspecciones pendientes', value: t?.inspecciones_pendientes ?? '—', color: '#0369A1', sub: `${t?.incidentes_abiertos ?? 0} eventos sin cerrar` },
    { icon: <GppBad />, label: 'Riesgos no aceptables', value: t?.riesgos_criticos ?? '—', color: '#DC2626', sub: 'Niveles I y II de la GTC 45' },
    { icon: <SafetyDivider />, label: 'EPP vencidos', value: t?.epp_vencidos ?? '—', color: '#7C3AED', sub: 'Entregas activas sin reponer' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <HealthAndSafety sx={{ color: SST_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Sistema de Gestión SST</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>SG-SST — Seguridad y Salud en el Trabajo · Normatividad colombiana</Typography>
          </Box>
          <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: SST_COLOR, fontWeight: 700 }} />
        </Box>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.6 }}>{k.label}</Typography>
                    <Box sx={{ color: alpha(k.color, 0.5), '& svg': { fontSize: 22 } }}>{k.icon}</Box>
                  </Box>
                  <Typography sx={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 2 }}>Accidentalidad mensual {anio}</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={meses} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="accidentes" name="Accidentes de trabajo" fill={SST_COLOR} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="incidentes" name="Otros eventos" fill={alpha(SST_COLOR, 0.4)} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 2 }}>Matriz de riesgos (GTC 45)</Typography>
                {pie.length === 0 ? <Typography fontSize={12} color="text.secondary">Sin peligros valorados.</Typography> : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart><Pie data={pie} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={55} stroke="none">
                        {pie.map(e => <Cell key={e.k} fill={e.color} />)}
                      </Pie></PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
                      {pie.map(c => (
                        <Box key={c.k} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color }} />
                          <Typography sx={{ fontSize: 11, flex: 1 }}>{c.name}</Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{c.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>Próximas inspecciones</Typography>
            {!t?.proximas_inspecciones.length ? <Typography fontSize={12} color="text.secondary">No hay inspecciones programadas desde hoy.</Typography> : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {t.proximas_inspecciones.map(i => (
                  <Box key={i.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.25, bgcolor: '#F9FAFB', borderRadius: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: SST_COLOR, minWidth: 160 }}>{i.numero}</Typography>
                    <Typography sx={{ fontSize: 12, flex: 1, minWidth: 120 }}>{i.area ?? '—'}</Typography>
                    <Chip label={i.tipo === 'NO_PLANEADA' ? 'No planeada' : (i.tipo ?? '').replace('_', ' ').toLowerCase()} size="small" sx={{ fontSize: 10 }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', minWidth: 90 }}>{fmtFecha(i.fecha_programada)}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 100 }}>Resp.: {i.inspector ?? '—'}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}
