import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Grid2 as Grid,
  Divider,
  alpha,
  Tooltip,
} from '@mui/material'
import {
  Search,
  Add,
  Edit,
  Close,
  Route,
  DirectionsCar,
  Speed,
  AttachMoney,
  Timeline,
  Delete,
  CheckCircle,
  Block,
  MapOutlined,
  TrendingUp,
  TrendingDown,
  AccessTime,
  LocalGasStation,
  Toll,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface PuntoRuta {
  secuencia: number
  ciudad: string
  tipo: 'ORIGEN' | 'PARADA' | 'DESTINO'
}

interface Ruta {
  id: number
  nombre: string
  codigo: string
  origen: string
  destino: string
  distanciaKm: number
  tiempoEstimadoMin: number
  tipoServicio: 'CARGA_GENERAL' | 'REFRIGERADO' | 'PELIGROSO' | 'EXPRESO' | 'MASIVO'
  costoReferencia: number
  estado: 'ACTIVA' | 'INACTIVA'
  puntosRuta: PuntoRuta[]
}

interface AlternativaRuta {
  nombre: string
  distanciaKm: number
  tiempoMin: number
  costoTotal: number
  descripcion: string
}

interface ResultadoOptimizacion {
  distanciaTotal: number
  tiempoEstimadoMin: number
  costoCombustible: number
  peajes: number
  costoTotal: number
  alternativas: AlternativaRuta[]
}

interface RutaAnalisis {
  ruta: string
  nViajes: number
  otifRate: number
  costoPromKm: number
  tiempoPromMin: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RUTAS: Ruta[] = [
  {
    id: 1,
    nombre: 'Bogotá-Medellín Express',
    codigo: 'RT-001',
    origen: 'Bogotá',
    destino: 'Medellín',
    distanciaKm: 415,
    tiempoEstimadoMin: 480,
    tipoServicio: 'EXPRESO',
    costoReferencia: 850000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Bogotá', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Honda', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'La Pintada', tipo: 'PARADA' },
      { secuencia: 4, ciudad: 'Medellín', tipo: 'DESTINO' },
    ],
  },
  {
    id: 2,
    nombre: 'Bogotá-Barranquilla',
    codigo: 'RT-002',
    origen: 'Bogotá',
    destino: 'Barranquilla',
    distanciaKm: 1050,
    tiempoEstimadoMin: 900,
    tipoServicio: 'CARGA_GENERAL',
    costoReferencia: 1800000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Bogotá', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Bucaramanga', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Santa Marta', tipo: 'PARADA' },
      { secuencia: 4, ciudad: 'Barranquilla', tipo: 'DESTINO' },
    ],
  },
  {
    id: 3,
    nombre: 'Medellín-Cali',
    codigo: 'RT-003',
    origen: 'Medellín',
    destino: 'Cali',
    distanciaKm: 295,
    tiempoEstimadoMin: 360,
    tipoServicio: 'CARGA_GENERAL',
    costoReferencia: 580000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Medellín', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Manizales', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Cali', tipo: 'DESTINO' },
    ],
  },
  {
    id: 4,
    nombre: 'Bogotá-Cali Refrigerado',
    codigo: 'RT-004',
    origen: 'Bogotá',
    destino: 'Cali',
    distanciaKm: 462,
    tiempoEstimadoMin: 540,
    tipoServicio: 'REFRIGERADO',
    costoReferencia: 1200000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Bogotá', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Ibagué', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Armenia', tipo: 'PARADA' },
      { secuencia: 4, ciudad: 'Cali', tipo: 'DESTINO' },
    ],
  },
  {
    id: 5,
    nombre: 'Cartagena-Bogotá',
    codigo: 'RT-005',
    origen: 'Cartagena',
    destino: 'Bogotá',
    distanciaKm: 1050,
    tiempoEstimadoMin: 960,
    tipoServicio: 'MASIVO',
    costoReferencia: 1650000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Cartagena', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Montería', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Medellín', tipo: 'PARADA' },
      { secuencia: 4, ciudad: 'Bogotá', tipo: 'DESTINO' },
    ],
  },
  {
    id: 6,
    nombre: 'Bucaramanga-Bogotá',
    codigo: 'RT-006',
    origen: 'Bucaramanga',
    destino: 'Bogotá',
    distanciaKm: 400,
    tiempoEstimadoMin: 420,
    tipoServicio: 'CARGA_GENERAL',
    costoReferencia: 720000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Bucaramanga', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Tunja', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Bogotá', tipo: 'DESTINO' },
    ],
  },
  {
    id: 7,
    nombre: 'Cali-Cartagena Peligroso',
    codigo: 'RT-007',
    origen: 'Cali',
    destino: 'Cartagena',
    distanciaKm: 1200,
    tiempoEstimadoMin: 1080,
    tipoServicio: 'PELIGROSO',
    costoReferencia: 2400000,
    estado: 'INACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Cali', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Medellín', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Montería', tipo: 'PARADA' },
      { secuencia: 4, ciudad: 'Cartagena', tipo: 'DESTINO' },
    ],
  },
  {
    id: 8,
    nombre: 'Bogotá-Bucaramanga',
    codigo: 'RT-008',
    origen: 'Bogotá',
    destino: 'Bucaramanga',
    distanciaKm: 400,
    tiempoEstimadoMin: 440,
    tipoServicio: 'EXPRESO',
    costoReferencia: 780000,
    estado: 'ACTIVA',
    puntosRuta: [
      { secuencia: 1, ciudad: 'Bogotá', tipo: 'ORIGEN' },
      { secuencia: 2, ciudad: 'Tunja', tipo: 'PARADA' },
      { secuencia: 3, ciudad: 'Bucaramanga', tipo: 'DESTINO' },
    ],
  },
]

const MOCK_ANALISIS: RutaAnalisis[] = [
  { ruta: 'RT-001 Bogotá-Medellín', nViajes: 45, otifRate: 94.4, costoPromKm: 2048, tiempoPromMin: 475 },
  { ruta: 'RT-003 Medellín-Cali', nViajes: 38, otifRate: 92.1, costoPromKm: 1966, tiempoPromMin: 355 },
  { ruta: 'RT-006 Bucaramanga-Bogotá', nViajes: 52, otifRate: 91.3, costoPromKm: 1800, tiempoPromMin: 418 },
  { ruta: 'RT-008 Bogotá-Bucaramanga', nViajes: 41, otifRate: 89.7, costoPromKm: 1950, tiempoPromMin: 442 },
  { ruta: 'RT-002 Bogotá-Barranquilla', nViajes: 29, otifRate: 86.2, costoPromKm: 1714, tiempoPromMin: 898 },
  { ruta: 'RT-004 Bogotá-Cali', nViajes: 33, otifRate: 84.8, costoPromKm: 2597, tiempoPromMin: 542 },
  { ruta: 'RT-005 Cartagena-Bogotá', nViajes: 18, otifRate: 77.8, costoPromKm: 1571, tiempoPromMin: 965 },
  { ruta: 'RT-007 Cali-Cartagena', nViajes: 12, otifRate: 66.7, costoPromKm: 2000, tiempoPromMin: 1085 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatCOP(value: number): string {
  return `$${value.toLocaleString('es-CO')}`
}

function getTipoServicioChip(tipo: Ruta['tipoServicio']) {
  const map: Record<Ruta['tipoServicio'], { label: string; color: string; bg: string }> = {
    CARGA_GENERAL: { label: 'Carga General', color: '#1565C0', bg: alpha('#1565C0', 0.1) },
    REFRIGERADO: { label: 'Refrigerado', color: '#006064', bg: alpha('#00BCD4', 0.12) },
    PELIGROSO: { label: 'Peligroso', color: '#B71C1C', bg: alpha('#F44336', 0.1) },
    EXPRESO: { label: 'Expreso', color: '#E65100', bg: alpha('#FF9800', 0.12) },
    MASIVO: { label: 'Masivo', color: '#4A148C', bg: alpha('#9C27B0', 0.1) },
  }
  const cfg = map[tipo]
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ fontWeight: 600, fontSize: 11, color: cfg.color, bgcolor: cfg.bg, border: 'none' }}
    />
  )
}

function getEstadoChip(estado: Ruta['estado']) {
  return estado === 'ACTIVA' ? (
    <Chip
      label="Activa"
      size="small"
      sx={{ fontWeight: 600, fontSize: 11, color: '#166534', bgcolor: alpha('#22C55E', 0.12) }}
    />
  ) : (
    <Chip
      label="Inactiva"
      size="small"
      sx={{ fontWeight: 600, fontSize: 11, color: '#6B7280', bgcolor: alpha('#9CA3AF', 0.15) }}
    />
  )
}

// ─── Dialog Nueva/Editar Ruta ─────────────────────────────────────────────────

interface RutaDialogProps {
  open: boolean
  ruta: Ruta | null
  onClose: () => void
  onSave: (ruta: Ruta) => void
}

function RutaDialog({ open, ruta, onClose, onSave }: RutaDialogProps) {
  const isEdit = ruta !== null

  const emptyForm = {
    nombre: '',
    codigo: '',
    origen: '',
    destino: '',
    distanciaKm: '' as string | number,
    tiempoEstimadoMin: '' as string | number,
    tipoServicio: 'CARGA_GENERAL' as Ruta['tipoServicio'],
    costoReferencia: '' as string | number,
  }

  const [form, setForm] = useState(
    ruta
      ? {
          nombre: ruta.nombre,
          codigo: ruta.codigo,
          origen: ruta.origen,
          destino: ruta.destino,
          distanciaKm: ruta.distanciaKm,
          tiempoEstimadoMin: ruta.tiempoEstimadoMin,
          tipoServicio: ruta.tipoServicio,
          costoReferencia: ruta.costoReferencia,
        }
      : emptyForm,
  )

  const [puntos, setPuntos] = useState<PuntoRuta[]>(
    ruta ? [...ruta.puntosRuta] : [],
  )

  React.useEffect(() => {
    if (open) {
      setForm(
        ruta
          ? {
              nombre: ruta.nombre,
              codigo: ruta.codigo,
              origen: ruta.origen,
              destino: ruta.destino,
              distanciaKm: ruta.distanciaKm,
              tiempoEstimadoMin: ruta.tiempoEstimadoMin,
              tipoServicio: ruta.tipoServicio,
              costoReferencia: ruta.costoReferencia,
            }
          : emptyForm,
      )
      setPuntos(ruta ? [...ruta.puntosRuta] : [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ruta])

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleAddPunto = () => {
    setPuntos(prev => [
      ...prev,
      { secuencia: prev.length + 1, ciudad: '', tipo: 'PARADA' },
    ])
  }

  const handleDeletePunto = (idx: number) => {
    setPuntos(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated.map((p, i) => ({ ...p, secuencia: i + 1 }))
    })
  }

  const handlePuntoChange = (idx: number, field: keyof PuntoRuta, value: string | number) => {
    setPuntos(prev =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    )
  }

  const handleSave = () => {
    if (!form.nombre || !form.codigo || !form.origen || !form.destino) {
      toast.error('Complete los campos obligatorios')
      return
    }
    const saved: Ruta = {
      id: ruta?.id ?? Date.now(),
      nombre: form.nombre,
      codigo: form.codigo,
      origen: form.origen,
      destino: form.destino,
      distanciaKm: Number(form.distanciaKm) || 0,
      tiempoEstimadoMin: Number(form.tiempoEstimadoMin) || 0,
      tipoServicio: form.tipoServicio,
      costoReferencia: Number(form.costoReferencia) || 0,
      estado: ruta?.estado ?? 'ACTIVA',
      puntosRuta: puntos,
    }
    onSave(saved)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Editar Ruta' : 'Nueva Ruta'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Nombre *"
              fullWidth
              size="small"
              value={form.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Código *"
              fullWidth
              size="small"
              value={form.codigo}
              onChange={e => handleChange('codigo', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Origen *"
              fullWidth
              size="small"
              value={form.origen}
              onChange={e => handleChange('origen', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Destino *"
              fullWidth
              size="small"
              value={form.destino}
              onChange={e => handleChange('destino', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Distancia (km) *"
              fullWidth
              size="small"
              type="number"
              value={form.distanciaKm}
              onChange={e => handleChange('distanciaKm', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Tiempo Estimado (min) *"
              fullWidth
              size="small"
              type="number"
              value={form.tiempoEstimadoMin}
              onChange={e => handleChange('tiempoEstimadoMin', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo Servicio *</InputLabel>
              <Select
                label="Tipo Servicio *"
                value={form.tipoServicio}
                onChange={e => handleChange('tipoServicio', e.target.value)}
              >
                <MenuItem value="CARGA_GENERAL">Carga General</MenuItem>
                <MenuItem value="REFRIGERADO">Refrigerado</MenuItem>
                <MenuItem value="PELIGROSO">Peligroso</MenuItem>
                <MenuItem value="EXPRESO">Expreso</MenuItem>
                <MenuItem value="MASIVO">Masivo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Costo Referencia (COP) *"
              fullWidth
              size="small"
              type="number"
              value={form.costoReferencia}
              onChange={e => handleChange('costoReferencia', e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Puntos de Ruta
          </Typography>
          <Button
            startIcon={<Add />}
            size="small"
            variant="outlined"
            onClick={handleAddPunto}
            sx={{ borderColor: TMS_COLOR, color: TMS_COLOR }}
          >
            Agregar Punto
          </Button>
        </Stack>

        {puntos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Sin puntos de ruta definidos
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(TMS_COLOR, 0.06) }}>
                  <TableCell sx={{ fontWeight: 700, width: 50 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ciudad</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 160 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>Eliminar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {puntos.map((punto, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{punto.secuencia}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={punto.ciudad}
                        onChange={e => handlePuntoChange(idx, 'ciudad', e.target.value)}
                        placeholder="Nombre ciudad"
                        sx={{ '& .MuiInputBase-input': { py: 0.5 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={punto.tipo}
                          onChange={e => handlePuntoChange(idx, 'tipo', e.target.value)}
                          sx={{ '& .MuiSelect-select': { py: 0.5 } }}
                        >
                          <MenuItem value="ORIGEN">Origen</MenuItem>
                          <MenuItem value="PARADA">Parada</MenuItem>
                          <MenuItem value="DESTINO">Destino</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => handleDeletePunto(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#025E91' } }}
        >
          {isEdit ? 'Guardar Cambios' : 'Crear Ruta'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Tab 1: Rutas Registradas ─────────────────────────────────────────────────

interface Tab1Props {
  rutas: Ruta[]
  onEdit: (ruta: Ruta) => void
  onToggleEstado: (id: number) => void
  onNew: () => void
}

function TabRutasRegistradas({ rutas, onEdit, onToggleEstado, onNew }: Tab1Props) {
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'TODAS' | 'ACTIVA' | 'INACTIVA'>('TODAS')

  const filtered = useMemo(() => {
    return rutas.filter(r => {
      const matchSearch =
        search === '' ||
        r.nombre.toLowerCase().includes(search.toLowerCase()) ||
        r.origen.toLowerCase().includes(search.toLowerCase()) ||
        r.destino.toLowerCase().includes(search.toLowerCase()) ||
        r.codigo.toLowerCase().includes(search.toLowerCase())
      const matchEstado = estadoFilter === 'TODAS' || r.estado === estadoFilter
      return matchSearch && matchEstado
    })
  }, [rutas, search, estadoFilter])

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} mb={3} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onNew}
          sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#025E91' }, fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          + Nueva Ruta
        </Button>
        <TextField
          size="small"
          placeholder="Buscar por nombre, origen o destino..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            label="Estado"
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value as typeof estadoFilter)}
          >
            <MenuItem value="TODAS">Todas</MenuItem>
            <MenuItem value="ACTIVA">Activa</MenuItem>
            <MenuItem value="INACTIVA">Inactiva</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(TMS_COLOR, 0.07) }}>
              <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Origen → Destino</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Distancia</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tiempo Est.</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tipo Servicio</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Costo Ref.</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No se encontraron rutas
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(ruta => (
                <TableRow key={ruta.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {ruta.nombre}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: TMS_COLOR, fontWeight: 600 }}>
                      {ruta.codigo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2">{ruta.origen}</Typography>
                      <Typography variant="body2" color="text.secondary">→</Typography>
                      <Typography variant="body2">{ruta.destino}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{ruta.distanciaKm.toLocaleString('es-CO')} km</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatMinutes(ruta.tiempoEstimadoMin)}</Typography>
                  </TableCell>
                  <TableCell>{getTipoServicioChip(ruta.tipoServicio)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {formatCOP(ruta.costoReferencia)}
                    </Typography>
                  </TableCell>
                  <TableCell>{getEstadoChip(ruta.estado)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => onEdit(ruta)} sx={{ color: TMS_COLOR }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={ruta.estado === 'ACTIVA' ? 'Desactivar' : 'Activar'}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleEstado(ruta.id)}
                          sx={{ color: ruta.estado === 'ACTIVA' ? '#EF4444' : '#22C55E' }}
                        >
                          {ruta.estado === 'ACTIVA' ? (
                            <Block fontSize="small" />
                          ) : (
                            <CheckCircle fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ─── Tab 2: Optimizador ───────────────────────────────────────────────────────

const TIPO_VEHICULO_OPTIONS = [
  'CAMION_2_EJES',
  'CAMION_3_EJES',
  'TRACTOMULA',
  'FURGON',
  'CAMIONETA',
  'MOTO',
]

const MOCK_ALTERNATIVAS: AlternativaRuta[] = [
  {
    nombre: 'Ruta Óptima (Recomendada)',
    distanciaKm: 0,
    tiempoMin: 0,
    costoTotal: 0,
    descripcion: 'Menor costo total, ruta por vía principal con peajes incluidos',
  },
  {
    nombre: 'Ruta Rápida',
    distanciaKm: 22,
    tiempoMin: -45,
    costoTotal: 85000,
    descripcion: 'Menor tiempo de tránsito, autopistas de mayor fluidez',
  },
  {
    nombre: 'Ruta Económica',
    distanciaKm: 38,
    tiempoMin: 60,
    costoTotal: -120000,
    descripcion: 'Menor costo de peajes, evita autopistas de alto costo',
  },
]

function TabOptimizador() {
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [nParadas, setNParadas] = useState(0)
  const [paradas, setParadas] = useState<string[]>([])
  const [tipoVehiculo, setTipoVehiculo] = useState('TRACTOMULA')
  const [pesoCarga, setPesoCarga] = useState('')
  const [resultado, setResultado] = useState<ResultadoOptimizacion | null>(null)
  const [calculando, setCalculando] = useState(false)

  const handleNParadasChange = (n: number) => {
    const clamped = Math.max(0, Math.min(5, n))
    setNParadas(clamped)
    setParadas(prev => {
      const arr = [...prev]
      while (arr.length < clamped) arr.push('')
      return arr.slice(0, clamped)
    })
  }

  const handleOptimizar = () => {
    if (!origen || !destino) {
      toast.error('Ingrese origen y destino')
      return
    }
    setCalculando(true)
    setTimeout(() => {
      const distBase = 400 + Math.floor(Math.random() * 700)
      const tiempoBase = Math.round(distBase * 1.1)
      const combustible = Math.round(distBase * 850)
      const peajes = Math.round(distBase * 120)
      const mainCosto = combustible + peajes
      const alts: AlternativaRuta[] = MOCK_ALTERNATIVAS.map((a, idx) => ({
        nombre: a.nombre,
        distanciaKm: idx === 0 ? distBase : distBase + a.distanciaKm,
        tiempoMin: idx === 0 ? tiempoBase : tiempoBase + a.tiempoMin,
        costoTotal: idx === 0 ? mainCosto : mainCosto + a.costoTotal,
        descripcion: a.descripcion,
      }))
      setResultado({
        distanciaTotal: distBase,
        tiempoEstimadoMin: tiempoBase,
        costoCombustible: combustible,
        peajes,
        costoTotal: mainCosto,
        alternativas: alts,
      })
      setCalculando(false)
      toast.success('Optimización calculada exitosamente')
    }, 1200)
  }

  return (
    <Grid container spacing={3}>
      {/* Left Panel */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
            <Box sx={{ p: 1, bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex' }}>
              <MapOutlined sx={{ color: TMS_COLOR, fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Planificador de Ruta
            </Typography>
          </Stack>

          <Stack spacing={2.5}>
            <TextField
              label="Origen"
              fullWidth
              size="small"
              value={origen}
              onChange={e => setOrigen(e.target.value)}
              placeholder="Ej: Bogotá"
            />
            <TextField
              label="Destino"
              fullWidth
              size="small"
              value={destino}
              onChange={e => setDestino(e.target.value)}
              placeholder="Ej: Medellín"
            />
            <TextField
              label="N° Paradas Intermedias"
              fullWidth
              size="small"
              type="number"
              value={nParadas}
              onChange={e => handleNParadasChange(Number(e.target.value))}
              inputProps={{ min: 0, max: 5 }}
              helperText="Máximo 5 paradas"
            />

            {paradas.map((parada, idx) => (
              <TextField
                key={idx}
                label={`Parada ${idx + 1}`}
                fullWidth
                size="small"
                value={parada}
                onChange={e => {
                  const updated = [...paradas]
                  updated[idx] = e.target.value
                  setParadas(updated)
                }}
                placeholder={`Ciudad de parada ${idx + 1}`}
              />
            ))}

            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Vehículo</InputLabel>
              <Select
                label="Tipo de Vehículo"
                value={tipoVehiculo}
                onChange={e => setTipoVehiculo(e.target.value)}
              >
                {TIPO_VEHICULO_OPTIONS.map(t => (
                  <MenuItem key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Peso de Carga (kg)"
              fullWidth
              size="small"
              type="number"
              value={pesoCarga}
              onChange={e => setPesoCarga(e.target.value)}
              placeholder="Ej: 15000"
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<Route />}
              onClick={handleOptimizar}
              disabled={calculando}
              sx={{
                bgcolor: TMS_COLOR,
                '&:hover': { bgcolor: '#025E91' },
                fontWeight: 700,
                py: 1.5,
                mt: 1,
              }}
            >
              {calculando ? 'Calculando...' : 'Optimizar Ruta'}
            </Button>
          </Stack>
        </Paper>
      </Grid>

      {/* Right Panel */}
      <Grid size={{ xs: 12, md: 7 }}>
        {resultado === null ? (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              p: 4,
              height: '100%',
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(TMS_COLOR, 0.02),
            }}
          >
            <Box
              sx={{
                p: 3,
                bgcolor: alpha(TMS_COLOR, 0.08),
                borderRadius: '50%',
                mb: 2,
                display: 'flex',
              }}
            >
              <Route sx={{ fontSize: 48, color: TMS_COLOR, opacity: 0.6 }} />
            </Box>
            <Typography variant="h6" color="text.secondary" textAlign="center" fontWeight={600}>
              Sin resultados aún
            </Typography>
            <Typography variant="body2" color="text.disabled" textAlign="center" mt={1} maxWidth={340}>
              Configure los parámetros y haga clic en "Optimizar Ruta" para ver los resultados de optimización
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2.5}>
                Resultado de Optimización
              </Typography>
              <Grid container spacing={2}>
                {[
                  {
                    label: 'Distancia Total',
                    value: `${resultado.distanciaTotal.toLocaleString('es-CO')} km`,
                    icon: <Speed sx={{ fontSize: 22, color: TMS_COLOR }} />,
                    bg: alpha(TMS_COLOR, 0.08),
                  },
                  {
                    label: 'Tiempo Estimado',
                    value: formatMinutes(resultado.tiempoEstimadoMin),
                    icon: <AccessTime sx={{ fontSize: 22, color: '#7C3AED' }} />,
                    bg: alpha('#7C3AED', 0.08),
                  },
                  {
                    label: 'Costo Combustible',
                    value: formatCOP(resultado.costoCombustible),
                    icon: <LocalGasStation sx={{ fontSize: 22, color: '#D97706' }} />,
                    bg: alpha('#D97706', 0.08),
                  },
                  {
                    label: 'Peajes',
                    value: formatCOP(resultado.peajes),
                    icon: <Toll sx={{ fontSize: 22, color: '#DC2626' }} />,
                    bg: alpha('#DC2626', 0.08),
                  },
                  {
                    label: 'Costo Total',
                    value: formatCOP(resultado.costoTotal),
                    icon: <AttachMoney sx={{ fontSize: 22, color: '#16A34A' }} />,
                    bg: alpha('#16A34A', 0.08),
                  },
                ].map(m => (
                  <Grid key={m.label} size={{ xs: 12, sm: 6 }}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: m.bg,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      {m.icon}
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {m.label}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {m.value}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Rutas Alternativas
              </Typography>
              <Grid container spacing={2}>
                {resultado.alternativas.map((alt, idx) => {
                  const isMain = idx === 0
                  const diffDist = isMain ? null : alt.distanciaKm - resultado.distanciaTotal
                  const diffTiempo = isMain ? null : alt.tiempoMin - resultado.tiempoEstimadoMin
                  const diffCosto = isMain ? null : alt.costoTotal - resultado.costoTotal
                  return (
                    <Grid key={idx} size={{ xs: 12, sm: 4 }}>
                      <Box
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: isMain ? TMS_COLOR : 'divider',
                          borderRadius: 2,
                          bgcolor: isMain ? alpha(TMS_COLOR, 0.04) : 'transparent',
                          height: '100%',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} sx={{ color: isMain ? TMS_COLOR : 'text.secondary' }}>
                          {alt.nombre}
                        </Typography>
                        <Stack spacing={0.5} mt={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Distancia</Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {alt.distanciaKm.toLocaleString('es-CO')} km
                              {diffDist !== null && (
                                <Box component="span" sx={{ ml: 0.5, color: diffDist > 0 ? '#EF4444' : '#22C55E' }}>
                                  ({diffDist > 0 ? '+' : ''}{diffDist})
                                </Box>
                              )}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Tiempo</Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {formatMinutes(alt.tiempoMin)}
                              {diffTiempo !== null && (
                                <Box component="span" sx={{ ml: 0.5, color: diffTiempo > 0 ? '#EF4444' : '#22C55E' }}>
                                  ({diffTiempo > 0 ? '+' : ''}{diffTiempo}m)
                                </Box>
                              )}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Costo</Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {formatCOP(alt.costoTotal)}
                              {diffCosto !== null && (
                                <Box component="span" sx={{ ml: 0.5, color: diffCosto > 0 ? '#EF4444' : '#22C55E' }}>
                                  ({diffCosto > 0 ? '+' : ''}{formatCOP(Math.abs(diffCosto))})
                                </Box>
                              )}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                          {alt.descripcion}
                        </Typography>
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>
            </Paper>
          </Stack>
        )}
      </Grid>
    </Grid>
  )
}

// ─── Tab 3: Análisis ──────────────────────────────────────────────────────────

function TabAnalisis() {
  const sorted = useMemo(
    () => [...MOCK_ANALISIS].sort((a, b) => b.otifRate - a.otifRate),
    [],
  )
  const mejores = sorted.slice(0, 3)
  const peores = sorted.slice(-3).reverse()

  const totalActivas = MOCK_RUTAS.filter(r => r.estado === 'ACTIVA').length
  const otifGlobal = (MOCK_ANALISIS.reduce((acc, r) => acc + r.otifRate, 0) / MOCK_ANALISIS.length).toFixed(1)
  const masEficiente = sorted[0].ruta

  const AnalisisTable = ({
    data,
    highlight,
  }: {
    data: RutaAnalisis[]
    highlight: 'green' | 'orange'
  }) => (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              bgcolor:
                highlight === 'green'
                  ? alpha('#22C55E', 0.12)
                  : alpha('#F97316', 0.12),
            }}
          >
            <TableCell sx={{ fontWeight: 700 }}>Ruta</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">N° Viajes</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">OTIF Rate</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Costo Prom/km</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Tiempo Prom</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={row.ruta}
              sx={{
                bgcolor:
                  idx === 0
                    ? highlight === 'green'
                      ? alpha('#22C55E', 0.06)
                      : alpha('#F97316', 0.06)
                    : 'transparent',
              }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight={idx === 0 ? 700 : 400}>
                  {row.ruta}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{row.nViajes}</Typography>
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                  {highlight === 'green' ? (
                    <TrendingUp sx={{ fontSize: 16, color: '#22C55E' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 16, color: '#F97316' }} />
                  )}
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ color: highlight === 'green' ? '#166534' : '#C2410C' }}
                  >
                    {row.otifRate}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  ${row.costoPromKm.toLocaleString('es-CO')}/km
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatMinutes(row.tiempoPromMin)}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Box>
        <Typography variant="h6" fontWeight={700}>
          Análisis de Rendimiento
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Rendimiento de rutas en los últimos 30 días
        </Typography>
      </Box>

      {/* Mejores Rutas */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            bgcolor: alpha('#22C55E', 0.1),
            border: `1px solid ${alpha('#22C55E', 0.25)}`,
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 2,
          }}
        >
          <TrendingUp sx={{ color: '#16A34A', fontSize: 22 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#166534' }}>
            Mejores Rutas — Top 3 por OTIF
          </Typography>
        </Stack>
        <AnalisisTable data={mejores} highlight="green" />
      </Box>

      {/* Rutas con Oportunidad de Mejora */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            bgcolor: alpha('#F97316', 0.1),
            border: `1px solid ${alpha('#F97316', 0.25)}`,
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 2,
          }}
        >
          <TrendingDown sx={{ color: '#C2410C', fontSize: 22 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#C2410C' }}>
            Rutas con Oportunidad de Mejora — Bajo Rendimiento
          </Typography>
        </Stack>
        <AnalisisTable data={peores} highlight="orange" />
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2}>
        {[
          {
            label: 'Total Rutas Activas',
            value: String(totalActivas),
            sub: 'De 8 rutas registradas',
            color: TMS_COLOR,
            bg: alpha(TMS_COLOR, 0.08),
            icon: <Route sx={{ fontSize: 28, color: TMS_COLOR }} />,
          },
          {
            label: 'Ruta Más Eficiente',
            value: masEficiente.split(' ')[0],
            sub: masEficiente,
            color: '#16A34A',
            bg: alpha('#22C55E', 0.08),
            icon: <TrendingUp sx={{ fontSize: 28, color: '#16A34A' }} />,
          },
          {
            label: 'OTIF Promedio Global',
            value: `${otifGlobal}%`,
            sub: 'Promedio de todas las rutas',
            color: '#7C3AED',
            bg: alpha('#7C3AED', 0.08),
            icon: <Timeline sx={{ fontSize: 28, color: '#7C3AED' }} />,
          },
        ].map(stat => (
          <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: 2.5,
                bgcolor: stat.bg,
                borderColor: alpha(stat.color, 0.2),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: stat.color }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.sub}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TMSRutas() {
  const [tab, setTab] = useState(0)
  const [rutas, setRutas] = useState<Ruta[]>(MOCK_RUTAS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null)

  const handleNew = () => {
    setEditingRuta(null)
    setDialogOpen(true)
  }

  const handleEdit = (ruta: Ruta) => {
    setEditingRuta(ruta)
    setDialogOpen(true)
  }

  const handleToggleEstado = (id: number) => {
    setRutas(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, estado: r.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA' }
          : r,
      ),
    )
    const ruta = rutas.find(r => r.id === id)
    if (ruta) {
      const newEstado = ruta.estado === 'ACTIVA' ? 'Inactiva' : 'Activa'
      toast.success(`Ruta ${ruta.codigo} marcada como ${newEstado}`)
    }
  }

  const handleSave = (saved: Ruta) => {
    setRutas(prev => {
      const exists = prev.find(r => r.id === saved.id)
      if (exists) {
        toast.success(`Ruta ${saved.codigo} actualizada`)
        return prev.map(r => (r.id === saved.id ? saved : r))
      } else {
        toast.success(`Ruta ${saved.codigo} creada exitosamente`)
        return [...prev, saved]
      }
    })
    setDialogOpen(false)
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box
            sx={{
              p: 1.5,
              bgcolor: alpha(TMS_COLOR, 0.1),
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Route sx={{ color: TMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              Gestión de Rutas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administración y optimización de rutas de transporte
            </Typography>
          </Box>
        </Stack>

        {/* KPI Cards */}
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'Rutas Activas',
              value: rutas.filter(r => r.estado === 'ACTIVA').length,
              suffix: '',
              icon: <CheckCircle sx={{ fontSize: 24, color: '#16A34A' }} />,
              bg: alpha('#22C55E', 0.08),
              borderColor: alpha('#22C55E', 0.2),
            },
            {
              label: 'Total Rutas',
              value: rutas.length,
              suffix: '',
              icon: <Route sx={{ fontSize: 24, color: TMS_COLOR }} />,
              bg: alpha(TMS_COLOR, 0.08),
              borderColor: alpha(TMS_COLOR, 0.2),
            },
            {
              label: 'Km Promedio',
              value: Math.round(rutas.reduce((s, r) => s + r.distanciaKm, 0) / rutas.length),
              suffix: ' km',
              icon: <Speed sx={{ fontSize: 24, color: '#7C3AED' }} />,
              bg: alpha('#7C3AED', 0.08),
              borderColor: alpha('#7C3AED', 0.2),
            },
            {
              label: 'Costo Prom. Referencia',
              value: Math.round(rutas.reduce((s, r) => s + r.costoReferencia, 0) / rutas.length),
              suffix: '',
              prefix: '$',
              icon: <AttachMoney sx={{ fontSize: 24, color: '#D97706' }} />,
              bg: alpha('#D97706', 0.08),
              borderColor: alpha('#D97706', 0.2),
            },
          ].map(kpi => (
            <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  p: 2,
                  bgcolor: kpi.bg,
                  borderColor: kpi.borderColor,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {kpi.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} mt={0.5}>
                      {kpi.prefix ?? ''}{typeof kpi.value === 'number' && kpi.prefix === '$'
                        ? kpi.value.toLocaleString('es-CO')
                        : kpi.value}{kpi.suffix}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1.5, boxShadow: 1 }}>
                    {kpi.icon}
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              px: 2,
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14 },
              '& .Mui-selected': { color: TMS_COLOR },
              '& .MuiTabs-indicator': { bgcolor: TMS_COLOR },
            }}
          >
            <Tab label="Rutas Registradas" icon={<Route />} iconPosition="start" />
            <Tab label="Optimizador" icon={<MapOutlined />} iconPosition="start" />
            <Tab label="Análisis" icon={<Timeline />} iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <TabRutasRegistradas
                rutas={rutas}
                onEdit={handleEdit}
                onToggleEstado={handleToggleEstado}
                onNew={handleNew}
              />
            )}
            {tab === 1 && <TabOptimizador />}
            {tab === 2 && <TabAnalisis />}
          </Box>
        </Paper>
      </Box>

      <RutaDialog
        open={dialogOpen}
        ruta={editingRuta}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </Layout>
  )
}
