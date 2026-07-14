// QMS Module - Gestión de Auditorías
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FactCheck, Add, Visibility } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const AUDITORIAS = [
  { codigo: 'AUD-001', nombre: 'Auditoría Interna ISO 9001 — Operaciones', tipo: 'INTERNA', norma: 'ISO 9001:2015', auditor: 'Roberto Méndez', empresa: 'ICOLTRANS', fInicio: '2026-07-15', fFin: '2026-07-17', estado: 'PLANIFICADA', resultado: null, hallazgos: 0 },
  { codigo: 'AUD-002', nombre: 'Auditoría Seguimiento ISO 28000', tipo: 'EXTERNA', norma: 'ISO 28000:2022', auditor: 'Carlos Torres', empresa: 'Bureau Veritas', fInicio: '2026-08-01', fFin: '2026-08-03', estado: 'PLANIFICADA', resultado: null, hallazgos: 0 },
  { codigo: 'AUD-003', nombre: 'Auditoría Cliente XYZ — Revisión Operacional', tipo: 'CLIENTE', norma: 'Contractual', auditor: 'Carlos Vega', empresa: 'Cliente XYZ', fInicio: '2026-06-10', fFin: '2026-06-12', estado: 'COMPLETADA', resultado: 'aprobado', hallazgos: 3 },
  { codigo: 'AUD-004', nombre: 'Auditoría Proveedor Transportes Sur', tipo: 'PROVEEDOR', norma: 'ISO 9001:2015', auditor: 'María García', empresa: 'ICOLTRANS', fInicio: '2026-06-20', fFin: '2026-06-20', estado: 'COMPLETADA', resultado: 'condicionado', hallazgos: 7 },
  { codigo: 'AUD-005', nombre: 'Auditoría ISO 45001 Seguridad Laboral', tipo: 'CERTIFICACION', norma: 'ISO 45001:2018', auditor: 'Equipo SGS', empresa: 'SGS', fInicio: '2026-09-15', fFin: '2026-09-18', estado: 'PLANIFICADA', resultado: null, hallazgos: 0 },
  { codigo: 'AUD-006', nombre: 'Revisión Sistema Gestión Ambiental', tipo: 'INTERNA', norma: 'ISO 14001:2015', auditor: 'Ana Ruiz', empresa: 'ICOLTRANS', fInicio: '2026-05-10', fFin: '2026-05-12', estado: 'COMPLETADA', resultado: 'aprobado', hallazgos: 4 },
]

const HALLAZGOS_AUD = [
  { codigo: 'HAL-001', desc: 'Falta señalización en zona de carga peligrosa', tipo: 'observacion', auditoria: 'AUD-003', impacto: 'alto', responsable: 'Pedro Gómez', limite: '2026-07-01', estado: 'ABIERTO' },
  { codigo: 'HAL-002', desc: 'Procedimiento de despacho desactualizado (versión 2019)', tipo: 'no_conformidad', auditoria: 'AUD-003', impacto: 'alto', responsable: 'Ana Ruiz', limite: '2026-06-25', estado: 'EN_TRATAMIENTO' },
  { codigo: 'HAL-003', desc: 'Falta de EPP completo en zona de cargue', tipo: 'no_conformidad', auditoria: 'AUD-004', impacto: 'alto', responsable: 'Carlos Silva', limite: '2026-07-05', estado: 'ABIERTO' },
  { codigo: 'HAL-004', desc: 'Registros de temperatura incompletos', tipo: 'observacion', auditoria: 'AUD-003', impacto: 'medio', responsable: 'María López', limite: '2026-07-15', estado: 'VERIFICACION' },
  { codigo: 'HAL-005', desc: 'Oportunidad de mejora en trazabilidad digital', tipo: 'oportunidad_mejora', auditoria: 'AUD-006', impacto: 'bajo', responsable: 'Equipo TI', limite: '2026-08-01', estado: 'ABIERTO' },
]

const TIPO_COLOR: Record<string, string> = { INTERNA: '#0369A1', EXTERNA: '#D97706', CLIENTE: QMS_COLOR, CERTIFICACION: '#DC2626', PROVEEDOR: '#7C3AED' }
const EST_COLOR: Record<string, string> = { PLANIFICADA: '#0369A1', EN_EJECUCION: '#D97706', COMPLETADA: QMS_COLOR, CANCELADA: '#6B7280' }
const RES_COLOR: Record<string, string> = { aprobado: QMS_COLOR, condicionado: '#D97706', rechazado: '#DC2626' }
const HAL_TIPO_COLOR: Record<string, string> = { no_conformidad: '#DC2626', observacion: '#D97706', oportunidad_mejora: QMS_COLOR }

export default function QMSAuditorias() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FactCheck sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Gestión de Auditorías</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · Auditorías internas y externas</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Auditoría
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Planificadas', value: '3', color: '#0369A1' },
            { label: 'En Ejecución', value: '1', color: '#D97706' },
            { label: 'Completadas (año)', value: '8', color: QMS_COLOR },
            { label: 'Hallazgos Abiertos', value: '14', color: '#DC2626' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Lista de Auditorías" />
          <Tab label="Hallazgos" />
          <Tab label="Programa Anual" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#F1F5F9', color: 'text.disabled', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>Norma</TableCell><TableCell>Auditor</TableCell><TableCell>Fecha Plan</TableCell><TableCell>Estado</TableCell><TableCell>Resultado</TableCell><TableCell>Hallazgos</TableCell><TableCell>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {AUDITORIAS.map(a => (
                  <TableRow key={a.codigo} sx={{ '& td': { borderColor: '#F9FAFB', color: 'text.secondary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{a.codigo}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</Typography></TableCell>
                    <TableCell><Chip label={a.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[a.tipo], 0.15), color: TIPO_COLOR[a.tipo], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{a.norma}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{a.auditor}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{a.fInicio}</TableCell>
                    <TableCell><Chip label={a.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[a.estado], 0.15), color: EST_COLOR[a.estado], fontWeight: 700 }} /></TableCell>
                    <TableCell>{a.resultado ? <Chip label={a.resultado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(RES_COLOR[a.resultado], 0.15), color: RES_COLOR[a.resultado], fontWeight: 700 }} /> : <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}><Chip label={a.hallazgos} size="small" sx={{ fontSize: 11, height: 20, bgcolor: a.hallazgos > 0 ? alpha('#DC2626', 0.15) : '#F9FAFB', color: a.hallazgos > 0 ? '#DC2626' : 'text.disabled' }} /></TableCell>
                    <TableCell><IconButton size="small" sx={{ color: 'text.disabled' }}><Visibility sx={{ fontSize: 14 }} /></IconButton></TableCell>
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
                <TableRow sx={{ '& th': { borderColor: '#F1F5F9', color: 'text.disabled', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Descripción</TableCell><TableCell>Tipo</TableCell><TableCell>Auditoría</TableCell><TableCell>Impacto</TableCell><TableCell>Responsable</TableCell><TableCell>Fecha Límite</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {HALLAZGOS_AUD.map(h => (
                  <TableRow key={h.codigo} sx={{ '& td': { borderColor: '#F9FAFB', color: 'text.secondary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{h.codigo}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.desc}</Typography></TableCell>
                    <TableCell><Chip label={h.tipo === 'no_conformidad' ? 'NC' : h.tipo === 'observacion' ? 'OBS' : 'OM'} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(HAL_TIPO_COLOR[h.tipo], 0.15), color: HAL_TIPO_COLOR[h.tipo], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#D97706' }}>{h.auditoria}</TableCell>
                    <TableCell><Chip label={h.impacto} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(h.impacto === 'alto' ? '#DC2626' : h.impacto === 'medio' ? '#D97706' : QMS_COLOR, 0.15), color: h.impacto === 'alto' ? '#DC2626' : h.impacto === 'medio' ? '#D97706' : QMS_COLOR, fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.limite}</TableCell>
                    <TableCell><Chip label={h.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: h.estado === 'VERIFICACION' ? alpha('#0369A1', 0.15) : h.estado === 'EN_TRATAMIENTO' ? alpha('#D97706', 0.15) : alpha('#DC2626', 0.15), color: h.estado === 'VERIFICACION' ? '#0369A1' : h.estado === 'EN_TRATAMIENTO' ? '#D97706' : '#DC2626', fontWeight: 700 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Programa de Auditorías 2026</Typography>
              {/* Gantt simplificado */}
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 700 }}>
                  {/* Header meses */}
                  <Box sx={{ display: 'flex', mb: 1, ml: 18 }}>
                    {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map(m => (
                      <Box key={m} sx={{ flex: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700 }}>{m}</Typography></Box>
                    ))}
                  </Box>
                  {[
                    { nombre: 'AUD-001 ISO 9001 Int.', color: '#0369A1', inicio: 6, duracion: 1 },
                    { nombre: 'AUD-002 ISO 28000 Ext.', color: '#D97706', inicio: 7, duracion: 1 },
                    { nombre: 'AUD-003 Cliente XYZ', color: QMS_COLOR, inicio: 5, duracion: 1 },
                    { nombre: 'AUD-005 ISO 45001 Cert.', color: '#DC2626', inicio: 8, duracion: 1 },
                  ].map(r => (
                    <Box key={r.nombre} sx={{ display: 'flex', alignItems: 'center', mb: 1, height: 28 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', width: 70, flexShrink: 0, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</Typography>
                      <Box sx={{ flex: 1, display: 'flex', position: 'relative', height: '100%' }}>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <Box key={i} sx={{ flex: 1, height: '100%', bgcolor: i % 2 === 0 ? '#F9FAFB' : 'transparent', borderLeft: '1px solid #F1F5F9' }} />
                        ))}
                        <Box sx={{ position: 'absolute', left: `${(r.inicio / 12) * 100}%`, width: `${(r.duracion / 12) * 100}%`, top: 4, height: 20, bgcolor: alpha(r.color, 0.8), borderRadius: 1 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Auditoría</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            {[['Código', 'AUD-YYYY-NNN'], ['Nombre', 'Nombre de la auditoría'], ['Norma', 'ISO 9001:2015'], ['Auditor Líder', 'Nombre del auditor'], ['Empresa Auditora', 'Nombre empresa']].map(([label, ph]) => (
              <TextField key={label} label={label} placeholder={ph} fullWidth size="small" />
            ))}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select label="Tipo" defaultValue="">
                    {['INTERNA', 'EXTERNA', 'CLIENTE', 'CERTIFICACION', 'PROVEEDOR'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Fecha Inicio Plan" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
