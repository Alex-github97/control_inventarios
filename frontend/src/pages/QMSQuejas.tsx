/**
 * QMS · PQRS y satisfacción
 *
 * Era una maqueta: la tabla, el NPS y la distribución CSAT salían de constantes.
 * El backend ya tenía el CRUD de quejas.
 *
 * Acá tipo, estado y origen son columnas de texto libre, así que los tres salen
 * del catálogo maestro — a diferencia de otras pantallas de QMS donde el estado
 * es un enum de la base.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs, Table, TableBody,
  TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, alpha, IconButton, Tooltip, Alert,
  LinearProgress, Rating, Stack,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SupportAgent, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

const TIPO_COLOR: Record<string, string> = {
  Queja: '#DC2626', Reclamo: '#EA580C', Sugerencia: QMS_COLOR,
  Felicitación: '#0369A1', Petición: '#7C3AED',
}
const EST_COLOR: Record<string, string> = {
  Abierta: '#DC2626', 'En gestión': '#D97706', Respondida: '#0369A1', Cerrada: QMS_COLOR,
}

interface Queja {
  id: number
  codigo?: string | null
  tipo?: string | null
  estado?: string | null
  descripcion: string
  origen?: string | null
  cliente_nombre?: string | null
  cliente_nit?: string | null
  proceso_id?: number | null
  responsable_id?: number | null
  fecha_limite?: string | null
  fecha_cierre?: string | null
  respuesta?: string | null
  satisfaccion_resultado?: number | null
}
interface ProcesoQMS { id: number; nombre: string }
interface UsuarioMin { id: number; nombre?: string | null; apellido?: string | null; username?: string | null }

const nombreDeUsuario = (u?: UsuarioMin | null): string => {
  if (!u) return '—'
  return [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.username || `#${u.id}`
}
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')

const VACIO = {
  descripcion: '', tipo: '', estado: '', origen: '',
  cliente_nombre: '', cliente_nit: '', proceso_id: '', responsable_id: '',
  fecha_limite: '', respuesta: '', satisfaccion_resultado: '',
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

export default function QMSQuejas() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Queja | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      descripcion: it.descripcion, tipo: it.tipo ?? '', estado: it.estado ?? '',
      origen: it.origen ?? '', cliente_nombre: it.cliente_nombre ?? '',
      cliente_nit: it.cliente_nit ?? '',
      proceso_id: it.proceso_id != null ? String(it.proceso_id) : '',
      responsable_id: it.responsable_id != null ? String(it.responsable_id) : '',
      fecha_limite: it.fecha_limite ? it.fecha_limite.slice(0, 10) : '',
      respuesta: it.respuesta ?? '',
      satisfaccion_resultado: it.satisfaccion_resultado != null ? String(it.satisfaccion_resultado) : '',
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: quejas = [], isLoading } = useQuery<Queja[]>({
    queryKey: ['qms-quejas'],
    queryFn: () => api.get('/qms/quejas').then(r => r.data),
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
  const invalidar = () => qc.invalidateQueries({ queryKey: ['qms-quejas'] })

  const mutGuardar = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const cuerpo = {
        descripcion: form.descripcion.trim(),
        tipo: form.tipo || null, estado: form.estado || null, origen: form.origen || null,
        cliente_nombre: form.cliente_nombre.trim() || null,
        cliente_nit: form.cliente_nit.trim() || null,
        proceso_id: n(form.proceso_id), responsable_id: n(form.responsable_id),
        fecha_limite: form.fecha_limite ? `${form.fecha_limite}T00:00:00` : null,
        respuesta: form.respuesta.trim() || null,
        satisfaccion_resultado: n(form.satisfaccion_resultado),
      }
      return dlg.item
        ? api.put(`/qms/quejas/${dlg.item.id}`, cuerpo).then(r => r.data)
        : api.post('/qms/quejas', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'PQRS actualizada' : 'PQRS registrada')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/qms/quejas/${id}`),
    onSuccess: () => { toast.success('PQRS eliminada'); invalidar() },
    onError: err,
  })

  const tiposPresentes = useMemo(
    () => Array.from(new Set(quejas.map(q => q.tipo).filter(Boolean))) as string[],
    [quejas],
  )
  const filtradas = useMemo(
    () => quejas.filter(q => !filtroTipo || q.tipo === filtroTipo),
    [quejas, filtroTipo],
  )

  /** Satisfacción real: solo las PQRS que ya tienen calificación. */
  const satisfaccion = useMemo(() => {
    const calificadas = quejas
      .map(q => q.satisfaccion_resultado)
      .filter((v): v is number => v != null && v > 0)
    if (calificadas.length === 0) {
      return { promedio: null as number | null, total: 0, dist: [] as { estrellas: number; n: number }[] }
    }
    const dist = [5, 4, 3, 2, 1].map(e => ({
      estrellas: e, n: calificadas.filter(v => Math.round(v) === e).length,
    }))
    return {
      promedio: calificadas.reduce((s, v) => s + v, 0) / calificadas.length,
      total: calificadas.length,
      dist,
    }
  }, [quejas])

  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    return [
      { label: 'Abiertas', value: String(quejas.filter(q => q.estado === 'Abierta').length), color: '#DC2626' },
      { label: 'En gestión', value: String(quejas.filter(q => q.estado === 'En gestión').length), color: '#D97706' },
      {
        label: 'Vencidas',
        value: String(quejas.filter(q => q.estado !== 'Cerrada' && q.fecha_limite
          && q.fecha_limite.slice(0, 10) < hoy).length),
        color: '#7C3AED',
      },
      {
        label: 'Satisfacción',
        value: satisfaccion.promedio != null ? `${satisfaccion.promedio.toFixed(1)} / 5` : '—',
        color: QMS_COLOR,
      },
    ]
  }, [quejas, satisfaccion])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SupportAgent sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>PQRS y Satisfacción</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                QMS · Peticiones, quejas, reclamos y sugerencias
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
            Registrar PQRS
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</Typography>
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
          <Tab label={`PQRS (${quejas.length})`} />
          <Tab label="Satisfacción" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
            {tiposPresentes.map(t => (
              <Chip key={t} label={t} size="small"
                onClick={() => setFiltroTipo(filtroTipo === t ? null : t)}
                sx={{
                  fontSize: 11, cursor: 'pointer',
                  bgcolor: filtroTipo === t ? alpha(TIPO_COLOR[t] ?? QMS_COLOR, 0.2) : '#F8FAFC',
                  color: filtroTipo === t ? (TIPO_COLOR[t] ?? QMS_COLOR) : '#64748B',
                  border: `1px solid ${filtroTipo === t ? alpha(TIPO_COLOR[t] ?? QMS_COLOR, 0.4) : '#E5E7EB'}`,
                }} />
            ))}
            <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 1 }}>
              {filtradas.length} de {quejas.length}
            </Typography>
          </Box>

          {isLoading && <LinearProgress sx={{ mb: 1 }} />}
          {!isLoading && quejas.length === 0 ? (
            <Alert severity="info">
              No hay PQRS registradas. Use <strong>Registrar PQRS</strong> para la primera.
            </Alert>
          ) : (
            <Paper sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                    <TableCell>Código</TableCell><TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell><TableCell>Cliente</TableCell>
                    <TableCell>Canal</TableCell><TableCell>Proceso</TableCell>
                    <TableCell>Responsable</TableCell><TableCell>Límite</TableCell>
                    <TableCell>Estado</TableCell><TableCell>Satisf.</TableCell>
                    <TableCell sx={{ width: 80 }}>Acc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.map(q => (
                    <TableRow key={q.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>
                          {q.codigo ?? `QRE-${q.id}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {q.tipo ? (
                          <Chip label={q.tipo} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: alpha(TIPO_COLOR[q.tipo] ?? '#64748B', 0.15),
                            color: TIPO_COLOR[q.tipo] ?? '#64748B',
                          }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Tooltip title={q.descripcion}>
                          <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.descripcion}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{q.cliente_nombre ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{q.origen ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreProceso(q.proceso_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(q.responsable_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{soloFecha(q.fecha_limite)}</TableCell>
                      <TableCell>
                        {q.estado ? (
                          <Chip label={q.estado} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: alpha(EST_COLOR[q.estado] ?? '#64748B', 0.15),
                            color: EST_COLOR[q.estado] ?? '#64748B',
                          }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {q.satisfaccion_resultado
                          ? <Rating value={q.satisfaccion_resultado} readOnly size="small"
                              sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                          : <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => setDlg({ abierto: true, item: q })}>
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => {
                          if (window.confirm('¿Eliminar esta PQRS?')) mutBorrar.mutate(q.id)
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

        <TabPanel value={tab} index={1}>
          {/* Antes había un NPS fijo de 78 y una distribución inventada. La
              satisfacción real solo se puede calcular sobre las PQRS que ya
              tienen calificación, así que si no hay ninguna se dice. */}
          {satisfaccion.total === 0 ? (
            <Alert severity="info">
              Todavía no hay PQRS con calificación de satisfacción registrada. El promedio y la
              distribución aparecen cuando se cierre la primera con calificación.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>Satisfacción promedio</Typography>
                    <Typography sx={{ fontSize: 44, fontWeight: 800, color: QMS_COLOR, lineHeight: 1 }}>
                      {satisfaccion.promedio!.toFixed(1)}
                    </Typography>
                    <Rating value={satisfaccion.promedio!} precision={0.1} readOnly
                      sx={{ mt: 1, '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
                      sobre {satisfaccion.total} PQRS calificada(s) de {quejas.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 2 }}>Distribución de calificaciones</Typography>
                    <Stack spacing={1.2}>
                      {satisfaccion.dist.map(d => (
                        <Box key={d.estrellas}>
                          <Stack direction="row" justifyContent="space-between" mb={0.4}>
                            <Typography sx={{ fontSize: 12 }}>{d.estrellas} estrella(s)</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                              {d.n} · {Math.round((d.n / satisfaccion.total) * 100)}%
                            </Typography>
                          </Stack>
                          <LinearProgress variant="determinate"
                            value={(d.n / satisfaccion.total) * 100}
                            sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
                                  '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' } }} />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `QRE-${dlg.item.id}`}` : 'Registrar PQRS'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción *" size="small" fullWidth multiline rows={3} autoFocus
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>
              {/* Acá los tres son texto libre en el modelo, así que van a catálogo. */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="TIPO_QUEJA" label="Tipo"
                  valor={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="ESTADO_QUEJA" label="Estado"
                  valor={form.estado} onChange={v => setForm(f => ({ ...f, estado: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="ORIGEN_QUEJA" label="Canal de entrada"
                  valor={form.origen} onChange={v => setForm(f => ({ ...f, origen: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Cliente" size="small" fullWidth value={form.cliente_nombre}
                  onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="NIT del cliente" size="small" fullWidth value={form.cliente_nit}
                  onChange={e => setForm(f => ({ ...f, cliente_nit: e.target.value }))} />
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
              <Grid size={{ xs: 12 }}>
                <TextField label="Respuesta al cliente" size="small" fullWidth multiline rows={3}
                  value={form.respuesta}
                  onChange={e => setForm(f => ({ ...f, respuesta: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                  Satisfacción del cliente con la respuesta
                </Typography>
                <Rating
                  value={form.satisfaccion_resultado ? Number(form.satisfaccion_resultado) : null}
                  onChange={(_e, v) => setForm(f => ({
                    ...f, satisfaccion_resultado: v != null ? String(v) : '',
                  }))}
                  sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained"
              disabled={!form.descripcion.trim() || mutGuardar.isPending}
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
