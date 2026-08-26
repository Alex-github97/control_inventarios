/**
 * QMS · No Conformidades y CAPA
 *
 * La pantalla era una maqueta: la tabla salía de constantes en el código y el
 * botón de registrar no guardaba nada. El backend ya tenía el CRUD completo, así
 * que ahora lee y escribe de verdad.
 *
 * Nota sobre los desplegables: clasificación, estado y origen son enums de la
 * base de datos, no catálogos configurables — la tabla solo acepta esos valores.
 * El área sí sale del catálogo maestro, y el proceso de los procesos del SGC.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  alpha, LinearProgress, IconButton, Tooltip, Alert, Stack,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { BugReport, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

const QMS_COLOR = '#059669'

// Valores fijos del modelo: son enums de la base, no catálogos.
const CLASIFICACIONES = ['MENOR', 'MAYOR', 'CRITICA']
const ESTADOS_NC = ['ABIERTA', 'EN_TRATAMIENTO', 'VERIFICACION', 'CERRADA']
const ORIGENES = ['AUDITORIA', 'CLIENTE', 'OPERACION', 'TRANSPORTE', 'WMS', 'HCM', 'PROVEEDOR', 'INCIDENTE']

const CLS_COLOR: Record<string, string> = { MENOR: '#0369A1', MAYOR: '#D97706', CRITICA: '#DC2626' }
const EST_COLOR: Record<string, string> = {
  ABIERTA: '#DC2626', EN_TRATAMIENTO: '#D97706', VERIFICACION: '#0369A1', CERRADA: QMS_COLOR,
}
const TIPO_CAPA_COLOR: Record<string, string> = {
  CORRECTIVA: '#DC2626', PREVENTIVA: '#0369A1', MEJORA: QMS_COLOR,
}

interface NoConformidad {
  id: number
  codigo?: string | null
  titulo: string
  descripcion: string
  clasificacion: string
  estado: string
  origen: string
  proceso_id?: number | null
  area?: string | null
  responsable_id?: number | null
  fecha_deteccion?: string | null
  fecha_limite?: string | null
  fecha_cierre?: string | null
  causa_raiz?: string | null
  norma_afectada?: string | null
  requiere_capa?: boolean | null
}

interface CAPA {
  id: number
  codigo?: string | null
  tipo: string
  estado: string
  titulo: string
  nc_id?: number | null
  responsable_id?: number | null
  fecha_limite?: string | null
  porcentaje_avance?: number | null
}

interface ProcesoQMS { id: number; nombre: string; codigo?: string | null }
/** Lo que devuelve /usuarios/: no hay `nombre_completo`, son nombre y apellido. */
interface UsuarioMin {
  id: number
  nombre?: string | null
  apellido?: string | null
  username?: string | null
  cargo?: string | null
}

const nombreDeUsuario = (u?: UsuarioMin | null): string => {
  if (!u) return '—'
  const completo = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
  return completo || u.username || `#${u.id}`
}

const NC_VACIA = {
  titulo: '', descripcion: '', clasificacion: 'MENOR', origen: 'OPERACION',
  estado: 'ABIERTA', proceso_id: '', area: '', responsable_id: '',
  fecha_deteccion: '', fecha_limite: '', causa_raiz: '', norma_afectada: '',
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')

export default function QMSNoConformidades() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [filtroClasif, setFiltroClasif] = useState<string | null>(null)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: NoConformidad | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...NC_VACIA })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      titulo: it.titulo, descripcion: it.descripcion,
      clasificacion: it.clasificacion, origen: it.origen, estado: it.estado,
      proceso_id: it.proceso_id != null ? String(it.proceso_id) : '',
      area: it.area ?? '',
      responsable_id: it.responsable_id != null ? String(it.responsable_id) : '',
      fecha_deteccion: it.fecha_deteccion ? it.fecha_deteccion.slice(0, 10) : '',
      fecha_limite: it.fecha_limite ? it.fecha_limite.slice(0, 10) : '',
      causa_raiz: it.causa_raiz ?? '', norma_afectada: it.norma_afectada ?? '',
    } : { ...NC_VACIA })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: ncs = [], isLoading } = useQuery<NoConformidad[]>({
    queryKey: ['qms-nc'],
    queryFn: () => api.get('/qms/no-conformidades').then(r => r.data),
  })
  const { data: capas = [] } = useQuery<CAPA[]>({
    queryKey: ['qms-capas'],
    queryFn: () => api.get('/qms/capas').then(r => r.data),
  })
  const { data: procesos = [] } = useQuery<ProcesoQMS[]>({
    queryKey: ['qms-procesos'],
    queryFn: () => api.get('/qms/procesos').then(r => r.data),
  })
  // La ruta lleva barra final, y el backend la protege con rol administrador:
  // para el resto de usuarios la lista viene vacía y el campo lo advierte en
  // lugar de quedar en blanco sin explicación.
  const { data: usuarios = [], isError: usuariosNoDisponibles } = useQuery<UsuarioMin[]>({
    queryKey: ['usuarios-min'],
    queryFn: () => api.get('/usuarios/').then(r => r.data),
    retry: false,
  })

  const nombreProceso = (id?: number | null) =>
    procesos.find(p => p.id === id)?.nombre ?? '—'
  const nombreUsuario = (id?: number | null) =>
    nombreDeUsuario(usuarios.find(x => x.id === id))
  const codigoNC = (id?: number | null) => {
    const nc = ncs.find(x => x.id === id)
    return nc ? (nc.codigo ?? `NC-${nc.id}`) : null
  }

  const err = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['qms-nc'] })
    qc.invalidateQueries({ queryKey: ['qms-capas'] })
  }

  const mutGuardar = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const f = (v: string) => (v.trim() === '' ? null : `${v}T00:00:00`)
      const cuerpo = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        clasificacion: form.clasificacion,
        origen: form.origen,
        estado: form.estado,
        proceso_id: n(form.proceso_id),
        area: form.area || null,
        responsable_id: n(form.responsable_id),
        fecha_deteccion: f(form.fecha_deteccion),
        fecha_limite: f(form.fecha_limite),
        causa_raiz: form.causa_raiz.trim() || null,
        norma_afectada: form.norma_afectada.trim() || null,
      }
      return dlg.item
        ? api.put(`/qms/no-conformidades/${dlg.item.id}`, cuerpo).then(r => r.data)
        : api.post('/qms/no-conformidades', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'No conformidad actualizada' : 'No conformidad registrada')
      invalidar()
      setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/qms/no-conformidades/${id}`),
    onSuccess: () => { toast.success('No conformidad eliminada'); invalidar() },
    onError: err,
  })

  const ncFiltradas = useMemo(() => ncs.filter(nc =>
    (!filtroEstado || nc.estado === filtroEstado) &&
    (!filtroClasif || nc.clasificacion === filtroClasif)
  ), [ncs, filtroEstado, filtroClasif])

  // KPIs sobre datos reales, no números escritos a mano
  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    const mesActual = hoy.slice(0, 7)
    return [
      { label: 'NC Abiertas', value: ncs.filter(n => n.estado === 'ABIERTA').length, color: '#DC2626' },
      { label: 'En Tratamiento', value: ncs.filter(n => n.estado === 'EN_TRATAMIENTO').length, color: '#D97706' },
      { label: 'CAPA Activas', value: capas.filter(c => c.estado !== 'CERRADA').length, color: '#0369A1' },
      {
        label: 'CAPA Vencidas',
        value: capas.filter(c => c.estado !== 'CERRADA' && c.fecha_limite
          && c.fecha_limite.slice(0, 10) < hoy).length,
        color: '#DC2626',
      },
      {
        label: 'Cerradas este mes',
        value: ncs.filter(n => n.estado === 'CERRADA' && n.fecha_cierre
          && n.fecha_cierre.slice(0, 7) === mesActual).length,
        color: QMS_COLOR,
      },
    ]
  }, [ncs, capas])

  const porOrigen = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const n of ncs) conteo.set(n.origen, (conteo.get(n.origen) ?? 0) + 1)
    return [...conteo.entries()].map(([origen, count]) => ({ origen, count }))
      .sort((a, b) => b.count - a.count)
  }, [ncs])
  const maxOrigen = Math.max(...porOrigen.map(d => d.count), 1)

  const porClasificacion = useMemo(
    () => CLASIFICACIONES.map(c => ({ clas: c, count: ncs.filter(n => n.clasificacion === c).length })),
    [ncs],
  )

  const faltantes: string[] = []
  if (!form.titulo.trim()) faltantes.push('título')
  if (!form.descripcion.trim()) faltantes.push('descripción')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BugReport sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>No Conformidades</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                QMS · Ciclo NC → CAPA → Cierre
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
            Registrar NC
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, sm: 4, md: 'auto' }} sx={{ flex: 1 }}>
              <Card sx={{ border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
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
          <Tab label={`No Conformidades (${ncs.length})`} />
          <Tab label={`Acciones CAPA (${capas.length})`} />
          <Tab label="Análisis" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
            {ESTADOS_NC.map(e => (
              <Chip key={e} label={e.replace('_', ' ')} size="small"
                onClick={() => setFiltroEstado(filtroEstado === e ? null : e)}
                sx={{
                  fontSize: 11, cursor: 'pointer',
                  bgcolor: filtroEstado === e ? alpha(EST_COLOR[e], 0.2) : '#F1F5F9',
                  color: filtroEstado === e ? EST_COLOR[e] : '#64748B',
                  border: `1px solid ${filtroEstado === e ? alpha(EST_COLOR[e], 0.4) : 'transparent'}`,
                }} />
            ))}
            <Box sx={{ mx: 0.5, borderLeft: '1px solid #E5E7EB', height: 20 }} />
            {CLASIFICACIONES.map(c => (
              <Chip key={c} label={c} size="small"
                onClick={() => setFiltroClasif(filtroClasif === c ? null : c)}
                sx={{
                  fontSize: 11, cursor: 'pointer',
                  bgcolor: filtroClasif === c ? alpha(CLS_COLOR[c], 0.2) : '#F1F5F9',
                  color: filtroClasif === c ? CLS_COLOR[c] : '#64748B',
                  border: `1px solid ${filtroClasif === c ? alpha(CLS_COLOR[c], 0.4) : 'transparent'}`,
                }} />
            ))}
            <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 1 }}>
              {ncFiltradas.length} de {ncs.length}
            </Typography>
          </Box>

          {isLoading && <LinearProgress sx={{ mb: 1 }} />}
          {!isLoading && ncs.length === 0 && (
            <Alert severity="info">
              No hay no conformidades registradas. Use <strong>Registrar NC</strong> para la primera.
            </Alert>
          )}

          {ncs.length > 0 && (
            <Paper sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                    <TableCell>Código</TableCell><TableCell>Título</TableCell>
                    <TableCell>Clasif.</TableCell><TableCell>Origen</TableCell>
                    <TableCell>Proceso</TableCell><TableCell>Área</TableCell>
                    <TableCell>Responsable</TableCell><TableCell>Límite</TableCell>
                    <TableCell>Estado</TableCell><TableCell>CAPA</TableCell>
                    <TableCell sx={{ width: 80 }}>Acc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ncFiltradas.map(nc => {
                    const capaDeNC = capas.find(c => c.nc_id === nc.id)
                    return (
                      <TableRow key={nc.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                        <TableCell>
                          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>
                            {nc.codigo ?? `NC-${nc.id}`}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={nc.descripcion}>
                            <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nc.titulo}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip label={nc.clasificacion} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: alpha(CLS_COLOR[nc.clasificacion] ?? '#64748B', 0.15),
                            color: CLS_COLOR[nc.clasificacion] ?? '#64748B',
                          }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{nc.origen}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{nombreProceso(nc.proceso_id)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{nc.area ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(nc.responsable_id)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{soloFecha(nc.fecha_limite)}</TableCell>
                        <TableCell>
                          <Chip label={nc.estado.replace('_', ' ')} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: alpha(EST_COLOR[nc.estado] ?? '#64748B', 0.15),
                            color: EST_COLOR[nc.estado] ?? '#64748B',
                          }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: capaDeNC ? '#D97706' : '#94A3B8' }}>
                          {capaDeNC ? (capaDeNC.codigo ?? `CAPA-${capaDeNC.id}`) : '-'}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => setDlg({ abierto: true, item: nc })}>
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => {
                            if (window.confirm(`¿Eliminar "${nc.titulo}"?`)) mutBorrar.mutate(nc.id)
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
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {capas.length === 0 ? (
            <Alert severity="info">
              No hay acciones CAPA registradas. Se crean a partir de una no conformidad.
            </Alert>
          ) : (
            <Paper sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                    <TableCell>Código</TableCell><TableCell>Tipo</TableCell>
                    <TableCell>Título</TableCell><TableCell>NC Origen</TableCell>
                    <TableCell>Responsable</TableCell><TableCell>Fecha Límite</TableCell>
                    <TableCell>Avance</TableCell><TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {capas.map(c => {
                    const avance = c.porcentaje_avance ?? 0
                    return (
                      <TableRow key={c.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                        <TableCell>
                          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#D97706' }}>
                            {c.codigo ?? `CAPA-${c.id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={c.tipo} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: alpha(TIPO_CAPA_COLOR[c.tipo] ?? '#64748B', 0.15),
                            color: TIPO_CAPA_COLOR[c.tipo] ?? '#64748B',
                          }} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.titulo}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: QMS_COLOR }}>
                          {codigoNC(c.nc_id) ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(c.responsable_id)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{soloFecha(c.fecha_limite)}</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={avance} sx={{
                              flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
                              '& .MuiLinearProgress-bar': { bgcolor: avance === 100 ? QMS_COLOR : '#D97706' },
                            }} />
                            <Typography sx={{ fontSize: 11, minWidth: 30 }}>{avance}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={c.estado} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: c.estado === 'CERRADA' ? alpha(QMS_COLOR, 0.15) : alpha('#D97706', 0.15),
                            color: c.estado === 'CERRADA' ? QMS_COLOR : '#D97706',
                          }} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={tab} index={2}>
          {ncs.length === 0 ? (
            <Alert severity="info">Sin datos para analizar todavía.</Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 2 }}>NC por origen</Typography>
                    {porOrigen.map(d => (
                      <Box key={d.origen} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 12 }}>{d.origen}</Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>{d.count}</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={(d.count / maxOrigen) * 100}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
                                '& .MuiLinearProgress-bar': { bgcolor: '#DC2626' } }} />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 2 }}>NC por clasificación</Typography>
                    <Stack spacing={1.5}>
                      {porClasificacion.map(d => (
                        <Box key={d.clas}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 12 }}>{d.clas}</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: CLS_COLOR[d.clas] }}>
                              {d.count}
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate"
                            value={ncs.length ? (d.count / ncs.length) * 100 : 0}
                            sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
                                  '& .MuiLinearProgress-bar': { bgcolor: CLS_COLOR[d.clas] } }} />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ── Registrar / editar ── */}
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `NC-${dlg.item.id}`}` : 'Registrar no conformidad'}
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
                <TextField select label="Clasificación" size="small" fullWidth value={form.clasificacion}
                  onChange={e => setForm(f => ({ ...f, clasificacion: e.target.value }))}>
                  {CLASIFICACIONES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Origen" size="small" fullWidth value={form.origen}
                  onChange={e => setForm(f => ({ ...f, origen: e.target.value }))}>
                  {ORIGENES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Estado" size="small" fullWidth value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS_NC.map(e => <MenuItem key={e} value={e}>{e.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Proceso" size="small" fullWidth value={form.proceso_id}
                  onChange={e => setForm(f => ({ ...f, proceso_id: e.target.value }))}
                  helperText={procesos.length === 0 ? 'Sin procesos configurados' : undefined}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {procesos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* El área sí es catálogo compartido; clasificación y origen no,
                    porque son enums que la base de datos exige. */}
                <SelectorCatalogo modulo="GLOBAL" tipo="AREA" label="Área"
                  valor={form.area} onChange={v => setForm(f => ({ ...f, area: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Responsable" size="small" fullWidth value={form.responsable_id}
                  onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))}
                  helperText={usuariosNoDisponibles
                    ? 'La lista de usuarios solo la ve un administrador'
                    : usuarios.length === 0 ? 'Sin usuarios activos' : undefined}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {usuarios.map(u => (
                    <MenuItem key={u.id} value={String(u.id)}>
                      {nombreDeUsuario(u)}
                      {u.cargo && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                          · {u.cargo}
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fecha de detección" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_deteccion}
                  onChange={e => setForm(f => ({ ...f, fecha_deteccion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fecha límite" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_limite}
                  onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Norma afectada" size="small" fullWidth value={form.norma_afectada}
                  onChange={e => setForm(f => ({ ...f, norma_afectada: e.target.value }))}
                  placeholder="ISO 9001:2015 8.5.1" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Causa raíz" size="small" fullWidth multiline rows={2}
                  value={form.causa_raiz}
                  onChange={e => setForm(f => ({ ...f, causa_raiz: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Box sx={{ flex: 1 }}>
              {faltantes.length > 0 && (
                <Typography variant="caption" color="warning.main">
                  Falta: {faltantes.join(', ')}
                </Typography>
              )}
            </Box>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained" disabled={faltantes.length > 0 || mutGuardar.isPending}
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
