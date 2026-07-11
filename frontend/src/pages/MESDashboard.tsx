import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Paper,
  Stack,
  Divider,
  Tooltip,
  TextField,
  MenuItem,
  Button,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  alpha,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Layout } from '@/components/layout/Layout';

// ─── Theme Constants ──────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2';
const MES_DARK = '#0E7490';
const MES_BORDER = 'rgba(8,145,178,0.25)';
const BG_CARD = '#FFFFFF';
const BG_PAGE = '#F0F2F5';

// ─── Catalogs ─────────────────────────────────────────────────────────────────
const PLANTAS = ['Planta Bogotá', 'Planta Medellín', 'Planta Cali'];
const TURNOS = ['Turno Mañana', 'Turno Tarde', 'Turno Noche'];
const STOP_TYPES = ['MECÁNICA', 'CALIDAD', 'MATERIAL', 'SETUP'] as const;
const CAUSAS_PARADA = [
  'Falla eléctrica',
  'Falla mecánica',
  'Falta de material',
  'Cambio de herramienta',
  'Ajuste de calidad',
  'Setup / Cambio de formato',
  'Falta de personal',
  'Mantenimiento correctivo',
];
const RESPONSABLES = ['Juan Pérez', 'María Gómez', 'Andrés Ruiz', 'Laura Torres', 'Carlos Mejía'];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface MachineRef {
  name: string;
  status: string;
}

interface ProductionLine {
  id: string;
  name: string;
  short: string;
  plant: string;
  shift: string;
  status: 'OPERATIVA' | 'PARADA' | 'SETUP';
  availability: number;
  performance: number;
  quality: number;
  scrapPct: number;
  pmCompliance: number;
  currentProduction: number;
  target: number;
  operator: string;
  product: string;
  cycleTime: string;
  startTime: string;
  machines: MachineRef[];
}

interface OperationRef {
  name: string;
  status: string;
}

interface ActiveOrder {
  id: string;
  number: string;
  product: string;
  priority: 'URGENTE' | 'ALTA' | 'NORMAL';
  progress: number;
  remainingTime: string;
  line: string;
  plant: string;
  shift: string;
  customer: string;
  responsable: string;
  quantity: number;
  produced: number;
  startTime: string;
  dueTime: string;
  operations: OperationRef[];
}

interface ActiveStop {
  id: string;
  codigo: string;
  equipment: string;
  type: 'MECÁNICA' | 'CALIDAD' | 'MATERIAL' | 'SETUP';
  durationMinutes: number;
  line: string;
  plant: string;
  shift: string;
  cause: string;
  responsable: string;
  startTime: string;
  impact: string;
  observaciones?: string;
}

interface ScrapEntry {
  label: string;
  percentage: number;
  color: string;
  units: number;
  topCauses: { label: string; pct: number }[];
}

interface Alert2 {
  id: string;
  level: 'CRITICA' | 'ADVERTENCIA' | 'INFO';
  description: string;
  time: string;
  source: string;
  plant: string;
  recommendation: string;
}

// KPI computado (deriva de las líneas/órdenes filtradas)
interface Kpi {
  id: string;
  label: string;
  unit?: string;
  value: number;
  display: string;
  target: number;
  higherIsBetter: boolean;
  trend: number[];
  desc: string;
  breakdown: { label: string; value: number }[];
  byShift: { label: string; value: number }[];
  fmt: (n: number) => string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const productionLinesMock: ProductionLine[] = [
  {
    id: '1', name: 'Línea 01 — Ensamble A', short: 'L01', plant: 'Planta Bogotá', shift: 'Turno Mañana',
    status: 'OPERATIVA', availability: 95, performance: 96, quality: 99, scrapPct: 1.5, pmCompliance: 92,
    currentProduction: 1240, target: 1400, operator: 'Juan Pérez', product: 'Componente Alpha X200',
    cycleTime: '42 s/un', startTime: '2026-07-07T06:00',
    machines: [
      { name: 'Estación Robot ABB IRB-1200', status: 'OPERATIVA' },
      { name: 'Prensa Neumática PN-04', status: 'OPERATIVA' },
      { name: 'Banda de alimentación B-01', status: 'OPERATIVA' },
    ],
  },
  {
    id: '2', name: 'Línea 02 — Soldadura', short: 'L02', plant: 'Planta Bogotá', shift: 'Turno Mañana',
    status: 'OPERATIVA', availability: 90, performance: 88, quality: 98, scrapPct: 3.2, pmCompliance: 80,
    currentProduction: 870, target: 1200, operator: 'María Gómez', product: 'Módulo Beta V3',
    cycleTime: '58 s/un', startTime: '2026-07-07T06:00',
    machines: [
      { name: 'Robot Soldadura R-02', status: 'PARADA' },
      { name: 'Mesa de posicionamiento MP-02', status: 'OPERATIVA' },
    ],
  },
  {
    id: '3', name: 'Línea 03 — Pintura', short: 'L03', plant: 'Planta Bogotá', shift: 'Turno Mañana',
    status: 'PARADA', availability: 0, performance: 0, quality: 0, scrapPct: 0, pmCompliance: 100,
    currentProduction: 0, target: 900, operator: 'Andrés Ruiz', product: 'Chasis Gamma 500',
    cycleTime: '—', startTime: '2026-07-07T06:00',
    machines: [
      { name: 'Cabina Pintura P-01', status: 'PARADA' },
      { name: 'Horno de curado H-01', status: 'PARADA' },
    ],
  },
  {
    id: '4', name: 'Línea 04 — Corte CNC', short: 'L04', plant: 'Planta Medellín', shift: 'Turno Tarde',
    status: 'OPERATIVA', availability: 92, performance: 94, quality: 98, scrapPct: 2.0, pmCompliance: 88,
    currentProduction: 2100, target: 2500, operator: 'Laura Torres', product: 'Chasis Gamma 500',
    cycleTime: '31 s/un', startTime: '2026-07-07T14:00',
    machines: [
      { name: 'CNC Fresadora F-03', status: 'SETUP' },
      { name: 'Troqueladora T-05', status: 'OPERATIVA' },
    ],
  },
  {
    id: '5', name: 'Línea 05 — Empaque', short: 'L05', plant: 'Planta Medellín', shift: 'Turno Tarde',
    status: 'SETUP', availability: 70, performance: 90, quality: 98, scrapPct: 4.1, pmCompliance: 75,
    currentProduction: 300, target: 1000, operator: 'Carlos Mejía', product: 'Carcasa Theta Plus',
    cycleTime: '25 s/un', startTime: '2026-07-07T14:00',
    machines: [
      { name: 'Encajonadora E-02', status: 'SETUP' },
      { name: 'Banda Transporte B-07', status: 'PARADA' },
    ],
  },
  {
    id: '6', name: 'Línea 06 — QA Final', short: 'L06', plant: 'Planta Cali', shift: 'Turno Noche',
    status: 'OPERATIVA', availability: 98, performance: 98, quality: 100, scrapPct: 0.4, pmCompliance: 95,
    currentProduction: 1910, target: 2000, operator: 'Juan Pérez', product: 'Ensamble Delta Pro',
    cycleTime: '38 s/un', startTime: '2026-07-06T22:00',
    machines: [
      { name: 'Estación de visión artificial V-01', status: 'OPERATIVA' },
      { name: 'Banco de pruebas eléctricas BP-01', status: 'OPERATIVA' },
    ],
  },
];

const activeOrdersMock: ActiveOrder[] = [
  { id: '1', number: 'OP-2024-001', product: 'Componente Alpha X200', priority: 'URGENTE', progress: 82, remainingTime: '1h 20m',
    line: 'Línea 01 — Ensamble A', plant: 'Planta Bogotá', shift: 'Turno Mañana', customer: 'AutoParts Andina', responsable: 'Juan Pérez',
    quantity: 1500, produced: 1230, startTime: '2026-07-07T06:00', dueTime: '2026-07-07T14:00',
    operations: [ { name: 'Preparación de material', status: 'COMPLETADA' }, { name: 'Ensamble mecánico', status: 'EN PROCESO' }, { name: 'Inspección final', status: 'PENDIENTE' } ] },
  { id: '2', number: 'OP-2024-002', product: 'Módulo Beta V3', priority: 'ALTA', progress: 65, remainingTime: '2h 45m',
    line: 'Línea 02 — Soldadura', plant: 'Planta Bogotá', shift: 'Turno Mañana', customer: 'Industrias Bolívar', responsable: 'María Gómez',
    quantity: 900, produced: 585, startTime: '2026-07-07T06:00', dueTime: '2026-07-07T15:30',
    operations: [ { name: 'Soldadura de estructura', status: 'EN PROCESO' }, { name: 'Esmerilado', status: 'PENDIENTE' } ] },
  { id: '3', number: 'OP-2024-003', product: 'Chasis Gamma 500', priority: 'NORMAL', progress: 40, remainingTime: '4h 10m',
    line: 'Línea 04 — Corte CNC', plant: 'Planta Medellín', shift: 'Turno Tarde', customer: 'Metalúrgica del Sur', responsable: 'Laura Torres',
    quantity: 2500, produced: 1000, startTime: '2026-07-07T14:00', dueTime: '2026-07-07T22:00',
    operations: [ { name: 'Corte de láminas', status: 'EN PROCESO' }, { name: 'Doblado', status: 'PENDIENTE' } ] },
  { id: '4', number: 'OP-2024-004', product: 'Ensamble Delta Pro', priority: 'ALTA', progress: 91, remainingTime: '0h 35m',
    line: 'Línea 01 — Ensamble A', plant: 'Planta Bogotá', shift: 'Turno Mañana', customer: 'TecnoServ SAS', responsable: 'Juan Pérez',
    quantity: 800, produced: 728, startTime: '2026-07-07T06:00', dueTime: '2026-07-07T13:00',
    operations: [ { name: 'Ensamble', status: 'EN PROCESO' }, { name: 'Empaque', status: 'PENDIENTE' } ] },
  { id: '5', number: 'OP-2024-005', product: 'Pieza Épsilon M10', priority: 'URGENTE', progress: 55, remainingTime: '3h 00m',
    line: 'Línea 06 — QA Final', plant: 'Planta Cali', shift: 'Turno Noche', customer: 'Ensambles del Pacífico', responsable: 'Juan Pérez',
    quantity: 2000, produced: 1100, startTime: '2026-07-06T22:00', dueTime: '2026-07-07T06:00',
    operations: [ { name: 'Pruebas eléctricas', status: 'EN PROCESO' }, { name: 'Sellado de lote', status: 'PENDIENTE' } ] },
  { id: '6', number: 'OP-2024-006', product: 'Subensamble Zeta', priority: 'NORMAL', progress: 20, remainingTime: '6h 50m',
    line: 'Línea 04 — Corte CNC', plant: 'Planta Medellín', shift: 'Turno Tarde', customer: 'Metalúrgica del Sur', responsable: 'Laura Torres',
    quantity: 3000, produced: 600, startTime: '2026-07-07T14:00', dueTime: '2026-07-08T00:00',
    operations: [ { name: 'Corte', status: 'EN PROCESO' } ] },
  { id: '7', number: 'OP-2024-007', product: 'Tapa Eta Reforzada', priority: 'ALTA', progress: 73, remainingTime: '1h 55m',
    line: 'Línea 02 — Soldadura', plant: 'Planta Bogotá', shift: 'Turno Mañana', customer: 'Industrias Bolívar', responsable: 'María Gómez',
    quantity: 1200, produced: 876, startTime: '2026-07-07T06:00', dueTime: '2026-07-07T14:30',
    operations: [ { name: 'Soldadura', status: 'EN PROCESO' }, { name: 'Inspección', status: 'PENDIENTE' } ] },
  { id: '8', number: 'OP-2024-008', product: 'Carcasa Theta Plus', priority: 'NORMAL', progress: 10, remainingTime: '8h 30m',
    line: 'Línea 05 — Empaque', plant: 'Planta Medellín', shift: 'Turno Tarde', customer: 'TecnoServ SAS', responsable: 'Carlos Mejía',
    quantity: 1000, produced: 100, startTime: '2026-07-07T14:00', dueTime: '2026-07-08T02:00',
    operations: [ { name: 'Setup de formato', status: 'EN PROCESO' } ] },
];

const activeStopsMock: ActiveStop[] = [
  { id: '1', codigo: 'PA-0451', equipment: 'Robot Soldadura R-02', type: 'MECÁNICA', durationMinutes: 145, line: 'Línea 02 — Soldadura', plant: 'Planta Bogotá', shift: 'Turno Mañana', cause: 'Falla mecánica', responsable: 'María Gómez', startTime: '2026-07-07T06:15', impact: 'Alto', observaciones: 'Rotura de cable de antorcha, en espera de repuesto.' },
  { id: '2', codigo: 'PA-0452', equipment: 'Cabina Pintura P-01', type: 'CALIDAD', durationMinutes: 87, line: 'Línea 03 — Pintura', plant: 'Planta Bogotá', shift: 'Turno Mañana', cause: 'Ajuste de calidad', responsable: 'Andrés Ruiz', startTime: '2026-07-07T07:10', impact: 'Medio', observaciones: 'Desviación de tono en muestra, recalibrando pistolas.' },
  { id: '3', codigo: 'PA-0453', equipment: 'Troqueladora T-05', type: 'MATERIAL', durationMinutes: 32, line: 'Línea 04 — Corte CNC', plant: 'Planta Medellín', shift: 'Turno Tarde', cause: 'Falta de material', responsable: 'Laura Torres', startTime: '2026-07-07T14:20', impact: 'Bajo', observaciones: 'Espera de lámina calibre 14 desde almacén.' },
  { id: '4', codigo: 'PA-0454', equipment: 'CNC Fresadora F-03', type: 'SETUP', durationMinutes: 20, line: 'Línea 04 — Corte CNC', plant: 'Planta Medellín', shift: 'Turno Tarde', cause: 'Setup / Cambio de formato', responsable: 'Laura Torres', startTime: '2026-07-07T14:40', impact: 'Bajo', observaciones: 'Cambio de herramienta programado.' },
  { id: '5', codigo: 'PA-0455', equipment: 'Banda Transporte B-07', type: 'MECÁNICA', durationMinutes: 210, line: 'Línea 05 — Empaque', plant: 'Planta Medellín', shift: 'Turno Tarde', cause: 'Mantenimiento correctivo', responsable: 'Carlos Mejía', startTime: '2026-07-07T13:00', impact: 'Alto', observaciones: 'Motorreductor fuera de servicio, OT correctiva abierta.' },
  { id: '6', codigo: 'PA-0456', equipment: 'Inyectora I-04', type: 'CALIDAD', durationMinutes: 58, line: 'Línea 06 — QA Final', plant: 'Planta Cali', shift: 'Turno Noche', cause: 'Ajuste de calidad', responsable: 'Juan Pérez', startTime: '2026-07-06T23:30', impact: 'Medio', observaciones: 'Rechazo por rebaba, ajustando presión de inyección.' },
];

const scrapData: ScrapEntry[] = [
  { label: 'NORMAL', percentage: 68, color: '#22c55e', units: 5726,
    topCauses: [ { label: 'Producto conforme', pct: 100 } ] },
  { label: 'REPROCESO', percentage: 22, color: '#f59e0b', units: 1852,
    topCauses: [ { label: 'Ajuste dimensional', pct: 48 }, { label: 'Retoque de soldadura', pct: 33 }, { label: 'Reempaque', pct: 19 } ] },
  { label: 'DEFECTO CALIDAD', percentage: 10, color: '#ef4444', units: 842,
    topCauses: [ { label: 'Porosidad en soldadura', pct: 41 }, { label: 'Defecto de pintura', pct: 35 }, { label: 'Fuera de tolerancia', pct: 24 } ] },
];

const alertsMock: Alert2[] = [
  { id: '1', level: 'CRITICA', description: 'Banda Transporte B-07 fuera de servicio — más de 3h', time: 'Hace 3h 30m', source: 'Línea 05 — Empaque', plant: 'Planta Medellín', recommendation: 'Escalar a mantenimiento correctivo y evaluar línea de respaldo para no comprometer el despacho.' },
  { id: '2', level: 'CRITICA', description: 'Temperatura horno P-01 supera límite operativo 340°C', time: 'Hace 1h 27m', source: 'Línea 03 — Pintura', plant: 'Planta Bogotá', recommendation: 'Detener curado, verificar sensor PT-100 y sistema de enfriamiento antes de reanudar.' },
  { id: '3', level: 'ADVERTENCIA', description: 'OEE Línea 02 por debajo del umbral mínimo (80%)', time: 'Hace 45m', source: 'Línea 02 — Soldadura', plant: 'Planta Bogotá', recommendation: 'Revisar micro-paradas del Robot R-02 y validar disponibilidad de material.' },
  { id: '4', level: 'ADVERTENCIA', description: 'Stock materia prima Troqueladora T-05 crítico', time: 'Hace 32m', source: 'Línea 04 — Corte CNC', plant: 'Planta Medellín', recommendation: 'Generar requisición de lámina calibre 14 y confirmar entrega con almacén.' },
  { id: '5', level: 'INFO', description: 'Mantenimiento preventivo Robot R-04 programado en 2h', time: 'Hace 10m', source: 'Línea 06 — QA Final', plant: 'Planta Cali', recommendation: 'Coordinar ventana con producción para minimizar impacto en el turno.' },
];

// ─── Helper Style Maps ────────────────────────────────────────────────────────
const statusColors: Record<ProductionLine['status'], { bg: string; text: string }> = {
  OPERATIVA: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  PARADA: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  SETUP: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
};

const priorityColors: Record<ActiveOrder['priority'], { bg: string; text: string; border: string }> = {
  URGENTE: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  ALTA: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  NORMAL: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.35)' },
};

const stopTypeColors: Record<ActiveStop['type'], { bg: string; text: string }> = {
  'MECÁNICA': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  'CALIDAD': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'MATERIAL': { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  'SETUP': { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
};

const stopTrafficLight = (minutes: number): string => {
  if (minutes >= 120) return '#ef4444';
  if (minutes >= 60) return '#f59e0b';
  return '#22c55e';
};

const alertColors: Record<Alert2['level'], { bg: string; text: string; border: string }> = {
  CRITICA: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  ADVERTENCIA: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  INFO: { bg: 'rgba(8,145,178,0.12)', text: MES_COLOR, border: MES_BORDER },
};

const machineStatusColor = (status: string): string => {
  if (status === 'OPERATIVA') return '#22c55e';
  if (status === 'PARADA') return '#ef4444';
  return '#f59e0b';
};

const opStatusColor = (status: string): string => {
  if (status === 'COMPLETADA') return '#22c55e';
  if (status === 'EN PROCESO') return MES_COLOR;
  return '#94A3B8';
};

const avg = (arr: number[]): number => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
const fmtPct = (n: number) => n.toFixed(1);
const fmtInt = (n: number) => Math.round(n).toLocaleString();

// ─── Sub-components ───────────────────────────────────────────────────────────

/** CSS horizontal progress bar */
const CssBar: React.FC<{ value: number; color?: string; height?: number }> = ({
  value,
  color = MES_COLOR,
  height = 6,
}) => (
  <Box
    sx={{
      width: '100%',
      height,
      borderRadius: height / 2,
      bgcolor: '#F1F5F9',
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        width: `${Math.min(Math.max(value, 0), 100)}%`,
        height: '100%',
        bgcolor: color,
        borderRadius: height / 2,
        transition: 'width 0.4s ease',
      }}
    />
  </Box>
);

/** Mini sparkline (columnas) */
const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = MES_COLOR }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 56 }}>
      {data.map((v, i) => {
        const h = 10 + ((v - min) / range) * 46;
        const isLast = i === data.length - 1;
        return (
          <Tooltip key={i} title={String(v)} arrow>
            <Box
              sx={{
                flex: 1,
                height: h,
                bgcolor: isLast ? color : alpha(color, 0.35),
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
};

/** Campo etiqueta/valor para diálogos */
const Field: React.FC<{ label: string; value: React.ReactNode; full?: boolean }> = ({ label, value, full }) => (
  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25, gridColumn: full ? '1 / -1' : undefined }}>
    <Typography sx={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{value}</Typography>
  </Box>
);

/** Lista de barras horizontales para desgloses */
const BreakdownList: React.FC<{ items: { label: string; value: number }[]; fmt: (n: number) => string; color?: string }> = ({
  items,
  fmt,
  color = MES_COLOR,
}) => {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <Stack spacing={1}>
      {items.map((it) => (
        <Box key={it.label}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
            <Typography sx={{ fontSize: '0.68rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1 }}>
              {it.label}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color, fontWeight: 700, flexShrink: 0 }}>{fmt(it.value)}</Typography>
          </Box>
          <CssBar value={(it.value / max) * 100} color={color} height={6} />
        </Box>
      ))}
      {items.length === 0 && (
        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', textAlign: 'center', py: 1 }}>Sin datos para el filtro actual</Typography>
      )}
    </Stack>
  );
};

/** Single KPI card (clicable) */
const KpiCard: React.FC<{ kpi: Kpi; onClick: () => void }> = ({ kpi, onClick }) => {
  const diff = kpi.value - kpi.target;
  const good = kpi.higherIsBetter ? diff >= 0 : diff <= 0;
  const deltaColor = good ? '#22c55e' : '#ef4444';
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        bgcolor: BG_CARD,
        border: `1px solid ${MES_BORDER}`,
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        minWidth: 0,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        '&:hover': { borderColor: MES_COLOR, boxShadow: '0 4px 14px rgba(8,145,178,0.15)', transform: 'translateY(-2px)' },
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontSize: '0.65rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {kpi.label}
      </Typography>
      <Typography
        sx={{
          color: 'text.primary',
          fontSize: '1.3rem',
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {kpi.display}
        {kpi.unit && (
          <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 400, color: MES_COLOR, ml: 0.4 }}>
            {kpi.unit}
          </Box>
        )}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.1 }}>
        {good ? (
          <TrendingUpIcon sx={{ fontSize: 13, color: deltaColor }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: 13, color: deltaColor }} />
        )}
        <Typography sx={{ fontSize: '0.58rem', color: deltaColor, fontWeight: 700 }}>
          Obj. {kpi.fmt(kpi.target)}
          {kpi.unit ?? ''}
        </Typography>
      </Box>
    </Paper>
  );
};

/** Production line card (clicable) */
const LineCard: React.FC<{ line: ProductionLine; onClick: () => void }> = ({ line, onClick }) => {
  const progressPct = line.target > 0 ? Math.round((line.currentProduction / line.target) * 100) : 0;
  const oee = Math.round((line.availability * line.performance * line.quality) / 10000);
  const sc = statusColors[line.status];
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: '#F9FAFB',
        border: `1px solid #E5E7EB`,
        borderRadius: 1.5,
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        cursor: 'pointer',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.04) },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ color: '#1E293B', fontSize: '0.72rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {line.name}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.2,
            borderRadius: 0.75,
            bgcolor: sc.bg,
            border: `1px solid ${sc.text}33`,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: sc.text, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {line.status}
          </Typography>
        </Box>
      </Box>

      {/* OEE bar */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>OEE</Typography>
          <Typography sx={{ color: MES_COLOR, fontSize: '0.6rem', fontWeight: 700 }}>{oee}%</Typography>
        </Box>
        <CssBar value={oee} color={oee >= 85 ? '#22c55e' : oee >= 65 ? '#f59e0b' : '#ef4444'} height={5} />
      </Box>

      {/* Production vs target */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
          Prod: <Box component="span" sx={{ color: '#1E293B', fontWeight: 600 }}>{line.currentProduction.toLocaleString()}</Box>
          {' / '}{line.target.toLocaleString()} un
        </Typography>
        <Typography sx={{ color: progressPct >= 80 ? '#22c55e' : '#f59e0b', fontSize: '0.6rem', fontWeight: 700 }}>
          {progressPct}%
        </Typography>
      </Box>

      <Typography sx={{ color: 'text.disabled', fontSize: '0.58rem' }}>{line.shift} · {line.plant}</Typography>
    </Box>
  );
};

/** Active order row (clicable) */
const OrderRow: React.FC<{ order: ActiveOrder; onClick: () => void }> = ({ order, onClick }) => {
  const pc = priorityColors[order.priority];
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
        py: 0.9,
        px: 0.75,
        mx: -0.75,
        borderRadius: 1,
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) },
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography sx={{ color: MES_COLOR, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
            {order.number}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.62rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.product}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 0.7,
            py: 0.15,
            borderRadius: 0.75,
            bgcolor: pc.bg,
            border: `1px solid ${pc.border}`,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: pc.text, fontSize: '0.58rem', fontWeight: 700 }}>{order.priority}</Typography>
        </Box>
      </Box>
      <CssBar
        value={order.progress}
        color={order.progress >= 80 ? '#22c55e' : order.progress >= 50 ? MES_COLOR : '#f59e0b'}
        height={4}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ color: 'text.disabled', fontSize: '0.58rem' }}>
          Progreso: <Box component="span" sx={{ color: '#1E293B' }}>{order.progress}%</Box>
        </Typography>
        <Typography sx={{ color: 'text.disabled', fontSize: '0.58rem' }}>
          Restante: <Box component="span" sx={{ color: '#f59e0b' }}>{order.remainingTime}</Box>
        </Typography>
      </Box>
    </Box>
  );
};

/** Active stop row (clicable) */
const StopRow: React.FC<{ stop: ActiveStop; onClick: () => void }> = ({ stop, onClick }) => {
  const tc = stopTypeColors[stop.type];
  const dot = stopTrafficLight(stop.durationMinutes);
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.85,
        px: 0.75,
        mx: -0.75,
        borderRadius: 1,
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) },
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Traffic light dot */}
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}` }} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#1E293B', fontSize: '0.68rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stop.equipment}
        </Typography>
        <Typography sx={{ color: dot, fontSize: '0.6rem', mt: 0.15 }}>
          {stop.durationMinutes} min detenido
        </Typography>
      </Box>

      <Box
        sx={{
          px: 0.7,
          py: 0.2,
          borderRadius: 0.75,
          bgcolor: tc.bg,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ color: tc.text, fontSize: '0.58rem', fontWeight: 700 }}>{stop.type}</Typography>
      </Box>
    </Box>
  );
};

/** Scrap horizontal bar row (clicable) */
const ScrapBar: React.FC<{ entry: ScrapEntry; onClick: () => void }> = ({ entry, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
      mb: 1.5,
      p: 0.75,
      mx: -0.75,
      borderRadius: 1,
      cursor: 'pointer',
      transition: 'background-color 0.15s',
      '&:hover': { bgcolor: alpha(MES_COLOR, 0.05) },
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ color: 'text.primary', fontSize: '0.7rem' }}>{entry.label}</Typography>
      <Typography sx={{ color: entry.color, fontSize: '0.7rem', fontWeight: 700 }}>{entry.percentage}%</Typography>
    </Box>
    <CssBar value={entry.percentage} color={entry.color} height={10} />
  </Box>
);

/** Alert row (clicable) */
const AlertRow: React.FC<{ alert: Alert2; onClick: () => void }> = ({ alert, onClick }) => {
  const ac = alertColors[alert.level];
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 0.9,
        px: 1,
        borderRadius: 1,
        bgcolor: ac.bg,
        border: `1px solid ${ac.border}`,
        mb: 0.75,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.1s',
        '&:hover': { boxShadow: `0 3px 10px ${ac.border}`, transform: 'translateY(-1px)' },
        '&:last-child': { mb: 0 },
      }}
    >
      <Box
        sx={{
          px: 0.65,
          py: 0.15,
          borderRadius: 0.5,
          bgcolor: `${ac.text}22`,
          border: `1px solid ${ac.border}`,
          flexShrink: 0,
          mt: 0.1,
        }}
      >
        <Typography sx={{ color: ac.text, fontSize: '0.57rem', fontWeight: 700 }}>{alert.level}</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#1E293B', fontSize: '0.68rem', lineHeight: 1.35 }}>
          {alert.description}
        </Typography>
        <Typography sx={{ color: 'text.disabled', fontSize: '0.6rem', mt: 0.3 }}>
          {alert.source} · {alert.time}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Shared section card wrapper ──────────────────────────────────────────────
const SectionCard: React.FC<{ title: string; children: React.ReactNode; minHeight?: number; action?: React.ReactNode }> = ({
  title,
  children,
  minHeight,
  action,
}) => (
  <Paper
    elevation={0}
    sx={{
      bgcolor: BG_CARD,
      border: `1px solid ${MES_BORDER}`,
      borderRadius: 2,
      p: 2,
      height: '100%',
      minHeight,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1.5,
        borderBottom: `1px solid ${MES_BORDER}`,
        pb: 1,
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          color: MES_COLOR,
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </Typography>
      {action}
    </Box>
    <Box sx={{ flex: 1, overflow: 'hidden' }}>{children}</Box>
  </Paper>
);

// ─── Types for detail dialog & form ──────────────────────────────────────────
type Detail =
  | { kind: 'kpi'; data: Kpi }
  | { kind: 'line'; data: ProductionLine }
  | { kind: 'order'; data: ActiveOrder }
  | { kind: 'stop'; data: ActiveStop }
  | { kind: 'scrap'; data: ScrapEntry }
  | { kind: 'alert'; data: Alert2 };

interface StopForm {
  linea: string;
  tipo: '' | ActiveStop['type'];
  causa: string;
  responsable: string;
  turno: string;
  planta: string;
  inicio: string;
  duracion: string;
  observaciones: string;
}

const EMPTY_STOP_FORM: StopForm = {
  linea: '', tipo: '', causa: '', responsable: '', turno: '', planta: '', inicio: '', duracion: '', observaciones: '',
};

let _stopSeq = 457;

const nowLocal = (): string => {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const MESDashboard: React.FC = () => {
  // Datos mutables (permite registrar nuevas paradas)
  const [stops, setStops] = useState<ActiveStop[]>(activeStopsMock);
  const lines = productionLinesMock;
  const orders = activeOrdersMock;
  const alerts = alertsMock;

  // Filtros de tablero
  const [planta, setPlanta] = useState('Todas');
  const [turno, setTurno] = useState('Todos');
  const [fecha, setFecha] = useState('2026-07-07');
  const [search, setSearch] = useState('');

  const hayFiltros = planta !== 'Todas' || turno !== 'Todos' || search.trim() !== '';
  const resetFiltros = () => { setPlanta('Todas'); setTurno('Todos'); setSearch(''); };

  // Diálogos
  const [detail, setDetail] = useState<Detail | null>(null);
  const closeDetail = () => setDetail(null);

  // Formulario registrar parada
  const [stopFormOpen, setStopFormOpen] = useState(false);
  const [stopForm, setStopForm] = useState<StopForm>(EMPTY_STOP_FORM);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' });
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev });

  // ── Filtrado ──
  const matchesFilters = (plant: string, shift: string, ...text: string[]) => {
    if (planta !== 'Todas' && plant !== planta) return false;
    if (turno !== 'Todos' && shift !== turno) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!text.some((t) => t.toLowerCase().includes(q))) return false;
    }
    return true;
  };

  const filteredLines = lines.filter((l) => matchesFilters(l.plant, l.shift, l.name, l.product, l.operator));
  const filteredOrders = orders.filter((o) => matchesFilters(o.plant, o.shift, o.number, o.product, o.customer, o.line));
  const filteredStops = stops.filter((s) => matchesFilters(s.plant, s.shift, s.equipment, s.line, s.cause));

  // ── KPIs derivados de las líneas/órdenes filtradas ──
  const buildLineKpi = (
    id: string, label: string, unit: string | undefined, target: number, higher: boolean,
    trend: number[], desc: string, acc: (l: ProductionLine) => number, agg: 'avg' | 'sum', fmt: (n: number) => string,
  ): Kpi => {
    const vals = filteredLines.map(acc);
    const value = agg === 'avg' ? avg(vals) : sum(vals);
    const breakdown = filteredLines.map((l) => ({ label: l.short, value: acc(l) }));
    const byShift = TURNOS
      .map((t) => {
        const ls = filteredLines.filter((l) => l.shift === t);
        if (!ls.length) return null;
        const vs = ls.map(acc);
        return { label: t.replace('Turno ', ''), value: agg === 'avg' ? avg(vs) : sum(vs) };
      })
      .filter((x): x is { label: string; value: number } => x !== null);
    return { id, label, unit, value, display: fmt(value), target, higherIsBetter: higher, trend, desc, breakdown, byShift, fmt };
  };

  const lineOee = (l: ProductionLine) => Math.round((l.availability * l.performance * l.quality) / 10000);

  const ordersByLine = filteredLines.map((l) => ({ label: l.short, value: filteredOrders.filter((o) => o.line === l.name).length }));
  const ordersByShift = TURNOS
    .map((t) => ({ label: t.replace('Turno ', ''), value: filteredOrders.filter((o) => o.shift === t).length }))
    .filter((x) => filteredOrders.some((o) => o.shift === TURNOS.find((tt) => tt.replace('Turno ', '') === x.label)));

  const kpis: Kpi[] = [
    buildLineKpi('oee', 'OEE Global', '%', 85, true, [84, 85, 83, 86, 87, 88, 87.3], 'Overall Equipment Effectiveness — Disponibilidad × Rendimiento × Calidad, promedio de las líneas activas.', lineOee, 'avg', fmtPct),
    {
      id: 'ordenes', label: 'Órdenes Activas', unit: undefined, value: filteredOrders.length, display: String(filteredOrders.length),
      target: 15, higherIsBetter: false, trend: [10, 11, 13, 12, 14, 12, filteredOrders.length],
      desc: 'Órdenes de producción actualmente en ejecución en las líneas seleccionadas.',
      breakdown: ordersByLine, byShift: ordersByShift, fmt: fmtInt,
    },
    buildLineKpi('prod', 'Producción Hoy', ' un', 8000, true, [7200, 7800, 8100, 7900, 8300, 8420, 0], 'Unidades producidas acumuladas en el turno para las líneas seleccionadas.', (l) => l.currentProduction, 'sum', fmtInt),
    buildLineKpi('scrap', 'Scrap Rate', '%', 2.5, false, [2.8, 2.5, 2.6, 2.3, 2.2, 2.1, 2.1], 'Porcentaje de material no conforme (reproceso + defecto) sobre lo producido.', (l) => l.scrapPct, 'avg', fmtPct),
    buildLineKpi('disp', 'Disponibilidad', '%', 90, true, [89, 90, 88, 91, 92, 91, 91.2], 'Tiempo productivo real vs tiempo planificado de las líneas.', (l) => l.availability, 'avg', fmtPct),
    buildLineKpi('rend', 'Rendimiento', '%', 95, true, [93, 94, 95, 96, 95, 96, 95.8], 'Velocidad real vs velocidad ideal de ciclo de las líneas.', (l) => l.performance, 'avg', fmtPct),
    buildLineKpi('cal', 'Calidad', '%', 99, true, [98.8, 99, 99.2, 99.1, 99.3, 99.4, 99.4], 'Porcentaje de unidades conformes a la primera pasada.', (l) => l.quality, 'avg', fmtPct),
    buildLineKpi('pm', 'Cumplimiento PM', '%', 90, true, [82, 84, 85, 86, 87, 87, 87], 'Cumplimiento del plan de mantenimiento preventivo de los equipos de la línea.', (l) => l.pmCompliance, 'avg', fmtInt),
  ];

  // recomputa el trend de "Producción Hoy" con el valor filtrado
  const prodKpi = kpis.find((k) => k.id === 'prod');
  if (prodKpi) prodKpi.trend = [...prodKpi.trend.slice(0, 6), Math.round(prodKpi.value)];

  // ── Formulario parada ──
  const setStopField = (field: keyof StopForm, value: string) =>
    setStopForm((prev) => ({ ...prev, [field]: value }));

  const setStopLinea = (name: string) => {
    const l = lines.find((x) => x.name === name);
    setStopForm((prev) => ({ ...prev, linea: name, turno: l?.shift ?? prev.turno, planta: l?.plant ?? prev.planta }));
  };

  const openStopForm = () => { setStopForm({ ...EMPTY_STOP_FORM, inicio: nowLocal() }); setTriedSubmit(false); setStopFormOpen(true); };

  const stopFormValid = !!stopForm.linea && !!stopForm.tipo && !!stopForm.causa && !!stopForm.responsable && !!stopForm.inicio && !!stopForm.duracion && Number(stopForm.duracion) > 0;

  const handleCreateStop = () => {
    if (!stopFormValid) {
      setTriedSubmit(true);
      notify('Complete los campos obligatorios de la parada', 'warning');
      return;
    }
    const dur = Number(stopForm.duracion);
    const impact = dur >= 120 ? 'Alto' : dur >= 60 ? 'Medio' : 'Bajo';
    _stopSeq += 1;
    const nuevo: ActiveStop = {
      id: `n-${_stopSeq}`,
      codigo: `PA-${String(_stopSeq).padStart(4, '0')}`,
      equipment: stopForm.linea,
      type: stopForm.tipo as ActiveStop['type'],
      durationMinutes: dur,
      line: stopForm.linea,
      plant: stopForm.planta || '—',
      shift: stopForm.turno || '—',
      cause: stopForm.causa,
      responsable: stopForm.responsable,
      startTime: stopForm.inicio,
      impact,
      observaciones: stopForm.observaciones || undefined,
    };
    setStops((prev) => [nuevo, ...prev]);
    setStopFormOpen(false);
    notify(`Parada ${nuevo.codigo} registrada correctamente`, 'success');
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: 'text.primary' },
    '& label': { color: 'text.secondary' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: MES_BORDER },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: MES_COLOR },
    '& .MuiSvgIcon-root': { color: 'text.secondary' },
  };

  const dlgInputSx = {
    '& .MuiOutlinedInput-root': { color: 'text.primary' },
    '& label': { color: 'text.secondary' },
    '& fieldset': { borderColor: '#E5E7EB' },
    '& .MuiOutlinedInput-root:hover fieldset': { borderColor: '#CBD5E1' },
    '& .MuiSvgIcon-root': { color: 'text.secondary' },
  };

  return (
    <>
      <Layout>
        <Box
          sx={{
            bgcolor: BG_PAGE,
            minHeight: '100vh',
            p: { xs: 2, md: 3 },
            color: 'text.primary',
          }}
        >
          {/* ── Header ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
              pb: 2,
              borderBottom: `1px solid ${MES_BORDER}`,
              flexWrap: 'wrap',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: `${MES_COLOR}22`,
                border: `1px solid ${MES_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PrecisionManufacturingIcon sx={{ color: MES_COLOR, fontSize: 28 }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: '#1E293B',
                  fontWeight: 800,
                  fontSize: { xs: '1.1rem', md: '1.4rem' },
                  lineHeight: 1.2,
                }}
              >
                Torre de Control MES
              </Typography>
              <Typography sx={{ color: MES_COLOR, fontSize: '0.72rem', fontWeight: 500, mt: 0.3 }}>
                Manufacturing Execution System — Tiempo real · {fecha}
              </Typography>
            </Box>

            {/* Acciones */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.4 },
                    },
                  }}
                />
                <Typography sx={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: 700 }}>EN VIVO</Typography>
              </Box>
              <Tooltip title="Actualizar datos">
                <IconButton size="small" onClick={() => notify('Datos actualizados en tiempo real', 'info')} sx={{ border: `1px solid ${MES_BORDER}`, color: MES_COLOR }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FileDownloadIcon />}
                onClick={() => notify(`Exportando tablero (${fecha})...`, 'success')}
                sx={{ borderColor: MES_BORDER, color: MES_COLOR, borderRadius: '10px', fontWeight: 700, '&:hover': { borderColor: MES_COLOR, bgcolor: alpha(MES_COLOR, 0.06) } }}
              >
                Exportar
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openStopForm}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: '10px', fontWeight: 700 }}
              >
                Registrar parada
              </Button>
            </Box>
          </Box>

          {/* ── Barra de filtros ── */}
          <Paper elevation={0} sx={{ bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 2, p: 1.5, mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField
                select size="small" label="Planta" value={planta}
                onChange={(e) => setPlanta(e.target.value)} sx={{ minWidth: 180, ...inputSx }}
              >
                <MenuItem value="Todas">Todas las plantas</MenuItem>
                {PLANTAS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField
                select size="small" label="Turno" value={turno}
                onChange={(e) => setTurno(e.target.value)} sx={{ minWidth: 160, ...inputSx }}
              >
                <MenuItem value="Todos">Todos los turnos</MenuItem>
                {TURNOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField
                size="small" label="Fecha" type="date" value={fecha}
                onChange={(e) => setFecha(e.target.value)} InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160, ...inputSx }}
              />
              <TextField
                size="small" placeholder="Buscar línea, orden, producto..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 220, flex: '1 1 220px', ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={13} color="#94A3B8">🔍</Typography></InputAdornment> }}
              />
              {hayFiltros && (
                <Button
                  size="small" variant="outlined" onClick={resetFiltros}
                  sx={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11, flexShrink: 0 }}
                >
                  Limpiar
                </Button>
              )}
            </Stack>
          </Paper>

          {/* ── KPI Strip ── */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {kpis.map((kpi) => (
              <Grid size={{ xs: 6, sm: 3, md: 1.5 }} key={kpi.id}>
                <KpiCard kpi={kpi} onClick={() => setDetail({ kind: 'kpi', data: kpi })} />
              </Grid>
            ))}
          </Grid>

          {/* ── Central Row ── */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {/* Col 1: Líneas en tiempo real */}
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard
                title="Líneas en tiempo real"
                minHeight={400}
                action={<Chip label={filteredLines.length} size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700, height: 20 }} />}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {filteredLines.map((line) => (
                    <LineCard key={line.id} line={line} onClick={() => setDetail({ kind: 'line', data: line })} />
                  ))}
                  {filteredLines.length === 0 && (
                    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', py: 3 }}>Sin líneas para el filtro actual</Typography>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* Col 2: Órdenes activas */}
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard
                title="Órdenes activas"
                minHeight={400}
                action={<Chip label={filteredOrders.length} size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700, height: 20 }} />}
              >
                <Box>
                  {filteredOrders.map((order) => (
                    <OrderRow key={order.id} order={order} onClick={() => setDetail({ kind: 'order', data: order })} />
                  ))}
                  {filteredOrders.length === 0 && (
                    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', py: 3 }}>Sin órdenes para el filtro actual</Typography>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* Col 3: Paradas activas */}
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard
                title="Paradas activas"
                minHeight={400}
                action={<Chip label={filteredStops.length} size="small" sx={{ bgcolor: alpha('#ef4444', 0.12), color: '#ef4444', fontWeight: 700, height: 20 }} />}
              >
                <Box>
                  {filteredStops.map((stop) => (
                    <StopRow key={stop.id} stop={stop} onClick={() => setDetail({ kind: 'stop', data: stop })} />
                  ))}
                  {filteredStops.length === 0 && (
                    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', py: 3 }}>Sin paradas para el filtro actual</Typography>
                  )}
                </Box>
              </SectionCard>
            </Grid>
          </Grid>

          {/* ── Bottom Row ── */}
          <Grid container spacing={2}>
            {/* Col 1: Scrap por tipo */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Scrap por tipo">
                <Box sx={{ pt: 0.5 }}>
                  {scrapData.map((entry) => (
                    <ScrapBar key={entry.label} entry={entry} onClick={() => setDetail({ kind: 'scrap', data: entry })} />
                  ))}

                  {/* Legend total */}
                  <Box
                    sx={{
                      mt: 2,
                      pt: 1.5,
                      borderTop: `1px solid #E5E7EB`,
                      display: 'flex',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    {scrapData.map((entry) => (
                      <Box key={entry.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: entry.color, flexShrink: 0 }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                          {entry.label} — {entry.percentage}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </SectionCard>
            </Grid>

            {/* Col 2: Alertas críticas */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Alertas críticas">
                <Box sx={{ pt: 0.5 }}>
                  {alerts.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} onClick={() => setDetail({ kind: 'alert', data: alert })} />
                  ))}
                </Box>
              </SectionCard>
            </Grid>
          </Grid>
        </Box>
      </Layout>

      {/* ── Dialog de detalle (drill-down) ── */}
      <Dialog
        open={detail !== null}
        onClose={closeDetail}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {detail && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PrecisionManufacturingIcon sx={{ fontSize: 18, color: MES_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={13} fontWeight={800} color={MES_COLOR}>
                    {detail.kind === 'kpi' && `KPI · ${detail.data.label}`}
                    {detail.kind === 'line' && detail.data.name}
                    {detail.kind === 'order' && detail.data.number}
                    {detail.kind === 'stop' && `${detail.data.codigo} · ${detail.data.equipment}`}
                    {detail.kind === 'scrap' && `Scrap · ${detail.data.label}`}
                    {detail.kind === 'alert' && `Alerta ${detail.data.level}`}
                  </Typography>
                  <Typography fontSize={11} color="#64748B" noWrap>
                    {detail.kind === 'kpi' && 'Detalle del indicador — desglose y tendencia'}
                    {detail.kind === 'line' && `${detail.data.plant} · ${detail.data.shift}`}
                    {detail.kind === 'order' && detail.data.product}
                    {detail.kind === 'stop' && `${detail.data.line} · ${detail.data.plant}`}
                    {detail.kind === 'scrap' && 'Composición y principales causas'}
                    {detail.kind === 'alert' && `${detail.data.source} · ${detail.data.plant}`}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={closeDetail} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }} dividers>
              {/* ── KPI ── */}
              {detail.kind === 'kpi' && (() => {
                const k = detail.data;
                const diff = k.value - k.target;
                const good = k.higherIsBetter ? diff >= 0 : diff <= 0;
                return (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
                      <Box sx={{ flex: '1 1 160px', bgcolor: alpha(MES_COLOR, 0.06), border: `1px solid ${MES_BORDER}`, borderRadius: '10px', p: 2 }}>
                        <Typography fontSize={10} color="#64748B" fontWeight={700} textTransform="uppercase">Valor actual</Typography>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: MES_COLOR, lineHeight: 1.1 }}>
                          {k.display}<Box component="span" sx={{ fontSize: '1rem', ml: 0.3 }}>{k.unit}</Box>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          {good ? <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
                          <Typography fontSize={12} fontWeight={700} color={good ? '#22c55e' : '#ef4444'}>
                            Objetivo {k.fmt(k.target)}{k.unit} · {good ? 'En meta' : 'Bajo meta'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ flex: '2 1 260px', bgcolor: '#F8FAFC', borderRadius: '10px', p: 2 }}>
                        <Typography fontSize={10} color="#64748B" fontWeight={700} textTransform="uppercase" mb={1}>Tendencia — últimos 7 periodos</Typography>
                        <Sparkline data={k.trend} color={MES_COLOR} />
                      </Box>
                    </Box>

                    <Typography fontSize={12.5} color="#334155" sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5, lineHeight: 1.5 }}>
                      {k.desc}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Box>
                        <Typography fontSize={11} fontWeight={700} color="#1E293B" mb={1}>Desglose por línea</Typography>
                        <BreakdownList items={k.breakdown} fmt={k.fmt} />
                      </Box>
                      <Box>
                        <Typography fontSize={11} fontWeight={700} color="#1E293B" mb={1}>Desglose por turno</Typography>
                        <BreakdownList items={k.byShift} fmt={k.fmt} color={MES_DARK} />
                      </Box>
                    </Box>
                  </Stack>
                );
              })()}

              {/* ── LÍNEA ── */}
              {detail.kind === 'line' && (() => {
                const l = detail.data;
                const oee = lineOee(l);
                const progressPct = l.target > 0 ? Math.round((l.currentProduction / l.target) * 100) : 0;
                const sc = statusColors[l.status];
                return (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={l.status} size="small" sx={{ bgcolor: sc.bg, color: sc.text, fontWeight: 700 }} />
                      <Chip label={`OEE ${oee}%`} size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                      {[
                        { l: 'Disponibilidad', v: `${l.availability}%` },
                        { l: 'Rendimiento', v: `${l.performance}%` },
                        { l: 'Calidad', v: `${l.quality}%` },
                        { l: 'Scrap', v: `${l.scrapPct}%` },
                      ].map((m) => (
                        <Box key={m.l} sx={{ bgcolor: alpha(MES_COLOR, 0.06), borderRadius: '8px', p: 1.25, textAlign: 'center' }}>
                          <Typography fontSize={9} color="#64748B" fontWeight={600} textTransform="uppercase">{m.l}</Typography>
                          <Typography fontSize={17} fontWeight={800} color={MES_COLOR}>{m.v}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography fontSize={11} color="#64748B" fontWeight={600}>Producción vs objetivo</Typography>
                        <Typography fontSize={11} fontWeight={700} color={progressPct >= 80 ? '#22c55e' : '#f59e0b'}>{l.currentProduction.toLocaleString()} / {l.target.toLocaleString()} un · {progressPct}%</Typography>
                      </Box>
                      <CssBar value={progressPct} color={progressPct >= 80 ? '#22c55e' : '#f59e0b'} height={8} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                      <Field label="Planta" value={l.plant} />
                      <Field label="Turno" value={l.shift} />
                      <Field label="Operador" value={l.operator} />
                      <Field label="Producto actual" value={l.product} />
                      <Field label="Tiempo de ciclo" value={l.cycleTime} />
                      <Field label="Inicio de turno" value={l.startTime.replace('T', ' ')} />
                      <Field label="Cumplimiento PM" value={`${l.pmCompliance}%`} />
                    </Box>
                    <Box>
                      <Typography fontSize={11} fontWeight={700} color="#1E293B" mb={1}>Equipos de la línea</Typography>
                      <Stack spacing={0.75}>
                        {l.machines.map((m) => (
                          <Box key={m.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8FAFC', borderRadius: '8px', px: 1.25, py: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: machineStatusColor(m.status), flexShrink: 0 }} />
                            <Typography fontSize={12} color="#1E293B" sx={{ flex: 1 }}>{m.name}</Typography>
                            <Typography fontSize={10} fontWeight={700} color={machineStatusColor(m.status)}>{m.status}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                );
              })()}

              {/* ── ORDEN ── */}
              {detail.kind === 'order' && (() => {
                const o = detail.data;
                const pc = priorityColors[o.priority];
                return (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={o.priority} size="small" sx={{ bgcolor: pc.bg, color: pc.text, fontWeight: 700, border: `1px solid ${pc.border}` }} />
                      <Chip label={`${o.produced.toLocaleString()} / ${o.quantity.toLocaleString()} un`} size="small" sx={{ bgcolor: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography fontSize={11} color="#64748B" fontWeight={600}>Avance de la orden</Typography>
                        <Typography fontSize={11} fontWeight={700} color={o.progress >= 80 ? '#22c55e' : MES_COLOR}>{o.progress}% · Restante {o.remainingTime}</Typography>
                      </Box>
                      <CssBar value={o.progress} color={o.progress >= 80 ? '#22c55e' : o.progress >= 50 ? MES_COLOR : '#f59e0b'} height={8} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                      <Field label="Producto" value={o.product} />
                      <Field label="Línea" value={o.line} />
                      <Field label="Planta" value={o.plant} />
                      <Field label="Turno" value={o.shift} />
                      <Field label="Cliente" value={o.customer} />
                      <Field label="Responsable" value={o.responsable} />
                      <Field label="Cantidad plan." value={`${o.quantity.toLocaleString()} un`} />
                      <Field label="Producido" value={`${o.produced.toLocaleString()} un`} />
                      <Field label="Inicio" value={o.startTime.replace('T', ' ')} />
                      <Field label="Entrega" value={o.dueTime.replace('T', ' ')} />
                    </Box>
                    <Box>
                      <Typography fontSize={11} fontWeight={700} color="#1E293B" mb={1}>Operaciones</Typography>
                      <Stack spacing={0.75}>
                        {o.operations.map((op) => (
                          <Box key={op.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8FAFC', borderRadius: '8px', px: 1.25, py: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opStatusColor(op.status), flexShrink: 0 }} />
                            <Typography fontSize={12} color="#1E293B" sx={{ flex: 1 }}>{op.name}</Typography>
                            <Typography fontSize={10} fontWeight={700} color={opStatusColor(op.status)}>{op.status}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                );
              })()}

              {/* ── PARADA ── */}
              {detail.kind === 'stop' && (() => {
                const s = detail.data;
                const tc = stopTypeColors[s.type];
                const dot = stopTrafficLight(s.durationMinutes);
                return (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={s.type} size="small" sx={{ bgcolor: tc.bg, color: tc.text, fontWeight: 700 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dot, boxShadow: `0 0 8px ${dot}` }} />
                        <Typography fontSize={22} fontWeight={900} color={dot}>{s.durationMinutes} min</Typography>
                        <Typography fontSize={11} color="#64748B">detenido</Typography>
                      </Box>
                      <Chip label={`Impacto: ${s.impact}`} size="small" sx={{ ml: 'auto', bgcolor: alpha(dot, 0.15), color: dot, fontWeight: 700 }} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                      <Field label="Código" value={s.codigo} />
                      <Field label="Equipo / Línea" value={s.equipment} />
                      <Field label="Planta" value={s.plant} />
                      <Field label="Turno" value={s.shift} />
                      <Field label="Causa" value={s.cause} />
                      <Field label="Responsable" value={s.responsable} />
                      <Field label="Inicio" value={s.startTime.replace('T', ' ')} />
                    </Box>
                    {s.observaciones && (
                      <Box sx={{ bgcolor: alpha(dot, 0.06), border: `1px solid ${alpha(dot, 0.3)}`, borderRadius: '8px', p: 1.5 }}>
                        <Typography fontSize={10} color="#64748B" fontWeight={700} textTransform="uppercase" mb={0.5}>Observaciones</Typography>
                        <Typography fontSize={12.5} color="#334155" lineHeight={1.5}>{s.observaciones}</Typography>
                      </Box>
                    )}
                  </Stack>
                );
              })()}

              {/* ── SCRAP ── */}
              {detail.kind === 'scrap' && (() => {
                const s = detail.data;
                return (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, bgcolor: alpha(s.color, 0.1), border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: '10px', p: 2, textAlign: 'center' }}>
                        <Typography fontSize={10} color="#64748B" fontWeight={700} textTransform="uppercase">Porcentaje</Typography>
                        <Typography fontSize={28} fontWeight={900} color={s.color}>{s.percentage}%</Typography>
                      </Box>
                      <Box sx={{ flex: 1, bgcolor: '#F8FAFC', borderRadius: '10px', p: 2, textAlign: 'center' }}>
                        <Typography fontSize={10} color="#64748B" fontWeight={700} textTransform="uppercase">Unidades</Typography>
                        <Typography fontSize={28} fontWeight={900} color="#1E293B">{s.units.toLocaleString()}</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography fontSize={11} fontWeight={700} color="#1E293B" mb={1}>Principales causas</Typography>
                      <BreakdownList items={s.topCauses.map((c) => ({ label: c.label, value: c.pct }))} fmt={(n) => `${n}%`} color={s.color} />
                    </Box>
                  </Stack>
                );
              })()}

              {/* ── ALERTA ── */}
              {detail.kind === 'alert' && (() => {
                const a = detail.data;
                const ac = alertColors[a.level];
                return (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, bgcolor: ac.bg, border: `1px solid ${ac.border}`, borderRadius: '10px', p: 2 }}>
                      <WarningAmberIcon sx={{ color: ac.text, fontSize: 24, flexShrink: 0 }} />
                      <Box>
                        <Chip label={a.level} size="small" sx={{ bgcolor: `${ac.text}22`, color: ac.text, fontWeight: 700, mb: 0.75 }} />
                        <Typography fontSize={14} fontWeight={600} color="#1E293B" lineHeight={1.4}>{a.description}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                      <Field label="Fuente" value={a.source} />
                      <Field label="Planta" value={a.plant} />
                      <Field label="Detectada" value={a.time} />
                    </Box>
                    <Box sx={{ bgcolor: alpha(MES_COLOR, 0.06), border: `1px solid ${MES_BORDER}`, borderRadius: '8px', p: 1.5 }}>
                      <Typography fontSize={10} color={MES_COLOR} fontWeight={700} textTransform="uppercase" mb={0.5}>Acción recomendada</Typography>
                      <Typography fontSize={12.5} color="#334155" lineHeight={1.5}>{a.recommendation}</Typography>
                    </Box>
                  </Stack>
                );
              })()}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
              {detail.kind === 'alert' && (
                <Button
                  onClick={() => { notify('Alerta marcada como atendida', 'success'); closeDetail(); }}
                  sx={{ color: MES_COLOR, fontWeight: 700, mr: 'auto' }}
                >
                  Marcar como atendida
                </Button>
              )}
              {(detail.kind === 'line' || detail.kind === 'stop') && (
                <Button
                  onClick={() => { notify('Detalle exportado', 'success'); }}
                  startIcon={<FileDownloadIcon />}
                  sx={{ color: MES_COLOR, fontWeight: 700, mr: 'auto' }}
                >
                  Exportar
                </Button>
              )}
              <Button
                variant="contained"
                onClick={closeDetail}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700, borderRadius: '8px' }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog Registrar parada (formulario de alto nivel) ── */}
      <Dialog
        open={stopFormOpen}
        onClose={() => setStopFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${alpha(MES_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(MES_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ fontSize: 20, color: MES_COLOR }} />
            </Box>
            <Box>
              <Typography fontSize={15} fontWeight={800} color="#1E293B">Registrar parada de producción</Typography>
              <Typography fontSize={11} color="#64748B">Documente la parada para el análisis de OEE y disponibilidad</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setStopFormOpen(false)} sx={{ color: 'grey.500' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75, pt: 0.5 }}>
            {/* Línea */}
            <TextField
              select fullWidth size="small" label="Línea / Equipo *"
              value={stopForm.linea}
              onChange={(e) => setStopLinea(e.target.value)}
              error={triedSubmit && !stopForm.linea}
              helperText={triedSubmit && !stopForm.linea ? 'Seleccione la línea' : ' '}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, ...dlgInputSx }}
            >
              <MenuItem value=""><em>Seleccionar línea...</em></MenuItem>
              {lines.map((l) => <MenuItem key={l.id} value={l.name}>{l.name}</MenuItem>)}
            </TextField>

            {/* Planta (auto, readonly) */}
            <TextField
              fullWidth size="small" label="Planta"
              value={stopForm.planta}
              InputProps={{ readOnly: true }}
              helperText="Se autocompleta desde la línea"
              sx={{ ...dlgInputSx, '& .MuiOutlinedInput-root': { color: 'text.secondary', bgcolor: '#F8FAFC' } }}
            />
            {/* Turno (auto, readonly) */}
            <TextField
              fullWidth size="small" label="Turno"
              value={stopForm.turno}
              InputProps={{ readOnly: true }}
              helperText="Se autocompleta desde la línea"
              sx={{ ...dlgInputSx, '& .MuiOutlinedInput-root': { color: 'text.secondary', bgcolor: '#F8FAFC' } }}
            />

            {/* Tipo */}
            <TextField
              select fullWidth size="small" label="Tipo de parada *"
              value={stopForm.tipo}
              onChange={(e) => setStopField('tipo', e.target.value)}
              error={triedSubmit && !stopForm.tipo}
              helperText={triedSubmit && !stopForm.tipo ? 'Seleccione el tipo' : ' '}
              sx={dlgInputSx}
            >
              <MenuItem value=""><em>Seleccionar...</em></MenuItem>
              {STOP_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stopTypeColors[t].text }} />
                    <span>{t}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            {/* Causa */}
            <TextField
              select fullWidth size="small" label="Causa *"
              value={stopForm.causa}
              onChange={(e) => setStopField('causa', e.target.value)}
              error={triedSubmit && !stopForm.causa}
              helperText={triedSubmit && !stopForm.causa ? 'Seleccione la causa' : ' '}
              sx={dlgInputSx}
            >
              <MenuItem value=""><em>Seleccionar...</em></MenuItem>
              {CAUSAS_PARADA.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>

            {/* Responsable */}
            <TextField
              select fullWidth size="small" label="Responsable *"
              value={stopForm.responsable}
              onChange={(e) => setStopField('responsable', e.target.value)}
              error={triedSubmit && !stopForm.responsable}
              helperText={triedSubmit && !stopForm.responsable ? 'Seleccione el responsable' : ' '}
              sx={dlgInputSx}
            >
              <MenuItem value=""><em>Seleccionar...</em></MenuItem>
              {RESPONSABLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>

            {/* Duración */}
            <TextField
              fullWidth size="small" label="Duración *" type="number"
              value={stopForm.duracion}
              onChange={(e) => setStopField('duracion', e.target.value)}
              error={triedSubmit && (!stopForm.duracion || Number(stopForm.duracion) <= 0)}
              helperText={triedSubmit && (!stopForm.duracion || Number(stopForm.duracion) <= 0) ? 'Ingrese los minutos' : ' '}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="#94A3B8">min</Typography></InputAdornment> }}
              sx={dlgInputSx}
            />

            {/* Inicio */}
            <TextField
              fullWidth size="small" label="Inicio de la parada *" type="datetime-local"
              value={stopForm.inicio}
              onChange={(e) => setStopField('inicio', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={triedSubmit && !stopForm.inicio}
              helperText={triedSubmit && !stopForm.inicio ? 'Indique el inicio' : ' '}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, ...dlgInputSx }}
            />

            {/* Observaciones */}
            <TextField
              fullWidth size="small" label="Observaciones" multiline rows={2}
              value={stopForm.observaciones}
              onChange={(e) => setStopField('observaciones', e.target.value)}
              placeholder="Detalle de la causa, acciones tomadas..."
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, ...dlgInputSx }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setStopFormOpen(false)} sx={{ color: 'grey.500', fontWeight: 600 }}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateStop}
            disabled={!stopFormValid}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: alpha(MES_COLOR, 0.3), color: '#fff' }, fontWeight: 700, borderRadius: '10px', px: 3 }}
          >
            Registrar parada
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MESDashboard;
