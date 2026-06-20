// QMS Module - Mejora Continua
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, LinearProgress,
} from '@mui/material'
import { TrendingUp, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

interface Mejora { codigo: string; titulo: string; proceso: string; tipo: string; responsable: string; avance: number; estado: string; beneficio: string; fecha: string }
const MEJORAS: Mejora[] = [
  { codigo: 'MJR-001', titulo: 'Automatización de reportes de trazabilidad WMS', proceso: 'WMS', tipo: 'proyecto', responsable: 'TI', avance: 85, estado: 'en_curso', beneficio: 'Reducción 3h/día en generación manual', fecha: '2026-07-31' },
  { codigo: 'MJR-002', titulo: 'Implementar ruteo dinámico con IA en TMS', proceso: 'TMS', tipo: 'innovacion', responsable: 'TI / TMS', avance: 35, estado: 'en_curso', beneficio: 'Reducción 12% en combustible', fecha: '2026-09-30' },
  { codigo: 'MJR-003', titulo: 'Estandarización de protocolos de cargue en 4 bodegas', proceso: 'Operacional', tipo: 'estandarizacion', responsable: 'Jefe Operaciones', avance: 100, estado: 'completado', beneficio: 'Reducción 40% de NCs operacionales', fecha: '2026-05-31' },
  { codigo: 'MJR-004', titulo: 'Programa de formación de conductores defensivos', proceso: 'RRHH', tipo: 'capacitacion', responsable: 'RRHH', avance: 60, estado: 'en_curso', beneficio: 'Meta 0 accidentes viales en 2026', fecha: '2026-08-31' },
  { codigo: 'MJR-005', titulo: 'Digitalización de PODs y firma electrónica', proceso: 'TMS', tipo: 'proyecto', responsable: 'TI / Ops', avance: 70, estado: 'en_curso', beneficio: 'Eliminar 100% papel en despachos', fecha: '2026-07-15' },
  { codigo: 'MJR-006', titulo: 'Optimización de layout de bodega norte', proceso: 'WMS', tipo: 'mejora_proceso', responsable: 'Jefe WMS', avance: 0, estado: 'pendiente', beneficio: 'Reducción 15% tiempo de picking', fecha: '2026-10-31' },
  { codigo: 'MJR-007', titulo: 'Sistema de alertas tempranas de vencimiento flota', proceso: 'Flota', tipo: 'proyecto', responsable: 'Jefe Flota', avance: 50, estado: 'en_curso', beneficio: 'Reducción 80% vehículos sin documentos', fecha: '2026-07-30' },
  { codigo: 'MJR-008', titulo: 'Kaizen: reducción de tiempos de cargue en un 20%', proceso: 'Operacional', tipo: 'kaizen', responsable: 'Calidad', avance: 100, estado: 'completado', beneficio: 'Ahorro 45min/operación x 12 ops/día', fecha: '2026-04-30' },
]

const TIPO_COLOR: Record<string, string> = { proyecto: '#0369A1', innovacion: '#7C3AED', estandarizacion: '#D97706', capacitacion: QMS_COLOR, mejora_proceso: '#0891B2', kaizen: '#EA580C' }
const EST_COLOR: Record<string, string> = { pendiente: '#6B7280', en_curso: '#D97706', completado: QMS_COLOR, cancelado: '#DC2626' }

const KANBAN_COLS = [
  { id: 'pendiente', label: 'Pendiente', color: '#6B7280' },
  { id: 'en_curso', label: 'En Curso', color: '#D97706' },
  { id: 'completado', label: 'Completado', color: QMS_COLOR },
]

export default function QMSMejora() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TrendingUp sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Mejora Continua</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>QMS · Iniciativas · Kaizen · PDCA</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Iniciativa
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Iniciativas Activas', value: MEJORAS.filter(m => m.estado === 'en_curso').length.toString(), color: '#D97706' },
            { label: 'Completadas', value: MEJORAS.filter(m => m.estado === 'completado').length.toString(), color: QMS_COLOR },
            { label: 'Pendientes', value: MEJORAS.filter(m => m.estado === 'pendiente').length.toString(), color: '#6B7280' },
            { label: 'Avance Promedio', value: `${Math.round(MEJORAS.filter(m => m.estado === 'en_curso').reduce((s, m) => s + m.avance, 0) / Math.max(MEJORAS.filter(m => m.estado === 'en_curso').length, 1))}%`, color: QMS_COLOR },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: '#0F1E35', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Kanban" />
          <Tab label="Lista" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 2, overflow: 'auto', pb: 2 }}>
            {KANBAN_COLS.map(col => (
              <Box key={col.id} sx={{ minWidth: 280, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1.5, borderRadius: '8px 8px 0 0', bgcolor: alpha(col.color, 0.12), borderBottom: `2px solid ${col.color}` }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.color }} />
                  <Typography sx={{ fontWeight: 700, color: col.color, fontSize: 13 }}>{col.label}</Typography>
                  <Chip label={MEJORAS.filter(m => m.estado === col.id).length} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(col.color, 0.15), color: col.color, ml: 'auto' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {MEJORAS.filter(m => m.estado === col.id).map(m => (
                    <Card key={m.codigo} sx={{ bgcolor: '#111827', border: `1px solid ${alpha(col.color, 0.2)}`, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: alpha(col.color, 0.5) } }}>
                      <CardContent sx={{ p: '12px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: col.color }}>{m.codigo}</Typography>
                          <Chip label={m.tipo} size="small" sx={{ fontSize: 8, height: 16, bgcolor: alpha(TIPO_COLOR[m.tipo] || '#888', 0.15), color: TIPO_COLOR[m.tipo] || '#888' }} />
                        </Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#FFF', mb: 0.5, lineHeight: 1.35 }}>{m.titulo}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', mb: 1 }}>{m.proceso} · {m.responsable}</Typography>
                        {m.estado !== 'pendiente' && (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Avance</Typography>
                              <Typography sx={{ fontSize: 9, fontWeight: 700, color: col.color }}>{m.avance}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={m.avance} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: col.color } }} />
                          </Box>
                        )}
                        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', mt: 0.75 }}>{m.beneficio}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {MEJORAS.map(m => (
              <Card key={m.codigo} sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                <CardContent sx={{ p: '12px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{m.codigo}</Typography>
                        <Chip label={m.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[m.tipo] || '#888', 0.15), color: TIPO_COLOR[m.tipo] || '#888' }} />
                        <Chip label={m.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[m.estado], 0.15), color: EST_COLOR[m.estado] }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 13, mb: 0.25 }}>{m.titulo}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{m.proceso} · {m.responsable} · Fecha límite: {m.fecha}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', mt: 0.25 }}>{m.beneficio}</Typography>
                    </Box>
                    <Box sx={{ ml: 2, minWidth: 120, textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: EST_COLOR[m.estado] }}>{m.avance}%</Typography>
                      <LinearProgress variant="determinate" value={m.avance} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: EST_COLOR[m.estado] } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Iniciativa de Mejora</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Título" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo de Mejora</InputLabel>
              <Select label="Tipo de Mejora" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Proceso Impactado" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Beneficio Esperado" multiline rows={2} fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha Límite" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
