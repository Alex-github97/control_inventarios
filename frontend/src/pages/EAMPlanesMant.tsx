import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, Grid,
  Stack, LinearProgress, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, TextField, MenuItem,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Snackbar, Alert, alpha, Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  EventRepeat as FreqIcon,
  Handyman as TaskIcon,
  Inventory2 as PartsIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  FileDownload as ExportIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  Straighten as CalibrationIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
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

type PlanType = 'TIEMPO' | 'USO' | 'CONDICIÓN';
type OTType = 'PREVENTIVA' | 'INSPECCION' | 'PREDICTIVA' | 'CALIBRACION';

interface PlanTask {
  descripcion: string;
  duracion: string;   // ej. "30 min"
  especialidad: string;
}

interface PlanPart {
  nombre: string;
  cantidad: string;
  costoUnit: string;  // "$45,000"
}

interface PlanHistory {
  fecha: string;
  ot: string;
  tecnico: string;
  resultado: 'CUMPLIDO' | 'CUMPLIDO CON HALLAZGOS' | 'REPROGRAMADO';
}

interface Plan {
  id: string;
  name: string;
  asset: string;
  assetType: string;
  frequency: string;
  otType: OTType;
  planType: PlanType;
  lastFulfillment: string;
  nextDueDate: string;
  daysRemaining: number;
  compliance: number;
  // Datos enriquecidos
  responsable: string;
  duracionEstimada: string;
  costoEstimado: string;
  activosCubiertos: string[];
  tareas: PlanTask[];
  repuestos: PlanPart[];
  historial: PlanHistory[];
  descripcion: string;
  ordenesGeneradas: number;
}

const PLANS_MOCK: Plan[] = [
  {
    id: 'PM-001', name: 'Cambio de aceite motor VH-001', asset: 'VH-001', assetType: 'Vehículo',
    frequency: 'Cada 5.000 km', otType: 'PREVENTIVA', planType: 'USO',
    lastFulfillment: '2026-04-15', nextDueDate: '2026-06-23', daysRemaining: 3, compliance: 95,
    responsable: 'Jorge Méndez', duracionEstimada: '2h', costoEstimado: '$850,000', ordenesGeneradas: 18,
    descripcion: 'Cambio de aceite sintético y filtro de aceite del motor. Verificación de niveles y fugas.',
    activosCubiertos: ['VH-001 — Tractocamión Kenworth T800'],
    tareas: [
      { descripcion: 'Drenar aceite usado y recolectar en contenedor', duracion: '20 min', especialidad: 'Mecánica' },
      { descripcion: 'Reemplazar filtro de aceite', duracion: '15 min', especialidad: 'Mecánica' },
      { descripcion: 'Rellenar con aceite sintético 15W-40', duracion: '15 min', especialidad: 'Mecánica' },
      { descripcion: 'Verificar niveles y ausencia de fugas', duracion: '20 min', especialidad: 'Inspección' },
      { descripcion: 'Registrar odómetro y sellar OT', duracion: '10 min', especialidad: 'Administrativa' },
    ],
    repuestos: [
      { nombre: 'Aceite sintético 15W-40', cantidad: '18 L', costoUnit: '$32,000' },
      { nombre: 'Filtro de aceite CUMMINS', cantidad: '1', costoUnit: '$85,000' },
    ],
    historial: [
      { fecha: '2026-04-15', ot: 'OT-2026-0074', tecnico: 'Luis Vargas', resultado: 'CUMPLIDO' },
      { fecha: '2026-01-20', ot: 'OT-2026-0012', tecnico: 'Jorge Méndez', resultado: 'CUMPLIDO' },
      { fecha: '2025-10-08', ot: 'OT-2025-0301', tecnico: 'Luis Vargas', resultado: 'CUMPLIDO CON HALLAZGOS' },
    ],
  },
  {
    id: 'PM-002', name: 'Cambio de filtros flota', asset: 'Flota General', assetType: 'Vehículo',
    frequency: 'Cada 3 meses', otType: 'PREVENTIVA', planType: 'TIEMPO',
    lastFulfillment: '2026-03-10', nextDueDate: '2026-07-02', daysRemaining: 12, compliance: 88,
    responsable: 'Carlos Díaz', duracionEstimada: '4h', costoEstimado: '$1,240,000', ordenesGeneradas: 9,
    descripcion: 'Reemplazo programado de filtros de aire y combustible para toda la flota de transporte.',
    activosCubiertos: ['VH-001 — Kenworth T800', 'VH-002 — Freightliner M2-106', 'VH-003 — Ford Ranger'],
    tareas: [
      { descripcion: 'Inspección de estado de filtros actuales', duracion: '30 min', especialidad: 'Inspección' },
      { descripcion: 'Reemplazo filtro de aire por unidad', duracion: '45 min', especialidad: 'Mecánica' },
      { descripcion: 'Reemplazo filtro de combustible por unidad', duracion: '45 min', especialidad: 'Mecánica' },
      { descripcion: 'Prueba de arranque y verificación', duracion: '30 min', especialidad: 'Inspección' },
    ],
    repuestos: [
      { nombre: 'Filtro de aire CUMMINS', cantidad: '3', costoUnit: '$120,000' },
      { nombre: 'Filtro de combustible', cantidad: '3', costoUnit: '$95,000' },
    ],
    historial: [
      { fecha: '2026-03-10', ot: 'OT-2026-0044', tecnico: 'Carlos Díaz', resultado: 'CUMPLIDO' },
      { fecha: '2025-12-11', ot: 'OT-2025-0320', tecnico: 'Carlos Díaz', resultado: 'REPROGRAMADO' },
    ],
  },
  {
    id: 'PM-003', name: 'Revisión hidráulica Montacargas', asset: 'MC-003', assetType: 'Montacargas',
    frequency: 'Cada 250 hrs', otType: 'PREVENTIVA', planType: 'USO',
    lastFulfillment: '2026-05-01', nextDueDate: '2026-07-12', daysRemaining: 22, compliance: 78,
    responsable: 'Luis Vargas', duracionEstimada: '4h', costoEstimado: '$780,000', ordenesGeneradas: 14,
    descripcion: 'Revisión del circuito hidráulico: presiones, mangueras, sellos y nivel de fluido.',
    activosCubiertos: ['MC-003 — Montacargas Toyota 8FGCU25'],
    tareas: [
      { descripcion: 'Medición de presión del circuito hidráulico', duracion: '40 min', especialidad: 'Hidráulica' },
      { descripcion: 'Inspección de mangueras y sellos', duracion: '60 min', especialidad: 'Hidráulica' },
      { descripcion: 'Verificación y ajuste de nivel de fluido', duracion: '30 min', especialidad: 'Hidráulica' },
      { descripcion: 'Prueba funcional de elevación', duracion: '30 min', especialidad: 'Inspección' },
    ],
    repuestos: [
      { nombre: 'Fluido hidráulico ISO 46', cantidad: '10 L', costoUnit: '$28,000' },
      { nombre: 'Kit de sellos hidráulicos', cantidad: '1', costoUnit: '$180,000' },
    ],
    historial: [
      { fecha: '2026-05-01', ot: 'OT-2026-0061', tecnico: 'Luis Vargas', resultado: 'CUMPLIDO CON HALLAZGOS' },
      { fecha: '2026-02-14', ot: 'OT-2026-0028', tecnico: 'Luis Vargas', resultado: 'CUMPLIDO' },
    ],
  },
  {
    id: 'PM-004', name: 'Inspección eléctrica general', asset: 'Instalaciones', assetType: 'Infraestructura',
    frequency: 'Mensual', otType: 'INSPECCION', planType: 'TIEMPO',
    lastFulfillment: '2026-05-20', nextDueDate: '2026-06-25', daysRemaining: 5, compliance: 91,
    responsable: 'Ana Rojas', duracionEstimada: '3h', costoEstimado: '$250,000', ordenesGeneradas: 24,
    descripcion: 'Inspección de tableros, tomas y luminarias de las instalaciones. Termografía puntual.',
    activosCubiertos: ['BD-01 — Bodega Principal Bogotá', 'Instalaciones Administrativas'],
    tareas: [
      { descripcion: 'Inspección visual de tableros eléctricos', duracion: '60 min', especialidad: 'Eléctrica' },
      { descripcion: 'Medición de tensión y balance de fases', duracion: '45 min', especialidad: 'Eléctrica' },
      { descripcion: 'Verificación de luminarias y tomas', duracion: '45 min', especialidad: 'Eléctrica' },
      { descripcion: 'Registro fotográfico de hallazgos', duracion: '30 min', especialidad: 'Administrativa' },
    ],
    repuestos: [
      { nombre: 'Cinta aislante 3M', cantidad: '2', costoUnit: '$8,000' },
    ],
    historial: [
      { fecha: '2026-05-20', ot: 'OT-2026-0069', tecnico: 'Ana Rojas', resultado: 'CUMPLIDO' },
      { fecha: '2026-04-18', ot: 'OT-2026-0052', tecnico: 'Ana Rojas', resultado: 'CUMPLIDO' },
      { fecha: '2026-03-19', ot: 'OT-2026-0039', tecnico: 'Ana Rojas', resultado: 'CUMPLIDO' },
    ],
  },
  {
    id: 'PM-005', name: 'Termografía tableros eléctricos', asset: 'Tableros Eléctricos', assetType: 'Infraestructura',
    frequency: 'Semestral', otType: 'PREDICTIVA', planType: 'TIEMPO',
    lastFulfillment: '2025-12-10', nextDueDate: '2026-08-04', daysRemaining: 45, compliance: 100,
    responsable: 'Ana Rojas', duracionEstimada: '2h', costoEstimado: '$420,000', ordenesGeneradas: 4,
    descripcion: 'Análisis termográfico de tableros para detectar puntos calientes y conexiones defectuosas.',
    activosCubiertos: ['Tablero General TG-01', 'Tablero Distribución TD-02'],
    tareas: [
      { descripcion: 'Captura termográfica bajo carga', duracion: '60 min', especialidad: 'Predictivo' },
      { descripcion: 'Análisis de imágenes y puntos calientes', duracion: '40 min', especialidad: 'Predictivo' },
      { descripcion: 'Elaboración de informe termográfico', duracion: '20 min', especialidad: 'Administrativa' },
    ],
    repuestos: [],
    historial: [
      { fecha: '2025-12-10', ot: 'OT-2025-0318', tecnico: 'Ana Rojas', resultado: 'CUMPLIDO' },
    ],
  },
  {
    id: 'PM-006', name: 'Inspección cubierta Bodega Bogotá', asset: 'Bodega Bogotá', assetType: 'Infraestructura',
    frequency: 'Trimestral', otType: 'INSPECCION', planType: 'TIEMPO',
    lastFulfillment: '2026-03-15', nextDueDate: '2026-06-28', daysRemaining: 8, compliance: 84,
    responsable: 'Pedro Torres', duracionEstimada: '3h', costoEstimado: '$180,000', ordenesGeneradas: 7,
    descripcion: 'Inspección de cubierta, canaletas y estructura de techo para prevenir filtraciones.',
    activosCubiertos: ['BD-01 — Bodega Principal Bogotá'],
    tareas: [
      { descripcion: 'Inspección de láminas y sellos de cubierta', duracion: '60 min', especialidad: 'Civil' },
      { descripcion: 'Limpieza y revisión de canaletas', duracion: '60 min', especialidad: 'Civil' },
      { descripcion: 'Revisión de estructura y anclajes', duracion: '60 min', especialidad: 'Civil' },
    ],
    repuestos: [
      { nombre: 'Sellante poliuretano', cantidad: '4', costoUnit: '$22,000' },
    ],
    historial: [
      { fecha: '2026-03-15', ot: 'OT-2026-0046', tecnico: 'Pedro Torres', resultado: 'CUMPLIDO CON HALLAZGOS' },
      { fecha: '2025-12-14', ot: 'OT-2025-0322', tecnico: 'Pedro Torres', resultado: 'CUMPLIDO' },
    ],
  },
  {
    id: 'PM-007', name: 'Calibración básculas', asset: 'Básculas Piso', assetType: 'Equipo',
    frequency: 'Anual', otType: 'CALIBRACION', planType: 'TIEMPO',
    lastFulfillment: '2025-06-20', nextDueDate: '2026-08-26', daysRemaining: 67, compliance: 100,
    responsable: 'Proveedor externo — MetroCal', duracionEstimada: '5h', costoEstimado: '$1,100,000', ordenesGeneradas: 3,
    descripcion: 'Calibración certificada de básculas de piso con patrones trazables ONAC.',
    activosCubiertos: ['Báscula Piso B-01', 'Báscula Piso B-02'],
    tareas: [
      { descripcion: 'Verificación con pesas patrón', duracion: '120 min', especialidad: 'Metrología' },
      { descripcion: 'Ajuste de span y cero', duracion: '90 min', especialidad: 'Metrología' },
      { descripcion: 'Emisión de certificado de calibración', duracion: '90 min', especialidad: 'Administrativa' },
    ],
    repuestos: [],
    historial: [
      { fecha: '2025-06-20', ot: 'OT-2025-0180', tecnico: 'MetroCal', resultado: 'CUMPLIDO' },
    ],
  },
  {
    id: 'PM-008', name: 'Limpieza técnica compresores', asset: 'CMP-07', assetType: 'Equipo',
    frequency: 'Mensual', otType: 'PREVENTIVA', planType: 'CONDICIÓN',
    lastFulfillment: '2026-05-20', nextDueDate: '2026-06-22', daysRemaining: 2, compliance: 72,
    responsable: 'Jorge Méndez', duracionEstimada: '2h', costoEstimado: '$320,000', ordenesGeneradas: 11,
    descripcion: 'Limpieza de radiadores, cambio de filtro de aire y verificación de presión del compresor.',
    activosCubiertos: ['CMP-07 — Compresor Atlas Copco GA22'],
    tareas: [
      { descripcion: 'Limpieza de radiador y aletas', duracion: '40 min', especialidad: 'Mecánica' },
      { descripcion: 'Cambio de filtro de aire', duracion: '20 min', especialidad: 'Mecánica' },
      { descripcion: 'Verificación de presión de trabajo', duracion: '30 min', especialidad: 'Inspección' },
      { descripcion: 'Purga de condensados', duracion: '30 min', especialidad: 'Mecánica' },
    ],
    repuestos: [
      { nombre: 'Filtro de aire compresor', cantidad: '1', costoUnit: '$140,000' },
    ],
    historial: [
      { fecha: '2026-05-20', ot: 'OT-2026-0067', tecnico: 'Jorge Méndez', resultado: 'CUMPLIDO' },
      { fecha: '2026-04-19', ot: 'OT-2026-0053', tecnico: 'Jorge Méndez', resultado: 'CUMPLIDO CON HALLAZGOS' },
    ],
  },
];

const OT_COLORS: Record<OTType, string> = {
  PREVENTIVA: '#3B82F6',
  INSPECCION: '#8B5CF6',
  PREDICTIVA: '#10B981',
  CALIBRACION: '#F59E0B',
};

const PLAN_TYPE_COLORS: Record<PlanType, string> = {
  TIEMPO: '#6366F1',
  USO: '#0EA5E9',
  CONDICIÓN: '#14B8A6',
};

const RESULTADO_COLOR: Record<PlanHistory['resultado'], string> = {
  'CUMPLIDO': '#16A34A',
  'CUMPLIDO CON HALLAZGOS': '#CA8A04',
  'REPROGRAMADO': '#DC2626',
};

const RESPONSABLES = ['Jorge Méndez', 'Luis Vargas', 'Ana Rojas', 'Carlos Díaz', 'Pedro Torres', 'Proveedor externo — MetroCal'];

function DaysChip({ days }: { days: number }) {
  if (days <= 7) return <Chip label="URGENTE" size="small" sx={{ bgcolor: '#DC2626', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
  if (days <= 15) return <Chip label="PRONTO" size="small" sx={{ bgcolor: '#32AC5C', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
  if (days <= 30) return <Chip label="PRÓXIMO" size="small" sx={{ bgcolor: '#CA8A04', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
  return <Chip label="OK" size="small" sx={{ bgcolor: '#16A34A', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />;
}

const COMPLIANCE_MONTHLY = [
  { month: 'Ene', value: 81 },
  { month: 'Feb', value: 85 },
  { month: 'Mar', value: 79 },
  { month: 'Abr', value: 88 },
  { month: 'May', value: 90 },
  { month: 'Jun', value: 87 },
];

const ASSET_TYPE_COMPLIANCE = [
  { type: 'Vehículos', compliance: 92 },
  { type: 'Montacargas', compliance: 78 },
  { type: 'Infraestructura', compliance: 84 },
  { type: 'Equipos', compliance: 89 },
];

interface NewPlanForm {
  name: string;
  asset: string;
  assetType: string;
  frequency: string;
  otType: OTType;
  planType: PlanType;
  responsable: string;
  duracionEstimada: string;
  costoEstimado: string;
  nextDueDate: string;
  descripcion: string;
}

const EMPTY_FORM: NewPlanForm = {
  name: '', asset: '', assetType: 'Vehículo', frequency: '', otType: 'PREVENTIVA',
  planType: 'TIEMPO', responsable: '', duracionEstimada: '', costoEstimado: '',
  nextDueDate: '', descripcion: '',
};

// Estilos de inputs (tema claro, acento EAM)
const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#1E293B' },
  '& label': { color: '#64748B' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.25)' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,172,92,0.5)' },
  '& .MuiSvgIcon-root': { color: '#94A3B8' },
};

export default function EAMPlanesMant() {
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState<Plan[]>(PLANS_MOCK);

  // Filtros / búsqueda
  const [search, setSearch] = useState('');
  const [filterOtType, setFilterOtType] = useState('Todos');
  const [filterAssetType, setFilterAssetType] = useState('Todos');
  const [filterUrgencia, setFilterUrgencia] = useState('Todos');

  // Detalle
  const [selected, setSelected] = useState<Plan | null>(null);

  // Crear plan
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewPlanForm>(EMPTY_FORM);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' });
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev });

  const resetFiltros = () => {
    setSearch(''); setFilterOtType('Todos'); setFilterAssetType('Todos'); setFilterUrgencia('Todos');
  };
  const hayFiltros = search || filterOtType !== 'Todos' || filterAssetType !== 'Todos' || filterUrgencia !== 'Todos';

  const assetTypes = useMemo(() => Array.from(new Set(plans.map(p => p.assetType))), [plans]);
  const assetOptions = useMemo(() => Array.from(new Set(plans.map(p => p.asset))).filter(Boolean).sort(), [plans]);
  const assetTypeByCode = useMemo(() => {
    const m: Record<string, string> = {};
    plans.forEach(p => { if (p.asset) m[p.asset] = p.assetType; });
    return m;
  }, [plans]);

  const filteredPlans = useMemo(() => plans.filter(p => {
    if (filterOtType !== 'Todos' && p.otType !== filterOtType) return false;
    if (filterAssetType !== 'Todos' && p.assetType !== filterAssetType) return false;
    if (filterUrgencia === 'URGENTE' && p.daysRemaining > 7) return false;
    if (filterUrgencia === 'PRONTO' && (p.daysRemaining <= 7 || p.daysRemaining > 15)) return false;
    if (filterUrgencia === 'OK' && p.daysRemaining <= 15) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.asset.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [plans, filterOtType, filterAssetType, filterUrgencia, search]);

  const grouped: Record<PlanType, Plan[]> = { TIEMPO: [], USO: [], CONDICIÓN: [] };
  filteredPlans.forEach(p => grouped[p.planType].push(p));

  const sorted = [...filteredPlans].sort((a, b) => a.daysRemaining - b.daysRemaining);

  const setField = (field: keyof NewPlanForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const openCreate = () => { setForm(EMPTY_FORM); setTriedSubmit(false); setCreateOpen(true); };

  const handleCreate = () => {
    if (!form.name.trim() || !form.asset) {
      setTriedSubmit(true);
      notify('Complete los campos obligatorios: nombre y activo', 'warning');
      return;
    }
    const nextNum = plans.length + 1;
    const newPlan: Plan = {
      id: `PM-${String(nextNum).padStart(3, '0')}`,
      name: form.name || 'Nuevo plan de mantenimiento',
      asset: form.asset || 'Sin asignar',
      assetType: form.assetType,
      frequency: form.frequency || 'Por definir',
      otType: form.otType,
      planType: form.planType,
      lastFulfillment: '—',
      nextDueDate: form.nextDueDate || '—',
      daysRemaining: form.nextDueDate ? Math.max(0, Math.ceil((new Date(form.nextDueDate).getTime() - Date.now()) / 86400000)) : 30,
      compliance: 100,
      responsable: form.responsable || 'Sin asignar',
      duracionEstimada: form.duracionEstimada || '—',
      costoEstimado: form.costoEstimado ? (form.costoEstimado.startsWith('$') ? form.costoEstimado : `$${form.costoEstimado}`) : '$0',
      ordenesGeneradas: 0,
      descripcion: form.descripcion || 'Sin descripción.',
      activosCubiertos: form.asset ? [form.asset] : [],
      tareas: [],
      repuestos: [],
      historial: [],
    };
    setPlans(prev => [newPlan, ...prev]);
    setCreateOpen(false);
    notify(`Plan ${newPlan.id} creado correctamente`, 'success');
  };

  const handleDelete = (plan: Plan) => {
    setPlans(prev => prev.filter(p => p.id !== plan.id));
    setSelected(null);
    notify(`Plan ${plan.id} eliminado`, 'warning');
  };

  const handleGenerateOT = (plan: Plan) => {
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ordenesGeneradas: p.ordenesGeneradas + 1 } : p));
    notify(`OT generada desde el plan ${plan.id}`, 'success');
  };

  const totalCostoRepuestos = (plan: Plan) => plan.repuestos.reduce((s, r) => {
    const qty = parseFloat(r.cantidad) || 1;
    const prc = parseFloat(r.costoUnit.replace(/[^0-9.]/g, '')) || 0;
    return s + qty * prc;
  }, 0);

  const PlanCard = ({ plan }: { plan: Plan }) => (
    <Card
      onClick={() => setSelected(plan)}
      sx={{
        border: `1px solid ${plan.daysRemaining <= 7 ? '#DC2626' : plan.daysRemaining <= 15 ? EAM_COLOR : '#E5E7EB'}`,
        borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s',
        '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.10)', transform: 'translateY(-2px)', borderColor: EAM_COLOR },
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box sx={{ flex: 1, pr: 1 }}>
            <Typography variant="caption" sx={{ color: EAM_COLOR, fontWeight: 800, letterSpacing: 0.5 }}>{plan.id}</Typography>
            <Typography variant="subtitle2" sx={{ color: '#1E293B', fontWeight: 700 }}>{plan.name}</Typography>
          </Box>
          <DaysChip days={plan.daysRemaining} />
        </Stack>
        <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
          <Chip label={plan.otType} size="small" sx={{ bgcolor: OT_COLORS[plan.otType] + '22', color: OT_COLORS[plan.otType], border: `1px solid ${OT_COLORS[plan.otType]}`, fontSize: '0.65rem', fontWeight: 600 }} />
          <Chip label={plan.assetType} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: '0.65rem' }} />
        </Stack>
        <Grid container spacing={1} mb={1.5}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Activo</Typography>
            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>{plan.asset}</Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Frecuencia</Typography>
            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>{plan.frequency}</Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Responsable</Typography>
            <Typography variant="body2" sx={{ color: '#334155' }} noWrap>{plan.responsable}</Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Próximo vencimiento</Typography>
            <Typography variant="body2" sx={{ color: plan.daysRemaining <= 7 ? '#DC2626' : plan.daysRemaining <= 15 ? '#D97706' : '#334155', fontWeight: 700 }}>
              {plan.nextDueDate} ({plan.daysRemaining}d)
            </Typography>
          </Grid>
        </Grid>
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Cumplimiento</Typography>
            <Typography variant="caption" sx={{ color: plan.compliance >= 90 ? '#16A34A' : plan.compliance >= 75 ? '#CA8A04' : '#DC2626', fontWeight: 700 }}>
              {plan.compliance}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={plan.compliance}
            sx={{
              height: 6, borderRadius: 3, bgcolor: '#E5E7EB',
              '& .MuiLinearProgress-bar': {
                bgcolor: plan.compliance >= 90 ? '#16A34A' : plan.compliance >= 75 ? '#CA8A04' : '#DC2626',
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  // ── Bloque reutilizable de campos con etiqueta para el detalle ──
  const InfoTile = ({ label, value, color = '#1E293B' }: { label: string; value: React.ReactNode; color?: string }) => (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
      <Typography fontSize={10} color="#64748B" fontWeight={600} letterSpacing="0.04em" textTransform="uppercase" mb={0.25}>{label}</Typography>
      <Typography fontSize={13} fontWeight={600} sx={{ color }}>{value}</Typography>
    </Box>
  );

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh', background: '#F8FAFC' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ width: 6, height: 36, bgcolor: EAM_COLOR, borderRadius: 1 }} />
            <Typography variant="h4" sx={{ color: EAM_COLOR, fontWeight: 700 }}>
              Planes de Mantenimiento
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={() => notify('Exportando planes a Excel...', 'info')}
              sx={{ borderColor: 'rgba(50,172,92,0.4)', color: EAM_DARK, borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) } }}
            >
              Exportar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700 }}
            >
              Nuevo plan
            </Button>
          </Stack>
        </Stack>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Gestión y seguimiento de planes preventivos, predictivos y de calibración
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: '#9CA3AF', fontWeight: 600 },
              '& .Mui-selected': { color: EAM_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR },
            }}
          >
            <Tab label="Planes Activos" />
            <Tab label="Calendario de Vencimientos" />
            <Tab label="Cumplimiento" />
          </Tabs>
        </Box>

        {/* Barra de filtros (Tabs 0 y 1) */}
        {(tab === 0 || tab === 1) && (
          <Card sx={{ border: '1px solid rgba(50,172,92,0.15)', borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                <TextField
                  size="small" placeholder="Buscar por nombre, activo o código..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  sx={{ minWidth: 240, flex: '1 1 240px', ...inputSx }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                />
                <TextField select size="small" label="Tipo de OT" value={filterOtType}
                  onChange={(e) => setFilterOtType(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                  {['Todos', 'PREVENTIVA', 'INSPECCION', 'PREDICTIVA', 'CALIBRACION'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Tipo de activo" value={filterAssetType}
                  onChange={(e) => setFilterAssetType(e.target.value)} sx={{ minWidth: 170, ...inputSx }}>
                  <MenuItem value="Todos">Todos</MenuItem>
                  {assetTypes.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Urgencia" value={filterUrgencia}
                  onChange={(e) => setFilterUrgencia(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                  {[['Todos', 'Todas'], ['URGENTE', 'Urgente (≤7d)'], ['PRONTO', 'Pronto (8-15d)'], ['OK', 'A tiempo (>15d)']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  {filteredPlans.length} de {plans.length} planes
                </Typography>
                {hayFiltros && (
                  <Button size="small" variant="outlined" onClick={resetFiltros}
                    sx={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', '&:hover': { bgcolor: alpha('#EF4444', 0.08), borderColor: '#EF4444' }, fontWeight: 600, fontSize: 11 }}>
                    Limpiar
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* TAB 0 — Planes Activos */}
        <TabPanel value={tab} index={0}>
          {filteredPlans.length === 0 && (
            <Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 6 }}>
              No hay planes que coincidan con los filtros.
            </Typography>
          )}
          {(['TIEMPO', 'USO', 'CONDICIÓN'] as PlanType[]).map(type => (
            grouped[type].length > 0 && (
              <Box key={type} mb={4}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Chip
                    label={type}
                    size="small"
                    sx={{ bgcolor: PLAN_TYPE_COLORS[type], color: '#fff', fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1 }}
                  />
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    {grouped[type].length} plan(es)
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  {grouped[type].map(plan => (
                    <Grid key={plan.id} size={{ xs: 12, md: 6 }}>
                      <PlanCard plan={plan} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )
          ))}
        </TabPanel>

        {/* TAB 1 — Calendario de Vencimientos */}
        <TabPanel value={tab} index={1}>
          <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>
            Vencimientos ordenados por urgencia
          </Typography>
          <Stack spacing={2}>
            {sorted.map(plan => (
              <Card
                key={plan.id}
                onClick={() => setSelected(plan)}
                sx={{
                  border: `1px solid ${plan.daysRemaining <= 7 ? '#DC262640' : plan.daysRemaining <= 15 ? '#32AC5C40' : '#E5E7EB'}`,
                  borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                  '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.10)', borderColor: EAM_COLOR },
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{
                      minWidth: 64, height: 64, borderRadius: 2, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      bgcolor: plan.daysRemaining <= 7 ? '#DC262620' : plan.daysRemaining <= 15 ? '#32AC5C20' : plan.daysRemaining <= 30 ? '#CA8A0420' : '#16A34A20',
                      border: `2px solid ${plan.daysRemaining <= 7 ? '#DC2626' : plan.daysRemaining <= 15 ? '#32AC5C' : plan.daysRemaining <= 30 ? '#CA8A04' : '#16A34A'}`,
                    }}>
                      <Typography sx={{ color: plan.daysRemaining <= 7 ? '#DC2626' : plan.daysRemaining <= 15 ? '#D97706' : plan.daysRemaining <= 30 ? '#CA8A04' : '#16A34A', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>
                        {plan.daysRemaining}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.6rem', fontWeight: 600, letterSpacing: 0.5 }}>DÍAS</Typography>
                    </Box>
                    <Box flex={1}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Typography variant="subtitle2" sx={{ color: '#1E293B', fontWeight: 700 }}>{plan.name}</Typography>
                        <DaysChip days={plan.daysRemaining} />
                      </Stack>
                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Activo: <Box component="span" sx={{ color: '#334155', fontWeight: 600 }}>{plan.asset}</Box>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Fecha exacta: <Box component="span" sx={{ color: '#334155', fontWeight: 600 }}>{plan.nextDueDate}</Box>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Tipo: <Box component="span" sx={{ color: OT_COLORS[plan.otType], fontWeight: 600 }}>{plan.otType}</Box>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Responsable: <Box component="span" sx={{ color: '#334155', fontWeight: 600 }}>{plan.responsable}</Box>
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {sorted.length === 0 && (
              <Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 6 }}>
                No hay planes que coincidan con los filtros.
              </Typography>
            )}
          </Stack>
        </TabPanel>

        {/* TAB 2 — Cumplimiento */}
        <TabPanel value={tab} index={2}>
          <Grid container spacing={2} mb={4}>
            {[
              { label: 'Cumplimiento Global', value: '87%', color: '#16A34A', sub: 'de planes activos' },
              { label: 'OTs PM Generadas', value: '245', color: '#2563EB', sub: 'en el período' },
              { label: 'PM Vencidos', value: '12', color: '#DC2626', sub: 'requieren atención' },
              { label: 'Ahorro vs correctivo', value: '$145M', color: '#CA8A04', sub: 'COP acumulado' },
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

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 2 }}>Cumplimiento por tipo de activo</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#E5E7EB', fontWeight: 600 }}>Tipo</TableCell>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#E5E7EB', fontWeight: 600 }}>Cumplimiento</TableCell>
                          <TableCell sx={{ color: '#6B7280', borderColor: '#E5E7EB', fontWeight: 600 }}>Barra</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ASSET_TYPE_COMPLIANCE.map(row => (
                          <TableRow key={row.type}>
                            <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB' }}>{row.type}</TableCell>
                            <TableCell sx={{ borderColor: '#E5E7EB' }}>
                              <Typography sx={{ color: row.compliance >= 90 ? '#16A34A' : row.compliance >= 80 ? '#CA8A04' : '#DC2626', fontWeight: 700 }}>
                                {row.compliance}%
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ borderColor: '#E5E7EB', width: 120 }}>
                              <LinearProgress
                                variant="determinate"
                                value={row.compliance}
                                sx={{
                                  height: 8, borderRadius: 4, bgcolor: '#E5E7EB',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: row.compliance >= 90 ? '#16A34A' : row.compliance >= 80 ? '#CA8A04' : '#DC2626',
                                    borderRadius: 4,
                                  },
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

            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, mb: 3 }}>
                    Cumplimiento mensual — últimos 6 meses
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160, px: 1 }}>
                    {COMPLIANCE_MONTHLY.map(m => (
                      <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: m.value >= 90 ? '#16A34A' : m.value >= 80 ? '#CA8A04' : '#DC2626', fontWeight: 700 }}>
                          {m.value}%
                        </Typography>
                        <Box sx={{
                          width: '100%',
                          height: `${m.value * 1.4}px`,
                          bgcolor: m.value >= 90 ? '#16A34A30' : m.value >= 80 ? '#CA8A0430' : '#DC262630',
                          border: `2px solid ${m.value >= 90 ? '#16A34A' : m.value >= 80 ? '#CA8A04' : '#DC2626'}`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }} />
                        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>{m.month}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ borderColor: '#E5E7EB', mt: 1, mb: 1.5 }} />
                  <Stack direction="row" spacing={2} justifyContent="center">
                    {[{ color: '#16A34A', label: '≥ 90% Excelente' }, { color: '#CA8A04', label: '80-89% Aceptable' }, { color: '#DC2626', label: '< 80% Requiere acción' }].map(l => (
                      <Stack key={l.label} direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: l.color }} />
                        <Typography variant="caption" sx={{ color: '#6B7280' }}>{l.label}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>

      {/* ── Dialog: DETALLE DEL PLAN ── */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { bgcolor: '#FFFFFF', border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, borderRadius: '16px' } }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(OT_COLORS[selected.otType], 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected.otType === 'CALIBRACION' ? <CalibrationIcon sx={{ color: OT_COLORS[selected.otType] }} />
                    : selected.otType === 'PREDICTIVA' ? <BoltIcon sx={{ color: OT_COLORS[selected.otType] }} />
                    : <TaskIcon sx={{ color: OT_COLORS[selected.otType] }} />}
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={13} fontWeight={800} color={EAM_COLOR}>{selected.id}</Typography>
                    <DaysChip days={selected.daysRemaining} />
                  </Stack>
                  <Typography fontSize={15} fontWeight={700} color="#1E293B" noWrap>{selected.name}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'grey.500' }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Stack spacing={2}>
                {/* Chips resumen */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={selected.otType} size="small" sx={{ bgcolor: OT_COLORS[selected.otType] + '22', color: OT_COLORS[selected.otType], border: `1px solid ${OT_COLORS[selected.otType]}`, fontWeight: 600 }} />
                  <Chip label={`Tipo: ${selected.planType}`} size="small" sx={{ bgcolor: PLAN_TYPE_COLORS[selected.planType] + '22', color: PLAN_TYPE_COLORS[selected.planType], fontWeight: 600 }} />
                  <Chip label={selected.assetType} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B' }} />
                </Stack>

                {/* Descripción */}
                <Box sx={{ bgcolor: alpha(EAM_COLOR, 0.05), border: `1px solid ${alpha(EAM_COLOR, 0.2)}`, borderRadius: '8px', p: 1.5 }}>
                  <Typography fontSize={13} color="#334155">{selected.descripcion}</Typography>
                </Box>

                {/* Grilla de datos clave */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  <InfoTile label="Frecuencia" value={<Stack direction="row" alignItems="center" spacing={0.5}><FreqIcon sx={{ fontSize: 15, color: EAM_COLOR }} /><span>{selected.frequency}</span></Stack>} />
                  <InfoTile label="Duración estimada" value={<Stack direction="row" alignItems="center" spacing={0.5}><ScheduleIcon sx={{ fontSize: 15, color: EAM_COLOR }} /><span>{selected.duracionEstimada}</span></Stack>} />
                  <InfoTile label="Costo estimado" value={selected.costoEstimado} color="#16A34A" />
                  <InfoTile label="Responsable" value={<Stack direction="row" alignItems="center" spacing={0.5}><PersonIcon sx={{ fontSize: 15, color: EAM_COLOR }} /><span>{selected.responsable}</span></Stack>} />
                  <InfoTile label="Último cumplimiento" value={selected.lastFulfillment} />
                  <InfoTile label="Próxima ejecución" value={`${selected.nextDueDate} (${selected.daysRemaining}d)`} color={selected.daysRemaining <= 7 ? '#DC2626' : selected.daysRemaining <= 15 ? '#D97706' : '#1E293B'} />
                  <InfoTile label="Cumplimiento" value={`${selected.compliance}%`} color={selected.compliance >= 90 ? '#16A34A' : selected.compliance >= 75 ? '#CA8A04' : '#DC2626'} />
                  <InfoTile label="OTs generadas" value={String(selected.ordenesGeneradas)} />
                  <InfoTile label="Activos cubiertos" value={String(selected.activosCubiertos.length)} />
                </Box>

                {/* Activos cubiertos */}
                <Box>
                  <Typography fontSize={12} fontWeight={700} color="#1E293B" mb={1} textTransform="uppercase" letterSpacing="0.04em">
                    Activos cubiertos
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selected.activosCubiertos.length === 0 && <Typography fontSize={12} color="#94A3B8">Sin activos asociados.</Typography>}
                    {selected.activosCubiertos.map(a => (
                      <Chip key={a} label={a} size="small" variant="outlined" sx={{ borderColor: '#CBD5E1', color: '#334155', fontSize: '0.7rem' }} />
                    ))}
                  </Stack>
                </Box>

                {/* Tareas / actividades */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <TaskIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">
                      Lista de tareas ({selected.tareas.length})
                    </Typography>
                  </Stack>
                  {selected.tareas.length === 0 ? (
                    <Typography fontSize={12} color="#94A3B8">Aún no se han definido tareas para este plan.</Typography>
                  ) : (
                    <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.06) }}>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>#</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Actividad</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Especialidad</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Duración</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selected.tareas.map((t, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ borderColor: '#E5E7EB' }}>
                                <Avatar sx={{ width: 20, height: 20, bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_COLOR, fontSize: 11, fontWeight: 800 }}>{i + 1}</Avatar>
                              </TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{t.descripcion}</TableCell>
                              <TableCell sx={{ borderColor: '#E5E7EB' }}>
                                <Chip label={t.especialidad} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: '0.65rem' }} />
                              </TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{t.duracion}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                {/* Repuestos requeridos */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <PartsIcon sx={{ fontSize: 16, color: '#2563EB' }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">
                      Repuestos requeridos ({selected.repuestos.length})
                    </Typography>
                  </Stack>
                  {selected.repuestos.length === 0 ? (
                    <Typography fontSize={12} color="#94A3B8">Este plan no requiere repuestos.</Typography>
                  ) : (
                    <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha('#2563EB', 0.06) }}>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }}>Repuesto</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Cantidad</TableCell>
                            <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 11 }} align="right">Costo unit.</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selected.repuestos.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }}>{r.nombre}</TableCell>
                              <TableCell sx={{ color: '#64748B', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{r.cantidad}</TableCell>
                              <TableCell sx={{ color: '#334155', borderColor: '#E5E7EB', fontSize: 12 }} align="right">{r.costoUnit}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                            <TableCell sx={{ color: '#1E293B', borderColor: '#E5E7EB', fontWeight: 700, fontSize: 12 }} colSpan={2}>Total repuestos estimado</TableCell>
                            <TableCell sx={{ color: '#16A34A', borderColor: '#E5E7EB', fontWeight: 800, fontSize: 13 }} align="right">
                              ${totalCostoRepuestos(selected).toLocaleString('es-CO')}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                {/* Historial de ejecuciones */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <HistoryIcon sx={{ fontSize: 16, color: '#8B5CF6' }} />
                    <Typography fontSize={12} fontWeight={700} color="#1E293B" textTransform="uppercase" letterSpacing="0.04em">
                      Historial de ejecuciones ({selected.historial.length})
                    </Typography>
                  </Stack>
                  {selected.historial.length === 0 ? (
                    <Typography fontSize={12} color="#94A3B8">Sin ejecuciones registradas todavía.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {selected.historial.map((h, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', borderRadius: '8px', p: 1.25 }}>
                          <CalendarIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                          <Box sx={{ minWidth: 90 }}>
                            <Typography fontSize={12} fontWeight={700} color="#1E293B">{h.fecha}</Typography>
                            <Typography fontSize={10} color="#64748B">{h.ot}</Typography>
                          </Box>
                          <Typography fontSize={12} color="#334155" sx={{ flex: 1 }}>{h.tecnico}</Typography>
                          <Chip
                            icon={h.resultado === 'CUMPLIDO' ? <CheckIcon sx={{ fontSize: 14 }} /> : undefined}
                            label={h.resultado}
                            size="small"
                            sx={{ bgcolor: alpha(RESULTADO_COLOR[h.resultado], 0.12), color: RESULTADO_COLOR[h.resultado], border: `1px solid ${alpha(RESULTADO_COLOR[h.resultado], 0.35)}`, fontWeight: 700, fontSize: '0.65rem', '& .MuiChip-icon': { color: RESULTADO_COLOR[h.resultado] } }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => handleDelete(selected)}
                sx={{ color: '#EF4444', fontWeight: 600, '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}
              >
                Eliminar plan
              </Button>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => notify(`Abriendo editor de OTs del activo ${selected.asset}`, 'info')}
                  sx={{ borderColor: '#E5E7EB', color: '#64748B', borderRadius: '10px', fontWeight: 600, '&:hover': { borderColor: '#CBD5E1', bgcolor: alpha('#64748B', 0.06) } }}
                >
                  Ver órdenes
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={() => handleGenerateOT(selected)}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, boxShadow: `0 4px 16px ${alpha(EAM_COLOR, 0.35)}` }}
                >
                  Generar OT
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog: NUEVO PLAN ── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
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
              <Typography fontWeight={800} fontSize={16} color="#1E293B">Nuevo plan de mantenimiento</Typography>
              <Typography fontSize={12} color="#64748B">Complete los datos del plan preventivo</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCreateOpen(false)} sx={{ color: 'grey.500' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
          <Stack spacing={2} mt={0.5}>
            <TextField fullWidth size="small" label="Nombre del plan *" value={form.name}
              onChange={(e) => setField('name', e.target.value)} sx={inputSx} placeholder="Ej. Cambio de aceite motor VH-004"
              error={triedSubmit && !form.name.trim()}
              helperText={triedSubmit && !form.name.trim() ? 'El nombre es obligatorio' : ' '} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Activo *" value={form.asset}
                onChange={(e) => { const code = e.target.value; setForm(prev => ({ ...prev, asset: code, assetType: assetTypeByCode[code] ?? prev.assetType })); }}
                error={triedSubmit && !form.asset}
                helperText={triedSubmit && !form.asset ? 'Seleccione el activo' : 'Se autocompleta el tipo'}
                sx={inputSx}>
                {assetOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Tipo de activo" value={form.assetType}
                onChange={(e) => setField('assetType', e.target.value)} sx={inputSx} helperText=" ">
                {['Vehículo', 'Montacargas', 'Infraestructura', 'Equipo'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select fullWidth size="small" label="Tipo de OT" value={form.otType}
                onChange={(e) => setField('otType', e.target.value)} sx={inputSx}>
                {(['PREVENTIVA', 'INSPECCION', 'PREDICTIVA', 'CALIBRACION'] as OTType[]).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select fullWidth size="small" label="Tipo de plan" value={form.planType}
                onChange={(e) => setField('planType', e.target.value)} sx={inputSx}>
                {(['TIEMPO', 'USO', 'CONDICIÓN'] as PlanType[]).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Frecuencia" value={form.frequency}
                onChange={(e) => setField('frequency', e.target.value)} sx={inputSx} placeholder="Ej. Cada 5.000 km / Mensual" />
              <TextField select fullWidth size="small" label="Responsable" value={form.responsable}
                onChange={(e) => setField('responsable', e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {RESPONSABLES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Duración estimada" value={form.duracionEstimada}
                onChange={(e) => setField('duracionEstimada', e.target.value)} sx={inputSx} placeholder="Ej. 2h" />
              <TextField fullWidth size="small" label="Costo estimado" value={form.costoEstimado}
                onChange={(e) => setField('costoEstimado', e.target.value)} sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={13} color="#94A3B8">$</Typography></InputAdornment> }} />
            </Stack>
            <TextField fullWidth size="small" label="Próxima ejecución" type="date" value={form.nextDueDate}
              onChange={(e) => setField('nextDueDate', e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
            <TextField fullWidth size="small" label="Descripción" multiline rows={3} value={form.descripcion}
              onChange={(e) => setField('descripcion', e.target.value)} sx={inputSx}
              placeholder="Alcance del plan, componentes a intervenir, criterios de aceptación..." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)}
            sx={{ color: '#64748B', fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            disabled={!form.name.trim() || !form.asset}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700, px: 3 }}
          >
            Crear plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de confirmaciones */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
