// GRC Module — Hallazgos y Planes de Acción
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress,
} from '@mui/material'
import { BugReport, Add, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const SEV_COLOR: Record<string, string> = {
  CRITICA: '#DC2626', ALTA: '#EA580C', MEDIA: '#D97706', BAJA: '#059669',
}
const ESTADO_COLOR: Record<string, string> = {
  ABIERTO: '#DC2626', EN_PROCESO: '#D97706', CERRADO: '#059669', VENCIDO: '#7C3AED',
}

const HALLAZGOS = [
  { codigo: 'HAL-2026-001', auditoria: 'AUD-2026-006', titulo: 'Facturas sin soporte electrónico DIAN', severidad: 'ALTA', proceso: 'Financiero', responsable: 'Dir. Contabilidad', fecha_limite: '2026-07-15', estado: 'EN_PROCESO', avance: 45 },
  { codigo: 'HAL-2026-002', auditoria: 'AUD-2026-006', titulo: 'Diferencias en conciliación bancaria trimestral', severidad: 'MEDIA', proceso: 'Financiero', responsable: 'CFO', fecha_limite: '2026-07-31', estado: 'EN_PROCESO', avance: 65 },
  { codigo: 'HAL-2026-003', auditoria: 'AUD-2026-001', titulo: 'Procedimiento de control de calidad desactualizado', severidad: 'BAJA', proceso: 'Calidad', responsable: 'Dir. Calidad', fecha_limite: '2026-06-30', estado: 'CERRADO', avance: 100 },
  { codigo: 'HAL-2026-004', auditoria: 'AUD-2026-005', titulo: 'KYC incompleto en 3 clientes corporativos', severidad: 'CRITICA', proceso: 'Comercial', responsable: 'CLO', fecha_limite: '2026-06-25', estado: 'VENCIDO', avance: 30 },
  { codigo: 'HAL-2026-005', auditoria: 'AUD-2026-002', titulo: 'Cámaras sin cobertura en zona de carga', severidad: 'ALTA', proceso: 'Seguridad', responsable: 'Dir. Seguridad', fecha_limite: '2026-08-01', estado: 'ABIERTO', avance: 0 },
  { codigo: 'HAL-2026-006', auditoria: 'AUD-2026-001', titulo: 'Calibración vencida de básculas en bodega 2', severidad: 'MEDIA', proceso: 'WMS', responsable: 'Jefe Bodega', fecha_limite: '2026-07-01', estado: 'EN_PROCESO', avance: 80 },
  { codigo: 'HAL-2026-007', auditoria: 'AUD-2026-006', titulo: 'Retenciones no aplicadas en 2 contratos', severidad: 'ALTA', proceso: 'Financiero', responsable: 'Dir. Contabilidad', fecha_limite: '2026-07-20', estado: 'ABIERTO', avance: 0 },
  { codigo: 'HAL-2026-008', auditoria: 'AUD-2026-005', titulo: 'Matriz de riesgos SARLAFT sin actualizar', severidad: 'ALTA', proceso: 'Compliance', responsable: 'CLO', fecha_limite: '2026-07-10', estado: 'EN_PROCESO', avance: 55 },
]

const PLANES: Record<string, {accion: string; responsable: string; fecha: string; avance: number; estado: string}[]> = {
  'HAL-2026-001': [
    { accion: 'Configurar integración con portal DIAN', responsable: 'CTO', fecha: '2026-06-30', avance: 70, estado: 'en_proceso' },
    { accion: 'Capacitación equipo de facturación', responsable: 'Dir. Contabilidad', fecha: '2026-07-10', avance: 20, estado: 'en_proceso' },
  ],
  'HAL-2026-004': [
    { accion: 'Solicitar documentación a clientes', responsable: 'CLO', fecha: '2026-06-20', avance: 60, estado: 'en_proceso' },
    { accion: 'Evaluar riesgo y reportar a Superfinanciera', responsable: 'CLO', fecha: '2026-06-25', avance: 0, estado: 'pendiente' },
  ],
}

export default function GRCHallazgos() {
  const [tab, setTab] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const hallazgo = HALLAZGOS.find(h => h.codigo === selected) || null

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BugReport sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Hallazgos & Planes de Acción</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Remediación · Seguimiento · Cierre</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nuevo Hallazgo
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Abiertos',    value: HALLAZGOS.filter(h => h.estado === 'ABIERTO').length,     color: '#DC2626' },
            { label: 'En Proceso',  value: HALLAZGOS.filter(h => h.estado === 'EN_PROCESO').length,  color: '#D97706' },
            { label: 'Vencidos',    value: HALLAZGOS.filter(h => h.estado === 'VENCIDO').length,     color: '#7C3AED' },
            { label: 'Cerrados',    value: HALLAZGOS.filter(h => h.estado === 'CERRADO').length,     color: '#059669' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Listado de Hallazgos" />
          <Tab label={`Detalle${hallazgo ? ` — ${hallazgo.codigo}` : ''}`} disabled={!hallazgo} />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Hallazgo</TableCell><TableCell>Severidad</TableCell><TableCell>Proceso</TableCell><TableCell>Responsable</TableCell><TableCell>Avance</TableCell><TableCell>Límite</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {HALLAZGOS.map(h => (
                  <TableRow key={h.codigo} onClick={() => { setSelected(h.codigo); setTab(1) }} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(109,40,217,0.06)' }, '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{h.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{h.titulo}</Typography></TableCell>
                    <TableCell><Chip label={h.severidad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(SEV_COLOR[h.severidad], 0.18), color: SEV_COLOR[h.severidad] }} /></TableCell>
                    <TableCell>{h.proceso}</TableCell>
                    <TableCell>{h.responsable}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LinearProgress variant="determinate" value={h.avance} sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: h.avance === 100 ? '#059669' : GRC_COLOR } }} />
                        <Typography sx={{ fontSize: 10.5 }}>{h.avance}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{h.fecha_limite}</TableCell>
                    <TableCell><Chip label={h.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[h.estado], 0.18), color: ESTADO_COLOR[h.estado] }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {hallazgo && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(SEV_COLOR[hallazgo.severidad], 0.35)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', mb: 0.5 }}>{hallazgo.codigo} · Auditoría {hallazgo.auditoria}</Typography>
                        <Typography sx={{ fontWeight: 800, color: '#FFF', fontSize: 16 }}>{hallazgo.titulo}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={hallazgo.severidad} sx={{ bgcolor: alpha(SEV_COLOR[hallazgo.severidad], 0.2), color: SEV_COLOR[hallazgo.severidad], fontWeight: 700 }} />
                        <Chip label={hallazgo.estado.replace('_', ' ')} sx={{ bgcolor: alpha(ESTADO_COLOR[hallazgo.estado], 0.2), color: ESTADO_COLOR[hallazgo.estado] }} />
                      </Box>
                    </Box>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      {[['Proceso', hallazgo.proceso], ['Responsable', hallazgo.responsable], ['Fecha Límite', hallazgo.fecha_limite]].map(([l, v]) => (
                        <Grid key={l} size={{ xs: 4 }}>
                          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{l}</Typography>
                          <Typography sx={{ fontSize: 13, color: '#FFF', fontWeight: 600 }}>{v}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Avance Global</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: hallazgo.avance === 100 ? '#059669' : GRC_COLOR }}>{hallazgo.avance}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={hallazgo.avance} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: hallazgo.avance === 100 ? '#059669' : GRC_COLOR, borderRadius: 4 } }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 1.5 }}>Planes de Acción</Typography>
                {(PLANES[hallazgo.codigo] || []).map((p, i) => (
                  <Card key={i} sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, mb: 1.5 }}>
                    <CardContent sx={{ p: '14px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: 13, color: '#FFF', fontWeight: 600, flex: 1, mr: 2 }}>{p.accion}</Typography>
                        <Chip label={p.estado} size="small" sx={{ fontSize: 10, height: 20, bgcolor: p.estado === 'en_proceso' ? alpha('#D97706', 0.18) : 'rgba(255,255,255,0.08)', color: p.estado === 'en_proceso' ? '#D97706' : 'rgba(255,255,255,0.5)' }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                        <Box><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Responsable</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{p.responsable}</Typography></Box>
                        <Box><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Fecha</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{p.fecha}</Typography></Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={p.avance} sx={{ flex: 1, height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: p.avance === 100 ? '#059669' : GRC_COLOR } }} />
                        <Typography sx={{ fontSize: 11, color: GRC_COLOR, fontWeight: 700, minWidth: 35 }}>{p.avance}%</Typography>
                        {p.avance === 100 && <CheckCircle sx={{ fontSize: 16, color: '#059669' }} />}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                {(!PLANES[hallazgo.codigo] || PLANES[hallazgo.codigo].length === 0) && (
                  <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Sin planes de acción registrados para este hallazgo.</Box>
                )}
                <Button startIcon={<Add />} size="small" variant="outlined" sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4), mt: 1 }}>
                  Agregar Plan de Acción
                </Button>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Hallazgo</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Título del Hallazgo" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Severidad</InputLabel>
              <Select label="Severidad" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(SEV_COLOR).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Proceso" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha Límite" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
