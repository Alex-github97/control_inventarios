import React, { useState } from 'react'
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, Grid, CircularProgress, Alert, LinearProgress, Tooltip,
  Card, CardContent,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Warning as WarnIcon, Shield as ShieldIcon, Sensors as CBMIcon,
  CalendarMonth as CalIcon, CheckCircle, Error as ErrorIcon,
  ArrowUpward, ArrowDownward,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'

const GF_COLOR = '#32AC5C'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TipoVehiculo { id: number; nombre: string }
interface Rutina { id: number; codigo: string; nombre: string }
interface Vehiculo { id: number; placa: string }
interface ModoFalla {
  id: number; sistema: string; subsistema?: string; funcion?: string
  falla_funcional?: string; modo_falla: string; efecto?: string; causa?: string
  severidad: number; ocurrencia: number; deteccion: number; rpn?: number
  accion_recomendada?: string; tipo_vehiculo_id?: number; rutina_correctiva_id?: number
  rutina_nombre?: string; activo: boolean
}
interface UmbralCBM {
  id: number; parametro: string; descripcion?: string; unidad?: string
  umbral_advertencia?: number; umbral_critico?: number; direccion: string
  vehiculo_id?: number; vehiculo_placa?: string
  tipo_vehiculo_id?: number; tipo_vehiculo_nombre?: string
  rutina_trigger_id?: number; rutina_nombre?: string; activo: boolean
}
interface ProximoMant {
  vehiculo_id: number; vehiculo_placa: string
  rutina_id: number; rutina_codigo: string; rutina_nombre: string
  secuencia_nombre?: string; tipo: string; nivel_criticidad: string
  medicion_actual?: number
  intervalo_km?: number; km_restantes?: number
  intervalo_dias?: number; dias_restantes?: number
  vencido: boolean
}

const SISTEMAS = ['Motor', 'Transmisión', 'Frenos', 'Suspensión', 'Eléctrico', 'Hidráulico', 'Carrocería', 'Neumáticos', 'Aire acondicionado', 'Combustible', 'Escape', 'Dirección']
const DIRECCIONES = ['MAYOR', 'MENOR']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function RpnChip({ rpn }: { rpn?: number }) {
  if (!rpn) return <Chip label="—" size="small" />
  const color = rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f97316' : rpn >= 50 ? '#f59e0b' : '#22c55e'
  const label = rpn >= 200 ? 'CRÍTICO' : rpn >= 100 ? 'ALTO' : rpn >= 50 ? 'MEDIO' : 'BAJO'
  return (
    <Tooltip title={`RPN = ${rpn} (${label})`}>
      <Chip label={rpn} size="small" sx={{ bgcolor: color, color: '#fff', fontWeight: 700, minWidth: 48 }} />
    </Tooltip>
  )
}

function ScoreCell({ val, label }: { val: number; label: string }) {
  const color = val >= 8 ? '#ef4444' : val >= 5 ? '#f97316' : '#22c55e'
  return (
    <Tooltip title={`${label}: ${val}/10`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{val}</Box>
      </Box>
    </Tooltip>
  )
}

function CritChip({ v }: { v: string }) {
  const map: Record<string, string> = { BAJA: '#22c55e', MEDIA: '#f59e0b', ALTA: '#f97316', CRITICA: '#ef4444' }
  return <Chip label={v} size="small" sx={{ bgcolor: map[v] || '#6b7280', color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — FMEA (Análisis de Modos de Falla)
// ═══════════════════════════════════════════════════════════════════════════════
function TabFMEA() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ModoFalla | null>(null)
  const [filterSistema, setFilterSistema] = useState('')

  const { data: modos = [], isLoading } = useQuery<ModoFalla[]>({ queryKey: ['flota-modos-falla'], queryFn: () => api.get('/flota/modos-falla/').then(r => r.data) })
  const { data: tiposVehiculo = [] } = useQuery<TipoVehiculo[]>({ queryKey: ['flota-tipos-vehiculo'], queryFn: () => api.get('/flota/tipos-vehiculo/').then(r => r.data) })
  const { data: rutinas = [] } = useQuery<Rutina[]>({ queryKey: ['flota-rutinas-list'], queryFn: () => api.get('/flota/rutinas/?activo=true').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/flota/modos-falla/${editing.id}`, d) : api.post('/flota/modos-falla/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-modos-falla'] }); toast.success('AMEF guardado'); setOpen(false) },
    onError: () => toast.error('Error al guardar'),
  })
  const delMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/modos-falla/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-modos-falla'] }); toast.success('Modo de falla eliminado') },
  })

  const filtered = modos.filter(m => !filterSistema || m.sistema === filterSistema)
  const totalCriticos = modos.filter(m => (m.rpn ?? 0) >= 200).length
  const totalAltos = modos.filter(m => (m.rpn ?? 0) >= 100 && (m.rpn ?? 0) < 200).length

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Paper variant="outlined" sx={{ px: 2, py: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ef4444' }} />
          <Typography variant="caption"><b>{totalCriticos}</b> modos críticos (RPN ≥ 200)</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f97316' }} />
          <Typography variant="caption"><b>{totalAltos}</b> modos altos (RPN 100–199)</Typography>
        </Paper>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sistema</InputLabel>
          <Select value={filterSistema} label="Sistema" onChange={e => setFilterSistema(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {SISTEMAS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: GF_COLOR }} onClick={() => { setEditing(null); setOpen(true) }}>
          Agregar modo de falla
        </Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F3F4F6' }}>
                <TableCell><b>Sistema</b></TableCell>
                <TableCell><b>Modo de Falla</b></TableCell>
                <TableCell><b>Efecto</b></TableCell>
                <TableCell align="center"><b>S</b></TableCell>
                <TableCell align="center"><b>O</b></TableCell>
                <TableCell align="center"><b>D</b></TableCell>
                <TableCell align="center"><b>RPN</b></TableCell>
                <TableCell><b>Acción</b></TableCell>
                <TableCell><b>Rutina correctiva</b></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id} hover sx={{ bgcolor: (m.rpn ?? 0) >= 200 ? '#FEF2F2' : undefined }}>
                  <TableCell>
                    <Typography variant="caption" fontWeight={700}>{m.sistema}</Typography>
                    {m.subsistema && <Typography variant="caption" display="block" color="text.secondary">{m.subsistema}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight={600}>{m.modo_falla}</Typography>
                    {m.causa && <Typography variant="caption" display="block" color="text.secondary">Causa: {m.causa}</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="caption">{m.efecto}</Typography></TableCell>
                  <TableCell align="center"><ScoreCell val={m.severidad} label="Severidad" /></TableCell>
                  <TableCell align="center"><ScoreCell val={m.ocurrencia} label="Ocurrencia" /></TableCell>
                  <TableCell align="center"><ScoreCell val={m.deteccion} label="Detección" /></TableCell>
                  <TableCell align="center"><RpnChip rpn={m.rpn} /></TableCell>
                  <TableCell><Typography variant="caption">{m.accion_recomendada}</Typography></TableCell>
                  <TableCell>
                    {m.rutina_nombre ? <Chip label={m.rutina_nombre} size="small" variant="outlined" /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => { setEditing(m); setOpen(true) }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (confirm('¿Eliminar?')) delMutation.mutate(m.id) }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {open && <FMEADialog open={open} editing={editing} tiposVehiculo={tiposVehiculo} rutinas={rutinas} onClose={() => setOpen(false)} onSave={mutation.mutate} loading={mutation.isPending} />}
    </Box>
  )
}

function FMEADialog({ open, editing, tiposVehiculo, rutinas, onClose, onSave, loading }: any) {
  const [form, setForm] = useState({
    sistema: editing?.sistema ?? '',
    subsistema: editing?.subsistema ?? '',
    funcion: editing?.funcion ?? '',
    falla_funcional: editing?.falla_funcional ?? '',
    modo_falla: editing?.modo_falla ?? '',
    efecto: editing?.efecto ?? '',
    causa: editing?.causa ?? '',
    severidad: editing?.severidad ?? 5,
    ocurrencia: editing?.ocurrencia ?? 5,
    deteccion: editing?.deteccion ?? 5,
    accion_recomendada: editing?.accion_recomendada ?? '',
    tipo_vehiculo_id: editing?.tipo_vehiculo_id ?? '',
    rutina_correctiva_id: editing?.rutina_correctiva_id ?? '',
    activo: editing?.activo ?? true,
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const rpn = form.severidad * form.ocurrencia * form.deteccion

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: GF_COLOR, color: '#fff', fontWeight: 700 }}>
        {editing ? 'Editar Modo de Falla' : 'Nuevo Modo de Falla — AMEF'}
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sistema *</InputLabel>
              <Select value={form.sistema} label="Sistema *" onChange={e => set('sistema', e.target.value)}>
                {SISTEMAS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth size="small" label="Subsistema" value={form.subsistema} onChange={e => set('subsistema', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth size="small" label="Función" value={form.funcion} onChange={e => set('funcion', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Falla funcional" value={form.falla_funcional} onChange={e => set('falla_funcional', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Modo de falla *" value={form.modo_falla} onChange={e => set('modo_falla', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Efecto del fallo" value={form.efecto} onChange={e => set('efecto', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Causa raíz" value={form.causa} onChange={e => set('causa', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2, bgcolor: '#F0FDF4', border: `1px solid ${GF_COLOR}30` }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography variant="caption" fontWeight={700} color={GF_COLOR}>Severidad (S)</Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>Impacto del fallo</Typography>
                  <TextField size="small" type="number" inputProps={{ min: 1, max: 10 }} value={form.severidad} onChange={e => set('severidad', Number(e.target.value))} fullWidth />
                </Box>
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography variant="caption" fontWeight={700} color={GF_COLOR}>Ocurrencia (O)</Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>Frecuencia del fallo</Typography>
                  <TextField size="small" type="number" inputProps={{ min: 1, max: 10 }} value={form.ocurrencia} onChange={e => set('ocurrencia', Number(e.target.value))} fullWidth />
                </Box>
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography variant="caption" fontWeight={700} color={GF_COLOR}>Detección (D)</Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>Capacidad de detección</Typography>
                  <TextField size="small" type="number" inputProps={{ min: 1, max: 10 }} value={form.deteccion} onChange={e => set('deteccion', Number(e.target.value))} fullWidth />
                </Box>
                <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                  <Typography variant="caption" fontWeight={700}>RPN = S × O × D</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: rpn >= 200 ? '#ef4444' : rpn >= 100 ? '#f97316' : rpn >= 50 ? '#f59e0b' : '#22c55e' }}>
                    {rpn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rpn >= 200 ? '🔴 CRÍTICO' : rpn >= 100 ? '🟠 ALTO' : rpn >= 50 ? '🟡 MEDIO' : '🟢 BAJO'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Acción recomendada" multiline rows={2} value={form.accion_recomendada} onChange={e => set('accion_recomendada', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo vehículo (opcional)</InputLabel>
              <Select value={form.tipo_vehiculo_id} label="Tipo vehículo (opcional)" onChange={e => set('tipo_vehiculo_id', e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {tiposVehiculo.map((t: TipoVehiculo) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Rutina correctiva (opcional)</InputLabel>
              <Select value={form.rutina_correctiva_id} label="Rutina correctiva (opcional)" onChange={e => set('rutina_correctiva_id', e.target.value)}>
                <MenuItem value="">Ninguna</MenuItem>
                {rutinas.map((r: Rutina) => <MenuItem key={r.id} value={r.id}>{r.codigo} — {r.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" sx={{ bgcolor: GF_COLOR }} onClick={() => onSave({ ...form, tipo_vehiculo_id: form.tipo_vehiculo_id || null, rutina_correctiva_id: form.rutina_correctiva_id || null })} disabled={loading || !form.sistema || !form.modo_falla}>
          {loading ? <CircularProgress size={18} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — CBM (Condition-Based Maintenance)
// ═══════════════════════════════════════════════════════════════════════════════
function TabCBM() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UmbralCBM | null>(null)

  const { data: umbrales = [], isLoading } = useQuery<UmbralCBM[]>({ queryKey: ['flota-umbrales-cbm'], queryFn: () => api.get('/flota/umbrales-cbm/').then(r => r.data) })
  const { data: tiposVehiculo = [] } = useQuery<TipoVehiculo[]>({ queryKey: ['flota-tipos-vehiculo'], queryFn: () => api.get('/flota/tipos-vehiculo/').then(r => r.data) })
  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['flota-vehiculos-list'], queryFn: () => api.get('/flota/vehiculos/?activo=true').then(r => r.data) })
  const { data: rutinas = [] } = useQuery<Rutina[]>({ queryKey: ['flota-rutinas-list'], queryFn: () => api.get('/flota/rutinas/?activo=true').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/flota/umbrales-cbm/${editing.id}`, d) : api.post('/flota/umbrales-cbm/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-umbrales-cbm'] }); toast.success('Umbral guardado'); setOpen(false) },
  })
  const delMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/umbrales-cbm/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-umbrales-cbm'] }); toast.success('Umbral eliminado') },
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: GF_COLOR }} onClick={() => { setEditing(null); setOpen(true) }}>
          Nuevo Umbral
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        El CBM monitorea parámetros de condición del vehículo. Cuando un parámetro supera el umbral de advertencia o crítico, se dispara automáticamente la rutina de mantenimiento asociada.
      </Alert>

      {isLoading ? <CircularProgress /> : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F3F4F6' }}>
              <TableCell><b>Parámetro</b></TableCell>
              <TableCell><b>Vehículo / Tipo</b></TableCell>
              <TableCell align="center"><b>Dirección</b></TableCell>
              <TableCell align="right"><b>Advertencia</b></TableCell>
              <TableCell align="right"><b>Crítico</b></TableCell>
              <TableCell><b>Unidad</b></TableCell>
              <TableCell><b>Rutina disparadora</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {umbrales.map(u => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Typography fontWeight={700} fontSize={13}>{u.parametro}</Typography>
                  {u.descripcion && <Typography variant="caption" color="text.secondary">{u.descripcion}</Typography>}
                </TableCell>
                <TableCell>
                  {u.vehiculo_placa ? <Chip label={u.vehiculo_placa} size="small" /> : u.tipo_vehiculo_nombre ? <Chip label={u.tipo_vehiculo_nombre} size="small" variant="outlined" /> : <Typography variant="caption" color="text.secondary">Todos</Typography>}
                </TableCell>
                <TableCell align="center">
                  {u.direccion === 'MAYOR' ? <ArrowUpward fontSize="small" color="error" /> : <ArrowDownward fontSize="small" color="primary" />}
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ color: '#f59e0b', fontWeight: 700 }}>{u.umbral_advertencia ?? '—'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ color: '#ef4444', fontWeight: 700 }}>{u.umbral_critico ?? '—'}</Typography>
                </TableCell>
                <TableCell><Typography variant="caption">{u.unidad}</Typography></TableCell>
                <TableCell>
                  {u.rutina_nombre ? <Chip label={u.rutina_nombre} size="small" variant="outlined" color="primary" /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditing(u); setOpen(true) }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (confirm('¿Eliminar umbral?')) delMutation.mutate(u.id) }}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {open && <CBMDialog open={open} editing={editing} vehiculos={vehiculos} tiposVehiculo={tiposVehiculo} rutinas={rutinas} onClose={() => setOpen(false)} onSave={mutation.mutate} loading={mutation.isPending} />}
    </Box>
  )
}

function CBMDialog({ open, editing, vehiculos, tiposVehiculo, rutinas, onClose, onSave, loading }: any) {
  const [form, setForm] = useState({
    parametro: editing?.parametro ?? '',
    descripcion: editing?.descripcion ?? '',
    unidad: editing?.unidad ?? '',
    umbral_advertencia: editing?.umbral_advertencia ?? '',
    umbral_critico: editing?.umbral_critico ?? '',
    direccion: editing?.direccion ?? 'MAYOR',
    vehiculo_id: editing?.vehiculo_id ?? '',
    tipo_vehiculo_id: editing?.tipo_vehiculo_id ?? '',
    rutina_trigger_id: editing?.rutina_trigger_id ?? '',
    activo: editing?.activo ?? true,
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: GF_COLOR, color: '#fff', fontWeight: 700 }}>
        {editing ? 'Editar Umbral CBM' : 'Nuevo Umbral de Condición'}
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <TextField fullWidth size="small" label="Parámetro *" value={form.parametro} onChange={e => set('parametro', e.target.value)} placeholder="Ej: Temperatura aceite motor" />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Unidad" value={form.unidad} onChange={e => set('unidad', e.target.value)} placeholder="°C, bar, %" />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Dirección</InputLabel>
              <Select value={form.direccion} label="Dirección" onChange={e => set('direccion', e.target.value)}>
                <MenuItem value="MAYOR">Mayor a ▲</MenuItem>
                <MenuItem value="MENOR">Menor a ▼</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Descripción" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Umbral advertencia" type="number" value={form.umbral_advertencia} onChange={e => set('umbral_advertencia', e.target.value)} InputProps={{ sx: { color: '#f59e0b' } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Umbral crítico" type="number" value={form.umbral_critico} onChange={e => set('umbral_critico', e.target.value)} InputProps={{ sx: { color: '#ef4444' } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Vehículo específico</InputLabel>
              <Select value={form.vehiculo_id} label="Vehículo específico" onChange={e => set('vehiculo_id', e.target.value)}>
                <MenuItem value="">Ninguno</MenuItem>
                {vehiculos.map((v: Vehiculo) => <MenuItem key={v.id} value={v.id}>{v.placa}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de vehículo</InputLabel>
              <Select value={form.tipo_vehiculo_id} label="Tipo de vehículo" onChange={e => set('tipo_vehiculo_id', e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {tiposVehiculo.map((t: TipoVehiculo) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Rutina que se dispara</InputLabel>
              <Select value={form.rutina_trigger_id} label="Rutina que se dispara" onChange={e => set('rutina_trigger_id', e.target.value)}>
                <MenuItem value="">Ninguna</MenuItem>
                {rutinas.map((r: Rutina) => <MenuItem key={r.id} value={r.id}>{r.codigo} — {r.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" sx={{ bgcolor: GF_COLOR }} onClick={() => onSave({ ...form, vehiculo_id: form.vehiculo_id || null, tipo_vehiculo_id: form.tipo_vehiculo_id || null, rutina_trigger_id: form.rutina_trigger_id || null, umbral_advertencia: form.umbral_advertencia ? Number(form.umbral_advertencia) : null, umbral_critico: form.umbral_critico ? Number(form.umbral_critico) : null })} disabled={loading || !form.parametro}>
          {loading ? <CircularProgress size={18} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — PRÓXIMOS MANTENIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════
function TabProximos() {
  const [soloVencidos, setSoloVencidos] = useState(false)

  const { data: proximos = [], isLoading, refetch } = useQuery<ProximoMant[]>({
    queryKey: ['flota-proximos', soloVencidos],
    queryFn: () => api.get(`/flota/proximos-mantenimientos/?solo_vencidos=${soloVencidos}`).then(r => r.data),
  })

  const vencidos = proximos.filter(p => p.vencido)
  const criticos = proximos.filter(p => !p.vencido && p.nivel_criticidad === 'CRITICA' && ((p.km_restantes ?? Infinity) < 500 || (p.dias_restantes ?? Infinity) < 7))

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Card sx={{ minWidth: 140, bgcolor: '#FEF2F2', border: '1px solid #fca5a5' }}>
          <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
            <Typography variant="h4" fontWeight={900} color="error">{vencidos.length}</Typography>
            <Typography variant="caption" color="error.dark">Vencidos</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 140, bgcolor: '#FFF7ED', border: '1px solid #fdba74' }}>
          <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
            <Typography variant="h4" fontWeight={900} sx={{ color: '#f97316' }}>{criticos.length}</Typography>
            <Typography variant="caption" sx={{ color: '#c2410c' }}>Próximos críticos</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 140, bgcolor: '#F0FDF4', border: '1px solid #86efac' }}>
          <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
            <Typography variant="h4" fontWeight={900} sx={{ color: '#22c55e' }}>{proximos.length - vencidos.length - criticos.length}</Typography>
            <Typography variant="caption" sx={{ color: '#15803d' }}>Al día</Typography>
          </CardContent>
        </Card>
        <Box sx={{ flex: 1 }} />
        <FormControlLabel control={<Switch checked={soloVencidos} onChange={e => setSoloVencidos(e.target.checked)} />} label="Solo vencidos" />
        <Button variant="outlined" onClick={() => refetch()}>Actualizar</Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F3F4F6' }}>
              <TableCell><b>Vehículo</b></TableCell>
              <TableCell><b>Rutina</b></TableCell>
              <TableCell><b>Secuencia</b></TableCell>
              <TableCell><b>Tipo</b></TableCell>
              <TableCell><b>Criticidad</b></TableCell>
              <TableCell align="right"><b>Km actuales</b></TableCell>
              <TableCell align="right"><b>Km restantes</b></TableCell>
              <TableCell align="right"><b>Días restantes</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proximos.map((p, i) => {
              const kmPct = p.intervalo_km && p.km_restantes !== undefined ? Math.max(0, Math.min(100, ((p.intervalo_km - (p.km_restantes ?? 0)) / p.intervalo_km) * 100)) : null
              const diasPct = p.intervalo_dias && p.dias_restantes !== undefined ? Math.max(0, Math.min(100, ((p.intervalo_dias - (p.dias_restantes ?? 0)) / p.intervalo_dias) * 100)) : null
              return (
                <TableRow key={i} hover sx={{ bgcolor: p.vencido ? '#FEF2F2' : undefined }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.vehiculo_placa}</TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight={700} color={GF_COLOR}>{p.rutina_codigo}</Typography>
                    <Typography variant="caption" display="block">{p.rutina_nombre}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{p.secuencia_nombre}</Typography></TableCell>
                  <TableCell><Chip label={p.tipo} size="small" variant="outlined" sx={{ fontSize: 10 }} /></TableCell>
                  <TableCell><CritChip v={p.nivel_criticidad} /></TableCell>
                  <TableCell align="right">{p.medicion_actual?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell align="right">
                    {p.km_restantes !== undefined && p.km_restantes !== null ? (
                      <Box>
                        <Typography fontSize={12} fontWeight={700} sx={{ color: p.km_restantes <= 0 ? '#ef4444' : p.km_restantes <= 500 ? '#f97316' : 'inherit' }}>
                          {p.km_restantes <= 0 ? `+${Math.abs(p.km_restantes).toLocaleString()}` : p.km_restantes.toLocaleString()} km
                        </Typography>
                        {kmPct !== null && <LinearProgress variant="determinate" value={kmPct} sx={{ height: 4, mt: 0.5, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: kmPct >= 90 ? '#ef4444' : kmPct >= 70 ? '#f97316' : '#22c55e' } }} />}
                      </Box>
                    ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    {p.dias_restantes !== undefined && p.dias_restantes !== null ? (
                      <Box>
                        <Typography fontSize={12} fontWeight={700} sx={{ color: p.dias_restantes <= 0 ? '#ef4444' : p.dias_restantes <= 7 ? '#f97316' : 'inherit' }}>
                          {p.dias_restantes <= 0 ? `${Math.abs(p.dias_restantes)}d vencido` : `${p.dias_restantes}d`}
                        </Typography>
                        {diasPct !== null && <LinearProgress variant="determinate" value={diasPct} sx={{ height: 4, mt: 0.5, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: diasPct >= 90 ? '#ef4444' : diasPct >= 70 ? '#f97316' : '#22c55e' } }} />}
                      </Box>
                    ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell align="center">
                    {p.vencido
                      ? <Chip label="VENCIDO" size="small" color="error" icon={<ErrorIcon />} />
                      : ((p.km_restantes ?? Infinity) < 500 || (p.dias_restantes ?? Infinity) < 7)
                        ? <Chip label="URGENTE" size="small" sx={{ bgcolor: '#f97316', color: '#fff' }} icon={<WarnIcon />} />
                        : <Chip label="OK" size="small" color="success" icon={<CheckCircle />} />}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function FlotaConfiabilidad() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ bgcolor: GF_COLOR, borderRadius: 2, p: 1, display: 'flex' }}>
            <ShieldIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Confiabilidad & Mantenimiento Predictivo</Typography>
            <Typography variant="caption" color="text.secondary">AMEF/RCM · CBM · Próximos mantenimientos</Typography>
          </Box>
        </Box>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            TabIndicatorProps={{ style: { backgroundColor: GF_COLOR } }}>
            <Tab icon={<WarnIcon />} iconPosition="start" label="AMEF (Modos de falla)" />
            <Tab icon={<CBMIcon />} iconPosition="start" label="CBM (Umbrales)" />
            <Tab icon={<CalIcon />} iconPosition="start" label="Próximos mantenimientos" />
          </Tabs>
          <Box sx={{ p: 2 }}>
            {tab === 0 && <TabFMEA />}
            {tab === 1 && <TabCBM />}
            {tab === 2 && <TabProximos />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
