// GRC Module — Auditorías Corporativas
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { Gavel, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const TIPO_COLOR: Record<string, string> = {
  INTERNA: GRC_COLOR, EXTERNA: '#DC2626', REGULATORIA: '#EA580C',
  CERTIFICACION: '#059669', SEGUIMIENTO: '#0891B2',
}
const ESTADO_COLOR: Record<string, string> = {
  PLANIFICADA: '#6B7280', EN_EJECUCION: '#D97706', FINALIZADA: '#059669',
  SUSPENDIDA: '#DC2626', CANCELADA: '#374151',
}

const AUDITORIAS = [
  { codigo: 'AUD-2026-001', nombre: 'Auditoría ISO 9001:2015 — Calidad Operaciones', tipo: 'CERTIFICACION', auditor: 'Bureau Veritas', auditado: 'Dir. Calidad', inicio: '2026-03-10', fin: '2026-03-12', estado: 'FINALIZADA', hallazgos: 5 },
  { codigo: 'AUD-2026-002', nombre: 'Auditoría Interna BASC — Seguridad', tipo: 'INTERNA', auditor: 'Equipo GRC', auditado: 'Dir. Seguridad', inicio: '2026-04-15', fin: '2026-04-17', estado: 'FINALIZADA', hallazgos: 3 },
  { codigo: 'AUD-2026-003', nombre: 'Auditoría ISO 27001 — Seguridad Información', tipo: 'CERTIFICACION', auditor: 'SGS Colombia', auditado: 'CISO', inicio: '2026-07-05', fin: '2026-07-08', estado: 'PLANIFICADA', hallazgos: 0 },
  { codigo: 'AUD-2026-004', nombre: 'Prueba BCP — Continuidad del Negocio', tipo: 'INTERNA', auditor: 'Equipo GRC', auditado: 'COO', inicio: '2026-07-18', fin: '2026-07-19', estado: 'PLANIFICADA', hallazgos: 0 },
  { codigo: 'AUD-2026-005', nombre: 'Auditoría SARLAFT — Prevención Lavado Activos', tipo: 'REGULATORIA', auditor: 'Superfinanciera', auditado: 'CLO', inicio: '2026-06-10', fin: '2026-06-14', estado: 'EN_EJECUCION', hallazgos: 2 },
  { codigo: 'AUD-2026-006', nombre: 'Auditoría Tributaria — DIAN', tipo: 'REGULATORIA', auditor: 'DIAN', auditado: 'CFO', inicio: '2026-05-20', fin: '2026-05-24', estado: 'FINALIZADA', hallazgos: 8 },
]

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function mesIndex(fecha: string) {
  return parseInt(fecha.split('-')[1]) - 1
}

export default function GRCAuditorias() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Gavel sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Auditorías Corporativas</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Plan Anual · Internas · Externas · Regulatorias</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nueva Auditoría
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total 2026',    value: AUDITORIAS.length, color: GRC_COLOR },
            { label: 'Finalizadas',   value: AUDITORIAS.filter(a => a.estado === 'FINALIZADA').length, color: '#059669' },
            { label: 'En Ejecución', value: AUDITORIAS.filter(a => a.estado === 'EN_EJECUCION').length, color: '#D97706' },
            { label: 'Planificadas', value: AUDITORIAS.filter(a => a.estado === 'PLANIFICADA').length, color: '#0891B2' },
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
          <Tab label="Plan Anual (Gantt)" />
          <Tab label="Listado de Auditorías" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: '#FFF', mb: 2, fontSize: 14 }}>Plan de Auditorías 2026</Typography>
              {/* Header months */}
              <Box sx={{ display: 'flex', mb: 1 }}>
                <Box sx={{ width: 220, flexShrink: 0 }} />
                {MESES.map(m => (
                  <Box key={m} sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{m}</Typography>
                  </Box>
                ))}
              </Box>
              {AUDITORIAS.map(a => {
                const startM = mesIndex(a.inicio)
                const endM   = mesIndex(a.fin)
                const color  = ESTADO_COLOR[a.estado]
                return (
                  <Box key={a.codigo} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: 220, flexShrink: 0, pr: 1 }}>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>{a.nombre.slice(0, 35)}{a.nombre.length > 35 ? '…' : ''}</Typography>
                      <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)' }}>{a.codigo}</Typography>
                    </Box>
                    {MESES.map((_, mi) => {
                      const inRange = mi >= startM && mi <= endM
                      return (
                        <Box key={mi} sx={{ flex: 1, height: 22, px: 0.25 }}>
                          {inRange && (
                            <Box sx={{ height: '100%', bgcolor: alpha(color, 0.4), borderRadius: mi === startM ? '4px 0 0 4px' : mi === endM ? '0 4px 4px 0' : 0, border: `1px solid ${alpha(color, 0.6)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {mi === Math.round((startM + endM) / 2) && (
                                <Typography sx={{ fontSize: 8, color, fontWeight: 700 }}>{a.tipo.slice(0, 3)}</Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                )
              })}
              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                {Object.entries(ESTADO_COLOR).map(([k, c]) => (
                  <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: alpha(c, 0.5), border: `1px solid ${c}` }} />
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{k.replace('_', ' ')}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Auditoría</TableCell><TableCell>Tipo</TableCell><TableCell>Auditor</TableCell><TableCell>Auditado</TableCell><TableCell>Inicio</TableCell><TableCell>Fin</TableCell><TableCell>Estado</TableCell><TableCell>Hallazgos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {AUDITORIAS.map(a => (
                  <TableRow key={a.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{a.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{a.nombre}</Typography></TableCell>
                    <TableCell><Chip label={a.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[a.tipo], 0.18), color: TIPO_COLOR[a.tipo] }} /></TableCell>
                    <TableCell>{a.auditor}</TableCell>
                    <TableCell>{a.auditado}</TableCell>
                    <TableCell>{a.inicio}</TableCell>
                    <TableCell>{a.fin}</TableCell>
                    <TableCell><Chip label={a.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ESTADO_COLOR[a.estado], 0.18), color: ESTADO_COLOR[a.estado] }} /></TableCell>
                    <TableCell><Chip label={a.hallazgos} size="small" sx={{ fontSize: 10, height: 18, bgcolor: a.hallazgos > 0 ? alpha('#D97706', 0.18) : 'rgba(255,255,255,0.08)', color: a.hallazgos > 0 ? '#D97706' : 'rgba(255,255,255,0.5)', fontWeight: 700 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Auditoría</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre de la Auditoría" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Auditor Líder" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha Inicio" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha Fin" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
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
