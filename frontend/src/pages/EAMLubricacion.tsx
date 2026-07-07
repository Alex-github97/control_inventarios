import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, Grid,
  Stack, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton, TextField,
  MenuItem, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, LinearProgress, alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  OpacityRounded as OilIcon,
  Science as LabIcon,
  Download as DownloadIcon,
  Build as BuildIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

const EAM_COLOR = '#32AC5C';
const EAM_DARK = '#27884A';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

type Contamination = 'NORMAL' | 'MODERADA' | 'CRITICA';
type AlertLevel = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
type LubStatus = 'AL_DIA' | 'PROXIMO' | 'VENCIDO';

interface OilSample {
  id: string;
  asset: string;
  component: string;
  date: string;
  lubricant: string;
  hours: number;
  fe: number;
  cu: number;
  al: number;
  si: number;
  water: number;
  viscosity: number;
  contamination: Contamination;
  alert: string | null;
}

interface TrendSample {
  date: string;
  fe: number;
  cu: number;
  al: number;
  si: number;
  contamination: Contamination;
}

interface PredictiveAlert {
  id: string;
  asset: string;
  component: string;
  finding: string;
  recommendation: string;
  level: AlertLevel;
}

interface ChangeRecommendation {
  asset: string;
  lubricant: string;
  currentHours: number;
  recommendedAt: number;
  reason: string;
}

interface MonthlyConsumption {
  month: string;
  liters: number;
  cost: number;
}

// Punto de lubricación — corazón del plan de lubricación
interface LubePoint {
  id: string;
  asset: string;
  assetName: string;
  component: string;
  point: string;             // punto físico de aplicación
  lubricant: string;
  method: string;            // método de aplicación
  quantity: string;          // cantidad por aplicación
  frequency: string;         // frecuencia programada
  frequencyDays: number;
  lastApplied: string;
  nextApplied: string;
  daysToNext: number;
  status: LubStatus;
  responsible: string;
  hasOilAnalysis: boolean;
  sampleId?: string;         // muestra de laboratorio asociada (si aplica)
  notes: string;
}

const CONTAMINATION_COLORS: Record<Contamination, string> = {
  NORMAL: '#16A34A',
  MODERADA: '#CA8A04',
  CRITICA: '#DC2626',
};

const ALERT_COLORS: Record<AlertLevel, string> = {
  URGENTE: '#DC2626',
  ALTA: '#32AC5C',
  MEDIA: '#CA8A04',
  BAJA: '#6B7280',
};

const LUB_STATUS_COLORS: Record<LubStatus, string> = {
  AL_DIA: '#16A34A',
  PROXIMO: '#CA8A04',
  VENCIDO: '#DC2626',
};

const LUB_STATUS_LABEL: Record<LubStatus, string> = {
  AL_DIA: 'AL DÍA',
  PROXIMO: 'PRÓXIMO',
  VENCIDO: 'VENCIDO',
};

const SAMPLES: OilSample[] = [
  { id: 'MU-001', asset: 'VH-001', component: 'Motor', date: '2026-06-10', lubricant: 'Shell Rimula R4X 15W-40', hours: 14520, fe: 82, cu: 12, al: 8, si: 18, water: 0.05, viscosity: 108.4, contamination: 'MODERADA', alert: 'Fe elevado — posible desgaste de cilindros' },
  { id: 'MU-002', asset: 'VH-003', component: 'Motor', date: '2026-06-08', lubricant: 'Shell Rimula R4X 15W-40', hours: 9870, fe: 34, cu: 7, al: 4, si: 9, water: 0.02, viscosity: 112.1, contamination: 'NORMAL', alert: null },
  { id: 'MU-003', asset: 'MC-003', component: 'Sistema Hidráulico', date: '2026-06-12', lubricant: 'Shell Tellus S2 M 46', hours: 6240, fe: 15, cu: 5, al: 3, si: 142, water: 0.18, viscosity: 46.8, contamination: 'CRITICA', alert: 'Silicio crítico — contaminación por tierra/polvo' },
  { id: 'MU-004', asset: 'VH-007', component: 'Caja de cambios', date: '2026-06-11', lubricant: 'Shell Spirax S4 TXM', hours: 22100, fe: 44, cu: 23, al: 6, si: 7, water: 0.03, viscosity: 95.6, contamination: 'MODERADA', alert: 'Cu elevado — revisar bujes de caja' },
  { id: 'MU-005', asset: 'CMP-07', component: 'Compresor', date: '2026-06-09', lubricant: 'Shell Corena S3 R 46', hours: 8800, fe: 28, cu: 9, al: 5, si: 11, water: 0.04, viscosity: 41.2, contamination: 'NORMAL', alert: null },
  { id: 'MU-006', asset: 'VH-012', component: 'Motor', date: '2026-06-07', lubricant: 'Shell Rimula R4X 15W-40', hours: 31440, fe: 118, cu: 18, al: 15, si: 25, water: 0.11, viscosity: 98.7, contamination: 'CRITICA', alert: 'Fe y Al críticos — desgaste acelerado, cambio urgente' },
  { id: 'MU-007', asset: 'MC-001', component: 'Transmisión', date: '2026-06-05', lubricant: 'Shell Spirax S4 TXM', hours: 4320, fe: 19, cu: 8, al: 2, si: 6, water: 0.01, viscosity: 98.1, contamination: 'NORMAL', alert: null },
  { id: 'MU-008', asset: 'VH-019', component: 'Diferencial', date: '2026-06-13', lubricant: 'Shell Spirax S5 ATE 75W-90', hours: 18760, fe: 61, cu: 14, al: 9, si: 13, water: 0.07, viscosity: 134.5, contamination: 'MODERADA', alert: 'Fe moderado — monitorear tendencia' },
];

// Reference limits para interpretar analítica de aceite (ppm salvo agua/visc)
const OIL_LIMITS: Record<string, { warn: number; crit: number; unit: string; label: string }> = {
  fe: { warn: 50, crit: 75, unit: 'ppm', label: 'Hierro (Fe)' },
  cu: { warn: 15, crit: 20, unit: 'ppm', label: 'Cobre (Cu)' },
  al: { warn: 8, crit: 10, unit: 'ppm', label: 'Aluminio (Al)' },
  si: { warn: 15, crit: 30, unit: 'ppm', label: 'Silicio (Si)' },
  water: { warn: 0.1, crit: 0.2, unit: '%', label: 'Agua' },
};

const LUBE_POINTS_INITIAL: LubePoint[] = [
  { id: 'LP-001', asset: 'VH-001', assetName: 'Tractocamión Kenworth T800', component: 'Motor', point: 'Cárter — llenado principal', lubricant: 'Shell Rimula R4X 15W-40', method: 'Manual (llenado)', quantity: '28 L', frequency: 'Cada 15.000 km', frequencyDays: 45, lastApplied: '2026-05-18', nextApplied: '2026-07-02', daysToNext: -2, status: 'VENCIDO', responsible: 'Jorge Méndez', hasOilAnalysis: true, sampleId: 'MU-001', notes: 'Análisis muestra Fe en tendencia alcista. Priorizar cambio.' },
  { id: 'LP-002', asset: 'VH-001', assetName: 'Tractocamión Kenworth T800', component: 'Quinta rueda', point: 'Placa de acople', lubricant: 'Grasa Shell Gadus S3 V220C', method: 'Pistola engrasadora', quantity: '120 g', frequency: 'Cada 30 días', frequencyDays: 30, lastApplied: '2026-06-20', nextApplied: '2026-07-20', daysToNext: 16, status: 'AL_DIA', responsible: 'Jorge Méndez', hasOilAnalysis: false, notes: 'Aplicar tras lavado. Verificar libre de contaminantes.' },
  { id: 'LP-003', asset: 'MC-003', assetName: 'Montacargas Toyota 8FGCU25', component: 'Sistema Hidráulico', point: 'Depósito hidráulico', lubricant: 'Shell Tellus S2 M 46', method: 'Bomba de trasiego', quantity: '35 L', frequency: 'Cada 2.000 hrs', frequencyDays: 60, lastApplied: '2026-04-14', nextApplied: '2026-06-13', daysToNext: -21, status: 'VENCIDO', responsible: 'Pedro Torres', hasOilAnalysis: true, sampleId: 'MU-003', notes: 'Contaminación crítica de silicio. Cambio + inspección de sellos.' },
  { id: 'LP-004', asset: 'MC-003', assetName: 'Montacargas Toyota 8FGCU25', component: 'Mástil', point: 'Cadenas y rieles', lubricant: 'Lubricante de cadena Shell', method: 'Spray / brocha', quantity: '80 ml', frequency: 'Semanal', frequencyDays: 7, lastApplied: '2026-06-28', nextApplied: '2026-07-05', daysToNext: 1, status: 'PROXIMO', responsible: 'Pedro Torres', hasOilAnalysis: false, notes: 'Limpiar acumulación de polvo antes de aplicar.' },
  { id: 'LP-005', asset: 'CMP-07', assetName: 'Compresor Atlas Copco GA22', component: 'Compresor', point: 'Depósito de aceite', lubricant: 'Shell Corena S3 R 46', method: 'Manual (llenado)', quantity: '12 L', frequency: 'Cada 4.000 hrs', frequencyDays: 90, lastApplied: '2026-05-01', nextApplied: '2026-07-30', daysToNext: 26, status: 'AL_DIA', responsible: 'Luis Herrera', hasOilAnalysis: true, sampleId: 'MU-005', notes: 'Analítica normal. TBN al límite — monitorear en próximo ciclo.' },
  { id: 'LP-006', asset: 'VH-007', assetName: 'Camión Freightliner', component: 'Caja de cambios', point: 'Cárter de transmisión', lubricant: 'Shell Spirax S4 TXM', method: 'Bomba de trasiego', quantity: '18 L', frequency: 'Cada 60.000 km', frequencyDays: 120, lastApplied: '2026-03-10', nextApplied: '2026-07-08', daysToNext: 4, status: 'PROXIMO', responsible: 'Carlos Díaz', hasOilAnalysis: true, sampleId: 'MU-004', notes: 'Cu elevado — revisar bujes durante el cambio.' },
  { id: 'LP-007', asset: 'MC-001', assetName: 'Montacargas Yale GLP050', component: 'Transmisión', point: 'Convertidor de par', lubricant: 'Shell Spirax S4 TXM', method: 'Manual (llenado)', quantity: '9 L', frequency: 'Cada 1.500 hrs', frequencyDays: 50, lastApplied: '2026-06-01', nextApplied: '2026-07-21', daysToNext: 17, status: 'AL_DIA', responsible: 'Luis Vargas', hasOilAnalysis: true, sampleId: 'MU-007', notes: 'Analítica normal. Sin observaciones.' },
  { id: 'LP-008', asset: 'VH-019', assetName: 'Tractocamión International', component: 'Diferencial', point: 'Corona y piñón', lubricant: 'Shell Spirax S5 ATE 75W-90', method: 'Bomba de trasiego', quantity: '14 L', frequency: 'Cada 40.000 km', frequencyDays: 90, lastApplied: '2026-05-25', nextApplied: '2026-08-23', daysToNext: 50, status: 'AL_DIA', responsible: 'Ana Rojas', hasOilAnalysis: true, sampleId: 'MU-008', notes: 'Fe moderado en tendencia. Registrar próxima muestra.' },
];

const VH001_TREND: TrendSample[] = [
  { date: '2025-12-10', fe: 28, cu: 8, al: 3, si: 10, contamination: 'NORMAL' },
  { date: '2026-01-15', fe: 34, cu: 9, al: 4, si: 11, contamination: 'NORMAL' },
  { date: '2026-02-20', fe: 48, cu: 10, al: 5, si: 13, contamination: 'NORMAL' },
  { date: '2026-03-28', fe: 59, cu: 11, al: 6, si: 15, contamination: 'MODERADA' },
  { date: '2026-05-04', fe: 71, cu: 11, al: 7, si: 16, contamination: 'MODERADA' },
  { date: '2026-06-10', fe: 82, cu: 12, al: 8, si: 18, contamination: 'MODERADA' },
];

const FE_ALERT_LIMIT = 75;

const PREDICTIVE_ALERTS: PredictiveAlert[] = [
  { id: 'IA-001', asset: 'VH-001', component: 'Motor', finding: 'Desgaste de metal detectado — tendencia alcista en Fe (28→82 ppm en 6 meses)', recommendation: 'Cambio de aceite en 500 km — Inspección de camisas de cilindros', level: 'URGENTE' },
  { id: 'IA-002', asset: 'MC-003', component: 'Sistema Hidráulico', finding: 'Contaminación por silicio detectada (142 ppm — límite: 20 ppm)', recommendation: 'Inspección de sellos de cilindros hidráulicos recomendada — filtro de alta presión', level: 'ALTA' },
  { id: 'IA-003', asset: 'CMP-07', component: 'Compresor', finding: 'TBN bajo detectado — lubricante con vida útil al límite', recommendation: 'Próximo análisis en 200 horas — considerar cambio preventivo', level: 'MEDIA' },
];

const CHANGE_RECOMMENDATIONS: ChangeRecommendation[] = [
  { asset: 'VH-001', lubricant: 'Shell Rimula R4X 15W-40', currentHours: 14520, recommendedAt: 15000, reason: 'Fe elevado + ciclo de 500 km' },
  { asset: 'MC-003', lubricant: 'Shell Tellus S2 M 46', currentHours: 6240, recommendedAt: 6240, reason: 'Contaminación silicio crítica' },
  { asset: 'VH-012', lubricant: 'Shell Rimula R4X 15W-40', currentHours: 31440, recommendedAt: 31000, reason: 'Desgaste acelerado — vencido' },
  { asset: 'VH-007', lubricant: 'Shell Spirax S4 TXM', currentHours: 22100, recommendedAt: 24000, reason: 'Cu moderado — monitorear' },
  { asset: 'VH-019', lubricant: 'Shell Spirax S5 ATE 75W-90', currentHours: 18760, recommendedAt: 20000, reason: 'Fe moderado — próximo ciclo' },
];

const MONTHLY_CONSUMPTION: MonthlyConsumption[] = [
  { month: 'Ene', liters: 384, cost: 9216000 },
  { month: 'Feb', liters: 312, cost: 7488000 },
  { month: 'Mar', liters: 428, cost: 10272000 },
  { month: 'Abr', liters: 356, cost: 8544000 },
  { month: 'May', liters: 402, cost: 9648000 },
  { month: 'Jun', liters: 217, cost: 5208000 },
];

const MAX_LITERS = Math.max(...MONTHLY_CONSUMPTION.map(m => m.liters));
const MAX_FE = Math.max(...VH001_TREND.map(s => s.fe), FE_ALERT_LIMIT + 10);

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

const cellSx = { color: '#334155', borderColor: '#E5E7EB' };

// Métodos de aplicación disponibles (dominio conocido)
const METHOD_OPTIONS = ['Manual (llenado)', 'Pistola engrasadora', 'Bomba de trasiego', 'Spray / brocha', 'Sistema automático'];
const QUANTITY_UNITS = ['L', 'ml', 'g', 'kg'];

// Estilo de inputs — tema claro, acento EAM
const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B', bgcolor: '#FFFFFF' },
  '& label': { color: '#64748B' },
  '& label.Mui-focused': { color: EAM_DARK },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.5)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: EAM_COLOR },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
} as const;

export default function EAMLubricacion() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  // ── Plan de lubricación (mutable) ──
  const [lubePoints, setLubePoints] = useState<LubePoint[]>(LUBE_POINTS_INITIAL);
  const [search, setSearch] = useState('');
  const [filterAsset, setFilterAsset] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');

  // ── Laboratorio (filtros propios) ──
  const [sampleSearch, setSampleSearch] = useState('');
  const [filterContamination, setFilterContamination] = useState('Todos');

  // ── Dialog states ──
  const [selectedPoint, setSelectedPoint] = useState<LubePoint | null>(null);
  const [selectedSample, setSelectedSample] = useState<OilSample | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<PredictiveAlert | null>(null);
  const [selectedChange, setSelectedChange] = useState<ChangeRecommendation | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<{ sample: TrendSample; index: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Snackbar ──
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' });
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev });

  // ── New lube point form ──
  const emptyForm = {
    asset: '', assetName: '', component: '', point: '', lubricant: '',
    method: 'Manual (llenado)', quantityValue: '', quantityUnit: 'L',
    frequency: '', frequencyDays: '30', responsible: '', notes: '',
  };
  const [form, setForm] = useState({ ...emptyForm });
  const [triedSubmit, setTriedSubmit] = useState(false);

  const assetOptions = useMemo(
    () => Array.from(new Set(lubePoints.map(p => p.asset))).sort(),
    [lubePoints],
  );

  // ── Catálogos derivados de los datos reales para los Selects del formulario ──
  const assetDirectory = useMemo(() => {
    const m: Record<string, string> = {};
    lubePoints.forEach(p => { if (p.asset && !m[p.asset]) m[p.asset] = p.assetName; });
    return m;
  }, [lubePoints]);

  const componentOptions = useMemo(
    () => Array.from(new Set(lubePoints.map(p => p.component).filter(Boolean))).sort(),
    [lubePoints],
  );
  const lubricantOptions = useMemo(
    () => Array.from(new Set(lubePoints.map(p => p.lubricant).filter(Boolean))).sort(),
    [lubePoints],
  );
  const responsibleOptions = useMemo(
    () => Array.from(new Set(lubePoints.map(p => p.responsible).filter(Boolean))).sort(),
    [lubePoints],
  );

  const filteredPoints = useMemo(() => lubePoints.filter(p => {
    if (filterAsset !== 'Todos' && p.asset !== filterAsset) return false;
    if (filterStatus !== 'Todos' && p.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !p.asset.toLowerCase().includes(q) &&
        !p.assetName.toLowerCase().includes(q) &&
        !p.component.toLowerCase().includes(q) &&
        !p.point.toLowerCase().includes(q) &&
        !p.lubricant.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [lubePoints, filterAsset, filterStatus, search]);

  const kpiOverdue = lubePoints.filter(p => p.status === 'VENCIDO').length;
  const kpiSoon = lubePoints.filter(p => p.status === 'PROXIMO').length;
  const kpiOk = lubePoints.filter(p => p.status === 'AL_DIA').length;

  // ── Laboratorio: muestras filtradas + KPIs derivados ──
  const filteredSamples = useMemo(() => SAMPLES.filter(s => {
    if (filterContamination !== 'Todos' && s.contamination !== filterContamination) return false;
    if (sampleSearch.trim()) {
      const q = sampleSearch.toLowerCase();
      if (
        !s.id.toLowerCase().includes(q) &&
        !s.asset.toLowerCase().includes(q) &&
        !s.component.toLowerCase().includes(q) &&
        !s.lubricant.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [filterContamination, sampleSearch]);

  const labAlerts = SAMPLES.filter(s => s.alert).length;
  const labCritical = SAMPLES.filter(s => s.contamination === 'CRITICA').length;
  const labModerate = SAMPLES.filter(s => s.contamination === 'MODERADA').length;

  const sampleFor = (id?: string) => (id ? SAMPLES.find(s => s.id === id) ?? null : null);

  // ── Validación de campos obligatorios del formulario ──
  const missing = {
    asset: !form.asset,
    component: !form.component,
    point: !form.point.trim(),
    lubricant: !form.lubricant,
    quantityValue: !form.quantityValue.trim() || Number(form.quantityValue) <= 0,
    frequency: !form.frequency.trim(),
    frequencyDays: !form.frequencyDays.trim() || Number(form.frequencyDays) <= 0,
    responsible: !form.responsible,
  };
  const formValid = !Object.values(missing).some(Boolean);

  const openCreate = () => { setForm({ ...emptyForm }); setTriedSubmit(false); setCreateOpen(true); };

  // Al seleccionar un activo existente, autocompletar su nombre (readonly)
  const handleAssetChange = (asset: string) =>
    setForm(prev => ({ ...prev, asset, assetName: assetDirectory[asset] || '' }));

  const handleCreate = () => {
    if (!formValid) {
      setTriedSubmit(true);
      notify('Completa los campos obligatorios marcados.', 'warning');
      return;
    }
    const fdays = parseInt(form.frequencyDays, 10) || 30;
    const next = new Date();
    next.setDate(next.getDate() + fdays);
    const newPoint: LubePoint = {
      id: `LP-${String(lubePoints.length + 1).padStart(3, '0')}`,
      asset: form.asset,
      assetName: form.assetName.trim() || assetDirectory[form.asset] || form.asset,
      component: form.component,
      point: form.point.trim(),
      lubricant: form.lubricant,
      method: form.method,
      quantity: `${form.quantityValue.trim()} ${form.quantityUnit}`,
      frequency: form.frequency.trim(),
      frequencyDays: fdays,
      lastApplied: new Date().toISOString().slice(0, 10),
      nextApplied: next.toISOString().slice(0, 10),
      daysToNext: fdays,
      status: 'AL_DIA',
      responsible: form.responsible,
      hasOilAnalysis: false,
      notes: form.notes.trim() || 'Punto de lubricación creado desde el plan.',
    };
    setLubePoints(prev => [newPoint, ...prev]);
    setCreateOpen(false);
    setForm({ ...emptyForm });
    setTriedSubmit(false);
    notify(`Punto ${newPoint.id} agregado al plan de lubricación.`);
  };

  const registerApplication = (p: LubePoint) => {
    const next = new Date();
    next.setDate(next.getDate() + p.frequencyDays);
    setLubePoints(prev => prev.map(x => x.id === p.id ? {
      ...x,
      lastApplied: new Date().toISOString().slice(0, 10),
      nextApplied: next.toISOString().slice(0, 10),
      daysToNext: p.frequencyDays,
      status: 'AL_DIA',
    } : x));
    setSelectedPoint(null);
    notify(`Aplicación registrada para ${p.id} — reprogramada.`);
  };

  const dialogPaper = { sx: { bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E5E7EB' } };

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh', background: '#F8FAFC' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={1}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ width: 6, height: 36, bgcolor: EAM_COLOR, borderRadius: 1 }} />
            <Typography variant="h4" sx={{ color: EAM_COLOR, fontWeight: 700 }}>
              Gestión de Lubricación
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => notify('Reporte de lubricación exportado (PDF).', 'info')}
            sx={{ color: EAM_DARK, borderColor: EAM_COLOR, textTransform: 'none', fontWeight: 700, '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) } }}
          >
            Exportar reporte
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Plan de lubricación, análisis de aceites, tendencias tribológicas e inteligencia predictiva
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: '#64748B', fontWeight: 600 },
              '& .Mui-selected': { color: EAM_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR },
            }}
          >
            <Tab label="Plan de Lubricación" />
            <Tab label="Laboratorio de Aceites" />
            <Tab label="Tendencias" />
            <Tab label="IA Predictiva Lubricación" />
          </Tabs>
        </Box>

        {/* TAB 0 — Plan de Lubricación */}
        <TabPanel value={tab} index={0}>
          {/* KPIs */}
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Puntos de Lubricación', value: String(lubePoints.length), color: '#60A5FA', sub: 'en el plan activo' },
              { label: 'Vencidos', value: String(kpiOverdue), color: '#F87171', sub: 'requieren acción' },
              { label: 'Próximos', value: String(kpiSoon), color: '#FCD34D', sub: 'dentro de 7 días' },
              { label: 'Al Día', value: String(kpiOk), color: '#34D399', sub: 'sin novedad' },
            ].map(kpi => (
              <Grid key={kpi.label} size={{ xs: 12, md: 3 }}>
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 900, mb: 0.5 }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mb: 0.25 }}>{kpi.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>{kpi.sub}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
            <TextField
              size="small" placeholder="Buscar punto, activo, componente o lubricante…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 280, flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
            />
            <TextField select size="small" label="Activo" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="Todos">Todos</MenuItem>
              {assetOptions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Estado" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="AL_DIA">Al día</MenuItem>
              <MenuItem value="PROXIMO">Próximo</MenuItem>
              <MenuItem value="VENCIDO">Vencido</MenuItem>
            </TextField>
            <Button
              variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Nuevo punto
            </Button>
          </Stack>

          <Typography fontSize={12} color="#94A3B8" mb={1}>
            {filteredPoints.length} punto{filteredPoints.length !== 1 ? 's' : ''} · haz clic en una fila para ver el detalle completo
          </Typography>

          {/* Lube points table */}
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ overflowX: 'auto' }}>
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 950 }}>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#F8FAFC', color: '#6B7280', fontWeight: 700, borderColor: '#E5E7EB', fontSize: '0.7rem', whiteSpace: 'nowrap' } }}>
                        <TableCell>Punto</TableCell>
                        <TableCell>Activo</TableCell>
                        <TableCell>Componente</TableCell>
                        <TableCell>Lubricante</TableCell>
                        <TableCell>Cantidad</TableCell>
                        <TableCell>Frecuencia</TableCell>
                        <TableCell>Última</TableCell>
                        <TableCell>Próxima</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Análisis</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPoints.map(p => (
                        <TableRow
                          key={p.id}
                          onClick={() => setSelectedPoint(p)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) } }}
                        >
                          <TableCell sx={{ color: EAM_COLOR, borderColor: '#E5E7EB', fontWeight: 700, fontSize: '0.75rem' }}>{p.id}</TableCell>
                          <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{p.asset}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.8rem' }}>{p.component}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.72rem', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.lubricant}</TableCell>
                          <TableCell sx={{ ...cellSx, fontSize: '0.8rem' }}>{p.quantity}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.75rem' }}>{p.frequency}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.75rem' }}>{p.lastApplied}</TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB', fontSize: '0.75rem' }}>
                            <Typography sx={{ color: LUB_STATUS_COLORS[p.status], fontWeight: 700, fontSize: '0.75rem' }}>
                              {p.nextApplied}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              {p.daysToNext < 0 ? `${Math.abs(p.daysToNext)} días atrás` : `en ${p.daysToNext} días`}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB' }}>
                            <Chip
                              label={LUB_STATUS_LABEL[p.status]}
                              size="small"
                              sx={{
                                bgcolor: LUB_STATUS_COLORS[p.status] + '22',
                                color: LUB_STATUS_COLORS[p.status],
                                border: `1px solid ${LUB_STATUS_COLORS[p.status]}`,
                                fontWeight: 700, fontSize: '0.62rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB' }}>
                            {p.hasOilAnalysis
                              ? <Chip label={p.sampleId} size="small" icon={<LabIcon sx={{ fontSize: 14 }} />} sx={{ bgcolor: alpha('#3B82F6', 0.12), color: '#2563EB', fontWeight: 700, fontSize: '0.62rem' }} />
                              : <Typography variant="caption" sx={{ color: '#94A3B8' }}>N/A</Typography>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPoints.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} sx={{ textAlign: 'center', color: '#94A3B8', borderColor: '#E5E7EB', py: 4 }}>
                            No hay puntos de lubricación con los filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* TAB 1 — Laboratorio de Aceites */}
        <TabPanel value={tab} index={1}>
          {/* KPIs */}
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Total Muestras', value: String(SAMPLES.length), color: '#60A5FA', sub: 'en el historial' },
              { label: 'Alertas Activas', value: String(labAlerts), color: '#F87171', sub: 'requieren acción' },
              { label: 'Contaminación Crítica', value: String(labCritical), color: '#FCD34D', sub: 'cambio inmediato' },
              { label: 'En Vigilancia', value: String(labModerate), color: '#34D399', sub: 'tendencia moderada' },
            ].map(kpi => (
              <Grid key={kpi.label} size={{ xs: 12, md: 3 }}>
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 900, mb: 0.5 }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mb: 0.25 }}>{kpi.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>{kpi.sub}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Samples table */}
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 0.5 }}>
                Muestras de laboratorio — resultados analíticos
              </Typography>
              <Typography fontSize={12} color="#94A3B8" mb={2}>
                Haz clic en una muestra para ver la interpretación tribológica completa
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
                <TextField
                  size="small" placeholder="Buscar muestra, activo, componente o lubricante…" value={sampleSearch}
                  onChange={(e) => setSampleSearch(e.target.value)}
                  sx={{ minWidth: 280, flex: 1 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                />
                <TextField select size="small" label="Contaminación" value={filterContamination} onChange={(e) => setFilterContamination(e.target.value)} sx={{ minWidth: 180 }}>
                  <MenuItem value="Todos">Todas</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="MODERADA">Moderada</MenuItem>
                  <MenuItem value="CRITICA">Crítica</MenuItem>
                </TextField>
              </Stack>
              <Typography fontSize={12} color="#94A3B8" mb={1}>
                {filteredSamples.length} muestra{filteredSamples.length !== 1 ? 's' : ''}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#F8FAFC', color: '#6B7280', fontWeight: 700, borderColor: '#E5E7EB', fontSize: '0.7rem', whiteSpace: 'nowrap' } }}>
                        <TableCell>Muestra</TableCell>
                        <TableCell>Activo</TableCell>
                        <TableCell>Componente</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Lubricante</TableCell>
                        <TableCell>Horas</TableCell>
                        <TableCell>Fe (ppm)</TableCell>
                        <TableCell>Cu (ppm)</TableCell>
                        <TableCell>Al (ppm)</TableCell>
                        <TableCell>Si (ppm)</TableCell>
                        <TableCell>Agua %</TableCell>
                        <TableCell>Visc @40</TableCell>
                        <TableCell>Contaminación</TableCell>
                        <TableCell>Alerta</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSamples.map(s => (
                        <TableRow
                          key={s.id}
                          onClick={() => setSelectedSample(s)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) } }}
                        >
                          <TableCell sx={{ color: EAM_COLOR, borderColor: '#E5E7EB', fontWeight: 700, fontSize: '0.75rem' }}>{s.id}</TableCell>
                          <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontWeight: 700 }}>{s.asset}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.8rem' }}>{s.component}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.75rem' }}>{s.date}</TableCell>
                          <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.72rem', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.lubricant}</TableCell>
                          <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{s.hours.toLocaleString()}</TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB' }}>
                            <Typography sx={{ color: s.fe > 75 ? '#DC2626' : s.fe > 50 ? '#CA8A04' : '#16A34A', fontWeight: 700 }}>{s.fe}</Typography>
                          </TableCell>
                          <TableCell sx={{ color: s.cu > 20 ? '#CA8A04' : '#334155', borderColor: '#E5E7EB' }}>{s.cu}</TableCell>
                          <TableCell sx={{ color: s.al > 10 ? '#CA8A04' : '#334155', borderColor: '#E5E7EB' }}>{s.al}</TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB' }}>
                            <Typography sx={{ color: s.si > 30 ? '#DC2626' : s.si > 15 ? '#CA8A04' : '#334155', fontWeight: s.si > 30 ? 700 : 400 }}>{s.si}</Typography>
                          </TableCell>
                          <TableCell sx={{ color: s.water > 0.1 ? '#DC2626' : '#334155', borderColor: '#E5E7EB' }}>{s.water.toFixed(2)}</TableCell>
                          <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{s.viscosity}</TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB' }}>
                            <Chip
                              label={s.contamination}
                              size="small"
                              sx={{
                                bgcolor: CONTAMINATION_COLORS[s.contamination] + '22',
                                color: CONTAMINATION_COLORS[s.contamination],
                                border: `1px solid ${CONTAMINATION_COLORS[s.contamination]}`,
                                fontWeight: 700, fontSize: '0.62rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ borderColor: '#E5E7EB', maxWidth: 200 }}>
                            {s.alert ? (
                              <Typography variant="caption" sx={{ color: '#DC2626', fontSize: '0.7rem' }}>{s.alert}</Typography>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#16A34A', fontSize: '0.7rem' }}>Sin alertas</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSamples.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={14} sx={{ textAlign: 'center', color: '#94A3B8', borderColor: '#E5E7EB', py: 4 }}>
                            No hay muestras que coincidan con los filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* TAB 2 — Tendencias */}
        <TabPanel value={tab} index={2}>
          <Grid container spacing={3}>
            {/* Fe trend chart */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 0.5 }}>
                    VH-001 Tractocamión Kenworth — Hierro (Fe ppm)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>Tendencia de las últimas 6 muestras</Typography>

                  <Box sx={{ mt: 3, mb: 1, position: 'relative' }}>
                    {/* Alert limit line */}
                    <Box sx={{
                      position: 'absolute',
                      top: `${100 - (FE_ALERT_LIMIT / MAX_FE) * 100}%`,
                      left: 0, right: 0,
                      borderTop: '2px dashed #DC2626',
                      zIndex: 2,
                    }}>
                      <Typography variant="caption" sx={{ color: '#DC2626', fontSize: '0.65rem', ml: 0.5, px: 0.5 }}>
                        Límite: {FE_ALERT_LIMIT} ppm
                      </Typography>
                    </Box>

                    {/* Bars */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 160, position: 'relative', zIndex: 1 }}>
                      {VH001_TREND.map((s, i) => {
                        const heightPct = (s.fe / MAX_FE) * 100;
                        const isOverLimit = s.fe > FE_ALERT_LIMIT;
                        return (
                          <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: isOverLimit ? '#DC2626' : '#16A34A', fontWeight: 700, fontSize: '0.7rem' }}>
                              {s.fe}
                            </Typography>
                            <Box sx={{
                              width: '100%',
                              height: `${heightPct * 1.6}px`,
                              bgcolor: isOverLimit ? '#DC262630' : '#3B82F630',
                              border: `2px solid ${isOverLimit ? '#DC2626' : '#3B82F6'}`,
                              borderRadius: '4px 4px 0 0',
                            }} />
                            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.6rem', textAlign: 'center' }}>
                              {s.date.substring(5)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: '#E5E7EB', my: 2 }} />

                  {/* Interpretation */}
                  <Box sx={{ bgcolor: '#DC262615', border: '1px solid #DC262640', borderRadius: 1, p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Diagnóstico actual — IA Tribológica
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      El hierro en VH-001 muestra una tendencia alcista sostenida de 28 ppm (dic-25) a 82 ppm (jun-26), superando el límite de alerta de 75 ppm.
                      La tasa de incremento (~9 ppm/mes) indica desgaste progresivo de cilindros o anillos de pistón.
                      Se recomienda cambio inmediato de aceite e inspección de motor antes de las próximas 500 km de operación.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Trend data table */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 0.5 }}>
                    Historial de 6 muestras — VH-001 Motor
                  </Typography>
                  <Typography fontSize={12} color="#94A3B8" mb={2}>Haz clic en una muestra para ver la variación punto a punto</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#F8FAFC', color: '#6B7280', fontWeight: 700, borderColor: '#E5E7EB', fontSize: '0.68rem' } }}>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Fe</TableCell>
                          <TableCell>Cu</TableCell>
                          <TableCell>Al</TableCell>
                          <TableCell>Si</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {VH001_TREND.map((s, i) => (
                          <TableRow
                            key={i}
                            onClick={() => setSelectedTrend({ sample: s, index: i })}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) } }}
                          >
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.75rem' }}>{s.date}</TableCell>
                            <TableCell sx={{ borderColor: '#E5E7EB' }}>
                              <Typography sx={{ color: s.fe > FE_ALERT_LIMIT ? '#DC2626' : '#16A34A', fontWeight: 700, fontSize: '0.8rem' }}>{s.fe}</Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{s.cu}</TableCell>
                            <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{s.al}</TableCell>
                            <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{s.si}</TableCell>
                            <TableCell sx={{ borderColor: '#E5E7EB' }}>
                              <Chip
                                label={s.contamination}
                                size="small"
                                sx={{
                                  bgcolor: CONTAMINATION_COLORS[s.contamination] + '22',
                                  color: CONTAMINATION_COLORS[s.contamination],
                                  fontWeight: 700, fontSize: '0.6rem',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* TAB 3 — IA Predictiva Lubricación */}
        <TabPanel value={tab} index={3}>
          {/* Predictive alerts */}
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 0.5 }}>
            Alertas predictivas generadas por IA
          </Typography>
          <Typography fontSize={12} color="#94A3B8" mb={2}>Haz clic en una alerta para ver el plan de acción detallado</Typography>
          <Grid container spacing={2} mb={4}>
            {PREDICTIVE_ALERTS.map(alert => (
              <Grid key={alert.id} size={{ xs: 12, md: 4 }}>
                <Card
                  onClick={() => setSelectedAlert(alert)}
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: `2px solid ${ALERT_COLORS[alert.level]}40`,
                    borderRadius: 2, height: '100%', cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                    '&:hover': { boxShadow: `0 6px 18px ${ALERT_COLORS[alert.level]}33`, transform: 'translateY(-2px)' },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip
                        label={alert.level}
                        size="small"
                        sx={{
                          bgcolor: ALERT_COLORS[alert.level] + '22',
                          color: ALERT_COLORS[alert.level],
                          border: `1px solid ${ALERT_COLORS[alert.level]}`,
                          fontWeight: 700, fontSize: '0.65rem',
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>{alert.id}</Typography>
                    </Stack>

                    <Typography variant="subtitle1" sx={{ color: EAM_COLOR, fontWeight: 700, mb: 0.25 }}>{alert.asset}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5 }}>{alert.component}</Typography>

                    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1, p: 1, mb: 1.5, border: '1px solid #E5E7EB' }}>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 0.25, fontWeight: 600 }}>HALLAZGO</Typography>
                      <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.8rem', lineHeight: 1.5 }}>{alert.finding}</Typography>
                    </Box>

                    <Box sx={{ bgcolor: ALERT_COLORS[alert.level] + '10', borderRadius: 1, p: 1, border: `1px solid ${ALERT_COLORS[alert.level]}30` }}>
                      <Typography variant="caption" sx={{ color: ALERT_COLORS[alert.level], display: 'block', mb: 0.25, fontWeight: 700 }}>RECOMENDACIÓN</Typography>
                      <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.8rem', lineHeight: 1.5 }}>{alert.recommendation}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            {/* Change recommendations table */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 0.5 }}>
                    Recomendaciones de cambio programadas
                  </Typography>
                  <Typography fontSize={12} color="#94A3B8" mb={2}>Haz clic en una fila para ver el detalle y programar</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#F8FAFC', color: '#6B7280', fontWeight: 700, borderColor: '#E5E7EB', fontSize: '0.7rem' } }}>
                          <TableCell>Activo</TableCell>
                          <TableCell>Lubricante</TableCell>
                          <TableCell>Hrs actuales</TableCell>
                          <TableCell>Cambio en</TableCell>
                          <TableCell>Motivo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {CHANGE_RECOMMENDATIONS.map((r, i) => {
                          const diff = r.recommendedAt - r.currentHours;
                          const isOverdue = diff <= 0;
                          return (
                            <TableRow
                              key={i}
                              onClick={() => setSelectedChange(r)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) } }}
                            >
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontWeight: 700 }}>{r.asset}</TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.75rem' }}>{r.lubricant}</TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{r.currentHours.toLocaleString()}</TableCell>
                              <TableCell sx={{ borderColor: '#E5E7EB' }}>
                                <Typography sx={{ color: isOverdue ? '#DC2626' : diff < 500 ? '#CA8A04' : '#16A34A', fontWeight: 700 }}>
                                  {isOverdue ? `VENCIDO (${Math.abs(diff)} hrs)` : `${diff} hrs`}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: '0.75rem' }}>{r.reason}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly consumption */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 3 }}>
                    Consumo de lubricantes — mensual
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 130, mb: 1 }}>
                    {MONTHLY_CONSUMPTION.map(m => (
                      <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: EAM_COLOR, fontWeight: 700, fontSize: '0.65rem' }}>
                          {m.liters}L
                        </Typography>
                        <Box sx={{
                          width: '100%',
                          height: `${(m.liters / MAX_LITERS) * 110}px`,
                          bgcolor: '#32AC5C20',
                          border: `2px solid ${EAM_COLOR}`,
                          borderRadius: '4px 4px 0 0',
                        }} />
                        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, fontSize: '0.65rem' }}>{m.month}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ borderColor: '#E5E7EB', mb: 1.5 }} />
                  <Stack spacing={0.5}>
                    {MONTHLY_CONSUMPTION.slice().reverse().slice(0, 3).map(m => (
                      <Stack key={m.month} direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: '#64748B' }}>{m.month} 2026</Typography>
                        <Stack direction="row" spacing={2}>
                          <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600 }}>{m.liters} L</Typography>
                          <Typography variant="caption" sx={{ color: EAM_COLOR, fontWeight: 600 }}>{formatCOP(m.cost)}</Typography>
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                  <Divider sx={{ borderColor: '#E5E7EB', mt: 1.5, mb: 1 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700 }}>Total acumulado (6 meses)</Typography>
                    <Typography variant="caption" sx={{ color: '#CA8A04', fontWeight: 700 }}>
                      {formatCOP(MONTHLY_CONSUMPTION.reduce((acc, m) => acc + m.cost, 0))}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ═══════════ DIALOG — Detalle de punto de lubricación ═══════════ */}
        <Dialog open={!!selectedPoint} onClose={() => setSelectedPoint(null)} maxWidth="md" fullWidth scroll="paper" PaperProps={dialogPaper}>
          {selectedPoint && (() => {
            const p = selectedPoint;
            const sample = sampleFor(p.sampleId);
            return (
              <>
                <DialogTitle sx={{ pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <OilIcon sx={{ color: EAM_COLOR }} />
                      <Box>
                        <Typography fontSize={12} fontWeight={700} color="#64748B" letterSpacing="0.5px">
                          {p.id} · {p.asset}
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="#1E293B">{p.point}</Typography>
                        <Typography variant="caption" color="#64748B">{p.assetName} · {p.component}</Typography>
                      </Box>
                    </Stack>
                    <IconButton onClick={() => setSelectedPoint(null)} size="small"><CloseIcon /></IconButton>
                  </Stack>
                  <Chip
                    label={LUB_STATUS_LABEL[p.status]}
                    size="small"
                    sx={{ mt: 1, bgcolor: LUB_STATUS_COLORS[p.status] + '22', color: LUB_STATUS_COLORS[p.status], border: `1px solid ${LUB_STATUS_COLORS[p.status]}`, fontWeight: 700, fontSize: '0.62rem' }}
                  />
                </DialogTitle>
                <Divider sx={{ borderColor: '#E5E7EB' }} />
                <DialogContent>
                  {/* Ficha del punto */}
                  <Grid container spacing={2} mb={1}>
                    {[
                      { label: 'Lubricante', value: p.lubricant },
                      { label: 'Método de aplicación', value: p.method },
                      { label: 'Cantidad por aplicación', value: p.quantity },
                      { label: 'Frecuencia', value: p.frequency },
                      { label: 'Última aplicación', value: p.lastApplied },
                      { label: 'Próxima aplicación', value: `${p.nextApplied} (${p.daysToNext < 0 ? `${Math.abs(p.daysToNext)} días atrás` : `en ${p.daysToNext} días`})` },
                      { label: 'Responsable', value: p.responsible },
                      { label: 'Ciclo (días)', value: String(p.frequencyDays) },
                    ].map(f => (
                      <Grid key={f.label} size={{ xs: 6, sm: 4 }}>
                        <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">{f.label}</Typography>
                        <Typography fontSize={13} fontWeight={600} color="#1E293B">{f.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Progreso al próximo servicio */}
                  <Box sx={{ mt: 1.5, mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize={11} color="#64748B">Avance del ciclo de lubricación</Typography>
                      <Typography fontSize={11} fontWeight={700} color={LUB_STATUS_COLORS[p.status]}>
                        {p.status === 'VENCIDO' ? 'VENCIDO' : `${Math.max(0, Math.min(100, Math.round((1 - p.daysToNext / p.frequencyDays) * 100)))}%`}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={p.status === 'VENCIDO' ? 100 : Math.max(0, Math.min(100, Math.round((1 - p.daysToNext / p.frequencyDays) * 100)))}
                      sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: LUB_STATUS_COLORS[p.status], borderRadius: 5 } }}
                    />
                  </Box>

                  {/* Notas */}
                  <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 1, p: 1.5, mb: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="#6B7280">OBSERVACIONES</Typography>
                    <Typography variant="body2" color="#334155" sx={{ fontSize: '0.85rem', lineHeight: 1.6, mt: 0.5 }}>{p.notes}</Typography>
                  </Box>

                  {/* Análisis de aceite asociado */}
                  <Typography fontSize={13} fontWeight={700} color="#1E293B" mb={1}>Análisis de aceite asociado</Typography>
                  {sample ? (
                    <Box sx={{ border: `1px solid ${CONTAMINATION_COLORS[sample.contamination]}44`, borderRadius: 1.5, p: 1.5, bgcolor: CONTAMINATION_COLORS[sample.contamination] + '0D' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography fontSize={12} fontWeight={700} color="#2563EB">{sample.id} · {sample.date}</Typography>
                        <Chip label={sample.contamination} size="small" sx={{ bgcolor: CONTAMINATION_COLORS[sample.contamination] + '22', color: CONTAMINATION_COLORS[sample.contamination], fontWeight: 700, fontSize: '0.6rem' }} />
                      </Stack>
                      <Grid container spacing={1}>
                        {[
                          { k: 'Fe', v: sample.fe, lim: OIL_LIMITS.fe },
                          { k: 'Cu', v: sample.cu, lim: OIL_LIMITS.cu },
                          { k: 'Al', v: sample.al, lim: OIL_LIMITS.al },
                          { k: 'Si', v: sample.si, lim: OIL_LIMITS.si },
                          { k: 'Agua', v: sample.water, lim: OIL_LIMITS.water },
                        ].map(m => {
                          const color = m.v >= m.lim.crit ? '#DC2626' : m.v >= m.lim.warn ? '#CA8A04' : '#16A34A';
                          return (
                            <Grid key={m.k} size={{ xs: 4, sm: 2.4 }}>
                              <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 1, bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                                <Typography fontSize={16} fontWeight={800} color={color}>{m.v}{m.lim.unit === '%' ? '%' : ''}</Typography>
                                <Typography fontSize={9} color="#94A3B8">{m.k} (lím {m.lim.crit}{m.lim.unit === '%' ? '%' : ''})</Typography>
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                      {sample.alert && (
                        <Typography variant="caption" color="#DC2626" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>⚠ {sample.alert}</Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="#94A3B8">Este punto no cuenta con análisis de aceite (lubricación por grasa / cadena).</Typography>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => { navigate(`/eam/ordenes-trabajo?activo=${encodeURIComponent(p.asset)}`); }} startIcon={<BuildIcon />} sx={{ color: '#64748B', textTransform: 'none' }}>
                    Ver OTs del activo
                  </Button>
                  <Button
                    variant="contained" startIcon={<CheckIcon />} onClick={() => registerApplication(p)}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700 }}
                  >
                    Registrar aplicación
                  </Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* ═══════════ DIALOG — Detalle de muestra de aceite ═══════════ */}
        <Dialog open={!!selectedSample} onClose={() => setSelectedSample(null)} maxWidth="md" fullWidth scroll="paper" PaperProps={dialogPaper}>
          {selectedSample && (() => {
            const s = selectedSample;
            return (
              <>
                <DialogTitle sx={{ pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <LabIcon sx={{ color: '#2563EB' }} />
                      <Box>
                        <Typography fontSize={12} fontWeight={700} color="#64748B" letterSpacing="0.5px">{s.id} · {s.date}</Typography>
                        <Typography variant="h6" fontWeight={800} color="#1E293B">{s.asset} — {s.component}</Typography>
                        <Typography variant="caption" color="#64748B">{s.lubricant} · {s.hours.toLocaleString()} hrs</Typography>
                      </Box>
                    </Stack>
                    <IconButton onClick={() => setSelectedSample(null)} size="small"><CloseIcon /></IconButton>
                  </Stack>
                  <Chip label={`Contaminación ${s.contamination}`} size="small" sx={{ mt: 1, bgcolor: CONTAMINATION_COLORS[s.contamination] + '22', color: CONTAMINATION_COLORS[s.contamination], border: `1px solid ${CONTAMINATION_COLORS[s.contamination]}`, fontWeight: 700, fontSize: '0.62rem' }} />
                </DialogTitle>
                <Divider sx={{ borderColor: '#E5E7EB' }} />
                <DialogContent>
                  <Typography fontSize={13} fontWeight={700} color="#1E293B" mb={1}>Espectrometría de desgaste y contaminantes</Typography>
                  <Grid container spacing={1.5} mb={2}>
                    {[
                      { k: 'fe', v: s.fe }, { k: 'cu', v: s.cu }, { k: 'al', v: s.al }, { k: 'si', v: s.si }, { k: 'water', v: s.water },
                    ].map(({ k, v }) => {
                      const lim = OIL_LIMITS[k];
                      const color = v >= lim.crit ? '#DC2626' : v >= lim.warn ? '#CA8A04' : '#16A34A';
                      const pct = Math.min(100, (v / lim.crit) * 100);
                      return (
                        <Grid key={k} size={{ xs: 6, sm: 4 }}>
                          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 1.5, p: 1.25 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                              <Typography fontSize={11} fontWeight={700} color="#64748B">{lim.label}</Typography>
                              <Typography fontSize={18} fontWeight={900} color={color}>{v}{lim.unit === '%' ? '%' : ''}</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.5, height: 6, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />
                            <Typography fontSize={9} color="#94A3B8" mt={0.25}>Límite crítico: {lim.crit} {lim.unit}</Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 1.5, p: 1.25 }}>
                        <Typography fontSize={11} fontWeight={700} color="#64748B">Viscosidad @40°C</Typography>
                        <Typography fontSize={18} fontWeight={900} color="#334155">{s.viscosity}</Typography>
                        <Typography fontSize={9} color="#94A3B8" mt={0.25}>cSt</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ bgcolor: s.alert ? '#DC262610' : '#16A34A10', border: `1px solid ${s.alert ? '#DC262640' : '#16A34A40'}`, borderRadius: 1.5, p: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color={s.alert ? '#DC2626' : '#16A34A'} sx={{ display: 'block', mb: 0.5 }}>
                      {s.alert ? 'DIAGNÓSTICO — ACCIÓN REQUERIDA' : 'DIAGNÓSTICO — SIN NOVEDADES'}
                    </Typography>
                    <Typography variant="body2" color="#334155" sx={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {s.alert ?? 'Todos los parámetros dentro de rangos normales. Continuar con el ciclo de lubricación programado.'}
                    </Typography>
                  </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setSelectedSample(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                  <Button
                    variant="contained" startIcon={<DownloadIcon />} onClick={() => notify(`Boletín analítico ${s.id} exportado.`, 'info')}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700 }}
                  >
                    Exportar boletín
                  </Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* ═══════════ DIALOG — Detalle de alerta predictiva ═══════════ */}
        <Dialog open={!!selectedAlert} onClose={() => setSelectedAlert(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaper}>
          {selectedAlert && (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <WarningIcon sx={{ color: ALERT_COLORS[selectedAlert.level] }} />
                    <Box>
                      <Typography fontSize={12} fontWeight={700} color="#64748B">{selectedAlert.id} · {selectedAlert.asset}</Typography>
                      <Typography variant="h6" fontWeight={800} color="#1E293B">{selectedAlert.component}</Typography>
                    </Box>
                  </Stack>
                  <IconButton onClick={() => setSelectedAlert(null)} size="small"><CloseIcon /></IconButton>
                </Stack>
                <Chip label={`PRIORIDAD ${selectedAlert.level}`} size="small" sx={{ mt: 1, bgcolor: ALERT_COLORS[selectedAlert.level] + '22', color: ALERT_COLORS[selectedAlert.level], border: `1px solid ${ALERT_COLORS[selectedAlert.level]}`, fontWeight: 700, fontSize: '0.62rem' }} />
              </DialogTitle>
              <Divider sx={{ borderColor: '#E5E7EB' }} />
              <DialogContent>
                <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 1.5, p: 1.5, mb: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="#6B7280">HALLAZGO</Typography>
                  <Typography variant="body2" color="#334155" sx={{ fontSize: '0.88rem', lineHeight: 1.6, mt: 0.5 }}>{selectedAlert.finding}</Typography>
                </Box>
                <Box sx={{ bgcolor: ALERT_COLORS[selectedAlert.level] + '10', border: `1px solid ${ALERT_COLORS[selectedAlert.level]}40`, borderRadius: 1.5, p: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} color={ALERT_COLORS[selectedAlert.level]}>PLAN DE ACCIÓN RECOMENDADO</Typography>
                  <Typography variant="body2" color="#334155" sx={{ fontSize: '0.88rem', lineHeight: 1.6, mt: 0.5 }}>{selectedAlert.recommendation}</Typography>
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setSelectedAlert(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Descartar</Button>
                <Button
                  variant="contained" startIcon={<BuildIcon />}
                  onClick={() => { const a = selectedAlert; setSelectedAlert(null); notify(`OT generada desde alerta ${a.id} para ${a.asset}.`); }}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700 }}
                >
                  Generar OT
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* ═══════════ DIALOG — Detalle de recomendación de cambio ═══════════ */}
        <Dialog open={!!selectedChange} onClose={() => setSelectedChange(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaper}>
          {selectedChange && (() => {
            const r = selectedChange;
            const diff = r.recommendedAt - r.currentHours;
            const isOverdue = diff <= 0;
            const color = isOverdue ? '#DC2626' : diff < 500 ? '#CA8A04' : '#16A34A';
            return (
              <>
                <DialogTitle sx={{ pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CalendarIcon sx={{ color: EAM_COLOR }} />
                      <Box>
                        <Typography fontSize={12} fontWeight={700} color="#64748B">Cambio de lubricante</Typography>
                        <Typography variant="h6" fontWeight={800} color="#1E293B">{r.asset}</Typography>
                      </Box>
                    </Stack>
                    <IconButton onClick={() => setSelectedChange(null)} size="small"><CloseIcon /></IconButton>
                  </Stack>
                </DialogTitle>
                <Divider sx={{ borderColor: '#E5E7EB' }} />
                <DialogContent>
                  <Grid container spacing={2} mb={1.5}>
                    {[
                      { label: 'Lubricante', value: r.lubricant },
                      { label: 'Horas actuales', value: r.currentHours.toLocaleString() },
                      { label: 'Cambio recomendado a', value: r.recommendedAt.toLocaleString() },
                      { label: 'Estado', value: isOverdue ? `VENCIDO (${Math.abs(diff)} hrs)` : `Faltan ${diff} hrs` },
                    ].map(f => (
                      <Grid key={f.label} size={{ xs: 6 }}>
                        <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">{f.label}</Typography>
                        <Typography fontSize={14} fontWeight={700} color={f.label === 'Estado' ? color : '#1E293B'}>{f.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ bgcolor: color + '10', border: `1px solid ${color}40`, borderRadius: 1.5, p: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color={color}>MOTIVO</Typography>
                    <Typography variant="body2" color="#334155" sx={{ fontSize: '0.88rem', lineHeight: 1.6, mt: 0.5 }}>{r.reason}</Typography>
                  </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setSelectedChange(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                  <Button
                    variant="contained" startIcon={<CalendarIcon />}
                    onClick={() => { const a = r.asset; setSelectedChange(null); notify(`Cambio de lubricante programado para ${a}.`); }}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700 }}
                  >
                    Programar cambio
                  </Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* ═══════════ DIALOG — Detalle de muestra de tendencia (VH-001) ═══════════ */}
        <Dialog open={!!selectedTrend} onClose={() => setSelectedTrend(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaper}>
          {selectedTrend && (() => {
            const { sample: t, index } = selectedTrend;
            const prev = index > 0 ? VH001_TREND[index - 1] : null;
            const metrics = [
              { k: 'Fe', v: t.fe, p: prev?.fe, lim: OIL_LIMITS.fe },
              { k: 'Cu', v: t.cu, p: prev?.cu, lim: OIL_LIMITS.cu },
              { k: 'Al', v: t.al, p: prev?.al, lim: OIL_LIMITS.al },
              { k: 'Si', v: t.si, p: prev?.si, lim: OIL_LIMITS.si },
            ];
            const feOverLimit = t.fe > FE_ALERT_LIMIT;
            return (
              <>
                <DialogTitle sx={{ pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <LabIcon sx={{ color: '#2563EB' }} />
                      <Box>
                        <Typography fontSize={12} fontWeight={700} color="#64748B" letterSpacing="0.5px">
                          VH-001 · Motor · muestra {index + 1} de {VH001_TREND.length}
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="#1E293B">{t.date}</Typography>
                        <Typography variant="caption" color="#64748B">Tractocamión Kenworth T800 · Shell Rimula R4X 15W-40</Typography>
                      </Box>
                    </Stack>
                    <IconButton onClick={() => setSelectedTrend(null)} size="small"><CloseIcon /></IconButton>
                  </Stack>
                  <Chip label={`Contaminación ${t.contamination}`} size="small" sx={{ mt: 1, bgcolor: CONTAMINATION_COLORS[t.contamination] + '22', color: CONTAMINATION_COLORS[t.contamination], border: `1px solid ${CONTAMINATION_COLORS[t.contamination]}`, fontWeight: 700, fontSize: '0.62rem' }} />
                </DialogTitle>
                <Divider sx={{ borderColor: '#E5E7EB' }} />
                <DialogContent>
                  <Typography fontSize={13} fontWeight={700} color="#1E293B" mb={1}>
                    Metales de desgaste — variación vs muestra anterior
                  </Typography>
                  <Grid container spacing={1.5} mb={2}>
                    {metrics.map(m => {
                      const color = m.v >= m.lim.crit ? '#DC2626' : m.v >= m.lim.warn ? '#CA8A04' : '#16A34A';
                      const delta = m.p != null ? m.v - m.p : null;
                      return (
                        <Grid key={m.k} size={{ xs: 6 }}>
                          <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 1.5, p: 1.25 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                              <Typography fontSize={11} fontWeight={700} color="#64748B">{m.lim.label}</Typography>
                              <Typography fontSize={18} fontWeight={900} color={color}>{m.v}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" mt={0.25}>
                              <Typography fontSize={9} color="#94A3B8">límite {m.lim.crit} {m.lim.unit}</Typography>
                              {delta != null && (
                                <Typography fontSize={10} fontWeight={700} color={delta > 0 ? '#DC2626' : delta < 0 ? '#16A34A' : '#94A3B8'}>
                                  {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '= 0'}
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                  <Box sx={{ bgcolor: feOverLimit ? '#DC262610' : '#16A34A10', border: `1px solid ${feOverLimit ? '#DC262640' : '#16A34A40'}`, borderRadius: 1.5, p: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color={feOverLimit ? '#DC2626' : '#16A34A'} sx={{ display: 'block', mb: 0.5 }}>
                      {feOverLimit ? 'HIERRO SOBRE LÍMITE DE ALERTA' : 'HIERRO EN RANGO'}
                    </Typography>
                    <Typography variant="body2" color="#334155" sx={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {feOverLimit
                        ? `El hierro (${t.fe} ppm) supera el límite de ${FE_ALERT_LIMIT} ppm.${prev ? ` Incremento de ${t.fe - prev.fe} ppm respecto a la muestra anterior (${prev.date}).` : ''} Se recomienda cambio de aceite e inspección del motor.`
                        : `El hierro (${t.fe} ppm) se mantiene por debajo del límite de ${FE_ALERT_LIMIT} ppm.${prev ? ` Variación de ${t.fe - prev.fe >= 0 ? '+' : ''}${t.fe - prev.fe} ppm respecto a la muestra anterior.` : ''} Continuar monitoreo programado.`}
                    </Typography>
                  </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setSelectedTrend(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                  {index === VH001_TREND.length - 1 && (
                    <Button
                      variant="contained" startIcon={<LabIcon />}
                      onClick={() => { setSelectedTrend(null); const full = SAMPLES.find(x => x.id === 'MU-001'); if (full) setSelectedSample(full); }}
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700 }}
                    >
                      Ver boletín completo
                    </Button>
                  )}
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* ═══════════ DIALOG — Nuevo punto de lubricación ═══════════ */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth scroll="paper" PaperProps={dialogPaper}>
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <OilIcon sx={{ color: EAM_COLOR }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#1E293B">Nuevo punto de lubricación</Typography>
                  <Typography variant="caption" color="#64748B">Registra un punto en el plan seleccionando activo, lubricante y frecuencia</Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => setCreateOpen(false)} size="small" sx={{ color: 'grey.500' }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
            </Stack>
          </DialogTitle>
          <Divider sx={{ borderColor: '#E5E7EB' }} />
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {/* Activo + nombre autocompletado */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth size="small" label="Activo *" value={form.asset}
                  onChange={e => handleAssetChange(e.target.value)}
                  error={triedSubmit && missing.asset}
                  helperText={triedSubmit && missing.asset ? 'Selecciona un activo' : ' '}
                  sx={inputSx}
                >
                  {assetOptions.map(a => (
                    <MenuItem key={a} value={a}>{a}{assetDirectory[a] ? ` — ${assetDirectory[a]}` : ''}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth size="small" label="Nombre del activo" value={form.assetName}
                  InputProps={{ readOnly: true }}
                  helperText="Autocompletado desde el activo"
                  sx={inputSx}
                />
              </Stack>

              {/* Componente + punto */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth size="small" label="Componente *" value={form.component}
                  onChange={e => setForm({ ...form, component: e.target.value })}
                  error={triedSubmit && missing.component}
                  helperText={triedSubmit && missing.component ? 'Selecciona el componente' : ' '}
                  sx={inputSx}
                >
                  {componentOptions.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                <TextField
                  fullWidth size="small" label="Punto de aplicación *" value={form.point}
                  onChange={e => setForm({ ...form, point: e.target.value })}
                  error={triedSubmit && missing.point}
                  helperText={triedSubmit && missing.point ? 'Indica el punto físico de aplicación' : ' '}
                  sx={inputSx}
                />
              </Stack>

              {/* Lubricante */}
              <TextField
                select fullWidth size="small" label="Lubricante *" value={form.lubricant}
                onChange={e => setForm({ ...form, lubricant: e.target.value })}
                error={triedSubmit && missing.lubricant}
                helperText={triedSubmit && missing.lubricant ? 'Selecciona el lubricante' : ' '}
                sx={inputSx}
              >
                {lubricantOptions.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>

              {/* Método + cantidad (valor numérico + unidad) */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth size="small" label="Método de aplicación" value={form.method}
                  onChange={e => setForm({ ...form, method: e.target.value })}
                  helperText=" " sx={inputSx}
                >
                  {METHOD_OPTIONS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
                <TextField
                  fullWidth size="small" type="number" label="Cantidad *" value={form.quantityValue}
                  onChange={e => setForm({ ...form, quantityValue: e.target.value })}
                  error={triedSubmit && missing.quantityValue}
                  helperText={triedSubmit && missing.quantityValue ? 'Cantidad mayor a 0' : ' '}
                  InputProps={{ inputProps: { min: 0, step: 'any' } }}
                  sx={inputSx}
                />
                <TextField
                  select size="small" label="Unidad" value={form.quantityUnit}
                  onChange={e => setForm({ ...form, quantityUnit: e.target.value })}
                  helperText=" " sx={{ ...inputSx, minWidth: 110 }}
                >
                  {QUANTITY_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Stack>

              {/* Frecuencia + ciclo en días */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth size="small" label="Frecuencia *" placeholder="Ej. Cada 15.000 km" value={form.frequency}
                  onChange={e => setForm({ ...form, frequency: e.target.value })}
                  error={triedSubmit && missing.frequency}
                  helperText={triedSubmit && missing.frequency ? 'Indica la frecuencia programada' : ' '}
                  sx={inputSx}
                />
                <TextField
                  fullWidth size="small" type="number" label="Ciclo (días) *" value={form.frequencyDays}
                  onChange={e => setForm({ ...form, frequencyDays: e.target.value })}
                  error={triedSubmit && missing.frequencyDays}
                  helperText={triedSubmit && missing.frequencyDays ? 'Días mayor a 0' : 'Días entre aplicaciones'}
                  InputProps={{ inputProps: { min: 1, step: 1 } }}
                  sx={inputSx}
                />
              </Stack>

              {/* Responsable */}
              <TextField
                select fullWidth size="small" label="Responsable *" value={form.responsible}
                onChange={e => setForm({ ...form, responsible: e.target.value })}
                error={triedSubmit && missing.responsible}
                helperText={triedSubmit && missing.responsible ? 'Asigna un responsable' : ' '}
                sx={inputSx}
              >
                {responsibleOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>

              {/* Observaciones */}
              <TextField
                fullWidth size="small" multiline minRows={2} label="Observaciones" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                helperText=" " sx={inputSx}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
            <Button
              variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!formValid}
              sx={{
                bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700,
                '&.Mui-disabled': { bgcolor: '#CBD5E1', color: '#FFFFFF' },
              }}
            >
              Agregar al plan
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snack.open}
          autoHideDuration={3500}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontWeight: 600 }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
