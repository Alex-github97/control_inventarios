// QMS Module - Quejas y Reclamos
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, alpha, IconButton, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SupportAgent, Add, Visibility } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const QUEJAS = [
  { codigo: 'QRE-001', tipo: 'queja', desc: 'Demora en entrega de carga urgente - 3 horas sobre SLA', cliente: 'Empresa ABC S.A.', origen: 'cliente', proceso: 'TMS', responsable: 'María López', limite: '2026-06-22', estado: 'en_gestion', satis: null },
  { codigo: 'QRE-002', tipo: 'reclamo', desc: 'Daño en mercancía – reclamación económica $2.5M', cliente: 'Industrias XYZ', origen: 'cliente', proceso: 'WMS', responsable: 'Juan Pérez', limite: '2026-06-25', estado: 'abierta', satis: null },
  { codigo: 'QRE-003', tipo: 'queja', desc: 'Conductor con comportamiento inadecuado en planta cliente', cliente: 'Almacenes del Norte', origen: 'cliente', proceso: 'TMS', responsable: 'Carlos Ruiz', limite: '2026-06-28', estado: 'en_gestion', satis: null },
  { codigo: 'QRE-004', tipo: 'sugerencia', desc: 'Implementar tracking en tiempo real para clientes', cliente: 'Distribuidora Centro', origen: 'cliente', proceso: 'TMS', responsable: 'Ana García', limite: '2026-07-15', estado: 'cerrada', satis: 5 },
  { codigo: 'QRE-005', tipo: 'reclamo', desc: 'Entrega en dirección incorrecta – carga no recuperada', cliente: 'Ferretería El Maestro', origen: 'cliente', proceso: 'TMS', responsable: 'Pedro Silva', limite: '2026-06-20', estado: 'cerrada', satis: 3 },
  { codigo: 'QRE-006', tipo: 'felicitacion', desc: 'Excelente servicio en operación especial de navidad', cliente: 'Almacenes Éxito', origen: 'cliente', proceso: 'Operacional', responsable: 'Gerencia', limite: '—', estado: 'cerrada', satis: 5 },
  { codigo: 'QRE-007', tipo: 'queja', desc: 'Facturas sin detalle de concepto de costos adicionales', cliente: 'Grupo Industrial Sur', origen: 'cliente', proceso: 'Financiero', responsable: 'Laura Díaz', limite: '2026-07-01', estado: 'abierta', satis: null },
  { codigo: 'QRE-008', tipo: 'reclamo', desc: 'Temperatura fuera de rango en entrega de producto frío', cliente: 'Alimentos Frescos S.A.', origen: 'cliente', proceso: 'TMS', responsable: 'Roberto Torres', limite: '2026-06-23', estado: 'vencida', satis: null },
]

const NPS_DATA = { score: 78, promotores: 45, neutros: 33, detractores: 22 }
const CSAT_DIST = [
  { stars: 5, pct: 45 }, { stars: 4, pct: 30 }, { stars: 3, pct: 15 }, { stars: 2, pct: 7 }, { stars: 1, pct: 3 },
]

const TIPO_COLOR: Record<string, string> = { queja: '#DC2626', reclamo: '#EA580C', sugerencia: QMS_COLOR, felicitacion: '#0369A1' }
const EST_COLOR: Record<string, string>  = { abierta: '#DC2626', en_gestion: '#D97706', cerrada: QMS_COLOR, vencida: '#7C3AED' }

export default function QMSQuejas() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)

  const filtered = QUEJAS.filter(q => !filtroTipo || q.tipo === filtroTipo)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SupportAgent sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Quejas y Reclamos</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · PQRS · Satisfacción del cliente</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Registrar PQRS
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Quejas Abiertas', value: '5', color: '#DC2626' },
            { label: 'Reclamos', value: '3', color: '#EA580C' },
            { label: 'Sugerencias', value: '2', color: QMS_COLOR },
            { label: 'T. Prom. Respuesta', value: '2.4d', color: '#0369A1' },
            { label: 'NPS Mes', value: '78', color: QMS_COLOR },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, sm: 4, md: 'auto' }} sx={{ flex: 1 }}>
              <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="PQRS" />
          <Tab label="NPS y Satisfacción" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {Object.entries(TIPO_COLOR).map(([t, c]) => (
              <Chip key={t} label={t} size="small" onClick={() => setFiltroTipo(filtroTipo === t ? null : t)}
                sx={{ fontSize: 11, cursor: 'pointer', textTransform: 'capitalize', bgcolor: filtroTipo === t ? alpha(c, 0.2) : '#F1F5F9', color: filtroTipo === t ? c : '#64748B', border: `1px solid ${filtroTipo === t ? alpha(c, 0.4) : 'transparent'}` }} />
            ))}
          </Box>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Tipo</TableCell><TableCell>Descripción</TableCell><TableCell>Cliente</TableCell><TableCell>Proceso</TableCell><TableCell>Responsable</TableCell><TableCell>Fecha Límite</TableCell><TableCell>Estado</TableCell><TableCell>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(q => (
                  <TableRow key={q.codigo} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{q.codigo}</Typography></TableCell>
                    <TableCell><Chip label={q.tipo} size="small" sx={{ fontSize: 9, height: 18, textTransform: 'capitalize', bgcolor: alpha(TIPO_COLOR[q.tipo], 0.15), color: TIPO_COLOR[q.tipo], fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.desc}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{q.cliente}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{q.proceso}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{q.responsable}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{q.limite}</TableCell>
                    <TableCell><Chip label={q.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[q.estado], 0.15), color: EST_COLOR[q.estado], fontWeight: 700 }} /></TableCell>
                    <TableCell><IconButton size="small" sx={{ color: 'text.secondary' }}><Visibility sx={{ fontSize: 14 }} /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={3}>
            {/* NPS Panel */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Net Promoter Score (NPS)</Typography>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography sx={{ fontSize: 64, fontWeight: 900, color: NPS_DATA.score >= 70 ? QMS_COLOR : '#D97706', lineHeight: 1 }}>{NPS_DATA.score}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Escala: -100 a +100</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {[
                      { label: 'Promotores (9-10)', pct: NPS_DATA.promotores, color: QMS_COLOR },
                      { label: 'Neutros (7-8)', pct: NPS_DATA.neutros, color: '#6B7280' },
                      { label: 'Detractores (0-6)', pct: NPS_DATA.detractores, color: '#DC2626' },
                    ].map(s => (
                      <Box key={s.label} sx={{ flex: s.pct, height: 8, bgcolor: s.color, borderRadius: 1 }} />
                    ))}
                  </Box>
                  {[
                    { label: `Promotores (9-10): ${NPS_DATA.promotores}%`, color: QMS_COLOR },
                    { label: `Neutros (7-8): ${NPS_DATA.neutros}%`, color: '#6B7280' },
                    { label: `Detractores (0-6): ${NPS_DATA.detractores}%`, color: '#DC2626' },
                  ].map(s => (
                    <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.label}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* CSAT */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>CSAT — Satisfacción del Cliente</Typography>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: 48, fontWeight: 900, color: '#D97706', lineHeight: 1 }}>4.3</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>de 5.0 estrellas</Typography>
                  </Box>
                  {CSAT_DIST.map(d => (
                    <Box key={d.stars} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Typography sx={{ fontSize: 12, color: '#D97706', width: 20 }}>{'★'.repeat(d.stars)}</Typography>
                      <LinearProgress variant="determinate" value={d.pct} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#D97706' } }} />
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', width: 32, textAlign: 'right' }}>{d.pct}%</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar PQRS</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: 'text.secondary' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } }}>
                {['queja', 'reclamo', 'sugerencia', 'felicitacion'].map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Cliente / Empresa" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Responsable de Gestión" fullWidth size="small" InputLabelProps={{ sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
            <TextField label="Fecha Límite Respuesta" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'text.secondary' } }} sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: '#E5E7EB' } } }} />
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
