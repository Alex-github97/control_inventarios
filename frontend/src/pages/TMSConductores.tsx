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
  Paper,
  Divider,
  alpha,
  Alert,
  Avatar,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Search,
  PersonOutline,
  DirectionsCar,
  Close,
  Warning,
  CalendarToday,
  Phone,
  LocationOn,
  Assignment,
  OpenInNew,
  CheckCircle,
  ErrorOutline,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const TMS_COLOR = '#0369A1'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conductor {
  id: number
  codigo: string
  nombre: string
  cedula: string
  tipoLicencia: 'A1' | 'A2' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3'
  vencimientoLicencia: string // ISO date string
  estadoLaboral: 'DISPONIBLE' | 'EN_RUTA' | 'DESCANSANDO'
  aniosExperiencia: number
  ultimoViajeCodigo: string
  ultimoViajesFecha: string
  telefono: string
  ciudad: string
  viajeActual?: string // trip code if EN_RUTA
}

interface ViajeDisponible {
  id: number
  codigo: string
  origen: string
  destino: string
  fechaSalida: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CONDUCTORES: Conductor[] = [
  {
    id: 1,
    codigo: 'EMP-001',
    nombre: 'Carlos Andrés Morales',
    cedula: '12345678',
    tipoLicencia: 'C2',
    vencimientoLicencia: '2026-07-15',
    estadoLaboral: 'DISPONIBLE',
    aniosExperiencia: 8,
    ultimoViajeCodigo: 'VJ-2024-081',
    ultimoViajesFecha: '2024-12-10',
    telefono: '310 555 0101',
    ciudad: 'Bogotá',
  },
  {
    id: 2,
    codigo: 'EMP-002',
    nombre: 'María Fernanda López',
    cedula: '87654321',
    tipoLicencia: 'C3',
    vencimientoLicencia: '2027-03-20',
    estadoLaboral: 'EN_RUTA',
    aniosExperiencia: 12,
    ultimoViajeCodigo: 'VJ-2024-089',
    ultimoViajesFecha: '2024-12-15',
    telefono: '315 555 0202',
    ciudad: 'Medellín',
    viajeActual: 'VJ-2024-089',
  },
  {
    id: 3,
    codigo: 'EMP-003',
    nombre: 'Jorge Hernández',
    cedula: '23456789',
    tipoLicencia: 'C2',
    vencimientoLicencia: '2026-06-25',
    estadoLaboral: 'DISPONIBLE',
    aniosExperiencia: 5,
    ultimoViajeCodigo: 'VJ-2024-075',
    ultimoViajesFecha: '2024-12-08',
    telefono: '312 555 0303',
    ciudad: 'Cali',
  },
  {
    id: 4,
    codigo: 'EMP-004',
    nombre: 'Luis Eduardo Vargas',
    cedula: '34567890',
    tipoLicencia: 'B3',
    vencimientoLicencia: '2026-12-10',
    estadoLaboral: 'DESCANSANDO',
    aniosExperiencia: 3,
    ultimoViajeCodigo: 'VJ-2024-083',
    ultimoViajesFecha: '2024-12-13',
    telefono: '317 555 0404',
    ciudad: 'Barranquilla',
  },
  {
    id: 5,
    codigo: 'EMP-005',
    nombre: 'Ana Patricia Gómez',
    cedula: '45678901',
    tipoLicencia: 'C1',
    vencimientoLicencia: '2027-01-15',
    estadoLaboral: 'DISPONIBLE',
    aniosExperiencia: 7,
    ultimoViajeCodigo: 'VJ-2024-079',
    ultimoViajesFecha: '2024-12-11',
    telefono: '318 555 0505',
    ciudad: 'Bucaramanga',
  },
  {
    id: 6,
    codigo: 'EMP-006',
    nombre: 'Ricardo Peña Torres',
    cedula: '56789012',
    tipoLicencia: 'C3',
    vencimientoLicencia: '2026-07-01',
    estadoLaboral: 'EN_RUTA',
    aniosExperiencia: 15,
    ultimoViajeCodigo: 'VJ-2024-092',
    ultimoViajesFecha: '2024-12-16',
    telefono: '314 555 0606',
    ciudad: 'Cartagena',
    viajeActual: 'VJ-2024-092',
  },
  {
    id: 7,
    codigo: 'EMP-007',
    nombre: 'Sandra Milena Castro',
    cedula: '67890123',
    tipoLicencia: 'B2',
    vencimientoLicencia: '2027-06-30',
    estadoLaboral: 'DISPONIBLE',
    aniosExperiencia: 4,
    ultimoViajeCodigo: 'VJ-2024-070',
    ultimoViajesFecha: '2024-12-07',
    telefono: '311 555 0707',
    ciudad: 'Bogotá',
  },
  {
    id: 8,
    codigo: 'EMP-008',
    nombre: 'Fabio Augusto Ríos',
    cedula: '78901234',
    tipoLicencia: 'C2',
    vencimientoLicencia: '2026-08-22',
    estadoLaboral: 'EN_RUTA',
    aniosExperiencia: 9,
    ultimoViajeCodigo: 'VJ-2024-095',
    ultimoViajesFecha: '2024-12-17',
    telefono: '316 555 0808',
    ciudad: 'Medellín',
    viajeActual: 'VJ-2024-095',
  },
  {
    id: 9,
    codigo: 'EMP-009',
    nombre: 'Carmen Rosa Salinas',
    cedula: '89012345',
    tipoLicencia: 'C1',
    vencimientoLicencia: '2026-09-14',
    estadoLaboral: 'DESCANSANDO',
    aniosExperiencia: 6,
    ultimoViajeCodigo: 'VJ-2024-086',
    ultimoViajesFecha: '2024-12-14',
    telefono: '313 555 0909',
    ciudad: 'Cali',
  },
  {
    id: 10,
    codigo: 'EMP-010',
    nombre: 'Héctor Manuel Díaz',
    cedula: '90123456',
    tipoLicencia: 'C3',
    vencimientoLicencia: '2026-06-28',
    estadoLaboral: 'DISPONIBLE',
    aniosExperiencia: 20,
    ultimoViajeCodigo: 'VJ-2024-066',
    ultimoViajesFecha: '2024-12-05',
    telefono: '319 555 1010',
    ciudad: 'Bogotá',
  },
]

const MOCK_VIAJES: ViajeDisponible[] = [
  { id: 1, codigo: 'VJ-2024-101', origen: 'Bogotá', destino: 'Medellín', fechaSalida: '2024-12-20' },
  { id: 2, codigo: 'VJ-2024-102', origen: 'Medellín', destino: 'Cali', fechaSalida: '2024-12-21' },
  { id: 3, codigo: 'VJ-2024-103', origen: 'Bogotá', destino: 'Barranquilla', fechaSalida: '2024-12-22' },
  { id: 4, codigo: 'VJ-2024-104', origen: 'Cali', destino: 'Cartagena', fechaSalida: '2024-12-23' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-06-20')

function diasHastaVencimiento(isoDate: string): number {
  const target = new Date(isoDate)
  const diff = target.getTime() - TODAY.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function estadoLaboralConfig(estado: Conductor['estadoLaboral']) {
  switch (estado) {
    case 'DISPONIBLE':
      return { label: 'Disponible', color: '#16a34a', bg: alpha('#16a34a', 0.12) }
    case 'EN_RUTA':
      return { label: 'En Ruta', color: TMS_COLOR, bg: alpha(TMS_COLOR, 0.12) }
    case 'DESCANSANDO':
      return { label: 'Descansando', color: '#9ca3af', bg: alpha('#9ca3af', 0.15) }
  }
}

function licenciaExpiryBadge(isoDate: string): { label: string; color: string; bg: string } | null {
  const dias = diasHastaVencimiento(isoDate)
  if (dias < 0) return { label: 'Vencida', color: '#dc2626', bg: alpha('#dc2626', 0.15) }
  if (dias < 30) return { label: 'Vence pronto', color: '#dc2626', bg: alpha('#dc2626', 0.12) }
  if (dias < 60) return { label: 'Por vencer', color: '#d97706', bg: alpha('#d97706', 0.12) }
  return null
}

function diasRestsChipColor(dias: number): { color: string; bg: string } {
  if (dias < 0) return { color: '#dc2626', bg: alpha('#dc2626', 0.12) }
  if (dias < 7) return { color: '#dc2626', bg: alpha('#dc2626', 0.12) }
  if (dias < 30) return { color: '#d97706', bg: alpha('#d97706', 0.12) }
  return { color: '#ca8a04', bg: alpha('#ca8a04', 0.12) }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <Card
      sx={{
        flex: 1,
        minWidth: 150,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: alpha(color, 0.25),
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: '14px 18px !important' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: alpha(color, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color, fontWeight: 800, lineHeight: 1.1 }}>
              {value}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Dialog: Asignar a Viaje ──────────────────────────────────────────────────

function AsignarViajeDialog({
  conductor,
  open,
  onClose,
  onConfirm,
}: {
  conductor: Conductor | null
  open: boolean
  onClose: () => void
  onConfirm: (conductorId: number, viajeCodigo: string) => void
}) {
  const [viajeSeleccionado, setViajeSeleccionado] = useState<string>('')

  React.useEffect(() => {
    if (open) setViajeSeleccionado('')
  }, [open])

  if (!conductor) return null

  const estadoConfig = estadoLaboralConfig(conductor.estadoLaboral)

  function handleConfirm() {
    if (!viajeSeleccionado) {
      toast.error('Seleccione un viaje disponible')
      return
    }
    onConfirm(conductor.id, viajeSeleccionado)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: '#E5E7EB',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ color: '#1E293B', pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: alpha(TMS_COLOR, 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Assignment sx={{ color: TMS_COLOR, fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>
              Asignar a Viaje
            </Typography>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: '#64748B' }}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {/* Driver info summary */}
        <Box
          sx={{
            bgcolor: '#F8FAFC',
            border: '1px solid',
            borderColor: '#E5E7EB',
            borderRadius: 2,
            p: 2,
            mb: 3,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: TMS_COLOR,
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {getInitials(conductor.nombre)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ color: '#1E293B', fontWeight: 700 }}>
                {conductor.nombre}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={0.4}>
                <Chip
                  label={`Cat. ${conductor.tipoLicencia}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, color: '#64748B', borderColor: '#E5E7EB', height: 20 }}
                />
                <Chip
                  label={estadoConfig.label}
                  size="small"
                  sx={{ bgcolor: estadoConfig.bg, color: estadoConfig.color, fontWeight: 700, fontSize: 10, height: 20 }}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Trip selector */}
        <FormControl fullWidth size="small">
          <InputLabel>Seleccionar Viaje Disponible</InputLabel>
          <Select
            value={viajeSeleccionado}
            label="Seleccionar Viaje Disponible"
            onChange={(e) => setViajeSeleccionado(e.target.value)}
          >
            {MOCK_VIAJES.map((v) => (
              <MenuItem key={v.id} value={v.codigo} sx={{ fontSize: 13, py: 1.2 }}>
                <Stack>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: TMS_COLOR, fontSize: 13 }}>
                    {v.codigo}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                    {v.origen} → {v.destino} · Salida: {v.fechaSalida}
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{
            color: '#64748B',
            borderColor: '#E5E7EB',
            '&:hover': { borderColor: '#64748B', bgcolor: '#F8FAFC' },
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleConfirm}
          sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284c7' }, fontWeight: 700 }}
        >
          Confirmar Asignación
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Driver Card ──────────────────────────────────────────────────────────────

function ConductorCard({
  conductor,
  onAsignar,
}: {
  conductor: Conductor
  onAsignar: (c: Conductor) => void
}) {
  const estadoConfig = estadoLaboralConfig(conductor.estadoLaboral)
  const expBadge = licenciaExpiryBadge(conductor.vencimientoLicencia)
  const diasRestantes = diasHastaVencimiento(conductor.vencimientoLicencia)

  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: '#E5E7EB',
        borderRadius: 2.5,
        height: '100%',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: alpha(TMS_COLOR, 0.35) },
      }}
    >
      <CardContent sx={{ p: '20px !important' }}>
        {/* Avatar + name */}
        <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: TMS_COLOR,
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {getInitials(conductor.nombre)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                color: '#1E293B',
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {conductor.nombre}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              {conductor.codigo} · CC {conductor.cedula}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.8} mt={0.8} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Cat. ${conductor.tipoLicencia}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: 10,
                  height: 20,
                  color: TMS_COLOR,
                  borderColor: alpha(TMS_COLOR, 0.4),
                }}
              />
              <Chip
                label={estadoConfig.label}
                size="small"
                sx={{
                  bgcolor: estadoConfig.bg,
                  color: estadoConfig.color,
                  fontWeight: 700,
                  fontSize: 10,
                  height: 20,
                }}
              />
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: '#E5E7EB', mb: 1.5 }} />

        {/* Details */}
        <Stack spacing={1} mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DirectionsCar sx={{ fontSize: 14, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              {conductor.aniosExperiencia} años de experiencia
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <LocationOn sx={{ fontSize: 14, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              {conductor.ciudad}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Phone sx={{ fontSize: 14, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              {conductor.telefono}
            </Typography>
          </Stack>

          {/* License expiry */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarToday sx={{ fontSize: 14, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              Licencia vence: {conductor.vencimientoLicencia}
            </Typography>
            {expBadge && (
              <Chip
                label={expBadge.label}
                size="small"
                sx={{ bgcolor: expBadge.bg, color: expBadge.color, fontWeight: 700, fontSize: 9, height: 18, ml: 0.5 }}
              />
            )}
          </Stack>

          {/* Last trip */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Assignment sx={{ fontSize: 14, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              Último viaje:{' '}
              <Box component="span" sx={{ color: TMS_COLOR, fontWeight: 600 }}>
                {conductor.ultimoViajeCodigo}
              </Box>{' '}
              · {conductor.ultimoViajesFecha}
            </Typography>
          </Stack>

          {/* Current trip if EN_RUTA */}
          {conductor.viajeActual && (
            <Box
              sx={{
                bgcolor: alpha(TMS_COLOR, 0.08),
                border: '1px solid',
                borderColor: alpha(TMS_COLOR, 0.2),
                borderRadius: 1.5,
                px: 1.2,
                py: 0.6,
              }}
            >
              <Typography variant="caption" sx={{ color: TMS_COLOR, fontWeight: 700, fontSize: 11 }}>
                En viaje: {conductor.viajeActual}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={1} mt={2}>
          <Button
            variant="contained"
            size="small"
            fullWidth
            disabled={conductor.estadoLaboral === 'EN_RUTA'}
            onClick={() => onAsignar(conductor)}
            sx={{
              bgcolor: TMS_COLOR,
              '&:hover': { bgcolor: '#0284c7' },
              '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#94A3B8' },
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            Asignar a Viaje
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            endIcon={<OpenInNew sx={{ fontSize: 12 }} />}
            sx={{
              color: '#64748B',
              borderColor: '#E5E7EB',
              '&:hover': { borderColor: '#64748B', bgcolor: '#F8FAFC' },
              fontSize: 11,
            }}
          >
            Ver Perfil HCM
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TMSConductores() {
  const [conductores, setConductores] = useState<Conductor[]>(MOCK_CONDUCTORES)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<Conductor['estadoLaboral'] | ''>('')

  const [asignarOpen, setAsignarOpen] = useState(false)
  const [conductorSeleccionado, setConductorSeleccionado] = useState<Conductor | null>(null)

  // Filtered list
  const filtered = useMemo(() => {
    return conductores.filter((c) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.cedula.includes(q)
      const matchEstado = !filterEstado || c.estadoLaboral === filterEstado
      return matchSearch && matchEstado
    })
  }, [conductores, search, filterEstado])

  // KPIs
  const kpis = useMemo(
    () => ({
      total: conductores.length,
      enRuta: conductores.filter((c) => c.estadoLaboral === 'EN_RUTA').length,
      disponibles: conductores.filter((c) => c.estadoLaboral === 'DISPONIBLE').length,
    }),
    [conductores]
  )

  // Drivers with documents expiring soon (< 60 days)
  const alertasDocumentos = useMemo(() => {
    return conductores
      .map((c) => ({
        conductor: c,
        dias: diasHastaVencimiento(c.vencimientoLicencia),
      }))
      .filter(({ dias }) => dias < 60)
      .sort((a, b) => a.dias - b.dias)
  }, [conductores])

  function handleAsignar(conductor: Conductor) {
    setConductorSeleccionado(conductor)
    setAsignarOpen(true)
  }

  function handleConfirmarAsignacion(conductorId: number, viajeCodigo: string) {
    setConductores((prev) =>
      prev.map((c) =>
        c.id === conductorId
          ? { ...c, estadoLaboral: 'EN_RUTA', viajeActual: viajeCodigo }
          : c
      )
    )
    toast.success(`Conductor asignado al viaje ${viajeCodigo} exitosamente`)
    setAsignarOpen(false)
  }

  return (
    <Layout>
      <Box sx={{ minHeight: '100%', bgcolor: '#F0F2F5', p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.3}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: alpha(TMS_COLOR, 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PersonOutline sx={{ color: TMS_COLOR, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
                  Conductores TMS
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                  TMS — Gestión de Conductores · Integrado con HCM
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>

        {/* Info Alert */}
        <Alert
          severity="info"
          sx={{
            mb: 3,
            bgcolor: alpha('#0ea5e9', 0.08),
            border: '1px solid',
            borderColor: alpha('#0ea5e9', 0.25),
            color: '#0369A1',
            '& .MuiAlert-icon': { color: '#0284c7' },
            fontSize: 13,
          }}
        >
          Los conductores TMS provienen del módulo de Gestión Humana (HCM). Solo se muestran colaboradores con
          categoría <strong>Conductor</strong>.
        </Alert>

        {/* KPIs */}
        <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap>
          <KPICard
            label="Conductores Activos"
            value={kpis.total}
            color={TMS_COLOR}
            icon={<PersonOutline sx={{ fontSize: 20 }} />}
          />
          <KPICard
            label="En Ruta"
            value={kpis.enRuta}
            color="#2563eb"
            icon={<DirectionsCar sx={{ fontSize: 20 }} />}
          />
          <KPICard
            label="Disponibles"
            value={kpis.disponibles}
            color="#16a34a"
            icon={<CheckCircle sx={{ fontSize: 20 }} />}
          />
        </Stack>

        {/* Toolbar */}
        <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: '#64748B' }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Estado Laboral</InputLabel>
            <Select
              value={filterEstado}
              label="Estado Laboral"
              onChange={(e) => setFilterEstado(e.target.value as Conductor['estadoLaboral'] | '')}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Todos los estados
              </MenuItem>
              <MenuItem value="DISPONIBLE" sx={{ fontSize: 13 }}>
                Disponible
              </MenuItem>
              <MenuItem value="EN_RUTA" sx={{ fontSize: 13 }}>
                En Ruta
              </MenuItem>
              <MenuItem value="DESCANSANDO" sx={{ fontSize: 13 }}>
                Descansando
              </MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
            {filtered.length} de {conductores.length} conductores
          </Typography>
        </Stack>

        {/* Driver Cards Grid */}
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              No se encontraron conductores con los filtros aplicados
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2} mb={4}>
            {filtered.map((conductor) => (
              <Grid key={conductor.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ConductorCard conductor={conductor} onAsignar={handleAsignar} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Alertas de Documentos Section */}
        <Box mt={2}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: alpha('#d97706', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Warning sx={{ color: '#d97706', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
                Alertas de Documentos
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                Conductores con licencia próxima a vencer (menos de 60 días)
              </Typography>
            </Box>
          </Stack>

          {alertasDocumentos.length === 0 ? (
            <Box
              sx={{
                bgcolor: alpha('#16a34a', 0.06),
                border: '1px solid',
                borderColor: alpha('#16a34a', 0.2),
                borderRadius: 2,
                p: 2.5,
                textAlign: 'center',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                  Todos los documentos están en regla
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Paper
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: '#E5E7EB',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['Conductor', 'Documento', 'Fecha Vencimiento', 'Días Restantes', 'Estado'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            color: '#64748B',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            borderBottom: `1px solid #E5E7EB`,
                            py: 1.2,
                            px: 2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertasDocumentos.map(({ conductor, dias }) => {
                      const chipColors = diasRestsChipColor(dias)
                      const estadoLabel =
                        dias < 0
                          ? 'Vencida'
                          : dias < 7
                          ? 'Crítico'
                          : dias < 30
                          ? 'Urgente'
                          : 'Por Vencer'

                      return (
                        <TableRow
                          key={conductor.id}
                          sx={{
                            '&:hover': { bgcolor: '#F8FAFC' },
                            '&:last-child td': { borderBottom: 'none' },
                          }}
                        >
                          <TableCell
                            sx={{
                              borderBottom: `1px solid #E5E7EB`,
                              px: 2,
                              py: 1.2,
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1.2}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: alpha(TMS_COLOR, 0.25),
                                  color: TMS_COLOR,
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(conductor.nombre)}
                              </Avatar>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: '#1E293B', fontWeight: 600, fontSize: 12 }}
                                >
                                  {conductor.nombre}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>
                                  {conductor.codigo}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{
                              color: '#334155',
                              fontSize: 12,
                              borderBottom: `1px solid #E5E7EB`,
                              px: 2,
                              py: 1.2,
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <DirectionsCar sx={{ fontSize: 13, color: '#6b7280' }} />
                              <span>Licencia de Conducción Cat. {conductor.tipoLicencia}</span>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{
                              color: '#64748B',
                              fontSize: 12,
                              borderBottom: `1px solid #E5E7EB`,
                              px: 2,
                              py: 1.2,
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <CalendarToday sx={{ fontSize: 12, color: '#6b7280' }} />
                              <span>{conductor.vencimientoLicencia}</span>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{
                              borderBottom: `1px solid #E5E7EB`,
                              px: 2,
                              py: 1.2,
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              {dias < 0 ? (
                                <ErrorOutline sx={{ fontSize: 14, color: '#dc2626' }} />
                              ) : (
                                <Warning sx={{ fontSize: 14, color: chipColors.color }} />
                              )}
                              <Typography
                                variant="body2"
                                sx={{ color: chipColors.color, fontWeight: 700, fontSize: 12 }}
                              >
                                {dias < 0 ? `Vencida hace ${Math.abs(dias)}d` : `${dias} días`}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{
                              borderBottom: `1px solid #E5E7EB`,
                              px: 2,
                              py: 1.2,
                            }}
                          >
                            <Chip
                              label={estadoLabel}
                              size="small"
                              sx={{
                                bgcolor: chipColors.bg,
                                color: chipColors.color,
                                fontWeight: 700,
                                fontSize: 10,
                                height: 22,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>

        {/* Assign Dialog */}
        <AsignarViajeDialog
          conductor={conductorSeleccionado}
          open={asignarOpen}
          onClose={() => setAsignarOpen(false)}
          onConfirm={handleConfirmarAsignacion}
        />
      </Box>
    </Layout>
  )
}
