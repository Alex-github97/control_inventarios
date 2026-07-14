import React, { useState } from 'react'
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Stack, Chip, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  alpha, Divider, InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  AttachMoney, Add, Visibility, Edit, Send, CheckCircle,
  Cancel, CreditCard, ArrowForward, Download,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import { exportarPDF } from '@/utils/exportar'

const TMS_COLOR = '#0369A1'
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

// ─── Types ────────────────────────────────────────────────────────────────────
type LiqEstado = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'RECHAZADA'

interface Liquidacion {
  id: number
  viaje_codigo: string
  viaje_origen: string
  viaje_destino: string
  conductor: string
  periodo: string
  valor_flete: number
  bonificaciones: number
  descuentos: number
  anticipos: number
  estado: LiqEstado
  fecha_pago?: string
  notas?: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_LIQUIDACIONES_INIT: Liquidacion[] = [
  { id: 1, viaje_codigo: 'VJ-2024-001', viaje_origen: 'Bogotá', viaje_destino: 'Medellín', conductor: 'Carlos Rodríguez', periodo: '2024-06', valor_flete: 1800000, bonificaciones: 150000, descuentos: 50000, anticipos: 300000, estado: 'PAGADA', fecha_pago: '2024-06-10', notas: 'Pago completo' },
  { id: 2, viaje_codigo: 'VJ-2024-002', viaje_origen: 'Medellín', viaje_destino: 'Cali', conductor: 'Luis Hernández', periodo: '2024-06', valor_flete: 1500000, bonificaciones: 100000, descuentos: 0, anticipos: 200000, estado: 'APROBADA', notas: '' },
  { id: 3, viaje_codigo: 'VJ-2024-003', viaje_origen: 'Cali', viaje_destino: 'Barranquilla', conductor: 'Andrés Torres', periodo: '2024-06', valor_flete: 3200000, bonificaciones: 200000, descuentos: 80000, anticipos: 500000, estado: 'PENDIENTE', notas: 'Revisar descuentos' },
  { id: 4, viaje_codigo: 'VJ-2024-004', viaje_origen: 'Bogotá', viaje_destino: 'Bucaramanga', conductor: 'Pedro Martínez', periodo: '2024-06', valor_flete: 1700000, bonificaciones: 0, descuentos: 30000, anticipos: 150000, estado: 'PENDIENTE', notas: '' },
  { id: 5, viaje_codigo: 'VJ-2024-005', viaje_origen: 'Medellín', viaje_destino: 'Bogotá', conductor: 'Mario López', periodo: '2024-06', valor_flete: 1800000, bonificaciones: 120000, descuentos: 0, anticipos: 250000, estado: 'APROBADA', notas: '' },
  { id: 6, viaje_codigo: 'VJ-2024-006', viaje_origen: 'Bogotá', viaje_destino: 'Pereira', conductor: 'Felipe Ruiz', periodo: '2024-06', valor_flete: 1200000, bonificaciones: 80000, descuentos: 20000, anticipos: 100000, estado: 'BORRADOR', notas: 'En proceso de validación' },
  { id: 7, viaje_codigo: 'VJ-2024-007', viaje_origen: 'Cali', viaje_destino: 'Bogotá', conductor: 'Sergio Castro', periodo: '2024-06', valor_flete: 2000000, bonificaciones: 150000, descuentos: 50000, anticipos: 300000, estado: 'PAGADA', fecha_pago: '2024-06-12' },
  { id: 8, viaje_codigo: 'VJ-2024-008', viaje_origen: 'Barranquilla', viaje_destino: 'Medellín', conductor: 'Ricardo Vargas', periodo: '2024-06', valor_flete: 2500000, bonificaciones: 0, descuentos: 100000, anticipos: 400000, estado: 'RECHAZADA', notas: 'Documentos incompletos' },
  { id: 9, viaje_codigo: 'VJ-2024-009', viaje_origen: 'Bogotá', viaje_destino: 'Villavicencio', conductor: 'Héctor Moreno', periodo: '2024-06', valor_flete: 700000, bonificaciones: 50000, descuentos: 0, anticipos: 100000, estado: 'PAGADA', fecha_pago: '2024-06-08' },
  { id: 10, viaje_codigo: 'VJ-2024-010', viaje_origen: 'Medellín', viaje_destino: 'Santa Marta', conductor: 'Carlos Rodríguez', periodo: '2024-06', valor_flete: 2900000, bonificaciones: 200000, descuentos: 60000, anticipos: 500000, estado: 'PENDIENTE', notas: '' },
  { id: 11, viaje_codigo: 'VJ-2024-011', viaje_origen: 'Cali', viaje_destino: 'Cartagena', conductor: 'Luis Hernández', periodo: '2024-06', valor_flete: 3700000, bonificaciones: 250000, descuentos: 80000, anticipos: 600000, estado: 'BORRADOR', notas: '' },
  { id: 12, viaje_codigo: 'VJ-2024-012', viaje_origen: 'Bucaramanga', viaje_destino: 'Bogotá', conductor: 'Andrés Torres', periodo: '2024-06', valor_flete: 1600000, bonificaciones: 100000, descuentos: 40000, anticipos: 200000, estado: 'APROBADA', notas: '' },
  { id: 13, viaje_codigo: 'VJ-2024-013', viaje_origen: 'Pereira', viaje_destino: 'Medellín', conductor: 'Pedro Martínez', periodo: '2024-06', valor_flete: 900000, bonificaciones: 50000, descuentos: 0, anticipos: 100000, estado: 'PAGADA', fecha_pago: '2024-06-15' },
  { id: 14, viaje_codigo: 'VJ-2024-014', viaje_origen: 'Bogotá', viaje_destino: 'Cali', conductor: 'Mario López', periodo: '2024-06', valor_flete: 1950000, bonificaciones: 120000, descuentos: 30000, anticipos: 250000, estado: 'PENDIENTE', notas: 'Verificar bonificación' },
  { id: 15, viaje_codigo: 'VJ-2024-015', viaje_origen: 'Manizales', viaje_destino: 'Bogotá', conductor: 'Felipe Ruiz', periodo: '2024-06', valor_flete: 1400000, bonificaciones: 80000, descuentos: 20000, anticipos: 150000, estado: 'BORRADOR', notas: '' },
]

function calcTotal(l: { valor_flete: number; bonificaciones: number; descuentos: number; anticipos: number }) {
  return l.valor_flete + l.bonificaciones - l.descuentos - l.anticipos
}

function estadoChip(estado: LiqEstado) {
  const map: Record<LiqEstado, { label: string; color: 'default' | 'warning' | 'primary' | 'success' | 'error' }> = {
    BORRADOR: { label: 'Borrador', color: 'default' },
    PENDIENTE: { label: 'Pendiente', color: 'warning' },
    APROBADA: { label: 'Aprobada', color: 'primary' },
    PAGADA: { label: 'Pagada', color: 'success' },
    RECHAZADA: { label: 'Rechazada', color: 'error' },
  }
  const m = map[estado]
  return <Chip label={m.label} color={m.color} size="small" />
}

const VIAJES_SELECT = MOCK_LIQUIDACIONES_INIT.map(l => ({
  codigo: l.viaje_codigo, origen: l.viaje_origen, destino: l.viaje_destino, conductor: l.conductor,
}))

export default function TMSLiquidaciones() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>(MOCK_LIQUIDACIONES_INIT)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroConductor, setFiltroConductor] = useState('')
  const [openNueva, setOpenNueva] = useState(false)
  const [openVer, setOpenVer] = useState<Liquidacion | null>(null)
  const [openFechaPago, setOpenFechaPago] = useState<Liquidacion | null>(null)
  const [fechaPago, setFechaPago] = useState('')
  const [form, setForm] = useState({ viaje_codigo: '', conductor: '', periodo: '2024-06', valor_flete: 0, bonificaciones: 0, descuentos: 0, anticipos: 0, notas: '' })

  const conductores = [...new Set(liquidaciones.map(l => l.conductor))]

  const filtered = liquidaciones.filter(l => {
    if (filtroEstado && l.estado !== filtroEstado) return false
    if (filtroConductor && l.conductor !== filtroConductor) return false
    return true
  })

  // KPIs
  const totalPendiente = liquidaciones.filter(l => ['BORRADOR', 'PENDIENTE', 'APROBADA'].includes(l.estado)).reduce((s, l) => s + calcTotal(l), 0)
  const totalPagado = liquidaciones.filter(l => l.estado === 'PAGADA').reduce((s, l) => s + calcTotal(l), 0)
  const enProceso = liquidaciones.filter(l => l.estado === 'PENDIENTE').length
  const pendientesN = liquidaciones.filter(l => ['BORRADOR', 'PENDIENTE'].includes(l.estado)).length

  function changeEstado(id: number, nuevoEstado: LiqEstado, extra?: { fecha_pago?: string }) {
    setLiquidaciones(lqs => lqs.map(l => l.id === id ? { ...l, estado: nuevoEstado, ...extra } : l))
    const msgs: Record<LiqEstado, string> = { BORRADOR: '', PENDIENTE: 'Enviado a revisión', APROBADA: 'Liquidación aprobada', PAGADA: 'Marcada como pagada', RECHAZADA: 'Liquidación rechazada' }
    toast.success(msgs[nuevoEstado])
  }

  function guardarNueva() {
    if (!form.viaje_codigo || !form.conductor) { toast.error('Seleccione viaje y conductor'); return }
    const viajeInfo = VIAJES_SELECT.find(v => v.codigo === form.viaje_codigo)
    const nueva: Liquidacion = {
      id: liquidaciones.length + 1,
      viaje_codigo: form.viaje_codigo,
      viaje_origen: viajeInfo?.origen ?? '',
      viaje_destino: viajeInfo?.destino ?? '',
      conductor: form.conductor,
      periodo: form.periodo,
      valor_flete: form.valor_flete,
      bonificaciones: form.bonificaciones,
      descuentos: form.descuentos,
      anticipos: form.anticipos,
      estado: 'BORRADOR',
      notas: form.notas,
    }
    setLiquidaciones(lqs => [nueva, ...lqs])
    toast.success('Liquidación creada como Borrador')
    setOpenNueva(false)
    setForm({ viaje_codigo: '', conductor: '', periodo: '2024-06', valor_flete: 0, bonificaciones: 0, descuentos: 0, anticipos: 0, notas: '' })
  }

  const formTotal = calcTotal(form)

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <Box sx={{ bgcolor: alpha(TMS_COLOR, 0.1), borderRadius: 2, p: 1, display: 'flex' }}>
            <CreditCard sx={{ color: TMS_COLOR, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#0F172A">Liquidaciones TMS</Typography>
            <Typography variant="body2" color="text.secondary">Liquidaciones de conductores y viajes</Typography>
          </Box>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'Total por Pagar', value: fmt(totalPendiente), color: '#D97706' },
            { label: 'Pagado este Mes', value: fmt(totalPagado), color: '#059669' },
            { label: 'En Proceso', value: String(enProceso), color: TMS_COLOR },
            { label: 'Liquidaciones Pendientes', value: String(pendientesN), color: '#7C3AED' },
          ].map(kpi => (
            <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${alpha(kpi.color, 0.3)}`, borderRadius: 2, bgcolor: alpha(kpi.color, 0.04) }}>
                <Typography fontSize={12} color="text.secondary">{kpi.label}</Typography>
                <Typography variant="h6" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Toolbar */}
        <Stack direction="row" gap={2} mb={2} flexWrap="wrap" alignItems="center">
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenNueva(true)} sx={{ bgcolor: TMS_COLOR }}>
            Nueva Liquidación
          </Button>
          <TextField select size="small" label="Estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Todos</MenuItem>
            {['BORRADOR', 'PENDIENTE', 'APROBADA', 'PAGADA', 'RECHAZADA'].map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Conductor" value={filtroConductor} onChange={e => setFiltroConductor(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {conductores.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Stack>

        {/* Tabla */}
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell><b>ID</b></TableCell>
                  <TableCell><b>Viaje</b></TableCell>
                  <TableCell><b>Conductor</b></TableCell>
                  <TableCell><b>Período</b></TableCell>
                  <TableCell align="right"><b>Flete</b></TableCell>
                  <TableCell align="right"><b>Bonif.</b></TableCell>
                  <TableCell align="right"><b>Desc.</b></TableCell>
                  <TableCell align="right"><b>Anticipos</b></TableCell>
                  <TableCell align="right"><b>Total a Pagar</b></TableCell>
                  <TableCell><b>Estado</b></TableCell>
                  <TableCell><b>Acciones</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(l => {
                  const total = calcTotal(l)
                  return (
                    <TableRow key={l.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>#{l.id}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={0.4}>
                          <Typography fontSize={11} fontWeight={700}>{l.viaje_codigo}</Typography>
                          <ArrowForward sx={{ fontSize: 10, color: TMS_COLOR }} />
                          <Typography fontSize={10} color="text.secondary">{l.viaje_destino}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{l.conductor}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{l.periodo}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(l.valor_flete)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, color: 'success.main' }}>{l.bonificaciones > 0 ? `+${fmt(l.bonificaciones)}` : '—'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, color: l.descuentos > 0 ? 'error.main' : 'text.primary' }}>{l.descuentos > 0 ? `-${fmt(l.descuentos)}` : '—'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, color: l.anticipos > 0 ? 'warning.main' : 'text.primary' }}>{l.anticipos > 0 ? `-${fmt(l.anticipos)}` : '—'}</TableCell>
                      <TableCell align="right"><Typography fontSize={12} fontWeight={700} color={TMS_COLOR}>{fmt(total)}</Typography></TableCell>
                      <TableCell>{estadoChip(l.estado)}</TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.3}>
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" onClick={() => setOpenVer(l)}><Visibility fontSize="small" /></IconButton>
                          </Tooltip>
                          {l.estado === 'BORRADOR' && (
                            <Tooltip title="Enviar a Revisión">
                              <IconButton size="small" onClick={() => changeEstado(l.id, 'PENDIENTE')} sx={{ color: 'warning.main' }}><Send fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                          {l.estado === 'PENDIENTE' && (
                            <>
                              <Tooltip title="Aprobar">
                                <IconButton size="small" onClick={() => changeEstado(l.id, 'APROBADA')} sx={{ color: 'primary.main' }}><CheckCircle fontSize="small" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Rechazar">
                                <IconButton size="small" onClick={() => changeEstado(l.id, 'RECHAZADA')} sx={{ color: 'error.main' }}><Cancel fontSize="small" /></IconButton>
                              </Tooltip>
                            </>
                          )}
                          {l.estado === 'APROBADA' && (
                            <Tooltip title="Marcar como Pagada">
                              <IconButton size="small" onClick={() => { setOpenFechaPago(l); setFechaPago('') }} sx={{ color: 'success.main' }}><AttachMoney fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* ── Dialog Nueva Liquidación ── */}
        <Dialog open={openNueva} onClose={() => setOpenNueva(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nueva Liquidación</DialogTitle>
          <DialogContent>
            <Stack gap={2} mt={1}>
              <TextField select label="Viaje *" value={form.viaje_codigo} onChange={e => {
                const v = VIAJES_SELECT.find(vs => vs.codigo === e.target.value)
                setForm(f => ({ ...f, viaje_codigo: e.target.value, conductor: v?.conductor ?? f.conductor }))
              }}>
                {VIAJES_SELECT.slice(0, 10).map(v => (
                  <MenuItem key={v.codigo} value={v.codigo}>{v.codigo} | {v.origen} → {v.destino}</MenuItem>
                ))}
              </TextField>
              <TextField label="Conductor" value={form.conductor} disabled />
              <TextField label="Período (ej: 2024-06)" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} />
              <Stack direction="row" gap={2}>
                <TextField label="Valor Flete" type="number" value={form.valor_flete} onChange={e => setForm(f => ({ ...f, valor_flete: Number(e.target.value) }))} fullWidth />
                <TextField label="Bonificaciones" type="number" value={form.bonificaciones} onChange={e => setForm(f => ({ ...f, bonificaciones: Number(e.target.value) }))} fullWidth />
              </Stack>
              <Stack direction="row" gap={2}>
                <TextField label="Descuentos" type="number" value={form.descuentos} onChange={e => setForm(f => ({ ...f, descuentos: Number(e.target.value) }))} fullWidth />
                <TextField label="Anticipos" type="number" value={form.anticipos} onChange={e => setForm(f => ({ ...f, anticipos: Number(e.target.value) }))} fullWidth />
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>Total a Pagar:</Typography>
                <Typography fontWeight={700} fontSize={18} color={formTotal >= 0 ? TMS_COLOR : 'error.main'}>{fmt(formTotal)}</Typography>
              </Stack>
              <TextField label="Notas" multiline rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              <Typography fontSize={11} color="text.secondary">Estado inicial: BORRADOR</Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNueva(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarNueva} sx={{ bgcolor: TMS_COLOR }}>Crear Liquidación</Button>
          </DialogActions>
        </Dialog>

        {/* ── Dialog Ver Liquidación ── */}
        <Dialog open={!!openVer} onClose={() => setOpenVer(null)} maxWidth="sm" fullWidth>
          {openVer && (
            <>
              <DialogTitle>Liquidación #{openVer.id}</DialogTitle>
              <DialogContent>
                <Stack gap={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary" fontSize={13}>Viaje:</Typography>
                    <Typography fontWeight={600} fontSize={13}>{openVer.viaje_codigo} | {openVer.viaje_origen} → {openVer.viaje_destino}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary" fontSize={13}>Conductor:</Typography>
                    <Typography fontWeight={600} fontSize={13}>{openVer.conductor}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary" fontSize={13}>Período:</Typography>
                    <Typography fontWeight={600} fontSize={13}>{openVer.periodo}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary" fontSize={13}>Estado:</Typography>
                    {estadoChip(openVer.estado)}
                  </Stack>
                  {openVer.fecha_pago && <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary" fontSize={13}>Fecha de Pago:</Typography>
                    <Typography fontWeight={600} fontSize={13}>{openVer.fecha_pago}</Typography>
                  </Stack>}
                  <Divider />
                  {[
                    { label: 'Valor Flete', value: fmt(openVer.valor_flete), color: 'text.primary' },
                    { label: 'Bonificaciones', value: `+${fmt(openVer.bonificaciones)}`, color: 'success.main' },
                    { label: 'Descuentos', value: `-${fmt(openVer.descuentos)}`, color: 'error.main' },
                    { label: 'Anticipos', value: `-${fmt(openVer.anticipos)}`, color: 'warning.main' },
                  ].map(row => (
                    <Stack key={row.label} direction="row" justifyContent="space-between">
                      <Typography fontSize={13}>{row.label}</Typography>
                      <Typography fontSize={13} color={row.color}>{row.value}</Typography>
                    </Stack>
                  ))}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={700}>Total a Pagar:</Typography>
                    <Typography fontWeight={700} fontSize={16} color={TMS_COLOR}>{fmt(calcTotal(openVer))}</Typography>
                  </Stack>
                  {openVer.notas && <Typography fontSize={12} color="text.secondary" mt={1}><b>Notas:</b> {openVer.notas}</Typography>}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button startIcon={<Download />} onClick={() => exportarPDF({
                  archivo: `liquidacion-${openVer.viaje_codigo}`,
                  titulo: `Liquidación ${openVer.viaje_codigo}`,
                  subtitulo: `${openVer.conductor} · ${openVer.periodo}`,
                  color: TMS_COLOR,
                  columnas: [{ key: 'campo', header: 'Concepto' }, { key: 'valor', header: 'Valor' }],
                  filas: [
                    { campo: 'Viaje', valor: `${openVer.viaje_codigo} | ${openVer.viaje_origen} → ${openVer.viaje_destino}` },
                    { campo: 'Conductor', valor: openVer.conductor },
                    { campo: 'Período', valor: openVer.periodo },
                    { campo: 'Estado', valor: openVer.estado },
                    { campo: 'Fecha de pago', valor: openVer.fecha_pago || '—' },
                    { campo: 'Valor flete', valor: fmt(openVer.valor_flete) },
                    { campo: 'Bonificaciones', valor: `+${fmt(openVer.bonificaciones)}` },
                    { campo: 'Descuentos', valor: `-${fmt(openVer.descuentos)}` },
                    { campo: 'Anticipos', valor: `-${fmt(openVer.anticipos)}` },
                    { campo: 'Total a pagar', valor: fmt(calcTotal(openVer)) },
                  ],
                })}>Descargar</Button>
                <Button onClick={() => setOpenVer(null)}>Cerrar</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* ── Dialog Fecha de Pago ── */}
        <Dialog open={!!openFechaPago} onClose={() => setOpenFechaPago(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Marcar como Pagada</DialogTitle>
          <DialogContent>
            <Stack gap={2} mt={1}>
              <Typography fontSize={13}>Liquidación #{openFechaPago?.id} — {openFechaPago?.conductor}</Typography>
              <TextField label="Fecha de Pago *" type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFechaPago(null)}>Cancelar</Button>
            <Button variant="contained" onClick={() => {
              if (!fechaPago) { toast.error('Ingrese la fecha de pago'); return }
              changeEstado(openFechaPago!.id, 'PAGADA', { fecha_pago: fechaPago })
              setOpenFechaPago(null)
            }} sx={{ bgcolor: TMS_COLOR }}>Confirmar Pago</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
