// QMS — Motor de Indicadores: arrastra indicadores de toda la plataforma,
// matriz de cumplimiento por período (auditoría y seguimiento).
import { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  alpha, LinearProgress, Stack, Alert, Checkbox, FormControlLabel, Tooltip, IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Analytics, Add, TrendingUp, TrendingDown, CloudSync, Download, GridOn, Edit } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

const QMS_COLOR = '#059669'
const QMS_DARK = '#047857'

interface IndTablero {
  id: number; codigo?: string | null; nombre: string; unidad?: string | null; modulo_origen?: string | null
  meta?: number | null; valor_actual?: number | null; periodo_actual?: string | null
  cumple?: boolean | null; variacion_pct?: number | null; historico: number[]
}
interface Medicion { id: number; indicador_id: number; periodo: string; valor: number; cumple_meta?: boolean | null; variacion_pct?: number | null; observaciones?: string | null }
interface Fuente { key: string; nombre: string; modulo: string; unidad: string; meta: number; auto: boolean; importado: boolean }
interface MatrizFila { id: number; codigo?: string | null; nombre: string; modulo_origen?: string | null; unidad?: string | null; meta?: number | null; auto: boolean; valores: Record<string, { valor: number; cumple: boolean | null } | null>; cumplimiento_pct?: number | null }
interface Matriz { periodos: string[]; filas: MatrizFila[] }

const nowMonth = () => new Date().toISOString().slice(0, 7)
const monthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7) }
const SEM = { verde: QMS_COLOR, amarillo: '#D97706', rojo: '#DC2626' }
const semaforo = (i: IndTablero): keyof typeof SEM => i.valor_actual == null || i.meta == null ? 'amarillo' : i.cumple ? 'verde' : (i.meta ? i.valor_actual / i.meta : 1) >= 0.95 ? 'amarillo' : 'rojo'

const EMPTY_MED = { indicador_id: '', periodo: nowMonth(), valor: '', observaciones: '' }

export default function QMSIndicadores() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [mDesde, setMDesde] = useState(monthsAgo(5))
  const [mHasta, setMHasta] = useState(nowMonth())
  const [medOpen, setMedOpen] = useState(false)
  const [medForm, setMedForm] = useState({ ...EMPTY_MED })
  const [tried, setTried] = useState(false)
  const [fuentesOpen, setFuentesOpen] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [sincOpen, setSincOpen] = useState(false)
  const [sincRange, setSincRange] = useState({ desde: monthsAgo(5), hasta: nowMonth() })
  const [metaEdit, setMetaEdit] = useState<null | MatrizFila | IndTablero>(null)
  const [metaVal, setMetaVal] = useState('')

  const { data: tablero = [], isLoading } = useQuery<IndTablero[]>({ queryKey: ['qms-tablero'], queryFn: () => api.get('/qms/indicadores/tablero').then(r => r.data) })
  const { data: mediciones = [] } = useQuery<Medicion[]>({ queryKey: ['qms-mediciones'], queryFn: () => api.get('/qms/mediciones?limit=300').then(r => r.data) })
  const { data: matriz } = useQuery<Matriz>({ queryKey: ['qms-matriz', mDesde, mHasta], queryFn: () => api.get(`/qms/matriz?desde=${mDesde}&hasta=${mHasta}`).then(r => r.data), enabled: tab === 1 })
  const { data: fuentes = [] } = useQuery<Fuente[]>({ queryKey: ['qms-fuentes'], queryFn: () => api.get('/qms/fuentes').then(r => r.data), enabled: fuentesOpen })

  const indName = (id: number) => tablero.find(i => i.id === id)?.nombre ?? `#${id}`
  const indUnidad = (id: number) => tablero.find(i => i.id === id)?.unidad ?? ''

  const mutImportar = useMutation({
    mutationFn: (claves: string[]) => api.post('/qms/indicadores/importar', { claves }),
    onSuccess: (r: any) => { toast.success(`${r.data.creados} indicador(es) importado(s)`); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); qc.invalidateQueries({ queryKey: ['qms-fuentes'] }); qc.invalidateQueries({ queryKey: ['qms-matriz'] }); setFuentesOpen(false); setSel(new Set()) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al importar'),
  })
  const mutSinc = useMutation({
    mutationFn: (b: { desde: string; hasta: string }) => api.post('/qms/indicadores/sincronizar', b),
    onSuccess: (r: any) => { toast.success(`${r.data.mediciones_sincronizadas} mediciones sincronizadas de ${r.data.indicadores_automaticos} indicadores`); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); qc.invalidateQueries({ queryKey: ['qms-mediciones'] }); qc.invalidateQueries({ queryKey: ['qms-matriz'] }); setSincOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al sincronizar'),
  })
  const mutMed = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/qms/mediciones', b),
    onSuccess: () => { toast.success('Medición registrada'); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); qc.invalidateQueries({ queryKey: ['qms-mediciones'] }); qc.invalidateQueries({ queryKey: ['qms-matriz'] }); setMedOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar'),
  })
  const mutMeta = useMutation({
    mutationFn: ({ id, meta }: { id: number; meta: number }) => api.put(`/qms/indicadores/${id}`, { meta }),
    onSuccess: () => { toast.success('Meta actualizada'); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); qc.invalidateQueries({ queryKey: ['qms-matriz'] }); setMetaEdit(null) },
    onError: () => toast.error('No se pudo actualizar la meta'),
  })

  const registrarMed = () => {
    setTried(true)
    if (!medForm.indicador_id || medForm.valor === '' || !medForm.periodo) return
    const ind = tablero.find(i => i.id === Number(medForm.indicador_id))
    const valor = Number(medForm.valor)
    const cumple = ind?.meta != null ? valor >= ind.meta : undefined
    const prev = ind?.historico?.length ? ind.historico[ind.historico.length - 1] : undefined
    const variacion = prev != null && prev !== 0 ? Number((((valor - prev) / Math.abs(prev)) * 100).toFixed(2)) : undefined
    mutMed.mutate({ indicador_id: Number(medForm.indicador_id), periodo: medForm.periodo, valor, cumple_meta: cumple, variacion_pct: variacion, observaciones: medForm.observaciones || undefined })
  }

  const toggleSel = (k: string) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  const resumen = useMemo(() => ({ total: tablero.length, verde: tablero.filter(i => semaforo(i) === 'verde').length, rojo: tablero.filter(i => semaforo(i) === 'rojo').length }), [tablero])

  const exportarMatriz = (tipo: 'pdf' | 'excel') => {
    if (!matriz) return
    const cols = [{ key: 'indicador', header: 'Indicador' }, { key: 'modulo', header: 'Módulo' }, { key: 'meta', header: 'Meta' },
      ...matriz.periodos.map(p => ({ key: p, header: p })), { key: 'cumpl', header: '% Cumpl.' }]
    const filas = matriz.filas.map(f => ({
      indicador: f.nombre, modulo: f.modulo_origen ?? '', meta: f.meta ?? '',
      ...Object.fromEntries(matriz.periodos.map(p => [p, f.valores[p] ? `${f.valores[p]!.valor}${f.valores[p]!.cumple ? ' ✓' : ' ✗'}` : '—'])),
      cumpl: f.cumplimiento_pct != null ? `${f.cumplimiento_pct}%` : '—',
    }))
    const opts = { archivo: 'qms-matriz-cumplimiento', titulo: 'QMS — Matriz de cumplimiento de indicadores', color: QMS_COLOR, columnas: cols, filas }
    tipo === 'pdf' ? exportarPDF(opts) : exportarExcel(opts)
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Analytics sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Indicadores de Calidad</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · {resumen.total} indicadores en seguimiento · matriz de cumplimiento y auditoría</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button startIcon={<GridOn />} size="small" variant="outlined" onClick={() => { setSel(new Set()); setFuentesOpen(true) }} sx={{ color: QMS_COLOR, borderColor: alpha(QMS_COLOR, 0.4), textTransform: 'none', fontWeight: 700 }}>Importar de módulos</Button>
            <Button startIcon={<CloudSync />} size="small" variant="outlined" onClick={() => setSincOpen(true)} sx={{ color: QMS_COLOR, borderColor: alpha(QMS_COLOR, 0.4), textTransform: 'none', fontWeight: 700 }}>Sincronizar</Button>
            <Button startIcon={<Add />} size="small" variant="contained" onClick={() => { setMedForm({ ...EMPTY_MED }); setTried(false); setMedOpen(true) }} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Registrar medición</Button>
          </Stack>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13, textTransform: 'none' }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label={`Tablero (${resumen.total})`} />
          <Tab label="Matriz de cumplimiento" />
          <Tab label="Mediciones" />
          <Tab label="Metas" />
        </Tabs>

        {/* ── Tablero ── */}
        {tab === 0 && (
          isLoading ? <LinearProgress /> : tablero.length === 0 ? (
            <Alert severity="info">Aún no hay indicadores en seguimiento. Usa <b>Importar de módulos</b> para arrastrar los indicadores de la plataforma.</Alert>
          ) : (
            <Grid container spacing={2} className="anim-stagger">
              {tablero.map(ind => {
                const color = SEM[semaforo(ind)]
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
                        <Typography className="text-gradient" sx={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{ind.valor_actual != null ? `${ind.valor_actual}${ind.unidad ?? ''}` : '—'}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>Meta: {ind.meta != null ? `${ind.meta}${ind.unidad ?? ''}` : '—'}{ind.periodo_actual ? ` · ${ind.periodo_actual}` : ''}</Typography>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#F1F5F9', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 24 }}>
                          {(ind.historico.length ? ind.historico : [0]).map((v, i, arr) => <Box key={i} sx={{ flex: 1, height: `${Math.max((v / spMax) * 24, 4)}px`, bgcolor: alpha(color, i === arr.length - 1 ? 0.85 : 0.35), borderRadius: '2px 2px 0 0' }} />)}
                        </Box>
                        {ind.variacion_pct != null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                            {ind.variacion_pct >= 0 ? <TrendingUp sx={{ fontSize: 12, color: QMS_COLOR }} /> : <TrendingDown sx={{ fontSize: 12, color: '#DC2626' }} />}
                            <Typography sx={{ fontSize: 10.5, color: ind.variacion_pct >= 0 ? QMS_COLOR : '#DC2626' }}>{ind.variacion_pct > 0 ? '+' : ''}{ind.variacion_pct}% vs ant.</Typography>
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

        {/* ── Matriz de cumplimiento ── */}
        {tab === 1 && (
          <>
            <Stack direction="row" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
              <TextField label="Desde" type="month" size="small" value={mDesde} onChange={e => setMDesde(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Hasta" type="month" size="small" value={mHasta} onChange={e => setMHasta(e.target.value)} InputLabelProps={{ shrink: true }} />
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportarMatriz('pdf')} sx={{ textTransform: 'none' }}>PDF</Button>
              <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportarMatriz('excel')} sx={{ textTransform: 'none' }}>Excel</Button>
            </Stack>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', bgcolor: '#F8FAFC', whiteSpace: 'nowrap' } }}>
                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3 }}>Indicador</TableCell>
                    <TableCell>Módulo</TableCell>
                    <TableCell align="center">Meta</TableCell>
                    {(matriz?.periodos ?? []).map(p => <TableCell key={p} align="center">{p}</TableCell>)}
                    <TableCell align="center">% Cumpl.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(matriz?.filas ?? []).map(f => (
                    <TableRow key={f.id} hover>
                      <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#FFF', fontWeight: 600, zIndex: 2 }}>
                        {f.nombre}{f.auto && <Tooltip title="Se sincroniza automático del módulo"><CloudSync sx={{ fontSize: 12, color: QMS_COLOR, ml: 0.5, verticalAlign: 'middle' }} /></Tooltip>}
                      </TableCell>
                      <TableCell>{f.modulo_origen ? <Chip label={f.modulo_origen} size="small" sx={{ fontSize: 10 }} /> : '—'}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: QMS_COLOR }}>{f.meta != null ? `${f.meta}${f.unidad ?? ''}` : '—'}</TableCell>
                      {(matriz?.periodos ?? []).map(p => {
                        const c = f.valores[p]
                        return (
                          <TableCell key={p} align="center" sx={{ fontVariantNumeric: 'tabular-nums', bgcolor: !c ? undefined : c.cumple ? alpha(QMS_COLOR, 0.12) : alpha('#DC2626', 0.10), color: !c ? 'text.disabled' : c.cumple ? QMS_DARK : '#DC2626', fontWeight: c ? 700 : 400 }}>
                            {c ? c.valor : '—'}
                          </TableCell>
                        )
                      })}
                      <TableCell align="center">
                        {f.cumplimiento_pct != null ? <Chip size="small" label={`${f.cumplimiento_pct}%`} color={f.cumplimiento_pct >= 90 ? 'success' : f.cumplimiento_pct >= 70 ? 'warning' : 'error'} /> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(matriz?.filas ?? []).length === 0 && <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={3}>Sin indicadores. Importa de módulos y sincroniza el rango.</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>
            <Typography fontSize={11} color="text.secondary" mt={1}>Verde = cumple la meta · Rojo = incumple · — sin dato en el período. Los indicadores con ⟳ se alimentan automáticamente del módulo origen al sincronizar.</Typography>
          </>
        )}

        {/* ── Mediciones ── */}
        {tab === 2 && (
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Indicador</TableCell><TableCell>Período</TableCell><TableCell>Valor</TableCell><TableCell>Cumple</TableCell><TableCell>Variación</TableCell><TableCell>Observaciones</TableCell>
              </TableRow></TableHead>
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
                {mediciones.length === 0 && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={3}>Sin mediciones</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* ── Metas ── */}
        {tab === 3 && (
          <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Indicador</TableCell><TableCell>Módulo</TableCell><TableCell>Unidad</TableCell><TableCell>Meta</TableCell><TableCell align="right">Acción</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {tablero.map(ind => (
                  <TableRow key={ind.id} hover>
                    <TableCell>{ind.nombre}</TableCell>
                    <TableCell>{ind.modulo_origen ? <Chip label={ind.modulo_origen} size="small" sx={{ fontSize: 10 }} /> : '—'}</TableCell>
                    <TableCell>{ind.unidad ?? '—'}</TableCell>
                    <TableCell sx={{ color: QMS_COLOR, fontWeight: 700 }}>{ind.meta != null ? `${ind.meta}${ind.unidad ?? ''}` : '—'}</TableCell>
                    <TableCell align="right"><IconButton size="small" onClick={() => { setMetaEdit(ind); setMetaVal(ind.meta != null ? String(ind.meta) : '') }} sx={{ color: QMS_COLOR }}><Edit sx={{ fontSize: 17 }} /></IconButton></TableCell>
                  </TableRow>
                ))}
                {tablero.length === 0 && <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={3}>Sin indicadores</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Diálogo importar de módulos */}
        <Dialog open={fuentesOpen} onClose={() => setFuentesOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Importar indicadores de la plataforma</DialogTitle>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 1.5, fontSize: 12.5 }}>Selecciona los indicadores de otros módulos que el QMS debe seguir. Los marcados con ⟳ se calculan automáticamente al sincronizar.</Alert>
            <Stack>
              {fuentes.map(fu => (
                <FormControlLabel key={fu.key} disabled={fu.importado}
                  control={<Checkbox size="small" checked={fu.importado || sel.has(fu.key)} onChange={() => toggleSel(fu.key)} sx={{ '&.Mui-checked': { color: QMS_COLOR } }} />}
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography fontSize={13.5}>{fu.nombre}</Typography>
                      <Chip label={fu.modulo} size="small" sx={{ fontSize: 9, height: 16 }} />
                      {fu.auto && <Tooltip title="Cálculo automático"><CloudSync sx={{ fontSize: 13, color: QMS_COLOR }} /></Tooltip>}
                      {fu.importado && <Chip label="ya importado" size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(QMS_COLOR, 0.12), color: QMS_DARK }} />}
                    </Stack>
                  } />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFuentesOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={sel.size === 0 || mutImportar.isPending} onClick={() => mutImportar.mutate([...sel])} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK } }}>Importar {sel.size > 0 ? `(${sel.size})` : ''}</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo sincronizar */}
        <Dialog open={sincOpen} onClose={() => setSincOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Sincronizar períodos</DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={13} mb={2}>Arrastra los valores reales de los indicadores automáticos (MES, etc.) para el rango seleccionado.</Typography>
            <Stack direction="row" gap={1.5}>
              <TextField label="Desde" type="month" size="small" fullWidth value={sincRange.desde} onChange={e => setSincRange(r => ({ ...r, desde: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Hasta" type="month" size="small" fullWidth value={sincRange.hasta} onChange={e => setSincRange(r => ({ ...r, hasta: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSincOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={mutSinc.isPending} onClick={() => mutSinc.mutate(sincRange)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK } }}>Sincronizar</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo registrar medición */}
        <Dialog open={medOpen} onClose={() => setMedOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar medición</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField select label="Indicador *" size="small" fullWidth value={medForm.indicador_id} onChange={e => setMedForm(f => ({ ...f, indicador_id: e.target.value }))} error={tried && !medForm.indicador_id} helperText={tried && !medForm.indicador_id ? 'Seleccione el indicador' : ''}>
              <MenuItem value="">Seleccionar…</MenuItem>
              {tablero.map(i => <MenuItem key={i.id} value={String(i.id)}>{i.nombre}{i.modulo_origen ? ` · ${i.modulo_origen}` : ''}</MenuItem>)}
            </TextField>
            <TextField label="Período *" type="month" fullWidth size="small" value={medForm.periodo} onChange={e => setMedForm(f => ({ ...f, periodo: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Valor *" type="number" fullWidth size="small" value={medForm.valor} onChange={e => setMedForm(f => ({ ...f, valor: e.target.value }))} error={tried && medForm.valor === ''} helperText={tried && medForm.valor === '' ? 'Ingrese el valor' : ''} />
            <TextField label="Observaciones" multiline rows={2} fullWidth size="small" value={medForm.observaciones} onChange={e => setMedForm(f => ({ ...f, observaciones: e.target.value }))} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMedOpen(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={mutMed.isPending} onClick={registrarMed} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK } }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo editar meta */}
        <Dialog open={!!metaEdit} onClose={() => setMetaEdit(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Configurar meta</DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={13} mb={1.5}>{metaEdit?.nombre}</Typography>
            <TextField label="Meta" type="number" size="small" fullWidth value={metaVal} onChange={e => setMetaVal(e.target.value)} InputProps={{ endAdornment: <Typography fontSize={12} color="text.secondary">{(metaEdit as any)?.unidad ?? ''}</Typography> }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMetaEdit(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={metaVal === '' || mutMeta.isPending} onClick={() => metaEdit && mutMeta.mutate({ id: metaEdit.id, meta: Number(metaVal) })} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
