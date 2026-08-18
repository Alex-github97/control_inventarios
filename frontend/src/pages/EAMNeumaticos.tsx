import { useState, useMemo, useRef, Profiler } from 'react'
import * as XLSX from 'xlsx'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip, Card, CardContent, Alert, TextField, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Stack, Tooltip, alpha,
  Switch, FormControlLabel, Badge, Divider, Menu, ListItemIcon, ListItemText, Checkbox,
  Autocomplete,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TireRepair, Inventory2, Recycling, Add as AddIcon, Close as CloseIcon,
  History as HistoryIcon, SwapHoriz as SwapIcon, Warehouse as WarehouseIcon,
  DeleteForever, DirectionsCar, ShowChart, TrendingUp, NotificationsActive,
  Autorenew, Download, Straighten, Compress, AttachMoney, Build, Map as MapIcon, Timeline, Undo,
  UploadFile, CameraAlt, Checklist,
} from '@mui/icons-material'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Legend,
} from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { exportarPDF, exportarExcel } from '@/utils/exportar'
import type { VehiculoCombinado } from '@/components/VehiculosCombinados'

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
  zona_id?: number | null; motivo_fin_vida_id?: number | null; dot?: string | null; tipo_rin?: string | null
}
interface Bodega { id: number; codigo: string; nombre: string; ubicacion?: string }
interface Dano { id: number; codigo: string; nombre: string; severidad: string; accion: string }
interface Posicion { codigo: string; label: string; eje: number; lado: string; numero?: number | null }
interface CatItem { id: number; tipo: string; nombre: string; valor?: number | null }
interface Movimiento { id: number; tipo_movimiento: string; posicion_origen?: string | null; posicion?: string | null; bodega_id?: number | null; km_odometro?: number | null; fecha?: string | null; tecnico?: string | null; observaciones?: string | null }
interface Inspeccion { id: number; neumatico_id: number; fecha: string; profundidad_izq?: number | null; profundidad_centro?: number | null; profundidad_der?: number | null; profundidad_min?: number | null; presion_psi?: number | null; km_odometro?: number | null; estado_visual?: string | null; observaciones?: string | null; tecnico?: string | null }
interface Indicador { neumatico_id: number; codigo: string; marca?: string; medida?: string; estado?: string; posicion?: string | null; km_total: number; costo?: number | null; cpk?: number | null; costo_mm?: number | null; mm_gastados?: number | null; vida_util_km?: number | null; km_proyectado?: number | null; pct_desgaste?: number | null }
interface AlertaNeu { neumatico_id: number; codigo: string; tipo: string; severidad: string; mensaje: string; posicion?: string | null; activo_id?: number | null }
interface LoteReencauche { id: number; codigo: string; fecha_envio: string; proveedor?: string | null; remision?: string | null; observaciones?: string | null; estado: string }
interface DetalleReencauche { id: number; lote_id: number; neumatico_id: number; banda?: string | null; resultado: string; profundidad_nueva?: number | null; vida_remanente_km?: number | null; costo?: number | null }
interface ConfigNeu { montaje_estricto: boolean; profundidad_minima: number; presion_min: number; presion_max: number; umbral_desalineacion: number }
interface ZonaNeu { id: number; codigo: string; nombre: string; activo: boolean }
interface BandaReencauche { id: number; marca: string; referencia?: string | null; dimension?: string | null; profundidad_original?: number | null; profundidad_minima?: number | null; tipo_posicion?: string | null; sentido_rotacion?: string | null; reesculturable: boolean; costo_defecto?: number | null; presion_minima?: number | null; presion_maxima?: number | null; comentarios?: string | null; activo: boolean }
interface MotivoFinVida { id: number; nombre: string; aplica_descarte: boolean; aplica_fin_vida: boolean; activo: boolean }
interface AjusteCatalogo { id: number; nombre: string; activo: boolean }
interface AjusteNeu { id: number; neumatico_id: number; motivo_id: number; fecha: string; valor: number; comentarios?: string | null }
interface EsquemaVehiculo { id: number; nombre: string; tipo_activo?: string | null; numero_ejes: number; tiene_repuesto: boolean; cantidad_repuestos: number; observaciones?: string | null; activo: boolean }
interface TrabajoNeu { id: number; nombre: string; observaciones?: string | null; es_predeterminado: boolean; activo: boolean }
interface PeriodicidadTrabajo { id: number; trabajo_id: number; tipo_activo?: string | null; valor: number; unidad: string; activo: boolean }
interface TrabajoRealizado { id: number; neumatico_id: number; trabajo_id: number; fecha: string; km_odometro?: number | null; cantidad: number; costo_unitario?: number | null; proveedor?: string | null; observaciones?: string | null }
interface Reesculturado { id: number; neumatico_id: number; fecha: string; km_odometro?: number | null; proveedor?: string | null; costo?: number | null; profundidad_anterior?: number | null; profundidad_nueva?: number | null; deshecho: boolean; fecha_deshecho?: string | null }
interface VidaNeu { id: number; neumatico_id: number; numero_vida: number; tipo: string; fecha_inicio: string; fecha_fin?: string | null; km_inicio: number; km_fin?: number | null; costo?: number | null; profundidad_inicial?: number | null; profundidad_final?: number | null; motivo_cierre_id?: number | null }

const TIPOS_USO = ['DIRECCIONAL', 'TRACCION', 'REMOLQUE', 'MULTIPOSICION', 'REPUESTO']
const EMPTY_NEUMATICO = { codigo: '', marca: '', referencia: '', medida: '', tipo: '', tipo_uso: '', bodega_id: '', costo: '', proveedor: '', profundidad_diseño: '', profundidad_actual: '', vida_util_km: '', presion_recomendada: '', zona_id: '', dot: '', tipo_rin: '' }
const TIPOS_RIN = ['ACERO', 'ALUMINIO', 'OTRO']

const ESTADO_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  INSTALADO: 'success', ALMACENADO: 'info', REENCAUCHE: 'warning', BAJA: 'error',
}
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const fmtFecha = (s?: string | null) => { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO') }

// ─── Diálogo: agregar llanta desde bodega ──────────────────────────────────────
// Componente propio con estado local: escribir/seleccionar aquí NO vuelve a
// renderizar el diagrama ni el resto de la página (antes el formulario vivía
// en el componente principal y cada tecla re-renderizaba todo).
interface AgregarLlantaPayload {
  neumatico_id: number; posicion: string; fecha: string
  km_odometro?: number; tecnico?: string; observaciones?: string
}
function AgregarLlantaDialog({
  open, onClose, veh, layout, almacen, tireEnVeh, onSubmit, isPending,
}: {
  open: boolean
  onClose: () => void
  veh: Vehiculo | null | undefined
  layout: Posicion[]
  almacen: Neumatico[]
  tireEnVeh: (posicion: string) => Neumatico | undefined
  onSubmit: (payload: AgregarLlantaPayload) => void
  isPending: boolean
}) {
  const EMPTY = { neumatico_id: '', posicion: '', fecha: nowLocal(), km_odometro: '', tecnico: '', observaciones: '' }
  const [form, setForm] = useState(EMPTY)
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setForm({ ...EMPTY, km_odometro: veh?.odometro_actual != null ? String(veh.odometro_actual) : '' })
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const disponibles = almacen.filter(n => n.estado === 'ALMACENADO')
  const libres = layout.filter(p => !tireEnVeh(p.codigo))

  const perfOpen = (label: string) => {
    const t0 = performance.now()
    console.log(`[PERF] ${label}: click -> onOpen ${(t0 - (window as any).__perfClickT0 || 0).toFixed?.(1) ?? ''}`)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      console.log(`[PERF] ${label}: onOpen -> painted = ${(performance.now() - t0).toFixed(1)}ms`)
    }))
  }
  const markClick = () => { (window as any).__perfClickT0 = performance.now() }

  return (
    <Profiler id="AgregarLlantaDialog" onRender={(id, phase, actualDuration) => {
      if (actualDuration > 2) console.log(`[PERF][Profiler] ${id} ${phase} actualDuration=${actualDuration.toFixed(1)}ms`)
    }}>
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Agregar llanta desde bodega
        <Typography variant="caption" color="text.secondary" display="block">{veh?.codigo}{veh?.placa ? ` · ${veh.placa}` : ''} — {veh?.nombre}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={0.5}>
          <Autocomplete
            size="small"
            options={disponibles}
            value={disponibles.find(n => String(n.id) === form.neumatico_id) ?? null}
            onChange={(_e, v) => setForm(f => ({ ...f, neumatico_id: v ? String(v.id) : '' }))}
            onOpen={() => perfOpen('Llanta Autocomplete')}
            getOptionLabel={n => `${n.codigo} · ${n.marca ?? ''} ${n.medida ?? ''}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="Sin resultados"
            renderInput={params => <TextField {...params} onMouseDown={markClick} label="Llanta en bodega *" placeholder="Buscar por código, marca o medida…" />}
            renderOption={(props, n) => (
              <li {...props} key={n.id}>
                <Stack>
                  <Typography fontSize={13.5} fontWeight={600}>{n.codigo}</Typography>
                  <Typography fontSize={11.5} color="text.secondary">{n.marca ?? '—'} · {n.medida ?? '—'}</Typography>
                </Stack>
              </li>
            )}
          />
          {disponibles.length === 0 && <Alert severity="info" sx={{ py: 0.5 }}>No hay llantas disponibles en bodega.</Alert>}
          {libres.length === 0 ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>Este vehículo no tiene posiciones libres. Desmonta una llanta primero.</Alert>
          ) : (
            <TextField
              select label="Posición *" size="small" fullWidth value={form.posicion}
              onChange={e => setForm(f => ({ ...f, posicion: e.target.value }))}
              onMouseDown={markClick}
              SelectProps={{ onOpen: () => perfOpen('Posición Select'), MenuProps: { transitionDuration: 0 } }}
            >
              <MenuItem value="">Seleccionar…</MenuItem>
              {libres.map(p => <MenuItem key={p.codigo} value={p.codigo}>{p.label}</MenuItem>)}
            </TextField>
          )}
          <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
          <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={form.km_odometro} onChange={e => setForm(f => ({ ...f, km_odometro: e.target.value }))} />
          <TextField label="Técnico" size="small" fullWidth value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} />
          <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!form.neumatico_id || !form.posicion || !form.fecha || isPending}
          onClick={() => onSubmit({
            neumatico_id: Number(form.neumatico_id), posicion: form.posicion,
            fecha: new Date(form.fecha).toISOString(),
            km_odometro: form.km_odometro ? Number(form.km_odometro) : undefined,
            tecnico: form.tecnico || undefined, observaciones: form.observaciones || undefined,
          })}
          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
      </DialogActions>
    </Dialog>
    </Profiler>
  )
}

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
  const [bajaForm, setBajaForm] = useState({ fecha: nowLocal(), dano_id: '', motivo: '', motivo_fin_vida_id: '' })
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ ...EMPTY_NEUMATICO })
  const [histTire, setHistTire] = useState<Neumatico | null>(null)
  const [ejesOpen, setEjesOpen] = useState(false)
  const [ejesForm, setEjesForm] = useState({ esquema_id: '' })
  // Inspecciones
  const [inspDialog, setInspDialog] = useState<Neumatico | null>(null)   // llanta a inspeccionar
  const [chartTire, setChartTire] = useState<Neumatico | null>(null)     // llanta cuya gráfica/historial se ve
  const [rotDialog, setRotDialog] = useState<Neumatico | null>(null)     // llanta a intercambiar (rotación)
  const [rotTarget, setRotTarget] = useState<string>('')                 // llanta destino del intercambio
  const [voltearDialog, setVoltearDialog] = useState<Neumatico | null>(null)
  // Montaje por botón (alternativa al arrastrar y soltar)
  const [montarDialog, setMontarDialog] = useState<Neumatico | null>(null)
  const [montarForm, setMontarForm] = useState({ activo_id: '', posicion: '', fecha: nowLocal(), km_odometro: '', tecnico: '', observaciones: '' })
  // Agregar llanta desde bodega al vehículo seleccionado (desde "Llantas por Vehículo")
  const [agregarLlantaOpen, setAgregarLlantaOpen] = useState(false)
  // Rotación en el rin (misma posición, sin desmontar)
  const [rotRinDialog, setRotRinDialog] = useState<Neumatico | null>(null)
  const [rotRinForm, setRotRinForm] = useState({ fecha: nowLocal(), km_odometro: '', tecnico: '', observaciones: '' })
  // Inspección de sesión: todas las llantas montadas de un vehículo a la vez
  const [inspSesionOpen, setInspSesionOpen] = useState(false)
  const [inspSesionCabecera, setInspSesionCabecera] = useState({ fecha: nowLocal(), km_odometro: '', tecnico: '' })
  const [inspSesionRapido, setInspSesionRapido] = useState({ profundidad: '', presion: '' })
  const [inspSesionRows, setInspSesionRows] = useState<Record<number, { profundidad_izq: string; profundidad_centro: string; profundidad_der: string; presion_psi: string; estado_visual: string }>>({})
  const [inspSesionEnviando, setInspSesionEnviando] = useState(false)
  const EMPTY_INSP = { fecha: nowLocal(), profundidad_izq: '', profundidad_centro: '', profundidad_der: '', presion_psi: '', km_odometro: '', estado_visual: 'BUENO', tecnico: '', observaciones: '' }
  const [inspForm, setInspForm] = useState({ ...EMPTY_INSP })
  // Consultas
  const [consVeh, setConsVeh] = useState('')
  const [consUbic, setConsUbic] = useState('')
  const [consEstado, setConsEstado] = useState('')
  const [consBusca, setConsBusca] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importResult, setImportResult] = useState<{ total: number; exitosos: number; errores: any[] } | null>(null)
  // Inspecciones masivas por archivo plano
  const [inspImportOpen, setInspImportOpen] = useState(false)
  const [inspImportRows, setInspImportRows] = useState<any[]>([])
  const [inspImportResult, setInspImportResult] = useState<{ total: number; exitosos: number; errores: any[] } | null>(null)
  const inspFileInputRef = useRef<HTMLInputElement>(null)
  // Descartes (baja) masivos por archivo plano
  const [bajaImportOpen, setBajaImportOpen] = useState(false)
  const [bajaImportRows, setBajaImportRows] = useState<any[]>([])
  const [bajaImportResult, setBajaImportResult] = useState<{ total: number; exitosos: number; errores: any[] } | null>(null)
  const bajaFileInputRef = useRef<HTMLInputElement>(null)
  const [congelarOpen, setCongelarOpen] = useState(false)
  const [congelarDesc, setCongelarDesc] = useState('')
  const [congeladosOpen, setCongeladosOpen] = useState(false)
  const [congeladoDetalleId, setCongeladoDetalleId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Reencauche
  const [selLote, setSelLote] = useState<number | null>(null)
  const [loteOpen, setLoteOpen] = useState(false)
  const [loteForm, setLoteForm] = useState({ codigo: '', fecha_envio: new Date().toISOString().slice(0, 10), proveedor: '', remision: '', observaciones: '' })
  const [addTireLote, setAddTireLote] = useState('')
  const [procDialog, setProcDialog] = useState<null | DetalleReencauche>(null)
  const [procForm, setProcForm] = useState({ resultado: 'REENCAUCHADA', profundidad_nueva: '', vida_remanente_km: '', costo: '', dano_id: '', motivo_fin_vida_id: '' })
  // Configuración global
  const EMPTY_CFG: ConfigNeu = { montaje_estricto: true, profundidad_minima: 3, presion_min: 90, presion_max: 120, umbral_desalineacion: 2 }
  const [cfgForm, setCfgForm] = useState<ConfigNeu>({ ...EMPTY_CFG })
  // Catálogos nuevos: zonas, bandas de reencauche, motivos de fin de vida, ajustes
  const [zonaForm, setZonaForm] = useState({ codigo: '', nombre: '' })
  const [bandaForm, setBandaForm] = useState({ marca: '', referencia: '', dimension: '', profundidad_original: '', profundidad_minima: '', costo_defecto: '', reesculturable: false })
  const [motivoForm, setMotivoForm] = useState({ nombre: '', aplica_descarte: true, aplica_fin_vida: true })
  const [ajusteCatForm, setAjusteCatForm] = useState({ nombre: '' })
  // Trabajos y periodicidad
  const [trabajoForm, setTrabajoForm] = useState({ nombre: '', observaciones: '' })
  const [periodForm, setPeriodForm] = useState({ trabajo_id: '', tipo_activo: '', valor: '', unidad: 'KILOMETROS' })
  // Ajuste de valor aplicado a una llanta específica
  const [ajusteDialog, setAjusteDialog] = useState<Neumatico | null>(null)
  const [ajusteForm, setAjusteForm] = useState({ motivo_id: '', fecha: new Date().toISOString().slice(0, 10), valor: '', comentarios: '' })
  // Trabajo realizado sobre una llanta específica
  const [trabajoDialog, setTrabajoDialog] = useState<Neumatico | null>(null)
  const [trabajoRealForm, setTrabajoRealForm] = useState({ trabajo_id: '', fecha: nowLocal(), km_odometro: '', cantidad: '1', costo_unitario: '', proveedor: '', observaciones: '' })
  // Banda de reencauche seleccionada al agregar una llanta al lote
  const [addTireLoteBanda, setAddTireLoteBanda] = useState('')
  // Reesculturado
  const [rescDialog, setRescDialog] = useState<Neumatico | null>(null)
  const [rescForm, setRescForm] = useState({ fecha: nowLocal(), km_odometro: '', proveedor: '', costo: '', profundidad_nueva: '' })
  // Recuperar banda
  const [recBandaDialog, setRecBandaDialog] = useState<Neumatico | null>(null)
  const [recBandaForm, setRecBandaForm] = useState({ neumatico_destino_id: '', fecha: nowLocal(), mm_transferidos: '', costo_transferido: '', observaciones: '' })
  // Cambiar zona
  const [zonaDialog, setZonaDialog] = useState<Neumatico | null>(null)
  const [zonaCambioForm, setZonaCambioForm] = useState({ zona_id: '', fecha: nowLocal(), observaciones: '' })
  // Vidas de la llanta
  const [vidasDialog, setVidasDialog] = useState<Neumatico | null>(null)
  const [informeTab, setInformeTab] = useState(0)

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({ queryKey: ['eam-activos'], queryFn: () => api.get('/eam/activos').then(r => r.data) })
  // Vehículos seleccionables en "Llantas por Vehículo": no solo activos EAM, también
  // vehículos de TMS/Flota (jerarquía por tipo de activo: usa_llantas=true) — ver
  // VehiculosCombinados.tsx / sección Activos del CMMS, que es donde se configuran
  // ejes/repuesto y se vinculan al CMMS.
  const [vehSelKey, setVehSelKey] = useState<string>('')
  const { data: vehiculosDisponibles = [] } = useQuery<VehiculoCombinado[]>({
    queryKey: ['eam-vehiculos-disponibles'],
    queryFn: () => api.get('/eam/vehiculos-combinados', { params: { usa_llantas: true } }).then(r => r.data),
  })
  const mutVincularVeh = useMutation({
    mutationFn: (v: VehiculoCombinado) => api.post('/eam/activos/vincular-externo', { origen: v.origen, origen_id: v.id }).then(r => r.data),
    onSuccess: (activo) => {
      qc.invalidateQueries({ queryKey: ['eam-activos'] })
      qc.invalidateQueries({ queryKey: ['eam-vehiculos-disponibles'] })
      setVehId(String(activo.id))
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo vincular el vehículo al CMMS'),
  })
  const seleccionarVehiculo = (key: string) => {
    setVehSelKey(key)
    if (!key) { setVehId(''); return }
    const v = vehiculosDisponibles.find(x => `${x.origen}:${x.id}` === key)
    if (!v) return
    if (v.activo_id) setVehId(String(v.activo_id))
    else mutVincularVeh.mutate(v)
  }
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
  const { data: montarLayout = [] } = useQuery<Posicion[]>({
    queryKey: ['eam-layout', montarForm.activo_id],
    queryFn: () => api.get(`/eam/neumaticos/layout/${montarForm.activo_id}`).then(r => r.data),
    enabled: !!montarForm.activo_id,
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
  // Catálogos de configuración
  const { data: zonas = [] } = useQuery<ZonaNeu[]>({ queryKey: ['eam-zonas-neu'], queryFn: () => api.get('/eam/neumaticos/zonas').then(r => r.data) })
  const { data: bandas = [] } = useQuery<BandaReencauche[]>({ queryKey: ['eam-bandas-reenc'], queryFn: () => api.get('/eam/neumaticos/bandas-reencauche').then(r => r.data) })
  const { data: motivosFinVida = [] } = useQuery<MotivoFinVida[]>({ queryKey: ['eam-motivos-fv'], queryFn: () => api.get('/eam/neumaticos/motivos-fin-vida').then(r => r.data) })
  const { data: ajustesCat = [] } = useQuery<AjusteCatalogo[]>({ queryKey: ['eam-ajustes-cat'], queryFn: () => api.get('/eam/neumaticos/ajustes-catalogo').then(r => r.data) })
  const { data: esquemas = [] } = useQuery<EsquemaVehiculo[]>({ queryKey: ['eam-esquemas'], queryFn: () => api.get('/eam/neumaticos/esquemas').then(r => r.data) })
  const { data: trabajosCat = [] } = useQuery<TrabajoNeu[]>({ queryKey: ['eam-trabajos-cat'], queryFn: () => api.get('/eam/neumaticos/trabajos').then(r => r.data) })
  const { data: periodicidades = [] } = useQuery<PeriodicidadTrabajo[]>({ queryKey: ['eam-periodicidad'], queryFn: () => api.get('/eam/neumaticos/trabajos/periodicidad').then(r => r.data) })
  const { data: ajustesNeu = [] } = useQuery<AjusteNeu[]>({
    queryKey: ['eam-ajustes-neu', ajusteDialog?.id],
    queryFn: () => api.get(`/eam/neumaticos/${ajusteDialog!.id}/ajustes`).then(r => r.data),
    enabled: !!ajusteDialog,
  })
  const { data: trabajosRealizados = [] } = useQuery<TrabajoRealizado[]>({
    queryKey: ['eam-trabajos-neu', trabajoDialog?.id],
    queryFn: () => api.get(`/eam/neumaticos/${trabajoDialog!.id}/trabajos`).then(r => r.data),
    enabled: !!trabajoDialog,
  })
  const { data: reesculturados = [] } = useQuery<Reesculturado[]>({
    queryKey: ['eam-resc-neu', rescDialog?.id],
    queryFn: () => api.get(`/eam/neumaticos/${rescDialog!.id}/reesculturados`).then(r => r.data),
    enabled: !!rescDialog,
  })
  const { data: vidasNeu = [] } = useQuery<VidaNeu[]>({
    queryKey: ['eam-vidas-neu', vidasDialog?.id],
    queryFn: () => api.get(`/eam/neumaticos/${vidasDialog!.id}/vidas`).then(r => r.data),
    enabled: !!vidasDialog,
  })
  const { data: informeNeu } = useQuery<any>({
    queryKey: ['eam-informe-neu', vidasDialog?.id],
    queryFn: () => api.get(`/eam/neumaticos/${vidasDialog!.id}/informe`).then(r => r.data),
    enabled: !!vidasDialog,
  })
  const { data: historicoNeu } = useQuery<any>({
    queryKey: ['eam-historico-neu', vidasDialog?.id],
    queryFn: () => api.get(`/eam/neumaticos/${vidasDialog!.id}/historico`).then(r => r.data),
    enabled: !!vidasDialog,
  })
  const { data: congelados = [] } = useQuery<{ id: number; fecha: string; descripcion?: string | null }[]>({
    queryKey: ['eam-congelados'],
    queryFn: () => api.get('/eam/neumaticos/congelados').then(r => r.data),
    enabled: congeladosOpen,
  })
  const { data: congeladoDetalle = [] } = useQuery<any[]>({
    queryKey: ['eam-congelado-detalle', congeladoDetalleId],
    queryFn: () => api.get(`/eam/neumaticos/congelados/${congeladoDetalleId}/detalle`).then(r => r.data),
    enabled: !!congeladoDetalleId,
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
  // Asigna una categoría de ejes/llantas ya pre-configurada (esquema) al vehículo
  // seleccionado — no se digitan números eje por eje aquí, esa configuración vive
  // en Activos ("Esquemas de vehículo").
  const mutEjes = useMutation({
    mutationFn: (esquema_id: number) => api.post('/eam/neumaticos/esquemas/asignar', { activo_id: Number(vehId), esquema_id, fecha_vigencia: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { toast.success('Categoría de ejes/llantas asignada'); qc.invalidateQueries({ queryKey: ['eam-activos'] }); qc.invalidateQueries({ queryKey: ['eam-layout'] }); setEjesOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al asignar la categoría'),
  })
  const abrirEjes = () => { setEjesForm({ esquema_id: '' }); setEjesOpen(true) }

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
  // Zonas
  const mutZona = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/zonas', b),
    onSuccess: () => { toast.success('Zona creada'); qc.invalidateQueries({ queryKey: ['eam-zonas-neu'] }); setZonaForm({ codigo: '', nombre: '' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear zona'),
  })
  const mutZonaDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/zonas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-zonas-neu'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  // Bandas de reencauche
  const mutBanda = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/bandas-reencauche', b),
    onSuccess: () => { toast.success('Banda creada'); qc.invalidateQueries({ queryKey: ['eam-bandas-reenc'] }); setBandaForm({ marca: '', referencia: '', dimension: '', profundidad_original: '', profundidad_minima: '', costo_defecto: '', reesculturable: false }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear banda'),
  })
  const mutBandaDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/bandas-reencauche/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-bandas-reenc'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  // Motivos de fin de vida
  const mutMotivo = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/motivos-fin-vida', b),
    onSuccess: () => { toast.success('Motivo creado'); qc.invalidateQueries({ queryKey: ['eam-motivos-fv'] }); setMotivoForm({ nombre: '', aplica_descarte: true, aplica_fin_vida: true }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear motivo'),
  })
  const mutMotivoDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/motivos-fin-vida/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-motivos-fv'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  // Ajustes: catálogo de motivos + aplicación por llanta
  const mutAjusteCat = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/ajustes-catalogo', b),
    onSuccess: () => { toast.success('Categoría de ajuste creada'); qc.invalidateQueries({ queryKey: ['eam-ajustes-cat'] }); setAjusteCatForm({ nombre: '' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear'),
  })
  const mutAjusteCatDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/ajustes-catalogo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-ajustes-cat'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  const mutAjusteAplicar = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post(`/eam/neumaticos/${ajusteDialog!.id}/ajustes`, b),
    onSuccess: () => {
      toast.success('Ajuste aplicado')
      qc.invalidateQueries({ queryKey: ['eam-ajustes-neu'] })
      qc.invalidateQueries({ queryKey: ['eam-indic'] })
      setAjusteForm({ motivo_id: '', fecha: new Date().toISOString().slice(0, 10), valor: '', comentarios: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al aplicar el ajuste'),
  })
  // Trabajos y periodicidad
  const mutTrabajo = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/trabajos', b),
    onSuccess: () => { toast.success('Trabajo creado'); qc.invalidateQueries({ queryKey: ['eam-trabajos-cat'] }); setTrabajoForm({ nombre: '', observaciones: '' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear trabajo'),
  })
  const mutTrabajoDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/trabajos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-trabajos-cat'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  const mutPeriodicidad = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/trabajos/periodicidad', b),
    onSuccess: () => { toast.success('Periodicidad creada'); qc.invalidateQueries({ queryKey: ['eam-periodicidad'] }); setPeriodForm({ trabajo_id: '', tipo_activo: '', valor: '', unidad: 'KILOMETROS' }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear periodicidad'),
  })
  const mutPeriodicidadDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/trabajos/periodicidad/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-periodicidad'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  const mutTrabajoRealizado = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post(`/eam/neumaticos/${trabajoDialog!.id}/trabajos`, b),
    onSuccess: () => {
      toast.success('Trabajo registrado')
      qc.invalidateQueries({ queryKey: ['eam-trabajos-neu'] })
      setTrabajoRealForm({ trabajo_id: '', fecha: nowLocal(), km_odometro: '', cantidad: '1', costo_unitario: '', proveedor: '', observaciones: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al registrar el trabajo'),
  })
  // Reesculturado
  const mutResc = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post(`/eam/neumaticos/${rescDialog!.id}/reesculturar`, b),
    onSuccess: () => {
      toast.success('Reesculturado registrado')
      qc.invalidateQueries({ queryKey: ['eam-resc-neu'] })
      invalidarNeu()
      setRescForm({ fecha: nowLocal(), km_odometro: '', proveedor: '', costo: '', profundidad_nueva: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al reesculturar'),
  })
  const mutDeshacerResc = useMutation({
    mutationFn: (id: number) => api.put(`/eam/neumaticos/reesculturado/${id}/deshacer`),
    onSuccess: () => { toast.success('Reesculturado deshecho'); qc.invalidateQueries({ queryKey: ['eam-resc-neu'] }); invalidarNeu() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo deshacer'),
  })
  // Recuperar banda
  const mutRecBanda = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post(`/eam/neumaticos/${recBandaDialog!.id}/recuperar-banda`, b),
    onSuccess: () => {
      toast.success('Banda recuperada exitosamente')
      invalidarNeu()
      qc.invalidateQueries({ queryKey: ['eam-mov'] })
      setRecBandaDialog(null)
      setRecBandaForm({ neumatico_destino_id: '', fecha: nowLocal(), mm_transferidos: '', costo_transferido: '', observaciones: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al recuperar la banda'),
  })
  // Cambiar zona
  const mutCambiarZona = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post(`/eam/neumaticos/${zonaDialog!.id}/cambiar-zona`, b),
    onSuccess: () => {
      toast.success('Zona actualizada')
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      qc.invalidateQueries({ queryKey: ['eam-mov'] })
      setZonaDialog(null)
      setZonaCambioForm({ zona_id: '', fecha: nowLocal(), observaciones: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al cambiar la zona'),
  })
  // Congelar datos
  const mutCongelar = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/congelar', b),
    onSuccess: () => {
      toast.success('Datos congelados exitosamente')
      qc.invalidateQueries({ queryKey: ['eam-congelados'] })
      setCongelarOpen(false); setCongelarDesc('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al congelar datos'),
  })
  const mutDeleteCongelado = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/congelados/${id}`),
    onSuccess: () => { toast.success('Congelado eliminado'); qc.invalidateQueries({ queryKey: ['eam-congelados'] }) },
    onError: () => toast.error('No se pudo eliminar'),
  })
  // Importación masiva
  const mutImportar = useMutation({
    mutationFn: (items: any[]) => api.post('/eam/neumaticos/bulk', { items }).then(r => r.data),
    onSuccess: (data) => {
      setImportResult(data)
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      if (data.exitosos > 0) toast.success(`${data.exitosos} de ${data.total} llantas creadas`)
      if (data.errores?.length) toast.error(`${data.errores.length} filas con errores`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error en la importación'),
  })
  // Eliminación masiva
  const mutBulkDelete = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/bulk-delete', { ids: Array.from(selectedIds), confirmacion: bulkDeleteConfirm }),
    onSuccess: (r: any) => {
      toast.success(`${r.data.eliminados} llantas eliminadas`)
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      setSelectedIds(new Set()); setBulkDeleteOpen(false); setBulkDeleteConfirm('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al eliminar'),
  })
  // Inspecciones masivas
  const mutImportarInsp = useMutation({
    mutationFn: (items: any[]) => api.post('/eam/neumaticos/inspecciones/bulk', { items }).then(r => r.data),
    onSuccess: (data) => {
      setInspImportResult(data)
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      qc.invalidateQueries({ queryKey: ['eam-indic'] })
      qc.invalidateQueries({ queryKey: ['eam-alertas'] })
      qc.invalidateQueries({ queryKey: ['eam-insp'] })
      if (data.exitosos > 0) toast.success(`${data.exitosos} de ${data.total} inspecciones registradas`)
      if (data.errores?.length) toast.error(`${data.errores.length} filas con errores`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error en la importación'),
  })
  // Descartes (baja) masivos
  const mutImportarBaja = useMutation({
    mutationFn: (items: any[]) => api.post('/eam/neumaticos/baja/bulk', { items }).then(r => r.data),
    onSuccess: (data) => {
      setBajaImportResult(data)
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      qc.invalidateQueries({ queryKey: ['eam-indic'] })
      qc.invalidateQueries({ queryKey: ['eam-alertas'] })
      if (data.exitosos > 0) toast.success(`${data.exitosos} de ${data.total} llantas dadas de baja`)
      if (data.errores?.length) toast.error(`${data.errores.length} filas con errores`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error en la importación'),
  })

  const descargarPlantillaImportacion = () => {
    const headers = ['codigo', 'marca', 'referencia', 'medida', 'tipo_uso', 'bodega', 'costo', 'proveedor', 'profundidad_diseño', 'profundidad_actual', 'vida_util_km', 'presion_recomendada', 'dot', 'tipo_rin']
    const ejemplo = ['LL-1001', 'Michelin', 'XZA2', '295/80R22.5', 'TRACCION', bodegas[0]?.nombre ?? '', 950000, 'Distribuidora XYZ', 18, 18, 90000, 110, '2523', 'ACERO']
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Llantas')
    XLSX.writeFile(wb, 'plantilla_importacion_llantas.xlsx')
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })
      setImportRows(rows)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const confirmarImportacion = () => {
    const items = importRows.map(row => {
      const bodega = bodegas.find(b => b.nombre?.toLowerCase() === String(row.bodega ?? '').toLowerCase())
      return {
        codigo: String(row.codigo ?? '').trim(),
        marca: row.marca || undefined, referencia: row.referencia || undefined, medida: row.medida || undefined,
        tipo_uso: row.tipo_uso || undefined, bodega_id: bodega?.id, estado: 'ALMACENADO',
        costo: row.costo ? Number(row.costo) : undefined, proveedor: row.proveedor || undefined,
        profundidad_diseño: row['profundidad_diseño'] ? Number(row['profundidad_diseño']) : undefined,
        profundidad_actual: row.profundidad_actual ? Number(row.profundidad_actual) : undefined,
        vida_util_km: row.vida_util_km ? Number(row.vida_util_km) : undefined,
        presion_recomendada: row.presion_recomendada ? Number(row.presion_recomendada) : undefined,
        dot: row.dot || undefined, tipo_rin: row.tipo_rin || undefined,
      }
    }).filter(i => i.codigo)
    mutImportar.mutate(items)
  }

  const parseFechaExcel = (v: unknown) => {
    const d = new Date(String(v ?? ''))
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  }

  // ── Inspecciones masivas por archivo plano ──
  const descargarPlantillaInspecciones = () => {
    const headers = ['codigo', 'fecha', 'profundidad_izq', 'profundidad_centro', 'profundidad_der', 'presion_psi', 'km_odometro', 'estado_visual', 'tecnico', 'observaciones']
    const ejemplo = ['LL-1001', '2026-08-18 08:00', 7.5, 8, 7.8, 110, 125000, 'BUENO', 'Juan Pérez', '']
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inspecciones')
    XLSX.writeFile(wb, 'plantilla_inspecciones_masivas.xlsx')
  }

  const handleImportInspFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setInspImportResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })
      setInspImportRows(rows)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const confirmarImportacionInsp = () => {
    const items = inspImportRows.map(row => ({
      codigo: String(row.codigo ?? '').trim(),
      fecha: parseFechaExcel(row.fecha),
      profundidad_izq: row.profundidad_izq ? Number(row.profundidad_izq) : undefined,
      profundidad_centro: row.profundidad_centro ? Number(row.profundidad_centro) : undefined,
      profundidad_der: row.profundidad_der ? Number(row.profundidad_der) : undefined,
      presion_psi: row.presion_psi ? Number(row.presion_psi) : undefined,
      km_odometro: row.km_odometro ? Number(row.km_odometro) : undefined,
      estado_visual: row.estado_visual || undefined,
      tecnico: row.tecnico || undefined,
      observaciones: row.observaciones || undefined,
    })).filter(i => i.codigo)
    mutImportarInsp.mutate(items)
  }

  // ── Descartes (baja) masivos por archivo plano ──
  const descargarPlantillaBajas = () => {
    const headers = ['codigo', 'fecha', 'dano', 'motivo_fin_vida', 'motivo', 'km_odometro']
    const ejemplo = ['LL-1001', '2026-08-18', danos[0]?.nombre ?? '', motivosFinVida[0]?.nombre ?? '', 'Desgaste irregular', 125000]
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Descartes')
    XLSX.writeFile(wb, 'plantilla_descartes_masivos.xlsx')
  }

  const handleImportBajaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBajaImportResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })
      setBajaImportRows(rows)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const confirmarImportacionBaja = () => {
    const items = bajaImportRows.map(row => {
      const dano = danos.find(d => d.nombre?.toLowerCase() === String(row.dano ?? '').toLowerCase())
      const motivoFV = motivosFinVida.find(m => m.nombre?.toLowerCase() === String(row.motivo_fin_vida ?? '').toLowerCase())
      return {
        codigo: String(row.codigo ?? '').trim(),
        fecha: parseFechaExcel(row.fecha),
        dano_id: dano?.id, motivo_fin_vida_id: motivoFV?.id,
        motivo: row.motivo || undefined,
        km_odometro: row.km_odometro ? Number(row.km_odometro) : undefined,
      }
    }).filter(i => i.codigo)
    mutImportarBaja.mutate(items)
  }

  const toggleSeleccionTodas = (ids: number[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => checked ? next.add(id) : next.delete(id))
      return next
    })
  }
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
  const confirmarMontar = () => {
    if (!montarDialog || !montarForm.activo_id || !montarForm.posicion) return
    mutMov.mutate({
      neumatico_id: montarDialog.id,
      tipo_movimiento: 'INSTALACION',
      fecha: new Date(montarForm.fecha).toISOString(),
      activo_id: Number(montarForm.activo_id),
      posicion: montarForm.posicion,
      km_odometro: montarForm.km_odometro ? Number(montarForm.km_odometro) : undefined,
      tecnico: montarForm.tecnico || undefined,
      observaciones: montarForm.observaciones || undefined,
    })
    setMontarDialog(null)
  }
  const confirmarRotacionRin = () => {
    if (!rotRinDialog) return
    mutMov.mutate({
      neumatico_id: rotRinDialog.id,
      tipo_movimiento: 'ROTACION',
      fecha: new Date(rotRinForm.fecha).toISOString(),
      activo_id: rotRinDialog.activo_id ?? undefined,
      posicion: rotRinDialog.posicion ?? undefined,
      km_odometro: rotRinForm.km_odometro ? Number(rotRinForm.km_odometro) : undefined,
      tecnico: rotRinForm.tecnico || undefined,
      observaciones: rotRinForm.observaciones || `Rotación en el rin (posición ${rotRinDialog.posicion ?? ''}, sin desmontar)`,
    })
    setRotRinDialog(null)
  }
  const abrirInspSesion = (montadas: Neumatico[], odometroActual?: number | null) => {
    setInspSesionCabecera({ fecha: nowLocal(), km_odometro: odometroActual != null ? String(odometroActual) : '', tecnico: '' })
    setInspSesionRapido({ profundidad: '', presion: '' })
    const rows: typeof inspSesionRows = {}
    montadas.forEach(t => { rows[t.id] = { profundidad_izq: '', profundidad_centro: '', profundidad_der: '', presion_psi: '', estado_visual: 'BUENO' } })
    setInspSesionRows(rows)
    setInspSesionOpen(true)
  }
  const aplicarRapidoATodos = () => {
    setInspSesionRows(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(id => {
        const row = next[Number(id)]
        next[Number(id)] = {
          ...row,
          profundidad_izq: row.profundidad_izq || inspSesionRapido.profundidad,
          profundidad_centro: row.profundidad_centro || inspSesionRapido.profundidad,
          profundidad_der: row.profundidad_der || inspSesionRapido.profundidad,
          presion_psi: row.presion_psi || inspSesionRapido.presion,
        }
      })
      return next
    })
  }
  const enviarInspSesion = async () => {
    setInspSesionEnviando(true)
    const entradas = Object.entries(inspSesionRows).filter(([, r]) => r.profundidad_izq || r.profundidad_centro || r.profundidad_der || r.presion_psi)
    try {
      for (const [nid, r] of entradas) {
        await api.post(`/eam/neumaticos/${nid}/inspecciones`, {
          fecha: inspSesionCabecera.fecha,
          profundidad_izq: r.profundidad_izq ? Number(r.profundidad_izq) : undefined,
          profundidad_centro: r.profundidad_centro ? Number(r.profundidad_centro) : undefined,
          profundidad_der: r.profundidad_der ? Number(r.profundidad_der) : undefined,
          presion_psi: r.presion_psi ? Number(r.presion_psi) : undefined,
          km_odometro: inspSesionCabecera.km_odometro ? Number(inspSesionCabecera.km_odometro) : undefined,
          estado_visual: r.estado_visual, tecnico: inspSesionCabecera.tecnico || undefined,
        })
      }
      toast.success(`${entradas.length} inspecciones registradas`)
      invalidarNeu()
      qc.invalidateQueries({ queryKey: ['eam-insp'] })
      setInspSesionOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Error al registrar alguna inspección')
    } finally {
      setInspSesionEnviando(false)
    }
  }
  const confirmarBaja = () => {
    if (!bajaDialog) return
    mutMov.mutate({
      neumatico_id: bajaDialog.id, tipo_movimiento: 'BAJA',
      fecha: new Date(bajaForm.fecha).toISOString(),
      dano_id: bajaForm.dano_id ? Number(bajaForm.dano_id) : undefined,
      motivo_fin_vida_id: bajaForm.motivo_fin_vida_id ? Number(bajaForm.motivo_fin_vida_id) : undefined,
      motivo: bajaForm.motivo || undefined,
    })
    setBajaDialog(null)
  }

  // ─── Tarjeta de llanta (draggable) ──────────────────────────────────────────
  const TireCard = ({ n, compact }: { n: Neumatico; compact?: boolean }) => (
    <Box
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(n.id)); setDraggedTire(n) }}
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
          <Tooltip title="Montar en vehículo"><IconButton size="small" sx={{ p: 0.25, color: EAM_COLOR }} onClick={() => { setMontarForm({ activo_id: veh ? String(veh.id) : '', posicion: '', fecha: nowLocal(), km_odometro: '', tecnico: '', observaciones: '' }); setMontarDialog(n) }}><DirectionsCar sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Historial"><IconButton size="small" onClick={() => setHistTire(n)} sx={{ p: 0.25 }}><HistoryIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Dar de baja"><IconButton size="small" color="error" onClick={() => { setBajaForm({ fecha: nowLocal(), dano_id: '', motivo: '', motivo_fin_vida_id: '' }); setBajaDialog(n) }} sx={{ p: 0.25 }}><DeleteForever sx={{ fontSize: 14 }} /></IconButton></Tooltip>
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
          onDragStart={e => { if (t) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); setDraggedTire(t) } }}
          onDragEnd={() => setDraggedTire(null)}
          onClick={(e) => { if (t) setSlotMenu({ anchor: e.currentTarget, tire: t, pos: pos.codigo }) }}
          onDragOver={(e) => { e.preventDefault(); setOverSlot(pos.codigo) }}
          onDragLeave={() => setOverSlot('')}
          onDrop={e => { e.preventDefault(); soltarEnPosicion(pos.codigo) }}
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
          {[0, 1, 5].includes(tab) && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Registrar llanta</Button>
          )}
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: '1px solid #E5E7EB', '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { bgcolor: EAM_COLOR } }}>
          <Tab icon={<DirectionsCar sx={{ fontSize: 18 }} />} iconPosition="start" label="Llantas por Vehículo" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Bodega (${almacen.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<TrendingUp sx={{ fontSize: 18 }} />} iconPosition="start" label="Indicadores / CPK" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Badge badgeContent={alertas.length} color="error"><NotificationsActive sx={{ fontSize: 18 }} /></Badge>} iconPosition="start" label="Alertas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Autorenew sx={{ fontSize: 18 }} />} iconPosition="start" label="Reencauche" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Inventory2 sx={{ fontSize: 18 }} />} iconPosition="start" label="Consultas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Recycling sx={{ fontSize: 18 }} />} iconPosition="start" label={`Descarte (${descarte.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Configuración" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {/* ── TAB 0: Llantas por Vehículo (diagrama + montaje/desmontaje + rotación + inspección) ── */}
        {tab === 0 && (() => {
          const montadas = layout.map(p => tireEn(p.codigo)).filter((t): t is Neumatico => !!t)
          // Cualquier diálogo abierto desde esta pestaña tapa el diagrama y la tabla de detalle
          // (llenos de Tooltips) con su backdrop de todas formas; se desmontan mientras tanto para
          // que abrir un select/autocomplete de CUALQUIER diálogo no tenga que recalcular
          // layout/estilos de todo este árbol pesado.
          // Nota: slotMenu es un <Menu> anclado (menú contextual pequeño), no un <Dialog> de
          // pantalla completa con backdrop — no se incluye aquí porque el diagrama debe seguir
          // visible alrededor de él.
          const algunDialogoAbierto = agregarLlantaOpen || inspImportOpen || !!movDialog ||
            !!bajaDialog || !!histTire || ejesOpen || !!inspDialog || !!chartTire || !!rotDialog ||
            !!voltearDialog || !!montarDialog || !!rotRinDialog || inspSesionOpen ||
            !!ajusteDialog || !!trabajoDialog || !!zonaDialog || !!vidasDialog
          return (
          <Stack spacing={2}>
          {!algunDialogoAbierto && <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" gap={1} alignItems="center" mb={2} flexWrap="wrap">
                    <TextField
                      select size="small" label="Vehículo" value={vehSelKey}
                      onChange={e => seleccionarVehiculo(e.target.value)}
                      disabled={mutVincularVeh.isPending}
                      helperText={mutVincularVeh.isPending ? 'Vinculando al CMMS…' : undefined}
                      sx={{ minWidth: 320 }}
                    >
                      <MenuItem value="">Seleccionar vehículo…</MenuItem>
                      {vehiculosDisponibles.map(v => (
                        <MenuItem key={`${v.origen}:${v.id}`} value={`${v.origen}:${v.id}`}>
                          {v.placa ?? v.tipo ?? '—'}{v.marca ? ` — ${v.marca}` : ''}{v.modelo ? ` ${v.modelo}` : ''}
                          {v.origen !== 'EAM' ? ` · ${v.origen}` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                    {veh && (
                      <Button size="small" variant="outlined" startIcon={<SwapIcon />} onClick={abrirEjes} sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), textTransform: 'none' }}>
                        Configurar ejes{veh.numero_ejes ? ` (${veh.numero_ejes})` : ''}
                      </Button>
                    )}
                    {veh && veh.numero_ejes && (
                      <Button
                        size="small" variant="contained" startIcon={<AddIcon />}
                        onClick={() => setAgregarLlantaOpen(true)}
                        sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none' }}
                      >
                        Agregar llanta desde bodega
                      </Button>
                    )}
                    <Button
                      size="small" variant="outlined" startIcon={<UploadFile />}
                      onClick={() => setInspImportOpen(true)}
                      sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), textTransform: 'none' }}
                    >
                      Importar inspecciones (Excel)
                    </Button>
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
                onDrop={e => { e.preventDefault(); soltarEnBodega() }}
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

          {veh && veh.numero_ejes && (
            <Card sx={{ bgcolor: '#FFFFFF' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} mb={2} flexWrap="wrap">
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Straighten sx={{ color: EAM_DARK }} />
                    <Typography fontWeight={700}>Detalle e inspección de llantas montadas</Typography>
                  </Stack>
                  <Button
                    size="small" variant="contained" startIcon={<Straighten />}
                    disabled={montadas.length === 0}
                    onClick={() => abrirInspSesion(montadas, veh.odometro_actual)}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none' }}
                  >
                    Nueva inspección ({montadas.length} llantas)
                  </Button>
                </Stack>

                {/* Ficha del vehículo */}
                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    {[
                      ['Vehículo', `${veh.codigo}${veh.placa ? ` · ${veh.placa}` : ''}`],
                      ['Marca', veh.marca ?? '—'],
                      ['Tipo', veh.tipo_activo ?? '—'],
                      ['Motor', veh.motor_marca ? `${veh.motor_marca}${veh.motor_linea ? ` ${veh.motor_linea}` : ''}${veh.motor_cc ? ` (${veh.motor_cc.toLocaleString('es-CO')}cc)` : ''}` : '—'],
                      ['Odómetro', veh.odometro_actual != null ? `${veh.odometro_actual.toLocaleString('es-CO')} km` : '—'],
                      ['Ejes', `${veh.numero_ejes ?? '—'}`],
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
                      {layout.map(p => {
                        const t = tireEn(p.codigo)
                        const cfg = cfgForm
                        const bajo = t?.profundidad_actual != null && t.profundidad_actual <= cfg.profundidad_minima
                        const dualPos = /-(INT|EXT)$/.test(p.codigo)   // posición dual (permite volteo)
                        return (
                          <TableRow key={p.codigo} hover>
                            <TableCell>
                              <Tooltip title={p.label}>
                                <Chip size="small" label={p.numero != null ? `Pos. ${p.numero}` : 'Repuesto'} sx={{ fontSize: 10 }} />
                              </Tooltip>
                            </TableCell>
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
                                  <Tooltip title="Crear inspección"><IconButton size="small" onClick={() => { setInspForm({ ...EMPTY_INSP, km_odometro: veh.odometro_actual != null ? String(veh.odometro_actual) : '' }); setInspDialog(t) }} sx={{ color: EAM_COLOR }}><Straighten sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                  <Tooltip title="Rotar (intercambiar posición)"><IconButton size="small" onClick={() => { setRotTarget(''); setRotDialog(t) }} sx={{ color: '#D97706' }}><SwapIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                  <Tooltip title="Rotación en el rin (misma posición)"><IconButton size="small" onClick={() => { setRotRinForm({ fecha: nowLocal(), km_odometro: veh.odometro_actual != null ? String(veh.odometro_actual) : '', tecnico: '', observaciones: '' }); setRotRinDialog(t) }} sx={{ color: '#D97706' }}><Autorenew sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                  <Tooltip title={dualPos ? 'Voltear (invertir interno↔externo)' : 'El volteo aplica a llantas duales'}><span><IconButton size="small" disabled={!dualPos} onClick={() => setVoltearDialog(t)} sx={{ color: '#7C3AED' }}><Autorenew sx={{ fontSize: 17 }} /></IconButton></span></Tooltip>
                                  <Tooltip title="Gráfica / historial"><IconButton size="small" onClick={() => setChartTire(t)} sx={{ color: '#2563EB' }}><ShowChart sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                  <Tooltip title="Desmontar a bodega"><IconButton size="small" onClick={() => { setMovForm({ fecha: nowLocal(), km_odometro: '', bodega_id: '', tecnico: '', observaciones: '' }); setMovDialog({ tire: t, tipo: 'DESMONTAJE' }) }} sx={{ color: '#64748B' }}><WarehouseIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {layout.length === 0 && <TableRow><TableCell colSpan={10} align="center"><Typography color="text.secondary" py={2}>Sin posiciones configuradas para este vehículo.</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}
          </>}
          </Stack>
          )
        })()}

        {/* ── TAB 1: Bodega ── */}
        {tab === 1 && (
          <Stack spacing={2}>
          <Stack direction="row" justifyContent="flex-end">
            <Button size="small" variant="outlined" startIcon={<UploadFile />} onClick={() => setImportOpen(true)} sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), textTransform: 'none' }}>
              Importar Excel (llantas nuevas)
            </Button>
          </Stack>
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
                        {n.estado === 'ALMACENADO' && (
                          <Tooltip title="Montar en vehículo">
                            <IconButton size="small" sx={{ color: EAM_COLOR }} onClick={() => { setMontarForm({ activo_id: '', posicion: '', fecha: nowLocal(), km_odometro: '', tecnico: '', observaciones: '' }); setMontarDialog(n) }}>
                              <DirectionsCar sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Historial"><IconButton size="small" onClick={() => setHistTire(n)}><HistoryIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        <Tooltip title="Dar de baja"><IconButton size="small" color="error" onClick={() => { setBajaForm({ fecha: nowLocal(), dano_id: '', motivo: '', motivo_fin_vida_id: '' }); setBajaDialog(n) }}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {almacen.length === 0 && <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={2}>Sin llantas en almacén</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
          </Card>
          </Stack>
        )}

        {/* ── TAB 2: Indicadores / CPK ── */}
        {tab === 2 && (
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

        {/* ── TAB 3: Alertas ── */}
        {tab === 3 && (
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

        {/* ── TAB 4: Reencauche ── */}
        {tab === 4 && (
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
                            <TextField select size="small" label="Banda de reencauche" value={addTireLoteBanda} onChange={e => setAddTireLoteBanda(e.target.value)} sx={{ minWidth: 220 }}>
                              <MenuItem value="">Sin especificar</MenuItem>
                              {bandas.filter(b => b.activo).map(b => <MenuItem key={b.id} value={String(b.id)}>{b.marca} {b.referencia ?? ''} · {b.dimension ?? ''}</MenuItem>)}
                            </TextField>
                            <Button size="small" variant="contained" disabled={!addTireLote || mutAddDet.isPending} onClick={() => { mutAddDet.mutate({ neumatico_id: Number(addTireLote), banda_id: addTireLoteBanda ? Number(addTireLoteBanda) : undefined }); setAddTireLoteBanda('') }} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none' }}>Agregar</Button>
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
                                        <Button size="small" variant="text" onClick={() => { setProcForm({ resultado: 'REENCAUCHADA', profundidad_nueva: '', vida_remanente_km: '', costo: '', dano_id: '', motivo_fin_vida_id: '' }); setProcDialog(d) }} sx={{ textTransform: 'none', color: EAM_COLOR }}>Procesar</Button>
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

        {/* ── TAB 5: Consultas (por vehículo / llanta / ubicación / total) ── */}
        {tab === 5 && (() => {
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
              if (![n.codigo, n.marca, n.referencia, n.medida, n.proveedor].some(x => (x ?? '').toLowerCase().includes(q))) return false
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
          const idsVisibles = filtradas.map(n => n.id)
          const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every(id => selectedIds.has(id))
          return (
            <Card sx={{ bgcolor: '#FFFFFF' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Inventory2 sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Consulta general de llantas ({filtradas.length} de {neumaticos.length})</Typography>
                  </Stack>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {selectedIds.size > 0 && (
                      <Button size="small" variant="contained" color="error" startIcon={<DeleteForever />} onClick={() => setBulkDeleteOpen(true)} sx={{ textTransform: 'none' }}>
                        Eliminar seleccionadas ({selectedIds.size})
                      </Button>
                    )}
                    <Button size="small" variant="outlined" startIcon={<CameraAlt />} onClick={() => setCongelarOpen(true)} sx={{ textTransform: 'none' }}>Congelar datos</Button>
                    <Button size="small" variant="outlined" startIcon={<Checklist />} onClick={() => setCongeladosOpen(true)} sx={{ textTransform: 'none' }}>Ver congelados</Button>
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
                  <TextField size="small" label="Buscar (código, marca, medida, proveedor…)" value={consBusca} onChange={e => setConsBusca(e.target.value)} sx={{ minWidth: 240, flex: 1 }} />
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={todasSeleccionadas} onChange={e => toggleSeleccionTodas(idsVisibles, e.target.checked)} />
                      </TableCell>
                      {columnas.map(c => <TableCell key={c.key} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{c.header}</TableCell>)}
                    </TableRow></TableHead>
                    <TableBody>
                      {filtradas.map(n => (
                        <TableRow key={n.id} hover selected={selectedIds.has(n.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox size="small" checked={selectedIds.has(n.id)} onChange={e => toggleSeleccionTodas([n.id], e.target.checked)} />
                          </TableCell>
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
                      {filtradas.length === 0 && <TableRow><TableCell colSpan={columnas.length + 1} align="center"><Typography color="text.secondary" py={2}>Sin resultados con los filtros aplicados</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )
        })()}

        {/* ── TAB 6: Descarte ── */}
        {tab === 6 && (
          <Stack spacing={2}>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              size="small" variant="outlined" startIcon={<UploadFile />}
              onClick={() => setBajaImportOpen(true)}
              sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.4), textTransform: 'none' }}
            >
              Importar descartes masivos (Excel)
            </Button>
          </Stack>
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
          </Stack>
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

            {/* Zonas */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Inventory2 sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Zonas de llantas</Typography>
                  </Stack>
                  <Grid container spacing={1} mb={1.5}>
                    <Grid size={{ xs: 4 }}><TextField label="Código" size="small" fullWidth value={zonaForm.codigo} onChange={e => setZonaForm(f => ({ ...f, codigo: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 5 }}><TextField label="Nombre" size="small" fullWidth value={zonaForm.nombre} onChange={e => setZonaForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 3 }} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!zonaForm.codigo || !zonaForm.nombre || mutZona.isPending} onClick={() => mutZona.mutate({ ...zonaForm })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
                    </Grid>
                  </Grid>
                  <Table size="small">
                    <TableHead><TableRow>{['Código', 'Nombre', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {zonas.map(z => (
                        <TableRow key={z.id} hover>
                          <TableCell>{z.codigo}</TableCell><TableCell>{z.nombre}</TableCell>
                          <TableCell align="right"><IconButton size="small" color="error" onClick={() => mutZonaDel.mutate(z.id)}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {zonas.length === 0 && <TableRow><TableCell colSpan={3} align="center"><Typography color="text.secondary" py={1}>Sin zonas configuradas</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>

            {/* Motivos de fin de vida */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Recycling sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Motivos de fin de vida</Typography>
                  </Stack>
                  <Grid container spacing={1} mb={1.5}>
                    <Grid size={{ xs: 6 }}><TextField label="Nombre" size="small" fullWidth value={motivoForm.nombre} onChange={e => setMotivoForm(f => ({ ...f, nombre: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 3 }}><FormControlLabel control={<Switch size="small" checked={motivoForm.aplica_descarte} onChange={e => setMotivoForm(f => ({ ...f, aplica_descarte: e.target.checked }))} />} label={<Typography fontSize={12}>Descarte</Typography>} /></Grid>
                    <Grid size={{ xs: 3 }}><FormControlLabel control={<Switch size="small" checked={motivoForm.aplica_fin_vida} onChange={e => setMotivoForm(f => ({ ...f, aplica_fin_vida: e.target.checked }))} />} label={<Typography fontSize={12}>Fin de vida</Typography>} /></Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!motivoForm.nombre || mutMotivo.isPending} onClick={() => mutMotivo.mutate({ ...motivoForm })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
                    </Grid>
                  </Grid>
                  <Table size="small">
                    <TableHead><TableRow>{['Nombre', 'Descarte', 'Fin de vida', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {motivosFinVida.map(m => (
                        <TableRow key={m.id} hover>
                          <TableCell>{m.nombre}</TableCell>
                          <TableCell>{m.aplica_descarte ? '✓' : '—'}</TableCell>
                          <TableCell>{m.aplica_fin_vida ? '✓' : '—'}</TableCell>
                          <TableCell align="right"><IconButton size="small" color="error" onClick={() => mutMotivoDel.mutate(m.id)}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {motivosFinVida.length === 0 && <TableRow><TableCell colSpan={4} align="center"><Typography color="text.secondary" py={1}>Sin motivos configurados</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>

            {/* Bandas de reencauche */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Autorenew sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Bandas de reencauche</Typography>
                  </Stack>
                  <Grid container spacing={1} mb={1.5} alignItems="center">
                    <Grid size={{ xs: 6, sm: 2 }}><TextField label="Marca *" size="small" fullWidth value={bandaForm.marca} onChange={e => setBandaForm(f => ({ ...f, marca: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><TextField label="Referencia" size="small" fullWidth value={bandaForm.referencia} onChange={e => setBandaForm(f => ({ ...f, referencia: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><TextField label="Dimensión" size="small" fullWidth value={bandaForm.dimension} onChange={e => setBandaForm(f => ({ ...f, dimension: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><TextField label="Prof. original" type="number" size="small" fullWidth value={bandaForm.profundidad_original} onChange={e => setBandaForm(f => ({ ...f, profundidad_original: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><TextField label="Prof. mínima" type="number" size="small" fullWidth value={bandaForm.profundidad_minima} onChange={e => setBandaForm(f => ({ ...f, profundidad_minima: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><TextField label="Costo por defecto" type="number" size="small" fullWidth value={bandaForm.costo_defecto} onChange={e => setBandaForm(f => ({ ...f, costo_defecto: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><FormControlLabel control={<Switch size="small" checked={bandaForm.reesculturable} onChange={e => setBandaForm(f => ({ ...f, reesculturable: e.target.checked }))} />} label={<Typography fontSize={12}>Reesculturable</Typography>} /></Grid>
                    <Grid size={{ xs: 6, sm: 3 }} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!bandaForm.marca || mutBanda.isPending}
                        onClick={() => mutBanda.mutate({
                          marca: bandaForm.marca, referencia: bandaForm.referencia || undefined, dimension: bandaForm.dimension || undefined,
                          profundidad_original: bandaForm.profundidad_original ? Number(bandaForm.profundidad_original) : undefined,
                          profundidad_minima: bandaForm.profundidad_minima ? Number(bandaForm.profundidad_minima) : undefined,
                          costo_defecto: bandaForm.costo_defecto ? Number(bandaForm.costo_defecto) : undefined,
                          reesculturable: bandaForm.reesculturable,
                        })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
                    </Grid>
                  </Grid>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow>{['Marca', 'Referencia', 'Dimensión', 'Prof. orig/mín', 'Costo', 'Reesculturable', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {bandas.map(b => (
                          <TableRow key={b.id} hover>
                            <TableCell>{b.marca}</TableCell><TableCell>{b.referencia ?? '—'}</TableCell><TableCell>{b.dimension ?? '—'}</TableCell>
                            <TableCell>{b.profundidad_original ?? '—'} / {b.profundidad_minima ?? '—'}</TableCell>
                            <TableCell>{b.costo_defecto ? `$${b.costo_defecto.toLocaleString('es-CO')}` : '—'}</TableCell>
                            <TableCell>{b.reesculturable ? 'Sí' : 'No'}</TableCell>
                            <TableCell align="right"><IconButton size="small" color="error" onClick={() => mutBandaDel.mutate(b.id)}><DeleteForever sx={{ fontSize: 16 }} /></IconButton></TableCell>
                          </TableRow>
                        ))}
                        {bandas.length === 0 && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={1}>Sin bandas configuradas</Typography></TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Ajustes de valor (catálogo) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <AttachMoney sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Categorías de ajuste de valor</Typography>
                  </Stack>
                  <Typography fontSize={11} color="text.secondary" mb={1}>Deducciones que reducen el costo de la llanta al calcular CPK (garantías, venta de carcasa, etc.).</Typography>
                  <Stack direction="row" gap={1} mb={1.5}>
                    <TextField label="Nombre" size="small" fullWidth value={ajusteCatForm.nombre} onChange={e => setAjusteCatForm({ nombre: e.target.value })} />
                    <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!ajusteCatForm.nombre || mutAjusteCat.isPending} onClick={() => mutAjusteCat.mutate({ ...ajusteCatForm })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, whiteSpace: 'nowrap' }}>Agregar</Button>
                  </Stack>
                  <Stack spacing={0.5}>
                    {ajustesCat.map(a => (
                      <Stack key={a.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                        <Typography variant="body2">{a.nombre}</Typography>
                        <IconButton size="small" color="error" onClick={() => mutAjusteCatDel.mutate(a.id)}><DeleteForever sx={{ fontSize: 15 }} /></IconButton>
                      </Stack>
                    ))}
                    {ajustesCat.length === 0 && <Typography variant="caption" color="text.secondary">Sin categorías configuradas</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Trabajos y periodicidad */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Build sx={{ color: EAM_DARK }} /><Typography fontWeight={700}>Trabajos y periodicidad</Typography>
                  </Stack>
                  <Stack direction="row" gap={1} mb={1}>
                    <TextField label="Nombre del trabajo" size="small" fullWidth value={trabajoForm.nombre} onChange={e => setTrabajoForm(f => ({ ...f, nombre: e.target.value }))} />
                    <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!trabajoForm.nombre || mutTrabajo.isPending} onClick={() => mutTrabajo.mutate({ ...trabajoForm })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, whiteSpace: 'nowrap' }}>Agregar</Button>
                  </Stack>
                  <Stack spacing={0.5} mb={2}>
                    {trabajosCat.map(t => (
                      <Stack key={t.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                        <Typography variant="body2">{t.nombre}{t.es_predeterminado ? ' · predeterminado' : ''}</Typography>
                        <IconButton size="small" color="error" onClick={() => mutTrabajoDel.mutate(t.id)}><DeleteForever sx={{ fontSize: 15 }} /></IconButton>
                      </Stack>
                    ))}
                    {trabajosCat.length === 0 && <Typography variant="caption" color="text.secondary">Sin trabajos configurados</Typography>}
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Periodicidad (repetir cada…)</Typography>
                  <Grid container spacing={1} mt={0.25} mb={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <TextField select label="Trabajo" size="small" fullWidth value={periodForm.trabajo_id} onChange={e => setPeriodForm(f => ({ ...f, trabajo_id: e.target.value }))}>
                        <MenuItem value="">Seleccionar…</MenuItem>
                        {trabajosCat.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><TextField label="Valor" type="number" size="small" fullWidth value={periodForm.valor} onChange={e => setPeriodForm(f => ({ ...f, valor: e.target.value }))} /></Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <TextField select label="Unidad" size="small" fullWidth value={periodForm.unidad} onChange={e => setPeriodForm(f => ({ ...f, unidad: e.target.value }))}>
                        {['KILOMETROS', 'HORAS', 'DIAS'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!periodForm.trabajo_id || !periodForm.valor || mutPeriodicidad.isPending}
                        onClick={() => mutPeriodicidad.mutate({ trabajo_id: Number(periodForm.trabajo_id), valor: Number(periodForm.valor), unidad: periodForm.unidad })}
                        sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Agregar</Button>
                    </Grid>
                  </Grid>
                  <Stack spacing={0.5}>
                    {periodicidades.map(p => (
                      <Stack key={p.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                        <Typography variant="body2">{trabajosCat.find(t => t.id === p.trabajo_id)?.nombre ?? '—'} · cada {p.valor.toLocaleString('es-CO')} {p.unidad.toLowerCase()}</Typography>
                        <IconButton size="small" color="error" onClick={() => mutPeriodicidadDel.mutate(p.id)}><DeleteForever sx={{ fontSize: 15 }} /></IconButton>
                      </Stack>
                    ))}
                    {periodicidades.length === 0 && <Typography variant="caption" color="text.secondary">Sin periodicidades configuradas</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Esquemas de vehículo: se crean y editan en EAM → Configuración → Catálogos.
                Aquí solo se asignan (ver botón "Configurar ejes" en Llantas por Vehículo). */}
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
              <ListItemIcon><SwapIcon sx={{ fontSize: 18, color: '#D97706' }} /></ListItemIcon><ListItemText>Rotar (intercambiar posición)</ListItemText>
            </MenuItem>,
            <MenuItem key="rotrin" onClick={() => { setRotRinForm({ fecha: nowLocal(), km_odometro: veh?.odometro_actual != null ? String(veh.odometro_actual) : '', tecnico: '', observaciones: '' }); setRotRinDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Autorenew sx={{ fontSize: 18, color: '#D97706' }} /></ListItemIcon><ListItemText>Rotación en el rin (misma posición)</ListItemText>
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
            <Divider key="d2" />,
            <MenuItem key="ajuste" onClick={() => { setAjusteForm({ motivo_id: '', fecha: new Date().toISOString().slice(0, 10), valor: '', comentarios: '' }); setAjusteDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><AttachMoney sx={{ fontSize: 18, color: '#16A34A' }} /></ListItemIcon><ListItemText>Aplicar ajuste de valor</ListItemText>
            </MenuItem>,
            <MenuItem key="trabajo" onClick={() => { setTrabajoRealForm({ trabajo_id: '', fecha: nowLocal(), km_odometro: veh?.odometro_actual != null ? String(veh.odometro_actual) : '', cantidad: '1', costo_unitario: '', proveedor: '', observaciones: '' }); setTrabajoDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Build sx={{ fontSize: 18, color: '#D97706' }} /></ListItemIcon><ListItemText>Registrar trabajo</ListItemText>
            </MenuItem>,
            <Divider key="d3" />,
            <MenuItem key="resc" onClick={() => { setRescForm({ fecha: nowLocal(), km_odometro: veh?.odometro_actual != null ? String(veh.odometro_actual) : '', proveedor: '', costo: '', profundidad_nueva: '' }); setRescDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Compress sx={{ fontSize: 18, color: '#0369A1' }} /></ListItemIcon><ListItemText>Reesculturar</ListItemText>
            </MenuItem>,
            <MenuItem key="recban" onClick={() => { setRecBandaForm({ neumatico_destino_id: '', fecha: nowLocal(), mm_transferidos: '', costo_transferido: '', observaciones: '' }); setRecBandaDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Recycling sx={{ fontSize: 18, color: '#7C3AED' }} /></ListItemIcon><ListItemText>Recuperar banda</ListItemText>
            </MenuItem>,
            <MenuItem key="zona" onClick={() => { setZonaCambioForm({ zona_id: slotMenu.tire.zona_id ? String(slotMenu.tire.zona_id) : '', fecha: nowLocal(), observaciones: '' }); setZonaDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><MapIcon sx={{ fontSize: 18, color: '#0891B2' }} /></ListItemIcon><ListItemText>Cambiar zona</ListItemText>
            </MenuItem>,
            <MenuItem key="vidas" onClick={() => { setInformeTab(0); setVidasDialog(slotMenu.tire); setSlotMenu(null) }}>
              <ListItemIcon><Timeline sx={{ fontSize: 18, color: '#16A34A' }} /></ListItemIcon><ListItemText>Informe / Histórico / Vidas</ListItemText>
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

        {/* ── Diálogo: montar llanta por botón (alternativa a arrastrar y soltar) ── */}
        <Dialog open={!!montarDialog} onClose={() => setMontarDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Montar en vehículo
            <Typography variant="caption" color="text.secondary" display="block">{montarDialog?.codigo} · {montarDialog?.marca ?? ''} {montarDialog?.medida ?? ''}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Vehículo *" size="small" fullWidth value={montarForm.activo_id}
                onChange={e => setMontarForm(f => ({ ...f, activo_id: e.target.value, posicion: '' }))}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {vehiculos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.codigo}{v.placa ? ` · ${v.placa}` : ''} — {v.nombre}</MenuItem>)}
              </TextField>
              {montarForm.activo_id && (
                (() => {
                  const activoIdNum = Number(montarForm.activo_id)
                  const libres = montarLayout.filter(p => !neumaticos.some(n => n.activo_id === activoIdNum && n.posicion === p.codigo))
                  return libres.length === 0 ? (
                    <Alert severity="warning" sx={{ py: 0.5 }}>Este vehículo no tiene posiciones libres. Desmonta una llanta primero.</Alert>
                  ) : (
                    <TextField select label="Posición *" size="small" fullWidth value={montarForm.posicion} onChange={e => setMontarForm(f => ({ ...f, posicion: e.target.value }))}>
                      <MenuItem value="">Seleccionar…</MenuItem>
                      {libres.map(p => <MenuItem key={p.codigo} value={p.codigo}>{p.label}</MenuItem>)}
                    </TextField>
                  )
                })()
              )}
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={montarForm.fecha} onChange={e => setMontarForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={montarForm.km_odometro} onChange={e => setMontarForm(f => ({ ...f, km_odometro: e.target.value }))} />
              <TextField label="Técnico" size="small" fullWidth value={montarForm.tecnico} onChange={e => setMontarForm(f => ({ ...f, tecnico: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={montarForm.observaciones} onChange={e => setMontarForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setMontarDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!montarForm.activo_id || !montarForm.posicion || !montarForm.fecha || mutMov.isPending}
              onClick={confirmarMontar} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Montar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: agregar llanta desde bodega al vehículo seleccionado ── */}
        <AgregarLlantaDialog
          open={agregarLlantaOpen}
          onClose={() => setAgregarLlantaOpen(false)}
          veh={veh}
          layout={layout}
          almacen={almacen}
          tireEnVeh={tireEn}
          isPending={mutMov.isPending}
          onSubmit={payload => {
            if (!veh) return
            mutMov.mutate({ ...payload, tipo_movimiento: 'INSTALACION', activo_id: veh.id })
            setAgregarLlantaOpen(false)
          }}
        />

        {/* ── Diálogo: rotación en el rin (misma posición, sin desmontar) ── */}
        <Dialog open={!!rotRinDialog} onClose={() => setRotRinDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Rotación en el rin
            <Typography variant="caption" color="text.secondary" display="block">{rotRinDialog?.codigo} · posición {rotRinDialog?.posicion ?? '—'} (no se desmonta)</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <Alert severity="info" sx={{ py: 0.5 }}>Registra el evento de rotación sin mover la llanta de posición — útil para dejar constancia periódica sin desmontar.</Alert>
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={rotRinForm.fecha} onChange={e => setRotRinForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={rotRinForm.km_odometro} onChange={e => setRotRinForm(f => ({ ...f, km_odometro: e.target.value }))} />
              <TextField label="Técnico" size="small" fullWidth value={rotRinForm.tecnico} onChange={e => setRotRinForm(f => ({ ...f, tecnico: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={rotRinForm.observaciones} onChange={e => setRotRinForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRotRinDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!rotRinForm.fecha || mutMov.isPending} onClick={confirmarRotacionRin} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Registrar</Button>
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
              <TextField select label="Motivo de fin de vida" size="small" fullWidth value={bajaForm.motivo_fin_vida_id} onChange={e => setBajaForm(f => ({ ...f, motivo_fin_vida_id: e.target.value }))}>
                <MenuItem value="">Sin especificar</MenuItem>
                {motivosFinVida.filter(m => m.aplica_descarte).map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
              </TextField>
              <TextField label="Motivo / observación" size="small" fullWidth multiline rows={2} value={bajaForm.motivo} onChange={e => setBajaForm(f => ({ ...f, motivo: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBajaDialog(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={confirmarBaja} disabled={!bajaForm.fecha || mutMov.isPending}>Dar de baja</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: aplicar ajuste de valor a la llanta ── */}
        <Dialog open={!!ajusteDialog} onClose={() => setAjusteDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Aplicar ajuste de valor
            <Typography variant="caption" color="text.secondary" display="block">{ajusteDialog?.codigo} · reduce el costo usado para CPK</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Motivo *" size="small" fullWidth value={ajusteForm.motivo_id} onChange={e => setAjusteForm(f => ({ ...f, motivo_id: e.target.value }))}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {ajustesCat.filter(a => a.activo).map(a => <MenuItem key={a.id} value={String(a.id)}>{a.nombre}</MenuItem>)}
              </TextField>
              {ajustesCat.length === 0 && <Alert severity="info" sx={{ py: 0 }}>Configura categorías de ajuste en Configuración.</Alert>}
              <TextField label="Fecha *" type="date" size="small" fullWidth value={ajusteForm.fecha} onChange={e => setAjusteForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Valor a deducir (COP) *" type="number" size="small" fullWidth value={ajusteForm.valor} onChange={e => setAjusteForm(f => ({ ...f, valor: e.target.value }))} />
              <TextField label="Comentarios" size="small" fullWidth multiline rows={2} value={ajusteForm.comentarios} onChange={e => setAjusteForm(f => ({ ...f, comentarios: e.target.value }))} />
              {ajusteDialog && ajustesNeu.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Ajustes ya aplicados</Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {ajustesNeu.map(a => (
                      <Stack key={a.id} direction="row" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                        <Typography variant="body2">{ajustesCat.find(c => c.id === a.motivo_id)?.nombre ?? '—'}</Typography>
                        <Typography variant="body2" fontWeight={700} color="error.main">-${a.valor.toLocaleString('es-CO')}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setAjusteDialog(null)}>Cerrar</Button>
            <Button variant="contained" disabled={!ajusteForm.motivo_id || !ajusteForm.valor || mutAjusteAplicar.isPending}
              onClick={() => mutAjusteAplicar.mutate({ motivo_id: Number(ajusteForm.motivo_id), fecha: ajusteForm.fecha, valor: Number(ajusteForm.valor), comentarios: ajusteForm.comentarios || undefined })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Aplicar ajuste</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: registrar trabajo realizado en la llanta ── */}
        <Dialog open={!!trabajoDialog} onClose={() => setTrabajoDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Registrar trabajo
            <Typography variant="caption" color="text.secondary" display="block">{trabajoDialog?.codigo}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Trabajo *" size="small" fullWidth value={trabajoRealForm.trabajo_id} onChange={e => setTrabajoRealForm(f => ({ ...f, trabajo_id: e.target.value }))}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {trabajosCat.filter(t => t.activo).map(t => <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>)}
              </TextField>
              {trabajosCat.length === 0 && <Alert severity="info" sx={{ py: 0 }}>Configura el catálogo de trabajos en Configuración.</Alert>}
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={trabajoRealForm.fecha} onChange={e => setTrabajoRealForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={trabajoRealForm.km_odometro} onChange={e => setTrabajoRealForm(f => ({ ...f, km_odometro: e.target.value }))} />
              <Stack direction="row" spacing={1.5}>
                <TextField label="Cantidad" type="number" size="small" fullWidth value={trabajoRealForm.cantidad} onChange={e => setTrabajoRealForm(f => ({ ...f, cantidad: e.target.value }))} />
                <TextField label="Costo unitario" type="number" size="small" fullWidth value={trabajoRealForm.costo_unitario} onChange={e => setTrabajoRealForm(f => ({ ...f, costo_unitario: e.target.value }))} />
              </Stack>
              <TextField label="Proveedor" size="small" fullWidth value={trabajoRealForm.proveedor} onChange={e => setTrabajoRealForm(f => ({ ...f, proveedor: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={trabajoRealForm.observaciones} onChange={e => setTrabajoRealForm(f => ({ ...f, observaciones: e.target.value }))} />
              {trabajoDialog && trabajosRealizados.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Trabajos previos</Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {trabajosRealizados.map(t => (
                      <Stack key={t.id} direction="row" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                        <Typography variant="body2">{trabajosCat.find(c => c.id === t.trabajo_id)?.nombre ?? '—'} · {fmtFecha(t.fecha)}</Typography>
                        <Typography variant="body2" fontWeight={700}>{t.costo_unitario ? `$${(t.costo_unitario * t.cantidad).toLocaleString('es-CO')}` : '—'}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setTrabajoDialog(null)}>Cerrar</Button>
            <Button variant="contained" disabled={!trabajoRealForm.trabajo_id || !trabajoRealForm.fecha || mutTrabajoRealizado.isPending}
              onClick={() => mutTrabajoRealizado.mutate({
                trabajo_id: Number(trabajoRealForm.trabajo_id),
                fecha: new Date(trabajoRealForm.fecha).toISOString(),
                km_odometro: trabajoRealForm.km_odometro ? Number(trabajoRealForm.km_odometro) : undefined,
                cantidad: Number(trabajoRealForm.cantidad) || 1,
                costo_unitario: trabajoRealForm.costo_unitario ? Number(trabajoRealForm.costo_unitario) : undefined,
                proveedor: trabajoRealForm.proveedor || undefined,
                observaciones: trabajoRealForm.observaciones || undefined,
              })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: reesculturar (re-grooving) ── */}
        <Dialog open={!!rescDialog} onClose={() => setRescDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Reesculturar
            <Typography variant="caption" color="text.secondary" display="block">{rescDialog?.codigo} · profundidad actual: {rescDialog?.profundidad_actual ?? '—'} mm</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={rescForm.fecha} onChange={e => setRescForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={rescForm.km_odometro} onChange={e => setRescForm(f => ({ ...f, km_odometro: e.target.value }))} />
              <TextField label="Proveedor" size="small" fullWidth value={rescForm.proveedor} onChange={e => setRescForm(f => ({ ...f, proveedor: e.target.value }))} />
              <TextField label="Costo" type="number" size="small" fullWidth value={rescForm.costo} onChange={e => setRescForm(f => ({ ...f, costo: e.target.value }))} />
              <TextField label="Profundidad resultante (mm) *" type="number" size="small" fullWidth value={rescForm.profundidad_nueva} onChange={e => setRescForm(f => ({ ...f, profundidad_nueva: e.target.value }))} />
              {rescDialog && reesculturados.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Historial de reesculturados</Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {reesculturados.map(r => (
                      <Stack key={r.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: r.deshecho ? '#FEF2F2' : '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                        <Typography variant="body2" sx={{ textDecoration: r.deshecho ? 'line-through' : 'none' }}>
                          {fmtFecha(r.fecha)} · {r.profundidad_anterior ?? '—'}→{r.profundidad_nueva ?? '—'} mm
                        </Typography>
                        {!r.deshecho && (
                          <Tooltip title="Deshacer reesculturado">
                            <IconButton size="small" onClick={() => mutDeshacerResc.mutate(r.id)}><Undo sx={{ fontSize: 15 }} /></IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRescDialog(null)}>Cerrar</Button>
            <Button variant="contained" disabled={!rescForm.fecha || !rescForm.profundidad_nueva || mutResc.isPending}
              onClick={() => mutResc.mutate({
                fecha: new Date(rescForm.fecha).toISOString(),
                km_odometro: rescForm.km_odometro ? Number(rescForm.km_odometro) : undefined,
                proveedor: rescForm.proveedor || undefined,
                costo: rescForm.costo ? Number(rescForm.costo) : undefined,
                profundidad_nueva: Number(rescForm.profundidad_nueva),
              })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Reesculturar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: recuperar banda ── */}
        <Dialog open={!!recBandaDialog} onClose={() => setRecBandaDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Recuperar banda
            <Typography variant="caption" color="text.secondary" display="block">Origen (carcasa dañada): {recBandaDialog?.codigo}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <Alert severity="warning" sx={{ py: 0 }}>La llanta origen quedará descartada al confirmar.</Alert>
              <TextField select label="Llanta destino *" size="small" fullWidth value={recBandaForm.neumatico_destino_id} onChange={e => setRecBandaForm(f => ({ ...f, neumatico_destino_id: e.target.value }))}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {neumaticos.filter(n => n.id !== recBandaDialog?.id && n.medida === recBandaDialog?.medida).map(n => <MenuItem key={n.id} value={String(n.id)}>{n.codigo} · {n.marca ?? ''} {n.medida ?? ''}</MenuItem>)}
              </TextField>
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={recBandaForm.fecha} onChange={e => setRecBandaForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Mm transferidos" type="number" size="small" fullWidth value={recBandaForm.mm_transferidos} onChange={e => setRecBandaForm(f => ({ ...f, mm_transferidos: e.target.value }))} placeholder={recBandaDialog?.profundidad_actual != null ? String(recBandaDialog.profundidad_actual) : ''} />
              <TextField label="Costo transferido" type="number" size="small" fullWidth value={recBandaForm.costo_transferido} onChange={e => setRecBandaForm(f => ({ ...f, costo_transferido: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={recBandaForm.observaciones} onChange={e => setRecBandaForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRecBandaDialog(null)}>Cancelar</Button>
            <Button variant="contained" color="warning" disabled={!recBandaForm.neumatico_destino_id || !recBandaForm.fecha || mutRecBanda.isPending}
              onClick={() => mutRecBanda.mutate({
                neumatico_destino_id: Number(recBandaForm.neumatico_destino_id),
                fecha: new Date(recBandaForm.fecha).toISOString(),
                mm_transferidos: recBandaForm.mm_transferidos ? Number(recBandaForm.mm_transferidos) : undefined,
                costo_transferido: recBandaForm.costo_transferido ? Number(recBandaForm.costo_transferido) : undefined,
                observaciones: recBandaForm.observaciones || undefined,
              })}>Confirmar recuperación</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: cambiar zona ── */}
        <Dialog open={!!zonaDialog} onClose={() => setZonaDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Cambiar zona
            <Typography variant="caption" color="text.secondary" display="block">{zonaDialog?.codigo}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Nueva zona *" size="small" fullWidth value={zonaCambioForm.zona_id} onChange={e => setZonaCambioForm(f => ({ ...f, zona_id: e.target.value }))}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {zonas.map(z => <MenuItem key={z.id} value={String(z.id)}>{z.nombre}</MenuItem>)}
              </TextField>
              {zonas.length === 0 && <Alert severity="info" sx={{ py: 0 }}>Configura zonas en Configuración.</Alert>}
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={zonaCambioForm.fecha} onChange={e => setZonaCambioForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={zonaCambioForm.observaciones} onChange={e => setZonaCambioForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setZonaDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!zonaCambioForm.zona_id || !zonaCambioForm.fecha || mutCambiarZona.isPending}
              onClick={() => mutCambiarZona.mutate({
                zona_id: Number(zonaCambioForm.zona_id),
                fecha: new Date(zonaCambioForm.fecha).toISOString(),
                observaciones: zonaCambioForm.observaciones || undefined,
              })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Cambiar zona</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: informe consolidado / histórico / vidas de la llanta ── */}
        <Dialog open={!!vidasDialog} onClose={() => setVidasDialog(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Informe de llanta
            <Typography variant="caption" color="text.secondary" display="block">{vidasDialog?.codigo}</Typography>
          </DialogTitle>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs value={informeTab} onChange={(_e, v) => setInformeTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Resumen" sx={{ textTransform: 'none', fontSize: 12.5 }} />
              <Tab label="Vidas" sx={{ textTransform: 'none', fontSize: 12.5 }} />
              <Tab label="Montajes / Rotaciones" sx={{ textTransform: 'none', fontSize: 12.5 }} />
              <Tab label="Inspecciones" sx={{ textTransform: 'none', fontSize: 12.5 }} />
              <Tab label="Trabajos" sx={{ textTransform: 'none', fontSize: 12.5 }} />
              <Tab label="Ubicaciones / Zonas" sx={{ textTransform: 'none', fontSize: 12.5 }} />
            </Tabs>
          </Box>
          <DialogContent dividers sx={{ minHeight: 320 }}>
            {informeTab === 0 && (
              historicoNeu ? (
                <Stack spacing={2}>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Marca / Medida', value: `${historicoNeu.informacion_basica.marca ?? '—'} · ${historicoNeu.informacion_basica.medida ?? '—'}` },
                      { label: 'Ubicación actual', value: historicoNeu.informacion_basica.ubicacion_actual },
                      { label: 'N° de vidas', value: historicoNeu.resumen_estadistico.numero_vidas },
                      { label: 'N° de reencauches', value: historicoNeu.resumen_estadistico.numero_reencauches },
                      { label: 'Vehículos distintos', value: historicoNeu.resumen_estadistico.vehiculos_distintos },
                      { label: 'Km total acumulado', value: historicoNeu.resumen_estadistico.km_total_acumulado?.toLocaleString('es-CO') ?? '—' },
                    ].map(f => (
                      <Grid key={f.label} size={{ xs: 6, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" display="block">{f.label}</Typography>
                        <Typography fontWeight={700} fontSize={13.5}>{f.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Desglose de costos</Typography>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Llanta nueva', value: historicoNeu.resumen_estadistico.costo_nueva },
                      { label: 'Reencauches', value: historicoNeu.resumen_estadistico.costo_reencauches },
                      { label: 'Reesculturados', value: historicoNeu.resumen_estadistico.costo_reesculturados },
                      { label: 'Trabajos', value: historicoNeu.resumen_estadistico.costo_trabajos },
                      { label: 'Ajustes (deducción)', value: historicoNeu.resumen_estadistico.costo_ajustes },
                    ].map(f => (
                      <Grid key={f.label} size={{ xs: 6, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" display="block">{f.label}</Typography>
                        <Typography fontWeight={700} fontSize={13.5}>{f.value ? `$${Number(f.value).toLocaleString('es-CO')}` : '—'}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              ) : <Typography color="text.secondary" py={2} textAlign="center">Cargando…</Typography>
            )}

            {informeTab === 1 && (
              vidasNeu.length === 0 ? (
                <Typography color="text.secondary" py={2} textAlign="center">Sin vidas registradas aún</Typography>
              ) : (
                <Stack spacing={1}>
                  {vidasNeu.map(v => (
                    <Box key={v.id} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 1.5, bgcolor: v.fecha_fin ? '#F9FAFB' : alpha(EAM_COLOR, 0.06) }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography fontWeight={700} fontSize={13}>Vida {v.numero_vida} · {v.tipo}</Typography>
                        <Chip size="small" label={v.fecha_fin ? 'Cerrada' : 'Activa'} color={v.fecha_fin ? 'default' : 'success'} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fmtFecha(v.fecha_inicio)} → {v.fecha_fin ? fmtFecha(v.fecha_fin) : 'actualidad'}
                      </Typography>
                      <Stack direction="row" gap={2} mt={0.5} flexWrap="wrap">
                        <Typography variant="caption">Km: {v.km_inicio?.toLocaleString('es-CO')} → {v.km_fin != null ? v.km_fin.toLocaleString('es-CO') : '—'}</Typography>
                        <Typography variant="caption">Prof.: {v.profundidad_inicial ?? '—'} → {v.profundidad_final ?? '—'} mm</Typography>
                        <Typography variant="caption">Costo: {v.costo ? `$${v.costo.toLocaleString('es-CO')}` : '—'}</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )
            )}

            {informeTab === 2 && (
              !informeNeu || informeNeu.montajes_rotaciones.length === 0 ? (
                <Typography color="text.secondary" py={2} textAlign="center">Sin montajes ni rotaciones registrados</Typography>
              ) : (
                <Table size="small">
                  <TableHead><TableRow>{['Fecha', 'Tipo', 'Posición', 'Odómetro', 'Distancia', 'Técnico'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {informeNeu.montajes_rotaciones.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell>{fmtFecha(m.fecha)}</TableCell>
                        <TableCell>{m.tipo}</TableCell>
                        <TableCell>{m.posicion_origen ? `${m.posicion_origen} → ` : ''}{m.posicion ?? '—'}</TableCell>
                        <TableCell>{m.km_odometro?.toLocaleString('es-CO') ?? '—'}</TableCell>
                        <TableCell>{m.distancia_recorrida != null ? `${m.distancia_recorrida.toLocaleString('es-CO')} km` : '—'}</TableCell>
                        <TableCell>{m.tecnico ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}

            {informeTab === 3 && (
              !informeNeu || informeNeu.inspecciones.length === 0 ? (
                <Typography color="text.secondary" py={2} textAlign="center">Sin inspecciones registradas</Typography>
              ) : (
                <Table size="small">
                  <TableHead><TableRow>{['Fecha', 'Profundidad mín.', 'Presión', 'Estado', 'Técnico'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {informeNeu.inspecciones.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell>{fmtFecha(i.fecha)}</TableCell>
                        <TableCell>{i.profundidad_min ?? '—'} mm</TableCell>
                        <TableCell>{i.presion_psi ?? '—'} psi</TableCell>
                        <TableCell>{i.estado_visual ?? '—'}</TableCell>
                        <TableCell>{i.tecnico ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}

            {informeTab === 4 && (
              !informeNeu || informeNeu.trabajos.length === 0 ? (
                <Typography color="text.secondary" py={2} textAlign="center">Sin trabajos registrados</Typography>
              ) : (
                <Table size="small">
                  <TableHead><TableRow>{['Fecha', 'Trabajo', 'Cantidad', 'Costo', 'Proveedor'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {informeNeu.trabajos.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{fmtFecha(t.fecha)}</TableCell>
                        <TableCell>{trabajosCat.find(c => c.id === t.trabajo_id)?.nombre ?? '—'}</TableCell>
                        <TableCell>{t.cantidad}</TableCell>
                        <TableCell>{t.costo_unitario ? `$${(t.costo_unitario * t.cantidad).toLocaleString('es-CO')}` : '—'}</TableCell>
                        <TableCell>{t.proveedor ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}

            {informeTab === 5 && (
              !informeNeu || (informeNeu.ubicaciones.length === 0 && informeNeu.zonas.length === 0) ? (
                <Typography color="text.secondary" py={2} textAlign="center">Sin cambios de ubicación ni zona registrados</Typography>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Ubicaciones (bodegas)</Typography>
                    <Stack spacing={0.5} mt={0.5}>
                      {informeNeu.ubicaciones.map((u: any) => (
                        <Stack key={u.id} direction="row" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                          <Typography variant="body2">{bodegaNombre(u.bodega_id)}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtFecha(u.fecha)}</Typography>
                        </Stack>
                      ))}
                      {informeNeu.ubicaciones.length === 0 && <Typography variant="caption" color="text.secondary">Sin registros</Typography>}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Zonas</Typography>
                    <Stack spacing={0.5} mt={0.5}>
                      {informeNeu.zonas.map((z: any) => (
                        <Stack key={z.id} direction="row" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1, px: 1, py: 0.5 }}>
                          <Typography variant="body2">{z.observaciones ?? '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtFecha(z.fecha)}</Typography>
                        </Stack>
                      ))}
                      {informeNeu.zonas.length === 0 && <Typography variant="caption" color="text.secondary">Sin registros</Typography>}
                    </Stack>
                  </Box>
                </Stack>
              )
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => { setVidasDialog(null); setInformeTab(0) }}>Cerrar</Button>
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
              <Grid size={{ xs: 12, sm: 4 }}><TextField select label="Zona" size="small" fullWidth value={nuevoForm.zona_id} onChange={e => setNuevoForm(f => ({ ...f, zona_id: e.target.value }))}><MenuItem value="">Sin zona</MenuItem>{zonas.map(z => <MenuItem key={z.id} value={String(z.id)}>{z.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField label="DOT" size="small" fullWidth value={nuevoForm.dot} onChange={e => setNuevoForm(f => ({ ...f, dot: e.target.value }))} placeholder="Ej: 2523" /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField select label="Tipo de rin" size="small" fullWidth value={nuevoForm.tipo_rin} onChange={e => setNuevoForm(f => ({ ...f, tipo_rin: e.target.value }))}><MenuItem value="">—</MenuItem>{TIPOS_RIN.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
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
              zona_id: nuevoForm.zona_id ? Number(nuevoForm.zona_id) : undefined,
              dot: nuevoForm.dot || undefined, tipo_rin: nuevoForm.tipo_rin || undefined,
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
                <>
                  <TextField select label="Daño / motivo de descarte" size="small" fullWidth value={procForm.dano_id} onChange={e => setProcForm(f => ({ ...f, dano_id: e.target.value }))}>
                    <MenuItem value="">Sin especificar</MenuItem>
                    {danos.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
                  </TextField>
                  <TextField select label="Motivo de fin de vida" size="small" fullWidth value={procForm.motivo_fin_vida_id} onChange={e => setProcForm(f => ({ ...f, motivo_fin_vida_id: e.target.value }))}>
                    <MenuItem value="">Sin especificar</MenuItem>
                    {motivosFinVida.filter(m => m.aplica_fin_vida).map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                  </TextField>
                </>
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
                motivo_fin_vida_id: procForm.motivo_fin_vida_id ? Number(procForm.motivo_fin_vida_id) : undefined,
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

        {/* ── Diálogo: inspección de sesión (todo el vehículo a la vez) ── */}
        <Dialog open={inspSesionOpen} onClose={() => setInspSesionOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva inspección — todas las llantas del vehículo</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={1.5} mb={2}>
              <Grid size={{ xs: 12, sm: 5 }}><TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth value={inspSesionCabecera.fecha} onChange={e => setInspSesionCabecera(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Odómetro (km)" type="number" size="small" fullWidth value={inspSesionCabecera.km_odometro} onChange={e => setInspSesionCabecera(f => ({ ...f, km_odometro: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><TextField label="Técnico" size="small" fullWidth value={inspSesionCabecera.tecnico} onChange={e => setInspSesionCabecera(f => ({ ...f, tecnico: e.target.value }))} /></Grid>
            </Grid>
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 1.5, mb: 2 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>Asignación rápida — rellena los campos vacíos de todas las llantas</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <TextField label="Profundidad (mm)" type="number" size="small" value={inspSesionRapido.profundidad} onChange={e => setInspSesionRapido(f => ({ ...f, profundidad: e.target.value }))} sx={{ width: 160 }} />
                <TextField label="Presión (psi)" type="number" size="small" value={inspSesionRapido.presion} onChange={e => setInspSesionRapido(f => ({ ...f, presion: e.target.value }))} sx={{ width: 140 }} />
                <Button size="small" variant="outlined" onClick={aplicarRapidoATodos} sx={{ textTransform: 'none' }}>Aplicar a vacíos</Button>
              </Stack>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                  {['Posición', 'Código', 'Ext.', 'Centro', 'Int.', 'Presión', 'Estado'].map(h => <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {Object.keys(inspSesionRows).map(nid => {
                    const t = neumaticos.find(n => n.id === Number(nid))
                    const row = inspSesionRows[Number(nid)]
                    const setRow = (patch: Partial<typeof row>) => setInspSesionRows(prev => ({ ...prev, [Number(nid)]: { ...prev[Number(nid)], ...patch } }))
                    return (
                      <TableRow key={nid}>
                        <TableCell><Chip size="small" label={t?.posicion ?? '—'} sx={{ fontSize: 10 }} /></TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t?.codigo ?? '—'}</TableCell>
                        <TableCell><TextField type="number" size="small" value={row.profundidad_izq} onChange={e => setRow({ profundidad_izq: e.target.value })} sx={{ width: 70 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.profundidad_centro} onChange={e => setRow({ profundidad_centro: e.target.value })} sx={{ width: 70 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.profundidad_der} onChange={e => setRow({ profundidad_der: e.target.value })} sx={{ width: 70 }} /></TableCell>
                        <TableCell><TextField type="number" size="small" value={row.presion_psi} onChange={e => setRow({ presion_psi: e.target.value })} sx={{ width: 80 }} /></TableCell>
                        <TableCell>
                          <TextField select size="small" value={row.estado_visual} onChange={e => setRow({ estado_visual: e.target.value })} sx={{ width: 110 }}>
                            {['BUENO', 'REGULAR', 'CRITICO'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setInspSesionOpen(false)} disabled={inspSesionEnviando}>Cancelar</Button>
            <Button variant="contained" disabled={!inspSesionCabecera.fecha || inspSesionEnviando} onClick={enviarInspSesion} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              {inspSesionEnviando ? 'Guardando...' : 'Guardar inspecciones'}
            </Button>
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

        {/* ── Diálogo configurar ejes: asigna una categoría (esquema) ya pre-configurada ── */}
        <Dialog open={ejesOpen} onClose={() => setEjesOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Ejes y llantas
            <Typography variant="caption" color="text.secondary" display="block">{veh?.codigo} — {veh?.nombre}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <TextField select label="Categoría de ejes/llantas *" size="small" fullWidth value={ejesForm.esquema_id} onChange={e => setEjesForm({ esquema_id: e.target.value })}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {esquemas.map(es => <MenuItem key={es.id} value={String(es.id)}>{es.nombre} · {es.numero_ejes} eje(s){es.tiene_repuesto ? ' + repuesto' : ''}</MenuItem>)}
              </TextField>
              {esquemas.length === 0 ? (
                <Alert severity="warning" sx={{ py: 0.5 }}>Aún no hay categorías creadas. Pre-configúralas en <b>EAM → Configuración → Catálogos → Esquemas de vehículo</b> y luego solo se asignan aquí.</Alert>
              ) : (
                <Alert severity="info" sx={{ py: 0 }}>Las categorías se pre-configuran una sola vez en <b>Activos</b>; aquí solo se le asigna una a este vehículo.</Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEjesOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={!ejesForm.esquema_id || mutEjes.isPending} onClick={() => mutEjes.mutate(Number(ejesForm.esquema_id))} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Guardar</Button>
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

        {/* ── Diálogo: eliminación masiva ── */}
        <Dialog open={bulkDeleteOpen} onClose={() => !mutBulkDelete.isPending && setBulkDeleteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: '#DC2626' }}>Eliminar {selectedIds.size} llanta(s)</DialogTitle>
          <DialogContent dividers>
            <Alert severity="error" sx={{ mb: 2 }}>Esta acción no se puede deshacer. Se eliminará toda la información asociada (movimientos, inspecciones, vidas, trabajos, ajustes).</Alert>
            <TextField label='Escribe "ELIMINAR" para confirmar' size="small" fullWidth value={bulkDeleteConfirm} onChange={e => setBulkDeleteConfirm(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBulkDeleteOpen(false)} disabled={mutBulkDelete.isPending}>Cancelar</Button>
            <Button variant="contained" color="error" disabled={bulkDeleteConfirm.trim().toUpperCase() !== 'ELIMINAR' || mutBulkDelete.isPending}
              onClick={() => mutBulkDelete.mutate()}>Eliminar definitivamente</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: importación masiva ── */}
        <Dialog open={importOpen} onClose={() => { setImportOpen(false); setImportRows([]); setImportResult(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Importación masiva de llantas</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ py: 0.5 }}>Descarga la plantilla, complétala en Excel y súbela. La columna "bodega" debe coincidir con el nombre de una bodega ya configurada.</Alert>
              <Button variant="outlined" startIcon={<Download />} onClick={descargarPlantillaImportacion} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>Descargar plantilla</Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportFile} />
              <Button variant="outlined" startIcon={<UploadFile />} onClick={() => fileInputRef.current?.click()} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                Seleccionar archivo Excel
              </Button>
              {importRows.length > 0 && !importResult && (
                <Alert severity="success" sx={{ py: 0.5 }}>{importRows.length} filas detectadas · códigos: {importRows.slice(0, 3).map(r => r.codigo).join(', ')}{importRows.length > 3 ? '…' : ''}</Alert>
              )}
              {importResult && (
                <Box>
                  <Alert severity={importResult.errores.length ? 'warning' : 'success'} sx={{ mb: 1 }}>
                    {importResult.exitosos} de {importResult.total} llantas creadas exitosamente
                  </Alert>
                  {importResult.errores.length > 0 && (
                    <Stack spacing={0.5}>
                      {importResult.errores.map((e: any, i: number) => (
                        <Typography key={i} variant="caption" color="error.main" display="block">Fila {e.fila} ({e.codigo || '—'}): {e.mensaje}</Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => { setImportOpen(false); setImportRows([]); setImportResult(null) }}>Cerrar</Button>
            <Button variant="contained" disabled={importRows.length === 0 || mutImportar.isPending} onClick={confirmarImportacion} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              {mutImportar.isPending ? 'Cargando...' : `Importar ${importRows.length} llantas`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: inspecciones masivas por archivo plano ── */}
        <Dialog open={inspImportOpen} onClose={() => { setInspImportOpen(false); setInspImportRows([]); setInspImportResult(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Importación masiva de inspecciones</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ py: 0.5 }}>Descarga la plantilla, complétala en Excel y súbela. La columna "codigo" debe coincidir con el código de una llanta ya registrada (montada o en bodega).</Alert>
              <Button variant="outlined" startIcon={<Download />} onClick={descargarPlantillaInspecciones} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>Descargar plantilla</Button>
              <input ref={inspFileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportInspFile} />
              <Button variant="outlined" startIcon={<UploadFile />} onClick={() => inspFileInputRef.current?.click()} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                Seleccionar archivo Excel
              </Button>
              {inspImportRows.length > 0 && !inspImportResult && (
                <Alert severity="success" sx={{ py: 0.5 }}>{inspImportRows.length} filas detectadas · códigos: {inspImportRows.slice(0, 3).map(r => r.codigo).join(', ')}{inspImportRows.length > 3 ? '…' : ''}</Alert>
              )}
              {inspImportResult && (
                <Box>
                  <Alert severity={inspImportResult.errores.length ? 'warning' : 'success'} sx={{ mb: 1 }}>
                    {inspImportResult.exitosos} de {inspImportResult.total} inspecciones registradas exitosamente
                  </Alert>
                  {inspImportResult.errores.length > 0 && (
                    <Stack spacing={0.5}>
                      {inspImportResult.errores.map((e: any, i: number) => (
                        <Typography key={i} variant="caption" color="error.main" display="block">Fila {e.fila} ({e.codigo || '—'}): {e.mensaje}</Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => { setInspImportOpen(false); setInspImportRows([]); setInspImportResult(null) }}>Cerrar</Button>
            <Button variant="contained" disabled={inspImportRows.length === 0 || mutImportarInsp.isPending} onClick={confirmarImportacionInsp} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              {mutImportarInsp.isPending ? 'Cargando...' : `Importar ${inspImportRows.length} inspecciones`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: descartes masivos por archivo plano ── */}
        <Dialog open={bajaImportOpen} onClose={() => { setBajaImportOpen(false); setBajaImportRows([]); setBajaImportResult(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Descarte masivo de llantas</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ py: 0.5 }}>Descarga la plantilla, complétala en Excel y súbela. Las columnas "dano" y "motivo_fin_vida" deben coincidir con nombres ya configurados en Configuración; ambas son opcionales.</Alert>
              <Button variant="outlined" startIcon={<Download />} onClick={descargarPlantillaBajas} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>Descargar plantilla</Button>
              <input ref={bajaFileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportBajaFile} />
              <Button variant="outlined" startIcon={<UploadFile />} onClick={() => bajaFileInputRef.current?.click()} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                Seleccionar archivo Excel
              </Button>
              {bajaImportRows.length > 0 && !bajaImportResult && (
                <Alert severity="warning" sx={{ py: 0.5 }}>{bajaImportRows.length} filas detectadas · códigos: {bajaImportRows.slice(0, 3).map(r => r.codigo).join(', ')}{bajaImportRows.length > 3 ? '…' : ''} · esta acción no se puede deshacer.</Alert>
              )}
              {bajaImportResult && (
                <Box>
                  <Alert severity={bajaImportResult.errores.length ? 'warning' : 'success'} sx={{ mb: 1 }}>
                    {bajaImportResult.exitosos} de {bajaImportResult.total} llantas dadas de baja exitosamente
                  </Alert>
                  {bajaImportResult.errores.length > 0 && (
                    <Stack spacing={0.5}>
                      {bajaImportResult.errores.map((e: any, i: number) => (
                        <Typography key={i} variant="caption" color="error.main" display="block">Fila {e.fila} ({e.codigo || '—'}): {e.mensaje}</Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => { setBajaImportOpen(false); setBajaImportRows([]); setBajaImportResult(null) }}>Cerrar</Button>
            <Button variant="contained" color="error" disabled={bajaImportRows.length === 0 || mutImportarBaja.isPending} onClick={confirmarImportacionBaja}>
              {mutImportarBaja.isPending ? 'Cargando...' : `Dar de baja ${bajaImportRows.length} llantas`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: congelar datos ── */}
        <Dialog open={congelarOpen} onClose={() => setCongelarOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Congelar datos</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Crea una fotografía del estado actual de todas las llantas activas (costo/km, mm gastados) para comparar su evolución más adelante.
            </Typography>
            <TextField label="Descripción (opcional)" size="small" fullWidth value={congelarDesc} onChange={e => setCongelarDesc(e.target.value)} placeholder="Ej: Cierre de mes julio 2026" />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCongelarOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCongelar.isPending} onClick={() => mutCongelar.mutate({ descripcion: congelarDesc || undefined })} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              {mutCongelar.isPending ? 'Congelando...' : 'Congelar ahora'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: ver congelados ── */}
        <Dialog open={congeladosOpen} onClose={() => setCongeladosOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Congelados</DialogTitle>
          <DialogContent dividers>
            {congelados.length === 0 ? (
              <Typography color="text.secondary" py={2} textAlign="center">Aún no hay congelados</Typography>
            ) : (
              <Stack spacing={1}>
                {congelados.map(c => (
                  <Stack key={c.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, px: 1.5, py: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{c.descripcion || `Congelado #${c.id}`}</Typography>
                      <Typography variant="caption" color="text.secondary">{fmtFecha(c.fecha)}</Typography>
                    </Box>
                    <Stack direction="row" gap={0.5}>
                      <Button size="small" onClick={() => setCongeladoDetalleId(c.id)} sx={{ textTransform: 'none' }}>Ver detalle</Button>
                      <IconButton size="small" color="error" onClick={() => mutDeleteCongelado.mutate(c.id)}><DeleteForever sx={{ fontSize: 16 }} /></IconButton>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCongeladosOpen(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: detalle de congelado ── */}
        <Dialog open={!!congeladoDetalleId} onClose={() => setCongeladoDetalleId(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Detalle del congelado</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>{['Código', 'Marca', 'Medida', 'Estado', 'Km total', 'Costo neto', 'CPK', 'Costo/mm', 'Mm gastados'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {congeladoDetalle.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell sx={{ fontWeight: 700 }}>{d.codigo}</TableCell>
                      <TableCell>{d.marca ?? '—'}</TableCell>
                      <TableCell>{d.medida ?? '—'}</TableCell>
                      <TableCell><Chip size="small" label={d.estado} color={ESTADO_COLOR[d.estado] ?? 'default'} /></TableCell>
                      <TableCell>{d.km_total?.toLocaleString('es-CO') ?? '—'}</TableCell>
                      <TableCell>{d.costo_neto ? `$${d.costo_neto.toLocaleString('es-CO')}` : '—'}</TableCell>
                      <TableCell>{d.cpk ? `$${d.cpk.toLocaleString('es-CO')}/km` : '—'}</TableCell>
                      <TableCell>{d.costo_mm ? `$${d.costo_mm.toLocaleString('es-CO')}/mm` : '—'}</TableCell>
                      <TableCell>{d.mm_gastados ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {congeladoDetalle.length === 0 && <TableRow><TableCell colSpan={9} align="center"><Typography color="text.secondary" py={2}>Sin datos</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCongeladoDetalleId(null)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
