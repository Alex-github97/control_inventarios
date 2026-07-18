import { useState, useMemo } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip, Card, CardContent, Alert, TextField, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Stack, Tooltip, alpha,
  Switch, FormControlLabel, Badge, Divider, Menu, ListItemIcon, ListItemText,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TireRepair, Inventory2, Recycling, Add as AddIcon, Close as CloseIcon,
  History as HistoryIcon, SwapHoriz as SwapIcon, Warehouse as WarehouseIcon,
  DeleteForever, DirectionsCar, ShowChart, TrendingUp, NotificationsActive,
  Autorenew, Download, Straighten, Compress,
} from '@mui/icons-material'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Legend,
} from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'

const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Vehiculo { id: number; codigo: string; nombre: string; placa?: string; numero_ejes?: number | null; tiene_repuesto?: boolean; marca?: string; modelo?: string; tipo_activo?: string; odometro_actual?: number; motor_marca?: string; motor_linea?: string; motor_cc?: number }
interface Neumatico {
  id: number; codigo: string; marca?: string; referencia?: string; medida?: string; tipo?: string
  estado: string; activo_id?: number | null; posicion?: string | null; bodega_id?: number | null
  dano_id?: number | null; motivo_baja?: string | null; fecha_baja?: string | null
  km_actual: number; km_total: number; profundidad_actual?: number | null; profundidad_diseño?: number | null
  reencauches: number; costo?: number | null; proveedor?: string | null
  tipo_uso?: string | null; presion_actual?: number | null; presion_recomendada?: number | null; vida_util_km?: number | null; km_inicio?: number
  orientacion?: string | null; profundidad_externa?: number | null; profundidad_interna?: number | null
}
interface Bodega { id: number; codigo: string; nombre: string; ubicacion?: string }
interface Dano { id: number; codigo: string; nombre: string; severidad: string; accion: string }
interface Posicion { codigo: string; label: string; eje: number; lado: string }
interface CatItem { id: number; tipo: string; nombre: string; valor?: number | null }
interface Movimiento { id: number; tipo_movimiento: string; posicion_origen?: string | null; posicion?: string | null; bodega_id?: number | null; km_odometro?: number | null; fecha?: string | null; tecnico?: string | null; observaciones?: string | null }
interface Inspeccion { id: number; neumatico_id: number; fecha: string; profundidad_izq?: number | null; profundidad_centro?: number | null; profundidad_der?: number | null; profundidad_min?: number | null; presion_psi?: number | null; km_odometro?: number | null; estado_visual?: string | null; observaciones?: string | null; tecnico?: string | null }
interface Indicador { neumatico_id: number; codigo: string; marca?: string; medida?: string; estado?: string; posicion?: string | null; km_total: number; costo?: number | null; cpk?: number | null; costo_mm?: number | null; mm_gastados?: number | null; vida_util_km?: number | null; km_proyectado?: number | null; pct_desgaste?: number | null }
interface AlertaNeu { neumatico_id: number; codigo: string; tipo: string; severidad: string; mensaje: string; posicion?: string | null; activo_id?: number | null }
interface LoteReencauche { id: number; codigo: string; fecha_envio: string; proveedor?: string | null; remision?: string | null; observaciones?: string | null; estado: string }
interface DetalleReencauche { id: number; lote_id: number; neumatico_id: number; banda?: string | null; resultado: string; profundidad_nueva?: number | null; vida_remanente_km?: number | null; costo?: number | null }
interface ConfigNeu { montaje_estricto: boolean; profundidad_minima: number; presion_min: number; presion_max: number; umbral_desalineacion: number }

const TIPOS_USO = ['DIRECCIONAL', 'TRACCION', 'REMOLQUE', 'MULTIPOSICION', 'REPUESTO']
const EMPTY_NEUMATICO = { codigo: '', marca: '', referencia: '', medida: '', tipo: '', tipo_uso: '', bodega_id: '', costo: '', proveedor: '', profundidad_diseño: '', profundidad_actual: '', vida_util_km: '', presion_recomendada: '' }

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
  const [slotMenu, setSlotMenu] = useState<null | { anchor: HTMLElement; tire: Neumatico; pos: string }>(null)
  const [movDialog, setMovDialog] = useState<null | { tire: Neumatico; tipo: string; posicion?: string }>(null)
  const [movForm, setMovForm] = useState({ fecha: nowLocal(), km_odometro: '', bodega_id: '', tecnico: '', observaciones: '' })
  const [bajaDialog, setBajaDialog] = useState<Neumatico | null>(null)
  const [bajaForm, setBajaForm] = useState({ fecha: nowLocal(), dano_id: '', motivo: '' })
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ ...EMPTY_NEUMATICO })
  const [histTire, setHistTire] = useState<Neumatico | null>(null)
  const [ejesOpen, setEjesOpen] = useState(false)
  const [ejesForm, setEjesForm] = useState({ numero_ejes: '2', tiene_repuesto: true })
  // Inspecciones (por vehículo)
  const [inspVehId, setInspVehId] = useState<string>('')
  const [inspDialog, setInspDialog] = useState<Neumatico | null>(null)   // llanta a inspeccionar
  const [chartTire, setChartTire] = useState<Neumatico | null>(null)     // llanta cuya gráfica/historial se ve
  const [rotDialog, setRotDialog] = useState<Neumatico | null>(null)     // llanta a intercambiar (rotación)
  const [rotTarget, setRotTarget] = useState<string>('')                 // llanta destino del intercambio
  const [voltearDialog, setVoltearDialog] = useState<Neumatico | null>(null)
  const EMPTY_INSP = { fecha: nowLocal(), profundidad_izq: '', profundidad_centro: '', profundidad_der: '', presion_psi: '', km_odometro: '', estado_visual: 'BUENO', tecnico: '', observaciones: '' }
  const [inspForm, setInspForm] = useState({ ...EMPTY_INSP })
  // Consultas
  const [consVeh, setConsVeh] = useState('')
  const [consUbic, setConsUbic] = useState('')
  const [consEstado, setConsEstado] = useState('')
  const [consBusca, setConsBusca] = useState('')
  // Reencauche
  const [selLote, setSelLote] = useState<number | null>(null)
  const [loteOpen, setLoteOpen] = useState(false)
  const [loteForm, setLoteForm] = useState({ codigo: '', fecha_envio: new Date().toISOString().slice(0, 10), proveedor: '', remision: '', observaciones: '' })
  const [addTireLote, setAddTireLote] = useState('')
  const [procDialog, setProcDialog] = useState<null | DetalleReencauche>(null)
  const [procForm, setProcForm] = useState({ resultado: 'REENCAUCHADA', profundidad_nueva: '', vida_remanente_km: '', costo: '', dano_id: '' })
  // Configuración global
  const EMPTY_CFG: ConfigNeu = { montaje_estricto: true, profundidad_minima: 3, presion_min: 90, presion_max: 120, umbral_desalineacion: 2 }
  const [cfgForm, setCfgForm] = useState<ConfigNeu>({ ...EMPTY_CFG })

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['eam-activos'], queryFn: () => api.get('/eam/activos').then(r => r.data) })
  const { data: neumaticos = [] } = useQuery<Neumatico[]>({ queryKey: ['eam-neumaticos'], queryFn: () => api.get('/eam/neumaticos').then(r => r.data) })
  const { data: bodegas = [] } = useQuery<Bodega[]>({ queryKey: ['eam-bodegas-neu'], queryFn: () => api.get('/eam/neumaticos/bodegas').then(r => r.data) })
  const { data: danos = [] } = useQuery<Dano[]>({ queryKey: ['eam-danos-neu'], queryFn: () => api.get('/eam/neumaticos/danos-catalogo').then(r => r.data) })
  const { data: catalogo = [] } = useQuery<CatItem[]>({ queryKey: ['eam-cat-neu'], queryFn: () => api.get('/eam/neumaticos/catalogo').then(r => r.data) })
  const cat = (t: string) => catalogo.filter(c => c.tipo === t)
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
  const { data: inspLayout = [] } = useQuery<Posicion[]>({
    queryKey: ['eam-layout', inspVehId],
    queryFn: () => api.get(`/eam/neumaticos/layout/${inspVehId}`).then(r => r.data),
    enabled: !!inspVehId,
  })
  const { data: inspecciones = [] } = useQuery<Inspeccion[]>({
    queryKey: ['eam-insp', chartTire?.id],
    queryFn: () => api.get(`/eam/neumaticos/${chartTire!.id}/inspecciones`).then(r => r.data),
    enabled: !!chartTire,
  })
  const { data: indicadores = [] } = useQuery<Indicador[]>({ queryKey: ['eam-indic'], queryFn: () => api.get('/eam/neumaticos/indicadores').then(r => r.data) })
  const { data: alertas = [] } = useQuery<AlertaNeu[]>({ queryKey: ['eam-alertas'], queryFn: () => api.get('/eam/neumaticos/alertas').then(r => r.data) })
  const { data: lotes = [] } = useQuery<LoteReencauche[]>({ queryKey: ['eam-reencauche'], queryFn: () => api.get('/eam/neumaticos/reencauche').then(r => r.data) })
  const { data: loteDetalle = [] } = useQuery<DetalleReencauche[]>({
    queryKey: ['eam-reencauche-det', selLote],
    queryFn: () => api.get(`/eam/neumaticos/reencauche/${selLote}/detalle`).then(r => r.data),
    enabled: !!selLote,
  })
  useQuery<ConfigNeu>({
    queryKey: ['eam-cfg-neu'],
    queryFn: async () => { const r = await api.get('/eam/neumaticos/config'); setCfgForm(r.data); return r.data },
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
  const mutEjes = useMutation({
    mutationFn: (body: { numero_ejes: number; tiene_repuesto: boolean }) => api.put(`/eam/neumaticos/config-ejes/${vehId}`, body),
    onSuccess: () => { toast.success('Ejes configurados'); qc.invalidateQueries({ queryKey: ['eam-activos'] }); qc.invalidateQueries({ queryKey: ['eam-layout'] }); setEjesOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al configurar ejes'),
  })
  const abrirEjes = () => { setEjesForm({ numero_ejes: String(veh?.numero_ejes ?? 2), tiene_repuesto: veh?.tiene_repuesto ?? true }); setEjesOpen(true) }

  // Config: bodegas y catálogo de daños
  const [bodForm, setBodForm] = useState({ codigo: '', nombre: '', ubicacion: '' })
  const [danoForm, setDanoForm] = useState({ codigo: '', nombre: '', severidad: 'MODERADO', accion: 'INSPECCION' })
  const mutBodega = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/bodegas', b),
    onSuccess: () => { toast.success('Bodega creada'); qc.invalidateQueries({ queryKey: ['eam-bodegas-neu'] }); setBodForm({ codigo: '', nombre: '', ubicacion: '' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear bodega'),
  })
  const mutBodegaDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/bodegas/${id}`),
    onSuccess: () => { toast.success('Bodega eliminada'); qc.invalidateQueries({ queryKey: ['eam-bodegas-neu'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar'),
  })
  const mutDano = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post('/eam/neumaticos/danos-catalogo', d),
    onSuccess: () => { toast.success('Daño creado'); qc.invalidateQueries({ queryKey: ['eam-danos-neu'] }); setDanoForm({ codigo: '', nombre: '', severidad: 'MODERADO', accion: 'INSPECCION' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear daño'),
  })
  const mutDanoDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/danos-catalogo/${id}`),
    onSuccess: () => { toast.success('Daño eliminado'); qc.invalidateQueries({ queryKey: ['eam-danos-neu'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar'),
  })
  const [catForm, setCatForm] = useState({ tipo: 'MARCA', nombre: '', valor: '' })
  const mutCat = useMutation({
    mutationFn: (c: Record<string, unknown>) => api.post('/eam/neumaticos/catalogo', c),
    onSuccess: () => { toast.success('Opción agregada'); qc.invalidateQueries({ queryKey: ['eam-cat-neu'] }); setCatForm(f => ({ ...f, nombre: '', valor: '' })) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al agregar'),
  })
  const mutCatDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/catalogo/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eam-cat-neu'] }) },
    onError: () => toast.error('No se pudo eliminar'),
  })
  const invalidarNeu = () => {
    qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
    qc.invalidateQueries({ queryKey: ['eam-indic'] })
    qc.invalidateQueries({ queryKey: ['eam-alertas'] })
  }
  // Inspecciones
  const mutInsp = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/eam/neumaticos/${inspDialog!.id}/inspecciones`, body),
    onSuccess: () => { toast.success('Inspección registrada'); qc.invalidateQueries({ queryKey: ['eam-insp'] }); invalidarNeu(); setInspDialog(null); setInspForm({ ...EMPTY_INSP }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar inspección'),
  })
  // Voltear (invertir interna↔externa en la misma posición)
  const mutVoltear = useMutation({
    mutationFn: (nid: number) => api.post('/eam/neumaticos/movimiento', { neumatico_id: nid, tipo_movimiento: 'VOLTEO', fecha: new Date().toISOString() }),
    onSuccess: () => { toast.success('Llanta volteada · hombros interno/externo invertidos'); invalidarNeu(); qc.invalidateQueries({ queryKey: ['eam-mov'] }); setVoltearDialog(null) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo voltear'),
  })
  // Rotación por intercambio de posiciones entre dos llantas
  const mutIntercambio = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos/rotacion-intercambio', body),
    onSuccess: () => { toast.success('Rotación realizada · posiciones intercambiadas'); invalidarNeu(); qc.invalidateQueries({ queryKey: ['eam-mov'] }); setRotDialog(null); setRotTarget('') },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo rotar'),
  })
  // Configuración global
  const mutCfg = useMutation({
    mutationFn: (body: ConfigNeu) => api.put('/eam/neumaticos/config', body),
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries({ queryKey: ['eam-cfg-neu'] }); qc.invalidateQueries({ queryKey: ['eam-alertas'] }) },
    onError: () => toast.error('No se pudo guardar la configuración'),
  })
  // Reencauche
  const mutLote = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos/reencauche', body),
    onSuccess: (r: any) => { toast.success('Lote creado'); qc.invalidateQueries({ queryKey: ['eam-reencauche'] }); setLoteOpen(false); setSelLote(r.data.id); setLoteForm({ codigo: '', fecha_envio: new Date().toISOString().slice(0, 10), proveedor: '', remision: '', observaciones: '' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear lote'),
  })
  const mutAddDet = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/eam/neumaticos/reencauche/${selLote}/detalle`, body),
    onSuccess: () => { toast.success('Llanta agregada al lote'); qc.invalidateQueries({ queryKey: ['eam-reencauche-det'] }); invalidarNeu(); setAddTireLote('') },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo agregar'),
  })
  const mutProc = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put(`/eam/neumaticos/reencauche/detalle/${procDialog!.id}`, body),
    onSuccess: () => { toast.success('Resultado registrado'); qc.invalidateQueries({ queryKey: ['eam-reencauche-det'] }); invalidarNeu(); setProcDialog(null) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al procesar'),
  })
  const mutCerrarLote = useMutation({
    mutationFn: (id: number) => api.put(`/eam/neumaticos/reencauche/${id}/cerrar`),
    onSuccess: () => { toast.success('Lote cerrado'); qc.invalidateQueries({ queryKey: ['eam-reencauche'] }) },
    onError: () => toast.error('No se pudo cerrar el lote'),
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
  // Rueda del diagrama: neumático visto de lado (arrastrable, tooltip con detalle,
  // clic abre historial, y es zona de drop para instalar/rotar).
  const Slot = ({ pos }: { pos: Posicion }) => {
    const t = tireEn(pos.codigo)
    const activo = overSlot === pos.codigo
    const bajo = t?.profundidad_actual != null && t.profundidad_actual <= cfgForm.profundidad_minima
    const invertida = t?.orientacion === 'INVERTIDA'
    return (
      <Tooltip arrow title={t
        ? `${t.codigo} · ${t.marca ?? ''} ${t.medida ?? ''}${t.profundidad_actual != null ? ` · ${t.profundidad_actual}mm` : ''}${t.reencauches ? ` · R${t.reencauches}` : ''}${invertida ? ' · ⇅ invertida' : ''} — ${pos.label} · clic para acciones`
        : `${pos.label} · vacío`}>
        <Box
          draggable={!!t}
          onDragStart={() => { if (t) setDraggedTire(t) }}
          onDragEnd={() => setDraggedTire(null)}
          onClick={(e) => { if (t) setSlotMenu({ anchor: e.currentTarget, tire: t, pos: pos.codigo }) }}
          onDragOver={(e) => { e.preventDefault(); setOverSlot(pos.codigo) }}
          onDragLeave={() => setOverSlot('')}
          onDrop={() => soltarEnPosicion(pos.codigo)}
          sx={{
            position: 'relative',
            width: 44, height: 66, borderRadius: '11px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: t ? 'pointer' : 'default', '&:active': { cursor: t ? 'grabbing' : 'default' },
            border: '2px solid', borderColor: activo ? EAM_COLOR : bajo ? '#DC2626' : t ? '#0F172A' : '#CBD5E1',
            bgcolor: activo ? alpha(EAM_COLOR, 0.18) : t ? '#1F2937' : '#F1F5F9',
            color: t ? '#fff' : 'text.disabled',
            boxShadow: t ? `inset 0 0 0 4px ${bajo ? '#7F1D1D' : '#0F172A'}, 0 1px 3px rgba(0,0,0,.25)` : 'none',
            transition: 'all .12s',
          }}
        >
          {invertida && <Box sx={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', bgcolor: '#7C3AED', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,.4)' }}>⇅</Box>}
          {t ? (
            <>
              <TireRepair sx={{ fontSize: 15, color: bajo ? '#FCA5A5' : '#CBD5E1' }} />
              <Typography fontSize={7.5} fontWeight={700} sx={{ mt: 0.2, lineHeight: 1, textAlign: 'center', px: 0.25, maxWidth: 40 }} noWrap>{t.codigo}</Typography>
              {t.profundidad_actual != null && <Typography fontSize={7} fontWeight={700} sx={{ color: bajo ? '#FCA5A5' : '#94A3B8', lineHeight: 1 }}>{t.profundidad_actual}mm</Typography>}
            </>
          ) : <Typography fontSize={18} fontWeight={300} color="text.disabled">+</Typography>}
        </Box>
      </Tooltip>
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

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: '1px solid #E5E7EB', '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { bgcolor: EAM_COLOR } }}>
          <Tab icon={<DirectionsCar sx={{ fontSize: 18 }} />} iconPosition="start" label="Vehículo / Diagrama" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Bodega (${almacen.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<ShowChart sx={{ fontSize: 18 }} />} iconPosition="start" label="Inspecciones" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<TrendingUp sx={{ fontSize: 18 }} />} iconPosition="start" label="Indicadores / CPK" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Badge badgeContent={alertas.length} color="error"><NotificationsActive sx={{ fontSize: 18 }} /></Badge>} iconPosition="start" label="Alertas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Autorenew sx={{ fontSize: 18 }} />} iconPosition="start" label="Reencauche" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Inventory2 sx={{ fontSize: 18 }} />} iconPosition="start" label="Consultas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Recycling sx={{ fontSize: 18 }} />} iconPosition="start" label={`Descarte (${descarte.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Configuración" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {/* ── TAB 0: Diagrama del vehículo ── */}
        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" gap={1} alignItems="center" mb={2} flexWrap="wrap">
                    <TextField select size="small" label="Vehículo" value={vehId} onChange={e => setVehId(e.target.value)} sx={{ minWidth: 320 }}>
                      <MenuItem value="">Seleccionar vehículo…</MenuItem>
                      {vehiculos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.codigo} — {v.nombre}{v.placa ? ` (${v.placa})` : ''}</MenuItem>)}
                    </TextField>
                    {veh && (
                      <Button size="small" variant="outlined" startIcon={<SwapIcon />} onClick={abrirEjes} sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), textTransform: 'none' }}>
                        Configurar ejes{veh.numero_ejes ? ` (${veh.numero_ejes})` : ''}
                      </Button>
                    )}
                  </Stack>

                  {!veh ? (
                    <Alert severity="info">Selecciona un vehículo para ver el diagrama de llantas.</Alert>
                  ) : !veh.numero_ejes ? (
                    <Alert severity="warning">El vehículo <b>{veh.codigo}</b> no tiene configurado el número de ejes. Configúralo en <b>Activos / EAM</b> para generar el diagrama de posiciones.</Alert>
                  ) : (
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={1.5}>
                        {veh.numero_ejes} eje(s) · arrastra una llanta desde la bodega (derecha) a una rueda, o entre ruedas para rotar. La rueda oscura = instalada; clic para ver su historial.
                      </Typography>
                      {/* Diagrama tipo camión (vista superior) */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E5E7EB' }}>
                        {/* Cabina / frente */}
                        <Box sx={{ width: 130, height: 44, bgcolor: alpha(EAM_COLOR, 0.14), border: `2px solid ${EAM_COLOR}`, borderRadius: '16px 16px 6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                          <Typography fontSize={10} fontWeight={800} color={EAM_DARK} letterSpacing="0.06em">FRENTE / CABINA</Typography>
                        </Box>
                        {/* Chasis + ejes */}
                        <Box sx={{ position: 'relative', px: 2 }}>
                          <Box sx={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: 16, transform: 'translateX(-50%)', bgcolor: '#94A3B8', borderRadius: 2, zIndex: 0 }} />
                          <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1, py: 1 }}>
                            {ejes.map(([eje, posics]) => {
                              const izq = posics.filter(p => p.lado === 'IZQ')
                              const der = posics.filter(p => p.lado === 'DER')
                              return (
                                <Box key={eje} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                                  <Typography fontSize={9} fontWeight={700} color="text.secondary" sx={{ width: 74, textAlign: 'right' }}>Eje {eje}{eje === 1 ? ' · dir.' : ''}</Typography>
                                  <Stack direction="row" gap={0.5}>{izq.map(p => <Slot key={p.codigo} pos={p} />)}</Stack>
                                  <Box sx={{ width: 96, height: 8, bgcolor: '#64748B', borderRadius: 2 }} />
                                  <Stack direction="row" gap={0.5}>{der.map(p => <Slot key={p.codigo} pos={p} />)}</Stack>
                                  <Box sx={{ width: 74 }} />
                                </Box>
                              )
                            })}
                          </Stack>
                        </Box>
                        {/* Repuesto */}
                        {repuesto && (
                          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontSize={9} fontWeight={700} color="text.secondary">REPUESTO</Typography>
                            <Slot pos={repuesto} />
                          </Box>
                        )}
                      </Box>
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

        {/* ── TAB 2: Inspecciones por vehículo (esquema + llanta por llanta) ── */}
        {tab === 2 && (() => {
          const inspVeh = vehiculos.find(v => String(v.id) === inspVehId)
          const tireEnInsp = (pos: string) => neumaticos.find(n => n.activo_id === inspVeh?.id && n.posicion === pos)
          return (
            <Card sx={{ bgcolor: '#FFFFFF' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
                  <Straighten sx={{ color: EAM_DARK }} />
                  <Typography fontWeight={700}>Inspección por vehículo</Typography>
                  <TextField select size="small" label="Vehículo" value={inspVehId} onChange={e => setInspVehId(e.target.value)} sx={{ minWidth: 320 }}>
                    <MenuItem value="">Seleccionar vehículo…</MenuItem>
                    {vehiculos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.codigo}{v.placa ? ` · ${v.placa}` : ''} — {v.nombre}</MenuItem>)}
                  </TextField>
                </Stack>

                {!inspVeh ? (
                  <Alert severity="info">Seleccione un vehículo para ver sus llantas montadas e inspeccionarlas una a una.</Alert>
                ) : (
                  <>
                    {/* Ficha del vehículo */}
                    <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 2, mb: 2 }}>
                      <Grid container spacing={2}>
                        {[
                          ['Vehículo', `${inspVeh.codigo}${inspVeh.placa ? ` · ${inspVeh.placa}` : ''}`],
                          ['Marca', inspVeh.marca ?? '—'],
                          ['Tipo', inspVeh.tipo_activo ?? '—'],
                          ['Motor', inspVeh.motor_marca ? `${inspVeh.motor_marca}${inspVeh.motor_linea ? ` ${inspVeh.motor_linea}` : ''}${inspVeh.motor_cc ? ` (${inspVeh.motor_cc.toLocaleString('es-CO')}cc)` : ''}` : '—'],
                          ['Odómetro', inspVeh.odometro_actual != null ? `${inspVeh.odometro_actual.toLocaleString('es-CO')} km` : '—'],
                          ['Ejes', `${inspVeh.numero_ejes ?? '—'}`],
                        ].map(([l, v]) => (
                          <Grid key={l} size={{ xs: 6, sm: 4, md: 2 }}>
                            <Typography fontSize={10.5} fontWeight={700} color="#94A3B8" textTransform="uppercase">{l}</Typography>
                            <Typography fontSize={13} fontWeight={600} color="#1E293B">{v}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>

                    {/* Tabla de posiciones montadas */}
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead><TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                          {['Pos.', 'Código', 'Llanta', 'Uso', 'Vida (R)', 'Prof. actual (mm)', 'Ext / Int (mm)', 'Presión (psi)', 'Km recorridos', 'Acciones'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                        </TableRow></TableHead>
                        <TableBody>
                          {inspLayout.map(p => {
                            const t = tireEnInsp(p.codigo)
                            const cfg = cfgForm
                            const bajo = t?.profundidad_actual != null && t.profundidad_actual <= cfg.profundidad_minima
                            const dualPos = /-(INT|EXT)$/.test(p.codigo)   // posición dual (permite volteo)
                            return (
                              <TableRow key={p.codigo} hover>
                                <TableCell><Chip size="small" label={p.label} sx={{ fontSize: 10 }} /></TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                  {t?.codigo ?? '—'}
                                  {t?.orientacion === 'INVERTIDA' && <Tooltip title="Montaje invertido (volteada)"><Chip size="small" label="⇅" sx={{ ml: 0.5, height: 16, fontSize: 10, bgcolor: alpha('#7C3AED', 0.12), color: '#7C3AED' }} /></Tooltip>}
                                </TableCell>
                                <TableCell>{t ? `${t.marca ?? ''} ${t.medida ?? ''}`.trim() || '—' : <Typography fontSize={12} color="text.secondary">Vacía</Typography>}</TableCell>
                                <TableCell>{t?.tipo_uso ?? t?.tipo ?? '—'}</TableCell>
                                <TableCell>{t ? (t.reencauches ? `R${t.reencauches}` : 'VN') : '—'}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: bajo ? '#DC2626' : 'inherit' }}>{t?.profundidad_actual ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{t?.profundidad_externa != null || t?.profundidad_interna != null ? `${t?.profundidad_externa ?? '–'} / ${t?.profundidad_interna ?? '–'}` : '—'}</TableCell>
                                <TableCell>{t?.presion_actual ?? '—'}</TableCell>
                                <TableCell>{t?.km_total != null ? t.km_total.toLocaleString('es-CO') : '—'}</TableCell>
                                <TableCell>
                                  {t && (
                                    <Stack direction="row" gap={0.25}>
                                      <Tooltip title="Crear inspección"><IconButton size="small" onClick={() => { setInspForm({ ...EMPTY_INSP, km_odometro: inspVeh.odometro_actual != null ? String(inspVeh.odometro_actual) : '' }); setInspDialog(t) }} sx={{ color: EAM_COLOR }}><Straighten sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                      <Tooltip title="Rotar (intercambiar posición)"><IconButton size="small" onClick={() => { setRotTarget(''); setRotDialog(t) }} sx={{ color: '#D97706' }}><SwapIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                      <Tooltip title={dualPos ? 'Voltear (invertir interno↔externo)' : 'El volteo aplica a llantas duales'}><span><IconButton size="small" disabled={!dualPos} onClick={() => setVoltearDialog(t)} sx={{ color: '#7C3AED' }}><Autorenew sx={{ fontSize: 17 }} /></IconButton></span></Tooltip>
                                      <Tooltip title="Gráfica / historial"><IconButton size="small" onClick={() => setChartTire(t)} sx={{ color: '#2563EB' }}><ShowChart sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                    </Stack>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {inspLayout.length === 0 && <TableRow><TableCell colSpan={10} align="center"><Typography color="text.secondary" py={2}>Configure el número de ejes del vehículo en la pestaña Vehículo / Diagrama.</Typography></TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })()}

        {/* ── TAB 3: Indicadores / CPK ── */}
        {tab === 3 && (
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <TrendingUp sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Costo por km (CPK), costo por mm y proyección de vida</Typography>
                </Stack>
                <Stack direction="row" gap={1}>
                  <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportarPDF({ archivo: 'indicadores-llantas', titulo: 'Indicadores de neumáticos', color: EAM_COLOR, columnas: [{ key: 'codigo', header: 'Código' }, { key: 'marca', header: 'Marca' }, { key: 'medida', header: 'Medida' }, { key: 'km_total', header: 'Km' }, { key: 'cpk', header: 'CPK' }, { key: 'costo_mm', header: 'Costo/mm' }, { key: 'pct_desgaste', header: '% desgaste' }, { key: 'km_proyectado', header: 'Km proy.' }], filas: indicadores })} sx={{ textTransform: 'none' }}>PDF</Button>
                  <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportarExcel({ archivo: 'indicadores-llantas', titulo: 'Indicadores de neumáticos', filas: indicadores })} sx={{ textTransform: 'none' }}>Excel</Button>
                </Stack>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                    {['Código', 'Marca', 'Medida', 'Estado', 'Pos.', 'Km total', 'Costo', 'CPK', 'Costo/mm', 'mm gast.', '% desgaste', 'Km proy.'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                  </TableRow></TableHead>
                  <TableBody>
                    {indicadores.map(x => (
                      <TableRow key={x.neumatico_id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{x.codigo}</TableCell>
                        <TableCell>{x.marca ?? '—'}</TableCell>
                        <TableCell>{x.medida ?? '—'}</TableCell>
                        <TableCell><Chip size="small" label={x.estado} color={ESTADO_COLOR[x.estado ?? ''] ?? 'default'} /></TableCell>
                        <TableCell>{x.posicion ?? '—'}</TableCell>
                        <TableCell>{x.km_total?.toLocaleString('es-CO')}</TableCell>
                        <TableCell>{x.costo ? `$${x.costo.toLocaleString('es-CO')}` : '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: EAM_DARK }}>{x.cpk != null ? `$${x.cpk.toLocaleString('es-CO')}` : '—'}</TableCell>
                        <TableCell>{x.costo_mm != null ? `$${x.costo_mm.toLocaleString('es-CO')}` : '—'}</TableCell>
                        <TableCell>{x.mm_gastados ?? '—'}</TableCell>
                        <TableCell>
                          {x.pct_desgaste != null ? (
                            <Chip size="small" label={`${x.pct_desgaste}%`} color={x.pct_desgaste >= 90 ? 'error' : x.pct_desgaste >= 70 ? 'warning' : 'success'} />
                          ) : '—'}
                        </TableCell>
                        <TableCell>{x.km_proyectado != null ? x.km_proyectado.toLocaleString('es-CO') : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {indicadores.length === 0 && <TableRow><TableCell colSpan={12} align="center"><Typography color="text.secondary" py={2}>Sin datos. Registre inspecciones y costos para calcular indicadores.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── TAB 4: Alertas ── */}
        {tab === 4 && (
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                <NotificationsActive sx={{ color: '#DC2626' }} /><Typography fontWeight={700}>Alertas activas ({alertas.length})</Typography>
              </Stack>
              {alertas.length === 0 ? (
                <Alert severity="success">Sin alertas. Todas las llantas están dentro de los umbrales configurados.</Alert>
              ) : (
                <Stack spacing={1}>
                  {alertas.map((a, i) => (
                    <Alert key={i} severity={a.severidad === 'ALTA' ? 'error' : 'warning'} icon={a.tipo === 'PRESION' ? <Compress /> : a.tipo === 'DESALINEACION' ? <SwapIcon /> : <Straighten />}>
                      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        <Chip size="small" label={a.tipo} color={a.severidad === 'ALTA' ? 'error' : 'warning'} />
                        <Typography fontWeight={700} fontSize={13}>{a.codigo}</Typography>
                        {a.posicion && <Chip size="small" variant="outlined" label={a.posicion} />}
                        <Typography fontSize={13}>{a.mensaje}</Typography>
                      </Stack>
                    </Alert>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB 5: Reencauche ── */}
        {tab === 5 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Stack direction="row" alignItems="center" gap={1}><Autorenew sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Lotes de reencauche</Typography></Stack>
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setLoteOpen(true)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none' }}>Nuevo</Button>
                  </Stack>
                  <Stack spacing={0.75}>
                    {lotes.map(l => (
                      <Box key={l.id} onClick={() => setSelLote(l.id)} sx={{ p: 1, borderRadius: 1, cursor: 'pointer', border: '1px solid', borderColor: selLote === l.id ? EAM_COLOR : '#E5E7EB', bgcolor: selLote === l.id ? alpha(EAM_COLOR, 0.06) : '#FFF' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight={700} fontSize={13}>{l.codigo}</Typography>
                          <Chip size="small" label={l.estado} color={l.estado === 'CERRADO' ? 'default' : 'success'} />
                        </Stack>
                        <Typography fontSize={11} color="text.secondary">{l.proveedor ?? 'Sin proveedor'} · {l.fecha_envio}</Typography>
                      </Box>
                    ))}
                    {lotes.length === 0 && <Typography color="text.secondary" fontSize={13} py={1}>Sin lotes registrados</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  {!selLote ? <Alert severity="info">Seleccione o cree un lote para gestionar sus llantas.</Alert> : (() => {
                    const lote = lotes.find(l => l.id === selLote)
                    const abierto = lote?.estado !== 'CERRADO'
                    return (
                      <>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                          <Typography fontWeight={700}>Lote {lote?.codigo} · {lote?.proveedor ?? '—'}</Typography>
                          {abierto && <Button size="small" variant="outlined" color="inherit" onClick={() => mutCerrarLote.mutate(selLote)} sx={{ textTransform: 'none' }}>Cerrar lote</Button>}
                        </Stack>
                        {abierto && (
                          <Stack direction="row" gap={1} mb={1.5} flexWrap="wrap">
                            <TextField select size="small" label="Agregar neumático" value={addTireLote} onChange={e => setAddTireLote(e.target.value)} sx={{ minWidth: 260 }}>
                              <MenuItem value="">Seleccionar…</MenuItem>
                              {almacen.filter(n => n.estado === 'ALMACENADO').map(n => <MenuItem key={n.id} value={String(n.id)}>{n.codigo} · {n.marca ?? ''} {n.medida ?? ''}</MenuItem>)}
                            </TextField>
                            <Button size="small" variant="contained" disabled={!addTireLote || mutAddDet.isPending} onClick={() => mutAddDet.mutate({ neumatico_id: Number(addTireLote) })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none' }}>Agregar</Button>
                          </Stack>
                        )}
                        <Box sx={{ overflowX: 'auto' }}>
                          <Table size="small">
                            <TableHead><TableRow>{['Neumático', 'Banda', 'Resultado', 'Prof. nueva', 'Acción'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>)}</TableRow></TableHead>
                            <TableBody>
                              {loteDetalle.map(d => {
                                const n = neumaticos.find(x => x.id === d.neumatico_id)
                                return (
                                  <TableRow key={d.id} hover>
                                    <TableCell>{n?.codigo ?? d.neumatico_id}</TableCell>
                                    <TableCell>{d.banda ?? '—'}</TableCell>
                                    <TableCell><Chip size="small" label={d.resultado} color={d.resultado === 'REENCAUCHADA' ? 'success' : d.resultado === 'RECHAZO' ? 'error' : d.resultado === 'REMANENTE' ? 'warning' : 'default'} /></TableCell>
                                    <TableCell>{d.profundidad_nueva ?? '—'}</TableCell>
                                    <TableCell>
                                      {d.resultado === 'PENDIENTE' && abierto && (
                                        <Button size="small" variant="text" onClick={() => { setProcForm({ resultado: 'REENCAUCHADA', profundidad_nueva: '', vida_remanente_km: '', costo: '', dano_id: '' }); setProcDialog(d) }} sx={{ textTransform: 'none', color: EAM_COLOR }}>Procesar</Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                              {loteDetalle.length === 0 && <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={2}>Sin llantas en el lote</Typography></TableCell></TableRow>}
                            </TableBody>
                          </Table>
                        </Box>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ── TAB 6: Consultas (por vehículo / llanta / ubicación / total) ── */}
        {tab === 6 && (() => {
          const vehNombre = (id?: number | null) => { const v = vehiculos.find(x => x.id === id); return v ? `${v.codigo}${v.placa ? ` (${v.placa})` : ''}` : '—' }
          const ubicacionDe = (n: Neumatico) => n.activo_id ? `${vehNombre(n.activo_id)}${n.posicion ? ` · ${n.posicion}` : ''}` : n.bodega_id ? `Bodega: ${bodegaNombre(n.bodega_id)}` : '—'
          const filtradas = neumaticos.filter(n => {
            if (consVeh && String(n.activo_id ?? '') !== consVeh) return false
            if (consUbic === 'VEH' && !n.activo_id) return false
            if (consUbic === 'BOD' && !n.bodega_id) return false
            if (consUbic.startsWith('b:') && String(n.bodega_id ?? '') !== consUbic.slice(2)) return false
            if (consEstado && n.estado !== consEstado) return false
            if (consBusca.trim()) {
              const q = consBusca.toLowerCase()
              if (![n.codigo, n.marca, n.referencia, n.medida].some(x => (x ?? '').toLowerCase().includes(q))) return false
            }
            return true
          })
          const filas = filtradas.map(n => ({
            codigo: n.codigo, marca: n.marca ?? '', referencia: n.referencia ?? '', medida: n.medida ?? '',
            uso: n.tipo_uso ?? '', estado: n.estado, ubicacion: ubicacionDe(n),
            prof_actual: n.profundidad_actual ?? '', prof_diseno: n.profundidad_diseño ?? '',
            presion: n.presion_actual ?? '', km_total: n.km_total ?? 0, reencauches: n.reencauches ?? 0,
            costo: n.costo ?? '', vida_util_km: n.vida_util_km ?? '',
          }))
          const columnas = [
            { key: 'codigo', header: 'Código' }, { key: 'marca', header: 'Marca' }, { key: 'referencia', header: 'Referencia' },
            { key: 'medida', header: 'Medida' }, { key: 'uso', header: 'Uso' }, { key: 'estado', header: 'Estado' },
            { key: 'ubicacion', header: 'Ubicación' }, { key: 'prof_actual', header: 'Prof. actual' }, { key: 'prof_diseno', header: 'Prof. diseño' },
            { key: 'presion', header: 'Presión' }, { key: 'km_total', header: 'Km total' }, { key: 'reencauches', header: 'Reenc.' },
            { key: 'costo', header: 'Costo' }, { key: 'vida_util_km', header: 'Vida útil km' },
          ]
          return (
            <Card sx={{ bgcolor: '#FFFFFF' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Inventory2 sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Consulta general de llantas ({filtradas.length} de {neumaticos.length})</Typography>
                  </Stack>
                  <Stack direction="row" gap={1}>
                    <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportarPDF({ archivo: 'consulta-llantas', titulo: 'Consulta de neumáticos', color: EAM_COLOR, columnas, filas })} sx={{ textTransform: 'none' }}>PDF</Button>
                    <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportarExcel({ archivo: 'consulta-llantas', titulo: 'Consulta de neumáticos', columnas, filas })} sx={{ textTransform: 'none' }}>Excel</Button>
                  </Stack>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
                  <TextField select size="small" label="Por vehículo" value={consVeh} onChange={e => setConsVeh(e.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {vehiculos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.codigo}{v.placa ? ` · ${v.placa}` : ''}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Por ubicación" value={consUbic} onChange={e => setConsUbic(e.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="">Todas</MenuItem>
                    <MenuItem value="VEH">Montadas en vehículo</MenuItem>
                    <MenuItem value="BOD">En bodega (cualquiera)</MenuItem>
                    {bodegas.map(b => <MenuItem key={b.id} value={`b:${b.id}`}>Bodega: {b.nombre}</MenuItem>)}
                  </TextField>
                  <TextField select size="small" label="Por estado" value={consEstado} onChange={e => setConsEstado(e.target.value)} sx={{ minWidth: 170 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {['INSTALADO', 'ALMACENADO', 'REENCAUCHE', 'BAJA'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                  <TextField size="small" label="Buscar (código, marca, medida…)" value={consBusca} onChange={e => setConsBusca(e.target.value)} sx={{ minWidth: 240, flex: 1 }} />
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                      {columnas.map(c => <TableCell key={c.key} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{c.header}</TableCell>)}
                    </TableRow></TableHead>
                    <TableBody>
                      {filtradas.map(n => (
                        <TableRow key={n.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{n.codigo}</TableCell>
                          <TableCell>{n.marca ?? '—'}</TableCell>
                          <TableCell>{n.referencia ?? '—'}</TableCell>
                          <TableCell>{n.medida ?? '—'}</TableCell>
                          <TableCell>{n.tipo_uso ?? '—'}</TableCell>
                          <TableCell><Chip size="small" label={n.estado} color={ESTADO_COLOR[n.estado] ?? 'default'} /></TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{ubicacionDe(n)}</TableCell>
                          <TableCell>{n.profundidad_actual ?? '—'}</TableCell>
                          <TableCell>{n.profundidad_diseño ?? '—'}</TableCell>
                          <TableCell>{n.presion_actual ?? '—'}</TableCell>
                          <TableCell>{n.km_total != null ? n.km_total.toLocaleString('es-CO') : '—'}</TableCell>
                          <TableCell>{n.reencauches ?? 0}</TableCell>
                          <TableCell>{n.costo ? `$${n.costo.toLocaleString('es-CO')}` : '—'}</TableCell>
                          <TableCell>{n.vida_util_km != null ? n.vida_util_km.toLocaleString('es-CO') : '—'}</TableCell>
                        </TableRow>
                      ))}
                      {filtradas.length === 0 && <TableRow><TableCell colSpan={columnas.length} align="center"><Typography color="text.secondary" py={2}>Sin resultados con los filtros aplicados</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )
        })()}

        {/* ── TAB 7: Descarte ── */}
        {tab === 7 && (
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

        {/* ── TAB 8: Configuración (bodegas + catálogo de daños) ── */}
        {tab === 8 && (
          <Grid container spacing={2}>
            {/* Parámetros globales */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <NotificationsActive sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Parámetros y umbrales de alerta</Typography>
                  </Stack>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                      <FormControlLabel control={<Switch checked={cfgForm.montaje_estricto} onChange={e => setCfgForm(f => ({ ...f, montaje_estricto: e.target.checked }))} />} label="Montaje estricto" />
                      <Typography fontSize={11} color="text.secondary">Impide montar llantas direccionales en tracción/remolque.</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField label="Prof. mínima (mm)" type="number" size="small" fullWidth value={cfgForm.profundidad_minima} onChange={e => setCfgForm(f => ({ ...f, profundidad_minima: Number(e.target.value) }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField label="Presión mín (psi)" type="number" size="small" fullWidth value={cfgForm.presion_min} onChange={e => setCfgForm(f => ({ ...f, presion_min: Number(e.target.value) }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField label="Presión máx (psi)" type="number" size="small" fullWidth value={cfgForm.presion_max} onChange={e => setCfgForm(f => ({ ...f, presion_max: Number(e.target.value) }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField label="Umbral desalin. (mm)" type="number" size="small" fullWidth value={cfgForm.umbral_desalineacion} onChange={e => setCfgForm(f => ({ ...f, umbral_desalineacion: Number(e.target.value) }))} /></Grid>
                    <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" disabled={mutCfg.isPending} onClick={() => mutCfg.mutate(cfgForm)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Guardar</Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            {/* Bodegas */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <WarehouseIcon sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Bodegas de llantas</Typography>
                  </Stack>
                  <Grid container spacing={1} mb={1.5}>
                    <Grid size={{ xs: 3 }}><TextField label="Código" size="small" fullWidth value={bodForm.codigo} onChange={e => setBodForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 5 }}><TextField label="Nombre" size="small" fullWidth value={bodForm.nombre} onChange={e => setBodForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 4 }}><TextField label="Ubicación" size="small" fullWidth value={bodForm.ubicacion} onChange={e => setBodForm(f => ({ ...f, ubicacion: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!bodForm.codigo || !bodForm.nombre || mutBodega.isPending} onClick={() => mutBodega.mutate({ codigo: bodForm.codigo, nombre: bodForm.nombre, ubicacion: bodForm.ubicacion || undefined })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar bodega</Button>
                    </Grid>
                  </Grid>
                  <Table size="small">
                    <TableHead><TableRow>{['Código', 'Nombre', 'Ubicación', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {bodegas.map(b => (
                        <TableRow key={b.id} hover>
                          <TableCell>{b.codigo}</TableCell><TableCell>{b.nombre}</TableCell><TableCell>{b.ubicacion ?? '—'}</TableCell>
                          <TableCell align="right"><IconButton size="small" color="error" onClick={() => mutBodegaDel.mutate(b.id)}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {bodegas.length === 0 && <TableRow><TableCell colSpan={4} align="center"><Typography color="text.secondary" py={1}>Sin bodegas</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            {/* Catálogo de daños */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Recycling sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Catálogo de daños / descarte</Typography>
                  </Stack>
                  <Grid container spacing={1} mb={1.5}>
                    <Grid size={{ xs: 3 }}><TextField label="Código" size="small" fullWidth value={danoForm.codigo} onChange={e => setDanoForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 5 }}><TextField label="Nombre" size="small" fullWidth value={danoForm.nombre} onChange={e => setDanoForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 4 }}><TextField select label="Severidad" size="small" fullWidth value={danoForm.severidad} onChange={e => setDanoForm(f => ({ ...f, severidad: e.target.value }))}>{['LEVE', 'MODERADO', 'GRAVE'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
                    <Grid size={{ xs: 8 }}><TextField select label="Acción sugerida" size="small" fullWidth value={danoForm.accion} onChange={e => setDanoForm(f => ({ ...f, accion: e.target.value }))}>{['INSPECCION', 'REENCAUCHE', 'DESCARTE'].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}</TextField></Grid>
                    <Grid size={{ xs: 4 }} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!danoForm.codigo || !danoForm.nombre || mutDano.isPending} onClick={() => mutDano.mutate({ ...danoForm })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
                    </Grid>
                  </Grid>
                  <Table size="small">
                    <TableHead><TableRow>{['Nombre', 'Severidad', 'Acción', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {danos.map(d => (
                        <TableRow key={d.id} hover>
                          <TableCell>{d.nombre}</TableCell>
                          <TableCell><Chip size="small" label={d.severidad} color={d.severidad === 'GRAVE' ? 'error' : d.severidad === 'MODERADO' ? 'warning' : 'default'} /></TableCell>
                          <TableCell>{d.accion}</TableCell>
                          <TableCell align="right"><IconButton size="small" color="error" onClick={() => mutDanoDel.mutate(d.id)}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {danos.length === 0 && <TableRow><TableCell colSpan={4} align="center"><Typography color="text.secondary" py={1}>Sin daños configurados</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <TireRepair sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Catálogo de llantas (marcas, medidas, referencias y vidas)</Typography>
                  </Stack>
                  <Grid container spacing={1} mb={2} alignItems="center">
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <TextField select label="Tipo" size="small" fullWidth value={catForm.tipo} onChange={e => setCatForm(f => ({ ...f, tipo: e.target.value }))}>
                        {[['MARCA', 'Marca'], ['MEDIDA', 'Medida'], ['REFERENCIA', 'Referencia'], ['VIDA', 'Vida útil']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}><TextField label="Nombre" size="small" fullWidth value={catForm.nombre} onChange={e => setCatForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
                    {catForm.tipo === 'VIDA' && <Grid size={{ xs: 6, sm: 3 }}><TextField label="Km de vida útil" type="number" size="small" fullWidth value={catForm.valor} onChange={e => setCatForm(f => ({ ...f, valor: e.target.value }))} /></Grid>}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!catForm.nombre || mutCat.isPending} onClick={() => mutCat.mutate({ tipo: catForm.tipo, nombre: catForm.nombre, valor: catForm.valor ? Number(catForm.valor) : undefined })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
                    </Grid>
                  </Grid>
                  <Grid container spacing={2}>
                    {[['MARCA', 'Marcas'], ['MEDIDA', 'Medidas'], ['REFERENCIA', 'Referencias'], ['VIDA', 'Vidas útiles']].map(([tipo, titulo]) => (
                      <Grid key={tipo} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">{titulo}</Typography>
                        <Stack spacing={0.5} mt={0.5}>
                          {cat(tipo).map(c => (
                            <Stack key={c.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.25 }}>
                              <Typography variant="body2" noWrap>{c.nombre}{c.valor ? ` · ${c.valor.toLocaleString()} km` : ''}</Typography>
                              <IconButton size="small" color="error" onClick={() => mutCatDel.mutate(c.id)}><DeleteForever sx={{ fontSize: 15 }} /></IconButton>
                            </Stack>
                          ))}
                          {cat(tipo).length === 0 && <Typography variant="caption" color="text.secondary">Sin registros</Typography>}
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ── Menú contextual de la llanta en el diagrama ── */}
        <Menu anchorEl={slotMenu?.anchor} open={!!slotMenu} onClose={() => setSlotMenu(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
          {slotMenu && [
            <Box key="hdr" sx={{ px: 2, py: 1, borderBottom: '1px solid #F1F5F9' }}>
              <Typography fontSize={13} fontWeight={800} color={EAM_DARK}>{slotMenu.tire.codigo}</Typography>
              <Typography fontSize={11} color="text.secondary">{slotMenu.tire.marca ?? ''} {slotMenu.tire.medida ?? ''} · {slotMenu.pos}{slotMenu.tire.orientacion === 'INVERTIDA' ? ' · ⇅ invertida' : ''}</Typography>
            </Box>,
            <MenuItem key="insp" onClick={() => { setInspForm({ ...EMPTY_INSP, km_odometro: veh?.odometro_actual != null ? String(veh.odometro_actual) : '' }); setInspDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Straighten sx={{ fontSize: 18, color: EAM_COLOR }} /></ListItemIcon><ListItemText>Inspeccionar</ListItemText>
            </MenuItem>,
            <MenuItem key="rot" onClick={() => { setRotTarget(''); setRotDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><SwapIcon sx={{ fontSize: 18, color: '#D97706' }} /></ListItemIcon><ListItemText>Rotar (intercambiar)</ListItemText>
            </MenuItem>,
            <MenuItem key="volt" disabled={!/-(INT|EXT)$/.test(slotMenu.pos)} onClick={() => { setVoltearDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Autorenew sx={{ fontSize: 18, color: '#7C3AED' }} /></ListItemIcon><ListItemText>Voltear (int↔ext)</ListItemText>
            </MenuItem>,
            <Divider key="d1" />,
            <MenuItem key="hist" onClick={() => { setHistTire(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><HistoryIcon sx={{ fontSize: 18, color: '#2563EB' }} /></ListItemIcon><ListItemText>Historial de movimientos</ListItemText>
            </MenuItem>,
            <MenuItem key="desm" onClick={() => { setMovForm({ fecha: nowLocal(), km_odometro: '', bodega_id: '', tecnico: '', observaciones: '' }); setMovDialog({ tire: slotMenu.tire, tipo: 'DESMONTAJE' }); setSlotMenu(null) }}>
              <ListItemIcon><WarehouseIcon sx={{ fontSize: 18, color: '#64748B' }} /></ListItemIcon><ListItemText>Desmontar a bodega</ListItemText>
            </MenuItem>,
          ]}
        </Menu>

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
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Marca" size="small" fullWidth value={nuevoForm.marca} onChange={e => setNuevoForm(f => ({ ...f, marca: e.target.value }))}><MenuItem value="">—</MenuItem>{cat('MARCA').map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Referencia" size="small" fullWidth value={nuevoForm.referencia} onChange={e => setNuevoForm(f => ({ ...f, referencia: e.target.value }))}><MenuItem value="">—</MenuItem>{cat('REFERENCIA').map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Medida" size="small" fullWidth value={nuevoForm.medida} onChange={e => setNuevoForm(f => ({ ...f, medida: e.target.value }))}><MenuItem value="">—</MenuItem>{cat('MEDIDA').map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Vida útil" size="small" fullWidth value={nuevoForm.vida_util_km} onChange={e => setNuevoForm(f => ({ ...f, vida_util_km: e.target.value }))}><MenuItem value="">—</MenuItem>{cat('VIDA').map(c => <MenuItem key={c.id} value={String(c.valor ?? '')}>{c.nombre}{c.valor ? ` · ${c.valor.toLocaleString()} km` : ''}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Bodega" size="small" fullWidth value={nuevoForm.bodega_id} onChange={e => setNuevoForm(f => ({ ...f, bodega_id: e.target.value }))}><MenuItem value="">Sin bodega</MenuItem>{bodegas.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Prof. diseño" type="number" size="small" fullWidth value={nuevoForm.profundidad_diseño} onChange={e => setNuevoForm(f => ({ ...f, profundidad_diseño: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Prof. actual" type="number" size="small" fullWidth value={nuevoForm.profundidad_actual} onChange={e => setNuevoForm(f => ({ ...f, profundidad_actual: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Tipo de uso" size="small" fullWidth value={nuevoForm.tipo_uso} onChange={e => setNuevoForm(f => ({ ...f, tipo_uso: e.target.value }))}><MenuItem value="">Sin clasificar</MenuItem>{TIPOS_USO.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Presión recomendada (psi)" type="number" size="small" fullWidth value={nuevoForm.presion_recomendada} onChange={e => setNuevoForm(f => ({ ...f, presion_recomendada: e.target.value }))} /></Grid>
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
              vida_util_km: nuevoForm.vida_util_km ? Number(nuevoForm.vida_util_km) : undefined,
              tipo_uso: nuevoForm.tipo_uso || undefined,
              presion_recomendada: nuevoForm.presion_recomendada ? Number(nuevoForm.presion_recomendada) : undefined,
            })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo nuevo lote de reencauche ── */}
        <Dialog open={loteOpen} onClose={() => setLoteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo lote de reencauche</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField label="Código *" size="small" fullWidth value={loteForm.codigo} onChange={e => setLoteForm(f => ({ ...f, codigo: e.target.value }))} />
              <TextField label="Fecha de envío *" type="date" size="small" fullWidth value={loteForm.fecha_envio} onChange={e => setLoteForm(f => ({ ...f, fecha_envio: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Proveedor" size="small" fullWidth value={loteForm.proveedor} onChange={e => setLoteForm(f => ({ ...f, proveedor: e.target.value }))} />
              <TextField label="N.º de remisión" size="small" fullWidth value={loteForm.remision} onChange={e => setLoteForm(f => ({ ...f, remision: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={loteForm.observaciones} onChange={e => setLoteForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setLoteOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={!loteForm.codigo || !loteForm.fecha_envio || mutLote.isPending}
              onClick={() => mutLote.mutate({ codigo: loteForm.codigo, fecha_envio: loteForm.fecha_envio, proveedor: loteForm.proveedor || undefined, remision: loteForm.remision || undefined, observaciones: loteForm.observaciones || undefined })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Crear lote</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo procesar resultado de reencauche ── */}
        <Dialog open={!!procDialog} onClose={() => setProcDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Resultado del reencauche</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Resultado *" size="small" fullWidth value={procForm.resultado} onChange={e => setProcForm(f => ({ ...f, resultado: e.target.value }))}>
                <MenuItem value="REENCAUCHADA">Reencauchada (apta)</MenuItem>
                <MenuItem value="REMANENTE">Remanente (rechazada, con vida útil)</MenuItem>
                <MenuItem value="RECHAZO">Rechazo / descarte</MenuItem>
              </TextField>
              {procForm.resultado === 'REENCAUCHADA' && (
                <>
                  <TextField label="Profundidad nueva (mm)" type="number" size="small" fullWidth value={procForm.profundidad_nueva} onChange={e => setProcForm(f => ({ ...f, profundidad_nueva: e.target.value }))} />
                  <TextField label="Costo del reencauche" type="number" size="small" fullWidth value={procForm.costo} onChange={e => setProcForm(f => ({ ...f, costo: e.target.value }))} />
                </>
              )}
              {procForm.resultado === 'REMANENTE' && (
                <TextField label="Vida remanente recomendada (km)" type="number" size="small" fullWidth value={procForm.vida_remanente_km} onChange={e => setProcForm(f => ({ ...f, vida_remanente_km: e.target.value }))} />
              )}
              {procForm.resultado === 'RECHAZO' && (
                <TextField select label="Daño / motivo de descarte" size="small" fullWidth value={procForm.dano_id} onChange={e => setProcForm(f => ({ ...f, dano_id: e.target.value }))}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {danos.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
                </TextField>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setProcDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutProc.isPending}
              onClick={() => mutProc.mutate({
                resultado: procForm.resultado,
                profundidad_nueva: procForm.profundidad_nueva ? Number(procForm.profundidad_nueva) : undefined,
                vida_remanente_km: procForm.vida_remanente_km ? Number(procForm.vida_remanente_km) : undefined,
                costo: procForm.costo ? Number(procForm.costo) : undefined,
                dano_id: procForm.dano_id ? Number(procForm.dano_id) : undefined,
              })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo crear inspección (llanta) ── */}
        <Dialog open={!!inspDialog} onClose={() => setInspDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            Crear inspección
            <Typography variant="caption" color="text.secondary" display="block">
              {inspDialog?.codigo} · {inspDialog?.marca ?? ''} {inspDialog?.medida ?? ''}{inspDialog?.posicion ? ` · ${inspDialog.posicion}` : ''}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={1.5} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}><TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={inspForm.fecha} onChange={e => setInspForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid size={{ xs: 4 }}><TextField label="Prof. Externa (mm)" type="number" size="small" fullWidth value={inspForm.profundidad_izq} onChange={e => setInspForm(f => ({ ...f, profundidad_izq: e.target.value }))} helperText="Hombro externo" /></Grid>
              <Grid size={{ xs: 4 }}><TextField label="Centro" type="number" size="small" fullWidth value={inspForm.profundidad_centro} onChange={e => setInspForm(f => ({ ...f, profundidad_centro: e.target.value }))} /></Grid>
              <Grid size={{ xs: 4 }}><TextField label="Interna" type="number" size="small" fullWidth value={inspForm.profundidad_der} onChange={e => setInspForm(f => ({ ...f, profundidad_der: e.target.value }))} helperText="Hombro interno" /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Presión (psi)" type="number" size="small" fullWidth value={inspForm.presion_psi} onChange={e => setInspForm(f => ({ ...f, presion_psi: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Odómetro (km)" type="number" size="small" fullWidth value={inspForm.km_odometro} onChange={e => setInspForm(f => ({ ...f, km_odometro: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6 }}><TextField select label="Estado visual" size="small" fullWidth value={inspForm.estado_visual} onChange={e => setInspForm(f => ({ ...f, estado_visual: e.target.value }))}>{['BUENO', 'REGULAR', 'CRITICO'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Técnico" size="small" fullWidth value={inspForm.tecnico} onChange={e => setInspForm(f => ({ ...f, tecnico: e.target.value }))} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={inspForm.observaciones} onChange={e => setInspForm(f => ({ ...f, observaciones: e.target.value }))} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setInspDialog(null)}>Cancelar</Button>
            <Button variant="contained" startIcon={<AddIcon />} disabled={!inspForm.fecha || mutInsp.isPending}
              onClick={() => mutInsp.mutate({
                fecha: inspForm.fecha,
                profundidad_izq: inspForm.profundidad_izq ? Number(inspForm.profundidad_izq) : undefined,
                profundidad_centro: inspForm.profundidad_centro ? Number(inspForm.profundidad_centro) : undefined,
                profundidad_der: inspForm.profundidad_der ? Number(inspForm.profundidad_der) : undefined,
                presion_psi: inspForm.presion_psi ? Number(inspForm.presion_psi) : undefined,
                km_odometro: inspForm.km_odometro ? Number(inspForm.km_odometro) : undefined,
                estado_visual: inspForm.estado_visual, tecnico: inspForm.tecnico || undefined,
                observaciones: inspForm.observaciones || undefined,
              })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Guardar inspección</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo rotar (intercambiar posición) ── */}
        <Dialog open={!!rotDialog} onClose={() => setRotDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapIcon sx={{ color: '#D97706' }} /> Rotar llanta
          </DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={13} mb={1.5}>
              Intercambia <b>{rotDialog?.codigo}</b> ({rotDialog?.posicion}) con otra llanta instalada. Ambas quedan en la posición de la otra.
            </Typography>
            <TextField select label="Intercambiar con *" size="small" fullWidth value={rotTarget} onChange={e => setRotTarget(e.target.value)}>
              <MenuItem value="">Seleccionar llanta…</MenuItem>
              {neumaticos.filter(n => n.estado === 'INSTALADO' && n.id !== rotDialog?.id && n.activo_id === rotDialog?.activo_id).map(n => (
                <MenuItem key={n.id} value={String(n.id)}>{n.posicion} · {n.codigo} ({n.tipo_uso ?? '—'})</MenuItem>
              ))}
            </TextField>
            <Alert severity="info" sx={{ mt: 1.5, fontSize: 12.5 }}>El sistema valida el montaje estricto (una direccional no puede ir a tracción/remolque).</Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRotDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!rotTarget || mutIntercambio.isPending}
              onClick={() => mutIntercambio.mutate({ neumatico_a_id: rotDialog!.id, neumatico_b_id: Number(rotTarget), fecha: new Date().toISOString(), km_odometro: vehiculos.find(v => v.id === rotDialog?.activo_id)?.odometro_actual })}
              sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' } }}>Rotar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo voltear (invertir interno↔externo) ── */}
        <Dialog open={!!voltearDialog} onClose={() => setVoltearDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Autorenew sx={{ color: '#7C3AED' }} /> Voltear llanta
          </DialogTitle>
          <DialogContent dividers>
            <Typography fontSize={13.5} mb={1}>
              Voltear <b>{voltearDialog?.codigo}</b> en la posición <b>{voltearDialog?.posicion}</b>: se invierte el sentido de montaje para emparejar el desgaste.
            </Typography>
            <Box sx={{ bgcolor: '#F5F3FF', borderRadius: 2, p: 1.5, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Box>
                <Typography fontSize={10.5} fontWeight={700} color="#94A3B8">EXTERNA</Typography>
                <Typography fontSize={18} fontWeight={800} color="#7C3AED">{voltearDialog?.profundidad_externa ?? '–'}<Box component="span" sx={{ mx: 0.5, color: '#CBD5E1' }}>→</Box>{voltearDialog?.profundidad_interna ?? '–'}</Typography>
              </Box>
              <Box>
                <Typography fontSize={10.5} fontWeight={700} color="#94A3B8">INTERNA</Typography>
                <Typography fontSize={18} fontWeight={800} color="#7C3AED">{voltearDialog?.profundidad_interna ?? '–'}<Box component="span" sx={{ mx: 0.5, color: '#CBD5E1' }}>→</Box>{voltearDialog?.profundidad_externa ?? '–'}</Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setVoltearDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={mutVoltear.isPending} onClick={() => mutVoltear.mutate(voltearDialog!.id)}
              sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}>Confirmar volteo</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo gráfica / historial de inspecciones ── */}
        <Dialog open={!!chartTire} onClose={() => setChartTire(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Evolución del desgaste · {chartTire?.codigo}</span>
            <IconButton size="small" onClick={() => setChartTire(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {inspecciones.length > 0 ? (
              <>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={inspecciones.map(i => ({ fecha: fmtFecha(i.fecha).split(',')[0], prof: i.profundidad_min ?? undefined, presion: i.presion_psi ?? undefined }))} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                      <XAxis dataKey="fecha" fontSize={11} />
                      <YAxis yAxisId="l" fontSize={11} />
                      <YAxis yAxisId="r" orientation="right" fontSize={11} />
                      <RTooltip />
                      <Legend />
                      <Line yAxisId="l" type="monotone" dataKey="prof" name="Profundidad mín (mm)" stroke={EAM_COLOR} strokeWidth={2} />
                      <Line yAxisId="r" type="monotone" dataKey="presion" name="Presión (psi)" stroke="#2563EB" strokeWidth={2} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ overflowX: 'auto', mt: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow>{['Fecha', 'Izq', 'Centro', 'Der', 'Mín', 'Presión', 'Km', 'Estado'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {[...inspecciones].reverse().map(i => (
                        <TableRow key={i.id} hover>
                          <TableCell sx={{ fontSize: 12 }}>{fmtFecha(i.fecha)}</TableCell>
                          <TableCell>{i.profundidad_izq ?? '—'}</TableCell>
                          <TableCell>{i.profundidad_centro ?? '—'}</TableCell>
                          <TableCell>{i.profundidad_der ?? '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{i.profundidad_min ?? '—'}</TableCell>
                          <TableCell>{i.presion_psi ?? '—'}</TableCell>
                          <TableCell>{i.km_odometro?.toLocaleString('es-CO') ?? '—'}</TableCell>
                          <TableCell><Chip size="small" label={i.estado_visual ?? '—'} color={i.estado_visual === 'CRITICO' ? 'error' : i.estado_visual === 'REGULAR' ? 'warning' : 'success'} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            ) : <Alert severity="info">Sin inspecciones registradas para esta llanta.</Alert>}
          </DialogContent>
        </Dialog>

        {/* ── Diálogo configurar ejes ── */}
        <Dialog open={ejesOpen} onClose={() => setEjesOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Configurar ejes
            <Typography variant="caption" color="text.secondary" display="block">{veh?.codigo} — {veh?.nombre}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Número de ejes *" size="small" fullWidth value={ejesForm.numero_ejes} onChange={e => setEjesForm(f => ({ ...f, numero_ejes: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6].map(n => <MenuItem key={n} value={String(n)}>{n} eje{n > 1 ? 's' : ''}</MenuItem>)}
              </TextField>
              <TextField select label="¿Lleva repuesto?" size="small" fullWidth value={ejesForm.tiene_repuesto ? 'si' : 'no'} onChange={e => setEjesForm(f => ({ ...f, tiene_repuesto: e.target.value === 'si' }))}>
                <MenuItem value="si">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              <Alert severity="info" sx={{ py: 0 }}>
                Se generarán {(() => { const n = Number(ejesForm.numero_ejes) || 0; return (n >= 1 ? 2 : 0) + Math.max(0, n - 1) * 4 + (ejesForm.tiene_repuesto ? 1 : 0) })()} posiciones (eje 1 direccional; ejes siguientes duales{ejesForm.tiene_repuesto ? ' + repuesto' : ''}).
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEjesOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutEjes.isPending} onClick={() => mutEjes.mutate({ numero_ejes: Number(ejesForm.numero_ejes), tiene_repuesto: ejesForm.tiene_repuesto })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Guardar</Button>
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
