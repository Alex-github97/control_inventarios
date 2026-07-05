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
  SelectChangeEvent,
} from '@mui/material';
import { Layout } from '@/components/layout/Layout';

// ─── Constants ────────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2';
const MES_DARK = '#0E7490';
const MES_BORDER = 'rgba(8,145,178,0.25)';
const BG_PAGE = '#F0F2F5';
const BG_CARD = '#FFFFFF';

// ─── Interfaces ───────────────────────────────────────────────────────────────
type EstadoOrden = 'PLANEADA' | 'LIBERADA' | 'EN EJECUCIÓN' | 'SUSPENDIDA' | 'CERRADA';
type Prioridad = 'URGENTE' | 'ALTA' | 'NORMAL';

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
}

interface KanbanColumna {
  estado: EstadoOrden;
  color: string;
  textColor: string;
}

interface FormNuevaOrden {
  numero: string;
  producto: string;
  linea: string;
  versionBOM: string;
  cantidad: string;
  prioridad: Prioridad;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  observaciones: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockOrdenes: OrdenProduccion[] = [
  {
    id: '1',
    numero: 'OP-2024-001',
    producto: 'Válvula de Control DN50',
    linea: 'Línea A',
    estado: 'PLANEADA',
    prioridad: 'URGENTE',
    cantidadPlanificada: 500,
    cantidadProducida: 0,
    fechaInicio: '2024-07-01',
    fechaFin: '2024-07-10',
    responsable: 'Carlos Méndez',
    scrap: 0,
  },
  {
    id: '2',
    numero: 'OP-2024-002',
    producto: 'Brida Ciega DN80',
    linea: 'Línea B',
    estado: 'PLANEADA',
    prioridad: 'ALTA',
    cantidadPlanificada: 250,
    cantidadProducida: 0,
    fechaInicio: '2024-07-05',
    fechaFin: '2024-07-12',
    responsable: 'Ana Torres',
    scrap: 0,
  },
  {
    id: '3',
    numero: 'OP-2024-003',
    producto: 'Codo 90° SCH40',
    linea: 'Línea C',
    estado: 'PLANEADA',
    prioridad: 'NORMAL',
    cantidadPlanificada: 1000,
    cantidadProducida: 0,
    fechaInicio: '2024-07-08',
    fechaFin: '2024-07-18',
    responsable: 'Luis Herrera',
    scrap: 0,
  },
  {
    id: '4',
    numero: 'OP-2024-004',
    producto: 'Reducción Excéntrica 4x3',
    linea: 'Línea A',
    estado: 'PLANEADA',
    prioridad: 'NORMAL',
    cantidadPlanificada: 300,
    cantidadProducida: 0,
    fechaInicio: '2024-07-10',
    fechaFin: '2024-07-20',
    responsable: 'María López',
    scrap: 0,
  },
  {
    id: '5',
    numero: 'OP-2024-005',
    producto: 'Válvula de Control DN50',
    linea: 'Línea B',
    estado: 'LIBERADA',
    prioridad: 'URGENTE',
    cantidadPlanificada: 400,
    cantidadProducida: 120,
    fechaInicio: '2024-06-25',
    fechaFin: '2024-07-05',
    responsable: 'Carlos Méndez',
    scrap: 5,
  },
  {
    id: '6',
    numero: 'OP-2024-006',
    producto: 'Tee Equal DN100',
    linea: 'Línea C',
    estado: 'LIBERADA',
    prioridad: 'ALTA',
    cantidadPlanificada: 600,
    cantidadProducida: 200,
    fechaInicio: '2024-06-28',
    fechaFin: '2024-07-08',
    responsable: 'Pedro Gómez',
    scrap: 8,
  },
  {
    id: '7',
    numero: 'OP-2024-007',
    producto: 'Brida Ciega DN80',
    linea: 'Línea A',
    estado: 'LIBERADA',
    prioridad: 'NORMAL',
    cantidadPlanificada: 150,
    cantidadProducida: 50,
    fechaInicio: '2024-06-30',
    fechaFin: '2024-07-07',
    responsable: 'Ana Torres',
    scrap: 2,
  },
  {
    id: '8',
    numero: 'OP-2024-008',
    producto: 'Codo 90° SCH40',
    linea: 'Línea B',
    estado: 'EN EJECUCIÓN',
    prioridad: 'URGENTE',
    cantidadPlanificada: 800,
    cantidadProducida: 600,
    fechaInicio: '2024-06-20',
    fechaFin: '2024-06-30',
    responsable: 'Luis Herrera',
    scrap: 15,
  },
  {
    id: '9',
    numero: 'OP-2024-009',
    producto: 'Reducción Excéntrica 4x3',
    linea: 'Línea C',
    estado: 'EN EJECUCIÓN',
    prioridad: 'ALTA',
    cantidadPlanificada: 200,
    cantidadProducida: 130,
    fechaInicio: '2024-06-22',
    fechaFin: '2024-07-02',
    responsable: 'María López',
    scrap: 6,
  },
  {
    id: '10',
    numero: 'OP-2024-010',
    producto: 'Tee Equal DN100',
    linea: 'Línea A',
    estado: 'EN EJECUCIÓN',
    prioridad: 'NORMAL',
    cantidadPlanificada: 350,
    cantidadProducida: 180,
    fechaInicio: '2024-06-24',
    fechaFin: '2024-07-04',
    responsable: 'Pedro Gómez',
    scrap: 10,
  },
  {
    id: '11',
    numero: 'OP-2024-011',
    producto: 'Válvula de Control DN50',
    linea: 'Línea B',
    estado: 'SUSPENDIDA',
    prioridad: 'ALTA',
    cantidadPlanificada: 700,
    cantidadProducida: 300,
    fechaInicio: '2024-06-15',
    fechaFin: '2024-06-25',
    responsable: 'Carlos Méndez',
    scrap: 20,
  },
  {
    id: '12',
    numero: 'OP-2024-012',
    producto: 'Brida Ciega DN80',
    linea: 'Línea C',
    estado: 'CERRADA',
    prioridad: 'URGENTE',
    cantidadPlanificada: 500,
    cantidadProducida: 498,
    fechaInicio: '2024-06-01',
    fechaFin: '2024-06-10',
    responsable: 'Ana Torres',
    scrap: 2,
  },
  {
    id: '13',
    numero: 'OP-2024-013',
    producto: 'Codo 90° SCH40',
    linea: 'Línea A',
    estado: 'CERRADA',
    prioridad: 'NORMAL',
    cantidadPlanificada: 1200,
    cantidadProducida: 1195,
    fechaInicio: '2024-06-05',
    fechaFin: '2024-06-15',
    responsable: 'Luis Herrera',
    scrap: 5,
  },
];

// ─── Kanban column config ─────────────────────────────────────────────────────
const kanbanColumnas: KanbanColumna[] = [
  { estado: 'PLANEADA',     color: '#6B7280', textColor: '#D1D5DB' },
  { estado: 'LIBERADA',     color: '#3B82F6', textColor: '#BFDBFE' },
  { estado: 'EN EJECUCIÓN', color: '#10B981', textColor: '#A7F3D0' },
  { estado: 'SUSPENDIDA',   color: '#F59E0B', textColor: '#FDE68A' },
  { estado: 'CERRADA',      color: MES_COLOR,  textColor: '#A5F3FC' },
];

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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  color?: string;
}

function ProgressBar({ value, color = MES_COLOR }: ProgressBarProps) {
  return (
    <Box
      sx={{
        width: '100%',
        height: 6,
        borderRadius: 3,
        bgcolor: '#F1F5F9',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: `${value}%`,
          height: '100%',
          borderRadius: 3,
          bgcolor: color,
          transition: 'width 0.4s ease',
        }}
      />
    </Box>
  );
}

interface KanbanCardProps {
  orden: OrdenProduccion;
}

function KanbanCard({ orden }: KanbanCardProps) {
  const avance = calcAvance(orden.cantidadPlanificada, orden.cantidadProducida);

  return (
    <Paper
      sx={{
        bgcolor: BG_CARD,
        border: `1px solid ${MES_BORDER}`,
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
        cursor: 'default',
        '&:hover': { borderColor: MES_COLOR, boxShadow: `0 0 8px rgba(8,145,178,0.25)` },
        transition: 'border-color 0.2s, box-shadow 0.2s',
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

      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B', mb: 1, lineHeight: 1.3 }}>
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

// ─── Tab 0: Kanban ────────────────────────────────────────────────────────────
function TabKanban() {
  return (
    <Box sx={{ overflowX: 'auto', pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          minWidth: 1100,
        }}
      >
        {kanbanColumnas.map((col) => {
          const ordenes = mockOrdenes.filter((o) => o.estado === col.estado);
          return (
            <Box
              key={col.estado}
              sx={{
                flex: '0 0 210px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Column header */}
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
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: col.color, letterSpacing: 1 }}>
                  {col.estado}
                </Typography>
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
                  {ordenes.length}
                </Box>
              </Box>

              {/* Cards */}
              <Box sx={{ flex: 1 }}>
                {ordenes.map((o) => (
                  <KanbanCard key={o.id} orden={o} />
                ))}
                {ordenes.length === 0 && (
                  <Typography sx={{ fontSize: 11, color: '#475569', textAlign: 'center', mt: 3 }}>
                    Sin órdenes
                  </Typography>
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
function TabTabla() {
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('TODOS');

  const filtered = mockOrdenes.filter((o) => {
    const matchSearch =
      searchText === '' ||
      o.numero.toLowerCase().includes(searchText.toLowerCase()) ||
      o.producto.toLowerCase().includes(searchText.toLowerCase());
    const matchEstado = filterEstado === 'TODOS' || o.estado === filterEstado;
    const matchPrioridad = filterPrioridad === 'TODOS' || o.prioridad === filterPrioridad;
    return matchSearch && matchEstado && matchPrioridad;
  });

  const inputSx = {};

  return (
    <Box>
      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          label="Buscar orden o producto"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ minWidth: 240, ...inputSx }}
        />

        <FormControl size="small" sx={{ minWidth: 180, ...inputSx }}>
          <InputLabel sx={{ color: '#94A3B8' }}>Estado</InputLabel>
          <Select
            value={filterEstado}
            label="Estado"
            onChange={(e: SelectChangeEvent) => setFilterEstado(e.target.value)}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="PLANEADA">PLANEADA</MenuItem>
            <MenuItem value="LIBERADA">LIBERADA</MenuItem>
            <MenuItem value="EN EJECUCIÓN">EN EJECUCIÓN</MenuItem>
            <MenuItem value="SUSPENDIDA">SUSPENDIDA</MenuItem>
            <MenuItem value="CERRADA">CERRADA</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160, ...inputSx }}>
          <InputLabel sx={{ color: '#94A3B8' }}>Prioridad</InputLabel>
          <Select
            value={filterPrioridad}
            label="Prioridad"
            onChange={(e: SelectChangeEvent) => setFilterPrioridad(e.target.value)}
          >
            <MenuItem value="TODOS">Todas</MenuItem>
            <MenuItem value="URGENTE">URGENTE</MenuItem>
            <MenuItem value="ALTA">ALTA</MenuItem>
            <MenuItem value="NORMAL">NORMAL</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          bgcolor: BG_CARD,
          border: `1px solid ${MES_BORDER}`,
          borderRadius: 2,
          overflowX: 'auto',
        }}
      >
        <Table size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(8,145,178,0.1)' }}>
              {['N° Orden', 'Producto', 'Línea', 'Estado', 'Prioridad', 'Cant. Plan', 'Cant. Real', '% Avance', 'Fecha Inicio', 'Fecha Fin', 'Scrap'].map(
                (h) => (
                  <TableCell
                    key={h}
                    sx={{ color: MES_COLOR, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${MES_BORDER}`, whiteSpace: 'nowrap' }}
                  >
                    {h}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((o, idx) => {
              const avance = calcAvance(o.cantidadPlanificada, o.cantidadProducida);
              const estadoColor = getEstadoColor(o.estado);
              return (
                <TableRow
                  key={o.id}
                  sx={{
                    bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    '&:hover': { bgcolor: 'rgba(8,145,178,0.06)' },
                  }}
                >
                  <TableCell sx={{ color: MES_COLOR, fontSize: 12, fontWeight: 700, borderBottom: `1px solid #E5E7EB` }}>
                    {o.numero}
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, borderBottom: `1px solid #E5E7EB`, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.producto}
                  </TableCell>
                  <TableCell sx={{ color: '#64748B', fontSize: 12, borderBottom: `1px solid #E5E7EB` }}>
                    {o.linea}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid #E5E7EB` }}>
                    <Chip
                      label={o.estado}
                      size="small"
                      sx={{
                        bgcolor: `${estadoColor}22`,
                        color: estadoColor,
                        border: `1px solid ${estadoColor}55`,
                        fontSize: 10,
                        fontWeight: 700,
                        height: 20,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid #E5E7EB` }}>
                    <Chip
                      label={o.prioridad}
                      color={getPrioridadColor(o.prioridad)}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 700, height: 20 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, textAlign: 'right', borderBottom: `1px solid #E5E7EB` }}>
                    {o.cantidadPlanificada.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ color: '#334155', fontSize: 12, textAlign: 'right', borderBottom: `1px solid #E5E7EB` }}>
                    {o.cantidadProducida.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid #E5E7EB`, minWidth: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${avance}%`,
                            height: '100%',
                            borderRadius: 3,
                            bgcolor: avance >= 100 ? '#10B981' : avance >= 50 ? MES_COLOR : '#F59E0B',
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: '#334155', minWidth: 30 }}>{avance}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#64748B', fontSize: 12, borderBottom: `1px solid #E5E7EB`, whiteSpace: 'nowrap' }}>
                    {o.fechaInicio}
                  </TableCell>
                  <TableCell sx={{ color: '#64748B', fontSize: 12, borderBottom: `1px solid #E5E7EB`, whiteSpace: 'nowrap' }}>
                    {o.fechaFin}
                  </TableCell>
                  <TableCell sx={{ color: o.scrap > 10 ? '#DC2626' : '#64748B', fontSize: 12, textAlign: 'right', borderBottom: `1px solid #E5E7EB` }}>
                    {o.scrap}
                  </TableCell>
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
        Mostrando {filtered.length} de {mockOrdenes.length} órdenes
      </Typography>
    </Box>
  );
}

// ─── Tab 2: Nueva Orden ───────────────────────────────────────────────────────
function TabNuevaOrden() {
  const initialForm: FormNuevaOrden = {
    numero: 'OP-2024-014',
    producto: '',
    linea: '',
    versionBOM: '',
    cantidad: '',
    prioridad: 'NORMAL',
    fechaInicio: '',
    fechaFin: '',
    responsable: '',
    observaciones: '',
  };

  const [form, setForm] = useState<FormNuevaOrden>(initialForm);
  const [snackOpen, setSnackOpen] = useState(false);

  const handleChange = (field: keyof FormNuevaOrden, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    setSnackOpen(true);
    setForm(initialForm);
  };

  const fieldSx = {};

  const menuProps = {
    PaperProps: {
      sx: {
        '& .MuiMenuItem-root:hover': { bgcolor: 'rgba(8,145,178,0.08)' },
      },
    },
  };

  return (
    <Box>
      <Paper
        sx={{
          bgcolor: BG_CARD,
          border: `1px solid ${MES_BORDER}`,
          borderRadius: 2,
          p: 3,
          maxWidth: 900,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: MES_COLOR, mb: 3 }}>
          Nueva Orden de Producción
        </Typography>

        <Grid container spacing={2.5}>
          {/* N° Orden (read-only) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="N° Orden"
              value={form.numero}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              sx={{
                ...fieldSx,
                '& .MuiInputBase-root': { bgcolor: 'rgba(8,145,178,0.08)', color: MES_COLOR },
              }}
            />
          </Grid>

          {/* Producto */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>Producto</InputLabel>
              <Select
                value={form.producto}
                label="Producto"
                onChange={(e: SelectChangeEvent) => handleChange('producto', e.target.value)}
                MenuProps={menuProps}
              >
                <MenuItem value="valvula-dn50">Válvula de Control DN50</MenuItem>
                <MenuItem value="brida-dn80">Brida Ciega DN80</MenuItem>
                <MenuItem value="codo-90">Codo 90° SCH40</MenuItem>
                <MenuItem value="reduccion-4x3">Reducción Excéntrica 4x3</MenuItem>
                <MenuItem value="tee-dn100">Tee Equal DN100</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Línea de Producción */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>Línea de Producción</InputLabel>
              <Select
                value={form.linea}
                label="Línea de Producción"
                onChange={(e: SelectChangeEvent) => handleChange('linea', e.target.value)}
                MenuProps={menuProps}
              >
                <MenuItem value="linea-a">Línea A</MenuItem>
                <MenuItem value="linea-b">Línea B</MenuItem>
                <MenuItem value="linea-c">Línea C</MenuItem>
                <MenuItem value="linea-d">Línea D</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Versión BOM */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>Versión BOM</InputLabel>
              <Select
                value={form.versionBOM}
                label="Versión BOM"
                onChange={(e: SelectChangeEvent) => handleChange('versionBOM', e.target.value)}
                MenuProps={menuProps}
              >
                <MenuItem value="v1.0">v1.0 - Base</MenuItem>
                <MenuItem value="v1.5">v1.5 - Revisión 1</MenuItem>
                <MenuItem value="v2.0">v2.0 - Actualización 2024</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Cantidad Planificada */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Cantidad Planificada"
              type="number"
              value={form.cantidad}
              onChange={(e) => handleChange('cantidad', e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 1 }}
              sx={fieldSx}
            />
          </Grid>

          {/* Responsable */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>Responsable</InputLabel>
              <Select
                value={form.responsable}
                label="Responsable"
                onChange={(e: SelectChangeEvent) => handleChange('responsable', e.target.value)}
                MenuProps={menuProps}
              >
                <MenuItem value="carlos-mendez">Carlos Méndez</MenuItem>
                <MenuItem value="ana-torres">Ana Torres</MenuItem>
                <MenuItem value="luis-herrera">Luis Herrera</MenuItem>
                <MenuItem value="maria-lopez">María López</MenuItem>
                <MenuItem value="pedro-gomez">Pedro Gómez</MenuItem>
                <MenuItem value="sofia-rios">Sofía Ríos</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Fecha Inicio */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Fecha Inicio Planificada"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => handleChange('fechaInicio', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
          </Grid>

          {/* Fecha Fin */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Fecha Fin Planificada"
              type="date"
              value={form.fechaFin}
              onChange={(e) => handleChange('fechaFin', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
          </Grid>

          {/* Prioridad — Radio group spanning 4 cols */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                border: `1px solid ${MES_BORDER}`,
                borderRadius: 1,
                px: 2,
                py: 1,
                bgcolor: BG_CARD,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <FormLabel sx={{ color: '#64748B', fontSize: 12, mb: 0.5 }}>Prioridad</FormLabel>
              <RadioGroup
                row
                value={form.prioridad}
                onChange={(e) => handleChange('prioridad', e.target.value)}
              >
                <FormControlLabel
                  value="URGENTE"
                  control={<Radio size="small" sx={{ color: '#EF4444', '&.Mui-checked': { color: '#EF4444' } }} />}
                  label={<Typography sx={{ fontSize: 12, color: '#DC2626' }}>Urgente</Typography>}
                />
                <FormControlLabel
                  value="ALTA"
                  control={<Radio size="small" sx={{ color: '#F59E0B', '&.Mui-checked': { color: '#F59E0B' } }} />}
                  label={<Typography sx={{ fontSize: 12, color: '#B45309' }}>Alta</Typography>}
                />
                <FormControlLabel
                  value="NORMAL"
                  control={<Radio size="small" sx={{ color: MES_COLOR, '&.Mui-checked': { color: MES_COLOR } }} />}
                  label={<Typography sx={{ fontSize: 12, color: MES_DARK }}>Normal</Typography>}
                />
              </RadioGroup>
            </Box>
          </Grid>

          {/* Observaciones */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Observaciones"
              multiline
              rows={4}
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              fullWidth
              size="small"
              placeholder="Ingrese observaciones o notas adicionales para esta orden..."
              sx={fieldSx}
            />
          </Grid>

          {/* Submit */}
          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              sx={{
                bgcolor: MES_COLOR,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                py: 1.4,
                letterSpacing: 0.5,
                '&:hover': { bgcolor: MES_DARK },
                borderRadius: 1.5,
              }}
            >
              Crear Orden de Producción
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity="success"
          sx={{
            bgcolor: '#064E3B',
            color: '#A7F3D0',
            border: '1px solid #10B981',
            '& .MuiAlert-icon': { color: '#10B981' },
          }}
        >
          Orden de producción <strong>OP-2024-014</strong> creada exitosamente.
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MESOrdenes() {
  const [tab, setTab] = useState(0);

  return (
    <Layout>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: BG_PAGE,
          p: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 4,
                height: 28,
                bgcolor: MES_COLOR,
                borderRadius: 2,
              }}
            />
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: 0.5 }}
            >
              Órdenes de Producción
            </Typography>
            <Chip
              label="MES"
              size="small"
              sx={{
                bgcolor: `${MES_COLOR}22`,
                color: MES_COLOR,
                border: `1px solid ${MES_BORDER}`,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: 1,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: '#64748B', ml: 3 }}>
            Gestión y seguimiento de órdenes de manufactura
          </Typography>
        </Box>

        {/* KPI Strip */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Órdenes', value: '13', color: MES_COLOR },
            { label: 'En Ejecución', value: '3', color: '#10B981' },
            { label: 'Liberadas', value: '3', color: '#3B82F6' },
            { label: 'Suspendidas', value: '1', color: '#F59E0B' },
          ].map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
              <Paper
                sx={{
                  bgcolor: BG_CARD,
                  border: `1px solid ${MES_BORDER}`,
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography sx={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {kpi.label}
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
                  {kpi.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box
          sx={{
            bgcolor: BG_CARD,
            border: `1px solid ${MES_BORDER}`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${MES_BORDER}`,
              '& .MuiTab-root': {
                color: '#64748B',
                fontWeight: 600,
                fontSize: 13,
                textTransform: 'none',
                minHeight: 48,
              },
              '& .Mui-selected': { color: MES_COLOR },
              '& .MuiTabs-indicator': { bgcolor: MES_COLOR },
            }}
          >
            <Tab label="Kanban" />
            <Tab label="Tabla" />
            <Tab label="Nueva Orden" />
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            {tab === 0 && <TabKanban />}
            {tab === 1 && <TabTabla />}
            {tab === 2 && <TabNuevaOrden />}
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}
