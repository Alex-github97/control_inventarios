import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  Button,
  alpha,
  Divider,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import {
  Shield as GarantiaIcon,
  Warning as AlertaIcon,
  CheckCircle as VerificadoIcon,
  AccessTime as ProximoIcon,
  AttachMoney as DineroIcon,
  Gavel as ReclamoIcon,
  NotificationsActive as NotifIcon,
  Assignment as DocIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Business as ProveedorIcon,
  CalendarMonth as CalendarIcon,
  Inventory2 as ActivoIcon,
  Description as FileIcon,
  Download as DownloadIcon,
  FactCheck as CoberturaIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

// ─── Constantes de tema ───────────────────────────────────────────────────────

const EAM_COLOR = '#32AC5C'
const EAM_DARK  = '#27884A'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoGarantia   = 'ACTIVO' | 'REPUESTO' | 'SERVICIO'
type EstadoGarantia = 'VIGENTE' | 'VENCIDA' | 'RECLAMADA'
type EstadoReclamo  = 'EN_PROCESO' | 'APROBADA' | 'RECHAZADA' | 'CERRADA'

interface Garantia {
  id: number
  descripcion: string
  activo: string
  tipo: TipoGarantia
  proveedor: string
  numeroGarantia: string
  inicio: string
  vencimiento: string
  diasRestantes: number
  valorCubierto: string
  estado: EstadoGarantia
  // Campos enriquecidos para el detalle
  cobertura: string[]
  contactoProveedor: string
  telefonoProveedor: string
  documento: string
  condiciones: string
  responsable: string
}

interface GarantiaVencer {
  id: number
  descripcion: string
  activo: string
  proveedor: string
  vencimiento: string
  diasRestantes: number
  valorCubierto: string
  numeroGarantia: string
  cobertura: string
  accionRecomendada: string
}

interface Reclamacion {
  id: number
  fecha: string
  garantia: string
  descripcionReclamo: string
  montoSolicitado: string
  montoRecuperado: string
  estado: EstadoReclamo
  proveedor: string
  activo: string
  responsable: string
  resolucion: string
  diasGestion: number
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

const GARANTIAS_MOCK: Garantia[] = [
  {
    id: 1,
    descripcion: 'Motor Cummins ISX 15L – Tracto 001',
    activo: 'Tracto TF-001',
    tipo: 'ACTIVO',
    proveedor: 'Cummins Colombia S.A.S.',
    numeroGarantia: 'GAR-2024-0041',
    inicio: '2024-01-15',
    vencimiento: '2026-01-15',
    diasRestantes: 209,
    valorCubierto: '$85,000,000',
    estado: 'VIGENTE',
    cobertura: ['Defectos de manufactura', 'Consumo de aceite anormal', 'Falla de inyección', 'Bloque y culata'],
    contactoProveedor: 'Ing. Ricardo Peña',
    telefonoProveedor: '+57 1 745 8800',
    documento: 'Contrato-Cummins-2024-0041.pdf',
    condiciones: 'Cobertura por 24 meses o 250.000 km. Requiere PM en centro autorizado cada 20.000 km.',
    responsable: 'Jorge Méndez',
  },
  {
    id: 2,
    descripcion: 'Transmisión Eaton Fuller – Tracto 003',
    activo: 'Tracto TF-003',
    tipo: 'REPUESTO',
    proveedor: 'Eaton Distribuidores Ltda.',
    numeroGarantia: 'GAR-2024-0058',
    inicio: '2024-03-10',
    vencimiento: '2025-09-10',
    diasRestantes: 82,
    valorCubierto: '$42,000,000',
    estado: 'VIGENTE',
    cobertura: ['Sincronizadores', 'Caja de cambios', 'Sellos y retenedores'],
    contactoProveedor: 'Sra. Marta Gómez',
    telefonoProveedor: '+57 4 512 3300',
    documento: 'Garantia-Eaton-0058.pdf',
    condiciones: 'Cobertura por 18 meses. Excluye daños por uso indebido o sobrecarga.',
    responsable: 'Carlos Díaz',
  },
  {
    id: 3,
    descripcion: 'Contrato Servicio Carrocería – Furgón FL-007',
    activo: 'Furgón FL-007',
    tipo: 'SERVICIO',
    proveedor: 'Carrocerías Andinas S.A.',
    numeroGarantia: 'GAR-2023-0112',
    inicio: '2023-06-01',
    vencimiento: '2025-06-01',
    diasRestantes: -19,
    valorCubierto: '$18,500,000',
    estado: 'VENCIDA',
    cobertura: ['Estructura de furgón', 'Pintura', 'Sellado y hermeticidad'],
    contactoProveedor: 'Ing. Andrés Ruiz',
    telefonoProveedor: '+57 2 480 1122',
    documento: 'Contrato-Andinas-0112.pdf',
    condiciones: 'Cobertura por 24 meses sobre defectos de fabricación de carrocería. Vencida.',
    responsable: 'Ana Rojas',
  },
  {
    id: 4,
    descripcion: 'Montacargas Toyota 8FBN25 – Bodega Cali',
    activo: 'Montacargas MC-002',
    tipo: 'ACTIVO',
    proveedor: 'Toyota Tsusho Latam',
    numeroGarantia: 'GAR-2024-0077',
    inicio: '2024-05-20',
    vencimiento: '2027-05-20',
    diasRestantes: 699,
    valorCubierto: '$120,000,000',
    estado: 'VIGENTE',
    cobertura: ['Motor', 'Sistema hidráulico', 'Mástil', 'Transmisión', 'Sistema eléctrico'],
    contactoProveedor: 'Ing. Pablo Morales',
    telefonoProveedor: '+57 2 660 4400',
    documento: 'Garantia-Toyota-0077.pdf',
    condiciones: 'Cobertura integral 36 meses o 6.000 horas. Mantenimiento por técnico certificado Toyota.',
    responsable: 'Luis Vargas',
  },
  {
    id: 5,
    descripcion: 'Eje Trasero Meritor – Bus BP-012',
    activo: 'Bus BP-012',
    tipo: 'REPUESTO',
    proveedor: 'Meritor WABCO Colombia',
    numeroGarantia: 'GAR-2024-0033',
    inicio: '2024-02-08',
    vencimiento: '2026-02-08',
    diasRestantes: 233,
    valorCubierto: '$28,000,000',
    estado: 'VIGENTE',
    cobertura: ['Diferencial', 'Rodamientos', 'Semiejes'],
    contactoProveedor: 'Sr. Julián Castro',
    telefonoProveedor: '+57 1 388 7700',
    documento: 'Garantia-Meritor-0033.pdf',
    condiciones: 'Cobertura 24 meses sin límite de kilometraje para uso urbano.',
    responsable: 'Pedro Torres',
  },
  {
    id: 6,
    descripcion: 'Compresor HVAC – Camioneta CM-021',
    activo: 'Camioneta CM-021',
    tipo: 'REPUESTO',
    proveedor: 'Sanden Automotive',
    numeroGarantia: 'GAR-2023-0098',
    inicio: '2023-09-15',
    vencimiento: '2025-09-15',
    diasRestantes: 87,
    valorCubierto: '$8,200,000',
    estado: 'VIGENTE',
    cobertura: ['Compresor', 'Válvula de expansión', 'Sellos'],
    contactoProveedor: 'Sra. Laura Nieto',
    telefonoProveedor: '+57 1 655 2210',
    documento: 'Garantia-Sanden-0098.pdf',
    condiciones: 'Cobertura 24 meses. Requiere recarga de refrigerante con producto homologado.',
    responsable: 'Carlos Díaz',
  },
  {
    id: 7,
    descripcion: 'Mantenimiento Preventivo Flota – Contrato Marco',
    activo: 'Flota General',
    tipo: 'SERVICIO',
    proveedor: 'AutoServicios del Valle S.A.',
    numeroGarantia: 'GAR-2024-0019',
    inicio: '2024-01-01',
    vencimiento: '2024-12-31',
    diasRestantes: -171,
    valorCubierto: '$95,000,000',
    estado: 'RECLAMADA',
    cobertura: ['SLA de respuesta', 'Repuestos de PM', 'Mano de obra', 'Disponibilidad de flota'],
    contactoProveedor: 'Ing. Fernando Ríos',
    telefonoProveedor: '+57 2 720 9900',
    documento: 'ContratoMarco-Valle-0019.pdf',
    condiciones: 'Contrato anual con SLA de 4 horas de respuesta. En reclamación por incumplimiento.',
    responsable: 'Marco Vargas',
  },
  {
    id: 8,
    descripcion: 'Diferencial Dana Spicer – Tracto TF-009',
    activo: 'Tracto TF-009',
    tipo: 'REPUESTO',
    proveedor: 'Dana Incorporated Colombia',
    numeroGarantia: 'GAR-2024-0091',
    inicio: '2024-06-01',
    vencimiento: '2026-06-01',
    diasRestantes: 346,
    valorCubierto: '$35,000,000',
    estado: 'VIGENTE',
    cobertura: ['Corona y piñón', 'Carcasa', 'Rodamientos'],
    contactoProveedor: 'Ing. Camilo Suárez',
    telefonoProveedor: '+57 1 411 6600',
    documento: 'Garantia-Dana-0091.pdf',
    condiciones: 'Cobertura 24 meses / 200.000 km. Requiere aceite especificado por Dana.',
    responsable: 'Jorge Méndez',
  },
  {
    id: 9,
    descripcion: 'Sistema Frenos ABS – Camión CM-005',
    activo: 'Camión CM-005',
    tipo: 'REPUESTO',
    proveedor: 'Bosch Automotive Colombia',
    numeroGarantia: 'GAR-2023-0145',
    inicio: '2023-11-20',
    vencimiento: '2025-11-20',
    diasRestantes: 153,
    valorCubierto: '$15,600,000',
    estado: 'VIGENTE',
    cobertura: ['Módulo ABS', 'Sensores de rueda', 'Bomba hidráulica'],
    contactoProveedor: 'Sr. Diego Ramírez',
    telefonoProveedor: '+57 1 220 5544',
    documento: 'Garantia-Bosch-0145.pdf',
    condiciones: 'Cobertura 24 meses sobre componentes electrónicos. Excluye desgaste de pastillas.',
    responsable: 'Pedro Torres',
  },
  {
    id: 10,
    descripcion: 'Estructura Metálica Plataforma – PL-003',
    activo: 'Plataforma PL-003',
    tipo: 'ACTIVO',
    proveedor: 'Metalmecánica Industrial Ltda.',
    numeroGarantia: 'GAR-2022-0204',
    inicio: '2022-12-01',
    vencimiento: '2024-12-01',
    diasRestantes: -201,
    valorCubierto: '$22,000,000',
    estado: 'VENCIDA',
    cobertura: ['Estructura metálica', 'Soldaduras', 'Recubrimiento anticorrosivo'],
    contactoProveedor: 'Ing. Sofía Herrera',
    telefonoProveedor: '+57 4 355 8811',
    documento: 'Garantia-Metalmecanica-0204.pdf',
    condiciones: 'Cobertura 24 meses sobre defectos estructurales. Vencida.',
    responsable: 'Diana Castro',
  },
]

const GARANTIAS_POR_VENCER: GarantiaVencer[] = [
  {
    id: 1,
    descripcion: 'Inyectores Bosch – Tracto TF-014',
    activo: 'Tracto TF-014',
    proveedor: 'Bosch Automotive Colombia',
    vencimiento: '2025-06-24',
    diasRestantes: 4,
    valorCubierto: '$12,400,000',
    numeroGarantia: 'GAR-2023-0161',
    cobertura: 'Defectos de inyección y sellos',
    accionRecomendada: 'Inspeccionar inyectores antes del vencimiento y documentar estado.',
  },
  {
    id: 2,
    descripcion: 'Bomba Hidráulica – Montacargas MC-005',
    activo: 'Montacargas MC-005',
    proveedor: 'Toyota Tsusho Latam',
    vencimiento: '2025-06-27',
    diasRestantes: 7,
    valorCubierto: '$9,800,000',
    numeroGarantia: 'GAR-2023-0172',
    cobertura: 'Bomba y circuito hidráulico',
    accionRecomendada: 'Solicitar prueba de presión hidráulica bajo garantía.',
  },
  {
    id: 3,
    descripcion: 'Alternador Prestolite – Bus BP-008',
    activo: 'Bus BP-008',
    proveedor: 'Prestolite Electric',
    vencimiento: '2025-07-02',
    diasRestantes: 12,
    valorCubierto: '$5,100,000',
    numeroGarantia: 'GAR-2023-0180',
    cobertura: 'Alternador y regulador',
    accionRecomendada: 'Verificar carga de batería y salida del alternador.',
  },
  {
    id: 4,
    descripcion: 'Turbocompresor Holset – Tracto TF-022',
    activo: 'Tracto TF-022',
    proveedor: 'Cummins Colombia S.A.S.',
    vencimiento: '2025-07-05',
    diasRestantes: 15,
    valorCubierto: '$18,700,000',
    numeroGarantia: 'GAR-2023-0188',
    cobertura: 'Turbo y actuador de geometría variable',
    accionRecomendada: 'Termografía de turbo y revisión de holguras.',
  },
  {
    id: 5,
    descripcion: 'Garantía Pintura Cabina – TF-016',
    activo: 'Tracto TF-016',
    proveedor: 'Carrocerías Andinas S.A.',
    vencimiento: '2025-07-10',
    diasRestantes: 20,
    valorCubierto: '$3,200,000',
    numeroGarantia: 'GAR-2023-0193',
    cobertura: 'Pintura y anticorrosivo de cabina',
    accionRecomendada: 'Registro fotográfico de estado de pintura.',
  },
  {
    id: 6,
    descripcion: 'Filtros de Aire – Camión CM-011',
    activo: 'Camión CM-011',
    proveedor: 'Mann+Hummel Colombia',
    vencimiento: '2025-07-14',
    diasRestantes: 24,
    valorCubierto: '$1,800,000',
    numeroGarantia: 'GAR-2023-0199',
    cobertura: 'Sistema de filtración de aire',
    accionRecomendada: 'Evaluar reemplazo bajo garantía antes de expirar.',
  },
  {
    id: 7,
    descripcion: 'Caja de Cambios ZF – Tracto TF-030',
    activo: 'Tracto TF-030',
    proveedor: 'ZF Friedrichshafen AG',
    vencimiento: '2025-07-18',
    diasRestantes: 28,
    valorCubierto: '$48,000,000',
    numeroGarantia: 'GAR-2023-0205',
    cobertura: 'Caja de cambios automática',
    accionRecomendada: 'Análisis de aceite de transmisión y reporte a ZF.',
  },
  {
    id: 8,
    descripcion: 'Suspensión Neumática – Semirremolque SR-007',
    activo: 'Semirremolque SR-007',
    proveedor: 'Wabco Holdings',
    vencimiento: '2025-07-20',
    diasRestantes: 30,
    valorCubierto: '$22,500,000',
    numeroGarantia: 'GAR-2023-0210',
    cobertura: 'Fuelles, válvulas y compresor',
    accionRecomendada: 'Inspección de fugas neumáticas y nivelación.',
  },
]

const RECLAMACIONES_MOCK: Reclamacion[] = [
  {
    id: 1,
    fecha: '2025-03-10',
    garantia: 'GAR-2023-0098',
    descripcionReclamo: 'Falla prematura en compresor HVAC a 18 meses de instalación',
    montoSolicitado: '$8,200,000',
    montoRecuperado: '$7,500,000',
    estado: 'CERRADA',
    proveedor: 'Sanden Automotive',
    activo: 'Camioneta CM-021',
    responsable: 'Carlos Díaz',
    resolucion: 'Proveedor reconoció defecto de fábrica. Reembolso parcial acordado y compresor reemplazado.',
    diasGestion: 42,
  },
  {
    id: 2,
    fecha: '2025-04-02',
    garantia: 'GAR-2024-0019',
    descripcionReclamo: 'Incumplimiento en tiempos de respuesta del contrato de mantenimiento',
    montoSolicitado: '$95,000,000',
    montoRecuperado: '$68,000,000',
    estado: 'CERRADA',
    proveedor: 'AutoServicios del Valle S.A.',
    activo: 'Flota General',
    responsable: 'Marco Vargas',
    resolucion: 'Penalización por SLA aplicada. Se renegoció el contrato con nuevos indicadores de servicio.',
    diasGestion: 68,
  },
  {
    id: 3,
    fecha: '2025-04-28',
    garantia: 'GAR-2024-0041',
    descripcionReclamo: 'Consumo excesivo de aceite en motor ISX – defecto de manufactura',
    montoSolicitado: '$42,000,000',
    montoRecuperado: '$38,000,000',
    estado: 'APROBADA',
    proveedor: 'Cummins Colombia S.A.S.',
    activo: 'Tracto TF-001',
    responsable: 'Jorge Méndez',
    resolucion: 'Reclamo aprobado por Cummins. Overhaul de motor programado bajo garantía.',
    diasGestion: 21,
  },
  {
    id: 4,
    fecha: '2025-05-14',
    garantia: 'GAR-2023-0145',
    descripcionReclamo: 'Falla en sensor ABS a los 8 meses de instalación',
    montoSolicitado: '$15,600,000',
    montoRecuperado: '$0',
    estado: 'RECHAZADA',
    proveedor: 'Bosch Automotive Colombia',
    activo: 'Camión CM-005',
    responsable: 'Pedro Torres',
    resolucion: 'Reclamo rechazado: daño atribuido a instalación por terceros no autorizados.',
    diasGestion: 30,
  },
  {
    id: 5,
    fecha: '2025-05-30',
    garantia: 'GAR-2024-0058',
    descripcionReclamo: 'Desgaste anormal en sincronizadores de transmisión Eaton',
    montoSolicitado: '$28,000,000',
    montoRecuperado: '$21,500,000',
    estado: 'EN_PROCESO',
    proveedor: 'Eaton Distribuidores Ltda.',
    activo: 'Tracto TF-003',
    responsable: 'Carlos Díaz',
    resolucion: 'En evaluación técnica por parte del proveedor. Peritaje en curso.',
    diasGestion: 12,
  },
  {
    id: 6,
    fecha: '2025-06-10',
    garantia: 'GAR-2024-0077',
    descripcionReclamo: 'Fuga hidráulica en mástil de montacargas',
    montoSolicitado: '$12,000,000',
    montoRecuperado: '$0',
    estado: 'EN_PROCESO',
    proveedor: 'Toyota Tsusho Latam',
    activo: 'Montacargas MC-002',
    responsable: 'Luis Vargas',
    resolucion: 'Pendiente inspección de técnico certificado Toyota.',
    diasGestion: 5,
  },
]

const PROVEEDORES_SELECT = [
  'Cummins Colombia S.A.S.',
  'Eaton Distribuidores Ltda.',
  'Carrocerías Andinas S.A.',
  'Toyota Tsusho Latam',
  'Meritor WABCO Colombia',
  'Sanden Automotive',
  'AutoServicios del Valle S.A.',
  'Dana Incorporated Colombia',
  'Bosch Automotive Colombia',
  'Metalmecánica Industrial Ltda.',
]

const RESPONSABLES_SELECT = [
  'Jorge Méndez',
  'Luis Vargas',
  'Ana Rojas',
  'Carlos Díaz',
  'Pedro Torres',
  'Marco Vargas',
  'Diana Castro',
]

// ─── Helpers de color ─────────────────────────────────────────────────────────

function colorPorDias(dias: number): string {
  if (dias <= 7) return '#EF4444'
  if (dias <= 15) return '#32AC5C'
  return '#EAB308'
}

function labelPorDias(dias: number): string {
  if (dias <= 7) return 'CRÍTICO'
  if (dias <= 15) return 'URGENTE'
  return 'PRÓXIMO'
}

function colorEstadoGarantia(estado: EstadoGarantia): string {
  switch (estado) {
    case 'VIGENTE':   return '#16A34A'
    case 'VENCIDA':   return '#6B7280'
    case 'RECLAMADA': return '#3B82F6'
  }
}

function colorEstadoReclamo(estado: EstadoReclamo): string {
  switch (estado) {
    case 'EN_PROCESO': return '#F59E0B'
    case 'APROBADA':   return '#16A34A'
    case 'RECHAZADA':  return '#EF4444'
    case 'CERRADA':    return '#6B7280'
  }
}

function labelEstadoReclamo(estado: EstadoReclamo): string {
  switch (estado) {
    case 'EN_PROCESO': return 'En Proceso'
    case 'APROBADA':   return 'Aprobada'
    case 'RECHAZADA':  return 'Rechazada'
    case 'CERRADA':    return 'Cerrada'
  }
}

function colorTipo(tipo: TipoGarantia): string {
  switch (tipo) {
    case 'ACTIVO':   return '#8B5CF6'
    case 'REPUESTO': return '#06B6D4'
    case 'SERVICIO': return '#F59E0B'
  }
}

const parseMoney = (s: string): number => parseFloat(s.replace(/[^0-9.]/g, '')) || 0
const formatCOP = (v: number): string =>
  '$' + Math.round(v).toLocaleString('es-CO')

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface KPIBoxProps {
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}

function KPIBox({ label, value, color, icon, sub }: KPIBoxProps) {
  return (
    <Card
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: 2,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography
            variant="caption"
            sx={{
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: '0.68rem',
            }}
          >
            {label}
          </Typography>
        </Stack>
        <Typography variant="h5" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: '#6B7280', mt: 0.5, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// Fila de detalle etiqueta / valor
function DetalleItem({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <Box>
      <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Typography>
      <Typography
        fontSize={13}
        fontWeight={600}
        color="#1E293B"
        sx={{ wordBreak: 'break-word', fontFamily: mono ? 'monospace' : undefined }}
      >
        {value}
      </Typography>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

let _nextId = 1000
const nextId = () => _nextId++

export default function EAMGarantias() {
  const [tabActual, setTabActual] = useState(0)

  // Datos mutables
  const [garantias, setGarantias] = useState<Garantia[]>(GARANTIAS_MOCK)
  const [reclamaciones, setReclamaciones] = useState<Reclamacion[]>(RECLAMACIONES_MOCK)

  // Snackbar global
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({
    open: false, msg: '', sev: 'success',
  })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') =>
    setSnack({ open: true, msg, sev })

  // Filtros / búsqueda (Tab 0)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')

  // Filtro reclamaciones (Tab 2)
  const [filterEstadoRec, setFilterEstadoRec] = useState('Todos')

  // Diálogo detalle garantía
  const [garantiaSel, setGarantiaSel] = useState<Garantia | null>(null)
  // Diálogo detalle garantía por vencer
  const [porVencerSel, setPorVencerSel] = useState<GarantiaVencer | null>(null)
  // Diálogo detalle reclamación
  const [reclamoSel, setReclamoSel] = useState<Reclamacion | null>(null)

  // Diálogo crear garantía
  const [crearOpen, setCrearOpen] = useState(false)
  const EMPTY_FORM = {
    descripcion: '', activo: '', tipo: 'ACTIVO' as TipoGarantia,
    proveedor: '', inicio: '', vencimiento: '', valorCubierto: '',
    condiciones: '', responsable: '',
  }
  const [form, setForm] = useState(EMPTY_FORM)
  const setField = (k: keyof typeof EMPTY_FORM, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const diasEntre = (venc: string): number => {
    if (!venc) return 0
    const hoy = new Date()
    const v = new Date(venc + 'T00:00')
    return Math.round((v.getTime() - hoy.getTime()) / 86400000)
  }

  const crearGarantia = () => {
    const dias = diasEntre(form.vencimiento)
    const nueva: Garantia = {
      id: nextId(),
      descripcion: form.descripcion || 'Nueva garantía',
      activo: form.activo || '—',
      tipo: form.tipo,
      proveedor: form.proveedor || '—',
      numeroGarantia: `GAR-2026-${String(garantias.length + 41).padStart(4, '0')}`,
      inicio: form.inicio || new Date().toISOString().slice(0, 10),
      vencimiento: form.vencimiento || '—',
      diasRestantes: dias,
      valorCubierto: form.valorCubierto ? formatCOP(parseMoney(form.valorCubierto)) : '$0',
      estado: dias < 0 ? 'VENCIDA' : 'VIGENTE',
      cobertura: ['Cobertura general del proveedor'],
      contactoProveedor: '—',
      telefonoProveedor: '—',
      documento: 'Documento pendiente de cargar',
      condiciones: form.condiciones || 'Sin condiciones especificadas.',
      responsable: form.responsable || 'Sin asignar',
    }
    setGarantias((prev) => [nueva, ...prev])
    setCrearOpen(false)
    setForm(EMPTY_FORM)
    notify(`Garantía ${nueva.numeroGarantia} creada correctamente`)
  }

  // Reclamaciones asociadas a una garantía
  const reclamosDe = (numeroGarantia: string) =>
    reclamaciones.filter((r) => r.garantia === numeroGarantia)

  const registrarReclamo = (g: Garantia) => {
    const nuevo: Reclamacion = {
      id: nextId(),
      fecha: new Date().toISOString().slice(0, 10),
      garantia: g.numeroGarantia,
      descripcionReclamo: `Reclamación abierta sobre ${g.descripcion}`,
      montoSolicitado: g.valorCubierto,
      montoRecuperado: '$0',
      estado: 'EN_PROCESO',
      proveedor: g.proveedor,
      activo: g.activo,
      responsable: g.responsable,
      resolucion: 'Reclamo recién abierto. Pendiente de gestión con el proveedor.',
      diasGestion: 0,
    }
    setReclamaciones((prev) => [nuevo, ...prev])
    setGarantias((prev) => prev.map((x) => (x.id === g.id ? { ...x, estado: 'RECLAMADA' } : x)))
    setGarantiaSel((prev) => (prev && prev.id === g.id ? { ...prev, estado: 'RECLAMADA' } : prev))
    notify(`Reclamación registrada para ${g.numeroGarantia}`, 'info')
  }

  // ── Filtrado ──
  const garantiasFiltradas = useMemo(() => garantias.filter((g) => {
    if (filterTipo !== 'Todos' && g.tipo !== filterTipo) return false
    if (filterEstado !== 'Todos' && g.estado !== filterEstado) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (
        !g.descripcion.toLowerCase().includes(q) &&
        !g.activo.toLowerCase().includes(q) &&
        !g.proveedor.toLowerCase().includes(q) &&
        !g.numeroGarantia.toLowerCase().includes(q)
      ) return false
    }
    return true
  }), [garantias, filterTipo, filterEstado, search])

  const reclamacionesFiltradas = useMemo(() => reclamaciones.filter((r) => {
    if (filterEstadoRec !== 'Todos' && r.estado !== filterEstadoRec) return false
    return true
  }), [reclamaciones, filterEstadoRec])

  // KPIs derivados
  const kpiVigentes = garantias.filter((g) => g.estado === 'VIGENTE').length
  const kpiPorVencer = garantias.filter((g) => g.estado === 'VIGENTE' && g.diasRestantes <= 90 && g.diasRestantes >= 0).length
  const kpiVencidas = garantias.filter((g) => g.estado === 'VENCIDA').length
  const kpiValorTotal = garantias.reduce((s, g) => s + parseMoney(g.valorCubierto), 0)

  const totalSolicitado = reclamaciones.reduce((s, r) => s + parseMoney(r.montoSolicitado), 0)
  const totalRecuperado = reclamaciones.reduce((s, r) => s + parseMoney(r.montoRecuperado), 0)
  const tasaRecuperacion = totalSolicitado > 0 ? Math.round((totalRecuperado / totalSolicitado) * 100) : 0

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: '#1E293B' },
    '& label': { color: '#64748B' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.5)' },
    '& .MuiSvgIcon-root': { color: '#94A3B8' },
  }

  const dialogPaperSx = {
    bgcolor: '#FFFFFF',
    border: `1px solid ${alpha(EAM_COLOR, 0.3)}`,
    borderRadius: '16px',
  }

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 3 } }}>
        {/* Encabezado */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: alpha(EAM_COLOR, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: EAM_COLOR,
              flexShrink: 0,
            }}
          >
            <GarantiaIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
              Gestión de Garantías
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              EAM · ICOLTRANS — Control de cobertura, alertas y reclamaciones
            </Typography>
          </Box>
          <Box flex={1} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: '0.9rem' }} />}
            onClick={() => notify('Reporte de garantías exportado a Excel')}
            sx={{
              borderColor: alpha(EAM_COLOR, 0.4),
              color: EAM_COLOR,
              fontSize: '0.75rem',
              textTransform: 'none',
              '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) },
            }}
          >
            Exportar Reporte
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: '0.9rem' }} />}
            onClick={() => setCrearOpen(true)}
            sx={{
              bgcolor: EAM_COLOR,
              fontSize: '0.75rem',
              textTransform: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              '&:hover': { bgcolor: EAM_DARK },
            }}
          >
            Nueva Garantía
          </Button>
        </Stack>

        {/* Tabs */}
        <Paper
          sx={{
            bgcolor: '#FFFFFF',
            borderRadius: 2,
            border: `1px solid ${alpha('#000', 0.07)}`,
            mb: 3,
          }}
        >
          <Tabs
            value={tabActual}
            onChange={(_e, v: number) => setTabActual(v)}
            TabIndicatorProps={{ style: { backgroundColor: EAM_COLOR } }}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                color: '#6B7280',
                textTransform: 'none',
                fontSize: '0.85rem',
                minHeight: 48,
                '&.Mui-selected': { color: EAM_COLOR, fontWeight: 600 },
              },
            }}
          >
            <Tab label="Garantías Vigentes" />
            <Tab
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Por Vencer</span>
                  <Chip
                    label={String(GARANTIAS_POR_VENCER.length)}
                    size="small"
                    sx={{
                      bgcolor: alpha('#EAB308', 0.2),
                      color: '#EAB308',
                      height: 16,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                </Stack>
              }
            />
            <Tab
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Reclamaciones</span>
                  <Chip
                    label={String(reclamaciones.length)}
                    size="small"
                    sx={{
                      bgcolor: alpha('#3B82F6', 0.2),
                      color: '#3B82F6',
                      height: 16,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                </Stack>
              }
            />
          </Tabs>
        </Paper>

        {/* ── Tab 0: Garantías Vigentes ── */}
        {tabActual === 0 && (
          <Box>
            {/* KPIs */}
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Garantías Vigentes" value={String(kpiVigentes)} color="#16A34A" icon={<VerificadoIcon />} sub="Activas y en cobertura" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Por Vencer (<90 días)" value={String(kpiPorVencer)} color="#EAB308" icon={<ProximoIcon />} sub="Requieren atención" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Garantías Vencidas" value={String(kpiVencidas)} color="#6B7280" icon={<AlertaIcon />} sub="Sin cobertura activa" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Valor Cubierto Total" value={formatCOP(kpiValorTotal)} color={EAM_COLOR} icon={<DineroIcon />} sub="Cobertura acumulada" />
              </Grid>
            </Grid>

            {/* Filtros */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                placeholder="Buscar descripción, activo, proveedor o Nº…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 280, flex: 1, ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Tipo" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                {['Todos', 'ACTIVO', 'REPUESTO', 'SERVICIO'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Estado" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                {['Todos', 'VIGENTE', 'VENCIDA', 'RECLAMADA'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>

            <Typography fontSize={12} color="#94A3B8" mb={1}>
              {garantiasFiltradas.length} garantía{garantiasFiltradas.length !== 1 ? 's' : ''} · haz clic en una fila para ver el detalle completo
            </Typography>

            {/* Tabla */}
            <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', borderRadius: 2, border: `1px solid ${alpha('#000', 0.06)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        bgcolor: alpha(EAM_COLOR, 0.08),
                        color: '#64748B',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        borderBottom: `1px solid ${alpha('#000', 0.08)}`,
                      },
                    }}
                  >
                    <TableCell>Descripción</TableCell>
                    <TableCell>Activo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Nº Garantía</TableCell>
                    <TableCell>Inicio</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="center">Días Rest.</TableCell>
                    <TableCell>Valor Cubierto</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {garantiasFiltradas.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => setGarantiaSel(row)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.12s',
                        '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) },
                        '& td': {
                          borderBottom: `1px solid ${alpha('#000', 0.05)}`,
                          color: '#334155',
                          fontSize: '0.8rem',
                          py: 1.2,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#1E293B', fontSize: '0.8rem', fontWeight: 500 }}>
                          {row.descripcion}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.activo}</TableCell>
                      <TableCell>
                        <Chip label={row.tipo} size="small" sx={{ bgcolor: alpha(colorTipo(row.tipo), 0.15), color: colorTipo(row.tipo), fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>{row.proveedor}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important', color: '#64748B !important' }}>
                        {row.numeroGarantia}
                      </TableCell>
                      <TableCell>{row.inicio}</TableCell>
                      <TableCell>{row.vencimiento}</TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: row.diasRestantes > 30 ? '#16A34A' : row.diasRestantes > 0 ? '#EAB308' : '#6B7280' }}>
                          {row.diasRestantes}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: `${EAM_COLOR} !important`, fontWeight: 600 }}>
                        {row.valorCubierto}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.estado} size="small" sx={{ bgcolor: alpha(colorEstadoGarantia(row.estado), 0.15), color: colorEstadoGarantia(row.estado), fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {garantiasFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4, color: '#94A3B8' }}>
                        No se encontraron garantías con los filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Tab 1: Por Vencer ── */}
        {tabActual === 1 && (
          <Box>
            <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2 }}>
              Garantías ordenadas por proximidad de vencimiento (próximos 30 días). Haz clic en una tarjeta para ver el detalle y las acciones sugeridas.
            </Typography>
            <Stack spacing={2}>
              {GARANTIAS_POR_VENCER.map((g) => {
                const color = colorPorDias(g.diasRestantes)
                const nivel = labelPorDias(g.diasRestantes)
                return (
                  <Card
                    key={g.id}
                    onClick={() => setPorVencerSel(g)}
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: `1px solid ${alpha(color, 0.35)}`,
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s, transform 0.05s',
                      '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.09)' },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
                        <Box flex={1}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Chip label={nivel} size="small" sx={{ bgcolor: alpha(color, 0.2), color, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Vence: {g.vencimiento}</Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mb: 0.5 }}>
                            {g.descripcion}
                          </Typography>
                          <Stack direction="row" spacing={3} flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Activo: <span style={{ color: '#334155' }}>{g.activo}</span></Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Proveedor: <span style={{ color: '#334155' }}>{g.proveedor}</span></Typography>
                            <Typography variant="caption" sx={{ color: '#9CA3AF' }}>Valor: <span style={{ color: EAM_COLOR, fontWeight: 600 }}>{g.valorCubierto}</span></Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={2} flexShrink={0}>
                          <Box textAlign="center">
                            <Typography variant="h4" sx={{ color, fontWeight: 800, lineHeight: 1 }}>{g.diasRestantes}</Typography>
                            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.65rem' }}>días restantes</Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<NotifIcon sx={{ fontSize: '0.9rem' }} />}
                            onClick={(e) => { e.stopPropagation(); notify(`Alerta de vencimiento generada para ${g.numeroGarantia}`, 'warning') }}
                            sx={{
                              borderColor: alpha(color, 0.5),
                              color,
                              fontSize: '0.72rem',
                              textTransform: 'none',
                              whiteSpace: 'nowrap',
                              '&:hover': { borderColor: color, bgcolor: alpha(color, 0.08) },
                            }}
                          >
                            Generar Alerta
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          </Box>
        )}

        {/* ── Tab 2: Reclamaciones ── */}
        {tabActual === 2 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPIBox label="Tasa de Recuperación" value={`${tasaRecuperacion}%`} color="#16A34A" icon={<VerificadoIcon />} sub="Sobre total reclamado" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPIBox label="Total Reclamado" value={formatCOP(totalSolicitado)} color="#EF4444" icon={<ReclamoIcon />} sub="Histórico acumulado" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPIBox label="Total Recuperado" value={formatCOP(totalRecuperado)} color={EAM_COLOR} icon={<DineroIcon />} sub="Valor efectivamente cobrado" />
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: alpha('#000', 0.07), mb: 2 }} />

            {/* Filtro */}
            <Stack direction="row" spacing={1.5} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Estado del reclamo" value={filterEstadoRec} onChange={(e) => setFilterEstadoRec(e.target.value)} sx={{ minWidth: 190, ...inputSx }}>
                {['Todos', 'EN_PROCESO', 'APROBADA', 'RECHAZADA', 'CERRADA'].map((o) => (
                  <MenuItem key={o} value={o}>{o === 'Todos' ? 'Todos' : labelEstadoReclamo(o as EstadoReclamo)}</MenuItem>
                ))}
              </TextField>
              <Typography fontSize={12} color="#94A3B8">
                {reclamacionesFiltradas.length} reclamación{reclamacionesFiltradas.length !== 1 ? 'es' : ''} · haz clic en una fila para ver el detalle
              </Typography>
            </Stack>

            <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', borderRadius: 2, border: `1px solid ${alpha('#000', 0.06)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        bgcolor: alpha(EAM_COLOR, 0.08),
                        color: '#64748B',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        borderBottom: `1px solid ${alpha('#000', 0.08)}`,
                      },
                    }}
                  >
                    <TableCell>Fecha</TableCell>
                    <TableCell>Garantía</TableCell>
                    <TableCell>Descripción del Reclamo</TableCell>
                    <TableCell>Monto Solicitado</TableCell>
                    <TableCell>Monto Recuperado</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell>Proveedor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reclamacionesFiltradas.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => setReclamoSel(r)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.12s',
                        '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) },
                        '& td': {
                          borderBottom: `1px solid ${alpha('#000', 0.05)}`,
                          color: '#334155',
                          fontSize: '0.8rem',
                          py: 1.2,
                        },
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important', color: '#64748B !important' }}>{r.fecha}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important', color: '#64748B !important' }}>{r.garantia}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#1E293B', fontSize: '0.8rem', fontWeight: 500, maxWidth: 300 }}>
                          {r.descripcionReclamo}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: '#EF4444 !important', fontWeight: 600 }}>{r.montoSolicitado}</TableCell>
                      <TableCell sx={{ color: `${r.montoRecuperado === '$0' ? '#6B7280' : '#16A34A'} !important`, fontWeight: 600 }}>{r.montoRecuperado}</TableCell>
                      <TableCell align="center">
                        <Chip label={labelEstadoReclamo(r.estado)} size="small" sx={{ bgcolor: alpha(colorEstadoReclamo(r.estado), 0.15), color: colorEstadoReclamo(r.estado), fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>{r.proveedor}</TableCell>
                    </TableRow>
                  ))}
                  {reclamacionesFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94A3B8' }}>
                        No hay reclamaciones con el filtro aplicado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* ═══ Diálogo: Detalle de Garantía ═══ */}
      <Dialog open={!!garantiaSel} onClose={() => setGarantiaSel(null)} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {garantiaSel && (() => {
          const g = garantiaSel
          const color = colorEstadoGarantia(g.estado)
          const recs = reclamosDe(g.numeroGarantia)
          const totalReclamado = recs.reduce((s, r) => s + parseMoney(r.montoSolicitado), 0)
          const totalRecObtenido = recs.reduce((s, r) => s + parseMoney(r.montoRecuperado), 0)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(colorTipo(g.tipo), 0.15), color: colorTipo(g.tipo), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GarantiaIcon />
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px" fontFamily="monospace">
                      {g.numeroGarantia} · {g.tipo}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
                      {g.descripcion}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.75}>
                      <Chip label={g.estado} size="small" sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      <Chip
                        label={g.diasRestantes >= 0 ? `${g.diasRestantes} días restantes` : `Vencida hace ${Math.abs(g.diasRestantes)} días`}
                        size="small"
                        sx={{ bgcolor: alpha(g.diasRestantes >= 0 ? '#16A34A' : '#6B7280', 0.12), color: g.diasRestantes >= 0 ? '#16A34A' : '#6B7280', fontWeight: 600, fontSize: 10, height: 20 }}
                      />
                    </Stack>
                  </Box>
                </Stack>
                <IconButton onClick={() => setGarantiaSel(null)} size="small" sx={{ color: '#64748B' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>

              <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
                {/* KPIs de la garantía */}
                <Grid container spacing={2} mb={2}>
                  {[
                    { label: 'Valor cubierto', value: g.valorCubierto, color: EAM_COLOR },
                    { label: 'Vigencia', value: `${g.inicio} → ${g.vencimiento}`, color: '#3B82F6' },
                    { label: 'Reclamaciones', value: String(recs.length), color: '#8B5CF6' },
                    { label: 'Recuperado', value: formatCOP(totalRecObtenido), color: '#16A34A' },
                  ].map((k) => (
                    <Grid key={k.label} size={{ xs: 6, md: 3 }}>
                      <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.75, textAlign: 'center' }}>
                        <Typography fontSize={15} fontWeight={900} color={k.color} noWrap>{k.value}</Typography>
                        <Typography fontSize={10.5} color="#64748B" mt={0.5}>{k.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* Datos generales */}
                <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <ActivoIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                    <Typography fontWeight={700} fontSize={14} color="#1E293B">Datos de la garantía</Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Activo / Repuesto" value={g.activo} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Tipo" value={g.tipo} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Proveedor" value={g.proveedor} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Responsable interno" value={g.responsable} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Contacto proveedor" value={g.contactoProveedor} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Teléfono" value={g.telefonoProveedor} mono /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Fecha inicio" value={g.inicio} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Fecha vencimiento" value={g.vencimiento} /></Grid>
                  </Grid>
                  <Divider sx={{ my: 2, borderColor: '#E5E7EB' }} />
                  <DetalleItem label="Condiciones" value={g.condiciones} />
                </Paper>

                <Grid container spacing={2}>
                  {/* Cobertura */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <CoberturaIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                        <Typography fontWeight={700} fontSize={14} color="#1E293B">Cobertura</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {g.cobertura.map((c) => (
                          <Chip key={c} label={c} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.1), color: EAM_DARK, fontWeight: 600, fontSize: 11, border: `1px solid ${alpha(EAM_COLOR, 0.3)}` }} />
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                  {/* Documento */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <FileIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                        <Typography fontWeight={700} fontSize={14} color="#1E293B">Documento</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                        <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
                          <FileIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                          <Typography fontSize={12} color="#334155" noWrap>{g.documento}</Typography>
                        </Stack>
                        <Tooltip title="Descargar documento">
                          <IconButton size="small" onClick={() => notify(`Descargando ${g.documento}`, 'info')} sx={{ color: EAM_COLOR }}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Reclamaciones asociadas */}
                <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mt: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <ReclamoIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                      <Typography fontWeight={700} fontSize={14} color="#1E293B">Reclamaciones asociadas ({recs.length})</Typography>
                    </Stack>
                    {recs.length > 0 && (
                      <Typography fontSize={12} fontWeight={700} color="#EF4444">Reclamado: {formatCOP(totalReclamado)}</Typography>
                    )}
                  </Stack>
                  {recs.length === 0 ? (
                    <Typography fontSize={12} color="#94A3B8">Esta garantía no tiene reclamaciones registradas.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {recs.map((r) => (
                        <Box
                          key={r.id}
                          onClick={() => { setGarantiaSel(null); setTabActual(2); setReclamoSel(r) }}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.05) } }}
                        >
                          <Box flex={1} minWidth={0}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                              <Typography fontSize={11} color="#64748B" fontFamily="monospace">{r.fecha}</Typography>
                              <Chip label={labelEstadoReclamo(r.estado)} size="small" sx={{ bgcolor: alpha(colorEstadoReclamo(r.estado), 0.15), color: colorEstadoReclamo(r.estado), fontWeight: 700, fontSize: 9, height: 18 }} />
                            </Stack>
                            <Typography fontSize={12} color="#334155" noWrap>{r.descripcionReclamo}</Typography>
                          </Box>
                          <Box textAlign="right" flexShrink={0}>
                            <Typography fontSize={11} fontWeight={700} color="#16A34A">{r.montoRecuperado}</Typography>
                            <Typography fontSize={10} color="#94A3B8">de {r.montoSolicitado}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </DialogContent>

              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setGarantiaSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button
                  variant="outlined"
                  startIcon={<NotifIcon />}
                  onClick={() => notify(`Alerta programada para ${g.numeroGarantia}`, 'warning')}
                  sx={{ borderColor: alpha(EAM_COLOR, 0.4), color: EAM_COLOR, textTransform: 'none', '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) } }}
                >
                  Generar Alerta
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ReclamoIcon />}
                  onClick={() => registrarReclamo(g)}
                  sx={{ bgcolor: EAM_COLOR, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: EAM_DARK } }}
                >
                  Registrar Reclamación
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ═══ Diálogo: Detalle Garantía por Vencer ═══ */}
      <Dialog open={!!porVencerSel} onClose={() => setPorVencerSel(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {porVencerSel && (() => {
          const g = porVencerSel
          const color = colorPorDias(g.diasRestantes)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(color, 0.15), color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ProximoIcon />
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px" fontFamily="monospace">
                      {g.numeroGarantia} · {labelPorDias(g.diasRestantes)}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>{g.descripcion}</Typography>
                  </Box>
                </Stack>
                <IconButton onClick={() => setPorVencerSel(null)} size="small" sx={{ color: '#64748B' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
                <Box textAlign="center" mb={2}>
                  <Typography variant="h3" sx={{ color, fontWeight: 900, lineHeight: 1 }}>{g.diasRestantes}</Typography>
                  <Typography fontSize={12} color="#64748B">días restantes · vence {g.vencimiento}</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, ((30 - g.diasRestantes) / 30) * 100))}
                    sx={{ mt: 1.5, height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 } }}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Activo" value={g.activo} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Proveedor" value={g.proveedor} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Valor cubierto" value={<span style={{ color: EAM_COLOR }}>{g.valorCubierto}</span>} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Cobertura" value={g.cobertura} /></Grid>
                </Grid>
                <Paper elevation={0} sx={{ mt: 2, bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '12px', p: 2 }}>
                  <Typography fontSize={10.5} fontWeight={700} color={color} textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>
                    Acción recomendada
                  </Typography>
                  <Typography fontSize={13} color="#334155">{g.accionRecomendada}</Typography>
                </Paper>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setPorVencerSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button
                  variant="contained"
                  startIcon={<NotifIcon />}
                  onClick={() => { notify(`Alerta de vencimiento generada para ${g.numeroGarantia}`, 'warning'); setPorVencerSel(null) }}
                  sx={{ bgcolor: color, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: color, filter: 'brightness(0.92)' } }}
                >
                  Generar Alerta
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ═══ Diálogo: Detalle de Reclamación ═══ */}
      <Dialog open={!!reclamoSel} onClose={() => setReclamoSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {reclamoSel && (() => {
          const r = reclamoSel
          const color = colorEstadoReclamo(r.estado)
          const recuperado = parseMoney(r.montoRecuperado)
          const solicitado = parseMoney(r.montoSolicitado)
          const pct = solicitado > 0 ? Math.round((recuperado / solicitado) * 100) : 0
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(color, 0.15), color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReclamoIcon />
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px" fontFamily="monospace">
                      Reclamo sobre {r.garantia} · {r.fecha}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>Reclamación de Garantía</Typography>
                    <Chip label={labelEstadoReclamo(r.estado)} size="small" sx={{ mt: 0.75, bgcolor: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10, height: 20 }} />
                  </Box>
                </Stack>
                <IconButton onClick={() => setReclamoSel(null)} size="small" sx={{ color: '#64748B' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
                <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
                  <Typography fontSize={13} color="#334155">{r.descripcionReclamo}</Typography>
                </Paper>

                <Grid container spacing={2} mb={2}>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Activo" value={r.activo} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Proveedor" value={r.proveedor} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Responsable" value={r.responsable} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Días de gestión" value={`${r.diasGestion} días`} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Monto solicitado" value={<span style={{ color: '#EF4444' }}>{r.montoSolicitado}</span>} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Monto recuperado" value={<span style={{ color: recuperado > 0 ? '#16A34A' : '#6B7280' }}>{r.montoRecuperado}</span>} /></Grid>
                </Grid>

                <Box mb={2}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B">Recuperación</Typography>
                    <Typography fontSize={11} fontWeight={700} color={pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#6B7280'}>{pct}%</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#6B7280', borderRadius: 5 } }}
                  />
                </Box>

                <Paper elevation={0} sx={{ bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '12px', p: 2 }}>
                  <Typography fontSize={10.5} fontWeight={700} color={color} textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>Resolución / estado</Typography>
                  <Typography fontSize={13} color="#334155">{r.resolucion}</Typography>
                </Paper>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setReclamoSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => notify(`Exportando expediente del reclamo ${r.garantia}`, 'info')}
                  sx={{ borderColor: alpha(EAM_COLOR, 0.4), color: EAM_COLOR, textTransform: 'none', '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) } }}
                >
                  Exportar Expediente
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ═══ Diálogo: Crear Garantía ═══ */}
      <Dialog open={crearOpen} onClose={() => setCrearOpen(false)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>Nueva Garantía</Typography>
              <Typography fontSize={12} color="#64748B">Registra una nueva cobertura de activo, repuesto o servicio</Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setCrearOpen(false)} size="small" sx={{ color: '#64748B' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            <TextField fullWidth size="small" label="Descripción *" value={form.descripcion} onChange={(e) => setField('descripcion', e.target.value)} sx={inputSx} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Activo / Repuesto" value={form.activo} onChange={(e) => setField('activo', e.target.value)} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><ActivoIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }} />
              <TextField select fullWidth size="small" label="Tipo *" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)} sx={inputSx}>
                {['ACTIVO', 'REPUESTO', 'SERVICIO'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField select fullWidth size="small" label="Proveedor" value={form.proveedor} onChange={(e) => setField('proveedor', e.target.value)} sx={inputSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><ProveedorIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}>
              <MenuItem value=""><em>Seleccionar proveedor...</em></MenuItem>
              {PROVEEDORES_SELECT.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" type="date" label="Fecha inicio" InputLabelProps={{ shrink: true }} value={form.inicio} onChange={(e) => setField('inicio', e.target.value)} sx={inputSx} />
              <TextField fullWidth size="small" type="date" label="Fecha vencimiento *" InputLabelProps={{ shrink: true }} value={form.vencimiento} onChange={(e) => setField('vencimiento', e.target.value)} sx={inputSx} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Valor cubierto" value={form.valorCubierto} onChange={(e) => setField('valorCubierto', e.target.value)} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><DineroIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }} />
              <TextField select fullWidth size="small" label="Responsable" value={form.responsable} onChange={(e) => setField('responsable', e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {RESPONSABLES_SELECT.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField fullWidth size="small" label="Condiciones" multiline rows={3} value={form.condiciones} onChange={(e) => setField('condiciones', e.target.value)} placeholder="Plazo, kilometraje, exclusiones, requisitos de mantenimiento..." sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCrearOpen(false)} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!form.descripcion.trim()}
            onClick={crearGarantia}
            sx={{ bgcolor: EAM_COLOR, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: EAM_DARK }, '&.Mui-disabled': { bgcolor: '#CBD5E1', color: '#FFFFFF' } }}
          >
            Crear Garantía
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar global */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          sx={{ width: '100%', ...(snack.sev === 'success' ? { bgcolor: EAM_COLOR } : {}) }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
