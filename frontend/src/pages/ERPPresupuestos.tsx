import React, { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  LinearProgress,
  Divider,
} from '@mui/material'
import {
  Add,
  Assessment,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  PendingActions,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const ERP_COLOR = '#1A3A6B'
const CURRENT_YEAR = new Date().getFullYear()

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoPresupuesto = 'OPERATIVO' | 'FINANCIERO' | 'COMERCIAL' | 'INVERSION' | 'CAPITAL'
type EstadoPresupuesto = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'CERRADO'

interface Presupuesto {
  id: number
  nombre: string
  tipo: TipoPresupuesto
  anio: number
  estado: EstadoPresupuesto
  moneda?: string
  responsable?: string
  descripcion?: string
  monto_presupuestado: number
  monto_ejecutado: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value?: number) =>
  value != null
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(value)
    : '—'

const pctEjecucion = (presupuestado: number, ejecutado: number): number => {
  if (!presupuestado || presupuestado === 0) return 0
  return Math.round((ejecutado / presupuestado) * 100)
}

const ejecucionColor = (pct: number): string => {
  if (pct > 100) return '#EF4444'
  if (pct >= 80) return '#F59E0B'
  return '#22c55e'
}

const TIPOS: TipoPresupuesto[] = ['OPERATIVO', 'FINANCIERO', 'COMERCIAL', 'INVERSION', 'CAPITAL']

const tipoChipColor: Record<TipoPresupuesto, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  OPERATIVO: 'primary',
  FINANCIERO: 'info',
  COMERCIAL: 'success',
  INVERSION: 'warning',
  CAPITAL: 'secondary',
}

const estadoChip = (estado: EstadoPresupuesto) => {
  switch (estado) {
    case 'BORRADOR':    return { label: 'Borrador',     color: '#64748B', bg: '#F1F5F9' }
    case 'EN_REVISION': return { label: 'En revisión',  color: '#2563EB', bg: '#EFF6FF' }
    case 'APROBADO':    return { label: 'Aprobado',     color: '#16A34A', bg: '#F0FDF4' }
    case 'CERRADO':     return { label: 'Cerrado',      color: '#1E293B', bg: '#E2E8F0' }
  }
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  presupuestos: Presupuesto[]
  loading: boolean
}

function SummaryCards({ presupuestos, loading }: SummaryCardsProps) {
  const aprobados = presupuestos.filter((p) => p.estado === 'APROBADO')
  const totalAprobado = aprobados.reduce((s, p) => s + (p.monto_presupuestado ?? 0), 0)
  const totalEjecutado = aprobados.reduce((s, p) => s + (p.monto_ejecutado ?? 0), 0)
  const pct = pctEjecucion(totalAprobado, totalEjecutado)
  const color = ejecucionColor(pct)

  const conteoTipo = TIPOS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = presupuestos.filter((p) => p.tipo === t).length
    return acc
  }, {})

  const cards = [
    {
      label: 'Presupuesto aprobado',
      value: formatCurrency(totalAprobado),
      sub: `${aprobados.length} presupuesto${aprobados.length !== 1 ? 's' : ''} aprobado${aprobados.length !== 1 ? 's' : ''}`,
      icon: <CheckCircle sx={{ fontSize: 22, color: '#16A34A' }} />,
      accent: '#16A34A',
      bg: '#F0FDF4',
    },
    {
      label: 'Ejecutado acumulado',
      value: formatCurrency(totalEjecutado),
      sub: totalAprobado > 0 ? `${pct}% del presupuesto aprobado` : 'Sin presupuesto aprobado',
      icon: totalEjecutado > totalAprobado
        ? <TrendingUp sx={{ fontSize: 22, color: '#EF4444' }} />
        : <TrendingUp sx={{ fontSize: 22, color: '#3B82F6' }} />,
      accent: '#3B82F6',
      bg: '#EFF6FF',
    },
  ]

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {/* Card 1 — Total aprobado */}
      <Grid item xs={12} sm={6} md={3}>
        {loading ? (
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
        ) : (
          <Card sx={{ p: 2.5, borderRadius: 2, bgcolor: cards[0].bg, boxShadow: 'none', border: `1px solid ${alpha(cards[0].accent, 0.2)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                Presupuesto aprobado
              </Typography>
              {cards[0].icon}
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: ERP_COLOR, fontSize: '1.15rem', fontFamily: 'monospace' }}>
              {cards[0].value}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{cards[0].sub}</Typography>
          </Card>
        )}
      </Grid>

      {/* Card 2 — Ejecutado */}
      <Grid item xs={12} sm={6} md={3}>
        {loading ? (
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
        ) : (
          <Card sx={{ p: 2.5, borderRadius: 2, bgcolor: cards[1].bg, boxShadow: 'none', border: `1px solid ${alpha(cards[1].accent, 0.2)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                Ejecutado acumulado
              </Typography>
              {cards[1].icon}
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: ERP_COLOR, fontSize: '1.15rem', fontFamily: 'monospace' }}>
              {cards[1].value}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{cards[1].sub}</Typography>
          </Card>
        )}
      </Grid>

      {/* Card 3 — % Ejecución */}
      <Grid item xs={12} sm={6} md={3}>
        {loading ? (
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
        ) : (
          <Card sx={{ p: 2.5, borderRadius: 2, boxShadow: 'none', border: `1px solid ${alpha(color, 0.25)}`, bgcolor: alpha(color, 0.05) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                % Ejecución global
              </Typography>
              {pct > 100
                ? <TrendingDown sx={{ fontSize: 22, color: '#EF4444' }} />
                : <PendingActions sx={{ fontSize: 22, color: color }} />}
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ color, fontSize: '1.4rem' }}>
              {pct}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(pct, 100)}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 99,
                bgcolor: alpha(color, 0.15),
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
              }}
            />
          </Card>
        )}
      </Grid>

      {/* Card 4 — Conteo por tipo */}
      <Grid item xs={12} sm={6} md={3}>
        {loading ? (
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
        ) : (
          <Card sx={{ p: 2.5, borderRadius: 2, boxShadow: 'none', border: `1px solid ${alpha(ERP_COLOR, 0.12)}` }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, display: 'block', mb: 1.5 }}>
              Presupuestos por tipo
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {TIPOS.filter((t) => (conteoTipo[t] ?? 0) > 0).map((t) => (
                <Chip
                  key={t}
                  label={`${t} · ${conteoTipo[t]}`}
                  size="small"
                  color={tipoChipColor[t]}
                  sx={{ fontSize: 10, fontWeight: 700, height: 20 }}
                />
              ))}
              {TIPOS.every((t) => (conteoTipo[t] ?? 0) === 0) && (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>Sin registros</Typography>
              )}
            </Box>
          </Card>
        )}
      </Grid>
    </Grid>
  )
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

interface NewPresupuestoDialogProps {
  open: boolean
  onClose: () => void
  anioDefault: number
}

function NewPresupuestoDialog({ open, onClose, anioDefault }: NewPresupuestoDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    nombre: '',
    tipo: '' as TipoPresupuesto | '',
    anio: String(anioDefault),
    moneda: 'COP',
    responsable: '',
    descripcion: '',
  })

  const mutation = useMutation({
    mutationFn: (data: object) => apiClient.post('/erp/presupuestos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-presupuestos'] })
      toast.success('Presupuesto creado')
      handleClose()
    },
    onError: () => {
      toast.error('Error al crear el presupuesto')
    },
  })

  const handleClose = () => {
    setForm({ nombre: '', tipo: '', anio: String(anioDefault), moneda: 'COP', responsable: '', descripcion: '' })
    onClose()
  }

  const handleSubmit = () => {
    if (!form.nombre || !form.tipo || !form.anio) {
      toast.error('Complete los campos obligatorios: nombre, tipo y año')
      return
    }
    mutation.mutate({ ...form, anio: Number(form.anio) })
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: ERP_COLOR, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assessment fontSize="small" />
        Nuevo Presupuesto
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Nombre *"
              fullWidth
              size="small"
              placeholder="Ej. Presupuesto Operativo 2026"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select
                label="Tipo *"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPresupuesto })}
              >
                {TIPOS.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Año *"
              fullWidth
              size="small"
              type="number"
              value={form.anio}
              onChange={(e) => setForm({ ...form, anio: e.target.value })}
              inputProps={{ min: 2020, max: 2035 }}
            />
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Moneda</InputLabel>
              <Select
                label="Moneda"
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              >
                <MenuItem value="COP">COP</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Responsable"
              fullWidth
              size="small"
              placeholder="Nombre del responsable"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Descripción"
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="Descripción breve del presupuesto..."
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ERPPresupuestos() {
  const [openNew, setOpenNew] = useState(false)
  const [filtroAnio, setFiltroAnio] = useState(CURRENT_YEAR)
  const [filtroTipo, setFiltroTipo] = useState<TipoPresupuesto | ''>('')
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null)

  const queryClient = useQueryClient()

  const { data: presupuestos = [], isLoading } = useQuery<Presupuesto[]>({
    queryKey: ['erp-presupuestos', filtroAnio],
    queryFn: () =>
      apiClient.get(`/erp/presupuestos?anio=${filtroAnio}`).then((r) => r.data),
  })

  const aprobarMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/erp/presupuestos/${id}/aprobar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-presupuestos'] })
      toast.success('Presupuesto aprobado')
    },
    onError: () => {
      toast.error('Error al aprobar el presupuesto')
    },
  })

  const filtered = filtroTipo
    ? presupuestos.filter((p) => p.tipo === filtroTipo)
    : presupuestos

  const anioOptions = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i)

  return (
    <Layout title="ERP — Presupuestos">
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: ERP_COLOR,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Assessment sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: ERP_COLOR, lineHeight: 1.2 }}>
                Presupuestos y Control Presupuestal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Planificación, seguimiento y aprobación de presupuestos
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenNew(true)}
            sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
          >
            Nuevo Presupuesto
          </Button>
        </Box>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {/* Year selector */}
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Año</InputLabel>
            <Select
              label="Año"
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(Number(e.target.value))}
            >
              {anioOptions.map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem sx={{ height: 32, alignSelf: 'center' }} />

          {/* Tipo filter chips */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mr: 0.5 }}>
              Tipo:
            </Typography>
            <Chip
              label="Todos"
              size="small"
              onClick={() => setFiltroTipo('')}
              sx={{
                fontWeight: 600,
                fontSize: 11,
                cursor: 'pointer',
                bgcolor: filtroTipo === '' ? ERP_COLOR : undefined,
                color: filtroTipo === '' ? '#fff' : undefined,
              }}
            />
            {TIPOS.map((t) => (
              <Chip
                key={t}
                label={t}
                size="small"
                onClick={() => setFiltroTipo(filtroTipo === t ? '' : t)}
                color={filtroTipo === t ? tipoChipColor[t] : 'default'}
                sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                  opacity: filtroTipo !== '' && filtroTipo !== t ? 0.5 : 1,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* ── Summary Cards ────────────────────────────────────────────────── */}
        <SummaryCards presupuestos={presupuestos} loading={isLoading} />

        {/* ── Main Table ───────────────────────────────────────────────────── */}
        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.06) }}>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR, whiteSpace: 'nowrap' }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Año</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="right">Presupuestado</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="right">Ejecutado</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR, minWidth: 160 }}>% Ejecución</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }} align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton variant="text" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                          No hay presupuestos para el período seleccionado
                        </TableCell>
                      </TableRow>
                    )
                  : filtered.map((p) => {
                      const pct = pctEjecucion(p.monto_presupuestado, p.monto_ejecutado)
                      const barColor = ejecucionColor(pct)
                      const estado = estadoChip(p.estado)
                      const canAprobar = p.estado === 'BORRADOR' || p.estado === 'EN_REVISION'
                      return (
                        <TableRow
                          key={p.id}
                          hover
                          onClick={() => setSelectedPresupuesto(p)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: ERP_COLOR }}>
                              {p.nombre}
                            </Typography>
                            {p.responsable && (
                              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                {p.responsable}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={p.tipo}
                              size="small"
                              color={tipoChipColor[p.tipo]}
                              sx={{ fontSize: 11, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600}>{p.anio}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={estado.label}
                              size="small"
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: estado.color,
                                bgcolor: estado.bg,
                                border: `1px solid ${alpha(estado.color, 0.3)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {formatCurrency(p.monto_presupuestado)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {formatCurrency(p.monto_ejecutado)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 160 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(pct, 100)}
                                sx={{
                                  flex: 1,
                                  height: 7,
                                  borderRadius: 99,
                                  bgcolor: alpha(barColor, 0.15),
                                  '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 99 },
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, color: barColor, minWidth: 36, textAlign: 'right' }}
                              >
                                {pct}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            {canAprobar && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CheckCircle fontSize="small" />}
                                disabled={aprobarMutation.isPending}
                                onClick={() => aprobarMutation.mutate(p.id)}
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: '#16A34A',
                                  borderColor: '#16A34A',
                                  '&:hover': { bgcolor: alpha('#16A34A', 0.07), borderColor: '#16A34A' },
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Aprobar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </Box>
        </Card>

        {/* ── Drill-down Detail Dialog ─────────────────────────────────────── */}
        <Dialog
          open={!!selectedPresupuesto}
          onClose={() => setSelectedPresupuesto(null)}
          maxWidth="sm"
          fullWidth
        >
          {selectedPresupuesto && (() => {
            const p = selectedPresupuesto
            const pct = pctEjecucion(p.monto_presupuestado, p.monto_ejecutado)
            const barColor = ejecucionColor(pct)
            const estado = estadoChip(p.estado)
            return (
              <>
                <DialogTitle sx={{ bgcolor: ERP_COLOR, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment fontSize="small" />
                  Detalle del Presupuesto
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: ERP_COLOR, mb: 0.5 }}>
                    {p.nombre}
                  </Typography>
                  {p.descripcion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {p.descripcion}
                    </Typography>
                  )}
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Tipo</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={p.tipo} size="small" color={tipoChipColor[p.tipo]} sx={{ fontSize: 11, fontWeight: 700 }} />
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Estado</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={estado.label} size="small" sx={{ fontSize: 11, fontWeight: 700, color: estado.color, bgcolor: estado.bg, border: `1px solid ${alpha(estado.color, 0.3)}` }} />
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Año</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{p.anio}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Moneda</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{p.moneda ?? 'COP'}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Responsable</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{p.responsable ?? '—'}</Typography>
                    </Grid>
                    <Grid item xs={12}><Divider /></Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Presupuestado</Typography>
                      <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, fontFamily: 'monospace', color: ERP_COLOR }}>
                        {formatCurrency(p.monto_presupuestado)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Ejecutado</Typography>
                      <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, fontFamily: 'monospace', color: barColor }}>
                        {formatCurrency(p.monto_ejecutado)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Ejecución — {pct}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pct, 100)}
                        sx={{
                          mt: 1,
                          height: 10,
                          borderRadius: 99,
                          bgcolor: alpha(barColor, 0.15),
                          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 99 },
                        }}
                      />
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button onClick={() => setSelectedPresupuesto(null)} color="inherit">Cerrar</Button>
                  {(p.estado === 'BORRADOR' || p.estado === 'EN_REVISION') && (
                    <Button
                      variant="contained"
                      startIcon={<CheckCircle />}
                      disabled={aprobarMutation.isPending}
                      onClick={() => {
                        aprobarMutation.mutate(p.id)
                        setSelectedPresupuesto(null)
                      }}
                      sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: alpha('#16A34A', 0.85) } }}
                    >
                      Aprobar presupuesto
                    </Button>
                  )}
                </DialogActions>
              </>
            )
          })()}
        </Dialog>

        {/* ── Create Dialog ────────────────────────────────────────────────── */}
        <NewPresupuestoDialog
          open={openNew}
          onClose={() => setOpenNew(false)}
          anioDefault={filtroAnio}
        />
      </Box>
    </Layout>
  )
}
