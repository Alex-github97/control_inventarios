import { useState, useMemo } from 'react';
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
  Alert,
  AlertTitle,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  MenuItem,
  InputAdornment,
  Snackbar,
  Stack,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2';
import {
  LocalGasStation,
  Speed,
  DirectionsCar,
  Warning,
  TrendingDown,
  TrendingUp,
  SmartToy,
  Close as CloseIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckIcon,
  Handyman as OTIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { exportarExcel } from '@/utils/exportar';

// ─── Constants ────────────────────────────────────────────────────────────────
const EAM_COLOR = '#32AC5C';
const EAM_DARK = '#27884A';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegistroRow {
  id: number;
  fecha: string;
  vehiculo: string;
  tipoCombustible: 'ACPM' | 'Gasolina';
  litros: number;
  precioPorLitro: number;
  costo: number;
  odometro: number;
  rendimiento: number;
  conductor: string;
  proveedor: string;
  estacion: string;
  ruta: string;
  kmRecorridos: number;
  tanqueoLleno: boolean;
  observacion: string;
}

interface RendimientoRow {
  placa: string;
  nombre: string;
  kmMes: number;
  litros: number;
  rendimiento: number;
  meta: number;
  vsMetaPct: number;
  estado: 'Óptimo' | 'En Rango' | 'Bajo';
}

interface DesviacionAlert {
  id: string;
  vehiculo: string;
  descripcion: string;
  costoDesviacion: number;
  severidad: 'Alta' | 'Media';
  detectada: string;
  metrica: string;
  valorActual: string;
  valorEsperado: string;
  recomendacion: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const REGISTROS_SEED: RegistroRow[] = [
  { id: 1,  fecha: '2026-06-01', vehiculo: 'VH-001', tipoCombustible: 'ACPM',     litros: 180, precioPorLitro: 5450, costo: 981000,  odometro: 142300, rendimiento: 8.2, conductor: 'Carlos Andrés Martínez',  proveedor: 'Terpel', estacion: 'EDS Terpel Autonorte',    ruta: 'Bogotá – Medellín',   kmRecorridos: 1476, tanqueoLleno: true,  observacion: 'Tanqueo completo previo a ruta larga.' },
  { id: 2,  fecha: '2026-06-02', vehiculo: 'VH-003', tipoCombustible: 'ACPM',     litros: 210, precioPorLitro: 5450, costo: 1144500, odometro: 98750,  rendimiento: 5.9, conductor: 'Luis Eduardo Gómez',      proveedor: 'Biomax', estacion: 'EDS Biomax Calle 80',    ruta: 'Bogotá – Cali',       kmRecorridos: 1239, tanqueoLleno: true,  observacion: 'Rendimiento por debajo de meta, revisar carga.' },
  { id: 3,  fecha: '2026-06-02', vehiculo: 'VH-007', tipoCombustible: 'ACPM',     litros: 95,  precioPorLitro: 5450, costo: 517750,  odometro: 210400, rendimiento: 7.8, conductor: 'Jhon Alexander Torres',   proveedor: 'Terpel', estacion: 'EDS Terpel Soacha',      ruta: 'Bogotá – Ibagué',     kmRecorridos: 741,  tanqueoLleno: false, observacion: 'Tanqueo parcial.' },
  { id: 4,  fecha: '2026-06-03', vehiculo: 'VH-010', tipoCombustible: 'Gasolina', litros: 45,  precioPorLitro: 9800, costo: 441000,  odometro: 55200,  rendimiento: 10.4,conductor: 'Andrés Felipe Vargas',    proveedor: 'Primax', estacion: 'EDS Primax Sur',         ruta: 'Urbano Bogotá',       kmRecorridos: 468,  tanqueoLleno: true,  observacion: 'Camioneta de supervisión.' },
  { id: 5,  fecha: '2026-06-04', vehiculo: 'VH-012', tipoCombustible: 'ACPM',     litros: 240, precioPorLitro: 5450, costo: 1308000, odometro: 185600, rendimiento: 4.8, conductor: 'Ricardo Emilio Peña',     proveedor: 'Terpel', estacion: 'EDS Terpel Girardot',    ruta: 'Bogotá – Neiva',      kmRecorridos: 1152, tanqueoLleno: true,  observacion: 'Rendimiento crítico, agendar diagnóstico de motor.' },
  { id: 6,  fecha: '2026-06-05', vehiculo: 'VH-005', tipoCombustible: 'ACPM',     litros: 160, precioPorLitro: 5450, costo: 872000,  odometro: 302100, rendimiento: 7.5, conductor: 'Mario Alberto Cano',      proveedor: 'Biomax', estacion: 'EDS Biomax Fontibón',    ruta: 'Bogotá – Bucaramanga',kmRecorridos: 1200, tanqueoLleno: true,  observacion: 'Rendimiento en meta.' },
  { id: 7,  fecha: '2026-06-06', vehiculo: 'VH-015', tipoCombustible: 'ACPM',     litros: 195, precioPorLitro: 5450, costo: 1062750, odometro: 128900, rendimiento: 6.1, conductor: 'Diego Fernando Ruiz',     proveedor: 'Primax', estacion: 'EDS Primax Norte',       ruta: 'Bogotá – Pereira',    kmRecorridos: 1190, tanqueoLleno: true,  observacion: 'Rendimiento bajo, verificar presión de llantas.' },
  { id: 8,  fecha: '2026-06-08', vehiculo: 'VH-002', tipoCombustible: 'ACPM',     litros: 175, precioPorLitro: 5450, costo: 953750,  odometro: 240500, rendimiento: 8.0, conductor: 'Fabián Humberto Mora',    proveedor: 'Terpel', estacion: 'EDS Terpel Autonorte',   ruta: 'Bogotá – Tunja',      kmRecorridos: 1400, tanqueoLleno: true,  observacion: 'Rendimiento óptimo.' },
  { id: 9,  fecha: '2026-06-09', vehiculo: 'VH-018', tipoCombustible: 'Gasolina', litros: 52,  precioPorLitro: 9800, costo: 509600,  odometro: 67800,  rendimiento: 9.8, conductor: 'Sergio Iván Castillo',    proveedor: 'Terpel', estacion: 'EDS Terpel Chía',        ruta: 'Urbano Cundinamarca', kmRecorridos: 510,  tanqueoLleno: true,  observacion: 'Vehículo de reparto liviano.' },
  { id: 10, fecha: '2026-06-10', vehiculo: 'VH-006', tipoCombustible: 'ACPM',     litros: 188, precioPorLitro: 5450, costo: 1024600, odometro: 176300, rendimiento: 7.2, conductor: 'Nelson Darío Ospina',     proveedor: 'Biomax', estacion: 'EDS Biomax Calle 80',    ruta: 'Bogotá – Villavicencio',kmRecorridos: 1354, tanqueoLleno: true,  observacion: 'Rendimiento aceptable.' },
  { id: 11, fecha: '2026-06-11', vehiculo: 'VH-007', tipoCombustible: 'ACPM',     litros: 110, precioPorLitro: 5450, costo: 599500,  odometro: 211260, rendimiento: 7.6, conductor: 'Jhon Alexander Torres',   proveedor: 'Terpel', estacion: 'EDS Terpel Soacha',      ruta: 'Bogotá – Ibagué',     kmRecorridos: 836,  tanqueoLleno: true,  observacion: 'Segundo tanqueo de la semana.' },
  { id: 12, fecha: '2026-06-13', vehiculo: 'VH-020', tipoCombustible: 'ACPM',     litros: 200, precioPorLitro: 5450, costo: 1090000, odometro: 93400,  rendimiento: 7.4, conductor: 'Germán Adolfo Salcedo',   proveedor: 'Primax', estacion: 'EDS Primax Sur',         ruta: 'Bogotá – Cartagena',  kmRecorridos: 1480, tanqueoLleno: true,  observacion: 'Ruta de larga distancia.' },
  { id: 13, fecha: '2026-06-14', vehiculo: 'VH-004', tipoCombustible: 'ACPM',     litros: 165, precioPorLitro: 5450, costo: 899250,  odometro: 158700, rendimiento: 8.1, conductor: 'Camilo Ernesto Bermúdez', proveedor: 'Terpel', estacion: 'EDS Terpel Autonorte',   ruta: 'Bogotá – Medellín',   kmRecorridos: 1336, tanqueoLleno: true,  observacion: 'Rendimiento óptimo.' },
  { id: 14, fecha: '2026-06-16', vehiculo: 'VH-009', tipoCombustible: 'Gasolina', litros: 38,  precioPorLitro: 9800, costo: 372400,  odometro: 41200,  rendimiento: 11.2,conductor: 'Hernando José Bernal',    proveedor: 'Biomax', estacion: 'EDS Biomax Fontibón',    ruta: 'Urbano Bogotá',       kmRecorridos: 425,  tanqueoLleno: true,  observacion: 'Mejor rendimiento de la flota liviana.' },
  { id: 15, fecha: '2026-06-18', vehiculo: 'VH-001', tipoCombustible: 'ACPM',     litros: 197, precioPorLitro: 5450, costo: 1073650, odometro: 143920, rendimiento: 7.9, conductor: 'Carlos Andrés Martínez',  proveedor: 'Terpel', estacion: 'EDS Terpel Autonorte',   ruta: 'Bogotá – Medellín',   kmRecorridos: 1556, tanqueoLleno: true,  observacion: 'Retorno de ruta, rendimiento consistente.' },
];

const RENDIMIENTO_ROWS: RendimientoRow[] = [
  { placa: 'VH-001', nombre: 'Kenworth T680',     kmMes: 3120, litros: 395,  rendimiento: 7.9,  meta: 7.5, vsMetaPct: 105, estado: 'Óptimo'  },
  { placa: 'VH-003', nombre: 'Freightliner 122SD', kmMes: 2470, litros: 405,  rendimiento: 6.1,  meta: 7.5, vsMetaPct: 81,  estado: 'Bajo'    },
  { placa: 'VH-005', nombre: 'International 9900', kmMes: 2880, litros: 384,  rendimiento: 7.5,  meta: 7.5, vsMetaPct: 100, estado: 'Óptimo'  },
  { placa: 'VH-007', nombre: 'Mack Anthem',        kmMes: 1680, litros: 205,  rendimiento: 8.2,  meta: 7.8, vsMetaPct: 105, estado: 'Óptimo'  },
  { placa: 'VH-010', nombre: 'Toyota Hilux 4x4',   kmMes: 1872, litros: 180,  rendimiento: 10.4, meta: 11.0,vsMetaPct: 95,  estado: 'En Rango'},
  { placa: 'VH-012', nombre: 'Volvo FH16',         kmMes: 2304, litros: 480,  rendimiento: 4.8,  meta: 7.2, vsMetaPct: 67,  estado: 'Bajo'    },
  { placa: 'VH-015', nombre: 'Scania R 450',       kmMes: 2380, litros: 390,  rendimiento: 6.1,  meta: 7.5, vsMetaPct: 81,  estado: 'Bajo'    },
  { placa: 'VH-018', nombre: 'Mazda BT-50',        kmMes: 2028, litros: 207,  rendimiento: 9.8,  meta: 10.5,vsMetaPct: 93,  estado: 'En Rango'},
];

const DESVIACIONES: DesviacionAlert[] = [
  { id: 'D-001', vehiculo: 'VH-003', descripcion: 'Consumo 35% sobre meta histórica',                    costoDesviacion: 1240000, severidad: 'Alta',  detectada: '2026-06-02', metrica: 'Consumo vs meta',        valorActual: '405 L/mes', valorEsperado: '300 L/mes', recomendacion: 'Inspeccionar inyectores y hábitos de conducción del operador.' },
  { id: 'D-002', vehiculo: 'VH-012', descripcion: 'Rendimiento mínimo registrado en 6 meses',            costoDesviacion: 890000,  severidad: 'Alta',  detectada: '2026-06-04', metrica: 'Rendimiento (km/L)',     valorActual: '4.8 km/L',  valorEsperado: '7.2 km/L',  recomendacion: 'Diagnóstico de motor y sistema de combustible urgente.' },
  { id: 'D-003', vehiculo: 'VH-007', descripcion: 'Patrón de llenados sospechoso (3 llenados/día)',       costoDesviacion: 2100000, severidad: 'Alta',  detectada: '2026-06-11', metrica: 'Frecuencia de tanqueo', valorActual: '3 /día',    valorEsperado: '1 /día',    recomendacion: 'Auditar tiquetes y verificar posible sifonamiento de combustible.' },
  { id: 'D-004', vehiculo: 'VH-015', descripcion: 'Rendimiento cayó 18% vs mes anterior',                costoDesviacion: 560000,  severidad: 'Media', detectada: '2026-06-06', metrica: 'Variación mensual',      valorActual: '6.1 km/L',  valorEsperado: '7.5 km/L',  recomendacion: 'Revisar presión de llantas y alineación.' },
  { id: 'D-005', vehiculo: 'VH-001', descripcion: 'Consumo nocturno detectado fuera de ruta',            costoDesviacion: 1780000, severidad: 'Alta',  detectada: '2026-06-18', metrica: 'Geocerca / horario',     valorActual: '2 eventos', valorEsperado: '0 eventos', recomendacion: 'Cruzar con GPS y notificar a control de flota.' },
];

const VEHICULOS_DISPONIBLES = ['VH-001', 'VH-002', 'VH-003', 'VH-004', 'VH-005', 'VH-006', 'VH-007', 'VH-009', 'VH-010', 'VH-012', 'VH-015', 'VH-018', 'VH-020'];
const PROVEEDORES_DISPONIBLES = ['Terpel', 'Biomax', 'Primax'];

// Dominios derivados de los datos reales (para Selects controlados)
const CONDUCTORES_DISPONIBLES = Array.from(new Set(REGISTROS_SEED.map((r) => r.conductor))).sort();
const ESTACIONES_DISPONIBLES = Array.from(new Set(REGISTROS_SEED.map((r) => r.estacion))).sort();
const RUTAS_DISPONIBLES = Array.from(new Set(REGISTROS_SEED.map((r) => r.ruta))).sort();

// Valores por vehículo para autocompletado (último tanqueo registrado)
interface VehiculoDefaults {
  tipoCombustible: 'ACPM' | 'Gasolina';
  conductor: string;
  proveedor: string;
  estacion: string;
  ruta: string;
  precioPorLitro: number;
}
const VEHICULO_DEFAULTS: Record<string, VehiculoDefaults> = REGISTROS_SEED.reduce((acc, r) => {
  acc[r.vehiculo] = {
    tipoCombustible: r.tipoCombustible,
    conductor: r.conductor,
    proveedor: r.proveedor,
    estacion: r.estacion,
    ruta: r.ruta,
    precioPorLitro: r.precioPorLitro,
  };
  return acc;
}, {} as Record<string, VehiculoDefaults>);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOPFull(value: number): string {
  return `$${value.toLocaleString('es-CO')}`;
}

function estadoColor(estado: RendimientoRow['estado']): 'success' | 'warning' | 'error' {
  if (estado === 'Óptimo')  return 'success';
  if (estado === 'En Rango') return 'warning';
  return 'error';
}

function severidadColor(sev: DesviacionAlert['severidad']): 'error' | 'warning' {
  return sev === 'Alta' ? 'error' : 'warning';
}

function rendimientoColor(r: number): string {
  return r >= 7.5 ? '#16A34A' : r >= 6.5 ? '#D97706' : '#DC2626';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function KpiCard({ icon, label, value, sub }: KpiCardProps) {
  return (
    <Card sx={{ border: `1px solid ${EAM_COLOR}33`, borderRadius: 2, height: '100%', bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        <Box
          sx={{
            bgcolor: `${EAM_COLOR}1A`,
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: EAM_COLOR,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Paper style reused across dialogs
const dialogPaperProps = {
  sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E5E7EB' },
};

// Small field for detail dialog
function DetailField({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: color ?? '#1E293B', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

// ─── Registro Detail Dialog ─────────────────────────────────────────────────────
function RegistroDetailDialog({
  registro,
  historial,
  onClose,
  onVerActivo,
}: {
  registro: RegistroRow | null;
  historial: RegistroRow[];
  onClose: () => void;
  onVerActivo: (placa: string) => void;
}) {
  if (!registro) return null;

  const costoPorKm = registro.kmRecorridos > 0 ? registro.costo / registro.kmRecorridos : 0;
  const galones = registro.litros / 3.785;
  const kmPorGal = galones > 0 ? registro.kmRecorridos / galones : 0;

  // historial de este vehículo ordenado por fecha
  const histVeh = historial
    .filter((h) => h.vehiculo === registro.vehiculo)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const promRendVeh = histVeh.length
    ? histVeh.reduce((s, h) => s + h.rendimiento, 0) / histVeh.length
    : registro.rendimiento;
  const totalGastoVeh = histVeh.reduce((s, h) => s + h.costo, 0);
  const totalLitrosVeh = histVeh.reduce((s, h) => s + h.litros, 0);
  const tendencia = registro.rendimiento - promRendVeh;

  const kpis = [
    { label: 'Litros', value: `${registro.litros} L`, color: '#0EA5E9' },
    { label: 'Rendimiento', value: `${registro.rendimiento.toFixed(1)} km/L`, color: rendimientoColor(registro.rendimiento) },
    { label: 'km/gal', value: kmPorGal.toFixed(1), color: '#8B5CF6' },
    { label: 'Costo', value: formatCOPFull(registro.costo), color: EAM_DARK },
    { label: 'Costo/km', value: `$${Math.round(costoPorKm).toLocaleString('es-CO')}`, color: '#D97706' },
    { label: 'km recorridos', value: `${registro.kmRecorridos.toLocaleString('es-CO')} km`, color: '#3B82F6' },
  ];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
        <Box sx={{ bgcolor: `${EAM_COLOR}1A`, borderRadius: 2, p: 1, display: 'flex' }}>
          <LocalGasStation sx={{ color: EAM_COLOR }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
            TANQUEO · {registro.fecha}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
            {registro.vehiculo}
          </Typography>
        </Box>
        <Chip
          label={registro.tipoCombustible}
          size="small"
          sx={{
            bgcolor: registro.tipoCombustible === 'ACPM' ? '#DBEAFE' : '#DCFCE7',
            color: registro.tipoCombustible === 'ACPM' ? '#1D4ED8' : '#15803D',
            fontWeight: 700,
          }}
        />
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        {/* KPIs del tanqueo */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {kpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, sm: 4 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 1.5, textAlign: 'center', bgcolor: '#FFFFFF' }}>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 10.5, color: '#64748B', mt: 0.5 }}>{k.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Datos del registro */}
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>Detalle del tanqueo</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Conductor" value={registro.conductor} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Proveedor" value={registro.proveedor} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Estación" value={registro.estacion} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Ruta" value={registro.ruta} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Odómetro" value={`${registro.odometro.toLocaleString('es-CO')} km`} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Precio / litro" value={`$${registro.precioPorLitro.toLocaleString('es-CO')}`} /></Grid>
          <Grid size={{ xs: 6, sm: 4 }}><DetailField label="Tipo de tanqueo" value={registro.tanqueoLleno ? 'Tanque lleno' : 'Parcial'} /></Grid>
          <Grid size={{ xs: 12, sm: 8 }}><DetailField label="Observación" value={registro.observacion} /></Grid>
        </Grid>

        {/* Tendencia del vehículo */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2, mb: 3, bgcolor: '#F8FAFC' }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            {tendencia >= 0 ? <TrendingUp sx={{ color: '#16A34A', fontSize: 20 }} /> : <TrendingDown sx={{ color: '#DC2626', fontSize: 20 }} />}
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>
              Tendencia de {registro.vehiculo}
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}><DetailField label="Prom. rendimiento" value={`${promRendVeh.toFixed(1)} km/L`} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <DetailField
                label="Este tanqueo vs prom."
                value={`${tendencia >= 0 ? '+' : ''}${tendencia.toFixed(1)} km/L`}
                color={tendencia >= 0 ? '#16A34A' : '#DC2626'}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}><DetailField label="Gasto acumulado" value={formatCOPFull(totalGastoVeh)} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><DetailField label="Litros acumulados" value={`${totalLitrosVeh.toLocaleString('es-CO')} L`} /></Grid>
          </Grid>
        </Paper>

        {/* Historial de tanqueos del vehículo */}
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>
          Historial de tanqueos · {histVeh.length} registro{histVeh.length !== 1 ? 's' : ''}
        </Typography>
        <Stack spacing={1}>
          {histVeh.map((h) => (
            <Box
              key={h.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.25,
                borderRadius: 2,
                bgcolor: h.id === registro.id ? `${EAM_COLOR}12` : '#F8FAFC',
                border: `1px solid ${h.id === registro.id ? `${EAM_COLOR}55` : '#E5E7EB'}`,
              }}
            >
              <CalendarIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: 12, color: '#334155', minWidth: 90 }}>{h.fecha}</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B', flex: 1 }}>{h.estacion}</Typography>
              <Typography sx={{ fontSize: 12, color: '#334155' }}>{h.litros} L</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: rendimientoColor(h.rendimiento) }}>{h.rendimiento.toFixed(1)} km/L</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: EAM_DARK, minWidth: 90, textAlign: 'right' }}>{formatCOPFull(h.costo)}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={<DirectionsCar />}
          onClick={() => onVerActivo(registro.vehiculo)}
          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Ver ficha del activo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Rendimiento Detail Dialog ──────────────────────────────────────────────────
function RendimientoDetailDialog({
  vehiculo,
  registros,
  onClose,
  onVerActivo,
}: {
  vehiculo: RendimientoRow | null;
  registros: RegistroRow[];
  onClose: () => void;
  onVerActivo: (placa: string) => void;
}) {
  if (!vehiculo) return null;

  const tanqueos = registros
    .filter((r) => r.vehiculo === vehiculo.placa)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const gastoMes = tanqueos.reduce((s, t) => s + t.costo, 0);
  const galones = vehiculo.litros / 3.785;
  const kmPorGal = galones > 0 ? vehiculo.kmMes / galones : 0;
  const brecha = vehiculo.rendimiento - vehiculo.meta;

  const kpis = [
    { label: 'km este mes', value: `${vehiculo.kmMes.toLocaleString('es-CO')}`, color: '#3B82F6' },
    { label: 'Litros', value: `${vehiculo.litros}`, color: '#0EA5E9' },
    { label: 'Rendimiento', value: `${vehiculo.rendimiento.toFixed(1)} km/L`, color: rendimientoColor(vehiculo.rendimiento) },
    { label: 'km/gal', value: kmPorGal.toFixed(1), color: '#8B5CF6' },
    { label: 'Meta', value: `${vehiculo.meta.toFixed(1)} km/L`, color: '#64748B' },
    { label: 'Gasto mes', value: formatCOPFull(gastoMes), color: EAM_DARK },
  ];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
        <Box sx={{ bgcolor: `${EAM_COLOR}1A`, borderRadius: 2, p: 1, display: 'flex' }}>
          <DirectionsCar sx={{ color: EAM_COLOR }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
            RENDIMIENTO · {vehiculo.nombre}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
            {vehiculo.placa}
          </Typography>
        </Box>
        <Chip label={vehiculo.estado} size="small" color={estadoColor(vehiculo.estado)} sx={{ fontWeight: 700 }} />
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {kpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, sm: 4 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 1.5, textAlign: 'center', bgcolor: '#FFFFFF' }}>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.value}</Typography>
                <Typography sx={{ fontSize: 10.5, color: '#64748B', mt: 0.5 }}>{k.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Barra de cumplimiento de meta */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2, mb: 3, bgcolor: '#F8FAFC' }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>Cumplimiento de meta</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: vehiculo.vsMetaPct >= 100 ? '#16A34A' : vehiculo.vsMetaPct >= 90 ? '#D97706' : '#DC2626' }}>
              {vehiculo.vsMetaPct}% · {brecha >= 0 ? '+' : ''}{brecha.toFixed(1)} km/L vs meta
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, vehiculo.vsMetaPct)}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#E5E7EB',
              '& .MuiLinearProgress-bar': {
                bgcolor: vehiculo.vsMetaPct >= 100 ? '#16A34A' : vehiculo.vsMetaPct >= 90 ? '#D97706' : '#DC2626',
                borderRadius: 5,
              },
            }}
          />
        </Paper>

        {/* Historial de tanqueos del mes */}
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1.5 }}>
          Tanqueos registrados · {tanqueos.length}
        </Typography>
        {tanqueos.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>Sin tanqueos registrados para este vehículo en el periodo.</Typography>
        ) : (
          <Stack spacing={1}>
            {tanqueos.map((t) => (
              <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <CalendarIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: 12, color: '#334155', minWidth: 90 }}>{t.fecha}</Typography>
                <Typography sx={{ fontSize: 12, color: '#64748B', flex: 1 }}>{t.conductor}</Typography>
                <Typography sx={{ fontSize: 12, color: '#334155' }}>{t.litros} L</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: rendimientoColor(t.rendimiento) }}>{t.rendimiento.toFixed(1)}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: EAM_DARK, minWidth: 90, textAlign: 'right' }}>{formatCOPFull(t.costo)}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={<DirectionsCar />}
          onClick={() => onVerActivo(vehiculo.placa)}
          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Ver ficha del activo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Desviacion Detail Dialog ───────────────────────────────────────────────────
function DesviacionDetailDialog({
  desviacion,
  registros,
  onResolver,
  onCrearOT,
  onClose,
}: {
  desviacion: DesviacionAlert | null;
  registros: RegistroRow[];
  onResolver: (d: DesviacionAlert) => void;
  onCrearOT: (placa: string) => void;
  onClose: () => void;
}) {
  if (!desviacion) return null;
  const rojo = desviacion.severidad === 'Alta' ? '#DC2626' : '#D97706';
  const relacionados = registros.filter((r) => r.vehiculo === desviacion.vehiculo);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
        <Box sx={{ bgcolor: `${rojo}1A`, borderRadius: 2, p: 1, display: 'flex' }}>
          <SmartToy sx={{ color: rojo }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
            ALERTA {desviacion.id} · {desviacion.vehiculo}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
            {desviacion.metrica}
          </Typography>
        </Box>
        <Chip label={`Severidad: ${desviacion.severidad}`} size="small" color={severidadColor(desviacion.severidad)} sx={{ fontWeight: 700 }} />
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        <Alert
          severity={desviacion.severidad === 'Alta' ? 'error' : 'warning'}
          icon={<Warning fontSize="small" />}
          sx={{ mb: 2.5, bgcolor: `${rojo}12`, color: '#334155', '& .MuiAlert-icon': { color: rojo } }}
        >
          <AlertTitle sx={{ color: '#1E293B', fontWeight: 700 }}>Anomalía detectada por IA</AlertTitle>
          {desviacion.descripcion}
        </Alert>

        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 6 }}><DetailField label="Fecha detección" value={desviacion.detectada} /></Grid>
          <Grid size={{ xs: 6 }}><DetailField label="Costo desviación" value={formatCOPFull(desviacion.costoDesviacion)} color={rojo} /></Grid>
          <Grid size={{ xs: 6 }}><DetailField label="Valor actual" value={desviacion.valorActual} color={rojo} /></Grid>
          <Grid size={{ xs: 6 }}><DetailField label="Valor esperado" value={desviacion.valorEsperado} color="#16A34A" /></Grid>
        </Grid>

        <Paper elevation={0} sx={{ border: `1px solid ${EAM_COLOR}44`, borderRadius: 2, p: 2, mb: 2.5, bgcolor: `${EAM_COLOR}0A` }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: EAM_DARK, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
            Recomendación
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#334155' }}>{desviacion.recomendacion}</Typography>
        </Paper>

        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B', mb: 1 }}>
          Tanqueos relacionados · {relacionados.length}
        </Typography>
        {relacionados.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>Sin tanqueos en el periodo.</Typography>
        ) : (
          <Stack spacing={1}>
            {relacionados.map((r) => (
              <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <Typography sx={{ fontSize: 12, color: '#334155', minWidth: 90 }}>{r.fecha}</Typography>
                <Typography sx={{ fontSize: 12, color: '#64748B', flex: 1 }}>{r.litros} L · {r.proveedor}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: rendimientoColor(r.rendimiento) }}>{r.rendimiento.toFixed(1)} km/L</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
        <Button
          variant="outlined"
          startIcon={<OTIcon />}
          onClick={() => onCrearOT(desviacion.vehiculo)}
          sx={{ color: EAM_COLOR, borderColor: `${EAM_COLOR}66`, textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { borderColor: EAM_COLOR, bgcolor: `${EAM_COLOR}12` } }}
        >
          Generar OT correctiva
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={() => onResolver(desviacion)}
          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Marcar como revisada
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Nuevo Tanqueo Dialog ───────────────────────────────────────────────────────
interface NuevoTanqueoForm {
  fecha: string;
  vehiculo: string;
  tipoCombustible: 'ACPM' | 'Gasolina';
  litros: string;
  precioPorLitro: string;
  odometro: string;
  kmRecorridos: string;
  conductor: string;
  proveedor: string;
  estacion: string;
  ruta: string;
  tanqueoLleno: boolean;
  observacion: string;
}

const emptyForm: NuevoTanqueoForm = {
  fecha: new Date().toISOString().slice(0, 10),
  vehiculo: '',
  tipoCombustible: 'ACPM',
  litros: '',
  precioPorLitro: '5450',
  odometro: '',
  kmRecorridos: '',
  conductor: '',
  proveedor: 'Terpel',
  estacion: '',
  ruta: '',
  tanqueoLleno: true,
  observacion: '',
};

// Estilos de campos (tema claro, acento EAM)
const formInputSx = {
  '& .MuiInputBase-input': { color: '#1E293B' },
  '& .MuiInputBase-input::placeholder': { color: '#94A3B8', opacity: 1 },
  '& label': { color: '#64748B' },
  '& label.Mui-focused': { color: EAM_DARK },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
  '&:hover .MuiOutlinedInput-root:not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: `${EAM_COLOR}80` },
  '& .MuiOutlinedInput-root.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: EAM_COLOR },
  '& .MuiFormHelperText-root': { marginLeft: 0 },
};

function NuevoTanqueoDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (r: RegistroRow) => void;
}) {
  const [form, setForm] = useState<NuevoTanqueoForm>(emptyForm);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  const set = <K extends keyof NuevoTanqueoForm>(k: K, v: NuevoTanqueoForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Al elegir vehículo, autocompletar tipo, conductor, proveedor, estación, ruta y precio
  const handleVehiculo = (v: string) => {
    const d = VEHICULO_DEFAULTS[v];
    setForm((f) => ({
      ...f,
      vehiculo: v,
      tipoCombustible: d ? d.tipoCombustible : f.tipoCombustible,
      conductor: d ? d.conductor : f.conductor,
      proveedor: d ? d.proveedor : f.proveedor,
      estacion: d ? d.estacion : f.estacion,
      ruta: d ? d.ruta : f.ruta,
      precioPorLitro: d ? String(d.precioPorLitro) : f.precioPorLitro,
    }));
  };

  const litrosNum = parseFloat(form.litros) || 0;
  const precioNum = parseFloat(form.precioPorLitro) || 0;
  const kmNum = parseFloat(form.kmRecorridos) || 0;
  const odometroNum = parseFloat(form.odometro) || 0;
  const costoCalc = litrosNum * precioNum;
  const galones = litrosNum / 3.785;
  const rendCalc = litrosNum > 0 ? kmNum / litrosNum : 0;

  // Validación de campos obligatorios
  const errVehiculo = !form.vehiculo;
  const errLitros = litrosNum <= 0;
  const errPrecio = precioNum <= 0;
  const errOdometro = odometroNum <= 0;
  const errKm = kmNum <= 0;
  const errConductor = !form.conductor;
  const valido = !errVehiculo && !errLitros && !errPrecio && !errOdometro && !errKm && !errConductor;

  const reqHelper = (isErr: boolean, msg = 'Requerido') => (triedSubmit && isErr ? msg : ' ');

  const handleSave = () => {
    if (!valido) {
      setTriedSubmit(true);
      setWarnOpen(true);
      return;
    }
    const nuevo: RegistroRow = {
      id: Date.now(),
      fecha: form.fecha,
      vehiculo: form.vehiculo,
      tipoCombustible: form.tipoCombustible,
      litros: litrosNum,
      precioPorLitro: precioNum,
      costo: Math.round(costoCalc),
      odometro: odometroNum,
      rendimiento: parseFloat(rendCalc.toFixed(1)) || 0,
      conductor: form.conductor,
      proveedor: form.proveedor,
      estacion: form.estacion.trim() || `EDS ${form.proveedor}`,
      ruta: form.ruta.trim() || 'Sin especificar',
      kmRecorridos: kmNum,
      tanqueoLleno: form.tanqueoLleno,
      observacion: form.observacion.trim() || 'Registro manual.',
    };
    onSave(nuevo);
    setForm(emptyForm);
    setTriedSubmit(false);
  };

  const handleClose = () => {
    setForm(emptyForm);
    setTriedSubmit(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaperProps}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #E5E7EB', pb: 2 }}>
          <Box sx={{ bgcolor: `${EAM_COLOR}1A`, borderRadius: 2, p: 1, display: 'flex' }}>
            <LocalGasStation sx={{ color: EAM_COLOR }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>Registrar tanqueo</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              Complete los campos obligatorios (*) para registrar el consumo
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: '#64748B' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Vehículo *" value={form.vehiculo}
                onChange={(e) => handleVehiculo(e.target.value)}
                error={triedSubmit && errVehiculo}
                helperText={reqHelper(errVehiculo, 'Seleccione un vehículo')}
                sx={formInputSx}
              >
                {VEHICULOS_DISPONIBLES.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="date" fullWidth size="small" label="Fecha" value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)} InputLabelProps={{ shrink: true }}
                helperText=" " sx={formInputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Tipo combustible" value={form.tipoCombustible}
                onChange={(e) => set('tipoCombustible', e.target.value as 'ACPM' | 'Gasolina')}
                helperText={form.vehiculo ? 'Autocompletado del vehículo' : ' '} sx={formInputSx}
              >
                <MenuItem value="ACPM">ACPM</MenuItem>
                <MenuItem value="Gasolina">Gasolina</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Proveedor" value={form.proveedor}
                onChange={(e) => set('proveedor', e.target.value)} helperText=" " sx={formInputSx}
              >
                {PROVEEDORES_DISPONIBLES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number" fullWidth size="small" label="Litros *" value={form.litros}
                onChange={(e) => set('litros', e.target.value)}
                error={triedSubmit && errLitros}
                helperText={reqHelper(errLitros, 'Ingrese litros > 0')}
                InputProps={{ endAdornment: <InputAdornment position="end">L</InputAdornment>, inputProps: { min: 0, step: 0.1 } }}
                sx={formInputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number" fullWidth size="small" label="Precio / litro *" value={form.precioPorLitro}
                onChange={(e) => set('precioPorLitro', e.target.value)}
                error={triedSubmit && errPrecio}
                helperText={reqHelper(errPrecio, 'Ingrese un precio > 0')}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0 } }}
                sx={formInputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number" fullWidth size="small" label="Odómetro *" value={form.odometro}
                onChange={(e) => set('odometro', e.target.value)}
                error={triedSubmit && errOdometro}
                helperText={reqHelper(errOdometro, 'Ingrese el odómetro')}
                InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment>, inputProps: { min: 0 } }}
                sx={formInputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number" fullWidth size="small" label="km recorridos *" value={form.kmRecorridos}
                onChange={(e) => set('kmRecorridos', e.target.value)}
                error={triedSubmit && errKm}
                helperText={reqHelper(errKm, 'Ingrese km recorridos')}
                InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment>, inputProps: { min: 0 } }}
                sx={formInputSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                select fullWidth size="small" label="Conductor *" value={form.conductor}
                onChange={(e) => set('conductor', e.target.value)}
                error={triedSubmit && errConductor}
                helperText={reqHelper(errConductor, 'Seleccione un conductor')}
                sx={formInputSx}
              >
                {CONDUCTORES_DISPONIBLES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Estación" value={form.estacion}
                onChange={(e) => set('estacion', e.target.value)} helperText=" " sx={formInputSx}
              >
                <MenuItem value="">
                  <em>Sin especificar</em>
                </MenuItem>
                {ESTACIONES_DISPONIBLES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Ruta" value={form.ruta}
                onChange={(e) => set('ruta', e.target.value)} helperText=" " sx={formInputSx}
              >
                <MenuItem value="">
                  <em>Sin especificar</em>
                </MenuItem>
                {RUTAS_DISPONIBLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Tipo de tanqueo" value={form.tanqueoLleno ? 'lleno' : 'parcial'}
                onChange={(e) => set('tanqueoLleno', e.target.value === 'lleno')} helperText=" " sx={formInputSx}
              >
                <MenuItem value="lleno">Tanque lleno</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="Observación (opcional)" value={form.observacion}
                onChange={(e) => set('observacion', e.target.value)} multiline minRows={2}
                helperText=" " sx={formInputSx}
              />
            </Grid>
          </Grid>

          {/* Cálculo en vivo */}
          <Paper elevation={0} sx={{ border: `1px solid ${EAM_COLOR}44`, borderRadius: 2, p: 1.5, mt: 1, bgcolor: `${EAM_COLOR}0A` }}>
            <Stack direction="row" justifyContent="space-around" flexWrap="wrap" useFlexGap>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Costo total</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: EAM_DARK }}>{formatCOPFull(Math.round(costoCalc))}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Galones</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#8B5CF6' }}>{galones.toFixed(1)}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Rendimiento</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: rendimientoColor(rendCalc) }}>{rendCalc.toFixed(1)} km/L</Typography>
              </Box>
            </Stack>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!valido}
            startIcon={<AddIcon />}
            onClick={handleSave}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2, '&.Mui-disabled': { bgcolor: '#CBD5E1', color: '#F8FAFC' } }}
          >
            Guardar tanqueo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Aviso de campos incompletos */}
      <Snackbar
        open={warnOpen}
        autoHideDuration={4000}
        onClose={() => setWarnOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setWarnOpen(false)}
          severity="warning"
          variant="filled"
          icon={<Warning fontSize="inherit" />}
          sx={{ fontWeight: 600 }}
        >
          Complete los campos obligatorios (*) para guardar el tanqueo.
        </Alert>
      </Snackbar>
    </>
  );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────
function TabRegistros({
  registros,
  search,
  setSearch,
  filtroTipo,
  setFiltroTipo,
  filtroProveedor,
  setFiltroProveedor,
  onRowClick,
}: {
  registros: RegistroRow[];
  search: string;
  setSearch: (v: string) => void;
  filtroTipo: string;
  setFiltroTipo: (v: string) => void;
  filtroProveedor: string;
  setFiltroProveedor: (v: string) => void;
  onRowClick: (r: RegistroRow) => void;
}) {
  const cellSx = { color: '#334155', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', py: 0.8 };
  const headSx = { color: '#64748B', borderBottom: `1px solid ${EAM_COLOR}55`, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: 0.8 };

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (filtroTipo !== 'Todos' && r.tipoCombustible !== filtroTipo) return false;
      if (filtroProveedor !== 'Todos' && r.proveedor !== filtroProveedor) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !r.vehiculo.toLowerCase().includes(q) &&
          !r.conductor.toLowerCase().includes(q) &&
          !r.proveedor.toLowerCase().includes(q) &&
          !r.estacion.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [registros, filtroTipo, filtroProveedor, search]);

  const totalLitros = filtered.reduce((s, r) => s + r.litros, 0);
  const totalCosto = filtered.reduce((s, r) => s + r.costo, 0);
  const promRend = filtered.length ? filtered.reduce((s, r) => s + r.rendimiento, 0) / filtered.length : 0;
  const vehiculosUnicos = new Set(filtered.map((r) => r.vehiculo)).size;

  return (
    <Box>
      {/* KPI Row (reactivo a los filtros) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<LocalGasStation fontSize="small" />} label="Total Litros" value={`${totalLitros.toLocaleString('es-CO')} L`} sub={`${filtered.length} tanqueos`} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<MoneyIcon fontSize="small" />} label="Costo Total" value={formatCOPFull(totalCosto)} sub="Periodo filtrado" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<Speed fontSize="small" />} label="Rendimiento Prom." value={`${promRend.toFixed(1)} km/L`} sub="Selección actual" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<DirectionsCar fontSize="small" />} label="Vehículos" value={String(vehiculosUnicos)} sub="Con tanqueo" />
        </Grid>
      </Grid>

      {/* Filtros */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          size="small" placeholder="Buscar vehículo, conductor, estación…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: 1, '& .MuiInputBase-input': { color: '#1E293B' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
        <TextField select size="small" label="Combustible" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} sx={{ minWidth: 150, '& .MuiInputBase-input': { color: '#1E293B' } }}>
          {['Todos', 'ACPM', 'Gasolina'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Proveedor" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} sx={{ minWidth: 150, '& .MuiInputBase-input': { color: '#1E293B' } }}>
          {['Todos', ...PROVEEDORES_DISPONIBLES].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      </Stack>

      <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 1 }}>
        {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · haz clic en una fila para ver el detalle completo
      </Typography>

      {/* Registros Table */}
      <TableContainer component={Paper} sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Fecha','Vehículo','Tipo Combustible','Litros','Precio/Litro','Costo','Odómetro','km/L','Conductor','Proveedor'].map(h => (
                <TableCell key={h} sx={headSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                onClick={() => onRowClick(r)}
                sx={{ cursor: 'pointer', transition: 'background-color 0.12s', '&:hover': { bgcolor: `${EAM_COLOR}0F` } }}
              >
                <TableCell sx={cellSx}>{r.fecha}</TableCell>
                <TableCell sx={{ ...cellSx, color: EAM_COLOR, fontWeight: 600 }}>{r.vehiculo}</TableCell>
                <TableCell sx={cellSx}>
                  <Chip
                    label={r.tipoCombustible}
                    size="small"
                    sx={{
                      bgcolor: r.tipoCombustible === 'ACPM' ? '#DBEAFE' : '#DCFCE7',
                      color: r.tipoCombustible === 'ACPM' ? '#1D4ED8' : '#15803D',
                      fontSize: '0.65rem',
                      height: 20,
                      fontWeight: 700,
                    }}
                  />
                </TableCell>
                <TableCell sx={cellSx}>{r.litros.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={cellSx}>${r.precioPorLitro.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={cellSx}>{formatCOPFull(r.costo)}</TableCell>
                <TableCell sx={cellSx}>{r.odometro.toLocaleString('es-CO')} km</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 700, color: rendimientoColor(r.rendimiento) }}>
                  {r.rendimiento.toFixed(1)}
                </TableCell>
                <TableCell sx={cellSx}>{r.conductor}</TableCell>
                <TableCell sx={cellSx}>{r.proveedor}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ ...cellSx, textAlign: 'center', py: 4, color: '#94A3B8' }}>
                  No hay registros que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function TabRendimiento({
  filtroEstado,
  setFiltroEstado,
  onRowClick,
}: {
  filtroEstado: string;
  setFiltroEstado: (v: string) => void;
  onRowClick: (r: RendimientoRow) => void;
}) {
  const cellSx = { color: '#334155', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', py: 0.9 };
  const headSx = { color: '#64748B', borderBottom: `1px solid ${EAM_COLOR}55`, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: 0.8 };

  const filtered = useMemo(
    () => RENDIMIENTO_ROWS.filter((r) => filtroEstado === 'Todos' || r.estado === filtroEstado),
    [filtroEstado]
  );

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ color: '#64748B' }}>
          Rendimiento por vehículo — Junio 2026 · clic para ver el detalle
        </Typography>
        <TextField select size="small" label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} sx={{ minWidth: 160, '& .MuiInputBase-input': { color: '#1E293B' } }}>
          {['Todos', 'Óptimo', 'En Rango', 'Bajo'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      </Stack>
      <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Placa','Nombre Vehículo','km este Mes','Litros','Rendimiento (km/L)','Meta (km/L)','vs Meta (%)','Estado'].map(h => (
                <TableCell key={h} sx={headSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow
                key={i}
                onClick={() => onRowClick(r)}
                sx={{ cursor: 'pointer', transition: 'background-color 0.12s', '&:hover': { bgcolor: `${EAM_COLOR}0F` } }}
              >
                <TableCell sx={{ ...cellSx, color: EAM_COLOR, fontWeight: 700 }}>{r.placa}</TableCell>
                <TableCell sx={cellSx}>{r.nombre}</TableCell>
                <TableCell sx={cellSx}>{r.kmMes.toLocaleString('es-CO')} km</TableCell>
                <TableCell sx={cellSx}>{r.litros.toLocaleString('es-CO')} L</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 700, color: rendimientoColor(r.rendimiento) }}>{r.rendimiento.toFixed(1)}</TableCell>
                <TableCell sx={cellSx}>{r.meta.toFixed(1)}</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 700, color: r.vsMetaPct >= 100 ? '#16A34A' : r.vsMetaPct >= 90 ? '#D97706' : '#DC2626' }}>
                  {r.vsMetaPct}%
                </TableCell>
                <TableCell sx={cellSx}>
                  <Chip label={r.estado} size="small" color={estadoColor(r.estado)} sx={{ fontWeight: 600, fontSize: '0.68rem' }} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ ...cellSx, textAlign: 'center', py: 4, color: '#94A3B8' }}>
                  No hay vehículos en este estado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function TabDesviaciones({
  desviaciones,
  onCardClick,
}: {
  desviaciones: DesviacionAlert[];
  onCardClick: (d: DesviacionAlert) => void;
}) {
  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <SmartToy sx={{ color: EAM_COLOR, fontSize: 28 }} />
        <Box>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1 }}>
            Alertas de Consumo Anormal
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', letterSpacing: 0.5 }}>
            Detección por IA · clic en una tarjeta para investigar
          </Typography>
        </Box>
        <Chip
          label={`${desviaciones.length} alertas activas`}
          size="small"
          color={desviaciones.length ? 'error' : 'success'}
          sx={{ ml: 'auto', fontWeight: 700 }}
        />
      </Box>

      <Divider sx={{ borderColor: '#E5E7EB', mb: 3 }} />

      {desviaciones.length === 0 ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>Sin alertas activas</AlertTitle>
          Todas las desviaciones han sido revisadas.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {desviaciones.map((d) => (
            <Grid key={d.id} size={{ xs: 12, md: 6 }}>
              <Card
                onClick={() => onCardClick(d)}
                sx={{
                  bgcolor: '#FFFFFF',
                  border: `1px solid ${d.severidad === 'Alta' ? '#F8717166' : '#FACC1566'}`,
                  borderLeft: `4px solid ${d.severidad === 'Alta' ? '#DC2626' : '#D97706'}`,
                  borderRadius: 2,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                  '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDown sx={{ color: d.severidad === 'Alta' ? '#DC2626' : '#D97706', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: '0.9rem' }}>
                        {d.vehiculo}
                      </Typography>
                    </Box>
                    <Chip
                      label={`Severidad: ${d.severidad}`}
                      size="small"
                      color={severidadColor(d.severidad)}
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </Box>

                  <Alert
                    severity={d.severidad === 'Alta' ? 'error' : 'warning'}
                    icon={<Warning fontSize="small" />}
                    sx={{
                      bgcolor: d.severidad === 'Alta' ? '#DC262612' : '#D9770612',
                      color: '#334155',
                      border: 'none',
                      py: 0.5,
                      mb: 1.5,
                      '& .MuiAlert-icon': { color: d.severidad === 'Alta' ? '#DC2626' : '#D97706' },
                    }}
                  >
                    <AlertTitle sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.2 }}>
                      Anomalía detectada
                    </AlertTitle>
                    <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {d.descripcion}
                    </Typography>
                  </Alert>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', letterSpacing: 0.4 }}>
                        Costo desviación estimado
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#D97706', fontWeight: 700 }}>
                        {formatCOPFull(d.costoDesviacion)}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onCardClick(d); }}
                      sx={{
                        color: EAM_COLOR,
                        borderColor: `${EAM_COLOR}66`,
                        fontSize: '0.7rem',
                        py: 0.4,
                        px: 1.5,
                        textTransform: 'none',
                        '&:hover': { borderColor: EAM_COLOR, bgcolor: `${EAM_COLOR}15` },
                      }}
                    >
                      Ver Detalle
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function EAMCombustible() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Datos mutables
  const [registros, setRegistros] = useState<RegistroRow[]>(REGISTROS_SEED);
  const [desviaciones, setDesviaciones] = useState<DesviacionAlert[]>(DESVIACIONES);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroProveedor, setFiltroProveedor] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Diálogos
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroRow | null>(null);
  const [selectedRendimiento, setSelectedRendimiento] = useState<RendimientoRow | null>(null);
  const [selectedDesviacion, setSelectedDesviacion] = useState<DesviacionAlert | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const notify = (msg: string) => setSnack({ open: true, msg });

  const handleSaveTanqueo = (r: RegistroRow) => {
    setRegistros((prev) => [r, ...prev]);
    setNuevoOpen(false);
    notify(`Tanqueo de ${r.vehiculo} registrado · ${r.litros} L · ${formatCOPFull(r.costo)}`);
  };

  const handleResolverDesviacion = (d: DesviacionAlert) => {
    setDesviaciones((prev) => prev.filter((x) => x.id !== d.id));
    setSelectedDesviacion(null);
    notify(`Alerta ${d.id} de ${d.vehiculo} marcada como revisada`);
  };

  const handleExport = () => {
    if (activeTab === 0) {
      // Registros — respeta los filtros aplicados en la pestaña
      const filas = registros.filter((r) => {
        if (filtroTipo !== 'Todos' && r.tipoCombustible !== filtroTipo) return false;
        if (filtroProveedor !== 'Todos' && r.proveedor !== filtroProveedor) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          if (
            !r.vehiculo.toLowerCase().includes(q) &&
            !r.conductor.toLowerCase().includes(q) &&
            !r.proveedor.toLowerCase().includes(q) &&
            !r.estacion.toLowerCase().includes(q)
          ) return false;
        }
        return true;
      });
      if (!filas.length) {
        notify('No hay registros para exportar con los filtros actuales.');
        return;
      }
      exportarExcel({
        archivo: 'eam-combustible-registros',
        titulo: 'Registros de Combustible',
        columnas: [
          { key: 'fecha', header: 'Fecha' },
          { key: 'vehiculo', header: 'Vehículo' },
          { key: 'tipoCombustible', header: 'Tipo Combustible' },
          { key: 'litros', header: 'Litros' },
          { key: 'precioPorLitro', header: 'Precio/Litro' },
          { key: 'costo', header: 'Costo' },
          { key: 'odometro', header: 'Odómetro (km)' },
          { key: 'rendimiento', header: 'Rendimiento (km/L)' },
          { key: 'conductor', header: 'Conductor' },
          { key: 'proveedor', header: 'Proveedor' },
          { key: 'estacion', header: 'Estación' },
          { key: 'ruta', header: 'Ruta' },
          { key: 'kmRecorridos', header: 'km Recorridos' },
        ],
        filas,
      });
      notify(`Exportando ${filas.length} registro${filas.length !== 1 ? 's' : ''} de combustible a Excel…`);
    } else if (activeTab === 1) {
      // Rendimiento — respeta el filtro de estado
      const filas = RENDIMIENTO_ROWS.filter((r) => filtroEstado === 'Todos' || r.estado === filtroEstado);
      if (!filas.length) {
        notify('No hay vehículos para exportar con el filtro actual.');
        return;
      }
      exportarExcel({
        archivo: 'eam-combustible-rendimiento',
        titulo: 'Rendimiento por Vehículo',
        columnas: [
          { key: 'placa', header: 'Placa' },
          { key: 'nombre', header: 'Nombre Vehículo' },
          { key: 'kmMes', header: 'km este Mes' },
          { key: 'litros', header: 'Litros' },
          { key: 'rendimiento', header: 'Rendimiento (km/L)' },
          { key: 'meta', header: 'Meta (km/L)' },
          { key: 'vsMetaPct', header: 'vs Meta (%)' },
          { key: 'estado', header: 'Estado' },
        ],
        filas,
      });
      notify(`Exportando ${filas.length} vehículo${filas.length !== 1 ? 's' : ''} de rendimiento a Excel…`);
    } else {
      // Desviaciones
      if (!desviaciones.length) {
        notify('No hay alertas de desviación para exportar.');
        return;
      }
      exportarExcel({
        archivo: 'eam-combustible-desviaciones',
        titulo: 'Alertas de Consumo Anormal',
        columnas: [
          { key: 'id', header: 'ID' },
          { key: 'vehiculo', header: 'Vehículo' },
          { key: 'metrica', header: 'Métrica' },
          { key: 'descripcion', header: 'Descripción' },
          { key: 'valorActual', header: 'Valor Actual' },
          { key: 'valorEsperado', header: 'Valor Esperado' },
          { key: 'costoDesviacion', header: 'Costo Desviación' },
          { key: 'severidad', header: 'Severidad' },
          { key: 'detectada', header: 'Detectada' },
          { key: 'recomendacion', header: 'Recomendación' },
        ],
        filas: desviaciones,
      });
      notify(`Exportando ${desviaciones.length} alerta${desviaciones.length !== 1 ? 's' : ''} de desviación a Excel…`);
    }
  };

  const handleVerActivo = (placa: string) => {
    setSelectedRegistro(null);
    setSelectedRendimiento(null);
    navigate(`/eam/activos?activo=${encodeURIComponent(placa)}`);
  };

  const handleCrearOT = (placa: string) => {
    setSelectedDesviacion(null);
    navigate(`/eam/ordenes-trabajo?activo=${encodeURIComponent(placa)}`);
  };

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: 3 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              bgcolor: `${EAM_COLOR}1A`,
              border: `1px solid ${EAM_COLOR}55`,
              borderRadius: 2,
              p: 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocalGasStation sx={{ color: EAM_COLOR, fontSize: 30 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.1 }}>
              Gestión de Combustible
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>
              EAM — ICOLTRANS · Módulo de Consumo
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Exportar registros a CSV">
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={handleExport}
                sx={{ color: EAM_COLOR, borderColor: `${EAM_COLOR}66`, textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { borderColor: EAM_COLOR, bgcolor: `${EAM_COLOR}12` } }}
              >
                Exportar
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNuevoOpen(true)}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Registrar Tanqueo
            </Button>
          </Stack>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, v: number) => setActiveTab(v)}
            sx={{
              borderBottom: `1px solid #E5E7EB`,
              px: 2,
              '& .MuiTab-root': {
                color: '#64748B',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                minHeight: 48,
                '&.Mui-selected': { color: EAM_COLOR },
              },
              '& .MuiTabs-indicator': { bgcolor: EAM_COLOR, height: 3 },
            }}
          >
            <Tab label="Registros" />
            <Tab label="Rendimiento" />
            <Tab label={`Desviaciones${desviaciones.length ? ` (${desviaciones.length})` : ''}`} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <TabRegistros
                registros={registros}
                search={search}
                setSearch={setSearch}
                filtroTipo={filtroTipo}
                setFiltroTipo={setFiltroTipo}
                filtroProveedor={filtroProveedor}
                setFiltroProveedor={setFiltroProveedor}
                onRowClick={setSelectedRegistro}
              />
            )}
            {activeTab === 1 && (
              <TabRendimiento
                filtroEstado={filtroEstado}
                setFiltroEstado={setFiltroEstado}
                onRowClick={setSelectedRendimiento}
              />
            )}
            {activeTab === 2 && (
              <TabDesviaciones desviaciones={desviaciones} onCardClick={setSelectedDesviacion} />
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <RegistroDetailDialog
        registro={selectedRegistro}
        historial={registros}
        onClose={() => setSelectedRegistro(null)}
        onVerActivo={handleVerActivo}
      />
      <RendimientoDetailDialog
        vehiculo={selectedRendimiento}
        registros={registros}
        onClose={() => setSelectedRendimiento(null)}
        onVerActivo={handleVerActivo}
      />
      <DesviacionDetailDialog
        desviacion={selectedDesviacion}
        registros={registros}
        onResolver={handleResolverDesviacion}
        onCrearOT={handleCrearOT}
        onClose={() => setSelectedDesviacion(null)}
      />
      <NuevoTanqueoDialog
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        onSave={handleSaveTanqueo}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ open: false, msg: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack({ open: false, msg: '' })}
          severity="success"
          variant="filled"
          sx={{ bgcolor: EAM_COLOR, color: '#FFFFFF', fontWeight: 600 }}
          icon={<CheckIcon fontSize="inherit" />}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
