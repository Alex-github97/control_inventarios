import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha } from '@mui/material'
import { Analytics, TrendingUp, TrendingDown } from '@mui/icons-material'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const TOOLTIP_STYLE = { contentStyle: { backgroundColor: '#FFFFFF', border: '1px solid rgba(197,48,48,0.2)', borderRadius: 8, color: 'text.primary', fontSize: 12 } }

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const DATA_ACCIDENTALIDAD = [
  { mes: 'Ene', AT: 1, incidentes: 3 }, { mes: 'Feb', AT: 0, incidentes: 2 },
  { mes: 'Mar', AT: 2, incidentes: 4 }, { mes: 'Abr', AT: 1, incidentes: 1 },
  { mes: 'May', AT: 0, incidentes: 2 }, { mes: 'Jun', AT: 1, incidentes: 2 },
]

const DATA_INSPECCIONES = [
  { mes: 'Ene', programadas: 8, completadas: 7 }, { mes: 'Feb', programadas: 8, completadas: 8 },
  { mes: 'Mar', programadas: 10, completadas: 9 }, { mes: 'Abr', programadas: 8, completadas: 6 },
  { mes: 'May', programadas: 9, completadas: 9 }, { mes: 'Jun', programadas: 8, completadas: 6 },
]

const DATA_IF_IS = [
  { mes: 'Ene', IF: 8.5, IS: 45.0 }, { mes: 'Feb', IF: 0, IS: 0 },
  { mes: 'Mar', IF: 16.9, IS: 135.0 }, { mes: 'Abr', IF: 8.4, IS: 30.0 },
  { mes: 'May', IF: 0, IS: 0 }, { mes: 'Jun', IF: 8.3, IS: 15.0 },
]

const DATA_EPP_PIE = [
  { name: 'Cabeza', value: 24 }, { name: 'Ojos', value: 31 },
  { name: 'Manos', value: 58 }, { name: 'Pies', value: 41 },
  { name: 'Cuerpo', value: 29 }, { name: 'Respiratorio', value: 18 },
]
const PIE_COLORS = ['#C53030','#ef4444','#f97316','#f59e0b','#22c55e','#3b82f6']

const DATA_CAPACITACION = [
  { mes: 'Ene', programadas: 2, completadas: 2, participantes: 45 },
  { mes: 'Feb', programadas: 1, completadas: 1, participantes: 28 },
  { mes: 'Mar', programadas: 3, completadas: 3, participantes: 92 },
  { mes: 'Abr', programadas: 2, completadas: 1, participantes: 30 },
  { mes: 'May', programadas: 2, completadas: 2, participantes: 47 },
  { mes: 'Jun', programadas: 3, completadas: 2, participantes: 85 },
]

interface KPICard { label: string; value: string | number; unit?: string; meta?: string; ok: boolean; trend: 'up' | 'down' | 'flat'; desc: string }

const KPIS: KPICard[] = [
  { label: 'Índice de Frecuencia (IF)',      value: '7.0',  unit: 'AT/millón h-h',  meta: 'Meta: < 10',   ok: true,  trend: 'down', desc: 'AT con incapacidad / horas-hombre trabajadas × 1.000.000' },
  { label: 'Índice de Severidad (IS)',        value: '45.0', unit: 'días/millón h-h', meta: 'Meta: < 100', ok: true,  trend: 'down', desc: 'Días cargados / horas-hombre trabajadas × 1.000.000' },
  { label: 'Índice de Lesión Incapacitante', value: '0.32', unit: '%',               meta: 'Meta: < 0.5', ok: true,  trend: 'down', desc: 'IF × IS / 1.000' },
  { label: 'Cobertura EPP (%)',               value: '94.2', unit: '%',               meta: 'Meta: 100%',  ok: false, trend: 'up',   desc: 'Trabajadores con todos sus EPP entregados y vigentes' },
  { label: 'Cumplimiento capacitaciones',     value: '83.3', unit: '%',               meta: 'Meta: 90%',   ok: false, trend: 'up',   desc: 'Capacitaciones completadas vs. programadas en el año' },
  { label: 'Días sin accidente',              value: 10,     unit: 'días',            meta: 'Meta: > 60',  ok: false, trend: 'flat', desc: 'Días sin accidentes de trabajo con incapacidad' },
]

export default function SSTIndicadores() {
  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Analytics sx={{ color: SST_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Indicadores SST</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Tablero de seguimiento — IF, IS, ILI y cumplimiento del SG-SST · 2026</Typography>
          </Box>
          <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
        </Box>

        {/* KPIs principales */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIS.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ border: `1px solid ${alpha(k.ok ? '#22c55e' : SST_COLOR, 0.25)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.7, flex: 1, lineHeight: 1.3 }}>{k.label}</Typography>
                    {k.trend !== 'flat' && (k.trend === 'down'
                      ? <TrendingDown sx={{ fontSize: 16, color: '#22c55e' }} />
                      : <TrendingUp sx={{ fontSize: 16, color: k.ok ? '#22c55e' : '#ef4444' }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.25 }}>
                    <Typography sx={{ fontSize: 28, fontWeight: 900, color: k.ok ? '#22c55e' : '#F87171', lineHeight: 1 }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{k.unit}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 10, color: k.ok ? '#22c55e' : '#fbbf24' }}>{k.meta}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5, lineHeight: 1.3 }}>{k.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2.5}>
          {/* Accidentalidad */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ 'border: "1px solid #E5E7EB"', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25, fontSize: 14 }}>Accidentalidad mensual 2026</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 2 }}>Accidentes de trabajo e incidentes registrados</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={DATA_ACCIDENTALIDAD} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'text.secondary' }} />
                    <Bar dataKey="AT" name="Accidentes trabajo" fill={SST_COLOR} radius={[3,3,0,0]} maxBarSize={28} />
                    <Bar dataKey="incidentes" name="Incidentes" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* EPP Pie */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ 'border: "1px solid #E5E7EB"', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25, fontSize: 14 }}>EPP entregados por tipo</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 1.5 }}>Distribución de entregas activas</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={DATA_EPP_PIE} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {DATA_EPP_PIE.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 10, color: 'text.secondary' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* IF / IS Línea */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ 'border: "1px solid #E5E7EB"', borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25, fontSize: 14 }}>Evolución IF e IS — 2026</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 2 }}>Índice de frecuencia y severidad mensual</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={DATA_IF_IS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'text.secondary' }} />
                    <Line type="monotone" dataKey="IF" name="Índice Frecuencia" stroke={SST_COLOR} strokeWidth={2.5} dot={{ r: 4, fill: SST_COLOR }} />
                    <Line type="monotone" dataKey="IS" name="Índice Severidad" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Capacitaciones */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ 'border: "1px solid #E5E7EB"', borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25, fontSize: 14 }}>Capacitaciones — programadas vs. ejecutadas</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 2 }}>Cumplimiento del plan anual de formación</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={DATA_CAPACITACION} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'text.secondary' }} />
                    <Bar dataKey="programadas" name="Programadas" fill="rgba(59,130,246,0.3)" radius={[3,3,0,0]} maxBarSize={28} />
                    <Bar dataKey="completadas" name="Completadas" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
