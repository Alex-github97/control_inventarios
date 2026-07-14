import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LinearProgress,
  Stack,
  Snackbar,
  Alert,
  Tooltip,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningIcon from '@mui/icons-material/Warning';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import HistoryIcon from '@mui/icons-material/History';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const EAM_COLOR = '#32AC5C';
const EAM_DARK = '#27884A';

// --- Types ---

interface Repuesto {
  codigo: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unit: number;
  proveedor_principal: string;
  ultimo_consumo: string;
  // Enriquecidos
  unidad: string;
  ubicacion: string;
  lead_time_dias: number;
  consumo_mensual: number;
  compatibilidad: string[];
}

interface Consumo {
  repuesto: string;
  ot_relacionada: string;
  activo: string;
  cantidad: number;
  fecha: string;
  costo: number;
}

interface ItemReorden {
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  cantidad_sugerida: number;
  proveedor: string;
  costo_estimado: number;
}

// --- Mock Data (initial) ---

const REPUESTOS_INIT: Repuesto[] = [
  { codigo: 'FIL-001', nombre: 'Filtro de Aceite Motor', categoria: 'FILTROS', stock_actual: 8, stock_minimo: 15, costo_unit: 45000, proveedor_principal: 'Auteco S.A.', ultimo_consumo: '2024-06-10', unidad: 'UND', ubicacion: 'Bodega A · Est. 3 · Nivel 2', lead_time_dias: 5, consumo_mensual: 12, compatibilidad: ['Tracto TK-112', 'Tracto TK-105', 'Camión CM-047'] },
  { codigo: 'ACE-002', nombre: 'Aceite Motor 15W40 x 4L', categoria: 'ACEITES', stock_actual: 22, stock_minimo: 20, costo_unit: 95000, proveedor_principal: 'Mobil Colombia', ultimo_consumo: '2024-06-12', unidad: 'GAL', ubicacion: 'Bodega A · Est. 1 · Nivel 1', lead_time_dias: 3, consumo_mensual: 18, compatibilidad: ['Flota diesel general'] },
  { codigo: 'FRE-003', nombre: 'Pastillas de Freno Delanteras', categoria: 'FRENOS', stock_actual: 4, stock_minimo: 10, costo_unit: 185000, proveedor_principal: 'Frenosa Ltda.', ultimo_consumo: '2024-06-08', unidad: 'JGO', ubicacion: 'Bodega B · Est. 5 · Nivel 1', lead_time_dias: 7, consumo_mensual: 6, compatibilidad: ['Camión CM-047', 'Camión CM-033'] },
  { codigo: 'ELE-004', nombre: 'Batería 12V 90Ah', categoria: 'ELECTRICO', stock_actual: 3, stock_minimo: 6, costo_unit: 520000, proveedor_principal: 'Baterías Mac', ultimo_consumo: '2024-06-05', unidad: 'UND', ubicacion: 'Bodega B · Est. 2 · Nivel 1', lead_time_dias: 4, consumo_mensual: 2, compatibilidad: ['Camión CM-033', 'Camioneta CU-012'] },
  { codigo: 'HID-005', nombre: 'Manguera Hidráulica 1/2" x 1m', categoria: 'HIDRAULICO', stock_actual: 14, stock_minimo: 10, costo_unit: 78000, proveedor_principal: 'Hidráulicos del Valle', ultimo_consumo: '2024-06-11', unidad: 'MTR', ubicacion: 'Bodega C · Est. 4 · Nivel 3', lead_time_dias: 6, consumo_mensual: 5, compatibilidad: ['Montacargas MC-07', 'Montacargas MC-03'] },
  { codigo: 'NEU-006', nombre: 'Llanta 11R22.5', categoria: 'NEUMATICOS', stock_actual: 6, stock_minimo: 8, costo_unit: 1850000, proveedor_principal: 'Michelin Colombia', ultimo_consumo: '2024-06-03', unidad: 'UND', ubicacion: 'Patio Llantas · Zona 1', lead_time_dias: 10, consumo_mensual: 3, compatibilidad: ['Tractos serie TK', 'Camiones serie CM'] },
  { codigo: 'FIL-007', nombre: 'Filtro de Aire Motor', categoria: 'FILTROS', stock_actual: 18, stock_minimo: 12, costo_unit: 62000, proveedor_principal: 'Auteco S.A.', ultimo_consumo: '2024-05-28', unidad: 'UND', ubicacion: 'Bodega A · Est. 3 · Nivel 1', lead_time_dias: 5, consumo_mensual: 8, compatibilidad: ['Tracto TK-088', 'Flota diesel general'] },
  { codigo: 'ACE-008', nombre: 'Aceite Transmisión 80W90 x 1L', categoria: 'ACEITES', stock_actual: 30, stock_minimo: 18, costo_unit: 38000, proveedor_principal: 'Mobil Colombia', ultimo_consumo: '2024-06-09', unidad: 'LTR', ubicacion: 'Bodega A · Est. 1 · Nivel 2', lead_time_dias: 3, consumo_mensual: 10, compatibilidad: ['Flota diesel general'] },
  { codigo: 'FRE-009', nombre: 'Disco de Freno Posterior', categoria: 'FRENOS', stock_actual: 2, stock_minimo: 8, costo_unit: 320000, proveedor_principal: 'Frenosa Ltda.', ultimo_consumo: '2024-06-01', unidad: 'UND', ubicacion: 'Bodega B · Est. 5 · Nivel 2', lead_time_dias: 7, consumo_mensual: 4, compatibilidad: ['Camión CM-021', 'Camión CM-033'] },
  { codigo: 'ELE-010', nombre: 'Alternador 24V 80A', categoria: 'ELECTRICO', stock_actual: 1, stock_minimo: 3, costo_unit: 1240000, proveedor_principal: 'Eléctricos Bogotá', ultimo_consumo: '2024-05-22', unidad: 'UND', ubicacion: 'Bodega B · Est. 2 · Nivel 2', lead_time_dias: 8, consumo_mensual: 1, compatibilidad: ['Tracto TK-074', 'Tracto TK-098'] },
  { codigo: 'HID-011', nombre: 'Bomba Hidráulica Dirección', categoria: 'HIDRAULICO', stock_actual: 2, stock_minimo: 2, costo_unit: 2100000, proveedor_principal: 'Hidráulicos del Valle', ultimo_consumo: '2024-05-30', unidad: 'UND', ubicacion: 'Bodega C · Est. 4 · Nivel 1', lead_time_dias: 12, consumo_mensual: 1, compatibilidad: ['Montacargas MC-07'] },
  { codigo: 'FIL-012', nombre: 'Filtro Combustible Diesel', categoria: 'FILTROS', stock_actual: 10, stock_minimo: 20, costo_unit: 55000, proveedor_principal: 'Auteco S.A.', ultimo_consumo: '2024-06-13', unidad: 'UND', ubicacion: 'Bodega A · Est. 3 · Nivel 3', lead_time_dias: 5, consumo_mensual: 14, compatibilidad: ['Tracto TK-119', 'Flota diesel general'] },
];

const CONSUMOS: Consumo[] = [
  { repuesto: 'Filtro de Aceite Motor', ot_relacionada: 'OT-2024-0891', activo: 'Tracto TK-112', cantidad: 2, fecha: '2024-06-10', costo: 90000 },
  { repuesto: 'Aceite Motor 15W40 x 4L', ot_relacionada: 'OT-2024-0892', activo: 'Tracto TK-105', cantidad: 3, fecha: '2024-06-12', costo: 285000 },
  { repuesto: 'Pastillas de Freno Delanteras', ot_relacionada: 'OT-2024-0880', activo: 'Camión CM-047', cantidad: 1, fecha: '2024-06-08', costo: 185000 },
  { repuesto: 'Batería 12V 90Ah', ot_relacionada: 'OT-2024-0875', activo: 'Camión CM-033', cantidad: 1, fecha: '2024-06-05', costo: 520000 },
  { repuesto: 'Filtro Combustible Diesel', ot_relacionada: 'OT-2024-0893', activo: 'Tracto TK-119', cantidad: 2, fecha: '2024-06-13', costo: 110000 },
  { repuesto: 'Llanta 11R22.5', ot_relacionada: 'OT-2024-0868', activo: 'Tracto TK-098', cantidad: 2, fecha: '2024-06-03', costo: 3700000 },
  { repuesto: 'Manguera Hidráulica 1/2" x 1m', ot_relacionada: 'OT-2024-0885', activo: 'Montacargas MC-07', cantidad: 3, fecha: '2024-06-11', costo: 234000 },
  { repuesto: 'Filtro de Aire Motor', ot_relacionada: 'OT-2024-0855', activo: 'Tracto TK-088', cantidad: 1, fecha: '2024-05-28', costo: 62000 },
  { repuesto: 'Disco de Freno Posterior', ot_relacionada: 'OT-2024-0862', activo: 'Camión CM-021', cantidad: 2, fecha: '2024-06-01', costo: 640000 },
  { repuesto: 'Alternador 24V 80A', ot_relacionada: 'OT-2024-0840', activo: 'Tracto TK-074', cantidad: 1, fecha: '2024-05-22', costo: 1240000 },
  // Consumos adicionales para nutrir el historial por repuesto
  { repuesto: 'Filtro de Aceite Motor', ot_relacionada: 'OT-2024-0810', activo: 'Tracto TK-105', cantidad: 2, fecha: '2024-05-14', costo: 90000 },
  { repuesto: 'Filtro de Aceite Motor', ot_relacionada: 'OT-2024-0778', activo: 'Camión CM-047', cantidad: 1, fecha: '2024-04-30', costo: 45000 },
  { repuesto: 'Aceite Motor 15W40 x 4L', ot_relacionada: 'OT-2024-0801', activo: 'Camión CM-033', cantidad: 4, fecha: '2024-05-10', costo: 380000 },
  { repuesto: 'Pastillas de Freno Delanteras', ot_relacionada: 'OT-2024-0812', activo: 'Camión CM-033', cantidad: 1, fecha: '2024-05-19', costo: 185000 },
  { repuesto: 'Filtro Combustible Diesel', ot_relacionada: 'OT-2024-0820', activo: 'Flota diesel general', cantidad: 3, fecha: '2024-05-22', costo: 165000 },
];

const ITEMS_REORDEN_INIT: ItemReorden[] = [
  { nombre: 'Filtro de Aceite Motor', stock_actual: 8, stock_minimo: 15, cantidad_sugerida: 20, proveedor: 'Auteco S.A.', costo_estimado: 900000 },
  { nombre: 'Pastillas de Freno Delanteras', stock_actual: 4, stock_minimo: 10, cantidad_sugerida: 12, proveedor: 'Frenosa Ltda.', costo_estimado: 2220000 },
  { nombre: 'Batería 12V 90Ah', stock_actual: 3, stock_minimo: 6, cantidad_sugerida: 6, proveedor: 'Baterías Mac', costo_estimado: 3120000 },
  { nombre: 'Llanta 11R22.5', stock_actual: 6, stock_minimo: 8, cantidad_sugerida: 8, proveedor: 'Michelin Colombia', costo_estimado: 14800000 },
  { nombre: 'Disco de Freno Posterior', stock_actual: 2, stock_minimo: 8, cantidad_sugerida: 10, proveedor: 'Frenosa Ltda.', costo_estimado: 3200000 },
  { nombre: 'Alternador 24V 80A', stock_actual: 1, stock_minimo: 3, cantidad_sugerida: 4, proveedor: 'Eléctricos Bogotá', costo_estimado: 4960000 },
  { nombre: 'Filtro Combustible Diesel', stock_actual: 10, stock_minimo: 20, cantidad_sugerida: 24, proveedor: 'Auteco S.A.', costo_estimado: 1320000 },
  { nombre: 'Aceite Transmisión 80W90 x 1L', stock_actual: 30, stock_minimo: 18, cantidad_sugerida: 0, proveedor: 'Mobil Colombia', costo_estimado: 0 },
];

// --- Helpers ---

const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const CATEGORIA_COLORS: Record<string, string> = {
  FILTROS: '#0284C7',
  ACEITES: '#16A34A',
  FRENOS: '#DC2626',
  ELECTRICO: '#D97706',
  HIDRAULICO: '#7C3AED',
  NEUMATICOS: '#0F766E',
};

const CATEGORIAS = ['FILTROS', 'ACEITES', 'FRENOS', 'ELECTRICO', 'HIDRAULICO', 'NEUMATICOS'];

function catColor(cat: string): string {
  return CATEGORIA_COLORS[cat] ?? '#334155';
}

// --- KPI Card ---

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}

function KpiCard({ icon, label, value, sub, alert }: KpiCardProps) {
  return (
    <Card
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${alert ? EAM_COLOR : '#E5E7EB'}`,
        borderRadius: 2,
        height: '100%',
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: alert ? `${EAM_COLOR}22` : '#EFF6FF',
            color: alert ? EAM_COLOR : '#2563EB',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {label}
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: alert ? EAM_COLOR : '#1E293B', lineHeight: 1.2 }}
          >
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

// --- Detalle de repuesto (Dialog) ---

interface DetalleProps {
  repuesto: Repuesto | null;
  onClose: () => void;
  onGenerarOC: (r: Repuesto) => void;
  onVerOT: (numero: string) => void;
}

function DetalleField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
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
  );
}

function RepuestoDetalleDialog({ repuesto, onClose, onGenerarOC, onVerOT }: DetalleProps) {
  const open = !!repuesto;
  // Historial de consumos de este repuesto
  const historial = useMemo(
    () => (repuesto ? CONSUMOS.filter((c) => c.repuesto === repuesto.nombre) : []),
    [repuesto]
  );
  if (!repuesto) {
    return <Dialog open={open} onClose={onClose} />;
  }

  const isLow = repuesto.stock_actual < repuesto.stock_minimo;
  const valorInventario = repuesto.stock_actual * repuesto.costo_unit;
  const puntoReorden = repuesto.stock_minimo + Math.ceil((repuesto.consumo_mensual / 30) * repuesto.lead_time_dias);
  const cobertura = repuesto.consumo_mensual > 0 ? repuesto.stock_actual / repuesto.consumo_mensual : Infinity;
  const totalConsumido = historial.reduce((s, c) => s + c.costo, 0);
  const nivelPct = Math.min(100, (repuesto.stock_actual / Math.max(1, puntoReorden)) * 100);
  const cColor = catColor(repuesto.categoria);

  const kpis = [
    { label: 'Stock actual', value: `${repuesto.stock_actual} ${repuesto.unidad}`, color: isLow ? '#DC2626' : '#16A34A' },
    { label: 'Stock mínimo', value: `${repuesto.stock_minimo} ${repuesto.unidad}`, color: '#F59E0B' },
    { label: 'Punto de reorden', value: `${puntoReorden} ${repuesto.unidad}`, color: EAM_COLOR },
    { label: 'Valor en inventario', value: formatCOP(valorInventario), color: EAM_DARK },
    { label: 'Costo unitario', value: formatCOP(repuesto.costo_unit), color: '#3B82F6' },
    { label: 'Cobertura', value: cobertura === Infinity ? '—' : `${cobertura.toFixed(1)} meses`, color: '#8B5CF6' },
    { label: 'Consumo mensual', value: `${repuesto.consumo_mensual} ${repuesto.unidad}`, color: '#0EA5E9' },
    { label: 'Lead time', value: `${repuesto.lead_time_dias} días`, color: '#0F766E' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          bgcolor: '#FFFFFF',
          border: `1px solid ${alpha(EAM_COLOR, 0.3)}`,
          borderRadius: '16px',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          color: '#1E293B',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha(cColor, 0.12),
              color: cColor,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Inventory2Icon />
          </Box>
          <Box>
            <Typography fontSize={11} fontWeight={700} color="#64748B" fontFamily="monospace">
              {repuesto.codigo}
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
              {repuesto.nombre}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.75}>
              <Chip
                label={repuesto.categoria}
                size="small"
                icon={<CategoryIcon style={{ fontSize: 12, color: cColor }} />}
                sx={{ bgcolor: alpha(cColor, 0.14), color: cColor, fontWeight: 700, fontSize: 10, height: 20, border: `1px solid ${alpha(cColor, 0.4)}` }}
              />
              {isLow && (
                <Chip
                  label="BAJO STOCK"
                  size="small"
                  icon={<WarningIcon style={{ fontSize: 12, color: '#DC2626' }} />}
                  sx={{ bgcolor: alpha('#DC2626', 0.14), color: '#DC2626', fontWeight: 700, fontSize: 10, height: 20 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        {/* KPIs */}
        <Grid container spacing={1.5} mb={2}>
          {kpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
              <Paper
                elevation={0}
                sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5, textAlign: 'center' }}
              >
                <Typography fontSize={16} fontWeight={900} color={k.color} lineHeight={1.1} noWrap>
                  {k.value}
                </Typography>
                <Typography fontSize={10.5} color="#64748B" mt={0.5}>
                  {k.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Barra de nivel de stock vs punto de reorden */}
        <Box mb={2.5}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography fontSize={11} color="#64748B">
              Nivel de stock vs punto de reorden ({puntoReorden} {repuesto.unidad})
            </Typography>
            <Typography fontSize={11} fontWeight={700} color={isLow ? '#DC2626' : '#16A34A'}>
              {repuesto.stock_actual} {repuesto.unidad}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={nivelPct}
            sx={{
              height: 8,
              borderRadius: 5,
              bgcolor: '#F1F5F9',
              '& .MuiLinearProgress-bar': { bgcolor: isLow ? '#DC2626' : nivelPct < 130 ? '#F59E0B' : '#16A34A', borderRadius: 5 },
            }}
          />
        </Box>

        {/* Ficha */}
        <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <ReceiptLongIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            <Typography fontWeight={700} fontSize={13} color="#1E293B">
              Ficha del repuesto
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Código" value={repuesto.codigo} mono /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Unidad de medida" value={repuesto.unidad} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Ubicación en bodega" value={repuesto.ubicacion} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Proveedor principal" value={repuesto.proveedor_principal} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Último consumo" value={repuesto.ultimo_consumo} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Tiempo de entrega" value={`${repuesto.lead_time_dias} días`} /></Grid>
            <Grid size={{ xs: 12 }}>
              <DetalleField
                label="Compatibilidad"
                value={
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mt={0.5}>
                    {repuesto.compatibilidad.map((c) => (
                      <Chip key={c} label={c} size="small" sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontSize: 11, height: 22 }} />
                    ))}
                  </Stack>
                }
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Historial de consumos de este repuesto */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
              <Typography fontWeight={700} fontSize={13} color="#1E293B">
                Historial de consumos ({historial.length})
              </Typography>
            </Stack>
            <Typography fontSize={12} fontWeight={700} color="#16A34A">
              {formatCOP(totalConsumido)}
            </Typography>
          </Stack>
          {historial.length === 0 ? (
            <Typography fontSize={12} color="#94A3B8">
              Sin consumos registrados para este repuesto.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {historial.map((c, i) => (
                <Box
                  key={`${c.ot_relacionada}-${i}`}
                  onClick={() => onVerOT(c.ot_relacionada)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: '10px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.07) },
                  }}
                >
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                      <Typography fontSize={11} fontWeight={700} color={EAM_COLOR} fontFamily="monospace">
                        {c.ot_relacionada}
                      </Typography>
                      <Chip label={c.activo} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4338CA', fontSize: 9, height: 18 }} />
                    </Stack>
                    <Typography fontSize={12} color="#64748B">
                      {c.cantidad} {repuesto.unidad} · {c.fecha}
                    </Typography>
                  </Box>
                  <Typography fontSize={12} fontWeight={700} color="#16A34A" flexShrink={0}>
                    {formatCOP(c.costo)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          startIcon={<ShoppingCartIcon />}
          onClick={() => onGenerarOC(repuesto)}
          sx={{ bgcolor: EAM_COLOR, color: '#fff', fontWeight: 700, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: EAM_DARK } }}
        >
          Generar Orden de Compra
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Nuevo Repuesto (Dialog) ---

interface NuevoRepuestoDialogProps {
  open: boolean;
  repuestos: Repuesto[];
  onClose: () => void;
  onSave: (r: Repuesto) => void;
}

const EMPTY_FORM = {
  nombre: '',
  categoria: 'FILTROS',
  stock_actual: '',
  stock_minimo: '',
  costo_unit: '',
  proveedor_principal: '',
  unidad: 'UND',
  ubicacion: '',
  lead_time_dias: '',
  consumo_mensual: '',
};

// Unidades de medida disponibles en el catálogo
const UNIDADES = ['UND', 'JGO', 'GAL', 'LTR', 'MTR'];

// Prefijo de código autogenerado según la categoría
const CODIGO_PREFIX: Record<string, string> = {
  FILTROS: 'FIL',
  ACEITES: 'ACE',
  FRENOS: 'FRE',
  ELECTRICO: 'ELE',
  HIDRAULICO: 'HID',
  NEUMATICOS: 'NEU',
};

// Estilos de inputs (tema claro, acento EAM)
const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B', bgcolor: '#FFFFFF' },
  '& label': { color: '#64748B' },
  '& label.Mui-focused': { color: EAM_DARK },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.5)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EAM_COLOR },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
};

function NuevoRepuestoDialog({ open, repuestos, onClose, onSave }: NuevoRepuestoDialogProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  // Dominios derivados de los datos reales del inventario
  const proveedores = useMemo(
    () => Array.from(new Set(repuestos.map((r) => r.proveedor_principal))).filter(Boolean).sort(),
    [repuestos]
  );
  const ubicaciones = useMemo(
    () => Array.from(new Set(repuestos.map((r) => r.ubicacion))).filter(Boolean).sort(),
    [repuestos]
  );
  // Lead time típico por proveedor (autocompletado al elegir proveedor)
  const leadTimePorProveedor = useMemo(() => {
    const m: Record<string, number> = {};
    repuestos.forEach((r) => { if (!(r.proveedor_principal in m)) m[r.proveedor_principal] = r.lead_time_dias; });
    return m;
  }, [repuestos]);

  // Código autogenerado (derivado) a partir de la categoría + consecutivo existente
  const codigoSugerido = useMemo(() => {
    const prefix = CODIGO_PREFIX[form.categoria] ?? 'REP';
    const nums = repuestos
      .filter((r) => r.codigo.startsWith(`${prefix}-`))
      .map((r) => parseInt(r.codigo.split('-')[1] ?? '', 10))
      .filter((n) => !Number.isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${prefix}-${String(next).padStart(3, '0')}`;
  }, [form.categoria, repuestos]);

  const setField = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Al elegir proveedor, autocompletar el lead time típico
  const handleProveedor = (p: string) =>
    setForm((f) => ({
      ...f,
      proveedor_principal: p,
      lead_time_dias: leadTimePorProveedor[p] != null ? String(leadTimePorProveedor[p]) : f.lead_time_dias,
    }));

  const errNombre = form.nombre.trim() === '';
  const errProveedor = form.proveedor_principal === '';
  const errUbicacion = form.ubicacion === '';
  const errCosto = form.costo_unit === '' || Number(form.costo_unit) <= 0;
  const errStockActual = form.stock_actual === '';
  const errStockMinimo = form.stock_minimo === '';

  const valid = !errNombre && !errProveedor && !errUbicacion && !errCosto && !errStockActual && !errStockMinimo;

  const reset = () => { setForm({ ...EMPTY_FORM }); setTriedSubmit(false); };

  const handleSave = () => {
    if (!valid) {
      setTriedSubmit(true);
      setWarnOpen(true);
      return;
    }
    onSave({
      codigo: codigoSugerido,
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
      costo_unit: Number(form.costo_unit) || 0,
      proveedor_principal: form.proveedor_principal,
      ultimo_consumo: new Date().toISOString().slice(0, 10),
      unidad: form.unidad,
      ubicacion: form.ubicacion,
      lead_time_dias: Number(form.lead_time_dias) || 5,
      consumo_mensual: Number(form.consumo_mensual) || 0,
      compatibilidad: ['Flota general'],
    });
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddIcon sx={{ color: EAM_COLOR }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
                Nuevo Repuesto
              </Typography>
              <Typography fontSize={12} color="#64748B">
                Registre una nueva referencia en el inventario
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} size="small" sx={{ color: '#64748B' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Código"
                size="small"
                fullWidth
                value={codigoSugerido}
                InputProps={{ readOnly: true }}
                helperText="Generado por categoría"
                sx={{ ...inputSx, '& .MuiOutlinedInput-root': { color: '#2563EB', bgcolor: '#F8FAFC', fontFamily: 'monospace', fontWeight: 700 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Nombre *"
                size="small"
                fullWidth
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Ej. Filtro de aceite motor"
                error={triedSubmit && errNombre}
                helperText={triedSubmit && errNombre ? 'El nombre es obligatorio' : ' '}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Categoría"
                size="small"
                fullWidth
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
                helperText="Define el prefijo del código"
                sx={inputSx}
              >
                {CATEGORIAS.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                select
                label="Unidad"
                size="small"
                fullWidth
                value={form.unidad}
                onChange={(e) => setField('unidad', e.target.value)}
                helperText=" "
                sx={inputSx}
              >
                {UNIDADES.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Costo unit. *"
                size="small"
                fullWidth
                type="number"
                value={form.costo_unit}
                onChange={(e) => setField('costo_unit', e.target.value)}
                error={triedSubmit && errCosto}
                helperText={triedSubmit && errCosto ? 'Requerido' : ' '}
                InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={13} color="#94A3B8">$</Typography></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Stock actual *"
                size="small"
                fullWidth
                type="number"
                value={form.stock_actual}
                onChange={(e) => setField('stock_actual', e.target.value)}
                error={triedSubmit && errStockActual}
                helperText={triedSubmit && errStockActual ? 'Requerido' : ' '}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Stock mínimo *"
                size="small"
                fullWidth
                type="number"
                value={form.stock_minimo}
                onChange={(e) => setField('stock_minimo', e.target.value)}
                error={triedSubmit && errStockMinimo}
                helperText={triedSubmit && errStockMinimo ? 'Requerido' : ' '}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Consumo/mes"
                size="small"
                fullWidth
                type="number"
                value={form.consumo_mensual}
                onChange={(e) => setField('consumo_mensual', e.target.value)}
                helperText=" "
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Lead time (días)"
                size="small"
                fullWidth
                type="number"
                value={form.lead_time_dias}
                onChange={(e) => setField('lead_time_dias', e.target.value)}
                helperText="Se autocompleta"
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Proveedor principal *"
                size="small"
                fullWidth
                value={form.proveedor_principal}
                onChange={(e) => handleProveedor(e.target.value)}
                error={triedSubmit && errProveedor}
                helperText={triedSubmit && errProveedor ? 'Seleccione un proveedor' : 'Autocompleta el lead time'}
                sx={inputSx}
              >
                <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                {proveedores.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Ubicación en bodega *"
                size="small"
                fullWidth
                value={form.ubicacion}
                onChange={(e) => setField('ubicacion', e.target.value)}
                error={triedSubmit && errUbicacion}
                helperText={triedSubmit && errUbicacion ? 'Seleccione una ubicación' : ' '}
                sx={inputSx}
              >
                <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                {ubicaciones.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <Button onClick={handleClose} sx={{ color: '#64748B', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!valid}
            onClick={handleSave}
            sx={{ bgcolor: EAM_COLOR, color: '#fff', fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 3, '&:hover': { bgcolor: EAM_DARK } }}
          >
            Agregar Repuesto
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={warnOpen}
        autoHideDuration={3500}
        onClose={() => setWarnOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setWarnOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          Complete los campos obligatorios antes de guardar.
        </Alert>
      </Snackbar>
    </>
  );
}

// --- Tab: Repuestos ---

interface TabRepuestosProps {
  repuestos: Repuesto[];
  onSelect: (r: Repuesto) => void;
  onNuevo: () => void;
  onExport: () => void;
}

function TabRepuestos({ repuestos, onSelect, onNuevo, onExport }: TabRepuestosProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Todos');
  const [filterStock, setFilterStock] = useState('Todos');

  const filtered = useMemo(() => {
    return repuestos.filter((r) => {
      if (filterCat !== 'Todos' && r.categoria !== filterCat) return false;
      const isLow = r.stock_actual < r.stock_minimo;
      if (filterStock === 'Bajo' && !isLow) return false;
      if (filterStock === 'OK' && isLow) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !r.codigo.toLowerCase().includes(q) &&
          !r.nombre.toLowerCase().includes(q) &&
          !r.proveedor_principal.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [repuestos, search, filterCat, filterStock]);

  const valorTotal = filtered.reduce((acc, r) => acc + r.stock_actual * r.costo_unit, 0);
  const valorGlobal = repuestos.reduce((acc, r) => acc + r.stock_actual * r.costo_unit, 0);
  const bajosStock = repuestos.filter((r) => r.stock_actual < r.stock_minimo).length;
  const rotacion = repuestos.length
    ? (repuestos.reduce((a, r) => a + r.consumo_mensual, 0) * 12) /
      Math.max(1, repuestos.reduce((a, r) => a + r.stock_actual, 0))
    : 0;

  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<Inventory2Icon />} label="Total SKU" value={String(repuestos.length)} sub="referencias activas" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<PriceCheckIcon />} label="Valor Inventario" value={formatCOP(valorGlobal)} sub="costo promedio ponderado" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<WarningIcon />} label="Bajo Stock Mínimo" value={String(bajosStock)} sub="ítems requieren reorden" alert />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard icon={<TrendingDownIcon />} label="Rotación Anual" value={`${rotacion.toFixed(1)}x`} sub="estimado por consumo" />
        </Grid>
      </Grid>

      {/* Toolbar: búsqueda + filtros + acciones */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar código, nombre o proveedor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
        <TextField select size="small" label="Categoría" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} sx={{ minWidth: 160 }}>
          {['Todos', ...CATEGORIAS].map((o) => (
            <MenuItem key={o} value={o}>{o}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Stock" value={filterStock} onChange={(e) => setFilterStock(e.target.value)} sx={{ minWidth: 150 }}>
          {[
            { v: 'Todos', l: 'Todos' },
            { v: 'Bajo', l: 'Bajo mínimo' },
            { v: 'OK', l: 'En nivel' },
          ].map((o) => (
            <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>
          ))}
        </TextField>
        <Tooltip title="Exportar a CSV">
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={onExport}
            sx={{ borderColor: '#CBD5E1', color: '#475569', textTransform: 'none', borderRadius: 2 }}
          >
            Exportar
          </Button>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNuevo}
          sx={{ bgcolor: EAM_COLOR, color: '#fff', fontWeight: 700, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: EAM_DARK } }}
        >
          Nuevo Repuesto
        </Button>
      </Stack>

      <Typography fontSize={12} color="#94A3B8" mb={1}>
        {filtered.length} repuesto{filtered.length !== 1 ? 's' : ''} · haz clic en una fila para ver su detalle
      </Typography>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #E5E7EB' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid #E5E7EB' } }}>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Stock Actual</TableCell>
              <TableCell align="right">Stock Mínimo</TableCell>
              <TableCell align="right">Costo Unit.</TableCell>
              <TableCell align="right">Valor Total</TableCell>
              <TableCell>Proveedor Principal</TableCell>
              <TableCell>Último Consumo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => {
              const isLow = r.stock_actual < r.stock_minimo;
              return (
                <TableRow
                  key={r.codigo}
                  onClick={() => onSelect(r)}
                  sx={{
                    cursor: 'pointer',
                    '& td': { color: '#334155', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' },
                    bgcolor: isLow ? `${EAM_COLOR}0A` : 'transparent',
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.08) },
                  }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', color: '#2563EB !important' }}>{r.codigo}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {r.nombre}
                      {isLow && (
                        <Chip
                          label="Bajo Stock"
                          size="small"
                          sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, fontSize: '0.65rem', height: 18, border: `1px solid ${EAM_COLOR}55` }}
                          icon={<WarningIcon style={{ fontSize: 11, color: EAM_COLOR }} />}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.categoria}
                      size="small"
                      sx={{ bgcolor: `${catColor(r.categoria)}22`, color: catColor(r.categoria), fontSize: '0.65rem', height: 18, border: `1px solid ${catColor(r.categoria)}44` }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: isLow ? `${EAM_COLOR} !important` : '#1E293B !important' }}>
                    {r.stock_actual}
                  </TableCell>
                  <TableCell align="right">{r.stock_minimo}</TableCell>
                  <TableCell align="right">{formatCOP(r.costo_unit)}</TableCell>
                  <TableCell align="right" sx={{ color: '#16A34A !important' }}>{formatCOP(r.stock_actual * r.costo_unit)}</TableCell>
                  <TableCell>{r.proveedor_principal}</TableCell>
                  <TableCell sx={{ color: '#64748B !important' }}>{r.ultimo_consumo}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#94A3B8 !important' }}>
                  No se encontraron repuestos con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Box sx={{ p: 1.5, borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Valor total en filtro:{' '}
            <strong style={{ color: '#16A34A' }}>{formatCOP(valorTotal)}</strong>
          </Typography>
        </Box>
      </TableContainer>
    </Box>
  );
}

// --- Tab: Consumos ---

function TabConsumos({ onVerOT }: { onVerOT: (numero: string) => void }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return CONSUMOS;
    const q = search.toLowerCase();
    return CONSUMOS.filter(
      (c) => c.repuesto.toLowerCase().includes(q) || c.activo.toLowerCase().includes(q) || c.ot_relacionada.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} mb={2}>
        <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 600 }}>
          Registro de Consumos de Repuestos
        </Typography>
        <TextField
          size="small"
          placeholder="Buscar repuesto, activo u OT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
      </Stack>
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #E5E7EB' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid #E5E7EB' } }}>
              <TableCell>Repuesto</TableCell>
              <TableCell>OT Relacionada</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Costo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((c, idx) => (
              <TableRow
                key={idx}
                onClick={() => onVerOT(c.ot_relacionada)}
                sx={{
                  cursor: 'pointer',
                  '& td': { color: '#334155', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' },
                  '&:hover': { bgcolor: alpha(EAM_COLOR, 0.08) },
                }}
              >
                <TableCell>{c.repuesto}</TableCell>
                <TableCell>
                  <Chip
                    label={c.ot_relacionada}
                    size="small"
                    sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontSize: '0.7rem', height: 20, fontFamily: 'monospace' }}
                  />
                </TableCell>
                <TableCell>{c.activo}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#1E293B !important' }}>{c.cantidad}</TableCell>
                <TableCell sx={{ color: '#64748B !important' }}>{c.fecha}</TableCell>
                <TableCell align="right" sx={{ color: '#16A34A !important', fontWeight: 600 }}>{formatCOP(c.costo)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#94A3B8 !important' }}>
                  Sin consumos que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Box sx={{ p: 1.5, borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Total consumido en período:{' '}
            <strong style={{ color: '#16A34A' }}>{formatCOP(filtered.reduce((a, c) => a + c.costo, 0))}</strong>
          </Typography>
        </Box>
      </TableContainer>
    </Box>
  );
}

// --- Tab: Reorden ---

interface TabReordenProps {
  items: ItemReorden[];
  onSelectItem: (i: ItemReorden) => void;
  onGenerarTodo: (items: ItemReorden[]) => void;
}

function TabReorden({ items, onSelectItem, onGenerarTodo }: TabReordenProps) {
  const totalEstimado = items.reduce((a, i) => a + i.costo_estimado, 0);

  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#1E293B', mb: 2, fontWeight: 600 }}>
        Ítems que Requieren Reorden
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${EAM_COLOR}55`, mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', borderBottom: `1px solid ${EAM_COLOR}33` } }}>
              <TableCell>Nombre</TableCell>
              <TableCell align="right">Stock Actual</TableCell>
              <TableCell align="right">Stock Mínimo</TableCell>
              <TableCell align="right">Cantidad Sugerida</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell align="right">Costo Estimado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => {
              const deficit = item.stock_minimo - item.stock_actual;
              const urgency = deficit >= 6 ? 'high' : deficit >= 3 ? 'medium' : 'low';
              const urgencyColor = urgency === 'high' ? '#EF4444' : urgency === 'medium' ? EAM_COLOR : '#F59E0B';
              return (
                <TableRow
                  key={idx}
                  onClick={() => onSelectItem(item)}
                  sx={{
                    cursor: 'pointer',
                    '& td': { color: '#334155', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' },
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.08) },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon sx={{ fontSize: 14, color: urgencyColor }} />
                      <Typography variant="body2" sx={{ color: '#1E293B' }}>{item.nombre}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: `${urgencyColor} !important`, fontWeight: 700 }}>{item.stock_actual}</TableCell>
                  <TableCell align="right">{item.stock_minimo}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={item.cantidad_sugerida}
                      size="small"
                      sx={{ bgcolor: `${EAM_COLOR}22`, color: EAM_COLOR, fontWeight: 700, border: `1px solid ${EAM_COLOR}55`, minWidth: 36 }}
                    />
                  </TableCell>
                  <TableCell>{item.proveedor}</TableCell>
                  <TableCell align="right" sx={{ color: '#16A34A !important', fontWeight: 600 }}>{formatCOP(item.costo_estimado)}</TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#16A34A !important' }}>
                  Todo el inventario está por encima del nivel mínimo. No hay reórdenes pendientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Card */}
      <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${EAM_COLOR}`, borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
            <Grid size={{ xs: 12, md: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>
                Total Estimado de Compra
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: EAM_COLOR, letterSpacing: '-0.5px' }}>
                {formatCOP(totalEstimado)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                {items.length} ítems · generado {new Date().toLocaleDateString('es-CO')}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 'auto' }}>
              <Button
                variant="contained"
                startIcon={<ShoppingCartIcon />}
                disabled={items.length === 0}
                onClick={() => onGenerarTodo(items)}
                sx={{ bgcolor: EAM_COLOR, color: '#fff', fontWeight: 700, px: 3, py: 1.2, borderRadius: 2, textTransform: 'none', fontSize: '0.95rem', '&:hover': { bgcolor: EAM_DARK } }}
              >
                Generar Orden de Compra
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ borderColor: '#E5E7EB' }} />
      <Typography variant="caption" sx={{ color: '#475569', mt: 1, display: 'block' }}>
        * Las cantidades sugeridas se calculan con base en consumo promedio mensual + cobertura de 30 días. Haz clic en un ítem para revisar su detalle.
      </Typography>
    </Box>
  );
}

// --- Detalle de ítem de reorden (Dialog) ---

interface ReordenDetalleProps {
  item: ItemReorden | null;
  repuestos: Repuesto[];
  onClose: () => void;
  onGenerarOC: (i: ItemReorden) => void;
  onVerOT: (numero: string) => void;
}

function ReordenDetalleDialog({ item, repuestos, onClose, onGenerarOC, onVerOT }: ReordenDetalleProps) {
  const open = !!item;
  const rep = useMemo(
    () => (item ? repuestos.find((r) => r.nombre === item.nombre) ?? null : null),
    [item, repuestos]
  );
  const historial = useMemo(
    () => (item ? CONSUMOS.filter((c) => c.repuesto === item.nombre) : []),
    [item]
  );

  if (!item) {
    return <Dialog open={open} onClose={onClose} />;
  }

  const deficit = Math.max(0, item.stock_minimo - item.stock_actual);
  const consumoMensual = rep?.consumo_mensual ?? 0;
  const leadTime = rep?.lead_time_dias ?? 0;
  const diasCobertura = consumoMensual > 0 ? Math.round((item.stock_actual / consumoMensual) * 30) : Infinity;
  const urgency = deficit >= 6 ? 'ALTA' : deficit >= 3 ? 'MEDIA' : 'BAJA';
  const urgencyColor = urgency === 'ALTA' ? '#DC2626' : urgency === 'MEDIA' ? EAM_COLOR : '#F59E0B';
  const cColor = rep ? catColor(rep.categoria) : '#334155';

  const kpis = [
    { label: 'Stock actual', value: `${item.stock_actual}${rep ? ' ' + rep.unidad : ''}`, color: '#DC2626' },
    { label: 'Stock mínimo', value: `${item.stock_minimo}${rep ? ' ' + rep.unidad : ''}`, color: '#F59E0B' },
    { label: 'Déficit', value: `${deficit}${rep ? ' ' + rep.unidad : ''}`, color: urgencyColor },
    { label: 'Cant. sugerida', value: `${item.cantidad_sugerida}${rep ? ' ' + rep.unidad : ''}`, color: EAM_COLOR },
    { label: 'Costo estimado', value: formatCOP(item.costo_estimado), color: EAM_DARK },
    { label: 'Cobertura', value: diasCobertura === Infinity ? '—' : `${diasCobertura} días`, color: '#8B5CF6' },
    { label: 'Lead time', value: rep ? `${leadTime} días` : '—', color: '#0F766E' },
    { label: 'Consumo/mes', value: rep ? `${consumoMensual} ${rep.unidad}` : '—', color: '#0EA5E9' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(urgencyColor, 0.12), color: urgencyColor, display: 'flex', alignItems: 'center' }}>
            <WarningIcon />
          </Box>
          <Box>
            <Typography fontSize={11} fontWeight={700} color="#64748B" fontFamily="monospace">
              {rep ? rep.codigo : 'REORDEN'}
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
              {item.nombre}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.75}>
              <Chip
                label={`URGENCIA ${urgency}`}
                size="small"
                sx={{ bgcolor: alpha(urgencyColor, 0.14), color: urgencyColor, fontWeight: 700, fontSize: 10, height: 20, border: `1px solid ${alpha(urgencyColor, 0.4)}` }}
              />
              {rep && (
                <Chip
                  label={rep.categoria}
                  size="small"
                  icon={<CategoryIcon style={{ fontSize: 12, color: cColor }} />}
                  sx={{ bgcolor: alpha(cColor, 0.14), color: cColor, fontWeight: 700, fontSize: 10, height: 20 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        <Grid container spacing={1.5} mb={2}>
          {kpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
              <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '10px', p: 1.5, textAlign: 'center' }}>
                <Typography fontSize={15} fontWeight={900} color={k.color} lineHeight={1.1} noWrap>
                  {k.value}
                </Typography>
                <Typography fontSize={10.5} color="#64748B" mt={0.5}>
                  {k.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Barra déficit */}
        <Box mb={2.5}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography fontSize={11} color="#64748B">
              Cobertura respecto al mínimo requerido
            </Typography>
            <Typography fontSize={11} fontWeight={700} color={urgencyColor}>
              {item.stock_actual} / {item.stock_minimo}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (item.stock_actual / Math.max(1, item.stock_minimo)) * 100)}
            sx={{
              height: 8,
              borderRadius: 5,
              bgcolor: '#F1F5F9',
              '& .MuiLinearProgress-bar': { bgcolor: urgencyColor, borderRadius: 5 },
            }}
          />
        </Box>

        {/* Ficha de suministro */}
        <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <ReceiptLongIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            <Typography fontWeight={700} fontSize={13} color="#1E293B">
              Datos de suministro
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Proveedor" value={item.proveedor} /></Grid>
            {rep && <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Ubicación en bodega" value={rep.ubicacion} /></Grid>}
            {rep && <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Costo unitario" value={formatCOP(rep.costo_unit)} /></Grid>}
            {rep && <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Tiempo de entrega" value={`${rep.lead_time_dias} días`} /></Grid>}
            {rep && <Grid size={{ xs: 6, sm: 4 }}><DetalleField label="Último consumo" value={rep.ultimo_consumo} /></Grid>}
            <Grid size={{ xs: 6, sm: 4 }}>
              <DetalleField
                label="Recomendación"
                value={
                  diasCobertura === Infinity
                    ? 'Reponer al nivel mínimo'
                    : diasCobertura <= leadTime
                    ? 'Reorden URGENTE (stock < lead time)'
                    : 'Programar compra'
                }
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Historial de consumos */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <HistoryIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
            <Typography fontWeight={700} fontSize={13} color="#1E293B">
              Historial de consumos ({historial.length})
            </Typography>
          </Stack>
          {historial.length === 0 ? (
            <Typography fontSize={12} color="#94A3B8">
              Sin consumos registrados para este ítem.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {historial.map((c, i) => (
                <Box
                  key={`${c.ot_relacionada}-${i}`}
                  onClick={() => onVerOT(c.ot_relacionada)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: '10px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                    '&:hover': { bgcolor: alpha(EAM_COLOR, 0.07) },
                  }}
                >
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                      <Typography fontSize={11} fontWeight={700} color={EAM_COLOR} fontFamily="monospace">
                        {c.ot_relacionada}
                      </Typography>
                      <Chip label={c.activo} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4338CA', fontSize: 9, height: 18 }} />
                    </Stack>
                    <Typography fontSize={12} color="#64748B">
                      {c.cantidad}{rep ? ' ' + rep.unidad : ''} · {c.fecha}
                    </Typography>
                  </Box>
                  <Typography fontSize={12} fontWeight={700} color="#16A34A" flexShrink={0}>
                    {formatCOP(c.costo)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          startIcon={<ShoppingCartIcon />}
          onClick={() => onGenerarOC(item)}
          sx={{ bgcolor: EAM_COLOR, color: '#fff', fontWeight: 700, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: EAM_DARK } }}
        >
          Generar Orden de Compra
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Confirmación de Orden de Compra (Dialog) ---

interface OCState {
  open: boolean;
  proveedor: string;
  lineas: { nombre: string; cantidad: number; costo: number }[];
  total: number;
}

function OrdenCompraDialog({ state, onClose, onConfirm }: { state: OCState; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E293B' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalShippingIcon sx={{ color: EAM_COLOR }} />
          <Typography variant="h6" fontWeight={800} color="#1E293B">
            Confirmar Orden de Compra
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        <Typography fontSize={12} color="#64748B" mb={0.5}>
          Proveedor
        </Typography>
        <Typography fontSize={15} fontWeight={700} color="#1E293B" mb={2}>
          {state.proveedor}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { color: '#64748B', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid #E5E7EB' } }}>
              <TableCell>Ítem</TableCell>
              <TableCell align="right">Cant.</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {state.lineas.map((l, i) => (
              <TableRow key={i} sx={{ '& td': { color: '#334155', fontSize: '0.8rem', borderBottom: '1px solid #F1F5F9' } }}>
                <TableCell>{l.nombre}</TableCell>
                <TableCell align="right">{l.cantidad}</TableCell>
                <TableCell align="right" sx={{ color: '#16A34A !important', fontWeight: 600 }}>{formatCOP(l.costo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} p={1.5} sx={{ bgcolor: alpha(EAM_COLOR, 0.08), borderRadius: 2 }}>
          <Typography fontWeight={700} color="#1E293B">Total OC</Typography>
          <Typography variant="h6" fontWeight={800} color={EAM_DARK}>{formatCOP(state.total)}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckCircleIcon />}
          onClick={onConfirm}
          sx={{ bgcolor: EAM_COLOR, color: '#fff', fontWeight: 700, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: EAM_DARK } }}
        >
          Emitir Orden
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Main Component ---

export default function EAMInventario() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const [repuestos, setRepuestos] = useState<Repuesto[]>(REPUESTOS_INIT);

  // Reorden derivado dinámicamente de los repuestos bajo mínimo
  const itemsReorden = useMemo<ItemReorden[]>(() => {
    return repuestos
      .filter((r) => r.stock_actual < r.stock_minimo)
      .map((r) => {
        const sugerida = Math.max(r.stock_minimo - r.stock_actual, Math.ceil(r.consumo_mensual));
        return {
          nombre: r.nombre,
          stock_actual: r.stock_actual,
          stock_minimo: r.stock_minimo,
          cantidad_sugerida: sugerida,
          proveedor: r.proveedor_principal,
          costo_estimado: sugerida * r.costo_unit,
        };
      });
  }, [repuestos]);
  // Reemplaza el uso de ITEMS_REORDEN_INIT (mantenido como fallback si no hay repuestos bajos)
  const itemsReordenFinal = itemsReorden.length > 0 ? itemsReorden : ITEMS_REORDEN_INIT.filter((i) => i.stock_actual < i.stock_minimo);

  const [detalle, setDetalle] = useState<Repuesto | null>(null);
  const [reordenDetalle, setReordenDetalle] = useState<ItemReorden | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [oc, setOc] = useState<OCState>({ open: false, proveedor: '', lineas: [], total: 0 });
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'info' }>({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg: string, severity: 'success' | 'info' = 'success') => setSnack({ open: true, msg, severity });

  const handleAddRepuesto = (r: Repuesto) => {
    setRepuestos((prev) => [r, ...prev]);
    setNuevoOpen(false);
    showSnack(`Repuesto ${r.codigo} — ${r.nombre} agregado al inventario`);
  };

  const handleExport = () => {
    showSnack(`Inventario exportado a CSV (${repuestos.length} referencias)`, 'info');
  };

  const handleVerOT = (numero: string) => {
    navigate(`/eam/ordenes-trabajo?ot=${encodeURIComponent(numero)}`);
  };

  // Abrir OC desde el detalle de un repuesto individual
  const handleGenerarOCRepuesto = (r: Repuesto) => {
    const sugerida = Math.max(r.stock_minimo - r.stock_actual, Math.ceil(r.consumo_mensual), 1);
    setOc({
      open: true,
      proveedor: r.proveedor_principal,
      lineas: [{ nombre: r.nombre, cantidad: sugerida, costo: sugerida * r.costo_unit }],
      total: sugerida * r.costo_unit,
    });
    setDetalle(null);
  };

  // Generar OC desde un ítem de reorden (cierra el detalle si estaba abierto)
  const handleGenerarOCItem = (i: ItemReorden) => {
    setReordenDetalle(null);
    setOc({
      open: true,
      proveedor: i.proveedor,
      lineas: [{ nombre: i.nombre, cantidad: i.cantidad_sugerida, costo: i.costo_estimado }],
      total: i.costo_estimado,
    });
  };

  // Abrir OC consolidada de todos los ítems de reorden
  const handleGenerarOCTodo = (items: ItemReorden[]) => {
    const lineas = items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad_sugerida, costo: i.costo_estimado }));
    setOc({
      open: true,
      proveedor: 'Múltiples proveedores',
      lineas,
      total: items.reduce((a, i) => a + i.costo_estimado, 0),
    });
  };

  const handleConfirmOC = () => {
    const total = oc.total;
    setOc((prev) => ({ ...prev, open: false }));
    showSnack(`Orden de compra emitida por ${formatCOP(total)}`);
  };

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${EAM_COLOR}22`,
              border: `1px solid ${EAM_COLOR}55`,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Inventory2Icon sx={{ color: EAM_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
              EAM — Inventario de Repuestos
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              ICOLTRANS · Control de Materiales y Repuestos
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 2, border: '1px solid #E5E7EB', mb: 3, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_e, v: number) => setActiveTab(v)}
            sx={{
              px: 2,
              borderBottom: '1px solid #E5E7EB',
              '& .MuiTab-root': {
                color: '#64748B',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                minHeight: 48,
                '&.Mui-selected': { color: EAM_COLOR, fontWeight: 700 },
              },
              '& .MuiTabs-indicator': { bgcolor: EAM_COLOR, height: 3, borderRadius: 2 },
            }}
          >
            <Tab label="Repuestos" icon={<Inventory2Icon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Consumos" icon={<TrendingDownIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Reorden" icon={<WarningIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <TabRepuestos
                repuestos={repuestos}
                onSelect={setDetalle}
                onNuevo={() => setNuevoOpen(true)}
                onExport={handleExport}
              />
            )}
            {activeTab === 1 && <TabConsumos onVerOT={handleVerOT} />}
            {activeTab === 2 && (
              <TabReorden items={itemsReordenFinal} onSelectItem={setReordenDetalle} onGenerarTodo={handleGenerarOCTodo} />
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <RepuestoDetalleDialog
        repuesto={detalle}
        onClose={() => setDetalle(null)}
        onGenerarOC={handleGenerarOCRepuesto}
        onVerOT={handleVerOT}
      />
      <ReordenDetalleDialog
        item={reordenDetalle}
        repuestos={repuestos}
        onClose={() => setReordenDetalle(null)}
        onGenerarOC={handleGenerarOCItem}
        onVerOT={handleVerOT}
      />
      <NuevoRepuestoDialog open={nuevoOpen} repuestos={repuestos} onClose={() => setNuevoOpen(false)} onSave={handleAddRepuesto} />
      <OrdenCompraDialog state={oc} onClose={() => setOc((prev) => ({ ...prev, open: false }))} onConfirm={handleConfirmOC} />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ bgcolor: snack.severity === 'success' ? EAM_COLOR : '#2563EB', color: '#fff', fontWeight: 600 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
