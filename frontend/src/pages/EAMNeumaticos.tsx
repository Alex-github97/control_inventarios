import { useState, useMemo } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip, Card, CardContent, Alert, TextField, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Stack, Tooltip, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TireRepair, Inventory2, Recycling, Add as AddIcon, Close as CloseIcon,
  History as HistoryIcon, SwapHoriz as SwapIcon, Warehouse as WarehouseIcon,
  DeleteForever, DirectionsCar,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'

const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Vehiculo { id: number; codigo: string; nombre: string; placa?: string; numero_ejes?: number | null; tiene_repuesto?: boolean }
interface Neumatico {
  id: number; codigo: string; marca?: string; referencia?: string; medida?: string; tipo?: string
  estado: string; activo_id?: number | null; posicion?: string | null; bodega_id?: number | null
  dano_id?: number | null; motivo_baja?: string | null; fecha_baja?: string | null
  km_actual: number; km_total: number; profundidad_actual?: number | null; profundidad_diseño?: number | null
  reencauches: number; costo?: number | null; proveedor?: string | null
}
interface Bodega { id: number; codigo: string; nombre: string; ubicacion?: string }
interface Dano { id: number; codigo: string; nombre: string; severidad: string; accion: string }
interface Posicion { codigo: string; label: string; eje: number; lado: string }
interface Movimiento { id: number; tipo_movimiento: string; posicion_origen?: string | null; posicion?: string | null; bodega_id?: number | null; km_odometro?: number | null; fecha?: string | null; tecnico?: string | null; observaciones?: string | null }

const EMPTY_NEUMATICO = { codigo: '', marca: '', referencia: '', medida: '', tipo: '', bodega_id: '', costo: '', proveedor: '', profundidad_diseño: '', profundidad_actual: '' }

const ESTADO_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  INSTALADO: 'success', ALMACENADO: 'info', REENCAUCHE: 'warning', BAJA: 'error',
}
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const fmtFecha = (s?: string | null) => { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO') }

export default function EAMNeumaticos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [vehId, setVehId] = useState<string>('')
  const [draggedTire, setDraggedTire] = useState<Neumatico | null>(null)
  const [overSlot, setOverSlot] = useState<string>('')

  // Diálogos
  const [movDialog, setMovDialog] = useState<null | { tire: Neumatico; tipo: string; posicion?: string }>(null)
  const [movForm, setMovForm] = useState({ fecha: nowLocal(), km_odometro: '', bodega_id: '', tecnico: '', observaciones: '' })
  const [bajaDialog, setBajaDialog] = useState<Neumatico | null>(null)
  const [bajaForm, setBajaForm] = useState({ fecha: nowLocal(), dano_id: '', motivo: '' })
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ ...EMPTY_NEUMATICO })
  const [histTire, setHistTire] = useState<Neumatico | null>(null)

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['eam-activos'], queryFn: () => api.get('/eam/activos').then(r => r.data) })
  const { data: neumaticos = [] } = useQuery<Neumatico[]>({ queryKey: ['eam-neumaticos'], queryFn: () => api.get('/eam/neumaticos').then(r => r.data) })
  const { data: bodegas = [] } = useQuery<Bodega[]>({ queryKey: ['eam-bodegas-neu'], queryFn: () => api.get('/eam/neumaticos/bodegas').then(r => r.data) })
  const { data: danos = [] } = useQuery<Dano[]>({ queryKey: ['eam-danos-neu'], queryFn: () => api.get('/eam/neumaticos/danos-catalogo').then(r => r.data) })
  const { data: layout = [] } = useQuery<Posicion[]>({
    queryKey: ['eam-layout', vehId],
    queryFn: () => api.get(`/eam/neumaticos/layout/${vehId}`).then(r => r.data),
    enabled: !!vehId,
  })
  const { data: historial = [] } = useQuery<Movimiento[]>({
    queryKey: ['eam-mov', histTire?.id],
    queryFn: () => api.get(`/eam/neumaticos/${histTire!.id}/movimientos`).then(r => r.data),
    enabled: !!histTire,
  })

  const veh = vehiculos.find(v => String(v.id) === vehId)
  const almacen = useMemo(() => neumaticos.filter(n => n.estado === 'ALMACENADO' || n.estado === 'REENCAUCHE'), [neumaticos])
  const descarte = useMemo(() => neumaticos.filter(n => n.estado === 'BAJA'), [neumaticos])
  const tireEn = (pos: string) => neumaticos.find(n => n.activo_id === veh?.id && n.posicion === pos)
  const bodegaNombre = (id?: number | null) => bodegas.find(b => b.id === id)?.nombre ?? '—'

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
    qc.invalidateQueries({ queryKey: ['eam-mov'] })
  }

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutMov = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos/movimiento', body),
    onSuccess: () => { toast.success('Movimiento registrado'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error en el movimiento'),
  })
  const mutNuevo = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos', body),
    onSuccess: () => { toast.success('Neumático registrado'); qc.invalidateQueries({ queryKey: ['eam-neumaticos'] }); setNuevoOpen(false); setNuevoForm({ ...EMPTY_NEUMATICO }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar'),
  })

  // ─── Drag & drop ──────────────────────────────────────────────────────────
  const soltarEnPosicion = (pos: string) => {
    setOverSlot('')
    if (!draggedTire || !veh) return
    const tipo = draggedTire.activo_id === veh.id ? 'ROTACION' : 'INSTALACION'
    setMovForm({ fecha: nowLocal(), km_odometro: '', bodega_id: '', tecnico: '', observaciones: '' })
    setMovDialog({ tire: draggedTire, tipo, posicion: pos })
    setDraggedTire(null)
  }
  const soltarEnBodega = () => {
    setOverSlot('')
    if (!draggedTire) return
    setMovForm({ fecha: nowLocal(), km_odometro: '', bodega_id: bodegas[0] ? String(bodegas[0].id) : '', tecnico: '', observaciones: '' })
    setMovDialog({ tire: draggedTire, tipo: 'DESMONTAJE' })
    setDraggedTire(null)
  }

  const confirmarMov = () => {
    if (!movDialog) return
    mutMov.mutate({
      neumatico_id: movDialog.tire.id,
      tipo_movimiento: movDialog.tipo,
      fecha: new Date(movForm.fecha).toISOString(),
      activo_id: (movDialog.tipo === 'INSTALACION' || movDialog.tipo === 'ROTACION') ? veh?.id : undefined,
      posicion: movDialog.posicion,
      bodega_id: movForm.bodega_id ? Number(movForm.bodega_id) : undefined,
      km_odometro: movForm.km_odometro ? Number(movForm.km_odometro) : undefined,
      tecnico: movForm.tecnico || undefined,
      observaciones: movForm.observaciones || undefined,
    })
    setMovDialog(null)
  }
  const confirmarBaja = () => {
    if (!bajaDialog) return
    mutMov.mutate({
      neumatico_id: bajaDialog.id, tipo_movimiento: 'BAJA',
      fecha: new Date(bajaForm.fecha).toISOString(),
      dano_id: bajaForm.dano_id ? Number(bajaForm.dano_id) : undefined,
      motivo: bajaForm.motivo || undefined,
    })
    setBajaDialog(null)
  }

  // ─── Tarjeta de llanta (draggable) ──────────────────────────────────────────
  const TireCard = ({ n, compact }: { n: Neumatico; compact?: boolean }) => (
    <Box
      draggable
      onDragStart={() => setDraggedTire(n)}
      onDragEnd={() => setDraggedTire(null)}
      sx={{
        p: compact ? 1 : 1.25, borderRadius: 2, border: '1px solid', borderColor: alpha(EAM_COLOR, 0.35),
        bgcolor: '#FFFFFF', cursor: 'grab', '&:active': { cursor: 'grabbing' },
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', '&:hover': { borderColor: EAM_COLOR },
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75}>
        <TireRepair sx={{ fontSize: 18, color: EAM_DARK }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontSize={12} fontWeight={700} noWrap>{n.codigo}</Typography>
          <Typography fontSize={10} color="text.secondary" noWrap>{n.marca} · {n.medida}</Typography>
        </Box>
      </Stack>
      {!compact && (
        <Stack direction="row" gap={0.5} mt={0.5} flexWrap="wrap">
          {n.profundidad_actual != null && <Chip size="small" label={`${n.profundidad_actual} mm`} sx={{ height: 18, fontSize: 9 }} />}
          {n.reencauches > 0 && <Chip size="small" label={`R${n.reencauches}`} color="warning" sx={{ height: 18, fontSize: 9 }} />}
          <Tooltip title="Historial"><IconButton size="small" onClick={() => setHistTire(n)} sx={{ p: 0.25 }}><HistoryIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Dar de baja"><IconButton size="small" color="error" onClick={() => { setBajaForm({ fecha: nowLocal(), dano_id: '', motivo: '' }); setBajaDialog(n) }} sx={{ p: 0.25 }}><DeleteForever sx={{ fontSize: 14 }} /></IconButton></Tooltip>
        </Stack>
      )}
    </Box>
  )

  // ─── Slot de posición (drop zone) ─────────────────────────────────────────
  const Slot = ({ pos }: { pos: Posicion }) => {
    const t = tireEn(pos.codigo)
    const activo = overSlot === pos.codigo
    return (
      <Box
        onDragOver={(e) => { e.preventDefault(); setOverSlot(pos.codigo) }}
        onDragLeave={() => setOverSlot('')}
        onDrop={() => soltarEnPosicion(pos.codigo)}
        sx={{
          width: 120, minHeight: 70, p: 0.75, borderRadius: 2,
          border: '2px dashed', borderColor: activo ? EAM_COLOR : t ? alpha(EAM_COLOR, 0.3) : '#CBD5E1',
          bgcolor: activo ? alpha(EAM_COLOR, 0.08) : t ? '#FFFFFF' : '#F8FAFC',
          transition: 'all .12s',
        }}
      >
        <Typography fontSize={9} fontWeight={700} color="text.secondary" mb={0.5}>{pos.label}</Typography>
        {t ? <TireCard n={t} compact /> : <Typography fontSize={10} color="text.disabled" textAlign="center" mt={1}>vacío</Typography>}
      </Box>
    )
  }

  const ejes = useMemo(() => {
    const map = new Map<number, Posicion[]>()
    layout.forEach(p => { if (p.eje > 0) { const a = map.get(p.eje) ?? []; a.push(p); map.set(p.eje, a) } })
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [layout])
  const repuesto = layout.find(p => p.codigo === 'REPUESTO')

  return (
    <Layout>
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <TireRepair sx={{ color: EAM_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={EAM_DARK}>Gestión de Neumáticos</Typography>
              <Typography fontSize={12} color="text.secondary">CMMS · Instalación, rotación, bodega, reencauche y descarte de llantas</Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Registrar llanta</Button>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E5E7EB', '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { bgcolor: EAM_COLOR } }}>
          <Tab icon={<DirectionsCar sx={{ fontSize: 18 }} />} iconPosition="start" label="Vehículo / Diagrama" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Bodega (${almacen.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Recycling sx={{ fontSize: 18 }} />} iconPosition="start" label={`Descarte (${descarte.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {/* ── TAB 0: Diagrama del vehículo ── */}
        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <TextField select fullWidth size="small" label="Vehículo" value={vehId} onChange={e => setVehId(e.target.value)} sx={{ mb: 2, maxWidth: 420 }}>
                    <MenuItem value="">Seleccionar vehículo…</MenuItem>
                    {vehiculos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.codigo} — {v.nombre}{v.placa ? ` (${v.placa})` : ''}</MenuItem>)}
                  </TextField>

                  {!veh ? (
                    <Alert severity="info">Selecciona un vehículo para ver el diagrama de llantas.</Alert>
                  ) : !veh.numero_ejes ? (
                    <Alert severity="warning">El vehículo <b>{veh.codigo}</b> no tiene configurado el número de ejes. Configúralo en <b>Activos / EAM</b> para generar el diagrama de posiciones.</Alert>
                  ) : (
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={1.5}>
                        {veh.numero_ejes} eje(s) · arrastra una llanta desde la bodega (derecha) a una posición, o entre posiciones para rotar.
                      </Typography>
                      <Stack spacing={2}>
                        {ejes.map(([eje, posics]) => (
                          <Paper key={eje} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFFFFF' }}>
                            <Typography fontSize={11} fontWeight={700} color={EAM_DARK} mb={1}>EJE {eje}{eje === 1 ? ' (direccional)' : ' (dual)'}</Typography>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                              <Stack direction="row" gap={1}>{posics.filter(p => p.lado === 'IZQ').map(p => <Slot key={p.codigo} pos={p} />)}</Stack>
                              <Box sx={{ width: 40, height: 6, bgcolor: '#94A3B8', borderRadius: 3 }} />
                              <Stack direction="row" gap={1}>{posics.filter(p => p.lado === 'DER').map(p => <Slot key={p.codigo} pos={p} />)}</Stack>
                            </Stack>
                          </Paper>
                        ))}
                        {repuesto && (
                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFFFFF', maxWidth: 160 }}>
                            <Typography fontSize={11} fontWeight={700} color="text.secondary" mb={1}>REPUESTO</Typography>
                            <Slot pos={repuesto} />
                          </Paper>
                        )}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Panel bodega / disponibles */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{ bgcolor: '#FFFFFF', borderTop: `3px solid ${EAM_COLOR}` }}
                onDragOver={(e) => { e.preventDefault(); setOverSlot('BODEGA') }}
                onDragLeave={() => setOverSlot('')}
                onDrop={soltarEnBodega}
              >
                <CardContent sx={{ bgcolor: overSlot === 'BODEGA' ? alpha(EAM_COLOR, 0.06) : undefined }}>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Inventory2 sx={{ color: EAM_DARK, fontSize: 20 }} />
                    <Typography fontWeight={700} fontSize={14}>Disponibles en almacén</Typography>
                  </Stack>
                  <Typography fontSize={11} color="text.secondary" mb={1.5}>Arrastra una llanta a una posición del vehículo para instalarla. Suelta aquí una llanta instalada para desmontarla a bodega.</Typography>
                  <Stack spacing={1} sx={{ maxHeight: 460, overflowY: 'auto', pr: 0.5 }}>
                    {almacen.length === 0 && <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>Sin llantas en almacén</Typography>}
                    {almacen.map(n => (
                      <Box key={n.id}>
                        <TireCard n={n} />
                        <Typography fontSize={9} color="text.secondary" mt={0.25}>{n.estado === 'REENCAUCHE' ? 'En reencauche' : bodegaNombre(n.bodega_id)}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ── TAB 1: Bodega ── */}
        {tab === 1 && (
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                  {['Código', 'Marca', 'Medida', 'Estado', 'Bodega', 'Prof. (mm)', 'Reencauches', 'Acciones'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {almacen.map(n => (
                    <TableRow key={n.id} hover>
                      <TableCell>{n.codigo}</TableCell>
                      <TableCell>{n.marca}</TableCell>
                      <TableCell>{n.medida}</TableCell>
                      <TableCell><Chip size="small" label={n.estado} color={ESTADO_COLOR[n.estado] ?? 'default'} /></TableCell>
                      <TableCell>{bodegaNombre(n.bodega_id)}</TableCell>
                      <TableCell>{n.profundidad_actual ?? '—'}</TableCell>
                      <TableCell>{n.reencauches}</TableCell>
                      <TableCell>
                        <Tooltip title="Historial"><IconButton size="small" onClick={() => setHistTire(n)}><HistoryIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        <Tooltip title="Dar de baja"><IconButton size="small" color="error" onClick={() => { setBajaForm({ fecha: nowLocal(), dano_id: '', motivo: '' }); setBajaDialog(n) }}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {almacen.length === 0 && <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={2}>Sin llantas en almacén</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}

        {/* ── TAB 2: Descarte ── */}
        {tab === 2 && (
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: alpha('#DC2626', 0.08) }}>
                  {['Código', 'Marca', 'Medida', 'Daño', 'Motivo', 'Fecha baja', 'Km total', 'Historial'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {descarte.map(n => (
                    <TableRow key={n.id} hover>
                      <TableCell>{n.codigo}</TableCell>
                      <TableCell>{n.marca}</TableCell>
                      <TableCell>{n.medida}</TableCell>
                      <TableCell>{danos.find(d => d.id === n.dano_id)?.nombre ?? '—'}</TableCell>
                      <TableCell>{n.motivo_baja ?? '—'}</TableCell>
                      <TableCell>{n.fecha_baja ?? '—'}</TableCell>
                      <TableCell>{n.km_total?.toLocaleString('es-CO')}</TableCell>
                      <TableCell><IconButton size="small" onClick={() => setHistTire(n)}><HistoryIcon sx={{ fontSize: 16 }} /></IconButton></TableCell>
                    </TableRow>
                  ))}
                  {descarte.length === 0 && <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={2}>La pila de descarte está vacía</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}

        {/* ── Diálogo movimiento (instalación/rotación/desmontaje) ── */}
        <Dialog open={!!movDialog} onClose={() => setMovDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {movDialog?.tipo === 'INSTALACION' ? 'Instalar llanta' : movDialog?.tipo === 'ROTACION' ? 'Rotar llanta' : 'Desmontar a bodega'}
            <Typography variant="caption" color="text.secondary" display="block">
              {movDialog?.tire.codigo}{movDialog?.posicion ? ` → ${movDialog.posicion}` : ''}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField label="Fecha y hora del movimiento *" type="datetime-local" size="small" fullWidth
                value={movForm.fecha} onChange={e => setMovForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              {(movDialog?.tipo === 'INSTALACION' || movDialog?.tipo === 'ROTACION') && (
                <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={movForm.km_odometro} onChange={e => setMovForm(f => ({ ...f, km_odometro: e.target.value }))} />
              )}
              {movDialog?.tipo === 'DESMONTAJE' && (
                <TextField select label="Bodega destino" size="small" fullWidth value={movForm.bodega_id} onChange={e => setMovForm(f => ({ ...f, bodega_id: e.target.value }))}>
                  <MenuItem value="">Sin bodega</MenuItem>
                  {bodegas.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>)}
                </TextField>
              )}
              <TextField label="Técnico" size="small" fullWidth value={movForm.tecnico} onChange={e => setMovForm(f => ({ ...f, tecnico: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={movForm.observaciones} onChange={e => setMovForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setMovDialog(null)}>Cancelar</Button>
            <Button variant="contained" onClick={confirmarMov} disabled={!movForm.fecha || mutMov.isPending} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Confirmar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo dar de baja ── */}
        <Dialog open={!!bajaDialog} onClose={() => setBajaDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Dar de baja / descartar
            <Typography variant="caption" color="text.secondary" display="block">{bajaDialog?.codigo}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={bajaForm.fecha} onChange={e => setBajaForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField select label="Daño / causa" size="small" fullWidth value={bajaForm.dano_id} onChange={e => setBajaForm(f => ({ ...f, dano_id: e.target.value }))}>
                <MenuItem value="">Sin especificar</MenuItem>
                {danos.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre} ({d.severidad})</MenuItem>)}
              </TextField>
              {danos.length === 0 && <Alert severity="info" sx={{ py: 0 }}>Configura el catálogo de daños en Configuración → EAM.</Alert>}
              <TextField label="Motivo / observación" size="small" fullWidth multiline rows={2} value={bajaForm.motivo} onChange={e => setBajaForm(f => ({ ...f, motivo: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBajaDialog(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={confirmarBaja} disabled={!bajaForm.fecha || mutMov.isPending}>Dar de baja</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo registrar llanta ── */}
        <Dialog open={nuevoOpen} onClose={() => setNuevoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Registrar neumático</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Código *" size="small" fullWidth value={nuevoForm.codigo} onChange={e => setNuevoForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Marca" size="small" fullWidth value={nuevoForm.marca} onChange={e => setNuevoForm(f => ({ ...f, marca: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Referencia" size="small" fullWidth value={nuevoForm.referencia} onChange={e => setNuevoForm(f => ({ ...f, referencia: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Medida" size="small" fullWidth value={nuevoForm.medida} onChange={e => setNuevoForm(f => ({ ...f, medida: e.target.value }))} placeholder="295/80R22.5" /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Bodega" size="small" fullWidth value={nuevoForm.bodega_id} onChange={e => setNuevoForm(f => ({ ...f, bodega_id: e.target.value }))}><MenuItem value="">Sin bodega</MenuItem>{bodegas.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Prof. diseño" type="number" size="small" fullWidth value={nuevoForm.profundidad_diseño} onChange={e => setNuevoForm(f => ({ ...f, profundidad_diseño: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Prof. actual" type="number" size="small" fullWidth value={nuevoForm.profundidad_actual} onChange={e => setNuevoForm(f => ({ ...f, profundidad_actual: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 6 }}><TextField label="Costo" type="number" size="small" fullWidth value={nuevoForm.costo} onChange={e => setNuevoForm(f => ({ ...f, costo: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 6 }}><TextField label="Proveedor" size="small" fullWidth value={nuevoForm.proveedor} onChange={e => setNuevoForm(f => ({ ...f, proveedor: e.target.value }))} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNuevoOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={!nuevoForm.codigo || mutNuevo.isPending} onClick={() => mutNuevo.mutate({
              codigo: nuevoForm.codigo, marca: nuevoForm.marca || undefined, referencia: nuevoForm.referencia || undefined,
              medida: nuevoForm.medida || undefined, estado: 'ALMACENADO',
              bodega_id: nuevoForm.bodega_id ? Number(nuevoForm.bodega_id) : undefined,
              profundidad_diseño: nuevoForm.profundidad_diseño ? Number(nuevoForm.profundidad_diseño) : undefined,
              profundidad_actual: nuevoForm.profundidad_actual ? Number(nuevoForm.profundidad_actual) : undefined,
              costo: nuevoForm.costo ? Number(nuevoForm.costo) : undefined, proveedor: nuevoForm.proveedor || undefined,
            })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo historial ── */}
        <Dialog open={!!histTire} onClose={() => setHistTire(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Historial — {histTire?.codigo}
            <IconButton onClick={() => setHistTire(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {historial.length === 0 ? <Typography color="text.secondary" py={2} textAlign="center">Sin movimientos registrados</Typography> : (
              <Table size="small">
                <TableHead><TableRow>{['Fecha/Hora', 'Movimiento', 'Origen', 'Destino', 'Técnico'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {historial.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{fmtFecha(m.fecha)}</TableCell>
                      <TableCell><Chip size="small" icon={<SwapIcon sx={{ fontSize: 14 }} />} label={m.tipo_movimiento} /></TableCell>
                      <TableCell>{m.posicion_origen ?? '—'}</TableCell>
                      <TableCell>{m.posicion ?? (m.bodega_id ? bodegaNombre(m.bodega_id) : '—')}</TableCell>
                      <TableCell>{m.tecnico ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Layout>
  )
}
