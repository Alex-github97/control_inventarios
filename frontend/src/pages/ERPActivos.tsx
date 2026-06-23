import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Select,
  MenuItem, FormControl, InputLabel, alpha, Tabs, Tab,
  LinearProgress,
} from '@mui/material'
import { Add, Inventory2, Build, Schedule } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

type MetodoDepreciacion = 'LINEA_RECTA' | 'SALDO_DECRECIENTE' | 'UNIDADES_PRODUCIDAS' | 'SUM_DIGITOS'
type EstadoActivo = 'ACTIVO' | 'EN_MANTENIMIENTO' | 'DADO_DE_BAJA' | 'EN_TRANSITO'

interface ActivoFijo {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  categoria: string
  costo_adquisicion: number
  valor_residual: number
  valor_libro: number
  depreciacion_acumulada: number
  metodo_depreciacion: MetodoDepreciacion
  vida_util_meses: number
  fecha_adquisicion: string
  estado: EstadoActivo
  activo: boolean
}

interface DepreciacionSchedule {
  mes: number
  fecha: string
  cuota: number
  depreciacion_acumulada: number
  valor_libro: number
}

const ESTADO_CONFIG: Record<EstadoActivo, { bg: string; color: string; label: string }> = {
  ACTIVO: { bg: '#F0FDF4', color: '#16A34A', label: 'Activo' },
  EN_MANTENIMIENTO: { bg: '#FFF7ED', color: '#C2410C', label: 'En Mantenimiento' },
  DADO_DE_BAJA: { bg: '#F8FAFC', color: '#64748B', label: 'Dado de Baja' },
  EN_TRANSITO: { bg: '#EFF6FF', color: '#1D4ED8', label: 'En Tránsito' },
}

const METODO_LABELS: Record<MetodoDepreciacion, string> = {
  LINEA_RECTA: 'Línea Recta',
  SALDO_DECRECIENTE: 'Saldo Decreciente',
  UNIDADES_PRODUCIDAS: 'Unidades Producidas',
  SUM_DIGITOS: 'Suma de Dígitos',
}

const EMPTY_ACTIVO = {
  codigo: '', nombre: '', descripcion: '', categoria: '',
  costo_adquisicion: '', valor_residual: '', vida_util_meses: '60',
  metodo_depreciacion: 'LINEA_RECTA' as MetodoDepreciacion,
  fecha_adquisicion: new Date().toISOString().slice(0, 10),
}

export default function ERPActivos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [openNew, setOpenNew] = useState(false)
  const [selectedActivo, setSelectedActivo] = useState<ActivoFijo | null>(null)
  const [form, setForm] = useState({ ...EMPTY_ACTIVO })

  const { data: activos = [], isLoading } = useQuery<ActivoFijo[]>({
    queryKey: ['erp-activos'],
    queryFn: () => apiClient.get('/erp/activos').then(r => r.data),
  })

  const { data: schedule = [], isLoading: loadingSchedule } = useQuery<DepreciacionSchedule[]>({
    queryKey: ['erp-activo-schedule', selectedActivo?.id],
    queryFn: () => apiClient.get(`/erp/activos/${selectedActivo!.id}/schedule`).then(r => r.data),
    enabled: !!selectedActivo,
  })

  const createActivo = useMutation({
    mutationFn: (data: typeof EMPTY_ACTIVO) => apiClient.post('/erp/activos', {
      ...data,
      costo_adquisicion: parseFloat(String(data.costo_adquisicion)),
      valor_residual: parseFloat(String(data.valor_residual)),
      vida_util_meses: parseInt(String(data.vida_util_meses)),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Activo registrado')
      qc.invalidateQueries({ queryKey: ['erp-activos'] })
      setOpenNew(false)
      setForm({ ...EMPTY_ACTIVO })
    },
    onError: () => toast.error('Error al registrar activo'),
  })

  const depreciarActivo = useMutation({
    mutationFn: (id: number) => apiClient.post(`/erp/activos/${id}/depreciar`).then(r => r.data),
    onSuccess: () => {
      toast.success('Depreciación aplicada')
      qc.invalidateQueries({ queryKey: ['erp-activos'] })
    },
    onError: () => toast.error('Error al aplicar depreciación'),
  })

  const totalCosto = activos.reduce((a, x) => a + x.costo_adquisicion, 0)
  const totalValorLibro = activos.reduce((a, x) => a + x.valor_libro, 0)
  const totalDepreciado = activos.reduce((a, x) => a + x.depreciacion_acumulada, 0)
  const isFormValid = form.codigo && form.nombre && form.categoria && form.costo_adquisicion

  return (
    <Layout title="ERP — Activos Fijos">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Inventory2 sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Gestión de Activos Fijos</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>ERP · Registro, depreciación y control de activos</Typography>
          </Box>
          <Chip label="ACTIVOS" size="small" sx={{ ml: 'auto', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: 11, height: 24, letterSpacing: '0.05em' }} />
        </Box>
      </Box>

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Costo Total', value: formatCurrency(totalCosto), color: ERP_COLOR },
          { label: 'Valor en Libros', value: formatCurrency(totalValorLibro), color: '#16A34A' },
          { label: 'Depreciación Acum.', value: formatCurrency(totalDepreciado), color: '#DC2626' },
          { label: 'Activos Registrados', value: String(activos.length), color: '#7C3AED' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.label}>
            <Card sx={{ p: 2, borderRadius: '14px', border: `1px solid ${alpha(kpi.color, 0.15)}`, background: `linear-gradient(135deg, ${alpha(kpi.color, 0.04)} 0%, #fff 100%)` }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 0.5 }}>{kpi.label}</Typography>
              {isLoading ? <Skeleton width={80} height={28} /> : (
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</Typography>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1, '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', color: '#64748B', minHeight: 44, px: 2 }, '& .Mui-selected': { color: ERP_COLOR }, '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 } }}>
            <Tab label="Registro de Activos" />
            <Tab label="Programación Depreciación" />
          </Tabs>
          {tab === 0 && (
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenNew(true)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' }, height: 34, px: 2, fontSize: '0.8rem' }}>
              Nuevo Activo
            </Button>
          )}
        </Box>

        {/* Tab 0: Asset list */}
        {tab === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="right">Costo</TableCell>
                  <TableCell align="right">Valor Libro</TableCell>
                  <TableCell>Depreciación</TableCell>
                  <TableCell align="right">% Deprec.</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 10 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : activos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <Inventory2 sx={{ fontSize: 40, color: '#CBD5E1', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>No hay activos registrados</Typography>
                    </TableCell>
                  </TableRow>
                ) : activos.map(activo => {
                  const pct = activo.costo_adquisicion > 0
                    ? (activo.depreciacion_acumulada / activo.costo_adquisicion) * 100 : 0
                  const estado = ESTADO_CONFIG[activo.estado] ?? ESTADO_CONFIG.ACTIVO
                  return (
                    <TableRow key={activo.id}>
                      <TableCell><Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: ERP_COLOR, fontFamily: 'monospace' }}>{activo.codigo}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{activo.nombre}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>{activo.categoria}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{formatCurrency(activo.costo_adquisicion)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>{formatCurrency(activo.valor_libro)}</Typography></TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: pct >= 90 ? '#DC2626' : pct >= 60 ? '#F59E0B' : ERP_COLOR } }} />
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: pct >= 90 ? '#DC2626' : '#64748B' }}>{pct.toFixed(1)}%</Typography></TableCell>
                      <TableCell><Chip label={estado.label} size="small" sx={{ bgcolor: estado.bg, color: estado.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>{METODO_LABELS[activo.metodo_depreciacion]}</Typography></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Button size="small" variant="outlined" startIcon={<Schedule sx={{ fontSize: 12 }} />} onClick={() => { setSelectedActivo(activo); setTab(1) }} sx={{ fontSize: '0.72rem', height: 26, px: 1, borderColor: alpha(ERP_COLOR, 0.3), color: ERP_COLOR }}>
                            Tabla
                          </Button>
                          <Button size="small" variant="contained" startIcon={<Build sx={{ fontSize: 12 }} />} disabled={depreciarActivo.isPending} onClick={() => depreciarActivo.mutate(activo.id)} sx={{ fontSize: '0.72rem', height: 26, px: 1, bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' } }}>
                            Depreciar
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 1: Depreciation schedule */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            {!selectedActivo ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Schedule sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                <Typography sx={{ color: '#94A3B8' }}>Selecciona un activo de la tabla Registro para ver su tabla de depreciación</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, borderRadius: '12px', bgcolor: alpha(ERP_COLOR, 0.04), border: `1px solid ${alpha(ERP_COLOR, 0.1)}` }}>
                  <Inventory2 sx={{ color: ERP_COLOR, fontSize: 20 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>{selectedActivo.nombre}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>{selectedActivo.codigo} · {METODO_LABELS[selectedActivo.metodo_depreciacion]} · Vida útil: {selectedActivo.vida_util_meses} meses</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => setSelectedActivo(null)} sx={{ ml: 'auto', fontSize: '0.75rem', borderColor: '#E2E8F0', color: '#64748B' }}>
                    Cambiar activo
                  </Button>
                </Box>
                <Box sx={{ overflowX: 'auto', maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Mes</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell align="right">Cuota Depreciación</TableCell>
                        <TableCell align="right">Depreciación Acum.</TableCell>
                        <TableCell align="right">Valor en Libros</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingSchedule ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                      )) : schedule.map(row => (
                        <TableRow key={row.mes}>
                          <TableCell><Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.mes}</Typography></TableCell>
                          <TableCell sx={{ color: '#64748B', fontSize: '0.8rem' }}>{row.fecha}</TableCell>
                          <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', color: '#DC2626', fontFamily: 'monospace' }}>{formatCurrency(row.cuota)}</Typography></TableCell>
                          <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{formatCurrency(row.depreciacion_acumulada)}</Typography></TableCell>
                          <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>{formatCurrency(row.valor_libro)}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}
          </Box>
        )}
      </Card>

      {/* New asset dialog */}
      <Dialog open={openNew} onClose={() => { setOpenNew(false); setForm({ ...EMPTY_ACTIVO }) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', pb: 1, borderBottom: '1px solid #F1F5F9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Inventory2 sx={{ fontSize: 15 }} /></Box>
            Nuevo Activo Fijo
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Código *', key: 'codigo', placeholder: 'AF-001' },
              { label: 'Nombre *', key: 'nombre', placeholder: 'Computador portátil' },
              { label: 'Categoría *', key: 'categoria', placeholder: 'Equipos de cómputo' },
              { label: 'Costo Adquisición *', key: 'costo_adquisicion', placeholder: '5000000', type: 'number' },
              { label: 'Valor Residual', key: 'valor_residual', placeholder: '500000', type: 'number' },
              { label: 'Vida Útil (meses)', key: 'vida_util_meses', placeholder: '60', type: 'number' },
              { label: 'Fecha Adquisición', key: 'fecha_adquisicion', type: 'date' },
            ].map(f => (
              <Grid item xs={12} sm={6} key={f.key}>
                <TextField label={f.label} fullWidth size="small" type={f.type ?? 'text'} value={(form as Record<string, string>)[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Método Depreciación</InputLabel>
                <Select value={form.metodo_depreciacion} label="Método Depreciación" onChange={e => setForm(prev => ({ ...prev, metodo_depreciacion: e.target.value as MetodoDepreciacion }))}>
                  {Object.entries(METODO_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripción" fullWidth size="small" multiline rows={2} value={form.descripcion} onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setOpenNew(false); setForm({ ...EMPTY_ACTIVO }) }} variant="outlined" size="small">Cancelar</Button>
          <Button variant="contained" size="small" disabled={!isFormValid || createActivo.isPending} onClick={() => createActivo.mutate(form as typeof EMPTY_ACTIVO)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' } }}>
            {createActivo.isPending ? 'Registrando...' : 'Registrar activo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
