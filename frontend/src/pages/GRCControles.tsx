// GRC Module — Gestión de Controles
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress,
} from '@mui/material'
import { Shield, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const TIPO_COLOR: Record<string, string> = {
  PREVENTIVO: '#059669', DETECTIVO: '#0891B2', CORRECTIVO: '#D97706', COMPENSATORIO: GRC_COLOR,
}
const EFECTIVIDAD_COLOR: Record<string, string> = {
  EFECTIVO: '#059669', PARCIAL: '#D97706', INEFECTIVO: '#DC2626', NO_EVALUADO: '#6B7280',
}

const CONTROLES = [
  { codigo: 'CTL-2026-001', nombre: 'Control de Acceso Biométrico a Bodegas', tipo: 'PREVENTIVO', efectividad: 'EFECTIVO', proceso: 'Seguridad Física', responsable: 'Dir. Seguridad', automatizado: true, frecuencia: 'Continuo', prox_eval: '2026-09-01' },
  { codigo: 'CTL-2026-002', nombre: 'Revisión Mensual de Accesos a Sistemas', tipo: 'DETECTIVO', efectividad: 'EFECTIVO', proceso: 'TI', responsable: 'CISO', automatizado: false, frecuencia: 'Mensual', prox_eval: '2026-07-01' },
  { codigo: 'CTL-2026-003', nombre: 'Monitoreo SIEM — Alertas de Seguridad', tipo: 'DETECTIVO', efectividad: 'EFECTIVO', proceso: 'Ciberseguridad', responsable: 'CISO', automatizado: true, frecuencia: 'Continuo', prox_eval: '2026-12-01' },
  { codigo: 'CTL-2026-004', nombre: 'Segregación de Funciones Tesorería', tipo: 'PREVENTIVO', efectividad: 'EFECTIVO', proceso: 'Financiero', responsable: 'CFO', automatizado: false, frecuencia: 'Continuo', prox_eval: '2026-08-01' },
  { codigo: 'CTL-2026-005', nombre: 'Conciliación Bancaria Diaria', tipo: 'DETECTIVO', efectividad: 'EFECTIVO', proceso: 'Financiero', responsable: 'Dir. Contabilidad', automatizado: true, frecuencia: 'Diario', prox_eval: '2026-07-15' },
  { codigo: 'CTL-2026-006', nombre: 'Capacitación Anual Normativa SARLAFT', tipo: 'PREVENTIVO', efectividad: 'PARCIAL', proceso: 'Compliance', responsable: 'CLO', automatizado: false, frecuencia: 'Anual', prox_eval: '2026-11-01' },
  { codigo: 'CTL-2026-007', nombre: 'Inspección de Vehículos Preoperacional', tipo: 'PREVENTIVO', efectividad: 'PARCIAL', proceso: 'TMS', responsable: 'Dir. Operaciones', automatizado: false, frecuencia: 'Diario', prox_eval: '2026-07-01' },
  { codigo: 'CTL-2026-008', nombre: 'Backup y Recuperación de Datos (RTO 4h)', tipo: 'CORRECTIVO', efectividad: 'EFECTIVO', proceso: 'TI', responsable: 'CTO', automatizado: true, frecuencia: 'Diario', prox_eval: '2026-09-15' },
  { codigo: 'CTL-2026-009', nombre: 'Evaluación de Proveedores Críticos', tipo: 'DETECTIVO', efectividad: 'PARCIAL', proceso: 'Compras', responsable: 'Dir. Compras', automatizado: false, frecuencia: 'Trimestral', prox_eval: '2026-07-31' },
  { codigo: 'CTL-2026-010', nombre: 'Plan de Contingencia Falla Sistémica', tipo: 'COMPENSATORIO', efectividad: 'NO_EVALUADO', proceso: 'Continuidad', responsable: 'COO', automatizado: false, frecuencia: 'Semestral', prox_eval: '2026-12-01' },
]

const KPIs = [
  { label: 'Efectivos',    value: CONTROLES.filter(c => c.efectividad === 'EFECTIVO').length,    color: '#059669' },
  { label: 'Parciales',    value: CONTROLES.filter(c => c.efectividad === 'PARCIAL').length,     color: '#D97706' },
  { label: 'Inefectivos',  value: CONTROLES.filter(c => c.efectividad === 'INEFECTIVO').length,  color: '#DC2626' },
  { label: 'Automatizados',value: CONTROLES.filter(c => c.automatizado).length,                  color: GRC_COLOR },
]

export default function GRCControles() {
  const [tab, setTab] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [openDialog, setOpenDialog] = useState(false)

  const filtrados = filtroTipo === 'TODOS' ? CONTROLES : CONTROLES.filter(c => c.tipo === filtroTipo)
  const efectPct = Math.round(KPIs[0].value / CONTROLES.length * 100)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Gestión de Controles</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Preventivo · Detectivo · Correctivo · Compensatorio</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nuevo Control
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIs.map(k => (
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

        <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, mb: 3, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Efectividad Global de Controles</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: efectPct >= 75 ? '#059669' : efectPct >= 50 ? '#D97706' : '#DC2626' }}>{efectPct}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={efectPct} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: efectPct >= 75 ? '#059669' : '#D97706', borderRadius: 4 } }} />
        </Card>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Listado de Controles" />
          <Tab label="Vista por Tipo" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {['TODOS', ...Object.keys(TIPO_COLOR)].map(t => (
              <Chip key={t} label={t} size="small" onClick={() => setFiltroTipo(t)} clickable
                sx={{ fontSize: 10.5, bgcolor: filtroTipo === t ? alpha(GRC_COLOR, 0.25) : 'rgba(255,255,255,0.06)', color: filtroTipo === t ? GRC_COLOR : 'rgba(255,255,255,0.5)', border: filtroTipo === t ? `1px solid ${alpha(GRC_COLOR, 0.5)}` : 'none' }} />
            ))}
          </Box>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Control</TableCell><TableCell>Tipo</TableCell><TableCell>Efectividad</TableCell><TableCell>Proceso</TableCell><TableCell>Frecuencia</TableCell><TableCell>Auto.</TableCell><TableCell>Próx. Eval.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map(c => (
                  <TableRow key={c.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{c.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{c.nombre}</Typography></TableCell>
                    <TableCell><Chip label={c.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[c.tipo], 0.18), color: TIPO_COLOR[c.tipo] }} /></TableCell>
                    <TableCell><Chip label={c.efectividad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EFECTIVIDAD_COLOR[c.efectividad], 0.18), color: EFECTIVIDAD_COLOR[c.efectividad] }} /></TableCell>
                    <TableCell>{c.proceso}</TableCell>
                    <TableCell>{c.frecuencia}</TableCell>
                    <TableCell><Chip label={c.automatizado ? 'Auto' : 'Manual'} size="small" sx={{ fontSize: 9, height: 18, bgcolor: c.automatizado ? alpha(GRC_COLOR, 0.15) : 'rgba(255,255,255,0.08)', color: c.automatizado ? GRC_COLOR : 'rgba(255,255,255,0.5)' }} /></TableCell>
                    <TableCell>{c.prox_eval}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {Object.entries(TIPO_COLOR).map(([tipo, color]) => {
              const ctls = CONTROLES.filter(c => c.tipo === tipo)
              const eft  = ctls.filter(c => c.efectividad === 'EFECTIVO').length
              return (
                <Grid key={tipo} size={{ xs: 12, md: 6 }}>
                  <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(color, 0.25)}`, borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip label={tipo} sx={{ bgcolor: alpha(color, 0.18), color, fontWeight: 700, fontSize: 12 }} />
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{eft}/{ctls.length} efectivos</Typography>
                      </Box>
                      {ctls.map(c => (
                        <Box key={c.codigo} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)' }}>
                          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', flex: 1, mr: 1 }}>{c.nombre}</Typography>
                          <Chip label={c.efectividad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EFECTIVIDAD_COLOR[c.efectividad], 0.18), color: EFECTIVIDAD_COLOR[c.efectividad] }} />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Control</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre del Control" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Proceso" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Frecuencia</InputLabel>
              <Select label="Frecuencia" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['Continuo','Diario','Semanal','Mensual','Trimestral','Semestral','Anual'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
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
