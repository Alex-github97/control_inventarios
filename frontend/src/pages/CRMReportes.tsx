import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { Assessment } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(220,38,38,0.25)'
const DARK_BG   = '#060C1A'

const EJECUTIVOS_KPI = [
  { nombre: 'Laura Soto',   clientes: 98, pipeline: 1850, ganado: 1240, win_rate: 67, nps: 62, tickets: 8 },
  { nombre: 'Carlos Vega',  clientes: 76, pipeline: 1420, ganado: 890,  win_rate: 63, nps: 58, tickets: 6 },
  { nombre: 'Ana Ruiz',     clientes: 84, pipeline: 1130, ganado: 720,  win_rate: 64, nps: 55, tickets: 5 },
  { nombre: 'Pedro Díaz',   clientes: 54, pipeline: 980,  ganado: 640,  win_rate: 65, nps: 67, tickets: 5 },
]

const SEGMENTOS = [
  { seg: 'CORPORATIVO', clientes: 128, ingresos: 14400, margen_pct: 30, churn_avg: 12, nps: 54 },
  { seg: 'ESTRATEGICO', clientes: 42,  ingresos: 8550,  margen_pct: 35, churn_avg: 8,  nps: 68 },
  { seg: 'MEDIANA',     clientes: 98,  ingresos: 4200,  margen_pct: 22, churn_avg: 22, nps: 42 },
  { seg: 'PEQUENA',     clientes: 44,  ingresos: 1050,  margen_pct: 18, churn_avg: 38, nps: 34 },
]

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
const PIPELINE_M  = [3800, 4100, 3650, 4400, 4800, 5200]
const GANADO_M    = [2200, 2600, 2100, 2900, 3100, 3400]
const WINRATE_M   = [58, 63, 58, 66, 65, 65]
const maxPipeline = Math.max(...PIPELINE_M)

function getCellColor(val: number) {
  if (val >= 70) return '#059669'
  if (val >= 60) return CRM_COLOR
  if (val >= 50) return '#F59E0B'
  return '#EF4444'
}

export default function CRMReportes() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Assessment sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Analytics Comercial</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              KPIs por Ejecutivo · Segmentos · Pipeline · Win Rate
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Por Ejecutivo" />
          <Tab label="Por Segmento" />
          <Tab label="Tendencia Pipeline" />
          <Tab label="KPIs Globales" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Ejecutivo', 'Clientes', 'Pipeline', 'Ganado', 'Win Rate', 'NPS Promedio', 'Tickets'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EJECUTIVOS_KPI.map((e, i) => {
                    const wrcol  = getCellColor(e.win_rate)
                    const npscol = e.nps >= 50 ? '#059669' : e.nps >= 30 ? '#F59E0B' : CRM_COLOR
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#FFF', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.nombre}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{e.clientes}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR }}>${(e.pipeline / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#059669' }}>${(e.ganado / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 50, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${e.win_rate}%`, bgcolor: wrcol, borderRadius: 3 }} />
                            </Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: wrcol }}>{e.win_rate}%</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: npscol }}>+{e.nps}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{e.tickets}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Segmento', 'Clientes', 'Ingresos', 'Margen %', 'Churn Avg', 'NPS'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SEGMENTOS.map((s, i) => {
                    const mcol = s.margen_pct >= 30 ? '#059669' : s.margen_pct >= 22 ? '#F59E0B' : CRM_COLOR
                    const chcol = s.churn_avg >= 30 ? '#EF4444' : s.churn_avg >= 20 ? CRM_COLOR : '#059669'
                    const npscol = s.nps >= 50 ? '#059669' : s.nps >= 40 ? '#F59E0B' : CRM_COLOR
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={s.seg} size="small" sx={{ bgcolor: alpha(CRM_COLOR, 0.12), color: CRM_COLOR, fontSize: 11, fontWeight: 700 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{s.clientes}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR }}>${(s.ingresos / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: mcol }}>{s.margen_pct}%</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: chcol }}>{s.churn_avg}%</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: npscol }}>+{s.nps}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF', mb: 2.5 }}>Pipeline · Ganado · Win Rate — S1 2026</Typography>
            {MESES.map((mes, i) => (
              <Box key={i} sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>{mes}</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ fontSize: 11, color: CRM_COLOR, fontWeight: 700 }}>Pipeline: ${(PIPELINE_M[i] / 1000).toFixed(1)}B</Typography>
                    <Typography sx={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>Ganado: ${(GANADO_M[i] / 1000).toFixed(1)}B</Typography>
                    <Typography sx={{ fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>Win: {WINRATE_M[i]}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {[
                    { label: 'Pipeline', val: PIPELINE_M[i], color: CRM_COLOR },
                    { label: 'Ganado',   val: GANADO_M[i],   color: '#059669' },
                  ].map((b, j) => (
                    <Box key={j} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 10.5, color: b.color, width: 55 }}>{b.label}</Typography>
                      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${(b.val / maxPipeline) * 100}%`, bgcolor: b.color, borderRadius: 4 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {tab === 3 && (
          <Grid container spacing={2}>
            {[
              { label: 'CLV Promedio',         value: '$11.8B', sub: 'Lifetime value por cliente', color: CRM_COLOR },
              { label: 'Churn Rate Global',     value: '18.5%',  sub: 'Meta: ≤15%',               color: '#EF4444' },
              { label: 'Conversion Rate',       value: '32.4%',  sub: 'Leads → Clientes',          color: '#059669' },
              { label: 'Ciclo de Venta',        value: '48 días', sub: 'Promedio cierre',           color: '#0EA5E9' },
              { label: 'OTIF Portafolio',       value: '91.2%',  sub: 'SLA objetivo: 95%',         color: '#F59E0B' },
              { label: 'NPS Global',            value: '+48',    sub: 'Promotores: 62%',            color: '#059669' },
              { label: 'Contratos en Riesgo',   value: '3',      sub: 'Vencen en <90 días',        color: CRM_COLOR },
              { label: 'Tickets Escalados',     value: '4',      sub: 'SLA incumplido: 2',         color: '#F59E0B' },
            ].map((k, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#FFF', lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>{k.sub}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
