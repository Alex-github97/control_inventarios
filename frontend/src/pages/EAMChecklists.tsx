import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, 
  Stack, Button, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Collapse,
  TextField, MenuItem, InputAdornment, IconButton, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, LinearProgress, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
  CheckCircle as OkIcon,
  ReportProblem as ObsIcon,
  Cancel as FailIcon,
  RadioButtonUnchecked as PendingIcon,
  PlaylistAddCheck as ChecklistIcon,
  FileDownload as ExportIcon,
  Handyman as OTIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Assignment as TemplateIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { exportarPDF, exportarExcel, exportarCSV } from '@/utils/exportar';

const EAM_COLOR = '#32AC5C';
const EAM_DARK = '#27884A';

// ─── Tipos de tema claro ──────────────────────────────────────────────────────
const TXT_PRIMARY = '#1E293B';
const TXT_SECONDARY = '#64748B';
const CARD_BORDER = '#E5E7EB';
const CARD_BG = '#FFFFFF';
const SURFACE = '#F8FAFC';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

type AssetType = 'VEHICULO' | 'MONTACARGAS' | 'INFRAESTRUCTURA' | 'MOTOCICLETA' | 'EQUIPO_TECNOLOGICO' | 'GENERAL';
type QuestionType = 'SI_NO' | 'ESCALA' | 'NUMERICO' | 'TEXTO';
type PointState = 'OK' | 'OBSERVACION' | 'FALLA' | 'PENDIENTE';

interface Question { text: string; type: QuestionType; }
interface Section { name: string; questions: Question[]; }

interface InspectionPoint {
  id: string;
  section: string;
  text: string;
  type: QuestionType;
  state: PointState;
  note?: string;
}

interface Template {
  id: string;
  name: string;
  assetType: AssetType;
  totalQuestions: number;
  totalSections: number;
  sections?: Section[];
  // Datos enriquecidos para el detalle
  frequency: string;
  owner: string;
  lastRun: string;
  lastConformance: number;
  totalRuns: number;
  version: string;
  points: InspectionPoint[];
  linkedAsset: string;
}

interface Execution {
  id: string;
  date: string;
  asset: string;
  template: string;
  executedBy: string;
  conformance: number;
  status: 'APROBADO' | 'OBSERVACION' | 'RECHAZADO';
  // Enriquecido
  duracion?: string;
  turno?: string;
  observaciones?: string;
  points?: InspectionPoint[];
}

interface NonConformance {
  id: string;
  asset: string;
  question: string;
  date: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  status: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA';
  otGenerated: boolean;
  otId?: string;
  // Enriquecido
  detectadoPor?: string;
  template?: string;
  descripcion?: string;
  accion?: string;
  responsable?: string;
}

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  VEHICULO: '#3B82F6',
  MONTACARGAS: '#F59E0B',
  INFRAESTRUCTURA: '#8B5CF6',
  MOTOCICLETA: '#06B6D4',
  EQUIPO_TECNOLOGICO: '#10B981',
  GENERAL: '#6B7280',
};

// ─── Estados de puntos de inspección (tema claro) ──────────────────────────────
const POINT_STATE_META: Record<PointState, { color: string; label: string; Icon: typeof OkIcon }> = {
  OK: { color: EAM_COLOR, label: 'OK', Icon: OkIcon },
  OBSERVACION: { color: '#CA8A04', label: 'Observación', Icon: ObsIcon },
  FALLA: { color: '#DC2626', label: 'Falla', Icon: FailIcon },
  PENDIENTE: { color: '#94A3B8', label: 'Pendiente', Icon: PendingIcon },
};

const PREOPERACIONAL_SECTIONS: Section[] = [
  {
    name: 'MOTOR',
    questions: [
      { text: '¿Aceite en nivel correcto?', type: 'SI_NO' },
      { text: '¿Temperatura normal?', type: 'ESCALA' },
      { text: '¿Sin fugas visibles?', type: 'SI_NO' },
    ],
  },
  {
    name: 'LLANTAS',
    questions: [
      { text: '¿Profundidad mínima OK?', type: 'SI_NO' },
      { text: '¿Presión correcta? (PSI)', type: 'NUMERICO' },
    ],
  },
  {
    name: 'LUCES',
    questions: [
      { text: '¿Frontales funcionando?', type: 'SI_NO' },
      { text: '¿Luces de reversa funcionando?', type: 'SI_NO' },
    ],
  },
];

// Genera puntos de inspección a partir de secciones, con estados determinísticos
function buildPoints(id: string, sections: Section[]): InspectionPoint[] {
  const pts: InspectionPoint[] = [];
  let k = 0;
  sections.forEach((sec) => {
    sec.questions.forEach((q) => {
      const mod = (k + id.length) % 7;
      const state: PointState = mod === 0 ? 'FALLA' : mod === 1 || mod === 4 ? 'OBSERVACION' : 'OK';
      pts.push({
        id: `${id}-P${k + 1}`,
        section: sec.name,
        text: q.text,
        type: q.type,
        state,
        note: state === 'FALLA' ? 'Requiere intervención inmediata' : state === 'OBSERVACION' ? 'Monitorear en próxima inspección' : undefined,
      });
      k++;
    });
  });
  return pts;
}

const MONTACARGAS_SECTIONS: Section[] = [
  { name: 'SISTEMA HIDRÁULICO', questions: [{ text: '¿Sistema hidráulico sin fugas?', type: 'SI_NO' }, { text: '¿Nivel de aceite hidráulico?', type: 'ESCALA' }] },
  { name: 'MÁSTIL Y HORQUILLAS', questions: [{ text: '¿Horquillas sin fisuras?', type: 'SI_NO' }, { text: '¿Cadenas lubricadas?', type: 'SI_NO' }] },
  { name: 'SEGURIDAD', questions: [{ text: '¿Cinturón de seguridad en buen estado?', type: 'SI_NO' }, { text: '¿Alarma de reversa activa?', type: 'SI_NO' }] },
  { name: 'FRENOS', questions: [{ text: '¿Frenos con respuesta correcta?', type: 'ESCALA' }] },
];

const INFRA_SECTIONS: Section[] = [
  { name: 'CUBIERTA', questions: [{ text: '¿Cubierta sin filtraciones visibles?', type: 'SI_NO' }, { text: '¿Canaletas despejadas?', type: 'SI_NO' }] },
  { name: 'ELÉCTRICO', questions: [{ text: '¿Tableros sin sobrecalentamiento?', type: 'ESCALA' }, { text: '¿Iluminación operativa?', type: 'SI_NO' }] },
  { name: 'CONTRA INCENDIOS', questions: [{ text: '¿Extintores vigentes?', type: 'SI_NO' }, { text: '¿Rutas de evacuación libres?', type: 'SI_NO' }] },
];

const MOTO_SECTIONS: Section[] = [
  { name: 'FRENOS', questions: [{ text: '¿Freno delantero responde?', type: 'SI_NO' }, { text: '¿Freno trasero responde?', type: 'SI_NO' }] },
  { name: 'LUCES', questions: [{ text: '¿Direccionales funcionando?', type: 'SI_NO' }] },
  { name: 'NEUMÁTICOS', questions: [{ text: '¿Presión correcta? (PSI)', type: 'NUMERICO' }] },
];

const EQTEC_SECTIONS: Section[] = [
  { name: 'ENERGÍA', questions: [{ text: '¿UPS con capacidad suficiente?', type: 'ESCALA' }, { text: '¿Sin alarmas de PDU?', type: 'SI_NO' }] },
  { name: 'REFRIGERACIÓN', questions: [{ text: '¿Temperatura de rack en rango?', type: 'ESCALA' }] },
  { name: 'CONECTIVIDAD', questions: [{ text: '¿Enlaces redundantes activos?', type: 'SI_NO' }] },
];

const PM_SECTIONS: Section[] = [
  { name: 'GENERAL', questions: [{ text: '¿Presión de trabajo dentro del rango?', type: 'NUMERICO' }, { text: '¿Sin ruido anormal?', type: 'SI_NO' }] },
  { name: 'LUBRICACIÓN', questions: [{ text: '¿Puntos de engrase atendidos?', type: 'SI_NO' }] },
];

const TEMPLATES: Template[] = [
  { id: 'CK-001', name: 'Preoperacional Vehículos', assetType: 'VEHICULO', totalQuestions: 24, totalSections: 5, sections: PREOPERACIONAL_SECTIONS, frequency: 'Diario', owner: 'J. Rodríguez', lastRun: '2026-06-19', lastConformance: 100, totalRuns: 412, version: 'v3.2', linkedAsset: 'VH-001', points: buildPoints('CK-001', PREOPERACIONAL_SECTIONS) },
  { id: 'CK-002', name: 'Inspección Montacargas', assetType: 'MONTACARGAS', totalQuestions: 18, totalSections: 4, sections: MONTACARGAS_SECTIONS, frequency: 'Diario', owner: 'L. Martínez', lastRun: '2026-06-18', lastConformance: 61, totalRuns: 288, version: 'v2.0', linkedAsset: 'MC-003', points: buildPoints('CK-002', MONTACARGAS_SECTIONS) },
  { id: 'CK-003', name: 'Check Cubierta e Infraestructura', assetType: 'INFRAESTRUCTURA', totalQuestions: 32, totalSections: 6, sections: INFRA_SECTIONS, frequency: 'Semanal', owner: 'R. Torres', lastRun: '2026-06-17', lastConformance: 78, totalRuns: 96, version: 'v1.4', linkedAsset: 'Bodega Bogotá', points: buildPoints('CK-003', INFRA_SECTIONS) },
  { id: 'CK-004', name: 'Preoperacional Motocicletas', assetType: 'MOTOCICLETA', totalQuestions: 16, totalSections: 3, sections: MOTO_SECTIONS, frequency: 'Diario', owner: 'A. Silva', lastRun: '2026-06-17', lastConformance: 100, totalRuns: 205, version: 'v1.1', linkedAsset: 'MT-002', points: buildPoints('CK-004', MOTO_SECTIONS) },
  { id: 'CK-005', name: 'Inspección Equipos Tecnológicos', assetType: 'EQUIPO_TECNOLOGICO', totalQuestions: 20, totalSections: 4, sections: EQTEC_SECTIONS, frequency: 'Mensual', owner: 'P. Herrera', lastRun: '2026-06-16', lastConformance: 90, totalRuns: 48, version: 'v2.3', linkedAsset: 'EQ-TEC-05', points: buildPoints('CK-005', EQTEC_SECTIONS) },
  { id: 'CK-006', name: 'Check PM Mensual General', assetType: 'GENERAL', totalQuestions: 28, totalSections: 5, sections: PM_SECTIONS, frequency: 'Mensual', owner: 'F. Moreno', lastRun: '2026-06-16', lastConformance: 68, totalRuns: 60, version: 'v4.0', linkedAsset: 'CMP-07', points: buildPoints('CK-006', PM_SECTIONS) },
];

const EXECUTIONS: Execution[] = [
  { id: 'EJ-001', date: '2026-06-19', asset: 'VH-001', template: 'Preoperacional Vehículos', executedBy: 'J. Rodríguez', conformance: 100, status: 'APROBADO', duracion: '8 min', turno: 'Mañana', observaciones: 'Sin novedades.', points: buildPoints('EJ-001', PREOPERACIONAL_SECTIONS) },
  { id: 'EJ-002', date: '2026-06-19', asset: 'VH-003', template: 'Preoperacional Vehículos', executedBy: 'M. García', conformance: 87, status: 'OBSERVACION', duracion: '12 min', turno: 'Mañana', observaciones: 'Presión de llanta trasera baja.', points: buildPoints('EJ-002', PREOPERACIONAL_SECTIONS) },
  { id: 'EJ-003', date: '2026-06-18', asset: 'MC-003', template: 'Inspección Montacargas', executedBy: 'L. Martínez', conformance: 61, status: 'RECHAZADO', duracion: '15 min', turno: 'Tarde', observaciones: 'Fuga hidráulica detectada, equipo bloqueado.', points: buildPoints('EJ-003', MONTACARGAS_SECTIONS) },
  { id: 'EJ-004', date: '2026-06-18', asset: 'VH-007', template: 'Preoperacional Vehículos', executedBy: 'C. López', conformance: 95, status: 'APROBADO', duracion: '9 min', turno: 'Mañana', observaciones: 'Nivel de refrigerante levemente bajo.', points: buildPoints('EJ-004', PREOPERACIONAL_SECTIONS) },
  { id: 'EJ-005', date: '2026-06-17', asset: 'Bodega Bogotá', template: 'Check Cubierta e Infraestructura', executedBy: 'R. Torres', conformance: 78, status: 'OBSERVACION', duracion: '35 min', turno: 'Mañana', observaciones: 'Filtración leve en cubierta sector C.', points: buildPoints('EJ-005', INFRA_SECTIONS) },
  { id: 'EJ-006', date: '2026-06-17', asset: 'MT-002', template: 'Preoperacional Motocicletas', executedBy: 'A. Silva', conformance: 100, status: 'APROBADO', duracion: '5 min', turno: 'Mañana', observaciones: 'Sin novedades.', points: buildPoints('EJ-006', MOTO_SECTIONS) },
  { id: 'EJ-007', date: '2026-06-16', asset: 'EQ-TEC-05', template: 'Inspección Equipos Tecnológicos', executedBy: 'P. Herrera', conformance: 90, status: 'APROBADO', duracion: '20 min', turno: 'Tarde', observaciones: 'UPS al 88% de capacidad.', points: buildPoints('EJ-007', EQTEC_SECTIONS) },
  { id: 'EJ-008', date: '2026-06-16', asset: 'CMP-07', template: 'Check PM Mensual General', executedBy: 'F. Moreno', conformance: 68, status: 'RECHAZADO', duracion: '28 min', turno: 'Tarde', observaciones: 'Presión fuera de rango, se genera OT.', points: buildPoints('EJ-008', PM_SECTIONS) },
  { id: 'EJ-009', date: '2026-06-15', asset: 'VH-012', template: 'Preoperacional Vehículos', executedBy: 'D. Jiménez', conformance: 83, status: 'OBSERVACION', duracion: '11 min', turno: 'Noche', observaciones: 'Luz de advertencia intermitente.', points: buildPoints('EJ-009', PREOPERACIONAL_SECTIONS) },
  { id: 'EJ-010', date: '2026-06-15', asset: 'MC-001', template: 'Inspección Montacargas', executedBy: 'E. Vargas', conformance: 75, status: 'OBSERVACION', duracion: '16 min', turno: 'Mañana', observaciones: 'Cinturón con desgaste, reemplazo programado.', points: buildPoints('EJ-010', MONTACARGAS_SECTIONS) },
];

const NON_CONFORMANCES: NonConformance[] = [
  { id: 'NC-001', asset: 'MC-003', question: '¿Sistema hidráulico sin fugas?', date: '2026-06-18', severity: 'CRITICA', status: 'ABIERTA', otGenerated: true, otId: 'OT-2847', detectadoPor: 'L. Martínez', template: 'Inspección Montacargas', descripcion: 'Fuga visible en manguera del cilindro principal. Equipo fuera de servicio hasta reparación.', accion: 'Reemplazo de manguera y sellos', responsable: 'Luis Vargas' },
  { id: 'NC-002', asset: 'VH-003', question: '¿Frenos con respuesta correcta?', date: '2026-06-19', severity: 'ALTA', status: 'EN_PROCESO', otGenerated: true, otId: 'OT-2851', detectadoPor: 'M. García', template: 'Preoperacional Vehículos', descripcion: 'Recorrido de pedal mayor al normal, posible aire en el sistema.', accion: 'Purga de sistema de frenos', responsable: 'Carlos Díaz' },
  { id: 'NC-003', asset: 'CMP-07', question: '¿Presión de trabajo dentro del rango?', date: '2026-06-16', severity: 'ALTA', status: 'ABIERTA', otGenerated: true, otId: 'OT-2839', detectadoPor: 'F. Moreno', template: 'Check PM Mensual General', descripcion: 'Presión 15% por debajo del valor nominal.', accion: 'Revisión de válvula reguladora', responsable: 'Luis Herrera' },
  { id: 'NC-004', asset: 'Bodega Bogotá', question: '¿Cubierta sin filtraciones visibles?', date: '2026-06-17', severity: 'MEDIA', status: 'EN_PROCESO', otGenerated: false, detectadoPor: 'R. Torres', template: 'Check Cubierta e Infraestructura', descripcion: 'Filtración leve en sector C durante lluvia.', accion: 'Sellado de teja, pendiente OT', responsable: 'Marco Vargas' },
  { id: 'NC-005', asset: 'VH-012', question: '¿Luces de advertencia apagadas?', date: '2026-06-15', severity: 'MEDIA', status: 'CERRADA', otGenerated: false, detectadoPor: 'D. Jiménez', template: 'Preoperacional Vehículos', descripcion: 'Testigo intermitente por sensor sucio.', accion: 'Limpieza de sensor - resuelto', responsable: 'Ana Rojas' },
  { id: 'NC-006', asset: 'MC-001', question: '¿Cinturón de seguridad en buen estado?', date: '2026-06-15', severity: 'ALTA', status: 'CERRADA', otGenerated: true, otId: 'OT-2832', detectadoPor: 'E. Vargas', template: 'Inspección Montacargas', descripcion: 'Cinturón con desgaste en anclaje.', accion: 'Reemplazo de cinturón - completado', responsable: 'Pedro Torres' },
  { id: 'NC-007', asset: 'EQ-TEC-05', question: '¿UPS con capacidad suficiente?', date: '2026-06-16', severity: 'BAJA', status: 'CERRADA', otGenerated: false, detectadoPor: 'P. Herrera', template: 'Inspección Equipos Tecnológicos', descripcion: 'Batería al 88%, dentro de tolerancia pero en seguimiento.', accion: 'Monitoreo mensual', responsable: 'Ana Rojas' },
];

const SEVERITY_COLORS: Record<NonConformance['severity'], string> = {
  CRITICA: '#DC2626',
  ALTA: '#EA580C',
  MEDIA: '#CA8A04',
  BAJA: '#6B7280',
};

const STATUS_NC_COLORS: Record<NonConformance['status'], string> = {
  ABIERTA: '#DC2626',
  EN_PROCESO: '#CA8A04',
  CERRADA: EAM_COLOR,
};

const EXEC_STATUS_COLORS: Record<Execution['status'], string> = {
  APROBADO: EAM_COLOR,
  OBSERVACION: '#CA8A04',
  RECHAZADO: '#DC2626',
};

const QTYPE_LABEL: Record<QuestionType, string> = {
  SI_NO: 'SÍ/NO',
  ESCALA: 'ESCALA',
  NUMERICO: 'NUMÉRICO',
  TEXTO: 'TEXTO',
};

const QTYPE_COLORS: Record<QuestionType, string> = {
  SI_NO: '#3B82F6',
  ESCALA: '#8B5CF6',
  NUMERICO: '#10B981',
  TEXTO: '#6B7280',
};

function conformanceColor(value: number) {
  return value >= 90 ? EAM_COLOR : value >= 70 ? '#CA8A04' : '#DC2626';
}

function ConformanceCell({ value }: { value: number }) {
  return (
    <Typography sx={{ color: conformanceColor(value), fontWeight: 700, fontSize: '0.9rem' }}>{value}%</Typography>
  );
}

const ASSET_TYPES: AssetType[] = ['VEHICULO', 'MONTACARGAS', 'INFRAESTRUCTURA', 'MOTOCICLETA', 'EQUIPO_TECNOLOGICO', 'GENERAL'];

export default function EAMChecklists() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Datos en memoria (mutables)
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const [executions] = useState<Execution[]>(EXECUTIONS);
  const [nonConformances, setNonConformances] = useState<NonConformance[]>(NON_CONFORMANCES);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' }>({ open: false, msg: '', sev: 'success' });
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' = 'success') => setSnack({ open: true, msg, sev });

  // ── Filtros / búsqueda ──
  const [searchTmpl, setSearchTmpl] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('Todos');
  const [filterFreq, setFilterFreq] = useState('Todos');

  const [searchExec, setSearchExec] = useState('');
  const [filterExecStatus, setFilterExecStatus] = useState('Todos');

  const [filterNCStatus, setFilterNCStatus] = useState('Todos');
  const [filterNCSeverity, setFilterNCSeverity] = useState('Todos');

  // ── Diálogo de detalle de plantilla (con checks locales) ──
  const [tmplDialog, setTmplDialog] = useState<{ open: boolean; tmpl: Template | null; points: InspectionPoint[] }>({ open: false, tmpl: null, points: [] });
  const openTmpl = (t: Template) => setTmplDialog({ open: true, tmpl: t, points: t.points.map(p => ({ ...p })) });
  const closeTmpl = () => setTmplDialog(p => ({ ...p, open: false }));
  const setPointState = (id: string, state: PointState) =>
    setTmplDialog(p => ({ ...p, points: p.points.map(pt => pt.id === id ? { ...pt, state } : pt) }));

  // ── Diálogo de detalle de ejecución ──
  const [execDialog, setExecDialog] = useState<{ open: boolean; exec: Execution | null }>({ open: false, exec: null });
  const openExec = (e: Execution) => setExecDialog({ open: true, exec: e });
  const closeExec = () => setExecDialog(p => ({ ...p, open: false }));

  // ── Diálogo de detalle de no conformidad ──
  const [ncDialog, setNcDialog] = useState<{ open: boolean; nc: NonConformance | null }>({ open: false, nc: null });
  const openNc = (nc: NonConformance) => setNcDialog({ open: true, nc });
  const closeNc = () => setNcDialog(p => ({ ...p, open: false }));

  // ── Diálogo de nueva plantilla ──
  const [newDialog, setNewDialog] = useState(false);
  const emptyNew = { name: '', assetType: 'VEHICULO' as AssetType, frequency: 'Diario', owner: '', linkedAsset: '', totalSections: '3', totalQuestions: '12' };
  const [newForm, setNewForm] = useState(emptyNew);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const setNewField = (f: keyof typeof emptyNew, v: string) => setNewForm(prev => ({ ...prev, [f]: v }));

  // Dominios derivados de los datos reales de la página (para Selects controlados)
  const ownerOptions = useMemo(
    () => Array.from(new Set(templates.map(t => t.owner))).filter(o => o && o !== 'Sin asignar').sort(),
    [templates],
  );
  const assetOptions = useMemo(
    () => Array.from(new Set(templates.map(t => t.linkedAsset))).filter(a => a && a !== '—').sort(),
    [templates],
  );
  const assetTypeByAsset = useMemo(() => {
    const m: Record<string, AssetType> = {};
    templates.forEach(t => { if (t.linkedAsset && t.linkedAsset !== '—') m[t.linkedAsset] = t.assetType; });
    return m;
  }, [templates]);

  // Al elegir un activo, autocompletar su tipo (valor derivado)
  const selectLinkedAsset = (asset: string) =>
    setNewForm(prev => ({ ...prev, linkedAsset: asset, assetType: assetTypeByAsset[asset] ?? prev.assetType }));

  const newValid = !!(newForm.name.trim() && newForm.owner && newForm.linkedAsset);

  const openNew = () => { setNewForm(emptyNew); setTriedSubmit(false); setNewDialog(true); };

  const createTemplate = () => {
    if (!newValid) {
      setTriedSubmit(true);
      notify('Complete los campos obligatorios: nombre, responsable y activo asociado', 'warning');
      return;
    }
    const num = templates.length + 1;
    const id = `CK-${String(num).padStart(3, '0')}`;
    const t: Template = {
      id,
      name: newForm.name || 'Nueva plantilla',
      assetType: newForm.assetType,
      totalQuestions: parseInt(newForm.totalQuestions) || 0,
      totalSections: parseInt(newForm.totalSections) || 0,
      sections: PM_SECTIONS,
      frequency: newForm.frequency,
      owner: newForm.owner || 'Sin asignar',
      lastRun: '—',
      lastConformance: 0,
      totalRuns: 0,
      version: 'v1.0',
      linkedAsset: newForm.linkedAsset || '—',
      points: buildPoints(id, PM_SECTIONS),
    };
    setTemplates(prev => [t, ...prev]);
    setNewDialog(false);
    setNewForm(emptyNew);
    notify(`Plantilla ${id} creada correctamente`);
  };

  // ── Filtrado ──
  const filteredTemplates = useMemo(() => templates.filter(t => {
    if (filterAssetType !== 'Todos' && t.assetType !== filterAssetType) return false;
    if (filterFreq !== 'Todos' && t.frequency !== filterFreq) return false;
    if (searchTmpl) {
      const q = searchTmpl.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q) && !t.linkedAsset.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [templates, filterAssetType, filterFreq, searchTmpl]);

  const filteredExecs = useMemo(() => executions.filter(e => {
    if (filterExecStatus !== 'Todos' && e.status !== filterExecStatus) return false;
    if (searchExec) {
      const q = searchExec.toLowerCase();
      if (!e.asset.toLowerCase().includes(q) && !e.template.toLowerCase().includes(q) && !e.executedBy.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [executions, filterExecStatus, searchExec]);

  const filteredNCs = useMemo(() => nonConformances.filter(nc => {
    if (filterNCStatus !== 'Todos' && nc.status !== filterNCStatus) return false;
    if (filterNCSeverity !== 'Todos' && nc.severity !== filterNCSeverity) return false;
    return true;
  }), [nonConformances, filterNCStatus, filterNCSeverity]);

  const handleToggleTemplate = (id: string) => setExpandedTemplate(prev => (prev === id ? null : id));

  const closeNCManually = (id: string) => {
    setNonConformances(prev => prev.map(nc => nc.id === id ? { ...nc, status: 'CERRADA' } : nc));
    setNcDialog(p => p.nc && p.nc.id === id ? { ...p, nc: { ...p.nc, status: 'CERRADA' } } : p);
    notify(`No conformidad ${id} marcada como CERRADA`);
  };

  // ── Exportaciones ──
  const exportTemplates = () => {
    if (!filteredTemplates.length) { notify('No hay plantillas para exportar', 'warning'); return; }
    exportarCSV({
      archivo: 'eam-checklists-plantillas',
      titulo: 'Plantillas de inspección',
      columnas: [
        { key: 'id', header: 'ID' },
        { key: 'nombre', header: 'Nombre' },
        { key: 'tipoActivo', header: 'Tipo de activo' },
        { key: 'frecuencia', header: 'Frecuencia' },
        { key: 'responsable', header: 'Responsable' },
        { key: 'activo', header: 'Activo asociado' },
        { key: 'preguntas', header: 'Preguntas' },
        { key: 'secciones', header: 'Secciones' },
        { key: 'ejecuciones', header: 'Ejecuciones' },
        { key: 'ultimaEjecucion', header: 'Última ejecución' },
        { key: 'conformidad', header: 'Conformidad (%)' },
        { key: 'version', header: 'Versión' },
      ],
      filas: filteredTemplates.map(t => ({
        id: t.id,
        nombre: t.name,
        tipoActivo: t.assetType.replace('_', ' '),
        frecuencia: t.frequency,
        responsable: t.owner,
        activo: t.linkedAsset,
        preguntas: t.totalQuestions,
        secciones: t.totalSections,
        ejecuciones: t.totalRuns,
        ultimaEjecucion: t.lastRun,
        conformidad: t.lastConformance,
        version: t.version,
      })),
    });
    notify(`${filteredTemplates.length} plantillas exportadas a CSV`, 'info');
  };

  const exportExecs = () => {
    if (!filteredExecs.length) { notify('No hay ejecuciones para exportar', 'warning'); return; }
    exportarExcel({
      archivo: 'eam-checklists-ejecuciones',
      titulo: 'Ejecuciones',
      columnas: [
        { key: 'id', header: 'ID' },
        { key: 'fecha', header: 'Fecha' },
        { key: 'activo', header: 'Activo' },
        { key: 'plantilla', header: 'Plantilla' },
        { key: 'responsable', header: 'Responsable' },
        { key: 'conformidad', header: 'Conformidad (%)' },
        { key: 'estado', header: 'Estado' },
        { key: 'duracion', header: 'Duración' },
        { key: 'turno', header: 'Turno' },
      ],
      filas: filteredExecs.map(e => ({
        id: e.id,
        fecha: e.date,
        activo: e.asset,
        plantilla: e.template,
        responsable: e.executedBy,
        conformidad: e.conformance,
        estado: e.status,
        duracion: e.duracion ?? '—',
        turno: e.turno ?? '—',
      })),
    });
    notify(`${filteredExecs.length} ejecuciones exportadas a Excel`, 'info');
  };

  const exportExecPDF = (exec: Execution) => {
    const puntos = exec.points ?? [];
    exportarPDF({
      archivo: `eam-checklists-ejecucion-${exec.id}`,
      titulo: `Ejecución ${exec.id} — ${exec.template}`,
      subtitulo: `Activo: ${exec.asset} · ${exec.date} · Responsable: ${exec.executedBy} · Conformidad: ${exec.conformance}% · Estado: ${exec.status}`,
      color: EAM_COLOR,
      columnas: [
        { key: 'seccion', header: 'Sección' },
        { key: 'punto', header: 'Punto de inspección' },
        { key: 'tipo', header: 'Tipo' },
        { key: 'estado', header: 'Estado' },
        { key: 'nota', header: 'Observación' },
      ],
      filas: puntos.map(p => ({
        seccion: p.section,
        punto: p.text,
        tipo: QTYPE_LABEL[p.type],
        estado: POINT_STATE_META[p.state].label,
        nota: p.note ?? '',
      })),
    });
    notify(`Reporte de ${exec.id} descargado en PDF`, 'info');
  };

  // Estilos de input (tema claro)
  const inputSx = {
    '& .MuiOutlinedInput-root': { color: TXT_PRIMARY, bgcolor: CARD_BG },
    '& label': { color: TXT_SECONDARY },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: CARD_BORDER },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
    '& .MuiSvgIcon-root': { color: TXT_SECONDARY },
  };

  // Resumen de puntos del diálogo de plantilla
  const tmplSummary = useMemo(() => {
    const pts = tmplDialog.points;
    const ok = pts.filter(p => p.state === 'OK').length;
    const obs = pts.filter(p => p.state === 'OBSERVACION').length;
    const fail = pts.filter(p => p.state === 'FALLA').length;
    const pend = pts.filter(p => p.state === 'PENDIENTE').length;
    const done = pts.length - pend;
    const conf = pts.length ? Math.round((ok / pts.length) * 100) : 0;
    return { ok, obs, fail, pend, done, total: pts.length, conf };
  }, [tmplDialog.points]);

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh', background: SURFACE }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ width: 6, height: 36, bgcolor: EAM_COLOR, borderRadius: 1 }} />
            <Typography variant="h4" sx={{ color: EAM_COLOR, fontWeight: 700 }}>
              Checklists de Inspección
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNew}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: '10px', fontWeight: 700 }}
          >
            Nueva plantilla
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ color: TXT_SECONDARY, mb: 3 }}>
          Plantillas, ejecuciones y seguimiento de no conformidades detectadas en campo
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: TXT_SECONDARY, fontWeight: 600 },
              '& .Mui-selected': { color: EAM_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR },
            }}
          >
            <Tab label={`Plantillas (${templates.length})`} />
            <Tab label={`Ejecuciones (${executions.length})`} />
            <Tab label={`No Conformidades (${nonConformances.length})`} />
          </Tabs>
        </Box>

        {/* ════════════ TAB 0 — Plantillas ════════════ */}
        <TabPanel value={tab} index={0}>
          {/* Barra de filtros */}
          <Paper elevation={0} sx={{ border: `1px solid ${CARD_BORDER}`, borderRadius: '12px', p: 1.5, mb: 2, bgcolor: CARD_BG }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField
                size="small" placeholder="Buscar plantilla, ID o activo..."
                value={searchTmpl} onChange={e => setSearchTmpl(e.target.value)}
                sx={{ minWidth: 240, flex: '1 1 240px', ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Tipo de activo" value={filterAssetType}
                onChange={e => setFilterAssetType(e.target.value)} sx={{ minWidth: 190, ...inputSx }}>
                <MenuItem value="Todos">Todos</MenuItem>
                {ASSET_TYPES.map(a => <MenuItem key={a} value={a}>{a.replace('_', ' ')}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Frecuencia" value={filterFreq}
                onChange={e => setFilterFreq(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                {['Todos', 'Diario', 'Semanal', 'Mensual'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
              <Box flex={1} />
              <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify('Plantillas exportadas a CSV', 'info')}
                sx={{ borderColor: EAM_COLOR, color: EAM_COLOR, '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) }, fontWeight: 600 }}>
                Exportar
              </Button>
            </Stack>
          </Paper>

          {filteredTemplates.length === 0 && (
            <Typography sx={{ color: TXT_SECONDARY, textAlign: 'center', py: 6 }}>No hay plantillas que coincidan con los filtros.</Typography>
          )}

          <Grid container spacing={2}>
            {filteredTemplates.map(tmpl => (
              <Grid key={tmpl.id} size={{ xs: 12, md: 6 }}>
                <Card
                  onClick={() => openTmpl(tmpl)}
                  sx={{
                    border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: CARD_BG, cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.15s',
                    '&:hover': { borderColor: alpha(EAM_COLOR, 0.5), boxShadow: '0 4px 14px rgba(0,0,0,0.08)', bgcolor: alpha(EAM_COLOR, 0.02) },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Box flex={1}>
                        <Typography variant="subtitle1" sx={{ color: TXT_PRIMARY, fontWeight: 700, mb: 0.5 }}>
                          {tmpl.name}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={tmpl.assetType.replace('_', ' ')}
                            size="small"
                            sx={{
                              bgcolor: ASSET_TYPE_COLORS[tmpl.assetType] + '22',
                              color: ASSET_TYPE_COLORS[tmpl.assetType],
                              border: `1px solid ${ASSET_TYPE_COLORS[tmpl.assetType]}`,
                              fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.5,
                            }}
                          />
                          <Chip label={tmpl.frequency} size="small" sx={{ bgcolor: SURFACE, color: TXT_SECONDARY, border: `1px solid ${CARD_BORDER}`, fontSize: '0.65rem', fontWeight: 700 }} />
                        </Stack>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>ID</Typography>
                        <Typography variant="body2" sx={{ color: TXT_SECONDARY, fontWeight: 700 }}>{tmpl.id}</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>{tmpl.version}</Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={3} mb={2} alignItems="center">
                      <Box>
                        <Typography variant="h5" sx={{ color: EAM_COLOR, fontWeight: 900, lineHeight: 1 }}>{tmpl.totalQuestions}</Typography>
                        <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>preguntas</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem sx={{ borderColor: CARD_BORDER }} />
                      <Box>
                        <Typography variant="h5" sx={{ color: '#3B82F6', fontWeight: 900, lineHeight: 1 }}>{tmpl.totalSections}</Typography>
                        <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>secciones</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem sx={{ borderColor: CARD_BORDER }} />
                      <Box>
                        <Typography variant="h5" sx={{ color: TXT_PRIMARY, fontWeight: 900, lineHeight: 1 }}>{tmpl.totalRuns}</Typography>
                        <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>ejecuciones</Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>
                        Última ejecución: <Box component="span" sx={{ color: TXT_PRIMARY, fontWeight: 600 }}>{tmpl.lastRun}</Box>
                      </Typography>
                      <Typography variant="caption" sx={{ color: conformanceColor(tmpl.lastConformance), fontWeight: 700 }}>
                        {tmpl.lastConformance}% conformidad
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={tmpl.lastConformance}
                      sx={{ height: 6, borderRadius: 3, bgcolor: SURFACE, mb: 2, '& .MuiLinearProgress-bar': { bgcolor: conformanceColor(tmpl.lastConformance) } }}
                    />

                    {tmpl.sections && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleToggleTemplate(tmpl.id); }}
                          sx={{ borderColor: EAM_COLOR, color: EAM_COLOR, fontSize: '0.75rem', '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) } }}
                        >
                          {expandedTemplate === tmpl.id ? 'Ocultar preguntas' : 'Ver preguntas'}
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<RunIcon />}
                          onClick={(e) => { e.stopPropagation(); openTmpl(tmpl); }}
                          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontSize: '0.75rem' }}
                        >
                          Abrir inspección
                        </Button>
                      </Stack>
                    )}

                    {tmpl.sections && (
                      <Collapse in={expandedTemplate === tmpl.id}>
                        <Box mt={2} onClick={e => e.stopPropagation()}>
                          <Divider sx={{ borderColor: CARD_BORDER, mb: 2 }} />
                          {tmpl.sections.map(sec => (
                            <Box key={sec.name} mb={2}>
                              <Typography variant="caption" sx={{ color: TXT_SECONDARY, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                                Sección: {sec.name}
                              </Typography>
                              <Stack spacing={1} mt={1}>
                                {sec.questions.map((q, qi) => (
                                  <Stack key={qi} direction="row" alignItems="center" justifyContent="space-between"
                                    sx={{ bgcolor: SURFACE, borderRadius: 1, px: 1.5, py: 0.75, border: `1px solid ${CARD_BORDER}` }}>
                                    <Typography variant="body2" sx={{ color: TXT_PRIMARY, flex: 1 }}>{q.text}</Typography>
                                    <Chip
                                      label={QTYPE_LABEL[q.type]}
                                      size="small"
                                      sx={{ bgcolor: QTYPE_COLORS[q.type] + '22', color: QTYPE_COLORS[q.type], fontSize: '0.6rem', fontWeight: 700, border: `1px solid ${QTYPE_COLORS[q.type]}` }}
                                    />
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* ════════════ TAB 1 — Ejecuciones ════════════ */}
        <TabPanel value={tab} index={1}>
          <Paper elevation={0} sx={{ border: `1px solid ${CARD_BORDER}`, borderRadius: '12px', p: 1.5, mb: 2, bgcolor: CARD_BG }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField
                size="small" placeholder="Buscar por activo, plantilla, responsable..."
                value={searchExec} onChange={e => setSearchExec(e.target.value)}
                sx={{ minWidth: 260, flex: '1 1 260px', ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Estado" value={filterExecStatus}
                onChange={e => setFilterExecStatus(e.target.value)} sx={{ minWidth: 180, ...inputSx }}>
                {['Todos', 'APROBADO', 'OBSERVACION', 'RECHAZADO'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <Box flex={1} />
              <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify('Ejecuciones exportadas a Excel', 'info')}
                sx={{ borderColor: EAM_COLOR, color: EAM_COLOR, '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) }, fontWeight: 600 }}>
                Exportar
              </Button>
            </Stack>
          </Paper>

          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: CARD_BG }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: alpha(EAM_COLOR, 0.06), color: TXT_SECONDARY, fontWeight: 700, borderColor: CARD_BORDER, fontSize: '0.75rem', letterSpacing: 0.5 } }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell>Plantilla</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell>Conformidad</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExecs.map(ex => (
                  <TableRow
                    key={ex.id}
                    onClick={() => openExec(ex)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.04) } }}
                  >
                    <TableCell sx={{ color: '#94A3B8', borderColor: CARD_BORDER, fontSize: '0.75rem' }}>{ex.id}</TableCell>
                    <TableCell sx={{ color: TXT_SECONDARY, borderColor: CARD_BORDER, fontSize: '0.8rem' }}>{ex.date}</TableCell>
                    <TableCell sx={{ color: TXT_PRIMARY, borderColor: CARD_BORDER, fontWeight: 600 }}>{ex.asset}</TableCell>
                    <TableCell sx={{ color: TXT_SECONDARY, borderColor: CARD_BORDER, fontSize: '0.8rem', maxWidth: 180 }}>{ex.template}</TableCell>
                    <TableCell sx={{ color: TXT_PRIMARY, borderColor: CARD_BORDER }}>{ex.executedBy}</TableCell>
                    <TableCell sx={{ borderColor: CARD_BORDER }}><ConformanceCell value={ex.conformance} /></TableCell>
                    <TableCell sx={{ borderColor: CARD_BORDER }}>
                      <Chip
                        label={ex.status}
                        size="small"
                        sx={{
                          bgcolor: alpha(EXEC_STATUS_COLORS[ex.status], 0.14),
                          color: EXEC_STATUS_COLORS[ex.status],
                          fontWeight: 700, fontSize: '0.65rem',
                          border: `1px solid ${EXEC_STATUS_COLORS[ex.status]}`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExecs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', color: TXT_SECONDARY, borderColor: CARD_BORDER, py: 4 }}>
                      No hay ejecuciones que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={3} mt={2} justifyContent="flex-end">
            {[{ color: EAM_COLOR, label: '≥ 90% Conforme' }, { color: '#CA8A04', label: '70–89% Con observaciones' }, { color: '#DC2626', label: '< 70% No conforme' }].map(l => (
              <Stack key={l.label} direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: l.color }} />
                <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>{l.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </TabPanel>

        {/* ════════════ TAB 2 — No Conformidades ════════════ */}
        <TabPanel value={tab} index={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={1.5}>
              <TextField select size="small" label="Estado" value={filterNCStatus}
                onChange={e => setFilterNCStatus(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                {['Todos', 'ABIERTA', 'EN_PROCESO', 'CERRADA'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Severidad" value={filterNCSeverity}
                onChange={e => setFilterNCSeverity(e.target.value)} sx={{ minWidth: 150, ...inputSx }}>
                {['Todos', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={1}>
              {(['ABIERTA', 'EN_PROCESO', 'CERRADA'] as NonConformance['status'][]).map(s => (
                <Chip key={s} label={`${s.replace('_', ' ')}: ${nonConformances.filter(nc => nc.status === s).length}`} size="small"
                  sx={{ bgcolor: alpha(STATUS_NC_COLORS[s], 0.14), color: STATUS_NC_COLORS[s], border: `1px solid ${STATUS_NC_COLORS[s]}`, fontWeight: 700, fontSize: '0.65rem' }} />
              ))}
            </Stack>
          </Stack>

          {filteredNCs.length === 0 && (
            <Typography sx={{ color: TXT_SECONDARY, textAlign: 'center', py: 6 }}>No hay no conformidades que coincidan con los filtros.</Typography>
          )}

          <Stack spacing={2}>
            {filteredNCs.map(nc => (
              <Card
                key={nc.id}
                onClick={() => openNc(nc)}
                sx={{
                  border: `1px solid ${nc.status === 'ABIERTA' && nc.severity === 'CRITICA' ? alpha('#DC2626', 0.4) : CARD_BORDER}`,
                  borderLeft: `4px solid ${SEVERITY_COLORS[nc.severity]}`,
                  borderRadius: 2, bgcolor: CARD_BG, cursor: 'pointer',
                  transition: 'box-shadow 0.15s, background-color 0.15s',
                  '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)', bgcolor: alpha(EAM_COLOR, 0.02) },
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip label={nc.severity} size="small" sx={{ bgcolor: alpha(SEVERITY_COLORS[nc.severity], 0.14), color: SEVERITY_COLORS[nc.severity], border: `1px solid ${SEVERITY_COLORS[nc.severity]}`, fontWeight: 700, fontSize: '0.65rem' }} />
                      <Chip label={nc.status.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(STATUS_NC_COLORS[nc.status], 0.14), color: STATUS_NC_COLORS[nc.status], border: `1px solid ${STATUS_NC_COLORS[nc.status]}`, fontWeight: 700, fontSize: '0.65rem' }} />
                      {nc.otGenerated && (
                        <Chip label={`OT Generada: ${nc.otId}`} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.14), color: EAM_COLOR, border: `1px solid ${EAM_COLOR}`, fontWeight: 700, fontSize: '0.65rem' }} />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: TXT_SECONDARY, whiteSpace: 'nowrap', ml: 1 }}>{nc.date}</Typography>
                  </Stack>

                  <Typography variant="body2" sx={{ color: TXT_PRIMARY, fontWeight: 600, mb: 0.5 }}>{nc.question}</Typography>
                  <Typography variant="caption" sx={{ color: TXT_SECONDARY }}>
                    Activo: <Box component="span" sx={{ color: TXT_PRIMARY, fontWeight: 600 }}>{nc.asset}</Box>
                    {' '}· ID: <Box component="span" sx={{ color: '#94A3B8' }}>{nc.id}</Box>
                    {' '}· Detectado por: <Box component="span" sx={{ color: TXT_PRIMARY, fontWeight: 600 }}>{nc.detectadoPor}</Box>
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </TabPanel>
      </Box>

      {/* ════════════ DIÁLOGO: Detalle de plantilla + checks ════════════ */}
      <Dialog open={tmplDialog.open} onClose={closeTmpl} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(EAM_COLOR, 0.3)}` } }}>
        {tmplDialog.tmpl && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.12) }}>
                  <ChecklistIcon sx={{ color: EAM_COLOR }} />
                </Box>
                <Box>
                  <Typography fontSize={16} fontWeight={800} color={TXT_PRIMARY}>{tmplDialog.tmpl.name}</Typography>
                  <Typography fontSize={12} color={TXT_SECONDARY}>{tmplDialog.tmpl.id} · {tmplDialog.tmpl.version} · Activo: {tmplDialog.tmpl.linkedAsset}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={closeTmpl} sx={{ color: '#94A3B8' }}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: CARD_BORDER }}>
              {/* Ficha superior */}
              <Grid container spacing={1.5} mb={2}>
                {[
                  { icon: <CalendarIcon sx={{ fontSize: 18 }} />, label: 'Frecuencia', value: tmplDialog.tmpl.frequency },
                  { icon: <PersonIcon sx={{ fontSize: 18 }} />, label: 'Responsable', value: tmplDialog.tmpl.owner },
                  { icon: <HistoryIcon sx={{ fontSize: 18 }} />, label: 'Última ejecución', value: tmplDialog.tmpl.lastRun },
                  { icon: <TemplateIcon sx={{ fontSize: 18 }} />, label: 'Ejecuciones totales', value: String(tmplDialog.tmpl.totalRuns) },
                ].map(f => (
                  <Grid key={f.label} size={{ xs: 6, md: 3 }}>
                    <Paper elevation={0} sx={{ p: 1.25, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: SURFACE }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: TXT_SECONDARY, mb: 0.5 }}>
                        {f.icon}
                        <Typography fontSize={11}>{f.label}</Typography>
                      </Stack>
                      <Typography fontSize={13} fontWeight={700} color={TXT_PRIMARY} noWrap>{f.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Resumen de conformidad en vivo */}
              <Paper elevation={0} sx={{ p: 2, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: SURFACE, mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontSize={13} fontWeight={700} color={TXT_PRIMARY}>Conformidad en vivo</Typography>
                  <Typography fontSize={18} fontWeight={900} color={conformanceColor(tmplSummary.conf)}>{tmplSummary.conf}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={tmplSummary.done / (tmplSummary.total || 1) * 100}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0', mb: 1.5, '& .MuiLinearProgress-bar': { bgcolor: EAM_COLOR } }} />
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {[
                    { label: 'OK', v: tmplSummary.ok, c: EAM_COLOR },
                    { label: 'Observación', v: tmplSummary.obs, c: '#CA8A04' },
                    { label: 'Falla', v: tmplSummary.fail, c: '#DC2626' },
                    { label: 'Pendiente', v: tmplSummary.pend, c: '#94A3B8' },
                  ].map(s => (
                    <Stack key={s.label} direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.c }} />
                      <Typography fontSize={12} color={TXT_SECONDARY}>{s.label}: <Box component="span" sx={{ color: TXT_PRIMARY, fontWeight: 700 }}>{s.v}</Box></Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>

              {/* Puntos de inspección agrupados por sección, con marcado local */}
              <Typography fontSize={13} fontWeight={700} color={TXT_PRIMARY} mb={1}>Puntos de inspección — marca el estado de cada punto</Typography>
              {Array.from(new Set(tmplDialog.points.map(p => p.section))).map(section => (
                <Box key={section} mb={2}>
                  <Typography variant="caption" sx={{ color: TXT_SECONDARY, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{section}</Typography>
                  <Stack spacing={1} mt={1}>
                    {tmplDialog.points.filter(p => p.section === section).map(pt => {
                      const meta = POINT_STATE_META[pt.state];
                      return (
                        <Paper key={pt.id} elevation={0} sx={{ border: `1px solid ${CARD_BORDER}`, borderLeft: `3px solid ${meta.color}`, borderRadius: 2, p: 1.25, bgcolor: CARD_BG }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap>
                            <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={200}>
                              <meta.Icon sx={{ color: meta.color, fontSize: 20 }} />
                              <Box>
                                <Typography fontSize={13} color={TXT_PRIMARY} fontWeight={600}>{pt.text}</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip label={QTYPE_LABEL[pt.type]} size="small" sx={{ bgcolor: QTYPE_COLORS[pt.type] + '18', color: QTYPE_COLORS[pt.type], fontSize: '0.55rem', fontWeight: 700, height: 16 }} />
                                  {pt.note && <Typography fontSize={11} color={TXT_SECONDARY} fontStyle="italic">{pt.note}</Typography>}
                                </Stack>
                              </Box>
                            </Stack>
                            <Stack direction="row" spacing={0.5}>
                              {(['OK', 'OBSERVACION', 'FALLA'] as PointState[]).map(st => {
                                const m = POINT_STATE_META[st];
                                const active = pt.state === st;
                                return (
                                  <Tooltip key={st} title={m.label}>
                                    <IconButton size="small" onClick={() => setPointState(pt.id, st)}
                                      sx={{ color: active ? '#FFFFFF' : m.color, bgcolor: active ? m.color : alpha(m.color, 0.1), border: `1px solid ${m.color}`, borderRadius: 1.5, '&:hover': { bgcolor: active ? m.color : alpha(m.color, 0.2) } }}>
                                      <m.Icon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                );
                              })}
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={closeTmpl} sx={{ color: TXT_SECONDARY }}>Cerrar</Button>
              <Button variant="outlined" startIcon={<OTIcon />} onClick={() => { closeTmpl(); navigate('/eam/ordenes-trabajo'); }}
                sx={{ borderColor: EAM_COLOR, color: EAM_COLOR, '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) }, fontWeight: 600 }}>
                Generar OT desde fallas
              </Button>
              <Button variant="contained" startIcon={<OkIcon />}
                onClick={() => { notify(`Inspección de ${tmplDialog.tmpl!.name} guardada — ${tmplSummary.conf}% conformidad`); closeTmpl(); }}
                sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700 }}>
                Guardar inspección
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ════════════ DIÁLOGO: Detalle de ejecución ════════════ */}
      <Dialog open={execDialog.open} onClose={closeExec} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(EAM_COLOR, 0.3)}` } }}>
        {execDialog.exec && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Box>
                <Typography fontSize={16} fontWeight={800} color={TXT_PRIMARY}>{execDialog.exec.template}</Typography>
                <Typography fontSize={12} color={TXT_SECONDARY}>{execDialog.exec.id} · Activo: {execDialog.exec.asset} · {execDialog.exec.date}</Typography>
              </Box>
              <IconButton size="small" onClick={closeExec} sx={{ color: '#94A3B8' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: CARD_BORDER }}>
              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: 'Responsable', value: execDialog.exec.executedBy },
                  { label: 'Conformidad', value: `${execDialog.exec.conformance}%`, color: conformanceColor(execDialog.exec.conformance) },
                  { label: 'Duración', value: execDialog.exec.duracion ?? '—' },
                  { label: 'Turno', value: execDialog.exec.turno ?? '—' },
                ].map(f => (
                  <Grid key={f.label} size={{ xs: 6, md: 3 }}>
                    <Paper elevation={0} sx={{ p: 1.25, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: SURFACE }}>
                      <Typography fontSize={11} color={TXT_SECONDARY}>{f.label}</Typography>
                      <Typography fontSize={14} fontWeight={800} color={f.color ?? TXT_PRIMARY}>{f.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Typography fontSize={13} color={TXT_SECONDARY}>Resultado:</Typography>
                <Chip label={execDialog.exec.status} size="small"
                  sx={{ bgcolor: alpha(EXEC_STATUS_COLORS[execDialog.exec.status], 0.14), color: EXEC_STATUS_COLORS[execDialog.exec.status], border: `1px solid ${EXEC_STATUS_COLORS[execDialog.exec.status]}`, fontWeight: 700 }} />
              </Stack>

              {execDialog.exec.observaciones && (
                <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: SURFACE, mb: 2 }}>
                  <Typography fontSize={11} color={TXT_SECONDARY} fontWeight={700} mb={0.5}>OBSERVACIONES</Typography>
                  <Typography fontSize={13} color={TXT_PRIMARY}>{execDialog.exec.observaciones}</Typography>
                </Paper>
              )}

              <Typography fontSize={13} fontWeight={700} color={TXT_PRIMARY} mb={1}>Puntos evaluados</Typography>
              <Stack spacing={1}>
                {(execDialog.exec.points ?? []).map(pt => {
                  const meta = POINT_STATE_META[pt.state];
                  return (
                    <Paper key={pt.id} elevation={0} sx={{ border: `1px solid ${CARD_BORDER}`, borderLeft: `3px solid ${meta.color}`, borderRadius: 2, p: 1.25, bgcolor: CARD_BG }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <meta.Icon sx={{ color: meta.color, fontSize: 20 }} />
                          <Box>
                            <Typography fontSize={13} color={TXT_PRIMARY} fontWeight={600}>{pt.text}</Typography>
                            <Typography fontSize={11} color={TXT_SECONDARY}>{pt.section}</Typography>
                          </Box>
                        </Stack>
                        <Chip label={meta.label} size="small" sx={{ bgcolor: alpha(meta.color, 0.14), color: meta.color, border: `1px solid ${meta.color}`, fontWeight: 700, fontSize: '0.6rem' }} />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={closeExec} sx={{ color: TXT_SECONDARY }}>Cerrar</Button>
              <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => notify(`Reporte de ${execDialog.exec!.id} descargado`, 'info')}
                sx={{ borderColor: EAM_COLOR, color: EAM_COLOR, '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) }, fontWeight: 600 }}>
                Descargar PDF
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ════════════ DIÁLOGO: Detalle de no conformidad ════════════ */}
      <Dialog open={ncDialog.open} onClose={closeNc} maxWidth="sm" fullWidth scroll="paper"
        PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(EAM_COLOR, 0.3)}` } }}>
        {ncDialog.nc && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: TXT_PRIMARY }}>
              <Box>
                <Typography fontSize={16} fontWeight={800} color={TXT_PRIMARY}>{ncDialog.nc.id}</Typography>
                <Typography fontSize={12} color={TXT_SECONDARY}>{ncDialog.nc.asset} · {ncDialog.nc.date}</Typography>
              </Box>
              <IconButton size="small" onClick={closeNc} sx={{ color: '#94A3B8' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: CARD_BORDER }}>
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                <Chip label={ncDialog.nc.severity} size="small" sx={{ bgcolor: alpha(SEVERITY_COLORS[ncDialog.nc.severity], 0.14), color: SEVERITY_COLORS[ncDialog.nc.severity], border: `1px solid ${SEVERITY_COLORS[ncDialog.nc.severity]}`, fontWeight: 700 }} />
                <Chip label={ncDialog.nc.status.replace('_', ' ')} size="small" sx={{ bgcolor: alpha(STATUS_NC_COLORS[ncDialog.nc.status], 0.14), color: STATUS_NC_COLORS[ncDialog.nc.status], border: `1px solid ${STATUS_NC_COLORS[ncDialog.nc.status]}`, fontWeight: 700 }} />
                {ncDialog.nc.otGenerated && <Chip label={`OT ${ncDialog.nc.otId}`} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.14), color: EAM_COLOR, border: `1px solid ${EAM_COLOR}`, fontWeight: 700 }} />}
              </Stack>

              <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, bgcolor: SURFACE, mb: 2 }}>
                <Typography fontSize={11} color={TXT_SECONDARY} fontWeight={700} mb={0.5}>PUNTO DE INSPECCIÓN</Typography>
                <Typography fontSize={14} color={TXT_PRIMARY} fontWeight={600}>{ncDialog.nc.question}</Typography>
              </Paper>

              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: 'Plantilla', value: ncDialog.nc.template ?? '—' },
                  { label: 'Detectado por', value: ncDialog.nc.detectadoPor ?? '—' },
                  { label: 'Responsable', value: ncDialog.nc.responsable ?? '—' },
                  { label: 'Activo', value: ncDialog.nc.asset },
                ].map(f => (
                  <Grid key={f.label} size={{ xs: 6 }}>
                    <Typography fontSize={11} color={TXT_SECONDARY}>{f.label}</Typography>
                    <Typography fontSize={13} color={TXT_PRIMARY} fontWeight={600}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {ncDialog.nc.descripcion && (
                <Box mb={1.5}>
                  <Typography fontSize={11} color={TXT_SECONDARY} fontWeight={700} mb={0.5}>DESCRIPCIÓN</Typography>
                  <Typography fontSize={13} color={TXT_PRIMARY}>{ncDialog.nc.descripcion}</Typography>
                </Box>
              )}
              {ncDialog.nc.accion && (
                <Box>
                  <Typography fontSize={11} color={TXT_SECONDARY} fontWeight={700} mb={0.5}>ACCIÓN CORRECTIVA</Typography>
                  <Typography fontSize={13} color={TXT_PRIMARY}>{ncDialog.nc.accion}</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={closeNc} sx={{ color: TXT_SECONDARY }}>Cerrar</Button>
              {!ncDialog.nc.otGenerated && ncDialog.nc.status !== 'CERRADA' && (
                <Button variant="outlined" startIcon={<OTIcon />} onClick={() => { closeNc(); navigate('/eam/ordenes-trabajo'); }}
                  sx={{ borderColor: EAM_COLOR, color: EAM_COLOR, '&:hover': { borderColor: EAM_DARK, bgcolor: alpha(EAM_COLOR, 0.06) }, fontWeight: 600 }}>
                  Generar OT
                </Button>
              )}
              {ncDialog.nc.status !== 'CERRADA' && (
                <Button variant="contained" startIcon={<OkIcon />} onClick={() => closeNCManually(ncDialog.nc!.id)}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700 }}>
                  Cerrar no conformidad
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ════════════ DIÁLOGO: Nueva plantilla ════════════ */}
      <Dialog open={newDialog} onClose={() => setNewDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: CARD_BG, borderRadius: '16px', border: `1px solid ${alpha(EAM_COLOR, 0.3)}` } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: TXT_PRIMARY }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(EAM_COLOR, 0.12) }}><AddIcon sx={{ color: EAM_COLOR }} /></Box>
            <Typography fontSize={16} fontWeight={800}>Nueva plantilla de inspección</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setNewDialog(false)} sx={{ color: '#94A3B8' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: CARD_BORDER }}>
          <Typography fontSize={12} color={TXT_SECONDARY} mt={1} mb={2}>
            Los campos marcados con <Box component="span" sx={{ color: '#DC2626', fontWeight: 700 }}>*</Box> son obligatorios.
          </Typography>
          <Stack spacing={0.5}>
            <TextField
              label="Nombre de la plantilla *" size="small" fullWidth value={newForm.name}
              onChange={e => setNewField('name', e.target.value)}
              error={triedSubmit && !newForm.name.trim()}
              helperText={triedSubmit && !newForm.name.trim() ? 'Ingrese un nombre para la plantilla' : ' '}
              sx={inputSx}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select label="Activo asociado *" size="small" fullWidth value={newForm.linkedAsset}
                onChange={e => selectLinkedAsset(e.target.value)}
                error={triedSubmit && !newForm.linkedAsset}
                helperText={triedSubmit && !newForm.linkedAsset ? 'Seleccione el activo a inspeccionar' : ' '}
                sx={inputSx}
              >
                {assetOptions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </TextField>
              <TextField
                label="Tipo de activo" size="small" fullWidth value={newForm.assetType.replace('_', ' ')}
                InputProps={{ readOnly: true }} helperText="Derivado del activo seleccionado" sx={inputSx}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select label="Responsable *" size="small" fullWidth value={newForm.owner}
                onChange={e => setNewField('owner', e.target.value)}
                error={triedSubmit && !newForm.owner}
                helperText={triedSubmit && !newForm.owner ? 'Seleccione un responsable' : ' '}
                sx={inputSx}
              >
                {ownerOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField
                select label="Frecuencia" size="small" fullWidth value={newForm.frequency}
                onChange={e => setNewField('frequency', e.target.value)} helperText=" " sx={inputSx}
              >
                {['Diario', 'Semanal', 'Mensual'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="N.º secciones" type="number" size="small" fullWidth value={newForm.totalSections}
                onChange={e => setNewField('totalSections', e.target.value)}
                InputProps={{ inputProps: { min: 0 } }} helperText=" " sx={inputSx}
              />
              <TextField
                label="N.º preguntas" type="number" size="small" fullWidth value={newForm.totalQuestions}
                onChange={e => setNewField('totalQuestions', e.target.value)}
                InputProps={{ inputProps: { min: 0 } }} helperText=" " sx={inputSx}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewDialog(false)} sx={{ color: TXT_SECONDARY }}>Cancelar</Button>
          <Button variant="contained" disabled={!newValid} onClick={createTemplate}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, fontWeight: 700, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } }}>
            Crear plantilla
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(p => ({ ...p, open: false }))} sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
