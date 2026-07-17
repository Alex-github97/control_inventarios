import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Card, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, InputAdornment, Divider, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add as AddIcon, Speed as SpeedIcon, Download } from '@mui/icons-material'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

// Colores de cada factor (fijos por entidad, con codificación secundaria en la gráfica)
const COLOR_DISP = '#2563EB'
const COLOR_REND = '#D97706'
const COLOR_CAL = '#16A34A'

const TURNOS = ['MANANA', 'TARDE', 'NOCHE', 'FLEXIBLE'] as const
const TURNO_LABEL: Record<string, string> = {
  MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche', FLEXIBLE: 'Flexible',
}

/** Color por umbral estándar OEE: ≥85 clase mundial, ≥60 aceptable, <60 crítico */
const umbral = (v?: number | null) =>
  v == null ? '#94A3B8' : v >= 85 ? '#16A34A' : v >= 60 ? '#D97706' : '#DC2626'

const pct = (v?: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`)
const num = (v?: number | null) => (v == null ? '—' : v.toLocaleString('es-CO'))

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface RegistroOEE {
  id: number
  linea_id: number
  turno: string
  fecha?: string | null
  equipo_id?: number | null
  tiempo_planificado_min?: number | null
  tiempo_paradas_min?: number | null
  tiempo_operativo_min?: number | null
  produccion_real?: number | null
  produccion_nominal?: number | null
  produccion_buena?: number | null
  disponibilidad?: number | null
  rendimiento?: number | null
  calidad?: number | null
  oee?: number | null
}
interface Linea { id: number; codigo: string; nombre: string }
interface Equipo { id: number; codigo: string; nombre: string }

const EMPTY_FORM = {
  linea_id: '', equipo_id: '', turno: 'MANANA',
  tiempo_planificado_min: '', tiempo_paradas_min: '0', tiempo_operativo_min: '',
  produccion_nominal: '', produccion_real: '', produccion_buena: '',
}

export default function MESOEE() {
  const qc = useQueryClient()
  const [filtroLinea, setFiltroLinea] = useState('')
  const [regOpen, setRegOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tried, setTried] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: registros = [], isLoading } = useQuery<RegistroOEE[]>({
    queryKey: ['mes-oee', filtroLinea],
    queryFn: () => api.get(`/mes/oee${filtroLinea ? `?linea_id=${filtroLinea}` : ''}`).then(r => r.data),
  })
  const { data: lineas = [] } = useQuery<Linea[]>({
    queryKey: ['mes-lineas'], queryFn: () => api.get('/mes/lineas').then(r => r.data),
  })
  const { data: equipos = [] } = useQuery<Equipo[]>({
    queryKey: ['mes-equipos'], queryFn: () => api.get('/mes/equipos').then(r => r.data),
  })

  const linea = (id?: number | null) => lineas.find(l => l.id === id)
  const equipo = (id?: number | null) => equipos.find(e => e.id === id)

  // ─── Mutación ───────────────────────────────────────────────────────────────
  const mutRegistrar = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/oee', body),
    onSuccess: (r: any) => {
      const oee = r?.data?.oee
      toast.success(oee != null ? `OEE registrado: ${Number(oee).toFixed(1)}%` : 'Registro OEE guardado')
      qc.invalidateQueries({ queryKey: ['mes-oee'] })
      setRegOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar el OEE'),
  })

  // ─── Derivados (KPIs promedio y serie cronológica) ──────────────────────────
  const kpis = useMemo(() => {
    const prom = (sel: (r: RegistroOEE) => number | null | undefined) => {
      const vals = registros.map(sel).filter((v): v is number => v != null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    return {
      oee: prom(r => r.oee),
      disp: prom(r => r.disponibilidad),
      rend: prom(r => r.rendimiento),
      cal: prom(r => r.calidad),
    }
  }, [registros])

  // El GET viene en orden descendente por creación → invertir para orden cronológico
  const serie = useMemo(() =>
    [...registros].reverse().map(r => ({
      fecha: r.fecha ? new Date(r.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : `#${r.id}`,
      OEE: r.oee ?? null,
      Disponibilidad: r.disponibilidad ?? null,
      Rendimiento: r.rendimiento ?? null,
      Calidad: r.calidad ?? null,
    })), [registros])

  // ─── Formulario: autocálculo y preview en vivo ──────────────────────────────
  const abrirRegistro = () => { setForm({ ...EMPTY_FORM }); setTried(false); setRegOpen(true) }

  /** Cambia planificado o paradas y recalcula el tiempo operativo (editable después). */
  const setTiempos = (campo: 'tiempo_planificado_min' | 'tiempo_paradas_min', valor: string) => {
    setForm(f => {
      const next = { ...f, [campo]: valor }
      const plan = Number(next.tiempo_planificado_min)
      const paradas = Number(next.tiempo_paradas_min || 0)
      if (next.tiempo_planificado_min !== '' && !isNaN(plan) && !isNaN(paradas)) {
        next.tiempo_operativo_min = String(Math.max(plan - paradas, 0))
      }
      return next
    })
  }

  // Preview con las mismas fórmulas ISO 22400 que aplica el servidor
  const preview = useMemo(() => {
    const plan = Number(form.tiempo_planificado_min)
    const oper = Number(form.tiempo_operativo_min)
    const nominal = Number(form.produccion_nominal)
    const real = Number(form.produccion_real)
    const buena = Number(form.produccion_buena)
    const d = plan > 0 && form.tiempo_operativo_min !== '' ? (oper / plan) * 100 : null
    const r = nominal > 0 && form.produccion_real !== '' ? (real / nominal) * 100 : null
    const c = real > 0 && form.produccion_buena !== '' ? (buena / real) * 100 : null
    const oee = d != null && r != null && c != null ? (d * r * c) / 10000 : null
    return { d, r, c, oee }
  }, [form])

  // Validaciones (se muestran tras intentar guardar — patrón "tried")
  const invLinea = tried && !form.linea_id
  const invPlan = tried && (form.tiempo_planificado_min === '' || Number(form.tiempo_planificado_min) <= 0)
  const invParadas = tried && Number(form.tiempo_paradas_min || 0) < 0
  const invOper = tried && (form.tiempo_operativo_min === '' || Number(form.tiempo_operativo_min) < 0)
  const invNominal = tried && (form.produccion_nominal === '' || Number(form.produccion_nominal) <= 0)
  const invReal = tried && (form.produccion_real === '' || Number(form.produccion_real) < 0)
  const invBuena = tried && (form.produccion_buena === '' || Number(form.produccion_buena) < 0
    || Number(form.produccion_buena) > Number(form.produccion_real || 0))

  const guardar = () => {
    setTried(true)
    const errores =
      !form.linea_id ||
      form.tiempo_planificado_min === '' || Number(form.tiempo_planificado_min) <= 0 ||
      Number(form.tiempo_paradas_min || 0) < 0 ||
      form.tiempo_operativo_min === '' || Number(form.tiempo_operativo_min) < 0 ||
      form.produccion_nominal === '' || Number(form.produccion_nominal) <= 0 ||
      form.produccion_real === '' || Number(form.produccion_real) < 0 ||
      form.produccion_buena === '' || Number(form.produccion_buena) < 0 ||
      Number(form.produccion_buena) > Number(form.produccion_real)
    if (errores) return
    mutRegistrar.mutate({
      linea_id: Number(form.linea_id),
      equipo_id: form.equipo_id ? Number(form.equipo_id) : undefined,
      turno: form.turno,
      tiempo_planificado_min: Number(form.tiempo_planificado_min),
      tiempo_paradas_min: Number(form.tiempo_paradas_min || 0),
      tiempo_operativo_min: Number(form.tiempo_operativo_min),
      produccion_real: Number(form.produccion_real),
      produccion_nominal: Number(form.produccion_nominal),
      produccion_buena: Number(form.produccion_buena),
    })
  }

  // ─── Exportación ────────────────────────────────────────────────────────────
  const exportar = (tipo: 'pdf' | 'excel') => {
    const filas = registros.map(r => ({
      fecha: r.fecha ? new Date(r.fecha).toLocaleDateString('es-CO') : '',
      linea: linea(r.linea_id)?.nombre ?? r.linea_id,
      turno: TURNO_LABEL[r.turno] ?? r.turno,
      equipo: equipo(r.equipo_id)?.nombre ?? '—',
      t_planificado_min: r.tiempo_planificado_min ?? '',
      t_paradas_min: r.tiempo_paradas_min ?? '',
      t_operativo_min: r.tiempo_operativo_min ?? '',
      prod_real: r.produccion_real ?? '',
      prod_nominal: r.produccion_nominal ?? '',
      prod_buena: r.produccion_buena ?? '',
      disponibilidad_pct: r.disponibilidad != null ? Number(r.disponibilidad.toFixed(1)) : '',
      rendimiento_pct: r.rendimiento != null ? Number(r.rendimiento.toFixed(1)) : '',
      calidad_pct: r.calidad != null ? Number(r.calidad.toFixed(1)) : '',
      oee_pct: r.oee != null ? Number(r.oee.toFixed(1)) : '',
    }))
    const opts = {
      archivo: 'mes-oee',
      titulo: 'MES — OEE por turno (ISO 22400)',
      subtitulo: filtroLinea ? `Línea: ${linea(Number(filtroLinea))?.nombre ?? filtroLinea}` : 'Todas las líneas',
      color: MES_COLOR,
      filas,
    }
    tipo === 'pdf' ? exportarPDF(opts) : exportarExcel(opts)
  }

  // ─── KPI cards ──────────────────────────────────────────────────────────────
  const kpiCards = [
    { label: 'OEE promedio', valor: kpis.oee, color: umbral(kpis.oee), nota: 'Clase mundial ≥ 85%', principal: true },
    { label: 'Disponibilidad', valor: kpis.disp, color: COLOR_DISP, nota: 'T. operativo / T. planificado' },
    { label: 'Rendimiento', valor: kpis.rend, color: COLOR_REND, nota: 'Prod. real / Prod. nominal' },
    { label: 'Calidad', valor: kpis.cal, color: COLOR_CAL, nota: 'Prod. buena / Prod. real' },
  ]

  return (
    <Layout title="MES · OEE">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <SpeedIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>OEE — Eficiencia Global de Equipos</Typography>
              <Typography fontSize={12} color="text.secondary">
                Eficiencia global de equipos · Disponibilidad × Rendimiento × Calidad (ISO 22400)
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('pdf')} sx={{ textTransform: 'none' }}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} sx={{ textTransform: 'none' }}>Excel</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirRegistro}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
              Registrar OEE de turno
            </Button>
          </Stack>
        </Stack>

        {/* KPIs promedio (de los registros filtrados) */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {kpiCards.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Paper elevation={0} className="hover-lift"
                sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFFFF', border: '1px solid #E5E7EB',
                  borderTop: `3px solid ${k.color}` }}>
                <Typography fontSize={11} fontWeight={700} color="text.secondary" letterSpacing="0.05em" textTransform="uppercase">
                  {k.label}
                </Typography>
                <Typography fontWeight={800} color={k.color}
                  sx={{ fontSize: k.principal ? 34 : 28, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                  {pct(k.valor)}
                </Typography>
                <Typography fontSize={11} color="text.secondary">{k.nota}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Filtro por línea */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
          <TextField select size="small" label="Línea de producción" value={filtroLinea}
            onChange={e => setFiltroLinea(e.target.value)} sx={{ minWidth: 260, bgcolor: '#FFFFFF' }}>
            <MenuItem value="">Todas las líneas</MenuItem>
            {lineas.map(l => <MenuItem key={l.id} value={String(l.id)}>{l.codigo} — {l.nombre}</MenuItem>)}
          </TextField>
        </Stack>

        {/* Gráfica de evolución */}
        <Card elevation={0} sx={{ mb: 2.5, p: 2, borderRadius: '14px', bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <Typography fontWeight={700} fontSize={14} mb={0.5}>Evolución del OEE y sus factores</Typography>
          <Typography fontSize={11.5} color="text.secondary" mb={1.5}>
            Cada punto es un registro de turno, en orden cronológico · valores en % (0–100)
          </Typography>
          {serie.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie} margin={{ top: 6, right: 16, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} unit="%" />
                <RTooltip
                  formatter={(v: any) => (v != null ? `${Number(v).toFixed(1)}%` : '—')}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="OEE" stroke={MES_COLOR} strokeWidth={2.5}
                  dot={{ r: 3, fill: MES_COLOR, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="Disponibilidad" stroke={COLOR_DISP} strokeWidth={1.5}
                  strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Rendimiento" stroke={COLOR_REND} strokeWidth={1.5}
                  strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Calidad" stroke={COLOR_CAL} strokeWidth={1.5}
                  strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary" fontSize={13}>
                {isLoading ? 'Cargando…' : 'Sin registros aún. Registre el primer turno para ver la evolución.'}
              </Typography>
            </Box>
          )}
        </Card>

        {/* Tabla de registros */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Fecha', 'Línea', 'Turno', 'Equipo', 'T. planificado', 'T. paradas', 'T. operativo',
                  'Prod. real', 'Prod. nominal', 'Prod. buena', 'D%', 'R%', 'C%', 'OEE%'].map(h =>
                    <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {registros.map(r => (
                <TableRow key={r.id} hover sx={{ '& td': { fontVariantNumeric: 'tabular-nums' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {r.fecha ? new Date(r.fecha).toLocaleDateString('es-CO') : '—'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: MES_DARK }}>{linea(r.linea_id)?.nombre ?? `#${r.linea_id}`}</TableCell>
                  <TableCell>{TURNO_LABEL[r.turno] ?? r.turno}</TableCell>
                  <TableCell>{equipo(r.equipo_id)?.nombre ?? '—'}</TableCell>
                  <TableCell>{num(r.tiempo_planificado_min)} min</TableCell>
                  <TableCell sx={{ color: (r.tiempo_paradas_min ?? 0) > 0 ? '#DC2626' : 'inherit' }}>
                    {num(r.tiempo_paradas_min)} min
                  </TableCell>
                  <TableCell>{num(r.tiempo_operativo_min)} min</TableCell>
                  <TableCell>{num(r.produccion_real)}</TableCell>
                  <TableCell>{num(r.produccion_nominal)}</TableCell>
                  <TableCell>{num(r.produccion_buena)}</TableCell>
                  <TableCell sx={{ color: COLOR_DISP, fontWeight: 600 }}>{pct(r.disponibilidad)}</TableCell>
                  <TableCell sx={{ color: COLOR_REND, fontWeight: 600 }}>{pct(r.rendimiento)}</TableCell>
                  <TableCell sx={{ color: COLOR_CAL, fontWeight: 600 }}>{pct(r.calidad)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={pct(r.oee)}
                      sx={{ fontWeight: 800, fontSize: 11, fontVariantNumeric: 'tabular-nums',
                        color: umbral(r.oee), bgcolor: alpha(umbral(r.oee), 0.12) }} />
                  </TableCell>
                </TableRow>
              ))}
              {registros.length === 0 && (
                <TableRow><TableCell colSpan={14} align="center">
                  <Typography color="text.secondary" py={3}>
                    {isLoading ? 'Cargando…' : 'Sin registros de OEE. Use "Registrar OEE de turno" para crear el primero.'}
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Diálogo: Registrar OEE de turno ── */}
        <Dialog open={regOpen} onClose={() => setRegOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Registrar OEE de turno</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Línea de producción *" size="small" fullWidth value={form.linea_id}
                  onChange={e => setForm(f => ({ ...f, linea_id: e.target.value }))}
                  error={invLinea} helperText={invLinea ? 'Seleccione la línea del turno' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {lineas.map(l => <MenuItem key={l.id} value={String(l.id)}>{l.codigo} — {l.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Equipo (opcional)" size="small" fullWidth value={form.equipo_id}
                  onChange={e => setForm(f => ({ ...f, equipo_id: e.target.value }))}>
                  <MenuItem value="">Toda la línea</MenuItem>
                  {equipos.map(eq => <MenuItem key={eq.id} value={String(eq.id)}>{eq.codigo} — {eq.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Turno" size="small" fullWidth value={form.turno}
                  onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}>
                  {TURNOS.map(t => <MenuItem key={t} value={t}>{TURNO_LABEL[t]}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="T. planificado *" type="number" size="small" fullWidth
                  value={form.tiempo_planificado_min}
                  onChange={e => setTiempos('tiempo_planificado_min', e.target.value)}
                  error={invPlan} helperText={invPlan ? 'Debe ser mayor que cero' : 'Tiempo programado del turno'}
                  InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="T. paradas" type="number" size="small" fullWidth
                  value={form.tiempo_paradas_min}
                  onChange={e => setTiempos('tiempo_paradas_min', e.target.value)}
                  error={invParadas} helperText={invParadas ? 'No puede ser negativo' : 'Paradas no planificadas'}
                  InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="T. operativo *" type="number" size="small" fullWidth
                  value={form.tiempo_operativo_min}
                  onChange={e => setForm(f => ({ ...f, tiempo_operativo_min: e.target.value }))}
                  error={invOper}
                  helperText={invOper ? 'Requerido (≥ 0)' : 'Autocalculado: planificado − paradas'}
                  InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Prod. nominal *" type="number" size="small" fullWidth
                  value={form.produccion_nominal}
                  onChange={e => setForm(f => ({ ...f, produccion_nominal: e.target.value }))}
                  error={invNominal}
                  helperText={invNominal ? 'Debe ser mayor que cero' : 'Capacidad teórica del período'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Prod. real *" type="number" size="small" fullWidth
                  value={form.produccion_real}
                  onChange={e => setForm(f => ({ ...f, produccion_real: e.target.value }))}
                  error={invReal} helperText={invReal ? 'Requerido (≥ 0)' : 'Unidades producidas'} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Prod. buena *" type="number" size="small" fullWidth
                  value={form.produccion_buena}
                  onChange={e => setForm(f => ({ ...f, produccion_buena: e.target.value }))}
                  error={invBuena}
                  helperText={invBuena
                    ? 'Requerida, ≥ 0 y no puede superar la producción real'
                    : 'Unidades conformes a la primera'} />
              </Grid>

              {/* Preview en vivo con las mismas fórmulas del servidor */}
              <Grid size={{ xs: 12 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(MES_COLOR, 0.06), border: `1px solid ${alpha(MES_COLOR, 0.25)}` }}>
                  <Typography fontSize={11} fontWeight={700} color={MES_DARK} letterSpacing="0.05em" textTransform="uppercase" mb={0.5}>
                    Vista previa del cálculo
                  </Typography>
                  <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={2} flexWrap="wrap" useFlexGap>
                    {[
                      { l: 'Disponibilidad', v: preview.d, c: COLOR_DISP },
                      { l: 'Rendimiento', v: preview.r, c: COLOR_REND },
                      { l: 'Calidad', v: preview.c, c: COLOR_CAL },
                      { l: 'OEE', v: preview.oee, c: umbral(preview.oee) },
                    ].map(x => (
                      <Box key={x.l}>
                        <Typography fontSize={10.5} color="text.secondary">{x.l}</Typography>
                        <Typography fontSize={x.l === 'OEE' ? 20 : 16} fontWeight={800} color={x.c}
                          sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {pct(x.v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  El OEE se calcula y almacena en el servidor con estas fórmulas estándar ISO 22400:
                  {' '}<b>D</b> = operativo/planificado · <b>R</b> = real/nominal · <b>C</b> = buena/real · <b>OEE</b> = D×R×C.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRegOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutRegistrar.isPending} onClick={guardar}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
