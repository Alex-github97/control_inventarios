import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, InputBase, alpha } from '@mui/material'
import { AutoAwesome, Send, TrendingDown } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const AI_COLOR  = '#8B5CF6'
const AI_BOR    = 'rgba(139,92,246,0.25)'
const CARD_BG   = '#0F1E35'
const DARK_BG   = '#060C1A'

const RECOMENDACIONES = [
  { cliente: 'Almacenes Éxito S.A.', tipo: 'UPSELLING',     score: 94, servicio: 'Servicio de etiquetado inteligente en CD', razon: 'Alto volumen de SKUs y crecimiento YoY 18%', potencial: 320 },
  { cliente: 'Corona S.A.',          tipo: 'EXPANSION',     score: 91, servicio: 'Apertura CD Barranquilla — ICOLTRANS operador', razon: 'Expansión regional confirmada en board meeting', potencial: 800 },
  { cliente: 'Sodimac Colombia',     tipo: 'CROSS_SELLING',  score: 88, servicio: 'Incorporar TMS para rutas urbanas',          razon: 'Actualmente tercerizan TMS con competidor', potencial: 480 },
  { cliente: 'Bancolombia',          tipo: 'RETENTION',     score: 75, servicio: 'Contrato multi-año con beneficios exclusivos', razon: 'Contrato vence en 73 días — sin renovación iniciada', potencial: 1800 },
  { cliente: 'Grupo Nutresa',        tipo: 'RECOVERY',      score: 62, servicio: 'Plan de mejora OTIF con SLA reforzado',       razon: 'OTIF en 82% — por debajo de meta contractual', potencial: 2150 },
  { cliente: 'Pharmavida S.A.',      tipo: 'REACTIVATION',  score: 45, servicio: 'Propuesta de reactivo con nuevas tarifas',    razon: 'Contrato vencido hace 170 días sin renovación', potencial: 950 },
]

const TIPO_COLOR: Record<string, string> = {
  UPSELLING: '#059669', EXPANSION: CRM_COLOR, CROSS_SELLING: '#0EA5E9',
  RETENTION: '#F59E0B', RECOVERY: '#EF4444', REACTIVATION: '#7C3AED',
}

const CHURN_CLIENTES = [
  { cliente: 'Pharmavida S.A.',  riesgo: 42, factores: ['Contrato vencido 170 días', 'OTIF históricamente bajo', 'Sin interacciones últimas 3 semanas'], color: '#EF4444' },
  { cliente: 'Grupo Nutresa',    riesgo: 35, factores: ['OTIF 82% — bajo SLA 90%', '3 reclamos pendientes', 'NPS cayó de +48 a +28'], color: CRM_COLOR },
  { cliente: 'Logística Sur',    riesgo: 28, factores: ['Contrato en estado INACTIVO', 'Sin pedidos últimos 60 días'], color: '#F59E0B' },
]

interface Msg { rol: 'user' | 'ia'; texto: string }

const RESPUESTAS_IA: Record<string, string> = {
  default: 'Analizo los datos CRM en tiempo real. ¿Qué cliente o proceso comercial te interesa revisar?',
  exito: 'Almacenes Éxito S.A. tiene health score de 88/100. El contrato vence en 30 días — recomiendo iniciar renovación esta semana. Potencial de upselling en etiquetado: $320M.',
  nutresa: 'Grupo Nutresa está en zona de riesgo. OTIF cayó al 82% vs meta 90%. Sugiero reunión urgente de plan de choque. Riesgo de churn: 35%. Si no se actúa, pérdida estimada: $2.15B.',
  pipeline: 'Pipeline activo: $2.24B en 8 oportunidades. Top 3: Corona ($640M, 75%), Almacenes Éxito ($480M, 80%), TMS Pharmavida ($380M, 70%). Win rate actual: 64%.',
  nps: 'NPS global: +48. Promotores 62%, Neutros 24%, Detractores 14%. Área crítica: Grupo Nutresa (NPS +28). Acción sugerida: encuesta post-mejora OTIF en 30 días.',
}

export default function CRMIA() {
  const [tab, setTab]     = useState(0)
  const [msgs, setMsgs]   = useState<Msg[]>([
    { rol: 'ia', texto: RESPUESTAS_IA.default },
  ])
  const [input, setInput] = useState('')

  function enviar() {
    if (!input.trim()) return
    const txt = input.toLowerCase()
    const res = txt.includes('éxito') || txt.includes('exito') ? RESPUESTAS_IA.exito
      : txt.includes('nutresa') ? RESPUESTAS_IA.nutresa
      : txt.includes('pipeline') ? RESPUESTAS_IA.pipeline
      : txt.includes('nps') ? RESPUESTAS_IA.nps
      : `Analizando "${input}"... En base a los datos CRM, te recomiendo revisar los KPIs de rentabilidad y salud del cliente seleccionado. ¿Quieres que profundice en pipeline, churn o contratos?`
    setMsgs(prev => [...prev, { rol: 'user', texto: input }, { rol: 'ia', texto: res }])
    setInput('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: DARK_BG, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${AI_COLOR} 0%, #7C3AED 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(139,92,246,0.4)`,
          }}>
            <AutoAwesome sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>IA Comercial</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Lead Scoring · Predicción Churn · Recomendaciones · Asistente Comercial
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${AI_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: AI_COLOR } }}>
          <Tab label="Recomendaciones" />
          <Tab label="Predicción de Churn" />
          <Tab label="Asistente IA" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {RECOMENDACIONES.map((r, i) => {
              const col = TIPO_COLOR[r.tipo] || AI_COLOR
              return (
                <Box key={i} sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(col, 0.25)}`, borderRadius: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                        <Chip label={r.tipo.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(col, 0.15), color: col, fontSize: 10, fontWeight: 700 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, bgcolor: alpha(AI_COLOR, 0.1), borderRadius: 1 }}>
                          <AutoAwesome sx={{ fontSize: 11, color: AI_COLOR }} />
                          <Typography sx={{ fontSize: 10, color: AI_COLOR, fontWeight: 700 }}>Score IA: {r.score}</Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>{r.servicio}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', mt: 0.25 }}>
                        {r.cliente} · {r.razon}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 20, fontWeight: 900, color: col }}>${r.potencial}M</Typography>
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>potencial</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${r.score}%`, bgcolor: col, borderRadius: 2 }} />
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${AI_BOR}`, borderRadius: 2, p: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TrendingDown sx={{ color: AI_COLOR, fontSize: 20 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>Modelo Predictivo de Churn — Umbral: 25%</Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>Entrenado con 24 meses de datos históricos · Precisión: 87.4%</Typography>
            </Box>
            {CHURN_CLIENTES.map((c, i) => (
              <Box key={i} sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(c.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>{c.cliente}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Riesgo de churn en próximos 90 días</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 28, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.riesgo}%</Typography>
                    <Chip label={c.riesgo >= 35 ? 'CRÍTICO' : c.riesgo >= 25 ? 'ALTO' : 'MEDIO'} size="small"
                      sx={{ bgcolor: alpha(c.color, 0.15), color: c.color, fontSize: 9.5, fontWeight: 700 }} />
                  </Box>
                </Box>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden', mb: 1.5 }}>
                  <Box sx={{ height: '100%', width: `${c.riesgo * 2}%`, bgcolor: c.color, borderRadius: 4 }} />
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', mb: 0.75 }}>FACTORES DE RIESGO</Typography>
                {c.factores.map((f, j) => (
                  <Box key={j} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: c.color, mt: 0.7, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{f}</Typography>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${AI_BOR}`, borderRadius: 2, display: 'flex', flexDirection: 'column', height: 560 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${AI_COLOR} 0%, #7C3AED 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AutoAwesome sx={{ fontSize: 16, color: '#FFF' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>Asistente Comercial IA</Typography>
                <Typography sx={{ fontSize: 10.5, color: AI_COLOR }}>● En línea — datos CRM en tiempo real</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {msgs.map((m, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: m.rol === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{
                    maxWidth: '80%', p: 1.5, borderRadius: m.rol === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    bgcolor: m.rol === 'user' ? alpha(CRM_COLOR, 0.2) : alpha(AI_COLOR, 0.12),
                    border: `1px solid ${m.rol === 'user' ? alpha(CRM_COLOR, 0.3) : alpha(AI_COLOR, 0.25)}`,
                  }}>
                    <Typography sx={{ fontSize: 13, color: '#FFF', lineHeight: 1.55 }}>{m.texto}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                {['Pipeline actual', 'Riesgo Nutresa', 'NPS global', 'Renovar Éxito'].map((q, i) => (
                  <Chip key={i} label={q} size="small" onClick={() => { setInput(q); }} sx={{ cursor: 'pointer', bgcolor: alpha(AI_COLOR, 0.1), color: AI_COLOR, border: `1px solid ${alpha(AI_COLOR, 0.25)}`, fontSize: 10 }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, bgcolor: alpha(AI_COLOR, 0.07), border: `1px solid ${AI_BOR}`, borderRadius: 2, px: 2, py: 1 }}>
                <InputBase value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                  placeholder="Pregunta sobre clientes, pipeline, NPS, contratos..."
                  sx={{ flex: 1, color: '#FFF', fontSize: 13 }} />
                <Box onClick={enviar} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: AI_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Send sx={{ fontSize: 15, color: '#FFF' }} />
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
