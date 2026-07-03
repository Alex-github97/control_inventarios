import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import { Campaign } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const #E5E7EB  = '#E5E7EB'

const TIPO_CFG: Record<string, { color: string; label: string }> = {
  EMAIL_MARKETING: { color: '#0EA5E9', label: 'Email Marketing' },
  EVENTO:          { color: '#7C3AED', label: 'Evento' },
  PROMOCION:       { color: CRM_COLOR, label: 'Promoción' },
  COMERCIAL:       { color: '#059669', label: 'Comercial' },
}

const CAMPANAS = [
  { id: 1, codigo: 'CAM-2026-008', nombre: 'Reactivación Clientes Inactivos Q2',   tipo: 'EMAIL_MARKETING', inicio: '2026-05-01', fin: '2026-05-31', presupuesto: 15, leads: 42,  conversiones: 8,  ingresos: 380, activa: false },
  { id: 2, codigo: 'CAM-2026-007', nombre: 'EXPO Logística 2026 — Stand Icoltrans', tipo: 'EVENTO',          inicio: '2026-04-15', fin: '2026-04-17', presupuesto: 80, leads: 128, conversiones: 22, ingresos: 1200, activa: false },
  { id: 3, codigo: 'CAM-2026-006', nombre: 'Black Friday Almacenamiento 2025',      tipo: 'PROMOCION',       inicio: '2025-11-20', fin: '2025-11-30', presupuesto: 10, leads: 35,  conversiones: 12, ingresos: 540, activa: false },
  { id: 4, codigo: 'CAM-2026-009', nombre: 'Lanzamiento TMS 2.0 para Corporativos', tipo: 'COMERCIAL',       inicio: '2026-06-01', fin: '2026-06-30', presupuesto: 25, leads: 18,  conversiones: 4,  ingresos: 240, activa: true  },
  { id: 5, codigo: 'CAM-2026-010', nombre: 'Newsletter Sector Retail Q3',           tipo: 'EMAIL_MARKETING', inicio: '2026-07-01', fin: '2026-07-31', presupuesto: 8,  leads: 0,   conversiones: 0,  ingresos: 0,   activa: true  },
  { id: 6, codigo: 'CAM-2026-011', nombre: 'Feria Agroexpo 2026',                   tipo: 'EVENTO',          inicio: '2026-07-10', fin: '2026-07-14', presupuesto: 60, leads: 0,   conversiones: 0,  ingresos: 0,   activa: true  },
]

const METRICAS_EMAIL = [
  { semana: 'S1', enviados: 850, abiertos: 612, clics: 184 },
  { semana: 'S2', enviados: 820, abiertos: 590, clics: 160 },
  { semana: 'S3', enviados: 930, abiertos: 698, clics: 210 },
  { semana: 'S4', enviados: 900, abiertos: 665, clics: 195 },
]

export default function CRMCampanas() {
  const [tab, setTab] = useState(0)

  const totalLeads       = CAMPANAS.reduce((s, c) => s + c.leads, 0)
  const totalConversiones = CAMPANAS.reduce((s, c) => s + c.conversiones, 0)
  const totalIngresos    = CAMPANAS.reduce((s, c) => s + c.ingresos, 0)
  const totalPresupuesto = CAMPANAS.reduce((s, c) => s + c.presupuesto, 0)
  const roi              = Math.round(((totalIngresos - totalPresupuesto) / totalPresupuesto) * 100)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Campaign sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Campañas Comerciales</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Email Marketing · Eventos · Promociones · ROI · Conversión
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Leads Generados',   value: totalLeads,                              color: CRM_COLOR },
            { label: 'Conversiones',      value: totalConversiones,                       color: '#059669' },
            { label: 'Ingresos Generados',value: `$${(totalIngresos / 1000).toFixed(1)}B`, color: '#0EA5E9' },
            { label: 'ROI Campañas',      value: `${roi}%`,                              color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ bgcolor: 'text.primary', border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Lista de Campañas" />
          <Tab label="Métricas Email" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {CAMPANAS.map((c, i) => {
              const cfg = TIPO_CFG[c.tipo]
              const tasa_conv = c.leads > 0 ? Math.round((c.conversiones / c.leads) * 100) : 0
              const roi_camp = c.presupuesto > 0 ? Math.round(((c.ingresos - c.presupuesto) / c.presupuesto) * 100) : 0
              return (
                <Box key={i} sx={{ bgcolor: 'text.primary', border: `1px solid ${alpha(cfg.color, 0.2)}`, borderRadius: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip label={cfg.label} size="small" sx={{ bgcolor: alpha(cfg.color, 0.15), color: cfg.color, fontSize: 10, fontWeight: 700 }} />
                        {c.activa && <Chip label="ACTIVA" size="small" sx={{ bgcolor: alpha('#059669', 0.15), color: '#059669', fontSize: 9.5, fontWeight: 700 }} />}
                        <Typography sx={{ fontSize: 11, color: CRM_COLOR, fontFamily: 'monospace' }}>{c.codigo}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{c.nombre}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>{c.inicio} → {c.fin}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Leads', value: c.leads, color: CRM_COLOR },
                        { label: 'Conv.', value: c.conversiones, color: '#059669' },
                        { label: 'Tasa', value: `${tasa_conv}%`, color: '#0EA5E9' },
                        { label: 'ROI', value: `${roi_camp}%`, color: '#7C3AED' },
                        { label: 'Ingresos', value: c.ingresos > 0 ? `$${c.ingresos}M` : '—', color: '#F59E0B' },
                      ].map((m, j) => (
                        <Box key={j} sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 16, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{m.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Presupuesto: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>${c.presupuesto}M</Box></Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2.5 }}>Métricas Email — Newsletter Retail Q3</Typography>
            {METRICAS_EMAIL.map((m, i) => {
              const tasaApertura = Math.round((m.abiertos / m.enviados) * 100)
              const tasaClics    = Math.round((m.clics / m.enviados) * 100)
              return (
                <Box key={i} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{m.semana}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Enviados: {m.enviados}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#0EA5E9', fontWeight: 700 }}>Apertura: {tasaApertura}%</Typography>
                      <Typography sx={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>Clics: {tasaClics}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mb: 0.5 }}>Tasa apertura</Typography>
                      <Box sx={{ height: 10, borderRadius: 5, bgcolor: '#E2E8F0', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${tasaApertura}%`, bgcolor: '#0EA5E9', borderRadius: 5 }} />
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mb: 0.5 }}>Tasa clics</Typography>
                      <Box sx={{ height: 10, borderRadius: 5, bgcolor: '#E2E8F0', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${tasaClics * 4}%`, bgcolor: '#059669', borderRadius: 5 }} />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Layout>
  )
}
