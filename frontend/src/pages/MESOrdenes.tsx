import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Stack, Tooltip, LinearProgress, InputAdornment, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, Factory as FactoryIcon, PlayArrow, Pause, Stop,
  RocketLaunch, Cancel as CancelIcon, Visibility, Search as SearchIcon,
  Download, Close as CloseIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const ESTADOS = ['PLANEADA', 'LIBERADA', 'EN_EJECUCION', 'SUSPENDIDA', 'CERRADA', 'CANCELADA'] as const
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

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface Orden {
  id: number; numero: string; producto_id: number; estado: string; prioridad: string
  cantidad_planificada: number; cantidad_producida: number; cantidad_scrap: number
  linea_id?: number | null
}
interface Producto { id: number; codigo: string; nombre: string; tipo: string; unidad_medida: string }
interface Linea { id: number; codigo: string; nombre: string }
interface BOM { id: number; producto_id: number; version: string; tipo: string }
interface Ejecucion { id: number; orden_id: number; estado: string; turno: string; cantidad_producida: number; cantidad_scrap: number }
interface Inspeccion { id: number; orden_id: number; tipo: string; resultado: string; muestra_tam?: number | null; muestra_defectos: number }
interface ScrapItem { id: number; orden_id: number; tipo: string; causa: string; cantidad: number; costo_total?: number | null; es_reprocesable: boolean }

const EMPTY_FORM = {
  numero: '', producto_id: '', linea_id: '', bom_id: '', prioridad: 'NORMAL',
  cantidad_planificada: '', fecha_inicio_plan: '', fecha_fin_plan: '',
}

export default function MESOrdenes() {
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busca, setBusca] = useState('')
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tried, setTried] = useState(false)
  const [detalle, setDetalle] = useState<Orden | null>(null)
  const [confirmar, setConfirmar] = useState<null | { orden: Orden; estado: string; label: string }>(null)

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
  const { data: boms = [] } = useQuery<BOM[]>({
    queryKey: ['mes-boms'], queryFn: () => api.get('/mes/bom').then(r => r.data),
  })
  const { data: ejecuciones = [] } = useQuery<Ejecucion[]>({
    queryKey: ['mes-ordenes-ej', detalle?.id],
    queryFn: () => api.get(`/mes/ejecuciones?orden_id=${detalle!.id}`).then(r => r.data),
    enabled: !!detalle,
  })
  const { data: inspecciones = [] } = useQuery<Inspeccion[]>({
    queryKey: ['mes-ordenes-insp', detalle?.id],
    queryFn: () => api.get(`/mes/inspecciones?orden_id=${detalle!.id}`).then(r => r.data),
    enabled: !!detalle,
  })
  const { data: scrap = [] } = useQuery<ScrapItem[]>({
    queryKey: ['mes-ordenes-scrap', detalle?.id],
    queryFn: () => api.get(`/mes/scrap?orden_id=${detalle!.id}`).then(r => r.data),
    enabled: !!detalle,
  })

  const producto = (id: number) => productos.find(p => p.id === id)
  const linea = (id?: number | null) => lineas.find(l => l.id === id)

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const abrirNueva = async () => {
    setForm({ ...EMPTY_FORM }); setTried(false); setNuevaOpen(true)
    try {
      const r = await api.get('/mes/ordenes/siguiente-numero')
      setForm(f => ({ ...f, numero: r.data.numero }))
    } catch { /* el backend auto-numera si queda vacío */ }
  }

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/ordenes', body),
    onSuccess: (r: any) => {
      toast.success(`Orden ${r.data.numero} creada`)
      qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
      setNuevaOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear la orden'),
  })

  const mutEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.put(`/mes/ordenes/${id}/estado?estado=${estado}`),
    onSuccess: (_r: any, v) => {
      toast.success(`Orden → ${v.estado.replace(/_/g, ' ')}`)
      qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
      setConfirmar(null)
    },
    onError: (e: any) => { toast.error(e?.response?.data?.detail ?? 'Transición no permitida'); setConfirmar(null) },
  })

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const filtradas = useMemo(() => ordenes.filter(o => {
    if (filtroEstado && o.estado !== filtroEstado) return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      const p = producto(o.producto_id)
      return o.numero.toLowerCase().includes(q) || (p?.nombre ?? '').toLowerCase().includes(q) || (p?.codigo ?? '').toLowerCase().includes(q)
    }
    return true
  }), [ordenes, filtroEstado, busca, productos])

  const conteo = (e: string) => ordenes.filter(o => o.estado === e).length

  // Acciones válidas según la máquina de estados del backend
  const acciones = (o: Orden): { estado: string; label: string; icon: JSX.Element; color: string }[] => {
    switch (o.estado) {
      case 'PLANEADA': return [
        { estado: 'LIBERADA', label: 'Liberar', icon: <RocketLaunch sx={{ fontSize: 16 }} />, color: '#2563EB' },
        { estado: 'CANCELADA', label: 'Cancelar', icon: <CancelIcon sx={{ fontSize: 16 }} />, color: '#DC2626' },
      ]
      case 'LIBERADA': return [
        { estado: 'EN_EJECUCION', label: 'Iniciar', icon: <PlayArrow sx={{ fontSize: 16 }} />, color: '#16A34A' },
        { estado: 'PLANEADA', label: 'Devolver a planeación', icon: <Pause sx={{ fontSize: 16 }} />, color: '#64748B' },
        { estado: 'CANCELADA', label: 'Cancelar', icon: <CancelIcon sx={{ fontSize: 16 }} />, color: '#DC2626' },
      ]
      case 'EN_EJECUCION': return [
        { estado: 'SUSPENDIDA', label: 'Suspender', icon: <Pause sx={{ fontSize: 16 }} />, color: '#D97706' },
        { estado: 'CERRADA', label: 'Cerrar', icon: <Stop sx={{ fontSize: 16 }} />, color: '#475569' },
      ]
      case 'SUSPENDIDA': return [
        { estado: 'EN_EJECUCION', label: 'Reanudar', icon: <PlayArrow sx={{ fontSize: 16 }} />, color: '#16A34A' },
        { estado: 'CANCELADA', label: 'Cancelar', icon: <CancelIcon sx={{ fontSize: 16 }} />, color: '#DC2626' },
      ]
      default: return []
    }
  }

  const exportar = (tipo: 'pdf' | 'excel') => {
    const filas = filtradas.map(o => ({
      numero: o.numero, producto: producto(o.producto_id)?.nombre ?? o.producto_id,
      linea: linea(o.linea_id)?.nombre ?? '—', estado: o.estado, prioridad: o.prioridad,
      planificada: o.cantidad_planificada, producida: o.cantidad_producida, scrap: o.cantidad_scrap,
      avance_pct: o.cantidad_planificada > 0 ? Math.round(o.cantidad_producida / o.cantidad_planificada * 100) : 0,
    }))
    const opts = { archivo: 'mes-ordenes-produccion', titulo: 'MES — Órdenes de producción', color: MES_COLOR, filas }
    tipo === 'pdf' ? exportarPDF(opts) : exportarExcel(opts)
  }

  const invalidoNumero = tried && false // numero puede ir vacío (auto)
  const invalidoProducto = tried && !form.producto_id
  const invalidoCantidad = tried && (!form.cantidad_planificada || Number(form.cantidad_planificada) <= 0)
  const bomsProducto = boms.filter(b => String(b.producto_id) === form.producto_id)

  const crear = () => {
    setTried(true)
    if (!form.producto_id || !form.cantidad_planificada || Number(form.cantidad_planificada) <= 0) return
    mutCrear.mutate({
      numero: form.numero || '',
      producto_id: Number(form.producto_id),
      linea_id: form.linea_id ? Number(form.linea_id) : undefined,
      bom_id: form.bom_id ? Number(form.bom_id) : undefined,
      prioridad: form.prioridad,
      cantidad_planificada: Number(form.cantidad_planificada),
      fecha_inicio_plan: form.fecha_inicio_plan || undefined,
      fecha_fin_plan: form.fecha_fin_plan || undefined,
    })
  }

  return (
    <Layout title="MES · Órdenes de Producción">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <FactoryIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Órdenes de Producción</Typography>
              <Typography fontSize={12} color="text.secondary">
                Flujo controlado: Planeada → Liberada → En ejecución → Cerrada · registros trazables ISO 9001 §8.5
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('pdf')} sx={{ textTransform: 'none' }}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} sx={{ textTransform: 'none' }}>Excel</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNueva}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
              Nueva orden
            </Button>
          </Stack>
        </Stack>

        {/* Resumen por estado */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {ESTADOS.map(e => {
            const st = ESTADO_STYLE[e]
            return (
              <Grid key={e} size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper elevation={0} className="hover-lift" onClick={() => setFiltroEstado(filtroEstado === e ? '' : e)}
                  sx={{ p: 1.5, borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                    border: `1px solid ${filtroEstado === e ? st.color : '#E5E7EB'}`,
                    bgcolor: filtroEstado === e ? st.bg : '#FFFFFF' }}>
                  <Typography className="text-gradient" fontSize={24} fontWeight={800} color={st.color} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {conteo(e)}
                  </Typography>
                  <Typography fontSize={10.5} fontWeight={700} color="text.secondary" letterSpacing="0.04em">
                    {e.replace(/_/g, ' ')}
                  </Typography>
                </Paper>
              </Grid>
            )
          })}
        </Grid>

        {/* Filtros */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
          <TextField size="small" placeholder="Buscar por número, producto o SKU…" value={busca} onChange={e => setBusca(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
          <TextField select size="small" label="Estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map(e => <MenuItem key={e} value={e}>{e.replace(/_/g, ' ')}</MenuItem>)}
          </TextField>
        </Stack>

        {/* Tabla */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Número', 'Producto', 'Línea', 'Prioridad', 'Estado', 'Avance', 'Scrap', 'Acciones'].map(h =>
                  <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtradas.map(o => {
                const st = ESTADO_STYLE[o.estado] ?? ESTADO_STYLE.PLANEADA
                const p = producto(o.producto_id)
                const avance = o.cantidad_planificada > 0 ? Math.min(100, o.cantidad_producida / o.cantidad_planificada * 100) : 0
                return (
                  <TableRow key={o.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{o.numero}</TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600}>{p?.nombre ?? `#${o.producto_id}`}</Typography>
                      <Typography fontSize={11} color="text.secondary">{p?.codigo}</Typography>
                    </TableCell>
                    <TableCell>{linea(o.linea_id)?.nombre ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={o.prioridad}
                        sx={{ fontWeight: 700, fontSize: 10, color: PRIORIDAD_COLOR[o.prioridad] ?? '#64748B', bgcolor: alpha(PRIORIDAD_COLOR[o.prioridad] ?? '#64748B', 0.12) }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={o.estado.replace(/_/g, ' ')} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <LinearProgress variant="determinate" value={avance} sx={{ flex: 1 }} />
                        <Typography fontSize={11.5} fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {o.cantidad_producida.toLocaleString('es-CO')}/{o.cantidad_planificada.toLocaleString('es-CO')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: o.cantidad_scrap > 0 ? '#DC2626' : 'inherit', fontWeight: o.cantidad_scrap > 0 ? 700 : 400 }}>
                      {o.cantidad_scrap.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.25}>
                        <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => setDetalle(o)} sx={{ color: MES_COLOR }}><Visibility sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                        {acciones(o).map(a => (
                          <Tooltip key={a.estado} title={a.label}>
                            <IconButton size="small" onClick={() => setConfirmar({ orden: o, estado: a.estado, label: a.label })} sx={{ color: a.color }}>
                              {a.icon}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={3}>{isLoading ? 'Cargando…' : 'Sin órdenes. Cree la primera con "Nueva orden".'}</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Diálogo nueva orden ── */}
        <Dialog open={nuevaOpen} onClose={() => setNuevaOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva orden de producción</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Número" size="small" fullWidth value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  helperText="Numeración controlada — se genera automáticamente" error={invalidoNumero} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Prioridad" size="small" fullWidth value={form.prioridad}
                  onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                  {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Producto *" size="small" fullWidth value={form.producto_id}
                  onChange={e => setForm(f => ({ ...f, producto_id: e.target.value, bom_id: '' }))}
                  error={invalidoProducto} helperText={invalidoProducto ? 'Seleccione el producto a fabricar' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Línea de producción" size="small" fullWidth value={form.linea_id}
                  onChange={e => setForm(f => ({ ...f, linea_id: e.target.value }))}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {lineas.map(l => <MenuItem key={l.id} value={String(l.id)}>{l.codigo} — {l.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="BOM (lista de materiales)" size="small" fullWidth value={form.bom_id}
                  onChange={e => setForm(f => ({ ...f, bom_id: e.target.value }))}
                  disabled={!form.producto_id} helperText={!form.producto_id ? 'Elija primero el producto' : ''}>
                  <MenuItem value="">Sin BOM</MenuItem>
                  {bomsProducto.map(b => <MenuItem key={b.id} value={String(b.id)}>v{b.version} · {b.tipo}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Cantidad planificada *" type="number" size="small" fullWidth value={form.cantidad_planificada}
                  onChange={e => setForm(f => ({ ...f, cantidad_planificada: e.target.value }))}
                  error={invalidoCantidad} helperText={invalidoCantidad ? 'Debe ser mayor que cero' : ''}
                  InputProps={{ endAdornment: <InputAdornment position="end">{producto(Number(form.producto_id))?.unidad_medida ?? 'UN'}</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Inicio planificado" type="datetime-local" size="small" fullWidth value={form.fecha_inicio_plan}
                  onChange={e => setForm(f => ({ ...f, fecha_inicio_plan: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Fin planificado" type="datetime-local" size="small" fullWidth value={form.fecha_fin_plan}
                  onChange={e => setForm(f => ({ ...f, fecha_fin_plan: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  La orden se crea en estado <b>PLANEADA</b>. Para producir debe <b>liberarse</b> (revisión de materiales y capacidad) — el sistema valida cada transición.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNuevaOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCrear.isPending} onClick={crear}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Crear orden</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo confirmación de transición ── */}
        <Dialog open={!!confirmar} onClose={() => setConfirmar(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>{confirmar?.label}</DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={14}>
              ¿Confirmar <b>{confirmar?.label.toLowerCase()}</b> la orden <b>{confirmar?.orden.numero}</b>?
            </Typography>
            {confirmar?.estado === 'CERRADA' && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12.5 }}>
                El cierre es definitivo. El sistema verificará que no existan ejecuciones abiertas.
              </Alert>
            )}
            {confirmar?.estado === 'CANCELADA' && (
              <Alert severity="error" sx={{ mt: 1.5, fontSize: 12.5 }}>La cancelación es definitiva y queda registrada.</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setConfirmar(null)}>Volver</Button>
            <Button variant="contained" disabled={mutEstado.isPending}
              onClick={() => confirmar && mutEstado.mutate({ id: confirmar.orden.id, estado: confirmar.estado })}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Confirmar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo detalle de orden ── */}
        <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Orden {detalle?.numero}
              <Chip size="small" label={detalle?.estado.replace(/_/g, ' ')} sx={{ ml: 1.5, fontWeight: 700, fontSize: 10, color: ESTADO_STYLE[detalle?.estado ?? 'PLANEADA']?.color, bgcolor: ESTADO_STYLE[detalle?.estado ?? 'PLANEADA']?.bg }} />
            </span>
            <IconButton size="small" onClick={() => setDetalle(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {detalle && (
              <>
                <Grid container spacing={2} mb={2}>
                  {[
                    ['Producto', `${producto(detalle.producto_id)?.codigo ?? ''} ${producto(detalle.producto_id)?.nombre ?? ''}`],
                    ['Línea', linea(detalle.linea_id)?.nombre ?? '—'],
                    ['Planificado', detalle.cantidad_planificada.toLocaleString('es-CO')],
                    ['Producido', detalle.cantidad_producida.toLocaleString('es-CO')],
                    ['Scrap', detalle.cantidad_scrap.toLocaleString('es-CO')],
                    ['Prioridad', detalle.prioridad],
                  ].map(([l, v]) => (
                    <Grid key={l as string} size={{ xs: 6, sm: 4, md: 2 }}>
                      <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase">{l}</Typography>
                      <Typography fontSize={13.5} fontWeight={600}>{v}</Typography>
                    </Grid>
                  ))}
                </Grid>

                <Typography fontWeight={700} fontSize={13.5} mb={1}>Ejecuciones ({ejecuciones.length})</Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead><TableRow>{['ID', 'Turno', 'Estado', 'Producido', 'Scrap'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {ejecuciones.map(e => (
                      <TableRow key={e.id} hover>
                        <TableCell>#{e.id}</TableCell><TableCell>{e.turno}</TableCell>
                        <TableCell><Chip size="small" label={e.estado} color={e.estado === 'COMPLETADA' ? 'success' : e.estado === 'EN_PROGRESO' ? 'info' : 'default'} /></TableCell>
                        <TableCell>{e.cantidad_producida.toLocaleString('es-CO')}</TableCell>
                        <TableCell>{e.cantidad_scrap.toLocaleString('es-CO')}</TableCell>
                      </TableRow>
                    ))}
                    {ejecuciones.length === 0 && <TableRow><TableCell colSpan={5} align="center"><Typography fontSize={12} color="text.secondary" py={1}>Sin ejecuciones — se registran en MES · Ejecución</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>

                <Typography fontWeight={700} fontSize={13.5} mb={1}>Inspecciones de calidad ({inspecciones.length})</Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead><TableRow>{['ID', 'Tipo', 'Resultado', 'Muestra', 'Defectos'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {inspecciones.map(i => (
                      <TableRow key={i.id} hover>
                        <TableCell>#{i.id}</TableCell><TableCell>{i.tipo.replace(/_/g, ' ')}</TableCell>
                        <TableCell><Chip size="small" label={i.resultado} color={i.resultado === 'APROBADO' ? 'success' : i.resultado === 'RECHAZADO' ? 'error' : i.resultado === 'CONDICIONAL' ? 'warning' : 'default'} /></TableCell>
                        <TableCell>{i.muestra_tam ?? '—'}</TableCell>
                        <TableCell sx={{ color: i.muestra_defectos > 0 ? '#DC2626' : 'inherit' }}>{i.muestra_defectos}</TableCell>
                      </TableRow>
                    ))}
                    {inspecciones.length === 0 && <TableRow><TableCell colSpan={5} align="center"><Typography fontSize={12} color="text.secondary" py={1}>Sin inspecciones registradas</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>

                <Typography fontWeight={700} fontSize={13.5} mb={1}>Scrap registrado ({scrap.length})</Typography>
                <Table size="small">
                  <TableHead><TableRow>{['ID', 'Tipo', 'Causa', 'Cantidad', 'Costo', 'Reprocesable'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {scrap.map(s => (
                      <TableRow key={s.id} hover>
                        <TableCell>#{s.id}</TableCell><TableCell>{s.tipo}</TableCell><TableCell>{s.causa}</TableCell>
                        <TableCell>{s.cantidad.toLocaleString('es-CO')}</TableCell>
                        <TableCell>{s.costo_total ? `$${s.costo_total.toLocaleString('es-CO')}` : '—'}</TableCell>
                        <TableCell>{s.es_reprocesable ? 'Sí' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {scrap.length === 0 && <TableRow><TableCell colSpan={6} align="center"><Typography fontSize={12} color="text.secondary" py={1}>Sin scrap registrado</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Layout>
  )
}
