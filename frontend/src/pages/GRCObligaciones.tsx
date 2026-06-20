// GRC Module — Registro Normativo (Obligaciones)
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { Gavel, Add, Warning } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const TIPO_COLOR: Record<string, string> = {
  LEY: '#DC2626', DECRETO: '#EA580C', RESOLUCION: '#D97706', NORMA_ISO: GRC_COLOR,
  NORMA_TECNICA: '#0891B2', CONTRATO: '#059669', INTERNO: '#6B7280',
}
const ESTADO_COLOR: Record<string, string> = {
  CUMPLIENDO: '#059669', PARCIAL: '#D97706', INCUMPLIMIENTO: '#DC2626', NO_APLICA: '#6B7280',
}

const OBLIGACIONES = [
  { codigo: 'OBL-2026-001', nombre: 'Ley 1581 Protección de Datos (Habeas Data)', tipo: 'LEY', pais: 'Colombia', area: 'Legal / TI', responsable: 'CLO', vencimiento: '2026-12-31', estado: 'CUMPLIENDO' },
  { codigo: 'OBL-2026-002', nombre: 'Decreto 1072 Seguridad y Salud en el Trabajo', tipo: 'DECRETO', pais: 'Colombia', area: 'RRHH', responsable: 'Dir. RRHH', vencimiento: '2026-07-01', estado: 'PARCIAL' },
  { codigo: 'OBL-2026-003', nombre: 'ISO 9001:2015 Gestión de Calidad', tipo: 'NORMA_ISO', pais: 'Internacional', area: 'Calidad', responsable: 'Dir. Calidad', vencimiento: '2027-04-30', estado: 'CUMPLIENDO' },
  { codigo: 'OBL-2026-004', nombre: 'ISO 27001:2022 Seguridad de la Información', tipo: 'NORMA_ISO', pais: 'Internacional', area: 'TI', responsable: 'CISO', vencimiento: '2026-11-15', estado: 'PARCIAL' },
  { codigo: 'OBL-2026-005', nombre: 'Resolución DIAN Facturación Electrónica', tipo: 'RESOLUCION', pais: 'Colombia', area: 'Financiero', responsable: 'CFO', vencimiento: '2026-06-30', estado: 'INCUMPLIMIENTO' },
  { codigo: 'OBL-2026-006', nombre: 'BASC — Business Anti-Smuggling Coalition', tipo: 'NORMA_TECNICA', pais: 'Colombia', area: 'Seguridad', responsable: 'Dir. Seguridad', vencimiento: '2027-02-28', estado: 'CUMPLIENDO' },
  { codigo: 'OBL-2026-007', nombre: 'ISO 14001 Gestión Ambiental', tipo: 'NORMA_ISO', pais: 'Internacional', area: 'Operaciones', responsable: 'COO', vencimiento: '2027-08-31', estado: 'CUMPLIENDO' },
  { codigo: 'OBL-2026-008', nombre: 'Superfinanciera SARLAFT (lavado de activos)', tipo: 'RESOLUCION', pais: 'Colombia', area: 'Financiero / Legal', responsable: 'CLO', vencimiento: '2026-09-01', estado: 'PARCIAL' },
]

const KPIs = [
  { label: 'Cumpliendo',       value: OBLIGACIONES.filter(o => o.estado === 'CUMPLIENDO').length,    color: '#059669' },
  { label: 'Parcial',          value: OBLIGACIONES.filter(o => o.estado === 'PARCIAL').length,        color: '#D97706' },
  { label: 'Incumplimiento',   value: OBLIGACIONES.filter(o => o.estado === 'INCUMPLIMIENTO').length, color: '#DC2626' },
  { label: 'Total Registradas', value: OBLIGACIONES.length, color: GRC_COLOR },
]

export default function GRCObligaciones() {
  const [tab, setTab] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [openDialog, setOpenDialog] = useState(false)

  const filtradas = filtroTipo === 'TODOS' ? OBLIGACIONES : OBLIGACIONES.filter(o => o.tipo === filtroTipo)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Gavel sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Registro Normativo</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Leyes · Decretos · Normas ISO · Contratos</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nueva Obligación
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIs.map(k => (
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
          <Tab label="Todas las Obligaciones" />
          <Tab label="Próximas a Vencer" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {['TODOS', ...Object.keys(TIPO_COLOR)].map(t => (
              <Chip key={t} label={t.replace('_', ' ')} size="small" onClick={() => setFiltroTipo(t)} clickable
                sx={{ fontSize: 10.5, bgcolor: filtroTipo === t ? alpha(GRC_COLOR, 0.25) : 'rgba(255,255,255,0.06)', color: filtroTipo === t ? GRC_COLOR : 'rgba(255,255,255,0.5)', border: filtroTipo === t ? `1px solid ${alpha(GRC_COLOR, 0.5)}` : 'none' }} />
            ))}
          </Box>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Obligación</TableCell><TableCell>Tipo</TableCell><TableCell>País</TableCell><TableCell>Área</TableCell><TableCell>Responsable</TableCell><TableCell>Vencimiento</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtradas.map(o => (
                  <TableRow key={o.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{o.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{o.nombre}</Typography></TableCell>
                    <TableCell><Chip label={o.tipo.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[o.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[o.tipo] || GRC_COLOR }} /></TableCell>
                    <TableCell>{o.pais}</TableCell>
                    <TableCell>{o.area}</TableCell>
                    <TableCell>{o.responsable}</TableCell>
                    <TableCell>{o.vencimiento}</TableCell>
                    <TableCell><Chip label={o.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[o.estado] || '#6B7280', 0.18), color: ESTADO_COLOR[o.estado] || '#6B7280' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {OBLIGACIONES.filter(o => o.estado !== 'CUMPLIENDO').map(o => (
              <Grid key={o.codigo} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(ESTADO_COLOR[o.estado], 0.3)}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={o.tipo.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[o.tipo], 0.18), color: TIPO_COLOR[o.tipo] }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Warning sx={{ fontSize: 14, color: ESTADO_COLOR[o.estado] }} />
                        <Chip label={o.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[o.estado], 0.18), color: ESTADO_COLOR[o.estado] }} />
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 13, mb: 1, lineHeight: 1.3 }}>{o.nombre}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Responsable</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{o.responsable}</Typography></Box>
                      <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Vencimiento</Typography><Typography sx={{ fontSize: 12, color: ESTADO_COLOR[o.estado], fontWeight: 700 }}>{o.vencimiento}</Typography></Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Obligación Normativa</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre de la Obligación" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="País" fullWidth size="small" defaultValue="Colombia" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha de Vencimiento" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
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
