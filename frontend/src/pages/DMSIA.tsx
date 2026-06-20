import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Paper,
  alpha,
  Grid,
  Avatar,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material'
import {
  AutoAwesome,
  Upload,
  Psychology,
  DocumentScanner,
  Warning,
  Send,
  SmartToy,
  Person,
  Circle,
  ContentPaste,
  CheckCircle,
  Schedule,
  DriveFileRenameOutline,
  Bolt,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
}

interface AlertaIA {
  tipo: 'warning' | 'info' | 'urgent'
  mensaje: string
  documento: string
  diasRestantes?: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALERTAS_IA: AlertaIA[] = [
  {
    tipo: 'urgent',
    mensaje: 'Licencia de conducción del conductor Juan García vence en 7 días',
    documento: 'Licencia B2 — Juan García Vargas',
    diasRestantes: 7,
  },
  {
    tipo: 'warning',
    mensaje: 'El contrato con Almacenes Éxito S.A.S. requiere renovación',
    documento: 'Contrato Marco Servicios 2024 — Almacenes Éxito',
    diasRestantes: 21,
  },
  {
    tipo: 'warning',
    mensaje: 'SOAT del camión placa ZXC-441 vence el 30 de junio de 2026',
    documento: 'SOAT 2025 — Camión Kenworth TT-984',
    diasRestantes: 10,
  },
  {
    tipo: 'info',
    mensaje: 'RTM de 3 vehículos requiere renovación en los próximos 30 días',
    documento: 'RTM — Placas TYU-882, BNM-334, OPQ-771',
    diasRestantes: 28,
  },
  {
    tipo: 'info',
    mensaje: 'Certificado BASC requiere auditoría de seguimiento programada',
    documento: 'Certificado BASC 2026 — ICOLTRANS',
    diasRestantes: 45,
  },
]

const CLASIFICACION_MOCK = {
  tipo: 'Contrato',
  categoria: 'Contratos Comerciales',
  area: 'Jurídico / Comercial',
  confianza: 94,
  etiquetas: ['contrato', 'comercial', 'logística', 'cliente', '2026', 'vigente'],
}

const EXTRACCION_MOCK = [
  { campo: 'Fecha del documento', valor: '15 de junio de 2026' },
  { campo: 'Número de contrato', valor: 'CC-2026-00441' },
  { campo: 'Cliente', valor: 'Almacenes Éxito S.A.S. — NIT 860.502.609-0' },
  { campo: 'Valor total', valor: '$ 480.000.000 COP (Cuatrocientos ochenta millones)' },
  { campo: 'Vigencia', valor: '15 junio 2026 — 14 junio 2027 (12 meses)' },
  { campo: 'Firmante empresa', valor: 'Carlos Andrés Betancourt — Gerente General' },
  { campo: 'Firmante cliente', valor: 'Mónica Salcedo — Directora Logística' },
  { campo: 'Ciudad', valor: 'Bogotá D.C., Colombia' },
]

const MENSAJES_INICIALES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: '¿Qué contratos vigentes hay con Almacenes Éxito?',
    timestamp: '09:14',
  },
  {
    id: '2',
    role: 'ai',
    content:
      'Encontré 3 contratos vigentes con Almacenes Éxito S.A.S.:\n\n1. **CC-2026-00441** — Contrato Marco de Servicios Logísticos (vigente hasta jun/2027) — valor: $480M COP\n2. **CC-2025-00122** — Acuerdo de Nivel de Servicio (vigente hasta dic/2026) — valor: $120M COP\n3. **CC-2025-00089** — Contrato de Almacenamiento CEDI (vigente hasta mar/2027) — valor: $95M COP\n\nTodos tienen firmas electrónicas válidas y están en estado PUBLICADO.',
    timestamp: '09:14',
  },
  {
    id: '3',
    role: 'user',
    content: '¿Qué licencias de conductores vencen este mes?',
    timestamp: '09:16',
  },
  {
    id: '4',
    role: 'ai',
    content:
      'Este mes vencen las licencias de conducción de:\n\n• **Juan García Vargas** — Licencia B2 — vence el 27 jun/2026 ⚠️ (7 días)\n• **Pedro Rodríguez Cifuentes** — Licencia C2 — vence el 28 jun/2026 ⚠️ (8 días)\n• **Carlos Moreno Díaz** — Licencia B3 — venció el 10 jun/2026 🔴 VENCIDA\n\nRecomendación: suspender asignaciones a Carlos Moreno hasta renovación. Notificación enviada a RRHH.',
    timestamp: '09:16',
  },
]

const IA_RESPONSES = [
  'Procesando su consulta... He encontrado 5 documentos relacionados con ese criterio en el DMS. ¿Desea que los liste o prefiere que filtre por área específica?',
  'Con base en los metadatos del documento, el área responsable es Operaciones y el estado actual es En revisión. La versión más reciente es la v2.1 publicada el 15 de junio de 2026.',
  'He analizado los documentos del módulo HCM. Existen 12 expedientes con documentación incompleta. Los más críticos son los contratos de conductores clase C2.',
  'El documento que busca es el "Procedimiento de Emergencias SST-023 v3.0". Fue aprobado por Gerencia SST el 01/06/2026 y está disponible para descarga. ¿Se lo adjunto?',
  'Según el log de auditoría, ese documento fue modificado por Ana Torres el 18/06/2026 a las 10:32 AM. El cambio fue en la sección de vigencia del contrato.',
]

// ─── Subcomponents ────────────────────────────────────────────────────────────

function AlertaItem({ alerta }: { alerta: AlertaIA }) {
  const colorMap = { urgent: '#dc2626', warning: '#d97706', info: DMS_COLOR }
  const color = colorMap[alerta.tipo]
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(color, 0.07), borderLeft: `3px solid ${color}`, mb: 1 }}>
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Warning sx={{ color, fontSize: 16, mt: 0.2 }} />
        <Box>
          <Typography variant="caption" fontWeight={600} color={color} display="block">
            {alerta.diasRestantes !== undefined && alerta.diasRestantes <= 10
              ? `⚠️ ${alerta.diasRestantes} días restantes`
              : alerta.diasRestantes !== undefined
              ? `${alerta.diasRestantes} días restantes`
              : 'Acción requerida'}
          </Typography>
          <Typography variant="caption" display="block" color="text.primary">
            {alerta.mensaje}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {alerta.documento}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '88%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <Avatar
          sx={{
            width: 30,
            height: 30,
            bgcolor: isUser ? alpha(DMS_COLOR, 0.15) : DMS_COLOR,
            color: isUser ? DMS_COLOR : '#fff',
            flexShrink: 0,
          }}
        >
          {isUser ? <Person sx={{ fontSize: 16 }} /> : <SmartToy sx={{ fontSize: 16 }} />}
        </Avatar>
        <Box>
          <Paper
            sx={{
              p: 1.5,
              bgcolor: isUser ? alpha(DMS_COLOR, 0.1) : '#f8fafc',
              borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              border: `1px solid ${isUser ? alpha(DMS_COLOR, 0.2) : '#e2e8f0'}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-line', display: 'block' }}
            >
              {msg.content}
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', px: 0.5 }}>
            {msg.timestamp}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMSIA() {
  const [fileDropped, setFileDropped] = useState(false)
  const [classified, setClassified] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [extracted, setExtracted] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(MENSAJES_INICIALES)
  const [inputMsg, setInputMsg] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAnalizar = () => {
    if (!fileDropped) return
    setClassifying(true)
    setTimeout(() => {
      setClassifying(false)
      setClassified(true)
    }, 1500)
  }

  const handleExtraer = () => {
    setExtracting(true)
    setTimeout(() => {
      setExtracting(false)
      setExtracted(true)
    }, 1800)
  }

  const handleSendMessage = () => {
    if (!inputMsg.trim()) return
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMsg,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInputMsg('')
    setSending(true)
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: IA_RESPONSES[Math.floor(Math.random() * IA_RESPONSES.length)],
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, aiMsg])
      setSending(false)
    }, 1000)
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <AutoAwesome sx={{ color: DMS_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Inteligencia Artificial Documental</Typography>
            <Typography variant="body2" color="text.secondary">
              Clasificación automática, extracción de datos OCR y asistente conversacional impulsado por IA
            </Typography>
          </Box>
          <Chip label="⚡ IA Activa" size="small" sx={{ ml: 'auto', bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700 }} />
        </Stack>

        <Grid container spacing={3}>
          {/* Left column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack gap={3}>
              {/* Clasificación automática */}
              <Card sx={{ borderRadius: 2, borderTop: `3px solid ${DMS_COLOR}` }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={2}>
                    <Psychology sx={{ color: DMS_COLOR }} />
                    <Typography variant="subtitle1" fontWeight={700}>Clasificación Automática</Typography>
                    <Chip label="⚡ IA" size="small" sx={{ ml: 'auto', bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontSize: '0.65rem', fontWeight: 700 }} />
                  </Stack>

                  {/* Dropzone */}
                  <Box
                    onClick={() => setFileDropped(true)}
                    sx={{
                      border: `2px dashed ${fileDropped ? DMS_COLOR : '#cbd5e1'}`,
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      bgcolor: fileDropped ? alpha(DMS_COLOR, 0.04) : 'grey.50',
                      transition: 'all 0.2s',
                      mb: 2,
                      '&:hover': { borderColor: DMS_COLOR, bgcolor: alpha(DMS_COLOR, 0.04) },
                    }}
                  >
                    {fileDropped ? (
                      <Stack alignItems="center" gap={1}>
                        <CheckCircle sx={{ color: DMS_COLOR, fontSize: 36 }} />
                        <Typography variant="body2" fontWeight={600} color={DMS_COLOR}>
                          contrato_exito_2026.pdf (2.4 MB)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Haga clic para cambiar el archivo</Typography>
                      </Stack>
                    ) : (
                      <Stack alignItems="center" gap={1}>
                        <Upload sx={{ fontSize: 36, color: 'text.disabled' }} />
                        <Typography variant="body2" fontWeight={600}>Haga clic para seleccionar un documento</Typography>
                        <Typography variant="caption" color="text.secondary">PDF, DOCX, JPG, PNG — máx. 50 MB</Typography>
                      </Stack>
                    )}
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={classifying ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                    onClick={handleAnalizar}
                    disabled={!fileDropped || classifying || classified}
                    sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: alpha(DMS_COLOR, 0.85) }, mb: 2 }}
                  >
                    {classifying ? 'Analizando con IA...' : classified ? 'Análisis completado' : 'Analizar con IA'}
                  </Button>

                  {classified && (
                    <Box sx={{ p: 2, bgcolor: alpha(DMS_COLOR, 0.05), borderRadius: 2, border: `1px solid ${alpha(DMS_COLOR, 0.2)}` }}>
                      <Typography variant="caption" fontWeight={700} color={DMS_COLOR} display="block" mb={1.5}>
                        RESULTADO DEL ANÁLISIS IA
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Tipo detectado</Typography>
                          <Typography variant="body2" fontWeight={700}>{CLASIFICACION_MOCK.tipo}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Categoría sugerida</Typography>
                          <Typography variant="body2" fontWeight={700}>{CLASIFICACION_MOCK.categoria}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Área responsable</Typography>
                          <Typography variant="body2" fontWeight={700}>{CLASIFICACION_MOCK.area}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Confianza IA</Typography>
                          <Typography variant="body2" fontWeight={700} color="#16a34a">
                            {CLASIFICACION_MOCK.confianza}%
                          </Typography>
                        </Grid>
                      </Grid>
                      <Box mt={1.5}>
                        <Typography variant="caption" color="text.secondary">Etiquetas sugeridas</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                          {CLASIFICACION_MOCK.etiquetas.map(tag => (
                            <Chip key={tag} label={tag} size="small" sx={{ bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontSize: '0.65rem' }} />
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* OCR + IA extracción */}
              <Card sx={{ borderRadius: 2, borderTop: '3px solid #7c3aed' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={2}>
                    <DocumentScanner sx={{ color: '#7c3aed' }} />
                    <Typography variant="subtitle1" fontWeight={700}>Extracción de Datos (OCR + IA)</Typography>
                  </Stack>

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    placeholder="Pegue el texto del documento o seleccione un archivo para extracción OCR..."
                    value={ocrText}
                    onChange={e => setOcrText(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <ContentPaste sx={{ color: 'text.disabled', fontSize: 18, mr: 1, alignSelf: 'flex-start', mt: 1 }} />
                      ),
                    }}
                  />

                  <Stack direction="row" gap={1} mb={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Upload />}
                      onClick={() => setOcrText('Documento de muestra cargado para extracción OCR...')}
                      sx={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                    >
                      Subir imagen/PDF
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={extracting ? <CircularProgress size={14} color="inherit" /> : <Bolt />}
                      onClick={handleExtraer}
                      disabled={extracting || extracted}
                      sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                    >
                      {extracting ? 'Extrayendo...' : extracted ? 'Extracción lista' : 'Extraer datos IA'}
                    </Button>
                  </Stack>

                  {extracted && (
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="#7c3aed" display="block" mb={1}>
                        DATOS EXTRAÍDOS
                      </Typography>
                      <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ '& td': { py: 0.75, fontSize: '0.78rem' } }}>
                          <TableBody>
                            {EXTRACCION_MOCK.map((row, i) => (
                              <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#7c3aed', 0.04) } }}>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '35%' }}>{row.campo}</TableCell>
                                <TableCell>{row.valor}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{ mt: 2, borderColor: '#7c3aed', color: '#7c3aed' }}
                        startIcon={<DriveFileRenameOutline />}
                        onClick={() => alert('Metadatos aplicados al documento exitosamente.')}
                      >
                        Aplicar metadatos al documento
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Alertas IA */}
              <Card sx={{ borderRadius: 2, borderTop: '3px solid #d97706' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={2}>
                    <Warning sx={{ color: '#d97706' }} />
                    <Typography variant="subtitle1" fontWeight={700}>Alertas IA</Typography>
                    <Chip
                      label={`${ALERTAS_IA.length} alertas`}
                      size="small"
                      sx={{ ml: 'auto', bgcolor: alpha('#d97706', 0.1), color: '#d97706', fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </Stack>
                  {ALERTAS_IA.map((alerta, i) => (
                    <AlertaItem key={i} alerta={alerta} />
                  ))}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Right column — Chat */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 680 }}>
              {/* Chat header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: alpha(DMS_COLOR, 0.05),
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Avatar sx={{ bgcolor: DMS_COLOR, width: 36, height: 36 }}>
                    <SmartToy fontSize="small" />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={700}>Asistente DMS IA</Typography>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Circle sx={{ fontSize: 8, color: '#16a34a' }} />
                      <Typography variant="caption" color="#16a34a" fontWeight={600}>En línea</Typography>
                    </Stack>
                  </Box>
                  <Chip label="GPT-4 powered" size="small" sx={{ fontSize: '0.6rem', bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR }} />
                </Stack>
              </Box>

              {/* Messages area */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, maxHeight: 480 }}>
                {messages.map(msg => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}
                {sending && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                    <Avatar sx={{ bgcolor: DMS_COLOR, width: 30, height: 30 }}>
                      <SmartToy sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Paper sx={{ p: 1.5, borderRadius: '4px 12px 12px 12px', bgcolor: '#f8fafc' }}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <CircularProgress size={12} sx={{ color: DMS_COLOR }} />
                        <Typography variant="caption" color="text.secondary">Procesando...</Typography>
                      </Stack>
                    </Paper>
                  </Box>
                )}
                <div ref={chatEndRef} />
              </Box>

              {/* Input */}
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" gap={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Pregúntale al asistente sobre documentos..."
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!inputMsg.trim() || sending}
                    sx={{ bgcolor: DMS_COLOR, color: '#fff', borderRadius: 2, '&:hover': { bgcolor: alpha(DMS_COLOR, 0.85) }, '&:disabled': { bgcolor: 'grey.200' } }}
                  >
                    <Send fontSize="small" />
                  </IconButton>
                </Stack>
                <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
                  Las respuestas son simuladas — en producción conectar con modelo IA real
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
