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
  LinearProgress,
  Avatar,
  Alert,
} from '@mui/material';
import {
  WarningAmber,
  TireRepair,
  LocalShipping,
  Inventory2,
  Recycling,
  AttachMoney,
  Speed,
  RotateRight,
} from '@mui/icons-material';

const EAM_COLOR = '#32AC5C';

// ─── Types ───────────────────────────────────────────────────────────────────

type EstadoNeumatico = 'Bueno' | 'Desgaste Medio' | 'Crítico' | 'En Reencauche' | 'En Almacén';

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
  { codigo: 'NEU-001', marca: 'Michelin', referencia: 'X Multi D', medida: '295/80 R22.5', estado: 'Bueno', activo: 'TRK-001', posicion: 'DA1', kmTotal: 45000, vidaUtilKm: 120000, profundidadActual: 12 },
  { codigo: 'NEU-002', marca: 'Bridgestone', referencia: 'R249 EVO', medida: '295/80 R22.5', estado: 'Desgaste Medio', activo: 'TRK-001', posicion: 'DA2', kmTotal: 78000, vidaUtilKm: 100000, profundidadActual: 6 },
  { codigo: 'NEU-003', marca: 'Continental', referencia: 'HSC1', medida: '315/80 R22.5', estado: 'Crítico', activo: 'TRK-002', posicion: 'DA1', kmTotal: 98000, vidaUtilKm: 100000, profundidadActual: 2 },
  { codigo: 'NEU-004', marca: 'Goodyear', referencia: 'Fuelmax D', medida: '295/80 R22.5', estado: 'Bueno', activo: 'TRK-002', posicion: 'DA2', kmTotal: 32000, vidaUtilKm: 110000, profundidadActual: 14 },
  { codigo: 'NEU-005', marca: 'Michelin', referencia: 'X Multi T', medida: '295/80 R22.5', estado: 'En Reencauche', activo: 'TRK-003', posicion: '-', kmTotal: 91000, vidaUtilKm: 120000, profundidadActual: 3 },
  { codigo: 'NEU-006', marca: 'Bridgestone', referencia: 'M729', medida: '11 R22.5', estado: 'Bueno', activo: 'TRK-004', posicion: 'TA1', kmTotal: 21000, vidaUtilKm: 100000, profundidadActual: 16 },
  { codigo: 'NEU-007', marca: 'Continental', referencia: 'HDR2', medida: '315/80 R22.5', estado: 'Desgaste Medio', activo: 'TRK-004', posicion: 'TA2', kmTotal: 64000, vidaUtilKm: 105000, profundidadActual: 7 },
  { codigo: 'NEU-008', marca: 'Goodyear', referencia: 'Omnitrac S', medida: '11 R22.5', estado: 'En Almacén', activo: '-', posicion: '-', kmTotal: 0, vidaUtilKm: 110000, profundidadActual: 18 },
  { codigo: 'NEU-009', marca: 'Michelin', referencia: 'X Works Z', medida: '315/80 R22.5', estado: 'Crítico', activo: 'TRK-005', posicion: 'DB1', kmTotal: 109000, vidaUtilKm: 120000, profundidadActual: 1 },
  { codigo: 'NEU-010', marca: 'Bridgestone', referencia: 'V-Steel Rib', medida: '295/80 R22.5', estado: 'Bueno', activo: 'TRK-005', posicion: 'DB2', kmTotal: 38000, vidaUtilKm: 100000, profundidadActual: 13 },
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

// ─── Tab 0: Inventario ────────────────────────────────────────────────────────

function TabInventario() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPIs */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="Total Neumáticos" value={248} icon={<TireRepair />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="Instalados" value={192} icon={<LocalShipping />} color="#3B82F6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="En Almacén" value={44} icon={<Inventory2 />} color="#22C55E" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard label="En Reencauche" value={12} icon={<Recycling />} color="#A855F7" />
        </Grid>
      </Grid>

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
            {mockNeumaticos.map((n) => {
              const vida = calcVidaUsada(n);
              const alerta = hasAlerta(n);
              return (
                <TableRow
                  key={n.codigo}
                  sx={{
                    '& td': { borderBottom: '1px solid #E5E7EB', color: 'text.primary', fontSize: 12 },
                    '&:hover': { bgcolor: 'text.disabled' },
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
                          bgcolor: 'text.disabled',
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
                      <WarningAmber sx={{ color: '#F97316', fontSize: 18 }} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Tire position box ────────────────────────────────────────────────────────

function TireBox({ pos }: { pos: NeumaticoPosicion }) {
  const color = getDesgasteColor(pos.desgaste);
  return (
    <Box
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
          bgcolor: 'text.disabled',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
}

// ─── Truck diagrams ───────────────────────────────────────────────────────────

function DiagramaTractocamion({ posiciones }: { posiciones: NeumaticoPosicion[] }) {
  const byPos = Object.fromEntries(posiciones.map(p => [p.posicion, p]));

  const AxleRow = ({ label, left, right }: { label: string; left: string[]; right: string[] }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
      <Typography sx={{ fontSize: 10, color: 'text.secondary', width: 40, textAlign: 'right' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {left.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} /> : <Box key={k} sx={{ width: 80 }} />)}
      </Box>
      <Box sx={{ width: 120, height: 28, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {right.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} /> : <Box key={k} sx={{ width: 80 }} />)}
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

function DiagramaCamion({ posiciones }: { posiciones: NeumaticoPosicion[] }) {
  const byPos = Object.fromEntries(posiciones.map(p => [p.posicion, p]));

  const AxleRow = ({ label, left, right }: { label: string; left: string[]; right: string[] }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
      <Typography sx={{ fontSize: 10, color: 'text.secondary', width: 40, textAlign: 'right' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {left.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} /> : <Box key={k} sx={{ width: 80 }} />)}
      </Box>
      <Box sx={{ width: 140, height: 32, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {right.map(k => byPos[k] ? <TireBox key={k} pos={byPos[k]} /> : <Box key={k} sx={{ width: 80 }} />)}
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

// ─── Tab 1: Montados ──────────────────────────────────────────────────────────

function TabMontados() {
  const [selectedId, setSelectedId] = useState<string>('v1');
  const selected = mockVehiculos.find(v => v.id === selectedId)!;
  const posiciones = selected.tipo === 'tractocamion' ? mockPosicionesTractocamion : mockPosicionesCamion;

  return (
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
                  bgcolor: v.tipo === 'tractocamion' ? '#1D4ED844' : '#15803D44',
                  color: v.tipo === 'tractocamion' ? '#60A5FA' : '#4ADE80',
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
              ? <DiagramaTractocamion posiciones={posiciones} />
              : <DiagramaCamion posiciones={posiciones} />
            }
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}

// ─── Tab 2: Análisis de Costo ─────────────────────────────────────────────────

function TabAnalisisCosto() {
  const maxCosto = Math.max(...mockCostoBrands.map(b => b.costoPorKm));

  return (
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
                Ranking Costo / km por Marca
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
                  {[...mockCostoBrands].sort((a, b) => a.costoPorKm - b.costoPorKm).map((b, i) => {
                    const pct = (b.costoPorKm / maxCosto) * 100;
                    const color = i === 0 ? '#22C55E' : i === 1 ? '#EAB308' : i === 2 ? '#F97316' : '#EF4444';
                    return (
                      <TableRow key={b.marca} sx={{ '& td': { borderBottom: '1px solid #E5E7EB', color: 'text.primary', fontSize: 12 }, '&:hover': { bgcolor: 'text.disabled' } }}>
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
                                bgcolor: 'text.disabled',
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
                    sx={{
                      py: 0.5,
                      fontSize: 11,
                      bgcolor: urgency === 'error' ? 'rgba(239,68,68,0.1)' : urgency === 'warning' ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)',
                      border: '1px solid',
                      borderColor: urgency === 'error' ? '#EF444444' : urgency === 'warning' ? '#F9731644' : '#3B82F644',
                      color: 'text.primary',
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
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EAMNeumaticos() {
  const [tab, setTab] = useState(0);

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
          {tab === 0 && <TabInventario />}
          {tab === 1 && <TabMontados />}
          {tab === 2 && <TabAnalisisCosto />}
        </Box>
      </Box>
    </Layout>
  );
}
