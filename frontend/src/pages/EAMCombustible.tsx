import { useState } from 'react';
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
  Alert,
  AlertTitle,
  Button,
  Divider,
} from '@mui/material';
import {
  LocalGasStation,
  Speed,
  DirectionsCar,
  Warning,
  TrendingDown,
  SmartToy,
} from '@mui/icons-material';
import { Layout } from '@/components/layout/Layout';

// ─── Constants ────────────────────────────────────────────────────────────────
const EAM_COLOR = '#32AC5C';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegistroRow {
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
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const REGISTROS: RegistroRow[] = [
  { fecha: '2026-06-01', vehiculo: 'VH-001', tipoCombustible: 'ACPM',     litros: 180, precioPorLitro: 5450, costo: 981000,  odometro: 142300, rendimiento: 8.2, conductor: 'Carlos Andrés Martínez',  proveedor: 'Terpel' },
  { fecha: '2026-06-02', vehiculo: 'VH-003', tipoCombustible: 'ACPM',     litros: 210, precioPorLitro: 5450, costo: 1144500, odometro: 98750,  rendimiento: 5.9, conductor: 'Luis Eduardo Gómez',      proveedor: 'Biomax' },
  { fecha: '2026-06-02', vehiculo: 'VH-007', tipoCombustible: 'ACPM',     litros: 95,  precioPorLitro: 5450, costo: 517750,  odometro: 210400, rendimiento: 7.8, conductor: 'Jhon Alexander Torres',   proveedor: 'Terpel' },
  { fecha: '2026-06-03', vehiculo: 'VH-010', tipoCombustible: 'Gasolina', litros: 45,  precioPorLitro: 9800, costo: 441000,  odometro: 55200,  rendimiento: 10.4,conductor: 'Andrés Felipe Vargas',    proveedor: 'Primax' },
  { fecha: '2026-06-04', vehiculo: 'VH-012', tipoCombustible: 'ACPM',     litros: 240, precioPorLitro: 5450, costo: 1308000, odometro: 185600, rendimiento: 4.8, conductor: 'Ricardo Emilio Peña',     proveedor: 'Terpel' },
  { fecha: '2026-06-05', vehiculo: 'VH-005', tipoCombustible: 'ACPM',     litros: 160, precioPorLitro: 5450, costo: 872000,  odometro: 302100, rendimiento: 7.5, conductor: 'Mario Alberto Cano',      proveedor: 'Biomax' },
  { fecha: '2026-06-06', vehiculo: 'VH-015', tipoCombustible: 'ACPM',     litros: 195, precioPorLitro: 5450, costo: 1062750, odometro: 128900, rendimiento: 6.1, conductor: 'Diego Fernando Ruiz',     proveedor: 'Primax' },
  { fecha: '2026-06-08', vehiculo: 'VH-002', tipoCombustible: 'ACPM',     litros: 175, precioPorLitro: 5450, costo: 953750,  odometro: 240500, rendimiento: 8.0, conductor: 'Fabián Humberto Mora',    proveedor: 'Terpel' },
  { fecha: '2026-06-09', vehiculo: 'VH-018', tipoCombustible: 'Gasolina', litros: 52,  precioPorLitro: 9800, costo: 509600,  odometro: 67800,  rendimiento: 9.8, conductor: 'Sergio Iván Castillo',    proveedor: 'Terpel' },
  { fecha: '2026-06-10', vehiculo: 'VH-006', tipoCombustible: 'ACPM',     litros: 188, precioPorLitro: 5450, costo: 1024600, odometro: 176300, rendimiento: 7.2, conductor: 'Nelson Darío Ospina',     proveedor: 'Biomax' },
  { fecha: '2026-06-11', vehiculo: 'VH-007', tipoCombustible: 'ACPM',     litros: 110, precioPorLitro: 5450, costo: 599500,  odometro: 211260, rendimiento: 7.6, conductor: 'Jhon Alexander Torres',   proveedor: 'Terpel' },
  { fecha: '2026-06-13', vehiculo: 'VH-020', tipoCombustible: 'ACPM',     litros: 200, precioPorLitro: 5450, costo: 1090000, odometro: 93400,  rendimiento: 7.4, conductor: 'Germán Adolfo Salcedo',   proveedor: 'Primax' },
  { fecha: '2026-06-14', vehiculo: 'VH-004', tipoCombustible: 'ACPM',     litros: 165, precioPorLitro: 5450, costo: 899250,  odometro: 158700, rendimiento: 8.1, conductor: 'Camilo Ernesto Bermúdez', proveedor: 'Terpel' },
  { fecha: '2026-06-16', vehiculo: 'VH-009', tipoCombustible: 'Gasolina', litros: 38,  precioPorLitro: 9800, costo: 372400,  odometro: 41200,  rendimiento: 11.2,conductor: 'Hernando José Bernal',    proveedor: 'Biomax' },
  { fecha: '2026-06-18', vehiculo: 'VH-001', tipoCombustible: 'ACPM',     litros: 197, precioPorLitro: 5450, costo: 1073650, odometro: 143920, rendimiento: 7.9, conductor: 'Carlos Andrés Martínez',  proveedor: 'Terpel' },
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
  { id: 'D-001', vehiculo: 'VH-003', descripcion: 'Consumo 35% sobre meta histórica',                    costoDesviacion: 1240000, severidad: 'Alta'  },
  { id: 'D-002', vehiculo: 'VH-012', descripcion: 'Rendimiento mínimo registrado en 6 meses',            costoDesviacion: 890000,  severidad: 'Alta'  },
  { id: 'D-003', vehiculo: 'VH-007', descripcion: 'Patrón de llenados sospechoso (3 llenados/día)',       costoDesviacion: 2100000, severidad: 'Alta'  },
  { id: 'D-004', vehiculo: 'VH-015', descripcion: 'Rendimiento cayó 18% vs mes anterior',                costoDesviacion: 560000,  severidad: 'Media' },
  { id: 'D-005', vehiculo: 'VH-001', descripcion: 'Consumo nocturno detectado fuera de ruta',            costoDesviacion: 1780000, severidad: 'Alta'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOP(value: number): string {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function KpiCard({ icon, label, value, sub }: KpiCardProps) {
  return (
    <Card sx={{ border: `1px solid ${EAM_COLOR}33`, borderRadius: 2, height: '100%' }}>
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

// ─── Tab Panels ───────────────────────────────────────────────────────────────
function TabRegistros() {
  const cellSx = { color: '#334155', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', py: 0.8 };
  const headSx = { color: '#64748B', borderBottom: `1px solid ${EAM_COLOR}55`, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: 0.8 };

  return (
    <Box>
      {/* KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<LocalGasStation fontSize="small" />}
            label="Total Litros Mes"
            value="18,450 L"
            sub="Junio 2026"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<Speed fontSize="small" />}
            label="Costo Total Mes"
            value="$98.4M"
            sub="ACPM + Gasolina"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<DirectionsCar fontSize="small" />}
            label="Rendimiento Promedio"
            value="7.2 km/L"
            sub="Flota completa"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard
            icon={<Warning fontSize="small" />}
            label="Vehículos sin Registro"
            value="3"
            sub="Últimos 7 días"
          />
        </Grid>
      </Grid>

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
            {REGISTROS.map((r, i) => (
              <TableRow
                key={i}
                sx={{ '&:hover': { bgcolor: '#F3F4F6' } }}
              >
                <TableCell sx={cellSx}>{r.fecha}</TableCell>
                <TableCell sx={{ ...cellSx, color: EAM_COLOR, fontWeight: 600 }}>{r.vehiculo}</TableCell>
                <TableCell sx={cellSx}>
                  <Chip
                    label={r.tipoCombustible}
                    size="small"
                    sx={{
                      bgcolor: r.tipoCombustible === 'ACPM' ? '#1E3A5F' : '#1A2E1A',
                      color: r.tipoCombustible === 'ACPM' ? '#60A5FA' : '#4ADE80',
                      fontSize: '0.65rem',
                      height: 20,
                    }}
                  />
                </TableCell>
                <TableCell sx={cellSx}>{r.litros.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={cellSx}>${r.precioPorLitro.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={cellSx}>{formatCOPFull(r.costo)}</TableCell>
                <TableCell sx={cellSx}>{r.odometro.toLocaleString('es-CO')} km</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 600, color: r.rendimiento >= 7.5 ? '#4ADE80' : r.rendimiento >= 6.5 ? '#FACC15' : '#F87171' }}>
                  {r.rendimiento.toFixed(1)}
                </TableCell>
                <TableCell sx={cellSx}>{r.conductor}</TableCell>
                <TableCell sx={cellSx}>{r.proveedor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function TabRendimiento() {
  const cellSx = { color: '#334155', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', py: 0.9 };
  const headSx = { color: '#64748B', borderBottom: `1px solid ${EAM_COLOR}55`, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: 0.8 };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ color: '#64748B', mb: 2 }}>
        Resumen de rendimiento por vehículo — Junio 2026
      </Typography>
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
            {RENDIMIENTO_ROWS.map((r, i) => (
              <TableRow key={i} sx={{ '&:hover': { bgcolor: '#F3F4F6' } }}>
                <TableCell sx={{ ...cellSx, color: EAM_COLOR, fontWeight: 700 }}>{r.placa}</TableCell>
                <TableCell sx={cellSx}>{r.nombre}</TableCell>
                <TableCell sx={cellSx}>{r.kmMes.toLocaleString('es-CO')} km</TableCell>
                <TableCell sx={cellSx}>{r.litros.toLocaleString('es-CO')} L</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{r.rendimiento.toFixed(1)}</TableCell>
                <TableCell sx={cellSx}>{r.meta.toFixed(1)}</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 700, color: r.vsMetaPct >= 100 ? '#4ADE80' : r.vsMetaPct >= 90 ? '#FACC15' : '#F87171' }}>
                  {r.vsMetaPct}%
                </TableCell>
                <TableCell sx={cellSx}>
                  <Chip
                    label={r.estado}
                    size="small"
                    color={estadoColor(r.estado)}
                    sx={{ fontWeight: 600, fontSize: '0.68rem' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function TabDesviaciones() {
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
            Detección por IA
          </Typography>
        </Box>
        <Chip
          label={`${DESVIACIONES.length} alertas activas`}
          size="small"
          color="error"
          sx={{ ml: 'auto', fontWeight: 700 }}
        />
      </Box>

      <Divider sx={{ borderColor: '#E5E7EB', mb: 3 }} />

      <Grid container spacing={2}>
        {DESVIACIONES.map((d) => (
          <Grid key={d.id} size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                bgcolor: '#FFFFFF',
                border: `1px solid ${d.severidad === 'Alta' ? '#F8717166' : '#FACC1566'}`,
                borderLeft: `4px solid ${d.severidad === 'Alta' ? '#F87171' : '#FACC15'}`,
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown sx={{ color: d.severidad === 'Alta' ? '#F87171' : '#FACC15', fontSize: 20 }} />
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

                {/* Alert body */}
                <Alert
                  severity={d.severidad === 'Alta' ? 'error' : 'warning'}
                  icon={<Warning fontSize="small" />}
                  sx={{
                    bgcolor: d.severidad === 'Alta' ? '#F8717115' : '#FACC1515',
                    color: '#334155',
                    border: 'none',
                    py: 0.5,
                    mb: 1.5,
                    '& .MuiAlert-icon': { color: d.severidad === 'Alta' ? '#F87171' : '#FACC15' },
                  }}
                >
                  <AlertTitle sx={{ color: '#1E293B', fontWeight: 600, fontSize: '0.82rem', mb: 0.2 }}>
                    Anomalía detectada
                  </AlertTitle>
                  <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {d.descripcion}
                  </Typography>
                </Alert>

                {/* Deviation cost + action */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', letterSpacing: 0.4 }}>
                      Costo desviación estimado
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#FACC15', fontWeight: 700 }}>
                      {formatCOPFull(d.costoDesviacion)}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      color: EAM_COLOR,
                      borderColor: `${EAM_COLOR}66`,
                      fontSize: '0.7rem',
                      py: 0.4,
                      px: 1.5,
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
    </Box>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function EAMCombustible() {
  const [activeTab, setActiveTab] = useState(0);

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
          <Box>
            <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.1 }}>
              Gestión de Combustible
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>
              EAM — ICOLTRANS · Módulo de Consumo
            </Typography>
          </Box>
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
            <Tab label="Desviaciones" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && <TabRegistros />}
            {activeTab === 1 && <TabRendimiento />}
            {activeTab === 2 && <TabDesviaciones />}
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}
