// QMS Module - Gestión de Cambios
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, Stepper, Step, StepLabel,
} from '@mui/material'
import { ChangeCircle, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const CAMBIOS = [
  { codigo: 'CHG-001', titulo: 'Cambio de proveedor principal de combustible', proceso: 'Logística / Compras', impacto: 'alto', solicitado_por: 'Dir. Operaciones', aprobado_por: 'Gerencia', estado: 'aprobado', etapa: 3, fecha: '2026-06-15', descripcion: 'Migración a Terpel como nuevo proveedor — mejor precio por litro y cobertura nacional más amplia.' },
  { codigo: 'CHG-002', titulo: 'Actualización del sistema WMS a versión 4.0', proceso: 'TI / WMS', impacto: 'critico', solicitado_por: 'Jefe TI', aprobado_por: '—', estado: 'en_revision', etapa: 2, fecha: '2026-07-01', descripcion: 'Actualización mayor que requiere ventana de mantenimiento de 6 horas y rollback plan documentado.' },
  { codigo: 'CHG-003', titulo: 'Nuevo protocolo de seguridad en cargue nocturno', proceso: 'SST / Operacional', impacto: 'medio', solicitado_por: 'Jefe SST', aprobado_por: 'RRHH / Ops', estado: 'implementacion', etapa: 4, fecha: '2026-06-20', descripcion: 'Protocolo incluye escoltas, cámaras portátiles y check-in GPS cada 30 minutos en operaciones nocturnas.' },
  { codigo: 'CHG-004', titulo: 'Cambio en política de descuentos por volumen', proceso: 'Comercial', impacto: 'medio', solicitado_por: 'Dir. Comercial', aprobado_por: 'Financiero / Gerencia', estado: 'completado', etapa: 5, fecha: '2026-05-31', descripcion: 'Revisión de tabla de descuentos para alinear con rentabilidad real por ruta y tipo de carga.' },
  { codigo: 'CHG-005', titulo: 'Migración de base de datos de PostgreSQL 14 a 16', proceso: 'TI', impacto: 'critico', solicitado_por: 'Jefe TI', aprobado_por: '—', estado: 'solicitado', etapa: 1, fecha: '2026-08-01', descripcion: 'Actualización crítica de infraestructura. Requiere plan de pruebas completo y backup verificado.' },
  { codigo: 'CHG-006', titulo: 'Rediseño de formatos de entrega de carga especial', proceso: 'Operacional / Calidad', impacto: 'bajo', solicitado_por: 'Calidad', aprobado_por: 'Ops', estado: 'implementacion', etapa: 4, fecha: '2026-06-30', descripcion: 'Nuevos formatos incluyen campos ISO 28000 y firma digital del receptor.' },
]

const IMP_COLOR: Record<string, string> = { bajo: QMS_COLOR, medio: '#D97706', alto: '#EA580C', critico: '#DC2626' }
const EST_COLOR: Record<string, string> = { solicitado: '#6B7280', en_revision: '#D97706', aprobado: '#0369A1', implementacion: '#7C3AED', completado: QMS_COLOR, rechazado: '#DC2626' }
const STEPS = ['Solicitud', 'Revisión', 'Aprobación', 'Implementación', 'Cierre']

export default function QMSCambios() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [selected, setSelected] = useState<typeof CAMBIOS[0] | null>(null)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ChangeCircle sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Gestión de Cambios</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>QMS · Control de cambios organizacionales</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Solicitar Cambio
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'En Revisión', value: CAMBIOS.filter(c => c.estado === 'en_revision').length.toString(), color: '#D97706' },
            { label: 'Aprobados', value: CAMBIOS.filter(c => c.estado === 'aprobado').length.toString(), color: '#0369A1' },
            { label: 'En Implementación', value: CAMBIOS.filter(c => c.estado === 'implementacion').length.toString(), color: '#7C3AED' },
            { label: 'Completados', value: CAMBIOS.filter(c => c.estado === 'completado').length.toString(), color: QMS_COLOR },
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
          <Tab label="Lista de Cambios" />
          <Tab label={`Detalle ${selected ? `— ${selected.codigo}` : ''}`} />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Título</TableCell><TableCell>Proceso</TableCell><TableCell>Impacto</TableCell><TableCell>Solicitado</TableCell><TableCell>Aprobado</TableCell><TableCell>Etapa</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CAMBIOS.map(c => (
                  <TableRow key={c.codigo} onClick={() => { setSelected(c); setTab(1) }} sx={{ cursor: 'pointer', '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{c.codigo}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titulo}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.proceso}</TableCell>
                    <TableCell><Chip label={c.impacto} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(IMP_COLOR[c.impacto], 0.15), color: IMP_COLOR[c.impacto], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.solicitado_por}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.aprobado_por}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {STEPS.map((_, i) => (
                          <Box key={i} sx={{ width: 14, height: 4, borderRadius: 2, bgcolor: i < c.etapa ? QMS_COLOR : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={c.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[c.estado], 0.15), color: EST_COLOR[c.estado], fontWeight: 700 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {selected ? (
            <Box>
              <Card sx={{ bgcolor: '#111827', border: `1px solid ${alpha(IMP_COLOR[selected.impacto], 0.25)}`, borderRadius: 2, mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{selected.codigo}</Typography>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#FFF', mt: 0.25 }}>{selected.titulo}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                        <Chip label={selected.proceso} size="small" sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }} />
                        <Chip label={`Impacto: ${selected.impacto}`} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(IMP_COLOR[selected.impacto], 0.15), color: IMP_COLOR[selected.impacto], fontWeight: 700 }} />
                      </Box>
                    </Box>
                    <Chip label={selected.estado.replace('_', ' ')} sx={{ bgcolor: alpha(EST_COLOR[selected.estado], 0.15), color: EST_COLOR[selected.estado], fontWeight: 700 }} />
                  </Box>

                  <Stepper activeStep={selected.etapa - 1} sx={{ mb: 2, '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.5)', fontSize: 12 }, '& .MuiStepLabel-label.Mui-active': { color: QMS_COLOR }, '& .MuiStepLabel-label.Mui-completed': { color: QMS_COLOR } }}>
                    {STEPS.map(s => (
                      <Step key={s}>
                        <StepLabel StepIconProps={{ sx: { color: 'rgba(255,255,255,0.15)', '&.Mui-active': { color: QMS_COLOR }, '&.Mui-completed': { color: QMS_COLOR } } }}>{s}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mb: 2 }}>{selected.descripcion}</Typography>

                  <Grid container spacing={2}>
                    {[['Solicitado por', selected.solicitado_por], ['Aprobado por', selected.aprobado_por], ['Fecha propuesta', selected.fecha]].map(([l, v]) => (
                      <Grid key={l as string} size={{ xs: 12, sm: 4 }}>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', mb: 0.25 }}>{l}</Typography>
                        <Typography sx={{ fontSize: 13, color: '#FFF', fontWeight: 600 }}>{v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
              <Button variant="outlined" size="small" onClick={() => setTab(0)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>← Volver a la lista</Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ChangeCircle sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.3)' }}>Selecciona un cambio de la lista para ver su detalle</Typography>
            </Box>
          )}
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Solicitar Cambio</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Título del Cambio" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Proceso Afectado" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Impacto</InputLabel>
              <Select label="Impacto" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['bajo', 'medio', 'alto', 'critico'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descripción del Cambio" multiline rows={3} fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Justificación / Beneficio" multiline rows={2} fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha Propuesta de Implementación" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Enviar Solicitud</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
