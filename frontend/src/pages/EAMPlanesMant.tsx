/**
 * CMMS · Planes de mantenimiento
 *
 * Era una maqueta con ocho rutinas fijas. El backend ya tenía la tabla y ahora
 * también el alcance por jerarquía.
 *
 * Una rutina no se escribe por activo: se declara sobre el catálogo — tipo →
 * marca → línea — y cubre a todo equipo que encaje. El cumplimiento, en cambio,
 * es de cada activo: la misma rutina puede estar al día en un camión y vencida
 * en otro, porque cada uno rueda distinto.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs, TextField,
  MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Alert,
  LinearProgress, Divider, Stack, InputAdornment, Autocomplete,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  EventRepeat, Add, Edit, DeleteForever, Close, Search, AccountTree,
  Checklist, WarningAmber,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'

type TipoMant = 'TIEMPO' | 'USO' | 'CONDICION'
const TIPOS_MANT: TipoMant[] = ['TIEMPO', 'USO', 'CONDICION']
const TIPOS_OT = ['PREVENTIVA', 'INSPECCION', 'PREDICTIVA', 'CALIBRACION']

/** Qué unidades tienen sentido según cómo se mide la rutina. */
const UNIDADES: Record<TipoMant, string[]> = {
  TIEMPO: ['DIAS', 'SEMANAS', 'MESES', 'ANIOS'],
  USO: ['KM', 'HORAS'],
  CONDICION: [],
}

const TIPO_COLOR: Record<string, string> = {
  TIEMPO: '#3B82F6', USO: '#F59E0B', CONDICION: '#8B5CF6',
}
const RUTINA_COLOR: Record<string, string> = {
  VENCIDA: '#DC2626', PROXIMA: '#F59E0B', AL_DIA: '#16A34A', SIN_EJECUTAR: '#6B7280',
}
const RUTINA_LABEL: Record<string, string> = {
  VENCIDA: 'Vencida', PROXIMA: 'Próxima', AL_DIA: 'Al día', SIN_EJECUTAR: 'Sin ejecutar',
}

interface Tarea {
  id?: number
  descripcion: string
  actividad_id?: number | null
  repuesto_id?: number | null
  cantidad_repuesto?: number | null
  tiempo_estimado?: number | null
  orden: number
}

interface Plan {
  id: number
  nombre: string
  activo_id?: number | null
  tipo_activo?: string | null
  marca?: string | null
  linea?: string | null
  tipo_mant?: string | null
  frecuencia?: number | null
  unidad?: string | null
  tipo_ot?: string | null
  descripcion?: string | null
  costo_estimado?: number | null
  activo: boolean
  tareas: Tarea[]
  activos_cubiertos: number
  vencidas: number
  proximas: number
  sin_ejecutar: number
}

interface Cumplimiento {
  plan_id: number
  plan_nombre: string
  frecuencia?: number | null
  unidad?: string | null
  activo_id: number
  activo_codigo?: string | null
  activo_nombre?: string | null
  odometro_activo?: number | null
  horometro_activo?: number | null
  ultima_ejecucion_fecha?: string | null
  ultima_ejecucion_odometro?: number | null
  proxima_fecha?: string | null
  proximo_odometro?: number | null
  proximo_horometro?: number | null
  faltante?: number | null
  unidad_faltante?: string | null
  estado_rutina: string
}

interface ActivoMin {
  id: number
  codigo?: string | null
  nombre?: string | null
  tipo_activo?: string | null
  marca?: string | null
  linea?: string | null
}
interface CatalogoItem { id: number; nombre?: string | null; descripcion?: string | null }
interface RepuestoItem { id: number; nombre: string; unidad_medida?: string | null }
/** Niveles del catálogo de vehículos, para armar el alcance. */
interface TipoActivoItem { id: number; codigo?: string | null; nombre?: string | null }
interface MarcaItem { id: number; nombre: string }
interface LineaItem { id: number; nombre: string }

const numero = (n?: number | null) => (n == null ? '—' : n.toLocaleString('es-CO'))

const textoFaltante = (c: Cumplimiento): string => {
  if (c.faltante == null || !c.unidad_faltante) return 'nunca se ha ejecutado'
  const u = c.unidad_faltante === 'DIAS' ? 'días' : c.unidad_faltante.toLowerCase()
  return c.faltante < 0
    ? `vencida por ${Math.abs(c.faltante).toLocaleString('es-CO')} ${u}`
    : `faltan ${c.faltante.toLocaleString('es-CO')} ${u}`
}

/** "Cada 5.000 KM". */
const frecuenciaTexto = (p: Plan) =>
  (p.frecuencia && p.unidad ? `Cada ${numero(p.frecuencia)} ${p.unidad.toLowerCase()}` : 'Por condición')

/** El alcance leído de corrido: "VEHICULO › Kenworth › T880". */
const alcanceTexto = (p: Plan, activos: ActivoMin[]): string => {
  if (p.activo_id) {
    const a = activos.find(x => x.id === p.activo_id)
    return a ? `Solo ${a.codigo ?? a.nombre ?? `#${p.activo_id}`}` : `Solo el activo #${p.activo_id}`
  }
  return [p.tipo_activo, p.marca, p.linea].filter(Boolean).join(' › ') || 'Sin alcance'
}

const VACIO = {
  nombre: '', alcance: 'JERARQUIA' as 'JERARQUIA' | 'ACTIVO',
  activo_id: '', tipo_activo: '', marca: '', linea: '',
  tipo_mant: 'USO' as TipoMant, frecuencia: '', unidad: 'KM',
  tipo_ot: 'PREVENTIVA', descripcion: '', costo_estimado: '',
}
type Formulario = typeof VACIO

const planAFormulario = (p: Plan): Formulario => ({
  nombre: p.nombre,
  alcance: p.activo_id ? 'ACTIVO' : 'JERARQUIA',
  activo_id: p.activo_id != null ? String(p.activo_id) : '',
  tipo_activo: p.tipo_activo ?? '', marca: p.marca ?? '', linea: p.linea ?? '',
  tipo_mant: (p.tipo_mant as TipoMant) ?? 'USO',
  frecuencia: p.frecuencia != null ? String(p.frecuencia) : '',
  unidad: p.unidad ?? 'KM',
  tipo_ot: p.tipo_ot ?? 'PREVENTIVA',
  descripcion: p.descripcion ?? '',
  costo_estimado: p.costo_estimado != null ? String(p.costo_estimado) : '',
})

// ─── Editor de tareas ─────────────────────────────────────────────────────────

/** A nivel de módulo: dentro del componente, React lo recrearía en cada render
 *  y el foco se perdería con cada tecla. */
function EditorTareas({ tareas, setTareas, actividades, repuestos }: {
  tareas: Tarea[]
  setTareas: React.Dispatch<React.SetStateAction<Tarea[]>>
  actividades: CatalogoItem[]
  repuestos: RepuestoItem[]
}) {
  const nombresActividad = actividades.map(a => a.nombre ?? '').filter(Boolean)
  const nombresRepuesto = repuestos.map(r => r.nombre)
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <Checklist sx={{ fontSize: 16, color: EAM_COLOR }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Tareas de la rutina</Typography>
        <Button size="small" startIcon={<Add />}
          onClick={() => setTareas(p => [...p, { descripcion: '', orden: p.length }])}>
          Agregar
        </Button>
      </Stack>
      {tareas.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1 }}>
          Sin tareas. Son las que se copiarán a la OT cuando toque ejecutarla.
        </Typography>
      )}
      {tareas.map((t, i) => (
        <Grid container spacing={1} key={t.id ?? `t-${i}`} sx={{ mb: 1 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              freeSolo options={nombresActividad} value={t.descripcion}
              onInputChange={(_e, v) => setTareas(p => p.map((x, j) => j === i
                ? { ...x, descripcion: v ?? '' } : x))}
              renderInput={params => (
                <TextField {...params} label="Tarea" size="small" fullWidth />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            {/* El repuesto cuelga de la tarea que lo consume, no va suelto. */}
            <Autocomplete
              freeSolo options={nombresRepuesto}
              value={repuestos.find(r => r.id === t.repuesto_id)?.nombre ?? ''}
              onInputChange={(_e, v) => {
                const cat = repuestos.find(x => x.nombre === (v ?? ''))
                setTareas(p => p.map((x, j) => j === i
                  ? { ...x, repuesto_id: cat?.id ?? null } : x))
              }}
              renderInput={params => (
                <TextField {...params} label="Repuesto que usa" size="small" fullWidth />
              )} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <TextField label="Cantidad" size="small" fullWidth type="number"
              value={t.cantidad_repuesto ?? ''}
              onChange={e => setTareas(p => p.map((x, j) => j === i
                ? { ...x, cantidad_repuesto: e.target.value ? Number(e.target.value) : null } : x))} />
          </Grid>
          <Grid size={{ xs: 5, sm: 2 }}>
            <TextField label="Horas" size="small" fullWidth type="number"
              value={t.tiempo_estimado ?? ''}
              onChange={e => setTareas(p => p.map((x, j) => j === i
                ? { ...x, tiempo_estimado: e.target.value ? Number(e.target.value) : null } : x))} />
          </Grid>
          <Grid size={{ xs: 3, sm: 1 }}>
            <IconButton size="small" onClick={() => setTareas(p => p.filter((_, j) => j !== i))}>
              <DeleteForever sx={{ fontSize: 16, color: '#DC2626' }} />
            </IconButton>
          </Grid>
        </Grid>
      ))}
    </Box>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function EAMPlanesMant() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [detalle, setDetalle] = useState<Plan | null>(null)

  const [dlg, setDlg] = useState<{ abierto: boolean; item: Plan | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState<Formulario>({ ...VACIO })
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    setForm(dlg.item ? planAFormulario(dlg.item) : { ...VACIO })
    setTareas(dlg.item ? [...(dlg.item.tareas ?? [])] : [])
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: planes = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['eam-planes'],
    queryFn: () => api.get('/eam/planes').then(r => r.data),
  })
  const { data: cumplimientos = [] } = useQuery<Cumplimiento[]>({
    queryKey: ['eam-cumplimiento'],
    queryFn: () => api.get('/eam/planes/cumplimiento').then(r => r.data),
  })
  const { data: activos = [] } = useQuery<ActivoMin[]>({
    queryKey: ['eam-activos-selector'],
    queryFn: () => api.get('/eam/activos').then(r => r.data),
  })
  const { data: actividades = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['eam-actividades'],
    queryFn: () => api.get('/eam/catalogos/actividades').then(r => r.data),
  })
  const { data: repuestos = [] } = useQuery<RepuestoItem[]>({
    queryKey: ['eam-repuestos-catalogo'],
    queryFn: () => api.get('/eam/catalogos/repuestos').then(r => r.data),
  })

  // Los niveles del alcance salen del mismo catálogo que alimenta el alta de
  // activos, encadenados: la marca depende del tipo y la línea de la marca.
  const { data: tiposActivo = [] } = useQuery<TipoActivoItem[]>({
    queryKey: ['eam-tipos-activo'],
    queryFn: () => api.get('/eam/tipos-activo').then(r => r.data),
  })
  const { data: marcas = [] } = useQuery<MarcaItem[]>({
    queryKey: ['eam-marcas', form.tipo_activo],
    queryFn: () => api.get('/eam/catalogo-vehiculos/marcas', {
      params: { solo_activas: true, tipo_activo: form.tipo_activo },
    }).then(r => r.data),
    enabled: Boolean(form.tipo_activo),
  })
  const marcaId = marcas.find(m => m.nombre === form.marca)?.id
  const { data: lineas = [] } = useQuery<LineaItem[]>({
    queryKey: ['eam-lineas', marcaId ?? 0],
    queryFn: () => api.get('/eam/catalogo-vehiculos/lineas', {
      params: { marca_id: marcaId, solo_activas: true },
    }).then(r => r.data),
    enabled: Boolean(marcaId),
  })

  const err = (e: any) => {
    const d = e?.response?.data?.detail
    toast.error(typeof d === 'string' ? d : 'No se pudo guardar la rutina')
  }
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['eam-planes'] })
    qc.invalidateQueries({ queryKey: ['eam-cumplimiento'] })
  }

  const cuerpo = () => {
    const n = (v: string) => (v.trim() === '' ? null : Number(v))
    const porActivo = form.alcance === 'ACTIVO'
    return {
      nombre: form.nombre.trim(),
      // Los dos alcances se excluyen: o un activo puntual, o la jerarquía.
      activo_id: porActivo ? n(form.activo_id) : null,
      tipo_activo: porActivo ? null : (form.tipo_activo || null),
      marca: porActivo ? null : (form.marca || null),
      linea: porActivo ? null : (form.linea || null),
      tipo_mant: form.tipo_mant,
      frecuencia: form.tipo_mant === 'CONDICION' ? null : n(form.frecuencia),
      unidad: form.tipo_mant === 'CONDICION' ? null : form.unidad,
      tipo_ot: form.tipo_ot,
      descripcion: form.descripcion.trim() || null,
      costo_estimado: n(form.costo_estimado),
      tareas: tareas.filter(t => t.descripcion.trim()).map((t, i) => ({ ...t, orden: i })),
    }
  }

  const mutGuardar = useMutation({
    mutationFn: () => (dlg.item
      ? api.put(`/eam/planes/${dlg.item.id}`, cuerpo()).then(r => r.data)
      : api.post('/eam/planes', cuerpo()).then(r => r.data)),
    onSuccess: (p: Plan) => {
      toast.success(dlg.item
        ? 'Rutina actualizada'
        : `Rutina creada · cubre ${p.activos_cubiertos} activo(s)`)
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/planes/${id}`),
    onSuccess: () => { toast.success('Rutina eliminada'); invalidar(); setDetalle(null) },
    onError: err,
  })

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return planes.filter(p => {
      if (filtroEstado === 'VENCIDA' && p.vencidas === 0) return false
      if (filtroEstado === 'PROXIMA' && p.proximas === 0) return false
      if (filtroEstado === 'SIN_EJECUTAR' && p.sin_ejecutar === 0) return false
      if (!q) return true
      return [p.nombre, alcanceTexto(p, activos), p.descripcion ?? '']
        .join(' ').toLowerCase().includes(q)
    })
  }, [planes, busqueda, filtroEstado, activos])

  const kpis = useMemo(() => ([
    { label: 'Rutinas', value: planes.length, color: EAM_COLOR },
    {
      label: 'Activos con rutina',
      value: new Set(cumplimientos.map(c => c.activo_id)).size, color: '#3B82F6',
    },
    {
      label: 'Vencidas',
      value: cumplimientos.filter(c => c.estado_rutina === 'VENCIDA').length, color: '#DC2626',
    },
    {
      label: 'Próximas',
      value: cumplimientos.filter(c => c.estado_rutina === 'PROXIMA').length, color: '#F59E0B',
    },
  ]), [planes, cumplimientos])

  /** Las filas del plan abierto, para el panel de cobertura. */
  const coberturaDe = (planId: number) =>
    cumplimientos.filter(c => c.plan_id === planId)

  const unidadesValidas = UNIDADES[form.tipo_mant] ?? []

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EventRepeat sx={{ color: EAM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
                Planes de Mantenimiento
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                CMMS · Rutinas por jerarquía de activo
              </Typography>
            </Box>
          </Box>
          <Button startIcon={<Add />} variant="contained"
            onClick={() => setDlg({ abierto: true, item: null })}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: 2 }}>
            Nueva rutina
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${k.color}44`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2, borderBottom: '1px solid #F1F5F9',
          '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 },
          '& .Mui-selected': { color: EAM_COLOR },
          '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
        }}>
          <Tab label={`Rutinas (${planes.length})`} />
          <Tab label={`Vencimientos por activo (${cumplimientos.length})`} />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && planes.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay rutinas. Con <strong>Nueva rutina</strong> se define una sola vez sobre
            el tipo, la marca o la línea de activo, y cubre a todos los equipos que encajen.
          </Alert>
        )}

        {tab !== 2 && planes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" placeholder="Buscar por nombre o alcance…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>
                ),
              }}
              sx={{ minWidth: 280, flex: 1 }} />
            <TextField select size="small" label="Con activos en" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="Todos">Cualquier estado</MenuItem>
              <MenuItem value="VENCIDA">Vencida</MenuItem>
              <MenuItem value="PROXIMA">Próxima</MenuItem>
              <MenuItem value="SIN_EJECUTAR">Sin ejecutar</MenuItem>
            </TextField>
          </Box>
        )}

        {/* ── RUTINAS ── */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Grid container spacing={2} sx={{ flex: 1, minWidth: 0 }}>
              {filtrados.map(p => (
                <Grid key={p.id} size={{ xs: 12, md: detalle ? 12 : 6, lg: detalle ? 12 : 4 }}>
                  <Card onClick={() => setDetalle(p)} sx={{
                    borderRadius: 2, cursor: 'pointer',
                    border: `1px solid ${detalle?.id === p.id ? `${EAM_COLOR}88` : '#E5E7EB'}`,
                    '&:hover': { borderColor: `${EAM_COLOR}66` },
                  }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Chip label={p.tipo_mant} size="small" sx={{
                          fontSize: 9, height: 18, fontWeight: 700,
                          bgcolor: `${TIPO_COLOR[p.tipo_mant ?? ''] ?? '#6B7280'}22`,
                          color: TIPO_COLOR[p.tipo_mant ?? ''] ?? '#6B7280',
                        }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                          {frecuenciaTexto(p)}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.75 }}>{p.nombre}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                        <AccountTree sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {alcanceTexto(p, activos)}
                        </Typography>
                      </Stack>

                      {p.activos_cubiertos === 0 ? (
                        <Alert severity="warning" icon={<WarningAmber sx={{ fontSize: 14 }} />}
                          sx={{ py: 0, fontSize: 10.5 }}>
                          No cubre ningún activo
                        </Alert>
                      ) : (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          <Chip label={`${p.activos_cubiertos} activos`} size="small"
                            sx={{ fontSize: 9, height: 18, bgcolor: '#F1F5F9' }} />
                          {p.vencidas > 0 && (
                            <Chip label={`${p.vencidas} vencidas`} size="small" sx={{
                              fontSize: 9, height: 18, fontWeight: 700,
                              bgcolor: '#DC262622', color: '#DC2626',
                            }} />
                          )}
                          {p.proximas > 0 && (
                            <Chip label={`${p.proximas} próximas`} size="small" sx={{
                              fontSize: 9, height: 18, fontWeight: 700,
                              bgcolor: '#F59E0B22', color: '#F59E0B',
                            }} />
                          )}
                          {p.sin_ejecutar > 0 && (
                            <Chip label={`${p.sin_ejecutar} sin ejecutar`} size="small"
                              sx={{ fontSize: 9, height: 18, bgcolor: '#F1F5F9', color: '#6B7280' }} />
                          )}
                        </Stack>
                      )}

                      <Stack direction="row" spacing={0.5} mt={1.5} onClick={e => e.stopPropagation()}>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', flex: 1, pt: 0.75 }}>
                          {p.tareas?.length ?? 0} tarea(s)
                        </Typography>
                        <IconButton size="small" onClick={() => setDlg({ abierto: true, item: p })}>
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => {
                          if (window.confirm(`¿Eliminar la rutina "${p.nombre}"?`)) mutBorrar.mutate(p.id)
                        }}>
                          <DeleteForever sx={{ fontSize: 14, color: '#DC2626' }} />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Panel de cobertura: la misma rutina, activo por activo. */}
            {detalle && (
              <Box sx={{
                width: 420, flexShrink: 0, bgcolor: '#fff', border: '1px solid #E5E7EB',
                borderRadius: 2, p: 2.5,
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{detalle.nombre}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {alcanceTexto(detalle, activos)} · {frecuenciaTexto(detalle)}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setDetalle(null)}>
                    <Close fontSize="small" />
                  </IconButton>
                </Stack>

                {detalle.descripcion && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                    {detalle.descripcion}
                  </Typography>
                )}

                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
                  Tareas ({detalle.tareas?.length ?? 0})
                </Typography>
                {(detalle.tareas ?? []).length === 0 ? (
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
                    Sin tareas definidas.
                  </Typography>
                ) : (
                  <Stack spacing={0.5} mb={1}>
                    {[...(detalle.tareas ?? [])].sort((a, b) => a.orden - b.orden).map((t, i) => (
                      <Stack key={t.id ?? i} direction="row" spacing={1}>
                        <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{i + 1}.</Typography>
                        <Typography sx={{ fontSize: 11.5, flex: 1 }}>{t.descripcion}</Typography>
                        {t.tiempo_estimado != null && (
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                            {t.tiempo_estimado} h
                          </Typography>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}

                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
                  Activos cubiertos ({detalle.activos_cubiertos})
                </Typography>
                {coberturaDe(detalle.id).length === 0 ? (
                  <Alert severity="warning" sx={{ fontSize: 11.5 }}>
                    Ningún activo encaja con este alcance. Revise el tipo, la marca o la línea.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {coberturaDe(detalle.id).map(c => (
                      <Box key={c.activo_id} sx={{
                        p: 1, borderRadius: 1, bgcolor: '#F8FAFC',
                        borderLeft: `3px solid ${RUTINA_COLOR[c.estado_rutina]}`,
                      }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                            {c.activo_codigo ?? `#${c.activo_id}`}
                          </Typography>
                          <Chip label={RUTINA_LABEL[c.estado_rutina]} size="small" sx={{
                            fontSize: 9, height: 17, fontWeight: 700,
                            bgcolor: `${RUTINA_COLOR[c.estado_rutina]}22`,
                            color: RUTINA_COLOR[c.estado_rutina],
                          }} />
                        </Stack>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                          {textoFaltante(c)}
                          {c.proximo_odometro != null && ` · vence a ${numero(c.proximo_odometro)} km`}
                          {c.proxima_fecha != null && ` · vence el ${c.proxima_fecha.slice(0, 10)}`}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ── VENCIMIENTOS ── */}
        {tab === 1 && (
          cumplimientos.length === 0 ? (
            <Alert severity="info">
              Todavía no hay rutinas cubriendo activos.
            </Alert>
          ) : (
            <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                    <TableCell>Estado</TableCell><TableCell>Activo</TableCell>
                    <TableCell>Rutina</TableCell><TableCell>Frecuencia</TableCell>
                    <TableCell>Última</TableCell><TableCell>Vence</TableCell>
                    <TableCell>Lectura actual</TableCell><TableCell>Falta</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cumplimientos
                    .filter(c => filtroEstado === 'Todos' || c.estado_rutina === filtroEstado)
                    .map(c => (
                      <TableRow key={`${c.plan_id}-${c.activo_id}`} hover
                        sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                        <TableCell>
                          <Chip label={RUTINA_LABEL[c.estado_rutina]} size="small" sx={{
                            fontSize: 9, height: 18, fontWeight: 700,
                            bgcolor: `${RUTINA_COLOR[c.estado_rutina]}22`,
                            color: RUTINA_COLOR[c.estado_rutina],
                          }} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={c.activo_nombre ?? ''}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                              {c.activo_codigo ?? `#${c.activo_id}`}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ fontSize: 11.5 }}>{c.plan_nombre}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {c.frecuencia ? `${numero(c.frecuencia)} ${(c.unidad ?? '').toLowerCase()}` : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {c.ultima_ejecucion_fecha ? c.ultima_ejecucion_fecha.slice(0, 10) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {c.proximo_odometro != null ? `${numero(c.proximo_odometro)} km`
                            : c.proxima_fecha != null ? c.proxima_fecha.slice(0, 10)
                              : c.proximo_horometro != null ? `${numero(c.proximo_horometro)} h` : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {c.unidad_faltante === 'HORAS'
                            ? `${numero(c.horometro_activo)} h`
                            : `${numero(c.odometro_activo)} km`}
                        </TableCell>
                        <TableCell sx={{
                          fontSize: 11.5, fontWeight: 600,
                          color: RUTINA_COLOR[c.estado_rutina],
                        }}>
                          {textoFaltante(c)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Paper>
          )
        )}

        {/* ── ALTA / EDICIÓN ── */}
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.nombre}` : 'Nueva rutina de mantenimiento'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField label="Nombre de la rutina *" size="small" fullWidth autoFocus
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select label="Tipo de OT que genera" size="small" fullWidth
                  value={form.tipo_ot}
                  onChange={e => setForm(f => ({ ...f, tipo_ot: e.target.value }))}>
                  {TIPOS_OT.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>

              {/* ── Alcance ── */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>ALCANCE</Typography>
                </Divider>
                <TextField select label="A qué aplica" size="small" fullWidth value={form.alcance}
                  onChange={e => setForm(f => ({ ...f, alcance: e.target.value as Formulario['alcance'] }))}
                  helperText="Por jerarquía cubre a todos los activos que encajen; se escribe una sola vez">
                  <MenuItem value="JERARQUIA">Por jerarquía de activo (tipo › marca › línea)</MenuItem>
                  <MenuItem value="ACTIVO">Solo a un activo puntual</MenuItem>
                </TextField>
              </Grid>

              {form.alcance === 'ACTIVO' ? (
                <Grid size={{ xs: 12 }}>
                  <TextField select label="Activo *" size="small" fullWidth value={form.activo_id}
                    onChange={e => setForm(f => ({ ...f, activo_id: e.target.value }))}>
                    <MenuItem value="">Seleccionar…</MenuItem>
                    {activos.map(a => (
                      <MenuItem key={a.id} value={String(a.id)}>
                        {a.codigo ? `${a.codigo} — ${a.nombre ?? ''}` : (a.nombre ?? `#${a.id}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ) : (
                <>
                  {/* Los mismos catálogos con que se da de alta un activo, para
                      que el alcance case exactamente con lo que trae el equipo. */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField select label="Tipo de activo" size="small" fullWidth
                      value={form.tipo_activo}
                      onChange={e => setForm(f => ({
                        // Al cambiar de nivel, los de abajo dejan de aplicar.
                        ...f, tipo_activo: e.target.value, marca: '', linea: '',
                      }))}>
                      <MenuItem value="">Todos los tipos</MenuItem>
                      {tiposActivo.map(t => (
                        <MenuItem key={t.id} value={t.codigo ?? t.nombre ?? ''}>
                          {t.nombre ?? t.codigo}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField select label="Marca" size="small" fullWidth value={form.marca}
                      disabled={!form.tipo_activo}
                      onChange={e => setForm(f => ({ ...f, marca: e.target.value, linea: '' }))}
                      helperText={!form.tipo_activo ? 'Elija primero el tipo' : undefined}>
                      <MenuItem value="">Todas las marcas</MenuItem>
                      {marcas.map(m => <MenuItem key={m.id} value={m.nombre}>{m.nombre}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField select label="Línea" size="small" fullWidth value={form.linea}
                      disabled={!form.marca}
                      onChange={e => setForm(f => ({ ...f, linea: e.target.value }))}
                      helperText={!form.marca ? 'Elija primero la marca' : undefined}>
                      <MenuItem value="">Todas las líneas</MenuItem>
                      {lineas.map(l => <MenuItem key={l.id} value={l.nombre}>{l.nombre}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="info" sx={{ fontSize: 11.5, py: 0.25 }}>
                      Deje en blanco los niveles que no quiera acotar: con solo el tipo, la
                      rutina cubre a todos los activos de ese tipo.
                      {' '}
                      {(() => {
                        const n = activos.filter(a =>
                          (!form.tipo_activo || (a.tipo_activo ?? '').toUpperCase() === form.tipo_activo.toUpperCase())
                          && (!form.marca || (a.marca ?? '').toUpperCase() === form.marca.toUpperCase())
                          && (!form.linea || (a.linea ?? '').toUpperCase() === form.linea.toUpperCase())
                        ).length
                        return form.tipo_activo || form.marca || form.linea
                          ? `Hoy encajan ${n} activo(s).`
                          : ''
                      })()}
                    </Alert>
                  </Grid>
                </>
              )}

              {/* ── Frecuencia ── */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>FRECUENCIA</Typography>
                </Divider>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select label="Se mide por" size="small" fullWidth value={form.tipo_mant}
                  onChange={e => {
                    const tm = e.target.value as TipoMant
                    // La unidad depende de cómo se mide: KM no aplica al tiempo.
                    setForm(f => ({ ...f, tipo_mant: tm, unidad: UNIDADES[tm][0] ?? '' }))
                  }}>
                  {TIPOS_MANT.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField label="Cada" size="small" fullWidth type="number"
                  value={form.frecuencia} disabled={form.tipo_mant === 'CONDICION'}
                  onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField select label="Unidad" size="small" fullWidth value={form.unidad}
                  disabled={unidadesValidas.length === 0}
                  helperText={form.tipo_mant === 'CONDICION'
                    ? 'Por condición no tiene vencimiento automático' : undefined}
                  onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                  {unidadesValidas.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Costo estimado" size="small" fullWidth type="number"
                  value={form.costo_estimado}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  onChange={e => setForm(f => ({ ...f, costo_estimado: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField label="Descripción" size="small" fullWidth value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ mb: 1 }} />
                <EditorTareas tareas={tareas} setTareas={setTareas}
                  actividades={actividades} repuestos={repuestos} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained"
              disabled={!form.nombre.trim() || mutGuardar.isPending
                || (form.alcance === 'ACTIVO' && !form.activo_id)
                || (form.alcance === 'JERARQUIA' && !form.tipo_activo && !form.marca && !form.linea)}
              onClick={() => mutGuardar.mutate()}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              {mutGuardar.isPending ? 'Guardando…' : 'Guardar rutina'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
