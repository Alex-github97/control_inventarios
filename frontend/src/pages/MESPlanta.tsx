import React, { useState } from 'react';
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
  Switch,
  IconButton,
  Collapse,
  Divider,
  TableContainer,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FactoryIcon from '@mui/icons-material/Factory';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Layout } from '@/components/layout/Layout';

// ─── Constants ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2';
const MES_DARK = '#0E7490';
const MES_BORDER = 'rgba(8,145,178,0.25)';
const BG_MAIN = '#060C1A';
const BG_CARD = '#0F1E35';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface PlantLine {
  code: string;
  name: string;
  capacityPerHr: number;
  oee: number;
  status: 'ACTIVA' | 'INACTIVA' | 'MANTENIMIENTO';
  activeShift: string;
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
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
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
      { code: 'LN-001', name: 'Línea Ensamble A', capacityPerHr: 120, oee: 89.1, status: 'ACTIVA', activeShift: 'Turno Mañana' },
      { code: 'LN-002', name: 'Línea Ensamble B', capacityPerHr: 95, oee: 84.5, status: 'ACTIVA', activeShift: 'Turno Mañana' },
      { code: 'LN-003', name: 'Línea Mecanizado', capacityPerHr: 60, oee: 91.2, status: 'ACTIVA', activeShift: 'Turno Tarde' },
      { code: 'LN-004', name: 'Línea Pintura', capacityPerHr: 80, oee: 84.3, status: 'MANTENIMIENTO', activeShift: '—' },
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
      { code: 'LN-005', name: 'Línea Mezclado', capacityPerHr: 200, oee: 80.3, status: 'ACTIVA', activeShift: 'Turno Mañana' },
      { code: 'LN-006', name: 'Línea Envasado', capacityPerHr: 350, oee: 83.7, status: 'ACTIVA', activeShift: 'Turno Tarde' },
      { code: 'LN-007', name: 'Línea Etiquetado', capacityPerHr: 500, oee: 82.4, status: 'INACTIVA', activeShift: '—' },
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
      { code: 'LN-008', name: 'Línea Precisión 1', capacityPerHr: 45, oee: 93.2, status: 'ACTIVA', activeShift: 'Turno Mañana' },
      { code: 'LN-009', name: 'Línea Precisión 2', capacityPerHr: 45, oee: 89.6, status: 'ACTIVA', activeShift: 'Turno Mañana' },
    ],
  },
];

const EQUIPMENT: Equipment[] = [
  { code: 'EQ-001', name: 'Torno CNC 1', brand: 'Mazak', model: 'QT-200', assignedCell: 'Celda A', capacityPerHr: 15, oee: 91.2, status: 'OPERATIVO' },
  { code: 'EQ-002', name: 'Fresadora 1', brand: 'Haas', model: 'VF-2', assignedCell: 'Celda A', capacityPerHr: 12, oee: 87.5, status: 'OPERATIVO' },
  { code: 'EQ-003', name: 'Torno CNC 2', brand: 'Mazak', model: 'QT-250', assignedCell: 'Celda B', capacityPerHr: 18, oee: 43.0, status: 'MANTENIMIENTO' },
  { code: 'EQ-004', name: 'Centro de Mecanizado 1', brand: 'DMG Mori', model: 'DMU 50', assignedCell: 'Celda B', capacityPerHr: 8, oee: 94.1, status: 'OPERATIVO' },
  { code: 'EQ-005', name: 'Prensa Hidráulica 1', brand: 'Schuler', model: 'MSP-250', assignedCell: 'Celda C', capacityPerHr: 30, oee: 0.0, status: 'PARADO' },
  { code: 'EQ-006', name: 'Robot Soldadura 1', brand: 'KUKA', model: 'KR-6 R900', assignedCell: 'Celda C', capacityPerHr: 25, oee: 88.9, status: 'OPERATIVO' },
  { code: 'EQ-007', name: 'Fresadora 2', brand: 'Haas', model: 'VF-4', assignedCell: 'Celda D', capacityPerHr: 14, oee: 55.0, status: 'MANTENIMIENTO' },
  { code: 'EQ-008', name: 'Rectificadora 1', brand: 'STUDER', model: 'S33', assignedCell: 'Celda D', capacityPerHr: 10, oee: 90.3, status: 'OPERATIVO' },
  { code: 'EQ-009', name: 'Centro de Mecanizado 2', brand: 'Fanuc', model: 'Robodrill α-D14LiB', assignedCell: 'Celda E', capacityPerHr: 20, oee: 85.7, status: 'OPERATIVO' },
  { code: 'EQ-010', name: 'Taladradora CNC 1', brand: 'Heller', model: 'HMC 400', assignedCell: 'Celda E', capacityPerHr: 22, oee: 0.0, status: 'PARADO' },
];

const OPERATORS: Operator[] = [
  { code: 'OP-001', name: 'Carlos Mendoza', position: 'Operario A', plant: 'Planta Norte', currentShift: 'Mañana', assignedLine: 'Línea Ensamble A', certifications: ['ISO 9001', '5S'], status: 'ACTIVO' },
  { code: 'OP-002', name: 'Ana Gómez', position: 'Técnico Senior', plant: 'Planta Norte', currentShift: 'Mañana', assignedLine: 'Línea Mecanizado', certifications: ['ISO 9001', 'OSHAS', '5S'], status: 'ACTIVO' },
  { code: 'OP-003', name: 'Luis Herrera', position: 'Operario B', plant: 'Planta Sur', currentShift: 'Tarde', assignedLine: 'Línea Mezclado', certifications: ['OSHAS'], status: 'ACTIVO' },
  { code: 'OP-004', name: 'María Pérez', position: 'Operario C', plant: 'Planta Sur', currentShift: 'Noche', assignedLine: 'Línea Envasado', certifications: ['ISO 9001'], status: 'DESCANSO' },
  { code: 'OP-005', name: 'Jorge Castillo', position: 'Técnico Senior', plant: 'Planta Occidente', currentShift: 'Mañana', assignedLine: 'Línea Precisión 1', certifications: ['ISO 9001', 'OSHAS', '5S'], status: 'ACTIVO' },
  { code: 'OP-006', name: 'Sandra Ríos', position: 'Operario A', plant: 'Planta Occidente', currentShift: 'Mañana', assignedLine: 'Línea Precisión 2', certifications: ['5S'], status: 'ACTIVO' },
  { code: 'OP-007', name: 'Pablo Vargas', position: 'Operario B', plant: 'Planta Norte', currentShift: 'Tarde', assignedLine: 'Línea Ensamble B', certifications: ['ISO 9001', 'OSHAS'], status: 'DESCANSO' },
  { code: 'OP-008', name: 'Diana Morales', position: 'Operario C', plant: 'Planta Sur', currentShift: 'Mañana', assignedLine: 'Línea Etiquetado', certifications: ['OSHAS', '5S'], status: 'ACTIVO' },
];

const INITIAL_SHIFTS: Shift[] = [
  { id: 'SH-1', name: 'Turno Mañana', type: 'MAÑANA', startTime: '06:00', endTime: '14:00', duration: '8h', plant: 'Todas las plantas', active: true },
  { id: 'SH-2', name: 'Turno Tarde', type: 'TARDE', startTime: '14:00', endTime: '22:00', duration: '8h', plant: 'Todas las plantas', active: true },
  { id: 'SH-3', name: 'Turno Noche', type: 'NOCHE', startTime: '22:00', endTime: '06:00', duration: '8h', plant: 'Planta Norte, Planta Sur', active: false },
];

// ─── Helper functions ─────────────────────────────────────────────────────────
function getEquipmentStatusColor(status: Equipment['status']): string {
  switch (status) {
    case 'OPERATIVO': return '#16A34A';
    case 'MANTENIMIENTO': return '#D97706';
    case 'PARADO': return '#DC2626';
  }
}

function getEquipmentStatusBg(status: Equipment['status']): string {
  switch (status) {
    case 'OPERATIVO': return 'rgba(22,163,74,0.15)';
    case 'MANTENIMIENTO': return 'rgba(217,119,6,0.15)';
    case 'PARADO': return 'rgba(220,38,38,0.15)';
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
    case 'MAÑANA': return '#FBBF24';
    case 'TARDE': return '#F97316';
    case 'NOCHE': return '#818CF8';
  }
}

function getShiftTypeBg(type: Shift['type']): string {
  switch (type) {
    case 'MAÑANA': return 'rgba(251,191,36,0.15)';
    case 'TARDE': return 'rgba(249,115,22,0.15)';
    case 'NOCHE': return 'rgba(129,140,248,0.15)';
  }
}

function getOEEColor(oee: number): string {
  if (oee >= 85) return '#16A34A';
  if (oee >= 65) return '#D97706';
  return '#DC2626';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PlantCardProps {
  plant: Plant;
  expanded: boolean;
  onToggle: () => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, expanded, onToggle }) => {
  return (
    <Paper
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
                background: `rgba(8,145,178,0.15)`,
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
              <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                {plant.name}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={plant.manufacturingType}
            size="small"
            sx={{
              background: plant.manufacturingType === 'DISCRETA' ? 'rgba(8,145,178,0.15)' : 'rgba(139,92,246,0.15)',
              color: plant.manufacturingType === 'DISCRETA' ? MES_COLOR : '#A78BFA',
              border: `1px solid ${plant.manufacturingType === 'DISCRETA' ? MES_BORDER : 'rgba(139,92,246,0.25)'}`,
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: 0.5,
            }}
          />
        </Box>

        <Typography sx={{ color: '#64748B', fontSize: '0.8rem', mb: 2 }}>
          {plant.city}
        </Typography>

        {/* Stats Row */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 1, p: 1.5 }}>
            <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>
              {plant.lines}
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.7rem', mt: 0.5 }}>Líneas</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 1, p: 1.5 }}>
            <Typography sx={{ color: MES_COLOR, fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>
              {plant.equipment}
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.7rem', mt: 0.5 }}>Equipos</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 1, p: 1.5 }}>
            <Typography sx={{ color: getOEEColor(plant.avgOEE), fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>
              {plant.avgOEE}%
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.7rem', mt: 0.5 }}>OEE Prom.</Typography>
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
            '&:hover': { background: 'rgba(8,145,178,0.08)' },
            transition: 'background 0.2s',
          }}
        >
          {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
          {expanded ? 'Ocultar líneas' : 'Ver líneas'}
        </Box>
      </Box>

      {/* Expanded Lines Table */}
      <Collapse in={expanded}>
        <Divider sx={{ borderColor: MES_BORDER }} />
        <Box sx={{ p: 2, background: 'rgba(0,0,0,0.2)' }}>
          <Typography sx={{ color: '#94A3B8', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, mb: 1.5, textTransform: 'uppercase' }}>
            Líneas de Producción
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Código', 'Nombre', 'Cap./hr', 'OEE', 'Estado', 'Turno Activo'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{ color: '#475569', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.5, borderColor: MES_BORDER, textTransform: 'uppercase', py: 0.75, whiteSpace: 'nowrap' }}
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
                    sx={{ '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: 'rgba(8,145,178,0.1)' } }}
                  >
                    <TableCell sx={{ color: '#94A3B8', fontSize: '0.7rem', fontFamily: 'monospace', py: 1 }}>
                      {line.code}
                    </TableCell>
                    <TableCell sx={{ color: '#CBD5E1', fontSize: '0.75rem', py: 1 }}>{line.name}</TableCell>
                    <TableCell sx={{ color: '#CBD5E1', fontSize: '0.75rem', py: 1 }}>{line.capacityPerHr}</TableCell>
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
                          background: `${getLineStatusColor(line.status)}22`,
                          color: getLineStatusColor(line.status),
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          height: 20,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontSize: '0.7rem', py: 1 }}>{line.activeShift}</TableCell>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const MESPlanta: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const togglePlantExpand = (plantId: string) => {
    setExpandedPlants((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) {
        next.delete(plantId);
      } else {
        next.add(plantId);
      }
      return next;
    });
  };

  const handleShiftToggle = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, active: !s.active } : s))
    );
  };

  const tableHeaderSx = {
    color: '#475569',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: 0.5,
    borderColor: MES_BORDER,
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
    py: 1.5,
    background: 'rgba(0,0,0,0.3)',
  };

  const tableCellSx = {
    color: '#CBD5E1',
    fontSize: '0.8rem',
    borderColor: 'rgba(8,145,178,0.1)',
    py: 1.25,
  };

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, background: BG_MAIN, minHeight: '100vh' }}>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: `rgba(8,145,178,0.15)`,
                border: `1px solid ${MES_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PrecisionManufacturingIcon sx={{ color: MES_COLOR, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ color: '#F1F5F9', fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}
              >
                Gestión de Planta, Líneas y Equipos
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>
                MES — Manufacturing Execution System
              </Typography>
            </Box>
          </Box>

          {/* Summary KPIs */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {[
              { label: 'Plantas', value: '3', icon: <FactoryIcon sx={{ fontSize: 16, color: MES_COLOR }} /> },
              { label: 'Líneas Activas', value: '7', icon: <PrecisionManufacturingIcon sx={{ fontSize: 16, color: '#16A34A' }} /> },
              { label: 'Operarios', value: '8', icon: <PeopleIcon sx={{ fontSize: 16, color: '#FBBF24' }} /> },
              { label: 'Turnos Activos', value: '2', icon: <ScheduleIcon sx={{ fontSize: 16, color: '#818CF8' }} /> },
            ].map((kpi) => (
              <Paper
                key={kpi.label}
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
                <Typography sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{kpi.label}:</Typography>
                <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: '0.9rem' }}>{kpi.value}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Tabs */}
        <Paper
          sx={{
            background: BG_CARD,
            border: `1px solid ${MES_BORDER}`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ borderBottom: `1px solid ${MES_BORDER}`, px: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: MES_COLOR, height: 2 },
                '& .MuiTab-root': {
                  color: '#64748B',
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
                    />
                  </Grid>
                ))}
              </Grid>
            </TabPanel>

            {/* ── Tab 1: Equipos ──────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={1}>
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
                    {EQUIPMENT.map((eq) => (
                      <TableRow
                        key={eq.code}
                        sx={{ '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: 'rgba(8,145,178,0.1)' } }}
                      >
                        <TableCell sx={{ ...tableCellSx, color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {eq.code}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: '#E2E8F0' }}>{eq.name}</TableCell>
                        <TableCell sx={tableCellSx}>{eq.brand}</TableCell>
                        <TableCell sx={{ ...tableCellSx, fontFamily: 'monospace', fontSize: '0.75rem', color: '#94A3B8' }}>{eq.model}</TableCell>
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
                              background: getEquipmentStatusBg(eq.status),
                              color: getEquipmentStatusColor(eq.status),
                              border: `1px solid ${getEquipmentStatusColor(eq.status)}44`,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" sx={{ color: MES_COLOR, '&:hover': { background: 'rgba(8,145,178,0.1)' } }}>
                              <VisibilityIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { background: 'rgba(148,163,184,0.1)' } }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* ── Tab 2: Operarios ────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={2}>
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
                    {OPERATORS.map((op) => (
                      <TableRow
                        key={op.code}
                        sx={{ '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: 'rgba(8,145,178,0.1)' } }}
                      >
                        <TableCell sx={{ ...tableCellSx, color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {op.code}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap' }}>
                          {op.name}
                        </TableCell>
                        <TableCell sx={tableCellSx}>{op.position}</TableCell>
                        <TableCell sx={{ ...tableCellSx, whiteSpace: 'nowrap' }}>{op.plant}</TableCell>
                        <TableCell sx={tableCellSx}>
                          <Chip
                            label={op.currentShift}
                            size="small"
                            sx={{
                              background: op.currentShift === 'Mañana' ? 'rgba(251,191,36,0.15)' : op.currentShift === 'Tarde' ? 'rgba(249,115,22,0.15)' : 'rgba(129,140,248,0.15)',
                              color: op.currentShift === 'Mañana' ? '#FBBF24' : op.currentShift === 'Tarde' ? '#F97316' : '#818CF8',
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
                                  background: 'rgba(8,145,178,0.1)',
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
                              background: op.status === 'ACTIVO' ? 'rgba(22,163,74,0.15)' : 'rgba(217,119,6,0.15)',
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
                        sx={{ '&:hover': { background: 'rgba(8,145,178,0.05)' }, '& td': { borderColor: 'rgba(8,145,178,0.1)' } }}
                      >
                        <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap' }}>
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
                              background: 'rgba(8,145,178,0.1)',
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
                        <TableCell sx={tableCellSx}>
                          <Switch
                            checked={shift.active}
                            onChange={() => handleShiftToggle(shift.id)}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: MES_COLOR,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: MES_DARK,
                              },
                              '& .MuiSwitch-track': {
                                backgroundColor: '#374151',
                              },
                            }}
                          />
                          <Typography
                            component="span"
                            sx={{
                              color: shift.active ? '#16A34A' : '#6B7280',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              ml: 0.5,
                            }}
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
    </Layout>
  );
};

export default MESPlanta;
