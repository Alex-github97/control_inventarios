// GRC Module — Matriz de Cumplimiento
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress,
} from '@mui/material'
import { CheckCircle, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const ESTADO_COLOR: Record<string, string> = {
  CUMPLIENDO: '#059669', PARCIAL: '#D97706', INCUMPLIMIENTO: '#DC2626',
  PENDIENTE_EVALUACION: '#6B7280', NO_APLICA: '#374151',
}

const MATRIZ = [
  { obligacion: 'Ley 1581 — Protección de Datos', proceso: 'Atención al Cliente', responsable: 'CLO', estado: 'CUMPLIENDO', puntaje: 92, ultima_eval: '2026-05-10', prox_eval: '2026-11-10' },
  { obligacion: 'Ley 1581 — Protección de Datos', proceso: 'TI / Sistemas', responsable: 'CISO', estado: 'PARCIAL', puntaje: 68, ultima_eval: '2026-04-15', prox_eval: '2026-07-15' },
  { obligacion: 'ISO 9001:2015', proceso: 'Calidad', responsable: 'Dir. Calidad', estado: 'CUMPLIENDO', puntaje: 96, ultima_eval: '2026-04-30', prox_eval: '2027-04-30' },
  { obligacion: 'ISO 9001:2015', proceso: 'Operaciones TMS', responsable: 'Dir. TMS', estado: 'CUMPLIENDO', puntaje: 88, ultima_eval: '2026-04-30', prox_eval: '2027-04-30' },
  { obligacion: 'ISO 27001:2022', proceso: 'TI / Sistemas', responsable: 'CISO', estado: 'PARCIAL', puntaje: 74, ultima_eval: '2026-03-20', prox_eval: '2026-09-20' },
  { obligacion: 'Decreto 1072 SST', proceso: 'RRHH', responsable: 'Dir. RRHH', estado: 'CUMPLIENDO', puntaje: 91, ultima_eval: '2026-05-01', prox_eval: '2026-11-01' },
  { obligacion: 'Decreto 1072 SST', proceso: 'Operaciones Bodega', responsable: 'Jefe Bodega', estado: 'PARCIAL', puntaje: 72, ultima_eval: '2026-05-01', prox_eval: '2026-08-01' },
  { obligacion: 'SARLAFT — Lavado de Activos', proceso: 'Financiero', responsable: 'CFO', estado: 'PARCIAL', puntaje: 65, ultima_eval: '2026-04-10', prox_eval: '2026-07-10' },
  { obligacion: 'BASC — Seguridad Cadena Suministro', proceso: 'Seguridad', responsable: 'Dir. Seguridad', estado: 'CUMPLIENDO', puntaje: 98, ultima_eval: '2026-02-28', prox_eval: '2027-02-28' },
  { obligacion: 'Resolución DIAN Facturación Electrónica', proceso: 'Financiero', responsable: 'Dir. Contabilidad', estado: 'INCUMPLIMIENTO', puntaje: 30, ultima_eval: '2026-06-01', prox_eval: '2026-06-30' },
]

const MARCOS_RESUMEN = [
  { marco: 'Ley 1581', total: 2, cumpliendo: 1, promedio: 80 },
  { marco: 'ISO 9001', total: 2, cumpliendo: 2, promedio: 92 },
  { marco: 'ISO 27001', total: 1, cumpliendo: 0, promedio: 74 },
  { marco: 'Decreto 1072', total: 2, cumpliendo: 1, promedio: 81 },
  { marco: 'SARLAFT', total: 1, cumpliendo: 0, promedio: 65 },
  { marco: 'BASC', total: 1, cumpliendo: 1, promedio: 98 },
  { marco: 'DIAN', total: 1, cumpliendo: 0, promedio: 30 },
]

const prom_general = Math.round(MATRIZ.reduce((s, r) => s + r.puntaje, 0) / MATRIZ.length)

export default function GRCCumplimiento() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircle sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Matriz de Cumplimiento</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · ISO 37301 · Obligaciones · Procesos · Puntajes</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Registrar Evaluación
          </Button>
        </Box>

        {/* Gauge general */}
        <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(prom_general >= 80 ? '#059669' : prom_general >= 60 ? '#D97706' : '#DC2626', 0.35)}`, borderRadius: 2, mb: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: '16px !important' }}>
            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
              <Typography sx={{ fontSize: 42, fontWeight: 800, color: prom_general >= 80 ? '#059669' : prom_general >= 60 ? '#D97706' : '#DC2626', lineHeight: 1 }}>{prom_general}%</Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Cumplimiento General</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Cumpliendo: {MATRIZ.filter(r => r.estado === 'CUMPLIENDO').length}</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Parcial: {MATRIZ.filter(r => r.estado === 'PARCIAL').length}</Typography>
                <Typography sx={{ fontSize: 12, color: '#DC2626' }}>Incumplimiento: {MATRIZ.filter(r => r.estado === 'INCUMPLIMIENTO').length}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={prom_general} sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: prom_general >= 80 ? '#059669' : '#D97706', borderRadius: 5 } }} />
            </Box>
          </CardContent>
        </Card>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Matriz Detallada" />
          <Tab label="Resumen por Marco" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Obligación</TableCell><TableCell>Proceso</TableCell><TableCell>Responsable</TableCell><TableCell>Estado</TableCell><TableCell>Puntaje</TableCell><TableCell>Última Eval.</TableCell><TableCell>Próx. Eval.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MATRIZ.map((r, i) => (
                  <TableRow key={i} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{r.obligacion}</Typography></TableCell>
                    <TableCell>{r.proceso}</TableCell>
                    <TableCell>{r.responsable}</TableCell>
                    <TableCell><Chip label={r.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[r.estado], 0.18), color: ESTADO_COLOR[r.estado] }} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={r.puntaje} sx={{ width: 60, height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: ESTADO_COLOR[r.estado] } }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: ESTADO_COLOR[r.estado] }}>{r.puntaje}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.5)' }}>{r.ultima_eval}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.5)' }}>{r.prox_eval}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {MARCOS_RESUMEN.map(m => {
              const color = m.promedio >= 80 ? '#059669' : m.promedio >= 60 ? '#D97706' : '#DC2626'
              return (
                <Grid key={m.marco} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(color, 0.3)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14 }}>{m.marco}</Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{m.promedio}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={m.promedio} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 11, color: '#059669' }}>{m.cumpliendo} cumpliendo</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{m.total} total</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar Evaluación de Cumplimiento</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Obligación</InputLabel>
              <Select label="Obligación" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['Ley 1581','ISO 9001','ISO 27001','Decreto 1072','BASC','SARLAFT'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Proceso" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Puntaje (0-100)" type="number" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Estado</InputLabel>
              <Select label="Estado" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(ESTADO_COLOR).map(e => <MenuItem key={e} value={e}>{e.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
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
