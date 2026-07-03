// QMS Module - Motor de Indicadores de Calidad
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, LinearProgress,
} from '@mui/material'
import { Analytics, Add, TrendingUp, TrendingDown } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

interface Indicador { nombre: string; proceso: string; valor: number; meta: number; unidad: string; variacion: number; semaforo: 'verde' | 'amarillo' | 'rojo'; sparkline: number[] }
const INDICADORES: Indicador[] = [
  { nombre: 'OTIF Transporte', proceso: 'TMS', valor: 94.2, meta: 95, unidad: '%', variacion: -0.8, semaforo: 'amarillo', sparkline: [92, 93, 91, 94, 93, 94] },
  { nombre: 'Índice de Rechazo', proceso: 'WMS', valor: 0.8, meta: 1.0, unidad: '%', variacion: -0.2, semaforo: 'verde', sparkline: [1.2, 1.0, 0.9, 0.8, 0.9, 0.8] },
  { nombre: 'Satisfacción Cliente', proceso: 'QMS', valor: 4.3, meta: 4.5, unidad: '/5', variacion: 0.1, semaforo: 'amarillo', sparkline: [4.0, 4.1, 4.2, 4.3, 4.2, 4.3] },
  { nombre: 'NC Cerradas en Plazo', proceso: 'QMS', valor: 87, meta: 90, unidad: '%', variacion: 3, semaforo: 'amarillo', sparkline: [80, 82, 84, 85, 86, 87] },
  { nombre: 'Efectividad CAPA', proceso: 'QMS', valor: 78, meta: 85, unidad: '%', variacion: -2, semaforo: 'rojo', sparkline: [82, 80, 79, 78, 80, 78] },
  { nombre: 'Proveedores Aprobados', proceso: 'Compras', valor: 92, meta: 90, unidad: '%', variacion: 2, semaforo: 'verde', sparkline: [88, 89, 90, 91, 91, 92] },
  { nombre: 'Accidentes SST', proceso: 'RRHH', valor: 0, meta: 0, unidad: 'und', variacion: 0, semaforo: 'verde', sparkline: [0, 0, 1, 0, 0, 0] },
  { nombre: 'Costo No Calidad', proceso: 'Financiero', valor: 12.4, meta: 15, unidad: 'M$', variacion: -1.2, semaforo: 'verde', sparkline: [14, 13.5, 13, 12.8, 12.5, 12.4] },
]

const SEMAFORO_COLOR = { verde: QMS_COLOR, amarillo: '#D97706', rojo: '#DC2626' }

const MEDICIONES = [
  { indicador: 'OTIF Transporte', periodo: '2026-06', valor: '94.2%', meta: '95%', cumple: false, var: '-0.8%', registrado: 'Sistema TMS' },
  { indicador: 'Índice de Rechazo', periodo: '2026-06', valor: '0.8%', meta: '1.0%', cumple: true, var: '-0.2%', registrado: 'Jefe WMS' },
  { indicador: 'Satisfacción Cliente', periodo: '2026-06', valor: '4.3/5', meta: '4.5/5', cumple: false, var: '+0.1', registrado: 'Encuestas QMS' },
  { indicador: 'Efectividad CAPA', periodo: '2026-06', valor: '78%', meta: '85%', cumple: false, var: '-2%', registrado: 'Dir. Calidad' },
  { indicador: 'Proveedores Aprobados', periodo: '2026-06', valor: '92%', meta: '90%', cumple: true, var: '+2%', registrado: 'Compras' },
]

export default function QMSIndicadores() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Analytics sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Indicadores de Calidad</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Motor de KPIs · Junio 2026</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField type="month" defaultValue="2026-06" size="small" sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', fontSize: 13, '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
              Nuevo Indicador
            </Button>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Tablero de KPIs" />
          <Tab label="Registro de Mediciones" />
          <Tab label="Metas" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {INDICADORES.map(ind => {
              const color = SEMAFORO_COLOR[ind.semaforo]
              const pct   = ind.meta > 0 ? Math.min((ind.valor / ind.meta) * 100, 100) : 100
              const spMax = Math.max(...ind.sparkline)
              return (
                <Grid key={ind.nombre} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card sx={{ bgcolor: 'background.paper', border: `1px solid ${alpha(color, 0.35)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '14px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, mt: 0.5 }} />
                        <Chip label={ind.proceso} size="small" sx={{ fontSize: 9, height: 16 }} />
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{ind.nombre}</Typography>
                      <Typography sx={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{ind.valor}{ind.unidad}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>Meta: {ind.meta}{ind.unidad}</Typography>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#F1F5F9', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                      {/* Mini sparkline */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 24 }}>
                        {ind.sparkline.map((v, i) => (
                          <Box key={i} sx={{ flex: 1, height: `${Math.max((v / spMax) * 24, 4)}px`, bgcolor: alpha(color, i === ind.sparkline.length - 1 ? 0.85 : 0.35), borderRadius: '2px 2px 0 0' }} />
                        ))}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                        {ind.variacion >= 0 ? <TrendingUp sx={{ fontSize: 12, color: QMS_COLOR }} /> : <TrendingDown sx={{ fontSize: 12, color: '#DC2626' }} />}
                        <Typography sx={{ fontSize: 10.5, color: ind.variacion >= 0 ? QMS_COLOR : '#DC2626' }}>{ind.variacion > 0 ? '+' : ''}{ind.variacion}{ind.unidad} vs mes ant.</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button startIcon={<Add />} size="small" variant="outlined" onClick={() => setOpenDialog(true)} sx={{ color: QMS_COLOR, borderColor: alpha(QMS_COLOR, 0.4) }}>
              Registrar Medición
            </Button>
          </Box>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Indicador</TableCell><TableCell>Período</TableCell><TableCell>Valor</TableCell><TableCell>Meta</TableCell><TableCell>Cumple</TableCell><TableCell>Variación</TableCell><TableCell>Registrado por</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MEDICIONES.map((m, i) => (
                  <TableRow key={i} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12.5 } }}>
                    <TableCell>{m.indicador}</TableCell>
                    <TableCell>{m.periodo}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{m.valor}</TableCell>
                    <TableCell>{m.meta}</TableCell>
                    <TableCell><Chip label={m.cumple ? 'Sí' : 'No'} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(m.cumple ? QMS_COLOR : '#DC2626', 0.15), color: m.cumple ? QMS_COLOR : '#DC2626' }} /></TableCell>
                    <TableCell sx={{ color: m.var.startsWith('-') ? '#DC2626' : QMS_COLOR }}>{m.var}</TableCell>
                    <TableCell>{m.registrado}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Indicador</TableCell><TableCell>Período</TableCell><TableCell>Meta</TableCell><TableCell>Mín</TableCell><TableCell>Máx</TableCell><TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {INDICADORES.map(ind => (
                  <TableRow key={ind.nombre} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12.5 } }}>
                    <TableCell>{ind.nombre}</TableCell>
                    <TableCell>2026-06</TableCell>
                    <TableCell sx={{ color: QMS_COLOR, fontWeight: 700 }}>{ind.meta}{ind.unidad}</TableCell>
                    <TableCell>{(ind.meta * 0.9).toFixed(1)}{ind.unidad}</TableCell>
                    <TableCell>{(ind.meta * 1.05).toFixed(1)}{ind.unidad}</TableCell>
                    <TableCell><Button size="small" sx={{ fontSize: 11, color: QMS_COLOR }}>Editar</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar Medición</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <FormControl size="small">
              <InputLabel sx={{ color: 'text.secondary' }}>Indicador</InputLabel>
              <Select label="Indicador" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } }}>
                {INDICADORES.map(i => <MenuItem key={i.nombre} value={i.nombre}>{i.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Período" type="month" defaultValue="2026-06" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Valor" type="number" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Observaciones" multiline rows={2} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
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
