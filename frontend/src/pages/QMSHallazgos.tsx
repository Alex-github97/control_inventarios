// QMS Module - Gestión de Hallazgos
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FindInPage, Add, Visibility, Edit } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

const HALLAZGOS = [
  { codigo: 'HAL-001', desc: 'Falta señalización en zona de carga peligrosa', tipo: 'observacion', auditoria: 'AUD-003', proceso: 'WMS', impacto: 'alto', responsable: 'Pedro Gómez', limite: '2026-07-01', estado: 'ABIERTO' },
  { codigo: 'HAL-002', desc: 'Procedimiento de despacho desactualizado versión 2019', tipo: 'no_conformidad', auditoria: 'AUD-003', proceso: 'TMS', impacto: 'alto', responsable: 'Ana Ruiz', limite: '2026-06-25', estado: 'EN_TRATAMIENTO' },
  { codigo: 'HAL-003', desc: 'Oportunidad de mejora en trazabilidad digital de productos', tipo: 'oportunidad_mejora', auditoria: 'AUD-001', proceso: 'WMS', impacto: 'bajo', responsable: 'Carlos Silva', limite: '2026-08-01', estado: 'ABIERTO' },
  { codigo: 'HAL-004', desc: 'Falta de EPP completo en zona de cargue nocturno', tipo: 'no_conformidad', auditoria: 'AUD-004', proceso: 'Operacional', impacto: 'alto', responsable: 'Jefe SST', limite: '2026-07-05', estado: 'ABIERTO' },
  { codigo: 'HAL-005', desc: 'Registros de temperatura de bodega incompletos', tipo: 'observacion', auditoria: 'AUD-003', proceso: 'WMS', impacto: 'medio', responsable: 'María López', limite: '2026-07-15', estado: 'VERIFICACION' },
  { codigo: 'HAL-006', desc: 'Vehículos sin extintor vigente en flota propia', tipo: 'no_conformidad', auditoria: 'AUD-002', proceso: 'Flota', impacto: 'alto', responsable: 'Jefe Flota', limite: '2026-06-30', estado: 'ABIERTO' },
  { codigo: 'HAL-007', desc: 'Contrato con proveedor vencido — sin renovar', tipo: 'observacion', auditoria: 'AUD-006', proceso: 'Compras', impacto: 'medio', responsable: 'Compras', limite: '2026-07-20', estado: 'EN_TRATAMIENTO' },
  { codigo: 'HAL-008', desc: 'Mejora en el proceso de validación de pesos y medidas', tipo: 'oportunidad_mejora', auditoria: 'AUD-006', proceso: 'WMS', impacto: 'bajo', responsable: 'Jefe WMS', limite: '2026-09-01', estado: 'CERRADO' },
  { codigo: 'HAL-009', desc: 'Conductor con historial de infracciones sin registro', tipo: 'no_conformidad', auditoria: 'AUD-004', proceso: 'RRHH', impacto: 'alto', responsable: 'RRHH', limite: '2026-06-28', estado: 'ABIERTO' },
  { codigo: 'HAL-010', desc: 'Ausencia de indicadores de desempeño en proceso de compras', tipo: 'observacion', auditoria: 'AUD-001', proceso: 'Compras', impacto: 'medio', responsable: 'Compras', limite: '2026-08-15', estado: 'ABIERTO' },
]

const TIPO_COLOR: Record<string, { label: string; color: string }> = {
  no_conformidad:    { label: 'NC',  color: '#DC2626' },
  observacion:       { label: 'OBS', color: '#D97706' },
  oportunidad_mejora:{ label: 'OM',  color: QMS_COLOR },
}
const EST_COLOR: Record<string, string> = { ABIERTO: '#DC2626', EN_TRATAMIENTO: '#D97706', VERIFICACION: '#0369A1', CERRADO: QMS_COLOR }
const IMP_COLOR: Record<string, string> = { alto: '#DC2626', medio: '#D97706', bajo: QMS_COLOR }

export default function QMSHallazgos() {
  const [openDialog, setOpenDialog] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)

  const filtered = HALLAZGOS.filter(h =>
    (!filtroTipo || h.tipo === filtroTipo) &&
    (!filtroEstado || h.estado === filtroEstado)
  )

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FindInPage sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Gestión de Hallazgos</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Hallazgos de auditorías y operación</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Registrar Hallazgo
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Hallazgos Abiertos', value: '18', color: '#DC2626' },
            { label: 'En Tratamiento', value: '7', color: '#D97706' },
            { label: 'Vencidos', value: '3', color: '#DC2626' },
            { label: 'Cerrados este mes', value: '12', color: QMS_COLOR },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {Object.entries(TIPO_COLOR).map(([t, meta]) => (
            <Chip key={t} label={meta.label} size="small" onClick={() => setFiltroTipo(filtroTipo === t ? null : t)}
              sx={{ fontSize: 11, cursor: 'pointer', bgcolor: filtroTipo === t ? alpha(meta.color, 0.2) : '#F8FAFC', color: filtroTipo === t ? meta.color : '#64748B', border: `1px solid ${filtroTipo === t ? alpha(meta.color, 0.4) : '#E5E7EB'}` }} />
          ))}
          <Box sx={{ mx: 0.5, borderLeft: '1px solid #E5E7EB' }} />
          {['ABIERTO', 'EN_TRATAMIENTO', 'VERIFICACION', 'CERRADO'].map(e => (
            <Chip key={e} label={e.replace('_', ' ')} size="small" onClick={() => setFiltroEstado(filtroEstado === e ? null : e)}
              sx={{ fontSize: 11, cursor: 'pointer', bgcolor: filtroEstado === e ? alpha(EST_COLOR[e], 0.2) : '#F8FAFC', color: filtroEstado === e ? EST_COLOR[e] : '#64748B', border: `1px solid ${filtroEstado === e ? alpha(EST_COLOR[e], 0.4) : '#E5E7EB'}` }} />
          ))}
        </Box>

        <Paper sx={{ bgcolor: 'transparent' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Código</TableCell><TableCell>Descripción</TableCell><TableCell>Tipo</TableCell><TableCell>Auditoría</TableCell><TableCell>Proceso</TableCell><TableCell>Impacto</TableCell><TableCell>Responsable</TableCell><TableCell>Fecha Límite</TableCell><TableCell>Estado</TableCell><TableCell>Acc.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(h => {
                const meta = TIPO_COLOR[h.tipo]
                return (
                  <TableRow key={h.codigo} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{h.codigo}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.desc}</Typography></TableCell>
                    <TableCell><Chip label={meta.label} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#D97706' }}>{h.auditoria}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.proceso}</TableCell>
                    <TableCell><Chip label={h.impacto} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(IMP_COLOR[h.impacto], 0.15), color: IMP_COLOR[h.impacto], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.limite}</TableCell>
                    <TableCell><Chip label={h.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[h.estado], 0.15), color: EST_COLOR[h.estado], fontWeight: 700 }} /></TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><Visibility sx={{ fontSize: 14 }} /></IconButton>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar Hallazgo</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Descripción del Hallazgo" multiline rows={3} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>Tipo</InputLabel>
                  <Select label="Tipo" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } }}>
                    {['no_conformidad', 'observacion', 'oportunidad_mejora'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>Impacto</InputLabel>
                  <Select label="Impacto" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } }}>
                    {['alto', 'medio', 'bajo'].map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Responsable" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Fecha Límite" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Evidencia / Descripción" multiline rows={2} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
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
