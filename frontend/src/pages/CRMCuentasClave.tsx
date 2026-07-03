import React from 'react'
import { Box, Grid, Typography, Chip, alpha } from '@mui/material'
import { VpnKey } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'

const RIESGO_COLOR: Record<string, string> = { BAJO: '#059669', MEDIO: '#F59E0B', ALTO: CRM_COLOR, CRITICO: '#EF4444' }

const CUENTAS = [
  {
    cliente: 'Almacenes Éxito S.A.', ejecutivo: 'Laura Soto', objetivo: 6000, ingreso: 4800,
    health: 88, riesgo: 'BAJO', proxima_reunion: '2026-07-05',
    kpis: [
      { label: 'OTIF', valor: '93.4%', meta: '95%', ok: false },
      { label: 'NPS', valor: '+62', meta: '+50', ok: true },
      { label: 'Tickets Abiertos', valor: '2', meta: '≤5', ok: true },
      { label: 'SLA Cumplimiento', valor: '97%', meta: '95%', ok: true },
    ],
    planes: [
      'Mejorar OTIF de 93.4% a 95% mediante ajuste de rutas norte Q3',
      'Renovación contrato CON-2026-012 antes del 15/07',
      'Presentar propuesta expansión CD Cali — potencial $800M adicionales',
    ],
  },
  {
    cliente: 'Corona S.A.', ejecutivo: 'Pedro Díaz', objetivo: 7000, ingreso: 6400,
    health: 91, riesgo: 'BAJO', proxima_reunion: '2026-07-10',
    kpis: [
      { label: 'OTIF', valor: '96.2%', meta: '95%', ok: true },
      { label: 'NPS', valor: '+72', meta: '+60', ok: true },
      { label: 'Inventario Exactitud', valor: '99.5%', meta: '99%', ok: true },
      { label: 'SLA Cumplimiento', valor: '98%', meta: '95%', ok: true },
    ],
    planes: [
      'Mantener excelencia operacional en CD Bogotá Norte',
      'Explorar expansión a CD Barranquilla — reunión julio',
    ],
  },
  {
    cliente: 'Grupo Nutresa', ejecutivo: 'Ana Ruiz', objetivo: 3000, ingreso: 2150,
    health: 62, riesgo: 'MEDIO', proxima_reunion: '2026-06-25',
    kpis: [
      { label: 'OTIF', valor: '82.1%', meta: '90%', ok: false },
      { label: 'NPS', valor: '+28', meta: '+45', ok: false },
      { label: 'Reclamos Pendientes', valor: '3', meta: '≤2', ok: false },
      { label: 'SLA Cumplimiento', valor: '88%', meta: '95%', ok: false },
    ],
    planes: [
      'URGENTE: Plan de choque OTIF — reunión extraordinaria 2026-06-25',
      'Asignar ejecutivo de soporte dedicado mes julio',
      'Revisión tarifaria para evitar pérdida del contrato',
    ],
  },
]

function HealthRing({ score }: { score: number }) {
  const col = score >= 75 ? '#059669' : score >= 50 ? '#F59E0B' : CRM_COLOR
  return (
    <Box sx={{ position: 'relative', width: 60, height: 60 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r="24" fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle cx="30" cy="30" r="24" fill="none" stroke={col} strokeWidth="5"
          strokeDasharray={`${(score / 100) * 150.8} 150.8`} strokeLinecap="round" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: col }}>{score}</Typography>
      </Box>
    </Box>
  )
}

export default function CRMCuentasClave() {
  const totalIngreso  = CUENTAS.reduce((s, c) => s + c.ingreso, 0)
  const totalObjetivo = CUENTAS.reduce((s, c) => s + c.objetivo, 0)
  const cumplimiento  = Math.round((totalIngreso / totalObjetivo) * 100)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <VpnKey sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Key Accounts</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Cuentas Estratégicas · Planes Comerciales · Ejecutivos · Rentabilidad
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Cuentas Clave',   value: CUENTAS.length,                                 color: CRM_COLOR },
            { label: 'Ingreso Actual',  value: `$${(totalIngreso / 1000).toFixed(1)}B`,         color: '#059669' },
            { label: 'Objetivo Anual',  value: `$${(totalObjetivo / 1000).toFixed(1)}B`,        color: '#0EA5E9' },
            { label: 'Cumplimiento',    value: `${cumplimiento}%`,                              color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>{k.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {CUENTAS.map((c, i) => {
            const rcol = RIESGO_COLOR[c.riesgo]
            const pctObj = Math.min(Math.round((c.ingreso / c.objetivo) * 100), 100)
            return (
              <Box key={i} sx={{ border: `1px solid ${alpha(rcol, 0.25)}`, borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <HealthRing score={c.health} />
                    <Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary' }}>{c.cliente}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>Ejecutivo: {c.ejecutivo} · Próx. reunión: {c.proxima_reunion}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                        <Chip label={`Riesgo: ${c.riesgo}`} size="small" sx={{ bgcolor: alpha(rcol, 0.15), color: rcol, fontSize: 10, fontWeight: 700 }} />
                        <Chip label="KEY ACCOUNT" size="small" sx={{ bgcolor: alpha(CRM_COLOR, 0.1), color: CRM_COLOR, fontSize: 9.5 }} />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: CRM_COLOR }}>${(c.ingreso / 1000).toFixed(1)}B</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>de ${(c.objetivo / 1000).toFixed(1)}B objetivo — {pctObj}%</Typography>
                    <Box sx={{ mt: 0.75, height: 4, borderRadius: 2, bgcolor: 'text.disabled', overflow: 'hidden', width: 140 }}>
                      <Box sx={{ height: '100%', width: `${pctObj}%`, bgcolor: pctObj >= 80 ? '#059669' : CRM_COLOR, borderRadius: 2 }} />
                    </Box>
                  </Box>
                </Box>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {c.kpis.map((k, j) => (
                    <Grid key={j} size={{ xs: 6, sm: 3 }}>
                      <Box sx={{ bgcolor: alpha(k.ok ? '#059669' : CRM_COLOR, 0.07), border: `1px solid ${alpha(k.ok ? '#059669' : CRM_COLOR, 0.2)}`, borderRadius: 1.5, p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{k.label}</Typography>
                          <Typography sx={{ fontSize: 10, color: k.ok ? '#059669' : CRM_COLOR, fontWeight: 700 }}>{k.ok ? '✓' : '!'}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 900, color: k.ok ? '#059669' : CRM_COLOR }}>{k.valor}</Typography>
                        <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>Meta: {k.meta}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1 }}>PLAN COMERCIAL</Typography>
                  {c.planes.map((p, j) => (
                    <Box key={j} sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: CRM_COLOR, mt: 0.75, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5 }}>{p}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Layout>
  )
}
