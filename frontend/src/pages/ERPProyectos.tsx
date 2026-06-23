import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Select,
  MenuItem, FormControl, InputLabel, alpha, Tabs, Tab,
  LinearProgress,
} from '@mui/material'
import { Add, Work, TrendingUp, TrendingDown } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '0.0%'
  return `${v.toFixed(1)}%`
}

type EstadoProyecto = 'PLANIFICACION' | 'EN_EJECUCION' | 'EN_PAUSA' | 'COMPLETADO' | 'CANCELADO'

interface Proyecto {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  cliente_nombre?: string
  fecha_inicio: string
  fecha_fin: string
  presupuesto: number
  costo_ejecutado: number
  ingresos: number
  estado: EstadoProyecto
}

interface RentabilidadProyecto {
  proyecto_id: number
  nombre: string
  ingresos: number
  costos: number
  margen_bruto: number
  margen_pct: number
  roi: number
}

const ESTADO_CONFIG: Record<EstadoProyecto, { bg: string; color: string; label: string }> = {
  PLANIFICACION: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Planificación' },
  EN_EJECUCION: { bg: '#F0FDF4', color: '#16A34A', label: 'En Ejecución' },
  EN_PAUSA: { bg: '#FFF7ED', color: '#C2410C', label: 'En Pausa' },
  COMPLETADO: { bg: '#F8FAFC', color: '#64748B', label: 'Completado' },
  CANCELADO: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelado' },
}

const EMPTY_PROYECTO = {
  codigo: '', nombre: '', descripcion: '', cliente_nombre: '',
  presupuesto: '', fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: '', estado: 'PLANIFICACION' as EstadoProyecto,
}

export default function ERPProyectos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [openNew, setOpenNew] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_PROYECTO })

  const { data: proyectos = [], isLoading } = useQuery<Proyecto[]>({
    queryKey: ['erp-proyectos'],
    queryFn: () => apiClient.get('/erp/proyectos').then(r => r.data),
  })

  const { data: rentabilidades = [], isLoading: loadingRent } = useQuery<RentabilidadProyecto[]>({
    queryKey: ['erp-proyectos-rentabilidad'],
    queryFn: () => apiClient.get('/erp/proyectos/rentabilidad').then(r => r.data),
  })

  const createProyecto = useMutation({
    mutationFn: (data: typeof EMPTY_PROYECTO) => apiClient.post('/erp/proyectos', {
      ...data, presupuesto: parseFloat(String(data.presupuesto)),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Proyecto creado')
      qc.invalidateQueries({ queryKey: ['erp-proyectos'] })
      setOpenNew(false); setForm({ ...EMPTY_PROYECTO })
    },
    onError: () => toast.error('Error al crear proyecto'),
  })

  const totalPresupuesto = proyectos.reduce((a, p) => a + p.presupuesto, 0)
  const totalEjecutado = proyectos.reduce((a, p) => a + p.costo_ejecutado, 0)
  const totalIngresos = proyectos.reduce((a, p) => a + p.ingresos, 0)
  const enEjecucion = proyectos.filter(p => p.estado === 'EN_EJECUCION').length

  return (
    <Layout title="ERP — Proyectos Financieros">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Work sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Proyectos Financieros</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>ERP · Portafolio de proyectos y análisis de rentabilidad</Typography>
          </Box>
          <Chip label="PROYECTOS" size="small" sx={{ ml: 'auto', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: 11, height: 24, letterSpacing: '0.05em' }} />
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Presupuesto Total', value: formatCurrency(totalPresupuesto), color: ERP_COLOR },
          { label: 'Costo Ejecutado', value: formatCurrency(totalEjecutado), color: '#DC2626' },
          { label: 'Ingresos Generados', value: formatCurrency(totalIngresos), color: '#16A34A' },
          { label: 'En Ejecución', value: String(enEjecucion), color: '#7C3AED' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.label}>
            <Card sx={{ p: 2, borderRadius: '14px', border: `1px solid ${alpha(kpi.color, 0.15)}`, background: `linear-gradient(135deg, ${alpha(kpi.color, 0.04)} 0%, #fff 100%)` }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 0.5 }}>{kpi.label}</Typography>
              {isLoading ? <Skeleton width={80} height={28} /> : <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</Typography>}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1, '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', color: '#64748B', minHeight: 44, px: 2 }, '& .Mui-selected': { color: ERP_COLOR }, '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 } }}>
            <Tab label="Portafolio de Proyectos" />
            <Tab label="Análisis de Rentabilidad" />
          </Tabs>
          {tab === 0 && (
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenNew(true)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' }, height: 34, px: 2, fontSize: '0.8rem' }}>
              Nuevo Proyecto
            </Button>
          )}
        </Box>

        {tab === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell align="right">Presupuesto</TableCell>
                  <TableCell align="right">Ejecutado</TableCell>
                  <TableCell>Avance</TableCell>
                  <TableCell align="right">Ingresos</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : proyectos.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Work sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography sx={{ color: '#94A3B8' }}>No hay proyectos registrados</Typography>
                  </TableCell></TableRow>
                ) : proyectos.map(p => {
                  const avance = p.presupuesto > 0 ? (p.costo_ejecutado / p.presupuesto) * 100 : 0
                  const cfg = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.PLANIFICACION
                  return (
                    <TableRow key={p.id}>
                      <TableCell><Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: ERP_COLOR, fontFamily: 'monospace' }}>{p.codigo}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.nombre}</Typography></TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{p.cliente_nombre ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-CO') : '—'} →{' '}
                        {p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString('es-CO') : '—'}
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{formatCurrency(p.presupuesto)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: avance > 100 ? '#DC2626' : 'inherit' }}>{formatCurrency(p.costo_ejecutado)}</Typography></TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={Math.min(avance, 100)} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: avance > 100 ? '#DC2626' : avance > 80 ? '#F59E0B' : '#16A34A' } }} />
                          <Typography sx={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748B', minWidth: 36 }}>{avance.toFixed(0)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: '#16A34A' }}>{formatCurrency(p.ingresos)}</Typography></TableCell>
                      <TableCell><Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Proyecto</TableCell>
                  <TableCell align="right">Ingresos</TableCell>
                  <TableCell align="right">Costos</TableCell>
                  <TableCell align="right">Margen Bruto</TableCell>
                  <TableCell align="right">Margen %</TableCell>
                  <TableCell align="right">ROI</TableCell>
                  <TableCell>Indicador</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRent ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : rentabilidades.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay datos de rentabilidad</Typography></TableCell></TableRow>
                ) : rentabilidades.map(r => (
                  <TableRow key={r.proyecto_id}>
                    <TableCell><Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{r.nombre}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#16A34A' }}>{formatCurrency(r.ingresos)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#DC2626' }}>{formatCurrency(r.costos)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: r.margen_bruto >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(r.margen_bruto)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: r.margen_pct >= 0 ? '#16A34A' : '#DC2626' }}>{fmtPct(r.margen_pct)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: r.roi >= 0 ? '#16A34A' : '#DC2626' }}>{fmtPct(r.roi)}</Typography></TableCell>
                    <TableCell>{r.margen_bruto >= 0 ? <TrendingUp sx={{ color: '#16A34A', fontSize: 18 }} /> : <TrendingDown sx={{ color: '#DC2626', fontSize: 18 }} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <Dialog open={openNew} onClose={() => { setOpenNew(false); setForm({ ...EMPTY_PROYECTO }) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', pb: 1, borderBottom: '1px solid #F1F5F9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Work sx={{ fontSize: 15 }} /></Box>
            Nuevo Proyecto Financiero
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Código *', key: 'codigo', placeholder: 'PROY-001' },
              { label: 'Nombre *', key: 'nombre', placeholder: 'Nombre del proyecto' },
              { label: 'Cliente', key: 'cliente_nombre', placeholder: 'Nombre del cliente' },
              { label: 'Presupuesto *', key: 'presupuesto', type: 'number', placeholder: '0' },
              { label: 'Fecha Inicio', key: 'fecha_inicio', type: 'date' },
              { label: 'Fecha Fin', key: 'fecha_fin', type: 'date' },
            ].map(f => (
              <Grid item xs={12} sm={6} key={f.key}>
                <TextField label={f.label} fullWidth size="small" type={f.type ?? 'text'} value={(form as Record<string, string>)[f.key]} placeholder={f.placeholder} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select value={form.estado} label="Estado" onChange={e => setForm(p => ({ ...p, estado: e.target.value as EstadoProyecto }))}>
                  {Object.entries(ESTADO_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripción" fullWidth size="small" multiline rows={2} value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setOpenNew(false); setForm({ ...EMPTY_PROYECTO }) }} variant="outlined" size="small">Cancelar</Button>
          <Button variant="contained" size="small" disabled={!form.codigo || !form.nombre || createProyecto.isPending} onClick={() => createProyecto.mutate(form as typeof EMPTY_PROYECTO)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' } }}>
            {createProyecto.isPending ? 'Creando...' : 'Crear Proyecto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
