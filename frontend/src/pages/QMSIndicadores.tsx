// QMS — Motor de Indicadores de Calidad (API real)
import { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  alpha, LinearProgress, Stack, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Analytics, Add, TrendingUp, TrendingDown } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

const QMS_COLOR = '#059669'
const QMS_DARK = '#047857'
const MODULOS = ['TMS', 'WMS', 'EAM', 'CRM', 'SST', 'HCM', 'DMS', 'MES', 'APS', 'SCM', 'ERP', 'Compras', 'Financiero', 'QMS']
const TIPOS = ['estrategico', 'tactico', 'operativo']
const FRECUENCIAS = ['diario', 'semanal', 'mensual', 'trimestral', 'anual']

interface IndTablero {
  id: number; codigo?: string | null; nombre: string; tipo?: string | null; unidad?: string | null
  frecuencia?: string | null; modulo_origen?: string | null; proceso_id?: number | null; activo: boolean
  meta?: number | null; meta_min?: number | null; meta_max?: number | null
  valor_actual?: number | null; periodo_actual?: string | null; cumple?: boolean | null
  variacion_pct?: number | null; historico: number[]
}
interface Medicion { id: number; indicador_id: number; periodo: string; valor: number; cumple_meta?: boolean | null; variacion_pct?: number | null; observaciones?: string | null }

const nowMonth = () => new Date().toISOString().slice(0, 7)
const semaforo = (i: IndTablero): 'verde' | 'amarillo' | 'rojo' => {
  if (i.valor_actual == null || i.meta == null) return 'amarillo'
  if (i.cumple) return 'verde'
  const ratio = i.meta ? i.valor_actual / i.meta : 1
  return ratio >= 0.95 ? 'amarillo' : 'rojo'
}
const SEMAFORO_COLOR = { verde: QMS_COLOR, amarillo: '#D97706', rojo: '#DC2626' }

const EMPTY_MED = { indicador_id: '', periodo: nowMonth(), valor: '', observaciones: '' }
const EMPTY_IND = { codigo: '', nombre: '', modulo_origen: 'QMS', tipo: 'operativo', unidad: '%', frecuencia: 'mensual', meta: '', meta_min: '', meta_max: '' }

export default function QMSIndicadores() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [medOpen, setMedOpen] = useState(false)
  const [indOpen, setIndOpen] = useState(false)
  const [medForm, setMedForm] = useState({ ...EMPTY_MED })
  const [indForm, setIndForm] = useState({ ...EMPTY_IND })
  const [tried, setTried] = useState(false)
  const [triedI, setTriedI] = useState(false)

  const { data: tablero = [], isLoading } = useQuery<IndTablero[]>({
    queryKey: ['qms-tablero'], queryFn: () => api.get('/qms/indicadores/tablero').then(r => r.data),
  })
  const { data: mediciones = [] } = useQuery<Medicion[]>({
    queryKey: ['qms-mediciones'], queryFn: () => api.get('/qms/mediciones?limit=200').then(r => r.data),
  })
  const indName = (id: number) => tablero.find(i => i.id === id)?.nombre ?? `#${id}`
  const indUnidad = (id: number) => tablero.find(i => i.id === id)?.unidad ?? ''

  const mutMed = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/qms/mediciones', b),
    onSuccess: () => { toast.success('Medición registrada'); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); qc.invalidateQueries({ queryKey: ['qms-mediciones'] }); setMedOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar medición'),
  })
  const mutInd = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/qms/indicadores', b),
    onSuccess: () => { toast.success('Indicador creado'); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); setIndOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear indicador'),
  })

  const abrirMed = () => { setMedForm({ ...EMPTY_MED }); setTried(false); setMedOpen(true) }
  const abrirInd = () => { setIndForm({ ...EMPTY_IND }); setTriedI(false); setIndOpen(true) }

  // Al registrar medición: calcula cumplimiento y variación vs último histórico
  const registrarMed = () => {
    setTried(true)
    if (!medForm.indicador_id || medForm.valor === '' || !medForm.periodo) return
    const ind = tablero.find(i => i.id === Number(medForm.indicador_id))
    const valor = Number(medForm.valor)
    const cumple = ind?.meta != null ? valor >= ind.meta : undefined
    const prev = ind?.historico?.length ? ind.historico[ind.historico.length - 1] : undefined
    const variacion = prev != null && prev !== 0 ? Number((((valor - prev) / Math.abs(prev)) * 100).toFixed(2)) : undefined
    mutMed.mutate({
      indicador_id: Number(medForm.indicador_id), periodo: medForm.periodo, valor,
      cumple_meta: cumple, variacion_pct: variacion, observaciones: medForm.observaciones || undefined,
    })
  }
  const crearInd = () => {
    setTriedI(true)
    if (!indForm.nombre) return
    mutInd.mutate({
      codigo: indForm.codigo || undefined, nombre: indForm.nombre, modulo_origen: indForm.modulo_origen,
      tipo: indForm.tipo, unidad: indForm.unidad || undefined, frecuencia: indForm.frecuencia,
      meta: indForm.meta ? Number(indForm.meta) : undefined,
      meta_min: indForm.meta_min ? Number(indForm.meta_min) : undefined,
      meta_max: indForm.meta_max ? Number(indForm.meta_max) : undefined,
    })
  }

  const resumen = useMemo(() => ({
    total: tablero.length,
    verde: tablero.filter(i => semaforo(i) === 'verde').length,
    rojo: tablero.filter(i => semaforo(i) === 'rojo').length,
  }), [tablero])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Analytics sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Indicadores de Calidad</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Motor de KPIs · {resumen.total} indicadores configurados</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Stack direction="row" gap={1}>
            <Button startIcon={<Add />} size="small" variant="outlined" onClick={abrirInd} sx={{ color: QMS_COLOR, borderColor: alpha(QMS_COLOR, 0.4), textTransform: 'none', fontWeight: 700 }}>Nuevo indicador</Button>
            <Button startIcon={<Add />} size="small" variant="contained" onClick={abrirMed} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Registrar medición</Button>
          </Stack>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13, textTransform: 'none' }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label={`Tablero de KPIs (${resumen.total})`} />
          <Tab label="Registro de mediciones" />
          <Tab label="Metas" />
        </Tabs>

        {/* Tablero */}
        {tab === 0 && (
          isLoading ? <LinearProgress /> : tablero.length === 0 ? (
            <Alert severity="info">Aún no hay indicadores configurados. Agrega los indicadores de la plataforma con "Nuevo indicador" (o desde QMS · Configuración).</Alert>
          ) : (
            <Grid container spacing={2} className="anim-stagger">
              {tablero.map(ind => {
                const color = SEMAFORO_COLOR[semaforo(ind)]
                const pct = ind.meta && ind.valor_actual != null ? Math.min((ind.valor_actual / ind.meta) * 100, 100) : 0
                const spMax = Math.max(...(ind.historico.length ? ind.historico : [1]))
                return (
                  <Grid key={ind.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Card className="hover-lift" sx={{ border: `1px solid ${alpha(color, 0.35)}`, borderRadius: 2 }}>
                      <CardContent sx={{ p: '14px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, mt: 0.5 }} />
                          {ind.modulo_origen && <Chip label={ind.modulo_origen} size="small" sx={{ fontSize: 9, height: 16 }} />}
                        </Box>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }} noWrap>{ind.nombre}</Typography>
                        <Typography className="text-gradient" sx={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {ind.valor_actual != null ? `${ind.valor_actual}${ind.unidad ?? ''}` : '—'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>Meta: {ind.meta != null ? `${ind.meta}${ind.unidad ?? ''}` : '—'}</Typography>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#F1F5F9', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 24 }}>
                          {(ind.historico.length ? ind.historico : [0]).map((v, i, arr) => (
                            <Box key={i} sx={{ flex: 1, height: `${Math.max((v / spMax) * 24, 4)}px`, bgcolor: alpha(color, i === arr.length - 1 ? 0.85 : 0.35), borderRadius: '2px 2px 0 0' }} />
                          ))}
                        </Box>
                        {ind.variacion_pct != null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                            {ind.variacion_pct >= 0 ? <TrendingUp sx={{ fontSize: 12, color: QMS_COLOR }} /> : <TrendingDown sx={{ fontSize: 12, color: '#DC2626' }} />}
                            <Typography sx={{ fontSize: 10.5, color: ind.variacion_pct >= 0 ? QMS_COLOR : '#DC2626' }}>{ind.variacion_pct > 0 ? '+' : ''}{ind.variacion_pct}% vs período ant.</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )
        )}

        {/* Mediciones */}
        {tab === 1 && (
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Indicador</TableCell><TableCell>Período</TableCell><TableCell>Valor</TableCell><TableCell>Cumple</TableCell><TableCell>Variación</TableCell><TableCell>Observaciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mediciones.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell>{indName(m.indicador_id)}</TableCell>
                    <TableCell>{m.periodo}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.valor}{indUnidad(m.indicador_id)}</TableCell>
                    <TableCell><Chip label={m.cumple_meta ? 'Sí' : 'No'} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(m.cumple_meta ? QMS_COLOR : '#DC2626', 0.15), color: m.cumple_meta ? QMS_COLOR : '#DC2626' }} /></TableCell>
                    <TableCell sx={{ color: (m.variacion_pct ?? 0) < 0 ? '#DC2626' : QMS_COLOR }}>{m.variacion_pct != null ? `${m.variacion_pct > 0 ? '+' : ''}${m.variacion_pct}%` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{m.observaciones ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {mediciones.length === 0 && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={3}>Sin mediciones registradas</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Metas */}
        {tab === 2 && (
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Indicador</TableCell><TableCell>Módulo</TableCell><TableCell>Frecuencia</TableCell><TableCell>Meta</TableCell><TableCell>Mín</TableCell><TableCell>Máx</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tablero.map(ind => (
                  <TableRow key={ind.id} hover>
                    <TableCell>{ind.nombre}</TableCell>
                    <TableCell>{ind.modulo_origen ? <Chip label={ind.modulo_origen} size="small" sx={{ fontSize: 10 }} /> : '—'}</TableCell>
                    <TableCell>{ind.frecuencia ?? '—'}</TableCell>
                    <TableCell sx={{ color: QMS_COLOR, fontWeight: 700 }}>{ind.meta != null ? `${ind.meta}${ind.unidad ?? ''}` : '—'}</TableCell>
                    <TableCell>{ind.meta_min != null ? `${ind.meta_min}${ind.unidad ?? ''}` : '—'}</TableCell>
                    <TableCell>{ind.meta_max != null ? `${ind.meta_max}${ind.unidad ?? ''}` : '—'}</TableCell>
                  </TableRow>
                ))}
                {tablero.length === 0 && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={3}>Sin indicadores configurados</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Diálogo registrar medición */}
        <Dialog open={medOpen} onClose={() => setMedOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar medición</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField select label="Indicador *" size="small" fullWidth value={medForm.indicador_id} onChange={e => setMedForm(f => ({ ...f, indicador_id: e.target.value }))}
              error={tried && !medForm.indicador_id} helperText={tried && !medForm.indicador_id ? 'Seleccione el indicador' : ''}>
              <MenuItem value="">Seleccionar…</MenuItem>
              {tablero.map(i => <MenuItem key={i.id} value={String(i.id)}>{i.nombre}{i.modulo_origen ? ` · ${i.modulo_origen}` : ''}</MenuItem>)}
            </TextField>
            <TextField label="Período *" type="month" fullWidth size="small" value={medForm.periodo} onChange={e => setMedForm(f => ({ ...f, periodo: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Valor *" type="number" fullWidth size="small" value={medForm.valor} onChange={e => setMedForm(f => ({ ...f, valor: e.target.value }))} error={tried && medForm.valor === ''} helperText={tried && medForm.valor === '' ? 'Ingrese el valor medido' : ''} />
            <TextField label="Observaciones" multiline rows={2} fullWidth size="small" value={medForm.observaciones} onChange={e => setMedForm(f => ({ ...f, observaciones: e.target.value }))} />
            <Alert severity="info" sx={{ fontSize: 12.5 }}>El cumplimiento vs meta y la variación se calculan automáticamente.</Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMedOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={mutMed.isPending} onClick={registrarMed} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK } }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo nuevo indicador */}
        <Dialog open={indOpen} onClose={() => setIndOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo indicador</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 8 }}><TextField label="Nombre *" size="small" fullWidth value={indForm.nombre} onChange={e => setIndForm(f => ({ ...f, nombre: e.target.value }))} error={triedI && !indForm.nombre} helperText={triedI && !indForm.nombre ? 'Requerido' : ''} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField label="Código" size="small" fullWidth value={indForm.codigo} onChange={e => setIndForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField select label="Módulo origen" size="small" fullWidth value={indForm.modulo_origen} onChange={e => setIndForm(f => ({ ...f, modulo_origen: e.target.value }))}>{MODULOS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField select label="Tipo" size="small" fullWidth value={indForm.tipo} onChange={e => setIndForm(f => ({ ...f, tipo: e.target.value }))}>{TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField select label="Frecuencia" size="small" fullWidth value={indForm.frecuencia} onChange={e => setIndForm(f => ({ ...f, frecuencia: e.target.value }))}>{FRECUENCIAS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Unidad" size="small" fullWidth value={indForm.unidad} onChange={e => setIndForm(f => ({ ...f, unidad: e.target.value }))} placeholder="% / und / M$" /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Meta" type="number" size="small" fullWidth value={indForm.meta} onChange={e => setIndForm(f => ({ ...f, meta: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Meta mín" type="number" size="small" fullWidth value={indForm.meta_min} onChange={e => setIndForm(f => ({ ...f, meta_min: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Meta máx" type="number" size="small" fullWidth value={indForm.meta_max} onChange={e => setIndForm(f => ({ ...f, meta_max: e.target.value }))} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIndOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={mutInd.isPending} onClick={crearInd} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK } }}>Crear indicador</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
