import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Inventory2 as InventoryIcon, Add as AddIcon, SwapVert, Factory as FactoryIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const TIPOS_MOV = ['ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE'] as const
const MOV_STYLE: Record<string, { color: string; bg: string }> = {
  ENTRADA:       { color: '#16A34A', bg: '#F0FDF4' },
  SALIDA:        { color: '#DC2626', bg: '#FEF2F2' },
  TRANSFERENCIA: { color: '#2563EB', bg: '#EFF6FF' },
  AJUSTE:        { color: '#D97706', bg: '#FFFBEB' },
}

// ─── Tipos (contrato backend) ────────────────────────────────────────────────
interface WIP { id: number; orden_id: number; celda_id: number; producto_id: number; lote_id?: number | null; tipo_mov: string; cantidad: number; unidad_medida: string; observaciones?: string | null; fecha_mov?: string | null }
interface Saldo { celda_id: number; producto_id: number; saldo: number }
interface Consumo { id: number; orden_id: number; producto_id: number; lote_id?: number | null; cantidad_plan: number; cantidad_real: number; unidad_medida: string; operario_id?: number | null; fecha_consumo?: string | null }
interface Celda { id: number; linea_id: number; codigo: string; nombre: string }
interface Orden { id: number; numero: string; producto_id: number; estado: string }
interface Producto { id: number; codigo: string; nombre: string; unidad_medida: string }
interface Linea { id: number; codigo: string; nombre: string }
interface Operario { id: number; nombre: string; codigo?: string }
interface Lote { id: number; numero_lote: string; producto_id: number }

const fmtFecha = (s?: string | null) => { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO') }
const fmtNum = (n?: number | null) => n != null ? n.toLocaleString('es-CO') : '—'

const EMPTY_WIP = { orden_id: '', celda_id: '', producto_id: '', lote_id: '', tipo_mov: 'ENTRADA', cantidad: '', unidad_medida: '', observaciones: '' }
const EMPTY_CONS = { orden_id: '', producto_id: '', lote_id: '', cantidad_plan: '', cantidad_real: '', operario_id: '' }
const EMPTY_CELDA = { linea_id: '', codigo: '', nombre: '' }

export default function MESInventario() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [filtroCelda, setFiltroCelda] = useState('')
  const [filtroOrden, setFiltroOrden] = useState('')
  const [wipOpen, setWipOpen] = useState(false)
  const [consOpen, setConsOpen] = useState(false)
  const [wipForm, setWipForm] = useState({ ...EMPTY_WIP })
  const [consForm, setConsForm] = useState({ ...EMPTY_CONS })
  const [celdaForm, setCeldaForm] = useState({ ...EMPTY_CELDA })
  const [tried, setTried] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: wip = [] } = useQuery<WIP[]>({ queryKey: ['mes-wip'], queryFn: () => api.get('/mes/wip').then(r => r.data) })
  const { data: saldos = [] } = useQuery<Saldo[]>({ queryKey: ['mes-wip-saldos'], queryFn: () => api.get('/mes/wip/saldos').then(r => r.data) })
  const { data: consumos = [] } = useQuery<Consumo[]>({ queryKey: ['mes-consumos'], queryFn: () => api.get('/mes/consumos').then(r => r.data) })
  const { data: celdas = [] } = useQuery<Celda[]>({ queryKey: ['mes-celdas'], queryFn: () => api.get('/mes/celdas').then(r => r.data) })
  const { data: ordenes = [] } = useQuery<Orden[]>({ queryKey: ['mes-ordenes'], queryFn: () => api.get('/mes/ordenes').then(r => r.data) })
  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data) })
  const { data: lineas = [] } = useQuery<Linea[]>({ queryKey: ['mes-lineas'], queryFn: () => api.get('/mes/lineas').then(r => r.data) })
  const { data: operarios = [] } = useQuery<Operario[]>({ queryKey: ['mes-operarios'], queryFn: () => api.get('/mes/operarios').then(r => r.data) })
  const { data: lotes = [] } = useQuery<Lote[]>({ queryKey: ['mes-lotes'], queryFn: () => api.get('/mes/lotes').then(r => r.data) })

  const prod = (id: number) => productos.find(p => p.id === id)
  const celda = (id: number) => celdas.find(c => c.id === id)
  const orden = (id: number) => ordenes.find(o => o.id === id)
  const operario = (id?: number | null) => operarios.find(o => o.id === id)
  const ordenesElegibles = ordenes.filter(o => o.estado === 'LIBERADA' || o.estado === 'EN_EJECUCION')

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutWip = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/mes/wip', b),
    onSuccess: () => { toast.success('Movimiento WIP registrado'); qc.invalidateQueries({ queryKey: ['mes-wip'] }); qc.invalidateQueries({ queryKey: ['mes-wip-saldos'] }); setWipOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar WIP'),
  })
  const mutCons = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/mes/consumos', b),
    onSuccess: () => { toast.success('Consumo registrado'); qc.invalidateQueries({ queryKey: ['mes-consumos'] }); setConsOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar consumo'),
  })
  const mutCelda = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/mes/celdas', b),
    onSuccess: () => { toast.success('Celda creada'); qc.invalidateQueries({ queryKey: ['mes-celdas'] }); setCeldaForm({ ...EMPTY_CELDA }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear celda'),
  })

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const wipFiltrado = useMemo(() => wip.filter(w => !filtroCelda || String(w.celda_id) === filtroCelda), [wip, filtroCelda])
  const consFiltrado = useMemo(() => consumos.filter(c => !filtroOrden || String(c.orden_id) === filtroOrden), [consumos, filtroOrden])

  const abrirWip = () => { setWipForm({ ...EMPTY_WIP }); setTried(false); setWipOpen(true) }
  const abrirCons = () => { setConsForm({ ...EMPTY_CONS }); setTried(false); setConsOpen(true) }

  const crearWip = () => {
    setTried(true)
    if (!wipForm.orden_id || !wipForm.celda_id || !wipForm.producto_id || !wipForm.cantidad || Number(wipForm.cantidad) <= 0) return
    mutWip.mutate({
      orden_id: Number(wipForm.orden_id), celda_id: Number(wipForm.celda_id), producto_id: Number(wipForm.producto_id),
      lote_id: wipForm.lote_id ? Number(wipForm.lote_id) : undefined, tipo_mov: wipForm.tipo_mov,
      cantidad: Number(wipForm.cantidad), unidad_medida: wipForm.unidad_medida || prod(Number(wipForm.producto_id))?.unidad_medida || 'UN',
      observaciones: wipForm.observaciones || undefined,
    })
  }
  const crearCons = () => {
    setTried(true)
    if (!consForm.orden_id || !consForm.producto_id || !consForm.cantidad_plan || Number(consForm.cantidad_plan) <= 0) return
    mutCons.mutate({
      orden_id: Number(consForm.orden_id), producto_id: Number(consForm.producto_id),
      lote_id: consForm.lote_id ? Number(consForm.lote_id) : undefined,
      cantidad_plan: Number(consForm.cantidad_plan), cantidad_real: consForm.cantidad_real ? Number(consForm.cantidad_real) : 0,
      unidad_medida: prod(Number(consForm.producto_id))?.unidad_medida || 'UN',
      operario_id: consForm.operario_id ? Number(consForm.operario_id) : undefined,
    })
  }

  const cumplimiento = (plan: number, real: number) => plan > 0 ? Math.round(real / plan * 100) : 0

  return (
    <Layout title="MES · Inventario en Proceso (WIP)">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <InventoryIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Inventario en Proceso (WIP)</Typography>
              <Typography fontSize={12} color="text.secondary">Material en proceso por celda de trabajo y consumos contra la orden</Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={abrirCons} sx={{ textTransform: 'none', fontWeight: 700 }}>Registrar consumo</Button>
            <Button variant="contained" startIcon={<SwapVert />} onClick={abrirWip} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Movimiento WIP</Button>
          </Stack>
        </Stack>

        {/* Tabs */}
        <Stack direction="row" gap={1} mb={2.5} flexWrap="wrap">
          {['Saldos WIP', 'Movimientos WIP', 'Consumos de material'].map((l, i) => (
            <Button key={l} onClick={() => setTab(i)} variant={tab === i ? 'contained' : 'text'} size="small"
              sx={{ textTransform: 'none', fontWeight: 700, ...(tab === i ? { bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } } : { color: 'text.secondary' }) }}>
              {l}
            </Button>
          ))}
        </Stack>

        {/* ── Tab 0: Saldos ── */}
        {tab === 0 && (
          celdas.length === 0 ? (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                <FactoryIcon sx={{ color: MES_DARK }} /><Typography fontWeight={700}>Cree una celda de trabajo para empezar</Typography>
              </Stack>
              <Alert severity="info" sx={{ mb: 2 }}>Las celdas de trabajo son el prerequisito del WIP: el material en proceso se acumula por celda.</Alert>
              <Grid container spacing={1.5} alignItems="center">
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField select label="Línea *" size="small" fullWidth value={celdaForm.linea_id} onChange={e => setCeldaForm(f => ({ ...f, linea_id: e.target.value }))}>
                    <MenuItem value="">Seleccionar…</MenuItem>
                    {lineas.map(l => <MenuItem key={l.id} value={String(l.id)}>{l.codigo} — {l.nombre}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}><TextField label="Código *" size="small" fullWidth value={celdaForm.codigo} onChange={e => setCeldaForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
                <Grid size={{ xs: 6, sm: 4 }}><TextField label="Nombre *" size="small" fullWidth value={celdaForm.nombre} onChange={e => setCeldaForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <Button variant="contained" fullWidth disabled={!celdaForm.linea_id || !celdaForm.codigo || !celdaForm.nombre || mutCelda.isPending}
                    onClick={() => mutCelda.mutate({ linea_id: Number(celdaForm.linea_id), codigo: celdaForm.codigo, nombre: celdaForm.nombre })}
                    sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Crear</Button>
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <Grid container spacing={1.5} className="anim-stagger">
              {saldos.length === 0 && <Grid size={{ xs: 12 }}><Alert severity="info">Sin saldos de WIP. Registre movimientos de entrada en las celdas.</Alert></Grid>}
              {saldos.map(s => (
                <Grid key={`${s.celda_id}-${s.producto_id}`} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Paper elevation={0} className="hover-lift" sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '14px' }}>
                    <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase">{celda(s.celda_id)?.codigo ?? `Celda ${s.celda_id}`}</Typography>
                    <Typography className="text-gradient" fontSize={26} fontWeight={800} color={s.saldo > 0 ? '#16A34A' : '#DC2626'} sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(s.saldo)}</Typography>
                    <Typography fontSize={12} color="text.secondary" noWrap>{prod(s.producto_id)?.nombre ?? `Prod #${s.producto_id}`}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )
        )}

        {/* ── Tab 1: Movimientos WIP ── */}
        {tab === 1 && (
          <>
            <TextField select size="small" label="Filtrar por celda" value={filtroCelda} onChange={e => setFiltroCelda(e.target.value)} sx={{ minWidth: 220, mb: 2 }}>
              <MenuItem value="">Todas las celdas</MenuItem>
              {celdas.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.codigo} — {c.nombre}</MenuItem>)}
            </TextField>
            <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>{['Fecha', 'Orden', 'Celda', 'Producto', 'Tipo', 'Cantidad', 'Observaciones'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {wipFiltrado.map(w => {
                    const st = MOV_STYLE[w.tipo_mov] ?? MOV_STYLE.AJUSTE
                    return (
                      <TableRow key={w.id} hover>
                        <TableCell sx={{ fontSize: 12 }}>{fmtFecha(w.fecha_mov)}</TableCell>
                        <TableCell>{orden(w.orden_id)?.numero ?? `#${w.orden_id}`}</TableCell>
                        <TableCell>{celda(w.celda_id)?.codigo ?? w.celda_id}</TableCell>
                        <TableCell>{prod(w.producto_id)?.nombre ?? `#${w.producto_id}`}</TableCell>
                        <TableCell><Chip size="small" label={w.tipo_mov} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(w.cantidad)} {w.unidad_medida}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{w.observaciones ?? '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                  {wipFiltrado.length === 0 && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={3}>Sin movimientos de WIP</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {/* ── Tab 2: Consumos ── */}
        {tab === 2 && (
          <>
            <TextField select size="small" label="Filtrar por orden" value={filtroOrden} onChange={e => setFiltroOrden(e.target.value)} sx={{ minWidth: 220, mb: 2 }}>
              <MenuItem value="">Todas las órdenes</MenuItem>
              {ordenes.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.numero}</MenuItem>)}
            </TextField>
            <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>{['Fecha', 'Orden', 'Insumo', 'Plan', 'Real', 'Cumplimiento', 'Operario'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {consFiltrado.map(c => {
                    const cmp = cumplimiento(c.cantidad_plan, c.cantidad_real)
                    const ok = cmp >= 95 && cmp <= 105
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontSize: 12 }}>{fmtFecha(c.fecha_consumo)}</TableCell>
                        <TableCell>{orden(c.orden_id)?.numero ?? `#${c.orden_id}`}</TableCell>
                        <TableCell>{prod(c.producto_id)?.nombre ?? `#${c.producto_id}`}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(c.cantidad_plan)} {c.unidad_medida}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(c.cantidad_real)} {c.unidad_medida}</TableCell>
                        <TableCell><Chip size="small" label={`${cmp}%`} color={ok ? 'success' : 'warning'} /></TableCell>
                        <TableCell>{operario(c.operario_id)?.nombre ?? '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                  {consFiltrado.length === 0 && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={3}>Sin consumos registrados</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {/* ── Diálogo movimiento WIP ── */}
        <Dialog open={wipOpen} onClose={() => setWipOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Registrar movimiento de WIP</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Orden *" size="small" fullWidth value={wipForm.orden_id} onChange={e => setWipForm(f => ({ ...f, orden_id: e.target.value }))}
                  error={tried && !wipForm.orden_id} helperText={tried && !wipForm.orden_id ? 'Seleccione la orden' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {ordenesElegibles.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.numero} · {prod(o.producto_id)?.nombre ?? ''}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Celda *" size="small" fullWidth value={wipForm.celda_id} onChange={e => setWipForm(f => ({ ...f, celda_id: e.target.value }))}
                  error={tried && !wipForm.celda_id} helperText={tried && !wipForm.celda_id ? 'Seleccione la celda' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {celdas.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.codigo} — {c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Producto *" size="small" fullWidth value={wipForm.producto_id} onChange={e => setWipForm(f => ({ ...f, producto_id: e.target.value, unidad_medida: prod(Number(e.target.value))?.unidad_medida ?? '' }))}
                  error={tried && !wipForm.producto_id} helperText={tried && !wipForm.producto_id ? 'Seleccione el producto' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Lote (opcional)" size="small" fullWidth value={wipForm.lote_id} onChange={e => setWipForm(f => ({ ...f, lote_id: e.target.value }))}>
                  <MenuItem value="">Sin lote</MenuItem>
                  {lotes.filter(l => !wipForm.producto_id || l.producto_id === Number(wipForm.producto_id)).map(l => <MenuItem key={l.id} value={String(l.id)}>{l.numero_lote}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Tipo de movimiento" size="small" fullWidth value={wipForm.tipo_mov} onChange={e => setWipForm(f => ({ ...f, tipo_mov: e.target.value }))}>
                  {TIPOS_MOV.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Cantidad *" type="number" size="small" fullWidth value={wipForm.cantidad} onChange={e => setWipForm(f => ({ ...f, cantidad: e.target.value }))}
                  error={tried && (!wipForm.cantidad || Number(wipForm.cantidad) <= 0)} helperText={tried && (!wipForm.cantidad || Number(wipForm.cantidad) <= 0) ? 'Mayor que cero' : ''}
                  InputProps={{ endAdornment: <InputAdornment position="end">{prod(Number(wipForm.producto_id))?.unidad_medida ?? 'UN'}</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12 }}><TextField label="Observaciones" size="small" fullWidth value={wipForm.observaciones} onChange={e => setWipForm(f => ({ ...f, observaciones: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12 }}><Alert severity="info" sx={{ fontSize: 12.5 }}>El WIP solo se mueve con la orden <b>liberada</b> o <b>en ejecución</b>.</Alert></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setWipOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutWip.isPending} onClick={crearWip} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo consumo ── */}
        <Dialog open={consOpen} onClose={() => setConsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Registrar consumo de material</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Orden *" size="small" fullWidth value={consForm.orden_id} onChange={e => setConsForm(f => ({ ...f, orden_id: e.target.value }))}
                  error={tried && !consForm.orden_id} helperText={tried && !consForm.orden_id ? 'Seleccione la orden' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {ordenes.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.numero}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Insumo *" size="small" fullWidth value={consForm.producto_id} onChange={e => setConsForm(f => ({ ...f, producto_id: e.target.value }))}
                  error={tried && !consForm.producto_id} helperText={tried && !consForm.producto_id ? 'Seleccione el insumo' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}><TextField label="Cantidad plan *" type="number" size="small" fullWidth value={consForm.cantidad_plan} onChange={e => setConsForm(f => ({ ...f, cantidad_plan: e.target.value }))}
                error={tried && (!consForm.cantidad_plan || Number(consForm.cantidad_plan) <= 0)} helperText={tried && (!consForm.cantidad_plan || Number(consForm.cantidad_plan) <= 0) ? 'Mayor que cero' : ''} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Cantidad real" type="number" size="small" fullWidth value={consForm.cantidad_real} onChange={e => setConsForm(f => ({ ...f, cantidad_real: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Operario (opcional)" size="small" fullWidth value={consForm.operario_id} onChange={e => setConsForm(f => ({ ...f, operario_id: e.target.value }))}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {operarios.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              {consForm.cantidad_plan && Number(consForm.cantidad_plan) > 0 && (
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography fontSize={13}>Cumplimiento: <b style={{ color: MES_DARK }}>{cumplimiento(Number(consForm.cantidad_plan), Number(consForm.cantidad_real || 0))}%</b></Typography>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setConsOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCons.isPending} onClick={crearCons} sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
