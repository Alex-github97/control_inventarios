/**
 * QMS · Hallazgos
 *
 * Era una maqueta: tabla desde constantes, KPIs fijos y el botón sin onClick.
 * El backend ya tenía el CRUD.
 *
 * Estado es un enum de la base (la tabla solo acepta esos cuatro valores); tipo
 * e impacto son texto libre, así que salen del catálogo maestro.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Table, TableBody,
  TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, alpha, IconButton, Tooltip, Alert,
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FindInPage, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

// Enum de la base: no es configurable.
const ESTADOS = ['ABIERTO', 'EN_TRATAMIENTO', 'VERIFICACION', 'CERRADO']
const EST_COLOR: Record<string, string> = {
  ABIERTO: '#DC2626', EN_TRATAMIENTO: '#D97706', VERIFICACION: '#0369A1', CERRADO: QMS_COLOR,
}
const IMP_COLOR: Record<string, string> = { Alto: '#DC2626', Medio: '#D97706', Bajo: QMS_COLOR }

interface Hallazgo {
  id: number
  codigo?: string | null
  descripcion: string
  tipo?: string | null
  estado: string
  proceso_id?: number | null
  responsable_id?: number | null
  auditoria_id?: number | null
  nc_id?: number | null
  impacto?: string | null
  fecha_limite?: string | null
  fecha_cierre?: string | null
  evidencia?: string | null
}
interface ProcesoQMS { id: number; nombre: string }
interface UsuarioMin { id: number; nombre?: string | null; apellido?: string | null; username?: string | null }
interface AuditoriaQMS { id: number; codigo?: string | null; titulo?: string | null }

const nombreDeUsuario = (u?: UsuarioMin | null): string => {
  if (!u) return '—'
  return [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.username || `#${u.id}`
}
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')

const VACIO = {
  descripcion: '', tipo: '', estado: 'ABIERTO', impacto: '',
  proceso_id: '', responsable_id: '', auditoria_id: '',
  fecha_limite: '', evidencia: '',
}

export default function QMSHallazgos() {
  const qc = useQueryClient()
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Hallazgo | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      descripcion: it.descripcion, tipo: it.tipo ?? '', estado: it.estado,
      impacto: it.impacto ?? '',
      proceso_id: it.proceso_id != null ? String(it.proceso_id) : '',
      responsable_id: it.responsable_id != null ? String(it.responsable_id) : '',
      auditoria_id: it.auditoria_id != null ? String(it.auditoria_id) : '',
      fecha_limite: it.fecha_limite ? it.fecha_limite.slice(0, 10) : '',
      evidencia: it.evidencia ?? '',
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: hallazgos = [], isLoading } = useQuery<Hallazgo[]>({
    queryKey: ['qms-hallazgos'],
    queryFn: () => api.get('/qms/hallazgos').then(r => r.data),
  })
  const { data: procesos = [] } = useQuery<ProcesoQMS[]>({
    queryKey: ['qms-procesos'],
    queryFn: () => api.get('/qms/procesos').then(r => r.data),
  })
  const { data: auditorias = [] } = useQuery<AuditoriaQMS[]>({
    queryKey: ['qms-auditorias'],
    queryFn: () => api.get('/qms/auditorias').then(r => r.data),
  })
  const { data: usuarios = [], isError: sinUsuarios } = useQuery<UsuarioMin[]>({
    queryKey: ['usuarios-min'],
    queryFn: () => api.get('/usuarios/').then(r => r.data),
    retry: false,
  })

  const nombreProceso = (id?: number | null) => procesos.find(p => p.id === id)?.nombre ?? '—'
  const nombreUsuario = (id?: number | null) => nombreDeUsuario(usuarios.find(u => u.id === id))

  const err = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')
  const invalidar = () => qc.invalidateQueries({ queryKey: ['qms-hallazgos'] })

  const mutGuardar = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const cuerpo = {
        descripcion: form.descripcion.trim(),
        tipo: form.tipo || null,
        estado: form.estado,
        impacto: form.impacto || null,
        proceso_id: n(form.proceso_id),
        responsable_id: n(form.responsable_id),
        auditoria_id: n(form.auditoria_id),
        fecha_limite: form.fecha_limite ? `${form.fecha_limite}T00:00:00` : null,
        evidencia: form.evidencia.trim() || null,
      }
      return dlg.item
        ? api.put(`/qms/hallazgos/${dlg.item.id}`, cuerpo).then(r => r.data)
        : api.post('/qms/hallazgos', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Hallazgo actualizado' : 'Hallazgo registrado')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/qms/hallazgos/${id}`),
    onSuccess: () => { toast.success('Hallazgo eliminado'); invalidar() },
    onError: err,
  })

  const tiposPresentes = useMemo(
    () => Array.from(new Set(hallazgos.map(h => h.tipo).filter(Boolean))) as string[],
    [hallazgos],
  )

  const filtrados = useMemo(() => hallazgos.filter(h =>
    (!filtroTipo || h.tipo === filtroTipo) &&
    (!filtroEstado || h.estado === filtroEstado)
  ), [hallazgos, filtroTipo, filtroEstado])

  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    const mes = hoy.slice(0, 7)
    return [
      { label: 'Hallazgos abiertos', value: hallazgos.filter(h => h.estado === 'ABIERTO').length, color: '#DC2626' },
      { label: 'En tratamiento', value: hallazgos.filter(h => h.estado === 'EN_TRATAMIENTO').length, color: '#D97706' },
      {
        label: 'Vencidos',
        value: hallazgos.filter(h => h.estado !== 'CERRADO' && h.fecha_limite
          && h.fecha_limite.slice(0, 10) < hoy).length,
        color: '#DC2626',
      },
      {
        label: 'Cerrados este mes',
        value: hallazgos.filter(h => h.estado === 'CERRADO' && h.fecha_cierre
          && h.fecha_cierre.slice(0, 7) === mes).length,
        color: QMS_COLOR,
      },
    ]
  }, [hallazgos])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FindInPage sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Gestión de Hallazgos</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                QMS · Hallazgos de auditorías y operación
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
            Registrar Hallazgo
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
          {tiposPresentes.map(t => (
            <Chip key={t} label={t} size="small"
              onClick={() => setFiltroTipo(filtroTipo === t ? null : t)}
              sx={{
                fontSize: 11, cursor: 'pointer',
                bgcolor: filtroTipo === t ? alpha(QMS_COLOR, 0.2) : '#F8FAFC',
                color: filtroTipo === t ? QMS_COLOR : '#64748B',
                border: `1px solid ${filtroTipo === t ? alpha(QMS_COLOR, 0.4) : '#E5E7EB'}`,
              }} />
          ))}
          {tiposPresentes.length > 0 && <Box sx={{ mx: 0.5, borderLeft: '1px solid #E5E7EB', height: 20 }} />}
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
            {filtrados.length} de {hallazgos.length}
          </Typography>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && hallazgos.length === 0 ? (
          <Alert severity="info">
            No hay hallazgos registrados. Use <strong>Registrar Hallazgo</strong> para el primero.
          </Alert>
        ) : (
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Descripción</TableCell>
                  <TableCell>Tipo</TableCell><TableCell>Impacto</TableCell>
                  <TableCell>Proceso</TableCell><TableCell>Responsable</TableCell>
                  <TableCell>Límite</TableCell><TableCell>Estado</TableCell>
                  <TableCell sx={{ width: 80 }}>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map(h => (
                  <TableRow key={h.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>
                        {h.codigo ?? `H-${h.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Tooltip title={h.descripcion}>
                        <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.descripcion}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.tipo ?? '—'}</TableCell>
                    <TableCell>
                      {h.impacto ? (
                        <Chip label={h.impacto} size="small" sx={{
                          fontSize: 9, height: 18, fontWeight: 700,
                          bgcolor: alpha(IMP_COLOR[h.impacto] ?? '#64748B', 0.15),
                          color: IMP_COLOR[h.impacto] ?? '#64748B',
                        }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nombreProceso(h.proceso_id)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(h.responsable_id)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{soloFecha(h.fecha_limite)}</TableCell>
                    <TableCell>
                      <Chip label={h.estado.replace('_', ' ')} size="small" sx={{
                        fontSize: 9, height: 18, fontWeight: 700,
                        bgcolor: alpha(EST_COLOR[h.estado] ?? '#64748B', 0.15),
                        color: EST_COLOR[h.estado] ?? '#64748B',
                      }} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setDlg({ abierto: true, item: h })}>
                        <Edit sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => {
                        if (window.confirm('¿Eliminar este hallazgo?')) mutBorrar.mutate(h.id)
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

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `H-${dlg.item.id}`}` : 'Registrar hallazgo'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción *" size="small" fullWidth multiline rows={3} autoFocus
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="TIPO_HALLAZGO" label="Tipo"
                  valor={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="QMS" tipo="IMPACTO" label="Impacto"
                  valor={form.impacto} onChange={v => setForm(f => ({ ...f, impacto: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* Estado es enum de la base: lista fija, no catálogo. */}
                <TextField select label="Estado" size="small" fullWidth value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Proceso" size="small" fullWidth value={form.proceso_id}
                  onChange={e => setForm(f => ({ ...f, proceso_id: e.target.value }))}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {procesos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Auditoría de origen" size="small" fullWidth
                  value={form.auditoria_id}
                  onChange={e => setForm(f => ({ ...f, auditoria_id: e.target.value }))}
                  helperText={auditorias.length === 0 ? 'Sin auditorías registradas' : undefined}>
                  <MenuItem value="">Sin auditoría</MenuItem>
                  {auditorias.map(a => (
                    <MenuItem key={a.id} value={String(a.id)}>
                      {a.codigo ?? a.titulo ?? `Auditoría #${a.id}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Responsable" size="small" fullWidth value={form.responsable_id}
                  onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))}
                  helperText={sinUsuarios ? 'Solo un administrador ve la lista' : undefined}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {usuarios.map(u => (
                    <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fecha límite" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_limite}
                  onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Evidencia" size="small" fullWidth value={form.evidencia}
                  onChange={e => setForm(f => ({ ...f, evidencia: e.target.value }))}
                  placeholder="Registro fotográfico, acta, documento…" />
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
