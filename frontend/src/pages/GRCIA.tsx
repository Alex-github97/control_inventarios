// GRC Module — GRC Inteligencia Artificial
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  LinearProgress,
} from '@mui/material'
import { Psychology, TrendingUp, TrendingDown, Warning, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const AI_COLOR  = '#7C3AED'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const INSIGHTS = [
  {
    tipo: 'RIESGO',
    titulo: 'Incremento de riesgos cibernéticos en Q3',
    descripcion: 'El modelo detecta un patrón de aumento del 34% en intentos de acceso no autorizado durante los últimos 45 días. La correlación con el crecimiento del equipo remoto indica exposición amplificada.',
    confianza: 94,
    accion: 'Reforzar MFA y revisar políticas de acceso remoto antes del 15 de julio.',
    color: '#DC2626',
    icon: <Warning />,
  },
  {
    tipo: 'CUMPLIMIENTO',
    titulo: 'Anomalía en cumplimiento SARLAFT',
    descripcion: 'Tres transacciones no cumplen los umbrales de monitoreo establecidos en la matriz. El sistema identifica coincidencias con patrones de alerta temprana Superfinanciera.',
    confianza: 88,
    accion: 'Generar ROS y notificar al oficial de cumplimiento en las próximas 24 horas.',
    color: '#EA580C',
    icon: <Warning />,
  },
  {
    tipo: 'POSITIVO',
    titulo: 'Controles de seguridad física mejoraron 12%',
    descripcion: 'Tras la implementación del control biométrico en bodega central, la efectividad de los controles de seguridad física subió de 76% a 88% en los últimos 60 días.',
    confianza: 97,
    accion: 'Documentar caso de éxito y evaluar extensión a las otras 3 bodegas.',
    color: '#059669',
    icon: <CheckCircle />,
  },
  {
    tipo: 'TENDENCIA',
    titulo: 'Política de datos por vencer en 180 días',
    descripcion: 'La Política de Protección de Datos Personales vence el 1 de enero de 2027. Con base en la complejidad histórica de revisiones similares, se estima que el proceso tardará 120 días.',
    confianza: 91,
    accion: 'Iniciar proceso de revisión antes del 1 de agosto para garantizar continuidad.',
    color: '#D97706',
    icon: <TrendingUp />,
  },
]

const TENDENCIAS_RIESGOS = [
  { mes: 'Ene', criticos: 5, altos: 12, medios: 18 },
  { mes: 'Feb', criticos: 6, altos: 11, medios: 17 },
  { mes: 'Mar', criticos: 4, altos: 13, medios: 19 },
  { mes: 'Abr', criticos: 7, altos: 14, medios: 16 },
  { mes: 'May', criticos: 8, altos: 15, medios: 20 },
  { mes: 'Jun', criticos: 8, altos: 15, medios: 18 },
]

const PREDICCIONES = [
  { proceso: 'Gestión de Datos Personales', prob_incidente: 72, prob_incumplimiento: 65, recomendacion: 'Actualizar política de privacidad y completar capacitaciones pendientes' },
  { proceso: 'Seguridad Cadena de Suministro', prob_incidente: 45, prob_incumplimiento: 30, recomendacion: 'Reforzar auditorías a proveedores de nivel 2 en las próximas 4 semanas' },
  { proceso: 'Cumplimiento Tributario', prob_incidente: 38, prob_incumplimiento: 55, recomendacion: 'Completar integración con portal DIAN antes de fin de mes' },
  { proceso: 'Continuidad Sistemas Críticos', prob_incidente: 28, prob_incumplimiento: 20, recomendacion: 'Programar prueba BCP con el equipo de TI en julio' },
]

const RECOMENDACIONES = [
  'Priorizar cierre de HAL-2026-004 (KYC vencido) — riesgo de sanción SARLAFT estimado en COP 850M',
  'Acelerar certificación ISO 27001 — la ventana óptima es el Q3 según historial de auditores externos',
  'Implementar evaluación continua de terceros críticos (DHL, Seguros Bolívar) con alertas automáticas',
  'Revisar y actualizar el BCP del proceso de facturación tras el incidente INC-2026-006',
]

export default function GRCIA() {
  const [tab, setTab] = useState(0)
  const maxCrit = Math.max(...TENDENCIAS_RIESGOS.map(t => t.criticos))
  const maxAlto = Math.max(...TENDENCIAS_RIESGOS.map(t => t.altos))

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Psychology sx={{ color: AI_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>GRC Inteligencia Artificial</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Predicciones · Anomalías · Recomendaciones IA</Typography>
          </Box>
          <Chip label="IA" size="small" sx={{ bgcolor: alpha(AI_COLOR, 0.18), color: AI_COLOR, fontWeight: 700, border: `1px solid ${alpha(AI_COLOR, 0.4)}` }} />
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: AI_COLOR }, '& .MuiTabs-indicator': { bgcolor: AI_COLOR } }}>
          <Tab label="Insights IA" />
          <Tab label="Predicciones de Riesgo" />
          <Tab label="Tendencias" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {INSIGHTS.map(ins => (
              <Grid key={ins.titulo} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(ins.color, 0.3)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ color: alpha(ins.color, 0.7), '& svg': { fontSize: 18 } }}>{ins.icon}</Box>
                        <Chip label={ins.tipo} size="small" sx={{ fontSize: 9.5, height: 20, bgcolor: alpha(ins.color, 0.15), color: ins.color }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Psychology sx={{ fontSize: 14, color: AI_COLOR }} />
                        <Typography sx={{ fontSize: 11, color: AI_COLOR, fontWeight: 700 }}>{ins.confianza}% confianza</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 1, lineHeight: 1.3 }}>{ins.titulo}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, mb: 1.5 }}>{ins.descripcion}</Typography>
                    <LinearProgress variant="determinate" value={ins.confianza} sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: ins.color } }} />
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: alpha(ins.color, 0.08), border: `1px solid ${alpha(ins.color, 0.2)}` }}>
                      <Typography sx={{ fontSize: 11.5, color: alpha(ins.color, 0.9), fontWeight: 500 }}>→ {ins.accion}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(AI_COLOR, 0.3)}`, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Psychology sx={{ color: AI_COLOR, fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14 }}>Recomendaciones Estratégicas IA</Typography>
              </Box>
              {RECOMENDACIONES.map((r, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.25 }}>
                  <Box sx={{ minWidth: 22, height: 22, borderRadius: '50%', bgcolor: alpha(AI_COLOR, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 11, color: AI_COLOR, fontWeight: 700 }}>{i + 1}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{r}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {PREDICCIONES.map(p => (
              <Grid key={p.proceso} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 1.5 }}>{p.proceso}</Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Prob. Incidente (90 días)</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: p.prob_incidente >= 60 ? '#DC2626' : p.prob_incidente >= 40 ? '#D97706' : '#059669' }}>{p.prob_incidente}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={p.prob_incidente} sx={{ height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: p.prob_incidente >= 60 ? '#DC2626' : p.prob_incidente >= 40 ? '#D97706' : '#059669' } }} />
                    </Box>
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Prob. Incumplimiento</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: p.prob_incumplimiento >= 60 ? '#EA580C' : p.prob_incumplimiento >= 40 ? '#D97706' : GRC_COLOR }}>{p.prob_incumplimiento}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={p.prob_incumplimiento} sx={{ height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: p.prob_incumplimiento >= 60 ? '#EA580C' : GRC_COLOR } }} />
                    </Box>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>→ {p.recomendacion}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: '#FFF', mb: 2, fontSize: 14 }}>Evolución de Riesgos 2026 (Ene–Jun)</Typography>
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                {[{l:'Críticos',c:'#DC2626'},{l:'Altos',c:'#EA580C'},{l:'Medios',c:'#D97706'}].map(item => (
                  <Box key={item.l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 4, borderRadius: 2, bgcolor: item.c }} />
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{item.l}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 120 }}>
                {TENDENCIAS_RIESGOS.map(t => (
                  <Box key={t.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                    {[{v: t.medios, max: 20, c: '#D97706'}, {v: t.altos, max: maxAlto, c: '#EA580C'}, {v: t.criticos, max: maxCrit, c: '#DC2626'}].map((bar, bi) => (
                      <Box key={bi} sx={{ width: '75%', height: `${(bar.v / bar.max) * 35}px`, bgcolor: alpha(bar.c, 0.6), borderRadius: '2px 2px 0 0', border: `1px solid ${alpha(bar.c, 0.8)}` }} />
                    ))}
                    <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>{t.mes}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha(AI_COLOR, 0.08), border: `1px solid ${alpha(AI_COLOR, 0.2)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <TrendingUp sx={{ fontSize: 16, color: AI_COLOR }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: AI_COLOR }}>Análisis IA — Tendencia Detectada</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Se detecta una tendencia ascendente en riesgos críticos durante el primer semestre (+60% vs enero). El modelo predice que sin medidas correctivas los riesgos críticos alcanzarán 12 en agosto. El principal driver es el incremento de la exposición cibernética correlacionado con el crecimiento del trabajo remoto.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </Layout>
  )
}
