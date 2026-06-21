import React, { useState, useRef, useEffect } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, Divider, LinearProgress, TextField,
  IconButton, Avatar,
} from '@mui/material'
import {
  AutoAwesome as AIIcon,
  Warning as WarnIcon,
  Build as BuildIcon,
  TrendingUp as TrendIcon,
  Speed as SpeedIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Timeline as TimelineIcon,
  Factory as FactoryIcon,
  BugReport as BugIcon,
  Tune as TuneIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const CARD_BG = '#0F1E35'
const DARK_BG = '#060C1A'
const AI_COLOR = '#8B5CF6'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface EquipoPrediccion {
  id: number
  equipo: string
  linea: string
  probabilidadFalla: number
  tiempoRestante: string
  causaRaiz: string
  ultimaLectura: string
  otGenerada: boolean
}

interface SecuenciacionItem {
  op: string
  producto: string
  antes: string
  despues: string
  ganancia: number
}

interface ScrapOptimo {
  producto: string
  tempActual: number
  tempOptima: number
  scrapActual: number
  scrapProyectado: number
}

interface Anomalia {
  id: number
  hora: string
  equipo: string
  descripcion: string
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA'
  estado: 'ACTIVA' | 'INVESTIGANDO' | 'RESUELTA'
  tiempoResolucion: string
  accion: string
}

interface ChatMsg {
  role: 'user' | 'bot'
  text: string
  ts: Date
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const EQUIPOS_PREDICCION: EquipoPrediccion[] = [
  { id: 1, equipo: 'EQ-001 Inyectora Arburg', linea: 'Línea A', probabilidadFalla: 87, tiempoRestante: '4.2h', causaRaiz: 'Desgaste rodamiento izquierdo — patrón vibración anormal desde 06:00', ultimaLectura: '8.4 mm/s vibración', otGenerada: false },
  { id: 2, equipo: 'EQ-003 Extrusora Cincinnati', linea: 'Línea B', probabilidadFalla: 74, tiempoRestante: '11h', causaRaiz: 'Temperatura tornillo zona 3 elevada — posible fuga aceite lubricación', ultimaLectura: 'Zona 3: 198°C (máx. 175°C)', otGenerada: false },
  { id: 3, equipo: 'EQ-005 Sopladora PET', linea: 'Línea C', probabilidadFalla: 61, tiempoRestante: '18h', causaRaiz: 'Desgaste molde cavidad #2 — ciclo alargado 4.2%', ultimaLectura: 'Ciclo: 8.7s (normal 8.3s)', otGenerada: false },
  { id: 4, equipo: 'EQ-007 Robot Fanuc', linea: 'Línea A', probabilidadFalla: 48, tiempoRestante: '28h', causaRaiz: 'Corriente motor eje J4 fuera de rango nominal', ultimaLectura: '4.8A (normal 3.2A)', otGenerada: false },
  { id: 5, equipo: 'EQ-002 Prensa Hydraulic', linea: 'Línea D', probabilidadFalla: 32, tiempoRestante: '42h', causaRaiz: 'Presión hidráulica levemente baja — válvula check sospechosa', ultimaLectura: '195 bar (normal 210 bar)', otGenerada: false },
  { id: 6, equipo: 'EQ-009 Compresora Atlas', linea: 'Planta', probabilidadFalla: 21, tiempoRestante: '68h', causaRaiz: 'Acumulación lenta de agua en separador — mantenimiento rutinario programable', ultimaLectura: 'Temp descarga: 82°C', otGenerada: false },
]

const SECUENCIACION: SecuenciacionItem[] = [
  { op: 'OP-2025-041', producto: 'PT-001 Producto Base', antes: '08:00 - 11:30', despues: '08:00 - 10:15', ganancia: 75 },
  { op: 'OP-2025-042', producto: 'PT-002 Producto Plus', antes: '11:30 - 15:00', despues: '10:15 - 13:20', ganancia: 100 },
  { op: 'OP-2025-043', producto: 'PT-003 Modelo X', antes: '15:00 - 17:30', despues: '13:20 - 15:40', ganancia: 50 },
  { op: 'OP-2025-044', producto: 'PT-005 Kit Estándar', antes: '17:30 - 20:00', despues: '15:40 - 17:30', ganancia: 50 },
]

const SCRAP_OPTIMO: ScrapOptimo[] = [
  { producto: 'PT-001 Producto Base', tempActual: 185, tempOptima: 178, scrapActual: 4.2, scrapProyectado: 2.1 },
  { producto: 'PT-002 Producto Plus', tempActual: 192, tempOptima: 183, scrapActual: 5.8, scrapProyectado: 2.8 },
  { producto: 'PT-003 Modelo X', tempActual: 170, tempOptima: 174, scrapActual: 3.1, scrapProyectado: 1.9 },
  { producto: 'PT-004 Ensamble M', tempActual: 188, tempOptima: 181, scrapActual: 6.4, scrapProyectado: 3.2 },
  { producto: 'PT-005 Kit Estándar', tempActual: 176, tempOptima: 176, scrapActual: 1.8, scrapProyectado: 1.8 },
]

const ANOMALIAS: Anomalia[] = [
  { id: 1, hora: '06:42', equipo: 'EQ-001 Inyectora', descripcion: 'Vibración eje principal > umbral 8 mm/s durante 18 min continuos', severidad: 'CRITICA', estado: 'ACTIVA', tiempoResolucion: '—', accion: 'Alerta generada — esperando intervención' },
  { id: 2, hora: '07:15', equipo: 'EQ-003 Extrusora', descripcion: 'Temperatura zona 3 supera 195°C — riesgo degradación material', severidad: 'CRITICA', estado: 'INVESTIGANDO', tiempoResolucion: '38 min', accion: 'Operario verificando válvula lubricación' },
  { id: 3, hora: '07:58', equipo: 'Línea B', descripcion: 'Micro-paro no planificado 4 min — sensor de presencia pieza falla', severidad: 'ALTA', estado: 'RESUELTA', tiempoResolucion: '12 min', accion: 'Sensor limpiado y reajustado' },
  { id: 4, hora: '08:30', equipo: 'EQ-005 Sopladora', descripcion: 'Ciclo de molde aumentado 4.2% — cavidad #2 requiere ajuste', severidad: 'ALTA', estado: 'INVESTIGANDO', tiempoResolucion: '22 min', accion: 'Técnico ajustando parámetros cavidad #2' },
  { id: 5, hora: '09:05', equipo: 'Línea A', descripcion: 'OEE cayó por debajo del 80% — impacto disponibilidad por paros cortos', severidad: 'ALTA', estado: 'ACTIVA', tiempoResolucion: '—', accion: 'Análisis de causa raíz iniciado (IA)' },
  { id: 6, hora: '09:40', equipo: 'EQ-007 Robot', descripcion: 'Corriente eje J4 pico 5.2A — posible obstrucción parcial en trayectoria', severidad: 'MEDIA', estado: 'INVESTIGANDO', tiempoResolucion: '15 min', accion: 'Verificación de trayectoria programada' },
  { id: 7, hora: '10:12', equipo: 'Línea D', descripcion: 'Presión hidráulica prensa bajo 195 bar por 3 ciclos consecutivos', severidad: 'MEDIA', estado: 'ACTIVA', tiempoResolucion: '—', accion: 'Monitoreo en curso — umbral 190 bar' },
  { id: 8, hora: '10:45', equipo: 'EQ-009 Compresora', descripcion: 'Temperatura descarga 82°C — tendencia ascendente en últimas 2h', severidad: 'MEDIA', estado: 'RESUELTA', tiempoResolucion: '8 min', accion: 'Purgado del separador de condensados' },
]

const QUICK_PROMPTS_MES = [
  '¿Cuál es el OEE hoy?',
  '¿Qué línea tiene más paradas?',
  'Analiza el scrap de Línea A',
  '¿Cuándo debo hacer mantenimiento al EQ-003?',
]

const BOT_RESPONSES_MES: Record<string, string> = {
  oee: `📊 **OEE Global — Hoy ${new Date().toLocaleDateString('es-CO')}:**\n\n• Línea A: **82.4%** (Disponibilidad 91%, Rendimiento 94%, Calidad 96%)\n• Línea B: **78.1%** (afectada por EQ-003 — temperatura tornillo)\n• Línea C: **88.3%** (mejor línea del día)\n• Línea D: **85.7%**\n• **OEE Planta Global: 83.6%**\n\nObjetivo corporativo: ≥85%. Línea B requiere atención inmediata para alcanzar la meta.`,
  paradas: `⚠️ **Análisis de paradas — Hoy:**\n\n1. 🔴 **Línea B** — 3 paradas, total 42 min (EQ-003 temperatura, ajuste parámetros, cambio herramienta)\n2. 🟠 **Línea A** — 2 paradas, total 18 min (vibración EQ-001, micro-paro robot)\n3. 🟡 **Línea D** — 1 parada, total 8 min (presión hidráulica baja)\n4. ✅ **Línea C** — 0 paradas planificadas no programadas\n\n💡 **Causa raíz Línea B:** Mantenimiento preventivo EQ-003 vencido — programar urgente.`,
  scrap: `🔍 **Análisis de scrap Línea A — Turno actual:**\n\n• Scrap total: **4.2%** (objetivo ≤2.5%)\n• Principal causa: temperatura inyectora 185°C vs óptimo 178°C\n• Piezas no conformes: 38 unidades en OP-2025-041\n• Costo pérdida: estimado $1.2M COP\n\n💡 **Recomendación IA:** Reducir temperatura a 178°C en EQ-001 — proyecta scrap a 2.1% (ahorro $680K COP/turno).\n⚠️ Verificar perfil de temperatura antes del ajuste — rodamiento puede influir.`,
  eq003: `🔧 **Plan de mantenimiento EQ-003 — Extrusora Cincinnati:**\n\n• **Estado actual:** Temperatura zona 3: 198°C (crítica)\n• **Probabilidad falla:** 74% en próximas 11 horas\n• **Recomendación IA:** Intervención HOY en turno nocturno 22:00\n\n**Plan propuesto:**\n1. Revisión válvula lubricación tornillo (30 min)\n2. Limpieza zona de calefacción 3 (45 min)\n3. Ajuste PID temperatura zona 3 (20 min)\n4. Prueba en vacío antes de reanudar (15 min)\n\n⏱ Tiempo estimado total: 2h — sin impacto en producción diurna.`,
}

const getBotReplyMES = (input: string): string => {
  const lower = input.toLowerCase()
  if (lower.includes('oee') || lower.includes('eficiencia')) return BOT_RESPONSES_MES.oee
  if (lower.includes('parada') || lower.includes('línea') || lower.includes('linea')) return BOT_RESPONSES_MES.paradas
  if (lower.includes('scrap') || lower.includes('desperdicio') || lower.includes('línea a')) return BOT_RESPONSES_MES.scrap
  if (lower.includes('eq-003') || lower.includes('eq003') || lower.includes('mantenimiento')) return BOT_RESPONSES_MES.eq003
  return `🤖 Procesando consulta: "${input}"\n\nEsta función de IA está en desarrollo. Usa los prompts rápidos para obtener análisis de OEE, paradas, scrap o mantenimiento de equipos específicos.`
}

const probColor = (p: number) => p >= 70 ? '#EF4444' : p >= 40 ? '#EAB308' : '#32AC5C'
const sevColor = (s: string) => ({ CRITICA: '#EF4444', ALTA: '#F97316', MEDIA: '#EAB308' }[s] ?? '#9CA3AF')
const estadoAnoColor = (e: string) => ({ ACTIVA: '#EF4444', INVESTIGANDO: '#F59E0B', RESUELTA: '#32AC5C' }[e] ?? '#9CA3AF')

// ─── Component ────────────────────────────────────────────────────────────────
export default function MESIA() {
  const [tab, setTab] = useState(0)
  const [otGeneradas, setOtGeneradas] = useState<number[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: 'bot', text: '¡Hola! Soy el Asistente IA de Manufactura. Puedo ayudarte con análisis de OEE, predicción de paradas, optimización de scrap y recomendaciones de mantenimiento. ¿En qué puedo ayudarte hoy?', ts: new Date() },
    { role: 'user', text: '¿Cuál es el OEE hoy?', ts: new Date(Date.now() - 120000) },
    { role: 'bot', text: BOT_RESPONSES_MES.oee, ts: new Date(Date.now() - 119000) },
  ])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  const sendMsg = (text: string) => {
    if (!text.trim()) return
    setChatMsgs(prev => [...prev, { role: 'user', text: text.trim(), ts: new Date() }])
    setChatInput('')
    setTimeout(() => {
      setChatMsgs(prev => [...prev, { role: 'bot', text: getBotReplyMES(text.trim()), ts: new Date() }])
    }, 650)
  }

  const tabSx = {
    '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 },
    '& .Mui-selected': { color: AI_COLOR },
    '& .MuiTabs-indicator': { backgroundColor: AI_COLOR },
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: DARK_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(AI_COLOR, 0.15), color: AI_COLOR }}>
            <AIIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">MES — Inteligencia Artificial</Typography>
            <Typography variant="body2" color="grey.400">Predicción de paradas, optimización de producción, detección de anomalías</Typography>
          </Box>
          <Box ml="auto">
            <Chip label="● MES-AI Activo" size="small" sx={{ background: alpha(AI_COLOR, 0.15), color: AI_COLOR, fontWeight: 700 }} />
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}>
            {['Predicción Paradas', 'Optimización', 'Anomalías', 'Asistente'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: Predicción de Paradas ─────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            {/* KPIs */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Exactitud del modelo', value: '94.2%', color: AI_COLOR, icon: <AIIcon /> },
                { label: 'Fallas evitadas este mes', value: '8', color: '#32AC5C', icon: <CheckIcon /> },
                { label: 'Ahorro estimado', value: '$142M COP', color: '#10B981', icon: <TrendIcon /> },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 4 }}>
                  <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.color, 0.12), color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Cards de equipos */}
            <Grid container spacing={2}>
              {EQUIPOS_PREDICCION.map(eq => {
                const color = probColor(eq.probabilidadFalla)
                const otCreada = otGeneradas.includes(eq.id)
                const esUrgente = eq.probabilidadFalla >= 70
                return (
                  <Grid key={eq.id} size={{ xs: 12, md: 6 }}>
                    <Card sx={{ background: CARD_BG, border: `2px solid ${alpha(color, esUrgente ? 0.6 : 0.3)}`, ...(esUrgente ? { boxShadow: `0 0 16px ${alpha(color, 0.25)}` } : {}) }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="h6" fontWeight={700} color="white">{eq.equipo}</Typography>
                              {esUrgente && (
                                <Chip label="INTERVENIR YA" size="small" sx={{ background: alpha('#EF4444', 0.2), color: '#EF4444', fontWeight: 800, fontSize: 9, animation: 'pulse 1.5s infinite' }} />
                              )}
                            </Stack>
                            <Typography variant="caption" color={MES_COLOR}>{eq.linea}</Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="h4" fontWeight={800} color={color} lineHeight={1}>{eq.probabilidadFalla}%</Typography>
                            <Typography variant="caption" color="grey.500">prob. falla</Typography>
                          </Box>
                        </Stack>

                        <Box mb={1.5}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="grey.500">Riesgo de parada</Typography>
                            <Typography variant="caption" color={color} fontWeight={700}>{eq.probabilidadFalla}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={eq.probabilidadFalla}
                            sx={{ height: 10, borderRadius: 5, backgroundColor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 5 } }} />
                        </Box>

                        <Stack spacing={0.5} mb={1.5}>
                          <Typography variant="caption" color="grey.400">
                            ⏱ Tiempo hasta falla: <span style={{ color, fontWeight: 700 }}>{eq.tiempoRestante}</span>
                          </Typography>
                          <Typography variant="caption" color="grey.400">
                            🔍 IA detectó: <span style={{ color: '#e5e7eb' }}>{eq.causaRaiz}</span>
                          </Typography>
                          <Typography variant="caption" color="grey.500">
                            📡 Última lectura: {eq.ultimaLectura}
                          </Typography>
                        </Stack>

                        <Button
                          fullWidth size="small" variant={otCreada ? 'outlined' : 'contained'}
                          startIcon={<BuildIcon />}
                          onClick={() => setOtGeneradas(prev => [...prev, eq.id])}
                          disabled={otCreada}
                          sx={{
                            textTransform: 'none', fontWeight: 700,
                            background: otCreada ? 'transparent' : alpha(MES_COLOR, 0.15),
                            borderColor: otCreada ? 'grey.700' : MES_COLOR,
                            color: otCreada ? 'grey.600' : MES_COLOR,
                            '&:hover': { background: alpha(MES_COLOR, 0.25) },
                            '&.Mui-disabled': { color: 'grey.600', borderColor: alpha('#fff', 0.1) },
                          }}
                        >
                          {otCreada ? '✓ OT Preventiva Generada' : 'Generar OT Preventiva'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}

        {/* ── Tab 1: Optimización de Producción ───────────────────────────── */}
        {tab === 1 && (
          <Box>
            {/* KPIs IA */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Throughput optimizado', value: '+12%', color: '#32AC5C', icon: <TrendIcon /> },
                { label: 'OEE proyectado', value: '91.2%', color: AI_COLOR, icon: <SpeedIcon /> },
                { label: 'Reducción setup time', value: '-18%', color: '#10B981', icon: <TuneIcon /> },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, md: 4 }}>
                  <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.color, 0.12), color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color={k.color}>{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Secuenciación óptima */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <AIIcon sx={{ color: AI_COLOR, fontSize: 18 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="white">Secuenciación Óptima IA</Typography>
                      <Chip label="Ganancia: 18% tiempo" size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontWeight: 600, fontSize: 10 }} />
                    </Stack>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                            <TableCell>OP</TableCell>
                            <TableCell>Antes</TableCell>
                            <TableCell>Optimizado</TableCell>
                            <TableCell align="right">Ahorro</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {SECUENCIACION.map((s, i) => (
                            <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` } }}>
                              <TableCell>
                                <Typography variant="caption" color={MES_COLOR} fontFamily="monospace" fontWeight={700}>{s.op}</Typography>
                                <Typography variant="caption" color="grey.500" display="block">{s.producto.substring(0, 12)}…</Typography>
                              </TableCell>
                              <TableCell><Typography variant="caption" color="grey.500" sx={{ textDecoration: 'line-through' }}>{s.antes}</Typography></TableCell>
                              <TableCell><Typography variant="caption" color="#32AC5C" fontWeight={600}>{s.despues}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="caption" color="#32AC5C" fontWeight={700}>-{s.ganancia} min</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Temperatura óptima para reducción scrap */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <TuneIcon sx={{ color: AI_COLOR, fontSize: 18 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="white">Temperatura Óptima → Reducción Scrap</Typography>
                    </Stack>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                            <TableCell>Producto</TableCell>
                            <TableCell align="center">Temp. Actual</TableCell>
                            <TableCell align="center">Temp. Óptima</TableCell>
                            <TableCell align="center">Scrap Act.</TableCell>
                            <TableCell align="center">Scrap Proy.</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {SCRAP_OPTIMO.map((s, i) => (
                            <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` } }}>
                              <TableCell><Typography variant="caption">{s.producto.substring(0, 14)}…</Typography></TableCell>
                              <TableCell align="center"><Typography variant="body2" color={s.tempActual > s.tempOptima ? '#EF4444' : 'grey.300'}>{s.tempActual}°C</Typography></TableCell>
                              <TableCell align="center"><Typography variant="body2" color="#32AC5C" fontWeight={700}>{s.tempOptima}°C</Typography></TableCell>
                              <TableCell align="center"><Typography variant="body2" color={s.scrapActual > 4 ? '#EF4444' : '#EAB308'}>{s.scrapActual}%</Typography></TableCell>
                              <TableCell align="center">
                                {s.scrapProyectado < s.scrapActual
                                  ? <Chip label={`${s.scrapProyectado}%`} size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontWeight: 700, fontSize: 10 }} />
                                  : <Typography variant="body2" color="grey.400">{s.scrapProyectado}%</Typography>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cuellos de botella */}
              <Grid size={{ xs: 12 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#EAB308', 0.3)}` }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <WarnIcon sx={{ color: '#EAB308', fontSize: 18 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="white">Cuellos de Botella Detectados</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      {[
                        { linea: 'Línea B — EQ-003', problema: 'Capacidad reducida al 76% por temperatura zona 3 alta. Velocidad tornillo limitada para evitar degradación.', accion: 'Reducir velocidad extrusión 15% hasta mantenimiento nocturno. Monitoreo cada 20 min.', impacto: '-24% throughput Línea B' },
                        { linea: 'Línea A — Robot EQ-007', problema: 'Tiempo de ciclo robot +8% por corriente eje J4 elevada. Genera cola antes de empaque.', accion: 'Ajustar trayectoria J4 para reducir esfuerzo. Inspección urgente programada para 14:00.', impacto: '+4.2 min buffer promedio' },
                      ].map((cb, i) => (
                        <Grid key={i} size={{ xs: 12, md: 6 }}>
                          <Box sx={{ p: 2, borderRadius: 2, background: alpha('#EAB308', 0.05), border: `1px solid ${alpha('#EAB308', 0.25)}` }}>
                            <Typography variant="body2" fontWeight={700} color="#EAB308" mb={0.5}>{cb.linea}</Typography>
                            <Typography variant="caption" color="grey.300" display="block" mb={0.5}>{cb.problema}</Typography>
                            <Divider sx={{ borderColor: alpha('#fff', 0.07), my: 0.75 }} />
                            <Typography variant="caption" color="#32AC5C" display="block">↗ Acción: {cb.accion}</Typography>
                            <Chip label={cb.impacto} size="small" sx={{ mt: 0.75, background: alpha('#EF4444', 0.12), color: '#EF4444', fontSize: 9 }} />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 2: Anomalías ─────────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <BugIcon sx={{ color: AI_COLOR }} />
                <Typography variant="h6" color="white" fontWeight={700}>Anomalías Detectadas — IA</Typography>
                <Chip label="Tiempo Real" size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontWeight: 600 }} />
              </Stack>
              <Stack direction="row" spacing={1}>
                {['CRITICA', 'ALTA', 'MEDIA'].map(s => (
                  <Chip key={s} label={`${s} ${ANOMALIAS.filter(a => a.severidad === s).length}`} size="small"
                    sx={{ background: alpha(sevColor(s), 0.15), color: sevColor(s), fontWeight: 600, fontSize: 10 }} />
                ))}
              </Stack>
            </Stack>

            <Grid container spacing={3}>
              {/* Timeline vertical */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" fontWeight={600} mb={2}>Timeline del día</Typography>
                    <Box sx={{ position: 'relative', pl: 3 }}>
                      {/* Línea vertical CSS */}
                      <Box sx={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, background: alpha('#fff', 0.1), borderRadius: 1 }} />
                      <Stack spacing={2.5}>
                        {ANOMALIAS.map((a) => {
                          const sc = sevColor(a.severidad)
                          const ec = estadoAnoColor(a.estado)
                          return (
                            <Box key={a.id} sx={{ position: 'relative' }}>
                              {/* Punto en la línea */}
                              <Box sx={{ position: 'absolute', left: -19, top: 4, width: 10, height: 10, borderRadius: '50%', background: sc, boxShadow: `0 0 6px ${alpha(sc, 0.6)}` }} />
                              <Box>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                                  <Typography variant="caption" color={sc} fontWeight={700}>{a.hora}</Typography>
                                  <Chip label={a.severidad} size="small" sx={{ background: alpha(sc, 0.12), color: sc, fontSize: 8, height: 16 }} />
                                </Stack>
                                <Typography variant="caption" color="grey.200" fontWeight={600} display="block">{a.equipo}</Typography>
                                <Typography variant="caption" color="grey.500" sx={{ lineHeight: 1.3, display: 'block' }}>{a.descripcion.substring(0, 55)}…</Typography>
                                <Chip label={a.estado} size="small" sx={{ mt: 0.5, background: alpha(ec, 0.12), color: ec, fontSize: 8, height: 16 }} />
                              </Box>
                            </Box>
                          )
                        })}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Tabla anomalías */}
              <Grid size={{ xs: 12, md: 8 }}>
                <TableContainer component={Paper} sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                        <TableCell>Hora</TableCell>
                        <TableCell>Equipo / Línea</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="center">Severidad</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell>Resolución</TableCell>
                        <TableCell>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ANOMALIAS.map(a => (
                        <TableRow key={a.id} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}`, verticalAlign: 'top', py: 1.2 }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                          <TableCell><Typography variant="body2" color={sevColor(a.severidad)} fontWeight={700}>{a.hora}</Typography></TableCell>
                          <TableCell><Typography variant="body2" fontWeight={600}>{a.equipo}</Typography></TableCell>
                          <TableCell><Typography variant="caption" color="grey.300" sx={{ maxWidth: 200, display: 'block' }}>{a.descripcion}</Typography></TableCell>
                          <TableCell align="center">
                            <Chip label={a.severidad} size="small" sx={{ background: alpha(sevColor(a.severidad), 0.15), color: sevColor(a.severidad), fontWeight: 700, fontSize: 9 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={a.estado} size="small" sx={{ background: alpha(estadoAnoColor(a.estado), 0.15), color: estadoAnoColor(a.estado), fontSize: 9 }} />
                          </TableCell>
                          <TableCell><Typography variant="caption" color="grey.400">{a.tiempoResolucion}</Typography></TableCell>
                          <TableCell><Typography variant="caption" color="grey.400">{a.accion}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Tab 3: Asistente IA ──────────────────────────────────────────── */}
        {tab === 3 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(AI_COLOR, 0.3)}`, height: 540, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ pb: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <BotIcon sx={{ color: AI_COLOR }} />
                    <Typography variant="subtitle1" fontWeight={700} color="white">Asistente IA Manufactura</Typography>
                    <Chip label="Online" size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontSize: 10 }} />
                    <Box ml="auto">
                      <Typography variant="caption" color="grey.500">MES-AI v2.1 — GPT-4o Fine-tuned Manufactura</Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 1 }} />

                {/* Mensajes */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
                  {chatMsgs.map((m, i) => (
                    <Stack key={i} direction="row" spacing={1} mb={2} justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'} alignItems="flex-start">
                      {m.role === 'bot' && (
                        <Avatar sx={{ width: 28, height: 28, background: alpha(AI_COLOR, 0.2) }}>
                          <BotIcon sx={{ fontSize: 16, color: AI_COLOR }} />
                        </Avatar>
                      )}
                      <Box sx={{ maxWidth: '82%', p: 1.5, borderRadius: 2, background: m.role === 'user' ? alpha(MES_COLOR, 0.15) : alpha(AI_COLOR, 0.1), border: `1px solid ${m.role === 'user' ? alpha(MES_COLOR, 0.3) : alpha(AI_COLOR, 0.2)}` }}>
                        <Typography variant="body2" color="grey.100" sx={{ whiteSpace: 'pre-line' }}>{m.text}</Typography>
                        <Typography variant="caption" color="grey.600" display="block" mt={0.5}>{m.ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Typography>
                      </Box>
                      {m.role === 'user' && (
                        <Avatar sx={{ width: 28, height: 28, background: alpha(MES_COLOR, 0.2) }}>
                          <PersonIcon sx={{ fontSize: 16, color: MES_COLOR }} />
                        </Avatar>
                      )}
                    </Stack>
                  ))}
                  <div ref={chatEndRef} />
                </Box>

                <Divider sx={{ borderColor: alpha('#fff', 0.08) }} />
                <Box sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth size="small" placeholder="Consulta sobre producción, equipos, OEE, scrap…" value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput) } }}
                      sx={{ '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.05), '& fieldset': { borderColor: alpha('#fff', 0.15) }, '&:hover fieldset': { borderColor: AI_COLOR }, color: 'white', fontSize: 14 } }}
                    />
                    <IconButton onClick={() => sendMsg(chatInput)} sx={{ background: alpha(AI_COLOR, 0.15), color: AI_COLOR, '&:hover': { background: alpha(AI_COLOR, 0.25) } }}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                <CardContent>
                  <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Consultas Rápidas</Typography>
                  <Stack spacing={1} mb={3}>
                    {QUICK_PROMPTS_MES.map((q, i) => (
                      <Button key={i} fullWidth variant="outlined" size="small" onClick={() => sendMsg(q)}
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', borderColor: alpha(AI_COLOR, 0.3), color: 'grey.300', fontSize: 12, py: 1, px: 1.5, '&:hover': { borderColor: AI_COLOR, color: 'white', background: alpha(AI_COLOR, 0.1) } }}>
                        {q}
                      </Button>
                    ))}
                  </Stack>
                  <Divider sx={{ borderColor: alpha('#fff', 0.08), mb: 2 }} />
                  <Typography variant="subtitle2" color="grey.400" mb={1.5} fontWeight={600}>Capacidades MES-AI v2.1</Typography>
                  {[
                    'Análisis OEE en tiempo real',
                    'Predicción de paradas por ML',
                    'Optimización de secuenciación',
                    'Detección de anomalías IoT',
                    'Recomendaciones de parámetros',
                    'Análisis causa raíz automático',
                  ].map((c, i) => (
                    <Stack key={i} direction="row" spacing={0.5} alignItems="center" mb={0.75}>
                      <CheckIcon sx={{ fontSize: 12, color: AI_COLOR }} />
                      <Typography variant="caption" color="grey.400">{c}</Typography>
                    </Stack>
                  ))}
                  <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />
                  <Box sx={{ p: 1.5, borderRadius: 1.5, background: alpha(AI_COLOR, 0.06), border: `1px solid ${alpha(AI_COLOR, 0.2)}` }}>
                    <Typography variant="caption" color={AI_COLOR} fontWeight={700} display="block">Modelo activo</Typography>
                    <Typography variant="caption" color="grey.400">MES-AI v2.1</Typography>
                    <Typography variant="caption" color="grey.500" display="block">GPT-4o Fine-tuned Manufactura</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
