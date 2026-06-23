import React from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha } from '@mui/material'
import { FlightTakeoff, LocalShipping, Route, AccessTime, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = `rgba(12,77,140,0.25)`

const KPIS = [
  { icon: <LocalShipping />, label: 'Embarques activos',   value: '3',   color: '#3b82f6' },
  { icon: <Route />,          label: 'Rutas programadas',   value: '8',   color: SCM_COLOR },
  { icon: <AccessTime />,     label: 'On-Time delivery',    value: '87%', color: '#22c55e' },
  { icon: <CheckCircle />,    label: 'Entregados este mes', value: '24',  color: '#8b5cf6' },
]

const EMBARQUES = [
  { id: 'EMB-2026-0041', origen: 'Bogotá DC',        destino: 'Barranquilla', estado: 'EN_RUTA',     eta: '25 jun 2026', bultos: 18, peso: '2.4 ton' },
  { id: 'EMB-2026-0038', origen: 'Shanghai (China)', destino: 'Bogotá DC',    estado: 'EN_ADUANA',   eta: '02 jul 2026', bultos: 4,  peso: '640 kg'  },
  { id: 'EMB-2026-0035', origen: 'Miami (EE.UU)',    destino: 'Cali',         estado: 'EN_TRANSITO', eta: '29 jun 2026', bultos: 12, peso: '980 kg'  },
  { id: 'EMB-2026-0030', origen: 'Medellín',         destino: 'Bogotá DC',    estado: 'ENTREGADO',   eta: '20 jun 2026', bultos: 32, peso: '5.1 ton' },
]

const ESTADO_META: Record<string, { label: string; color: string }> = {
  EN_RUTA:    { label: 'En ruta',    color: '#3b82f6' },
  EN_ADUANA:  { label: 'En aduana',  color: '#f59e0b' },
  EN_TRANSITO:{ label: 'En tránsito',color: '#06b6d4' },
  ENTREGADO:  { label: 'Entregado',  color: '#22c55e' },
}

export default function SCMLogistica() {
  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <FlightTakeoff sx={{ color: SCM_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Logística & Transporte SCM</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Seguimiento de embarques y coordinación con TMS</Typography>
          </Box>
          <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIS.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                    </Box>
                    <Box sx={{ color: alpha(k.color, 0.45), '& svg': { fontSize: 26 } }}>{k.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Embarques */}
        <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 2 }}>Embarques en Seguimiento</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {EMBARQUES.map(e => {
                const meta = ESTADO_META[e.estado]
                return (
                  <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#5B9BD5', minWidth: 140 }}>{e.id}</Typography>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography sx={{ fontSize: 12, color: '#fff' }}>{e.origen} → {e.destino}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{e.bultos} bultos · {e.peso}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }} />
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>ETA: {e.eta}</Typography>
                    </Box>
                    <Chip label={meta.label} size="small" sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700, fontSize: 10 }} />
                  </Box>
                )
              })}
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(SCM_COLOR, 0.06), borderRadius: 2, border: `1px dashed ${alpha(SCM_COLOR, 0.25)}`, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: alpha('#5B9BD5', 0.8) }}>
            Integración en tiempo real con módulo TMS disponible próximamente
          </Typography>
        </Box>
      </Box>
    </Layout>
  )
}
