// QMS Module - Encuestas de Satisfacción
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, LinearProgress,
} from '@mui/material'
import { Poll, Add, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const ENCUESTAS = [
  { codigo: 'ENC-001', nombre: 'Satisfacción Clientes Q2 2026', tipo: 'satisfaccion_cliente', respuestas: 142, promedio: 4.3, nps: 72, estado: 'activa', creada: '2026-06-01' },
  { codigo: 'ENC-002', nombre: 'Clima Organizacional 2026', tipo: 'clima_organizacional', respuestas: 87, promedio: 3.8, nps: 45, estado: 'activa', creada: '2026-05-15' },
  { codigo: 'ENC-003', nombre: 'Evaluación Capacitación Conducción Defensiva', tipo: 'post_capacitacion', respuestas: 34, promedio: 4.6, nps: 85, estado: 'cerrada', creada: '2026-04-10' },
  { codigo: 'ENC-004', nombre: 'Post-Entrega – Clientes Nuevos', tipo: 'satisfaccion_cliente', respuestas: 23, promedio: 4.1, nps: 65, estado: 'activa', creada: '2026-06-15' },
  { codigo: 'ENC-005', nombre: 'Evaluación Proveedores Clave', tipo: 'proveedores', respuestas: 12, promedio: 4.4, nps: 78, estado: 'activa', creada: '2026-06-10' },
]

const TIPO_COLOR: Record<string, string> = {
  satisfaccion_cliente: '#0369A1',
  clima_organizacional: '#7C3AED',
  post_capacitacion: QMS_COLOR,
  proveedores: '#D97706',
}

const PREGUNTAS = [
  { pregunta: '¿Cómo califica la puntualidad en la entrega?', promedio: 4.2, resp: 142, dist: [5, 10, 18, 65, 44] },
  { pregunta: '¿El conductor fue profesional y amable?', promedio: 4.6, resp: 142, dist: [2, 5, 10, 35, 90] },
  { pregunta: '¿La mercancía llegó en perfectas condiciones?', promedio: 4.5, resp: 142, dist: [3, 6, 11, 40, 82] },
  { pregunta: '¿Recomendaría nuestro servicio a otros?', promedio: 4.1, resp: 142, dist: [7, 12, 22, 55, 46] },
  { pregunta: '¿Cómo califica la comunicación durante el servicio?', promedio: 3.9, resp: 142, dist: [8, 14, 28, 50, 42] },
]

export default function QMSEncuestas() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Poll sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Encuestas de Satisfacción</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · NPS · CSAT · Clima organizacional</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Encuesta
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Encuestas Activas', value: ENCUESTAS.filter(e => e.estado === 'activa').length.toString(), color: QMS_COLOR },
            { label: 'Respuestas Totales', value: ENCUESTAS.reduce((s, e) => s + e.respuestas, 0).toString(), color: '#0369A1' },
            { label: 'NPS Promedio', value: '73', color: QMS_COLOR },
            { label: 'CSAT Promedio', value: '4.3', color: '#D97706' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Encuestas" />
          <Tab label="Análisis Preguntas" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {ENCUESTAS.map(e => {
              const tc = TIPO_COLOR[e.tipo] || '#6B7280'
              return (
                <Grid key={e.codigo} size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: `1px solid ${alpha(tc, 0.22)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: tc, mb: 0.25 }}>{e.codigo}</Typography>
                          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14, lineHeight: 1.3 }}>{e.nombre}</Typography>
                          <Chip label={e.tipo.replace(/_/g, ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(tc, 0.15), color: tc, mt: 0.5 }} />
                        </Box>
                        <Chip label={e.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: e.estado === 'activa' ? alpha(QMS_COLOR, 0.15) : '#F1F5F9', color: e.estado === 'activa' ? QMS_COLOR : 'text.disabled' }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{e.promedio}</Typography>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>CSAT</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: e.nps >= 60 ? QMS_COLOR : '#D97706' }}>{e.nps}</Typography>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>NPS</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>{e.respuestas}</Typography>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>Respuestas</Typography>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0', mb: 0.5 }}>
                              <Box sx={{ width: `${(e.promedio / 5) * 100}%`, height: '100%', borderRadius: 3, bgcolor: '#D97706' }} />
                            </Box>
                            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>de 5.0 estrellas</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2, fontSize: 14 }}>Análisis por pregunta — Satisfacción Clientes Q2 2026</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {PREGUNTAS.map((p, i) => (
                  <Box key={i} sx={{ pb: 2, borderBottom: '1px solid #F9FAFB' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontSize: 13, color: 'text.primary', flex: 1 }}>{p.pregunta}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: p.promedio >= 4.5 ? QMS_COLOR : p.promedio >= 4 ? '#D97706' : '#DC2626' }}>{p.promedio.toFixed(1)}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>/ 5</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 36 }}>
                      {p.dist.map((v, j) => (
                        <Box key={j} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                          <Box sx={{ width: '80%', height: `${(v / Math.max(...p.dist)) * 32}px`, borderRadius: '3px 3px 0 0', bgcolor: j === 4 ? QMS_COLOR : j === 3 ? alpha(QMS_COLOR, 0.5) : j === 2 ? '#D97706' : j === 1 ? '#EA580C' : '#DC2626', minHeight: 2, transition: 'height 0.3s' }} />
                          <Typography sx={{ fontSize: 8, color: 'text.disabled' }}>{'★'.repeat(j + 1)}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Encuesta</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre de la Encuesta" fullWidth size="small" />
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="">
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descripción / Objetivo" multiline rows={2} fullWidth size="small" />
            <TextField label="Fecha de Cierre" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Crear Encuesta</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
