import React, { useEffect, useState } from 'react'
import { Box, Typography, Card, CardContent, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { HealthAndSafety, ReportProblem, Checklist, GppBad, Timer } from '@mui/icons-material'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'

const SST_COLOR = '#C53030'
const BORDER  = 'rgba(197,48,48,0.2)'

const TT = {
  contentStyle: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827', fontSize: 11 },
  labelStyle: { color: '#6B7280' },
}

const ACCIDENTALIDAD = [
  { mes: 'Ene', at: 1, incidentes: 3 },
  { mes: 'Feb', at: 0, incidentes: 2 },
  { mes: 'Mar', at: 1, incidentes: 4 },
  { mes: 'Abr', at: 0, incidentes: 1 },
  { mes: 'May', at: 0, incidentes: 2 },
  { mes: 'Jun', at: 0, incidentes: 1 },
]

const RIESGOS_PIE = [
  { name: 'Inaceptable', value: 3,  color: '#ef4444' },
  { name: 'Alto',        value: 8,  color: '#f97316' },
  { name: 'Medio',       value: 14, color: '#f59e0b' },
  { name: 'Bajo',        value: 21, color: '#22c55e' },
  { name: 'Aceptable',   value: 12, color: '#3b82f6' },
]

const PROXIMAS_INSP = [
  { numero: 'SST-INSP-2026-00021', area: 'Planta de Producción',  tipo: 'PLANEADA',     fecha: '25 jun 2026', inspector: 'A. Torres' },
  { numero: 'SST-INSP-2026-00022', area: 'Bodega de Materiales',  tipo: 'PLANEADA',     fecha: '28 jun 2026', inspector: 'C. López' },
  { numero: 'SST-INSP-2026-00023', area: 'Oficinas Administrativas', tipo: 'NO_PLANEADA', fecha: '02 jul 2026', inspector: 'M. Rojas' },
]

interface Dashboard {
  dias_sin_accidente: number
  incidentes_anio: number
  accidentes_trabajo: number
  inspecciones_pendientes: number
  riesgos_criticos: number
}

export default function SSTDashboard() {
  const [data, setData] = useState<Dashboard>({
    dias_sin_accidente: 47, incidentes_anio: 6, accidentes_trabajo: 2,
    inspecciones_pendientes: 3, riesgos_criticos: 11,
  })

  useEffect(() => {
    apiClient.get('/sst/dashboard').then(r => setData(r.data)).catch(() => {})
  }, [])

  const kpis = [
    { icon: <Timer />,         label: 'Días sin accidente', value: data.dias_sin_accidente, color: data.dias_sin_accidente >= 30 ? '#22c55e' : '#ef4444', suffix: 'd' },
    { icon: <ReportProblem />, label: 'Incidentes año',     value: data.incidentes_anio,    color: '#f59e0b', suffix: '' },
    { icon: <Checklist />,     label: 'Inspecciones pend.', value: data.inspecciones_pendientes, color: '#3b82f6', suffix: '' },
    { icon: <GppBad />,        label: 'Riesgos críticos',   value: data.riesgos_criticos,   color: '#ef4444', suffix: '' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <HealthAndSafety sx={{ color: SST_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Sistema de Gestión SST</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>SG-SST — Seguridad y Salud en el Trabajo · Normatividad colombiana</Typography>
          </Box>
          <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                      <Typography className="text-gradient" sx={{ fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}{k.suffix}</Typography>
                    </Box>
                    <Box sx={{ color: alpha(k.color, 0.4), '& svg': { fontSize: 28 } }}>{k.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Accidentalidad mensual */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, mb: 2 }}>Accidentalidad Mensual 2026</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ACCIDENTALIDAD} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} />
                    <Bar dataKey="at"        name="Accidentes AT"   fill={SST_COLOR}                 radius={[3, 3, 0, 0]} />
                    <Bar dataKey="incidentes" name="Incidentes"     fill={alpha(SST_COLOR, 0.4)}     radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Riesgos por nivel */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, mb: 2 }}>Distribución de Riesgos IPER</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={RIESGOS_PIE} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={55} stroke="none">
                        {RIESGOS_PIE.map(e => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
                    {RIESGOS_PIE.map(c => (
                      <Box key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 11, color: 'text.primary', flex: 1 }}>{c.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{c.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Próximas inspecciones */}
        <Card sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, mb: 1.5 }}>Próximas Inspecciones</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {PROXIMAS_INSP.map(i => (
                <Box key={i.numero} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.25, bgcolor: '#F9FAFB', borderRadius: 1.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#F87171', minWidth: 160 }}>{i.numero}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary', flex: 1, minWidth: 120 }}>{i.area}</Typography>
                  <Chip label={i.tipo === 'PLANEADA' ? 'Planeada' : 'No Planeada'} size="small" sx={{ bgcolor: i.tipo === 'PLANEADA' ? alpha('#3b82f6', 0.15) : alpha('#f59e0b', 0.15), color: i.tipo === 'PLANEADA' ? '#60a5fa' : '#fbbf24', fontSize: 10 }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', minWidth: 90 }}>{i.fecha}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 100 }}>Resp.: {i.inspector}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

      </Box>
    </Layout>
  )
}
