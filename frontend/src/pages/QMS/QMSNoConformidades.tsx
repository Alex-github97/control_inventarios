// QMS Module - No Conformidades
import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Typography, Chip, Button, Grid, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, Stack,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Tooltip, alpha, Drawer, Divider, LinearProgress,
  Switch, FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import VerifiedIcon from '@mui/icons-material/Verified'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'

const QMS_COLOR = '#059669'
const QMS_COLOR_DARK = '#047857'

interface NC {
  codigo: string
  titulo: string
  clasificacion: 'MENOR' | 'MAYOR' | 'CRÍTICA'
  origen: string
  proceso: string
  responsable: string
  fechaLimite: string
  estado: 'ABIERTA' | 'EN_TRATAMIENTO' | 'VERIFICACION' | 'CERRADA'
}

interface CAPA {
  codigo: string
  tipo: 'CORRECTIVA' | 'PREVENTIVA' | 'MEJORA'
  titulo: string
  ncOrigen: string
  responsable: string
  fechaLimite: string
  avance: number
  estado: 'ABIERTA' | 'EN_CURSO' | 'CERRADA' | 'VENCIDA'
}

const NC_DATA: NC[] = [
  { codigo: 'NC-001', titulo: 'Daño en mercancía por manipulación inadecuada', clasificacion: 'MAYOR', origen: 'OPERACION', proceso: 'Transporte', responsable: 'Juan Pérez', fechaLimite: '2026-07-01', estado: 'EN_TRATAMIENTO' },
  { codigo: 'NC-002', titulo: 'Temperatura fuera de rango en bodega', clasificacion: 'CRÍTICA', origen: 'OPERACION', proceso: 'WMS', responsable: 'María López', fechaLimite: '2026-06-25', estado: 'ABIERTA' },
  { codigo: 'NC-003', titulo: 'Conductor sin documentación vigente', clasificacion: 'MENOR', origen: 'HCM', proceso: 'RRHH', responsable: 'Carlos Ruiz', fechaLimite: '2026-07-15', estado: 'ABIERTA' },
  { codigo: 'NC-004', titulo: 'Incumplimiento en tiempos de entrega', clasificacion: 'MAYOR', origen: 'CLIENTE', proceso: 'TMS', responsable: 'Ana García', fechaLimite: '2026-06-30', estado: 'VERIFICACION' },
  { codigo: 'NC-005', titulo: 'Falta de control en cadena de custodia', clasificacion: 'MAYOR', origen: 'AUDITORIA', proceso: 'WMS', responsable: 'Pedro Silva', fechaLimite: '2026-07-10', estado: 'EN_TRATAMIENTO' },
  { codigo: 'NC-006', titulo: 'Procedimiento de calibración sin actualizar', clasificacion: 'MENOR', origen: 'AUDITORIA', proceso: 'Calidad', responsable: 'Laura Méndez', fechaLimite: '2026-05-30', estado: 'CERRADA' },
  { codigo: 'NC-007', titulo: 'Falta de registro en bitácora de ruta', clasificacion: 'MENOR', origen: 'OPERACION', proceso: 'Transporte', responsable: 'Jorge Vargas', fechaLimite: '2026-05-15', estado: 'CERRADA' },
  { codigo: 'NC-008', titulo: 'Etiquetado incorrecto en despacho', clasificacion: 'MAYOR', origen: 'CLIENTE', proceso: 'WMS', responsable: 'Sofía Torres', fechaLimite: '2026-05-20', estado: 'CERRADA' },
]

const CAPA_DATA: CAPA[] = [
  { codigo: 'CAPA-021', tipo: 'CORRECTIVA', titulo: 'Plan de capacitación en manipulación de carga', ncOrigen: 'NC-001', responsable: 'Juan Pérez', fechaLimite: '2026-07-15', avance: 60, estado: 'EN_CURSO' },
  { codigo: 'CAPA-022', tipo: 'PREVENTIVA', titulo: 'Instalación de sensores de temperatura', ncOrigen: 'NC-002', responsable: 'Mantenimiento', fechaLimite: '2026-06-30', avance: 30, estado: 'EN_CURSO' },
  { codigo: 'CAPA-023', tipo: 'CORRECTIVA', titulo: 'Actualización de documentos de conductores', ncOrigen: 'NC-003', responsable: 'Carlos Ruiz', fechaLimite: '2026-07-20', avance: 80, estado: 'EN_CURSO' },
  { codigo: 'CAPA-024', tipo: 'MEJORA', titulo: 'Rediseño de proceso de entrega', ncOrigen: 'NC-004', responsable: 'Ana García', fechaLimite: '2026-06-21', avance: 90, estado: 'EN_CURSO' },
  { codigo: 'CAPA-019', tipo: 'CORRECTIVA', titulo: 'Implementación de cadena de custodia digital', ncOrigen: 'NC-005', responsable: 'Pedro Silva', fechaLimite: '2026-07-25', avance: 45, estado: 'EN_CURSO' },
  { codigo: 'CAPA-018', tipo: 'PREVENTIVA', titulo: 'Plan de calibración anual', ncOrigen: 'NC-006', responsable: 'Laura Méndez', fechaLimite: '2026-05-30', avance: 100, estado: 'CERRADA' },
]

const NC_POR_ORIGEN = [
  { origen: 'Operación', valor: 12, color: '#EF4444' },
  { origen: 'Cliente', valor: 8, color: '#F59E0B' },
  { origen: 'Auditoría', valor: 6, color: '#3B82F6' },
  { origen: 'Proveedor', valor: 4, color: '#8B5CF6' },
  { origen: 'HCM', valor: 3, color: '#059669' },
]
const maxOrigen = Math.max(...NC_POR_ORIGEN.map(d => d.valor))

const NC_CLASIFICACION = [
  { label: 'Menor', pct: 45, color: '#3B82F6' },
  { label: 'Mayor', pct: 40, color: '#F59E0B' },
  { label: 'Crítica', pct: 15, color: '#EF4444' },
]

const NC_TENDENCIA = [
  { mes: 'Ene', abiertas: 4, cerradas: 3 },
  { mes: 'Feb', abiertas: 7, cerradas: 5 },
  { mes: 'Mar', abiertas: 3, cerradas: 4 },
  { mes: 'Abr', abiertas: 9, cerradas: 6 },
  { mes: 'May', abiertas: 5, cerradas: 7 },
  { mes: 'Jun', abiertas: 7, cerradas: 4 },
]
const maxTend = Math.max(...NC_TENDENCIA.flatMap(d => [d.abiertas, d.cerradas]))

const clasificacionColor: Record<string, string> = {
  MENOR: '#3B82F6',
  MAYOR: '#F59E0B',
  CRÍTICA: '#EF4444',
}

const estadoNCColor: Record<string, string> = {
  ABIERTA: '#EF4444',
  EN_TRATAMIENTO: '#F59E0B',
  VERIFICACION: '#3B82F6',
  CERRADA: '#059669',
}

const estadoCAPAColor: Record<string, string> = {
  ABIERTA: '#EF4444',
  EN_CURSO: '#3B82F6',
  CERRADA: '#059669',
  VENCIDA: '#9333EA',
}

const tipoCAPA: Record<string, string> = {
  CORRECTIVA: '#059669',
  PREVENTIVA: '#3B82F6',
  MEJORA: '#8B5CF6',
}

const ORIGENES = ['OPERACION', 'CLIENTE', 'AUDITORIA', 'PROVEEDOR', 'HCM']
const PROCESOS = ['Transporte', 'WMS', 'RRHH', 'TMS', 'Calidad', 'Financiero']

export default function QMSNoConformidades() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedNC, setSelectedNC] = useState<NC | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>('TODOS')
  const [requireCapa, setRequireCapa] = useState(true)

  const handleVerNC = (nc: NC) => {
    setSelectedNC(nc)
    setDrawerOpen(true)
  }

  const filteredNC = filterEstado === 'TODOS'
    ? NC_DATA
    : NC_DATA.filter(n => n.estado === filterEstado)

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack direction="row" alignItems="center" gap={2}>
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: QMS_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReportProblemIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">No Conformidades</Typography>
              <Typography variant="body2" color="text.secondary">Gestión de NC y Acciones CAPA</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ background: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, borderRadius: '8px' }} />
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
          >
            Registrar NC
          </Button>
        </Stack>

        {/* KPI Cards */}
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'NC Abiertas', value: '7', color: '#EF4444' },
            { label: 'NC En Tratamiento', value: '4', color: '#F59E0B' },
            { label: 'CAPA Activas', value: '12', color: '#3B82F6' },
            { label: 'CAPA Vencidas', value: '2', color: '#EF4444' },
            { label: 'NC Cerradas', value: '9', color: '#059669' },
          ].map(kpi => (
            <Grid key={kpi.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: alpha(kpi.color, 0.3), borderRadius: '14px', p: 2, textAlign: 'center', background: alpha(kpi.color, 0.04) }}>
                <Typography variant="h4" fontWeight={800} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={11}>{kpi.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}
        >
          <Tab label="No Conformidades" />
          <Tab label="Acciones CAPA" />
          <Tab label="Análisis" />
        </Tabs>

        {/* Tab 0: No Conformidades */}
        {tab === 0 && (
          <Box>
            <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
              {['TODOS', 'ABIERTA', 'EN_TRATAMIENTO', 'VERIFICACION', 'CERRADA'].map(e => (
                <Chip
                  key={e}
                  label={e}
                  size="small"
                  clickable
                  onClick={() => setFilterEstado(e)}
                  sx={{
                    fontWeight: 600, fontSize: 11,
                    bgcolor: filterEstado === e ? (estadoNCColor[e] || QMS_COLOR) : alpha(QMS_COLOR, 0.08),
                    color: filterEstado === e ? '#fff' : 'text.secondary',
                  }}
                />
              ))}
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                    <TableCell>Código</TableCell>
                    <TableCell>Título</TableCell>
                    <TableCell>Clasificación</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Proceso</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Fecha Límite</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredNC.map(row => (
                    <TableRow key={row.codigo} hover>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700} color={QMS_COLOR}>{row.codigo}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.titulo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.clasificacion} size="small" sx={{ fontSize: 9, height: 20, fontWeight: 700, color: '#fff', bgcolor: clasificacionColor[row.clasificacion] }} />
                      </TableCell>
                      <TableCell><Typography variant="caption">{row.origen}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{row.proceso}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.responsable}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.fechaLimite}</Typography></TableCell>
                      <TableCell>
                        <Chip label={row.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 20, fontWeight: 700, color: '#fff', bgcolor: estadoNCColor[row.estado] }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" sx={{ color: QMS_COLOR }} onClick={() => handleVerNC(row)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Crear CAPA">
                            <IconButton size="small" sx={{ color: '#3B82F6' }}>
                              <AssignmentTurnedInIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" sx={{ color: '#F59E0B' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: CAPA */}
        {tab === 1 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                  <TableCell>Código</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>NC Origen</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell>Fecha Límite</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Avance</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CAPA_DATA.map(row => (
                  <TableRow key={row.codigo} hover>
                    <TableCell>
                      <Typography variant="caption" fontWeight={700} color={QMS_COLOR}>{row.codigo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.tipo} size="small" sx={{ fontSize: 9, height: 20, fontWeight: 700, color: '#fff', bgcolor: tipoCAPA[row.tipo] }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.titulo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600} color="text.secondary">{row.ncOrigen}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{row.responsable}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{row.fechaLimite}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={row.avance}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(tipoCAPA[row.tipo], 0.2),
                            '& .MuiLinearProgress-bar': { bgcolor: tipoCAPA[row.tipo], borderRadius: 3 },
                          }}
                        />
                        <Typography variant="caption" fontWeight={700} fontSize={10}>{row.avance}%</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 20, fontWeight: 700, color: '#fff', bgcolor: estadoCAPAColor[row.estado] }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Ver"><IconButton size="small" sx={{ color: QMS_COLOR }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" sx={{ color: '#3B82F6' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Tab 2: Análisis */}
        {tab === 2 && (
          <Grid container spacing={3}>
            {/* NC por Origen */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2.5}>NC por Origen</Typography>
                <Stack gap={1.5}>
                  {NC_POR_ORIGEN.map(d => (
                    <Box key={d.origen}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight={600}>{d.origen}</Typography>
                        <Typography variant="caption" fontWeight={700} color={d.color}>{d.valor}</Typography>
                      </Stack>
                      <Box sx={{ position: 'relative', height: 14, bgcolor: alpha(d.color, 0.12), borderRadius: 2 }}>
                        <Box sx={{ width: `${(d.valor / maxOrigen) * 100}%`, height: '100%', bgcolor: d.color, borderRadius: 2 }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* NC por Clasificación */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2.5}>NC por Clasificación</Typography>
                <Box sx={{ display: 'flex', height: 32, borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                  {NC_CLASIFICACION.map(d => (
                    <Tooltip key={d.label} title={`${d.label}: ${d.pct}%`}>
                      <Box sx={{ width: `${d.pct}%`, bgcolor: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" color="#fff" fontWeight={700} fontSize={10}>{d.pct}%</Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
                <Stack gap={1}>
                  {NC_CLASIFICACION.map(d => (
                    <Stack key={d.label} direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                      <Typography variant="caption">{d.label}</Typography>
                      <Typography variant="caption" fontWeight={700} color={d.color} ml="auto">{d.pct}%</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Tendencia mensual */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2.5}>Tendencia NC vs Cerradas</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120 }}>
                  {NC_TENDENCIA.map(d => (
                    <Box key={d.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 90, width: '100%' }}>
                        <Box sx={{ flex: 1, height: `${(d.abiertas / maxTend) * 90}px`, bgcolor: '#EF4444', borderRadius: '2px 2px 0 0', minHeight: 4 }} />
                        <Box sx={{ flex: 1, height: `${(d.cerradas / maxTend) * 90}px`, bgcolor: '#059669', borderRadius: '2px 2px 0 0', minHeight: 4 }} />
                      </Box>
                      <Typography variant="caption" fontSize={9} color="text.secondary">{d.mes}</Typography>
                    </Box>
                  ))}
                </Box>
                <Stack direction="row" gap={2} mt={1}>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, bgcolor: '#EF4444', borderRadius: '2px' }} />
                    <Typography variant="caption" fontSize={10}>Abiertas</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, bgcolor: '#059669', borderRadius: '2px' }} />
                    <Typography variant="caption" fontSize={10}>Cerradas</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Drawer: Detalle NC */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
        >
          {selectedNC && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>Detalle No Conformidad</Typography>
                <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack gap={1.5}>
                <Stack direction="row" gap={1}>
                  <Chip label={selectedNC.codigo} size="small" sx={{ fontWeight: 700, bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR }} />
                  <Chip label={selectedNC.clasificacion} size="small" sx={{ fontWeight: 700, color: '#fff', bgcolor: clasificacionColor[selectedNC.clasificacion] }} />
                  <Chip label={selectedNC.estado.replace('_', ' ')} size="small" sx={{ fontWeight: 700, color: '#fff', bgcolor: estadoNCColor[selectedNC.estado] }} />
                </Stack>
                <Typography variant="subtitle1" fontWeight={700}>{selectedNC.titulo}</Typography>
                <Divider />
                {[
                  { label: 'Origen', value: selectedNC.origen },
                  { label: 'Proceso', value: selectedNC.proceso },
                  { label: 'Responsable', value: selectedNC.responsable },
                  { label: 'Fecha Límite', value: selectedNC.fechaLimite },
                ].map(item => (
                  <Stack key={item.label} direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                  </Stack>
                ))}
                <Divider />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">HISTORIAL</Typography>
                {[
                  { fecha: '2026-06-01', accion: 'NC registrada', usuario: 'Ana García' },
                  { fecha: '2026-06-03', accion: 'CAPA asignada', usuario: 'Dir. Calidad' },
                  { fecha: '2026-06-10', accion: 'Avance 60% reportado', usuario: selectedNC.responsable },
                ].map((h, i) => (
                  <Paper key={i} elevation={0} sx={{ p: 1.5, bgcolor: alpha(QMS_COLOR, 0.04), borderRadius: '8px', border: '1px solid', borderColor: alpha(QMS_COLOR, 0.15) }}>
                    <Typography variant="caption" color="text.secondary">{h.fecha}</Typography>
                    <Typography variant="body2" fontWeight={600}>{h.accion}</Typography>
                    <Typography variant="caption" color="text.secondary">{h.usuario}</Typography>
                  </Paper>
                ))}
              </Stack>
              <Box mt="auto" pt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AssignmentTurnedInIcon />}
                  sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}
                >
                  Crear / Ver CAPA Asociada
                </Button>
              </Box>
            </>
          )}
        </Drawer>

        {/* Dialog: Registrar NC */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
            Registrar No Conformidad
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Título de la NC" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción detallada" fullWidth size="small" multiline rows={3} defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Clasificación" fullWidth size="small" select defaultValue="">
                  {['MENOR', 'MAYOR', 'CRÍTICA'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Origen" fullWidth size="small" select defaultValue="">
                  {ORIGENES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Proceso" fullWidth size="small" select defaultValue="">
                  {PROCESOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Área" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Responsable" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Fecha Límite" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Norma Afectada" fullWidth size="small" defaultValue="" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={requireCapa} onChange={e => setRequireCapa(e.target.checked)} sx={{ '& .MuiSwitch-thumb': { bgcolor: QMS_COLOR }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: QMS_COLOR } }} />}
                  label="¿Requiere acción CAPA?"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB' }}>
            <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ background: QMS_COLOR, '&:hover': { background: QMS_COLOR_DARK } }}>
              Registrar NC
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
