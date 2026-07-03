import React, { useState, useRef, useEffect } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Stack, alpha, Divider, LinearProgress, TextField,
  IconButton, Avatar, List, ListItem, ListItemText, Tooltip,
} from '@mui/material'
import {
  AutoAwesome as AIIcon,
  Warning as WarnIcon,
  Build as BuildIcon,
  TrendingUp as TrendIcon,
  Inventory as StockIcon,
  Timeline as TimelineIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#32AC5C'
const AI_COLOR = '#8B5CF6'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

interface Prediccion {
  id: number
  activo: string
  sistema: string
  probabilidad: number
  diasRestantes: number
  causa: string
  critico: boolean
}

interface VentanaMantenimiento {
  activo: string
  tipo: string
  diaSugerido: string
  turno: string
  impactoSinPM: string
  ahorro: number
}

interface RepuestoCritico {
  codigo: string
  descripcion: string
  cantidadActual: number
  cantidadSugerida: number
  costo: number
  riesgo: 'ALTO' | 'MEDIO' | 'BAJO'
}

interface Anomalia {
  id: number
  activo: string
  tipoAnomalia: string
  valorDetectado: string
  valorNormal: string
  desviacion: number
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  fecha: string
  estado: 'NUEVA' | 'EN_REVISION' | 'RESUELTA'
}

interface ChatMsg {
  role: 'user' | 'bot'
  text: string
  ts: Date
}

const PREDICCIONES: Prediccion[] = [
  { id: 1, activo: 'SRV-01', sistema: 'UPS / Alimentación', probabilidad: 91, diasRestantes: 3, causa: 'Batería degradada — tensión en caída', critico: true },
  { id: 2, activo: 'VH-001', sistema: 'Motor CUMMINS ISX15', probabilidad: 78, diasRestantes: 12, causa: 'Desgaste en laminillas de culata', critico: false },
  { id: 3, activo: 'MC-003', sistema: 'Sistema hidráulico', probabilidad: 65, diasRestantes: 18, causa: 'Contaminación de aceite hidráulico', critico: false },
  { id: 4, activo: 'CMP-07', sistema: 'Compresor KAESER', probabilidad: 54, diasRestantes: 25, causa: 'Vibración anormal — desbalanceo', critico: false },
  { id: 5, activo: 'VH-015', sistema: 'Caja de cambios ZF', probabilidad: 43, diasRestantes: 31, causa: 'Temperatura en 4ta marcha elevada', critico: false },
  { id: 6, activo: 'EV-001', sistema: 'Evaporador cuarto frío', probabilidad: 38, diasRestantes: 45, causa: 'Acumulación progresiva de hielo', critico: false },
]

const VENTANAS: VentanaMantenimiento[] = [
  { activo: 'VH-001 Tracto Kenworth', tipo: 'PM Motor', diaSugerido: 'Martes', turno: 'Nocturno 22:00', impactoSinPM: 'Riesgo falla en ruta Bogotá-Cali', ahorro: 28000000 },
  { activo: 'CMP-07 Compresor', tipo: 'Mantenimiento Predictivo', diaSugerido: 'Sábado', turno: 'Diurno 08:00', impactoSinPM: 'Paro de línea bodega 3', ahorro: 15000000 },
  { activo: 'MC-003 Montacargas', tipo: 'Servicio Hidráulico', diaSugerido: 'Miércoles', turno: 'Nocturno 00:00', impactoSinPM: 'Reducción capacidad carga 40%', ahorro: 9500000 },
  { activo: 'VH-015 Tracto Volvo', tipo: 'PM Transmisión', diaSugerido: 'Viernes', turno: 'Tarde 14:00', impactoSinPM: 'Bloqueo en ruta Barranquilla', ahorro: 22000000 },
  { activo: 'EV-001 Evaporador', tipo: 'Mantenimiento Frío', diaSugerido: 'Domingo', turno: 'Diurno 06:00', impactoSinPM: 'Pérdida cadena frío producto', ahorro: 35000000 },
]

const REPUESTOS_CRITICOS: RepuestoCritico[] = [
  { codigo: 'FIL-001', descripcion: 'Filtro aceite CUMMINS ISX15', cantidadActual: 2, cantidadSugerida: 8, costo: 185000, riesgo: 'ALTO' },
  { codigo: 'BAT-UPS', descripcion: 'Batería AGM 12V 100Ah', cantidadActual: 0, cantidadSugerida: 4, costo: 420000, riesgo: 'ALTO' },
  { codigo: 'SEL-HID', descripcion: 'Sello mecánico sistema hidráulico', cantidadActual: 1, cantidadSugerida: 5, costo: 68000, riesgo: 'MEDIO' },
  { codigo: 'VAL-COM', descripcion: 'Válvula presión compresor KAESER', cantidadActual: 0, cantidadSugerida: 2, costo: 340000, riesgo: 'ALTO' },
  { codigo: 'ACE-HID', descripcion: 'Aceite hidráulico ISO 46 (20L)', cantidadActual: 3, cantidadSugerida: 10, costo: 280000, riesgo: 'MEDIO' },
  { codigo: 'COR-DIV', descripcion: 'Correa distribución VH-015', cantidadActual: 1, cantidadSugerida: 3, costo: 195000, riesgo: 'MEDIO' },
  { codigo: 'FIL-CAB', descripcion: 'Filtro cabina EV-001', cantidadActual: 0, cantidadSugerida: 6, costo: 45000, riesgo: 'BAJO' },
  { codigo: 'TER-MOT', descripcion: 'Termostato motor VH-001', cantidadActual: 0, cantidadSugerida: 2, costo: 125000, riesgo: 'ALTO' },
]

const ANOMALIAS: Anomalia[] = [
  { id: 1, activo: 'VH-001 Motor', tipoAnomalia: 'Temperatura Motor', valorDetectado: '108°C', valorNormal: '90°C', desviacion: 20, severidad: 'CRITICA', fecha: '2025-06-20 06:42', estado: 'NUEVA' },
  { id: 2, activo: 'CMP-07 Compresor', tipoAnomalia: 'Vibración eje', valorDetectado: '8.2 mm/s', valorNormal: '4.5 mm/s', desviacion: 82, severidad: 'ALTA', fecha: '2025-06-20 07:15', estado: 'EN_REVISION' },
  { id: 3, activo: 'MC-003 Montacargas', tipoAnomalia: 'Presión hidráulica', valorDetectado: '180 bar', valorNormal: '210 bar', desviacion: -14, severidad: 'ALTA', fecha: '2025-06-20 08:00', estado: 'NUEVA' },
  { id: 4, activo: 'VH-015 Caja ZF', tipoAnomalia: 'Temperatura aceite', valorDetectado: '125°C', valorNormal: '95°C', desviacion: 32, severidad: 'ALTA', fecha: '2025-06-19 22:30', estado: 'EN_REVISION' },
  { id: 5, activo: 'SRV-01 UPS', tipoAnomalia: 'Tensión batería', valorDetectado: '10.8V', valorNormal: '13.2V', desviacion: -18, severidad: 'CRITICA', fecha: '2025-06-20 05:00', estado: 'NUEVA' },
  { id: 6, activo: 'EV-001 Evaporador', tipoAnomalia: 'Consumo eléctrico', valorDetectado: '18.4A', valorNormal: '12.0A', desviacion: 53, severidad: 'MEDIA', fecha: '2025-06-20 09:10', estado: 'NUEVA' },
  { id: 7, activo: 'VH-003 Motor', tipoAnomalia: 'Presión aceite', valorDetectado: '28 psi', valorNormal: '45 psi', desviacion: -38, severidad: 'ALTA', fecha: '2025-06-19 18:20', estado: 'RESUELTA' },
  { id: 8, activo: 'GRU-02 Grúa', tipoAnomalia: 'Corriente motor', valorDetectado: '42A', valorNormal: '30A', desviacion: 40, severidad: 'MEDIA', fecha: '2025-06-20 10:05', estado: 'EN_REVISION' },
]

const QUICK_PROMPTS = [
  '¿Cuál es el MTBF de la flota?',
  'Dime el estado del motor VH-001',
  '¿Qué activos están en riesgo esta semana?',
  'Resumir anomalías críticas del día',
]

const BOT_RESPONSES: Record<string, string> = {
  mtbf: `📊 **MTBF de la Flota (últimos 6 meses):**\n\n• Flota tracto-camiones: **312 horas** (↑8% vs período anterior)\n• Montacargas: **480 horas** (estable)\n• Compresores: **220 horas** (↓12% — CMP-07 arrastra el promedio)\n• **MTBF global fleet: 337 horas**\n\nEl objetivo corporativo es ≥350 hrs. Acciones recomendadas: priorizar PM de CMP-07 y VH-001.`,
  vh001: `🔧 **Estado actual VH-001 — Tracto Kenworth T680:**\n\n• Kilometraje: 487,320 km\n• Último PM: 15/05/2025 (480,000 km)\n• Próximo PM: 510,000 km (estimado 22/07/2025)\n• **⚠️ Alerta activa:** Temperatura motor 108°C (umbral 95°C)\n• Probabilidad de falla motor: **78% en 12 días**\n• Acción sugerida: Generar OT preventiva urgente — revisión de culata.`,
  riesgo: `⚠️ **Activos en riesgo esta semana:**\n\n1. 🔴 **SRV-01 UPS** — 91% probabilidad falla en 3 días (batería crítica)\n2. 🔴 **VH-001 Motor** — 78% probabilidad falla en 12 días\n3. 🟠 **MC-003 Sistema hidráulico** — 65% probabilidad, 18 días\n4. 🟠 **CMP-07 Compresor** — vibración anormal, seguimiento requerido\n\n💡 Se recomienda generar OTs preventivas para SRV-01 y VH-001 de inmediato.`,
  anomal: `🚨 **Anomalías críticas detectadas hoy (${new Date().toLocaleDateString('es-CO')}):**\n\n• **SRV-01 UPS:** Tensión batería 10.8V (normal 13.2V) — CRÍTICA\n• **VH-001:** Temperatura motor 108°C (normal 90°C) — CRÍTICA\n• **CMP-07:** Vibración eje 8.2 mm/s (normal 4.5 mm/s) — ALTA\n• **MC-003:** Presión hidráulica baja 180 bar (normal 210 bar) — ALTA\n\nTotal anomalías activas: 7 (2 críticas, 4 altas, 1 media).`,
}

const getBotReply = (input: string): string => {
  const lower = input.toLowerCase()
  if (lower.includes('mtbf')) return BOT_RESPONSES.mtbf
  if (lower.includes('vh-001') || lower.includes('vh001')) return BOT_RESPONSES.vh001
  if (lower.includes('riesgo') || lower.includes('semana')) return BOT_RESPONSES.riesgo
  if (lower.includes('anomal') || lower.includes('críti') || lower.includes('criti')) return BOT_RESPONSES.anomal
  return `🤖 Procesando consulta: "${input}"\n\nEsta función de IA está en desarrollo. Por ahora puedes usar los prompts rápidos o consultar directamente los dashboards de predicción y anomalías.`
}

const probColor = (p: number) => p >= 70 ? '#EF4444' : p >= 40 ? '#EAB308' : '#32AC5C'
const sevColor = (s: string) => ({ CRITICA: '#EF4444', ALTA: '#F97316', MEDIA: '#EAB308', BAJA: '#32AC5C' })[s] ?? '#9CA3AF'
const riesgoColor = (r: string) => ({ ALTO: '#EF4444', MEDIO: '#F97316', BAJO: '#32AC5C' })[r] ?? '#9CA3AF'

export default function EAMIA() {
  const [tab, setTab] = useState(0)
  const [otGeneradas, setOtGeneradas] = useState<number[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: 'bot', text: '¡Hola! Soy el Asistente Técnico de ICOLTRANS EAM. Puedo ayudarte con análisis predictivo, estado de activos, anomalías y más. ¿En qué puedo ayudarte?', ts: new Date() },
  ])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  const sendMsg = (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMsg = { role: 'user', text: text.trim(), ts: new Date() }
    setChatMsgs(prev => [...prev, userMsg])
    setChatInput('')
    setTimeout(() => {
      const botMsg: ChatMsg = { role: 'bot', text: getBotReply(text.trim()), ts: new Date() }
      setChatMsgs(prev => [...prev, botMsg])
    }, 600)
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(AI_COLOR, 0.15), color: AI_COLOR }}>
            <AIIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">EAM — Inteligencia Artificial</Typography>
            <Typography variant="body2" color="grey.400">Motor predictivo, detección de anomalías y asistente técnico</Typography>
          </Box>
          <Box ml="auto">
            <Chip label="● IA Activa" size="small" sx={{ background: alpha(AI_COLOR, 0.15), color: AI_COLOR, fontWeight: 700, animation: 'pulse 2s infinite' }} />
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: AI_COLOR }, '& .MuiTabs-indicator': { backgroundColor: AI_COLOR } }}>
            {['Predicción de Fallas', 'Optimización Mantenimiento', 'Anomalías', 'Asistente Técnico'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Predicción de Fallas */}
        {tab === 0 && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
              <AIIcon sx={{ color: AI_COLOR }} />
              <Typography variant="h6" color="white" fontWeight={700}>Motor de Predicción de Fallas</Typography>
              <Chip label="Powered by AI" size="small" sx={{ background: alpha(AI_COLOR, 0.15), color: AI_COLOR, fontWeight: 600 }} />
            </Stack>
            <Grid container spacing={2}>
              {PREDICCIONES.map(p => {
                const color = probColor(p.probabilidad)
                const otCreada = otGeneradas.includes(p.id)
                return (
                  <Grid key={p.id} size={{ xs: 12, md: 6 }}>
                    <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(p.critico ? '#EF4444' : color, 0.4)}`, ...(p.critico ? { boxShadow: `0 0 12px ${alpha('#EF4444', 0.3)}` } : {}) }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="h6" fontWeight={700} color="white">{p.activo}</Typography>
                              {p.critico && <Chip label="CRÍTICO" size="small" sx={{ background: alpha('#EF4444', 0.2), color: '#EF4444', fontWeight: 700, fontSize: 10 }} />}
                            </Stack>
                            <Typography variant="body2" color="grey.400">{p.sistema}</Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="h5" fontWeight={800} color={color}>{p.probabilidad}%</Typography>
                            <Typography variant="caption" color="grey.400">probabilidad</Typography>
                          </Box>
                        </Stack>

                        <Box mb={1.5}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="grey.400">Probabilidad de falla</Typography>
                            <Typography variant="caption" color={color} fontWeight={700}>{p.probabilidad}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={p.probabilidad} sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 4 } }} />
                        </Box>

                        <Stack spacing={0.5} mb={1.5}>
                          <Typography variant="caption" color="grey.400">⏱ Falla estimada: <span style={{ color: color, fontWeight: 700 }}>en {p.diasRestantes} día{p.diasRestantes !== 1 ? 's' : ''}</span></Typography>
                          <Typography variant="caption" color="grey.400">🔍 Causa detectada: <span style={{ color: '#e5e7eb' }}>{p.causa}</span></Typography>
                        </Stack>

                        <Button
                          fullWidth
                          size="small"
                          variant={otCreada ? 'outlined' : 'contained'}
                          startIcon={<BuildIcon />}
                          onClick={() => setOtGeneradas(prev => [...prev, p.id])}
                          disabled={otCreada}
                          sx={{ textTransform: 'none', background: otCreada ? 'transparent' : alpha(EAM_COLOR, 0.15), borderColor: EAM_COLOR, color: otCreada ? 'grey.500' : EAM_COLOR, '&:hover': { background: alpha(EAM_COLOR, 0.25) } }}
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

        {/* Tab 1: Optimización */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={3}>
              {/* KPIs ahorro */}
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Ahorro Proyectado Anual', value: '$348M', icon: <TrendIcon />, color: '#32AC5C' },
                    { label: 'Reducción Correctivas', value: '65%', icon: <BuildIcon />, color: EAM_COLOR },
                    { label: 'Mejora Disponibilidad', value: '+12%', icon: <SpeedIcon />, color: AI_COLOR },
                  ].map((k, i) => (
                    <Grid key={i} size={{ xs: 12, md: 4 }}>
                      <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(k.color, 0.3)}` }}>
                        <CardContent>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ color: k.color }}>{k.icon}</Box>
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
              </Grid>

              {/* Ventanas óptimas */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} color="white" mb={2}>Ventanas de Mantenimiento Óptimas</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                            <TableCell>Activo</TableCell>
                            <TableCell>Tipo PM</TableCell>
                            <TableCell>Día Sugerido</TableCell>
                            <TableCell>Turno</TableCell>
                            <TableCell align="right">Ahorro</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {VENTANAS.map((v, i) => (
                            <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` } }}>
                              <TableCell><Typography variant="body2">{v.activo}</Typography></TableCell>
                              <TableCell><Chip label={v.tipo} size="small" sx={{ background: alpha(AI_COLOR, 0.15), color: AI_COLOR, fontSize: 10 }} /></TableCell>
                              <TableCell><Typography variant="body2" fontWeight={600} color={EAM_COLOR}>{v.diaSugerido}</Typography></TableCell>
                              <TableCell><Typography variant="caption" color="grey.300">{v.turno}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="body2" color="#32AC5C" fontWeight={600}>{fmt(v.ahorro)}</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Repuestos críticos */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <StockIcon sx={{ color: EAM_COLOR, fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="white">Repuestos Críticos a Stockear</Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {REPUESTOS_CRITICOS.map((r, i) => (
                        <Box key={i} sx={{ p: 1, borderRadius: 1, background: alpha('#fff', 0.03), border: `1px solid ${alpha(riesgoColor(r.riesgo), 0.2)}` }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box flex={1}>
                              <Typography variant="caption" color={EAM_COLOR} fontFamily="monospace">{r.codigo}</Typography>
                              <Typography variant="body2" color="grey.200" noWrap sx={{ maxWidth: 160 }} title={r.descripcion}>{r.descripcion}</Typography>
                              <Typography variant="caption" color="grey.400">Stock: {r.cantidadActual} → <span style={{ color: '#32AC5C', fontWeight: 600 }}>{r.cantidadSugerida}</span></Typography>
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.5}>
                              <Chip label={r.riesgo} size="small" sx={{ background: alpha(riesgoColor(r.riesgo), 0.15), color: riesgoColor(r.riesgo), fontSize: 9, fontWeight: 700 }} />
                              <Typography variant="caption" color="grey.400">{fmt(r.costo)}/u</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 2: Anomalías */}
        {tab === 2 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TimelineIcon sx={{ color: AI_COLOR }} />
                <Typography variant="h6" color="white" fontWeight={700}>Detección de Anomalías</Typography>
                <Chip label="Tiempo Real" size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontWeight: 600 }} />
              </Stack>
              <Stack direction="row" spacing={1}>
                {['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map(s => (
                  <Chip key={s} label={`${s} ${ANOMALIAS.filter(a => a.severidad === s).length}`} size="small" sx={{ background: alpha(sevColor(s), 0.15), color: sevColor(s), fontWeight: 600, fontSize: 10 }} />
                ))}
              </Stack>
            </Stack>

            {/* Timeline visual simplificado */}
            <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}`, mb: 2 }}>
              <CardContent>
                <Typography variant="caption" color="grey.400" mb={1} display="block">Timeline de anomalías del día</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {ANOMALIAS.filter(a => a.estado !== 'RESUELTA').map(a => (
                    <Tooltip key={a.id} title={`${a.activo}: ${a.tipoAnomalia}`}>
                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, background: alpha(sevColor(a.severidad), 0.15), border: `1px solid ${alpha(sevColor(a.severidad), 0.4)}`, cursor: 'default' }}>
                        <Typography variant="caption" color={sevColor(a.severidad)} fontWeight={600}>{a.fecha.split(' ')[1]}</Typography>
                        <Typography variant="caption" color="grey.300" display="block">{a.activo.split(' ')[0]}</Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>Activo</TableCell>
                    <TableCell>Tipo Anomalía</TableCell>
                    <TableCell align="center">Detectado</TableCell>
                    <TableCell align="center">Normal</TableCell>
                    <TableCell align="center">Desviación</TableCell>
                    <TableCell align="center">Severidad</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ANOMALIAS.map(a => (
                    <TableRow key={a.id} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{a.activo}</Typography></TableCell>
                      <TableCell>{a.tipoAnomalia}</TableCell>
                      <TableCell align="center"><Typography variant="body2" fontWeight={700} color={sevColor(a.severidad)}>{a.valorDetectado}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" color="grey.400">{a.valorNormal}</Typography></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={700} color={Math.abs(a.desviacion) > 30 ? '#EF4444' : '#EAB308'}>
                          {a.desviacion > 0 ? '+' : ''}{a.desviacion}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={a.severidad} size="small" sx={{ background: alpha(sevColor(a.severidad), 0.15), color: sevColor(a.severidad), fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                      <TableCell><Typography variant="caption" color="grey.400">{a.fecha}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={a.estado.replace('_', ' ')} size="small" sx={{ background: a.estado === 'RESUELTA' ? alpha('#32AC5C', 0.15) : a.estado === 'EN_REVISION' ? alpha('#F59E0B', 0.15) : alpha('#EF4444', 0.15), color: a.estado === 'RESUELTA' ? '#32AC5C' : a.estado === 'EN_REVISION' ? '#F59E0B' : '#EF4444', fontSize: 9 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: Asistente Técnico */}
        {tab === 3 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha(AI_COLOR, 0.3)}`, height: 520, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ pb: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <BotIcon sx={{ color: AI_COLOR }} />
                    <Typography variant="subtitle1" fontWeight={700} color="white">Asistente Técnico EAM</Typography>
                    <Chip label="Online" size="small" sx={{ background: alpha('#32AC5C', 0.15), color: '#32AC5C', fontSize: 10 }} />
                  </Stack>
                </CardContent>
                <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 1 }} />

                {/* Messages */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
                  {chatMsgs.map((m, i) => (
                    <Stack key={i} direction="row" spacing={1} mb={2} justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'} alignItems="flex-start">
                      {m.role === 'bot' && <Avatar sx={{ width: 28, height: 28, background: alpha(AI_COLOR, 0.2) }}><BotIcon sx={{ fontSize: 16, color: AI_COLOR }} /></Avatar>}
                      <Box sx={{ maxWidth: '80%', p: 1.5, borderRadius: 2, background: m.role === 'user' ? alpha(EAM_COLOR, 0.15) : alpha(AI_COLOR, 0.1), border: `1px solid ${m.role === 'user' ? alpha(EAM_COLOR, 0.3) : alpha(AI_COLOR, 0.2)}` }}>
                        <Typography variant="body2" color="grey.100" sx={{ whiteSpace: 'pre-line' }}>{m.text}</Typography>
                        <Typography variant="caption" color="grey.600" display="block" mt={0.5}>{m.ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Typography>
                      </Box>
                      {m.role === 'user' && <Avatar sx={{ width: 28, height: 28, background: alpha(EAM_COLOR, 0.2) }}><PersonIcon sx={{ fontSize: 16, color: EAM_COLOR }} /></Avatar>}
                    </Stack>
                  ))}
                  <div ref={chatEndRef} />
                </Box>

                <Divider sx={{ borderColor: alpha('#fff', 0.08) }} />
                <Box sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth size="small" placeholder="Escribe tu consulta técnica..." value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput) } }}
                      sx={{ '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.05), '& fieldset': { borderColor: alpha('#fff', 0.15) }, '&:hover fieldset': { borderColor: AI_COLOR }, color: 'text.primary', fontSize: 14 } }}
                    />
                    <IconButton onClick={() => sendMsg(chatInput)} sx={{ background: alpha(AI_COLOR, 0.15), color: AI_COLOR, '&:hover': { background: alpha(AI_COLOR, 0.25) } }}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ background: '#FFFFFF', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                <CardContent>
                  <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Consultas Rápidas</Typography>
                  <Stack spacing={1}>
                    {QUICK_PROMPTS.map((q, i) => (
                      <Button key={i} fullWidth variant="outlined" size="small" onClick={() => sendMsg(q)}
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', borderColor: alpha(AI_COLOR, 0.3), color: 'grey.300', fontSize: 12, py: 1, px: 1.5, '&:hover': { borderColor: AI_COLOR, color: 'text.primary', background: alpha(AI_COLOR, 0.1) } }}>
                        {q}
                      </Button>
                    ))}
                  </Stack>
                  <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />
                  <Typography variant="subtitle2" color="grey.400" mb={1.5} fontWeight={600}>Capacidades</Typography>
                  {['Análisis MTBF y confiabilidad', 'Estado de activos en tiempo real', 'Predicción de fallas con ML', 'Optimización de rutas de mantenimiento', 'Análisis costo-beneficio PM vs CM'].map((c, i) => (
                    <Stack key={i} direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                      <CheckIcon sx={{ fontSize: 12, color: AI_COLOR }} />
                      <Typography variant="caption" color="grey.400">{c}</Typography>
                    </Stack>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
