import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Stack, alpha, Divider, LinearProgress,
} from '@mui/material'
import {
  DirectionsBus as FlotaIcon,
  Business as InfraIcon,
  BarChart as ReportIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  LocalGasStation as FuelIcon,
  Build as BuildIcon,
  TrendingUp as TrendIcon,
  Stars as StarsIcon,
  CheckCircle as OkIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#EA580C'
const CARD_BG = '#0F1E35'
const DARK_BG = '#060C1A'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtN = (n: number) => new Intl.NumberFormat('es-CO').format(n)

interface VehiculoReporte {
  placa: string
  tipo: string
  kmMes: number
  litrosMes: number
  rendimiento: number
  costoMes: number
  otsAbiertas: number
  pmProximo: string
  estado: 'OPERATIVO' | 'EN_TALLER' | 'INACTIVO'
}

interface Sede {
  nombre: string
  activos: number
  otsAbiertas: number
  ultimoCheck: string
  estadoGeneral: 'BUENO' | 'REGULAR' | 'CRITICO'
}

interface CostoActivo {
  nombre: string
  tipo: string
  costoMes: number
  costoAnio: number
}

const VEHICULOS: VehiculoReporte[] = [
  { placa: 'TXC-123', tipo: 'Tracto', kmMes: 28450, litrosMes: 3100, rendimiento: 9.2, costoMes: 4850000, otsAbiertas: 1, pmProximo: '25/07/2025', estado: 'OPERATIVO' },
  { placa: 'STK-456', tipo: 'Tracto', kmMes: 24300, litrosMes: 2980, rendimiento: 8.2, costoMes: 3200000, otsAbiertas: 0, pmProximo: '10/07/2025', estado: 'OPERATIVO' },
  { placa: 'FRG-789', tipo: 'Furgón', kmMes: 18200, litrosMes: 2340, rendimiento: 7.8, costoMes: 2100000, otsAbiertas: 2, pmProximo: '05/07/2025', estado: 'EN_TALLER' },
  { placa: 'CMN-321', tipo: 'Camión', kmMes: 22100, litrosMes: 3450, rendimiento: 6.4, costoMes: 5600000, otsAbiertas: 1, pmProximo: '18/07/2025', estado: 'OPERATIVO' },
  { placa: 'BUS-654', tipo: 'Bus', kmMes: 14800, litrosMes: 2100, rendimiento: 7.0, costoMes: 1800000, otsAbiertas: 0, pmProximo: '30/07/2025', estado: 'OPERATIVO' },
  { placa: 'TXC-987', tipo: 'Tracto', kmMes: 31200, litrosMes: 3900, rendimiento: 8.0, costoMes: 6200000, otsAbiertas: 3, pmProximo: '02/07/2025', estado: 'EN_TALLER' },
  { placa: 'CMV-111', tipo: 'Camioneta', kmMes: 8900, litrosMes: 980, rendimiento: 9.1, costoMes: 980000, otsAbiertas: 0, pmProximo: '20/08/2025', estado: 'OPERATIVO' },
  { placa: 'PLT-222', tipo: 'Plataforma', kmMes: 19500, litrosMes: 2600, rendimiento: 7.5, costoMes: 3400000, otsAbiertas: 1, pmProximo: '15/07/2025', estado: 'OPERATIVO' },
]

const SEDES: Sede[] = [
  { nombre: 'Bodega Principal — Bogotá', activos: 8, otsAbiertas: 3, ultimoCheck: '2025-06-15', estadoGeneral: 'BUENO' },
  { nombre: 'Centro Distribución — Medellín', activos: 5, otsAbiertas: 1, ultimoCheck: '2025-06-10', estadoGeneral: 'BUENO' },
  { nombre: 'Terminal Logístico — Cali', activos: 6, otsAbiertas: 2, ultimoCheck: '2025-06-12', estadoGeneral: 'REGULAR' },
  { nombre: 'Depósito — Barranquilla', activos: 5, otsAbiertas: 0, ultimoCheck: '2025-06-18', estadoGeneral: 'BUENO' },
  { nombre: 'Punto Logístico — Bucaramanga', activos: 4, otsAbiertas: 2, ultimoCheck: '2025-06-05', estadoGeneral: 'CRITICO' },
]

const COSTOS_TOP: CostoActivo[] = [
  { nombre: 'Tracto TXC-987', tipo: 'Flota', costoMes: 6200000, costoAnio: 48500000 },
  { nombre: 'Camión CMN-321', tipo: 'Flota', costoMes: 5600000, costoAnio: 52300000 },
  { nombre: 'Compresor CMP-07', tipo: 'Infraestructura', costoMes: 4900000, costoAnio: 38400000 },
  { nombre: 'Tracto TXC-123', tipo: 'Flota', costoMes: 4850000, costoAnio: 44100000 },
  { nombre: 'Montacargas MC-003', tipo: 'Infraestructura', costoMes: 4200000, costoAnio: 29800000 },
  { nombre: 'Plataforma PLT-222', tipo: 'Flota', costoMes: 3400000, costoAnio: 28500000 },
  { nombre: 'Tracto STK-456', tipo: 'Flota', costoMes: 3200000, costoAnio: 31200000 },
  { nombre: 'UPS / Sala TI', tipo: 'Infraestructura', costoMes: 2800000, costoAnio: 18900000 },
  { nombre: 'Bus BUS-654', tipo: 'Flota', costoMes: 1800000, costoAnio: 16400000 },
  { nombre: 'Camioneta CMV-111', tipo: 'Flota', costoMes: 980000, costoAnio: 9800000 },
]

const TENDENCIA_MENSUAL = [
  { mes: 'Ene', costo: 38200000 },
  { mes: 'Feb', costo: 42500000 },
  { mes: 'Mar', costo: 51300000 },
  { mes: 'Abr', costo: 44100000 },
  { mes: 'May', costo: 39800000 },
  { mes: 'Jun', costo: 48200000 },
]

const MTBF_TREND = [
  { mes: 'Ene', horas: 298 },
  { mes: 'Feb', horas: 312 },
  { mes: 'Mar', horas: 287 },
  { mes: 'Abr', horas: 325 },
  { mes: 'May', horas: 341 },
  { mes: 'Jun', horas: 337 },
]

const TOP_COSTOSOS_AÑO = [
  { nombre: 'Camión CMN-321', tipo: 'Flota', costoAnio: 52300000 },
  { nombre: 'Tracto TXC-987', tipo: 'Flota', costoAnio: 48500000 },
  { nombre: 'Tracto TXC-123', tipo: 'Flota', costoAnio: 44100000 },
]

const estadoVehColor = (e: string) => ({ OPERATIVO: '#32AC5C', EN_TALLER: '#F59E0B', INACTIVO: '#9CA3AF' })[e] ?? '#9CA3AF'
const sedeColor = (e: string) => ({ BUENO: '#32AC5C', REGULAR: '#F59E0B', CRITICO: '#EF4444' })[e] ?? '#9CA3AF'

const maxCosto = Math.max(...TENDENCIA_MENSUAL.map(t => t.costo))
const maxMtbf = Math.max(...MTBF_TREND.map(t => t.horas))

export default function EAMReportes() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3, background: DARK_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(EAM_COLOR, 0.15), color: EAM_COLOR }}>
            <ReportIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">Reportes EAM</Typography>
            <Typography variant="body2" color="grey.400">Informes de flota, infraestructura, costos y gerencia</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR } }}>
            {['Flota', 'Infraestructura', 'Presidencia', 'Costos'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Flota */}
        {tab === 0 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Disponibilidad Flota', value: '94.2%', icon: <SpeedIcon />, color: '#32AC5C' },
                { label: 'Km Recorridos (mes)', value: fmtN(186450), icon: <FlotaIcon />, color: EAM_COLOR },
                { label: 'Consumo Combustible', value: '18,450 L', icon: <FuelIcon />, color: '#3B82F6' },
                { label: 'Rendimiento Promedio', value: '7.2 km/L', icon: <TrendIcon />, color: '#8B5CF6' },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>Placa</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Km Mes</TableCell>
                    <TableCell align="right">Litros Mes</TableCell>
                    <TableCell align="center">Rendimiento</TableCell>
                    <TableCell align="right">Costo Mes</TableCell>
                    <TableCell align="center">OTs Abiertas</TableCell>
                    <TableCell>PM Próximo</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {VEHICULOS.map((v, i) => (
                    <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                      <TableCell><Typography variant="body2" fontWeight={700} color={EAM_COLOR}>{v.placa}</Typography></TableCell>
                      <TableCell>{v.tipo}</TableCell>
                      <TableCell align="right">{fmtN(v.kmMes)}</TableCell>
                      <TableCell align="right">{fmtN(v.litrosMes)}</TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color={v.rendimiento >= 8 ? '#32AC5C' : v.rendimiento >= 7 ? '#F59E0B' : '#EF4444'}>{v.rendimiento} km/L</Typography>
                      </TableCell>
                      <TableCell align="right">{fmt(v.costoMes)}</TableCell>
                      <TableCell align="center">
                        <Chip label={v.otsAbiertas} size="small" sx={{ background: v.otsAbiertas > 0 ? alpha('#F59E0B', 0.15) : alpha('#32AC5C', 0.15), color: v.otsAbiertas > 0 ? '#F59E0B' : '#32AC5C', fontWeight: 700, minWidth: 30 }} />
                      </TableCell>
                      <TableCell><Typography variant="caption" color="grey.300">{v.pmProximo}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={v.estado.replace('_', ' ')} size="small" sx={{ background: alpha(estadoVehColor(v.estado), 0.15), color: estadoVehColor(v.estado), fontWeight: 600, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: Infraestructura */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Activos Infraestructura', value: '28', color: EAM_COLOR, icon: <InfraIcon /> },
                { label: 'Inspecciones Pendientes', value: '5', color: '#F59E0B', icon: <BuildIcon /> },
                { label: 'OTs Correctivas (mes)', value: '8', color: '#EF4444', icon: <BuildIcon /> },
                { label: 'Costo Mes Infraestructura', value: '$12.4M', color: '#8B5CF6', icon: <MoneyIcon /> },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                    <TableCell>Sede / Ubicación</TableCell>
                    <TableCell align="center">Activos</TableCell>
                    <TableCell align="center">OTs Abiertas</TableCell>
                    <TableCell>Último Check</TableCell>
                    <TableCell align="center">Estado General</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SEDES.map((s, i) => (
                    <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }, '&:hover': { background: alpha('#fff', 0.03) } }}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{s.nombre}</Typography></TableCell>
                      <TableCell align="center">{s.activos}</TableCell>
                      <TableCell align="center">
                        <Chip label={s.otsAbiertas} size="small" sx={{ background: s.otsAbiertas > 0 ? alpha('#F59E0B', 0.15) : alpha('#32AC5C', 0.15), color: s.otsAbiertas > 0 ? '#F59E0B' : '#32AC5C', fontWeight: 700, minWidth: 30 }} />
                      </TableCell>
                      <TableCell>{s.ultimoCheck}</TableCell>
                      <TableCell align="center">
                        <Chip label={s.estadoGeneral} size="small" sx={{ background: alpha(sedeColor(s.estadoGeneral), 0.15), color: sedeColor(s.estadoGeneral), fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Presidencia */}
        {tab === 2 && (
          <Box>
            <Typography variant="subtitle1" color="grey.300" mb={3} fontWeight={600}>Dashboard Ejecutivo — Junio 2025</Typography>
            <Grid container spacing={3}>
              {/* Disponibilidad gauge */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(EAM_COLOR, 0.3)}`, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Disponibilidad General</Typography>
                    <Box sx={{ position: 'relative', width: 160, height: 160, mx: 'auto', mb: 1 }}>
                      <Box sx={{ width: 160, height: 160, borderRadius: '50%', background: `conic-gradient(${EAM_COLOR} 0% 94.2%, ${alpha('#fff', 0.08)} 94.2% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: DARK_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <Typography variant="h4" fontWeight={800} color={EAM_COLOR}>94.2%</Typography>
                          <Typography variant="caption" color="grey.400">Disponibilidad</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="grey.400">Objetivo: ≥ 95%</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Índice confiabilidad */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#32AC5C', 0.3)}`, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Índice de Confiabilidad Global</Typography>
                    <Typography variant="h2" fontWeight={900} color="#32AC5C" sx={{ lineHeight: 1.1 }}>91.5</Typography>
                    <Typography variant="h6" color="grey.400">/ 100</Typography>
                    <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />
                    <Stack direction="row" justifyContent="space-around">
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight={700} color="white">337h</Typography>
                        <Typography variant="caption" color="grey.400">MTBF</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight={700} color="white">4.2h</Typography>
                        <Typography variant="caption" color="grey.400">MTTR</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Costo vs presupuesto */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#3B82F6', 0.3)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Costo Mantenimiento YTD vs Presupuesto</Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="grey.400">Ejecutado</Typography>
                          <Typography variant="caption" fontWeight={700} color="white">$264M</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={88} sx={{ height: 10, borderRadius: 5, backgroundColor: alpha('#3B82F6', 0.15), '& .MuiLinearProgress-bar': { backgroundColor: '#3B82F6', borderRadius: 5 } }} />
                      </Box>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="grey.400">Presupuestado</Typography>
                          <Typography variant="caption" fontWeight={700} color="white">$300M</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={100} sx={{ height: 10, borderRadius: 5, backgroundColor: alpha('#32AC5C', 0.15), '& .MuiLinearProgress-bar': { backgroundColor: alpha('#32AC5C', 0.4), borderRadius: 5 } }} />
                      </Box>
                      <Typography variant="caption" color="#32AC5C" fontWeight={700}>✓ 88% ejecutado — $36M disponibles</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cumplimiento PM */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Cumplimiento PM</Typography>
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box flex={1}>
                        <Stack direction="row" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="grey.300">Mantenimientos realizados</Typography>
                          <Typography variant="body2" fontWeight={700} color={EAM_COLOR}>87%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={87} sx={{ height: 16, borderRadius: 8, backgroundColor: alpha(EAM_COLOR, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: EAM_COLOR, borderRadius: 8 } }} />
                        <Stack direction="row" justifyContent="space-between" mt={0.5}>
                          <Typography variant="caption" color="grey.500">52 de 60 PM programados</Typography>
                          <Typography variant="caption" color="grey.500">Objetivo: 90%</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* MTBF Trend */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>MTBF Últimos 6 Meses (horas)</Typography>
                    <Stack spacing={1}>
                      {MTBF_TREND.map((m, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                          <Typography variant="caption" color="grey.400" sx={{ width: 28 }}>{m.mes}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 8, borderRadius: 4, background: alpha('#fff', 0.05), overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${(m.horas / maxMtbf) * 100}%`, background: m.horas >= 330 ? '#32AC5C' : m.horas >= 300 ? EAM_COLOR : '#EF4444', borderRadius: 4, transition: 'width 0.5s ease' }} />
                            </Box>
                          </Box>
                          <Typography variant="caption" color="white" fontWeight={700} sx={{ width: 40, textAlign: 'right' }}>{m.horas}h</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top 3 costosos */}
              <Grid size={{ xs: 12 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <StarsIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                      <Typography variant="subtitle2" color="grey.400" fontWeight={600}>Top 3 Activos con Mayor Costo de Mantenimiento (Año)</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      {TOP_COSTOSOS_AÑO.map((t, i) => (
                        <Grid key={i} size={{ xs: 12, md: 4 }}>
                          <Box sx={{ p: 2, borderRadius: 2, background: alpha(i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#B45309', 0.1), border: `1px solid ${alpha(i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#B45309', 0.3)}` }}>
                            <Typography variant="caption" color={i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#B45309'} fontWeight={700}>#{i + 1}</Typography>
                            <Typography variant="body1" fontWeight={700} color="white">{t.nombre}</Typography>
                            <Typography variant="caption" color="grey.400">{t.tipo}</Typography>
                            <Typography variant="h6" fontWeight={800} color="white" mt={1}>{fmt(t.costoAnio)}</Typography>
                            <Typography variant="caption" color="grey.400">Costo acumulado 2025</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 3: Costos */}
        {tab === 3 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Costo Total Mes', value: '$48.2M', color: EAM_COLOR, icon: <MoneyIcon /> },
                { label: 'Mano de Obra', value: '$12.3M', color: '#3B82F6', icon: <BuildIcon /> },
                { label: 'Repuestos', value: '$28.4M', color: '#F59E0B', icon: <BuildIcon /> },
                { label: 'Servicios Externos', value: '$7.5M', color: '#8B5CF6', icon: <MoneyIcon /> },
              ].map((k, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}` }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: k.color }}>{k.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="white">{k.value}</Typography>
                          <Typography variant="caption" color="grey.400">{k.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Breakdown por tipo OT */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Distribución por Tipo de OT</Typography>
                    <Stack spacing={2}>
                      {[
                        { tipo: 'CORRECTIVA', pct: 52, color: '#EF4444' },
                        { tipo: 'PREVENTIVA', pct: 35, color: '#32AC5C' },
                        { tipo: 'PREDICTIVA', pct: 8, color: '#8B5CF6' },
                        { tipo: 'EMERGENCIA', pct: 5, color: '#F97316' },
                      ].map((t, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="grey.300">{t.tipo}</Typography>
                            <Typography variant="body2" fontWeight={700} color={t.color}>{t.pct}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={t.pct} sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(t.color, 0.1), '& .MuiLinearProgress-bar': { backgroundColor: t.color, borderRadius: 4 } }} />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Tendencia mensual */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Tendencia Costo Mensual (últimos 6 meses)</Typography>
                    <Stack spacing={1.5}>
                      {TENDENCIA_MENSUAL.map((m, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={2}>
                          <Typography variant="caption" color="grey.400" sx={{ width: 28 }}>{m.mes}</Typography>
                          <Box flex={1}>
                            <Box sx={{ height: 20, borderRadius: 4, background: alpha('#fff', 0.05), overflow: 'hidden', position: 'relative' }}>
                              <Box sx={{ height: '100%', width: `${(m.costo / maxCosto) * 100}%`, background: i === 5 ? EAM_COLOR : alpha(EAM_COLOR, 0.5), borderRadius: 4, transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" color="white" fontWeight={700} noWrap sx={{ fontSize: 11 }}>{fmt(m.costo)}</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top 10 activos costosos */}
              <Grid size={{ xs: 12 }}>
                <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="grey.400" mb={2} fontWeight={600}>Top 10 Activos por Costo de Mantenimiento</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}` } }}>
                            <TableCell>#</TableCell>
                            <TableCell>Activo</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell align="right">Costo Mes</TableCell>
                            <TableCell align="right">Costo Año</TableCell>
                            <TableCell>Proporción</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {COSTOS_TOP.map((c, i) => (
                            <TableRow key={i} sx={{ '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}` } }}>
                              <TableCell><Typography variant="body2" fontWeight={700} color="grey.500">#{i + 1}</Typography></TableCell>
                              <TableCell><Typography variant="body2" fontWeight={600}>{c.nombre}</Typography></TableCell>
                              <TableCell><Chip label={c.tipo} size="small" sx={{ background: alpha(c.tipo === 'Flota' ? EAM_COLOR : '#8B5CF6', 0.15), color: c.tipo === 'Flota' ? EAM_COLOR : '#8B5CF6', fontSize: 10 }} /></TableCell>
                              <TableCell align="right">{fmt(c.costoMes)}</TableCell>
                              <TableCell align="right"><Typography fontWeight={600}>{fmt(c.costoAnio)}</Typography></TableCell>
                              <TableCell sx={{ width: 120 }}>
                                <LinearProgress variant="determinate" value={Math.round((c.costoMes / 6200000) * 100)} sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(EAM_COLOR, 0.1), '& .MuiLinearProgress-bar': { backgroundColor: EAM_COLOR, borderRadius: 3 } }} />
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
          </Box>
        )}
      </Box>
    </Layout>
  )
}
