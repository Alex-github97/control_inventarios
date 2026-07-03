// QMS Module - Evaluación de Proveedores
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, Slider,
} from '@mui/material'
import { Storefront, Add, Star, TrendingUp, TrendingDown } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

interface Evaluacion { proveedor: string; nit: string; periodo: string; calidad: number; cumplimiento: number; servicio: number; tiempos: number; total: number; clasif: string; evaluado: string }
const EVALUACIONES: Evaluacion[] = [
  { proveedor: 'Transportes Sur S.A.S.', nit: '900.123.456-7', periodo: '2026-06', calidad: 88, cumplimiento: 92, servicio: 85, tiempos: 90, total: 88.75, clasif: 'bueno', evaluado: 'María García' },
  { proveedor: 'Empaques del Norte Ltda.', nit: '800.456.789-3', periodo: '2026-06', calidad: 72, cumplimiento: 68, servicio: 74, tiempos: 71, total: 71.25, clasif: 'regular', evaluado: 'Juan López' },
  { proveedor: 'Suministros Técnicos XYZ', nit: '901.234.567-8', periodo: '2026-06', calidad: 95, cumplimiento: 97, servicio: 94, tiempos: 96, total: 95.5, clasif: 'excelente', evaluado: 'Ana Ruiz' },
  { proveedor: 'Distribuidora Centro S.A.', nit: '830.567.890-1', periodo: '2026-06', calidad: 82, cumplimiento: 85, servicio: 80, tiempos: 83, total: 82.5, clasif: 'bueno', evaluado: 'Pedro Silva' },
  { proveedor: 'Combustibles del Llano', nit: '910.345.678-2', periodo: '2026-06', calidad: 91, cumplimiento: 89, servicio: 93, tiempos: 88, total: 90.25, clasif: 'excelente', evaluado: 'Carlos Torres' },
  { proveedor: 'Ferretería El Maestro', nit: '820.678.901-4', periodo: '2026-06', calidad: 55, cumplimiento: 60, servicio: 58, tiempos: 62, total: 58.75, clasif: 'deficiente', evaluado: 'Laura Díaz' },
  { proveedor: 'Mantenimiento Industrial S.A.', nit: '890.789.012-5', periodo: '2026-06', calidad: 88, cumplimiento: 91, servicio: 87, tiempos: 89, total: 88.75, clasif: 'bueno', evaluado: 'Roberto Méndez' },
  { proveedor: 'Lubricantes y Filtros Pro', nit: '870.890.123-6', periodo: '2026-06', calidad: 93, cumplimiento: 95, servicio: 91, tiempos: 94, total: 93.25, clasif: 'excelente', evaluado: 'Sandra Torres' },
]

const CLASIF_COLOR: Record<string, string> = { excelente: QMS_COLOR, bueno: '#0369A1', regular: '#D97706', deficiente: '#DC2626' }
const CLASIF_MEDAL: Record<string, string> = { excelente: '🥇', bueno: '🥈', regular: '🥉', deficiente: '' }

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}>
        <Box sx={{ width: `${value}%`, height: '100%', borderRadius: 3, bgcolor: color }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{value}</Typography>
    </Box>
  )
}

export default function QMSProveedores() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [calidad, setCalidad] = useState(80)
  const [cumplimiento, setCumplimiento] = useState(80)
  const [servicio, setServicio] = useState(80)
  const [tiempos, setTiempos] = useState(80)
  const previewTotal = ((calidad + cumplimiento + servicio + tiempos) / 4).toFixed(1)
  const previewClasif = Number(previewTotal) >= 90 ? 'excelente' : Number(previewTotal) >= 75 ? 'bueno' : Number(previewTotal) >= 60 ? 'regular' : 'deficiente'

  const ranking = [...EVALUACIONES].sort((a, b) => b.total - a.total)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Storefront sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Evaluación de Proveedores</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Calificación y seguimiento ISO 9001</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Evaluación
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Excelentes', value: EVALUACIONES.filter(e => e.clasif === 'excelente').length.toString(), color: QMS_COLOR },
            { label: 'Buenos', value: EVALUACIONES.filter(e => e.clasif === 'bueno').length.toString(), color: '#0369A1' },
            { label: 'Regulares', value: EVALUACIONES.filter(e => e.clasif === 'regular').length.toString(), color: '#D97706' },
            { label: 'Deficientes', value: EVALUACIONES.filter(e => e.clasif === 'deficiente').length.toString(), color: '#DC2626' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'text.primary', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Evaluaciones" />
          <Tab label="Ranking" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Proveedor</TableCell><TableCell>NIT</TableCell><TableCell>Período</TableCell><TableCell>Calidad</TableCell><TableCell>Cumplimiento</TableCell><TableCell>Servicio</TableCell><TableCell>Tiempos</TableCell><TableCell>Total</TableCell><TableCell>Clasificación</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {EVALUACIONES.map(e => {
                  const c = CLASIF_COLOR[e.clasif]
                  return (
                    <TableRow key={e.nit} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                      <TableCell sx={{ maxWidth: 180 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.proveedor}</Typography></TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{e.nit}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{e.periodo}</TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={e.calidad} color={e.calidad >= 90 ? QMS_COLOR : e.calidad >= 75 ? '#0369A1' : e.calidad >= 60 ? '#D97706' : '#DC2626'} /></TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={e.cumplimiento} color={e.cumplimiento >= 90 ? QMS_COLOR : e.cumplimiento >= 75 ? '#0369A1' : e.cumplimiento >= 60 ? '#D97706' : '#DC2626'} /></TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={e.servicio} color={e.servicio >= 90 ? QMS_COLOR : e.servicio >= 75 ? '#0369A1' : e.servicio >= 60 ? '#D97706' : '#DC2626'} /></TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={e.tiempos} color={e.tiempos >= 90 ? QMS_COLOR : e.tiempos >= 75 ? '#0369A1' : e.tiempos >= 60 ? '#D97706' : '#DC2626'} /></TableCell>
                      <TableCell><Typography sx={{ fontWeight: 800, color: c, fontSize: 14 }}>{e.total.toFixed(1)}</Typography></TableCell>
                      <TableCell><Chip label={`${CLASIF_MEDAL[e.clasif]} ${e.clasif}`} size="small" sx={{ fontSize: 9, height: 20, bgcolor: alpha(c, 0.15), color: c, fontWeight: 700 }} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {ranking.map((e, i) => (
              <Grid key={e.nit} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: '#111827', border: `1px solid ${alpha(CLASIF_COLOR[e.clasif], 0.25)}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 20 }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{e.proveedor}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: CLASIF_COLOR[e.clasif] }}>{e.total.toFixed(1)}</Typography>
                        <Chip label={e.clasif} size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(CLASIF_COLOR[e.clasif], 0.15), color: CLASIF_COLOR[e.clasif] }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {[['Cal.', e.calidad], ['Cum.', e.cumplimiento], ['Serv.', e.servicio], ['T.Entr.', e.tiempos]].map(([l, v]) => (
                        <Box key={l as string} sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{l}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{v}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Evaluación de Proveedor</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Proveedor" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="NIT" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Período" type="month" defaultValue="2026-06" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            {[['Calidad', calidad, setCalidad], ['Cumplimiento', cumplimiento, setCumplimiento], ['Servicio', servicio, setServicio], ['Tiempos de Entrega', tiempos, setTiempos]].map(([label, val, setter]) => (
              <Box key={label as string}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{label}: {val}</Typography>
                <Slider value={val as number} min={0} max={100} step={1} onChange={(_, v) => (setter as (v: number) => void)(v as number)} sx={{ color: QMS_COLOR }} />
              </Box>
            ))}
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(CLASIF_COLOR[previewClasif], 0.1), border: `1px solid ${alpha(CLASIF_COLOR[previewClasif], 0.3)}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: CLASIF_COLOR[previewClasif] }}>Puntaje Total: {previewTotal} → {previewClasif.toUpperCase()}</Typography>
            </Box>
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
