import React from 'react'
import { Box, Typography, Chip, LinearProgress, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TrendingUp, People, Receipt, SupportAgent,
  StarRate, Handshake, Warning, EmojiEvents,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'

const KPIS = [
  { label: 'Pipeline Total',       value: '$4.28B',  sub: '+12% vs mes ant.', color: CRM_COLOR,  icon: <TrendingUp /> },
  { label: 'Clientes Activos',     value: '312',     sub: '8 nuevos este mes', color: '#0EA5E9',  icon: <People /> },
  { label: 'Win Rate',             value: '64%',     sub: 'Meta: 70%',         color: '#059669',  icon: <EmojiEvents /> },
  { label: 'Contratos Activos',    value: '87',      sub: '3 por vencer',      color: '#7C3AED',  icon: <Handshake /> },
  { label: 'Tickets Abiertos',     value: '24',      sub: '4 escalados',       color: '#F59E0B',  icon: <SupportAgent /> },
  { label: 'NPS Promedio',         value: '+48',     sub: 'Promotores: 62%',   color: '#059669',  icon: <StarRate /> },
  { label: 'Oportunidades',        value: '53',      sub: 'Valor: $1.4B',      color: '#D97706',  icon: <Receipt /> },
  { label: 'Churn Risk',           value: '3',       sub: 'Clientes en riesgo', color: '#EF4444', icon: <Warning /> },
]

const PIPELINE_ETAPAS = [
  { etapa: 'Identificación', cant: 18, valor: 820, color: '#94A3B8' },
  { etapa: 'Calificación',   cant: 12, valor: 540, color: '#0EA5E9' },
  { etapa: 'Propuesta',      cant: 10, valor: 1200, color: '#7C3AED' },
  { etapa: 'Negociación',    cant: 8,  valor: 1140, color: CRM_COLOR },
  { etapa: 'Cierre Ganado',  cant: 5,  valor: 580, color: '#059669' },
]
const maxValor = Math.max(...PIPELINE_ETAPAS.map(e => e.valor))

const OPO_RECIENTES = [
  { nombre: 'Contrato Logístico Integral 2026', cliente: 'Almacenes Éxito S.A.', valor: 480, etapa: 'NEGOCIACION', prob: 80 },
  { nombre: 'Servicio WMS + TMS Bogotá Norte',  cliente: 'Sodimac Colombia',     valor: 320, etapa: 'PROPUESTA',   prob: 55 },
  { nombre: 'Outsourcing de Transporte Q3',      cliente: 'Grupo Nutresa',        valor: 215, etapa: 'CALIFICACION', prob: 35 },
  { nombre: 'Expansión Centro de Distribución', cliente: 'Corona S.A.',           valor: 640, etapa: 'NEGOCIACION', prob: 75 },
  { nombre: 'Operación Logística Medellin',      cliente: 'Bancolombia S.A.',     valor: 180, etapa: 'PROPUESTA',   prob: 60 },
]

const ETAPA_COLOR: Record<string, string> = {
  IDENTIFICACION: '#94A3B8', CALIFICACION: '#0EA5E9', PROPUESTA: '#7C3AED',
  NEGOCIACION: CRM_COLOR, CIERRE_GANADO: '#059669', CIERRE_PERDIDO: '#EF4444',
}

const ALERTAS = [
  { texto: 'Contrato CON-2026-012 (Éxito S.A.) vence en 18 días — renovación pendiente', nivel: 'ALTO' },
  { texto: 'Ticket TKT-2026-089 escalado sin respuesta hace 48 horas — SLA incumplido', nivel: 'CRITICO' },
  { texto: '3 clientes con health score < 40 — riesgo de churn detectado por IA', nivel: 'ALTO' },
  { texto: 'OTIF de Grupo Nutresa cayó al 82% — bajo el SLA del 90%', nivel: 'MEDIO' },
]
const NIVEL_COLOR: Record<string, string> = { CRITICO: '#EF4444', ALTO: CRM_COLOR, MEDIO: '#F59E0B' }

export default function CRMDashboard() {
  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(CRM_COLOR, 0.4)}`,
          }}>
            <TrendingUp sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Torre de Control Comercial</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              CRM · Pipeline · Clientes · Servicio · Contratos
            </Typography>
          </Box>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
          {KPIS.map((k, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, lg: 3 }}>
              <Box className="hover-lift" sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${k.color} 0%, ${alpha(k.color, 0.6)} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '& svg': { color: '#fff', fontSize: 20 },
                  boxShadow: `0 3px 10px ${alpha(k.color, 0.35)}`,
                }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography className="text-gradient" sx={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: 10, color: k.color, fontWeight: 600 }}>{k.sub}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          {/* Pipeline por etapa */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5, height: '100%' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2.5 }}>Pipeline por Etapa</Typography>
              {PIPELINE_ETAPAS.map((e, i) => {
                const pct = (e.valor / maxValor) * 100
                return (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color }} />
                        <Typography sx={{ fontSize: 12.5, color: 'text.primary', fontWeight: 500 }}>{e.etapa}</Typography>
                        <Chip label={e.cant} size="small" sx={{ bgcolor: alpha(e.color, 0.15), color: e.color, fontSize: 10, height: 18 }} />
                      </Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: e.color }}>${e.valor}M</Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: e.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Grid>

          {/* Oportunidades recientes */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5, height: '100%' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>Oportunidades Activas</Typography>
              {OPO_RECIENTES.map((o, i) => {
                const col = ETAPA_COLOR[o.etapa] || CRM_COLOR
                return (
                  <Box key={i} sx={{ mb: 1.5, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E5E7EB' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', flex: 1, pr: 1 }}>{o.nombre}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: CRM_COLOR, flexShrink: 0 }}>${o.valor}M</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{o.cliente}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Chip label={o.etapa.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, fontSize: 9.5, fontWeight: 600 }} />
                        <Typography sx={{ fontSize: 11, color: col, fontWeight: 700 }}>{o.prob}%</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: 'text.disabled', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${o.prob}%`, bgcolor: col, borderRadius: 2 }} />
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Grid>

          {/* Alertas */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>Alertas Comerciales</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {ALERTAS.map((a, i) => {
                  const col = NIVEL_COLOR[a.nivel]
                  return (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: alpha(col, 0.07), borderRadius: 1.5, border: `1px solid ${alpha(col, 0.2)}` }}>
                      <Chip label={a.nivel} size="small" sx={{ bgcolor: alpha(col, 0.2), color: col, fontSize: 10, fontWeight: 700, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.5 }}>{a.texto}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
