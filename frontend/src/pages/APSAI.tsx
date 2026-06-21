import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Grid, Chip, Paper, Tabs, Tab, Button,
  LinearProgress, TextField, alpha,
} from '@mui/material'
import { Insights, Send, SmartToy, TrendingUp, Warning } from '@mui/icons-material'

const APS_COLOR = '#7C3AED'
const AI_COLOR  = '#8B5CF6'

const predicciones = [
  { titulo: 'Quiebre de stock Empaque A400 en Bogotá', prob: 87, nivel: 'ALTO', dias: 12, fuente: 'ML-LSTM', accion: 'Generar orden urgente 5,000 un' },
  { titulo: 'Pico de demanda Export +35% semana 24', prob: 73, nivel: 'MEDIO', dias: 14, fuente: 'ML', accion: 'Reservar capacidad Planta 2' },
  { titulo: 'Restricción capacidad Línea 2 en 3 semanas', prob: 91, nivel: 'CRITICO', dias: 21, fuente: 'ML-LSTM', accion: 'Programar turno extra' },
  { titulo: 'Exceso inventario MP Resina PET +18%', prob: 65, nivel: 'BAJO', dias: 30, fuente: 'Estadístico', accion: 'Reducir próxima orden' },
  { titulo: 'Proveedor X: riesgo retraso +5 días', prob: 78, nivel: 'MEDIO', dias: 8, fuente: 'Externo', accion: 'Activar proveedor alternativo' },
]

const optimizaciones = [
  { metrica: 'Costo Total Plan', valor: '$4,312M', mejora: '-11.1%', good: true },
  { metrica: 'OTIF Proyectado', valor: '97.8%', mejora: '+1.6%', good: true },
  { metrica: 'Inventario Promedio', valor: '$398M', mejora: '-8.5%', good: true },
  { metrica: 'CO2 Estimado', valor: '121 ton', mejora: '-16.6%', good: true },
]

const twinComponentes = [
  { nombre: 'Gemelo Demanda', estado: 'ONLINE', sync: 'hace 2min', precision: 94.2, color: '#10B981' },
  { nombre: 'Gemelo Inventario', estado: 'ONLINE', sync: 'hace 1min', precision: 99.1, color: '#10B981' },
  { nombre: 'Gemelo Capacidad', estado: 'ONLINE', sync: 'hace 5min', precision: 97.8, color: '#10B981' },
  { nombre: 'Gemelo Transporte', estado: 'ONLINE', sync: 'hace 3min', precision: 96.3, color: '#10B981' },
  { nombre: 'Gemelo Financiero', estado: 'PARCIAL', sync: 'hace 22min', precision: 88.4, color: '#F59E0B' },
  { nombre: 'Gemelo Proveedores', estado: 'ONLINE', sync: 'hace 8min', precision: 91.7, color: '#10B981' },
]

const eventosTwin = [
  { evento: 'Pico demanda Export detectado', impacto: '+35% revenue Q3', prob: 73, respuesta: 'Aumentar MPS 2,200 un' },
  { evento: 'Falla Proveedor X simulada', impacto: '-18% disponibilidad MP', prob: 78, respuesta: 'Activar prov. alternativo' },
  { evento: 'Restricción L2 confirmada', impacto: '-1,200 un/mes', prob: 91, respuesta: 'Turno extra + subcontrato' },
  { evento: 'Exceso stock CEDI Cali', impacto: '+$15M capital inmovilizado', prob: 65, respuesta: 'Traslado a Bogotá 800 un' },
]

const chatMsgs: { from: 'user' | 'ai'; msg: string }[] = [
  { from: 'ai', msg: '¡Hola! Soy el Asistente IA del módulo APS. Puedo ayudarte con análisis de demanda, capacidad, inventario óptimo y simulaciones. ¿En qué te ayudo hoy?' },
  { from: 'user', msg: '¿Hay algún riesgo de quiebre de stock esta semana?' },
  { from: 'ai', msg: 'Sí. He detectado 2 riesgos críticos: (1) Empaque A400 en Planta Bogotá tiene probabilidad 87% de quiebre en 12 días — recomiendo generar orden de emergencia por 5,000 unidades. (2) Proveedor X tiene riesgo de retraso de 5 días con probabilidad 78% — sugiero activar el proveedor alternativo registrado en el sistema.' },
  { from: 'user', msg: '¿Cuál es la capacidad disponible para la semana 26?' },
  { from: 'ai', msg: 'Para la semana 26: Planta Bogotá tiene 89.3% de utilización (16,000 de 17,920 h disponibles). Línea 2 está al 96% — cuello de botella activo. Planta Medellín tiene capacidad libre del 22% (5,500 h). Recomiendo transferir 1,200 unidades de Plan a Medellín para liberar Bogotá.' },
]

function respuestaIA(input: string): string {
  const t = input.toLowerCase()
  if (t.includes('quiebr') || t.includes('stock')) return '🔴 Riesgo detectado: Empaque A400 probabilidad 87% de quiebre en 12 días. Acción recomendada: orden urgente 5,000 un. Proveedor X: riesgo retraso +5 días, probabilidad 78%.'
  if (t.includes('demanda') || t.includes('pronóstico') || t.includes('forecast')) return '📊 Forecast Accuracy global: 91.4%, MAPE: 8.6%. Familia Premium: 94.2% (modelo LSTM). Alerta: Línea Seasonal al 79.4% — pendiente recalibración. ¿Deseas ver detalle por familia?'
  if (t.includes('capacidad') || t.includes('producción') || t.includes('planta')) return '⚙️ Capacidad semana 26: Bogotá 89.3% utilización, Línea 2 CUELLO 96%. Medellín 78% (22% libre). Recomendación: transferir 1,200 un a Medellín. ¿Quieres que genere el ajuste en el MPS?'
  if (t.includes('optimiz')) return '🚀 Última optimización (hace 2h): Costo reducido -11.1% vs manual ($4,312M). OTIF proyectado 97.8%. Algoritmo: Branch & Bound + Heurísticas. ¿Deseas lanzar nueva optimización con parámetros actuales?'
  if (t.includes('inventario') || t.includes('stock')) return '📦 Estado inventario: 8.3x rotación, 44 días de cobertura. Alerta exceso: MP Resina PET +18% sobre objetivo. Stock seguridad Empaque A400: CRÍTICO (0 días buffer). Working Capital: $435M.'
  return '🤖 He analizado tu consulta. Para darte una respuesta precisa, necesito más contexto. Puedes preguntarme sobre: demanda, capacidad, quiebre de stock, inventario, optimización o simulaciones. ¿Cuál es tu prioridad?'
}

export default function APSAI() {
  const [tab, setTab] = useState(0)
  const [optimizando, setOptimizando] = useState(false)
  const [progOpt, setProgOpt] = useState(0)
  const [msgs, setMsgs] = useState(chatMsgs)
  const [input, setInput] = useState('')

  const lanzarOpt = () => {
    setOptimizando(true); setProgOpt(0)
    const iv = setInterval(() => {
      setProgOpt(p => { if (p >= 100) { clearInterval(iv); setOptimizando(false); return 100 } return p + 6 })
    }, 150)
  }

  const sendMsg = () => {
    if (!input.trim()) return
    const user = input.trim()
    setMsgs(m => [...m, { from: 'user', msg: user }, { from: 'ai', msg: respuestaIA(user) }])
    setInput('')
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#0F172A', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${AI_COLOR} 0%, #6D28D9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${alpha(AI_COLOR, 0.4)}` }}>
            <Insights sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700 }}>IA Autónoma APS</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>Motor de IA y Optimización Matemática · Programación Lineal Entera · Branch & Bound · Heurísticas</Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip label="IA Online" size="small" sx={{ bgcolor: alpha(AI_COLOR, 0.15), color: AI_COLOR, fontWeight: 700 }} />
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 }, '& .Mui-selected': { color: AI_COLOR }, '& .MuiTabs-indicator': { bgcolor: AI_COLOR } }}>
          <Tab label="Predicciones" />
          <Tab label="Optimización" />
          <Tab label="Digital Twin SC" />
          <Tab label="Asistente IA" />
        </Tabs>

        {tab === 0 && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {predicciones.map((p, i) => (
                <Grid key={i} size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2.5, borderLeft: `4px solid ${p.prob > 85 ? '#EF4444' : p.prob > 70 ? '#F59E0B' : '#3B82F6'}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Typography sx={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, flex: 1, pr: 1 }}>{p.titulo}</Typography>
                      <Chip label={p.nivel} size="small" sx={{ bgcolor: alpha(p.nivel === 'CRITICO' ? '#EF4444' : p.nivel === 'ALTO' ? '#F59E0B' : p.nivel === 'MEDIO' ? '#3B82F6' : '#10B981', 0.15), color: p.nivel === 'CRITICO' ? '#EF4444' : p.nivel === 'ALTO' ? '#F59E0B' : p.nivel === 'MEDIO' ? '#3B82F6' : '#10B981', fontSize: 10, fontWeight: 700, flexShrink: 0 }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Probabilidad</Typography>
                      <Typography sx={{ color: AI_COLOR, fontWeight: 700, fontSize: 12 }}>{p.prob}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={p.prob} sx={{ mb: 1.5, height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: p.prob > 85 ? '#EF4444' : p.prob > 70 ? '#F59E0B' : '#3B82F6', borderRadius: 3 } }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Fuente: {p.fuente} · En {p.dias} días</Typography>
                      <Typography sx={{ color: AI_COLOR, fontSize: 11, fontWeight: 600 }}>→ {p.accion}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {tab === 1 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 3 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1, fontSize: 15 }}>Motor de Optimización Matemática</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, mb: 3 }}>Programación Lineal Entera Mixta (MILP) · Branch & Bound · Heurísticas Constructivas · Multi-Objetivo</Typography>
                <Button fullWidth variant="contained" onClick={lanzarOpt} disabled={optimizando}
                  sx={{ bgcolor: AI_COLOR, py: 1.5, fontWeight: 700, mb: 2, '&:hover': { bgcolor: '#7C3AED' } }}>
                  {optimizando ? 'Optimizando...' : '🚀 Lanzar Optimización'}
                </Button>
                {optimizando && (
                  <>
                    <LinearProgress variant="determinate" value={progOpt} sx={{ mb: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: AI_COLOR } }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>Evaluando {Math.round(progOpt * 18)} soluciones... {progOpt}%</Typography>
                  </>
                )}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(139,92,246,0.08)', borderRadius: '10px', border: `1px solid ${alpha(AI_COLOR, 0.2)}` }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, mb: 1 }}>ÚLTIMA CORRIDA (hace 2h) · 38.4 seg</Typography>
                  {[{ l: 'Soluciones evaluadas', v: '1,247,839' }, { l: 'Función objetivo', v: '$4,312M (min)' }, { l: 'Gap optimidad', v: '0.3%' }].map(r => (
                    <Box key={r.l} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{r.l}</Typography>
                      <Typography sx={{ color: AI_COLOR, fontSize: 11, fontWeight: 700 }}>{r.v}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 3 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 2, fontSize: 15 }}>Resultados vs Plan Manual</Typography>
                {optimizaciones.map(o => (
                  <Box key={o.metrica} sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{o.metrica}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label={o.mejora} size="small" sx={{ bgcolor: alpha('#10B981', 0.15), color: '#10B981', fontWeight: 700, fontSize: 10 }} />
                        <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ color: '#10B981', fontSize: 22, fontWeight: 800 }}>{o.valor}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        )}

        {tab === 2 && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {twinComponentes.map(t => (
                <Grid key={t.nombre} size={{ xs: 6, md: 4 }}>
                  <Box sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2, borderLeft: `4px solid ${t.color}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: '#F8FAFC', fontSize: 12, fontWeight: 600 }}>{t.nombre}</Typography>
                      <Chip label={t.estado} size="small" sx={{ bgcolor: alpha(t.color, 0.15), color: t.color, fontSize: 10 }} />
                    </Box>
                    <Typography sx={{ color: t.color, fontSize: 22, fontWeight: 800 }}>{t.precision}%</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Precisión · Sync {t.sync}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2 }}>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 2, fontSize: 15 }}>Eventos Simulados en el Digital Twin</Typography>
              {eventosTwin.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '10px', alignItems: 'center' }}>
                  <Warning sx={{ color: '#F59E0B', fontSize: 18, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600 }}>{e.evento}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Impacto: {e.impacto}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography sx={{ color: AI_COLOR, fontSize: 12, fontWeight: 700 }}>{e.prob}%</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>probabilidad</Typography>
                  </Box>
                  <Box sx={{ bgcolor: alpha(AI_COLOR, 0.1), borderRadius: '8px', p: 1, flexShrink: 0, maxWidth: 160 }}>
                    <Typography sx={{ color: AI_COLOR, fontSize: 10, fontWeight: 600 }}>→ {e.respuesta}</Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </>
        )}

        {tab === 3 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 0, display: 'flex', flexDirection: 'column', height: 520 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToy sx={{ color: AI_COLOR, fontSize: 18 }} />
                  <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>Asistente IA APS</Typography>
                  <Chip label="Online" size="small" sx={{ ml: 'auto', bgcolor: alpha('#10B981', 0.15), color: '#10B981', fontSize: 10 }} />
                </Box>
                <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {msgs.map((m, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                      <Box sx={{ maxWidth: '80%', p: 1.5, borderRadius: m.from === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', bgcolor: m.from === 'user' ? alpha(APS_COLOR, 0.25) : 'rgba(255,255,255,0.07)' }}>
                        {m.from === 'ai' && <Typography sx={{ color: AI_COLOR, fontSize: 10, fontWeight: 700, mb: 0.5 }}>IA APS</Typography>}
                        <Typography sx={{ color: '#E2E8F0', fontSize: 12, lineHeight: 1.6 }}>{m.msg}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth size="small" placeholder="Pregunta sobre demanda, capacidad, inventario..."
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMsg()}
                    sx={{ '& .MuiOutlinedInput-root': { color: '#F8FAFC', fontSize: 12, bgcolor: 'rgba(255,255,255,0.05)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: AI_COLOR }, '&.Mui-focused fieldset': { borderColor: AI_COLOR } }, '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.25)' } }}
                  />
                  <Button variant="contained" onClick={sendMsg} sx={{ bgcolor: AI_COLOR, minWidth: 44, px: 1.5, '&:hover': { bgcolor: APS_COLOR } }}>
                    <Send sx={{ fontSize: 16 }} />
                  </Button>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2, mb: 2 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 2, fontSize: 14 }}>Preguntas Frecuentes</Typography>
                {['¿Hay riesgo de quiebre de stock esta semana?', '¿Cuál es la capacidad disponible?', '¿Cómo está el forecast de demanda?', '¿Qué optimizaciones recomiendas?'].map((q, i) => (
                  <Box key={i} onClick={() => { setInput(q) }} sx={{ p: 1.5, mb: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.04)', cursor: 'pointer', '&:hover': { bgcolor: alpha(AI_COLOR, 0.1) } }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{q}</Typography>
                  </Box>
                ))}
              </Paper>
              <Paper sx={{ bgcolor: '#1E293B', borderRadius: '12px', p: 2 }}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1.5, fontSize: 14 }}>Capacidades del Asistente</Typography>
                {['Análisis de riesgos de quiebre', 'Cálculo de capacidad disponible', 'Revisión de forecast y accuracy', 'Recomendaciones de optimización', 'Simulación de escenarios What-If', 'Alertas predictivas por ML'].map((c, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: AI_COLOR, flexShrink: 0 }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{c}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
