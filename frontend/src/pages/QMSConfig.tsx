/**
 * QMS · Configuración
 *
 * Indicadores y catálogos ya hablaban con el servidor. Normas ISO y umbrales
 * eran maqueta —el botón «Guardar» solo cambiaba de color— y ahora se guardan.
 */
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  TextField, Switch, FormControlLabel, Select, MenuItem, FormControl,
  InputLabel, alpha, Divider, Slider, Table, TableHead, TableBody, TableRow,
  TableCell, Paper, IconButton, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SettingsSuggest, Save, CheckCircle, Add as AddIcon, Analytics, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { qmsApi, type Certificacion, type ParametroQMS } from '@/api/qms'

import { COLOR_MODULO } from '@/config/marca'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
import { mensajeDeError } from '@/utils/errorApi'
const QMS_COLOR = COLOR_MODULO
const QMS_DARK = COLOR_MODULO
const MODULOS = ['TMS', 'WMS', 'EAM', 'CRM', 'SST', 'HCM', 'DMS', 'MES', 'APS', 'SCM', 'ERP', 'Compras', 'Financiero', 'QMS']
const TIPOS = ['estrategico', 'tactico', 'operativo']
const FRECUENCIAS = ['diario', 'semanal', 'mensual', 'trimestral', 'anual']

interface Indicador {
  id: number; codigo?: string | null; nombre: string; modulo_origen?: string | null
  tipo?: string | null; unidad?: string | null; frecuencia?: string | null
  meta?: number | null; meta_min?: number | null; meta_max?: number | null; activo: boolean
}
const EMPTY_IND = { codigo: '', nombre: '', modulo_origen: 'QMS', tipo: 'operativo', unidad: '%', frecuencia: 'mensual', meta: '', meta_min: '', meta_max: '' }

// ─── Gestión del catálogo de indicadores (API real) ──────────────────────────
function IndicadoresConfig() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY_IND })
  const [tried, setTried] = useState(false)
  const { data: indicadores = [] } = useQuery<Indicador[]>({
    queryKey: ['qms-indicadores-cfg'], queryFn: () => api.get('/qms/indicadores?limit=200').then(r => r.data),
  })
  const mutCrear = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/qms/indicadores', b),
    onSuccess: () => { toast.success('Indicador agregado'); qc.invalidateQueries({ queryKey: ['qms-indicadores-cfg'] }); qc.invalidateQueries({ queryKey: ['qms-tablero'] }); setForm({ ...EMPTY_IND }); setTried(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al agregar'),
  })
  const mutToggle = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => api.put(`/qms/indicadores/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qms-indicadores-cfg'] }); qc.invalidateQueries({ queryKey: ['qms-tablero'] }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo actualizar')),
  })
  const crear = () => {
    setTried(true)
    if (!form.nombre) return
    mutCrear.mutate({
      codigo: form.codigo || undefined, nombre: form.nombre, modulo_origen: form.modulo_origen,
      tipo: form.tipo, unidad: form.unidad || undefined, frecuencia: form.frecuencia,
      meta: form.meta ? Number(form.meta) : undefined,
      meta_min: form.meta_min ? Number(form.meta_min) : undefined,
      meta_max: form.meta_max ? Number(form.meta_max) : undefined,
    })
  }
  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
            <Analytics sx={{ color: QMS_DARK }} /><Typography fontWeight={700}>Agregar indicador de la plataforma</Typography>
          </Stack>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 12, sm: 5 }}><TextField label="Nombre *" size="small" fullWidth value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} error={tried && !form.nombre} helperText={tried && !form.nombre ? 'Requerido' : ''} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField label="Código" size="small" fullWidth value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><TextField select label="Módulo origen" size="small" fullWidth value={form.modulo_origen} onChange={e => setForm(f => ({ ...f, modulo_origen: e.target.value }))}>{MODULOS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField select label="Tipo" size="small" fullWidth value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>{TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField select label="Frecuencia" size="small" fullWidth value={form.frecuencia} onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))}>{FRECUENCIAS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, sm: 2 }}><TextField label="Unidad" size="small" fullWidth value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="% / und" /></Grid>
            <Grid size={{ xs: 4, sm: 2 }}><TextField label="Meta" type="number" size="small" fullWidth value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} /></Grid>
            <Grid size={{ xs: 4, sm: 2 }}><TextField label="Mín" type="number" size="small" fullWidth value={form.meta_min} onChange={e => setForm(f => ({ ...f, meta_min: e.target.value }))} /></Grid>
            <Grid size={{ xs: 4, sm: 2 }}><TextField label="Máx" type="number" size="small" fullWidth value={form.meta_max} onChange={e => setForm(f => ({ ...f, meta_max: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 2 }}><Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={!form.nombre || mutCrear.isPending} onClick={crear} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: QMS_DARK }, textTransform: 'none' }}>Agregar</Button></Grid>
          </Grid>
        </CardContent>
      </Card>
      <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
              <TableCell>Código</TableCell><TableCell>Indicador</TableCell><TableCell>Módulo</TableCell><TableCell>Tipo</TableCell><TableCell>Frecuencia</TableCell><TableCell>Meta</TableCell><TableCell>Activo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indicadores.map(i => (
              <TableRow key={i.id} hover>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{i.codigo ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i.nombre}</TableCell>
                <TableCell>{i.modulo_origen ? <Chip label={i.modulo_origen} size="small" sx={{ fontSize: 10 }} /> : '—'}</TableCell>
                <TableCell>{i.tipo ?? '—'}</TableCell>
                <TableCell>{i.frecuencia ?? '—'}</TableCell>
                <TableCell sx={{ color: QMS_COLOR, fontWeight: 700 }}>{i.meta != null ? `${i.meta}${i.unidad ?? ''}` : '—'}</TableCell>
                <TableCell><Switch size="small" checked={i.activo} onChange={e => mutToggle.mutate({ id: i.id, activo: e.target.checked })} /></TableCell>
              </TableRow>
            ))}
            {indicadores.length === 0 && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={3}>Sin indicadores. Agrega los de cada módulo de la plataforma.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// ─── Certificaciones ISO (API real) ──────────────────────────────────────────
// Antes eran seis tarjetas escritas a mano que le decían a cualquier empresa
// que estaba certificada, con certificadora y fechas. El estado lo calcula el
// servidor con la fecha de vencimiento.
const EST_CERT: Record<Certificacion['estado'], { label: string; color: string }> = {
  VIGENTE: { label: 'Vigente', color: QMS_COLOR },
  POR_VENCER: { label: 'Por vencer', color: '#D97706' },
  VENCIDA: { label: 'Vencida', color: '#DC2626' },
  EN_IMPLEMENTACION: { label: 'En implementación', color: '#6B7280' },
}
const CERT_VACIA = {
  norma: '', titulo: '', certificadora: '', numero_certificado: '',
  fecha_otorgamiento: '', fecha_vencimiento: '', alcance: '', en_implementacion: false,
}

function CertificacionesConfig() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Certificacion | null }>({ abierto: false, item: null })
  const [f, setF] = useState({ ...CERT_VACIA })
  const { data: certs = [], isLoading } = useQuery({ queryKey: ['qms-certificaciones'], queryFn: qmsApi.certificaciones })

  const abrir = (item: Certificacion | null) => {
    setF(item ? {
      norma: item.norma, titulo: item.titulo ?? '', certificadora: item.certificadora ?? '',
      numero_certificado: item.numero_certificado ?? '',
      fecha_otorgamiento: item.fecha_otorgamiento ?? '', fecha_vencimiento: item.fecha_vencimiento ?? '',
      alcance: item.alcance ?? '', en_implementacion: item.en_implementacion,
    } : { ...CERT_VACIA })
    setDlg({ abierto: true, item })
  }
  const invertidas = !!(f.fecha_otorgamiento && f.fecha_vencimiento && f.fecha_vencimiento < f.fecha_otorgamiento)

  const guardar = useMutation({
    mutationFn: () => {
      const t = (v: string) => v.trim() || null
      const cuerpo: Partial<Certificacion> = {
        norma: f.norma.trim(), titulo: t(f.titulo), certificadora: t(f.certificadora),
        numero_certificado: t(f.numero_certificado),
        fecha_otorgamiento: f.fecha_otorgamiento || null, fecha_vencimiento: f.fecha_vencimiento || null,
        alcance: t(f.alcance), en_implementacion: f.en_implementacion,
      }
      return dlg.item ? qmsApi.editarCertificacion(dlg.item.id, cuerpo) : qmsApi.crearCertificacion(cuerpo)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Certificación actualizada' : 'Certificación registrada')
      qc.invalidateQueries({ queryKey: ['qms-certificaciones'] })
      setDlg({ abierto: false, item: null })
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo guardar')),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => qmsApi.borrarCertificacion(id),
    onSuccess: () => { toast.success('Certificación retirada'); qc.invalidateQueries({ queryKey: ['qms-certificaciones'] }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo retirar')),
  })

  const c = (k: Exclude<keyof typeof f, 'en_implementacion'>) => ({
    value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }),
  })

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Las normas en que la empresa está certificada o trabajando para certificarse.
        </Typography>
        <Button startIcon={<AddIcon />} size="small" variant="contained" onClick={() => abrir(null)}
          sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
          Registrar norma
        </Button>
      </Box>
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {!isLoading && certs.length === 0 && (
        <Alert severity="info">No hay certificaciones registradas.</Alert>
      )}
      <Grid container spacing={2}>
        {certs.map(n => {
          const e = EST_CERT[n.estado]
          const vence = n.fecha_vencimiento
            ? `${n.fecha_vencimiento}${n.dias_para_vencer != null && n.dias_para_vencer >= 0 && n.estado === 'POR_VENCER' ? ` (${n.dias_para_vencer} d)` : ''}`
            : '—'
          return (
            <Grid key={n.id} size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid ${alpha(e.color, 0.25)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: e.color }}>{n.norma}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{n.titulo || '—'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexShrink: 0 }}>
                      <Chip label={e.label} size="small" sx={{ height: 22, fontSize: 10, bgcolor: alpha(e.color, 0.15), color: e.color, fontWeight: 700 }} />
                      <IconButton size="small" aria-label={`Editar ${n.norma}`} onClick={() => abrir(n)}><Edit sx={{ fontSize: 15 }} /></IconButton>
                      <IconButton size="small" aria-label={`Retirar ${n.norma}`}
                        onClick={() => { if (window.confirm(`¿Retirar la certificación ${n.norma}?`)) borrar.mutate(n.id) }}>
                        <DeleteForever sx={{ fontSize: 15, color: '#DC2626' }} />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider sx={{ borderColor: '#F1F5F9', mb: 1.5 }} />
                  <Grid container spacing={1}>
                    {[['Certificadora', n.certificadora || '—'], ['Otorgada', n.fecha_otorgamiento || '—'], ['Vence', vence]].map(([l, v]) => (
                      <Grid key={l} size={{ xs: 4 }}>
                        <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase' }}>{l}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  {n.alcance && (
                    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, bgcolor: '#F9FAFB' }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.25 }}>ALCANCE</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>{n.alcance}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{dlg.item ? `Editar ${dlg.item.norma}` : 'Registrar norma'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 5 }}><TextField label="Norma" required placeholder="ISO 9001:2015" fullWidth size="small" {...c('norma')} /></Grid>
            <Grid size={{ xs: 12, sm: 7 }}><TextField label="Título" placeholder="Gestión de calidad" fullWidth size="small" {...c('titulo')} /></Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel label="Todavía en implementación (sin certificar)"
                control={<Switch checked={f.en_implementacion} onChange={e => setF({ ...f, en_implementacion: e.target.checked })} />} />
            </Grid>
            {!f.en_implementacion && (<>
              <Grid size={{ xs: 12, sm: 7 }}><TextField label="Organismo certificador" fullWidth size="small" {...c('certificadora')} /></Grid>
              <Grid size={{ xs: 12, sm: 5 }}><TextField label="N.º de certificado" fullWidth size="small" {...c('numero_certificado')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Otorgada" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...c('fecha_otorgamiento')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Vence" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...c('fecha_vencimiento')}
                error={invertidas} helperText={invertidas ? 'Antes de otorgarse' : undefined} /></Grid>
            </>)}
            <Grid size={{ xs: 12 }}><TextField label="Alcance" fullWidth size="small" multiline minRows={2} {...c('alcance')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDlg({ abierto: false, item: null })} color="inherit">Cancelar</Button>
          <Button variant="contained" disabled={!f.norma.trim() || invertidas || guardar.isPending}
            onClick={() => guardar.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Umbrales (API real) ─────────────────────────────────────────────────────
// Antes el botón decía «Guardado» sin enviar nada. Solo quedan los umbrales
// que algo lee: el tablero de calidad y la evaluación de proveedores.
const DONDE_SE_USA: Record<string, string> = {
  capa_dias_aviso: 'Alerta del tablero de calidad',
  auditoria_dias_aviso: 'Recordatorio del tablero de calidad',
  nc_mayor_dias_cierre: 'Alerta de NC mayores y críticas atrasadas',
  nc_menor_dias_cierre: 'Alerta de NC menores atrasadas',
  proveedor_puntaje_minimo: 'Marca en la evaluación de proveedores',
}

function UmbralesConfig() {
  const qc = useQueryClient()
  const { data: params = [], isLoading } = useQuery({ queryKey: ['qms-parametros'], queryFn: qmsApi.parametros })
  const [edicion, setEdicion] = useState<Record<string, string>>({})
  const valor = (p: ParametroQMS) => edicion[p.clave] ?? String(p.valor)
  const fueraDeRango = (p: ParametroQMS) => {
    const v = Number(valor(p))
    return valor(p).trim() === '' || !Number.isFinite(v) || v < p.min || v > p.max
  }
  const cambiados = params.filter(p => edicion[p.clave] != null && Number(edicion[p.clave]) !== p.valor)
  const hayError = params.some(fueraDeRango)

  const guardar = useMutation({
    mutationFn: () => qmsApi.guardarParametros(Object.fromEntries(cambiados.map(p => [p.clave, Number(edicion[p.clave])]))),
    onSuccess: (r) => {
      qc.setQueryData(['qms-parametros'], r)
      setEdicion({})
      toast.success('Umbrales guardados')
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo guardar')),
  })

  return (
    <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, maxWidth: 760 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>Umbrales de alerta</Typography>
          <Button startIcon={<Save />} size="small" variant="contained" disabled={!cambiados.length || hayError || guardar.isPending}
            onClick={() => guardar.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Guardar cambios
          </Button>
        </Box>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Stack spacing={2}>
          {params.map(p => (
            <Box key={p.clave} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{p.descripcion}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {DONDE_SE_USA[p.clave] ?? ''} · por defecto {p.defecto}
                </Typography>
              </Box>
              <TextField size="small" type="number" sx={{ width: 120 }} value={valor(p)}
                inputProps={{ min: p.min, max: p.max, 'aria-label': p.descripcion }}
                error={fueraDeRango(p)} helperText={fueraDeRango(p) ? `${p.min} a ${p.max}` : undefined}
                onChange={e => setEdicion({ ...edicion, [p.clave]: e.target.value })} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function QMSConfig() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <SettingsSuggest sx={{ color: QMS_COLOR, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Configuración QMS</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · Indicadores · Normas ISO · Umbrales · Catálogos</Typography>
          </Box>
          <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
        </Box>

        {/* Las pestañas de Notificaciones e Integraciones se quitaron: mostraban
            envíos automáticos que ningún proceso hace e integraciones marcadas
            «conectado» —un SMTP entre ellas— que no existen. */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Indicadores" />
          <Tab label="Normas ISO" />
          <Tab label="Umbrales" />
          <Tab label="Catálogos" />
        </Tabs>

        <TabPanel value={tab} index={0}><IndicadoresConfig /></TabPanel>
        <TabPanel value={tab} index={1}><CertificacionesConfig /></TabPanel>
        <TabPanel value={tab} index={2}><UmbralesConfig /></TabPanel>
        <TabPanel value={tab} index={3}><AdminCatalogos modulo="QMS" color={COLOR_MODULO} /></TabPanel>
      </Box>
    </Layout>
  )
}
