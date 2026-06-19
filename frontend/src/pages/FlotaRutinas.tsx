import React, { useState } from 'react'
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Chip, IconButton, Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, Grid, Divider, Alert, CircularProgress, Autocomplete,
  Card, CardContent, CardActions, List, ListItem, ListItemText, ListItemSecondaryAction,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Build as BuildIcon, AccountTree as SeqIcon, AssignmentTurnedIn as AsigIcon,
  DragHandle as DragIcon, CheckCircle as CheckIcon, Warning as WarnIcon,
  DirectionsCar as CarIcon, Group as GroupIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import toast from 'react-hot-toast'
import Layout from '@/components/layout/Layout'

const GF_COLOR = '#7C3AED'
const GF_LIGHT = '#EDE9FE'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TipoTrabajo { id: number; nombre: string; descripcion?: string; costo_estimado?: number }
interface Repuesto { id: number; codigo: string; nombre: string; unidad: string; costo_referencia?: number }
interface RutinaTrabajoItem { tipo_trabajo_id: number; orden: number; obligatorio: boolean; instrucciones?: string }
interface RutinaRepuestoItem { repuesto_id: number; cantidad: number; obligatorio: boolean }
interface Rutina {
  id: number; codigo: string; nombre: string; tipo: string; nivel_criticidad: string
  intervalo_km?: number; intervalo_horas?: number; intervalo_dias?: number; tolerancia_pct: number
  tiempo_estimado_horas?: number; costo_estimado_mano_obra?: number; activo: boolean
  trabajos: { id: number; tipo_trabajo_id: number; tipo_trabajo_nombre?: string; orden: number; obligatorio: boolean; instrucciones?: string }[]
  repuestos: { id: number; repuesto_id: number; repuesto_codigo?: string; repuesto_nombre?: string; repuesto_unidad?: string; costo_referencia?: number; cantidad: number; obligatorio: boolean }[]
}
interface SecuenciaRutinaItem { rutina_id: number; orden: number; intervalo_km_override?: number; intervalo_dias_override?: number; notas?: string }
interface Secuencia {
  id: number; codigo: string; nombre: string; descripcion?: string; aplica_tipo_trabajo?: string; activo: boolean
  total_asignaciones: number
  rutinas: { id: number; rutina_id: number; rutina_codigo?: string; rutina_nombre?: string; orden: number; intervalo_km_override?: number; intervalo_dias_override?: number; notas?: string }[]
}
interface Vehiculo { id: number; placa: string; tipo_vehiculo_id?: number; marca_id?: number; ciudad?: string; tipo_trabajo?: string }
interface GrupoVehiculo { id: number; nombre: string; vehiculos_count: number }
interface Asignacion {
  id: number; secuencia_id: number; secuencia_nombre?: string
  vehiculo_id?: number; vehiculo_placa?: string
  grupo_id?: number; grupo_nombre?: string
  fecha_inicio: string; medicion_inicio?: number; activa: boolean; notas?: string
}

const TIPOS_RUTINA = ['PREVENTIVO', 'PREDICTIVO', 'CORRECTIVO', 'MEJORATIVO', 'INSPECCION']
const CRITICIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
const TIPO_TRABAJO_OPTS = ['BAJO', 'NORMAL', 'SEVERO']

function CritChip({ v }: { v: string }) {
  const map: Record<string, string> = { BAJA: '#22c55e', MEDIA: '#f59e0b', ALTA: '#f97316', CRITICA: '#ef4444' }
  return <Chip label={v} size="small" sx={{ bgcolor: map[v] || '#6b7280', color: '#fff', fontWeight: 700, fontSize: 10 }} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — RUTINAS
// ═══════════════════════════════════════════════════════════════════════════════
function TabRutinas() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Rutina | null>(null)
  const [filterTipo, setFilterTipo] = useState('')

  const { data: rutinas = [], isLoading } = useQuery<Rutina[]>({ queryKey: ['flota-rutinas'], queryFn: () => api.get('/flota/rutinas/').then(r => r.data) })
  const { data: tipos = [] } = useQuery<TipoTrabajo[]>({ queryKey: ['flota-tipos-trabajo'], queryFn: () => api.get('/flota/tipos-trabajo/').then(r => r.data) })
  const { data: repuestos = [] } = useQuery<Repuesto[]>({ queryKey: ['flota-repuestos'], queryFn: () => api.get('/flota/repuestos/').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/flota/rutinas/${editing.id}`, d) : api.post('/flota/rutinas/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-rutinas'] }); toast.success(editing ? 'Rutina actualizada' : 'Rutina creada'); setOpen(false) },
    onError: () => toast.error('Error al guardar'),
  })
  const delMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/rutinas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-rutinas'] }); toast.success('Rutina eliminada') },
  })

  const filtered = rutinas.filter(r => !filterTipo || r.tipo === filterTipo)

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={filterTipo} label="Tipo" onChange={e => setFilterTipo(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {TIPOS_RUTINA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: GF_COLOR }} onClick={() => { setEditing(null); setOpen(true) }}>
          Nueva Rutina
        </Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F3F4F6' }}>
              <TableCell><b>Código</b></TableCell>
              <TableCell><b>Nombre</b></TableCell>
              <TableCell><b>Tipo</b></TableCell>
              <TableCell><b>Criticidad</b></TableCell>
              <TableCell align="center"><b>Trabajos</b></TableCell>
              <TableCell align="center"><b>Repuestos</b></TableCell>
              <TableCell align="right"><b>Km</b></TableCell>
              <TableCell align="right"><b>Días</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: GF_COLOR }}>{r.codigo}</TableCell>
                <TableCell>{r.nombre}</TableCell>
                <TableCell><Chip label={r.tipo} size="small" variant="outlined" /></TableCell>
                <TableCell><CritChip v={r.nivel_criticidad} /></TableCell>
                <TableCell align="center">{r.trabajos.length}</TableCell>
                <TableCell align="center">{r.repuestos.length}</TableCell>
                <TableCell align="right">{r.intervalo_km?.toLocaleString() ?? '—'}</TableCell>
                <TableCell align="right">{r.intervalo_dias ?? '—'}</TableCell>
                <TableCell align="center">
                  <Chip label={r.activo ? 'Activa' : 'Inactiva'} size="small" color={r.activo ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditing(r); setOpen(true) }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (confirm('¿Eliminar rutina?')) delMutation.mutate(r.id) }}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {open && <RutinaDialog open={open} editing={editing} tipos={tipos} repuestos={repuestos} onClose={() => setOpen(false)} onSave={mutation.mutate} loading={mutation.isPending} />}
    </Box>
  )
}

function RutinaDialog({ open, editing, tipos, repuestos, onClose, onSave, loading }: any) {
  const [form, setForm] = useState({
    codigo: editing?.codigo ?? '',
    nombre: editing?.nombre ?? '',
    descripcion: editing?.descripcion ?? '',
    tipo: editing?.tipo ?? 'PREVENTIVO',
    nivel_criticidad: editing?.nivel_criticidad ?? 'MEDIA',
    aplica_tipo_trabajo_severo: editing?.aplica_tipo_trabajo_severo ?? false,
    intervalo_km: editing?.intervalo_km ?? '',
    intervalo_horas: editing?.intervalo_horas ?? '',
    intervalo_dias: editing?.intervalo_dias ?? '',
    tolerancia_pct: editing?.tolerancia_pct ?? 10,
    tiempo_estimado_horas: editing?.tiempo_estimado_horas ?? '',
    costo_estimado_mano_obra: editing?.costo_estimado_mano_obra ?? '',
    instrucciones_generales: editing?.instrucciones_generales ?? '',
    activo: editing?.activo ?? true,
  })
  const [trabajos, setTrabajos] = useState<RutinaTrabajoItem[]>(
    editing?.trabajos?.map((t: any) => ({ tipo_trabajo_id: t.tipo_trabajo_id, orden: t.orden, obligatorio: t.obligatorio, instrucciones: t.instrucciones ?? '' })) ?? []
  )
  const [repuestosList, setRepuestosList] = useState<RutinaRepuestoItem[]>(
    editing?.repuestos?.map((r: any) => ({ repuesto_id: r.repuesto_id, cantidad: r.cantidad, obligatorio: r.obligatorio })) ?? []
  )

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const addTrabajo = () => {
    if (!tipos.length) return
    setTrabajos(prev => [...prev, { tipo_trabajo_id: tipos[0].id, orden: prev.length + 1, obligatorio: true, instrucciones: '' }])
  }
  const addRepuesto = () => {
    if (!repuestos.length) return
    setRepuestosList(prev => [...prev, { repuesto_id: repuestos[0].id, cantidad: 1, obligatorio: true }])
  }

  const handleSave = () => {
    onSave({
      ...form,
      intervalo_km: form.intervalo_km ? Number(form.intervalo_km) : null,
      intervalo_horas: form.intervalo_horas ? Number(form.intervalo_horas) : null,
      intervalo_dias: form.intervalo_dias ? Number(form.intervalo_dias) : null,
      tolerancia_pct: Number(form.tolerancia_pct),
      tiempo_estimado_horas: form.tiempo_estimado_horas ? Number(form.tiempo_estimado_horas) : null,
      costo_estimado_mano_obra: form.costo_estimado_mano_obra ? Number(form.costo_estimado_mano_obra) : null,
      trabajos, repuestos: repuestosList,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle sx={{ bgcolor: GF_COLOR, color: '#fff', fontWeight: 700 }}>
        {editing ? `Editar: ${editing.codigo}` : 'Nueva Rutina de Mantenimiento'}
      </DialogTitle>
      <DialogContent sx={{ p: 3, overflow: 'auto' }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Código *" value={form.codigo} onChange={e => set('codigo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={form.tipo} label="Tipo" onChange={e => set('tipo', e.target.value)}>
                {TIPOS_RUTINA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Criticidad</InputLabel>
              <Select value={form.nivel_criticidad} label="Criticidad" onChange={e => set('nivel_criticidad', e.target.value)}>
                {CRITICIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Descripción" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Intervalos de mantenimiento</Typography></Divider></Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Intervalo km" type="number" value={form.intervalo_km} onChange={e => set('intervalo_km', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Intervalo horas motor" type="number" value={form.intervalo_horas} onChange={e => set('intervalo_horas', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Intervalo días" type="number" value={form.intervalo_dias} onChange={e => set('intervalo_dias', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Tolerancia (%)" type="number" value={form.tolerancia_pct} onChange={e => set('tolerancia_pct', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Tiempo estimado (h)" type="number" value={form.tiempo_estimado_horas} onChange={e => set('tiempo_estimado_horas', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Costo mano obra est." type="number" value={form.costo_estimado_mano_obra} onChange={e => set('costo_estimado_mano_obra', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControlLabel control={<Switch checked={form.aplica_tipo_trabajo_severo} onChange={e => set('aplica_tipo_trabajo_severo', e.target.checked)} />} label="Solo trabajo severo" />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControlLabel control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} />} label="Activa" />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Instrucciones generales" multiline rows={2} value={form.instrucciones_generales} onChange={e => set('instrucciones_generales', e.target.value)} />
          </Grid>

          {/* Trabajos */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography fontWeight={700} fontSize={14}>Trabajos incluidos</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addTrabajo}>Agregar trabajo</Button>
            </Box>
            {trabajos.map((t, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ minWidth: 24, color: GF_COLOR, fontWeight: 700 }}>{i + 1}</Typography>
                <FormControl size="small" sx={{ flex: 2 }}>
                  <Select value={t.tipo_trabajo_id} onChange={e => setTrabajos(prev => prev.map((x, j) => j === i ? { ...x, tipo_trabajo_id: Number(e.target.value) } : x))}>
                    {tipos.map((tt: TipoTrabajo) => <MenuItem key={tt.id} value={tt.id}>{tt.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Instrucciones" sx={{ flex: 3 }} value={t.instrucciones ?? ''} onChange={e => setTrabajos(prev => prev.map((x, j) => j === i ? { ...x, instrucciones: e.target.value } : x))} />
                <FormControlLabel control={<Switch size="small" checked={t.obligatorio} onChange={e => setTrabajos(prev => prev.map((x, j) => j === i ? { ...x, obligatorio: e.target.checked } : x))} />} label="Oblig." />
                <IconButton size="small" color="error" onClick={() => setTrabajos(prev => prev.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Grid>

          {/* Repuestos */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography fontWeight={700} fontSize={14}>Repuestos requeridos</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addRepuesto}>Agregar repuesto</Button>
            </Box>
            {repuestosList.map((r, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ flex: 3 }}>
                  <Select value={r.repuesto_id} onChange={e => setRepuestosList(prev => prev.map((x, j) => j === i ? { ...x, repuesto_id: Number(e.target.value) } : x))}>
                    {repuestos.map((rp: Repuesto) => <MenuItem key={rp.id} value={rp.id}>{rp.codigo} — {rp.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Cantidad" type="number" sx={{ width: 100 }} value={r.cantidad} onChange={e => setRepuestosList(prev => prev.map((x, j) => j === i ? { ...x, cantidad: Number(e.target.value) } : x))} />
                <FormControlLabel control={<Switch size="small" checked={r.obligatorio} onChange={e => setRepuestosList(prev => prev.map((x, j) => j === i ? { ...x, obligatorio: e.target.checked } : x))} />} label="Oblig." />
                <IconButton size="small" color="error" onClick={() => setRepuestosList(prev => prev.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" sx={{ bgcolor: GF_COLOR }} onClick={handleSave} disabled={loading || !form.codigo || !form.nombre}>
          {loading ? <CircularProgress size={18} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — SECUENCIAS
// ═══════════════════════════════════════════════════════════════════════════════
function TabSecuencias() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Secuencia | null>(null)

  const { data: secuencias = [], isLoading } = useQuery<Secuencia[]>({ queryKey: ['flota-secuencias'], queryFn: () => api.get('/flota/secuencias/').then(r => r.data) })
  const { data: rutinas = [] } = useQuery<Rutina[]>({ queryKey: ['flota-rutinas'], queryFn: () => api.get('/flota/rutinas/?activo=true').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/flota/secuencias/${editing.id}`, d) : api.post('/flota/secuencias/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-secuencias'] }); toast.success('Secuencia guardada'); setOpen(false) },
    onError: () => toast.error('Error al guardar'),
  })
  const delMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/secuencias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-secuencias'] }); toast.success('Secuencia eliminada') },
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: GF_COLOR }} onClick={() => { setEditing(null); setOpen(true) }}>
          Nueva Secuencia
        </Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Grid container spacing={2}>
          {secuencias.map(s => (
            <Grid key={s.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ borderLeft: `4px solid ${GF_COLOR}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography fontWeight={700} color={GF_COLOR}>{s.codigo}</Typography>
                      <Typography fontWeight={600}>{s.nombre}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip label={s.activo ? 'Activa' : 'Inactiva'} size="small" color={s.activo ? 'success' : 'default'} />
                    </Box>
                  </Box>
                  {s.descripcion && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{s.descripcion}</Typography>}
                  {s.aplica_tipo_trabajo && (
                    <Chip label={`Trabajo: ${s.aplica_tipo_trabajo}`} size="small" sx={{ mt: 1 }} />
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">Rutinas en secuencia ({s.rutinas.length}):</Typography>
                  {s.rutinas.slice(0, 5).map((sr, idx) => (
                    <Box key={sr.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ minWidth: 20, fontWeight: 700, color: GF_COLOR }}>{idx + 1}.</Typography>
                      <Typography variant="caption">{sr.rutina_nombre}</Typography>
                      {sr.intervalo_km_override && <Chip label={`${sr.intervalo_km_override.toLocaleString()}km`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />}
                    </Box>
                  ))}
                  {s.rutinas.length > 5 && <Typography variant="caption" color="text.secondary">... y {s.rutinas.length - 5} más</Typography>}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">{s.total_asignaciones} asignaciones activas</Typography>
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditing(s); setOpen(true) }}>Editar</Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { if (confirm('¿Eliminar secuencia?')) delMutation.mutate(s.id) }}>Eliminar</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {open && <SecuenciaDialog open={open} editing={editing} rutinas={rutinas} onClose={() => setOpen(false)} onSave={mutation.mutate} loading={mutation.isPending} />}
    </Box>
  )
}

function SecuenciaDialog({ open, editing, rutinas, onClose, onSave, loading }: any) {
  const [form, setForm] = useState({
    codigo: editing?.codigo ?? '',
    nombre: editing?.nombre ?? '',
    descripcion: editing?.descripcion ?? '',
    aplica_tipo_trabajo: editing?.aplica_tipo_trabajo ?? '',
    activo: editing?.activo ?? true,
  })
  const [rutinasList, setRutinasList] = useState<SecuenciaRutinaItem[]>(
    editing?.rutinas?.map((sr: any) => ({
      rutina_id: sr.rutina_id, orden: sr.orden,
      intervalo_km_override: sr.intervalo_km_override ?? '',
      intervalo_dias_override: sr.intervalo_dias_override ?? '',
      notas: sr.notas ?? '',
    })) ?? []
  )

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const addRutina = () => {
    if (!rutinas.length) return
    setRutinasList(prev => [...prev, { rutina_id: rutinas[0].id, orden: prev.length + 1, intervalo_km_override: '', intervalo_dias_override: '', notas: '' }])
  }

  const handleSave = () => {
    onSave({
      ...form,
      aplica_tipo_trabajo: form.aplica_tipo_trabajo || null,
      rutinas: rutinasList.map((r, idx) => ({
        rutina_id: r.rutina_id,
        orden: idx + 1,
        intervalo_km_override: r.intervalo_km_override ? Number(r.intervalo_km_override) : null,
        intervalo_dias_override: r.intervalo_dias_override ? Number(r.intervalo_dias_override) : null,
        notas: r.notas || null,
      })),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: GF_COLOR, color: '#fff', fontWeight: 700 }}>
        {editing ? `Editar: ${editing.codigo}` : 'Nueva Secuencia de Mantenimiento'}
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" label="Código *" value={form.codigo} onChange={e => set('codigo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo trabajo</InputLabel>
              <Select value={form.aplica_tipo_trabajo} label="Tipo trabajo" onChange={e => set('aplica_tipo_trabajo', e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {TIPO_TRABAJO_OPTS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControlLabel control={<Switch checked={form.activo} onChange={e => set('activo', e.target.checked)} />} label="Activa" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Descripción" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography fontWeight={700} fontSize={14}>Rutinas en la secuencia (en orden)</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addRutina}>Agregar rutina</Button>
            </Box>
            {rutinasList.map((sr, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography fontWeight={700} color={GF_COLOR} sx={{ minWidth: 28 }}>#{i + 1}</Typography>
                  <FormControl size="small" sx={{ flex: 3 }}>
                    <Select value={sr.rutina_id} onChange={e => setRutinasList(prev => prev.map((x, j) => j === i ? { ...x, rutina_id: Number(e.target.value) } : x))}>
                      {rutinas.map((r: Rutina) => <MenuItem key={r.id} value={r.id}>{r.codigo} — {r.nombre}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Override km" type="number" sx={{ width: 120 }} value={sr.intervalo_km_override ?? ''} onChange={e => setRutinasList(prev => prev.map((x, j) => j === i ? { ...x, intervalo_km_override: e.target.value as any } : x))} />
                  <TextField size="small" label="Override días" type="number" sx={{ width: 120 }} value={sr.intervalo_dias_override ?? ''} onChange={e => setRutinasList(prev => prev.map((x, j) => j === i ? { ...x, intervalo_dias_override: e.target.value as any } : x))} />
                  <TextField size="small" label="Notas" sx={{ flex: 2 }} value={sr.notas ?? ''} onChange={e => setRutinasList(prev => prev.map((x, j) => j === i ? { ...x, notas: e.target.value } : x))} />
                  <IconButton size="small" color="error" onClick={() => setRutinasList(prev => prev.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            ))}
            {rutinasList.length === 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>Agregue rutinas a la secuencia. El orden determina la progresión del mantenimiento.</Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" sx={{ bgcolor: GF_COLOR }} onClick={handleSave} disabled={loading || !form.codigo || !form.nombre}>
          {loading ? <CircularProgress size={18} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — ASIGNACIONES
// ═══════════════════════════════════════════════════════════════════════════════
function TabAsignaciones() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: asignaciones = [], isLoading } = useQuery<Asignacion[]>({ queryKey: ['flota-asignaciones'], queryFn: () => api.get('/flota/asignaciones/').then(r => r.data) })
  const { data: secuencias = [] } = useQuery<Secuencia[]>({ queryKey: ['flota-secuencias'], queryFn: () => api.get('/flota/secuencias/?activo=true').then(r => r.data) })
  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['flota-vehiculos-list'], queryFn: () => api.get('/flota/vehiculos/?activo=true').then(r => r.data) })
  const { data: grupos = [] } = useQuery<GrupoVehiculo[]>({ queryKey: ['flota-grupos'], queryFn: () => api.get('/flota/grupos-vehiculo/').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/flota/asignaciones/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-asignaciones'] }); toast.success('Asignación creada'); setOpen(false) },
    onError: () => toast.error('Error al guardar'),
  })
  const delMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/flota/asignaciones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flota-asignaciones'] }); toast.success('Asignación eliminada') },
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: GF_COLOR }} onClick={() => setOpen(true)}>
          Nueva Asignación
        </Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F3F4F6' }}>
              <TableCell><b>Secuencia</b></TableCell>
              <TableCell><b>Vehículo / Grupo</b></TableCell>
              <TableCell><b>Tipo</b></TableCell>
              <TableCell><b>Inicio</b></TableCell>
              <TableCell align="right"><b>Km inicio</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {asignaciones.map(a => (
              <TableRow key={a.id} hover>
                <TableCell sx={{ fontWeight: 600, color: GF_COLOR }}>{a.secuencia_nombre}</TableCell>
                <TableCell>{a.vehiculo_placa ?? a.grupo_nombre}</TableCell>
                <TableCell>
                  <Chip label={a.vehiculo_id ? 'Vehículo' : 'Grupo'} size="small" icon={a.vehiculo_id ? <CarIcon /> : <GroupIcon />} />
                </TableCell>
                <TableCell>{a.fecha_inicio}</TableCell>
                <TableCell align="right">{a.medicion_inicio?.toLocaleString() ?? '—'}</TableCell>
                <TableCell align="center">
                  <Chip label={a.activa ? 'Activa' : 'Inactiva'} size="small" color={a.activa ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => { if (confirm('¿Eliminar asignación?')) delMutation.mutate(a.id) }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {open && <AsignacionDialog open={open} secuencias={secuencias} vehiculos={vehiculos} grupos={grupos} onClose={() => setOpen(false)} onSave={mutation.mutate} loading={mutation.isPending} />}
    </Box>
  )
}

function AsignacionDialog({ open, secuencias, vehiculos, grupos, onClose, onSave, loading }: any) {
  const [modo, setModo] = useState<'vehiculo' | 'grupo'>('vehiculo')
  const [form, setForm] = useState({
    secuencia_id: secuencias[0]?.id ?? '',
    vehiculo_id: '',
    grupo_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    medicion_inicio: '',
    activa: true,
    notas: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    onSave({
      secuencia_id: Number(form.secuencia_id),
      vehiculo_id: modo === 'vehiculo' && form.vehiculo_id ? Number(form.vehiculo_id) : null,
      grupo_id: modo === 'grupo' && form.grupo_id ? Number(form.grupo_id) : null,
      fecha_inicio: form.fecha_inicio,
      medicion_inicio: form.medicion_inicio ? Number(form.medicion_inicio) : null,
      activa: form.activa,
      notas: form.notas || null,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: GF_COLOR, color: '#fff', fontWeight: 700 }}>Nueva Asignación de Secuencia</DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Secuencia *</InputLabel>
              <Select value={form.secuencia_id} label="Secuencia *" onChange={e => set('secuencia_id', e.target.value)}>
                {secuencias.map((s: Secuencia) => <MenuItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Tabs value={modo} onChange={(_, v) => setModo(v)} sx={{ mb: 1 }}>
              <Tab value="vehiculo" label="Vehículo individual" icon={<CarIcon />} iconPosition="start" />
              <Tab value="grupo" label="Grupo de vehículos" icon={<GroupIcon />} iconPosition="start" />
            </Tabs>
            {modo === 'vehiculo' ? (
              <FormControl fullWidth size="small">
                <InputLabel>Vehículo *</InputLabel>
                <Select value={form.vehiculo_id} label="Vehículo *" onChange={e => set('vehiculo_id', e.target.value)}>
                  {vehiculos.map((v: Vehiculo) => <MenuItem key={v.id} value={v.id}>{v.placa}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel>Grupo *</InputLabel>
                <Select value={form.grupo_id} label="Grupo *" onChange={e => set('grupo_id', e.target.value)}>
                  {grupos.map((g: GrupoVehiculo) => <MenuItem key={g.id} value={g.id}>{g.nombre} ({g.vehiculos_count} vehículos)</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Fecha inicio *" type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth size="small" label="Km / medición inicial" type="number" value={form.medicion_inicio} onChange={e => set('medicion_inicio', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Notas" value={form.notas} onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" sx={{ bgcolor: GF_COLOR }} onClick={handleSave}
          disabled={loading || !form.secuencia_id || (modo === 'vehiculo' && !form.vehiculo_id) || (modo === 'grupo' && !form.grupo_id)}>
          {loading ? <CircularProgress size={18} /> : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function FlotaRutinas() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ bgcolor: GF_COLOR, borderRadius: 2, p: 1, display: 'flex' }}>
            <BuildIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Programas de Mantenimiento</Typography>
            <Typography variant="caption" color="text.secondary">Rutinas · Secuencias · Asignaciones a vehículos</Typography>
          </Box>
        </Box>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            TabIndicatorProps={{ style: { backgroundColor: GF_COLOR } }}>
            <Tab icon={<BuildIcon />} iconPosition="start" label="Rutinas" />
            <Tab icon={<SeqIcon />} iconPosition="start" label="Secuencias" />
            <Tab icon={<AsigIcon />} iconPosition="start" label="Asignaciones" />
          </Tabs>
          <Box sx={{ p: 2 }}>
            {tab === 0 && <TabRutinas />}
            {tab === 1 && <TabSecuencias />}
            {tab === 2 && <TabAsignaciones />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
