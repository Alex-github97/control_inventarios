/**
 * QMS · Mejora continua
 *
 * Era una maqueta: kanban y lista salían de constantes y el botón no guardaba.
 * El backend ya tenía el CRUD.
 *
 * El estado es un enum de la base y define la columna del kanban; el impacto es
 * texto libre y sale del catálogo.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs, Table, TableBody,
  TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, alpha, IconButton, Tooltip, Alert,
  LinearProgress, Stack,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { TrendingUp, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

const QMS_COLOR = '#059669'

// Enum de la base: la tabla solo acepta estos valores.
const ESTADOS = ['IDEA', 'EVALUACION', 'APROBADA', 'EN_CURSO', 'COMPLETADA', 'RECHAZADA']
const EST_COLOR: Record<string, string> = {
  IDEA: '#6B7280', EVALUACION: '#D97706', APROBADA: '#0369A1',
  EN_CURSO: '#7C3AED', COMPLETADA: QMS_COLOR, RECHAZADA: '#DC2626',
}
// Las columnas del kanban siguen el flujo; el rechazo se ve solo en la lista.
const KANBAN = ['IDEA', 'EVALUACION', 'APROBADA', 'EN_CURSO', 'COMPLETADA']

interface Mejora {
  id: number
  codigo?: string | null
  titulo: string
  descripcion: string
  estado: string
  proceso_id?: number | null
  responsable_id?: number | null
  fecha_limite?: string | null
  fecha_completado?: string | null
  beneficio_esperado?: string | null
  ahorro_estimado?: number | null
  ahorro_real?: number | null
  impacto?: string | null
  retorno_estimado_meses?: number | null
}
interface ProcesoQMS { id: number; nombre: string }
interface UsuarioMin { id: number; nombre?: string | null; apellido?: string | null; username?: string | null }

const nombreDeUsuario = (u?: UsuarioMin | null): string => {
  if (!u) return '—'
  return [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.username || `#${u.id}`
}
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')
const fmtCOP = (v?: number | null) =>
  v == null ? '—' : '$' + Math.round(v).toLocaleString('es-CO')

const VACIO = {
  titulo: '', descripcion: '', estado: 'IDEA', impacto: '',
  proceso_id: '', responsable_id: '', fecha_limite: '',
  beneficio_esperado: '', ahorro_estimado: '', ahorro_real: '',
  retorno_estimado_meses: '',
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

export default function QMSMejora() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Mejora | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      titulo: it.titulo, descripcion: it.descripcion, estado: it.estado,
      impacto: it.impacto ?? '',
      proceso_id: it.proceso_id != null ? String(it.proceso_id) : '',
      responsable_id: it.responsable_id != null ? String(it.responsable_id) : '',
      fecha_limite: it.fecha_limite ? it.fecha_limite.slice(0, 10) : '',
      beneficio_esperado: it.beneficio_esperado ?? '',
      ahorro_estimado: it.ahorro_estimado != null ? String(it.ahorro_estimado) : '',
      ahorro_real: it.ahorro_real != null ? String(it.ahorro_real) : '',
      retorno_estimado_meses: it.retorno_estimado_meses != null ? String(it.retorno_estimado_meses) : '',
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: mejoras = [], isLoading } = useQuery<Mejora[]>({
    queryKey: ['qms-mejoras'],
    queryFn: () => api.get('/qms/mejoras').then(r => r.data),
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
  const invalidar = () => qc.invalidateQueries({ queryKey: ['qms-mejoras'] })

  const mutGuardar = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const cuerpo = {
        titulo: form.titulo.trim(), descripcion: form.descripcion.trim(),
        estado: form.estado, impacto: form.impacto || null,
        proceso_id: n(form.proceso_id), responsable_id: n(form.responsable_id),
        fecha_limite: form.fecha_limite ? `${form.fecha_limite}T00:00:00` : null,
        beneficio_esperado: form.beneficio_esperado.trim() || null,
        ahorro_estimado: n(form.ahorro_estimado),
        ahorro_real: n(form.ahorro_real),
        retorno_estimado_meses: n(form.retorno_estimado_meses),
      }
      return dlg.item
        ? api.put(`/qms/mejoras/${dlg.item.id}`, cuerpo).then(r => r.data)
        : api.post('/qms/mejoras', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Mejora actualizada' : 'Mejora registrada')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/qms/mejoras/${id}`),
    onSuccess: () => { toast.success('Mejora eliminada'); invalidar() },
    onError: err,
  })

  const kpis = useMemo(() => {
    const ahorro = mejoras
      .filter(m => m.estado === 'COMPLETADA')
      .reduce((s, m) => s + (m.ahorro_real ?? m.ahorro_estimado ?? 0), 0)
    return [
      { label: 'Ideas', value: String(mejoras.filter(m => m.estado === 'IDEA').length), color: '#6B7280' },
      { label: 'En curso', value: String(mejoras.filter(m => m.estado === 'EN_CURSO').length), color: '#7C3AED' },
      { label: 'Completadas', value: String(mejoras.filter(m => m.estado === 'COMPLETADA').length), color: QMS_COLOR },
      { label: 'Ahorro logrado', value: fmtCOP(ahorro), color: QMS_COLOR },
    ]
  }, [mejoras])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TrendingUp sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Mejora Continua</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                QMS · Idea → evaluación → aprobación → ejecución
              </Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{
              bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700,
              border: `1px solid ${alpha(QMS_COLOR, 0.3)}`,
            }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained"
            onClick={() => setDlg({ abierto: true, item: null })}
            sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Iniciativa
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</Typography>
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
          <Tab label="Kanban" />
          <Tab label={`Lista (${mejoras.length})`} />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && mejoras.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay iniciativas registradas. Use <strong>Nueva Iniciativa</strong> para la primera.
          </Alert>
        )}

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {KANBAN.map(col => {
              const items = mejoras.filter(m => m.estado === col)
              return (
                <Grid key={col} size={{ xs: 12, md: 2.4 }}>
                  <Box sx={{
                    p: 1, borderRadius: 2, bgcolor: alpha(EST_COLOR[col], 0.06),
                    border: `1px solid ${alpha(EST_COLOR[col], 0.25)}`, minHeight: 160,
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: EST_COLOR[col] }}>
                        {col.replace('_', ' ')}
                      </Typography>
                      <Chip label={items.length} size="small" sx={{
                        height: 18, fontSize: 10, bgcolor: alpha(EST_COLOR[col], 0.15),
                        color: EST_COLOR[col],
                      }} />
                    </Stack>
                    <Stack spacing={0.8}>
                      {items.map(m => (
                        <Card key={m.id} onClick={() => setDlg({ abierto: true, item: m })}
                          sx={{ cursor: 'pointer', border: '1px solid #E5E7EB', '&:hover': { boxShadow: 2 } }}>
                          <CardContent sx={{ p: '10px !important' }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{m.titulo}</Typography>
                            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                              {nombreProceso(m.proceso_id)}
                            </Typography>
                            {m.ahorro_estimado != null && (
                              <Typography sx={{ fontSize: 10, color: QMS_COLOR, fontWeight: 700 }}>
                                {fmtCOP(m.ahorro_estimado)}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {items.length === 0 && (
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textAlign: 'center', py: 1 }}>
                          Sin iniciativas
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
          {mejoras.some(m => m.estado === 'RECHAZADA') && (
            <Alert severity="info" sx={{ mt: 2, py: 0.3 }}>
              Hay {mejoras.filter(m => m.estado === 'RECHAZADA').length} iniciativa(s) rechazada(s);
              se ven en la pestaña de lista, porque salen del flujo.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {mejoras.length > 0 && (
            <Paper sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                    <TableCell>Código</TableCell><TableCell>Iniciativa</TableCell>
                    <TableCell>Proceso</TableCell><TableCell>Responsable</TableCell>
                    <TableCell>Impacto</TableCell><TableCell align="right">Ahorro est.</TableCell>
                    <TableCell>Límite</TableCell><TableCell>Estado</TableCell>
                    <TableCell sx={{ width: 80 }}>Acc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mejoras.map(m => (
                    <TableRow key={m.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>
                          {m.codigo ?? `MJR-${m.id}`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Tooltip title={m.beneficio_esperado ?? m.descripcion}>
                          <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.titulo}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreProceso(m.proceso_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(m.responsable_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{m.impacto ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11 }}>{fmtCOP(m.ahorro_estimado)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{soloFecha(m.fecha_limite)}</TableCell>
                      <TableCell>
                        <Chip label={m.estado.replace('_', ' ')} size="small" sx={{
                          fontSize: 9, height: 18, fontWeight: 700,
                          bgcolor: alpha(EST_COLOR[m.estado] ?? '#64748B', 0.15),
                          color: EST_COLOR[m.estado] ?? '#64748B',
                        }} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => setDlg({ abierto: true, item: m })}>
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => {
                          if (window.confirm(`¿Eliminar "${m.titulo}"?`)) mutBorrar.mutate(m.id)
                        }}>
                          <DeleteForever sx={{ fontSize: 14, color: '#DC2626' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </TabPanel>

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `MJR-${dlg.item.id}`}` : 'Nueva iniciativa'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Título *" size="small" fullWidth autoFocus value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción *" size="small" fullWidth multiline rows={3}
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* Estado es enum de la base: lista fija. */}
                <TextField select label="Estado" size="small" fullWidth value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="IMPACTO" label="Impacto"
                  valor={form.impacto} onChange={v => setForm(f => ({ ...f, impacto: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Proceso" size="small" fullWidth value={form.proceso_id}
                  onChange={e => setForm(f => ({ ...f, proceso_id: e.target.value }))}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {procesos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Responsable" size="small" fullWidth value={form.responsable_id}
                  onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))}
                  helperText={sinUsuarios ? 'Solo un administrador ve la lista' : undefined}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {usuarios.map(u => <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fecha límite" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_limite}
                  onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Retorno estimado (meses)" type="number" size="small" fullWidth
                  value={form.retorno_estimado_meses}
                  onChange={e => setForm(f => ({ ...f, retorno_estimado_meses: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Ahorro estimado" type="number" size="small" fullWidth
                  value={form.ahorro_estimado}
                  onChange={e => setForm(f => ({ ...f, ahorro_estimado: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Ahorro real" type="number" size="small" fullWidth
                  value={form.ahorro_real}
                  onChange={e => setForm(f => ({ ...f, ahorro_real: e.target.value }))}
                  helperText="Se registra al completar la iniciativa" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Beneficio esperado" size="small" fullWidth multiline rows={2}
                  value={form.beneficio_esperado}
                  onChange={e => setForm(f => ({ ...f, beneficio_esperado: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained"
              disabled={!form.titulo.trim() || !form.descripcion.trim() || mutGuardar.isPending}
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
