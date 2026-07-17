import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Stack, Tooltip, Badge, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, PrecisionManufacturing, ReportProblem, History, Stop,
  Close as CloseIcon, CheckCircle,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const TURNOS = ['MANANA', 'TARDE', 'NOCHE', 'FLEXIBLE'] as const
const TURNO_LABEL: Record<string, string> = {
  MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche', FLEXIBLE: 'Flexible',
}
const TIPOS_PARADA = ['PLANEADA', 'NO_PLANEADA', 'CALIDAD', 'MANTENIMIENTO', 'SETUP', 'MATERIAL'] as const

const ESTADO_EJEC_STYLE: Record<string, { color: string; bg: string }> = {
  PENDIENTE:   { color: '#64748B', bg: '#F1F5F9' },
  EN_PROGRESO: { color: '#16A34A', bg: '#F0FDF4' },
  PAUSADA:     { color: '#D97706', bg: '#FFFBEB' },
  COMPLETADA:  { color: '#475569', bg: '#F8FAFC' },
  CANCELADA:   { color: '#DC2626', bg: '#FEF2F2' },
}
const TIPO_PARADA_COLOR: Record<string, string> = {
  PLANEADA: '#2563EB', NO_PLANEADA: '#DC2626', CALIDAD: '#7C3AED',
  MANTENIMIENTO: '#D97706', SETUP: '#0891B2', MATERIAL: '#64748B',
}

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface Ejecucion {
  id: number; orden_id: number; estado: string; turno: string
  cantidad_producida: number; cantidad_scrap: number
  operario_id?: number | null; equipo_id?: number | null
}
interface Parada {
  id: number; ejecucion_id: number; tipo: string; causa: string; descripcion?: string | null
  fecha_inicio: string; fecha_fin?: string | null; duracion_min?: number | null
}
interface Orden {
  id: number; numero: string; producto_id: number; estado: string; prioridad: string
  cantidad_planificada: number; cantidad_producida: number; cantidad_scrap: number
  linea_id?: number | null
}
interface Producto { id: number; codigo: string; nombre: string; tipo: string; unidad_medida: string }
interface Operario { id: number; nombre: string; codigo?: string }
interface Equipo { id: number; nombre: string; codigo?: string }

const EMPTY_INICIO = { orden_id: '', operario_id: '', equipo_id: '', turno: 'MANANA' }
const EMPTY_PARADA = { tipo: 'NO_PLANEADA', causa: '', descripcion: '' }
const EMPTY_CIERRE = { cantidad_producida: '', cantidad_scrap: '0', observaciones: '' }

const fechaCorta = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function MESEjecucion() {
  const qc = useQueryClient()

  // Diálogo iniciar ejecución
  const [inicioOpen, setInicioOpen] = useState(false)
  const [formInicio, setFormInicio] = useState({ ...EMPTY_INICIO })
  const [triedInicio, setTriedInicio] = useState(false)

  // Diálogo registrar parada
  const [paradaDe, setParadaDe] = useState<Ejecucion | null>(null)
  const [formParada, setFormParada] = useState({ ...EMPTY_PARADA })
  const [triedParada, setTriedParada] = useState(false)

  // Diálogo ver paradas
  const [verParadasDe, setVerParadasDe] = useState<Ejecucion | null>(null)

  // Diálogo cerrar ejecución
  const [cierreDe, setCierreDe] = useState<Ejecucion | null>(null)
  const [formCierre, setFormCierre] = useState({ ...EMPTY_CIERRE })
  const [triedCierre, setTriedCierre] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: ejecuciones = [], isLoading } = useQuery<Ejecucion[]>({
    queryKey: ['mes-ejecuciones'], queryFn: () => api.get('/mes/ejecuciones').then(r => r.data),
  })
  const { data: ordenes = [] } = useQuery<Orden[]>({
    queryKey: ['mes-ordenes'], queryFn: () => api.get('/mes/ordenes').then(r => r.data),
  })
  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data),
  })
  const { data: operarios = [] } = useQuery<Operario[]>({
    queryKey: ['mes-operarios'], queryFn: () => api.get('/mes/operarios').then(r => r.data),
  })
  const { data: equipos = [] } = useQuery<Equipo[]>({
    queryKey: ['mes-equipos'], queryFn: () => api.get('/mes/equipos').then(r => r.data),
  })
  // Paradas de todas las ejecuciones (para badges y resumen)
  const { data: paradas = [] } = useQuery<Parada[]>({
    queryKey: ['mes-paradas'], queryFn: () => api.get('/mes/paradas').then(r => r.data),
  })

  const orden = (id?: number) => ordenes.find(o => o.id === id)
  const producto = (id?: number) => productos.find(p => p.id === id)
  const operario = (id?: number | null) => operarios.find(o => o.id === id)
  const equipo = (id?: number | null) => equipos.find(e => e.id === id)
  const paradasDeEjec = (ejecId: number) => paradas.filter(p => p.ejecucion_id === ejecId)
  const paradasAbiertasDe = (ejecId: number) => paradasDeEjec(ejecId).filter(p => !p.fecha_fin)

  // ─── Derivados (mini-resumen) ───────────────────────────────────────────────
  const resumen = useMemo(() => ({
    EN_PROGRESO: ejecuciones.filter(e => e.estado === 'EN_PROGRESO').length,
    PAUSADA: ejecuciones.filter(e => e.estado === 'PAUSADA').length,
    COMPLETADA: ejecuciones.filter(e => e.estado === 'COMPLETADA').length,
    PARADAS_ABIERTAS: paradas.filter(p => !p.fecha_fin).length,
  }), [ejecuciones, paradas])

  // Órdenes elegibles para iniciar ejecución (regla del backend)
  const ordenesElegibles = useMemo(
    () => ordenes.filter(o => o.estado === 'LIBERADA' || o.estado === 'EN_EJECUCION'),
    [ordenes],
  )

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['mes-ejecuciones'] })
    qc.invalidateQueries({ queryKey: ['mes-ordenes'] })
    qc.invalidateQueries({ queryKey: ['mes-paradas'] })
  }

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutIniciar = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/ejecuciones', body),
    onSuccess: () => {
      toast.success('Ejecución iniciada — registro de producción abierto')
      invalidar()
      setInicioOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo iniciar la ejecución'),
  })

  const mutParada = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/paradas', body),
    onSuccess: () => {
      toast.success('Parada registrada')
      invalidar()
      setParadaDe(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo registrar la parada'),
  })

  const mutCerrarParada = useMutation({
    mutationFn: (id: number) => api.put(`/mes/paradas/${id}/cerrar`),
    onSuccess: () => {
      toast.success('Parada cerrada — duración calculada')
      invalidar()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo cerrar la parada'),
  })

  const mutCerrarEjec = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.put(`/mes/ejecuciones/${id}/cerrar`, body),
    onSuccess: () => {
      toast.success('Ejecución cerrada — cantidades acumuladas en la orden')
      invalidar()
      setCierreDe(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo cerrar la ejecución'),
  })

  // ─── Apertura de diálogos ───────────────────────────────────────────────────
  const abrirInicio = () => { setFormInicio({ ...EMPTY_INICIO }); setTriedInicio(false); setInicioOpen(true) }
  const abrirParada = (e: Ejecucion) => { setFormParada({ ...EMPTY_PARADA }); setTriedParada(false); setParadaDe(e) }
  const abrirCierre = (e: Ejecucion) => { setFormCierre({ ...EMPTY_CIERRE }); setTriedCierre(false); setCierreDe(e) }

  // ─── Validación + envío ─────────────────────────────────────────────────────
  const invalidaOrden = triedInicio && !formInicio.orden_id
  const iniciar = () => {
    setTriedInicio(true)
    if (!formInicio.orden_id) return
    mutIniciar.mutate({
      orden_id: Number(formInicio.orden_id),
      operario_id: formInicio.operario_id ? Number(formInicio.operario_id) : undefined,
      equipo_id: formInicio.equipo_id ? Number(formInicio.equipo_id) : undefined,
      turno: formInicio.turno,
    })
  }

  const invalidaCausa = triedParada && !formParada.causa.trim()
  const registrarParada = () => {
    setTriedParada(true)
    if (!paradaDe || !formParada.causa.trim()) return
    mutParada.mutate({
      ejecucion_id: paradaDe.id,
      tipo: formParada.tipo,
      causa: formParada.causa.trim(),
      descripcion: formParada.descripcion.trim() || undefined,
    })
  }

  const invalidaProducida = triedCierre && (formCierre.cantidad_producida === '' || Number(formCierre.cantidad_producida) < 0)
  const cerrarEjecucion = () => {
    setTriedCierre(true)
    if (!cierreDe || formCierre.cantidad_producida === '' || Number(formCierre.cantidad_producida) < 0) return
    mutCerrarEjec.mutate({
      id: cierreDe.id,
      body: {
        cantidad_producida: Number(formCierre.cantidad_producida),
        cantidad_scrap: formCierre.cantidad_scrap === '' ? 0 : Number(formCierre.cantidad_scrap),
        observaciones: formCierre.observaciones.trim() || undefined,
      },
    })
  }

  const RESUMEN_CARDS: { key: keyof typeof resumen; label: string; color: string }[] = [
    { key: 'EN_PROGRESO', label: 'En progreso', color: '#16A34A' },
    { key: 'PAUSADA', label: 'Pausadas', color: '#D97706' },
    { key: 'COMPLETADA', label: 'Completadas', color: '#475569' },
    { key: 'PARADAS_ABIERTAS', label: 'Paradas abiertas', color: '#DC2626' },
  ]

  const paradasVisibles = verParadasDe ? paradasDeEjec(verParadasDe.id) : []

  return (
    <Layout title="MES · Ejecución de Producción">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <PrecisionManufacturing sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Ejecución de Producción</Typography>
              <Typography fontSize={12} color="text.secondary">
                Piso de planta: ejecuciones por turno, paradas y cierre con acumulación en la orden · registros trazables ISO 9001 §8.5
              </Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirInicio}
            sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Iniciar ejecución
          </Button>
        </Stack>

        {/* Mini-resumen */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {RESUMEN_CARDS.map(c => (
            <Grid key={c.key} size={{ xs: 6, sm: 3 }}>
              <Paper elevation={0} className="hover-lift"
                sx={{ p: 1.5, borderRadius: '12px', textAlign: 'center', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
                <Typography fontSize={24} fontWeight={800} color={c.color} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {resumen[c.key]}
                </Typography>
                <Typography fontSize={10.5} fontWeight={700} color="text.secondary" letterSpacing="0.04em" textTransform="uppercase">
                  {c.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabla principal de ejecuciones */}
        <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['ID', 'Orden', 'Turno', 'Operario', 'Equipo', 'Estado', 'Producido', 'Scrap', 'Acciones'].map(h =>
                  <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {ejecuciones.map(e => {
                const st = ESTADO_EJEC_STYLE[e.estado] ?? ESTADO_EJEC_STYLE.PENDIENTE
                const o = orden(e.orden_id)
                const p = producto(o?.producto_id)
                const abiertas = paradasAbiertasDe(e.id).length
                return (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>#{e.id}</TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={600}>{o?.numero ?? `Orden #${e.orden_id}`}</Typography>
                      <Typography fontSize={11} color="text.secondary">{p ? `${p.codigo} — ${p.nombre}` : '—'}</Typography>
                    </TableCell>
                    <TableCell>{TURNO_LABEL[e.turno] ?? e.turno}</TableCell>
                    <TableCell>{operario(e.operario_id)?.nombre ?? '—'}</TableCell>
                    <TableCell>{equipo(e.equipo_id)?.nombre ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={e.estado.replace(/_/g, ' ')} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{e.cantidad_producida.toLocaleString('es-CO')}</TableCell>
                    <TableCell sx={{ color: e.cantidad_scrap > 0 ? '#DC2626' : 'inherit', fontWeight: e.cantidad_scrap > 0 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                      {e.cantidad_scrap.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.25}>
                        {e.estado === 'EN_PROGRESO' ? (
                          <>
                            <Tooltip title="Registrar parada">
                              <IconButton size="small" onClick={() => abrirParada(e)} sx={{ color: '#D97706' }}>
                                <ReportProblem sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={abiertas > 0 ? `Ver paradas (${abiertas} abiertas)` : 'Ver paradas'}>
                              <IconButton size="small" onClick={() => setVerParadasDe(e)} sx={{ color: MES_COLOR }}>
                                <Badge badgeContent={abiertas} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 14, height: 14 } }}>
                                  <History sx={{ fontSize: 17 }} />
                                </Badge>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cerrar ejecución">
                              <IconButton size="small" onClick={() => abrirCierre(e)} sx={{ color: '#475569' }}>
                                <Stop sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : paradasDeEjec(e.id).length > 0 && (
                          <Tooltip title="Ver paradas">
                            <IconButton size="small" onClick={() => setVerParadasDe(e)} sx={{ color: MES_COLOR }}>
                              <History sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {ejecuciones.length === 0 && (
                <TableRow><TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" py={3}>
                    {isLoading ? 'Cargando…' : 'Sin ejecuciones registradas. Inicie la primera con "Iniciar ejecución".'}
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Diálogo iniciar ejecución ── */}
        <Dialog open={inicioOpen} onClose={() => setInicioOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Iniciar ejecución de producción</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Orden de producción *" size="small" fullWidth value={formInicio.orden_id}
                  onChange={ev => setFormInicio(f => ({ ...f, orden_id: ev.target.value }))}
                  error={invalidaOrden}
                  helperText={invalidaOrden ? 'Seleccione la orden a ejecutar' : 'Solo órdenes LIBERADAS o EN EJECUCIÓN'}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {ordenesElegibles.map(o => {
                    const p = producto(o.producto_id)
                    return (
                      <MenuItem key={o.id} value={String(o.id)}>
                        {o.numero} — {p ? p.nombre : `Producto #${o.producto_id}`} · {o.estado.replace(/_/g, ' ')}
                      </MenuItem>
                    )
                  })}
                  {ordenesElegibles.length === 0 && (
                    <MenuItem value="__sin" disabled>No hay órdenes liberadas ni en ejecución</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Operario" size="small" fullWidth value={formInicio.operario_id}
                  onChange={ev => setFormInicio(f => ({ ...f, operario_id: ev.target.value }))}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {operarios.map(op => <MenuItem key={op.id} value={String(op.id)}>{op.codigo ? `${op.codigo} — ` : ''}{op.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Equipo" size="small" fullWidth value={formInicio.equipo_id}
                  onChange={ev => setFormInicio(f => ({ ...f, equipo_id: ev.target.value }))}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {equipos.map(eq => <MenuItem key={eq.id} value={String(eq.id)}>{eq.codigo ? `${eq.codigo} — ` : ''}{eq.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Turno" size="small" fullWidth value={formInicio.turno}
                  onChange={ev => setFormInicio(f => ({ ...f, turno: ev.target.value }))}>
                  {TURNOS.map(t => <MenuItem key={t} value={t}>{TURNO_LABEL[t]}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  Iniciar la primera ejecución pone la orden <b>EN EJECUCIÓN</b> automáticamente.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setInicioOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutIniciar.isPending} onClick={iniciar}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Iniciar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo registrar parada ── */}
        <Dialog open={!!paradaDe} onClose={() => setParadaDe(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            Registrar parada — ejecución #{paradaDe?.id} · {orden(paradaDe?.orden_id)?.numero ?? ''}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Tipo de parada *" size="small" fullWidth value={formParada.tipo}
                  onChange={ev => setFormParada(f => ({ ...f, tipo: ev.target.value }))}>
                  {TIPOS_PARADA.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Causa *" size="small" fullWidth value={formParada.causa}
                  onChange={ev => setFormParada(f => ({ ...f, causa: ev.target.value }))}
                  error={invalidaCausa} helperText={invalidaCausa ? 'Indique la causa de la parada (requerida para trazabilidad)' : ''} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción" size="small" fullWidth multiline minRows={3} value={formParada.descripcion}
                  onChange={ev => setFormParada(f => ({ ...f, descripcion: ev.target.value }))}
                  helperText="Detalle opcional: síntomas, acciones tomadas, responsables" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  La parada queda <b>abierta</b> desde este momento. Ciérrela desde "Ver paradas" para calcular la duración.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setParadaDe(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutParada.isPending} onClick={registrarParada}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Registrar parada</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo paradas de la ejecución ── */}
        <Dialog open={!!verParadasDe} onClose={() => setVerParadasDe(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Paradas — ejecución #{verParadasDe?.id} · {orden(verParadasDe?.orden_id)?.numero ?? ''}</span>
            <IconButton size="small" onClick={() => setVerParadasDe(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Table size="small">
              <TableHead>
                <TableRow>{['Tipo', 'Causa', 'Inicio', 'Fin', 'Duración (min)', ''].map((h, i) => <TableCell key={i}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {paradasVisibles.map(p => {
                  const color = TIPO_PARADA_COLOR[p.tipo] ?? '#64748B'
                  const abierta = !p.fecha_fin
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Chip size="small" label={p.tipo.replace(/_/g, ' ')}
                          sx={{ fontWeight: 700, fontSize: 10, color, bgcolor: alpha(color, 0.12) }} />
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={13}>{p.causa}</Typography>
                        {p.descripcion && <Typography fontSize={11} color="text.secondary">{p.descripcion}</Typography>}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fechaCorta(p.fecha_inicio)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {abierta
                          ? <Chip size="small" label="ABIERTA" sx={{ fontWeight: 700, fontSize: 10, color: '#DC2626', bgcolor: '#FEF2F2' }} />
                          : fechaCorta(p.fecha_fin)}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{p.duracion_min ?? '—'}</TableCell>
                      <TableCell align="right">
                        {abierta && (
                          <Button size="small" variant="outlined" startIcon={<CheckCircle sx={{ fontSize: 15 }} />}
                            disabled={mutCerrarParada.isPending}
                            onClick={() => mutCerrarParada.mutate(p.id)}
                            sx={{ textTransform: 'none', color: MES_DARK, borderColor: MES_COLOR }}>
                            Cerrar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {paradasVisibles.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">
                    <Typography fontSize={12} color="text.secondary" py={2}>Sin paradas registradas en esta ejecución</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        {/* ── Diálogo cerrar ejecución ── */}
        <Dialog open={!!cierreDe} onClose={() => setCierreDe(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            Cerrar ejecución #{cierreDe?.id} · {orden(cierreDe?.orden_id)?.numero ?? ''}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Cantidad producida *" type="number" size="small" fullWidth
                  value={formCierre.cantidad_producida}
                  onChange={ev => setFormCierre(f => ({ ...f, cantidad_producida: ev.target.value }))}
                  error={invalidaProducida}
                  helperText={invalidaProducida ? 'Indique la cantidad producida (0 o más)' : ''}
                  inputProps={{ min: 0 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Cantidad scrap" type="number" size="small" fullWidth
                  value={formCierre.cantidad_scrap}
                  onChange={ev => setFormCierre(f => ({ ...f, cantidad_scrap: ev.target.value }))}
                  inputProps={{ min: 0 }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Observaciones" size="small" fullWidth multiline minRows={3}
                  value={formCierre.observaciones}
                  onChange={ev => setFormCierre(f => ({ ...f, observaciones: ev.target.value }))}
                  helperText="Evidencia del turno: novedades, incidencias, entregas" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning" sx={{ fontSize: 12.5 }}>
                  Al cerrar, las cantidades se <b>acumulan en la orden</b> y las paradas abiertas se cierran automáticamente. Esta acción es definitiva.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCierreDe(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCerrarEjec.isPending} onClick={cerrarEjecucion}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Cerrar ejecución</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
