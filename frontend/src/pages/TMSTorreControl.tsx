import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid2 as Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import GpsOffIcon from '@mui/icons-material/GpsOff';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { Layout } from '@/components/layout/Layout';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface VehiculoEnRuta {
  placa: string;
  conductor: string;
  origen: string;
  destino: string;
  velocidad: number;
  porcentaje: number;
  estado: 'NORMAL' | 'DEMORADO' | 'CRITICO';
}

interface AlertaActiva {
  id: number;
  tipo: 'DEMORA' | 'SIN_GPS' | 'INCIDENTE' | 'DOCUMENTO';
  mensaje: string;
  viaje: string;
  hora: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
}

interface ViajesCriticos {
  codigo: string;
  conductor: string;
  ruta: string;
  tipoAlerta: 'DEMORADO' | 'SIN_GPS' | 'INCIDENTE';
  minutosRetraso: number;
  estado: string;
}

interface ProximaEntrega {
  hora: string;
  cliente: string;
  ciudad: string;
  viaje: string;
  estado: 'ON_TIME' | 'EN_RIESGO' | 'DEMORADO';
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const vehiculosEnRuta: VehiculoEnRuta[] = [
  {
    placa: 'TRK-8821',
    conductor: 'Carlos Medina',
    origen: 'Bogotá',
    destino: 'Medellín',
    velocidad: 78,
    porcentaje: 62,
    estado: 'NORMAL',
  },
  {
    placa: 'TRK-4453',
    conductor: 'Jesús Vargas',
    origen: 'Cali',
    destino: 'Bogotá',
    velocidad: 0,
    porcentaje: 38,
    estado: 'DEMORADO',
  },
  {
    placa: 'TRK-9910',
    conductor: 'Pedro Romero',
    origen: 'Barranquilla',
    destino: 'Cartagena',
    velocidad: 65,
    porcentaje: 81,
    estado: 'NORMAL',
  },
  {
    placa: 'TRK-3312',
    conductor: 'Luis Herrera',
    origen: 'Bucaramanga',
    destino: 'Bogotá',
    velocidad: 0,
    porcentaje: 20,
    estado: 'CRITICO',
  },
  {
    placa: 'TRK-7742',
    conductor: 'Andrés Torres',
    origen: 'Medellín',
    destino: 'Cali',
    velocidad: 82,
    porcentaje: 55,
    estado: 'NORMAL',
  },
  {
    placa: 'TRK-6601',
    conductor: 'Fabio Suárez',
    origen: 'Cartagena',
    destino: 'Barranquilla',
    velocidad: 70,
    porcentaje: 90,
    estado: 'NORMAL',
  },
];

const alertasActivas: AlertaActiva[] = [
  {
    id: 1,
    tipo: 'DEMORA',
    mensaje: 'TRK-4453 detenido >45 min en vía Cali-Bogotá',
    viaje: 'VJ-20240619-047',
    hora: '08:12',
    prioridad: 'ALTA',
  },
  {
    id: 2,
    tipo: 'SIN_GPS',
    mensaje: 'Sin señal GPS — TRK-3312 hace 32 minutos',
    viaje: 'VJ-20240619-031',
    hora: '08:29',
    prioridad: 'ALTA',
  },
  {
    id: 3,
    tipo: 'INCIDENTE',
    mensaje: 'Accidente reportado en Autopista Bogotá-Medellín km 89',
    viaje: 'VJ-20240619-058',
    hora: '08:44',
    prioridad: 'ALTA',
  },
  {
    id: 4,
    tipo: 'DOCUMENTO',
    mensaje: 'Manifiesto de carga vencido — TRK-7742',
    viaje: 'VJ-20240619-042',
    hora: '09:01',
    prioridad: 'MEDIA',
  },
  {
    id: 5,
    tipo: 'DEMORA',
    mensaje: 'TRK-9910 llegará 25 min tarde a Cartagena',
    viaje: 'VJ-20240619-039',
    hora: '09:15',
    prioridad: 'BAJA',
  },
];

const viajesCriticos: ViajesCriticos[] = [
  {
    codigo: 'VJ-20240619-031',
    conductor: 'Luis Herrera',
    ruta: 'Bucaramanga → Bogotá',
    tipoAlerta: 'SIN_GPS',
    minutosRetraso: 90,
    estado: 'Sin señal',
  },
  {
    codigo: 'VJ-20240619-047',
    conductor: 'Jesús Vargas',
    ruta: 'Cali → Bogotá',
    tipoAlerta: 'DEMORADO',
    minutosRetraso: 65,
    estado: 'Detenido',
  },
  {
    codigo: 'VJ-20240619-058',
    conductor: 'Carlos Medina',
    ruta: 'Bogotá → Medellín',
    tipoAlerta: 'INCIDENTE',
    minutosRetraso: 45,
    estado: 'En incidente',
  },
  {
    codigo: 'VJ-20240619-042',
    conductor: 'Andrés Torres',
    ruta: 'Medellín → Cali',
    tipoAlerta: 'DEMORADO',
    minutosRetraso: 30,
    estado: 'En tránsito',
  },
];

const proximasEntregas: ProximaEntrega[] = [
  {
    hora: '10:30',
    cliente: 'Almacenes Éxito S.A.',
    ciudad: 'Cartagena',
    viaje: 'VJ-20240619-039',
    estado: 'ON_TIME',
  },
  {
    hora: '11:00',
    cliente: 'Grupo Nutresa',
    ciudad: 'Medellín',
    viaje: 'VJ-20240619-044',
    estado: 'EN_RIESGO',
  },
  {
    hora: '11:45',
    cliente: 'Colombina S.A.',
    ciudad: 'Cali',
    viaje: 'VJ-20240619-047',
    estado: 'DEMORADO',
  },
  {
    hora: '12:15',
    cliente: 'Bavaria S.A.',
    ciudad: 'Bogotá',
    viaje: 'VJ-20240619-051',
    estado: 'ON_TIME',
  },
  {
    hora: '13:00',
    cliente: 'Postobón S.A.',
    ciudad: 'Barranquilla',
    viaje: 'VJ-20240619-055',
    estado: 'ON_TIME',
  },
];

const sparklineData = [18, 28, 22, 35, 30, 40, 34];
const sparklineCost = [32, 28, 35, 30, 38, 33, 36];

const TMS_COLOR = '#0369A1';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getEstadoColor(estado: VehiculoEnRuta['estado']): string {
  if (estado === 'NORMAL') return '#22C55E';
  if (estado === 'DEMORADO') return '#F59E0B';
  return '#EF4444';
}

function getPrioridadColor(p: AlertaActiva['prioridad']) {
  if (p === 'ALTA') return 'error';
  if (p === 'MEDIA') return 'warning';
  return 'default';
}

function getEntregaColor(e: ProximaEntrega['estado']) {
  if (e === 'ON_TIME') return 'success';
  if (e === 'EN_RIESGO') return 'warning';
  return 'error';
}

function getAlertaChipColor(tipo: AlertaActiva['tipo']) {
  if (tipo === 'DEMORA') return '#F59E0B';
  if (tipo === 'SIN_GPS') return '#EF4444';
  if (tipo === 'INCIDENTE') return '#EF4444';
  return '#6B7280';
}

function AlertaIcon({ tipo }: { tipo: AlertaActiva['tipo'] }) {
  const style = { fontSize: 16, color: getAlertaChipColor(tipo) };
  if (tipo === 'DEMORA') return <WarningAmberIcon sx={style} />;
  if (tipo === 'SIN_GPS') return <GpsOffIcon sx={style} />;
  if (tipo === 'INCIDENTE') return <ErrorOutlineIcon sx={style} />;
  return <DescriptionOutlinedIcon sx={style} />;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 40, mt: 1 }}>
      {data.map((v, i) => (
        <Box
          key={i}
          sx={{
            width: 10,
            height: `${v}px`,
            bgcolor: color,
            borderRadius: '2px 2px 0 0',
            opacity: i === data.length - 1 ? 1 : 0.55,
          }}
        />
      ))}
    </Box>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TMSTorreControl() {
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setTimestamp(`${hh}:${mm}:${ss}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#0F172A', minHeight: '100vh' }}>
        {/* ── Page Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <LocalShippingIcon sx={{ color: TMS_COLOR, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" sx={{ color: '#F1F5F9', fontWeight: 700, letterSpacing: 0.5 }}>
              Torre de Control TMS
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              Monitoreo ejecutivo en tiempo real — ICOLTRANS
            </Typography>
          </Box>
        </Box>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — OPERATIONAL MAP
        ══════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            bgcolor: '#0a1628',
            borderRadius: 2,
            border: '1px solid #1E3A5F',
            mb: 3,
            overflow: 'hidden',
          }}
        >
          {/* Map Header Bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              py: 1.2,
              borderBottom: '1px solid #1E3A5F',
              bgcolor: '#071020',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#22C55E',
                  boxShadow: '0 0 6px #22C55E',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%,100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }}
              />
              <Typography
                sx={{
                  color: '#CBD5E1',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                Mapa Operacional
              </Typography>
              <Typography sx={{ color: '#475569', fontSize: 11 }}>
                Última actualización: {timestamp}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              sx={{
                color: '#94A3B8',
                borderColor: '#334155',
                fontSize: 11,
                py: 0.3,
                '&:hover': { borderColor: TMS_COLOR, color: '#F1F5F9' },
              }}
            >
              Actualizar
            </Button>
          </Box>

          {/* Map Body — 3 columns */}
          <Grid container sx={{ height: 350 }}>
            {/* Column 1 — Vehículos en Ruta */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  height: '100%',
                  borderRight: '1px solid #1E3A5F',
                  p: 2,
                  overflowY: 'auto',
                }}
              >
                <Typography
                  sx={{
                    color: '#64748B',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    mb: 1.5,
                  }}
                >
                  Vehículos en Ruta ({vehiculosEnRuta.length})
                </Typography>
                {vehiculosEnRuta.map((v) => (
                  <Box
                    key={v.placa}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1.2,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: '#0D1B2E',
                      border: '1px solid #162038',
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: getEstadoColor(v.estado),
                        flexShrink: 0,
                      }}
                    />
                    <Chip
                      label={v.placa}
                      size="small"
                      sx={{
                        bgcolor: '#0C2340',
                        color: '#38BDF8',
                        fontSize: 10,
                        height: 20,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        noWrap
                        sx={{ color: '#CBD5E1', fontSize: 11, fontWeight: 500 }}
                      >
                        {v.conductor}
                      </Typography>
                      <Typography
                        noWrap
                        sx={{ color: '#475569', fontSize: 10 }}
                      >
                        {v.origen} → {v.destino}
                      </Typography>
                    </Box>
                    <Chip
                      label={v.velocidad > 0 ? `${v.velocidad} km/h` : 'Detenido'}
                      size="small"
                      sx={{
                        bgcolor: v.velocidad > 0 ? '#052E16' : '#3B0A0A',
                        color: v.velocidad > 0 ? '#4ADE80' : '#F87171',
                        fontSize: 9,
                        height: 18,
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Grid>

            {/* Column 2 — Rutas Activas */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  height: '100%',
                  borderRight: '1px solid #1E3A5F',
                  p: 2,
                  overflowY: 'auto',
                }}
              >
                <Typography
                  sx={{
                    color: '#64748B',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    mb: 1.5,
                  }}
                >
                  Rutas Activas
                </Typography>
                {vehiculosEnRuta.map((v) => (
                  <Box key={v.placa} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{ color: '#94A3B8', fontSize: 10, width: 76, flexShrink: 0 }}
                      >
                        {v.origen}
                      </Typography>
                      <Box sx={{ flex: 1, position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
                        {/* track */}
                        <Box
                          sx={{
                            width: '100%',
                            height: 1,
                            borderTop: '1px dashed #334155',
                          }}
                        />
                        {/* progress marker */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${v.porcentaje}%`,
                            transform: 'translateX(-50%)',
                            width: 10,
                            height: 10,
                            borderRadius: '2px',
                            bgcolor: getEstadoColor(v.estado),
                            border: '1px solid #0a1628',
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{ color: '#94A3B8', fontSize: 10, width: 76, flexShrink: 0, textAlign: 'right' }}
                      >
                        {v.destino}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.3 }}>
                      <Typography sx={{ color: '#475569', fontSize: 9 }}>
                        {v.porcentaje}% completado
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={v.porcentaje}
                      sx={{
                        height: 2,
                        borderRadius: 1,
                        bgcolor: '#1E293B',
                        mt: 0.3,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getEstadoColor(v.estado),
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Grid>

            {/* Column 3 — Alertas Activas */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ height: '100%', p: 2, overflowY: 'auto' }}>
                <Typography
                  sx={{
                    color: '#64748B',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    mb: 1.5,
                  }}
                >
                  Alertas Activas ({alertasActivas.length})
                </Typography>
                {alertasActivas.map((a) => (
                  <Box
                    key={a.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      mb: 1.2,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: '#0D1B2E',
                      border: `1px solid ${a.prioridad === 'ALTA' ? '#3B1A1A' : '#162038'}`,
                    }}
                  >
                    <Box sx={{ flexShrink: 0, mt: 0.2 }}>
                      <AlertaIcon tipo={a.tipo} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                        <Chip
                          label={a.prioridad}
                          size="small"
                          color={getPrioridadColor(a.prioridad) as 'error' | 'warning' | 'default'}
                          sx={{ height: 16, fontSize: 9, fontWeight: 700 }}
                        />
                        <Typography sx={{ color: '#475569', fontSize: 9 }}>{a.hora}</Typography>
                      </Box>
                      <Typography sx={{ color: '#CBD5E1', fontSize: 11, lineHeight: 1.3 }}>
                        {a.mensaje}
                      </Typography>
                      <Typography sx={{ color: '#475569', fontSize: 10, mt: 0.3 }}>
                        {a.viaje}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — REAL-TIME KPIs
        ══════════════════════════════════════════════════════════════ */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* KPI 1 — OTIF Rate */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                bgcolor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
                  OTIF Rate
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Typography sx={{ color: '#4ADE80', fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
                    87.3%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <TrendingUpIcon sx={{ color: '#4ADE80', fontSize: 18 }} />
                    <Typography sx={{ color: '#4ADE80', fontSize: 12 }}>+1.2%</Typography>
                  </Box>
                </Box>
                <Typography sx={{ color: '#475569', fontSize: 11, mt: 0.5 }}>
                  últimas 24h
                </Typography>
                <Sparkline data={sparklineData} color={TMS_COLOR} />
              </CardContent>
            </Card>
          </Grid>

          {/* KPI 2 — Viajes en Tránsito */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                bgcolor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
                  Viajes en Tránsito
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Typography sx={{ color: '#38BDF8', fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
                    8
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <TrendingUpIcon sx={{ color: '#38BDF8', fontSize: 18 }} />
                    <Typography sx={{ color: '#38BDF8', fontSize: 12 }}>+2</Typography>
                  </Box>
                </Box>
                <Typography sx={{ color: '#475569', fontSize: 11, mt: 0.5 }}>
                  activos ahora
                </Typography>
                <Sparkline data={[15, 20, 18, 25, 22, 28, 24]} color='#38BDF8' />
              </CardContent>
            </Card>
          </Grid>

          {/* KPI 3 — Entregas On Time */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                bgcolor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
                  Entregas On Time Hoy
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Typography sx={{ color: '#4ADE80', fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
                    24/28
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <TrendingUpIcon sx={{ color: '#4ADE80', fontSize: 18 }} />
                  </Box>
                </Box>
                <Typography sx={{ color: '#475569', fontSize: 11, mt: 0.5 }}>
                  completadas hoy
                </Typography>
                <Sparkline data={[20, 24, 22, 30, 28, 32, 30]} color='#4ADE80' />
              </CardContent>
            </Card>
          </Grid>

          {/* KPI 4 — Costo del Día */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                bgcolor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
                  Costo del Día
                </Typography>
                <Typography sx={{ color: '#F1F5F9', fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
                  $4,820,000
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <TrendingUpIcon sx={{ color: '#F97316', fontSize: 16 }} />
                  <Typography sx={{ color: '#F97316', fontSize: 12, fontWeight: 600 }}>
                    +3.2% vs ayer
                  </Typography>
                </Box>
                <Typography sx={{ color: '#475569', fontSize: 11 }}>
                  acumulado hoy
                </Typography>
                <Sparkline data={sparklineCost} color='#F97316' />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — 3 BOTTOM PANELS
        ══════════════════════════════════════════════════════════════ */}
        <Grid container spacing={2}>
          {/* Panel 1 — Viajes Críticos */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              sx={{
                bgcolor: '#111827',
                border: '1px solid #3B1A1A',
                borderRadius: 2,
                overflow: 'hidden',
                height: '100%',
              }}
            >
              {/* Red-tinted header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.2,
                  bgcolor: '#1C0A0A',
                  borderBottom: '1px solid #3B1A1A',
                }}
              >
                <WarningAmberIcon sx={{ color: '#EF4444', fontSize: 18 }} />
                <Typography sx={{ color: '#FCA5A5', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                  Viajes Críticos
                </Typography>
                <Chip
                  label={viajesCriticos.length}
                  size="small"
                  sx={{
                    ml: 'auto',
                    bgcolor: '#7F1D1D',
                    color: '#FCA5A5',
                    fontSize: 10,
                    height: 18,
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Código', 'Conductor', 'Ruta', 'Alerta', 'Retraso'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            color: '#475569',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            borderBottom: '1px solid #1F2937',
                            py: 0.8,
                            px: 1.5,
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viajesCriticos.map((vc) => (
                      <TableRow
                        key={vc.codigo}
                        sx={{
                          '&:hover': { bgcolor: '#1A0A0A' },
                          '& td': { borderBottom: '1px solid #1F2937' },
                        }}
                      >
                        <TableCell sx={{ px: 1.5, py: 1 }}>
                          <Typography sx={{ color: '#38BDF8', fontSize: 10, fontWeight: 600 }}>
                            {vc.codigo.replace('VJ-20240619-', 'VJ-')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>
                          <Typography noWrap sx={{ color: '#CBD5E1', fontSize: 11, maxWidth: 80 }}>
                            {vc.conductor.split(' ')[0]}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>
                          <Typography noWrap sx={{ color: '#94A3B8', fontSize: 10, maxWidth: 100 }}>
                            {vc.ruta}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>
                          <Chip
                            label={vc.tipoAlerta}
                            size="small"
                            sx={{
                              bgcolor:
                                vc.tipoAlerta === 'DEMORADO'
                                  ? '#431407'
                                  : '#3B0A0A',
                              color:
                                vc.tipoAlerta === 'DEMORADO'
                                  ? '#FB923C'
                                  : '#F87171',
                              fontSize: 9,
                              height: 18,
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ px: 1.5, py: 1 }}>
                          <Typography sx={{ color: '#EF4444', fontSize: 11, fontWeight: 700 }}>
                            {vc.minutosRetraso} min
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>

          {/* Panel 2 — Próximas Entregas */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              sx={{
                bgcolor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 2,
                overflow: 'hidden',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.2,
                  bgcolor: '#0C1A2E',
                  borderBottom: '1px solid #1E3A5F',
                }}
              >
                <Typography sx={{ color: '#93C5FD', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                  Próximas Entregas
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: 11, ml: 0.5 }}>
                  — próximas 4 horas
                </Typography>
                <Chip
                  label={proximasEntregas.length}
                  size="small"
                  sx={{
                    ml: 'auto',
                    bgcolor: '#0C2340',
                    color: '#38BDF8',
                    fontSize: 10,
                    height: 18,
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Box sx={{ p: 1.5 }}>
                {proximasEntregas.map((pe, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1.2,
                      px: 1,
                      borderBottom:
                        i < proximasEntregas.length - 1
                          ? '1px solid #1F2937'
                          : 'none',
                    }}
                  >
                    {/* Time */}
                    <Box sx={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
                      <Typography
                        sx={{
                          color: TMS_COLOR,
                          fontSize: 13,
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        {pe.hora}
                      </Typography>
                    </Box>
                    {/* Divider */}
                    <Box
                      sx={{
                        width: 2,
                        height: 32,
                        bgcolor:
                          pe.estado === 'ON_TIME'
                            ? '#22C55E'
                            : pe.estado === 'EN_RIESGO'
                            ? '#F59E0B'
                            : '#EF4444',
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                    />
                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ color: '#F1F5F9', fontSize: 12, fontWeight: 600 }}>
                        {pe.cliente}
                      </Typography>
                      <Typography sx={{ color: '#475569', fontSize: 10 }}>
                        {pe.ciudad} · {pe.viaje.replace('VJ-20240619-', 'VJ-')}
                      </Typography>
                    </Box>
                    {/* Status */}
                    <Chip
                      label={
                        pe.estado === 'ON_TIME'
                          ? 'A tiempo'
                          : pe.estado === 'EN_RIESGO'
                          ? 'En riesgo'
                          : 'Demorado'
                      }
                      size="small"
                      color={getEntregaColor(pe.estado) as 'success' | 'warning' | 'error'}
                      sx={{ fontSize: 10, height: 20, fontWeight: 700 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Panel 3 — Resumen Diario */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              sx={{
                bgcolor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 2,
                overflow: 'hidden',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.2,
                  bgcolor: '#0C1A2E',
                  borderBottom: '1px solid #1E3A5F',
                }}
              >
                <Typography sx={{ color: '#93C5FD', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                  Resumen Diario
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: 11, ml: 0.5 }}>
                  — {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {[
                  { label: 'Viajes completados', value: '24', color: '#4ADE80' },
                  { label: 'Viajes en tránsito', value: '8', color: '#38BDF8' },
                  { label: 'Viajes programados', value: '6', color: '#A78BFA' },
                  { label: 'Km recorridos', value: '12,840 km', color: TMS_COLOR },
                  { label: 'Costo combustible', value: '$3,200,000', color: '#F1F5F9' },
                  { label: 'Peajes', value: '$820,000', color: '#F1F5F9' },
                  { label: 'Incidentes', value: '2', color: '#EF4444' },
                  { label: 'OTIF Rate', value: '87.3%', color: '#4ADE80' },
                ].map((row, i, arr) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      borderBottom:
                        i < arr.length - 1 ? '1px solid #1F2937' : 'none',
                    }}
                  >
                    <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                      {row.label}
                    </Typography>
                    <Typography
                      sx={{ color: row.color, fontSize: 13, fontWeight: 700 }}
                    >
                      {row.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography sx={{ color: '#1E3A5F', fontSize: 11 }}>
            ICOLTRANS — Sistema TMS Torre de Control · Datos en tiempo real
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
}
