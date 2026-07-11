import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TextField,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  FormLabel,
  FormHelperText,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Factory as FactoryIcon,
  SwapHoriz as SwapIcon,
  Inventory2 as BomIcon,
  AltRoute as RouteIcon,
  History as HistoryIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { Layout } from '@/components/layout/Layout';

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2';
const MES_DARK = '#0E7490';
const MES_BORDER = 'rgba(8,145,178,0.25)';
const BG_PAGE = '#F0F2F5';
const BG_CARD = '#FFFFFF';
const TXT_PRIMARY = '#1E293B';
const TXT_SECONDARY = '#64748B';

// ─── Interfaces ───────────────────────────────────────────────────────────────
type EstadoOrden = 'PLANEADA' | 'LIBERADA' | 'EN EJECUCIÓN' | 'SUSPENDIDA' | 'CERRADA';
type Prioridad = 'URGENTE' | 'ALTA' | 'NORMAL';

interface OperacionRuta {
  secuencia: number;
  operacion: string;
  maquina: string;
  tiempoEstMin: number;
}

interface MaterialBOM {
  material: string;
  cantPorUnidad: number;
  unidad: string;
}

interface ProductoInfo {
  nombre: string;
  sku: string;
  unidad: string;
  versionBOM: string;
  costoUnitario: number;
  ruta: OperacionRuta[];
  bom: MaterialBOM[];
}

interface OrdenProduccion {
  id: string;
  numero: string;
  producto: string;
  linea: string;
  estado: EstadoOrden;
  prioridad: Prioridad;
  cantidadPlanificada: number;
  cantidadProducida: number;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  scrap: number;
  turno: string;
  cliente: string;
  versionBOM: string;
  observaciones: string;
}

interface KanbanColumna {
  estado: EstadoOrden;
  color: string;
  textColor: string;
}

interface FormNuevaOrden {
  producto: string;
  linea: string;
  cantidad: string;
  costoUnitario: string;
  prioridad: Prioridad;
  turno: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  cliente: string;
  observaciones: string;
}

// ─── Catálogos derivados ────────────────────────────────────────────────────────
const LINEAS = ['Línea A', 'Línea B', 'Línea C', 'Línea D'];
const TURNOS = ['Mañana (06:00-14:00)', 'Tarde (14:00-22:00)', 'Noche (22:00-06:00)'];
const RESPONSABLES = ['Carlos Méndez', 'Ana Torres', 'Luis Herrera', 'María López', 'Pedro Gómez', 'Sofía Ríos'];
const CLIENTES = ['Ecopetrol S.A.', 'Cerrejón', 'Argos', 'Bavaria', 'Petromil', 'Stock Interno'];

const PRODUCTOS: ProductoInfo[] = [
  {
    nombre: 'Válvula de Control DN50',
    sku: 'VLV-DN50',
    unidad: 'ud',
    versionBOM: 'v2.0',
    costoUnitario: 185000,
    ruta: [
      { secuencia: 1, operacion: 'Corte de barra', maquina: 'Sierra CNC-01', tiempoEstMin: 15 },
      { secuencia: 2, operacion: 'Torneado de cuerpo', maquina: 'Torno CNC-04', tiempoEstMin: 40 },
      { secuencia: 3, operacion: 'Fresado de asiento', maquina: 'Fresadora F-02', tiempoEstMin: 25 },
      { secuencia: 4, operacion: 'Ensamble de vástago', maquina: 'Estación E-01', tiempoEstMin: 20 },
      { secuencia: 5, operacion: 'Prueba hidrostática', maquina: 'Banco PH-01', tiempoEstMin: 18 },
      { secuencia: 6, operacion: 'Inspección final', maquina: 'Celda QA-01', tiempoEstMin: 12 },
    ],
    bom: [
      { material: 'Cuerpo fundido ASTM A216', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Vástago inox 316', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Asiento PTFE', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Empaque de grafito', cantPorUnidad: 2, unidad: 'ud' },
      { material: 'Tornillería M12', cantPorUnidad: 8, unidad: 'ud' },
    ],
  },
  {
    nombre: 'Brida Ciega DN80',
    sku: 'BRD-DN80',
    unidad: 'ud',
    versionBOM: 'v1.5',
    costoUnitario: 95000,
    ruta: [
      { secuencia: 1, operacion: 'Corte de placa', maquina: 'Oxicorte OC-01', tiempoEstMin: 10 },
      { secuencia: 2, operacion: 'Torneado de cara', maquina: 'Torno CNC-02', tiempoEstMin: 22 },
      { secuencia: 3, operacion: 'Taladrado de pernos', maquina: 'Taladro CNC-03', tiempoEstMin: 18 },
      { secuencia: 4, operacion: 'Acabado y biselado', maquina: 'Fresadora F-01', tiempoEstMin: 14 },
      { secuencia: 5, operacion: 'Inspección dimensional', maquina: 'Celda QA-01', tiempoEstMin: 10 },
    ],
    bom: [
      { material: 'Placa acero A105', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Recubrimiento anticorrosivo', cantPorUnidad: 0.2, unidad: 'L' },
      { material: 'Estampado de trazabilidad', cantPorUnidad: 1, unidad: 'ud' },
    ],
  },
  {
    nombre: 'Codo 90° SCH40',
    sku: 'COD-90-SCH40',
    unidad: 'ud',
    versionBOM: 'v1.0',
    costoUnitario: 32000,
    ruta: [
      { secuencia: 1, operacion: 'Corte de tubo', maquina: 'Sierra CNC-01', tiempoEstMin: 8 },
      { secuencia: 2, operacion: 'Conformado en caliente', maquina: 'Prensa P-02', tiempoEstMin: 30 },
      { secuencia: 3, operacion: 'Calibrado de radio', maquina: 'Estación E-02', tiempoEstMin: 16 },
      { secuencia: 4, operacion: 'Bisel de extremos', maquina: 'Biseladora B-01', tiempoEstMin: 12 },
      { secuencia: 5, operacion: 'Inspección visual', maquina: 'Celda QA-02', tiempoEstMin: 8 },
    ],
    bom: [
      { material: 'Tubo SCH40 sin costura', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Gas de conformado', cantPorUnidad: 0.5, unidad: 'm³' },
      { material: 'Pintura primer', cantPorUnidad: 0.1, unidad: 'L' },
    ],
  },
  {
    nombre: 'Reducción Excéntrica 4x3',
    sku: 'RED-EXC-4X3',
    unidad: 'ud',
    versionBOM: 'v1.5',
    costoUnitario: 48000,
    ruta: [
      { secuencia: 1, operacion: 'Corte de tubo', maquina: 'Sierra CNC-02', tiempoEstMin: 9 },
      { secuencia: 2, operacion: 'Expansión hidráulica', maquina: 'Prensa P-01', tiempoEstMin: 28 },
      { secuencia: 3, operacion: 'Conformado excéntrico', maquina: 'Prensa P-03', tiempoEstMin: 26 },
      { secuencia: 4, operacion: 'Bisel de extremos', maquina: 'Biseladora B-01', tiempoEstMin: 12 },
      { secuencia: 5, operacion: 'Inspección', maquina: 'Celda QA-02', tiempoEstMin: 10 },
    ],
    bom: [
      { material: 'Tubo acero 4 in', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Lubricante de conformado', cantPorUnidad: 0.3, unidad: 'L' },
      { material: 'Pintura primer', cantPorUnidad: 0.1, unidad: 'L' },
    ],
  },
  {
    nombre: 'Tee Equal DN100',
    sku: 'TEE-DN100',
    unidad: 'ud',
    versionBOM: 'v2.0',
    costoUnitario: 120000,
    ruta: [
      { secuencia: 1, operacion: 'Corte de tubo', maquina: 'Sierra CNC-01', tiempoEstMin: 10 },
      { secuencia: 2, operacion: 'Punzonado central', maquina: 'Prensa P-02', tiempoEstMin: 20 },
      { secuencia: 3, operacion: 'Extrusión de ramal', maquina: 'Prensa P-04', tiempoEstMin: 34 },
      { secuencia: 4, operacion: 'Calibrado', maquina: 'Estación E-02', tiempoEstMin: 18 },
      { secuencia: 5, operacion: 'Bisel de 3 bocas', maquina: 'Biseladora B-02', tiempoEstMin: 20 },
      { secuencia: 6, operacion: 'Inspección', maquina: 'Celda QA-02', tiempoEstMin: 12 },
    ],
    bom: [
      { material: 'Tubo SCH40 100 mm', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Refuerzo soldado', cantPorUnidad: 1, unidad: 'ud' },
      { material: 'Gas de extrusión', cantPorUnidad: 0.6, unidad: 'm³' },
      { material: 'Pintura primer', cantPorUnidad: 0.15, unidad: 'L' },
    ],
  },
];

const getProducto = (nombre: string): ProductoInfo | undefined =>
  PRODUCTOS.find((p) => p.nombre === nombre);

const fmtCOP = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

// ─── Mock Data ────────────────────────────────────────────────────────────────
const baseOrdenes: Omit<OrdenProduccion, 'turno' | 'cliente' | 'versionBOM' | 'observaciones'>[] = [
  { id: '1',  numero: 'OP-2024-001', producto: 'Válvula de Control DN50',   linea: 'Línea A', estado: 'PLANEADA',     prioridad: 'URGENTE', cantidadPlanificada: 500,  cantidadProducida: 0,    fechaInicio: '2024-07-01', fechaFin: '2024-07-10', responsable: 'Carlos Méndez', scrap: 0  },
  { id: '2',  numero: 'OP-2024-002', producto: 'Brida Ciega DN80',          linea: 'Línea B', estado: 'PLANEADA',     prioridad: 'ALTA',    cantidadPlanificada: 250,  cantidadProducida: 0,    fechaInicio: '2024-07-05', fechaFin: '2024-07-12', responsable: 'Ana Torres',    scrap: 0  },
  { id: '3',  numero: 'OP-2024-003', producto: 'Codo 90° SCH40',            linea: 'Línea C', estado: 'PLANEADA',     prioridad: 'NORMAL',  cantidadPlanificada: 1000, cantidadProducida: 0,    fechaInicio: '2024-07-08', fechaFin: '2024-07-18', responsable: 'Luis Herrera',  scrap: 0  },
  { id: '4',  numero: 'OP-2024-004', producto: 'Reducción Excéntrica 4x3',  linea: 'Línea A', estado: 'PLANEADA',     prioridad: 'NORMAL',  cantidadPlanificada: 300,  cantidadProducida: 0,    fechaInicio: '2024-07-10', fechaFin: '2024-07-20', responsable: 'María López',   scrap: 0  },
  { id: '5',  numero: 'OP-2024-005', producto: 'Válvula de Control DN50',   linea: 'Línea B', estado: 'LIBERADA',     prioridad: 'URGENTE', cantidadPlanificada: 400,  cantidadProducida: 120,  fechaInicio: '2024-06-25', fechaFin: '2024-07-05', responsable: 'Carlos Méndez', scrap: 5  },
  { id: '6',  numero: 'OP-2024-006', producto: 'Tee Equal DN100',           linea: 'Línea C', estado: 'LIBERADA',     prioridad: 'ALTA',    cantidadPlanificada: 600,  cantidadProducida: 200,  fechaInicio: '2024-06-28', fechaFin: '2024-07-08', responsable: 'Pedro Gómez',   scrap: 8  },
  { id: '7',  numero: 'OP-2024-007', producto: 'Brida Ciega DN80',          linea: 'Línea A', estado: 'LIBERADA',     prioridad: 'NORMAL',  cantidadPlanificada: 150,  cantidadProducida: 50,   fechaInicio: '2024-06-30', fechaFin: '2024-07-07', responsable: 'Ana Torres',    scrap: 2  },
  { id: '8',  numero: 'OP-2024-008', producto: 'Codo 90° SCH40',            linea: 'Línea B', estado: 'EN EJECUCIÓN', prioridad: 'URGENTE', cantidadPlanificada: 800,  cantidadProducida: 600,  fechaInicio: '2024-06-20', fechaFin: '2024-06-30', responsable: 'Luis Herrera',  scrap: 15 },
  { id: '9',  numero: 'OP-2024-009', producto: 'Reducción Excéntrica 4x3',  linea: 'Línea C', estado: 'EN EJECUCIÓN', prioridad: 'ALTA',    cantidadPlanificada: 200,  cantidadProducida: 130,  fechaInicio: '2024-06-22', fechaFin: '2024-07-02', responsable: 'María López',   scrap: 6  },
  { id: '10', numero: 'OP-2024-010', producto: 'Tee Equal DN100',           linea: 'Línea A', estado: 'EN EJECUCIÓN', prioridad: 'NORMAL',  cantidadPlanificada: 350,  cantidadProducida: 180,  fechaInicio: '2024-06-24', fechaFin: '2024-07-04', responsable: 'Pedro Gómez',   scrap: 10 },
  { id: '11', numero: 'OP-2024-011', producto: 'Válvula de Control DN50',   linea: 'Línea B', estado: 'SUSPENDIDA',   prioridad: 'ALTA',    cantidadPlanificada: 700,  cantidadProducida: 300,  fechaInicio: '2024-06-15', fechaFin: '2024-06-25', responsable: 'Carlos Méndez', scrap: 20 },
  { id: '12', numero: 'OP-2024-012', producto: 'Brida Ciega DN80',          linea: 'Línea C', estado: 'CERRADA',      prioridad: 'URGENTE', cantidadPlanificada: 500,  cantidadProducida: 498,  fechaInicio: '2024-06-01', fechaFin: '2024-06-10', responsable: 'Ana Torres',    scrap: 2  },
  { id: '13', numero: 'OP-2024-013', producto: 'Codo 90° SCH40',            linea: 'Línea A', estado: 'CERRADA',      prioridad: 'NORMAL',  cantidadPlanificada: 1200, cantidadProducida: 1195, fechaInicio: '2024-06-05', fechaFin: '2024-06-15', responsable: 'Luis Herrera',  scrap: 5  },
];

const mockOrdenes: OrdenProduccion[] = baseOrdenes.map((o, i) => ({
  ...o,
  turno: TURNOS[i % TURNOS.length],
  cliente: CLIENTES[i % CLIENTES.length],
  versionBOM: getProducto(o.producto)?.versionBOM ?? 'v1.0',
  observaciones: '',
}));

// ─── Kanban column config ─────────────────────────────────────────────────────
const kanbanColumnas: KanbanColumna[] = [
  { estado: 'PLANEADA',     color: '#6B7280', textColor: '#D1D5DB' },
  { estado: 'LIBERADA',     color: '#3B82F6', textColor: '#BFDBFE' },
  { estado: 'EN EJECUCIÓN', color: '#10B981', textColor: '#A7F3D0' },
  { estado: 'SUSPENDIDA',   color: '#F59E0B', textColor: '#FDE68A' },
  { estado: 'CERRADA',      color: MES_COLOR,  textColor: '#A5F3FC' },
];

const ESTADOS: EstadoOrden[] = ['PLANEADA', 'LIBERADA', 'EN EJECUCIÓN', 'SUSPENDIDA', 'CERRADA'];

// ─── Utility helpers ──────────────────────────────────────────────────────────
function getPrioridadColor(p: Prioridad): 'error' | 'warning' | 'info' {
  if (p === 'URGENTE') return 'error';
  if (p === 'ALTA') return 'warning';
  return 'info';
}

function getEstadoColor(e: EstadoOrden): string {
  switch (e) {
    case 'PLANEADA':     return '#6B7280';
    case 'LIBERADA':     return '#3B82F6';
    case 'EN EJECUCIÓN': return '#10B981';
    case 'SUSPENDIDA':   return '#F59E0B';
    case 'CERRADA':      return MES_COLOR;
    default:             return '#6B7280';
  }
}

function calcAvance(plan: number, real: number): number {
  if (plan === 0) return 0;
  return Math.min(100, Math.round((real / plan) * 100));
}

type OpEstado = 'Completada' | 'En proceso' | 'Pendiente';

function deriveRutaEstado(orden: OrdenProduccion, ruta: OperacionRuta[]): OpEstado[] {
  const avance = calcAvance(orden.cantidadPlanificada, orden.cantidadProducida);
  let completed: number;
  if (orden.estado === 'PLANEADA') completed = 0;
  else if (orden.estado === 'CERRADA') completed = ruta.length;
  else completed = Math.floor((avance / 100) * ruta.length);

  return ruta.map((_, i) => {
    if (i < completed) return 'Completada';
    if (i === completed && orden.estado !== 'CERRADA' && orden.estado !== 'PLANEADA') return 'En proceso';
    return 'Pendiente';
  });
}

interface EventoHistorial {
  fecha: string;
  titulo: string;
  detalle: string;
  color: string;
}

function deriveHistorial(orden: OrdenProduccion): EventoHistorial[] {
  const eventos: EventoHistorial[] = [];
  eventos.push({ fecha: orden.fechaInicio, titulo: 'Orden creada y planificada', detalle: `Plan: ${orden.cantidadPlanificada.toLocaleString()} ${getProducto(orden.producto)?.unidad ?? 'ud'} · BOM ${orden.versionBOM}`, color: '#6B7280' });
  if (orden.estado !== 'PLANEADA') {
    eventos.push({ fecha: orden.fechaInicio, titulo: 'Orden liberada a piso', detalle: `Asignada a ${orden.linea} · Turno ${orden.turno.split(' ')[0]}`, color: '#3B82F6' });
  }
  if (orden.cantidadProducida > 0) {
    eventos.push({ fecha: orden.fechaInicio, titulo: 'Inicio de producción', detalle: `Responsable ${orden.responsable}`, color: '#10B981' });
    eventos.push({ fecha: orden.fechaInicio, titulo: 'Reporte de avance', detalle: `${orden.cantidadProducida.toLocaleString()} uds producidas · ${orden.scrap} scrap`, color: '#0891B2' });
  }
  if (orden.estado === 'SUSPENDIDA') {
    eventos.push({ fecha: orden.fechaFin, titulo: 'Orden suspendida', detalle: 'Producción detenida por novedad en línea', color: '#F59E0B' });
  }
  if (orden.estado === 'CERRADA') {
    eventos.push({ fecha: orden.fechaFin, titulo: 'Orden cerrada', detalle: `Producción finalizada · Rendimiento ${calcAvance(orden.cantidadPlanificada, orden.cantidadProducida)}%`, color: MES_COLOR });
  }
  return eventos;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  color?: string;
}

function ProgressBar({ value, color = MES_COLOR }: ProgressBarProps) {
  return (
    <Box sx={{ width: '100%', height: 6, borderRadius: 3, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
      <Box sx={{ width: `${value}%`, height: '100%', borderRadius: 3, bgcolor: color, transition: 'width 0.4s ease' }} />
    </Box>
  );
}

interface KanbanCardProps {
  orden: OrdenProduccion;
  onOpen: (o: OrdenProduccion) => void;
  onDragStart: (o: OrdenProduccion) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function KanbanCard({ orden, onOpen, onDragStart, onDragEnd, isDragging }: KanbanCardProps) {
  const avance = calcAvance(orden.cantidadPlanificada, orden.cantidadProducida);
  // Evita que un arrastre dispare el onClick que abre el detalle
  const draggedRef = useRef(false);

  return (
    <Paper
      draggable
      onDragStart={(e) => {
        draggedRef.current = true;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', orden.id);
        onDragStart(orden);
      }}
      onDragEnd={() => { onDragEnd(); window.setTimeout(() => { draggedRef.current = false; }, 50); }}
      onClick={() => { if (!draggedRef.current) onOpen(orden); }}
      sx={{
        bgcolor: BG_CARD,
        border: `1px solid ${MES_BORDER}`,
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': { borderColor: MES_COLOR, boxShadow: `0 0 8px rgba(8,145,178,0.25)`, transform: 'translateY(-1px)' },
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s, opacity 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: MES_COLOR, letterSpacing: 0.5 }}>
          {orden.numero}
        </Typography>
        <Chip
          label={orden.prioridad}
          color={getPrioridadColor(orden.prioridad)}
          size="small"
          sx={{ fontSize: 9, height: 18, fontWeight: 700 }}
        />
      </Box>

      <Typography sx={{ fontSize: 12, fontWeight: 600, color: TXT_PRIMARY, mb: 1, lineHeight: 1.3 }}>
        {orden.producto}
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>
            {orden.cantidadProducida.toLocaleString()} / {orden.cantidadPlanificada.toLocaleString()} uds
          </Typography>
          <Typography sx={{ fontSize: 10, color: MES_COLOR, fontWeight: 700 }}>{avance}%</Typography>
        </Box>
        <ProgressBar value={avance} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>
          Fin: <span style={{ color: '#334155' }}>{orden.fechaFin}</span>
        </Typography>
        <Typography sx={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
          {orden.responsable.split(' ')[0]}
        </Typography>
      </Box>
    </Paper>
  );
}

// ─── Detail dialog ──────────────────────────────────────────────────────────────
interface OrdenDetailDialogProps {
  orden: OrdenProduccion;
  onClose: () => void;
  onChangeEstado: (orden: OrdenProduccion, nuevo: EstadoOrden) => void;
}

function InfoTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 1.25, border: '1px solid #EEF2F6' }}>
      <Typography sx={{ fontSize: 10, color: TXT_SECONDARY, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: accent ?? TXT_PRIMARY }}>{value}</Typography>
    </Box>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box sx={{ bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 2, p: 1.5, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, color: TXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

function OrdenDetailDialog({ orden, onClose, onChangeEstado }: OrdenDetailDialogProps) {
  const [targetEstado, setTargetEstado] = useState<EstadoOrden | ''>('');
  const [confirming, setConfirming] = useState(false);

  const info = getProducto(orden.producto);
  const avance = calcAvance(orden.cantidadPlanificada, orden.cantidadProducida);
  const estadoColor = getEstadoColor(orden.estado);
  const rutaEstados = info ? deriveRutaEstado(orden, info.ruta) : [];
  const historial = deriveHistorial(orden);
  const tiempoCiclo = info ? info.ruta.reduce((s, r) => s + r.tiempoEstMin, 0) : 0;
  const costoTotal = info ? info.costoUnitario * orden.cantidadPlanificada : 0;
  const scrapRate = orden.cantidadProducida > 0 ? ((orden.scrap / orden.cantidadProducida) * 100).toFixed(1) : '0.0';

  const opColor = (e: OpEstado) => (e === 'Completada' ? '#10B981' : e === 'En proceso' ? MES_COLOR : '#94A3B8');

  const handleConfirm = () => {
    if (targetEstado) onChangeEstado(orden, targetEstado);
    setConfirming(false);
    setTargetEstado('');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${MES_COLOR}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FactoryIcon sx={{ fontSize: 20, color: MES_COLOR }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: MES_COLOR }}>{orden.numero}</Typography>
            <Typography sx={{ fontSize: 12, color: TXT_SECONDARY }}>{orden.producto}</Typography>
          </Box>
          <Chip
            label={orden.estado}
            size="small"
            sx={{ bgcolor: `${estadoColor}22`, color: estadoColor, border: `1px solid ${estadoColor}55`, fontSize: 10, fontWeight: 700, height: 22, ml: 1 }}
          />
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#EEF2F6' }}>
        {/* KPIs */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, md: 3 }}><KpiTile label="Avance" value={`${avance}%`} color={MES_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><KpiTile label="Producido / Plan" value={`${orden.cantidadProducida.toLocaleString()} / ${orden.cantidadPlanificada.toLocaleString()}`} color={TXT_PRIMARY} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><KpiTile label={`Scrap (${scrapRate}%)`} value={`${orden.scrap} uds`} color={orden.scrap > 10 ? '#DC2626' : '#F59E0B'} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><KpiTile label="Costo estimado" value={fmtCOP(costoTotal)} color="#10B981" /></Grid>
        </Grid>

        {/* Progreso */}
        <Box sx={{ mb: 2 }}>
          <ProgressBar value={avance} color={avance >= 100 ? '#10B981' : avance >= 50 ? MES_COLOR : '#F59E0B'} />
        </Box>

        {/* Ficha */}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TXT_PRIMARY, mb: 1 }}>Ficha de la orden</Typography>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="SKU / Producto" value={info?.sku ?? '—'} accent={MES_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Versión BOM" value={orden.versionBOM} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Línea" value={orden.linea} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Turno" value={orden.turno} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Prioridad" value={orden.prioridad} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Responsable" value={orden.responsable} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Cliente" value={orden.cliente} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Tiempo ciclo / ud" value={`${tiempoCiclo} min`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Fecha inicio" value={orden.fechaInicio} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Fecha fin" value={orden.fechaFin} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Costo unitario" value={info ? fmtCOP(info.costoUnitario) : '—'} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><InfoTile label="Unidad" value={info?.unidad ?? 'ud'} /></Grid>
        </Grid>

        {orden.observaciones && (
          <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #EEF2F6', borderRadius: 1.5, p: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: 10, color: TXT_SECONDARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>Observaciones</Typography>
            <Typography sx={{ fontSize: 12, color: '#334155' }}>{orden.observaciones}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Ruta de operaciones */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <RouteIcon sx={{ fontSize: 18, color: MES_COLOR }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TXT_PRIMARY }}>Ruta de operaciones</Typography>
        </Stack>
        <TableContainer component={Paper} sx={{ bgcolor: BG_CARD, border: '1px solid #E5E7EB', borderRadius: 2, mb: 2, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(8,145,178,0.08)' }}>
                {['#', 'Operación', 'Máquina', 'T. Est.', 'Estado'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {info?.ruta.map((op, i) => (
                <TableRow key={op.secuencia}>
                  <TableCell sx={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, borderBottom: '1px solid #F1F5F9' }}>{op.secuencia}</TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>{op.operacion}</TableCell>
                  <TableCell sx={{ color: TXT_SECONDARY, fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>{op.maquina}</TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>{op.tiempoEstMin} min</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                    <Chip label={rutaEstados[i]} size="small" sx={{ bgcolor: `${opColor(rutaEstados[i])}18`, color: opColor(rutaEstados[i]), fontSize: 10, fontWeight: 700, height: 20 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Materiales / BOM */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <BomIcon sx={{ fontSize: 18, color: MES_COLOR }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TXT_PRIMARY }}>Materiales / Lista de materiales (BOM {orden.versionBOM})</Typography>
        </Stack>
        <TableContainer component={Paper} sx={{ bgcolor: BG_CARD, border: '1px solid #E5E7EB', borderRadius: 2, mb: 2, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(8,145,178,0.08)' }}>
                {['Material', 'Por unidad', 'Requerido (plan)', 'Consumido (real)'].map((h) => (
                  <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #E5E7EB' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {info?.bom.map((m) => {
                const requerido = m.cantPorUnidad * orden.cantidadPlanificada;
                const consumido = m.cantPorUnidad * orden.cantidadProducida;
                return (
                  <TableRow key={m.material}>
                    <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>{m.material}</TableCell>
                    <TableCell sx={{ color: TXT_SECONDARY, fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>{m.cantPorUnidad} {m.unidad}</TableCell>
                    <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>{requerido.toLocaleString()} {m.unidad}</TableCell>
                    <TableCell sx={{ color: MES_COLOR, fontSize: 12, fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>{consumido.toLocaleString()} {m.unidad}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Historial */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <HistoryIcon sx={{ fontSize: 18, color: MES_COLOR }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TXT_PRIMARY }}>Historial de la orden</Typography>
        </Stack>
        <Stack spacing={1.25} sx={{ mb: 1 }}>
          {historial.map((ev, i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ev.color, mt: 0.5, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: TXT_PRIMARY }}>{ev.titulo}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{ev.fecha}</Typography>
                </Stack>
                <Typography sx={{ fontSize: 11, color: TXT_SECONDARY }}>{ev.detalle}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Cambio de estado */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <SwapIcon sx={{ fontSize: 18, color: MES_COLOR }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TXT_PRIMARY }}>Cambiar estado de la orden</Typography>
        </Stack>
        {!confirming ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Nuevo estado</InputLabel>
              <Select
                value={targetEstado}
                label="Nuevo estado"
                onChange={(e: SelectChangeEvent) => setTargetEstado(e.target.value as EstadoOrden)}
              >
                {ESTADOS.filter((e) => e !== orden.estado).map((e) => (
                  <MenuItem key={e} value={e}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getEstadoColor(e) }} />
                      <span>{e}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              disabled={!targetEstado}
              onClick={() => setConfirming(true)}
              startIcon={<SwapIcon />}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, '&:disabled': { bgcolor: 'rgba(8,145,178,0.3)', color: '#fff' }, fontWeight: 700, borderRadius: 1.5 }}
            >
              Cambiar estado
            </Button>
          </Stack>
        ) : (
          <Alert
            severity="warning"
            sx={{ bgcolor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            action={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setConfirming(false)} sx={{ color: TXT_SECONDARY, fontWeight: 600 }}>Cancelar</Button>
                <Button size="small" variant="contained" onClick={handleConfirm} startIcon={<CheckIcon />} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, fontWeight: 700 }}>Confirmar</Button>
              </Stack>
            }
          >
            ¿Confirmas cambiar <strong>{orden.numero}</strong> de <strong>{orden.estado}</strong> a <strong>{targetEstado}</strong>?
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: TXT_SECONDARY, fontWeight: 600 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab 0: Kanban ────────────────────────────────────────────────────────────
function TabKanban({ ordenes, onOpen, onMove }: { ordenes: OrdenProduccion[]; onOpen: (o: OrdenProduccion) => void; onMove: (id: string, estado: EstadoOrden) => void }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<EstadoOrden | null>(null);
  return (
    <Box sx={{ overflowX: 'auto', pb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, minWidth: 1100 }}>
        {kanbanColumnas.map((col) => {
          const cols = ordenes.filter((o) => o.estado === col.estado);
          const isOver = overCol === col.estado;
          return (
            <Box
              key={col.estado}
              onDragOver={(e) => { if (!draggedId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overCol !== col.estado) setOverCol(col.estado); }}
              onDrop={(e) => { e.preventDefault(); if (draggedId) onMove(draggedId, col.estado); setDraggedId(null); setOverCol(null); }}
              sx={{ flex: '0 0 210px', display: 'flex', flexDirection: 'column', borderRadius: 1, bgcolor: isOver ? `${col.color}14` : 'transparent', outline: isOver ? `2px dashed ${col.color}` : 'none', outlineOffset: 2, transition: 'background-color 0.15s' }}
            >
              <Box
                sx={{
                  borderTop: `3px solid ${col.color}`,
                  bgcolor: BG_CARD,
                  borderRadius: '4px 4px 0 0',
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  border: `1px solid #E5E7EB`,
                  borderTopColor: col.color,
                }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: col.color, letterSpacing: 1 }}>{col.estado}</Typography>
                <Box
                  sx={{
                    bgcolor: col.color,
                    color: '#fff',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {cols.length}
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                {cols.map((o) => (
                  <KanbanCard key={o.id} orden={o} onOpen={onOpen}
                    onDragStart={(od) => setDraggedId(od.id)}
                    onDragEnd={() => { setDraggedId(null); setOverCol(null); }}
                    isDragging={draggedId === o.id} />
                ))}
                {cols.length === 0 && (
                  <Typography sx={{ fontSize: 11, color: '#475569', textAlign: 'center', mt: 3 }}>Sin órdenes</Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Tab 1: Tabla ─────────────────────────────────────────────────────────────
function TabTabla({ ordenes, onOpen, onExport }: { ordenes: OrdenProduccion[]; onOpen: (o: OrdenProduccion) => void; onExport: () => void }) {
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('TODOS');
  const [filterLinea, setFilterLinea] = useState<string>('TODOS');

  const filtered = ordenes.filter((o) => {
    const matchSearch =
      searchText === '' ||
      o.numero.toLowerCase().includes(searchText.toLowerCase()) ||
      o.producto.toLowerCase().includes(searchText.toLowerCase()) ||
      o.responsable.toLowerCase().includes(searchText.toLowerCase());
    const matchEstado = filterEstado === 'TODOS' || o.estado === filterEstado;
    const matchPrioridad = filterPrioridad === 'TODOS' || o.prioridad === filterPrioridad;
    const matchLinea = filterLinea === 'TODOS' || o.linea === filterLinea;
    return matchSearch && matchEstado && matchPrioridad && matchLinea;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Buscar orden, producto o responsable"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ minWidth: 280 }}
        />

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={filterEstado} label="Estado" onChange={(e: SelectChangeEvent) => setFilterEstado(e.target.value)}>
            <MenuItem value="TODOS">Todos</MenuItem>
            {ESTADOS.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Prioridad</InputLabel>
          <Select value={filterPrioridad} label="Prioridad" onChange={(e: SelectChangeEvent) => setFilterPrioridad(e.target.value)}>
            <MenuItem value="TODOS">Todas</MenuItem>
            <MenuItem value="URGENTE">URGENTE</MenuItem>
            <MenuItem value="ALTA">ALTA</MenuItem>
            <MenuItem value="NORMAL">NORMAL</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Línea</InputLabel>
          <Select value={filterLinea} label="Línea" onChange={(e: SelectChangeEvent) => setFilterLinea(e.target.value)}>
            <MenuItem value="TODOS">Todas</MenuItem>
            {LINEAS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          onClick={onExport}
          sx={{ borderColor: MES_BORDER, color: MES_COLOR, fontWeight: 700, '&:hover': { borderColor: MES_COLOR, bgcolor: 'rgba(8,145,178,0.06)' } }}
        >
          Exportar
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(8,145,178,0.1)' }}>
              {['N° Orden', 'Producto', 'Línea', 'Estado', 'Prioridad', 'Cant. Plan', 'Cant. Real', '% Avance', 'Fecha Inicio', 'Fecha Fin', 'Scrap'].map((h) => (
                <TableCell key={h} sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${MES_BORDER}`, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((o, idx) => {
              const avance = calcAvance(o.cantidadPlanificada, o.cantidadProducida);
              const estadoColor = getEstadoColor(o.estado);
              return (
                <TableRow
                  key={o.id}
                  onClick={() => onOpen(o)}
                  sx={{
                    bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(8,145,178,0.06)' },
                  }}
                >
                  <TableCell sx={{ color: MES_COLOR, fontSize: 12, fontWeight: 700, borderBottom: `1px solid #E5E7EB` }}>{o.numero}</TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB`, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.producto}</TableCell>
                  <TableCell sx={{ color: TXT_SECONDARY, fontSize: 12, borderBottom: `1px solid #E5E7EB` }}>{o.linea}</TableCell>
                  <TableCell sx={{ borderBottom: `1px solid #E5E7EB` }}>
                    <Chip label={o.estado} size="small" sx={{ bgcolor: `${estadoColor}22`, color: estadoColor, border: `1px solid ${estadoColor}55`, fontSize: 10, fontWeight: 700, height: 20 }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid #E5E7EB` }}>
                    <Chip label={o.prioridad} color={getPrioridadColor(o.prioridad)} size="small" sx={{ fontSize: 10, fontWeight: 700, height: 20 }} />
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, textAlign: 'right', borderBottom: `1px solid #E5E7EB` }}>{o.cantidadPlanificada.toLocaleString()}</TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, textAlign: 'right', borderBottom: `1px solid #E5E7EB` }}>{o.cantidadProducida.toLocaleString()}</TableCell>
                  <TableCell sx={{ borderBottom: `1px solid #E5E7EB`, minWidth: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                        <Box sx={{ width: `${avance}%`, height: '100%', borderRadius: 3, bgcolor: avance >= 100 ? '#10B981' : avance >= 50 ? MES_COLOR : '#F59E0B' }} />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: '#334155', minWidth: 30 }}>{avance}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: TXT_SECONDARY, fontSize: 12, borderBottom: `1px solid #E5E7EB`, whiteSpace: 'nowrap' }}>{o.fechaInicio}</TableCell>
                  <TableCell sx={{ color: TXT_SECONDARY, fontSize: 12, borderBottom: `1px solid #E5E7EB`, whiteSpace: 'nowrap' }}>{o.fechaFin}</TableCell>
                  <TableCell sx={{ color: o.scrap > 10 ? '#DC2626' : TXT_SECONDARY, fontSize: 12, textAlign: 'right', borderBottom: `1px solid #E5E7EB` }}>{o.scrap}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} sx={{ textAlign: 'center', color: '#475569', py: 4, borderBottom: 'none' }}>
                  No se encontraron órdenes con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography sx={{ fontSize: 11, color: '#475569', mt: 1 }}>
        Mostrando {filtered.length} de {ordenes.length} órdenes
      </Typography>
    </Box>
  );
}

// ─── Tab 2: Nueva Orden ───────────────────────────────────────────────────────
function TabNuevaOrden({ nextNumero, onCreate }: { nextNumero: string; onCreate: (o: OrdenProduccion) => void }) {
  const initialForm: FormNuevaOrden = {
    producto: '',
    linea: '',
    cantidad: '',
    costoUnitario: '',
    prioridad: 'NORMAL',
    turno: '',
    fechaInicio: '',
    fechaFin: '',
    responsable: '',
    cliente: '',
    observaciones: '',
  };

  const [form, setForm] = useState<FormNuevaOrden>(initialForm);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  const info = getProducto(form.producto);

  const handleChange = (field: keyof FormNuevaOrden, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProducto = (nombre: string) => {
    const p = getProducto(nombre);
    setForm((prev) => ({ ...prev, producto: nombre, costoUnitario: p ? String(p.costoUnitario) : '' }));
  };

  const cantNum = Number(form.cantidad);
  const isValid =
    form.producto !== '' &&
    form.linea !== '' &&
    form.cantidad !== '' && cantNum > 0 &&
    form.turno !== '' &&
    form.fechaInicio !== '' &&
    form.fechaFin !== '' &&
    form.responsable !== '' &&
    form.cliente !== '';

  const handleSubmit = () => {
    setTriedSubmit(true);
    if (!isValid) {
      setWarnOpen(true);
      return;
    }
    const nueva: OrdenProduccion = {
      id: `${Date.now()}`,
      numero: nextNumero,
      producto: form.producto,
      linea: form.linea,
      estado: 'PLANEADA',
      prioridad: form.prioridad,
      cantidadPlanificada: cantNum,
      cantidadProducida: 0,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      responsable: form.responsable,
      scrap: 0,
      turno: form.turno,
      cliente: form.cliente,
      versionBOM: info?.versionBOM ?? 'v1.0',
      observaciones: form.observaciones,
    };
    onCreate(nueva);
    setForm(initialForm);
    setTriedSubmit(false);
  };

  const menuProps = {
    PaperProps: { sx: { '& .MuiMenuItem-root:hover': { bgcolor: 'rgba(8,145,178,0.08)' } } },
  };

  return (
    <Box>
      <Paper sx={{ bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 2, p: 3, maxWidth: 960 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: MES_COLOR }}>Nueva Orden de Producción</Typography>
          <Chip label={nextNumero} sx={{ bgcolor: `${MES_COLOR}1F`, color: MES_COLOR, fontWeight: 800, fontSize: 13, height: 30 }} />
        </Stack>

        <Grid container spacing={2.5}>
          {/* N° Orden (read-only) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="N° Orden"
              value={nextNumero}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              helperText="Generado automáticamente"
              sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(8,145,178,0.08)', color: MES_COLOR } }}
            />
          </Grid>

          {/* Producto */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" error={triedSubmit && !form.producto}>
              <InputLabel>Producto *</InputLabel>
              <Select value={form.producto} label="Producto *" onChange={(e: SelectChangeEvent) => handleProducto(e.target.value)} MenuProps={menuProps}>
                {PRODUCTOS.map((p) => <MenuItem key={p.nombre} value={p.nombre}>{p.nombre}</MenuItem>)}
              </Select>
              <FormHelperText>{triedSubmit && !form.producto ? 'Seleccione el producto' : info ? `SKU ${info.sku}` : ' '}</FormHelperText>
            </FormControl>
          </Grid>

          {/* SKU (auto, readonly) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="SKU"
              value={info?.sku ?? ''}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              helperText="Se autocompleta con el producto"
              sx={{ '& .MuiInputBase-root': { bgcolor: '#F8FAFC', color: TXT_SECONDARY } }}
            />
          </Grid>

          {/* Versión BOM (auto, readonly) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Versión BOM"
              value={info?.versionBOM ?? ''}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              helperText="Vigente para el producto"
              sx={{ '& .MuiInputBase-root': { bgcolor: '#F8FAFC', color: TXT_SECONDARY } }}
            />
          </Grid>

          {/* Línea */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" error={triedSubmit && !form.linea}>
              <InputLabel>Línea de Producción *</InputLabel>
              <Select value={form.linea} label="Línea de Producción *" onChange={(e: SelectChangeEvent) => handleChange('linea', e.target.value)} MenuProps={menuProps}>
                {LINEAS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
              <FormHelperText>{triedSubmit && !form.linea ? 'Seleccione la línea' : ' '}</FormHelperText>
            </FormControl>
          </Grid>

          {/* Turno */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" error={triedSubmit && !form.turno}>
              <InputLabel>Turno *</InputLabel>
              <Select value={form.turno} label="Turno *" onChange={(e: SelectChangeEvent) => handleChange('turno', e.target.value)} MenuProps={menuProps}>
                {TURNOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
              <FormHelperText>{triedSubmit && !form.turno ? 'Seleccione el turno' : ' '}</FormHelperText>
            </FormControl>
          </Grid>

          {/* Cantidad */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Cantidad Planificada *"
              type="number"
              value={form.cantidad}
              onChange={(e) => handleChange('cantidad', e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 1 }}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{info?.unidad ?? 'ud'}</Typography></InputAdornment> }}
              error={triedSubmit && (!form.cantidad || cantNum <= 0)}
              helperText={triedSubmit && (!form.cantidad || cantNum <= 0) ? 'Ingrese una cantidad mayor a 0' : ' '}
            />
          </Grid>

          {/* Costo unitario (auto, readonly, moneda) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Costo Unitario"
              value={info ? info.costoUnitario.toLocaleString('es-CO') : ''}
              fullWidth
              size="small"
              InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: 12, color: '#94A3B8' }}>$</Typography></InputAdornment> }}
              helperText={info && cantNum > 0 ? `Total: ${fmtCOP(info.costoUnitario * cantNum)}` : 'Se autocompleta con el producto'}
              sx={{ '& .MuiInputBase-root': { bgcolor: '#F8FAFC', color: TXT_SECONDARY } }}
            />
          </Grid>

          {/* Responsable */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" error={triedSubmit && !form.responsable}>
              <InputLabel>Responsable *</InputLabel>
              <Select value={form.responsable} label="Responsable *" onChange={(e: SelectChangeEvent) => handleChange('responsable', e.target.value)} MenuProps={menuProps}>
                {RESPONSABLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
              <FormHelperText>{triedSubmit && !form.responsable ? 'Seleccione el responsable' : ' '}</FormHelperText>
            </FormControl>
          </Grid>

          {/* Cliente */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" error={triedSubmit && !form.cliente}>
              <InputLabel>Cliente / Destino *</InputLabel>
              <Select value={form.cliente} label="Cliente / Destino *" onChange={(e: SelectChangeEvent) => handleChange('cliente', e.target.value)} MenuProps={menuProps}>
                {CLIENTES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
              <FormHelperText>{triedSubmit && !form.cliente ? 'Seleccione el cliente' : ' '}</FormHelperText>
            </FormControl>
          </Grid>

          {/* Fecha Inicio */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Fecha Inicio Planificada *"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => handleChange('fechaInicio', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              error={triedSubmit && !form.fechaInicio}
              helperText={triedSubmit && !form.fechaInicio ? 'Requerida' : ' '}
            />
          </Grid>

          {/* Fecha Fin */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Fecha Fin Planificada *"
              type="date"
              value={form.fechaFin}
              onChange={(e) => handleChange('fechaFin', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              error={triedSubmit && !form.fechaFin}
              helperText={triedSubmit && !form.fechaFin ? 'Requerida' : ' '}
            />
          </Grid>

          {/* Prioridad */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ border: `1px solid ${MES_BORDER}`, borderRadius: 1, px: 2, py: 1, bgcolor: BG_CARD, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <FormLabel sx={{ color: TXT_SECONDARY, fontSize: 12, mb: 0.5 }}>Prioridad</FormLabel>
              <RadioGroup row value={form.prioridad} onChange={(e) => handleChange('prioridad', e.target.value)}>
                <FormControlLabel value="URGENTE" control={<Radio size="small" sx={{ color: '#EF4444', '&.Mui-checked': { color: '#EF4444' } }} />} label={<Typography sx={{ fontSize: 12, color: '#DC2626' }}>Urgente</Typography>} />
                <FormControlLabel value="ALTA" control={<Radio size="small" sx={{ color: '#F59E0B', '&.Mui-checked': { color: '#F59E0B' } }} />} label={<Typography sx={{ fontSize: 12, color: '#B45309' }}>Alta</Typography>} />
                <FormControlLabel value="NORMAL" control={<Radio size="small" sx={{ color: MES_COLOR, '&.Mui-checked': { color: MES_COLOR } }} />} label={<Typography sx={{ fontSize: 12, color: MES_DARK }}>Normal</Typography>} />
              </RadioGroup>
            </Box>
          </Grid>

          {/* Observaciones */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Observaciones"
              multiline
              rows={3}
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              fullWidth
              size="small"
              placeholder="Ingrese observaciones o notas adicionales para esta orden..."
            />
          </Grid>

          {/* Submit */}
          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              disabled={triedSubmit && !isValid}
              startIcon={<AddIcon />}
              sx={{
                bgcolor: MES_COLOR,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                py: 1.4,
                letterSpacing: 0.5,
                '&:hover': { bgcolor: MES_DARK },
                '&:disabled': { bgcolor: 'rgba(8,145,178,0.35)', color: '#fff' },
                borderRadius: 1.5,
              }}
            >
              Crear Orden de Producción
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={warnOpen}
        autoHideDuration={4000}
        onClose={() => setWarnOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setWarnOpen(false)} severity="warning" sx={{ bgcolor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
          Complete todos los campos obligatorios (*) antes de crear la orden.
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MESOrdenes() {
  const [tab, setTab] = useState(0);
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>(mockOrdenes);
  const [detailOrden, setDetailOrden] = useState<OrdenProduccion | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'info' }>({ open: false, msg: '', severity: 'success' });

  const notify = (msg: string, severity: 'success' | 'info' = 'success') => setSnack({ open: true, msg, severity });

  const nextNumero = `OP-2024-${String(ordenes.length + 1).padStart(3, '0')}`;

  const handleCreate = (o: OrdenProduccion) => {
    setOrdenes((prev) => [...prev, o]);
    notify(`Orden ${o.numero} creada exitosamente.`);
    setTab(1);
  };

  const handleChangeEstado = (orden: OrdenProduccion, nuevo: EstadoOrden) => {
    const updated: OrdenProduccion = { ...orden, estado: nuevo };
    if (nuevo === 'CERRADA' && updated.cantidadProducida === 0) {
      updated.cantidadProducida = updated.cantidadPlanificada;
    }
    setOrdenes((prev) => prev.map((o) => (o.id === orden.id ? updated : o)));
    setDetailOrden(updated);
    notify(`${orden.numero}: estado cambiado a ${nuevo}.`, 'info');
  };

  // Mover por arrastre en el Kanban (sin abrir el detalle)
  const handleMoveOrden = (id: string, nuevo: EstadoOrden) => {
    setOrdenes((prev) => prev.map((o) => {
      if (o.id !== id || o.estado === nuevo) return o;
      const updated: OrdenProduccion = { ...o, estado: nuevo };
      if (nuevo === 'CERRADA' && updated.cantidadProducida === 0) {
        updated.cantidadProducida = updated.cantidadPlanificada;
      }
      return updated;
    }));
    notify(`Orden movida a ${nuevo}.`, 'info');
  };

  const handleExport = () => notify('Exportando órdenes a Excel...', 'info');

  const kpis = [
    { label: 'Total Órdenes', value: ordenes.length, color: MES_COLOR },
    { label: 'En Ejecución', value: ordenes.filter((o) => o.estado === 'EN EJECUCIÓN').length, color: '#10B981' },
    { label: 'Liberadas', value: ordenes.filter((o) => o.estado === 'LIBERADA').length, color: '#3B82F6' },
    { label: 'Suspendidas', value: ordenes.filter((o) => o.estado === 'SUSPENDIDA').length, color: '#F59E0B' },
  ];

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', bgcolor: BG_PAGE, p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ width: 4, height: 28, bgcolor: MES_COLOR, borderRadius: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: TXT_PRIMARY, letterSpacing: 0.5 }}>
                Órdenes de Producción
              </Typography>
              <Chip label="MES" size="small" sx={{ bgcolor: `${MES_COLOR}22`, color: MES_COLOR, border: `1px solid ${MES_BORDER}`, fontWeight: 700, fontSize: 10, letterSpacing: 1 }} />
            </Box>
            <Typography sx={{ fontSize: 13, color: TXT_SECONDARY, ml: 3 }}>Gestión y seguimiento de órdenes de manufactura</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTab(2)}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, borderRadius: 1.5, fontWeight: 700 }}
          >
            Nueva Orden
          </Button>
        </Box>

        {/* KPI Strip */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
              <Paper sx={{ bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11, color: TXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.8 }}>{kpi.label}</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ bgcolor: BG_CARD, border: `1px solid ${MES_BORDER}`, borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${MES_BORDER}`,
              '& .MuiTab-root': { color: TXT_SECONDARY, fontWeight: 600, fontSize: 13, textTransform: 'none', minHeight: 48 },
              '& .Mui-selected': { color: MES_COLOR },
              '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
            }}
          >
            <Tab label="Kanban" />
            <Tab label="Tabla" />
            <Tab label="Nueva Orden" />
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            {tab === 0 && <TabKanban ordenes={ordenes} onOpen={setDetailOrden} onMove={handleMoveOrden} />}
            {tab === 1 && <TabTabla ordenes={ordenes} onOpen={setDetailOrden} onExport={handleExport} />}
            {tab === 2 && <TabNuevaOrden nextNumero={nextNumero} onCreate={handleCreate} />}
          </Box>
        </Box>
      </Box>

      {/* Detail dialog */}
      {detailOrden && (
        <OrdenDetailDialog
          key={detailOrden.id}
          orden={detailOrden}
          onClose={() => setDetailOrden(null)}
          onChangeEstado={handleChangeEstado}
        />
      )}

      {/* Global snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{
            bgcolor: snack.severity === 'success' ? '#ECFDF5' : '#ECFEFF',
            color: snack.severity === 'success' ? '#065F46' : MES_DARK,
            border: `1px solid ${snack.severity === 'success' ? '#10B981' : MES_COLOR}`,
            '& .MuiAlert-icon': { color: snack.severity === 'success' ? '#10B981' : MES_COLOR },
          }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
