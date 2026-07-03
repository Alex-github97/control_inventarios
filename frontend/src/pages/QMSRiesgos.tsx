// QMS Module - Riesgos Operacionales
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, Slider,
} from '@mui/material'
import { Dangerous, Add, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const RIESGOS = [
  { codigo: 'RSK-001', nombre: 'Accidente fatal en operación de carga', proceso: 'Operacional', prob: 5, imp: 5, nivel: 25, prioridad: 'CRITICA', controles: 'EPP, capacitación, señalización', responsable: 'Jefe SST', estado: 'activo' },
  { codigo: 'RSK-002', nombre: 'Pérdida de mercancía por robo en tránsito', proceso: 'TMS', prob: 4, imp: 4, nivel: 16, prioridad: 'CRITICA', controles: 'GPS, escoltas, rutas seguras', responsable: 'Jefe TMS', estado: 'activo' },
  { codigo: 'RSK-003', nombre: 'Falla del sistema de trazabilidad WMS', proceso: 'WMS', prob: 3, imp: 4, nivel: 12, prioridad: 'ALTA', controles: 'Backups, redundancia de servidor', responsable: 'TI', estado: 'activo' },
  { codigo: 'RSK-004', nombre: 'Incumplimiento normativa sanitaria INVIMA', proceso: 'Operacional', prob: 2, imp: 3, nivel: 6, prioridad: 'MEDIA', controles: 'Auditorías periódicas, capacitación', responsable: 'Calidad', estado: 'activo' },
  { codigo: 'RSK-005', nombre: 'Incendio en bodega de almacenamiento', proceso: 'WMS', prob: 1, imp: 5, nivel: 5, prioridad: 'MEDIA', controles: 'Extintores, brigada, detectores', responsable: 'Jefe SST', estado: 'activo' },
  { codigo: 'RSK-006', nombre: 'Pérdida de conductor clave por accidente', proceso: 'RRHH', prob: 2, imp: 3, nivel: 6, prioridad: 'MEDIA', controles: 'Pólizas, base de conductores backup', responsable: 'RRHH', estado: 'activo' },
  { codigo: 'RSK-007', nombre: 'Fluctuación de precios de combustible', proceso: 'Financiero', prob: 4, imp: 2, nivel: 8, prioridad: 'MEDIA', controles: 'Contratos precio fijo, hedging', responsable: 'Financiero', estado: 'activo' },
  { codigo: 'RSK-008', nombre: 'Vencimiento masivo de licencias de conducción', proceso: 'RRHH', prob: 2, imp: 2, nivel: 4, prioridad: 'BAJA', controles: 'Sistema de alertas automáticas HCM', responsable: 'RRHH', estado: 'activo' },
]

const PRIOR_COLOR: Record<string, string> = { CRITICA: '#DC2626', ALTA: '#EA580C', MEDIA: '#D97706', BAJA: QMS_COLOR }

function nivelColor(n: number) {
  if (n >= 15) return '#DC2626'
  if (n >= 10) return '#EA580C'
  if (n >= 5)  return '#D97706'
  return QMS_COLOR
}

function cellColor(p: number, i: number) {
  const n = p * i
  if (n >= 15) return alpha('#DC2626', 0.35)
  if (n >= 10) return alpha('#EA580C', 0.3)
  if (n >= 5)  return alpha('#D97706', 0.25)
  return alpha(QMS_COLOR, 0.18)
}

export default function QMSRiesgos() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [prob, setProb] = useState(3)
  const [imp, setImp] = useState(3)
  const nivel = prob * imp

  const PROB_LABELS = ['', 'Rara', 'Improbable', 'Posible', 'Probable', 'Casi Seguro']
  const IMP_LABELS  = ['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico']

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Dangerous sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Riesgos Operacionales</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Gestión de riesgos ISO 31000</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nuevo Riesgo
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Riesgos Críticos', value: '2', color: '#DC2626', icon: <Warning sx={{ fontSize: 18 }} /> },
            { label: 'Riesgos Altos', value: '5', color: '#EA580C' },
            { label: 'Sin Plan Mitigación', value: '3', color: '#D97706' },
            { label: 'Revisión Próxima', value: '4', color: '#0369A1' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'text.primary', border: `1px solid ${alpha(k.color, 0.35)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Matriz de Riesgos" />
          <Tab label="Lista de Riesgos" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Matriz de Riesgos 5×5</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Eje Y label */}
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center', width: 20 }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.08em' }}>PROBABILIDAD →</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  {/* Eje X labels */}
                  <Box sx={{ display: 'flex', ml: 6, mb: 0.5 }}>
                    {IMP_LABELS.slice(1).map(l => (
                      <Box key={l} sx={{ flex: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{l}</Typography></Box>
                    ))}
                  </Box>
                  {/* Filas de la matriz */}
                  {[5, 4, 3, 2, 1].map(p => (
                    <Box key={p} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 9, color: 'text.secondary', width: 48, textAlign: 'right', pr: 1, flexShrink: 0 }}>{PROB_LABELS[p]}</Typography>
                      {[1, 2, 3, 4, 5].map(i => {
                        const riesgosAqui = RIESGOS.filter(r => r.prob === p && r.imp === i)
                        return (
                          <Box key={i} sx={{ flex: 1, minHeight: 52, bgcolor: cellColor(p, i), border: '1px solid #E5E7EB', borderRadius: 1, display: 'flex', flexWrap: 'wrap', gap: 0.25, p: 0.5, alignContent: 'flex-start' }}>
                            {riesgosAqui.map(r => (
                              <Chip key={r.codigo} label={r.codigo} size="small" sx={{ fontSize: 8, height: 16, bgcolor: alpha(nivelColor(r.nivel), 0.4), color: 'text.primary', fontWeight: 700 }} />
                            ))}
                          </Box>
                        )
                      })}
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', ml: 6, mt: 0.5 }}><Typography sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: '0.08em' }}>IMPACTO →</Typography></Box>
                  {/* Leyenda */}
                  <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                    {[{ label: 'BAJO (1-4)', c: QMS_COLOR }, { label: 'MEDIO (5-9)', c: '#D97706' }, { label: 'ALTO (10-14)', c: '#EA580C' }, { label: 'CRÍTICO (15-25)', c: '#DC2626' }].map(l => (
                      <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: alpha(l.c, 0.5) }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{l.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Proceso</TableCell><TableCell>P</TableCell><TableCell>I</TableCell><TableCell>Nivel</TableCell><TableCell>Prioridad</TableCell><TableCell>Responsable</TableCell><TableCell>Controles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RIESGOS.map(r => (
                  <TableRow key={r.codigo} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{r.codigo}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{r.proceso}</TableCell>
                    <TableCell><Chip label={r.prob} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#F1F5F9', color: 'text.primary' }} /></TableCell>
                    <TableCell><Chip label={r.imp} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#F1F5F9', color: 'text.primary' }} /></TableCell>
                    <TableCell><Typography sx={{ fontWeight: 800, color: nivelColor(r.nivel), fontSize: 14 }}>{r.nivel}</Typography></TableCell>
                    <TableCell><Chip label={r.prioridad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(PRIOR_COLOR[r.prioridad], 0.15), color: PRIOR_COLOR[r.prioridad], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{r.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11, maxWidth: 180 }}><Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{r.controles}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Riesgo</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre del Riesgo" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Descripción" multiline rows={2} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>Probabilidad: {prob} — {PROB_LABELS[prob]}</Typography>
              <Slider value={prob} min={1} max={5} step={1} marks onChange={(_, v) => setProb(v as number)} sx={{ color: QMS_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>Impacto: {imp} — {IMP_LABELS[imp]}</Typography>
              <Slider value={imp} min={1} max={5} step={1} marks onChange={(_, v) => setImp(v as number)} sx={{ color: QMS_COLOR }} />
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(nivelColor(nivel), 0.1), border: `1px solid ${alpha(nivelColor(nivel), 0.3)}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: nivelColor(nivel) }}>Nivel de Riesgo: {nivel} — {nivel >= 15 ? 'CRÍTICO' : nivel >= 10 ? 'ALTO' : nivel >= 5 ? 'MEDIO' : 'BAJO'}</Typography>
            </Box>
            <TextField label="Controles Existentes" multiline rows={2} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
