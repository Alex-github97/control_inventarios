// GRC Module — Continuidad del Negocio (ISO 22301)
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress,
} from '@mui/material'
import { Router, Add, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const CRIT_COLOR: Record<string, string> = {
  critica: '#DC2626', alta: '#EA580C', media: '#D97706', baja: '#059669',
}

const BIA = [
  { proceso: 'Despacho y Transporte de Mercancía', criticidad: 'critica', rto_h: 2, rpo_h: 1, impacto_h: 85000, sistemas: 'TMS, WMS, GPS', responsable: 'Dir. TMS', plan: 'activo' },
  { proceso: 'Facturación y Cartera', criticidad: 'critica', rto_h: 4, rpo_h: 2, impacto_h: 45000, sistemas: 'ERP, DIAN', responsable: 'CFO', plan: 'activo' },
  { proceso: 'Gestión de Inventarios (WMS)', criticidad: 'alta', rto_h: 8, rpo_h: 4, impacto_h: 30000, sistemas: 'WMS, ERP', responsable: 'Dir. Logística', plan: 'activo' },
  { proceso: 'Atención al Cliente y PQRS', criticidad: 'alta', rto_h: 12, rpo_h: 8, impacto_h: 15000, sistemas: 'CRM, Email', responsable: 'Dir. Servicio', plan: 'activo' },
  { proceso: 'Nómina y Recursos Humanos', criticidad: 'media', rto_h: 24, rpo_h: 24, impacto_h: 8000, sistemas: 'HCM', responsable: 'Dir. RRHH', plan: 'activo' },
  { proceso: 'Gestión Documental (DMS)', criticidad: 'media', rto_h: 48, rpo_h: 24, impacto_h: 5000, sistemas: 'DMS', responsable: 'Dir. GRC', plan: 'revision' },
  { proceso: 'Marketing y Comunicaciones', criticidad: 'baja', rto_h: 72, rpo_h: 48, impacto_h: 1000, sistemas: 'CMS, Email', responsable: 'Dir. Marketing', plan: 'sin_plan' },
]

const SIMULACROS = [
  { nombre: 'Prueba Failover Datacenter Alterno', proceso: 'TI General', fecha: '2026-03-15', tipo: 'Técnico', resultado: 'exitoso', participantes: 12, rto_logrado: 1.8 },
  { nombre: 'Simulacro Evacuación Bodega Central', proceso: 'Seguridad Física', fecha: '2026-04-22', tipo: 'Evacuación', resultado: 'exitoso', participantes: 85, rto_logrado: 0.25 },
  { nombre: 'Prueba Contingencia Sistema TMS', proceso: 'TMS', fecha: '2026-05-10', tipo: 'Aplicación', resultado: 'parcial', participantes: 18, rto_logrado: 3.5 },
]

export default function GRCContinuidad() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Router sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Continuidad del Negocio</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · ISO 22301 · BIA · RTO · RPO · Simulacros</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nuevo Proceso BIA
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Procesos Críticos', value: BIA.filter(b => b.criticidad === 'critica').length, color: '#DC2626' },
            { label: 'Con Plan Activo',   value: BIA.filter(b => b.plan === 'activo').length,         color: '#059669' },
            { label: 'Sin Plan',          value: BIA.filter(b => b.plan === 'sin_plan').length,       color: '#DC2626' },
            { label: 'Simulacros 2026',   value: SIMULACROS.length,                                    color: GRC_COLOR },
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
          <Tab label="Análisis de Impacto (BIA)" />
          <Tab label="Simulacros" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Proceso</TableCell><TableCell>Criticidad</TableCell><TableCell>RTO</TableCell><TableCell>RPO</TableCell><TableCell>Impacto/h</TableCell><TableCell>Sistemas Críticos</TableCell><TableCell>Plan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {BIA.map(b => (
                  <TableRow key={b.proceso} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600 }}>{b.proceso}</Typography><Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>{b.responsable}</Typography></TableCell>
                    <TableCell><Chip label={b.criticidad.toUpperCase()} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(CRIT_COLOR[b.criticidad], 0.18), color: CRIT_COLOR[b.criticidad] }} /></TableCell>
                    <TableCell><Typography sx={{ fontWeight: 700, color: b.rto_h <= 4 ? '#DC2626' : b.rto_h <= 12 ? '#D97706' : '#059669' }}>{b.rto_h}h</Typography></TableCell>
                    <TableCell><Typography sx={{ fontWeight: 700, color: b.rpo_h <= 2 ? '#DC2626' : b.rpo_h <= 8 ? '#D97706' : '#059669' }}>{b.rpo_h}h</Typography></TableCell>
                    <TableCell sx={{ color: '#DC2626', fontWeight: 700 }}>${b.impacto_h.toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{b.sistemas}</TableCell>
                    <TableCell>
                      <Chip label={b.plan.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(b.plan === 'activo' ? '#059669' : b.plan === 'revision' ? '#D97706' : '#DC2626', 0.18), color: b.plan === 'activo' ? '#059669' : b.plan === 'revision' ? '#D97706' : '#DC2626' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {SIMULACROS.map(s => (
              <Grid key={s.nombre} size={{ xs: 12, md: 4 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Chip label={s.tipo} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(GRC_COLOR, 0.18), color: GRC_COLOR }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 14, color: s.resultado === 'exitoso' ? '#059669' : '#D97706' }} />
                        <Chip label={s.resultado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(s.resultado === 'exitoso' ? '#059669' : '#D97706', 0.18), color: s.resultado === 'exitoso' ? '#059669' : '#D97706' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 0.5, lineHeight: 1.3 }}>{s.nombre}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', mb: 1.5 }}>{s.proceso} · {s.fecha}</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Participantes</Typography><Typography sx={{ fontSize: 14, fontWeight: 700, color: GRC_COLOR }}>{s.participantes}</Typography></Box>
                      <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>RTO Logrado</Typography><Typography sx={{ fontSize: 14, fontWeight: 700, color: s.rto_logrado <= 2 ? '#059669' : '#D97706' }}>{s.rto_logrado}h</Typography></Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Proceso — Análisis de Impacto</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Proceso" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Criticidad</InputLabel>
              <Select label="Criticidad" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(CRIT_COLOR).map(c => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="RTO (horas)" type="number" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="RPO (horas)" type="number" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
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
