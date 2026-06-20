// GRC Module — Gobierno Corporativo
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Avatar,
} from '@mui/material'
import { AccountTree, Add, Groups, Person } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const COMITES = [
  { nombre: 'Comité de Riesgos Corporativos', tipo: 'Riesgos', periodicidad: 'Mensual', presidente: 'CEO', miembros: 7, activo: true },
  { nombre: 'Comité de Auditoría y Control',  tipo: 'Auditoría', periodicidad: 'Trimestral', presidente: 'CFO', miembros: 5, activo: true },
  { nombre: 'Comité de Cumplimiento Normativo', tipo: 'Compliance', periodicidad: 'Mensual', presidente: 'CLO', miembros: 6, activo: true },
  { nombre: 'Comité de Seguridad de la Información', tipo: 'Ciberseguridad', periodicidad: 'Mensual', presidente: 'CISO', miembros: 8, activo: true },
  { nombre: 'Comité de Continuidad del Negocio', tipo: 'Continuidad', periodicidad: 'Semestral', presidente: 'COO', miembros: 6, activo: false },
]

const TIPO_COLOR: Record<string, string> = {
  Riesgos: '#DC2626', Auditoría: '#D97706', Compliance: '#0891B2',
  Ciberseguridad: '#7C3AED', Continuidad: GRC_COLOR,
}

const RACI = [
  { proceso: 'Gestión de Riesgos',          responsable: 'CRMO', aprobador: 'CEO', consultado: 'CFO, COO', informado: 'Junta Directiva' },
  { proceso: 'Auditorías Corporativas',      responsable: 'Dir. Auditoría', aprobador: 'Comité Auditoría', consultado: 'CLO', informado: 'CEO, CFO' },
  { proceso: 'Cumplimiento Regulatorio',     responsable: 'CLO', aprobador: 'CEO', consultado: 'CRMO, CISO', informado: 'Junta Directiva' },
  { proceso: 'Seguridad de la Información', responsable: 'CISO', aprobador: 'CEO', consultado: 'CTO, CLO', informado: 'Comité Riesgos' },
  { proceso: 'Continuidad del Negocio',      responsable: 'COO', aprobador: 'CEO', consultado: 'CRMO, CISO', informado: 'Junta Directiva' },
  { proceso: 'Gestión de Terceros',          responsable: 'Dir. Compras', aprobador: 'COO', consultado: 'CLO, CRMO', informado: 'CFO' },
]

const RESPONSABLES = [
  { nombre: 'Carlos Rodríguez', cargo: 'CRMO — Chief Risk Management Officer',    area: 'GRC', procesos: 4 },
  { nombre: 'Laura Martínez',   cargo: 'CLO — Chief Legal & Compliance Officer',  area: 'Legal', procesos: 3 },
  { nombre: 'Andrés Gómez',     cargo: 'CISO — Chief Information Security Officer', area: 'TI', procesos: 2 },
  { nombre: 'Diana Torres',     cargo: 'Dir. Auditoría Interna',                  area: 'Auditoría', procesos: 5 },
]

export default function GRCGobierno() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AccountTree sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Gobierno Corporativo</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · Estructura de Gobierno · Comités · RACI</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nuevo Comité
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Comités" icon={<Groups sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Matriz RACI" icon={<AccountTree sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Responsables" icon={<Person sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {COMITES.map(c => (
              <Grid key={c.nombre} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Chip label={c.tipo} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(TIPO_COLOR[c.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[c.tipo] || GRC_COLOR }} />
                      <Chip label={c.activo ? 'Activo' : 'Inactivo'} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(c.activo ? GRC_COLOR : '#6B7280', 0.15), color: c.activo ? GRC_COLOR : '#6B7280' }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14, mb: 1, lineHeight: 1.3 }}>{c.nombre}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Presidente</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{c.presidente}</Typography></Box>
                      <Box><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Periodicidad</Typography><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{c.periodicidad}</Typography></Box>
                      <Box><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Miembros</Typography><Typography sx={{ fontSize: 12, color: GRC_COLOR, fontWeight: 700 }}>{c.miembros}</Typography></Box>
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
                  <TableCell>Proceso</TableCell>
                  <TableCell><Chip label="R" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha('#DC2626', 0.18), color: '#DC2626' }} /> Responsable</TableCell>
                  <TableCell><Chip label="A" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha('#D97706', 0.18), color: '#D97706' }} /> Aprobador</TableCell>
                  <TableCell><Chip label="C" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(GRC_COLOR, 0.18), color: GRC_COLOR }} /> Consultado</TableCell>
                  <TableCell><Chip label="I" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha('#0891B2', 0.18), color: '#0891B2' }} /> Informado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RACI.map(r => (
                  <TableRow key={r.proceso} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12.5 } }}>
                    <TableCell sx={{ fontWeight: 600, color: '#FFF' }}>{r.proceso}</TableCell>
                    <TableCell sx={{ color: '#DC2626', fontWeight: 600 }}>{r.responsable}</TableCell>
                    <TableCell sx={{ color: '#D97706', fontWeight: 600 }}>{r.aprobador}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>{r.consultado}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>{r.informado}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Grid container spacing={2}>
            {RESPONSABLES.map(r => (
              <Grid key={r.nombre} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '16px !important' }}>
                    <Avatar sx={{ bgcolor: alpha(GRC_COLOR, 0.25), color: GRC_COLOR, width: 46, height: 46, fontWeight: 700 }}>{r.nombre.slice(0, 2).toUpperCase()}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 14 }}>{r.nombre}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>{r.cargo}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                        <Chip label={r.area} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR }} />
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>{r.procesos} procesos asignados</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Comité</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre del Comité" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Presidente" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Periodicidad</InputLabel>
              <Select label="Periodicidad" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['Semanal','Mensual','Trimestral','Semestral','Anual'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
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
