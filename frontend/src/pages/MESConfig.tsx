import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Paper, Chip, Stack, Button, TextField,
  MenuItem, Table, TableHead, TableBody, TableRow, TableCell, Divider,
  InputAdornment, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Settings as SettingsIcon, Add as AddIcon, Factory as FactoryIcon,
  Timeline as LineIcon, Schedule as ShiftIcon, PrecisionManufacturing as MachineIcon,
  Badge as OperatorIcon, Inventory2 as ProductIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

// ─── Identidad MES / tema claro ──────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

// ─── Enums del backend ───────────────────────────────────────────────────────
const TIPOS_FABRICACION = ['DISCRETA', 'PROCESOS', 'CONTINUA', 'LOTES', 'MAQUILA', 'REEMPAQUE', 'KITTING'] as const
const TIPOS_TURNO = ['MANANA', 'TARDE', 'NOCHE', 'FLEXIBLE'] as const
const TIPOS_PRODUCTO = ['MATERIA_PRIMA', 'SEMIELABORADO', 'PRODUCTO_TERMINADO', 'SUBPRODUCTO', 'EMPAQUE', 'HERRAMIENTA'] as const

const TURNO_LABEL: Record<string, string> = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche', FLEXIBLE: 'Flexible' }
const TURNO_COLOR: Record<string, string> = { MANANA: '#D97706', TARDE: '#2563EB', NOCHE: '#6D28D9', FLEXIBLE: '#64748B' }
const FAB_COLOR: Record<string, string> = {
  DISCRETA: '#2563EB', PROCESOS: '#7C3AED', CONTINUA: '#0891B2', LOTES: '#D97706',
  MAQUILA: '#DB2777', REEMPAQUE: '#16A34A', KITTING: '#475569',
}
const PROD_COLOR: Record<string, string> = {
  MATERIA_PRIMA: '#D97706', SEMIELABORADO: '#7C3AED', PRODUCTO_TERMINADO: '#16A34A',
  SUBPRODUCTO: '#64748B', EMPAQUE: '#2563EB', HERRAMIENTA: '#475569',
}

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface Planta {
  id: number; codigo: string; nombre: string; tipo_fabricacion: string
  ciudad?: string | null; pais?: string | null; descripcion?: string | null; activo: boolean
}
interface Linea {
  id: number; planta_id: number; codigo: string; nombre: string
  capacidad_hora?: number | null; unidad_medida?: string | null; activo: boolean
}
interface Turno {
  id: number; planta_id: number; nombre: string; tipo: string
  hora_inicio: string; hora_fin: string; duracion_horas: number; activo?: boolean
}
interface Equipo {
  id: number; celda_id?: number | null; codigo: string; nombre: string
  marca?: string | null; modelo?: string | null; capacidad_hora?: number | null; activo?: boolean
}
interface Operario {
  id: number; codigo: string; nombre: string; cedula?: string | null
  cargo?: string | null; planta_id?: number | null; activo?: boolean
}
interface Producto {
  id: number; codigo: string; nombre: string; tipo: string; unidad_medida: string
  descripcion?: string | null; requiere_lote: boolean; activo?: boolean
}

// ─── Helpers de presentación ─────────────────────────────────────────────────
const cardSx = { bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5 } as const

const enumChip = (valor: string, color: string, label?: string) => (
  <Chip size="small" label={label ?? valor.replace(/_/g, ' ')}
    sx={{ fontWeight: 700, fontSize: 10, color, bgcolor: alpha(color, 0.12) }} />
)

const activoChip = (activo?: boolean) =>
  activo === false
    ? <Chip size="small" label="Inactivo" sx={{ fontWeight: 700, fontSize: 10, color: '#DC2626', bgcolor: '#FEF2F2' }} />
    : <Chip size="small" label="Activo" sx={{ fontWeight: 700, fontSize: 10, color: '#16A34A', bgcolor: '#F0FDF4' }} />

const num = (v?: number | null) => (v == null ? '—' : v.toLocaleString('es-CO'))

function TablaEncabezado({ columnas }: { columnas: string[] }) {
  return (
    <TableHead>
      <TableRow>
        {columnas.map(c => <TableCell key={c} sx={{ whiteSpace: 'nowrap', fontWeight: 700, fontSize: 11.5, color: '#64748B' }}>{c}</TableCell>)}
      </TableRow>
    </TableHead>
  )
}

function FilaVacia({ colSpan, cargando, mensaje }: { colSpan: number; cargando: boolean; mensaje: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center">
        <Typography color="text.secondary" fontSize={13} py={2.5}>{cargando ? 'Cargando…' : mensaje}</Typography>
      </TableCell>
    </TableRow>
  )
}

function TituloSeccion({ texto }: { texto: string }) {
  return (
    <Typography fontWeight={700} fontSize={13.5} color={MES_DARK} mb={1.5}
      sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {texto}
    </Typography>
  )
}

const btnCrearSx = {
  bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK },
  textTransform: 'none', fontWeight: 700, borderRadius: 2, height: 40,
} as const

// ═══ Tab 1 · Plantas ═════════════════════════════════════════════════════════
const PLANTA_VACIA = { codigo: '', nombre: '', descripcion: '', ciudad: '', pais: '', tipo_fabricacion: 'DISCRETA' }

function TabPlantas() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...PLANTA_VACIA })
  const [tried, setTried] = useState(false)

  const { data: plantas = [], isLoading } = useQuery<Planta[]>({
    queryKey: ['mes-plantas'], queryFn: () => api.get('/mes/plantas').then(r => r.data),
  })

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/plantas', body),
    onSuccess: (r: any) => {
      toast.success(`Planta ${r.data?.codigo ?? ''} creada`)
      qc.invalidateQueries({ queryKey: ['mes-plantas'] })
      setForm({ ...PLANTA_VACIA }); setTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear la planta'),
  })

  const errCodigo = tried && !form.codigo.trim()
  const errNombre = tried && !form.nombre.trim()

  const crear = () => {
    setTried(true)
    if (!form.codigo.trim() || !form.nombre.trim()) return
    mutCrear.mutate({
      codigo: form.codigo.trim(), nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      ciudad: form.ciudad.trim() || undefined, pais: form.pais.trim() || undefined,
      tipo_fabricacion: form.tipo_fabricacion,
    })
  }

  return (
    <Paper elevation={0} sx={cardSx}>
      <TituloSeccion texto="Nueva planta" />
      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
          <TextField label="Código *" size="small" fullWidth value={form.codigo}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            error={errCodigo} helperText={errCodigo ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 3 }}>
          <TextField label="Nombre *" size="small" fullWidth value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            error={errNombre} helperText={errNombre ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
          <TextField select label="Tipo de fabricación" size="small" fullWidth value={form.tipo_fabricacion}
            onChange={e => setForm(f => ({ ...f, tipo_fabricacion: e.target.value }))}>
            {TIPOS_FABRICACION.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Ciudad" size="small" fullWidth value={form.ciudad}
            onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 1.5 }}>
          <TextField label="País" size="small" fullWidth value={form.pais}
            onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField label="Descripción" size="small" fullWidth value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={mutCrear.isPending}
            onClick={crear} sx={btnCrearSx}>Crear planta</Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />
      <TituloSeccion texto={`Plantas registradas (${plantas.length})`} />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TablaEncabezado columnas={['Código', 'Nombre', 'Tipo de fabricación', 'Ciudad', 'Estado']} />
          <TableBody>
            {plantas.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{p.codigo}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{p.nombre}</TableCell>
                <TableCell>{enumChip(p.tipo_fabricacion, FAB_COLOR[p.tipo_fabricacion] ?? '#64748B')}</TableCell>
                <TableCell>{p.ciudad || '—'}</TableCell>
                <TableCell>{activoChip(p.activo)}</TableCell>
              </TableRow>
            ))}
            {plantas.length === 0 && <FilaVacia colSpan={5} cargando={isLoading} mensaje="Sin plantas registradas. Cree la primera con el formulario superior." />}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

// ═══ Tab 2 · Líneas ══════════════════════════════════════════════════════════
const LINEA_VACIA = { planta_id: '', codigo: '', nombre: '', capacidad_hora: '', unidad_medida: '' }

function TabLineas() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...LINEA_VACIA })
  const [tried, setTried] = useState(false)

  const { data: lineas = [], isLoading } = useQuery<Linea[]>({
    queryKey: ['mes-lineas'], queryFn: () => api.get('/mes/lineas').then(r => r.data),
  })
  const { data: plantas = [] } = useQuery<Planta[]>({
    queryKey: ['mes-plantas'], queryFn: () => api.get('/mes/plantas').then(r => r.data),
  })
  const planta = (id: number) => plantas.find(p => p.id === id)

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/lineas', body),
    onSuccess: (r: any) => {
      toast.success(`Línea ${r.data?.codigo ?? ''} creada`)
      qc.invalidateQueries({ queryKey: ['mes-lineas'] })
      setForm({ ...LINEA_VACIA }); setTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear la línea'),
  })

  const errPlanta = tried && !form.planta_id
  const errCodigo = tried && !form.codigo.trim()
  const errNombre = tried && !form.nombre.trim()

  const crear = () => {
    setTried(true)
    if (!form.planta_id || !form.codigo.trim() || !form.nombre.trim()) return
    mutCrear.mutate({
      planta_id: Number(form.planta_id),
      codigo: form.codigo.trim(), nombre: form.nombre.trim(),
      capacidad_hora: form.capacidad_hora ? Number(form.capacidad_hora) : undefined,
      unidad_medida: form.unidad_medida.trim() || undefined,
    })
  }

  return (
    <Paper elevation={0} sx={cardSx}>
      <TituloSeccion texto="Nueva línea de producción" />
      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField select label="Planta *" size="small" fullWidth value={form.planta_id}
            onChange={e => setForm(f => ({ ...f, planta_id: e.target.value }))}
            error={errPlanta} helperText={errPlanta ? 'Seleccione la planta' : ''}>
            <MenuItem value="">Seleccionar…</MenuItem>
            {plantas.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField label="Código *" size="small" fullWidth value={form.codigo}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            error={errCodigo} helperText={errCodigo ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField label="Nombre *" size="small" fullWidth value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            error={errNombre} helperText={errNombre ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <TextField label="Capacidad/hora" type="number" size="small" fullWidth value={form.capacidad_hora}
            onChange={e => setForm(f => ({ ...f, capacidad_hora: e.target.value }))}
            InputProps={{ endAdornment: <InputAdornment position="end">{form.unidad_medida || 'UN'}</InputAdornment> }} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <TextField label="Unidad de medida" size="small" fullWidth value={form.unidad_medida}
            onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))} placeholder="UN" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={mutCrear.isPending}
            onClick={crear} sx={btnCrearSx}>Crear línea</Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />
      <TituloSeccion texto={`Líneas registradas (${lineas.length})`} />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TablaEncabezado columnas={['Código', 'Nombre', 'Planta', 'Capacidad/hora', 'Estado']} />
          <TableBody>
            {lineas.map(l => (
              <TableRow key={l.id} hover>
                <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{l.codigo}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{l.nombre}</TableCell>
                <TableCell>{planta(l.planta_id)?.nombre ?? `#${l.planta_id}`}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{num(l.capacidad_hora)}</TableCell>
                <TableCell>{activoChip(l.activo)}</TableCell>
              </TableRow>
            ))}
            {lineas.length === 0 && <FilaVacia colSpan={5} cargando={isLoading} mensaje="Sin líneas registradas. Debe existir al menos una planta." />}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

// ═══ Tab 3 · Turnos ══════════════════════════════════════════════════════════
const TURNO_VACIO = { planta_id: '', nombre: '', tipo: 'MANANA', hora_inicio: '', hora_fin: '' }

const calcularDuracion = (inicio: string, fin: string): number => {
  if (!inicio || !fin) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (minutos <= 0) minutos += 24 * 60 // turno que cruza medianoche
  return Math.round((minutos / 60) * 100) / 100
}

function TabTurnos() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...TURNO_VACIO })
  const [tried, setTried] = useState(false)

  const { data: turnos = [], isLoading } = useQuery<Turno[]>({
    queryKey: ['mes-turnos'], queryFn: () => api.get('/mes/turnos').then(r => r.data),
  })
  const { data: plantas = [] } = useQuery<Planta[]>({
    queryKey: ['mes-plantas'], queryFn: () => api.get('/mes/plantas').then(r => r.data),
  })
  const planta = (id: number) => plantas.find(p => p.id === id)

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/turnos', body),
    onSuccess: (r: any) => {
      toast.success(`Turno ${r.data?.nombre ?? ''} creado`)
      qc.invalidateQueries({ queryKey: ['mes-turnos'] })
      setForm({ ...TURNO_VACIO }); setTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear el turno'),
  })

  const errPlanta = tried && !form.planta_id
  const errNombre = tried && !form.nombre.trim()
  const errInicio = tried && !form.hora_inicio
  const errFin = tried && !form.hora_fin
  const duracion = calcularDuracion(form.hora_inicio, form.hora_fin)

  const crear = () => {
    setTried(true)
    if (!form.planta_id || !form.nombre.trim() || !form.hora_inicio || !form.hora_fin) return
    mutCrear.mutate({
      planta_id: Number(form.planta_id), nombre: form.nombre.trim(), tipo: form.tipo,
      hora_inicio: form.hora_inicio, hora_fin: form.hora_fin, duracion_horas: duracion,
    })
  }

  return (
    <Paper elevation={0} sx={cardSx}>
      <TituloSeccion texto="Nuevo turno" />
      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField select label="Planta *" size="small" fullWidth value={form.planta_id}
            onChange={e => setForm(f => ({ ...f, planta_id: e.target.value }))}
            error={errPlanta} helperText={errPlanta ? 'Seleccione la planta' : ''}>
            <MenuItem value="">Seleccionar…</MenuItem>
            {plantas.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField label="Nombre *" size="small" fullWidth value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            error={errNombre} helperText={errNombre ? 'Requerido' : ''} placeholder="Turno mañana A" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
          <TextField select label="Tipo" size="small" fullWidth value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            {TIPOS_TURNO.map(t => <MenuItem key={t} value={t}>{TURNO_LABEL[t]}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Hora inicio *" type="time" size="small" fullWidth value={form.hora_inicio}
            onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
            error={errInicio} helperText={errInicio ? 'Requerido' : ''} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Hora fin *" type="time" size="small" fullWidth value={form.hora_fin}
            onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))}
            error={errFin} helperText={errFin ? 'Requerido' : ''} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Typography fontSize={12} color="text.secondary" sx={{ pt: 1 }}>
            Duración calculada: <b>{duracion > 0 ? `${duracion.toLocaleString('es-CO')} h` : '—'}</b>
            {duracion > 0 && form.hora_fin <= form.hora_inicio ? ' (cruza medianoche)' : ''}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={mutCrear.isPending}
            onClick={crear} sx={btnCrearSx}>Crear turno</Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />
      <TituloSeccion texto={`Turnos registrados (${turnos.length})`} />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TablaEncabezado columnas={['Nombre', 'Planta', 'Tipo', 'Horario', 'Duración']} />
          <TableBody>
            {turnos.map(t => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{t.nombre}</TableCell>
                <TableCell>{planta(t.planta_id)?.nombre ?? `#${t.planta_id}`}</TableCell>
                <TableCell>{enumChip(t.tipo, TURNO_COLOR[t.tipo] ?? '#64748B', TURNO_LABEL[t.tipo])}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{t.hora_inicio} – {t.hora_fin}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{t.duracion_horas.toLocaleString('es-CO')} h</TableCell>
              </TableRow>
            ))}
            {turnos.length === 0 && <FilaVacia colSpan={5} cargando={isLoading} mensaje="Sin turnos registrados. Debe existir al menos una planta." />}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

// ═══ Tab 4 · Equipos ═════════════════════════════════════════════════════════
const EQUIPO_VACIO = { celda_id: '', codigo: '', nombre: '', marca: '', modelo: '', capacidad_hora: '' }

function TabEquipos() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EQUIPO_VACIO })
  const [tried, setTried] = useState(false)

  const { data: equipos = [], isLoading } = useQuery<Equipo[]>({
    queryKey: ['mes-equipos'], queryFn: () => api.get('/mes/equipos').then(r => r.data),
  })

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/equipos', body),
    onSuccess: (r: any) => {
      toast.success(`Equipo ${r.data?.codigo ?? ''} creado`)
      qc.invalidateQueries({ queryKey: ['mes-equipos'] })
      setForm({ ...EQUIPO_VACIO }); setTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear el equipo'),
  })

  const errCodigo = tried && !form.codigo.trim()
  const errNombre = tried && !form.nombre.trim()

  const crear = () => {
    setTried(true)
    if (!form.codigo.trim() || !form.nombre.trim()) return
    mutCrear.mutate({
      celda_id: form.celda_id ? Number(form.celda_id) : undefined,
      codigo: form.codigo.trim(), nombre: form.nombre.trim(),
      marca: form.marca.trim() || undefined, modelo: form.modelo.trim() || undefined,
      capacidad_hora: form.capacidad_hora ? Number(form.capacidad_hora) : undefined,
    })
  }

  return (
    <Paper elevation={0} sx={cardSx}>
      <TituloSeccion texto="Nuevo equipo" />
      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
          <TextField label="Código *" size="small" fullWidth value={form.codigo}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            error={errCodigo} helperText={errCodigo ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 3 }}>
          <TextField label="Nombre *" size="small" fullWidth value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            error={errNombre} helperText={errNombre ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Marca" size="small" fullWidth value={form.marca}
            onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Modelo" size="small" fullWidth value={form.modelo}
            onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 1.5 }}>
          <TextField label="Capacidad/hora" type="number" size="small" fullWidth value={form.capacidad_hora}
            onChange={e => setForm(f => ({ ...f, capacidad_hora: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 1.5 }}>
          <TextField label="Celda (ID)" type="number" size="small" fullWidth value={form.celda_id}
            onChange={e => setForm(f => ({ ...f, celda_id: e.target.value }))}
            helperText="Opcional" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={mutCrear.isPending}
            onClick={crear} sx={btnCrearSx}>Crear equipo</Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />
      <TituloSeccion texto={`Equipos registrados (${equipos.length})`} />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TablaEncabezado columnas={['Código', 'Nombre', 'Marca', 'Modelo', 'Capacidad/hora', 'Estado']} />
          <TableBody>
            {equipos.map(eq => (
              <TableRow key={eq.id} hover>
                <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{eq.codigo}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{eq.nombre}</TableCell>
                <TableCell>{eq.marca || '—'}</TableCell>
                <TableCell>{eq.modelo || '—'}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{num(eq.capacidad_hora)}</TableCell>
                <TableCell>{activoChip(eq.activo)}</TableCell>
              </TableRow>
            ))}
            {equipos.length === 0 && <FilaVacia colSpan={6} cargando={isLoading} mensaje="Sin equipos registrados." />}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

// ═══ Tab 5 · Operarios ═══════════════════════════════════════════════════════
const OPERARIO_VACIO = { codigo: '', nombre: '', cedula: '', cargo: '', planta_id: '' }

function TabOperarios() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...OPERARIO_VACIO })
  const [tried, setTried] = useState(false)

  const { data: operarios = [], isLoading } = useQuery<Operario[]>({
    queryKey: ['mes-operarios'], queryFn: () => api.get('/mes/operarios').then(r => r.data),
  })
  const { data: plantas = [] } = useQuery<Planta[]>({
    queryKey: ['mes-plantas'], queryFn: () => api.get('/mes/plantas').then(r => r.data),
  })
  const planta = (id?: number | null) => plantas.find(p => p.id === id)

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/operarios', body),
    onSuccess: (r: any) => {
      toast.success(`Operario ${r.data?.nombre ?? ''} creado`)
      qc.invalidateQueries({ queryKey: ['mes-operarios'] })
      setForm({ ...OPERARIO_VACIO }); setTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear el operario'),
  })

  const errCodigo = tried && !form.codigo.trim()
  const errNombre = tried && !form.nombre.trim()

  const crear = () => {
    setTried(true)
    if (!form.codigo.trim() || !form.nombre.trim()) return
    mutCrear.mutate({
      codigo: form.codigo.trim(), nombre: form.nombre.trim(),
      cedula: form.cedula.trim() || undefined, cargo: form.cargo.trim() || undefined,
      planta_id: form.planta_id ? Number(form.planta_id) : undefined,
    })
  }

  return (
    <Paper elevation={0} sx={cardSx}>
      <TituloSeccion texto="Nuevo operario" />
      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
          <TextField label="Código *" size="small" fullWidth value={form.codigo}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            error={errCodigo} helperText={errCodigo ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 3 }}>
          <TextField label="Nombre completo *" size="small" fullWidth value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            error={errNombre} helperText={errNombre ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Cédula" size="small" fullWidth value={form.cedula}
            onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField label="Cargo" size="small" fullWidth value={form.cargo}
            onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Operario de línea" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField select label="Planta" size="small" fullWidth value={form.planta_id}
            onChange={e => setForm(f => ({ ...f, planta_id: e.target.value }))}>
            <MenuItem value="">Sin asignar</MenuItem>
            {plantas.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={mutCrear.isPending}
            onClick={crear} sx={btnCrearSx}>Crear operario</Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />
      <TituloSeccion texto={`Operarios registrados (${operarios.length})`} />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TablaEncabezado columnas={['Código', 'Nombre', 'Cédula', 'Cargo', 'Planta', 'Estado']} />
          <TableBody>
            {operarios.map(o => (
              <TableRow key={o.id} hover>
                <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{o.codigo}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{o.nombre}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{o.cedula || '—'}</TableCell>
                <TableCell>{o.cargo || '—'}</TableCell>
                <TableCell>{planta(o.planta_id)?.nombre ?? '—'}</TableCell>
                <TableCell>{activoChip(o.activo)}</TableCell>
              </TableRow>
            ))}
            {operarios.length === 0 && <FilaVacia colSpan={6} cargando={isLoading} mensaje="Sin operarios registrados." />}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

// ═══ Tab 6 · Productos ═══════════════════════════════════════════════════════
const PRODUCTO_VACIO = { codigo: '', nombre: '', tipo: 'PRODUCTO_TERMINADO', unidad_medida: 'UN', descripcion: '', requiere_lote: 'SI' }

function TabProductos() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...PRODUCTO_VACIO })
  const [tried, setTried] = useState(false)

  const { data: productos = [], isLoading } = useQuery<Producto[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data),
  })

  const mutCrear = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/productos', body),
    onSuccess: (r: any) => {
      toast.success(`Producto ${r.data?.codigo ?? ''} creado`)
      qc.invalidateQueries({ queryKey: ['mes-productos'] })
      setForm({ ...PRODUCTO_VACIO }); setTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear el producto'),
  })

  const errCodigo = tried && !form.codigo.trim()
  const errNombre = tried && !form.nombre.trim()

  const crear = () => {
    setTried(true)
    if (!form.codigo.trim() || !form.nombre.trim()) return
    mutCrear.mutate({
      codigo: form.codigo.trim(), nombre: form.nombre.trim(), tipo: form.tipo,
      unidad_medida: form.unidad_medida.trim() || 'UN',
      descripcion: form.descripcion.trim() || undefined,
      requiere_lote: form.requiere_lote === 'SI',
    })
  }

  return (
    <Paper elevation={0} sx={cardSx}>
      <TituloSeccion texto="Nuevo producto" />
      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
          <TextField label="Código (SKU) *" size="small" fullWidth value={form.codigo}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            error={errCodigo} helperText={errCodigo ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 3 }}>
          <TextField label="Nombre *" size="small" fullWidth value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            error={errNombre} helperText={errNombre ? 'Requerido' : ''} />
        </Grid>
        <Grid size={{ xs: 12, sm: 5, md: 2.5 }}>
          <TextField select label="Tipo" size="small" fullWidth value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            {TIPOS_PRODUCTO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
          <TextField label="Unidad de medida" size="small" fullWidth value={form.unidad_medida}
            onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))} placeholder="UN" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <TextField select label="Requiere lote (trazabilidad)" size="small" fullWidth value={form.requiere_lote}
            onChange={e => setForm(f => ({ ...f, requiere_lote: e.target.value }))}>
            <MenuItem value="SI">Sí — control por lote</MenuItem>
            <MenuItem value="NO">No</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <TextField label="Descripción" size="small" fullWidth value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} disabled={mutCrear.isPending}
            onClick={crear} sx={btnCrearSx}>Crear producto</Button>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />
      <TituloSeccion texto={`Productos registrados (${productos.length})`} />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TablaEncabezado columnas={['Código', 'Nombre', 'Tipo', 'UM', 'Lote', 'Estado']} />
          <TableBody>
            {productos.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{p.codigo}</TableCell>
                <TableCell>
                  <Typography fontSize={13} fontWeight={600}>{p.nombre}</Typography>
                  {p.descripcion && <Typography fontSize={11} color="text.secondary">{p.descripcion}</Typography>}
                </TableCell>
                <TableCell>{enumChip(p.tipo, PROD_COLOR[p.tipo] ?? '#64748B')}</TableCell>
                <TableCell>{p.unidad_medida}</TableCell>
                <TableCell>
                  {p.requiere_lote
                    ? <Chip size="small" label="Con lote" sx={{ fontWeight: 700, fontSize: 10, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.12) }} />
                    : <Chip size="small" label="Sin lote" sx={{ fontWeight: 700, fontSize: 10, color: '#64748B', bgcolor: '#F1F5F9' }} />}
                </TableCell>
                <TableCell>{activoChip(p.activo)}</TableCell>
              </TableRow>
            ))}
            {productos.length === 0 && <FilaVacia colSpan={6} cargando={isLoading} mensaje="Sin productos registrados." />}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

// ═══ Página principal ════════════════════════════════════════════════════════
const TABS = [
  { label: 'Plantas', icon: <FactoryIcon sx={{ fontSize: 18 }} /> },
  { label: 'Líneas', icon: <LineIcon sx={{ fontSize: 18 }} /> },
  { label: 'Turnos', icon: <ShiftIcon sx={{ fontSize: 18 }} /> },
  { label: 'Equipos', icon: <MachineIcon sx={{ fontSize: 18 }} /> },
  { label: 'Operarios', icon: <OperatorIcon sx={{ fontSize: 18 }} /> },
  { label: 'Productos', icon: <ProductIcon sx={{ fontSize: 18 }} /> },
]

export default function MESConfig() {
  const [tab, setTab] = useState(0)

  return (
    <Layout title="MES · Configuración / Datos Maestros">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
          <SettingsIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color={MES_DARK}>Configuración · Datos Maestros</Typography>
            <Typography fontSize={12} color="text.secondary">
              Datos maestros controlados · plantas, líneas, turnos, equipos, operarios y productos
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', mb: 2 }}>
          <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{
              px: 1,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 48, color: '#64748B' },
              '& .Mui-selected': { color: `${MES_DARK} !important` },
              '& .MuiTabs-indicator': { bgcolor: MES_COLOR, height: 3, borderRadius: 1.5 },
            }}>
            {TABS.map(t => <Tab key={t.label} icon={t.icon} iconPosition="start" label={t.label} />)}
          </Tabs>
        </Paper>

        {/* Contenido del tab activo */}
        {tab === 0 && <TabPlantas />}
        {tab === 1 && <TabLineas />}
        {tab === 2 && <TabTurnos />}
        {tab === 3 && <TabEquipos />}
        {tab === 4 && <TabOperarios />}
        {tab === 5 && <TabProductos />}
      </Box>
    </Layout>
  )
}
