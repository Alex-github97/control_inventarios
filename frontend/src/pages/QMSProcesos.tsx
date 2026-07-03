// QMS Module - Gestión y Mapa de Procesos
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, IconButton,
} from '@mui/material'
import { DeviceHub, Add, Edit, Visibility, ToggleOff } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const PROCESOS_ESTRATEGICOS = ['Planeación Estratégica', 'Gestión Comercial', 'Gestión de Calidad']
const PROCESOS_MISIONALES    = ['Recepción / Almacenamiento', 'Transporte Nacional', 'Distribución Local']
const PROCESOS_APOYO         = ['RRHH', 'Tecnología (TI)', 'Financiero', 'Compras', 'Mantenimiento']
const PROCESOS_EVALUACION    = ['Auditoría Interna', 'Medición y Análisis', 'Mejora Continua']

const TABLA_PROCESOS = [
  { codigo: 'PE-001', nombre: 'Planeación Estratégica', tipo: 'ESTRATEGICO', responsable: 'Gerencia', norma: 'ISO 9001:2015', estado: 'ACTIVO' },
  { codigo: 'PM-001', nombre: 'Recepción y Almacenamiento', tipo: 'MISIONAL', responsable: 'Jefe WMS', norma: 'ISO 28000:2022', estado: 'ACTIVO' },
  { codigo: 'PM-002', nombre: 'Transporte Nacional', tipo: 'MISIONAL', responsable: 'Jefe TMS', norma: 'ISO 39001', estado: 'ACTIVO' },
  { codigo: 'PA-001', nombre: 'Gestión Humana', tipo: 'APOYO', responsable: 'RRHH', norma: 'ISO 45001:2018', estado: 'ACTIVO' },
  { codigo: 'PA-002', nombre: 'Tecnología e Información', tipo: 'APOYO', responsable: 'TI', norma: 'ISO 27001:2022', estado: 'ACTIVO' },
  { codigo: 'EV-001', nombre: 'Auditoría Interna', tipo: 'EVALUACION', responsable: 'Calidad', norma: 'ISO 9001:2015', estado: 'ACTIVO' },
]

const PROCEDIMIENTOS = [
  { codigo: 'PRO-001', nombre: 'Procedimiento de Picking', proceso: 'WMS', version: '2.1', estado: 'vigente', vigencia: '2026-12-31' },
  { codigo: 'PRO-002', nombre: 'Instrucción de Cargue', proceso: 'TMS', version: '1.3', estado: 'vigente', vigencia: '2027-01-15' },
  { codigo: 'PRO-003', nombre: 'Manual de Calidad', proceso: 'QMS', version: '4.0', estado: 'en_revision', vigencia: '2026-06-30' },
  { codigo: 'POL-001', nombre: 'Política de Seguridad de la Información', proceso: 'TI', version: '1.0', estado: 'vigente', vigencia: '2026-09-01' },
  { codigo: 'FMT-001', nombre: 'Formato de No Conformidad', proceso: 'QMS', version: '3.2', estado: 'vigente', vigencia: '2027-06-30' },
]

const TIPO_COLORS: Record<string, string> = {
  ESTRATEGICO: '#7C3AED', MISIONAL: QMS_COLOR, APOYO: '#6B7280', EVALUACION: '#D97706',
}

export default function QMSProcesos() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DeviceHub sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Mapa de Procesos</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Arquitectura de procesos organizacional</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nuevo Proceso
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Mapa Visual" />
          <Tab label="Lista de Procesos" />
          <Tab label="Procedimientos" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          {[
            { title: 'Procesos Estratégicos', color: '#7C3AED', items: PROCESOS_ESTRATEGICOS },
            { title: 'Procesos Misionales',   color: QMS_COLOR, items: PROCESOS_MISIONALES },
            { title: 'Procesos de Apoyo',     color: '#6B7280', items: PROCESOS_APOYO },
            { title: 'Procesos de Evaluación',color: '#D97706', items: PROCESOS_EVALUACION },
          ].map(g => (
            <Box key={g.title} sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>{g.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {g.items.map(p => (
                  <Box key={p} sx={{ px: 2, py: 1.5, borderRadius: 2, border: `1px solid ${alpha(g.color, 0.3)}`, bgcolor: alpha(g.color, 0.07), minWidth: 160, cursor: 'pointer', '&:hover': { bgcolor: alpha(g.color, 0.13) } }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary' }}>{p}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>Proceso activo</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>Responsable</TableCell><TableCell>Norma</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {TABLA_PROCESOS.map(p => (
                  <TableRow key={p.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'text.primary', fontSize: 12.5 } }}>
                    <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: QMS_COLOR }}>{p.codigo}</Typography></TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell><Chip label={p.tipo} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(TIPO_COLORS[p.tipo], 0.15), color: TIPO_COLORS[p.tipo] }} /></TableCell>
                    <TableCell>{p.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{p.norma}</TableCell>
                    <TableCell><Chip label={p.estado} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR }} /></TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><Visibility sx={{ fontSize: 15 }} /></IconButton>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><Edit sx={{ fontSize: 15 }} /></IconButton>
                    </TableCell>
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
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Proceso</TableCell><TableCell>Versión</TableCell><TableCell>Estado</TableCell><TableCell>Vigencia</TableCell><TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PROCEDIMIENTOS.map(p => (
                  <TableRow key={p.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'text.primary', fontSize: 12.5 } }}>
                    <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: QMS_COLOR }}>{p.codigo}</Typography></TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>{p.proceso}</TableCell>
                    <TableCell>v{p.version}</TableCell>
                    <TableCell><Chip label={p.estado} size="small" sx={{ fontSize: 10, height: 20, bgcolor: p.estado === 'vigente' ? alpha(QMS_COLOR, 0.15) : alpha('#D97706', 0.15), color: p.estado === 'vigente' ? QMS_COLOR : '#D97706' }} /></TableCell>
                    <TableCell>{p.vigencia}</TableCell>
                    <TableCell><IconButton size="small" sx={{ color: 'text.secondary' }}><Edit sx={{ fontSize: 15 }} /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Proceso</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            {[['Código', 'Ej: PE-004'], ['Nombre del Proceso', 'Nombre descriptivo'], ['Objetivo', 'Objetivo del proceso'], ['Norma ISO Aplicable', 'ISO 9001:2015']].map(([label, ph]) => (
              <TextField key={label} label={label} placeholder={ph} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            ))}
            <FormControl size="small">
              <InputLabel sx={{ color: 'text.secondary' }}>Tipo de Proceso</InputLabel>
              <Select label="Tipo de Proceso" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['ESTRATEGICO', 'MISIONAL', 'APOYO', 'EVALUACION'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
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
