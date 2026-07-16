import { useState, useMemo } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip, Card, CardContent, Alert, TextField, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Stack, Tooltip, alpha,
  Switch, FormControlLabel, Badge, Divider,
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
  const [movDialog, setMovDialog] = useState<null | { tire: Neumatico; tipo: string; posicion?: string }>(null)
  const [movForm, setMovForm] = useState({ fecha: nowLocal(), km_odometro: '', bodega_id: '', tecnico: '', observaciones: '' })
  const [bajaDialog, setBajaDialog] = useState<Neumatico | null>(null)
  const [bajaForm, setBajaForm] = useState({ fecha: nowLocal(), dano_id: '', motivo: '' })
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ ...EMPTY_NEUMATICO })
  const [histTire, setHistTire] = useState<Neumatico | null>(null)
  const [ejesOpen, setEjesOpen] = useState(false)
  const [ejesForm, setEjesForm] = useState({ numero_ejes: '2', tiene_repuesto: true })
  // Inspecciones
  const [inspTireId, setInspTireId] = useState<string>('')
  const EMPTY_INSP = { fecha: nowLocal(), profundidad_izq: '', profundidad_centro: '', profundidad_der: '', presion_psi: '', km_odometro: '', estado_visual: 'BUENO', tecnico: '', observaciones: '' }
  const [inspForm, setInspForm] = useState({ ...EMPTY_INSP })
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
  const { data: inspecciones = [] } = useQuery<Inspeccion[]>({
    queryKey: ['eam-insp', inspTireId],
    queryFn: () => api.get(`/eam/neumaticos/${inspTireId}/inspecciones`).then(r => r.data),
    enabled: !!inspTireId,
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
    mutationFn: (body: Record<string, unknown>) => api.post(`/eam/neumaticos/${inspTireId}/inspecciones`, body),
    onSuccess: () => { toast.success('Inspección registrada'); qc.invalidateQueries({ queryKey: ['eam-insp'] }); invalidarNeu(); setInspForm({ ...EMPTY_INSP }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar inspección'),
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
    return (
      <Tooltip arrow title={t
        ? `${t.codigo} · ${t.marca ?? ''} ${t.medida ?? ''}${t.profundidad_actual != null ? ` · ${t.profundidad_actual}mm` : ''}${t.reencauches ? ` · R${t.reencauches}` : ''} — ${pos.label}`
        : `${pos.label} · vacío`}>
        <Box
          draggable={!!t}
          onDragStart={() => { if (t) setDraggedTire(t) }}
          onDragEnd={() => setDraggedTire(null)}
          onClick={() => { if (t) setHistTire(t) }}
          onDragOver={(e) => { e.preventDefault(); setOverSlot(pos.codigo) }}
          onDragLeave={() => setOverSlot('')}
          onDrop={() => soltarEnPosicion(pos.codigo)}
          sx={{
            width: 44, height: 66, borderRadius: '11px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: t ? 'grab' : 'default', '&:active': { cursor: t ? 'grabbing' : 'default' },
            border: '2px solid', borderColor: activo ? EAM_COLOR : t ? '#0F172A' : '#CBD5E1',
            bgcolor: activo ? alpha(EAM_COLOR, 0.18) : t ? '#1F2937' : '#F1F5F9',
            color: t ? '#fff' : 'text.disabled',
            boxShadow: t ? 'inset 0 0 0 4px #0F172A, 0 1px 3px rgba(0,0,0,.25)' : 'none',
            transition: 'all .12s',
          }}
        >
          {t ? (
            <>
              <TireRepair sx={{ fontSize: 15, color: '#CBD5E1' }} />
              <Typography fontSize={7.5} fontWeight={700} sx={{ mt: 0.2, lineHeight: 1, textAlign: 'center', px: 0.25, maxWidth: 40 }} noWrap>{t.codigo}</Typography>
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

        {/* ── TAB 2: Inspecciones + gráfica de desgaste ── */}
        {tab === 2 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Straighten sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Registrar inspección</Typography>
                  </Stack>
                  <TextField select label="Neumático" size="small" fullWidth value={inspTireId} onChange={e => setInspTireId(e.target.value)} sx={{ mb: 1.5 }}>
                    <MenuItem value="">Seleccionar…</MenuItem>
                    {neumaticos.filter(n => n.estado !== 'BAJA').map(n => (
                      <MenuItem key={n.id} value={String(n.id)}>{n.codigo} · {n.marca ?? ''} {n.medida ?? ''}{n.posicion ? ` · ${n.posicion}` : ''}</MenuItem>
                    ))}
                  </TextField>
                  {inspTireId ? (
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12 }}><TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={inspForm.fecha} onChange={e => setInspForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
                      <Grid size={{ xs: 4 }}><TextField label="Prof. Izq (mm)" type="number" size="small" fullWidth value={inspForm.profundidad_izq} onChange={e => setInspForm(f => ({ ...f, profundidad_izq: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 4 }}><TextField label="Centro" type="number" size="small" fullWidth value={inspForm.profundidad_centro} onChange={e => setInspForm(f => ({ ...f, profundidad_centro: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 4 }}><TextField label="Der" type="number" size="small" fullWidth value={inspForm.profundidad_der} onChange={e => setInspForm(f => ({ ...f, profundidad_der: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 6 }}><TextField label="Presión (psi)" type="number" size="small" fullWidth value={inspForm.presion_psi} onChange={e => setInspForm(f => ({ ...f, presion_psi: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 6 }}><TextField label="Odómetro (km)" type="number" size="small" fullWidth value={inspForm.km_odometro} onChange={e => setInspForm(f => ({ ...f, km_odometro: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 6 }}><TextField select label="Estado visual" size="small" fullWidth value={inspForm.estado_visual} onChange={e => setInspForm(f => ({ ...f, estado_visual: e.target.value }))}>{['BUENO', 'REGULAR', 'CRITICO'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
                      <Grid size={{ xs: 6 }}><TextField label="Técnico" size="small" fullWidth value={inspForm.tecnico} onChange={e => setInspForm(f => ({ ...f, tecnico: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 12 }}><TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={inspForm.observaciones} onChange={e => setInspForm(f => ({ ...f, observaciones: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                      </Grid>
                    </Grid>
                  ) : <Alert severity="info">Seleccione un neumático para registrar y ver sus inspecciones.</Alert>}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <ShowChart sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Evolución del desgaste</Typography>
                  </Stack>
                  {inspecciones.length > 0 ? (
                    <Box sx={{ width: '100%', height: 240 }}>
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
                  ) : <Alert severity="info">Sin inspecciones registradas para este neumático.</Alert>}
                  {inspecciones.length > 0 && (
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
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

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

        {/* ── TAB 6: Descarte ── */}
        {tab === 6 && (
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

        {/* ── TAB 7: Configuración (bodegas + catálogo de daños) ── */}
        {tab === 7 && (
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
