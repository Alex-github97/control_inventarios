import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Stack, Tooltip, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  EventNote as EventNoteIcon, EditCalendar, RocketLaunch, WarningAmber,
  Schedule as ScheduleIcon, PlayCircleOutline, PendingActions, Close as CloseIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const PRIORIDADES = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE', 'CRITICA'] as const

const ESTADO_STYLE: Record<string, { color: string; bg: string }> = {
  PLANEADA:     { color: '#64748B', bg: '#F1F5F9' },
  LIBERADA:     { color: '#2563EB', bg: '#EFF6FF' },
  EN_EJECUCION: { color: '#16A34A', bg: '#F0FDF4' },
  SUSPENDIDA:   { color: '#D97706', bg: '#FFFBEB' },
  CERRADA:      { color: '#475569', bg: '#F8FAFC' },
  CANCELADA:    { color: '#DC2626', bg: '#FEF2F2' },
}
const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA: '#94A3B8', NORMAL: '#2563EB', ALTA: '#D97706', URGENTE: '#DC2626', CRITICA: '#7F1D1D',
}

// Estados que admiten replanificación (control de cambios ISO 9001 §8.5.6)
const REPLANIFICABLES = ['PLANEADA', 'LIBERADA']
// Estados visibles en el tablero (excluye órdenes ya terminadas o anuladas)
const ACTIVAS_TABLERO = ['PLANEADA', 'LIBERADA', 'EN_EJECUCION', 'SUSPENDIDA']

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface Orden {
  id: number; numero: string; producto_id: number; estado: string; prioridad: string
  cantidad_planificada: number; cantidad_producida: number; cantidad_scrap: number
  linea_id?: number | null
  fecha_inicio_plan?: string | null; fecha_fin_plan?: string | null
  fecha_inicio_real?: string | null; fecha_fin_real?: string | null
}
interface Producto { id: number; codigo: string; nombre: string }
interface Linea { id: number; codigo: string; nombre: string; capacidad_hora?: number | null }

const EMPTY_FORM = { linea_id: '', prioridad: 'NORMAL', fecha_inicio_plan: '', fecha_fin_plan: '', observaciones: '' }

// ─── Utilidades de fecha ─────────────────────────────────────────────────────
const fmtFecha = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}
const fmtHora = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}
// ISO backend → valor de <input type="datetime-local"> (YYYY-MM-DDTHH:mm, hora local)
const isoALocal = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function MESProgramacion() {
  const qc = useQueryClient()
  const [programar, setProgramar] = useState<Orden | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tried, setTried] = useState(false)
  const [liberar, setLiberar] = useState<Orden | null>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: ordenes = [], isLoading } = useQuery<Orden[]>({
    queryKey: ['mes-ordenes'], queryFn: () => api.get('/mes/ordenes').then(r => r.data),
  })
  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data),
  })
  const { data: lineas = [] } = useQuery<Linea[]>({
    queryKey: ['mes-lineas'], queryFn: () => api.get('/mes/lineas').then(r => r.data),
  })

  const producto = (id: number) => productos.find(p => p.id === id)
  const linea = (id?: number | null) => lineas.find(l => l.id === id)

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutReplan = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.put(`/mes/ordenes/${id}`, body),
    onSuccess: (_r: any, v) => {
      const o = ordenes.find(x => x.id === v.id)
      toast.success(`Orden ${o?.numero ?? v.id} reprogramada`)
      qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
      setProgramar(null)
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail ?? 'No fue posible replanificar la orden'),
  })

  const mutLiberar = useMutation({
    mutationFn: (id: number) => api.put(`/mes/ordenes/${id}/estado?estado=LIBERADA`),
    onSuccess: () => {
      toast.success('Orden liberada a producción')
      qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
      setLiberar(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.detail ?? 'Transición no permitida')
      setLiberar(null)
    },
  })

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const cola = useMemo(
    () => ordenes
      .filter(o => REPLANIFICABLES.includes(o.estado))
      .sort((a, b) => {
        const pa = PRIORIDADES.indexOf(a.prioridad as any); const pb = PRIORIDADES.indexOf(b.prioridad as any)
        if (pa !== pb) return pb - pa // mayor prioridad primero
        return (a.fecha_inicio_plan ?? '9999').localeCompare(b.fecha_inicio_plan ?? '9999')
      }),
    [ordenes],
  )

  const sinProgramar = cola.filter(o => !o.fecha_inicio_plan)
  const programadas = cola.filter(o => !!o.fecha_inicio_plan)
  const liberadas = ordenes.filter(o => o.estado === 'LIBERADA')
  const enEjecucion = ordenes.filter(o => o.estado === 'EN_EJECUCION')

  // Tablero: órdenes activas con línea + fecha de inicio, agrupadas por línea
  const porLinea = useMemo(() => {
    const map = new Map<number, Orden[]>()
    for (const l of lineas) map.set(l.id, [])
    for (const o of ordenes) {
      if (!ACTIVAS_TABLERO.includes(o.estado)) continue
      if (o.linea_id == null || !o.fecha_inicio_plan) continue
      if (!map.has(o.linea_id)) map.set(o.linea_id, [])
      map.get(o.linea_id)!.push(o)
    }
    for (const arr of map.values())
      arr.sort((a, b) => (a.fecha_inicio_plan ?? '').localeCompare(b.fecha_inicio_plan ?? ''))
    return map
  }, [ordenes, lineas])

  const sinUbicar = useMemo(
    () => cola.filter(o => o.linea_id == null || !o.fecha_inicio_plan),
    [cola],
  )

  // ─── Diálogo programar/replanificar ─────────────────────────────────────────
  const abrirProgramar = (o: Orden) => {
    setForm({
      linea_id: o.linea_id != null ? String(o.linea_id) : '',
      prioridad: o.prioridad || 'NORMAL',
      fecha_inicio_plan: isoALocal(o.fecha_inicio_plan),
      fecha_fin_plan: isoALocal(o.fecha_fin_plan),
      observaciones: '',
    })
    setTried(false)
    setProgramar(o)
  }

  const finInvalido =
    !!form.fecha_inicio_plan && !!form.fecha_fin_plan &&
    new Date(form.fecha_fin_plan).getTime() <= new Date(form.fecha_inicio_plan).getTime()

  const errLinea = tried && !form.linea_id
  const errInicio = tried && !form.fecha_inicio_plan
  const errFin = tried && (!form.fecha_fin_plan || finInvalido)

  const guardarProgramacion = () => {
    setTried(true)
    if (!programar) return
    if (!form.linea_id || !form.fecha_inicio_plan || !form.fecha_fin_plan || finInvalido) return
    mutReplan.mutate({
      id: programar.id,
      body: {
        linea_id: Number(form.linea_id),
        prioridad: form.prioridad,
        fecha_inicio_plan: form.fecha_inicio_plan,
        fecha_fin_plan: form.fecha_fin_plan,
        observaciones: form.observaciones || undefined,
      },
    })
  }

  // ─── Sub-componentes de presentación ────────────────────────────────────────
  const ChipPrioridad = ({ p }: { p: string }) => (
    <Chip size="small" label={p}
      sx={{ fontWeight: 700, fontSize: 10, color: PRIORIDAD_COLOR[p] ?? '#64748B', bgcolor: alpha(PRIORIDAD_COLOR[p] ?? '#64748B', 0.12) }} />
  )
  const ChipEstado = ({ e }: { e: string }) => {
    const st = ESTADO_STYLE[e] ?? ESTADO_STYLE.PLANEADA
    return <Chip size="small" label={e.replace(/_/g, ' ')} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
  }

  const TarjetaProgramacion = ({ o }: { o: Orden }) => {
    const p = producto(o.producto_id)
    const enCurso = o.estado === 'EN_EJECUCION'
    return (
      <Paper elevation={0} className="hover-lift"
        sx={{ p: 1.25, borderRadius: '10px', minWidth: 220, flexShrink: 0, bgcolor: '#FFFFFF',
          border: enCurso ? '2px solid #16A34A' : '1px solid #E5E7EB' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography fontSize={12.5} fontWeight={800} color={MES_DARK}>{o.numero}</Typography>
          <ChipPrioridad p={o.prioridad} />
        </Stack>
        <Typography fontSize={11.5} fontWeight={600} noWrap title={p?.nombre}>
          {p?.nombre ?? `Producto #${o.producto_id}`}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.5} my={0.5}>
          <ScheduleIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
          <Typography fontSize={11} color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmtFecha(o.fecha_inicio_plan)}–{fmtHora(o.fecha_fin_plan)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <ChipEstado e={o.estado} />
          {REPLANIFICABLES.includes(o.estado) && (
            <Tooltip title="Replanificar">
              <IconButton size="small" onClick={() => abrirProgramar(o)} sx={{ color: MES_COLOR, p: 0.25 }}>
                <EditCalendar sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Paper>
    )
  }

  const KPIS: { label: string; value: number; color: string; icon: JSX.Element }[] = [
    { label: 'Sin programar', value: sinProgramar.length, color: '#D97706', icon: <PendingActions sx={{ fontSize: 22 }} /> },
    { label: 'Programadas', value: programadas.length, color: MES_COLOR, icon: <EventNoteIcon sx={{ fontSize: 22 }} /> },
    { label: 'Liberadas', value: liberadas.length, color: '#2563EB', icon: <RocketLaunch sx={{ fontSize: 22 }} /> },
    { label: 'En ejecución', value: enEjecucion.length, color: '#16A34A', icon: <PlayCircleOutline sx={{ fontSize: 22 }} /> },
  ]

  return (
    <Layout title="MES · Programación de Producción">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <EventNoteIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color={MES_DARK}>Programación de Producción</Typography>
            <Typography fontSize={12} color="text.secondary">
              Planner por línea · replanificación controlada (ISO 9001 §8.5.6)
            </Typography>
          </Box>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {KPIS.map(k => (
            <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
              <Paper elevation={0} className="hover-lift"
                sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF',
                  display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', display: 'grid', placeItems: 'center',
                  color: k.color, bgcolor: alpha(k.color, 0.12) }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography fontSize={22} fontWeight={800} color={k.color} lineHeight={1.1} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {k.value}
                  </Typography>
                  <Typography fontSize={10.5} fontWeight={700} color="text.secondary" letterSpacing="0.04em">
                    {k.label.toUpperCase()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* ── Cola de programación ── */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', mb: 2.5, overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 1.75, pb: 1.25, borderBottom: '1px solid #F1F5F9' }}>
            <Typography fontWeight={800} fontSize={14.5} color={MES_DARK}>Cola de programación</Typography>
            <Typography fontSize={11.5} color="text.secondary">
              Órdenes en PLANEADA o LIBERADA — únicas etapas donde se permite replanificar
            </Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Número', 'Producto', 'Prioridad', 'Estado', 'Cantidad', 'Línea', 'Inicio plan', 'Fin plan', 'Acciones'].map(h =>
                    <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {cola.map(o => {
                  const p = producto(o.producto_id)
                  const l = linea(o.linea_id)
                  return (
                    <TableRow key={o.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{o.numero}</TableCell>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={600}>{p?.nombre ?? `#${o.producto_id}`}</Typography>
                        <Typography fontSize={11} color="text.secondary">{p?.codigo}</Typography>
                      </TableCell>
                      <TableCell><ChipPrioridad p={o.prioridad} /></TableCell>
                      <TableCell><ChipEstado e={o.estado} /></TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{o.cantidad_planificada.toLocaleString('es-CO')}</TableCell>
                      <TableCell>
                        {l
                          ? <Typography fontSize={12.5}>{l.codigo} — {l.nombre}</Typography>
                          : <Typography fontSize={12.5} fontWeight={700} color="#D97706">Sin asignar</Typography>}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(o.fecha_inicio_plan)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(o.fecha_fin_plan)}</TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.25}>
                          <Tooltip title={o.fecha_inicio_plan ? 'Replanificar' : 'Programar'}>
                            <IconButton size="small" onClick={() => abrirProgramar(o)} sx={{ color: MES_COLOR }}>
                              <EditCalendar sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          {o.estado === 'PLANEADA' && (
                            <Tooltip title="Liberar a producción">
                              <IconButton size="small" onClick={() => setLiberar(o)} sx={{ color: '#2563EB' }}>
                                <RocketLaunch sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {cola.length === 0 && (
                  <TableRow><TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" py={3}>
                      {isLoading ? 'Cargando…' : 'No hay órdenes en PLANEADA o LIBERADA. Cree órdenes en MES · Órdenes.'}
                    </Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        {/* ── Tablero por línea ── */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 1.75, pb: 1.25, borderBottom: '1px solid #F1F5F9' }}>
            <Typography fontWeight={800} fontSize={14.5} color={MES_DARK}>Tablero por línea</Typography>
            <Typography fontSize={11.5} color="text.secondary">
              Secuencia planificada por línea de producción · las órdenes en ejecución se destacan en verde
            </Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            {lineas.length === 0 && (
              <Typography color="text.secondary" fontSize={13} textAlign="center" py={2}>
                {isLoading ? 'Cargando…' : 'No hay líneas de producción configuradas.'}
              </Typography>
            )}

            <Stack spacing={1.5}>
              {lineas.map(l => {
                const items = porLinea.get(l.id) ?? []
                return (
                  <Box key={l.id} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.5, bgcolor: '#F8FAFC' }}>
                    <Stack direction="row" alignItems="center" gap={1} mb={items.length ? 1 : 0} flexWrap="wrap">
                      <Typography fontWeight={800} fontSize={13} color={MES_DARK}>
                        {l.codigo} — {l.nombre}
                      </Typography>
                      {l.capacidad_hora != null && (
                        <Chip size="small" icon={<SpeedIcon sx={{ fontSize: 13 }} />}
                          label={`${l.capacidad_hora.toLocaleString('es-CO')} u/h`}
                          sx={{ fontSize: 10, fontWeight: 700, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.1) }} />
                      )}
                      <Typography fontSize={11} color="text.secondary" ml="auto">
                        {items.length} orden{items.length === 1 ? '' : 'es'} programada{items.length === 1 ? '' : 's'}
                      </Typography>
                    </Stack>
                    {items.length > 0 ? (
                      <Stack direction="row" gap={1.25} sx={{ overflowX: 'auto', pb: 0.5 }}>
                        {items.map(o => <TarjetaProgramacion key={o.id} o={o} />)}
                      </Stack>
                    ) : (
                      <Typography fontSize={11.5} color="#94A3B8" fontStyle="italic">Sin órdenes programadas en esta línea</Typography>
                    )}
                  </Box>
                )
              })}
            </Stack>

            {/* Sin línea o sin fechas */}
            {sinUbicar.length > 0 && (
              <Box sx={{ mt: 2, border: '1px dashed #F59E0B', borderRadius: '12px', p: 1.5, bgcolor: '#FFFBEB' }}>
                <Stack direction="row" alignItems="center" gap={0.75} mb={1}>
                  <WarningAmber sx={{ fontSize: 18, color: '#D97706' }} />
                  <Typography fontWeight={800} fontSize={13} color="#92400E">
                    Sin línea o sin fechas ({sinUbicar.length})
                  </Typography>
                </Stack>
                <Stack direction="row" gap={1.25} sx={{ overflowX: 'auto', pb: 0.5 }}>
                  {sinUbicar.map(o => {
                    const p = producto(o.producto_id)
                    return (
                      <Paper key={o.id} elevation={0}
                        sx={{ p: 1.25, borderRadius: '10px', minWidth: 210, flexShrink: 0, bgcolor: '#FFFFFF', border: '1px solid #FDE68A' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography fontSize={12.5} fontWeight={800} color={MES_DARK}>{o.numero}</Typography>
                          <ChipPrioridad p={o.prioridad} />
                        </Stack>
                        <Typography fontSize={11.5} fontWeight={600} noWrap title={p?.nombre}>
                          {p?.nombre ?? `Producto #${o.producto_id}`}
                        </Typography>
                        <Typography fontSize={10.5} color="#B45309" mb={0.5}>
                          {o.linea_id == null ? 'Sin línea asignada' : 'Sin fechas planificadas'}
                        </Typography>
                        <Button size="small" startIcon={<EditCalendar sx={{ fontSize: 14 }} />}
                          onClick={() => abrirProgramar(o)}
                          sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700, color: MES_DARK, p: 0.25 }}>
                          Programar
                        </Button>
                      </Paper>
                    )
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>

        {/* ── Diálogo programar / replanificar ── */}
        <Dialog open={!!programar} onClose={() => setProgramar(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{programar?.fecha_inicio_plan ? 'Replanificar orden' : 'Programar orden'}</span>
            <IconButton size="small" onClick={() => setProgramar(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {programar && (
              <Grid container spacing={2} sx={{ pt: 0.5 }}>
                <Grid size={{ xs: 12 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography fontSize={13.5} fontWeight={800} color={MES_DARK}>{programar.numero}</Typography>
                        <Typography fontSize={12} color="text.secondary">
                          {producto(programar.producto_id)?.codigo} — {producto(programar.producto_id)?.nombre ?? `Producto #${programar.producto_id}`}
                          {' · '}{programar.cantidad_planificada.toLocaleString('es-CO')} unidades
                        </Typography>
                      </Box>
                      <ChipEstado e={programar.estado} />
                    </Stack>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select label="Línea de producción *" size="small" fullWidth value={form.linea_id}
                    onChange={e => setForm(f => ({ ...f, linea_id: e.target.value }))}
                    error={errLinea} helperText={errLinea ? 'Seleccione la línea' : ''}>
                    <MenuItem value="">Seleccionar…</MenuItem>
                    {lineas.map(l => (
                      <MenuItem key={l.id} value={String(l.id)}>
                        {l.codigo} — {l.nombre}{l.capacidad_hora != null ? ` (${l.capacidad_hora} u/h)` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select label="Prioridad" size="small" fullWidth value={form.prioridad}
                    onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                    {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Inicio planificado *" type="datetime-local" size="small" fullWidth
                    value={form.fecha_inicio_plan}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio_plan: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    error={errInicio} helperText={errInicio ? 'Indique el inicio planificado' : ''} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Fin planificado *" type="datetime-local" size="small" fullWidth
                    value={form.fecha_fin_plan}
                    onChange={e => setForm(f => ({ ...f, fecha_fin_plan: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    error={errFin}
                    helperText={errFin ? (finInvalido ? 'Debe ser posterior al inicio' : 'Indique el fin planificado') : ''} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Observaciones (motivo del cambio)" size="small" fullWidth multiline minRows={2}
                    value={form.observaciones}
                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                    helperText="El motivo queda registrado en la orden" />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" sx={{ fontSize: 12.5 }}>
                    Solo se replanifican órdenes en <b>PLANEADA</b> o <b>LIBERADA</b> — los cambios son controlados (ISO 9001 §8.5.6).
                  </Alert>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setProgramar(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutReplan.isPending} onClick={guardarProgramacion}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700 }}>
              Guardar programación
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo confirmar liberación ── */}
        <Dialog open={!!liberar} onClose={() => setLiberar(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Liberar orden a producción</DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={14}>
              ¿Confirmar la liberación de la orden <b>{liberar?.numero}</b>?
            </Typography>
            {liberar && (!liberar.fecha_inicio_plan || liberar.linea_id == null) && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12.5 }}>
                La orden aún no tiene {liberar.linea_id == null ? 'línea asignada' : 'fechas planificadas'} — se recomienda programarla antes de liberar.
              </Alert>
            )}
            <Alert severity="info" sx={{ mt: 1.5, fontSize: 12.5 }}>
              Al liberar, la orden queda disponible para ejecución en planta. El sistema valida la transición de estado.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setLiberar(null)}>Volver</Button>
            <Button variant="contained" disabled={mutLiberar.isPending}
              onClick={() => liberar && mutLiberar.mutate(liberar.id)}
              startIcon={<RocketLaunch sx={{ fontSize: 16 }} />}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700 }}>
              Liberar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
