import React, { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, TextField, IconButton, Tooltip,
} from '@mui/material'
import { AddShoppingCart, Visibility, Edit, Refresh } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import {
  getOrdenesCompra, getOrdenCompra, actualizarEstadoOrden,
  OrdenCompra, EstadoOrden,
} from '@/api/scm'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = `rgba(12,77,140,0.25)`

const ESTADO_META: Record<EstadoOrden, { label: string; color: string }> = {
  BORRADOR:         { label: 'Borrador',       color: '#64748b' },
  ENVIADA:          { label: 'Enviada',         color: '#3b82f6' },
  CONFIRMADA:       { label: 'Confirmada',      color: '#8b5cf6' },
  EN_TRANSITO:      { label: 'En Tránsito',     color: '#06b6d4' },
  RECIBIDA_PARCIAL: { label: 'Rcbd. Parcial',   color: '#f97316' },
  RECIBIDA:         { label: 'Recibida',         color: '#22c55e' },
  CERRADA:          { label: 'Cerrada',          color: '#475569' },
  CANCELADA:        { label: 'Cancelada',        color: '#6b7280' },
}

const TRANSICIONES: Partial<Record<EstadoOrden, EstadoOrden[]>> = {
  BORRADOR:         ['ENVIADA', 'CANCELADA'],
  ENVIADA:          ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA:       ['EN_TRANSITO', 'CANCELADA'],
  EN_TRANSITO:      ['RECIBIDA_PARCIAL', 'RECIBIDA'],
  RECIBIDA_PARCIAL: ['RECIBIDA'],
}

function fmt(val?: number) {
  if (val === undefined || val === null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const SX_SELECT = { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' } }

export default function SCMCompras() {
  const [ordenes, setOrdenes]         = useState<OrdenCompra[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrden | ''>('')
  const [detalle, setDetalle]         = useState<OrdenCompra | null>(null)
  const [loadingDet, setLoadingDet]   = useState(false)
  const [openEstado, setOpenEstado]   = useState<{ id: number; actual: EstadoOrden } | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOrden | ''>('')
  const [fechaReal, setFechaReal]     = useState('')
  const [saving, setSaving]           = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getOrdenesCompra({ estado: filtroEstado || undefined, page_size: 100 })
      .then(r => { setOrdenes(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [filtroEstado])

  useEffect(() => { load() }, [load])

  async function verDetalle(id: number) {
    setLoadingDet(true)
    const oc = await getOrdenCompra(id)
    setDetalle(oc); setLoadingDet(false)
  }

  async function handleCambiarEstado() {
    if (!openEstado || !nuevoEstado) return
    setSaving(true)
    try {
      await actualizarEstadoOrden(openEstado.id, nuevoEstado as EstadoOrden, fechaReal || undefined)
      setOpenEstado(null); setNuevoEstado(''); setFechaReal(''); load()
    } finally { setSaving(false) }
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AddShoppingCart sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Órdenes de Compra</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{total} orden{total !== 1 ? 'es' : ''} en el sistema</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as EstadoOrden | '')} displayEmpty sx={SX_SELECT}>
                <MenuItem value="">Todos los estados</MenuItem>
                {Object.entries(ESTADO_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <IconButton onClick={load} sx={{ color: 'rgba(255,255,255,0.5)' }}><Refresh /></IconButton>
          </Box>
        </Box>

        <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', py: 1.5, bgcolor: CARD_BG } }}>
                  <TableCell>NÚMERO</TableCell>
                  <TableCell>PROVEEDOR</TableCell>
                  <TableCell>PRIORIDAD</TableCell>
                  <TableCell align="right">SUBTOTAL</TableCell>
                  <TableCell align="right">IMPUESTOS</TableCell>
                  <TableCell align="right">TOTAL</TableCell>
                  <TableCell>ESTADO</TableCell>
                  <TableCell>ENTREGA EST.</TableCell>
                  <TableCell align="center">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, bgcolor: CARD_BG }}><CircularProgress size={28} sx={{ color: SCM_COLOR }} /></TableCell></TableRow>
                ) : ordenes.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'rgba(255,255,255,0.3)', fontSize: 13, bgcolor: CARD_BG }}>Sin órdenes de compra</TableCell></TableRow>
                ) : ordenes.map(o => {
                  const meta = ESTADO_META[o.estado]
                  const transiciones = TRANSICIONES[o.estado]
                  return (
                    <TableRow key={o.id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1.2, bgcolor: CARD_BG }, '&:hover td': { bgcolor: 'rgba(255,255,255,0.025) !important' } }}>
                      <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#5B9BD5' }}>{o.numero}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 13, color: '#fff' }}>{o.proveedor_nombre ?? `Prov. #${o.proveedor_id}`}</Typography></TableCell>
                      <TableCell>
                        <Chip label={o.prioridad} size="small" sx={{
                          bgcolor: o.prioridad === 'URGENTE' ? alpha('#ef4444', 0.15) : o.prioridad === 'ALTA' ? alpha('#f97316', 0.15) : alpha('#64748b', 0.12),
                          color: o.prioridad === 'URGENTE' ? '#ef4444' : o.prioridad === 'ALTA' ? '#f97316' : 'rgba(255,255,255,0.5)',
                          fontSize: 10, fontWeight: 700,
                        }} />
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{fmt(o.subtotal)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{fmt(o.impuestos)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{fmt(o.total)}</Typography></TableCell>
                      <TableCell><Chip label={meta.label} size="small" sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontSize: 10, fontWeight: 700 }} /></TableCell>
                      <TableCell><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{o.fecha_entrega_esperada ?? '—'}</Typography></TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => verDetalle(o.id)} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#5B9BD5' } }}><Visibility fontSize="small" /></IconButton></Tooltip>
                          {transiciones && transiciones.length > 0 && (
                            <Tooltip title="Cambiar estado"><IconButton size="small" onClick={() => { setOpenEstado({ id: o.id, actual: o.estado }); setNuevoEstado('') }} sx={{ color: '#f59e0b' }}><Edit fontSize="small" /></IconButton></Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Dialog detalle */}
        <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0A1628', color: '#fff' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Orden {detalle?.numero}</span>
            {detalle && <Chip label={ESTADO_META[detalle.estado].label} size="small" sx={{ bgcolor: alpha(ESTADO_META[detalle.estado].color, 0.2), color: ESTADO_META[detalle.estado].color }} />}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {loadingDet ? <CircularProgress sx={{ color: SCM_COLOR }} /> : detalle && (
              <Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  {[
                    ['Proveedor', detalle.proveedor_nombre ?? `#${detalle.proveedor_id}`],
                    ['Condiciones pago', detalle.condiciones_pago ?? '—'],
                    ['Entrega esperada', detalle.fecha_entrega_esperada ?? '—'],
                    ['Entrega real', detalle.fecha_entrega_real ?? '—'],
                  ].map(([k, v]) => (
                    <Box key={k}>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mb: 0.3 }}>{k}</Typography>
                      <Typography sx={{ fontSize: 13, color: '#fff' }}>{v}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', mb: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ítems</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { color: 'rgba(255,255,255,0.4)', fontSize: 11, py: 1 } }}>
                      <TableCell>Descripción</TableCell><TableCell align="right">Cantidad</TableCell><TableCell>Unidad</TableCell><TableCell align="right">P. Unitario</TableCell><TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalle.items.map((item, i) => (
                      <TableRow key={i} sx={{ '& td': { py: 0.8, color: '#fff', fontSize: 12 } }}>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell align="right">{item.cantidad}</TableCell>
                        <TableCell>{item.unidad}</TableCell>
                        <TableCell align="right">{fmt(item.precio_unitario)}</TableCell>
                        <TableCell align="right">{fmt((item as any).total ?? item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Subtotal: {fmt(detalle.subtotal)}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Impuestos: {fmt(detalle.impuestos)}</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>TOTAL: {fmt(detalle.total)}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDetalle(null)} sx={{ color: 'rgba(255,255,255,0.6)' }}>Cerrar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog cambiar estado */}
        <Dialog open={!!openEstado} onClose={() => setOpenEstado(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#0A1628', color: '#fff' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Cambiar estado de OC</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Nuevo estado</InputLabel>
              <Select value={nuevoEstado} label="Nuevo estado" onChange={e => setNuevoEstado(e.target.value as EstadoOrden)} sx={SX_SELECT}>
                {(TRANSICIONES[openEstado?.actual as EstadoOrden] ?? []).map(e => <MenuItem key={e} value={e}>{ESTADO_META[e].label}</MenuItem>)}
              </Select>
            </FormControl>
            {(nuevoEstado === 'RECIBIDA' || nuevoEstado === 'RECIBIDA_PARCIAL') && (
              <TextField label="Fecha entrega real" type="date" value={fechaReal} onChange={e => setFechaReal(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small"
                sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setOpenEstado(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleCambiarEstado} disabled={saving || !nuevoEstado} sx={{ bgcolor: SCM_COLOR }}>
              {saving ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
