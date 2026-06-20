import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  Divider,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Badge,
  alpha,
  LinearProgress,
  Paper,
  SelectChangeEvent,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PersonIcon from '@mui/icons-material/Person'
import AssignmentIcon from '@mui/icons-material/Assignment'
import RuleIcon from '@mui/icons-material/Rule'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import EditIcon from '@mui/icons-material/Edit'
import HistoryEduIcon from '@mui/icons-material/HistoryEdu'
import TimelineIcon from '@mui/icons-material/Timeline'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface FlowStep {
  id: number
  nombre: string
  tipo: 'Revisión' | 'Aprobación' | 'Firma' | 'Notificación'
  responsable: string
  diasLimite: number
}

interface FlowTemplate {
  id: number
  nombre: string
  tipoDocumental: string
  pasos: FlowStep[]
  activo: boolean
  version: string
  creadoPor: string
  fechaCreacion: string
}

interface StepStatus {
  stepId: number
  nombre: string
  tipo: 'Revisión' | 'Aprobación' | 'Firma' | 'Notificación'
  responsable: string
  estado: 'completado' | 'activo' | 'pendiente'
  fechaRespuesta?: string
  comentario?: string
  accionTomada?: string
}

interface ActiveInstance {
  id: string
  documento: string
  flujoAplicado: string
  pasoActual: number
  totalPasos: number
  estado: 'En Proceso' | 'Pausado' | 'Vencido'
  iniciadoPor: string
  fechaInicio: string
  fechaLimite: string
  pasos: StepStatus[]
  vencido: boolean
}

interface HistoryRecord {
  id: string
  documento: string
  flujoAplicado: string
  resultado: 'Completado' | 'Rechazado' | 'Cancelado'
  iniciadoPor: string
  fechaInicio: string
  fechaFin: string
  duracionDias: number
  totalPasos: number
}

interface NewStep {
  nombre: string
  tipo: string
  responsable: string
  diasLimite: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 1,
    nombre: 'Aprobación Contratos Laborales',
    tipoDocumental: 'Contrato Laboral',
    activo: true,
    version: 'v2.1',
    creadoPor: 'María Camila Torres',
    fechaCreacion: '2025-03-15',
    pasos: [
      { id: 1, nombre: 'Revisión Legal', tipo: 'Revisión', responsable: 'Dpto. Jurídico', diasLimite: 3 },
      { id: 2, nombre: 'Aprobación RRHH', tipo: 'Aprobación', responsable: 'Jefe de Recursos Humanos', diasLimite: 2 },
      { id: 3, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', diasLimite: 1 },
      { id: 4, nombre: 'Notificación Empleado', tipo: 'Notificación', responsable: 'Sistema Automático', diasLimite: 1 },
    ],
  },
  {
    id: 2,
    nombre: 'Revisión Órdenes de Compra',
    tipoDocumental: 'Orden de Compra',
    activo: true,
    version: 'v1.3',
    creadoPor: 'Andrés Felipe Gómez',
    fechaCreacion: '2025-01-20',
    pasos: [
      { id: 1, nombre: 'Verificación Presupuesto', tipo: 'Revisión', responsable: 'Analista de Compras', diasLimite: 1 },
      { id: 2, nombre: 'Aprobación Coordinador', tipo: 'Aprobación', responsable: 'Coordinador Logístico', diasLimite: 2 },
      { id: 3, nombre: 'Aprobación Financiera', tipo: 'Aprobación', responsable: 'Director Financiero', diasLimite: 2 },
      { id: 4, nombre: 'Firma Autorización', tipo: 'Firma', responsable: 'Gerente Operaciones', diasLimite: 1 },
      { id: 5, nombre: 'Notificación Proveedor', tipo: 'Notificación', responsable: 'Sistema Automático', diasLimite: 1 },
    ],
  },
  {
    id: 3,
    nombre: 'Validación Pólizas de Seguro',
    tipoDocumental: 'Póliza de Seguro',
    activo: true,
    version: 'v1.0',
    creadoPor: 'Luisa Fernanda Ríos',
    fechaCreacion: '2025-05-02',
    pasos: [
      { id: 1, nombre: 'Revisión Cobertura', tipo: 'Revisión', responsable: 'Asesor de Seguros', diasLimite: 3 },
      { id: 2, nombre: 'Validación Técnica', tipo: 'Revisión', responsable: 'Dpto. Técnico', diasLimite: 2 },
      { id: 3, nombre: 'Aprobación Riesgos', tipo: 'Aprobación', responsable: 'Comité de Riesgos', diasLimite: 4 },
      { id: 4, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', diasLimite: 1 },
    ],
  },
  {
    id: 4,
    nombre: 'Aprobación Facturas Proveedores',
    tipoDocumental: 'Factura Proveedor',
    activo: true,
    version: 'v3.0',
    creadoPor: 'Carlos Hernán Ospina',
    fechaCreacion: '2024-11-10',
    pasos: [
      { id: 1, nombre: 'Recepción y Registro', tipo: 'Revisión', responsable: 'Auxiliar Contable', diasLimite: 1 },
      { id: 2, nombre: 'Verificación Orden Compra', tipo: 'Revisión', responsable: 'Coordinador Compras', diasLimite: 1 },
      { id: 3, nombre: 'Aprobación Pago', tipo: 'Aprobación', responsable: 'Director Financiero', diasLimite: 3 },
      { id: 4, nombre: 'Notificación Pago', tipo: 'Notificación', responsable: 'Sistema Automático', diasLimite: 1 },
    ],
  },
  {
    id: 5,
    nombre: 'Actualización Tarifas Flete',
    tipoDocumental: 'Tabla de Tarifas',
    activo: false,
    version: 'v0.9',
    creadoPor: 'Diana Marcela Vargas',
    fechaCreacion: '2025-04-18',
    pasos: [
      { id: 1, nombre: 'Análisis Mercado', tipo: 'Revisión', responsable: 'Analista Comercial', diasLimite: 5 },
      { id: 2, nombre: 'Revisión Costos', tipo: 'Revisión', responsable: 'Gerente Financiero', diasLimite: 3 },
      { id: 3, nombre: 'Aprobación Tarifas', tipo: 'Aprobación', responsable: 'Comité Directivo', diasLimite: 5 },
      { id: 4, nombre: 'Publicación Interna', tipo: 'Notificación', responsable: 'Sistema Automático', diasLimite: 1 },
    ],
  },
  {
    id: 6,
    nombre: 'Renovación Contratos Clientes',
    tipoDocumental: 'Contrato Cliente',
    activo: true,
    version: 'v1.5',
    creadoPor: 'Jorge Iván Mejía',
    fechaCreacion: '2025-02-28',
    pasos: [
      { id: 1, nombre: 'Revisión Condiciones', tipo: 'Revisión', responsable: 'Ejecutivo de Cuenta', diasLimite: 3 },
      { id: 2, nombre: 'Aprobación Comercial', tipo: 'Aprobación', responsable: 'Director Comercial', diasLimite: 2 },
      { id: 3, nombre: 'Revisión Jurídica', tipo: 'Revisión', responsable: 'Asesor Jurídico', diasLimite: 4 },
      { id: 4, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', diasLimite: 2 },
      { id: 5, nombre: 'Notificación Cliente', tipo: 'Notificación', responsable: 'Ejecutivo de Cuenta', diasLimite: 1 },
    ],
  },
]

const ACTIVE_INSTANCES: ActiveInstance[] = [
  {
    id: 'INS-2026-001',
    documento: 'Contrato Laboral - Juan Pablo Morales',
    flujoAplicado: 'Aprobación Contratos Laborales',
    pasoActual: 2,
    totalPasos: 4,
    estado: 'En Proceso',
    iniciadoPor: 'Gloria Patricia Suárez',
    fechaInicio: '2026-06-15',
    fechaLimite: '2026-06-22',
    vencido: false,
    pasos: [
      { stepId: 1, nombre: 'Revisión Legal', tipo: 'Revisión', responsable: 'Dpto. Jurídico', estado: 'completado', fechaRespuesta: '2026-06-16', comentario: 'Contrato revisado conforme a normativa laboral colombiana.', accionTomada: 'Aprobado' },
      { stepId: 2, nombre: 'Aprobación RRHH', tipo: 'Aprobación', responsable: 'Jefe de Recursos Humanos', estado: 'activo' },
      { stepId: 3, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', estado: 'pendiente' },
      { stepId: 4, nombre: 'Notificación Empleado', tipo: 'Notificación', responsable: 'Sistema Automático', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-002',
    documento: 'OC-2026-0892 - Repuestos Vehículos Pesados',
    flujoAplicado: 'Revisión Órdenes de Compra',
    pasoActual: 3,
    totalPasos: 5,
    estado: 'En Proceso',
    iniciadoPor: 'Hernán Darío Castillo',
    fechaInicio: '2026-06-12',
    fechaLimite: '2026-06-19',
    vencido: true,
    pasos: [
      { stepId: 1, nombre: 'Verificación Presupuesto', tipo: 'Revisión', responsable: 'Analista de Compras', estado: 'completado', fechaRespuesta: '2026-06-13', comentario: 'Presupuesto disponible en la partida de mantenimiento vehicular.', accionTomada: 'Aprobado' },
      { stepId: 2, nombre: 'Aprobación Coordinador', tipo: 'Aprobación', responsable: 'Coordinador Logístico', estado: 'completado', fechaRespuesta: '2026-06-14', comentario: 'Urgente para flota de Bogotá-Medellín.', accionTomada: 'Aprobado' },
      { stepId: 3, nombre: 'Aprobación Financiera', tipo: 'Aprobación', responsable: 'Director Financiero', estado: 'activo' },
      { stepId: 4, nombre: 'Firma Autorización', tipo: 'Firma', responsable: 'Gerente Operaciones', estado: 'pendiente' },
      { stepId: 5, nombre: 'Notificación Proveedor', tipo: 'Notificación', responsable: 'Sistema Automático', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-003',
    documento: 'Póliza SURA 2026 - Flota Bogotá',
    flujoAplicado: 'Validación Pólizas de Seguro',
    pasoActual: 1,
    totalPasos: 4,
    estado: 'En Proceso',
    iniciadoPor: 'Alejandra Montoya Restrepo',
    fechaInicio: '2026-06-18',
    fechaLimite: '2026-07-02',
    vencido: false,
    pasos: [
      { stepId: 1, nombre: 'Revisión Cobertura', tipo: 'Revisión', responsable: 'Asesor de Seguros', estado: 'activo' },
      { stepId: 2, nombre: 'Validación Técnica', tipo: 'Revisión', responsable: 'Dpto. Técnico', estado: 'pendiente' },
      { stepId: 3, nombre: 'Aprobación Riesgos', tipo: 'Aprobación', responsable: 'Comité de Riesgos', estado: 'pendiente' },
      { stepId: 4, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-004',
    documento: 'FAC-2026-4451 - Combustible Petrobras',
    flujoAplicado: 'Aprobación Facturas Proveedores',
    pasoActual: 3,
    totalPasos: 4,
    estado: 'En Proceso',
    iniciadoPor: 'Óscar Mauricio Peña',
    fechaInicio: '2026-06-17',
    fechaLimite: '2026-06-21',
    vencido: false,
    pasos: [
      { stepId: 1, nombre: 'Recepción y Registro', tipo: 'Revisión', responsable: 'Auxiliar Contable', estado: 'completado', fechaRespuesta: '2026-06-17', comentario: 'Factura registrada en sistema ERP.', accionTomada: 'Registrado' },
      { stepId: 2, nombre: 'Verificación Orden Compra', tipo: 'Revisión', responsable: 'Coordinador Compras', estado: 'completado', fechaRespuesta: '2026-06-18', comentario: 'Concuerda con OC-2026-0887.', accionTomada: 'Verificado' },
      { stepId: 3, nombre: 'Aprobación Pago', tipo: 'Aprobación', responsable: 'Director Financiero', estado: 'activo' },
      { stepId: 4, nombre: 'Notificación Pago', tipo: 'Notificación', responsable: 'Sistema Automático', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-005',
    documento: 'Contrato Renovación - Almacenes Éxito S.A.',
    flujoAplicado: 'Renovación Contratos Clientes',
    pasoActual: 4,
    totalPasos: 5,
    estado: 'En Proceso',
    iniciadoPor: 'Catalina Bermúdez Arango',
    fechaInicio: '2026-06-10',
    fechaLimite: '2026-06-25',
    vencido: false,
    pasos: [
      { stepId: 1, nombre: 'Revisión Condiciones', tipo: 'Revisión', responsable: 'Ejecutivo de Cuenta', estado: 'completado', fechaRespuesta: '2026-06-11', comentario: 'Condiciones comerciales revisadas y actualizadas.', accionTomada: 'Aprobado' },
      { stepId: 2, nombre: 'Aprobación Comercial', tipo: 'Aprobación', responsable: 'Director Comercial', estado: 'completado', fechaRespuesta: '2026-06-13', comentario: 'Contrato estratégico para la operación norte.', accionTomada: 'Aprobado' },
      { stepId: 3, nombre: 'Revisión Jurídica', tipo: 'Revisión', responsable: 'Asesor Jurídico', estado: 'completado', fechaRespuesta: '2026-06-17', comentario: 'Sin observaciones jurídicas. Conforme al Código de Comercio.', accionTomada: 'Aprobado' },
      { stepId: 4, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', estado: 'activo' },
      { stepId: 5, nombre: 'Notificación Cliente', tipo: 'Notificación', responsable: 'Ejecutivo de Cuenta', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-006',
    documento: 'FAC-2026-4498 - Llantas Icollantas Ltda.',
    flujoAplicado: 'Aprobación Facturas Proveedores',
    pasoActual: 1,
    totalPasos: 4,
    estado: 'Pausado',
    iniciadoPor: 'Roberto Emilio Salazar',
    fechaInicio: '2026-06-16',
    fechaLimite: '2026-06-20',
    vencido: true,
    pasos: [
      { stepId: 1, nombre: 'Recepción y Registro', tipo: 'Revisión', responsable: 'Auxiliar Contable', estado: 'activo' },
      { stepId: 2, nombre: 'Verificación Orden Compra', tipo: 'Revisión', responsable: 'Coordinador Compras', estado: 'pendiente' },
      { stepId: 3, nombre: 'Aprobación Pago', tipo: 'Aprobación', responsable: 'Director Financiero', estado: 'pendiente' },
      { stepId: 4, nombre: 'Notificación Pago', tipo: 'Notificación', responsable: 'Sistema Automático', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-007',
    documento: 'Contrato Laboral - Sandra Milena Cruz',
    flujoAplicado: 'Aprobación Contratos Laborales',
    pasoActual: 3,
    totalPasos: 4,
    estado: 'En Proceso',
    iniciadoPor: 'Gloria Patricia Suárez',
    fechaInicio: '2026-06-14',
    fechaLimite: '2026-06-21',
    vencido: false,
    pasos: [
      { stepId: 1, nombre: 'Revisión Legal', tipo: 'Revisión', responsable: 'Dpto. Jurídico', estado: 'completado', fechaRespuesta: '2026-06-15', comentario: 'Revisado conforme a CST.', accionTomada: 'Aprobado' },
      { stepId: 2, nombre: 'Aprobación RRHH', tipo: 'Aprobación', responsable: 'Jefe de Recursos Humanos', estado: 'completado', fechaRespuesta: '2026-06-17', comentario: 'Candidata seleccionada para cargo de Auxiliar Logístico.', accionTomada: 'Aprobado' },
      { stepId: 3, nombre: 'Firma Gerencia', tipo: 'Firma', responsable: 'Gerente General', estado: 'activo' },
      { stepId: 4, nombre: 'Notificación Empleado', tipo: 'Notificación', responsable: 'Sistema Automático', estado: 'pendiente' },
    ],
  },
  {
    id: 'INS-2026-008',
    documento: 'OC-2026-0901 - Equipos de Comunicación',
    flujoAplicado: 'Revisión Órdenes de Compra',
    pasoActual: 2,
    totalPasos: 5,
    estado: 'En Proceso',
    iniciadoPor: 'Hernán Darío Castillo',
    fechaInicio: '2026-06-19',
    fechaLimite: '2026-06-27',
    vencido: false,
    pasos: [
      { stepId: 1, nombre: 'Verificación Presupuesto', tipo: 'Revisión', responsable: 'Analista de Compras', estado: 'completado', fechaRespuesta: '2026-06-19', comentario: 'Partida presupuestal disponible.', accionTomada: 'Aprobado' },
      { stepId: 2, nombre: 'Aprobación Coordinador', tipo: 'Aprobación', responsable: 'Coordinador Logístico', estado: 'activo' },
      { stepId: 3, nombre: 'Aprobación Financiera', tipo: 'Aprobación', responsable: 'Director Financiero', estado: 'pendiente' },
      { stepId: 4, nombre: 'Firma Autorización', tipo: 'Firma', responsable: 'Gerente Operaciones', estado: 'pendiente' },
      { stepId: 5, nombre: 'Notificación Proveedor', tipo: 'Notificación', responsable: 'Sistema Automático', estado: 'pendiente' },
    ],
  },
]

const HISTORY_RECORDS: HistoryRecord[] = [
  { id: 'INS-2026-H001', documento: 'Contrato Laboral - Pedro Alonso Vargas', flujoAplicado: 'Aprobación Contratos Laborales', resultado: 'Completado', iniciadoPor: 'Gloria Patricia Suárez', fechaInicio: '2026-05-20', fechaFin: '2026-05-27', duracionDias: 7, totalPasos: 4 },
  { id: 'INS-2026-H002', documento: 'FAC-2026-4301 - Taller Automotriz López', flujoAplicado: 'Aprobación Facturas Proveedores', resultado: 'Rechazado', iniciadoPor: 'Óscar Mauricio Peña', fechaInicio: '2026-05-22', fechaFin: '2026-05-24', duracionDias: 2, totalPasos: 4 },
  { id: 'INS-2026-H003', documento: 'OC-2026-0841 - Uniformes Personal Operativo', flujoAplicado: 'Revisión Órdenes de Compra', resultado: 'Completado', iniciadoPor: 'Hernán Darío Castillo', fechaInicio: '2026-05-28', fechaFin: '2026-06-05', duracionDias: 8, totalPasos: 5 },
  { id: 'INS-2026-H004', documento: 'Contrato Renovación - Bavaria S.A.', flujoAplicado: 'Renovación Contratos Clientes', resultado: 'Completado', iniciadoPor: 'Catalina Bermúdez Arango', fechaInicio: '2026-05-15', fechaFin: '2026-05-30', duracionDias: 15, totalPasos: 5 },
  { id: 'INS-2026-H005', documento: 'Póliza Mapfre 2025 - Flota Medellín', flujoAplicado: 'Validación Pólizas de Seguro', resultado: 'Completado', iniciadoPor: 'Alejandra Montoya Restrepo', fechaInicio: '2026-06-01', fechaFin: '2026-06-11', duracionDias: 10, totalPasos: 4 },
  { id: 'INS-2026-H006', documento: 'FAC-2026-4355 - ExxonMobil Colombia', flujoAplicado: 'Aprobación Facturas Proveedores', resultado: 'Completado', iniciadoPor: 'Roberto Emilio Salazar', fechaInicio: '2026-06-05', fechaFin: '2026-06-09', duracionDias: 4, totalPasos: 4 },
  { id: 'INS-2026-H007', documento: 'OC-2026-0867 - Software Gestión Flota', flujoAplicado: 'Revisión Órdenes de Compra', resultado: 'Cancelado', iniciadoPor: 'Hernán Darío Castillo', fechaInicio: '2026-06-08', fechaFin: '2026-06-10', duracionDias: 2, totalPasos: 5 },
  { id: 'INS-2026-H008', documento: 'Contrato Laboral - Jhon Alexander Torres', flujoAplicado: 'Aprobación Contratos Laborales', resultado: 'Completado', iniciadoPor: 'Gloria Patricia Suárez', fechaInicio: '2026-06-10', fechaFin: '2026-06-16', duracionDias: 6, totalPasos: 4 },
  { id: 'INS-2026-H009', documento: 'Contrato Renovación - Grupo Éxito S.A.S.', flujoAplicado: 'Renovación Contratos Clientes', resultado: 'Completado', iniciadoPor: 'Catalina Bermúdez Arango', fechaInicio: '2026-05-25', fechaFin: '2026-06-12', duracionDias: 18, totalPasos: 5 },
  { id: 'INS-2026-H010', documento: 'FAC-2026-4402 - Bodywork Repuestos S.A.', flujoAplicado: 'Aprobación Facturas Proveedores', resultado: 'Rechazado', iniciadoPor: 'Óscar Mauricio Peña', fechaInicio: '2026-06-14', fechaFin: '2026-06-15', duracionDias: 1, totalPasos: 4 },
]

// ─── Helper functions ─────────────────────────────────────────────────────────

function getStepColor(tipo: string): string {
  switch (tipo) {
    case 'Revisión': return '#1565C0'
    case 'Aprobación': return '#2E7D32'
    case 'Firma': return '#6A1B9A'
    case 'Notificación': return '#E65100'
    default: return '#546E7A'
  }
}

function getStepIcon(tipo: string) {
  switch (tipo) {
    case 'Revisión': return <RuleIcon sx={{ fontSize: 14 }} />
    case 'Aprobación': return <CheckCircleIcon sx={{ fontSize: 14 }} />
    case 'Firma': return <EditIcon sx={{ fontSize: 14 }} />
    case 'Notificación': return <NotificationsActiveIcon sx={{ fontSize: 14 }} />
    default: return <AssignmentIcon sx={{ fontSize: 14 }} />
  }
}

function getResultColor(resultado: string): 'success' | 'error' | 'warning' {
  switch (resultado) {
    case 'Completado': return 'success'
    case 'Rechazado': return 'error'
    case 'Cancelado': return 'warning'
    default: return 'success'
  }
}

function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'En Proceso': return '#1565C0'
    case 'Pausado': return '#E65100'
    case 'Vencido': return '#B71C1C'
    default: return '#546E7A'
  }
}

const STEP_TYPES = ['Revisión', 'Aprobación', 'Firma', 'Notificación']

// ─── Tab Panel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DMSWorkflow() {
  const [activeTab, setActiveTab] = useState(0)

  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateTipo, setNewTemplateTipo] = useState('')
  const [newTemplateSteps, setNewTemplateSteps] = useState<NewStep[]>([
    { nombre: '', tipo: '', responsable: '', diasLimite: '1' },
  ])

  // Instance detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<ActiveInstance | null>(null)

  // Instances state (for advance/cancel actions)
  const [instances, setInstances] = useState<ActiveInstance[]>(ACTIVE_INSTANCES)

  // ── Template dialog handlers ──
  const handleAddStep = () => {
    setNewTemplateSteps(prev => [...prev, { nombre: '', tipo: '', responsable: '', diasLimite: '1' }])
  }

  const handleRemoveStep = (idx: number) => {
    setNewTemplateSteps(prev => prev.filter((_, i) => i !== idx))
  }

  const handleStepChange = (idx: number, field: keyof NewStep, value: string) => {
    setNewTemplateSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const handleSaveTemplate = () => {
    setTemplateDialogOpen(false)
    setNewTemplateName('')
    setNewTemplateTipo('')
    setNewTemplateSteps([{ nombre: '', tipo: '', responsable: '', diasLimite: '1' }])
  }

  // ── Instance action handlers ──
  const handleViewDetail = (instance: ActiveInstance) => {
    setSelectedInstance(instance)
    setDetailDialogOpen(true)
  }

  const handleAdvanceStep = (id: string) => {
    setInstances(prev =>
      prev.map(inst => {
        if (inst.id !== id) return inst
        const nextStep = inst.pasoActual + 1
        if (nextStep > inst.totalPasos) return inst
        const updatedPasos = inst.pasos.map(p => {
          if (p.stepId === inst.pasoActual) return { ...p, estado: 'completado' as const, fechaRespuesta: '2026-06-19', accionTomada: 'Aprobado', comentario: 'Avanzado manualmente.' }
          if (p.stepId === nextStep) return { ...p, estado: 'activo' as const }
          return p
        })
        return { ...inst, pasoActual: nextStep, pasos: updatedPasos }
      })
    )
  }

  const handleCancelInstance = (id: string) => {
    setInstances(prev => prev.filter(inst => inst.id !== id))
  }

  // ── Stats ──
  const totalTemplates = FLOW_TEMPLATES.length
  const activeTemplates = FLOW_TEMPLATES.filter(t => t.activo).length
  const overdueInstances = instances.filter(i => i.vencido).length
  const avgDuration = Math.round(HISTORY_RECORDS.reduce((acc, r) => acc + r.duracionDias, 0) / HISTORY_RECORDS.length)

  return (
    <Layout title="Flujos Documentales BPM">
      <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#F0F4F8' }}>

        {/* ── Header ── */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1.2, bgcolor: DMS_COLOR, borderRadius: 2, display: 'flex', alignItems: 'center' }}>
              <TimelineIcon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0F172A">
                Flujos Documentales BPM
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestión de flujos de aprobación y procesos documentales
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<ScheduleIcon />}
            label={`Actualizado: 19 jun 2026, 08:45 a.m.`}
            size="small"
            sx={{ bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 600 }}
          />
        </Box>

        {/* ── KPI Cards ── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Plantillas Configuradas', value: totalTemplates, sub: `${activeTemplates} activas`, color: DMS_COLOR, icon: <AssignmentIcon /> },
            { label: 'Instancias Activas', value: instances.length, sub: `${overdueInstances} vencidas`, color: overdueInstances > 0 ? '#B71C1C' : '#2E7D32', icon: <PlayArrowIcon /> },
            { label: 'Flujos Completados (30d)', value: HISTORY_RECORDS.filter(r => r.resultado === 'Completado').length, sub: 'Últimos 30 días', color: '#2E7D32', icon: <CheckCircleIcon /> },
            { label: 'Duración Promedio', value: `${avgDuration}d`, sub: 'Por instancia', color: '#6A1B9A', icon: <ScheduleIcon /> },
          ].map((kpi, i) => (
            <Grid key={i} size={{ xs: 12, md: 3 }}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {kpi.label}
                    </Typography>
                    <Box sx={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</Box>
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color, lineHeight: 1 }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Tabs ── */}
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
          <Box sx={{ borderBottom: '1px solid #E2E8F0', px: 2, pt: 1 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                '& .MuiTab-root': { fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', minHeight: 48 },
                '& .Mui-selected': { color: DMS_COLOR },
                '& .MuiTabs-indicator': { bgcolor: DMS_COLOR, height: 3, borderRadius: '3px 3px 0 0' },
              }}
            >
              <Tab icon={<AssignmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Plantillas de Flujo" />
              <Tab
                icon={
                  <Badge badgeContent={overdueInstances} color="error">
                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                  </Badge>
                }
                iconPosition="start"
                label="Instancias Activas"
              />
              <Tab icon={<HistoryEduIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Historial" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 1: Plantillas de Flujo */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                  sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Nueva Plantilla
                </Button>
              </Box>

              <Stack spacing={1.5}>
                {FLOW_TEMPLATES.map(template => (
                  <Accordion
                    key={template.id}
                    elevation={0}
                    sx={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px !important',
                      '&:before': { display: 'none' },
                      '&.Mui-expanded': { borderColor: alpha(DMS_COLOR, 0.4), boxShadow: `0 0 0 2px ${alpha(DMS_COLOR, 0.12)}` },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1, mr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Box sx={{ p: 0.8, bgcolor: alpha(DMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex' }}>
                            <TimelineIcon sx={{ color: DMS_COLOR, fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography fontWeight={700} fontSize="0.9rem" color="#0F172A">{template.nombre}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {template.tipoDocumental} · {template.version} · Por {template.creadoPor}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip label={`${template.pasos.length} pasos`} size="small" sx={{ bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR, fontWeight: 600 }} />
                          <Chip
                            label={template.activo ? 'Activo' : 'Inactivo'}
                            size="small"
                            color={template.activo ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1}>
                        {template.pasos.map((paso, idx) => (
                          <Box
                            key={paso.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              p: 1.5,
                              bgcolor: '#F8FAFC',
                              borderRadius: 1.5,
                              border: '1px solid #F1F5F9',
                            }}
                          >
                            <Box
                              sx={{
                                minWidth: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: DMS_COLOR,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              {idx + 1}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={600} fontSize="0.85rem">{paso.nombre}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                <PersonIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">{paso.responsable}</Typography>
                              </Box>
                            </Box>
                            <Chip
                              icon={getStepIcon(paso.tipo)}
                              label={paso.tipo}
                              size="small"
                              sx={{
                                bgcolor: alpha(getStepColor(paso.tipo), 0.1),
                                color: getStepColor(paso.tipo),
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: getStepColor(paso.tipo) },
                              }}
                            />
                            <Chip
                              icon={<ScheduleIcon sx={{ fontSize: 12 }} />}
                              label={`${paso.diasLimite}d`}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, minWidth: 50 }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </TabPanel>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 2: Instancias Activas */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <TabPanel value={activeTab} index={1}>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['ID', 'Documento', 'Flujo Aplicado', 'Progreso', 'Estado', 'Iniciado por', 'Fecha Límite', 'Acciones'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', py: 1.5, borderBottom: '2px solid #E2E8F0' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {instances.map(inst => (
                      <TableRow
                        key={inst.id}
                        sx={{
                          '&:hover': { bgcolor: alpha(DMS_COLOR, 0.03) },
                          bgcolor: inst.vencido ? alpha('#B71C1C', 0.03) : 'transparent',
                        }}
                      >
                        <TableCell>
                          <Typography fontSize="0.78rem" fontWeight={600} color={DMS_COLOR}>{inst.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.82rem" fontWeight={500} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inst.documento}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.78rem" color="text.secondary" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inst.flujoAplicado}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
                            {inst.pasos.map(p => (
                              <Tooltip key={p.stepId} title={`${p.nombre} (${p.estado})`}>
                                <Box
                                  sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    cursor: 'default',
                                    bgcolor:
                                      p.estado === 'completado' ? '#2E7D32' :
                                      p.estado === 'activo' ? DMS_COLOR : '#CBD5E1',
                                    color: p.estado === 'pendiente' ? '#64748B' : '#fff',
                                    border: p.estado === 'activo' ? `2px solid ${alpha(DMS_COLOR, 0.4)}` : '2px solid transparent',
                                    animation: p.estado === 'activo' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                                    '@keyframes pulse': {
                                      '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(DMS_COLOR, 0.4)}` },
                                      '50%': { boxShadow: `0 0 0 4px ${alpha(DMS_COLOR, 0)}` },
                                    },
                                  }}
                                >
                                  {p.estado === 'completado' ? '✓' : p.stepId}
                                </Box>
                              </Tooltip>
                            ))}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(inst.pasoActual / inst.totalPasos) * 100}
                            sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: DMS_COLOR } }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inst.vencido ? 'Vencido' : inst.estado}
                            size="small"
                            sx={{
                              bgcolor: alpha(getEstadoColor(inst.vencido ? 'Vencido' : inst.estado), 0.12),
                              color: getEstadoColor(inst.vencido ? 'Vencido' : inst.estado),
                              fontWeight: 700,
                              fontSize: '0.72rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography fontSize="0.78rem" color="text.secondary">{inst.iniciadoPor.split(' ').slice(0, 2).join(' ')}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<ScheduleIcon sx={{ fontSize: 13 }} />}
                            label={inst.fechaLimite}
                            size="small"
                            sx={{
                              bgcolor: inst.vencido ? alpha('#B71C1C', 0.1) : alpha('#2E7D32', 0.08),
                              color: inst.vencido ? '#B71C1C' : '#2E7D32',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              '& .MuiChip-icon': { color: inst.vencido ? '#B71C1C' : '#2E7D32' },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Ver detalle">
                              <IconButton size="small" onClick={() => handleViewDetail(inst)} sx={{ color: DMS_COLOR }}>
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Avanzar paso">
                              <IconButton
                                size="small"
                                onClick={() => handleAdvanceStep(inst.id)}
                                sx={{ color: '#2E7D32' }}
                                disabled={inst.pasoActual >= inst.totalPasos}
                              >
                                <ArrowForwardIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancelar instancia">
                              <IconButton size="small" onClick={() => handleCancelInstance(inst.id)} sx={{ color: '#B71C1C' }}>
                                <CancelIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 3: Historial */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography fontWeight={600} color="text.secondary" fontSize="0.85rem">
                  Mostrando {HISTORY_RECORDS.length} registros de los últimos 30 días
                </Typography>
                <Box sx={{ flex: 1 }} />
                {(['Completado', 'Rechazado', 'Cancelado'] as const).map(r => (
                  <Chip
                    key={r}
                    label={`${r}: ${HISTORY_RECORDS.filter(h => h.resultado === r).length}`}
                    size="small"
                    color={getResultColor(r)}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                  />
                ))}
                <Chip
                  icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                  label={`Promedio: ${avgDuration} días`}
                  size="small"
                  sx={{ bgcolor: alpha('#6A1B9A', 0.1), color: '#6A1B9A', fontWeight: 600 }}
                />
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['ID', 'Documento', 'Flujo Aplicado', 'Resultado', 'Iniciado por', 'Fecha Inicio', 'Fecha Fin', 'Duración', 'Pasos'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', py: 1.5, borderBottom: '2px solid #E2E8F0' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {HISTORY_RECORDS.map(rec => (
                      <TableRow key={rec.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell>
                          <Typography fontSize="0.78rem" fontWeight={600} color="text.secondary">{rec.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.82rem" fontWeight={500} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.documento}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.78rem" color="text.secondary" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.flujoAplicado}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={rec.resultado}
                            size="small"
                            color={getResultColor(rec.resultado)}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.78rem" color="text.secondary">
                            {rec.iniciadoPor.split(' ').slice(0, 2).join(' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.78rem">{rec.fechaInicio}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.78rem">{rec.fechaFin}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${rec.duracionDias}d`}
                            size="small"
                            sx={{
                              bgcolor:
                                rec.duracionDias <= 5 ? alpha('#2E7D32', 0.1) :
                                rec.duracionDias <= 10 ? alpha('#E65100', 0.1) :
                                alpha('#B71C1C', 0.1),
                              color:
                                rec.duracionDias <= 5 ? '#2E7D32' :
                                rec.duracionDias <= 10 ? '#E65100' : '#B71C1C',
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontSize="0.82rem" textAlign="center">{rec.totalPasos}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Box>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DIALOG: Nueva Plantilla */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Dialog
          open={templateDialogOpen}
          onClose={() => setTemplateDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 0.8, bgcolor: alpha(DMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex' }}>
              <AssignmentIcon sx={{ color: DMS_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize="1.1rem">Nueva Plantilla de Flujo</Typography>
              <Typography variant="caption" color="text.secondary">Configure los pasos del flujo documental</Typography>
            </Box>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ px: 3, py: 2.5 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Nombre del Flujo"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="Ej. Aprobación Contratos Laborales"
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: DMS_COLOR }, '& label.Mui-focused': { color: DMS_COLOR } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ '&.Mui-focused': { color: DMS_COLOR } }}>Tipo Documental</InputLabel>
                  <Select
                    value={newTemplateTipo}
                    label="Tipo Documental"
                    onChange={(e: SelectChangeEvent) => setNewTemplateTipo(e.target.value)}
                    sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: DMS_COLOR } }}
                  >
                    {['Contrato Laboral', 'Contrato Cliente', 'Orden de Compra', 'Factura Proveedor', 'Póliza de Seguro', 'Tabla de Tarifas', 'Acta Administrativa', 'Otro'].map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography fontWeight={700} fontSize="0.9rem" color="#0F172A">
                Pasos del Flujo
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddStep}
                variant="outlined"
                sx={{ borderColor: DMS_COLOR, color: DMS_COLOR, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: DMS_COLOR, bgcolor: alpha(DMS_COLOR, 0.05) } }}
              >
                Agregar Paso
              </Button>
            </Box>

            <Stack spacing={1.5}>
              {newTemplateSteps.map((step, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    border: '1px solid #E2E8F0',
                    position: 'relative',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box
                      sx={{
                        minWidth: 26, height: 26, borderRadius: '50%', bgcolor: DMS_COLOR, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem',
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <Typography fontWeight={600} fontSize="0.85rem">Paso {idx + 1}</Typography>
                    <Box sx={{ flex: 1 }} />
                    {newTemplateSteps.length > 1 && (
                      <IconButton size="small" onClick={() => handleRemoveStep(idx)} sx={{ color: '#B71C1C' }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Nombre del paso"
                        value={step.nombre}
                        onChange={e => handleStepChange(idx, 'nombre', e.target.value)}
                        size="small"
                        placeholder="Ej. Revisión Legal"
                        sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: DMS_COLOR }, '& label.Mui-focused': { color: DMS_COLOR } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ '&.Mui-focused': { color: DMS_COLOR } }}>Tipo</InputLabel>
                        <Select
                          value={step.tipo}
                          label="Tipo"
                          onChange={(e: SelectChangeEvent) => handleStepChange(idx, 'tipo', e.target.value)}
                          sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: DMS_COLOR } }}
                        >
                          {STEP_TYPES.map(t => (
                            <MenuItem key={t} value={t}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ color: getStepColor(t), display: 'flex' }}>{getStepIcon(t)}</Box>
                                {t}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Responsable o Rol"
                        value={step.responsable}
                        onChange={e => handleStepChange(idx, 'responsable', e.target.value)}
                        size="small"
                        placeholder="Ej. Director Financiero"
                        sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: DMS_COLOR }, '& label.Mui-focused': { color: DMS_COLOR } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField
                        fullWidth
                        label="Días límite"
                        type="number"
                        value={step.diasLimite}
                        onChange={e => handleStepChange(idx, 'diasLimite', e.target.value)}
                        size="small"
                        inputProps={{ min: 1, max: 30 }}
                        sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: DMS_COLOR }, '& label.Mui-focused': { color: DMS_COLOR } }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setTemplateDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTemplate}
              disabled={!newTemplateName || !newTemplateTipo}
              sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
            >
              Guardar Plantilla
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DIALOG: Detalle Instancia (Timeline) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedInstance && (
            <>
              <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ p: 0.8, bgcolor: alpha(DMS_COLOR, 0.1), borderRadius: 1.5, display: 'flex', mt: 0.3 }}>
                    <TimelineIcon sx={{ color: DMS_COLOR, fontSize: 20 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700} fontSize="1rem">{selectedInstance.documento}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedInstance.id} · {selectedInstance.flujoAplicado}
                    </Typography>
                    <Box sx={{ mt: 0.8, display: 'flex', gap: 1 }}>
                      <Chip
                        label={selectedInstance.vencido ? 'Vencido' : selectedInstance.estado}
                        size="small"
                        sx={{
                          bgcolor: alpha(getEstadoColor(selectedInstance.vencido ? 'Vencido' : selectedInstance.estado), 0.12),
                          color: getEstadoColor(selectedInstance.vencido ? 'Vencido' : selectedInstance.estado),
                          fontWeight: 700, fontSize: '0.72rem',
                        }}
                      />
                      <Chip icon={<PersonIcon sx={{ fontSize: 12 }} />} label={selectedInstance.iniciadoPor.split(' ').slice(0, 2).join(' ')} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                    </Box>
                  </Box>
                </Box>
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ px: 3, py: 2.5 }}>
                <Typography fontWeight={700} fontSize="0.85rem" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Línea de tiempo del flujo
                </Typography>
                <Box sx={{ position: 'relative' }}>
                  {selectedInstance.pasos.map((paso, idx) => {
                    const isLast = idx === selectedInstance.pasos.length - 1
                    return (
                      <Box key={paso.stepId} sx={{ display: 'flex', gap: 2, pb: isLast ? 0 : 2 }}>
                        {/* Timeline column */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                              bgcolor:
                                paso.estado === 'completado' ? '#2E7D32' :
                                paso.estado === 'activo' ? DMS_COLOR : '#E2E8F0',
                              color:
                                paso.estado === 'pendiente' ? '#94A3B8' : '#fff',
                              boxShadow:
                                paso.estado === 'activo' ? `0 0 0 4px ${alpha(DMS_COLOR, 0.2)}` : 'none',
                              animation: paso.estado === 'activo' ? 'pulseTimeline 1.5s ease-in-out infinite' : 'none',
                              '@keyframes pulseTimeline': {
                                '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(DMS_COLOR, 0.4)}` },
                                '50%': { boxShadow: `0 0 0 6px ${alpha(DMS_COLOR, 0)}` },
                              },
                            }}
                          >
                            {paso.estado === 'completado' ? (
                              <CheckCircleIcon sx={{ fontSize: 18 }} />
                            ) : paso.estado === 'activo' ? (
                              <FiberManualRecordIcon sx={{ fontSize: 14 }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
                            )}
                          </Box>
                          {!isLast && (
                            <Box
                              sx={{
                                width: 2,
                                flex: 1,
                                mt: 0.5,
                                bgcolor:
                                  paso.estado === 'completado' ? '#2E7D32' : '#E2E8F0',
                                minHeight: 24,
                              }}
                            />
                          )}
                        </Box>

                        {/* Step content */}
                        <Box
                          sx={{
                            flex: 1,
                            pb: isLast ? 0 : 1,
                            p: 1.5,
                            bgcolor:
                              paso.estado === 'completado' ? alpha('#2E7D32', 0.04) :
                              paso.estado === 'activo' ? alpha(DMS_COLOR, 0.05) : '#F8FAFC',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor:
                              paso.estado === 'completado' ? alpha('#2E7D32', 0.2) :
                              paso.estado === 'activo' ? alpha(DMS_COLOR, 0.25) : '#F1F5F9',
                            mb: isLast ? 0 : 1,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography fontWeight={700} fontSize="0.85rem">{paso.nombre}</Typography>
                            <Chip
                              icon={getStepIcon(paso.tipo)}
                              label={paso.tipo}
                              size="small"
                              sx={{
                                height: 18,
                                bgcolor: alpha(getStepColor(paso.tipo), 0.1),
                                color: getStepColor(paso.tipo),
                                fontWeight: 600,
                                fontSize: '0.65rem',
                                '& .MuiChip-icon': { color: getStepColor(paso.tipo), fontSize: 11 },
                                '& .MuiChip-label': { px: 0.8 },
                              }}
                            />
                            {paso.estado === 'activo' && (
                              <Chip label="En curso" size="small" sx={{ height: 18, bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontWeight: 700, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.8 } }} />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: paso.fechaRespuesta ? 0.8 : 0 }}>
                            <PersonIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">{paso.responsable}</Typography>
                          </Box>
                          {paso.fechaRespuesta && (
                            <Box sx={{ mt: 0.5 }}>
                              <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                <Chip icon={<ScheduleIcon sx={{ fontSize: 11 }} />} label={paso.fechaRespuesta} size="small" sx={{ height: 18, fontSize: '0.68rem', '& .MuiChip-label': { px: 0.8 } }} />
                                {paso.accionTomada && (
                                  <Chip label={paso.accionTomada} size="small" color="success" sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, '& .MuiChip-label': { px: 0.8 } }} />
                                )}
                              </Box>
                              {paso.comentario && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                                  "{paso.comentario}"
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </DialogContent>
              <Divider />
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setDetailDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
                  Cerrar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ArrowForwardIcon />}
                  onClick={() => { handleAdvanceStep(selectedInstance.id); setDetailDialogOpen(false) }}
                  disabled={selectedInstance.pasoActual >= selectedInstance.totalPasos}
                  sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6478' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                >
                  Avanzar Paso
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

      </Box>
    </Layout>
  )
}
