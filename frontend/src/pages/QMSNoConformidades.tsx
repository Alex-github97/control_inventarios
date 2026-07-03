// QMS Module - No Conformidades y CAPA
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, LinearProgress, IconButton,
} from '@mui/material'
import { BugReport, Add, Visibility, Edit } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const NCS = [
  { codigo: 'NC-001', titulo: 'Daño en mercancía por manipulación inadecuada', clas: 'MAYOR', origen: 'OPERACION', proceso: 'WMS', responsable: 'Juan Pérez', limite: '2026-07-01', estado: 'EN_TRATAMIENTO', capa: 'CAPA-015' },
  { codigo: 'NC-002', titulo: 'Temperatura fuera de rango en bodega refrigerada', clas: 'CRITICA', origen: 'OPERACION', proceso: 'WMS', responsable: 'María López', limite: '2026-06-25', estado: 'ABIERTA', capa: null },
  { codigo: 'NC-003', titulo: 'Conductor sin documentación vigente', clas: 'MENOR', origen: 'HCM', proceso: 'RRHH', responsable: 'Carlos Ruiz', limite: '2026-07-15', estado: 'ABIERTA', capa: null },
  { codigo: 'NC-004', titulo: 'Incumplimiento en tiempos de entrega OTIF', clas: 'MAYOR', origen: 'CLIENTE', proceso: 'TMS', responsable: 'Ana García', limite: '2026-06-30', estado: 'VERIFICACION', capa: 'CAPA-018' },
  { codigo: 'NC-005', titulo: 'Falta de control en cadena de custodia', clas: 'MAYOR', origen: 'AUDITORIA', proceso: 'WMS', responsable: 'Pedro Silva', limite: '2026-07-10', estado: 'EN_TRATAMIENTO', capa: 'CAPA-021' },
  { codigo: 'NC-006', titulo: 'Procedimiento de cargue desactualizado', clas: 'MENOR', origen: 'AUDITORIA', proceso: 'TMS', responsable: 'Laura Díaz', limite: '2026-07-20', estado: 'CERRADA', capa: 'CAPA-012' },
  { codigo: 'NC-007', titulo: 'Falla en registro de temperaturas en tránsito', clas: 'MAYOR', origen: 'OPERACION', proceso: 'TMS', responsable: 'Roberto Gómez', limite: '2026-07-05', estado: 'ABIERTA', capa: null },
  { codigo: 'NC-008', titulo: 'Incidente de SST sin reporte oportuno', clas: 'CRITICA', origen: 'HCM', proceso: 'RRHH', responsable: 'Sandra Torres', limite: '2026-06-28', estado: 'EN_TRATAMIENTO', capa: 'CAPA-020' },
]

const CAPAS = [
  { codigo: 'CAPA-015', tipo: 'CORRECTIVA', titulo: 'Plan de capacitación en manejo de cargas', nc: 'NC-001', responsable: 'Juan Pérez', limite: '2026-07-15', avance: 60, estado: 'EN_CURSO' },
  { codigo: 'CAPA-018', tipo: 'CORRECTIVA', titulo: 'Rediseño de rutas con alertas de OTIF', nc: 'NC-004', responsable: 'Ana García', limite: '2026-07-01', avance: 80, estado: 'EN_CURSO' },
  { codigo: 'CAPA-020', tipo: 'CORRECTIVA', titulo: 'Protocolo de reporte de incidentes SST', nc: 'NC-008', responsable: 'Sandra Torres', limite: '2026-07-10', avance: 35, estado: 'EN_CURSO' },
  { codigo: 'CAPA-021', tipo: 'PREVENTIVA', titulo: 'Actualización sistema de trazabilidad', nc: 'NC-005', responsable: 'Pedro Silva', limite: '2026-08-01', avance: 20, estado: 'ABIERTA' },
  { codigo: 'CAPA-012', tipo: 'MEJORA', titulo: 'Digitalización de procedimientos de cargue', nc: 'NC-006', responsable: 'Laura Díaz', limite: '2026-06-15', avance: 100, estado: 'CERRADA' },
]

const CLS_COLOR: Record<string, string> = { MENOR: '#0369A1', MAYOR: '#EA580C', CRITICA: '#DC2626' }
const EST_COLOR: Record<string, string> = { ABIERTA: '#DC2626', EN_TRATAMIENTO: '#D97706', VERIFICACION: '#0369A1', CERRADA: QMS_COLOR }
const TIPO_CAPA_COLOR: Record<string, string> = { CORRECTIVA: QMS_COLOR, PREVENTIVA: '#0369A1', MEJORA: '#7C3AED' }

const NC_ORIGEN_DATA = [
  { origen: 'Operacion', count: 12 }, { origen: 'Cliente', count: 8 },
  { origen: 'Auditoria', count: 6 }, { origen: 'Proveedor', count: 4 }, { origen: 'HCM', count: 3 },
]
const maxOrigen = Math.max(...NC_ORIGEN_DATA.map(d => d.count))

export default function QMSNoConformidades() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [filtroClasif, setFiltroClasif] = useState<string | null>(null)

  const ncFiltradas = NCS.filter(nc =>
    (!filtroEstado || nc.estado === filtroEstado) &&
    (!filtroClasif || nc.clas === filtroClasif)
  )

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BugReport sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>No Conformidades</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Ciclo NC → CAPA → Cierre</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Registrar NC
          </Button>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'NC Abiertas', value: '7', color: '#DC2626' },
            { label: 'En Tratamiento', value: '4', color: '#D97706' },
            { label: 'CAPA Activas', value: '12', color: '#0369A1' },
            { label: 'CAPA Vencidas', value: '2', color: '#DC2626' },
            { label: 'Cerradas este mes', value: '9', color: QMS_COLOR },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, sm: 4, md: 'auto' }} sx={{ flex: 1 }}>
              <Card sx={{ bgcolor: 'text.primary', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="No Conformidades" />
          <Tab label="Acciones CAPA" />
          <Tab label="Análisis" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          {/* Filtros */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {['ABIERTA', 'EN_TRATAMIENTO', 'VERIFICACION', 'CERRADA'].map(e => (
              <Chip key={e} label={e.replace('_', ' ')} size="small" onClick={() => setFiltroEstado(filtroEstado === e ? null : e)}
                sx={{ fontSize: 11, cursor: 'pointer', bgcolor: filtroEstado === e ? alpha(EST_COLOR[e], 0.2) : 'rgba(255,255,255,0.05)', color: filtroEstado === e ? EST_COLOR[e] : 'rgba(255,255,255,0.5)', border: `1px solid ${filtroEstado === e ? alpha(EST_COLOR[e], 0.4) : 'transparent'}` }} />
            ))}
            <Box sx={{ mx: 0.5, borderLeft: '1px solid rgba(255,255,255,0.1)' }} />
            {['MENOR', 'MAYOR', 'CRITICA'].map(c => (
              <Chip key={c} label={c} size="small" onClick={() => setFiltroClasif(filtroClasif === c ? null : c)}
                sx={{ fontSize: 11, cursor: 'pointer', bgcolor: filtroClasif === c ? alpha(CLS_COLOR[c], 0.2) : 'rgba(255,255,255,0.05)', color: filtroClasif === c ? CLS_COLOR[c] : 'rgba(255,255,255,0.5)', border: `1px solid ${filtroClasif === c ? alpha(CLS_COLOR[c], 0.4) : 'transparent'}` }} />
            ))}
          </Box>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Título</TableCell><TableCell>Clasif.</TableCell><TableCell>Origen</TableCell><TableCell>Proceso</TableCell><TableCell>Responsable</TableCell><TableCell>Límite</TableCell><TableCell>Estado</TableCell><TableCell>CAPA</TableCell><TableCell sx={{ width: 80 }}>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ncFiltradas.map(nc => (
                  <TableRow key={nc.codigo} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{nc.codigo}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.titulo}</Typography></TableCell>
                    <TableCell><Chip label={nc.clas} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(CLS_COLOR[nc.clas], 0.15), color: CLS_COLOR[nc.clas], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nc.origen}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nc.proceso}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nc.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nc.limite}</TableCell>
                    <TableCell><Chip label={nc.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[nc.estado], 0.15), color: EST_COLOR[nc.estado], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11, color: nc.capa ? '#D97706' : 'rgba(255,255,255,0.3)' }}>{nc.capa || '-'}</TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><Visibility sx={{ fontSize: 14 }} /></IconButton>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Tipo</TableCell><TableCell>Título</TableCell><TableCell>NC Origen</TableCell><TableCell>Responsable</TableCell><TableCell>Fecha Límite</TableCell><TableCell>Avance</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CAPAS.map(c => (
                  <TableRow key={c.codigo} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#D97706' }}>{c.codigo}</Typography></TableCell>
                    <TableCell><Chip label={c.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_CAPA_COLOR[c.tipo], 0.15), color: TIPO_CAPA_COLOR[c.tipo], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titulo}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 11, color: QMS_COLOR }}>{c.nc}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.limite}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={c.avance} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: c.avance === 100 ? QMS_COLOR : '#D97706' } }} />
                        <Typography sx={{ fontSize: 11, minWidth: 30 }}>{c.avance}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={c.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: c.estado === 'CERRADA' ? alpha(QMS_COLOR, 0.15) : alpha('#D97706', 0.15), color: c.estado === 'CERRADA' ? QMS_COLOR : '#D97706', fontWeight: 700 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>NC por Origen</Typography>
                  {NC_ORIGEN_DATA.map(d => (
                    <Box key={d.origen} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{d.origen}</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>{d.count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(d.count / maxOrigen) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#DC2626' } }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>NC por Clasificación</Typography>
                  {[{ label: 'Menor', pct: 45, color: '#0369A1' }, { label: 'Mayor', pct: 40, color: '#EA580C' }, { label: 'Crítica', pct: 15, color: '#DC2626' }].map(c => (
                    <Box key={c.label} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{c.label}</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.pct}%</Typography>
                      </Box>
                      <Box sx={{ width: '100%', height: 8, borderRadius: 4, bgcolor: '#F1F5F9' }}>
                        <Box sx={{ width: `${c.pct}%`, height: '100%', borderRadius: 4, bgcolor: c.color }} />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Tendencia NC vs Cerradas</Typography>
                  {[
                    { mes: 'Ene', nc: 4, cerradas: 5 }, { mes: 'Feb', nc: 7, cerradas: 4 }, { mes: 'Mar', nc: 3, cerradas: 6 },
                    { mes: 'Abr', nc: 9, cerradas: 7 }, { mes: 'May', nc: 5, cerradas: 8 }, { mes: 'Jun', nc: 7, cerradas: 9 },
                  ].map(d => (
                    <Box key={d.mes} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', width: 28 }}>{d.mes}</Typography>
                      <Box sx={{ flex: 1, display: 'flex', gap: 0.5 }}>
                        <Box sx={{ height: 10, width: `${(d.nc / 9) * 100}%`, maxWidth: '50%', bgcolor: alpha('#DC2626', 0.7), borderRadius: 1 }} />
                        <Box sx={{ height: 10, width: `${(d.cerradas / 9) * 100}%`, maxWidth: '50%', bgcolor: alpha(QMS_COLOR, 0.7), borderRadius: 1 }} />
                      </Box>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{d.nc}/{d.cerradas}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 10, height: 10, bgcolor: '#DC2626', borderRadius: 1 }} /><Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Abiertas</Typography></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 10, height: 10, bgcolor: QMS_COLOR, borderRadius: 1 }} /><Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Cerradas</Typography></Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar No Conformidad</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Título" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>Clasificación</InputLabel>
                  <Select label="Clasificación" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } }}>
                    {['MENOR', 'MAYOR', 'CRITICA'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>Origen</InputLabel>
                  <Select label="Origen" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } }}>
                    {['AUDITORIA', 'CLIENTE', 'OPERACION', 'TRANSPORTE', 'WMS', 'HCM', 'PROVEEDOR'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Fecha Límite" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
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
