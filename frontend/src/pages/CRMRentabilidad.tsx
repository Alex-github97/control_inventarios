import React, { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { BarChart, AttachMoney } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'

const CLIENTES_RENTABILIDAD = [
  { cliente: 'Corona S.A.',          segmento: 'ESTRATEGICO', ingresos: 6400, costos: 3840, margen: 2560, margen_pct: 40, clv: 28000, churn_risk: 5 },
  { cliente: 'Almacenes Éxito S.A.', segmento: 'CORPORATIVO', ingresos: 4800, costos: 3360, margen: 1440, margen_pct: 30, clv: 18000, churn_risk: 8 },
  { cliente: 'Sodimac Colombia',     segmento: 'CORPORATIVO', ingresos: 3200, costos: 2240, margen: 960,  margen_pct: 30, clv: 12000, churn_risk: 12 },
  { cliente: 'Grupo Nutresa',        segmento: 'ESTRATEGICO', ingresos: 2150, costos: 1720, margen: 430,  margen_pct: 20, clv: 8000,  churn_risk: 35 },
  { cliente: 'Bancolombia',          segmento: 'CORPORATIVO', ingresos: 1800, costos: 1260, margen: 540,  margen_pct: 30, clv: 7200,  churn_risk: 18 },
  { cliente: 'Pharmavida S.A.',      segmento: 'MEDIANA',     ingresos: 1140, costos: 912,  margen: 228,  margen_pct: 20, clv: 4000,  churn_risk: 42 },
]

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
const INGRESOS_MES  = [3200, 3450, 3800, 4100, 4400, 4800]
const COSTOS_MES    = [2100, 2250, 2480, 2660, 2820, 3050]
const MARGEN_MES    = INGRESOS_MES.map((v, i) => v - COSTOS_MES[i])
const maxIngreso    = Math.max(...INGRESOS_MES)

export default function CRMRentabilidad() {
  const [tab, setTab] = useState(0)

  const totalIngresos = CLIENTES_RENTABILIDAD.reduce((s, c) => s + c.ingresos, 0)
  const totalCostos   = CLIENTES_RENTABILIDAD.reduce((s, c) => s + c.costos, 0)
  const totalMargen   = totalIngresos - totalCostos
  const margenPct     = Math.round((totalMargen / totalIngresos) * 100)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AttachMoney sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Rentabilidad del Cliente</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Ingresos · Costos · Margen · CLV · Integración ERP
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Ingresos Totales', value: `$${(totalIngresos / 1000).toFixed(1)}B`, color: CRM_COLOR },
            { label: 'Costos Totales',   value: `$${(totalCostos / 1000).toFixed(1)}B`,   color: '#EF4444' },
            { label: 'Margen Total',     value: `$${(totalMargen / 1000).toFixed(1)}B`,   color: '#059669' },
            { label: 'Margen %',         value: `${margenPct}%`,                          color: '#0EA5E9' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Por Cliente" />
          <Tab label="Tendencia Mensual" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Cliente', 'Segmento', 'Ingresos', 'Costos', 'Margen', 'Margen %', 'CLV Estimado', 'Churn Risk'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'text.disabled', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENTES_RENTABILIDAD.sort((a, b) => b.margen - a.margen).map((c, i) => {
                    const mcol   = c.margen_pct >= 35 ? '#059669' : c.margen_pct >= 25 ? '#F59E0B' : CRM_COLOR
                    const chcol  = c.churn_risk >= 30 ? '#EF4444' : c.churn_risk >= 15 ? '#F59E0B' : '#059669'
                    const segCol: Record<string, string> = { ESTRATEGICO: '#7C3AED', CORPORATIVO: CRM_COLOR, MEDIANA: '#0EA5E9' }
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.cliente}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={c.segmento} size="small" sx={{ bgcolor: alpha(segCol[c.segmento] || '#94A3B8', 0.12), color: segCol[c.segmento] || '#94A3B8', fontSize: 9.5 }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR }}>${(c.ingresos / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'text.secondary' }}>${(c.costos / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#059669' }}>${(c.margen / 1000).toFixed(1)}B</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 40, height: 5, borderRadius: 3, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${c.margen_pct * 2}%`, bgcolor: mcol, borderRadius: 3 }} />
                            </Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: mcol }}>{c.margen_pct}%</Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>${(c.clv / 1000).toFixed(0)}B</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 36, height: 5, borderRadius: 3, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${c.churn_risk}%`, bgcolor: chcol, borderRadius: 3 }} />
                            </Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: chcol }}>{c.churn_risk}%</Typography>
                          </Box>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2.5 }}>Ingresos · Costos · Margen — Semestre 1 2026</Typography>
            {MESES.map((mes, i) => (
              <Box key={i} sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1 }}>{mes}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {[
                    { label: 'Ingresos', val: INGRESOS_MES[i], color: CRM_COLOR, max: maxIngreso },
                    { label: 'Costos',   val: COSTOS_MES[i],   color: '#EF4444', max: maxIngreso },
                    { label: 'Margen',   val: MARGEN_MES[i],   color: '#059669', max: maxIngreso },
                  ].map((b, j) => (
                    <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontSize: 10.5, color: b.color, fontWeight: 600, width: 60 }}>{b.label}</Typography>
                      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${(b.val / b.max) * 100}%`, bgcolor: b.color, borderRadius: 4 }} />
                      </Box>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: b.color, width: 55, textAlign: 'right' }}>${(b.val / 1000).toFixed(1)}B</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Layout>
  )
}
