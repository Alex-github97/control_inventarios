import React from 'react'
import { Box, Typography, Card, CardContent, Chip, alpha, LinearProgress } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SignalCellularAlt, Timeline, Inventory2, TrendingUp, AccountBalance } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#F0F2F5'

const PLANES = [
  { nombre: 'Plan Maestro Q3 2026',          progreso: 68,  estado: 'EN CURSO',    items: 142, valor: '$ 1.24 B' },
  { nombre: 'Plan Contingencia Acero',        progreso: 100, estado: 'COMPLETADO',  items: 28,  valor: '$ 380 M'  },
  { nombre: 'Reposición Insumos Planta 2',    progreso: 35,  estado: 'EN REVISIÓN', items: 56,  valor: '$ 520 M'  },
  { nombre: 'Plan Importaciones 2026',        progreso: 12,  estado: 'BORRADOR',    items: 89,  valor: '$ 2.1 B'  },
]

const DEMANDA = [
  { categoria: 'Materias Primas',     actual: 320, forecast: 410, variacion: '+28%' },
  { categoria: 'Insumos Operativos',  actual: 180, forecast: 195, variacion: '+8%'  },
  { categoria: 'Repuestos Críticos',  actual: 95,  forecast: 88,  variacion: '-7%'  },
  { categoria: 'Equipos & Tecnología',actual: 42,  forecast: 67,  variacion: '+60%' },
]

const ESTADO_COLORS: Record<string, string> = {
  'EN CURSO': '#3b82f6', 'COMPLETADO': '#22c55e', 'EN REVISIÓN': '#f59e0b', 'BORRADOR': '#64748b',
}

const KPIS = [
  { icon: <Timeline />, label: 'Planes activos',    value: '3',      color: SCM_COLOR },
  { icon: <Inventory2 />,label: 'SKUs planificados', value: '315',    color: '#8b5cf6' },
  { icon: <TrendingUp />, label: 'Accuracy forecast',value: '82%',    color: '#22c55e' },
  { icon: <AccountBalance />, label: 'Presupuesto total', value: '$ 4.24 B', color: '#f59e0b' },
]

export default function SCMPlanificacion() {
  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <SignalCellularAlt sx={{ color: SCM_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Planificación de Compras</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Planes maestros, forecast de demanda y control presupuestal</Typography>
          </Box>
          <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: SCM_COLOR, fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIS.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                    </Box>
                    <Box sx={{ color: alpha(k.color, 0.45), '& svg': { fontSize: 26 } }}>{k.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2}}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14, mb: 2 }}>Planes de Compra Activos</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {PLANES.map(p => (
                    <Box key={p.nombre}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{p.nombre}</Typography>
                        <Chip label={p.estado} size="small" sx={{ bgcolor: alpha(ESTADO_COLORS[p.estado] ?? '#64748b', 0.15), color: ESTADO_COLORS[p.estado] ?? '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      </Box>
                      <LinearProgress variant="determinate" value={p.progreso} sx={{ mb: 0.5, height: 5, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: ESTADO_COLORS[p.estado] ?? SCM_COLOR } }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.items} ítems · {p.valor}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.progreso}%</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14, mb: 2 }}>Forecast de Demanda — próximo trimestre</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {DEMANDA.map(d => (
                    <Box key={d.categoria} sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{d.categoria}</Typography>
                        <Chip label={d.variacion} size="small" sx={{ bgcolor: d.variacion.startsWith('+') ? alpha('#22c55e', 0.12) : alpha('#ef4444', 0.12), color: d.variacion.startsWith('+') ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700 }} />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Actual: {d.actual} u. → Forecast: {d.forecast} u.</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
