import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, InputAdornment, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, DeleteSweep as DeleteSweepIcon, Search as SearchIcon,
  Download, ReportProblem as ReportProblemIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const TIPOS = ['NORMAL', 'REPROCESO', 'DESECHO_PELIGROSO', 'SUBPRODUCTO'] as const

const TIPO_STYLE: Record<string, { color: string; bg: string }> = {
  NORMAL:            { color: '#64748B', bg: '#F1F5F9' },
  REPROCESO:         { color: '#2563EB', bg: '#EFF6FF' },
  DESECHO_PELIGROSO: { color: '#DC2626', bg: '#FEF2F2' },
  SUBPRODUCTO:       { color: '#16A34A', bg: '#F0FDF4' },
}

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface ScrapItem {
  id: number; orden_id: number; tipo: string; causa: string; cantidad: number
  costo_total?: number | null; es_reprocesable: boolean
}
interface Orden { id: number; numero: string; producto_id: number; estado: string }
interface Producto { id: number; codigo: string; nombre: string; unidad_medida: string }

const EMPTY_FORM = {
  orden_id: '', producto_id: '', tipo: 'NORMAL', causa: '',
  cantidad: '', costo_unitario: '', es_reprocesable: 'no',
}

export default function MESScrap() {
  const qc = useQueryClient()
  const [filtroOrden, setFiltroOrden] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tried, setTried] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: registros = [], isLoading } = useQuery<ScrapItem[]>({
    queryKey: ['mes-scrap'], queryFn: () => api.get('/mes/scrap').then(r => r.data),
  })
  const { data: ordenes = [] } = useQuery<Orden[]>({
    queryKey: ['mes-ordenes'], queryFn: () => api.get('/mes/ordenes').then(r => r.data),
  })
  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data),
  })

  const orden = (id: number) => ordenes.find(o => o.id === id)
  const producto = (id?: number) => productos.find(p => p.id === id)
  const productoDeScrap = (s: ScrapItem) => producto(orden(s.orden_id)?.producto_id)

  // ─── Mutación ───────────────────────────────────────────────────────────────
  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/scrap', body),
    onSuccess: () => {
      toast.success('Scrap registrado — asociado a la orden')
      qc.invalidateQueries({ queryKey: ['mes-scrap'] })
      qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
      setNuevoOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar el scrap'),
  })

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const filtrados = useMemo(() => registros.filter(s => {
    if (filtroOrden && String(s.orden_id) !== filtroOrden) return false
    if (filtroTipo && s.tipo !== filtroTipo) return false
    if (busca.trim() && !s.causa.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  }), [registros, filtroOrden, filtroTipo, busca])

  const resumen = useMemo(() => {
    const totalUnidades = filtrados.reduce((a, s) => a + s.cantidad, 0)
    const costoTotal = filtrados.reduce((a, s) => a + (s.costo_total ?? 0), 0)
    const reprocesables = filtrados.reduce((a, s) => a + (s.es_reprocesable ? s.cantidad : 0), 0)
    const pctReprocesable = totalUnidades > 0 ? Math.round(reprocesables / totalUnidades * 100) : 0
    const peligrosos = filtrados.filter(s => s.tipo === 'DESECHO_PELIGROSO').length
    return { totalUnidades, costoTotal, pctReprocesable, peligrosos }
  }, [filtrados])

  const exportar = (tipo: 'pdf' | 'excel') => {
    const filas = filtrados.map(s => {
      const p = productoDeScrap(s)
      return {
        orden: orden(s.orden_id)?.numero ?? `#${s.orden_id}`,
        producto: p ? `${p.codigo} — ${p.nombre}` : '—',
        tipo: s.tipo.replace(/_/g, ' '),
        causa: s.causa,
        cantidad: s.cantidad,
        costo_total: s.costo_total ?? 0,
        reprocesable: s.es_reprocesable ? 'Sí' : 'No',
      }
    })
    const opts = { archivo: 'mes-scrap-no-conforme', titulo: 'MES — Scrap y salidas no conformes (ISO 9001 §8.7)', color: MES_COLOR, filas }
    tipo === 'pdf' ? exportarPDF(opts) : exportarExcel(opts)
  }

  // ─── Diálogo registrar ──────────────────────────────────────────────────────
  const abrirNuevo = () => { setForm({ ...EMPTY_FORM }); setTried(false); setNuevoOpen(true) }

  const elegirOrden = (id: string) => {
    const o = ordenes.find(x => String(x.id) === id)
    setForm(f => ({ ...f, orden_id: id, producto_id: o ? String(o.producto_id) : f.producto_id }))
  }

  const productoForm = producto(Number(form.producto_id))
  const invalidoOrden = tried && !form.orden_id
  const invalidoCausa = tried && !form.causa.trim()
  const invalidaCantidad = tried && (!form.cantidad || Number(form.cantidad) <= 0)
  const costoVivo = form.cantidad && form.costo_unitario
    ? Number(form.cantidad) * Number(form.costo_unitario) : null

  const registrar = () => {
    setTried(true)
    if (!form.orden_id || !form.producto_id || !form.causa.trim() || !form.cantidad || Number(form.cantidad) <= 0) return
    mutCrear.mutate({
      orden_id: Number(form.orden_id),
      producto_id: Number(form.producto_id),
      tipo: form.tipo,
      causa: form.causa.trim(),
      cantidad: Number(form.cantidad),
      unidad_medida: productoForm?.unidad_medida ?? 'UN',
      costo_unitario: form.costo_unitario ? Number(form.costo_unitario) : undefined,
      es_reprocesable: form.es_reprocesable === 'si',
    })
  }

  const tarjetas: { label: string; valor: string; color: string; alerta?: boolean }[] = [
    { label: 'Unidades scrap', valor: resumen.totalUnidades.toLocaleString('es-CO'), color: MES_DARK },
    { label: 'Costo total', valor: `$${resumen.costoTotal.toLocaleString('es-CO')}`, color: '#D97706' },
    { label: '% Reprocesable', valor: `${resumen.pctReprocesable}%`, color: '#2563EB' },
    { label: 'Desechos peligrosos', valor: String(resumen.peligrosos), color: resumen.peligrosos > 0 ? '#DC2626' : '#64748B', alerta: resumen.peligrosos > 0 },
  ]

  return (
    <Layout title="MES · Scrap y No Conforme">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <DeleteSweepIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Scrap y No Conforme</Typography>
              <Typography fontSize={12} color="text.secondary">
                Registro y control de salidas no conformes · ISO 9001 §8.7
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('pdf')} sx={{ textTransform: 'none' }}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportar('excel')} sx={{ textTransform: 'none' }}>Excel</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevo}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
              Registrar scrap
            </Button>
          </Stack>
        </Stack>

        {/* Mini-resumen */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {tarjetas.map(t => (
            <Grid key={t.label} size={{ xs: 6, sm: 3 }}>
              <Paper elevation={0} className="hover-lift"
                sx={{ p: 1.5, borderRadius: '12px', textAlign: 'center',
                  border: `1px solid ${t.alerta ? '#DC2626' : '#E5E7EB'}`,
                  bgcolor: t.alerta ? '#FEF2F2' : '#FFFFFF' }}>
                <Stack direction="row" justifyContent="center" alignItems="center" gap={0.5}>
                  {t.alerta && <ReportProblemIcon sx={{ fontSize: 18, color: '#DC2626' }} />}
                  <Typography fontSize={24} fontWeight={800} color={t.color} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {t.valor}
                  </Typography>
                </Stack>
                <Typography fontSize={10.5} fontWeight={700} color="text.secondary" letterSpacing="0.04em" textTransform="uppercase">
                  {t.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Filtros */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
          <TextField size="small" placeholder="Buscar por causa…" value={busca} onChange={e => setBusca(e.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
          <TextField select size="small" label="Orden" value={filtroOrden} onChange={e => setFiltroOrden(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">Todas las órdenes</MenuItem>
            {ordenes.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.numero}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Tipo" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">Todos</MenuItem>
            {TIPOS.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
          </TextField>
        </Stack>

        {/* Tabla */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['ID', 'Orden', 'Producto', 'Tipo', 'Causa', 'Cantidad', 'Costo total', 'Reprocesable'].map(h =>
                  <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map(s => {
                const st = TIPO_STYLE[s.tipo] ?? TIPO_STYLE.NORMAL
                const p = productoDeScrap(s)
                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ color: '#94A3B8' }}>#{s.id}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{orden(s.orden_id)?.numero ?? `#${s.orden_id}`}</TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600}>{p?.nombre ?? '—'}</Typography>
                      <Typography fontSize={11} color="text.secondary">{p?.codigo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.tipo.replace(/_/g, ' ')} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography fontSize={12.5}>{s.causa}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{s.cantidad.toLocaleString('es-CO')}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: (s.costo_total ?? 0) > 0 ? 700 : 400 }}>
                      {s.costo_total != null ? `$${s.costo_total.toLocaleString('es-CO')}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.es_reprocesable ? 'Sí' : 'No'}
                        sx={{ fontWeight: 700, fontSize: 10,
                          color: s.es_reprocesable ? '#2563EB' : '#64748B',
                          bgcolor: s.es_reprocesable ? alpha('#2563EB', 0.1) : '#F1F5F9' }} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={3}>
                    {isLoading ? 'Cargando…' : 'Sin registros de scrap. Use "Registrar scrap" para documentar una salida no conforme.'}
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Diálogo registrar scrap ── */}
        <Dialog open={nuevoOpen} onClose={() => setNuevoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Registrar scrap / salida no conforme</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Orden de producción *" size="small" fullWidth value={form.orden_id}
                  onChange={e => elegirOrden(e.target.value)}
                  error={invalidoOrden} helperText={invalidoOrden ? 'Seleccione la orden afectada' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {ordenes.map(o => {
                    const p = producto(o.producto_id)
                    return (
                      <MenuItem key={o.id} value={String(o.id)}>
                        {o.numero} — {p ? `${p.codigo} ${p.nombre}` : `producto #${o.producto_id}`}
                      </MenuItem>
                    )
                  })}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField select label="Producto *" size="small" fullWidth value={form.producto_id}
                  onChange={e => setForm(f => ({ ...f, producto_id: e.target.value }))}
                  disabled={!form.orden_id}
                  helperText={!form.orden_id ? 'Se autoselecciona al elegir la orden' : 'Puede cambiarlo si el scrap es de otro material'}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField select label="Tipo" size="small" fullWidth value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Causa *" size="small" fullWidth multiline minRows={2} value={form.causa}
                  onChange={e => setForm(f => ({ ...f, causa: e.target.value }))}
                  error={invalidoCausa}
                  helperText="La causa es obligatoria — alimenta el análisis de mejora continua" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Cantidad *" type="number" size="small" fullWidth value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                  error={invalidaCantidad} helperText={invalidaCantidad ? 'Debe ser mayor que cero' : ''}
                  InputProps={{ endAdornment: <InputAdornment position="end">{productoForm?.unidad_medida ?? 'UN'}</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Costo unitario" type="number" size="small" fullWidth value={form.costo_unitario}
                  onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText="Opcional" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="¿Reprocesable?" size="small" fullWidth value={form.es_reprocesable}
                  onChange={e => setForm(f => ({ ...f, es_reprocesable: e.target.value }))}>
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="si">Sí</MenuItem>
                </TextField>
              </Grid>
              {costoVivo != null && costoVivo > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper elevation={0} sx={{ p: 1.25, borderRadius: 2, border: '1px solid #E5E7EB', bgcolor: '#F8FAFC', textAlign: 'center' }}>
                    <Typography fontSize={11} fontWeight={700} color="#94A3B8" textTransform="uppercase">Costo total calculado</Typography>
                    <Typography fontSize={18} fontWeight={800} color="#D97706" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${costoVivo.toLocaleString('es-CO')}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  El scrap queda asociado a la orden y suma a sus contadores de no conforme.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNuevoOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCrear.isPending} onClick={registrar}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
