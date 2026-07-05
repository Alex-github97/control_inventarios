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
  Grid,
  Divider,
  alpha,
  Tooltip,
} from '@mui/material'
import {
  Search,
  Add,
  LocalShipping,
  Visibility,
  Edit,
  SwapHoriz,
  Close,
  DirectionsCar,
  Build,
  Description,
  History,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  FiberManualRecord,
  CalendarToday,
  Assignment,
  Speed,
  ScaleOutlined,
  Business,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

const TMS_COLOR = '#0369A1'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoVehiculo =
  | 'MOTOCICLETA'
  | 'AUTOMOVIL'
  | 'CAMIONETA'
  | 'VAN'
  | 'CAMION_SENCILLO'
  | 'DOBLE_TROQUE'
  | 'TRACTOCAMION'
  | 'REMOLQUE'
  | 'SEMIRREMOLQUE'
  | 'CARROTANQUE'
  | 'REFRIGERADO'
  | 'PLATAFORMA'
  | 'PORTACONTENEDOR'

type TipoCarroceria =
  | 'FURGON'
  | 'ESTACAS'
  | 'VOLCO'
  | 'CISTERNA'
  | 'REFRIGERADA'
  | 'PLATAFORMA'
  | 'CONTENEDOR'
  | 'ESPECIAL'

type EstadoOperativo =
  | 'DISPONIBLE'
  | 'EN_VIAJE'
  | 'EN_MANTENIMIENTO'
  | 'FUERA_SERVICIO'

interface ViajeHistorico {
  codigo: string
  origen: string
  destino: string
  fecha: string
  estado: 'COMPLETADO' | 'EN_CURSO' | 'CANCELADO'
  conductor: string
}

interface Documento {
  tipo: string
  numero: string
  vencimiento: string
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO'
}

interface Vehiculo {
  id: number
  placa: string
  tipoVehiculo: TipoVehiculo
  tipoCarroceria: TipoCarroceria
  marca: string
  modelo: string
  anio: number
  configuracion: string
  capacidadKg: number
  volumenM3: number
  numEjes: number
  pesoBrutoKg: number
  empresa: string
  estadoOperativo: EstadoOperativo
  viajesHistorico: ViajeHistorico[]
  documentos: Documento[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_VEHICULO: TipoVehiculo[] = [
  'MOTOCICLETA', 'AUTOMOVIL', 'CAMIONETA', 'VAN', 'CAMION_SENCILLO',
  'DOBLE_TROQUE', 'TRACTOCAMION', 'REMOLQUE', 'SEMIRREMOLQUE',
  'CARROTANQUE', 'REFRIGERADO', 'PLATAFORMA', 'PORTACONTENEDOR',
]

const TIPOS_CARROCERIA: TipoCarroceria[] = [
  'FURGON', 'ESTACAS', 'VOLCO', 'CISTERNA', 'REFRIGERADA', 'PLATAFORMA', 'CONTENEDOR', 'ESPECIAL',
]

const ESTADOS_OPERATIVOS: EstadoOperativo[] = [
  'DISPONIBLE', 'EN_VIAJE', 'EN_MANTENIMIENTO', 'FUERA_SERVICIO',
]

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_VEHICULOS: Vehiculo[] = [
  {
    id: 1, placa: 'SDT-492', tipoVehiculo: 'TRACTOCAMION', tipoCarroceria: 'FURGON',
    marca: 'Kenworth', modelo: 'T800', anio: 2021, configuracion: '6x4',
    capacidadKg: 34000, volumenM3: 92, numEjes: 3, pesoBrutoKg: 48000,
    empresa: 'ICOLTRANS S.A.S', estadoOperativo: 'EN_VIAJE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0841', origen: 'Bogotá', destino: 'Barranquilla', fecha: '2025-06-19', estado: 'EN_CURSO', conductor: 'Carlos Herrera' },
      { codigo: 'VJ-2025-0812', origen: 'Medellín', destino: 'Bogotá', fecha: '2025-06-15', estado: 'COMPLETADO', conductor: 'Carlos Herrera' },
      { codigo: 'VJ-2025-0798', origen: 'Bogotá', destino: 'Cali', fecha: '2025-06-10', estado: 'COMPLETADO', conductor: 'Carlos Herrera' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-112233', vencimiento: '2025-12-31', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-55441', vencimiento: '2025-11-30', estado: 'VIGENTE' },
      { tipo: 'Seguro de Responsabilidad Civil', numero: 'SRC-2025-9981', vencimiento: '2025-08-15', estado: 'POR_VENCER' },
    ],
  },
  {
    id: 2, placa: 'TXB-117', tipoVehiculo: 'REFRIGERADO', tipoCarroceria: 'REFRIGERADA',
    marca: 'Freightliner', modelo: 'Cascadia', anio: 2022, configuracion: '4x2',
    capacidadKg: 18000, volumenM3: 58, numEjes: 2, pesoBrutoKg: 28000,
    empresa: 'LogiFrío Colombia', estadoOperativo: 'EN_VIAJE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0842', origen: 'Medellín', destino: 'Cali', fecha: '2025-06-19', estado: 'EN_CURSO', conductor: 'María López' },
      { codigo: 'VJ-2025-0810', origen: 'Bogotá', destino: 'Bucaramanga', fecha: '2025-06-14', estado: 'COMPLETADO', conductor: 'María López' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-223344', vencimiento: '2025-10-30', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-66552', vencimiento: '2026-03-15', estado: 'VIGENTE' },
      { tipo: 'Permiso Sanitario', numero: 'PS-2025-4421', vencimiento: '2025-09-01', estado: 'POR_VENCER' },
    ],
  },
  {
    id: 3, placa: 'VGH-853', tipoVehiculo: 'DOBLE_TROQUE', tipoCarroceria: 'ESTACAS',
    marca: 'Volkswagen', modelo: 'Constellation 19.360', anio: 2020, configuracion: '6x2',
    capacidadKg: 26000, volumenM3: 68, numEjes: 3, pesoBrutoKg: 40000,
    empresa: 'ICOLTRANS S.A.S', estadoOperativo: 'EN_VIAJE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0843', origen: 'Cali', destino: 'Bogotá', fecha: '2025-06-19', estado: 'EN_CURSO', conductor: 'Jhon Ríos' },
      { codigo: 'VJ-2025-0799', origen: 'Barranquilla', destino: 'Bogotá', fecha: '2025-06-12', estado: 'COMPLETADO', conductor: 'Jhon Ríos' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-334455', vencimiento: '2025-07-31', estado: 'POR_VENCER' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-77663', vencimiento: '2025-06-30', estado: 'VENCIDO' },
    ],
  },
  {
    id: 4, placa: 'PLM-201', tipoVehiculo: 'TRACTOCAMION', tipoCarroceria: 'CONTENEDOR',
    marca: 'International', modelo: 'LT 625', anio: 2023, configuracion: '6x4',
    capacidadKg: 36000, volumenM3: 96, numEjes: 3, pesoBrutoKg: 52000,
    empresa: 'Transportes Alianza', estadoOperativo: 'EN_VIAJE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0844', origen: 'Bogotá', destino: 'Cartagena', fecha: '2025-06-19', estado: 'EN_CURSO', conductor: 'Luz Moreno' },
      { codigo: 'VJ-2025-0821', origen: 'Bucaramanga', destino: 'Bogotá', fecha: '2025-06-17', estado: 'COMPLETADO', conductor: 'Luz Moreno' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-445566', vencimiento: '2026-01-31', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-88774', vencimiento: '2026-05-20', estado: 'VIGENTE' },
      { tipo: 'Seguro de Carga', numero: 'SC-2025-7751', vencimiento: '2026-02-28', estado: 'VIGENTE' },
    ],
  },
  {
    id: 5, placa: 'RTQ-664', tipoVehiculo: 'REFRIGERADO', tipoCarroceria: 'REFRIGERADA',
    marca: 'Mercedes-Benz', modelo: 'Actros 2546', anio: 2022, configuracion: '4x2',
    capacidadKg: 20000, volumenM3: 62, numEjes: 2, pesoBrutoKg: 30000,
    empresa: 'LogiFrío Colombia', estadoOperativo: 'EN_VIAJE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0845', origen: 'Barranquilla', destino: 'Medellín', fecha: '2025-06-19', estado: 'EN_CURSO', conductor: 'Andrés Castro' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-556677', vencimiento: '2025-12-15', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-99885', vencimiento: '2026-04-10', estado: 'VIGENTE' },
      { tipo: 'Permiso Sanitario', numero: 'PS-2025-5532', vencimiento: '2025-12-01', estado: 'VIGENTE' },
    ],
  },
  {
    id: 6, placa: 'GKP-385', tipoVehiculo: 'CAMION_SENCILLO', tipoCarroceria: 'FURGON',
    marca: 'Chevrolet', modelo: 'NHR 2.8', anio: 2021, configuracion: '4x2',
    capacidadKg: 5500, volumenM3: 22, numEjes: 2, pesoBrutoKg: 8500,
    empresa: 'ICOLTRANS S.A.S', estadoOperativo: 'EN_VIAJE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0846', origen: 'Bucaramanga', destino: 'Cali', fecha: '2025-06-19', estado: 'EN_CURSO', conductor: 'Ricardo Suárez' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-667788', vencimiento: '2025-11-30', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-11006', vencimiento: '2025-09-30', estado: 'VIGENTE' },
    ],
  },
  {
    id: 7, placa: 'BTK-920', tipoVehiculo: 'TRACTOCAMION', tipoCarroceria: 'PLATAFORMA',
    marca: 'Kenworth', modelo: 'T660', anio: 2019, configuracion: '6x4',
    capacidadKg: 32000, volumenM3: 0, numEjes: 3, pesoBrutoKg: 46000,
    empresa: 'Transportes Alianza', estadoOperativo: 'DISPONIBLE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0831', origen: 'Bogotá', destino: 'Bucaramanga', fecha: '2025-06-18', estado: 'COMPLETADO', conductor: 'Pedro Vargas' },
      { codigo: 'VJ-2025-0822', origen: 'Medellín', destino: 'Barranquilla', fecha: '2025-06-16', estado: 'COMPLETADO', conductor: 'Pedro Vargas' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-778899', vencimiento: '2025-09-30', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-22117', vencimiento: '2026-01-15', estado: 'VIGENTE' },
      { tipo: 'Seguro de Responsabilidad Civil', numero: 'SRC-2025-8872', vencimiento: '2025-12-31', estado: 'VIGENTE' },
    ],
  },
  {
    id: 8, placa: 'HMQ-555', tipoVehiculo: 'CAMIONETA', tipoCarroceria: 'ESTACAS',
    marca: 'Ford', modelo: 'F-350 Super Duty', anio: 2023, configuracion: '4x4',
    capacidadKg: 1800, volumenM3: 8, numEjes: 2, pesoBrutoKg: 4500,
    empresa: 'ICOLTRANS S.A.S', estadoOperativo: 'DISPONIBLE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0825', origen: 'Bogotá', destino: 'Villavicencio', fecha: '2025-06-17', estado: 'COMPLETADO', conductor: 'Ana Rodríguez' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-889900', vencimiento: '2026-03-31', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-33228', vencimiento: '2026-07-10', estado: 'VIGENTE' },
    ],
  },
  {
    id: 9, placa: 'NVL-714', tipoVehiculo: 'DOBLE_TROQUE', tipoCarroceria: 'FURGON',
    marca: 'Hino', modelo: 'GH 500', anio: 2020, configuracion: '6x2',
    capacidadKg: 24000, volumenM3: 71, numEjes: 3, pesoBrutoKg: 38000,
    empresa: 'CargaRápida Ltda', estadoOperativo: 'DISPONIBLE',
    viajesHistorico: [
      { codigo: 'VJ-2025-0819', origen: 'Cali', destino: 'Medellín', fecha: '2025-06-16', estado: 'COMPLETADO', conductor: 'Omar Pérez' },
      { codigo: 'VJ-2025-0803', origen: 'Bogotá', destino: 'Cali', fecha: '2025-06-11', estado: 'COMPLETADO', conductor: 'Omar Pérez' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-990011', vencimiento: '2026-02-28', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-44339', vencimiento: '2025-10-15', estado: 'VIGENTE' },
    ],
  },
  {
    id: 10, placa: 'OPR-488', tipoVehiculo: 'CARROTANQUE', tipoCarroceria: 'CISTERNA',
    marca: 'Scania', modelo: 'R 450', anio: 2022, configuracion: '6x2',
    capacidadKg: 30000, volumenM3: 30, numEjes: 3, pesoBrutoKg: 44000,
    empresa: 'Petrolink S.A', estadoOperativo: 'EN_MANTENIMIENTO',
    viajesHistorico: [
      { codigo: 'VJ-2025-0804', origen: 'Barrancabermeja', destino: 'Bogotá', fecha: '2025-06-12', estado: 'COMPLETADO', conductor: 'Luis Torres' },
      { codigo: 'VJ-2025-0790', origen: 'Bogotá', destino: 'Cali', fecha: '2025-06-08', estado: 'COMPLETADO', conductor: 'Luis Torres' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-101122', vencimiento: '2025-11-30', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-55440', vencimiento: '2026-04-20', estado: 'VIGENTE' },
      { tipo: 'Licencia Mercancías Peligrosas', numero: 'LMP-2025-3310', vencimiento: '2025-08-31', estado: 'POR_VENCER' },
    ],
  },
  {
    id: 11, placa: 'ZMW-302', tipoVehiculo: 'VAN', tipoCarroceria: 'FURGON',
    marca: 'Renault', modelo: 'Master L3H2', anio: 2023, configuracion: '4x2',
    capacidadKg: 1200, volumenM3: 13, numEjes: 2, pesoBrutoKg: 3500,
    empresa: 'ICOLTRANS S.A.S', estadoOperativo: 'EN_MANTENIMIENTO',
    viajesHistorico: [
      { codigo: 'VJ-2025-0815', origen: 'Bogotá', destino: 'Tunja', fecha: '2025-06-15', estado: 'COMPLETADO', conductor: 'Sandra Gómez' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-121233', vencimiento: '2026-05-31', estado: 'VIGENTE' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-66551', vencimiento: '2026-08-01', estado: 'VIGENTE' },
    ],
  },
  {
    id: 12, placa: 'CRQ-177', tipoVehiculo: 'TRACTOCAMION', tipoCarroceria: 'ESPECIAL',
    marca: 'Peterbilt', modelo: '389', anio: 2018, configuracion: '6x4',
    capacidadKg: 34000, volumenM3: 88, numEjes: 3, pesoBrutoKg: 48000,
    empresa: 'CargaRápida Ltda', estadoOperativo: 'FUERA_SERVICIO',
    viajesHistorico: [
      { codigo: 'VJ-2025-0785', origen: 'Bogotá', destino: 'Barranquilla', fecha: '2025-06-05', estado: 'COMPLETADO', conductor: 'Diego Martínez' },
      { codigo: 'VJ-2025-0760', origen: 'Medellín', destino: 'Bogotá', fecha: '2025-05-28', estado: 'CANCELADO', conductor: 'Diego Martínez' },
    ],
    documentos: [
      { tipo: 'SOAT', numero: 'SOA-2025-131344', vencimiento: '2025-05-31', estado: 'VENCIDO' },
      { tipo: 'Tecnomecánica', numero: 'TEC-2025-77662', vencimiento: '2025-04-15', estado: 'VENCIDO' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoChip(estado: EstadoOperativo) {
  switch (estado) {
    case 'DISPONIBLE':
      return { label: 'Disponible', color: '#16a34a', bg: alpha('#16a34a', 0.12) }
    case 'EN_VIAJE':
      return { label: 'En Viaje', color: TMS_COLOR, bg: alpha(TMS_COLOR, 0.12) }
    case 'EN_MANTENIMIENTO':
      return { label: 'En Mantenimiento', color: '#d97706', bg: alpha('#d97706', 0.12) }
    case 'FUERA_SERVICIO':
      return { label: 'Fuera de Servicio', color: '#dc2626', bg: alpha('#dc2626', 0.12) }
  }
}

function docEstadoChip(estado: Documento['estado']) {
  switch (estado) {
    case 'VIGENTE': return { color: '#16a34a', bg: alpha('#16a34a', 0.12), icon: <CheckCircle sx={{ fontSize: 14 }} /> }
    case 'POR_VENCER': return { color: '#d97706', bg: alpha('#d97706', 0.12), icon: <Warning sx={{ fontSize: 14 }} /> }
    case 'VENCIDO': return { color: '#dc2626', bg: alpha('#dc2626', 0.12), icon: <Cancel sx={{ fontSize: 14 }} /> }
  }
}

function viajeEstadoChip(estado: ViajeHistorico['estado']) {
  switch (estado) {
    case 'COMPLETADO': return { color: '#16a34a', bg: alpha('#16a34a', 0.12) }
    case 'EN_CURSO': return { color: TMS_COLOR, bg: alpha(TMS_COLOR, 0.12) }
    case 'CANCELADO': return { color: '#dc2626', bg: alpha('#dc2626', 0.12) }
  }
}

function formatNum(n: number): string {
  return n.toLocaleString('es-CO')
}

function tipoLabel(tipo: TipoVehiculo): string {
  return tipo.replace(/_/g, ' ')
}

// ─── Empty Form ───────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<Vehiculo, 'id' | 'viajesHistorico' | 'documentos'> = {
  placa: '',
  tipoVehiculo: 'CAMION_SENCILLO',
  tipoCarroceria: 'FURGON',
  marca: '',
  modelo: '',
  anio: 2024,
  configuracion: '',
  capacidadKg: 0,
  volumenM3: 0,
  numEjes: 2,
  pesoBrutoKg: 0,
  empresa: '',
  estadoOperativo: 'DISPONIBLE',
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: alpha(color, 0.25),
        borderRadius: 2,
        flex: 1,
        minWidth: 140,
      }}
    >
      <CardContent sx={{ p: '14px 18px !important' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: alpha(color, 0.15), display: 'flex',
              alignItems: 'center', justifyContent: 'center', color,
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

// ─── Tab Panels ───────────────────────────────────────────────────────────────

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  )
}

// ─── Dialog: Ver Vehículo ─────────────────────────────────────────────────────

function VerVehiculoDialog({ vehiculo, open, onClose }: { vehiculo: Vehiculo | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState(0)
  if (!vehiculo) return null
  const est = estadoChip(vehiculo.estadoOperativo)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
      sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: '#E5E7EB', borderRadius: 3 }
    }}>
      <DialogTitle sx={{ color: '#1E293B', pb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2, bgcolor: alpha(TMS_COLOR, 0.2),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <LocalShipping sx={{ color: TMS_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
                {vehiculo.placa}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                {tipoLabel(vehiculo.tipoVehiculo)} · {vehiculo.marca} {vehiculo.modelo}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip label={est.label} size="small" sx={{ bgcolor: est.bg, color: est.color, fontWeight: 700 }} />
            <IconButton onClick={onClose} sx={{ color: '#64748B' }}><Close /></IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { color: '#64748B', fontSize: 13, textTransform: 'none', minHeight: 40 },
            '& .Mui-selected': { color: TMS_COLOR },
            '& .MuiTabs-indicator': { bgcolor: TMS_COLOR },
          }}
        >
          <Tab icon={<Info sx={{ fontSize: 16 }} />} iconPosition="start" label="Información" />
          <Tab icon={<History sx={{ fontSize: 16 }} />} iconPosition="start" label="Historial de Viajes" />
          <Tab icon={<Description sx={{ fontSize: 16 }} />} iconPosition="start" label="Documentos" />
        </Tabs>
        <Divider sx={{ borderColor: '#E5E7EB' }} />
      </Box>

      <DialogContent sx={{ px: 3, pt: 1 }}>
        {/* Tab 0: Información */}
        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" sx={{ color: TMS_COLOR, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>
                Identificación del Vehículo
              </Typography>
            </Grid>
            {[
              { label: 'Placa', value: vehiculo.placa },
              { label: 'Tipo Vehículo', value: tipoLabel(vehiculo.tipoVehiculo) },
              { label: 'Tipo Carrocería', value: vehiculo.tipoCarroceria },
              { label: 'Marca', value: vehiculo.marca },
              { label: 'Modelo', value: vehiculo.modelo },
              { label: 'Año', value: String(vehiculo.anio) },
              { label: 'Configuración', value: vehiculo.configuracion },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mt: 0.2 }}>{item.value}</Typography>
                </Box>
              </Grid>
            ))}

            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: TMS_COLOR, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>
                Capacidades Técnicas
              </Typography>
            </Grid>
            {[
              { label: 'Capacidad (kg)', value: formatNum(vehiculo.capacidadKg) + ' kg' },
              { label: 'Volumen (m³)', value: vehiculo.volumenM3 > 0 ? `${vehiculo.volumenM3} m³` : 'N/A' },
              { label: 'N° Ejes', value: String(vehiculo.numEjes) },
              { label: 'Peso Bruto', value: formatNum(vehiculo.pesoBrutoKg) + ' kg' },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mt: 0.2 }}>{item.value}</Typography>
                </Box>
              </Grid>
            ))}

            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: TMS_COLOR, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>
                Propietario
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>Empresa / Propietario</Typography>
                <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mt: 0.2 }}>{vehiculo.empresa}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>Estado Operativo</Typography>
                <Box sx={{ mt: 0.4 }}>
                  <Chip label={est.label} size="small" sx={{ bgcolor: est.bg, color: est.color, fontWeight: 700, fontSize: 11 }} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Historial */}
        <TabPanel value={tab} index={1}>
          {vehiculo.viajesHistorico.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', mt: 4 }}>
              Sin historial de viajes registrado
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Código', 'Origen', 'Destino', 'Fecha', 'Conductor', 'Estado'].map((h) => (
                      <TableCell key={h} sx={{ color: '#64748B', fontSize: 11, fontWeight: 700, borderBottom: `1px solid #E5E7EB`, py: 1 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vehiculo.viajesHistorico.map((v) => {
                    const ec = viajeEstadoChip(v.estado)
                    return (
                      <TableRow key={v.codigo} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell sx={{ color: TMS_COLOR, fontWeight: 700, fontSize: 12, borderBottom: `1px solid #E5E7EB` }}>
                          {v.codigo}
                        </TableCell>
                        <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB` }}>{v.origen}</TableCell>
                        <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB` }}>{v.destino}</TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: 11, borderBottom: `1px solid #E5E7EB` }}>{v.fecha}</TableCell>
                        <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB` }}>{v.conductor}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid #E5E7EB` }}>
                          <Chip
                            label={v.estado.replace('_', ' ')}
                            size="small"
                            sx={{ bgcolor: ec.bg, color: ec.color, fontWeight: 700, fontSize: 10, height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab 2: Documentos */}
        <TabPanel value={tab} index={2}>
          <Stack spacing={1.5}>
            {vehiculo.documentos.map((doc, i) => {
              const dc = docEstadoChip(doc.estado)
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: '#F8FAFC', borderRadius: 2, p: 1.5,
                    border: '1px solid', borderColor: alpha(dc.color, 0.2),
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 36, height: 36, borderRadius: 1.5,
                        bgcolor: alpha(dc.color, 0.15), display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: dc.color,
                      }}
                    >
                      <Description sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 700, fontSize: 13 }}>
                        {doc.tipo}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                        N°: {doc.numero}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack alignItems="flex-end" spacing={0.5}>
                    <Chip
                      icon={<Box sx={{ color: `${dc.color} !important`, display: 'flex' }}>{dc.icon}</Box>}
                      label={doc.estado.replace('_', ' ')}
                      size="small"
                      sx={{ bgcolor: dc.bg, color: dc.color, fontWeight: 700, fontSize: 10, height: 22 }}
                    />
                    <Stack direction="row" alignItems="center" spacing={0.4}>
                      <CalendarToday sx={{ fontSize: 11, color: '#64748B' }} />
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>
                        Vence: {doc.vencimiento}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" size="small"
          sx={{ color: '#64748B', borderColor: '#E5E7EB', '&:hover': { borderColor: '#64748B', bgcolor: '#F8FAFC' } }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Registrar/Editar Vehículo ────────────────────────────────────────

function FormVehiculoDialog({
  open, onClose, initial, title
}: {
  open: boolean
  onClose: () => void
  initial: Omit<Vehiculo, 'id' | 'viajesHistorico' | 'documentos'>
  title: string
}) {
  const [form, setForm] = useState({ ...initial })

  React.useEffect(() => {
    setForm({ ...initial })
  }, [initial, open])

  function field(key: keyof typeof form, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const inputSx = {
    '& .MuiInputBase-root': { fontSize: 13 },
    '& .MuiInputLabel-root': { fontSize: 13 },
    '& .MuiInputLabel-root.Mui-focused': { color: TMS_COLOR },
    '& .MuiOutlinedInput-root:hover fieldset': { borderColor: alpha(TMS_COLOR, 0.4) },
    '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: TMS_COLOR },
  }

  const sectionTitle = (label: string) => (
    <Grid size={{ xs: 12 }}>
      <Typography variant="caption" sx={{
        color: TMS_COLOR, fontWeight: 700, textTransform: 'uppercase',
        fontSize: 10, letterSpacing: 1, display: 'block', mt: 1
      }}>
        {label}
      </Typography>
      <Divider sx={{ borderColor: alpha(TMS_COLOR, 0.2), mt: 0.5 }} />
    </Grid>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
      sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: '#E5E7EB', borderRadius: 3 }
    }}>
      <DialogTitle sx={{ color: '#1E293B' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(TMS_COLOR, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LocalShipping sx={{ color: TMS_COLOR, fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700 }}>{title}</Typography>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: '#64748B' }}><Close /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {/* Identificación */}
          {sectionTitle('Identificación')}

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Placa *" value={form.placa}
              onChange={(e) => field('placa', e.target.value.toUpperCase())}
              sx={inputSx} inputProps={{ maxLength: 7, style: { textTransform: 'uppercase' } }} />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" sx={inputSx}>
              <InputLabel>Tipo Vehículo</InputLabel>
              <Select value={form.tipoVehiculo} label="Tipo Vehículo"
                onChange={(e) => field('tipoVehiculo', e.target.value as TipoVehiculo)}
              >

                {TIPOS_VEHICULO.map((t) => (
                  <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{tipoLabel(t)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" sx={inputSx}>
              <InputLabel>Tipo Carrocería</InputLabel>
              <Select value={form.tipoCarroceria} label="Tipo Carrocería"
                onChange={(e) => field('tipoCarroceria', e.target.value as TipoCarroceria)}
              >

                {TIPOS_CARROCERIA.map((t) => (
                  <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Marca" value={form.marca}
              onChange={(e) => field('marca', e.target.value)} sx={inputSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Modelo" value={form.modelo}
              onChange={(e) => field('modelo', e.target.value)} sx={inputSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth size="small" label="Año" type="number" value={form.anio}
              onChange={(e) => field('anio', Number(e.target.value))} sx={inputSx}
              inputProps={{ min: 2000, max: 2030 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField fullWidth size="small" label="Configuración" value={form.configuracion}
              onChange={(e) => field('configuracion', e.target.value)}
              placeholder="Ej: 6x4" sx={inputSx} />
          </Grid>

          {/* Capacidades */}
          {sectionTitle('Capacidades')}

          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth size="small" label="Capacidad (kg)" type="number" value={form.capacidadKg}
              onChange={(e) => field('capacidadKg', Number(e.target.value))} sx={inputSx}
              inputProps={{ min: 0 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth size="small" label="Volumen (m³)" type="number" value={form.volumenM3}
              onChange={(e) => field('volumenM3', Number(e.target.value))} sx={inputSx}
              inputProps={{ min: 0 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth size="small" label="N° Ejes" type="number" value={form.numEjes}
              onChange={(e) => field('numEjes', Number(e.target.value))} sx={inputSx}
              inputProps={{ min: 1, max: 10 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth size="small" label="Peso Bruto (kg)" type="number" value={form.pesoBrutoKg}
              onChange={(e) => field('pesoBrutoKg', Number(e.target.value))} sx={inputSx}
              inputProps={{ min: 0 }} />
          </Grid>

          {/* Propietario */}
          {sectionTitle('Propietario')}

          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth size="small" label="Empresa / Propietario" value={form.empresa}
              onChange={(e) => field('empresa', e.target.value)} sx={inputSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" sx={inputSx}>
              <InputLabel>Estado Operativo</InputLabel>
              <Select value={form.estadoOperativo} label="Estado Operativo"
                onChange={(e) => field('estadoOperativo', e.target.value as EstadoOperativo)}
              >

                {ESTADOS_OPERATIVOS.map((e) => (
                  <MenuItem key={e} value={e} sx={{ fontSize: 13 }}>{e.replace(/_/g, ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small"
          sx={{ color: '#64748B', borderColor: '#E5E7EB', '&:hover': { borderColor: '#64748B', bgcolor: '#F8FAFC' } }}>
          Cancelar
        </Button>
        <Button
          variant="contained" size="small"
          sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284c7' }, fontWeight: 700 }}
          onClick={onClose}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Dialog: Cambiar Estado ────────────────────────────────────────────────────

function CambiarEstadoDialog({
  vehiculo, open, onClose, onConfirm
}: {
  vehiculo: Vehiculo | null
  open: boolean
  onClose: () => void
  onConfirm: (placa: string, estado: EstadoOperativo) => void
}) {
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOperativo>('DISPONIBLE')

  React.useEffect(() => {
    if (vehiculo) setNuevoEstado(vehiculo.estadoOperativo)
  }, [vehiculo, open])

  if (!vehiculo) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{
      sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: '#E5E7EB', borderRadius: 3 }
    }}>
      <DialogTitle sx={{ color: '#1E293B' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Cambiar Estado — {vehiculo.placa}</Typography>
          <IconButton onClick={onClose} sx={{ color: '#64748B' }}><Close /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth size="small" sx={{ mt: 1,
          '& .MuiInputLabel-root.Mui-focused': { color: TMS_COLOR },
          '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: TMS_COLOR },
        }}>
          <InputLabel>Nuevo Estado Operativo</InputLabel>
          <Select
            value={nuevoEstado}
            label="Nuevo Estado Operativo"
            onChange={(e) => setNuevoEstado(e.target.value as EstadoOperativo)}
          >
            {ESTADOS_OPERATIVOS.map((e) => {
              const c = estadoChip(e)
              return (
                <MenuItem key={e} value={e} sx={{ fontSize: 13 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FiberManualRecord sx={{ fontSize: 10, color: c.color }} />
                    <span>{e.replace(/_/g, ' ')}</span>
                  </Stack>
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small"
          sx={{ color: '#64748B', borderColor: '#E5E7EB', '&:hover': { borderColor: '#64748B', bgcolor: '#F8FAFC' } }}>
          Cancelar
        </Button>
        <Button
          variant="contained" size="small"
          sx={{ bgcolor: TMS_COLOR, '&:hover': { bgcolor: '#0284c7' }, fontWeight: 700 }}
          onClick={() => { onConfirm(vehiculo.placa, nuevoEstado); onClose() }}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TMSVehiculos() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(MOCK_VEHICULOS)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<TipoVehiculo | ''>('')
  const [filterEstado, setFilterEstado] = useState<EstadoOperativo | ''>('')

  const [verOpen, setVerOpen] = useState(false)
  const [verVehiculo, setVerVehiculo] = useState<Vehiculo | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('Registrar Vehículo')
  const [formInitial, setFormInitial] = useState<Omit<Vehiculo, 'id' | 'viajesHistorico' | 'documentos'>>(EMPTY_FORM)

  const [estadoOpen, setEstadoOpen] = useState(false)
  const [estadoVehiculo, setEstadoVehiculo] = useState<Vehiculo | null>(null)

  const filtered = useMemo(() => {
    return vehiculos.filter((v) => {
      const q = search.toLowerCase()
      const matchSearch = !q || v.placa.toLowerCase().includes(q) || v.empresa.toLowerCase().includes(q) || v.marca.toLowerCase().includes(q)
      const matchTipo = !filterTipo || v.tipoVehiculo === filterTipo
      const matchEstado = !filterEstado || v.estadoOperativo === filterEstado
      return matchSearch && matchTipo && matchEstado
    })
  }, [vehiculos, search, filterTipo, filterEstado])

  const kpis = useMemo(() => ({
    total: vehiculos.length,
    disponibles: vehiculos.filter((v) => v.estadoOperativo === 'DISPONIBLE').length,
    enViaje: vehiculos.filter((v) => v.estadoOperativo === 'EN_VIAJE').length,
    mantenimiento: vehiculos.filter((v) => v.estadoOperativo === 'EN_MANTENIMIENTO' || v.estadoOperativo === 'FUERA_SERVICIO').length,
  }), [vehiculos])

  function handleVer(v: Vehiculo) { setVerVehiculo(v); setVerOpen(true) }
  function handleEditar(v: Vehiculo) {
    const { id, viajesHistorico, documentos, ...rest } = v
    setFormInitial(rest); setFormTitle(`Editar — ${v.placa}`); setFormOpen(true)
  }
  function handleNuevo() { setFormInitial({ ...EMPTY_FORM }); setFormTitle('Registrar Vehículo'); setFormOpen(true) }
  function handleCambiarEstado(v: Vehiculo) { setEstadoVehiculo(v); setEstadoOpen(true) }
  function handleConfirmarEstado(placa: string, estado: EstadoOperativo) {
    setVehiculos((prev) => prev.map((v) => v.placa === placa ? { ...v, estadoOperativo: estado } : v))
  }

  const selectSx = {
    '& .MuiInputBase-root': { fontSize: 13 },
    '& .MuiInputLabel-root': { fontSize: 13 },
    '& .MuiInputLabel-root.Mui-focused': { color: TMS_COLOR },
    '& .MuiOutlinedInput-root:hover fieldset': { borderColor: alpha(TMS_COLOR, 0.4) },
    '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: TMS_COLOR },
  }

  return (
    <Layout>
      <Box sx={{ minHeight: '100%', bgcolor: '#F0F2F5', p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.3}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(TMS_COLOR, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalShipping sx={{ color: TMS_COLOR, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
                  Gestión de Vehículos
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                  TMS — Administración de Flota Vehicular
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNuevo}
            sx={{
              bgcolor: TMS_COLOR, fontWeight: 700, fontSize: 13,
              '&:hover': { bgcolor: '#0284c7' }, borderRadius: 2, px: 2,
            }}
          >
            Registrar Vehículo
          </Button>
        </Stack>

        {/* KPIs */}
        <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap>
          <KPICard label="Total Vehículos" value={kpis.total} color={TMS_COLOR} icon={<LocalShipping sx={{ fontSize: 20 }} />} />
          <KPICard label="Disponibles" value={kpis.disponibles} color="#16a34a" icon={<CheckCircle sx={{ fontSize: 20 }} />} />
          <KPICard label="En Viaje" value={kpis.enViaje} color="#2563eb" icon={<Speed sx={{ fontSize: 20 }} />} />
          <KPICard label="Mant. / Fuera Servicio" value={kpis.mantenimiento} color="#d97706" icon={<Build sx={{ fontSize: 20 }} />} />
        </Stack>

        {/* Toolbar */}
        <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Buscar por placa, empresa o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 220, ...selectSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: '#64748B' }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180, ...selectSx }}>
            <InputLabel>Tipo Vehículo</InputLabel>
            <Select
              value={filterTipo}
              label="Tipo Vehículo"
              onChange={(e) => setFilterTipo(e.target.value as TipoVehiculo | '')}
              >
              <MenuItem value="" sx={{ fontSize: 13 }}>Todos los tipos</MenuItem>
              {TIPOS_VEHICULO.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{tipoLabel(t)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180, ...selectSx }}>
            <InputLabel>Estado Operativo</InputLabel>
            <Select
              value={filterEstado}
              label="Estado Operativo"
              onChange={(e) => setFilterEstado(e.target.value as EstadoOperativo | '')}
              >
              <MenuItem value="" sx={{ fontSize: 13 }}>Todos los estados</MenuItem>
              {ESTADOS_OPERATIVOS.map((e) => (
                <MenuItem key={e} value={e} sx={{ fontSize: 13 }}>{e.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Table */}
        <Paper
          sx={{
            bgcolor: 'background.paper', border: '1px solid',
            borderColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Placa', 'Tipo Vehículo', 'Carrocería', 'Marca / Modelo / Año', 'Capacidad', 'Estado', 'Empresa / Propietario', 'Acciones'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: 0.5, borderBottom: `1px solid #E5E7EB`,
                        py: 1.2, px: 2, whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: '#64748B', borderBottom: 'none' }}>
                      No se encontraron vehículos con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v) => {
                    const est = estadoChip(v.estadoOperativo)
                    return (
                      <TableRow
                        key={v.id}
                        sx={{
                          '&:hover': { bgcolor: '#F8FAFC' },
                          '&:last-child td': { borderBottom: 'none' },
                        }}
                      >
                        <TableCell sx={{ borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2 }}>
                          <Chip
                            label={v.placa}
                            size="small"
                            sx={{ bgcolor: alpha(TMS_COLOR, 0.18), color: TMS_COLOR, fontWeight: 800, fontSize: 12, height: 24 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2, whiteSpace: 'nowrap' }}>
                          {tipoLabel(v.tipoVehiculo)}
                        </TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: 12, borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2 }}>
                          {v.tipoCarroceria}
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2 }}>
                          <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, fontSize: 12 }}>
                            {v.marca} {v.modelo}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>{v.anio} · {v.configuracion}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2, whiteSpace: 'nowrap' }}>
                          {formatNum(v.capacidadKg)} kg
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2 }}>
                          <Chip
                            label={est.label}
                            size="small"
                            sx={{ bgcolor: est.bg, color: est.color, fontWeight: 700, fontSize: 11, height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: 12, borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2 }}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Business sx={{ fontSize: 13, color: '#64748B' }} />
                            <span>{v.empresa}</span>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid #E5E7EB`, px: 2, py: 1.2 }}>
                          <Stack direction="row" spacing={0.3}>
                            <Tooltip title="Ver detalle">
                              <IconButton size="small" onClick={() => handleVer(v)}
                                sx={{ color: TMS_COLOR, '&:hover': { bgcolor: alpha(TMS_COLOR, 0.1) }, width: 28, height: 28 }}>
                                <Visibility sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleEditar(v)}
                                sx={{ color: '#64748B', '&:hover': { bgcolor: alpha('#64748B', 0.1) }, width: 28, height: 28 }}>
                                <Edit sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cambiar estado">
                              <IconButton size="small" onClick={() => handleCambiarEstado(v)}
                                sx={{ color: '#d97706', '&:hover': { bgcolor: alpha('#d97706', 0.1) }, width: 28, height: 28 }}>
                                <SwapHoriz sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filtered.length > 0 && (
            <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid #E5E7EB` }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                Mostrando {filtered.length} de {vehiculos.length} vehículos
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Dialogs */}
        <VerVehiculoDialog vehiculo={verVehiculo} open={verOpen} onClose={() => setVerOpen(false)} />
        <FormVehiculoDialog open={formOpen} onClose={() => setFormOpen(false)} initial={formInitial} title={formTitle} />
        <CambiarEstadoDialog
          vehiculo={estadoVehiculo}
          open={estadoOpen}
          onClose={() => setEstadoOpen(false)}
          onConfirm={handleConfirmarEstado}
        />
      </Box>
    </Layout>
  )
}
