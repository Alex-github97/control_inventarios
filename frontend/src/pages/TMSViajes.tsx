import React, { useState, useMemo } from 'react'
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
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add,
  Search,
  Visibility,
  Edit,
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
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoViaje = 'PROGRAMADO' | 'ASIGNADO' | 'EN_TRANSITO' | 'ENTREGADO' | 'CERRADO' | 'CANCELADO'

interface Viaje {
  id: number
  codigo: string
  tipoServicio: string
  origen: string
  destino: string
  conductor: string
  placa: string
  fechaCargue: string
  fechaEntrega: string
  valorFlete: number
  estado: EstadoViaje
  onTime: boolean | null
  inFull: boolean | null
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
  vehiculo: string
  conductor: string
  notas: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_VIAJES: Viaje[] = [
  { id: 1, codigo: 'V-2024-001', tipoServicio: 'FTL', origen: 'Bogotá', destino: 'Medellín', conductor: 'Carlos Herrera', placa: 'XYZ-123', fechaCargue: '2024-06-20 06:00', fechaEntrega: '2024-06-20 16:00', valorFlete: 1800000, estado: 'EN_TRANSITO', onTime: null, inFull: null },
  { id: 2, codigo: 'V-2024-002', tipoServicio: 'FTL', origen: 'Bogotá', destino: 'Cali', conductor: 'Luis Pérez', placa: 'ABC-456', fechaCargue: '2024-06-20 07:30', fechaEntrega: '2024-06-20 19:00', valorFlete: 2100000, estado: 'EN_TRANSITO', onTime: null, inFull: null },
  { id: 3, codigo: 'V-2024-003', tipoServicio: 'LTL', origen: 'Medellín', destino: 'Barranquilla', conductor: 'Andrés Torres', placa: 'DEF-789', fechaCargue: '2024-06-20 05:00', fechaEntrega: '2024-06-20 22:00', valorFlete: 950000, estado: 'EN_TRANSITO', onTime: null, inFull: null },
  { id: 4, codigo: 'V-2024-004', tipoServicio: 'FTL', origen: 'Cali', destino: 'Bogotá', conductor: 'Jhon Morales', placa: 'GHI-012', fechaCargue: '2024-06-19 22:00', fechaEntrega: '2024-06-20 10:00', valorFlete: 1950000, estado: 'ENTREGADO', onTime: true, inFull: true },
  { id: 5, codigo: 'V-2024-005', tipoServicio: 'EXPRESS', origen: 'Bogotá', destino: 'Bucaramanga', conductor: 'Mauricio Silva', placa: 'MNO-678', fechaCargue: '2024-06-20 08:00', fechaEntrega: '2024-06-20 17:00', valorFlete: 2400000, estado: 'ASIGNADO', onTime: null, inFull: null },
  { id: 6, codigo: 'V-2024-006', tipoServicio: 'LTL', origen: 'Pereira', destino: 'Bogotá', conductor: 'Felipe Castro', placa: 'PQR-901', fechaCargue: '2024-06-20 10:00', fechaEntrega: '2024-06-20 18:00', valorFlete: 780000, estado: 'PROGRAMADO', onTime: null, inFull: null },
  { id: 7, codigo: 'V-2024-007', tipoServicio: 'FTL', origen: 'Barranquilla', destino: 'Cartagena', conductor: 'Diego Vargas', placa: 'STU-234', fechaCargue: '2024-06-20 09:00', fechaEntrega: '2024-06-20 13:00', valorFlete: 650000, estado: 'CERRADO', onTime: false, inFull: true },
  { id: 8, codigo: 'V-2024-008', tipoServicio: 'FTL', origen: 'Bogotá', destino: 'Villavicencio', conductor: 'Hernán Ospina', placa: 'VWX-567', fechaCargue: '2024-06-20 07:00', fechaEntrega: '2024-06-20 12:00', valorFlete: 890000, estado: 'CANCELADO', onTime: null, inFull: null },
  { id: 9, codigo: 'V-2024-009', tipoServicio: 'LTL', origen: 'Bogotá', destino: 'Ibagué', conductor: 'Ricardo Leal', placa: 'YZA-890', fechaCargue: '2024-06-21 06:00', fechaEntrega: '2024-06-21 11:00', valorFlete: 520000, estado: 'PROGRAMADO', onTime: null, inFull: null },
  { id: 10, codigo: 'V-2024-010', tipoServicio: 'EXPRESS', origen: 'Medellín', destino: 'Cali', conductor: 'Sergio Díaz', placa: 'BCD-123', fechaCargue: '2024-06-21 08:00', fechaEntrega: '2024-06-21 15:00', valorFlete: 1750000, estado: 'PROGRAMADO', onTime: null, inFull: null },
  { id: 11, codigo: 'V-2024-011', tipoServicio: 'FTL', origen: 'Cali', destino: 'Pasto', conductor: 'Gabriel Muñoz', placa: 'EFG-456', fechaCargue: '2024-06-19 20:00', fechaEntrega: '2024-06-20 08:00', valorFlete: 1200000, estado: 'ENTREGADO', onTime: true, inFull: false },
  { id: 12, codigo: 'V-2024-012', tipoServicio: 'LTL', origen: 'Bogotá', destino: 'Armenia', conductor: 'Camilo Reyes', placa: 'HIJ-789', fechaCargue: '2024-06-20 11:00', fechaEntrega: '2024-06-20 17:00', valorFlete: 690000, estado: 'ASIGNADO', onTime: null, inFull: null },
]

const VEHICULOS_MOCK = [
  { id: 1, placa: 'XYZ-123', tipo: 'Tractocamión' },
  { id: 2, placa: 'ABC-456', tipo: 'Camión 6 ton' },
  { id: 3, placa: 'DEF-789', tipo: 'Camión 10 ton' },
  { id: 4, placa: 'GHI-012', tipo: 'Tractocamión' },
  { id: 5, placa: 'JKL-345', tipo: 'Van Carga' },
]

const CONDUCTORES_MOCK = [
  { id: 1, nombre: 'Carlos Herrera', licencia: 'C1-123456' },
  { id: 2, nombre: 'Luis Pérez', licencia: 'C1-234567' },
  { id: 3, nombre: 'Andrés Torres', licencia: 'CE-345678' },
  { id: 4, nombre: 'Jhon Morales', licencia: 'C1-456789' },
  { id: 5, nombre: 'Felipe Castro', licencia: 'C2-567890' },
]

const ESTADOS_ALL: EstadoViaje[] = ['PROGRAMADO', 'ASIGNADO', 'EN_TRANSITO', 'ENTREGADO', 'CERRADO', 'CANCELADO']

const estadoStyle: Record<EstadoViaje, { label: string; color: string; bg: string }> = {
  PROGRAMADO: { label: 'Programado', color: '#1D4ED8', bg: '#DBEAFE' },
  ASIGNADO: { label: 'Asignado', color: '#4338CA', bg: '#E0E7FF' },
  EN_TRANSITO: { label: 'En Tránsito', color: '#B45309', bg: '#FEF3C7' },
  ENTREGADO: { label: 'Entregado', color: '#15803D', bg: '#DCFCE7' },
  CERRADO: { label: 'Cerrado', color: '#4B5563', bg: '#F3F4F6' },
  CANCELADO: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2' },
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const STEPS = ['Servicio y Carga', 'Ruta y Tiempos', 'Recursos']

const FORM_INIT: NuevoViajeForm = {
  tipoServicio: '', descripcionCarga: '', pesoKg: '', volumenM3: '', nEntregas: '', valorFlete: '',
  origenCiudad: '', origenDireccion: '', destinoCiudad: '', destinoDireccion: '', distanciaKm: '', fechaCargue: '', fechaEntrega: '',
  vehiculo: '', conductor: '', notas: '',
}

// ─── Dialog Ver Viaje ─────────────────────────────────────────────────────────

function VerViajeDialog({ viaje, open, onClose, onAccion }: { viaje: Viaje | null; open: boolean; onClose: () => void; onAccion: (accion: string, id: number) => void }) {
  const [tab, setTab] = useState(0)
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
      <DialogContent>
        {tab === 0 && (
          <Grid container spacing={2} mt={0}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Tipo Servicio</Typography>
              <Typography fontWeight={600}>{viaje.tipoServicio}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Valor Flete</Typography>
              <Typography fontWeight={600}>{fmt(viaje.valorFlete)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Origen</Typography>
              <Typography fontWeight={600}>{viaje.origen}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Destino</Typography>
              <Typography fontWeight={600}>{viaje.destino}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Conductor</Typography>
              <Typography fontWeight={600}>{viaje.conductor}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Placa</Typography>
              <Typography fontWeight={600}>{viaje.placa}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Fecha Cargue</Typography>
              <Typography fontWeight={600}>{viaje.fechaCargue}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography fontSize={12} color="text.secondary">Fecha Entrega Prog.</Typography>
              <Typography fontWeight={600}>{viaje.fechaEntrega}</Typography>
            </Grid>
          </Grid>
        )}
        {tab === 1 && (
          <Stack spacing={1} mt={1}>
            {['Bodega Central - Bogotá (Cargue)', 'Peaje Facatativá', 'Zona Industrial - Medellín (Entrega)'].map((parada, i) => (
              <Paper key={i} elevation={0} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={i + 1} size="small" sx={{ bgcolor: TMS_COLOR, color: '#fff', fontWeight: 700, width: 28, height: 28 }} />
                  <Typography fontSize={13}>{parada}</Typography>
                  <Chip label={i === 0 ? 'Completado' : i === 1 ? 'En Ruta' : 'Pendiente'} size="small" sx={{ ml: 'auto', bgcolor: i === 0 ? '#DCFCE7' : i === 1 ? '#FEF3C7' : '#F3F4F6', color: i === 0 ? '#15803D' : i === 1 ? '#B45309' : '#4B5563', fontWeight: 600, fontSize: 11 }} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
        {tab === 2 && (
          <Stack spacing={1} mt={1}>
            {[
              { hora: '06:05', evento: 'Salida de bodega en Bogotá', tipo: 'INFO' },
              { hora: '07:30', evento: 'Registro en Peaje Facatativá', tipo: 'INFO' },
              { hora: '09:15', evento: 'Parada técnica 15 min', tipo: 'WARN' },
              { hora: '11:00', evento: 'Ingreso autopista Medellín', tipo: 'INFO' },
            ].map((ev, i) => (
              <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
                <Typography fontSize={12} fontWeight={600} color="text.secondary" sx={{ minWidth: 45 }}>{ev.hora}</Typography>
                <Box sx={{ width: 2, bgcolor: TMS_COLOR, borderRadius: 1, mt: 0.5, alignSelf: 'stretch', opacity: 0.3 }} />
                <Typography fontSize={13}>{ev.evento}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
        {tab === 3 && (
          <Stack spacing={1} mt={1}>
            {['Manifiesto de Carga', 'Lista de Empaque', 'SOAT Vehículo', 'Licencia Conductor'].map((doc, i) => (
              <Paper key={i} elevation={0} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Description sx={{ fontSize: 16, color: TMS_COLOR }} />
                    <Typography fontSize={13}>{doc}</Typography>
                  </Stack>
                  <Chip label={i < 2 ? 'Adjunto' : 'Vigente'} size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 600, fontSize: 11 }} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
        {tab === 4 && (
          <Stack spacing={1} mt={1}>
            {[
              { concepto: 'Flete base', valor: viaje.valorFlete * 0.7 },
              { concepto: 'Peajes estimados', valor: viaje.valorFlete * 0.1 },
              { concepto: 'Combustible estimado', valor: viaje.valorFlete * 0.15 },
              { concepto: 'Viáticos conductor', valor: viaje.valorFlete * 0.05 },
            ].map((c, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #F3F4F6' }}>
                <Typography fontSize={13}>{c.concepto}</Typography>
                <Typography fontSize={13} fontWeight={600}>{fmt(c.valor)}</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ pt: 1 }}>
              <Typography fontWeight={700}>Total</Typography>
              <Typography fontWeight={700} color={TMS_COLOR}>{fmt(viaje.valorFlete)}</Typography>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {viaje.estado === 'PROGRAMADO' && <Button variant="outlined" size="small" onClick={() => { onAccion('asignar', viaje.id); onClose() }}>Asignar</Button>}
        {viaje.estado === 'ASIGNADO' && <Button variant="contained" size="small" sx={{ bgcolor: TMS_COLOR }} onClick={() => { onAccion('iniciar', viaje.id); onClose() }}>Iniciar</Button>}
        {viaje.estado === 'EN_TRANSITO' && <Button variant="contained" size="small" color="success" onClick={() => { onAccion('entregar', viaje.id); onClose() }}>Registrar Entrega</Button>}
        {viaje.estado === 'ENTREGADO' && <Button variant="outlined" size="small" onClick={() => { onAccion('cerrar', viaje.id); onClose() }}>Cerrar</Button>}
        {['PROGRAMADO', 'ASIGNADO'].includes(viaje.estado) && (
          <Button variant="outlined" size="small" color="error" onClick={() => { onAccion('cancelar', viaje.id); onClose() }}>Cancelar</Button>
        )}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog Nuevo Viaje ────────────────────────────────────────────────────────

function NuevoViajeDialog({ open, onClose, onCrear }: { open: boolean; onClose: () => void; onCrear: (f: NuevoViajeForm) => void }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<NuevoViajeForm>(FORM_INIT)

  const set = (k: keyof NuevoViajeForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleClose = () => { setStep(0); setForm(FORM_INIT); onClose() }
  const handleCrear = () => { onCrear(form); handleClose() }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700}>Nuevo Viaje</Typography>
          <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo Servicio</InputLabel>
              <Select value={form.tipoServicio} label="Tipo Servicio" onChange={e => setForm(p => ({ ...p, tipoServicio: String(e.target.value) }))}>
                <MenuItem value="FTL">FTL - Full Truck Load</MenuItem>
                <MenuItem value="LTL">LTL - Less Than Truck Load</MenuItem>
                <MenuItem value="EXPRESS">Express / Urgente</MenuItem>
                <MenuItem value="REFRIGERADO">Refrigerado</MenuItem>
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
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ciudad Origen</InputLabel>
                  <Select value={form.origenCiudad} label="Ciudad Origen" onChange={e => setForm(p => ({ ...p, origenCiudad: String(e.target.value) }))}>
                    {['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena', 'Pereira', 'Ibagué', 'Cúcuta', 'Pasto'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ciudad Destino</InputLabel>
                  <Select value={form.destinoCiudad} label="Ciudad Destino" onChange={e => setForm(p => ({ ...p, destinoCiudad: String(e.target.value) }))}>
                    {['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena', 'Pereira', 'Ibagué', 'Cúcuta', 'Pasto'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}><TextField label="Dirección Origen" size="small" fullWidth value={form.origenDireccion} onChange={set('origenDireccion')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Dirección Destino" size="small" fullWidth value={form.destinoDireccion} onChange={set('destinoDireccion')} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Distancia (km)" size="small" fullWidth type="number" value={form.distanciaKm} onChange={set('distanciaKm')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Fecha/Hora Cargue" size="small" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }} value={form.fechaCargue} onChange={set('fechaCargue')} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Fecha/Hora Entrega" size="small" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }} value={form.fechaEntrega} onChange={set('fechaEntrega')} /></Grid>
            </Grid>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Vehículo</InputLabel>
              <Select value={form.vehiculo} label="Vehículo" onChange={e => setForm(p => ({ ...p, vehiculo: String(e.target.value) }))}>
                {VEHICULOS_MOCK.map(v => <MenuItem key={v.id} value={v.placa}>{v.placa} — {v.tipo}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Conductor</InputLabel>
              <Select value={form.conductor} label="Conductor" onChange={e => setForm(p => ({ ...p, conductor: String(e.target.value) }))}>
                {CONDUCTORES_MOCK.map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre} — Lic. {c.licencia}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Notas adicionales" size="small" fullWidth multiline rows={3} value={form.notas} onChange={set('notas')} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Atrás</Button>}
        <Box flex={1} />
        {step < 2 ? (
          <Button variant="contained" sx={{ bgcolor: TMS_COLOR }} onClick={() => setStep(s => s + 1)}>Siguiente</Button>
        ) : (
          <Button variant="contained" sx={{ bgcolor: TMS_COLOR }} onClick={handleCrear}>Crear Viaje</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TMSViajes() {
  const [viajes, setViajes] = useState<Viaje[]>(MOCK_VIAJES)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoViaje | 'TODOS'>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [viajeVer, setViajeVer] = useState<Viaje | null>(null)

  const filtered = useMemo(() => viajes.filter(v => {
    if (estadoFiltro !== 'TODOS' && v.estado !== estadoFiltro) return false
    if (busqueda && !`${v.codigo} ${v.origen} ${v.destino} ${v.conductor}`.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  }), [viajes, estadoFiltro, busqueda])

  const handleCrear = (form: NuevoViajeForm) => {
    const nuevo: Viaje = {
      id: viajes.length + 1,
      codigo: `V-2024-${String(viajes.length + 1).padStart(3, '0')}`,
      tipoServicio: form.tipoServicio,
      origen: form.origenCiudad,
      destino: form.destinoCiudad,
      conductor: form.conductor,
      placa: form.vehiculo,
      fechaCargue: form.fechaCargue,
      fechaEntrega: form.fechaEntrega,
      valorFlete: Number(form.valorFlete),
      estado: form.conductor ? 'ASIGNADO' : 'PROGRAMADO',
      onTime: null,
      inFull: null,
    }
    setViajes(p => [nuevo, ...p])
    toast.success(`Viaje ${nuevo.codigo} creado exitosamente`)
  }

  const handleAccion = (accion: string, id: number) => {
    const map: Record<string, EstadoViaje> = { asignar: 'ASIGNADO', iniciar: 'EN_TRANSITO', entregar: 'ENTREGADO', cerrar: 'CERRADO', cancelar: 'CANCELADO' }
    setViajes(p => p.map(v => v.id === id ? { ...v, estado: map[accion] || v.estado } : v))
    toast.success(`Acción "${accion}" ejecutada`)
  }

  const ESTADOS_BTN: Array<EstadoViaje | 'TODOS'> = ['TODOS', ...ESTADOS_ALL]

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} color={TMS_COLOR}>Gestión de Viajes</Typography>
            <Typography variant="body2" color="text.secondary">{viajes.length} viajes registrados</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284C7' } }} onClick={() => setDialogNuevo(true)}>
            Nuevo Viaje
          </Button>
        </Stack>

        {/* Toolbar */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
            <TextField
              size="small"
              placeholder="Buscar por código, ciudad, conductor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }}
              sx={{ width: 320 }}
            />
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {ESTADOS_BTN.map(e => {
                const active = estadoFiltro === e
                const s = e === 'TODOS' ? null : estadoStyle[e as EstadoViaje]
                return (
                  <Chip
                    key={e}
                    label={e === 'TODOS' ? `Todos (${viajes.length})` : `${s!.label} (${viajes.filter(v => v.estado === e).length})`}
                    onClick={() => setEstadoFiltro(e)}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: active ? 700 : 500,
                      bgcolor: active ? (s ? s.bg : alpha(TMS_COLOR, 0.1)) : 'transparent',
                      color: active ? (s ? s.color : TMS_COLOR) : 'text.secondary',
                      border: `1px solid ${active ? (s ? s.color : TMS_COLOR) : '#E5E7EB'}`,
                    }}
                    size="small"
                  />
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
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Ruta</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Conductor / Placa</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Prog. Cargue</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Prog. Entrega</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Valor Flete</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>OTIF</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(v => {
                  const e = estadoStyle[v.estado]
                  return (
                    <TableRow key={v.id} hover>
                      <TableCell><Typography fontSize={12} fontWeight={700} color={TMS_COLOR}>{v.codigo}</Typography></TableCell>
                      <TableCell><Chip label={v.tipoServicio} size="small" sx={{ fontSize: 10, fontWeight: 600, bgcolor: alpha(TMS_COLOR, 0.08), color: TMS_COLOR }} /></TableCell>
                      <TableCell>
                        <Typography fontSize={12}>{v.origen}</Typography>
                        <Typography fontSize={11} color="text.secondary">→ {v.destino}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Person sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Box>
                            <Typography fontSize={12}>{v.conductor}</Typography>
                            <Typography fontSize={11} color="text.secondary">{v.placa}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><Typography fontSize={11}>{v.fechaCargue}</Typography></TableCell>
                      <TableCell><Typography fontSize={11}>{v.fechaEntrega}</Typography></TableCell>
                      <TableCell><Typography fontSize={12} fontWeight={600}>{fmt(v.valorFlete)}</Typography></TableCell>
                      <TableCell><Chip label={e.label} size="small" sx={{ bgcolor: e.bg, color: e.color, fontWeight: 700, fontSize: 11 }} /></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="On Time">
                            <Box>{v.onTime === true ? <CheckCircle sx={{ fontSize: 16, color: '#16A34A' }} /> : v.onTime === false ? <CancelIcon sx={{ fontSize: 16, color: '#DC2626' }} /> : <Typography fontSize={11} color="text.disabled">—</Typography>}</Box>
                          </Tooltip>
                          <Tooltip title="In Full">
                            <Box>{v.inFull === true ? <CheckCircle sx={{ fontSize: 16, color: '#16A34A' }} /> : v.inFull === false ? <CancelIcon sx={{ fontSize: 16, color: '#DC2626' }} /> : <Typography fontSize={11} color="text.disabled">—</Typography>}</Box>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" onClick={() => setViajeVer(v)} sx={{ color: TMS_COLOR }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" sx={{ color: '#4B5563' }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                          </Tooltip>
                          {['PROGRAMADO', 'ASIGNADO'].includes(v.estado) && (
                            <Tooltip title="Cancelar">
                              <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleAccion('cancelar', v.id)}><CancelIcon sx={{ fontSize: 16 }} /></IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}>No se encontraron viajes con los filtros aplicados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <NuevoViajeDialog open={dialogNuevo} onClose={() => setDialogNuevo(false)} onCrear={handleCrear} />
        <VerViajeDialog viaje={viajeVer} open={!!viajeVer} onClose={() => setViajeVer(null)} onAccion={handleAccion} />
      </Box>
    </Layout>
  )
}
