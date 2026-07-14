import React, { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, LinearProgress, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AutoAwesome, TrendingUp, Psychology, SmartToy } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const AI_COLOR  = '#8B5CF6'
const AI_BOR    = 'rgba(139,92,246,0.25)'

const RECOMENDACIONES = [
  { curso: 'Seguridad Vial Avanzada', razon: 'Tienes brecha de nivel 1 en competencia "Seguridad Vial"', score: 97, obligatorio: true },
  { curso: 'ISO 9001 Auditor Interno', razon: 'Tu cargo requiere nivel Avanzado en Calidad ISO — actualmente estás en Intermedio', score: 94, obligatorio: false },
  { curso: 'Comunicación Efectiva', razon: 'Colaboradores con tu perfil que tomaron este curso mejoraron 18% en evaluación de desempeño', score: 88, obligatorio: false },
  { curso: 'Excel Avanzado para Operaciones', razon: 'Detectamos tareas repetitivas que podrían automatizarse — este curso desarrolla esa habilidad', score: 83, obligatorio: false },
  { curso: 'Primeros Auxilios y RCP', razon: 'Tu certificación vence en 8 días — renovación urgente', score: 99, obligatorio: true },
  { curso: 'Gestión del Tiempo', razon: 'Tendencia de baja finalización de cursos en tu historial — este curso puede ayudar', score: 79, obligatorio: false },
]

const PREDICCIONES = [
  { indicador: 'Riesgo de Incumplimiento Normativo', valor: 23, tendencia: 'up', color: '#EF4444', desc: 'Certificaciones críticas por vencer en los próximos 30 días' },
  { indicador: 'Tasa de Finalización Proyectada', valor: 81, tendencia: 'up', color: '#059669', desc: 'Proyección para fin de mes basada en tendencia actual' },
  { indicador: 'Brechas Críticas Esperadas', valor: 12, tendencia: 'down', color: '#F59E0B', desc: 'Reducción estimada de brechas si se completan las rutas activas' },
  { indicador: 'Completados Proyectados (Mes)', valor: 94, tendencia: 'up', color: LMS_COLOR, desc: 'Estimación de cursos completados para fin de junio 2026' },
]

const TENDENCIAS_6M = [
  { mes: 'Ene', horas: 312, completados: 48 },
  { mes: 'Feb', horas: 287, completados: 41 },
  { mes: 'Mar', horas: 356, completados: 57 },
  { mes: 'Abr', horas: 398, completados: 62 },
  { mes: 'May', horas: 421, completados: 71 },
  { mes: 'Jun', horas: 389, completados: 68 },
]
const maxHoras = Math.max(...TENDENCIAS_6M.map(t => t.horas))

const ALERTAS_IA = [
  { texto: '5 colaboradores del área de Transporte tienen certificaciones críticas vencidas — acción requerida', nivel: 'CRITICO' },
  { texto: 'La tasa de abandono en el curso "ISO 9001" aumentó 12% respecto al mes anterior — revisar contenido', nivel: 'ALTO' },
  { texto: 'Conductores con menos de 20 horas de capacitación acumulan 3x más incidentes — correlación detectada', nivel: 'ALTO' },
  { texto: 'El área Comercial tiene el cumplimiento de formación más bajo (74%) — plan de choque recomendado', nivel: 'MEDIO' },
]

const NIVEL_COLOR: Record<string, string> = { CRITICO: '#EF4444', ALTO: '#F59E0B', MEDIO: LMS_COLOR }

export default function LMSIA() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${AI_COLOR} 0%, #6D28D9 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(AI_COLOR, 0.4)}`,
          }}>
            <AutoAwesome sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>IA del LMS</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Recomendaciones · Predicciones · Tendencias · Asistente Virtual
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${AI_COLOR} !important` },
            '& .MuiTabs-indicator': { bgcolor: AI_COLOR },
          }}>
          <Tab label="Recomendaciones" />
          <Tab label="Predicciones" />
          <Tab label="Tendencias" />
          <Tab label="Asistente" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {RECOMENDACIONES.map((r, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Box sx={{ border: `1px solid ${AI_BOR}`, borderRadius: 2, p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{r.curso}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}>{r.razon}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', ml: 2, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 22, fontWeight: 800, color: AI_COLOR, lineHeight: 1 }}>{r.score}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Score IA</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="Recomendado por IA" size="small" sx={{ bgcolor: alpha(AI_COLOR, 0.15), color: AI_COLOR, border: `1px solid ${alpha(AI_COLOR, 0.3)}`, fontSize: 10 }} />
                    {r.obligatorio && <Chip label="Urgente" size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', border: `1px solid ${alpha('#EF4444', 0.3)}`, fontSize: 10, fontWeight: 700 }} />}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            {PREDICCIONES.map((p, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Box sx={{ border: `1px solid ${alpha(p.color, 0.25)}`, borderRadius: 2, p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>{p.indicador}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontSize: 38, fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.valor}</Typography>
                    {p.tendencia === 'up'
                      ? <TrendingUp sx={{ color: p.color, fontSize: 20 }} />
                      : <TrendingUp sx={{ color: p.color, fontSize: 20, transform: 'scaleY(-1)' }} />
                    }
                  </Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>{p.desc}</Typography>
                </Box>
              </Grid>
            ))}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ bgcolor: alpha(AI_COLOR, 0.05), border: `1px solid ${AI_BOR}`, borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AutoAwesome sx={{ color: AI_COLOR, fontSize: 18 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Alertas Inteligentes</Typography>
                </Box>
                {ALERTAS_IA.map((a, i) => {
                  const col = NIVEL_COLOR[a.nivel]
                  return (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, p: 1.5, bgcolor: alpha(col, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(col, 0.15)}` }}>
                      <Chip label={a.nivel} size="small" sx={{ bgcolor: alpha(col, 0.2), color: col, fontSize: 10, fontWeight: 700, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.5 }}>{a.texto}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Grid>
          </Grid>
        )}

        {tab === 2 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2.5 }}>
                  Horas de Capacitación — Últimos 6 Meses
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
                  {TENDENCIAS_6M.map((t, i) => {
                    const pct = (t.horas / maxHoras) * 100
                    const isMax = t.horas === maxHoras
                    return (
                      <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                        <Typography sx={{ fontSize: 10.5, color: LMS_COLOR, fontWeight: 700 }}>{t.horas}h</Typography>
                        <Box sx={{
                          width: '100%', borderRadius: '4px 4px 0 0',
                          height: `${pct}%`, minHeight: 8,
                          background: isMax ? `linear-gradient(180deg, ${LMS_COLOR} 0%, #B45309 100%)` : `linear-gradient(180deg, ${alpha(LMS_COLOR, 0.5)} 0%, ${alpha(LMS_COLOR, 0.3)} 100%)`,
                          boxShadow: isMax ? `0 0 12px ${alpha(LMS_COLOR, 0.4)}` : 'none',
                          transition: 'height 0.6s ease',
                        }} />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t.mes}</Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ bgcolor: alpha(AI_COLOR, 0.05), border: `1px solid ${AI_BOR}`, borderRadius: 2, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AutoAwesome sx={{ color: AI_COLOR, fontSize: 18 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Análisis IA de Tendencias</Typography>
                </Box>
                {[
                  'Las horas de capacitación crecieron 34.9% en el primer trimestre 2026 vs Q1 2025, impulsadas por la implementación del módulo LMS.',
                  'Mayo fue el mes más activo con 421 horas y 71 completados. La correlación con la campaña "Reto Seguridad Vial" es estadísticamente significativa (r=0.87).',
                  'Se proyecta superar las 400 horas mensuales de forma sostenida a partir de agosto, cuando concluyen los planes de inducción del personal nuevo.',
                  'El área de Transporte lidera en horas per cápita (8.4h/colaborador/mes), seguida de Calidad (6.2h). Se recomienda reforzar el área Comercial que está en 2.1h.',
                ].map((t, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                    <Typography sx={{ fontSize: 11, color: AI_COLOR, fontWeight: 800, flexShrink: 0, mt: 0.25 }}>{i + 1}.</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>{t}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        )}

        {tab === 3 && (
          <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            <Box sx={{ border: `1px solid ${AI_BOR}`, borderRadius: 2, p: 3, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${AI_COLOR} 0%, #6D28D9 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SmartToy sx={{ color: 'text.primary', fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>Asistente Virtual de Aprendizaje</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Impulsado por IA · Responde en segundos</Typography>
                </Box>
              </Box>
              {[
                { q: '¿Qué cursos necesito completar?', r: 'Tienes 4 cursos obligatorios pendientes: SST Inducción, Seguridad Vial, Normatividad de Tránsito y Primeros Auxilios. Te recomiendo iniciar con Primeros Auxilios ya que tu certificación vence en 8 días.' },
                { q: '¿Qué certificaciones vencen este mes?', r: 'Tu certificación de "Conducción Defensiva" vence el 28 de junio 2026 (en 8 días). Debes renovarla urgentemente tomando el módulo de recertificación disponible en el catálogo.' },
                { q: '¿Qué competencias debo desarrollar para ascender?', r: 'Para avanzar de Conductor C3 a Supervisor de Operaciones, debes desarrollar: Liderazgo de BÁSICO a INTERMEDIO, Calidad ISO de INICIAL a BÁSICO y Comunicación Efectiva de BÁSICO a INTERMEDIO. Te recomiendo iniciar con la Ruta del Supervisor.' },
              ].map((item, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <Box sx={{ bgcolor: alpha(LMS_COLOR, 0.15), border: `1px solid ${alpha(LMS_COLOR, 0.25)}`, borderRadius: '12px 12px 4px 12px', px: 2, py: 1, maxWidth: '75%' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{item.q}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: alpha(AI_COLOR, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <SmartToy sx={{ fontSize: 16, color: AI_COLOR }} />
                    </Box>
                    <Box sx={{ bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px 12px 12px 12px', px: 2, py: 1, flex: 1 }}>
                      <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>{item.r}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['¿Qué cursos necesito?', '¿Mis certificaciones?', '¿Cómo ascender?'].map((q, i) => (
                <Chip key={i} label={q} onClick={() => {}} sx={{
                  cursor: 'pointer', bgcolor: alpha(AI_COLOR, 0.1), color: AI_COLOR,
                  border: `1px solid ${alpha(AI_COLOR, 0.25)}`, '&:hover': { bgcolor: alpha(AI_COLOR, 0.2) }, fontSize: 12,
                }} />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
