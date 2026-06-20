// GRC Module — Gestión de Incidentes
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { Security, Add } from '@mui/icons-material'
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
  abierto: '#DC2626', en_investigacion: '#D97706', en_contencion: '#0891B2', cerrado: '#059669',
}
const TIPO_COLOR: Record<string, string> = {
  ciberseguridad: '#7C3AED', fraude: '#DC2626', operacional: '#D97706',
  regulatorio: '#0891B2', sst: '#059669', continuidad: GRC_COLOR,
}

const INCIDENTES = [
  { codigo: 'INC-2026-001', titulo: 'Intento de phishing masivo empleados', tipo: 'ciberseguridad', severidad: 'ALTA', area: 'TI', reportado_por: 'CISO', responsable: 'CISO', fecha: '2026-06-15 09:34', estado: 'en_investigacion', mttr_h: null },
  { codigo: 'INC-2026-002', titulo: 'Accidente montacargas bodega Fontibón', tipo: 'sst', severidad: 'CRITICA', area: 'Operaciones', reportado_por: 'Jefe Turno', responsable: 'Dir. RRHH', fecha: '2026-06-10 14:20', estado: 'cerrado', mttr_h: 48 },
  { codigo: 'INC-2026-003', titulo: 'Robo mercancía ruta Bogotá-Cali', tipo: 'operacional', severidad: 'ALTA', area: 'TMS', reportado_por: 'Conductor', responsable: 'Dir. Operaciones', fecha: '2026-06-08 22:10', estado: 'cerrado', mttr_h: 72 },
  { codigo: 'INC-2026-004', titulo: 'Acceso no autorizado sistema ERP', tipo: 'ciberseguridad', severidad: 'CRITICA', area: 'TI', reportado_por: 'Dir. TI', responsable: 'CISO', fecha: '2026-06-12 03:15', estado: 'en_contencion', mttr_h: null },
  { codigo: 'INC-2026-005', titulo: 'Derrame químico zona de carga', tipo: 'sst', severidad: 'MEDIA', area: 'Bodega', reportado_por: 'Jefe Bodega', responsable: 'Dir. RRHH', fecha: '2026-06-18 11:00', estado: 'cerrado', mttr_h: 4 },
  { codigo: 'INC-2026-006', titulo: 'Falla ERP facturación 6 horas', tipo: 'continuidad', severidad: 'ALTA', area: 'Financiero', reportado_por: 'CFO', responsable: 'CTO', fecha: '2026-06-19 08:30', estado: 'abierto', mttr_h: null },
]

const mttr_cerrados = INCIDENTES.filter(i => i.mttr_h !== null)
const avg_mttr = mttr_cerrados.length ? Math.round(mttr_cerrados.reduce((s, i) => s + (i.mttr_h || 0), 0) / mttr_cerrados.length) : 0

export default function GRCIncidentes() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Security sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Gestión de Incidentes</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Ciberseguridad · SST · Operacional · MTTR</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Reportar Incidente
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Abiertos',           value: INCIDENTES.filter(i => i.estado === 'abierto').length, color: '#DC2626' },
            { label: 'En Investigación',   value: INCIDENTES.filter(i => i.estado === 'en_investigacion').length, color: '#D97706' },
            { label: 'Cerrados',           value: INCIDENTES.filter(i => i.estado === 'cerrado').length, color: '#059669' },
            { label: 'MTTR Promedio',      value: `${avg_mttr}h`, color: GRC_COLOR },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Incidentes Activos" />
          <Tab label="Todos los Incidentes" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {INCIDENTES.filter(i => i.estado !== 'cerrado').map(i => (
              <Grid key={i.codigo} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(SEV_COLOR[i.severidad], 0.35)}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Chip label={i.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[i.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[i.tipo] || GRC_COLOR }} />
                        <Chip label={i.severidad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(SEV_COLOR[i.severidad], 0.18), color: SEV_COLOR[i.severidad] }} />
                      </Box>
                      <Chip label={i.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[i.estado], 0.18), color: ESTADO_COLOR[i.estado] }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 0.75, lineHeight: 1.3 }}>{i.titulo}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', mb: 1.5 }}>{i.codigo} · {i.fecha}</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Área</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{i.area}</Typography></Box>
                      <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Responsable</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{i.responsable}</Typography></Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Incidente</TableCell><TableCell>Tipo</TableCell><TableCell>Severidad</TableCell><TableCell>Área</TableCell><TableCell>Fecha</TableCell><TableCell>Estado</TableCell><TableCell>MTTR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {INCIDENTES.map(i => (
                  <TableRow key={i.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{i.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{i.titulo}</Typography></TableCell>
                    <TableCell><Chip label={i.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[i.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[i.tipo] || GRC_COLOR }} /></TableCell>
                    <TableCell><Chip label={i.severidad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(SEV_COLOR[i.severidad], 0.18), color: SEV_COLOR[i.severidad] }} /></TableCell>
                    <TableCell>{i.area}</TableCell>
                    <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>{i.fecha}</TableCell>
                    <TableCell><Chip label={i.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[i.estado], 0.18), color: ESTADO_COLOR[i.estado] }} /></TableCell>
                    <TableCell sx={{ color: i.mttr_h ? (i.mttr_h <= 24 ? '#059669' : '#D97706') : 'rgba(255,255,255,0.3)', fontWeight: i.mttr_h ? 700 : 400 }}>{i.mttr_h ? `${i.mttr_h}h` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Reportar Incidente</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Título del Incidente" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Severidad</InputLabel>
              <Select label="Severidad" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(SEV_COLOR).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Área Afectada" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>Reportar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
