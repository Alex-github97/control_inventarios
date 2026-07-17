// QMS Module - Torre de Control de Calidad
import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, LinearProgress,
  List, ListItem, ListItemText, Button, alpha, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  WorkspacePremium, Refresh, Warning, CheckCircle, Error,
  TrendingUp, TrendingDown, FactCheck, BugReport, Dangerous,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'
const QMS_DARK  = '#047857'

const ISO_STANDARDS = [
  { name: 'ISO 9001:2015',  pct: 94, label: 'Gestión de Calidad' },
  { name: 'ISO 28000:2022', pct: 88, label: 'Seguridad Cadena Suministro' },
  { name: 'ISO 45001:2018', pct: 91, label: 'Seguridad y Salud' },
  { name: 'ISO 14001:2015', pct: 85, label: 'Gestión Ambiental' },
  { name: 'ISO 27001:2022', pct: 79, label: 'Seguridad de Información' },
  { name: 'ISO 31000:2018', pct: 87, label: 'Gestión de Riesgos' },
]

const NC_TREND = [
  { mes: 'Ene', nc: 4 }, { mes: 'Feb', nc: 7 }, { mes: 'Mar', nc: 3 },
  { mes: 'Abr', nc: 9 }, { mes: 'May', nc: 5 }, { mes: 'Jun', nc: 7 },
]

const ALERTAS = [
  { nivel: 'CRÍTICA', color: '#DC2626', texto: 'CAPA #CAPA-024 vence mañana' },
  { nivel: 'ALTA',    color: '#EA580C', texto: '3 NC mayores sin CAPA asignada' },
  { nivel: 'MEDIA',   color: '#D97706', texto: 'Auditoría ISO 9001 programada en 5 días' },
  { nivel: 'BAJA',    color: '#059669', texto: '2 indicadores por debajo de meta' },
]

const AUDITORIAS = [
  { codigo: 'AUD-001', nombre: 'Auditoría Interna ISO 9001', tipo: 'INTERNA', fecha: '2026-07-15', estado: 'PLANIFICADA' },
  { codigo: 'AUD-002', nombre: 'Seguimiento ISO 28000',      tipo: 'EXTERNA', fecha: '2026-08-01', estado: 'PLANIFICADA' },
  { codigo: 'AUD-003', nombre: 'Auditoría Cliente XYZ',      tipo: 'CLIENTE', fecha: '2026-06-10', estado: 'COMPLETADA' },
]

interface KPICardProps { label: string; value: string; color?: string; icon?: React.ReactNode; trend?: number }
function KPICard({ label, value, color = QMS_COLOR, icon, trend }: KPICardProps) {
  return (
    <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
            <Typography className="text-gradient" sx={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                {trend >= 0 ? <TrendingUp sx={{ fontSize: 13, color: '#059669' }} /> : <TrendingDown sx={{ fontSize: 13, color: '#DC2626' }} />}
                <Typography sx={{ fontSize: 11, color: trend >= 0 ? '#059669' : '#DC2626' }}>{Math.abs(trend)}% vs mes ant.</Typography>
              </Box>
            )}
          </Box>
          {icon && <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>}
        </Box>
      </CardContent>
    </Card>
  )
}

export default function QMSDashboard() {
  const [updating, setUpdating] = useState(false)
  const maxNC = Math.max(...NC_TREND.map(d => d.nc))

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkspacePremium sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Torre de Control de Calidad</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · Indicadores en tiempo real</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Refresh />} size="small" onClick={() => setUpdating(true)} sx={{ color: QMS_COLOR, borderColor: alpha(QMS_COLOR, 0.4), border: 1, borderRadius: 2 }}>
            Actualizar
          </Button>
        </Box>

        {/* KPIs Row 1 */}
        <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Índice de Calidad" value="94.2%" color={QMS_COLOR} icon={<CheckCircle />} trend={1.3} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="NC Abiertas" value="7" color="#DC2626" icon={<BugReport />} trend={-5} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Auditorías Pendientes" value="3" color="#D97706" icon={<FactCheck />} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="CAPA Activas" value="12" color="#0369A1" trend={2} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Hallazgos Abiertos" value="18" color="#EA580C" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Riesgos Críticos" value="2" color="#DC2626" icon={<Dangerous />} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Quejas Abiertas" value="5" color="#D97706" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="NPS Score" value="78" color={QMS_COLOR} trend={3} /></Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* ISO Compliance */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Cumplimiento ISO</Typography>
                {ISO_STANDARDS.map(s => (
                  <Box key={s.name} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>{s.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: s.pct >= 90 ? QMS_COLOR : s.pct >= 80 ? '#D97706' : '#DC2626', fontWeight: 700 }}>{s.pct}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={s.pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0',
                        '& .MuiLinearProgress-bar': { bgcolor: s.pct >= 90 ? QMS_COLOR : s.pct >= 80 ? '#D97706' : '#DC2626', borderRadius: 3 } }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* NC Trend */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Tendencia NC · Últimos 6 meses</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 100, px: 1 }}>
                  {NC_TREND.map(d => (
                    <Box key={d.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>{d.nc}</Typography>
                      <Box sx={{ width: '100%', height: `${(d.nc / maxNC) * 80}px`, bgcolor: alpha('#DC2626', 0.7), borderRadius: '4px 4px 0 0' }} />
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{d.mes}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Alertas */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>Alertas de Calidad</Typography>
                <List dense disablePadding>
                  {ALERTAS.map((a, i) => (
                    <ListItem key={i} disablePadding sx={{ mb: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                        <Chip label={a.nivel} size="small" sx={{ bgcolor: alpha(a.color, 0.15), color: a.color, fontSize: 9, fontWeight: 700, height: 18 }} />
                      </Box>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25, pl: 0.5 }}>{a.texto}</Typography>
                      {i < ALERTAS.length - 1 && <Divider sx={{ mt: 1, width: '100%', borderColor: '#F1F5F9' }} />}
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Próximas Auditorías */}
        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Próximas Auditorías</Typography>
            <Paper sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#F1F5F9', color: 'text.disabled', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } }}>
                    <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>Fecha</TableCell><TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {AUDITORIAS.map(a => (
                    <TableRow key={a.codigo} sx={{ '& td': { borderColor: '#F9FAFB', color: 'text.secondary', fontSize: 12.5 } }}>
                      <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: QMS_COLOR }}>{a.codigo}</Typography></TableCell>
                      <TableCell>{a.nombre}</TableCell>
                      <TableCell><Chip label={a.tipo} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                      <TableCell>{a.fecha}</TableCell>
                      <TableCell>
                        <Chip label={a.estado} size="small" sx={{
                          fontSize: 10, height: 20, fontWeight: 700,
                          bgcolor: a.estado === 'COMPLETADA' ? alpha(QMS_COLOR, 0.15) : alpha('#D97706', 0.15),
                          color: a.estado === 'COMPLETADA' ? QMS_COLOR : '#D97706',
                        }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}
