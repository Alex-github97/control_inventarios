// GRC Module — Gestión de Terceros
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress, Avatar,
} from '@mui/material'
import { Business, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

function clasif(puntaje: number) {
  if (puntaje >= 90) return { label: 'Excelente', color: '#059669' }
  if (puntaje >= 75) return { label: 'Bueno',     color: GRC_COLOR }
  if (puntaje >= 60) return { label: 'Regular',   color: '#D97706' }
  return                     { label: 'Deficiente', color: '#DC2626' }
}

const TIPO_COLOR: Record<string, string> = {
  PROVEEDOR: '#059669', CLIENTE: '#0891B2', CONTRATISTA: '#D97706',
  ALIADO: GRC_COLOR, REGULADOR: '#EA580C',
}

const TERCEROS = [
  { nombre: 'Almacenes Éxito S.A.', nit: '860,007,386-6', tipo: 'CLIENTE', pais: 'Colombia', nivel_riesgo: 'BAJO', lgl: 95, rep: 90, fin: 88, sec: 85 },
  { nombre: 'DHL Supply Chain', nit: '900,456,123-5', tipo: 'ALIADO', pais: 'Colombia', nivel_riesgo: 'BAJO', lgl: 98, rep: 96, fin: 94, sec: 97 },
  { nombre: 'Contenedores del Caribe', nit: '830,062,100-2', tipo: 'PROVEEDOR', pais: 'Colombia', nivel_riesgo: 'MEDIO', lgl: 72, rep: 68, fin: 55, sec: 60 },
  { nombre: 'TechLogix Software', nit: '900,789,000-1', tipo: 'CONTRATISTA', pais: 'USA', nivel_riesgo: 'ALTO', lgl: 82, rep: 78, fin: 65, sec: 45 },
  { nombre: 'Seguros Bolívar', nit: '890,300,960-8', tipo: 'PROVEEDOR', pais: 'Colombia', nivel_riesgo: 'BAJO', lgl: 97, rep: 95, fin: 92, sec: 88 },
  { nombre: 'Transportes Nacionales SAS', nit: '900,123,456-7', tipo: 'CONTRATISTA', pais: 'Colombia', nivel_riesgo: 'MEDIO', lgl: 78, rep: 72, fin: 70, sec: 65 },
]

const RIESGO_COLOR: Record<string, string> = { BAJO: '#059669', MEDIO: '#D97706', ALTO: '#DC2626', CRITICO: '#7C3AED' }

export default function GRCTerceros() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Business sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Gestión de Terceros</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Due Diligence · Scoring · Proveedores · Clientes · Aliados</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nuevo Tercero
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Terceros', value: TERCEROS.length, color: GRC_COLOR },
            { label: 'Riesgo Bajo', value: TERCEROS.filter(t => t.nivel_riesgo === 'BAJO').length, color: '#059669' },
            { label: 'Riesgo Medio', value: TERCEROS.filter(t => t.nivel_riesgo === 'MEDIO').length, color: '#D97706' },
            { label: 'Riesgo Alto', value: TERCEROS.filter(t => t.nivel_riesgo === 'ALTO').length, color: '#DC2626' },
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
          <Tab label="Tarjetas de Scoring" />
          <Tab label="Tabla de Terceros" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {TERCEROS.map(t => {
              const puntaje = Math.round((t.lgl + t.rep + t.fin + t.sec) / 4)
              const cl = clasif(puntaje)
              return (
                <Grid key={t.nombre} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(cl.color, 0.3)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(TIPO_COLOR[t.tipo] || GRC_COLOR, 0.2), color: TIPO_COLOR[t.tipo] || GRC_COLOR, width: 40, height: 40, fontWeight: 700, fontSize: 13 }}>
                          {t.nombre.slice(0,2).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 13, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombre}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
                            <Chip label={t.tipo} size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(TIPO_COLOR[t.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[t.tipo] || GRC_COLOR }} />
                            <Chip label={t.pais} size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }} />
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontSize: 24, fontWeight: 800, color: cl.color, lineHeight: 1 }}>{puntaje}</Typography>
                          <Chip label={cl.label} size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(cl.color, 0.18), color: cl.color }} />
                        </Box>
                      </Box>
                      {[
                        { label: 'Cumplimiento Legal', value: t.lgl },
                        { label: 'Riesgo Reputacional', value: t.rep },
                        { label: 'Solidez Financiera', value: t.fin },
                        { label: 'Seguridad Info.', value: t.sec },
                      ].map(cr => (
                        <Box key={cr.label} sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                            <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>{cr.label}</Typography>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: cr.value >= 80 ? '#059669' : cr.value >= 60 ? '#D97706' : '#DC2626' }}>{cr.value}</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={cr.value} sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: cr.value >= 80 ? '#059669' : cr.value >= 60 ? '#D97706' : '#DC2626' } }} />
                        </Box>
                      ))}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Chip label={`Riesgo ${t.nivel_riesgo}`} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(RIESGO_COLOR[t.nivel_riesgo], 0.18), color: RIESGO_COLOR[t.nivel_riesgo] }} />
                      </Box>
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
                  <TableCell>Nombre</TableCell><TableCell>NIT</TableCell><TableCell>Tipo</TableCell><TableCell>País</TableCell><TableCell>Puntaje</TableCell><TableCell>Clasificación</TableCell><TableCell>Nivel Riesgo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {TERCEROS.map(t => {
                  const puntaje = Math.round((t.lgl + t.rep + t.fin + t.sec) / 4)
                  const cl = clasif(puntaje)
                  return (
                    <TableRow key={t.nombre} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                      <TableCell sx={{ fontWeight: 600, color: '#FFF' }}>{t.nombre}</TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{t.nit}</TableCell>
                      <TableCell><Chip label={t.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[t.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[t.tipo] || GRC_COLOR }} /></TableCell>
                      <TableCell>{t.pais}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={puntaje} sx={{ width: 60, height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: cl.color } }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: cl.color }}>{puntaje}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={cl.label} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(cl.color, 0.18), color: cl.color }} /></TableCell>
                      <TableCell><Chip label={t.nivel_riesgo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(RIESGO_COLOR[t.nivel_riesgo], 0.18), color: RIESGO_COLOR[t.nivel_riesgo] }} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Tercero</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <TextField label="NIT" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="País" fullWidth size="small" defaultValue="Colombia" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
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
