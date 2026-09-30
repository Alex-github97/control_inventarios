/**
 * Garantías del CMMS.
 *
 * Antes eran 1.719 líneas sobre tres garantías, tres avisos de vencimiento y
 * cinco reclamaciones escritas en el código. Ahora todo sale de `/eam`.
 *
 * TRES COSAS QUE YA NO CALCULA ESTA PANTALLA
 *  - **Los días restantes y el estado.** Estaban escritos a mano («209 días»),
 *    y un número de días escrito a mano miente al día siguiente. Los da el
 *    servidor comparando la fecha de vencimiento con hoy.
 *  - **Los totales del encabezado.** Vienen de `/garantias/resumen`, no de
 *    sumar la tabla: la tabla se filtra y los totales no deben moverse con el
 *    filtro.
 *  - **Los catálogos.** Activos, proveedores y responsables eran tres listas
 *    de nombres inventados; ahora son los activos, los proveedores y los
 *    usuarios de la empresa.
 *
 * Y UN BOTÓN QUE SE FUE
 * «Generar Alerta» aparecía tres veces y no hacía nada: no hay quien reciba
 * esa alerta —las alertas del sistema no se crean a mano— y lo que de verdad
 * se hace ante una garantía por vencer es abrir el reclamo. Ese es el botón
 * que quedó en su lugar.
 */
import React, { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  Button,
  alpha,
  Divider,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
  Skeleton,
  Autocomplete,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Shield as GarantiaIcon,
  Warning as AlertaIcon,
  CheckCircle as VerificadoIcon,
  AccessTime as ProximoIcon,
  AttachMoney as DineroIcon,
  Gavel as ReclamoIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Business as ProveedorIcon,
  Inventory2 as ActivoIcon,
  Description as FileIcon,
  Download as DownloadIcon,
  FactCheck as CoberturaIcon,
  Edit as EditIcon,
  DeleteOutline as BorrarIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { exportarExcel } from '@/utils/exportar'
import { apiClient } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'
import { COLOR_MODULO } from '@/config/marca'
import {
  garantiasApi, reclamacionesApi, coberturaLista, pesos,
  ETIQUETA_RECLAMO, catalogosGarantia, adjuntosGarantiaApi, type CatalogosGarantia,
  type Garantia, type Reclamacion, type EstadoReclamo, type TipoGarantia,
} from '@/api/eamGarantias'

// ─── Constantes de tema ───────────────────────────────────────────────────────

const EAM_COLOR = COLOR_MODULO
const EAM_DARK = COLOR_MODULO

// ─── Helpers de color ─────────────────────────────────────────────────────────

function colorPorDias(dias: number): string {
  if (dias <= 7) return '#EF4444'
  if (dias <= 30) return '#F59E0B'
  return '#EAB308'
}

function labelPorDias(dias: number): string {
  if (dias <= 7) return 'CRÍTICO'
  if (dias <= 30) return 'URGENTE'
  return 'PRÓXIMO'
}

function colorEstadoGarantia(estado: string): string {
  switch (estado) {
    case 'VIGENTE': return '#16A34A'
    case 'VENCIDA': return '#6B7280'
    case 'RECLAMADA': return '#F59E0B'
    default: return '#94A3B8'
  }
}

function colorEstadoReclamo(estado: string): string {
  switch (estado) {
    case 'APROBADA': return '#16A34A'
    case 'EN_PROCESO': return '#3B82F6'
    case 'RECHAZADA': return '#EF4444'
    default: return '#6B7280'
  }
}

function colorTipo(tipo?: string | null): string {
  switch (tipo) {
    case 'ACTIVO': return '#3B82F6'
    case 'REPUESTO': return '#8B5CF6'
    default: return '#14B8A6'
  }
}

/**
 * Qué hacer con una garantía que está por vencerse.
 *
 * Antes era un campo de texto escrito a mano en los datos de ejemplo. Se
 * deriva de los días que quedan porque es lo único que cambia la respuesta: a
 * cuatro días no hay tiempo de programar nada, y a sesenta sí.
 */
function accionRecomendada(dias: number, tieneReclamo: boolean): string {
  if (tieneReclamo)
    return 'Ya hay una reclamación abierta. Haga seguimiento al proveedor antes ' +
      'de que se cierre la cobertura: después del vencimiento, un reclamo sin ' +
      'respuesta se pierde.'
  if (dias <= 7)
    return 'Quedan días. Inspeccione el componente HOY y abra la reclamación con ' +
      'lo que encuentre, aunque la falla no esté confirmada: la fecha del ' +
      'reclamo es la que cuenta, no la del peritaje.'
  if (dias <= 30)
    return 'Programe la inspección dentro de la semana y deje registro del ' +
      'estado del componente. Sin evidencia previa al vencimiento, el ' +
      'proveedor puede atribuir la falla al uso posterior.'
  return 'Revise qué cubre la garantía y verifique que el mantenimiento exigido ' +
    'esté al día: un PM vencido es la causa más común de que el proveedor ' +
    'rechace el reclamo.'
}

const HOY = () => new Date().toISOString().slice(0, 10)

// ─── Piezas de presentación ───────────────────────────────────────────────────

interface KPIBoxProps {
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}

function KPIBox({ label, value, color, icon, sub }: KPIBoxProps) {
  return (
    <Card sx={{ bgcolor: '#FFFFFF', border: `1px solid ${alpha(color, 0.25)}`, borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(color, 0.14), color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </Box>
          <Box minWidth={0}>
            <Typography fontSize={20} fontWeight={800} color="#1E293B" lineHeight={1.1} noWrap>
              {value}
            </Typography>
            <Typography fontSize={11} fontWeight={700} color="#64748B" textTransform="uppercase" letterSpacing="0.04em">
              {label}
            </Typography>
            {sub && <Typography fontSize={10.5} color="#94A3B8">{sub}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function DetalleItem({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <Box>
      <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Typography>
      <Typography
        fontSize={13}
        fontWeight={600}
        color="#1E293B"
        sx={{ wordBreak: 'break-word', fontFamily: mono ? 'monospace' : undefined }}
      >
        {value || '—'}
      </Typography>
    </Box>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EAMGarantias() {
  const qc = useQueryClient()
  const [tabActual, setTabActual] = useState(0)

  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>({
    open: false, msg: '', sev: 'success',
  })
  const notify = (msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'success') =>
    setSnack({ open: true, msg, sev })

  // Filtros
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterEstadoRec, setFilterEstadoRec] = useState('Todos')

  // Diálogos
  const [garantiaSel, setGarantiaSel] = useState<Garantia | null>(null)
  const [porVencerSel, setPorVencerSel] = useState<Garantia | null>(null)
  const [reclamoSel, setReclamoSel] = useState<Reclamacion | null>(null)
  /** `null` cerrado; un objeto sin `id` es alta y con `id` es edición. */
  const [editarGarantia, setEditarGarantia] = useState<Partial<Garantia> | null>(null)
  const [editarReclamo, setEditarReclamo] = useState<Partial<Reclamacion> | null>(null)
  const [borrar, setBorrar] = useState<{ tipo: 'garantia' | 'reclamo'; id: number; nombre: string } | null>(null)

  // ── Datos ──
  const { data: garantias = [], isLoading } = useQuery({
    queryKey: ['eam-garantias'], queryFn: () => garantiasApi.listar(),
  })
  const { data: porVencer = [] } = useQuery({
    queryKey: ['eam-garantias-por-vencer'], queryFn: () => garantiasApi.porVencer(),
  })
  const { data: resumen } = useQuery({
    queryKey: ['eam-garantias-resumen'], queryFn: () => garantiasApi.resumen(),
  })
  const { data: reclamaciones = [] } = useQuery({
    queryKey: ['eam-garantias-reclamaciones'], queryFn: () => reclamacionesApi.listar(),
  })

  // Catálogos reales. Antes salían de `/proveedores/` (el maestro general,
  // vacío en el CMMS: aquí los proveedores son los contratistas) y de
  // `/usuarios/` (que solo lista un administrador): los desplegables llegaban
  // vacíos. El catálogo de garantías junta cada fuente y sirve a cualquier perfil.
  const { data: catalogos } = useQuery({
    queryKey: ['eam-garantias-catalogos'],
    queryFn: catalogosGarantia,
    staleTime: 5 * 60_000,
  })
  const activos = catalogos?.activos ?? []

  const refrescar = () => {
    for (const k of ['eam-garantias', 'eam-garantias-por-vencer',
      'eam-garantias-resumen', 'eam-garantias-reclamaciones']) {
      qc.invalidateQueries({ queryKey: [k] })
    }
  }

  const nombresProveedor = catalogos?.proveedores ?? []
  const nombresResponsable = catalogos?.responsables ?? []

  const activoPorId = useMemo(() => {
    const m = new Map<number, string>()
    for (const a of activos) m.set(a.id, `${a.codigo} · ${a.nombre}`)
    return m
  }, [activos])

  // ── Mutaciones ──
  const alFallar = (e: unknown) => notify(mensajeDeError(e), 'error')

  const guardarGarantia = useMutation({
    // Los archivos se suben después de guardar: una garantía nueva no tiene id
    // hasta que el servidor la crea.
    mutationFn: async ({ d, archivos }: { d: Partial<Garantia>; archivos: File[] }) => {
      const g = d.id ? await garantiasApi.editar(d.id, d) : await garantiasApi.crear(d)
      if (archivos.length) {
        await adjuntosGarantiaApi.subir(g.id, archivos)
        qc.invalidateQueries({ queryKey: ['eam-garantia-adjuntos', g.id] })
      }
      return g
    },
    onSuccess: (g, { d: enviado }) => {
      refrescar()
      setEditarGarantia(null)
      // El detalle abierto detrás tiene que reflejar lo que se acabó de guardar.
      setGarantiaSel(prev => (prev && prev.id === g.id ? g : prev))
      notify(enviado.id
        ? `Garantía ${g.numero_garantia ?? ''} actualizada`
        : `Garantía ${g.numero_garantia ?? ''} creada`)
    },
    onError: alFallar,
  })

  const eliminarGarantia = useMutation({
    mutationFn: (id: number) => garantiasApi.eliminar(id),
    onSuccess: () => {
      refrescar(); setBorrar(null); setGarantiaSel(null)
      notify('Garantía eliminada')
    },
    onError: alFallar,
  })

  const guardarReclamo = useMutation({
    mutationFn: (d: Partial<Reclamacion>) => d.id
      ? reclamacionesApi.editar(d.id, d)
      : reclamacionesApi.crear(d),
    onSuccess: (r, enviado) => {
      refrescar()
      setEditarReclamo(null)
      setReclamoSel(prev => (prev && prev.id === r.id ? r : prev))
      notify(enviado.id ? 'Reclamación actualizada' : 'Reclamación registrada', 'info')
    },
    onError: alFallar,
  })

  const eliminarReclamo = useMutation({
    mutationFn: (id: number) => reclamacionesApi.eliminar(id),
    onSuccess: () => {
      refrescar(); setBorrar(null); setReclamoSel(null)
      notify('Reclamación eliminada')
    },
    onError: alFallar,
  })

  // ── Filtrado ──
  const garantiasFiltradas = useMemo(() => garantias.filter(g => {
    if (filterTipo !== 'Todos' && g.tipo !== filterTipo) return false
    if (filterEstado !== 'Todos' && g.estado !== filterEstado) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const texto = `${g.descripcion} ${g.activo_codigo ?? ''} ${g.proveedor ?? ''} ${g.numero_garantia ?? ''}`
      if (!texto.toLowerCase().includes(q)) return false
    }
    return true
  }), [garantias, filterTipo, filterEstado, search])

  const reclamacionesFiltradas = useMemo(
    () => reclamaciones.filter(r => filterEstadoRec === 'Todos' || r.estado === filterEstadoRec),
    [reclamaciones, filterEstadoRec])

  const reclamosDe = (garantiaId: number) =>
    reclamaciones.filter(r => r.garantia_id === garantiaId)

  const exportar = () => {
    const ok = exportarExcel({
      archivo: `garantias-${HOY()}`,
      titulo: 'Garantías y cobertura',
      subtitulo: `${garantiasFiltradas.length} de ${garantias.length} garantías`,
      color: EAM_COLOR,
      columnas: [
        { key: 'numero_garantia', header: 'N.º garantía' },
        { key: 'descripcion', header: 'Descripción' },
        { key: 'activo_codigo', header: 'Activo' },
        { key: 'tipo', header: 'Tipo' },
        { key: 'proveedor', header: 'Proveedor' },
        { key: 'fecha_inicio', header: 'Inicio' },
        { key: 'fecha_fin', header: 'Vencimiento' },
        { key: 'dias_restantes', header: 'Días restantes' },
        { key: 'valor_cubierto', header: 'Valor cubierto' },
        { key: 'estado', header: 'Estado' },
        { key: 'reclamaciones', header: 'Reclamaciones' },
        { key: 'responsable', header: 'Responsable' },
      ],
      // Se exporta lo filtrado y no todo: lo que se ve es lo que se lleva.
      filas: garantiasFiltradas,
    })
    notify(ok ? 'Reporte de garantías exportado' : 'No hay garantías para exportar',
      ok ? 'success' : 'warning')
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: '#1E293B' },
    '& label': { color: '#64748B' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(EAM_COLOR, 0.25) },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(EAM_COLOR, 0.5) },
    '& .MuiSvgIcon-root': { color: '#94A3B8' },
  }

  const dialogPaperSx = {
    bgcolor: '#FFFFFF',
    border: `1px solid ${alpha(EAM_COLOR, 0.3)}`,
    borderRadius: '16px',
  }

  const nuevaGarantia = () => setEditarGarantia({
    tipo: 'ACTIVO', fecha_inicio: HOY(), fecha_fin: '', descripcion: '',
  })

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 3 } }}>
        {/* Encabezado */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(EAM_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: EAM_COLOR, flexShrink: 0 }}>
            <GarantiaIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.2 }}>
              Gestión de Garantías
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              Control de cobertura, vencimientos y reclamaciones al proveedor
            </Typography>
          </Box>
          <Box flex={1} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: '0.9rem' }} />}
            onClick={exportar}
            sx={{ borderColor: alpha(EAM_COLOR, 0.4), color: EAM_COLOR, fontSize: '0.75rem', textTransform: 'none', '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) } }}
          >
            Exportar Reporte
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: '0.9rem' }} />}
            onClick={nuevaGarantia}
            sx={{ bgcolor: EAM_COLOR, fontSize: '0.75rem', textTransform: 'none', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: EAM_DARK } }}
          >
            Nueva Garantía
          </Button>
        </Stack>

        {/* Tabs */}
        <Paper sx={{ bgcolor: '#FFFFFF', borderRadius: 2, border: `1px solid ${alpha('#000', 0.07)}`, mb: 3 }}>
          <Tabs
            value={tabActual}
            onChange={(_e, v: number) => setTabActual(v)}
            TabIndicatorProps={{ style: { backgroundColor: EAM_COLOR } }}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                color: '#6B7280', textTransform: 'none', fontSize: '0.85rem', minHeight: 48,
                '&.Mui-selected': { color: EAM_COLOR, fontWeight: 600 },
              },
            }}
          >
            <Tab label={`Garantías (${garantias.length})`} />
            <Tab
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Por Vencer</span>
                  <Chip
                    label={String(porVencer.length)}
                    size="small"
                    sx={{ bgcolor: alpha('#EAB308', 0.2), color: '#EAB308', height: 16, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
                  />
                </Stack>
              }
            />
            <Tab
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>Reclamaciones</span>
                  <Chip
                    label={String(reclamaciones.length)}
                    size="small"
                    sx={{ bgcolor: alpha('#3B82F6', 0.2), color: '#3B82F6', height: 16, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
                  />
                </Stack>
              }
            />
          </Tabs>
        </Paper>

        {/* ── Tab 0: Garantías ── */}
        {tabActual === 0 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Garantías Vigentes" value={String(resumen?.vigentes ?? 0)} color="#16A34A" icon={<VerificadoIcon />} sub="Activas y en cobertura" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox
                  label={`Por Vencer (<${resumen?.dias_aviso ?? 90} días)`}
                  value={String(resumen?.por_vencer ?? 0)}
                  color="#EAB308" icon={<ProximoIcon />} sub="Requieren atención"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Garantías Vencidas" value={String(resumen?.vencidas ?? 0)} color="#6B7280" icon={<AlertaIcon />} sub="Sin cobertura activa" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPIBox label="Valor Cubierto" value={pesos(resumen?.valor_cubierto)} color={EAM_COLOR} icon={<DineroIcon />} sub="Solo cobertura viva" />
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                placeholder="Buscar descripción, activo, proveedor o Nº…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 280, flex: 1, ...inputSx }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <TextField select size="small" label="Tipo" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                {['Todos', 'ACTIVO', 'REPUESTO', 'SERVICIO'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Estado" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} sx={{ minWidth: 160, ...inputSx }}>
                {['Todos', 'VIGENTE', 'VENCIDA', 'RECLAMADA', 'CANCELADA'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Stack>

            <Typography fontSize={12} color="#94A3B8" mb={1}>
              {garantiasFiltradas.length} garantía{garantiasFiltradas.length !== 1 ? 's' : ''} · clic en una fila para ver el detalle completo
            </Typography>

            {isLoading ? <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} /> : (
              <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', borderRadius: 2, border: `1px solid ${alpha('#000', 0.06)}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: alpha(EAM_COLOR, 0.08), color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${alpha('#000', 0.08)}` } }}>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Activo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Proveedor</TableCell>
                      <TableCell>Nº Garantía</TableCell>
                      <TableCell>Inicio</TableCell>
                      <TableCell>Vencimiento</TableCell>
                      <TableCell align="center">Días Rest.</TableCell>
                      <TableCell>Valor Cubierto</TableCell>
                      <TableCell align="center">Estado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {garantiasFiltradas.map(row => {
                      const dias = row.dias_restantes ?? 0
                      return (
                        <TableRow
                          key={row.id}
                          onClick={() => setGarantiaSel(row)}
                          sx={{
                            cursor: 'pointer',
                            transition: 'background-color 0.12s',
                            '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) },
                            '& td': { borderBottom: `1px solid ${alpha('#000', 0.05)}`, color: '#334155', fontSize: '0.8rem', py: 1.2 },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#1E293B', fontSize: '0.8rem', fontWeight: 500 }}>
                              {row.descripcion}
                            </Typography>
                          </TableCell>
                          <TableCell>{row.activo_codigo ?? '—'}</TableCell>
                          <TableCell>
                            <Chip label={row.tipo ?? '—'} size="small" sx={{ bgcolor: alpha(colorTipo(row.tipo), 0.15), color: colorTipo(row.tipo), fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                          </TableCell>
                          <TableCell>{row.proveedor ?? '—'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important', color: '#64748B !important' }}>
                            {row.numero_garantia ?? '—'}
                          </TableCell>
                          <TableCell>{row.fecha_inicio}</TableCell>
                          <TableCell>{row.fecha_fin}</TableCell>
                          <TableCell align="center">
                            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: dias > 30 ? '#16A34A' : dias > 0 ? '#EAB308' : '#6B7280' }}>
                              {dias}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: `${EAM_COLOR} !important`, fontWeight: 600 }}>
                            {pesos(row.valor_cubierto)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={row.estado} size="small" sx={{ bgcolor: alpha(colorEstadoGarantia(row.estado), 0.15), color: colorEstadoGarantia(row.estado), fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title="Editar">
                              <IconButton size="small" sx={{ color: '#64748B' }}
                                onClick={(e) => { e.stopPropagation(); setEditarGarantia(row) }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" sx={{ color: '#94A3B8' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setBorrar({ tipo: 'garantia', id: row.id, nombre: row.numero_garantia ?? row.descripcion })
                                }}>
                                <BorrarIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {garantiasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: '#94A3B8' }}>
                          {garantias.length === 0
                            ? 'Todavía no hay garantías registradas. «Nueva Garantía» crea la primera.'
                            : 'No se encontraron garantías con los filtros aplicados.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ── Tab 1: Por Vencer ── */}
        {tabActual === 1 && (
          <Box>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
              Garantías que se vencen en los próximos {resumen?.dias_aviso ?? 90} días, lo más
              próximo primero. Lo ya vencido no aparece acá: esta lista es de lo que todavía
              se puede reclamar.
            </Typography>
            <Stack spacing={2}>
              {porVencer.map(g => {
                const dias = g.dias_restantes ?? 0
                const color = colorPorDias(dias)
                return (
                  <Card
                    key={g.id}
                    onClick={() => setPorVencerSel(g)}
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: `1px solid ${alpha(color, 0.35)}`,
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s',
                      '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.09)' },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
                        <Box flex={1}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Chip label={labelPorDias(dias)} size="small" sx={{ bgcolor: alpha(color, 0.2), color, fontWeight: 700, fontSize: '0.62rem', height: 18 }} />
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>Vence: {g.fecha_fin}</Typography>
                            {g.reclamaciones > 0 && (
                              <Chip label={`${g.reclamaciones} reclamo${g.reclamaciones > 1 ? 's' : ''}`} size="small"
                                sx={{ bgcolor: alpha('#3B82F6', 0.15), color: '#3B82F6', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                            )}
                          </Stack>
                          <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mb: 0.5 }}>
                            {g.descripcion}
                          </Typography>
                          <Stack direction="row" spacing={3} flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Activo: <span style={{ color: '#334155' }}>{g.activo_codigo ?? '—'}</span></Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Proveedor: <span style={{ color: '#334155' }}>{g.proveedor ?? '—'}</span></Typography>
                            <Typography variant="caption" sx={{ color: '#9CA3AF' }}>Valor: <span style={{ color: EAM_COLOR, fontWeight: 600 }}>{pesos(g.valor_cubierto)}</span></Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={2} flexShrink={0}>
                          <Box textAlign="center">
                            <Typography variant="h4" sx={{ color, fontWeight: 800, lineHeight: 1 }}>{dias}</Typography>
                            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.65rem' }}>días restantes</Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ReclamoIcon sx={{ fontSize: '0.9rem' }} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditarReclamo({ garantia_id: g.id, fecha: HOY(), estado: 'EN_PROCESO', monto_solicitado: g.valor_cubierto ?? null })
                            }}
                            sx={{ borderColor: alpha(color, 0.5), color, fontSize: '0.72rem', textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { borderColor: color, bgcolor: alpha(color, 0.08) } }}
                          >
                            Abrir Reclamación
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
              {porVencer.length === 0 && (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2, border: `1px solid ${alpha('#000', 0.06)}` }}>
                  <Typography color="#94A3B8">
                    Nada por vencer en los próximos {resumen?.dias_aviso ?? 90} días.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Box>
        )}

        {/* ── Tab 2: Reclamaciones ── */}
        {tabActual === 2 && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPIBox label="Tasa de Recuperación" value={`${resumen?.tasa_recuperacion ?? 0}%`} color="#16A34A" icon={<VerificadoIcon />} sub="Sobre total reclamado" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPIBox label="Total Reclamado" value={pesos(resumen?.monto_solicitado)} color="#EF4444" icon={<ReclamoIcon />} sub="Histórico acumulado" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <KPIBox label="Total Recuperado" value={pesos(resumen?.monto_recuperado)} color={EAM_COLOR} icon={<DineroIcon />} sub="Valor efectivamente cobrado" />
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: alpha('#000', 0.07), mb: 2 }} />

            <Stack direction="row" spacing={1.5} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Estado del reclamo" value={filterEstadoRec} onChange={(e) => setFilterEstadoRec(e.target.value)} sx={{ minWidth: 190, ...inputSx }}>
                {['Todos', 'EN_PROCESO', 'APROBADA', 'RECHAZADA', 'CERRADA'].map(o => (
                  <MenuItem key={o} value={o}>{o === 'Todos' ? 'Todos' : ETIQUETA_RECLAMO[o]}</MenuItem>
                ))}
              </TextField>
              <Typography fontSize={12} color="#94A3B8" flex={1}>
                {reclamacionesFiltradas.length} reclamación{reclamacionesFiltradas.length !== 1 ? 'es' : ''} · clic en una fila para ver el detalle
              </Typography>
              <Button
                variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '0.9rem' }} />}
                disabled={garantias.length === 0}
                onClick={() => setEditarReclamo({ fecha: HOY(), estado: 'EN_PROCESO' })}
                sx={{ bgcolor: EAM_COLOR, fontSize: '0.75rem', textTransform: 'none', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: EAM_DARK } }}
              >
                Nueva Reclamación
              </Button>
            </Stack>

            <TableContainer component={Paper} sx={{ bgcolor: '#FFFFFF', borderRadius: 2, border: `1px solid ${alpha('#000', 0.06)}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: alpha(EAM_COLOR, 0.08), color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${alpha('#000', 0.08)}` } }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Garantía</TableCell>
                    <TableCell>Descripción del Reclamo</TableCell>
                    <TableCell>Solicitado</TableCell>
                    <TableCell>Recuperado</TableCell>
                    <TableCell align="center">Días</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reclamacionesFiltradas.map(r => (
                    <TableRow
                      key={r.id}
                      onClick={() => setReclamoSel(r)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.12s',
                        '&:hover': { bgcolor: alpha(EAM_COLOR, 0.06) },
                        '& td': { borderBottom: `1px solid ${alpha('#000', 0.05)}`, color: '#334155', fontSize: '0.8rem', py: 1.2 },
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important', color: '#64748B !important' }}>{r.fecha}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem !important', color: '#64748B !important' }}>{r.numero_garantia ?? '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#1E293B', fontSize: '0.8rem', fontWeight: 500, maxWidth: 300 }}>
                          {r.descripcion}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: '#EF4444 !important', fontWeight: 600 }}>{pesos(r.monto_solicitado)}</TableCell>
                      <TableCell sx={{ color: `${r.monto_recuperado ? '#16A34A' : '#6B7280'} !important`, fontWeight: 600 }}>
                        {pesos(r.monto_recuperado)}
                      </TableCell>
                      <TableCell align="center">
                        {/* Un reclamo abierto lleva los días subiendo; eso es lo que
                            delata al proveedor que no responde. */}
                        <Typography fontSize="0.78rem" fontWeight={700}
                          color={r.abierto && (r.dias_gestion ?? 0) > 30 ? '#EF4444' : '#64748B'}>
                          {r.dias_gestion ?? '—'}{r.abierto ? '…' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={ETIQUETA_RECLAMO[r.estado] ?? r.estado} size="small" sx={{ bgcolor: alpha(colorEstadoReclamo(r.estado), 0.15), color: colorEstadoReclamo(r.estado), fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </TableCell>
                      <TableCell>{r.proveedor ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" sx={{ color: '#64748B' }}
                            onClick={(e) => { e.stopPropagation(); setEditarReclamo(r) }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" sx={{ color: '#94A3B8' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setBorrar({ tipo: 'reclamo', id: r.id, nombre: `el reclamo del ${r.fecha}` })
                            }}>
                            <BorrarIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reclamacionesFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#94A3B8' }}>
                        {reclamaciones.length === 0
                          ? 'Sin reclamaciones registradas. Una garantía sin reclamos es un archivo de documentos.'
                          : 'No hay reclamaciones con el filtro aplicado.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* ═══ Diálogo: Detalle de Garantía ═══ */}
      <Dialog open={!!garantiaSel} onClose={() => setGarantiaSel(null)} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {garantiaSel && (() => {
          const g = garantiaSel
          const color = colorEstadoGarantia(g.estado)
          const dias = g.dias_restantes ?? 0
          const recs = reclamosDe(g.id)
          const totalReclamado = recs.reduce((s, r) => s + (r.monto_solicitado ?? 0), 0)
          const totalRecuperado = recs.reduce((s, r) => s + (r.monto_recuperado ?? 0), 0)
          const cobertura = coberturaLista(g.cobertura)
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(colorTipo(g.tipo), 0.15), color: colorTipo(g.tipo), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GarantiaIcon />
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px" fontFamily="monospace">
                      {g.numero_garantia ?? 'Sin número'} · {g.tipo ?? '—'}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
                      {g.descripcion}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.75}>
                      <Chip label={g.estado} size="small" sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10, height: 20 }} />
                      <Chip
                        label={dias >= 0 ? `${dias} días restantes` : `Vencida hace ${Math.abs(dias)} días`}
                        size="small"
                        sx={{ bgcolor: alpha(dias >= 0 ? '#16A34A' : '#6B7280', 0.12), color: dias >= 0 ? '#16A34A' : '#6B7280', fontWeight: 600, fontSize: 10, height: 20 }}
                      />
                    </Stack>
                  </Box>
                </Stack>
                <IconButton onClick={() => setGarantiaSel(null)} size="small" sx={{ color: '#64748B' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>

              <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
                <Grid container spacing={2} mb={2}>
                  {[
                    { label: 'Valor cubierto', value: pesos(g.valor_cubierto), color: EAM_COLOR },
                    { label: 'Vigencia', value: `${g.fecha_inicio} → ${g.fecha_fin}`, color: '#3B82F6' },
                    { label: 'Reclamaciones', value: String(recs.length), color: '#8B5CF6' },
                    { label: 'Recuperado', value: pesos(totalRecuperado), color: '#16A34A' },
                  ].map(k => (
                    <Grid key={k.label} size={{ xs: 6, md: 3 }}>
                      <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 1.75, textAlign: 'center' }}>
                        <Typography fontSize={15} fontWeight={900} color={k.color} noWrap>{k.value}</Typography>
                        <Typography fontSize={10.5} color="#64748B" mt={0.5}>{k.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <ActivoIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                    <Typography fontWeight={700} fontSize={14} color="#1E293B">Datos de la garantía</Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Activo / Repuesto" value={g.activo_id ? activoPorId.get(g.activo_id) ?? g.activo_codigo : '—'} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Tipo" value={g.tipo} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Proveedor" value={g.proveedor} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Responsable interno" value={g.responsable} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Contacto proveedor" value={g.contacto_proveedor} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Teléfono" value={g.telefono_proveedor} mono /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Fecha inicio" value={g.fecha_inicio} /></Grid>
                    <Grid size={{ xs: 6, md: 3 }}><DetalleItem label="Fecha vencimiento" value={g.fecha_fin} /></Grid>
                  </Grid>
                  <Divider sx={{ my: 2, borderColor: '#E5E7EB' }} />
                  <DetalleItem label="Condiciones" value={g.condiciones} />
                </Paper>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <CoberturaIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                        <Typography fontWeight={700} fontSize={14} color="#1E293B">Cobertura</Typography>
                      </Stack>
                      {cobertura.length === 0 ? (
                        <Typography fontSize={12} color="#94A3B8">
                          Sin cobertura detallada. Editar la garantía permite listar qué cubre,
                          una línea por ítem.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {cobertura.map(c => (
                            <Chip key={c} label={c} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.1), color: EAM_DARK, fontWeight: 600, fontSize: 11, border: `1px solid ${alpha(EAM_COLOR, 0.3)}` }} />
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <FileIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                        <Typography fontWeight={700} fontSize={14} color="#1E293B">Documentos de respaldo</Typography>
                      </Stack>
                      <AdjuntosGarantia garantiaId={g.id} />
                      {g.documento && (
                        <Typography fontSize={11} color="#64748B" mt={1}>Referencia del contrato: {g.documento}</Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>

                <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mt: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <ReclamoIcon sx={{ fontSize: 16, color: EAM_COLOR }} />
                      <Typography fontWeight={700} fontSize={14} color="#1E293B">Reclamaciones asociadas ({recs.length})</Typography>
                    </Stack>
                    {recs.length > 0 && (
                      <Typography fontSize={12} fontWeight={700} color="#EF4444">Reclamado: {pesos(totalReclamado)}</Typography>
                    )}
                  </Stack>
                  {recs.length === 0 ? (
                    <Typography fontSize={12} color="#94A3B8">Esta garantía no tiene reclamaciones registradas.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {recs.map(r => (
                        <Box
                          key={r.id}
                          onClick={() => { setGarantiaSel(null); setTabActual(2); setReclamoSel(r) }}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', cursor: 'pointer', '&:hover': { bgcolor: alpha(EAM_COLOR, 0.05) } }}
                        >
                          <Box flex={1} minWidth={0}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                              <Typography fontSize={11} color="#64748B" fontFamily="monospace">{r.fecha}</Typography>
                              <Chip label={ETIQUETA_RECLAMO[r.estado] ?? r.estado} size="small" sx={{ bgcolor: alpha(colorEstadoReclamo(r.estado), 0.15), color: colorEstadoReclamo(r.estado), fontWeight: 700, fontSize: 9, height: 18 }} />
                            </Stack>
                            <Typography fontSize={12} color="#334155" noWrap>{r.descripcion}</Typography>
                          </Box>
                          <Box textAlign="right" flexShrink={0}>
                            <Typography fontSize={11} fontWeight={700} color="#16A34A">{pesos(r.monto_recuperado)}</Typography>
                            <Typography fontSize={10} color="#94A3B8">de {pesos(r.monto_solicitado)}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </DialogContent>

              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setGarantiaSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Box flex={1} />
                <Button
                  startIcon={<BorrarIcon />}
                  onClick={() => setBorrar({ tipo: 'garantia', id: g.id, nombre: g.numero_garantia ?? g.descripcion })}
                  sx={{ color: '#94A3B8', textTransform: 'none' }}
                >
                  Eliminar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setEditarGarantia(g)}
                  sx={{ borderColor: alpha(EAM_COLOR, 0.4), color: EAM_COLOR, textTransform: 'none', '&:hover': { borderColor: EAM_COLOR, bgcolor: alpha(EAM_COLOR, 0.06) } }}
                >
                  Editar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ReclamoIcon />}
                  onClick={() => setEditarReclamo({
                    garantia_id: g.id, fecha: HOY(), estado: 'EN_PROCESO',
                    monto_solicitado: g.valor_cubierto ?? null,
                    responsable: g.responsable ?? null,
                  })}
                  sx={{ bgcolor: EAM_COLOR, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: EAM_DARK } }}
                >
                  Registrar Reclamación
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ═══ Diálogo: Detalle Garantía por Vencer ═══ */}
      <Dialog open={!!porVencerSel} onClose={() => setPorVencerSel(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        {porVencerSel && (() => {
          const g = porVencerSel
          const dias = g.dias_restantes ?? 0
          const color = colorPorDias(dias)
          const ventana = resumen?.dias_aviso ?? 90
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(color, 0.15), color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ProximoIcon />
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px" fontFamily="monospace">
                      {g.numero_garantia ?? 'Sin número'} · {labelPorDias(dias)}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>{g.descripcion}</Typography>
                  </Box>
                </Stack>
                <IconButton onClick={() => setPorVencerSel(null)} size="small" sx={{ color: '#64748B' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
                <Box textAlign="center" mb={2}>
                  <Typography variant="h3" sx={{ color, fontWeight: 900, lineHeight: 1 }}>{dias}</Typography>
                  <Typography fontSize={12} color="#64748B">días restantes · vence {g.fecha_fin}</Typography>
                  {/* La barra se mide contra la ventana de aviso del servidor y
                      no contra 30 días fijos: si la ventana cambia, la barra
                      seguía mintiendo. */}
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, ((ventana - dias) / ventana) * 100))}
                    sx={{ mt: 1.5, height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 } }}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Activo" value={g.activo_codigo} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Proveedor" value={g.proveedor} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Valor cubierto" value={<span style={{ color: EAM_COLOR }}>{pesos(g.valor_cubierto)}</span>} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Responsable" value={g.responsable} /></Grid>
                </Grid>
                {coberturaLista(g.cobertura).length > 0 && (
                  <Box mt={2}>
                    <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.06em" mb={0.75}>
                      Cobertura
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {coberturaLista(g.cobertura).map(c => (
                        <Chip key={c} label={c} size="small" sx={{ bgcolor: alpha(EAM_COLOR, 0.1), color: EAM_DARK, fontWeight: 600, fontSize: 11 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
                <Paper elevation={0} sx={{ mt: 2, bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '12px', p: 2 }}>
                  <Typography fontSize={10.5} fontWeight={700} color={color} textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>
                    Acción recomendada
                  </Typography>
                  <Typography fontSize={13} color="#334155">
                    {accionRecomendada(dias, g.reclamaciones > 0)}
                  </Typography>
                </Paper>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setPorVencerSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Button
                  variant="contained"
                  startIcon={<ReclamoIcon />}
                  onClick={() => {
                    setEditarReclamo({
                      garantia_id: g.id, fecha: HOY(), estado: 'EN_PROCESO',
                      monto_solicitado: g.valor_cubierto ?? null,
                      responsable: g.responsable ?? null,
                    })
                    setPorVencerSel(null)
                  }}
                  sx={{ bgcolor: color, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: color, filter: 'brightness(0.92)' } }}
                >
                  Abrir Reclamación
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ═══ Diálogo: Detalle de Reclamación ═══ */}
      <Dialog open={!!reclamoSel} onClose={() => setReclamoSel(null)} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: dialogPaperSx }}>
        {reclamoSel && (() => {
          const r = reclamoSel
          const color = colorEstadoReclamo(r.estado)
          const solicitado = r.monto_solicitado ?? 0
          const recuperado = r.monto_recuperado ?? 0
          const pct = solicitado > 0 ? Math.round((recuperado / solicitado) * 100) : 0
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(color, 0.15), color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReclamoIcon />
                  </Box>
                  <Box>
                    <Typography fontSize={11} fontWeight={700} color="#64748B" letterSpacing="0.5px" fontFamily="monospace">
                      Reclamo sobre {r.numero_garantia ?? '—'} · {r.fecha}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>Reclamación de Garantía</Typography>
                    <Chip label={ETIQUETA_RECLAMO[r.estado] ?? r.estado} size="small" sx={{ mt: 0.75, bgcolor: alpha(color, 0.15), color, fontWeight: 700, fontSize: 10, height: 20 }} />
                  </Box>
                </Stack>
                <IconButton onClick={() => setReclamoSel(null)} size="small" sx={{ color: '#64748B' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
                <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '12px', p: 2, mb: 2 }}>
                  <Typography fontSize={13} color="#334155">{r.descripcion}</Typography>
                </Paper>

                <Grid container spacing={2} mb={2}>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Activo" value={r.activo_codigo} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Proveedor" value={r.proveedor} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Responsable" value={r.responsable} /></Grid>
                  <Grid size={{ xs: 6 }}>
                    <DetalleItem
                      label="Días de gestión"
                      value={r.abierto
                        ? `${r.dias_gestion ?? 0} días · sigue abierto`
                        : `${r.dias_gestion ?? 0} días · cerró el ${r.fecha_cierre}`}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Monto solicitado" value={<span style={{ color: '#EF4444' }}>{pesos(r.monto_solicitado)}</span>} /></Grid>
                  <Grid size={{ xs: 6 }}><DetalleItem label="Monto recuperado" value={<span style={{ color: recuperado > 0 ? '#16A34A' : '#6B7280' }}>{pesos(r.monto_recuperado)}</span>} /></Grid>
                </Grid>

                <Box mb={2}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontSize={11} color="#64748B">Recuperación</Typography>
                    <Typography fontSize={11} fontWeight={700} color={pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#6B7280'}>{pct}%</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, pct)}
                    sx={{ height: 8, borderRadius: 5, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: pct >= 80 ? '#16A34A' : pct > 0 ? '#F59E0B' : '#6B7280', borderRadius: 5 } }}
                  />
                </Box>

                <Paper elevation={0} sx={{ bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.3)}`, borderRadius: '12px', p: 2 }}>
                  <Typography fontSize={10.5} fontWeight={700} color={color} textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>Resolución / estado</Typography>
                  <Typography fontSize={13} color="#334155">
                    {r.resolucion || 'Sin resolución registrada todavía.'}
                  </Typography>
                </Paper>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setReclamoSel(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cerrar</Button>
                <Box flex={1} />
                <Button
                  startIcon={<BorrarIcon />}
                  onClick={() => setBorrar({ tipo: 'reclamo', id: r.id, nombre: `el reclamo del ${r.fecha}` })}
                  sx={{ color: '#94A3B8', textTransform: 'none' }}
                >
                  Eliminar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setEditarReclamo(r)}
                  sx={{ bgcolor: EAM_COLOR, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: EAM_DARK } }}
                >
                  Editar reclamo
                </Button>
              </DialogActions>
            </>
          )
        })()}
      </Dialog>

      {/* ═══ Diálogo: Alta y edición de garantía ═══ */}
      {editarGarantia && (
        <DialogoGarantia
          valor={editarGarantia}
          activos={activos}
          proveedores={nombresProveedor}
          responsables={nombresResponsable}
          contactos={catalogos?.contactos ?? {}}
          guardando={guardarGarantia.isPending}
          inputSx={inputSx}
          paperSx={dialogPaperSx}
          onCerrar={() => setEditarGarantia(null)}
          onGuardar={(d, archivos) => guardarGarantia.mutate({ d, archivos })}
        />
      )}

      {/* ═══ Diálogo: Alta y edición de reclamación ═══ */}
      {editarReclamo && (
        <DialogoReclamo
          valor={editarReclamo}
          garantias={garantias}
          responsables={nombresResponsable}
          guardando={guardarReclamo.isPending}
          inputSx={inputSx}
          paperSx={dialogPaperSx}
          onCerrar={() => setEditarReclamo(null)}
          onGuardar={d => guardarReclamo.mutate(d)}
        />
      )}

      {/* ═══ Confirmación de borrado ═══ */}
      <Dialog open={!!borrar} onClose={() => setBorrar(null)} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B' }}>¿Eliminar?</DialogTitle>
        <DialogContent>
          <Typography fontSize={13} color="#334155">
            Se va a eliminar <strong>{borrar?.nombre}</strong>. No se puede deshacer.
          </Typography>
          {borrar?.tipo === 'garantia' && (
            <Typography fontSize={12} color="#94A3B8" mt={1}>
              Si tiene reclamaciones, el servidor no la borra: primero hay que borrarlas, o
              cancelar la garantía en vez de eliminarla.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBorrar(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained" color="error"
            disabled={eliminarGarantia.isPending || eliminarReclamo.isPending}
            onClick={() => {
              if (!borrar) return
              if (borrar.tipo === 'garantia') eliminarGarantia.mutate(borrar.id)
              else eliminarReclamo.mutate(borrar.id)
            }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          sx={{ width: '100%', ...(snack.sev === 'success' ? { bgcolor: EAM_COLOR } : {}) }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Layout>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Alta y edición de una garantía.

   Un solo formulario para las dos cosas: los campos son los mismos y tener dos
   diálogos casi iguales garantiza que al agregar un campo se olvide uno.
   ═══════════════════════════════════════════════════════════════════════════ */

function DialogoGarantia({
  valor, activos, proveedores, responsables, contactos, guardando, inputSx, paperSx, onCerrar, onGuardar,
}: {
  valor: Partial<Garantia>
  activos: CatalogosGarantia['activos']
  proveedores: string[]
  responsables: string[]
  contactos: CatalogosGarantia['contactos']
  guardando: boolean
  inputSx: object
  paperSx: object
  onCerrar: () => void
  onGuardar: (d: Partial<Garantia>, archivos: File[]) => void
}) {
  const [f, setF] = useState<Partial<Garantia>>(valor)
  const [intento, setIntento] = useState(false)
  const [archivos, setArchivos] = useState<File[]>([])
  const activoSel = activos.find(a => a.id === f.activo_id) ?? null
  // Al escoger un contratista conocido se traen su contacto y teléfono, sin
  // pisar lo que la persona ya haya escrito.
  const elegirProveedor = (v: string) => {
    const c = contactos[v]
    setF(p => ({
      ...p, proveedor: v,
      contacto_proveedor: p.contacto_proveedor || c?.contacto || p.contacto_proveedor,
      telefono_proveedor: p.telefono_proveedor || c?.telefono || p.telefono_proveedor,
    }))
  }
  const set = <K extends keyof Garantia>(k: K, v: Garantia[K]) => setF(p => ({ ...p, [k]: v }))
  const edicion = !!valor.id

  const falta = {
    descripcion: !String(f.descripcion ?? '').trim(),
    fecha_inicio: !f.fecha_inicio,
    fecha_fin: !f.fecha_fin,
    proveedor: !String(f.proveedor ?? '').trim(),
  }
  // El orden importa: vencer antes de empezar no es un campo faltante, es una
  // fecha mal puesta, y decir «falta la fecha» cuando está puesta desorienta.
  const alRevés = !!f.fecha_inicio && !!f.fecha_fin && f.fecha_fin < f.fecha_inicio
  const valido = !Object.values(falta).some(Boolean) && !alRevés

  const enviar = () => {
    if (!valido) { setIntento(true); return }
    onGuardar(f, archivos)
  }

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {edicion ? <EditIcon /> : <AddIcon />}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
              {edicion ? `Editar ${f.numero_garantia ?? 'garantía'}` : 'Nueva Garantía'}
            </Typography>
            <Typography fontSize={12} color="#64748B">
              {edicion
                ? 'El número no cambia y el estado se ajusta solo con las fechas'
                : 'Cobertura de un activo, un repuesto o un servicio'}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onCerrar} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        <Stack spacing={1.75} mt={0.5}>
          <TextField
            fullWidth size="small" label="Descripción de la garantía *"
            placeholder="Ej. Motor Cummins ISX 15L del tracto TF-001"
            value={f.descripcion ?? ''}
            onChange={e => set('descripcion', e.target.value)}
            error={intento && falta.descripcion}
            helperText={intento && falta.descripcion ? 'La descripción es obligatoria' : ' '}
            sx={inputSx}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {/* Con búsqueda: con una flota real, un select de cientos de
                activos sin filtro no se puede usar. Busca por código, nombre o placa. */}
            <Autocomplete
              fullWidth
              options={activos}
              value={activoSel}
              onChange={(_e, a) => set('activo_id', a ? a.id : null)}
              getOptionLabel={a => `${a.codigo} · ${a.nombre}${a.placa ? ` · ${a.placa}` : ''}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText="Ningún activo coincide"
              renderInput={p => (
                <TextField {...p} size="small" label="Activo"
                  placeholder="Buscar por código, nombre o placa"
                  helperText="Opcional: una garantía de servicio puede cubrir la flota entera" sx={inputSx} />
              )}
            />
            <TextField
              select fullWidth size="small" label="Tipo"
              value={f.tipo ?? 'ACTIVO'}
              onChange={e => set('tipo', e.target.value as TipoGarantia)}
              helperText=" " sx={inputSx}
            >
              {(['ACTIVO', 'REPUESTO', 'SERVICIO'] as TipoGarantia[]).map(o => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Los proveedores son los de la empresa, pero se permite escribir uno
              que no esté en el maestro: la garantía la da a veces el fabricante
              y no el proveedor con el que se compra. */}
          <Autocomplete
            freeSolo
            options={proveedores}
            inputValue={f.proveedor ?? ''}
            onInputChange={(_e, v, motivo) => motivo === 'reset' ? elegirProveedor(v) : set('proveedor', v)}
            onChange={(_e, v) => { if (typeof v === 'string') elegirProveedor(v) }}
            noOptionsText="Sin coincidencias: se guardará como lo escribió"
            renderInput={p => (
              <TextField
                {...p} size="small" label="Proveedor *"
                error={intento && falta.proveedor}
                helperText={intento && falta.proveedor ? 'Indique el proveedor' : 'De la lista, o escríbalo si no está'}
                sx={inputSx}
                InputProps={{
                  ...p.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start"><ProveedorIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>
                      {p.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" type="date" label="Fecha inicio *"
              InputLabelProps={{ shrink: true }}
              value={f.fecha_inicio ?? ''}
              onChange={e => set('fecha_inicio', e.target.value)}
              error={intento && falta.fecha_inicio}
              helperText={intento && falta.fecha_inicio ? 'Indique la fecha de inicio' : ' '}
              sx={inputSx}
            />
            <TextField
              fullWidth size="small" type="date" label="Fecha vencimiento *"
              InputLabelProps={{ shrink: true }}
              value={f.fecha_fin ?? ''}
              onChange={e => set('fecha_fin', e.target.value)}
              error={intento && (falta.fecha_fin || alRevés)}
              helperText={
                intento && falta.fecha_fin ? 'Indique la fecha de vencimiento'
                  : alRevés ? 'No puede vencer antes de empezar' : ' '
              }
              sx={inputSx}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" type="number" label="Valor cubierto"
              value={f.valor_cubierto ?? ''}
              onChange={e => set('valor_cubierto', e.target.value === '' ? null : Number(e.target.value))}
              helperText="Lo que el proveedor respalda" sx={inputSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><DineroIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
              inputProps={{ min: 0 }}
            />
            <Autocomplete
              freeSolo
              fullWidth
              options={responsables}
              inputValue={f.responsable ?? ''}
              onInputChange={(_e, v) => set('responsable', v)}
              onChange={(_e, v) => { if (typeof v === 'string') set('responsable', v) }}
              renderInput={p => (
                <TextField {...p} size="small" label="Responsable interno"
                  helperText="Quién responde por esta garantía adentro" sx={inputSx} />
              )}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" label="Contacto en el proveedor"
              value={f.contacto_proveedor ?? ''}
              onChange={e => set('contacto_proveedor', e.target.value)}
              helperText=" " sx={inputSx}
            />
            <TextField
              fullWidth size="small" label="Teléfono"
              value={f.telefono_proveedor ?? ''}
              onChange={e => set('telefono_proveedor', e.target.value)}
              helperText=" " sx={inputSx}
            />
          </Stack>

          <TextField
            fullWidth size="small" label="Qué cubre" multiline rows={3}
            value={f.cobertura ?? ''}
            onChange={e => set('cobertura', e.target.value)}
            placeholder={'Defectos de manufactura\nConsumo de aceite anormal\nBloque y culata'}
            helperText="Una línea por ítem. Así se muestran en el detalle."
            sx={inputSx}
          />
          <TextField
            fullWidth size="small" label="Condiciones" multiline rows={3}
            value={f.condiciones ?? ''}
            onChange={e => set('condiciones', e.target.value)}
            placeholder="Plazo, kilometraje, exclusiones, mantenimiento exigido…"
            sx={inputSx}
          />
          <TextField
            fullWidth size="small" label="Referencia del contrato"
            value={f.documento ?? ''}
            onChange={e => set('documento', e.target.value)}
            placeholder="Contrato 2024-0041"
            helperText="Opcional. Los archivos se adjuntan abajo."
            sx={inputSx}
          />
          <Box>
            <Typography fontSize={13} fontWeight={700} color="#1E293B" mb={0.5}>Documentos de respaldo</Typography>
            {edicion && valor.id && <AdjuntosGarantia garantiaId={valor.id} />}
            <Button component="label" size="small" variant="outlined" startIcon={<FileIcon />}
              sx={{ mt: 1, textTransform: 'none', borderColor: EAM_COLOR, color: EAM_COLOR }}>
              {edicion ? 'Agregar archivos' : 'Adjuntar archivos'}
              <input hidden type="file" multiple aria-label="Adjuntar archivos de la garantía"
                onChange={e => { const n = Array.from(e.target.files ?? []); setArchivos(a => [...a, ...n]); e.target.value = '' }} />
            </Button>
            {archivos.map((a, i) => (
              <Stack key={a.name + i} direction="row" alignItems="center" spacing={1} mt={0.5}>
                <Typography fontSize={12} color="#334155">{a.name}</Typography>
                <Typography fontSize={11} color="#94A3B8">{Math.ceil(a.size / 1024)} KB · se sube al guardar</Typography>
                <IconButton size="small" aria-label={`Quitar ${a.name}`} onClick={() => setArchivos(x => x.filter((_, j) => j !== i))}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            ))}
            <Typography fontSize={11} color="#94A3B8" mt={0.5}>PDF, imágenes, Word, Excel o correo; hasta 25 MB por archivo.</Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={edicion ? <EditIcon /> : <AddIcon />}
          disabled={guardando}
          onClick={enviar}
          sx={{ bgcolor: EAM_COLOR, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: EAM_DARK } }}
        >
          {guardando ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Crear Garantía'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Documentos de una garantía: listar, descargar, subir y retirar.

   Antes solo se podía escribir el nombre del documento; el archivo había que
   subirlo en otra parte y nadie lo encontraba al momento de reclamar.
   ═══════════════════════════════════════════════════════════════════════════ */

function AdjuntosGarantia({ garantiaId }: { garantiaId: number }) {
  const qc = useQueryClient()
  const clave = ['eam-garantia-adjuntos', garantiaId]
  const { data: adjuntos = [], isLoading } = useQuery({ queryKey: clave, queryFn: () => adjuntosGarantiaApi.listar(garantiaId) })
  const [error, setError] = useState('')
  const subir = useMutation({
    mutationFn: (archivos: File[]) => adjuntosGarantiaApi.subir(garantiaId, archivos),
    onSuccess: () => { setError(''); qc.invalidateQueries({ queryKey: clave }) },
    onError: e => setError(mensajeDeError(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => adjuntosGarantiaApi.borrar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clave }),
    onError: e => setError(mensajeDeError(e)),
  })
  return (
    <Box>
      {isLoading && <LinearProgress />}
      {!isLoading && adjuntos.length === 0 && <Typography fontSize={12} color="#94A3B8">Sin documentos adjuntos.</Typography>}
      {adjuntos.map(a => (
        <Stack key={a.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.25 }}>
          <FileIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
          <Typography fontSize={12} sx={{ flex: 1, color: '#334155', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => adjuntosGarantiaApi.descargar(a).catch(e => setError(mensajeDeError(e)))}>
            {a.nombre}
          </Typography>
          <Typography fontSize={11} color="#94A3B8">{a.tamano ? `${Math.ceil(a.tamano / 1024)} KB` : ''}</Typography>
          <IconButton size="small" aria-label={`Descargar ${a.nombre}`} onClick={() => adjuntosGarantiaApi.descargar(a).catch(e => setError(mensajeDeError(e)))}>
            <DownloadIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" aria-label={`Retirar ${a.nombre}`}
            onClick={() => { if (window.confirm(`¿Retirar «${a.nombre}»?`)) borrar.mutate(a.id) }}>
            <CloseIcon sx={{ fontSize: 14, color: '#EF4444' }} />
          </IconButton>
        </Stack>
      ))}
      <Button component="label" size="small" startIcon={<FileIcon />} disabled={subir.isPending}
        sx={{ mt: 0.5, textTransform: 'none', color: EAM_COLOR }}>
        {subir.isPending ? 'Subiendo…' : 'Subir documentos'}
        <input hidden type="file" multiple aria-label="Subir documentos de la garantía"
          onChange={e => { const n = Array.from(e.target.files ?? []); if (n.length) subir.mutate(n); e.target.value = '' }} />
      </Button>
      {error && <Typography fontSize={12} color="error">{error}</Typography>}
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Alta y edición de una reclamación.

   Lo que antes hacía el botón «Registrar Reclamación»: inventaba la
   descripción, ponía el valor completo de la garantía como monto y lo guardaba
   sin preguntar nada. Un reclamo es la historia de una plata que se pidió, así
   que hay que escribirla.
   ═══════════════════════════════════════════════════════════════════════════ */

function DialogoReclamo({
  valor, garantias, responsables, guardando, inputSx, paperSx, onCerrar, onGuardar,
}: {
  valor: Partial<Reclamacion>
  garantias: Garantia[]
  responsables: string[]
  guardando: boolean
  inputSx: object
  paperSx: object
  onCerrar: () => void
  onGuardar: (d: Partial<Reclamacion>) => void
}) {
  const [f, setF] = useState<Partial<Reclamacion>>(valor)
  const [intento, setIntento] = useState(false)
  const set = <K extends keyof Reclamacion>(k: K, v: Reclamacion[K]) => setF(p => ({ ...p, [k]: v }))
  const edicion = !!valor.id

  const falta = {
    garantia_id: !f.garantia_id,
    descripcion: !String(f.descripcion ?? '').trim(),
    fecha: !f.fecha,
  }
  const valido = !Object.values(falta).some(Boolean)
  const cerrado = f.estado !== 'EN_PROCESO'

  const enviar = () => {
    if (!valido) { setIntento(true); return }
    onGuardar(f)
  }

  const garantia = garantias.find(g => g.id === f.garantia_id)

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth scroll="paper" PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, color: '#1E293B' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(EAM_COLOR, 0.15), color: EAM_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReclamoIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="#1E293B" lineHeight={1.2}>
              {edicion ? 'Editar reclamación' : 'Nueva reclamación'}
            </Typography>
            <Typography fontSize={12} color="#64748B">
              {garantia
                ? `Sobre ${garantia.numero_garantia ?? garantia.descripcion}`
                : 'Al amparo de una garantía'}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onCerrar} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
        <Stack spacing={1.75} mt={0.5}>
          <TextField
            select fullWidth size="small" label="Garantía *"
            value={f.garantia_id ?? ''}
            onChange={e => set('garantia_id', Number(e.target.value))}
            error={intento && falta.garantia_id}
            helperText={intento && falta.garantia_id ? 'Elija la garantía que se reclama' : ' '}
            disabled={edicion}
            sx={inputSx}
          >
            <MenuItem value=""><em>Seleccionar…</em></MenuItem>
            {garantias.map(g => (
              <MenuItem key={g.id} value={g.id}>
                {g.numero_garantia ?? `#${g.id}`} · {g.descripcion}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth size="small" label="Qué se reclama *" multiline rows={3}
            value={f.descripcion ?? ''}
            onChange={e => set('descripcion', e.target.value)}
            error={intento && falta.descripcion}
            helperText={intento && falta.descripcion
              ? 'Describa la falla o el incumplimiento'
              : 'La falla concreta, no «reclamo sobre la garantía»'}
            sx={inputSx}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" type="date" label="Fecha del reclamo *"
              InputLabelProps={{ shrink: true }}
              value={f.fecha ?? ''}
              onChange={e => set('fecha', e.target.value)}
              error={intento && falta.fecha}
              helperText={intento && falta.fecha ? 'Indique la fecha' : ' '}
              sx={inputSx}
            />
            <TextField
              select fullWidth size="small" label="Estado"
              value={f.estado ?? 'EN_PROCESO'}
              onChange={e => set('estado', e.target.value as EstadoReclamo)}
              helperText={cerrado ? 'Al cerrarlo se fija la fecha de cierre' : 'Los días de gestión siguen contando'}
              sx={inputSx}
            >
              {(['EN_PROCESO', 'APROBADA', 'RECHAZADA', 'CERRADA'] as EstadoReclamo[]).map(o => (
                <MenuItem key={o} value={o}>{ETIQUETA_RECLAMO[o]}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth size="small" type="number" label="Monto solicitado"
              value={f.monto_solicitado ?? ''}
              onChange={e => set('monto_solicitado', e.target.value === '' ? null : Number(e.target.value))}
              helperText="Lo que se le pide al proveedor" sx={inputSx}
              inputProps={{ min: 0 }}
            />
            <TextField
              fullWidth size="small" type="number" label="Monto recuperado"
              value={f.monto_recuperado ?? ''}
              onChange={e => set('monto_recuperado', e.target.value === '' ? null : Number(e.target.value))}
              helperText="Lo que efectivamente entró" sx={inputSx}
              inputProps={{ min: 0 }}
            />
          </Stack>

          <Autocomplete
            freeSolo
            options={responsables}
            inputValue={f.responsable ?? ''}
            onInputChange={(_e, v) => set('responsable', v)}
            onChange={(_e, v) => { if (typeof v === 'string') set('responsable', v) }}
            renderInput={p => (
              <TextField {...p} size="small" label="Responsable de la gestión" sx={inputSx} />
            )}
          />

          <TextField
            fullWidth size="small" label="Resolución" multiline rows={3}
            value={f.resolucion ?? ''}
            onChange={e => set('resolucion', e.target.value)}
            placeholder="Qué respondió el proveedor y en qué quedó"
            sx={inputSx}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} sx={{ color: '#64748B', textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={guardando}
          onClick={enviar}
          sx={{ bgcolor: EAM_COLOR, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: EAM_DARK } }}
        >
          {guardando ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Registrar reclamación'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
