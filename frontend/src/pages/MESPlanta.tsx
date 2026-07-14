import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Switch,
  IconButton,
  Collapse,
  Divider,
  TableContainer,
  TextField,
  MenuItem,
  InputAdornment,
  Button,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FactoryIcon from '@mui/icons-material/Factory';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SpeedIcon from '@mui/icons-material/Speed';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import SaveIcon from '@mui/icons-material/Save';
import BadgeIcon from '@mui/icons-material/Badge';
import { Layout } from '@/components/layout/Layout';

// ─── Constants (tema claro, acento MES) ────────────────────────────────────────
const MES_COLOR = '#0891B2';
const MES_DARK = '#0E7490';
const MES_BORDER = 'rgba(8,145,178,0.25)';
const BG_MAIN = '#F8FAFC';
const BG_CARD = '#FFFFFF';
const TXT_PRIMARY = '#1E293B';
const TXT_SECONDARY = '#64748B';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Alarma {
  time: string;
  code: string;
  description: string;
  severity: 'CRÍTICA' | 'ADVERTENCIA' | 'INFO';
}

interface CurrentOrder {
  code: string;
  product: string;
  target: number;
  produced: number;
  unit: string;
}

interface PlantLine {
  code: string;
  name: string;
  capacityPerHr: number;
  oee: number;
  status: 'ACTIVA' | 'INACTIVA' | 'MANTENIMIENTO';
  activeShift: string;
  // Enriquecido
  plantName: string;
  operator: string;
  availability: number;
  performance: number;
  quality: number;
  producedShift: number;
  targetShift: number;
  scrapShift: number;
  unit: string;
  currentOrder: CurrentOrder | null;
  alarms: Alarma[];
}

interface Plant {
  id: string;
  code: string;
  name: string;
  manufacturingType: 'DISCRETA' | 'PROCESOS';
  city: string;
  lines: number;
  equipment: number;
  avgOEE: number;
  linesList: PlantLine[];
}

interface Equipment {
  code: string;
  name: string;
  brand: string;
  model: string;
  assignedCell: string;
  capacityPerHr: number;
  oee: number;
  status: 'OPERATIVO' | 'MANTENIMIENTO' | 'PARADO';
  // Enriquecido
  plant: string;
  operator: string;
  availability: number;
  performance: number;
  quality: number;
  currentOrder: CurrentOrder | null;
  shiftProduced: number;
  shiftTarget: number;
  shiftScrap: number;
  unit: string;
  runtimeToday: string;
  downtimeToday: string;
  lastMaintenance: string;
  nextMaintenance: string;
  alarms: Alarma[];
}

interface Operator {
  code: string;
  name: string;
  position: string;
  plant: string;
  currentShift: 'Mañana' | 'Tarde' | 'Noche';
  assignedLine: string;
  certifications: string[];
  status: 'ACTIVO' | 'DESCANSO';
  // Enriquecido
  phone: string;
  hoursWorked: number;
  unitsProduced: number;
  efficiency: number;
  since: string;
}

interface Shift {
  id: string;
  name: string;
  type: 'MAÑANA' | 'TARDE' | 'NOCHE';
  startTime: string;
  endTime: string;
  duration: string;
  plant: string;
  active: boolean;
  // Enriquecido
  supervisor: string;
  headcount: number;
  linesCovered: number;
  avgOEE: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const NO_ALARMS: Alarma[] = [];

const PLANTS: Plant[] = [
  {
    id: 'PLT-001',
    code: 'PLT-001',
    name: 'Planta Norte',
    manufacturingType: 'DISCRETA',
    city: 'Bogotá',
    lines: 4,
    equipment: 24,
    avgOEE: 87.3,
    linesList: [
      {
        code: 'LN-001', name: 'Línea Ensamble A', capacityPerHr: 120, oee: 89.1, status: 'ACTIVA', activeShift: 'Turno Mañana',
        plantName: 'Planta Norte', operator: 'Carlos Mendoza', availability: 95.0, performance: 96.5, quality: 97.1,
        producedShift: 842, targetShift: 960, scrapShift: 12, unit: 'uds',
        currentOrder: { code: 'OP-4501', product: 'Chasis Modelo X-200', target: 960, produced: 842, unit: 'uds' },
        alarms: [
          { time: '08:12', code: 'ALM-014', description: 'Micro-paro por atasco en transportador', severity: 'ADVERTENCIA' },
          { time: '06:45', code: 'ALM-002', description: 'Arranque de línea confirmado', severity: 'INFO' },
        ],
      },
      {
        code: 'LN-002', name: 'Línea Ensamble B', capacityPerHr: 95, oee: 84.5, status: 'ACTIVA', activeShift: 'Turno Mañana',
        plantName: 'Planta Norte', operator: 'Pablo Vargas', availability: 91.2, performance: 94.0, quality: 98.5,
        producedShift: 610, targetShift: 760, scrapShift: 8, unit: 'uds',
        currentOrder: { code: 'OP-4502', product: 'Subensamble Puerta L', target: 760, produced: 610, unit: 'uds' },
        alarms: [
          { time: '09:30', code: 'ALM-021', description: 'Baja velocidad de alimentación', severity: 'ADVERTENCIA' },
        ],
      },
      {
        code: 'LN-003', name: 'Línea Mecanizado', capacityPerHr: 60, oee: 91.2, status: 'ACTIVA', activeShift: 'Turno Tarde',
        plantName: 'Planta Norte', operator: 'Ana Gómez', availability: 96.8, performance: 95.1, quality: 99.0,
        producedShift: 430, targetShift: 480, scrapShift: 3, unit: 'pzas',
        currentOrder: { code: 'OP-4488', product: 'Eje de transmisión T-9', target: 480, produced: 430, unit: 'pzas' },
        alarms: NO_ALARMS,
      },
      {
        code: 'LN-004', name: 'Línea Pintura', capacityPerHr: 80, oee: 84.3, status: 'MANTENIMIENTO', activeShift: '—',
        plantName: 'Planta Norte', operator: 'Sin asignar', availability: 0, performance: 0, quality: 0,
        producedShift: 0, targetShift: 640, scrapShift: 0, unit: 'uds',
        currentOrder: null,
        alarms: [
          { time: '05:50', code: 'ALM-090', description: 'Parada programada — cambio de filtros de cabina', severity: 'CRÍTICA' },
        ],
      },
    ],
  },
  {
    id: 'PLT-002',
    code: 'PLT-002',
    name: 'Planta Sur',
    manufacturingType: 'PROCESOS',
    city: 'Medellín',
    lines: 3,
    equipment: 18,
    avgOEE: 82.1,
    linesList: [
      {
        code: 'LN-005', name: 'Línea Mezclado', capacityPerHr: 200, oee: 80.3, status: 'ACTIVA', activeShift: 'Turno Mañana',
        plantName: 'Planta Sur', operator: 'Luis Herrera', availability: 88.5, performance: 92.3, quality: 98.4,
        producedShift: 1420, targetShift: 1600, scrapShift: 40, unit: 'kg',
        currentOrder: { code: 'OP-3310', product: 'Lote Resina AR-14', target: 1600, produced: 1420, unit: 'kg' },
        alarms: [
          { time: '07:05', code: 'ALM-118', description: 'Temperatura de mezcla sobre setpoint', severity: 'ADVERTENCIA' },
        ],
      },
      {
        code: 'LN-006', name: 'Línea Envasado', capacityPerHr: 350, oee: 83.7, status: 'ACTIVA', activeShift: 'Turno Tarde',
        plantName: 'Planta Sur', operator: 'María Pérez', availability: 90.1, performance: 93.5, quality: 99.3,
        producedShift: 2450, targetShift: 2800, scrapShift: 22, unit: 'uds',
        currentOrder: { code: 'OP-3311', product: 'Envase 1L Producto Z', target: 2800, produced: 2450, unit: 'uds' },
        alarms: NO_ALARMS,
      },
      {
        code: 'LN-007', name: 'Línea Etiquetado', capacityPerHr: 500, oee: 82.4, status: 'INACTIVA', activeShift: '—',
        plantName: 'Planta Sur', operator: 'Sin asignar', availability: 0, performance: 0, quality: 0,
        producedShift: 0, targetShift: 4000, scrapShift: 0, unit: 'uds',
        currentOrder: null,
        alarms: [
          { time: '14:00', code: 'ALM-050', description: 'Línea detenida — sin orden asignada', severity: 'INFO' },
        ],
      },
    ],
  },
  {
    id: 'PLT-003',
    code: 'PLT-003',
    name: 'Planta Occidente',
    manufacturingType: 'DISCRETA',
    city: 'Cali',
    lines: 2,
    equipment: 12,
    avgOEE: 91.4,
    linesList: [
      {
        code: 'LN-008', name: 'Línea Precisión 1', capacityPerHr: 45, oee: 93.2, status: 'ACTIVA', activeShift: 'Turno Mañana',
        plantName: 'Planta Occidente', operator: 'Jorge Castillo', availability: 97.5, performance: 96.8, quality: 98.8,
        producedShift: 328, targetShift: 360, scrapShift: 2, unit: 'pzas',
        currentOrder: { code: 'OP-7720', product: 'Componente CNC P-45', target: 360, produced: 328, unit: 'pzas' },
        alarms: NO_ALARMS,
      },
      {
        code: 'LN-009', name: 'Línea Precisión 2', capacityPerHr: 45, oee: 89.6, status: 'ACTIVA', activeShift: 'Turno Mañana',
        plantName: 'Planta Occidente', operator: 'Sandra Ríos', availability: 94.2, performance: 95.5, quality: 99.5,
        producedShift: 305, targetShift: 360, scrapShift: 1, unit: 'pzas',
        currentOrder: { code: 'OP-7721', product: 'Componente CNC P-46', target: 360, produced: 305, unit: 'pzas' },
        alarms: [
          { time: '10:15', code: 'ALM-033', description: 'Desgaste de herramienta detectado', severity: 'ADVERTENCIA' },
        ],
      },
    ],
  },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    code: 'EQ-001', name: 'Torno CNC 1', brand: 'Mazak', model: 'QT-200', assignedCell: 'Celda A', capacityPerHr: 15, oee: 91.2, status: 'OPERATIVO',
    plant: 'Planta Norte', operator: 'Ana Gómez', availability: 96.0, performance: 95.2, quality: 99.8,
    currentOrder: { code: 'OP-4488', product: 'Eje de transmisión T-9', target: 120, produced: 98, unit: 'pzas' },
    shiftProduced: 98, shiftTarget: 120, shiftScrap: 1, unit: 'pzas', runtimeToday: '6h 42m', downtimeToday: '18m',
    lastMaintenance: '2026-06-20', nextMaintenance: '2026-07-20',
    alarms: [{ time: '09:10', code: 'ALM-005', description: 'Aviso de lubricación baja', severity: 'ADVERTENCIA' }],
  },
  {
    code: 'EQ-002', name: 'Fresadora 1', brand: 'Haas', model: 'VF-2', assignedCell: 'Celda A', capacityPerHr: 12, oee: 87.5, status: 'OPERATIVO',
    plant: 'Planta Norte', operator: 'Carlos Mendoza', availability: 93.5, performance: 94.1, quality: 99.4,
    currentOrder: { code: 'OP-4501', product: 'Chasis Modelo X-200', target: 96, produced: 71, unit: 'pzas' },
    shiftProduced: 71, shiftTarget: 96, shiftScrap: 2, unit: 'pzas', runtimeToday: '6h 05m', downtimeToday: '35m',
    lastMaintenance: '2026-06-12', nextMaintenance: '2026-07-12',
    alarms: NO_ALARMS,
  },
  {
    code: 'EQ-003', name: 'Torno CNC 2', brand: 'Mazak', model: 'QT-250', assignedCell: 'Celda B', capacityPerHr: 18, oee: 43.0, status: 'MANTENIMIENTO',
    plant: 'Planta Norte', operator: 'Sin asignar', availability: 48.0, performance: 89.0, quality: 100.0,
    currentOrder: null,
    shiftProduced: 0, shiftTarget: 144, shiftScrap: 0, unit: 'pzas', runtimeToday: '2h 10m', downtimeToday: '4h 30m',
    lastMaintenance: '2026-07-06', nextMaintenance: '2026-07-06',
    alarms: [{ time: '05:30', code: 'ALM-201', description: 'Mantenimiento correctivo — cambio de husillo', severity: 'CRÍTICA' }],
  },
  {
    code: 'EQ-004', name: 'Centro de Mecanizado 1', brand: 'DMG Mori', model: 'DMU 50', assignedCell: 'Celda B', capacityPerHr: 8, oee: 94.1, status: 'OPERATIVO',
    plant: 'Planta Norte', operator: 'Ana Gómez', availability: 97.8, performance: 96.5, quality: 99.7,
    currentOrder: { code: 'OP-4490', product: 'Molde inyección M-12', target: 64, produced: 52, unit: 'pzas' },
    shiftProduced: 52, shiftTarget: 64, shiftScrap: 0, unit: 'pzas', runtimeToday: '6h 55m', downtimeToday: '05m',
    lastMaintenance: '2026-06-25', nextMaintenance: '2026-07-25',
    alarms: NO_ALARMS,
  },
  {
    code: 'EQ-005', name: 'Prensa Hidráulica 1', brand: 'Schuler', model: 'MSP-250', assignedCell: 'Celda C', capacityPerHr: 30, oee: 0.0, status: 'PARADO',
    plant: 'Planta Norte', operator: 'Sin asignar', availability: 0, performance: 0, quality: 0,
    currentOrder: null,
    shiftProduced: 0, shiftTarget: 240, shiftScrap: 0, unit: 'golpes', runtimeToday: '0h 00m', downtimeToday: '7h 00m',
    lastMaintenance: '2026-05-30', nextMaintenance: '2026-07-15',
    alarms: [{ time: '06:00', code: 'ALM-300', description: 'Falla de presión hidráulica — equipo detenido', severity: 'CRÍTICA' }],
  },
  {
    code: 'EQ-006', name: 'Robot Soldadura 1', brand: 'KUKA', model: 'KR-6 R900', assignedCell: 'Celda C', capacityPerHr: 25, oee: 88.9, status: 'OPERATIVO',
    plant: 'Planta Norte', operator: 'Pablo Vargas', availability: 94.0, performance: 95.5, quality: 99.0,
    currentOrder: { code: 'OP-4502', product: 'Subensamble Puerta L', target: 200, produced: 156, unit: 'uds' },
    shiftProduced: 156, shiftTarget: 200, shiftScrap: 3, unit: 'uds', runtimeToday: '6h 20m', downtimeToday: '25m',
    lastMaintenance: '2026-06-18', nextMaintenance: '2026-07-18',
    alarms: NO_ALARMS,
  },
  {
    code: 'EQ-007', name: 'Fresadora 2', brand: 'Haas', model: 'VF-4', assignedCell: 'Celda D', capacityPerHr: 14, oee: 55.0, status: 'MANTENIMIENTO',
    plant: 'Planta Sur', operator: 'Sin asignar', availability: 60.0, performance: 92.0, quality: 99.6,
    currentOrder: null,
    shiftProduced: 24, shiftTarget: 112, shiftScrap: 1, unit: 'pzas', runtimeToday: '3h 15m', downtimeToday: '3h 45m',
    lastMaintenance: '2026-07-05', nextMaintenance: '2026-07-19',
    alarms: [{ time: '11:20', code: 'ALM-140', description: 'Mantenimiento preventivo en curso', severity: 'ADVERTENCIA' }],
  },
  {
    code: 'EQ-008', name: 'Rectificadora 1', brand: 'STUDER', model: 'S33', assignedCell: 'Celda D', capacityPerHr: 10, oee: 90.3, status: 'OPERATIVO',
    plant: 'Planta Sur', operator: 'Luis Herrera', availability: 95.5, performance: 95.0, quality: 99.5,
    currentOrder: { code: 'OP-3320', product: 'Rodamiento rectificado R-8', target: 80, produced: 63, unit: 'pzas' },
    shiftProduced: 63, shiftTarget: 80, shiftScrap: 0, unit: 'pzas', runtimeToday: '6h 40m', downtimeToday: '12m',
    lastMaintenance: '2026-06-22', nextMaintenance: '2026-07-22',
    alarms: NO_ALARMS,
  },
  {
    code: 'EQ-009', name: 'Centro de Mecanizado 2', brand: 'Fanuc', model: 'Robodrill α-D14LiB', assignedCell: 'Celda E', capacityPerHr: 20, oee: 85.7, status: 'OPERATIVO',
    plant: 'Planta Occidente', operator: 'Jorge Castillo', availability: 92.0, performance: 94.5, quality: 98.5,
    currentOrder: { code: 'OP-7720', product: 'Componente CNC P-45', target: 160, produced: 121, unit: 'pzas' },
    shiftProduced: 121, shiftTarget: 160, shiftScrap: 2, unit: 'pzas', runtimeToday: '6h 12m', downtimeToday: '30m',
    lastMaintenance: '2026-06-28', nextMaintenance: '2026-07-28',
    alarms: [{ time: '10:15', code: 'ALM-033', description: 'Desgaste de herramienta detectado', severity: 'ADVERTENCIA' }],
  },
  {
    code: 'EQ-010', name: 'Taladradora CNC 1', brand: 'Heller', model: 'HMC 400', assignedCell: 'Celda E', capacityPerHr: 22, oee: 0.0, status: 'PARADO',
    plant: 'Planta Occidente', operator: 'Sin asignar', availability: 0, performance: 0, quality: 0,
    currentOrder: null,
    shiftProduced: 0, shiftTarget: 176, shiftScrap: 0, unit: 'pzas', runtimeToday: '0h 00m', downtimeToday: '7h 00m',
    lastMaintenance: '2026-06-01', nextMaintenance: '2026-07-14',
    alarms: [{ time: '06:00', code: 'ALM-310', description: 'Sin orden de producción asignada', severity: 'INFO' }],
  },
];

const INITIAL_OPERATORS: Operator[] = [
  { code: 'OP-001', name: 'Carlos Mendoza', position: 'Operario A', plant: 'Planta Norte', currentShift: 'Mañana', assignedLine: 'Línea Ensamble A', certifications: ['ISO 9001', '5S'], status: 'ACTIVO', phone: '+57 310 555 0101', hoursWorked: 168, unitsProduced: 4820, efficiency: 96, since: '2021-03-15' },
  { code: 'OP-002', name: 'Ana Gómez', position: 'Técnico Senior', plant: 'Planta Norte', currentShift: 'Mañana', assignedLine: 'Línea Mecanizado', certifications: ['ISO 9001', 'OSHAS', '5S'], status: 'ACTIVO', phone: '+57 310 555 0102', hoursWorked: 172, unitsProduced: 3110, efficiency: 98, since: '2019-08-01' },
  { code: 'OP-003', name: 'Luis Herrera', position: 'Operario B', plant: 'Planta Sur', currentShift: 'Tarde', assignedLine: 'Línea Mezclado', certifications: ['OSHAS'], status: 'ACTIVO', phone: '+57 310 555 0103', hoursWorked: 160, unitsProduced: 9200, efficiency: 91, since: '2022-01-10' },
  { code: 'OP-004', name: 'María Pérez', position: 'Operario C', plant: 'Planta Sur', currentShift: 'Noche', assignedLine: 'Línea Envasado', certifications: ['ISO 9001'], status: 'DESCANSO', phone: '+57 310 555 0104', hoursWorked: 144, unitsProduced: 15400, efficiency: 93, since: '2020-11-20' },
  { code: 'OP-005', name: 'Jorge Castillo', position: 'Técnico Senior', plant: 'Planta Occidente', currentShift: 'Mañana', assignedLine: 'Línea Precisión 1', certifications: ['ISO 9001', 'OSHAS', '5S'], status: 'ACTIVO', phone: '+57 310 555 0105', hoursWorked: 170, unitsProduced: 2210, efficiency: 97, since: '2018-05-05' },
  { code: 'OP-006', name: 'Sandra Ríos', position: 'Operario A', plant: 'Planta Occidente', currentShift: 'Mañana', assignedLine: 'Línea Precisión 2', certifications: ['5S'], status: 'ACTIVO', phone: '+57 310 555 0106', hoursWorked: 165, unitsProduced: 2050, efficiency: 94, since: '2023-02-18' },
  { code: 'OP-007', name: 'Pablo Vargas', position: 'Operario B', plant: 'Planta Norte', currentShift: 'Tarde', assignedLine: 'Línea Ensamble B', certifications: ['ISO 9001', 'OSHAS'], status: 'DESCANSO', phone: '+57 310 555 0107', hoursWorked: 158, unitsProduced: 4010, efficiency: 90, since: '2021-09-30' },
  { code: 'OP-008', name: 'Diana Morales', position: 'Operario C', plant: 'Planta Sur', currentShift: 'Mañana', assignedLine: 'Línea Etiquetado', certifications: ['OSHAS', '5S'], status: 'ACTIVO', phone: '+57 310 555 0108', hoursWorked: 162, unitsProduced: 18200, efficiency: 92, since: '2022-06-12' },
];

const INITIAL_SHIFTS: Shift[] = [
  { id: 'SH-1', name: 'Turno Mañana', type: 'MAÑANA', startTime: '06:00', endTime: '14:00', duration: '8h', plant: 'Todas las plantas', active: true, supervisor: 'Ana Gómez', headcount: 24, linesCovered: 7, avgOEE: 88.4 },
  { id: 'SH-2', name: 'Turno Tarde', type: 'TARDE', startTime: '14:00', endTime: '22:00', duration: '8h', plant: 'Todas las plantas', active: true, supervisor: 'Luis Herrera', headcount: 18, linesCovered: 5, avgOEE: 83.1 },
  { id: 'SH-3', name: 'Turno Noche', type: 'NOCHE', startTime: '22:00', endTime: '06:00', duration: '8h', plant: 'Planta Norte, Planta Sur', active: false, supervisor: 'María Pérez', headcount: 10, linesCovered: 3, avgOEE: 79.6 },
];

// Opciones derivadas para selects del formulario de alto nivel
const BRAND_OPTIONS = ['Mazak', 'Haas', 'DMG Mori', 'Schuler', 'KUKA', 'STUDER', 'Fanuc', 'Heller', 'Otro'];
const CELL_OPTIONS = ['Celda A', 'Celda B', 'Celda C', 'Celda D', 'Celda E'];
const PLANT_OPTIONS = PLANTS.map((p) => p.name);
const OPERATOR_OPTIONS = INITIAL_OPERATORS.map((o) => o.name);
const EQUIPMENT_STATUSES: Equipment['status'][] = ['OPERATIVO', 'MANTENIMIENTO', 'PARADO'];
const SHIFT_TYPES: Shift['type'][] = ['MAÑANA', 'TARDE', 'NOCHE'];

// ─── Helper functions ─────────────────────────────────────────────────────────
function getEquipmentStatusColor(status: Equipment['status']): string {
  switch (status) {
    case 'OPERATIVO': return '#16A34A';
    case 'MANTENIMIENTO': return '#D97706';
    case 'PARADO': return '#DC2626';
  }
}

function getLineStatusColor(status: PlantLine['status']): string {
  switch (status) {
    case 'ACTIVA': return '#16A34A';
    case 'INACTIVA': return '#6B7280';
    case 'MANTENIMIENTO': return '#D97706';
  }
}

function getShiftTypeColor(type: Shift['type']): string {
  switch (type) {
    case 'MAÑANA': return '#D97706';
    case 'TARDE': return '#EA580C';
    case 'NOCHE': return '#6366F1';
  }
}

function getShiftTypeBg(type: Shift['type']): string {
  switch (type) {
    case 'MAÑANA': return 'rgba(217,119,6,0.12)';
    case 'TARDE': return 'rgba(234,88,12,0.12)';
    case 'NOCHE': return 'rgba(99,102,241,0.12)';
  }
}

function getSeverityColor(sev: Alarma['severity']): string {
  switch (sev) {
    case 'CRÍTICA': return '#DC2626';
    case 'ADVERTENCIA': return '#D97706';
    case 'INFO': return '#0891B2';
  }
}

function getOEEColor(oee: number): string {
  if (oee >= 85) return '#16A34A';
  if (oee >= 65) return '#D97706';
  return '#DC2626';
}

function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return '—';
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Estilos compartidos ────────────────────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': { color: TXT_PRIMARY },
  '& label': { color: TXT_SECONDARY },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: MES_BORDER },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(8,145,178,0.5)' },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
};

// ─── InfoTile reutilizable ──────────────────────────────────────────────────
const InfoTile: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color = TXT_PRIMARY }) => (
  <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #EEF2F6', borderRadius: '8px', p: 1.25 }}>
    <Typography sx={{ fontSize: 10, color: TXT_SECONDARY, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>{value}</Typography>
  </Box>
);

// ─── Barra OEE (Disponibilidad / Rendimiento / Calidad) ─────────────────────
const OEEBreakdown: React.FC<{ availability: number; performance: number; quality: number; oee: number }> = ({ availability, performance, quality, oee }) => {
  const rows = [
    { label: 'Disponibilidad', value: availability },
    { label: 'Rendimiento', value: performance },
    { label: 'Calidad', value: quality },
  ];
  return (
    <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #EEF2F6', borderRadius: '10px', p: 1.75 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <SpeedIcon sx={{ fontSize: 18, color: MES_COLOR }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>OEE en vivo</Typography>
        </Stack>
        <Typography sx={{ fontSize: 24, fontWeight: 900, color: getOEEColor(oee), lineHeight: 1 }}>{oee > 0 ? `${oee}%` : '—'}</Typography>
      </Stack>
      <Stack spacing={1.25}>
        {rows.map((r) => (
          <Box key={r.label}>
            <Stack direction="row" justifyContent="space-between" mb={0.4}>
              <Typography sx={{ fontSize: 11, color: TXT_SECONDARY }}>{r.label}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: getOEEColor(r.value) }}>{r.value}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, r.value)}
              sx={{ height: 6, borderRadius: 3, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: getOEEColor(r.value), borderRadius: 3 } }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

// ─── Alarmas / paros ─────────────────────────────────────────────────────────
const AlarmsList: React.FC<{ alarms: Alarma[] }> = ({ alarms }) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={0.75} mb={1}>
      <WarningAmberIcon sx={{ fontSize: 16, color: '#D97706' }} />
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Últimas alarmas y paros ({alarms.length})
      </Typography>
    </Stack>
    {alarms.length === 0 ? (
      <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Sin alarmas registradas en el turno actual.</Typography>
    ) : (
      <Stack spacing={1}>
        {alarms.map((a, i) => (
          <Stack
            key={`${a.code}-${i}`}
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(getSeverityColor(a.severity), 0.35)}`, borderLeft: `4px solid ${getSeverityColor(a.severity)}`, borderRadius: '8px', p: 1 }}
          >
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: TXT_SECONDARY, minWidth: 40 }}>{a.time}</Typography>
            <Chip label={a.severity} size="small" sx={{ bgcolor: alpha(getSeverityColor(a.severity), 0.12), color: getSeverityColor(a.severity), fontWeight: 700, fontSize: 9, height: 18 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, color: TXT_PRIMARY, fontWeight: 600 }}>{a.description}</Typography>
              <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: '#94A3B8' }}>{a.code}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    )}
  </Box>
);

// ─── Sub-components ───────────────────────────────────────────────────────────
interface PlantCardProps {
  plant: Plant;
  expanded: boolean;
  onToggle: () => void;
  onLineClick: (line: PlantLine) => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, expanded, onToggle, onLineClick }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        background: BG_CARD,
        border: `1px solid ${MES_BORDER}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Card Header */}
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: `rgba(8,145,178,0.10)`,
                border: `1px solid ${MES_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FactoryIcon sx={{ color: MES_COLOR, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#94A3B8', fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: 1 }}>
                {plant.code}
              </Typography>
              <Typography sx={{ color: TXT_PRIMARY, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                {plant.name}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={plant.manufacturingType}
            size="small"
            sx={{
              background: plant.manufacturingType === 'DISCRETA' ? 'rgba(8,145,178,0.12)' : 'rgba(139,92,246,0.12)',
              color: plant.manufacturingType === 'DISCRETA' ? MES_COLOR : '#8B5CF6',
              border: `1px solid ${plant.manufacturingType === 'DISCRETA' ? MES_BORDER : 'rgba(139,92,246,0.25)'}`,
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: 0.5,
            }}
          />
        </Box>

        <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.8rem', mb: 2 }}>
          {plant.city}
        </Typography>

        {/* Stats Row */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1, textAlign: 'center', background: '#F1F5F9', borderRadius: 1, p: 1.5 }}>
            <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>
              {plant.lines}
            </Typography>
            <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.7rem', mt: 0.5 }}>Líneas</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', background: '#F1F5F9', borderRadius: 1, p: 1.5 }}>
            <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>
              {plant.equipment}
            </Typography>
            <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.7rem', mt: 0.5 }}>Equipos</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', background: '#F1F5F9', borderRadius: 1, p: 1.5 }}>
            <Typography sx={{ color: getOEEColor(plant.avgOEE), fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>
              {plant.avgOEE}%
            </Typography>
            <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.7rem', mt: 0.5 }}>OEE Prom.</Typography>
          </Box>
        </Box>

        {/* Expand Button */}
        <Box
          onClick={onToggle}
          sx={{
            mt: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            cursor: 'pointer',
            py: 0.75,
            borderRadius: 1,
            border: `1px solid ${MES_BORDER}`,
            color: MES_COLOR,
            fontSize: '0.75rem',
            fontWeight: 600,
            '&:hover': { background: 'rgba(8,145,178,0.06)' },
            transition: 'background 0.2s',
          }}
        >
          {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
          {expanded ? 'Ocultar líneas' : 'Ver líneas'}
        </Box>
      </Box>

      {/* Expanded Lines Table */}
      <Collapse in={expanded}>
        <Divider sx={{ borderColor: '#EEF2F6' }} />
        <Box sx={{ p: 2, background: '#F8FAFC' }}>
          <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, mb: 1.5, textTransform: 'uppercase' }}>
            Líneas de Producción · haz clic para ver el detalle en vivo
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Código', 'Nombre', 'Cap./hr', 'OEE', 'Estado', 'Turno Activo'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{ color: TXT_SECONDARY, fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.5, borderColor: '#E5E7EB', textTransform: 'uppercase', py: 0.75, whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {plant.linesList.map((line) => (
                  <TableRow
                    key={line.code}
                    onClick={() => onLineClick(line)}
                    sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: '#EEF2F6' } }}
                  >
                    <TableCell sx={{ color: MES_COLOR, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, py: 1 }}>
                      {line.code}
                    </TableCell>
                    <TableCell sx={{ color: TXT_PRIMARY, fontSize: '0.75rem', py: 1 }}>{line.name}</TableCell>
                    <TableCell sx={{ color: '#475569', fontSize: '0.75rem', py: 1 }}>{line.capacityPerHr}</TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography sx={{ color: getOEEColor(line.oee), fontSize: '0.75rem', fontWeight: 700 }}>
                        {line.oee}%
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Chip
                        label={line.status}
                        size="small"
                        sx={{
                          background: alpha(getLineStatusColor(line.status), 0.13),
                          color: getLineStatusColor(line.status),
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          height: 20,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: TXT_SECONDARY, fontSize: '0.7rem', py: 1 }}>{line.activeShift}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Collapse>
    </Paper>
  );
};

// ─── Tab Panel Helper ─────────────────────────────────────────────────────────
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </Box>
);

// ─── Formulario nuevo equipo ────────────────────────────────────────────────
interface NewEquipmentForm {
  code: string;
  name: string;
  brand: string;
  model: string;
  assignedCell: string;
  plant: string;
  capacityPerHr: string;
  status: Equipment['status'];
  operator: string;
}

const EMPTY_EQ_FORM: NewEquipmentForm = {
  code: '', name: '', brand: '', model: '', assignedCell: '', plant: '',
  capacityPerHr: '', status: 'OPERATIVO', operator: 'Sin asignar',
};

// ─── Edición de turno ──────────────────────────────────────────────────────
interface ShiftEditData {
  name: string;
  type: Shift['type'];
  startTime: string;
  endTime: string;
  plant: string;
  supervisor: string;
  headcount: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const MESPlanta: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());

  // Datos vivos
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [operators] = useState<Operator[]>(INITIAL_OPERATORS);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);

  // Filtros equipos
  const [eqSearch, setEqSearch] = useState('');
  const [eqStatus, setEqStatus] = useState('Todos');
  const [eqCell, setEqCell] = useState('Todas');

  // Filtros operarios
  const [opPlant, setOpPlant] = useState('Todas');
  const [opStatus, setOpStatus] = useState('Todos');

  // Diálogos de detalle
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedLine, setSelectedLine] = useState<PlantLine | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

  // Diálogo de turno (ver / editar)
  const [shiftDialog, setShiftDialog] = useState<{ open: boolean; shift: Shift | null; mode: 'view' | 'edit'; edit: ShiftEditData }>(
    { open: false, shift: null, mode: 'view', edit: { name: '', type: 'MAÑANA', startTime: '', endTime: '', plant: '', supervisor: '', headcount: '' } }
  );

  // Diálogo nuevo equipo
  const [newEqOpen, setNewEqOpen] = useState(false);
  const [eqForm, setEqForm] = useState<NewEquipmentForm>(EMPTY_EQ_FORM);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' });
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue);

  const togglePlantExpand = (plantId: string) => {
    setExpandedPlants((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) next.delete(plantId);
      else next.add(plantId);
      return next;
    });
  };

  const handleShiftToggle = (shiftId: string) => {
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, active: !s.active } : s)));
    const s = shifts.find((x) => x.id === shiftId);
    if (s) notify(`${s.name} ${s.active ? 'desactivado' : 'activado'}`, 'info');
  };

  // ── Filtrado de equipos ──
  const filteredEquipment = useMemo(() => equipmentList.filter((eq) => {
    if (eqStatus !== 'Todos' && eq.status !== eqStatus) return false;
    if (eqCell !== 'Todas' && eq.assignedCell !== eqCell) return false;
    if (eqSearch) {
      const q = eqSearch.toLowerCase();
      if (!eq.name.toLowerCase().includes(q) && !eq.code.toLowerCase().includes(q) && !eq.brand.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [equipmentList, eqStatus, eqCell, eqSearch]);

  const hayEqFiltros = eqSearch || eqStatus !== 'Todos' || eqCell !== 'Todas';
  const resetEqFiltros = () => { setEqSearch(''); setEqStatus('Todos'); setEqCell('Todas'); };

  // ── Filtrado de operarios ──
  const filteredOperators = useMemo(() => operators.filter((op) => {
    if (opPlant !== 'Todas' && op.plant !== opPlant) return false;
    if (opStatus !== 'Todos' && op.status !== opStatus) return false;
    return true;
  }), [operators, opPlant, opStatus]);

  // ── KPIs derivados ──
  const kpis = useMemo(() => {
    const activeLines = PLANTS.reduce((acc, p) => acc + p.linesList.filter((l) => l.status === 'ACTIVA').length, 0);
    return {
      plants: PLANTS.length,
      activeLines,
      operators: operators.length,
      activeShifts: shifts.filter((s) => s.active).length,
    };
  }, [operators, shifts]);

  // ── Formulario nuevo equipo ──
  const setEqField = (field: keyof NewEquipmentForm, value: string) => setEqForm((prev) => ({ ...prev, [field]: value }));
  const openNewEq = () => {
    const nextNum = equipmentList.length + 1;
    setEqForm({ ...EMPTY_EQ_FORM, code: `EQ-${String(nextNum).padStart(3, '0')}` });
    setTriedSubmit(false);
    setNewEqOpen(true);
  };
  const eqErrors = {
    name: !eqForm.name.trim(),
    brand: !eqForm.brand,
    assignedCell: !eqForm.assignedCell,
    plant: !eqForm.plant,
    capacityPerHr: !eqForm.capacityPerHr || Number(eqForm.capacityPerHr) <= 0,
  };
  const eqFormValid = !eqErrors.name && !eqErrors.brand && !eqErrors.assignedCell && !eqErrors.plant && !eqErrors.capacityPerHr;

  const handleCreateEquipment = () => {
    if (!eqFormValid) {
      setTriedSubmit(true);
      notify('Complete los campos obligatorios del equipo', 'warning');
      return;
    }
    const newEq: Equipment = {
      code: eqForm.code || `EQ-${String(equipmentList.length + 1).padStart(3, '0')}`,
      name: eqForm.name.trim(),
      brand: eqForm.brand,
      model: eqForm.model || '—',
      assignedCell: eqForm.assignedCell,
      capacityPerHr: Number(eqForm.capacityPerHr) || 0,
      oee: 0,
      status: eqForm.status,
      plant: eqForm.plant,
      operator: eqForm.operator || 'Sin asignar',
      availability: eqForm.status === 'OPERATIVO' ? 100 : 0,
      performance: 0,
      quality: 0,
      currentOrder: null,
      shiftProduced: 0,
      shiftTarget: 0,
      shiftScrap: 0,
      unit: 'uds',
      runtimeToday: '0h 00m',
      downtimeToday: '0h 00m',
      lastMaintenance: '—',
      nextMaintenance: '—',
      alarms: [],
    };
    setEquipmentList((prev) => [newEq, ...prev]);
    setNewEqOpen(false);
    notify(`Equipo ${newEq.code} registrado correctamente`, 'success');
  };

  // ── Turno: abrir / editar / guardar ──
  const openShift = (shift: Shift) => setShiftDialog({
    open: true, shift, mode: 'view',
    edit: { name: shift.name, type: shift.type, startTime: shift.startTime, endTime: shift.endTime, plant: shift.plant, supervisor: shift.supervisor, headcount: String(shift.headcount) },
  });
  const closeShift = () => setShiftDialog((p) => ({ ...p, open: false }));
  const setShiftEdit = (field: keyof ShiftEditData, value: string) => setShiftDialog((p) => ({ ...p, edit: { ...p.edit, [field]: value } }));
  const saveShift = () => {
    const e = shiftDialog.edit;
    const updated: Shift = {
      ...shiftDialog.shift!,
      name: e.name || shiftDialog.shift!.name,
      type: e.type,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: computeDuration(e.startTime, e.endTime),
      plant: e.plant,
      supervisor: e.supervisor,
      headcount: Number(e.headcount) || 0,
    };
    setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setShiftDialog((p) => ({ ...p, mode: 'view', shift: updated }));
    notify(`${updated.name} actualizado`, 'success');
  };

  const tableHeaderSx = {
    color: TXT_SECONDARY,
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: 0.5,
    borderColor: '#E5E7EB',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
    py: 1.5,
    background: alpha(MES_COLOR, 0.05),
  };

  const tableCellSx = {
    color: '#334155',
    fontSize: '0.8rem',
    borderColor: '#EEF2F6',
    py: 1.25,
  };

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, background: BG_MAIN, minHeight: '100vh' }}>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  background: `rgba(8,145,178,0.10)`,
                  border: `1px solid ${MES_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PrecisionManufacturingIcon sx={{ color: MES_COLOR, fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: TXT_PRIMARY, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                  Gestión de Planta, Líneas y Equipos
                </Typography>
                <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.85rem' }}>
                  MES — Manufacturing Execution System
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => notify('Exportando vista de planta a Excel...', 'info')}
                sx={{ borderColor: 'rgba(8,145,178,0.4)', color: MES_DARK, borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}
              >
                Exportar
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNewEq}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}
              >
                Nuevo Equipo
              </Button>
            </Stack>
          </Box>

          {/* Summary KPIs */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {[
              { label: 'Plantas', value: String(kpis.plants), icon: <FactoryIcon sx={{ fontSize: 16, color: MES_COLOR }} /> },
              { label: 'Líneas Activas', value: String(kpis.activeLines), icon: <PrecisionManufacturingIcon sx={{ fontSize: 16, color: '#16A34A' }} /> },
              { label: 'Operarios', value: String(kpis.operators), icon: <PeopleIcon sx={{ fontSize: 16, color: '#D97706' }} /> },
              { label: 'Turnos Activos', value: String(kpis.activeShifts), icon: <ScheduleIcon sx={{ fontSize: 16, color: '#6366F1' }} /> },
            ].map((kpi) => (
              <Paper
                key={kpi.label}
                elevation={0}
                sx={{
                  background: BG_CARD,
                  border: `1px solid ${MES_BORDER}`,
                  borderRadius: 1.5,
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {kpi.icon}
                <Typography sx={{ color: TXT_SECONDARY, fontSize: '0.75rem' }}>{kpi.label}:</Typography>
                <Typography sx={{ color: TXT_PRIMARY, fontWeight: 700, fontSize: '0.9rem' }}>{kpi.value}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            background: BG_CARD,
            border: `1px solid ${MES_BORDER}`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ borderBottom: `1px solid #E5E7EB`, px: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: MES_COLOR, height: 2 },
                '& .MuiTab-root': {
                  color: TXT_SECONDARY,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  minHeight: 48,
                  '&.Mui-selected': { color: MES_COLOR },
                },
              }}
            >
              {['Plantas & Líneas', 'Equipos', 'Operarios', 'Turnos'].map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>

            {/* ── Tab 0: Plantas & Líneas ─────────────────────────────────── */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                {PLANTS.map((plant) => (
                  <Grid key={plant.id} size={{ xs: 12, md: 6 }}>
                    <PlantCard
                      plant={plant}
                      expanded={expandedPlants.has(plant.id)}
                      onToggle={() => togglePlantExpand(plant.id)}
                      onLineClick={(line) => setSelectedLine(line)}
                    />
                  </Grid>
                ))}
              </Grid>
            </TabPanel>

            {/* ── Tab 1: Equipos ──────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={1}>
              {/* Barra de filtros */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" mb={2}>
                <TextField
                  size="small" placeholder="Buscar equipo, código o marca..."
                  value={eqSearch} onChange={(e) => setEqSearch(e.target.value)}
                  sx={{ minWidth: 240, flex: '1 1 240px', ...inputSx }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                />
                <TextField select size="small" label="Estado" value={eqStatus} onChange={(e) => setEqStatus(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                  {['Todos', ...EQUIPMENT_STATUSES].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Área / Celda" value={eqCell} onChange={(e) => setEqCell(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                  {['Todas', ...CELL_OPTIONS].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <Typography variant="caption" sx={{ color: TXT_SECONDARY, fontWeight: 600 }}>
                  {filteredEquipment.length} de {equipmentList.length} equipos
                </Typography>
                {hayEqFiltros && (
                  <Button size="small" variant="outlined" onClick={resetEqFiltros}
                    sx={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11 }}>
                    Limpiar
                  </Button>
                )}
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {['Código', 'Nombre', 'Marca', 'Modelo', 'Celda', 'Cap./hr', 'OEE', 'Estado', 'Acciones'].map((h) => (
                        <TableCell key={h} sx={tableHeaderSx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEquipment.map((eq) => (
                      <TableRow
                        key={eq.code}
                        onClick={() => setSelectedEquipment(eq)}
                        sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: '#EEF2F6' } }}
                      >
                        <TableCell sx={{ ...tableCellSx, color: MES_COLOR, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}>
                          {eq.code}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: TXT_PRIMARY }}>{eq.name}</TableCell>
                        <TableCell sx={tableCellSx}>{eq.brand}</TableCell>
                        <TableCell sx={{ ...tableCellSx, fontFamily: 'monospace', fontSize: '0.75rem', color: TXT_SECONDARY }}>{eq.model}</TableCell>
                        <TableCell sx={tableCellSx}>{eq.assignedCell}</TableCell>
                        <TableCell sx={tableCellSx}>{eq.capacityPerHr}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Typography sx={{ color: getOEEColor(eq.oee), fontWeight: 700, fontSize: '0.8rem' }}>
                            {eq.oee > 0 ? `${eq.oee}%` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <Chip
                            label={eq.status}
                            size="small"
                            sx={{
                              background: alpha(getEquipmentStatusColor(eq.status), 0.12),
                              color: getEquipmentStatusColor(eq.status),
                              border: `1px solid ${alpha(getEquipmentStatusColor(eq.status), 0.35)}`,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={tableCellSx} onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Ver detalle">
                              <IconButton size="small" onClick={() => setSelectedEquipment(eq)} sx={{ color: MES_COLOR, '&:hover': { background: 'rgba(8,145,178,0.1)' } }}>
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Registrar mantenimiento">
                              <IconButton size="small" onClick={() => notify(`Mantenimiento programado para ${eq.code}`, 'info')} sx={{ color: '#94A3B8', '&:hover': { background: 'rgba(148,163,184,0.1)' } }}>
                                <BuildIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEquipment.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ ...tableCellSx, textAlign: 'center', color: '#94A3B8', py: 4 }}>
                          No hay equipos que coincidan con los filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* ── Tab 2: Operarios ────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" mb={2}>
                <TextField select size="small" label="Planta" value={opPlant} onChange={(e) => setOpPlant(e.target.value)} sx={{ minWidth: 180, ...inputSx }}>
                  {['Todas', ...PLANT_OPTIONS].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Estado" value={opStatus} onChange={(e) => setOpStatus(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                  {['Todos', 'ACTIVO', 'DESCANSO'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <Typography variant="caption" sx={{ color: TXT_SECONDARY, fontWeight: 600 }}>
                  {filteredOperators.length} de {operators.length} operarios
                </Typography>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {['Código', 'Nombre', 'Cargo', 'Planta', 'Turno', 'Línea Asignada', 'Certificaciones', 'Estado'].map((h) => (
                        <TableCell key={h} sx={tableHeaderSx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOperators.map((op) => (
                      <TableRow
                        key={op.code}
                        onClick={() => setSelectedOperator(op)}
                        sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: '#EEF2F6' } }}
                      >
                        <TableCell sx={{ ...tableCellSx, color: MES_COLOR, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}>
                          {op.code}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: TXT_PRIMARY, whiteSpace: 'nowrap' }}>
                          {op.name}
                        </TableCell>
                        <TableCell sx={tableCellSx}>{op.position}</TableCell>
                        <TableCell sx={{ ...tableCellSx, whiteSpace: 'nowrap' }}>{op.plant}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Chip
                            label={op.currentShift}
                            size="small"
                            sx={{
                              background: op.currentShift === 'Mañana' ? 'rgba(217,119,6,0.12)' : op.currentShift === 'Tarde' ? 'rgba(234,88,12,0.12)' : 'rgba(99,102,241,0.12)',
                              color: op.currentShift === 'Mañana' ? '#D97706' : op.currentShift === 'Tarde' ? '#EA580C' : '#6366F1',
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, whiteSpace: 'nowrap' }}>{op.assignedLine}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {op.certifications.map((cert) => (
                              <Chip
                                key={cert}
                                label={cert}
                                size="small"
                                sx={{
                                  background: 'rgba(8,145,178,0.08)',
                                  color: MES_COLOR,
                                  border: `1px solid ${MES_BORDER}`,
                                  fontSize: '0.6rem',
                                  height: 18,
                                }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <Chip
                            label={op.status}
                            size="small"
                            sx={{
                              background: op.status === 'ACTIVO' ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)',
                              color: op.status === 'ACTIVO' ? '#16A34A' : '#D97706',
                              border: `1px solid ${op.status === 'ACTIVO' ? 'rgba(22,163,74,0.3)' : 'rgba(217,119,6,0.3)'}`,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOperators.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ ...tableCellSx, textAlign: 'center', color: '#94A3B8', py: 4 }}>
                          No hay operarios que coincidan con los filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* ── Tab 3: Turnos ───────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={3}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {['Nombre', 'Tipo', 'Hora Inicio', 'Hora Fin', 'Duración', 'Planta', 'Activo'].map((h) => (
                        <TableCell key={h} sx={tableHeaderSx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow
                        key={shift.id}
                        onClick={() => openShift(shift)}
                        sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: '#EEF2F6' } }}
                      >
                        <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: TXT_PRIMARY, whiteSpace: 'nowrap' }}>
                          {shift.name}
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <Chip
                            label={shift.type}
                            size="small"
                            sx={{
                              background: getShiftTypeBg(shift.type),
                              color: getShiftTypeColor(shift.type),
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, fontFamily: 'monospace', fontWeight: 700, color: MES_COLOR }}>
                          {shift.startTime}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, fontFamily: 'monospace', fontWeight: 700, color: MES_COLOR }}>
                          {shift.endTime}
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <Typography
                            sx={{
                              display: 'inline-block',
                              background: 'rgba(8,145,178,0.08)',
                              color: MES_COLOR,
                              border: `1px solid ${MES_BORDER}`,
                              borderRadius: 1,
                              px: 1,
                              py: 0.25,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {shift.duration}
                          </Typography>
                        </TableCell>
                        <TableCell sx={tableCellSx}>{shift.plant}</TableCell>
                        <TableCell sx={tableCellSx} onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={shift.active}
                            onChange={() => handleShiftToggle(shift.id)}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: MES_COLOR },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: MES_DARK },
                              '& .MuiSwitch-track': { backgroundColor: '#CBD5E1' },
                            }}
                          />
                          <Typography
                            component="span"
                            sx={{ color: shift.active ? '#16A34A' : '#6B7280', fontSize: '0.7rem', fontWeight: 600, ml: 0.5 }}
                          >
                            {shift.active ? 'Activo' : 'Inactivo'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

          </Box>
        </Paper>
      </Box>

      {/* ══════════ DIALOG: DETALLE DE EQUIPO ══════════ */}
      <Dialog
        open={!!selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {selectedEquipment && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(getEquipmentStatusColor(selectedEquipment.status), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PrecisionManufacturingIcon sx={{ color: getEquipmentStatusColor(selectedEquipment.status) }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{selectedEquipment.code}</Typography>
                    <Chip label={selectedEquipment.status} size="small" sx={{ bgcolor: alpha(getEquipmentStatusColor(selectedEquipment.status), 0.12), color: getEquipmentStatusColor(selectedEquipment.status), fontWeight: 700, fontSize: 10, height: 20 }} />
                  </Stack>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: TXT_PRIMARY }}>{selectedEquipment.name}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedEquipment(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                {/* Ficha técnica */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Marca" value={selectedEquipment.brand} />
                  <InfoTile label="Modelo" value={selectedEquipment.model} />
                  <InfoTile label="Planta" value={selectedEquipment.plant} />
                  <InfoTile label="Celda / Área" value={selectedEquipment.assignedCell} />
                  <InfoTile label="Capacidad" value={`${selectedEquipment.capacityPerHr} /hr`} />
                  <InfoTile label="Operario" value={selectedEquipment.operator} />
                </Box>

                {/* OEE + Orden en curso */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <OEEBreakdown availability={selectedEquipment.availability} performance={selectedEquipment.performance} quality={selectedEquipment.quality} oee={selectedEquipment.oee} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #EEF2F6', borderRadius: '10px', p: 1.75, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} mb={1.5}>
                        <AssignmentIcon sx={{ fontSize: 18, color: MES_COLOR }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Orden en curso</Typography>
                      </Stack>
                      {selectedEquipment.currentOrder ? (
                        <>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{selectedEquipment.currentOrder.code}</Typography>
                          <Typography sx={{ fontSize: 13, color: TXT_PRIMARY, fontWeight: 600, mb: 1.5 }}>{selectedEquipment.currentOrder.product}</Typography>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography sx={{ fontSize: 11, color: TXT_SECONDARY }}>Avance</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: MES_DARK }}>
                              {selectedEquipment.currentOrder.produced} / {selectedEquipment.currentOrder.target} {selectedEquipment.currentOrder.unit}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (selectedEquipment.currentOrder.produced / selectedEquipment.currentOrder.target) * 100)}
                            sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: MES_COLOR, borderRadius: 4 } }}
                          />
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Sin orden de producción asignada actualmente.</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {/* Producción del turno */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>
                    Producción del turno
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                    <InfoTile label="Producido" value={`${selectedEquipment.shiftProduced} ${selectedEquipment.unit}`} color="#16A34A" />
                    <InfoTile label="Meta" value={`${selectedEquipment.shiftTarget} ${selectedEquipment.unit}`} />
                    <InfoTile label="Rechazos" value={`${selectedEquipment.shiftScrap} ${selectedEquipment.unit}`} color={selectedEquipment.shiftScrap > 0 ? '#DC2626' : TXT_PRIMARY} />
                    <InfoTile label="Tiempo activo / paro" value={`${selectedEquipment.runtimeToday} / ${selectedEquipment.downtimeToday}`} />
                  </Box>
                </Box>

                {/* Mantenimiento */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoTile label="Último mantenimiento" value={selectedEquipment.lastMaintenance} />
                  <InfoTile label="Próximo mantenimiento" value={selectedEquipment.nextMaintenance} color={MES_DARK} />
                </Box>

                {/* Alarmas */}
                <AlarmsList alarms={selectedEquipment.alarms} />
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              <Button onClick={() => { notify(`Mantenimiento programado para ${selectedEquipment.code}`, 'info'); }} startIcon={<BuildIcon />} sx={{ color: MES_DARK, fontWeight: 600 }}>
                Programar mantenimiento
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setSelectedEquipment(null)} sx={{ color: 'grey.500' }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══════════ DIALOG: DETALLE DE LÍNEA ══════════ */}
      <Dialog
        open={!!selectedLine}
        onClose={() => setSelectedLine(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {selectedLine && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(getLineStatusColor(selectedLine.status), 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PrecisionManufacturingIcon sx={{ color: getLineStatusColor(selectedLine.status) }} />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{selectedLine.code}</Typography>
                    <Chip label={selectedLine.status} size="small" sx={{ bgcolor: alpha(getLineStatusColor(selectedLine.status), 0.12), color: getLineStatusColor(selectedLine.status), fontWeight: 700, fontSize: 10, height: 20 }} />
                  </Stack>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: TXT_PRIMARY }}>{selectedLine.name}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedLine(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Planta" value={selectedLine.plantName} />
                  <InfoTile label="Capacidad" value={`${selectedLine.capacityPerHr} /hr`} />
                  <InfoTile label="Turno activo" value={selectedLine.activeShift} />
                  <InfoTile label="Operario a cargo" value={selectedLine.operator} />
                  <InfoTile label="Producido turno" value={`${selectedLine.producedShift} ${selectedLine.unit}`} color="#16A34A" />
                  <InfoTile label="Rechazos" value={`${selectedLine.scrapShift} ${selectedLine.unit}`} color={selectedLine.scrapShift > 0 ? '#DC2626' : TXT_PRIMARY} />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <OEEBreakdown availability={selectedLine.availability} performance={selectedLine.performance} quality={selectedLine.quality} oee={selectedLine.oee} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #EEF2F6', borderRadius: '10px', p: 1.75, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} mb={1.5}>
                        <AssignmentIcon sx={{ fontSize: 18, color: MES_COLOR }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Orden en curso</Typography>
                      </Stack>
                      {selectedLine.currentOrder ? (
                        <>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{selectedLine.currentOrder.code}</Typography>
                          <Typography sx={{ fontSize: 13, color: TXT_PRIMARY, fontWeight: 600, mb: 1.5 }}>{selectedLine.currentOrder.product}</Typography>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography sx={{ fontSize: 11, color: TXT_SECONDARY }}>Avance</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: MES_DARK }}>
                              {selectedLine.currentOrder.produced} / {selectedLine.currentOrder.target} {selectedLine.currentOrder.unit}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (selectedLine.currentOrder.produced / selectedLine.currentOrder.target) * 100)}
                            sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: MES_COLOR, borderRadius: 4 } }}
                          />
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Sin orden de producción asignada actualmente.</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <AlarmsList alarms={selectedLine.alarms} />
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              <Button onClick={() => setSelectedLine(null)} sx={{ color: 'grey.500' }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══════════ DIALOG: DETALLE DE OPERARIO ══════════ */}
      <Dialog
        open={!!selectedOperator}
        onClose={() => setSelectedOperator(null)}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {selectedOperator && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PersonIcon sx={{ color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR, fontFamily: 'monospace' }}>{selectedOperator.code}</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: TXT_PRIMARY }}>{selectedOperator.name}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedOperator(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={selectedOperator.status} size="small" sx={{ bgcolor: selectedOperator.status === 'ACTIVO' ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)', color: selectedOperator.status === 'ACTIVO' ? '#16A34A' : '#D97706', fontWeight: 700 }} />
                  <Chip label={`Turno ${selectedOperator.currentShift}`} size="small" sx={{ bgcolor: getShiftTypeBg(selectedOperator.currentShift === 'Mañana' ? 'MAÑANA' : selectedOperator.currentShift === 'Tarde' ? 'TARDE' : 'NOCHE'), color: getShiftTypeColor(selectedOperator.currentShift === 'Mañana' ? 'MAÑANA' : selectedOperator.currentShift === 'Tarde' ? 'TARDE' : 'NOCHE'), fontWeight: 700 }} />
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Cargo" value={selectedOperator.position} />
                  <InfoTile label="Planta" value={selectedOperator.plant} />
                  <InfoTile label="Línea asignada" value={selectedOperator.assignedLine} />
                  <InfoTile label="Teléfono" value={selectedOperator.phone} />
                  <InfoTile label="Antigüedad desde" value={selectedOperator.since} />
                  <InfoTile label="Horas del mes" value={`${selectedOperator.hoursWorked} h`} />
                </Box>

                {/* Métricas de desempeño */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>
                    Desempeño del período
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <InfoTile label="Unidades producidas" value={selectedOperator.unitsProduced.toLocaleString('es-CO')} color="#16A34A" />
                    <InfoTile label="Eficiencia" value={`${selectedOperator.efficiency}%`} color={getOEEColor(selectedOperator.efficiency)} />
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, selectedOperator.efficiency)}
                      sx={{ height: 8, borderRadius: 4, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: getOEEColor(selectedOperator.efficiency), borderRadius: 4 } }}
                    />
                  </Box>
                </Box>

                {/* Certificaciones */}
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>
                    Certificaciones
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedOperator.certifications.map((c) => (
                      <Chip key={c} icon={<BadgeIcon sx={{ fontSize: 14 }} />} label={c} size="small" sx={{ bgcolor: 'rgba(8,145,178,0.08)', color: MES_COLOR, border: `1px solid ${MES_BORDER}`, fontWeight: 600 }} />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              <Button onClick={() => setSelectedOperator(null)} sx={{ color: 'grey.500' }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══════════ DIALOG: TURNO (ver / editar) ══════════ */}
      <Dialog
        open={shiftDialog.open}
        onClose={closeShift}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {shiftDialog.shift && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: getShiftTypeBg(shiftDialog.shift.type), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScheduleIcon sx={{ color: getShiftTypeColor(shiftDialog.shift.type) }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: MES_COLOR }}>{shiftDialog.shift.id}</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: TXT_PRIMARY }}>{shiftDialog.shift.name}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={closeShift} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              {shiftDialog.mode === 'view' ? (
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                    <InfoTile label="Tipo" value={shiftDialog.shift.type} color={getShiftTypeColor(shiftDialog.shift.type)} />
                    <InfoTile label="Inicio" value={shiftDialog.shift.startTime} />
                    <InfoTile label="Fin" value={shiftDialog.shift.endTime} />
                    <InfoTile label="Duración" value={shiftDialog.shift.duration} />
                    <InfoTile label="Supervisor" value={shiftDialog.shift.supervisor} />
                    <InfoTile label="Dotación" value={`${shiftDialog.shift.headcount} personas`} />
                    <InfoTile label="Líneas cubiertas" value={String(shiftDialog.shift.linesCovered)} />
                    <InfoTile label="OEE promedio" value={`${shiftDialog.shift.avgOEE}%`} color={getOEEColor(shiftDialog.shift.avgOEE)} />
                    <InfoTile label="Estado" value={shiftDialog.shift.active ? 'Activo' : 'Inactivo'} color={shiftDialog.shift.active ? '#16A34A' : '#6B7280'} />
                  </Box>
                  <InfoTile label="Plantas asignadas" value={shiftDialog.shift.plant} />
                </Stack>
              ) : (
                <Stack spacing={2} mt={0.5}>
                  <TextField fullWidth size="small" label="Nombre del turno *" value={shiftDialog.edit.name} onChange={(e) => setShiftEdit('name', e.target.value)} sx={inputSx} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField select fullWidth size="small" label="Tipo *" value={shiftDialog.edit.type} onChange={(e) => setShiftEdit('type', e.target.value)} sx={inputSx}>
                      {SHIFT_TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getShiftTypeColor(t) }} />
                            <span>{t}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      fullWidth size="small" label="Duración" value={computeDuration(shiftDialog.edit.startTime, shiftDialog.edit.endTime)}
                      InputProps={{ readOnly: true }} sx={{ ...inputSx, '& .MuiOutlinedInput-root': { color: TXT_SECONDARY, bgcolor: '#F8FAFC' } }}
                    />
                    <TextField fullWidth size="small" label="Hora inicio *" type="time" value={shiftDialog.edit.startTime} onChange={(e) => setShiftEdit('startTime', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
                    <TextField fullWidth size="small" label="Hora fin *" type="time" value={shiftDialog.edit.endTime} onChange={(e) => setShiftEdit('endTime', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
                  </Box>
                  <TextField select fullWidth size="small" label="Supervisor" value={shiftDialog.edit.supervisor} onChange={(e) => setShiftEdit('supervisor', e.target.value)} sx={inputSx}>
                    {OPERATOR_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                      fullWidth size="small" label="Dotación (personas)" type="number" value={shiftDialog.edit.headcount}
                      onChange={(e) => setShiftEdit('headcount', e.target.value)} sx={inputSx}
                      InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="#94A3B8">pers.</Typography></InputAdornment> }}
                    />
                    <TextField select fullWidth size="small" label="Plantas asignadas" value={shiftDialog.edit.plant} onChange={(e) => setShiftEdit('plant', e.target.value)} sx={inputSx}>
                      {['Todas las plantas', ...PLANT_OPTIONS, 'Planta Norte, Planta Sur'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                  </Box>
                </Stack>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              {shiftDialog.mode === 'view' ? (
                <>
                  <Box sx={{ flex: 1 }} />
                  <Button onClick={closeShift} sx={{ color: 'grey.500' }}>Cerrar</Button>
                  <Button variant="contained" startIcon={<EditIcon />} onClick={() => setShiftDialog((p) => ({ ...p, mode: 'edit' }))} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px' }}>
                    Editar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setShiftDialog((p) => ({ ...p, mode: 'view' }))} sx={{ color: 'grey.500' }}>Cancelar</Button>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={saveShift} disabled={!shiftDialog.edit.name.trim() || !shiftDialog.edit.startTime || !shiftDialog.edit.endTime}
                    sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: 'rgba(8,145,178,0.3)', color: '#fff' }, fontWeight: 700, borderRadius: '8px' }}>
                    Guardar cambios
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══════════ DIALOG: NUEVO EQUIPO (formulario de alto nivel) ══════════ */}
      <Dialog
        open={newEqOpen}
        onClose={() => setNewEqOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PrecisionManufacturingIcon sx={{ color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: TXT_PRIMARY }}>Registrar nuevo equipo</Typography>
              <Typography sx={{ fontSize: 12, color: TXT_SECONDARY }}>Complete los datos del centro de trabajo</Typography>
            </Box>
          </Stack>
          <Chip label={eqForm.code} sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 800, fontSize: 12 }} />
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            <TextField
              fullWidth size="small" label="Nombre del equipo *" value={eqForm.name}
              onChange={(e) => setEqField('name', e.target.value)}
              error={triedSubmit && eqErrors.name}
              helperText={triedSubmit && eqErrors.name ? 'El nombre es obligatorio' : ' '}
              sx={inputSx}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                select fullWidth size="small" label="Marca *" value={eqForm.brand}
                onChange={(e) => setEqField('brand', e.target.value)}
                error={triedSubmit && eqErrors.brand}
                helperText={triedSubmit && eqErrors.brand ? 'Seleccione la marca' : ' '}
                sx={inputSx}
              >
                {BRAND_OPTIONS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
              <TextField fullWidth size="small" label="Modelo" value={eqForm.model} onChange={(e) => setEqField('model', e.target.value)} helperText=" " sx={inputSx} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                select fullWidth size="small" label="Planta *" value={eqForm.plant}
                onChange={(e) => setEqField('plant', e.target.value)}
                error={triedSubmit && eqErrors.plant}
                helperText={triedSubmit && eqErrors.plant ? 'Seleccione la planta' : ' '}
                sx={inputSx}
              >
                {PLANT_OPTIONS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField
                select fullWidth size="small" label="Celda / Área *" value={eqForm.assignedCell}
                onChange={(e) => setEqField('assignedCell', e.target.value)}
                error={triedSubmit && eqErrors.assignedCell}
                helperText={triedSubmit && eqErrors.assignedCell ? 'Seleccione la celda' : ' '}
                sx={inputSx}
              >
                {CELL_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                fullWidth size="small" label="Capacidad / hora *" type="number" value={eqForm.capacityPerHr}
                onChange={(e) => setEqField('capacityPerHr', e.target.value)}
                error={triedSubmit && eqErrors.capacityPerHr}
                helperText={triedSubmit && eqErrors.capacityPerHr ? 'Ingrese una capacidad válida' : ' '}
                InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="#94A3B8">uds/hr</Typography></InputAdornment> }}
                sx={inputSx}
              />
              <TextField select fullWidth size="small" label="Estado inicial" value={eqForm.status} onChange={(e) => setEqField('status', e.target.value)} helperText=" " sx={inputSx}>
                {EQUIPMENT_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getEquipmentStatusColor(s) }} />
                      <span>{s}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField select fullWidth size="small" label="Operario responsable" value={eqForm.operator} onChange={(e) => setEqField('operator', e.target.value)} sx={inputSx}>
              <MenuItem value="Sin asignar">Sin asignar</MenuItem>
              {OPERATOR_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setNewEqOpen(false)} sx={{ color: 'grey.500' }}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateEquipment}
            disabled={triedSubmit && !eqFormValid}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: 'rgba(8,145,178,0.3)', color: '#fff' }, fontWeight: 700, borderRadius: '8px', px: 3 }}
          >
            Registrar equipo
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════ SNACKBAR ══════════ */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack((p) => ({ ...p, open: false }))} severity={snack.sev} variant="filled" sx={{ borderRadius: '10px', fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default MESPlanta;
