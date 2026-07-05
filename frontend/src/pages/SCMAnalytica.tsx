import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { Analytics, TrendingUp, TrendingDown, AccountBalance, Speed } from '@mui/icons-material'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const BORDER = `rgba(12,77,140,0.25)`

const KPIS = [
  { icon: <AccountBalance />, label: 'Gasto total 2026', value: '$ 8.3 B', delta: '+12%', up: true,  color: '#3b82f6' },
  { icon: <Speed />,          label: 'Ahorro negociado', value: '$ 620 M', delta: '+18%', up: true,  color: '#22c55e' },
  { icon: <TrendingUp />,     label: 'OTD proveedores',  value: '84%',     delta: '+3pp', up: true,  color: '#8b5cf6' },
  { icon: <TrendingDown />,   label: 'Lead time prom.',  value: '18.4 d',  delta: '-2.1d',up: true,  color: '#f59e0b' },
]

const GASTO_MENSUAL = [
  { mes: 'Ene', gasto: 620, presupuesto: 700 },
  { mes: 'Feb', gasto: 580, presupuesto: 700 },
  { mes: 'Mar', gasto: 750, presupuesto: 700 },
  { mes: 'Abr', gasto: 690, presupuesto: 750 },
  { mes: 'May', gasto: 810, presupuesto: 750 },
  { mes: 'Jun', gasto: 720, presupuesto: 750 },
]

const GASTO_CAT = [
  { name: 'Insumos',    value: 38, color: '#3b82f6' },
  { name: 'Equipos',   value: 22, color: '#8b5cf6' },
  { name: 'Servicios', value: 18, color: '#22c55e' },
  { name: 'Repuestos', value: 14, color: '#f59e0b' },
  { name: 'Otros',     value: 8,  color: '#64748b' },
]

const OTD_DATA = [
  { mes: 'Ene', otd: 78 }, { mes: 'Feb', otd: 80 }, { mes: 'Mar', otd: 75 },
  { mes: 'Abr', otd: 83 }, { mes: 'May', otd: 86 }, { mes: 'Jun', otd: 84 },
]

const TT = {
  contentStyle: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827', fontSize: 11 },
  labelStyle: { color: '#6B7280' },
}

export default function SCMAnalytica() {
  const [periodo, setPeriodo] = useState('6m')

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Analytics sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Analítica SCM</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Gasto, OTD, lead times y análisis de proveedores</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <ToggleButtonGroup value={periodo} exclusive onChange={(_, v) => v && setPeriodo(v)} size="small"
            sx={{ '& .MuiToggleButton-root': { color: 'text.secondary', borderColor: '#E5E7EB', '&.Mui-selected': { bgcolor: alpha(SCM_COLOR, 0.25), color: '#5B9BD5' } } }}>
            <ToggleButton value="3m">3 M</ToggleButton>
            <ToggleButton value="6m">6 M</ToggleButton>
            <ToggleButton value="1a">1 A</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIS.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: '#fff', border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                      <Typography sx={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                      <Chip label={k.delta} size="small" sx={{ mt: 0.5, bgcolor: k.up ? alpha('#22c55e', 0.12) : alpha('#ef4444', 0.12), color: k.up ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ color: alpha(k.color, 0.35), '& svg': { fontSize: 24 } }}>{k.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Gasto vs Presupuesto */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, mb: 2 }}>Gasto vs Presupuesto (M COP)</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={GASTO_MENSUAL} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} />
                    <Bar dataKey="presupuesto" name="Presupuesto" fill={alpha(SCM_COLOR, 0.25)} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="gasto" name="Gasto real" fill={SCM_COLOR} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Distribución por categoría */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, mb: 2 }}>Distribución de Gasto por Categoría</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ResponsiveContainer width={130} height={130}>
                    <PieChart>
                      <Pie data={GASTO_CAT} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={60} stroke="none">
                        {GASTO_CAT.map(e => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, flex: 1 }}>
                    {GASTO_CAT.map(c => (
                      <Box key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12, color: 'text.primary', flex: 1 }}>{c.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>{c.value}%</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* OTD Trend */}
        <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, mb: 2 }}>Tendencia On-Time Delivery (%)</Typography>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={OTD_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...TT} />
                <Line type="monotone" dataKey="otd" name="OTD %" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}
