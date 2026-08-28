import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  alpha,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add,
  Search,
  Visibility,
  Cancel as CancelIcon,
  CheckCircle,
  Close,
  LocalShipping,
  Person,
  Route,
  Inventory,
  AttachMoney,
  Description,
  Timeline,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

import { COLOR_MODULO } from '@/config/marca'
const TMS_COLOR = COLOR_MODULO

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoViaje = 'PROGRAMADO' | 'ASIGNADO' | 'EN_TRANSITO' | 'ENTREGADO' | 'CERRADO' | 'CANCELADO'

interface ViajeApi {
  id: number
  codigo: string
  tipo_servicio: string
  estado: EstadoViaje
  vehiculo_id?: number | null
  vehiculo_placa?: string | null
  conductor_hcm_id?: number | null
  conductor_nombre?: string | null
  origen_ciudad?: string | null
  destino_ciudad?: string | null
  fecha_programada_cargue?: string | null
  fecha_programada_entrega?: string | null
  distancia_km?: number | null
  peso_kg?: number | null
  num_entregas?: number | null
  valor_flete?: number | null
  otif_on_time?: boolean | null
  otif_in_full?: boolean | null
  notas?: string | null
}

interface NuevoViajeForm {
  tipoServicio: string
  descripcionCarga: string
  pesoKg: string
  volumenM3: string
  nEntregas: string
  valorFlete: string
  origenCiudad: string
  origenDireccion: string
  destinoCiudad: string
  destinoDireccion: string
  distanciaKm: string
  fechaCargue: string
  fechaEntrega: string
  vehiculoId: string
  conductorId: string
  notas: string
}

const TIPO_SERVICIO_OPTS: { value: string; label: string }[] = [
  { value: 'TERRESTRE_URBANO', label: 'Terrestre urbano' },
  { value: 'TERRESTRE_REGIONAL', label: 'Terrestre regional' },
  { value: 'TERRESTRE_NACIONAL', label: 'Terrestre nacional' },
  { value: 'INTERNACIONAL', label: 'Internacional' },
  { value: 'DISTRIBUCION', label: 'Distribución' },
  { value: 'ULTIMA_MILLA', label: 'Última milla' },
  { value: 'PRIMERA_MILLA', label: 'Primera milla' },
  { value: 'CROSS_DOCKING', label: 'Cross Docking' },
  { value: 'DEDICADO', label: 'Dedicado' },
]
const tipoServicioLabel = (v?: string | null) => TIPO_SERVICIO_OPTS.find((o) => o.value === v)?.label || v || '—'

const ESTADOS_ALL: EstadoViaje[] = ['PROGRAMADO', 'ASIGNADO', 'EN_TRANSITO', 'ENTREGADO', 'CERRADO', 'CANCELADO']

const estadoStyle: Record<EstadoViaje, { label: string; color: string; bg: string }> = {
  PROGRAMADO: { label: 'Programado', color: '#1D4ED8', bg: '#DBEAFE' },
  ASIGNADO: { label: 'Asignado', color: '#4338CA', bg: '#E0E7FF' },
  EN_TRANSITO: { label: 'En Tránsito', color: '#B45309', bg: '#FEF3C7' },
  ENTREGADO: { label: 'Entregado', color: '#15803D', bg: '#DCFCE7' },
  CERRADO: { label: 'Cerrado', color: '#4B5563', bg: '#F3F4F6' },
  CANCELADO: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2' },
}

const fmt = (n?: number | null) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtFecha = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STEPS = ['Servicio y Carga', 'Ruta y Tiempos', 'Recursos']

const FORM_INIT: NuevoViajeForm = {
  tipoServicio: '', descripcionCarga: '', pesoKg: '', volumenM3: '', nEntregas: '1', valorFlete: '',
  origenCiudad: '', origenDireccion: '', destinoCiudad: '', destinoDireccion: '', distanciaKm: '', fechaCargue: '', fechaEntrega: '',
  vehiculoId: '', conductorId: '', notas: '',
}

// ─── Dialog Ver Viaje (detalle real) ──────────────────────────────────────────

function VerViajeDialog({ viaje, open, onClose, onAccion }: { viaje: ViajeApi | null; open: boolean; onClose: () => void; onAccion: (accion: string, id: number) => void }) {
  const [tab, setTab] = useState(0)
  const id = viaje?.id

  const { data: paradas = [], isLoading: lp } = useQuery<any[]>({ queryKey: ['tms-paradas', id], queryFn: () => apiClient.get(`/tms/viajes/${id}/paradas`).then((r) => r.data), enabled: open && !!id && tab === 1 })
  const { data: eventos = [], isLoading: le } = useQuery<any[]>({ queryKey: ['tms-eventos', id], queryFn: () => apiClient.get(`/tms/viajes/${id}/eventos`).then((r) => r.data), enabled: open && !!id && tab === 2 })
  const { data: documentos = [], isLoading: ld } = useQuery<any[]>({ queryKey: ['tms-docs', id], queryFn: () => apiClient.get(`/tms/viajes/${id}/documentos`).then((r) => r.data), enabled: open && !!id && tab === 3 })
  const { data: costos, isLoading: lc, isError: costoErr } = useQuery<any>({ queryKey: ['tms-costos', id], queryFn: () => apiClient.get(`/tms/viajes/${id}/costos`).then((r) => r.data), enabled: open && !!id && tab === 4, retry: false })

  if (!viaje) return null
  const e = estadoStyle[viaje.estado]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShipping sx={{ color: TMS_COLOR }} />
            <Typography fontWeight={700}>{viaje.codigo}</Typography>
            <Chip label={e.label} size="small" sx={{ bgcolor: e.bg, color: e.color, fontWeight: 700 }} />
          </Stack>
          <IconButton size="small" onClick={onClose}><Close /></IconButton>
        </Stack>
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: '1px solid #E5E7EB' }}>
        <Tab icon={<Description />} iconPosition="start" label="Información" sx={{ fontSize: 13 }} />
        <Tab icon={<Route />} iconPosition="start" label="Paradas" sx={{ fontSize: 13 }} />
        <Tab icon={<Timeline />} iconPosition="start" label="Tracking" sx={{ fontSize: 13 }} />
        <Tab icon={<Inventory />} iconPosition="start" label="Documentos" sx={{ fontSize: 13 }} />
        <Tab icon={<AttachMoney />} iconPosition="start" label="Costos" sx={{ fontSize: 13 }} />
      </Tabs>
      <DialogContent sx={{ minHeight: 260 }}>
        {tab === 0 && (
          <Grid container spacing={2} mt={0}>
            {[
              ['Tipo Servicio', tipoServicioLabel(viaje.tipo_servicio)],
              ['Valor Flete', fmt(viaje.valor_flete)],
              ['Origen', viaje.origen_ciudad || '—'],
              ['Destino', viaje.destino_ciudad || '—'],
              ['Conductor', viaje.conductor_nombre || '—'],
              ['Placa', viaje.vehiculo_placa || '—'],
              ['Distancia', viaje.distancia_km ? `${viaje.distancia_km} km` : '—'],
              ['Peso', viaje.peso_kg ? `${viaje.peso_kg} kg` : '—'],
              ['Fecha Cargue Prog.', fmtFecha(viaje.fecha_programada_cargue)],
              ['Fecha Entrega Prog.', fmtFecha(viaje.fecha_programada_entrega)],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 12, md: 6 }}>
                <Typography fontSize={12} color="text.secondary">{label}</Typography>
                <Typography fontWeight={600}>{value}</Typography>
              </Grid>
            ))}
            {viaje.notas && (
              <Grid size={{ xs: 12 }}>
                <Typography fontSize={12} color="text.secondary">Notas</Typography>
                <Typography fontSize={13}>{viaje.notas}</Typography>
              </Grid>
            )}
          </Grid>
        )}

        {tab === 1 && (
          lp ? <Box textAlign="center" py={4}><CircularProgress size={24} /></Box>
          : paradas.length === 0 ? <Typography color="text.secondary" fontSize={13} py={3} textAlign="center">Este viaje no tiene paradas registradas.</Typography>
          : (
            <Stack spacing={1} mt={1}>
              {paradas.map((p) => (
                <Paper key={p.id} elevation={0} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={p.secuencia} size="small" sx={{ bgcolor: TMS_COLOR, color: '#fff', fontWeight: 700, width: 28, height: 28 }} />
                    <Box>
                      <Typography fontSize={13} fontWeight={600}>{p.ciudad} <Typography component="span" fontSize={11} color="text.secondary">({p.tipo})</Typography></Typography>
                      {p.direccion && <Typography fontSize={11} color="text.secondary">{p.direccion}</Typography>}
                    </Box>
                    <Chip label={p.estado} size="small" sx={{ ml: 'auto', fontWeight: 600, fontSize: 11 }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )
        )}

        {tab === 2 && (
          le ? <Box textAlign="center" py={4}><CircularProgress size={24} /></Box>
          : eventos.length === 0 ? <Typography color="text.secondary" fontSize={13} py={3} textAlign="center">Sin eventos de tracking registrados.</Typography>
          : (
            <Stack spacing={1} mt={1}>
              {eventos.map((ev) => (
                <Stack key={ev.id} direction="row" spacing={2} alignItems="flex-start">
                  <Typography fontSize={12} fontWeight={600} color="text.secondary" sx={{ minWidth: 92 }}>{fmtFecha(ev.timestamp)}</Typography>
                  <Box sx={{ width: 2, bgcolor: TMS_COLOR, borderRadius: 1, mt: 0.5, alignSelf: 'stretch', opacity: 0.3 }} />
                  <Box>
                    <Typography fontSize={13} fontWeight={600}>{ev.tipo_evento}</Typography>
                    {ev.descripcion && <Typography fontSize={12} color="text.secondary">{ev.descripcion}</Typography>}
                    {ev.velocidad_kmh != null && <Typography fontSize={11} color="text.disabled">{ev.velocidad_kmh} km/h</Typography>}
                  </Box>
                </Stack>
              ))}
            </Stack>
          )
        )}

        {tab === 3 && (
          ld ? <Box textAlign="center" py={4}><CircularProgress size={24} /></Box>
          : documentos.length === 0 ? <Typography color="text.secondary" fontSize={13} py={3} textAlign="center">Sin documentos asociados al viaje.</Typography>
          : (
            <Stack spacing={1} mt={1}>
              {documentos.map((doc) => (
                <Paper key={doc.id} elevation={0} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Description sx={{ fontSize: 16, color: TMS_COLOR }} />
                      <Box>
                        <Typography fontSize={13}>{doc.tipo_documento}{doc.numero ? ` — ${doc.numero}` : ''}</Typography>
                        {doc.fecha_emision && <Typography fontSize={11} color="text.secondary">{doc.fecha_emision}</Typography>}
                      </Box>
                    </Stack>
                    <Chip label={doc.estado} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )
        )}

        {tab === 4 && (
          lc ? <Box textAlign="center" py={4}><CircularProgress size={24} /></Box>
          : (costoErr || !costos) ? <Typography color="text.secondary" fontSize={13} py={3} textAlign="center">Este viaje aún no tiene costos registrados.</Typography>
          : (
            <Stack spacing={1} mt={1}>
              {[
                ['Combustible', costos.combustible], ['Peajes', costos.peajes], ['Viáticos', costos.viaticos],
                ['Horas extras', costos.horas_extras], ['Mantenimiento', costos.mantenimiento], ['Costos indirectos', costos.costos_indirectos],
              ].map(([label, val]) => (
                <Stack key={label as string} direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                  <Typography fontSize={13}>{label}</Typography>
                  <Typography fontSize={13} fontWeight={600}>{fmt(val as number)}</Typography>
                </Stack>
              ))}
              <Stack direction="row" justifyContent="space-between" sx={{ pt: 1 }}>
                <Typography fontWeight={700}>Costo total</Typography>
                <Typography fontWeight={700} color={TMS_COLOR}>{fmt(costos.costo_total)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontSize={13}>Flete cobrado</Typography>
                <Typography fontSize={13} fontWeight={600}>{fmt(costos.valor_flete_cobrado)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={700}>Margen</Typography>
                <Typography fontWeight={700} color={costos.margen >= 0 ? '#15803D' : '#DC2626'}>{fmt(costos.margen)}</Typography>
              </Stack>
            </Stack>
          )
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {viaje.estado === 'PROGRAMADO' && <Button variant="outlined" size="small" onClick={() => { onAccion('ASIGNADO', viaje.id); onClose() }}>Asignar</Button>}
        {viaje.estado === 'ASIGNADO' && <Button variant="contained" size="small" sx={{ bgcolor: TMS_COLOR }} onClick={() => { onAccion('EN_TRANSITO', viaje.id); onClose() }}>Iniciar</Button>}
        {viaje.estado === 'EN_TRANSITO' && <Button variant="contained" size="small" color="success" onClick={() => { onAccion('ENTREGADO', viaje.id); onClose() }}>Registrar Entrega</Button>}
        {viaje.estado === 'ENTREGADO' && <Button variant="outlined" size="small" onClick={() => { onAccion('CERRADO', viaje.id); onClose() }}>Cerrar</Button>}
        {['PROGRAMADO', 'ASIGNADO'].includes(viaje.estado) && <Button variant="outlined" size="small" color="error" onClick={() => { onAccion('CANCELADO', viaje.id); onClose() }}>Cancelar</Button>}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog Nuevo Viaje (real) ─────────────────────────────────────────────────

function NuevoViajeDialog({ open, onClose, onCreado, vehiculos, conductores }: { open: boolean; onClose: () => void; onCreado: () => void; vehiculos: any[]; conductores: any[] }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<NuevoViajeForm>(FORM_INIT)
  const [saving, setSaving] = useState(false)

  const set = (k: keyof NuevoViajeForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const handleClose = () => { setStep(0); setForm(FORM_INIT); onClose() }

  const crear = async () => {
    if (!form.tipoServicio) { toast.error('Selecciona el tipo de servicio'); setStep(0); return }
    setSaving(true)
    try {
      const payload: any = {
        tipo_servicio: form.tipoServicio,
        origen_ciudad: form.origenCiudad || undefined,
        origen_direccion: form.origenDireccion || undefined,
        destino_ciudad: form.destinoCiudad || undefined,
        destino_direccion: form.destinoDireccion || undefined,
        distancia_km: form.distanciaKm ? Number(form.distanciaKm) : undefined,
        peso_kg: form.pesoKg ? Number(form.pesoKg) : undefined,
        volumen_m3: form.volumenM3 ? Number(form.volumenM3) : undefined,
        num_entregas: form.nEntregas ? Number(form.nEntregas) : 1,
        valor_flete: form.valorFlete ? Number(form.valorFlete) : undefined,
        fecha_programada_cargue: form.fechaCargue || undefined,
        fecha_programada_entrega: form.fechaEntrega || undefined,
        vehiculo_id: form.vehiculoId ? Number(form.vehiculoId) : undefined,
        conductor_hcm_id: form.conductorId ? Number(form.conductorId) : undefined,
        notas: form.notas || undefined,
      }
      await apiClient.post('/tms/viajes', payload)
      toast.success('Viaje creado')
      handleClose(); onCreado()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'No se pudo crear el viaje') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700}>Nuevo Viaje</Typography>
          <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>{STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}</Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo Servicio</InputLabel>
              <Select value={form.tipoServicio} label="Tipo Servicio" onChange={(e) => setForm((p) => ({ ...p, tipoServicio: String(e.target.value) }))}>
                {TIPO_SERVICIO_OPTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Descripción Carga" size="small" fullWidth value={form.descripcionCarga} onChange={set('descripcionCarga')} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}><TextField label="Peso (kg)" size="small" fullWidth type="number" value={form.pesoKg} onChange={set('pesoKg')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Volumen (m³)" size="small" fullWidth type="number" value={form.volumenM3} onChange={set('volumenM3')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="N° Entregas" size="small" fullWidth type="number" value={form.nEntregas} onChange={set('nEntregas')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Valor Flete (COP)" size="small" fullWidth type="number" value={form.valorFlete} onChange={set('valorFlete')} /></Grid>
            </Grid>
          </Stack>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><TextField label="Ciudad Origen" size="small" fullWidth value={form.origenCiudad} onChange={set('origenCiudad')} /></Grid>
            <Grid size={{ xs: 6 }}><TextField label="Ciudad Destino" size="small" fullWidth value={form.destinoCiudad} onChange={set('destinoCiudad')} /></Grid>
            <Grid size={{ xs: 6 }}><TextField label="Dirección Origen" size="small" fullWidth value={form.origenDireccion} onChange={set('origenDireccion')} /></Grid>
            <Grid size={{ xs: 6 }}><TextField label="Dirección Destino" size="small" fullWidth value={form.destinoDireccion} onChange={set('destinoDireccion')} /></Grid>
            <Grid size={{ xs: 12 }}><TextField label="Distancia (km)" size="small" fullWidth type="number" value={form.distanciaKm} onChange={set('distanciaKm')} /></Grid>
            <Grid size={{ xs: 6 }}><TextField label="Fecha/Hora Cargue" size="small" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }} value={form.fechaCargue} onChange={set('fechaCargue')} /></Grid>
            <Grid size={{ xs: 6 }}><TextField label="Fecha/Hora Entrega" size="small" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }} value={form.fechaEntrega} onChange={set('fechaEntrega')} /></Grid>
          </Grid>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Vehículo</InputLabel>
              <Select value={form.vehiculoId} label="Vehículo" onChange={(e) => setForm((p) => ({ ...p, vehiculoId: String(e.target.value) }))}>
                <MenuItem value="">— Sin asignar —</MenuItem>
                {vehiculos.map((v) => <MenuItem key={v.id} value={String(v.id)}>{v.placa} — {v.tipo_vehiculo}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Conductor</InputLabel>
              <Select value={form.conductorId} label="Conductor" onChange={(e) => setForm((p) => ({ ...p, conductorId: String(e.target.value) }))}>
                <MenuItem value="">— Sin asignar —</MenuItem>
                {conductores.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.colaborador_nombre || `Conductor #${c.id}`} — Lic. {c.num_licencia}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Notas adicionales" size="small" fullWidth multiline rows={3} value={form.notas} onChange={set('notas')} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {step > 0 && <Button onClick={() => setStep((s) => s - 1)} disabled={saving}>Atrás</Button>}
        <Box flex={1} />
        {step < 2 ? (
          <Button variant="contained" sx={{ bgcolor: TMS_COLOR }} onClick={() => setStep((s) => s + 1)}>Siguiente</Button>
        ) : (
          <Button variant="contained" sx={{ bgcolor: TMS_COLOR }} onClick={crear} disabled={saving}>{saving ? 'Creando…' : 'Crear Viaje'}</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TMSViajes() {
  const qc = useQueryClient()
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoViaje | 'TODOS'>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [viajeVer, setViajeVer] = useState<ViajeApi | null>(null)

  const { data, isLoading } = useQuery<{ items: ViajeApi[]; total: number }>({
    queryKey: ['tms-viajes'],
    queryFn: () => apiClient.get('/tms/viajes', { params: { per_page: 100 } }).then((r) => r.data),
  })
  const viajes = data?.items ?? []

  const { data: vehiculos = [] } = useQuery<any[]>({ queryKey: ['tms-vehiculos'], queryFn: () => apiClient.get('/tms/vehiculos').then((r) => r.data) })
  const { data: conductores = [] } = useQuery<any[]>({ queryKey: ['hcm-conductores'], queryFn: () => apiClient.get('/hcm/conductores').then((r) => r.data) })

  const filtered = useMemo(() => viajes.filter((v) => {
    if (estadoFiltro !== 'TODOS' && v.estado !== estadoFiltro) return false
    if (busqueda && !`${v.codigo} ${v.origen_ciudad ?? ''} ${v.destino_ciudad ?? ''} ${v.conductor_nombre ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  }), [viajes, estadoFiltro, busqueda])

  const handleAccion = async (estado: string, id: number) => {
    try {
      await apiClient.put(`/tms/viajes/${id}/estado`, null, { params: { estado } })
      toast.success('Estado actualizado')
      qc.invalidateQueries({ queryKey: ['tms-viajes'] })
    } catch (err: any) { toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado') }
  }

  const ESTADOS_BTN: Array<EstadoViaje | 'TODOS'> = ['TODOS', ...ESTADOS_ALL]

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} color={TMS_COLOR}>Gestión de Viajes</Typography>
            <Typography variant="body2" color="text.secondary">{data?.total ?? viajes.length} viajes registrados</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284C7' } }} onClick={() => setDialogNuevo(true)}>Nuevo Viaje</Button>
        </Stack>

        {/* Toolbar */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
            <TextField size="small" placeholder="Buscar por código, ciudad, conductor..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }} sx={{ width: 320 }} />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {ESTADOS_BTN.map((es) => {
                const active = estadoFiltro === es
                const s = es === 'TODOS' ? null : estadoStyle[es as EstadoViaje]
                return (
                  <Chip key={es} size="small"
                    label={es === 'TODOS' ? `Todos (${viajes.length})` : `${s!.label} (${viajes.filter((v) => v.estado === es).length})`}
                    onClick={() => setEstadoFiltro(es)}
                    sx={{ cursor: 'pointer', fontWeight: active ? 700 : 500, bgcolor: active ? (s ? s.bg : alpha(TMS_COLOR, 0.1)) : 'transparent', color: active ? (s ? s.color : TMS_COLOR) : 'text.secondary', border: `1px solid ${active ? (s ? s.color : TMS_COLOR) : '#E5E7EB'}` }} />
                )
              })}
            </Stack>
          </Stack>
        </Paper>

        {/* Tabla */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                  {['Código', 'Tipo', 'Ruta', 'Conductor / Placa', 'Prog. Cargue', 'Prog. Entrega', 'Valor Flete', 'Estado', 'OTIF', 'Acciones'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
                ) : filtered.map((v) => {
                  const e = estadoStyle[v.estado]
                  return (
                    <TableRow key={v.id} hover sx={{ cursor: 'pointer' }} onClick={() => setViajeVer(v)}>
                      <TableCell><Typography fontSize={12} fontWeight={700} color={TMS_COLOR}>{v.codigo}</Typography></TableCell>
                      <TableCell><Chip label={tipoServicioLabel(v.tipo_servicio)} size="small" sx={{ fontSize: 10, fontWeight: 600, bgcolor: alpha(TMS_COLOR, 0.08), color: TMS_COLOR }} /></TableCell>
                      <TableCell>
                        <Typography fontSize={12}>{v.origen_ciudad || '—'}</Typography>
                        <Typography fontSize={11} color="text.secondary">→ {v.destino_ciudad || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Person sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Box>
                            <Typography fontSize={12}>{v.conductor_nombre || '—'}</Typography>
                            <Typography fontSize={11} color="text.secondary">{v.vehiculo_placa || '—'}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><Typography fontSize={11}>{fmtFecha(v.fecha_programada_cargue)}</Typography></TableCell>
                      <TableCell><Typography fontSize={11}>{fmtFecha(v.fecha_programada_entrega)}</Typography></TableCell>
                      <TableCell><Typography fontSize={12} fontWeight={600}>{fmt(v.valor_flete)}</Typography></TableCell>
                      <TableCell><Chip label={e.label} size="small" sx={{ bgcolor: e.bg, color: e.color, fontWeight: 700, fontSize: 11 }} /></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="On Time"><Box>{v.otif_on_time === true ? <CheckCircle sx={{ fontSize: 16, color: '#16A34A' }} /> : v.otif_on_time === false ? <CancelIcon sx={{ fontSize: 16, color: '#DC2626' }} /> : <Typography fontSize={11} color="text.disabled">—</Typography>}</Box></Tooltip>
                          <Tooltip title="In Full"><Box>{v.otif_in_full === true ? <CheckCircle sx={{ fontSize: 16, color: '#16A34A' }} /> : v.otif_in_full === false ? <CancelIcon sx={{ fontSize: 16, color: '#DC2626' }} /> : <Typography fontSize={11} color="text.disabled">—</Typography>}</Box></Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell onClick={(ev) => ev.stopPropagation()}>
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => setViajeVer(v)} sx={{ color: TMS_COLOR }}><Visibility sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          {['PROGRAMADO', 'ASIGNADO'].includes(v.estado) && (
                            <Tooltip title="Cancelar"><IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleAccion('CANCELADO', v.id)}><CancelIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>
                    {viajes.length === 0 ? 'Aún no hay viajes. Crea el primero con “Nuevo Viaje”.' : 'No se encontraron viajes con los filtros aplicados'}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <NuevoViajeDialog open={dialogNuevo} onClose={() => setDialogNuevo(false)} onCreado={() => qc.invalidateQueries({ queryKey: ['tms-viajes'] })} vehiculos={vehiculos} conductores={conductores} />
        <VerViajeDialog viaje={viajeVer} open={!!viajeVer} onClose={() => setViajeVer(null)} onAccion={handleAccion} />
      </Box>
    </Layout>
  )
}
