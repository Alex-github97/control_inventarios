// QMS Module - Configuración del Sistema
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  TextField, Switch, FormControlLabel, Select, MenuItem, FormControl,
  InputLabel, alpha, Divider, Slider, Table, TableHead, TableBody, TableRow,
  TableCell, Paper, IconButton, Stack,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SettingsSuggest, Save, CheckCircle, Add as AddIcon, Analytics } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

const QMS_COLOR = '#059669'
const QMS_DARK = '#047857'
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
    onError: () => toast.error('No se pudo actualizar'),
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

const ISO_NORMAS = [
  { codigo: 'ISO 9001:2015', titulo: 'Gestión de Calidad', activa: true, desde: '2023-01-15', vence: '2026-01-15', certificadora: 'Bureau Veritas', scope: 'Servicios logísticos integrales, transporte y almacenamiento' },
  { codigo: 'ISO 28000:2022', titulo: 'Seguridad Cadena Suministro', activa: true, desde: '2024-03-01', vence: '2027-03-01', certificadora: 'SGS Colombia', scope: 'Transporte terrestre de carga en Colombia' },
  { codigo: 'ISO 45001:2018', titulo: 'Seguridad y Salud en el Trabajo', activa: true, desde: '2023-06-01', vence: '2026-06-01', certificadora: 'ICONTEC', scope: 'Todos los procesos con personal operativo y administrativo' },
  { codigo: 'ISO 14001:2015', titulo: 'Gestión Ambiental', activa: false, desde: '—', vence: '—', certificadora: '—', scope: 'En proceso de implementación' },
  { codigo: 'ISO 27001:2022', titulo: 'Seguridad de la Información', activa: false, desde: '—', vence: '—', certificadora: '—', scope: 'En proceso de implementación' },
  { codigo: 'ISO 31000:2018', titulo: 'Gestión de Riesgos', activa: true, desde: '2024-01-01', vence: '—', certificadora: 'Marco referencia', scope: 'Todos los procesos organizacionales' },
]

export default function QMSConfig() {
  const [tab, setTab] = useState(0)
  const [saved, setSaved] = useState(false)
  const [umbralNc, setUmbralNc] = useState(10)
  const [umbralCapa, setUmbralCapa] = useState(85)
  const [umbralKpi, setUmbralKpi] = useState(80)
  const [umbralProveedor, setUmbralProveedor] = useState(60)

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SettingsSuggest sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Configuración QMS</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · Normas ISO · Umbrales · Notificaciones</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={saved ? <CheckCircle /> : <Save />} size="small" variant="contained" onClick={handleSave} sx={{ bgcolor: saved ? QMS_COLOR : QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            {saved ? 'Guardado' : 'Guardar Cambios'}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Indicadores" />
          <Tab label="Normas ISO" />
          <Tab label="Umbrales" />
          <Tab label="Notificaciones" />
          <Tab label="Integraciones" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <IndicadoresConfig />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {ISO_NORMAS.map(n => (
              <Grid key={n.codigo} size={{ xs: 12, md: 6 }}>
                <Card sx={{ border: `1px solid ${n.activa ? alpha(QMS_COLOR, 0.25) : '#E5E7EB'}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: n.activa ? QMS_COLOR : 'text.disabled' }}>{n.codigo}</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{n.titulo}</Typography>
                      </Box>
                      <Chip label={n.activa ? 'Activa' : 'No activa'} size="small" sx={{ height: 22, fontSize: 10, bgcolor: n.activa ? alpha(QMS_COLOR, 0.15) : '#F1F5F9', color: n.activa ? QMS_COLOR : 'text.disabled', fontWeight: 700 }} />
                    </Box>
                    <Divider sx={{ borderColor: '#F1F5F9', mb: 1.5 }} />
                    <Grid container spacing={1}>
                      {[['Certificadora', n.certificadora], ['Vigente desde', n.desde], ['Vence', n.vence]].map(([l, v]) => (
                        <Grid key={l as string} size={{ xs: 4 }}>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase' }}>{l}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{v}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, bgcolor: '#F9FAFB' }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.25 }}>ALCANCE</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>{n.scope}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Umbrales de Alerta</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[
                      { label: 'NC máx. por período (antes de alerta)', value: umbralNc, setter: setUmbralNc, min: 1, max: 50, unit: 'NCs', color: '#DC2626' },
                      { label: 'Cierre de CAPAs vigentes (%)', value: umbralCapa, setter: setUmbralCapa, min: 50, max: 100, unit: '%', color: '#D97706' },
                      { label: 'Meta mínima de KPIs (%)', value: umbralKpi, setter: setUmbralKpi, min: 50, max: 100, unit: '%', color: QMS_COLOR },
                      { label: 'Score mínimo proveedores', value: umbralProveedor, setter: setUmbralProveedor, min: 40, max: 90, unit: '/100', color: '#0369A1' },
                    ].map(t => (
                      <Box key={t.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t.label}</Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: t.color }}>{t.value}{t.unit}</Typography>
                        </Box>
                        <Slider value={t.value} min={t.min} max={t.max} step={1} onChange={(_, v) => t.setter(v as number)} sx={{ color: t.color }} />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Plazos Estándar</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { label: 'Días máx. para respuesta a PQRS', placeholder: '15' },
                      { label: 'Días máx. cierre de NC Mayor', placeholder: '30' },
                      { label: 'Días máx. cierre de NC Menor', placeholder: '60' },
                      { label: 'Frecuencia auditoría interna (días)', placeholder: '90' },
                      { label: 'Período de evaluación proveedores', placeholder: 'Trimestral' },
                    ].map(f => (
                      <TextField key={f.label} label={f.label} placeholder={f.placeholder} size="small" fullWidth />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Notificaciones Automáticas</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Alerta de NC sin CAPA asignado (> 48h)', on: true },
                  { label: 'Recordatorio de auditoría 5 días antes', on: true },
                  { label: 'CAPA próximo a vencer (< 7 días)', on: true },
                  { label: 'KPI bajo meta por 2 períodos consecutivos', on: true },
                  { label: 'PQRS sin respuesta en 24 horas', on: true },
                  { label: 'Proveedor en zona deficiente', on: false },
                  { label: 'Riesgo crítico sin plan de mitigación', on: true },
                  { label: 'Encuesta completada al 100%', on: false },
                  { label: 'Hallazgo de auditoría sin responsable', on: true },
                ].map((n, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F9FAFB' }}>
                    <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{n.label}</Typography>
                    <FormControlLabel control={<Switch defaultChecked={n.on} size="small" sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: QMS_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: QMS_COLOR } }} />} label="" />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Grid container spacing={2}>
            {[
              { nombre: 'TMS — Sistema de Transporte', estado: 'conectado', desc: 'Recibe incidentes de transporte como potenciales NCs' },
              { nombre: 'WMS — Gestión de Almacén', estado: 'conectado', desc: 'Sincroniza hallazgos de picking y almacenamiento' },
              { nombre: 'DMS — Documentos', estado: 'conectado', desc: 'Acceso a procedimientos y formatos QMS actualizados' },
              { nombre: 'HCM — Recursos Humanos', estado: 'parcial', desc: 'Datos de formación y evaluación de competencias' },
              { nombre: 'Correo Electrónico (SMTP)', estado: 'conectado', desc: 'Envío de alertas y notificaciones a responsables' },
              { nombre: 'ERP Financiero', estado: 'no_conectado', desc: 'Pendiente: costos de no calidad y reclamaciones económicas' },
            ].map(int => (
              <Grid key={int.nombre} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ border: `1px solid ${int.estado === 'conectado' ? alpha(QMS_COLOR, 0.22) : int.estado === 'parcial' ? alpha('#D97706', 0.22) : '#E5E7EB'}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{int.nombre}</Typography>
                      <Chip label={int.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: int.estado === 'conectado' ? alpha(QMS_COLOR, 0.15) : int.estado === 'parcial' ? alpha('#D97706', 0.15) : '#F1F5F9', color: int.estado === 'conectado' ? QMS_COLOR : int.estado === 'parcial' ? '#D97706' : 'text.disabled', fontWeight: 700 }} />
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', lineHeight: 1.4 }}>{int.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Box>
    </Layout>
  )
}
