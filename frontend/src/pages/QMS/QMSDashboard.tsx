// QMS Module - Dashboard
import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Typography, Chip, Button, Card, CardContent, Grid,
  LinearProgress, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Stack, Divider, Tooltip, alpha,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

const QMS_COLOR = '#059669'
const QMS_COLOR_DARK = '#047857'

interface KpiCardProps {
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}

const KpiCard = ({ label, value, color, icon, sub }: KpiCardProps) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid',
      borderColor: alpha(color, 0.3),
      borderRadius: '14px',
      p: 2.5,
      height: '100%',
      background: alpha(color, 0.04),
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} color={color} sx={{ lineHeight: 1.1, mt: 0.5 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </Box>
      <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
    </Stack>
  </Paper>
)

interface AuditRow {
  codigo: string
  nombre: string
  tipo: string
  fecha: string
  estado: string
}

const AUDIT_DATA: AuditRow[] = [
  { codigo: 'AUD-001', nombre: 'Auditoría Interna ISO 9001', tipo: 'INTERNA', fecha: '2026-07-15', estado: 'PLANIFICADA' },
  { codigo: 'AUD-002', nombre: 'Seguimiento ISO 28000', tipo: 'EXTERNA', fecha: '2026-08-01', estado: 'PLANIFICADA' },
  { codigo: 'AUD-003', nombre: 'Auditoría Cliente XYZ', tipo: 'CLIENTE', fecha: '2026-06-10', estado: 'COMPLETADA' },
]

const NC_TREND = [
  { mes: 'Ene', valor: 4 },
  { mes: 'Feb', valor: 7 },
  { mes: 'Mar', valor: 3 },
  { mes: 'Abr', valor: 9 },
  { mes: 'May', valor: 5 },
  { mes: 'Jun', valor: 7 },
]

const ISO_STANDARDS = [
  { name: 'ISO 9001:2015', value: 94 },
  { name: 'ISO 28000:2022', value: 88 },
  { name: 'ISO 45001:2018', value: 91 },
  { name: 'ISO 14001:2015', value: 85 },
  { name: 'ISO 27001:2022', value: 79 },
  { name: 'ISO 31000:2018', value: 87 },
]

interface Alert {
  severity: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  text: string
}

const ALERTS: Alert[] = [
  { severity: 'CRÍTICA', text: 'CAPA #CAPA-024 vence mañana' },
  { severity: 'ALTA', text: '3 NC mayores sin CAPA asignada' },
  { severity: 'MEDIA', text: 'Auditoría ISO 9001 programada en 5 días' },
  { severity: 'BAJA', text: '2 indicadores por debajo de meta' },
]

const severityColor: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  CRÍTICA: 'error',
  ALTA: 'warning',
  MEDIA: 'info',
  BAJA: 'success',
}

const statusColor: Record<string, string> = {
  PLANIFICADA: '#3B82F6',
  COMPLETADA: '#059669',
  EN_EJECUCION: '#F59E0B',
  CANCELADA: '#6B7280',
}

const tipoColor: Record<string, string> = {
  INTERNA: '#3B82F6',
  EXTERNA: '#F59E0B',
  CLIENTE: '#059669',
}

const maxTrend = Math.max(...NC_TREND.map(d => d.valor))

export default function QMSDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: _dashData, isLoading } = useQuery({
    queryKey: ['qms-dashboard', refreshKey],
    queryFn: () => api.get('/qms/dashboard').then(r => r.data),
    retry: false,
    staleTime: 60_000,
  })

  const handleRefresh = () => setRefreshKey(k => k + 1)

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack direction="row" alignItems="center" gap={2}>
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: QMS_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VerifiedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                Torre de Control de Calidad
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sistema de Gestión de Calidad — Vista ejecutiva
              </Typography>
            </Box>
            <Chip
              label="QMS"
              size="small"
              sx={{ background: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, borderRadius: '8px' }}
            />
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ borderColor: QMS_COLOR, color: QMS_COLOR, '&:hover': { borderColor: QMS_COLOR_DARK, background: alpha(QMS_COLOR, 0.06) } }}
          >
            Actualizar
          </Button>
        </Stack>

        {/* KPI Row 1 */}
        <Grid container spacing={2} mb={2}>
          {[
            { label: 'Índice de Calidad', value: '94.2 %', color: '#059669', icon: <TrendingUpIcon fontSize="large" />, sub: 'Meta: ≥ 90%' },
            { label: 'NC Abiertas', value: '7', color: '#EF4444', icon: <ErrorIcon fontSize="large" />, sub: 'Requieren atención' },
            { label: 'Auditorías Pendientes', value: '3', color: '#3B82F6', icon: <InfoIcon fontSize="large" />, sub: 'En este trimestre' },
            { label: 'CAPA Activas', value: '12', color: '#8B5CF6', icon: <CheckCircleIcon fontSize="large" />, sub: '2 por vencer pronto' },
          ].map(kpi => (
            <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard {...kpi} />
            </Grid>
          ))}
        </Grid>

        {/* KPI Row 2 */}
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'Hallazgos Abiertos', value: '18', color: '#F59E0B', icon: <WarningAmberIcon fontSize="large" />, sub: 'De auditorías recientes' },
            { label: 'Riesgos Críticos', value: '2', color: '#EF4444', icon: <ErrorIcon fontSize="large" />, sub: 'Requieren mitigación' },
            { label: 'Quejas Abiertas', value: '5', color: '#F97316', icon: <WarningAmberIcon fontSize="large" />, sub: 'De clientes externos' },
            { label: 'NPS Score', value: '78', color: '#059669', icon: <TrendingUpIcon fontSize="large" />, sub: 'Meta: ≥ 70' },
          ].map(kpi => (
            <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard {...kpi} />
            </Grid>
          ))}
        </Grid>

        {/* Middle section */}
        <Grid container spacing={3} mb={3}>
          {/* ISO Compliance */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3, height: '100%' }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
                <VerifiedIcon sx={{ color: QMS_COLOR }} />
                <Typography variant="subtitle1" fontWeight={700}>Cumplimiento ISO</Typography>
              </Stack>
              <Stack gap={2}>
                {ISO_STANDARDS.map(std => {
                  const color = std.value >= 90 ? '#059669' : std.value >= 85 ? '#F59E0B' : '#EF4444'
                  return (
                    <Box key={std.name}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">{std.name}</Typography>
                        <Typography variant="caption" fontWeight={700} color={color}>{std.value}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={std.value}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(color, 0.15),
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                        }}
                      />
                    </Box>
                  )
                })}
              </Stack>
            </Paper>
          </Grid>

          {/* NC Trend */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2.5}>Tendencia NC (6 meses)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 140 }}>
                {NC_TREND.map(d => (
                  <Box key={d.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="#EF4444">{d.valor}</Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(d.valor / maxTrend) * 100}px`,
                        background: `linear-gradient(180deg, #EF4444, #DC2626)`,
                        borderRadius: '4px 4px 0 0',
                        minHeight: 8,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" fontSize={10}>{d.mes}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Alerts */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 3, height: '100%' }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
                <WarningAmberIcon sx={{ color: '#F59E0B' }} />
                <Typography variant="subtitle1" fontWeight={700}>Alertas de Calidad</Typography>
              </Stack>
              <Stack gap={1.5}>
                {ALERTS.map((alert, i) => (
                  <Paper
                    key={i}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: alpha(
                        alert.severity === 'CRÍTICA' ? '#EF4444'
                          : alert.severity === 'ALTA' ? '#F59E0B'
                          : alert.severity === 'MEDIA' ? '#3B82F6'
                          : '#059669',
                        0.3
                      ),
                      background: alpha(
                        alert.severity === 'CRÍTICA' ? '#EF4444'
                          : alert.severity === 'ALTA' ? '#F59E0B'
                          : alert.severity === 'MEDIA' ? '#3B82F6'
                          : '#059669',
                        0.05
                      ),
                    }}
                  >
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Chip
                        label={alert.severity}
                        size="small"
                        color={severityColor[alert.severity]}
                        sx={{ fontSize: 9, height: 18, fontWeight: 700 }}
                      />
                      <Typography variant="caption" color="text.primary" fontSize={11}>{alert.text}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Upcoming Audits Table */}
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #E5E7EB' }}>
            <Typography variant="subtitle1" fontWeight={700}>Próximas Auditorías</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', bgcolor: alpha(QMS_COLOR, 0.04) } }}>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {AUDIT_DATA.map(row => (
                  <TableRow key={row.codigo} hover>
                    <TableCell>
                      <Typography variant="caption" fontWeight={700} color={QMS_COLOR}>{row.codigo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.nombre}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.tipo}
                        size="small"
                        sx={{ fontSize: 10, height: 20, fontWeight: 600, color: '#fff', bgcolor: tipoColor[row.tipo] || '#6B7280' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.fecha}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.estado}
                        size="small"
                        sx={{ fontSize: 10, height: 20, fontWeight: 600, color: '#fff', bgcolor: statusColor[row.estado] || '#6B7280' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={{ color: QMS_COLOR }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
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
