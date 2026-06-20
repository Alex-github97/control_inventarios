// GRC Module — Repositorio de Políticas
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress,
} from '@mui/material'
import { Policy, Add, CheckCircle, Warning, Schedule, HistoryEdu } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const ESTADO_COLOR: Record<string, string> = {
  PUBLICADA: '#059669', BORRADOR: '#D97706', REVISION: '#0891B2',
  VENCIDA: '#DC2626', ARCHIVADA: '#6B7280',
}

const POLITICAS = [
  { codigo: 'POL-2026-001', nombre: 'Política de Gestión de Riesgos Corporativos', tipo: 'Riesgos', version: '3.2', estado: 'PUBLICADA', propietario: 'CRMO', aprobador: 'CEO', vigencia: '2027-01-01', revision: '2026-12-01', aceptaciones: 128, requeridas: 145 },
  { codigo: 'POL-2026-002', nombre: 'Política de Seguridad de la Información (ISO 27001)', tipo: 'Ciberseguridad', version: '2.1', estado: 'PUBLICADA', propietario: 'CISO', aprobador: 'CEO', vigencia: '2027-06-01', revision: '2026-11-01', aceptaciones: 210, requeridas: 210 },
  { codigo: 'POL-2026-003', nombre: 'Política de Cumplimiento Antisoborno (ISO 37001)', tipo: 'Compliance', version: '1.5', estado: 'PUBLICADA', propietario: 'CLO', aprobador: 'Junta', vigencia: '2026-12-31', revision: '2026-09-01', aceptaciones: 87, requeridas: 90 },
  { codigo: 'POL-2026-004', nombre: 'Política de Continuidad del Negocio (ISO 22301)', tipo: 'Continuidad', version: '2.0', estado: 'REVISION', propietario: 'COO', aprobador: 'CEO', vigencia: '2026-07-01', revision: '2026-06-15', aceptaciones: 0, requeridas: 60 },
  { codigo: 'POL-2026-005', nombre: 'Política de Gestión de Proveedores y Terceros', tipo: 'Terceros', version: '1.3', estado: 'PUBLICADA', propietario: 'Dir. Compras', aprobador: 'COO', vigencia: '2027-03-01', revision: '2026-12-01', aceptaciones: 42, requeridas: 45 },
  { codigo: 'POL-2026-006', nombre: 'Política de Protección de Datos Personales', tipo: 'Privacidad', version: '4.0', estado: 'BORRADOR', propietario: 'CLO', aprobador: 'CEO', vigencia: null, revision: null, aceptaciones: 0, requeridas: 210 },
  { codigo: 'POL-2025-011', nombre: 'Política de Conflicto de Intereses', tipo: 'Ética', version: '1.0', estado: 'VENCIDA', propietario: 'CLO', aprobador: 'Junta', vigencia: '2026-01-01', revision: '2025-12-01', aceptaciones: 75, requeridas: 80 },
]

const KPIs = [
  { label: 'Políticas Vigentes',   value: 18, color: '#059669', icon: <CheckCircle /> },
  { label: 'Políticas Vencidas',   value: 3,  color: '#DC2626', icon: <Warning /> },
  { label: 'En Revisión',          value: 2,  color: '#D97706', icon: <Schedule /> },
  { label: 'Cobertura Total',      value: '94%', color: GRC_COLOR, icon: <HistoryEdu /> },
]

export default function GRCPoliticas() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Policy sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Repositorio de Políticas</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Control de Versiones · Vigencias · Aceptaciones</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nueva Política
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIs.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color: alpha(k.color, 0.5), '& svg': { fontSize: 22 } }}>{k.icon}</Box>
                  <Box>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Catálogo de Políticas" />
          <Tab label="Control de Aceptaciones" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {POLITICAS.map(p => {
              const estado_color = ESTADO_COLOR[p.estado] || GRC_COLOR
              const acep_pct = p.requeridas > 0 ? Math.round((p.aceptaciones / p.requeridas) * 100) : 0
              return (
                <Grid key={p.codigo} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(estado_color, 0.25)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{p.codigo} · v{p.version}</Typography>
                        <Chip label={p.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(estado_color, 0.18), color: estado_color }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 13, lineHeight: 1.3, mb: 1.5 }}>{p.nombre}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                        <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Propietario</Typography><Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{p.propietario}</Typography></Box>
                        <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Aprobador</Typography><Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{p.aprobador}</Typography></Box>
                        <Box><Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Vigencia</Typography><Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>{p.vigencia || '—'}</Typography></Box>
                      </Box>
                      {p.requeridas > 0 && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Aceptaciones: {p.aceptaciones}/{p.requeridas}</Typography>
                            <Typography sx={{ fontSize: 10, color: acep_pct >= 90 ? '#059669' : acep_pct >= 70 ? '#D97706' : '#DC2626', fontWeight: 700 }}>{acep_pct}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={acep_pct} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: acep_pct >= 90 ? '#059669' : acep_pct >= 70 ? '#D97706' : '#DC2626' } }} />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Política</TableCell><TableCell>Estado</TableCell><TableCell>Aceptaciones</TableCell><TableCell>Cobertura</TableCell><TableCell>Próxima Revisión</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {POLITICAS.filter(p => p.estado === 'PUBLICADA').map(p => {
                  const pct = Math.round((p.aceptaciones / p.requeridas) * 100)
                  return (
                    <TableRow key={p.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12.5 } }}>
                      <TableCell sx={{ maxWidth: 280 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600 }}>{p.nombre}</Typography><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{p.codigo}</Typography></TableCell>
                      <TableCell><Chip label={p.estado} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(ESTADO_COLOR[p.estado], 0.15), color: ESTADO_COLOR[p.estado] }} /></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{p.aceptaciones}/{p.requeridas}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={pct} sx={{ width: 80, height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: pct >= 90 ? '#059669' : '#D97706' } }} />
                          <Typography sx={{ fontSize: 11, color: pct >= 90 ? '#059669' : '#D97706', fontWeight: 700 }}>{pct}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{p.revision || '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Política</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre de la Política" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['Riesgos','Compliance','Ciberseguridad','Continuidad','Privacidad','Ética','Terceros'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Propietario" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="Fecha de Vigencia" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
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
