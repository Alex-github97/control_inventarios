import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Grid, TextField, Select,
  MenuItem, FormControl, InputLabel, alpha, Tabs, Tab,
  LinearProgress,
} from '@mui/material'
import { AutoGraph, TrendingUp, Assessment, PlayArrow } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

interface PlanFinanciero {
  id: number
  nombre: string
  tipo: string
  periodo: string
  version: string
  estado: string
  presupuesto_ingresos: number
  presupuesto_gastos: number
  utilidad_proyectada: number
}

interface ForecastItem {
  mes: string
  ingresos_real: number
  ingresos_forecast: number
  gastos_real: number
  gastos_forecast: number
  variacion_pct: number
}

interface Escenario {
  id: number
  nombre: string
  descripcion: string
  supuesto_crecimiento: number
  ingresos_proyectados: number
  utilidad_proyectada: number
  ebitda_pct: number
}

export default function ERPEPM() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [escenarioBase, setEscenarioBase] = useState('5')
  const [escenarioOptimista, setEscenarioOptimista] = useState('15')
  const [escenarioPesimista, setEscenarioPesimista] = useState('-5')

  const { data: planes = [], isLoading: loadingPlanes } = useQuery<PlanFinanciero[]>({
    queryKey: ['erp-epm-planes'],
    queryFn: () => apiClient.get('/erp/epm/planes').then(r => r.data),
  })

  const { data: forecast = [], isLoading: loadingForecast } = useQuery<ForecastItem[]>({
    queryKey: ['erp-epm-forecast'],
    queryFn: () => apiClient.get('/erp/epm/forecast').then(r => r.data),
  })

  const { data: escenarios = [], isLoading: loadingEscenarios } = useQuery<Escenario[]>({
    queryKey: ['erp-epm-escenarios'],
    queryFn: () => apiClient.get('/erp/epm/escenarios').then(r => r.data),
  })

  const simularEscenarios = useMutation({
    mutationFn: () => apiClient.post('/erp/epm/simular', {
      crecimientos: [
        { nombre: 'Base', pct: parseFloat(escenarioBase) },
        { nombre: 'Optimista', pct: parseFloat(escenarioOptimista) },
        { nombre: 'Pesimista', pct: parseFloat(escenarioPesimista) },
      ],
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Simulación ejecutada')
      qc.invalidateQueries({ queryKey: ['erp-epm-escenarios'] })
    },
    onError: () => toast.error('Error al simular escenarios'),
  })

  const totalPlaneado = planes.reduce((a, p) => a + p.presupuesto_ingresos, 0)
  const totalUtilidad = planes.reduce((a, p) => a + p.utilidad_proyectada, 0)

  return (
    <Layout title="ERP — EPM Planeación">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AutoGraph sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>EPM — Enterprise Performance Management</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>ERP · Planeación financiera, forecast y simulación de escenarios</Typography>
          </Box>
          <Chip label="EPM" size="small" sx={{ ml: 'auto', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: 11, height: 24, letterSpacing: '0.05em' }} />
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Ingresos Planeados', value: formatCurrency(totalPlaneado), color: ERP_COLOR },
          { label: 'Utilidad Proyectada', value: formatCurrency(totalUtilidad), color: '#16A34A' },
          { label: 'Planes Activos', value: String(planes.filter(p => p.estado === 'ACTIVO').length), color: '#7C3AED' },
          { label: 'Escenarios', value: String(escenarios.length), color: '#F59E0B' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.label}>
            <Card sx={{ p: 2, borderRadius: '14px', border: `1px solid ${alpha(kpi.color, 0.15)}`, background: `linear-gradient(135deg, ${alpha(kpi.color, 0.04)} 0%, #fff 100%)` }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 0.5 }}>{kpi.label}</Typography>
              {loadingPlanes ? <Skeleton width={80} height={28} /> : <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</Typography>}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid #F1F5F9', px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', color: '#64748B', minHeight: 44, px: 2 }, '& .Mui-selected': { color: ERP_COLOR }, '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 } }}>
            <Tab label="Planeación Financiera" />
            <Tab label="Forecast Rolling" />
            <Tab label="Simulación de Escenarios" />
          </Tabs>
        </Box>

        {/* Tab 0: Financial plans */}
        {tab === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Plan</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell align="right">Ingresos</TableCell>
                  <TableCell align="right">Gastos</TableCell>
                  <TableCell align="right">Utilidad</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingPlanes ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : planes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Assessment sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography sx={{ color: '#94A3B8' }}>No hay planes financieros registrados</Typography>
                  </TableCell></TableRow>
                ) : planes.map(p => (
                  <TableRow key={p.id}>
                    <TableCell><Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{p.nombre}</Typography></TableCell>
                    <TableCell><Chip label={p.tipo} size="small" sx={{ bgcolor: alpha(ERP_COLOR, 0.08), color: ERP_COLOR, fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{p.periodo}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{p.version}</TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#16A34A' }}>{formatCurrency(p.presupuesto_ingresos)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#DC2626' }}>{formatCurrency(p.presupuesto_gastos)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: p.utilidad_proyectada >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(p.utilidad_proyectada)}</Typography></TableCell>
                    <TableCell><Chip label={p.estado} size="small" sx={{ bgcolor: p.estado === 'ACTIVO' ? '#F0FDF4' : '#F8FAFC', color: p.estado === 'ACTIVO' ? '#16A34A' : '#64748B', fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 1: Rolling forecast */}
        {tab === 1 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mes</TableCell>
                  <TableCell align="right">Ingresos Real</TableCell>
                  <TableCell align="right">Ingresos Forecast</TableCell>
                  <TableCell align="right">Gastos Real</TableCell>
                  <TableCell align="right">Gastos Forecast</TableCell>
                  <TableCell align="right">Variación %</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Precisión</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingForecast ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : forecast.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay datos de forecast</Typography></TableCell></TableRow>
                ) : forecast.map(f => {
                  const precision = Math.max(0, 100 - Math.abs(f.variacion_pct))
                  return (
                    <TableRow key={f.mes}>
                      <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.mes}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#16A34A' }}>{formatCurrency(f.ingresos_real)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748B' }}>{formatCurrency(f.ingresos_forecast)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#DC2626' }}>{formatCurrency(f.gastos_real)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748B' }}>{formatCurrency(f.gastos_forecast)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: Math.abs(f.variacion_pct) < 5 ? '#16A34A' : Math.abs(f.variacion_pct) < 15 ? '#F59E0B' : '#DC2626' }}>{f.variacion_pct > 0 ? '+' : ''}{f.variacion_pct.toFixed(1)}%</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={precision} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: precision >= 90 ? '#16A34A' : precision >= 75 ? '#F59E0B' : '#DC2626' } }} />
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', minWidth: 32 }}>{precision.toFixed(0)}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 2: Scenario simulation */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ p: 2.5, borderRadius: '14px', border: `1px solid ${alpha(ERP_COLOR, 0.12)}`, bgcolor: alpha(ERP_COLOR, 0.03), mb: 3 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', mb: 2 }}>Parámetros de Simulación — Supuestos de Crecimiento</Typography>
              <Grid container spacing={2} alignItems="flex-end">
                {[
                  { label: 'Escenario Base (%)', value: escenarioBase, setter: setEscenarioBase, color: ERP_COLOR },
                  { label: 'Escenario Optimista (%)', value: escenarioOptimista, setter: setEscenarioOptimista, color: '#16A34A' },
                  { label: 'Escenario Pesimista (%)', value: escenarioPesimista, setter: setEscenarioPesimista, color: '#DC2626' },
                ].map(sc => (
                  <Grid item xs={12} sm={3} key={sc.label}>
                    <TextField label={sc.label} fullWidth size="small" type="number" value={sc.value} onChange={e => sc.setter(e.target.value)} inputProps={{ step: 0.5 }} InputProps={{ endAdornment: <Typography sx={{ color: '#94A3B8', fontSize: 14, mr: 0.5 }}>%</Typography> }} sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: sc.color } }, '& label.Mui-focused': { color: sc.color } }} />
                  </Grid>
                ))}
                <Grid item xs={12} sm={3}>
                  <Button variant="contained" fullWidth startIcon={<PlayArrow />} disabled={simularEscenarios.isPending} onClick={() => simularEscenarios.mutate()} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' }, height: 40 }}>
                    {simularEscenarios.isPending ? 'Simulando...' : 'Ejecutar Simulación'}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Escenario</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Supuesto Crec.</TableCell>
                    <TableCell align="right">Ingresos Proy.</TableCell>
                    <TableCell align="right">Utilidad Proy.</TableCell>
                    <TableCell align="right">EBITDA %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingEscenarios ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                  )) : escenarios.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <TrendingUp sx={{ fontSize: 36, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>Ejecuta la simulación para ver los escenarios proyectados</Typography>
                    </TableCell></TableRow>
                  ) : escenarios.map(esc => (
                    <TableRow key={esc.id}>
                      <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{esc.nombre}</Typography></TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{esc.descripcion}</TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: esc.supuesto_crecimiento >= 0 ? '#16A34A' : '#DC2626' }}>{esc.supuesto_crecimiento > 0 ? '+' : ''}{esc.supuesto_crecimiento.toFixed(1)}%</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#16A34A' }}>{formatCurrency(esc.ingresos_proyectados)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: esc.utilidad_proyectada >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(esc.utilidad_proyectada)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: esc.ebitda_pct >= 10 ? '#16A34A' : esc.ebitda_pct >= 5 ? '#F59E0B' : '#DC2626' }}>{esc.ebitda_pct.toFixed(1)}%</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Card>
    </Layout>
  )
}
