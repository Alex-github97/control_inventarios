import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Grid,
  Avatar,
  CircularProgress,
  LinearProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Badge,
  Tooltip,
  alpha,
} from '@mui/material'
import {
  Folder,
  Description,
  Person,
  DirectionsCar,
  Business,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  AttachFile,
  Visibility,
  Close,
  PeopleAlt,
  LocalShipping,
  Apartment,
  Badge as BadgeIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Documento {
  nombre: string
  estado: 'En orden' | 'Pendiente' | 'Vencido'
  fechaVencimiento?: string
  diasRestantes?: number
}

interface Empleado {
  id: string
  nombre: string
  cargo: string
  departamento: string
  completitud: number
  documentos: Documento[]
}

interface Conductor {
  id: string
  nombre: string
  placa: string
  ruta: string
  completitud: number
  documentos: Documento[]
}

interface Vehiculo {
  id: string
  placa: string
  tipo: string
  marca: string
  modelo: string
  completitud: number
  documentos: Documento[]
}

interface Cliente {
  id: string
  nombre: string
  nit: string
  ciudad: string
  completitud: number
  documentos: Documento[]
}

interface Proveedor {
  id: string
  nombre: string
  nit: string
  servicio: string
  completitud: number
  documentos: Documento[]
}

type ExpedienteItem = Empleado | Conductor | Vehiculo | Cliente | Proveedor

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const empleados: Empleado[] = [
  {
    id: 'EMP001',
    nombre: 'Carlos Andrés Martínez',
    cargo: 'Gerente de Operaciones',
    departamento: 'Operaciones',
    completitud: 95,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2026-12-31' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'En orden' },
      { nombre: 'Incapacidades médicas', estado: 'Pendiente' },
      { nombre: 'Examen médico de ingreso', estado: 'En orden' },
    ],
  },
  {
    id: 'EMP002',
    nombre: 'María Fernanda López',
    cargo: 'Coordinadora de Logística',
    departamento: 'Logística',
    completitud: 88,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2026-06-30' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'En orden' },
      { nombre: 'Incapacidades médicas', estado: 'En orden' },
      { nombre: 'Examen médico de ingreso', estado: 'Pendiente' },
    ],
  },
  {
    id: 'EMP003',
    nombre: 'Juan Pablo Rodríguez',
    cargo: 'Analista TMS',
    departamento: 'Tecnología',
    completitud: 72,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2025-12-31' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'Pendiente' },
      { nombre: 'Incapacidades médicas', estado: 'Pendiente' },
      { nombre: 'Examen médico de ingreso', estado: 'En orden' },
    ],
  },
  {
    id: 'EMP004',
    nombre: 'Luisa Marcela Torres',
    cargo: 'Jefe de Recursos Humanos',
    departamento: 'RRHH',
    completitud: 100,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2027-01-31' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'En orden' },
      { nombre: 'Incapacidades médicas', estado: 'En orden' },
      { nombre: 'Examen médico de ingreso', estado: 'En orden' },
    ],
  },
  {
    id: 'EMP005',
    nombre: 'Andrés Felipe Gómez',
    cargo: 'Conductor Senior',
    departamento: 'Transporte',
    completitud: 55,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'Vencido', fechaVencimiento: '2025-03-31' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'Pendiente' },
      { nombre: 'Incapacidades médicas', estado: 'Pendiente' },
      { nombre: 'Examen médico de ingreso', estado: 'Vencido' },
    ],
  },
  {
    id: 'EMP006',
    nombre: 'Sandra Patricia Herrera',
    cargo: 'Analista de Inventarios',
    departamento: 'Logística',
    completitud: 91,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2026-09-30' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'En orden' },
      { nombre: 'Incapacidades médicas', estado: 'En orden' },
      { nombre: 'Examen médico de ingreso', estado: 'Pendiente' },
    ],
  },
  {
    id: 'EMP007',
    nombre: 'Ricardo Enrique Vargas',
    cargo: 'Supervisor de Almacén',
    departamento: 'Almacenamiento',
    completitud: 67,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2026-04-30' },
      { nombre: 'Hoja de vida', estado: 'Pendiente' },
      { nombre: 'Certificados de estudio', estado: 'En orden' },
      { nombre: 'Incapacidades médicas', estado: 'Pendiente' },
      { nombre: 'Examen médico de ingreso', estado: 'En orden' },
    ],
  },
  {
    id: 'EMP008',
    nombre: 'Claudia Inés Ospina',
    cargo: 'Directora Financiera',
    departamento: 'Finanzas',
    completitud: 98,
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'En orden', fechaVencimiento: '2028-01-31' },
      { nombre: 'Hoja de vida', estado: 'En orden' },
      { nombre: 'Certificados de estudio', estado: 'En orden' },
      { nombre: 'Incapacidades médicas', estado: 'En orden' },
      { nombre: 'Examen médico de ingreso', estado: 'En orden' },
    ],
  },
]

const conductores: Conductor[] = [
  {
    id: 'CON001',
    nombre: 'Pedro Antonio Ramírez',
    placa: 'ABC-123',
    ruta: 'Bogotá - Medellín',
    completitud: 92,
    documentos: [
      { nombre: 'Licencia de conducción C2', estado: 'En orden', fechaVencimiento: '2027-03-15', diasRestantes: 270 },
      { nombre: 'Examen médico', estado: 'En orden', fechaVencimiento: '2026-12-01', diasRestantes: 165 },
      { nombre: 'Consulta SIMIT', estado: 'En orden' },
      { nombre: 'Curso de manejo defensivo', estado: 'En orden' },
    ],
  },
  {
    id: 'CON002',
    nombre: 'Luis Eduardo Herrera',
    placa: 'DEF-456',
    ruta: 'Bogotá - Cali',
    completitud: 78,
    documentos: [
      { nombre: 'Licencia de conducción C3', estado: 'En orden', fechaVencimiento: '2026-08-20', diasRestantes: 62 },
      { nombre: 'Examen médico', estado: 'Pendiente', fechaVencimiento: '2026-07-01', diasRestantes: 12 },
      { nombre: 'Consulta SIMIT', estado: 'En orden' },
      { nombre: 'Curso de manejo defensivo', estado: 'Pendiente' },
    ],
  },
  {
    id: 'CON003',
    nombre: 'Fabio Ernesto Cárdenas',
    placa: 'GHI-789',
    ruta: 'Bogotá - Bucaramanga',
    completitud: 60,
    documentos: [
      { nombre: 'Licencia de conducción C2', estado: 'Vencido', fechaVencimiento: '2025-11-30', diasRestantes: -202 },
      { nombre: 'Examen médico', estado: 'En orden', fechaVencimiento: '2026-10-15', diasRestantes: 118 },
      { nombre: 'Consulta SIMIT', estado: 'Vencido' },
      { nombre: 'Curso de manejo defensivo', estado: 'En orden' },
    ],
  },
  {
    id: 'CON004',
    nombre: 'Jairo Alberto Castillo',
    placa: 'JKL-012',
    ruta: 'Bogotá - Barranquilla',
    completitud: 96,
    documentos: [
      { nombre: 'Licencia de conducción C3', estado: 'En orden', fechaVencimiento: '2028-05-10', diasRestantes: 690 },
      { nombre: 'Examen médico', estado: 'En orden', fechaVencimiento: '2027-01-20', diasRestantes: 215 },
      { nombre: 'Consulta SIMIT', estado: 'En orden' },
      { nombre: 'Curso de manejo defensivo', estado: 'En orden' },
    ],
  },
  {
    id: 'CON005',
    nombre: 'Hernán Darío Patiño',
    placa: 'MNO-345',
    ruta: 'Bogotá - Cartagena',
    completitud: 85,
    documentos: [
      { nombre: 'Licencia de conducción C2', estado: 'En orden', fechaVencimiento: '2026-11-30', diasRestantes: 164 },
      { nombre: 'Examen médico', estado: 'En orden', fechaVencimiento: '2026-09-15', diasRestantes: 88 },
      { nombre: 'Consulta SIMIT', estado: 'En orden' },
      { nombre: 'Curso de manejo defensivo', estado: 'Pendiente' },
    ],
  },
  {
    id: 'CON006',
    nombre: 'William Arnulfo Salcedo',
    placa: 'PQR-678',
    ruta: 'Bogotá - Pereira',
    completitud: 50,
    documentos: [
      { nombre: 'Licencia de conducción C2', estado: 'Vencido', fechaVencimiento: '2025-08-31', diasRestantes: -292 },
      { nombre: 'Examen médico', estado: 'Vencido', fechaVencimiento: '2025-12-01', diasRestantes: -200 },
      { nombre: 'Consulta SIMIT', estado: 'Pendiente' },
      { nombre: 'Curso de manejo defensivo', estado: 'En orden' },
    ],
  },
]

const vehiculos: Vehiculo[] = [
  {
    id: 'VEH001',
    placa: 'EFC-789',
    tipo: 'Tractomula',
    marca: 'Kenworth',
    modelo: '2022',
    completitud: 100,
    documentos: [
      { nombre: 'SOAT', estado: 'En orden', fechaVencimiento: '2026-12-15', diasRestantes: 179 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'En orden', fechaVencimiento: '2027-01-10', diasRestantes: 205 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'En orden', fechaVencimiento: '2026-11-30', diasRestantes: 164 },
    ],
  },
  {
    id: 'VEH002',
    placa: 'STU-321',
    tipo: 'Camión sencillo',
    marca: 'Chevrolet',
    modelo: '2021',
    completitud: 75,
    documentos: [
      { nombre: 'SOAT', estado: 'En orden', fechaVencimiento: '2026-08-20', diasRestantes: 62 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'Pendiente', fechaVencimiento: '2026-07-05', diasRestantes: 16 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'Pendiente' },
    ],
  },
  {
    id: 'VEH003',
    placa: 'VWX-654',
    tipo: 'Furgón',
    marca: 'Mercedes-Benz',
    modelo: '2023',
    completitud: 50,
    documentos: [
      { nombre: 'SOAT', estado: 'Vencido', fechaVencimiento: '2025-10-31', diasRestantes: -231 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'Vencido', fechaVencimiento: '2025-09-15', diasRestantes: -277 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'En orden', fechaVencimiento: '2026-12-31', diasRestantes: 195 },
    ],
  },
  {
    id: 'VEH004',
    placa: 'YZA-987',
    tipo: 'Tractomula',
    marca: 'Volvo',
    modelo: '2023',
    completitud: 96,
    documentos: [
      { nombre: 'SOAT', estado: 'En orden', fechaVencimiento: '2027-02-28', diasRestantes: 254 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'En orden', fechaVencimiento: '2027-03-15', diasRestantes: 269 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'Pendiente' },
    ],
  },
  {
    id: 'VEH005',
    placa: 'BCD-258',
    tipo: 'Camión doble troque',
    marca: 'Internacional',
    modelo: '2020',
    completitud: 88,
    documentos: [
      { nombre: 'SOAT', estado: 'En orden', fechaVencimiento: '2026-10-01', diasRestantes: 104 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'En orden', fechaVencimiento: '2026-09-20', diasRestantes: 93 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'Pendiente' },
    ],
  },
  {
    id: 'VEH006',
    placa: 'EFG-147',
    tipo: 'Furgón refrigerado',
    marca: 'Hino',
    modelo: '2022',
    completitud: 100,
    documentos: [
      { nombre: 'SOAT', estado: 'En orden', fechaVencimiento: '2026-11-15', diasRestantes: 149 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'En orden', fechaVencimiento: '2026-12-20', diasRestantes: 184 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'En orden', fechaVencimiento: '2027-01-31', diasRestantes: 226 },
    ],
  },
  {
    id: 'VEH007',
    placa: 'HIJ-369',
    tipo: 'Camión sencillo',
    marca: 'Ford',
    modelo: '2019',
    completitud: 63,
    documentos: [
      { nombre: 'SOAT', estado: 'Vencido', fechaVencimiento: '2025-12-31', diasRestantes: -170 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'En orden', fechaVencimiento: '2026-08-01', diasRestantes: 43 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'Pendiente' },
    ],
  },
  {
    id: 'VEH008',
    placa: 'KLM-741',
    tipo: 'Tractomula',
    marca: 'Freightliner',
    modelo: '2024',
    completitud: 93,
    documentos: [
      { nombre: 'SOAT', estado: 'En orden', fechaVencimiento: '2027-04-30', diasRestantes: 315 },
      { nombre: 'Revisión Técnico-Mecánica (RTM)', estado: 'En orden', fechaVencimiento: '2027-05-15', diasRestantes: 330 },
      { nombre: 'Tarjeta de propiedad', estado: 'En orden' },
      { nombre: 'Póliza de responsabilidad civil', estado: 'Pendiente' },
    ],
  },
]

const clientes: Cliente[] = [
  {
    id: 'CLI001',
    nombre: 'Almacenes Éxito S.A.',
    nit: '860.007.386-4',
    ciudad: 'Medellín',
    completitud: 100,
    documentos: [
      { nombre: 'Contrato de servicios vigente', estado: 'En orden', fechaVencimiento: '2027-06-30' },
      { nombre: 'Acuerdo de niveles de servicio (SLA)', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Cámara de comercio', estado: 'En orden', fechaVencimiento: '2026-12-31' },
    ],
  },
  {
    id: 'CLI002',
    nombre: 'Avianca Cargo S.A.S.',
    nit: '890.100.577-1',
    ciudad: 'Bogotá',
    completitud: 85,
    documentos: [
      { nombre: 'Contrato de servicios vigente', estado: 'En orden', fechaVencimiento: '2026-09-30' },
      { nombre: 'Acuerdo de niveles de servicio (SLA)', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'Pendiente' },
      { nombre: 'Cámara de comercio', estado: 'En orden', fechaVencimiento: '2026-08-31' },
    ],
  },
  {
    id: 'CLI003',
    nombre: 'Bavaria S.A.',
    nit: '860.034.313-7',
    ciudad: 'Bogotá',
    completitud: 75,
    documentos: [
      { nombre: 'Contrato de servicios vigente', estado: 'Vencido', fechaVencimiento: '2025-12-31' },
      { nombre: 'Acuerdo de niveles de servicio (SLA)', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Cámara de comercio', estado: 'Pendiente' },
    ],
  },
  {
    id: 'CLI004',
    nombre: 'Postobón S.A.',
    nit: '860.002.153-9',
    ciudad: 'Medellín',
    completitud: 94,
    documentos: [
      { nombre: 'Contrato de servicios vigente', estado: 'En orden', fechaVencimiento: '2027-03-31' },
      { nombre: 'Acuerdo de niveles de servicio (SLA)', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Cámara de comercio', estado: 'Pendiente' },
    ],
  },
  {
    id: 'CLI005',
    nombre: 'Cementos Argos S.A.',
    nit: '890.100.251-7',
    ciudad: 'Barranquilla',
    completitud: 90,
    documentos: [
      { nombre: 'Contrato de servicios vigente', estado: 'En orden', fechaVencimiento: '2026-12-31' },
      { nombre: 'Acuerdo de niveles de servicio (SLA)', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Cámara de comercio', estado: 'Pendiente' },
    ],
  },
]

const proveedores: Proveedor[] = [
  {
    id: 'PRV001',
    nombre: 'Grupo Empresarial Colgas S.A.',
    nit: '800.099.263-5',
    servicio: 'Combustible y lubricantes',
    completitud: 100,
    documentos: [
      { nombre: 'Habilitación Ministerio de Minas', estado: 'En orden', fechaVencimiento: '2027-06-30' },
      { nombre: 'Certificado ISO 9001:2015', estado: 'En orden', fechaVencimiento: '2026-11-30' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Póliza de cumplimiento', estado: 'En orden', fechaVencimiento: '2026-12-31' },
    ],
  },
  {
    id: 'PRV002',
    nombre: 'Talleres Industriales del Oriente Ltda.',
    nit: '890.209.741-3',
    servicio: 'Mantenimiento vehicular',
    completitud: 80,
    documentos: [
      { nombre: 'Habilitación RUNT', estado: 'En orden', fechaVencimiento: '2026-10-31' },
      { nombre: 'Certificado técnico', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'Pendiente' },
      { nombre: 'Póliza de cumplimiento', estado: 'Pendiente' },
    ],
  },
  {
    id: 'PRV003',
    nombre: 'Neumáticos del Valle S.A.S.',
    nit: '805.001.157-2',
    servicio: 'Llantas y repuestos',
    completitud: 65,
    documentos: [
      { nombre: 'Registro cámara de comercio', estado: 'En orden', fechaVencimiento: '2026-09-30' },
      { nombre: 'Certificado de calidad', estado: 'Vencido', fechaVencimiento: '2025-06-30' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Póliza de cumplimiento', estado: 'Pendiente' },
    ],
  },
  {
    id: 'PRV004',
    nombre: 'Seguros Bolívar S.A.',
    nit: '860.003.498-6',
    servicio: 'Seguros y pólizas',
    completitud: 96,
    documentos: [
      { nombre: 'Habilitación Superfinanciera', estado: 'En orden', fechaVencimiento: '2027-12-31' },
      { nombre: 'Certificado RUNT', estado: 'En orden' },
      { nombre: 'RUT actualizado', estado: 'En orden' },
      { nombre: 'Póliza de cumplimiento', estado: 'Pendiente' },
    ],
  },
]

// ─── Helper Functions ───────────────────────────────────────────────────────────

function getSemaforoColor(pct: number): string {
  if (pct >= 90) return '#16a34a'
  if (pct >= 60) return '#d97706'
  return '#dc2626'
}

function getEstadoIcon(estado: Documento['estado']) {
  switch (estado) {
    case 'En orden':
      return <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
    case 'Pendiente':
      return <Warning sx={{ color: '#d97706', fontSize: 20 }} />
    case 'Vencido':
      return <ErrorIcon sx={{ color: '#dc2626', fontSize: 20 }} />
  }
}

function getEstadoChipColor(estado: Documento['estado']): 'success' | 'warning' | 'error' {
  switch (estado) {
    case 'En orden':
      return 'success'
    case 'Pendiente':
      return 'warning'
    case 'Vencido':
      return 'error'
  }
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter((_, i) => i < 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getLicenciaDiasColor(dias: number): 'error' | 'warning' | 'success' {
  if (dias < 0) return 'error'
  if (dias < 30) return 'error'
  if (dias < 90) return 'warning'
  return 'success'
}

// ─── Subcomponents ──────────────────────────────────────────────────────────────

interface CompletenessCircleProps {
  value: number
  size?: number
}

function CompletenessCircle({ value, size = 56 }: CompletenessCircleProps) {
  const color = getSemaforoColor(value)
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={4}
        sx={{ color: alpha(color, 0.15), position: 'absolute' }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={4}
        sx={{ color }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" component="div" sx={{ fontWeight: 700, fontSize: 11, color }}>
          {value}%
        </Typography>
      </Box>
    </Box>
  )
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function DMSExpedientes() {
  const [tab, setTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedExpediente, setSelectedExpediente] = useState<ExpedienteItem | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')

  const handleOpenExpediente = (item: ExpedienteItem, label: string) => {
    setSelectedExpediente(item)
    setSelectedLabel(label)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedExpediente(null)
    setSelectedLabel('')
  }

  const pendienteCount = (docs: Documento[]) =>
    docs.filter((d) => d.estado === 'Pendiente' || d.estado === 'Vencido').length

  return (
    <Layout title="Expedientes Electrónicos">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ── Header ── */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: DMS_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Folder sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Expedientes Electrónicos
              </Typography>
              <Chip
                label="DMS"
                size="small"
                sx={{
                  bgcolor: DMS_COLOR,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                  borderRadius: 1,
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
              Document Management System — Gestión centralizada de expedientes corporativos
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {[
              { label: 'Empleados', count: empleados.length, color: '#7c3aed' },
              { label: 'Conductores', count: conductores.length, color: DMS_COLOR },
              { label: 'Vehículos', count: vehiculos.length, color: '#0369a1' },
            ].map((s) => (
              <Box
                key={s.label}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: alpha(s.color, 0.08),
                  border: `1px solid ${alpha(s.color, 0.2)}`,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: s.color, lineHeight: 1 }}>
                  {s.count}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>

        {/* ── Tabs ── */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 0,
            bgcolor: '#fff',
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="primary"
            TabIndicatorProps={{ style: { backgroundColor: DMS_COLOR, height: 3 } }}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, minHeight: 52, fontSize: 13, textTransform: 'none' },
              '& .Mui-selected': { color: DMS_COLOR },
            }}
          >
            <Tab icon={<PeopleAlt sx={{ fontSize: 18 }} />} iconPosition="start" label="Empleados" />
            <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Conductores" />
            <Tab icon={<DirectionsCar sx={{ fontSize: 18 }} />} iconPosition="start" label="Vehículos" />
            <Tab icon={<Business sx={{ fontSize: 18 }} />} iconPosition="start" label="Clientes" />
            <Tab icon={<Apartment sx={{ fontSize: 18 }} />} iconPosition="start" label="Proveedores" />
          </Tabs>
        </Box>

        {/* ── Tab 0: Empleados ── */}
        <TabPanel value={tab} index={0}>
          <Alert
            severity="info"
            icon={<PeopleAlt />}
            sx={{ mb: 3, borderRadius: 2, bgcolor: alpha(DMS_COLOR, 0.06), border: `1px solid ${alpha(DMS_COLOR, 0.2)}` }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: DMS_COLOR }}>
              Integrado con HCM (Human Capital Management) — los datos se sincronizan automáticamente
            </Typography>
          </Alert>
          <Grid container spacing={2.5}>
            {empleados.map((emp) => {
              const alerts = pendienteCount(emp.documentos)
              const color = getSemaforoColor(emp.completitud)
              return (
                <Grid key={emp.id} size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      border: `1px solid ${alpha(color, 0.25)}`,
                      boxShadow: `0 2px 12px ${alpha(color, 0.08)}`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.18)}` },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Badge
                          badgeContent={alerts > 0 ? alerts : 0}
                          color="error"
                          invisible={alerts === 0}
                          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                          <Avatar
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: alpha(color, 0.15),
                              color: color,
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {getInitials(emp.nombre)}
                          </Avatar>
                        </Badge>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3, mb: 0.25 }}
                            noWrap
                          >
                            {emp.nombre}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }} noWrap>
                            {emp.cargo}
                          </Typography>
                          <Chip
                            label={emp.departamento}
                            size="small"
                            sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR }}
                          />
                        </Box>
                        <CompletenessCircle value={emp.completitud} />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                        {emp.documentos.slice(0, 4).map((doc) => (
                          <Stack key={doc.nombre} direction="row" alignItems="center" spacing={0.75}>
                            {getEstadoIcon(doc.estado)}
                            <Typography variant="caption" sx={{ color: '#475569', flex: 1 }} noWrap>
                              {doc.nombre}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<Folder sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenExpediente(emp, emp.nombre)}
                        sx={{
                          borderColor: DMS_COLOR,
                          color: DMS_COLOR,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: alpha(DMS_COLOR, 0.06) },
                        }}
                      >
                        Ver Expediente
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* ── Tab 1: Conductores ── */}
        <TabPanel value={tab} index={1}>
          <Alert
            severity="info"
            icon={<LocalShipping />}
            sx={{ mb: 3, borderRadius: 2, bgcolor: alpha(DMS_COLOR, 0.06), border: `1px solid ${alpha(DMS_COLOR, 0.2)}` }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: DMS_COLOR }}>
              Integrado con TMS (Transport Management System) — los datos se sincronizan automáticamente
            </Typography>
          </Alert>
          <Grid container spacing={2.5}>
            {conductores.map((con) => {
              const color = getSemaforoColor(con.completitud)
              const licencia = con.documentos.find((d) => d.nombre.toLowerCase().includes('licencia'))
              return (
                <Grid key={con.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      border: `1px solid ${alpha(color, 0.25)}`,
                      boxShadow: `0 2px 12px ${alpha(color, 0.08)}`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.18)}` },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: alpha(color, 0.15),
                            color: color,
                            fontWeight: 700,
                            fontSize: 16,
                          }}
                        >
                          {getInitials(con.nombre)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }} noWrap>
                            {con.nombre}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip
                              icon={<DirectionsCar sx={{ fontSize: 12 }} />}
                              label={con.placa}
                              size="small"
                              sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#0f172a', color: '#fff' }}
                            />
                            {licencia && licencia.diasRestantes !== undefined && (
                              <Chip
                                label={
                                  licencia.diasRestantes < 0
                                    ? `Vencida`
                                    : `Lic. ${licencia.diasRestantes}d`
                                }
                                size="small"
                                color={getLicenciaDiasColor(licencia.diasRestantes)}
                                sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" sx={{ color: '#64748b', mt: 0.25, display: 'block' }} noWrap>
                            Ruta: {con.ruta}
                          </Typography>
                        </Box>
                        <CompletenessCircle value={con.completitud} />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                        {con.documentos.map((doc) => (
                          <Stack key={doc.nombre} direction="row" alignItems="center" spacing={0.75}>
                            {getEstadoIcon(doc.estado)}
                            <Typography variant="caption" sx={{ color: '#475569', flex: 1 }} noWrap>
                              {doc.nombre}
                            </Typography>
                            {doc.diasRestantes !== undefined && (
                              <Chip
                                label={doc.diasRestantes < 0 ? 'Vencido' : `${doc.diasRestantes}d`}
                                size="small"
                                color={getLicenciaDiasColor(doc.diasRestantes)}
                                variant="outlined"
                                sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<Folder sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenExpediente(con, con.nombre)}
                        sx={{
                          borderColor: DMS_COLOR,
                          color: DMS_COLOR,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: alpha(DMS_COLOR, 0.06) },
                        }}
                      >
                        Ver Expediente
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* ── Tab 2: Vehículos ── */}
        <TabPanel value={tab} index={2}>
          <Alert
            severity="info"
            icon={<DirectionsCar />}
            sx={{ mb: 3, borderRadius: 2, bgcolor: alpha(DMS_COLOR, 0.06), border: `1px solid ${alpha(DMS_COLOR, 0.2)}` }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: DMS_COLOR }}>
              Integrado con FMS (Fleet Management System) — los datos se sincronizan automáticamente
            </Typography>
          </Alert>
          <Grid container spacing={2.5}>
            {vehiculos.map((veh) => {
              const color = getSemaforoColor(veh.completitud)
              const soat = veh.documentos.find((d) => d.nombre === 'SOAT')
              const rtm = veh.documentos.find((d) => d.nombre.includes('RTM'))
              return (
                <Grid key={veh.id} size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      border: `1px solid ${alpha(color, 0.25)}`,
                      boxShadow: `0 2px 12px ${alpha(color, 0.08)}`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.18)}` },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            bgcolor: alpha(DMS_COLOR, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <DirectionsCar sx={{ color: DMS_COLOR, fontSize: 24 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Chip
                            label={veh.placa}
                            size="small"
                            sx={{ height: 22, fontSize: 12, fontWeight: 800, bgcolor: '#0f172a', color: '#fff', mb: 0.5 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                            {veh.marca} {veh.modelo}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {veh.tipo}
                          </Typography>
                        </Box>
                        <CompletenessCircle value={veh.completitud} size={48} />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                        {soat && (
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {getEstadoIcon(soat.estado)}
                            <Typography variant="caption" sx={{ color: '#475569', flex: 1, fontWeight: 600 }}>
                              SOAT
                            </Typography>
                            {soat.diasRestantes !== undefined && (
                              <Chip
                                label={soat.diasRestantes < 0 ? 'Vencido' : `${soat.diasRestantes}d`}
                                size="small"
                                color={getLicenciaDiasColor(soat.diasRestantes)}
                                variant="outlined"
                                sx={{ height: 16, fontSize: 9 }}
                              />
                            )}
                          </Stack>
                        )}
                        {rtm && (
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {getEstadoIcon(rtm.estado)}
                            <Typography variant="caption" sx={{ color: '#475569', flex: 1, fontWeight: 600 }}>
                              RTM
                            </Typography>
                            {rtm.diasRestantes !== undefined && (
                              <Chip
                                label={rtm.diasRestantes < 0 ? 'Vencido' : `${rtm.diasRestantes}d`}
                                size="small"
                                color={getLicenciaDiasColor(rtm.diasRestantes)}
                                variant="outlined"
                                sx={{ height: 16, fontSize: 9 }}
                              />
                            )}
                          </Stack>
                        )}
                        {veh.documentos
                          .filter((d) => d.nombre !== 'SOAT' && !d.nombre.includes('RTM'))
                          .map((doc) => (
                            <Stack key={doc.nombre} direction="row" alignItems="center" spacing={0.75}>
                              {getEstadoIcon(doc.estado)}
                              <Typography variant="caption" sx={{ color: '#475569', flex: 1 }} noWrap>
                                {doc.nombre}
                              </Typography>
                            </Stack>
                          ))}
                      </Stack>

                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<Folder sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenExpediente(veh, `${veh.placa} — ${veh.tipo}`)}
                        sx={{
                          borderColor: DMS_COLOR,
                          color: DMS_COLOR,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: alpha(DMS_COLOR, 0.06) },
                        }}
                      >
                        Ver Expediente
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* ── Tab 3: Clientes ── */}
        <TabPanel value={tab} index={3}>
          <Alert
            severity="info"
            icon={<Business />}
            sx={{ mb: 3, borderRadius: 2, bgcolor: alpha(DMS_COLOR, 0.06), border: `1px solid ${alpha(DMS_COLOR, 0.2)}` }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: DMS_COLOR }}>
              Integrado con CRM — los datos se sincronizan automáticamente
            </Typography>
          </Alert>
          <Grid container spacing={2.5}>
            {clientes.map((cli) => {
              const color = getSemaforoColor(cli.completitud)
              return (
                <Grid key={cli.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha(color, 0.25)}`,
                      boxShadow: `0 2px 12px ${alpha(color, 0.08)}`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.18)}` },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            bgcolor: alpha('#7c3aed', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Business sx={{ color: '#7c3aed', fontSize: 24 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }} noWrap>
                            {cli.nombre}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            NIT {cli.nit}
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            <Chip
                              label={cli.ciudad}
                              size="small"
                              sx={{ height: 18, fontSize: 10, bgcolor: alpha('#7c3aed', 0.08), color: '#7c3aed' }}
                            />
                          </Stack>
                        </Box>
                        <CompletenessCircle value={cli.completitud} size={52} />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                        {cli.documentos.map((doc) => (
                          <Stack key={doc.nombre} direction="row" alignItems="center" spacing={0.75}>
                            {getEstadoIcon(doc.estado)}
                            <Typography variant="caption" sx={{ color: '#475569', flex: 1 }} noWrap>
                              {doc.nombre}
                            </Typography>
                            {doc.fechaVencimiento && (
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10 }}>
                                {doc.fechaVencimiento}
                              </Typography>
                            )}
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<Folder sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenExpediente(cli, cli.nombre)}
                        sx={{
                          borderColor: DMS_COLOR,
                          color: DMS_COLOR,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: alpha(DMS_COLOR, 0.06) },
                        }}
                      >
                        Ver Expediente
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* ── Tab 4: Proveedores ── */}
        <TabPanel value={tab} index={4}>
          <Alert
            severity="info"
            icon={<Apartment />}
            sx={{ mb: 3, borderRadius: 2, bgcolor: alpha(DMS_COLOR, 0.06), border: `1px solid ${alpha(DMS_COLOR, 0.2)}` }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: DMS_COLOR }}>
              Integrado con SRM (Supplier Relationship Management) — los datos se sincronizan automáticamente
            </Typography>
          </Alert>
          <Grid container spacing={2.5}>
            {proveedores.map((prv) => {
              const color = getSemaforoColor(prv.completitud)
              return (
                <Grid key={prv.id} size={{ xs: 12, md: 6 }}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha(color, 0.25)}`,
                      boxShadow: `0 2px 12px ${alpha(color, 0.08)}`,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.18)}` },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha('#d97706', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Apartment sx={{ color: '#d97706', fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3, mb: 0.25 }}>
                            {prv.nombre}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            NIT {prv.nit}
                          </Typography>
                          <Chip
                            label={prv.servicio}
                            size="small"
                            sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: alpha('#d97706', 0.08), color: '#d97706' }}
                          />
                        </Box>
                        <CompletenessCircle value={prv.completitud} size={52} />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Grid container spacing={1} sx={{ mb: 1.5 }}>
                        {prv.documentos.map((doc) => (
                          <Grid key={doc.nombre} size={{ xs: 12, md: 6 }}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              {getEstadoIcon(doc.estado)}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="caption" sx={{ color: '#475569' }} noWrap>
                                  {doc.nombre}
                                </Typography>
                                {doc.fechaVencimiento && (
                                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10, display: 'block' }}>
                                    Vence: {doc.fechaVencimiento}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </Grid>
                        ))}
                      </Grid>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Folder sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenExpediente(prv, prv.nombre)}
                        sx={{
                          borderColor: DMS_COLOR,
                          color: DMS_COLOR,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          '&:hover': { bgcolor: alpha(DMS_COLOR, 0.06) },
                        }}
                      >
                        Ver Expediente
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>
      </Box>

      {/* ── Dialog: Ver Expediente ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedExpediente && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: alpha(DMS_COLOR, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Folder sx={{ color: DMS_COLOR, fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {selectedLabel}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Expediente Electrónico — DMS
                  </Typography>
                </Box>
                <IconButton onClick={handleCloseDialog} size="small">
                  <Close fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
              {/* Completeness bar */}
              <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                    Completitud del expediente
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 800, color: getSemaforoColor(selectedExpediente.completitud) }}
                  >
                    {selectedExpediente.completitud}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={selectedExpediente.completitud}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha(getSemaforoColor(selectedExpediente.completitud), 0.15),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getSemaforoColor(selectedExpediente.completitud),
                      borderRadius: 4,
                    },
                  }}
                />
                <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                  {(['En orden', 'Pendiente', 'Vencido'] as Documento['estado'][]).map((est) => {
                    const cnt = selectedExpediente.documentos.filter((d) => d.estado === est).length
                    return (
                      <Stack key={est} direction="row" alignItems="center" spacing={0.5}>
                        {getEstadoIcon(est)}
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          {cnt} {est}
                        </Typography>
                      </Stack>
                    )
                  })}
                </Stack>
              </Box>

              <List disablePadding>
                {selectedExpediente.documentos.map((doc, i) => (
                  <React.Fragment key={doc.nombre}>
                    {i > 0 && <Divider />}
                    <ListItem
                      sx={{ px: 3, py: 1.5 }}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Ver documento">
                            <IconButton
                              size="small"
                              sx={{
                                color: DMS_COLOR,
                                bgcolor: alpha(DMS_COLOR, 0.06),
                                '&:hover': { bgcolor: alpha(DMS_COLOR, 0.14) },
                              }}
                            >
                              <Visibility sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Adjuntar documento">
                            <IconButton
                              size="small"
                              sx={{
                                color: '#7c3aed',
                                bgcolor: alpha('#7c3aed', 0.06),
                                '&:hover': { bgcolor: alpha('#7c3aed', 0.14) },
                              }}
                            >
                              <AttachFile sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Description sx={{ color: '#94a3b8', fontSize: 22 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {doc.nombre}
                            </Typography>
                            <Chip
                              label={doc.estado}
                              size="small"
                              color={getEstadoChipColor(doc.estado)}
                              sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                            />
                          </Stack>
                        }
                        secondary={
                          doc.fechaVencimiento ? (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              Vencimiento: {doc.fechaVencimiento}
                              {doc.diasRestantes !== undefined && doc.diasRestantes > 0
                                ? ` (${doc.diasRestantes} días restantes)`
                                : doc.diasRestantes !== undefined && doc.diasRestantes < 0
                                ? ` (vencido hace ${Math.abs(doc.diasRestantes)} días)`
                                : ''}
                            </Typography>
                          ) : undefined
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={handleCloseDialog}
                variant="outlined"
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Cerrar
              </Button>
              <Button
                variant="contained"
                startIcon={<AttachFile />}
                sx={{
                  bgcolor: DMS_COLOR,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#0c6680' },
                }}
              >
                Adjuntar documento
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Layout>
  )
}
