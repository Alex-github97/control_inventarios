import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Stack, Tooltip, Tabs, Tab, InputAdornment, Divider, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, VerifiedUser as VerifiedUserIcon, Gavel as GavelIcon,
  BugReport as BugReportIcon, LockOpen as LockOpenIcon, Block as BlockIcon,
  Cancel as CancelIcon, Close as CloseIcon, Search as SearchIcon,
  Inventory2 as LoteIcon, TroubleshootOutlined as CausaIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const TIPOS_INSPECCION = ['INICIO_PRODUCCION', 'EN_PROCESO', 'FINAL_LINEA', 'LIBERACION'] as const
const RESULTADOS_DICTAMEN = ['APROBADO', 'RECHAZADO', 'CONDICIONAL'] as const

const RESULTADO_STYLE: Record<string, { color: string; bg: string }> = {
  APROBADO:    { color: '#16A34A', bg: '#F0FDF4' },
  RECHAZADO:   { color: '#DC2626', bg: '#FEF2F2' },
  CONDICIONAL: { color: '#D97706', bg: '#FFFBEB' },
  PENDIENTE:   { color: '#64748B', bg: '#F1F5F9' },
}
const ESTADO_LOTE_STYLE: Record<string, { color: string; bg: string }> = {
  ACTIVO:    { color: '#2563EB', bg: '#EFF6FF' },
  BLOQUEADO: { color: '#D97706', bg: '#FFFBEB' },
  LIBERADO:  { color: '#16A34A', bg: '#F0FDF4' },
  CONSUMIDO: { color: '#475569', bg: '#F8FAFC' },
  VENCIDO:   { color: '#7C3AED', bg: '#F5F3FF' },
  RECHAZADO: { color: '#DC2626', bg: '#FEF2F2' },
}

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface Inspeccion {
  id: number; orden_id: number; tipo: string; resultado: string; operario_id: number
  muestra_tam?: number | null; muestra_defectos: number
}
interface Defecto {
  id: number; inspeccion_id: number; codigo_defecto: string; descripcion: string
  cantidad: number; ubicacion?: string | null; causa_raiz?: string | null
}
interface Lote {
  id: number; numero_lote: string; producto_id: number; estado: string
  cantidad: number; unidad_medida: string
}
interface Orden { id: number; numero: string; producto_id: number; estado: string }
interface Producto { id: number; codigo: string; nombre: string; unidad_medida: string }
interface Operario { id: number; nombre: string; codigo?: string }

const EMPTY_INSP = { orden_id: '', tipo: 'EN_PROCESO', operario_id: '', lote_id: '', muestra_tam: '' }
const EMPTY_DICTAMEN = { resultado: 'APROBADO', muestra_defectos: '', observaciones: '' }
const EMPTY_DEFECTO = { codigo_defecto: '', descripcion: '', cantidad: '1', ubicacion: '', causa_raiz: '' }
const EMPTY_LOTE = { numero_lote: '', producto_id: '', orden_id: '', cantidad: '', unidad_medida: 'UN', fecha_fabricacion: '', fecha_vencimiento: '' }
const EMPTY_LIBERAR = { responsable_liberacion: '', observaciones: '' }

export default function MESCalidad() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // Filtros
  const [buscaInsp, setBuscaInsp] = useState('')
  const [filtroResultado, setFiltroResultado] = useState('')
  const [buscaLote, setBuscaLote] = useState('')
  const [filtroEstadoLote, setFiltroEstadoLote] = useState('')

  // Diálogos · inspecciones
  const [nuevaInspOpen, setNuevaInspOpen] = useState(false)
  const [formInsp, setFormInsp] = useState({ ...EMPTY_INSP })
  const [triedInsp, setTriedInsp] = useState(false)
  const [dictaminar, setDictaminar] = useState<Inspeccion | null>(null)
  const [formDictamen, setFormDictamen] = useState({ ...EMPTY_DICTAMEN })
  const [defectosDe, setDefectosDe] = useState<Inspeccion | null>(null)
  const [formDefecto, setFormDefecto] = useState({ ...EMPTY_DEFECTO })
  const [triedDefecto, setTriedDefecto] = useState(false)

  // Diálogos · lotes
  const [nuevoLoteOpen, setNuevoLoteOpen] = useState(false)
  const [formLote, setFormLote] = useState({ ...EMPTY_LOTE })
  const [triedLote, setTriedLote] = useState(false)
  const [liberar, setLiberar] = useState<Lote | null>(null)
  const [formLiberar, setFormLiberar] = useState({ ...EMPTY_LIBERAR })
  const [triedLiberar, setTriedLiberar] = useState(false)
  const [confirmarLote, setConfirmarLote] = useState<null | { lote: Lote; estado: string; label: string }>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: inspecciones = [], isLoading: cargandoInsp } = useQuery<Inspeccion[]>({
    queryKey: ['mes-inspecciones'], queryFn: () => api.get('/mes/inspecciones').then(r => r.data),
  })
  const { data: lotes = [], isLoading: cargandoLotes } = useQuery<Lote[]>({
    queryKey: ['mes-lotes'], queryFn: () => api.get('/mes/lotes').then(r => r.data),
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
  const { data: defectos = [], isLoading: cargandoDefectos } = useQuery<Defecto[]>({
    queryKey: ['mes-insp-defectos', defectosDe?.id],
    queryFn: () => api.get(`/mes/inspecciones/${defectosDe!.id}/defectos`).then(r => r.data),
    enabled: !!defectosDe,
  })

  const orden = (id: number) => ordenes.find(o => o.id === id)
  const producto = (id: number) => productos.find(p => p.id === id)
  const operario = (id: number) => operarios.find(op => op.id === id)

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutCrearInsp = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/inspecciones', body),
    onSuccess: (r: any) => {
      toast.success(`Inspección #${r.data.id} creada en estado PENDIENTE`)
      qc.invalidateQueries({ queryKey: ['mes-inspecciones'] })
      setNuevaInspOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear la inspección'),
  })

  const mutDictaminar = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.put(`/mes/inspecciones/${id}/resultado`, body),
    onSuccess: (r: any) => {
      toast.success(`Inspección #${r.data.id} dictaminada: ${r.data.resultado}`)
      qc.invalidateQueries({ queryKey: ['mes-inspecciones'] })
      qc.invalidateQueries({ queryKey: ['mes-lotes'] }) // un RECHAZO puede bloquear el lote
      setDictaminar(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No fue posible registrar el dictamen'),
  })

  const mutDefecto = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.post(`/mes/inspecciones/${id}/defectos`, body),
    onSuccess: () => {
      toast.success('Defecto registrado')
      qc.invalidateQueries({ queryKey: ['mes-insp-defectos'] })
      qc.invalidateQueries({ queryKey: ['mes-inspecciones'] }) // actualiza muestra_defectos
      setFormDefecto({ ...EMPTY_DEFECTO }); setTriedDefecto(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar el defecto'),
  })

  const mutCrearLote = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/lotes', body),
    onSuccess: (r: any) => {
      toast.success(`Lote ${r.data.numero_lote} creado`)
      qc.invalidateQueries({ queryKey: ['mes-lotes'] })
      setNuevoLoteOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear el lote'),
  })

  const mutEstadoLote = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.put(`/mes/lotes/${id}/estado`, body),
    onSuccess: (r: any) => {
      toast.success(`Lote ${r.data.numero_lote} → ${r.data.estado}`)
      qc.invalidateQueries({ queryKey: ['mes-lotes'] })
      qc.invalidateQueries({ queryKey: ['mes-inspecciones'] })
      setLiberar(null); setConfirmarLote(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No fue posible cambiar la disposición del lote'),
  })

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const resumen = useMemo(() => ({
    pendientes: inspecciones.filter(i => i.resultado === 'PENDIENTE').length,
    aprobadas: inspecciones.filter(i => i.resultado === 'APROBADO').length,
    rechazadas: inspecciones.filter(i => i.resultado === 'RECHAZADO').length,
    lotesBloqueados: lotes.filter(l => l.estado === 'BLOQUEADO').length,
  }), [inspecciones, lotes])

  const inspFiltradas = useMemo(() => inspecciones.filter(i => {
    if (filtroResultado && i.resultado !== filtroResultado) return false
    if (buscaInsp.trim()) {
      const q = buscaInsp.toLowerCase()
      const o = orden(i.orden_id)
      return String(i.id).includes(q) || (o?.numero ?? '').toLowerCase().includes(q)
        || i.tipo.toLowerCase().includes(q) || (operario(i.operario_id)?.nombre ?? '').toLowerCase().includes(q)
    }
    return true
  }), [inspecciones, filtroResultado, buscaInsp, ordenes, operarios])

  const lotesFiltrados = useMemo(() => lotes.filter(l => {
    if (filtroEstadoLote && l.estado !== filtroEstadoLote) return false
    if (buscaLote.trim()) {
      const q = buscaLote.toLowerCase()
      const p = producto(l.producto_id)
      return l.numero_lote.toLowerCase().includes(q) || (p?.nombre ?? '').toLowerCase().includes(q) || (p?.codigo ?? '').toLowerCase().includes(q)
    }
    return true
  }), [lotes, filtroEstadoLote, buscaLote, productos])

  // Acciones válidas de disposición según estado del lote
  const puedeLiberar = (l: Lote) => l.estado === 'ACTIVO' || l.estado === 'BLOQUEADO'
  const puedeBloquear = (l: Lote) => l.estado === 'ACTIVO' || l.estado === 'LIBERADO' || l.estado === 'VENCIDO'
  const puedeRechazar = (l: Lote) => l.estado === 'ACTIVO' || l.estado === 'BLOQUEADO' || l.estado === 'VENCIDO'

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const crearInspeccion = () => {
    setTriedInsp(true)
    if (!formInsp.orden_id || !formInsp.tipo || !formInsp.operario_id) return
    mutCrearInsp.mutate({
      orden_id: Number(formInsp.orden_id),
      tipo: formInsp.tipo,
      operario_id: Number(formInsp.operario_id),
      lote_id: formInsp.lote_id ? Number(formInsp.lote_id) : undefined,
      muestra_tam: formInsp.muestra_tam ? Number(formInsp.muestra_tam) : undefined,
    })
  }

  const registrarDictamen = () => {
    if (!dictaminar) return
    mutDictaminar.mutate({
      id: dictaminar.id,
      body: {
        resultado: formDictamen.resultado,
        muestra_defectos: formDictamen.muestra_defectos !== '' ? Number(formDictamen.muestra_defectos) : undefined,
        observaciones: formDictamen.observaciones || undefined,
      },
    })
  }

  const agregarDefecto = () => {
    setTriedDefecto(true)
    if (!defectosDe || !formDefecto.codigo_defecto.trim() || !formDefecto.descripcion.trim()) return
    mutDefecto.mutate({
      id: defectosDe.id,
      body: {
        codigo_defecto: formDefecto.codigo_defecto.trim(),
        descripcion: formDefecto.descripcion.trim(),
        cantidad: formDefecto.cantidad ? Number(formDefecto.cantidad) : 1,
        ubicacion: formDefecto.ubicacion || undefined,
        causa_raiz: formDefecto.causa_raiz || undefined,
      },
    })
  }

  const crearLote = () => {
    setTriedLote(true)
    if (!formLote.numero_lote.trim() || !formLote.producto_id || !formLote.cantidad || Number(formLote.cantidad) <= 0) return
    mutCrearLote.mutate({
      numero_lote: formLote.numero_lote.trim(),
      producto_id: Number(formLote.producto_id),
      orden_id: formLote.orden_id ? Number(formLote.orden_id) : undefined,
      cantidad: Number(formLote.cantidad),
      unidad_medida: producto(Number(formLote.producto_id))?.unidad_medida ?? formLote.unidad_medida,
      fecha_fabricacion: formLote.fecha_fabricacion || undefined,
      fecha_vencimiento: formLote.fecha_vencimiento || undefined,
    })
  }

  const liberarLote = () => {
    setTriedLiberar(true)
    if (!liberar || !formLiberar.responsable_liberacion.trim()) return
    mutEstadoLote.mutate({
      id: liberar.id,
      body: {
        estado: 'LIBERADO',
        responsable_liberacion: formLiberar.responsable_liberacion.trim(),
        observaciones: formLiberar.observaciones || undefined,
      },
    })
  }

  const invInspOrden = triedInsp && !formInsp.orden_id
  const invInspOperario = triedInsp && !formInsp.operario_id
  const invDefCodigo = triedDefecto && !formDefecto.codigo_defecto.trim()
  const invDefDesc = triedDefecto && !formDefecto.descripcion.trim()
  const invLoteNumero = triedLote && !formLote.numero_lote.trim()
  const invLoteProducto = triedLote && !formLote.producto_id
  const invLoteCantidad = triedLote && (!formLote.cantidad || Number(formLote.cantidad) <= 0)
  const invLiberarResp = triedLiberar && !formLiberar.responsable_liberacion.trim()

  const tarjetas = [
    { label: 'Pendientes de dictamen', valor: resumen.pendientes, color: '#64748B', bg: '#F1F5F9' },
    { label: 'Aprobadas', valor: resumen.aprobadas, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'Rechazadas', valor: resumen.rechazadas, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Lotes bloqueados', valor: resumen.lotesBloqueados, color: '#D97706', bg: '#FFFBEB' },
  ]

  return (
    <Layout title="MES · Calidad">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <VerifiedUserIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>Calidad</Typography>
              <Typography fontSize={12} color="text.secondary">
                Inspecciones, dictámenes, defectos y liberación de lotes · ISO 9001 §8.6
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            {tab === 0 ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormInsp({ ...EMPTY_INSP }); setTriedInsp(false); setNuevaInspOpen(true) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                Nueva inspección
              </Button>
            ) : (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormLote({ ...EMPTY_LOTE }); setTriedLote(false); setNuevoLoteOpen(true) }}
                sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                Nuevo lote
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Mini-resumen */}
        <Grid container spacing={1.5} mb={2.5} className="anim-stagger">
          {tarjetas.map(t => (
            <Grid key={t.label} size={{ xs: 6, md: 3 }}>
              <Paper elevation={0} className="hover-lift"
                sx={{ p: 1.5, borderRadius: '12px', textAlign: 'center', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
                <Typography fontSize={24} fontWeight={800} color={t.color} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t.valor}
                </Typography>
                <Typography fontSize={10.5} fontWeight={700} color="text.secondary" letterSpacing="0.04em" textTransform="uppercase">
                  {t.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper elevation={0} sx={{ mb: 2, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)}
            sx={{ px: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13.5 },
              '& .Mui-selected': { color: `${MES_DARK} !important` }, '& .MuiTabs-indicator': { bgcolor: MES_COLOR } }}>
            <Tab icon={<GavelIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Inspecciones (${inspecciones.length})`} />
            <Tab icon={<LoteIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Lotes (${lotes.length})`} />
          </Tabs>
        </Paper>

        {/* ═══ Tab 0 · Inspecciones ═══ */}
        {tab === 0 && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <TextField size="small" placeholder="Buscar por ID, orden, tipo o inspector…" value={buscaInsp} onChange={e => setBuscaInsp(e.target.value)}
                sx={{ minWidth: 280, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
              <TextField select size="small" label="Resultado" value={filtroResultado} onChange={e => setFiltroResultado(e.target.value)} sx={{ minWidth: 190 }}>
                <MenuItem value="">Todos</MenuItem>
                {['PENDIENTE', ...RESULTADOS_DICTAMEN].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Stack>

            <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['ID', 'Orden', 'Tipo', 'Inspector', 'Muestra', 'Defectos', 'Resultado', 'Acciones'].map(h =>
                      <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inspFiltradas.map(i => {
                    const st = RESULTADO_STYLE[i.resultado] ?? RESULTADO_STYLE.PENDIENTE
                    const op = operario(i.operario_id)
                    return (
                      <TableRow key={i.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>#{i.id}</TableCell>
                        <TableCell>{orden(i.orden_id)?.numero ?? `Orden #${i.orden_id}`}</TableCell>
                        <TableCell>
                          <Chip size="small" label={i.tipo.replace(/_/g, ' ')}
                            sx={{ fontWeight: 600, fontSize: 10, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.1) }} />
                        </TableCell>
                        <TableCell>{op ? `${op.nombre}${op.codigo ? ` (${op.codigo})` : ''}` : `#${i.operario_id}`}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{i.muestra_tam ?? '—'}</TableCell>
                        <TableCell sx={{ color: i.muestra_defectos > 0 ? '#DC2626' : 'inherit', fontWeight: i.muestra_defectos > 0 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                          {i.muestra_defectos}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={i.resultado} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.25}>
                            {i.resultado === 'PENDIENTE' && (
                              <Tooltip title="Dictaminar (definitivo)">
                                <IconButton size="small" sx={{ color: MES_COLOR }}
                                  onClick={() => { setFormDictamen({ ...EMPTY_DICTAMEN, muestra_defectos: String(i.muestra_defectos) }); setDictaminar(i) }}>
                                  <GavelIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Defectos y causa raíz">
                              <IconButton size="small" sx={{ color: '#D97706' }}
                                onClick={() => { setFormDefecto({ ...EMPTY_DEFECTO }); setTriedDefecto(false); setDefectosDe(i) }}>
                                <BugReportIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {inspFiltradas.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" py={3}>
                        {cargandoInsp ? 'Cargando…' : 'Sin inspecciones. Registre la primera con "Nueva inspección".'}
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {/* ═══ Tab 1 · Lotes ═══ */}
        {tab === 1 && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <TextField size="small" placeholder="Buscar por número de lote, producto o SKU…" value={buscaLote} onChange={e => setBuscaLote(e.target.value)}
                sx={{ minWidth: 280, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
              <TextField select size="small" label="Estado" value={filtroEstadoLote} onChange={e => setFiltroEstadoLote(e.target.value)} sx={{ minWidth: 190 }}>
                <MenuItem value="">Todos</MenuItem>
                {Object.keys(ESTADO_LOTE_STYLE).map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </TextField>
            </Stack>

            <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Número de lote', 'Producto', 'Cantidad', 'Estado', 'Acciones'].map(h =>
                      <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lotesFiltrados.map(l => {
                    const st = ESTADO_LOTE_STYLE[l.estado] ?? ESTADO_LOTE_STYLE.ACTIVO
                    const p = producto(l.producto_id)
                    return (
                      <TableRow key={l.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: MES_DARK }}>{l.numero_lote}</TableCell>
                        <TableCell>
                          <Typography fontSize={13} fontWeight={600}>{p?.nombre ?? `#${l.producto_id}`}</Typography>
                          <Typography fontSize={11} color="text.secondary">{p?.codigo}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {l.cantidad.toLocaleString('es-CO')} {l.unidad_medida}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={l.estado} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.25}>
                            {puedeLiberar(l) && (
                              <Tooltip title="Liberar (requiere responsable — §8.6)">
                                <IconButton size="small" sx={{ color: '#16A34A' }}
                                  onClick={() => { setFormLiberar({ ...EMPTY_LIBERAR }); setTriedLiberar(false); setLiberar(l) }}>
                                  <LockOpenIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {puedeBloquear(l) && (
                              <Tooltip title="Bloquear">
                                <IconButton size="small" sx={{ color: '#D97706' }}
                                  onClick={() => setConfirmarLote({ lote: l, estado: 'BLOQUEADO', label: 'Bloquear' })}>
                                  <BlockIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {puedeRechazar(l) && (
                              <Tooltip title="Rechazar (salida no conforme — §8.7)">
                                <IconButton size="small" sx={{ color: '#DC2626' }}
                                  onClick={() => setConfirmarLote({ lote: l, estado: 'RECHAZADO', label: 'Rechazar' })}>
                                  <CancelIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {lotesFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={3}>
                        {cargandoLotes ? 'Cargando…' : 'Sin lotes. Cree el primero con "Nuevo lote".'}
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        {/* ── Diálogo nueva inspección ── */}
        <Dialog open={nuevaInspOpen} onClose={() => setNuevaInspOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva inspección de calidad</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Orden de producción *" size="small" fullWidth value={formInsp.orden_id}
                  onChange={e => setFormInsp(f => ({ ...f, orden_id: e.target.value }))}
                  error={invInspOrden} helperText={invInspOrden ? 'Seleccione la orden a inspeccionar' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {ordenes.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.numero} · {o.estado.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Tipo de inspección *" size="small" fullWidth value={formInsp.tipo}
                  onChange={e => setFormInsp(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_INSPECCION.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Inspector *" size="small" fullWidth value={formInsp.operario_id}
                  onChange={e => setFormInsp(f => ({ ...f, operario_id: e.target.value }))}
                  error={invInspOperario} helperText={invInspOperario ? 'Seleccione el inspector responsable' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {operarios.map(op => <MenuItem key={op.id} value={String(op.id)}>{op.nombre}{op.codigo ? ` (${op.codigo})` : ''}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Lote (opcional)" size="small" fullWidth value={formInsp.lote_id}
                  onChange={e => setFormInsp(f => ({ ...f, lote_id: e.target.value }))}
                  helperText="Un rechazo con lote asociado lo bloquea automáticamente">
                  <MenuItem value="">Sin lote</MenuItem>
                  {lotes.map(l => <MenuItem key={l.id} value={String(l.id)}>{l.numero_lote} · {l.estado}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Tamaño de muestra" type="number" size="small" fullWidth value={formInsp.muestra_tam}
                  onChange={e => setFormInsp(f => ({ ...f, muestra_tam: e.target.value }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">unidades</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  La inspección se crea en estado <b>PENDIENTE</b>. El dictamen (aprobado / rechazado / condicional) se registra después y es <b>inmutable</b>.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNuevaInspOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCrearInsp.isPending} onClick={crearInspeccion}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Crear inspección</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo dictaminar ── */}
        <Dialog open={!!dictaminar} onClose={() => setDictaminar(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            Dictaminar inspección #{dictaminar?.id} · {orden(dictaminar?.orden_id ?? 0)?.numero ?? ''}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Resultado *" size="small" fullWidth value={formDictamen.resultado}
                  onChange={e => setFormDictamen(f => ({ ...f, resultado: e.target.value }))}>
                  {RESULTADOS_DICTAMEN.map(r => (
                    <MenuItem key={r} value={r}>
                      <Chip size="small" label={r} sx={{ fontWeight: 700, fontSize: 10, color: RESULTADO_STYLE[r].color, bgcolor: RESULTADO_STYLE[r].bg, mr: 1 }} />
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Defectos en la muestra" type="number" size="small" fullWidth value={formDictamen.muestra_defectos}
                  onChange={e => setFormDictamen(f => ({ ...f, muestra_defectos: e.target.value }))}
                  helperText={dictaminar?.muestra_tam ? `Muestra de ${dictaminar.muestra_tam} unidades` : ''} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Observaciones" size="small" fullWidth multiline minRows={3} value={formDictamen.observaciones}
                  onChange={e => setFormDictamen(f => ({ ...f, observaciones: e.target.value }))}
                  placeholder="Criterios aplicados, condiciones de la muestra, referencias normativas…" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning" sx={{ fontSize: 12.5 }}>
                  El dictamen es <b>definitivo e inmutable</b> — registro de calidad ISO. Un resultado <b>RECHAZADO</b> con lote asociado bloquea el lote automáticamente.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDictaminar(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutDictaminar.isPending} onClick={registrarDictamen}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Registrar dictamen</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo defectos ── */}
        <Dialog open={!!defectosDe} onClose={() => setDefectosDe(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Defectos · inspección #{defectosDe?.id}
              <Chip size="small" label={defectosDe?.resultado}
                sx={{ ml: 1.5, fontWeight: 700, fontSize: 10, color: RESULTADO_STYLE[defectosDe?.resultado ?? 'PENDIENTE']?.color, bgcolor: RESULTADO_STYLE[defectosDe?.resultado ?? 'PENDIENTE']?.bg }} />
            </span>
            <IconButton size="small" onClick={() => setDefectosDe(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  {['Código', 'Descripción', 'Cantidad', 'Ubicación', 'Causa raíz'].map(h => <TableCell key={h}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {defectos.map(d => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#DC2626' }}>{d.codigo_defecto}</TableCell>
                    <TableCell>{d.descripcion}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{d.cantidad}</TableCell>
                    <TableCell>{d.ubicacion ?? '—'}</TableCell>
                    <TableCell>
                      {d.causa_raiz
                        ? <Stack direction="row" alignItems="center" gap={0.5}>
                            <CausaIcon sx={{ fontSize: 15, color: MES_COLOR }} />
                            <Typography fontSize={12.5}>{d.causa_raiz}</Typography>
                          </Stack>
                        : <Typography fontSize={12} color="#D97706" fontStyle="italic">Sin analizar</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
                {defectos.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">
                    <Typography fontSize={12} color="text.secondary" py={1.5}>
                      {cargandoDefectos ? 'Cargando…' : 'Sin defectos registrados en esta inspección'}
                    </Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Divider sx={{ mb: 2 }} />
            <Typography fontWeight={700} fontSize={13.5} mb={1.5}>Registrar defecto</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Código *" size="small" fullWidth value={formDefecto.codigo_defecto}
                  onChange={e => setFormDefecto(f => ({ ...f, codigo_defecto: e.target.value }))}
                  placeholder="DEF-001" error={invDefCodigo} helperText={invDefCodigo ? 'Requerido' : ''} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Descripción *" size="small" fullWidth value={formDefecto.descripcion}
                  onChange={e => setFormDefecto(f => ({ ...f, descripcion: e.target.value }))}
                  error={invDefDesc} helperText={invDefDesc ? 'Requerida' : ''} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Cantidad" type="number" size="small" fullWidth value={formDefecto.cantidad}
                  onChange={e => setFormDefecto(f => ({ ...f, cantidad: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Ubicación" size="small" fullWidth value={formDefecto.ubicacion}
                  onChange={e => setFormDefecto(f => ({ ...f, ubicacion: e.target.value }))}
                  placeholder="Cara superior, borde, sello…" />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Causa raíz (mejora continua)" size="small" fullWidth value={formDefecto.causa_raiz}
                  onChange={e => setFormDefecto(f => ({ ...f, causa_raiz: e.target.value }))}
                  placeholder="Análisis 5 porqués, Ishikawa…"
                  sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
                    '& .MuiInputLabel-root': { color: MES_DARK, fontWeight: 600 } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><CausaIcon sx={{ fontSize: 17, color: MES_COLOR }} /></InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" icon={<CausaIcon />} sx={{ fontSize: 12.5 }}>
                  Documentar la <b>causa raíz</b> alimenta la mejora continua y las acciones correctivas (ISO 9001 §10.2). Cada defecto suma su cantidad a los defectos de la muestra.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDefectosDe(null)}>Cerrar</Button>
            <Button variant="contained" startIcon={<AddIcon />} disabled={mutDefecto.isPending} onClick={agregarDefecto}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Agregar defecto</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo nuevo lote ── */}
        <Dialog open={nuevoLoteOpen} onClose={() => setNuevoLoteOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo lote de producción</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Número de lote *" size="small" fullWidth value={formLote.numero_lote}
                  onChange={e => setFormLote(f => ({ ...f, numero_lote: e.target.value }))}
                  placeholder="LOTE-2026-001" error={invLoteNumero} helperText={invLoteNumero ? 'Indique el número de lote' : ''} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Producto *" size="small" fullWidth value={formLote.producto_id}
                  onChange={e => setFormLote(f => ({ ...f, producto_id: e.target.value }))}
                  error={invLoteProducto} helperText={invLoteProducto ? 'Seleccione el producto' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Orden (opcional)" size="small" fullWidth value={formLote.orden_id}
                  onChange={e => setFormLote(f => ({ ...f, orden_id: e.target.value }))}>
                  <MenuItem value="">Sin orden</MenuItem>
                  {ordenes.map(o => <MenuItem key={o.id} value={String(o.id)}>{o.numero}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Cantidad *" type="number" size="small" fullWidth value={formLote.cantidad}
                  onChange={e => setFormLote(f => ({ ...f, cantidad: e.target.value }))}
                  error={invLoteCantidad} helperText={invLoteCantidad ? 'Debe ser mayor que cero' : ''}
                  InputProps={{ endAdornment: <InputAdornment position="end">{producto(Number(formLote.producto_id))?.unidad_medida ?? 'UN'}</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Fecha de fabricación" type="datetime-local" size="small" fullWidth value={formLote.fecha_fabricacion}
                  onChange={e => setFormLote(f => ({ ...f, fecha_fabricacion: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Fecha de vencimiento" type="datetime-local" size="small" fullWidth value={formLote.fecha_vencimiento}
                  onChange={e => setFormLote(f => ({ ...f, fecha_vencimiento: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  El lote se crea en estado <b>ACTIVO</b>. Su liberación exige inspecciones aprobadas y responsable identificado — ISO 9001 §8.6.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNuevoLoteOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCrearLote.isPending} onClick={crearLote}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Crear lote</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo liberar lote ── */}
        <Dialog open={!!liberar} onClose={() => setLiberar(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Liberar lote {liberar?.numero_lote}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Responsable de la liberación *" size="small" fullWidth value={formLiberar.responsable_liberacion}
                  onChange={e => setFormLiberar(f => ({ ...f, responsable_liberacion: e.target.value }))}
                  placeholder="Nombre completo de quien autoriza"
                  error={invLiberarResp} helperText={invLiberarResp ? 'Obligatorio: identifique a la persona que autoriza la liberación' : ''} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Observaciones" size="small" fullWidth multiline minRows={2} value={formLiberar.observaciones}
                  onChange={e => setFormLiberar(f => ({ ...f, observaciones: e.target.value }))}
                  placeholder="Certificado de calidad, referencias de inspección…" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  La liberación requiere trazabilidad del responsable que autoriza — ISO 9001 §8.6. El sistema la rechazará si el lote tiene inspecciones <b>pendientes</b> o <b>rechazadas</b>.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setLiberar(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutEstadoLote.isPending} onClick={liberarLote}
              sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>Liberar lote</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo confirmación bloquear / rechazar ── */}
        <Dialog open={!!confirmarLote} onClose={() => setConfirmarLote(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>{confirmarLote?.label} lote</DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={14}>
              ¿Confirmar <b>{confirmarLote?.label.toLowerCase()}</b> el lote <b>{confirmarLote?.lote.numero_lote}</b>?
            </Typography>
            {confirmarLote?.estado === 'BLOQUEADO' && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12.5 }}>
                El lote quedará retenido y no podrá usarse hasta una nueva disposición (control de salidas no conformes — ISO 9001 §8.7).
              </Alert>
            )}
            {confirmarLote?.estado === 'RECHAZADO' && (
              <Alert severity="error" sx={{ mt: 1.5, fontSize: 12.5 }}>
                El rechazo es una disposición definitiva del lote y queda registrado como salida no conforme — ISO 9001 §8.7.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setConfirmarLote(null)}>Volver</Button>
            <Button variant="contained" disabled={mutEstadoLote.isPending}
              onClick={() => confirmarLote && mutEstadoLote.mutate({ id: confirmarLote.lote.id, body: { estado: confirmarLote.estado } })}
              sx={{ bgcolor: confirmarLote?.estado === 'RECHAZADO' ? '#DC2626' : '#D97706',
                '&:hover': { bgcolor: confirmarLote?.estado === 'RECHAZADO' ? '#B91C1C' : '#B45309' } }}>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
