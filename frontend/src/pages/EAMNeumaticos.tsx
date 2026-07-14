import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  Alert,
  TextField,
  MenuItem,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Stack,
  Snackbar,
  Tooltip,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2';
import {
  WarningAmber,
  TireRepair,
  LocalShipping,
  Inventory2,
  Recycling,
  AttachMoney,
  Speed,
  RotateRight,
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
  FileDownloadOutlined as ExportIcon,
  History as HistoryIcon,
  Straighten as StraightenIcon,
  Compress as CompressIcon,
  Place as PlaceIcon,
  BuildCircle as BuildIcon,
  SwapHoriz as SwapIcon,
  MonetizationOn as MoneyIcon,
} from '@mui/icons-material';

const EAM_COLOR = '#32AC5C';
const EAM_DARK = '#27884A';

// ─── Types ───────────────────────────────────────────────────────────────────

type EstadoNeumatico = 'Bueno' | 'Desgaste Medio' | 'Crítico' | 'En Reencauche' | 'En Almacén';

interface EventoHistorial {
  fecha: string;
  tipo: 'Montaje' | 'Rotación' | 'Reencauche' | 'Inspección' | 'Presión' | 'Desmontaje';
  detalle: string;
  km: number;
}

interface Neumatico {
  codigo: string;
  marca: string;
  referencia: string;
  medida: string;
  estado: EstadoNeumatico;
  activo: string;
  posicion: string;
  kmTotal: number;
  vidaUtilKm: number;
  profundidadActual: number;
  // Enriquecido
  profundidadInicial: number;
  presionActual: number;      // psi
  presionRecomendada: number; // psi
  dot: string;                // semana/año de fabricación
  fechaMontaje: string;
  costo: number;              // COP
  reencauches: number;
  maxReencauches: number;
  historial: EventoHistorial[];
}

interface Vehiculo {
  id: string;
  placa: string;
  tipo: 'camion' | 'tractocamion';
  modelo: string;
}

interface NeumaticoPosicion {
  posicion: string;
  marca: string;
  medida: string;
  km: number;
  desgaste: number;
}

interface CostoBrand {
  marca: string;
  costoPorKm: number;
  vidaPromedio: number;
  cantidad: number;
  reencauches: number;
}

interface Rotacion {
  codigo: string;
  activo: string;
  posicion: string;
  kmActual: number;
  kmRecomendado: number;
  marca: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockNeumaticos: Neumatico[] = [
  { codigo: 'NEU-001', marca: 'Michelin', referencia: 'X Multi D', medida: '295/80 R22.5', estado: 'Bueno', activo: 'TRK-001', posicion: 'DA1', kmTotal: 45000, vidaUtilKm: 120000, profundidadActual: 12, profundidadInicial: 16, presionActual: 118, presionRecomendada: 120, dot: '2223', fechaMontaje: '2024-01-15', costo: 2350000, reencauches: 0, maxReencauches: 2,
    historial: [
      { fecha: '2024-01-15', tipo: 'Montaje', detalle: 'Instalado nuevo en eje direccional DA1', km: 0 },
      { fecha: '2024-06-02', tipo: 'Inspección', detalle: 'Profundidad 14mm, desgaste uniforme', km: 22000 },
      { fecha: '2024-11-10', tipo: 'Presión', detalle: 'Ajuste a 120 psi', km: 45000 },
    ] },
  { codigo: 'NEU-002', marca: 'Bridgestone', referencia: 'R249 EVO', medida: '295/80 R22.5', estado: 'Desgaste Medio', activo: 'TRK-001', posicion: 'DA2', kmTotal: 78000, vidaUtilKm: 100000, profundidadActual: 6, profundidadInicial: 15, presionActual: 112, presionRecomendada: 120, dot: '2123', fechaMontaje: '2023-09-20', costo: 2180000, reencauches: 1, maxReencauches: 2,
    historial: [
      { fecha: '2023-09-20', tipo: 'Montaje', detalle: 'Instalado nuevo en DA2', km: 0 },
      { fecha: '2024-03-15', tipo: 'Rotación', detalle: 'Rotado desde eje tractor a direccional', km: 41000 },
      { fecha: '2024-10-01', tipo: 'Inspección', detalle: 'Desgaste medio, monitorear presión', km: 78000 },
    ] },
  { codigo: 'NEU-003', marca: 'Continental', referencia: 'HSC1', medida: '315/80 R22.5', estado: 'Crítico', activo: 'TRK-002', posicion: 'DA1', kmTotal: 98000, vidaUtilKm: 100000, profundidadActual: 2, profundidadInicial: 16, presionActual: 104, presionRecomendada: 120, dot: '2022', fechaMontaje: '2022-11-05', costo: 2050000, reencauches: 1, maxReencauches: 2,
    historial: [
      { fecha: '2022-11-05', tipo: 'Montaje', detalle: 'Instalado nuevo en DA1', km: 0 },
      { fecha: '2023-08-12', tipo: 'Reencauche', detalle: 'Primer reencauche banda HSC1', km: 62000 },
      { fecha: '2024-12-01', tipo: 'Inspección', detalle: 'Profundidad crítica 2mm - reemplazo urgente', km: 98000 },
    ] },
  { codigo: 'NEU-004', marca: 'Goodyear', referencia: 'Fuelmax D', medida: '295/80 R22.5', estado: 'Bueno', activo: 'TRK-002', posicion: 'DA2', kmTotal: 32000, vidaUtilKm: 110000, profundidadActual: 14, profundidadInicial: 17, presionActual: 119, presionRecomendada: 120, dot: '2323', fechaMontaje: '2024-04-10', costo: 2480000, reencauches: 0, maxReencauches: 2,
    historial: [
      { fecha: '2024-04-10', tipo: 'Montaje', detalle: 'Instalado nuevo en DA2', km: 0 },
      { fecha: '2024-09-05', tipo: 'Inspección', detalle: 'Estado óptimo, desgaste bajo', km: 32000 },
    ] },
  { codigo: 'NEU-005', marca: 'Michelin', referencia: 'X Multi T', medida: '295/80 R22.5', estado: 'En Reencauche', activo: 'TRK-003', posicion: '-', kmTotal: 91000, vidaUtilKm: 120000, profundidadActual: 3, profundidadInicial: 16, presionActual: 0, presionRecomendada: 120, dot: '2122', fechaMontaje: '2023-02-18', costo: 2350000, reencauches: 1, maxReencauches: 2,
    historial: [
      { fecha: '2023-02-18', tipo: 'Montaje', detalle: 'Instalado en eje tractor', km: 0 },
      { fecha: '2024-05-20', tipo: 'Desmontaje', detalle: 'Retirado para segundo reencauche', km: 91000 },
      { fecha: '2024-12-15', tipo: 'Reencauche', detalle: 'En proceso - banda X Multi T2', km: 91000 },
    ] },
  { codigo: 'NEU-006', marca: 'Bridgestone', referencia: 'M729', medida: '11 R22.5', estado: 'Bueno', activo: 'TRK-004', posicion: 'TA1', kmTotal: 21000, vidaUtilKm: 100000, profundidadActual: 16, profundidadInicial: 18, presionActual: 105, presionRecomendada: 105, dot: '2423', fechaMontaje: '2024-06-01', costo: 1950000, reencauches: 0, maxReencauches: 2,
    historial: [
      { fecha: '2024-06-01', tipo: 'Montaje', detalle: 'Instalado nuevo en eje tractor TA1', km: 0 },
      { fecha: '2024-11-20', tipo: 'Inspección', detalle: 'Estado óptimo', km: 21000 },
    ] },
  { codigo: 'NEU-007', marca: 'Continental', referencia: 'HDR2', medida: '315/80 R22.5', estado: 'Desgaste Medio', activo: 'TRK-004', posicion: 'TA2', kmTotal: 64000, vidaUtilKm: 105000, profundidadActual: 7, profundidadInicial: 16, presionActual: 108, presionRecomendada: 110, dot: '2223', fechaMontaje: '2023-11-12', costo: 2100000, reencauches: 0, maxReencauches: 2,
    historial: [
      { fecha: '2023-11-12', tipo: 'Montaje', detalle: 'Instalado nuevo en TA2', km: 0 },
      { fecha: '2024-08-08', tipo: 'Rotación', detalle: 'Rotación cruzada eje tractor', km: 48000 },
      { fecha: '2024-12-01', tipo: 'Inspección', detalle: 'Desgaste medio, vida útil 61%', km: 64000 },
    ] },
  { codigo: 'NEU-008', marca: 'Goodyear', referencia: 'Omnitrac S', medida: '11 R22.5', estado: 'En Almacén', activo: '-', posicion: '-', kmTotal: 0, vidaUtilKm: 110000, profundidadActual: 18, profundidadInicial: 18, presionActual: 0, presionRecomendada: 105, dot: '2523', fechaMontaje: '-', costo: 2020000, reencauches: 0, maxReencauches: 2,
    historial: [
      { fecha: '2024-10-30', tipo: 'Inspección', detalle: 'Recibido en almacén - unidad nueva', km: 0 },
    ] },
  { codigo: 'NEU-009', marca: 'Michelin', referencia: 'X Works Z', medida: '315/80 R22.5', estado: 'Crítico', activo: 'TRK-005', posicion: 'DB1', kmTotal: 109000, vidaUtilKm: 120000, profundidadActual: 1, profundidadInicial: 16, presionActual: 98, presionRecomendada: 120, dot: '2021', fechaMontaje: '2022-01-08', costo: 2600000, reencauches: 2, maxReencauches: 2,
    historial: [
      { fecha: '2022-01-08', tipo: 'Montaje', detalle: 'Instalado nuevo', km: 0 },
      { fecha: '2023-04-10', tipo: 'Reencauche', detalle: 'Primer reencauche', km: 55000 },
      { fecha: '2024-02-20', tipo: 'Reencauche', detalle: 'Segundo reencauche (máximo alcanzado)', km: 88000 },
      { fecha: '2024-12-10', tipo: 'Inspección', detalle: 'Profundidad 1mm - fin de vida útil', km: 109000 },
    ] },
  { codigo: 'NEU-010', marca: 'Bridgestone', referencia: 'V-Steel Rib', medida: '295/80 R22.5', estado: 'Bueno', activo: 'TRK-005', posicion: 'DB2', kmTotal: 38000, vidaUtilKm: 100000, profundidadActual: 13, profundidadInicial: 16, presionActual: 120, presionRecomendada: 120, dot: '2323', fechaMontaje: '2024-03-22', costo: 2200000, reencauches: 0, maxReencauches: 2,
    historial: [
      { fecha: '2024-03-22', tipo: 'Montaje', detalle: 'Instalado nuevo en DB2', km: 0 },
      { fecha: '2024-10-15', tipo: 'Presión', detalle: 'Verificación presión OK', km: 38000 },
    ] },
];

const mockVehiculos: Vehiculo[] = [
  { id: 'v1', placa: 'TRK-001', tipo: 'tractocamion', modelo: 'Kenworth T680 2022' },
  { id: 'v2', placa: 'TRK-002', tipo: 'tractocamion', modelo: 'Freightliner Cascadia 2021' },
  { id: 'v3', placa: 'TRK-003', tipo: 'camion', modelo: 'International MV 2023' },
  { id: 'v4', placa: 'TRK-004', tipo: 'camion', modelo: 'Chevrolet NHR 2022' },
  { id: 'v5', placa: 'TRK-005', tipo: 'tractocamion', modelo: 'Volvo VNL760 2023' },
];

const mockPosicionesTractocamion: NeumaticoPosicion[] = [
  { posicion: 'DA-I', marca: 'Michelin', medida: '295/80 R22.5', km: 45000, desgaste: 38 },
  { posicion: 'DA-D', marca: 'Michelin', medida: '295/80 R22.5', km: 47000, desgaste: 39 },
  { posicion: 'TA-I-EXT', marca: 'Bridgestone', medida: '295/80 R22.5', km: 78000, desgaste: 78 },
  { posicion: 'TA-I-INT', marca: 'Bridgestone', medida: '295/80 R22.5', km: 76000, desgaste: 76 },
  { posicion: 'TA-D-EXT', marca: 'Continental', medida: '315/80 R22.5', km: 98000, desgaste: 98 },
  { posicion: 'TA-D-INT', marca: 'Continental', medida: '315/80 R22.5', km: 96000, desgaste: 96 },
  { posicion: 'TB-I-EXT', marca: 'Goodyear', medida: '295/80 R22.5', km: 32000, desgaste: 29 },
  { posicion: 'TB-I-INT', marca: 'Goodyear', medida: '295/80 R22.5', km: 33000, desgaste: 30 },
  { posicion: 'TB-D-EXT', marca: 'Michelin', medida: '295/80 R22.5', km: 91000, desgaste: 76 },
  { posicion: 'TB-D-INT', marca: 'Michelin', medida: '295/80 R22.5', km: 89000, desgaste: 74 },
  { posicion: 'SA-I-EXT', marca: 'Bridgestone', medida: '11 R22.5', km: 21000, desgaste: 21 },
  { posicion: 'SA-I-INT', marca: 'Bridgestone', medida: '11 R22.5', km: 22000, desgaste: 22 },
  { posicion: 'SA-D-EXT', marca: 'Continental', medida: '315/80 R22.5', km: 64000, desgaste: 61 },
  { posicion: 'SA-D-INT', marca: 'Continental', medida: '315/80 R22.5', km: 63000, desgaste: 60 },
  { posicion: 'SB-I-EXT', marca: 'Goodyear', medida: '11 R22.5', km: 0, desgaste: 0 },
  { posicion: 'SB-I-INT', marca: 'Goodyear', medida: '11 R22.5', km: 0, desgaste: 0 },
  { posicion: 'SB-D-EXT', marca: 'Michelin', medida: '315/80 R22.5', km: 109000, desgaste: 91 },
  { posicion: 'SB-D-INT', marca: 'Michelin', medida: '295/80 R22.5', km: 38000, desgaste: 35 },
];

const mockPosicionesCamion: NeumaticoPosicion[] = [
  { posicion: 'DA-I', marca: 'Michelin', medida: '295/80 R22.5', km: 45000, desgaste: 38 },
  { posicion: 'DA-D', marca: 'Michelin', medida: '295/80 R22.5', km: 47000, desgaste: 39 },
  { posicion: 'TA-I-EXT', marca: 'Bridgestone', medida: '295/80 R22.5', km: 78000, desgaste: 78 },
  { posicion: 'TA-I-INT', marca: 'Bridgestone', medida: '295/80 R22.5', km: 76000, desgaste: 76 },
  { posicion: 'TA-D-EXT', marca: 'Continental', medida: '315/80 R22.5', km: 98000, desgaste: 98 },
  { posicion: 'TA-D-INT', marca: 'Continental', medida: '315/80 R22.5', km: 96000, desgaste: 96 },
];

const mockCostoBrands: CostoBrand[] = [
  { marca: 'Continental', costoPorKm: 385, vidaPromedio: 105000, cantidad: 58, reencauches: 12 },
  { marca: 'Michelin', costoPorKm: 420, vidaPromedio: 118000, cantidad: 72, reencauches: 18 },
  { marca: 'Bridgestone', costoPorKm: 445, vidaPromedio: 98000, cantidad: 64, reencauches: 10 },
  { marca: 'Goodyear', costoPorKm: 490, vidaPromedio: 108000, cantidad: 54, reencauches: 8 },
];

const mockRotaciones: Rotacion[] = [
  { codigo: 'NEU-003', activo: 'TRK-002', posicion: 'DA1', kmActual: 98000, kmRecomendado: 40000, marca: 'Continental' },
  { codigo: 'NEU-009', activo: 'TRK-005', posicion: 'DB1', kmActual: 109000, kmRecomendado: 40000, marca: 'Michelin' },
  { codigo: 'NEU-005', activo: 'TRK-003', posicion: 'TA2', kmActual: 91000, kmRecomendado: 40000, marca: 'Michelin' },
  { codigo: 'NEU-002', activo: 'TRK-001', posicion: 'DA2', kmActual: 78000, kmRecomendado: 40000, marca: 'Bridgestone' },
  { codigo: 'NEU-007', activo: 'TRK-004', posicion: 'TA2', kmActual: 64000, kmRecomendado: 40000, marca: 'Continental' },
];

// Genera un layout de posiciones determinístico y ÚNICO por vehículo, para que
// al seleccionar un vehículo distinto el diagrama refleje neumáticos distintos.
function posicionesDeVehiculo(v: Vehiculo): NeumaticoPosicion[] {
  const base = v.tipo === 'tractocamion' ? mockPosicionesTractocamion : mockPosicionesCamion;
  // Semilla numérica a partir de la placa (p. ej. TRK-001 -> 1)
  const seed = parseInt(v.placa.replace(/\D/g, ''), 10) || 1;
  const marcas = MARCAS_ORDEN;
  return base.map((p, i) => {
    // Desgaste desplazado por semilla, acotado a 0-99
    const delta = ((seed * 7 + i * 13) % 40) - 12;
    const desgaste = p.km === 0 ? 0 : Math.max(4, Math.min(99, p.desgaste + delta));
    const km = p.km === 0 ? 0 : Math.max(1000, Math.round((desgaste / 100) * 108000 / 500) * 500);
    const marca = marcas[(seed + i) % marcas.length];
    return { posicion: p.posicion, marca, medida: p.medida, km, desgaste };
  });
}

const MARCAS_ORDEN = ['Michelin', 'Bridgestone', 'Continental', 'Goodyear'];
const MARCAS = ['Michelin', 'Bridgestone', 'Continental', 'Goodyear'];
const MEDIDAS = ['295/80 R22.5', '315/80 R22.5', '11 R22.5', '385/65 R22.5'];
const ESTADOS: EstadoNeumatico[] = ['Bueno', 'Desgaste Medio', 'Crítico', 'En Reencauche', 'En Almacén'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEstadoColor(estado: EstadoNeumatico): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (estado) {
    case 'Bueno': return 'success';
    case 'Desgaste Medio': return 'warning';
    case 'Crítico': return 'error';
    case 'En Reencauche': return 'info';
    case 'En Almacén': return 'default';
  }
}

function getDesgasteColor(pct: number): string {
  if (pct >= 90) return '#EF4444';
  if (pct >= 70) return '#F97316';
  if (pct >= 50) return '#EAB308';
  return '#22C55E';
}

function getProfundidadColor(mm: number): string {
  if (mm <= 2) return '#EF4444';
  if (mm <= 4) return '#F97316';
  return '#22C55E';
}

function calcVidaUsada(neu: Neumatico): number {
  return Math.min(Math.round((neu.kmTotal / neu.vidaUtilKm) * 100), 100);
}

function hasAlerta(neu: Neumatico): boolean {
  return neu.profundidadActual < 3 || calcVidaUsada(neu) > 90;
}

function costoPorKm(neu: Neumatico): number {
  if (neu.kmTotal <= 0) return 0;
  return Math.round(neu.costo / neu.kmTotal);
}

const EVENTO_COLOR: Record<EventoHistorial['tipo'], string> = {
  Montaje: '#3B82F6',
  Rotación: '#A855F7',
  Reencauche: '#0EA5E9',
  Inspección: EAM_COLOR,
  Presión: '#F59E0B',
  Desmontaje: '#64748B',
};

const formatCOP = (v: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card sx={{ border: `1px solid ${color ?? EAM_COLOR}22`, height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Avatar sx={{ bgcolor: `${color ?? EAM_COLOR}22`, color: color ?? EAM_COLOR, width: 48, height: 48 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ color: color ?? EAM_COLOR, fontWeight: 700, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Detail metric mini-card ──────────────────────────────────────────────────

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '12px', p: 1.75, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1.1 }} noWrap>{value}</Typography>
      <Typography sx={{ fontSize: 10.5, color: '#64748B', mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
}

// ─── Neumático Detail Dialog ──────────────────────────────────────────────────

function NeumaticoDialog({
  neu,
  onClose,
  onAction,
}: {
  neu: Neumatico | null;
  onClose: () => void;
  onAction: (accion: string, neu: Neumatico) => void;
}) {
  if (!neu) return null;
  const vida = calcVidaUsada(neu);
  const desgasteProf = neu.profundidadInicial > 0
    ? Math.round(((neu.profundidadInicial - neu.profundidadActual) / neu.profundidadInicial) * 100)
    : 0;
  const presionDelta = neu.presionRecomendada > 0 ? neu.presionActual - neu.presionRecomendada : 0;
  const presionColor = neu.presionActual === 0 ? '#64748B' : Math.abs(presionDelta) <= 3 ? '#22C55E' : Math.abs(presionDelta) <= 8 ? '#F59E0B' : '#EF4444';
  const veh = mockVehiculos.find(v => v.placa === neu.activo);

  const ficha = [
    { label: 'Marca', value: neu.marca },
    { label: 'Referencia', value: neu.referencia },
    { label: 'Medida', value: neu.medida },
    { label: 'DOT (fabricación)', value: neu.dot },
    { label: 'Fecha de montaje', value: neu.fechaMontaje },
    { label: 'Vehículo asignado', value: neu.activo === '-' ? 'Sin asignar (Almacén)' : `${neu.activo}${veh ? ` · ${veh.modelo}` : ''}` },
    { label: 'Posición', value: neu.posicion === '-' ? 'N/A' : neu.posicion },
    { label: 'Costo de adquisición', value: formatCOP(neu.costo) },
  ];

  return (
    <Dialog
      open={!!neu}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, width: 40, height: 40 }}>
            <TireRepair />
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: EAM_COLOR, fontFamily: 'monospace' }}>{neu.codigo}</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>{neu.marca} {neu.referencia} · {neu.medida}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={neu.estado} size="small" color={getEstadoColor(neu.estado)} sx={{ fontWeight: 700, fontSize: 10 }} />
          <IconButton size="small" onClick={onClose} sx={{ color: 'grey.500' }}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#F8FAFC' }}>
        {hasAlerta(neu) && (
          <Alert severity={neu.profundidadActual <= 2 ? 'error' : 'warning'} icon={<WarningAmber />} sx={{ mb: 2, borderRadius: '10px' }}>
            {neu.profundidadActual <= 2
              ? `Profundidad crítica (${neu.profundidadActual} mm). Reemplazo o reencauche urgente.`
              : `Vida útil al ${vida}%. Programar rotación o reemplazo próximo.`}
          </Alert>
        )}

        {/* Métricas clave */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Km recorridos" value={neu.kmTotal.toLocaleString('es-CO')} color="#3B82F6" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Vida útil usada" value={`${vida}%`} color={getDesgasteColor(vida)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Profundidad" value={`${neu.profundidadActual} mm`} color={getProfundidadColor(neu.profundidadActual)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Presión" value={neu.presionActual === 0 ? 'N/A' : `${neu.presionActual} psi`} color={presionColor} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Costo / km" value={costoPorKm(neu) === 0 ? 'N/A' : formatCOP(costoPorKm(neu))} color={EAM_DARK} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Reencauches" value={`${neu.reencauches} / ${neu.maxReencauches}`} color="#A855F7" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Desgaste labrado" value={`${desgasteProf}%`} color={getDesgasteColor(desgasteProf)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricBox label="Vida útil total" value={`${(neu.vidaUtilKm / 1000).toFixed(0)}k km`} color="#0EA5E9" />
          </Grid>
        </Grid>

        {/* Barras de progreso profundidad / presión */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <StraightenIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Estado físico</Typography>
          </Stack>
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>Profundidad de labrado ({neu.profundidadActual} / {neu.profundidadInicial} mm)</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: getProfundidadColor(neu.profundidadActual) }}>{100 - desgasteProf}% restante</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={neu.profundidadInicial > 0 ? (neu.profundidadActual / neu.profundidadInicial) * 100 : 0}
              sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: getProfundidadColor(neu.profundidadActual), borderRadius: 5 } }} />
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                <CompressIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                Presión {neu.presionActual === 0 ? '(desmontado)' : `(${neu.presionActual} / ${neu.presionRecomendada} psi)`}
              </Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: presionColor }}>
                {neu.presionActual === 0 ? 'N/A' : presionDelta === 0 ? 'Óptima' : `${presionDelta > 0 ? '+' : ''}${presionDelta} psi`}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={neu.presionRecomendada > 0 ? Math.min((neu.presionActual / neu.presionRecomendada) * 100, 100) : 0}
              sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: presionColor, borderRadius: 5 } }} />
          </Box>
        </Paper>

        {/* Ficha técnica */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <PlaceIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Ficha del neumático</Typography>
          </Stack>
          <Grid container spacing={2}>
            {ficha.map((f) => (
              <Grid key={f.label} size={{ xs: 6, sm: 3 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B', wordBreak: 'break-word' }}>{f.value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Historial de rotación / reencauche */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.25)}`, borderRadius: '12px', p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <HistoryIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Historial de rotación / reencauche ({neu.historial.length})</Typography>
          </Stack>
          <Stack spacing={1}>
            {neu.historial.map((ev, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.25, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: EVENTO_COLOR[ev.tipo], mt: 0.75, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                    <Chip label={ev.tipo} size="small" sx={{ bgcolor: alpha(EVENTO_COLOR[ev.tipo], 0.15), color: EVENTO_COLOR[ev.tipo], fontWeight: 700, fontSize: 9, height: 18 }} />
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{ev.fecha}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: '#334155' }}>{ev.detalle}</Typography>
                </Box>
                <Typography sx={{ fontSize: 11, color: '#64748B', flexShrink: 0, whiteSpace: 'nowrap' }}>{ev.km.toLocaleString('es-CO')} km</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FFFFFF', gap: 1 }}>
        <Button startIcon={<SwapIcon />} onClick={() => onAction('Rotación programada', neu)} sx={{ textTransform: 'none', color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4) }} variant="outlined">
          Programar rotación
        </Button>
        <Button startIcon={<Recycling />} onClick={() => onAction('Enviado a reencauche', neu)} sx={{ textTransform: 'none', color: '#0EA5E9', borderColor: alpha('#0EA5E9', 0.4) }} variant="outlined"
          disabled={neu.reencauches >= neu.maxReencauches}>
          Enviar a reencauche
        </Button>
        <Button startIcon={<BuildIcon />} variant="contained" onClick={() => onAction('Orden de trabajo creada', neu)}
          sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700 }}>
          Crear OT
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Nuevo Neumático Dialog ───────────────────────────────────────────────────

// Presión recomendada derivada de la medida (regla usada también en PosicionDialog)
function presionRecPorMedida(medida: string): string {
  return medida.startsWith('11 ') ? '105' : '120';
}

// Referencias conocidas por marca (derivadas de los datos existentes) para
// autocompletar / sugerir sin restringir el ingreso de nuevas referencias.
const REFERENCIAS_POR_MARCA: Record<string, string[]> = mockNeumaticos.reduce((acc, n) => {
  (acc[n.marca] ??= []);
  if (!acc[n.marca].includes(n.referencia)) acc[n.marca].push(n.referencia);
  return acc;
}, {} as Record<string, string[]>);

// Estilos de inputs — tema claro, acento EAM
const nuevoInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: '#FFFFFF', color: '#1E293B' },
  '& label': { color: '#64748B' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(EAM_COLOR, 0.25) },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(EAM_COLOR, 0.5) },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
};

function NuevoNeumaticoDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (n: Neumatico) => void;
}) {
  const [marca, setMarca] = useState(MARCAS[0]);
  const [referencia, setReferencia] = useState('');
  const [medida, setMedida] = useState(MEDIDAS[0]);
  const [vidaUtilKm, setVidaUtilKm] = useState('110000');
  const [costo, setCosto] = useState('2300000');
  const [profundidad, setProfundidad] = useState('16');
  const [presion, setPresion] = useState(presionRecPorMedida(MEDIDAS[0]));
  const [dot, setDot] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  const reset = () => {
    setMarca(MARCAS[0]); setReferencia(''); setMedida(MEDIDAS[0]);
    setVidaUtilKm('110000'); setCosto('2300000'); setProfundidad('16');
    setPresion(presionRecPorMedida(MEDIDAS[0])); setDot('');
    setTriedSubmit(false);
  };

  // Al cambiar la medida, autocompletar la presión recomendada derivada.
  const handleMedidaChange = (value: string) => {
    setMedida(value);
    setPresion(presionRecPorMedida(value));
  };

  const handleClose = () => { onClose(); };

  // ── Validación de campos obligatorios ──
  const num = (v: string) => Number(v);
  const errReferencia = !referencia.trim();
  const errDot = !/^\d{4}$/.test(dot.trim());
  const errProfundidad = !(num(profundidad) > 0 && num(profundidad) <= 30);
  const errPresion = !(num(presion) > 0);
  const errCosto = !(num(costo) > 0);
  const errVida = !(num(vidaUtilKm) > 0);
  const isValid = !errReferencia && !errDot && !errProfundidad && !errPresion && !errCosto && !errVida;

  const referenciasSugeridas = REFERENCIAS_POR_MARCA[marca] ?? [];

  const handleSave = () => {
    if (!isValid) {
      setTriedSubmit(true);
      setWarnOpen(true);
      return;
    }
    const prof = num(profundidad);
    const n: Neumatico = {
      codigo: `NEU-${String(Math.floor(Math.random() * 900) + 100)}`,
      marca,
      referencia: referencia.trim(),
      medida,
      estado: 'En Almacén',
      activo: '-',
      posicion: '-',
      kmTotal: 0,
      vidaUtilKm: num(vidaUtilKm),
      profundidadActual: prof,
      profundidadInicial: prof,
      presionActual: 0,
      presionRecomendada: num(presion),
      dot: dot.trim(),
      fechaMontaje: '-',
      costo: num(costo),
      reencauches: 0,
      maxReencauches: 2,
      historial: [
        { fecha: new Date().toISOString().slice(0, 10), tipo: 'Inspección', detalle: 'Registrado en almacén - unidad nueva', km: 0 },
      ],
    };
    onSave(n);
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, width: 40, height: 40 }}><AddIcon /></Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, color: '#1E293B' }}>Registrar Neumático</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>Alta de una unidad nueva en el almacén EAM</Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'grey.500' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#F8FAFC' }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {/* Identificación */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Identificación
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select fullWidth size="small" label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} helperText=" " sx={nuevoInputSx}>
              {MARCAS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth size="small" label="Referencia / banda" value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder={referenciasSugeridas[0] ? `Ej. ${referenciasSugeridas[0]}` : 'Ej. X Multi D'}
              error={triedSubmit && errReferencia}
              helperText={triedSubmit && errReferencia ? 'Ingrese la referencia o banda' : ' '}
              sx={nuevoInputSx}
            />
          </Stack>
          {referenciasSugeridas.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: -1 }}>
              <Typography sx={{ fontSize: 11, color: '#94A3B8', mr: 0.5 }}>Sugeridas {marca}:</Typography>
              {referenciasSugeridas.map((r) => (
                <Chip key={r} label={r} size="small" onClick={() => setReferencia(r)}
                  sx={{ fontSize: 10, height: 20, cursor: 'pointer', bgcolor: alpha(EAM_COLOR, 0.1), color: EAM_DARK, '&:hover': { bgcolor: alpha(EAM_COLOR, 0.2) } }} />
              ))}
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select fullWidth size="small" label="Medida" value={medida} onChange={(e) => handleMedidaChange(e.target.value)} helperText=" " sx={nuevoInputSx}>
              {MEDIDAS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth size="small" label="DOT (SSAA)" value={dot}
              onChange={(e) => setDot(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Ej. 0125"
              error={triedSubmit && errDot}
              helperText={triedSubmit && errDot ? 'DOT de 4 dígitos (semana + año)' : ' '}
              inputProps={{ inputMode: 'numeric', maxLength: 4 }}
              sx={nuevoInputSx}
            />
          </Stack>

          {/* Especificaciones */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Especificaciones
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" type="number" label="Profundidad (mm)" value={profundidad}
              onChange={(e) => setProfundidad(e.target.value)}
              error={triedSubmit && errProfundidad}
              helperText={triedSubmit && errProfundidad ? 'Entre 1 y 30 mm' : ' '}
              InputProps={{ endAdornment: <InputAdornment position="end">mm</InputAdornment> }}
              inputProps={{ min: 1, max: 30 }}
              sx={nuevoInputSx}
            />
            <TextField
              fullWidth size="small" type="number" label="Presión rec." value={presion}
              onChange={(e) => setPresion(e.target.value)}
              error={triedSubmit && errPresion}
              helperText={triedSubmit && errPresion ? 'Requerida' : 'Autocompletada por la medida'}
              InputProps={{ endAdornment: <InputAdornment position="end">psi</InputAdornment> }}
              inputProps={{ min: 1 }}
              sx={nuevoInputSx}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" type="number" label="Vida útil estimada" value={vidaUtilKm}
              onChange={(e) => setVidaUtilKm(e.target.value)}
              error={triedSubmit && errVida}
              helperText={triedSubmit && errVida ? 'Requerida' : ' '}
              InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
              inputProps={{ min: 1 }}
              sx={nuevoInputSx}
            />
            <TextField
              fullWidth size="small" type="number" label="Costo de adquisición" value={costo}
              onChange={(e) => setCosto(e.target.value)}
              error={triedSubmit && errCosto}
              helperText={triedSubmit && errCosto ? 'Ingrese un costo válido' : ' '}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ min: 0 }}
              sx={nuevoInputSx}
            />
          </Stack>
        </Stack>
        <Alert severity="info" sx={{ mt: 2, borderRadius: '10px' }}>
          El neumático se registra en estado <strong>En Almacén</strong>. Podrá asignarlo a un vehículo desde la vista de detalle.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FFFFFF' }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748B' }}>Cancelar</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleSave} disabled={!isValid}
          sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700, '&.Mui-disabled': { bgcolor: alpha(EAM_COLOR, 0.4), color: '#FFFFFF' } }}>
          Registrar
        </Button>
      </DialogActions>

      <Snackbar
        open={warnOpen}
        autoHideDuration={3500}
        onClose={() => setWarnOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setWarnOpen(false)} severity="warning" variant="filled" sx={{ borderRadius: '10px' }}>
          Complete los campos obligatorios antes de registrar el neumático.
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

// ─── Tab 0: Inventario ────────────────────────────────────────────────────────

function TabInventario({
  neumaticos,
  onSelect,
  onNuevo,
  onExport,
}: {
  neumaticos: Neumatico[];
  onSelect: (n: Neumatico) => void;
  onNuevo: () => void;
  onExport: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroMarca, setFiltroMarca] = useState('Todos');
  const [filtroActivo, setFiltroActivo] = useState('Todos');

  const activosDisponibles = useMemo(
    () => ['Todos', ...Array.from(new Set(neumaticos.map(n => n.activo).filter(a => a !== '-')))],
    [neumaticos]
  );

  const filtered = neumaticos.filter((n) => {
    if (filtroEstado !== 'Todos' && n.estado !== filtroEstado) return false;
    if (filtroMarca !== 'Todos' && n.marca !== filtroMarca) return false;
    if (filtroActivo !== 'Todos' && n.activo !== filtroActivo) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      if (!n.codigo.toLowerCase().includes(q) && !n.marca.toLowerCase().includes(q) &&
          !n.referencia.toLowerCase().includes(q) && !n.medida.toLowerCase().includes(q) &&
          !n.activo.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalInstalados = neumaticos.filter(n => n.activo !== '-' && n.estado !== 'En Reencauche').length;
  const totalAlmacen = neumaticos.filter(n => n.estado === 'En Almacén').length;
  const totalReencauche = neumaticos.filter(n => n.estado === 'En Reencauche').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="Total Neumáticos" value={neumaticos.length} icon={<TireRepair />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="Instalados" value={totalInstalados} icon={<LocalShipping />} color="#3B82F6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="En Almacén" value={totalAlmacen} icon={<Inventory2 />} color="#22C55E" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="En Reencauche" value={totalReencauche} icon={<Recycling />} color="#A855F7" />
        </Grid>
      </Grid>

      {/* Filtros + acciones */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems={{ md: 'center' }}>
        <TextField
          size="small" placeholder="Buscar código, marca, referencia, activo…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ minWidth: 260, flex: 1, '& .MuiOutlinedInput-root': { bgcolor: '#FFFFFF' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
        <TextField select size="small" label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: '#FFFFFF' } }}>
          {['Todos', ...ESTADOS].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Marca" value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: '#FFFFFF' } }}>
          {['Todos', ...MARCAS].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Activo" value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)} sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { bgcolor: '#FFFFFF' } }}>
          {activosDisponibles.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
        <Button variant="outlined" startIcon={<ExportIcon />} onClick={onExport}
          sx={{ textTransform: 'none', color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), '&:hover': { borderColor: EAM_COLOR } }}>
          Exportar
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevo}
          sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700 }}>
          Nuevo Neumático
        </Button>
      </Stack>

      <Typography sx={{ fontSize: 12, color: '#94A3B8', mt: -1 }}>
        {filtered.length} neumático{filtered.length !== 1 ? 's' : ''} · haz clic en una fila para ver la hoja del neumático
      </Typography>

      {/* Tabla */}
      <TableContainer component={Paper} sx={{ border: `1px solid ${EAM_COLOR}22` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${EAM_COLOR}44` } }}>
              <TableCell>Código</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Referencia</TableCell>
              <TableCell>Medida</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell>Posición</TableCell>
              <TableCell align="right">km Total</TableCell>
              <TableCell align="right">Vida Útil</TableCell>
              <TableCell sx={{ minWidth: 130 }}>% Vida Usada</TableCell>
              <TableCell align="right">Prof. (mm)</TableCell>
              <TableCell align="center">Alerta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((n) => {
              const vida = calcVidaUsada(n);
              const alerta = hasAlerta(n);
              return (
                <TableRow
                  key={n.codigo}
                  onClick={() => onSelect(n)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                    '& td': { borderBottom: '1px solid #E5E7EB', color: 'text.primary', fontSize: 12 },
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.07) },
                    bgcolor: alerta ? 'rgba(239,68,68,0.05)' : 'transparent',
                  }}
                >
                  <TableCell sx={{ color: `${EAM_COLOR} !important`, fontWeight: 600, fontFamily: 'monospace' }}>{n.codigo}</TableCell>
                  <TableCell>{n.marca}</TableCell>
                  <TableCell>{n.referencia}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '11px !important' }}>{n.medida}</TableCell>
                  <TableCell>
                    <Chip
                      label={n.estado}
                      size="small"
                      color={getEstadoColor(n.estado)}
                      sx={{ fontSize: 10, height: 20 }}
                    />
                  </TableCell>
                  <TableCell>{n.activo}</TableCell>
                  <TableCell>{n.posicion}</TableCell>
                  <TableCell align="right">{n.kmTotal.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right">{n.vidaUtilKm.toLocaleString('es-CO')}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={vida}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': { bgcolor: getDesgasteColor(vida), borderRadius: 3 },
                        }}
                      />
                      <Typography sx={{ fontSize: 11, color: getDesgasteColor(vida), minWidth: 30 }}>
                        {vida}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: getProfundidadColor(n.profundidadActual), fontSize: 12, fontWeight: 600 }}>
                      {n.profundidadActual}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {alerta && (
                      <Tooltip title={n.profundidadActual < 3 ? 'Profundidad crítica' : 'Vida útil por vencer'}>
                        <WarningAmber sx={{ color: '#F97316', fontSize: 18 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} sx={{ textAlign: 'center', py: 4, color: '#94A3B8', borderBottom: 'none' }}>
                  No se encontraron neumáticos con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Tire position box ────────────────────────────────────────────────────────

function TireBox({ pos, onClick }: { pos: NeumaticoPosicion; onClick?: () => void }) {
  const color = getDesgasteColor(pos.desgaste);
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 80,
        border: `2px solid ${color}`,
        borderRadius: 1,
        p: 0.5,
        bgcolor: `${color}15`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.3,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s, box-shadow 0.1s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 4px 10px ${color}55` } : {},
      }}
    >
      <Typography sx={{ fontSize: 9, color: 'text.secondary', lineHeight: 1 }}>{pos.posicion}</Typography>
      <Typography sx={{ fontSize: 9, color: 'text.primary', fontWeight: 600, lineHeight: 1 }}>{pos.marca.substring(0, 6)}</Typography>
      <Typography sx={{ fontSize: 8, color: 'text.secondary', lineHeight: 1 }}>{pos.medida}</Typography>
      <Typography sx={{ fontSize: 9, color, fontWeight: 700, lineHeight: 1 }}>{pos.desgaste}%</Typography>
      <LinearProgress
        variant="determinate"
        value={pos.desgaste}
        sx={{
          width: '100%',
          height: 3,
          borderRadius: 2,
          bgcolor: '#F1F5F9',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
}

// ─── Truck diagrams ───────────────────────────────────────────────────────────

function DiagramaTractocamion({ posiciones, onSelectPos }: { posiciones: NeumaticoPosicion[]; onSelectPos: (p: NeumaticoPosicion) => void }) {
  const byPos = Object.fromEntries(posiciones.map(p => [p.posicion, p]));

  const AxleRow = ({ label, left, right }: { label: string; left: string[]; right: string[] }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
      <Typography sx={{ fontSize: 10, color: 'text.secondary', width: 40, textAlign: 'right' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {left.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} onClick={() => onSelectPos(byPos[k])} /> : <Box key={k} sx={{ width: 80 }} />)}
      </Box>
      <Box sx={{ width: 120, height: 28, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {right.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} onClick={() => onSelectPos(byPos[k])} /> : <Box key={k} sx={{ width: 80 }} />)}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 2 }}>
      <Typography sx={{ fontSize: 11, color: EAM_COLOR, fontWeight: 700, mb: 1 }}>TRACTOCAMIÓN — 18 NEUMÁTICOS</Typography>
      {/* Tracto */}
      <Box sx={{ bgcolor: '#F8FAFC', border: `1px solid ${EAM_COLOR}33`, borderRadius: 2, p: 2, mb: 1 }}>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center', mb: 1 }}>TRACTO</Typography>
        <AxleRow label="EJE D" left={['DA-I']} right={['DA-D']} />
        <AxleRow label="EJE T-A" left={['TA-I-INT', 'TA-I-EXT']} right={['TA-D-EXT', 'TA-D-INT']} />
        <AxleRow label="EJE T-B" left={['TB-I-INT', 'TB-I-EXT']} right={['TB-D-EXT', 'TB-D-INT']} />
      </Box>
      {/* Semirremolque */}
      <Box sx={{ bgcolor: '#F8FAFC', border: `1px solid #3B82F633`, borderRadius: 2, p: 2 }}>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center', mb: 1 }}>SEMIRREMOLQUE</Typography>
        <AxleRow label="EJE S-A" left={['SA-I-INT', 'SA-I-EXT']} right={['SA-D-EXT', 'SA-D-INT']} />
        <AxleRow label="EJE S-B" left={['SB-I-INT', 'SB-I-EXT']} right={['SB-D-EXT', 'SB-D-INT']} />
      </Box>
    </Box>
  );
}

function DiagramaCamion({ posiciones, onSelectPos }: { posiciones: NeumaticoPosicion[]; onSelectPos: (p: NeumaticoPosicion) => void }) {
  const byPos = Object.fromEntries(posiciones.map(p => [p.posicion, p]));

  const AxleRow = ({ label, left, right }: { label: string; left: string[]; right: string[] }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
      <Typography sx={{ fontSize: 10, color: 'text.secondary', width: 40, textAlign: 'right' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {left.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} onClick={() => onSelectPos(byPos[k])} /> : <Box key={k} sx={{ width: 80 }} />)}
      </Box>
      <Box sx={{ width: 140, height: 32, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {right.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} onClick={() => onSelectPos(byPos[k])} /> : <Box key={k} sx={{ width: 80 }} />)}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 2 }}>
      <Typography sx={{ fontSize: 11, color: EAM_COLOR, fontWeight: 700, mb: 1 }}>CAMIÓN SIMPLE — 6 NEUMÁTICOS</Typography>
      <Box sx={{ bgcolor: '#F8FAFC', border: `1px solid ${EAM_COLOR}33`, borderRadius: 2, p: 2 }}>
        <AxleRow label="EJE D" left={['DA-I']} right={['DA-D']} />
        <AxleRow label="EJE T-A" left={['TA-I-INT', 'TA-I-EXT']} right={['TA-D-EXT', 'TA-D-INT']} />
      </Box>
    </Box>
  );
}

// ─── Posición Dialog (detalle de un neumático montado) ─────────────────────────

function PosicionDialog({ pos, placa, onClose, onAction }: { pos: NeumaticoPosicion | null; placa: string; onClose: () => void; onAction: (accion: string, pos: NeumaticoPosicion) => void }) {
  if (!pos) return null;
  const color = getDesgasteColor(pos.desgaste);
  const vidaRestante = 100 - pos.desgaste;
  // Datos derivados de la posición
  const profInicial = 16;
  const profEstimada = Math.max(1, Math.round(profInicial * (vidaRestante / 100)));
  const presionRec = pos.medida.startsWith('11 ') ? 105 : 120;
  const kmRestantes = pos.km === 0 ? 0 : Math.max(0, Math.round((vidaRestante / 100) * (pos.km / (pos.desgaste / 100 || 1)) - pos.km));
  const esDireccional = pos.posicion.startsWith('DA');
  const recomendacion = pos.desgaste >= 90
    ? 'Desgaste crítico. Reemplazar o enviar a reencauche de inmediato.'
    : pos.desgaste >= 70
      ? esDireccional
        ? 'Desgaste alto en eje direccional. Rotar hacia eje de arrastre y monitorear presión.'
        : 'Desgaste alto. Programar rotación cruzada en la próxima intervención.'
      : pos.desgaste === 0
        ? 'Neumático nuevo sin rodamiento registrado en esta posición.'
        : 'Estado dentro de parámetros. Continuar plan de inspección regular.';
  return (
    <Dialog open={!!pos} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: `${color}22`, color, width: 36, height: 36 }}><TireRepair /></Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Posición {pos.posicion}</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>{placa}</Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: 'grey.500' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#F8FAFC' }}>
        <Grid container spacing={1.5}>
          <Grid size={6}><MetricBox label="Marca" value={pos.marca} color="#1E293B" /></Grid>
          <Grid size={6}><MetricBox label="Medida" value={pos.medida} color="#1E293B" /></Grid>
          <Grid size={6}><MetricBox label="Km recorridos" value={pos.km.toLocaleString('es-CO')} color="#3B82F6" /></Grid>
          <Grid size={6}><MetricBox label="Desgaste" value={`${pos.desgaste}%`} color={color} /></Grid>
          <Grid size={6}><MetricBox label="Profundidad est." value={`${profEstimada} mm`} color={getProfundidadColor(profEstimada)} /></Grid>
          <Grid size={6}><MetricBox label="Presión rec." value={`${presionRec} psi`} color="#F59E0B" /></Grid>
          <Grid size={6}><MetricBox label="Km restantes est." value={pos.km === 0 ? 'N/A' : kmRestantes.toLocaleString('es-CO')} color="#0EA5E9" /></Grid>
          <Grid size={6}><MetricBox label="Tipo de eje" value={esDireccional ? 'Direccional' : pos.posicion.startsWith('S') ? 'Semirremolque' : 'Tracción'} color={EAM_DARK} /></Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>Vida útil restante</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color }}>{vidaRestante}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={vidaRestante} sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 } }} />
        </Box>
        <Alert
          severity={pos.desgaste >= 90 ? 'error' : pos.desgaste >= 70 ? 'warning' : 'info'}
          icon={<WarningAmber />}
          sx={{ mt: 2, borderRadius: '10px' }}
        >
          {recomendacion}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FFFFFF', gap: 1 }}>
        <Button
          startIcon={<SwapIcon />}
          variant="outlined"
          onClick={() => onAction(`Rotación programada · posición ${pos.posicion}`, pos)}
          sx={{ textTransform: 'none', color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4) }}
        >
          Programar rotación
        </Button>
        <Button
          startIcon={<BuildIcon />}
          variant="contained"
          onClick={() => onAction(`Orden de trabajo creada · posición ${pos.posicion}`, pos)}
          sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700 }}
        >
          Crear OT
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab 1: Montados ──────────────────────────────────────────────────────────

function TabMontados({ onNotify }: { onNotify: (msg: string) => void }) {
  const [selectedId, setSelectedId] = useState<string>('v1');
  const [posSel, setPosSel] = useState<NeumaticoPosicion | null>(null);
  const selected = mockVehiculos.find(v => v.id === selectedId)!;
  const posiciones = useMemo(() => posicionesDeVehiculo(selected), [selected]);
  const desgastePromedio = posiciones.length
    ? Math.round(posiciones.reduce((s, p) => s + p.desgaste, 0) / posiciones.length)
    : 0;
  const criticos = posiciones.filter(p => p.desgaste >= 90).length;

  return (
    <>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Vehicle list */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Box sx={{ border: `1px solid ${EAM_COLOR}22`, borderRadius: 2, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${EAM_COLOR}33`, bgcolor: '#F8FAFC' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: EAM_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Vehículos
              </Typography>
            </Box>
            {mockVehiculos.map(v => (
              <Box
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderBottom: '1px solid #E5E7EB',
                  bgcolor: selectedId === v.id ? `${EAM_COLOR}18` : 'transparent',
                  borderLeft: selectedId === v.id ? `3px solid ${EAM_COLOR}` : '3px solid transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: `${EAM_COLOR}10` },
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: selectedId === v.id ? EAM_COLOR : '#1E293B' }}>
                  {v.placa}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{v.modelo}</Typography>
                <Chip
                  label={v.tipo === 'tractocamion' ? 'Tractocamión' : 'Camión Simple'}
                  size="small"
                  sx={{
                    mt: 0.5,
                    fontSize: 9,
                    height: 18,
                    bgcolor: v.tipo === 'tractocamion' ? alpha('#3B82F6', 0.15) : alpha('#16A34A', 0.15),
                    color: v.tipo === 'tractocamion' ? '#3B82F6' : '#16A34A',
                  }}
                />
              </Box>
            ))}
          </Box>
        </Grid>

        {/* Diagram panel */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Box sx={{ border: `1px solid ${EAM_COLOR}22`, borderRadius: 2, overflow: 'auto', minHeight: 500 }}>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${EAM_COLOR}33`, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalShipping sx={{ color: EAM_COLOR, fontSize: 18 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: EAM_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {selected.placa} — {selected.modelo}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ ml: 'auto' }} alignItems="center">
                <Chip
                  label={`${posiciones.length} neumáticos`}
                  size="small"
                  sx={{ fontSize: 9, height: 20, bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_DARK, fontWeight: 700 }}
                />
                <Chip
                  label={`Desgaste prom. ${desgastePromedio}%`}
                  size="small"
                  sx={{ fontSize: 9, height: 20, bgcolor: alpha(getDesgasteColor(desgastePromedio), 0.15), color: getDesgasteColor(desgastePromedio), fontWeight: 700 }}
                />
                {criticos > 0 && (
                  <Chip
                    icon={<WarningAmber sx={{ fontSize: 12 }} />}
                    label={`${criticos} crítico${criticos !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ fontSize: 9, height: 20, bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700, '& .MuiChip-icon': { color: '#EF4444' } }}
                  />
                )}
              </Stack>
            </Box>

            {/* Legend */}
            <Box sx={{ px: 2, pt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[['Bueno (<50%)', '#22C55E'], ['Medio (50-70%)', '#EAB308'], ['Alto (70-90%)', '#F97316'], ['Crítico (>90%)', '#EF4444']].map(([label, color]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{label}</Typography>
                </Box>
              ))}
            </Box>

            {/* Diagram */}
            <Box sx={{ overflowX: 'auto', px: 2 }}>
              {selected.tipo === 'tractocamion'
                ? <DiagramaTractocamion posiciones={posiciones} onSelectPos={setPosSel} />
                : <DiagramaCamion posiciones={posiciones} onSelectPos={setPosSel} />
              }
            </Box>
          </Box>
        </Grid>
      </Grid>
      <PosicionDialog
        pos={posSel}
        placa={`${selected.placa} · ${selected.modelo}`}
        onClose={() => setPosSel(null)}
        onAction={(msg) => { onNotify(msg); setPosSel(null); }}
      />
    </>
  );
}

// ─── Marca Dialog (detalle de análisis por marca) ──────────────────────────────

function MarcaDialog({ brand, onClose }: { brand: (CostoBrand & { rank: number }) | null; onClose: () => void }) {
  if (!brand) return null;
  const costoTotalFlota = brand.costoPorKm * brand.vidaPromedio;
  const tasaReencauche = Math.round((brand.reencauches / brand.cantidad) * 100);
  return (
    <Dialog open={!!brand} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#FFFFFF', borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, width: 36, height: 36 }}><MoneyIcon /></Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{brand.marca}</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>Análisis de costo · Ranking #{brand.rank}</Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: 'grey.500' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#F8FAFC' }}>
        <Grid container spacing={1.5}>
          <Grid size={6}><MetricBox label="Costo / km" value={formatCOP(brand.costoPorKm)} color={EAM_DARK} /></Grid>
          <Grid size={6}><MetricBox label="Vida promedio" value={`${(brand.vidaPromedio / 1000).toFixed(0)}k km`} color="#3B82F6" /></Grid>
          <Grid size={6}><MetricBox label="Unidades en flota" value={String(brand.cantidad)} color="#0EA5E9" /></Grid>
          <Grid size={6}><MetricBox label="Reencauches" value={String(brand.reencauches)} color="#A855F7" /></Grid>
          <Grid size={6}><MetricBox label="Tasa reencauche" value={`${tasaReencauche}%`} color="#F59E0B" /></Grid>
          <Grid size={6}><MetricBox label="Costo vida útil" value={formatCOP(costoTotalFlota)} color="#EF4444" /></Grid>
        </Grid>
        <Alert severity={brand.rank === 1 ? 'success' : brand.rank <= 2 ? 'info' : 'warning'} sx={{ mt: 2, borderRadius: '10px' }}>
          {brand.rank === 1
            ? `${brand.marca} lidera el ranking con el mejor costo por km. Recomendada para nuevas adquisiciones.`
            : `${brand.marca} ocupa el puesto #${brand.rank}. Evaluar rendimiento frente a marcas líderes antes de renovar stock.`}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FFFFFF' }}>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none', bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab 2: Análisis de Costo ─────────────────────────────────────────────────

function TabAnalisisCosto({ onNotify }: { onNotify: (msg: string) => void }) {
  const maxCosto = Math.max(...mockCostoBrands.map(b => b.costoPorKm));
  const [marcaSel, setMarcaSel] = useState<(CostoBrand & { rank: number }) | null>(null);

  const sorted = [...mockCostoBrands].sort((a, b) => a.costoPorKm - b.costoPorKm);

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* KPIs */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Costo por km promedio" value="$420" icon={<AttachMoney />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Vida útil promedio" value="82,400 km" icon={<Speed />} color="#22C55E" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KPICard label="Reencauches realizados" value={48} icon={<Recycling />} color="#A855F7" />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          {/* Ranking por marca */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ border: `1px solid ${EAM_COLOR}22`, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ p: 1.5, borderBottom: `1px solid ${EAM_COLOR}33`, bgcolor: '#F8FAFC' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: EAM_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Ranking Costo / km por Marca · clic para detalle
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: 'text.secondary', fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${EAM_COLOR}33` } }}>
                      <TableCell>#</TableCell>
                      <TableCell>Marca</TableCell>
                      <TableCell align="right">Costo/km</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>Índice</TableCell>
                      <TableCell align="right">Vida Prom.</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Reencauches</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sorted.map((b, i) => {
                      const pct = (b.costoPorKm / maxCosto) * 100;
                      const color = i === 0 ? '#22C55E' : i === 1 ? '#EAB308' : i === 2 ? '#F97316' : '#EF4444';
                      return (
                        <TableRow key={b.marca}
                          onClick={() => setMarcaSel({ ...b, rank: i + 1 })}
                          sx={{ cursor: 'pointer', '& td': { borderBottom: '1px solid #E5E7EB', color: 'text.primary', fontSize: 12 }, '&:hover': { bgcolor: alpha(EAM_COLOR, 0.07) } }}>
                          <TableCell>
                            <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: `${color}33`, color }}>{i + 1}</Avatar>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{b.marca}</TableCell>
                          <TableCell align="right" sx={{ color: `${color} !important`, fontWeight: 700 }}>
                            ${b.costoPorKm.toLocaleString('es-CO')}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  flex: 1,
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: '#F1F5F9',
                                  '& .MuiLinearProgress-bar': { bgcolor: color },
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="right">{b.vidaPromedio.toLocaleString('es-CO')}</TableCell>
                          <TableCell align="right">{b.cantidad}</TableCell>
                          <TableCell align="right">{b.reencauches}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Grid>

          {/* Próximas rotaciones */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ border: `1px solid ${EAM_COLOR}22`, borderRadius: 2, overflow: 'hidden', height: '100%' }}>
              <Box sx={{ p: 1.5, borderBottom: `1px solid ${EAM_COLOR}33`, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
                <RotateRight sx={{ color: EAM_COLOR, fontSize: 16 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: EAM_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Próximas Rotaciones Recomendadas
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {mockRotaciones.map((r, i) => {
                  const urgency = r.kmActual > 90000 ? 'error' : r.kmActual > 70000 ? 'warning' : 'info';
                  return (
                    <Alert
                      key={r.codigo}
                      severity={urgency}
                      icon={<WarningAmber sx={{ fontSize: 16 }} />}
                      onClick={() => onNotify(`Rotación programada para ${r.codigo} (${r.activo} · ${r.posicion})`)}
                      sx={{
                        py: 0.5,
                        fontSize: 11,
                        cursor: 'pointer',
                        bgcolor: urgency === 'error' ? 'rgba(239,68,68,0.1)' : urgency === 'warning' ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)',
                        border: '1px solid',
                        borderColor: urgency === 'error' ? '#EF444444' : urgency === 'warning' ? '#F9731644' : '#3B82F644',
                        color: 'text.primary',
                        transition: 'transform 0.1s',
                        '&:hover': { transform: 'translateX(2px)' },
                        '& .MuiAlert-icon': { fontSize: 16 },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                            {r.codigo} — {r.activo} [{r.posicion}]
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                            {r.marca} · {r.kmActual.toLocaleString('es-CO')} km recorridos
                          </Typography>
                        </Box>
                        <Chip
                          label={`#${i + 1}`}
                          size="small"
                          sx={{
                            fontSize: 9,
                            height: 18,
                            bgcolor: urgency === 'error' ? '#EF444444' : urgency === 'warning' ? '#F9731644' : '#3B82F644',
                            color: 'text.primary',
                          }}
                        />
                      </Box>
                    </Alert>
                  );
                })}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
      <MarcaDialog brand={marcaSel} onClose={() => setMarcaSel(null)} />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMNeumaticos() {
  const [tab, setTab] = useState(0);
  const [neumaticos, setNeumaticos] = useState<Neumatico[]>(mockNeumaticos);
  const [selected, setSelected] = useState<Neumatico | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  const notify = (msg: string) => setSnackbar({ open: true, msg });

  const handleSaveNuevo = (n: Neumatico) => {
    setNeumaticos((prev) => [n, ...prev]);
    setNuevoOpen(false);
    notify(`Neumático ${n.codigo} registrado en almacén`);
  };

  const handleDetailAction = (accion: string, neu: Neumatico) => {
    notify(`${accion} · ${neu.codigo}`);
    setSelected(null);
  };

  return (
    <Layout>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#F8FAFC',
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, width: 40, height: 40 }}>
                <TireRepair />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                  Gestión de Neumáticos
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  EAM · ICOLTRANS · Control de Inventarios
                </Typography>
              </Box>
            </Box>
          </Box>
          <Chip
            label="MÓDULO EAM"
            size="small"
            sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em' }}
          />
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: `1px solid ${EAM_COLOR}33` }}>
          <Tabs
            value={tab}
            onChange={(_e, v: number) => setTab(v)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                color: 'text.secondary',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 40,
                py: 0,
              },
              '& .Mui-selected': { color: `${EAM_COLOR} !important` },
              '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
            }}
          >
            <Tab label="Inventario" />
            <Tab label="Montados" />
            <Tab label="Análisis de Costo" />
          </Tabs>
        </Box>

        {/* Tab content */}
        <Box sx={{ flex: 1 }}>
          {tab === 0 && (
            <TabInventario
              neumaticos={neumaticos}
              onSelect={setSelected}
              onNuevo={() => setNuevoOpen(true)}
              onExport={() => notify('Inventario exportado a Excel (248 registros)')}
            />
          )}
          {tab === 1 && <TabMontados onNotify={notify} />}
          {tab === 2 && <TabAnalisisCosto onNotify={notify} />}
        </Box>
      </Box>

      {/* Dialogs */}
      <NeumaticoDialog neu={selected} onClose={() => setSelected(null)} onAction={handleDetailAction} />
      <NuevoNeumaticoDialog open={nuevoOpen} onClose={() => setNuevoOpen(false)} onSave={handleSaveNuevo} />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity="success" variant="filled"
          sx={{ bgcolor: EAM_COLOR, borderRadius: '10px' }}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
