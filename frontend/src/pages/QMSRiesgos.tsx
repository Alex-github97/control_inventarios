/**
 * QMS · Riesgos operacionales (ISO 31000)
 *
 * Era una maqueta con 8 riesgos fijos. El backend ya tenía el CRUD.
 *
 * El nivel (prob × impacto) y la prioridad los calcula el backend en cada
 * POST/PUT; acá se replica el mismo umbral solo para la vista previa del
 * formulario — el valor que queda guardado siempre es el del servidor.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  alpha, Slider, IconButton, Tooltip, Alert, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Dangerous, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

const QMS_COLOR = '#059669'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

interface Riesgo {
  id: number
  codigo?: string | null
  nombre: string
  descripcion?: string | null
  proceso_id?: number | null
  probabilidad: number
  impacto: number
  nivel_riesgo: number
  prioridad: string
  estado: string
  controles?: string | null
  plan_mitigacion?: string | null
  responsable_id?: number | null
  norma_iso?: string | null
  fecha_revision?: string | null
}
interface ProcesoQMS { id: number; nombre: string }
interface UsuarioMin { id: number; nombre?: string | null; apellido?: string | null; username?: string | null }

const nombreDeUsuario = (u?: UsuarioMin | null): string => {
  if (!u) return '—'
  return [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.username || `#${u.id}`
}

const PRIOR_COLOR: Record<string, string> = {
  CRITICA: '#DC2626', ALTA: '#EA580C', MEDIA: '#D97706', BAJA: QMS_COLOR,
}

/** Mismos cortes que `_calcular_prioridad_riesgo` en el backend. */
function prioridadDe(nivel: number): string {
  if (nivel <= 4) return 'BAJA'
  if (nivel <= 9) return 'MEDIA'
  if (nivel <= 14) return 'ALTA'
  return 'CRITICA'
}
const nivelColor = (n: number) => PRIOR_COLOR[prioridadDe(n)]
const cellColor = (p: number, i: number) => alpha(nivelColor(p * i), 0.3)

const PROB_LABELS = ['', 'Rara', 'Improbable', 'Posible', 'Probable', 'Casi seguro']
const IMP_LABELS = ['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico']

const VACIO = {
  nombre: '', descripcion: '', proceso_id: '', probabilidad: 3, impacto: 3,
  estado: '', controles: '', plan_mitigacion: '', responsable_id: '',
  norma_iso: '', fecha_revision: '',
}

export default function QMSRiesgos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Riesgo | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      nombre: it.nombre, descripcion: it.descripcion ?? '',
      proceso_id: it.proceso_id != null ? String(it.proceso_id) : '',
      probabilidad: it.probabilidad, impacto: it.impacto,
      estado: it.estado ?? '', controles: it.controles ?? '',
      plan_mitigacion: it.plan_mitigacion ?? '',
      responsable_id: it.responsable_id != null ? String(it.responsable_id) : '',
      norma_iso: it.norma_iso ?? '',
      fecha_revision: it.fecha_revision ? it.fecha_revision.slice(0, 10) : '',
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: riesgos = [], isLoading } = useQuery<Riesgo[]>({
    queryKey: ['qms-riesgos'],
    queryFn: () => api.get('/qms/riesgos', { params: { limit: 200 } }).then(r => r.data),
  })
  const { data: procesos = [] } = useQuery<ProcesoQMS[]>({
    queryKey: ['qms-procesos'],
    queryFn: () => api.get('/qms/procesos').then(r => r.data),
  })
  const { data: usuarios = [], isError: sinUsuarios } = useQuery<UsuarioMin[]>({
    queryKey: ['usuarios-min'],
    queryFn: () => api.get('/usuarios/').then(r => r.data),
    retry: false,
  })

  const nombreProceso = (id?: number | null) => procesos.find(p => p.id === id)?.nombre ?? '—'
  const nombreUsuario = (id?: number | null) => nombreDeUsuario(usuarios.find(u => u.id === id))

  const err = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')
  const invalidar = () => qc.invalidateQueries({ queryKey: ['qms-riesgos'] })

  const mutGuardar = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const nivel = form.probabilidad * form.impacto
      const cuerpo = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        proceso_id: n(form.proceso_id),
        probabilidad: form.probabilidad,
        impacto: form.impacto,
        // El servidor los recalcula; van porque el esquema los exige.
        nivel_riesgo: nivel,
        prioridad: prioridadDe(nivel),
        estado: form.estado || 'Activo',
        controles: form.controles.trim() || null,
        plan_mitigacion: form.plan_mitigacion.trim() || null,
        responsable_id: n(form.responsable_id),
        norma_iso: form.norma_iso || null,
        fecha_revision: form.fecha_revision ? `${form.fecha_revision}T00:00:00` : null,
      }
      return dlg.item
        ? api.put(`/qms/riesgos/${dlg.item.id}`, cuerpo).then(r => r.data)
        : api.post('/qms/riesgos', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Riesgo actualizado' : 'Riesgo creado')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/qms/riesgos/${id}`),
    onSuccess: () => { toast.success('Riesgo eliminado'); invalidar() },
    onError: err,
  })

  const nivelForm = form.probabilidad * form.impacto

  const kpis = useMemo(() => {
    const en30 = new Date(); en30.setDate(en30.getDate() + 30)
    const limite = en30.toISOString().slice(0, 10)
    return [
      { label: 'Riesgos críticos', value: riesgos.filter(r => r.prioridad === 'CRITICA').length, color: '#DC2626' },
      { label: 'Riesgos altos', value: riesgos.filter(r => r.prioridad === 'ALTA').length, color: '#EA580C' },
      {
        label: 'Sin plan de mitigación',
        value: riesgos.filter(r => !r.plan_mitigacion || !r.plan_mitigacion.trim()).length,
        color: '#D97706',
      },
      {
        label: 'Revisión en 30 días',
        value: riesgos.filter(r => r.fecha_revision && r.fecha_revision.slice(0, 10) <= limite).length,
        color: '#0369A1',
      },
    ]
  }, [riesgos])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Dangerous sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Riesgos Operacionales</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Gestión de riesgos ISO 31000</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{
              bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700,
              border: `1px solid ${alpha(QMS_COLOR, 0.3)}`,
            }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained"
            onClick={() => setDlg({ abierto: true, item: null })}
            sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nuevo riesgo
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.35)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2, borderBottom: '1px solid #F1F5F9',
          '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 },
          '& .Mui-selected': { color: QMS_COLOR },
          '& .MuiTabs-indicator': { bgcolor: QMS_COLOR },
        }}>
          <Tab label="Matriz de riesgos" />
          <Tab label={`Lista de riesgos (${riesgos.length})`} />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && riesgos.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay riesgos registrados. Use <strong>Nuevo riesgo</strong> para el primero;
            la matriz se llena sola con lo que se registre.
          </Alert>
        )}

        <TabPanel value={tab} index={0}>
          <Card sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Matriz de riesgos 5×5</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center', width: 20 }}>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.08em' }}>
                    PROBABILIDAD →
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', ml: 6, mb: 0.5 }}>
                    {IMP_LABELS.slice(1).map(l => (
                      <Box key={l} sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{l}</Typography>
                      </Box>
                    ))}
                  </Box>
                  {[5, 4, 3, 2, 1].map(p => (
                    <Box key={p} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 9, color: 'text.secondary', width: 48, textAlign: 'right', pr: 1, flexShrink: 0 }}>
                        {PROB_LABELS[p]}
                      </Typography>
                      {[1, 2, 3, 4, 5].map(i => {
                        const aqui = riesgos.filter(r => r.probabilidad === p && r.impacto === i)
                        return (
                          <Box key={i} sx={{
                            flex: 1, minHeight: 52, bgcolor: cellColor(p, i),
                            border: '1px solid #E5E7EB', borderRadius: 1, display: 'flex',
                            flexWrap: 'wrap', gap: 0.25, p: 0.5, alignContent: 'flex-start',
                          }}>
                            {aqui.map(r => (
                              <Tooltip key={r.id} title={r.nombre}>
                                <Chip label={r.codigo ?? `RSK-${r.id}`} size="small"
                                  onClick={() => setDlg({ abierto: true, item: r })}
                                  sx={{
                                    fontSize: 8, height: 16, cursor: 'pointer',
                                    bgcolor: alpha(nivelColor(r.nivel_riesgo), 0.4),
                                    color: 'text.primary', fontWeight: 700,
                                  }} />
                              </Tooltip>
                            ))}
                          </Box>
                        )
                      })}
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', ml: 6, mt: 0.5 }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: '0.08em' }}>IMPACTO →</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                    {[
                      { label: 'BAJO (1-4)', c: QMS_COLOR }, { label: 'MEDIO (5-9)', c: '#D97706' },
                      { label: 'ALTO (10-14)', c: '#EA580C' }, { label: 'CRÍTICO (15-25)', c: '#DC2626' },
                    ].map(l => (
                      <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: alpha(l.c, 0.5) }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{l.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell>
                  <TableCell>Proceso</TableCell><TableCell>P</TableCell><TableCell>I</TableCell>
                  <TableCell>Nivel</TableCell><TableCell>Prioridad</TableCell>
                  <TableCell>Estado</TableCell><TableCell>Responsable</TableCell>
                  <TableCell>Controles</TableCell><TableCell sx={{ width: 80 }}>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {riesgos.map(r => (
                  <TableRow key={r.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>
                        {r.codigo ?? `RSK-${r.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Tooltip title={r.descripcion ?? r.nombre}>
                        <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.nombre}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nombreProceso(r.proceso_id)}</TableCell>
                    <TableCell><Chip label={r.probabilidad} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#F1F5F9' }} /></TableCell>
                    <TableCell><Chip label={r.impacto} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#F1F5F9' }} /></TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, color: nivelColor(r.nivel_riesgo), fontSize: 14 }}>
                        {r.nivel_riesgo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={r.prioridad} size="small" sx={{
                        fontSize: 9, height: 18, fontWeight: 700,
                        bgcolor: alpha(PRIOR_COLOR[r.prioridad] ?? '#64748B', 0.15),
                        color: PRIOR_COLOR[r.prioridad] ?? '#64748B',
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{r.estado || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(r.responsable_id)}</TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {r.controles ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setDlg({ abierto: true, item: r })}>
                        <Edit sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => {
                        if (window.confirm(`¿Eliminar el riesgo "${r.nombre}"?`)) mutBorrar.mutate(r.id)
                      }}>
                        <DeleteForever sx={{ fontSize: 14, color: '#DC2626' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `RSK-${dlg.item.id}`}` : 'Nuevo riesgo'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Nombre del riesgo *" size="small" fullWidth autoFocus
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción" size="small" fullWidth multiline rows={2}
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                    Probabilidad: {form.probabilidad} — {PROB_LABELS[form.probabilidad]}
                  </Typography>
                  <Slider value={form.probabilidad} min={1} max={5} step={1} marks
                    onChange={(_, v) => setForm(f => ({ ...f, probabilidad: v as number }))}
                    sx={{ color: QMS_COLOR }} />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                    Impacto: {form.impacto} — {IMP_LABELS[form.impacto]}
                  </Typography>
                  <Slider value={form.impacto} min={1} max={5} step={1} marks
                    onChange={(_, v) => setForm(f => ({ ...f, impacto: v as number }))}
                    sx={{ color: QMS_COLOR }} />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{
                  p: 1.5, borderRadius: 2, bgcolor: alpha(nivelColor(nivelForm), 0.1),
                  border: `1px solid ${alpha(nivelColor(nivelForm), 0.3)}`,
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: nivelColor(nivelForm) }}>
                    Nivel de riesgo: {nivelForm} — {prioridadDe(nivelForm)}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    La prioridad la asigna el sistema; no se edita a mano.
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Proceso" size="small" fullWidth value={form.proceso_id}
                  onChange={e => setForm(f => ({ ...f, proceso_id: e.target.value }))}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {procesos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="ESTADO_RIESGO" label="Estado"
                  valor={form.estado} onChange={v => setForm(f => ({ ...f, estado: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="NORMA_ISO" label="Norma aplicable"
                  valor={form.norma_iso} onChange={v => setForm(f => ({ ...f, norma_iso: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Responsable" size="small" fullWidth value={form.responsable_id}
                  onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))}
                  helperText={sinUsuarios ? 'Solo un administrador ve la lista' : undefined}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {usuarios.map(u => <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Próxima revisión" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_revision}
                  onChange={e => setForm(f => ({ ...f, fecha_revision: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Controles existentes" size="small" fullWidth multiline rows={2}
                  value={form.controles}
                  onChange={e => setForm(f => ({ ...f, controles: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Plan de mitigación" size="small" fullWidth multiline rows={2}
                  value={form.plan_mitigacion}
                  onChange={e => setForm(f => ({ ...f, plan_mitigacion: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained"
              disabled={!form.nombre.trim() || mutGuardar.isPending}
              onClick={() => mutGuardar.mutate()}
              sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>
              {mutGuardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
