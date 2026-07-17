import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Chip,
  Button,
  alpha,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  LocalShipping,
  EventNote,
  DirectionsBus,
  PersonPin,
  CheckCircle,
  Schedule,
  AttachMoney,
  Warning,
  VisibilityOutlined,
  Circle,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const TMS_COLOR = '#0369A1'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KPI {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  sub?: string
}

interface ViajeActivo {
  codigo: string
  origen: string
  destino: string
  conductor: string
  placa: string
  estado: 'EN_TRANSITO' | 'DEMORADO' | 'EN_RIESGO'
  eta: string
  pct: number
}

interface Alerta {
  id: number
  nivel: 'CRITICA' | 'ALTA' | 'MEDIA'
  mensaje: string
  viaje?: string
}

interface Entrega {
  viaje: string
  cliente: string
  destino: string
  horaEntrega: string
  otif: 'ON_TIME' | 'TARDE' | 'INCOMPLETA'
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const VIAJES_ACTIVOS: ViajeActivo[] = [
  { codigo: 'V-2024-001', origen: 'Bogotá', destino: 'Medellín', conductor: 'Carlos Herrera', placa: 'XYZ-123', estado: 'EN_TRANSITO', eta: '15:30', pct: 65 },
  { codigo: 'V-2024-002', origen: 'Bogotá', destino: 'Cali', conductor: 'Luis Pérez', placa: 'ABC-456', estado: 'DEMORADO', eta: '18:45', pct: 40 },
  { codigo: 'V-2024-003', origen: 'Medellín', destino: 'Barranquilla', conductor: 'Andrés Torres', placa: 'DEF-789', estado: 'EN_TRANSITO', eta: '20:00', pct: 30 },
  { codigo: 'V-2024-004', origen: 'Cali', destino: 'Bogotá', conductor: 'Jhon Morales', placa: 'GHI-012', estado: 'EN_TRANSITO', eta: '16:15', pct: 80 },
  { codigo: 'V-2024-005', origen: 'Barranquilla', destino: 'Cartagena', conductor: 'Pedro Gómez', placa: 'JKL-345', estado: 'EN_RIESGO', eta: '14:00', pct: 55 },
  { codigo: 'V-2024-006', origen: 'Bogotá', destino: 'Bucaramanga', conductor: 'Mauricio Silva', placa: 'MNO-678', estado: 'EN_TRANSITO', eta: '22:30', pct: 20 },
  { codigo: 'V-2024-007', origen: 'Pereira', destino: 'Bogotá', conductor: 'Felipe Castro', placa: 'PQR-901', estado: 'EN_TRANSITO', eta: '17:00', pct: 72 },
  { codigo: 'V-2024-008', origen: 'Cúcuta', destino: 'Bucaramanga', conductor: 'Diego Vargas', placa: 'STU-234', estado: 'DEMORADO', eta: '19:30', pct: 48 },
]

const ALERTAS: Alerta[] = [
  { id: 1, nivel: 'CRITICA', mensaje: 'Vehículo ABC-456 detenido 2h sin reportar novedad en vía Bogotá-Cali', viaje: 'V-2024-002' },
  { id: 2, nivel: 'CRITICA', mensaje: 'Conductor Pedro Gómez excedió límite de horas de conducción (10h)', viaje: 'V-2024-005' },
  { id: 3, nivel: 'ALTA', mensaje: 'V-2024-008 lleva 45 min de retraso sobre tiempo estimado', viaje: 'V-2024-008' },
  { id: 4, nivel: 'ALTA', mensaje: 'Temperatura de carga fuera de rango en V-2024-003', viaje: 'V-2024-003' },
  { id: 5, nivel: 'MEDIA', mensaje: 'Documentación incompleta para viaje V-2024-006', viaje: 'V-2024-006' },
]

const ENTREGAS: Entrega[] = [
  { viaje: 'V-2024-101', cliente: 'Almacenes Éxito S.A.', destino: 'Bogotá', horaEntrega: '08:15', otif: 'ON_TIME' },
  { viaje: 'V-2024-102', cliente: 'Bavaria S.A.S.', destino: 'Medellín', horaEntrega: '09:40', otif: 'TARDE' },
  { viaje: 'V-2024-103', cliente: 'Grupo Nutresa', destino: 'Cali', horaEntrega: '10:05', otif: 'ON_TIME' },
  { viaje: 'V-2024-104', cliente: 'Cencosud Colombia', destino: 'Barranquilla', horaEntrega: '11:20', otif: 'INCOMPLETA' },
  { viaje: 'V-2024-105', cliente: 'Postobón S.A.', destino: 'Bucaramanga', horaEntrega: '12:00', otif: 'ON_TIME' },
  { viaje: 'V-2024-106', cliente: 'Colgate-Palmolive', destino: 'Pereira', horaEntrega: '13:30', otif: 'TARDE' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

const KPICard = ({ label, value, icon, color, sub }: KPI) => (
  <Paper elevation={0} className="hover-lift" sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography className="text-gradient" fontSize={28} fontWeight={800} color={color} lineHeight={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
        <Typography fontSize={12} color="text.secondary" mt={0.5}>{label}</Typography>
        {sub && <Typography fontSize={11} color="text.secondary" mt={0.25}>{sub}</Typography>}
      </Box>
      <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20, color } })}
      </Box>
    </Stack>
  </Paper>
)

const estadoChip = (estado: ViajeActivo['estado']) => {
  const map = {
    EN_TRANSITO: { label: 'En Tránsito', color: '#0369A1', bg: '#E0F2FE' },
    DEMORADO: { label: 'Demorado', color: '#B45309', bg: '#FEF3C7' },
    EN_RIESGO: { label: 'En Riesgo', color: '#B91C1C', bg: '#FEE2E2' },
  }
  const s = map[estado]
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11 }} />
}

const nivelColor = (nivel: Alerta['nivel']) => {
  if (nivel === 'CRITICA') return { icon: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
  if (nivel === 'ALTA') return { icon: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }
  return { icon: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' }
}

const otifChip = (otif: Entrega['otif']) => {
  const map = {
    ON_TIME: { label: 'ON TIME', color: '#15803D', bg: '#DCFCE7' },
    TARDE: { label: 'TARDE', color: '#B91C1C', bg: '#FEE2E2' },
    INCOMPLETA: { label: 'INCOMPLETA', color: '#C2410C', bg: '#FFEDD5' },
  }
  const s = map[otif]
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 10 }} />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TMSDashboard() {
  const [, setSelectedAlerta] = useState<number | null>(null)

  const criticalCount = ALERTAS.filter(a => a.nivel === 'CRITICA').length

  const kpis: KPI[] = [
    { label: 'Viajes en Tránsito', value: 8, icon: <LocalShipping />, color: TMS_COLOR },
    { label: 'Viajes Programados Hoy', value: 14, icon: <EventNote />, color: '#7C3AED' },
    { label: 'Vehículos Activos', value: 23, icon: <DirectionsBus />, color: '#0891B2' },
    { label: 'Conductores en Ruta', value: 8, icon: <PersonPin />, color: '#059669' },
    { label: 'OTIF Rate', value: '96.4%', icon: <CheckCircle />, color: '#16A34A', sub: 'Meta: ≥95%' },
    { label: 'On Time Rate', value: '94.1%', icon: <Schedule />, color: '#0369A1', sub: 'Último mes' },
    { label: 'Costo/Km Promedio', value: '$1.850', icon: <AttachMoney />, color: '#92400E', sub: 'COP/km' },
    { label: 'Alertas Críticas', value: criticalCount, icon: <Warning />, color: criticalCount > 0 ? '#DC2626' : '#16A34A', sub: criticalCount > 0 ? 'Requieren atención' : 'Sin alertas' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} color={TMS_COLOR}>Torre de Control TMS</Typography>
            <Typography variant="body2" color="text.secondary">
              Monitoreo en tiempo real del transporte — {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
          <Chip
            icon={<Circle sx={{ fontSize: '10px !important', color: '#16A34A !important' }} />}
            label="EN VIVO"
            size="small"
            sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: 11 }}
          />
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2} mb={3} className="anim-stagger">
          {kpis.map((kpi, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <KPICard {...kpi} />
            </Grid>
          ))}
        </Grid>

        {/* Main content: Viajes Activos + Alertas */}
        <Grid container spacing={2} mb={2}>
          {/* Tabla de Viajes Activos */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700} fontSize={15}>Viajes Activos</Typography>
                  <Chip label={`${VIAJES_ACTIVOS.length} viajes`} size="small" sx={{ bgcolor: alpha(TMS_COLOR, 0.1), color: TMS_COLOR, fontWeight: 600 }} />
                </Stack>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Ruta</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Conductor</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Placa</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>ETA</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>% Comp.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {VIAJES_ACTIVOS.map((v) => (
                      <TableRow key={v.codigo} hover>
                        <TableCell><Typography fontSize={12} fontWeight={600} color={TMS_COLOR}>{v.codigo}</Typography></TableCell>
                        <TableCell>
                          <Typography fontSize={12}>{v.origen}</Typography>
                          <Typography fontSize={11} color="text.secondary">→ {v.destino}</Typography>
                        </TableCell>
                        <TableCell><Typography fontSize={12}>{v.conductor}</Typography></TableCell>
                        <TableCell><Chip label={v.placa} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }} /></TableCell>
                        <TableCell>{estadoChip(v.estado)}</TableCell>
                        <TableCell><Typography fontSize={12} fontWeight={600}>{v.eta}</Typography></TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ flex: 1, height: 6, bgcolor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${v.pct}%`, bgcolor: v.estado === 'EN_RIESGO' ? '#DC2626' : v.estado === 'DEMORADO' ? '#D97706' : TMS_COLOR, borderRadius: 3 }} />
                            </Box>
                            <Typography fontSize={11} fontWeight={600}>{v.pct}%</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Panel de Alertas */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700} fontSize={15}>Alertas Activas</Typography>
                  <Chip label={`${criticalCount} críticas`} size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
                </Stack>
              </Box>
              <Stack spacing={0} divider={<Divider />}>
                {ALERTAS.map((alerta) => {
                  const c = nivelColor(alerta.nivel)
                  return (
                    <Box key={alerta.id} sx={{ px: 2, py: 1.5, bgcolor: c.bg, borderLeft: `3px solid ${c.icon}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Box flex={1}>
                          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
                            <Warning sx={{ fontSize: 14, color: c.icon }} />
                            <Chip label={alerta.nivel} size="small" sx={{ bgcolor: 'transparent', color: c.icon, fontWeight: 800, fontSize: 10, border: `1px solid ${c.icon}`, height: 18 }} />
                            {alerta.viaje && <Typography fontSize={11} color="text.secondary">{alerta.viaje}</Typography>}
                          </Stack>
                          <Typography fontSize={12}>{alerta.mensaje}</Typography>
                        </Box>
                        <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 'auto', borderColor: c.icon, color: c.icon, '&:hover': { borderColor: c.icon, bgcolor: alpha(c.icon, 0.08) } }} onClick={() => setSelectedAlerta(alerta.id)}>
                          Ver
                        </Button>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Últimas Entregas */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={700} fontSize={15}>Entregas Completadas Hoy</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={`${ENTREGAS.filter(e => e.otif === 'ON_TIME').length} On Time`} size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: 11 }} />
                <Chip label={`${ENTREGAS.filter(e => e.otif === 'TARDE').length} Tarde`} size="small" sx={{ bgcolor: '#FEE2E2', color: '#B91C1C', fontWeight: 700, fontSize: 11 }} />
              </Stack>
            </Stack>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Viaje</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Destino</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Hora Entrega</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>OTIF</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ENTREGAS.map((e) => (
                  <TableRow key={e.viaje} hover>
                    <TableCell><Typography fontSize={12} fontWeight={600} color={TMS_COLOR}>{e.viaje}</Typography></TableCell>
                    <TableCell><Typography fontSize={12}>{e.cliente}</Typography></TableCell>
                    <TableCell><Typography fontSize={12}>{e.destino}</Typography></TableCell>
                    <TableCell><Typography fontSize={12} fontWeight={600}>{e.horaEntrega}</Typography></TableCell>
                    <TableCell>{otifChip(e.otif)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Layout>
  )
}
