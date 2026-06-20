import { useState } from 'react';
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
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningIcon from '@mui/icons-material/Warning';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const EAM_COLOR = '#EA580C';
const CARD_BG = '#0F1E35';
const DARK_BG = '#060C1A';

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

// --- Mock Data ---

const REPUESTOS: Repuesto[] = [
  {
    codigo: 'FIL-001',
    nombre: 'Filtro de Aceite Motor',
    categoria: 'FILTROS',
    stock_actual: 8,
    stock_minimo: 15,
    costo_unit: 45000,
    proveedor_principal: 'Auteco S.A.',
    ultimo_consumo: '2024-06-10',
  },
  {
    codigo: 'ACE-002',
    nombre: 'Aceite Motor 15W40 x 4L',
    categoria: 'ACEITES',
    stock_actual: 22,
    stock_minimo: 20,
    costo_unit: 95000,
    proveedor_principal: 'Mobil Colombia',
    ultimo_consumo: '2024-06-12',
  },
  {
    codigo: 'FRE-003',
    nombre: 'Pastillas de Freno Delanteras',
    categoria: 'FRENOS',
    stock_actual: 4,
    stock_minimo: 10,
    costo_unit: 185000,
    proveedor_principal: 'Frenosa Ltda.',
    ultimo_consumo: '2024-06-08',
  },
  {
    codigo: 'ELE-004',
    nombre: 'Batería 12V 90Ah',
    categoria: 'ELECTRICO',
    stock_actual: 3,
    stock_minimo: 6,
    costo_unit: 520000,
    proveedor_principal: 'Baterías Mac',
    ultimo_consumo: '2024-06-05',
  },
  {
    codigo: 'HID-005',
    nombre: 'Manguera Hidráulica 1/2" x 1m',
    categoria: 'HIDRAULICO',
    stock_actual: 14,
    stock_minimo: 10,
    costo_unit: 78000,
    proveedor_principal: 'Hidráulicos del Valle',
    ultimo_consumo: '2024-06-11',
  },
  {
    codigo: 'NEU-006',
    nombre: 'Llanta 11R22.5',
    categoria: 'NEUMATICOS',
    stock_actual: 6,
    stock_minimo: 8,
    costo_unit: 1850000,
    proveedor_principal: 'Michelin Colombia',
    ultimo_consumo: '2024-06-03',
  },
  {
    codigo: 'FIL-007',
    nombre: 'Filtro de Aire Motor',
    categoria: 'FILTROS',
    stock_actual: 18,
    stock_minimo: 12,
    costo_unit: 62000,
    proveedor_principal: 'Auteco S.A.',
    ultimo_consumo: '2024-05-28',
  },
  {
    codigo: 'ACE-008',
    nombre: 'Aceite Transmisión 80W90 x 1L',
    categoria: 'ACEITES',
    stock_actual: 30,
    stock_minimo: 18,
    costo_unit: 38000,
    proveedor_principal: 'Mobil Colombia',
    ultimo_consumo: '2024-06-09',
  },
  {
    codigo: 'FRE-009',
    nombre: 'Disco de Freno Posterior',
    categoria: 'FRENOS',
    stock_actual: 2,
    stock_minimo: 8,
    costo_unit: 320000,
    proveedor_principal: 'Frenosa Ltda.',
    ultimo_consumo: '2024-06-01',
  },
  {
    codigo: 'ELE-010',
    nombre: 'Alternador 24V 80A',
    categoria: 'ELECTRICO',
    stock_actual: 1,
    stock_minimo: 3,
    costo_unit: 1240000,
    proveedor_principal: 'Eléctricos Bogotá',
    ultimo_consumo: '2024-05-22',
  },
  {
    codigo: 'HID-011',
    nombre: 'Bomba Hidráulica Dirección',
    categoria: 'HIDRAULICO',
    stock_actual: 2,
    stock_minimo: 2,
    costo_unit: 2100000,
    proveedor_principal: 'Hidráulicos del Valle',
    ultimo_consumo: '2024-05-30',
  },
  {
    codigo: 'FIL-012',
    nombre: 'Filtro Combustible Diesel',
    categoria: 'FILTROS',
    stock_actual: 10,
    stock_minimo: 20,
    costo_unit: 55000,
    proveedor_principal: 'Auteco S.A.',
    ultimo_consumo: '2024-06-13',
  },
];

const CONSUMOS: Consumo[] = [
  {
    repuesto: 'Filtro de Aceite Motor',
    ot_relacionada: 'OT-2024-0891',
    activo: 'Tracto TK-112',
    cantidad: 2,
    fecha: '2024-06-10',
    costo: 90000,
  },
  {
    repuesto: 'Aceite Motor 15W40 x 4L',
    ot_relacionada: 'OT-2024-0892',
    activo: 'Tracto TK-105',
    cantidad: 3,
    fecha: '2024-06-12',
    costo: 285000,
  },
  {
    repuesto: 'Pastillas de Freno Delanteras',
    ot_relacionada: 'OT-2024-0880',
    activo: 'Camión CM-047',
    cantidad: 1,
    fecha: '2024-06-08',
    costo: 185000,
  },
  {
    repuesto: 'Batería 12V 90Ah',
    ot_relacionada: 'OT-2024-0875',
    activo: 'Camión CM-033',
    cantidad: 1,
    fecha: '2024-06-05',
    costo: 520000,
  },
  {
    repuesto: 'Filtro Combustible Diesel',
    ot_relacionada: 'OT-2024-0893',
    activo: 'Tracto TK-119',
    cantidad: 2,
    fecha: '2024-06-13',
    costo: 110000,
  },
  {
    repuesto: 'Llanta 11R22.5',
    ot_relacionada: 'OT-2024-0868',
    activo: 'Tracto TK-098',
    cantidad: 2,
    fecha: '2024-06-03',
    costo: 3700000,
  },
  {
    repuesto: 'Manguera Hidráulica 1/2" x 1m',
    ot_relacionada: 'OT-2024-0885',
    activo: 'Montacargas MC-07',
    cantidad: 3,
    fecha: '2024-06-11',
    costo: 234000,
  },
  {
    repuesto: 'Filtro de Aire Motor',
    ot_relacionada: 'OT-2024-0855',
    activo: 'Tracto TK-088',
    cantidad: 1,
    fecha: '2024-05-28',
    costo: 62000,
  },
  {
    repuesto: 'Disco de Freno Posterior',
    ot_relacionada: 'OT-2024-0862',
    activo: 'Camión CM-021',
    cantidad: 2,
    fecha: '2024-06-01',
    costo: 640000,
  },
  {
    repuesto: 'Alternador 24V 80A',
    ot_relacionada: 'OT-2024-0840',
    activo: 'Tracto TK-074',
    cantidad: 1,
    fecha: '2024-05-22',
    costo: 1240000,
  },
];

const ITEMS_REORDEN: ItemReorden[] = [
  {
    nombre: 'Filtro de Aceite Motor',
    stock_actual: 8,
    stock_minimo: 15,
    cantidad_sugerida: 20,
    proveedor: 'Auteco S.A.',
    costo_estimado: 900000,
  },
  {
    nombre: 'Pastillas de Freno Delanteras',
    stock_actual: 4,
    stock_minimo: 10,
    cantidad_sugerida: 12,
    proveedor: 'Frenosa Ltda.',
    costo_estimado: 2220000,
  },
  {
    nombre: 'Batería 12V 90Ah',
    stock_actual: 3,
    stock_minimo: 6,
    cantidad_sugerida: 6,
    proveedor: 'Baterías Mac',
    costo_estimado: 3120000,
  },
  {
    nombre: 'Llanta 11R22.5',
    stock_actual: 6,
    stock_minimo: 8,
    cantidad_sugerida: 8,
    proveedor: 'Michelin Colombia',
    costo_estimado: 14800000,
  },
  {
    nombre: 'Disco de Freno Posterior',
    stock_actual: 2,
    stock_minimo: 8,
    cantidad_sugerida: 10,
    proveedor: 'Frenosa Ltda.',
    costo_estimado: 3200000,
  },
  {
    nombre: 'Alternador 24V 80A',
    stock_actual: 1,
    stock_minimo: 3,
    cantidad_sugerida: 4,
    proveedor: 'Eléctricos Bogotá',
    costo_estimado: 4960000,
  },
  {
    nombre: 'Filtro Combustible Diesel',
    stock_actual: 10,
    stock_minimo: 20,
    cantidad_sugerida: 24,
    proveedor: 'Auteco S.A.',
    costo_estimado: 1320000,
  },
  {
    nombre: 'Aceite Transmisión 80W90 x 1L',
    stock_actual: 30,
    stock_minimo: 18,
    cantidad_sugerida: 0,
    proveedor: 'Mobil Colombia',
    costo_estimado: 0,
  },
];

// Filter only items that truly need reorder
const ITEMS_REORDEN_FILTERED = ITEMS_REORDEN.filter(
  (i) => i.stock_actual < i.stock_minimo
);

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
        bgcolor: CARD_BG,
        border: `1px solid ${alert ? EAM_COLOR : '#1E3A5F'}`,
        borderRadius: 2,
        height: '100%',
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: alert ? `${EAM_COLOR}22` : '#1E3A5F',
            color: alert ? EAM_COLOR : '#60A5FA',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            {label}
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: alert ? EAM_COLOR : '#F1F5F9', lineHeight: 1.2 }}
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

// --- Tab Panels ---

function TabRepuestos() {
  const valorTotal = REPUESTOS.reduce(
    (acc, r) => acc + r.stock_actual * r.costo_unit,
    0
  );
  const bajosStock = REPUESTOS.filter(
    (r) => r.stock_actual < r.stock_minimo
  ).length;

  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<Inventory2Icon />}
            label="Total SKU"
            value="324"
            sub="referencias activas"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<CheckCircleIcon />}
            label="Valor Inventario"
            value="$284M"
            sub="costo promedio ponderado"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<WarningIcon />}
            label="Bajo Stock Mínimo"
            value={String(bajosStock)}
            sub="ítems requieren reorden"
            alert
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<TrendingDownIcon />}
            label="Rotación Promedio"
            value="3.2x"
            sub="últimos 12 meses"
          />
        </Grid>
      </Grid>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{ bgcolor: CARD_BG, borderRadius: 2, border: '1px solid #1E3A5F' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#0A1628', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid #1E3A5F' } }}>
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
            {REPUESTOS.map((r) => {
              const isLow = r.stock_actual < r.stock_minimo;
              return (
                <TableRow
                  key={r.codigo}
                  sx={{
                    '& td': {
                      color: '#CBD5E1',
                      fontSize: '0.8rem',
                      borderBottom: '1px solid #0F2035',
                    },
                    bgcolor: isLow ? `${EAM_COLOR}0A` : 'transparent',
                    '&:hover': { bgcolor: '#0A1A30' },
                  }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', color: '#60A5FA !important' }}>
                    {r.codigo}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {r.nombre}
                      {isLow && (
                        <Chip
                          label="Bajo Stock"
                          size="small"
                          sx={{
                            bgcolor: `${EAM_COLOR}22`,
                            color: EAM_COLOR,
                            fontSize: '0.65rem',
                            height: 18,
                            border: `1px solid ${EAM_COLOR}55`,
                          }}
                          icon={<WarningIcon style={{ fontSize: 11, color: EAM_COLOR }} />}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.categoria}
                      size="small"
                      sx={{
                        bgcolor: `${CATEGORIA_COLORS[r.categoria] ?? '#334155'}22`,
                        color: CATEGORIA_COLORS[r.categoria] ?? '#94A3B8',
                        fontSize: '0.65rem',
                        height: 18,
                        border: `1px solid ${CATEGORIA_COLORS[r.categoria] ?? '#334155'}44`,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: isLow ? `${EAM_COLOR} !important` : '#F1F5F9 !important' }}>
                    {r.stock_actual}
                  </TableCell>
                  <TableCell align="right">{r.stock_minimo}</TableCell>
                  <TableCell align="right">{formatCOP(r.costo_unit)}</TableCell>
                  <TableCell align="right" sx={{ color: '#34D399 !important' }}>
                    {formatCOP(r.stock_actual * r.costo_unit)}
                  </TableCell>
                  <TableCell>{r.proveedor_principal}</TableCell>
                  <TableCell sx={{ color: '#64748B !important' }}>{r.ultimo_consumo}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Box sx={{ p: 1.5, borderTop: '1px solid #1E3A5F', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            Valor total en muestra:{' '}
            <strong style={{ color: '#34D399' }}>{formatCOP(valorTotal)}</strong>
          </Typography>
        </Box>
      </TableContainer>
    </Box>
  );
}

function TabConsumos() {
  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#F1F5F9', mb: 2, fontWeight: 600 }}>
        Registro de Consumos de Repuestos
      </Typography>
      <TableContainer
        component={Paper}
        sx={{ bgcolor: CARD_BG, borderRadius: 2, border: '1px solid #1E3A5F' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#0A1628', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid #1E3A5F' } }}>
              <TableCell>Repuesto</TableCell>
              <TableCell>OT Relacionada</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Costo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CONSUMOS.map((c, idx) => (
              <TableRow
                key={idx}
                sx={{
                  '& td': {
                    color: '#CBD5E1',
                    fontSize: '0.8rem',
                    borderBottom: '1px solid #0F2035',
                  },
                  '&:hover': { bgcolor: '#0A1A30' },
                }}
              >
                <TableCell>{c.repuesto}</TableCell>
                <TableCell>
                  <Chip
                    label={c.ot_relacionada}
                    size="small"
                    sx={{
                      bgcolor: '#1E3A5F',
                      color: '#60A5FA',
                      fontSize: '0.7rem',
                      height: 20,
                      fontFamily: 'monospace',
                    }}
                  />
                </TableCell>
                <TableCell>{c.activo}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#F1F5F9 !important' }}>
                  {c.cantidad}
                </TableCell>
                <TableCell sx={{ color: '#64748B !important' }}>{c.fecha}</TableCell>
                <TableCell align="right" sx={{ color: '#34D399 !important', fontWeight: 600 }}>
                  {formatCOP(c.costo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ p: 1.5, borderTop: '1px solid #1E3A5F', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            Total consumido en período:{' '}
            <strong style={{ color: '#34D399' }}>
              {formatCOP(CONSUMOS.reduce((a, c) => a + c.costo, 0))}
            </strong>
          </Typography>
        </Box>
      </TableContainer>
    </Box>
  );
}

function TabReorden() {
  const items = ITEMS_REORDEN_FILTERED;
  const totalEstimado = items.reduce((a, i) => a + i.costo_estimado, 0);

  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#F1F5F9', mb: 2, fontWeight: 600 }}>
        Ítems que Requieren Reorden
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ bgcolor: CARD_BG, borderRadius: 2, border: `1px solid ${EAM_COLOR}55`, mb: 3 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#0A1628', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', borderBottom: `1px solid ${EAM_COLOR}33` } }}>
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
              const urgencyColor =
                urgency === 'high' ? '#EF4444' : urgency === 'medium' ? EAM_COLOR : '#F59E0B';
              return (
                <TableRow
                  key={idx}
                  sx={{
                    '& td': {
                      color: '#CBD5E1',
                      fontSize: '0.8rem',
                      borderBottom: '1px solid #0F2035',
                    },
                    '&:hover': { bgcolor: '#0A1A30' },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon sx={{ fontSize: 14, color: urgencyColor }} />
                      <Typography variant="body2" sx={{ color: '#F1F5F9' }}>
                        {item.nombre}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: `${urgencyColor} !important`, fontWeight: 700 }}>
                    {item.stock_actual}
                  </TableCell>
                  <TableCell align="right">{item.stock_minimo}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={item.cantidad_sugerida}
                      size="small"
                      sx={{
                        bgcolor: `${EAM_COLOR}22`,
                        color: EAM_COLOR,
                        fontWeight: 700,
                        border: `1px solid ${EAM_COLOR}55`,
                        minWidth: 36,
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.proveedor}</TableCell>
                  <TableCell align="right" sx={{ color: '#34D399 !important', fontWeight: 600 }}>
                    {formatCOP(item.costo_estimado)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Card */}
      <Card
        sx={{
          bgcolor: CARD_BG,
          border: `1px solid ${EAM_COLOR}`,
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent>
          <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
            <Grid size={{ xs: 12, md: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 0.5 }}>
                Total Estimado de Compra
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: EAM_COLOR, letterSpacing: '-0.5px' }}
              >
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
                sx={{
                  bgcolor: EAM_COLOR,
                  color: '#fff',
                  fontWeight: 700,
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#C2410C' },
                }}
              >
                Generar Orden de Compra
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ borderColor: '#1E3A5F' }} />
      <Typography variant="caption" sx={{ color: '#475569', mt: 1, display: 'block' }}>
        * Las cantidades sugeridas se calculan con base en consumo promedio mensual + cobertura de 30 días.
      </Typography>
    </Box>
  );
}

// --- Main Component ---

export default function EAMInventario() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Layout>
      <Box sx={{ bgcolor: DARK_BG, minHeight: '100vh', p: 3 }}>
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
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
              EAM — Inventario de Repuestos
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              ICOLTRANS · Control de Materiales y Repuestos
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            bgcolor: CARD_BG,
            borderRadius: 2,
            border: '1px solid #1E3A5F',
            mb: 3,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, v: number) => setActiveTab(v)}
            sx={{
              px: 2,
              borderBottom: '1px solid #1E3A5F',
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
            <Tab
              label="Reorden"
              icon={<WarningIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && <TabRepuestos />}
            {activeTab === 1 && <TabConsumos />}
            {activeTab === 2 && <TabReorden />}
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}
