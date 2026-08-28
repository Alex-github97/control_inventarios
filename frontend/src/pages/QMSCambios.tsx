/**
 * QMS · Gestión de cambios
 *
 * Era una maqueta: la tabla salía de constantes y el botón no guardaba nada.
 * El backend ya tenía el CRUD.
 *
 * El estado es un enum de la base (SOLICITADO → … → IMPLEMENTADO/RECHAZADO) y
 * define la etapa del avance; el tipo es texto libre y sale del catálogo.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Table, TableBody,
  TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, alpha, IconButton, Tooltip, Alert,
  LinearProgress, Stepper, Step, StepLabel,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ChangeCircle, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

// Enum de la base. El orden es el del flujo, y de ahí sale la etapa.
const ESTADOS = ['SOLICITADO', 'EN_EVALUACION', 'APROBADO', 'EN_CURSO', 'IMPLEMENTADO', 'RECHAZADO']
const FLUJO = ['SOLICITADO', 'EN_EVALUACION', 'APROBADO', 'EN_CURSO', 'IMPLEMENTADO']
const PASOS = ['Solicitud', 'Evaluación', 'Aprobación', 'En curso', 'Implementado']

const EST_COLOR: Record<string, string> = {
  SOLICITADO: '#6B7280', EN_EVALUACION: '#D97706', APROBADO: '#0369A1',
  EN_CURSO: '#7C3AED', IMPLEMENTADO: QMS_COLOR, RECHAZADO: '#DC2626',
}

interface Cambio {
  id: number
  codigo?: string | null
  titulo: string
  descripcion: string
  tipo?: string | null
  estado: string
  proceso_id?: number | null
  responsable_id?: number | null
  aprobado_por_id?: number | null
  impacto?: string | null
  evaluacion?: string | null
  fecha_solicitado?: string | null
  fecha_limite?: string | null
  fecha_implementacion?: string | null
  norma_afectada?: string | null
}
interface ProcesoQMS { id: number; nombre: string }
interface UsuarioMin { id: number; nombre?: string | null; apellido?: string | null; username?: string | null }

const nombreDeUsuario = (u?: UsuarioMin | null): string => {
  if (!u) return '—'
  return [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.username || `#${u.id}`
}
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')
/** Un rechazo sale del flujo, así que no tiene etapa dentro de él. */
const etapaDe = (estado: string) => FLUJO.indexOf(estado)

const VACIO = {
  titulo: '', descripcion: '', tipo: '', estado: 'SOLICITADO',
  proceso_id: '', responsable_id: '', aprobado_por_id: '',
  impacto: '', evaluacion: '', norma_afectada: '',
  fecha_solicitado: '', fecha_limite: '',
}

export default function QMSCambios() {
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Cambio | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      titulo: it.titulo, descripcion: it.descripcion, tipo: it.tipo ?? '',
      estado: it.estado,
      proceso_id: it.proceso_id != null ? String(it.proceso_id) : '',
      responsable_id: it.responsable_id != null ? String(it.responsable_id) : '',
      aprobado_por_id: it.aprobado_por_id != null ? String(it.aprobado_por_id) : '',
      impacto: it.impacto ?? '', evaluacion: it.evaluacion ?? '',
      norma_afectada: it.norma_afectada ?? '',
      fecha_solicitado: it.fecha_solicitado ? it.fecha_solicitado.slice(0, 10) : '',
      fecha_limite: it.fecha_limite ? it.fecha_limite.slice(0, 10) : '',
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: cambios = [], isLoading } = useQuery<Cambio[]>({
    queryKey: ['qms-cambios'],
    queryFn: () => api.get('/qms/cambios').then(r => r.data),
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
  const invalidar = () => qc.invalidateQueries({ queryKey: ['qms-cambios'] })

  const mutGuardar = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const f = (v: string) => (v.trim() === '' ? null : `${v}T00:00:00`)
      const cuerpo = {
        titulo: form.titulo.trim(), descripcion: form.descripcion.trim(),
        tipo: form.tipo || null, estado: form.estado,
        proceso_id: n(form.proceso_id),
        responsable_id: n(form.responsable_id),
        aprobado_por_id: n(form.aprobado_por_id),
        impacto: form.impacto.trim() || null,
        evaluacion: form.evaluacion.trim() || null,
        norma_afectada: form.norma_afectada || null,
        fecha_solicitado: f(form.fecha_solicitado),
        fecha_limite: f(form.fecha_limite),
      }
      return dlg.item
        ? api.put(`/qms/cambios/${dlg.item.id}`, cuerpo).then(r => r.data)
        : api.post('/qms/cambios', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Cambio actualizado' : 'Cambio solicitado')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/qms/cambios/${id}`),
    onSuccess: () => { toast.success('Cambio eliminado'); invalidar() },
    onError: err,
  })

  const filtrados = useMemo(
    () => cambios.filter(c => !filtroEstado || c.estado === filtroEstado),
    [cambios, filtroEstado],
  )

  const kpis = useMemo(() => [
    { label: 'Solicitados', value: cambios.filter(c => c.estado === 'SOLICITADO').length, color: '#6B7280' },
    { label: 'En evaluación', value: cambios.filter(c => c.estado === 'EN_EVALUACION').length, color: '#D97706' },
    { label: 'En curso', value: cambios.filter(c => c.estado === 'EN_CURSO').length, color: '#7C3AED' },
    { label: 'Implementados', value: cambios.filter(c => c.estado === 'IMPLEMENTADO').length, color: QMS_COLOR },
  ], [cambios])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ChangeCircle sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Gestión de Cambios</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                QMS · Solicitud → evaluación → aprobación → implementación
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
            Solicitar Cambio
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          {ESTADOS.map(e => (
            <Chip key={e} label={e.replace('_', ' ')} size="small"
              onClick={() => setFiltroEstado(filtroEstado === e ? null : e)}
              sx={{
                fontSize: 11, cursor: 'pointer',
                bgcolor: filtroEstado === e ? alpha(EST_COLOR[e], 0.2) : '#F8FAFC',
                color: filtroEstado === e ? EST_COLOR[e] : '#64748B',
                border: `1px solid ${filtroEstado === e ? alpha(EST_COLOR[e], 0.4) : '#E5E7EB'}`,
              }} />
          ))}
          <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 1 }}>
            {filtrados.length} de {cambios.length}
          </Typography>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && cambios.length === 0 ? (
          <Alert severity="info">
            No hay cambios registrados. Use <strong>Solicitar Cambio</strong> para el primero.
          </Alert>
        ) : (
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Título</TableCell>
                  <TableCell>Tipo</TableCell><TableCell>Proceso</TableCell>
                  <TableCell>Solicita</TableCell><TableCell>Aprueba</TableCell>
                  <TableCell>Etapa</TableCell><TableCell>Estado</TableCell>
                  <TableCell sx={{ width: 80 }}>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map(c => {
                  const etapa = etapaDe(c.estado)
                  return (
                    <TableRow key={c.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>
                          {c.codigo ?? `CHG-${c.id}`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Tooltip title={c.descripcion}>
                          <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.titulo}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{c.tipo ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreProceso(c.proceso_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(c.responsable_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(c.aprobado_por_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>
                        {etapa >= 0 ? `${etapa + 1} de ${FLUJO.length}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={c.estado.replace('_', ' ')} size="small" sx={{
                          fontSize: 9, height: 18, fontWeight: 700,
                          bgcolor: alpha(EST_COLOR[c.estado] ?? '#64748B', 0.15),
                          color: EST_COLOR[c.estado] ?? '#64748B',
                        }} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => setDlg({ abierto: true, item: c })}>
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => {
                          if (window.confirm(`¿Eliminar "${c.titulo}"?`)) mutBorrar.mutate(c.id)
                        }}>
                          <DeleteForever sx={{ fontSize: 14, color: '#DC2626' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        )}

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `CHG-${dlg.item.id}`}` : 'Solicitar cambio'}
          </DialogTitle>
          <DialogContent dividers>
            {/* El avance del flujo, según el estado elegido */}
            {etapaDe(form.estado) >= 0 && (
              <Stepper activeStep={etapaDe(form.estado)} alternativeLabel sx={{ mb: 3 }}>
                {PASOS.map(p => (
                  <Step key={p}>
                    <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 11 } }}>{p}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
            {form.estado === 'RECHAZADO' && (
              <Alert severity="warning" sx={{ mb: 2, py: 0.3 }}>
                Un cambio rechazado sale del flujo y no avanza por las etapas.
              </Alert>
            )}
            <Grid container spacing={2}>
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
                <SelectorCatalogo modulo="QMS" tipo="TIPO_CAMBIO" label="Tipo de cambio"
                  valor={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* Estado es enum de la base: lista fija. */}
                <TextField select label="Estado" size="small" fullWidth value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="NORMA_ISO" label="Norma afectada"
                  valor={form.norma_afectada}
                  onChange={v => setForm(f => ({ ...f, norma_afectada: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Proceso" size="small" fullWidth value={form.proceso_id}
                  onChange={e => setForm(f => ({ ...f, proceso_id: e.target.value }))}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {procesos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Solicitado por" size="small" fullWidth value={form.responsable_id}
                  onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))}
                  helperText={sinUsuarios ? 'Solo un administrador ve la lista' : undefined}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {usuarios.map(u => <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Aprobado por" size="small" fullWidth value={form.aprobado_por_id}
                  onChange={e => setForm(f => ({ ...f, aprobado_por_id: e.target.value }))}>
                  <MenuItem value="">Sin aprobar</MenuItem>
                  {usuarios.map(u => <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fecha de solicitud" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_solicitado}
                  onChange={e => setForm(f => ({ ...f, fecha_solicitado: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fecha límite" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_limite}
                  onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Impacto esperado" size="small" fullWidth multiline rows={2}
                  value={form.impacto}
                  onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Evaluación" size="small" fullWidth multiline rows={2}
                  value={form.evaluacion}
                  onChange={e => setForm(f => ({ ...f, evaluacion: e.target.value }))} />
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
