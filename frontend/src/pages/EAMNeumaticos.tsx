import { useState, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip, Card, CardContent, Alert, TextField, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Stack, Tooltip, alpha,
  Switch, FormControlLabel, Badge, Divider, Menu, ListItemIcon, ListItemText, Checkbox,
  Autocomplete, ButtonGroup, InputAdornment, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TireRepair, Inventory2, Recycling, Add as AddIcon, Close as CloseIcon,
  History as HistoryIcon, SwapHoriz as SwapIcon, Warehouse as WarehouseIcon,
  DeleteForever, DirectionsCar, ShowChart, TrendingUp, NotificationsActive,
  Autorenew, Download, Straighten, Compress, AttachMoney, Build, Map as MapIcon, Timeline, Undo,
  UploadFile, CameraAlt, Checklist, ArrowDropDown, AddBox, Search as SearchIcon,
  FilterAltOff, TireRepair as TireIcon, Edit as EditIcon,
} from '@mui/icons-material'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Legend,
} from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiClient as api } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'
import { exportarPDF, exportarExcel } from '@/utils/exportar'
import { EsquemaLlantasPreview } from '@/components/EsquemaLlantasPreview'
import { CatalogoLlantas } from '@/components/CatalogoLlantas'
import { SelectorCatalogoLlanta, SELECCION_VACIA } from '@/components/SelectorCatalogoLlanta'
import type { SeleccionCatalogo } from '@/components/SelectorCatalogoLlanta'
import type { VehiculoCombinado } from '@/components/VehiculosCombinados'

import { COLOR_MODULO } from '@/config/marca'
const EAM_COLOR = COLOR_MODULO
const EAM_DARK = COLOR_MODULO

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Vehiculo { id: number; codigo: string; nombre: string; placa?: string; numero_ejes?: number | null; tiene_repuesto?: boolean; marca?: string; modelo?: string; tipo_activo?: string; odometro_actual?: number; horometro_actual?: number; motor_marca?: string; motor_linea?: string; motor_cc?: number }
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
/** Una línea de la bitácora. `id` en null es el alta, que se deriva de la llanta. */
interface MovimientoBitacora {
  id: number | null
  neumatico_id: number
  neumatico_codigo: string
  tipo_movimiento: string
  fecha?: string | null
  posicion_origen?: string | null
  posicion?: string | null
  activo_id?: number | null
  activo_codigo?: string | null
  bodega_id?: number | null
  bodega_nombre?: string | null
  km_odometro?: number | null
  horometro?: number | null
  tecnico?: string | null
  observaciones?: string | null
  editable: boolean
}

const TIPOS_BITACORA = [
  'ALTA', 'INSTALACION', 'ROTACION', 'DESMONTAJE', 'ALMACENAMIENTO',
  'VOLTEO', 'REENCAUCHE', 'BAJA',
]
const COLOR_MOVIMIENTO: Record<string, string> = {
  ALTA: '#0891B2', INSTALACION: '#16A34A', ROTACION: '#7C3AED',
  DESMONTAJE: '#F59E0B', ALMACENAMIENTO: '#64748B', VOLTEO: '#8B5CF6',
  REENCAUCHE: '#0369A1', BAJA: '#DC2626',
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
interface InspeccionHistorial {
  id: number; neumatico_id: number; codigo: string
  marca?: string | null; referencia?: string | null; medida?: string | null
  estado_llanta?: string | null; vida?: string | null
  activo_id?: number | null; vehiculo?: string | null; posicion?: string | null
  fecha?: string | null
  profundidad_izq?: number | null; profundidad_centro?: number | null; profundidad_der?: number | null
  profundidad_min?: number | null; presion_psi?: number | null; km_odometro?: number | null
  estado_visual?: string | null; observaciones?: string | null; tecnico?: string | null
}

interface EsquemaVehiculo { id: number; codigo?: string | null; nombre: string; tipo_activo?: string | null; numero_ejes: number; layout?: number[] | null; tiene_repuesto: boolean; cantidad_repuestos: number; observaciones?: string | null; activo: boolean }
interface TrabajoNeu { id: number; nombre: string; observaciones?: string | null; es_predeterminado: boolean; activo: boolean }
interface PeriodicidadTrabajo { id: number; trabajo_id: number; tipo_activo?: string | null; valor: number; unidad: string; activo: boolean }
interface TrabajoRealizado { id: number; neumatico_id: number; trabajo_id: number; fecha: string; km_odometro?: number | null; cantidad: number; costo_unitario?: number | null; proveedor?: string | null; observaciones?: string | null }
interface Reesculturado { id: number; neumatico_id: number; fecha: string; km_odometro?: number | null; proveedor?: string | null; costo?: number | null; profundidad_anterior?: number | null; profundidad_nueva?: number | null; deshecho: boolean; fecha_deshecho?: string | null }
interface VidaNeu { id: number; neumatico_id: number; numero_vida: number; tipo: string; fecha_inicio: string; fecha_fin?: string | null; km_inicio: number; km_fin?: number | null; costo?: number | null; profundidad_inicial?: number | null; profundidad_final?: number | null; motivo_cierre_id?: number | null }

const EMPTY_NEUMATICO = { codigo: '', marca: '', referencia: '', medida: '', tipo: '', tipo_uso: '', bodega_id: '', costo: '', proveedor: '', profundidad_diseño: '', profundidad_actual: '', vida_util_km: '', presion_recomendada: '', zona_id: '', dot: '', tipo_rin: '' }
const TIPOS_RIN = ['ACERO', 'ALUMINIO', 'OTRO']

const ESTADO_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  INSTALADO: 'success', ALMACENADO: 'info', REENCAUCHE: 'warning', BAJA: 'error',
}
// Genera la lista de códigos entre uno inicial y uno final: "LL-001" a "LL-050"
// → ["LL-001", …, "LL-050"]. Mismo criterio que el cargue masivo de Estibas.
function generarCodigos(inicio: string, fin: string): string[] | null {
  const mi = inicio.trim().match(/^(.*?)(\d+)$/)
  const mf = fin.trim().match(/^(.*?)(\d+)$/)
  if (!mi || !mf) return null
  const prefijo = mi[1]
  const desde = parseInt(mi[2], 10)
  const hasta = parseInt(mf[2], 10)
  const relleno = mi[2].length
  if (hasta < desde) return null
  if (hasta - desde > 999) return null   // límite de seguridad
  const codigos: string[] = []
  for (let i = desde; i <= hasta; i++) codigos.push(prefijo + String(i).padStart(relleno, '0'))
  return codigos
}

/** Una lectura solo cuenta si es un número mayor que cero: "0" es cadena
 *  verdadera, así que `!valor` daba por válido un odómetro en cero. */
const sinLecturaValida = (km: string, horas: string) => {
  const n = (v: string) => (v.trim() === '' ? 0 : Number(v))
  return !(n(km) > 0) && !(n(horas) > 0)
}

const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const fmtFecha = (s?: string | null) => { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO') }

// ─── Diálogo: agregar llanta desde bodega ──────────────────────────────────────
// Componente propio con estado local: escribir/seleccionar aquí NO vuelve a
// renderizar el diagrama ni el resto de la página (antes el formulario vivía
// en el componente principal y cada tecla re-renderizaba todo).
interface AgregarLlantaPayload {
  neumatico_id: number; posicion: string; fecha: string
  km_odometro?: number; horometro?: number; tecnico?: string; observaciones?: string
}
function AgregarLlantaDialog({
  open, onClose, veh, layout, almacen, tireEnVeh, onSubmit, isPending,
  posicionInicial, bodegas,
}: {
  open: boolean
  onClose: () => void
  veh: Vehiculo | null | undefined
  layout: Posicion[]
  almacen: Neumatico[]
  tireEnVeh: (posicion: string) => Neumatico | undefined
  onSubmit: (payload: AgregarLlantaPayload) => void
  isPending: boolean
  /** Posición ya elegida, cuando se entra haciendo clic en una rueda vacía. */
  posicionInicial?: string
  bodegas: { id: number; nombre: string }[]
}) {
  const EMPTY = {
    neumatico_id: '', posicion: '', fecha: nowLocal(),
    km_odometro: '', horometro: '', tecnico: '', observaciones: '',
  }
  const [form, setForm] = useState(EMPTY)
  const [bodegaFiltro, setBodegaFiltro] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setForm({
      ...EMPTY,
      posicion: posicionInicial ?? '',
      // La lectura actual del equipo se propone, pero hay que confirmarla: al
      // montar suele haber rodado desde la última vez que se registró.
      // Solo se propone si el equipo ya trae lectura: precargar 0 invitaba a
      // aceptarlo tal cual y dejaba el recorrido de la llanta sin punto de
      // partida.
      km_odometro: veh?.odometro_actual ? String(veh.odometro_actual) : '',
      horometro: veh?.horometro_actual ? String(veh.horometro_actual) : '',
    })
    setBodegaFiltro('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const nombreBodega = (id?: number | null) =>
    bodegas.find(b => b.id === id)?.nombre ?? 'Sin bodega'

  const disponibles = almacen
    .filter(n => n.estado === 'ALMACENADO')
    .filter(n => !bodegaFiltro || String(n.bodega_id ?? '') === bodegaFiltro)
  const libres = layout.filter(p => !tireEnVeh(p.codigo))
  const bodegasConLlantas = bodegas.filter(b =>
    almacen.some(n => n.estado === 'ALMACENADO' && n.bodega_id === b.id))

  // El backend exige una de las dos lecturas: es el punto de partida del
  // recorrido de la llanta y sin ella no hay CPK.
  const sinLectura = sinLecturaValida(form.km_odometro, form.horometro)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
        {posicionInicial ? 'Montar llanta en la posición' : 'Agregar llanta desde bodega'}
        <Typography variant="caption" color="text.secondary" display="block">
          {veh?.codigo}{veh?.placa ? ` · ${veh.placa}` : ''} — {veh?.nombre}
          {posicionInicial && ` · ${layout.find(p => p.codigo === posicionInicial)?.label ?? posicionInicial}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={0.5}>
          {bodegasConLlantas.length > 1 && (
            <TextField select label="Ubicación" size="small" fullWidth value={bodegaFiltro}
              onChange={e => { setBodegaFiltro(e.target.value); setForm(f => ({ ...f, neumatico_id: '' })) }}>
              <MenuItem value="">Todas las bodegas</MenuItem>
              {bodegasConLlantas.map(b => (
                <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>
              ))}
            </TextField>
          )}
          <Autocomplete
            size="small"
            options={disponibles}
            value={disponibles.find(n => String(n.id) === form.neumatico_id) ?? null}
            onChange={(_e, v) => setForm(f => ({ ...f, neumatico_id: v ? String(v.id) : '' }))}
            // La bodega entra en la etiqueta para que el buscador también la
            // encuentre escribiendo el nombre de la ubicación.
            getOptionLabel={n => `${n.codigo} · ${n.marca ?? ''} ${n.medida ?? ''} · ${nombreBodega(n.bodega_id)}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="Sin resultados"
            renderInput={params => (
              <TextField {...params} label="Llanta en bodega *"
                placeholder="Buscar por código, marca, medida o ubicación…" />
            )}
            renderOption={(props, n) => (
              <li {...props} key={n.id}>
                <Stack>
                  <Typography fontSize={13.5} fontWeight={600}>{n.codigo}</Typography>
                  <Typography fontSize={11.5} color="text.secondary">
                    {n.marca ?? '—'} · {n.medida ?? '—'} · {nombreBodega(n.bodega_id)}
                  </Typography>
                </Stack>
              </li>
            )}
          />
          {disponibles.length === 0 && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              {bodegaFiltro ? 'No hay llantas en esa bodega.' : 'No hay llantas disponibles en bodega.'}
            </Alert>
          )}
          {libres.length === 0 ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>Este vehículo no tiene posiciones libres. Desmonta una llanta primero.</Alert>
          ) : (
            <TextField
              select label="Posición *" size="small" fullWidth value={form.posicion}
              onChange={e => setForm(f => ({ ...f, posicion: e.target.value }))}
              SelectProps={{ MenuProps: { transitionDuration: 0 } }}
            >
              <MenuItem value="">Seleccionar…</MenuItem>
              {libres.map(p => <MenuItem key={p.codigo} value={p.codigo}>{p.label}</MenuItem>)}
            </TextField>
          )}
          <TextField label="Fecha y hora del montaje *" type="datetime-local" size="small" fullWidth
            value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            InputLabelProps={{ shrink: true }} />
          <Stack direction="row" spacing={1}>
            <TextField label="Odómetro (km)" type="number" size="small" fullWidth
              value={form.km_odometro}
              onChange={e => setForm(f => ({ ...f, km_odometro: e.target.value }))} />
            <TextField label="Horómetro (h)" type="number" size="small" fullWidth
              value={form.horometro}
              onChange={e => setForm(f => ({ ...f, horometro: e.target.value }))} />
          </Stack>
          {sinLectura && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Registre el odómetro o el horómetro: es el punto de partida para calcular el
              recorrido de la llanta y su costo por kilómetro.
            </Alert>
          )}
          <TextField label="Técnico" size="small" fullWidth value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} />
          <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained"
          disabled={!form.neumatico_id || !form.posicion || !form.fecha || sinLectura || isPending}
          onClick={() => onSubmit({
            neumatico_id: Number(form.neumatico_id), posicion: form.posicion,
            fecha: new Date(form.fecha).toISOString(),
            km_odometro: form.km_odometro ? Number(form.km_odometro) : undefined,
            horometro: form.horometro ? Number(form.horometro) : undefined,
            tecnico: form.tecnico || undefined, observaciones: form.observaciones || undefined,
          })}
          sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Montar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function EAMNeumaticos() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [vehId, setVehId] = useState<string>('')
  const [draggedTire, setDraggedTire] = useState<Neumatico | null>(null)
  const [overSlot, setOverSlot] = useState<string>('')

  // Diálogos
  const [slotMenu, setSlotMenu] = useState<null | { anchor: HTMLElement; tire: Neumatico; pos: string }>(null)
  const [movDialog, setMovDialog] = useState<null | { tire: Neumatico; tipo: string; posicion?: string }>(null)
  const [movForm, setMovForm] = useState({ fecha: nowLocal(), km_odometro: '', horometro: '', bodega_id: '', tecnico: '', observaciones: '' })
  const [bajaDialog, setBajaDialog] = useState<Neumatico | null>(null)
  const [bajaForm, setBajaForm] = useState({ fecha: nowLocal(), dano_id: '', motivo: '', motivo_fin_vida_id: '' })
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ ...EMPTY_NEUMATICO })
  // Seleccion contra el catalogo + vida (VN / R{n}) + datos de llanta usada
  const [nuevoCat, setNuevoCat] = useState<SeleccionCatalogo>({ ...SELECCION_VACIA })
  const [nuevoVida, setNuevoVida] = useState({ reencauches: '0', es_usada: false, profundidad_actual: '', km_actual: '' })
  const [masivoCat, setMasivoCat] = useState<SeleccionCatalogo>({ ...SELECCION_VACIA })
  const [masivoVida, setMasivoVida] = useState({ reencauches: '0', es_usada: false, profundidad_actual: '', km_actual: '' })
  const [histTire, setHistTire] = useState<Neumatico | null>(null)
  // Vehículo al que se le está configurando el esquema de ejes/llantas (desde Configuración)
  const [ejesVeh, setEjesVeh] = useState<VehiculoCombinado | null>(null)
  const [ejesForm, setEjesForm] = useState({ esquema_id: '' })
  const [ejesBusca, setEjesBusca] = useState('')
  // Filtros de la pestana Inspecciones
  const [inspBusca, setInspBusca] = useState('')
  const [inspVeh, setInspVeh] = useState('')
  const [inspEstado, setInspEstado] = useState('')
  const [inspVida, setInspVida] = useState('')
  const [inspCobertura, setInspCobertura] = useState<'TODAS' | 'CON' | 'SIN'>('TODAS')
  // Periodo del historial de inspecciones (vacio = todo el historico)
  const [inspDesde, setInspDesde] = useState('')
  const [inspHasta, setInspHasta] = useState('')
  // Inspecciones
  const [inspDialog, setInspDialog] = useState<Neumatico | null>(null)   // llanta a inspeccionar
  const [chartTire, setChartTire] = useState<Neumatico | null>(null)     // llanta cuya gráfica/historial se ve
  const [rotDialog, setRotDialog] = useState<Neumatico | null>(null)     // llanta a intercambiar (rotación)
  const [rotTarget, setRotTarget] = useState<string>('')                 // llanta destino del intercambio
  const [voltearDialog, setVoltearDialog] = useState<Neumatico | null>(null)
  // Montaje por botón (alternativa al arrastrar y soltar)
  const [montarDialog, setMontarDialog] = useState<Neumatico | null>(null)
  const [montarForm, setMontarForm] = useState({ activo_id: '', posicion: '', fecha: nowLocal(), km_odometro: '', horometro: '', tecnico: '', observaciones: '' })
  // Agregar llanta desde bodega al vehículo seleccionado (desde "Llantas por Vehículo")
  const [agregarLlantaOpen, setAgregarLlantaOpen] = useState(false)
  /** Posición desde la que se abrió el montaje, al hacer clic en una rueda vacía. */
  const [posicionAMontar, setPosicionAMontar] = useState('')
  // ─── Bitácora de movimientos ──────────────────────────────────────────────
  const [bitBusq, setBitBusq] = useState('')
  const [bitTipo, setBitTipo] = useState('')
  const [bitLlanta, setBitLlanta] = useState('')
  const [bitDialog, setBitDialog] = useState<MovimientoBitacora | null>(null)
  const [bitForm, setBitForm] = useState({
    fecha: nowLocal(), km_odometro: '', horometro: '', tecnico: '', observaciones: '',
  })

  /** Bandeja de llantas pegada al diagrama, para arrastrar sin cruzar la pantalla. */
  const [modoMontaje, setModoMontaje] = useState(false)
  const [busqMontaje, setBusqMontaje] = useState('')
  const [bodegaMontaje, setBodegaMontaje] = useState('')

  /**
   * Rotación con almacén temporal.
   *
   * Mientras se acomodan las llantas no se toca la base: `planRotacion` guarda
   * la posición que va tomando cada una y `enRotacion` las que están sacadas
   * esperando destino. Todo entra junto al confirmar, con un solo movimiento
   * por llanta — desmontar y volver a montar de a una llenaría el historial de
   * bajas y altas que nunca ocurrieron y arruinaría el CPK.
   */
  const [modoRotacion, setModoRotacion] = useState(false)
  /** neumatico_id → posición destino dentro del vehículo. */
  const [planRotacion, setPlanRotacion] = useState<Record<number, string>>({})
  /** Llantas sacadas al almacén de rotación, sin destino todavía. */
  const [enRotacion, setEnRotacion] = useState<number[]>([])
  const [rotPlanDialog, setRotPlanDialog] = useState(false)
  const [rotPlanForm, setRotPlanForm] = useState({
    fecha: nowLocal(), km_odometro: '', horometro: '', tecnico: '', observaciones: '',
  })
  /**
   * Medición de cada llanta al rotar, por neumatico_id.
   *
   * Rotar es el momento en que la llanta está en la mano, así que se aprovecha
   * para dejar la inspección del día: lo que se anote acá actualiza la
   * profundidad y la presión de la llanta.
   */
  const [rotInspec, setRotInspec] = useState<Record<number, {
    izq: string; centro: string; der: string; psi: string; estado: string
  }>>({})
  const medicionDe = (id: number) =>
    rotInspec[id] ?? { izq: '', centro: '', der: '', psi: '', estado: '' }
  const setMedicion = (id: number, campo: string, valor: string) =>
    setRotInspec(p => ({ ...p, [id]: { ...medicionDe(id), [campo]: valor } }))
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
  const [menuNuevaLlanta, setMenuNuevaLlanta] = useState<null | HTMLElement>(null)
  // Creación masiva por rango de códigos (sin Excel), como en Estibas
  const [masivoOpen, setMasivoOpen] = useState(false)
  const [masivoCodIni, setMasivoCodIni] = useState('')
  const [masivoCodFin, setMasivoCodFin] = useState('')
  const [masivoPreview, setMasivoPreview] = useState<string[]>([])
  const [masivoError, setMasivoError] = useState('')
  const [masivoForm, setMasivoForm] = useState({ ...EMPTY_NEUMATICO })
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
  const [loteForm, setLoteForm] = useState({ fecha_envio: new Date().toISOString().slice(0, 10), proveedor: '', remision: '', observaciones: '' })
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

  // ─── Filtros de "Llantas por Vehículo" ────────────────────────────────────
  // El selector de vehículo era un <select> plano: con una flota grande hay que
  // recorrer la lista entera para hallar una placa. Ahora se escribe la placa y
  // además se acota la lista por las categorías que de verdad discriminan.
  // Se filtra por la tipologia del vehiculo: eso es lo que sirve para hallarlo.
  // El estado de sus llantas (esquema de ejes, montaje completo o no) no es una
  // categoria del vehiculo, asi que se muestra en cada opcion de la lista pero
  // no se usa para filtrar.
  const [vehTipo, setVehTipo] = useState('')
  const [vehMarca, setVehMarca] = useState('')
  const [vehLinea, setVehLinea] = useState('')
  // Filtros del panel de almacén (a la derecha del diagrama)
  const [almBusq, setAlmBusq] = useState('')
  const [almMedida, setAlmMedida] = useState('')
  const [almMarca, setAlmMarca] = useState('')
  const [almVida, setAlmVida] = useState('')
  const [almBodega, setAlmBodega] = useState('')

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
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo vincular el vehículo al CMMS')),
  })
  const seleccionarVehiculo = (key: string) => {
    setVehSelKey(key)
    if (!key) { setVehId(''); return }
    const v = vehiculosDisponibles.find(x => `${x.origen}:${x.id}` === key)
    if (!v) return
    if (v.activo_id) setVehId(String(v.activo_id))
    else mutVincularVeh.mutate(v)
  }
  // Llegada desde Activos con un vehículo ya elegido (?activo=<id de eam_activo>):
  // se preselecciona en cuanto carga la lista, para no obligar a buscarlo de nuevo.
  const activoParam = searchParams.get('activo')
  const [preseleccionAplicada, setPreseleccionAplicada] = useState(false)
  if (activoParam && !preseleccionAplicada && vehiculosDisponibles.length > 0) {
    setPreseleccionAplicada(true)
    const v = vehiculosDisponibles.find(x => String(x.activo_id) === activoParam)
    if (v) { setVehSelKey(`${v.origen}:${v.id}`); setVehId(String(v.activo_id)) }
  }
  const { data: historialInsp = [] } = useQuery<InspeccionHistorial[]>({
    queryKey: ['eam-historial-inspecciones', inspDesde, inspHasta],
    queryFn: () => api.get('/eam/neumaticos/inspecciones', {
      params: {
        desde: inspDesde ? new Date(`${inspDesde}T00:00:00`).toISOString() : undefined,
        hasta: inspHasta ? new Date(`${inspHasta}T23:59:59`).toISOString() : undefined,
      },
    }).then(r => r.data),
  })
  const { data: neumaticos = [] } = useQuery<Neumatico[]>({ queryKey: ['eam-neumaticos'], queryFn: () => api.get('/eam/neumaticos').then(r => r.data) })
  const { data: bodegas = [] } = useQuery<Bodega[]>({ queryKey: ['eam-bodegas-neu'], queryFn: () => api.get('/eam/neumaticos/bodegas').then(r => r.data) })
  const { data: bitacora = [] } = useQuery<MovimientoBitacora[]>({
    queryKey: ['eam-bitacora-neu'],
    queryFn: () => api.get('/eam/neumaticos/movimientos').then(r => r.data),
  })
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
  /**
   * Qué llanta se ve en una posición.
   *
   * En rotación manda el plan en curso y no lo que dice la base: la llanta que
   * se sacó al almacén deja su rueda libre en pantalla aunque siga instalada
   * hasta que se confirme.
   */
  const tireEn = (pos: string) => {
    if (modoRotacion) {
      const movida = neumaticos.find(n => planRotacion[n.id] === pos)
      if (movida) return movida
      const original = neumaticos.find(n => n.activo_id === veh?.id && n.posicion === pos)
      if (!original) return undefined
      // Sacada al almacén, o reubicada en otra posición por el plan.
      if (enRotacion.includes(original.id) || planRotacion[original.id]) return undefined
      return original
    }
    return neumaticos.find(n => n.activo_id === veh?.id && n.posicion === pos)
  }
  const bodegaNombre = (id?: number | null) => bodegas.find(b => b.id === id)?.nombre ?? '—'

  // ─── Derivados de los filtros de "Llantas por Vehículo" ───────────────────

  /** Ruedas de calzada que espera el vehículo según su esquema de ejes.
   *  Espeja `_generar_posiciones` del backend: si hay layout por eje se suma,
   *  y si no se cae al patrón clásico (eje 1 con 2 llantas, el resto con 4).
   *  El repuesto no se cuenta: un vehículo con todas las ruedas puestas y sin
   *  repuesto está completo para rodar, que es lo que interesa aquí. */
  const ruedasEsperadas = (v: VehiculoCombinado): number => {
    if (!v.numero_ejes) return 0
    const layoutV = v.layout_llantas
    if (Array.isArray(layoutV) && layoutV.length > 0) {
      return layoutV.reduce((a, b) => a + (Number(b) || 0), 0)
    }
    return 2 + Math.max(v.numero_ejes - 1, 0) * 4
  }

  /** Llantas instaladas por vehículo del CMMS, en una sola pasada. */
  const montadasPorActivo = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const n of neumaticos) {
      if (n.estado === 'INSTALADO' && n.activo_id) {
        mapa.set(n.activo_id, (mapa.get(n.activo_id) ?? 0) + 1)
      }
    }
    return mapa
  }, [neumaticos])

  /** Vehículos con al menos una llanta en alerta. */
  const activosConAlerta = useMemo(
    () => new Set(alertas.map(a => a.activo_id).filter((x): x is number => !!x)),
    [alertas],
  )

  const opcionesVeh = useMemo(() => {
    const unico = (vals: (string | undefined | null)[]) =>
      Array.from(new Set(vals.filter((x): x is string => !!x && x.trim() !== ''))).sort()
    return {
      tipos: unico(vehiculosDisponibles.map(v => v.tipo)),
      marcas: unico(vehiculosDisponibles.map(v => v.marca)),
      lineas: unico(vehiculosDisponibles.map(v => v.modelo)),
    }
  }, [vehiculosDisponibles])

  const vehiculosFiltrados = useMemo(() => {
    return vehiculosDisponibles.filter(v => {
      if (vehTipo && v.tipo !== vehTipo) return false
      if (vehMarca && v.marca !== vehMarca) return false
      if (vehLinea && v.modelo !== vehLinea) return false
      return true
    })
  }, [vehiculosDisponibles, vehTipo, vehMarca, vehLinea])

  const vehSeleccionado = useMemo(
    () => vehiculosDisponibles.find(v => `${v.origen}:${v.id}` === vehSelKey) ?? null,
    [vehiculosDisponibles, vehSelKey],
  )

  /** Opciones del selector. Si un filtro de categoría deja fuera al vehículo
   *  que ya estaba elegido, se lo vuelve a incluir: de lo contrario el valor no
   *  estaría entre las opciones, MUI advierte y el campo se ve vacío aunque el
   *  diagrama siga mostrando ese vehículo. */
  const vehiculosParaSelector = useMemo(() => {
    if (!vehSeleccionado) return vehiculosFiltrados
    const dentro = vehiculosFiltrados.some(
      v => v.origen === vehSeleccionado.origen && v.id === vehSeleccionado.id)
    return dentro ? vehiculosFiltrados : [vehSeleccionado, ...vehiculosFiltrados]
  }, [vehiculosFiltrados, vehSeleccionado])

  /** Búsqueda libre del vehículo. Se hace como filterOptions del Autocomplete
   *  (y no filtrando `options`) para que el vehículo ya seleccionado siga
   *  estando entre las opciones mientras se escribe. Cubre más campos que la
   *  etiqueta visible: también tipo y propietario. */
  const buscarVehiculos = (opciones: VehiculoCombinado[], texto: string) => {
    const q = texto.trim().toLowerCase()
    if (!q) return opciones
    return opciones.filter(v =>
      [v.placa, v.codigo, v.nombre, v.marca, v.modelo, v.tipo, v.propietario]
        .some(x => (x ?? '').toString().toLowerCase().includes(q)))
  }

  const filtrosVehActivos = Boolean(vehTipo || vehMarca || vehLinea)
  const limpiarFiltrosVeh = () => { setVehTipo(''); setVehMarca(''); setVehLinea('') }

  // ─── Derivados de los filtros del almacén ─────────────────────────────────
  const vidaDe = (n: Neumatico) => ((n.reencauches ?? 0) === 0 ? 'VN' : `R${n.reencauches}`)

  const opcionesAlm = useMemo(() => {
    const unico = (vals: (string | undefined | null)[]) =>
      Array.from(new Set(vals.filter((x): x is string => !!x && x.trim() !== ''))).sort()
    return {
      medidas: unico(almacen.map(n => n.medida)),
      marcas: unico(almacen.map(n => n.marca)),
      vidas: unico(almacen.map(vidaDe)),
      bodegas: Array.from(new Set(almacen.map(n => n.bodega_id).filter((x): x is number => !!x))),
    }
  }, [almacen])

  const bitacoraFiltrada = useMemo(() => {
    const q = bitBusq.trim().toLowerCase()
    return bitacora.filter(m => {
      if (bitTipo && m.tipo_movimiento !== bitTipo) return false
      if (bitLlanta && String(m.neumatico_id) !== bitLlanta) return false
      if (!q) return true
      return [m.neumatico_codigo, m.activo_codigo, m.tecnico, m.observaciones,
        m.posicion, m.posicion_origen, m.bodega_nombre]
        .some(x => (x ?? '').toString().toLowerCase().includes(q))
    })
  }, [bitacora, bitBusq, bitTipo, bitLlanta])

  /** Corregir o borrar cambia el estado de la llanta, así que se refresca todo. */
  const refrescarBitacora = () => {
    qc.invalidateQueries({ queryKey: ['eam-bitacora-neu'] })
    qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
    qc.invalidateQueries({ queryKey: ['eam-inspecciones'] })
  }

  const mutCorregirMov = useMutation({
    mutationFn: () => api.put(`/eam/neumaticos/movimientos/${bitDialog!.id}`, {
      fecha: new Date(bitForm.fecha).toISOString(),
      km_odometro: bitForm.km_odometro.trim() === '' ? null : Number(bitForm.km_odometro),
      horometro: bitForm.horometro.trim() === '' ? null : Number(bitForm.horometro),
      tecnico: bitForm.tecnico || null,
      observaciones: bitForm.observaciones || null,
    }).then(r => r.data),
    onSuccess: () => { toast.success('Movimiento corregido'); refrescarBitacora(); setBitDialog(null) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo corregir el movimiento')),
  })

  const mutBorrarMov = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/movimientos/${id}`),
    onSuccess: () => { toast.success('Movimiento eliminado'); refrescarBitacora() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo eliminar el movimiento')),
  })

  /** Bodegas que hoy tienen algo disponible: filtrar por una vacía no sirve. */
  const bodegasConDisponibles = useMemo(
    () => bodegas.filter(b => almacen.some(n => n.estado === 'ALMACENADO' && n.bodega_id === b.id)),
    [bodegas, almacen],
  )

  /** Lo que se ofrece en la bandeja de montaje pegada al diagrama. */
  const llantasParaMontar = useMemo(() => {
    const q = busqMontaje.trim().toLowerCase()
    return almacen
      .filter(n => n.estado === 'ALMACENADO')
      .filter(n => !bodegaMontaje || String(n.bodega_id ?? '') === bodegaMontaje)
      .filter(n => !q || [n.codigo, n.marca, n.medida, n.referencia, n.dot]
        .some(x => (x ?? '').toString().toLowerCase().includes(q)))
  }, [almacen, busqMontaje, bodegaMontaje])

  const almacenFiltrado = useMemo(() => {
    const q = almBusq.trim().toLowerCase()
    return almacen.filter(n => {
      if (almMedida && n.medida !== almMedida) return false
      if (almMarca && n.marca !== almMarca) return false
      if (almVida && vidaDe(n) !== almVida) return false
      if (almBodega && String(n.bodega_id ?? '') !== almBodega) return false
      if (!q) return true
      return [n.codigo, n.marca, n.referencia, n.medida, n.dot]
        .some(x => (x ?? '').toString().toLowerCase().includes(q))
    })
  }, [almacen, almBusq, almMedida, almMarca, almVida, almBodega])

  const filtrosAlmActivos = Boolean(almBusq || almMedida || almMarca || almVida || almBodega)
  const limpiarFiltrosAlm = () => {
    setAlmBusq(''); setAlmMedida(''); setAlmMarca(''); setAlmVida(''); setAlmBodega('')
  }

  /** Medida predominante de las llantas ya montadas en el vehículo elegido.
   *  Sirve de atajo: al montar se busca casi siempre la misma medida. */
  const medidaDelVehiculo = useMemo(() => {
    if (!veh) return ''
    const conteo = new Map<string, number>()
    for (const n of neumaticos) {
      if (n.estado === 'INSTALADO' && n.activo_id === veh.id && n.medida) {
        conteo.set(n.medida, (conteo.get(n.medida) ?? 0) + 1)
      }
    }
    let mejor = ''
    let max = 0
    conteo.forEach((c, m) => { if (c > max) { max = c; mejor = m } })
    return mejor
  }, [veh, neumaticos])

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
    qc.invalidateQueries({ queryKey: ['eam-mov'] })
  }

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutMov = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos/movimiento', body),
    onSuccess: () => { toast.success('Movimiento registrado'); invalidar() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error en el movimiento')),
  })
  const mutNuevo = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos', body),
    onSuccess: () => { toast.success('Neumático registrado'); qc.invalidateQueries({ queryKey: ['eam-neumaticos'] }); setNuevoOpen(false); setNuevoForm({ ...EMPTY_NEUMATICO }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al registrar')),
  })
  // Asigna una categoría de ejes/llantas ya pre-configurada (esquema) al vehículo
  // seleccionado — no se digitan números eje por eje aquí, esa configuración vive
  // en Activos ("Esquemas de vehículo").
  const mutEjes = useMutation({
    mutationFn: (esquema_id: number) => api.post('/eam/neumaticos/esquemas/asignar', {
      activo_id: ejesVeh!.activo_id, esquema_id, fecha_vigencia: new Date().toISOString().slice(0, 10),
    }),
    onSuccess: () => {
      toast.success('Categoría de ejes/llantas asignada')
      qc.invalidateQueries({ queryKey: ['eam-activos'] })
      qc.invalidateQueries({ queryKey: ['eam-layout'] })
      qc.invalidateQueries({ queryKey: ['eam-vehiculos-disponibles'] })
      setEjesVeh(null)
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al asignar la categoría')),
  })
  // Abre la configuración de ejes de un vehículo cualquiera (desde Configuración).
  // Si es externo (TMS/Flota) y aún no está vinculado al CMMS, se vincula primero.
  const mutVincularParaEjes = useMutation({
    mutationFn: (v: VehiculoCombinado) => api.post('/eam/activos/vincular-externo', { origen: v.origen, origen_id: v.id }).then(r => r.data),
    onSuccess: (activo) => {
      qc.invalidateQueries({ queryKey: ['eam-vehiculos-disponibles'] })
      setEjesVeh(prev => prev ? { ...prev, activo_id: activo.id } : prev)
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo vincular el vehículo al CMMS')),
  })
  // Total de llantas del vehículo: si ya tiene layout asignado se suma tal cual;
  // si no, se estima con el patrón clásico (eje 1 = 2, resto = 4), igual que el backend.
  const totalLlantasDe = (v: VehiculoCombinado) => {
    if (v.layout_llantas?.length) return v.layout_llantas.reduce((a, b) => a + b, 0)
    if (v.numero_ejes == null) return '—'
    return 2 + Math.max(0, v.numero_ejes - 1) * 4
  }
  const abrirEjes = (v: VehiculoCombinado) => {
    setEjesForm({ esquema_id: '' })
    setEjesVeh(v)
    if (!v.activo_id) mutVincularParaEjes.mutate(v)
  }

  // Config: bodegas y catálogo de daños
  const [bodForm, setBodForm] = useState({ codigo: '', nombre: '', ubicacion: '' })
  const [danoForm, setDanoForm] = useState({ codigo: '', nombre: '', severidad: 'MODERADO', accion: 'INSPECCION' })
  const mutBodega = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/bodegas', b),
    onSuccess: () => { toast.success('Bodega creada'); qc.invalidateQueries({ queryKey: ['eam-bodegas-neu'] }); setBodForm({ codigo: '', nombre: '', ubicacion: '' }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear bodega')),
  })
  const mutBodegaDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/bodegas/${id}`),
    onSuccess: () => { toast.success('Bodega eliminada'); qc.invalidateQueries({ queryKey: ['eam-bodegas-neu'] }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo eliminar')),
  })
  const mutDano = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post('/eam/neumaticos/danos-catalogo', d),
    onSuccess: () => { toast.success('Daño creado'); qc.invalidateQueries({ queryKey: ['eam-danos-neu'] }); setDanoForm({ codigo: '', nombre: '', severidad: 'MODERADO', accion: 'INSPECCION' }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear daño')),
  })
  const mutDanoDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/danos-catalogo/${id}`),
    onSuccess: () => { toast.success('Daño eliminado'); qc.invalidateQueries({ queryKey: ['eam-danos-neu'] }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo eliminar')),
  })
  const [catForm, setCatForm] = useState({ tipo: 'MARCA', nombre: '', valor: '' })
  const mutCat = useMutation({
    mutationFn: (c: Record<string, unknown>) => api.post('/eam/neumaticos/catalogo', c),
    onSuccess: () => { toast.success('Opción agregada'); qc.invalidateQueries({ queryKey: ['eam-cat-neu'] }); setCatForm(f => ({ ...f, nombre: '', valor: '' })) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al agregar')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear zona')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear banda')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear motivo')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al aplicar el ajuste')),
  })
  // Trabajos y periodicidad
  const mutTrabajo = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/trabajos', b),
    onSuccess: () => { toast.success('Trabajo creado'); qc.invalidateQueries({ queryKey: ['eam-trabajos-cat'] }); setTrabajoForm({ nombre: '', observaciones: '' }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear trabajo')),
  })
  const mutTrabajoDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/trabajos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eam-trabajos-cat'] }),
    onError: () => toast.error('No se pudo eliminar'),
  })
  const mutPeriodicidad = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/trabajos/periodicidad', b),
    onSuccess: () => { toast.success('Periodicidad creada'); qc.invalidateQueries({ queryKey: ['eam-periodicidad'] }); setPeriodForm({ trabajo_id: '', tipo_activo: '', valor: '', unidad: 'KILOMETROS' }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear periodicidad')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al registrar el trabajo')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al reesculturar')),
  })
  const mutDeshacerResc = useMutation({
    mutationFn: (id: number) => api.put(`/eam/neumaticos/reesculturado/${id}/deshacer`),
    onSuccess: () => { toast.success('Reesculturado deshecho'); qc.invalidateQueries({ queryKey: ['eam-resc-neu'] }); invalidarNeu() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo deshacer')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al recuperar la banda')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al cambiar la zona')),
  })
  // Congelar datos
  const mutCongelar = useMutation({
    mutationFn: (b: Record<string, unknown>) => api.post('/eam/neumaticos/congelar', b),
    onSuccess: () => {
      toast.success('Datos congelados exitosamente')
      qc.invalidateQueries({ queryKey: ['eam-congelados'] })
      setCongelarOpen(false); setCongelarDesc('')
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al congelar datos')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error en la importación')),
  })
  // Eliminación masiva
  const mutBulkDelete = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/bulk-delete', { ids: Array.from(selectedIds), confirmacion: bulkDeleteConfirm }),
    onSuccess: (r: any) => {
      toast.success(`${r.data.eliminados} llantas eliminadas`)
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      setSelectedIds(new Set()); setBulkDeleteOpen(false); setBulkDeleteConfirm('')
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al eliminar')),
  })
  // Inspecciones masivas
  const mutImportarInsp = useMutation({
    mutationFn: (items: any[]) => api.post('/eam/neumaticos/inspecciones/bulk', { items }).then(r => r.data),
    onSuccess: (data) => {
      setInspImportResult(data)
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      qc.invalidateQueries({ queryKey: ['eam-indic'] })
      qc.invalidateQueries({ queryKey: ['eam-alertas'] })
      qc.invalidateQueries({ queryKey: ['eam-insp'] }); qc.invalidateQueries({ queryKey: ['eam-historial-inspecciones'] })
      if (data.exitosos > 0) toast.success(`${data.exitosos} de ${data.total} inspecciones registradas`)
      if (data.errores?.length) toast.error(`${data.errores.length} filas con errores`)
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error en la importación')),
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
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error en la importación')),
  })

  const descargarPlantillaImportacion = () => {
    // marca / referencia / medida deben existir en el catálogo (Configuración →
    // Catálogo de llantas); la profundidad inicial la pone el catálogo, por eso
    // no va en la plantilla. profundidad_actual y km_actual solo si es_usada.
    const headers = ['codigo', 'marca', 'referencia', 'medida', 'reencauches', 'es_usada', 'profundidad_actual', 'km_actual', 'bodega', 'costo', 'proveedor', 'presion_recomendada', 'dot', 'tipo_rin']
    const ejemplo = ['LL-1001', 'Michelin', 'XZA2', '295/80R22.5', 0, 'NO', '', '', bodegas[0]?.nombre ?? '', 950000, 'Distribuidora XYZ', 110, '2523', 'ACERO']
    const ejemploUsada = ['LL-1002', 'Michelin', 'XZA2', '295/80R22.5', 1, 'SI', 9.5, 62000, bodegas[0]?.nombre ?? '', 700000, 'Distribuidora XYZ', 110, '2422', 'ACERO']
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo, ejemploUsada])
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

  // ── Creación masiva por rango de códigos (sin archivo) ──
  const abrirMasivo = () => {
    setMasivoCodIni(''); setMasivoCodFin('')
    setMasivoPreview([]); setMasivoError('')
    setMasivoForm({ ...EMPTY_NEUMATICO })
    setMasivoCat({ ...SELECCION_VACIA })
    setMasivoVida({ reencauches: '0', es_usada: false, profundidad_actual: '', km_actual: '' })
    setImportResult(null)
    setMasivoOpen(true)
  }
  const previsualizarMasivo = () => {
    setMasivoError('')
    if (!masivoCodIni.trim() || !masivoCodFin.trim()) {
      setMasivoError('Indica el código inicial y el final'); return
    }
    const codigos = generarCodigos(masivoCodIni, masivoCodFin)
    if (!codigos) {
      setMasivoError('Los códigos deben terminar en número y el final debe ser mayor o igual al inicial (máximo 1000 por lote). Ej: LL-001 a LL-050')
      return
    }
    const yaExisten = codigos.filter(c => neumaticos.some(n => n.codigo === c))
    if (yaExisten.length) {
      setMasivoError(`Estos códigos ya existen: ${yaExisten.slice(0, 5).join(', ')}${yaExisten.length > 5 ? ` y ${yaExisten.length - 5} más` : ''}`)
      return
    }
    setMasivoPreview(codigos)
  }
  const confirmarMasivo = () => {
    const f = masivoForm
    const items = masivoPreview.map(codigo => ({
      codigo, estado: 'ALMACENADO',
      // Marca, referencia y dimensión salen del catálogo; la profundidad inicial
      // la resuelve el backend con esa combinación.
      marca: masivoCat.marca, referencia: masivoCat.referencia, medida: masivoCat.medida,
      reencauches: Number(masivoVida.reencauches) || 0,
      es_usada: masivoVida.es_usada,
      profundidad_actual: masivoVida.es_usada && masivoVida.profundidad_actual ? Number(masivoVida.profundidad_actual) : undefined,
      km_actual: masivoVida.es_usada && masivoVida.km_actual ? Number(masivoVida.km_actual) : undefined,
      bodega_id: f.bodega_id ? Number(f.bodega_id) : undefined,
      costo: f.costo ? Number(f.costo) : undefined, proveedor: f.proveedor || undefined,
      presion_recomendada: f.presion_recomendada ? Number(f.presion_recomendada) : undefined,
    }))
    mutImportar.mutate(items)
    setMasivoPreview([])
  }

  const confirmarImportacion = () => {
    const items = importRows.map(row => {
      const bodega = bodegas.find(b => b.nombre?.toLowerCase() === String(row.bodega ?? '').toLowerCase())
      const esUsada = ['SI', 'SÍ', 'TRUE', '1', 'X'].includes(String(row.es_usada ?? '').trim().toUpperCase())
      return {
        codigo: String(row.codigo ?? '').trim(),
        marca: row.marca || undefined, referencia: row.referencia || undefined, medida: row.medida || undefined,
        reencauches: row.reencauches ? Number(row.reencauches) : 0,
        es_usada: esUsada,
        profundidad_actual: esUsada && row.profundidad_actual ? Number(row.profundidad_actual) : undefined,
        km_actual: esUsada && row.km_actual ? Number(row.km_actual) : undefined,
        bodega_id: bodega?.id, estado: 'ALMACENADO',
        costo: row.costo ? Number(row.costo) : undefined, proveedor: row.proveedor || undefined,
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
    onSuccess: () => { toast.success('Inspección registrada'); qc.invalidateQueries({ queryKey: ['eam-insp'] }); qc.invalidateQueries({ queryKey: ['eam-historial-inspecciones'] }); invalidarNeu(); setInspDialog(null); setInspForm({ ...EMPTY_INSP }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al registrar inspección')),
  })
  // Voltear (invertir interna↔externa en la misma posición)
  const mutVoltear = useMutation({
    mutationFn: (nid: number) => api.post('/eam/neumaticos/movimiento', { neumatico_id: nid, tipo_movimiento: 'VOLTEO', fecha: new Date().toISOString() }),
    onSuccess: () => { toast.success('Llanta volteada · hombros interno/externo invertidos'); invalidarNeu(); qc.invalidateQueries({ queryKey: ['eam-mov'] }); setVoltearDialog(null) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo voltear')),
  })
  // Rotación por intercambio de posiciones entre dos llantas
  const mutIntercambio = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/eam/neumaticos/rotacion-intercambio', body),
    onSuccess: () => { toast.success('Rotación realizada · posiciones intercambiadas'); invalidarNeu(); qc.invalidateQueries({ queryKey: ['eam-mov'] }); setRotDialog(null); setRotTarget('') },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo rotar')),
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
    onSuccess: (r: any) => { toast.success('Lote creado'); qc.invalidateQueries({ queryKey: ['eam-reencauche'] }); setLoteOpen(false); setSelLote(r.data.id); setLoteForm({ fecha_envio: new Date().toISOString().slice(0, 10), proveedor: '', remision: '', observaciones: '' }) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al crear lote')),
  })
  const mutAddDet = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/eam/neumaticos/reencauche/${selLote}/detalle`, body),
    onSuccess: () => { toast.success('Llanta agregada al lote'); qc.invalidateQueries({ queryKey: ['eam-reencauche-det'] }); invalidarNeu(); setAddTireLote('') },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo agregar')),
  })
  const mutProc = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put(`/eam/neumaticos/reencauche/detalle/${procDialog!.id}`, body),
    onSuccess: () => { toast.success('Resultado registrado'); qc.invalidateQueries({ queryKey: ['eam-reencauche-det'] }); invalidarNeu(); setProcDialog(null) },
    onError: (e: any) => toast.error(mensajeDeError(e, 'Error al procesar')),
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
    // En rotación solo se anota el destino: nada se manda hasta confirmar.
    if (modoRotacion) {
      const id = draggedTire.id
      setPlanRotacion(p => {
        const siguiente = { ...p }
        // Si otra llanta tenía apalabrada esa rueda, sale al almacén.
        const previa = Object.entries(siguiente).find(([, v]) => v === pos)?.[0]
        if (previa && Number(previa) !== id) {
          delete siguiente[Number(previa)]
          setEnRotacion(l => (l.includes(Number(previa)) ? l : [...l, Number(previa)]))
        }
        siguiente[id] = pos
        return siguiente
      })
      setEnRotacion(l => l.filter(x => x !== id))
      setDraggedTire(null)
      return
    }
    const tipo = draggedTire.activo_id === veh.id ? 'ROTACION' : 'INSTALACION'
    setMovForm({ fecha: nowLocal(), km_odometro: '', horometro: '', bodega_id: '', tecnico: '', observaciones: '' })
    setMovDialog({ tire: draggedTire, tipo, posicion: pos })
    setDraggedTire(null)
  }
  const soltarEnBodega = () => {
    setOverSlot('')
    if (!draggedTire) return
    setMovForm({ fecha: nowLocal(), km_odometro: '', horometro: '', bodega_id: bodegas[0] ? String(bodegas[0].id) : '', tecnico: '', observaciones: '' })
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
      horometro: movForm.horometro ? Number(movForm.horometro) : undefined,
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
      horometro: montarForm.horometro ? Number(montarForm.horometro) : undefined,
      tecnico: montarForm.tecnico || undefined,
      observaciones: montarForm.observaciones || undefined,
    })
    setMontarDialog(null)
  }
  /** Saca una llanta del vehículo al almacén de rotación (solo en el plan). */
  const soltarEnAlmacenRotacion = () => {
    setOverSlot('')
    if (!draggedTire) return
    const id = draggedTire.id
    setPlanRotacion(p => {
      const siguiente = { ...p }
      delete siguiente[id]
      return siguiente
    })
    setEnRotacion(l => (l.includes(id) ? l : [...l, id]))
    setDraggedTire(null)
  }

  const salirDeRotacion = () => {
    setModoRotacion(false); setPlanRotacion({}); setEnRotacion([])
    setRotPlanDialog(false); setRotInspec({})
  }

  const mutRotacionPlan = useMutation({
    mutationFn: () => {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
      const conMedicion = (id: number, posicion: string | null) => {
        const m = medicionDe(id)
        return {
          neumatico_id: id, posicion,
          profundidad_izq: num(m.izq), profundidad_centro: num(m.centro),
          profundidad_der: num(m.der), presion_psi: num(m.psi),
          estado_visual: m.estado || undefined,
        }
      }
      const destinos = [
        ...Object.entries(planRotacion).map(([id, pos]) => conMedicion(Number(id), pos)),
        // Las que quedaron en el almacén salen del vehículo a bodega.
        ...enRotacion.map(id => conMedicion(id, null)),
      ]
      return api.post('/eam/neumaticos/rotacion-plan', {
        activo_id: veh?.id,
        fecha: new Date(rotPlanForm.fecha).toISOString(),
        destinos,
        km_odometro: rotPlanForm.km_odometro ? Number(rotPlanForm.km_odometro) : undefined,
        horometro: rotPlanForm.horometro ? Number(rotPlanForm.horometro) : undefined,
        bodega_id: bodegas[0]?.id,
        tecnico: rotPlanForm.tecnico || undefined,
        observaciones: rotPlanForm.observaciones || undefined,
      }).then(r => r.data)
    },
    onSuccess: (r: any) => {
      toast.success(
        `Rotación aplicada · ${r?.movimientos ?? 0} movimiento(s)`
        + (r?.inspecciones ? ` y ${r.inspecciones} inspección(es)` : ''),
      )
      qc.invalidateQueries({ queryKey: ['eam-neumaticos'] })
      qc.invalidateQueries({ queryKey: ['eam-inspecciones'] })
      qc.invalidateQueries({ queryKey: ['eam-vehiculos'] })
      salirDeRotacion()
    },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo aplicar la rotación')),
  })

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
      qc.invalidateQueries({ queryKey: ['eam-insp'] }); qc.invalidateQueries({ queryKey: ['eam-historial-inspecciones'] })
      setInspSesionOpen(false)
    } catch (e: any) {
      toast.error(mensajeDeError(e, 'Error al registrar alguna inspección'))
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
  // Se invocan como funciones — {tireCard(n)} — y no como <TireCard/>: al estar
  // declaradas dentro del componente, React las trata como un tipo distinto en
  // cada render y remonta el nodo. Con un arrastre en curso eso lo cancela,
  // porque el elemento que el navegador está moviendo deja de existir.
  const tireCard = (n: Neumatico, compact?: boolean) => (
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
          <Tooltip title="Montar en vehículo"><IconButton size="small" sx={{ p: 0.25, color: EAM_COLOR }} onClick={() => { setMontarForm({ activo_id: veh ? String(veh.id) : '', posicion: '', fecha: nowLocal(), km_odometro: '', horometro: '', tecnico: '', observaciones: '' }); setMontarDialog(n) }}><DirectionsCar sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Historial"><IconButton size="small" onClick={() => setHistTire(n)} sx={{ p: 0.25 }}><HistoryIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Dar de baja"><IconButton size="small" color="error" onClick={() => { setBajaForm({ fecha: nowLocal(), dano_id: '', motivo: '', motivo_fin_vida_id: '' }); setBajaDialog(n) }} sx={{ p: 0.25 }}><DeleteForever sx={{ fontSize: 14 }} /></IconButton></Tooltip>
        </Stack>
      )}
    </Box>
  )

  // ─── Slot de posición (drop zone) ─────────────────────────────────────────
  // Rueda del diagrama: neumático visto de lado (arrastrable, tooltip con detalle,
  // clic abre historial, y es zona de drop para instalar/rotar).
  const slot = (pos: Posicion) => {
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
          onClick={(e) => {
            if (t) { setSlotMenu({ anchor: e.currentTarget, tire: t, pos: pos.codigo }); return }
            // Rueda vacía: el clic abre el montaje con la posición ya elegida.
            // Antes no hacía nada y montar solo se podía arrastrando.
            setPosicionAMontar(pos.codigo)
            setAgregarLlantaOpen(true)
          }}
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
          {[0, 2, 6].includes(tab) && (
            <ButtonGroup variant="contained" disableElevation sx={{ borderRadius: 2, '& .MuiButton-root': { bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } } }}>
              <Button startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Registrar llanta
              </Button>
              <Button size="small" aria-haspopup="true" onClick={e => setMenuNuevaLlanta(e.currentTarget)} sx={{ px: 0.75, borderLeft: '1px solid rgba(255,255,255,0.35)' }}>
                <ArrowDropDown />
              </Button>
            </ButtonGroup>
          )}
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: '1px solid #E5E7EB', '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { bgcolor: EAM_COLOR } }}>
          <Tab icon={<DirectionsCar sx={{ fontSize: 18 }} />} iconPosition="start" label="Llantas por Vehículo" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Straighten sx={{ fontSize: 18 }} />} iconPosition="start" label="Inspecciones" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Bodega (${almacen.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<TrendingUp sx={{ fontSize: 18 }} />} iconPosition="start" label="Indicadores / CPK" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Badge badgeContent={alertas.length} color="error"><NotificationsActive sx={{ fontSize: 18 }} /></Badge>} iconPosition="start" label="Alertas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Autorenew sx={{ fontSize: 18 }} />} iconPosition="start" label="Reencauche" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Inventory2 sx={{ fontSize: 18 }} />} iconPosition="start" label="Consultas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Recycling sx={{ fontSize: 18 }} />} iconPosition="start" label={`Descarte (${descarte.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<Timeline sx={{ fontSize: 18 }} />} iconPosition="start" label="Movimientos" sx={{ textTransform: 'none', fontWeight: 600 }} />
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
            !!bajaDialog || !!histTire || !!ejesVeh || !!inspDialog || !!chartTire || !!rotDialog ||
            !!voltearDialog || !!montarDialog || !!rotRinDialog || inspSesionOpen ||
            !!ajusteDialog || !!trabajoDialog || !!zonaDialog || !!vidasDialog || rotPlanDialog
            || !!bitDialog
          return (
          <Stack spacing={2}>
          {!algunDialogoAbierto && <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack gap={1.25} mb={2}>
                    <Stack direction="row" gap={1} alignItems="flex-start" flexWrap="wrap">
                      <Autocomplete
                        size="small"
                        options={vehiculosParaSelector}
                        value={vehSeleccionado}
                        onChange={(_e, v) => seleccionarVehiculo(v ? `${v.origen}:${v.id}` : '')}
                        filterOptions={(ops, estado) => buscarVehiculos(ops, estado.inputValue)}
                        disabled={mutVincularVeh.isPending}
                        getOptionLabel={v =>
                          `${v.placa ?? v.codigo ?? v.tipo ?? '—'}${v.nombre ? ` — ${v.nombre}` : v.marca ? ` — ${v.marca}${v.modelo ? ` ${v.modelo}` : ''}` : ''}`}
                        isOptionEqualToValue={(a, b) => a.origen === b.origen && a.id === b.id}
                        renderOption={(props, v) => {
                          const puestas = v.activo_id ? (montadasPorActivo.get(v.activo_id) ?? 0) : 0
                          const esperadas = ruedasEsperadas(v)
                          return (
                            <Box component="li" {...props} key={`${v.origen}:${v.id}`}>
                              <Stack direction="row" alignItems="center" gap={1} sx={{ width: '100%' }}>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography fontSize={13} fontWeight={700} noWrap>
                                    {v.placa ?? v.codigo ?? v.tipo ?? '—'}
                                  </Typography>
                                  <Typography fontSize={11} color="text.secondary" noWrap>
                                    {[v.nombre, v.marca && `${v.marca}${v.modelo ? ` ${v.modelo}` : ''}`, v.tipo]
                                      .filter(Boolean).join(' · ') || '—'}
                                  </Typography>
                                </Box>
                                {v.origen !== 'EAM' && (
                                  <Chip label={v.origen} size="small" sx={{ height: 17, fontSize: 9 }} />
                                )}
                                {!v.numero_ejes ? (
                                  <Chip label="sin ejes" size="small" color="warning" variant="outlined"
                                    sx={{ height: 17, fontSize: 9 }} />
                                ) : (
                                  <Chip
                                    label={`${puestas}/${esperadas}`} size="small"
                                    sx={{
                                      height: 17, fontSize: 9, fontWeight: 700,
                                      bgcolor: alpha(puestas >= esperadas ? EAM_COLOR : '#CA8A04', 0.15),
                                      color: puestas >= esperadas ? EAM_DARK : '#A16207',
                                    }}
                                  />
                                )}
                                {v.activo_id && activosConAlerta.has(v.activo_id) && (
                                  <NotificationsActive sx={{ fontSize: 14, color: '#DC2626' }} />
                                )}
                              </Stack>
                            </Box>
                          )
                        }}
                        sx={{ minWidth: 340, flex: 1, maxWidth: 460 }}
                        renderInput={p => (
                          <TextField
                            {...p} label="Vehículo · escriba la placa"
                            placeholder="Buscar por placa, código, nombre o marca…"
                            helperText={mutVincularVeh.isPending ? 'Vinculando al CMMS…' : undefined}
                          />
                        )}
                        noOptionsText={
                          vehiculosDisponibles.length === 0
                            ? 'No hay vehículos que usen llantas'
                            : 'Ningún vehículo coincide con los filtros'
                        }
                      />
                      {veh && veh.numero_ejes && (
                        <Stack direction="row" gap={1} sx={{ mt: 0.25 }}>
                          {/* Abre la bandeja pegada al diagrama: arrastrar desde
                              la columna de la derecha obliga a cruzar media
                              pantalla con el botón sostenido. */}
                          <Button
                            size="small" variant={modoMontaje ? 'outlined' : 'contained'}
                            startIcon={<TireRepair />}
                            onClick={() => setModoMontaje(v => !v)}
                            sx={{
                              textTransform: 'none',
                              ...(modoMontaje
                                ? { color: EAM_DARK, borderColor: EAM_COLOR }
                                : { bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }),
                            }}
                          >
                            {modoMontaje ? 'Ocultar llantas' : 'Montar llantas'}
                          </Button>
                          {/* La rotación arma un plan en pantalla y lo aplica de
                              una sola vez al confirmar. */}
                          <Button
                            size="small" variant={modoRotacion ? 'contained' : 'outlined'}
                            startIcon={<SwapIcon />}
                            onClick={() => {
                              if (modoRotacion) { salirDeRotacion(); return }
                              setModoRotacion(true); setModoMontaje(false)
                              setPlanRotacion({}); setEnRotacion([])
                            }}
                            sx={{
                              textTransform: 'none',
                              ...(modoRotacion
                                ? { bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }
                                : { color: '#7C3AED', borderColor: alpha('#7C3AED', 0.5) }),
                            }}
                          >
                            {modoRotacion ? 'Cancelar rotación' : 'Rotar llantas'}
                          </Button>
                          <Button
                            size="small" variant="outlined" startIcon={<AddIcon />}
                            onClick={() => setAgregarLlantaOpen(true)}
                            sx={{ textTransform: 'none', color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.5) }}
                          >
                            Agregar desde bodega
                          </Button>
                        </Stack>
                      )}
                    </Stack>

                    {/* Filtros por la tipología del vehículo: es lo que sirve
                        para encontrarlo en una flota grande. Cada desplegable se
                        arma con los valores que existen en los datos. */}
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <TextField select size="small" label="Tipología" value={vehTipo}
                        onChange={e => setVehTipo(e.target.value)} sx={{ minWidth: 165 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {opcionesVeh.tipos.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Marca" value={vehMarca}
                        onChange={e => setVehMarca(e.target.value)} sx={{ minWidth: 145 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {opcionesVeh.marcas.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Línea" value={vehLinea}
                        onChange={e => setVehLinea(e.target.value)} sx={{ minWidth: 145 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {opcionesVeh.lineas.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </TextField>
                      <Typography fontSize={11} color="text.secondary">
                        {vehiculosFiltrados.length} de {vehiculosDisponibles.length} vehículo(s)
                      </Typography>
                      {filtrosVehActivos && (
                        <Button size="small" startIcon={<FilterAltOff sx={{ fontSize: 15 }} />}
                          onClick={limpiarFiltrosVeh} sx={{ textTransform: 'none' }}>
                          Limpiar
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  {!veh ? (
                    <Alert severity="info">Selecciona un vehículo para ver el diagrama de llantas.</Alert>
                  ) : !veh.numero_ejes ? (
                    <Alert severity="warning">El vehículo <b>{veh.codigo}</b> no tiene configurado el número de ejes. Asígnale una categoría de ejes/llantas en la pestaña <b>Configuración</b> para generar el diagrama de posiciones.</Alert>
                  ) : (
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={1.5}>
                        {veh.numero_ejes} eje(s) · arrastra una llanta a una rueda, o entre ruedas para rotar.
                        Clic en una rueda vacía para montar ahí; clic en una instalada para ver su historial.
                      </Typography>

                      {/* Almacén de rotación: banco de trabajo temporal. Las
                          llantas que se sacan quedan acá hasta que se les da una
                          rueda nueva; nada se guarda hasta confirmar. */}
                      {modoRotacion && (
                        <Box
                          onDragOver={e => { e.preventDefault(); setOverSlot('ROTACION') }}
                          onDragLeave={() => setOverSlot('')}
                          onDrop={e => { e.preventDefault(); soltarEnAlmacenRotacion() }}
                          sx={{
                            mb: 1.5, p: 1.5, borderRadius: 3,
                            border: '2px dashed #7C3AED',
                            bgcolor: overSlot === 'ROTACION' ? alpha('#7C3AED', 0.12) : alpha('#7C3AED', 0.04),
                            transition: 'background-color .12s',
                          }}
                        >
                          <Stack direction="row" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                            <SwapIcon sx={{ fontSize: 18, color: '#7C3AED' }} />
                            <Typography fontSize={13} fontWeight={700}>Almacén de rotación</Typography>
                            <Typography fontSize={11} color="text.secondary" sx={{ flex: 1 }}>
                              Arrastre acá las llantas que va a rotar y luego llévelas una por una a
                              su rueda nueva.
                            </Typography>
                            <Button size="small" variant="contained"
                              disabled={Object.keys(planRotacion).length === 0 && enRotacion.length === 0}
                              onClick={() => {
                                setRotPlanForm({
                                  fecha: nowLocal(),
                                  km_odometro: veh?.odometro_actual ? String(veh.odometro_actual) : '',
                                  horometro: veh?.horometro_actual ? String(veh.horometro_actual) : '',
                                  tecnico: '', observaciones: '',
                                })
                                setRotPlanDialog(true)
                              }}
                              sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, textTransform: 'none' }}>
                              Confirmar rotación
                            </Button>
                          </Stack>

                          {enRotacion.length === 0 ? (
                            <Typography fontSize={11.5} color="text.disabled" textAlign="center" py={1.5}>
                              Vacío · suelte aquí una llanta instalada
                            </Typography>
                          ) : (
                            <Stack direction="row" gap={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                              {enRotacion.map(id => {
                                const n = neumaticos.find(x => x.id === id)
                                if (!n) return null
                                return (
                                  <Box
                                    key={id}
                                    draggable
                                    onDragStart={e => {
                                      e.dataTransfer.effectAllowed = 'move'
                                      e.dataTransfer.setData('text/plain', String(n.id))
                                      setDraggedTire(n)
                                    }}
                                    onDragEnd={() => setDraggedTire(null)}
                                    sx={{
                                      minWidth: 132, p: 1, borderRadius: 2, flexShrink: 0,
                                      border: '1px solid #7C3AED', bgcolor: '#FFFFFF',
                                      cursor: 'grab', '&:active': { cursor: 'grabbing' },
                                      opacity: draggedTire?.id === n.id ? 0.5 : 1,
                                    }}
                                  >
                                    <Stack direction="row" alignItems="center" gap={0.75}>
                                      <TireRepair sx={{ fontSize: 17, color: '#7C3AED' }} />
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography fontSize={12} fontWeight={700} noWrap>{n.codigo}</Typography>
                                        <Typography fontSize={9.5} color="text.secondary" noWrap>
                                          venía de {n.posicion ?? '—'}
                                        </Typography>
                                      </Box>
                                    </Stack>
                                  </Box>
                                )
                              })}
                            </Stack>
                          )}

                          {Object.keys(planRotacion).length > 0 && (
                            <Typography fontSize={10.5} color="#6D28D9" mt={1}>
                              {Object.keys(planRotacion).length} llanta(s) ya con rueda nueva
                              {enRotacion.length > 0 && ` · ${enRotacion.length} sin ubicar`}.
                              Las que queden sin ubicar saldrán a bodega.
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Bandeja de montaje: las llantas disponibles justo encima
                          del diagrama, para que el arrastre sea corto. */}
                      {modoMontaje && (
                        <Box sx={{
                          mb: 1.5, p: 1.5, borderRadius: 3,
                          border: `1px dashed ${EAM_COLOR}`, bgcolor: alpha(EAM_COLOR, 0.04),
                        }}>
                          <Stack direction="row" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                            <TireRepair sx={{ fontSize: 18, color: EAM_DARK }} />
                            <Typography fontSize={13} fontWeight={700}>Llantas para montar</Typography>
                            <TextField
                              size="small" placeholder="Código, marca, medida…"
                              value={busqMontaje} onChange={e => setBusqMontaje(e.target.value)}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15 }} /></InputAdornment>
                                ),
                              }}
                              sx={{ minWidth: 210 }}
                            />
                            {bodegasConDisponibles.length > 1 && (
                              <TextField select size="small" label="Ubicación" value={bodegaMontaje}
                                onChange={e => setBodegaMontaje(e.target.value)} sx={{ minWidth: 175 }}>
                                <MenuItem value="">Todas las bodegas</MenuItem>
                                {bodegasConDisponibles.map(b => (
                                  <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>
                                ))}
                              </TextField>
                            )}
                            <Typography fontSize={11} color="text.secondary">
                              {llantasParaMontar.length} disponible(s)
                            </Typography>
                          </Stack>
                          {llantasParaMontar.length === 0 ? (
                            <Alert severity="info" sx={{ py: 0.5 }}>
                              {almacen.length === 0
                                ? 'No hay llantas en bodega.'
                                : 'Ninguna llanta coincide con la búsqueda.'}
                            </Alert>
                          ) : (
                            <Stack direction="row" gap={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                              {llantasParaMontar.map(n => (
                                <Box
                                  key={n.id}
                                  draggable
                                  onDragStart={e => {
                                    e.dataTransfer.effectAllowed = 'move'
                                    e.dataTransfer.setData('text/plain', String(n.id))
                                    setDraggedTire(n)
                                  }}
                                  onDragEnd={() => setDraggedTire(null)}
                                  sx={{
                                    minWidth: 148, p: 1, borderRadius: 2, flexShrink: 0,
                                    border: '1px solid', borderColor: draggedTire?.id === n.id ? EAM_COLOR : alpha(EAM_COLOR, 0.35),
                                    bgcolor: '#FFFFFF', cursor: 'grab', '&:active': { cursor: 'grabbing' },
                                    opacity: draggedTire?.id === n.id ? 0.5 : 1,
                                  }}
                                >
                                  <Stack direction="row" alignItems="center" gap={0.75}>
                                    <TireRepair sx={{ fontSize: 17, color: EAM_DARK }} />
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography fontSize={12} fontWeight={700} noWrap>{n.codigo}</Typography>
                                      <Typography fontSize={9.5} color="text.secondary" noWrap>
                                        {n.marca ?? '—'} · {n.medida ?? '—'}
                                      </Typography>
                                      <Typography fontSize={9} color="text.disabled" noWrap>
                                        {bodegas.find(b => b.id === n.bodega_id)?.nombre ?? 'Sin bodega'}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                          )}
                          <Typography fontSize={10.5} color="text.secondary" mt={0.75}>
                            Arrastre una llanta a la rueda donde va. Al soltarla se pide la fecha y la
                            lectura del equipo.
                          </Typography>
                        </Box>
                      )}
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
                                  <Stack direction="row" gap={0.5}>{izq.map(p => <Box key={p.codigo}>{slot(p)}</Box>)}</Stack>
                                  <Box sx={{ width: 96, height: 8, bgcolor: '#64748B', borderRadius: 2 }} />
                                  <Stack direction="row" gap={0.5}>{der.map(p => <Box key={p.codigo}>{slot(p)}</Box>)}</Stack>
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
                            {slot(repuesto)}
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

                  {/* Filtros del almacén: con decenas de llantas en bodega, hallar
                      la de la medida correcta a ojo es la parte lenta del montaje. */}
                  <Stack gap={1} mb={1.5}>
                    <TextField
                      size="small" placeholder="Buscar código, marca, referencia o DOT…"
                      value={almBusq} onChange={e => setAlmBusq(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>
                        ),
                      }}
                    />
                    <Stack direction="row" gap={0.75} flexWrap="wrap">
                      {opcionesAlm.medidas.length > 1 && (
                        <TextField select size="small" label="Medida" value={almMedida}
                          onChange={e => setAlmMedida(e.target.value)} sx={{ minWidth: 128 }}>
                          <MenuItem value="">Todas</MenuItem>
                          {opcionesAlm.medidas.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                      )}
                      {opcionesAlm.marcas.length > 1 && (
                        <TextField select size="small" label="Marca" value={almMarca}
                          onChange={e => setAlmMarca(e.target.value)} sx={{ minWidth: 118 }}>
                          <MenuItem value="">Todas</MenuItem>
                          {opcionesAlm.marcas.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                      )}
                      {opcionesAlm.vidas.length > 1 && (
                        <TextField select size="small" label="Vida" value={almVida}
                          onChange={e => setAlmVida(e.target.value)} sx={{ minWidth: 96 }}>
                          <MenuItem value="">Todas</MenuItem>
                          {opcionesAlm.vidas.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </TextField>
                      )}
                      {opcionesAlm.bodegas.length > 1 && (
                        <TextField select size="small" label="Bodega" value={almBodega}
                          onChange={e => setAlmBodega(e.target.value)} sx={{ minWidth: 140 }}>
                          <MenuItem value="">Todas</MenuItem>
                          {opcionesAlm.bodegas.map(b => (
                            <MenuItem key={b} value={String(b)}>{bodegaNombre(b)}</MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Stack>
                    <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                      {medidaDelVehiculo && (
                        <Tooltip title={`Medida que ya está montada en ${veh?.placa ?? veh?.codigo ?? 'el vehículo'}`}>
                          <Chip
                            size="small" icon={<TireIcon sx={{ fontSize: 14 }} />}
                            label={medidaDelVehiculo}
                            onClick={() => setAlmMedida(m => m === medidaDelVehiculo ? '' : medidaDelVehiculo)}
                            variant={almMedida === medidaDelVehiculo ? 'filled' : 'outlined'}
                            sx={almMedida === medidaDelVehiculo
                              ? { bgcolor: EAM_COLOR, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }
                              : undefined}
                          />
                        </Tooltip>
                      )}
                      <Typography fontSize={11} color="text.secondary">
                        {almacenFiltrado.length} de {almacen.length}
                      </Typography>
                      {filtrosAlmActivos && (
                        <Button size="small" startIcon={<FilterAltOff sx={{ fontSize: 15 }} />}
                          onClick={limpiarFiltrosAlm} sx={{ textTransform: 'none' }}>
                          Limpiar
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  <Stack spacing={1} sx={{ maxHeight: 460, overflowY: 'auto', pr: 0.5 }}>
                    {almacen.length === 0 && <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>Sin llantas en almacén</Typography>}
                    {almacen.length > 0 && almacenFiltrado.length === 0 && (
                      <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>
                        Ninguna llanta del almacén coincide con los filtros
                      </Typography>
                    )}
                    {almacenFiltrado.map(n => (
                      <Box key={n.id}>
                        {tireCard(n)}
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
                                  <Tooltip title="Desmontar a bodega"><IconButton size="small" onClick={() => { setMovForm({ fecha: nowLocal(), km_odometro: '', horometro: '', bodega_id: '', tecnico: '', observaciones: '' }); setMovDialog({ tire: t, tipo: 'DESMONTAJE' }) }} sx={{ color: '#64748B' }}><WarehouseIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
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

        {/* ── TAB 1: Inspecciones — historial completo, no solo la última ── */}
        {tab === 1 && (() => {
          const filas = historialInsp.filter(r => {
            if (inspVeh && String(r.activo_id ?? '') !== inspVeh) return false
            if (inspEstado && r.estado_llanta !== inspEstado) return false
            if (inspVida && r.vida !== inspVida) return false
            const q = inspBusca.trim().toLowerCase()
            if (q && ![r.codigo, r.marca, r.referencia, r.medida, r.vehiculo, r.tecnico].some(x => (x ?? '').toLowerCase().includes(q))) return false
            return true
          })
          const vehiculosEnLista = Array.from(
            new Map(historialInsp.filter(r => r.activo_id).map(r => [r.activo_id, r.vehiculo])).entries()
          )
          const vidasEnLista = Array.from(new Set(historialInsp.map(r => r.vida).filter(Boolean))) as string[]
          const llantasDistintas = new Set(filas.map(r => r.neumatico_id)).size
          const colorProf = (p?: number | null) => {
            if (p == null) return 'inherit'
            if (p <= cfgForm.profundidad_minima) return '#DC2626'
            if (p <= cfgForm.profundidad_minima * 1.5) return '#D97706'
            return '#16A34A'
          }
          const rango = (etiqueta: string, dias: number) => (
            <Button key={etiqueta} size="small" onClick={() => {
              const hoy = new Date()
              const ini = new Date(hoy.getTime() - dias * 86400000)
              setInspDesde(ini.toISOString().slice(0, 10))
              setInspHasta(hoy.toISOString().slice(0, 10))
            }} sx={{ textTransform: 'none', fontSize: 12, minWidth: 0, color: EAM_DARK }}>{etiqueta}</Button>
          )
          return (
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                <Box>
                  <Typography fontWeight={700}>Historial de inspecciones</Typography>
                  <Typography fontSize={12} color="text.secondary">
                    {filas.length} inspecciones sobre {llantasDistintas} llanta(s) · de la más reciente a la más antigua
                    {(inspDesde || inspHasta) ? ' · periodo filtrado' : ' · todo el histórico'}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    variant="outlined" startIcon={<Timeline />} onClick={() => navigate('/eam/neumaticos/reportes')}
                    sx={{ color: EAM_DARK, borderColor: alpha(EAM_COLOR, 0.4), textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Reporte de inspecciones
                  </Button>
                  <Button
                    variant="contained" startIcon={<UploadFile />} onClick={() => setInspImportOpen(true)}
                    sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Cargue masivo de inspecciones
                  </Button>
                </Stack>
              </Stack>

              {/* Filtros */}
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }} flexWrap="wrap" useFlexGap>
                      <TextField
                        size="small" placeholder="Buscar código, marca, referencia, vehículo o técnico…"
                        value={inspBusca} onChange={e => setInspBusca(e.target.value)}
                        sx={{ minWidth: 300, flex: 1 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                      />
                      <TextField size="small" type="date" label="Desde" value={inspDesde}
                        onChange={e => setInspDesde(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
                      <TextField size="small" type="date" label="Hasta" value={inspHasta}
                        onChange={e => setInspHasta(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
                      <Stack direction="row" alignItems="center">
                        {rango('7 días', 7)}{rango('30 días', 30)}{rango('90 días', 90)}
                      </Stack>
                    </Stack>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }} flexWrap="wrap" useFlexGap>
                      <TextField select size="small" label="Vehículo" value={inspVeh} onChange={e => setInspVeh(e.target.value)} sx={{ minWidth: 170 }}>
                        <MenuItem value="">Todos</MenuItem>
                        {vehiculosEnLista.map(([id, nombre]) => <MenuItem key={id} value={String(id)}>{nombre}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Estado de la llanta" value={inspEstado} onChange={e => setInspEstado(e.target.value)} sx={{ minWidth: 180 }}>
                        <MenuItem value="">Todos</MenuItem>
                        {['INSTALADO', 'ALMACENADO', 'REENCAUCHE'].map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Vida" value={inspVida} onChange={e => setInspVida(e.target.value)} sx={{ minWidth: 120 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {vidasEnLista.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                      </TextField>
                      {(inspBusca || inspVeh || inspEstado || inspVida || inspDesde || inspHasta) && (
                        <Button size="small" onClick={() => { setInspBusca(''); setInspVeh(''); setInspEstado(''); setInspVida(''); setInspDesde(''); setInspHasta('') }}
                          sx={{ textTransform: 'none', color: '#64748B' }}>Limpiar filtros</Button>
                      )}
                      <Box flex={1} />
                      <Button size="small" variant="outlined" startIcon={<Download />} sx={{ textTransform: 'none' }}
                        onClick={() => exportarExcel({
                          archivo: 'historial-inspecciones', titulo: 'Historial de inspecciones de llantas',
                          columnas: [
                            { key: 'fecha', header: 'Fecha' }, { key: 'codigo', header: 'Llanta' },
                            { key: 'vehiculo', header: 'Vehículo' }, { key: 'posicion', header: 'Posición' },
                            { key: 'vida', header: 'Vida' }, { key: 'profundidad_min', header: 'Prof. mín (mm)' },
                            { key: 'presion_psi', header: 'Presión (psi)' }, { key: 'km_odometro', header: 'Odómetro' },
                            { key: 'estado_visual', header: 'Estado visual' }, { key: 'tecnico', header: 'Técnico' },
                            { key: 'observaciones', header: 'Observaciones' },
                          ],
                          filas: filas.map(r => ({ ...r, fecha: fmtFecha(r.fecha) })),
                        })}>Excel</Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Tabla del historial */}
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                        {['Fecha', 'Llanta', 'Ubicación', 'Vida', 'Izq / Centro / Der', 'Prof. mín.', 'Presión', 'Odómetro', 'Estado', 'Técnico', 'Observaciones'].map((h, i) => (
                          <TableCell key={`${h}-${i}`} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filas.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(r.fecha)}</TableCell>
                          <TableCell>
                            <Typography fontSize={12.5} fontWeight={700}>{r.codigo}</Typography>
                            <Typography fontSize={10.5} color="text.secondary">{r.marca ?? '—'}{r.referencia ? ` · ${r.referencia}` : ''}</Typography>
                          </TableCell>
                          <TableCell>
                            {r.vehiculo
                              ? <><Typography fontSize={12.5}>{r.vehiculo}</Typography>
                                  <Typography fontSize={10.5} color="text.secondary">{r.posicion ?? '—'}</Typography></>
                              : <Chip size="small" label={r.estado_llanta ?? '—'} sx={{ fontSize: 10, height: 20 }} />}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={r.vida ?? '—'}
                              sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: r.vida === 'VN' ? alpha(EAM_COLOR, 0.15) : '#FEF3C7', color: r.vida === 'VN' ? EAM_DARK : '#92400E' }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {[r.profundidad_izq, r.profundidad_centro, r.profundidad_der].map(v => v ?? '–').join(' / ')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: colorProf(r.profundidad_min) }}>
                            {r.profundidad_min != null ? `${r.profundidad_min} mm` : '—'}
                          </TableCell>
                          <TableCell>{r.presion_psi != null ? `${r.presion_psi} psi` : '—'}</TableCell>
                          <TableCell>{r.km_odometro != null ? r.km_odometro.toLocaleString('es-CO') : '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{r.estado_visual ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{r.tecnico ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, maxWidth: 220 }}>{r.observaciones ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                      {filas.length === 0 && (
                        <TableRow><TableCell colSpan={11} align="center">
                          <Typography color="text.secondary" py={3} fontSize={13}>
                            {historialInsp.length === 0
                              ? 'Aún no hay inspecciones registradas en el periodo seleccionado.'
                              : 'Ninguna inspección coincide con los filtros aplicados.'}
                          </Typography>
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Card>
            </Stack>
          )
        })()}

        {/* ── TAB 2: Bodega ── */}
        {tab === 2 && (
          <Stack spacing={2}>
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
                            <IconButton size="small" sx={{ color: EAM_COLOR }} onClick={() => { setMontarForm({ activo_id: '', posicion: '', fecha: nowLocal(), km_odometro: '', horometro: '', tecnico: '', observaciones: '' }); setMontarDialog(n) }}>
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

        {/* ── TAB 7: Descarte ── */}
        {tab === 7 && (
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

        {/* ── TAB 8: Configuración (bodegas + catálogo de daños) ── */}
        {/* ── Movimientos: la historia completa de cada llanta ── */}
        {tab === 8 && (
          <Card sx={{ bgcolor: '#FFFFFF' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                <Timeline sx={{ color: EAM_DARK, fontSize: 20 }} />
                <Typography fontWeight={700} fontSize={15}>Movimientos</Typography>
                <Typography fontSize={11.5} color="text.secondary" sx={{ flex: 1 }}>
                  Todo lo que le ha pasado a cada llanta, del alta al descarte.
                </Typography>
              </Stack>
              <Alert severity="info" sx={{ py: 0.25, mb: 1.5, fontSize: 12 }}>
                Se corrigen la fecha, las lecturas, el técnico y las observaciones. El tipo y
                las posiciones no: son los que definen dónde quedó la llanta, y cambiarlos acá
                dejaría su estado sin relación con su historia. Para moverla, use la pestaña
                del vehículo.
              </Alert>

              <Stack direction="row" gap={1} mb={1.5} flexWrap="wrap">
                <TextField size="small" placeholder="Buscar llanta, vehículo, técnico…"
                  value={bitBusq} onChange={e => setBitBusq(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 260, flex: 1 }} />
                <TextField select size="small" label="Tipo" value={bitTipo}
                  onChange={e => setBitTipo(e.target.value)} sx={{ minWidth: 165 }}>
                  <MenuItem value="">Todos</MenuItem>
                  {TIPOS_BITACORA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Llanta" value={bitLlanta}
                  onChange={e => setBitLlanta(e.target.value)} sx={{ minWidth: 155 }}>
                  <MenuItem value="">Todas</MenuItem>
                  {neumaticos.map(n => (
                    <MenuItem key={n.id} value={String(n.id)}>{n.codigo}</MenuItem>
                  ))}
                </TextField>
                <Typography fontSize={11} color="text.secondary" sx={{ alignSelf: 'center' }}>
                  {bitacoraFiltrada.length} de {bitacora.length}
                </Typography>
              </Stack>

              {bitacora.length === 0 ? (
                <Alert severity="info">Todavía no hay movimientos registrados.</Alert>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' } }}>
                        <TableCell>Fecha</TableCell><TableCell>Llanta</TableCell>
                        <TableCell>Movimiento</TableCell><TableCell>De → a</TableCell>
                        <TableCell>Vehículo</TableCell><TableCell align="right">Odómetro</TableCell>
                        <TableCell>Técnico</TableCell><TableCell>Observaciones</TableCell>
                        <TableCell sx={{ width: 84 }}>Acc.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bitacoraFiltrada.map(m => (
                        <TableRow key={`${m.tipo_movimiento}-${m.id ?? `alta-${m.neumatico_id}`}`} hover
                          sx={{ '& td': { fontSize: 12 }, opacity: m.editable ? 1 : 0.7 }}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {m.fecha ? m.fecha.slice(0, 16).replace('T', ' ') : '—'}
                          </TableCell>
                          <TableCell><b>{m.neumatico_codigo}</b></TableCell>
                          <TableCell>
                            <Chip label={m.tipo_movimiento} size="small" sx={{
                              fontSize: 9, height: 18, fontWeight: 700,
                              bgcolor: `${COLOR_MOVIMIENTO[m.tipo_movimiento] ?? '#64748B'}22`,
                              color: COLOR_MOVIMIENTO[m.tipo_movimiento] ?? '#64748B',
                            }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            {(m.posicion_origen ?? '—')} → {(m.posicion ?? m.bodega_nombre ?? '—')}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{m.activo_codigo ?? '—'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11 }}>
                            {m.km_odometro != null ? m.km_odometro.toLocaleString('es-CO') : '—'}
                            {m.horometro != null && ` · ${m.horometro.toLocaleString('es-CO')} h`}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{m.tecnico ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 11, maxWidth: 220 }}>
                            <Tooltip title={m.observaciones ?? ''}>
                              <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.observaciones ?? '—'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {m.editable ? (
                              <>
                                <Tooltip title="Corregir">
                                  <IconButton size="small" onClick={() => {
                                    setBitForm({
                                      fecha: m.fecha ? m.fecha.slice(0, 16) : nowLocal(),
                                      km_odometro: m.km_odometro != null ? String(m.km_odometro) : '',
                                      horometro: m.horometro != null ? String(m.horometro) : '',
                                      tecnico: m.tecnico ?? '',
                                      observaciones: m.observaciones ?? '',
                                    })
                                    setBitDialog(m)
                                  }}>
                                    <EditIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <IconButton size="small" onClick={() => {
                                    if (window.confirm(
                                      `¿Eliminar este ${m.tipo_movimiento} de ${m.neumatico_codigo}?\n\n`
                                      + 'Si es el último de la llanta, volverá a donde estaba antes.',
                                    )) mutBorrarMov.mutate(m.id!)
                                  }}>
                                    <DeleteForever sx={{ fontSize: 15, color: '#DC2626' }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Typography fontSize={10} color="text.disabled">del alta</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {tab === 9 && (
          <Grid container spacing={2}>
            {/* Catálogo de llantas: marca -> referencia -> dimensión -> profundidad */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <TireRepair sx={{ color: EAM_DARK }} />
                    <Typography fontWeight={700}>Catálogo de llantas</Typography>
                  </Stack>
                  <CatalogoLlantas ambito="LLANTA" color={EAM_COLOR} colorDark={EAM_DARK} />
                </CardContent>
              </Card>
            </Grid>

            {/* Mismo catálogo para las bandas de reencauche */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                    <Autorenew sx={{ color: EAM_DARK }} />
                    <Typography fontWeight={700}>Catálogo de bandas de reencauche</Typography>
                  </Stack>
                  <CatalogoLlantas ambito="BANDA" color={EAM_COLOR} colorDark={EAM_DARK} />
                </CardContent>
              </Card>
            </Grid>

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

            {/* ── Ejes y llantas por vehículo ──
                Las categorías (esquemas) se crean en EAM → Configuración → Catálogos;
                aquí se le asigna una a cada vehículo de la flota. */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FFFFFF' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} mb={1.5} flexWrap="wrap">
                    <Stack direction="row" alignItems="center" gap={1}>
                      <DirectionsCar sx={{ color: EAM_DARK }} />
                      <Box>
                        <Typography fontWeight={700}>Ejes y llantas por vehículo</Typography>
                        <Typography fontSize={11.5} color="text.secondary">
                          Asigna a cada vehículo una categoría ya creada · las categorías se configuran en <b>EAM → Configuración → Catálogos</b>
                        </Typography>
                      </Box>
                    </Stack>
                    <TextField
                      size="small" placeholder="Buscar por placa, código o nombre…"
                      value={ejesBusca} onChange={e => setEjesBusca(e.target.value)}
                      sx={{ minWidth: 280 }}
                    />
                  </Stack>

                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(EAM_COLOR, 0.08) }}>
                          {['Placa / Código', 'Vehículo', 'Origen', 'Ejes', 'Llantas', 'Estado', ''].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vehiculosDisponibles
                          .filter(v => {
                            const q = ejesBusca.trim().toLowerCase()
                            if (!q) return true
                            return [v.placa, v.codigo, v.nombre, v.marca, v.modelo].some(x => (x ?? '').toLowerCase().includes(q))
                          })
                          .map(v => {
                            const configurado = v.numero_ejes != null
                            return (
                              <TableRow key={`${v.origen}:${v.id}`} hover>
                                <TableCell sx={{ fontWeight: 700 }}>{v.placa ?? v.codigo ?? '—'}</TableCell>
                                <TableCell>{v.nombre ?? ([v.marca, v.modelo].filter(Boolean).join(' ') || '—')}</TableCell>
                                <TableCell>
                                  <Chip size="small" label={v.origen} sx={{ fontSize: 10, height: 20, bgcolor: v.origen === 'EAM' ? alpha(EAM_COLOR, 0.14) : '#E0E7FF', color: v.origen === 'EAM' ? EAM_DARK : '#3730A3' }} />
                                </TableCell>
                                <TableCell>{v.numero_ejes ?? '—'}</TableCell>
                                <TableCell>{totalLlantasDe(v)}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={configurado ? 'Configurado' : 'Sin configurar'}
                                    color={configurado ? 'success' : 'warning'}
                                    sx={{ fontSize: 10, height: 20 }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Button
                                    size="small" variant={configurado ? 'text' : 'contained'}
                                    startIcon={<SwapIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => abrirEjes(v)}
                                    sx={configurado
                                      ? { textTransform: 'none', fontSize: 12, color: EAM_DARK }
                                      : { textTransform: 'none', fontSize: 12, bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}
                                  >
                                    {configurado ? 'Cambiar' : 'Configurar'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        {vehiculosDisponibles.length === 0 && (
                          <TableRow><TableCell colSpan={7} align="center">
                            <Typography color="text.secondary" py={2} fontSize={13}>
                              No hay vehículos que usen llantas. Regístralos en <b>Activos</b> con un tipo que use llantas.
                            </Typography>
                          </TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
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
            <MenuItem key="desm" onClick={() => { setMovForm({ fecha: nowLocal(), km_odometro: '', horometro: '', bodega_id: '', tecnico: '', observaciones: '' }); setMovDialog({ tire: slotMenu.tire, tipo: 'DESMONTAJE' }); setSlotMenu(null) }}>
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
                <>
                  <Stack direction="row" spacing={1}>
                    <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={movForm.km_odometro} onChange={e => setMovForm(f => ({ ...f, km_odometro: e.target.value }))} />
                    <TextField label="Horómetro (h)" type="number" size="small" fullWidth value={movForm.horometro} onChange={e => setMovForm(f => ({ ...f, horometro: e.target.value }))} />
                  </Stack>
                  {sinLecturaValida(movForm.km_odometro, movForm.horometro) && (
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      Registre el odómetro o el horómetro: es el punto de partida para calcular
                      el recorrido de la llanta.
                    </Alert>
                  )}
                </>
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
            <Button variant="contained" onClick={confirmarMov} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}
              disabled={!movForm.fecha || mutMov.isPending || (
                (movDialog?.tipo === 'INSTALACION' || movDialog?.tipo === 'ROTACION')
                && sinLecturaValida(movForm.km_odometro, movForm.horometro)
              )}>Confirmar</Button>
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
              <TextField label="Fecha y hora del montaje *" type="datetime-local" size="small" fullWidth value={montarForm.fecha} onChange={e => setMontarForm(f => ({ ...f, fecha: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <Stack direction="row" spacing={1}>
                <TextField label="Odómetro (km)" type="number" size="small" fullWidth value={montarForm.km_odometro} onChange={e => setMontarForm(f => ({ ...f, km_odometro: e.target.value }))} />
                <TextField label="Horómetro (h)" type="number" size="small" fullWidth value={montarForm.horometro} onChange={e => setMontarForm(f => ({ ...f, horometro: e.target.value }))} />
              </Stack>
              {sinLecturaValida(montarForm.km_odometro, montarForm.horometro) && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Registre el odómetro o el horómetro: es el punto de partida para calcular
                  el recorrido de la llanta.
                </Alert>
              )}
              <TextField label="Técnico" size="small" fullWidth value={montarForm.tecnico} onChange={e => setMontarForm(f => ({ ...f, tecnico: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={montarForm.observaciones} onChange={e => setMontarForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setMontarDialog(null)}>Cancelar</Button>
            <Button variant="contained"
              disabled={!montarForm.activo_id || !montarForm.posicion || !montarForm.fecha
                || sinLecturaValida(montarForm.km_odometro, montarForm.horometro) || mutMov.isPending}
              onClick={confirmarMontar} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Montar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: agregar llanta desde bodega al vehículo seleccionado ── */}
        <AgregarLlantaDialog
          open={agregarLlantaOpen}
          onClose={() => { setAgregarLlantaOpen(false); setPosicionAMontar('') }}
          veh={veh}
          layout={layout}
          almacen={almacen}
          tireEnVeh={tireEn}
          isPending={mutMov.isPending}
          posicionInicial={posicionAMontar || undefined}
          bodegas={bodegas}
          onSubmit={payload => {
            if (!veh) return
            mutMov.mutate({ ...payload, tipo_movimiento: 'INSTALACION', activo_id: veh.id })
            setAgregarLlantaOpen(false); setPosicionAMontar('')
          }}
        />

        {/* ── Diálogo: corregir un movimiento de la bitácora ── */}
        <Dialog open={!!bitDialog} onClose={() => setBitDialog(null)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Corregir movimiento
            <Typography variant="caption" color="text.secondary" display="block">
              {bitDialog?.neumatico_codigo} · {bitDialog?.tipo_movimiento}
              {bitDialog?.posicion_origen || bitDialog?.posicion
                ? ` · ${bitDialog?.posicion_origen ?? '—'} → ${bitDialog?.posicion ?? '—'}`
                : ''}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <Alert severity="info" sx={{ py: 0.25, fontSize: 11.5 }}>
                Al guardar se recalcula el recorrido de la llanta con las lecturas que queden.
              </Alert>
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth
                value={bitForm.fecha}
                onChange={e => setBitForm(f => ({ ...f, fecha: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
              <Stack direction="row" spacing={1}>
                <TextField label="Odómetro (km)" type="number" size="small" fullWidth
                  value={bitForm.km_odometro}
                  onChange={e => setBitForm(f => ({ ...f, km_odometro: e.target.value }))} />
                <TextField label="Horómetro (h)" type="number" size="small" fullWidth
                  value={bitForm.horometro}
                  onChange={e => setBitForm(f => ({ ...f, horometro: e.target.value }))} />
              </Stack>
              <TextField label="Técnico" size="small" fullWidth value={bitForm.tecnico}
                onChange={e => setBitForm(f => ({ ...f, tecnico: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2}
                value={bitForm.observaciones}
                onChange={e => setBitForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBitDialog(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!bitForm.fecha || mutCorregirMov.isPending}
              onClick={() => mutCorregirMov.mutate()}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
              {mutCorregirMov.isPending ? 'Guardando…' : 'Guardar corrección'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: confirmar la rotación armada en el almacén ── */}
        <Dialog open={rotPlanDialog} onClose={() => setRotPlanDialog(false)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Confirmar rotación
            <Typography variant="caption" color="text.secondary" display="block">
              {veh?.codigo}{veh?.placa ? ` · ${veh.placa}` : ''}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              <Box>
                <Typography fontSize={12} fontWeight={700} mb={0.25}>
                  Lo que se va a aplicar
                </Typography>
                {/* La llanta está en la mano justo ahora: es el momento de
                    medirla. Lo que se anote queda como inspección del día y
                    actualiza su profundidad y presión. */}
                <Typography fontSize={11} color="text.secondary" mb={1}>
                  Anote la medición de cada llanta — queda como su inspección de hoy. Si la
                  deja en blanco, solo se registra el movimiento.
                </Typography>
                <Stack spacing={1.25}>
                  {[
                    ...Object.entries(planRotacion).map(([id, pos]) => ({ id: Number(id), destino: pos })),
                    ...enRotacion.map(id => ({ id, destino: null as string | null })),
                  ].map(({ id, destino }) => {
                    const n = neumaticos.find(x => x.id === id)
                    const m = medicionDe(id)
                    return (
                      <Box key={id} sx={{
                        p: 1, borderRadius: 2, border: '1px solid #E5E7EB',
                        borderLeft: `3px solid ${destino ? '#7C3AED' : '#64748B'}`,
                      }}>
                        <Stack direction="row" gap={1} alignItems="center" mb={0.75}>
                          {destino
                            ? <TireRepair sx={{ fontSize: 14, color: '#7C3AED' }} />
                            : <WarehouseIcon sx={{ fontSize: 14, color: '#64748B' }} />}
                          <Typography fontSize={12}>
                            <b>{n?.codigo}</b> · {n?.posicion ?? 'bodega'} →{' '}
                            <b>{destino ?? 'sale a bodega'}</b>
                          </Typography>
                          {n?.profundidad_actual != null && (
                            <Typography fontSize={10.5} color="text.disabled">
                              hoy {n.profundidad_actual} mm
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" gap={0.75} flexWrap="wrap">
                          <TextField label="Ext. (mm)" type="number" size="small"
                            value={m.izq} onChange={e => setMedicion(id, 'izq', e.target.value)}
                            sx={{ width: 96 }} />
                          <TextField label="Centro" type="number" size="small"
                            value={m.centro} onChange={e => setMedicion(id, 'centro', e.target.value)}
                            sx={{ width: 92 }} />
                          <TextField label="Int. (mm)" type="number" size="small"
                            value={m.der} onChange={e => setMedicion(id, 'der', e.target.value)}
                            sx={{ width: 96 }} />
                          <TextField label="Presión" type="number" size="small"
                            value={m.psi} onChange={e => setMedicion(id, 'psi', e.target.value)}
                            sx={{ width: 92 }} />
                          <TextField select label="Estado" size="small" value={m.estado}
                            onChange={e => setMedicion(id, 'estado', e.target.value)}
                            sx={{ width: 118 }}>
                            <MenuItem value="">—</MenuItem>
                            <MenuItem value="BUENO">Bueno</MenuItem>
                            <MenuItem value="REGULAR">Regular</MenuItem>
                            <MenuItem value="CRITICO">Crítico</MenuItem>
                          </TextField>
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
              <TextField label="Fecha y hora *" type="datetime-local" size="small" fullWidth
                value={rotPlanForm.fecha}
                onChange={e => setRotPlanForm(f => ({ ...f, fecha: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
              <Stack direction="row" spacing={1}>
                <TextField label="Odómetro (km)" type="number" size="small" fullWidth
                  value={rotPlanForm.km_odometro}
                  onChange={e => setRotPlanForm(f => ({ ...f, km_odometro: e.target.value }))} />
                <TextField label="Horómetro (h)" type="number" size="small" fullWidth
                  value={rotPlanForm.horometro}
                  onChange={e => setRotPlanForm(f => ({ ...f, horometro: e.target.value }))} />
              </Stack>
              {sinLecturaValida(rotPlanForm.km_odometro, rotPlanForm.horometro) && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Registre el odómetro o el horómetro: es la lectura con la que queda el tramo
                  de cada llanta.
                </Alert>
              )}
              <TextField label="Técnico" size="small" fullWidth value={rotPlanForm.tecnico}
                onChange={e => setRotPlanForm(f => ({ ...f, tecnico: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2}
                value={rotPlanForm.observaciones}
                onChange={e => setRotPlanForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRotPlanDialog(false)}>Volver</Button>
            <Button variant="contained"
              disabled={!rotPlanForm.fecha || sinLecturaValida(rotPlanForm.km_odometro, rotPlanForm.horometro)
                || mutRotacionPlan.isPending}
              onClick={() => mutRotacionPlan.mutate()}
              sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}>
              {mutRotacionPlan.isPending ? 'Aplicando…' : 'Aplicar rotación'}
            </Button>
          </DialogActions>
        </Dialog>

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
              <SelectorCatalogoLlanta valor={nuevoCat} onChange={setNuevoCat} color={EAM_COLOR} />

              <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={0.5}>VIDA DE LA LLANTA</Typography></Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Vida *" size="small" fullWidth
                  value={nuevoVida.reencauches === '0' ? 'VN' : 'R'}
                  onChange={e => setNuevoVida(v => ({ ...v, reencauches: e.target.value === 'VN' ? '0' : '1' }))}>
                  <MenuItem value="VN">VN · Vida nueva</MenuItem>
                  <MenuItem value="R">R · Reencauche</MenuItem>
                </TextField>
              </Grid>
              {nuevoVida.reencauches !== '0' && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select label="N.º de reencauche *" size="small" fullWidth
                    value={nuevoVida.reencauches}
                    onChange={e => setNuevoVida(v => ({ ...v, reencauches: e.target.value }))}>
                    {[1, 2, 3, 4, 5, 6].map(n => <MenuItem key={n} value={String(n)}>R{n}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={nuevoVida.es_usada} onChange={e => setNuevoVida(v => ({ ...v, es_usada: e.target.checked }))} />}
                  label={<Typography fontSize={13}>Llanta usada</Typography>}
                />
              </Grid>
              {nuevoVida.es_usada && (
                <>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="Prof. actual (mm) *" type="number" size="small" fullWidth
                      value={nuevoVida.profundidad_actual}
                      onChange={e => setNuevoVida(v => ({ ...v, profundidad_actual: e.target.value }))}
                      helperText={nuevoCat.profundidad_inicial != null ? `Máximo ${nuevoCat.profundidad_inicial} mm` : undefined} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="Kilometraje actual *" type="number" size="small" fullWidth
                      value={nuevoVida.km_actual}
                      onChange={e => setNuevoVida(v => ({ ...v, km_actual: e.target.value }))} />
                  </Grid>
                </>
              )}

              <Grid size={{ xs: 12 }}><Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={0.5}>DATOS ADICIONALES</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Bodega" size="small" fullWidth value={nuevoForm.bodega_id} onChange={e => setNuevoForm(f => ({ ...f, bodega_id: e.target.value }))}><MenuItem value="">Sin bodega</MenuItem>{bodegas.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>)}</TextField></Grid>

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
            <Button
              variant="contained"
              disabled={
                !nuevoForm.codigo || !nuevoCat.dimension_id || mutNuevo.isPending ||
                (nuevoVida.es_usada && (!nuevoVida.profundidad_actual || !nuevoVida.km_actual))
              }
              onClick={() => mutNuevo.mutate({
                codigo: nuevoForm.codigo, marca: nuevoCat.marca, referencia: nuevoCat.referencia,
                medida: nuevoCat.medida, estado: 'ALMACENADO',
                reencauches: Number(nuevoVida.reencauches) || 0,
                es_usada: nuevoVida.es_usada,
                profundidad_actual: nuevoVida.es_usada && nuevoVida.profundidad_actual ? Number(nuevoVida.profundidad_actual) : undefined,
                km_actual: nuevoVida.es_usada && nuevoVida.km_actual ? Number(nuevoVida.km_actual) : undefined,
                bodega_id: nuevoForm.bodega_id ? Number(nuevoForm.bodega_id) : undefined,
                costo: nuevoForm.costo ? Number(nuevoForm.costo) : undefined, proveedor: nuevoForm.proveedor || undefined,
                presion_recomendada: nuevoForm.presion_recomendada ? Number(nuevoForm.presion_recomendada) : undefined,
                zona_id: nuevoForm.zona_id ? Number(nuevoForm.zona_id) : undefined,
                dot: nuevoForm.dot || undefined, tipo_rin: nuevoForm.tipo_rin || undefined,
              })}
              sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Registrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo nuevo lote de reencauche ── */}
        <Dialog open={loteOpen} onClose={() => setLoteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo lote de reencauche</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              {/* El lote se identifica por su número de remisión: es el documento
                  real con el que las llantas salen al reencauchador y vuelven, y
                  el que se cruza contra la factura. Un código aparte era un dato
                  inventado que nadie tenía a mano. */}
              <TextField label="N.º de remisión *" size="small" fullWidth
                value={loteForm.remision}
                onChange={e => setLoteForm(f => ({ ...f, remision: e.target.value }))}
                helperText="Identifica el lote. El de la remisión física que acompaña las llantas." />
              <TextField label="Fecha de envío *" type="date" size="small" fullWidth value={loteForm.fecha_envio} onChange={e => setLoteForm(f => ({ ...f, fecha_envio: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Proveedor" size="small" fullWidth value={loteForm.proveedor} onChange={e => setLoteForm(f => ({ ...f, proveedor: e.target.value }))} />
              <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={loteForm.observaciones} onChange={e => setLoteForm(f => ({ ...f, observaciones: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setLoteOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={!loteForm.remision.trim() || !loteForm.fecha_envio || mutLote.isPending}
              onClick={() => mutLote.mutate({ codigo: loteForm.remision.trim(), fecha_envio: loteForm.fecha_envio, proveedor: loteForm.proveedor || undefined, remision: loteForm.remision.trim(), observaciones: loteForm.observaciones || undefined })}
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
        <Dialog open={!!ejesVeh} onClose={() => setEjesVeh(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Ejes y llantas
            <Typography variant="caption" color="text.secondary" display="block">
              {ejesVeh?.placa ?? ejesVeh?.codigo ?? ''}{ejesVeh?.nombre ? ` — ${ejesVeh.nombre}` : ''}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={0.5}>
              {!ejesVeh?.activo_id && <Alert severity="info" sx={{ py: 0.5 }}>Vinculando el vehículo al CMMS…</Alert>}
              <TextField select label="Categoría de ejes/llantas *" size="small" fullWidth value={ejesForm.esquema_id} onChange={e => setEjesForm({ esquema_id: e.target.value })} disabled={!ejesVeh?.activo_id}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {/* El Tooltip va DENTRO del MenuItem: MUI Select necesita que sus
                    hijos directos sean MenuItem para leer el `value`. */}
                {esquemas.map(es => (
                  <MenuItem key={es.id} value={String(es.id)}>
                    <Tooltip
                      placement="right" arrow
                      title={<EsquemaLlantasPreview
                        layout={es.layout} numeroEjes={es.numero_ejes}
                        tieneRepuesto={es.tiene_repuesto} cantidadRepuestos={es.cantidad_repuestos}
                        nombre={es.nombre}
                      />}
                      componentsProps={{ tooltip: { sx: { bgcolor: '#0F172A', maxWidth: 'none' } }, arrow: { sx: { color: '#0F172A' } } }}
                    >
                      <Box sx={{ width: '100%' }}>
                        {es.nombre} · {es.numero_ejes} eje(s){es.tiene_repuesto ? ' + repuesto' : ''}
                      </Box>
                    </Tooltip>
                  </MenuItem>
                ))}
              </TextField>
              {esquemas.length === 0 ? (
                <Alert severity="warning" sx={{ py: 0.5 }}>Aún no hay categorías creadas. Pre-configúralas en <b>EAM → Configuración → Catálogos → Esquemas de vehículo</b> y luego solo se asignan aquí.</Alert>
              ) : (
                <Alert severity="info" sx={{ py: 0 }}>Pasa el cursor sobre cada categoría para ver el diagrama de ejes y llantas que aplicaría.</Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEjesVeh(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!ejesForm.esquema_id || !ejesVeh?.activo_id || mutEjes.isPending} onClick={() => mutEjes.mutate(Number(ejesForm.esquema_id))} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>Guardar</Button>
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

        {/* ── Menú del botón "Registrar llanta" ── */}
        <Menu
          anchorEl={menuNuevaLlanta}
          open={!!menuNuevaLlanta}
          onClose={() => setMenuNuevaLlanta(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { mt: 0.5, minWidth: 260, borderRadius: '10px' } }}
        >
          <MenuItem onClick={() => { setMenuNuevaLlanta(null); abrirMasivo() }} sx={{ py: 1.25, px: 2 }}>
            <AddBox sx={{ fontSize: 18, mr: 1.5, color: EAM_DARK }} />
            <Box>
              <Typography fontSize={13.5} fontWeight={600} lineHeight={1.2}>Creación masiva</Typography>
              <Typography fontSize={11} color="#94A3B8">Por rango de códigos, sin archivo</Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={() => { setMenuNuevaLlanta(null); setImportOpen(true) }} sx={{ py: 1.25, px: 2 }}>
            <UploadFile sx={{ fontSize: 18, mr: 1.5, color: EAM_COLOR }} />
            <Box>
              <Typography fontSize={13.5} fontWeight={600} lineHeight={1.2}>Importar desde Excel</Typography>
              <Typography fontSize={11} color="#94A3B8">Cargue masivo desde .xlsx</Typography>
            </Box>
          </MenuItem>
        </Menu>

        {/* ── Diálogo: creación masiva por rango de códigos ── */}
        <Dialog open={masivoOpen} onClose={() => { if (!mutImportar.isPending) setMasivoOpen(false) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Creación masiva de llantas
            <Typography variant="caption" color="text.secondary" display="block">
              Define el rango de códigos y los datos que comparten todas
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em">RANGO DE CÓDIGOS</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Código inicial *" size="small" fullWidth placeholder="Ej: LL-001"
                  value={masivoCodIni}
                  onChange={e => { setMasivoCodIni(e.target.value.toUpperCase()); setMasivoPreview([]); setMasivoError('') }}
                  helperText="Debe terminar en número"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Código final *" size="small" fullWidth placeholder="Ej: LL-050"
                  value={masivoCodFin}
                  onChange={e => { setMasivoCodFin(e.target.value.toUpperCase()); setMasivoPreview([]); setMasivoError('') }}
                  helperText="Máximo 1000 llantas por lote"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography fontSize={11} fontWeight={700} color="#94A3B8" letterSpacing="0.06em" mt={1}>DATOS COMUNES A TODAS</Typography>
              </Grid>
              <SelectorCatalogoLlanta valor={masivoCat} onChange={setMasivoCat} color={EAM_COLOR} />

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Vida *" size="small" fullWidth
                  value={masivoVida.reencauches === '0' ? 'VN' : 'R'}
                  onChange={e => setMasivoVida(v => ({ ...v, reencauches: e.target.value === 'VN' ? '0' : '1' }))}>
                  <MenuItem value="VN">VN · Vida nueva</MenuItem>
                  <MenuItem value="R">R · Reencauche</MenuItem>
                </TextField>
              </Grid>
              {masivoVida.reencauches !== '0' && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select label="N.º de reencauche *" size="small" fullWidth
                    value={masivoVida.reencauches}
                    onChange={e => setMasivoVida(v => ({ ...v, reencauches: e.target.value }))}>
                    {[1, 2, 3, 4, 5, 6].map(n => <MenuItem key={n} value={String(n)}>R{n}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={masivoVida.es_usada} onChange={e => setMasivoVida(v => ({ ...v, es_usada: e.target.checked }))} />}
                  label={<Typography fontSize={13}>Llantas usadas</Typography>}
                />
              </Grid>
              {masivoVida.es_usada && (
                <>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="Prof. actual (mm) *" type="number" size="small" fullWidth
                      value={masivoVida.profundidad_actual}
                      onChange={e => setMasivoVida(v => ({ ...v, profundidad_actual: e.target.value }))}
                      helperText={masivoCat.profundidad_inicial != null ? `Máximo ${masivoCat.profundidad_inicial} mm` : undefined} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField label="Kilometraje actual *" type="number" size="small" fullWidth
                      value={masivoVida.km_actual}
                      onChange={e => setMasivoVida(v => ({ ...v, km_actual: e.target.value }))} />
                  </Grid>
                </>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Bodega de ingreso" size="small" fullWidth value={masivoForm.bodega_id} onChange={e => setMasivoForm(f => ({ ...f, bodega_id: e.target.value }))}>
                  <MenuItem value="">Sin bodega</MenuItem>
                  {bodegas.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Costo unitario" type="number" size="small" fullWidth value={masivoForm.costo} onChange={e => setMasivoForm(f => ({ ...f, costo: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Proveedor" size="small" fullWidth value={masivoForm.proveedor} onChange={e => setMasivoForm(f => ({ ...f, proveedor: e.target.value }))} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Presión rec. (psi)" type="number" size="small" fullWidth value={masivoForm.presion_recomendada} onChange={e => setMasivoForm(f => ({ ...f, presion_recomendada: e.target.value }))} /></Grid>

              {masivoError && <Grid size={{ xs: 12 }}><Alert severity="error" sx={{ py: 0.5 }}>{masivoError}</Alert></Grid>}
              {masivoPreview.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    Se crearán <b>{masivoPreview.length}</b> llantas: {masivoPreview.slice(0, 3).join(', ')}
                    {masivoPreview.length > 3 ? ` … ${masivoPreview[masivoPreview.length - 1]}` : ''}
                  </Alert>
                </Grid>
              )}
              {importResult && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity={importResult.errores.length ? 'warning' : 'success'}>
                    {importResult.exitosos} de {importResult.total} llantas creadas
                  </Alert>
                  {importResult.errores.slice(0, 5).map((e: any, i: number) => (
                    <Typography key={i} variant="caption" color="error.main" display="block">{e.codigo || '—'}: {e.mensaje}</Typography>
                  ))}
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setMasivoOpen(false)}>Cerrar</Button>
            {masivoPreview.length === 0 ? (
              <Button variant="contained" disabled={!masivoCat.dimension_id} onClick={previsualizarMasivo} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
                Previsualizar
              </Button>
            ) : (
              <Button variant="contained" disabled={mutImportar.isPending} onClick={confirmarMasivo} sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
                {mutImportar.isPending ? 'Creando…' : `Crear ${masivoPreview.length} llantas`}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* ── Diálogo: importación masiva ── */}
        <Dialog open={importOpen} onClose={() => { setImportOpen(false); setImportRows([]); setImportResult(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Importación masiva de llantas</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ py: 0.5 }}>Descarga la plantilla, complétala en Excel y súbela. <b>marca</b>, <b>referencia</b> y <b>medida</b> deben existir en el catálogo (Configuración → Catálogo de llantas) y la referencia debe tener configurada esa dimensión; si no, la fila se reporta con el error correspondiente. La profundidad inicial la toma el catálogo. Usa <b>es_usada</b> = SI para cargar profundidad y kilometraje actuales.</Alert>
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
