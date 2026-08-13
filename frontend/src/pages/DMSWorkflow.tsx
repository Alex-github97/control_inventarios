import React, { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  Divider,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Badge,
  alpha,
  LinearProgress,
  Paper,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PersonIcon from '@mui/icons-material/Person'
import AssignmentIcon from '@mui/icons-material/Assignment'
import RuleIcon from '@mui/icons-material/Rule'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import EditIcon from '@mui/icons-material/Edit'
import HistoryEduIcon from '@mui/icons-material/HistoryEdu'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Tipos backend ───────────────────────────────────────────────────────────

interface Workflow { id: number; nombre: string; descripcion?: string | null; activo: boolean; dias_limite?: number | null; created_at?: string | null }
interface Paso { id: number; workflow_id: number; nombre: string; tipo: string; orden: number; responsable_rol?: string | null; dias_limite?: number | null }
interface Instancia { id: number; workflow_id: number; documento_id: number; estado: string; iniciado_por_id?: number | null; paso_actual: number; fecha_inicio?: string | null; fecha_limite?: string | null; fecha_fin?: string | null }
interface NewStep { nombre: string; tipo: string; responsable: string; diasLimite: string }
interface PasoVM extends Paso { estado: 'completado' | 'activo' | 'pendiente' }

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtFecha = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const diffDias = (a?: string | null, b?: string | null): number => {
  if (!a || !b) return 0
  const da = new Date(a).getTime(), db = new Date(b).getTime()
  if (isNaN(da) || isNaN(db)) return 0
  return Math.max(0, Math.round((db - da) / 86400000))
}

function getStepColor(tipo: string): string {
  switch (tipo) {
    case 'Revisión': return '#1565C0'
    case 'Aprobación': return '#2E7D32'
    case 'Firma': return '#6A1B9A'
    case 'Notificación': return '#E65100'
    default: return '#546E7A'
  }
}
function getStepIcon(tipo: string) {
  switch (tipo) {
    case 'Revisión': return <RuleIcon sx={{ fontSize: 14 }} />
    case 'Aprobación': return <CheckCircleIcon sx={{ fontSize: 14 }} />
    case 'Firma': return <EditIcon sx={{ fontSize: 14 }} />
    case 'Notificación': return <NotificationsActiveIcon sx={{ fontSize: 14 }} />
    default: return <AssignmentIcon sx={{ fontSize: 14 }} />
  }
}
function getResultColor(resultado: string): 'success' | 'error' | 'warning' {
  switch (resultado) {
    case 'Completado': return 'success'
    case 'Rechazado': return 'error'
    case 'Cancelado': return 'warning'
    default: return 'success'
  }
}
function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'En Proceso': return '#1565C0'
    case 'Pausado': return '#E65100'
    case 'Vencido': return '#B71C1C'
    default: return '#546E7A'
  }
}

const STEP_TYPES = ['Revisión', 'Aprobación', 'Firma', 'Notificación']

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DMSWorkflow() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateTipo, setNewTemplateTipo] = useState('')
  const [newTemplateSteps, setNewTemplateSteps] = useState<NewStep[]>([{ nombre: '', tipo: '', responsable: '', diasLimite: '1' }])
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [detailInstance, setDetailInstance] = useState<Instancia | null>(null)

  const [iniciarOpen, setIniciarOpen] = useState(false)
  const [iniWorkflow, setIniWorkflow] = useState('')
  const [iniDoc, setIniDoc] = useState('')
  const [iniSaving, setIniSaving] = useState(false)

  // ── Queries ──
  const { data: workflows = [], isLoading: loadingWf } = useQuery<Workflow[]>({ queryKey: ['dms-workflows'], queryFn: () => apiClient.get('/dms/workflows').then((r) => r.data) })
  const { data: instancias = [], isLoading: loadingInst } = useQuery<Instancia[]>({ queryKey: ['dms-instancias-all'], queryFn: () => apiClient.get('/dms/instancias').then((r) => r.data) })
  const { data: usuarios = [] } = useQuery<any[]>({ queryKey: ['usuarios-map'], queryFn: () => apiClient.get('/usuarios/').then((r) => r.data) })
  const { data: documentos = [] } = useQuery<any[]>({ queryKey: ['dms-docs-map'], queryFn: () => apiClient.get('/dms/documentos', { params: { per_page: 200 } }).then((r) => r.data) })

  const pasosResults = useQueries({
    queries: workflows.map((w) => ({ queryKey: ['dms-wf-pasos', w.id], queryFn: () => apiClient.get(`/dms/workflows/${w.id}/pasos`).then((r) => r.data as Paso[]) })),
  })
  const pasosMap = useMemo(() => {
    const m = new Map<number, Paso[]>()
    workflows.forEach((w, i) => m.set(w.id, [...((pasosResults[i]?.data as Paso[]) ?? [])].sort((a, b) => a.orden - b.orden)))
    return m
  }, [workflows, pasosResults])

  const userMap = useMemo(() => { const m = new Map<number, string>(); usuarios.forEach((u) => m.set(u.id, `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.username || `Usuario #${u.id}`)); return m }, [usuarios])
  const docMap = useMemo(() => { const m = new Map<number, string>(); documentos.forEach((d) => m.set(d.id, d.nombre)); return m }, [documentos])
  const wfMap = useMemo(() => { const m = new Map<number, Workflow>(); workflows.forEach((w) => m.set(w.id, w)); return m }, [workflows])

  const totalPasosDe = (wfId: number) => (pasosMap.get(wfId) ?? []).length
  const stepsDe = (inst: Instancia): PasoVM[] => (pasosMap.get(inst.workflow_id) ?? []).map((p) => ({ ...p, estado: p.orden < inst.paso_actual ? 'completado' : p.orden === inst.paso_actual ? 'activo' : 'pendiente' }))
  const vencida = (inst: Instancia) => inst.estado === 'EN_CURSO' && !!inst.fecha_limite && new Date(inst.fecha_limite).getTime() < Date.now()

  const activas = instancias.filter((i) => i.estado === 'EN_CURSO')
  const historial = instancias.filter((i) => i.estado === 'COMPLETADO' || i.estado === 'CANCELADO')

  // ── Template dialog handlers ──
  const handleAddStep = () => setNewTemplateSteps((prev) => [...prev, { nombre: '', tipo: '', responsable: '', diasLimite: '1' }])
  const handleRemoveStep = (idx: number) => setNewTemplateSteps((prev) => prev.filter((_, i) => i !== idx))
  const handleStepChange = (idx: number, field: keyof NewStep, value: string) => setNewTemplateSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))
  const resetTemplate = () => { setNewTemplateName(''); setNewTemplateTipo(''); setNewTemplateSteps([{ nombre: '', tipo: '', responsable: '', diasLimite: '1' }]) }

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) { toast.error('Nombre requerido'); return }
    setSavingTemplate(true)
    try {
      const wf = (await apiClient.post('/dms/workflows', { nombre: newTemplateName.trim(), descripcion: newTemplateTipo ? `Tipo documental: ${newTemplateTipo}` : undefined, activo: true })).data
      const pasos = newTemplateSteps.filter((s) => s.nombre.trim())
      for (let i = 0; i < pasos.length; i++) {
        const s = pasos[i]
        await apiClient.post('/dms/workflows/pasos', { workflow_id: wf.id, nombre: s.nombre.trim(), tipo: s.tipo || 'Revisión', orden: i + 1, responsable_rol: s.responsable || undefined, dias_limite: s.diasLimite ? Number(s.diasLimite) : undefined })
      }
      toast.success('Plantilla creada')
      qc.invalidateQueries({ queryKey: ['dms-workflows'] })
      qc.invalidateQueries({ queryKey: ['dms-wf-pasos', wf.id] })
      resetTemplate(); setTemplateDialogOpen(false)
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo crear la plantilla') }
    finally { setSavingTemplate(false) }
  }

  // ── Instance actions ──
  const avanzar = async (inst: Instancia) => {
    try {
      await apiClient.put(`/dms/instancias/${inst.id}/avanzar`, { accion: 'aprobado' })
      toast.success('Paso avanzado')
      qc.invalidateQueries({ queryKey: ['dms-instancias-all'] })
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo avanzar') }
  }
  const cancelar = async (inst: Instancia) => {
    try {
      await apiClient.put(`/dms/instancias/${inst.id}/cancelar`, { comentario: 'Cancelada desde el tablero' })
      toast.success('Instancia cancelada')
      qc.invalidateQueries({ queryKey: ['dms-instancias-all'] })
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo cancelar') }
  }
  const iniciarFlujo = async () => {
    if (!iniWorkflow || !iniDoc) { toast.error('Selecciona flujo y documento'); return }
    setIniSaving(true)
    try {
      await apiClient.post('/dms/instancias', { workflow_id: Number(iniWorkflow), documento_id: Number(iniDoc) })
      toast.success('Flujo iniciado')
      qc.invalidateQueries({ queryKey: ['dms-instancias-all'] })
      setIniWorkflow(''); setIniDoc(''); setIniciarOpen(false)
    } catch (e: any) { toast.error(e.response?.data?.detail || 'No se pudo iniciar el flujo') }
    finally { setIniSaving(false) }
  }

  // ── Stats ──
  const activeTemplates = workflows.filter((t) => t.activo).length
  const overdueInstances = activas.filter((i) => vencida(i)).length
  const hace30 = Date.now() - 30 * 86400000
  const completados30 = historial.filter((i) => i.estado === 'COMPLETADO' && i.fecha_fin && new Date(i.fecha_fin).getTime() >= hace30).length
  const duraciones = historial.filter((i) => i.estado === 'COMPLETADO').map((i) => diffDias(i.fecha_inicio, i.fecha_fin))
  const avgDuration = duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : 0

  return (
    <Layout title="Flujos Documentales BPM">
      <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#F0F4F8' }}>

        {/* ── Header ── */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1.2, bgcolor: DMS_COLOR, borderRadius: 2, display: 'flex', alignItems: 'center' }}>
              <TimelineIcon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0F172A">Flujos Documentales BPM</Typography>
              <Typography variant="body2" color="text.secondary">Gestión de flujos de aprobación y procesos documentales</Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setIniciarOpen(true)} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>Iniciar Flujo</Button>
        </Box>

        {/* ── KPI Cards ── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Plantillas Configuradas', value: workflows.length, sub: `${activeTemplates} activas`, color: DMS_COLOR, icon: <AssignmentIcon /> },
            { label: 'Instancias Activas', value: activas.length, sub: `${overdueInstances} vencidas`, color: overdueInstances > 0 ? '#B71C1C' : '#2E7D32', icon: <PlayArrowIcon /> },
            { label: 'Flujos Completados (30d)', value: completados30, sub: 'Últimos 30 días', color: '#2E7D32', icon: <CheckCircleIcon /> },
            { label: 'Duración Promedio', value: `${avgDuration}d`, sub: 'Por instancia', color: '#6A1B9A', icon: <ScheduleIcon /> },
          ].map((kpi, i) => (
            <Grid key={i} size={{ xs: 12, md: 3 }}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>{kpi.label}</Typography>
                    <Box sx={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</Box>
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color, lineHeight: 1 }}>{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Tabs ── */}
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
          <Box sx={{ borderBottom: '1px solid #E2E8F0', px: 2, pt: 1 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', minHeight: 48 }, '& .Mui-selected': { color: DMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: DMS_COLOR, height: 3, borderRadius: '3px 3px 0 0' } }}>
              <Tab icon={<AssignmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Plantillas de Flujo" />
              <Tab icon={<Badge badgeContent={overdueInstances} color="error"><PlayArrowIcon sx={{ fontSize: 18 }} /></Badge>} iconPosition="start" label="Instancias Activas" />
              <Tab icon={<HistoryEduIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Historial" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>

            {/* TAB 1: Plantillas */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTemplateDialogOpen(true)} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Nueva Plantilla</Button>
              </Box>

              {loadingWf ? <Box textAlign="center" py={5}><CircularProgress size={28} /></Box>
              : workflows.length === 0 ? <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No hay plantillas de flujo. Crea la primera.</Typography></Box>
              : (
                <Stack spacing={1.5}>
                  {workflows.map((template) => {
                    const pasos = pasosMap.get(template.id) ?? []
                    return (
                      <Accordion key={template.id} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '10px !important', '&:before': { display: 'none' }, '&.Mui-expanded': { borderColor: alpha(DMS_COLOR, 0.4), boxShadow: `0 0 0 2px ${alpha(DMS_COLOR, 0.12)}` } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1, mr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                              <Box sx={{ p: 0.8, bgcolor: alpha(DMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex' }}><TimelineIcon sx={{ color: DMS_COLOR, fontSize: 20 }} /></Box>
                              <Box>
                                <Typography fontWeight={700} fontSize="0.9rem" color="#0F172A">{template.nombre}</Typography>
                                <Typography variant="caption" color="text.secondary">{template.descripcion || 'Flujo documental'}{template.dias_limite ? ` · ${template.dias_limite}d límite` : ''}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip label={`${pasos.length} pasos`} size="small" sx={{ bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR, fontWeight: 600 }} />
                              <Chip label={template.activo ? 'Activo' : 'Inactivo'} size="small" color={template.activo ? 'success' : 'default'} variant="outlined" sx={{ fontWeight: 600 }} />
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                          <Divider sx={{ mb: 2 }} />
                          {pasos.length === 0 ? <Typography variant="caption" color="text.secondary">Sin pasos configurados.</Typography> : (
                            <Stack spacing={1}>
                              {pasos.map((paso, idx) => (
                                <Box key={paso.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #F1F5F9' }}>
                                  <Box sx={{ minWidth: 28, height: 28, borderRadius: '50%', bgcolor: DMS_COLOR, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>{idx + 1}</Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight={600} fontSize="0.85rem">{paso.nombre}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                      <PersonIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                      <Typography variant="caption" color="text.secondary">{paso.responsable_rol || 'Sin responsable'}</Typography>
                                    </Box>
                                  </Box>
                                  <Chip icon={getStepIcon(paso.tipo)} label={paso.tipo} size="small" sx={{ bgcolor: alpha(getStepColor(paso.tipo), 0.1), color: getStepColor(paso.tipo), fontWeight: 600, '& .MuiChip-icon': { color: getStepColor(paso.tipo) } }} />
                                  {!!paso.dias_limite && <Chip icon={<ScheduleIcon sx={{ fontSize: 12 }} />} label={`${paso.dias_limite}d`} size="small" variant="outlined" sx={{ fontWeight: 600, minWidth: 50 }} />}
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )
                  })}
                </Stack>
              )}
            </TabPanel>

            {/* TAB 2: Instancias Activas */}
            <TabPanel value={activeTab} index={1}>
              {loadingInst ? <Box textAlign="center" py={5}><CircularProgress size={28} /></Box>
              : activas.length === 0 ? <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No hay instancias activas. Inicia un flujo.</Typography></Box>
              : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                        {['ID', 'Documento', 'Flujo Aplicado', 'Progreso', 'Estado', 'Iniciado por', 'Fecha Límite', 'Acciones'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', py: 1.5, borderBottom: '2px solid #E2E8F0' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activas.map((inst) => {
                        const venc = vencida(inst)
                        const total = totalPasosDe(inst.workflow_id) || 1
                        const steps = stepsDe(inst)
                        return (
                          <TableRow key={inst.id} sx={{ '&:hover': { bgcolor: alpha(DMS_COLOR, 0.03) }, bgcolor: venc ? alpha('#B71C1C', 0.03) : 'transparent' }}>
                            <TableCell><Typography fontSize="0.78rem" fontWeight={600} color={DMS_COLOR}>WF-{String(inst.id).padStart(4, '0')}</Typography></TableCell>
                            <TableCell><Typography fontSize="0.82rem" fontWeight={500} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docMap.get(inst.documento_id) || `Documento #${inst.documento_id}`}</Typography></TableCell>
                            <TableCell><Typography fontSize="0.78rem" color="text.secondary" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wfMap.get(inst.workflow_id)?.nombre || `Flujo #${inst.workflow_id}`}</Typography></TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
                                {steps.map((p) => (
                                  <Tooltip key={p.id} title={`${p.nombre} (${p.estado})`}>
                                    <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, cursor: 'default', bgcolor: p.estado === 'completado' ? '#2E7D32' : p.estado === 'activo' ? DMS_COLOR : '#CBD5E1', color: p.estado === 'pendiente' ? '#64748B' : '#fff' }}>
                                      {p.estado === 'completado' ? '✓' : p.orden}
                                    </Box>
                                  </Tooltip>
                                ))}
                              </Box>
                              <LinearProgress variant="determinate" value={Math.min(100, (inst.paso_actual / total) * 100)} sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: DMS_COLOR } }} />
                            </TableCell>
                            <TableCell><Chip label={venc ? 'Vencido' : 'En Proceso'} size="small" sx={{ bgcolor: alpha(getEstadoColor(venc ? 'Vencido' : 'En Proceso'), 0.12), color: getEstadoColor(venc ? 'Vencido' : 'En Proceso'), fontWeight: 700, fontSize: '0.72rem' }} /></TableCell>
                            <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} /><Typography fontSize="0.78rem" color="text.secondary">{inst.iniciado_por_id ? (userMap.get(inst.iniciado_por_id) || `#${inst.iniciado_por_id}`) : '—'}</Typography></Box></TableCell>
                            <TableCell><Chip icon={<ScheduleIcon sx={{ fontSize: 13 }} />} label={fmtFecha(inst.fecha_limite)} size="small" sx={{ bgcolor: venc ? alpha('#B71C1C', 0.1) : alpha('#2E7D32', 0.08), color: venc ? '#B71C1C' : '#2E7D32', fontWeight: 600, fontSize: '0.72rem', '& .MuiChip-icon': { color: venc ? '#B71C1C' : '#2E7D32' } }} /></TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => setDetailInstance(inst)} sx={{ color: DMS_COLOR }}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                <Tooltip title="Avanzar paso"><span><IconButton size="small" onClick={() => avanzar(inst)} sx={{ color: '#2E7D32' }}><ArrowForwardIcon sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
                                <Tooltip title="Cancelar instancia"><IconButton size="small" onClick={() => cancelar(inst)} sx={{ color: '#B71C1C' }}><CancelIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* TAB 3: Historial */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography fontWeight={600} color="text.secondary" fontSize="0.85rem">Mostrando {historial.length} registros</Typography>
                <Box sx={{ flex: 1 }} />
                {(['Completado', 'Cancelado'] as const).map((r) => (
                  <Chip key={r} label={`${r}: ${historial.filter((h) => (h.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado') === r).length}`} size="small" color={getResultColor(r)} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                ))}
                <Chip icon={<ScheduleIcon sx={{ fontSize: 14 }} />} label={`Promedio: ${avgDuration} días`} size="small" sx={{ bgcolor: alpha('#6A1B9A', 0.1), color: '#6A1B9A', fontWeight: 600 }} />
              </Box>

              {historial.length === 0 ? <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">Aún no hay flujos finalizados.</Typography></Box>
              : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                        {['ID', 'Documento', 'Flujo Aplicado', 'Resultado', 'Iniciado por', 'Fecha Inicio', 'Fecha Fin', 'Duración', 'Pasos'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', py: 1.5, borderBottom: '2px solid #E2E8F0' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historial.map((rec) => {
                        const resultado = rec.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado'
                        const dur = diffDias(rec.fecha_inicio, rec.fecha_fin)
                        return (
                          <TableRow key={rec.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                            <TableCell><Typography fontSize="0.78rem" fontWeight={600} color="text.secondary">WF-{String(rec.id).padStart(4, '0')}</Typography></TableCell>
                            <TableCell><Typography fontSize="0.82rem" fontWeight={500} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docMap.get(rec.documento_id) || `Documento #${rec.documento_id}`}</Typography></TableCell>
                            <TableCell><Typography fontSize="0.78rem" color="text.secondary" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wfMap.get(rec.workflow_id)?.nombre || `Flujo #${rec.workflow_id}`}</Typography></TableCell>
                            <TableCell><Chip label={resultado} size="small" color={getResultColor(resultado)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} /></TableCell>
                            <TableCell><Typography fontSize="0.78rem" color="text.secondary">{rec.iniciado_por_id ? (userMap.get(rec.iniciado_por_id) || `#${rec.iniciado_por_id}`) : '—'}</Typography></TableCell>
                            <TableCell><Typography fontSize="0.78rem">{fmtFecha(rec.fecha_inicio)}</Typography></TableCell>
                            <TableCell><Typography fontSize="0.78rem">{fmtFecha(rec.fecha_fin)}</Typography></TableCell>
                            <TableCell><Chip label={`${dur}d`} size="small" sx={{ bgcolor: dur <= 5 ? alpha('#2E7D32', 0.1) : dur <= 10 ? alpha('#E65100', 0.1) : alpha('#B71C1C', 0.1), color: dur <= 5 ? '#2E7D32' : dur <= 10 ? '#E65100' : '#B71C1C', fontWeight: 700 }} /></TableCell>
                            <TableCell><Typography fontSize="0.82rem" textAlign="center">{totalPasosDe(rec.workflow_id)}</Typography></TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </Box>
        </Card>

        {/* DIALOG: Nueva Plantilla */}
        <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 0.8, bgcolor: alpha(DMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex' }}><AssignmentIcon sx={{ color: DMS_COLOR, fontSize: 22 }} /></Box>
            <Box>
              <Typography fontWeight={700} fontSize="1.1rem">Nueva Plantilla de Flujo</Typography>
              <Typography variant="caption" color="text.secondary">Configure los pasos del flujo documental</Typography>
            </Box>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ px: 3, py: 2.5 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Nombre del Flujo" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Ej. Aprobación Contratos Laborales" size="small" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo Documental</InputLabel>
                  <Select value={newTemplateTipo} label="Tipo Documental" onChange={(e: SelectChangeEvent) => setNewTemplateTipo(e.target.value)}>
                    {['Contrato Laboral', 'Contrato Cliente', 'Orden de Compra', 'Factura Proveedor', 'Póliza de Seguro', 'Tabla de Tarifas', 'Acta Administrativa', 'Otro'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography fontWeight={700} fontSize="0.9rem" color="#0F172A">Pasos del Flujo</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAddStep} variant="outlined" sx={{ borderColor: DMS_COLOR, color: DMS_COLOR, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: DMS_COLOR, bgcolor: alpha(DMS_COLOR, 0.05) } }}>Agregar Paso</Button>
            </Box>

            <Stack spacing={1.5}>
              {newTemplateSteps.map((step, idx) => (
                <Box key={idx} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ minWidth: 26, height: 26, borderRadius: '50%', bgcolor: DMS_COLOR, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>{idx + 1}</Box>
                    <Typography fontWeight={600} fontSize="0.85rem">Paso {idx + 1}</Typography>
                    <Box sx={{ flex: 1 }} />
                    {newTemplateSteps.length > 1 && <IconButton size="small" onClick={() => handleRemoveStep(idx)} sx={{ color: '#B71C1C' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>}
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Nombre del paso" value={step.nombre} onChange={(e) => handleStepChange(idx, 'nombre', e.target.value)} size="small" placeholder="Ej. Revisión Legal" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Tipo</InputLabel>
                        <Select value={step.tipo} label="Tipo" onChange={(e: SelectChangeEvent) => handleStepChange(idx, 'tipo', e.target.value)}>
                          {STEP_TYPES.map((t) => <MenuItem key={t} value={t}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ color: getStepColor(t), display: 'flex' }}>{getStepIcon(t)}</Box>{t}</Box></MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Responsable o Rol" value={step.responsable} onChange={(e) => handleStepChange(idx, 'responsable', e.target.value)} size="small" placeholder="Ej. Director Financiero" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField fullWidth label="Días límite" type="number" value={step.diasLimite} onChange={(e) => handleStepChange(idx, 'diasLimite', e.target.value)} size="small" inputProps={{ min: 1, max: 30 }} />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setTemplateDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }} disabled={savingTemplate}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveTemplate} disabled={!newTemplateName || savingTemplate} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>{savingTemplate ? 'Guardando…' : 'Guardar Plantilla'}</Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG: Iniciar Flujo */}
        <Dialog open={iniciarOpen} onClose={() => setIniciarOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Iniciar Flujo Documental</DialogTitle>
          <Divider />
          <DialogContent sx={{ py: 2.5 }}>
            <Stack spacing={2} mt={0.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Plantilla de flujo</InputLabel>
                <Select label="Plantilla de flujo" value={iniWorkflow} onChange={(e) => setIniWorkflow(String(e.target.value))}>
                  {workflows.filter((w) => w.activo).map((w) => <MenuItem key={w.id} value={String(w.id)}>{w.nombre} ({totalPasosDe(w.id)} pasos)</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Documento</InputLabel>
                <Select label="Documento" value={iniDoc} onChange={(e) => setIniDoc(String(e.target.value))}>
                  {documentos.map((d) => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setIniciarOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }} disabled={iniSaving}>Cancelar</Button>
            <Button variant="contained" onClick={iniciarFlujo} disabled={iniSaving} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>{iniSaving ? 'Iniciando…' : 'Iniciar Flujo'}</Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG: Detalle Instancia (Timeline real desde paso_actual) */}
        <Dialog open={!!detailInstance} onClose={() => setDetailInstance(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          {detailInstance && (() => {
            const venc = vencida(detailInstance)
            const steps = stepsDe(detailInstance)
            const total = totalPasosDe(detailInstance.workflow_id) || 1
            return (
              <>
                <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{ p: 0.8, bgcolor: alpha(DMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex', mt: 0.3 }}><TimelineIcon sx={{ color: DMS_COLOR, fontSize: 20 }} /></Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700} fontSize="1rem">{docMap.get(detailInstance.documento_id) || `Documento #${detailInstance.documento_id}`}</Typography>
                      <Typography variant="caption" color="text.secondary">WF-{String(detailInstance.id).padStart(4, '0')} · {wfMap.get(detailInstance.workflow_id)?.nombre || `Flujo #${detailInstance.workflow_id}`}</Typography>
                      <Box sx={{ mt: 0.8, display: 'flex', gap: 1 }}>
                        <Chip label={venc ? 'Vencido' : 'En Proceso'} size="small" sx={{ bgcolor: alpha(getEstadoColor(venc ? 'Vencido' : 'En Proceso'), 0.12), color: getEstadoColor(venc ? 'Vencido' : 'En Proceso'), fontWeight: 700, fontSize: '0.72rem' }} />
                        <Chip icon={<ScheduleIcon sx={{ fontSize: 12 }} />} label={`Paso ${detailInstance.paso_actual} de ${total}`} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                      </Box>
                    </Box>
                  </Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ px: 3, py: 2.5 }}>
                  <Typography fontWeight={700} fontSize="0.85rem" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Línea de tiempo del flujo</Typography>
                  {steps.length === 0 ? <Typography variant="caption" color="text.secondary">Este flujo no tiene pasos configurados.</Typography> : (
                    <Box sx={{ position: 'relative' }}>
                      {steps.map((paso, idx) => {
                        const isLast = idx === steps.length - 1
                        return (
                          <Box key={paso.id} sx={{ display: 'flex', gap: 2, pb: isLast ? 0 : 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
                              <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, bgcolor: paso.estado === 'completado' ? '#2E7D32' : paso.estado === 'activo' ? DMS_COLOR : '#E2E8F0', color: paso.estado === 'pendiente' ? '#94A3B8' : '#fff' }}>
                                {paso.estado === 'completado' ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : paso.estado === 'activo' ? <FiberManualRecordIcon sx={{ fontSize: 14 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />}
                              </Box>
                              {!isLast && <Box sx={{ width: 2, flex: 1, mt: 0.5, bgcolor: paso.estado === 'completado' ? '#2E7D32' : '#E2E8F0', minHeight: 24 }} />}
                            </Box>
                            <Box sx={{ flex: 1, p: 1.5, bgcolor: paso.estado === 'completado' ? alpha('#2E7D32', 0.04) : paso.estado === 'activo' ? alpha(DMS_COLOR, 0.05) : '#F8FAFC', borderRadius: 2, border: '1px solid', borderColor: paso.estado === 'completado' ? alpha('#2E7D32', 0.2) : paso.estado === 'activo' ? alpha(DMS_COLOR, 0.25) : '#F1F5F9', mb: isLast ? 0 : 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography fontWeight={700} fontSize="0.85rem">{paso.nombre}</Typography>
                                <Chip icon={getStepIcon(paso.tipo)} label={paso.tipo} size="small" sx={{ height: 18, bgcolor: alpha(getStepColor(paso.tipo), 0.1), color: getStepColor(paso.tipo), fontWeight: 600, fontSize: '0.65rem', '& .MuiChip-icon': { color: getStepColor(paso.tipo), fontSize: 11 }, '& .MuiChip-label': { px: 0.8 } }} />
                                {paso.estado === 'activo' && <Chip label="En curso" size="small" sx={{ height: 18, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.8 } }} />}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">{paso.responsable_rol || 'Sin responsable'}</Typography>
                              </Box>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  )}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                  <Button onClick={() => setDetailInstance(null)} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>Cerrar</Button>
                  <Button variant="contained" startIcon={<ArrowForwardIcon />} onClick={() => { avanzar(detailInstance); setDetailInstance(null) }} sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>Avanzar Paso</Button>
                </DialogActions>
              </>
            )
          })()}
        </Dialog>

      </Box>
    </Layout>
  )
}
